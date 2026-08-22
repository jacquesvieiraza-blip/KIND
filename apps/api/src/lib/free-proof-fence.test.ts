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
// And two more defects were found by independent review of the FIRST implementation,
// which is why the contract below is reservation-scoped and month-pinned:
//
//   3. The first release took a client id and a count and decremented the AGGREGATE — so a
//      replayed reconciliation recreated authority for records that were genuinely bought,
//      and reconciling one of a client's reservations could release another's.
//   4. Sums keyed on created_at let an August reservation's September correction inflate
//      September's room — the month would open with negative spend.
//
// ⚠️ WHAT THESE TESTS ARE FOR. The dangerous cases are the ones a single-threaded read of
// the code looks fine on: overlapping runs, replayed reconciliations, month boundaries.
// All are asserted against the RPC contract the SQL implements.
//
// No network, no database: the RPCs are simulated with the same row/lock semantics the SQL
// implements — every reservation is a row with an id, a fixed budget_month and a once-only
// reconciled flag — so the CONTRACT is what is proved.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'

const PDL_RATE = 0.28
const CLIENT_CAP = 40
const MONTH_CAP = 300

type LedgerRow = {
  id: string; client: string; records: number; cost: number
  budgetMonth: string; reservationId: string | null
  reconciledAt: string | null; released: number
}

/**
 * A faithful stand-in for the three proof RPCs, mirroring the SQL's semantics:
 * money_settings lock first (global serialisation), then the client row; a positive
 * ledger row IS the reservation and its id is the reconciliation token; corrections
 * inherit the reservation's budget_month. JavaScript is single-threaded inside one
 * call, so a synchronous decide + commit models exactly the SQL's critical section.
 */
function makeProofDb(initial?: { committed?: number; passes?: number; monthUsd?: number }) {
  let seq = 0
  const state = {
    month: '2026-08',
    ledger: [] as LedgerRow[],
    monthUsdFor(m: string) {
      return this.ledger.filter(r => r.budgetMonth === m).reduce((s, r) => s + r.cost, 0)
    },
    get monthUsd() { return this.monthUsdFor(this.month) },
  }
  if (initial?.monthUsd) {
    state.ledger.push({
      id: 'seed', client: '_seed', records: Math.round(initial.monthUsd / PDL_RATE),
      cost: initial.monthUsd, budgetMonth: state.month, reservationId: null,
      reconciledAt: null, released: 0,
    })
  }
  const perClient = new Map<string, { committed: number; passes: number }>()
  const clientOf = (id: string) => {
    if (!perClient.has(id)) perClient.set(id, { committed: initial?.committed ?? 0, passes: initial?.passes ?? 0 })
    return perClient.get(id)!
  }

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    if (fn === 'try_claim_proof_pass') {
      const c = clientOf(String(args.p_client_id ?? ''))
      if (c.passes >= 2) return { data: 0, error: null }
      c.passes += 1
      return { data: c.passes, error: null }
    }
    if (fn === 'try_reserve_proof_records') {
      const c = clientOf(String(args.p_client_id ?? ''))
      const requested = Number(args.p_requested ?? 0)
      if (!(requested > 0)) return { data: { granted: 0, reservation_id: null }, error: null }
      const room = Math.max(0, Math.floor((MONTH_CAP - state.monthUsdFor(state.month)) / PDL_RATE))
      const grant = Math.min(requested, Math.max(0, CLIENT_CAP - c.committed), room)
      if (grant <= 0) return { data: { granted: 0, reservation_id: null }, error: null }
      c.committed += grant
      const id = `res-${++seq}`
      state.ledger.push({
        id, client: String(args.p_client_id), records: grant, cost: grant * PDL_RATE,
        budgetMonth: state.month, reservationId: null, reconciledAt: null, released: 0,
      })
      return { data: { granted: grant, reservation_id: id }, error: null }
    }
    if (fn === 'release_proof_records') {
      const wanted = Number(args.p_records ?? 0)
      if (!(wanted > 0)) return { data: 0, error: null }
      const row = state.ledger.find(r => r.id === String(args.p_reservation_id ?? ''))
      if (!row || row.records <= 0) return { data: 0, error: null }   // not a reservation
      if (row.reconciledAt !== null) return { data: 0, error: null }  // ONCE — a replay is a no-op
      const rel = Math.min(wanted, row.records)                        // scoped to THIS row's size
      row.reconciledAt = 'now'; row.released = rel
      const c = clientOf(row.client)
      c.committed = Math.max(0, c.committed - rel)
      state.ledger.push({
        id: `cor-${++seq}`, client: row.client, records: -rel, cost: -(rel * PDL_RATE),
        budgetMonth: row.budgetMonth,   // the correction lands in the RESERVATION's month
        reservationId: row.id, reconciledAt: null, released: 0,
      })
      return { data: rel, error: null }
    }
    return { data: null, error: null }
  }

  return { rpc, state, perClient }
}

