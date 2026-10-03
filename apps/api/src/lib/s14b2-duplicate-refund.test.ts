// 14b part 2 (#2561 · R191 ④) — REFUNDING THE DUPLICATE MUST NOT STOP THE PAID PROGRAMME.
//
// The 14b alert tells the founder to refund the second payment in Stripe. That refund's
// checkout carries the same programmeId, so the "payment reversed" path paused the client's
// live programme, returned its wallet credit and paused its campaigns. Only a reversal of the
// payment the programme RECORDED may stop it.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { reversalTarget, duplicateRefundAlert } from './double-payment'

const STRIPE = readFileSync(join(__dirname, '../routes/stripe.ts'), 'utf8')

describe('14b2 — which payment was reversed', () => {
  const rec = { first_payment_intent_id: 'pi_real', second_payment_intent_id: null }
  it('the recorded payment stops the programme', () => {
    expect(reversalTarget('pi_real', rec)).toBe('recorded')
    expect(reversalTarget('pi_second', { first_payment_intent_id: 'pi_real', second_payment_intent_id: 'pi_second' })).toBe('recorded')
  })
  it('any other payment on the same programme is the duplicate', () => {
    expect(reversalTarget('pi_dup', rec)).toBe('duplicate')
  })
  it('what cannot be told apart keeps the old, stopping behaviour', () => {
    expect(reversalTarget(null, rec)).toBe('unknown')
    expect(reversalTarget('pi_dup', null)).toBe('unknown')
    expect(reversalTarget('pi_dup', { first_payment_intent_id: null, second_payment_intent_id: null })).toBe('unknown')
  })
  it('the founder is told the programme keeps running, once per payment', () => {
    const a = duplicateRefundAlert({ programmeId: 'p1', clientId: 'c1', paymentIntentId: 'pi_dup', dispute: false })
    expect(a.subject).toContain('keeps running')
    expect(a.lines.join(' ')).toContain('nothing was paused')
    expect(a.dedupeKey).toBe('duplicate_reversal:pi_dup:refund')
  })
})

describe('14b2 — the webhook asks BEFORE anything is stopped', () => {
  const start = STRIPE.indexOf("event.type === 'charge.refunded' || event.type === 'charge.dispute.created'")
  const block = STRIPE.slice(start, STRIPE.indexOf("event.type === 'charge.dispute.closed'", start))
  it('the duplicate check comes before the claw-back, recordDispute and the campaign pause', () => {
    const guard = block.indexOf('reversalTarget(')
    expect(guard).toBeGreaterThan(0)
    expect(guard).toBeLessThan(block.indexOf("from('credit_transactions')"))
    expect(guard).toBeLessThan(block.indexOf('recordDispute('))
    expect(guard).toBeLessThan(block.indexOf(".update({ status: 'paused' })"))
  })
  it('a duplicate returns before any of them', () => {
    const dupBranch = block.slice(block.indexOf("if (target === 'duplicate')"), block.indexOf('const credits ='))
    expect(dupBranch).toContain('return')
    expect(dupBranch).not.toContain('recordDispute')
  })
})
