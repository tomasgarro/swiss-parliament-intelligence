# Vote Companion: spec and technical review

Status: draft for build, 24 September 2026. The product spec (sections 1–7) was drafted with Fable 5.1 from
our product context and approved by Tomas as the default for the build. Section 8 is the technical review:
it checks the spec against the referendum contracts and our data, and it overrides the spec wherever the
two disagree.

Decisions already taken:
- Build **Understand and Ask first**. Hold **Say where you stand** until Passport can reach the app's
  network and section 6 has been reworked for commit–reveal (see 8.1).
- **Briefs and their prepared questions are public** (cached, no per-view cost). Free questions need a
  verified account (20 a day, 100 a week).
- The section 7 recommendations are the defaults unless section 8 says otherwise.

## 1. Product brief

**Problem.** Federal votes are hard to read, and the people who explain them are not trusted. About half
of eligible voters take part in popular votes (BFS). Trust in the federal government is high, but trust in
media and parties, the main explainers, is low (OECD 2024). The official material is neutral but long; the
quick explainers are short but partisan. Nobody offers a short, neutral brief where every sentence can be
checked.

**What Vote Companion does.** One page per vote object with three steps:
- a neutral, cited brief with Parliament's roll-call counts (Understand);
- Cleisthenes scoped to that object (Ask);
- an anonymous, non-binding temperature check on midnight.vote (Say where you stand).

**Users**

| User | Situation | Needs from the page | Steps |
| --- | --- | --- | --- |
| Occasional voter (primary) | Swiss resident 18+, votes some of the time, reads on a phone | A five-minute brief they can trust; one place to ask "what does this actually change?" | All three |
| Returning voter | Came back for the next vote date | The new objects, what changed since the last brief, a fast path to Ask | All three |
| Journalist or teacher | Under time pressure | Exact quotes, speaker, date, roll-call counts, links that survive scrutiny | Understand, Ask |
| Skeptic of AI explainers | Assumes the AI will editorialise | Proof of method, the source of every sentence, a way to report a problem | Understand, then Ask |

Say where you stand is open to adult Swiss citizens only, including citizens abroad, because Passport
proves nationality and age. Understand and the prepared questions are public. Free questions need a
verified account.

| It is | It is not |
| --- | --- |
| A cited brief built from Parliament's own record | A voting recommendation |
| Parliament's roll-call counts, as recorded | A forecast of the popular vote |
| A question box scoped to one vote object | A general chatbot or a news summary |
| A non-binding temperature check among people who chose to answer | A poll with a sample, or an official ballot |

**Success metrics, first 30 days.** Measured from aggregate logs, with no per-person tracking. The targets
are provisional.

| Metric | Measure | Target |
| --- | --- | --- |
| Evidence engagement | Brief views with at least one citation opened | ≥ 40% |
| Read-through | Brief views reaching "What Parliament decided" | ≥ 60% |
| Ask conversion | Brief views followed by at least one question | ≥ 15% |
| Record-silent rate | Free questions answered "the record doesn't cover this" | Track; above 30%, the scope needs work |
| Guardrail rate | Free questions refused as advice or prediction | Track weekly |
| Limit hits | Active accounts reaching 20 questions in a day | < 5% |
| Temperature-check completion | "Say where you stand" taps that reach the receipt | ≥ 50% once Passport works |
| Corrections | Reports per 1,000 brief views; median time to fix | Median fix within 48 h |

## 2. User journeys (summary)

All journeys land on the same vote page. Each step stands on its own, and nothing pushes a reader towards
step 3.

- **First-time visitor.** Opens a link, reads the ballot question and the chamber counts, opens a citation,
  and taps a prepared chip for an instant answer with no sign-in. Typing their own question leads to a
  sign-in sheet that explains why.
- **Returning voter.** Finds the next vote date, sees "Brief updated [date]" and asks a follow-up within
  their allowance.
- **Journalist.** Counts by chamber and party group, "Copy citation", and deep links to one citation.
- **Skeptic.** "How this brief was made" shows the rule (AI reads and writes; code decides evidence), the
  model and the date. A voting-advice question gets a refusal plus alternatives, and a loaded question gets
  what both sides said.

## 3. Screens and states (mobile first)

One scrolling page per vote object. Its steps are anchored sections, each with its own link. Briefs are
generated ahead of time and cached; only Ask runs live. Both sides of the argument use the same colour and
type style.

- **S0 Index.** The next vote date with one card per object (short title, type, "Brief updated"), and past
  dates collapsed. States: loading, no date announced, object without a brief.
- **S1 Header.** Title, date, type, the "Pilot · not an official ballot" chip, the step rail and the
  freshness line.
