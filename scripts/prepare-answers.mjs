// Researches the interface's one-click questions in advance, through the same live pipeline, and stores the verified
// results in data/parliament/prepared-answers.json (see server/prepared-answers.mjs). Run while the model is reachable:
//   node --env-file=.env scripts/prepare-answers.mjs --since=2026-06-01 --votes=60 --concurrency=3 [--provider=openai|gpu|catalog]
// Only answers that pass claim review and synthesis are kept; web research is excluded because news goes stale.
import {existsSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createServer} from '../server/index.mjs';
import {PREPARED_FILE,preparedKey} from '../server/prepared-answers.mjs';
import {modelRoute,OPENAI_BASE} from '../server/model-endpoint.mjs';

const root=resolve(import.meta.dirname,'..');
const arg=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=')[1]??fallback;
const since=arg('since','2026-06-01'),voteLimit=Number(arg('votes','60')),concurrency=Number(arg('concurrency','6')),refresh=process.argv.includes('--refresh');
const target=resolve(root,PREPARED_FILE);

// Home suggestions, read from the component so the stored question is byte-for-byte what the chip sends.
// Only the unscoped branch after "]]:[": the dossier chips ("What was the result of the vote?") need their dossier.
const chips=readFileSync(resolve(root,'frontend/src/pilot/Cleisthenes.jsx'),'utf8').split('suggestions=')[1].split(']]:[')[1].split(']];')[0]+']';
const home=[...chips.matchAll(/\[t\('[^']*','[^']*'\),t\(("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'),("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\)\]/g)]
 .map(m=>[JSON.parse(m[1].startsWith("'")?'"'+m[1].slice(1,-1).replace(/"/g,'\\"')+'"':m[1]),JSON.parse(m[2].startsWith("'")?'"'+m[2].slice(1,-1).replace(/"/g,'\\"')+'"':m[2])]);
// The interface writes chips with t(en,fr): German and Italian readers send the English text in their language.
const pair=(en,fr,scope={})=>[...['en','de','it'].map(language=>({question:en,language,...scope})),{question:fr,language:'fr',...scope}];
const jobs=home.flatMap(([en,fr])=>pair(en,fr));
const tenMillion=home.find(([en])=>/10 million/.test(en))?.[0];
if(tenMillion)jobs.push(...['en','fr','de','it'].map(language=>({question:tenMillion,language,businessId:'20250026',scopeTitle:'« Pas de Suisse à 10 millions ! (initiative pour la durabilité) »'})));

// "Ask Cleisthenes about this vote" on member profiles: the most recent final and overall votes, newest first.
const db=new DatabaseSync(resolve(root,'data/parliament.sqlite'),{readOnly:true});
const votes=db.prepare(`SELECT json_extract(payload,'$.businessId') AS businessId,
  coalesce(json_extract(payload,'$.title'),json_extract(payload,'$.billTitle'),json_extract(payload,'$.subject')) AS title,
  max(json_extract(payload,'$.date')) AS date FROM records WHERE kind='voting' AND json_extract(payload,'$.date')>=?
  GROUP BY businessId,title ORDER BY date DESC`).all(since);
const debated=new Set(db.prepare(`SELECT DISTINCT business AS id FROM speech_business_links`).all().map(r=>String(r.id)));
db.close();
let taken=0;
for(const v of votes){
 if(taken>=voteLimit)break;if(!v.businessId||!v.title||!debated.has(String(v.businessId)))continue;taken++;
 jobs.push(...pair(`What were the arguments in Parliament on “${v.title}”?`,`Quels arguments ont été avancés au Parlement sur « ${v.title} » ?`,{businessId:String(v.businessId),scopeTitle:v.title}));
}

const store=existsSync(target)?JSON.parse(readFileSync(target,'utf8')):{answers:[]};
const done=new Map(store.answers.map(a=>[preparedKey(a),a]));
const pending=jobs.filter(j=>refresh||!done.has(preparedKey(j))).slice(0,Number(arg('limit','100000')));
console.log(JSON.stringify({homeQuestions:home.length,voteProposals:taken,jobs:jobs.length,pending:pending.length,concurrency}));
if(process.argv.includes('--dry-run')){for(const j of pending)console.log(j.language,j.businessId||'-',j.question);process.exit(0);}

// Every stored answer must come from the model named in its label: OpenAI (--provider=openai, the live model),
// the GPU endpoint with no catalog fallback, or the NVIDIA catalog pinned to its first model (--provider=catalog).
const provider=arg('provider','openai'),catalog=provider==='catalog';
if(!['openai','gpu','catalog'].includes(provider))throw new Error('INVALID_PROVIDER');
// Web research stays off: news goes stale, and the live server adds it at answer time.
const env={...process.env,PREPARED_ANSWERS:'off',WEB_RESEARCH:'off',WARM_OVERVIEW:'off',TYPESAFE_MODE:'off',ACCESS_POLICY:'open',
 ...(provider==='openai'?{INFERENCE_PROVIDER:'openai',INFERENCE_BASE_URL:OPENAI_BASE,INFERENCE_MODEL:arg('model','gpt-6-luna'),NVIDIA_API_KEY:''}:catalog?{INFERENCE_PROVIDER:'nvidia-catalog',INFERENCE_FALLBACK_MODEL_2:'',OPENAI_API_KEY:''}:{NVIDIA_API_KEY:'',OPENAI_API_KEY:''})};
if(catalog&&!env.NVIDIA_API_KEY)throw new Error('NVIDIA_API_KEY_REQUIRED_FOR_CATALOG');
if(provider==='openai'&&!env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY_REQUIRED');
const model=catalog?modelRoute(env).catalogModel:env.INFERENCE_MODEL;
const {server}=createServer({env});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base=`http://127.0.0.1:${server.address().port}/api/parliament/ask`;
const save=()=>{store.answers=[...done.values()];store.generatedAt=new Date().toISOString();store.scope='Prepared by the live answer pipeline; machine-generated, claim-checked, not human-reviewed.';
 writeFileSync(target+'.tmp',JSON.stringify(store));renameSync(target+'.tmp',target);};
const stats={ok:0,skipped:0,failed:0};let next=0;
async function worker(){
 while(next<pending.length){
  const job=pending[next++];
  // The hosted catalog caps requests per minute; a rate-limited step degrades to sources-only, so wait and retry.
  for(let attempt=0;attempt<4;attempt++){
  if(attempt)await new Promise(ok=>setTimeout(ok,65000));
  const started=Date.now();
  try{
   const r=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(240000),body:JSON.stringify({question:job.question,language:job.language,thread:[],...(job.businessId?{businessId:job.businessId}:{}),...(job.scopeTitle?{scopeTitle:job.scopeTitle}:{})})});
   const answer=r.ok?await r.json():null;
   const stored=answer?.status==='ok'&&answer.mode==='live-inference'&&answer.answer&&answer.synthesis?.status==='ok';
   if(stored){
    const {web,webStatus,latencyMs,cacheHit,...kept}=answer;
    done.set(preparedKey(job),{question:job.question,language:job.language,businessId:job.businessId||'',personId:'',preparedAt:new Date().toISOString(),model,answer:{...kept,model}});
    stats.ok++;save();
   }
   console.log(JSON.stringify({i:next,attempt,status:answer?.status||r.status,mode:answer?.mode,synthesis:answer?.synthesis?.status,hasAnswer:Boolean(answer?.answer),claims:answer?.claims?.length,seconds:Math.round((Date.now()-started)/1000),language:job.language,businessId:job.businessId||null,question:job.question.slice(0,80)}));
   if(stored)break;
   // An honest "insufficient evidence" or refusal is final; only infrastructure degradations are retried.
   const degraded=!answer||['source-fallback','recorded-replay'].includes(answer.mode)||answer.synthesis?.status==='unavailable';
   if(!degraded){stats.skipped++;break;}
   if(attempt===3)stats.failed++;
  }catch(error){console.log(JSON.stringify({i:next,attempt,error:String(error.message||error).slice(0,120),question:job.question.slice(0,80)}));if(attempt===3)stats.failed++;}
  }
 }
}
await Promise.all(Array.from({length:concurrency},worker));
server.close();
console.log(JSON.stringify({...stats,total:done.size,file:PREPARED_FILE}));
