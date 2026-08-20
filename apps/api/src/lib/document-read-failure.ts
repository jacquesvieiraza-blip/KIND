// ── TURN A DATABASE ERROR INTO THE SENTENCE THAT NAMES THE FIX ─────────────────────────────
//
// ⚠️ WRITTEN AFTER A REAL WALK COST FOUR ROUND-TRIPS. The founder merged #678, deployed, saw the
// migration count read 28, and opened the governed-documents screen. It said *"Could not read
// the governed documents"* — the same sentence for a missing table, a dead API and a network
// blip. The one fact that mattered was that the migration was QUEUED, not applied, and nothing
// on the screen said so. He opened the raw endpoint, then Engine, then pressed Run migrations.
// Four exchanges for a one-button fix.
//
// A message that cannot distinguish *"press this button"* from *"something is broken"* sends
// somebody hunting in the wrong place — the same defect as #620's bare "3 skipped".
//
// PURE AND DB-FREE, for the same reason `pecr.ts` and `country-coverage.ts` are: the sentence an
// operator reads is provable without a database, and its test must not need Supabase env vars.
// It lives here rather than inside `routes/operator.ts` so the test can call the REAL function
// instead of reconstructing it — a reconstructed mapper proves the reconstruction, not the code.

export type DocumentFailure = { error: string; detail?: string }

/**
 * Map a read/write failure to what the operator should DO about it.
 *
 * ⚠️ THE RAW REASON IS SAFE TO SHOW AND IS SHOWN. This console is operator-only behind the
 * founder email allowlist (R36); withholding a Postgres message from the one person who can act
 * on it protects nobody and costs a round-trip every time.
 */
export function documentReadFailure(err: unknown): DocumentFailure {
  const code = (err as { code?: string })?.code
  const message = err instanceof Error ? err.message : String(err)

  // 42P01 = relation does not exist (Postgres). PGRST205 = PostgREST cannot see it in its schema
  // cache, which is what a table that was never created looks like through Supabase's API layer.
  // The message test catches the same conditions arriving without a code, which they do when the
  // failure is re-thrown or wrapped.
  const missing = code === '42P01' || code === 'PGRST205' ||
    /does not exist|schema cache/i.test(message)

  return missing
    ? {
        error: 'The governed_documents table does not exist yet — open Engine and press Run migrations, then come back.',
        detail: message,
      }
    // ⚠️ NOT EVERYTHING IS A MISSING TABLE. Telling everyone to run migrations forever is the
    // same disease pointing the other way: a confident wrong instruction stops you looking.
    : { error: 'Could not read the governed documents', detail: message }
}
