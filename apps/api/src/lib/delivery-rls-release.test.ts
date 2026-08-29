// ═══════════════════════════════════════════════════════════════════════════════════════
// `20260829_delivery_rls` IS RELEASED — and this file is what the hold turned into.
//
// ⛓️ THIS REPLACES `delivery-rls-held.test.ts`, WHICH ASSERTED THE OPPOSITE. That guard's job
// was to fail the build if a runner entry ever appeared, because Vida applies ALL pending
// migrations in one action and this one changes what a signed-in BROWSER can read on five live
// tables while R2 — a runtime question no test in this repo can answer — was still open.
//
// R2 IS CLOSED. The founder read all five policy names off `pg_policies` in production
// immediately before the entry was added, which was always the release condition. So the guard
// inverts rather than disappears: what needed protecting was never "no entry exists", it was
// "this migration does exactly what its review said and nothing more".
//
// 🛑 WHY THE INVARIANTS BELOW ARE THE ONES THAT MATTER. A DROP naming a policy that does not
// exist is a SILENT NO-OP. The CREATE that follows then ADDS beside whatever was already there,
// and because PostgreSQL ORs permissive policies the result is STRICTLY MORE access — while the
// migration's own comments claim it narrowed. That is not a hypothetical: the FIRST version of
// this migration did precisely that, dropping four policy names I had invented, and a
// 27-assertion suite passed against it because it checked my invented names against themselves.
// Every assertion here is therefore pinned to a name the FOUNDER read off production, and to
// the shape of the statement rather than to my description of it.
//
// ⚠️ SQL COMMENTS ARE STRIPPED HERE, DELIBERATELY. `stripCommentsForEnvScan` handles JS/TS only
// — run it over a `.sql` file and it returns the input unchanged (measured). Both homes of this
// migration discuss these policies at length in prose, so a scanner reading raw text finds
// `FOR SELECT` and `DROP POLICY` inside commentary and passes on a broken file.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const REPO = join(__dirname, '../../../..')
const KEY = '20260829_delivery_rls'
const FILE_PATH = join(REPO, 'supabase/migrations', `${KEY}.sql`)
const RUNNER_SRC = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')

