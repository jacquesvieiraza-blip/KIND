import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// #410 — THE THREE LEGAL PAGES DISAGREED WITH EACH OTHER ABOUT WHO HOLDS YOUR PROSPECTS' DATA.
//
// The sub-processor list is the one document a client quotes back at us, and there were three
// different answers live at the same time:
//
//   • privacy.html — Apollo.io only, in four places, omitting BOTH providers we actually use
//   • dpa.html     — Apollo.io only, in the FORMAL table a DPA review reads
//   • terms.html   — PeopleDataLabs + Hunter, omitting Apollo
//
// So whichever page a client opened, the disclosure was wrong. Under GDPR/POPIA an incomplete
// sub-processor list is not a copy problem — it is a failure to disclose who personal data is
// shared with, and the DPA table is what a client's counsel reads before signing.
//
// The true list, verified against code on 29 Jul rather than assumed:
//   • PeopleDataLabs — PRIMARY sourcing (`pdl-search.ts`, `PDL_API_KEY` marked "important:
//     PRIMARY lead sourcing" in startup-check.ts)
//   • Hunter — work-email verification (`enrichment.ts` waterfall)
//   • Apollo.io — wired in `apollo.ts` but `APOLLO_API_KEY` is marked "optional / BYO-key;
//     NOT used in the day-to-day PDL+Hunter stack", and docs/legal.md states plainly
//     "K.I.N.D no longer uses Apollo" (#450 tracks re-adding a key). It stays on the list
//     because it CAN receive data when a client configures it — omitting a processor that
//     may receive data is the dangerous direction of this error.
//
// These tests read the real HTML, so the three pages cannot drift apart again.

const WEB = join(__dirname, '../../../website')
const page = (f: string) => readFileSync(join(WEB, f), 'utf8')

const privacy = page('privacy.html')
const dpa = page('dpa.html')
const terms = page('terms.html')
// dpa-us.html is the US addendum and carried the SAME Apollo-only list. It is easy to miss
// because it is a near-duplicate of dpa.html — which is exactly why it is asserted here
// rather than trusted: the inventory row named it and the first pass still walked past it.
const dpaUs = page('dpa-us.html')
const LEGAL: [string, string][] =
  [['privacy.html', privacy], ['dpa.html', dpa], ['terms.html', terms], ['dpa-us.html', dpaUs]]

/** Every provider that can receive prospect personal data. */
const PROVIDERS = ['PeopleDataLabs', 'Hunter', 'Apollo']

describe('all three legal pages name the SAME providers', () => {
  for (const [name, html] of LEGAL) {
    for (const provider of PROVIDERS) {
      it(`${name} names ${provider}`, () => {
        expect(html).toContain(provider)
      })
    }
  }

  it('none of them names a provider the others do not — the whole defect in one assertion', () => {
    // Three pages, three different answers, all live at once. A client's counsel reads the
    // DPA; a prospect reads privacy; a signer reads terms. They must not disagree.
    const named = LEGAL.map(([name, html]) => [name, PROVIDERS.filter(p => html.includes(p))] as const)
    const [, first] = named[0]
    for (const [name, list] of named) expect(list, name).toEqual(first)
  })
})

describe('the FORMAL DPA table is complete — it is what a client\'s lawyer reads', () => {
  const table = dpa.slice(dpa.indexOf('<tbody>'), dpa.indexOf('</tbody>'))

  for (const provider of PROVIDERS) {
    it(`${provider} has a row in the sub-processor table`, () => {
      expect(table).toContain(provider)
    })
  }

  it('every data provider row carries a LOCATION — a blank is a disclosure gap', () => {
    // The location column decides whether a transfer mechanism (SCCs) is required, so a row
    // without one is worse than no row: it looks complete and answers nothing.
    for (const provider of PROVIDERS) {
      const i = table.indexOf(provider)
      const row = table.slice(i, i + 400)
      expect(row, provider).toMatch(/United States|European Union|South Africa/)
    }
  })

  it('the other sub-processors are still listed — nothing was dropped adding these', () => {
    for (const p of ['Supabase', 'Resend', 'Anthropic', 'Stripe', 'Railway']) {
      expect(table, p).toContain(p)
    }
  })
})

describe('the pages describe each provider\'s ROLE, not just its name', () => {
  it('PDL is identified as the primary source', () => {
    expect(privacy).toContain('primary')
    expect(dpa).toContain('primary lead sourcing')
  })

  it('Hunter is identified as email VERIFICATION, not sourcing', () => {
    // Hunter does not prospect — it verifies a work email for a person we already found
    // (docs/legal.md is explicit about this). Calling it a data source would misdescribe
    // what it receives and why.
    expect(privacy.toLowerCase()).toContain('work-email verification')
    expect(dpa.toLowerCase()).toContain('work-email verification')
  })

  it('Apollo is qualified as conditional — the key is retired, it is BYO-configured', () => {
    // startup-check.ts: "optional / BYO-key; not used in the day-to-day PDL+Hunter stack".
    // docs/legal.md: "K.I.N.D no longer uses Apollo." Listing it flatly as a live source
    // would be the same overclaim in the other direction.
    for (const [name, html] of LEGAL) {
      const i = html.indexOf('Apollo')
      expect(html.slice(Math.max(0, i - 200), i + 300), name).toMatch(/configure/i)
    }
  })
})

describe('the claim that started this is gone', () => {
  it('no page still presents Apollo as the SOLE source of lead data', () => {
    // privacy.html said "sourced via Apollo.io" in four places, naming neither provider we
    // actually use.
    for (const [name, html] of LEGAL) {
      expect(html, name).not.toMatch(/sourced via Apollo\.io[^,]/)
      expect(html, name).not.toContain('Lead data is sourced via <strong>Apollo.io</strong>.')
    }
  })
})
