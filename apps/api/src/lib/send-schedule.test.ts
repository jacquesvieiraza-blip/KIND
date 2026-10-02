// ═══════════════════════════════════════════════════════════════════════════════════════
// ⛓️ 2 Oct (R185 ① · #2545): PROGRAMME EMAILS GO AT ANY HOUR, TO ANY ZONE, MONDAY TO FRIDAY (UK
// DAYS) — the recipient-local window below is retired. *History below unchanged.*
//
// ~~RECIPIENT-LOCAL MEANS RECIPIENT-LOCAL~~, AND THE STEP COUNT COMES FROM THE WORK.
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

/** The stored House default — still part of the approval record; its hours no longer decide (R185 ①). */
const SCHEDULE: SendSchedule = {
  days: [1, 2, 3, 4, 5], start: '08:30', end: '17:00', default_tz: 'Europe/London',
}

const utc = (iso: string) => new Date(iso)
/** 2026-09-09 is a Wednesday. September: London BST (+1), New York EDT (−4), LA PDT (−7). */
const WED = '2026-09-09'

// ── ⛓️ 2 Oct (R185 ① · #2545) — THE RECIPIENT-LOCAL WINDOW IS RETIRED ────────────────
//
// The founder: *"we need to send no matter the time of day or zone. when the campaign is hit go.
// we go. simple. we dont align in time zones."* · *"Only on weekdays."* ~~Sections ①–⑥ below held
// the 08:30–17:00 recipient-local window: the 05:30-Pacific refusal, the US intersection, DST
// per recipient, refusing an unknown location and refusing a missing schedule.~~ The window cost
// House all but one run a day and could never send to South Africa, so the founder retired it.
// What the guard now holds is one rule — Monday to Friday in London, any hour, any zone — and
// these are the same instants, re-asserted under it.

describe('① any hour, any zone: the instants the old window refused now send on a weekday', () => {
  it('🛑 12:30 UTC on a Wednesday (05:30 in Los Angeles) sends to an unplaced American', () => {
    const v = maySendNow(SCHEDULE, utc(`${WED}T12:30:00Z`), { country: 'United States' })
    expect(v.allowed).toBe(true)
    expect(v.allowed && v.precision).toBe('uk_day')
  })

  it('early, late and overnight hours all send on a weekday, for any recipient', () => {
    for (const hhmm of ['00:05', '05:30', '07:29', '16:00', '21:00', '23:55']) {
      expect(maySendNow(SCHEDULE, utc(`${WED}T${hhmm}:00Z`), { region: 'NY' }).allowed, hhmm).toBe(true)
      expect(maySendNow(SCHEDULE, utc(`${WED}T${hhmm}:00Z`), { country: 'United Kingdom' }).allowed, hhmm).toBe(true)
    }
  })

  it('🛑 a location we cannot place is no longer a refusal — an unmapped country, a bad zone, or nothing at all', () => {
    expect(maySendNow(SCHEDULE, utc(`${WED}T10:00:00Z`), { country: 'Sweden' }).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc(`${WED}T10:00:00Z`), { country: 'South Africa' }).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc(`${WED}T10:00:00Z`), { timezone: 'Not/AZone', country: 'United Kingdom' }).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc(`${WED}T10:00:00Z`), null).allowed).toBe(true)
  })
})

// ── ② WEEKENDS — THE ONE REFUSAL THAT REMAINS ────────────────────────────────────────

