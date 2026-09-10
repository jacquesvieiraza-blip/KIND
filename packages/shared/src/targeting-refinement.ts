// ═══════════════════════════════════════════════════════════════════════════════════════
// WHAT MILLA SAYS WHEN A TARGETING CHANGE DOES NOT LAND — and what she says when it does.
//
// ── THE LIVE DEFECT (canary, 10 Sep) ────────────────────────────────────────────────────
//
// `MillaConversation.send()` collapsed EVERY failure into one sentence:
//
//     "I hit a snag reaching the engine — please try again in a moment."
//
// Four different things reach that line, and only one of them is a snag:
//
//   1. 409 `existing_pending_targeting` — a change is already waiting for review. Retrying
//      is exactly wrong: the server refuses again, forever, and the client is invited to
//      keep pressing.
//   2. 409 `targeting_state_changed`   — the row moved under the request. Nothing was
//      written; their proposal is still good, it just needs re-applying to the fresh state.
//   3. A real 5xx or no answer at all  — the one case where "try again" is true.
//   4. A validation refusal            — the request itself was wrong; trying again
//      unchanged cannot help.
//
// The client was also told to "try again in a moment" while their typed message had already
// been cleared from the composer and, on the save path, the server's raw `error` string was
// printed straight into the transcript — which is how `Server error (502)` reaches a
// customer's screen in Milla's voice.
//
// ── 🛑 WHY THE COPY LIVES HERE AND NOT IN THE COMPONENT ─────────────────────────────────
//
// A sentence a client reads about their own money and their own targeting is a rule, not
// decoration — and a rule inlined in a React component is a rule nothing can prove. Same
// reason `client-honesty.ts` exists beside this file: two of the sentences there were
// provably wrong while they were inline.
//
// ⚠️ AND THE RETRY DECISION IS PART OF THE SAME MODULE. Which failures may be re-sent is
// the same fact as which sentence is true about them, and splitting them is how a screen
// ends up retrying a refusal.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The two machine-readable codes `/icps/revise` answers 409 with.
 *
 * ⚠️ THESE MUST MATCH THE SERVER'S CONSTANTS BYTE FOR BYTE — `icps.ts` declares them as
 * `EXISTING_PENDING_TARGETING` and `TARGETING_STATE_CHANGED`, and its own comment says
 * "Stable — never reword it". `targeting-refinement.test.ts` asserts the two spellings
 * against that file, so a rename there fails here rather than silently sending a client the
 * fallback sentence.
 */
export const REVISE_PENDING_CODE = 'existing_pending_targeting'
export const REVISE_STATE_CHANGED_CODE = 'targeting_state_changed'

/** What a failed attempt looked like, as the transport reports it. */
export type RefinementFailure = {
  /** `lib/api.ts` sets 0 when `fetch` itself rejected, otherwise the HTTP status. */
  status?: number | null
  /** The server's `code` field, when it sent one. Never the prose. */
  code?: string | null
}

/**
 * 🛑 MAY THIS REQUEST BE SENT AGAIN?
 *
 * ⚠️ A 4xx IS THE SERVER DECIDING, AND A DECISION IS NEVER RE-ASKED. Re-sending a 409
 * produces the identical 409, so a retry there is not resilience — it is a screen arguing
 * with a refusal on the client's behalf. Only "no answer about this request" is retryable:
 * status 0 (the request never completed) and 5xx (the server broke before deciding).
 *
 * This mirrors `lib/proof-start.ts`'s `classifyClaimFailure`, deliberately: the two are the
 * same distinction about the same transport, and a second, differently-drawn line between
 * "decided" and "unknown" is how two screens disagree about one failure.
 */
export function isRetryableOnce(status: number | null | undefined): boolean {
  if (status === null || status === undefined) return true   // nothing to go on → unknown
  if (status === 0) return true
  return status >= 500
}

/**
 * How many times one client action may re-send itself. ONE.
 *
 * ⚠️ AND THE RETRY IS ONLY SAFE BECAUSE THE ROUTE IS IDEMPOTENT. A lost response does not
 * mean a lost write: the first request may have committed. `/icps/revise` compares the
 * incoming targeting against the row it would write and returns the existing row untouched
 * when they match, so the second attempt cannot mint a second ICP version, re-stamp a
 * waiting revision or fire a second founder alert. Raising this number would not break that
 * property — it would just keep asking a server that is already answering "no answer".
 */
export const REFINEMENT_RETRIES = 1

/**
 * The sentence the client reads. Founder-locked wording for the first three.
 *
 * ⚠️ IT NEVER CARRIES THE SERVER'S OWN TEXT, AND NEVER AN HTTP STATUS. Printing `e.message`
 * is what put `Server error (502)` and internal review vocabulary in Milla's voice. The
 * server's `code` selects a sentence; the server's prose is for our logs.
 *
 * ⚠️ AND THERE IS NO "SOMETHING WENT WRONG" DEFAULT THAT INVITES A RETRY. The last branch is
 * a refusal we cannot classify: it says the targeting is untouched, which is true on every
 * path that reaches it, and it does not promise a review nobody has been told to do.
 */
