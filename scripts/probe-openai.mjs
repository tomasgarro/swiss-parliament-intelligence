// Runs every model step of the live app against OpenAI through the production adapter and reports, per call:
// the JSON schema, HTTP status, latency, finish reason, reasoning tokens and any error the API returned.
//   node --env-file=.env scripts/probe-openai.mjs [--effort=low] [--model=gpt-6-luna]
// Covers: health probe, answer (query expansion, proposal lookup, per-passage research, claim review,
// synthesis), follow-up resolution, translation, statement comparison and message drafting.
import {createServer} from '../server/index.mjs';
import {OPENAI_BASE} from '../server/model-endpoint.mjs';

const arg=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=')[1]??fallback;
if(!process.env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY_REQUIRED');
const calls=[];
const traced=async(url,options)=>{
 const started=Date.now();let body={};try{body=JSON.parse(options?.body||'{}');}catch{}
 const schema=body.response_format?.json_schema?.name||(String(url).endsWith('/responses')?'web_research':'-');
 const r=await fetch(url,options);
 if(String(url).startsWith(OPENAI_BASE)){
  const j=await r.clone().json().catch(()=>({}));
  calls.push({schema,status:r.status,seconds:(Date.now()-started)/1000,effort:body.reasoning_effort,cap:body.max_completion_tokens,finish:j.choices?.[0]?.finish_reason,reasoning:j.usage?.completion_tokens_details?.reasoning_tokens,output:j.usage?.completion_tokens,error:j.error?.message?.slice(0,160)});
 }
 return r;
};
const env={...process.env,INFERENCE_PROVIDER:'openai',INFERENCE_BASE_URL:OPENAI_BASE,INFERENCE_MODEL:arg('model','gpt-6-luna'),INFERENCE_REASONING_EFFORT:arg('effort','low'),
 TRANSLATION_PROVIDER:'openai',NVIDIA_API_KEY:'',OPENAI_API_KEY:process.env.OPENAI_API_KEY,WEB_RESEARCH:'off',PREPARED_ANSWERS:'off',WARM_OVERVIEW:'off',TYPESAFE_MODE:'off'};
const {server}=createServer({env,fetchImpl:traced});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base=`http://127.0.0.1:${server.address().port}/api`;
const post=(path,payload)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(async r=>({status:r.status,json:await r.json().catch(()=>null)}));
const step=async(name,run)=>{const before=calls.length,started=Date.now();let summary;try{summary=await run();}catch(e){summary='ERROR '+e.message;}
 console.log(`\n## ${name} · ${((Date.now()-started)/1000).toFixed(1)}s · ${typeof summary==='string'?summary:JSON.stringify(summary)}`);
 for(const c of calls.slice(before))console.log('  ',JSON.stringify(c));};

let answer;
await step('health probe',async()=>{const r=await fetch(base+'/health/ai').then(r=>r.json());return {state:r.state,model:r.model,route:r.route};});
await step('answer: 10-million initiative',async()=>{const r=await post('/parliament/ask',{question:"What are the arguments for and against the initiative 'No to a Switzerland of 10 million'?",language:'en'});answer=r.json;
 return {http:r.status,status:answer?.status,mode:answer?.mode,claims:answer?.claims?.length,synthesis:answer?.synthesis?.status,citations:answer?.citations?.length,model:answer?.model,lead:answer?.answer?.lead?.text?.slice(0,300)};});
await step('follow-up with thread',async()=>{const thread=[{question:"What are the arguments for and against the initiative 'No to a Switzerland of 10 million'?",answer:answer?.answer?.lead?.text||'',proposal:answer?.researchSummary?.proposal||null,speakers:(answer?.citations||[]).map(c=>c.speaker).filter(Boolean).slice(0,4)}];
 const r=await post('/parliament/ask',{question:'Which alternatives to it were proposed?',language:'en',thread});return {http:r.status,status:r.json?.status,resolved:r.json?.resolvedQuestion,claims:r.json?.claims?.length,synthesis:r.json?.synthesis?.status};});
const passages=(answer?.passages||[]).map(p=>p.id);
await step('translation',async()=>{if(!passages[0])return 'skipped: no passage';const r=await post('/parliament/translate',{evidenceId:passages[0],language:'de'});return {http:r.status,status:r.json?.status,model:r.json?.model,text:r.json?.text?.slice(0,160)};});
await step('compare two passages',async()=>{if(passages.length<2)return 'skipped';const r=await post('/parliament/compare',{ids:passages.slice(0,2),language:'en'});return {http:r.status,status:r.json?.status,relation:r.json?.relation};});
await step('draft a message',async()=>{const personId=answer?.passages?.[0]?.personId;if(!personId)return 'skipped';const r=await post('/parliament/draft',{personId:String(personId),topic:'Ask about their position on housing affordability.',language:'en'});return {http:r.status,subject:r.json?.subject};});
server.close();
const bad=calls.filter(c=>c.status!==200||c.finish==='length'||c.error);
console.log(`\n${calls.length} model calls · ${bad.length} problems${bad.length?': '+[...new Set(bad.map(c=>c.schema+' '+(c.error||c.finish||c.status)))].join(' | '):''}`);
