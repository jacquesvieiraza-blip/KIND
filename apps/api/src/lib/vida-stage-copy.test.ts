// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 WHAT VIDA CLAIMS ABOUT A CLIENT — founder-locked 22 Sep, MVP1 Vida lane 0/1/2
//
// ── WHY THESE ARE WORTH RUNNING ─────────────────────────────────────────────────────────
//
// Every sentence under test is a CLAIM AN OPERATOR WILL ACT ON: whether this client needs
// attention, what has been spent on them, how many people were removed and by whom. Two of
// them are claims the product makes about ITSELF — "no action needed" and "0 set aside by us"
// — and both are reassuring by default, which is exactly the shape that rots quietly. A
// reassurance nobody re-checks is worse than no statement at all.
//
// ⚠️ AND THE UNREADABLE CASES ARE HALF THE FILE. `$0 spent` and `spend could not be read` are
// different facts about a client and only one of them is safe to act on; the same is true of
// `Brief 0/11` versus a failed read. This repo has shipped the confusion once already — a
// broken lead query rendering as "this client has no leads yet" — and the founder reported it
// as missing data when it was a broken query reporting an empty one.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  stageChips, nextActionCard, signUpRecordCard, provenanceCard, workablePoolCard,
  OPERATOR_RAIL, type StageFacts,
} from '../../../admin/src/lib/vida-stage-copy'

const FACTS = (o: Partial<StageFacts> = {}): StageFacts => ({
  brief: { collected: 9, total: 11 },
  spendUsd: 0, records: 0, batches: 0, needsYou: false, ...o,
})

const text = (c: ReturnType<typeof nextActionCard>): string =>
  JSON.stringify(c)

describe('🛑 the operator rail is the operator’s work, not the client’s journey', () => {
  it('it starts where the client’s own journey stops being the whole story', () => {
    // ⛓️ The preview draws NINE, the first three of which repeat the six-stage FLOW ribbon
    // above them. Founder-ruled 22 Sep (option A): keep both, trim the overlap — which is the
    // Section 0 lesson applied to the operator side.
    expect([...OPERATOR_RAIL]).toEqual(
      ['Inbox + people', 'Sequence', 'Run', 'Replies', 'Book', 'Live'])
  })

  it('🛑 and it never repeats a client stage', () => {
    for (const clientStage of ['Signed up', 'Brief', 'Proof', 'Programme', 'Approval', 'Complete']) {
      expect(OPERATOR_RAIL as readonly string[],
        `"${clientStage}" is on both the ribbon and the rail — two vocabularies again`)
        .not.toContain(clientStage)
    }
  })
})

describe('🛑 normal is silent — an action has to be earned', () => {
  it('a signed-up client, a healthy Brief and a confirmed Proof all say NONE', () => {
    for (const stage of ['signup', 'brief', 'proof'] as const) {
      const card = nextActionCard(stage, { needsYou: false })
      expect(card.label, `${stage} invented work for an operator`).toBe('NEXT ACTION · NONE')
      expect(text(card)).toContain('no action needed')
    }
  })

  it('each one names the STATE, not the stage', () => {
    expect(text(nextActionCard('signup', { needsYou: false }))).toContain('New client landed')
    expect(text(nextActionCard('brief', { needsYou: false }))).toContain('Healthy Brief')
    expect(text(nextActionCard('proof', { needsYou: false }))).toContain('Proof confirmed by the client')
  })

  it('🛑 but when something IS owed it is an exception, and it says why', () => {
    const card = nextActionCard('brief', { needsYou: true, needsYouReason: 'Their size could not be translated.' })
    expect(card.label).toBe('NEXT ACTION')
    expect('tone' in card ? card.tone : null).toBe('exception')
    expect(text(card)).toContain('size could not be translated')
  })

  it('…and an owed action with no stated reason still refuses to be silent', () => {
    const card = nextActionCard('proof', { needsYou: true })
    expect('tone' in card ? card.tone : null).toBe('exception')
    expect(text(card)).toContain('needs a person')
  })
})

