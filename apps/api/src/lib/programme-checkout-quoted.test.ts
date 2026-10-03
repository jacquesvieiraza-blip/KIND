// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (#2226 · MONEY-003) — 🛑 THE CLIENT IS CHARGED THE PRICE THEY WERE QUOTED.
//
// The checkout re-priced the programme from the curve at the moment of payment. If the price
// moved between the quote the client accepted and the press of Pay, Stripe charged a number the
// client never saw — and the webhook's amount check (B8) then refused to start the programme:
// money taken, nothing delivered. These run the real checkout against a fake Stripe and read the
// amount Stripe was actually asked to charge.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { programmeStripeAmountCents } from '@kind/shared'

const state = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_quoted'
  return { creates: [] as Array<{ line_items: Array<{ price_data: { unit_amount: number } }> }> }
})
vi.mock('./demo', () => ({ isDemoClient: async () => false }))
// ⚑ 2 Oct (#2560) — the first-payment door now tells the founder when the client's two mailboxes
// are short (never refuses). That has its own test (s9a-mailbox-before-pay); here the price is tested.
vi.mock('./sender-claim', () => ({ warnIfMailboxesShort: async () => 'enough' }))
vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: async (s: never) => { state.creates.push(s); return { id: 'cs_1', url: 'https://checkout' } } } }
  },
}))

import { createProgrammeCheckoutSession, quotedStageCents } from './programme-checkout'

const BASE = { clientId: 'c-1', programmeId: 'p-1', meetings: 10, successUrl: 'https://x/ok', cancelUrl: 'https://x/no', clientEmail: 'c@realco.com' }
const charged = () => state.creates.at(-1)!.line_items[0].price_data.unit_amount

beforeEach(() => { state.creates = [] })

describe('#2226 — checkout charges the stored quote, not today\'s price', () => {
  it('🛑 a quote stored at an older price is charged at that price, not re-priced', async () => {
    // Quoted when Growth was $189/meeting; the curve today says $199.
    const stored = { first_payment_cents: 189_000, second_payment_cents: 0 }
    expect(programmeStripeAmountCents(10, 'programme_first', 'growth')).not.toBe(189_000)
    const r = await createProgrammeCheckoutSession({ ...BASE, stage: 'programme_first', band: 'growth', quotedCents: quotedStageCents(stored, 'programme_first') })
    expect(r.url).toBe('https://checkout')
    expect(charged()).toBe(189_000)
  })

  it('wallet credit still comes off the stored quote (P1)', async () => {
    await createProgrammeCheckoutSession({ ...BASE, stage: 'programme_first', band: 'growth', quotedCents: 189_000, walletCreditCents: 9_000 })
    expect(charged()).toBe(180_000)
  })

  it('🛑 a stage with nothing stored is charged nothing — no fresh price is invented', async () => {
    const r = await createProgrammeCheckoutSession({ ...BASE, stage: 'programme_second', band: 'growth', quotedCents: quotedStageCents({ first_payment_cents: 199_000, second_payment_cents: 0 }, 'programme_second') })
    expect(r.url).toBeNull()
    expect(state.creates).toEqual([])
  })

  it('quotedStageCents reads the right column for each stage, and a missing value is 0', () => {
    const p = { first_payment_cents: 67_083, second_payment_cents: 67_084 }
    expect(quotedStageCents(p, 'programme_first')).toBe(67_083)
    expect(quotedStageCents(p, 'programme_second')).toBe(67_084)
    expect(quotedStageCents({}, 'programme_first')).toBe(0)
  })
})
