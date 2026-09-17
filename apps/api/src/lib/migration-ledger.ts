// ═══════════════════════════════════════════════════════════════════════════════════════
// XC-3 · WHAT HAS THE DATABASE ACTUALLY HAD APPLIED TO IT?
//
// ── THE DEFECT ──────────────────────────────────────────────────────────────────────────
//
// `runPendingMigrations` replays EVERY key in `PENDING_MIGRATIONS` on every run and records
// nothing. So the only thing Vida could ever show was **the transcript of the last replay** —
// not state. Three consequences, all of them real:
//
//   ① "HAS THIS MIGRATION RUN?" WAS UNANSWERABLE. The only way to find out was to hunt for
//      the object the migration was supposed to create — and a migration whose table already
//      existed for another reason was indistinguishable from one that had run. This exact
//      confusion created `app_migrations_applied` in the first place: `20260724_one_wallet.sql`
//      has an `EXCEPTION WHEN undefined_table` handler that wrote a row into a table it then
//      created as a side effect.
//   ② A FAILURE WAS FORGOTTEN THE MOMENT THE SCREEN WAS CLOSED. The results array lives in
//      one HTTP response. Nothing persisted which key failed or why, so "did that error ever
//      get fixed?" had no answer at all.
//   ③ AND THE REPLAY IS SLOW ENOUGH TO TIME OUT. 74 keys × one fresh connection each is
//      minutes; the admin proxy's bound is 45s. The operator saw "API unreachable" while the
//      run was still going perfectly, and had NO way to see how far it had got.
//
// This module is the state half. The runner writes a row per key as it goes (so ③ becomes
// observable progress rather than an unknown), and the read below answers ① and ② from the
// DATABASE rather than from a replay.
//
// ── THE TWO ABSENCES THIS HAS TO SURVIVE ────────────────────────────────────────────────
//
// 🛑 supabase-js RETURNS `{data: null, error}` FOR A MISSING TABLE OR COLUMN, and the
// repository's standing defect class is `const { data } = await …` reading that as EMPTY. A
// ledger that reports "nothing has ever been applied" because its own table is missing is
// worse than no ledger: it invites somebody to re-run 74 migrations against a database that
// already has them. So:
//
//   · MISSING TABLE  → `ok: false`, `tableMissing: true`, and the sentence names the migration
//                      that creates it. NEVER an empty list.
//   · MISSING COLUMNS → the four XC-3 columns are EXPAND-only and may genuinely not be there
//                      yet. The read falls back to the two original columns and says so, so
//                      the page shows first-applied truth instead of failing whole.
// ═══════════════════════════════════════════════════════════════════════════════════════

// ⚠️ `@kind/db` IS IMPORTED DYNAMICALLY, INSIDE THE ONE FUNCTION THAT READS. Its client
// throws at module scope without `SUPABASE_URL`, and the WRITE half of this module takes the
// caller's own pg connection and needs no Supabase at all — so a static import would make the
// pure, provable half unusable from the real-database harness, which connects to postgres
// directly and has no Supabase project.

// C-9: one predicate for "the relation is not there", across both the pg and PostgREST seams.
//
// ⚠️ THIS ONE **IS** A STATIC IMPORT, unlike `@kind/db` above, and deliberately: it is pure —
// it reads a property off an error object and touches no client — so it cannot break the
// write half's usability from the real-database harness, which is the whole reason `@kind/db`
// is dynamic here.
import { isRelationAbsent } from './relation-absent'

/** The migration that creates the ledger's own columns. Named in every absence message. */
export const LEDGER_MIGRATION = '20260917_operator_tasks_and_automatic_work'

/**
 * What the database says about one migration key.
 *
 * ⚠️ `never_run` IS ONLY EVER SAID WHEN THE LEDGER WAS READ. A key absent from a ledger that
 * could not be read is `unknown`, and the difference is the whole point of this module.
 */
export type MigrationKeyState = 'applied' | 'failed' | 'never_run' | 'unknown'

export interface MigrationLedgerRow {
  key: string
  /** Present in `PENDING_MIGRATIONS` — i.e. the runner can apply it. */
  known: boolean
  state: MigrationKeyState
  /** First success. Never moves once set. */
  appliedAt: string | null
  /** The most recent attempt — which may have failed after an earlier success. */
  lastRunAt: string | null
  lastOutcome: string | null
  lastError: string | null
  runCount: number | null
}

export interface MigrationLedgerState {
  ok: boolean
  rows: MigrationLedgerRow[]
  /** The ledger table does not exist. `rows` is then EMPTY BECAUSE UNKNOWN, not because none. */
  tableMissing: boolean
  /** The four XC-3 columns are not there yet, so only first-applied could be read. */
  columnsMissing: boolean
  /** One sentence for the operator. Always populated when `ok` is false. */
  note: string | null
}

const BASE_COLUMNS = 'key, applied_at'
const FULL_COLUMNS = 'key, applied_at, last_outcome, last_error, last_run_at, run_count'

