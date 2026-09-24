// Deterministic stance-attribution scorer for scripts/evaluate-stances.mjs. It reads an answer the way a reader
// would: which section title or sentence places each expected speaker for or against the proposal. Conservative
// by design: a mention it cannot place is "unclassified" (an optional judge may look at it), never a silent pass.
// Lives outside server/ so it never ships in the production image.

// NFD minus combining marks keeps one code unit per NFC letter, so folded offsets line up with the original text.
export const fold=s=>String(s??'').normalize('NFC').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[’‘`´]/g,"'");
const nfc=s=>String(s??'').normalize('NFC').replace(/[’‘`´]/g,"'");
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const B='(?<![\\p{L}\\p{N}])',E='(?![\\p{L}\\p{N}])';
const rx=(src,flags='u')=>new RegExp(src,flags);
const any=list=>`(?:${list.join('|')})`;

// Nouns that name the proposal itself. A token that only ends in one ("counter-proposal", "contre-projet") is not it.
const OBJ_WORDS='[\\p{L}-]*initiative[ns]?|iniziativ[ae]|proposals?|bills?|texte?s?|testo|law|loi|legge|gesetz(?:esvorlage)?|act|agreement|accord[io]?|[\\p{L}-]*abkommens?|treaty|traite|trattato|reform[ea]?|riforma|measure|mesure|misura|projet|progetto|proposition|proposta|vorlage|it';
const OBJ_TOKEN=rx(`^(?:[ld]')?(?:${OBJ_WORDS})$`);
const COUNTER='counter-?proposals?|counter-?projects?|contre-?projets?|gegenvorschl\\p{L}*|gegenentw\\p{L}*|gegenkonzept\\p{L}*|controprogett\\p{L}*|controproposta';
const NOUN=rx(`(${COUNTER})|(?<=^|[\\s'"«»“”„(\\[/])(${OBJ_WORDS})${E}`,'gu');

