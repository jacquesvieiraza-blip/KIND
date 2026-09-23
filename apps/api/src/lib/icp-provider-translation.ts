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

import { ACCEPTED_SENIORITY_LABELS, APOLLO_INDUSTRIES } from '@kind/shared'

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
  // ⛓️ 23 Sep (R142) — WAS ['C-Suite', 'VP / Director', 'Head of', 'Manager', 'Senior',
  // 'Individual Contributor'], a list WE invented. It is now Apollo's own eleven labels, plus the
  // two old labels that have no single Apollo twin — kept ACCEPTED so every saved ICP still
  // validates and still searches exactly as before, never OFFERED again (the Brief reads
  // `APOLLO_SENIORITY_LABELS`). The four shared labels are unchanged character for character.
  seniority_levels: ACCEPTED_SENIORITY_LABELS,
  company_sizes:    ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,000+'],
}

/**
 * ⚑ 23 Sep (R142 · A2a) — WHAT AN ICP MAY BE *SAVED* WITH, which is wider than what we TRANSLATE
 * INTO. The client now picks industries from Apollo's own list in the Brief; the write boundary
 * (`POST`/`PUT /icps`) re-derives a review over what it is about to store, and against the
 * sixteen alone it would have flagged "Construction" as untranslatable and blocked the client's
 * Proof behind a K.I.N.D review. So the WRITE accepts Apollo's list as well.
 *
 * ⚠️ `PROVIDER_VOCABULARIES.industries` IS DELIBERATELY UNCHANGED. It is what a conversation is
 * translated INTO and what the model's tool schema enumerates — widening it would let the
 * model propose Apollo industries on the client's behalf, which is the assumption R142 forbids.
 * Only a PICK reaches Apollo's list; a word never does.
 */
export const WRITE_VOCABULARIES: Record<ProviderField, readonly string[]> = {
  ...PROVIDER_VOCABULARIES,
  industries: [
    ...PROVIDER_VOCABULARIES.industries,
    ...APOLLO_INDUSTRIES.filter(a => !PROVIDER_VOCABULARIES.industries.some(v => v.toLowerCase() === a.toLowerCase())),
  ],
}

/**
 * 🛑 ⚑ 19 Sep — WHAT REAL CLIENTS ACTUALLY SAY, MAPPED TO WHAT THE PROVIDER ACCEPTS.
 *
 * 🛑 WHAT EARNED THIS, AND IT WAS SEVEN CLIENTS IN A ROW. Matching was EXACT against the
 * sixteen categories above. Northstar Operations Studio said *"professional services"*; there
 * is no such string in the list, so it became `unmapped`, a review was owed, `icp_review` was
 * set, and `POST /icps/:id/proof` refused before claiming anything — **no search was ever
 * made**. The client was told a human would look at it. `proof_passes_done` 0,
 * `proof_records_committed` 0, `leads_total` 0, and they sat there. Seven of the last seven
 * attempts ended the same way.
 *
 * ⚠️ THE LIST WAS NEVER WRONG — IT WAS ALONE. Sixteen marketing categories cannot name an
 * economy, and a business does not describe itself in our vocabulary: it says professional
 * services, operations consultancy, recruitment, construction, accountancy. Widening the
 * closed list does not fix that (the next client says the seventeenth word); teaching the
 * translator the words people actually use does.
 *
 * ⚠️ IT MAPS, IT NEVER INVENTS. Every alias resolves to a value that is ALREADY in the closed
 * vocabulary, so nothing new can reach a provider column — the S1-PD-03 guarantee is exactly
 * as strong as it was. An alias is a second spelling of a permitted value, not a new one.
 *
 * ⚠️ AND A WORD WE STILL DO NOT KNOW IS STILL A REVIEW. This shortens the queue; it does not
 * abolish it. Anything not in the list and not aliased here goes to a human, unchanged, in the
 * client's own words — which is the behaviour the review state was built for and is correct
 * when we genuinely cannot tell what somebody means.
 */
