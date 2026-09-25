// Vote Companion: strings and pure helpers (docs/VOTE-COMPANION-SPEC.md). No DOM, no network, so node tests can
// import it. Keys follow the spec's microcopy tables (pilot.*, u.*, a.*, s.*); EN is the source of truth, FR is
// complete, DE/IT carry the spec's strings plus the ones this build adds. A native speaker reads DE/FR/IT before
// release (spec section 4). A missing key falls back to EN.
const EN={
 'nav.votes':'Votes',
 'pilot.chip':'Pilot · not an official ballot',
 'pilot.explain':'This page is a pilot. Nothing here counts toward the official vote. Your official ballot comes by post from your commune.',
 'step.1':'Understand','step.2':'Ask','step.3':'Say where you stand','steps.label':'Steps on this page','step.3.hold':'not open yet',
 'freshness':'Brief updated {date}','freshness.none':'Brief in preparation',
 'draft':'Draft preview: a person has not reviewed this brief yet. It is visible only because preview mode is on.',
 'meta.vote':'Vote on {date}','meta.business':'Business {number}','meta.double':'Needs a majority of voters and of cantons',
 'back.index':'All objects on the ballot',
 'type.popular-initiative':'Popular initiative','type.counter-proposal':'Direct counter-proposal','type.optional-referendum':'Optional referendum','type.mandatory-referendum':'Mandatory referendum','type.tie-breaker':'Deciding question',
 'noun.popular-initiative':'the initiative','noun.counter-proposal':'the counter-proposal','noun.default':'the proposal',
 'i.h':'Federal votes','i.lead':'One page per object on the ballot: what you are voting on, what Parliament decided and what was argued there, each sentence linked to the record. Not voting advice.',
 'i.date':'Vote on {date}','i.official':'Official information on this vote date','i.open':'Read the brief','i.prep':'Brief in preparation','i.prep.body':'Published once a person has reviewed it.',
 'i.none':'No federal vote date is listed here yet.','i.none.link':'Federal vote calendar (admin.ch)','i.past':'Past vote dates','i.loading':'Loading the vote dates…','i.error':'Couldn’t load the vote dates.',
 'card.eyebrow':'Federal vote','card.title':'Vote on {date}','card.body':{one:'1 object on the ballot. What Parliament decided and argued, each sentence linked to the record.',other:'{n} objects on the ballot. What Parliament decided and argued, each sentence linked to the record.'},'card.cta':'Open the vote companion',
 'u.question.h':'What you’re voting on','u.title.src':'Official title · {publisher}','u.question.note':'We quote the official title word for word and never rephrase it. The ballot question is in your official voting material.','u.date.src':'Official information on the vote of {date}',
 'u.decided.h':'What Parliament decided','u.decided.nc':'National Council','u.decided.cs':'Council of States','u.decided.final':'Final vote, {date}',
 'u.decided.missing':'Not in our roll-call data. See the chamber’s results page.','u.decided.cs.link':'Council of States on parlament.ch','u.decided.none':'No final vote on this object is in our roll-call data.',
 'u.decided.meaning':'Recorded meaning of this vote, in the original language','u.decided.meaning.yes':'A yes vote meant','u.decided.meaning.no':'A no vote meant',
 'u.decided.byParty':'By party group','u.decided.group':'Group','u.decided.order':'Groups appear in a fixed order (by official group code), the same on every vote. Party groups as recorded on the day of the vote.',
 'col.rec-rejection':'Recommend rejecting','col.rec-acceptance':'Recommend accepting','col.against':'Against that recommendation','col.abstained':'Abstained','col.didNotVote':'Did not vote','col.excused':'Excused','col.presiding':'Presiding',
 'd.rec-rejection':{one:'1 voted to recommend rejecting {noun}',other:'{n} voted to recommend rejecting {noun}'},
 'd.rec-acceptance':{one:'1 voted to recommend accepting {noun}',other:'{n} voted to recommend accepting {noun}'},
 'd.against':{one:'1 voted against that recommendation',other:'{n} voted against that recommendation'},
 'd.meaning':{one:'1 voted «{meaning}»',other:'{n} voted «{meaning}»'},
 'd.abstained':{one:'1 abstained',other:'{n} abstained'},'d.didNotVote':{one:'1 did not vote',other:'{n} did not vote'},'d.excused':{one:'1 excused',other:'{n} excused'},'d.presiding':{one:'1 presiding (does not vote)',other:'{n} presiding (do not vote)'},
 'u.args.h':'Arguments made in Parliament','u.args.for':'For','u.args.against':'Against','u.args.side.for':'accept {noun}','u.args.side.against':'reject {noun}',
 'u.args.note':'Each sentence links to the passage it comes from. The order is the same on every vote: For, then Against.',
 'u.args.prep':'Brief in preparation','u.args.prep.body':'The cited arguments are published once a person has reviewed them. The title and Parliament’s counts above come straight from official records.',
 'u.cover.thin':'The record covers this side thinly: {k} passages from {m} speakers.','u.cover.one':'Only one member spoke for this side in the record.','u.cover.silent':'No passage in the record argues this side. We don’t fill the gap from other sources.',
 'u.cite.label':'Source {n}: {speaker}, {date}. Open the citation','u.cite.h':'Citation {n}','u.cite.original':'Original · {language}',
 'u.cite.speaker':'Speaker','u.cite.role':'Role','u.cite.group':'Group','u.cite.chamber':'Chamber','u.cite.date':'Date',
 'u.cite.watch':'Watch {start}–{end}','u.cite.aligned':'Auto-aligned, not checked by a person','u.cite.copy':'Copy citation','u.cite.copied':'Citation copied.','u.cite.copyFail':'Couldn’t copy. Select the text instead.','u.cite.report':'Report this citation','u.cite.open':'Open in the official record',
 'u.how.h':'How this brief was made','u.how.rule':'AI does the reading and writing. Plain code decides what counts as evidence and attaches every citation.',
 'u.how.model':'Model','u.how.generated':'Generated','u.how.passages':'Passages considered','u.how.business':'Parliament business','u.how.review':'Human review','u.how.reviewed':'Reviewed by {reviewer} on {date}','u.how.pending':'Not reviewed yet',
 'u.how.nobrief':'No brief has been generated yet. The official title and Parliament’s counts come straight from official records.',
 'u.how.rules':'Neutrality rules',
 'u.how.r1':'Sides follow the ballot question, not parties: For means accepting {noun}, Against means rejecting it.',
 'u.how.r2':'Up to four arguments per side, For first, then Against, in the same style on both sides.',
 'u.how.r3':'A thin side is never padded, and the fuller side is never trimmed to match. A label says when the record is thin.',
 'u.how.r4':'Each sentence reports what a member said and ends in its citation. Numbers come only from the vote record or from a quote.',
 'u.how.r5':'No voting advice, no forecasts, no judgement words.',
 'u.how.r6':'A named person reviews every brief before it is published.',
 'u.report':'Report a problem with this brief','u.report.note':'Opens your email app. Nothing from your account is attached.',
 'u.error':'Couldn’t load this brief.','u.notfound':'This object isn’t published here yet.','retry':'Retry','close':'Close',
 'a.h':'Ask about this vote','a.scope':'Scoped to {scope}','a.chip.instant':'Instant','a.prepared.label':'Prepared questions','a.prepared.note':'Answered ahead of time from the record. No account needed.',
 'a.prepared.none':'Prepared questions are being checked. They appear here once reviewed.','a.prepared.fallback':'This answer is available in {language} only.',
 'a.own.h':'Your own question','a.placeholder':'Ask what was said in Parliament about this vote','a.send':'Ask','a.remaining':'{n} of {limit} questions left today',
 'a.signin.title':'Sign in to ask your own question','a.signin.body':'Free questions need a verified account. Everyone gets 20 a day and 100 a week. The prepared questions above need no account.','a.signin.cta':'Sign in','a.signin.later':'Not now',
 'a.verify':'Confirm your email address to ask your own questions. The prepared questions above work without it.',
 'a.noadvice':'Cleisthenes explains what was said in Parliament. It doesn’t tell you how to vote.','a.opened':'Your question is open in the Cleisthenes chat.',
 's.h':'Say where you stand','s.explain.1':'A temperature check, not a vote. It doesn’t count toward anything official.','s.pp.network':'Passport can’t reach this pilot’s network yet. We’ll say on this page when it can.',
};
const FR={
 'nav.votes':'Votations',
 'pilot.chip':'Projet pilote · pas un vote officiel',
 'pilot.explain':'Cette page est un projet pilote. Rien ici ne compte pour le vote officiel. Votre matériel de vote arrive par la poste de votre commune.',
 'step.1':'Comprendre','step.2':'Demander','step.3':'Dire où vous en êtes','steps.label':'Étapes de cette page','step.3.hold':'pas encore ouvert',
 'freshness':'Synthèse mise à jour le {date}','freshness.none':'Synthèse en préparation',
 'draft':'Aperçu de travail : aucune personne n’a encore relu cette synthèse. Elle n’est visible que parce que le mode aperçu est activé.',
 'meta.vote':'Votation du {date}','meta.business':'Objet {number}','meta.double':'Requiert la majorité du peuple et des cantons',
 'back.index':'Tous les objets soumis au vote',
 'type.popular-initiative':'Initiative populaire','type.counter-proposal':'Contre-projet direct','type.optional-referendum':'Référendum facultatif','type.mandatory-referendum':'Référendum obligatoire','type.tie-breaker':'Question subsidiaire',
 'noun.popular-initiative':'l’initiative','noun.counter-proposal':'le contre-projet','noun.default':'l’objet',
 'i.h':'Votations fédérales','i.lead':'Une page par objet soumis au vote : sur quoi vous votez, ce que le Parlement a décidé et les arguments avancés, chaque phrase reliée au compte rendu. Pas une recommandation de vote.',
 'i.date':'Votation du {date}','i.official':'Informations officielles sur cette date de votation','i.open':'Lire la synthèse','i.prep':'Synthèse en préparation','i.prep.body':'Publiée après relecture par une personne.',
 'i.none':'Aucune date de votation fédérale n’est encore indiquée ici.','i.none.link':'Calendrier des votations fédérales (admin.ch)','i.past':'Votations passées','i.loading':'Chargement des dates de votation…','i.error':'Impossible de charger les dates de votation.',
 'card.eyebrow':'Votation fédérale','card.title':'Votation du {date}','card.body':{one:'1 objet soumis au vote. Ce que le Parlement a décidé et débattu, chaque phrase reliée au compte rendu.',other:'{n} objets soumis au vote. Ce que le Parlement a décidé et débattu, chaque phrase reliée au compte rendu.'},'card.cta':'Ouvrir le compagnon de vote',
 'u.question.h':'Sur quoi vous votez','u.title.src':'Titre officiel · {publisher}','u.question.note':'Nous citons le titre officiel mot pour mot, sans jamais le reformuler. La question de vote figure dans votre matériel de vote officiel.','u.date.src':'Informations officielles sur la votation du {date}',
 'u.decided.h':'Ce que le Parlement a décidé','u.decided.nc':'Conseil national','u.decided.cs':'Conseil des États','u.decided.final':'Vote final, {date}',
 'u.decided.missing':'Pas dans nos données de vote nominatif. Voir les résultats du conseil.','u.decided.cs.link':'Conseil des États sur parlement.ch','u.decided.none':'Aucun vote final sur cet objet ne figure dans nos données de vote nominatif.',
 'u.decided.meaning':'Signification enregistrée de ce vote, dans la langue originale','u.decided.meaning.yes':'Un vote oui signifiait','u.decided.meaning.no':'Un vote non signifiait',
 'u.decided.byParty':'Par groupe parlementaire','u.decided.group':'Groupe','u.decided.order':'Les groupes apparaissent dans un ordre fixe (par code officiel du groupe), le même pour chaque vote. Groupes tels qu’enregistrés le jour du vote.',
 'col.rec-rejection':'Recommander le rejet','col.rec-acceptance':'Recommander l’acceptation','col.against':'Contre cette recommandation','col.abstained':'Abstentions','col.didNotVote':'N’ont pas voté','col.excused':'Excusés','col.presiding':'Présidence',
 'd.rec-rejection':{one:'1 a voté pour recommander de rejeter {noun}',other:'{n} ont voté pour recommander de rejeter {noun}'},
 'd.rec-acceptance':{one:'1 a voté pour recommander d’accepter {noun}',other:'{n} ont voté pour recommander d’accepter {noun}'},
 'd.against':{one:'1 a voté contre cette recommandation',other:'{n} ont voté contre cette recommandation'},
 'd.meaning':{one:'1 a voté « {meaning} »',other:'{n} ont voté « {meaning} »'},
 'd.abstained':{one:'1 s’est abstenu',other:'{n} se sont abstenus'},'d.didNotVote':{one:'1 n’a pas voté',other:'{n} n’ont pas voté'},'d.excused':{one:'1 excusé',other:'{n} excusés'},'d.presiding':{one:'1 à la présidence (ne vote pas)',other:'{n} à la présidence (ne votent pas)'},
 'u.args.h':'Arguments avancés au Parlement','u.args.for':'Pour','u.args.against':'Contre','u.args.side.for':'accepter {noun}','u.args.side.against':'rejeter {noun}',
 'u.args.note':'Chaque phrase renvoie au passage dont elle vient. L’ordre est le même pour chaque objet : Pour, puis Contre.',
 'u.args.prep':'Synthèse en préparation','u.args.prep.body':'Les arguments cités sont publiés après relecture par une personne. Le titre et les chiffres du Parlement ci-dessus viennent directement des sources officielles.',
 'u.cover.thin':'Le Bulletin officiel couvre peu ce camp : {k} passages de {m} orateurs.','u.cover.one':'Un seul membre s’est exprimé pour ce camp dans le Bulletin officiel.','u.cover.silent':'Aucun passage du Bulletin officiel ne défend ce camp. Nous ne comblons pas ce vide avec d’autres sources.',
 'u.cite.label':'Source {n} : {speaker}, {date}. Ouvrir la citation','u.cite.h':'Citation {n}','u.cite.original':'Original · {language}',
 'u.cite.speaker':'Orateur','u.cite.role':'Fonction','u.cite.group':'Groupe','u.cite.chamber':'Conseil','u.cite.date':'Date',
 'u.cite.watch':'Vidéo {start}–{end}','u.cite.aligned':'Alignement automatique, non vérifié par une personne','u.cite.copy':'Copier la citation','u.cite.copied':'Citation copiée.','u.cite.copyFail':'Copie impossible. Sélectionnez le texte.','u.cite.report':'Signaler cette citation','u.cite.open':'Ouvrir dans le Bulletin officiel',
 'u.how.h':'Comment cette synthèse a été faite','u.how.rule':'L’IA lit et écrit. Du code simple décide de ce qui compte comme preuve et attache chaque citation.',
 'u.how.model':'Modèle','u.how.generated':'Générée le','u.how.passages':'Passages examinés','u.how.business':'Objet parlementaire','u.how.review':'Relecture humaine','u.how.reviewed':'Relue par {reviewer} le {date}','u.how.pending':'Pas encore relue',
 'u.how.nobrief':'Aucune synthèse n’a encore été générée. Le titre officiel et les chiffres du Parlement viennent directement des sources officielles.',
 'u.how.rules':'Règles de neutralité',
 'u.how.r1':'Les camps suivent la question de vote, pas les partis : Pour signifie accepter {noun}, Contre signifie rejeter {noun}.',
 'u.how.r2':'Jusqu’à quatre arguments par camp, Pour d’abord, puis Contre, dans le même style des deux côtés.',
 'u.how.r3':'Un camp peu couvert n’est jamais complété, et le camp le mieux couvert n’est jamais réduit. Une mention signale quand le compte rendu est mince.',
 'u.how.r4':'Chaque phrase rapporte ce qu’un membre a dit et se termine par sa citation. Les chiffres viennent uniquement du procès-verbal de vote ou d’une citation.',
 'u.how.r5':'Pas de conseil de vote, pas de pronostic, pas de mots de jugement.',
 'u.how.r6':'Une personne nommée relit chaque synthèse avant sa publication.',
 'u.report':'Signaler un problème dans cette synthèse','u.report.note':'Ouvre votre messagerie. Rien de votre compte n’est joint.',
 'u.error':'Impossible de charger cette synthèse.','u.notfound':'Cet objet n’est pas encore publié ici.','retry':'Réessayer','close':'Fermer',
 'a.h':'Poser une question sur cet objet','a.scope':'Limité à {scope}','a.chip.instant':'Instantané','a.prepared.label':'Questions préparées','a.prepared.note':'Répondues à l’avance à partir du compte rendu. Aucun compte nécessaire.',
 'a.prepared.none':'Les questions préparées sont en cours de vérification. Elles apparaîtront ici une fois relues.','a.prepared.fallback':'Cette réponse n’existe qu’en {language}.',
 'a.own.h':'Votre propre question','a.placeholder':'Demandez ce qui a été dit au Parlement sur cet objet','a.send':'Demander','a.remaining':'{n} questions sur {limit} restantes aujourd’hui',
 'a.signin.title':'Connectez-vous pour poser votre propre question','a.signin.body':'Les questions libres demandent un compte vérifié. Chacun dispose de 20 questions par jour et 100 par semaine. Les questions préparées ci-dessus n’en ont pas besoin.','a.signin.cta':'Se connecter','a.signin.later':'Pas maintenant',
 'a.verify':'Confirmez votre adresse e-mail pour poser vos propres questions. Les questions préparées ci-dessus fonctionnent sans cela.',
 'a.noadvice':'Cleisthenes explique ce qui a été dit au Parlement. Il ne vous dit pas comment voter.','a.opened':'Votre question est ouverte dans la discussion avec Cleisthenes.',
 's.h':'Dire où vous en êtes','s.explain.1':'Un baromètre, pas un vote. Il ne compte pour rien d’officiel.','s.pp.network':'Passport ne peut pas encore joindre le réseau de ce projet pilote. Nous l’indiquerons ici dès que ce sera possible.',
};
const DE={
 'nav.votes':'Abstimmungen',
 'pilot.chip':'Pilotprojekt · keine offizielle Abstimmung',
 'pilot.explain':'Diese Seite ist ein Pilotprojekt. Nichts hier zählt für die offizielle Abstimmung. Ihr Stimmmaterial kommt per Post von Ihrer Gemeinde.',
 'step.1':'Verstehen','step.2':'Fragen','step.3':'Sagen, wo Sie stehen','steps.label':'Schritte auf dieser Seite','step.3.hold':'noch nicht offen',
 'freshness':'Kurzinfo aktualisiert am {date}','freshness.none':'Kurzinfo in Vorbereitung',
 'meta.vote':'Abstimmung vom {date}','meta.business':'Geschäft {number}','meta.double':'Braucht das Volks- und das Ständemehr',
 'back.index':'Alle Abstimmungsvorlagen',
 'type.popular-initiative':'Volksinitiative','type.counter-proposal':'Direkter Gegenentwurf','type.optional-referendum':'Fakultatives Referendum','type.mandatory-referendum':'Obligatorisches Referendum','type.tie-breaker':'Stichfrage',
 'noun.popular-initiative':'die Initiative','noun.counter-proposal':'den Gegenentwurf','noun.default':'die Vorlage',
 'i.h':'Eidgenössische Abstimmungen','i.date':'Abstimmung vom {date}','i.open':'Kurzinfo lesen','i.prep':'Kurzinfo in Vorbereitung','i.past':'Frühere Abstimmungen',
 'card.eyebrow':'Eidgenössische Abstimmung','card.title':'Abstimmung vom {date}','card.cta':'Abstimmungsbegleiter öffnen',
 'u.question.h':'Worüber Sie abstimmen','u.title.src':'Offizieller Titel · {publisher}',
 'u.decided.h':'Was das Parlament entschieden hat','u.decided.nc':'Nationalrat','u.decided.cs':'Ständerat','u.decided.final':'Schlussabstimmung, {date}',
 'u.decided.missing':'Nicht in unseren Abstimmungsdaten. Siehe die Resultate des Rates.','u.decided.byParty':'Nach Fraktion','u.decided.group':'Fraktion',
 'u.decided.meaning':'Protokollierte Bedeutung dieser Abstimmung, in der Originalsprache','u.decided.meaning.yes':'Ein Ja bedeutete','u.decided.meaning.no':'Ein Nein bedeutete',
 'col.rec-rejection':'Empfehlung auf Ablehnung','col.rec-acceptance':'Empfehlung auf Annahme','col.against':'Gegen diese Empfehlung','col.abstained':'Enthalten','col.didNotVote':'Nicht teilgenommen','col.excused':'Entschuldigt','col.presiding':'Präsidium',
 'd.rec-rejection':{one:'1 stimmte für die Empfehlung, {noun} abzulehnen',other:'{n} stimmten für die Empfehlung, {noun} abzulehnen'},
 'd.rec-acceptance':{one:'1 stimmte für die Empfehlung, {noun} anzunehmen',other:'{n} stimmten für die Empfehlung, {noun} anzunehmen'},
 'd.against':{one:'1 stimmte gegen diese Empfehlung',other:'{n} stimmten gegen diese Empfehlung'},
 'd.meaning':{one:'1 stimmte «{meaning}»',other:'{n} stimmten «{meaning}»'},
 'd.abstained':{one:'1 enthielt sich',other:'{n} enthielten sich'},'d.didNotVote':{one:'1 nahm nicht teil',other:'{n} nahmen nicht teil'},'d.excused':{one:'1 entschuldigt',other:'{n} entschuldigt'},'d.presiding':{one:'1 im Präsidium (stimmt nicht)',other:'{n} im Präsidium (stimmen nicht)'},
 'u.args.h':'Argumente aus der Parlamentsdebatte','u.args.for':'Dafür','u.args.against':'Dagegen','u.args.side.for':'{noun} annehmen','u.args.side.against':'{noun} ablehnen',
 'u.args.note':'Jeder Satz verweist auf die Passage, aus der er stammt. Die Reihenfolge ist bei jeder Vorlage gleich: Dafür, dann Dagegen.',
 'u.cover.thin':'Das Amtliche Bulletin deckt diese Seite nur knapp ab: {k} Passagen von {m} Rednerinnen und Rednern.','u.cover.one':'Nur ein Ratsmitglied hat sich im Amtlichen Bulletin für diese Seite geäussert.','u.cover.silent':'Keine Passage im Amtlichen Bulletin argumentiert für diese Seite. Wir füllen die Lücke nicht aus anderen Quellen.',
 'u.cite.watch':'Video {start}–{end}','u.cite.aligned':'Automatisch zugeordnet, nicht von Menschen geprüft','u.cite.copy':'Zitat kopieren','u.cite.report':'Dieses Zitat melden','u.cite.open':'Im Amtlichen Bulletin öffnen',
 'u.how.h':'So ist diese Kurzinfo entstanden','u.how.rule':'Die KI liest und schreibt. Einfacher Code entscheidet, was als Beleg gilt, und hängt jede Quellenangabe an.',
 'u.report':'Problem mit dieser Kurzinfo melden','u.error':'Kurzinfo konnte nicht geladen werden.','retry':'Erneut versuchen','close':'Schliessen',
 'a.h':'Fragen zu dieser Vorlage','a.scope':'Bezogen auf {scope}','a.chip.instant':'Sofort','a.prepared.label':'Vorbereitete Fragen','a.placeholder':'Fragen, was im Parlament zu dieser Vorlage gesagt wurde','a.send':'Fragen','a.remaining':'{n} von {limit} Fragen heute übrig',
 'a.signin.title':'Anmelden, um eine eigene Frage zu stellen','a.signin.body':'Freie Fragen brauchen ein verifiziertes Konto. Alle haben 20 pro Tag und 100 pro Woche. Die vorbereiteten Fragen oben brauchen kein Konto.','a.signin.cta':'Anmelden','a.signin.later':'Jetzt nicht',
 's.h':'Sagen, wo Sie stehen','s.explain.1':'Ein Stimmungsbild, keine Abstimmung. Es zählt für nichts Offizielles.','s.pp.network':'Passport erreicht das Netzwerk dieses Pilotprojekts noch nicht. Wir melden es auf dieser Seite, sobald es geht.',
};
const IT={
 'nav.votes':'Votazioni',
 'pilot.chip':'Progetto pilota · non è una votazione ufficiale',
 'pilot.explain':'Questa pagina è un progetto pilota. Nulla qui conta per la votazione ufficiale. Il materiale di voto ufficiale arriva per posta dal suo Comune.',
 'step.1':'Capire','step.2':'Chiedere','step.3':'Esprimere la propria posizione','steps.label':'Passi di questa pagina','step.3.hold':'non ancora aperto',
 'freshness':'Sintesi aggiornata il {date}','freshness.none':'Sintesi in preparazione',
 'meta.vote':'Votazione del {date}','meta.business':'Oggetto {number}','meta.double':'Richiede la maggioranza del popolo e dei Cantoni',
 'back.index':'Tutti gli oggetti in votazione',
 'type.popular-initiative':'Iniziativa popolare','type.counter-proposal':'Controprogetto diretto','type.optional-referendum':'Referendum facoltativo','type.mandatory-referendum':'Referendum obbligatorio','type.tie-breaker':'Domanda risolutiva',
 'noun.popular-initiative':'l’iniziativa','noun.counter-proposal':'il controprogetto','noun.default':'l’oggetto',
 'i.h':'Votazioni federali','i.date':'Votazione del {date}','i.open':'Leggere la sintesi','i.prep':'Sintesi in preparazione','i.past':'Votazioni passate',
 'card.eyebrow':'Votazione federale','card.title':'Votazione del {date}','card.cta':'Aprire il compagno di voto',
 'u.question.h':'Su cosa si vota','u.title.src':'Titolo ufficiale · {publisher}',
 'u.decided.h':'Cosa ha deciso il Parlamento','u.decided.nc':'Consiglio nazionale','u.decided.cs':'Consiglio degli Stati','u.decided.final':'Votazione finale, {date}',
 'u.decided.missing':'Non nei nostri dati di voto nominale. Vedere i risultati della Camera.','u.decided.byParty':'Per gruppo parlamentare','u.decided.group':'Gruppo',
 'u.decided.meaning':'Significato registrato di questo voto, nella lingua originale','u.decided.meaning.yes':'Un voto sì significava','u.decided.meaning.no':'Un voto no significava',
 'col.rec-rejection':'Raccomandare di respingere','col.rec-acceptance':'Raccomandare di accettare','col.against':'Contro questa raccomandazione','col.abstained':'Astenuti','col.didNotVote':'Non hanno votato','col.excused':'Scusati','col.presiding':'Presidenza',
 'd.rec-rejection':{one:'1 ha votato per raccomandare di respingere {noun}',other:'{n} hanno votato per raccomandare di respingere {noun}'},
 'd.rec-acceptance':{one:'1 ha votato per raccomandare di accettare {noun}',other:'{n} hanno votato per raccomandare di accettare {noun}'},
 'd.against':{one:'1 ha votato contro questa raccomandazione',other:'{n} hanno votato contro questa raccomandazione'},
 'd.meaning':{one:'1 ha votato «{meaning}»',other:'{n} hanno votato «{meaning}»'},
 'd.abstained':{one:'1 si è astenuto',other:'{n} si sono astenuti'},'d.didNotVote':{one:'1 non ha votato',other:'{n} non hanno votato'},'d.excused':{one:'1 scusato',other:'{n} scusati'},'d.presiding':{one:'1 alla presidenza (non vota)',other:'{n} alla presidenza (non votano)'},
 'u.args.h':'Argomenti emersi in Parlamento','u.args.for':'A favore','u.args.against':'Contro','u.args.side.for':'accettare {noun}','u.args.side.against':'respingere {noun}',
 'u.args.note':'Ogni frase rimanda al passaggio da cui proviene. L’ordine è lo stesso per ogni oggetto: A favore, poi Contro.',
 'u.cover.thin':'Il Bollettino ufficiale copre poco questa posizione: {k} passaggi di {m} oratori.','u.cover.one':'Un solo membro si è espresso per questa posizione nel Bollettino ufficiale.','u.cover.silent':'Nessun passaggio del Bollettino ufficiale sostiene questa posizione. Non colmiamo il vuoto con altre fonti.',
 'u.cite.watch':'Video {start}–{end}','u.cite.aligned':'Allineamento automatico, non verificato da una persona','u.cite.copy':'Copia citazione','u.cite.report':'Segnala questa citazione','u.cite.open':'Apri nel Bollettino ufficiale',
 'u.how.h':'Come è stata fatta questa sintesi','u.how.rule':'L’IA legge e scrive. Codice semplice decide cosa conta come prova e allega ogni citazione.',
 'u.report':'Segnala un problema in questa sintesi','u.error':'Impossibile caricare questa sintesi.','retry':'Riprova','close':'Chiudi',
 'a.h':'Chiedere su questo oggetto','a.scope':'Limitato a {scope}','a.chip.instant':'Immediato','a.prepared.label':'Domande preparate','a.placeholder':'Chieda cosa è stato detto in Parlamento su questo oggetto','a.send':'Chiedi','a.remaining':'{n} domande su {limit} rimaste oggi',
 'a.signin.title':'Accedere per porre una domanda propria','a.signin.body':'Le domande libere richiedono un account verificato. Ognuno ha 20 domande al giorno e 100 alla settimana. Le domande preparate qui sopra non richiedono un account.','a.signin.cta':'Accedi','a.signin.later':'Non ora',
 's.h':'Esprimere la propria posizione','s.explain.1':'Un termometro, non una votazione. Non conta per nulla di ufficiale.','s.pp.network':'Passport non raggiunge ancora la rete di questo progetto pilota. Lo segnaleremo qui appena sarà possibile.',
};
export const STRINGS={en:EN,fr:FR,de:DE,it:IT};

