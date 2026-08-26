// ⚑ 26 Aug (correction pass) — A CLAIMED PROOF WITH NO OUTCOME MEANS "MAY STILL BE
// RUNNING", NOT "FAILED".
//
// THE DEFECT THESE TESTS EXIST FOR. The first version of the clean-URL fix derived a
// `proofStranded` flag from server state — a pass claimed, no run outcome, nothing on the
// desk — and rendered the approved recovery card the instant the page loaded. So a prospect
// who closed the tab and reopened `/milla` five seconds after starting a perfectly healthy
// proof was told **"We hit a snag confirming your matches"** about a run that was still
// working. A healthy proof legitimately takes ~160–180s. Declaring failure before the bound
// contradicts the bounded-wait rule the same build introduced.
//
// ⚠️ THESE ARE RUNTIME TESTS ON PURPOSE. The old guards asserted that a branch existed in
// the JSX in a certain ORDER, which cannot prove that 30 seconds shows a spinner and 300
// seconds does not. Timing was the thing that was wrong, so timing is the thing under test:
// the rule is a pure function and `now` is injected, so elapsed time is exercised for real
// rather than mocked around.
//
// ⚠️ NOTHING HERE TOUCHES A PROVIDER, A NETWORK OR A CLOCK. Pure inputs, pure output.

import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  proofWaitState, PROOF_WAIT_MS, PROOF_START_KEY,
  rememberProofStart, storedProofStart,
} from './proof-start'

/**
 * A healthy first-proof client: pass claimed, no outcome yet, empty desk, CLEAN URL.
 *
 * ⚠️ `now` IS A REAL EPOCH, NOT 0. A zero clock makes `now - startedAt` equal 0 for the
 * unknown-stamp case, which silently satisfies any bound comparison — a base fixture that
 * would let the `startedAt > 0` guard be deleted without a single test noticing.
 */
const NOW = 1_700_000_000_000
const AWAITING = {
  hasTerminalOutcome: false,
  pendingCount: 0,
  revealedCount: 0,
  proofPassesDone: 1,
  hasSummary: true,
  urlFinding: false,          // ← CLEAN URL. No `?finding=1` anywhere in these tests.
  startedAt: 0,               // ← UNKNOWN, not "long ago".
  now: NOW,
  pollExhausted: false,
}
/** Build a clean-URL case whose run started `ms` ago. */
const agedBy = (ms: number, over: Partial<typeof AWAITING> = {}) =>
  ({ ...AWAITING, startedAt: NOW - ms, now: NOW, ...over })

describe('1–2 · a healthy proof reopened on a clean URL is FINDING, never failure', () => {
  it('30s after a claimed proof → finding (this is the exact bug: it used to say "snag")', () => {
    expect(proofWaitState(agedBy(30_000))).toBe('finding')
  })

  it('90s after a claimed proof → still finding — well inside the ~160–180s honest worst case', () => {
    expect(proofWaitState(agedBy(90_000))).toBe('finding')
  })

  it('right up to the bound it is still finding — the boundary is not off by one', () => {
    expect(proofWaitState(agedBy(PROOF_WAIT_MS))).toBe('finding')
    expect(proofWaitState(agedBy(PROOF_WAIT_MS - 1))).toBe('finding')
  })
})

describe('3 · past the justified bound, the wait ENDS in recovery', () => {
  it('one millisecond past the bound → recovery', () => {
    expect(proofWaitState(agedBy(PROOF_WAIT_MS + 1))).toBe('recovery')
  })

  it('long past it → recovery, and it did not need a poll to get there', () => {
    expect(proofWaitState(agedBy(60 * 60 * 1000, { pollExhausted: false }))).toBe('recovery')
  })

  it('the open tab reaches the SAME verdict by exhausting its poll budget', () => {
    // No usable stamp at all, but the poll ran its whole course on this page load.
    expect(proofWaitState({ ...AWAITING, startedAt: 0, pollExhausted: true })).toBe('recovery')
  })
})

describe('4 · a terminal backend outcome wins IMMEDIATELY, at any point in the wait', () => {
  it('before the bound', () => {
    expect(proofWaitState(agedBy(10_000, { hasTerminalOutcome: true }))).toBe('none')
  })
  it('after the bound — recovery is not sticky; late truth still replaces it', () => {
    expect(proofWaitState(agedBy(PROOF_WAIT_MS * 10, { hasTerminalOutcome: true }))).toBe('none')
  })
  it('and even when the poll has given up', () => {
    expect(proofWaitState({ ...AWAITING, hasTerminalOutcome: true, pollExhausted: true })).toBe('none')
  })
})

describe('5 · real leads win over any waiting state', () => {
  it('pending cards surface instead of a spinner', () => {
    expect(proofWaitState(agedBy(10_000, { pendingCount: 7 }))).toBe('none')
  })
  it('already-revealed cards do too', () => {
    expect(proofWaitState(agedBy(10_000, { revealedCount: 3 }))).toBe('none')
  })
  it('leads beat even an exhausted poll — a slow batch that landed is still a batch', () => {
    expect(proofWaitState({ ...AWAITING, pendingCount: 2, pollExhausted: true })).toBe('none')
  })
})

