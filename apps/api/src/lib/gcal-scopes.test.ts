import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

// ── WE ASK A CLIENT FOR NO MORE THAN WE USE (20 Aug) ───────────────────────────────────────
//
// The OAuth consent screen is the most honest sentence the product ever shows a client: it
// names, in Google's words, exactly what they are handing over. Until today it said we wanted
// to *"see and download any calendar you can access"* — because `calendar.readonly` was in the
// list, requested for **one line**: reading the calendar's timezone.
//
// We never read an event body. Asking for the power to is a promise we did not need to make.
//
// ⚠️ THE OBVIOUS FIX — DELETING THE SCOPE — WOULD HAVE FAILED SILENTLY. `getPrimaryTimeZone`
// catches its own error and returns 'UTC', so a missing scope produces no error anywhere: just
// business hours drawn in the wrong timezone. 9–17 UTC is 02:00–10:00 US Pacific, which is the
// "3am slots" failure `zonedWeekdayHour`'s comment warns about, arriving quietly. So the scope
// was NARROWED to `calendar.calendars.readonly` (calendar metadata only) rather than removed.
//
// ⚠️ THE SOURCE OF TRUTH HERE IS GOOGLE'S OWN, AND IT IS OFFLINE. `developers.google.com` is
// blocked by this environment's egress proxy, so the live docs page could not be read. These
// scope lists come from the `googleapis` package's generated typings — Google's own discovery
// document — which is authoritative but a version snapshot. Stated rather than glossed: if the
// live page ever disagrees, the symptom is a LOUD permission error on the first connection, not
// a silent one, because every call below either works or 403s.

const GCAL = readFileSync(join(__dirname, 'gcal.ts'), 'utf8')
const CODE = stripCommentsForEnvScan(GCAL)
const TYPINGS = join(__dirname, '../../../../node_modules/googleapis/build/src/apis/calendar/v3.d.ts')

/** The scopes the app actually requests, parsed from the source rather than duplicated here. */
function requestedScopes(): string[] {
  const block = CODE.slice(CODE.indexOf('const SCOPES = ['), CODE.indexOf(']', CODE.indexOf('const SCOPES = [')))
  return [...block.matchAll(/'(https:\/\/www\.googleapis\.com\/auth\/[^']+)'/g)].map(m => m[1])
}

/** Google's own accepted-scope list for one Calendar method, read from its generated typings. */
function scopesAcceptedBy(call: string): string[] {
  const lines = readFileSync(TYPINGS, 'utf8').split('\n')
  const i = lines.findIndex(l => l.includes(`${call}({`))
  if (i < 0) return []
  let j = i
  while (j > 0 && !lines[j].includes('scopes: [')) j--
  const out: string[] = []
  for (let k = j + 1; k < i; k++) {
    const m = lines[k].match(/'(https:[^']+)'/)
    if (m) out.push(m[1])
    if (lines[k].includes('],')) break
  }
  return out
}

describe('the guard is reading real files', () => {
  it('finds the scope list and Google\'s typings', () => {
    // Without this a moved file leaves every assertion below comparing empty arrays and passing.
    expect(requestedScopes().length, 'the SCOPES array must be parseable').toBeGreaterThan(2)
    expect(scopesAcceptedBy('calendar.freebusy.query').length, 'Google\'s typings must be readable — if 0, re-point TYPINGS').toBeGreaterThan(2)
  })
})

