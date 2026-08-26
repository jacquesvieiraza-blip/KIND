import { exhaustedMessage } from './pdl-cursor'

// PR-A — honest ICP-run outcome status + client-facing copy.
// runIcpJob records one of these per run into icp_run_outcomes; the portal reads the
// latest and renders the matching message so a quota outage is never mistaken for a
// narrow ICP. Pure functions — unit-tested without a DB.

// `audience_exhausted` (#366) is NOT `no_match`. no_match says "your ICP is too narrow —
// nobody like this exists"; audience_exhausted says "your ICP was right, we found all of
// them, and you already have every one". Told the wrong one, a client widens an ICP that
// was working, or gives up on one that simply finished. They are opposite instructions.
// `failed` is TERMINAL AND NEVER DERIVED. `deriveRunStatus` cannot return it — it is
// written only by the handler that caught the throw. A crash recorded as `no_match` would
// tell a prospect their targeting matched nobody when the query never completed (R72).
export type RunStatus = 'served' | 'no_match' | 'quota_exhausted' | 'demo' | 'audience_exhausted' | 'failed'

/** The approved client-facing recovery copy for a crashed run (founder-locked 26 Aug).
 *  ⚠️ The prospect is NEVER shown the word "failed" — that is the internal state name. */
export const FAILED_RUN_HEADLINE = 'We hit a snag confirming your matches'
export const FAILED_RUN_BODY =
  'Your setup is saved and has been flagged for K.I.N.D review. You won’t need to start again.'

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
  searchCompleted: boolean,
): RunStatus {
  if (quotaRefused) return 'quota_exhausted'
  if (isDemo) return 'demo'

  // ⚑ PARTIAL PROOF RULE (founder-approved 26 Aug) — SHOW WHAT WE HAVE.
  // Checked BEFORE trustworthiness on purpose: if real, safe, relevant people were found,
  // the client sees them, whatever happened to the rest of the batch. A provider that died
  // after the pool served seven does not take those seven away.
  if (totalInserted > 0) return 'served'

  // Zero. Only NOW does it matter whether the zero can be trusted.
  //
  // ⚠️ THIS IS THE FIX FOR THE FALSE `no_match`. Every non-block failure — timeout, 5xx,
  // 401/403, two rate limits, malformed body, out of credits, and the no-API-key exit that
  // returns `error: null` — used to arrive here indistinguishable from a completed search
  // that genuinely matched nobody, and every one of them told the prospect "No leads
  // matched this ICP. Try widening it". An empty page is not evidence of an empty audience.
  //
  // ⚠️ `failed` IS STILL NEVER DERIVED FROM EMPTINESS. It is derived from an explicit
  // "the search did not complete" fact carried by the provider page (`PdlPage.completed`),
  // and from nothing else.
  //
  // ⛓️ 26 Aug (final gate) — THE DEFAULT IS GONE. `searchCompleted = true` let a future
  // caller omit the argument and silently inherit "trustworthy", which is the same
  // fail-open shape the tri-state killed inside the run. The argument is now REQUIRED:
  // a caller that forgets it does not compile, so forgetting cannot create `no_match`.
  // A caller whose run never needed a provider passes `true` explicitly, as a statement.
  if (!searchCompleted) return 'failed'

  return audienceExhausted ? 'audience_exhausted' : 'no_match'
}

/** Client-facing message for a run outcome. Honest: never blames the client for a
 *  platform quota outage, and never hides a genuine no-match behind a vague spinner. */
export function runOutcomeMessage(status: RunStatus, totalInserted: number, alreadyHeld = 0): string {
  switch (status) {
    case 'failed':
      // ⚠️ NO TECHNICAL DETAIL EVER REACHES THE PROSPECT. No provider name, no status
      // code, no stack — a person who asked to see some leads is told what it means for
      // them and what happens next, and the diagnosis goes to the founder alert instead.
      return FAILED_RUN_BODY
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