type RawRow = {
  key?: unknown
  applied_at?: unknown
  last_outcome?: unknown
  last_error?: unknown
  last_run_at?: unknown
  run_count?: unknown
}

const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)

/** A postgres error code, wherever supabase-js chose to put it. */
const codeOf = (e: unknown): string =>
  typeof (e as { code?: unknown } | null)?.code === 'string' ? String((e as { code: string }).code) : ''

/**
 * The table itself is not there.
 *
 * ⛓️ C-9 (17 Sep) — was `codeOf(e) === '42P01'`. That is right for the migration RUNNER, which
 * connects with raw `pg`, and wrong for every read the product makes through `supabase-js`,
 * where PostgREST answers `PGRST205` from its schema cache without ever planning the SQL.
 * `isRelationAbsent` accepts both codes, which is exactly the point: this ledger is written by
 * the `pg` path and read by the PostgREST path, so it is the one module that genuinely sees
 * BOTH and would have been half-blind whichever single code it had picked.
 */
export const isLedgerTableMissing = (e: unknown): boolean =>
  isRelationAbsent(e) || /relation .*app_migrations_applied.* does not exist/i.test(
    String((e as { message?: unknown } | null)?.message ?? ''),
  )

/** 42703 undefined_column. The EXPAND columns are not there yet. */
export const isLedgerColumnMissing = (e: unknown): boolean =>
  codeOf(e) === '42703' || /column .*(last_outcome|last_error|last_run_at|run_count).* does not exist/i.test(
    String((e as { message?: unknown } | null)?.message ?? ''),
  )

/**
 * Decide one key's state from its ledger row.
 *
 * ⚠️ A ROW WITH NO OUTCOME COLUMNS IS `applied`, NOT `unknown`. The two original columns mean
 * exactly one thing — this key succeeded once — and refusing to say so because the newer
 * columns are missing would hide the only fact the old ledger ever recorded.
 */
export function stateFor(row: RawRow | undefined, ledgerRead: boolean): MigrationKeyState {
  if (!ledgerRead) return 'unknown'
  if (!row) return 'never_run'
  const outcome = str(row.last_outcome)
  if (outcome === 'error') return 'failed'
  if (outcome === 'ok') return 'applied'
  // No outcome recorded: fall back to the original meaning of a present row.
  return str(row.applied_at) ? 'applied' : 'never_run'
}

/**
 * Read the ledger, then answer for every key the runner knows about.
 *
 * ⚠️ KEYS THE RUNNER DOES NOT KNOW ARE STILL LISTED, marked `known: false`. A ledger row for a
 * key that has since been removed from `PENDING_MIGRATIONS` is a real historical fact and
 * dropping it would make the page disagree with the database.
 */
export async function readMigrationLedger(): Promise<MigrationLedgerState> {
  const { db } = await import('@kind/db')
  const { PENDING_MIGRATIONS } = await import('./pending-migrations')
  const runnerKeys = PENDING_MIGRATIONS.map((m) => m.key)

  let raw: RawRow[] = []
  let columnsMissing = false

  let res = await db.from('app_migrations_applied').select(FULL_COLUMNS)
  if (res.error && isLedgerColumnMissing(res.error)) {
    // ⚠️ EXPAND ORDER TOLERANCE, LOUDLY. This code can deploy before its migration runs, and
    // the whole point of an expand/contract discipline is that neither order breaks.
    columnsMissing = true
    res = await db.from('app_migrations_applied').select(BASE_COLUMNS)
  }

  if (res.error) {
    const tableMissing = isLedgerTableMissing(res.error)
    return {
      ok: false,
      rows: runnerKeys.map((key) => ({
        key, known: true, state: 'unknown' as const,
        appliedAt: null, lastRunAt: null, lastOutcome: null, lastError: null, runCount: null,
      })),
      tableMissing,
      columnsMissing,
      note: tableMissing
        ? `The app_migrations_applied table does not exist, so what has been applied is NOT KNOWN — this is not an empty ledger. Run ${LEDGER_MIGRATION} (it creates the table where it is missing and adds the outcome columns where it is not).`
        : `The applied-migration ledger could not be read (${String((res.error as { message?: unknown }).message ?? 'unknown error')}), so every state below is UNKNOWN rather than "never run".`,
    }
  }

  raw = (res.data ?? []) as RawRow[]
  const byKey = new Map<string, RawRow>()
  for (const r of raw) {
    const k = str(r.key)
    if (k) byKey.set(k, r)
  }

  const row = (key: string, known: boolean): MigrationLedgerRow => {
    const r = byKey.get(key)
    return {
      key,
      known,
      state: stateFor(r, true),
      appliedAt: str(r?.applied_at),
      lastRunAt: str(r?.last_run_at),
      lastOutcome: str(r?.last_outcome),
      lastError: str(r?.last_error),
      runCount: typeof r?.run_count === 'number' ? r.run_count : null,
    }
  }

  const known = new Set(runnerKeys)
  const rows = [
    ...runnerKeys.map((k) => row(k, true)),
    ...[...byKey.keys()].filter((k) => !known.has(k)).sort().map((k) => row(k, false)),
  ]

  return {
    ok: true,
    rows,
    tableMissing: false,
    columnsMissing,
    note: columnsMissing
      ? `The ledger's outcome columns are not there yet, so each key below shows only whether it has EVER succeeded — not how the last run went. Run ${LEDGER_MIGRATION} to record outcomes.`
      : null,
  }
}

