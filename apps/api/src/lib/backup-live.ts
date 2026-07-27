// #298 — TAKE THE MANIFEST FROM THE LIVE DATABASE.
//
// The comparison logic lives in `backup-manifest.ts` (pure, tested). This goes and counts.
//
// Uses node-postgres for the same reason `rls-live.ts` and `pending-migrations.ts` do: this
// needs `pg_catalog` and a real `COUNT(*)` per table, and PostgREST — which is what the
// Supabase JS client speaks — will not give you either.

import type { Manifest, TableCount } from './backup-manifest'

export async function readLiveTableCounts(): Promise<Manifest> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set on this service — add it in Railway → @kind/api → Variables.')

  // A ref typo is always a typo, never a valid setup — say so before attempting a connection
  // that can only fail with a DNS-shaped error naming a tenant instead of the mistake.
  {
    const { refMismatch } = await import('./db-connection')
    const mismatch = refMismatch(url, process.env.SUPABASE_URL)
    if (mismatch) throw new Error(mismatch)
  }
  const { Client } = await import('pg')
  const { connectionCandidates, safeHost, isUnreachableError } = await import('./db-connection')
  const candidates = connectionCandidates(url, process.env.SUPABASE_URL, null)

  let working: string | null = null
  let lastError: unknown = null
  for (const candidate of candidates) {
    const probe = new Client({ connectionString: candidate, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
    try {
      await probe.connect(); working = candidate; await probe.end().catch(() => {}); break
    } catch (e) {
      lastError = e; await probe.end().catch(() => {})
      if (!isUnreachableError(e)) break
    }
  }
  if (!working) {
    throw new Error(`Could not reach the database: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
  }

  const client = new Client({ connectionString: working, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 20000 })
  try {
    await client.connect()

    const tables = await client.query<{ tablename: string }>(`
      SELECT c.relname AS tablename
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    `)

    // A REAL COUNT(*), not the planner's `reltuples`.
    //
    // reltuples is an estimate refreshed by ANALYZE, and it can be wrong by thousands on a
    // table that has just been bulk-loaded — which is EXACTLY the situation a restore drill
    // is in. An estimate would make a broken restore look fine, which is the one outcome
    // this whole exercise exists to prevent. Slower, and correct.
    const counts: TableCount[] = []
    for (const t of tables.rows) {
      const r = await client.query<{ n: string }>(`SELECT count(*)::text AS n FROM public.${quoteIdent(t.tablename)}`)
      counts.push({ table: t.tablename, rows: Number(r.rows[0]?.n ?? 0) })
    }

    return {
      takenAt: new Date().toISOString(),
      host: safeHost(working),
      tables: counts,
      totalRows: counts.reduce((a, b) => a + b.rows, 0),
      totalTables: counts.length,
    }
  } finally {
    await client.end().catch(() => {})
  }
}

/**
 * Quote an identifier for interpolation.
 *
 * The table names come from `pg_catalog`, so they are not user input — but a COUNT(*) is
 * built by string concatenation and there is no parameter form for an identifier, so this
 * doubles any embedded quote rather than trusting the source. Cheap, and it means the
 * function stays safe if it is ever called with a name from somewhere else.
 */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}
