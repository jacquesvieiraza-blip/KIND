// #298 — THE BACKUP-RESTORE DRILL. THE PART THAT CAN ACTUALLY BE BUILT TODAY.
//
// The item: *"Supabase backs up, but a restore has never been tested."* Correct, and it is
// the right thing to worry about — an untested restore is a belief, not a backup.
//
// ── WHY THIS IS A MANIFEST AND NOT A RESTORE SCRIPT ──────────────────────────────────────
//
// A real restore drill is: take a backup → restore it somewhere → prove the result matches.
// The founder cannot do the middle step. **Supabase's dashboard is unreachable** — login is
// GitHub OAuth and the account is flagged ("cannot authorize a third party application") —
// so there is no way to browse backups, trigger a point-in-time restore, or create the
// second project you would restore INTO. There is also no psql, no pg_dump and, by standing
// decision, no new local tooling.
//
// Writing a confident runbook full of dashboard clicks he cannot perform would be exactly
// the class of document this project keeps catching: something that reads as done and
// cannot be executed. So this file builds the piece that is both possible and genuinely
// missing.
//
// ── WHAT IS ACTUALLY MISSING, EVEN IF THE DASHBOARD WORKED ───────────────────────────────
//
// **Nobody knows what "restored correctly" would look like.** A restore drill without a
// prior manifest proves nothing: you press restore, the dashboard says success, and you
// have no way to tell whether you got everything, half of it, or last week's copy. The
// comparison is the drill. The button is not.
//
// So: a MANIFEST — every table and its exact row count at a moment in time, taken from
// pg_catalog rather than from a list somebody maintained. Take one now, take another after
// any restore, compare. That comparison is the only thing that ever proves a restore worked,
// and it is missing today whether or not the dashboard opens tomorrow.
//
// ── AND WHY IT HOLDS NO DATA ─────────────────────────────────────────────────────────────
//
// Deliberately counts only. An endpoint that dumps every row would be a single URL that
// exfiltrates the entire customer database — including `client_inboxes`, which #554b just
// found sitting with no row-level security at all. Adding that surface in the same week
// would be indefensible. Counts prove completeness without ever moving a personal detail.

export type TableCount = { table: string; rows: number }

export type Manifest = {
  takenAt: string
  host: string
  tables: TableCount[]
  totalRows: number
  totalTables: number
}

export type Difference = {
  table: string
  /** Rows in the reference manifest (before). */
  before: number
  /** Rows in the comparison manifest (after the restore). */
  after: number
  kind: 'missing_table' | 'extra_table' | 'row_mismatch'
}

export type Comparison = {
  differences: Difference[]
  matched: number
  /** True only when every table and every count agrees. */
  identical: boolean
  verdict: string
}

/**
 * Compare a manifest taken before with one taken after.
 *
 * DELIBERATELY EXACT. No tolerance, no "close enough" — a restore that lands 99% of a
 * `credit_transactions` table has lost somebody's money, and a percentage would hide it.
 * If rows legitimately changed between the two snapshots, that is a reason to retake the
 * manifest, not a reason to soften the check.
 */
export function compareManifests(before: Manifest, after: Manifest): Comparison {
  const beforeMap = new Map(before.tables.map(t => [t.table, t.rows]))
  const afterMap = new Map(after.tables.map(t => [t.table, t.rows]))
  const differences: Difference[] = []
  let matched = 0

  for (const [table, rows] of beforeMap) {
    if (!afterMap.has(table)) {
      // The worst outcome, and the one a spot-check would miss entirely.
      differences.push({ table, before: rows, after: 0, kind: 'missing_table' })
    } else if (afterMap.get(table) !== rows) {
      differences.push({ table, before: rows, after: afterMap.get(table)!, kind: 'row_mismatch' })
    } else {
      matched++
    }
  }
  for (const [table, rows] of afterMap) {
    // Not a failure in itself — a table created after the reference snapshot shows up here —
    // but it must be SEEN rather than silently ignored.
    if (!beforeMap.has(table)) differences.push({ table, before: 0, after: rows, kind: 'extra_table' })
  }

  const identical = differences.length === 0
  return {
    differences,
    matched,
    identical,
    verdict: identical
      ? `Identical — ${matched} table(s), every row count matches. The restore is proven, not assumed.`
      : `${differences.length} difference(s) across ${beforeMap.size} table(s). A restore is NOT proven; read every line below before trusting this database.`,
  }
}

/**
 * Tables whose loss would end the business, as opposed to being an inconvenience.
 *
 * Used to sort the comparison so the money and the people come first. A drill that reports
 * ninety tables in alphabetical order buries `credit_transactions` between `contact_requests`
 * and `cron_claims`.
 */
export const CRITICAL_TABLES = [
  'clients', 'credit_transactions', 'leads', 'subscriptions', 'client_inboxes',
  'icps', 'figsy_campaigns', 'figsy_enrollments', 'figsy_sent_emails', 'opt_out_blocklist',
] as const

export function criticalFirst(diffs: Difference[]): Difference[] {
  const rank = (t: string) => {
    const i = (CRITICAL_TABLES as readonly string[]).indexOf(t)
    return i === -1 ? CRITICAL_TABLES.length : i
  }
  return [...diffs].sort((a, b) => rank(a.table) - rank(b.table) || a.table.localeCompare(b.table))
}

/**
 * Is this manifest recent enough to be the reference for a restore?
 *
 * A manifest taken months ago describes a database that no longer existed by the time the
 * incident happened, so comparing against it produces differences that mean nothing and
 * hides the ones that do.
 */
export const MANIFEST_STALE_DAYS = 30

export function manifestAge(takenAt: string, now: Date): { days: number; stale: boolean; note: string } {
  const days = (now.getTime() - new Date(takenAt).getTime()) / 864e5
  const stale = days > MANIFEST_STALE_DAYS
  return {
    days: Math.round(days * 10) / 10,
    stale,
    note: stale
      ? `This manifest is ${Math.round(days)} days old. It describes a database that has moved on, so a comparison against it will show differences that mean nothing and hide the ones that do. Take a fresh one.`
      : `Taken ${Math.round(days)} day(s) ago.`,
  }
}
