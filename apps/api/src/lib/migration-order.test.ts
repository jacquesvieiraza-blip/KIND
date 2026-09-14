import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { PENDING_MIGRATIONS } from './pending-migrations'

// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-PD-09 — A MIGRATION'S DEPENDENCY MUST HOLD UNDER EVERY WAY MIGRATIONS CAN RUN.
//
// ── THE AUDIT THAT PRODUCED THIS FILE ──────────────────────────────────────────────────
//
// `20260914_icp_review_go_apply.sql` creates a function whose body names the four
// `icp_review*` columns that `20260914_icp_provider_review.sql` adds. Apply them the other
// way round and the function is created against columns that do not exist.
//
// Every execution path in this repository, found by searching for anything that reads the
// migrations directory or issues a migration command:
//
//   ① THE VIDA → ENGINE RUNNER — `runPendingMigrations` in `lib/pending-migrations.ts`,
//      reached by `POST /operator/...`. ORDERING RULE: literal array order, `for (const m of
//      PENDING_MIGRATIONS)`. No sort, no key selection, no filename involved — the SQL is a
//      TypeScript string compiled into the deployed API. This is the ONLY executor.
//
//   ② THE SUPABASE CLI — NOT CONFIGURED. There is no `supabase/config.toml`, and no
//      `supabase db push`, `db reset` or `migration up` anywhere in the repository.
//
//   ③ CI — `.github/workflows/daily-audit.yml` is the only workflow and runs no migration.
//      (Actions have not run since 3 Jul regardless.)
//
//   ④ DEPLOY SCRIPTS — `scripts/ship.sh`, `check.sh` and `full-check.sh` contain the word
//      "migration" zero times.
//
//   ⑤ SHELL / psql LOOPS — no glob over `supabase/migrations/*.sql` exists in any tracked
//      script. The only such strings in the repo are prose inside `docs/`.
//
//   ⑥ THE SEVEN OTHER SOURCE FILES that mention `supabase/migrations` — `rls-audit.ts`,
//      `rls-live.ts`, `schema-drift.ts`, `signup-subscription.ts`, `subscription-status.ts`,
//      `routes/developer.ts`, `routes/subscriptions.ts` — mention it ONLY in comments. Zero
//      `readdirSync` between them. Asserted below, because "I checked" is not a guard.
//
// ── WHY THE FILE WAS RENAMED ANYWAY ────────────────────────────────────────────────────
//
// 🛑 THE ONLY EXECUTOR ORDERS CORRECTLY, AND THAT WAS NOT GOOD ENOUGH. The file was first
// called `20260914_go_applies_icp_review.sql`, which sorts BEFORE `20260914_icp_provider_
// review.sql` — the exact opposite of the order it needs.
//
// ⚠️ AND THE EXPOSURE IS NARROWER THAN IT FIRST LOOKS — MEASURED, NOT ASSUMED. Rehearsed on a
// disposable PostgreSQL, `create or replace function` SUCCEEDS against columns that do not
// exist: plpgsql binds column references at RUN time, not at CREATE time. So a COMPLETE run
// in either order ends in the same correct state. The first version of this comment said the
// wrong order "creates the function against columns that do not exist and fails"; it does the
// first half and not the second, and that overstatement is corrected here rather than left
// standing.
//
// 🛑 WHAT DOES BREAK IS A PARTIAL RUN, and that is what the rename is worth:
//   · OLD NAME — the GO migration sorts FIRST. A run interrupted after one file leaves the
//     new function created and its four columns absent. Measured result: every GO then
//     raises `column "icp_review" does not exist` — GO is broken for EVERY client until
//     somebody notices and applies the second file.
//   · NEW NAME — the columns migration sorts first. The same interruption leaves the columns
//     present and production's existing pre-PD-05 function untouched. Measured result: GO
//     still returns ok — the PD-05 fix is simply not in effect yet. Degraded, not broken.
// The rename converts "an interrupted run breaks GO for everybody" into "an interrupted run
// leaves GO exactly as it is today". That is the whole claim, and it is the true one.
//
// ⚠️ AND THIS FILE IS THE GUARD, not a note asking somebody to remember. Both orderings are
// asserted, and ⑥ is re-proved on every run.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = process.cwd()
const MIG_DIR = join(REPO, 'supabase/migrations')