const PROVIDER_ALIASES: Record<ProviderField, Readonly<Record<string, string>>> = {
  // 🛑 DELIBERATELY EMPTY, AND IT IS A RULE RATHER THAN AN OMISSION (J5-C10 · FD-2).
  //
  // The first cut of this table aliased industry words — 'professional services' → Consulting,
  // 'marketing agency' → Media — and `j5c10-icp-review-is-a-task.test.ts` refused it, correctly.
  // The industries column is fed at promotion from the client's FREE-TEXT `target_category`,
  // and that test locks two things about it: a free-text category *"never becomes a provider
  // industry"*, because it is broken as an Apollo filter, and it *"never owes a review"*,
  // because deriving one *"would have made every single signup an operator task"*. The
  // category is enforced SEMANTICALLY, on the ICP's name, by FD-2.
  //
  // ⚠️ AND IT IS NOT WHAT STRANDED ANYBODY. Northstar's ICP was parked on SENIORITY
  // ("Managing Directors", "senior operations leaders") and SIZE ("around 20-200 employees") —
  // two fields that genuinely are provider filters and are filled from the client's own
  // targeting answers. Guessing an industry for them would narrow who Apollo returns on our
  // opinion of their market, which is a product decision and not this fix's to take.
  industries: {},
  seniority_levels: {
    // 🛑 THE OTHER HALF OF NORTHSTAR'S REFUSAL. They asked for "Managing Directors, COOs or
    // senior operations leaders" — three phrases, none of which is one of the six strings.
    'managing director': 'C-Suite',
    'managing directors': 'C-Suite',
    'md': 'C-Suite',
    'founder': 'C-Suite',
    'founders': 'C-Suite',
    'owner': 'C-Suite',
    'owners': 'C-Suite',
    'ceo': 'C-Suite',
    'coo': 'C-Suite',
    'cfo': 'C-Suite',
    'cto': 'C-Suite',
    'cmo': 'C-Suite',
    'chief operating officer': 'C-Suite',
    'chief executive': 'C-Suite',
    'partner': 'C-Suite',
    'partners': 'C-Suite',
    'executive': 'C-Suite',
    'c level': 'C-Suite',
    'c-level': 'C-Suite',
    'director': 'VP / Director',
    'directors': 'VP / Director',
    'vp': 'VP / Director',
    'vice president': 'VP / Director',
    'operations director': 'VP / Director',
    'head': 'Head of',
    'heads of': 'Head of',
    'head of operations': 'Head of',
    'senior manager': 'Manager',
    'managers': 'Manager',
    'team lead': 'Manager',
    'senior leaders': 'Senior',
    'senior leadership': 'Senior',
    'leadership team': 'Senior',
    'senior operations leaders': 'Senior',
    'ic': 'Individual Contributor',
  },
  company_sizes: {
    // ⚠️ RANGES A HUMAN TYPES. The bands use EN-DASHES (U+2013); a client types a hyphen, a
    // word, or a span that crosses two bands — and a span is not one band, so it is left to
    // `expandSizeSpan` below rather than guessed at here.
    '1-10': '1–10',
    '11-50': '11–50',
    '51-200': '51–200',
    '201-500': '201–500',
    '501-1000': '501–1,000',
    '501-1,000': '501–1,000',
    '1000+': '1,000+',
    'micro': '1–10',
    'small': '11–50',
    'smb': '11–50',
    'sme': '51–200',
    'mid market': '201–500',
    'mid-market': '201–500',
    'enterprise': '1,000+',
  },
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
  // ⚑ 19 Sep — which field this is, derived from the vocabulary itself rather than passed in,
  // so every existing caller keeps its exact signature and no call site had to change.
  const field = FIELD_OF_VOCABULARY(vocabulary)
  const aliases = field ? PROVIDER_ALIASES[field] : null
  const canonical: string[] = []
  const unmapped: string[] = []
  const keep = (v: string): void => { if (!canonical.includes(v)) canonical.push(v) }

  for (const entry of raw) {
    const said = String(entry ?? '').trim()
    if (said === '') continue                      // a blank is not an answer either way
    const hit = byLower.get(said.toLowerCase())
    if (hit) { keep(hit); continue }

    // ── ⚑ 19 Sep — THE CLIENT'S OWN WORD, THEN THEIR OWN NUMBERS ────────────────────────
    //
    // 🛑 BOTH STEPS RESOLVE INTO THE CLOSED LIST OR NOT AT ALL. An alias is a second spelling
    // of a value the vocabulary already permits, and a span expands to bands that are already
    // in it — so a provider column still cannot receive anything this file did not authorise.
    const alias = aliases ? lookupKeys(said).map(k => aliases[k]).find(Boolean) : undefined
    if (alias && byLower.has(alias.toLowerCase())) { keep(alias); continue }

    // ⚠️ AND THE CANONICAL LIST GETS THE SAME COURTESY. "consultancies" is not an alias and is
    // not the exact string `Consulting`, but "Consulting" IS in the vocabulary under a spelling
    // this phrase reaches — so a plural or a casing difference must not cost a client a human.
    const nearCanonical = lookupKeys(said).map(k => byLower.get(k)).find(Boolean)
    if (nearCanonical) { keep(nearCanonical); continue }

    // A SPAN IS NOT ONE BAND. "around 20-200 employees" is the client being precise, and it
    // covers two of our bands. Snapping it to one would silently narrow or widen who they
    // asked for; refusing it sent them to a human for an answer they had already given.
    if (field === 'company_sizes') {
      const bands = expandSizeSpan(said, vocabulary)
      if (bands.length > 0) { for (const b of bands) keep(b); continue }
    }

    if (!unmapped.includes(said)) unmapped.push(said)
  }
  return { canonical: canonical.slice(0, maxItems), unmapped: unmapped.slice(0, maxItems) }
}