describe('② Monday to Friday, in the UK week', () => {
  it('🛑 Saturday and Sunday refuse', () => {
    for (const iso of ['2026-09-12T10:00:00Z', '2026-09-13T10:00:00Z']) {
      const v = maySendNow(SCHEDULE, utc(iso), { country: 'United Kingdom' })
      expect(v.allowed, iso).toBe(false)
      expect(v.allowed === false && v.reason).toBe('wrong_day')
      expect(v.allowed === false && v.detail).toContain('Monday to Friday')
    }
  })

  it('Monday and Friday are sending days', () => {
    expect(maySendNow(SCHEDULE, utc('2026-09-07T10:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc('2026-09-11T10:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(true)
  })

  it('🛑 and the DAY is the UK\'s, not the recipient\'s', () => {
    // 02:00 UTC Saturday is still Friday evening in New York — but Saturday in London: no send.
    expect(maySendNow(SCHEDULE, utc('2026-09-12T02:00:00Z'), { region: 'NY' }).allowed).toBe(false)
    // 22:00 UTC Sunday is already Monday in Sydney — but Sunday in London: no send.
    expect(maySendNow(SCHEDULE, utc('2026-09-13T22:00:00Z'), { country: 'Australia' }).allowed).toBe(false)
  })
})

// ── ③ DST — THE UK DAY MOVES WITH LONDON'S CLOCK, NEVER BY A TABLE WE MAINTAIN ──────

describe('③ daylight saving is applied by the zone', () => {
  it('🛑 Friday 23:30 UTC is Saturday in a London summer (no send) and still Friday in winter (send)', () => {
    expect(maySendNow(SCHEDULE, utc('2026-07-10T23:30:00Z'), { country: 'United States' }).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc('2026-01-09T23:30:00Z'), { country: 'United States' }).allowed).toBe(true)
  })
})

// ── ④ THE RESOLUTION HIERARCHY STILL ANSWERS "WHICH ZONE" — IT NO LONGER DECIDES A SEND ─

describe('④ resolveRecipientZones is unchanged, and no longer consulted by the send guard', () => {
  it('the hierarchy is exact → region → country set, in that order', () => {
    expect(resolveRecipientZones({ timezone: 'America/Los_Angeles', region: 'NY', country: 'United States' }))
      .toEqual({ ok: true, zones: ['America/Los_Angeles'], precision: 'exact' })
    expect(resolveRecipientZones({ region: 'Texas', country: 'United States' }))
      .toEqual({ ok: true, zones: ['America/Chicago'], precision: 'region' })
    const set = resolveRecipientZones({ country: 'United States' })
    expect(set.ok && set.precision).toBe('country_set')
    expect(resolveRecipientZones({ country: 'United Kingdom' }))
      .toEqual({ ok: true, zones: ['Europe/London'], precision: 'exact' })
    expect(resolveRecipientZones({ region: 'AZ' }).ok && resolveRecipientZones({ region: 'AZ' })).toMatchObject({ zones: ['America/Phoenix'] })
  })
})

// ── ⑤ THE STORED SCHEDULE IS LEFT AS APPROVED — AND DOES NOT DECIDE ──────────────────

describe('⑤ the stored schedule stays exactly as approved, and its hours no longer decide', () => {
  it('🛑 a missing or half-written schedule no longer blocks a live programme on a weekday', () => {
    expect(maySendNow(null, utc(`${WED}T10:00:00Z`), { country: 'United Kingdom' }).allowed).toBe(true)
    expect(maySendNow({ ...SCHEDULE, start: '17:00', end: '09:00' }, utc(`${WED}T10:00:00Z`), null).allowed).toBe(true)
  })

  it('isSendSchedule still recognises a well-formed schedule (readiness reads it before approval)', () => {
    for (const bad of [{}, { days: [] }, { days: [1], start: '9am', end: '17:00', default_tz: 'Europe/London' },
                       { days: [1], start: '08:30', end: '17:00' },
                       { days: [0], start: '08:30', end: '17:00', default_tz: 'Europe/London' },
                       { days: [8], start: '08:30', end: '17:00', default_tz: 'Europe/London' }]) {
      expect(isSendSchedule(bad), JSON.stringify(bad)).toBe(false)
    }
    expect(isSendSchedule(SCHEDULE)).toBe(true)
  })
})

// ── ⑥ RUN AND RETRY CANNOT OUTLAST THE WEEKEND ───────────────────────────────────────

describe('⑥ the verdict is taken at the moment of the attempt', () => {
  it('🛑 work refused on Saturday is refused again five minutes later, and allowed on Monday', () => {
    expect(maySendNow(SCHEDULE, utc('2026-09-12T18:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc('2026-09-12T18:05:00Z'), { country: 'United Kingdom' }).allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc('2026-09-14T00:30:00Z'), { country: 'United Kingdom' }).allowed).toBe(true)
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
    expect(gate, 'the weekday verdict is computed and then ignored').toContain('if (!when.allowed) {')
    // ⚠️ DEFAULT-ON. Forgetting the flag yields the enforced answer; only an explicit
    // `enforceSchedule: false` opts out, and campaign activation is the one caller that does.
    expect(AUTH).toContain("if (ctx?.enforceSchedule !== false) {")
    const START = readFileSync(join(__dirname, './start-work.ts'), 'utf8')
    expect(START).toContain('{ enforceSchedule: false }')
    // And the recipient's location is still threaded in precision order (it no longer decides).
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
