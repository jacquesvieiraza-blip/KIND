// ═══════════════════════════════════════════════════════════════════════════════════════
// POOL CANDIDATES — the ONE place that asks "what reusable inventory do we already own?"
//
// ── ⚑ 12 Sep — WHY THIS FILE EXISTS (founder-locked, POOL-FIRST gate) ───────────────────
//
// 🛑 POOL FIRST WAS A CONVENTION, NOT A FENCE, AND TWO ROUTES DID NOT FOLLOW IT.
// `runIcpJob` serves owned inventory before it buys, and it always has. But that ordering
// lived INSIDE `runIcpJob`, so it protected exactly the paths that went through it:
//
//   ① `POST /lookalike/generate` asked Apollo/PDL for 50 records with no pool read at all,
//      inserted them, and wrote nothing back — so the next run could buy the same people again.
//   ② `POST /internal/cmo/prospect` (and `/cmo/self-outreach`) asked Apollo for 20 House
//      prospects, emailed them to the founder, and retained nothing. Paid, kept nothing.
//
// The zero-spend guard's own header named this failure a month before it was found:
// *"A guard placed in the sourcing route protects the paths somebody remembered to guard."*
//
// ⚠️ THIS IS AN EXTRACTION, NOT A SECOND ARCHITECTURE (founder: "Do not create a second
// sourcing architecture. KISS."). Every rule below was already running inside
// `servePoolLeads`; it has been MOVED here so three callers ask the same question of the same
// code. `servePoolLeads` keeps everything that is genuinely its own — the programme
// reservation, the lead insert, the $0 ledger row and the operator counters.
//
// ── THE SEVEN CLAUSES THIS SERVES ───────────────────────────────────────────────────────
//   1 check pooled inventory first · 2 apply the normal ICP/geo/suppression/eligibility rules
//   3 serve every eligible pooled record · 4 compute the remainder · 5 buy only the remainder
//   6 write new reusable Apollo/PDL records back · 7 never pay for an identity we already own
//
// Clauses 1, 4 and 5 belong to the callers (they own the target number). THIS file owns 2 and
// 3 — and it is the only implementation of them.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { launchCountrySpellings, apolloSenioritiesFor } from '@kind/shared'
import { normalizeRevealEmail, normalizeRevealEmails } from './billing-rules'
import { isSuppressed } from './suppression'
import {
  poolCountryMatches,
  isGeoServable,
  isPoolSourceEligible,
  isPoolEmailUsable,
  isPoolRecordStale,
  poolRecordMatchesIcp,
  POOL_ELIGIBLE_SOURCES,
} from './pool-sourcing'

/** The targeting a pool read needs. Same shape `servePoolLeads` has always taken. */
export type PoolCandidateIcp = {
  id?:               string
  job_titles?:       string[] | null
  industries?:       string[] | null
  geographies?:      string[] | null
  seniority_levels?: string[] | null
  /** ⚑ 18 Sep (J5-C12) — company size, carried so `poolRecordMatchesIcp` can test it. */
  company_sizes?:    string[] | null
  /**
   * ── ⚑ 18 Sep (J5-C12 · FD-1) — THE CLIENT'S EXCLUSIONS, ON THE FREE PATH TOO ─────────
   *
   * ⚠️ IT TRAVELS AS FAR AS THE DECISION DOES. `selectPoolCandidates` hands this to
   * `poolRecordMatchesIcp`, which delegates to the one hard-fit rule — so a type that stops
   * short here is a suppression that stops short in the product, however correct the rule is.
   * The caller passes the ICP row whole, so the field arrives as long as the type admits it.
   */
  /** ⚑ 18 Sep (J5-C4) — the size the client STATED; it outranks the six provider bands. */
  target_size?:      string | null
  exclusions?:       string | null
}