- **S2 Understand.** It contains:
  - "What you're voting on": the ballot question quoted verbatim from the official publication, never an
    AI sentence;
  - "What Parliament decided": chamber rows and a party-group table, **mapped to the ballot's sides** (see
    8.2);
  - "Arguments made in Parliament": For, then Against, up to four sentences each, each with a citation
    pill;
  - the citation sheet: original quote, labelled translation, speaker, role, party, date, official link, an
    auto-aligned video moment, Copy, Report;
  - "How this brief was made";
  - "Report a problem".

  States: loading, record silent, one side thin, one chamber missing, out of date, error.
- **S3 Ask.** A scope chip, 4–6 "Instant" prepared chips (public), and a question field with the remaining
  allowance. The answer card streams its steps. States: signed out, loading, record silent, refused
  (advice or prediction), off scope, daily limit, weekly limit, sources only, error.
- **S4 Say where you stand.** Explanation card → Passport handoff → Yes / No / Undecided → review → sending
  → receipt (participation only). States: Passport not installed, wrong network, declined, timed out, not
  eligible, already answered, busy, failed, closed. **Must be reworked for commit–reveal (8.1).**
- **S5 Results.** The count first. Bars only above a threshold, the same colour for every option, fixed
  order, the "not a poll, not a forecast" label, and "who could answer". The official result goes in a
  separate card. **No live "so far" view is possible under commit–reveal (8.1).**

## 4. Microcopy

English is the source of truth, with stable keys. There are no exclamation marks. German uses Swiss
spelling and "Sie"; French uses "vous"; Italian uses the formal register. The full string tables (EN, plus
the key strings in DE/FR/IT) are in the Fable draft; a native speaker must read them before release. Key
rules:
- the pilot chip is on every screen;
- the refusal strings offer alternatives: the arguments, the counts, the temperature check;
- the limit strings give the reset time;
- the result views never use "leads", "ahead", "winning", "projected", "trend", "poll", "survey", or
  "result" before the official one.

## 5. Neutrality rules for the brief

**Sides come from the ballot question, not from parties.** For = Yes to the ballot question. Against = No.

