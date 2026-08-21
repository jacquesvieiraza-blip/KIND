import { describe, it, expect } from 'vitest'
import {
  londonDay, londonWeekStart, londonMidnightUtc, composeBrief, briefTag, BRIEF_KIND,
} from './morning-brief'

// P33 v3 — the brief's pure half. Everything asserted here is a rule the founder
// stated or a timezone fact, so a change that breaks one is a product change and
// should have to argue for itself in a diff.

describe('R62 — the product keeps UK time, and BST is the whole reason', () => {
  it('reads the London day, not the UTC day, on a BST summer night', () => {
    // 23:30 UTC on 21 Aug is already 00:30 on 22 Aug in London (BST, UTC+1).
    // A UTC-based "today" would file this under the 21st and put two briefs in
    // one London day — the exact twin the founder's rule forbids.
    expect(londonDay(new Date('2026-08-21T23:30:00Z'))).toBe('2026-08-22')
  })

  it('agrees with UTC in winter, when London IS UTC', () => {
    expect(londonDay(new Date('2026-01-21T23:30:00Z'))).toBe('2026-01-21')
  })

  it('midnight London in summer is 23:00 UTC the day before', () => {
    // If this ever returns 00:00Z, every BST "this week" window is an hour wrong.
    expect(londonMidnightUtc('2026-08-22').toISOString()).toBe('2026-08-21T23:00:00.000Z')
  })

  it('midnight London in winter is 00:00 UTC the same day', () => {
    expect(londonMidnightUtc('2026-01-22').toISOString()).toBe('2026-01-22T00:00:00.000Z')
  })

  it('is not a hardcoded offset — the two seasons genuinely differ', () => {
    const summer = londonMidnightUtc('2026-08-22').getUTCHours()
    const winter = londonMidnightUtc('2026-01-22').getUTCHours()
    expect(summer).not.toBe(winter)
  })
})

describe('"this week" is a real week, never a rolling 7 days', () => {
  it('starts on Monday — and a Monday is its own week start', () => {
    // Mon 24 Aug 2026, 09:00 London.
    const monday = new Date('2026-08-24T08:00:00Z')
    expect(londonWeekStart(monday).toISOString()).toBe('2026-08-23T23:00:00.000Z')
  })

  it('a Sunday still belongs to the week that began the previous Monday', () => {
    // Sun 23 Aug 2026 — the week began Mon 17 Aug.
    const sunday = new Date('2026-08-23T12:00:00Z')
    expect(londonWeekStart(sunday).toISOString()).toBe('2026-08-16T23:00:00.000Z')
  })

  it('a rolling 7-day window would have flattered the number — it does not', () => {
    // On Monday morning, a rolling window reaches back into LAST week and counts
    // meetings the client already saw reported. The boundary must be in the future
    // of that: strictly after last Tuesday.
    const mondayMorning = new Date('2026-08-24T08:00:00Z')
    const rolling7 = new Date(mondayMorning.getTime() - 7 * 86_400_000)
    expect(londonWeekStart(mondayMorning).getTime()).toBeGreaterThan(rolling7.getTime())
  })
})

describe('#136a — the brief may only say what a query proved', () => {
  it('renders both numbers when both are real', () => {
    expect(composeBrief({ pendingReview: 12, meetingsThisWeek: 2 }))
      .toBe('Morning. 12 prospects are waiting for your review · 2 meetings booked this week.')
  })

  it('says "1 prospect", never "1 prospects"', () => {
    expect(composeBrief({ pendingReview: 1, meetingsThisWeek: 1 }))
      .toBe('Morning. 1 prospect is waiting for your review · 1 meeting booked this week.')
  })

  it('a zero category is DROPPED, not printed as a zero', () => {
    // "0 meetings booked this week" is technically true and reads as failure on a
    // day the client did nothing wrong. Silence is the honest rendering.
    const s = composeBrief({ pendingReview: 4, meetingsThisWeek: 0 })
    expect(s).toBe('Morning. 4 prospects are waiting for your review.')
    expect(s).not.toContain('0 meetings')
  })

  it('mixed zero/non-zero is NEVER called quiet — the founder\'s clause, verbatim', () => {
    const s = composeBrief({ pendingReview: 0, meetingsThisWeek: 3 })
    expect(s).toContain('3 meetings booked this week')
    expect(s).not.toContain('Quiet night')
  })

  it('only a genuinely empty day is quiet, and it says what happens next', () => {
    // Founder-ruled 21 Aug: "yes send on day 1" — so a brand-new client sees this
    // as their first message. It must not read like a dead end.
    const s = composeBrief({ pendingReview: 0, meetingsThisWeek: 0 })
    expect(s).toContain('Quiet night')
    expect(s).toContain('next batch')
  })

  it('never mentions the two numbers that have no rule behind them', () => {
    // X ("match strongly") has no canonical rule anywhere; Y ("replies need you")
    // has no handled-state to test. Both were CUT rather than approximated.
    for (const n of [
      { pendingReview: 9, meetingsThisWeek: 4 },
      { pendingReview: 0, meetingsThisWeek: 0 },
    ]) {
      const s = composeBrief(n).toLowerCase()
      expect(s).not.toContain('match strongly')
      expect(s).not.toContain('need you')
      expect(s).not.toContain('strong')
    }
  })

  it('carries no downstream outcome past MEETING_BOOKED', () => {
    const s = composeBrief({ pendingReview: 5, meetingsThisWeek: 2 }).toLowerCase()
    for (const banned of ['pipeline', 'revenue', 'close rate', 'roi', 'opportunit', 'forecast']) {
      expect(s).not.toContain(banned)
    }
  })
})

describe('the idempotency tag', () => {
  it('stamps kind + day so one London day can hold exactly one brief', () => {
    expect(briefTag('2026-08-22')).toEqual({ kind: BRIEF_KIND, day: '2026-08-22' })
  })

  it('is an OBJECT, so it can never collide with a chat row\'s sources array', () => {
    // Ordinary chat rows put an ARRAY in `sources` (RAG citations). In Postgres
    // `sources->>'kind'` on an array is NULL, so those rows fall outside the
    // partial unique index instead of fighting it.
    const tag = briefTag('2026-08-22')
    expect(Array.isArray(tag)).toBe(false)
    expect(tag.kind).toBe(BRIEF_KIND)
  })
})