/**
 * The client's phrase, reduced to the shape the alias table is keyed by.
 *
 * ⚠️ IT NORMALISES PUNCTUATION AND NOISE WORDS ONLY — never meaning. "Managing Directors" and
 * "managing director" are the same request; "Managing Director" and "Marketing Director" are
 * not, and nothing here can conflate them.
 */
function normaliseSaid(said: string): string {
  return said
    .toLowerCase()
    .replace(/[&/]/g, ' ')
    .replace(/[.,'’"()]/g, '')
    .replace(/\b(companies|company|businesses|business|firms|firm|sector|industry|employees|people|staff|roles?|level)\b/g, ' ')
    .replace(/^\s*(around|about|approx\.?|approximately|circa|c\.)\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The spellings one phrase may be looked up under, in order.
 *
 * ⚠️ PLURALS ARE TRIED, NEVER IMPOSED. The first cut stripped a trailing `s` inside
 * `normaliseSaid` itself, which turned *"professional services"* into *"professional
 * service"* and missed the very alias it was written for. A variant is a second KEY to try,
 * not a rewrite of what the client said.
 */
function lookupKeys(said: string): string[] {
  const base = normaliseSaid(said)
  const keys = [base]
  if (base.endsWith('s')) keys.push(base.slice(0, -1))
  else keys.push(`${base}s`)
  if (base.endsWith('ies')) keys.push(`${base.slice(0, -3)}y`)
  return keys
}

/** Which of the three fields a vocabulary array is, by identity. Null for anything else. */
function FIELD_OF_VOCABULARY(vocabulary: readonly string[]): ProviderField | null {
  for (const f of PROVIDER_FIELDS) if (PROVIDER_VOCABULARIES[f] === vocabulary) return f
  return null
}

/**
 * ⚑ 19 Sep — "20-200" IS TWO BANDS, AND THE CLIENT MEANT BOTH.
 *
 * Reads a numeric span out of the client's own phrase and returns every size band it overlaps.
 * Returns `[]` when there is no span to read, so the caller falls through to the review queue
 * exactly as before — this can widen what we understand, never what we accept.
 */
export function expandSizeSpan(said: string, vocabulary: readonly string[]): string[] {
  const digits = said.replace(/,/g, '').match(/\d+/g)
  if (!digits || digits.length === 0) return []
  const lo = Number(digits[0])
  const hi = digits.length > 1 ? Number(digits[1]) : (/\+|plus|or more|and (up|above|over)/i.test(said) ? Infinity : lo)
  if (!Number.isFinite(lo) || lo < 0 || (hi !== Infinity && hi < lo)) return []

  // The bands, as numbers, in the vocabulary's own order. Parsed from the strings themselves so
  // a band added to the list above is understood here without a second edit.
  const out: string[] = []
  for (const band of vocabulary) {
    const nums = band.replace(/,/g, '').match(/\d+/g)
    if (!nums) continue
    const bLo = Number(nums[0])
    const bHi = /\+/.test(band) ? Infinity : Number(nums[1] ?? nums[0])
    if (lo <= bHi && (hi === Infinity || hi >= bLo)) out.push(band)
  }
  return out
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
