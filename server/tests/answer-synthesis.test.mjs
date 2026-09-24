import test from 'node:test';import assert from 'node:assert/strict';
import {synthesizeAnswer} from '../answer-synthesis.mjs';

const env={INFERENCE_BASE_URL:'http://model.test/v1',INFERENCE_MODEL:'m'};
const passages=[{id:'1-1',speaker:'Buffat Michaël',speakerFunction:'Mit-M',council:'NR',date:'2025-09-22',language:'fr',text:'Fixer une limite démographique.',officialUrl:'https://www.parlament.ch'},
 {id:'2-1',speaker:'Docourt Martine',speakerFunction:'Mit-F',council:'NR',date:'2025-09-25',language:'fr',text:'Des solutions discriminatoires.',officialUrl:'https://www.parlament.ch'}];
const claims=[{text:'Buffat supports a population limit.',evidenceId:'parl-1-1'},{text:'Docourt calls the proposals discriminatory.',evidenceId:'parl-2-1'}];
const draft={lead:{text:'Parliament broadly agreed that the initiative goes too far, with a clear majority against it.',units:['u1','u2']},
 sections:[{title:'Arguments for',paragraphs:[{text:'Michaël Buffat argues that a population limit would relieve housing and infrastructure.',units:['u1']}]},
  {title:'Arguments against',paragraphs:[{text:'Martine Docourt calls the proposed solutions discriminatory.',units:['u2']}]}],followUps:['What did other speakers argue?']};
// The reviewer rejects the overreaching lead every time, and approves the paragraphs listed in `supported`.
function model(supported){
 return async(url,options)=>{
  const body=JSON.parse(options.body),name=body.response_format.json_schema.name;
  if(name==='cleisthenes_answer')return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(draft)}}]})};
  const items=JSON.parse(body.messages.at(-1).content).claims||JSON.parse(body.messages.at(-1).content);
  const texts=(Array.isArray(items)?items:[]).map(c=>c.text||c.claim||'');
  const verdict=Object.fromEntries(texts.map((t,i)=>[String(i),supported.some(s=>t.startsWith(s))]));
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(verdict)}}]})};
 };
}

test('an unsupported lead is replaced by the first checked paragraph instead of discarding the answer',async()=>{
 const out=await synthesizeAnswer({question:'What are the arguments for and against?',language:'en',claims,passages,env,fetchImpl:model(['Michaël Buffat','Martine Docourt'])});
 assert.equal(out.status,'ok');assert.equal(out.leadReplaced,true);
 assert.match(out.answer.lead.text,/^Michaël Buffat/);
 assert.ok(!JSON.stringify(out.answer).includes('clear majority'),'the unsupported lead never reaches the reader');
 assert.deepEqual(out.answer.sections.map(s=>s.title),['Arguments against'],'the promoted paragraph is not repeated');
});

test('when no paragraph passes review the written answer is still withheld',async()=>{
 const out=await synthesizeAnswer({question:'What are the arguments for and against?',language:'en',claims,passages,env,fetchImpl:model([])});
 assert.equal(out.status,'synthesis-not-supported');
});
