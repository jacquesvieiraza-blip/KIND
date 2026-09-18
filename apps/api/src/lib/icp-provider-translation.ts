// ═══════════════════════════════════════════════════════════════════════════════════════
// TRANSLATING THE CLIENT'S WORDS INTO PROVIDER VOCABULARY — and what to do when we cannot.
// (S1-RT-005 · the founder's fail-soft rule.)
//
// ── THE FOUNDER'S RULE, VERBATIM IN SPIRIT ─────────────────────────────────────────────
//
//     THE CLIENT SPEAKS NATURALLY.
//     THE CLIENT NEVER HAS TO SPEAK APOLLO.
//     PROVIDER TRANSLATION IS OUR PROBLEM, NOT THEIRS.
//
// ── WHAT STOOD BEFORE, AND WHY IT STRANDED PEOPLE ──────────────────────────────────────
//
// Three fields on the ICP are CLOSED PROVIDER VOCABULARIES — `industries`,
// `seniority_levels`, `company_sizes`. `boundedEnum` canonicalised against them and then:
//
//   · a MIXED list kept its valid values and dropped the rest — fine;
//   · a list where EVERY value was off-list returned `z.NEVER`, failing the whole reply.
//
// The second branch was written for a real reason and the reasoning was sound as far as it
// went: an empty closed list means UNCONSTRAINED downstream (`buildPdlBody` adds no filter
// for a list with no length), so turning "agencies and consultancies" into `[]` would
// silently widen the search to everybody and spend the client's money on it.
//
// 🛑 BUT THE CONCLUSION WAS WRONG, AND A LIVE CLIENT PAID FOR IT. Refusing the reply means
// the CLIENT is refused — "Milla didn't catch that", deterministically, for describing their
// own market in their own words. The client did nothing wrong. Our sixteen-value industry
// list did. Between "widen the search silently" and "refuse the client" there is a third
// answer, and it is the one the founder asked for: KEEP THEIR WORDS, TRANSLATE NOTHING WE
// CANNOT PROVE, AND PUT IT IN FRONT OF A HUMAN BEFORE ANYTHING IS SPENT.
//
// ── SO THIS MODULE HAS EXACTLY ONE JOB ─────────────────────────────────────────────────
//
// Split a client's list into: what we could canonicalise, and what we could not. Neither
// half is discarded and neither half is guessed. The caller stores the canonical half in the
// provider column, the un-canonicalised half as the review requirement, and — when anything
// is unresolved — refuses Proof until a person has translated it.
//
// ⚠️ THIS FILE DECIDES NOTHING ABOUT AUTHORITY. It reports what could and could not be
// translated. Whether that blocks Proof is `icpNeedsReview` below plus the server gate that
// calls it; whether a value is legitimate is the canonical list, unchanged.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The three closed provider vocabularies, and the ONLY three. A fourth costs a code change. */
export type ProviderField = 'industries' | 'seniority_levels' | 'company_sizes'

export const PROVIDER_FIELDS: readonly ProviderField[] = [
  'industries', 'seniority_levels', 'company_sizes',
] as const

/** What an operator is asked, per field. Plain English — Vida shows these, not field names. */
export const PROVIDER_FIELD_LABEL: Record<ProviderField, string> = {
  industries:       'Industry',
  seniority_levels: 'Seniority',
  company_sizes:    'Company size',
}

/**
 * 🛑 THE THREE CLOSED PROVIDER VOCABULARIES — ⚑ 18 Sep (J5-C10), ONE HOME AT LAST.
 *
 * ── WHY THEY MOVED HERE ─────────────────────────────────────────────────────────────────
 *
 * There were TWO copies: `routes/icps.ts` kept them module-private as `ICP_INDUSTRIES` /
 * `ICP_SENIORITY` / `ICP_SIZES`, and `routes/operator.ts` re-declared them as
 * `ICP_REVIEW_VOCABULARIES` with a comment explaining that importing a 5,000-line router to
 * reach three arrays was worse than a copy, plus a drift guard asserting the two byte-identical.
 * That reasoning was right about the routers and wrong about the destination: the module that
 * owns TRANSLATION is where the vocabulary being translated INTO belongs, and it imports
 * nothing.
 *
 * ⚠️ AND IT IS WHAT MADE J5-C10 POSSIBLE. `promoteConfirmedBrief` has to call
 * `deriveProviderReview` — otherwise a promoted ICP is born unflagged with the client's own
 * sentence in a provider column (S1-PD-03's exact prohibition) — and a `lib/` module cannot
 * reach a router's private const. The alternative was a THIRD copy.
 *
 * 🛑 THE VALUES ARE UNCHANGED, CHARACTER FOR CHARACTER, INCLUDING THE EN-DASHES IN THE SIZE
 * BANDS. `'11–50'` is U+2013, not a hyphen, and it is what every stored row already holds —
 * a "tidy-up" to ASCII here would silently stop matching every ICP in the database.
 */
