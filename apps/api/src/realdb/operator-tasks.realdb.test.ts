// ── XC-5 + XC-6 · PROVEN AGAINST A REAL SCHEMA ──────────────────────────────────
//
// The unit tests above mock `supabase-js` and prove the CODE reads a unique violation as
// "already reported". They cannot prove the violation HAPPENS — a mock will accept any
// number of inserts. These two tables' whole safety story is two partial unique indexes:
//
//   · `operator_tasks_one_open_per_key`         — one OPEN task per (kind, dedupe_key)
//   · `automatic_work_one_live_per_subject`     — one LIVE unit per subject (FD-0)
//
// Only a database can refuse the second row, so only this file can prove they do.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Client } from 'pg'
import { realdbClient, migrationOutcome, createTestClient, dropTestClient } from './harness'

describe('XC-5 / XC-6 · the tables and their indexes', () => {
  let c: Client
  const userIds: string[] = []

  beforeAll(async () => {
    c = await realdbClient()
  })
  afterAll(async () => {
    if (!c) return
    for (const id of userIds) await dropTestClient(c, id)
    await c.end()
  })

  it('the migration applied', async () => {
    expect(await migrationOutcome(c, '20260917_operator_tasks_and_automatic_work.sql')).toBe('applied')
  })

  it('operator_tasks and automatic_work exist with RLS enabled', async () => {
    const { rows } = await c.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
        where relname in ('operator_tasks','automatic_work') and relnamespace = 'public'::regnamespace`,
    )
    expect(rows).toHaveLength(2)
    // A client must never read K.I.N.D's own exception queue, and the strongest form of
    // that is the client role having no path to the table at all.
    for (const r of rows) expect(r.relrowsecurity, `${r.relname} has RLS off`).toBe(true)
  })

  it('app_migrations_applied gained the ledger columns', async () => {
    const { rows } = await c.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema='public' and table_name='app_migrations_applied'`,
    )
    const cols = rows.map((r) => r.column_name)
    for (const col of ['key', 'applied_at', 'last_outcome', 'last_error', 'last_run_at', 'run_count']) {
      expect(cols).toContain(col)
    }
  })

  // ── THE DEDUPE AUTHORITY ──────────────────────────────────────────────────────

  it('refuses a second OPEN task with the same (kind, dedupe_key)', async () => {
    await c.query(
      `insert into public.operator_tasks(kind, title, dedupe_key)
       values ('provider_credits_exhausted', 'Apollo is out of lead credits', 'global')`,
    )
    await expect(
      c.query(
        `insert into public.operator_tasks(kind, title, dedupe_key)
         values ('provider_credits_exhausted', 'Apollo is out of lead credits', 'global')`,
      ),
    ).rejects.toThrow(/duplicate key value|operator_tasks_one_open_per_key/)
  })

  it('allows the SAME key again once the first is resolved — the condition can recur', async () => {
    // A topped-up account that runs dry again next month is a new event, not a duplicate of
    // one somebody already dealt with.
    await c.query(
      `update public.operator_tasks set status='resolved', resolved_at=now(), resolution_note='topped up'
        where kind='provider_credits_exhausted' and dedupe_key='global' and status='open'`,
    )
    await c.query(
      `insert into public.operator_tasks(kind, title, dedupe_key)
       values ('provider_credits_exhausted', 'Apollo is out of lead credits again', 'global')`,
    )
    const { rows } = await c.query<{ n: string }>(
      `select count(*)::text as n from public.operator_tasks
        where kind='provider_credits_exhausted' and status='open'`,
    )
    expect(Number(rows[0].n)).toBe(1)
  })

  it('a NULL dedupe_key is never deduped — a second prospect reply is not a repeat', async () => {
    for (let i = 0; i < 3; i++) {
      await c.query(`insert into public.operator_tasks(kind, title) values ('hot_reply', 'A prospect replied')`)
    }
    const { rows } = await c.query<{ n: string }>(
      `select count(*)::text as n from public.operator_tasks where kind='hot_reply'`,
    )
    expect(Number(rows[0].n)).toBe(3)
  })

  it('refuses an unknown severity and an unknown status', async () => {
    await expect(
      c.query(`insert into public.operator_tasks(kind, title, severity) values ('api_down','x','catastrophic')`),
    ).rejects.toThrow(/operator_tasks_severity_check|violates check constraint/)
    await expect(
      c.query(`insert into public.operator_tasks(kind, title, status) values ('api_down','x','maybe')`),
    ).rejects.toThrow(/violates check constraint/)
  })

  // ── FD-0: ONE LIVE UNIT PER SUBJECT ───────────────────────────────────────────

  it('refuses a second LIVE unit of automatic work for the same subject', async () => {
    const { clientId, userId } = await createTestClient(c)
    userIds.push(userId)

    await c.query(
      `insert into public.automatic_work(kind, subject_kind, subject_id, client_id, state, bound_seconds)
       values ('proof_run', 'client', $1::text, $1::uuid, 'requested', 600)`,
      [clientId],
    )
    // The double-press, the retried request, the second cron slot. FD-0: recovery must not
    // create concurrent runs.
    await expect(
      c.query(
        `insert into public.automatic_work(kind, subject_kind, subject_id, client_id, state, bound_seconds)
         values ('proof_run', 'client', $1::text, $1::uuid, 'started', 600)`,
        [clientId],
      ),
    ).rejects.toThrow(/duplicate key value|automatic_work_one_live_per_subject/)
  })

  it('allows a NEW unit once the previous one is terminal — that is what recovery IS', async () => {
    const { clientId, userId } = await createTestClient(c)
    userIds.push(userId)

    await c.query(
      `insert into public.automatic_work(kind, subject_kind, subject_id, client_id, state, bound_seconds, failed_at, failure_reason)
       values ('proof_run', 'client', $1::text, $1::uuid, 'failed', 600, now(), 'apollo 402')`,
      [clientId],
    )
    await c.query(
      `insert into public.automatic_work(kind, subject_kind, subject_id, client_id, state, bound_seconds, attempt)
       values ('proof_run', 'client', $1::text, $1::uuid, 'requested', 600, 2)`,
      [clientId],
    )
    const { rows } = await c.query<{ n: string }>(
      `select count(*)::text as n from public.automatic_work where subject_id = $1`,
      [clientId],
    )
    expect(Number(rows[0].n)).toBe(2)
  })

  it('a stuck unit still blocks nothing and is readable as the state FD-0 recovers from', async () => {
    const { clientId, userId } = await createTestClient(c)
    userIds.push(userId)
    await c.query(
      `insert into public.automatic_work(kind, subject_kind, subject_id, client_id, state, bound_seconds, stuck_at)
       values ('programme_prepare', 'programme', $1::text, $1::uuid, 'stuck', 3600, now())`,
      [clientId],
    )
    const { rows } = await c.query<{ state: string }>(
      `select state from public.automatic_work where subject_id = $1`,
      [clientId],
    )
    expect(rows[0].state).toBe('stuck')
  })

  it('refuses a non-positive bound — a zero bound would fire against everything', async () => {
    const { clientId, userId } = await createTestClient(c)
    userIds.push(userId)
    await expect(
      c.query(
        `insert into public.automatic_work(kind, subject_kind, subject_id, state, bound_seconds)
         values ('proof_run', 'client', $1, 'requested', 0)`,
        [clientId],
      ),
    ).rejects.toThrow(/violates check constraint/)
  })

  it('refuses an unknown state', async () => {
    const { clientId, userId } = await createTestClient(c)
    userIds.push(userId)
    await expect(
      c.query(
        `insert into public.automatic_work(kind, subject_kind, subject_id, state, bound_seconds)
         values ('proof_run', 'client', $1, 'probably_fine', 600)`,
        [clientId],
      ),
    ).rejects.toThrow(/violates check constraint/)
  })

  it('a deleted client takes its tasks and its work rows with it', async () => {
    const { clientId, userId } = await createTestClient(c)
    await c.query(`insert into public.operator_tasks(kind, title, client_id) values ('churn_risk','x',$1)`, [clientId])
    await c.query(
      `insert into public.automatic_work(kind, subject_kind, subject_id, client_id, state, bound_seconds)
       values ('brief_promotion','client',$1::text,$1::uuid,'requested',300)`,
      [clientId],
    )
    await dropTestClient(c, userId)
    const t = await c.query<{ n: string }>(`select count(*)::text as n from public.operator_tasks where client_id=$1`, [clientId])
    const w = await c.query<{ n: string }>(`select count(*)::text as n from public.automatic_work where client_id=$1`, [clientId])
    expect(Number(t.rows[0].n)).toBe(0)
    expect(Number(w.rows[0].n)).toBe(0)
  })
})
