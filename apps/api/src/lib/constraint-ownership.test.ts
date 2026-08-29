// ═══════════════════════════════════════════════════════════════════════════════════════
// ONE CONSTRAINT, ONE OWNER — the guard for the R3 deploy blocker.
//
// WHAT HAPPENED (29 Aug). `20260727_pdl_cursor` and `20260826_run_outcome_failed` BOTH
// dropped and re-added `icp_run_outcomes_status_check`. `PENDING_MIGRATIONS` executes in
// ARRAY ORDER, not date order, and pdl_cursor sits at #15 while run_outcome_failed sits at
// #2 — so the OLDER file ran LAST and re-asserted the NARROWER five-value definition over
// the newer six-value one. Production holds `status = 'failed'` rows (routes/icps.ts writes
// one at the crash boundary), so `add constraint` validated them, failed, and took the whole
// migration down with it on every deploy.
//
// 🛑 THE LOUD FAILURE WAS THE LUCKY ONE. The runner passes each migration as ONE
// multi-statement string, which Postgres wraps in an implicit transaction — so the failure
// rolled back and the six-value constraint survived. In any database that happens to hold no
// `failed` row (fresh, staging, pruned table) the same statement SUCCEEDS and narrows the
// constraint to five. After that every crashed run's `recordRunOutcome(..., 'failed', ...)`
// is rejected by the database, supabase-js returns `{ error }` rather than throwing, nothing
// is logged, and the proof desk spins on "Finding your matches now…" forever. #342's failure
// mode, and precisely the R72 lie `20260826_run_outcome_failed` was written to prevent.
//
// So the invariant is asserted structurally: a constraint NAME may be declared by exactly ONE
// migration, and the one that owns this constraint must cover every status the code can write.
//
// ⚠️ THIS FILE STRIPS SQL COMMENTS ITSELF, AND THAT IS NOT OPTIONAL. `stripCommentsForEnvScan`
// strips JS/TS comments only — run it over a `.sql` file and it returns the input unchanged
// (measured). Every prose paragraph above and in the migrations names these constraints, so a
// scanner that reads raw text finds "ownership" in commentary and passes on a repo that is
// actually broken. That mistake has already been made five times in this repo.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const REPO = join(__dirname, '../../../..')
const MIGRATIONS_DIR = join(REPO, 'supabase/migrations')
const RUNNER_PATH = join(REPO, 'apps/api/src/lib/pending-migrations.ts')

const OWNED = 'icp_run_outcomes_status_check'
/** The migration that is allowed to declare it. Changing this is a product decision. */
const OWNER = '20260826_run_outcome_failed'

/**
 * Remove SQL `--` line comments, `/* *​/` block comments and TS `//` line comments.
 *
 * The `(?<!:)` on `//` keeps `https://…` inside a comment or string from truncating a line at
 * the scheme separator, which silently ate the rest of the statement in the first cut.
 */
function stripSqlComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(line => {
      const dash = line.indexOf('--')
      const slash = line.search(/(?<!:)\/\//)
      const cut = [dash, slash].filter(i => i >= 0).sort((a, b) => a - b)[0]
      return cut === undefined ? line : line.slice(0, cut)
    })
    .join('\n')
}

const ADD_CONSTRAINT = /add\s+constraint\s+"?([a-zA-Z0-9_]+)"?/gi

/** Every `add constraint <name>` in one blob of SQL, comments already removed. */
function constraintNamesIn(sql: string): string[] {
  return [...stripSqlComments(sql).matchAll(ADD_CONSTRAINT)].map(m => m[1])
}

/** Canonical `.sql` files, keyed by migration key (the filename without `.sql`). */
function canonicalSources(): Map<string, string> {
  const out = new Map<string, string>()
  for (const f of readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'))) {
    out.set(f.replace(/\.sql$/, ''), readFileSync(join(MIGRATIONS_DIR, f), 'utf8'))
  }
  return out
}

/** Runner entries, keyed by `key:`, in ARRAY ORDER — which is EXECUTION order. */
function runnerEntries(): { key: string; sql: string }[] {
  const src = readFileSync(RUNNER_PATH, 'utf8')
  return src.split(/key:\s*'/).slice(1).map(chunk => ({
    key: chunk.slice(0, chunk.indexOf("'")),
    sql: chunk,
  }))
}

