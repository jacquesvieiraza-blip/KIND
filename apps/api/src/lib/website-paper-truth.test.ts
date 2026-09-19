import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { PACK_LEADS, PACK_PRICE_USD, LEAD_PRICE_USD, PROGRAMME_ANCHOR_1_USD, PROGRAMME_FLOOR_USD } from '@kind/shared'

// #413 #410 #327 — THE PAPER MATCHES THE PRODUCT.
//
// The three items named specific lines. Most were already fixed by the July sweeps, and two
// pointed at things that no longer exist (see the PR body). What the sweep actually found was
// a claim NONE of them named, because it is not in the visible HTML at all:
//
//   THE SIGNUP MODAL, on NINE pages, said:
//     "Free to start — you only pay per qualified lead. No card required."
//
// Three falsehoods in one sentence, rendered at the exact moment a person decides to sign up:
// there is no free start (the first purchase is $99), "per qualified lead" is the retired
// ladder's phrase, and a card IS required. It survived every previous sweep because it is
// assigned inside a <script> block — `getElementById('auth-sub').textContent = …` — so a
// visual walk or a grep over rendered text never sees it.
//
// These guards read the real files. Money numbers come from @kind/shared so the site can never
// drift from the constants again.

const WEB = join(__dirname, '../../../website')
const pages = readdirSync(WEB).filter(f => f.endsWith('.html'))
const read = (f: string) => readFileSync(join(WEB, f), 'utf8')

describe('the signup modal tells the truth about money', () => {
  it('no page promises a free start or "no card required"', () => {
    const offenders = pages.filter(f => {
      const s = read(f)
      return /Free to start/i.test(s) || /No card required/i.test(s)
    })
    expect(offenders, `still promising a free start: ${offenders.join(', ')}`).toEqual([])
  })

  it('and no page prices the product "per qualified lead" — the retired ladder\'s phrase', () => {
    // The model is $99 for 100 included, then $4 per APPROVED lead. "Qualified" was the
    // 8 Jul ladder, superseded 24 Jul.
    const offenders = pages.filter(f => /per qualified lead/i.test(read(f)))
    expect(offenders, `retired pricing phrase on: ${offenders.join(', ')}`).toEqual([])
  })

  // ⛓️ REWRITTEN 16 Sep (R124) — THE SUBTITLE SELLS THE PROGRAMME NOW, AND THE MODAL IS DEAD.
  //
  // This demanded the $299 pack and the 100 included in the signup subtitle. The founder has
  // retired that model outright — "299/4 is gone. out. we are on the programme. all clients." —
  // so the assertion would now REQUIRE a retired price on nine pages.
  //
  // 🛑 AND THE MODAL IT GUARDS CANNOT BE OPENED. `<div id="auth-modal">` exists on 0 of 29 pages
  // and there are 0 call sites for `openAuth`, so `auth-sub` is written by script into an
  // element that was never in the markup. That is why this guard passed for months while the
  // sentence was unreachable: it proves a STRING is present, never that a customer can read it.
  // The subtitle is corrected rather than deleted, because dead code carrying a retired price is
  // what a future restore of the modal would put straight back in front of a buyer.
  it('the signup subtitle states the programme, not the retired pack', () => {
    const withModal = pages.filter(f => read(f).includes("getElementById('auth-sub')"))
    expect(withModal.length, 'the signup subtitle disappeared entirely').toBeGreaterThan(0)
    for (const f of withModal) {
      // ⚠️ SCOPED TO THE SUBTITLE ASSIGNMENT, NOT THE WHOLE PAGE. `pricing.html` and
      // `terms.html` still carry the legacy figures in BODY COPY — they are the contract and
      // the price page, they are founder+legal (E35/E36), and `website-money-claims` still
      // REQUIRES those figures there. A page-wide assertion here would collide with that guard
      // and fail on copy this change deliberately does not touch.
      const line = read(f).split('\n').find(l => l.includes("getElementById('auth-sub')")) ?? ''
      expect(line, `${f} still promises the retired $${PACK_PRICE_USD} pack in the signup subtitle`).not.toContain(`$${PACK_PRICE_USD}`)
      expect(line, `${f} still promises the ${PACK_LEADS} included in the signup subtitle`).not.toMatch(new RegExp(`${PACK_LEADS} approved leads`, 'i'))
      expect(line, `${f} subtitle lost the programme sentence`).toContain('Free Proof before you pay')
    }
  })
})

