import { describe, it, expect } from 'vitest'
import { nextAction, sortByUrgency, type ClientFacts } from './client-step'

const base: ClientFacts = {
  hasIcp: true, hasFunded: true, hasInbox: true,
  sourced: 84, withClient: 53, approved: 31,
  hasSequence: true, campaignActive: true,
  pendingDrafts: 0, repliesOpen: 0,
  isDemo: false,
}
const f = (over: Partial<ClientFacts>): ClientFacts => ({ ...base, ...over })

describe('the setup path, in order', () => {
  it('no ICP — they haven’t finished signing up', () => {
    const n = nextAction(f({ hasIcp: false }))
    expect(n.step).toBe(0)
    expect(n.actor).toBe('them')
  })

  it('ICP but no money — waiting on the $299, and it is THEIR move', () => {
    const n = nextAction(f({ hasFunded: false, hasInbox: false, sourced: 0, approved: 0, withClient: 0 }))
    expect(n.step).toBe(2)
    expect(n.actor).toBe('them')
    expect(n.label).toContain('$299')
    expect(n.cta?.kind).toBe('chase')
  })

  it('a demo client skips the money gate', () => {
    // Demo clients are for showing the product, not for taking money from.
    const n = nextAction(f({ hasFunded: false, isDemo: true, hasInbox: false }))
    expect(n.step).toBe(3)
    expect(n.cta?.kind).toBe('inbox')
  })

  it('paid but no sender — nothing can go out, so this outranks almost everything', () => {
    const n = nextAction(f({ hasInbox: false }))
    expect(n.step).toBe(3)
    expect(n.actor).toBe('you')
    expect(n.urgency).toBeGreaterThan(80)
  })

  it('paid, has a sender, nothing found yet — the engine is working, not you', () => {
    const n = nextAction(f({ sourced: 0, withClient: 0, approved: 0 }))
    expect(n.actor).toBe('engine')
    expect(n.label).toContain('Finding')
  })

  it('people are with the client — their move, and it says how many', () => {
    const n = nextAction(f({ approved: 0, withClient: 38 }))
    expect(n.step).toBe(4)
    expect(n.actor).toBe('them')
    expect(n.label).toContain('38')
  })
})

describe('once they have bought work, it is on us', () => {
  it('approved leads but no sequence — approve the sequence', () => {
    const n = nextAction(f({ hasSequence: false, campaignActive: false }))
    expect(n.step).toBe(5)
    expect(n.actor).toBe('you')
    expect(n.cta?.kind).toBe('sequence')
  })

  it('sequence approved, campaign not running — run it', () => {
    const n = nextAction(f({ campaignActive: false }))
    expect(n.step).toBe(6)
    expect(n.cta?.kind).toBe('run')
  })

  it('everything live and nothing owed — the engine has it', () => {
    const n = nextAction(f({ withClient: 0 }))
    expect(n.step).toBe(9)
    expect(n.actor).toBe('engine')
    expect(n.cta).toBeUndefined()
  })
})

describe('priority — a person waiting always wins', () => {
  it('replies beat a sequence waiting to be approved', () => {
    // A prospect is sitting unanswered with the client's name on it. A sequence can wait.
    const n = nextAction(f({ repliesOpen: 3, hasSequence: false }))
    expect(n.step).toBe(7)
    expect(n.label).toBe('3 replies to handle')
  })

  it('replies beat drafts waiting in the Co-Pilot queue', () => {
    expect(nextAction(f({ repliesOpen: 1, pendingDrafts: 9 })).step).toBe(7)
  })

  it('a person waiting even beats a missing inbox', () => {
    // If a reply is unanswered, answer it — the inbox gap blocks NEW sends, not this.
    expect(nextAction(f({ repliesOpen: 1, hasInbox: false })).step).toBe(7)
  })

  it('singular and plural read correctly — never "1 replies"', () => {
    expect(nextAction(f({ repliesOpen: 1 })).label).toBe('1 reply to handle')
    expect(nextAction(f({ repliesOpen: 2 })).label).toBe('2 replies to handle')
    expect(nextAction(f({ pendingDrafts: 1 })).label).toBe('1 email waiting on you')
  })
})

describe('the label is always words, never a bare number', () => {
  it('every state produces a human sentence', () => {
    const states: Partial<ClientFacts>[] = [
      { hasIcp: false }, { hasFunded: false }, { hasInbox: false }, { sourced: 0 },
      { approved: 0 }, { hasSequence: false }, { campaignActive: false }, {},
      { repliesOpen: 4 }, { pendingDrafts: 2 },
    ]
    for (const s of states) {
      const n = nextAction(f(s))
      expect(n.label.length).toBeGreaterThan(6)
      expect(/^\d+$/.test(n.label)).toBe(false)
    }
  })
})

describe('sortByUrgency', () => {
  it('floats whoever needs you to the top and leaves the quiet ones last', () => {
    const rows = [
      { company_name: 'Running Co', next: nextAction(f({ withClient: 0 })) },
      { company_name: 'Replies Co', next: nextAction(f({ repliesOpen: 2 })) },
      { company_name: 'Unpaid Co', next: nextAction(f({ hasFunded: false, hasInbox: false, sourced: 0, approved: 0 })) },
      { company_name: 'Sequence Co', next: nextAction(f({ hasSequence: false, campaignActive: false })) },
    ]
    expect(sortByUrgency(rows).map(r => r.company_name))
      .toEqual(['Replies Co', 'Sequence Co', 'Unpaid Co', 'Running Co'])
  })

  it('is stable by name on a tie, so the list never jitters between reloads', () => {
    const same = nextAction(f({ withClient: 0 }))
    const rows = [
      { company_name: 'Zeta', next: same }, { company_name: 'Alpha', next: same },
    ]
    expect(sortByUrgency(rows).map(r => r.company_name)).toEqual(['Alpha', 'Zeta'])
  })

  it('does not mutate the array it was given', () => {
    const rows = [
      { company_name: 'A', next: nextAction(f({})) },
      { company_name: 'B', next: nextAction(f({ repliesOpen: 1 })) },
    ]
    const before = rows.map(r => r.company_name)
    sortByUrgency(rows)
    expect(rows.map(r => r.company_name)).toEqual(before)
  })
})
