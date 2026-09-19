// ═══════════════════════════════════════════════════════════════════════════════════════
// XC-3 · THE APPLIED-MIGRATION LEDGER, AGAINST THE REAL TABLE
//
// ── WHY THIS ONE CANNOT BE A UNIT TEST ─────────────────────────────────────────────────
//
// The whole statement is database behaviour. `ON CONFLICT (key) DO UPDATE` depends on a
// PRIMARY KEY actually existing on `key`; `coalesce(applied_at, excluded.applied_at)` depends
// on the reference to the existing row resolving to the existing row and not the proposed one;
// `run_count` incrementing depends on its NOT NULL DEFAULT 0 being there. A mocked client
// returns whatever the test author types, and every one of those four facts is exactly the
// kind of thing a mock cannot get wrong.
//
// 🛑 AND THE TABLE HAS A HISTORY THAT MAKES ITS SHAPE NON-OBVIOUS. It was created ACCIDENTALLY
// in production by `20260724_one_wallet.sql`'s `EXCEPTION WHEN undefined_table` handler, with
// two columns. The XC-3 migration therefore has to work against BOTH shapes: `CREATE TABLE IF
// NOT EXISTS` (which is a no-op in production and real on a fresh database) plus `ADD COLUMN
// IF NOT EXISTS` for the four outcome columns. The harness applies the real migration files in
// order, so this is the only place that shape is proven at all.
//
// ── WHAT IT PROVES ─────────────────────────────────────────────────────────────────────
//
//   ① The table has the four XC-3 columns AND a primary key on `key` — without the PK the
//      `ON CONFLICT` clause is a syntax error at runtime, not at type-check.
//   ② `applied_at` is the FIRST success and does not move on a re-run.
//   ③ A failure is RECORDED, with its error, and does not fabricate an `applied_at`.
//   ④ A failure AFTER a success keeps `applied_at` and still reads as `failed`.
//   ⑤ `run_count` counts attempts, not successes.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Client } from 'pg'
import { realdbClient, migrationOutcome } from './harness'
import { recordMigrationOutcome, stateFor } from '../lib/migration-ledger'

type Row = {
  key: string
  applied_at: string | null
  last_outcome: string | null
  last_error: string | null
  last_run_at: string | null
  run_count: number | null
}