// Speech verbs that take a stance preposition ("argued against", "se sont prononcés contre", "sprachen sich gegen").
const SAY='(?:argue[sd]?|arguing|vote[sd]?|voting|campaign(?:s|ed|ing)?|plead(?:s|ed|ing)?|warn(?:s|ed|ing)?|spoke|speaks?|speaking|came out|comes? out|stood|stands?|standing)';
const DIRE="(?:se (?:sont |est )?prononc\\p{L}*|vot\\p{L}*|plaid\\p{L}*|s'engag\\p{L}*|milit\\p{L}*|s'exprim\\p{L}*)";
const SAGEN='(?:(?:sprech|sprach|sprich|aussprech|setz|stell|wehr|wand|wend|engagier)\\p{L}* sich|stimm\\p{L}*|votier\\p{L}*|kampf\\p{L}*|argumentier\\p{L}*|pladier\\p{L}*)';
const DIRE_IT='(?:si (?:sono |e |sia )?(?:espress\\p{L}*|schierat\\p{L}*|pronunciat\\p{L}*)|vot\\p{L}*|argoment\\p{L}*|intervenut\\p{L}*)';
// Stance cues per answer language (a synthesised answer is in one language, and "supporter" means "to bear" in French),
// written against folded text. verb: binds only when the proposal is its nearest noun; free: a stance on its own unless
// it points at a counter-proposal; group: a camp noun that binds the names listed with it.
const CUES={
 en:{for:{verb:["supports|supported|supporting|support(?=\\s+(?:the|this|that|it|its|an?)\\s)","backs|backed|backing","endors(?:e|es|ed|ing)","champion(?:s|ed|ing)?","defend(?:s|ed|ing)?","approv(?:e|es|ed|ing)","accept(?:s|ed|ing)?","adopt(?:s|ed|ing)?",
   // The verb joins the cue so a list of co-subjects in front of it still binds ("X, Y and Z argue for it").
   `${SAY} (?:for|in favou?r of)(?!\\s+(?:the\\s+)?federal council)`,"call(?:s|ed|ing)? for","yes to","recommend(?:s|ed|ing)? (?:accepting|acceptance|approval|approving|adopting|adoption|a yes)","urg(?:e|es|ed|ing) (?:acceptance|approval|adoption|a yes)"],
  free:["in favou?r","a yes vote"],group:["supporters?","proponents?","advocates?","backers?","initiators?"]},
 against:{verb:["oppos(?:e|es|ed|ing)","opposition to","reject(?:s|ed|ing)?","fought|fights?|fighting","combat(?:s|ed|ted|ing)?","refus(?:e|es|ed|ing)",`${SAY} against`,"against","no to","recommend(?:s|ed|ing)? (?:rejecting|rejection|a no)","urg(?:e|es|ed|ing) (?:rejection|rejecting|a no)"],
  free:["a no vote"],group:["opponents?","critics?","detractors?"]}},
 fr:{for:{verb:["soutien(?:t|nent|s|dra|drait|draient)(?!\\s+qu)","soutenu(?:e|s|es)?(?!\\s+qu)","souten(?:ir|ait|aient|ons|ez)(?!\\s+qu)","appui(?:e|ent|er)|appuy(?:er|ait|aient)","approuv(?:e|er|ent|ait|ee|es)","accept(?:e|es|ent|er|ait|aient|ee|ees)",
   "adopt(?:e|er|ent|ait|ee)","defend(?:s|u|ue|us|ues|ent|re|ait|aient)?",`${DIRE} (?:pour|en faveur)`,"oui a","recommand\\p{L}* (?:l'acceptation|l'adoption|le soutien|d'accepter|d'adopter|de soutenir)"],
  free:["en faveur","favorables?","y (?:sont|est|etaient|etait) favorables?","un oui","la soutien(?:t|nent)|l'a soutenue|l'ont soutenue"],group:["partisans?","defenseurs?","initiants?"]},
 against:{verb:["rejet(?:er|te|tent|tait|tons|ez|e|ee)","rejett\\p{L}*","le rejet|au rejet","refus(?:e|er|ent|ait|ee)|le refus","combat(?:s|tre|tu|tue|tent|tait|ons)?","s'oppos\\p{L}*","oppos(?:ee|es|ent|ait|er)",`${DIRE} contre`,"(?<!voix )contre(?![-\\p{L}])(?!\\s*\\d)","non a"],
  free:["defavorables?","un non(?!-)","s'y oppos\\p{L}*","la rejet(?:te|tent)|l'a rejetee|l'ont rejetee"],group:["opposants?","adversaires?","detracteurs?"]}},
 de:{for:{verb:["unterstutz(?:t|te|ten|en|e)?","befurwort(?:et|ete|eten|en)","zustimm(?:en|t|te)","genehmig(?:en|t|te)","anzunehmen|annehmen","ja zu[rm]?",`${SAGEN} fur`],
  free:["zur annahme","ein ja","befurwortend\\p{L}*|zustimmend\\p{L}*"],group:["befurworter(?:innen|in|n)?","unterstutzer(?:innen|in|n)?","initiant(?:en|innen|in)"]},
 against:{verb:["ablehn(?:en|t|te|ten|ung)","abzulehnen","abgelehnt","lehn(?:e|t|te|en|ten) [^.;:,]{0,60}? ab","bekampf(?:en|t|te|ten)",`${SAGEN} gegen`,"nein zu[rm]?","gegen(?!\\s*\\d)"],
  free:["zur ablehnung","ein nein","ablehnend\\p{L}*"],group:["gegner(?:innen|in|n)?","kritiker(?:innen|in|n)?"]}},
 it:{for:{verb:["sosten(?:uto|uta|uti|ute|ere|eva|evano|gono|go|iamo)(?!\\s+(?:che|di|d'))","sostiene(?!\\s+(?:che|di|d'))","appoggi(?:a|ano|ato|are|ava)","approv(?:a|ano|are|ato|ava)","accett(?:a|ano|are|ato|ava)","difend(?:e|ono|ere|eva)",`${DIRE_IT} a favore`,"si a(?:ll|lla|l|d)?","raccomand\\p{L}* (?:di accettare|l'accettazione|di approvare|di sostenere)"],
  free:["a favore","favorevol[ei]","un si","sostenerl[ao]","l'ha (?:difesa|sostenuta|appoggiata|approvata|accettata)"],group:["sostenitor[ie]|sostenitrici","promotori","fautori"]},
 against:{verb:["respin(?:ge|gono|gere|to|ta|ti|te|geva|gevano|gendo)","rigett(?:a|are|ato|ata)|il rigetto","bocci(?:a|are|ato|ata|ano)","rifiut(?:a|are|ato|ata|ano)","combatt(?:e|ere|uto|uta|ono)","si oppon(?:e|gono)","contrari[oa]",`${DIRE_IT} contro`,"(?<!voti )contro(?!\\s*\\d)","no a(?:ll|lla|l|d)?","raccomand\\p{L}* (?:di respingere|il rigetto|la bocciatura)"],
  free:["sfavorevol[ei]","un no(?!-)","respingerl[ao]|rifiutarl[ao]|bocciarl[ao]|combatterl[ao]","l'ha (?:respinta|rifiutata|bocciata|combattuta)"],group:["oppositori","avversari","detrattori","contrari(?:e)?"]}},
};
const CUE_RX=Object.fromEntries(Object.entries(CUES).map(([lang,sides])=>[lang,Object.entries(sides).flatMap(([side,kinds])=>Object.entries(kinds).map(([kind,list])=>({side,kind,re:rx(`${B}${any(list)}${E}`,'gu')})))]));
const GROUP_TOKEN=rx(`^${any(Object.values(CUES).flatMap(s=>[...s.for.group,...s.against.group]))}$`);
// "In favour of clarifying X" is about X: a free cue followed by "of/de/di/von" must reach the proposal like a verb.
const COMPLEMENT=/^\s+(?:of|de|du|des|d'|di|del|della|dell'|dei|degli|von|vom|zu|zur|zum)(?![\p{L}])/u;
// Another collective in front of the verb is its subject: "X said the committee proposed approving the bill".
const COLLECTIVE=rx(`${B}(?:committee|commission|kommission\\p{L}*|commissione|majority|minority|majorite|minorite|mehrheit|minderheit|maggioranza|minoranza|parliament|parlament|parlamento|national council|council of states|conseil national|conseil des etats|nationalrat|standerat|consiglio nazionale|consiglio degli stati|chamber|chambre|kammer|camera|cantons?|kantone|cantoni|federal council|conseil federal|bundesrat\\p{L}*|consiglio federale)${E}`,'gu');
// Official Bulletin role codes of Federal Council members (BR, President and Vice-President of the Confederation).
const FC_ROLE=/^(?:BR|BPR|VPBR)(?:-|$)/;
const FC_INST='(?:the )?federal council|(?:le )?conseil federal|(?:der |den |dem |des )?bundesrate?s?|(?:il )?consiglio federale';
const FC_MENTION=rx(`${B}(?:federal council|conseil federal|bundesrat\\p{L}*|consiglio federale)${E}`);

