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

  it('ICP but no money — waiting on their first payment, and it is THEIR move', () => {
    // ⛓️ 23 Sep (R137) — WAS `'…waiting on the $299…'`, asserting the label contained `$299`.
    // The pack is retired (founder: *"the 299/4 is retired/ this must go."*); the step, the actor
    // and the chase are unchanged, and the label now names no price.
    const n = nextAction(f({ hasFunded: false, hasInbox: false, sourced: 0, approved: 0, withClient: 0 }))
    expect(n.step).toBe(2)
    expect(n.actor).toBe('them')
    expect(n.label).toBe('Waiting on their first payment')
    expect(n.label).not.toMatch(/\$\d/)
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

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep (I3) — A PROGRAMME CLIENT IS NOT DESCRIBED BY THE RETIRED PACK'S VOCABULARY
//
// 🛑 THE THREE STALE STATES THE FOUNDER NAMED, ALL FROM THIS ONE TABLE:
//
//   · "Waiting on their $299" beside a client at PROOF — `hasFunded` is false for every
//     programme client permanently, because their money arrives as `programme_first` and never
//     as a pack purchase, so the table's money branch matched them for ever;
//   · "Approve the sequence" / "Ready to run" as operator tasks on a programme that was still
//     sourcing — gated only on whether a sequence row and an active campaign happened to exist;
//   · both carrying `actor: 'you'`, raising a task while the CLIENT is the one acting.
//
// ⚠️ THE FIX IS NOT A SECOND STAGE RULE. `deriveLifecycle` is the one answer to "where is this
// client"; this file now RENDERS that verdict. Adding a third opinion here would be the defect.
// ═══════════════════════════════════════════════════════════════════════════════════════

const lc = (over: Partial<NonNullable<ClientFacts['lifecycle']>> = {}) => ({
  stage: 'proof', stageLabel: 'Proof', state: 'proof',
  needsYou: false, needsYouReason: null as string | null, ...over,
})

describe('⚑ I3 · the canonical verdict answers for programme clients', () => {
  it('🛑 A CLIENT AT PROOF IS NOT ASKED FOR $299 — the state the founder saw', () => {
    // Exactly the shape a programme client has: no pack purchase, no inbox yet, nothing sourced.
    const n = nextAction(f({
      lifecycle: lc(), hasFunded: false, hasInbox: false, sourced: 0, approved: 0, withClient: 0,
    }))
    expect(n.label, 'a programme client at Proof was asked for the retired pack price').not.toContain('$299')
    expect(n.label).toBe('Proof')
    expect(n.actor, 'a task was raised while the client is the one acting').toBe('them')
  })

  it('🛑 NO PREMATURE "Approve the sequence" OR "Ready to run" on a sourcing programme', () => {
    // A sequence row exists and no campaign is active — the exact facts that produced step 5/6.
    const n = nextAction(f({
      lifecycle: lc({ stage: 'sourcing', stageLabel: 'Sourcing', state: 'sourcing' }),
      hasSequence: true, campaignActive: false,
    }))
    expect(n.label).toBe('Sourcing')
    expect(n.cta, 'a control was offered for work that has not been prepared yet').toBeUndefined()
    expect(n.actor).toBe('engine')
  })

  it('🛑 AND THE MISSING-SENDER BRANCH DOES NOT FIRE EITHER', () => {
    // `hasInbox: false` is step 3 — "Needs a sender", urgency 95 — in the legacy table. For a
    // programme client the sender question is asked by `programmeSenderSafety` at the gate and
    // reported as the `sender_not_sendable` reason, not by counting inbox rows here.
    const n = nextAction(f({ lifecycle: lc(), hasInbox: false }))
    expect(n.step).not.toBe(3)
    expect(n.label).toBe('Proof')
  })

  it('a real task IS raised, with the reason and a matching control', () => {
    const n = nextAction(f({
      lifecycle: lc({ stage: 'review', stageLabel: 'Review', state: 'review_reply',
                      needsYou: true, needsYouReason: 'reply_needs_decision' }),
    }))
    expect(n.actor).toBe('you')
    expect(n.label).toContain('Review')
    expect(n.label).toContain('a reply needs you')
    expect(n.cta?.kind).toBe('replies')
    expect(n.urgency).toBeGreaterThan(50)
  })

  it('a needs-you reason with no matching control still raises the task', () => {
    // ⚠️ NO NEW `cta.kind` VALUES. Widening that union changes every screen that renders an
    // action card; a label alone is honest, and the Needs-you filter runs off `needsYou`.
    const n = nextAction(f({
      lifecycle: lc({ stage: 'live', stageLabel: 'Live', state: 'live_ready_to_make_live',
                      needsYou: true, needsYouReason: 'make_live_required' }),
    }))
    expect(n.actor).toBe('you')
    expect(n.label).toContain('ready to make live')
    expect(n.cta).toBeUndefined()
  })

  it('🛑 the client REVIEWING their programme is never the operator\'s task', () => {
    const n = nextAction(f({
      lifecycle: lc({ stage: 'approval', stageLabel: 'Approval', state: 'approval' }),
      hasSequence: true, campaignActive: false, repliesOpen: 0,
    }))
    expect(n.actor).toBe('them')
    expect(n.label).toBe('Approval')
  })

  it('🛑 EVEN AN OPEN REPLY DOES NOT REOPEN THE LEGACY BRANCH', () => {
    // `deriveLifecycle` already has a rule for a reply waiting on a person. Letting the legacy
    // branch answer it too would be two rules for one fact — the whole defect.
    const n = nextAction(f({
      lifecycle: lc({ stage: 'sourcing', stageLabel: 'Sourcing', state: 'sourcing' }),
      repliesOpen: 4,
    }))
    expect(n.label, 'the legacy reply branch answered a programme client').toBe('Sourcing')
    expect(n.step).not.toBe(7)
  })

  it('a client with no readable lifecycle keeps its step — and is never asked for $299 (R137)', () => {
    // ⛓️ 23 Sep (R137) — WAS `'a legacy client is completely unaffected — the $299 book is what is
    // selling'`, asserting `$299`. Nothing sells the $299 book now. THE COMPLEMENT STILL HOLDS
    // and is what is kept: the fallback steps are not deleted, so a client whose lifecycle
    // could not be read still gets a row and a step — it just names no retired price.
    const n = nextAction(f({ lifecycle: null, hasFunded: false, hasInbox: false, sourced: 0, approved: 0, withClient: 0 }))
    expect(n.step).toBe(2)
    expect(n.label).not.toContain('$299')
  })
})