| Object type | For | Against |
| --- | --- | --- |
| Popular initiative | Accept the initiative | Reject it (Parliament's recommendation to reject does not move the initiative to Against) |
| Counter-proposal | Accept the counter-proposal | Reject it |
| Optional referendum on a law | Accept the law | Reject it (the referendum committee is on Against) |
| Mandatory referendum | Accept the amendment | Reject it |

**Assigning passages to a side.** A passage belongs to a side by what it argues, as confirmed by the check
step. Code then cross-checks it against the speaker's final vote, mapped to the ballot's sides; when the two
disagree, the passage is not used. A Federal Councillor's speech is labelled "Federal Council".

**Code enforces:**
- up to 4 arguments per side, near-duplicates merged;
- selection by distinctness, then party-group spread, then recency;
- equal numbers when both sides have enough;
- never pad a thin side or trim the fuller one;
- word counts within 20% of each other;
- the order For then Against, and by debate date within a side;
- one argument sentence of at most 30 words, in reported speech, ending in its citation;
- banned verbs: warned, claimed, admitted, insisted, conceded, and adverbs of degree;
- numbers only from the vote record or inside a quote;
- one speaker-label format;
- quotes in their original language with a labelled translation.

**The reviewer checks:** that every citation says what the sentence says, the same verbs on both sides, no
judgement words, coverage labels that match the counts, and nothing that advises, predicts or says who is
right.

**Coverage labels** (thresholds to tune):

| Coverage | Condition | Label |
| --- | --- | --- |
| Full | ≥ 4 supported claims from ≥ 3 speakers | none |
| Thin | 1–3 claims, or fewer than 3 speakers | "The record covers this side thinly: {k} passages from {m} speakers." |
| One voice | All claims from one speaker | "Only one member spoke for this side in the record." |
| Silent | No supported claim | "No passage in the record argues this side. We don't fill the gap from other sources." |

**Review before going live:** one named reviewer per language, a checklist of under ten minutes, versioned
briefs, and a public corrections log.

## 6. Temperature check (as drafted; superseded in part by 8.1)

As drafted:
- the ballot question verbatim, then "Where do you stand today?" with Yes / No / Undecided;
- one answer per person per object, which can't be changed;
- it closes 18:00 on the Friday before the vote (to be confirmed with counsel);
- the receipt shows participation and time only;
- results show the count first, with shares only from 100 answers;
- no time series, no breakdowns, and the official result in a separate card.

Abuse mitigations: a nullifier per person per object, no transaction id in the receipt, a random relay delay,
no join with Cleisthenes accounts, 24-hour log rotation, a relayer queue, and a published contract address
with a recount script.

## 7. Decisions (defaults)

1. Understand and Ask first. Step 3 shows "Passport can't reach this pilot's network yet", with no demo
   mode on the public page.
2. Prepared questions need no sign-in.
3. The ballot question is ingested verbatim from the official publication. Until then, link only and never
   paraphrase.
4. Council of States roll calls: verify coverage. **Result: not in our data (8.2).**
5. The Passport nullifier and renewed passports. **Reframed in 8.1.**
6. The receipt shows participation and time only. Retire the transaction-id receipt for this feature.
7. Shares from 100 answers. ~~Hourly refresh~~ (there's no live tally under commit–reveal).
8. Close 18:00 on the Friday before the vote, to be confirmed with counsel. **See 8.1 on reveal timing.**
9. Offer Undecided.
10. No answer changes in v1.
11. One named reviewer per language, versioned briefs, public corrections.
12. Show video moments labelled auto-aligned, with a report link. Hide low-confidence alignments (we store
    `matchedFraction` ≥ 0.85 for every published moment).
13. Always show the original quote plus a labelled translation.
14. Generate one brief per object per session import, cached. Ask stays within the allowances.

## 8. Technical review (overrides the spec where they disagree)

### 8.1 Midnight: checked against `contracts/referendum-v2/referendum-v2.compact` and the Compact privacy rules

| # | Spec assumed | The contract actually does | Consequence |
| --- | --- | --- | --- |
| 1 | The choice is visible per transaction; a live "so far" tally | **Commit–reveal.** `castVote` discloses the nullifier; the ballot commitment goes into a `HistoricMerkleTree`, whose inserted values stay hidden. The tally changes only in `revealVote`, after `closeVote`. | No live results while voting is open. S5 exists only during and after the reveal window. |
| 2 | Close Friday 18:00 so it doesn't look like an exit poll | Reveals, and so results, come after the close, i.e. on the vote weekend. | Open the reveal window only after the official result (Sunday evening). The sealed `revealClosesAtUnix` makes the window explicit. |
| 3 | "The choice is not kept on the device" | A ballot counts only if its (choice, salt) opening is revealed later. | The device must keep the opening and auto-reveal, or hand it to a revealer service (added trust). Choose one before building S4. |
| 4 | The receipt can't prove the choice | Whoever holds (choice, salt) can show the commitment in `revealedCommitments`. | Receipt-freeness isn't achievable under commit–reveal. Acceptable for a non-binding check; state it. |
| 5 | Reveals don't link to voters | Correct. The cast commitment was hidden, so a reveal can't be matched to its `castVote` by value, only through metadata. | Apply the random delay to reveals too. |
| 6 | "What is the Passport nullifier derived from?" | The nullifier is `persistentHash([domain, voterSecret, eventId])`, from the app-held secret. One per passport is enforced **off-chain**: Rarimo's uniqueness proof (timestamp upper bound) plus the issuer before a credential enters the registry. | Ask Midnight/Rarimo whether a renewed passport can register again, and what cutoff is used. |
| 7 | Trust rests on Passport chip authentication | Trust also rests on the credential issuer and the root-publisher key. There are no cross-contract calls, so a compromised publisher could admit a fabricated root; that's detectable only off-chain via `attestCurrentRoot`. | Name this in "How this works". |
| 8 | Prove on-device where possible | The browser proves `castVote`, and the relayer only balances and rejects witness fields ✓. But the UI's proof server defaults to `localhost:6300`, which phones don't run. | Decide: a hosted proof server (it sees the choice and `voterSecret`; must be named and trusted) or wallet-delegated proving. |
| 9 | Passport and the app are on different networks | Consistent: Passport is on stagenet, the app on Preview. | ✓ Hold step 3. |
| 10 | Relayer queue needed | The single DUST coin fails on back-to-back submits. | ✓ Queue plus more than one funded coin before launch. |

The deployment unit is one contract per vote object (`eventId`). The schedule is sealed and enforced
on-chain with `blockTime`.

### 8.2 Data: checked against `data/parliament.sqlite` (24 September 2026)

- **Roll calls cover the National Council only.** Voting rows are per member (about 190 of 200 per vote)
  and there is no Council of States data. S2 shows the National Council row plus "Council of States: not in
  our roll-call data" with a link to the official results.
- **"Yes" in a chamber vote is not "Yes" on the ballot.** Example: 20250026, the final vote on 19 Dec 2025
  was Ja 115 / Nein 66 / 6 abstentions. There, *Ja* meant "Adopter le projet (recommandation de rejeter
  l'initiative)", i.e. **against** the initiative. Code must map each chamber vote to the ballot's sides
  using the recorded `meaningYes` / `meaningNo`, and show "115 for recommending rejection", never a bare
  Yes/No. Only final votes (`Vote final` / `Schlussabstimmung`) belong in "What Parliament decided";
  procedural votes (`Eintreten`, articles) do not.
- **Rows show how each member voted,** with a `decisionText` per member (Ja, Nein, Enthaltung, excused,
  did not take part, the president not voting). The party-group table is derived from each member's
  `group` at the time of the vote. The group label is recorded per row, so current membership is never
  projected backwards.
- The ballot question and the federal vote calendar are **not** in the corpus. They come from the Federal
  Chancellery's official publication, quoted verbatim with the link.
