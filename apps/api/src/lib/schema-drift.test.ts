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
    // 81 → 82 on 20 Aug: `leads.smartlead_campaign_id` (HC-3), created by
    // `20260820_smartlead_campaign_membership`. Declared because it now exists.
    expect(adds.length).toBe(101)   // ⛓️ 100 → 101 on 3 Sep (PR C3): +1 leads.proof_pass, declared in schema.sql because it now exists. NULLABLE smallint with NO DEFAULT and NO BACKFILL — NULL means "not known to be free-proof work", the honest reading of every row written before it, and the reason a retired legacy desk can be told apart from a live calibration set at all.   // ⛓️ 99 → 100 on 3 Sep (PR C1): +1 clients.commercial_model, declared in schema.sql because it now exists. NULLABLE with NO DEFAULT — unlike `plan` beside it, which is NOT NULL DEFAULT lead_gen — because NULL here means UNCLASSIFIED and must resolve to the behaviour the product had before the column existed. A default would classify the entire book by assertion.   // ⛓️ 96 → 99 on 31 Aug (BUILD-004A-2D): +3 clients.campaign_paused_emails_enabled / weekly_digest_enabled / referral_handoff_at, declared because they now exist. The two booleans are nullable with NO DEFAULT unlike daily_brief_enabled beside them — null means "never chose", so applying the migration unsubscribes nobody.   // ⛓️ 94 → 96 on 29 Aug (BUILD-003 PR2): +2 for leads.programme_id and leads.batch_id, the two ALTER-declared columns that give the PR-1 enrollment attribution something to read FROM. The four programmes.review_* columns are declared inside the CREATE TABLE, not as ALTERs, so they do not count here. // +1 28 Aug BUILD-002 (20260828_programme_money_engine — programmes + programme_batches + the programme authority branch inside try_spend_sourcing; additive and inert until a programme row exists)   // +1 26 Aug (20260826_proof_started_at — clients.proof_started_at, stamped by try_claim_proof_pass in the SAME atomic update as the counter: the proof desk's clock stops being inferred from the browser, where a lost POST response, another device or a stale older-pass stamp could each make a healthy run look failed)   // +1 25 Aug: icps.proof_widened_candidate — the free-proof pass-2 widened acceptance state, declared because it now exists; +2 22 Aug: clients.proof_records_committed + clients.proof_passes_done (free-proof fence state); +1 22 Aug round 4: clients.milla_understanding_confirmed_at — the client's "yes, this represents us" on Milla's reflect-back, recorded as an auditable fact and deliberately NOT a gate (nothing reads it before activation, generation or sending); +2 22 Aug founder ruling: icps.pending_targeting + icps.pending_submitted_at — a LIVE client's revision waits for K.I.N.D review, and the row had no way to tell CURRENT LIVE targeting from a REVISED PENDING one because the targeting columns ARE what runIcpJob sources from; +1 22 Aug, the same ruling extended: icps.pending_campaign_intent — the revised BRIEF waits with the targeting, and it needs its own column because GO applies pending_targeting by spreading it onto the icps row while campaign_intent is a figsy_campaigns column   // +3 27 Aug PR2 (20260827_proof_review_handoff — clients.proof_review_requested_at / proof_review_resolved_at / proof_review_icp_id: the persisted handoff behind "K.I.N.D will review this with you". Declared because they now exist)
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
  it('132 migrations, and every one of them has a home in supabase/migrations (#273)', () => {
    // WAS "126 files across three directories". #273 consolidated on 31 Jul: the 32 files
    // that lived only in the other two were copied in (bodies byte-identical, provenance
    // headers added), and ONE more was recovered — `20260726_campaign_copilot_columns`
    // existed only as a string in pending-migrations.ts, so the product could apply it to
    // production while no file described it.
    //
    // The three directories still hold 164 files between them, because nothing was deleted
    // (rule 3) — 132 canonical + 32 tombstoned copies of the same SQL. `migration-home.test.ts`
    // asserts each pair stays identical.
    //
    // 127/159 at #273 (31 Jul). Three canonical files added since: #607's
    // `20260801_retire_trial_status`, #627's `20260806_app_settings` and #599's
    // `20260806_leads_source`. New migrations land ONLY in the canonical directory — the
    // tombstoned 32 are frozen, so the SECOND number moves in lockstep with the first and
    // their DIFFERENCE (32) is what must never change.
    expect(sqlDir('supabase/migrations')).toHaveLength(162)   // ⛓️ 161 → 162 on 7 Sep (HOUSE-009): +1 supabase/migrations/20260907_programme_sourcing_authority.sql — the canonical home of the runner entry above, written in the same change (the shape this file argues for). The runner entry carries the same SQL with its comment lines stripped, because every backtick in the canonical file sits inside a `--` comment and one backtick would terminate the template literal.   // ⛓️ 160 → 161 on 3 Sep (PR C3 · leads.proof_pass): +1 supabase/migrations/20260903_lead_proof_attribution.sql — the canonical home of the runner entry above, written in the same change (the shape this very file argues for). One nullable smallint, one guarded CHECK, one partial index; no default, no backfill, no row touched.   // ⛓️ 159 → 160 on 3 Sep (PR C1 · SCHEMA FIRST): +1 20260903_client_commercial_model.sql — the canonical record of clients.commercial_model. File and runner entry written together, which is the shape #383 argues for: a .sql on disk LOOKS applied and runs nothing.   // ⛓️ 158 → 159 on 2 Sep (PR A1 · SCHEMA FIRST): +1 20260902_programme_internal_authority.sql — the canonical record of the two internal-authority columns and the per-stage XOR CHECKs. File and runner entry written together, which is the shape #383 argues for: a .sql on disk LOOKS applied and runs nothing.   // ⛓️ 157 → 158 on 31 Aug (BUILD-004A-2D): +1 20260831_notification_prefs_and_referral_handoff.sql — file and runner entry written together.   // ⛓️ 156 → 157 on 29 Aug (BUILD-003 PR2): +1 20260829_programme_delivery_control.   // +1 29 Aug BUILD-003 item 6 completion (20260829_provider_eviction — the send gate refuses NEW sends to a suppressed person; it can do nothing about one already inside Smartlead, which sends from its own copy. alertSmartleadStillSending only ALERTS, and an email is not a tracked blocker. Five nullable columns that make the unclosed risk countable)   // +4 29 Aug BUILD-003 PR 1 (20260829_delivery_rls · _meetings · _reply_idempotency · _delivery_attribution — FOUR files, not one: delivery_rls is gated by R2 on the browser's production access, and bundling the other three behind that gate would have stalled meeting truth, idempotency and attribution for a runtime question none of them depends on) // +1 28 Aug BUILD-002 (20260828_programme_money_engine — programmes + programme_batches + the programme authority branch inside try_spend_sourcing; additive and inert until a programme row exists)   // +1 26 Aug (20260826_proof_started_at — clients.proof_started_at, stamped by try_claim_proof_pass in the SAME atomic update as the counter: the proof desk's clock stops being inferred from the browser, where a lost POST response, another device or a stale older-pass stamp could each make a healthy run look failed)   // +1 26 Aug (20260826_run_outcome_failed — status gains 'failed', R72)   // +1 26 Aug (20260826_acquisition_memory — company memory of every PAID identity, R67)   // +1 25 Aug (20260825_proof_widened_candidate — the ONE column that lets an accepted widened proof become the targeting the client pays for); +1 20 Aug R46 (20260820_governed_documents — governed documents live in Vida as the sole source of truth; ruled 17 Aug, enforcement column read "nothing yet" until this build); +1 20 Aug HC-3 (20260820_smartlead_campaign_membership — records WHICH leads are inside a Smartlead campaign; nothing wrote it down before, so an opt-out could not name who to remove, and our blocklist does not stop Smartlead sending); +1 19 Aug the 25% ruling (20260819_lead_sale_commission — commission moves from Stripe payments to the $4 lead sale; the pack and the included 100 pay nothing); +1 19 Aug HC-1 (20260819_blocklist_email_normalize — repairs the rows: the blocklist stored two email shapes, so a person who opted out with a mixed-case address could still be emailed); +1 R40 (20260815_client_partner_seat); +1 16 Aug (20260816_partner_contact_details — the address/country/phone that let a contract be tailored instead of hand-filled); +1 19 Aug HC-7 (20260819_rls_advisor_fixes — the four CRITICAL Supabase advisor errors the founder found on production himself) // +1 21 Aug P32 (20260821_lead_feedback — calibration v1: the REASON behind a Pass, so a client's correction changes their next batch instead of being recorded as a bare no); // +1 21 Aug P33 (20260822_morning_brief_once_per_day — Milla's morning brief lands in the client's own /milla thread; ONE PER LONDON DAY is a partial unique index, not a read-then-write check, because two tabs opening the page at the same instant would both see 'no brief yet' and both insert); // +1 21 Aug P34 (20260822_meeting_briefs — the client-level Meeting Brief: versions are immutable in CONTENT so an edit inserts version+1, and the authoritative brief is the highest APPROVED version, never MAX(version) — a draft at v4 must not reach a model); // +1 22 Aug FREE PROOF (20260822_free_proof_acquisition — the acquisition fence: proof gets its OWN ledger and its OWN monthly cap so free acquisition can never eat the paid delivery ceiling, and the reservation is taken under a lock on the SINGLETON money_settings row, because locking per-client rows alone lets two prospects each read the same monthly room and both spend it);   // +1 27 Aug PR2 (20260827_proof_review_handoff — the exhausted prospect becomes real work: a client who has used BOTH free proof passes and comes back for another persists a review request, and an operator is told once. The ASK is the trigger, never the pass count — proof_passes_done >= 2 alone is the healthy end of a proof that worked, so deriving the handoff from it would raise one against every prospect the moment pass 2 rendered)
    const total = MIGRATION_DIRS.reduce((n, d) => n + sqlDir(d).length, 0)
    expect(total).toBe(194)   // ⛓️ 193 → 194 on 7 Sep (HOUSE-009): +1 20260907_programme_sourcing_authority, canonical only — the tombstoned 32 stay frozen.   // ⛓️ 192 → 193 on 3 Sep (PR C3): +1 20260903_lead_proof_attribution, canonical only — the tombstoned 32 stay frozen.   // ⛓️ 191 → 192 on 3 Sep (PR C1 · SCHEMA FIRST): +1 20260903_client_commercial_model, canonical only — the tombstoned 32 stay frozen.   // ⛓️ 190 → 191 on 2 Sep (PR A1 · SCHEMA FIRST): +1 20260902_programme_internal_authority, canonical only — the tombstoned 32 stay frozen.   // ⛓️ 189 → 190 on 31 Aug (BUILD-004A-2D): +1 20260831_notification_prefs_and_referral_handoff, canonical only — the tombstoned 32 stay frozen.   // ⛓️ 156 → 157 on 29 Aug (BUILD-003 PR2): +1 20260829_programme_delivery_control.   // +1 29 Aug BUILD-003 item 6 completion (20260829_provider_eviction — the send gate refuses NEW sends to a suppressed person; it can do nothing about one already inside Smartlead, which sends from its own copy. alertSmartleadStillSending only ALERTS, and an email is not a tracked blocker. Five nullable columns that make the unclosed risk countable)   // +4 29 Aug BUILD-003 PR 1 (delivery_rls · meetings · reply_idempotency · delivery_attribution — split into four so the R2 browser-access gate holds back only the RLS file)   // +1 28 Aug BUILD-002 (20260828_programme_money_engine, canonical only)   // +1 26 Aug (20260826_proof_started_at, canonical only — the claim records its own start so the desk stops inferring one from the browser)   // +1 26 Aug (20260826_run_outcome_failed — status gains 'failed', R72)   // +1 26 Aug (20260826_acquisition_memory, canonical only)   // +1 25 Aug (20260825_proof_widened_candidate, canonical only — the tombstoned 32 stay frozen); 141 canonical (+1 20 Aug R46 governed_documents) (+1 20 Aug HC-3 smartlead_campaign_membership) (+1 the 25% commission migration) (+1 R40, +1 contact details, +1 R42 flow, +1 #654 seller ramp, +1 HC-7 RLS fixes, +1 the same-day pool_pnl grant, +1 HC-1 blocklist normalise) + 32 tombstoned // +1 21 Aug P32 (20260821_lead_feedback — calibration v1: the REASON behind a Pass, so a client's correction changes their next batch instead of being recorded as a bare no); // +1 21 Aug P33 (20260822_morning_brief_once_per_day — Milla's morning brief lands in the client's own /milla thread; ONE PER LONDON DAY is a partial unique index, not a read-then-write check, because two tabs opening the page at the same instant would both see 'no brief yet' and both insert); // +1 21 Aug P34 (20260822_meeting_briefs — the client-level Meeting Brief: versions are immutable in CONTENT so an edit inserts version+1, and the authoritative brief is the highest APPROVED version, never MAX(version) — a draft at v4 must not reach a model); // +1 22 Aug FREE PROOF (20260822_free_proof_acquisition);   // +1 27 Aug PR2 (20260827_proof_review_handoff — the exhausted prospect becomes real work: a client who has used BOTH free proof passes and comes back for another persists a review request, and an operator is told once. The ASK is the trigger, never the pass count — proof_passes_done >= 2 alone is the healthy end of a proof that worked, so deriving the handoff from it would raise one against every prospect the moment pass 2 rendered)
    expect(total - sqlDir('supabase/migrations').length, 'the 32 tombstoned copies are frozen').toBe(32)
    expect(read('docs/SCHEMA-DRIFT.md')).toContain('the three directories are now one home')
  })

  it('and one runner, which applies twenty-two of them', () => {
    // This is the actual finding. Everything else was pasted into a SQL editor by hand, in
    // an unrecorded order — and that editor cannot be opened any more.
    //
    // THE RUNNER IS THE ONLY LIST THAT EXECUTES. A .sql file with no entry here is a file
    // nobody runs — which is how `20260726_campaign_copilot_columns` came to exist as a
    // string with no file, the mirror image of the same gap. #627 wrote BOTH homes for that
    // reason: the file is the canonical record, this array is what actually runs.
    const keys = read('apps/api/src/lib/pending-migrations.ts').match(/key:\s*'[^']+'/g) ?? []
    expect(keys.length).toBe(49)   // ⛓️ 48 → 49 on 7 Sep (HOUSE-009): +1 20260907_programme_sourcing_authority — FUNCTIONS ONLY, no table, no column, no row. try_reserve_programme_sourcing is new; try_spend_sourcing is REPLACED with the SAME signature, the same return and a byte-unchanged legacy branch, so no existing caller resolves differently and the PDL fence still records PDL money; reconcile_programme_sourcing does nothing until an operator names one programme. It exists because entitlement and provider cost were the same function body: exempting the prepaid Apollo/house path from a fabricated $0.28-a-record ledger row also exempted it from the reservation, the 2,500 ceiling and the batch — 246 people were sourced against `0 used / 0 reserved / 2500 left / no batch`. 🚀 RUN IT FROM VIDA → ENGINE IMMEDIATELY AFTER DEPLOYING THIS BUILD: until it is applied the function does not exist, so every house reservation returns nothing and house sourcing STOPS — fail-closed, but a stop.   // ⛓️ 47 → 48 on 3 Sep (PR C3 · leads.proof_pass): +1 20260903_lead_proof_attribution — one NULLABLE smallint on leads with NO DEFAULT and NO BACKFILL, plus a guarded CHECK admitting NULL, 1 and 2, and a partial index. It exists because a free-proof lead and a retired legacy delivered lead were BYTE-IDENTICAL on every column that was traced (leads.source is the PROVIDER name and the same for both; programme_id is null for both; icp_run_outcomes holds no lead ids and no proof flag; sourcing_ledger and proof_ledger are money rows with no lead ids, and a pool-only proof pass writes no proof_ledger row at all; acquisition_memory is keyed on the provider identity; icps.proof_widened_candidate exists only for a pass-2 widened fallback). The withdrawn fix used clients.proof_passes_done, which is CUMULATIVE ACCOUNT STATE: any declared programme client with old legacy leads who later ran a proof they were entitled to run got their whole history back as current work. NULL means "not known to be proof work", which is the honest reading of every existing row, and no row is written by the migration. 🚀 UNLIKE C1 THIS ONE SHIPS WITH THE CODE THAT READS IT — run it from Vida → Engine immediately after deploying this build; until it is applied the customer desk attributes NOTHING, which fails closed to an empty desk and never to a historical one.   // ⛓️ 46 → 47 on 3 Sep (PR C1 · SCHEMA FIRST): +1 20260903_client_commercial_model — one NULLABLE text column on clients with NO DEFAULT and NO BACKFILL, plus a CHECK admitting NULL, 'programme' and 'legacy'. It exists because `authorityFor(null)` reads the ABSENCE of a programme row as the positive assertion that a client is legacy, and every commercial decision inherits it. Founder-locked 3 Sep — House and MBF are PROGRAMME-model clients and having no active programme must not make either legacy. NULL is the migrated state for the whole existing book and resolves to exactly the behaviour the product has today, so no row is written and nobody is reclassified; a DEFAULT would stamp historic rows with a claim nobody checked (#599). NOT folded into `clients.plan`, which selects a wallet pool. No index — the resolver reads one client by primary key. SHIPPED AHEAD OF ITS APPLICATION CODE (expand/contract).   // ⛓️ 45 → 46 on 2 Sep (PR A1 · SCHEMA FIRST): +1 20260902_programme_internal_authority — two nullable timestamps (first_authorised_at, second_authorised_at) and a per-stage XOR CHECK, so a programme can hold truthful INTERNAL authority without a Stripe object, an invoice figure or a pound of revenue. SHIPPED AHEAD OF ITS APPLICATION CODE ON PURPOSE (expand/contract): read-only verification proved the runner executes the PENDING_MIGRATIONS constant compiled into the DEPLOYED API, so a migration can never be applied before the build that carries it — deploying schema and readers together would have opened a window in which every explicit programme select returned 42703. NO application code in this PR reads or writes either column; the currently deployed product behaves exactly as before. The columns are separate from `first_paid_at` because that column is simultaneously the sourcing key and the revenue trigger — `computeContribution` reads it — so authorising House by stamping it would have invented money nobody paid. Created with `IF NOT EXISTS (SELECT 1 FROM pg_constraint)` rather than DROP/ADD: the runner has no ledger and re-executes every entry, and `ADD CONSTRAINT ... CHECK` takes ACCESS EXCLUSIVE and revalidates the table.   // ⛓️ 44 → 45 on 31 Aug (BUILD-004A-2D): +1 20260831_notification_prefs_and_referral_handoff — two notification columns and a referral handoff marker. File and runner entry written together. The two switches existed as DISABLED "Soon" toggles while their crons sent every week, and a preference a cron must obey cannot live in a browser; the third marker is deliberately NOT referral_bonus_paid_at, because the refund path reads that one to claw $45 back and marking an unpaid referral with it would reclaim money nobody was given.   // ⛓️ 43 → 44 on 29 Aug (BUILD-003 PR2): +1 20260829_programme_delivery_control — the atomic programme batch claim (at most ONE running batch per programme, because the old read-MAX-then-insert let a RETRY create a second one, each holding its own reservation against the paid ceiling), the four-column review hold (NEXT-BATCH only, never a pause, never a status), and leads.programme_id/batch_id, without which the PR-1 attribution columns on figsy_enrollments had nothing to read FROM. Additive and idempotent; no existing row is written.   // ⛓️ 42 → 43 on 29 Aug (RELEASE): delivery_rls is back in the runner. R2 closed — the founder re-read all five policy names off pg_policies in production immediately before release, which was always the condition the hold enforced. The 43 → 42 removal noted below was that hold; delivery-rls-release.test.ts now asserts the entry EXISTS and that its executable SQL is byte-identical to the canonical file. Canonical FILE count is unchanged at 156 — the file never left the repo.   // ⛓️ 43 → 42 on 29 Aug: the BUILD-003 delivery_rls entry was REMOVED from the runner (not from the repo). Vida applies ALL pending migrations in one action, and that one changes live browser access on nine tables while R2 — a RUNTIME question — is still open. The .sql stays in supabase/migrations as the canonical record; a follow-up PR adds its entry once R2 closes. Canonical FILE count is unchanged at 156, which is the point: the migration exists, it simply cannot be applied yet.   // +1 29 Aug BUILD-003 item 6 completion (20260829_provider_eviction — the send gate refuses NEW sends to a suppressed person; it can do nothing about one already inside Smartlead, which sends from its own copy. alertSmartleadStillSending only ALERTS, and an email is not a tracked blocker. Five nullable columns that make the unclosed risk countable)   // +4 29 Aug BUILD-003 PR 1 (20260829_delivery_rls · _meetings · _reply_idempotency · _delivery_attribution — FOUR files, not one: delivery_rls is gated by R2 on the browser's production access, and bundling the other three behind that gate would have stalled meeting truth, idempotency and attribution for a runtime question none of them depends on) // +1 28 Aug BUILD-002 (20260828_programme_money_engine — programmes + programme_batches + the programme authority branch inside try_spend_sourcing; additive and inert until a programme row exists)   // +1 26 Aug (20260826_proof_started_at — clients.proof_started_at, stamped by try_claim_proof_pass in the SAME atomic update as the counter: the proof desk's clock stops being inferred from the browser, where a lost POST response, another device or a stale older-pass stamp could each make a healthy run look failed)   // +1 26 Aug (20260826_run_outcome_failed — status gains 'failed', R72)   // +1 26 Aug (20260826_acquisition_memory — company memory of every PAID identity, R67)   // +1 25 Aug (20260825_proof_widened_candidate — file and runner entry written together, because a file nobody runs is how a column comes to exist in the record and not in the database); +1 20 Aug R46 (governed_documents — versions CHAIN and nothing deletes; a database unique index stops the chain FORKING, because two operators each adding "version 2" leaves no answer to the only question the table exists to answer); +1 20 Aug HC-3 (smartlead_campaign_membership — the column that makes an opt-out reachable into an engine we do not control: Smartlead holds its own copy of the lead and never reads opt_out_blocklist); +1 19 Aug the 25% partner commission (lead_sale_commission — commission_type widened so a lead-sale row can be written at all; the founder's ruling pays on leads bought, never on money in); +1 19 Aug HC-1 (blocklist_email_normalize — dedups case-variant rows FAIL CLOSED on the founder's ruling: if any variant is still blocked, the survivor is blocked, because 'earliest row wins' alone can take a suppressed person OFF the list); +1 19 Aug the same-day correction (pool_pnl_service_role_grant); +1 19 Aug HC-7 (rls_advisor_fixes — the first entry in this list prompted by a production dashboard rather than by a build). 12 at #273; +1 #607; +1 #627 (app_settings); +1 #599 (leads_source); +1 #637/#641 (audit_columns); +1 #383 (increment_emails_sent — the .sql existed since 10 Jul and was never in the runner); +1 #316/#372 (pool_atomic — same gap again, .sql from 6 Jul, never in the runner, found by auditing every runtime RPC) +1 #651/R40 (client_partner seat + commission types + the #351 unique); +1 16 Aug #202 (partner_contact_details — address/country/phone, captured at seat creation so no document is ever hand-filled); +1 16 Aug R42 (partner_onboarding_flow — invite/sign/counter-sign states, payout rails and the FROZEN signed-document table; onboarding_state defaults to 'active' so no existing referral code is switched off by the schema change); +1 17 Aug #654 (seller_ramp — partner_ramp_contacts, the seller's own notebook and the source of the ramp gates). // +1 21 Aug P32 (20260821_lead_feedback — calibration v1: the REASON behind a Pass, so a client's correction changes their next batch instead of being recorded as a bare no); // +1 21 Aug P33 (20260822_morning_brief_once_per_day — Milla's morning brief lands in the client's own /milla thread; ONE PER LONDON DAY is a partial unique index, not a read-then-write check, because two tabs opening the page at the same instant would both see 'no brief yet' and both insert); // +1 21 Aug P34 (20260822_meeting_briefs — the client-level Meeting Brief: versions are immutable in CONTENT so an edit inserts version+1, and the authoritative brief is the highest APPROVED version, never MAX(version) — a draft at v4 must not reach a model); // +1 22 Aug FREE PROOF (20260822_free_proof_acquisition — the acquisition fence: proof gets its OWN ledger and its OWN monthly cap so free acquisition can never eat the paid delivery ceiling, and the reservation is taken under a lock on the SINGLETON money_settings row, because locking per-client rows alone lets two prospects each read the same monthly room and both spend it);   // +1 27 Aug PR2 (20260827_proof_review_handoff — the exhausted prospect becomes real work: a client who has used BOTH free proof passes and comes back for another persists a review request, and an operator is told once. The ASK is the trigger, never the pass count — proof_passes_done >= 2 alone is the healthy end of a proof that worked, so deriving the handoff from it would raise one against every prospect the moment pass 2 rendered)
  })

  it('the three schema snapshots disagree about how many tables exist', () => {
    expect(snapshots.map(s => s.size)).toEqual([14, 54, 13]) // +1 28 Aug BUILD-002 (20260828_programme_money_engine — programmes + programme_batches + the programme authority branch inside try_spend_sourcing; additive and inert until a programme row exists)   // +1 26 Aug (20260826_acquisition_memory — company memory of every PAID identity, R67)
    // 68 → 69: #627's `app_settings`, the first genuinely NEW table declared since this pin
    // was set. The snapshots did not move — they are hand-maintained and this table is not in
    // them, which is the same divergence this whole describe block exists to keep visible.
    //
    // 69 → 70 (16 Aug, R42): `partner_signed_documents` — the frozen copies of what a partner
    // actually signed. Same story again: the migrations know about it, the three
    // hand-maintained snapshots do not, and this number moving is the honest record of that.
    //
    // 70 → 71 (17 Aug, #654): `partner_ramp_contacts`. Same story a third time.
    //
    // 71 → 72 (20 Aug, R46): `governed_documents` — the single home for documents the business
    // is governed by. A fourth time, and the pattern is now the point rather than a surprise:
    // the migrations know about the table, the three hand-maintained snapshots do not, and this
    // number moving is the honest record of that gap rather than a claim it has been closed.
    //
    // 72 → 73 (21 Aug, P32): `lead_feedback` — the reason behind a Pass. A FIFTH time. The
    // number is not the finding; the finding is that adding a table still requires nobody to
    // touch the three snapshots, so they drift by construction and this counter is the only
    // thing that notices.
    //
    // 73 → 74 (21 Aug, P34): `meeting_briefs` — the client-level Meeting Brief. A SIXTH time,
    // in the same session as the fifth, which is the clearest statement yet that the snapshots
    // are not maintained by anything: two tables were added hours apart and neither of them
    // reached a single one of the three.
    expect(migrations.size).toBe(79)   // 78 → 79 (29 Aug, BUILD-003): `public.meetings` — the sole source of meeting truth. ⛓️ CORRECTED SAME DAY: this comment first said the table was deliberately kept OUT of packages/db/src/schema.sql so the snapshot drift stayed visible. The accepted BUILD-003 file map requires schema.sql to carry `meetings`, so it now does, and the earlier reasoning was wrong — a snapshot the packet asks for is not drift being papered over. The counter still moves, because it counts tables the MIGRATIONS know about, and it is the honest record that a new table reaches the snapshots only when somebody is told to put it there. // +1 28 Aug BUILD-002 (20260828_programme_money_engine — programmes + programme_batches + the programme authority branch inside try_spend_sourcing; additive and inert until a programme row exists)   // +1 26 Aug: public.acquisition_memory — company memory of PAID identities (R67), RLS on with NO policies   // +1 22 Aug: public.proof_ledger — free-proof spend, deliberately NOT mixed into sourcing_ledger which fences PAID delivery
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