export const PROVIDER_VOCABULARIES: Record<ProviderField, readonly string[]> = {
  industries:       ['Fintech', 'Healthtech', 'E-commerce', 'SaaS', 'Logistics', 'Agriculture', 'Education', 'Manufacturing', 'Real Estate', 'Media', 'Consulting', 'Retail', 'Banking', 'Insurance', 'Telecoms', 'Energy'],
  seniority_levels: ['C-Suite', 'VP / Director', 'Head of', 'Manager', 'Senior', 'Individual Contributor'],
  company_sizes:    ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,000+'],
}

export interface TranslationOutcome {
  /** Canonical values, deduped, capped. Safe to put in the provider column. */
  canonical: string[]
  /**
   * The client's own words that we could NOT map.
   *
   * ⚠️ PRESERVED EXACTLY AS THEY SAID THEM. Not normalised, not stemmed, not "nearest
   * match" — a human is going to read these and decide, and a tidied version of an answer
   * is a worse input to that decision than the answer.
   */
  unmapped: string[]
}

/**
 * Split one list against one closed vocabulary.
 *
 * ⚠️ MATCHING IS CASE-INSENSITIVE AGAINST THE CANONICAL SPELLING, exactly as `canonicalise`
 * in the builder route already does — "fintech" becomes "Fintech" rather than being thrown
 * away. The value stored is always ours, never the model's casing.
 *
 * ⚠️ AND AN EMPTY INPUT IS NOT A FAILURE. A client who never mentioned an industry has an
 * empty list and NOTHING unmapped: "not specified" is a legitimate state and always was.
 * Only a value we were GIVEN and could not translate is a review requirement.
 */
export function translateProviderList(
  raw: string[] | null | undefined,
  vocabulary: readonly string[],
  maxItems: number,
): TranslationOutcome {
  if (!Array.isArray(raw)) return { canonical: [], unmapped: [] }
  const byLower = new Map(vocabulary.map(v => [v.toLowerCase(), v]))
  const canonical: string[] = []
  const unmapped: string[] = []
  for (const entry of raw) {
    const said = String(entry ?? '').trim()
    if (said === '') continue                      // a blank is not an answer either way
    const hit = byLower.get(said.toLowerCase())
    if (hit) { if (!canonical.includes(hit)) canonical.push(hit) }
    else { if (!unmapped.includes(said)) unmapped.push(said) }
  }
  return { canonical: canonical.slice(0, maxItems), unmapped: unmapped.slice(0, maxItems) }
}

/**
 * One field's unresolved translation, as it is stored and as Vida reads it.
 *
 * ⚠️ `said` IS THE EVIDENCE AN OPERATOR NEEDS. Without the client's own words the review is
 * a person guessing at an empty field, which is the fabrication this whole design refuses.
 */
export interface ReviewRequirement {
  field: ProviderField
  /** The client's own words, unmapped and untouched. */
  said: string[]
}

/** The durable review payload. Deliberately flat: a list of fields, each with its words. */
export interface IcpReview {
  requirements: ReviewRequirement[]
}

/**
 * 🛑 DOES THIS ICP STILL NEED A HUMAN?
 *
 * ⚠️ THE ONE PREDICATE, and every authority seam asks it rather than re-deriving the rule.
 * Two independent gates have never agreed about anything in this repo for long.
 *
 * ⚠️ IT FAILS CLOSED ON A SHAPE IT DOES NOT UNDERSTAND. A row whose review payload is
 * corrupt, hand-edited or from a future version answers "needs review" — because the one
 * thing we must not do with an unreadable translation state is spend money on it.
 */
export function icpNeedsReview(
  review: unknown, resolvedAt: string | null | undefined,
): boolean {
  if (resolvedAt) return false
  if (review === null || review === undefined) return false   // never flagged: normal path
  if (typeof review !== 'object' || Array.isArray(review)) return true   // corrupt ⇒ closed
  const reqs = (review as { requirements?: unknown }).requirements
  if (reqs === undefined) return true                          // flagged but unreadable ⇒ closed
  if (!Array.isArray(reqs)) return true
  return reqs.length > 0
}

/**
 * Build the review payload from a set of translation outcomes, or `null` when everything
 * mapped cleanly.
 *
 * ⚠️ `null` IS THE NORMAL PATH AND IT MUST STAY CHEAP. The overwhelming majority of clients
 * say "SaaS" and "C-Suite" and translate perfectly; they get no review row, no flag, and
 * behave exactly as they did before this existed.
 */
