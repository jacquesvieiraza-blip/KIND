// ═══════════════════════════════════════════════════════════════════════════════════════
// SERVER-OWNED WORK, AGAINST A REAL DATABASE — J5-C1 · J12-C1 · XC-12
//
// These three items share one persisted truth and it is a PARTIAL UNIQUE INDEX:
//
//     automatic_work_one_live_per_subject
//       ON public.automatic_work (kind, subject_kind, subject_id)
//       WHERE state IN ('requested', 'started')
//
// A mocked `supabase-js` cannot refuse a second insert, so every unit test in this repo
// proves that two replicas do not start the same work only in the sense that the code MEANT
// not to. The index is the thing that actually refuses, and it can only be proven here.
//
// ── WHAT EACH ITEM READS BACK ──────────────────────────────────────────────────────────
//
//   J5-C1  "the Proof run has a server owner (FD-0) — recorded, bounded, detectable"
//          → the row itself: kind/subject/client, `state`, `bound_seconds`, `started_at`.
//            The bound is a CHECK (`bound_seconds > 0`) and the state vocabulary is a CHECK,
//            so a run that is not bounded and not in a known state cannot be recorded at all.
//
//   J12-C1 "the P1 continuation has an owner — a durable claim, so two replicas cannot both
//          start" → two COMMITTED inserts for the same subject race, and the database refuses
//          the second one. This is the claim.
//
//   XC-12  "recovery is controlled (FD-0) — only from failed/stuck, audited, never
//          concurrent" → the same index, read from the other side: a LIVE row blocks a
//          recovery attempt, and a failed/stuck one does not. Plus the audit link:
//          `detected_task_id` is a real foreign key into `operator_tasks`, so a stuck row
//          cannot name a task that does not exist.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import { Client } from 'pg'
import { realdbClient, realdbUrl, createTestClient, dropTestClient } from './harness'

