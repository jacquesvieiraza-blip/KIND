import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// ── THE SITE MAY NOT CLAIM WHAT THE INFRASTRUCTURE DOES NOT DO (P13, 20 Aug) ───────────────
//
// The founder opened his own Supabase and Railway dashboards and the site was wrong in five
// separate ways at once. `trust.html` — the page a nervous client reads before signing — claimed
// a city we do not host in, a backup retention **four times** longer than reality,
// geo-redundancy nobody has evidence of, a US region we cannot provision, and a per-client
// retention setting that **does not exist in the code**.
//
// What the screens actually show, and what this file now pins:
//   • DATABASE  — Supabase eu-west-1, Dublin, Ireland
//   • COMPUTE   — Railway US West, California
//   • BACKUPS   — daily, 13–20 Aug visible = **7 days**, not 30
//
// ⚠️ TWO HALVES, ALWAYS TOGETHER. Correcting only "Cape Town → Dublin" would swap one false
// sentence for another: an EU client's first question is who touches the data, and a US compute
// tier is exactly what they are asking about. Saying it first is worth more than hiding it.
//
// ⚠️ AND THE REPLACEMENTS MUST NOT NEED A FOOTNOTE EITHER. Fable struck three clauses from the
// proposed wording before it shipped — "signed data-processing agreements with every
// sub-processor", "Standard Contractual Clauses cover transfers", "Point-in-time restore
// available" — because **nobody has produced that paper** (F13 is open; the PDL Order Form has
// not even been found) and a beta tab is not an enabled feature. We are fixing this page
// because it asserted things nobody verified. The fix may not do the same thing.

const SITE = join(__dirname, '../../../website')
const PAGES = readdirSync(SITE).filter(f => f.endsWith('.html'))
const read = (f: string) => readFileSync(join(SITE, f), 'utf8')

/** HTML comments stripped — a comment recording a removed claim is not the claim. */
const codeOf = (s: string) => s.replace(/<!--[\s\S]*?-->/g, '')

describe('the guard is reading the real site', () => {
  it('finds all 29 pages', () => {
    // A moved directory would leave every assertion below iterating nothing and passing.
    expect(PAGES.length).toBe(29)
    expect(read('trust.html').length).toBeGreaterThan(5000)
  })
})

describe('① banned literals — every one was on the live site this morning', () => {
  const BANNED: Array<[string, string]> = [
    ['GDPR &amp; POPIA compliant', 'a compliance verdict we award ourselves — 47 copies of it'],
    ['af-south-1', 'the database is eu-west-1 (Dublin), not af-south-1'],
    ['US region on request', 'no region resolver, no US instance, no provisioning path (#258 is 🔴)'],
    ['US region available on request', 'same — the capability does not exist'],
    ['US data residency', 'same — promised on privacy.html to enterprise clients'],
    ['geo-redundant', 'nothing on the backup screen evidences geo-redundancy'],
    ['30-day retention', 'the backup screen shows 7 days (13–20 Aug)'],
    ['retention settings', 'no such setting exists — searched api, portal and shared'],
    ['DPA and SCCs in place', 'F13 is open; the PDL Order Form has not been found'],
    ['fully compliant with the CCPA', 'compliance is a regulator\'s conclusion, not ours'],
    ['Point-in-time restore available', 'the screenshot shows a BETA TAB, not an enabled feature'],
    // ⛓️ ADDED 20 Aug, LATE. P13 phase 1 listed this family as suspect and the ruled ①–⑦ set did
    // not cover it — so both instances were still serving after the pass that was supposed to end
    // them, and Fable's end-of-day sweep is what found them. A claim about a VENDOR is no more
    // checkable than a claim about ourselves: nobody has read PeopleDataLabs', Hunter's or
    // Apollo's consent machinery, and F13 records that we have not even found the PDL order form.
    ['consent infrastructure', 'a claim about vendors nobody has verified — the same class R56 bans'],
    // ⛓️ P30 (20 Aug). The OLD homepage served "Every lead is GDPR & POPIA consented before
    // anyone is ever contacted" — the opposite of privacy.html's legitimate-interest basis
    // (#676/#677). It survived the P13 sweep because the banned literal said "compliant" and
    // this said "consented" — one noun apart. Both spellings banned, both directions.
    ['POPIA consented', 'consent was never the basis — legitimate interest (privacy.html, #676/#677)'],
    ['GDPR consented', 'same claim, other spelling'],
  ]

  for (const [needle, why] of BANNED) {
    it(`no page says "${needle}"`, () => {
      const offenders = PAGES.filter(f => codeOf(read(f)).includes(needle))
      expect(offenders, `${offenders.join(', ')} — ${why}`).toEqual([])
    })
  }
})