export function buildIcpReview(
  outcomes: Partial<Record<ProviderField, TranslationOutcome>>,
): IcpReview | null {
  const requirements: ReviewRequirement[] = []
  for (const field of PROVIDER_FIELDS) {
    const o = outcomes[field]
    if (o && o.unmapped.length > 0) requirements.push({ field, said: [...o.unmapped] })
  }
  return requirements.length > 0 ? { requirements } : null
}

/**
 * 🛑 THE ONE SERVER-SIDE DERIVATION OF REVIEW AUTHORITY (S1-PD-01/02/03).
 *
 * Given the three provider lists a write is ABOUT TO PERSIST and the three closed
 * vocabularies, this returns the values that may go to the provider columns and the review
 * that is owed — as one object, from one pass, over the caller's actual payload.
 *
 * ── WHY IT TAKES THE PAYLOAD AND NOT A REVIEW ───────────────────────────────────────────
 *
 * 🛑 AUTHORITY YOU CAN OMIT IS NOT AUTHORITY. The previous shape accepted an `icp_review`
 * from the request and wrote it. Every one of omit / empty / invent / replay / stale-build
 * then decided whether sourcing was blocked, and three of those five are what an ordinary
 * caller already sends. This function cannot be omitted: the route must call it to obtain
 * the values it writes, so the review and the provider columns are computed from the same
 * bytes in the same breath. There is no second input to disagree with.
 *
 * ⚠️ AND IT IS PURE. No database, no clock, no request. The route decides what to do with
 * the answer; this decides only what the answer IS, which is why it can be executed directly
 * against a hostile payload rather than asserted about as source text.
 *
 * ⚠️ SET-ONLY BY DESIGN — the caller must never use a `null` here to CLEAR an existing
 * review. `null` means "this payload owes nothing new", not "this ICP is cleared": clearing
 * belongs to the operator resolve route alone, which re-canonicalises every value first.
 * A client whose second save happens to drop the untranslatable word would otherwise clear
 * their own block and be sourced against the emptied filter that block existed to stop.
 */
export interface ProviderWriteDecision {
  /** What may be written to the provider columns — canonical values only, always. */
  values: Record<ProviderField, string[]>
  /** The review owed by THIS payload, or `null` when everything translated. */
  review: IcpReview | null
}

export function deriveProviderReview(
  payload: Partial<Record<ProviderField, string[] | null | undefined>>,
  vocabularies: Record<ProviderField, readonly string[]>,
  maxItems = 6,
): ProviderWriteDecision {
  const outcomes: Partial<Record<ProviderField, TranslationOutcome>> = {}
  const values = {} as Record<ProviderField, string[]>
  for (const field of PROVIDER_FIELDS) {
    const outcome = translateProviderList(payload[field], vocabularies[field], maxItems)
    outcomes[field] = outcome
    values[field] = outcome.canonical
  }
  return { values, review: buildIcpReview(outcomes) }
}

/** What the CLIENT is told. Truthful: we have their answers and we are preparing targeting. */
export const ICP_REVIEW_CLIENT_COPY =
  'We have everything we need — your targeting is being prepared. We will email you the ' +
  'moment it is ready.'

/**
 * 🛑 THE REFUSAL EVERY PROOF/SPEND SEAM RETURNS. Exported so the sentence cannot drift
 * between the route that refuses and the screen that renders it.
 *
 * ⚠️ IT DOES NOT BLAME THE CLIENT AND IT DOES NOT PRETEND PROOF STARTED. Both would be
 * lies, and one of them is the lie that started this whole batch.
 */
export const ICP_REVIEW_PROOF_REFUSAL =
  'Your targeting is still being prepared, so we have not started looking yet — and nothing ' +
  'has been charged or contacted. We will let you know as soon as it is ready.'

