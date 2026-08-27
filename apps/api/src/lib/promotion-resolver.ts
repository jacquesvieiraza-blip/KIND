// ── ⚑ 27 Aug — THE PROMOTION RESOLVER MODEL (pure, executable, test-only surface) ──────────
//
// `supabase/maintenance/2026-08-27_kind_acquired_pool_promotion.sql` cannot be run from the
// test suite — it needs a live Postgres. But its correctness is not a matter of SQL syntax,
// it is a matter of the CLASSIFICATION RULES, and those can be executed. This module is the
// same state machine the SQL implements, written once in TypeScript so the ambiguity rules
// are proved by running them rather than by grepping the SQL for a keyword.
//
// ⚠️ THIS IS NOT PRODUCTION RUNTIME. Nothing in `apps/api` imports it outside tests; the
// serving path uses `pool-sourcing.ts`. It exists so that "Phase A predicts Phase B" is a
// statement a test can EXECUTE — the whole point of this pass — instead of an assertion
// about two blocks of SQL that look similar.
//
// ⚠️ IT MUST STAY IN STEP WITH THE SQL. `pool-country-contract.test.ts` asserts the SQL
// contains the same decisive clauses (identity key shape, ambiguity guards, the executable
// WHERE). If you change one, change both — the test is what makes that binding real.

import { canonicalPoolCountry } from './pool-sourcing'

/** Sources a CUSTOMER writer stamps — these rows contribute NOTHING, ever. */
const CUSTOMER = new Set(['csv_import', 'web_form', 'company_csv', 'vida_chat', 'milla_onboarding'])

/** One row of `public.leads`, reduced to the fields the resolver reads. */
export type LeadRowModel = {
  leadId: string
  emailNorm: string
  source?: string | null
  providerId?: string | null
  country?: string | null
  jobTitle?: string | null
  industry?: string | null
  seniority?: string | null
  company?: string | null
  firstName?: string | null
  isHouse?: boolean
  createdAt: number
}

/** One row of `public.acquisition_memory` — keyed (source, provider_id). */
export type MemoryRowModel = {
  emailNorm: string
  source: string
  providerId: string | null
  costUsd: number
}

export type AcquisitionModel = {
  acquisitionKey: string
  emailNorm: string
  provider: 'pdl' | 'apollo'
  isHouse: boolean
  hasRole: boolean
  distinctCountries: number
  resolvedCountry: string | null
  countryAmbiguous: boolean
  distinctCosts: number
  resolvedCost: number | null
  costAmbiguous: boolean
  costUnprovable: boolean
  alreadyPooled: boolean
  /** metadata carried into the pool — from THIS acquisition's rows only */
  /** what Phase B actually inserts — earliest NON-BLANK value from this acquisition's rows */
  metadata: {
    jobTitle: string | null; industry: string | null; seniority: string | null
    company: string | null; firstName: string | null
  }
}

export type IdentityState =
  | 'already_in_pool'
  | 'customer_only_excluded'
  | 'unknown_only_excluded'
  | 'customer_and_unknown_excluded'
  | 'acquisition_identity_ambiguous'
  | 'cost_ambiguous'
  | 'cost_unprovable'
  | 'metadata_incomplete'
  | 'executable_promotion'

/** Earliest non-blank value of one field across an acquisition's own (already sorted) rows. */
function firstNonBlank(rows: readonly LeadRowModel[], pick: (r: LeadRowModel) => string | null | undefined): string | null {
  for (const r of rows) { const v = pick(r); if (v != null && v.trim() !== '') return v }
  return null
}