const NEG_BEFORE=/(?:^|[^\p{L}])(?:not|never|no longer|ne|nicht|kein\p{L}*|nie|non|mai|weder|ni|pas)(?:[^\p{L}]|$)|n't|(?:^|[^\p{L}])n'/u;
// Negation after the verb: French "pas" right behind it, German "nicht" behind the object. English and Italian negate before.
const NEG_AFTER={fr:/^\s{0,3}(?:pas|jamais|plus|point)(?![\p{L}])/u,de:/^[^,;.]{0,40}?(?:^|[^\p{L}])(?:nicht|keineswegs|keinesfalls)(?:[^\p{L}]|$)/u};
const NOT_ONLY=/not only|non seulement|nicht nur|non solo|non soltanto/;
const CONTRAST=/(?:unlike|contrary to|in contrast to|contrairement aux?|a la difference des?|im gegensatz zu[rm]?|anders als|a differenza d\p{L}*|contrariamente a\p{L}*)\s+(?:the |les |des |den |die |der |i |gli |le )?$/u;
const CLAUSE={en:'while|whereas|but|however|although|though|by contrast|in contrast|on the other hand',fr:'tandis que|alors que|mais|cependant|en revanche|toutefois|par contre',
 de:'wahrend|aber|hingegen|jedoch|wogegen',it:'mentre|ma|pero|invece|tuttavia|bensi|al contrario'};
