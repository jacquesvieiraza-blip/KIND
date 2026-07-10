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

/**
 * OR-generous structured candidate match — mirrors the DB query in servePoolLeads.
 * A record is a candidate when:
 *   country ILIKE any geography (if any geography is set)  AND
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

  // Geography gate (only when the ICP specifies geographies).
  if (geos.length > 0 && !containsAny(rec.country, geos)) return false

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
