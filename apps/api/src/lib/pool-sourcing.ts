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
// `lead_pool` is a CROSS-CLIENT store: a record bought for client A is served to client B. That
// is a licensing question before it is an engineering one, and the answer is **provider-
// specific** (F13/F15). PDL is bought under terms we believe permit it — F13 is still open on
// the order form — and Apollo's terms are a different document with different answers.
//
// ⚠️ TODAY THIS REFUSES NOTHING, AND THAT IS THE POINT. One writer exists and it hard-codes
// `source: 'pdl'` (`routes/icps.ts`), so the pool is structurally clean right now. The risk is
// entirely in the future tense: a second sourcing path, written by somebody who does not know
// the pool is cross-client, tags its records `apollo` — or forgets to tag them at all — and
// every client afterwards is served records we had no right to reuse. Nothing in the code
// would object, and the first sign would be a letter.
//
// A tripwire that has never fired is not a tripwire that does nothing.
//
// ⚠️ NOT A KILL-SWITCH ON SOURCING. Founder-ruled: refusal skips the POOL write only. The
// client still gets every lead their run bought — the lead rows, the delivery and the charge
// are all upstream of this and untouched. Refusing the run instead would turn a licensing
// precaution into an outage.

/** The sources we may serve to a SECOND client. Widening this is a licensing decision. */
export const POOL_ELIGIBLE_SOURCES: readonly string[] = ['pdl']

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
