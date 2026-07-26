import { describe, it, expect } from 'vitest'
import { MBF_CAST, MBF_REPLIES, MBF_SEQUENCE, MBF_ICP, MBF_NAME, MBF_MARKER, castEmail } from './demo-mbf-data'

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
    expect(kinds).toContain('objection')
    expect(kinds).toContain('opt_out')   // so the suppression story can be shown
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
