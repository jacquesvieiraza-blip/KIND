// ═══════════════════════════════════════════════════════════════════════════════════════
// J5-C9 · THE FREE-PROOF FENCE, COUNTED IN RECORDS — PROVEN AGAINST THE REAL FUNCTION
//
// This one CANNOT be a unit test. The fence is a `plpgsql` body: the locking order that
// serialises two prospects, the `sum(records)` that makes an outstanding reservation count
// against the month, and the arithmetic that used to divide a dollar ceiling by $0.28 all
// live inside the database. A mocked `db.rpc` returns whatever the test author types.
//
// ── WHAT IT PROVES ────────────────────────────────────────────────────────────────────
//
//   ① THE MONTHLY CEILING BINDS IN RECORDS. Under FD-6 an Apollo record costs nothing, so
//      the old `floor((cap_usd - month_spend) / 0.28)` divides an untouched budget by a rate
//      that buys nothing — an UNBOUNDED fence. The fiction was what kept it bounded.
//   ② NOTHING BOOKS A PDL RATE. A new reservation writes `cost_usd = 0`.
//   ③ AR17 IS UNTOUCHED. 40 records per prospect for life, and it refuses with its own
//      reason — which is not a company money event and must not be reported as one.
//   ④ A RELEASE STILL RETURNS THE AUTHORITY, and it no longer divides by anything.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Client } from 'pg'
import { realdbClient, migrationOutcome, createTestClient, dropTestClient } from './harness'

type Reservation = { granted: number; reservation_id: string | null; reason: string }

