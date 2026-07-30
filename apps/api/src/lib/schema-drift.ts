// SCHEMA DRIFT — what the repo can PROVE about the database, and what it cannot (#558).
//
// ── THE CONSTRAINT THAT SHAPES THIS WHOLE FILE ───────────────────────────────────────────
//
// **We cannot look at production.** The Supabase dashboard is unreachable (the flagged
// GitHub account) and `DATABASE_URL` is mangled, so there is no introspection to fall back
// on. Anything claiming to describe the live database right now would be a guess wearing a
// verdict's clothes — and #558 exists precisely because that has already happened.
//
// So this derives what the REPO can prove, and marks everything else **UNKNOWABLE**. That
// third verdict is not a hedge; it is the honest answer for most of the interesting rows,
// and writing "agree" where the truth is "we cannot tell" is the failure this repo has spent
// the week removing (#565, #576, the sending panel's NOT-MEASURED).
//
// ── WHAT THE REPO ACTUALLY CONTAINS ──────────────────────────────────────────────────────
//
// **126 migration files in THREE directories, and one runner that applies 12 of them.**
// `supabase/migrations` (94) · `apps/api/src/migrations` (19) · `packages/db/src/migrations`
// (13). There is no `supabase/config.toml`, so the Supabase CLI was never the mechanism.
// The only thing in the product that applies SQL is `PENDING_MIGRATIONS`, and everything
// else was pasted into a SQL editor by hand — in an unrecorded order, at unrecorded times,
// with no record of which ones took. **That is the drift.** It is not that a column is
// wrong; it is that nothing in the repo knows what ran.
//
// Plus THREE schema snapshots that all claim to be the schema: `packages/db/src/schema.sql`
// (344 lines), `supabase/staging-schema.sql` (1,487) and `supabase/MASTER_SCHEMA.sql` (481,
// "Last updated: 2026-05-27").
//
// The parsing here is deliberately shallow and deliberately conservative: it reads
// `CREATE TABLE` and `ALTER TABLE … ADD COLUMN`, which is enough to answer "does this table
// have this column anywhere in the repo's history?" and nothing more. A fuller SQL parser
// would produce a more precise answer to a question we still could not verify.

import { stripCommentsForEnvScan } from './env-inventory'

export type Derived = Map<string, Set<string>>

const normalise = (t: string) => t.replace(/^public\./i, '').replace(/["`]/g, '').trim().toLowerCase()

/** Strip SQL comments so a column named inside a `--` explanation is not read as a column. */
export function stripSqlComments(sql: string): string {
  let out = ''
  let quote: string | null = null
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]
    if (quote) {
      out += c
      if (c === quote) quote = null
      continue
    }
    if (c === "'" || c === '"') { quote = c; out += c; continue }
    if (c === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      out += '\n'
      continue
    }
    if (c === '/' && sql[i + 1] === '*') {
      i += 2
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++
      i++
      continue
    }
    out += c
  }
  return out
}

/**
 * Columns declared in a `CREATE TABLE` body.
 *
 * Table-level constraints (`primary key (a,b)`, `unique (…)`, `constraint … check (…)`,
 * `foreign key …`) are NOT columns, and counting them would invent column names like
 * `primary` — which then look like drift when a snapshot does not have them.
 */
const CONSTRAINT_START = /^(primary\s+key|unique|constraint|check|foreign\s+key|exclude|like|partition)\b/i

function columnsFromBody(body: string): string[] {
  const cols: string[] = []
  let depth = 0
  let current = ''
  for (const ch of body) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    // Only split on commas at the TOP level — `numeric(10,2)` and `check (x in (1,2))`
    // both contain commas that are not column boundaries.
    if (ch === ',' && depth === 0) { cols.push(current); current = ''; continue }
    current += ch
  }
  cols.push(current)

  return cols
    .map(c => c.trim())
    .filter(Boolean)
    .filter(c => !CONSTRAINT_START.test(c))
    .map(c => normalise(c.split(/\s+/)[0]))
    .filter(c => /^[a-z_][a-z0-9_]*$/.test(c))
}