export function refinementFailureMessage(f: RefinementFailure): string {
  const code = (f.code ?? '').trim()
  if (code === REVISE_PENDING_CODE) {
    return 'I already have a targeting change waiting to be resolved, so I won’t stack another one on top. I’ll get this reviewed properly.'
  }
  if (code === REVISE_STATE_CHANGED_CODE) {
    return 'Your targeting changed while I was working. I’ve kept your request — here is the latest version so we can apply it cleanly.'
  }
  if (isRetryableOnce(f.status)) {
    // ⚠️ REACHED ONLY AFTER THE ONE RETRY HAS ALSO FAILED. Saying "try once more" before
    // we have tried once more would be asking the client to do our retry for us.
    return 'I couldn’t reach the engine. Your changes are still here — try once more.'
  }
  return 'I couldn’t save that change, so your targeting is exactly as it was. Try once more, and tell me if it still won’t save.'
}

/**
 * The same distinction for a CHAT turn, which is not a save.
 *
 * ⚠️ A SEPARATE SENTENCE BECAUSE IT IS A SEPARATE FACT. `refinementFailureMessage` talks
 * about targeting that did or did not get written; a failed turn wrote nothing and was never
 * going to. Using the save copy here would tell a client their targeting is "exactly as it
 * was" after a question that never touched it — which is true and reads as though it might
 * not have been.
 *
 * ⚠️ AND IT NAMES WHERE THEIR WORDS ARE. The composer is cleared the moment a turn is sent,
 * so the old collapse said "please try again in a moment" to a client whose message had
 * already been thrown away. The component restores it; this sentence says so.
 *
 * ⚠️ THE RETRY HERE IS THE CLIENT'S, DELIBERATELY. `POST /milla/sessions/:id/chat` PERSISTS
 * both the client's message and Milla's reply, so it is not idempotent: an automatic re-send
 * after a lost response would write the same question twice and answer it twice. The
 * targeting save can be retried for us because `/icps/revise` compares before it writes;
 * this cannot, so it asks.
 */
export function chatFailureMessage(status: number | null | undefined): string {
  return isRetryableOnce(status)
    ? 'I couldn’t reach the engine just then. Your message is still in the box — send it once more.'
    : 'I couldn’t answer that just then. Your message is still in the box.'
}

// ── THE TRUTHFUL DIFF ───────────────────────────────────────────────────────────────────
//
// 🛑 WHAT THIS REPLACES. On success the transcript said, for every revision:
//
//     "Updated — this is your live targeting now, and we've been told so we can re-check
//      who's already in your campaign."
//
// True, and it names nothing. A client who asked for one industry to change cannot tell
// from it whether we changed the industry, changed something else, or changed nothing —
// and the one failure mode that matters here is a change that silently did not happen.
//
// ⚠️ EVERY CLAUSE IS DERIVED FROM TWO OBSERVED STATES, so a sentence claiming a change the
// row does not carry is not expressible. `null` from `targetingChangeSentence` means
// "nothing changed", which the caller must SAY — never paper over with the old sentence.

/** The targeting fields a client can revise. `icpSchema`'s list fields, in reading order. */
export const TARGETING_FIELDS = [
  'industries', 'geographies', 'job_titles', 'seniority_levels', 'company_sizes',
  'tech_stack', 'keywords',
] as const

export type TargetingField = (typeof TARGETING_FIELDS)[number]

/** What a client calls each one. No column names, no internal vocabulary. */
const FIELD_LABEL: Record<TargetingField, string> = {
  industries: 'industry',
  geographies: 'country',
  job_titles: 'job title',
  seniority_levels: 'seniority',
  company_sizes: 'company size',
  tech_stack: 'technology',
  keywords: 'keyword',
}

/**
 * A size band is a headcount, and the number alone does not say so.
 *
 * ⚠️ PRESENTATION ONLY — the stored value is untouched. "kept the 10–50 filters" reads as
 * a quantity of filters; "10–50 employees" reads as what it is.
 */
function renderValues(field: TargetingField, values: string[]): string {
  const out = field === 'company_sizes' ? values.map(v => `${v} employees`) : values
  return joinList(out)
}

