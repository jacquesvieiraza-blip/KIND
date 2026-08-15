// #651 — THE SEQUENCING ENGINE. Pins for the three things it added, and for the TWO LIVE
// BUGS found on the suggest path while building it.
//
// RED PROOF (each fails without its fix):
//   • restore `[1, 2, 3]` in /sequence/suggest        → "never truncates the draft" fails
//   • restore `wait_days: n === 1 ? 0 : …` there      → "step 1 never says send-immediately" fails
//   • restore the save default `i === 0 ? 0 : 3`      → "the save default is a real gap" fails
//   • drop the event branch from sequencePlan         → every counts-back test fails
//   • widen templateFor to return all 7 at depth 3    → "a shallow sequence is a real arc" fails

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  sequencePlan, eventCadence, stepCadence, templateFor, industryNote,
  normalisePurpose, normaliseDepth, MIN_GAP_DAYS, EVENT_BUFFER_DAYS,
  DEFAULT_SEQUENCE_DEPTH, SEQUENCE_DEPTHS,
} from './sequence-templates'
import { MAX_SEQUENCE_STEPS } from '@kind/shared'

describe('the default is unchanged — turning #651 on must not move R38', () => {
  it('a plan with no choices IS the shipped meeting-at-5 cadence', () => {
    const plan = sequencePlan({})
    expect(plan.purpose).toBe('meeting')
    expect(plan.depth).toBe(5)
    expect(plan.gaps).toEqual([4, 5, 5, 7, 0])
    expect(plan.dayOffsets).toEqual([0, 4, 9, 14, 21])
  })
  it('every depth stays within the ONE ruled cap', () => {
    for (const d of SEQUENCE_DEPTHS) expect(d).toBeLessThanOrEqual(MAX_SEQUENCE_STEPS)
  })
  it('garbage input falls back rather than throwing at the API edge', () => {
    expect(normalisePurpose('nonsense')).toBe('meeting')
    expect(normalisePurpose(null)).toBe('meeting')
    expect(normaliseDepth(4)).toBe(DEFAULT_SEQUENCE_DEPTH)
    expect(normaliseDepth('7')).toBe(7)
  })
})

describe('the cadence convention: wait_days is the delay AFTER a step', () => {
  it('the last step always waits 0 — nothing follows it', () => {
    for (const p of ['meeting', 'event', 'reactivation'] as const) {
      for (const d of SEQUENCE_DEPTHS) {
        const gaps = stepCadence(p, d)
        expect(gaps).toHaveLength(d)
        expect(gaps[gaps.length - 1]).toBe(0)
      }
    }
  })
  it('NO cadence ever schedules two cold emails on the same day', () => {
    for (const p of ['meeting', 'event', 'reactivation'] as const) {
      for (const d of SEQUENCE_DEPTHS) {
        // Every gap except the terminal 0 must be a real wait.
        for (const g of stepCadence(p, d).slice(0, -1)) expect(g).toBeGreaterThanOrEqual(MIN_GAP_DAYS)
      }
    }
  })
})

describe('EVENT sequences count BACK from the date — the #651 motivating case', () => {
  const now = new Date('2026-08-15T09:00:00Z')

  it('the last email lands BEFORE the event, with the buffer respected', () => {
    const event = new Date('2026-09-14T09:00:00Z')   // 30 days out
    const plan = sequencePlan({ purpose: 'event', depth: 5, eventDate: event, now })
    const lastSendDay = plan.dayOffsets[plan.dayOffsets.length - 1]
    expect(lastSendDay).toBeLessThanOrEqual(30 - EVENT_BUFFER_DAYS)
    expect(plan.event?.fits).toBe(true)
  })

  it('a 30-day runway spreads 5 touches instead of stopping at day 21', () => {
    const plan = sequencePlan({ purpose: 'event', depth: 5, eventDate: new Date('2026-09-14T09:00:00Z'), now })
    expect(plan.dayOffsets[0]).toBe(0)
    // Strictly increasing, and it uses the runway rather than the fixed meeting table.
    for (let i = 1; i < plan.dayOffsets.length; i++) expect(plan.dayOffsets[i]).toBeGreaterThan(plan.dayOffsets[i - 1])
    expect(plan.dayOffsets[4]).toBeGreaterThan(21)
  })

  it('A SHORT RUNWAY IS REPORTED, NEVER SILENTLY COMPRESSED PAST THE EVENT', () => {
    // 4 days away, 7 touches: impossible. The operator must be told.
    const plan = sequencePlan({ purpose: 'event', depth: 7, eventDate: new Date('2026-08-19T09:00:00Z'), now })
    expect(plan.event?.fits).toBe(false)
  })

  it('an event already past does not schedule a single send into the void', () => {
    const plan = sequencePlan({ purpose: 'event', depth: 5, eventDate: new Date('2026-08-01T09:00:00Z'), now })
    expect(plan.event?.daysUntilEvent).toBeLessThan(0)
    expect(plan.event?.fits).toBe(false)
    expect(plan.gaps.every(g => g === 0)).toBe(true)
  })

  it('gaps never fall under the minimum even when the runway is tight', () => {
    const plan = sequencePlan({ purpose: 'event', depth: 3, eventDate: new Date('2026-08-20T09:00:00Z'), now })
    for (const g of plan.gaps.slice(0, -1)) expect(g).toBeGreaterThanOrEqual(MIN_GAP_DAYS)
  })

  it('no event DATE = the tabled event cadence, not a crash', () => {
    const plan = sequencePlan({ purpose: 'event', depth: 5 })
    expect(plan.event).toBeUndefined()
    expect(plan.gaps).toHaveLength(5)
  })
})