/** Every table → column the SQL creates or adds. Order-independent by design: see below. */
export function deriveFromSql(sql: string, into: Derived = new Map()): Derived {
  const src = stripSqlComments(sql)
  const add = (table: string, col: string) => {
    const t = normalise(table)
    if (!into.has(t)) into.set(t, new Set())
    into.get(t)!.add(normalise(col))
  }

  // CREATE TABLE … ( … ) — matched by walking parens rather than a regex, because a body
  // containing `check (type in ('a','b'))` defeats any non-greedy `\((.*?)\)`.
  const createRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."`]+)\s*\(/gi
  let m: RegExpExecArray | null
  while ((m = createRe.exec(src)) !== null) {
    let depth = 1
    let i = createRe.lastIndex
    const start = i
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === '(') depth++
      else if (src[i] === ')') depth--
    }
    for (const col of columnsFromBody(src.slice(start, i - 1))) add(m[1], col)
  }

  // ALTER TABLE … ADD COLUMN [IF NOT EXISTS] name — one statement may add several.
  const alterRe = /alter\s+table\s+(?:if\s+exists\s+)?([a-z0-9_."`]+)([\s\S]*?);/gi
  while ((m = alterRe.exec(src)) !== null) {
    const colRe = /add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)/gi
    let c: RegExpExecArray | null
    while ((c = colRe.exec(m[2])) !== null) add(m[1], c[1])
  }

  return into
}

/**
 * Fold many files into one derived schema.
 *
 * ⚠️ ORDER IS ACCEPTED AS AN ARGUMENT AND THEN LARGELY IGNORED, and that is the honest
 * choice rather than a shortcut. A migration folder is only a schema if you know the order
 * they ran in — and nobody does here, because 114 of the 126 were pasted into a SQL editor
 * by hand. So this answers the weaker question it can actually answer: **"does the repo
 * contain a statement that would give this table this column?"** A `DROP COLUMN` later in
 * an unknown order could make that false in production, which is exactly why every verdict
 * that depends on ordering comes out UNKNOWABLE.
 */
export function deriveSchema(files: { name: string; sql: string }[]): Derived {
  const out: Derived = new Map()
  for (const f of files) deriveFromSql(f.sql, out)
  return out
}

/**
 * Columns the CODE writes: `.from('table').insert({ a, b })` / `.update({ c })`.
 *
 * This is the half that matters most, because **a column the code writes and the database
 * lacks is a runtime error on a real request** — a 400 from PostgREST, usually inside a
 * money path, usually swallowed (#349). It is also the half no schema file can settle.
 *
 * ⚠️ IT SEES 296 OF THE REPO'S 346 WRITE CALLS, AND THE GAP IS STATED RATHER THAN GLOSSED.
 * Only an INLINE object literal is readable — `insert({ a, b })`. The other **50 pass a
 * variable** (`insert(rows)`, `insert(accepted.map(toLeadRow))`), and the column names live
 * in a builder function this cannot follow without a type checker. `leads` alone has 12 such
 * calls, **including #599's CSV import**, whose `source` column was found here only because
 * a SECOND, inline writer (`lib/vida.ts:187`) happens to set it too.
 *
 * So a clean result from this function means **"no undeclared column among the writes I can
 * read"**, never "no undeclared columns". That is why every unknowable row in
 * `docs/SCHEMA-DRIFT.md` still ends at a query for the founder to run: the scan narrows the
 * question, it does not close it.
 */
