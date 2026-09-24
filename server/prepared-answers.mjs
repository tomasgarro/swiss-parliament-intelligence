// Prepared answers: the one-click questions the interface offers (home chips, "Ask Cleisthenes about this vote"),
// researched in advance by the same pipeline and served instantly. Each carries when and by which model it was made,
// so it is never mistaken for a live answer. Only a first question matches; follow-ups always run live.
import {existsSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

export const PREPARED_FILE='data/parliament/prepared-answers.json';
// A release ships the screened library with the code (config/); the data-volume copy is the fallback.
const SHIPPED_FILE='config/prepared-answers.json';
export const preparedKey=({question,language,businessId,personId})=>[String(language||'en'),String(businessId||''),String(personId||''),
 String(question||'').normalize('NFKC').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').replace(/[\s?!.]+$/,'').trim()].join('|');
let cache=null;
export function loadPreparedAnswers(root){
 const file=[SHIPPED_FILE,PREPARED_FILE].map(f=>join(root,f)).find(f=>existsSync(f));
 if(!file)return new Map();
 const mtime=statSync(file).mtimeMs;if(cache?.file===file&&cache.mtime===mtime)return cache.map;
 const data=JSON.parse(readFileSync(file,'utf8'));
 const map=new Map((data.answers||[]).filter(a=>a.question&&a.answer?.status==='ok'&&a.answer.answer).map(a=>[preparedKey(a),a]));
 cache={file,mtime,map};return map;
}
export function findPreparedAnswer(root,b,env={}){
 if(env.PREPARED_ANSWERS==='off'||b.thread?.length||b.passageId||b.filters||b.webResearch===true)return null;
 return loadPreparedAnswers(root).get(preparedKey({question:b.question,language:b.language,businessId:b.businessId,personId:b.personId}))||null;
}
export function servePrepared(entry){
 return {...entry.answer,mode:'prepared',preparedAt:entry.preparedAt,preparedModel:entry.model,cacheHit:true,latencyMs:0,
  notice:'Prepared answer: Cleisthenes researched this question in advance, with the same checks as a live answer. Ask a follow-up to research further.'};
}
