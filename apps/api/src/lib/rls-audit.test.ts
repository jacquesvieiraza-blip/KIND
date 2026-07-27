import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  reachesBrowser, isUnconditional, grantsRead, isLeak, verdictFor, summarise,
  BROWSER_READ_TABLES, type PolicyRow,
} from './rls-audit'

// #554 — RLS READ END TO END, WITH A VERDICT PER TABLE.
//
// Two facts about Postgres decide nearly every finding, and both are counter-intuitive
// enough that they have already shipped a real production leak (#350):
//
//   ① A policy with NO `TO` clause applies to PUBLIC — every role, including the `anon`
//      role the public Supabase key authenticates as. A policy literally NAMED
//      "Service role bypass" but written without `TO service_role` grants the whole table
//      to anyone holding a key that ships in the browser bundle.
//   ② PERMISSIVE policies combine with OR. One `USING (true)` makes every careful
//      `client_id = current_client_id()` policy on that table irrelevant.

const p = (over: Partial<PolicyRow> = {}): PolicyRow => ({
  tablename: 't', policyname: 'pol', permissive: 'PERMISSIVE',
  roles: ['service_role'], cmd: 'ALL', qual: 'true', with_check: null, ...over,
})

describe('① a policy with no TO clause reaches the browser', () => {
  it('Postgres reports {public} — and that means everyone', () => {
    expect(reachesBrowser(p({ roles: ['public'] }))).toBe(true)
  })
  it('an empty role list is the same thing', () => {
    expect(reachesBrowser(p({ roles: [] }))).toBe(true)
  })
  it('anon and authenticated are browser roles', () => {
    expect(reachesBrowser(p({ roles: ['anon'] }))).toBe(true)
    expect(reachesBrowser(p({ roles: ['authenticated'] }))).toBe(true)
  })
  it('service_role alone is NOT a browser role', () => {
    expect(reachesBrowser(p({ roles: ['service_role'] }))).toBe(false)
  })
  it('one browser role among several still reaches the browser', () => {
    expect(reachesBrowser(p({ roles: ['service_role', 'anon'] }))).toBe(true)
  })
})

describe('recognising an unconditional expression', () => {
  it('true, (true) and whitespace variants all let every row through', () => {
    for (const q of ['true', '(true)', ' TRUE ', '( true )']) expect(isUnconditional(q), q).toBe(true)
  })
  it('a real condition is not unconditional', () => {
    expect(isUnconditional('(client_id = current_client_id())')).toBe(false)
    expect(isUnconditional('(user_id = auth.uid())')).toBe(false)
  })
  it('null (an INSERT-only policy has no USING) is not unconditional', () => {
    expect(isUnconditional(null)).toBe(false)
  })
  it("a condition that merely MENTIONS true is not unconditional", () => {
    expect(isUnconditional('(is_active = true)')).toBe(false)
  })
})

describe('which commands can read', () => {
  it('SELECT and ALL can', () => {
    expect(grantsRead(p({ cmd: 'SELECT' }))).toBe(true)
    expect(grantsRead(p({ cmd: 'ALL' }))).toBe(true)
  })
  it('INSERT alone cannot — an anon insert policy is a different problem', () => {
    expect(grantsRead(p({ cmd: 'INSERT' }))).toBe(false)
  })
})

describe('THE LEAK: the exact shape #350 shipped to production', () => {
  it('the real one — visitor_sessions.admin_read_visits', () => {
    // FOR SELECT USING (true), no TO clause. Every visitor IP and enrichment row was
    // readable by anyone with the public key. Confirmed in prod before it was dropped.
    expect(isLeak(p({ policyname: 'admin_read_visits', roles: ['public'], cmd: 'SELECT', qual: 'true' }))).toBe(true)
  })

  it('a policy CALLED "Service role bypass" that does not restrict to the service role', () => {
    // The name is the trap. Reviewers read the name, not the missing TO clause.
    expect(isLeak(p({ policyname: 'Service role bypass', roles: ['public'], cmd: 'ALL', qual: 'true' }))).toBe(true)
  })

  it('the same policy WITH `TO service_role` is fine', () => {
    expect(isLeak(p({ roles: ['service_role'], cmd: 'ALL', qual: 'true' }))).toBe(false)
  })

  it('a RESTRICTIVE USING (true) is a no-op, not a leak', () => {
    // Restrictive policies AND-combine, so they can only ever narrow access. Flagging these
    // would bury the real findings in noise.
    expect(isLeak(p({ permissive: 'RESTRICTIVE', roles: ['public'], qual: 'true' }))).toBe(false)
  })

  it('a scoped browser policy is not a leak', () => {
    expect(isLeak(p({ roles: ['authenticated'], cmd: 'SELECT', qual: '(user_id = auth.uid())' }))).toBe(false)
  })

  it('an anon INSERT-only policy is not a read leak', () => {
    // The contact form legitimately needs this.
    expect(isLeak(p({ roles: ['anon'], cmd: 'INSERT', qual: null, with_check: 'true' }))).toBe(false)
  })
})

