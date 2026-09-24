// ─────────────────────────────────────────────────────────────────────────────
// POOL-FIRST SOURCING — pure logic (SPRINT 8a·④ / #449 part 3)
//
// Cross-client reuse: a record bought once from PDL ($0.28) lands in `lead_pool`
// and becomes reusable inventory. Before spending a fresh PDL dollar, we serve
// matching records we ALREADY OWN at $0 marginal cost, and only the REMAINDER
// goes to the fenced PDL path (try_spend_sourcing → searchPeopleWithFallback).
//
// No DB, no side-effects here → fully unit-testable. The DB glue lives in
// routes/icps.ts (servePoolLeads); these are the two invariants it leans on:
//   • poolRecordMatchesIcp — the HARD-FIT reuse decision (C02, 10 Sep). It delegates to
//     `proof-fit.ts`, so the pool and the pre-surfacing gate cannot disagree.
//   • splitPoolAndRemainder — the "serve pool, source only the rest" split so we
//     can never over-source (pool-served count is subtracted from the PDL ask).
// ─────────────────────────────────────────────────────────────────────────────

import { canonicalLaunchCountry, apolloIndustriesOnly } from '@kind/shared'
// ⚑ 10 Sep (C02) — the ONE hard-fit rule. Statically imported: `proof-fit` pulls only
// `@kind/shared` and `lead-feedback`, both pure, so this module stays testable with no
// environment. (An earlier lazy `require` here could not resolve a .ts sibling under Vitest.)
import { hardFit, POOL_SELECTION_CRITERIA } from './proof-fit'
import { isPlaceholderEmail } from './email-hygiene'

/** A row from the `lead_pool` table (only the fields the matcher reads). */
export interface PoolRecord {
  email_norm:        string
  first_name?:       string | null
  last_name?:        string | null
  title?:            string | null
  seniority?:        string | null
  company?:          string | null
  industry?:         string | null
  company_size?:     string | null
  country?:          string | null
  linkedin_url?:     string | null
  source?:           string | null
  acquisition_cost?: number | null
  sourced_at?:       string | null
  last_verified_at?: string | null
}

/** The ICP fields the pool matcher structures against. */
export interface PoolMatchIcp {
  job_titles?:       string[] | null
  industries?:       string[] | null
  geographies?:      string[] | null
  seniority_levels?: string[] | null
  /** ⚑ 10 Sep (C02) — company size is a HARD criterion and was not tested here at all. */
  company_sizes?:    string[] | null
  /**
   * ⚑ 18 Sep (J5-C4 · LR 10,12) — the size the client STATED, which outranks our six bands.
   * Dropping it here would leave the free path judging on the band we snapped them to while
   * the provider path judges on their words — two answers to one criterion, which is the
   * thing J5-C5 made one predicate to prevent.
   */
  target_size?:      string | null
  /**
   * ⚑ 18 Sep (J5-C12 · FD-1) — the client's own exclusions, so the FREE path suppresses them
   * too. FD-1 is "in every path", and reusing an excluded company from the pool costs the
   * client the same relationship as buying one.
   */
  exclusions?:       string | null
}

/** case-insensitive "does `hay` contain any of `needles`" (ILIKE %needle%). */
// ⛓️ 10 Sep (C02) — `containsAny` IS GONE, AND IT WAS THE LOOSENESS. It was the substring
// test behind the OR-generous role/industry/seniority match: `containsAny(rec.industry,
// ['digital marketing'])` admitted anything whose industry string merely contained the
// phrase, and nothing tested company size. `poolRecordMatchesIcp` now delegates to
// `proof-fit.ts`, which compares industry word-wise and size as a BAND — so the helper has
// no remaining caller and keeping it would leave the loose test one edit from returning.