// Words that may sit between a camp noun and the names it lists ("opponents such as X and Y", "Y figurait parmi les opposants").
const FILLER=new Set(`such as including included includes include comprenaient comprennent umfassten comprendevano like among amongst them notably namely eg e.g for example instance and or as well the of a an one also other fellow members member mps councillors councillor national states council were was are is his her their
tels telles tel telle que qu comme notamment dont parmi eux elles et ou ainsi le la les l des de du d un une aussi autres conseiller conseillere conseillers conseilleres nationaux nationale aux etats membres figuraient figurait comptaient sont etaient etait
wie darunter namentlich etwa zum beispiel insbesondere und oder sowie der die das den dem des ein eine einer eines auch andere weitere nationalrat nationalratin nationalrate standerat standeratin sind waren war gehorten gehorte zahlten zu zur
come tra fra cui quali ad esempio in particolare e ed o nonche il lo gli i le un uno una dei degli delle del della di anche altri altre consigliere consiglieri consigliera nazionale nazionali deputato deputata deputati erano era sono figuravano
mr mrs ms m mme herr frau signor signora svp udc sp ps fdp plr mitte centre centro gruene verts verdi glp pvl evp pev lega mcg groupe fraktion gruppo group party parti partei partito
federal federale federaux federali bundesrat bundesratin president presidente arguments argument argumente argomenti argomento raisons ragioni grunde reasons
made presented raised advanced put forward by avances presentes formules par vorgebracht vorgebrachten genannt genannten von presentati presentato presentate avanzati avanzate portati da dal dalla`.split(/\s+/));
const MEMBERSHIP=new Set('among amongst one a an was were is are also as parmi un une l l\'un l\'une etait etaient est sont aussi comme unter zu zur zum den einer eine ein war waren ist sind auch als tra fra uno una era erano anche come'.split(' '));
const COORD=new Set('and et und e ed or ou oder o as well ainsi que sowie nonche'.split(' '));
const AGENT=new Set('by par von vom da dal dalla dai dagli'.split(' '));
const COMPLEMENTIZER=new Set(['that','que','qu','dass','che','ob']);
const PRONOUN=new Set('he she it they il elle ils elles er sie es lui lei egli ella essi'.split(' '));

const TITLE={
 for:rx(`${B}(?:in favou?r|supporters?|proponents?|advocates?|backers?|arguments? for|case for|for the (?:initiative|proposal|bill|agreement)|en faveur|favorables?|partisans?|defenseurs?|les soutiens|arguments? pour|pour l'initiative|pour le projet|befurworter\\p{L}*|befurwortend\\p{L}*|zustimmend\\p{L}*|unterstutzer\\p{L}*|argumente (?:dafur|fur)|dafur|fur die (?:initiative|vorlage)|a favore|favorevoli|sostenitori|promotori|per l'iniziativa)${E}`),
 against:rx(`${B}(?:against|opponents?|critics?|objections?|opposition|contra|opposants?|adversaires?|defavorables?|critiques|contre(?!-)|gegen|dagegen|gegner\\p{L}*|kritiker\\p{L}*|kontra|ablehnung|ablehnend\\p{L}*|einwande|contro|contrari|oppositori|avversari|critiche|obiezioni)${E}`)};
// A section title names a side only when it names exactly one and is not about a counter-proposal.
export function classifyTitle(title){
 const t=fold(title);if(!t.trim()||rx(COUNTER).test(t))return null;
 const f=TITLE.for.test(t),a=TITLE.against.test(t);return f===a?null:f?'for':'against';
}

