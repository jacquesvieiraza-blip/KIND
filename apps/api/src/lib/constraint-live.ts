// READ A CHECK CONSTRAINT'S ACTUAL DEFINITION OUT OF PRODUCTION.
//
// ── THE OWED FIX ─────────────────────────────────────────────────────────────────────────
//
// The ledger integrity row asked *"does the live ledger accept the wallet transaction types
// the money model writes?"* and answered it by looking for a row of that type. No rows yet →
// *"we CANNOT tell … run migration 20260726_wallet_tx_types before the first real payment."*
//
// The founder had already run it. It appears in his applied list, and he has now run the
// migrations several times. So the honesty screen was telling him to do something he had
// done — which is the same family as everything else caught this week: **a check reporting
// on evidence it does not have, in a way that reads as an instruction.** Worse than silence,
// because a false instruction that is repeatedly ignored teaches you to ignore the screen.
//
// The reason it could not tell is that it was asking the wrong thing. *"Has a row of this
// type ever been written"* is a question about HISTORY. *"Will the constraint accept this
// type"* is a question about the SCHEMA, and Postgres will simply answer it — the constraint
// definition is right there in `pg_constraint`.
//
// So ask that instead. No rows required, no inference, and it works before the first payment
// rather than only after one has already succeeded or failed.
//
// Uses node-postgres for the same reason `rls-live.ts` and `backup-live.ts` do: `pg_catalog`
// is not reachable through PostgREST, which is what the Supabase JS client speaks.

/** The definition text of a named constraint, or null when it does not exist. */
export async function readConstraintDef(conname: string): Promise<string | null> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set on this service.')

  // A ref typo is always a typo, never a valid setup — say so before attempting a connection
  // that can only fail with a DNS-shaped error naming a tenant instead of the mistake.
  {
    const { refMismatch } = await import('./db-connection')
    const mismatch = refMismatch(url, process.env.SUPABASE_URL)
    if (mismatch) throw new Error(mismatch)
  }
  const { Client } = await import('pg')
  const { connectionCandidates, isUnreachableError } = await import('./db-connection')
  const candidates = connectionCandidates(url, process.env.SUPABASE_URL, null)

  let working: string | null = null
  let lastError: unknown = null
  for (const candidate of candidates) {
    const probe = new Client({ connectionString: candidate, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
    try { await probe.connect(); working = candidate; await probe.end().catch(() => {}); break }
    catch (e) { lastError = e; await probe.end().catch(() => {}); if (!isUnreachableError(e)) break }
  }
  if (!working) throw new Error(`Could not reach the database: ${lastError instanceof Error ? lastError.message : String(lastError)}`)

  const client = new Client({ connectionString: working, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 })
  try {
    await client.connect()
    // pg_get_constraintdef renders the constraint as Postgres itself would print it, so the
    // answer is the database's own words rather than our reconstruction of them.
    const r = await client.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1 LIMIT 1`,
      [conname],
    )
    return r.rows[0]?.def ?? null
  } finally {
    await client.end().catch(() => {})
  }
}

/**
 * Which of `wanted` the constraint definition permits.
 *
 * Pure, so the parsing is testable without a database. Matches each value as a quoted literal
 * inside the definition — `check (type = ANY (ARRAY['purchase'::text, 'wallet_topup'::text …]))`
 * is how Postgres renders an IN list, so a bare substring search would also match a value
 * that merely appears inside a longer one. `wallet_charge` contains no other value as a
 * substring today, but `purchase` IS a substring of `credit_purchase`, so the quoting matters.
 */
export function permittedValues(def: string | null, wanted: readonly string[]): {
  allowed: string[]; missing: string[]
} {
  if (!def) return { allowed: [], missing: [...wanted] }
  const allowed: string[] = []
  const missing: string[] = []
  for (const v of wanted) {
    // Match 'value' as a complete quoted literal, optionally with a ::text cast after it.
    if (new RegExp(`'${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`).test(def)) allowed.push(v)
    else missing.push(v)
  }
  return { allowed, missing }
}
