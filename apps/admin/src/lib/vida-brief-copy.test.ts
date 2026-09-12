// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ MVP1 (Preview 07) — VIDA'S BRIEF PANEL SAYS THE FOUNDER'S WORDS, AND COUNTS ELEVEN.
//
// 🛑 THE THREE STATES THE FOUNDER NAMED:
//   · ten facts            → "10 of 11 collected"
//   · eleven, unconfirmed  → "11 of 11 collected, confirmation still pending"
//   · confirmation          → a SEPARATE gate, never contributing to the eleven count
//
// ⚠️ RELATIVE IMPORTS, DELIBERATELY. `check.sh` runs `npx vitest run` from the REPOSITORY
// ROOT, where the `@/` alias from `apps/admin/tsconfig.json` does not exist — a test that
// imports `@/lib/...` passes under `cd apps/admin` and fails in the only run that matters.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { BRIEF_FACTS, BRIEF_FACT_LABEL, briefFacts } from '@kind/shared'
import { briefPanelCopy, type BriefPanelInput } from './vida-brief-copy'

/** A panel input built the way the operator route builds it — from the SHARED counter. */
function fromFacts(facts: Parameters<typeof briefFacts>[0], confirmedAt: string | null = null): BriefPanelInput {
  const p = briefFacts(facts)
  return { collected: p.count, total: p.total, missing: p.missing, confirmedAt }
}

const TEN_OF_ELEVEN = fromFacts({
  contactName: 'Ellis', companyName: 'Acme', website: 'acme.test',
  whatTheCompanyDoes: 'builds things', targetCategory: 'Digital marketing agencies',
  geographies: ['United Kingdom'], companySizes: ['11-50'], targetRoles: ['Founder'],
  exclusions: 'no recruiters', desiredOutcome: 'meetings',
  // targetCompanyType deliberately absent — the 10-of-11 state Preview 07 renders.
})

const ALL_ELEVEN = fromFacts({
  ...{
    contactName: 'Ellis', companyName: 'Acme', website: 'acme.test',
    whatTheCompanyDoes: 'builds things', targetCategory: 'Digital marketing agencies',
    geographies: ['United Kingdom'], companySizes: ['11-50'], targetRoles: ['Founder'],
    exclusions: 'no recruiters', desiredOutcome: 'meetings',
  },
  targetCompanyType: 'agency',
})

describe('the progress line — the founder’s exact wording per state', () => {
  it('① prints "10 of 11 collected" when one fact is outstanding', () => {
    expect(briefPanelCopy(TEN_OF_ELEVEN).progress).toBe('10 of 11 collected')
  })

  it('② prints "11 of 11 collected, confirmation still pending" when all eleven are held and the client has not confirmed', () => {
    expect(briefPanelCopy(ALL_ELEVEN).progress).toBe('11 of 11 collected, confirmation still pending')
  })

  it('③ prints "11 of 11 collected, confirmed" once the client has confirmed', () => {
    expect(briefPanelCopy({ ...ALL_ELEVEN, confirmedAt: '2026-09-11T16:41:00Z' }).progress)
      .toBe('11 of 11 collected, confirmed')
  })

  it('④ a nothing-said draft is 0 of 11, never "complete"', () => {
    const copy = briefPanelCopy(fromFacts({}))
    expect(copy.progress).toBe('0 of 11 collected')
    expect(copy.subtitle).toContain('still collecting')
  })
})

describe('confirmation is a SEPARATE gate and never a twelfth fact', () => {
  it('⑤ the denominator is eleven in every state, confirmed or not', () => {
    for (const input of [TEN_OF_ELEVEN, ALL_ELEVEN, { ...ALL_ELEVEN, confirmedAt: '2026-09-11T16:41:00Z' }]) {
      expect(briefPanelCopy(input).progress).toContain(`of ${BRIEF_FACTS.length} `)
    }
    expect(BRIEF_FACTS.length).toBe(11)
  })

  it('⑥ confirming does NOT raise the collected count — ten facts confirmed is still ten', () => {
    const confirmedButShort = briefPanelCopy({ ...TEN_OF_ELEVEN, confirmedAt: '2026-09-11T16:41:00Z' })
    expect(confirmedButShort.progress).toBe('10 of 11 collected')
  })

  it('⑦ no tick row is a confirmation row — the list is exactly the eleven facts', () => {
    const ticks = briefPanelCopy(ALL_ELEVEN).cards.find(c => c.kind === 'ticks')
    expect(ticks?.kind).toBe('ticks')
    if (ticks?.kind !== 'ticks') throw new Error('unreachable')
    expect(ticks.ticks).toHaveLength(11)
    expect(ticks.ticks.map(t => t.label)).toEqual(BRIEF_FACTS.map(id => BRIEF_FACT_LABEL[id]))
    expect(ticks.ticks.some(t => /confirm/i.test(t.label))).toBe(false)
  })

  it('⑧ the confirmation card exists and says the gate is the client’s, in every state', () => {
    for (const input of [TEN_OF_ELEVEN, ALL_ELEVEN]) {
      const note = briefPanelCopy(input).cards.find(c => c.kind === 'note' && c.label === 'Confirmation')
      expect(note).toBeTruthy()
      if (note?.kind !== 'note') throw new Error('unreachable')
      expect(note.body).toMatch(/never (one of them|counted as a twelfth fact)/)
    }
  })
})

