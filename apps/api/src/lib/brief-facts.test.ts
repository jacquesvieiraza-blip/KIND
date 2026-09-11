import { describe, it, expect } from 'vitest'
import { BRIEF_FACTS, BRIEF_FACT_LABEL, briefFacts, type BriefFactId } from '@kind/shared'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CANONICAL BRIEF — ELEVEN DATA FACTS, AND CONFIRMATION IS NOT ONE OF THEM.
//
// 🛑 C21. Today the builder's completion gate demands TWO facts — company name and the
// client's own country — and the prompt tells Milla the mobile and website are "fine to go
// without". So "complete" has meant "I have enough to open an account", not "I understand
// who to write to". Everything downstream inherits that: Proof sources against whatever the
// model filled in, and the gaps surface as bad prospects rather than as a question.
//
// ⚠️ ONE FUNCTION, TWO READERS — this is the single-canonical-truth rule applied to the
// Brief. The builder gate asks it "may Milla say complete?" about values the model has just
// proposed; Vida's brief-progress card asks it "how far has Milla got?" about values already
// persisted. A second copy of this list is how Vida came to say "seven of the eight brief
// facts" while Milla collected eleven.
//
// ⚠️ ELEVEN FACTS, NOT ELEVEN QUESTIONS (founder-locked). One client utterance may satisfy
// two facts — "Digital marketing agencies" carries both the target category and, through the
// word "agencies", the target company type. This function counts FACTS HELD. It has no
// opinion about how many questions were asked to get them.
//
// ⚠️ CATEGORY AND COMPANY TYPE ARE TWO DISTINCT FACTS (founder-locked).
//   · target category  = what kind of market/business to target, IN THE CLIENT'S OWN WORDS
//   · company type     = the organisational form of the target company (agency, clinic, …)
// They are stored separately and counted separately. A client who said "Digital marketing"
// and nothing about organisational form has the category and NOT the company type — that is
// the legitimate 10-of-11 state Preview 07 shows.
//
// ⚠️ CLIENT CONFIRMATION IS A SEPARATE GATE. It follows all eleven and it is what starts
// Proof. It is deliberately absent from this list: counting it as the eleventh fact is the
// defect Preview 07 was corrected for.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Everything present — the Preview 01 client, whose brief is complete. */
const FULL = {
  contactName:        'Ellis Warner',
  companyName:        'Redmayne & Co.',
  website:            'https://redmayne.co.uk',
  whatTheCompanyDoes: 'White-label paid search and paid social for agencies.',
  targetCategory:     'Digital marketing agencies',
  geographies:        ['United Kingdom'],
  targetCompanyType:  'agency',
  companySizes:       ['11–50'],
  targetRoles:        ['Founder', 'CEO', 'Managing Director'],
  exclusions:         'No recruitment agencies, and nobody we already work with.',
  desiredOutcome:     'Book qualified sales meetings with founders, CEOs and MDs.',
}

describe('① the canonical list', () => {
  it('is exactly eleven facts', () => {
    expect(BRIEF_FACTS).toHaveLength(11)
  })

  it('is the approved list, in the approved order', () => {
    expect(BRIEF_FACTS.map(f => BRIEF_FACT_LABEL[f])).toEqual([
      'Contact name',
      'Company',
      'Website, or an explicit none',
      'What the company does',
      'Target company category',
      'Geography',
      'Company type',
      'Company size',
      'Target roles',
      'Exclusions',
      'Desired outcome',
    ])
  })

  it('🛑 client confirmation is NOT one of the eleven', () => {
    const labels = BRIEF_FACTS.map(f => BRIEF_FACT_LABEL[f]).join(' | ').toLowerCase()
    expect(labels).not.toContain('confirm')
  })

  it('category and company type are two different facts', () => {
    expect(BRIEF_FACTS).toContain('target_category')
    expect(BRIEF_FACTS).toContain('company_type')
    expect(new Set(BRIEF_FACTS).size).toBe(11)
  })
})

