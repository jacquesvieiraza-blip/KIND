// ⚑ 26 Aug — THE PROOF DESK'S WAIT IS DECIDED FROM SERVER TRUTH.
//
// THE ARC THESE TESTS RECORD, because each step fixed the previous step's lie:
//   ① the desk showed "Finding your matches now…" forever when a run died;
//   ② a bounded poll fixed that, but a clean URL had no `?finding` flag and fell to a
//      generic "No leads waiting" that promised a notification nothing would send;
//   ③ a `proofStranded` card fixed THAT, but declared failure the instant the page loaded —
//      "We hit a snag" about a healthy run five seconds old;
//   ④ a browser clock (`?since=` + localStorage) fixed the timing, but was still inference:
//      written only AFTER the /proof POST returned, scoped to one browser profile, and able
//      to go stale from an older pass.
//   ⑤ THIS: the claim records its own start time, atomically, and the desk reads it.
//
// ⚠️ RUNTIME TESTS, NOT SOURCE-TEXT GUARDS. Timing is what kept being wrong, so timing is
// what is exercised: the rule is a pure function with `now` injected, so elapsed time is
// real rather than mocked around.
//
// ⚠️ NOTHING HERE TOUCHES A PROVIDER, A NETWORK OR A CLOCK. Pure inputs, pure output.

import { describe, it, expect } from 'vitest'
import { proofWaitState, invalidateProofSnapshot, classifyClaimFailure, PROOF_WAIT_MS, type ProofWaitInput } from './proof-start'

const NOW = 1_700_000_000_000

/** A healthy first-proof client: pass claimed, no outcome yet, empty desk, CLEAN URL. */
const AWAITING: ProofWaitInput = {
  hasTerminalOutcome: false,
  pendingCount: 0,
  revealedCount: 0,
  server: 'ok',
  proofPassesDone: 1,
  serverStartedAt: 0,          // ← UNKNOWN, not "long ago". Overridden per test.
  urlFinding: false,           // ← CLEAN URL. No `?finding=1` unless a test says so.
  now: NOW,
  pollExhausted: false,
}
/** A clean-URL case whose SERVER-recorded claim happened `ms` ago. */
const claimedAgo = (ms: number, over: Partial<ProofWaitInput> = {}): ProofWaitInput =>
  ({ ...AWAITING, serverStartedAt: NOW - ms, now: NOW, ...over })

describe('5–6 · a healthy proof on a clean URL is FINDING, judged by the SERVER clock', () => {
  it('30s after the claim → finding', () => {
    expect(proofWaitState(claimedAgo(30_000))).toBe('finding')
  })
  it('90s after the claim → still finding, inside the ~160–180s honest worst case', () => {
    expect(proofWaitState(claimedAgo(90_000))).toBe('finding')
  })
  it('the boundary is not off by one', () => {
    expect(proofWaitState(claimedAgo(PROOF_WAIT_MS))).toBe('finding')
    expect(proofWaitState(claimedAgo(PROOF_WAIT_MS - 1))).toBe('finding')
  })
})

describe('7 · past the server-derived bound, the wait ENDS in recovery', () => {
  it('one millisecond past it', () => {
    expect(proofWaitState(claimedAgo(PROOF_WAIT_MS + 1))).toBe('recovery')
  })
  it('long past it — and no poll was needed to get there', () => {
    expect(proofWaitState(claimedAgo(60 * 60 * 1000, { pollExhausted: false }))).toBe('recovery')
  })
  it('an open tab with no server stamp still reaches it by exhausting its poll budget', () => {
    expect(proofWaitState({ ...AWAITING, serverStartedAt: 0, pollExhausted: true })).toBe('recovery')
  })
})

