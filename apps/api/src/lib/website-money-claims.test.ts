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
  for (const [name, html] of PAGES) {
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

describe('P30 — the homepage states the whole offer in what a visitor can read', () => {
  it('one visible line carries the pack price AND the included count together', () => {
    const line = home.split('\n').find(l => l.includes(`$${PACK_PRICE_USD}`) && l.includes(`${PACK_LEADS} approved leads`))
    expect(line, 'the $299 pack line is missing from the visible homepage').toBeTruthy()
  })
})