describe('② "Cape Town" and "South Africa" are banned in a HOSTING sentence only', () => {
  // ⚠️ SCOPED, BECAUSE A BLANKET BAN WOULD GO RED ON SENTENCES THE FOUNDER PROTECTED.
  // `figsy.html` carries testimonial cities and `dpa.html:455` says "our team is based in South
  // Africa" — both true, both NO-TOUCH. A guard that cannot tell a hosting claim from a
  // person's location would force somebody to delete a true sentence to get the suite green,
  // which is how a guard starts causing the damage it was written to prevent.
  const HOSTING = /hosted|hosting|data centre|data center|region|stored|storage|backup|residency|data store|infrastructure|primary data/i

  for (const place of ['Cape Town', 'South Africa']) {
    it(`no page places our INFRASTRUCTURE in ${place}`, () => {
      const offenders: string[] = []
      for (const f of PAGES) {
        for (const line of codeOf(read(f)).split('\n')) {
          if (!line.includes(place)) continue
          // The sentence around the mention, tags stripped, is what a reader sees.
          const text = line.replace(/<[^>]*>/g, ' ')
          if (HOSTING.test(text)) offenders.push(`${f}: ${text.trim().slice(0, 90)}`)
        }
      }
      expect(offenders, `a hosting claim still names ${place}:\n${offenders.join('\n')}`).toEqual([])
    })
  }

  it('⚠️ AND THE PROTECTED SENTENCES SURVIVED — the guard did not win by deletion', () => {
    // Without this, "no offenders" is equally satisfied by having removed every mention,
    // including the true ones. That is the #617 shape: a green that cannot tell fixed from
    // flattened.
    expect(read('dpa.html'), 'the team really is in South Africa').toContain('Our team is based in South Africa')
    expect(read('figsy.html'), 'testimonial cities are a different problem, not this pass').toContain('Cape Town')
    expect(read('terms.html'), 'POPIA is still a named law').toContain('POPIA (South Africa)')
  })
})

