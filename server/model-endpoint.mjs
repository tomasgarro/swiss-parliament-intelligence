// Routes model calls. INFERENCE_PROVIDER=openai sends them to OpenAI (see createOpenAIFetch). Otherwise this
// keeps answers on NVIDIA models when the LaunchPad GPU endpoint goes away: model calls aimed at
// INFERENCE_BASE_URL are sent to NVIDIA's hosted API catalog (OpenAI-compatible) when the primary is
// unreachable, or always when INFERENCE_PROVIDER=nvidia-catalog. Nothing else is intercepted.
const CATALOG='https://integrate.api.nvidia.com/v1';
// Verified 23 Sep 2026: strict JSON-schema output in ~1 s. Nano-3 is listed but not served to this account;
// Lightning ignores /no_think and takes minutes.
export const DEFAULT_CATALOG_MODEL='nvidia/nemotron-3-super-120b-a12b';
// Second verified model, used when the first answers 429/5xx (the hosted catalog is sometimes "temporarily overloaded").
export const SECONDARY_CATALOG_MODEL='nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';

export function catalogConfigured(env){return Boolean(env.NVIDIA_API_KEY);}
// The catalog caps requests per minute per key and answers 429 beyond it. One answer fans out into many claim
// checks, so a burst would fail mid-answer: calls wait their turn (FIFO) until the last minute has room.
export function createRateLimiter(perMinute,{now=()=>Date.now(),sleep=ms=>new Promise(done=>setTimeout(done,ms))}={}){
 const sent=[];let chain=Promise.resolve();
 return signal=>{
  const turn=chain.then(async()=>{
   for(;;){
    if(signal?.aborted)throw signal.reason??new Error('ABORTED');
    const t=now();while(sent.length&&t-sent[0]>=60000)sent.shift();
    if(sent.length<perMinute){sent.push(t);return;}
    await sleep(Math.min(60000-(t-sent[0])+5,1000));
   }
  });
  chain=turn.catch(()=>{});return turn;
 };
}
export function modelRoute(env){return {primary:env.INFERENCE_BASE_URL||null,catalog:catalogConfigured(env)?(env.INFERENCE_FALLBACK_BASE_URL||CATALOG):null,catalogModel:env.INFERENCE_FALLBACK_MODEL||DEFAULT_CATALOG_MODEL,catalogModels:[...new Set([env.INFERENCE_FALLBACK_MODEL||DEFAULT_CATALOG_MODEL,...(env.INFERENCE_FALLBACK_MODEL_2??SECONDARY_CATALOG_MODEL).split(',').filter(Boolean)])],forced:env.INFERENCE_PROVIDER==='nvidia-catalog'};}