// ── ⚑ 27 Aug — COUNTRY IS COMPARED CANONICALLY, AND ONLY COUNTRY ───────────────────────────
//
// ⛓️ SUPERSEDED 10 Sep — title, industry and seniority no longer use a substring test; the
// paragraph below describes the rule that produced the C02 defect and is kept as the record of
// what was believed. What is true now: geography is canonical, size is a band, industry is
// word-wise, and all four must hold. Historical:
// Title, industry and seniority stay on `containsAny` (substring) because they are genuinely
// partial — "Head of Sales" should match a stored "Global Head of Sales", and that is the
// OR-generous behaviour the founder approved. Country is not like that. It is a closed
// vocabulary with a canonical form that already exists in `@kind/shared`, and treating it as a
// substring produced two failures at once:
//
//   ① MISSES. `lead_pool.country` is free text from whichever provider or import wrote the
//      row, so the same country is stored as "GB", "England" and "United Kingdom". A client
//      targeting "United Kingdom" substring-matched only the third. The other two were owned,
//      relevant inventory the pool refused to see.
//   ② FALSE POSITIVES, and these are worse — they are wrong leads, not missing ones. The
//      substring test is literally `'australia'.includes('us')` → **true**. A client targeting
//      the US would be served Australia, Austria, Belarus, Cyprus and Mauritius. `'ukraine'
//      .includes('uk')` → **true**, so a UK target picks up Ukraine. `'ireland'` is inside
//      `'northern ireland'`. None of these is hypothetical; each falls straight out of the
//      operator that was there.
//
// So both sides go through `canonicalLaunchCountry` and are compared for EQUALITY. Geography
// targeting is not weakened by this — it is narrowed to exactly what the client asked for, and
// widened only across spellings of that same country.
//
// ⚠️ AN UNKNOWN COUNTRY IS NEVER A WILDCARD. Blank / null / whitespace returns false for every
// geography, always. This is the same rule `isLaunchSendCountry` already applies for sending
// ("an unknown country is not evidence of an allowed one") and it is the rule the founder
// restated for this defect: a row with no country cannot satisfy a geography-constrained
// proof. It is not served, and it is not silently counted as a match.
//
// ⚠️ A COUNTRY OUTSIDE THE ALIAS TABLE STILL WORKS. `canonicalLaunchCountry` returns an
// unrecognised term lowercased rather than dropping it, so "Nigeria" vs "nigeria" still
// matches. What it no longer does is match a country that merely CONTAINS those letters.

/** The canonical, comparable form of a stored or targeted country. `''` = unknown. */
export function canonicalPoolCountry(country: string | null | undefined): string {
  return canonicalLaunchCountry(country)
}

/**
 * Does this record's country satisfy the client's geography targeting?
 * Canonical equality on both sides. Unknown country → always false.
 */
export function poolCountryMatches(
  recCountry: string | null | undefined,
  geographies: readonly (string | null | undefined)[],
): boolean {
  const rec = canonicalPoolCountry(recCountry)
  if (!rec) return false
  for (const g of geographies) {
    const want = canonicalPoolCountry(g)
    if (want && want === rec) return true
  }
  return false
}

/**
 * ⚑ THE MINIMUM SERVABLE CONTRACT — is this row eligible for GEOGRAPHY-TARGETED proof?
 *
 * Founder-chosen shape (option A, 27 Aug): a row with no usable country **stays in
 * `lead_pool`** — it is still real inventory, still reusable for a client who set no
 * geography, and deleting or withholding it would destroy an asset to fix a reporting
 * problem. What changes is that its unservability becomes an explicit, countable fact
 * instead of a silent zero at the end of a proof run.
 *
 * This is deliberately NOT the whole eligibility question — email, blocklist, DNC and
 * per-client dedupe all still apply downstream and are unchanged. This answers one thing:
 * can this row ever satisfy a client who named a country?
 */
export function isGeoServable(rec: Pick<PoolRecord, 'country'>): boolean {
  return canonicalPoolCountry(rec.country) !== ''
}

/**
 * OR-generous structured candidate match — mirrors the DB query in servePoolLeads.
 * A record is a candidate when:
 *   canonical country EQUALS any canonical geography (if any geography is set)  AND
 *   ( title ILIKE any job_title OR industry ILIKE any industry OR seniority ILIKE any seniority )
 * Kept deliberately loose so it returns candidates; the existing scoring/consent
 * filters downstream do the precise qualification. An ICP with no role/industry/
 * seniority signal at all matches on geography alone (nothing to narrow on).
 */
