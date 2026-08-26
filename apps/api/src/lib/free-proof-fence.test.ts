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
import { readFileSync } from 'fs'
import { join } from 'path'

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
  // ⚑ 26 Aug — `startedAt` models `clients.proof_started_at`. NULL until a pass is claimed,
  // exactly as the column ships: existing rows are never backfilled.
  const perClient = new Map<string, { committed: number; passes: number; startedAt: string | null }>()
  const clientOf = (id: string) => {
    if (!perClient.has(id)) {
      perClient.set(id, { committed: initial?.committed ?? 0, passes: initial?.passes ?? 0, startedAt: null })
    }
    return perClient.get(id)!
  }
  // Server clock, monotonic so two claims can never collide on the same value.
  let serverClock = 1_700_000_000_000
  const serverNow = () => new Date((serverClock += 1000)).toISOString()

  const rpc = async (fn: string, args: Record<string, unknown>) => {
    if (fn === 'try_claim_proof_pass') {
      const c = clientOf(String(args.p_client_id ?? ''))
      // ⚠️ EVERY REFUSAL RETURNS BEFORE THE UPDATE, exactly as the SQL does. A third pass
      // must not advance the clock — otherwise a refused click would make an in-flight run
      // look like it had just restarted.
      if (c.passes >= 2) return { data: 0, error: null }
      // ⚠️ ONE STATEMENT: the counter and the start time move together, or neither moves.
      // The SQL does this in a single UPDATE under the same FOR UPDATE lock; modelling them
      // as two assignments in one synchronous block is the same critical section.
      c.passes += 1
      c.startedAt = serverNow()
      return { data: c.passes, error: null }
    }
    if (fn === 'try_reserve_proof_records') {
      // Refusals name the fence, in the SQL's order: the prospect's own ceiling is answered
      // BEFORE the company's, because a prospect at 40 says nothing about the $300.
      const refuse = (why: string) => ({ data: { granted: 0, reservation_id: null, reason: why }, error: null })
      const c = clientOf(String(args.p_client_id ?? ''))
      const requested = Number(args.p_requested ?? 0)
      if (!(requested > 0)) return refuse('FAIL_CLOSED_BAD_ARGS')
      const clientRoom = Math.max(0, CLIENT_CAP - c.committed)
      if (clientRoom <= 0) return refuse('CLIENT_PROOF_LIMIT_REACHED')
      const room = Math.max(0, Math.floor((MONTH_CAP - state.monthUsdFor(state.month)) / PDL_RATE))
      if (room <= 0) return refuse('MONTHLY_PROOF_BUDGET_REACHED')
      const grant = Math.min(requested, clientRoom, room)
      if (grant <= 0) return refuse('FAIL_CLOSED_BAD_ARGS')
      c.committed += grant
      const id = `res-${++seq}`
      state.ledger.push({
        id, client: String(args.p_client_id), records: grant, cost: grant * PDL_RATE,
        budgetMonth: state.month, reservationId: null, reconciledAt: null, released: 0,
      })
      return { data: { granted: grant, reservation_id: id, reason: 'GRANTED' }, error: null }
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
/** WHICH fence refused — returned by the RPC itself, never inferred by the caller. */
const reason = (d: unknown) => (d as { reason: string }).reason

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

  // ── ⚑ 26 Aug — THE CLAIM RECORDS ITS OWN START, ATOMICALLY ────────────────────────────
  //
  // WHY THIS IS IN THE FENCE FILE. The start time is not a new mechanism with its own rules;
  // it is a second column on the SAME atomic claim, and it inherits that claim's guarantees
  // or it is worthless. So it is proved beside them: the counter and the clock move together
  // or not at all, and every path that refuses a pass refuses the stamp with it.
  //
  // The desk depends on this. Its whole wait — "still finding" vs the approved recovery
  // copy — is measured from this value, and it replaced a browser stamp that could be
  // written after a lost response, missing on another device, or stale from an older pass.
  describe('the proof-start clock is written BY the claim', () => {
    it('1 · pass 1 moves the counter and the timestamp together', async () => {
      const { rpc, perClient } = makeProofDb()
      expect(perClient.get('p1')?.startedAt ?? null).toBeNull()   // nothing claimed yet
      expect((await rpc('try_claim_proof_pass', { p_client_id: 'p1' })).data).toBe(1)
      const c = perClient.get('p1')!
      expect(c.passes).toBe(1)
      expect(c.startedAt, 'a claimed pass without a start is the state this column removes').not.toBeNull()
    })

    it('2 · pass 2 ADVANCES it — the clock always describes the CURRENT pass', async () => {
      // The reason one column is enough: pass 2's claim overwrites pass 1's stamp, so the
      // desk never has to work out which pass a timestamp belonged to.
      const { rpc, perClient } = makeProofDb()
      await rpc('try_claim_proof_pass', { p_client_id: 'p1' })
      const first = perClient.get('p1')!.startedAt!
      await rpc('try_claim_proof_pass', { p_client_id: 'p1' })
      const second = perClient.get('p1')!.startedAt!
      expect(perClient.get('p1')!.passes).toBe(2)
      expect(Date.parse(second)).toBeGreaterThan(Date.parse(first))
    })

    it('3 · a REFUSED duplicate does not advance it — the loser of a race changes nothing', async () => {
      const { rpc, perClient } = makeProofDb({ passes: 1 })
      const [a, b] = await Promise.all([
        rpc('try_claim_proof_pass', { p_client_id: 'p1' }),
        rpc('try_claim_proof_pass', { p_client_id: 'p1' }),
      ])
      expect([Number(a.data), Number(b.data)].sort()).toEqual([0, 2])   // one winner
      const after = perClient.get('p1')!.startedAt!
      // Exactly ONE stamp was taken, by the winner. Claim again (refused) and prove the
      // value is untouched — a refused click must not restart an in-flight run's clock.
      expect((await rpc('try_claim_proof_pass', { p_client_id: 'p1' })).data).toBe(0)
      expect(perClient.get('p1')!.startedAt).toBe(after)
    })

    it('4 · a forbidden THIRD pass does not advance it', async () => {
      const { rpc, perClient } = makeProofDb({ passes: 2 })
      expect(perClient.get('p1')?.startedAt ?? null).toBeNull()
      expect((await rpc('try_claim_proof_pass', { p_client_id: 'p1' })).data).toBe(0)
      expect(perClient.get('p1')!.startedAt, 'a refusal must never stamp').toBeNull()
      expect(perClient.get('p1')!.passes).toBe(2)                     // and never a third
    })

    it('the SQL itself stamps inside the ONE update, and takes no timestamp argument', () => {
      // The model above is only as good as its fidelity to the shipped statement, so the
      // statement is read. Two things must hold, and both are load-bearing:
      //   · the stamp is set in the SAME `update ... set` that moves the counter — a second
      //     statement would open a window where a pass exists with no start;
      //   · the value is `now()` on the server. The function signature takes only a client
      //     id, so a browser `Date.now()` cannot be supplied even by mistake.
      const runner = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')
      const at = runner.indexOf("key: '20260826_proof_started_at'")
      expect(at, 'the runner entry').toBeGreaterThan(-1)
      const sql = runner.slice(at, runner.indexOf('`.trim()', at))
      const update = sql.slice(sql.indexOf('update public.clients'), sql.indexOf('return v_done + 1'))
      expect(update).toContain('proof_passes_done = v_done + 1')
      expect(update).toContain('proof_started_at  = now()')
      expect((update.match(/update public\.clients/g) ?? []), 'exactly one UPDATE').toHaveLength(1)
      expect(sql).toContain('function public.try_claim_proof_pass(p_client_id uuid)')
      expect(sql, 'the claim must accept no caller-supplied time').not.toMatch(/p_started_at|p_now|p_timestamp/)
      // The refusals still return before the update reaches the row.
      expect(sql.indexOf('if v_done >= 2 then return 0')).toBeLessThan(sql.indexOf('update public.clients'))
      expect(sql.indexOf('if p_client_id is null then return 0')).toBeLessThan(sql.indexOf('update public.clients'))
    })
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

// ── THE REFUSAL HAS TO SAY WHICH FENCE STOPPED IT (round 3) ──────────────────
//
// Defect found by independent review, 22 Aug: `granted = 0` was the caller's ONLY signal,
// so the route raised "the $300 free-proof acquisition budget is spent" every time a single
// prospect finished their own lifetime 40 — the routine case, and the one that costs the
// company nothing. An alert that fires on a routine event is an alert nobody reads on the
// day it is true, which is the day the acquisition ceiling actually stops every prospect.
//
// So the RPC returns the reason from INSIDE the locked section, computed from the same
// numbers that decided the grant. It cannot disagree with the decision it explains, and the
// caller never re-derives it with a second query reading a different instant.
describe('free proof — a refusal names the fence that refused it', () => {
  it('a granted reservation says GRANTED', async () => {
    const { rpc } = makeProofDb()
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 7 })
    expect(granted(data)).toBe(7)
    expect(reason(data)).toBe('GRANTED')
  })

  it('a partial grant is still GRANTED — fewer records is not a refusal', async () => {
    const { rpc } = makeProofDb({ committed: 35 })
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 20 })
    expect(granted(data)).toBe(5)
    expect(reason(data)).toBe('GRANTED')
  })

  it('A PROSPECT AT THEIR OWN 40 IS NOT A BUDGET EVENT', async () => {
    // THE DEFECT, ASSERTED. This is the common zero and it must never read as "the $300
    // is gone" — the month below is virtually untouched.
    const { rpc, state } = makeProofDb({ committed: CLIENT_CAP })
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 20 })
    expect(granted(data)).toBe(0)
    expect(reason(data)).toBe('CLIENT_PROOF_LIMIT_REACHED')
    expect(state.monthUsd).toBe(0)
  })

  it('a spent acquisition month says MONTHLY_PROOF_BUDGET_REACHED', async () => {
    // The rare one, and the only one that is a company event: free acquisition has stopped
    // for EVERY prospect until the founder raises the ceiling.
    const { rpc } = makeProofDb({ monthUsd: MONTH_CAP })
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'fresh', p_requested: 20 })
    expect(granted(data)).toBe(0)
    expect(reason(data)).toBe('MONTHLY_PROOF_BUDGET_REACHED')
  })

  it('WHEN BOTH FENCES ARE CLOSED, THE PROSPECT\'S OWN LIMIT IS REPORTED', async () => {
    // Order is not cosmetic. A prospect sitting at 40 tells you NOTHING about the $300, so
    // resolving the tie the other way would state something false about company money on
    // the strength of a fact that does not support it.
    const { rpc } = makeProofDb({ committed: CLIENT_CAP, monthUsd: MONTH_CAP })
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 20 })
    expect(reason(data)).toBe('CLIENT_PROOF_LIMIT_REACHED')
  })

  it('a request for nothing fails closed with a reason, and reserves nothing', async () => {
    const { rpc, state } = makeProofDb()
    const { data } = await rpc('try_reserve_proof_records', { p_client_id: 'p1', p_requested: 0 })
    expect(granted(data)).toBe(0)
    expect(reason(data)).toBe('FAIL_CLOSED_BAD_ARGS')
    expect(state.ledger).toEqual([])
  })

  it('THE SHIPPED SQL EMITS THESE REASONS, AND TESTS THE CLIENT BEFORE THE MONTH', () => {
    // The simulation above proves the CONTRACT. This proves the contract is the one the
    // function that will actually run in production implements — in BOTH homes, because a
    // migration recorded in one and run from the other is how a fence goes missing.
    const homes = [
      readFileSync(join(__dirname, '../../../../supabase/migrations/20260822_free_proof_acquisition.sql'), 'utf8'),
      readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8'),
    ]
    for (const src of homes) {
      const fn = src.slice(
        src.indexOf('create or replace function public.try_reserve_proof_records'),
        src.indexOf('revoke execute on function public.try_reserve_proof_records'),
      )
      expect(fn.length).toBeGreaterThan(0)
      for (const r of ['GRANTED', 'CLIENT_PROOF_LIMIT_REACHED', 'MONTHLY_PROOF_BUDGET_REACHED', 'FAIL_CLOSED_BAD_ARGS']) {
        expect(fn).toContain(`'${r}'`)
      }
      // Every exit carries a reason — a bare two-key return would leave the caller guessing
      // exactly as before.
      const returns = fn.match(/jsonb_build_object\(/g) ?? []
      const withReason = fn.match(/jsonb_build_object\([^;]*?'reason'/g) ?? []
      expect(withReason.length).toBe(returns.length)
      // ORDERING, read off the shipped source: the client's own ceiling is answered first.
      expect(fn.indexOf("'CLIENT_PROOF_LIMIT_REACHED'")).toBeLessThan(fn.indexOf("'MONTHLY_PROOF_BUDGET_REACHED'"))
      // And the month's room is still summed over budget_month, not created_at (defect 4).
      expect(fn).toContain('where budget_month = v_month')
    }
  })
})