describe('J5-C9 · try_reserve_proof_records', () => {
  let c: Client
  const userIds: string[] = []

  const reserve = async (clientId: string, requested: number): Promise<Reservation> => {
    const r = await c.query<{ out: Reservation }>(
      'select try_reserve_proof_records($1::uuid, $2::int) as out',
      [clientId, requested],
    )
    return r.rows[0].out
  }

  const newClient = async () => {
    const { clientId, userId } = await createTestClient(c)
    userIds.push(userId)
    return clientId
  }

  beforeAll(async () => {
    c = await realdbClient()
    // The singleton the fence locks. A fresh harness database has no row.
    await c.query(`insert into public.money_settings(id) values (1) on conflict (id) do nothing`)
  })

  afterAll(async () => {
    if (!c) return
    for (const id of userIds) await dropTestClient(c, id)
    await c.end()
  })

  beforeEach(async () => {
    // Each case gets a clean month. The ledger is global, so leaving rows behind would make
    // the monthly-ceiling cases depend on execution order.
    await c.query('delete from public.proof_ledger')
    await c.query(`update public.money_settings set proof_monthly_cap_records = 1071 where id = 1`)
  })

  it('the migration applied', async () => {
    expect(await migrationOutcome(c, '20260917_proof_fence_in_records.sql')).toBe('applied')
  })

  it('the monthly ceiling exists as a RECORD count, and the dollar cap is kept as history', async () => {
    const { rows } = await c.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema='public' and table_name='money_settings'
          and column_name in ('proof_monthly_cap_records','proof_monthly_cap_usd')`,
    )
    const cols = rows.map((r) => r.column_name)
    expect(cols).toContain('proof_monthly_cap_records')
    // Kept, not dropped: rows written before FD-6 record dollars genuinely committed, and a
    // ceiling with no unit makes them unreadable. Contract is a later migration.
    expect(cols).toContain('proof_monthly_cap_usd')
  })

  it('the one-time translation preserves the operative limit: $300 at $0.28 → 1071 records', async () => {
    // The unit becomes honest; the NUMBER does not move. Choosing a different monthly record
    // ceiling is the founder's decision and this migration does not make it.
    await c.query(`update public.money_settings set proof_monthly_cap_records = null, proof_monthly_cap_usd = 300 where id = 1`)
    await c.query(`update public.money_settings
                      set proof_monthly_cap_records = greatest(1, floor(coalesce(proof_monthly_cap_usd, 300) / 0.28)::int)
                    where id = 1 and proof_monthly_cap_records is null`)
    const { rows } = await c.query<{ n: number }>(`select proof_monthly_cap_records as n from public.money_settings where id = 1`)
    expect(rows[0].n).toBe(1071)
  })

  // ── ① AND ② ───────────────────────────────────────────────────────────────────

  it('grants, and books NO provider cost', async () => {
    const clientId = await newClient()
    const out = await reserve(clientId, 20)
    expect(out.reason).toBe('GRANTED')
    expect(out.granted).toBe(20)

    const { rows } = await c.query<{ records: number; cost_usd: string }>(
      `select records, cost_usd::text from public.proof_ledger where client_id = $1`,
      [clientId],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].records).toBe(20)
    // 🛑 THE ASSERTION FD-6 EXISTS FOR. `records * 0.28` = $5.60 would be money nobody spent.
    expect(Number(rows[0].cost_usd)).toBe(0)
  })

  it('the monthly ceiling REFUSES, counted in records', async () => {
    // 🛑 THE FENCE THAT STOPPED BINDING. With `cost_usd` telling the truth ($0), the old
    // `floor((cap - month_spend) / 0.28)` divides an untouched budget by a rate that buys
    // nothing, so it never refuses. Counted in records, it refuses at the ceiling.
    await c.query(`update public.money_settings set proof_monthly_cap_records = 30 where id = 1`)
    const a = await newClient()
    const b = await newClient()

    expect((await reserve(a, 20)).granted).toBe(20)
    // Only 10 of the month's 30 are left, so the second prospect is clamped to 10 — not
    // refused, and not granted 20.
    const second = await reserve(b, 20)
    expect(second.granted).toBe(10)
    expect(second.reason).toBe('GRANTED')

    const third = await reserve(await newClient(), 5)
    expect(third.granted).toBe(0)
    expect(third.reason).toBe('MONTHLY_PROOF_BUDGET_REACHED')
  })

  it('an OUTSTANDING reservation counts against the month — the reservation IS the ledger row', async () => {
    await c.query(`update public.money_settings set proof_monthly_cap_records = 25 where id = 1`)
    const a = await newClient()
    await reserve(a, 25)                       // reserved, not yet reconciled
    const out = await reserve(await newClient(), 1)
    expect(out.reason).toBe('MONTHLY_PROOF_BUDGET_REACHED')
  })

  // ── ③ AR17 ────────────────────────────────────────────────────────────────────

  it('AR17 caps a prospect at 40 records for life, with its own reason', async () => {
    const clientId = await newClient()
    expect((await reserve(clientId, 40)).granted).toBe(40)
    const again = await reserve(clientId, 1)
    expect(again.granted).toBe(0)
    // ⚠️ NOT a company money event. A prospect finishing their own 40 is the COMMON refusal,
    // and reporting it as the monthly budget running out is how a real alert gets ignored.
    expect(again.reason).toBe('CLIENT_PROOF_LIMIT_REACHED')
  })

  it('the prospect cap is answered BEFORE the monthly one', async () => {
    // Both would refuse; the prospect's own ceiling is the one that must be named, because
    // it is the one that is true of this prospect and is not an alert-worthy company event.
    await c.query(`update public.money_settings set proof_monthly_cap_records = 1 where id = 1`)
    const clientId = await newClient()
    await c.query(`update public.clients set proof_records_committed = 40 where id = $1`, [clientId])
    expect((await reserve(clientId, 5)).reason).toBe('CLIENT_PROOF_LIMIT_REACHED')
  })

  it('refuses bad arguments and an unknown client, fail-closed', async () => {
    expect((await reserve(await newClient(), 0)).reason).toBe('FAIL_CLOSED_BAD_ARGS')
    const ghost = await c.query<{ out: Reservation }>(
      `select try_reserve_proof_records('00000000-0000-0000-0000-000000000000'::uuid, 5) as out`,
    )
    expect(ghost.rows[0].out.reason).toBe('FAIL_CLOSED_UNKNOWN_CLIENT')
    expect(ghost.rows[0].out.granted).toBe(0)
  })

  // ── ④ THE RELEASE ─────────────────────────────────────────────────────────────

  it('a release returns the authority and books no correction cost', async () => {
    const clientId = await newClient()
    const res = await reserve(clientId, 40)
    const released = await c.query<{ n: number }>(
      'select release_proof_records($1::uuid, $2::int) as n',
      [res.reservation_id, 15],
    )
    expect(released.rows[0].n).toBe(15)

    const committed = await c.query<{ n: number }>(
      'select proof_records_committed as n from public.clients where id = $1',
      [clientId],
    )
    expect(committed.rows[0].n).toBe(25)

    const { rows } = await c.query<{ records: number; cost_usd: string }>(
      `select records, cost_usd::text from public.proof_ledger where client_id = $1 and records < 0`,
      [clientId],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].records).toBe(-15)
    expect(Number(rows[0].cost_usd)).toBe(0)
  })

  it('a release is idempotent — a replay is a no-op, never a second decrement', async () => {
    const clientId = await newClient()
    const res = await reserve(clientId, 20)
    await c.query('select release_proof_records($1::uuid, 20)', [res.reservation_id])
    const replay = await c.query<{ n: number }>('select release_proof_records($1::uuid, 20) as n', [res.reservation_id])
    expect(replay.rows[0].n).toBe(0)
    const committed = await c.query<{ n: number }>(
      'select proof_records_committed as n from public.clients where id = $1', [clientId],
    )
    expect(committed.rows[0].n).toBe(0)
  })

  it('a release CANNOT free another reservation\'s authority', async () => {
    const a = await newClient()
    const b = await newClient()
    const resA = await reserve(a, 10)
    await reserve(b, 10)
    // Ask to release 100 against A's 10-record reservation.
    const n = await c.query<{ n: number }>('select release_proof_records($1::uuid, 100) as n', [resA.reservation_id])
    expect(n.rows[0].n).toBe(10)
    const committedB = await c.query<{ n: number }>(
      'select proof_records_committed as n from public.clients where id = $1', [b],
    )
    expect(committedB.rows[0].n).toBe(10)
  })

  it('a release restores the MONTH\'S room too', async () => {
    await c.query(`update public.money_settings set proof_monthly_cap_records = 20 where id = 1`)
    const a = await newClient()
    const res = await reserve(a, 20)
    expect((await reserve(await newClient(), 1)).reason).toBe('MONTHLY_PROOF_BUDGET_REACHED')
    await c.query('select release_proof_records($1::uuid, 20)', [res.reservation_id])
    // The negative records row self-corrects the sum — with no rate anywhere in it.
    expect((await reserve(await newClient(), 1)).reason).toBe('GRANTED')
  })

  it('there is no rate left in either function body', async () => {
    const { rows } = await c.query<{ src: string }>(
      `select pg_get_functiondef(p.oid) as src from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname='public' and p.proname in ('try_reserve_proof_records','release_proof_records')`,
    )
    expect(rows).toHaveLength(2)
    for (const r of rows) {
      // ⚠️ ASSERTED ON CODE, NOT PROSE — the repo's convention for every absence assertion.
      // The body's own comments EXPLAIN the retired $0.28 rate on purpose, and matching them
      // would make this guard fail on its own explanation.
      const code = r.src.replace(/--.*$/gm, '')
      // 🛑 The DEPLOYED body is what matters, not the file. A `CREATE OR REPLACE` that never
      // ran would leave the old arithmetic live while the repo looked correct.
      expect(code, 'a PDL rate survives in a deployed proof function').not.toMatch(/0\.28/)
      expect(code, 'the rate variable survives').not.toMatch(/v_rate/)
      // And no ledger row may be written with a rate-derived cost.
      expect(code).not.toMatch(/cost_usd[^)]*\*/)
    }
  })
})
