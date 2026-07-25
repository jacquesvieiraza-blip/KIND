import { describe, it, expect } from 'vitest'
import { readCampaignGates, mergeCampaignGates, normaliseDailyCap } from './campaign-settings'

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
    expect(readCampaignGates(LIVE_SETTINGS)).toEqual({ review_required: true, daily_send_limit: 40 })
  })

  it('defaults to Auto-Pilot with no cap when settings is empty or absent', () => {
    for (const empty of [{}, null, undefined, 'not an object']) {
      expect(readCampaignGates(empty)).toEqual({ review_required: false, daily_send_limit: null })
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