// One string by key in the reader's language (EN fallback), with {placeholders} filled and {one,other} plurals by n.
export function vt(language,key,vars={}){
 let value=STRINGS[language]?.[key]??EN[key]??key;
 if(value&&typeof value==='object')value=vars.n===1?value.one:value.other;
 return String(value).replace(/\{(\w+)\}/g,(m,name)=>name in vars?String(vars[name]):m);
}
// The official title, verbatim, in the reader's language; English, then German, when that language is missing.
export const localTitle=(title,language)=>title?.[language]||title?.en||title?.de||'';
export const typeLabel=(type,language)=>STRINGS[language]?.['type.'+type]||EN['type.'+type]||String(type||'');
export const objectNoun=(type,language)=>vt(language,['popular-initiative','counter-proposal'].includes(type)?'noun.'+type:'noun.default');
const dateLocale=language=>({en:'en-GB',fr:'fr-CH',de:'de-CH',it:'it-CH',rm:'de-CH'})[language]||'en-GB';
// Dates as the reader writes them; a bare YYYY-MM-DD is read at Swiss noon so it never slips a day.
export function formatDate(value,language){
 if(!value)return '';const d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(value)?value+'T12:00:00Z':value);
 return Number.isNaN(d.getTime())?String(value):new Intl.DateTimeFormat(dateLocale(language),{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Zurich'}).format(d);
}
export const zurichToday=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);

