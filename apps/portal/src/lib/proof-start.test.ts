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
import { proofWaitState, PROOF_WAIT_MS, type ProofWaitInput } from './proof-start'

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