describe('① the scopes we ask for', () => {
  it('are exactly these four, and calendar.readonly is NOT among them', () => {
    // Pinned as a list rather than a count: the whole value of this change is WHICH scope left.
    expect(requestedScopes()).toEqual([
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.freebusy',
      'https://www.googleapis.com/auth/calendar.calendars.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ])
  })

  it('⚠️ we no longer ask to read the CONTENT of a client\'s calendar', () => {
    // The point of the whole item, asserted on its own so a regression names itself.
    expect(
      requestedScopes(),
      'calendar.readonly grants read access to every event body on the calendar — titles, ' +
      'attendees, notes. Nothing in gcal.ts reads an event body.',
    ).not.toContain('https://www.googleapis.com/auth/calendar.readonly')
    expect(requestedScopes(), 'nor full read-write calendar access')
      .not.toContain('https://www.googleapis.com/auth/calendar')
  })
})

describe('② EVERY Google call is covered by a scope we request — and nothing more is requested', () => {
  /** Every `calendar.<resource>.<method>(` actually called in gcal.ts. */
  const calls = [...new Set(
    [...CODE.matchAll(/\bcalendar\.([a-z]+)\.([a-zA-Z]+)\(/g)].map(m => `calendar.${m[1]}.${m[2]}`),
  )]

  it('finds the four Calendar calls this file makes', () => {
    // ⚠️ THE COUNT IS THE GUARD. A new Google call appearing here turns this red and forces
    // somebody to check its scope, instead of a call quietly needing a permission we do not ask
    // for — which would 403 in production on a client's first booking.
    expect(calls.sort(), `found: ${calls.join(', ')}`).toEqual([
      'calendar.calendars.get',
      'calendar.events.get',
      'calendar.events.insert',
      'calendar.freebusy.query',
    ])
  })

  for (const call of ['calendar.calendars.get', 'calendar.events.get', 'calendar.events.insert', 'calendar.freebusy.query']) {
    it(`${call} is satisfied by a scope we request`, () => {
      const accepted = scopesAcceptedBy(call)
      expect(accepted.length, `Google's typings list no scopes for ${call} — re-point the parser`).toBeGreaterThan(0)
      const covered = accepted.filter(s => requestedScopes().includes(s))
      expect(
        covered,
        `${call} accepts [${accepted.join(', ')}] and we request none of them — this call will 403`,
      ).not.toEqual([])
    })
  }

  it('the userinfo call is covered too — it is not a Calendar method', () => {
    // `oauth2.userinfo.get()` lives outside the Calendar API, so the loop above cannot see it.
    // Named here rather than left as a gap the reader has to notice.
    expect(CODE, 'the call exists').toContain('oauth2.userinfo.get()')
    expect(requestedScopes()).toContain('https://www.googleapis.com/auth/userinfo.email')
  })
})

describe('③ the narrowed scope still does the ONE job it was kept for', () => {
  it('calendar.calendars.readonly is what covers the timezone read', () => {
    // If this stops being true, `getPrimaryTimeZone` silently returns UTC and every client's
    // booking hours shift — with no error to find.
    const accepted = scopesAcceptedBy('calendar.calendars.get')
    expect(accepted).toContain('https://www.googleapis.com/auth/calendar.calendars.readonly')
    expect(requestedScopes()).toContain('https://www.googleapis.com/auth/calendar.calendars.readonly')
  })

  it('and the silent-fallback that made this dangerous is still there, unchanged', () => {
    // Pinned deliberately. The fallback is CORRECT behaviour — a booking flow should not die
    // because a timezone read failed — but it is also why a dropped scope would have been
    // invisible. Nobody should "simplify" it away and make this comment untrue.
    const fn = CODE.slice(CODE.indexOf('async function getPrimaryTimeZone'))
    expect(fn.slice(0, fn.indexOf('\n}'))).toContain("return 'UTC'")
  })
})

describe('④ existing connections — nothing breaks, and the reduction is opt-in by reconnecting', () => {
  it('the OLD grant still satisfies every call, so connected clients keep working', () => {
    // A stored token keeps the scopes it was issued with. `calendar.readonly` covers BOTH
    // `calendars.get` and `freebusy.query`, and `calendar.events` covers the writes — so a
    // client who connected before today is unaffected by this change. Re-consent SHRINKS their
    // grant; it is not required to keep them running. Worth pinning, because "re-authorise or
    // it breaks" and "re-authorise to give us less" are very different messages to send a client.
    const OLD_GRANT = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ]
    for (const call of ['calendar.calendars.get', 'calendar.events.get', 'calendar.events.insert', 'calendar.freebusy.query']) {
      const accepted = scopesAcceptedBy(call)
      expect(
        accepted.some(s => OLD_GRANT.includes(s)),
        `${call} would break for an already-connected client — that would make this a breaking change`,
      ).toBe(true)
    }
  })
})

describe('⑤ the stale comment is corrected, not quietly dropped', () => {
  it('records that googleapis is already a dependency', () => {
    // It said "Re-add googleapis to package.json when Google Calendar goes live" while the
    // package sat in package.json. The fourth comment found on 20 Aug describing something
    // that was not so.
    expect(GCAL).toContain('CORRECTED 20 Aug')
    expect(GCAL, 'quoting what it replaced, per the chain rule').toContain('Re-add googleapis to package.json')
    const pkg = readFileSync(join(__dirname, '../../package.json'), 'utf8')
    expect(pkg, 'and the dependency really is there').toContain('"googleapis"')
  })
})