// ── QUARANTINE ─────────────────────────────────────────────────────────────────────────
//
// ⚠️ TWO PRE-EXISTING DUPLICATES, FOUND BY THIS GUARD ON THE DAY IT WAS WRITTEN. They are
// REPORTED, NOT FIXED — R3's contract is the pdl_cursor constraint and nothing else, and
// silently rewriting four more migrations under cover of this PR is exactly the opportunistic
// cleanup the operating protocol forbids. Both were checked before being listed here:
//
//   credit_transactions_type_check — declared by FOUR canonical files, but only ONE
//     (20260726_wallet_tx_types, entry #5) is in the runner. The other three never execute,
//     so there is no ordering hazard. File-level history duplication only.
//
//   partner_commissions_type_check — declared by TWO runner entries: #22
//     (20260815_client_partner_seat, 2 values) and #29 (20260819_lead_sale_commission,
//     3 values). The WIDER one runs LAST, so the end state is correct — the opposite order
//     to pdl_cursor, and safe only by accident of array position. If production holds any
//     `commission_type = 'lead_sale'` row, entry #22 already fails and rolls back on every
//     deploy exactly as pdl_cursor did. That is a REPORTED OPEN FINDING, not a closed one.
//
// 🛑 THIS LIST MAY NOT GROW. Adding a name here to make a red build green re-opens the exact
// hole R3 closed. A NEW duplicate is a defect to fix, never an entry to append.
const QUARANTINED_PRE_EXISTING = new Set([
  'credit_transactions_type_check',
  'partner_commissions_type_check',
])

describe('the sweep is not vacuous', () => {
  it('there are migrations and runner entries to scan', () => {
    expect(canonicalSources().size).toBeGreaterThan(100)
    expect(runnerEntries().length).toBeGreaterThan(0)
  })

  it('the scanner actually finds real ADD CONSTRAINT statements', () => {
    // Without this, a regex that matched nothing would report "no duplicates" forever —
    // including on the day one is introduced.
    const all = [...canonicalSources().values()].flatMap(constraintNamesIn)
    expect(all.length).toBeGreaterThan(10)
    expect(all).toContain(OWNED)
  })

  it('the comment stripper removes SQL prose, so commentary cannot be read as a statement', () => {
    // ⚠️ THE LOAD-BEARING PROOF. Both migrations and this very file discuss these constraints
    // in prose. A scanner reading raw text finds ownership in a paragraph and passes on a
    // broken repo — the failure that has recurred five times here.
    expect(constraintNamesIn('-- add constraint fake_one check (x)')).toEqual([])
    expect(constraintNamesIn('// add constraint fake_two check (x)')).toEqual([])
    expect(constraintNamesIn('/* add constraint fake_three */')).toEqual([])
    // and it does NOT eat a real statement that merely sits near a comment
    expect(constraintNamesIn('-- prose\nalter table t add constraint real_one check (x);')).toEqual(['real_one'])
    // a URL inside a comment must not truncate the following real statement's line
    expect(constraintNamesIn('alter table t add constraint real_two check (x); -- see https://a//b')).toEqual(['real_two'])
  })
})

describe('ONE CONSTRAINT, ONE OWNER — icp_run_outcomes_status_check', () => {
  it('exactly ONE canonical migration declares it, and it is the owner', () => {
    const owners = [...canonicalSources()]
      .filter(([, sql]) => constraintNamesIn(sql).includes(OWNED))
      .map(([key]) => key)
    expect(
      owners,
      `${OWNED} must be declared by exactly one migration. Found: ${owners.join(', ')}. ` +
      `The runner executes in ARRAY order, not date order, so a second declaration means the ` +
      `later ARRAY position wins — which is how the older five-value pdl_cursor definition came ` +
      `to overwrite the newer six-value one and break the deploy.`,
    ).toEqual([OWNER])
  })

  it('exactly ONE runner entry declares it, and it is the owner', () => {
    const owners = runnerEntries()
      .filter(e => constraintNamesIn(e.sql).includes(OWNED))
      .map(e => e.key)
    expect(owners, `runner entries declaring ${OWNED}: ${owners.join(', ')}`).toEqual([OWNER])
  })

  it('pdl_cursor does NOT touch this constraint — not in the file, not in the runner', () => {
    // Named explicitly rather than left to the counting above, so the failure message points
    // at the exact file somebody just "restored".
    const file = canonicalSources().get('20260727_pdl_cursor')!
    expect(
      constraintNamesIn(file),
      'the constraint block is back in 20260727_pdl_cursor.sql — read the header of that file before restoring it',
    ).not.toContain(OWNED)

    const entry = runnerEntries().find(e => e.key === '20260727_pdl_cursor')!
    expect(constraintNamesIn(entry.sql)).not.toContain(OWNED)
  })
})