const granted = (d: unknown) => (d as { granted: number }).granted
const resId = (d: unknown) => (d as { reservation_id: string }).reservation_id

// ── The per-prospect 40-record ceiling ───────────────────────────────────────
describe('free proof — a prospect can never cost more than 40 PDL records', () => {
  it('a single oversized request is cut to 40, not granted whole', async () => {
    const { rpc, perClient } = makeProofDb()
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 500 })
    expect(granted(data)).toBe(40)
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
    expect(granted(a.data) + granted(b.data)).toBe(40)
    expect([granted(a.data), granted(b.data)].sort((x, y) => x - y)).toEqual([10, 30])
  })

  it('a third run for the same prospect gets nothing', async () => {
    const { rpc } = makeProofDb({ committed: 40 })
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 20 })
    expect(granted(data)).toBe(0)
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
    expect(granted(a.data) + granted(b.data)).toBe(50)
    expect([granted(a.data), granted(b.data)].sort((x, y) => x - y)).toEqual([10, 40])
    expect(state.monthUsd).toBeCloseTo(MONTH_CAP, 5)
  })

  it('once the acquisition month is spent, every prospect is refused', async () => {
    const { rpc } = makeProofDb({ monthUsd: MONTH_CAP })
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p9', p_requested: 20 })
    expect(granted(data)).toBe(0)
  })
})

// ── Reconciliation — reservation-scoped, once-only, month-pinned ─────────────
describe('free proof — an under-return releases BOTH fences, exactly once', () => {
  it('reserve 40, PDL returns 25 → release 15 from the prospect AND the month', async () => {
    const { rpc, state, perClient } = makeProofDb()
    const { data: r } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 40 })
    expect(perClient.get('p1')!.committed).toBe(40)
    await rpc('release_proof_records', { p_reservation_id: resId(r), p_records: 15 })
    expect(perClient.get('p1')!.committed).toBe(25)
    expect(state.monthUsd).toBeCloseTo(25 * PDL_RATE, 5)
    // The correction is a row, not an edit — and it points back at its reservation.
    expect(state.ledger.map(x => ({ records: x.records, cost: +x.cost.toFixed(2) }))).toEqual([
      { records: 40, cost: +(40 * PDL_RATE).toFixed(2) },
      { records: -15, cost: -(+(15 * PDL_RATE).toFixed(2)) },
    ])
    expect(state.ledger[1].reservationId).toBe(state.ledger[0].id)
  })

  it('A FAILED RELEASE UNDER-ALLOWS AND NEVER OVERSPENDS', async () => {
    // Reconciliation never ran: 40 stays committed though only 25 were bought. The prospect
    // now has 0 proof budget left instead of 15 — recoverable. What CANNOT happen is a 41st.
    const { rpc, perClient } = makeProofDb()
    await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 40 })
    const { data: more } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 15 })
    expect(granted(more)).toBe(0)
    expect(perClient.get('p1')!.committed).toBe(40)
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