export function poolRecordMatchesIcp(rec: PoolRecord, icp: PoolMatchIcp): boolean {
  // 🛑 ⛓️ 10 Sep (C02) — THIS WAS OR-GENEROUS, AND IT NOW DELEGATES TO THE ONE HARD-FIT RULE.
  //
  // ── WHAT IT USED TO SAY ───────────────────────────────────────────────────────────────
  //
  //     country AND (title OR industry OR seniority)
  //
  // …with no company-size test at all. So a UK company matching on the word "marketing"
  // alone was reusable inventory for a client who asked for UK digital marketing AGENCIES of
  // 10–50 people, and a 4,000-person consultancy qualified on one matching title.
  //
  // ── WHY THAT COST MONEY RATHER THAN JUST LOOKING WRONG ────────────────────────────────
  //
  // Pool rows are served BEFORE the paid provider and are subtracted from what we then buy.
  // A loose match therefore did the most expensive possible thing: it filled the client's
  // twenty examples with rows PR1's structural gate would refuse, shrank the external ask by
  // the same number, and left the client looking at a set of eleven. Free rows that cannot be
  // shown are worse than no free rows, because they consume the allowance twice.
  //
  // ── ONE RULE, NOT TWO (founder-locked 10 Sep) ─────────────────────────────────────────
  //
  // *"Use the canonical PR1 proof-fit function or equivalent shared logic. DO NOT create a
  // second conflicting matcher."* So this asks `hardFit` — the same deterministic geography ·
  // size · industry · seniority judgement the structural gate applies before surfacing — and
  // owns none of it. `unknown` is admissible here exactly as it is there: a pool row with a
  // blank industry may genuinely be the right company, and refusing it would throw away
  // owned inventory over a gap in the provider's data.
  //
  // ⚠️ `title` MAPS TO `job_title`. `lead_pool` names the column `title`; `leads` names it
  // `job_title`, and the judgement is written against the lead shape. Mapped here, once.
  // 🛑 GEOGRAPHY KEEPS ITS OWN, STRICTER GATE — AND THAT IS NOT A SECOND MATCHER.
  //
  // `hardFit` treats an UNKNOWN criterion as admissible: a fetched provider row with a blank
  // industry may genuinely be the right company, so it is shown as "worth a look" rather
  // than thrown away. **The pool cannot afford that for country.** A row we cannot place
  // geographically would consume one of the client's twenty example slots on a guess, for
  // free, ahead of a paid row we could place — and this is a measured production failure,
  // not a hypothetical: the pool held 85 rows whose `country` was NULL, 18 of them matching
  // on title, and a geo-targeted pass served zero while reading as "the pool holds nobody".
  //
  // So an unknown country is a REFUSAL here and an unknown industry is not. The three
  // remaining criteria delegate to the one shared rule below; nothing is re-implemented.
  const geos = (icp.geographies ?? []).filter(Boolean)
  if (geos.length > 0 && !poolCountryMatches(rec.country, geos)) return false

  // ⛓️ 11 Sep — `structurallyAdmissible`, NOT `structurallyEligible`. Eligibility was
  // tightened so an UNKNOWN can never be COUNTED as a Proof match; reuse asks a different
  // question. Refusing to reuse a free row we already hold because its industry column is
  // blank would spend provider money to replace a candidate that gets surfaced anyway, as a
  // set-aside, for nothing. The geography refusal above is untouched and is still stricter.
  // ── 🛑 ⚑ 22 Sep — THE POOL IS TREATED APOLLO'S WAY, WHICH IS WHAT IT WAS NOT ──────────
  //
  // ⛓️ WAS: ~~`structurallyAdmissible(hardFit(…))`~~ — refuse a reusable record on any of the
  // seven criteria that answers a definite `no`.
  //
  // 🛑 AND IT WENT OUT OF STEP WITH THE PROVIDER PATH THE MOMENT THAT PATH CHANGED. On 22 Sep
  // the client's category stopped removing anybody bought from Apollo (`removalCriterion`),
  // because judging their words against a vocabulary we invented is what emptied the Proof
  // screen. This file kept the old rule — so the two paths disagreed about the SAME COMPANY:
  // Apollo's copy was kept and ranked, our own free copy of it was thrown away.
  //
  // 🛑 THE FOUNDER RULED ON EXACTLY THIS: *"we need the same way we do Apollo with our Pooled
  // leads. Treat our Pool as Apollo way always. so the same code gets built there."* This is
  // that ruling — literally the same predicate, not a second matcher that agrees today.
  //
  // ⚠️ WHAT IT COST WHILE IT WAS WRONG IS MONEY, NOT A CLIENT SEEING THE WRONG PERSON. The
  // pool served fewer free records than it should have, so `splitPoolAndRemainder` asked
  // Apollo for more than it needed to. Nobody was shown anybody they should not have been.
  //
  // ⚠️ ONLY A DEFINITE `no`, WHICH IS EXACTLY WHAT `preSpendRefusal` ASKS AT THE PROVIDER
  // BOUNDARY — the two paths are now one question asked twice, which is the ruling.
  //
  // 🛑 AND AN `unknown` MUST NEVER REFUSE HERE. The first version of this change used
  // `removalCriterion`, which asks both states, and it emptied the pool: owned records carry
  // thin data by nature — a blank headcount, a missing seniority — and refusing them would
  // spend provider money to re-buy a person we already hold. That is the exact inversion the
  // old `structurallyAdmissible` note warned about, reintroduced while trying to honour a
  // ruling about something else. `structurallyAdmissible` treated unknown as admissible for
  // this reason and that half was right; what was wrong was only WHICH criteria may refuse.
  // ⛓️ 23 Sep — `POOL_SELECTION_CRITERIA`, no longer `REMOVING_CRITERIA`. The gate now removes
  // on exclusions only, because Apollo's filter already guaranteed geography, size and
  // seniority for the people it returns. Our pool has no such filter in front of it, so it
  // must still SELECT on those three itself — the "Apollo way" for the pool is to be the filter.
  const fitOf = poolFit(rec, icp)
  return POOL_SELECTION_CRITERIA.every(k => fitOf[k] !== 'no')
}

