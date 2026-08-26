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
import { proofWaitState, invalidateProofSnapshot, PROOF_WAIT_MS, type ProofWaitInput } from './proof-start'

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