describe('③ the truth is stated, both halves, wherever residency is discussed', () => {
  const RESIDENCY_PAGES = ['trust.html', 'privacy.html', 'dpa.html']

  for (const f of RESIDENCY_PAGES) {
    it(`${f} names Dublin/eu-west-1 AND the US compute tier`, () => {
      // Half the truth is a new false sentence. The compute tier is the half a client asks
      // about, so it may never be the half that is omitted.
      const s = read(f)
      expect(s, 'where the data is stored').toMatch(/Dublin|eu-west-1/)
      expect(s, 'and where it is processed — the half that must not be dropped').toMatch(/US West|United States \(Railway/)
    })
  }

  it('the backup line states 7 days and the real region', () => {
    expect(read('trust.html')).toContain('retained for 7 days')
    expect(read('trust.html')).toContain('same region as the database (Dublin, Ireland)')
  })
})

describe('④ the replacement claims are ones the CODE can prove', () => {
  it('the legitimate-interest paragraph replaced the "every lead consents" lie', () => {
    // Leads are delivered on legitimate interest; the consent email exists but is not a
    // precondition of delivery (`campaignReadyLeadIds` enrols on verified-email OR consent).
    // Every clause of the replacement is code: unsubscribe headers on both send sites, the
    // postal footer on all three paths, and a global blocklist.
    for (const f of ['support.html', 'about.html']) {
      expect(read(f), `${f} still claims every lead consents`).not.toContain('consent workflow')
      expect(read(f)).toContain('legitimate-interest basis')
      expect(read(f)).toContain('one-click unsubscribe and our postal address')
    }
  })

  // ⛓️ REWRITTEN 16 Sep — FROM A FREQUENCY COUNT TO A NAMED-PAGE REQUIREMENT.
  //
  // This asserted the badge appeared on MORE THAN 20 pages. It never measured 20 deliberate
  // statements: the claim sat inside the global mega-menu, so one string in the shared nav
  // scored 29 pages. The number was counting NAVIGATION DUPLICATION, not intent.
  //
  // Section 1 removed the mega-menus by founder direction, and the count fell to 4 — the pages
  // that state the claim in their own body, which is where it was ever actually said. Nothing
  // became false; a true claim lost a carrier it should never have depended on.
  //
  // 🛑 AND THE THRESHOLD IS NOT LOWERED TO 4, BECAUSE THAT WOULD REPEAT THE MISTAKE. A smaller
  // number is still a count: it would pass if the claim vanished from `pricing.html` and
  // appeared on any other page instead. The guard now names the pages, so it proves the thing
  // it cares about — this claim, on these pages — and cannot be satisfied by coincidence.
  //
  // ⚠️ IT DELIBERATELY SAYS NOTHING ABOUT THE NAV OR FOOTER. Coupling a truth guard to a
  // navigation shape is what made it stale in the first place, and the footer is a later
  // founder-approved section this test must not pre-empt.
  const PRIVACY_CLAIM = 'Privacy controls built in'
  const PRIVACY_CLAIM_PAGES = ['about.html', 'demo.html', 'pricing.html', 'vs-hiring-an-sdr.html']

  for (const page of PRIVACY_CLAIM_PAGES) {
    it(`${page} states the privacy claim in its own body`, () => {
      expect(read(page), `${page} lost "${PRIVACY_CLAIM}"`).toContain(PRIVACY_CLAIM)
    })
  }

  it('the claim is a page statement, not a count of navigation copies', () => {
    // Belt-and-braces on the rewrite itself: every required page is real, and the guard is
    // measuring named pages rather than a total that any other page could top up.
    for (const page of PRIVACY_CLAIM_PAGES) {
      expect(PAGES, `${page} is required by this guard but is not on disk`).toContain(page)
    }
    expect(PRIVACY_CLAIM_PAGES.length).toBe(4)
  })

  it('⚠️ NOTHING claims paper nobody has produced (Fable\'s A1/A3)', () => {
    // The strongest lesson of this pass: the fix must not re-assert the class of thing being
    // fixed. Naming SCCs becomes true when counsel confirms them (H30), and not before.
    // ⚠️ THE TWO LEGAL INSTRUMENTS ARE EXCLUDED, AND THIS IS A FLAGGED DECISION, NOT AN
    // OVERSIGHT. `dpa.html` and `dpa-us.html` ARE the contract — `dpa.html:296` commits us to
    // "appropriate safeguards including Standard Contractual Clauses". Striking that clause is
    // a legal act with contractual consequences, not a copy edit, and the founder's own
    // NO-TOUCH already routes this document's framing to counsel (H30). Applying A1 literally
    // here would mean an agent silently weakening a customer contract.
    //
    // So A1 is enforced on every page a PROSPECT reads, and the DPA's own clause is left
    // standing and reported to the founder for counsel's decision.
    const MARKETING = PAGES.filter(f => f !== 'dpa.html' && f !== 'dpa-us.html')
    for (const f of MARKETING) {
      const s = codeOf(read(f))
      expect(s, `${f} names Standard Contractual Clauses — unconfirmed (F13/H30)`).not.toContain('Standard Contractual Clauses')
      expect(s, `${f} claims signed DPAs with sub-processors — unconfirmed`).not.toMatch(/signed data-processing agreements/i)
    }
    // And the exclusion is NARROW: the DPA may keep its safeguards clause, but it may not
    // carry the marketing-grade claims this pass removed everywhere else.
    for (const f of ['dpa.html', 'dpa-us.html']) {
      expect(codeOf(read(f)), `${f} still claims signed sub-processor DPAs`).not.toMatch(/signed data-processing agreements/i)
    }
  })
})

// ── ⑤ THE PORTAL'S OWN LEGAL PAGES — ADDED 28 Aug (Founder Truth Reset, Step 6) ─────────────
//
// ⚠️ WHAT EARNED THIS BLOCK, AND IT IS THE WHOLE POINT OF IT. Everything above reads
// `apps/website`. `apps/portal/public` serves its OWN privacy.html and terms.html to signed-in
// clients, and nothing watched them. So on 20 Aug the site was corrected to Dublin/eu-west-1
// and the portal was not — and for the next eight days a paying client opening Privacy from
// inside the product was told their data lives in "af-south-1 (Cape Town, South Africa)", that
// the hosting is "fully compliant with the CCPA", and that we would "provision a dedicated
// US-region instance" on request. Three claims the guard already banned, on pages the guard
// could not see. A guard scoped to one directory proves nothing about the other.
//
// ⚠️ RETENTION PERIODS ARE DELIBERATELY NOT ASSERTED HERE. Four live surfaces state four
// different clocks (90 days / 12 months / 24 months) and choosing one is a founder + legal
// decision, open as item #704. This block pins only what is PROVEN FALSE — the region, and a
// purge that no cron performs — and stays silent on the number nobody has ruled on. Pinning an
// unruled period would make the guard the author of a legal position.
describe('⑤ the portal legal pages carry the same truth as the website', () => {
  const PORTAL = join(__dirname, '../../../portal/public')
  const PORTAL_PAGES = ['privacy.html', 'terms.html']
  const readPortal = (f: string) => readFileSync(join(PORTAL, f), 'utf8')

  it('the guard is reading the real portal pages', () => {
    // Without this, a moved directory turns every assertion below into a silent pass.
    for (const f of PORTAL_PAGES) expect(readPortal(f).length, f).toBeGreaterThan(5000)
  })

  for (const f of PORTAL_PAGES) {
    it(`${f} does not repeat a claim the website already had to retract`, () => {
      const s = codeOf(readPortal(f))
      expect(s, 'the database is eu-west-1 (Dublin), not af-south-1').not.toContain('af-south-1')
      expect(s, 'no region resolver, no US instance, no provisioning path (#258 is 🔴)').not.toMatch(/US data residency|US-region instance|US region on request/)
      expect(s, 'compliance is a regulator\'s conclusion, not ours').not.toContain('fully compliant with the CCPA')
      expect(s, 'no such setting exists — searched api, portal and shared').not.toContain('retention settings')
    })

    it(`${f} claims no automatic purge — because no cron performs one`, () => {
      // CODE VERIFIED 28 Aug: `apps/api/src/cron.ts` schedules no retention or purge job. The
      // only purge in the product is `purgeDemoClient`, which REFUSES any client not flagged
      // is_demo. "then automatically purged" described machinery that does not exist.
      expect(codeOf(readPortal(f)), 'no retention/purge cron exists (R80)').not.toMatch(/automatically purged|automatic purge/i)
    })
  }

  it('privacy.html states BOTH halves — where it is stored AND where it is processed', () => {
    // Same rule as ③: half the truth is a new false sentence, and the US compute tier is the
    // half a client actually asks about, so it may never be the half that is dropped.
    const s = readPortal('privacy.html')
    expect(s, 'where the data is stored').toMatch(/Dublin|eu-west-1/)
    expect(s, 'and where it is processed').toMatch(/US West|United States \(Railway/)
  })

  it('⚠️ AND THE TRUE SENTENCES SURVIVED — the guard did not win by deletion', () => {
    // The #617 shape again: "no offenders" is equally satisfied by deleting every mention,
    // including the ones that were never false. POPIA is still a named law and South African
    // data subjects still have rights under it.
    const s = readPortal('privacy.html')
    expect(s, 'POPIA still governs South African data subjects').toContain('POPIA')
    expect(readPortal('terms.html'), 'POPIA is still a named law').toContain('POPIA (South Africa)')
  })
})

// ── ⑥ NO TRIAL, NO OUTCOME GUARANTEE — ADDED 28 Aug (Founder Truth Reset, Step 6) ───────────
//
// Two settled founder positions that a live legal document was contradicting:
//   • THERE IS NO TRIAL — signup writes `paused` with a $0 wallet and $0 sourcing allowance
//     (#607, 1 Aug). The portal Terms promised a "14-day free trial" for the 27 days after that.
//   • NO OUTCOME GUARANTEE — meetings are targets and planning estimates, never guarantees
//     (R69/R77). The portal Terms carried a "90-Day Pipeline Guarantee" and named it the
//     "sole and exclusive" outcome assurance.
//
// ⚠️ BOTH PORTAL LEGAL SURFACES ARE COVERED, AND THAT IS THE POINT (R64). `/terms.html` and
// `/privacy.html` are served from `public/`, and `/terms` and `/privacy` are ALSO rendered by
// `src/app/(legal)/*/page.tsx`. Both are live and they had drifted apart — the signup consent
// checkbox links to the STATIC one (`login/page.tsx:335`), so that is the document a client
// actually agrees to, while the route pages are what a client browsing the portal reads. A
// guard on one proves nothing about the other.
//
// ⚠️ SCOPED TO K.I.N.D'S OWN OFFER. A client's outreach campaign may legitimately invite
// *their* prospects to *their* free trial — `dashboard/figsy` carries a "SaaS Trial Push"
// template for exactly that. Banning the words everywhere would force someone to delete a true
// sentence to get the suite green.
describe('⑥ no live legal surface promises a trial or an outcome guarantee', () => {
  const LEGAL: Array<[string, string]> = [
    ['portal public terms', join(__dirname, '../../../portal/public/terms.html')],
    ['portal public privacy', join(__dirname, '../../../portal/public/privacy.html')],
    ['portal /terms route', join(__dirname, '../../../portal/src/app/(legal)/terms/page.tsx')],
    ['portal /privacy route', join(__dirname, '../../../portal/src/app/(legal)/privacy/page.tsx')],
    ['website terms', join(SITE, 'terms.html')],
  ]

  for (const [label, path] of LEGAL) {
    it(`${label} promises no free trial`, () => {
      const s = codeOf(readFileSync(path, 'utf8'))
      // "no free trial" is the CORRECT sentence, so the ban is on the promise, not the noun.
      expect(s, 'there is no trial — signup writes paused, $0 wallet (#607)').not.toMatch(/14-day free trial|14 day free trial|Start 14-day trial|receive a <strong>14-day/i)
      expect(s, 'the acceptance trigger may not name a trial that does not exist').not.toMatch(/starting a free trial/i)
    })

    it(`${label} promises no outcome guarantee`, () => {
      const s = codeOf(readFileSync(path, 'utf8'))
      expect(s, 'the 90-Day Pipeline Guarantee is against settled founder direction').not.toMatch(/90-Day Pipeline Guarantee|90 Day Pipeline Guarantee/i)
      expect(s, 'no clause may be named as an exception to the no-guarantee position').not.toMatch(/sole and exclusive.{0,80}assurance|only exception is the limited/i)
    })
  }

  it('⚠️ AND THE NO-GUARANTEE SENTENCE IS PRESENT, not merely the promise absent', () => {
    // Deleting the guarantee section entirely would also pass every assertion above while
    // leaving the Terms silent on outcomes — the #617 shape. The document must SAY it.
    const terms = readFileSync(join(__dirname, '../../../portal/public/terms.html'), 'utf8')
    expect(terms, 'the Terms must state the no-guarantee position').toContain('No Outcome Guarantee')
    expect(terms, 'and state plainly that there is no trial').toContain('There is no free trial')
  })
})
