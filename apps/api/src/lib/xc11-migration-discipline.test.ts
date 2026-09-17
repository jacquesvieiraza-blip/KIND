// ═══════════════════════════════════════════════════════════════════════════════════════
// XC-11 · MIGRATION DISCIPLINE, AND KNOWING WHAT IS ACTUALLY SERVING
//
// ── THE THREE RULES THE CONTRACT SETS FOR A MIGRATION ──────────────────────────────────
//
// No migration lands without:
//   (a) an EXPAND/CONTRACT statement — which phase this is, and what the other phase will be;
//   (b) code that tolerates the new column's absence LOUDLY;
//   (c) presence in BOTH homes — `supabase/migrations/` (the reviewable record) and
//       `PENDING_MIGRATIONS` (the only executor).
//
// 🛑 WHY (b) IS THE ONE THAT ACTUALLY BITES. On this repo the CODE SHIPS BEFORE THE MIGRATION
// IS RUN, every single time: `main` is live, and migrations are applied by hand from Vida
// afterwards. So there is ALWAYS a window where the new column does not exist — and
// supabase-js answers a missing column with `{data: null, error}`, which the repository's
// standing defect (553 unchecked destructures) reads as EMPTY. "No rows" and "that column
// does not exist" are then the same answer, and the second one is silent.
//
// ── AND THE DEPLOY HALF ────────────────────────────────────────────────────────────────
//
// `ship.sh` proved an UPLOAD was accepted and then told the founder to go and check four
// Railway dashboards by hand. Nobody does that, so "I deployed and nothing changed" survived
// for months. The read is now in the script — and it compares COMMITS, because a 200 from
// last week's build is the failure mode, not a 500.
//
// ⚠️ ASSERTED ON FILES, and on CODE rather than prose where a source guard is used.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(__dirname, '..', '..', '..', '..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

/** Every migration this batch adds. Both are dated 17 Sep and both are EXPAND-only. */
const BATCH_1_MIGRATIONS = [
  '20260917_operator_tasks_and_automatic_work',
  '20260917_proof_fence_in_records',
] as const

describe('XC-11 · every migration in this batch states its phase and lives in both homes', () => {
  const runner = read('apps/api/src/lib/pending-migrations.ts')

  for (const key of BATCH_1_MIGRATIONS) {
    describe(key, () => {
      const canonical = read(`supabase/migrations/${key}.sql`)

      it('(a) states the EXPAND/CONTRACT phase, and what the contract step would be', () => {
        // ⚠️ NOT just the word "EXPAND". A migration that says "expand" and nothing about the
        // other half leaves the next person guessing whether a contract is owed at all — and
        // an owed-but-unwritten contract is how two sources of truth become permanent.
        expect(canonical).toMatch(/EXPAND/)
        expect(canonical).toMatch(/CONTRACT/i)
        expect(canonical, 'the contract phase must be named as a LATER, separate migration')
          .toMatch(/later,? separate migration|Contract is a later migration/i)
      })

      it('(b) names the absence tolerance, and the code that provides it', () => {
        expect(canonical).toMatch(/toleran|tolerates|does not exist yet|absence/i)
      })

      it('(c) is in BOTH homes, with the same key', () => {
        // 🛑 ONE HOME ONLY IS TWO DIFFERENT BUGS. In `supabase/migrations` alone it can never
        // run (nothing globs that directory — `migration-order.test.ts` proves it). In
        // `PENDING_MIGRATIONS` alone it runs with no reviewable record of what it did.
        expect(runner, `${key} is not in PENDING_MIGRATIONS`).toContain(`key: '${key}'`)
        expect(canonical.length, 'the canonical file is empty').toBeGreaterThan(200)
      })

      it('is idempotent — it must survive the runner replaying it on every run', () => {
        // ⚠️ SQL WITH ITS `--` COMMENTS STRIPPED. The file's own header EXPLAINS the invalid
        // `CREATE POLICY IF NOT EXISTS` syntax on purpose (it is why
        // `20260525_milla_vida_tables.sql` has never been able to execute), so a guard over
        // the raw text matches the explanation and fails on the very note warning about it.
        // This is the repo's standing convention and it caught this guard on its first run.
        const sql = canonical.replace(/--.*$/gm, '')
        // The runner has no applied-state gate on the statements themselves: it replays every
        // key, every run. A non-idempotent statement therefore fails on run two, for ever.
        expect(sql).toMatch(/IF NOT EXISTS|CREATE OR REPLACE|DO \$\$/)
        // PostgreSQL has NO `CREATE POLICY IF NOT EXISTS`. Every CREATE POLICY needs a
        // DROP POLICY IF EXISTS before it.
        const policies = (sql.match(/CREATE POLICY/g) ?? []).length
        const drops = (sql.match(/DROP POLICY IF EXISTS/g) ?? []).length
        expect(sql).not.toMatch(/CREATE POLICY IF NOT EXISTS/)
        expect(drops, 'every CREATE POLICY needs a DROP POLICY IF EXISTS first').toBeGreaterThanOrEqual(policies)
      })
    })
  }

  it('the two new tables are tolerated in code by CODE, not by a comment', () => {
    const tasks = read('apps/api/src/lib/operator-tasks.ts')
    const work = read('apps/api/src/lib/automatic-work.ts')
    const ledger = read('apps/api/src/lib/migration-ledger.ts')
    // 42P01 is undefined_table. Each module tells "the migration has not run" apart from
    // "there is nothing to report", which are opposite answers with the same shape.
    for (const [name, src] of [['operator-tasks', tasks], ['automatic-work', work], ['migration-ledger', ledger]] as const) {
      expect(src, `${name} does not detect a missing table`).toContain('42P01')
    }
    // …and each says which migration to run, because "table missing" without a name is a
    // dead end for whoever reads it.
    expect(tasks).toContain('20260917_operator_tasks_and_automatic_work')
    expect(work).toContain('20260917_operator_tasks_and_automatic_work')
    expect(ledger).toContain('20260917_operator_tasks_and_automatic_work')
  })

  it('the record fence tolerates its own column being absent, without inventing a number', () => {
    const icps = read('apps/api/src/routes/icps.ts')
    // The alert reads `proof_monthly_cap_records`, which does not exist until J5-C9 runs.
    // A destructured read would show `{}` and `Number(undefined)` is NaN — printed, that is
    // "of the NaN-record ceiling". The error is checked and the sentence says it could not
    // be read, which is the honest alternative to a fabricated ceiling.
    expect(icps).toContain('settingsErr')
    expect(icps).toMatch(/capKnown/)
    expect(icps).toContain('ceiling could NOT be read')
  })
})