describe('8–9 · refresh, reopen and other tabs read the SAME server start', () => {
  it('the clock does not restart: N page loads give one verdict, not N fresh waits', () => {
    // Each load is a fresh mount with no poll history. The server value is identical every
    // time because it lives in the claim, so the verdict cannot drift with the reload count.
    const serverStartedAt = NOW - (PROOF_WAIT_MS + 5_000)
    for (const load of [0, 1, 2, 3]) {
      expect(
        proofWaitState({ ...AWAITING, serverStartedAt, now: NOW + load * 30_000, pollExhausted: false }),
        `load ${load}`,
      ).toBe('recovery')
    }
  })

  it('a reopen mid-run shows finding, and does not inherit a stale "snag"', () => {
    expect(proofWaitState({ ...AWAITING, serverStartedAt: NOW - 45_000, pollExhausted: false }))
      .toBe('finding')
  })

  it('⚑ 10 · THERE IS NO BROWSER CLOCK LEFT TO OVERRIDE THE SERVER', () => {
    // The regression this whole pass exists for. `ProofWaitInput` carries exactly ONE timing
    // field and it comes from `clients.proof_started_at`. A stale localStorage stamp from an
    // older pass cannot age a fresh run because there is nowhere for one to enter.
    const keys = Object.keys(AWAITING)
    expect(keys.filter(k => /start|since|stamp/i.test(k))).toEqual(['serverStartedAt'])
    // Two runs whose ONLY difference is the server stamp must disagree — proving the server
    // value is genuinely the thing being read.
    expect(proofWaitState(claimedAgo(10_000))).toBe('finding')
    expect(proofWaitState(claimedAgo(PROOF_WAIT_MS * 2))).toBe('recovery')
  })

  it('11 · a fresh claim the summary has not caught up with waits, it does not fail', () => {
    // `?finding=1` navigation, summary loaded but `proof_started_at` not yet visible.
    expect(proofWaitState({ ...AWAITING, proofPassesDone: 0, serverStartedAt: 0, urlFinding: true }))
      .toBe('finding')
  })

  it('11b · a row predating the column (NULL start) waits, bounded — it is never aged', () => {
    // No truthful start exists. Unknown must not become "old enough to have failed".
    expect(proofWaitState({ ...AWAITING, serverStartedAt: 0 })).toBe('finding')
    expect(proofWaitState({ ...AWAITING, serverStartedAt: 0, pollExhausted: true })).toBe('recovery')
  })
})

describe('12 · a LOST /proof response cannot erase the start', () => {
  it('server claimed + browser never learned → a clean reopen still reads the original start', () => {
    // The exact case a browser stamp could never cover: the claim committed, the response
    // was lost, so nothing was ever written client-side. The desk arrives with no URL flag
    // and no browser memory whatsoever — and the summary still carries the claim's own
    // stamp, so the wait resumes from the ORIGINAL start rather than from this page load.
    const lostResponse = { ...AWAITING, urlFinding: false, proofPassesDone: 1 }

    // 40s after the ORIGINAL claim → still finding.
    expect(proofWaitState({ ...lostResponse, serverStartedAt: NOW - 40_000 })).toBe('finding')
    // Past the bound measured from the ORIGINAL claim → recovery, not a fresh 240s wait.
    expect(proofWaitState({ ...lostResponse, serverStartedAt: NOW - (PROOF_WAIT_MS + 1) })).toBe('recovery')
    // And never the blank desk: a claimed pass is always SOMETHING, never "no leads waiting".
    expect(proofWaitState({ ...lostResponse, serverStartedAt: NOW - 40_000 })).not.toBe('none')
  })
})

describe('13–14 · backend truth and real leads always win', () => {
  it('a terminal outcome wins before the bound', () => {
    expect(proofWaitState(claimedAgo(10_000, { hasTerminalOutcome: true }))).toBe('none')
  })
  it('and AFTER it — recovery is not sticky; late truth still replaces it', () => {
    expect(proofWaitState(claimedAgo(PROOF_WAIT_MS * 10, { hasTerminalOutcome: true }))).toBe('none')
  })
  it('and even when the poll has given up, and even with the server unreachable', () => {
    expect(proofWaitState({ ...AWAITING, hasTerminalOutcome: true, pollExhausted: true })).toBe('none')
    expect(proofWaitState({ ...AWAITING, hasTerminalOutcome: true, server: 'unreachable' })).toBe('none')
  })
  it('pending cards surface instead of a spinner', () => {
    expect(proofWaitState(claimedAgo(10_000, { pendingCount: 7 }))).toBe('none')
  })
  it('already-revealed cards do too', () => {
    expect(proofWaitState(claimedAgo(10_000, { revealedCount: 3 }))).toBe('none')
  })
  it('leads beat an exhausted poll — a slow batch that landed is still a batch', () => {
    expect(proofWaitState({ ...AWAITING, pendingCount: 2, pollExhausted: true })).toBe('none')
  })
})

