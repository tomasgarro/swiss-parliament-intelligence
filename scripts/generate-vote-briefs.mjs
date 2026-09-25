// Builds config/votes/votes-<date>.json for Vote Companion (docs/VOTE-COMPANION-SPEC.md).
//   node scripts/generate-vote-briefs.mjs --date=20260927 --stage=data            official titles + Parliament's final votes
//   node --env-file=.env scripts/generate-vote-briefs.mjs --date=20260927 --stage=brief   cited arguments (model)
// Data stage: object titles come verbatim from the Federal Statistical Office / Federal Chancellery open data (VoteInfo);
// the object → Parliament business link is curated in config/votes/sources.json; counts come only from roll-call records.
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

const root=resolve(import.meta.dirname,'..');
const arg=(name,fallback)=>process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=')[1]??fallback;
const date=arg('date'),stage=arg('stage','data');
if(!/^\d{8}$/.test(date||''))throw new Error('USAGE: --date=YYYYMMDD');
const out=resolve(root,`config/votes/votes-${date}.json`),iso=`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}`;
const sources=JSON.parse(readFileSync(resolve(root,'config/votes/sources.json'),'utf8'));
const write=value=>{mkdirSync(resolve(root,'config/votes'),{recursive:true});writeFileSync(out+'.tmp',JSON.stringify(value,null,1));renameSync(out+'.tmp',out);console.log('written',out);};

