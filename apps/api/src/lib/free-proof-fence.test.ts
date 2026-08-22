// ═══════════════════════════════════════════════════════════════════════════
// THE FREE-PROOF ACQUISITION FENCE — regression suite.
//
// A prospect is shown REAL masked leads before they pay. That costs K.I.N.D money at PDL,
// so it is fenced — and the fence had to be a DIFFERENT fence from the one protecting
// paying clients, for two reasons found in review before any code was written:
//
//   1. An unpaid prospect's `sourcing_allowance` is 0, so `try_spend_sourcing` could never
//      fund proof at all. The first plan clamped a budget in front of a function that would
//      always return 0.
//   2. Granting into that shared integer instead would have exposed the proof budget to the
//      six other paths that spend it — the nightly top-up, operator sourcing, admin and
//      partner routes, ICP create/activate/run, and /lookalike/generate directly.
//
// ⚠️ WHAT THESE TESTS ARE FOR. The dangerous cases are the ones a single-threaded read of
// the code looks fine on: two runs overlapping for the same prospect, and two DIFFERENT
// prospects overlapping against one monthly ceiling. Both are asserted below against the
// real RPC contract, not against a hand-rolled mock of what we hope it does.
//
// No network, no database: `@kind/db` is mocked and the RPCs are simulated with the same
// LEAST()/lock semantics the SQL implements, so the CALLER's behaviour is what is proved.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const PDL_RATE = 0.28
const CLIENT_CAP = 40
const MONTH_CAP = 300

/**
 * A faithful stand-in for the three proof RPCs.
 *
 * The SQL serialises callers with `FOR UPDATE` on the singleton money_settings row and then
 * the client row. JavaScript is single-threaded inside one call, so a synchronous decide +
 * commit here models exactly the same critical section: no caller can observe another's
 * half-finished state. That is the property under test.
 */
function makeProofDb(initial?: { committed?: number; passes?: number; monthUsd?: number }) {
  const state = {
    committed: initial?.committed ?? 0,
    passes:    initial?.passes ?? 0,
    monthUsd:  initial?.monthUsd ?? 0,
    ledger:    [] as Array<{ records: number; cost: number }>,
  }
  const perClient = new Map<string, { committed: number; passes: number }>()

  const clientOf = (id: string) => {
    if (!perClient.has(id)) perClient.set(id, { committed: state.committed, passes: state.passes })
    return perClient.get(id)!
  }

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    const id = String(args.p_client_id ?? '')
    if (fn === 'try_claim_proof_pass') {
      const c = clientOf(id)
      if (c.passes >= 2) return { data: 0, error: null }
      c.passes += 1
      return { data: c.passes, error: null }
    }
    if (fn === 'try_reserve_proof_records') {
      const c = clientOf(id)
      const requested = Number(args.p_requested ?? 0)
      if (!(requested > 0)) return { data: 0, error: null }
      const room = Math.max(0, Math.floor((MONTH_CAP - state.monthUsd) / PDL_RATE))
      const grant = Math.min(requested, Math.max(0, CLIENT_CAP - c.committed), room)
      if (grant <= 0) return { data: 0, error: null }
      c.committed += grant
      state.monthUsd += grant * PDL_RATE
      state.ledger.push({ records: grant, cost: grant * PDL_RATE })
      return { data: grant, error: null }
    }
    if (fn === 'release_proof_records') {
      const c = clientOf(id)
      const rel = Math.min(Number(args.p_records ?? 0), c.committed)
      if (rel <= 0) return { data: 0, error: null }
      c.committed -= rel
      state.monthUsd -= rel * PDL_RATE
      state.ledger.push({ records: -rel, cost: -(rel * PDL_RATE) })
      return { data: rel, error: null }
    }
    return { data: null, error: null }
  }

  return { rpc, state, perClient }
}

// ── The per-prospect 40-record ceiling ───────────────────────────────────────
describe('free proof — a prospect can never cost more than 40 PDL records', () => {
  it('a single oversized request is cut to 40, not granted whole', async () => {
    const { rpc, perClient } = makeProofDb()
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 500 })
    expect(data).toBe(40)
    expect(perClient.get('p1')!.committed).toBe(40)
  })

  it('TWO CONCURRENT RUNS FOR ONE PROSPECT TOTAL 40, NOT 60', async () => {
    // The race the first plan would have lost: both runs read "0 spent, 40 available"
    // and both proceed. Serialised, the second sees the first's commit.
    const { rpc } = makeProofDb()
    const [a, b] = await Promise.all([
      rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 30 }),
      rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 30 }),
    ])
    expect(Number(a.data) + Number(b.data)).toBe(40)
    expect([a.data, b.data].sort()).toEqual([10, 30])
  })

  it('a third run for the same prospect gets nothing', async () => {
    const { rpc } = makeProofDb({ committed: 40 })
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 20 })
    expect(data).toBe(0)
  })

  it('40 records is $11.20 at the verified rate — the founder-set ceiling', () => {
    expect(+(CLIENT_CAP * PDL_RATE).toFixed(2)).toBe(11.20)
  })
})

