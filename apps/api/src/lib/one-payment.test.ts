// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R166 ③ · P9, board #2355) — ONE PAYMENT IN FULL, AT RECOMMENDATION, BEFORE SOURCING.
//
// Founder: "no P1 approval. to P2 approval. not risk of double payments a client needs to
// remember. one payment in. run bang" · "At Recommendation, before sourcing". Approval keeps no
// money attached. Programmes already running — House included — keep the 50/50 they bought.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({ programme: null as Row | null, updates: [] as Row[] }))

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      let patch: Row | null = null
      const filters: ((r: Row) => boolean)[] = []
      const q: any = {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return q },
        is: (c: string, v: unknown) => { filters.push(r => (r[c] ?? null) === v); return q },
        update: (p: Row) => { patch = p; return q },
        maybeSingle: async () => ({ data: state.programme, error: null }),
        single: async () => ({ data: state.programme, error: null }),
        then: (res: (v: unknown) => unknown) => {
          const hit = state.programme && filters.every(f => f(state.programme!)) ? [state.programme] : []
          if (patch && hit.length) { state.updates.push(patch); Object.assign(state.programme!, patch) }
          return Promise.resolve({ data: hit, error: null }).then(res)
        },
      }
      return q
    },
    rpc: async () => ({ data: null, error: null }),
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))

import { quoteProgramme, programmeStripeAmountCents } from '@kind/shared'
import { recordFirstPayment, paysInFull, maySecondCharge, p2Authorised, computeContribution } from './programme'

const bandRow = (over: Row = {}): Row => ({
  id: 'p1', client_id: 'c1', status: 'AWAITING_FIRST_PAYMENT', meeting_target: 10, size_band: 'growth',
  price_per_meeting_cents: 19_900, price_total_cents: 199_000, first_payment_cents: 199_000, second_payment_cents: 0,
  first_payment_ref: null, second_payment_ref: null, first_paid_at: null, second_paid_at: null,
  first_authorised_at: null, second_authorised_at: null, paused_at: null, went_live_at: null,
  sourcing_ceiling: 0, sourced_used: 0, sourced_reserved: 0, make_whole_cents: 0, ...over,
})

beforeEach(() => { state.updates = [] })

describe('the price is paid in one go', () => {
  it('a band quote is the whole total at P1 and nothing at P2', () => {
    const q = quoteProgramme(10, 'growth')
    expect(q.firstPaymentCents).toBe(199_000)
    expect(q.secondPaymentCents).toBe(0)
    expect(programmeStripeAmountCents(10, 'programme_first', 'growth')).toBe(199_000)
    expect(programmeStripeAmountCents(10, 'programme_second', 'growth')).toBe(0)
  })

  it('⛓️ a curve programme (running programmes, House) is still 50/50, charged exactly as before', () => {
    const q = quoteProgramme(10)
    expect(q.firstPaymentCents + q.secondPaymentCents).toBe(q.totalCents)
    expect(q.secondPaymentCents).toBeGreaterThan(0)
    expect(programmeStripeAmountCents(10, 'programme_first')).toBe(q.firstPaymentCents)
    expect(programmeStripeAmountCents(10, 'programme_second')).toBe(q.secondPaymentCents)
  })
})

describe('🛑 the one payment settles both stages', () => {
  it('recording P1 on a band programme records the same payment as P2 — never asked again', async () => {
    state.programme = bandRow()
    expect(paysInFull(state.programme)).toBe(true)
    const r = await recordFirstPayment({ programmeId: 'p1', sessionId: 'cs_one', paymentIntentId: 'pi_one' })
    expect(r.ok).toBe(true)
    expect(state.updates[0]).toMatchObject({
      first_payment_ref: 'cs_one', second_payment_ref: 'cs_one', second_payment_intent_id: 'pi_one',
      status: 'SOURCING_AUTHORISED', sourcing_ceiling: 3_000,   // Growth: 10 × 300
    })
    expect(state.updates[0].second_paid_at).toBeTruthy()
    // Every downstream gate reads "paid in full" exactly as it always has.
    expect(p2Authorised(state.programme as never)).toBe(true)
    // …and no second charge can ever be opened.
    expect(maySecondCharge({ ...(state.programme as object), status: 'APPROVED' } as never)).toMatchObject({ allowed: false })
  })

  it('revenue is exactly the total — not doubled', async () => {
    state.programme = bandRow({ first_paid_at: 'x', first_payment_ref: 'cs', second_paid_at: 'x', second_payment_ref: 'cs' })
    expect((await computeContribution('p1'))?.revenueCents).toBe(199_000)
  })

  it('⛓️ a curve programme: P1 records P1 only — the second half is still owed at approval', async () => {
    state.programme = bandRow({ size_band: null, first_payment_cents: 218_750, second_payment_cents: 218_750, price_total_cents: 437_500 })
    expect(paysInFull(state.programme)).toBe(false)
    await recordFirstPayment({ programmeId: 'p1', sessionId: 'cs_half' })
    expect(state.updates[0].second_payment_ref).toBeUndefined()
    expect(state.updates[0].sourcing_ceiling).toBe(4_000)
    expect(p2Authorised(state.programme as never)).toBe(false)
  })
})

describe('the doors', () => {
  it('checkout charges the programme\'s own band quote, and refuses a zero amount', () => {
    const src = readFileSync(join(__dirname, 'programme-checkout.ts'), 'utf8')
    expect(src).toContain('programmeStripeAmountCents(params.meetings, params.stage, params.band ?? null)')
    expect(src).toContain('if (owedCents < 1) return { url: null')
    for (const f of ['../routes/programme.ts', '../routes/my-programme.ts']) {
      const r = readFileSync(join(__dirname, f), 'utf8')
      const calls = r.split('createProgrammeCheckoutSession({').slice(1)
      expect(calls.length).toBeGreaterThan(0)
      for (const c of calls) expect(c.slice(0, 400)).toContain('band: (p as')
    }
  })

  it('the client\'s "pay the second half" door answers paid_in_full', () => {
    const r = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')
    expect(r).toContain("error: 'paid_in_full'")
  })
})
