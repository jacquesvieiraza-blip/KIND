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
import { checkoutLineName } from './stripe'

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
  it('the API first-purchase gate derives from PACK_PRICE_USD', () => {
    const code = stripComments(src('routes/stripe.ts'))
    expect(code).toContain('const FIRST_PURCHASE_USD = PACK_PRICE_USD')
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
  // Found 4 Aug by the FOUNDER, from the dashboard: the catalogue has nine products and none
  // is the pack, because this checkout builds its line item inline — and the inline name was
  // 'K.I.N.D wallet top-up' for every purchase INCLUDING the first. The first purchase is the
  // one thing that is NOT a wallet top-up (#562), and website-money-claims.test.ts forces the
  // site and the Terms to say so in those words. The payment page was the last copy of the lie
  // and the only surface no test pinned.
  it('the first purchase is named as the pack, never as a top-up', () => {
    const first = checkoutLineName(true, PACK_LEADS)
    expect(first).toContain('onboarding pack')
    expect(first).toContain(String(PACK_LEADS))
    expect(first.toLowerCase()).not.toContain('top-up')
  })
  it('later purchases really are top-ups and say so', () => {
    expect(checkoutLineName(false, PACK_LEADS)).toBe('K.I.N.D wallet top-up')
  })
  it('and the route passes isFirst through — the label cannot fork from the gate', () => {
    // The defect was not the function (it did not exist); it was that the route KNEW isFirst
    // and never told the checkout. Pin the wiring, not just the words.
    const code = stripComments(src('routes/stripe.ts'))
    expect(code).toContain('isFirstPurchase: isFirst')
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
