// ═══════════════════════════════════════════════════════════════════════════════════════
// XC-13 · EVERY APOLLO FAILURE CLASS FAILS CLOSED, AND SOMEBODY IS TOLD
//
// ── WHY CLASSIFICATION IS THE WHOLE JOB ───────────────────────────────────────────────
//
// A provider failure reached `runIcpJob` and propagated straight out to a crash boundary,
// which wrote `failed` and alerted. Three things were therefore true of every one of them:
//
//   ① **THE PROGRAMME RESERVATION STAYED OPEN.** `openBatch` reserves volume before the
//      search; `settleBatch` converts it. A throw between the two skips the settle, so a
//      client's paid volume is reserved against a batch that delivered nothing — for ever,
//      until somebody reconciles by hand. That was the HOUSE-009 defect from the other end.
//   ② **"OUT OF CREDITS" AND "APOLLO IS DOWN" WERE THE SAME ROW.** They need different
//      answers — one is a top-up, one is a wait — and `quota_exhausted` vs `failed` is the
//      distinction the run-outcome table already carries.
//   ③ **NOBODY WAS TOLD IN A WAY THEY COULD ACT ON.** An email is not a queue (XC-5).
//
// With FD-6 there is no second provider, so an Apollo failure is the WHOLE answer. That
// makes classifying it the difference between a client being told the truth and a client
// being told "no companies match your profile yet" about a search that never happened.
//
// ⚠️ PURE, DELIBERATELY. Every class below is provable without a database, a network or a
// deploy — which is why they can all be covered, including the ones nobody can reproduce
// on demand (a 500, a timeout, a malformed body).
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  classifyProviderFailure,
  PROVIDER_FAILURE_CLASSES,
  type ProviderFailureClass,
} from './provider-failure'
import { ApolloCreditsExhaustedError, ApolloRateLimitError } from './apollo'

describe('XC-13 · the seven failure classes the contract names', () => {
  it('the class list is closed and covers every one', () => {
    for (const k of [
      'unauthorised', 'payment_required', 'credits_exhausted',
      'rate_limited', 'provider_error', 'timeout', 'malformed',
    ] satisfies ProviderFailureClass[]) {
      expect(PROVIDER_FAILURE_CLASSES).toContain(k)
    }
  })

  it('401 → unauthorised, and it is a KEY problem, not a capacity one', () => {
    const v = classifyProviderFailure(new Error('Apollo 401: unauthorized'))
    expect(v.klass).toBe('unauthorised')
    // Recording this as quota_exhausted would send somebody to top up an account that is
    // full, while the real fault — a revoked or rotated key — went unmentioned.
    expect(v.runStatus).toBe('failed')
    expect(v.taskKind).toBe('provider_refused')
    expect(v.severity).toBe('critical')
    expect(v.operatorAction).toMatch(/key/i)
  })

  it('402 → payment_required: the account needs money, so the run is quota_exhausted', () => {
    const v = classifyProviderFailure(new Error('Apollo 402: payment required'))
    expect(v.klass).toBe('payment_required')
    expect(v.runStatus).toBe('quota_exhausted')
    expect(v.taskKind).toBe('provider_credits_exhausted')
    expect(v.operatorAction).toMatch(/billing|top up/i)
  })

  it('a 422 mentioning credit → credits_exhausted, NOT a malformed request', () => {
    // Apollo answers 422 for BOTH an invalid request and an exhausted credit pool. Reading
    // them as one class is how "your ICP is wrong" gets shown for "we ran out of credits".
    const v = classifyProviderFailure(new ApolloCreditsExhaustedError())
    expect(v.klass).toBe('credits_exhausted')
    expect(v.runStatus).toBe('quota_exhausted')
    expect(v.taskKind).toBe('provider_credits_exhausted')

    const raw = classifyProviderFailure(new Error('Apollo 422: insufficient credits remaining'))
    expect(raw.klass).toBe('credits_exhausted')
  })

  it('a 422 WITHOUT credit wording → malformed: the request was wrong, not the account', () => {
    const v = classifyProviderFailure(new Error('Apollo 422: {"error":"Per page not supported"}'))
    expect(v.klass).toBe('malformed')
    expect(v.runStatus).toBe('failed')
    // A malformed request is OUR bug. Telling an operator to top up would hide it.
    expect(v.operatorAction).not.toMatch(/top up/i)
    expect(v.operatorAction).toMatch(/request|engineering/i)
  })

  it('429 → rate_limited, and it is a WAIT, not a failure of the account', () => {
    const v = classifyProviderFailure(new ApolloRateLimitError())
    expect(v.klass).toBe('rate_limited')
    expect(v.runStatus).toBe('failed')
    expect(v.severity).toBe('warn')
    expect(v.retryable).toBe(true)
  })

  it('500 → provider_error, retryable, and not our fault', () => {
    const v = classifyProviderFailure(new Error('Apollo answered HTTP 503'))
    expect(v.klass).toBe('provider_error')
    expect(v.runStatus).toBe('failed')
    expect(v.retryable).toBe(true)
  })

  it('a timeout → timeout, and it is NEVER evidence about the audience', () => {
    for (const e of [
      new Error('the request timed out after 20000ms'),
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
      new Error('ETIMEDOUT'),
    ]) {
      const v = classifyProviderFailure(e)
      expect(v.klass, e.message).toBe('timeout')
      expect(v.runStatus).toBe('failed')
      expect(v.retryable).toBe(true)
    }
  })

  it('a malformed body → malformed', () => {
    const v = classifyProviderFailure(new SyntaxError('Unexpected token < in JSON at position 0'))
    expect(v.klass).toBe('malformed')
    expect(v.runStatus).toBe('failed')
  })

  it('an unrecognised failure is provider_error, never quota_exhausted', () => {
    // 🛑 THE FAIL-CLOSED DIRECTION. `quota_exhausted` means "the account is spent", which is
    // a claim about money, and defaulting an unknown error to it would tell a founder his
    // credits ran out on the strength of a stack trace nobody read.
    for (const e of [new Error('ECONNRESET'), new Error(''), null, undefined, 'boom', { code: 1 }]) {
      const v = classifyProviderFailure(e)
      expect(v.runStatus, String(e)).toBe('failed')
      expect(v.taskKind).not.toBe('provider_credits_exhausted')
    }
  })

  it('every class releases the reservation — none of them is allowed to hold it', () => {
    // 🛑 THE ONE PROPERTY SHARED BY ALL SEVEN. A throw between `openBatch` and `settleBatch`
    // left a client's paid volume reserved against a batch that delivered nothing.
    for (const e of [
      new Error('401'), new Error('402'), new ApolloCreditsExhaustedError(),
      new ApolloRateLimitError(), new Error('500'), new Error('timed out'),
      new SyntaxError('bad json'), new Error('who knows'),
    ]) {
      expect(classifyProviderFailure(e).releaseReservation, e.message).toBe(true)
    }
  })

  it('no class is allowed to derive no_match — a failure is never evidence of an empty market', () => {
    for (const e of [new Error('401'), new Error('402'), new Error('timed out'), new Error('x')]) {
      expect(classifyProviderFailure(e).runStatus).not.toBe('no_match')
    }
  })

  it('the operator sentence never contains the provider key', () => {
    // These strings land in `operator_tasks`, which is read in a console and copied into
    // notes. An error message that happens to echo a key must not be stored verbatim.
    const v = classifyProviderFailure(new Error('Apollo 401: bad key abcd1234secretkey'))
    expect(v.operatorDetail).not.toContain('abcd1234secretkey')
  })
})