/** The verdicts, computed once so the refusal rule above reads as one line. */
function poolFit(rec: PoolRecord, icp: PoolMatchIcp) {
  return hardFit({
    // Decided above, and handed over as "nothing asked" so the shared rule cannot re-open it
    // with its own softer answer for an unknown country.
    country: null,
    company_size: rec.company_size ?? null,
    industry: rec.industry ?? null,
    job_title: rec.title ?? null,
    seniority: rec.seniority ?? null,
    // ⚑ 18 Sep (J5-C12) — the company name is EVIDENCE, and the pool record carries it. It was
    // omitted, so `excludedVerdict` had nothing to read here and the reuse path could not have
    // recognised an excluded company even with the criterion in place.
    company: rec.company ?? null,
  }, {
    geographies: null,
    company_sizes: icp.company_sizes ?? null,
    // ⚑ 18 Sep (J5-C4) — their stated range, so the pool and the provider path cannot
    // disagree about how big "50 to 100 people" is.
    target_size: icp.target_size ?? null,
    // ⛓️ 24 Sep (R145 step 3a · #23) — ONLY APOLLO'S OWN INDUSTRIES, exactly what the search sends.
    // WAS `icp.industries`, which held words WE derived; they may rank, never select.
    industries: apolloIndustriesOnly(icp.industries ?? []),
    job_titles: icp.job_titles ?? null,
    seniority_levels: icp.seniority_levels ?? null,
    // ── ⚑ 18 Sep (J5-C12 · FD-1) — "IN EVERY PATH" INCLUDES THE FREE ONE ────────────────
    //
    // This is the POOL REUSE decision: may we serve a record we already hold instead of
    // buying one. An excluded company reused from the pool is exactly as wrong as an excluded
    // company bought from Apollo, and costs the client the same relationship — so the same
    // suppression applies. It is also the cheapest possible place to apply it.
    exclusions: icp.exclusions ?? null,
  })
}


/**
 * The split between pool-served (free) and PDL-remainder (paid). We serve up to the
 * run's target from what the pool can supply, and only the leftover is sent to the
 * fenced PDL path — so a pool serve can NEVER cause us to over-source. Both halves
 * are clamped to ≥ 0.
 */
export function splitPoolAndRemainder(target: number, poolAvailable: number): {
  poolServe: number
  pdlRemainder: number
} {
  const t = Math.max(0, target)
  const poolServe = Math.max(0, Math.min(t, poolAvailable))
  return { poolServe, pdlRemainder: Math.max(0, t - poolServe) }
}

