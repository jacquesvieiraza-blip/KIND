import { describe, it, expect } from 'vitest'
import { MBF_CAST, MBF_REPLIES, MBF_SEQUENCE, MBF_ICP, MBF_NAME, MBF_MARKER, castEmail, canAdoptAsMbf } from './demo-mbf-data'

describe('the cast never changes — the founder is learning a script', () => {
  it('is forty people', () => {
    expect(MBF_CAST).toHaveLength(40)
  })

  it('has the three states in the proportions the demo needs', () => {
    const by = (s: string) => MBF_CAST.filter(c => c.state === s).length
    expect(by('approved')).toBe(12)   // already being worked — the "look what it does" half
    expect(by('waiting')).toBe(22)    // what you actually pick from on stage
    expect(by('passed')).toBe(6)      // proves passing costs nothing
  })

  it('has enough waiting to demo the minimum-20 gate', () => {
    // Below 20 the gate would adapt down and you could never show the real rule.
    expect(MBF_CAST.filter(c => c.state === 'waiting').length).toBeGreaterThanOrEqual(20)
  })

  it('is sorted by score descending, so the top 20 are the same faces every time', () => {
    const scores = MBF_CAST.map(c => c.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)
  })

  it('has no duplicate people and no duplicate companies', () => {
    const names = MBF_CAST.map(c => `${c.first} ${c.last}`)
    expect(new Set(names).size).toBe(names.length)
    const cos = MBF_CAST.map(c => c.company)
    expect(new Set(cos).size).toBe(cos.length)
  })

  it('is stable across imports — no randomness anywhere', () => {
    // A demo that reshuffles is a demo you cannot rehearse.
    const first = MBF_CAST.map(c => `${c.first}|${c.company}|${c.score}|${c.state}`).join(',')
    const second = MBF_CAST.map(c => `${c.first}|${c.company}|${c.score}|${c.state}`).join(',')
    expect(first).toBe(second)
  })
})

describe('nothing here can ever reach a real person', () => {
  it('every address is on a .invalid domain that cannot resolve', () => {
    // RFC 2606 reserves .invalid. Belt and braces behind the is_demo send block.
    for (const c of MBF_CAST) {
      expect(castEmail(c)).toContain(MBF_MARKER)
      expect(castEmail(c).endsWith('.invalid')).toBe(true)
    }
  })

  it('every address is unique, so a reply maps to exactly one person', () => {
    const emails = MBF_CAST.map(castEmail)
    expect(new Set(emails).size).toBe(emails.length)
  })

  it('addresses are clean — no spaces or stray punctuation from the company names', () => {
    for (const c of MBF_CAST) {
      expect(castEmail(c)).toMatch(/^[a-z0-9.]+@[a-z0-9.-]+$/)
    }
  })
})

