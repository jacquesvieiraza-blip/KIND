import { exhaustedMessage } from './pdl-cursor'

// PR-A — honest ICP-run outcome status + client-facing copy.
// runIcpJob records one of these per run into icp_run_outcomes; the portal reads the
// latest and renders the matching message so a quota outage is never mistaken for a
// narrow ICP. Pure functions — unit-tested without a DB.

// `audience_exhausted` (#366) is NOT `no_match`. no_match says "your ICP is too narrow —
// nobody like this exists"; audience_exhausted says "your ICP was right, we found all of
// them, and you already have every one". Told the wrong one, a client widens an ICP that
// was working, or gives up on one that simply finished. They are opposite instructions.
export type RunStatus = 'served' | 'no_match' | 'quota_exhausted' | 'demo' | 'audience_exhausted'

/**
 * Derive the outcome status from what actually happened in the run.
 * - quotaRefused: try_spend_sourcing granted 0 AND the pool served 0 (no pre-funded
 *   budget / monthly ceiling reached) — the run could not even attempt PDL.
 * - isDemo: a demo client (pool-only, $0) — leads may be 0 on a fresh pool.
 * - audienceExhausted: PDL has nobody left for this exact query (#366).
 * - totalInserted: pool-served + PDL-inserted leads for this run.
 */
export function deriveRunStatus(
  isDemo: boolean,
  totalInserted: number,
  quotaRefused: boolean,
  audienceExhausted = false,
): RunStatus {
  if (quotaRefused) return 'quota_exhausted'
  if (isDemo) return 'demo'
  // A run that both exhausted the audience AND still delivered leads is a `served` run —
  // the client got people today; the "you have them all" conversation belongs to the run
  // that actually comes back empty.
  if (totalInserted > 0) return 'served'
  return audienceExhausted ? 'audience_exhausted' : 'no_match'
}

/** Client-facing message for a run outcome. Honest: never blames the client for a
 *  platform quota outage, and never hides a genuine no-match behind a vague spinner. */
export function runOutcomeMessage(status: RunStatus, totalInserted: number, alreadyHeld = 0): string {
  switch (status) {
    case 'quota_exhausted':
      return 'Sourcing capacity is temporarily out — the team has been alerted and your credits are untouched. Try again shortly.'
    case 'audience_exhausted':
      // #366 — the honest end-of-audience sentence. Never "no leads matched", which blames
      // targeting that was in fact correct all the way to the last person in it.
      return exhaustedMessage(alreadyHeld)
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

// The portal's show/tone decision for this outcome lives in `@kind/shared`
// (`run-outcome-banner.ts`) — one tested rule, shared by the API and the UI, rather than an
// allowlist copied into JSX. See that file for why the allowlist had to go.
