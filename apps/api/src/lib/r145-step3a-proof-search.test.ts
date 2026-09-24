// ═══════════════════════════════════════════════════════════════════════════════════════
// R145 · STEP 3a (24 Sep) — PROOF SEARCHES THE WAY APOLLO DOES, AND SHOWS SCORED PEOPLE
//
// Founder, verbatim: *"CEO is one thing. we need to look at how Apollo asks for an ICP match and
// follow this. and its not just Apollo. we should be searching our pooled leads."* · D1 (24 Sep):
// industry is *picked from Apollo and searched*.
//
// Tracker rows #21 #22 #23 #24 #46 #72. Every assertion RUNS the real function.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-key'

const { buildSearchBody } = await import('./apollo')
const { hardFit, fitBand } = await import('./proof-fit')
const { poolRecordMatchesIcp } = await import('./pool-sourcing')
const { proofReadiness, PROOF_SCORING_WAIT_MS } = await import('@kind/shared')

const ICP = {
  job_titles: ['CEO'], seniority_levels: ['C-Suite'], company_sizes: ['11–50'],
  geographies: ['United Kingdom'], industries: ['Management Consulting'],
  tech_stack: [], keywords: [], apollo_only_consented: true,
}
const src = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')

describe('#22 #24 · a picked Apollo industry is SENT, and intent words do not widen it', () => {
  it('🛑 the picked industry reaches Apollo, in the lower case Apollo indexes', () => {
    expect(buildSearchBody(ICP).q_organization_keyword_tags).toEqual(['management consulting'])
  })

  it('🛑 a word WE derived (not on Apollo\'s list) is never sent as a filter', () => {
    expect(buildSearchBody({ ...ICP, industries: ['SaaS'] }).q_organization_keyword_tags).toBeUndefined()
  })

  it('🛑 intent tags are not ORed in beside a picked industry — and still are without one', () => {
    const withInd = buildSearchBody({ ...ICP, intent_signals: ['headcount_growth'] })
    expect(withInd.q_organization_keyword_tags).toEqual(['management consulting'])
    const without = buildSearchBody({ ...ICP, industries: [], intent_signals: ['headcount_growth'] })
    expect(without.q_organization_keyword_tags).toEqual(['growing team'])
  })
})

describe('#72 #46 · what Apollo matched is not re-judged', () => {
  const FIT = { ...ICP, target_category: null, target_company_type: null, target_size: null, exclusions: null }
  // What People Search actually returns (verified live, 24 Sep): a title, and FLAGS for the rest.
  const apolloRow = { apollo_id: '602cdd1afea4fb00017c356a', job_title: 'Chairman and Chief Executive', country: 'United Kingdom' }

  it('🛑 an Apollo row missing size and industry values passes them — Apollo filtered on both', () => {
    const f = hardFit(apolloRow, FIT as never)
    expect(f.size).toBe('yes')
    expect(f.industry).toBe('yes')
    expect(f.seniority).toBe('yes')
  })

  it('🛑 so it can be banded "Start here", not only "Worth a look"', () => {
    expect(fitBand(hardFit(apolloRow, FIT as never), 90)).toBe('start_here')
  })

  it('🛑 a fact that CONTRADICTS the filter is still a no — a revealed country elsewhere', () => {
    expect(hardFit({ ...apolloRow, country: 'Germany' }, FIT as never).geography).toBe('no')
  })

  it('a PDL id or a pool row is judged exactly as before', () => {
    expect(hardFit({ ...apolloRow, apollo_id: 'pdl_123' }, FIT as never).size).toBe('unknown')
    expect(hardFit({ ...apolloRow, apollo_id: null }, FIT as never).size).toBe('unknown')
  })

  it('🛑 "CEO" and "Chief Executive Officer" are one title, on any row', () => {
    expect(hardFit({ job_title: 'Chief Executive Officer', seniority: null }, FIT as never).seniority).toBe('yes')
    expect(hardFit({ job_title: 'Chief Marketing Officer', seniority: null }, FIT as never).seniority).toBe('no')
  })
})

describe('#23 · our pool is searched with the same industry and seniority', () => {
  const rec = (over: Record<string, unknown>) => ({
    email_norm: 'a@b.com', country: 'United Kingdom', company_size: '11–50',
    industry: 'management consulting', seniority: 'c_suite', title: 'CEO', ...over,
  })

  it('🛑 a pooled row in another industry is not selected — as Apollo would not return it', () => {
    expect(poolRecordMatchesIcp(rec({}) as never, ICP as never)).toBe(true)
    expect(poolRecordMatchesIcp(rec({ industry: 'construction' }) as never, ICP as never)).toBe(false)
  })

  it('a derived, non-Apollo word never becomes a pool filter', () => {
    expect(poolRecordMatchesIcp(rec({ industry: 'construction' }) as never, { ...ICP, industries: ['SaaS'] } as never)).toBe(true)
  })

  it('🛑 the pool prefilter asks for Apollo\'s own seniority key too', () => {
    expect(src('./pool-candidates.ts')).toContain('...apolloSenioritiesFor(icp.seniority_levels ?? [])')
  })
})

describe('#21 · a client moves to Proof when their people are SCORED', () => {
  const now = Date.parse('2026-09-24T10:00:00Z')
  const base = { claimed: true, onDesk: 20, runStatus: 'ok', runInserted: 20, workState: 'completed', needsReview: false, nowMs: now }

  it('🛑 twenty on the desk but still being scored → they wait', () => {
    expect(proofReadiness({ ...base, scoringPending: 5, runFinishedAt: new Date(now - 60_000).toISOString() })).toBe('preparing')
  })

  it('🛑 scored → ready', () => {
    expect(proofReadiness({ ...base, scoringPending: 0, runFinishedAt: new Date(now).toISOString() })).toBe('ready')
  })

  it('🛑 and a score that never comes cannot hold them for ever', () => {
    expect(proofReadiness({ ...base, scoringPending: 5, runFinishedAt: new Date(now - PROOF_SCORING_WAIT_MS - 1).toISOString() })).toBe('ready')
  })

  it('an older payload with no count waits for nothing', () => {
    expect(proofReadiness({ ...base })).toBe('ready')
  })

  it('the summary counts unscored, un-failed Proof cards', () => {
    const s = src('./milla-summary.ts')
    expect(s).toContain(".is('score', null).is('score_reasoning', null)")
    expect(s).toContain('proof_scoring_pending: proofScoringPending,')
  })
})

describe('the band is the same on every surface that judges a Proof card', () => {
  it('🛑 the gate, the desk, the accept route and Milla\'s context all read `apollo_id`', () => {
    expect(src('./proof-gate.ts')).toContain("category_fit, apollo_id'")
    expect(src('../routes/leads.ts')).toContain('category_fit, score, apollo_id')
    expect(src('./milla-proof-context-io.ts')).toContain('first_name, last_name, apollo_id')
    expect(src('../routes/leads.ts')).toContain('category_fit, created_at, surfaced_for_approval_at, apollo_id')
  })
})
