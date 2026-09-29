// ⚑ 29 Sep (R174 · PR 4e) — ONE READ OF PROGRAMME MONEY, AND REVENUE BUILT ON IT.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({ programmes: [] as Row[], clients: [] as Row[] }))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q, order: () => q, in: () => q,
        then: (r: (v: unknown) => unknown) =>
          Promise.resolve({ data: table === 'programmes' ? st.programmes : table === 'clients' ? st.clients : [], error: null }).then(r),
      }
      return q
    },
  },
}))
vi.mock('./real-clients', () => ({ resolveHouseUserIds: async () => new Set(['u-house']) }))
vi.mock('./meeting-truth', () => ({ meetingCounts: async () => ({ booked: 3, held: 0, noShow: 0 }) }))

const prog = (over: Row): Row => ({
  id: 'p', client_id: 'c', status: 'LIVE', size_band: 'growth', meeting_target: 10,
  price_per_meeting_cents: 19900, price_total_cents: 199000,
  first_payment_cents: 199000, second_payment_cents: 0, first_paid_at: 't', second_paid_at: null,
  wallet_applied_cents: 0, make_whole_cents: 0, disputed_at: null,
  delivered_meetings: null, shortfall_credited_at: null, shortfall_credit_cents: 0, ...over,
})

beforeEach(() => {
  st.clients = [
    { id: 'c1', company_name: 'Acme', is_demo: false, user_id: 'u1' },
    { id: 'c2', company_name: 'Old Co', is_demo: false, user_id: 'u2' },
    { id: 'nw', company_name: 'Northwind Field Software', is_demo: true, user_id: 'u-nw' },
    { id: 'house', company_name: 'K.I.N.D', is_demo: false, user_id: 'u-house' },
  ]
  st.programmes = [
    prog({ id: 'p1', client_id: 'c1' }),                                         // one payment, growth
    prog({ id: 'p2', client_id: 'c2', size_band: null, first_payment_cents: 200000, second_payment_cents: 200000,
      second_paid_at: 't2', status: 'COMPLETED', shortfall_credited_at: 't3', delivered_meetings: 7, shortfall_credit_cents: 40000,
      wallet_applied_cents: 10000 }),                                                  // older two-part, settled
    prog({ id: 'p-demo', client_id: 'nw' }),
    prog({ id: 'p-house', client_id: 'house', size_band: null, first_paid_at: null }),
  ]
})

describe('cash is the contribution rule', () => {
  it('paid stages, less wallet credit and make-whole; nothing for a disputed programme', async () => {
    const { cashReceivedCents } = await import('./programme-money')
    expect(cashReceivedCents(prog({}) as never)).toBe(199000)
    expect(cashReceivedCents(prog({ first_payment_cents: 100, second_payment_cents: 100, second_paid_at: 'x', wallet_applied_cents: 30, make_whole_cents: 20 }) as never)).toBe(150)
    expect(cashReceivedCents(prog({ disputed_at: 'x' }) as never)).toBe(0)
  })
  it('…and the same terms as `computeContribution`, so Revenue and contribution cannot disagree', () => {
    const lib = readFileSync(join(__dirname, 'programme.ts'), 'utf8')
    const fn = lib.slice(lib.indexOf('export async function computeContribution('))
    for (const term of ['p.first_paid_at ? p.first_payment_cents : 0', 'p.second_paid_at ? p.second_payment_cents : 0', 'walletApplied', 'p.make_whole_cents', 'p.disputed_at ? 0']) {
      expect(fn, term).toContain(term)
    }
  })
})

describe('the book', () => {
  it('totals leave out the demo and House, and list them', async () => {
    const { programmeMoneyBook } = await import('./programme-money')
    const b = await programmeMoneyBook()
    expect(b.totals.cash_cents).toBe(199000 + (400000 - 10000))
    expect(b.totals.cash_by_band_cents).toEqual({ growth: 199000, curve: 390000 })
    expect(b.totals.meetings_sold).toBe(20)
    expect(b.totals.meetings_delivered).toBe(3 + 7)   // live count for p1, settled figure for p2
    expect(b.totals.shortfall_credit_cents).toBe(40000)
    expect(b.rows.find(r => r.programme_id === 'p-demo')?.excluded).toBe('demo')
    expect(b.rows.find(r => r.programme_id === 'p-house')?.excluded).toBe('house')
  })
})

describe('Revenue reads it, first', () => {
  it('the route serves it and the Finance page leads with it', () => {
    expect(readFileSync(join(__dirname, '..', 'routes', 'operator.ts'), 'utf8')).toContain("operatorRouter.get('/programme-money'")
    const page = readFileSync(join(process.cwd(), 'apps/admin/src/app/revenue/page.tsx'), 'utf8')
    expect(page.indexOf('<ProgrammeRevenue />')).toBeGreaterThan(-1)
    expect(page.indexOf('<ProgrammeRevenue />')).toBeLessThan(page.indexOf('Old subscription model — history'))
    expect(page).not.toContain('Live MRR · projections below')
    expect(readFileSync(join(process.cwd(), 'apps/admin/src/components/vida/ProgrammeRevenue.tsx'), 'utf8'))
      .toContain("fetch('/api/proxy/operator/programme-money')")
  })
})