// VoteInfo object types (vorlagenArtId). An unknown type is kept as its number rather than guessed.
const TYPES={1:'mandatory-referendum',2:'optional-referendum',3:'popular-initiative',4:'counter-proposal',5:'tie-breaker'};
// What a "Yes" meant in Parliament's final vote, read from the recorded meaning, never assumed from the button.
export function yesMeans(meaningYes){
 const m=String(meaningYes||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 if(/(recommand\w* de rejeter|empfehlung.{0,30}ablehnung|ablehnung der (volks)?initiative|raccomandazione di respingere)/.test(m))return 'recommend-rejection';
 if(/(recommand\w* d.accepter|empfehlung.{0,30}annahme|raccomandazione di accettare)/.test(m))return 'recommend-acceptance';
 return 'unclear';
}
const BUCKET={'Ja':'yes','Nein':'no','Enthaltung':'abstained'};
const bucket=d=>BUCKET[d]||(/Präsident/.test(d)?'presiding':/Entschuldigt/.test(d)?'excused':'didNotVote');

function dataStage(){
 const feed=JSON.parse(readFileSync(resolve(root,sources.feedFile.replace('{date}',date)),'utf8'));
 if(String(feed.abstimmtag)!==date)throw new Error('FEED_DATE_MISMATCH');
 const db=new DatabaseSync(resolve(root,'data/parliament.sqlite'),{readOnly:true});
 const get=(kind,id)=>{const r=db.prepare('SELECT payload FROM records WHERE kind=? AND id=?').get(kind,String(id));return r?JSON.parse(r.payload):null;};
 const objects=[];
 for(const v of feed.schweiz.vorlagen){
  const link=sources.objects[String(v.vorlagenId)];
  const title=Object.fromEntries((v.vorlagenTitel||[]).map(t=>[t.langKey,t.text]));
  const object={id:String(v.vorlagenId),type:TYPES[v.vorlagenArtId]||String(v.vorlagenArtId),title,doubleMajority:Boolean(v.doppeltesMehr),
   officialSource:{publisher:'Federal Statistical Office / Federal Chancellery (VoteInfo open data)',url:sources.feedUrl.replace('{date}',date)},
   businessId:link?.businessId||null,review:{status:'pending',reviewer:null,reviewedAt:null,checklist:null},brief:null,prepared:[]};
  if(link){
   const business=get('business',link.businessId);
   Object.assign(object,{businessNumber:business?.number||null,businessTitle:business?.title||null,
    parliamentUrl:`https://www.parlament.ch/en/ratsbetrieb/suche-curia-vista/geschaeft?AffairId=${link.businessId}`});
   // Parliament's decision: the National Council's final vote only; procedural votes are not "what Parliament decided".
   const rows=db.prepare(`SELECT payload FROM records WHERE kind='voting' AND json_extract(payload,'$.businessId')=?`).all(link.businessId).map(r=>JSON.parse(r.payload));
   const finals=rows.filter(r=>/^(vote final|schlussabstimmung|votazione finale)$/i.test(String(r.subject).trim()));
   const voteId=[...new Set(finals.map(r=>r.voteId))].sort().at(-1);
   const final=finals.filter(r=>r.voteId===voteId);
   if(final.length){
    const counts={yes:0,no:0,abstained:0,didNotVote:0,excused:0,presiding:0},groups=new Map();
    for(const r of final){const b=bucket(r.decisionText);counts[b]++;const g=groups.get(r.group)||{code:r.group,members:new Set(),yes:0,no:0,abstained:0,didNotVote:0,excused:0,presiding:0};g[b]++;g.members.add(r.personId);groups.set(r.group,g);}
    // Group names come from the voters' own official records, not from a hand-written table.
    const nameOf=code=>{const counted=new Map();for(const r of final.filter(x=>x.group===code)){const p=get('person',r.personId);if(p?.group)counted.set(p.group,(counted.get(p.group)||0)+1);}return [...counted].sort((a,b)=>b[1]-a[1])[0]?.[0]||code;};
    object.decided={nationalCouncil:{voteId,date:final[0].date,subject:final[0].subject,billTitle:final[0].billTitle||null,meaningYes:final[0].meaningYes,meaningNo:final[0].meaningNo,
     yesMeans:yesMeans(final[0].meaningYes),counts,
     byGroup:[...groups.values()].map(({members,...g})=>({...g,name:nameOf(g.code)})).sort((a,b)=>b.yes+b.no-(a.yes+a.no)),
     source:'Official roll-call record (National Council)'},
     councilOfStates:{available:false,note:'Not in our roll-call data',url:object.parliamentUrl}};
   }else object.decided={nationalCouncil:null,councilOfStates:{available:false,note:'Not in our roll-call data',url:object.parliamentUrl}};
   object.passagesAvailable=db.prepare('SELECT count(*) n FROM speech_business_links WHERE business=?').get(link.businessId).n;
  }
  objects.push(object);
 }
 db.close();
 // Keep an existing brief and review when only the data is refreshed.
 const prior=existsSync(out)?JSON.parse(readFileSync(out,'utf8')):null;
 for(const o of objects){const p=prior?.objects?.find(x=>x.id===o.id);if(p){o.brief=p.brief;o.prepared=p.prepared;o.review=p.review;}}
 write({voteDate:iso,officialUrl:sources.dateUrl||null,generatedAt:new Date().toISOString(),objects});
}

if(stage==='data')dataStage();
else if(stage==='brief')(await import('./lib/vote-brief.mjs')).briefStage({root,out,date,write});
else if(stage==='prepared')await (await import('./lib/vote-prepared.mjs')).preparedStage({root,out,write});
else if(!['review','approve','prepared'].includes(stage))throw new Error('UNKNOWN_STAGE');

// Review document: every argument in all four languages beside its original quote, plus the checklist (spec §5).
if(stage==='review'){
 const data=JSON.parse(readFileSync(out,'utf8')),lines=[`# Vote Companion review · ${data.voteDate}`,'',
  'Tick each item per object, then approve with:','','`node scripts/generate-vote-briefs.mjs --date='+date+' --stage=approve --object=<id> --reviewer="<name>"`',''];
 for(const o of data.objects){const b=o.brief,nc=o.decided?.nationalCouncil;
  lines.push(`## ${o.id} · ${o.title.en}`,'',`Business ${o.businessNumber} · ${o.passagesAvailable} passages · ${b?.interventionsRead} interventions read · model ${b?.model} · generated ${b?.generatedAt}`,'');
  if(nc)lines.push(`**National Council final vote (${String(nc.date).slice(0,10)}):** yes ${nc.counts.yes} / no ${nc.counts.no} / abstained ${nc.counts.abstained}. Yes meant: “${nc.meaningYes}” → shown as *${nc.yesMeans}*.`,'');
  for(const side of ['for','against']){const c=b.coverage[side];lines.push(`### ${side==='for'?'For (accept the initiative)':'Against (reject the initiative)'} · coverage ${c.level} (${c.passages} checked claims, ${c.speakers} speakers)`,'');
   (b.languages.en[side]||[]).forEach((a,i)=>{const cit=b.citations[a.citationIds[0]];lines.push(`${i+1}. **${cit.speaker}** · ${cit.role}${cit.groupName?' · '+cit.groupName:''} · ${String(cit.date).slice(0,10)} · [record](${cit.officialUrl})`);
    for(const l of ['en','fr','de','it'])lines.push(`   - ${l.toUpperCase()}: ${b.languages[l][side][i].text}`);
    lines.push(`   - Original (${cit.language}): “${cit.quote.slice(0,700)}${cit.quote.length>700?'…':''}”`,'');});
   if(!b.languages.en[side].length)lines.push('_No argument shown; the page displays the coverage label._','');}
  // The "Instant" questions are public too: their answers are reviewed in the same pass.
  for(const p of o.prepared||[]){lines.push(`### Instant question · ${p.question.en}`,'');
   for(const l of ['en','fr','de','it']){const a=p.answers[l];if(!a){lines.push(`- ${l.toUpperCase()}: _not prepared; this chip runs live_`);continue;}
    const cites=(a.citations||[]).map(c=>`${c.speaker} (${String(c.date).slice(0,10)})`).join('; ');
    lines.push(`- ${l.toUpperCase()}: ${a.answer.lead.text}`,...(a.answer.sections||[]).flatMap(s=>[`  - *${s.title}*`,...s.paragraphs.map(x=>`    - ${x.text}`)]),`  - Sources: ${cites}`);}
   lines.push('');}
  lines.push('Checklist:','- [ ] Every quote says what its sentence says','- [ ] Same verbs and label format on both sides','- [ ] No judgement words, no numbers outside the vote record or a quote','- [ ] Coverage labels match the counts','- [ ] Nothing advises, predicts or says who is right','');
 }
 const file=resolve(root,`artifacts/vote-review-${date}.md`);mkdirSync(resolve(root,'artifacts'),{recursive:true});writeFileSync(file,lines.join('\n'));console.log('review document',file);
}
// Approval by a named reviewer, recorded with the brief (spec decision 11). Only approved briefs are served.
if(stage==='approve'){
 const data=JSON.parse(readFileSync(out,'utf8')),id=arg('object'),reviewer=arg('reviewer');
 const o=data.objects.find(x=>x.id===id);if(!o||!o.brief||!reviewer)throw new Error('USAGE: --object=<id with a brief> --reviewer="<name>"');
 o.review={status:'approved',reviewer,reviewedAt:new Date().toISOString(),briefGeneratedAt:o.brief.generatedAt,checklist:['quotes-match','same-verbs-and-labels','no-judgement-or-stray-numbers','coverage-labels-match','no-advice-or-prediction']};
 write(data);
}
