// ⚑ 26 Aug (correction pass) — WHEN THE PROOF RUN STARTED, durable across a clean reopen.
//
// THE DEFECT THIS CLOSES. The desk decides between "still finding your matches" and the
// approved recovery copy by asking how long the run has been going. That question had only
// one answer source — the `?since=` stamp in the URL — so a prospect who closed the tab and
// came back to a clean `/milla` had no elapsed time at all, and the desk declared
// **"We hit a snag confirming your matches"** about a run that might have started five
// seconds earlier and been working perfectly. A healthy proof legitimately takes ~160–180s.
//
// ⚠️ WHY A BROWSER STAMP, AND WHAT WAS RULED OUT FIRST. The server has NO durable
// proof-start timestamp to read:
//   · `try_claim_proof_pass` increments an int and stores no time;
//   · `icp_run_outcomes` is written only when a run FINISHES — absent for exactly the case
//     that needs it;
//   · `proof_ledger.created_at` exists only when PDL was reserved, so a pool-only proof has
//     no row at all.
// Adding one would mean a migration plus a change to the proof RPC — both protected, and
// far more machinery than this needs. So the stamp is taken at the one moment the run
// genuinely starts (the proof POST, beside the `?since=` stamp) and written once.
//
// ⚠️ WRITTEN ONCE IS THE WHOLE POINT. A stamp re-taken on render, or on first sight of the
// waiting state, would restart the clock on every reopen — which is the indefinite waiting
// condition this must not be able to create.
//
// ⚠️ ITS LIMITATION, STATED PLAINLY: localStorage is per browser profile. A different
// device, a different browser, or a private window has no stamp, and elapsed time is then
// genuinely UNKNOWN. Unknown must resolve to "may still be running" plus the bounded poll —
// never to an immediate failure claim, and never to an unbounded spinner.
//
// ⚠️ IT CANNOT OVERRIDE THE BACKEND. This value only ever chooses between "still finding"
// and "bounded recovery" in the case where the server has NO terminal outcome at all. A
// recorded run outcome and real leads are both read first and both win outright.
//
// ONE KEY, ONE MODULE, imported by every writer and reader. Two copies of the string would
// drift the moment one of them was edited, and a stamp written under one key and read under
// another is the same as no stamp — silently, with no error anywhere.
export const PROOF_START_KEY = 'kind.proof.started_at'

/** Record the instant a proof run was started. Best-effort: storage can be blocked. */
export function rememberProofStart(ts: number): void {
  try {
    window.localStorage.setItem(PROOF_START_KEY, String(ts))
  } catch {
    // Private window, blocked storage, quota. Elapsed time becomes UNKNOWN, which the desk
    // already handles as "may still be running" under the bounded poll — never as failure.
  }
}

/** The durable stamp, or 0 when there genuinely is none. Callers must treat 0 as UNKNOWN. */
export function storedProofStart(): number {
  try {
    const raw = window.localStorage.getItem(PROOF_START_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

/** How long a healthy proof is allowed to take before the desk stops claiming to search.
 *  Mirrors the desk's poll budget (`FINDING_POLL_MS × FINDING_MAX_CHECKS` = 3s × 80). */
export const PROOF_WAIT_MS = 240_000

/**
 * What the desk should show while it waits.
 *   'none'     — nothing to wait for; the caller renders leads or its ordinary empty state
 *   'finding'  — a run may still be legitimately working
 *   'recovery' — the justified bound has passed with no backend truth
 */
export type ProofWaitState = 'none' | 'finding' | 'recovery'

/**
 * ⚑ 26 Aug (correction pass) — THE ONE PLACE THAT DECIDES "STILL FINDING" vs "SNAG".
 *
 * Extracted as a pure function so the rule can be RUN in a test rather than pattern-matched
 * in the JSX. Source-text guards can prove a branch exists in some order; they cannot prove
 * that a proof claimed 30 seconds ago shows a spinner and one claimed 300 seconds ago does
 * not. That is the behaviour that was wrong, so that is the behaviour under test.
 *
 * ⚠️ THE ORDER OF THESE CHECKS IS THE CONTRACT, not a style choice:
 *   1. a recorded backend outcome wins over everything, always;
 *   2. real leads win over everything that is left;
 *   3. only then does the client-side wait get an opinion at all.
 * Nothing below step 2 can contradict the server — which is what keeps a browser stamp from
 * ever overriding truth.
 *
 * ⚠️ `startedAt === 0` MEANS UNKNOWN, NOT OLD. A different device or a private window has no
 * stamp, and guessing "old" there would resurrect the exact bug this fixes — an instant
 * failure claim about a healthy run. Unknown yields 'finding', bounded by `pollExhausted`,
 * so it still cannot spin forever.
 */
export function proofWaitState(input: {
  /** A run outcome exists for the run being waited on — the server has spoken. */
  hasTerminalOutcome: boolean
  /** Masked cards on the desk right now. */
  pendingCount: number
  /** Cards already revealed. */
  revealedCount: number
  /** `clients.proof_passes_done` — a pass was claimed. */
  proofPassesDone: number
  /** The summary has actually loaded; before that nothing is known. */
  hasSummary: boolean
  /** This navigation carried `?finding=1`. */
  urlFinding: boolean
  /** Durable start stamp in epoch ms, or 0 for UNKNOWN. */
  startedAt: number
  /** Current time in epoch ms — injected so the rule is testable without faking clocks. */
  now: number
  /** The bounded poll has used its whole budget on this page load. */
  pollExhausted: boolean
}): ProofWaitState {
  // 1 · BACKEND TRUTH WINS, immediately and at any time.
  if (input.hasTerminalOutcome) return 'none'
  // 2 · REAL LEADS WIN over any waiting state.
  if (input.pendingCount > 0 || input.revealedCount > 0) return 'none'

  // 3 · Is there anything to wait FOR? A claimed pass is a server fact and survives a clean
  //     URL; `?finding=1` covers the navigation that has just started a run and may reach
  //     the desk before the counter is readable.
  const claimed = input.hasSummary && input.proofPassesDone > 0
  if (!claimed && !input.urlFinding) return 'none'

  // 4 · The wait is bounded, and it can end two ways that must agree: the tab stayed open
  //     and the poll ran out, or the tab was reopened and the durable stamp is already
  //     older than the bound. The second is what stops a reopen restarting the clock.
  const pastBound =
    input.pollExhausted ||
    (input.startedAt > 0 && input.now - input.startedAt > PROOF_WAIT_MS)
  return pastBound ? 'recovery' : 'finding'
}