/**
 * POOL-WRITE GATE — the pool holds ONLY genuinely bought records. A demo client's
 * ICP run is pool-READ-only ($0, pool-serve), so it must never write a record back
 * into the pool (that's how test/showcase junk got in before). This is the belt on
 * top of the structural guard in icps.ts (the PDL upsert already lives in the
 * non-demo branch). Never let a demo run pool-write; also skip when there's nothing.
 */
export function poolWriteAllowed(isDemo: boolean, recordCount: number): boolean {
  return isDemo !== true && recordCount > 0
}

// ── PROVENANCE TRIPWIRE — ONLY RECORDS WE MAY REUSE ACROSS CLIENTS ENTER THE POOL ──────────
//
// `lead_pool` is a CROSS-CLIENT store: a record bought for client A is served to client B.
//
// ⛓️ 27 Aug — WIDENED TO APOLLO BY FOUNDER RULING **R73** (verbatim: *"all client data we
// own. including apollo data can be used as a source for clients too. it is data we own."*),
// which supersedes F15's internal Apollo precaution. **The allowlist did not become "anything
// goes"** — it became the boundary between what K.I.N.D ACQUIRED and everything else:
// customer/inbound data (`csv_import`, `web_form`, `company_csv`, `vida_chat`,
// `milla_onboarding`, CRM imports) stays OUT of the shared pool unless separately ruled in,
// and an UNTAGGED record is still refused, because absence of provenance is not evidence of
// ownership. R73 is an INTERNAL rule only: F13 (PDL Order Form) and W18 (counsel) stay open,
// and nothing here claims what any vendor contract permits.
//
// ⚠️ THE HISTORICAL CLAIM THIS COMMENT USED TO MAKE WAS FALSE. It said "the pool is
// structurally clean right now — one writer, hard-coded 'pdl'". Production disproved it: the
// pool's actual contents were 85 `apollo` rows from the founder-run 11-Jul promotion script,
// which is SQL and never passed through this filter. The tripwire only ever guarded the
// TypeScript writer, and the writer's hard-coded tag also mislabelled house/Apollo contacts
// as 'pdl' (fixed 27 Aug — the writer now records the ACTUAL provider).
//
// ⚠️ NOT A KILL-SWITCH ON SOURCING. Founder-ruled: refusal skips the POOL write only. The
// client still gets every lead their run bought — the lead rows, the delivery and the charge
// are all upstream of this and untouched. Refusing the run instead would turn a rights
// precaution into an outage.

/** The K.I.N.D-ACQUIRED sources eligible for the shared pool (R73, 27 Aug). Widening this
 *  further is a founder/rights decision, never a convenience edit. */
export const POOL_ELIGIBLE_SOURCES: readonly string[] = ['pdl', 'apollo']

// ── ⚑ 27 Aug — THE RIGHTS CLASSIFIER (R73). One place answers "whose data is this row?" ──
//
// "It exists in public.leads" is NOT an ownership claim: a customer's CSV upload and a
// record K.I.N.D bought from PDL live in the same table. Every pool write and every
// promotion decision goes through THIS classification, and the unknown bucket FAILS CLOSED.

/** The four rights buckets of R73. */
export type LeadRights = 'kind_acquired' | 'customer_inbound' | 'pool_served_copy' | 'unknown'

/** Sources stamped by CUSTOMER/INBOUND writers — never auto-pooled (R73 ②). Each entry is a
 *  literal a real writer stamps: lead-import.ts (csv_import) · forms.ts (web_form) ·
 *  leads.ts company search (company_csv) · vida.ts (vida_chat) · icps.ts onboarding
 *  (milla_onboarding). */
export const CUSTOMER_INBOUND_SOURCES: readonly string[] = [
  'csv_import', 'web_form', 'company_csv', 'vida_chat', 'milla_onboarding',
]

/** Sources stamped by K.I.N.D's OWN acquisition paths. `lookalike` is the PDL-backed
 *  lookalike sourcing route; `pdl`/`apollo` are the provider loop's truthful tags. */
export const KIND_ACQUIRED_SOURCES: readonly string[] = ['pdl', 'apollo', 'lookalike']

