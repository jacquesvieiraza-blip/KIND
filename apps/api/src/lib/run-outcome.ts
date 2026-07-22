// PR-A — honest ICP-run outcome status + client-facing copy.
// runIcpJob records one of these per run into icp_run_outcomes; the portal reads the
// latest and renders the matching message so a quota outage is never mistaken for a
// narrow ICP. Pure functions — unit-tested without a DB.

export type RunStatus = 'served' | 'no_match' | 'quota_exhausted' | 'demo'

/**
 * Derive the outcome status from what actually happened in the run.
 * - quotaRefused: try_spend_sourcing granted 0 AND the pool served 0 (no pre-funded
 *   budget / monthly ceiling reached) — the run could not even attempt PDL.
 * - isDemo: a demo client (pool-only, $0) — leads may be 0 on a fresh pool.
 * - totalInserted: pool-served + PDL-inserted leads for this run.
 */
export function deriveRunStatus(
  isDemo: boolean,
  totalInserted: number,
  quotaRefused: boolean,
): RunStatus {
  if (quotaRefused) return 'quota_exhausted'
  if (isDemo) return 'demo'
  return totalInserted > 0 ? 'served' : 'no_match'
}

/** Client-facing message for a run outcome. Honest: never blames the client for a
 *  platform quota outage, and never hides a genuine no-match behind a vague spinner. */
export function runOutcomeMessage(status: RunStatus, totalInserted: number): string {
  switch (status) {
    case 'quota_exhausted':
      return 'Sourcing capacity is temporarily out — the team has been alerted and your credits are untouched. Try again shortly.'
    case 'no_match':
      return 'No leads matched this ICP. Try widening it — broaden the job titles, seniority, industries or regions.'
    case 'demo':
      return totalInserted > 0
        ? `Demo run — ${totalInserted} leads served from the shared pool at no cost.`
        : 'Demo run — no pool leads matched this ICP yet. Widen the ICP to see sample leads.'
    case 'served':
    default:
      return `Sourced ${totalInserted} lead${totalInserted === 1 ? '' : 's'}.`
  }
}
