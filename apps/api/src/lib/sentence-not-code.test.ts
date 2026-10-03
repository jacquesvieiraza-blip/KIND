// ⚑ 3 Oct (review C1) — WHEN THE SERVER REFUSES, MILLA SHOWS OUR SENTENCE, NEVER A CODE WORD.
//
// `{ error: 'checkout_failed', message: '<a sentence>' }` reached the client as the text
// "checkout_failed": the portal's fetch helper read only `error`. Found by reading the code for the
// reds round (the Pay refusal, Approve before the founder, re-approval) and true on main for
// `already_paid` and others.

import { describe, it, expect } from 'vitest'
import { apiErrorText } from '../../../portal/src/lib/api'

describe('the screen gets the sentence', () => {
  it('a bare code with a message → the message', () => {
    expect(apiErrorText({ error: 'checkout_failed', message: 'We could not start the payment. Nothing was charged.' }))
      .toBe('We could not start the payment. Nothing was charged.')
    expect(apiErrorText({ error: 'awaiting_founder', message: 'Our team is still checking your emails.' }))
      .toBe('Our team is still checking your emails.')
  })
  it('a prose error is shown as it always was, message or not', () => {
    expect(apiErrorText({ error: 'Your card was declined.', message: 'other' })).toBe('Your card was declined.')
  })
  it('a bare code with no message is still shown (nothing better exists)', () => {
    expect(apiErrorText({ error: 'already_paid' })).toBe('already_paid')
  })
  it('validation arrays are unchanged', () => {
    expect(apiErrorText({ error: [{ message: 'a' }, { message: 'b' }] })).toBe('a, b')
  })
})
