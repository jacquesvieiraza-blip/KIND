// ═══════════════════════════════════════════════════════════════════════════════════════
// TENANT ISOLATION — the NINE delivery tables (BUILD-003 item 1).
//
// EIGHT WERE SCOUTED; THE NINTH WAS FOUND DURING THE BUILD. `figsy_sent_emails` is read
// directly by the browser at four call sites in DashboardLive.tsx, carries `client_id`, and
// had no policy — locking the other three portal-read tables while leaving it open would
// have closed three doors on a room with a fourth. The founder approved it as the ninth.
//
// ⚠️ WHAT THESE ASSERTIONS DO AND DO NOT PROVE, stated plainly rather than implied.
//
// There is no Postgres in this suite, so nothing here executes a cross-tenant query. What is
// proven is that every one of the nine tables HAS a policy, that each policy's predicate is
// the tenant one, and that the set cannot silently shrink. That is the failure mode that
// actually happens: a table added to the product and forgotten here, or a predicate quietly
// widened in a diff nobody reads closely.
//
// That RLS is ENFORCED — that Client A's query really does return zero rows of Client B's
// data — is a RUNTIME claim and belongs to the live walkthrough. It is R2, and R2 gates
// applying the migration at all.
//
// ⚠️ THE LIST MUST NOT BE EMPTY. A sweep over zero tables passes forever and proves only
// that nobody wrote it correctly. Asserted first, as the acceptance matrix requires.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

const RLS = stripCommentsForEnvScan(
  readFileSync(join(__dirname, '../../../../supabase/migrations/20260829_delivery_rls.sql'), 'utf8'))
const SCHEMA = stripCommentsForEnvScan(
  readFileSync(join(__dirname, '../../../../packages/db/src/schema.sql'), 'utf8'))

/**
 * The nine, and how each is protected. Three shapes, because three things are true:
 *
 *   tenant   the client reads their own rows — `client_id = current_client_id()`
 *   own-only the client reads only what their own activity produced (the blocklist, whose
 *            EFFECT is global but whose VISIBILITY is not)
 *   denied   the browser gets nothing at all; service-role only
 */
const PROTECTED: { table: string; shape: 'tenant' | 'own-only' | 'denied'; why: string }[] = [
  { table: 'leads',             shape: 'tenant',   why: 'pre-existing leads_own, preserved' },
  { table: 'icps',              shape: 'tenant',   why: 'pre-existing icps_own, preserved' },
  { table: 'figsy_campaigns',   shape: 'tenant',   why: 'RLS was ON with ZERO policies' },
  { table: 'figsy_enrollments', shape: 'tenant',   why: 'RLS was ON with ZERO policies' },
  { table: 'figsy_replies',     shape: 'tenant',   why: 'RLS was ON with ZERO policies' },
  { table: 'figsy_sent_emails', shape: 'tenant',   why: 'THE NINTH — found during the build' },
  { table: 'opt_out_blocklist', shape: 'own-only', why: 'both prior policies were defective' },
  { table: 'lead_pool',         shape: 'denied',   why: 'shared pool — has no tenant column at all' },
  { table: 'sourcing_ledger',   shape: 'denied',   why: 'carries cost_usd — our margin, not theirs' },
]

describe('the sweep is not vacuous', () => {
  it('THERE ARE PROTECTED TABLES TO CHECK — a sweep over an empty list proves nothing', () => {
    expect(PROTECTED.length).toBeGreaterThan(0)
  })

  it('ALL NINE ARE LISTED — eight scouted plus the one found during the build', () => {
    expect(PROTECTED).toHaveLength(9)
    expect(PROTECTED.map(p => p.table)).toContain('figsy_sent_emails')
  })

  it('no table appears twice (a duplicate would hide a missing one behind the count)', () => {
    expect(new Set(PROTECTED.map(p => p.table)).size).toBe(PROTECTED.length)
  })
})

describe('EVERY PROTECTED TABLE HAS ROW LEVEL SECURITY ENABLED', () => {
  for (const { table, why } of PROTECTED) {
    it(`${table} — ${why}`, () => {
      // Enabled either by this migration or by an earlier one recorded in the snapshot.
      const enabled = new RegExp(`(ALTER|alter) TABLE (public\\.)?${table}\\s+(ENABLE|enable) ROW LEVEL SECURITY`, 'i')
      expect(
        enabled.test(RLS) || enabled.test(SCHEMA),
        `${table} has no ENABLE ROW LEVEL SECURITY anywhere — without it the policy below is decoration`,
      ).toBe(true)
    })
  }
})

