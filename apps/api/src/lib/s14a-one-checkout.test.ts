// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (card #2561 · sending fix #14a) — ONE PAY PRESS, ONE CHECKOUT.
//
// #2561: *"A client can be charged twice. Two open checkouts can both be paid: the second charge
// is 'money taken, not recorded'."* Every press of Pay minted a NEW Stripe checkout, so a double
// click, a second tab or a back-and-press left two open checkouts for the same programme stage —
// and both could be paid.
//
// Now the same request carries the same Stripe idempotency key, so Stripe hands back the SAME
// checkout instead of minting another. A different stage, programme or amount is a different
// request and is never blocked. This moves no money: nothing is refunded or expired by code.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  calls: [] as { params: Record<string, unknown>; opts?: { idempotencyKey?: string } }[],
  byKey: new Map<string, string>(),
}))

vi.mock('./demo', () => ({ isDemoClient: async () => false }))
vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: async (params: Record<string, unknown>, opts?: { idempotencyKey?: string }) => {
      state.calls.push({ params, opts })
      // Stripe's own rule: the same idempotency key returns the FIRST response.
      const key = opts?.idempotencyKey
      if (key && state.byKey.has(key)) return { id: state.byKey.get(key)!, url: `https://checkout/${state.byKey.get(key)}` }
      const id = `cs_${state.calls.length}`
      if (key) state.byKey.set(key, id)
      return { id, url: `https://checkout/${id}` }
    } } }
  },
}))

process.env.STRIPE_SECRET_KEY ||= 'sk_test_x'

const BASE = {
  clientId: 'client-A', programmeId: 'prog-1', meetings: 20, stage: 'programme_first' as const,
  quotedCents: 199_000, successUrl: 'https://app/s', cancelUrl: 'https://app/c', clientEmail: 'a@client.com',
}
const press = async (over: Partial<typeof BASE> & { walletCreditCents?: number } = {}) =>
  (await import('./programme-checkout')).createProgrammeCheckoutSession({ ...BASE, ...over })

beforeEach(() => { state.calls = []; state.byKey = new Map() })

describe('#2561 — pressing Pay twice gives ONE checkout, so it cannot be paid twice', () => {
  it('🛑 the same press, twice, comes back as the SAME checkout', async () => {
    const a = await press()
    const b = await press()
    expect(a.sessionId).toBeTruthy()
    expect(b.sessionId).toBe(a.sessionId)
    expect(b.url).toBe(a.url)
  })

  it('🛑 every checkout is asked for with an idempotency key', async () => {
    await press()
    expect(state.calls[0].opts?.idempotencyKey).toMatch(/^programme-checkout:prog-1:programme_first:/)
  })

  it('a different stage, programme or amount is a different checkout — never blocked', async () => {
    const first = await press()
    const second = await press({ stage: 'programme_second' as never })
    const other = await press({ programmeId: 'prog-2' })
    const credited = await press({ walletCreditCents: 5_000 })
    const ids = [first.sessionId, second.sessionId, other.sessionId, credited.sessionId]
    expect(new Set(ids).size).toBe(4)
  })

  it('the key carries no email or other personal detail', async () => {
    await press()
    expect(state.calls[0].opts?.idempotencyKey).not.toContain('a@client.com')
  })
})
