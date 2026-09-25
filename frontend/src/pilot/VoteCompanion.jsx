// Vote Companion (docs/VOTE-COMPANION-SPEC.md): S0 index, S1 header, S2 Understand, S3 Ask, S4 held.
// Public pages: they read only /api/votes and never call a route that needs an account, except the reader's own
// free question, which goes to the Cleisthenes chat once they are signed in and verified.
import React,{useCallback,useEffect,useId,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,BookOpen,Copy,EnvelopeSimple,Info,Lightning,Play,X} from '@phosphor-icons/react';
import {pilotApi as api} from '../services/pilotApi.js';
import {askCleisthenes,openVotes} from './navigation.js';
import CleisthenesAnswer from './CleisthenesAnswer.jsx';
import {vt,localTitle,typeLabel,objectNoun,formatDate,decisionSummary,decisionColumns,orderGroups,recordLanguage,coverageNote,briefLanguage,preparedFor,clock,citationText,chamberLabel,reportMailto,splitVoteDates} from './vote-companion.mjs';
import './votes.css';

const ADMIN_VOTES='https://www.admin.ch/gov/en/start/documentation/votes.html';
const titleLanguage=(title,language)=>title?.[language]?language:title?.en?'en':'de';
const STEPS=['understand','ask','stand'];

export default function VoteCompanion({voteId,language,user,gated,onAccount}){
 return voteId?<VotePage key={voteId} id={voteId} language={language} user={user} gated={gated} onAccount={onAccount}/>:<VotesIndex language={language}/>;
}

// "Pilot · not an official ballot": always visible; the explanation opens in place.
function PilotChip({language}){
 const [open,setOpen]=useState(false),id=useId();
 return <div className="vote-pilot"><button type="button" className="vote-pilot-chip" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)}><Info size={15} aria-hidden="true"/>{vt(language,'pilot.chip')}</button>{open&&<p id={id} className="vote-pilot-explain">{vt(language,'pilot.explain')}</p>}</div>;
}

