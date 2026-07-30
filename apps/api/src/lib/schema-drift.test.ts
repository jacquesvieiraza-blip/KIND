import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import {
  deriveSchema, deriveFromSql, extractCodeWrites, judgeTable, stripSqlComments,
} from './schema-drift'
import { isScannableFile } from './env-inventory'

// #558 — THE REPO MUST AT LEAST AGREE WITH ITSELF, AND SAY SO WHEN IT CANNOT.
//
// We cannot see production: the Supabase dashboard is unreachable and DATABASE_URL is
// mangled. So this asserts the two things the repo CAN settle —
//
//   ① `schema.sql` declares every column its own migrations add to the tables it declares.
//      It was missing 76, including `clients.wallet_balance_usd`, `clients.is_demo`,
//      `leads.delivered_at` and `leads.revealed_at`: the money column, the demo flag and the
//      two timestamps the whole approve → surface → charge loop turns on. Anyone standing a
//      database up from that file got one the product could not use.
//   ② The set of columns the code writes that NOTHING in the repo declares is pinned. Those
//      four are the honest ❓ rows in docs/SCHEMA-DRIFT.md, and a FIFTH appearing is news —
//      it means a new write path is betting on a column no migration creates.
//
// ⚠️ Nothing here claims production has anything. That is the point of the third verdict.

const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')
const sqlDir = (d: string) => readdirSync(join(REPO, d)).filter(f => f.endsWith('.sql')).sort()
  .map(f => ({ name: `${d}/${f}`, sql: read(`${d}/${f}`) }))

const MIGRATION_DIRS = ['supabase/migrations', 'apps/api/src/migrations', 'packages/db/src/migrations']
const SNAPSHOTS = ['packages/db/src/schema.sql', 'supabase/staging-schema.sql', 'supabase/MASTER_SCHEMA.sql']

const migrations = deriveSchema(MIGRATION_DIRS.flatMap(sqlDir))
const snapshots = SNAPSHOTS.map(n => deriveFromSql(read(n)))
const primary = snapshots[0]

const declared = new Map<string, Set<string>>()
for (const s of [...snapshots, migrations]) for (const [t, cols] of s) {
  if (!declared.has(t)) declared.set(t, new Set())
  for (const c of cols) declared.get(t)!.add(c)
}

const codeWrites = (() => {
  const out = new Map<string, Set<string>>()
  const walk = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e)
      if (statSync(p).isDirectory()) { walk(p); continue }
      if (!isScannableFile(p)) continue
      for (const [t, cols] of extractCodeWrites(readFileSync(p, 'utf8'))) {
        if (!out.has(t)) out.set(t, new Set())
        for (const c of cols) out.get(t)!.add(c)
      }
    }
  }
  for (const r of ['apps/api/src', 'apps/portal/src', 'apps/admin/src']) walk(join(REPO, r))
  return out
})()

describe('① schema.sql declares every column its own migrations add', () => {
  it('no table it declares is behind its own migrations', () => {
    // THE ASSERTION THIS FILE EXISTS FOR. Add a column in a migration and forget the
    // snapshot, and the gate goes red instead of the file quietly becoming wrong again.
    const behind: string[] = []
    for (const [table, cols] of migrations) {
      if (!primary.has(table)) continue      // #273's problem, not this one — see below
      for (const c of cols) if (!primary.get(table)!.has(c)) behind.push(`${table}.${c}`)
    }
    expect(behind, `schema.sql is behind its own migrations: ${behind.join(', ')}`).toEqual([])
  })

  it('the four columns whose absence would have broken the money loop are there now', () => {
    // Named individually rather than trusted to the count, because these are the ones whose
    // absence made the file actively harmful rather than merely incomplete.
    for (const c of ['wallet_balance_usd', 'is_demo', 'sourcing_allowance', 'plan']) {
      expect(primary.get('clients')!.has(c), `clients.${c}`).toBe(true)
    }
    for (const c of ['delivered_at', 'revealed_at', 'consent_token', 'surfaced_for_approval_at']) {
      expect(primary.get('leads')!.has(c), `leads.${c}`).toBe(true)
    }
  })

  it('the reconciliation is idempotent and destroys nothing', () => {
    // A schema file people paste into a SQL editor must be safe to paste twice, and must
    // never be the thing that drops a column.
    // Comments stripped FIRST — the block's own header says "ADD COLUMN IF NOT EXISTS
    // only", and counting that sentence made the tally 77 for 76 columns. Sixth time.
    const sql = read('packages/db/src/schema.sql')
    const block = stripSqlComments(sql.slice(sql.indexOf('RECONCILIATION')))
    expect(block).not.toMatch(/drop\s+(column|table)/i)
    const adds = block.match(/add column/gi) ?? []
    const guarded = block.match(/add column if not exists/gi) ?? []
    expect(guarded.length).toBe(adds.length)
    expect(adds.length).toBe(76)
  })

  it('every ADD COLUMN in the block is balanced SQL', () => {
    // A default expression containing a comma (`replace(gen_random_uuid()::text, …)`) was
    // clipped mid-call by the derivation and would have shipped SYNTACTICALLY BROKEN SQL
    // into a file whose whole purpose is being pasted into a SQL editor.
    const sql = stripSqlComments(read('packages/db/src/schema.sql'))
    for (const line of sql.split('\n')) {
      if (!/add column if not exists/i.test(line)) continue
      const open = (line.match(/\(/g) ?? []).length
      const close = (line.match(/\)/g) ?? []).length
      expect(open, `unbalanced parens: ${line.trim()}`).toBe(close)
    }
  })
})