describe('the story reads as a working account, not an empty one', () => {
  it('the inbox has one of each kind worth demoing', () => {
    const kinds = new Set(MBF_REPLIES.map(r => r.classification))
    expect(kinds).toContain('hot')
    expect(kinds).toContain('interested')
    expect(kinds).toContain('warm')      // the objection reply — the body carries that story
    expect(kinds).toContain('opt_out')   // so the suppression story can be shown
  })

  // THE GUARD THIS FILE DID NOT HAVE — and the test above was ENFORCING the bug.
  //
  // It asserted `kinds` must contain 'objection', a value NOTHING else in the system uses:
  // the classifier never produces it, the live CHECK constraint rejects it, and the unibox
  // cannot render it. So the demo build died with *"violates check constraint
  // figsy_replies_classification_check"* while a green test insisted the data was right.
  //
  // A test that pins invented data is worse than no test: it makes the wrong thing
  // load-bearing. This one pins the demo to the values the PRODUCT can actually produce.
  it('every classification is one the product can actually produce', () => {
    // The union of the live CHECK constraint (20260603_schema_reconcile.sql) and what the
    // unibox knows how to render. A value outside this set fails at the database.
    const LEGAL = new Set([
      'hot', 'warm', 'cold', 'interested', 'not_interested',
      'opt_out', 'unsubscribe', 'out_of_office', 'wrong_person', 'referral', 'other',
    ])
    for (const r of MBF_REPLIES) {
      expect(LEGAL.has(r.classification), `"${r.classification}" is not a classification the product produces`).toBe(true)
    }
  })

  it('two replies became meetings', () => {
    expect(MBF_REPLIES.filter(r => r.booked)).toHaveLength(2)
  })

  it('every reply belongs to someone who was actually worked', () => {
    // A reply from a lead the client never approved would be a story that makes no sense.
    for (const r of MBF_REPLIES) {
      expect(MBF_CAST[r.castIndex]).toBeDefined()
      expect(MBF_CAST[r.castIndex].state).toBe('approved')
    }
  })

  it('the sequence is three emails with a widening gap', () => {
    expect(MBF_SEQUENCE).toHaveLength(3)
    expect(MBF_SEQUENCE[0].wait_days).toBe(0)
    expect(MBF_SEQUENCE[1].wait_days).toBeLessThan(MBF_SEQUENCE[2].wait_days)
  })

  it('the sequence tokenises, so the preview shows a real name', () => {
    expect(MBF_SEQUENCE[0].body).toContain('{{first_name}}')
    expect(MBF_SEQUENCE[0].body).toContain('{{company}}')
  })

  it('the ICP matches the cast it supposedly found', () => {
    // If the ICP said "dentists" and the list was logistics, the demo contradicts itself.
    const geos = new Set(MBF_ICP.geographies)
    for (const c of MBF_CAST.filter(x => x.state !== 'passed')) {
      expect(geos.has(c.country)).toBe(true)
    }
  })

  it('the passed six are visibly worse fits than everyone else', () => {
    const worstKept = Math.min(...MBF_CAST.filter(c => c.state !== 'passed').map(c => c.score))
    const bestPassed = Math.max(...MBF_CAST.filter(c => c.state === 'passed').map(c => c.score))
    expect(bestPassed).toBeLessThan(worstKept)
  })
})

describe('MBF_NAME', () => {
  it('is the name the reset matches on — changing it orphans the existing demo account', () => {
    expect(MBF_NAME).toBe('MBF Holdings')
  })
})

// ── ADOPTION — the most destructive decision in this file ────────────────────────────
//
// It ends in `wipeMbf`. It exists because the live account was called "MBF Demo" and was
// never flagged `is_demo`: the reset could not find it and the demo purge refused to delete
// it, so no control in Vida could touch the row. Adoption fixes that — and the whole risk is
// that it takes over a REAL client who happens to be called "MBF something". Every refusal
// path is pinned here.
describe('canAdoptAsMbf', () => {
  const clean = { nameMatchesMbf: true, purchaseCount: 0, realEmailLeadCount: 0 }

  it('adopts an empty, never-paid account whose name contains MBF', () => {
    expect(canAdoptAsMbf(clean)).toEqual({ ok: true })
  })

  it('REFUSES an account that has ever been paid for — that is somebody\'s business', () => {
    const v = canAdoptAsMbf({ ...clean, purchaseCount: 1 })
    expect(v.ok).toBe(false)
    expect(!v.ok && v.reason).toContain('real payment')
  })

  it('REFUSES an account holding even ONE real email address', () => {
    // This is the rule that stops us destroying real people's data. One is enough.
    const v = canAdoptAsMbf({ ...clean, realEmailLeadCount: 1 })
    expect(v.ok).toBe(false)
    expect(!v.ok && v.reason).toContain('REAL email')
  })

  it('REFUSES a name that does not contain MBF', () => {
    const v = canAdoptAsMbf({ ...clean, nameMatchesMbf: false })
    expect(v.ok).toBe(false)
  })

  it('a single failing condition is enough — they are ANDed, not scored', () => {
    expect(canAdoptAsMbf({ nameMatchesMbf: true, purchaseCount: 3, realEmailLeadCount: 40 }).ok).toBe(false)
    expect(canAdoptAsMbf({ nameMatchesMbf: false, purchaseCount: 0, realEmailLeadCount: 0 }).ok).toBe(false)
  })

  it('names WHICH condition failed, so a refusal is actionable rather than a flat no', () => {
    const paid = canAdoptAsMbf({ ...clean, purchaseCount: 2 })
    const real = canAdoptAsMbf({ ...clean, realEmailLeadCount: 7 })
    expect(!paid.ok && paid.reason).toContain('2')
    expect(!real.ok && real.reason).toContain('7')
  })
})