// A modal sheet (bottom sheet on phones) built on <dialog>: focus stays inside, Escape and the backdrop close it,
// and focus returns to whatever opened it. Every way out goes through the parent's state and the dialog follows
// it, so nothing depends on the asynchronous native "close" event.
function Sheet({open,onClose,labelledBy,children}){
 const ref=useRef(null),returnTo=useRef(null);
 useEffect(()=>{const d=ref.current;if(!d)return;
  if(open){if(!d.open){returnTo.current=document.activeElement;d.showModal();}return;}
  if(d.open)d.close();const back=returnTo.current;returnTo.current=null;back?.focus?.();},[open]);
 return <dialog ref={ref} className="vote-sheet" aria-labelledby={labelledBy} onCancel={e=>{e.preventDefault();onClose();}} onClose={()=>{if(open)onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}>{open&&<div className="vote-sheet-body">{children}</div>}</dialog>;
}

// S0: the next vote date with one card per object; later dates follow; past dates stay collapsed.
function VotesIndex({language}){
 const t=(k,v)=>vt(language,k,v);
 const [state,setState]=useState({status:'loading'});
 const load=useCallback(()=>{let live=true;setState({status:'loading'});api.votes().then(data=>live&&setState({status:'ready',data})).catch(()=>live&&setState({status:'error'}));return()=>{live=false;};},[]);
 useEffect(load,[load]);
 useEffect(()=>{const timer=setTimeout(()=>{document.title=`${t('i.h')} — Cleisthenes`;});return()=>{clearTimeout(timer);document.title='Cleisthenes — Swiss civic companion';};},[language]);
 const {next,later,past}=splitVoteDates(state.data?.dates);
 return <section className="vote-index" aria-labelledby="vote-index-h">
  <p className="eyebrow">Cleisthenes · {t('nav.votes')}</p>
  <h1 id="vote-index-h">{t('i.h')}</h1>
  <p className="vote-lead">{t('i.lead')}</p>
  <PilotChip language={language}/>
  {state.status==='loading'&&<div className="vote-loading" role="status"><span className="vote-skeleton"/><span className="vote-skeleton short"/><span className="sr-only">{t('i.loading')}</span></div>}
  {state.status==='error'&&<div className="vote-alert" role="alert"><p>{t('i.error')}</p><button type="button" className="vote-secondary" onClick={load}>{t('retry')}</button></div>}
  {state.status==='ready'&&!next&&<div className="vote-empty"><p>{t('i.none')}</p><a href={past[0]?.officialUrl||ADMIN_VOTES} target="_blank" rel="noreferrer">{t('i.none.link')} <ArrowUpRight size={14}/></a></div>}
  {next&&<VoteDate date={next} language={language} headingLevel={2}/>}
  {later.map(d=><VoteDate key={d.date} date={d} language={language} headingLevel={2}/>)}
  {past.length>0&&<details className="vote-past"><summary>{t('i.past')} · {past.length}</summary>{past.map(d=><VoteDate key={d.date} date={d} language={language} headingLevel={3}/>)}</details>}
 </section>;
}
function VoteDate({date,language,headingLevel}){
 const t=(k,v)=>vt(language,k,v),H=headingLevel===2?'h2':'h3';
 return <section className="vote-date">
  <div className="vote-date-head"><H>{t('i.date',{date:formatDate(date.date,language)})}</H>{date.officialUrl&&<a href={date.officialUrl} target="_blank" rel="noreferrer">{t('i.official')} <ArrowUpRight size={14}/></a>}</div>
  <ul className="vote-cards">
   {date.objects.map(o=><li key={o.id}><a className="vote-card" href={'?view=votes&vote='+encodeURIComponent(o.id)} onClick={e=>{e.preventDefault();openVotes(o.id);}}>
    <span className="vote-card-type">{typeLabel(o.type,language)}{o.businessNumber?` · ${o.businessNumber}`:''}</span>
    <strong lang={titleLanguage(o.title,language)}>{localTitle(o.title,language)}</strong>
    <small>{o.briefUpdated?t('freshness',{date:formatDate(o.briefUpdated,language)}):t('freshness.none')}</small>
    <span className="vote-card-cta">{t('i.open')} <ArrowRight size={15}/></span></a></li>)}
   {(date.inPreparation||[]).map(o=><li key={o.id}><div className="vote-card is-prep">
    <span className="vote-card-type">{t('i.prep')}</span>
    <strong lang={titleLanguage(o.title,language)}>{localTitle(o.title,language)}</strong>
    <small>{t('i.prep.body')}</small></div></li>)}
  </ul>
 </section>;
}

// The card on Home and on the landing page that leads to the next vote date; nothing when no date is listed.
export function NextVoteCard({language,variant='home'}){
 const [next,setNext]=useState(null),t=(k,v)=>vt(language,k,v);
 useEffect(()=>{let live=true;api.votes().then(d=>{if(live)setNext(splitVoteDates(d.dates).next);}).catch(()=>{});return()=>{live=false;};},[]);
 if(!next)return null;
 const count=(next.objects?.length||0)+(next.inPreparation?.length||0);
 return <a className={`next-vote-card ${variant}`} href="?view=votes" onClick={e=>{e.preventDefault();openVotes();}}>
  <span className="next-vote-eyebrow">{t('card.eyebrow')} · {t('pilot.chip')}</span>
  <strong>{t('card.title',{date:formatDate(next.date,language)})}</strong>
  <span className="next-vote-body">{t('card.body',{n:count})}</span>
  <span className="next-vote-cta">{t('card.cta')} <ArrowRight size={16}/></span>
 </a>;
}

function VotePage({id,language,user,gated,onAccount}){
 const t=(k,v)=>vt(language,k,v);
 const [state,setState]=useState({status:'loading'}),[citation,setCitation]=useState(null);
 const load=useCallback(()=>{let live=true;setState({status:'loading'});api.vote(id).then(o=>live&&setState({status:'ready',o})).catch(e=>live&&setState({status:e.status===404?'missing':'error'}));return()=>{live=false;};},[id]);
 useEffect(load,[load]);
 const o=state.o;
 const title=o?localTitle(o.title,language):'';
 // After the shell's own title update (it runs later in the same commit), and back to the app title on leaving.
 useEffect(()=>{if(!title)return;const timer=setTimeout(()=>{document.title=`${o.businessNumber?o.businessNumber+' · ':''}${title} — Cleisthenes`;});return()=>{clearTimeout(timer);document.title='Cleisthenes — Swiss civic companion';};},[title]);
 // Citation numbers run through the brief in reading order: For, then Against.
 const brief=o?.brief||null,sides=briefLanguage(brief,language);
 const numbers=useMemo(()=>{const map=new Map();for(const side of ['for','against'])for(const a of sides?.sides?.[side]||[])for(const cid of a.citationIds||[])if(!map.has(cid)&&brief?.citations?.[cid])map.set(cid,map.size+1);return map;},[brief,sides?.code]);
 const openCitation=useCallback(cid=>{const c=brief?.citations?.[cid];if(c)setCitation({...c,id:cid,n:numbers.get(cid)});},[brief,numbers]);
 // Each step and each citation has its own link; honour it once the page has content.
 useEffect(()=>{if(state.status!=='ready')return;const hash=decodeURIComponent(location.hash.slice(1));if(!hash)return;
  if(hash.startsWith('citation-'))openCitation(hash.slice(9));else requestAnimationFrame(()=>document.getElementById(hash)?.scrollIntoView());},[state.status]);
 const back=<a className="back-button vote-back" href="?view=votes" onClick={e=>{e.preventDefault();openVotes();}}><ArrowLeft size={15}/>{t('back.index')}</a>;
 if(state.status==='loading')return <article className="vote-page">{back}<div className="vote-loading" role="status"><span className="vote-skeleton tall"/><span className="vote-skeleton"/><span className="vote-skeleton short"/><span className="sr-only">…</span></div></article>;
 if(state.status==='missing')return <article className="vote-page">{back}<PilotChip language={language}/><div className="vote-empty"><p>{t('u.notfound')}</p></div></article>;
 if(state.status==='error')return <article className="vote-page">{back}<PilotChip language={language}/><div className="vote-alert" role="alert"><p>{t('u.error')}</p><button type="button" className="vote-secondary" onClick={load}>{t('retry')}</button></div></article>;
 const pageUrl=location.origin+location.pathname+'?view=votes&vote='+encodeURIComponent(o.id);
 return <article className="vote-page" aria-labelledby="vote-title">
  {back}
  <VoteHeader o={o} language={language}/>
  {o.review?.status!=='approved'&&<p className="vote-draft" role="note">{t('draft')}</p>}
  <section id="understand" className="vote-step" aria-labelledby="understand-h">
   <h2 id="understand-h" className="vote-step-h"><span className="vote-step-n" aria-hidden="true">1</span>{t('step.1')}</h2>
   <VotingOn o={o} language={language}/>
   <Decided o={o} language={language}/>
   <Arguments o={o} language={language} sides={sides} numbers={numbers} onCite={openCitation}/>
   <HowMade o={o} language={language}/>
   <p className="vote-report"><a href={reportMailto({objectId:o.id,businessNumber:o.businessNumber})}><EnvelopeSimple size={16} aria-hidden="true"/>{t('u.report')}</a><small>{t('u.report.note')}</small></p>
  </section>
  <Ask o={o} title={title} language={language} user={user} gated={gated} onAccount={onAccount} onCite={setCitation}/>
  <section id="stand" className="vote-step vote-stand" aria-labelledby="stand-h">
   <h2 id="stand-h" className="vote-step-h"><span className="vote-step-n" aria-hidden="true">3</span>{t('s.h')}</h2>
   <p>{t('s.explain.1')}</p>
   <p className="vote-hold" role="note">{t('s.pp.network')}</p>
  </section>
  <CitationSheet citation={citation} o={o} language={language} pageUrl={pageUrl} onClose={()=>setCitation(null)}/>
 </article>;
}

// S1: official title, date, type, the pilot chip, the step rail and the freshness line.
function VoteHeader({o,language}){
 const t=(k,v)=>vt(language,k,v);
 const [current,setCurrent]=useState('understand');
 useEffect(()=>{if(typeof IntersectionObserver==='undefined')return;const seen=new Map();
  const observer=new IntersectionObserver(entries=>{for(const e of entries)seen.set(e.target.id,e.isIntersecting);const first=STEPS.find(s=>seen.get(s));if(first)setCurrent(first);},{rootMargin:'-35% 0px -60% 0px'});
  STEPS.forEach(s=>{const el=document.getElementById(s);if(el)observer.observe(el);});return()=>observer.disconnect();},[]);
 return <header className="vote-header">
  <p className="vote-meta"><span>{typeLabel(o.type,language)}</span><span>{t('meta.vote',{date:formatDate(o.voteDate,language)})}</span>{o.businessNumber&&<span>{t('meta.business',{number:o.businessNumber})}</span>}</p>
  {o.doubleMajority&&<p className="vote-double">{t('meta.double')}</p>}
  <h1 id="vote-title" lang={titleLanguage(o.title,language)}>{localTitle(o.title,language)}</h1>
  <PilotChip language={language}/>
  <nav className="vote-rail" aria-label={t('steps.label')}><ol>{STEPS.map((s,i)=><li key={s}><a href={'#'+s} aria-current={current===s?'step':undefined} onClick={()=>setCurrent(s)}><span className="vote-rail-n" aria-hidden="true">{i+1}</span><span>{t('step.'+(i+1))}{i===2&&<small>{t('step.3.hold')}</small>}</span></a></li>)}</ol></nav>
  <p className="vote-fresh">{o.brief?.generatedAt?t('freshness',{date:formatDate(o.brief.generatedAt,language)}):t('freshness.none')}</p>
 </header>;
}

// "What you're voting on": the official title quoted verbatim, linked to its publisher. Never an AI sentence.
function VotingOn({o,language}){
 const t=(k,v)=>vt(language,k,v);
 return <section className="vote-block" aria-labelledby="voting-on-h">
  <h3 id="voting-on-h">{t('u.question.h')}</h3>
  <figure className="vote-official"><blockquote lang={titleLanguage(o.title,language)}>{localTitle(o.title,language)}</blockquote>
   <figcaption>{o.officialSource?.url?<a href={o.officialSource.url} target="_blank" rel="noreferrer">{t('u.title.src',{publisher:o.officialSource.publisher})} <ArrowUpRight size={14}/></a>:t('u.title.src',{publisher:o.officialSource?.publisher||''})}</figcaption></figure>
  <p className="vote-note">{t('u.question.note')}{o.dateOfficialUrl&&<> <a href={o.dateOfficialUrl} target="_blank" rel="noreferrer">{t('u.date.src',{date:formatDate(o.voteDate,language)})} <ArrowUpRight size={13}/></a></>}</p>
 </section>;
}

// "What Parliament decided": chamber rows and the party-group table, mapped to the recorded meaning (spec 8.2).
function Decided({o,language}){
 const t=(k,v)=>vt(language,k,v);
 const nc=o.decided?.nationalCouncil,cs=o.decided?.councilOfStates,summary=decisionSummary(nc,o.type,language),columns=nc?decisionColumns(nc,language):[],recorded=recordLanguage(nc?.subject);
 return <section className="vote-block" aria-labelledby="decided-h">
  <h3 id="decided-h">{t('u.decided.h')}</h3>
  <div className="vote-chambers">
   <div className="vote-chamber"><h4>{t('u.decided.nc')}</h4>
    {summary?<>
     <p className="vote-chamber-date">{t('u.decided.final',{date:formatDate(nc.date,language)})}</p>
     <ul className="vote-counts">{summary.main.map(s=><li key={s}>{s}</li>)}</ul>
     {summary.extra.length>0&&<p className="vote-counts-extra">{summary.extra.join(' · ')}</p>}
     <div className="vote-meaning"><p>{t('u.decided.meaning')}</p><dl><dt>{t('u.decided.meaning.yes')}</dt><dd lang={recorded}>«{nc.meaningYes||'—'}»</dd><dt>{t('u.decided.meaning.no')}</dt><dd lang={recorded}>«{nc.meaningNo||'—'}»</dd></dl></div>
     {nc.byGroup?.length>0&&<details className="vote-groups"><summary>{t('u.decided.byParty')} · {t('u.decided.nc')}</summary>
      <div className="vote-table-wrap" tabIndex={0} role="region" aria-label={`${t('u.decided.byParty')} · ${t('u.decided.nc')}`}><table><thead><tr><th scope="col">{t('u.decided.group')}</th>{columns.map(c=><th scope="col" key={c.key} title={c.label}>{c.label}</th>)}</tr></thead>
       <tbody>{orderGroups(nc.byGroup).map(g=><tr key={g.code}><th scope="row" lang={recorded}>{g.name||g.code}<small>{g.code}</small></th>{columns.map(c=><td key={c.key}>{g[c.key]??0}</td>)}</tr>)}</tbody></table></div>
      <p className="vote-note">{t('u.decided.order')}</p></details>}
    </>:<p>{t('u.decided.none')}{o.parliamentUrl&&<> <a href={o.parliamentUrl} target="_blank" rel="noreferrer">parlament.ch <ArrowUpRight size={13}/></a></>}</p>}
   </div>
   <div className="vote-chamber"><h4>{t('u.decided.cs')}</h4><p>{t('u.decided.missing')}</p>{cs?.url&&<a href={cs.url} target="_blank" rel="noreferrer">{t('u.decided.cs.link')} <ArrowUpRight size={13}/></a>}</div>
  </div>
 </section>;
}

// "Arguments made in Parliament": For, then Against, the same style on both sides, a coverage label above a side.
function Arguments({o,language,sides,numbers,onCite}){
 const t=(k,v)=>vt(language,k,v),brief=o.brief,noun=objectNoun(o.type,language);
 return <section className="vote-block" aria-labelledby="args-h">
  <h3 id="args-h">{t('u.args.h')}</h3>
  {!brief||!sides?<div className="vote-prep"><strong>{t('u.args.prep')}</strong><p>{t('u.args.prep.body')}</p></div>:<>
   <p className="vote-note">{t('u.args.note')}</p>
   <div className="vote-sides">{['for','against'].map(side=>{const items=sides.sides?.[side]||[],note=coverageNote(brief.coverage?.[side]||(items.length?null:{level:'silent'}),language);
    return <div className="vote-side" key={side}><h4><span>{t('u.args.'+side)}</span><small>{t('u.args.side.'+side,{noun})}</small></h4>
     {note&&<p className="vote-cover">{note}</p>}
     {items.length>0&&<ul className="vote-args" lang={sides.code}>{items.map((a,i)=><li key={i}>{a.text}{(a.citationIds||[]).filter(cid=>brief.citations?.[cid]).map(cid=>{const c=brief.citations[cid],n=numbers.get(cid);
      return <button type="button" key={cid} className="vote-cite" aria-label={t('u.cite.label',{n,speaker:c.speaker||'',date:formatDate(c.date,language)})} onClick={()=>onCite(cid)}>{n}</button>;})}</li>)}</ul>}
    </div>;})}</div>
  </>}
 </section>;
}

// "How this brief was made": the rule, the model, the date, what was read, and the neutrality rules in short.
function HowMade({o,language}){
 const t=(k,v)=>vt(language,k,v),brief=o.brief,review=o.review;
 return <details className="vote-how"><summary><h3>{t('u.how.h')}</h3></summary><div className="vote-how-body">
  <p className="vote-how-rule">{t('u.how.rule')}</p>
  {!brief&&<p>{t('u.how.nobrief')}</p>}
  <dl>
   {brief?.model&&<><dt>{t('u.how.model')}</dt><dd>{brief.model}</dd></>}
   {brief?.generatedAt&&<><dt>{t('u.how.generated')}</dt><dd>{formatDate(brief.generatedAt,language)}</dd></>}
   {brief&&<><dt>{t('u.how.passages')}</dt><dd>{Number(brief.passagesConsidered??0).toLocaleString(language==='en'?'en-GB':language+'-CH')}</dd></>}
   {o.businessNumber&&<><dt>{t('u.how.business')}</dt><dd>{o.parliamentUrl?<a href={o.parliamentUrl} target="_blank" rel="noreferrer">{o.businessNumber} <ArrowUpRight size={13}/></a>:o.businessNumber}{o.businessTitle&&<small lang="fr">{o.businessTitle}</small>}</dd></>}
   <dt>{t('u.how.review')}</dt><dd>{review?.status==='approved'?t('u.how.reviewed',{reviewer:review.reviewer||'—',date:formatDate(review.reviewedAt,language)}):t('u.how.pending')}</dd>
  </dl>
  <h4>{t('u.how.rules')}</h4>
  <ul>{['u.how.r1','u.how.r2','u.how.r3','u.how.r4','u.how.r5','u.how.r6'].map(k=><li key={k}>{t(k,{noun:objectNoun(o.type,language)})}</li>)}</ul>
 </div></details>;
}

// S3: "Instant" prepared answers render from the stored brief (no call, no sign-in); the reader's own question
// opens the Cleisthenes chat scoped to this object, for signed-in, verified readers.
function Ask({o,title,language,user,gated,onAccount,onCite}){
 const t=(k,v)=>vt(language,k,v);
 const [selected,setSelected]=useState(null),[draft,setDraft]=useState(''),[signin,setSignin]=useState(false),[notice,setNotice]=useState(''),[usage,setUsage]=useState(null);
 const field=useRef(null),signinTitle=useId();
 const prepared=(o.prepared||[]).map(p=>({key:p.key,...preparedFor(p,language)})).filter(p=>p.answer);
 const current=prepared.find(p=>p.key===selected);
 const verified=Boolean(user?.emailVerified),canAsk=!gated||verified;
 useEffect(()=>{let live=true;setUsage(null);if(user&&verified)api.usage().then(u=>live&&setUsage(u.questions?.day||null)).catch(()=>{});return()=>{live=false;};},[user?.id,verified]);
 const scope={kind:'business',id:o.businessId,title:`${o.businessNumber?o.businessNumber+' · ':''}${title}`};
 function ask(question){
  const q=String(question||'').trim();if(!q)return;
  if(!canAsk){if(!user){setDraft(q);setSignin(true);}else setNotice(t('a.verify'));return;}
  askCleisthenes(scope,{prompt:q,autoSend:true});setDraft('');setNotice(t('a.opened'));
 }
 const citeFromAnswer=(key,c)=>onCite({id:`${key}/${c.id}`,speaker:c.speaker,role:c.role,group:c.group,chamber:c.council,date:c.date,quote:c.quote,language:c.originalLanguage,officialUrl:c.officialUrl,video:c.video?.url?{url:c.video.url,start:c.video.start,end:c.video.end}:null});
 return <section id="ask" className="vote-step" aria-labelledby="ask-h">
  <h2 id="ask-h" className="vote-step-h"><span className="vote-step-n" aria-hidden="true">2</span>{t('a.h')}</h2>
  <p className="vote-scope"><BookOpen size={15} aria-hidden="true"/>{t('a.scope',{scope:scope.title})}</p>
  {prepared.length>0?<>
   <div className="vote-chips" role="group" aria-label={t('a.prepared.label')}>{prepared.map(p=><button type="button" key={p.key} aria-pressed={selected===p.key} onClick={()=>setSelected(s=>s===p.key?null:p.key)}><span className="vote-instant"><Lightning size={12} weight="fill" aria-hidden="true"/>{t('a.chip.instant')}</span>{p.question}</button>)}</div>
   <p className="vote-note">{t('a.prepared.note')}</p>
  </>:<p className="vote-note">{t('a.prepared.none')}</p>}
  {current&&<div className="vote-answer" aria-live="polite">
   <p className="vote-answer-q">{current.question}</p>
   {current.code!==language&&<p className="vote-note">{t('a.prepared.fallback',{language:current.code.toUpperCase()})}</p>}
   <CleisthenesAnswer answer={current.answer} language={language} translate={canAsk&&Boolean(user)||!gated} onCite={c=>citeFromAnswer(current.key,c)} onFollowUp={ask} onEditFollowUp={q=>{setDraft(q);field.current?.focus();}}/>
  </div>}
  <form className="vote-own" onSubmit={e=>{e.preventDefault();ask(draft);}}>
   <label htmlFor="vote-own-question">{t('a.own.h')}</label>
   <div className="vote-own-row"><textarea id="vote-own-question" ref={field} rows={2} maxLength={500} value={draft} placeholder={t('a.placeholder')} onChange={e=>{setDraft(e.target.value);setNotice('');}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(draft);}}}/><button type="submit" className="vote-primary" disabled={!draft.trim()}>{t('a.send')}</button></div>
   {usage?.limit>0&&<p className="vote-note">{t('a.remaining',{n:Math.max(0,usage.limit-usage.used),limit:usage.limit})}</p>}
   {notice&&<p className="vote-notice" role="status">{notice}</p>}
  </form>
  <p className="vote-note">{t('a.noadvice')}</p>
  <Sheet open={signin} onClose={()=>setSignin(false)} labelledBy={signinTitle}>
   <button type="button" className="vote-sheet-close" aria-label={t('close')} onClick={()=>setSignin(false)}><X size={18}/></button>
   <h2 id={signinTitle}>{t('a.signin.title')}</h2>
   <p>{t('a.signin.body')}</p>
   <div className="vote-sheet-actions"><button type="button" className="vote-primary" onClick={()=>{setSignin(false);onAccount?.();}}>{t('a.signin.cta')}</button><button type="button" className="vote-secondary" onClick={()=>setSignin(false)}>{t('a.signin.later')}</button></div>
  </Sheet>
 </section>;
}

