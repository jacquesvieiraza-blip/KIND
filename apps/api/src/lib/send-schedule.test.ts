// ═══════════════════════════════════════════════════════════════════════════════════════
// RECIPIENT-LOCAL MEANS RECIPIENT-LOCAL, AND THE STEP COUNT COMES FROM THE WORK.
//
// 🛑 THERE WAS NO SCHEDULE ANYWHERE. `getDay`, `getHours` and "send window" appear nowhere in
// the send path, so the product was ready to cold-email founders at 03:00 on a Sunday.
//
// 🛑 AND THE FIRST FIX WAS WRONG IN THE SAME FAMILY (founder-caught, 8 Sep). It mapped
// `United States → America/New_York` and called the result recipient-local. **08:30 New York is
// 05:30 Los Angeles.** A West Coast founder would have been cold-emailed at half past five in
// the morning by the guard built to prevent exactly that, and the log would have said the send
// was inside an 08:30 window. A guess dressed as a fact is worse than an admitted unknown.
//
// ⚠️ SO THE CENTRAL CASE IN THIS FILE IS THE 05:30 ONE. Everything else supports it.
//
// 🛑 THE REPLY BRANCH ALSO HARDCODED THREE STEPS. `if (skipped >= 3)` came from the legacy
// three-column era. On a 5-step sequence a `skip_next` at step 2 marked the enrolment COMPLETED
// — steps 4 and 5 silently never sent, to a prospect who had just replied.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

import {
  maySendNow, isSendSchedule, resolveRecipientZones, type SendSchedule,
} from './send-schedule'

/** The founder-locked House default: Mon–Fri, 08:30–17:00, recipient-local. */
const SCHEDULE: SendSchedule = {
  days: [1, 2, 3, 4, 5], start: '08:30', end: '17:00', default_tz: 'Europe/London',
}

const utc = (iso: string) => new Date(iso)
/** 2026-09-09 is a Wednesday. September: London BST (+1), New York EDT (−4), LA PDT (−7). */
const WED = '2026-09-09'

// ── ① THE DEFECT THAT WAS CAUGHT ─────────────────────────────────────────────────────

describe('① 08:30 New York is 05:30 Los Angeles, and that must not be a send', () => {
  it('🛑 AN UNPLACED AMERICAN IS NOT EMAILED AT 05:30 PACIFIC', () => {
    // 12:30 UTC = 08:30 New York = 05:30 Los Angeles. The old implementation allowed this.
    const v = maySendNow(SCHEDULE, utc(`${WED}T12:30:00Z`), { country: 'United States' })
    expect(v.allowed, 'a West Coast founder is being cold-emailed at half past five').toBe(false)
    expect(v.allowed === false && v.reason).toBe('outside_window')
  })

  it('🛑 an EXPLICIT Los Angeles recipient is refused at their own 05:30', () => {
    const v = maySendNow(SCHEDULE, utc(`${WED}T12:30:00Z`), { region: 'CA', country: 'United States' })
    expect(v.allowed).toBe(false)
  })

  it('🛑 a New York recipient is refused before THEIR 08:30', () => {
    // 12:00 UTC = 08:00 New York.
    expect(maySendNow(SCHEDULE, utc(`${WED}T12:00:00Z`), { region: 'NY' }).allowed).toBe(false)
    // 12:30 UTC = 08:30 New York exactly — allowed once we actually know they are in New York.
    expect(maySendNow(SCHEDULE, utc(`${WED}T12:30:00Z`), { region: 'NY' }).allowed).toBe(true)
  })

  it('🛑 a UK recipient is refused before THEIR 08:30', () => {
    // 07:29 UTC = 08:29 London (BST).
    expect(maySendNow(SCHEDULE, utc(`${WED}T07:29:00Z`), { country: 'United Kingdom' }).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc(`${WED}T07:30:00Z`), { country: 'United Kingdom' }).allowed).toBe(true)
  })

  it('🛑 nothing goes out after 17:00 recipient-local', () => {
    // 16:00 UTC = 17:00 London exactly — the window has closed (end is exclusive).
    expect(maySendNow(SCHEDULE, utc(`${WED}T16:00:00Z`), { country: 'United Kingdom' }).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc(`${WED}T15:59:00Z`), { country: 'United Kingdom' }).allowed).toBe(true)
    // 21:00 UTC = 17:00 New York.
    expect(maySendNow(SCHEDULE, utc(`${WED}T21:00:00Z`), { region: 'NY' }).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc(`${WED}T20:59:00Z`), { region: 'NY' }).allowed).toBe(true)
  })

  it('the unplaced-American window is the INTERSECTION, and it is genuinely open somewhere', () => {
    // Opens when it is 08:30 in the westernmost zone (Honolulu, UTC−10) and closes when it is
    // 17:00 in the easternmost (New York, EDT). 18:30 UTC is inside; 18:00 and 21:00 are not.
    expect(maySendNow(SCHEDULE, utc(`${WED}T18:30:00Z`), { country: 'United States' }).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc(`${WED}T18:00:00Z`), { country: 'United States' }).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc(`${WED}T21:00:00Z`), { country: 'United States' }).allowed).toBe(false)
  })
})

