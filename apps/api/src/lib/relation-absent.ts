// ══════════════════════════════════════════════════════════════════════════════════════════
// C-9 · "THE TABLE IS NOT THERE" — THROUGH BOTH SEAMS, AND THROUGH NEITHER MORE
//
// ── THE DEFECT, AND WHY IT WAS INVISIBLE UNTIL A REAL POSTGREST RAN ─────────────────────
//
// On this repo CODE SHIPS BEFORE THE MIGRATION IS RUN, every time: `main` is live, and
// migrations are applied by hand from Vida afterwards. So there is ALWAYS a window where a
// new table does not exist, and XC-3 requires the code to tolerate that window **loudly** —
// report "the migration has not been run", never look like an empty result.
//
// Batch 1 implemented exactly that, checking PostgreSQL's `42P01 undefined_table`. And
// `42P01` is correct — for a `pg` client. But the product does not read tables with `pg`; it
// reads them with `supabase-js`, over HTTP, through **PostgREST**. PostgREST does not forward
// the PostgreSQL code for a missing relation: it resolves the table name against its own
// schema cache BEFORE any SQL is planned, and answers its own code — **`PGRST205`**, with a
// message of the shape *"Could not find the table 'public.x' in the schema cache"*.
//
// So every one of those absence branches was unreachable in production. The tolerance existed,
// was tested, was green, and could not fire on the seam it was written for. Only booting real
// PostgREST in the full-stack harness showed it.
//
// ── WHY BOTH CODES, AND WHY EXACTLY TWO ─────────────────────────────────────────────────
//
// `42P01` is NOT legacy and is not being replaced. Three live paths still produce it:
//   · the migration runner (`pending-migrations.ts`) connects with raw `pg`;
//   · `*.realdb.test.ts` talk to PostgreSQL directly;
//   · and PostgREST itself answers `42P01` when its schema cache is STALE — the table is gone
//     from the database but still in the cache, so the query is planned and Postgres refuses
//     it. That case is exactly what the real-PostgREST proof of this predicate reproduces.
//
// 🛑 AND NOTHING ELSE QUALIFIES. This predicate answers ONE question — "is the relation
// absent?" — and the founder's approval was explicit that it must not become a broad error
// swallow. In particular:
//   · `42703` undefined_column — a missing COLUMN is a DIFFERENT fact with its own handling
//     (`isLedgerColumnMissing`, the EXPAND/CONTRACT window). Conflating them would report a
//     half-migrated table as a missing one and send somebody to run a migration that has
//     already run.
//   · `PGRST200` (a relationship not found), `PGRST201` (an ambiguous relationship) and
//     `PGRST204` (a column not found) are real PostgREST codes about EMBEDDINGS and COLUMNS,
//     not about a table's existence. A predicate that accepted them would turn a mis-written
//     query into "run the migration".
// ══════════════════════════════════════════════════════════════════════════════════════════

/** PostgreSQL `undefined_table` — raw `pg`, or PostgREST with a stale schema cache. */
export const PG_UNDEFINED_TABLE = '42P01'

/** PostgREST's own "not in the schema cache" — what `supabase-js` actually receives. */
export const PGRST_UNDEFINED_TABLE = 'PGRST205'

/**
 * The two codes that mean "the relation is not there", and no others.
 *
 * ⚠️ EXPORTED AS A SET so a test can assert its exact membership. A predicate whose accepted
 * set is only visible by reading its body is a predicate that widens quietly.
 */
export const RELATION_ABSENT_CODES: ReadonlySet<string> = new Set([
  PG_UNDEFINED_TABLE,
  PGRST_UNDEFINED_TABLE,
])

/** The error shapes this has to cope with: a `pg` error, a supabase-js error, or neither. */
type MaybeCoded = { code?: unknown } | null | undefined

/** The code, wherever the client chose to put it — `''` when there isn't one. */
export const relationErrorCode = (e: unknown): string =>
  typeof (e as MaybeCoded)?.code === 'string' ? String((e as { code: string }).code) : ''

/**
 * Is this error "the relation does not exist", from either seam?
 *
 * ⚠️ CODE ONLY — the message is deliberately not consulted here. Each call site keeps its own
 * table-name message check alongside this predicate, because a message pattern is about ONE
 * table and this function is about ANY. Folding the patterns in would make a missing
 * `operator_tasks` and a missing `app_migrations_applied` indistinguishable to callers that
 * need to say which one, and it would let a message mentioning a table satisfy the test
 * without a code at all.
 */
export function isRelationAbsent(e: unknown): boolean {
  return RELATION_ABSENT_CODES.has(relationErrorCode(e))
}