// The citation sheet: the quote in its original language, who said it, where and when, the official record, the
// auto-aligned video moment when there is one, Copy and Report.
function CitationSheet({citation:c,o,language,pageUrl,onClose}){
 const t=(k,v)=>vt(language,k,v),titleId=useId();
 const [copied,setCopied]=useState(''),[watch,setWatch]=useState(false),player=useRef(null);
 useEffect(()=>{setCopied('');setWatch(false);},[c?.id]);
 const video=c?.video?.url&&Number.isFinite(c.video.start)?c.video:null,end=Number.isFinite(video?.end)&&video.end>video.start?video.end:null;
 // Brief citations have their own deep link; a prepared answer's citations point to the Ask step.
 const text=c?citationText(c,{language,pageUrl:`${pageUrl}#${String(c.id).includes('/')?'ask':'citation-'+encodeURIComponent(c.id)}`}):'';
 // Clipboard API first; where it is blocked (embedded views, older browsers) a selected text area inside the sheet;
 // failing both, the text is shown for the reader to select.
 async function copy(e){
  const button=e.currentTarget;
  try{await navigator.clipboard.writeText(text);setCopied('ok');return;}catch{}
  try{const area=document.createElement('textarea');area.value=text;area.readOnly=true;area.style.cssText='position:fixed;top:0;left:0;opacity:0';(button.closest('dialog')||document.body).appendChild(area);area.select();const ok=document.execCommand('copy');area.remove();button.focus();setCopied(ok?'ok':'fail');}catch{setCopied('fail');}
 }
 return <Sheet open={Boolean(c)} onClose={onClose} labelledBy={titleId}>{c&&<>
  <button type="button" className="vote-sheet-close" aria-label={t('close')} onClick={onClose}><X size={18}/></button>
  <p className="eyebrow">{c.n?t('u.cite.h',{n:c.n}):t('u.cite.h',{n:''}).trim()}</p>
  <h2 id={titleId}>{c.speaker||'—'}</h2>
  <figure className="vote-quote"><blockquote lang={c.language}>“{c.quote}”</blockquote>{c.language&&<figcaption>{t('u.cite.original',{language:String(c.language).toUpperCase()})}</figcaption>}</figure>
  <dl className="vote-cite-facts">
   {c.role&&<><dt>{t('u.cite.role')}</dt><dd>{c.role}</dd></>}
   {c.group&&<><dt>{t('u.cite.group')}</dt><dd>{c.group}</dd></>}
   {c.chamber&&<><dt>{t('u.cite.chamber')}</dt><dd>{chamberLabel(c.chamber,language)}</dd></>}
   {c.date&&<><dt>{t('u.cite.date')}</dt><dd>{formatDate(c.date,language)}</dd></>}
  </dl>
  {video&&<div className="vote-cite-video">
   <button type="button" className="vote-secondary" aria-expanded={watch} onClick={()=>setWatch(v=>!v)}><Play size={14} weight="fill" aria-hidden="true"/>{t('u.cite.watch',{start:clock(video.start),end:end?clock(end):'…'})}</button>
   <small>{t('u.cite.aligned')}</small>
   {watch&&<video ref={player} controls preload="metadata" src={`${video.url}#t=${video.start}${end?','+end:''}`} onLoadedMetadata={e=>{e.currentTarget.currentTime=video.start;e.currentTarget.play().catch(()=>{});}} onTimeUpdate={e=>{if(end&&e.currentTarget.currentTime>=end&&!e.currentTarget.paused)e.currentTarget.pause();}}/>}
  </div>}
  <div className="vote-sheet-actions">
   {c.officialUrl&&<a className="vote-primary" href={c.officialUrl} target="_blank" rel="noreferrer">{t('u.cite.open')} <ArrowUpRight size={15}/></a>}
   <button type="button" className="vote-secondary" onClick={copy}><Copy size={15} aria-hidden="true"/>{t('u.cite.copy')}</button>
   <a className="vote-secondary" href={reportMailto({objectId:o.id,citationId:c.id,businessNumber:o.businessNumber})}><EnvelopeSimple size={15} aria-hidden="true"/>{t('u.cite.report')}</a>
  </div>
  {copied&&<p className="vote-notice" role="status">{copied==='ok'?t('u.cite.copied'):t('u.cite.copyFail')}</p>}
  {copied==='fail'&&<textarea className="vote-copy-text" readOnly rows={5} value={text} onFocus={e=>e.currentTarget.select()}/>}
 </>}</Sheet>;
}
