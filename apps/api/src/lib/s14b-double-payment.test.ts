// 14b (#2561) — A CLIENT WHO PAYS A STAGE TWICE: THE FOUNDER IS TOLD, NOTHING IS REFUNDED BY CODE.
//
// ⛓️ FOUNDER-RULED 2 Oct (R191): *"Alert me, I refund by hand"*.
//
// Before: the second payment was refused by `recordFirstPayment` and the webhook answered 500,
// so Stripe retried a payment that can never be recorded, with an alert telling the founder to
// "record it by hand" — the opposite of what the money needs.

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

let row: Record<string, unknown> = {}
vi.mock('@kind/db', () => ({
  db: { from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: row, error: null }) }; return q } },
}))

import { doublePaymentAlert, stripePaymentLink, formatPaid } from './double-payment'
import { recordFirstPayment, recordSecondPayment } from './programme'

const STRIPE = readFileSync(join(__dirname, '../routes/stripe.ts'), 'utf8')

describe('14b — the programme rule says DUPLICATE, not merely "no"', () => {
  it('a second, different first payment is flagged a duplicate', async () => {
    row = { id: 'p1', first_payment_ref: 'cs_paid_first' }
    const r = await recordFirstPayment({ programmeId: 'p1', sessionId: 'cs_paid_again' })
    expect(r).toMatchObject({ ok: false, duplicate: true })
  })
  it('a redelivery of the SAME session is still a replay, not a duplicate', async () => {
    row = { id: 'p1', first_payment_ref: 'cs_paid_first' }
    expect(await recordFirstPayment({ programmeId: 'p1', sessionId: 'cs_paid_first' }))
      .toEqual({ ok: true, alreadyRecorded: true })
  })
  it('and the same for the second payment', async () => {
    row = { id: 'p1', second_payment_ref: 'cs_p2', went_live_at: null }
    expect(await recordSecondPayment({ programmeId: 'p1', sessionId: 'cs_p2_again' }))
      .toMatchObject({ ok: false, duplicate: true })
  })
})

describe('14b — what the founder is told', () => {
  it('names the client, the amount and links the Stripe payment to refund', () => {
    const a = doublePaymentAlert({
      companyName: 'Acme Ltd', clientId: 'c1', programmeId: 'p1', stage: 'first',
      sessionId: 'cs_2', paymentIntentId: 'pi_123', amountCents: 450000, currency: 'usd', livemode: true,
    })
    expect(a.subject).toBe('Acme Ltd paid twice — refund 4500.00 USD in Stripe')
    expect(a.lines.join('\n')).toContain('Refund it in Stripe: https://dashboard.stripe.com/payments/pi_123')
    expect(a.lines.join('\n')).toContain('Nothing is refunded automatically.')
    expect(a.dedupeKey).toBe('double_payment:cs_2')
  })
  it('a test-mode payment links to the test dashboard; no intent → the session id instead', () => {
    expect(stripePaymentLink('pi_1', false)).toBe('https://dashboard.stripe.com/test/payments/pi_1')
    expect(stripePaymentLink(null, true)).toBeNull()
    const a = doublePaymentAlert({ companyName: null, clientId: 'c9', programmeId: 'p', stage: 'second', sessionId: 'cs_x', paymentIntentId: null, amountCents: null, currency: null, livemode: true })
    expect(a.subject).toBe('client c9 paid twice — refund an amount Stripe did not report in Stripe')
    expect(a.lines.join('\n')).toContain('find checkout session cs_x')
    expect(formatPaid(1999, 'gbp')).toBe('19.99 GBP')
  })
})

describe('14b — the webhook stops retrying and never refunds', () => {
  it('both payment branches handle a duplicate BEFORE the generic "retry" 500', () => {
    for (const stage of ['first', 'second']) {
      const dup = STRIPE.indexOf(`alertDoublePayment('${stage}'`)
      expect(dup, `${stage} payment has no duplicate branch`).toBeGreaterThan(-1)
      const generic = STRIPE.indexOf(`programme ${stage} payment could not be recorded`)
      expect(generic).toBeGreaterThan(dup)
    }
  })
  it('the alert is a critical payment task (top of Vida), deduped per paid session', () => {
    expect(STRIPE).toMatch(/sendFounderAlert\('payment_failed', a\.subject, a\.lines,/)
    expect(STRIPE).toMatch(/dedupeKey: a\.dedupeKey/)
  })
  it('no code path refunds', () => {
    expect(STRIPE).not.toMatch(/refunds\.create/)
    expect(readFileSync(join(__dirname, 'double-payment.ts'), 'utf8')).not.toMatch(/refunds\.create/)
  })
})