// OpenAI (gpt-6-luna) for every answer-path call, with INFERENCE_PROVIDER=openai. The call sites keep one
// request shape; this adapter translates it for a reasoning model (max_completion_tokens and reasoning_effort
// instead of max_tokens, temperature and the /no_think marker) and never falls back to another provider.
export const OPENAI_BASE='https://api.openai.com/v1';
// Short extraction steps need no deliberation; reasoning would only add latency and cost.
const LIGHT_SCHEMAS=new Set(['search_terms','proposal_reference','standalone_question']);
export function openAIBody(body,env){
 const out={...body},schema=out.response_format?.json_schema?.name;
 const effort=!schema||LIGHT_SCHEMAS.has(schema)?'none':(env.INFERENCE_REASONING_EFFORT||'low');
 const cap=out.max_tokens??out.max_completion_tokens;
 delete out.temperature;delete out.chat_template_kwargs;delete out.max_tokens;
 // Reasoning tokens count against the completion cap: leave room so small caps don't come back empty.
 if(cap)out.max_completion_tokens=Math.max(256,cap+(effort==='none'?0:2048));
 out.reasoning_effort=effort;
 out.messages=(out.messages||[]).map(m=>m.role==='system'&&typeof m.content==='string'?{...m,content:m.content.replace(/^\/no_think\s*/,'')}:m);
 return out;
}
// Daily spend backstop from the usage each response reports, priced per million tokens (USD).
export function createSpendMeter(env,{today=()=>new Date().toISOString().slice(0,10)}={}){
 const price={input:Number(env.INFERENCE_PRICE_INPUT_PER_M??0.10),output:Number(env.INFERENCE_PRICE_OUTPUT_PER_M??0.50),search:Number(env.WEB_SEARCH_PRICE??0.01)};
 const budget=Number(env.MODEL_DAILY_BUDGET_USD??5);let day='',usd=0,calls=0;
 const roll=()=>{const d=today();if(d!==day){day=d;usd=0;calls=0;}};
 return {
  add({input=0,output=0,searches=0}={}){roll();calls++;usd+=input/1e6*price.input+output/1e6*price.output+searches*price.search;},
  exhausted(){roll();return budget>0&&usd>=budget;},
  state(){roll();return {day,usd:Math.round(usd*10000)/10000,budget,calls};}
 };
}
export function createOpenAIFetch(env,fetchImpl=fetch,{meter=createSpendMeter(env),log=console.warn}={}){
 const base=(env.INFERENCE_BASE_URL||OPENAI_BASE).replace(/\/$/,''),key=env.INFERENCE_API_KEY||env.OPENAI_API_KEY;
 const record=response=>{
  // Usage is read from a copy so the caller still gets an unread body.
  const copy=response.clone?.();if(!copy?.json)return;
  copy.json().then(j=>{
   const u=j.usage||{};meter.add({input:u.prompt_tokens??u.input_tokens??0,output:u.completion_tokens??u.output_tokens??0,searches:(j.output||[]).filter(o=>o.type==='web_search_call').length});
   const choice=j.choices?.[0];
   if(choice?.finish_reason==='length')log(`model output truncated (${j.model||env.INFERENCE_MODEL})`);
   if(choice?.message?.refusal)log('model refusal: '+String(choice.message.refusal).slice(0,200));
  }).catch(()=>{});
 };
 const wrapped=async(url,options)=>{
  if(!String(url).startsWith(base))return fetchImpl(url,options);
  if(meter.exhausted())return new Response(JSON.stringify({error:'DAILY_CAPACITY_REACHED'}),{status:503,headers:{'Content-Type':'application/json'}});
  const chat=String(url).endsWith('/chat/completions');
  const body=chat&&options?.body?JSON.stringify(openAIBody(JSON.parse(options.body),env)):options?.body;
  const send=()=>fetchImpl(url,{...options,headers:{...(options?.headers||{}),Authorization:'Bearer '+key},body});
  let response=await send();
  if(response.status===429||response.status>=500){
   const wait=Math.min(Number(response.headers?.get?.('retry-after'))*1000||1500,5000);
   await new Promise(done=>setTimeout(done,wait));
   if(!options?.signal?.aborted)response=await send();
  }
  if(response.ok)record(response);
  return response;
 };
 wrapped.route=()=>({provider:'openai',model:env.INFERENCE_MODEL});
 wrapped.spend=()=>meter.state();
 wrapped.capacityReached=()=>meter.exhausted();
 return wrapped;
}

export function createModelFetch(env,fetchImpl=fetch){
 if(env.INFERENCE_PROVIDER==='openai')return createOpenAIFetch(env,fetchImpl);
 const route=modelRoute(env);
 if(!route.primary||!route.catalog)return Object.assign(fetchImpl,{route:()=>({provider:'launchpad'})});
 const primary=route.primary.replace(/\/$/,'');let primaryDownUntil=0,last='launchpad';
 const limit=createRateLimiter(Number(env.CATALOG_REQUESTS_PER_MINUTE)||35);
 const toCatalog=async(url,options)=>{
  const body=options?.body?JSON.parse(options.body):{};body.chat_template_kwargs={enable_thinking:false,...(body.chat_template_kwargs||{})};
  last='nvidia-catalog';let response;
  // Up to three attempts, alternating models, while the catalog answers 429/5xx and the caller has not given up.
  for(let attempt=0;attempt<3;attempt++){
   // A 429 means the per-minute window is full: wait for Retry-After (or a few seconds), not a fraction of one.
   if(attempt)await new Promise(done=>setTimeout(done,response?.status===429?Math.min(Number(response.headers?.get?.('retry-after'))*1000||3000*attempt,10000):400*attempt));
   if(options?.signal?.aborted)break;
   try{await limit(options?.signal);}catch(error){if(response)break;throw error;}
   body.model=route.catalogModels[attempt%route.catalogModels.length];
   response=await fetchImpl(route.catalog.replace(/\/$/,'')+String(url).slice(primary.length),{...options,headers:{...(options?.headers||{}),Authorization:'Bearer '+env.NVIDIA_API_KEY},body:JSON.stringify(body)});
   if(response.status!==429&&response.status<500)return response;
  }
  return response;
 };
 const wrapped=async(url,options)=>{
  if(!String(url).startsWith(primary))return fetchImpl(url,options);
  if(route.forced||Date.now()<primaryDownUntil)return toCatalog(url,options);
  try{const r=await fetchImpl(url,options);if(r.status>=500){primaryDownUntil=Date.now()+60000;return toCatalog(url,options);}last='launchpad';return r;}
  // Unreachable GPU host: switch to the catalog for a minute before trying the primary again.
  catch(error){if(error?.name==='AbortError'&&options?.signal?.aborted)throw error;primaryDownUntil=Date.now()+60000;return toCatalog(url,options);}
 };
 wrapped.route=()=>({provider:last,catalogModel:route.catalogModel,forced:route.forced});
 return wrapped;
}
