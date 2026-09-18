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
 * ⛓️ 17 Sep (J5-C14 · FD-6) — THE NUMBER MOVED TO `@kind/shared` BECAUSE IT WAS DERIVED FROM
 * A PROVIDER WE DO NOT USE. What stood here was:
 *
 *     *"Derived, not picked — from the backend's own worst case: one PDL attempt is a 15s
 *      timeout, the size ladder at batch 20 is four attempts (60s), one global rate-limit
 *      retry adds 2.5s + 15s, so an exact search is ~77.5s and the one widened fallback
 *      repeats it — ~160–180s with overheads. 240s clears that with ~60s of margin…"*
 *
 * Every term in that derivation is PDL's: its timeout, its 402 size ladder, its retry. Under
 * FD-6 Proof sources from Apollo, which has no size ladder — it pages, and a Proof batch of
 * 20 fits in ONE page. The bound was not wrong, it was measuring a different machine.
 *
 * ⚠️ IT IS RE-EXPORTED, NOT RE-DECLARED. The desk, the backend and the poll budget must read
 * ONE number; a second declaration here is how the previous drift happened. The derivation
 * itself — and the `APOLLO_REQUEST_TIMEOUT_MS` that makes a worst case exist at all — lives
 * in `packages/shared/src/proof-wait.ts`.
 */
import { PROOF_WAIT_MS, PROOF_DESK_POLL_MS, PROOF_DESK_MAX_CHECKS } from '@kind/shared'
export { PROOF_WAIT_MS, PROOF_DESK_POLL_MS, PROOF_DESK_MAX_CHECKS }

/**
 * What the desk should show while it waits.
 *   'none'     — nothing to wait for; the caller renders leads or its ordinary empty state
 *   'finding'  — a run may still be legitimately working
 *   'recovery' — the justified bound has passed with no backend truth
 */
// ⛓️ 18 Sep (J5-C2 · LR 6) — FOUR WORDS ADDED, and the reason is that three words were doing
// the work of six recorded states. `hasTerminalOutcome` collapsed EVERY terminal outcome to
// `'none'`, so a run the server recorded as FAILED and a run that completed perfectly produced
// the same desk state; and `'recovery'` was decided by a CLOCK
// (`now - serverStartedAt > PROOF_WAIT_MS`), so a run that failed at second 3 was described as
// "finding your matches" for the rest of the bound. J5-C1 then added `stuck` — the most
// important state, *we know this is broken and a human has been told* — and nothing carried it.
//
// ⚠️ THE CLOCK IS NOT DELETED, IT IS DEMOTED. Where nothing is recorded (a claim the summary
// has not caught up with, a row from before ownership existed) the bounded poll is still the
// only thing there is. It must simply never outrank a record.
export type ProofWaitState =
  | 'none'
  | 'finding'
  | 'recovery'
  /** The server RECORDED a failure. Not a timeout, not an inference. */
  | 'failed'
  /** The run delivered nothing and the pass came BACK — not a failure, and not a set. */
  | 'released'
  /** Our own vocabulary could not take their words; a person is finishing the translation. */
  | 'needs_review'
  /** Overdue its bound and given up on by the detector; an operator has a task. */
  | 'stuck'

/** The proof-shaped fields of the Milla summary. Only these are ever invalidated. */
export interface ProofSnapshot {
  proof_started_at?: string | null
  proof_run?: unknown
}

/**
 * ⚑ 26 Aug — A NEW CLAIM MAKES THE OLD PROOF SNAPSHOT NON-AUTHORITATIVE, IMMEDIATELY.
 *
 * THE DEFECT. `/milla` is ALREADY MOUNTED when a client confirms a refinement, and
 * `router.push('/milla?finding=1')` is a same-route query change — Next's App Router
 * re-renders, it does NOT remount. So every piece of component state survives the Pass 2
 * claim, including the Pass 1 summary. The desk then read Pass 1's `proof_run` against
 * Pass 1's `proof_started_at`, found `finishedAt >= start`, and called it terminal — for a
 * pass that had already been superseded. A terminal outcome stops the poll, so the client
 * could sit on **Pass 1's result while Pass 2 was actually running**, and nothing would ever
 * correct it.
 *
 * ⚠️ THIS INVALIDATES, IT DOES NOT INVENT. Both fields become "we do not know yet", which is
 * exactly true the instant a new pass is claimed: no outcome exists for it, and its start is
 * whatever the server recorded — a value only the server can tell us. Nothing here guesses a
 * timestamp, increments a counter, or creates a browser-side notion of which pass is current.
 * `proof_started_at` stays authoritative and stays on the server.
 *
 * ⚠️ EVERYTHING ELSE ON THE SUMMARY IS KEPT. Wallet, pack, KPIs, ICP versions, campaign —
 * none of it is affected by a proof claim, and clearing the whole object would blank a
 * working dashboard to fix a proof bug.
 *
 * ⚠️ CALL IT ONLY AFTER A CLAIM THAT ACTUALLY SUCCEEDED. A refused claim (the two-pass
 * ceiling) leaves Pass 1 the current pass, and its snapshot is still the truth.
 */