/**
 * 🛑 MAY AN OPERATOR'S RESOLUTION BE ACCEPTED?
 *
 * ⚠️ EVERY VALUE IS RE-CANONICALISED SERVER-SIDE. An operator typing into Vida is not more
 * trusted than a model: if a value is not in the closed vocabulary it is refused, because
 * the entire point of the review is to produce a PROVIDER-SAFE list. A resolution that
 * cannot be proven safe must not clear the flag.
 *
 * ⚠️ AND AN EMPTY RESOLUTION IS REFUSED FOR THE FIELD THAT NEEDED ONE. Clearing the review
 * by supplying nothing would leave the provider list empty — which downstream means
 * UNCONSTRAINED — and that is the silent widening this design exists to prevent. If the
 * honest answer really is "no constraint", that is a deliberate act with its own evidence,
 * not the default outcome of pressing save.
 *
 * ── 🛑 ⚑ 14 Sep (S1-PD-07) — THE OPERATOR TRANSLATES THE UNRESOLVED HALF, NOT THE WHOLE ──
 *
 * 🛑 THE DEFECT THIS CLOSES, AND IT DESTROYED CUSTOMER TRUTH. A provider field can be MIXED:
 * the client says "Consulting and creative agencies", the server canonicalises "Consulting"
 * into `icps.industries` and raises a review for "creative agencies" alone. Vida shows the
 * operator the unresolved words, they map them to "Media", and the route wrote
 *
 *     industries = ["Media"]
 *
 * — because `values` held only what the operator had just supplied. "Consulting" disappeared.
 * The client's own correctly-translated targeting was deleted by the act of completing it,
 * silently, with an audit row that made it look deliberate. Nobody was asked.
 *
 * 🛑 SO THE FINAL VALUE IS THE UNION: what already translated, PLUS the operator's approved
 * translation of what did not. Deduplicated case-insensitively so a resolution that happens
 * to repeat an existing value is a no-op rather than a duplicate filter entry.
 *
 * ⚠️ THE EXISTING HALF IS PASSED THROUGH UNTOUCHED, AND NOT RE-VALIDATED. It is already in
 * the provider column — this route is not its gate, and refusing here because some legacy row
 * holds a value outside today's vocabulary would strand the review with no way to finish it.
 * What must never happen is that it silently vanishes, and it cannot: it is the first thing
 * into the merge.
 *
 * ⚠️ AND THE BOUND IS A REFUSAL, NEVER A SLICE. If the union would exceed the provider's
 * maximum, the resolution is REFUSED and Vida is told a final bounded choice is required.
 * Slicing would pick which of the client's constraints to discard by array position, which is
 * exactly the silent destruction this whole fix is about.
 */
export type ResolutionOutcome =
  | { ok: true; values: Record<ProviderField, string[]> }
  | {
      ok: false
      reason: 'unknown_field' | 'off_vocabulary' | 'empty' | 'over_max'
      field?: ProviderField
      bad?: string[]
      /** `over_max` only: the provider ceiling, and the union that exceeded it. */
      max?: number
      would?: string[]
    }

export function resolveReview(
  review: IcpReview,
  supplied: Partial<Record<string, string[]>>,
  vocabularies: Record<ProviderField, readonly string[]>,
  /**
   * 🛑 THE CANONICAL HALF THAT IS ALREADY LIVE ON THE ICP — read by the caller from the row
   * itself, never from the request.
   *
   * ⚠️ REQUIRED, NOT OPTIONAL, AND THAT IS DELIBERATE. A default of `{}` would let a caller
   * reintroduce the exact defect by forgetting an argument, and the loss would be invisible:
   * the resolution would succeed, the audit row would look normal, and the client's targeting
   * would simply be narrower than they asked for. Making it required means every call site
   * has to say what the existing values are, even if the answer is "none".
   */
  existing: Partial<Record<ProviderField, unknown>>,
  maxItems = 6,
): ResolutionOutcome {
  const values = {} as Record<ProviderField, string[]>
  for (const key of Object.keys(supplied)) {
    if (!(PROVIDER_FIELDS as readonly string[]).includes(key)) {
      return { ok: false, reason: 'unknown_field' }
    }
  }
  for (const req of review.requirements) {
    const given = supplied[req.field]
    const out = translateProviderList(given ?? [], vocabularies[req.field], maxItems)
    if (out.unmapped.length > 0) {
      return { ok: false, reason: 'off_vocabulary', field: req.field, bad: out.unmapped }
    }
    if (out.canonical.length === 0) {
      return { ok: false, reason: 'empty', field: req.field }
    }
    // ── THE MERGE. Existing first, so the client's already-valid words keep their order and
    // a duplicate resolution collapses into them rather than the other way round.
    const merged: string[] = []
    const seen = new Set<string>()
    const push = (v: unknown) => {
      const s = String(v ?? '').trim()
      if (s === '') return
      const k = s.toLowerCase()
      if (seen.has(k)) return
      seen.add(k)
      merged.push(s)
    }
    const before = existing[req.field]
    if (Array.isArray(before)) for (const v of before) push(v)
    for (const v of out.canonical) push(v)

    if (merged.length > maxItems) {
      // 🛑 REFUSED, NOT TRUNCATED. See the header: choosing by array position which of a
      // client's constraints survives is the defect wearing a different hat.
      return { ok: false, reason: 'over_max', field: req.field, max: maxItems, would: merged }
    }
    values[req.field] = merged
  }
  return { ok: true, values }
}
