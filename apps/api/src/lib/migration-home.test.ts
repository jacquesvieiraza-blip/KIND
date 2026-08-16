import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// #273 — ONE HOME FOR MIGRATIONS, AND A GUARD THAT KEEPS IT ONE.
//
// There were three migration directories — `supabase/migrations` (94 files),
// `apps/api/src/migrations` (19) and `packages/db/src/migrations` (13) — and **not one file
// was in more than one of them**. So "where is the migration that created this table?"
// depended on which directory you happened to open first, with nothing to tell you there
// were two more. Every file now has a canonical copy in `supabase/migrations`.
//
// ── THE PREMISE THAT HAD TO BE CORRECTED FIRST ───────────────────────────────────────────
//
// #273 says to make `supabase/migrations` canonical "because it is what Vida → Engine runs".
// **It is not.** Reading `operator.ts` → `runPendingMigrations` shows the runner executes
// `PENDING_MIGRATIONS`, a TypeScript constant, and `pending-migrations.ts` says explicitly
// why: `.sql` files are not copied into `dist/` by tsc, so a file read would work locally
// and fail in production. **No directory has ever been applied to anything.** Two of the
// runner's own twelve entries had their file in `apps/api/src/migrations`, so the premise
// was not even true of the runner's contents.
//
// That makes RECORDING a migration and RUNNING one two different acts, and this file guards
// the seam between them:
//
//   ① every runner entry has a canonical FILE — because one did not, and a statement the
//      product can apply to production that no file describes is #558 in its purest form;
//   ② a tombstoned original and its canonical copy stay byte-identical — because copying
//      creates two files that can drift, and an unguarded copy is the disease, not the cure.

const REPO = join(__dirname, '../../../..')
const CANON = 'supabase/migrations'
const TOMBSTONED = ['apps/api/src/migrations', 'packages/db/src/migrations']

const sqlFiles = (dir: string) =>
  readdirSync(join(REPO, dir)).filter(f => f.endsWith('.sql')).sort()
const read = (dir: string, name: string) => readFileSync(join(REPO, dir, name), 'utf8')

/** Everything after a leading `--` comment block: the SQL a database would actually see. */
function body(text: string): string {
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length && (lines[i].trim().startsWith('--') || lines[i].trim() === '')) i++
  return lines.slice(i).join('\n').trim()
}

const runnerKeys = (() => {
  const src = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
  return (src.match(/key:\s*'([^']+)'/g) ?? []).map(m => m.slice(m.indexOf("'") + 1, -1))
})()

