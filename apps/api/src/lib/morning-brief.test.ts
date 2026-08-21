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

describe('#136a — the brief says only what a query proved, and only if it is news', () => {
  it('reports meetings, and points at where they are', () => {
    expect(composeBrief({ meetingsThisWeek: 2 }))
      .toBe("Morning. 2 meetings booked this week — they're in your Meetings tab.")
  })

  it('says "1 meeting", never "1 meetings"', () => {
    expect(composeBrief({ meetingsThisWeek: 1 }))
      .toBe("Morning. 1 meeting booked this week — it's in your Meetings tab.")
  })

  it('SAYS NOTHING when there is no news — /milla already greets the client', () => {
    // The late correction: the page's own greeting reports the lead count from a
    // query that mirrors ours. A brief with nothing left to add would be a second
    // message saying nothing. Silence is the correct output, not a "quiet" line.
    expect(composeBrief({ meetingsThisWeek: 0 })).toBeNull()
  })

  it('never re-prints the lead count the greeting owns', () => {
    const s = String(composeBrief({ meetingsThisWeek: 3 })).toLowerCase()
    expect(s).not.toContain('prospect')
    expect(s).not.toContain('waiting for your review')
  })

  it('never mentions the two numbers that have no rule behind them', () => {
    // X ("match strongly") has no canonical rule anywhere; Y ("replies need you")
    // has no handled-state to test. Both CUT rather than approximated.
    const s = String(composeBrief({ meetingsThisWeek: 4 })).toLowerCase()
    expect(s).not.toContain('match strongly')
    expect(s).not.toContain('need you')
    expect(s).not.toContain('strong')
  })

  it('carries no downstream outcome past MEETING_BOOKED', () => {
    const s = String(composeBrief({ meetingsThisWeek: 2 })).toLowerCase()
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