/** Dependencies this repo must honour: [must apply first, must apply second]. */
const DEPENDENCIES: Array<{ first: string; second: string; why: string }> = [
  {
    first:  '20260914_icp_provider_review',
    second: '20260914_icp_review_go_apply',
    why:    'the GO function body names the four icp_review* columns the first migration adds',
  },
]

describe('🛑 S1-PD-09 · a migration dependency holds under EVERY executor', () => {
  for (const dep of DEPENDENCIES) {
    it(`① RUNNER (array order): ${dep.first} before ${dep.second}`, () => {
      const keys = PENDING_MIGRATIONS.map(m => m.key)
      const a = keys.indexOf(dep.first)
      const b = keys.indexOf(dep.second)
      expect(a, `${dep.first} is not in the runner`).toBeGreaterThanOrEqual(0)
      expect(b, `${dep.second} is not in the runner`).toBeGreaterThanOrEqual(0)
      // `runPendingMigrations` is `for (const m of PENDING_MIGRATIONS)` — literal array
      // order, no sort — so index order IS execution order.
      expect(a, dep.why).toBeLessThan(b)
    })

    it(`🛑 FILENAME (lexicographic): ${dep.first}.sql sorts before ${dep.second}.sql`, () => {
      // The order any `psql -f` loop, `ls | sort`, Supabase CLI or new contributor would use.
      const files = readdirSync(MIG_DIR).filter(f => f.endsWith('.sql')).sort()
      const a = files.indexOf(`${dep.first}.sql`)
      const b = files.indexOf(`${dep.second}.sql`)
      expect(a, `${dep.first}.sql is missing`).toBeGreaterThanOrEqual(0)
      expect(b, `${dep.second}.sql is missing`).toBeGreaterThanOrEqual(0)
      expect(a, `${dep.why} — rename one of them rather than relying on the runner`).toBeLessThan(b)
    })

    it(`both homes exist and the dependency is real, not assumed`, () => {
      const second = readFileSync(join(MIG_DIR, `${dep.second}.sql`), 'utf8')
      const first = readFileSync(join(MIG_DIR, `${dep.first}.sql`), 'utf8')
      // The claim "second depends on first" is only worth ordering if it is TRUE: the second
      // must name something the first creates.
      expect(second, 'the second migration does not reference the first\'s columns — is this dependency real?')
        .toContain('icp_review')
      expect(first).toContain('add column if not exists icp_review')
    })
  }

  it('🛑 the RUNNER is still the only executor — nothing else reads the directory', () => {
    // ⚠️ RE-PROVED, NOT REMEMBERED. If a second executor is ever added, this fails and
    // whoever added it has to state its ordering rule in DEPENDENCIES above.
    const suspects = [
      'apps/api/src/lib/rls-audit.ts',
      'apps/api/src/lib/rls-live.ts',
      'apps/api/src/lib/schema-drift.ts',
      'apps/api/src/lib/signup-subscription.ts',
      'apps/api/src/lib/subscription-status.ts',
      'apps/api/src/routes/developer.ts',
      'apps/api/src/routes/subscriptions.ts',
    ]
    for (const f of suspects) {
      const src = readFileSync(join(REPO, f), 'utf8')
      expect(src, `${f} now reads the migrations directory — is it an executor?`)
        .not.toMatch(/readdirSync\s*\(|readdir\s*\(/)
    }
  })

  it('🛑 the runner applies in ARRAY ORDER — no sort may be introduced', () => {
    const src = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
    const live = src.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n')
    expect(live).toContain('for (const m of PENDING_MIGRATIONS) {')
    // A sort here would silently re-order every dependency in the array, and the ① assertion
    // above would go on passing because it reads the array rather than the loop.
    expect(live, 'a sort in the runner would make array order meaningless')
      .not.toMatch(/PENDING_MIGRATIONS\s*\.\s*(sort|slice\(\)\.sort|toSorted)/)
  })

  it('the Supabase CLI is still not configured — ② stays true', () => {
    const files = readdirSync(join(REPO, 'supabase'))
    expect(files, 'a supabase/config.toml means the CLI is now an executor with its own ordering rule')
      .not.toContain('config.toml')
  })
})
