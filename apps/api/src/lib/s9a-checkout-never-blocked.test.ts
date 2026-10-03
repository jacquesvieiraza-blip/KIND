// 9a (#2560 · R189 ⑧) — THE MAILBOX CHECK CAN NEVER COST THE CLIENT THEIR PAYMENT.
//
// ⚑ 3 Oct — found by the full check of the whole round together: the founder's mailbox warning
// ran BEFORE the checkout's own error handling, so if that check threw (a database that will not
// load, an unexpected error) the client's Pay press failed. R189 ⑧: *"a client still pays in full
// at Recommendation"* — a warning to the founder must never be able to stop that.

import { describe, it, expect, vi } from 'vitest'

vi.mock('./demo', () => ({ isDemoClient: async () => false }))
vi.mock('./sender-claim', () => ({ warnIfMailboxesShort: async () => { throw new Error('database will not load') } }))
vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: async () => ({ id: 'cs_1', url: 'https://checkout/cs_1' }) } }
  },
}))
process.env.STRIPE_SECRET_KEY ||= 'sk_test_x'

describe('9a — the founder\'s mailbox warning never blocks the payment', () => {
  it('🛑 the mailbox check throws → the client still gets their checkout', async () => {
    const { createProgrammeCheckoutSession } = await import('./programme-checkout')
    const r = await createProgrammeCheckoutSession({
      clientId: 'client-A', programmeId: 'prog-1', meetings: 20, stage: 'programme_first',
      quotedCents: 199_000, successUrl: 'https://app/s', cancelUrl: 'https://app/c', clientEmail: 'a@client.com',
    })
    expect(r.url, 'a failed founder warning stopped the client paying').toBe('https://checkout/cs_1')
  })
})