describe('the verdict for a whole table', () => {
  const state = (over: Partial<{ rlsEnabled: boolean; policies: PolicyRow[] }> = {}) =>
    ({ tablename: 'lead_enrichment', rlsEnabled: true, policies: [], ...over })

  it('RLS OFF is the worst verdict — worse than a bad policy', () => {
    const v = verdictFor(state({ rlsEnabled: false }), false)
    expect(v.verdict).toBe('unprotected')
  })

  it('RLS OFF makes existing policies INERT, and says so', () => {
    // The trap: a table can carry five careful policies and enforce none of them.
    const v = verdictFor(state({ rlsEnabled: false, policies: [p({ qual: '(user_id = auth.uid())' })] }), false)
    expect(v.finding).toContain('INERT')
  })

  it('② ONE leak defeats every careful policy on the table', () => {
    // Permissive policies OR together. This is the assertion that matters most.
    const v = verdictFor(state({ policies: [
      p({ policyname: 'clients see own', roles: ['authenticated'], qual: '(client_id = current_client_id())' }),
      p({ policyname: 'Service role bypass', roles: ['public'], qual: 'true' }),
    ] }), false)
    expect(v.verdict).toBe('exposed')
    expect(v.offenders).toEqual(['Service role bypass'])
    expect(v.finding).toContain('OR')
  })

  it('RLS on with NO policy is the STRONGEST configuration, not a gap', () => {
    // Easy to misread as "unprotected". The service role bypasses RLS, so the API is
    // unaffected and everyone else gets nothing.
    const v = verdictFor(state(), false)
    expect(v.verdict).toBe('deny_all')
    expect(v.finding).toContain('strongest')
  })

  it('…unless the browser reads that table directly, in which case it returns empty', () => {
    const v = verdictFor({ tablename: 'leads', rlsEnabled: true, policies: [] }, true)
    expect(v.verdict).toBe('deny_all')
    expect(v.finding).toContain('returning empty')
  })

  it('scoped browser policies are the healthy state', () => {
    const v = verdictFor(state({ policies: [
      p({ roles: ['authenticated'], cmd: 'SELECT', qual: '(client_id = current_client_id())' }),
    ] }), true)
    expect(v.verdict).toBe('scoped')
  })

  it('policies only for service_role read as deny-all for a browser', () => {
    const v = verdictFor(state({ policies: [p({ roles: ['service_role'] })] }), false)
    expect(v.verdict).toBe('deny_all')
  })
})

describe('the summary', () => {
  it('is only safe when nothing is exposed AND nothing is unprotected', () => {
    const mk = (verdict: 'exposed' | 'unprotected' | 'deny_all') =>
      ({ tablename: 't', verdict, finding: '', offenders: [] as string[] })
    expect(summarise([mk('deny_all')]).safe).toBe(true)
    expect(summarise([mk('exposed')]).safe).toBe(false)
    expect(summarise([mk('unprotected')]).safe).toBe(false)
  })
})

describe('the browser-read list is real, not guessed', () => {
  it('names the tables the front ends actually query with the public key', () => {
    expect(BROWSER_READ_TABLES).toContain('leads')
    expect(BROWSER_READ_TABLES).toContain('clients')
    expect(BROWSER_READ_TABLES).toContain('credit_transactions')
  })
  it('does NOT include tables only the API touches', () => {
    for (const t of ['lead_enrichment', 'partners', 'figsy_calls', 'webhook_triggers', 'cron_claims']) {
      expect(BROWSER_READ_TABLES, t).not.toContain(t)
    }
  })
})

// ── THE WIRING ───────────────────────────────────────────────────────────────────────────
describe('the audit is reachable and the findings are written down', () => {
  const code = (p: string) => readFileSync(join(__dirname, p), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('an operator endpoint reads the LIVE database, not the repo', () => {
    const src = code('../routes/operator.ts')
    expect(src).toContain('/rls-audit')
    expect(src).toContain('readLiveRls')
  })

  it('the live read asks pg_policies AND pg_class — RLS-off has no policy row to betray it', () => {
    const src = code('./rls-live.ts')
    expect(src).toContain('pg_policies')
    expect(src).toContain('relrowsecurity')
  })

  it('a failed audit is an error, never an empty pass', () => {
    // "No problems found" because the query failed is the worst possible lie on a security
    // screen. The endpoint must 500 rather than return an empty verdict list.
    const src = code('../routes/operator.ts')
    const idx = src.indexOf('/rls-audit')
    expect(src.slice(idx, idx + 1800)).toContain('res.status(500)')
  })

  it('the written verdict per table exists', () => {
    const doc = readFileSync(join(__dirname, '../../../../docs/RLS-AUDIT.md'), 'utf8')
    expect(doc).toContain('lead_enrichment')
    expect(doc).toContain('visitor_sessions')
    // The finding must be stated as a finding, not buried.
    expect(doc.toLowerCase()).toContain('anon')
  })

  it('the remediation migration drops the leaking policies idempotently', () => {
    const src = readFileSync(join(__dirname, './pending-migrations.ts'), 'utf8')
    expect(src).toContain('DROP POLICY IF EXISTS "Service role bypass" ON public.lead_enrichment')
    expect(src).toContain('figsy_calls')
  })
})