describe('#413 — the contract matches the payment path', () => {
  const terms = read('terms.html')

  // ⛓️ RE-POINTED 19 Sep — THE CHARGE PATH THIS GUARDED NO LONGER EXISTS.
  //
  // It pinned the wallet: "approvals pause below $4", "your 100 included approvals", the $299
  // pack. The product is now a programme paid in two halves around one approval — there is no
  // balance to fall low and no per-approval charge to pause. Asserting the old sentences would
  // force the contract to keep describing a charge path the code cannot make.
  //
  // The DUTY is unchanged and is what these now assert: the contract must state exactly when
  // money is taken, and must never imply a charge that happens earlier than it does.
  it('no outreach is paid for or sent before the client has approved', () => {
    expect(terms).toMatch(/No outreach is sent until it is paid and you have instructed us to go live/)
    expect(terms).toMatch(/falls due after you have approved the prepared programme/)
  })

  it('the two payments are stated as halves, and the second is escapable', () => {
    expect(terms).toMatch(/50% of your programme price/)
    expect(terms).toMatch(/If you pause before go-live, the second payment is never taken/)
  })

  it('and still states the model itself correctly', () => {
    // Derived from the R81 curve, not typed: the rate and the floor.
    expect(terms).toContain(`$${PROGRAMME_ANCHOR_1_USD}`)
    expect(terms).toContain(`$${PROGRAMME_FLOOR_USD}`)
    expect(terms).toMatch(/reviewing is always free/i)
    expect(terms).toMatch(/no subscription to cancel/i)
  })
})

describe('#410 — the sub-processor lists describe the real stack', () => {
  const legal = ['privacy.html', 'dpa.html', 'dpa-us.html']

  it('every legal page names PDL and Hunter as the client sourcing stack', () => {
    for (const f of legal) {
      const s = read(f)
      expect(s, `${f} omits PeopleDataLabs`).toMatch(/PeopleDataLabs/)
      expect(s, `${f} omits Hunter`).toMatch(/Hunter/)
    }
  })

  it('and none of them frames Apollo as a standard client sub-processor', () => {
    // Founder-locked 30 Jul, re-affirmed 1 Aug: "Apollo is for OUR hunting only — PDL +
    // Hunter stay the client-facing stack." The BYO-key path exists, so the DISCLOSURE stays
    // (removing it would under-disclose if a client ever supplied a key) — but it must not
    // read as part of the standard stack.
    for (const f of legal) {
      const s = read(f)
      if (!/Apollo/i.test(s)) continue
      expect(s, `${f} still says Apollo is "used only where configured"`).not.toMatch(/used only where (a )?[Cc]lient configures it/)
      expect(s, `${f} does not say Apollo is ours`).toMatch(/own prospecting/)
    }
  })

  it('and no retired payment processor is named in a LEGAL page', () => {
    // Paystack was deleted in #352 and Flutterwave in #314. A DPA naming a processor we
    // removed is a disclosure that misdescribes where a client's money goes.
    //
    // SCOPED TO THE LEGAL PAGES DELIBERATELY, and the first version was not — it swept the
    // whole site and flagged figsy.html. Reading it showed a mock lead table: "Sarah Mensah —
    // Paystack · Lagos", "David Okonkwo — Flutterwave · Lagos". Those are FICTIONAL PROSPECTS
    // who work at real Nigerian fintechs, which is exactly what a plausible lead list looks
    // like. A company name as a prospect's employer is not a disclosure about our payment
    // stack, and a guard that cannot tell the two apart would force the next person to
    // vandalise a legitimate mockup to get the gate green.
    const offenders = legal.concat('terms.html').filter(f => /paystack|flutterwave/i.test(read(f)))
    expect(offenders, `retired processor named on: ${offenders.join(', ')}`).toEqual([])
  })
})

describe('#327 — integration claims match what is wired', () => {
  it('Salesforce is never claimed as an integration', () => {
    // lib/crm.ts implements pushToHubSpot and pushToPipedrive. There is no Salesforce path.
    for (const f of pages) {
      const s = read(f)
      if (!/salesforce/i.test(s)) continue
      expect(s, `${f} mentions Salesforce without denying integration`).toMatch(/do not integrate with Salesforce/i)
    }
  })

  it('the support answer names the two CRMs that exist', () => {
    const s = read('support.html')
    expect(s).toMatch(/HubSpot or Pipedrive/)
    expect(s).toMatch(/do not integrate with Salesforce or Zoho/i)
  })
})