function sentences(text){return nfc(text).split(/(?<=[.!?])\s+(?=[\p{Lu}«"„“(\d])/u).filter(s=>s.trim());}
function clauses(f,language){
 const out=[];let from=0;
 for(const m of f.matchAll(rx(`;|\\s[–—]\\s|,?\\s(?:${[CLAUSE.en,CLAUSE[language]].filter(Boolean).join('|')})${E}`,'gu'))){out.push([from,m.index]);from=m.index+m[0].length;}
 out.push([from,f.length]);return out;
}
const surnameOf=s=>s.surname||String(s.name).trim().split(/\s+/).at(-1);
// How a speaker appears in prose: the full-name aliases when the surname is shared in that debate, else the surname.
const nameForms=s=>(s.aliases?.length?s.aliases:[surnameOf(s)]).map(n=>fold(n).trim()).filter(Boolean);
const formsSrc=forms=>any(forms.map(f=>esc(f).replace(/\s+/g,'\\s+')));
function nameSrc(s){const given=fold(s.name).replace(fold(surnameOf(s)),'').trim();return `(?:${given?`(?:${esc(given).replace(/\s+/g,'\\s+')}\\s+)?`:''}${formsSrc(nameForms(s))})`;}

const tokens=text=>text.replace(/\([^)]*\)/g,' ').split(/[\s,;:()«»"“”„]+/u).filter(Boolean);
const isObj=w=>OBJ_TOKEN.test(w);
const allowedGap=(text,others)=>tokens(text).every(tok=>{const w=fold(tok);return FILLER.has(w)||isObj(w)||others.includes(w)||/^\p{Lu}/u.test(tok);});
const hasOther=(text,others)=>{const f=fold(text);return others.some(o=>rx(`${B}${esc(o)}${E}`).test(f));};
// A list of co-subjects ("X, Y and Federal Councillor Z argue ..."): names, titles and conjunctions only.
const onlyCoordinated=(text,others)=>tokens(text).every(tok=>{const w=fold(tok);return COORD.has(w)||FILLER.has(w)||others.includes(w)||/^\p{Lu}/u.test(tok);});

// Nearest proposal noun to a cue inside its clause, without crossing a comma; a counter-proposal captures the cue.
function nounNear(nouns,f,start,end){
 let best=null;
 for(const n of nouns){
  const after=n.start>=end,before=n.end<=start,d=after?n.start-end:before?start-n.end:0;
  if(after&&d>45||before&&d>40||/[,.;:]/.test(after?f.slice(end,n.start):before?f.slice(n.end,start):''))continue;
  if(!best||d<best.d)best={...n,d};
 }
 return best;
}
function negated(f,start,end,noun,language){
 if(NOT_ONLY.test(f.slice(Math.max(0,start-25),end)))return false;
 return NEG_BEFORE.test(f.slice(Math.max(0,start-20),start))||Boolean(NEG_AFTER[language]?.test(f.slice(end,Math.max(end,noun?.end||end)+15)));
}
const flip=side=>side==='for'?'against':'for';

// Side given to one name occurrence by the cues of its own clause; null when nothing there binds to the name.
function sentenceSide(orig,f,at,len,[lo,hi],others,federalCouncillor,language){
 const nouns=[...f.matchAll(NOUN)].filter(m=>m.index>=lo&&m.index<hi).map(m=>({start:m.index,end:m.index+m[0].length,counter:Boolean(m[1])}));
 const clause=f.slice(lo,hi),cands=[];
 for(const {side,kind,re} of CUE_RX[language]||CUE_RX.en)for(const m of clause.matchAll(re)){
  const start=lo+m.index,end=start+m[0].length;if(start<at+len&&end>at)continue;
  const noun=nounNear(nouns,f,start,end),needsNoun=kind==='verb'||kind==='free'&&COMPLEMENT.test(f.slice(end));
  if(needsNoun&&(!noun||noun.counter))continue;
  if(kind!=='verb'&&noun?.counter&&noun.d<30)continue;
  const after=start>=at+len,gap=after?orig.slice(at+len,start):orig.slice(end,at);if(gap.length>140)continue;
  // In English, French and Italian a proposal noun between the name and the verb is the verb's subject
  // ("X said the initiative calls for ..."); German puts objects there ("weil X die Initiative unterstützt").
  if(after&&kind==='verb'&&language!=='de'&&noun&&noun.end<=start&&noun.start>=at+len)continue;
  if(kind==='group'||kind==='free'&&!after){
   if(!allowedGap(gap,others))continue;
   // A camp noun after the name needs membership wording ("X was among the opponents", "X, a supporter"),
   // otherwise "Selon X, les opposants se trompent" would enlist X.
   if(kind==='group'&&after&&!tokens(gap).some(t=>MEMBERSHIP.has(fold(t))))continue;
  }
  else if(after){
   // The verb must be the named speaker's: no other speaker, camp or the Federal Council as its subject in between.
   if(gap.length>90)continue;
   if(!onlyCoordinated(gap,others)){
    // Appositions ("X, a member of the National Council, said ...") describe X; drop them before looking for another subject.
    const core=gap.replace(/\([^)]*\)/g,' ').replace(/,[^,;]*,/g,x=>onlyCoordinated(x,others)?' ':x);
    if(hasOther(core,others))continue;
    const words=tokens(core).map(fold),collectives=[...fold(core).matchAll(COLLECTIVE)].map(x=>x[0]);
    // A Federal Councillor reporting "the Federal Council rejects it" is stating their own position.
    const fcSubject=federalCouncillor&&collectives.length>0&&collectives.every(x=>FC_MENTION.test(x));
    if(words.some(w=>GROUP_TOKEN.test(w))||collectives.length&&!fcSubject)continue;
    const c=words.findLastIndex(w=>COMPLEMENTIZER.has(w.replace(/'$/,'')));
    if(c>=0&&!fcSubject&&!words.slice(c+1).every(w=>PRONOUN.has(w)||FILLER.has(w)||isObj(w)))continue;
   }
  }else{
   // A cue before the name binds as a passive ("supported by X"), a participle set off by a comma ("Rejecting it,
   // X ...") or a fronted phrase that opens the clause ("Against the initiative, X and Y ..."), never as the verb
   // of which the name is the object ("opposed Dobler's proposal").
   const words=tokens(gap).map(fold).filter(w=>!isObj(w)),fronted=tokens(orig.slice(lo,start)).every(t=>FILLER.has(fold(t)));
   const passive=!/[,;]/.test(gap)&&words.length&&AGENT.has(words[0])&&words.slice(1).every(w=>FILLER.has(w)||others.includes(w)||COORD.has(w));
   if(!(/^\s*[,:]\s*$/.test(gap)||passive||fronted&&allowedGap(gap,others)))continue;
  }
  let s=side;
  if(kind!=='group'&&negated(f,start,end,noun,language))s=flip(s);
  if(kind==='group'&&!after&&CONTRAST.test(f.slice(Math.max(lo,start-30),start)))s=flip(s);
  cands.push({side:s,kind,d:gap.length,cue:orig.slice(start,end)});
 }
 cands.sort((a,b)=>a.d-b.d);return cands[0]||null;
}

// Answer blocks in reading order: lead, then each section paragraph with its title. Claims stand in when synthesis failed.
export function answerBlocks(response){
 const a=response?.answer;
 if(a?.lead||a?.sections)return [{where:'lead',title:null,text:a.lead?.text||'',cites:a.lead?.citationIds||[]},...(a.sections||[]).flatMap((s,i)=>(s.paragraphs||[]).map((p,j)=>({where:`section ${i+1}.${j+1}`,title:s.title||'',text:p.text||'',cites:p.citationIds||[]})))];
 return (response?.claims||[]).map((c,i)=>({where:`claim ${i+1}`,title:null,text:c.text||''}));
}
const answerText=blocks=>blocks.map(b=>[b.title,b.text].filter(Boolean).join('\n')).join('\n');

// A member of Parliament presented as the Federal Council (or the reverse). Patterns only fire on the speaker's own name.
const FC_TITLE='federal council(?:l)?or|member of the federal council|president of the (?:swiss )?confederation|conseill(?:er|ere) federal(?:e)?|president(?:e)? de la confederation|bundesr(?:at|atin)|bundesprasident(?:in)?|consiglier[ea] federale|president(?:e|essa) della confederazione';
const MEMBER_TITLE='national council(?:l)?or|councillor of states|member of the (?:national council|council of states)|conseill(?:er|ere) (?:national(?:e)?|aux etats)|nationalr(?:at|atin)|stander(?:at|atin)|consiglier[ea] (?:nazionale|agli stati)|deputat[oa]';
const BEHALF="on behalf of the federal council|speaking for the federal council|representing the federal council|in the name of the federal council|au nom du conseil federal|s'exprimant (?:au nom du|pour le) conseil federal|representant le conseil federal|im namen des bundesrate?s|als vertreter(?:in)? des bundesrate?s|a nome del consiglio federale|in rappresentanza del consiglio federale|per conto del consiglio federale";
const ART='(?:the |le |la |der |die |il |a |an |un |une |ein |eine )?';
function roleErrors(speaker,blocks){
 const fc=FC_ROLE.test(speaker.function||''),name=nameSrc(speaker);
 const pats=(fc?[`${B}(?:${MEMBER_TITLE})\\s+${name}${E}`,`${B}${name}\\s*(?:,|\\()\\s*${ART}(?:${MEMBER_TITLE})${E}`]
  :[`${B}(?:${FC_TITLE})\\s+${name}${E}`,
    `${B}${name}\\s*(?:,|\\()\\s*${ART}(?:${FC_TITLE}|${FC_INST})(?:'s)?(?:\\s+(?:representative|spokesperson|spokesman|spokeswoman))?\\s*(?=[,)]|$)`,
    `${B}${name}(?:\\s*,)?\\s+(?:\\p{L}+\\s+){0,2}(?:${BEHALF})`,`(?:${BEHALF}),?\\s+${name}${E}`,`${B}(?:${FC_INST})\\s*\\(\\s*${name}${E}`,
    `${B}(?:${FC_INST}),?\\s+(?:represented by|through|via|represente par|par la voix de|vertreten durch|rappresentato da|per bocca di|tramite)\\s+${name}${E}`]).map(p=>rx(p));
 const out=[];
 for(const b of blocks)for(const s of sentences(b.text)){const f=fold(s),m=pats.map(p=>f.match(p)).find(Boolean);
  if(m)out.push({speaker:speaker.name,kind:fc?'federal-councillor-as-member':'member-as-federal-council',where:b.where,sentence:s.trim(),match:m[0]});}
 return out;
}

// The Federal Council as the speaking subject of a paragraph whose only sources are members' speeches: a member's
// words presented as the government's. Skipped when the sentence names a person ("Buffat said the Federal Council ...").
const FC_VOICE=rx(`${B}(?:${FC_INST})\\s+(?:\\p{L}+\\s+)?(?:said|says|argued|argues|warned|warns|stated|states|considers|considered|believes|believed|recommended|recommends|rejects|rejected|supports|supported|opposes|opposed|explained|stressed|noted|estime|a estime|declare|a declare|affirme|a affirme|souligne|a souligne|rappelle|recommande|a recommande|rejette|soutient|s'oppose|avertit|explique|considere|juge|sagt|sagte|argumentiert|argumentierte|warnt|warnte|erklart|erklarte|betont|betonte|halt|hielt|empfiehlt|empfahl|lehnt|lehnte|unterstutzt|findet|meint|afferma|ha affermato|sostiene|ha sostenuto|ritiene|ha ritenuto|dichiara|ha dichiarato|sottolinea|raccomanda|respinge|avverte|spiega)${E}`,'gu');
const FC_ROLE_TEXT=/federal council|president of the swiss confederation/i;
const REPORTER=new Set('he she they il elle ils elles er sie lui lei egli ella essi esse that que qu dass che'.split(' '));
function federalCouncilVoice(blocks,citations,others){
 const out=[];
 for(const b of blocks){
  const roles=(b.cites||[]).map(id=>citations.find(c=>c.id===id)).filter(Boolean);
  if(!roles.length||roles.some(c=>!c.role||FC_ROLE_TEXT.test(c.role)))continue;
  for(const s of sentences(b.text)){
   const f=fold(s),m=[...f.matchAll(FC_VOICE)][0];
   // Reported speech ("She said that the Federal Council had warned ...") keeps the member as the speaker.
   const reported=m&&tokens(f.slice(0,m.index)).some(w=>REPORTER.has(w.replace(/'$/,'')));
   if(m&&!reported&&!others.some(o=>rx(`${B}${esc(o)}${E}`).test(f)))out.push({speaker:roles.map(c=>c.speaker).join(', '),kind:'federal-council-voice-from-member',where:b.where,sentence:s.trim(),match:m[0]});
  }
 }
 return out;
}

const verdictOf=(flips,s)=>flips||s.forbidden.length||s.roleErrors.length?'fail':s.statusIssue||s.missingCites.length||s.speakers.some(x=>x.result==='unclassified')?'warn':'pass';
const countsOf=speakers=>Object.fromEntries(['ok','flip','unclassified','absent'].map(k=>[k,speakers.filter(s=>s.result===k).length]));

// Score one answer against one case. Pure: the evaluator adds the optional judge and all I/O around it.
export function scoreAnswer(caseDef,response){
 const language=caseDef.language||'en',expect=caseDef.expect||{},blocks=answerBlocks(response);
 const others=[...new Set([...(expect.speakers||[]).flatMap(s=>nameForms(s).flatMap(f=>[f,...f.split(/\s+/)])),...(response?.citations||[]).map(c=>fold(String(c.speaker||'').split(/\s+/)[0]))])].filter(o=>o.length>=3);
 const speakers=(expect.speakers||[]).map(sp=>{
  const forms=nameForms(sp),re=rx(`${B}${formsSrc(forms)}${E}`,'gu'),mine=new Set(forms.flatMap(f=>[f,...f.split(/\s+/)])),rivals=others.filter(o=>!mine.has(o));
  const mentions=[];
  for(const b of blocks){
   const titleSide=b.title?classifyTitle(b.title):null;
   for(const s of sentences(b.text)){
    const f=fold(s),orig=f.length===s.length?s:f;
    for(const m of f.matchAll(re)){
     const span=clauses(f,language).find(([lo,hi])=>m.index>=lo&&m.index<hi)||[0,f.length];
     const hit=sentenceSide(orig,f,m.index,m[0].length,span,rivals,FC_ROLE.test(sp.function||''),language);
     mentions.push({where:b.where,title:b.title,sentence:s.trim(),side:hit?.side||titleSide,by:hit?`sentence:${hit.kind}`:titleSide?'title':null,cue:hit?.cue||(titleSide?b.title:null)});
    }
   }
  }
  // A neutral speaker placed on either side is as wrong as a supporter listed among the opponents.
  const wrong=sp.stance==='neutral'?m=>m.side==='for'||m.side==='against':m=>m.side&&m.side!==sp.stance;
  const result=!mentions.length?'absent':mentions.some(wrong)?'flip':mentions.some(m=>m.side===sp.stance)?'ok':'unclassified';
  return {name:sp.name,expected:sp.stance,result,mentions,roleErrors:roleErrors(sp,blocks)};
 });
 const text=fold(answerText(blocks));
 const forbidden=(expect.forbid||[]).filter(p=>p&&text.includes(fold(p))).map(phrase=>({phrase}));
 const cited=(response?.citations||[]).map(c=>fold(c.speaker)).filter(Boolean);
 const missingCites=(expect.mustCite||[]).filter(n=>{
  const re=rx(`${B}${formsSrc(nameForms((expect.speakers||[]).find(s=>s.name===n)||{name:n}))}${E}`);
  return cited.length?!cited.some(c=>re.test(c)):!re.test(text);
 });
 // A recorded replay or sources-only fallback is not the model under test, even with status ok.
 const status=response?.status||'no-response',statusIssue=status!=='ok'?status:!response?.answer?'no-synthesis':response.mode&&response.mode!=='live-inference'?`mode:${response.mode}`:null;
 const score={id:caseDef.id,language,status,mode:response?.mode||null,statusIssue,speakers,forbidden,
  roleErrors:[...speakers.flatMap(s=>s.roleErrors),...federalCouncilVoice(blocks,response?.citations||[],others)],missingCites};
 return {...score,verdict:verdictOf(speakers.filter(s=>s.result==='flip').length,score),counts:countsOf(speakers)};
}

// Mentions the heuristics could not place, as judge requests: each paragraph (with its title) that names the speaker.
export function judgeRequests(score,response){
 const blocks=answerBlocks(response);
 return score.speakers.filter(s=>s.result==='unclassified').map(s=>({speaker:s.name,
  passages:[...new Set(s.mentions.map(m=>m.where))].map(w=>{const b=blocks.find(x=>x.where===w);return {where:w,title:b?.title||null,text:b?.text||''};})}));
}
// Fold judge verdicts ({speaker, stance_in_answer}) back into a score; an opposite verdict is a flip like any other.
export function applyJudgements(score,judgements){
 const by=new Map((judgements||[]).map(j=>[j.speaker,j.stance_in_answer]));
 const speakers=score.speakers.map(s=>{
  if(s.result!=='unclassified'||!by.has(s.name))return s;
  const j=by.get(s.name),placed=j==='for'||j==='against';
  return {...s,judge:j,result:s.expected==='neutral'?(placed?'flip':j==='neutral'?'ok':'unclassified'):placed?(j===s.expected?'ok':'flip'):'unclassified'};
 });
 const next={...score,speakers};
 return {...next,verdict:verdictOf(speakers.filter(s=>s.result==='flip').length,next),counts:countsOf(speakers)};
}
