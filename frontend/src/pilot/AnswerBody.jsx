import React from 'react';
import {ArrowUpRight,ArrowClockwise,BookOpen,MagnifyingGlass} from '@phosphor-icons/react';
import PassageVideo from './PassageVideo.jsx';
import CleisthenesAnswer,{citationPassage,excerpt,FollowUps,ResearchSummary,ProfileCard,Understood,WebResearch} from './CleisthenesAnswer.jsx';

// Server reasons for a gap, by exact wording (EN → FR). Scope descriptions such as "Imported official passages
// only…" are not reasons and stay hidden: an empty answer is never padded with a generic coverage note.
const GAP_REASONS={
 'Open a matching topic dossier to ask within these ballot filters.':'Ouvrez le dossier thématique correspondant pour poser la question avec ces filtres de votation.',
 'No speech evidence imported for this selection.':'Aucune intervention importée pour cette sélection.',
 'Choose a politician or name them in full so the source can be identified.':'Choisissez une personne ou indiquez son nom complet pour que la source puisse être identifiée.',
 'This party’s background has not yet been reviewed and imported. A parliamentary speech is not a substitute.':'La présentation de ce parti n’a pas encore été vérifiée ni importée. Une intervention parlementaire ne la remplace pas.',
 'Use the profile’s voting history to filter dated roll calls and inspect what yes and no meant. No aggregate stance is inferred.':'Utilisez l’historique des votes du profil pour filtrer les scrutins datés et voir ce que signifiaient oui et non. Aucune position globale n’est déduite.',
 'This type of official profile evidence has not been imported yet. Load the profile’s official records.':'Ce type de donnée officielle du profil n’a pas encore été importé. Chargez les données officielles du profil.',
};
function gapReason(a,t){
 const server=[a.notice,a.coverage].find(x=>x&&GAP_REASONS[x]);
 if(server)return t(server,GAP_REASONS[server]);
 // Drafted statements the source check removed are the most common reason for a gap; say so plainly.
 const n=a.withheldClaims;
 return n?t(`${n} drafted statement${n===1?' was':'s were'} withheld because the sources did not fully support ${n===1?'it':'them'}.`,`${n} affirmation${n===1?' rédigée a été retirée':'s rédigées ont été retirées'} car les sources ne ${n===1?'la':'les'} soutenaient pas entièrement.`):null;
}

// Not enough evidence: why, what was read, and where to go next, instead of a dead end.
function EvidenceGap({answer,t,disabled,onSource,onFollowUp,onEditFollowUp,onLiteral,onWholeRecord}){
 const reason=gapReason(answer,t),read=(answer.passages||[]).slice(0,3);
 return <div className="cleisthenes-answer source-fallback">
  <Understood answer={answer} t={t} onLiteral={onLiteral} disabled={disabled}/>
  <p>{t('I don’t have enough imported evidence for this question in this selection.','Je n’ai pas assez de sources importées pour cette question.')} {reason||t('Try a new topic or another source.','Essayez un autre sujet ou une autre source.')}</p>
  {read.length>0&&<><p className="answer-understood">{t('Passages read, which did not support a checked answer:','Extraits lus, insuffisants pour une réponse vérifiée :')}</p>{read.map((s,j)=><button key={s.id||j} type="button" className="chat-citation" onClick={()=>onSource({source:s,quote:s.text})}><BookOpen size={14}/><span>{s.speaker||t('Official source','Source officielle')}<small>{s.date?.slice(0,10)} · “{excerpt(s.text,160)}”</small></span><ArrowUpRight size={14}/></button>)}</>}
  {onWholeRecord&&<div className="answer-profile-actions"><button type="button" className="cta" disabled={disabled} onClick={onWholeRecord}><MagnifyingGlass size={13}/> {t('Search the whole record','Chercher dans toutes les archives')}</button></div>}
  {answer.suggestedFollowUps?.length>0&&<FollowUps questions={answer.suggestedFollowUps} onAsk={onFollowUp} onEdit={onEditFollowUp} disabled={disabled} t={t}/>}
 </div>;
}