describe('templates give a real arc at every depth, and never invent claims', () => {
  it('a shallow sequence keeps the OPENER and the CLOSER, not the first three emails', () => {
    const deep = templateFor('meeting', 7)
    const shallow = templateFor('meeting', 3)
    expect(shallow.guidance).toHaveLength(3)
    expect(shallow.guidance[0]).toBe(deep.guidance[0])
    expect(shallow.guidance[2]).toBe(deep.guidance[deep.guidance.length - 1])
  })
  it('the 5 Aug no-link-in-step-1 lock survives EVERY purpose, including event invites', () => {
    for (const p of ['meeting', 'event', 'reactivation'] as const) {
      expect(templateFor(p, 5).guidance[0].toLowerCase()).toMatch(/no link|no ask|acknowledge/)
    }
    expect(templateFor('event', 5).guidance[0]).toMatch(/NO link in this first email/)
  })
  it('R30/R27 — no template text invents a number or claims we contacted anyone', () => {
    for (const p of ['meeting', 'event', 'reactivation'] as const) {
      for (const d of SEQUENCE_DEPTHS) {
        for (const g of templateFor(p, d).guidance) {
          expect(g).not.toMatch(/\d+%|\d+x\b/i)              // no invented stats
          expect(g.toLowerCase()).not.toMatch(/we (found|emailed|contacted) (you|them)/)
        }
      }
    }
  })
  it('an unknown industry adds nothing rather than guessing', () => {
    expect(industryNote('artisanal spoon whittling')).toBeNull()
    expect(industryNote('')).toBeNull()
    expect(industryNote('logistics and freight')).toContain('operational')
  })
  it('the name reads back to the operator', () => {
    expect(templateFor('event', 5).name).toBe('Event invite — 5 touches')
  })
})

describe('THE TWO LIVE BUGS on the suggest path (found 15 Aug, fixed here)', () => {
  const operator = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
  const suggest = operator.slice(
    operator.indexOf("operatorRouter.post('/sequence/suggest'"),
    operator.indexOf("operatorRouter.get('/sequence/:id/preview'"),
  )

  it('BUG 1 — suggest never truncates the draft to 3 again', () => {
    // R38 deepened the generator to 5 the day before; this endpoint threw steps 4–5 away.
    expect(suggest).not.toMatch(/\[\s*1\s*,\s*2\s*,\s*3\s*\]\.map/)
    expect(suggest).toContain('length: plan.depth')
  })

  it('BUG 2 — step 1 never carries a 0 wait ("send the next email immediately")', () => {
    expect(suggest).not.toMatch(/wait_days:\s*n === 1 \? 0/)
    expect(suggest).toContain('plan.gaps[n - 1]')
  })

  it('the save endpoint default is a real gap, not the old before-semantics 0', () => {
    expect(operator).not.toMatch(/wait_days: Number\(st\.wait_days \?\? \(i === 0 \? 0 : 3\)\)/)
    expect(operator).toContain('Number(st.wait_days ?? 4)')
  })

  it('the operator is TOLD when a date cannot hold the depth', () => {
    expect(suggest).toContain('fits: plan.event.fits')
  })
})
