import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { PACK_LEADS, PACK_PRICE_USD, LEAD_PRICE_USD } from '@kind/shared'

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

  it('every page that shows the signup subtitle states the pack correctly', () => {
    const withModal = pages.filter(f => read(f).includes("getElementById('auth-sub')"))
    expect(withModal.length, 'the signup modal disappeared entirely').toBeGreaterThan(0)
    for (const f of withModal) {
      const s = read(f)
      expect(s, `${f} does not state the $${PACK_PRICE_USD} pack`).toContain(`$${PACK_PRICE_USD}`)
      expect(s, `${f} does not state the ${PACK_LEADS} included`).toMatch(new RegExp(`${PACK_LEADS} approved leads included`, 'i'))
    }
  })
})

describe('#413 — the contract matches the charge path', () => {
  const terms = read('terms.html')

  it('a low balance only pauses approvals AFTER the pack is used', () => {
    // `approve-lead.ts` returns insufficient_funds ONLY in the else-branch, once pack.left
    // reaches 0. The terms said approvals pause below $4 full stop, which is false for the
    // first 100 — and it is the contract, so it has to be exact.
    expect(terms).toMatch(/Once your 100 included approvals are used/)
    expect(terms).toMatch(/a zero balance does not stop you approving/)
  })

  it('and still states the model itself correctly', () => {
    expect(terms).toContain(`$${PACK_PRICE_USD}`)
    expect(terms).toMatch(new RegExp(`flat \\$${LEAD_PRICE_USD}`))
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