describe('the rows come from the shared list — there is no second eleven-fact list', () => {
  it('⑨ the tick labels are BRIEF_FACT_LABEL, in BRIEF_FACTS order', () => {
    const copy = briefPanelCopy(TEN_OF_ELEVEN)
    const ticks = copy.cards.find(c => c.kind === 'ticks')
    if (ticks?.kind !== 'ticks') throw new Error('unreachable')
    expect(ticks.ticks.map(t => t.label)).toEqual(BRIEF_FACTS.map(id => BRIEF_FACT_LABEL[id]))
  })

  it('⑩ the file itself contains no hand-written fact list or hard-coded denominator', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('./vida-brief-copy.ts', import.meta.url), 'utf8')
    // The labels must arrive from the shared module, never be retyped here.
    for (const id of BRIEF_FACTS) {
      expect(src).not.toContain(`'${BRIEF_FACT_LABEL[id]}'`)
    }
    // And the denominator is echoed from the server's `total`, never typed as a literal.
    // ⚠️ COMMENTS ARE STRIPPED FIRST, and that is not a loophole: the header QUOTES the
    // founder's "11 of 11 collected, confirmation still pending" on purpose, and a guard
    // that punished the quote would be deleted rather than obeyed. What must not exist is
    // an eleven in the CODE, where it would become a denominator nobody derived.
    const code = src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n')
    expect(code).not.toMatch(/\b11\b/)
  })

  it('⑪ exactly the outstanding fact is unticked, and it is the one the counter named', () => {
    const copy = briefPanelCopy(TEN_OF_ELEVEN)
    const ticks = copy.cards.find(c => c.kind === 'ticks')
    if (ticks?.kind !== 'ticks') throw new Error('unreachable')
    const unticked = ticks.ticks.filter(t => !t.done).map(t => t.label)
    expect(unticked).toEqual([BRIEF_FACT_LABEL.company_type])
    expect(TEN_OF_ELEVEN.missing).toEqual(['company_type'])
  })

  it('⑫ the caption names the NEXT outstanding fact in the approved order, not any of them', () => {
    // Website and company type are both absent; website comes first in BRIEF_FACTS.
    const two = fromFacts({
      contactName: 'Ellis', companyName: 'Acme',
      whatTheCompanyDoes: 'builds things', targetCategory: 'Digital marketing agencies',
      geographies: ['United Kingdom'], companySizes: ['11-50'], targetRoles: ['Founder'],
      exclusions: 'no recruiters', desiredOutcome: 'meetings',
    })
    const fact = briefPanelCopy(two).cards.find(c => c.kind === 'fact')
    if (fact?.kind !== 'fact') throw new Error('unreachable')
    expect(fact.caption).toBe(`Next: ${BRIEF_FACT_LABEL.website}.`)
  })
})

describe('two disagreeing readings are named, never silently reconciled', () => {
  it('⑬ a count that contradicts the ticked rows raises an exception card', () => {
    // The server said three; the missing list says one is outstanding. Both cannot be right.
    const copy = briefPanelCopy({ ...TEN_OF_ELEVEN, collected: 3 })
    const warn = copy.cards.find(c => c.kind === 'note' && c.tone === 'exception')
    expect(warn).toBeTruthy()
    if (warn?.kind !== 'note') throw new Error('unreachable')
    expect(warn.body).toContain('3 of 11')
    expect(warn.body).toContain('10')
    expect(warn.body).toContain('nothing is sending')
  })

  it('⑭ a coherent reading raises nothing — the card is not decoration', () => {
    for (const input of [TEN_OF_ELEVEN, ALL_ELEVEN, fromFacts({})]) {
      expect(briefPanelCopy(input).cards.some(c => c.kind === 'note' && c.tone === 'exception')).toBe(false)
    }
  })
})

describe('the panel offers nothing to press', () => {
  it('⑮ every card is a reading — no card carries an action', () => {
    const copy = briefPanelCopy(ALL_ELEVEN)
    expect(copy.cards.every(c => ['fact', 'ticks', 'note', 'stats'].includes(c.kind))).toBe(true)
    // `briefPanelCopy` deliberately returns no `actions` key at all: there is nothing an
    // operator can do about a brief Milla is collecting or a confirmation the client owes.
    expect('actions' in copy).toBe(false)
  })
})
