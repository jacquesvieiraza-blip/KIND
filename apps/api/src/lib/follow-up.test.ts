// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (Coaching #2495 · #2502) — the pure rules of the follow-up: who earns what, which
// answers qualify, what the prompt may say, and R87's figure check proving its teeth.
// The route's end-to-end behaviour is in `routes/follow-up.route.test.ts`.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest'

vi.mock('@kind/db', () => ({ db: { from: () => { throw new Error('no db in the pure tests') } } }))

import { followUpLevel, canFollowUp, followUpPrompt, groundingText, inventedFigures, parseFollowUp, forLevel, type FollowUpInput } from './follow-up'
import { accessFrom } from './coaching-access'

const INPUT: FollowUpInput = {
  level: 'draft', seller: 'Northwind Field Software',
  prospect: { name: 'Hannah Cole', role: 'Head of Operations', company: 'Brightwell Facilities' },
  theirWords: 'Scheduling is our headache.',
  outcome: { answer: 'next_step', note: 'Wants a pilot for 2 depots, budget £15k' },
  sellerLines: ['Proof the seller leads with: cut missed slots by 20% at Harbour FM'],
}

describe('the ladder, through the one home of access (R180)', () => {
  it('Founders none · Growth draft · Full Coaching or Enterprise coach', () => {
    expect(followUpLevel(accessFrom('founders', false))).toBe('none')
    expect(followUpLevel(accessFrom('growth', false))).toBe('draft')
    expect(followUpLevel(accessFrom('founders', true))).toBe('coach')
    expect(followUpLevel(accessFrom('growth', true))).toBe('coach')
    expect(followUpLevel(accessFrom('enterprise', false))).toBe('coach')
    expect(followUpLevel(accessFrom(null, false))).toBe('none')
  })

  it('only "next step agreed" and "interested, not now" qualify', () => {
    expect(['next_step', 'not_now', 'not_fit', 'no_show', undefined].map(canFollowUp)).toEqual([true, true, false, false, false])
  })

  it('a kept coach draft shows no coaching to a draft-level view, and nothing to none', () => {
    const d = { subject: 's', body: 'b', coaching: { confirm: 'c', nextStep: 'n', risk: 'r' }, at: 'x' }
    expect(forLevel(d, 'coach')?.coaching).not.toBeNull()
    expect(forLevel(d, 'draft')?.coaching).toBeNull()
    expect(forLevel(d, 'none')).toBeNull()
  })
})

describe('the prompt', () => {
  it('carries the note and sales context, forbids invention, and asks coaching only at coach level', () => {
    const p = followUpPrompt(INPUT)
    expect(p).toContain('Wants a pilot for 2 depots, budget £15k')
    expect(p).toContain('cut missed slots by 20% at Harbour FM')
    expect(p).toContain('Never invent a number')
    expect(p).not.toContain('"risk"')
    expect(followUpPrompt({ ...INPUT, level: 'coach' })).toContain('"risk"')
  })
})

describe('🛑 R87 — the figure check has teeth', () => {
  const g = groundingText(INPUT)
  it('PASSES a clean draft and figures the client gave', () => {
    expect(inventedFigures('Thanks Hannah — I will send the pilot proposal by Friday.', g)).toEqual([])
    expect(inventedFigures('Within the £15k budget you mentioned, and the 20% we saw at Harbour FM.', g)).toEqual([])
  })
  it('FAILS money, percentages and multipliers nobody gave', () => {
    expect(inventedFigures('You could save $25,000, 30% and 3x faster scheduling.', g)).toEqual(['$25,000', '30%', '3x'])
    expect(inventedFigures('That is £40k a year.', g)).toEqual(['£40k'])
  })
})

describe('reading the model', () => {
  const raw = 'Here you go:\n{"subject":"Pilot","body":"Hi Hannah","confirm":"Depots","next_step":"Call Tuesday","risk":"Timing"}'
  it('a draft level never keeps coaching lines', () => {
    expect(parseFollowUp(raw, 'draft')).toEqual({ subject: 'Pilot', body: 'Hi Hannah', coaching: null })
  })
  it('a coach level keeps all three', () => {
    expect(parseFollowUp(raw, 'coach')?.coaching).toEqual({ confirm: 'Depots', nextStep: 'Call Tuesday', risk: 'Timing' })
  })
  it('junk or an empty body is refused', () => {
    expect(parseFollowUp('no json here', 'draft')).toBeNull()
    expect(parseFollowUp('{"subject":"x","body":""}', 'draft')).toBeNull()
  })
})