export function invalidateProofSnapshot<T extends ProofSnapshot>(summary: T | null): T | null {
  if (!summary) return summary
  return { ...summary, proof_started_at: null, proof_run: null }
}

/**
 * ⚑ 26 Aug — DID THE SERVER ANSWER THE CLAIM, OR DID WE JUST NOT HEAR BACK?
 *
 * THE DEFECT. A Pass 2 POST can COMMIT on the server and still fail in the browser — a 15s
 * abort, a dropped connection, a backgrounded tab. The desk then kept Pass 1's terminal card
 * as current truth until someone happened to reload, so a client could sit looking at Pass
 * 1's result while Pass 2 was genuinely running. "We didn't hear back" was being treated as
 * "nothing happened", and those are not the same fact.
 *
 * ⚠️ THE SIGNAL IS STRUCTURED AND ALREADY EXISTS — no message matching. `lib/api.ts` sets
 * `err.status = 0` when `fetch` itself rejects (timeout / AbortError / network), and
 * `err.status = res.status` whenever an HTTP response actually arrived. So the presence of a
 * real status IS the presence of an answer.
 *
 * ⛓️ NARROWED 26 Aug — "ALL 4xx" WAS NOT EVIDENCE, IT WAS AN ASSUMPTION ABOUT HTTP.
 *
 * The first version read `status >= 400 && status < 500 ? 'refused'`, and its own tests
 * asserted that **499 was a refusal**. 499 is nginx's *client closed request* — it is
 * emitted precisely BECAUSE the caller went away, which can happen at any point, including
 * after the claim committed. 408 is the same shape from the other side. Neither says
 * anything about whether the pass was taken, and treating them as refusals leaves the stale
 * Pass 1 card on screen in exactly the case a client is most likely to hit.
 *
 * ⚠️ THE ALLOWLIST IS DERIVED FROM THIS ENDPOINT'S CONTROL FLOW, not from status semantics.
 * `POST /icps/:id/proof` (routes/icps.ts) claims the pass at ONE point and returns:
 *   · 404  `!clientId`            — before the claim
 *   · 404  `!icp`                 — before the claim
 *   · 403  `fundedVia !== null`   — before the claim
 *   · 409  `claimed <= 0`         — the RPC RAN AND REFUSED: the pass was definitively
 *                                   not taken, and this is the only status that says so
 *   · 200                         — claimed
 *   · 500  route-level `catch`    — wraps the WHOLE handler, so it can fire on either side
 *                                   of a committed claim: ambiguous, never a refusal
 * Nothing in this route returns 408, 422, 429 or 499 at all. A status this endpoint cannot
 * produce carries no evidence about its claim, so it can never be a refusal here.
 *
 * ⚠️ 409 IS THE WHOLE ALLOWLIST, deliberately narrower than the proof allows. 403 and 404
 * are also provably pre-claim, but they are excluded as belt-and-braces: they are
 * unreachable on the refinement path (`confirmRefine` has just re-read the ICP, and a funded
 * client is not in proof at all), and classifying them 'unknown' costs only a reconciliation
 * that restores Pass 1 by itself. Widening this set can only ever preserve a stale card;
 * narrowing it can only ever cost one extra server read.
 *
 * 'unknown' — everything else: status 0 (no response), 5xx, 408, 429, 499, an unstructured
 *   throw. Not "it failed" and not "it started" — it means RE-READ THE SERVER. The
 *   reconciliation is self-resolving: a refreshed summary showing Pass 2 gives Pass 2's
 *   clock, one still showing Pass 1 restores Pass 1's terminal card. Nothing here guesses,
 *   and nothing here invents a claim id, a timestamp or a counter.
 */
const CLAIM_REFUSED_STATUSES: ReadonlySet<number> = new Set([409])

export function classifyClaimFailure(status: number | undefined): 'refused' | 'unknown' {
  return typeof status === 'number' && CLAIM_REFUSED_STATUSES.has(status) ? 'refused' : 'unknown'
}

