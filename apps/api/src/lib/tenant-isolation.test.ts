// ═══════════════════════════════════════════════════════════════════════════════════════
// TENANT ISOLATION — reconciled against ACTUAL PRODUCTION (BUILD-003 item 1).
//
// ⛓️ THIS SUITE WAS REWRITTEN 29 Aug, and the reason is the most useful thing in it.
//
// The first version asserted a migration built from the REPO's migration history. The
// founder then inspected production directly, and two of the nine classifications were
// wrong: the four `figsy_*` tables do NOT have zero policies — they have four, created
// outside the migration record, named "clients see own campaigns" and so on, all command
// ALL. My migration dropped names I had invented, which would have matched nothing, and its
// CREATEs would have ADDED a second policy beside each real one. PostgreSQL ORs permissive
// policies, so the result would have been STRICTLY MORE access while the PR claimed
// SELECT-only.
//
// The old suite passed against that. It could not have caught it: it read my own file and
// checked my own names against themselves. A guard that only compares a migration to itself
// proves the migration is self-consistent and nothing about the database.
//
// So this suite now asserts the REAL production policy names. If a name is wrong, its DROP
// silently misses and its CREATE adds rather than replaces — the exact failure mode, and the
// only thing standing between the intent and the opposite of it.
//
// ⚠️ CLAIM BOUNDARY, UNCHANGED AND WORTH REPEATING. There is no Postgres here. These prove
// the migration NAMES what production actually has and narrows it in the intended direction.
// That the database enforces the result is RUNTIME UNVERIFIED.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

const RAW = readFileSync(join(__dirname, '../../../../supabase/migrations/20260829_delivery_rls.sql'), 'utf8')

/**
 * SQL with its `--` comment lines removed.
 *
 * ⚠️ `stripCommentsForEnvScan` DOES NOT DO THIS — it strips JS/TS comments, and against a
 * .sql file it returns the input unchanged (verified: 8041 chars in, 8041 out). Two guards
 * below passed the wrong text because of that and then failed on the file's own prose: the
 * header EXPLAINS that service_role is deliberately untouched, and a statement-level check
 * reading the whole file saw the word and called it a violation. Seventh time in this repo a
 * guard has tripped over its own documentation, and the fix is the same every time — assert
 * against the statements, keep the prose.
 */
const STATEMENTS = RAW.split('\n').filter(l => !l.trimStart().startsWith('--')).join('\n')
  .replace(/[ \t]+/g, ' ')
/**
 * Whitespace-normalised.
 *
 * ⚠️ The first cut matched the exact bytes and failed against my own file, because the DROP
 * statements are COLUMN-ALIGNED — two spaces before `ON`, not one. A guard that depends on
 * the formatting of the thing it guards fails on a reformat and tells you nothing about the
 * SQL. Runs of whitespace are collapsed so the assertions test the STATEMENT.
 */
const RLS = RAW.replace(/[ \t]+/g, ' ')

/**
 * The four policies PRODUCTION actually has, by their real names, and what they must become.
 *
 * ⚠️ THESE STRINGS ARE THE MIGRATION'S LOAD-BEARING DETAIL. They came from the founder
 * reading `pg_policies` on 29 Aug, not from this repository — the repository never recorded
 * whatever created them, which is precisely how the first version got it wrong.
 */
const REAL_POLICIES = [
  { table: 'figsy_campaigns',   name: 'clients see own campaigns' },
  { table: 'figsy_enrollments', name: 'clients see own enrollments' },
  { table: 'figsy_replies',     name: 'clients see own replies' },
  { table: 'figsy_sent_emails', name: 'clients see own sent emails' },
]

/** Tables production is ALREADY correct on. The migration must not mention them at all. */
const LEAVE_ALONE = ['leads', 'icps', 'lead_pool', 'sourcing_ledger']

/** The service-role bypasses the API depends on (002_figsy.sql:150-161). */
const SERVICE_ROLE_POLICIES = [
  'service role bypass campaigns',
  'service role bypass enrollments',
  'service role bypass sent emails',
  'service role bypass replies',
]