/**
 * Classify one lead row's rights bucket from its recorded provenance.
 *
 * @param source     the row's `source` tag (may be null — historical provider rows never set it)
 * @param providerId the row's provider identity (`apollo_id` column), if any
 * @param inPool     whether this row's email already exists in `lead_pool` (a pool-served
 *                   copy carries no provider id of its own — it is not new inventory)
 *
 * ⚠️ FAIL-CLOSED IS THE POINT: anything that cannot be truthfully classified is `unknown`,
 * and `unknown` is never promoted.
 *
 * ⛓️ 27 Aug (evidence-pass correction) — A BARE PROVIDER ID IS **NOT** PROOF OF ACQUISITION.
 * The first version classified `null source + providerId` as kind_acquired, reasoning that
 * only the provider loop created such rows. That is structurally FALSE: the manual
 * `POST /leads` schema (`routes/leads.ts`) accepts `apollo_id` from the client and stamps
 * no `source`, so a customer-created row can look exactly like a provider acquisition.
 * An untagged row with a provider id is therefore `unknown` unless the caller supplies
 * CORROBORATION — a deterministic external record (the known house-account book, or a
 * unique acquisition_memory provenance) proving K.I.N.D acquired it. The customer source
 * tag ALWAYS wins, corroborated or not.
 */
export function classifyLeadRights(
  source: string | null | undefined,
  providerId: string | null | undefined,
  inPool = false,
  corroborated = false,
): LeadRights {
  const s = (source ?? '').trim().toLowerCase()
  if (s && CUSTOMER_INBOUND_SOURCES.includes(s)) return 'customer_inbound'
  if (s && KIND_ACQUIRED_SOURCES.includes(s)) return 'kind_acquired'
  if (!s && providerId && corroborated) return 'kind_acquired'
  if (!s && !providerId && inPool) return 'pool_served_copy'
  return 'unknown'
}

// ── ⚑ 27 Aug — THE HISTORICAL PROVIDER RESOLVER (deterministic, never a pick) ──────────────
//
// The promotion tool must state WHICH provider produced a historical row, or skip it. The
// first version reached into `acquisition_memory` with `LIMIT 1` — an arbitrary choice that
// violated its own fail-closed promise the moment one email carried two provider records.
// This function is the canonical resolution order; the SQL in
// `2026-08-27_kind_acquired_pool_promotion.sql` mirrors it clause for clause (guarded by
// text assertions in pool-country-contract.test.ts):
//
//   A. customer/inbound source tag        → null (excluded upstream, tag always wins)
//   B. explicit `leads.source` pdl/apollo → that exact provider
//   C. `leads.source` = 'lookalike'       → 'pdl' (the lookalike route calls pdlSearchPeople)
//   D. known house-account acquisition    → 'apollo' (the founder's own book — the same fact
//                                            the 11-Jul promotion script already relied on)
//   E. acquisition_memory                 → usable ONLY when EXACTLY ONE distinct eligible
//                                            provider ('pdl' | 'apollo') exists for the
//                                            identity. 0 → null. 2+ → null. An unexpected
//                                            source ('hunter', …) is not eligible and can
//                                            never resolve merely by being non-null.
//   otherwise                             → null — ambiguous, EXCLUDED, fail closed.
export type MemoryRecordRef = { source?: string | null; providerId?: string | null }

export function resolveHistoricalProvider(opts: {
  source?: string | null
  isHouseAccount?: boolean
  /** the lead row's own provider identity (`leads.apollo_id`), if any */
  providerId?: string | null
  /** acquisition_memory rows for this email — (source, provider_id) pairs */
  memoryRecords?: readonly MemoryRecordRef[]
}): 'pdl' | 'apollo' | null {
  const s = (opts.source ?? '').trim().toLowerCase()
  if (s && CUSTOMER_INBOUND_SOURCES.includes(s)) return null                    // A
  if (s === 'pdl' || s === 'apollo') return s                                   // B
  if (s === 'lookalike') return 'pdl'                                           // C
  if (opts.isHouseAccount) return 'apollo'                                      // D
  // E — ⛓️ merge-gate pass: corroboration binds to the ACQUISITION IDENTITY, never to the
  // email alone. acquisition_memory is keyed (source, provider_id); a manual/untagged lead
  // row whose email merely coincides with a remembered identity proves nothing about THIS
  // row — the manual POST /leads schema accepts an arbitrary apollo_id, so the row's own
  // provider id must MATCH a remembered provider_id, and exactly one eligible provider must
  // claim it. No provider id on the row → step E has nothing to bind to → fail closed.
  if (!opts.providerId) return null
  const eligible = [...new Set((opts.memoryRecords ?? [])
    .filter(m => (m.providerId ?? '') === opts.providerId)
    .map(m => (m.source ?? '').trim().toLowerCase())
    .filter(m => m === 'pdl' || m === 'apollo'))]
  if (eligible.length === 1) return eligible[0] as 'pdl' | 'apollo'
  return null                                                                   // fail closed
}