/**
 * ⚑ 26 Aug — ONE RECONCILIATION READ IS NOT PROOF THE CLAIM NEVER COMMITTED.
 *
 * THE RACE. After an ambiguous `/proof` response the desk invalidates Pass 1 and re-reads
 * the summary at once. That GET can reach the server BEFORE the original POST commits, so it
 * legitimately returns Pass 1 — and the desk settled on it: Pass 1's terminal card came back,
 * `terminalRun` stopped the poll, and the POST then committed Pass 2 into a desk that had
 * already stopped looking. The client sat on Pass 1's result while Pass 2 ran.
 *
 * A single stale read proves nothing. **Only a 409 can immediately prove the pass was not
 * claimed** — and a 409 is not ambiguous, so it never reaches this state at all.
 *
 * ⚠️ THE TEST IS "HAS THE SERVER MOVED?", NOT "HOW LONG HAS IT BEEN?". `reconcileFrom` is the
 * `proof_started_at` this browser had ALREADY BEEN GIVEN by the server when the ambiguity
 * happened. Reconciliation is over the moment the server hands back a NEWER one. Both values
 * are the server's own; nothing is invented, no clock is started, and no browser-side notion
 * of "which pass is current" exists — only a comparison of two server reads.
 *
 * ⚠️ IT SELF-RESOLVES, so nothing has to remember to clear it: once `serverStartedAt` moves
 * past `reconcileFrom` this returns false for good. `reconcileFrom === 0` (no start was known)
 * is resolved by any real timestamp at all.
 *
 * ⚠️ IT IS NOT UNBOUNDED. While this holds, the desk waits under the SAME bounded poll — so a
 * claim that never commits ends in the approved recovery state rather than a spinner, and a
 * stale Pass 1 terminal is never resurrected on the way there.
 */
export function isReconciling(reconcileFrom: number | null, serverStartedAt: number): boolean {
  return reconcileFrom !== null && serverStartedAt <= reconcileFrom
}

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
  /**
   * ⛓️ J5-C2 — THE RECORDED STATE OF THE RUN, from `automatic_work` (J5-C1's owner).
   *
   * `null`/absent means NOTHING IS RECORDED — a claim the summary has not caught up with, or
   * a run from before ownership existed. That is the only case in which the clock decides.
   */
  recordedRunState?: 'requested' | 'started' | 'completed' | 'failed' | 'stuck' | null
  /**
   * ⛓️ J5-C2 — the run's terminal as recorded (`icp_run_outcomes` / `terminalForRunStatus`).
   * `released` is carried separately because it is neither a failure nor a delivered set.
   */
  recordedOutcome?: string | null
  /** ⛓️ J5-C2 — the ICP is in review: a person is finishing what our vocabulary could not. */
  needsIcpReview?: boolean
}

export function proofWaitState(input: ProofWaitInput): ProofWaitState {
  // 1 · REAL LEADS WIN over any waiting state. A client looking at cards is not waiting for
  //     them, whatever any row says — this is the one rule that outranks the record, because
  //     the cards are in front of them.
  if (input.pendingCount > 0 || input.revealedCount > 0) return 'none'

  // ── 2 · THE RECORD SPEAKS BEFORE THE CLOCK (J5-C2 · LR 6) ──────────────────────────────
  //
  // Every branch below is a RECORDED fact, so each produces its own word. Nothing here is
  // inferred from elapsed time, and nothing collapses two different outcomes into one state.
  //
  // ⚠️ REVIEW FIRST, because it is the one state that is TRUE WHILE A RUN IS ALSO RECORDED:
  // the run stopped precisely so a person could finish the translation, and "a human is on
  // it" is what the client needs to read rather than "it failed".
  if (input.needsIcpReview === true) return 'needs_review'

  // `released` is its own word: the run delivered nothing and the pass came BACK. Saying
  // "failed" would be wrong (nothing was consumed) and "none" would be wrong (no set arrived).
  if (input.recordedOutcome === 'released') return 'released'

  switch (input.recordedRunState) {
    case 'failed':    return 'failed'
    case 'stuck':     return 'stuck'
    case 'completed': return 'none'
    // A recorded `requested`/`started` is the honest present tense — and it is a FACT, not the
    // absence of one, so the bound does not get to overrule it into 'recovery'.
    case 'requested':
    case 'started':   return 'finding'
    default:          break   // nothing recorded — fall through to the clock
  }

  // 3 · A TERMINAL OUTCOME WITH NO OWNER ROW still ends the wait. This is the pre-J5-C1
  //     shape and stays for the runs that predate ownership.
  if (input.hasTerminalOutcome) return 'none'

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
