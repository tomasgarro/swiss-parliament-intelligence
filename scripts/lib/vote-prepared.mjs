// Prepared "Instant" questions for each vote object (spec S3): researched through the live answer pipeline, scoped to the
// object's Parliament business, kept only when the written answer passed its checks and the stance screen.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from '../../server/index.mjs';
import {OPENAI_BASE} from '../../server/model-endpoint.mjs';
import {scoreAnswer} from './stance-score.mjs';

export const QUESTIONS=[
 {key:'arguments',question:{en:'What were the main arguments for and against in Parliament?',fr:'Quels ont été les principaux arguments pour et contre au Parlement ?',de:'Was waren im Parlament die wichtigsten Argumente dafür und dagegen?',it:'Quali sono stati in Parlamento i principali argomenti a favore e contro?'}},
 {key:'change',question:{en:'What would the initiative change, according to the debate?',fr:'Que changerait l’initiative, selon le débat ?',de:'Was würde die Initiative gemäss der Debatte ändern?',it:'Cosa cambierebbe l’iniziativa, secondo il dibattito?'}},
 {key:'federal-council',question:{en:'What did the Federal Council say in the debate?',fr:'Qu’a dit le Conseil fédéral pendant le débat ?',de:'Was sagte der Bundesrat in der Debatte?',it:'Cosa ha detto il Consiglio federale nel dibattito?'}},
];
export async function preparedStage({root,out,write}){
 const data=JSON.parse(readFileSync(out,'utf8'));
 const cases=(c=>c.cases||c)(JSON.parse(readFileSync(resolve(root,'config/evaluation/stance-cases.json'),'utf8')));
 const env={...process.env,INFERENCE_PROVIDER:'openai',INFERENCE_BASE_URL:OPENAI_BASE,INFERENCE_MODEL:process.env.VOTE_BRIEF_MODEL||'gpt-6-luna',NVIDIA_API_KEY:'',
  PREPARED_ANSWERS:'off',WEB_RESEARCH:'off',WARM_OVERVIEW:'off',TYPESAFE_MODE:'off',ACCESS_POLICY:'open'};
 const {server}=createServer({env});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base=`http://127.0.0.1:${server.address().port}/api/parliament/ask`;
 try{
  for(const o of data.objects){
   if(!o.businessId)continue;
   const speakers=[...new Map(cases.filter(c=>c.businessId===o.businessId).flatMap(c=>c.expect?.speakers||[]).map(s=>[s.name,s])).values()];
   const prepared=[];
   for(const q of QUESTIONS){
    const answers={};
    await Promise.all(Object.entries(q.question).map(async([language,question])=>{
     for(let attempt=0;attempt<2&&!answers[language];attempt++){
      const r=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(240000),
       body:JSON.stringify({question,language,thread:[],businessId:o.businessId,scopeTitle:o.title[language]||o.title.en})}).catch(()=>null);
      const a=r?.ok?await r.json():null;
      if(!(a?.status==='ok'&&a.mode==='live-inference'&&a.answer&&a.synthesis?.status==='ok'))continue;
      const s=scoreAnswer({id:o.id+'|'+q.key+'|'+language,language,expect:{speakers}},a);
      if(s.speakers.some(x=>x.result==='flip')||s.roleErrors.length){console.log('screened out',o.id,q.key,language);continue;}
      const {web,webStatus,latencyMs,cacheHit,...kept}=a;
      answers[language]={...kept,mode:'prepared',preparedAt:new Date().toISOString(),preparedModel:env.INFERENCE_MODEL};
     }
    }));
    prepared.push({key:q.key,question:q.question,answers});
    console.log(o.id,q.key,Object.keys(answers).join(',')||'none');
   }
   o.prepared=prepared;
  }
 }finally{server.close();}
 write(data);
}