describe('① every migration has a canonical file', () => {
  it('the two other directories add nothing the canonical one lacks', () => {
    // THE ASSERTION THIS FILE EXISTS FOR. Drop a new .sql into either stale directory and
    // the gate goes red until it also exists in the one place people look.
    const canon = new Set(sqlFiles(CANON))
    const orphans = TOMBSTONED.flatMap(d => sqlFiles(d).filter(f => !canon.has(f)).map(f => `${d}/${f}`))
    expect(orphans, `not in ${CANON}: ${orphans.join(', ')}`).toEqual([])
  })

  it('every entry the runner can apply has a file — one did not', () => {
    // `20260726_campaign_copilot_columns` existed ONLY as a template string inside
    // pending-migrations.ts. The product could apply it to production while nothing in the
    // migration record said it existed. Recovered from the constant, verbatim.
    const canon = new Set(sqlFiles(CANON))
    const fileless = runnerKeys.filter(k => !canon.has(`${k}.sql`))
    expect(fileless, `runner entries with no file in ${CANON}: ${fileless.join(', ')}`).toEqual([])
    // 12 at #273 (31 Jul); 13 from 1 Aug — #607 added `20260801_retire_trial_status`, which
    // converts legacy `trialing` subscriptions to `paused`. The count is asserted rather than
    // derived so that adding something the product can APPLY TO PRODUCTION is never a silent
    // edit — if this number moved and you did not mean it to, a migration was added.
    //
    // 14 from 6 Aug — #627 added `20260806_app_settings`, which CREATES the table the System
    // check and the PDL-cap card had both been reading for months and which existed nowhere.
    // The founder pressed Save and got "Could not find the table 'public.app_settings'". Note
    // where this entry sits: the `fileless` assertion above passed on the first run, because
    // the file and the runner entry were written together. That is the whole discipline of
    // this test, working in the intended direction rather than catching a miss.
    // 17 from 12 Aug — #383 added `20260710_increment_emails_sent`, and this counter is the
    // reason that defect is fixed rather than still hiding. The .sql file was written on
    // 10 Jul and never added here, so the atomic send-counter RPC was never created in
    // production and every send fell through to a racy fallback for a month. The file
    // existing made it LOOK applied. This number moving is what "a migration was added"
    // means — and its NOT moving, for 33 days, is what "a migration was written and never
    // run" looks like. Nothing here can catch that second case; only reading the runner can.
    //
    // 18 from 13 Aug — the SECOND instance of the very same gap, found by auditing every
    // runtime RPC rather than waiting for a symptom: `20260706_pool_atomic` had sat as a .sql
    // file since 6 Jul carrying the line "NOT auto-applied — the founder runs this by hand in
    // the Supabase SQL editor", while that editor has been unreachable the whole time. Both
    // its functions are called by routes/company.ts, which fails soft — so their absence read
    // as "not enough in the pool" rather than as an error. Added to the runner, and #372 (the
    // destroyed-credits bug inside that SQL) fixed in the same entry.
    //
    // 20 from 16 Aug — `20260816_partner_contact_details` (#202). Not a gap this time: the
    // file and the entry were written together, in the same change, which is the shape the
    // two findings above were arguing for. It carries address/country/phone so a partner's
    // contract is TAILORED when the seat is created rather than hand-filled afterwards —
    // the founder's review of the pack: "i should not need to fill anything out."
    //
    // 21 from 16 Aug — `20260816_partner_onboarding_flow` (R42). Same shape again: file and
    // entry written together. It carries the states that decide whether a referral code
    // resolves at all, so a .sql sitting unrun here would mean a partner who has signed
    // everything still cannot go live.
    expect(runnerKeys).toHaveLength(21)
  })

  it('the recovered one says where it came from, and that the constant still rules', () => {
    const f = read(CANON, '20260726_campaign_copilot_columns.sql')
    expect(f).toContain('RECOVERED FROM THE RUNNER')
    expect(f).toContain('copilot_mode')
    expect(f).toContain('approve_before_send')
  })
})

describe('② a copy that can drift is the disease, not the cure', () => {
  it('every tombstoned file is byte-identical to its canonical copy', () => {
    // Consolidating by COPY leaves two files that can drift — which is exactly the problem
    // #273 is about. This turns that risk into a guard: edit one without the other and the
    // gate fails, naming the pair.
    const drifted: string[] = []
    for (const dir of TOMBSTONED) {
      for (const name of sqlFiles(dir)) {
        if (body(read(dir, name)) !== body(read(CANON, name))) drifted.push(`${dir}/${name}`)
      }
    }
    expect(drifted, `body differs from the canonical copy: ${drifted.join(', ')}`).toEqual([])
  })

  it('nothing was rewritten on the way in — 32 files moved, bodies untouched', () => {
    const moved = TOMBSTONED.reduce((n, d) => n + sqlFiles(d).length, 0)
    // THIS is the number that must never move. The tombstoned directories are frozen: new
    // migrations land in the canonical directory ONLY, so 32 stays 32 forever while the
    // canonical count below grows.
    expect(moved).toBe(32)
    // The canonical directory is the 94 that were there + 32 consolidated + 1 recovered
    // = 127 at #273, + 1 (#607's 20260801_retire_trial_status) + 1 (#627's
    // 20260806_app_settings) = 129; +1 (20260806_leads_source, #599) = 130;
    // +1 (20260806_audit_columns, #637/#641) = 131; +1 (20260815_client_partner_seat,
    // R40 — the Client Partner seat + commission types + the #351 unique) = 132;
    // +1 (20260816_partner_contact_details, #202 — address/country/phone, so the document
    // pack is tailored at seat creation instead of carrying [ADDRESS] placeholders) = 133;
    // +1 (20260816_partner_onboarding_flow, R42 — the invite→sign→counter-sign states and
    // the frozen signed-document table) = 134.
    expect(sqlFiles(CANON)).toHaveLength(134)
  })

  it('every consolidated file names its origin, and every original names its replacement', () => {
    // A copy with no provenance is indistinguishable from a duplicate somebody made by
    // accident — and the whole point is that you can trace it back.
    for (const dir of TOMBSTONED) {
      for (const name of sqlFiles(dir)) {
        expect(read(CANON, name), `${CANON}/${name}`).toContain(`original: ${dir}/${name}`)
        expect(read(dir, name), `${dir}/${name}`).toContain(`SUPERSEDED`)
        expect(read(dir, name), `${dir}/${name}`).toContain(`supabase/migrations/${name}`)
      }
    }
  })
})