/** Per-ROW provider resolution — steps A–E of the SQL's CASE, in the same order. */
export function resolveRowProvider(row: LeadRowModel, memory: readonly MemoryRowModel[]): 'pdl' | 'apollo' | null {
  const src = (row.source ?? '').trim().toLowerCase()
  if (CUSTOMER.has(src)) return null                                   // A — the tag always wins
  if (src === 'pdl' || src === 'apollo') return src                    // B
  if (src === 'lookalike') return 'pdl'                                // C
  if (row.isHouse) return 'apollo'                                     // D
  if (!row.providerId) return null                                     // E — nothing to bind to
  const claims = [...new Set(memory
    .filter(m => m.emailNorm === row.emailNorm && m.providerId === row.providerId)
    .map(m => m.source.trim().toLowerCase())
    .filter(s => s === 'pdl' || s === 'apollo'))]
  return claims.length === 1 ? (claims[0] as 'pdl' | 'apollo') : null
}

/**
 * Group owned rows into ACQUISITIONS — the atomic (provider, provider_id) identity, or
 * (provider, 'house:'||email) for the house book whose rows predate provider-id capture.
 * Unresolved and customer rows are dropped BEFORE grouping, so they cannot contribute
 * metadata, a country, or a cost to any acquisition.
 */
export function buildAcquisitions(
  rows: readonly LeadRowModel[],
  memory: readonly MemoryRowModel[],
  pooledEmails: ReadonlySet<string> = new Set(),
): AcquisitionModel[] {
  const owned = rows
    .map(r => ({ r, provider: resolveRowProvider(r, memory) }))
    .filter((x): x is { r: LeadRowModel; provider: 'pdl' | 'apollo' } => x.provider !== null)
    .filter(x => x.r.providerId != null || x.r.isHouse === true)

  const groups = new Map<string, { provider: 'pdl' | 'apollo'; rows: LeadRowModel[] }>()
  for (const { r, provider } of owned) {
    const key = r.providerId != null
      ? `${provider}:${r.providerId}`
      : `${provider}:house:${r.emailNorm}`
    const g = groups.get(key) ?? { provider, rows: [] }
    g.rows.push(r)
    groups.set(key, g)
  }

  return [...groups.entries()].map(([acquisitionKey, g]) => {
    const sorted = [...g.rows].sort((a, b) => a.createdAt - b.createdAt || a.leadId.localeCompare(b.leadId))
    const emailNorm = sorted[0].emailNorm
    const providerId = sorted.find(r => r.providerId != null)?.providerId ?? null
    const isHouse = sorted.some(r => r.isHouse === true)

    // COUNTRY — canonicalise FIRST, then count distinct. GB + England + UK is ONE country.
    const countries = [...new Set(sorted.map(r => canonicalPoolCountry(r.country)).filter(Boolean))]
    const distinctCountries = countries.length
    const countryAmbiguous = distinctCountries > 1
    const resolvedCountry = distinctCountries === 1 ? countries[0] : null

    // COST — bound to the same (source, provider_id) identity. Never MIN to force a number.
    const costs = [...new Set(memory
      .filter(m => m.emailNorm === emailNorm && m.providerId === providerId
                && m.source.trim().toLowerCase() === g.provider)
      .map(m => m.costUsd))]
    const distinctCosts = costs.length
    const costAmbiguous = distinctCosts > 1
    const houseZero = distinctCosts === 0 && g.provider === 'apollo' && isHouse
    const costUnprovable = distinctCosts === 0 && !houseZero
    const resolvedCost = distinctCosts === 1 ? costs[0] : houseZero ? 0 : null

    return {
      acquisitionKey, emailNorm, provider: g.provider, isHouse,
      distinctCountries, resolvedCountry, countryAmbiguous,
      distinctCosts, resolvedCost, costAmbiguous, costUnprovable,
      alreadyPooled: pooledEmails.has(emailNorm),
      // ⚠️ THE REPRESENTATIVE SKIPS BLANKS. Taking the earliest row's value even when it was
      // null let `hasRole` say "some row had a title" while the row actually inserted had
      // none — Phase A metadata_complete, Phase B a blank role signal.
      metadata: {
        jobTitle:  firstNonBlank(sorted, r => r.jobTitle),
        industry:  firstNonBlank(sorted, r => r.industry),
        seniority: firstNonBlank(sorted, r => r.seniority),
        company:   firstNonBlank(sorted, r => r.company),
        firstName: firstNonBlank(sorted, r => r.firstName),
      },
      // hasRole describes the RESOLVED representative — what Phase B actually writes.
      hasRole: !!(firstNonBlank(sorted, r => r.jobTitle) || firstNonBlank(sorted, r => r.industry)
               || firstNonBlank(sorted, r => r.seniority)),
    }
  })
}

