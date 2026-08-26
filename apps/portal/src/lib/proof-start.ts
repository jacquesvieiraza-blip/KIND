// ⚑ 26 Aug — THE PROOF DESK'S WAIT, DECIDED FROM SERVER TRUTH.
//
// THE QUESTION THIS ANSWERS. Between a claimed proof pass and a recorded run outcome the
// desk has to choose one of two things to show: "Finding your matches now…" or the approved
// recovery copy. Getting that wrong in either direction is a lie to the first client — a
// spinner that never ends, or "We hit a snag" about a run that is working perfectly.
//
// ⛓️ WHAT CHANGED, AND WHY THE PREVIOUS VERSION WAS NOT LAUNCH-FINAL. This module used to
// keep its own browser clock: a `?since=` URL stamp mirrored into localStorage at the proof
// POST. Every part of that was inference, and each part could be wrong:
//   · the stamp was written only AFTER the POST returned, so a server that claimed the pass
//     and then lost its response left a claimed run whose start existed NOWHERE;
//   · localStorage is browser-profile scoped — another device, another browser or a private
//     window had nothing at all;
//   · a STALE stamp from an older pass could make a fresh run look old enough to have failed;
//   · a clean URL lost the timing, so a reload risked restarting the wait.
// The claim now records its own start time (`clients.proof_started_at`, written inside the
// same atomic UPDATE as `proof_passes_done`, surfaced on the existing Milla summary). The
// browser clock is GONE — not demoted, removed — because a second source of timing truth is
// exactly what produced the contradictions above. There is nothing left to go stale.
//
// ⚠️ THE ORDER OF CHECKS IS THE CONTRACT, not a style choice:
//   1. a recorded backend outcome wins over everything, always;
//   2. real leads win over everything that is left;
//   3. the durable SERVER start decides how long we have been waiting;
//   4. only where the server is genuinely UNREACHABLE does the bounded poll stand in;
//   5. past the bound, the neutral recovery state.
// Nothing below step 2 can contradict the server.

/** How long a healthy proof may take before the desk stops claiming to search.
 *
 *  Derived, not picked — from the backend's own worst case: one PDL attempt is a 15s
 *  timeout, the size ladder at batch 20 is four attempts (60s), one global rate-limit retry
 *  adds 2.5s + 15s, so an exact search is ~77.5s and the one widened fallback repeats it —
 *  ~160–180s with overheads. 240s clears that with ~60s of margin and is still a hard stop.
 *  The desk's poll budget (`FINDING_POLL_MS × FINDING_MAX_CHECKS`) must equal this; the desk
 *  asserts that at module load so the two can never drift into different truths. */
export const PROOF_WAIT_MS = 240_000

/**
 * What the desk should show while it waits.
 *   'none'     — nothing to wait for; the caller renders leads or its ordinary empty state
 *   'finding'  — a run may still be legitimately working
 *   'recovery' — the justified bound has passed with no backend truth
 */
export type ProofWaitState = 'none' | 'finding' | 'recovery'

export interface ProofWaitInput {
  /** A run outcome exists for the run being waited on — the server has spoken. */
  hasTerminalOutcome: boolean
  /** Masked cards on the desk right now. */
  pendingCount: number
  /** Cards already revealed. */
  revealedCount: number
  /**
   * Whether backend truth is available, and these are THREE states rather than two because
   * collapsing them produces a visible lie in one direction or the other:
   *   'loading'     — the first summary request has not come back yet. Claims NOTHING; a
   *                   client with an empty desk must not see a spinner flash on every load.
   *   'ok'          — the facts below are usable (a previously-loaded summary still counts;
   *                   a later poll failing does not erase truth we already have).
   *   'unreachable' — the summary could not be fetched at all. Different from "loaded and
   *                   says nothing", and handled deliberately in step 4.
   */
  server: 'loading' | 'ok' | 'unreachable'
  /** `clients.proof_passes_done` — a pass was claimed. Meaningful only with server truth. */
  proofPassesDone: number
  /**
   * `clients.proof_started_at` as epoch ms, or 0 when the server has no value (a row that
   * predates the column, or no pass ever claimed). 0 is UNKNOWN, never "long ago".
   */
  serverStartedAt: number
  /** This navigation carried `?finding=1` — a hint only, never a clock. */
  urlFinding: boolean
  /** Current time in epoch ms — injected so the rule is testable without faking clocks. */
  now: number
  /** The bounded poll has used its whole budget on this page load. */
  pollExhausted: boolean
}

export function proofWaitState(input: ProofWaitInput): ProofWaitState {
  // 1 · BACKEND TRUTH WINS, immediately and at any time. A recorded outcome ends the wait
  //     whether it arrives in the first second or long after the bound has passed.
  if (input.hasTerminalOutcome) return 'none'
  // 2 · REAL LEADS WIN over any waiting state.
  if (input.pendingCount > 0 || input.revealedCount > 0) return 'none'

  // ── 2b · THE FIRST SUMMARY IS STILL IN FLIGHT: claim nothing yet. ───────────────────────
  // A fresh `?finding=1` navigation is the one thing we already know without the server, so
  // it keeps its spinner; everyone else keeps the desk they had. Deciding anything else here
  // would flash a wait state at every client on every page load.
  if (input.server === 'loading') return input.urlFinding ? 'finding' : 'none'

  // ── 3 · THE SERVER CAN BE REACHED: it is the only clock. ────────────────────────────────
  if (input.server === 'ok') {
    const claimed = input.proofPassesDone > 0
    // Not a claimed proof and not a fresh navigation → nothing is being waited for, and the
    // desk keeps its ordinary honest empty state. Someone who never started a run must not
    // be shown a spinner.
    if (!claimed && !input.urlFinding) return 'none'

    // ⚠️ THE SERVER'S STAMP IS THE ONLY TIMING INPUT HERE. There is no browser value left to
    // override it, which is the point: a stale stamp from an older pass cannot age a fresh
    // run, and a missing one cannot blank a real one.
    //
    // `serverStartedAt === 0` is UNKNOWN — a row from before the column existed, or a
    // `?finding=1` navigation whose claim the summary has not caught up with yet. Unknown
    // does NOT invent an age; it waits, bounded by the poll, and then recovers.
    const pastBound =
      input.pollExhausted ||
      (input.serverStartedAt > 0 && input.now - input.serverStartedAt > PROOF_WAIT_MS)
    return pastBound ? 'recovery' : 'finding'
  }

  // ── 4 · THE SERVER CANNOT BE REACHED. ──────────────────────────────────────────────────
  //
  // The desk has no facts: it cannot say a proof is running, and it equally cannot say one
  // is not. Three things are therefore forbidden here, and each was asked for by name: it
  // must not report `no_match`; it must not fall to the generic "no leads waiting" empty
  // state MERELY because a request failed, which would state as fact something it could not
  // check; and it must not spin forever waiting for a backend that is not answering.
  //
  // ⚠️ AND IT MUST NOT INVENT A START TIME. On another device there is nothing to invent
  // one from, and a guessed clock is what this whole change removes. So elapsed time is not
  // estimated at all — the bounded poll is the entire budget, and when it is spent the desk
  // shows the neutral recovery line: setup saved, flagged for review, nothing to redo. That
  // sentence is true of an unreachable API as much as of a crashed run, and it claims
  // nothing about the client's targeting either way.
  return input.pollExhausted ? 'recovery' : 'finding'
}