describe('the READMEs say the thing that is easiest to get wrong', () => {
  const readme = (dir: string) => readFileSync(join(REPO, dir, 'README.md'), 'utf8')

  it('all three directories have one', () => {
    for (const d of [CANON, ...TOMBSTONED]) expect(readme(d).length).toBeGreaterThan(400)
  })

  it('each stale one is marked historical and points at the canonical home', () => {
    for (const d of TOMBSTONED) {
      expect(readme(d)).toContain('do not add migrations here')
      expect(readme(d)).toContain('supabase/migrations')
      // Rule 3 is founder-locked and the reason these files still exist at all.
      expect(readme(d)).toContain('nothing gets deleted')
    }
  })

  it('all three say recording a migration is NOT running one', () => {
    // The single most expensive misunderstanding available here: putting a file in the
    // canonical directory and believing production will get it. Nothing reads the directory.
    for (const d of [CANON, ...TOMBSTONED]) {
      expect(readme(d), d).toContain('pending-migrations.ts')
      expect(readme(d), d).toMatch(/TypeScript constant|the constant/)
    }
  })

  it('the canonical README carries the #554c lesson that cost a production run', () => {
    // DROP POLICY IF EXISTS guards the POLICY, not the TABLE — and one bad line rolls back
    // the whole file, because node-postgres sends multi-statement SQL as one transaction.
    const r = readme(CANON)
    expect(r).toContain('guards the POLICY, not the TABLE')
    expect(r).toContain('to_regclass')
    // Case-insensitive on purpose. `expect(a) || expect(b)` does NOT work — expect THROWS on
    // failure, so the right-hand side is dead code and only the first assertion runs. Written
    // that way here first; caught by red-proving.
    expect(r.toLowerCase()).toContain('idempotent')
  })

  it('the packages/db README carries its own warning — those tables may never have been created', () => {
    // #554c's finding. Treating them as present is how a migration written against them
    // fails in production.
    const r = readme('packages/db/src/migrations')
    expect(r).toContain('never created in production')
    expect(r).toContain('unverified in production')
    expect(r).toContain('#554c')
  })
})

describe('the premise in #273 was wrong, and the correction is written down', () => {
  it('the runner reads a constant, not a directory — asserted against the code', () => {
    // If somebody ever DOES add a directory reader, this fails and the READMEs need
    // rewriting — which is the correct outcome, not a nuisance.
    const runner = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
    expect(runner).toContain('NOT read from disk')
    expect(runner).not.toMatch(/readdirSync|readFileSync\([^)]*migrations/)
  })

  it('two of the runner\'s twelve entries had their file OUTSIDE the canonical dir', () => {
    // So "supabase/migrations is what Vida runs" was not even true of the runner's own
    // contents. Both are canonical now; this pins that they stayed that way.
    for (const k of ['20260726_inbox_smtp', '20260725_client_inboxes']) {
      expect(sqlFiles(CANON)).toContain(`${k}.sql`)
      expect(read(CANON, `${k}.sql`)).toContain('original: apps/api/src/migrations')
    }
  })
})