describe('15–16 · the summary being unreachable is its own state, handled deliberately', () => {
  const down = { ...AWAITING, server: 'unreachable' as const }

  it('15 · an unreachable summary NEVER falls to the generic empty desk', () => {
    // "No leads waiting right now" asserts a fact the desk could not check. Even with no
    // claimed pass visible — because with the summary down, nothing about passes is visible.
    expect(proofWaitState({ ...down, proofPassesDone: 0, urlFinding: false })).not.toBe('none')
    expect(proofWaitState({ ...down, proofPassesDone: 0, urlFinding: false })).toBe('finding')
  })

  it('16 · repeated failure reaches bounded recovery, and never spins forever', () => {
    expect(proofWaitState({ ...down, pollExhausted: true })).toBe('recovery')
  })

  it('no start time is INVENTED when the server is down — the poll is the whole budget', () => {
    // Another device, summary unreachable: elapsed is unknowable. The verdict must depend
    // only on the poll, never on a guessed age, so `now` moving changes nothing.
    for (const skew of [0, 60_000, PROOF_WAIT_MS * 100]) {
      expect(proofWaitState({ ...down, now: NOW + skew, pollExhausted: false }), `skew ${skew}`).toBe('finding')
      expect(proofWaitState({ ...down, now: NOW + skew, pollExhausted: true }), `skew ${skew}`).toBe('recovery')
    }
  })

  it('a summary that loaded once still counts as truth when a later poll fails', () => {
    // The desk keeps the summary it has; `server` stays 'ok'. Asserted here because the
    // opposite — dropping to 'unreachable' on one bad poll — would throw away a real clock.
    expect(proofWaitState(claimedAgo(30_000, { server: 'ok' }))).toBe('finding')
  })
})

describe('the first summary in flight claims nothing', () => {
  const loading = { ...AWAITING, server: 'loading' as const }

  it('an ordinary client sees no wait state flash on page load', () => {
    expect(proofWaitState({ ...loading, proofPassesDone: 0, urlFinding: false })).toBe('none')
    expect(proofWaitState({ ...loading, proofPassesDone: 1, urlFinding: false })).toBe('none')
  })

  it('but a fresh `?finding=1` navigation keeps its spinner from the first frame', () => {
    expect(proofWaitState({ ...loading, urlFinding: true })).toBe('finding')
  })
})

