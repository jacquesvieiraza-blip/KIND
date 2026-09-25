// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R166 ⑥ · P2, board #2348) — PAID APOLLO REVEALS STOP AT 80% OF THE PLAN.
//
// Proved end to end through the real `bulkMatchEmails`: under the budget it reveals and records
// the spend; at the budget, or when the balance cannot be read, it refuses BEFORE Apollo is
// called — with the error every caller already treats as "credits exhausted".
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const state = vi.hoisted(() => ({
  usage: { limit: 1000, used: 100 } as { limit: number; used: number } | null,
  usageHttp: 200,
  bulkCalls: 0,
  ledger: [] as { credits: number; purpose: string }[],
  ledgerRows: [] as { credits: number }[],
  alerts: [] as string[],
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: any = {
        select: () => q, gte: () => q, limit: () => q,
        insert: async (row: { credits: number; purpose: string }) => { if (table === 'apollo_credit_ledger') state.ledger.push(row); return { error: null } },
        then: (r: (v: unknown) => unknown) => Promise.resolve({ data: state.ledgerRows, error: null }).then(r),
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async (_k: string, subject: string) => { state.alerts.push(subject); return {} } }))

import { budgetVerdict, APOLLO_BUDGET_SHARE, resetApolloBudgetCache, readApolloUsage } from './apollo-budget'
import { bulkMatchEmails, ApolloCreditsExhaustedError, ApolloBudgetExhaustedError } from './apollo'

const realFetch = globalThis.fetch
beforeEach(() => {
  state.usage = { limit: 1000, used: 100 }; state.usageHttp = 200; state.bulkCalls = 0
  state.ledger = []; state.ledgerRows = []; state.alerts = []
  resetApolloBudgetCache()
  process.env.APOLLO_API_KEY = 'k'
  process.env.PAID_PROVIDERS_ENABLED = 'true'
  delete process.env.APOLLO_MONTHLY_CREDIT_LIMIT
  globalThis.fetch = (async (url: string) => {
    if (String(url).includes('usage_stats')) {
      return { ok: state.usageHttp === 200, status: state.usageHttp, json: async () => ({ lead_credits: state.usage }) }
    }
    state.bulkCalls++
    return { ok: true, status: 200, json: async () => ({ matches: [{ id: 'a1', email: 'x@realco.com', email_status: 'verified' }, null] }) }
  }) as never
})
afterEach(() => { globalThis.fetch = realFetch; delete process.env.PAID_PROVIDERS_ENABLED })

describe('the rule, pure', () => {
  it('80% of the plan is the stop', () => {
    expect(APOLLO_BUDGET_SHARE).toBe(0.8)
    expect(budgetVerdict({ limit: 1000, used: 790, source: 'apollo' }, 10).ok).toBe(true)
    expect(budgetVerdict({ limit: 1000, used: 791, source: 'apollo' }, 10)).toMatchObject({ ok: false, reason: 'over_budget', ceiling: 800 })
    expect(budgetVerdict(null, 1)).toEqual({ ok: false, reason: 'unreadable' })
  })
})

describe('🛑 through the real reveal', () => {
  it('under the budget: Apollo is called and the spend is recorded', async () => {
    const out = await bulkMatchEmails(['a1', 'a2'], 'proof_geography')
    expect(out.get('a1')?.email).toBe('x@realco.com')
    expect(state.bulkCalls).toBe(1)
    expect(state.ledger).toEqual([{ credits: 1, purpose: 'proof_geography' }])
  })

  it('at the budget: refused BEFORE Apollo is called, as "credits exhausted", and you are told', async () => {
    state.usage = { limit: 1000, used: 799 }
    const err = await bulkMatchEmails(['a1', 'a2']).catch(e => e)
    expect(err).toBeInstanceOf(ApolloBudgetExhaustedError)
    expect(err).toBeInstanceOf(ApolloCreditsExhaustedError)
    expect(state.bulkCalls).toBe(0)
    expect(state.alerts.join()).toContain('80%')
  })

  it('🛑 unreadable balance and no manual limit: refused, never guessed', async () => {
    state.usageHttp = 500
    const err = await bulkMatchEmails(['a1']).catch(e => e)
    expect(err).toBeInstanceOf(ApolloBudgetExhaustedError)
    expect(state.bulkCalls).toBe(0)
  })

  it('unreadable balance WITH a manual limit: our own ledger is the "used" figure', async () => {
    state.usageHttp = 500
    process.env.APOLLO_MONTHLY_CREDIT_LIMIT = '100'
    state.ledgerRows = [{ credits: 50 }]
    expect(await readApolloUsage()).toEqual({ limit: 100, used: 50, source: 'manual' })
    resetApolloBudgetCache()
    state.ledgerRows = [{ credits: 80 }]
    expect(await bulkMatchEmails(['a1']).catch(e => e)).toBeInstanceOf(ApolloBudgetExhaustedError)
  })

  it('a minute of fast batches cannot overshoot: spend since the reading counts', async () => {
    state.usage = { limit: 20, used: 0 }   // stop at 16
    for (let i = 0; i < 15; i++) await bulkMatchEmails(['a1'])   // 1 credit each → 15 used
    expect(await bulkMatchEmails(['a1', 'a2']).catch(e => e)).toBeInstanceOf(ApolloBudgetExhaustedError)
  })
})