// ── RECONCILIATION IS RESERVATION-SCOPED AND ONCE-ONLY (22 Aug, round 2) ─────
//
// Independent review (GPT) found the first design's release was aggregate: it took a
// client id and a count, and decremented the client's total committed. Two defects fall
// straight out of that:
//
//   1. REPLAY RECREATES SPENT AUTHORITY. Reserve 40, consume 25, release 15 → committed
//      25. Retry the SAME reconciliation → committed 10, though 25 real records were
//      bought. A retried job or a double webhook literally manufactures budget.
//   2. MONTH-END LEAK. Sums keyed on created_at push an August reservation's September
//      correction into September — so September opens with negative spend and more than
//      $300 of real September authority.
//
// The corrected contract, asserted here: every reservation is its own row with its own
// id and its own FIXED budget month; reconciliation addresses THAT row, exactly once;
// a replay is a true no-op; and a correction lands in the reservation's month, never
// the month the reconciliation happened to run in.
describe('free proof — reconciliation is scoped to ONE reservation, once', () => {
  it('reserve returns a reservation identity, not a bare number', async () => {
    const { rpc } = makeProofDb()
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 40 })
    expect(granted(data)).toBe(40)
    expect(resId(data)).toBeTruthy()
  })

  it('REPLAYING THE SAME RECONCILIATION RELEASES NOTHING THE SECOND TIME', async () => {
    const { rpc, perClient } = makeProofDb()
    const { data: r } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 40 })
    // PDL returned 25 → release 15, once.
    const first = await rpc('release_proof_records', { p_reservation_id: resId(r), p_records: 15 })
    expect(first.data).toBe(15)
    expect(perClient.get('p1')!.committed).toBe(25)
    // The exact same reconciliation retried — a webhook replay, a job retry.
    const replay = await rpc('release_proof_records', { p_reservation_id: resId(r), p_records: 15 })
    expect(replay.data).toBe(0)
    expect(perClient.get('p1')!.committed).toBe(25)   // NOT 10 — 25 real records were bought
  })

  it('reconciling reservation A can never release reservation B\'s authority', async () => {
    const { rpc, perClient } = makeProofDb()
    const { data: a } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 20 })
    const { data: b } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 20 })
    expect(granted(b)).toBe(20)
    // A over-asks: try to release 30 against a 20-record reservation.
    const rel = await rpc('release_proof_records', { p_reservation_id: resId(a), p_records: 30 })
    expect(rel.data).toBe(20)                          // clamped to A's own size
    expect(perClient.get('p1')!.committed).toBe(20)    // B's 20 untouched
  })

  it('NO RESERVE/RECONCILE/RETRY COMBINATION EXCEEDS 40 LIFETIME RECORDS', async () => {
    const { rpc, perClient } = makeProofDb()
    const { data: a } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 40 })
    await rpc('release_proof_records', { p_reservation_id: resId(a), p_records: 15 })   // 25 consumed
    await rpc('release_proof_records', { p_reservation_id: resId(a), p_records: 15 })   // replay: no-op
    // Whatever is left may be re-reserved — but consumed + new grants never pass 40.
    const { data: b } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 40 })
    expect(granted(b)).toBe(15)
    expect(perClient.get('p1')!.committed).toBe(40)
    const { data: c } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 1 })
    expect(granted(c)).toBe(0) // the 41st record does not exist
  })
})

describe('free proof — a reservation\'s money stays in the month it was reserved', () => {
  it('AN AUGUST RESERVATION RECONCILED IN SEPTEMBER DOES NOT CREATE SEPTEMBER BUDGET', async () => {
    const { rpc, state } = makeProofDb()
    // August: reserve 40 — August's room drops by 40 records.
    const { data: r } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 40 })
    // The calendar rolls over. September's sum must open at exactly $0 spent.
    state.month = '2026-09'
    expect(state.monthUsdFor('2026-09')).toBe(0)
    // The late reconciliation lands — in AUGUST's column, because that is the
    // reservation's budget month.
    await rpc('release_proof_records', { p_reservation_id: resId(r), p_records: 15 })
    expect(state.monthUsdFor('2026-09')).toBe(0)                       // September untouched
    expect(state.monthUsdFor('2026-08')).toBeCloseTo(25 * PDL_RATE, 5) // August corrected
    // September operates normally on its own budget: a fresh prospect's grant is bound by
    // the 40-record CLIENT cap (which binds before the month room), and September's spend
    // is exactly that grant — no $4.20 of phantom August credit anywhere in the sum.
    const { data: s } = await rpc('try_reserve_proof_records', { p_client_id: 'p2', p_requested: 2000 })
    expect(granted(s)).toBe(CLIENT_CAP)
    expect(state.monthUsdFor('2026-09')).toBeCloseTo(CLIENT_CAP * PDL_RATE, 5)
  })

  it('replaying a cross-month reconciliation is still a no-op', async () => {
    const { rpc, state } = makeProofDb()
    const { data: r } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 40 })
    state.month = '2026-09'
    await rpc('release_proof_records', { p_reservation_id: resId(r), p_records: 15 })
    const replay = await rpc('release_proof_records', { p_reservation_id: resId(r), p_records: 15 })
    expect(replay.data).toBe(0)
    expect(state.monthUsdFor('2026-08')).toBeCloseTo(25 * PDL_RATE, 5)
  })
})