// ── ⚑ 27 Aug (merge-gate pass) — AMBIGUITY IS A STATE, NEVER A PICK ─────────────────────
//
// The promotion tool must not resolve a conflict by choosing the earliest row, the lowest
// number, or any other tiebreak dressed as determinism. These two helpers are the canonical
// spec the SQL mirrors:

/** All eligible canonical country observations for one identity → the ONE country, or the
 *  honest alternative. 0 observations → null (geo-unservable, poolable). >1 DISTINCT
 *  canonical countries → ambiguous: country stays null, the identity is counted, and no
 *  geography is ever claimed for it. NEVER earliest/min/max. */
export function resolvePromotionCountry(observations: readonly (string | null | undefined)[]): {
  country: string | null; ambiguous: boolean
} {
  const distinct = [...new Set(observations.map(o => canonicalPoolCountry(o)).filter(Boolean))]
  if (distinct.length === 1) return { country: distinct[0], ambiguous: false }
  return { country: null, ambiguous: distinct.length > 1 }
}

/** The provable original cost for one resolved acquisition identity. Exactly one distinct
 *  recorded cost → that cost. Zero → 0 only for the proven house-Apollo book, else
 *  unprovable. More than one distinct recorded cost → ambiguous. NEVER MIN/MAX to force a
 *  number — "lowest is conservative" is not "historically true". */
export function resolvePromotionCost(
  recordedCosts: readonly number[],
  opts: { houseApollo?: boolean } = {},
): { cost: number | null; state: 'proven' | 'house_zero' | 'unprovable' | 'ambiguous' } {
  const distinct = [...new Set(recordedCosts)]
  if (distinct.length === 1) return { cost: distinct[0], state: 'proven' }
  if (distinct.length > 1) return { cost: null, state: 'ambiguous' }
  if (opts.houseApollo) return { cost: 0, state: 'house_zero' }
  return { cost: null, state: 'unprovable' }
}

/** May this rights bucket enter the shared pool / be promoted? ONLY kind_acquired (R73). */
export function rightsAllowPooling(rights: LeadRights): boolean {
  return rights === 'kind_acquired'
}

/** Just enough of a pool record for the provenance question. */
export type PoolWriteCandidate = { source?: string | null; email_norm?: string | null }

/**
 * Split a batch into what may be pooled and what may not.
 *
 * ⚠️ PER RECORD, NOT PER BATCH, on the founder's wording (*"refuse any upsert whose source is
 * not on a POOL_ELIGIBLE_SOURCES allowlist"*). A mixed batch is exactly what a future writer
 * would produce, and discarding legitimately-bought PDL records because of a bad neighbour
 * would punish the wrong rows. The refused ones are returned rather than counted so the caller
 * can name the sources it turned away — a bare "3 refused" is #620's mistake.
 *
 * ⚠️ AN ABSENT SOURCE IS REFUSED. `undefined` is not evidence of PDL; it is evidence that
 * somebody wrote a pool record without thinking about provenance, which is the case this
 * exists to catch. Same reasoning as `isLaunchSendCountry` refusing a blank country.
 */
/**
 * ⚑ 27 Aug (merge-gate pass) — ONE source-eligibility truth for BOTH boundaries. The write
 * tripwire filtered what enters the pool, but the READ path served whatever was already
 * there — so a bad historical SQL import could bypass the tripwire entirely and a customer
 * or unknown row would be served cross-client. `servePoolLeads` now asks this same question
 * on the way OUT (DB prefilter + JS final check), and it fails closed: null/blank/unlisted
 * sources are never served across clients.
 */
export function isPoolSourceEligible(source: string | null | undefined): boolean {
  const src = typeof source === 'string' ? source.trim().toLowerCase() : ''
  return src.length > 0 && POOL_ELIGIBLE_SOURCES.includes(src)
}

