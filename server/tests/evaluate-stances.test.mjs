import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {scoreAnswer,classifyTitle,applyJudgements,judgeRequests} from '../../scripts/lib/stance-score.mjs';

// Synthetic answers only; the speakers mirror real 10-million-initiative positions so the fixtures read naturally.
const buffat={name:'Michaël Buffat',surname:'Buffat',stance:'for',function:'Mit-M'};
const marti={name:'Samira Marti',surname:'Marti',stance:'against',function:'Mit-F'};
const jans={name:'Beat Jans',surname:'Jans',stance:'against',function:'BR-M'};
const kase=(language,speakers,extra={})=>({id:'t-'+language,language,expect:{speakers,forbid:[],...extra}});
const answer=(lead,sections=[],more={})=>({status:'ok',mode:'live-inference',answer:{lead:{text:lead},sections:sections.map(([title,...paragraphs])=>({title,paragraphs:paragraphs.map(text=>({text}))}))},citations:[],...more});
const result=(score,name)=>score.speakers.find(s=>s.name===name).result;

test('a correct answer passes',()=>{
 const s=scoreAnswer(kase('en',[buffat,marti,jans]),answer('Michaël Buffat (SVP) supported the initiative, while Samira Marti (SP) urged its rejection.',[
  ['What supporters argued','Buffat said that saying yes to the initiative means saying no to a Switzerland of 10 million.'],
  ['What opponents argued','Marti said the SP group would recommend rejecting this termination initiative.','Federal Councillor Beat Jans said the Federal Council firmly rejects the initiative.']]));
 assert.equal(s.verdict,'pass');assert.deepEqual(s.counts,{ok:3,flip:0,unclassified:0,absent:0});
});

test('a supporter listed under an "Arguments against" heading is a flip',()=>{
 const s=scoreAnswer(kase('en',[buffat,marti]),answer('The sources show arguments on both sides.',[['Arguments against','Michaël Buffat warned about rents and housing.','Samira Marti called it a termination initiative.']]));
 assert.equal(result(s,'Michaël Buffat'),'flip');assert.equal(result(s,'Samira Marti'),'ok');assert.equal(s.verdict,'fail');
 assert.equal(s.speakers[0].mentions[0].by,'title');
});

test('a supporter named among the opponents in a sentence is a flip',()=>{
 const s=scoreAnswer(kase('en',[buffat,marti]),answer('Opponents such as Samira Marti and Michaël Buffat argued the initiative would end free movement.'));
 assert.equal(result(s,'Michaël Buffat'),'flip');assert.equal(result(s,'Samira Marti'),'ok');
});

test('a member of Parliament presented as the Federal Council is flagged',()=>{
 for(const lead of ['Federal Councillor Michaël Buffat said the initiative would ease housing.','Michaël Buffat, speaking on behalf of the Federal Council, supported the initiative.','The Federal Council (Buffat) argued for a population limit.']){
  const s=scoreAnswer(kase('en',[buffat]),answer(lead));
  assert.equal(s.roleErrors.length,1,lead);assert.equal(s.roleErrors[0].kind,'member-as-federal-council');assert.equal(s.verdict,'fail');
 }
 const fr=scoreAnswer(kase('fr',[buffat]),answer("Le conseiller fédéral Michaël Buffat a soutenu l'initiative."));assert.equal(fr.roleErrors.length,1);
 const de=scoreAnswer(kase('de',[buffat]),answer('Michaël Buffat sprach im Namen des Bundesrates für die Initiative.'));assert.equal(de.roleErrors.length,1);
 // Criticising the Federal Council, or a real Federal Councillor, is not a role error.
 const ok=scoreAnswer(kase('en',[buffat,jans]),answer("Michaël Buffat criticised the Federal Council's warnings, and Federal Councillor Beat Jans rejected the initiative."));
 assert.equal(ok.roleErrors.length,0);
 const reverse=scoreAnswer(kase('en',[jans]),answer('National Councillor Beat Jans rejected the initiative.'));assert.equal(reverse.roleErrors[0].kind,'federal-councillor-as-member');
});

test('"the Federal Council" voiced from a Mit-M speech is flagged',()=>{
 const cited=(role,speaker)=>({status:'ok',mode:'live-inference',answer:{lead:{text:'The Federal Council warned that immigration overloads housing and roads.',citationIds:['c1']},sections:[]},citations:[{id:'c1',speaker,role}]});
 const s=scoreAnswer(kase('en',[buffat]),cited('Member of the Conseil national','Buffat Michaël'));
 assert.equal(s.roleErrors[0].kind,'federal-council-voice-from-member');assert.equal(s.roleErrors[0].speaker,'Buffat Michaël');assert.equal(s.verdict,'fail');
 // The same sentence backed by a Federal Councillor's speech, or attributed to the member by name, is fine.
 assert.equal(scoreAnswer(kase('en',[jans]),cited('Federal Councillor','Jans Beat')).roleErrors.length,0);
 const named={...cited('Member of the Conseil national','Buffat Michaël')};named.answer.lead.text='Buffat said the Federal Council had underestimated immigration.';
 assert.equal(scoreAnswer(kase('en',[buffat]),named).roleErrors.length,0);
});