/** Remove `--` line comments and blank lines. Executable statements only. */
function executable(sql: string): string {
  return sql
    .split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

const FILE_SQL = executable(readFileSync(FILE_PATH, 'utf8'))

/** The runner entry's SQL body, by key. */
function runnerEntrySql(key: string): string | null {
  const at = RUNNER_SRC.indexOf(`key: '${key}'`)
  if (at < 0) return null
  const open = RUNNER_SRC.indexOf('sql: `', at)
  const close = RUNNER_SRC.indexOf('`.trim()', open)
  return RUNNER_SRC.slice(open + 'sql: `'.length, close)
}

const runnerKeys = (RUNNER_SRC.match(/key:\s*'([^']+)'/g) ?? []).map(m => m.slice(m.indexOf("'") + 1, -1))

describe('the sweep is not vacuous', () => {
  it('the runner parses and has entries', () => {
    expect(runnerKeys.length).toBeGreaterThan(40)
  })

  it('the canonical file parses to real statements', () => {
    expect(FILE_SQL.length).toBeGreaterThan(200)
    expect(FILE_SQL).toContain('DROP POLICY')
  })

  it('the comment stripper actually strips — prose cannot be read as a statement', () => {
    // The load-bearing proof. Without it every assertion below could be satisfied by the long
    // comment blocks in both homes rather than by any executable SQL.
    expect(executable('-- DROP POLICY IF EXISTS "fake" ON public.x;')).toBe('')
    expect(executable('-- prose\nDROP POLICY IF EXISTS "real" ON public.x;')).toBe('DROP POLICY IF EXISTS "real" ON public.x;')
  })
})

describe('RELEASED — THE ENTRY EXISTS AND THE TWO HOMES CANNOT DRIFT', () => {
  it('a runner entry now exists — Vida can apply it', () => {
    expect(
      runnerKeys,
      'the delivery_rls runner entry is missing. R2 is closed and this migration is released; if it is being held again, that is a product decision that needs its own PR and its own reason.',
    ).toContain(KEY)
  })

  it('the canonical file still exists beside its siblings', () => {
    expect(readdirSync(join(REPO, 'supabase/migrations'))).toContain(`${KEY}.sql`)
  })

  it('🛑 RUNNER SQL AND FILE SQL ARE IDENTICAL, STATEMENT FOR STATEMENT', () => {
    // ⚠️ THE ONE THAT MATTERS MOST. Vida runs the RUNNER copy; every review reads the FILE.
    // If they drift, the reviewed thing and the applied thing are different documents and no
    // amount of review is worth anything. Comments may differ; executable SQL may not.
    const runner = runnerEntrySql(KEY)
    expect(runner, 'no runner entry to compare').not.toBeNull()
    expect(
      executable(runner!),
      'the runner copy and the canonical file have DIFFERENT executable SQL. Vida applies the runner copy; reviews read the file.',
    ).toBe(FILE_SQL)
  })
})

describe('IT DROPS THE FIVE REAL PRODUCTION NAMES — NOT NAMES ANYONE INVENTED', () => {
  // Confirmed live by the founder immediately before release. A DROP on a wrong name is a
  // silent no-op that turns the CREATE below into a WIDENING.
  const DROPS: [string, string][] = [
    ['clients see own campaigns', 'public.figsy_campaigns'],
    ['clients see own enrollments', 'public.figsy_enrollments'],
    ['clients see own replies', 'public.figsy_replies'],
    ['clients see own sent emails', 'public.figsy_sent_emails'],
  ]

  for (const [policy, table] of DROPS) {
    it(`drops "${policy}" on ${table}`, () => {
      expect(FILE_SQL).toMatch(
        new RegExp(`DROP POLICY IF EXISTS "${policy}" ON ${table.replace('.', '\\.')};`),
      )
    })
  }

  it('drops blocklist_read and blocklist_write on opt_out_blocklist', () => {
    expect(FILE_SQL).toMatch(/DROP POLICY IF EXISTS "blocklist_read" ON public\.opt_out_blocklist;/)
    expect(FILE_SQL).toMatch(/DROP POLICY IF EXISTS "blocklist_write" ON public\.opt_out_blocklist;/)
  })
})

describe('THE FOUR RECREATED POLICIES ARE SELECT-ONLY AND TENANT-SCOPED', () => {
  const TABLES = ['figsy_campaigns', 'figsy_enrollments', 'figsy_replies', 'figsy_sent_emails']

  for (const table of TABLES) {
    it(`${table}: FOR SELECT TO authenticated USING (client_id = current_client_id())`, () => {
      const re = new RegExp(
        `CREATE POLICY "clients see own [a-z ]+" ON public\\.${table}\\s+` +
        `FOR SELECT TO authenticated USING \\(client_id = public\\.current_client_id\\(\\)\\);`,
      )
      expect(FILE_SQL, `${table}'s recreated policy is not SELECT-only and tenant-scoped`).toMatch(re)
    })
  }

  it('NO recreated policy is FOR ALL, FOR INSERT, FOR UPDATE or FOR DELETE', () => {
    // The entire point of the migration. A single FOR ALL here and a client can still delete
    // the delivery evidence behind their own invoice.
    for (const verb of ['FOR ALL', 'FOR INSERT', 'FOR UPDATE', 'FOR DELETE']) {
      expect(FILE_SQL, `a recreated policy uses ${verb} — this migration narrows to SELECT only`).not.toContain(verb)
    }
  })

  it('every CREATE POLICY carries a tenant predicate — none is unscoped', () => {
    const creates = FILE_SQL.split('\n').join(' ').match(/CREATE POLICY[\s\S]*?;/g) ?? []
    expect(creates.length, 'no CREATE POLICY statements found').toBe(4)
    for (const stmt of creates) {
      expect(stmt, `an unscoped CREATE POLICY: ${stmt}`).toContain('client_id = public.current_client_id()')
    }
  })
})

describe('opt_out_blocklist GETS NO REPLACEMENT BROWSER POLICY', () => {
  it('the blocklist is dropped from and never re-granted to the browser', () => {
    // ⚠️ FOUNDER RULING 29 Aug: suppression EFFECT is global, blocklist VISIBILITY is not, and
    // a browser must not write global suppression at all. Scoping the write to
    // blocked_by_client_id would NOT be sufficient — the row would still suppress that person
    // for every client. RLS on with zero policies IS the deny.
    const stmts = FILE_SQL.split('\n').filter(l => l.includes('opt_out_blocklist'))
    expect(stmts.length, 'no opt_out_blocklist statements at all').toBeGreaterThan(0)
    for (const s of stmts) {
      expect(s, `a policy is being CREATED on opt_out_blocklist: ${s}`).not.toContain('CREATE POLICY')
    }
    expect(FILE_SQL).not.toMatch(/CREATE POLICY[^;]*opt_out_blocklist/)
  })
})

describe('IT TOUCHES NOTHING ELSE — THE NO-TOUCH CONTRACT', () => {
  it('no statement names leads, icps, lead_pool or sourcing_ledger', () => {
    // Production is already in the intended state for all four. An earlier draft carried
    // ALTER/DROP lines for them that were pure no-ops, which made the migration look like it
    // was doing nine tables' worth of work — and made its real scope harder to review.
    for (const table of ['public.leads', 'public.icps', 'public.lead_pool', 'public.sourcing_ledger']) {
      expect(FILE_SQL, `${table} must not appear in an executable statement`).not.toContain(table)
    }
  })

  it('NO service-role policy is dropped or created', () => {
    // Two per figsy table, both confirmed live at release. The API reads every one of these
    // tables on the service role — dropping either would take the product down instantly.
    for (const name of [
      'service role bypass campaigns', 'service role bypass enrollments',
      'service role bypass replies', 'service role bypass sent emails',
      'service_role_bypass',
    ]) {
      expect(FILE_SQL, `the service-role policy "${name}" is named in an executable statement`).not.toContain(name)
    }
    expect(FILE_SQL).not.toMatch(/TO service_role/)
  })

  it('current_client_id() is USED but never redefined', () => {
    // It already exists, already works, and leads_own/icps_own already depend on it. Replacing
    // a live function to change nothing is risk bought for nothing.
    expect(FILE_SQL).toContain('public.current_client_id()')
    expect(FILE_SQL).not.toMatch(/CREATE\s+(OR REPLACE\s+)?FUNCTION/i)
    expect(FILE_SQL).not.toMatch(/DROP FUNCTION/i)
  })

  it('no table is created, altered or dropped, and no data is written', () => {
    // This migration is policy-only. Anything else in it is out of contract.
    for (const forbidden of ['CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'INSERT INTO', 'UPDATE ', 'DELETE FROM', 'TRUNCATE']) {
      expect(FILE_SQL, `delivery_rls contains ${forbidden} — it is a policy-only migration`).not.toContain(forbidden)
    }
  })

  it('RLS is not toggled on any table', () => {
    // ENABLE/DISABLE ROW LEVEL SECURITY is how a "narrowing" migration can accidentally open a
    // table completely. None of the five tables needs it — RLS is already on for all of them.
    expect(FILE_SQL).not.toMatch(/ROW LEVEL SECURITY/i)
  })
})

describe('THE STATEMENT COUNT IS EXACT — NOTHING SMUGGLED IN', () => {
  it('11 statements: 7 drops, 4 creates, and nothing else', () => {
    // A count is the cheapest guard against an extra statement appearing in a file nobody
    // re-reads line by line. If this number changes, the change was deliberate or it was a bug.
    //
    // ⛓️ THIS ASSERTION CAUGHT ITS OWN AUTHOR ON THE FIRST RUN. I wrote 13, having counted the
    // four CREATE POLICY statements as two apiece because each is written over two lines. The
    // real total is 7 + 4 = 11. That is the argument for counting statements rather than
    // trusting a description of them — including mine.
    const drops = (FILE_SQL.match(/DROP POLICY/g) ?? []).length
    const creates = (FILE_SQL.match(/CREATE POLICY/g) ?? []).length
    const total = (FILE_SQL.match(/;/g) ?? []).length
    expect(drops, 'expected 7 DROP POLICY: 4 figsy client policies + blocklist_read/write/own').toBe(7)
    expect(creates, 'expected exactly 4 CREATE POLICY').toBe(4)
    expect(total, 'a statement was added or removed').toBe(drops + creates)
    expect(total).toBe(11)
  })
})
