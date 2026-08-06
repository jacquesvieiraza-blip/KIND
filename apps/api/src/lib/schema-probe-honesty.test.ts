// #630 — THE SCHEMA SECTION CALLED A LIVE GUARD MISSING, AND THE PAGE CONTRADICTED ITSELF.
//
// On 6 Aug the founder pasted the Supabase session-pooler string into `DATABASE_URL`, redeployed,
// and ran the migrations. All **14 of 14** applied — confirmed by the RLS audit connecting through
// `aws-0-eu-west-1.pooler.supabase.com:5432` on the same screen. The System check then reported:
//
//     cron_claims — CHECKED · BROKEN — MISSING in production: . Consequence: …
//
// Note the empty message after the colon. Four sections further down, the **replica-count probe
// asked the same table for `job`** and printed *"the cron_claims single-run guard is in place
// (#343)"*. One page, one table, two opposite verdicts — and the wrong one was the loud one.
//
// TWO CAUSES, and the second is the one that matters:
//
//   ① `REQUIRED_SCHEMA` gave `cron_claims` no column, so the probe fell through to
//      `select(req.column ?? 'id')`. `cron_claims` has a composite PK `(job, slot)` and **no id
//      column**, so PostgREST returned a COLUMN error — never a table error.
//
//   ② `schema()` had ONE failure branch: any error → `broken("MISSING in production")`. A missing
//      column, a timeout, an auth failure and a blank response all rendered identically, each
//      with a migration to go and run. That is the law from `schema-probe.ts`'s own header
//      inverted: *"A probe that could not run returns UNKNOWABLE, never 'missing.'"* — the #565
//      class, on the one screen built to end it.
//
// ⚠️ ASSERTIONS ARE ANCHORED ON THE ENTRY AND THE BRANCH THEY ARE ABOUT — never a fixed character
// window, never a comment. Both of those have produced tests here that passed with the code
// deleted (the `// #108` anchor read through the comment-stripper, the 700-char window that
// overran its own subject).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { isMissingTable } from './schema-probe'
import { stripCommentsForEnvScan } from './env-inventory'

const probes = stripCommentsForEnvScan(readFileSync(join(__dirname, 'system-probes.ts'), 'utf8'))

/** The `schema()` body, bounded by the next top-level function — not a char count. */
function schemaBody(): string {
  const at = probes.indexOf('async function schema()')
  expect(at, 'schema() must exist').toBeGreaterThan(-1)
  const end = probes.indexOf('async function ', at + 10)
  return probes.slice(at, end > at ? end : undefined)
}

/** The one `REQUIRED_SCHEMA` entry for a table, bounded by its own braces. */
function entryFor(table: string): string {
  const at = probes.indexOf(`{ table: '${table}'`)
  expect(at, `a REQUIRED_SCHEMA entry for ${table} must exist`).toBeGreaterThan(-1)
  const end = probes.indexOf('}', at)
  return probes.slice(at, end + 1)
}

describe('#630 cron_claims is asked for a column it actually HAS', () => {
  it('the entry names `job`, not the id default', () => {
    // The table's PK is (job, slot). Asking for `id` cannot ever succeed, so the row could only
    // ever be red — a permanently-failing check trains the operator to skip the whole section.
    const entry = entryFor('cron_claims')
    expect(entry).toContain("column: 'job'")
  })

  it('and it still names its migration, so a REAL absence stays actionable', () => {
    expect(entryFor('cron_claims')).toContain('20260727_cron_claims')
  })

  it('every other entry that relies on the id default is a table that HAS an id', () => {
    // Guards the next person adding a table with a composite key. These six were all verified
    // CHECKED-OK against production on 6 Aug, which is what proves they have an `id`.
    const idDefaulted = ['client_inboxes', 'figsy_enrollments', 'figsy_replies',
      'calendar_bookings', 'opt_out_blocklist', 'operator_audit_log']
    for (const t of idDefaulted) {
      expect(entryFor(t), `${t} relies on the id default`).not.toContain('column:')
    }
    // cron_claims is deliberately NOT in that list any more.
    expect(entryFor('cron_claims')).toContain('column:')
  })
})

describe('#630 the schema probe CLASSIFIES its errors instead of guessing', () => {
  it('a genuinely missing table is still BROKEN and still names the migration', () => {
    // The branch that must survive: when the table really is absent, the operator needs the
    // migration name, not a shrug.
    const body = schemaBody()
    const at = body.indexOf('isMissingTable(')
    expect(at, 'the classification must exist').toBeGreaterThan(-1)
    const branch = body.slice(at, body.indexOf('unmeasured(', at))
    expect(branch).toContain('broken(')
    expect(branch).toContain('MISSING in production')
    expect(branch).toContain('req.migration')
  })

  it('ANY OTHER error is NOT-MEASURED — never "missing", never a pass', () => {
    // The defect: one `if` turned a missing column into a missing table. NOT-MEASURED is a real
    // answer (`schema-probe.ts`'s third verdict) and this branch is where it lives.
    const body = schemaBody()
    const at = body.indexOf('unmeasured(')
    expect(at, 'the not-measured branch must exist').toBeGreaterThan(-1)
    const branch = body.slice(at)
    expect(branch).toContain('NOT evidence it is absent')
    expect(branch).toContain('NOT a pass')
  })

  it('it IMPORTS isMissingTable rather than growing a third copy', () => {
    // #627 hoisted this out of cron-guard's inline copy precisely so a third definition cannot
    // appear — two call sites disagreeing about what "missing" means is the whole failure mode.
    const body = schemaBody()
    expect(body).toContain("await import('./schema-probe')")
    expect(body).not.toMatch(/42P01|PGRST205/)
  })

  it('an EMPTY error message is reported as empty, not dressed up', () => {
    // The founder's actual screen read "MISSING in production: ." — the blank was the clue that
    // this was never a table error. Saying so plainly is what makes the next one diagnosable.
    expect(schemaBody()).toContain('an error with no message')
  })
})

describe('#630 the classifier itself — the judgement, provable without a database', () => {
  it('says YES to a real missing-table error', () => {
    expect(isMissingTable({ code: 'PGRST205', message: "Could not find the table 'public.x' in the schema cache" })).toBe(true)
    expect(isMissingTable({ code: '42P01', message: 'relation "x" does not exist' })).toBe(true)
  })

  it('says NO to a missing COLUMN — the exact error cron_claims was returning', () => {
    // 42703 is column-does-not-exist. Reading it as "no such table" is what sent the founder to
    // re-run a migration that had already succeeded.
    expect(isMissingTable({ code: '42703', message: 'column "id" does not exist' })).toBe(false)
    expect(isMissingTable({ code: 'PGRST204', message: "Could not find the 'id' column" })).toBe(false)
  })

  it('says NO to an outage, an auth failure, or a blank error', () => {
    expect(isMissingTable({ code: '57014', message: 'canceling statement due to statement timeout' })).toBe(false)
    expect(isMissingTable({ code: '42501', message: 'permission denied' })).toBe(false)
    expect(isMissingTable({ code: null, message: null })).toBe(false)
    expect(isMissingTable({})).toBe(false)
  })
})
