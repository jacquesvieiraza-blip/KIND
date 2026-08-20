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

  it('the badge says what is true, in every one of its 47 old homes', () => {
    expect(PAGES.filter(f => read(f).includes('Privacy controls built in')).length).toBeGreaterThan(20)
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