describe('the sweep is not vacuous', () => {
  it('there are real policies to reconcile', () => {
    expect(REAL_POLICIES.length).toBe(4)
  })

  it('the migration is not empty (a no-op file would pass every check below)', () => {
    expect(RLS.replace(/\s/g, '').length).toBeGreaterThan(200)
  })
})

describe('THE FOUR REAL POLICIES ARE DROPPED BY THEIR REAL NAMES', () => {
  for (const { table, name } of REAL_POLICIES) {
    it(`${table} — "${name}" is dropped, so the DROP actually bites`, () => {
      expect(
        RLS,
        `The DROP must name the policy PRODUCTION has. A DROP naming something else is a silent no-op, and the CREATE then ADDS a second policy — permissive policies are ORed, so access WIDENS while the migration claims to narrow it.`,
      ).toContain(`DROP POLICY IF EXISTS "${name}" ON public.${table};`)
    })
  }

  it('NO INVENTED NAME SURVIVES from the first version', () => {
    // These were mine. Every one of them would have missed.
    for (const invented of ['figsy_campaigns_own', 'figsy_enrollments_own',
                            'figsy_replies_own', 'figsy_sent_emails_own', 'blocklist_own"']) {
      expect(RLS, `invented policy name still present: ${invented}`).not.toContain(`CREATE POLICY "${invented.replace('"', '')}"`)
    }
  })
})

describe('EACH IS RECREATED AS TENANT-SCOPED AND SELECT-ONLY', () => {
  for (const { table, name } of REAL_POLICIES) {
    it(`${table} — SELECT only, scoped to the caller`, () => {
      const stmt = createStatementFor(name)
      expect(stmt, `no CREATE POLICY "${name}"`).not.toBeNull()
      expect(stmt!).toContain('FOR SELECT')
      expect(stmt!, 'ALL would keep the client\'s UPDATE/DELETE on their own delivery record').not.toContain('FOR ALL')
      expect(stmt!).toMatch(/client_id\s*=\s*public\.current_client_id\(\)/)
      // `auth.role() = 'authenticated'` is true for EVERY signed-in user — not a tenant
      // predicate at all, and exactly what made the blocklist policies defective.
      expect(stmt!).not.toContain('auth.role()')
      expect(stmt!).toContain('TO authenticated')
    })
  }

  it('the name is REUSED, so the migration is idempotent against its own result', () => {
    for (const { name } of REAL_POLICIES) {
      expect(RLS).toContain(`DROP POLICY IF EXISTS "${name}"`)
      expect(RLS).toContain(`CREATE POLICY "${name}"`)
    }
  })
})

describe('THE SERVICE ROLE IS NOT TOUCHED — the API depends on it', () => {
  for (const name of SERVICE_ROLE_POLICIES) {
    it(`"${name}" is neither dropped nor recreated`, () => {
      // STATEMENTS, not the whole file: the header names these four precisely to record that
      // they are left alone, and that documentation must not read as a violation.
      expect(STATEMENTS, `dropping ${name} would cut the API off from the table`).not.toContain(name)
    })
  }

  it('no STATEMENT mentions service_role — the comments deliberately do', () => {
    expect(STATEMENTS).not.toContain('service_role')
    // And the reasoning stays on the record, where the next reader will find it.
    expect(RAW).toContain('service_role bypasses')
  })
})

describe('opt_out_blocklist — BOTH DEFECTIVE POLICIES REMOVED, NOTHING PUT BACK', () => {
  it('blocklist_read is dropped — any signed-in client could read every suppressed address', () => {
    expect(RLS).toContain('DROP POLICY IF EXISTS "blocklist_read"')
  })

  it('blocklist_write is dropped — and a tenant-scoped INSERT would NOT have been enough', () => {
    // The row suppresses that person for EVERY client, so scoping the write by
    // blocked_by_client_id leaves it globally effective. There is no safe browser write.
    expect(RLS).toContain('DROP POLICY IF EXISTS "blocklist_write"')
  })

  it('NO REPLACEMENT POLICY IS CREATED — the raw list stays backend-only', () => {
    // Verified before deciding: apps/portal/src contains ZERO references to
    // opt_out_blocklist, so no live customer path reads it. A policy granting access nobody
    // uses is attack surface with no product behind it.
    const creates = [...RLS.matchAll(/CREATE POLICY "([^"]+)" ON public\.opt_out_blocklist/g)]
    expect(creates.map(m => m[1]), 'a policy was created on opt_out_blocklist').toEqual([])
  })

  it('and the earlier draft\'s "blocklist_own" is dropped defensively', () => {
    // If any environment ran the first version, the end state must still match.
    expect(RLS).toContain('DROP POLICY IF EXISTS "blocklist_own"')
  })
})