export function extractCodeWrites(source: string): Map<string, Set<string>> {
  // ⚠️ COMMENTS FIRST, and this file was caught by it too — the fifth time in this repo.
  // The sentence directly above ("`.from('table').insert({ a, b })`") made the first version
  // report a TABLE CALLED `table` with columns `a` and `b`. Harmless here, but it is the same
  // machinery that decides whether a column is undeclared, and a scanner that reads prose as
  // code will eventually read prose as a finding. Reuses the regex-aware stripper from #561.
  const src = stripCommentsForEnvScan(source)
  const out = new Map<string, Set<string>>()
  const re = /\.from\(\s*['"]([a-z_][a-z0-9_]*)['"]\s*\)\s*\.\s*(insert|update|upsert)\s*\(\s*\{/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const table = m[1].toLowerCase()
    // Walk the object literal by brace depth. Regex cannot do this: an inserted row often
    // carries a nested object (`detail: { … }`) or a template string with braces in it.
    let depth = 1
    let i = re.lastIndex
    const start = i
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}') depth--
    }
    const body = src.slice(start, i - 1)

    if (!out.has(table)) out.set(table, new Set())
    // TOP-LEVEL KEYS ONLY, walked by depth rather than by line.
    //
    // The first version split on newlines and read a key per line, which is fine for the
    // multi-line inserts most of this codebase writes — and SILENTLY UNDER-READS a one-line
    // `insert({ a: 1, nested: { x }, b: 3 })`, returning only `a`. Under-reading is the
    // dangerous direction here: a column this misses is a column that cannot be reported as
    // undeclared, so the table comes back "agree" on incomplete evidence. Quote- and
    // depth-aware, so `detail: { … }`, arrays and template strings are all skipped whole.
    let d = 0
    let quote: string | null = null
    let word = ''
    for (let j = 0; j < body.length; j++) {
      const ch = body[j]
      if (quote) {
        if (ch === '\\') { j++; continue }
        if (ch === quote) quote = null
        continue
      }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; word = ''; continue }
      if (ch === '{' || ch === '[' || ch === '(') { d++; word = ''; continue }
      if (ch === '}' || ch === ']' || ch === ')') { d = Math.max(0, d - 1); word = ''; continue }
      if (d === 0 && ch === ':' && /^[a-z_][a-z0-9_]*$/i.test(word)) { out.get(table)!.add(word.toLowerCase()); word = ''; continue }
      if (/[A-Za-z0-9_]/.test(ch)) word += ch
      else word = ''
      // `...spread` — the keys are not visible here, so nothing is claimed about them.
    }
  }
  return out
}

export type Verdict = 'agree' | 'drift' | 'unknowable'

export type TableFinding = {
  table: string
  /** Columns the repo's migrations create or add. */
  migrations: string[]
  /** Columns a schema snapshot declares. */
  snapshot: string[]
  /** Columns the code writes. */
  code: string[]
  /** In the code, in no migration and no snapshot — the runtime-error shape. */
  codeOnly: string[]
  /** In migrations, missing from the snapshot the repo ships — the snapshot is stale. */
  missingFromSnapshot: string[]
  verdict: Verdict
  why: string
}

/**
 * Judge one table.
 *
 * The three verdicts, and the rule for each:
 *
 *   • **DRIFT** — the repo contradicts itself, provably, with no production access needed.
 *     A snapshot missing a column its own migrations add is drift you can fix today.
 *   • **UNKNOWABLE** — the code writes a column nothing in the repo declares. It may exist
 *     in production (added by hand, in the SQL editor, during the months that dashboard was
 *     reachable) or it may not, and **the difference is a live 400 on a real request.**
 *     Marking these "drift" would be as wrong as marking them "agree": we cannot tell.
 *   • **AGREE** — every column the code writes is declared somewhere the repo can point to,
 *     and the snapshot matches its own migrations.
 */
export function judgeTable(a: {
  table: string
  migrations: Set<string>
  snapshot: Set<string>
  code: Set<string>
}): TableFinding {
  const mig = [...a.migrations].sort()
  const snap = [...a.snapshot].sort()
  const code = [...a.code].sort()

  const declared = new Set([...a.migrations, ...a.snapshot])
  const codeOnly = code.filter(c => !declared.has(c))
  // Only meaningful when the repo ships a snapshot for this table at all — an absent
  // snapshot is a different (and much smaller) problem than a wrong one.
  const missingFromSnapshot = a.snapshot.size > 0 ? mig.filter(c => !a.snapshot.has(c)) : []

  let verdict: Verdict = 'agree'
  let why = 'Every column the code writes is declared in the repo, and the snapshot matches its own migrations.'

  if (codeOnly.length > 0) {
    verdict = 'unknowable'
    why = `The code writes ${codeOnly.length} column(s) no migration or snapshot in the repo declares (${codeOnly.join(', ')}). Either production has them from a hand-applied change, or these writes are failing right now — and without prod access the repo cannot tell which.`
  } else if (missingFromSnapshot.length > 0) {
    verdict = 'drift'
    why = `The repo's own migrations add ${missingFromSnapshot.length} column(s) the shipped snapshot does not declare (${missingFromSnapshot.join(', ')}). This is provable from the repo alone — the snapshot is stale.`
  }

  return { table: a.table, migrations: mig, snapshot: snap, code, codeOnly, missingFromSnapshot, verdict, why }
}
