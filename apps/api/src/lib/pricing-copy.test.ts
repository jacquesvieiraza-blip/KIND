import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PRICING, PRODUCTS } from '@kind/shared'
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

// ── #414's SIBLING: PRODUCTS STILL SOLD THE RETIRED SaaS ──────────────────────────────────
//
// One field up from the copy above, `PRODUCTS` described Milla as a $49/mo "AI Virtual
// Assistant" and Vida as a $29/mo "AI Chatbot Agent". After the 22-Jul pivot Milla is the
// CLIENT PORTAL and Vida is OUR OPERATOR CONSOLE — neither is a subscription, and neither is
// for sale. Same defect class as the FIGSY description: a price and a product claim sitting in
// the constants long after we stopped charging it.
//
// Marked LEGACY rather than deleted (CORE-MAP rule 3, founder-locked). These assertions read
// the real file, so the marker cannot quietly disappear.
describe('the retired SaaS products are marked LEGACY', () => {
  const src = readFileSync(join(__dirname, '../../../../packages/shared/src/constants/index.ts'), 'utf8')
  const header = src.slice(0, src.indexOf('export const PRODUCTS'))

  it('a LEGACY marker sits immediately above the PRODUCTS block', () => {
    // Sliced above the declaration on purpose: a marker further down the file would not be
    // read by someone who lands on `PRODUCTS` and copies a price out of it.
    expect(header).toContain('NONE OF THESE FOUR PRODUCTS IS CURRENTLY SOLD')
  })

  it('it says what Milla and Vida actually are now', () => {
    expect(header).toContain('CLIENT PORTAL')
    expect(header).toContain('OPERATOR CONSOLE')
  })

  it('it says the Stripe Price objects are dormant, not gone', () => {
    // The dangerous half. `/stripe/subscribe` and the subscription webhook still work, so a
    // live Price ID could take money for a product we do not sell — and that is a Stripe
    // dashboard action, not something this file can fix.
    expect(header).toContain('DORMANT')
    expect(header).toContain('Stripe-dashboard action')
  })

  it('the block is KEPT, not deleted', () => {
    expect(src).toContain('export const PRODUCTS')
    expect(header).toContain('CORE-MAP rule 3')
  })

  it('the header contradicts every price still sitting in the block', () => {
    // My first attempt at this policed the `name`/`description` strings for "AI Virtual
    // Assistant" and "AI Chatbot Agent" — and it failed, correctly, against my own change:
    // marking the block LEGACY does not rewrite the names inside it. Rewriting them was not
    // an option either, because those labels mirror what the DORMANT Stripe Price objects are
    // still called, and renaming here would not rename them (the same trap the FIGSY block
    // above documents).
    //
    // So the guard is the reachable contradiction instead: every price a reader could copy
    // out of this block must be named in the header as not-sold. `$49` and `$29` are the two
    // that changed meaning at the pivot.
    for (const price of ['$49', '$29']) {
      expect(header, `header must contradict ${price}`).toContain(price)
    }
    expect(header).toContain('not on sale')
  })

  it('every PRODUCTS entry is still billed monthly in the data — which is WHY the header is needed', () => {
    // Pinning the thing that cannot be fixed here. `billing: 'monthly'` and `price_usd` are
    // the shape the Stripe subscription mapping mirrors, so they stay. That is precisely the
    // reason a prose marker is the only available fix.
    for (const [key, p] of Object.entries(PRODUCTS)) {
      expect((p as { billing: string }).billing, key).toBe('monthly')
    }
  })
})

// The importer claim this file made in PR #1214 was wrong, and a test that asserts the
// correction is the only thing that stops it being re-asserted next time.
describe('the corrected record of who imports PRODUCTS', () => {
  const root = join(__dirname, '../../../..')
  const src = readFileSync(join(root, 'packages/shared/src/constants/index.ts'), 'utf8')

  it('the file admits lib/stripe.ts does NOT read PRODUCTS', () => {
    // #1214 wrote "the only importers are lib/stripe.ts …". stripe.ts imports PRICING only;
    // STRIPE_SUBSCRIPTIONS is an independent literal. Which means the prices are duplicated
    // in two files and can drift — the opposite of what the old note implied.
    expect(src).toContain('imports `PRICING` only and never touches `PRODUCTS`')
  })

  it('the three dead PRODUCTS imports are gone', () => {
    for (const f of [
      'apps/admin/src/app/cockpit/page.tsx',
      'apps/portal/src/app/(dashboard)/dashboard/chatbot/page.tsx',
      'apps/portal/src/app/(dashboard)/dashboard/assistant/page.tsx',
    ]) {
      expect(readFileSync(join(root, f), 'utf8'), f).not.toContain("PRODUCTS } from '@kind/shared'")
    }
  })

  it('marketplace — the one page that really renders these prices — still compiles against them', () => {
    // Deliberately NOT cleaned: it uses PRODUCTS.*.price_usd for real. It is unreachable
    // (middleware redirects clients out of (dashboard)), so it is stale copy rather than a
    // live overcharge — but the import is load-bearing and must stay.
    const mp = readFileSync(join(root, 'apps/portal/src/app/(dashboard)/dashboard/marketplace/page.tsx'), 'utf8')
    expect(mp).toContain("import { PRODUCTS } from '@kind/shared'")
    expect(mp).toContain('PRODUCTS.virtual_assistant.price_usd')
  })
})
