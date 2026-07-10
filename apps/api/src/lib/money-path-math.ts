// SPRINT 8a·③ (#448/#449) — Money Path arithmetic, DB-free so it can be unit-tested.
// The route (routes/money-path.ts) pulls the rows; these functions turn them into the
// numbers the admin surface renders. Kept pure + side-effect-free on purpose.

// PDL bills $0.28 per record sourced (verified 10 Jul: $280/1000). Reveals ($1) and
// FIGSY works ($3) are charge-first with only trivial marginal infra cost — modelled
// here so net_contribution reflects true margin, not just gross.
export const PDL_RATE_USD = 0.28
export const REVEAL_MARGINAL_COST_USD = 0.01 // per reveal (verify/send infra)
export const WORK_MARGINAL_COST_USD = 0.06   // per FIGSY work (send/enrich infra)

/**
 * USD value of a purchase credit_transactions row. `plan='figsy'` credits are $3 each
 * (FIGSY work); everything else (lead-gen reveal credits) is $1 each. Mirrors the
 * valuation used in the #445 sourcing-fences backfill so "collected" is consistent.
 */
export function creditTxUsd(plan: string | null | undefined, amount: number | null | undefined): number {
  const a = Number(amount ?? 0)
  if (!Number.isFinite(a) || a <= 0) return 0
  return plan === 'figsy' ? a * 3 : a * 1
}

/**
 * Net contribution for a client:
 *   collected − (records_sourced×$0.28 + reveals×$0.01 + works×$0.06)
 * Green when ≥ 0 (the client's cash covers what we spent on their behalf), red when < 0.
 */
export function netContribution(input: {
  collectedUsd: number
  recordsSourced: number
  reveals: number
  works: number
}): number {
  const cogs =
    input.recordsSourced * PDL_RATE_USD +
    input.reveals * REVEAL_MARGINAL_COST_USD +
    input.works * WORK_MARGINAL_COST_USD
  return input.collectedUsd - cogs
}

/**
 * records_sourced / reveals — how many records we sourced per lead actually revealed.
 * High = we're sourcing far more than clients unmask (waste). Null when reveals = 0
 * (NULLIF guard — an undefined ratio, not a divide-by-zero).
 */
export function sourceRevealRatio(recordsSourced: number, reveals: number): number | null {
  if (!reveals || reveals <= 0) return null
  return recordsSourced / reveals
}

/**
 * Blended effective $/record = total sourcing cost / total records sourced. Guards the
 * divide-by-zero (no records yet → 0).
 */
export function effectiveCostPerRecord(totalSourcingCostUsd: number, totalRecords: number): number {
  if (!totalRecords || totalRecords <= 0) return 0
  return totalSourcingCostUsd / totalRecords
}

/** Round to cents for display/JSON so raw PDL floats (2.80000003) don't leak out. */
export function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}
