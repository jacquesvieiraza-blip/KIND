// ── THE HARNESS SMOKE TEST (§8.2-H) ─────────────────────────────────────────────
//
// Proves the two things the harness exists to make provable, and nothing else:
//
//   ① A MIGRATION ACTUALLY APPLIED. Not "a mock said so" — the file is recorded in
//      `harness.applied_migrations` AND the schema object it creates is present in
//      `pg_indexes` / `information_schema`.
//
//   ② A COMPARE-AND-SET REFUSES A SECOND CLAIM. `claim_proof_authority` is guarded by
//      three PARTIAL UNIQUE INDEXES on `proof_pass_claims`. A mocked `supabase-js` cannot
//      refuse a second insert; only the index can. This is therefore the smallest thing
//      that is unprovable in the 3,900-test unit suite and provable here.
//
// It also proves the harness REFUSES a database that is not disposable — a guard with no
// red proof is a comment.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Client } from 'pg'
import {
  realdbClient,
  migrationOutcome,
  createTestClient,
  dropTestClient,
  assertDisposable,
  REALDB_ENV,
} from './harness'

describe('§8.2-H · the real-database harness', () => {
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

  // ── ① MIGRATIONS APPLIED ──────────────────────────────────────────────────────

  it('applied supabase/migrations/20260912_proof_pass_claims.sql', async () => {
    expect(await migrationOutcome(c, '20260912_proof_pass_claims.sql')).toBe('applied')
  })

  it('created the three partial unique indexes that ARE the proof authority', async () => {
    const { rows } = await c.query<{ indexname: string; indexdef: string }>(
      `select indexname, indexdef from pg_indexes
       where schemaname = 'public' and tablename = 'proof_pass_claims'`,
    )
    const names = rows.map((r) => r.indexname)
    expect(names).toContain('proof_pass_claims_one_open')
    expect(names).toContain('proof_pass_claims_one_completed_automatic')
    expect(names).toContain('proof_pass_claims_one_completed_restart')
    // A unique index that is not actually UNIQUE, or not actually PARTIAL, enforces
    // nothing. Both words are asserted, because both are the mechanism.
    for (const n of [
      'proof_pass_claims_one_open',
      'proof_pass_claims_one_completed_automatic',
      'proof_pass_claims_one_completed_restart',
    ]) {
      const def = rows.find((r) => r.indexname === n)!.indexdef
      expect(def).toMatch(/CREATE UNIQUE INDEX/)
      expect(def).toMatch(/WHERE/)
    }
  })

  it('recorded an outcome for every migration file, with no undeclared failure', async () => {
    const { rows } = await c.query<{ outcome: string; count: string }>(
      `select outcome, count(*)::text as count from harness.applied_migrations group by outcome`,
    )
    const by = Object.fromEntries(rows.map((r) => [r.outcome, Number(r.count)]))
    expect(by.applied ?? 0).toBeGreaterThan(150)
    // `failed` rows exist only for files declared KNOWN_BROKEN in scripts/realdb.sh.
    // Anything else already failed the harness before the tests ran.
    expect(by.failed ?? 0).toBeLessThanOrEqual(1)
  })

  // ── ② THE CAS REFUSES A SECOND CLAIM ──────────────────────────────────────────

  it('claim_proof_authority grants automatic_1 once and refuses a second open claim', async () => {
    const { clientId, userId } = await createTestClient(c)
    userIds.push(userId)

    const first = await c.query<{ claim_proof_authority: any }>(
      'select claim_proof_authority($1::uuid) as claim_proof_authority',
      [clientId],
    )
    const granted = first.rows[0].claim_proof_authority
    expect(granted.ok).toBe(true)
    expect(granted.authority).toBe('automatic_1')
    expect(granted.pass).toBe(1)

    // The second press. In production this is a double-click, a retried request, or two
    // cron slots racing. It must not produce a second entitlement — and the reason must
    // be `in_flight`, not a new grant and not a silent success.
    const second = await c.query<{ claim_proof_authority: any }>(
      'select claim_proof_authority($1::uuid) as claim_proof_authority',
      [clientId],
    )
    expect(second.rows[0].claim_proof_authority.ok).toBe(false)
    expect(second.rows[0].claim_proof_authority.reason).toBe('in_flight')
    expect(second.rows[0].claim_proof_authority.claim_id).toBe(granted.claim_id)

    const count = await c.query<{ n: string }>(
      `select count(*)::text as n from public.proof_pass_claims where client_id = $1`,
      [clientId],
    )
    expect(Number(count.rows[0].n)).toBe(1)
  })

  it('the partial unique index itself refuses a second open row, RPC or not', async () => {
    const { clientId, userId } = await createTestClient(c)
    userIds.push(userId)

    await c.query(
      `insert into public.proof_pass_claims(client_id, authority, status)
       values ($1, 'automatic_1', 'open')`,
      [clientId],
    )

    // Straight past the RPC, as a rogue writer or a future refactor would. The database
    // must still refuse. THIS is the assertion no mock can make.
    await expect(
      c.query(
        `insert into public.proof_pass_claims(client_id, authority, status)
         values ($1, 'automatic_2', 'open')`,
        [clientId],
      ),
    ).rejects.toThrow(/duplicate key value|proof_pass_claims_one_open/)
  })

  // ── THE HARNESS'S OWN TEETH ───────────────────────────────────────────────────

  it('refuses a non-loopback database URL', () => {
    expect(() => assertDisposable('postgresql://u:p@db.example.com:5432/kind_test')).toThrow(
      /REFUSING TO CONNECT/,
    )
  })

  it('refuses a loopback URL naming a database other than the harness database', () => {
    expect(() => assertDisposable('postgresql://postgres@127.0.0.1:55432/postgres')).toThrow(
      /REFUSING TO CONNECT/,
    )
  })

  it('accepts only the harness shape', () => {
    expect(() => assertDisposable('postgresql://postgres@127.0.0.1:55432/kind_test')).not.toThrow()
    expect(() => assertDisposable('not-a-url')).toThrow(new RegExp(`${REALDB_ENV} is not a URL`))
  })
})