/** The per-EMAIL state A1 reports. Mirrors A1's CASE arms, in the same order. */
export function identityStates(
  acqs: readonly AcquisitionModel[],
  rows: readonly LeadRowModel[],
  memory: readonly MemoryRowModel[] = [],
): Map<string, IdentityState> {
  const byEmail = new Map<string, AcquisitionModel[]>()
  for (const a of acqs) byEmail.set(a.emailNorm, [...(byEmail.get(a.emailNorm) ?? []), a])

  // Per-email facts about NON-owned rows — the only thing that can say WHY an identity with
  // no owned acquisition is excluded: the data is the CUSTOMER'S, or its provenance cannot
  // be proved. Both exclude; they are not the same fact, and the audit must tell them apart.
  const out = new Map<string, IdentityState>()
  for (const email of new Set(rows.map(r => r.emailNorm))) {
    const mine = byEmail.get(email) ?? []
    const emailRows = rows.filter(r => r.emailNorm === email)
    const hasCustomerRow = emailRows.some(r => CUSTOMER.has((r.source ?? '').trim().toLowerCase()))
    const hasUnresolvedRow = emailRows.some(r =>
      !CUSTOMER.has((r.source ?? '').trim().toLowerCase()) && resolveRowProvider(r, memory) === null)

    if (mine.some(a => a.alreadyPooled))  { out.set(email, 'already_in_pool'); continue }
    if (mine.length > 1)                  { out.set(email, 'acquisition_identity_ambiguous'); continue }
    if (mine.length === 1) {
      if (mine[0].costAmbiguous)          { out.set(email, 'cost_ambiguous'); continue }
      if (mine[0].costUnprovable)         { out.set(email, 'cost_unprovable'); continue }
      if (!mine[0].hasRole)               { out.set(email, 'metadata_incomplete'); continue }
      out.set(email, 'executable_promotion'); continue
    }
    // no owned acquisition — say why
    if (hasCustomerRow && hasUnresolvedRow) { out.set(email, 'customer_and_unknown_excluded'); continue }
    if (hasCustomerRow)                     { out.set(email, 'customer_only_excluded'); continue }
    out.set(email, 'unknown_only_excluded')
  }
  return out
}

/**
 * ⚑ THE B2 HEAL GATE — may a pooled row's NULL country be filled from this email's proven
 * acquisitions? Fail closed on ANY ambiguity, including ambiguity hidden behind a NULL.
 */
export function healCountryFor(acqs: readonly AcquisitionModel[]): string | null {
  if (acqs.length === 0) return null
  if (acqs.some(a => a.countryAmbiguous)) return null          // nothing hidden by a NULL
  const known = [...new Set(acqs.map(a => a.resolvedCountry).filter((c): c is string => !!c))]
  return known.length === 1 ? known[0] : null                  // they must agree, exactly
}

/**
 * ⚑ THE EXECUTION SET — what Phase A counts and Phase B inserts. One function, so "Phase A
 * predicts Phase B" is true by construction rather than by two blocks of SQL agreeing.
 */
export function executableSet(acqs: readonly AcquisitionModel[]): AcquisitionModel[] {
  const perEmail = new Map<string, number>()
  for (const a of acqs) perEmail.set(a.emailNorm, (perEmail.get(a.emailNorm) ?? 0) + 1)
  return acqs.filter(a =>
    perEmail.get(a.emailNorm) === 1 &&   // 2+ owned acquisitions on one email → fail closed
    !a.alreadyPooled &&
    a.hasRole &&
    !a.costAmbiguous &&                  // ⚠️ ambiguity beats the house-zero default
    !a.costUnprovable &&
    a.resolvedCost !== null,
  )
}
