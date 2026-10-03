// #2562 — THE TWO OLD-PRODUCT EMAILS NEVER REACH A PROGRAMME CLIENT.
//
// ⛓️ FOUNDER-RULED 2 Oct (R191 ③, chains R87): asked whether a programme client should still
// get the Monday "weekly leads report" and the "Your campaign was paused" email, he answered
// *"Stop both"*. Both belong to the old self-serve product: the digest reports leads and
// campaigns a programme client never manages, and the pause email reports an automatic pause
// R185 removed.
//
// ⚠️ THE RULE IS RUN, NOT READ — `mayNotify` is imported and executed. The source checks below
// only prove the two send paths ASK the rule with the real programme answer instead of `null`.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { mayNotify, RETIRED_FOR_PROGRAMME_NOTIFICATIONS } from './programme-notifications'

const INTERNAL = readFileSync(join(__dirname, '../routes/internal.ts'), 'utf8')
const SETTINGS = readFileSync(
  join(__dirname, '../../../portal/src/app/(milla)/milla/settings/page.tsx'), 'utf8')

describe('#2562 — weekly digest and campaign-paused are off for programme clients', () => {
  it('a programme client is never sent either, whatever their switch says', () => {
    for (const kind of ['weekly_digest', 'campaign_paused'] as const) {
      expect(mayNotify(kind, { onProgramme: true })).toBe(false)
      expect(mayNotify(kind, { onProgramme: true, pref: true })).toBe(false)
    }
    expect(RETIRED_FOR_PROGRAMME_NOTIFICATIONS).toEqual(['weekly_digest', 'campaign_paused'])
  })

  it('an unreadable programme answer withholds them too — it is not a "no"', () => {
    expect(mayNotify('weekly_digest',   { onProgramme: null })).toBe(false)
    expect(mayNotify('campaign_paused', { onProgramme: null })).toBe(false)
  })

  it('a legacy (non-programme) client keeps them, and their switch still works', () => {
    expect(mayNotify('weekly_digest',   { onProgramme: false })).toBe(true)
    expect(mayNotify('campaign_paused', { onProgramme: false, pref: null })).toBe(true)
    expect(mayNotify('weekly_digest',   { onProgramme: false, pref: false })).toBe(false)
  })

  it('the daily brief is untouched', () => {
    expect(mayNotify('daily_brief', { onProgramme: true })).toBe(true)
    expect(mayNotify('daily_brief', { onProgramme: null })).toBe(true)
  })

  it('both send paths pass the real programme answer, never a hard-coded null', () => {
    expect(INTERNAL).not.toMatch(/mayNotify\('weekly_digest',\s*\{\s*onProgramme:\s*null/)
    expect(INTERNAL).not.toMatch(/mayNotify\('campaign_paused',\s*\{\s*onProgramme:\s*null/)
    expect(INTERNAL).toMatch(/mayNotify\('weekly_digest',\s*\{\s*onProgramme:\s*onProgramme\(digestProgrammes,/)
    expect(INTERNAL).toMatch(/mayNotify\('campaign_paused',\s*\{\s*onProgramme:\s*onProgramme\(pausedProgrammes,/)
  })

  it('the Milla settings page no longer offers the two switches', () => {
    expect(SETTINGS).not.toMatch(/label: 'Weekly digest'/)
    expect(SETTINGS).not.toMatch(/label: 'Campaign paused'/)
    expect(SETTINGS).toMatch(/label: 'Daily brief'/)
  })
})