describe('MVP1 · server-owned work is owned BY THE DATABASE', () => {
  let c: Client
  const userIds: string[] = []

  beforeAll(async () => { c = await realdbClient() })
  afterAll(async () => {
    for (const u of userIds) await dropTestClient(c, u).catch(() => {})
    await c.end().catch(() => {})
  })

  const newClient = async () => {
    const t = await createTestClient(c)
    userIds.push(t.userId)
    return t
  }

  /** The exact insert the product makes when it takes ownership of a piece of work. */
  const claimWork = async (
    kind: string, subject: string, clientId: string,
    opts: { state?: string; bound?: number; on?: Client } = {},
  ) => {
    const on = opts.on ?? c
    return on.query<{ id: string }>(
      `insert into public.automatic_work(kind, subject_kind, subject_id, client_id, state, bound_seconds, started_at)
       values ($1, 'client', $2, $3, $4, $5, now()) returning id`,
      [kind, subject, clientId, opts.state ?? 'started', opts.bound ?? 180],
    )
  }

  // ── J5-C1 ────────────────────────────────────────────────────────────────────────────

  it('J5-C1 · a Proof run is RECORDED, BOUNDED and DETECTABLE — and the bound is a constraint', async () => {
    const { clientId } = await newClient()
    const subject = randomUUID()
    const { rows } = await claimWork('proof_run', subject, clientId, { bound: 180 })

    const [row] = (await c.query(
      `select kind, subject_kind, subject_id, client_id, state, bound_seconds, started_at, requested_at
         from public.automatic_work where id = $1`, [rows[0].id])).rows as Array<Record<string, unknown>>

    expect(row.kind).toBe('proof_run')
    expect(row.client_id).toBe(clientId)
    expect(row.state).toBe('started')
    expect(Number(row.bound_seconds)).toBe(180)
    expect(row.started_at, 'a run with no start time cannot be detected as overdue').toBeTruthy()

    // 🛑 THE BOUND IS NOT ADVISORY. An unbounded run is one nothing can ever call stuck, which
    // is the exact shape of the defect FD-0 exists to stop — so the database refuses it.
    await expect(claimWork('proof_run', randomUUID(), clientId, { bound: 0 }))
      .rejects.toThrow(/bound_seconds|violates check constraint/i)
  })

  it('J5-C1 · and an invented state cannot be written — the five are the five', async () => {
    const { clientId } = await newClient()
    await expect(claimWork('proof_run', randomUUID(), clientId, { state: 'in_progress' }))
      .rejects.toThrow(/automatic_work_state_check|violates check constraint/i)

    // The five that ARE allowed, each accepted, so this guard cannot pass by refusing everything.
    for (const state of ['requested', 'started', 'completed', 'failed', 'stuck']) {
      const r = await claimWork('proof_run', randomUUID(), clientId, { state })
      expect(r.rows[0].id, state).toBeTruthy()
    }
  })

  // ── J12-C1 ───────────────────────────────────────────────────────────────────────────

  it('J12-C1 · TWO REPLICAS CANNOT BOTH START the same continuation — the second is refused', async () => {
    // 🛑 THE FAILURE THIS PREVENTS: a cron re-fire, a redelivered webhook or a second replica
    // each reading "nothing is running" and both starting the P1 continuation for one client.
    // A check-then-insert cannot promise this; the index can.
    const { clientId } = await newClient()
    const subject = randomUUID()

    const other = new Client({ connectionString: realdbUrl() })
    await other.connect()
    try {
      const results = await Promise.allSettled([
        claimWork('p1_continuation', subject, clientId, { on: c }),
        claimWork('p1_continuation', subject, clientId, { on: other }),
      ])
      const won = results.filter(r => r.status === 'fulfilled')
      const lost = results.filter(r => r.status === 'rejected')
      expect(won, 'neither replica could start the work at all').toHaveLength(1)
      expect(lost, 'BOTH replicas started the same continuation').toHaveLength(1)
      expect(String((lost[0] as PromiseRejectedResult).reason))
        .toMatch(/automatic_work_one_live_per_subject|duplicate key/i)

      const { rows } = await c.query<{ n: string }>(
        `select count(*)::text as n from public.automatic_work
          where kind = 'p1_continuation' and subject_id = $1 and state in ('requested','started')`, [subject])
      expect(Number(rows[0].n), 'more than one live claim exists for one subject').toBe(1)
    } finally {
      await other.end().catch(() => {})
    }
  })

  // ── XC-12 ────────────────────────────────────────────────────────────────────────────

  it('XC-12 · recovery is refused while the work is LIVE, and permitted once it failed', async () => {
    const { clientId } = await newClient()
    const subject = randomUUID()
    await claimWork('proof_run', subject, clientId, { state: 'started' })

    // A recovery attempt while it is still running is a SECOND run of the same work.
    await expect(claimWork('proof_run', subject, clientId, { state: 'started' }))
      .rejects.toThrow(/automatic_work_one_live_per_subject|duplicate key/i)

    // The run then fails. Recovery is now the correct act, and the same key is free.
    await c.query(
      `update public.automatic_work set state = 'failed', failed_at = now(), failure_reason = 'provider 503'
        where kind = 'proof_run' and subject_id = $1`, [subject])
    const recovered = await claimWork('proof_run', subject, clientId, { state: 'started' })
    expect(recovered.rows[0].id, 'recovery from a FAILED run was refused').toBeTruthy()

    const { rows } = await c.query<{ state: string }>(
      `select state from public.automatic_work where subject_id = $1 order by requested_at`, [subject])
    expect(rows.map(r => r.state)).toEqual(['failed', 'started'])
  })

  it('XC-12 · a stuck row can only name a task that really exists — the audit link is a FK', async () => {
    const { clientId } = await newClient()
    const subject = randomUUID()
    const { rows } = await claimWork('proof_run', subject, clientId, { state: 'started' })

    // 🛑 A DETECTION THAT POINTS AT NOTHING IS NOT AN AUDIT TRAIL. The column is a foreign key,
    // so "the operator was told" cannot be recorded against a task nobody can open.
    await expect(c.query(
      `update public.automatic_work set state = 'stuck', stuck_at = now(), detected_task_id = $2 where id = $1`,
      [rows[0].id, randomUUID()],
    )).rejects.toThrow(/foreign key|automatic_work_detected_task_id_fkey/i)

    const task = await c.query<{ id: string }>(
      `insert into public.operator_tasks(kind, title, client_id, subject_kind, subject_id)
       values ('automatic_work_stuck', 'Proof run is stuck', $1, 'client', $2) returning id`,
      [clientId, subject])
    await c.query(
      `update public.automatic_work set state = 'stuck', stuck_at = now(), detected_task_id = $2 where id = $1`,
      [rows[0].id, task.rows[0].id])

    const [after] = (await c.query(
      `select state, detected_task_id from public.automatic_work where id = $1`, [rows[0].id])).rows as Array<Record<string, unknown>>
    expect(after.state).toBe('stuck')
    expect(after.detected_task_id).toBe(task.rows[0].id)
  })
})
