import { describe, it, expect } from 'vitest'
import {
  readCampaignGates, mergeCampaignGates, normaliseDailyCap,
  normaliseSendDay, withinSendWindow,
} from './campaign-settings'

// Fixed instants so these never depend on when the suite runs.
const WED_06_UTC = new Date('2026-07-22T06:30:00Z')   // Wednesday
const WED_09_UTC = new Date('2026-07-22T09:00:00Z')   // Wednesday
const SAT_09_UTC = new Date('2026-07-25T09:00:00Z')   // Saturday
const SUN_09_UTC = new Date('2026-07-26T09:00:00Z')   // Sunday

// A realistic settings blob — these keys are all written by routes/figsy.ts PATCH
// /campaigns/:id and read by the send cron. Losing any of them changes what a client sends.
const LIVE_SETTINGS = {
  review_required: true,
  daily_send_limit: 40,
  send_days: ['mon', 'tue', 'wed', 'thu'],
  send_hour_utc: 7,
  ab_subject_b: 'quick question about {{company}}',
  steps: [{ step: 1, on_reply: 'stop' }],
  system_prompt: 'Write like a practitioner, not a marketer.',
}

describe('readCampaignGates', () => {
  it('reads the gates out of settings, not off the row', () => {
    expect(readCampaignGates(LIVE_SETTINGS)).toMatchObject({ review_required: true, daily_send_limit: 40 })
  })

  it('defaults to Auto-Pilot with no cap when settings is empty or absent', () => {
    for (const empty of [{}, null, undefined, 'not an object']) {
      expect(readCampaignGates(empty)).toEqual({
        review_required: false, daily_send_limit: null,
        send_days: [], send_hour_utc: null,
        ab_subject_b: null, ab_subject_c: null, ab_subject_d: null, ab_subject_e: null,
      })
    }
  })

  it('only treats an exact true as Co-Pilot', () => {
    // A truthy string must not silently arm the approval gate — or disarm it.
    expect(readCampaignGates({ review_required: 'yes' }).review_required).toBe(false)
    expect(readCampaignGates({ review_required: false }).review_required).toBe(false)
  })

  it('ignores a non-numeric cap rather than passing junk to the cron', () => {
    expect(readCampaignGates({ daily_send_limit: 'lots' }).daily_send_limit).toBe(null)
    expect(readCampaignGates({ daily_send_limit: NaN }).daily_send_limit).toBe(null)
  })
})

describe('mergeCampaignGates', () => {
  it('NEVER drops the other settings keys', () => {
    // The bug this guards: writing { review_required } as the whole settings object would
    // wipe the client's send window, A/B subjects and reply branching in one update.
    const out = mergeCampaignGates(LIVE_SETTINGS, { review_required: false })
    expect(out).toEqual({ ...LIVE_SETTINGS, review_required: false })
    expect(out.send_days).toEqual(['mon', 'tue', 'wed', 'thu'])
    expect(out.ab_subject_b).toBe('quick question about {{company}}')
    expect(out.steps).toEqual([{ step: 1, on_reply: 'stop' }])
  })

  it('leaves a gate alone when it is not being changed', () => {
    // Renaming a campaign must not disturb the send gate.
    expect(mergeCampaignGates(LIVE_SETTINGS, {}).review_required).toBe(true)
    expect(mergeCampaignGates(LIVE_SETTINGS, { daily_send_limit: 10 }).review_required).toBe(true)
  })

  it('can clear the cap explicitly with null', () => {
    expect(mergeCampaignGates(LIVE_SETTINGS, { daily_send_limit: null }).daily_send_limit).toBe(null)
  })

  it('does not mutate the object it was given', () => {
    const before = { ...LIVE_SETTINGS }
    mergeCampaignGates(LIVE_SETTINGS, { review_required: false, daily_send_limit: 1 })
    expect(LIVE_SETTINGS).toEqual(before)
  })

  it('builds a fresh object from nothing', () => {
    expect(mergeCampaignGates(null, { review_required: true })).toEqual({ review_required: true })
  })
})

describe('normaliseDailyCap', () => {
  it('absent means no change; blank means clear', () => {
    expect(normaliseDailyCap(undefined)).toBe(undefined)
    expect(normaliseDailyCap('')).toBe(null)
    expect(normaliseDailyCap(null)).toBe(null)
  })

  it('accepts a real number and rounds it', () => {
    expect(normaliseDailyCap('40')).toBe(40)
    expect(normaliseDailyCap(40.6)).toBe(41)
  })

  it('clamps to the 500 ceiling the client side also enforces', () => {
    expect(normaliseDailyCap(5000)).toBe(500)
  })

  it('clears rather than writing a cap that would stop all sending', () => {
    // 0 or negative as a *cap* would silently halt outreach — treat it as "no cap".
    expect(normaliseDailyCap(0)).toBe(null)
    expect(normaliseDailyCap(-5)).toBe(null)
    expect(normaliseDailyCap('abc')).toBe(null)
  })
})

describe('normaliseSendDay', () => {
  it('accepts the canonical short form', () => {
    expect(normaliseSendDay('mon')).toBe('mon')
    expect(normaliseSendDay('SUN')).toBe('sun')
  })

  it('accepts what the retired console might have written', () => {
    // A legacy value must be UNDERSTOOD, not read as "not today" — that would silently
    // stop a client's outreach on every day of the week.
    expect(normaliseSendDay('Monday')).toBe('mon')
    expect(normaliseSendDay(' Thursday ')).toBe('thu')
    expect(normaliseSendDay(0)).toBe('sun')   // JS getUTCDay(): 0 = Sunday
    expect(normaliseSendDay(1)).toBe('mon')
    expect(normaliseSendDay(7)).toBe('sun')   // 1–7 form, 7 = Sunday
  })

  it('returns null for anything it cannot place', () => {
    for (const junk of ['', '  ', 'someday', 9, null, undefined, {}]) {
      expect(normaliseSendDay(junk)).toBe(null)
    }
  })
})

