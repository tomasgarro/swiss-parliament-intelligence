import test from 'node:test';
import assert from 'node:assert/strict';
import {needsResolution,cleanThread,resolveQuestion,followUpRequest} from '../conversation.mjs';

const thread=[{question:'Who is Lorenzo Quadri?',answer:'Lorenzo Quadri is a National Councillor for Ticino.',person:{id:'4046',name:'Lorenzo Quadri'},speakers:[]}];

test('only questions with references are rewritten, in any national language',()=>{
 for(const q of ['What did he vote last summer?','Quels sont ses votes ?','Was hat er gesagt?','Cosa ha detto lei?','Tell me more about that initiative'])assert.equal(needsResolution(q),true,q);
 for(const q of ['What did Lorenzo Quadri say about asylum?','Arguments for and against the 10-million initiative'])assert.equal(needsResolution(q),false,q);
});

test('thread input is validated and bounded',()=>{
 const t=cleanThread([...Array(5)].map((_,i)=>({question:'q'+i,person:{id:'<script>',name:'x'},proposal:{id:'20250026',title:'T'}})));
 assert.equal(t.length,3);assert.equal(t[0].person,null);assert.equal(t[0].proposal.id,'20250026');
});

test('the model resolves the reference; without a model the last person is attached',async()=>{
 const env={INFERENCE_BASE_URL:'https://example.test/v1',INFERENCE_MODEL:'fixture'};
 const fetchImpl=async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({standalone:'What did Lorenzo Quadri vote last summer?'})}}]})});
 const r=await resolveQuestion('What did he vote last summer?',thread,{env,fetchImpl});
 assert.equal(r.resolved,true);assert.equal(r.question,'What did Lorenzo Quadri vote last summer?');
 const offline=await resolveQuestion('What did he vote last summer?',thread,{env:{}});
 assert.equal(offline.question,'What did he vote last summer? (Lorenzo Quadri)');
 const untouched=await resolveQuestion('Who chairs the Council of States?',thread,{env,fetchImpl});
 assert.equal(untouched.resolved,false);
});

// A debate answer citing two speakers, sent the way the frontend will: speakers with ids and the -F/-M gender hint.
const debate=[{question:'Arguments for and against the 10-million initiative?',answer:'Michaël Buffat supports a limit; Martine Docourt calls it discriminatory.',proposal:{id:'20250026',title:'Pas de Suisse à 10 millions ! (initiative pour la durabilité)'},
 speakers:['Procedural record',{name:'Buffat Michaël',personId:'4191',gender:'M'},{name:'Docourt Martine',personId:'4264',gender:'f'},{name:'Bad id',personId:'<x>',gender:'other'}]}];

test('cited speakers arrive as bare names or as {name, personId, gender}',()=>{
 assert.deepEqual(cleanThread(debate)[0].speakers,[{name:'Procedural record'},{name:'Buffat Michaël',personId:'4191',gender:'m'},{name:'Docourt Martine',personId:'4264',gender:'f'},{name:'Bad id'}]);
});

test('the model picks the follow-up’s person by id from the thread’s identified speakers',async()=>{
 const env={INFERENCE_BASE_URL:'https://example.test/v1',INFERENCE_MODEL:'fixture'};let request;
 const reply=content=>async(_u,o)=>{request=JSON.parse(o.body);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(content)}}]})};};
 const r=await resolveQuestion('What else did she say?',debate,{env,fetchImpl:reply({standalone:'What else did Martine Docourt say about the 10-million initiative?',personId:'4264'})});
 assert.deepEqual(request.response_format.json_schema.schema.properties.personId.enum,['4191','4264','']);
 assert.deepEqual(JSON.parse(request.messages[1].content).candidates.map(c=>c.gender),['m','f']);
 assert.deepEqual(r.person,{id:'4264',name:'Docourt Martine'});assert.equal(r.proposal.id,'20250026');
 const nobody=await resolveQuestion('What did they say?',debate,{env,fetchImpl:reply({standalone:'What did Michaël Buffat and Martine Docourt say?',personId:''})});
 assert.equal(nobody.person,null,'several people: no person scope');
 const unnamed=await resolveQuestion('What else did she say?',debate,{env,fetchImpl:reply({standalone:'What else was said about the 10-million initiative?',personId:'4264'})});
 assert.equal(unnamed.person,null,'a person the rewrite does not name is not silently scoped');
});

test('a resolved follow-up reads the resolved person’s speeches unless the reader chose a scope',()=>{
 const resolution={resolved:true,question:'What else did Martine Docourt say about the 10-million initiative?',person:{id:'4264',name:'Docourt Martine'},proposal:{id:'20250026',title:'x'}};
 const b=followUpRequest({question:'What else did she say?',language:'en'},resolution);
 assert.equal(b.personId,'4264');assert.equal(b.businessId,'20250026');assert.equal(b.question,resolution.question);assert.equal(b.originalQuestion,'What else did she say?');
 const scoped=followUpRequest({question:'What else did she say?',passageId:'1-1'},resolution);
 assert.equal(scoped.personId,undefined);assert.equal(scoped.businessId,undefined);
 assert.equal(followUpRequest({question:'q'},{resolved:false}).question,'q');
});