/** The `check (... in ('a','b'))` value list for a named constraint, from one SQL blob. */
function checkValuesFor(sql: string, constraint: string): string[] {
  const clean = stripSqlComments(sql)
  const at = clean.search(new RegExp(`add\\s+constraint\\s+"?${constraint}\\b`, 'i'))
  if (at < 0) return []
  const stmt = clean.slice(at, clean.indexOf(';', at))
  return [...stmt.matchAll(/'([a-z_]+)'/gi)].map(m => m[1])
}

describe('THE OWNING DEFINITION COVERS EVERY STATUS THE CODE CAN WRITE', () => {
  /** The RunStatus union, read from the type — never a hand-typed copy of it. */
  function declaredRunStatuses(): string[] {
    const src = readFileSync(join(__dirname, 'run-outcome.ts'), 'utf8')
    const m = src.match(/export type RunStatus\s*=\s*([^\n]+)/)
    expect(m, 'the RunStatus union could not be parsed from run-outcome.ts').toBeTruthy()
    return [...m![1].matchAll(/'([a-z_]+)'/g)].map(x => x[1])
  }

  it('the union parses to the statuses we expect (the sweep is not vacuous)', () => {
    const s = declaredRunStatuses()
    expect(s.length).toBeGreaterThanOrEqual(6)
    expect(s).toContain('served')
  })

  it('EVERY RunStatus is permitted by the constraint — add one to the type and this fails', () => {
    // ⚠️ DERIVED FROM THE TYPE, NOT A SECOND HAND-TYPED LIST. A seventh status added to the
    // union without widening the constraint would otherwise ship, and the database would
    // silently reject every row carrying it — supabase-js returns `{ error }`, it does not throw.
    const file = canonicalSources().get(OWNER)!
    const permitted = checkValuesFor(file, OWNED)
    for (const status of declaredRunStatuses()) {
      expect(
        permitted,
        `RunStatus '${status}' is written by the code but REJECTED by ${OWNED}. ` +
        `Widen the check in ${OWNER} — do not re-declare the constraint elsewhere.`,
      ).toContain(status)
    }
  })

  it('the runner copy permits exactly the same set as the canonical file', () => {
    const fileVals = checkValuesFor(canonicalSources().get(OWNER)!, OWNED)
    const runnerVals = checkValuesFor(runnerEntries().find(e => e.key === OWNER)!.sql, OWNED)
    expect(runnerVals.sort()).toEqual(fileVals.sort())
  })

  it("'failed' and 'audience_exhausted' cannot regress out of the definition", () => {
    // Named individually because each was added to fix a specific lie told to a client:
    // `failed` so a crash is never recorded as no_match (R72), `audience_exhausted` so a
    // finished audience is never reported as narrow targeting (#366). Losing either is
    // invisible until a prospect is told the wrong thing.
    const permitted = checkValuesFor(canonicalSources().get(OWNER)!, OWNED)
    expect(permitted, "'failed' lost — a crashed run would be rejected by the database (R72)").toContain('failed')
    expect(permitted, "'audience_exhausted' lost — #366's honest end-of-audience state").toContain('audience_exhausted')
  })
})

describe('PDL_CURSOR STILL OWNS ITS THREE COLUMNS', () => {
  // The R3 fix removed a constraint block from this migration. It must NOT have taken the
  // columns with it — those are the entire reason the migration exists, and production's
  // scroll paging reads them.
  const COLUMNS = ['pdl_scroll_token', 'pdl_scroll_query', 'pdl_exhausted_at']

  it('all three ADD COLUMN statements survive in the canonical file', () => {
    const sql = stripSqlComments(canonicalSources().get('20260727_pdl_cursor')!)
    for (const col of COLUMNS) {
      expect(sql, `20260727_pdl_cursor.sql lost ${col} — #366 paging reads it`).toMatch(
        new RegExp(`add\\s+column\\s+if\\s+not\\s+exists\\s+${col}\\b`, 'i'),
      )
    }
  })

  it('and in the runner entry — SCOPED TO THAT ENTRY, not the whole file', () => {
    // ⚠️ THE OLD TEST'S WEAKNESS. `pdl-cursor.test.ts` asserted these strings against the
    // WHOLE of pending-migrations.ts, so a column name surviving in any other entry — or in a
    // comment — kept it green. Scoped to the entry, it means what it says.
    const entry = runnerEntries().find(e => e.key === '20260727_pdl_cursor')
    expect(entry, 'the 20260727_pdl_cursor runner entry has been removed').toBeTruthy()
    const sql = stripSqlComments(entry!.sql)
    for (const col of COLUMNS) {
      expect(sql, `the pdl_cursor runner entry lost ${col}`).toMatch(
        new RegExp(`ADD COLUMN IF NOT EXISTS ${col}\\b`, 'i'),
      )
    }
  })
})