/** "A", "A and B", "A, B and C" — no Oxford comma, matching the founder's own sentence. */
export function joinList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]!
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]!}`
}

export type TargetingLists = Partial<Record<TargetingField, unknown>>

/** One field's verdict. `kept` carries values; the others carry what moved. */
export type FieldChange =
  | { field: TargetingField; kind: 'changed'; from: string[]; to: string[] }
  | { field: TargetingField; kind: 'added'; to: string[] }
  | { field: TargetingField; kind: 'removed'; from: string[] }
  | { field: TargetingField; kind: 'kept'; values: string[] }

const clean = (v: unknown): string[] => (Array.isArray(v) ? v : [])
  .map(x => (typeof x === 'string' ? x.trim() : ''))
  .filter(x => x.length > 0)

/**
 * ⚠️ ORDER-INSENSITIVE, CASE-SENSITIVE. The builder can hand back the same set in a
 * different order and that is not a change the client asked for — but "Fintech" and
 * "fintech" are different values in the closed lists, and quietly treating them as equal
 * would hide a real edit.
 */
function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const x = [...a].sort(), y = [...b].sort()
  return x.every((v, i) => v === y[i])
}

/**
 * What actually changed between the targeting we hold and the targeting they asked for.
 *
 * @param before the state ON THE SERVER'S ROW. Never a value the browser remembered — the
 *               whole point is to compare against what is really stored.
 */
export function diffTargeting(before: TargetingLists, after: TargetingLists): FieldChange[] {
  const out: FieldChange[] = []
  for (const field of TARGETING_FIELDS) {
    const from = clean(before[field]), to = clean(after[field])
    if (sameSet(from, to)) {
      // An empty field that stayed empty is not a filter, so there is nothing to have kept.
      if (to.length > 0) out.push({ field, kind: 'kept', values: to })
      continue
    }
    if (from.length === 0) { out.push({ field, kind: 'added', to }); continue }
    if (to.length === 0) { out.push({ field, kind: 'removed', from }); continue }
    out.push({ field, kind: 'changed', from, to })
  }
  return out
}

/** Did anything at all move? The caller needs this before it claims a change. */
export function targetingUnchanged(changes: FieldChange[]): boolean {
  return changes.every(c => c.kind === 'kept')
}

/** What Milla says when the request matched what we already hold. */
export const TARGETING_UNCHANGED_SENTENCE =
  'That’s exactly what your targeting already says, so I’ve left it alone — nothing changed.'

/**
 * 🛑 IS THE CHANGE IN EFFECT, OR WAITING?
 *
 * ⚠️ THIS IS NOT A TONE CHOICE, IT IS THE DIFFERENCE BETWEEN TRUE AND FALSE. A LIVE client's
 * revision is PARKED for review (`/icps/revise`'s hold branch, the 22-Aug lock) and the
 * transcript told them "Updated — this is your live targeting now" regardless, because the
 * component never read `pending_review`. A past-tense diff on that path would restate the
 * same false claim in more detail.
 */
export type ChangeMood = 'applied' | 'requested'

const VERB: Record<'changed' | 'added' | 'removed', Record<ChangeMood, string>> = {
  changed: { applied: 'changed', requested: 'change' },
  added:   { applied: 'added',   requested: 'add' },
  removed: { applied: 'removed', requested: 'remove' },
}

/**
 * ONE sentence, naming every move and nothing else.
 *
 * @returns null when nothing moved. ⚠️ The caller must then say so
 *          (`TARGETING_UNCHANGED_SENTENCE`) rather than falling back to a sentence that
 *          implies an update — a client who is told "updated" when nothing changed will
 *          stop asking for the change they wanted.
 */
export function targetingChangeSentence(
  changes: FieldChange[], mood: ChangeMood = 'applied',
): string | null {
  if (targetingUnchanged(changes)) return null
  const clauses: string[] = []
  for (const c of changes) {
    if (c.kind === 'changed') {
      clauses.push(`${VERB.changed[mood]} the ${FIELD_LABEL[c.field]} from ${renderValues(c.field, c.from)} to ${renderValues(c.field, c.to)}`)
    } else if (c.kind === 'added') {
      clauses.push(`${VERB.added[mood]} a ${FIELD_LABEL[c.field]} filter of ${renderValues(c.field, c.to)}`)
    } else if (c.kind === 'removed') {
      // ⚠️ NAMED, NOT GLOSSED. Dropping a filter widens who we look at, which is the change
      // a client is most likely to have not intended — so it is stated, with what it was.
      clauses.push(`${VERB.removed[mood]} the ${FIELD_LABEL[c.field]} filter of ${renderValues(c.field, c.from)}`)
    }
  }
  const kept = changes.filter((c): c is Extract<FieldChange, { kind: 'kept' }> => c.kind === 'kept')
  // Each clause carries its own verb, so several can sit in one sentence without one verb
  // being made to describe a move of a different kind.
  const moved = clauses.join(', ')
  const opener = mood === 'applied' ? 'I’ve' : 'You’ve asked me to'
  if (kept.length === 0) return `${opener} ${moved}.`
  const keptValues = kept.flatMap(c => (c.field === 'company_sizes' ? c.values.map(v => `${v} employees`) : c.values))
  const keeper = mood === 'applied' ? 'kept' : 'keep'
  return `${opener} ${moved} and ${keeper} the ${joinList(keptValues)} filters.`
}
