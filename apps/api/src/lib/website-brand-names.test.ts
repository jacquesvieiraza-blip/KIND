import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE TRADING NAME IS M&V, AND THE ENGINE IS VIDA (16 Sep, founder-locked).
//
// His words: "about us is wrong. We should not be referencing figsy. Vida finds the leads.
// no one knows who figsy is. remove figsy from the site completely. replace it with either
// Milla or Vida pending the place. its too confusing." And: "KIND is the legal name. But we
// trade as Milla and Vida. Remove KIND From the site. Replace it with M&V... KIND only stays
// on legal sections."
//
// ── WHY THIS FILE EXISTS AT ALL ───────────────────────────────────────────────────────────
//
// The sweep touched ~590 strings across 29 pages. A rename that large is not finished when it
// renders correctly once — it is finished when the old name cannot come back without a test
// going red. Every previous brand decision on this site was enforced by someone remembering
// it, and the founder's own answer to that was "i cant remember everything… things slip far
// too often."
//
// ── THE LINE BETWEEN MARKETING AND LEGAL, AND WHY IT IS DRAWN HERE ────────────────────────
//
// K.I.N.D is the registered company. It is NOT wrong on a contract — it is the only correct
// name there — so the legal documents keep both names and are asserted to keep them, rather
// than merely exempted. An exemption that is not asserted is a gap; this is a requirement in
// both directions.
//
// Two sentences on marketing pages are statements of legal fact and survive deliberately:
// the copyright notice (which names the entity that holds the copyright) and the About Us
// trading-name disclosure (which is the founder's own instruction, written out).
// ═══════════════════════════════════════════════════════════════════════════════════════════

const WEB = join(__dirname, '../../../website')
const read = (f: string) => readFileSync(join(WEB, f), 'utf8')
const ALL = readdirSync(WEB).filter(f => f.endsWith('.html')).sort()

/** The contracts. They keep K.I.N.D and they keep FIGSY; a marketing sweep does not edit them. */
const LEGAL = ['terms.html', 'privacy.html', 'dpa.html', 'dpa-us.html', 'trust.html']

/** Retired page, still on disk under the 26-Jul "nothing gets deleted" lock, 301d at both doors. */
const RETIRED = ['figsy.html']

const MARKETING = ALL.filter(f => !LEGAL.includes(f) && !RETIRED.includes(f))

/**
 * The two K.I.N.D sentences that are legal facts sitting on marketing pages.
 *
 * ⚠️ STRIPPED BEFORE THE ASSERTION, NOT WHITELISTED BY PAGE. Exempting a whole page would let
 * a new K.I.N.D appear anywhere on it; removing exactly these two strings means anything else
 * still fails.
 */
const LEGAL_SENTENCES = [
  '&copy; 2026 K.I.N.D. All rights reserved.',
  '<p><strong>K.I.N.D</strong> is the registered company.',
]
const stripLegal = (html: string) =>
  LEGAL_SENTENCES.reduce((acc, s) => acc.split(s).join(''), html)

// ⛓️ 16 Sep, SECOND PASS — FIGSY LEAVES THE CONTRACTS TOO, ON FOUNDER INSTRUCTION.
//
// The first pass stopped at the legal documents on purpose. Reading them settled it: not one
// reference was a defined contract term. Every one DESCRIBED the engine by name — "FIGSY
// campaigns", "powered by FIGSY, the engine", "every contact FIGSY touches" — so renaming
// keeps each sentence true instead of altering an obligation. No clause, party, right or duty
// moved. One line was already FALSE and had to change regardless: privacy.html listed the
// booker as running on "our Demo, FIGSY and Support pages" after the FIGSY page was retired.
//
// K.I.N.D is untouched throughout. It is the registered company and it is the only correct
// name on a contract; the two names were never the same decision.
describe('FIGSY is gone from every page that is still served', () => {
  it('there are marketing pages to check', () => {
    expect(MARKETING.length).toBeGreaterThan(20)
  })

  for (const page of ALL.filter(f => !RETIRED.includes(f))) {
    it(`${page} does not name FIGSY`, () => {
      // Case-insensitive on purpose: the CSS classes and JS variables were `figsy`-cased and
      // a half-done rename that leaves `figsyThought` in the source is still a rename that
      // will be re-read by the next person as current.
      expect(read(page).toLowerCase()).not.toContain('figsy')
    })
  }

  it('the contracts name Vida as the engine, so the sentences still say something', () => {
    // ⚠️ NOT ENOUGH TO ASSERT FIGSY IS ABSENT. A rename that deleted the sentences would also
    // pass that. The documents have to still describe the thing that does the work.
    expect(read('terms.html')).toContain('powered by Vida, the engine')
    expect(read('privacy.html')).toContain('Vida campaigns')
    expect(read('trust.html')).toContain('Vida validates contact data')
  })

  it('privacy no longer points visitors at the retired page', () => {
    expect(read('privacy.html')).not.toContain('Demo, FIGSY and Support pages')
    expect(read('privacy.html')).toContain('Demo and Support pages')
  })
})

describe('K.I.N.D is off the marketing pages and kept where it is the legal name', () => {
  for (const page of MARKETING) {
    it(`${page} uses M&V, not K.I.N.D`, () => {
      const html = stripLegal(read(page))
      expect(html).not.toContain('K.I.N.D')
      // The bare word, which is how it appeared in CSS comments and one support sentence.
      expect(html).not.toMatch(/\bKIND\b/)
    })
  }

  it('the copyright notice still names the registered company', () => {
    // Shared chrome: it must be on every page, legal and marketing alike.
    for (const page of ALL) expect(read(page)).toContain('&copy; 2026 K.I.N.D. All rights reserved.')
  })

  it('About Us still discloses the legal name behind the trading name', () => {
    const about = read('about.html')
    expect(about).toContain('<strong>K.I.N.D</strong> is the registered company.')
    expect(about).toContain('<strong>Milla &amp; Vida</strong> is the name we trade under.')
  })
})

describe('the legal documents are untouched by the rename', () => {
  for (const page of LEGAL) {
    it(`${page} still names K.I.N.D`, () => {
      expect(read(page)).toContain('K.I.N.D')
    })
  }

  // ⛓️ This asserted the opposite until 16 Sep — that the contracts MUST still say FIGSY,
  // because at the time they were only to be corrected deliberately rather than swept. The
  // founder then asked for it deliberately, so the requirement inverts and moves up to the
  // FIGSY block above. What survives here is the half that never depended on that: these five
  // documents keep K.I.N.D, the registered company.
})

describe('the domain and the code are not branding and were not swept', () => {
  it('the contact address and login link still resolve', () => {
    const footer = read('pricing.html')
    expect(footer).toContain('hello@get-kind.com')
    expect(footer).toContain('https://app.get-kind.com/login')
  })

  it('every page still loads the shared stylesheet', () => {
    for (const page of ALL) expect(read(page)).toContain('kind.css')
  })
})
