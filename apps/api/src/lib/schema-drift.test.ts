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
//      are the honest ❓ rows in docs/SCHEMA-DRIFT.md, and a NEW one appearing is news — it
//      means a new write path is betting on a column no migration creates. The count has only
//      ever been allowed to FALL when a column was actually created (#627 app_settings,
//      #599 leads.source), never when one was excused.
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
    // 76 → 77 on 6 Aug: `leads.source` (#599). See ② — it left the undeclared list by being
    // CREATED, so the reconciliation block now carries one more column.
    // 77 → 81 the same day: the four `clients` columns of #641 (`contact_email`,
    // `last_low_credit_email_at`, `last_seen_at`, `leads_per_run`), created by
    // `20260806_audit_columns`. Same reason — declared because they now exist, not excused.
    const sql = read('packages/db/src/schema.sql')
    const block = stripSqlComments(sql.slice(sql.indexOf('RECONCILIATION')))
    expect(block).not.toMatch(/drop\s+(column|table)/i)
    const adds = block.match(/add column/gi) ?? []
    const guarded = block.match(/add column if not exists/gi) ?? []
    expect(guarded.length).toBe(adds.length)
    expect(adds.length).toBe(81)
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

  it('there are exactly three, and they are the three the doc explains', () => {
    // A SIXTH appearing means a new write path is betting on a column no migration creates —
    // which is how leads.source got here, and how it stayed invisible until this sweep.
    //
    // It was FOUR until the comment-stripper was fixed for nested template literals: the
    // broken version went blind mid-file and hid `subscribers.source` behind an invented
    // `figsy_enrollments.compat`. Pinning the list is what makes that visible next time.
    //
    // It went to SIX on 5 Aug when #626 added a WRITE to `app_settings`, a table the repo had
    // read for months and never declared.
    //
    // ⚠️ BACK TO FIVE ON 6 AUG, AND THIS IS THE ONLY GOOD REASON THIS NUMBER EVER FALLS: the
    // table is now DECLARED. `20260806_app_settings` (#627) creates it, so `app_settings` is no
    // longer an undeclared write — it left this list by being fixed, not by being excused.
    //
    // The 5 Aug entry for it also turned out to be WRONG in a way worth keeping in mind here:
    // it claimed the table "exists in production because somebody made it there". It existed
    // nowhere, and the founder's first Save proved it. So a table sitting in this list is not
    // evidence that it is fine in production — it is evidence that we do not know. The
    // correction is written up in `SCHEMA-DRIFT.md` under the entry itself.
    // ⚠️ FOUR ON 6 AUG — `leads` left, and again for the only good reason: it is now
    // DECLARED. `20260806_leads_source` (#599) creates the column, so the two writers that
    // bet on it are no longer betting.
    //
    // ⚠️ THREE LATER THE SAME DAY — `clients` left too, and this one was found by the
    // founder-ordered full-repo audit rather than by anything failing: four columns live code
    // read that no migration created, including the one the low-credit warning cron writes.
    // `20260806_audit_columns` (#641) creates them. Still the only good reason.
    expect(Object.keys(undeclared).sort()).toEqual(
      ['opt_out_blocklist', 'subscribers', 'whatsapp_messages'])
  })

  it('leads.source is DECLARED now — the prediction in this file came true first', () => {
    // This entry used to read "I introduced a writer for it in #599", and the doc warned:
    // *"If the column does not exist, the CSV import fails on the first real Apollo file."*
    //
    // On 6 Aug it did. The founder ran the importer on a real file for A18 and got
    // "Could not find the 'source' column of 'leads' in the schema cache" — 0 of 1 rows.
    // The second writer, `lib/vida.ts`, had been failing SILENTLY for weeks: it swallowed
    // the insert error, so every inbound website-chat visitor who typed in their email
    // failed to become a lead and nothing anywhere said so.
    //
    // So this is not a pin being relaxed. It is a ❓ resolving to a fact.
    expect(undeclared.leads, 'leads is undeclared again').toBeUndefined()
    expect(declared.get('leads')!.has('source'), 'leads.source is not declared').toBe(true)

    const doc = read('docs/SCHEMA-DRIFT.md')
    expect(doc).toContain('lead_pool`, a different table')   // how it got here, kept
    expect(doc).toContain('csv_import')
    expect(doc).toContain('20260806_leads_source')           // and how it was fixed
  })

  it('both writers of leads.source are still accounted for', () => {
    // The column was created because TWO paths depend on it. If a future edit drops one, the
    // count here changes and somebody has to say which and why — rather than the column
    // quietly becoming unused and a later sweep proposing to remove it.
    const writers = [
      ['lib/lead-import.ts', 'csv_import'],
      ['lib/vida.ts', 'vida_chat'],
    ] as const
    for (const [file, value] of writers) {
      expect(read(`apps/api/src/${file}`), `${file} no longer writes source: '${value}'`)
        .toContain(`source:`)
      expect(read(`apps/api/src/${file}`)).toContain(value)
    }
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

  it('every undeclared column has a NEXT ACTION in the doc, not just a verdict', () => {
    // A finding with no next action is a finding that sits there.
    //
    // ⚠️ REWRITTEN 30 Jul, and the reason is the point. This used to assert the doc contained
    // specific SQL — and it passed while that SQL had NOWHERE TO RUN: the doc said "paste it
    // into Vida → Engine → SQL", a screen that does not exist. A test bound to the presence
    // of a query cannot tell whether the query is reachable. It is now bound to the ACTION,
    // which is the thing that was actually missing.
    const doc = read('docs/SCHEMA-DRIFT.md')
    for (const t of Object.keys(undeclared)) expect(doc, t).toContain(t)
    // Six are a button now …
    expect(doc).toContain('Schema probe')
    expect(doc).toContain('/vida/engine')
    // … and the two that genuinely cannot be are marked blocked rather than dropped.
    expect(doc).toContain('need a Postgres connection')
    expect(doc).toContain('DATABASE_URL')
  })

  it('the doc does NOT send anyone to a screen that does not exist', () => {
    // The only SQL path in the product is /operator/migrations/run, which executes reviewed
    // constants and refuses anything else. There is no query runner, and saying there is
    // turns a page of correct findings into a page of instructions nobody can follow.
    const doc = read('docs/SCHEMA-DRIFT.md')
    expect(doc).not.toMatch(/Engine\*\* → the SQL runner/)
    expect(doc).not.toMatch(/paste (them )?into Vida → Engine → SQL/i)
  })

  it('the doc contains NO write to production', () => {
    // The prompt's hard rule and the right one: every query on that page is read-only, and
    // the one ALTER it mentions is explicitly called out as not-in-this-PR.
    // WAS `>= 8`. Six of the eight became a button on 30 Jul (there was never a SQL runner
    // to paste them into), so only the two that genuinely need a Postgres connection remain
    // as SQL. The count is not the property worth guarding — that they are all SELECTs is,
    // and that the two blocked ones are still NAMED is asserted separately above.
    const fences = [...read('docs/SCHEMA-DRIFT.md').matchAll(/```sql\n([\s\S]*?)```/g)].map(m => m[1])
    expect(fences.length).toBeGreaterThanOrEqual(2)
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
  it('131 migrations, and every one of them has a home in supabase/migrations (#273)', () => {
    // WAS "126 files across three directories". #273 consolidated on 31 Jul: the 32 files
    // that lived only in the other two were copied in (bodies byte-identical, provenance
    // headers added), and ONE more was recovered — `20260726_campaign_copilot_columns`
    // existed only as a string in pending-migrations.ts, so the product could apply it to
    // production while no file described it.
    //
    // The three directories still hold 163 files between them, because nothing was deleted
    // (rule 3) — 131 canonical + 32 tombstoned copies of the same SQL. `migration-home.test.ts`
    // asserts each pair stays identical.
    //
    // 127/159 at #273 (31 Jul). Three canonical files added since: #607's
    // `20260801_retire_trial_status`, #627's `20260806_app_settings` and #599's
    // `20260806_leads_source`. New migrations land ONLY in the canonical directory — the
    // tombstoned 32 are frozen, so the SECOND number moves in lockstep with the first and
    // their DIFFERENCE (32) is what must never change.
    expect(sqlDir('supabase/migrations')).toHaveLength(131)
    const total = MIGRATION_DIRS.reduce((n, d) => n + sqlDir(d).length, 0)
    expect(total).toBe(163)
    expect(total - sqlDir('supabase/migrations').length, 'the 32 tombstoned copies are frozen').toBe(32)
    expect(read('docs/SCHEMA-DRIFT.md')).toContain('the three directories are now one home')
  })

  it('and one runner, which applies seventeen of them', () => {
    // This is the actual finding. Everything else was pasted into a SQL editor by hand, in
    // an unrecorded order — and that editor cannot be opened any more.
    //
    // THE RUNNER IS THE ONLY LIST THAT EXECUTES. A .sql file with no entry here is a file
    // nobody runs — which is how `20260726_campaign_copilot_columns` came to exist as a
    // string with no file, the mirror image of the same gap. #627 wrote BOTH homes for that
    // reason: the file is the canonical record, this array is what actually runs.
    const keys = read('apps/api/src/lib/pending-migrations.ts').match(/key:\s*'[^']+'/g) ?? []
    expect(keys.length).toBe(18)   // 12 at #273; +1 #607; +1 #627 (app_settings); +1 #599 (leads_source); +1 #637/#641 (audit_columns); +1 #383 (increment_emails_sent — the .sql existed since 10 Jul and was never in the runner); +1 #316/#372 (pool_atomic — same gap again, .sql from 6 Jul, never in the runner, found by auditing every runtime RPC)
  })

  it('the three schema snapshots disagree about how many tables exist', () => {
    expect(snapshots.map(s => s.size)).toEqual([10, 54, 13])
    // 68 → 69: #627's `app_settings`, the first genuinely NEW table declared since this pin
    // was set. The snapshots did not move — they are hand-maintained and this table is not in
    // them, which is the same divergence this whole describe block exists to keep visible.
    expect(migrations.size).toBe(69)
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
