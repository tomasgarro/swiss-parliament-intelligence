import test from 'node:test';
import assert from 'node:assert/strict';
import {needsResolution,cleanThread,resolveQuestion,followUpRequest} from '../conversation.mjs';
import {namesOtherProposal} from '../parliament-ai.mjs';

const thread=[{question:'Who is Lorenzo Quadri?',answer:'Lorenzo Quadri is a National Councillor for Ticino.',person:{id:'4046',name:'Lorenzo Quadri'},speakers:[]}];

test('only questions with references are rewritten, in any national language',()=>{
 for(const q of ['What did he vote last summer?','Quels sont ses votes ?','Was hat er gesagt?','Cosa ha detto lei?','Tell me more about that initiative'])assert.equal(needsResolution(q),true,q);
 for(const q of ['What did Lorenzo Quadri say about asylum?','Arguments for and against the 10-million initiative'])assert.equal(needsResolution(q),false,q);
});

test('the reference gate covers German, Italian and French pronouns and elliptical follow-ups, not articles or topics',()=>{
 for(const q of ['Was hat sie gesagt?','Was sagen deren Gegner?','Was wollen Sie von ihnen?','Cosa pensano loro?','Et celui du Conseil des Etats ?','Qu’a-t-il dit sur l’asile ?','Pourquoi il a voté contre ?',
  'And the costs?','Et les opposants ?','Und die Gegner?','E i contrari?','What about the Greens?','Und was ist mit den Kantonen?','Qu’en est-il des cantons ?','And Buffat?'])assert.equal(needsResolution(q),true,q);
 for(const q of ['Il Consiglio federale sostiene l’iniziativa sul clima?','What was the vote on the 10-million initiative?','Summarise the debate on the e-ID law','Who chairs the Council of States?'])assert.equal(needsResolution(q),false,q);
});

test('a rewrite that brings in no one and nothing from the thread is not a resolution',async()=>{
 const env={INFERENCE_BASE_URL:'https://example.test/v1',INFERENCE_MODEL:'fixture'};
 const reply=standalone=>async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({standalone,personId:''})}}]})});
 const reworded=await resolveQuestion('What did he vote last summer?',thread,{env,fetchImpl:reply('What did he vote on last summer?')});
 assert.equal(reworded.resolved,false);assert.equal(reworded.question,'What did he vote last summer?');
 const translatedTitle=await resolveQuestion('And the costs?',[{question:'Arguments on the neutrality initiative?',proposal:{id:'20240050',title:'Sauvegarder la neutralité suisse (initiative sur la neutralité)'},speakers:[]}],{env,fetchImpl:reply('And the costs of the Swiss neutrality initiative?')});
 assert.equal(translatedTitle.resolved,true,'an English rewrite still matches the French title');assert.equal(translatedTitle.proposal.id,'20240050');
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
 const elsewhere=followUpRequest({question:'And the neutrality initiative?'},resolution,{otherProposal:true});
 assert.equal(elsewhere.businessId,undefined,'a question naming another proposal is not locked to the thread’s');assert.equal(elsewhere.personId,'4264');
});

test('the thread’s proposal lock yields to a question that names a different proposal',async()=>{
 const tenMillion={id:'20250026',title:'Pas de Suisse à 10 millions ! (initiative pour la durabilité)'};
 // Enough other titles for resolveProposal's distinctiveness thresholds, as in the real archive.
 const store={listBusinesses:()=>[{...tenMillion,passageCount:40},{id:'20240050',title:'Sauvegarder la neutralité suisse (initiative sur la neutralité)',passageCount:12},...[...Array(3000)].map((_,i)=>({id:String(19000000+i),title:'Objet administratif',passageCount:1}))]};
 const never=async()=>{throw new Error('no model call expected');};
 assert.equal(await namesOtherProposal('What did she say?',tenMillion,{store,env:{INFERENCE_BASE_URL:'https://example.test/v1',INFERENCE_MODEL:'m'},fetchImpl:never}),false,'no proposal words: no model call');
 assert.equal(await namesOtherProposal('And the ‘Stop blackout’ initiative?',tenMillion,{store,env:{}}),true,'without a model, a quoted other title counts');
 assert.equal(await namesOtherProposal('What else about the initiative?',tenMillion,{store,env:{}}),false);
 const model=(named,frenchTitleWords)=>async(_u,o)=>{assert.equal(JSON.parse(o.body).response_format.json_schema.name,'proposal_reference');return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({named,frenchTitleWords})}}]})};};
 const ask=(q,reply)=>namesOtherProposal(q,tenMillion,{store,env:{INFERENCE_BASE_URL:'https://example.test/v1',INFERENCE_MODEL:'lock-'+q},fetchImpl:reply});
 assert.equal(await ask('And the neutrality initiative?',model(true,'neutralité suisse')),true);
 assert.equal(await ask('And what else on the 10-million initiative?',model(true,'Pas de Suisse à 10 millions durabilité')),false,'the same proposal keeps the lock');
 assert.equal(await ask('What did she say about that initiative?',model(false,'')),false);
});
