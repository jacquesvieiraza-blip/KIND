import { describe, it, expect } from 'vitest'
import { suggestSlots, offsetMinutesFor, suggestionSentence, SLOT_HOURS } from './suggest-times'

// A Wednesday, so "the next working day" is an ordinary one.
const WED = new Date('2026-07-22T09:00:00Z')

describe('offsetMinutesFor', () => {
  it('knows the markets we sell into', () => {
    expect(offsetMinutesFor('South Africa')).toBe(120)
    expect(offsetMinutesFor('ZA')).toBe(120)
    expect(offsetMinutesFor('Nigeria')).toBe(60)
  })

  it('matches a country inside a longer place string', () => {
    expect(offsetMinutesFor('Cape Town, South Africa')).toBe(120)
  })

  it('returns null rather than guessing — a 3am suggestion is worse than none', () => {
    expect(offsetMinutesFor('Mongolia')).toBeNull()
    expect(offsetMinutesFor(null)).toBeNull()
    expect(offsetMinutesFor('')).toBeNull()
  })
})

describe('suggestSlots', () => {
  it('offers three, one per day, so they are not stacked on one afternoon', () => {
    const s = suggestSlots(WED, 'South Africa')
    expect(s).toHaveLength(3)
    const days = new Set(s.map(x => x.startsAtUtc.slice(0, 10)))
    expect(days.size).toBe(3)
  })

  it('every slot lands inside the prospect working day', () => {
    for (const country of ['South Africa', 'United Kingdom', 'United States', 'Australia']) {
      for (const slot of suggestSlots(WED, country)) {
        const localHour = new Date(new Date(slot.startsAtUtc).getTime() + offsetMinutesFor(country)! * 60_000).getUTCHours()
        expect(SLOT_HOURS).toContain(localHour)
        expect(localHour).toBeGreaterThanOrEqual(9)
        expect(localHour).toBeLessThanOrEqual(16)
      }
    }
  })

  it('never suggests a weekend', () => {
    // From a Thursday the naive next-three-days would land on Saturday and Sunday.
    const thu = new Date('2026-07-23T09:00:00Z')
    for (const slot of suggestSlots(thu, 'South Africa')) {
      const localDay = new Date(new Date(slot.startsAtUtc).getTime() + 120 * 60_000).getUTCDay()
      expect(localDay).not.toBe(0)
      expect(localDay).not.toBe(6)
    }
  })

  it('never suggests today — the prospect needs notice', () => {
    for (const slot of suggestSlots(WED, 'South Africa')) {
      expect(new Date(slot.startsAtUtc).getTime()).toBeGreaterThan(WED.getTime())
    }
  })

  it('offers nothing at all for an unknown country', () => {
    // Falling back to a booking link is honest; inventing a timezone is not.
    expect(suggestSlots(WED, 'Atlantis')).toEqual([])
  })

  it('labels a time in the prospect own day, not ours', () => {
    const [first] = suggestSlots(WED, 'United States')
    expect(first.label).toContain('their time')
    expect(first.label).toMatch(/10am|2pm|4pm/)
  })
})

describe('suggestionSentence', () => {
  it('reads like a person offering, not a form', () => {
    const s = suggestionSentence(suggestSlots(WED, 'South Africa'))
    expect(s).toContain('Happy to work around you')
    expect(s).toContain('or')
    expect(s).not.toContain('their time')   // said once at the end, not three times
  })

  it('says nothing when there is nothing honest to say', () => {
    expect(suggestionSentence([])).toBe('')
  })
})