describe('EVERY TENANT TABLE IS SCOPED TO THE CALLER, AND NOTHING WIDER', () => {
  for (const { table, shape } of PROTECTED.filter(p => p.shape === 'tenant')) {
    it(`${table} is readable only where client_id = current_client_id()`, () => {
      const policy = policyFor(table)
      expect(policy, `${table} has no policy — RLS with no policy denies the CLIENT their own data`).not.toBeNull()
      expect(policy!).toContain('current_client_id()')
      expect(policy!).toMatch(/client_id\s*=\s*public\.current_client_id\(\)/)
      // ⚠️ `auth.role() = 'authenticated'` is what the defective blocklist policy used: it is
      // true for EVERY signed-in user, so it is not a tenant predicate at all.
      expect(policy!, `${table} would be readable by any signed-in user`).not.toContain("auth.role()")
    })
    void shape
  }

  it('the four restored tables are SELECT-only — a client does not edit their own delivery record', () => {
    // These are delivery RECORDS: what we sent, who replied, what a campaign did. A client
    // editing them would be editing the evidence behind their own invoice.
    for (const t of ['figsy_campaigns', 'figsy_enrollments', 'figsy_replies', 'figsy_sent_emails']) {
      const policy = policyFor(t)!
      expect(policy, `${t} grants more than SELECT`).toContain('FOR SELECT')
      expect(policy).not.toContain('FOR ALL')
    }
  })
})

describe('THE BLOCKLIST — global in EFFECT, tenant-local in VISIBILITY', () => {
  it('the defective policies are dropped by name, not merely superseded', () => {
    // A CREATE POLICY with a different name would leave the old permissive one in place and
    // Postgres ORs policies together — the hole would survive the fix that was meant to close
    // it, and every test asserting the new policy would still pass.
    expect(RLS).toContain('DROP POLICY IF EXISTS "blocklist_read"')
    expect(RLS).toContain('DROP POLICY IF EXISTS "blocklist_write"')
  })

  it('the replacement is scoped to what this client\'s own activity produced', () => {
    const policy = policyFor('opt_out_blocklist')!
    expect(policy).toMatch(/blocked_by_client_id\s*=\s*public\.current_client_id\(\)/)
  })

  it('NO BROWSER WRITE EXISTS — a tenant-scoped INSERT would still be globally effective', () => {
    // Scoping the write to blocked_by_client_id is NOT sufficient: the row suppresses that
    // person for EVERY client, so a malicious tenant could submit any address and suppress
    // them everywhere while looking perfectly well-behaved.
    const blocklistPolicies = allPoliciesFor('opt_out_blocklist')
    for (const p of blocklistPolicies) {
      expect(p, 'a browser INSERT/UPDATE/DELETE policy exists on the blocklist').not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/)
    }
  })
})

describe('THE TWO DENIED TABLES GET NO POLICY — that IS the deny', () => {
  for (const { table, why } of PROTECTED.filter(p => p.shape === 'denied')) {
    it(`${table} — ${why}`, () => {
      // RLS enabled with no policy denies `authenticated` outright, while the service role
      // bypasses it. Adding a policy here would be the mistake, not the fix.
      expect(policyFor(table), `${table} has a policy — the browser should get nothing`).toBeNull()
    })
  }

  it('sourcing_ledger is denied DESPITE having client_id — cost_usd is not the client\'s business', () => {
    // It would be easy and wrong to give this the tenant shape: it has the column. A per-tenant
    // read policy would hand every client our provider cost on their own leads.
    expect(RLS).toMatch(/ALTER TABLE public\.sourcing_ledger\s+ENABLE ROW LEVEL SECURITY/)
    expect(policyFor('sourcing_ledger')).toBeNull()
  })
})

describe('the tenant helper cannot become a privilege ladder', () => {
  it('current_client_id is SECURITY INVOKER with an empty search_path', () => {
    const fn = RLS.slice(RLS.indexOf('CREATE OR REPLACE FUNCTION public.current_client_id'))
    const decl = fn.slice(0, fn.indexOf('$$;') + 3)
    expect(decl).toContain('SECURITY INVOKER')
    expect(decl).toContain("SET search_path = ''")
    expect(decl).toContain('public.clients')   // fully qualified — nothing resolves otherwise
  })

  it('PUBLIC cannot execute it', () => {
    expect(RLS).toContain('REVOKE ALL ON FUNCTION public.current_client_id() FROM PUBLIC')
  })
})

// ── helpers ─────────────────────────────────────────────────────────────────────────────

/**
 * Every CREATE POLICY statement whose ON clause names this table.
 *
 * ⚠️ PARSED ONE STATEMENT AT A TIME, not matched with a lazy regex across the file. The first
 * version used `CREATE POLICY[\s\S]*?ON <table>` and matched from one policy's CREATE to a
 * LATER statement that merely mentioned the table — so `lead_pool`, which has no policy at
 * all, appeared to have `figsy_campaigns_own`. The guard reported the opposite of the truth
 * and did it while looking perfectly reasonable.
 */
function allPoliciesFor(table: string): string[] {
  const out: string[] = []
  for (const src of [RLS, SCHEMA]) {
    for (const chunk of src.split(/create policy/i).slice(1)) {
      const stmt = chunk.slice(0, chunk.indexOf(';') + 1)
      // The ON clause is the first `on <table>` in the statement, before USING/WITH CHECK.
      const on = /\bon\s+(?:public\.)?([a-z_]+)/i.exec(stmt)
      if (on && on[1] === table) out.push('CREATE POLICY' + stmt)
    }
  }
  return out
}

function policyFor(table: string): string | null {
  const all = allPoliciesFor(table)
  return all.length > 0 ? all.join('\n') : null
}