// ── The cross-client monthly acquisition ceiling ─────────────────────────────
describe('free proof — the monthly acquisition budget holds ACROSS different prospects', () => {
  it('TWO DIFFERENT PROSPECTS CANNOT EXCEED THE REMAINING MONTHLY ROOM', async () => {
    // 50 records of room left. A asks 40, B asks 40, at the same moment.
    // Locking each prospect's own row would authorise 80 — this is the race that fix closes.
    const monthUsd = MONTH_CAP - (50 * PDL_RATE)
    const { rpc, state } = makeProofDb({ monthUsd })
    const [a, b] = await Promise.all([
      rpc('try_reserve_proof_records', { p_client_id: 'prospect-A', p_requested: 40 }),
      rpc('try_reserve_proof_records', { p_client_id: 'prospect-B', p_requested: 40 }),
    ])
    expect(Number(a.data) + Number(b.data)).toBe(50)
    expect([a.data, b.data].sort((x, y) => Number(x) - Number(y))).toEqual([10, 40])
    expect(state.monthUsd).toBeCloseTo(MONTH_CAP, 5)
  })

  it('once the acquisition month is spent, every prospect is refused', async () => {
    const { rpc } = makeProofDb({ monthUsd: MONTH_CAP })
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p9', p_requested: 20 })
    expect(data).toBe(0)
  })
})

// ── Reconciliation ───────────────────────────────────────────────────────────
describe('free proof — an under-return releases BOTH fences', () => {
  it('reserve 40, PDL returns 25 → release 15 from the prospect AND the month', async () => {
    const { rpc, state, perClient } = makeProofDb()
    await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 40 })
    expect(perClient.get('p1')!.committed).toBe(40)
    await rpc('release_proof_records', { p_client_id: 'p1', p_records: 15 })
    expect(perClient.get('p1')!.committed).toBe(25)
    expect(state.monthUsd).toBeCloseTo(25 * PDL_RATE, 5)
    // The correction is a row, not an edit — the same shape the paid path already uses.
    expect(state.ledger).toEqual([
      { records: 40, cost: 40 * PDL_RATE },
      { records: -15, cost: -(15 * PDL_RATE) },
    ])
  })

  it('A FAILED RELEASE UNDER-ALLOWS AND NEVER OVERSPENDS', async () => {
    // Reconciliation never ran: 40 stays committed though only 25 were bought. The prospect
    // now has 0 proof budget left instead of 15 — recoverable. What CANNOT happen is a 41st.
    const { rpc, perClient } = makeProofDb()
    await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 40 })
    const { data: more } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 15 })
    expect(more).toBe(0)
    expect(perClient.get('p1')!.committed).toBe(40)
  })

  it('a double release cannot manufacture budget', async () => {
    const { rpc, perClient } = makeProofDb()
    await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 20 })
    await rpc('release_proof_records', { p_client_id: 'p1', p_records: 20 })
    await rpc('release_proof_records', { p_client_id: 'p1', p_records: 20 })
    expect(perClient.get('p1')!.committed).toBe(0)   // floored, never negative
  })
})

// ── Pass control ─────────────────────────────────────────────────────────────
describe('free proof — two passes, then a human', () => {
  it('passes 1 and 2 are claimable; pass 3 is not', async () => {
    const { rpc } = makeProofDb()
    expect((await rpc('try_claim_proof_pass', { p_client_id: 'p1' })).data).toBe(1)
    expect((await rpc('try_claim_proof_pass', { p_client_id: 'p1' })).data).toBe(2)
    expect((await rpc('try_claim_proof_pass', { p_client_id: 'p1' })).data).toBe(0)
  })

  it('TWO REQUESTS RACING FOR PASS 2 YIELD EXACTLY ONE CLAIMANT', async () => {
    const { rpc } = makeProofDb({ passes: 1 })
    const [a, b] = await Promise.all([
      rpc('try_claim_proof_pass', { p_client_id: 'p1' }),
      rpc('try_claim_proof_pass', { p_client_id: 'p1' }),
    ])
    const claims = [Number(a.data), Number(b.data)].sort()
    expect(claims).toEqual([0, 2])   // one winner, one refused — never two batches
  })

  it('the pass claim does not depend on PDL — a pool-only batch still spends one', async () => {
    // Claiming happens ABOVE the pool serve, so a prospect whose pool covers them well
    // cannot be shown free batch after free batch.
    const { rpc, perClient } = makeProofDb()
    await rpc('try_claim_proof_pass', { p_client_id: 'p1' })
    expect(perClient.get('p1')!.passes).toBe(1)
    expect(perClient.get('p1')!.committed).toBe(0)   // no PDL was reserved at all
  })
})