// One assistant answer, by state. Actions go back through the chat's own send / follow-up handlers.
export default function AnswerBody({answer:a,language,t,disabled,onSource,onSend,onFollowUp,onEditFollowUp,onLiteral,onRetry,onWholeRecord}){
 let body;
 if(a.mode==='catalog-search')body=<div><p>{a.total} matching imported records. Your filters are preserved.</p>{a.records.map(r=><p key={r.type+r.id}><a href={r.href} onClick={e=>{e.preventDefault();window.dispatchEvent(new CustomEvent('civic-navigate',{detail:r.href}));}}>{r.title} ↗</a><small> · {r.type} · {r.date}</small></p>)}<small>{a.coverage}</small></div>;
 else if(a.answer?.lead)body=<CleisthenesAnswer answer={a} language={language} disabled={disabled} onCite={c=>onSource({source:citationPassage(a,c),quote:c.quote})} onFollowUp={onFollowUp} onEditFollowUp={onEditFollowUp} onLiteral={onLiteral}/>;
 else if(a.claims?.length)body=a.claims.slice(0,3).map((c,j)=>{const s=a.passages?.find(p=>p.evidenceId===c.evidenceId||'parl-'+p.id===c.evidenceId);return <div className="cleisthenes-point" key={j}><p>{c.text}</p>{s&&<button className="chat-citation" onClick={()=>onSource({source:s,quote:c.quote})}><BookOpen size={14}/><span>{s.speaker||t('Source','Source')}<small>{s.date?.slice(0,10)}{s.video?.url?t(' · video extract',' · extrait vidéo'):t(' · read context',' · lire le contexte')}</small></span><ArrowUpRight size={14}/></button>}{s?.transcriptId&&<PassageVideo source={s} language={language}/>}</div>;});
 // The server no longer caches degraded answers, so asking again can still produce the full answer.
 else if(a.status==='sources-only')body=<div className="source-fallback"><p>{t('I found relevant official passages, but the AI answer could not be safely completed. You can still inspect the sources.','J’ai trouvé des extraits officiels pertinents, mais la réponse IA n’a pas pu être finalisée de manière sûre. Vous pouvez consulter les sources.')}</p>{a.passages?.map((s,j)=><button key={s.id||j} className="chat-citation" onClick={()=>onSource({source:s,quote:s.text})}><BookOpen size={14}/><span>{s.speaker||t('Official source','Source officielle')}<small>{s.date?.slice(0,10)} · {t('read passage','lire l’extrait')}</small></span><ArrowUpRight size={14}/></button>)}{onRetry&&<div className="answer-profile-actions"><button type="button" className="cta" disabled={disabled} onClick={onRetry}><ArrowClockwise size={13}/> {t('Try the answer again','Réessayer la réponse')}</button></div>}</div>;
 else if(a.status==='open-vote-history'&&a.profile)body=<div className="cleisthenes-answer"><p>{t('Votes are best read one by one: each roll call shows what yes and no meant. Cleisthenes does not summarise a career into a stance.','Les votes se lisent un par un : chaque scrutin indique ce que signifiaient oui et non. Cleisthenes ne résume pas une carrière en une position.')}</p><ProfileCard profile={a.profile} t={t}/></div>;
 else if(a.status==='upcoming')body=<div className="answer-upcoming"><p><strong>{t('This has not happened yet.','Cela n’a pas encore eu lieu.')}</strong> {t(`${a.upcoming?.title||'This session'} runs from ${a.upcoming?.from} to ${a.upcoming?.to}. There are no debates to cite until it takes place; the detailed programme is published on parlament.ch shortly before.`,`${a.upcoming?.title||'Cette session'} a lieu du ${a.upcoming?.from} au ${a.upcoming?.to}. Il n’y a pas encore de débats à citer ; le programme détaillé paraît sur parlament.ch peu avant.`)}</p><a href="https://www.parlament.ch/en/ratsbetrieb/sessions/schedule" target="_blank" rel="noreferrer">{t('Official session schedule ↗','Calendrier officiel des sessions ↗')}</a></div>;
 else if(a.status==='refused')body=<div className="answer-refusal"><p>{t('I don’t tell anyone how to vote or predict results — that decision is yours. What I can do is show you what each side argued in Parliament, with the original sources.','Je ne dis à personne comment voter et je ne prédis pas de résultats : cette décision vous appartient. Je peux en revanche vous montrer ce que chaque camp a défendu au Parlement, sources à l’appui.')}</p>{a.suggestedFollowUps?.map(q=><button key={q} type="button" disabled={disabled} onClick={()=>onSend(q)}>{q}<ArrowUpRight size={13}/></button>)}</div>;
 else if(a.status==='provider-unavailable')body=<p>{t('The answer service is unavailable. You can still browse the original texts.','Le service de réponse est indisponible. Les textes originaux restent accessibles.')}</p>;
 else body=<EvidenceGap answer={a} t={t} disabled={disabled} onSource={onSource} onFollowUp={onFollowUp} onEditFollowUp={onEditFollowUp} onLiteral={onLiteral} onWholeRecord={onWholeRecord}/>;
 return <>
  {a.mode==='recorded-replay'&&<small>{t('Recorded demo','Démo enregistrée')}</small>}
  {a.mode==='prepared'&&<small>{t('Prepared answer','Réponse préparée')}</small>}
  {body}
  {!a.answer&&a.web&&<WebResearch web={a.web} t={t} intro={a.status==='upcoming'?t('What is known so far, from the web:','Ce que l’on sait déjà, selon le web :'):t('The imported parliamentary record does not cover this, so Cleisthenes searched the web:','Les archives parlementaires importées ne couvrent pas cette question ; Cleisthenes a cherché sur le web :')}/>}
  {!a.answer&&a.researchSummary&&['insufficient-evidence','sources-only'].includes(a.status)&&<ResearchSummary summary={a.researchSummary} t={t}/>}
 </>;
}