describe('🛑 a number we could not read is never a zero', () => {
  it('an unreadable brief is not a client who has said nothing', () => {
    const chips = stageChips(FACTS({ brief: null }))
    expect(chips[0].text).toBe('Brief — could not be read')
    expect(chips[0].tone).toBe('warn')
    expect(chips[0].text, 'a failed read rendered as 0/11').not.toContain('0/')
  })

  it('an unreadable ledger is not $0 spent', () => {
    const chips = stageChips(FACTS({ spendUsd: null }))
    expect(chips[2].text).toBe('Spend — could not be read')
    expect(chips[2].tone).toBe('warn')
  })

  it('and a real zero says so plainly, in the locked wording', () => {
    expect(stageChips(FACTS()).map(c => c.text))
      .toEqual(['Brief 9/11', 'No action needed', '$0 · inactive'])
  })

  it('money is formatted in one place, to two decimals', () => {
    expect(stageChips(FACTS({ spendUsd: 11.2 }))[2].text).toBe('$11.20 · active')
  })
})

describe('the sign-up record ticks what actually happened', () => {
  const ticksOf = (c: ReturnType<typeof signUpRecordCard>) =>
    c.kind === 'ticks' ? c.ticks : []

  it('a brand-new client: in the portal, nothing else', () => {
    const t = ticksOf(signUpRecordCard(FACTS({ brief: { collected: 0, total: 11 } }), false, 0))
    expect(t.map(x => x.done)).toEqual([true, true, false, false, false, false])
  })

  it('mid-Brief: facts are landing, nothing resolved yet', () => {
    const t = ticksOf(signUpRecordCard(FACTS(), false, 0))
    expect(t[2].done, 'facts are landing and the step says otherwise').toBe(true)
    expect(t[3].done, 'targeting resolved on an incomplete brief').toBe(false)
    expect(t[2].label).toContain('9 of 11')
  })

  it('🛑 complete is not confirmed — they are separate ticks', () => {
    const complete = ticksOf(signUpRecordCard(FACTS({ brief: { collected: 11, total: 11 } }), false, 0))
    expect(complete[3].done).toBe(true)
    expect(complete[4].done, 'eleven facts was treated as the client confirming').toBe(false)

    const confirmed = ticksOf(signUpRecordCard(FACTS({ brief: { collected: 11, total: 11 } }), true, 1))
    expect(confirmed[4].done).toBe(true)
    expect(confirmed[5].done).toBe(true)
  })
})

describe('🛑 "0 set aside by us" is a promise, and it stops being reassuring the moment it moves', () => {
  const P = {
    matched: 4_380, excluded: 63, alreadyWorked: 0, setAside: 0,
    workable: 4_317, committed: 10, fromPool: 1_190,
  }

  it('the clean case states the whole derivation', () => {
    const c = workablePoolCard(P)
    expect(c.kind === 'fact' && c.value).toBe('4,317')
    expect(c.kind === 'fact' && c.caption).toContain('0 set aside by us')
    expect('tone' in c ? c.tone : undefined).toBeUndefined()
  })

  it('🛑 one person removed on OUR judgement makes it an exception, not a footnote', () => {
    // Seniority, size and geography are enforced by the provider filter and never re-judged;
    // category and company type only rank. So a non-zero here means something started
    // removing people again — the defect that emptied the Proof screen.
    const c = workablePoolCard({ ...P, setAside: 1 })
    expect('tone' in c ? c.tone : null).toBe('exception')
    expect(c.kind === 'fact' && c.caption).toContain('that should be zero')
    expect(c.kind === 'fact' && c.caption, 'the exception still reads as reassurance')
      .not.toContain('0 set aside by us')
  })

  it('the provenance names the exclusions as the only thing that removes', () => {
    const c = provenanceCard(P)
    const labels = c.kind === 'ticks' ? c.ticks.map(t => t.label) : []
    expect(labels.some(l => /ranking only/i.test(l)), 'the category stopped being ranking-only').toBe(true)
    expect(labels.some(l => /only thing that removes/i.test(l))).toBe(true)
    expect(labels.some(l => /never re-judged/i.test(l))).toBe(true)
  })

  it('and it states the already-worked subtraction when there is one', () => {
    const none = provenanceCard(P)
    expect(JSON.stringify(none)).toContain('Nobody has been worked for this client yet')

    const some = provenanceCard({ ...P, alreadyWorked: 2_500, workable: 1_817, committed: 4 })
    expect(JSON.stringify(some)).toContain('2,500 out')
    expect(JSON.stringify(some)).toContain('4 sellable')
  })

  it('an unknown pool serve says nothing rather than claiming zero were ours', () => {
    expect(JSON.stringify(provenanceCard({ ...P, fromPool: null })))
      .not.toContain('0 already ours')
  })
})
