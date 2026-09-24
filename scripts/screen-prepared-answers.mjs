// Screens the prepared-answer library with the stance scorer before it ships: each answer is checked against the
// known speaker stances for its proposal (config/evaluation/stance-cases.json) and the Federal Council role rules.
// A flagged answer is withheld from the library, so that question is researched live instead.
//   node scripts/screen-prepared-answers.mjs [--write]
import {readFileSync,renameSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {scoreAnswer} from './lib/stance-score.mjs';
import {PREPARED_FILE} from '../server/prepared-answers.mjs';

const root=resolve(import.meta.dirname,'..'),file=resolve(root,PREPARED_FILE);
const cases=(c=>c.cases||c)(JSON.parse(readFileSync(resolve(root,'config/evaluation/stance-cases.json'),'utf8')));
// Every recorded stance on a proposal, merged across the cases (and languages) that cover it.
const stances=new Map();
for(const c of cases){if(!c.businessId)continue;const list=stances.get(c.businessId)||new Map();for(const s of c.expect?.speakers||[])list.set(s.name,s);stances.set(c.businessId,list);}
const store=JSON.parse(readFileSync(file,'utf8'));
const kept=[],withheld=[];
for(const entry of store.answers){
 const a=entry.answer,businessId=entry.businessId||a.retrieval?.proposal?.id||a.researchSummary?.proposal?.id||'';
 const speakers=[...(stances.get(String(businessId))?.values()||[])];
 const s=scoreAnswer({id:entry.language+'|'+(businessId||'-'),language:entry.language,expect:{speakers}},a);
 const flips=s.speakers.filter(x=>x.result==='flip');
 const problems=[...flips.map(f=>`${f.name} placed ${f.mentions.find(m=>m.side&&m.side!==f.expected)?.side} (expected ${f.expected})`),...s.roleErrors.map(r=>typeof r==='string'?r:JSON.stringify(r).slice(0,160))];
 (problems.length?withheld:kept).push(problems.length?{language:entry.language,businessId,question:entry.question.slice(0,90),problems}:entry);
}
console.log(JSON.stringify({screened:store.answers.length,kept:kept.length,withheld:withheld.length},null,0));
for(const w of withheld)console.log('WITHHELD',w.language,w.businessId||'-',w.question,'\n  ',w.problems.join('\n   '));
if(process.argv.includes('--write')&&withheld.length){
 const out={...store,answers:kept,screenedAt:new Date().toISOString(),screen:'stance-score: known stances + Federal Council role checks'};
 writeFileSync(file+'.tmp',JSON.stringify(out));renameSync(file+'.tmp',file);console.log('written',PREPARED_FILE);
}