/** A row of `lead_pool`, as read. */
export type PoolCandidate = {
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

export interface PoolCandidateCounters {
  /** Rows the widened query returned, before any decision. */
  candidates:        number
  notSourceEligible: number
  notGeoServable:    number
  notHardFit:        number
  /** ⚑ 12 Sep — placeholder / structurally-unmailable addresses. */
  notUsable:         number
  /**
   * ⚑ 12 Sep — STALE, AND **SERVED ANYWAY** (founder decision S1, 12 Sep).
   *
   * 🛑 THIS IS A COUNT, NEVER A FILTER, AND THE REASON IS CLAUSE 7. Excluding a six-month-old
   * record shrinks owned inventory, which GROWS the remainder, which means we buy MORE from
   * the provider — the exact opposite of *"never pay externally for an eligible reusable
   * identity we already have"*. `isPoolRecordStale` also counts a NULL timestamp as stale, and
   * the known production rows carry null metadata, so a filter here would refuse them outright.
   *
   * The compensating control already exists and is unchanged: the reveal flow re-verifies via
   * Hunter and refunds on a dead address. What was missing was never the exclusion — it was
   * the VISIBILITY. That is what this number is.
   */
  stale:             number
}

export interface PoolCandidateResult {
  /** Eligible rows, already capped, in query order. */
  eligible:    PoolCandidate[]
  /** email_norm → acquisition_cost, for the caller's cost-avoided reporting. */
  costByEmail: Map<string, number>
  counters:    PoolCandidateCounters
}

const EMPTY = (): PoolCandidateResult => ({
  eligible: [],
  costByEmail: new Map(),
  counters: { candidates: 0, notSourceEligible: 0, notGeoServable: 0, notHardFit: 0, notUsable: 0, stale: 0 },
})

/**
 * Read the reusable inventory that matches this targeting.
 *
 * @param cap      how many rows the caller can actually use. The candidate buffer is wider
 *                 (`cap*5`, min 50) because the decisions below are made in JS.
 * @param clientId when given, rows this client ALREADY HOLDS in `leads` are excluded — which
 *                 also covers the ones they passed on and the ones the structural gate set
 *                 aside. Omit it for a caller that has no client (House prospecting), where
 *                 that question does not exist; every other rule still applies.
 *
 * ⚠️ NEVER THROWS. A pool read that fails must fall through to the provider rather than take
 * the run down — the same non-fatal contract `servePoolLeads` has always had.
 */
export async function selectPoolCandidates(
  icp: PoolCandidateIcp,
  opts: { cap: number; clientId?: string | null },
): Promise<PoolCandidateResult> {
  const { cap, clientId } = opts
  if (cap <= 0) return EMPTY()
  try {
    // PostgREST .or() splits on commas and treats *,(,) specially — strip them so a
    // value can't break the filter (OR-generous, so a coarser term is harmless).
    const clean = (v: string) => v.replace(/[,()*%]/g, ' ').trim()
    const geos   = (icp.geographies      ?? []).map(clean).filter(Boolean)
    const titles = (icp.job_titles       ?? []).map(clean).filter(Boolean)
    const inds   = (icp.industries       ?? []).map(clean).filter(Boolean)
    // ⛓️ 24 Sep (R145 step 3a · #23) — AND APOLLO'S OWN SENIORITY KEYS. A pooled row bought from
    // Apollo stores `c_suite`, never our label "C-Suite", so the prefilter asked for a word the
    // rows do not hold. Both spellings are asked; the decision below is unchanged.
    const sens   = [...new Set([...(icp.seniority_levels ?? []), ...apolloSenioritiesFor(icp.seniority_levels ?? [])])]
      .map(clean).filter(Boolean)

    // ── ⚑ 27 Aug — THE COUNTRY TERM IS EXPANDED TO EVERY SPELLING OF THAT COUNTRY ────────
    //
    // `lead_pool.country` is free text written by whichever provider or import created the
    // row, so one country is stored under several spellings at once. Asking for only the
    // client's own wording misses owned, relevant inventory.
    //
    // ⚠️ EXACT PER SPELLING, NEVER SUBSTRING. The candidate buffer is BOUNDED, so a substring
    // prefilter is a starvation channel: `country ILIKE '%us%'` admits Australia, Austria,
    // Belarus, Cyprus and Mauritius into the limited window, and every false row it admits can
    // push a genuine United States row OUT of the set the JS filter ever sees.
    const geoTerms = [...new Set(geos.flatMap(g => launchCountrySpellings(g)).map(clean).filter(Boolean))]

    // ⚑ 10 Sep (C02) — DELIBERATELY WIDE, and the narrowing happens below: the query casts the
    // net so the DECISION can be made on the row by `poolRecordMatchesIcp` → `proof-fit.ts`.
    //
    // ── ⚑ 27 Aug — R73 IS ENFORCED ON THE READ, NOT ONLY THE WRITE ───────────────────────
    // A historical SQL import bypasses the TypeScript writer entirely — that is not
    // hypothetical, it is how the 85 production rows arrived — so without a fence here a
    // customer/inbound or unknown-provenance row could be served CROSS-CLIENT. It must be a
    // DATABASE filter, BEFORE `.limit(...)`: filtering in JS afterwards would let ineligible
    // rows consume the bounded window. FAIL CLOSED — NULL, blank and unlisted are refused.
    let q = db.from('lead_pool').select('*').in('source', [...POOL_ELIGIBLE_SOURCES])
    if (geoTerms.length) q = q.or(geoTerms.map(g => `country.ilike.${g}`).join(','))
    const roleOr = [
      ...titles.map(t => `title.ilike.*${t}*`),
      ...inds.map(i => `industry.ilike.*${i}*`),
      ...sens.map(s => `seniority.ilike.*${s}*`),
    ]
    if (roleOr.length) q = q.or(roleOr.join(','))

    const { data: rows, error } = await q.limit(Math.max(cap * 5, 50))
    if (error) { console.error('[pool] lead_pool query failed (non-fatal, caller falls through to the provider):', error); return EMPTY() }
    const candidates = (rows ?? []) as PoolCandidate[]
    if (candidates.length === 0) return EMPTY()

    const norm = (e: string | null | undefined) => normalizeRevealEmail(e)

    // ⚑ 10 Sep (C02) — what we already paid for these rows, captured beside its own select.
    const costByEmail = new Map<string, number>()
    for (const c of candidates) {
      const key = norm(c.email_norm)
      if (key && typeof c.acquisition_cost === 'number' && Number.isFinite(c.acquisition_cost)) {
        costByEmail.set(key, Number(c.acquisition_cost))
      }
    }

    const candEmails = normalizeRevealEmails(candidates.map(c => c.email_norm))
    if (candEmails.length === 0) return EMPTY()

    // Anti-dup — every email this client already holds. Bounded to this client's leads.
    // ⚠️ SKIPPED ENTIRELY WITHOUT A CLIENT, not faked with an empty set by accident: House
    // prospecting has no pipeline to be a duplicate of.
    let owned = new Set<string>()
    if (clientId) {
      const { data: ownedRows } = await db.from('leads')
        .select('email').eq('client_id', clientId).not('email', 'is', null)
      owned = new Set((ownedRows ?? []).map(r => norm(r.email)).filter(Boolean) as string[])
    }

    // Blocklist — never serve an opted-out email (unless they opted back in).
    // ⚠️ THIS IS ALSO THE HARD-BOUNCE FENCE. Bounces and spam complaints are written here with
    // `reason='hard_bounce' | 'spam_complaint'`, and this query deliberately carries NO reason
    // filter, so every one of them is refused by the same statement.
    const { data: blockedRows } = await db.from('opt_out_blocklist')
      .select('email').is('opted_back_in_at', null).in('email', candEmails)
    const blocked = new Set((blockedRows ?? []).map(r => norm(r.email)).filter(Boolean) as string[])

    const counters: PoolCandidateCounters = {
      candidates: candidates.length,
      notSourceEligible: 0, notGeoServable: 0, notHardFit: 0, notUsable: 0, stale: 0,
    }
    const geoGated = geos.length > 0

    const eligible = candidates.filter(c => {
      const e = norm(c.email_norm)
      if (!e) return false
      // R73 RIGHTS, decided here — the database prefilter narrows the window, it does not
      // make the decision. Widen there, decide here.
      if (!isPoolSourceEligible(c.source)) { counters.notSourceEligible++; return false }
      // ⚑ 12 Sep — USABLE AT ALL? A placeholder or `.invalid` row is not inventory: serving it
      // consumes a slot AND shrinks the external ask by one, so it costs money twice.
      if (!isPoolEmailUsable(e)) { counters.notUsable++; return false }
      // GEOGRAPHY, PRECISELY. An unknown country never satisfies a geography — never a wildcard.
      if (geoGated && !poolCountryMatches(c.country, geos)) {
        if (!isGeoServable(c)) counters.notGeoServable++
        return false
      }
      // ⚠️ `owned` IS THE STRUCTURAL-REJECTION EXCLUSION TOO, and that is not a coincidence.
      // A candidate this client already holds in `leads` is excluded — which covers the ones
      // they passed on, the ones they marked "not a fit", and the ones the structural gate set
      // aside. Re-serving any of those would show them somebody they or we had already refused,
      // from the pool, for free, as though it were new.
      if (owned.has(e)) return false
      if (blocked.has(e)) return false
      // DO-NOT-CONTACT floor (founder's employer) — same guard as the provider path.
      if (isSuppressed({ email: e, company: c.company, linkedin: c.linkedin_url })) return false
      // HARD FIT — one rule, not two: `poolRecordMatchesIcp` delegates to `proof-fit.ts`, the
      // same judgement the structural gate applies before surfacing.
      if (!poolRecordMatchesIcp(c as never, icp as never)) { counters.notHardFit++; return false }
      // ⚑ 12 Sep (S1) — COUNTED AFTER THE ROW IS ACCEPTED, never as a rejection. See the
      // `stale` field above for why this is not a filter.
      if (isPoolRecordStale(c as never)) counters.stale++
      return true
    }).slice(0, cap)

    return { eligible, costByEmail, counters }
  } catch (err) {
    console.error('[pool] selectPoolCandidates failed (non-fatal, caller falls through to the provider):', err)
    return EMPTY()
  }
}

/** One operator line per pool read. Counts only — no PII, ever. */
export function logPoolCounters(tag: string, c: PoolCandidateCounters, served: number): void {
  if (c.notSourceEligible > 0) {
    console.error(`[pool] stage=pool_source_refused ${tag} — ${c.notSourceEligible} candidate(s) refused for cross-client serving because their stored source is not K.I.N.D-acquired (R73 allows ${POOL_ELIGIBLE_SOURCES.join(', ')}; NULL/blank/unlisted fail closed). A non-zero count means rows entered the pool outside the guarded writer.`)
  }
  if (c.notUsable > 0) {
    console.error(`[pool] stage=pool_unusable_email ${tag} — ${c.notUsable} of ${c.candidates} candidate(s) carry a placeholder or structurally unmailable address and were NOT served. The external ask grows by the same number rather than the client being shown somebody we can never contact.`)
  }
  if (c.notHardFit > 0) {
    console.log(`[pool] stage=pool_hard_fit ${tag} — ${c.notHardFit} of ${c.candidates} owned candidate(s) did not match this targeting (geography · size · industry · seniority) and were NOT served.`)
  }
  if (c.notGeoServable > 0) {
    console.error(`[pool] stage=pool_country_missing ${tag} — ${c.notGeoServable} of ${c.candidates} candidate(s) carry no usable country, so they cannot satisfy geography-targeted sourcing. The records are kept, not deleted.`)
  }
  if (c.stale > 0) {
    console.log(`[pool] stage=pool_stale ${tag} — ${c.stale} of ${served} served record(s) are older than the freshness horizon and were SERVED ANYWAY (founder decision S1, 12 Sep): excluding them would grow the paid remainder, and the reveal flow already re-verifies and refunds on a dead address. Count only — never a filter.`)
  }
}

/** A provider contact, in the shape every provider path already produces. */
export type ProviderContactLike = {
  email?:        string | null
  linkedin_url?: string | null
  organization?: { name?: string | null } | null
  organization_name?: string | null
}

/**
 * ⚑ 12 Sep — THE PROVIDER HALF OF A SOURCING RUN, PUT BEHIND THE SAME PROTECTIONS.
 *
 * 🛑 WHY THIS IS NOT OPTIONAL (founder amendment, 12 Sep). Pool First on its own would have
 * given `/lookalike/generate` opt-out and DNC protection on its POOLED half and left its
 * PROVIDER half exactly as it was — inserting straight into a client's pipeline with no
 * blocklist probe, no do-not-contact floor and no placeholder check. Half a guard on a
 * destructive-by-default path is worse than none, because the log then reads as protected.
 *
 * ⚠️ IT REUSES, IT DOES NOT REIMPLEMENT. `isSuppressed`, `opt_out_blocklist` and
 * `isPoolEmailUsable` are the same three questions `runIcpJob` asks of its own provider
 * results — in the same order, with the same normalisation (HC-1: probe with the NORMALISED
 * address, never the provider's raw one).
 *
 * ⚠️ IT DECIDES NOTHING ELSE. No geography gate, no audience rule, no verified-only lock, no
 * pricing, no programme authority — those belong to the caller and are untouched.
 *
 * @returns the contacts that may become usable client inventory, plus per-reason counts.
 */
export async function filterProviderContacts<T extends ProviderContactLike>(
  contacts: readonly T[],
): Promise<{ accepted: T[]; refused: { unusable: number; suppressed: number; blocked: number } }> {
  const refused = { unusable: 0, suppressed: 0, blocked: 0 }
  if (contacts.length === 0) return { accepted: [], refused }

  // ⚠️ NAMED, NOT `emails`. The HC-1 guard refuses a generic name on its allowlist, and it
  // is right to: `emails` says nothing about whether the value was normalised.
  const providerEmails = normalizeRevealEmails(contacts.map(c => c.email))
  let blocked = new Set<string>()
  if (providerEmails.length > 0) {
    const { data: blockedRows } = await db.from('opt_out_blocklist')
      .select('email').is('opted_back_in_at', null).in('email', providerEmails)
    blocked = new Set(
      (blockedRows ?? []).map(r => normalizeRevealEmail(r.email)).filter(Boolean) as string[],
    )
  }

  const accepted: T[] = []
  for (const c of contacts) {
    const e = normalizeRevealEmail(c.email)
    // ⚠️ A CONTACT WITH NO ADDRESS IS NOT REFUSED HERE. Some paths legitimately carry a
    // LinkedIn-only record; whether that is usable is the caller's question. What IS refused is
    // an address that is present and cannot be mailed.
    if (c.email && !isPoolEmailUsable(e)) { refused.unusable++; continue }
    if (isSuppressed({ email: e || c.email, company: c.organization?.name ?? c.organization_name, linkedin: c.linkedin_url })) {
      refused.suppressed++; continue
    }
    if (e && blocked.has(e)) { refused.blocked++; continue }
    accepted.push(c)
  }
  return { accepted, refused }
}
