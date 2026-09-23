// ═══════════════════════════════════════════════════════════════════════════════════════
// R137 · EVERY ACCOUNT ON THE PROGRAMME, AGAINST A REAL POSTGRESQL — 23 Sep 2026
//
// Founder, verbatim: *"the 299/4 is retired/ this must go. everything must be updated to new
// programme pricing model."*
//
// `20260923_all_clients_programme` is the first migration on `clients.commercial_model` that
// WRITES ROWS, then contracts the column. A mocked `supabase-js` has no constraints and no
// UPDATE, so only a real database can prove:
//   ① after it, a client created WITHOUT naming the column is a programme client (the DEFAULT) —
//     which is what classifies every seat, demo and partner-demo path that never names it;
//   ② NULL and 'legacy' are REFUSED by the database, not merely unused by the code;
//   ③ run against a book that still holds NULL and 'legacy', it rewrites both to 'programme' and
//     RECORDS what each held — and touches no other column;
//   ④ replaying it (the runner's `force`) is harmless.
//
// ③ and ④ run inside a transaction that is ROLLED BACK: the harness database has already had
// the migration applied, so the pre-R137 state is recreated by relaxing the contract inside the
// transaction and discarded afterwards. DDL is transactional in PostgreSQL; nothing leaks.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Client } from 'pg'
import { randomUUID } from 'crypto'
import { realdbClient, createTestClient, dropTestClient } from './harness'
import { PENDING_MIGRATIONS } from '../lib/pending-migrations'

const R137 = PENDING_MIGRATIONS.find(m => m.key === '20260923_all_clients_programme')

describe('R137 · every account is on the programme — enforced by the database', () => {
  let c: Client
  const users: string[] = []

  beforeAll(async () => { c = await realdbClient() })
  afterAll(async () => {
    for (const u of users) await dropTestClient(c, u).catch(() => {})
    await c.end()
  })

  it('the runner carries the migration — this file is not vacuous', () => {
    expect(R137, 'the runner entry is missing').toBeTruthy()
  })

  it('🛑 ① a client created without naming the model is a PROGRAMME client', async () => {
    const t = await createTestClient(c, { companyName: 'R137 default' })
    users.push(t.userId)
    const r = await c.query('select commercial_model, commercial_model_before_r137 from public.clients where id = $1', [t.clientId])
    expect(r.rows[0].commercial_model).toBe('programme')
    expect(r.rows[0].commercial_model_before_r137, 'a new row has no pre-R137 history').toBeNull()
  })

  it('🛑 ② NULL and legacy are refused by the database itself', async () => {
    const t = await createTestClient(c, { companyName: 'R137 refuse' })
    users.push(t.userId)
    await expect(c.query(`update public.clients set commercial_model = null where id = $1`, [t.clientId]))
      .rejects.toThrow(/null value|not-null/i)
    await expect(c.query(`update public.clients set commercial_model = 'legacy' where id = $1`, [t.clientId]))
      .rejects.toThrow(/clients_commercial_model_programme_only|check constraint/i)
  })

  it('🛑 ③ run against a pre-R137 book it rewrites NULL and legacy, records both, and touches nothing else — ④ and replays cleanly', async () => {
    await c.query('begin')
    try {
      // Recreate the pre-R137 state inside this transaction only.
      await c.query('alter table public.clients drop constraint clients_commercial_model_programme_only')
      await c.query('alter table public.clients alter column commercial_model drop not null')
      await c.query('alter table public.clients alter column commercial_model drop default')

      const mk = async (model: string | null) => {
        const u = randomUUID()
        await c.query('insert into auth.users(id, email) values ($1, $2)', [u, `r137-${u}@example.invalid`])
        const r = await c.query(
          `insert into public.clients(user_id, company_name, country, commercial_model, wallet_balance_usd)
           values ($1, $2, 'United Kingdom', $3, 123.45) returning id`,
          [u, `R137 ${String(model)}`, model],
        )
        return String(r.rows[0].id)
      }
      const nul = await mk(null), leg = await mk('legacy'), prog = await mk('programme')
      await c.query('update public.clients set commercial_model_before_r137 = null where id = any($1)', [[nul, leg, prog]])

      await c.query(R137!.sql)
      const rows = async () => (await c.query(
        `select id, commercial_model, commercial_model_before_r137, wallet_balance_usd::text as w
           from public.clients where id = any($1)`, [[nul, leg, prog]])).rows
      const by = (rs: Array<Record<string, unknown>>, id: string) => rs.find(r => r.id === id)!
      let rs = await rows()
      expect(by(rs, nul).commercial_model).toBe('programme')
      expect(by(rs, nul).commercial_model_before_r137).toBe('unclassified')
      expect(by(rs, leg).commercial_model).toBe('programme')
      expect(by(rs, leg).commercial_model_before_r137).toBe('legacy')
      expect(by(rs, prog).commercial_model_before_r137, 'an already-programme row is not touched').toBeNull()
      for (const id of [nul, leg, prog]) expect(by(rs, id).w, 'no money column moves').toBe('123.45')

      // ④ The runner's `force` replays it: nothing changes, nothing errors.
      await c.query(R137!.sql)
      rs = await rows()
      expect(by(rs, leg).commercial_model_before_r137, 'a replay must not overwrite the record').toBe('legacy')
      const cons = await c.query(
        `select count(*)::int as n from pg_constraint
          where conrelid = 'public.clients'::regclass and conname = 'clients_commercial_model_programme_only'`)
      expect(cons.rows[0].n).toBe(1)
    } finally {
      await c.query('rollback')
    }
  })
})
