// 14c (#2561) — A PROGRAMME WHOSE PAYMENT WAS REVERSED IS NOT RESUMED UNTIL IT IS SETTLED.
//
// ⛓️ FOUNDER-RULED 2 Oct (R191): *"Refuse until it's settled"* — refunded: never; dispute open:
// refused; dispute won: allowed. The founder sees the reason in Vida (Resume's answer).

import { describe, it, expect, vi, beforeEach } from 'vitest'

let row: Record<string, unknown> = {}
const updates: Record<string, unknown>[] = []
let stripeRead: { refunds: { status: string | null }[]; disputes: { status: string }[] } | null = null
const askedStripe: string[][] = []

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q = {
        select: () => q, eq: () => q,
        maybeSingle: async () => ({ data: row, error: null }),
        update: (u: Record<string, unknown>) => { updates.push(u); return q },
        then: (ok: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(ok),
      }
      return q
    },
  },
}))
vi.mock('./stripe', () => ({
  readPaymentReversals: async (ids: string[]) => { askedStripe.push(ids); return stripeRead },
}))

import { reversalVerdict } from './payment-reversal'
import { resumeProgramme } from './programme'

beforeEach(() => { updates.length = 0; askedStripe.length = 0; stripeRead = { refunds: [], disputes: [] } })

describe('14c — the rule', () => {
  it('refunded → never, whatever else is true', () => {
    expect(reversalVerdict({ refunds: [{ status: 'succeeded' }], disputes: [{ status: 'won' }] }))
      .toMatchObject({ mayResume: false, state: 'refunded' })
    expect(reversalVerdict({ refunds: [{ status: 'pending' }], disputes: [] })).toMatchObject({ mayResume: false })
  })
  it('a failed or cancelled refund is not a refund', () => {
    expect(reversalVerdict({ refunds: [{ status: 'failed' }, { status: 'canceled' }], disputes: [] }))
      .toMatchObject({ mayResume: true })
  })
  it('an open dispute is refused; a lost one is refused for good', () => {
    for (const s of ['needs_response', 'under_review', 'warning_needs_response', 'warning_under_review'])
      expect(reversalVerdict({ refunds: [], disputes: [{ status: s }] })).toMatchObject({ mayResume: false, state: 'dispute_open' })
    expect(reversalVerdict({ refunds: [], disputes: [{ status: 'lost' }] })).toMatchObject({ mayResume: false, state: 'dispute_lost' })
  })
  it('a won dispute may resume', () => {
    expect(reversalVerdict({ refunds: [], disputes: [{ status: 'won' }] })).toEqual({ mayResume: true, state: 'dispute_won' })
  })
  it('Stripe unreadable, or no payment on record → refused, with a reason a person can act on', () => {
    const u = reversalVerdict(null)
    expect(u).toMatchObject({ mayResume: false, state: 'unreadable' })
    expect(reversalVerdict({ refunds: [], disputes: [] }, false)).toMatchObject({ mayResume: false, state: 'no_payment_on_record' })
  })
})

describe('14c — Resume obeys it', () => {
  it('a refunded programme is NOT resumed, and the pause is not touched', async () => {
    row = { id: 'p1', disputed_at: '2026-10-01', paused_at: '2026-10-01', first_payment_intent_id: 'pi_1', second_payment_intent_id: null }
    stripeRead = { refunds: [{ status: 'succeeded' }], disputes: [] }
    const r = await resumeProgramme('p1')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/refunded, so it cannot be resumed/)
    expect(updates).toHaveLength(0)
    expect(askedStripe).toEqual([['pi_1']])
  })
  it('an open dispute is refused', async () => {
    row = { id: 'p1', disputed_at: '2026-10-01', first_payment_intent_id: 'pi_1', second_payment_intent_id: 'pi_2' }
    stripeRead = { refunds: [], disputes: [{ status: 'needs_response' }] }
    expect(await resumeProgramme('p1')).toMatchObject({ ok: false })
    expect(askedStripe).toEqual([['pi_1', 'pi_2']])
    expect(updates).toHaveLength(0)
  })
  it('a won dispute resumes', async () => {
    row = { id: 'p1', disputed_at: '2026-10-01', first_payment_intent_id: 'pi_1' }
    stripeRead = { refunds: [], disputes: [{ status: 'won' }] }
    expect(await resumeProgramme('p1')).toEqual({ ok: true })
    expect(updates[0]).toMatchObject({ paused_at: null })
  })
  it('a programme never reversed resumes without asking Stripe', async () => {
    row = { id: 'p1', disputed_at: null, first_payment_intent_id: 'pi_1' }
    expect(await resumeProgramme('p1')).toEqual({ ok: true })
    expect(askedStripe).toHaveLength(0)
  })
})
