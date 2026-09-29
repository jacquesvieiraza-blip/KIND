// ⚑ 29 Sep (R174 ⑧ · PR 8b) — THE DEMO LOOKS PAID, LIKE A REAL CLIENT, AND IS NEVER MONEY.
//   · every stage with a programme is paid in full, in one payment, the way a banded programme is;
//   · the reference says no charge was taken — never a Stripe id, never a payment intent;
//   · never `*_authorised_at` as well (the two are exclusive in the database);
//   · the money book tags it as the demo and leaves it out of every total (the 8c rule).
import { describe, it, expect, vi } from 'vitest'
import { cashReceivedCents } from './programme-money'
import {
  NORTHWIND_CAST, NORTHWIND_REPLIES, NORTHWIND_STAGES, northwindNoChargeRef, northwindRows, type NorthwindIds,
} from './demo-northwind-data'

const ids: NorthwindIds = {
  userId: 'u', clientId: 'nw', icpId: 'i', programmeId: 'p', campaignId: 'k', sequenceId: 's', sessionId: 'm',
  leadIds: NORTHWIND_CAST.map((_, n) => `l${n}`), replyIds: NORTHWIND_REPLIES.map((_, n) => `r${n}`),
}
const now = new Date('2026-09-28T09:00:00Z')

const st = vi.hoisted(() => ({ programmes: [] as Record<string, unknown>[] }))
vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      for (const op of ['select', 'order', 'in', 'eq']) q[op] = () => q
      q.then = (r: (v: unknown) => unknown) => Promise.resolve({
        data: table === 'programmes' ? st.programmes
          : table === 'clients' ? [{ id: 'nw', company_name: 'Northwind', is_demo: true, user_id: 'u' }] : [],
        error: null,
      }).then(r)
      return q
    },
  },
}))
vi.mock('./real-clients', () => ({ resolveHouseUserIds: async () => new Set<string>() }))
vi.mock('./meeting-truth', () => ({ meetingCounts: async () => ({ booked: 3 }) }))

describe('the demo reads paid in full', () => {
  it('every stage with a programme: one payment, no-charge reference, no intent, no internal authority', () => {
    let seen = 0
    for (const stage of NORTHWIND_STAGES) {
      const p = northwindRows(stage, ids, now).programme
      if (!p) continue
      seen++
      expect(p.first_paid_at, stage).toBeTruthy()
      expect(p.second_paid_at, stage).toBe(p.first_paid_at)
      expect(p.first_payment_ref, stage).toBe(northwindNoChargeRef('p'))
      expect(p.second_payment_ref, stage).toBe(p.first_payment_ref)
      expect(String(p.first_payment_ref)).not.toMatch(/^(cs|pi|ch)_/)
      for (const k of Object.keys(p)) expect(k, stage).not.toMatch(/intent_id|authorised_at/)
      expect(cashReceivedCents(p as never), stage).toBeGreaterThan(0)
    }
    expect(seen).toBeGreaterThanOrEqual(3)
  })
})

describe('one reference per programme', () => {
  it('two demo programmes never share a reference (payment references are unique in the database)', () => {
    expect(northwindNoChargeRef('a')).not.toBe(northwindNoChargeRef('b'))
    expect(northwindNoChargeRef('a')).toMatch(/^demo-no-charge:/)
  })
})

describe('and it is never money', () => {
  it('the money book tags it as the demo and counts none of it', async () => {
    st.programmes = [{ ...northwindRows('Results', ids, now).programme!, created_at: 't' }]
    const { programmeMoneyBook } = await import('./programme-money')
    const book = await programmeMoneyBook()
    expect(book.rows[0].excluded).toBe('demo')
    expect(book.rows[0].cash_cents).toBeGreaterThan(0)
    expect(book.totals.cash_cents).toBe(0)
    expect(book.totals.meetings_sold).toBe(0)
    expect(book.totals.cash_by_band_cents).toEqual({})
  })
})
