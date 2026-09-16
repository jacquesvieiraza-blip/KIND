import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PACK_LEADS, PACK_PRICE_USD, LEAD_PRICE_USD } from '@kind/shared'

// #413 / #327 — WHAT THE PUBLIC SITE AND THE CONTRACT SAY THE $99 BUYS.
//
// Both items were filed as "already fixed, just verify". Neither was. What they had was the
// WRONG DEFECT written down, which is worse than an open one — #413's row described a
// contradiction ("consumed at delivery… $3 at enroll") in text that no longer exists, so
// anyone checking found the old wording gone and moved on.
//
// THE REAL DEFECT, found by reading the pages against the code: after #562 the first $99 does
// NOT load the wallet — it buys the onboarding pack, and the first 100 approvals are INCLUDED.
// The site said the opposite in six places, including the TERMS, which is a contract:
//
//   terms.html   "your first purchase is $99, which loads your wallet"
//   terms.html   §5 "charged the flat $4 only when you approve"      ← omits the 100
//   terms.html   §6 "charged a flat $4 per approved lead"            ← omits the 100
//   pricing.html the hero, the wallet strip, the FAQ, and TWO meta descriptions
//
// It under-promises rather than over-charges, so no client was ever billed wrongly — but a
// contract that misdescribes what money buys is a problem in its own right, and "100 leads
// included for $99" is a materially better offer than "$99 loads your wallet, then $4 each".
// The same defect as the billing card fixed in #1226, on the public side.
//
// #327's survivor is separate: support.html claimed a client "can export your approved leads
// as a CSV". The ENDPOINT exists (`/leads/export/csv`) but the only UI is in the retired
// `(dashboard)` tree, which middleware redirects every signed-in client away from — so there is
// no button a client can reach. A true-at-the-API, false-in-practice claim.
//
// These read the real HTML, so the pages cannot drift apart again, and every figure is checked
// against the shared constants rather than a literal.

const site = (f: string) => readFileSync(join(__dirname, '../../../../apps/website', f), 'utf8')
const terms = site('terms.html')
const pricing = site('pricing.html')
const support = site('support.html')

// P30 (20 Aug): the homepage joins the pinned set — visible content only, because $299
// also appears in the auth-modal script and a comment; a guard satisfiable by a comment
// describing the sentence is not a guard.
const homeRaw = site('index.html')
const home = homeRaw.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/gi, '')
const PAGES: Array<[string, string]> = [['terms.html', terms], ['pricing.html', pricing], ['index.html', home]]

// ── R124 (16 Sep) — THE HOMEPAGE LEFT THE LEGACY MODEL AND THESE TWO PAGES HAVE NOT ──────
//
// The founder retired $299 + $4-per-approved-lead outright: "299/4 is gone. out. we are on the
// programme. all clients." The homepage pricing block now states the programme, so it can no
// longer satisfy assertions that REQUIRE the legacy figures — and those assertions must not be
// deleted, because `terms.html` and `pricing.html` still carry the legacy wording and are
// founder+legal territory (E35/E36). They are the contract; they get corrected deliberately,
// not as a side effect of a marketing edit.
//
// So the positive legacy-money assertions narrow to the two pages that still make the claim,
// and the homepage gets its own programme guard below. Every NEGATIVE assertion keeps covering
// all three — a page that has moved on must still never reacquire a false claim.
const LEGACY_PAGES: Array<[string, string]> = [['terms.html', terms], ['pricing.html', pricing]]

/** The homepage pricing block alone — the footer is a 29-page shared string, swept separately. */
const homePricing = homeRaw.slice(
  homeRaw.indexOf('<section class="gp-section gp-pricing"'),
  homeRaw.indexOf('<section class="gp-trust"'),
)

describe('the site no longer calls the first purchase a wallet top-up', () => {
  for (const [name, html] of PAGES) {
    it(`${name} does not say the $99 "loads your wallet"`, () => {
      // The specific false sentence. After #562 `isPackPurchase` skips `increment_wallet`, so
      // the first payment credits nothing — it buys the pack.
      expect(html).not.toContain('loads your wallet')
      expect(html).not.toContain('it loads your wallet')
    })
  }

  it('terms states plainly that the $99 is NOT a wallet top-up', () => {
    expect(terms).toContain('not a wallet top-up')
  })

  it('pricing says the same, so the marketing and the contract agree', () => {
    expect(pricing).toContain('not a wallet top-up')
  })
})

describe('both pages disclose the included leads, with the real numbers', () => {
  for (const [name, html] of LEGACY_PAGES) {
    it(`${name} names the pack price from the constant (${PACK_PRICE_USD})`, () => {
      expect(html).toContain(`$${PACK_PRICE_USD}`)
    })

    it(`${name} names the included count from the constant (${PACK_LEADS})`, () => {
      expect(html).toContain(`${PACK_LEADS} approved leads`)
    })

    it(`${name} names the per-lead price from the constant ($${LEAD_PRICE_USD})`, () => {
      expect(html).toContain(`$${LEAD_PRICE_USD}`)
    })
  }
})

describe('terms §5 and §6 describe the charge the code actually makes', () => {
  it('§5 no longer implies every approval costs $4', () => {
    // The omission that made §5 wrong: it described the post-pack behaviour as if it were the
    // only behaviour, to a client whose first hundred are free.
    expect(terms).not.toContain('Your wallet is charged the flat $4 only when')
    expect(terms).toContain('100 included approvals')
  })

  it('the never-charged list includes the pack approvals', () => {
    // A client reading "the following never consume a credit" should find their first hundred
    // there. That list is the one place in the contract they will look.
    expect(terms).toContain('first 100 approvals included in your $299 onboarding pack')
  })

  it('§6 no longer describes a flat $4 with no pack', () => {
    expect(terms).not.toContain('charged a flat $4 per approved lead. Any wallet balance')
    expect(terms).toContain('includes your first 100 approved leads; after those')
  })

  it('reviewing is still stated as free — the thing that was already right', () => {
    // #541's model: leads arrive masked and only the 👍 ever spends. Correct before, kept.
    expect(terms.toLowerCase()).toContain('reviewing is always free')
  })
})