test('French, German and Italian section titles are classified',()=>{
 for(const [title,side] of [['Les arguments des opposants','against'],['Ce que défendent les partisans','for'],['Arguments pour et contre','null'],['Pourquoi rejeter le contre-projet','null'],
  ['Argumente der Befürworter','for'],['Was die Gegner sagen','against'],['Was sich für Familien ändern würde','null'],['Gli argomenti dei contrari','against'],['Le ragioni dei favorevoli','for'],
  ['What would change for families','null'],['What supporters argued','for'],['What opponents argued','against']])assert.equal(String(classifyTitle(title)),side,title);
 const fr=scoreAnswer(kase('fr',[buffat,marti]),answer('Le débat oppose deux camps.',[['Les arguments des partisans','Michaël Buffat a mis en avant le logement.'],['Les arguments des opposants','Samira Marti a parlé des bilatérales.']]));
 assert.equal(fr.verdict,'pass');
 const de=scoreAnswer(kase('de',[buffat,marti]),answer('Die Debatte zeigt zwei Lager.',[['Was die Gegner sagen','Michaël Buffat sprach über Mieten.']]));
 assert.equal(result(de,'Michaël Buffat'),'flip');
});

test('sentence cues in four languages, with negation and counter-proposals',()=>{
 const cases=[
  ['fr',"Michaël Buffat soutient l'initiative, mais Samira Marti la rejette.",'ok','ok'],
  ['fr',"Céline Weber ne soutiendra pas cette initiative et Michaël Buffat appelle à dire oui à l'initiative.",'ok','ok'],
  ['de','Michaël Buffat unterstützt die Initiative; Samira Marti empfiehlt sie zur Ablehnung.','ok','ok'],
  ['de','Samira Marti lehnt die Initiative ab, während Michaël Buffat Ja zur Nachhaltigkeits-Initiative sagt.','ok','ok'],
  ['it',"Michaël Buffat sostiene l'iniziativa, mentre Samira Marti invita a respingere l'iniziativa.",'ok','ok'],
  ['en','Samira Marti did not support the initiative; Michaël Buffat backed it.','ok','ok'],
 ];
 const weber={name:'Céline Weber',surname:'Weber',stance:'against',function:'Mit-F'};
 for(const [lang,text,b,m] of cases){const s=scoreAnswer(kase(lang,[buffat,marti,weber]),answer(text));assert.equal(result(s,'Michaël Buffat'),b,text);if(text.includes('Marti'))assert.equal(result(s,'Samira Marti'),m,text);}
 // Support for the counter-proposal says nothing about the initiative itself.
 const counter=scoreAnswer(kase('en',[marti]),answer('Samira Marti supported the counter-proposal.'));assert.equal(result(counter,'Samira Marti'),'unclassified');
 // "Sostiene che" means "argues that", not "supports".
 const argues=scoreAnswer(kase('it',[marti]),answer("Samira Marti sostiene che l'iniziativa metterebbe a rischio gli accordi bilaterali."));assert.equal(result(argues,'Samira Marti'),'unclassified');
 // Another speaker's verb does not bind: Buffat is only the object of Marti's criticism here.
 const object=scoreAnswer(kase('en',[buffat,marti]),answer("Samira Marti rejected the initiative and criticised Michaël Buffat's housing figures."));assert.equal(result(object,'Michaël Buffat'),'unclassified');
});

test('bystanders are not enlisted by someone else’s verb or camp noun',()=>{
 const wasserfallen={name:'Christian Wasserfallen',surname:'Wasserfallen',stance:'against',function:'Mit-M'};
 for(const [lang,text] of [['en','Wasserfallen rejected the initiative and Buffat said it would protect housing.'],['en','Buffat said the Federal Council rejects the initiative.'],
  ['fr','Selon Buffat, les opposants se trompent.'],['it','Secondo Buffat, i contrari sbagliano.'],['de','Buffat warf den Gegnern vor, die Probleme zu ignorieren.'],
  ['en','The National Council recommended rejecting the initiative by 121 votes to 64; Buffat was in the minority.']]){
  const s=scoreAnswer(kase(lang,[buffat,wasserfallen]),answer(text));assert.notEqual(result(s,'Michaël Buffat'),'flip',text);
 }
 // A Federal Councillor reporting the Federal Council's position is stating his own.
 assert.equal(result(scoreAnswer(kase('en',[jans]),answer('Jans said the Federal Council firmly rejects the initiative.')),'Beat Jans'),'ok');
 assert.equal(result(scoreAnswer(kase('de',[buffat]),answer('Buffat und Glarner gehörten zu den Befürwortern der Initiative.')),'Michaël Buffat'),'ok');
 assert.equal(result(scoreAnswer(kase('it',[buffat,jans]),answer("Contro l'iniziativa, Martine Docourt e il consigliere federale Beat Jans ne contestano il meccanismo.")),'Beat Jans'),'ok');
});

