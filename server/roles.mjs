// Official Bulletin role codes (SpeakerFunction, e.g. "Mit-F", "BR-M"), decoded once for every stage: claim
// extraction, review, synthesis and citations. The -M/-F suffix is the recorded gender. Mirrored for readers in
// frontend/src/pilot/roles.js.
const fold=v=>String(v||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
const ROLES={Mit:'Member of the council',BR:'Federal Councillor',BPR:'President of the Swiss Confederation',VPBR:'Vice-President of the Federal Council',P:'President of the chamber','1VP':'First Vice-President of the chamber','2VP':'Second Vice-President of the chamber',BK:'Federal Chancellor'};
// Only members of the Federal Council speak for it in a debate (the Chancellor heads its staff but is not a member).
const FEDERAL_COUNCIL=new Set(['BR','BPR','VPBR']);
const base=code=>String(code||'').trim().replace(/-[MF]$/i,'');
export const roleGender=code=>String(code||'').trim().match(/-([MF])$/i)?.[1].toLowerCase()||null;
export const federalCouncilRole=code=>FEDERAL_COUNCIL.has(base(code));
// Bulletin council names arrive in any national language or as NR/SR.
const chamber=council=>{const c=fold(council).trim();return /national|nazionale|^nr$/.test(c)?'National Council':/etats|stande|stati|^sr$/.test(c)?'Council of States':/bundesversammlung|assemblee federale|assemblea federale|federal assembly/.test(c)?'Federal Assembly':null;};
export function speakerRole(code,council){
 const role=ROLES[base(code)];if(!role)return code||null;
 if(role!==ROLES.Mit)return role;
 const house=chamber(council);
 return house==='National Council'?'National Councillor':house?`Member of the ${house}`:council?`Member of the ${council}`:role;
}
