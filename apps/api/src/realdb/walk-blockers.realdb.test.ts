// ═══════════════════════════════════════════════════════════════════════════════════════
// 28 Sep — THE END-TO-END CHECK (R172), AGAINST A REAL POSTGRESQL.
//
// Both faults below passed every unit test, because the unit suite mocks the database and a
// mock has no CHECK constraints. Each was a build that changed what the code writes without
// changing the rule the database enforces:
//
//   A1 · P9 (25 Sep) prices a band programme as ONE payment — second_payment_cents = 0 — and
//        `programmes_positive_check` (28 Aug) demanded > 0. Every new band client was refused
//        at Accept (founder's walk, test 3).
//   A3 · 22 Sep made Proof refinement unlimited — authority 'automatic_3'+, proof_pass 3+ —
//        and two column rules still stopped at two.
//
// So this file writes the EXACT rows the code now writes, and the rows it must never write.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Client } from 'pg'
import { realdbClient, createTestClient, dropTestClient } from './harness'

describe('R172 · what the code writes, the database accepts', () => {
  let c: Client
  const users: string[] = []
  const newClient = async (name: string) => {
    const t = await createTestClient(c, { companyName: name })
    users.push(t.userId)
    return t.clientId
  }
  const attempt = async (sql: string, args: unknown[]): Promise<{ ok: boolean; error?: string }> => {
    try { await c.query(sql, args); return { ok: true } }
    catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) } }
  }

  beforeAll(async () => { c = await realdbClient() })
  afterAll(async () => {
    for (const u of users) await dropTestClient(c, u).catch(() => {})
    await c.end().catch(() => {})
  })

  // ── A1 ────────────────────────────────────────────────────────────────────────────────
  const programme = (clientId: string, first: number, second: number, total: number) => attempt(
    `insert into public.programmes(client_id, status, meeting_target, recommended_volume,
       price_per_meeting_cents, price_total_cents, first_payment_cents, second_payment_cents)
     values ($1, 'RECOMMENDED', 1, 250, $4, $4, $2, $3)`,
    [clientId, first, second, total],
  )

  it('🛑 A1 · a ONE-PAYMENT band programme (1 meeting, $99, second payment 0) is accepted', async () => {
    const r = await programme(await newClient('A1 one payment'), 9900, 0, 9900)
    expect(r, r.error).toEqual({ ok: true })
  })

  it('A1 · a 50/50 programme is still accepted, exactly as before', async () => {
    const r = await programme(await newClient('A1 fifty fifty'), 4950, 4950, 9900)
    expect(r, r.error).toEqual({ ok: true })
  })

  it('A1 · nothing else loosened: a zero FIRST payment, a negative second, or a split that does not sum are refused', async () => {
    expect((await programme(await newClient('A1 zero first'), 0, 9900, 9900)).ok).toBe(false)
    expect((await programme(await newClient('A1 negative'), 10000, -100, 9900)).ok).toBe(false)
    const bad = await programme(await newClient('A1 bad split'), 9900, 0, 19800)
    expect(bad.ok).toBe(false)
    expect(bad.error).toMatch(/programmes_payment_split_check/)
  })

  it('A1 · the old rule is gone and its replacement is in force', async () => {
    const r = await c.query<{ conname: string }>(
      `select conname from pg_constraint where conrelid = 'public.programmes'::regclass
         and conname in ('programmes_positive_check', 'programmes_positive_one_payment_check')`)
    expect(r.rows.map(x => x.conname)).toEqual(['programmes_positive_one_payment_check'])
  })

  // ── A3 ────────────────────────────────────────────────────────────────────────────────
  it('🛑 A3 · a THIRD automatic Proof pass can be claimed — and a ninth', async () => {
    const clientId = await newClient('A3 claims')
    for (const n of [1, 2, 3]) {
      const r = await c.query<{ id: string }>(
        `insert into public.proof_pass_claims(client_id, authority, status) values ($1, $2, 'open') returning id`,
        [clientId, `automatic_${n}`])
      await c.query(`update public.proof_pass_claims set status = 'completed', settled_at = now() where id = $1`, [r.rows[0].id])
    }
    const ninth = await attempt(
      `insert into public.proof_pass_claims(client_id, authority, status) values ($1, 'automatic_9', 'open')`, [clientId])
    expect(ninth, ninth.error).toEqual({ ok: true })
  })

  it('A3 · an authority that is not automatic_<n> or the calibrated restart is still refused', async () => {
    const clientId = await newClient('A3 bad authority')
    for (const bad of ['automatic_0', 'automatic_', 'automatic_x', 'manual', 'automatic_01']) {
      const r = await attempt(
        `insert into public.proof_pass_claims(client_id, authority, status) values ($1, $2, 'released')`, [clientId, bad])
      expect(r.ok, `${bad} was accepted`).toBe(false)
    }
  })

  it('🛑 A3 · a lead from pass 3 can be written; pass 0 or below still cannot', async () => {
    const clientId = await newClient('A3 leads')
    const lead = (email: string, pass: number | null) => attempt(
      `insert into public.leads(client_id, first_name, last_name, email, status, proof_pass)
       values ($1, 'A', 'B', $2, 'pending', $3)`, [clientId, email, pass])
    expect(await lead('a3-pass3@example.invalid', 3)).toEqual({ ok: true })
    expect(await lead('a3-null@example.invalid', null)).toEqual({ ok: true })
    expect((await lead('a3-zero@example.invalid', 0)).ok).toBe(false)
  })
})