export function splitPoolEligible<T extends PoolWriteCandidate>(
  records: readonly T[],
): { eligible: T[]; refused: T[] } {
  const eligible: T[] = []
  const refused: T[] = []
  for (const r of records) {
    if (isPoolSourceEligible(r.source)) eligible.push(r)
    else refused.push(r)
  }
  return { eligible, refused }
}

/** The sentence an operator finds in the log — names the sources, never a bare count. */
export function poolRefusalLine(refused: readonly PoolWriteCandidate[]): string {
  const counts = new Map<string, number>()
  for (const r of refused) {
    const src = (typeof r.source === 'string' && r.source.trim()) ? r.source.trim().toLowerCase() : '(untagged)'
    counts.set(src, (counts.get(src) ?? 0) + 1)
  }
  const named = [...counts.entries()].map(([s, n]) => `${n}× ${s}`).join(', ')
  return `[pool] REFUSED ${refused.length} record(s) — not pool-eligible: ${named}. ` +
    `Only ${POOL_ELIGIBLE_SOURCES.join(', ')} may be reused across clients (F13/F15). ` +
    `The sourcing run was NOT affected; the client still has these leads.`
}

// ── ⚑ 12 Sep — AN ADDRESS THAT CANNOT BE MAILED IS NOT INVENTORY ───────────────────────
//
// 🛑 WHAT THIS CLOSES, AND WHAT IT DOES NOT. The pool read already refuses a HARD BOUNCE:
// bounces and spam complaints land in `opt_out_blocklist` with `reason='hard_bounce' |
// 'spam_complaint'` (sending-health.ts), and `selectPoolCandidates` queries that table with
// no reason filter, so they have always been excluded. What was never asked is whether the
// stored address is a REAL address at all.
//
// Two kinds of unusable row, both already named elsewhere in this repo and neither asked here:
//   · PLACEHOLDER — `email_not_unlocked@…`, `example.com`, `domain.com`. `isPlaceholderEmail`
//     has guarded the provider path since #375 (AR-38); the pool path never called it, so a
//     placeholder that entered the pool was servable for ever.
//   · UNDELIVERABLE DOMAIN — `.invalid` (RFC 2606, and the TLD every MBF demo address uses),
//     `.test`, `localhost`. `email.ts` refuses these at the SEND seam — which is far too late:
//     by then the row has been served, has consumed a slot, and has SHRUNK the external ask
//     by one. A free row that can never be mailed costs money twice.
//
// ⚠️ WHY IT IS HERE AND PURE. Usability is a property of the string, not of the database. The
// same predicate has to answer for the pool read, the lookalike provider half and the CMO
// path, and three copies of a domain list is how they drift (the same reasoning that put
// `GENERIC_EMAIL_DOMAINS` in one place).
//
// ⚠️ IT IS NOT A DELIVERABILITY CHECK AND MUST NOT GROW INTO ONE. It refuses addresses that
// are structurally incapable of receiving mail. Whether a real mailbox is still alive is the
// bounce ledger's question, and it is already answered.
export function isPoolEmailUsable(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase()
  if (isPlaceholderEmail(e)) return false
  const domain = e.split('@')[1] ?? ''
  if (!domain) return false
  if (domain === 'invalid' || domain.endsWith('.invalid')) return false
  if (domain === 'test' || domain.endsWith('.test')) return false
  if (domain === 'localhost') return false
  return true
}

/** Six months in ms — the freshness horizon for a pooled email. */
export const POOL_FRESHNESS_MS = 6 * 30 * 24 * 60 * 60 * 1000

/**
 * A pooled record is STALE when its last verification (or, if never re-verified,
 * its acquisition) is older than ~6 months — the email may have decayed. We still
 * serve stale records (the reveal flow re-verifies via Hunter and refunds on a
 * dead email); this is informational only. Null timestamps count as stale but
 * never throw.
 */
export function isPoolRecordStale(rec: PoolRecord, now: number = Date.now(), maxAgeMs: number = POOL_FRESHNESS_MS): boolean {
  const ref = rec.last_verified_at ?? rec.sourced_at ?? null
  if (!ref) return true
  const t = Date.parse(ref)
  if (Number.isNaN(t)) return true
  return now - t > maxAgeMs
}
