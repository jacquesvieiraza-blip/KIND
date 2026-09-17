// ── THE REAL-DATABASE TEST HARNESS (helper) ─────────────────────────────────────
//
// Every `*.realdb.test.ts` file goes through here, and nothing else opens a connection.
// One place to connect means one place that can be audited for the property that matters:
// **a real-DB test can only ever reach the disposable database.**
//
// How that is guaranteed rather than promised:
//   · the URL comes from `REALDB_URL` ONLY. Not `DATABASE_URL`, not `SUPABASE_DB_URL`,
//     not `PG*`. Those are production-shaped names and are never read.
//   · `REALDB_URL` is set by `scripts/realdb.sh`, which creates the cluster itself
//     seconds earlier under `$REALDB_ROOT`.
//   · `assertDisposable()` additionally REFUSES any URL that is not loopback, and refuses
//     a database name that is not the harness's own. A pasted production URL cannot run
//     these tests even if somebody exports it as REALDB_URL by mistake.
//
// If `REALDB_URL` is absent the helper throws with the command to run. It does NOT skip
// silently: a real-DB suite that quietly passes because no database was present is the
// exact failure this harness exists to remove.

import { Client } from 'pg'
import { randomUUID } from 'crypto'

export const REALDB_ENV = 'REALDB_URL'

/** Loopback hosts — the only hosts a disposable harness database can live on. */
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', ''])

export function realdbUrl(): string {
  const url = process.env[REALDB_ENV]
  if (!url) {
    throw new Error(
      `${REALDB_ENV} is not set. Real-database tests need the disposable harness:\n` +
        `    bash scripts/realdb.sh run          # create → test → destroy\n` +
        `    bash scripts/realdb.sh up           # keep it running, then\n` +
        `    REALDB_URL="$(bash scripts/realdb.sh url)" npx vitest run --config vitest.realdb.config.ts`,
    )
  }
  assertDisposable(url)
  return url
}

/**
 * Refuse anything that is not demonstrably the throwaway harness database.
 *
 * Exported and tested directly, because the guarantee is only worth what it refuses:
 * the Batch 1 manifest says "disposable Postgres only, never production", and a
 * guarantee with no red proof is a comment.
 */
export function assertDisposable(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`${REALDB_ENV} is not a URL. Refusing to connect.`)
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new Error(`${REALDB_ENV} must be a postgres:// URL. Refusing to connect.`)
  }
  if (!LOOPBACK.has(parsed.hostname)) {
    throw new Error(
      `🛑 REFUSING TO CONNECT: ${REALDB_ENV} points at host "${parsed.hostname}". ` +
        `Real-database tests run against a disposable loopback cluster only — never a ` +
        `remote or production database.`,
    )
  }
  const db = parsed.pathname.replace(/^\//, '')
  const expected = process.env.REALDB_DB || 'kind_test'
  if (db !== expected) {
    throw new Error(
      `🛑 REFUSING TO CONNECT: ${REALDB_ENV} names database "${db}", not the harness ` +
        `database "${expected}". Set REALDB_DB if the harness was created with a ` +
        `different name.`,
    )
  }
}

/** A connected client against the harness database. Caller closes it. */
export async function realdbClient(): Promise<Client> {
  const client = new Client({ connectionString: realdbUrl() })
  await client.connect()
  return client
}

/** Open a client, run the body, always close — even when the body throws. */
export async function withRealdb<T>(body: (c: Client) => Promise<T>): Promise<T> {
  const client = await realdbClient()
  try {
    return await body(client)
  } finally {
    await client.end()
  }
}

/**
 * What the harness recorded for a migration file, read from the database.
 *
 * ⚠️ This reads HARNESS state, not product state. The product's own runner
 * (`apps/api/src/lib/pending-migrations.ts`) keeps no applied-state record at all — it
 * replays every key on every run. A test using this is proving "the harness applied this
 * file", which is exactly what a real-DB test needs to know before asserting on a schema
 * object. It is NOT evidence about production.
 */
export async function migrationOutcome(c: Client, filename: string): Promise<string | null> {
  const r = await c.query<{ outcome: string }>(
    'select outcome from harness.applied_migrations where filename = $1',
    [filename],
  )
  return r.rows[0]?.outcome ?? null
}

/**
 * A client row owned by one test, with its auth user.
 *
 * Isolation is by identity, not by transaction: the things these tests prove (partial
 * unique indexes, RPC compare-and-set, check constraints) are proven by two *committed*
 * writes racing, so a rollback-everything wrapper would remove the very behaviour under
 * test. Each test therefore gets its own client id and cleans up after itself.
 */
export async function createTestClient(
  c: Client,
  opts: { companyName?: string } = {},
): Promise<{ clientId: string; userId: string; email: string }> {
  const userId = randomUUID()
  const email = `realdb-${userId}@example.invalid`
  await c.query('insert into auth.users(id, email) values ($1, $2)', [userId, email])
  const r = await c.query<{ id: string }>(
    `insert into public.clients(user_id, company_name, country)
     values ($1, $2, 'South Africa') returning id`,
    [userId, opts.companyName ?? `Realdb Harness ${userId.slice(0, 8)}`],
  )
  return { clientId: r.rows[0].id, userId, email }
}

/** Remove a test's client row. `auth.users` cascades into `public.clients`. */
export async function dropTestClient(c: Client, userId: string): Promise<void> {
  await c.query('delete from auth.users where id = $1', [userId])
}
