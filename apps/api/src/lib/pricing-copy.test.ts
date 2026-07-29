import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PRICING } from '@kind/shared'
import { PACK_LEADS, PACK_PRICE_USD, LEAD_PRICE_USD } from './onboarding-pack'

// #414 — THE COPY OVERSOLD WHAT WE ACTUALLY DO.
//
// `PRICING.figsy.description` read *"FIGSY handles replies, objections, follow-ups and meeting
// booking. 1 outreach credit = 1 lead enrolled."* — self-serve automation we do not sell, on a
// per-credit model we stopped running. `lead_gen` quoted *"$1 reveals a lead"*, the retired
// two-tier ladder superseded by ONE WALLET / flat $4 on 24 Jul.
//
// ── THE CORRECTION THAT MATTERS MORE THAN THE COPY ───────────────────────────────────────
//
// #414 is filed as "the last thing a client reads before their card is charged". Verified
// 29 Jul: **it is not.** NOTHING renders `.description` from `PRICING` or `PRODUCTS` — the
// only importers are `lib/stripe.ts` (which reads `.bundles`, numbers only) and the admin
// cockpit, whose import is unused. Checkout copy comes from the Stripe DASHBOARD product
// behind `price: params.priceId`, which no code change here can reach. These tests keep the
// codebase honest; the checkout itself needs a founder edit in Stripe.
//
// The second half is the drift guard. The copy quotes $99 / 100 / $4, and those numbers live
// in `onboarding-pack.ts`. A price change there would silently leave this string lying —
// which is exactly how it got out of date the first time.

const BANNED = [
  // The overclaim itself: we do not sell automation that argues with a prospect.
  'objections',
  // The retired per-credit model.
  '1 outreach credit = 1 lead enrolled',
  // The retired two-tier ladder.
  '$1 reveals a lead',
]

describe('the money copy says only what we actually do', () => {
  for (const phrase of BANNED) {
    it(`no description claims "${phrase}"`, () => {
      for (const [key, svc] of Object.entries(PRICING)) {
        expect((svc as { description: string }).description.toLowerCase(), key)
          .not.toContain(phrase.toLowerCase())
      }
    })
  }

  it('the FIGSY line describes a MANAGED service, not self-serve automation', () => {
    const d = PRICING.figsy.description.toLowerCase()
    expect(d).toContain('we run your outbound')
    expect(d).toContain('you approve')
  })

  it('it says reviewing is FREE — the single most misread thing about the model', () => {
    // Leads arrive masked and cost nothing to look at; only the client's 👍 spends. A client
    // who thinks browsing costs money does not browse, and the whole loop stalls.
    expect(PRICING.figsy.description.toLowerCase()).toContain('reviewing is free')
    expect(PRICING.lead_gen.description.toLowerCase()).toContain('free')
  })

  it('every description is one honest sentence-set, not an empty string', () => {
    for (const [key, svc] of Object.entries(PRICING)) {
      expect((svc as { description: string }).description.length, key).toBeGreaterThan(40)
    }
  })
})

// ── THE DRIFT GUARD ──────────────────────────────────────────────────────────────────────
// The copy quotes numbers that live somewhere else. That is how it went stale before.
describe('the copy cannot drift from the money', () => {
  it('the pack price in the copy matches PACK_PRICE_USD', () => {
    expect(PRICING.figsy.description).toContain(`$${PACK_PRICE_USD}`)
  })

  it('the included-lead count matches PACK_LEADS', () => {
    expect(PRICING.figsy.description).toContain(`${PACK_LEADS} approved leads`)
  })

  it('the per-lead price matches LEAD_PRICE_USD, in BOTH descriptions', () => {
    expect(PRICING.figsy.description).toContain(`$${LEAD_PRICE_USD} per approved lead`)
    expect(PRICING.lead_gen.description).toContain(`$${LEAD_PRICE_USD}`)
  })

  it('and the numbers it quotes are the CURRENT ones, not the retired ladder', () => {
    // Pins the actual values, so changing PACK_LEADS to 50 fails here rather than silently
    // making the sentence a lie. 100 / $99 / $4, founder-locked (ONE WALLET, 24-25 Jul).
    expect([PACK_LEADS, PACK_PRICE_USD, LEAD_PRICE_USD]).toEqual([100, 99, 4])
  })
})

describe('what this file records about #414 being only half-closable in code', () => {
  const src = readFileSync(join(__dirname, '../../../../packages/shared/src/constants/index.ts'), 'utf8')

  it('the constants file states that nothing renders these descriptions', () => {
    // Without this written down, the next person "fixes" the checkout copy by editing this
    // file and reports it done — the exact false-completion this repo keeps fighting.
    expect(src).toContain('nothing in this repo renders')
    expect(src).toContain('Stripe DASHBOARD product')
  })

  it('the retired trial constants are marked LEGACY rather than left to look current', () => {
    expect(src).toContain('THERE IS NO TRIAL')
    // Kept, not deleted — CORE-MAP rule 3 is founder-locked.
    expect(src).toContain('export const TRIAL_DAYS')
  })
})