describe('② a complete brief', () => {
  it('counts eleven and is complete', () => {
    const r = briefFacts(FULL)
    expect(r.count).toBe(11)
    expect(r.total).toBe(11)
    expect(r.missing).toEqual([])
    expect(r.complete).toBe(true)
  })

  it('an empty brief counts zero and names all eleven as missing', () => {
    const r = briefFacts({})
    expect(r.count).toBe(0)
    expect(r.missing).toHaveLength(11)
    expect(r.complete).toBe(false)
  })
})

describe('③ every single fact is load-bearing', () => {
  // ⚠️ ONE CASE PER FACT. A gate that requires "most of" eleven is the gate we already had.
  it.each(BRIEF_FACTS)('removing %s drops the count to 10 and blocks completion', id => {
    const partial: Record<string, unknown> = { ...FULL }
    const KEY: Record<BriefFactId, string> = {
      contact_name: 'contactName', company: 'companyName', website: 'website',
      what_they_do: 'whatTheCompanyDoes', target_category: 'targetCategory',
      geography: 'geographies', company_type: 'targetCompanyType',
      company_size: 'companySizes', target_roles: 'targetRoles',
      exclusions: 'exclusions', desired_outcome: 'desiredOutcome',
    }
    delete partial[KEY[id]]
    const r = briefFacts(partial)
    expect(r.count).toBe(10)
    expect(r.missing).toEqual([id])
    expect(r.complete).toBe(false)
  })
})

describe('④ the 10-of-11 state Preview 07 shows', () => {
  // The client said "Digital marketing" and never established an organisational form.
  const NO_TYPE = { ...FULL, targetCategory: 'Digital marketing', targetCompanyType: undefined }

  it('category collected, company type missing, count 10', () => {
    const r = briefFacts(NO_TYPE)
    expect(r.count).toBe(10)
    expect(r.collected).toContain('target_category')
    expect(r.missing).toEqual(['company_type'])
  })

  it('🛑 the category does NOT satisfy the company type by itself', () => {
    expect(briefFacts(NO_TYPE).complete).toBe(false)
  })
})

describe('⑤ whitespace and empties are not facts', () => {
  it.each([
    ['an empty string', ''],
    ['whitespace only', '   '],
  ])('%s does not count as the contact name', (_label, value) => {
    expect(briefFacts({ ...FULL, contactName: value }).missing).toEqual(['contact_name'])
  })

  it('an empty array does not count as a geography', () => {
    expect(briefFacts({ ...FULL, geographies: [] }).missing).toEqual(['geography'])
  })

  it('an array of blanks does not count as target roles', () => {
    expect(briefFacts({ ...FULL, targetRoles: ['', '  '] }).missing).toEqual(['target_roles'])
  })

  it('null is not a fact', () => {
    expect(briefFacts({ ...FULL, exclusions: null }).missing).toEqual(['exclusions'])
  })
})

describe('⑥ the website, or an explicit none', () => {
  // ⚠️ "I do not have one" IS AN ANSWER. A client with no website must be able to finish
  // their brief; what must never happen is the fact being skipped silently.
  it('an explicit "we have no website" satisfies the fact', () => {
    const r = briefFacts({ ...FULL, website: undefined, websiteNone: true })
    expect(r.count).toBe(11)
    expect(r.complete).toBe(true)
  })

  it('no website and no explicit none leaves the fact missing', () => {
    expect(briefFacts({ ...FULL, website: undefined }).missing).toEqual(['website'])
  })

  it('websiteNone false is not an answer', () => {
    expect(briefFacts({ ...FULL, website: undefined, websiteNone: false }).missing)
      .toEqual(['website'])
  })
})

describe('⑦ target roles may arrive as titles or as seniority', () => {
  it('job titles alone satisfy the roles fact', () => {
    expect(briefFacts({ ...FULL, targetRoles: ['Managing Director'] }).complete).toBe(true)
  })

  it('seniority alone satisfies the roles fact', () => {
    const r = briefFacts({ ...FULL, targetRoles: undefined, targetSeniority: ['C-Suite'] })
    expect(r.complete).toBe(true)
  })

  it('neither leaves the fact missing', () => {
    const r = briefFacts({ ...FULL, targetRoles: undefined, targetSeniority: undefined })
    expect(r.missing).toEqual(['target_roles'])
  })
})
