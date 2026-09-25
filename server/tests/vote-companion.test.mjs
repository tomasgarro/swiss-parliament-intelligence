import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vt,localTitle,decisionSummary,decisionColumns,orderGroups,coverageNote,briefLanguage,preparedFor,clock,citationText,reportMailto,splitVoteDates,STRINGS} from '../../frontend/src/pilot/vote-companion.mjs';

const neutrality=JSON.parse(readFileSync(new URL('../../config/votes/votes-20260927.json',import.meta.url),'utf8')).objects[0];
const nc=neutrality.decided.nationalCouncil;
const bareYesNo=/\b(yes|no|oui|non|ja|nein|sì)\b/i;

test('a chamber vote whose yes meant "recommend rejection" reads as that recommendation, never as a bare yes/no',()=>{
 const en=decisionSummary(nc,'popular-initiative','en');
 assert.equal(en.mode,'recommend-rejection');
 assert.equal(en.sentence,'116 voted to recommend rejecting the initiative · 65 voted against that recommendation · 5 abstained');
 assert.deepEqual(en.extra,['1 did not vote','4 excused','1 presiding (does not vote)']);
 assert.equal(decisionSummary(nc,'popular-initiative','fr').sentence,'116 ont voté pour recommander de rejeter l’initiative · 65 ont voté contre cette recommandation · 5 se sont abstenus');
 assert.equal(decisionSummary(nc,'popular-initiative','de').sentence,'116 stimmten für die Empfehlung, die Initiative abzulehnen · 65 stimmten gegen diese Empfehlung · 5 enthielten sich');
 assert.equal(decisionSummary(nc,'popular-initiative','it').sentence,'116 hanno votato per raccomandare di respingere l’iniziativa · 65 hanno votato contro questa raccomandazione · 5 si sono astenuti');
 for(const language of ['en','fr','de','it'])assert.doesNotMatch(decisionSummary(nc,'popular-initiative',language).sentence,bareYesNo,language);
 // The recorded meanings travel with the summary, in the original language.
 assert.equal(en.meaning.yes,"Adopter le projet (recommandation de rejeter l'initiative populaire)");
});

test('singular counts, recommend-acceptance and zero groups read correctly',()=>{
 const vote={yesMeans:'recommend-acceptance',meaningYes:'x',meaningNo:'y',counts:{yes:1,no:1,abstained:1,didNotVote:0,excused:0,presiding:0}};
 const s=decisionSummary(vote,'counter-proposal','en');
 assert.equal(s.sentence,'1 voted to recommend accepting the counter-proposal · 1 voted against that recommendation · 1 abstained');
 assert.deepEqual(s.extra,[]);
 assert.equal(decisionSummary(vote,'counter-proposal','fr').main[2],'1 s’est abstenu');
 assert.equal(decisionSummary(null,'popular-initiative','en'),null);
});

test('an unclear vote shows only the recorded meanings, verbatim, with no ballot side of our own',()=>{
 const vote={yesMeans:'unclear',meaningYes:'Adopter le projet',meaningNo:'Rejeter le projet',counts:{yes:120,no:70,abstained:3,didNotVote:2,excused:4,presiding:1}};
 const s=decisionSummary(vote,'optional-referendum','en');
 assert.equal(s.mode,'unclear');
 assert.equal(s.sentence,'120 voted «Adopter le projet» · 70 voted «Rejeter le projet» · 3 abstained');
 assert.doesNotMatch(s.sentence,/recommend|accept|reject/i);
 const columns=decisionColumns(vote,'en');
 assert.equal(columns[0].label,'«Adopter le projet»');assert.equal(columns[1].label,'«Rejeter le projet»');
 // An unknown mapping value is treated as unclear too.
 assert.equal(decisionSummary({...vote,yesMeans:'something-else'},'popular-initiative','en').mode,'unclear');
});

