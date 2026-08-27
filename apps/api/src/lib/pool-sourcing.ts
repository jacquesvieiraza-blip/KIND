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
//   • poolRecordMatchesIcp — the OR-generous structured candidate predicate.
//   • splitPoolAndRemainder — the "serve pool, source only the rest" split so we
//     can never over-source (pool-served count is subtracted from the PDL ask).
// ─────────────────────────────────────────────────────────────────────────────

import { canonicalLaunchCountry } from '@kind/shared'

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
}

/** case-insensitive "does `hay` contain any of `needles`" (ILIKE %needle%). */
function containsAny(hay: string | null | undefined, needles: string[]): boolean {
  if (!hay) return false
  const h = hay.toLowerCase()
  return needles.some(n => n && h.includes(n.toLowerCase()))
}

// ── ⚑ 27 Aug — COUNTRY IS COMPARED CANONICALLY, AND ONLY COUNTRY ───────────────────────────
//
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
  const geos   = (icp.geographies      ?? []).filter(Boolean)
  const titles = (icp.job_titles       ?? []).filter(Boolean)
  const inds   = (icp.industries       ?? []).filter(Boolean)
  const sens   = (icp.seniority_levels ?? []).filter(Boolean)

  // Geography gate (only when the ICP specifies geographies). Canonical equality since
  // 27 Aug — see the block above `canonicalPoolCountry` for the two failures substring caused.
  if (geos.length > 0 && !poolCountryMatches(rec.country, geos)) return false

  // Role/industry/seniority gate — OR-generous. With no signal at all, don't narrow.
  if (titles.length === 0 && inds.length === 0 && sens.length === 0) return true
  return containsAny(rec.title, titles)
      || containsAny(rec.industry, inds)
      || containsAny(rec.seniority, sens)
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
export function resolveHistoricalProvider(opts: {
  source?: string | null
  isHouseAccount?: boolean
  memorySources?: readonly (string | null | undefined)[]
}): 'pdl' | 'apollo' | null {
  const s = (opts.source ?? '').trim().toLowerCase()
  if (s && CUSTOMER_INBOUND_SOURCES.includes(s)) return null                    // A
  if (s === 'pdl' || s === 'apollo') return s                                   // B
  if (s === 'lookalike') return 'pdl'                                           // C
  if (opts.isHouseAccount) return 'apollo'                                      // D
  const eligible = [...new Set((opts.memorySources ?? [])                       // E
    .map(m => (m ?? '').trim().toLowerCase())
    .filter(m => m === 'pdl' || m === 'apollo'))]
  if (eligible.length === 1) return eligible[0] as 'pdl' | 'apollo'
  return null                                                                   // fail closed
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
export function splitPoolEligible<T extends PoolWriteCandidate>(
  records: readonly T[],
): { eligible: T[]; refused: T[] } {
  const eligible: T[] = []
  const refused: T[] = []
  for (const r of records) {
    const src = typeof r.source === 'string' ? r.source.trim().toLowerCase() : ''
    if (src && POOL_ELIGIBLE_SOURCES.includes(src)) eligible.push(r)
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
