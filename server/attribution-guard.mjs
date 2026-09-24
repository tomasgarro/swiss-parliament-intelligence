// A conservative veto, not a complete semantic-entailment evaluator.
import {federalCouncilRole} from './roles.mjs';
const fold=v=>String(v||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
// Reported motions must not become a claim that the reporting speaker authored them.
export function unsupportedProposalAttribution(claim,source){
 const q=fold(source),c=fold(claim);
 return /\b(motion|mozione|vorstoss|antrag|atto parlamentare)\b/.test(q)&&/\b(proposed|propose|proposes|propon|vorgeschlagen)\w*/.test(c)&&!/\b(je propose|nous proposons|propongo|proponiamo|ich beantrage|wir beantragen|ho presentato|j.ai depose)\b/.test(q);
}
// The Federal Council speaks in a debate only through its members. When a National Councillor says the Federal
// Council rejects an initiative, that is the councillor's account of the government; a claim opening "The Federal
// Council rejects…" (or "According to the Federal Council…") passes it off as the government's own statement.
// "Bundesrat" also titles a single Federal Councillor; for a non-member speaker that is the same slip.
const COUNCIL='(?:federal council|conseil federal|bundesrat(?:es|s)?|consiglio federale)(?![\\p{L}\'’])';
const COUNCIL_VOICE=new RegExp(`(?:^|[.;!?:]\\s*)(?:the |le |der |il )?${COUNCIL}|\\b(?:according to|in the (?:view|opinion) of|selon|d.apres|aux yeux d[ue]|laut|gemass|nach (?:ansicht|auffassung)|secondo|a parere d[ei]l?)\\s+(?:the |le |du |dem |des |den |il |del )?${COUNCIL}`,'u');
// …unless the claim itself says the speaker is reporting or quoting it.
const REPORTED=/\b(?:reports|reported|reporting|quotes|quoted|quoting|cites|cited|citing|recalls|recalled|recalling|refers to|referred to|referring to|paraphras\w*|according to (?:him|her|the speaker)|(?:he|she) (?:says|said|notes|noted|explains|explained)|rapporte|rapportant|cite|citant|rappelle|rappelant|se refere|selon (?:lui|elle)|dit-(?:il|elle)|zitiert|berichtet|verweist auf|erinnert daran|laut (?:ihm|ihr)|so (?:er|sie)|riferisce|riporta|cita|citando|ricorda|secondo (?:lui|lei))\b/;
export function unsupportedFederalCouncilAttribution(claim,speakerRoleCode){
 const c=fold(claim);
 return !federalCouncilRole(speakerRoleCode)&&COUNCIL_VOICE.test(c)&&!REPORTED.test(c);
}