describe('6 · reopening cannot restart the wait, and cannot make it indefinite', () => {
  it('the stamp is absolute, so N reopens give the SAME verdict, not N fresh waits', () => {
    const now = 1_700_000_000_000
    const startedAt = now - (PROOF_WAIT_MS + 5_000)      // already past the bound
    // Three separate page loads. Each one is a fresh mount with no poll history.
    for (const reopen of [0, 1, 2]) {
      const at = now + reopen * 30_000
      expect(proofWaitState({ ...AWAITING, startedAt, now: at, pollExhausted: false }), `reopen ${reopen}`)
        .toBe('recovery')
    }
  })

  it('a reopen mid-run still shows finding — it does not inherit a stale "snag"', () => {
    const now = 1_700_000_000_000
    expect(proofWaitState({ ...AWAITING, startedAt: now - 45_000, now, pollExhausted: false }))
      .toBe('finding')
  })

  it('UNKNOWN elapsed (no stamp: other device, private window) is finding, never failure…', () => {
    // ⚠️ `now` IS A REAL EPOCH HERE, DELIBERATELY. An earlier version of this test passed
    // `now: 0`, which made `now - startedAt` equal 0 and quietly satisfied ANY bound check —
    // so the test passed even with the `startedAt > 0` guard removed, and proved nothing.
    // With a real clock, dropping that guard makes elapsed ≈ 55 years and this goes red.
    const now = 1_700_000_000_000
    expect(proofWaitState({ ...AWAITING, startedAt: 0, now, pollExhausted: false })).toBe('finding')
  })

  it('…and that unknown case is still BOUNDED by the poll, so it cannot spin forever', () => {
    const now = 1_700_000_000_000
    expect(proofWaitState({ ...AWAITING, startedAt: 0, now, pollExhausted: true })).toBe('recovery')
  })

  it('a stamp in the FUTURE (clock skew) is not treated as ancient', () => {
    const now = 1_700_000_000_000
    expect(proofWaitState({ ...AWAITING, startedAt: now + 60_000, now })).toBe('finding')
  })
})

describe('7 · the clean URL needs no ?finding flag to behave truthfully', () => {
  it('a claimed pass alone drives the whole wait — every case above had urlFinding:false', () => {
    expect(AWAITING.urlFinding).toBe(false)
    expect(proofWaitState(agedBy(30_000))).toBe('finding')
    expect(proofWaitState(agedBy(PROOF_WAIT_MS + 1))).toBe('recovery')
  })

  it('and `?finding=1` still works on its own, before the counter is readable', () => {
    // The navigation that just started a run can reach the desk before the summary loads.
    expect(proofWaitState({ ...AWAITING, hasSummary: false, proofPassesDone: 0, urlFinding: true }))
      .toBe('finding')
  })

  it('NO claimed pass and NO flag → no wait at all; the ordinary empty state stands', () => {
    // Someone who never started a run must keep the honest "no leads waiting" copy.
    expect(proofWaitState({ ...AWAITING, proofPassesDone: 0, urlFinding: false })).toBe('none')
  })

  it('a summary that has not loaded yet claims nothing', () => {
    expect(proofWaitState({ ...AWAITING, hasSummary: false })).toBe('none')
  })
})

describe('the durable stamp is written once and survives a clean reopen', () => {
  const store = new Map<string, string>()
  const fakeStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
  }
  afterEach(() => { store.clear(); vi.unstubAllGlobals() })

  it('round-trips through the SAME key both sides use', () => {
    vi.stubGlobal('window', { localStorage: fakeStorage })
    rememberProofStart(1_700_000_000_000)
    expect(store.get(PROOF_START_KEY)).toBe('1700000000000')
    expect(storedProofStart()).toBe(1_700_000_000_000)
  })

  it('blocked storage degrades to UNKNOWN rather than throwing at the client', () => {
    // Private window / quota / disabled site data. A throw here would break the desk.
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => { throw new Error('SecurityError') },
        setItem: () => { throw new Error('SecurityError') },
      },
    })
    expect(() => rememberProofStart(123)).not.toThrow()
    expect(storedProofStart()).toBe(0)
    // …and UNKNOWN resolves to finding, not to a false failure claim.
    expect(proofWaitState({ ...AWAITING, startedAt: 0 })).toBe('finding')
  })

  it('junk in storage is UNKNOWN, not a bogus epoch', () => {
    vi.stubGlobal('window', { localStorage: fakeStorage })
    for (const junk of ['', 'null', 'NaN', 'yesterday', '-5', '0']) {
      store.set(PROOF_START_KEY, junk)
      expect(storedProofStart(), junk).toBe(0)
    }
  })
})