test('forbidden phrases, missing citations and degraded answers are reported',()=>{
 const c=kase('en',[buffat],{forbid:['the Federal Council supports the initiative'],mustCite:['Michaël Buffat']});
 const s=scoreAnswer(c,answer('Michaël Buffat said the Federal Council supports the initiative.',[],{citations:[{speaker:'Marti Samira'}]}));
 assert.deepEqual(s.forbidden,[{phrase:'the Federal Council supports the initiative'}]);assert.deepEqual(s.missingCites,['Michaël Buffat']);assert.equal(s.verdict,'fail');
 const cited=scoreAnswer(c,answer('Michaël Buffat supported the initiative.',[],{citations:[{speaker:'Buffat Michaël'}]}));assert.deepEqual(cited.missingCites,[]);assert.equal(cited.verdict,'pass');
 const refused=scoreAnswer(c,{status:'insufficient-evidence',claims:[]});assert.equal(refused.statusIssue,'insufficient-evidence');assert.equal(refused.verdict,'warn');assert.equal(refused.speakers[0].result,'absent');
});

test('shared surnames need the full name, and a neutral speaker must not be placed on a side',()=>{
 const roth={name:'David Roth',surname:'Roth',stance:'against',aliases:['David Roth','Roth David']};
 const s=scoreAnswer(kase('en',[roth]),answer('Roth Pasquier supported the initiative.'));assert.equal(result(s,'David Roth'),'absent');
 const wettstein={name:'Felix Wettstein',surname:'Wettstein',stance:'neutral'};
 assert.equal(result(scoreAnswer(kase('en',[wettstein]),answer('Supporters included Felix Wettstein.')),'Felix Wettstein'),'flip');
 assert.equal(result(scoreAnswer(kase('en',[wettstein]),answer('Felix Wettstein gave no recommendation on the initiative itself.')),'Felix Wettstein'),'unclassified');
});

test('judge verdicts only settle unclassified mentions',()=>{
 const response=answer('Michaël Buffat spoke about rents and housing.');
 const s=scoreAnswer(kase('en',[buffat]),response);assert.equal(s.verdict,'warn');
 const [req]=judgeRequests(s,response);assert.equal(req.speaker,'Michaël Buffat');assert.match(req.passages[0].text,/rents/);
 assert.equal(applyJudgements(s,[{speaker:'Michaël Buffat',stance_in_answer:'against'}]).verdict,'fail');
 assert.equal(applyJudgements(s,[{speaker:'Michaël Buffat',stance_in_answer:'for'}]).verdict,'pass');
 assert.equal(applyJudgements(s,[{speaker:'Michaël Buffat',stance_in_answer:'unclear'}]).verdict,'warn');
});

test('the stance cases are well-formed and cover four languages',()=>{
 const {cases}=JSON.parse(readFileSync(new URL('../../config/evaluation/stance-cases.json',import.meta.url),'utf8'));
 assert.ok(cases.length>=20&&cases.length<=30);assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);
 for(const l of ['en','fr','de','it'])assert.ok(cases.filter(c=>c.language===l).length>=5,l);
 for(const c of cases){
  assert.ok(c.question&&c.expect.speakers.length,c.id);assert.ok(Array.isArray(c.expect.forbid),c.id);
  for(const s of c.expect.speakers){assert.ok(['for','against','neutral'].includes(s.stance),s.name);assert.ok(s.surname&&s.function,s.name);assert.ok(s.evidence.length&&s.evidence.every(e=>/^\d+-\d+$/.test(e.passageId)&&e.quote.length>10),s.name);}
  for(const n of c.expect.mustCite||[])assert.ok(c.expect.speakers.some(s=>s.name===n),c.id+' '+n);
 }
});

test('Italian "ha sostenuto di votare no" is reported speech, not support',()=>{
 const caseDef={id:'it',language:'it',expect:{speakers:[{name:'Benjamin Roduit',surname:'Roduit',stance:'against'}]}};
 const response={status:'ok',mode:'live-inference',answer:{lead:{text:'Il dibattito ha visto posizioni diverse.',citationIds:[]},sections:[{title:'Contro',paragraphs:[{text:"Il 25 settembre 2025 Benjamin Roduit ha sostenuto di votare no all'iniziativa e di sostenere il controprogetto diretto.",citationIds:[]}]}]},citations:[]};
 assert.equal(scoreAnswer(caseDef,response).speakers[0].result,'ok');
});