// ── ② WEEKENDS ───────────────────────────────────────────────────────────────────────

describe('② Monday to Friday, in the recipient\'s week', () => {
  it('🛑 Saturday and Sunday refuse', () => {
    expect(maySendNow(SCHEDULE, utc('2026-09-12T10:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc('2026-09-13T10:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(false)
  })

  it('Monday is a sending day — the locked default is Mon–Fri, not Tue–Thu', () => {
    expect(maySendNow(SCHEDULE, utc('2026-09-07T10:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc('2026-09-11T10:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(true)
  })

  it('🛑 and the DAY is the recipient\'s, not ours', () => {
    // 23:00 UTC on Friday is already Saturday nowhere in scope — but 02:00 UTC Saturday is
    // still Friday evening in New York, and Friday evening is outside the window anyway.
    expect(maySendNow(SCHEDULE, utc('2026-09-12T02:00:00Z'), { region: 'NY' }).allowed).toBe(false)
  })
})

// ── ③ DST — THE HOUR MUST NOT DRIFT TWICE A YEAR ─────────────────────────────────────

describe('③ daylight saving is applied by the zone, never by a table we maintain', () => {
  it('🛑 London: the SAME UTC instant is inside the window in summer and outside in winter', () => {
    // 08:00 UTC → 09:00 BST in July (inside) and 08:00 GMT in January (before 08:30).
    expect(maySendNow(SCHEDULE, utc('2026-07-08T08:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc('2026-01-07T08:00:00Z'), { country: 'United Kingdom' }).allowed,
      'a hand-rolled offset would have sent this at 08:00 GMT').toBe(false)
  })

  it('🛑 New York: 12:30 UTC is 08:30 EDT in September and 07:30 EST in January', () => {
    expect(maySendNow(SCHEDULE, utc('2026-09-09T12:30:00Z'), { region: 'NY' }).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc('2026-01-07T12:30:00Z'), { region: 'NY' }).allowed).toBe(false)
  })

  it('Arizona does not observe DST, and is its own zone for that reason', () => {
    const r = resolveRecipientZones({ region: 'AZ' })
    expect(r.ok && r.zones).toEqual(['America/Phoenix'])
    // ⚠️ THE DISCRIMINATING INSTANT IS IN SUMMER, NOT WINTER. In January both Phoenix and Denver
    // are UTC−7, so a January case would pass whether or not Phoenix were folded into Denver —
    // it would prove nothing. In July Denver moves to UTC−6 and Phoenix does not, so 14:30 UTC
    // is 08:30 in Denver (inside) and 07:30 in Phoenix (before the window opens).
    expect(maySendNow(SCHEDULE, utc('2026-07-08T14:30:00Z'), { region: 'CO' }).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc('2026-07-08T14:30:00Z'), { region: 'AZ' }).allowed,
      'Arizona is being given Denver\'s daylight saving, so it sends an hour early all summer').toBe(false)
  })
})

// ── ④ THE RESOLUTION HIERARCHY, AND FAILING CLOSED ───────────────────────────────────

describe('④ an unknown location is refused, never assumed', () => {
  it('🛑 no country, region or timezone → FAIL CLOSED', () => {
    const v = maySendNow(SCHEDULE, utc(`${WED}T10:00:00Z`), null)
    expect(v.allowed).toBe(false)
    expect(v.allowed === false && v.reason).toBe('unknown_timezone')
  })

  it('🛑 an UNMAPPED country is refused — it does not silently become Eastern', () => {
    const v = maySendNow(SCHEDULE, utc(`${WED}T12:30:00Z`), { country: 'Sweden' })
    expect(v.allowed, 'an unmapped country is being judged in somebody else\'s timezone').toBe(false)
    expect(v.allowed === false && v.reason).toBe('unknown_timezone')
    expect(v.allowed === false && v.detail).toContain('Sweden')
  })

  it('🛑 the programme\'s default_tz does NOT grant anything', () => {
    // Falling back to our home zone for an unknown recipient is the same defect as assuming
    // New York: it makes the window mean something true about US rather than about them.
    // 10:00 UTC is comfortably inside the London window, and this still refuses.
    expect(maySendNow(SCHEDULE, utc(`${WED}T10:00:00Z`), { country: 'Sweden' }).allowed).toBe(false)
  })

  it('a bad persisted timezone is refused rather than ignored', () => {
    const v = maySendNow(SCHEDULE, utc(`${WED}T10:00:00Z`), { timezone: 'Not/AZone', country: 'United Kingdom' })
    expect(v.allowed).toBe(false)
    expect(v.allowed === false && v.reason).toBe('unknown_timezone')
  })

  it('the hierarchy is exact → region → country set, in that order', () => {
    // ① a persisted zone wins over both.
    expect(resolveRecipientZones({ timezone: 'America/Los_Angeles', region: 'NY', country: 'United States' }))
      .toEqual({ ok: true, zones: ['America/Los_Angeles'], precision: 'exact' })
    // ② a region wins over the country set.
    expect(resolveRecipientZones({ region: 'Texas', country: 'United States' }))
      .toEqual({ ok: true, zones: ['America/Chicago'], precision: 'region' })
    // ③ country alone gives the whole set.
    const set = resolveRecipientZones({ country: 'United States' })
    expect(set.ok && set.precision).toBe('country_set')
    expect(set.ok && set.zones.length, 'the American set no longer spans the country').toBeGreaterThan(4)
    // A single-zone country is exact by construction.
    expect(resolveRecipientZones({ country: 'United Kingdom' }))
      .toEqual({ ok: true, zones: ['Europe/London'], precision: 'exact' })
  })
})

// ── ⑤ A MISSING OR MALFORMED SCHEDULE ────────────────────────────────────────────────

describe('⑤ no schedule is not "no restriction"', () => {
  it('🛑 null refuses', () => {
    const v = maySendNow(null, utc(`${WED}T10:00:00Z`), { country: 'United Kingdom' })
    expect(v.allowed === false && v.reason).toBe('no_schedule')
  })

  it('🛑 a half-written schedule is unreadable, not permissive', () => {
    for (const bad of [{}, { days: [] }, { days: [1], start: '9am', end: '17:00', default_tz: 'Europe/London' },
                       { days: [1], start: '08:30', end: '17:00' },
                       { days: [0], start: '08:30', end: '17:00', default_tz: 'Europe/London' },
                       { days: [8], start: '08:30', end: '17:00', default_tz: 'Europe/London' }]) {
      expect(isSendSchedule(bad), JSON.stringify(bad)).toBe(false)
      expect(maySendNow(bad, utc(`${WED}T10:00:00Z`), { country: 'United Kingdom' }).allowed).toBe(false)
    }
    expect(isSendSchedule(SCHEDULE)).toBe(true)
  })

  it('🛑 a window that ends at or before it starts describes no time at all', () => {
    const v = maySendNow({ ...SCHEDULE, start: '17:00', end: '09:00' }, utc(`${WED}T10:00:00Z`), { country: 'United Kingdom' })
    expect(v.allowed === false && v.reason).toBe('unreadable')
  })
})

// ── ⑥ RUN AND RETRY CANNOT OUTLAST THE WINDOW ────────────────────────────────────────

describe('⑥ the verdict is taken at the moment of the attempt', () => {
  it('🛑 work refused at 19:00 is refused again five minutes later, and allowed next morning', () => {
    expect(maySendNow(SCHEDULE, utc(`${WED}T18:00:00Z`), { country: 'United Kingdom' }).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc(`${WED}T18:05:00Z`), { country: 'United Kingdom' }).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc('2026-09-10T08:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(true)
  })

  it('🛑 the guard sits at the ONE authority door, so cron, Run and retries all inherit it', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const AUTH = readFileSync(join(__dirname, './programme-authority.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    const at = AUTH.indexOf('async function outreachStillMatchesApproval')
    expect(at).toBeGreaterThan(-1)
    const gate = AUTH.slice(at, at + 1600)
    expect(gate).toContain('maySendNow(')
    expect(gate, 'the window verdict is computed and then ignored').toContain('if (!when.allowed) {')
    // ⚠️ DEFAULT-ON. Forgetting the flag yields the enforced answer; only an explicit
    // `enforceSchedule: false` opts out, and campaign activation is the one caller that does.
    expect(AUTH).toContain("if (ctx?.enforceSchedule !== false) {")
    const START = readFileSync(join(__dirname, './start-work.ts'), 'utf8')
    expect(START).toContain('{ enforceSchedule: false }')
    // And the recipient's location is threaded in precision order, not as a bare country.
    expect(gate).toContain('timezone: ctx?.recipientTimezone')
    expect(gate).toContain('region: ctx?.recipientRegion')
  })
})

// ── ⑦ THE STEP COUNT COMES FROM THE WORK ─────────────────────────────────────────────

describe('⑦ the reply branch works for any sequence length', () => {
  it('🛑 the length is read from the enrolment, not from a constant', async () => {
    const { sequenceTotalFor } = await import('./figsy')
    const step = (n: number) => ({ subject: `s${n}`, body: `b${n}`, wait_days: n })
    expect(sequenceTotalFor({ steps: [step(1), step(2), step(3)] })).toBe(3)
    expect(sequenceTotalFor({ steps: [step(1), step(2), step(3), step(4), step(5)] })).toBe(5)
    expect(sequenceTotalFor({ steps: Array.from({ length: 7 }, (_, i) => step(i + 1)) })).toBe(7)
    expect(sequenceTotalFor({ total_steps: 5 })).toBe(5)
    // 3 is the LEGACY fallback only: an enrolment written before either column existed
    // genuinely had three steps, which is what `enrollmentStep` still returns for it.
    expect(sequenceTotalFor({})).toBe(3)
  })

  it('🛑 a 5-step sequence does not complete after step 3', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    // ⚠️ JSDoc LINES TOO — the comment explaining the fix quotes the defective literal.
    const FIG = readFileSync(join(__dirname, './figsy.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    expect(FIG, 'the hardcoded three-step reply branch is back').not.toContain('if (skipped >= 3)')
    expect(FIG).toContain('const total = sequenceTotalFor(enrollment)')
    expect(FIG).toContain('if (skipped >= total) {')
    expect(FIG).toContain("? (enrollment.steps as Array<{ wait_days?: number }>)[skipped - 1]?.wait_days")
  })
})
