import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  mapStripeStatus, statusGrantsAccess, isEnumRejection,
  ENUM_PRESENT_BEFORE, ENUM_ADDED,
} from './subscription-status'

// #340 — A DECLINED CARD BOUGHT A WORKING PRODUCT.
//
//   const status = sub.status === 'active' || sub.status === 'trialing' ? sub.status : 'active'
//
// Read the false branch: everything not already good was written as `active`. Every consumer
// gates on active/trialing, so that ternary WAS the authorisation decision for the paid
// product.

describe('the statuses that must never grant access', () => {
  // Each of these arrived at the database as `active` before this change.
  const denied = ['incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'canceled', 'paused']

  for (const s of denied) {
    it(`Stripe "${s}" does NOT grant access`, () => {
      expect(mapStripeStatus(s).grantsAccess).toBe(false)
    })
  }

  it('THE HEADLINE: a card declined at signup is not an active subscription', () => {
    // Stripe `incomplete` means the first payment never succeeded. This one line is the
    // difference between a paid product and a free one.
    const m = mapStripeStatus('incomplete')
    expect(m.status).toBe('incomplete')
    expect(m.grantsAccess).toBe(false)
    expect(m.status).not.toBe('active')
  })

  it('none of them is stored as active either — the coercion is gone entirely', () => {
    for (const s of denied) expect(mapStripeStatus(s).status).not.toBe('active')
  })
})

describe('the statuses that legitimately do grant access', () => {
  it('active stays active', () => {
    expect(mapStripeStatus('active')).toMatchObject({ status: 'active', grantsAccess: true })
  })
  it('trialing stays trialing and still grants access', () => {
    expect(mapStripeStatus('trialing')).toMatchObject({ status: 'trialing', grantsAccess: true })
  })
  it('exactly two statuses grant access, no more', () => {
    const granting = ['active', 'trialing', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused']
      .filter(s => mapStripeStatus(s).grantsAccess)
    expect(granting).toEqual(['active', 'trialing'])
  })
})

describe('the spelling trap', () => {
  it('Stripe spells it "canceled"; our enum spells it "cancelled"', () => {
    // A straight pass-through writes a value the enum rejects — #342, again.
    expect(mapStripeStatus('canceled').status).toBe('cancelled')
  })
  it('our own spelling is accepted on the way in too', () => {
    expect(mapStripeStatus('cancelled').status).toBe('cancelled')
  })
})

describe('a status Stripe has not invented yet', () => {
  it('DENIES access rather than granting it', () => {
    // The two ways to be wrong are not equal. Denying a paying client is visible in minutes;
    // granting free access to an unknown state is invisible until the revenue report is read.
    expect(mapStripeStatus('some_future_state').grantsAccess).toBe(false)
  })
  it('is flagged so somebody maps it properly', () => {
    expect(mapStripeStatus('some_future_state').unrecognised).toBe(true)
  })
  it('a known status is never flagged as unrecognised', () => {
    for (const s of ['active', 'trialing', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused']) {
      expect(mapStripeStatus(s).unrecognised, s).toBe(false)
    }
  })
  it('and it is stored as a value the enum definitely holds', () => {
    expect(ENUM_PRESENT_BEFORE).toContain(mapStripeStatus('some_future_state').status)
  })
})

// ── #342's TRAP, WHICH THIS FIX HAD TO AVOID ─────────────────────────────────────────────
describe('every fallback is a value the enum already had', () => {
  it('no fallback depends on the new migration having been run', () => {
    // A failed write leaves the row on its PREVIOUS value — which for an existing
    // subscription means it stays `active`. So the fallback must work on today's database,
    // or the honest fix recreates the bug it is fixing.
    for (const s of ['active', 'trialing', 'past_due', 'unpaid', 'canceled', 'cancelled', 'incomplete', 'incomplete_expired', 'paused', 'nonsense']) {
      expect(ENUM_PRESENT_BEFORE, s).toContain(mapStripeStatus(s).fallback)
    }
  })

  it('a fallback NEVER grants access the real status would have denied', () => {
    // The whole point of the fallback is to keep the account locked when the write fails.
    for (const s of ['unpaid', 'incomplete', 'incomplete_expired', 'nonsense']) {
      const m = mapStripeStatus(s)
      expect(m.grantsAccess, s).toBe(false)
      expect(statusGrantsAccess(m.fallback), s).toBe(false)
    }
  })

  it('and for an access-granting status the fallback is the status itself', () => {
    expect(mapStripeStatus('active').fallback).toBe('active')
    expect(mapStripeStatus('trialing').fallback).toBe('trialing')
  })

  it('the added values are exactly the ones not already present', () => {
    for (const v of ENUM_ADDED) expect(ENUM_PRESENT_BEFORE).not.toContain(v)
  })
})

describe('recognising the enum rejection when it happens', () => {
  it("Postgres's wording for a bad enum value", () => {
    expect(isEnumRejection({ code: '22P02', message: 'invalid input value for enum subscription_status: "incomplete"' })).toBe(true)
  })
  it('matches on the message even without the code', () => {
    expect(isEnumRejection({ code: null, message: 'invalid input value for enum subscription_status: "unpaid"' })).toBe(true)
  })
  it('an unrelated failure is not mistaken for one', () => {
    expect(isEnumRejection({ code: '08006', message: 'connection terminated' })).toBe(false)
    expect(isEnumRejection(null)).toBe(false)
  })
})

describe('the access allowlist matches what every consumer actually queries', () => {
  it('active and trialing, and nothing else', () => {
    expect(statusGrantsAccess('active')).toBe(true)
    expect(statusGrantsAccess('trialing')).toBe(true)
    for (const s of ['past_due', 'cancelled', 'paused', 'incomplete', 'incomplete_expired', 'unpaid', '']) {
      expect(statusGrantsAccess(s), s).toBe(false)
    }
  })
})

// ── THE WIRING ───────────────────────────────────────────────────────────────────────────
describe('the mapping is actually WIRED into the webhook', () => {
  const code = (p: string) => readFileSync(join(__dirname, p), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('THE TERNARY IS GONE', () => {
    const src = code('../routes/stripe.ts')
    expect(src).not.toMatch(/\?\s*sub\.status\s*:\s*'active'/)
  })

  it('the webhook maps through mapStripeStatus', () => {
    expect(code('../routes/stripe.ts')).toContain('mapStripeStatus')
  })

  it('a rejected enum write falls back rather than leaving the row active', () => {
    expect(code('../routes/stripe.ts')).toContain('isEnumRejection')
  })

  it('the renewal re-activation covers the new dunning states', () => {
    // `.in('status', ['past_due','cancelled'])` would leave an `unpaid` or `incomplete`
    // subscription locked out forever after the client successfully paid.
    const src = code('../routes/stripe.ts')
    expect(src).toContain("'unpaid'")
    expect(src).toContain("'incomplete'")
  })

  it('the enum values are in the runnable migration list', () => {
    const src = readFileSync(join(__dirname, './pending-migrations.ts'), 'utf8')
    expect(src).toContain('subscription_status')
    for (const v of ENUM_ADDED) expect(src).toContain(`'${v}'`)
  })
})