describe('someone who never started a proof keeps the honest empty desk', () => {
  it('no claimed pass and no flag → no wait at all', () => {
    expect(proofWaitState({ ...AWAITING, proofPassesDone: 0, urlFinding: false })).toBe('none')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 26 Aug — PASS 2 ON AN ALREADY-MOUNTED DESK.
//
// THE DEFECT. `/milla` is already mounted when a client confirms a refinement, and
// `router.push('/milla?finding=1')` is a same-route query change: React re-renders, it does
// NOT remount. Every piece of state survives the Pass 2 claim — the Pass 1 summary, the
// `finding` flag (mount-only effect, never re-reads the URL), and `findingTimedOut`. The
// desk therefore read Pass 1's `proof_run` against Pass 1's `proof_started_at`, found
// `finishedAt >= start`, and called it terminal. A terminal outcome STOPS THE POLL, so the
// client could sit on Pass 1's result while Pass 2 was genuinely running, with nothing left
// to correct it.
//
// These tests walk the real journey through the real rule. `terminalRun` is modelled with
// the desk's own expression so the two cannot drift.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The desk's `terminalRun` rule, verbatim in behaviour: an outcome counts only if it
 *  finished at or after the CURRENT pass's server-recorded start. */
type Snapshot = {
  proof_passes_done?: number
  proof_started_at?: string | null
  proof_run?: { status: string; finished_at: string | null } | null
  wallet_balance_usd?: number
}
const serverStart = (s: Snapshot | null) => {
  const raw = s?.proof_started_at
  if (!raw) return 0
  const n = Date.parse(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}
const terminalRun = (s: Snapshot | null) => {
  const r = s?.proof_run
  if (!r || !r.finished_at) return null
  const finishedAt = Date.parse(r.finished_at)
  if (!Number.isFinite(finishedAt)) return null
  return finishedAt >= serverStart(s) ? r : null
}
/** The desk's inputs, derived from one snapshot exactly as `milla/page.tsx` derives them. */
const deskState = (s: Snapshot | null, over: Partial<ProofWaitInput> = {}) => proofWaitState({
  hasTerminalOutcome: !!terminalRun(s),
  pendingCount: 0,
  revealedCount: 0,
  server: 'ok',
  proofPassesDone: s?.proof_passes_done ?? 0,
  serverStartedAt: serverStart(s),
  urlFinding: false,
  now: NOW,
  pollExhausted: false,
  ...over,
})

const PASS1_START = new Date(NOW - 30 * 60_000).toISOString()   // half an hour ago
const PASS1_END   = new Date(NOW - 29 * 60_000).toISOString()   // it finished a minute later
const PASS2_START = new Date(NOW - 20_000).toISOString()        // claimed 20s ago

/** What the desk holds after Pass 1 finished: a real, correct, terminal Pass 1 desk. */
const PASS1_SUMMARY: Snapshot = {
  proof_passes_done: 1,
  proof_started_at: PASS1_START,
  proof_run: { status: 'no_match', finished_at: PASS1_END },
  wallet_balance_usd: 42,          // unrelated dashboard state, must survive
}

describe('PASS 2 · a stale Pass 1 snapshot can never represent the new pass', () => {
  it('the starting point is a genuinely terminal Pass 1 desk', () => {
    // Pass 1 IS terminal, and must stay that way until a new pass is claimed.
    expect(terminalRun(PASS1_SUMMARY)).not.toBeNull()
    expect(deskState(PASS1_SUMMARY)).toBe('none')
  })

  it('⚑ THE REGRESSION — before invalidation, Pass 1 terminal hijacks Pass 2', () => {
    // This is the defect, asserted as it behaved: the server has advanced to Pass 2, but the
    // browser still holds Pass 1. Nothing about the stale object knows a new pass exists.
    expect(terminalRun(PASS1_SUMMARY)).not.toBeNull()     // Pass 1's outcome reads as terminal…
    expect(deskState(PASS1_SUMMARY)).toBe('none')          // …so the desk shows it, and stops.
  })

  it('AFTER the successful claim, the old proof snapshot is non-authoritative', () => {
    const invalidated = invalidateProofSnapshot(PASS1_SUMMARY)!
    // Neither proof fact survives: no outcome, no start.
    expect(invalidated.proof_run).toBeNull()
    expect(invalidated.proof_started_at).toBeNull()
    // So Pass 1's outcome can no longer terminate anything…
    expect(terminalRun(invalidated), 'Pass 1 terminal must not represent Pass 2').toBeNull()
    // …and the desk waits truthfully instead of showing a finished run.
    expect(deskState(invalidated)).toBe('finding')
  })

  it('and the Pass 2 poll is NOT stopped by Pass 1 outcome', () => {
    // The desk polls while `proofAwaiting` is true and `terminalRun` is null. Both hold.
    const invalidated = invalidateProofSnapshot(PASS1_SUMMARY)!
    expect(terminalRun(invalidated)).toBeNull()            // nothing to short-circuit the poll
    expect(deskState(invalidated)).not.toBe('none')        // and a wait is genuinely in progress
  })

  it('unrelated dashboard state is NOT destroyed', () => {
    const invalidated = invalidateProofSnapshot(PASS1_SUMMARY)!
    expect(invalidated.wallet_balance_usd).toBe(42)
    expect(invalidated.proof_passes_done, 'the counter is the server’s, never rewritten here').toBe(1)
  })

  it('nothing is INVENTED — no guessed start, no client-side pass identity', () => {
    const invalidated = invalidateProofSnapshot(PASS1_SUMMARY)!
    expect(serverStart(invalidated), 'unknown, not a fabricated timestamp').toBe(0)
    // The counter is untouched: a browser-side increment would be a second source of truth
    // about which pass is current, which is exactly what this arc removed.
    expect(invalidated.proof_passes_done).toBe(PASS1_SUMMARY.proof_passes_done)
  })

  it('THEN the refreshed Pass 2 summary arrives and its start becomes authoritative', () => {
    const pass2: Snapshot = {
      proof_passes_done: 2,
      proof_started_at: PASS2_START,
      proof_run: { status: 'no_match', finished_at: PASS1_END },   // Pass 1's row is still newest
    }
    // ⚠️ THE SERVER CLOCK NOW DOES THE WORK ON ITS OWN. Pass 1 finished BEFORE Pass 2 began,
    // so even with Pass 1's outcome still the newest row, it cannot terminate Pass 2.
    expect(terminalRun(pass2), 'an outcome older than the current pass is not this pass’s').toBeNull()
    expect(deskState(pass2)).toBe('finding')               // 20s into Pass 2 — still finding
  })

  it('A · Pass 2 leads arrive → leads surface', () => {
    const pass2: Snapshot = { proof_passes_done: 2, proof_started_at: PASS2_START, proof_run: null }
    expect(deskState(pass2, { pendingCount: 12 })).toBe('none')
  })

  it('B · Pass 2 terminal outcome arrives → Pass 2 terminal truth displays', () => {
    const finishedAt = new Date(NOW - 5_000).toISOString()        // after Pass 2 started
    const pass2: Snapshot = {
      proof_passes_done: 2,
      proof_started_at: PASS2_START,
      proof_run: { status: 'served', finished_at: finishedAt },
    }
    expect(terminalRun(pass2)).not.toBeNull()
    expect(terminalRun(pass2)!.status).toBe('served')
    expect(deskState(pass2)).toBe('none')                          // the terminal card renders
  })

  it('PASS 1 BEHAVIOUR IS UNCHANGED — a first pass on a fresh desk still works end to end', () => {
    const running: Snapshot = { proof_passes_done: 1, proof_started_at: new Date(NOW - 25_000).toISOString(), proof_run: null }
    expect(deskState(running)).toBe('finding')
    const done: Snapshot = { ...running, proof_run: { status: 'served', finished_at: new Date(NOW - 5_000).toISOString() } }
    expect(terminalRun(done)).not.toBeNull()
    expect(deskState(done)).toBe('none')
  })

  it('a REFUSED Pass 2 claim leaves the Pass 1 desk exactly as it was', () => {
    // The two-pass ceiling throws before the invalidation line is ever reached, so the
    // snapshot is never touched. Modelled by simply not invalidating.
    expect(terminalRun(PASS1_SUMMARY)).not.toBeNull()
    expect(deskState(PASS1_SUMMARY)).toBe('none')
    expect(PASS1_SUMMARY.proof_passes_done).toBe(1)                // and no third pass appears
  })

  it('a SUMMARY FAILURE after a successful claim cannot resurrect Pass 1 truth', () => {
    // Invalidated, then the refresh fails. There is no Pass 1 outcome left to fall back to,
    // and the desk uses the approved bounded-unreachable behaviour instead.
    const invalidated = invalidateProofSnapshot(PASS1_SUMMARY)!
    expect(terminalRun(invalidated)).toBeNull()
    expect(deskState(invalidated, { server: 'unreachable' })).toBe('finding')
    expect(deskState(invalidated, { server: 'unreachable', pollExhausted: true })).toBe('recovery')
    // Never back to Pass 1's terminal card, and never the generic empty desk.
    expect(deskState(invalidated, { server: 'unreachable' })).not.toBe('none')
  })

  it('invalidating an absent summary is a no-op, not a crash', () => {
    expect(invalidateProofSnapshot(null)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 26 Aug — THE PASS-2 POST THAT COMMITTED AND WAS NEVER HEARD FROM.
//
// THE DEFECT. `POST /icps/:id/proof` claims the pass and only then responds. So the claim
// can COMMIT while the browser sees a 15s abort, a dropped connection or a backgrounded
// tab. The desk treated "we didn't hear back" as "nothing happened" and kept Pass 1's
// terminal card as current truth — a client could sit on Pass 1's result while Pass 2 was
// genuinely running, and only a page reload would ever correct it.
//
// THREE OUTCOMES, KEPT DISTINCT: a success (already handled), a DETERMINATION by the server
// that the claim was not made (4xx — Pass 1 stays), and NO ANSWER ABOUT THE CLAIM (status 0
// or 5xx — reconcile, do not guess).
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('classifying a failed Pass 2 claim — structured status, never a message match', () => {
  // ⛓️ INVERTED 26 Aug. This test used to assert that EVERY 4xx was a refusal — including
  // **499**, nginx's *client closed request*, which is emitted precisely because the caller
  // went away and can therefore fire at any point, including after the claim committed. That
  // was an assumption about HTTP semantics wearing the clothes of evidence. The allowlist is
  // now derived from this endpoint's own control flow (see `classifyClaimFailure`).
  it('409 is the ONLY status this endpoint returns that proves the pass was not claimed', () => {
    // routes/icps.ts — the RPC ran and returned 0, so the two-pass ceiling refused it.
    // `if (claimed <= 0) { res.status(409)... }`. Nothing else in the route says this.
    expect(classifyClaimFailure(409)).toBe('refused')
  })

  it('⚑ 499 and 408 are NOT refusals — a caller going away proves nothing about the claim', () => {
    // 499: nginx client-closed-request. 408: request timeout. Neither is returned by this
    // route at all, and both describe the CONNECTION rather than the claim decision.
    expect(classifyClaimFailure(499), 'client closed request').toBe('unknown')
    expect(classifyClaimFailure(408), 'request timeout').toBe('unknown')
  })

  it('422 and 429 are not refusals either — this route never returns them', () => {
    // No validation-error branch and no rate limiter on `POST /icps/:id/proof`. A status the
    // endpoint cannot produce carries no evidence about its claim.
    expect(classifyClaimFailure(422)).toBe('unknown')
    expect(classifyClaimFailure(429)).toBe('unknown')
  })

  it('403 and 404 ARE provably pre-claim, and are still excluded as belt-and-braces', () => {
    // routes/icps.ts returns 404 for `!clientId` and `!icp`, and 403 for `fundedVia !== null`
    // — all three above the claim. They are nonetheless classified 'unknown' on purpose:
    // unreachable on the refinement path, and reconciling merely costs one server read that
    // restores Pass 1 anyway. Widening the allowlist can only ever preserve a stale card.
    expect(classifyClaimFailure(403)).toBe('unknown')
    expect(classifyClaimFailure(404)).toBe('unknown')
  })

  it('no blanket 4xx rule survives — the ordinary client-error statuses are all unknown', () => {
    for (const s of [400, 401, 402, 405, 410, 418, 451, 498]) {
      expect(classifyClaimFailure(s), `HTTP ${s}`).toBe('unknown')
    }
  })

  it('status 0 — fetch itself rejected — is UNKNOWN, because no answer arrived', () => {
    // `lib/api.ts` sets exactly this for AbortError (its 15s timeout) and network errors.
    expect(classifyClaimFailure(0)).toBe('unknown')
  })

  it('5xx is UNKNOWN too — an HTTP answer, but not an answer ABOUT THE CLAIM', () => {
    // The route claims the pass and only then responds, so a server error can sit on either
    // side of a committed claim. Calling it "refused" would be a guess in the one direction
    // that leaves a stale terminal card on screen.
    for (const s of [500, 502, 503, 504]) {
      expect(classifyClaimFailure(s), `HTTP ${s}`).toBe('unknown')
    }
  })

  it('a thrown error carrying no status at all is UNKNOWN, never assumed refused', () => {
    expect(classifyClaimFailure(undefined)).toBe('unknown')
  })
})

describe('PASS 2 · an ambiguous response reconciles against the server, without a reload', () => {
  /** What the desk does in the catch: invalidate only when the answer was not a decision. */
  const afterFailedClaim = (status: number | undefined, held: Snapshot | null) =>
    classifyClaimFailure(status) === 'unknown' ? invalidateProofSnapshot(held) : held

  it('2 · DEFINITIVE REFUSAL (409) leaves Pass 1 completely intact', () => {
    const after = afterFailedClaim(409, PASS1_SUMMARY)
    expect(after).toBe(PASS1_SUMMARY)                       // the very same object — untouched
    expect(after!.proof_run).not.toBeNull()
    expect(after!.proof_started_at).toBe(PASS1_START)
    expect(terminalRun(after)).not.toBeNull()               // Pass 1 terminal still authoritative
    expect(deskState(after)).toBe('none')                   // and NO false Pass 2 spinner
    expect(after!.proof_passes_done).toBe(1)                // no browser-side pass mutation
  })

  it('⚑ 3 · TIMEOUT AFTER THE SERVER COMMITTED — reconciles to Pass 2, no reload', () => {
    // The browser sees `status: 0`. The server, unknown to it, is already on Pass 2.
    const reconciling = afterFailedClaim(0, PASS1_SUMMARY)!
    // While uncertain: Pass 1's outcome is no longer allowed to speak.
    expect(terminalRun(reconciling), 'Pass 1 must not stay authoritative while reconciling').toBeNull()
    expect(deskState(reconciling)).toBe('finding')          // truthful wait, not a terminal card

    // The re-read returns the server's actual state: Pass 2, claimed and started.
    const fromServer: Snapshot = {
      proof_passes_done: 2,
      proof_started_at: PASS2_START,
      proof_run: { status: 'no_match', finished_at: PASS1_END },   // Pass 1's row is still newest
    }
    expect(serverStart(fromServer)).toBe(Date.parse(PASS2_START))  // Pass 2's clock takes over
    expect(terminalRun(fromServer), 'an outcome older than this pass is not this pass’s').toBeNull()
    expect(deskState(fromServer)).toBe('finding')
  })

  it('4 · TIMEOUT WITHOUT A COMMIT — reconciles straight back to Pass 1', () => {
    const reconciling = afterFailedClaim(0, PASS1_SUMMARY)!
    expect(terminalRun(reconciling)).toBeNull()             // invalidated only WHILE uncertain

    // The re-read shows the server never moved: still Pass 1, still its outcome.
    const fromServer = PASS1_SUMMARY
    expect(fromServer.proof_passes_done).toBe(1)
    expect(terminalRun(fromServer), 'Pass 1 comes back by itself').not.toBeNull()
    expect(deskState(fromServer)).toBe('none')              // no fake Pass 2 state remains
  })

  it('5 · AMBIGUOUS FAILURE + THE SUMMARY IS ALSO UNREACHABLE', () => {
    const reconciling = afterFailedClaim(0, PASS1_SUMMARY)!
    // Pass 1's terminal card cannot come back — the fields it lived in are gone, and a
    // failed refresh cannot put them back.
    expect(terminalRun(reconciling)).toBeNull()
    // Bounded: finding while the poll has budget, then the approved recovery state.
    expect(deskState(reconciling, { server: 'unreachable' })).toBe('finding')
    expect(deskState(reconciling, { server: 'unreachable', pollExhausted: true })).toBe('recovery')
    // Never the generic empty desk, and never an endless spinner.
    expect(deskState(reconciling, { server: 'unreachable' })).not.toBe('none')
    expect(deskState(reconciling, { server: 'unreachable', pollExhausted: true })).not.toBe('finding')
  })

  it('5b · the same holds when the desk keeps its (now invalidated) summary and the poll dies', () => {
    // `load()` failing after a successful earlier load leaves `server: 'ok'` — truth we
    // already hold is still truth — but the proof fields stay null, so Pass 1 cannot return.
    const reconciling = afterFailedClaim(0, PASS1_SUMMARY)!
    expect(deskState(reconciling, { server: 'ok' })).toBe('finding')
    expect(deskState(reconciling, { server: 'ok', pollExhausted: true })).toBe('recovery')
    expect(terminalRun(reconciling)).toBeNull()
  })

  it('6 · a stale Pass 1 `findingTimedOut` cannot force instant Pass 2 recovery', () => {
    // The desk resets it in the same block. Modelled here as the flag the rule receives:
    // reset (false) keeps the truthful wait; left set it would recover immediately, which is
    // the state the reset exists to prevent.
    const reconciling = afterFailedClaim(0, PASS1_SUMMARY)!
    expect(deskState(reconciling, { pollExhausted: false })).toBe('finding')
    expect(deskState(reconciling, { pollExhausted: true })).toBe('recovery')
  })

  it('a 5xx is reconciled, not assumed refused', () => {
    const reconciling = afterFailedClaim(503, PASS1_SUMMARY)!
    expect(terminalRun(reconciling)).toBeNull()
    expect(deskState(reconciling)).toBe('finding')
  })

  it('7–9 · Pass 1, the success path and the two-pass ceiling are all unchanged', () => {
    // Pass 1 running, then finishing, on a desk that never saw a refusal.
    const running: Snapshot = { proof_passes_done: 1, proof_started_at: new Date(NOW - 25_000).toISOString(), proof_run: null }
    expect(deskState(running)).toBe('finding')
    const done: Snapshot = { ...running, proof_run: { status: 'served', finished_at: new Date(NOW - 5_000).toISOString() } }
    expect(deskState(done)).toBe('none')
    // A successful Pass 2 claim still invalidates, exactly as before this change.
    expect(invalidateProofSnapshot(PASS1_SUMMARY)!.proof_run).toBeNull()
    // And no path here ever writes the counter — the ceiling stays the server's to enforce.
    expect(afterFailedClaim(0, PASS1_SUMMARY)!.proof_passes_done).toBe(1)
    expect(afterFailedClaim(409, PASS1_SUMMARY)!.proof_passes_done).toBe(1)
  })
})
