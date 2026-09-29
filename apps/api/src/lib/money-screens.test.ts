// ⚑ 29 Sep (R174 · PR 4f) — BILLING, MONEY PATH AND THE STRIPE CHECK READ PROGRAMME MONEY.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({ programmes: [] as Row[] }))
vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q, order: () => q, in: () => q,
        then: (r: (v: unknown) => unknown) => Promise.resolve({
          data: table === 'programmes' ? st.programmes : table === 'clients' ? [{ id: 'c1', company_name: 'Acme', is_demo: false, user_id: 'u1' }] : [],
          error: null,
        }).then(r),
      }
      return q
    },
  },
}))
vi.mock('./real-clients', () => ({ resolveHouseUserIds: async () => new Set<string>() }))
vi.mock('./meeting-truth', () => ({ meetingCounts: async () => ({ booked: 0, held: 0, noShow: 0 }) }))

const base = { client_id: 'c1', status: 'LIVE', size_band: null, meeting_target: 8, price_per_meeting_cents: 1, price_total_cents: 1,
  make_whole_cents: 0, disputed_at: null, delivered_meetings: null, shortfall_credited_at: null, shortfall_credit_cents: 0 }

describe('each paid stage is listed, with the cash it brought', () => {
  it('one payment in full (wallet credit off it); and the older two halves', async () => {
    st.programmes = [
      { ...base, id: 'p1', first_payment_cents: 160000, second_payment_cents: 0, first_paid_at: '2026-09-20', second_paid_at: null,
        first_payment_ref: 'cs_1', second_payment_ref: null, wallet_applied_cents: 10000 },
      { ...base, id: 'p2', first_payment_cents: 200000, second_payment_cents: 200000, first_paid_at: '2026-08-01', second_paid_at: '2026-08-20',
        first_payment_ref: 'cs_a', second_payment_ref: 'cs_b', wallet_applied_cents: 0 },
      { ...base, id: 'p3', first_payment_cents: 200000, second_payment_cents: 200000, first_paid_at: '2026-09-01', second_paid_at: '2026-09-01',
        first_payment_ref: 'cs_same', second_payment_ref: 'cs_same', wallet_applied_cents: 0 },
    ]
    const { programmeMoneyBook } = await import('./programme-money')
    const b = await programmeMoneyBook()
    const pay = (id: string) => b.rows.find(r => r.programme_id === id)!.payments
    expect(pay('p1')).toEqual([{ stage: 'in_full', cents: 150000, paid_at: '2026-09-20', ref: 'cs_1' }])
    expect(pay('p2').map(p => [p.stage, p.cents])).toEqual([['first_half', 200000], ['second_half', 200000]])
    expect(pay('p3')).toEqual([{ stage: 'in_full', cents: 400000, paid_at: '2026-09-01', ref: 'cs_same' }])
  })
})

describe('the three screens', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
  it('Stripe check: a programme payment reference is a match, not "never recorded"', () => {
    const op = read('apps/api/src/routes/operator.ts')
    const fn = op.slice(op.indexOf("operatorRouter.get('/revenue/reconcile'"))
    expect(fn.indexOf(".or(`first_payment_ref.in.(${ids.join(',')}),second_payment_ref.in.(${ids.join(',')})`)")).toBeGreaterThan(-1)
    expect(fn.indexOf("type: same ? 'programme_in_full' : 'programme_first_half'")).toBeGreaterThan(-1)
    expect(fn.indexOf('.or(`first_payment_ref')).toBeLessThan(fn.indexOf('const out = settlements.map('))
  })
  it('Money Path: collected includes programme cash', () => {
    expect(read('apps/api/src/routes/money-path.ts')).toContain('for (const r of book.rows) collected[r.client_id] = (collected[r.client_id] ?? 0) + r.cash_cents / 100')
  })
  it('Billing: the programme payments ledger is on the page', () => {
    expect(read('apps/admin/src/app/billing/page.tsx')).toContain('<ProgrammePayments />')
  })
})
