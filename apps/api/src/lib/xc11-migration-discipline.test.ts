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
// C-7: the canonical short-sha length and the resolver's own truncation, so this file can
// assert that `ship.sh` conforms to the PRODUCT's number rather than to git's.
import { SHORT_SHA_LENGTH, shortSha } from '@kind/shared'

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
    //
    // ⚠️ COMMENTS STRIPPED FIRST, and this guard caught itself on it: the block's own prose
    // explains that regenerating the website freeze manifest is a "POST-APPROVAL act", and
    // `/POST/` matched that word. A guard a comment can fail is as broken as one a comment
    // can satisfy — the repo's convention is assert on CODE, and this is why.
    const block = ship.slice(ship.indexOf('== 4/4')).replace(/^\s*#.*$/gm, '')
    expect(block).not.toMatch(/railway up|curl -X|--data|POST/)
  })

  it('"not confirmed" is not reported as "failed"', () => {
    // The same distinction XC-3 put into the admin proxy: a build takes minutes, so a read
    // that gives up has stopped waiting — it has not established that the deploy failed.
    expect(ship).toContain('NOT CONFIRMED')
    const tail = ship.slice(ship.indexOf('NOT CONFIRMED'))
    expect(tail).toMatch(/does NOT mean the deploy failed/)
  })

  it('ALL FOUR services are in the read — the contract\'s actual requirement', () => {
    // ⛓️ 18 Sep — RE-AIMED TWICE, AND THIS IS THE END STATE. My first cut read three services
    // and called the item green. GPT verification was right that three-of-four does not
    // satisfy a four-service requirement, so the guard was re-aimed to require the script to
    // declare itself INCOMPLETE. The founder has since approved the website build-identity
    // file by name under #605's own exception, so the requirement is met and the guard now
    // asserts the thing the contract actually asks for.
    const block = ship.slice(ship.indexOf('== 4/4'))
    expect(block).toContain('PENDING="api portal admin website"')
    // …and the incompleteness declaration is GONE, because it would now be false.
    expect(block).not.toMatch(/XC-11 IS \*\*NOT COMPLETE\*\*|XC-11 IS INCOMPLETE/)
    expect(ship).toContain('SHIP_HEALTH_WEBSITE')
    expect(ship).toContain('build-identity.txt')
    expect(block).toContain('#605')
  })

  it('the website is read by BODY CONTENT, never by status — the 200-with-HTML trap', () => {
    // 🛑 THE FINDING THAT MAKES THIS MORE THAN A MISSING ROUTE, AND IT MUST STAY TESTED. The
    // locked `server.js` ends with `app.get('*')` → `sendFile(index.html)`, so EVERY unknown
    // path answers HTTP 200 with 119,926 bytes of markup — measured against the real locked
    // server. A status-only check would report the website green for ever.
    const block = ship.slice(ship.indexOf('== 4/4'))
    expect(block).toMatch(/200 with HTML|119,926|200 with index\.html/i)

    // The website must NOT go through the JSON reader: /health on it returns the home page.
    expect(ship).toContain('read_build_identity')
    expect(ship).toMatch(/if \[ "\$SVC" = "website" \]/)

    // 🛑 THE READER ITSELF MUST VALIDATE THE BODY'S SHAPE. Hex only, sha-length — an HTML page,
    // an error page or a CDN interstitial cannot satisfy that whatever it answers with.
    const fn = ship.slice(ship.indexOf('read_build_identity() {'), ship.indexOf('CONFIRMED=""'))
    expect(fn).toContain('build-identity.txt')
    expect(fn).toMatch(/\[!0-9a-fA-F\]/)                       // rejects any non-hex character
    expect(fn).toMatch(/-ge 7/)                                // …and enforces a sha length
    expect(fn).toContain('|| true')                            // still cannot abort the ship
  })

  it('the freeze excludes the file BY NAME, for the right reason, and stays narrow', () => {
    const freeze = read('apps/api/src/lib/website-freeze.test.ts')
    expect(freeze).toContain("if (name === 'build-identity.txt') continue")
    // ⚠️ THE REASON MATTERS AS MUCH AS THE EXCLUSION. "Dotfiles are never served" is the
    // rationale for `.deploy-stamp` and it is exactly INVERTED here — this file is
    // deliberately not a dotfile so that it CAN be served. The comment must say the real
    // thing: a ship-time artifact holding only the sha, which cannot alter a page.
    const at = freeze.indexOf("if (name === 'build-identity.txt')")
    const why = freeze.slice(Math.max(0, at - 1600), at)
    expect(why).toMatch(/SHIP-TIME ARTIFACT/i)
    expect(why).toMatch(/cannot alter a page/i)
    expect(why).toMatch(/#605/)
    expect(why).toMatch(/NOT FOR THE DOTFILE REASON|deliberately \*not\* a dotfile/i)
    // And nothing else is relaxed: both freeze assertions are still there.
    expect(freeze).toContain('no file has been added or removed')
    expect(freeze).toContain('WEBSITE CHANGED WITHOUT FOUNDER APPROVAL')
  })

  it('the file is NOT gitignored — an ignored file never reaches the deployed artifact', () => {
    // 🛑 THE TRAP THE OTHER WAY. `railway up` respects `.gitignore` — `.gitignore` itself
    // records that about `.deploy-stamp`. Ignoring this file would mean it is never shipped,
    // and the read below would poll for something that does not exist, for ever.
    //
    // ⚠️ PATTERN LINES ONLY, COMMENTS STRIPPED — and this guard caught itself on it for the
    // third time in this batch. `.gitignore` now carries a NOTE *explaining* that this file
    // must never be ignored, and a raw match found the word inside that very explanation. A
    // guard a comment can fail is as broken as one a comment can satisfy; in a gitignore the
    // comment is prose and the pattern line is the code.
    const patterns = read('.gitignore')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '' && !l.startsWith('#'))
    expect(patterns.filter(l => /build-identity/.test(l)),
      'build-identity.txt is gitignored, so `railway up` would strip it from the upload').toEqual([])
    // …and the NOTE itself must be there, so the next person does not re-add the pattern.
    expect(read('.gitignore')).toMatch(/build-identity\.txt/)
  })

  it('every URL it reads is overridable, so a staging ship does not poll production', () => {
    for (const v of ['SHIP_HEALTH_API', 'SHIP_HEALTH_PORTAL', 'SHIP_HEALTH_ADMIN']) {
      expect(ship, `${v} must be overridable`).toContain(`\${${v}:-`)
    }
  })

  // ══════════════════════════════════════════════════════════════════════════════════════
  // C-7 · THE TWO SIDES MUST TRUNCATE THE SHA THE SAME WAY (founder-approved 17 Sep)
  //
  // ── THE DEFECT, AND WHY EVERY GREEN TEST MISSED IT ────────────────────────────────────
  //
  // `@kind/shared` truncates a reported commit to `SHORT_SHA_LENGTH = 7`. `ship.sh` derived
  // the shipped sha with `git rev-parse --short`, which on THIS repository returns **8**
  // (`4977e45e`, not `4977e45`) — git widens its abbreviation as the object count grows. The
  // comparison `[ "$GOT" = "$HEAD" ]` therefore compared 7 characters against 8 and could
  // never match, so XC-11's four-service confirmation was unachievable here.
  //
  // 🛑 NOTHING IN THE UNIT SUITE COULD SEE IT, and the reason generalises: every test of the
  // resolver fed it a value and checked the resolver's own truncation — a value compared
  // against itself. The two sides never met until the full-stack harness ran the real
  // services and read them with the real script.
  //
  // ⚠️ THE PRODUCT OWNS THE LENGTH, NOT GIT. `SHORT_SHA_LENGTH` stays 7 and the script
  // conforms to it. `--short` is banned outright rather than pinned with `--short=7`,
  // because a length that lives in two places is a length that drifts.
  // ══════════════════════════════════════════════════════════════════════════════════════
  describe('C-7 · the shipped sha and the reported sha are the same 7 characters', () => {
    it('ship.sh truncates the FULL sha itself and never asks git to abbreviate', () => {
      expect(ship, 'ship.sh must read the full sha').toMatch(/HEAD_FULL=\$\(git rev-parse HEAD\)/)
      expect(ship, 'ship.sh must truncate to 7 in the shell').toMatch(/HEAD="\$\{HEAD_FULL:0:7\}"/)

      // 🛑 `git rev-parse --short` MUST BE GONE FROM THE SHIPPING PATH. Comments stripped
      // first — this block's own prose names the banned command, and a guard a comment can
      // fail is as broken as one a comment can satisfy (the repo's convention, and the
      // `/POST/` incident three tests above is why it is spelled out again here).
      const code = ship.replace(/^\s*#.*$/gm, '')
      expect(code, 'git rev-parse --short must not decide the shipped sha').not.toMatch(/rev-parse --short/)
    })

    it('7 is the PRODUCT\'s number — the script conforms to SHORT_SHA_LENGTH, not the reverse', () => {
      // If anybody changes `SHORT_SHA_LENGTH`, this fails and names the other side, instead
      // of the mismatch reappearing silently in a deploy nobody can confirm.
      expect(SHORT_SHA_LENGTH, 'SHORT_SHA_LENGTH is the canonical length and stays 7').toBe(7)
      expect(ship).toContain(`:0:${SHORT_SHA_LENGTH}}`)
    })

    it('the SAME $HEAD drives both stamps and the comparison — one value, four services', () => {
      // The failure shape this closes is a script that truncates for the comparison but
      // stamps something else, which would report a mismatch for ever.
      expect(ship, 'the app deploy stamp').toMatch(/echo "\$HEAD" > "apps\/\$APP\/\.deploy-stamp"/)
      expect(ship, 'the website build identity').toMatch(/echo "\$HEAD" > "apps\/website\/build-identity\.txt"/)
      expect(ship, 'the comparison').toMatch(/\[ "\$GOT" = "\$HEAD" \]/)
    })

    it('a real 40-character sha truncates to exactly what the resolver reports', () => {
      // Both sides, computed from one input, asserted to agree — the assertion that was
      // missing. `shortSha` is the resolver's own truncation; `:0:7` is the script's.
      const full = 'e4b061cdf6b3d21ecd95a7a9b20cfce3c48b8f38'
      expect(full).toHaveLength(40)
      expect(shortSha(full)).toBe(full.slice(0, 7))
      expect(shortSha(full)).toHaveLength(SHORT_SHA_LENGTH)
      // …and the 8-character value git actually handed us must NOT equal the reported one,
      // which is the defect stated as an assertion so it cannot come back.
      expect(full.slice(0, 8)).not.toBe(shortSha(full))
    })
  })
})