test('party-group table: neutral headings and one fixed order, whatever the counts',()=>{
 const columns=decisionColumns(nc,'en').map(c=>c.label);
 assert.deepEqual(columns,['Recommend rejecting','Against that recommendation','Abstained','Did not vote','Excused','Presiding']);
 for(const label of columns)assert.doesNotMatch(label,bareYesNo);
 const order=orderGroups(nc.byGroup).map(g=>g.code);
 assert.deepEqual(order,['Groupe B','Groupe G','Groupe GL','Groupe K','Groupe R','Groupe S']);
 assert.deepEqual(orderGroups([...nc.byGroup].reverse()).map(g=>g.code),order);
 assert.equal(nc.byGroup[0].code,'Groupe B','input is not mutated');
});

test('coverage labels use the spec wording; full coverage has none',()=>{
 assert.equal(coverageNote({level:'thin',passages:2,speakers:1},'en'),'The record covers this side thinly: 2 passages from 1 speakers.');
 assert.equal(coverageNote({level:'one-voice'},'fr'),'Un seul membre s’est exprimé pour ce camp dans le Bulletin officiel.');
 assert.equal(coverageNote({level:'silent'},'en'),'No passage in the record argues this side. We don’t fill the gap from other sources.');
 assert.equal(coverageNote({level:'full'},'en'),null);assert.equal(coverageNote(undefined,'en'),null);
});

test('languages fall back in the documented order and every EN key exists in FR',()=>{
 assert.equal(localTitle(neutrality.title,'it'),neutrality.title.it);
 assert.equal(localTitle({de:'Nur Deutsch'},'fr'),'Nur Deutsch');
 assert.equal(localTitle({en:'English',de:'Deutsch'},'rm'),'English');
 assert.equal(vt('rm','u.decided.h'),'What Parliament decided');
 assert.equal(vt('it','nav.votes'),'Votazioni');
 assert.deepEqual(Object.keys(STRINGS.en).filter(k=>!(k in STRINGS.fr)),[]);
 assert.equal(briefLanguage({languages:{en:{for:[],against:[]}}},'fr').code,'en');
 assert.equal(briefLanguage(null,'fr'),null);
 const item={question:{en:'Q',fr:'QF'},answers:{en:{status:'ok'}}};
 assert.deepEqual(preparedFor(item,'fr'),{code:'en',answer:{status:'ok'},question:'QF'});
});

test('citations copy as plain text, and reports name the object and citation without personal data',()=>{
 const c={speaker:'Jane Doe',role:'Member',group:'Groupe X',chamber:'N',date:'2026-03-20',quote:' Texte original. ',language:'fr',officialUrl:'https://www.parlament.ch/x'};
 assert.equal(citationText(c,{language:'en',pageUrl:'https://midnight.vote/Switzerland/?view=votes&vote=6880#citation-c1'}),
  '“Texte original.”\n— Jane Doe (Member, Groupe X), National Council, 20 March 2026\nOpen in the official record: https://www.parlament.ch/x\nCleisthenes Vote Companion: https://midnight.vote/Switzerland/?view=votes&vote=6880#citation-c1');
 const mail=reportMailto({objectId:'6880',citationId:'c3',businessNumber:'24.092'});
 assert.match(mail,/^mailto:contact@midnight\.vote\?subject=/);
 const subject=decodeURIComponent(mail.match(/subject=([^&]*)/)[1]);
 assert.equal(subject,'Vote Companion report · object 6880 · citation c3');
 assert.doesNotMatch(decodeURIComponent(mail),/@(?!midnight\.vote)/);
 assert.equal(clock(74.9),'1:14');assert.equal(clock(5),'0:05');
});

test('the index picks the next vote date in Zurich time and collapses past dates',()=>{
 const dates=[{date:'2026-06-14'},{date:'2026-11-29'},{date:'2026-09-27'},{date:'2026-03-08'}];
 const s=splitVoteDates(dates,'2026-09-25');
 assert.equal(s.next.date,'2026-09-27');assert.deepEqual(s.later.map(d=>d.date),['2026-11-29']);assert.deepEqual(s.past.map(d=>d.date),['2026-06-14','2026-03-08']);
 assert.equal(splitVoteDates(dates,'2026-09-27').next.date,'2026-09-27','the vote day itself is still the next vote');
 assert.equal(splitVoteDates([],'2026-09-25').next,null);
});