// "What Parliament decided", never as a bare Yes/No: the counts are mapped through the recorded meaning of the
// chamber vote (spec 8.2). 'unclear' shows the recorded meanings verbatim, with no reading of our own.
export function decisionSummary(vote,type,language){
 if(!vote?.counts)return null;
 const c=vote.counts,noun=objectNoun(type,language),mode=['recommend-rejection','recommend-acceptance'].includes(vote.yesMeans)?vote.yesMeans:'unclear';
 const main=mode==='unclear'
  ?[vt(language,'d.meaning',{n:c.yes,meaning:vote.meaningYes||'—'}),vt(language,'d.meaning',{n:c.no,meaning:vote.meaningNo||'—'})]
  :[vt(language,mode==='recommend-rejection'?'d.rec-rejection':'d.rec-acceptance',{n:c.yes,noun}),vt(language,'d.against',{n:c.no})];
 main.push(vt(language,'d.abstained',{n:c.abstained||0}));
 const extra=['didNotVote','excused','presiding'].filter(k=>c[k]>0).map(k=>vt(language,'d.'+k,{n:c[k]}));
 return {mode,main,extra,sentence:main.join(' · '),meaning:{yes:vote.meaningYes||null,no:vote.meaningNo||null}};
}
// The language a roll-call record was written in, read from its subject ("Vote final", "Schlussabstimmung"…), so
// the recorded meanings are marked up in their own language; unknown stays unmarked rather than guessed.
export function recordLanguage(subject){
 const s=String(subject||'').trim().toLowerCase();
 return s==='vote final'?'fr':s==='schlussabstimmung'?'de':s==='votazione finale'?'it':undefined;
}
// Column headings for the party-group table, mapped the same way as the sentence above.
export function decisionColumns(vote,language){
 const mode=vote?.yesMeans;
 const clip=s=>{const v=String(s||'—');return v.length>34?v.slice(0,33).replace(/\s+\S*$/,'')+'…':v;};
 const yes=mode==='recommend-rejection'?vt(language,'col.rec-rejection'):mode==='recommend-acceptance'?vt(language,'col.rec-acceptance'):'«'+clip(vote?.meaningYes)+'»';
 const no=['recommend-rejection','recommend-acceptance'].includes(mode)?vt(language,'col.against'):'«'+clip(vote?.meaningNo)+'»';
 return [{key:'yes',label:yes},{key:'no',label:no},{key:'abstained',label:vt(language,'col.abstained')},{key:'didNotVote',label:vt(language,'col.didNotVote')},{key:'excused',label:vt(language,'col.excused')},{key:'presiding',label:vt(language,'col.presiding')}];
}
// Party groups in one fixed order (official group code), whatever the counts: no row order implies a winner.
export const orderGroups=groups=>[...(groups||[])].sort((a,b)=>String(a.code).localeCompare(String(b.code),'en'));