describe('#327 — the CSV claim now matches what a client can actually do', () => {
  it('no longer tells the client they can export it themselves', () => {
    // The endpoint exists; the button does not. `/leads/export/csv` is authed and live, but its
    // only UI sits in the retired `(dashboard)` tree that middleware redirects clients out of.
    expect(support).not.toContain('you can export your approved leads as a CSV')
  })

  it('says how to actually get one, and admits there is no button', () => {
    expect(support).toContain('no self-serve export button yet')
    expect(support).toContain('hello@get-kind.com')
  })

  it('KEEPS the CRM dedupe claim — that one is true', () => {
    // `crm_existing` really does stop a charge for a contact the client already holds
    // (approve-lead.ts step 3), so removing this would replace a false claim with a lost one.
    // REWORDED 1 Aug (#327): the answer now names the two CRMs that actually exist
    // (HubSpot, Pipedrive) and denies Salesforce/Zoho outright, so the sentence changed
    // from "de-duplicate against your connected CRM" to "we de-duplicate against it".
    // The CLAIM is what matters and it is unchanged — assert the claim, not the sentence.
    expect(support).toMatch(/de-duplicate against (your connected CRM|it)/)
  })

  it('no page claims a native HubSpot or Salesforce integration', () => {
    // #327's original headline. pricing.html and virtual-assistant.html were cleaned earlier;
    // support.html only ever named them as CSV import TARGETS, which is honest.
    for (const [name, html] of PAGES) {
      expect(html, name).not.toMatch(/HubSpot (&|and) Salesforce integration/i)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// P30, REWRITTEN FOR THE PROGRAMME — the homepage states the whole offer, and the offer changed.
//
// P30's requirement is unchanged: a visitor must be able to read the WHOLE commercial offer in
// visible homepage content, not infer it. What changed is the offer. The old test demanded one
// visible line carrying "$299" and "100 approved leads" together — that line is exactly what
// the founder retired, so the guard would have blocked the correction it exists to protect.
//
// 🛑 AND THE HOMEPAGE PUBLISHES NO PRICE AT ALL. The founder chose structure-only, and R81 is
// still live on this point: the curve is "UNBUILT AND UNQUOTABLE" as public copy. The only
// calculator is the canonical one inside Milla, fed by `GET /my/programme/calculator`. A static
// page cannot interpolate from `@kind/shared` (no build step), so a number typed here would be
// a second pricing engine with no way to stay in sync — the working method's rule 7.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('P30 — the homepage states the whole programme offer in what a visitor can read', () => {
  it('the pricing block carries no retired per-lead or pack money', () => {
    expect(homePricing).not.toContain(`$${PACK_PRICE_USD}`)
    expect(homePricing).not.toContain(`${PACK_LEADS} approved leads`)
    expect(homePricing).not.toContain(`$${LEAD_PRICE_USD}`)
    expect(homePricing).not.toMatch(/per (approved )?lead/i)
    expect(homePricing).not.toMatch(/wallet|top up|prepaid/i)
  })

  it('no retired pack figure survives anywhere a visitor can read', () => {
    expect(home).not.toContain(`$${PACK_PRICE_USD}`)
    expect(home).not.toContain(`${PACK_LEADS} approved leads`)
  })

  it('the block states the payment structure the client actually meets', () => {
    // R74: 50% authorises bounded sourcing/preparation, 50% at Approve & Go Live.
    expect(homePricing).toContain('50/50')
    expect(homePricing).toMatch(/Half to start, half to go live/)
    expect(homePricing).toMatch(/second half is never charged/)
  })

  it('it states the free proof, the single approval and the no-subscription promise', () => {
    expect(homePricing).toMatch(/Free Proof/)
    expect(homePricing).toMatch(/One programme\. One approval\./)
    expect(homePricing).toContain('No subscription.')
  })

  it('it states that unused programme value does not expire', () => {
    // R74's locked wording: "unused programme value remains on account and never expires".
    expect(homePricing).toMatch(/[Uu]nused programme value .*never expires/)
  })

  it('🛑 it publishes NO figure from the pricing curve (R81 — unquotable)', () => {
    // The R81 anchors: 1 meeting $450 · 10 meetings $437.50 · 50+ meetings $400 floor.
    for (const n of ['$450', '$437.50', '$437.5', '$400']) {
      expect(home, `the homepage publishes the curve anchor ${n}`).not.toContain(n)
    }
    // And no typed per-meeting price in any shape.
    expect(home).not.toMatch(/\$\s?\d[\d,.]*\s*(per|a|\/)\s*(targeted )?(booked )?meeting/i)
  })

  // ⚠️ KNOWN REMAINDER, GUARDED RATHER THAN IGNORED. The footer tagline still reads "you only
  // pay $4 when you approve a lead" on all 29 pages and is swept as one shared string, not
  // page by page. Until then this pins the count at exactly one so a NEW per-lead claim cannot
  // slip onto the homepage unnoticed — and this assertion goes to 0 when the footer is swept.
  it('the only surviving per-lead price on the homepage is the shared footer tagline', () => {
    const hits = home.split(`$${LEAD_PRICE_USD}`).length - 1
    expect(hits, 'expected exactly the one footer occurrence pending the 29-page sweep').toBe(1)
    expect(home).toContain('you only pay $4 when you approve a lead')
  })
})