describe('② the columns nothing in the repo declares are pinned', () => {
  const undeclared = (() => {
    const out: Record<string, string[]> = {}
    for (const [table, cols] of codeWrites) {
      const missing = [...cols].filter(c => !declared.get(table)?.has(c)).sort()
      if (missing.length) out[table] = missing
    }
    return out
  })()

  it('there are exactly five, and they are the five the doc explains', () => {
    // A SIXTH appearing means a new write path is betting on a column no migration creates —
    // which is how leads.source got here, and how it stayed invisible until this sweep.
    //
    // It was FOUR until the comment-stripper was fixed for nested template literals: the
    // broken version went blind mid-file and hid `subscribers.source` behind an invented
    // `figsy_enrollments.compat`. Pinning the list is what makes that visible next time.
    expect(Object.keys(undeclared).sort()).toEqual(
      ['clients', 'leads', 'opt_out_blocklist', 'subscribers', 'whatsapp_messages'])
  })

  it('leads.source is one of them — I introduced a writer for it in #599', () => {
    // Read off routes/icps.ts:513, which writes `source` to LEAD_POOL, a different table.
    // A column read from the wrong table and carried into a new write path.
    expect(undeclared.leads).toEqual(['source'])
    const doc = read('docs/SCHEMA-DRIFT.md')
    expect(doc).toContain('lead_pool`, a different table')
    expect(doc).toContain('csv_import')
  })

  it('the nested-template bug that hid one of them is recorded, not quietly patched', () => {
    // figsy.ts:232 holds a backtick inside a ${…} inside a backtick. Treating a template as
    // an ordinary quote ended the outer one at the inner backtick and stopped the stripping
    // for the remaining 2,700 lines — inventing a column called `compat` from the words
    // "Back-compat" in a comment, and hiding a real one.
    const doc = read('docs/SCHEMA-DRIFT.md')
    expect(doc).toContain('nested template literals')
    expect(doc).toContain('Back-compat')
    expect(doc).toContain('stopped stripping')
  })

  it('the fix is real — a nested template no longer blinds the stripper', () => {
    const src = [
      'const t = `a ${x ? `inner ${y}` : \'\'} b`',
      "// db.from('ghost').insert({ x: 1 })",
      "db.from('real').insert({ col_a: 1 })",
    ].join('\n')
    const w = extractCodeWrites(src)
    expect(w.has('ghost')).toBe(false)
    expect([...(w.get('real') ?? [])]).toEqual(['col_a'])
  })

  it('the scan states its own blind spot — 50 of 346 writes pass a variable', () => {
    // Found by red-proving: adding a bogus column to lib/lead-import.ts's row builder did
    // NOT fail this suite, because the route inserts a VARIABLE (`insert(accepted)`) and the
    // columns live in `toLeadRow`. So a clean result means "nothing undeclared among the
    // writes I can read" — never "nothing undeclared". A doc that did not say so would be
    // claiming coverage it does not have, which is the whole failure #558 is about.
    const doc = read('docs/SCHEMA-DRIFT.md')
    expect(doc).toContain('296 of the repo')
    expect(doc).toContain('pass a variable')
    expect(read('apps/api/src/lib/schema-drift.ts')).toContain('never "no undeclared columns"')
  })

  it('every undeclared column has a copy-pasteable query in the doc', () => {
    // A finding with no next action is a finding that sits there. Each one gets the exact
    // read-only SQL that settles it.
    const doc = read('docs/SCHEMA-DRIFT.md')
    for (const t of Object.keys(undeclared)) expect(doc, t).toContain(t)
    expect(doc).toContain("table_name='leads' and column_name='source'")
    expect(doc).toContain("to_regclass('public.whatsapp_messages')")
    expect(doc).toContain('information_schema.tables')
  })

  it('the doc contains NO write to production', () => {
    // The prompt's hard rule and the right one: every query on that page is read-only, and
    // the one ALTER it mentions is explicitly called out as not-in-this-PR.
    const fences = [...read('docs/SCHEMA-DRIFT.md').matchAll(/```sql\n([\s\S]*?)```/g)].map(m => m[1])
    expect(fences.length).toBeGreaterThanOrEqual(8)
    for (const q of fences) {
      expect(q.trim().toLowerCase().startsWith('select'), `not a SELECT: ${q.trim().slice(0, 60)}`).toBe(true)
      expect(q).not.toMatch(/\b(insert|update|delete|drop|alter|truncate|grant)\b/i)
    }
  })
})