describe('REPO-WIDE: NO CONSTRAINT NAME HAS TWO OWNERS', () => {
  /** constraint name → the set of migration keys that declare it. */
  function ownership(): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>()
    const record = (name: string, key: string) => {
      if (!map.has(name)) map.set(name, new Set())
      map.get(name)!.add(key)
    }
    // Canonical file and runner entry for the SAME migration are two homes for one migration,
    // so both are recorded under the same key and never count as a duplicate.
    for (const [key, sql] of canonicalSources()) for (const n of constraintNamesIn(sql)) record(n, key)
    for (const e of runnerEntries()) for (const n of constraintNamesIn(e.sql)) record(n, e.key)
    return map
  }

  it('the map is populated (the sweep is not vacuous)', () => {
    expect(ownership().size).toBeGreaterThan(10)
  })

  it('THE GUARD CATCHES THE EXACT HISTORICAL DEFECT — proved against reconstructed sources', () => {
    // ⚠️ RED PROOF FOR THE DETECTOR ITSELF, run against the pre-fix shape rather than trusting
    // that a checker which currently sees nothing would see something. Two migrations, each
    // declaring the same constraint, is precisely the 27 Jul / 26 Aug pair.
    const pre = new Map<string, string>([
      ['20260727_pdl_cursor', `alter table public.icp_run_outcomes
         add constraint ${OWNED} check (status in ('served','no_match'));`],
      [OWNER, `alter table public.icp_run_outcomes
         add constraint ${OWNED} check (status in ('served','no_match','failed'));`],
    ])
    const seen = new Map<string, Set<string>>()
    for (const [key, sql] of pre) {
      for (const n of constraintNamesIn(sql)) {
        if (!seen.has(n)) seen.set(n, new Set())
        seen.get(n)!.add(key)
      }
    }
    expect(seen.get(OWNED)!.size, 'the duplicate detector failed to see the defect it exists for').toBe(2)

    // ...and the same input with the pdl_cursor block removed is clean — so it is the
    // duplication being detected, not merely the presence of two migrations.
    const post = new Map([...pre].map(([k, v]) => [k, k === '20260727_pdl_cursor' ? 'alter table public.icps add column if not exists pdl_scroll_token text;' : v]))
    const after = new Set([...post.values()].flatMap(constraintNamesIn).filter(n => n === OWNED))
    expect(after.size).toBe(1)
  })

  it('no NEW constraint name is declared by more than one migration', () => {
    const offenders = [...ownership()]
      .filter(([name, keys]) => keys.size > 1 && !QUARANTINED_PRE_EXISTING.has(name))
      .map(([name, keys]) => `${name} ← ${[...keys].join(', ')}`)
    expect(
      offenders,
      `A constraint name is declared by more than one migration:\n  ${offenders.join('\n  ')}\n` +
      `PENDING_MIGRATIONS runs in ARRAY order, not date order, so the later ARRAY position wins ` +
      `and the earlier one fails against any row the loser's definition forbids. Delete the ` +
      `duplicate declaration and widen the OWNER instead. Do NOT add the name to ` +
      `QUARANTINED_PRE_EXISTING — that list is a record of two known-open findings, not a bypass.`,
    ).toEqual([])
  })

  it('the quarantine list is still justified — every entry is genuinely duplicated', () => {
    // If a quarantined duplicate is ever fixed, this fails and the name must leave the list,
    // so the quarantine cannot rot into a permanent exemption for a problem that no longer exists.
    const own = ownership()
    for (const name of QUARANTINED_PRE_EXISTING) {
      expect(
        own.get(name)?.size ?? 0,
        `${name} is no longer duplicated — remove it from QUARANTINED_PRE_EXISTING`,
      ).toBeGreaterThan(1)
    }
  })
})
