// #554 — READ THE POLICIES OUT OF THE LIVE DATABASE.
//
// The classification lives in `rls-audit.ts` (pure, tested). This is the part that goes and
// asks production what its policies actually ARE, rather than what the repo believes.
//
// That distinction is the whole point of the item. This repo has THREE migration directories
// (`supabase/migrations/`, `packages/db/src/migrations/`, `apps/api/src/migrations/`) plus
// two whole-schema snapshots that disagree with each other, and #558 is the standing finding
// that none of them describes the live database. A security audit that reports what a file
// says is worth nothing.
//
// Uses node-postgres for the same reason `pending-migrations.ts` does: `pg_policies` is a
// system catalog and PostgREST — which is what the Supabase JS client speaks — will not
// serve it. Read-only: two SELECTs against pg_catalog, nothing else.

import type { PolicyRow, TableState } from './rls-audit'

export type LiveRlsRead = {
  states: TableState[]
  host: string
  usedFallback: boolean
}

export async function readLiveRls(passwordOverride?: string | null): Promise<LiveRlsRead> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set on this service — add it in Railway → @kind/api → Variables.')

  const { Client } = await import('pg')
  const { connectionCandidates, safeHost, isUnreachableError, isAuthError } = await import('./db-connection')
  const candidates = connectionCandidates(url, process.env.SUPABASE_URL, passwordOverride)

  let working: string | null = null
  let lastError: unknown = null
  let attempted = 0
  let sawAuthFailure = false
  for (const candidate of candidates) {
    attempted++
    const probe = new Client({ connectionString: candidate, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
    try {
      await probe.connect()
      working = candidate
      await probe.end().catch(() => {})
      break
    } catch (e) {
      lastError = e
      await probe.end().catch(() => {})
      if (!isUnreachableError(e)) { sawAuthFailure = isAuthError(e); break }
    }
  }

  if (!working) {
    const msg = lastError instanceof Error ? lastError.message : String(lastError)
    throw new Error(
      sawAuthFailure
        ? `The database answered and REJECTED the credentials — a password problem, not a routing one. Tried ${attempted} address(es); last error: ${msg}.`
        : `Could not reach the database. Tried ${attempted} of ${candidates.length} address(es); last error: ${msg}. DATABASE_URL likely needs to be the SESSION POOLER string.`,
    )
  }

  const client = new Client({ connectionString: working, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
  try {
    await client.connect()

    // Every base table in `public`, and whether RLS is switched on for it. Read this FIRST
    // and independently of the policies: a table with RLS OFF is the most dangerous state
    // there is, and it has no rows in pg_policies to give it away.
    const tables = await client.query<{ tablename: string; rlsenabled: boolean }>(`
      SELECT c.relname AS tablename, c.relrowsecurity AS rlsenabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    `)

    // `roles` comes back as name[]. Postgres stores {public} when the policy was written
    // with no TO clause — which is exactly the case that leaks, so it must not be lost.
    const policies = await client.query<PolicyRow>(`
      SELECT tablename, policyname, permissive,
             COALESCE(roles::text[], ARRAY[]::text[]) AS roles,
             cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `)

    const byTable = new Map<string, PolicyRow[]>()
    for (const p of policies.rows) {
      const list = byTable.get(p.tablename) ?? []
      list.push(p)
      byTable.set(p.tablename, list)
    }

    return {
      states: tables.rows.map(t => ({
        tablename: t.tablename,
        rlsEnabled: t.rlsenabled,
        policies: byTable.get(t.tablename) ?? [],
      })),
      host: safeHost(working),
      usedFallback: working !== url,
    }
  } finally {
    await client.end().catch(() => {})
  }
}