describe('WHAT PRODUCTION ALREADY HAS RIGHT IS LEFT ENTIRELY ALONE', () => {
  for (const table of LEAVE_ALONE) {
    it(`${table} — no statement of any kind`, () => {
      // The previous draft carried ALTER/DROP lines for all four. They were pure no-ops that
      // made the migration look like nine tables' worth of work while changing nothing.
      expect(STATEMENTS, `${table} is already correct in production and must not be touched`)
        .not.toMatch(new RegExp(`(ALTER TABLE|DROP POLICY|CREATE POLICY)[^;]*\\bpublic\\.${table}\\b`))
    })
  }

  it('current_client_id() is NOT replaced', () => {
    // It already exists, leads_own and icps_own already use it, so `authenticated` can
    // execute it. Replacing a function live policies depend on, to change nothing, is risk
    // bought for nothing.
    expect(STATEMENTS).not.toContain('CREATE OR REPLACE FUNCTION')
    // ...but the new policies still call it, which is why it must keep working.
    expect(STATEMENTS).toContain('public.current_client_id()')
  })
})

describe('NO PORTAL BROWSER WRITE DEPENDS ON THE ALL GRANT', () => {
  // The precondition for narrowing ALL → SELECT, asserted rather than remembered.
  const PORTAL = join(__dirname, '../../../../apps/portal/src')

  function browserWrites(): string[] {
    const hits: string[] = []
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f)
        if (statSync(p).isDirectory()) { walk(p); continue }
        if (!/\.(ts|tsx)$/.test(f)) continue
        const src = stripCommentsForEnvScan(readFileSync(p, 'utf8'))
        for (const { table } of REAL_POLICIES) {
          const re = new RegExp(`from\\('${table}'\\)[\\s\\S]{0,80}?\\.(insert|update|upsert|delete)\\(`)
          if (re.test(src)) hits.push(`${p.slice(PORTAL.length + 1)} → ${table}`)
        }
      }
    }
    walk(PORTAL)
    return hits
  }

  it('the checker detects a write when one exists (not vacuous)', () => {
    const re = /from\('figsy_replies'\)[\s\S]{0,80}?\.(insert|update|upsert|delete)\(/
    expect(re.test("supabase.from('figsy_replies')\n  .update({ classification: 'hot' })")).toBe(true)
    expect(re.test("supabase.from('figsy_replies').select('classification')")).toBe(false)
  })

  it('THE PORTAL WRITES NONE OF THE FOUR TABLES FROM THE BROWSER', () => {
    const writes = browserWrites()
    expect(
      writes,
      `Narrowing ALL → SELECT would break these: ${writes.join(', ')}. Either the write moves behind the API, or the policy cannot narrow.`,
    ).toEqual([])
  })
})

// ── helpers ─────────────────────────────────────────────────────────────────────────────

/**
 * The single CREATE POLICY statement with this name, or null.
 *
 * Parsed one statement at a time rather than with a lazy regex across the file — the earlier
 * version of this suite used `CREATE POLICY[\s\S]*?ON <table>` and matched from one
 * policy's CREATE to a LATER statement mentioning the table, reporting a policy on a table
 * that had none.
 */
function createStatementFor(name: string): string | null {
  for (const chunk of RLS.split(/CREATE POLICY/i).slice(1)) {
    const stmt = chunk.slice(0, chunk.indexOf(';') + 1)
    if (stmt.trimStart().startsWith(`"${name}"`)) return 'CREATE POLICY' + stmt
  }
  return null
}