describe('XC-11 · ship.sh reads what is actually serving', () => {
  const ship = read('scripts/ship.sh')

  it('the deploy targets are untouched — all four, in the same order', () => {
    // 🛑 THE NO-TOUCH LINE IN THE CONTRACT. The health read is additive; a change to any of
    // these four is a change to what gets deployed, which is not this item's business.
    for (const target of ['deploy "@kind/api"    "api"', 'deploy "@kind/portal" "portal"', 'deploy "@kind/admin"  "admin"', 'deploy "KIND"         "website"']) {
      expect(ship, `a deploy target moved: ${target}`).toContain(target)
    }
    expect((ship.match(/^deploy "/gm) ?? [])).toHaveLength(4)
  })

  it('it compares the REPORTED commit against the shipped one', () => {
    // A 200 is not evidence. The failure this exists for is a healthy service happily
    // serving the previous build, which answers 200 all day.
    expect(ship).toContain('"commit"')
    expect(ship).toMatch(/\[ "\$GOT" = "\$HEAD" \]/)
  })

  it('it is read-only, and cannot abort the ship', () => {
    // ⚠️ `set -euo pipefail` IS ON. A `curl` to an unreachable service returns non-zero, and
    // with pipefail that fails the command substitution — which under `set -e` would abort
    // the script AFTER the deploys, turning a reporting step into a ship failure.
    const fn = ship.slice(ship.indexOf('read_commit() {'), ship.indexOf('CONFIRMED=""'))
    expect(fn).toContain('|| true')
    expect(fn).toContain('return 0')
    // Only GETs. Nothing in this block may write, deploy or migrate.
    const block = ship.slice(ship.indexOf('== 4/4'))
    expect(block).not.toMatch(/railway up|curl -X|--data|POST/)
  })

  it('"not confirmed" is not reported as "failed"', () => {
    // The same distinction XC-3 put into the admin proxy: a build takes minutes, so a read
    // that gives up has stopped waiting — it has not established that the deploy failed.
    expect(ship).toContain('NOT CONFIRMED')
    const tail = ship.slice(ship.indexOf('NOT CONFIRMED'))
    expect(tail).toMatch(/does NOT mean the deploy failed/)
  })

  it('and it says out loud that the website is not covered, rather than implying it is', () => {
    // 🛑 THE HONEST GAP. `apps/website/server.js` is founder-locked (#605) and has no /health
    // route; `website-freeze.test.ts` refuses one. Adding the route to make the list
    // symmetrical would break a lock to satisfy a script.
    const block = ship.slice(ship.indexOf('== 4/4'))
    expect(block).toMatch(/WEBSITE is not in this check|website is not covered/i)
    expect(block).toContain('#605')
    // Three services, named — never "all four".
    expect(block).toContain('PENDING="api portal admin"')
    expect(block).not.toMatch(/all four services are serving/i)
  })

  it('every URL it reads is overridable, so a staging ship does not poll production', () => {
    for (const v of ['SHIP_HEALTH_API', 'SHIP_HEALTH_PORTAL', 'SHIP_HEALTH_ADMIN']) {
      expect(ship, `${v} must be overridable`).toContain(`\${${v}:-`)
    }
  })
})