describe('withinSendWindow', () => {
  it('FAILS OPEN when no window is configured', () => {
    // The kill-switch, caps and approval queue are the real gates. An absent preference
    // must never halt sending.
    for (const s of [{}, null, undefined, { send_days: [] }, { send_hour_utc: null }]) {
      expect(withinSendWindow(s, SAT_09_UTC)).toBe(true)
    }
  })

  it('honours a weekday window', () => {
    const monToThu = { send_days: ['mon', 'tue', 'wed', 'thu'] }
    expect(withinSendWindow(monToThu, WED_09_UTC)).toBe(true)
    expect(withinSendWindow(monToThu, SAT_09_UTC)).toBe(false)
    expect(withinSendWindow(monToThu, SUN_09_UTC)).toBe(false)
  })

  it('honours an earliest-hour window', () => {
    expect(withinSendWindow({ send_hour_utc: 7 }, WED_06_UTC)).toBe(false)
    expect(withinSendWindow({ send_hour_utc: 7 }, WED_09_UTC)).toBe(true)
    expect(withinSendWindow({ send_hour_utc: 9 }, WED_09_UTC)).toBe(true)  // inclusive
  })

  it('requires BOTH when both are set', () => {
    const weekdayMornings = { send_days: ['mon', 'tue', 'wed', 'thu', 'fri'], send_hour_utc: 7 }
    expect(withinSendWindow(weekdayMornings, WED_09_UTC)).toBe(true)
    expect(withinSendWindow(weekdayMornings, WED_06_UTC)).toBe(false)  // right day, too early
    expect(withinSendWindow(weekdayMornings, SAT_09_UTC)).toBe(false)  // right hour, wrong day
  })

  it('fails open on a window it cannot parse', () => {
    // Every entry unrecognised ⟹ treated as no restriction, not as "never send".
    expect(withinSendWindow({ send_days: ['someday', 'whenever'] }, SAT_09_UTC)).toBe(true)
    expect(withinSendWindow({ send_days: 'mon' }, SAT_09_UTC)).toBe(true)      // not an array
    expect(withinSendWindow({ send_hour_utc: 99 }, WED_06_UTC)).toBe(true)
    expect(withinSendWindow({ send_hour_utc: 'seven' }, WED_06_UTC)).toBe(true)
  })

  it('understands a legacy window written in long form', () => {
    expect(withinSendWindow({ send_days: ['Wednesday'] }, WED_09_UTC)).toBe(true)
    expect(withinSendWindow({ send_days: ['Wednesday'] }, SAT_09_UTC)).toBe(false)
  })
})

describe('readCampaignGates — window + A/B', () => {
  it('returns days in week order however they were stored', () => {
    expect(readCampaignGates({ send_days: ['fri', 'mon', 'Wednesday'] }).send_days)
      .toEqual(['mon', 'wed', 'fri'])
  })

  it('de-duplicates days', () => {
    expect(readCampaignGates({ send_days: ['mon', 'Monday', 1] }).send_days).toEqual(['mon'])
  })

  it('reads the A/B variants and treats blank as unset', () => {
    const g = readCampaignGates({ ab_subject_b: 'variant B', ab_subject_c: '   ', ab_subject_d: 5 })
    expect(g.ab_subject_b).toBe('variant B')
    expect(g.ab_subject_c).toBe(null)
    expect(g.ab_subject_d).toBe(null)
  })

  it('rejects an out-of-range hour', () => {
    expect(readCampaignGates({ send_hour_utc: 24 }).send_hour_utc).toBe(null)
    expect(readCampaignGates({ send_hour_utc: 0 }).send_hour_utc).toBe(0)
  })
})

describe('mergeCampaignGates — window + A/B', () => {
  it('stores canonical days', () => {
    expect(mergeCampaignGates({}, { send_days: ['Monday', 'wed'] }).send_days).toEqual(['mon', 'wed'])
  })

  it('stores "every day" as no restriction, not seven entries', () => {
    // Keeps the send-path check a cheap no-op, and means "all days" and "unset" behave alike.
    expect(mergeCampaignGates({}, { send_days: ['mon','tue','wed','thu','fri','sat','sun'] }).send_days).toEqual([])
  })

  it('clears the window with null / empty', () => {
    expect(mergeCampaignGates({ send_days: ['mon'] }, { send_days: null }).send_days).toEqual([])
    expect(mergeCampaignGates({ send_hour_utc: 7 }, { send_hour_utc: null }).send_hour_utc).toBe(null)
  })

  it('trims and caps an A/B subject, and clears a blank one', () => {
    expect(mergeCampaignGates({}, { ab_subject_b: '  hello  ' }).ab_subject_b).toBe('hello')
    expect(mergeCampaignGates({ ab_subject_b: 'x' }, { ab_subject_b: '' }).ab_subject_b).toBe(null)
    expect(String(mergeCampaignGates({}, { ab_subject_c: 'z'.repeat(300) }).ab_subject_c)).toHaveLength(200)
  })

  it('still never drops the unrelated keys', () => {
    const out = mergeCampaignGates(LIVE_SETTINGS, { send_hour_utc: 9 })
    expect(out.system_prompt).toBe('Write like a practitioner, not a marketer.')
    expect(out.steps).toEqual([{ step: 1, on_reply: 'stop' }])
    expect(out.review_required).toBe(true)
  })
})