/**
 * Minimal pg surface, so this module never has to import `pg` types.
 *
 * ⚠️ THE RUNNER'S OWN CONNECTION IS REUSED ON PURPOSE. It has already proved it can reach the
 * database and it is the only connection whose success or failure is being recorded — opening
 * a second one would let the ledger say "applied" from a connection the migration never used.
 */
export interface LedgerWriter {
  query(sql: string, values?: unknown[]): Promise<unknown>
}

export interface LedgerWriteResult {
  recorded: boolean
  /** Why it was not recorded. A run that applied but could not be recorded must SAY so. */
  reason?: string
}

/**
 * Record one migration's outcome.
 *
 * ⚠️ `applied_at` IS THE FIRST SUCCESS AND MUST NOT MOVE. `ON CONFLICT … DO UPDATE` therefore
 * never touches it; `last_run_at` is the column that describes the latest attempt. Conflating
 * the two would make "when did this go in?" unanswerable after any later re-run.
 *
 * ⚠️ AND A FAILED MIGRATION STILL GETS A ROW. Recording only successes is what left a failure
 * invisible the moment the screen was closed — but a first attempt that FAILED must not claim
 * an `applied_at`, so the insert leaves it NULL for an error and the state reads `failed`.
 */
export async function recordMigrationOutcome(
  client: LedgerWriter,
  key: string,
  ok: boolean,
  error?: string,
): Promise<LedgerWriteResult> {
  // The error text is the database's own, and it can echo a connection string or a value from
  // a statement. It lands in a table an operator console renders, so it is bounded and the
  // obvious secret shapes are removed before it is stored.
  const detail = ok
    ? null
    : (error ?? 'no message')
        .replace(/postgres(?:ql)?:\/\/[^\s]*/gi, '[redacted-connection-string]')
        .replace(/\b(?=[A-Za-z0-9_-]{20,}\b)(?=[A-Za-z0-9_-]*[a-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]+\b/g, '[redacted]')
        .slice(0, 2000)

  try {
    await client.query(
      `insert into public.app_migrations_applied (key, applied_at, last_outcome, last_error, last_run_at, run_count)
       values ($1, case when $2 then now() else null end, case when $2 then 'ok' else 'error' end, $3, now(), 1)
       on conflict (key) do update set
         last_outcome = excluded.last_outcome,
         last_error   = excluded.last_error,
         last_run_at  = excluded.last_run_at,
         run_count    = coalesce(public.app_migrations_applied.run_count, 0) + 1,
         applied_at   = coalesce(public.app_migrations_applied.applied_at, excluded.applied_at)`,
      [key, ok, detail],
    )
    return { recorded: true }
  } catch (e) {
    const code = codeOf(e)
    const message = e instanceof Error ? e.message : String(e)
    // 🛑 NEVER THROWN. A ledger write failing must not fail a migration that applied — but it
    // must not be silent either, which is why the reason travels back to the response.
    // ⛓️ C-9 — both seams. The runner writes with raw `pg` (42P01), but this same catch is
    // reached through supabase-js on other paths, where the code is PGRST205.
    if (isRelationAbsent(e)) return { recorded: false, reason: `the app_migrations_applied table does not exist (run ${LEDGER_MIGRATION})` }
    if (code === '42703') return { recorded: false, reason: `the ledger's outcome columns do not exist yet (run ${LEDGER_MIGRATION})` }
    // 🛑 23502 not_null_violation — FOUND AGAINST A REAL POSTGRES, NOT BY READING. The original
    // `applied_at` is `NOT NULL DEFAULT now()`, because under the old ledger a row's mere
    // EXISTENCE meant "applied". A FAILURE record must not claim an application, so it proposes
    // NULL — and PostgreSQL checks NOT NULL on the proposed tuple before `ON CONFLICT` resolves
    // it. So on a database where the widening has not run, successes record and FAILURES DO
    // NOT, which is precisely backwards: the failure is the thing the ledger was added for.
    // Said out loud rather than worked around, because the workaround would be writing an
    // `applied_at` for a migration that did not apply.
    if (code === '23502') return { recorded: false, reason: `a FAILED outcome cannot be stored while app_migrations_applied.applied_at is still NOT NULL — successes are recorded, failures are not (run ${LEDGER_MIGRATION}, which drops that constraint)` }
    return { recorded: false, reason: message.slice(0, 300) }
  }
}