describe('XC-3 · app_migrations_applied', () => {
  let c: Client
  const KEY = 'realdb_ledger_probe'

  const read = async (key = KEY): Promise<Row | undefined> => {
    const r = await c.query<Row>(
      `select key, applied_at::text, last_outcome, last_error, last_run_at::text, run_count
         from public.app_migrations_applied where key = $1`, [key],
    )
    return r.rows[0]
  }

  beforeAll(async () => { c = await realdbClient() })
  afterAll(async () => {
    if (!c) return
    await c.query('delete from public.app_migrations_applied where key like $1', ['realdb_ledger_%'])
    await c.end()
  })
  beforeEach(async () => {
    await c.query('delete from public.app_migrations_applied where key like $1', ['realdb_ledger_%'])
  })

  it('the migration applied', async () => {
    expect(await migrationOutcome(c, '20260917_operator_tasks_and_automatic_work.sql')).toBe('applied')
  })

  // ── ① THE SHAPE THE STATEMENT DEPENDS ON ──────────────────────────────────────

  it('has the four XC-3 columns', async () => {
    const { rows } = await c.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema='public' and table_name='app_migrations_applied'`,
    )
    const cols = rows.map(r => r.column_name)
    for (const expected of ['key', 'applied_at', 'last_outcome', 'last_error', 'last_run_at', 'run_count']) {
      expect(cols, `${expected} is missing`).toContain(expected)
    }
  })

  it('has a PRIMARY KEY on key — without it the ON CONFLICT clause cannot run', async () => {
    // 🛑 THE FAILURE THIS CATCHES IS A RUNTIME ONE. `on conflict (key)` requires a unique
    // constraint; TypeScript cannot see that, and the statement would fail on the very first
    // migration run — with the ledger error swallowed by design, so nothing would be recorded
    // and nobody would be told why.
    const { rows } = await c.query<{ n: string }>(
      `select count(*)::text as n from pg_index i
         join pg_class t on t.oid = i.indrelid
        where t.relname = 'app_migrations_applied' and i.indisprimary`,
    )
    expect(Number(rows[0].n)).toBe(1)
  })

  it('applied_at is NULLABLE, or no failure can ever be recorded', async () => {
    // 🛑 THE DEFECT THIS HARNESS FOUND. The column was `NOT NULL DEFAULT now()` — under the
    // old ledger a row's EXISTENCE meant "applied". A failure record proposes
    // `applied_at = NULL`, PostgreSQL checks NOT NULL on the proposed tuple BEFORE the
    // ON CONFLICT clause resolves it, so every failure threw 23502 — and the runner swallows
    // ledger errors by design, so failures were SILENTLY unrecordable while successes logged
    // perfectly. Exactly backwards: the failure is the thing the ledger was added for.
    const { rows } = await c.query<{ is_nullable: string; column_default: string | null }>(
      `select is_nullable, column_default from information_schema.columns
        where table_schema='public' and table_name='app_migrations_applied' and column_name='applied_at'`,
    )
    expect(rows[0].is_nullable).toBe('YES')
    // ⚠️ AND THE DEFAULT SURVIVES THE WIDENING. `20260724_one_wallet.sql`'s accidental insert
    // supplies no `applied_at` and must keep getting one.
    expect(rows[0].column_default).toContain('now()')
  })

  it('run_count is NOT NULL with a default, so the increment can never produce NULL', async () => {
    const { rows } = await c.query<{ is_nullable: string; column_default: string | null }>(
      `select is_nullable, column_default from information_schema.columns
        where table_schema='public' and table_name='app_migrations_applied' and column_name='run_count'`,
    )
    expect(rows[0].is_nullable).toBe('NO')
    expect(rows[0].column_default).toContain('0')
  })

  // ── ② APPLIED_AT IS THE FIRST SUCCESS ─────────────────────────────────────────

  it('a success records applied_at, an outcome and a run', async () => {
    const r = await recordMigrationOutcome(c, KEY, true)
    expect(r.recorded).toBe(true)
    const row = await read()
    expect(row?.last_outcome).toBe('ok')
    expect(row?.applied_at).toBeTruthy()
    expect(row?.run_count).toBe(1)
    expect(row?.last_error).toBeNull()
    expect(stateFor(row as never, true)).toBe('applied')
  })

  it('a SECOND success does not move applied_at, but does move last_run_at', async () => {
    await recordMigrationOutcome(c, KEY, true)
    const first = await read()
    // A visible gap, so "did not move" is a real assertion rather than clock resolution.
    await c.query(`update public.app_migrations_applied
                      set applied_at = now() - interval '30 days', last_run_at = now() - interval '30 days'
                    where key = $1`, [KEY])
    const aged = await read()
    await recordMigrationOutcome(c, KEY, true)
    const again = await read()
    expect(again?.applied_at).toBe(aged?.applied_at)
    // ⚠️ THE FACT THIS PROTECTS. "When did this go in?" must survive every later re-run — and
    // the runner replays every key on every run, so re-runs are the NORMAL case, not the edge.
    expect(again?.last_run_at).not.toBe(aged?.last_run_at)
    expect(again?.run_count).toBe(2)
    expect(first?.run_count).toBe(1)
  })

  // ── ③ AND ④ A FAILURE IS A RECORD ─────────────────────────────────────────────

  it('a FIRST attempt that failed is recorded WITHOUT an applied_at', async () => {
    await recordMigrationOutcome(c, KEY, false, 'relation "nope" does not exist')
    const row = await read()
    expect(row?.last_outcome).toBe('error')
    expect(row?.last_error).toContain('does not exist')
    // 🛑 A FAILED MIGRATION MUST NOT CLAIM TO HAVE BEEN APPLIED. This is the column the
    // pre-XC-3 ledger had, and a row's mere existence used to mean "applied".
    expect(row?.applied_at).toBeNull()
    expect(stateFor(row as never, true)).toBe('failed')
  })

  it('a failure AFTER a success keeps applied_at and still reads as failed', async () => {
    await recordMigrationOutcome(c, KEY, true)
    const ok = await read()
    await recordMigrationOutcome(c, KEY, false, 'boom')
    const bad = await read()
    // Both facts are true at once and both matter: it DID go in once, and the latest attempt
    // errored. Collapsing them either way hides one of the two.
    expect(bad?.applied_at).toBe(ok?.applied_at)
    expect(bad?.last_outcome).toBe('error')
    expect(stateFor(bad as never, true)).toBe('failed')
    expect(bad?.run_count).toBe(2)
  })

  it('a later success clears the error and the state recovers', async () => {
    await recordMigrationOutcome(c, KEY, false, 'boom')
    await recordMigrationOutcome(c, KEY, true)
    const row = await read()
    expect(row?.last_outcome).toBe('ok')
    // A stale error left behind would keep showing a FAILED badge for a migration that has
    // since applied — the operator would chase a problem that no longer exists.
    expect(row?.last_error).toBeNull()
    expect(row?.applied_at).toBeTruthy()
    expect(stateFor(row as never, true)).toBe('applied')
  })

  it('two keys never touch each other\'s row', async () => {
    await recordMigrationOutcome(c, KEY, true)
    await recordMigrationOutcome(c, 'realdb_ledger_other', false, 'boom')
    expect((await read())?.last_outcome).toBe('ok')
    expect((await read('realdb_ledger_other'))?.last_outcome).toBe('error')
  })

  it('a stored error is bounded — a 40 KB postgres message cannot fill the table', async () => {
    await recordMigrationOutcome(c, KEY, false, 'x'.repeat(40_000))
    const row = await read()
    expect((row?.last_error ?? '').length).toBeLessThanOrEqual(2000)
  })

  // ── RLS ───────────────────────────────────────────────────────────────────────

  it('RLS is ON with a service-role-only policy', async () => {
    // The ledger names every migration this deployment has run, which is a map of the
    // schema. It is operator data, and the browser has no business reading it.
    const { rows } = await c.query<{ relrowsecurity: boolean }>(
      `select relrowsecurity from pg_class where relname = 'app_migrations_applied'`,
    )
    expect(rows[0].relrowsecurity).toBe(true)
    const { rows: pol } = await c.query<{ policyname: string; roles: string }>(
      `select policyname, roles::text from pg_policies
        where tablename = 'app_migrations_applied'`,
    )
    expect(pol.length).toBeGreaterThan(0)
    expect(pol.map(p => p.roles).join(' ')).toContain('service_role')
  })
})
