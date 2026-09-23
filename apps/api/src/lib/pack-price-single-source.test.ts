// THE PACK PRICE HAS EXACTLY ONE HOME, AND BOTH SIDES OF THE TILL MUST READ IT.
//
// Written 3 Aug with the price move 99 → 299, because that move exposed a defect the existing
// tests could not see.
//
// WHAT HAPPENED. `#563` moved the money numbers into `@kind/shared` so the portal and the API
// could never disagree, and fixed the PORTAL to derive its first-purchase button from
// `PACK_PRICE_USD`. `billing-pack-copy.test.ts` then pinned that derivation — but only on the
// portal side. The API's own gate in `routes/stripe.ts` still read:
//
//     const FIRST_PURCHASE_USD = 99
//
// So on the day the constant moved to 299, the portal would POST 299 and the server would
// reject it with `first_purchase_must_be_99`. **Every first payment would have failed at the
// till** — on the single request that turns a signup into a client — and the only symptom
// would have been a 400 that nothing was watching for. Nothing in the suite would have gone
// red: the portal test passes (it derives), and the constant test passes (99 became 299).
//
// A single-source rule enforced on ONE side of a two-sided handshake is not enforced.
//
// These tests read the SOURCE TEXT rather than the runtime value on purpose. A test that
// imports the constant and compares it to itself proves nothing about whether some other file
// typed the number by hand — and the hand-typed copy is the entire failure mode.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PACK_PRICE_USD, PACK_LEADS, LEAD_PRICE_USD } from '@kind/shared'

const src = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8')

/**
 * Strip comments before asserting on source.
 *
 * ⚠️ NOT OPTIONAL IN THIS REPO, and this file is a live example of why: the comment block
 * above deliberately quotes `const FIRST_PURCHASE_USD = 99` — the exact string the test below
 * forbids. Without stripping, this file's own explanation of the bug would fail the test that
 * catches the bug. That has now happened four separate times here (#607, #406, #349, and this).
 */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

describe('the money constants are the founder-locked ones', () => {
  it('$299 pack · 100 included · $4 a lead thereafter (founder-locked 3 Aug)', () => {
    // Pinned TOGETHER. The price and the per-lead rate are one offer — "$299 includes your
    // first 100, then $4" is a single sentence a client is charged against, and any one of
    // the three moving alone makes the other two a lie on the page they share.
    expect([PACK_PRICE_USD, PACK_LEADS, LEAD_PRICE_USD]).toEqual([299, 100, 4])
  })
})

describe('both sides of the till derive the price — neither types it', () => {
  // ⛓️ RE-AIMED 23 Sep (R137 · old-code removal). WAS: 'the API first-purchase gate derives from
  // PACK_PRICE_USD' (`const FIRST_PURCHASE_USD = PACK_PRICE_USD` in routes/stripe.ts). The $299
  // pack is retired (founder: *"the 299/4 is retired/ this must go"*) and the `/checkout`
  // handler that held the gate is deleted, so there is no API till left to disagree with the
  // portal. The stronger state is pinned instead: no first-purchase gate exists at all.
  it('the API first-purchase gate is gone — the retired till has no price to disagree about', () => {
    const code = stripComments(src('routes/stripe.ts'))
    expect(code).not.toContain('FIRST_PURCHASE_USD')
    expect(code).not.toContain('isFirstPurchase')
  })

  it('and the API gate never re-hardcodes a number', () => {
    // The regression itself: `const FIRST_PURCHASE_USD = 99`.
    const code = stripComments(src('routes/stripe.ts'))
    expect(code).not.toMatch(/FIRST_PURCHASE_USD\s*=\s*\d+/)
  })

  it('the error code does not bake a price into its name', () => {
    // `first_purchase_must_be_99` went stale the moment the price moved — an error name that
    // has to be edited when a number changes is a number in disguise. Clients and logs both
    // read this string.
    const code = stripComments(src('routes/stripe.ts'))
    expect(code).not.toContain('first_purchase_must_be_99')
  })

  it('the client-facing pack label derives both numbers', () => {
    // `packLabel` is the sentence in Milla immediately before a client pays. It read
    // 'Load $99 to start — 100 leads included' with BOTH numbers hand-typed.
    const code = stripComments(src('lib/onboarding-pack.ts'))
    expect(code).toContain('`Load $${PACK_PRICE_USD} to start — ${PACK_LEADS} leads included`')
  })

  it('and no shipping source under lib/ or routes/ still says $99', () => {
    // A backstop for the surfaces not individually named above. Comments are stripped first
    // because the historical record of #562 legitimately discusses the old $99 — deleting
    // that history is not the goal; shipping it as a live price is what must not happen.
    const files = [
      'lib/onboarding-pack.ts', 'lib/client-step.ts', 'lib/demo-mbf.ts',
      'routes/stripe.ts', 'routes/auth.ts', 'routes/operator.ts', 'routes/internal.ts',
    ]
    for (const f of files) {
      expect(stripComments(src(f)), `${f} still ships a literal $99`).not.toContain('$99')
    }
  })
})

describe('the line the client reads on the Stripe payment page itself', () => {
  // Found 4 Aug by the FOUNDER, from the dashboard: the inline line-item name was
  // 'K.I.N.D wallet top-up' for every purchase INCLUDING the first, so `checkoutLineName` named
  // the first purchase as the pack.
  //
  // ⛓️ RE-AIMED 23 Sep (R137 · old-code removal). WAS three tests: 'the first purchase is named
  // as the pack, never as a top-up', 'later purchases really are top-ups and say so', and 'and
  // the route passes isFirst through — the label cannot fork from the gate'. The pack and the
  // top-ups are retired, and `checkoutLineName` and the wallet session that used it are DELETED,
  // so no Stripe payment page can show either line again. Pinned instead: nothing mints it.
  it('no code can mint a pack or top-up line item any more', () => {
    for (const f of ['lib/stripe.ts', 'routes/stripe.ts']) {
      const code = stripComments(src(f))
      expect(code, `${f} still names a checkout line`).not.toContain('checkoutLineName')
      expect(code, `${f} still mints a wallet top-up line`).not.toContain("'K.I.N.D wallet top-up'")
      expect(code, `${f} still builds an inline line item`).not.toContain('line_items')
    }
  })
})

describe('the Stripe product description a client reads at checkout', () => {
  it('quotes the current price and the included count', () => {
    // ⚠️ THIS IS THE REPO'S COPY, NOT THE DASHBOARD'S. #414 records that checkout renders the
    // Stripe *product* behind the Price ID — no code change can reach it. This test keeps the
    // repo's wording honest so the founder has something correct to paste; it cannot and does
    // not prove what the live checkout says.
    const { PRICING } = require('@kind/shared')
    expect(PRICING.figsy.description).toContain(`$${PACK_PRICE_USD}`)
    expect(PRICING.figsy.description).toContain(`${PACK_LEADS} approved leads`)
    expect(PRICING.figsy.description).not.toContain('$99')
  })
})