describe('the derivation itself', () => {
  it('reads columns out of CREATE TABLE without counting constraints as columns', () => {
    const d = deriveFromSql(`create table public.t (
      id uuid primary key, amount numeric(10,2), type text check (type in ('a','b')),
      primary key (id), constraint t_uniq unique (id), foreign key (id) references x(id));`)
    expect([...d.get('t')!].sort()).toEqual(['amount', 'id', 'type'])
  })

  it('a check containing commas does not split a column in two', () => {
    // `check (type in ('a','b'))` defeats any naive comma split and would invent a column
    // called `'b'` — which then reads as drift the snapshot is "missing".
    const d = deriveFromSql(`create table t (type text check (type in ('a','b','c')), next_col text);`)
    expect([...d.get('t')!].sort()).toEqual(['next_col', 'type'])
  })

  it('picks up ALTER TABLE ADD COLUMN, several per statement', () => {
    const d = deriveFromSql(`alter table public.leads add column if not exists a text, add column b int;`)
    expect([...d.get('leads')!].sort()).toEqual(['a', 'b'])
  })

  it('SQL comments are stripped — a column named in prose is not a column', () => {
    expect(deriveFromSql(`-- alter table t add column ghost text;\nselect 1;`).size).toBe(0)
  })

  it('code writes are read from the object literal, not by regex', () => {
    const w = extractCodeWrites(`db.from('leads').insert({ a: 1, nested: { inner: 2 }, b: 3 })`)
    expect([...w.get('leads')!].sort()).toEqual(['a', 'b', 'nested'])
    expect(w.get('leads')!.has('inner')).toBe(false)
  })

  it('JS comments are stripped before code writes are read', () => {
    // The fifth time this trap has fired in this repo, and this time inside the instrument:
    // schema-drift.ts's own doc comment says `.from('table').insert({ a, b })`, and the first
    // version reported a TABLE CALLED `table`.
    expect(extractCodeWrites(`// db.from('ghost').insert({ x: 1 })`).size).toBe(0)
    expect(extractCodeWrites(`/* db.from('ghost').insert({ x: 1 }) */`).size).toBe(0)
  })

  it('judgeTable says UNKNOWABLE, not drift, for a column nothing declares', () => {
    // The distinction the whole doc rests on. "Drift" implies we know what is right.
    const f = judgeTable({ table: 't', migrations: new Set(['a']), snapshot: new Set(['a']), code: new Set(['a', 'b']) })
    expect(f.verdict).toBe('unknowable')
    expect(f.why).toContain('cannot tell')
  })

  it('judgeTable says DRIFT when the snapshot is behind its own migrations', () => {
    const f = judgeTable({ table: 't', migrations: new Set(['a', 'b']), snapshot: new Set(['a']), code: new Set(['a']) })
    expect(f.verdict).toBe('drift')
    expect(f.missingFromSnapshot).toEqual(['b'])
  })
})

describe('the shape of the problem is recorded, so it cannot be re-discovered', () => {
  it('126 migration files across three directories', () => {
    const total = MIGRATION_DIRS.reduce((n, d) => n + sqlDir(d).length, 0)
    expect(total).toBe(126)
    expect(read('docs/SCHEMA-DRIFT.md')).toContain('126 migration files in three directories')
  })

  it('and one runner, which applies twelve of them', () => {
    // This is the actual finding. Everything else was pasted into a SQL editor by hand, in
    // an unrecorded order — and that editor cannot be opened any more.
    const keys = read('apps/api/src/lib/pending-migrations.ts').match(/key:\s*'[^']+'/g) ?? []
    expect(keys.length).toBe(12)
  })

  it('the three schema snapshots disagree about how many tables exist', () => {
    expect(snapshots.map(s => s.size)).toEqual([10, 54, 13])
    expect(migrations.size).toBe(68)
  })

  it('#558\'s own example is traced to four disagreeing migrations', () => {
    const doc = read('docs/SCHEMA-DRIFT.md')
    expect(doc).toContain('credit_transactions_type_check')
    // The one with a runner is the one that DROPS hold/release — so pressing Run migrations
    // throws if production holds a single such row, which #492's lifecycle would have made.
    expect(doc).toContain('DROPS `hold`/`release`')
    expect(doc).toContain('validates existing rows')
  })
})
