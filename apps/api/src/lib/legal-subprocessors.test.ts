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

// ⛓️ 1 Oct (R182 · W-1) — REWRITTEN FOR R146 (23 Sep): Apollo is the ONLY data provider; PDL and
// Hunter are retired and must be named NOWHERE. Was: PROVIDERS = ['PeopleDataLabs','Hunter','Apollo']
// with Apollo framed as "conditional / own prospecting". The intent is unchanged — every legal page
// names the same providers, the DPA table is complete with a location per row, each role is said.

/** Every provider that can receive prospect personal data (R146: Apollo only). */
const PROVIDERS = ['Apollo']
/** Retired providers (R146) — a legal page naming one misdescribes where prospect data comes from. */
const RETIRED = ['PeopleDataLabs', 'People Data Labs', 'Hunter']

describe('all the legal pages name the SAME providers', () => {
  for (const [name, html] of LEGAL) {
    for (const provider of PROVIDERS) {
      it(`${name} names ${provider}`, () => {
        expect(html).toContain(provider)
      })
    }
    it(`${name} names no retired provider`, () => {
      for (const r of RETIRED) expect(html, r).not.toContain(r)
    })
  }
})

describe('the FORMAL DPA table is complete — it is what a client\'s lawyer reads', () => {
  const table = dpa.slice(dpa.indexOf('<tbody>'), dpa.indexOf('</tbody>'))

  for (const provider of PROVIDERS) {
    it(`${provider} has a row in the sub-processor table`, () => {
      expect(table).toContain(provider)
    })
  }

  it('every data provider row carries a LOCATION — a blank is a disclosure gap', () => {
    for (const provider of PROVIDERS) {
      const i = table.indexOf(provider)
      const row = table.slice(i, i + 400)
      expect(row, provider).toMatch(/United States|European Union|South Africa/)
    }
  })

  it('the other sub-processors are still listed — nothing was dropped', () => {
    for (const p of ['Supabase', 'Resend', 'Anthropic', 'Stripe', 'Railway']) {
      expect(table, p).toContain(p)
    }
  })
})

describe('the pages describe the provider\'s ROLE, not just its name', () => {
  it('Apollo is identified as the only source of prospect data', () => {
    expect(dpa).toMatch(/only source of prospect data/i)
    expect(privacy).toMatch(/only source of prospect data/i)
    expect(terms).toMatch(/sourced from Apollo\.io, a licensed B2B data provider/)
  })
})