// Coverage labels above a side (spec section 5); 'full' needs no label.
export function coverageNote(coverage,language){
 const level=coverage?.level;
 if(level==='thin')return vt(language,'u.cover.thin',{k:coverage.passages??0,m:coverage.speakers??0});
 if(level==='one-voice')return vt(language,'u.cover.one');
 if(level==='silent')return vt(language,'u.cover.silent');
 return null;
}
// The brief's arguments in the reader's language, else English, else German.
export function briefLanguage(brief,language){
 const available=brief?.languages||{};
 const code=[language,'en','de','fr','it'].find(l=>available[l]);
 return code?{code,sides:available[code]}:null;
}
// A prepared answer for the reader's language, else English, else the first one stored.
export function preparedFor(item,language){
 const answers=item?.answers||{},code=[language,'en',...Object.keys(answers)].find(l=>answers[l]);
 return code?{code,answer:answers[code],question:item.question?.[language]||item.question?.en||item.question?.[code]||''}:null;
}
export const clock=seconds=>{const n=Math.max(0,Math.floor(Number(seconds)||0));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};

// Plain-text citation for "Copy citation": the quote in its original language, who said it, where and when.
export function citationText(c,{language='en',pageUrl}={}){
 const detail=[c.role,c.group].filter(Boolean).join(', '),who=c.speaker?(detail?`${c.speaker} (${detail})`:c.speaker):detail;
 const where=[chamberLabel(c.chamber,language),formatDate(c.date,language)].filter(Boolean).join(', ');
 return [`“${String(c.quote||'').trim()}”`,`— ${[who,where].filter(Boolean).join(', ')}`,c.officialUrl&&`${vt(language,'u.cite.open')}: ${c.officialUrl}`,pageUrl&&`Cleisthenes Vote Companion: ${pageUrl}`].filter(Boolean).join('\n');
}
export function chamberLabel(chamber,language){
 const v=String(chamber||'').trim(),k=v.toLowerCase();
 if(['n','nr','nc','national council','conseil national','nationalrat','consiglio nazionale'].includes(k))return vt(language,'u.decided.nc');
 if(['s','sr','cs','council of states','conseil des états','conseil des etats','ständerat','consiglio degli stati'].includes(k))return vt(language,'u.decided.cs');
 return v;
}
// "Report" opens the reader's email app with the object and citation named in the subject; nothing personal is added.
export function reportMailto({objectId,citationId,businessNumber}){
 const subject=`Vote Companion report · object ${objectId}${citationId?` · citation ${citationId}`:''}`;
 const body=`Object: ${objectId}${businessNumber?` (business ${businessNumber})`:''}\n${citationId?`Citation: ${citationId}\n`:''}\nWhat looks wrong:\n`;
 return `mailto:contact@midnight.vote?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
// Index: the next vote date (today or later, Zurich time), later ones, and past dates (newest first).
export function splitVoteDates(dates,today=zurichToday()){
 const sorted=[...(dates||[])].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const upcoming=sorted.filter(d=>d.date>=today),past=sorted.filter(d=>d.date<today).reverse();
 return {next:upcoming[0]||null,later:upcoming.slice(1),past};
}
