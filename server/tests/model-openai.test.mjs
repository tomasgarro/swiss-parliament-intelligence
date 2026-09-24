import test from 'node:test';import assert from 'node:assert/strict';
import {createModelFetch,createOpenAIFetch,createSpendMeter,openAIBody,OPENAI_BASE} from '../model-endpoint.mjs';
import {translatePassage} from '../translation.mjs';

const env={INFERENCE_PROVIDER:'openai',INFERENCE_BASE_URL:OPENAI_BASE,INFERENCE_MODEL:'gpt-6-luna',OPENAI_API_KEY:'sk-test',NVIDIA_API_KEY:'nv'};
const request=(name,max=400)=>({model:'gpt-6-luna',temperature:0,max_tokens:max,response_format:{type:'json_schema',json_schema:{name,strict:true,schema:{}}},messages:[{role:'system',content:'/no_think\nReview.'},{role:'user',content:'x'}]});
const reply=(status,json={choices:[{message:{content:'{}'},finish_reason:'stop'}],usage:{prompt_tokens:1000,completion_tokens:100}})=>new Response(JSON.stringify(json),{status,headers:{'Content-Type':'application/json'}});

test('a Nemotron-shaped request becomes a reasoning-model request',()=>{
 const out=openAIBody(request('claim_support_review'),env);
 assert.equal(out.temperature,undefined);assert.equal(out.max_tokens,undefined);
 assert.equal(out.max_completion_tokens,400+2048);assert.equal(out.reasoning_effort,'low');
 assert.equal(out.messages[0].content,'Review.');assert.equal(out.response_format.json_schema.name,'claim_support_review');
 const light=openAIBody(request('search_terms',60),env);assert.equal(light.reasoning_effort,'none');assert.equal(light.max_completion_tokens,256);
 assert.equal(openAIBody(request('cited_answer'),{...env,INFERENCE_REASONING_EFFORT:'medium'}).reasoning_effort,'medium');
});

test('the OpenAI route uses the OpenAI key and never falls back to NVIDIA',async()=>{
 const urls=[];const f=createModelFetch(env,async(url,options)=>{urls.push([url,options.headers.Authorization]);return reply(503,{error:{message:'down'}});});
 const r=await f(OPENAI_BASE+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request('cited_answer'))});
 assert.equal(r.status,503);assert.equal(urls.length,2,'one retry');
 assert.ok(urls.every(([url,auth])=>url.startsWith(OPENAI_BASE)&&auth==='Bearer sk-test'));
 assert.deepEqual(f.route(),{provider:'openai',model:'gpt-6-luna'});
});

test('other URLs pass through untouched, including web research bodies',async()=>{
 const seen=[];const f=createOpenAIFetch(env,async(url,options)=>{seen.push({url,body:options?.body});return reply(200);});
 await f('https://www.parlament.ch/x',{});
 await f(OPENAI_BASE+'/responses',{method:'POST',body:JSON.stringify({model:'gpt-6-luna',max_output_tokens:900})});
 assert.equal(seen[0].url,'https://www.parlament.ch/x');assert.equal(JSON.parse(seen[1].body).max_output_tokens,900);
});

test('the daily spend meter stops model calls once the budget is used',async()=>{
 let day='2026-09-24';const meter=createSpendMeter({MODEL_DAILY_BUDGET_USD:'0.0001'},{today:()=>day});
 let sent=0;const f=createOpenAIFetch(env,async()=>{sent++;return reply(200);},{meter});
 await f(OPENAI_BASE+'/chat/completions',{method:'POST',body:JSON.stringify(request('cited_answer'))});
 await new Promise(done=>setTimeout(done,20));
 assert.ok(meter.state().usd>=0.0001,'1,000 in + 100 out tokens are metered');
 const blocked=await f(OPENAI_BASE+'/chat/completions',{method:'POST',body:JSON.stringify(request('cited_answer'))});
 assert.equal(blocked.status,503);assert.equal((await blocked.json()).error,'DAILY_CAPACITY_REACHED');assert.equal(sent,1);
 day='2026-09-25';assert.equal(meter.exhausted(),false,'a new day resets the meter');
});

test('translation through the answer model keeps the number gate',async()=>{
 const passage={id:'p1',text:'Le crédit de 12,5 millions est accepté.',language:'fr',officialUrl:'https://www.parlament.ch'};
 const tenv={...env,TRANSLATION_PROVIDER:'openai'};
 const fake=text=>async()=>reply(200,{choices:[{message:{content:JSON.stringify({text})}}]});
 const ok=await translatePassage(passage,'en',tenv,fake('The credit of 12,5 million is accepted.'));
 assert.equal(ok.status,'ok');assert.equal(ok.model,'gpt-6-luna');
 await assert.rejects(translatePassage({...passage,text:'Le crédit de 13 millions est accepté.'},'en',tenv,fake('The credit of 30 million is accepted.')),/NUMBER_MISMATCH/);
});
