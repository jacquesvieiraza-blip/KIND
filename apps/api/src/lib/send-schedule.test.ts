// ═══════════════════════════════════════════════════════════════════════════════════════
// WHEN OUTBOUND MAY LEAVE — and the configurable step count that goes with it.
//
// 🛑 THERE WAS NO SCHEDULE ANYWHERE. `getDay`, `getHours`, "business hours" and "send window"
// appear nowhere in the send path, so the product was ready to cold-email UK founders at 03:00
// on a Sunday. A mailbox reputation, once burned, is not something a later fix gives back.
//
// 🛑 AND THE REPLY BRANCH HARDCODED THREE STEPS. `if (skipped >= 3)` came from the legacy
// three-column era and was never a product decision. On a 5-step sequence a `skip_next` at
// step 2 marked the enrolment COMPLETED — steps 4 and 5 silently never sent, to a prospect who
// had just replied. It is not replaced by a hardcoded 5: the length is read from the work.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

import { maySendNow, isSendSchedule, zoneForRecipient, type SendSchedule } from './send-schedule'

/** Tue–Thu, 08:30–17:00, London by default — the shape the House preview proposes. */
const SCHEDULE: SendSchedule = { days: [2, 3, 4], start: '08:30', end: '17:00', default_tz: 'Europe/London' }

/** 2026-09-09 is a Wednesday. Times are UTC; September is BST (+1) in London. */
const utc = (iso: string) => new Date(iso)

describe('① a missing or malformed schedule REFUSES', () => {
  it('🛑 null is not permission — a missing schedule is not "no restriction"', () => {
    const v = maySendNow(null, utc('2026-09-09T10:00:00Z'), 'United Kingdom')
    expect(v.allowed).toBe(false)
    expect(v.allowed === false && v.reason).toBe('no_schedule')
  })

  it('🛑 a half-written schedule is unreadable, not a permissive one', () => {
    for (const bad of [{}, { days: [] }, { days: [1], start: '9am', end: '17:00', default_tz: 'Europe/London' },
                       { days: [1], start: '08:30', end: '17:00' }, { days: [0], start: '08:30', end: '17:00', default_tz: 'Europe/London' },
                       { days: [8], start: '08:30', end: '17:00', default_tz: 'Europe/London' }]) {
      expect(isSendSchedule(bad), JSON.stringify(bad)).toBe(false)
      expect(maySendNow(bad, utc('2026-09-09T10:00:00Z'), 'United Kingdom').allowed).toBe(false)
    }
  })

  it('a well-formed one is recognised', () => {
    expect(isSendSchedule(SCHEDULE)).toBe(true)
  })

  it('🛑 a window that ends at or before it starts describes no time at all', () => {
    const v = maySendNow({ ...SCHEDULE, start: '17:00', end: '09:00' }, utc('2026-09-09T10:00:00Z'), 'United Kingdom')
    expect(v.allowed).toBe(false)
    expect(v.allowed === false && v.reason).toBe('unreadable')
  })
})

describe('② the day and the window, in the RECIPIENT\'s local time', () => {
  it('inside the window on a sending day → allowed', () => {
    // 10:00 UTC = 11:00 London (BST), a Wednesday.
    const v = maySendNow(SCHEDULE, utc('2026-09-09T10:00:00Z'), 'United Kingdom')
    expect(v.allowed).toBe(true)
    expect(v.allowed && v.zone).toBe('Europe/London')
    expect(v.allowed && v.fellBackToDefault).toBe(false)
  })

  it('🛑 13 · the WRONG DAY refuses — Monday is not in Tue–Thu', () => {
    const v = maySendNow(SCHEDULE, utc('2026-09-07T10:00:00Z'), 'United Kingdom')   // Monday
    expect(v.allowed).toBe(false)
    expect(v.allowed === false && v.reason).toBe('wrong_day')
  })

  it('🛑 the weekend refuses', () => {
    expect(maySendNow(SCHEDULE, utc('2026-09-12T10:00:00Z'), 'United Kingdom').allowed).toBe(false)   // Sat
    expect(maySendNow(SCHEDULE, utc('2026-09-13T10:00:00Z'), 'United Kingdom').allowed).toBe(false)   // Sun
  })

  it('🛑 14 · OUTSIDE THE WINDOW refuses — 03:00 local is the whole point', () => {
    const v = maySendNow(SCHEDULE, utc('2026-09-09T02:00:00Z'), 'United Kingdom')   // 03:00 London
    expect(v.allowed).toBe(false)
    expect(v.allowed === false && v.reason).toBe('outside_window')
  })

  it('the boundaries: start is inclusive, end is exclusive', () => {
    // 07:30 UTC = 08:30 London exactly.
    expect(maySendNow(SCHEDULE, utc('2026-09-09T07:30:00Z'), 'United Kingdom').allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc('2026-09-09T07:29:00Z'), 'United Kingdom').allowed).toBe(false)
    // 16:00 UTC = 17:00 London exactly — the window has closed.
    expect(maySendNow(SCHEDULE, utc('2026-09-09T16:00:00Z'), 'United Kingdom').allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc('2026-09-09T15:59:00Z'), 'United Kingdom').allowed).toBe(true)
  })

  it('🛑 THE SAME INSTANT IS ALLOWED IN ONE COUNTRY AND REFUSED IN THE OTHER', () => {
    // 13:00 UTC = 14:00 London (inside) and 09:00 New York (inside).
    expect(maySendNow(SCHEDULE, utc('2026-09-09T13:00:00Z'), 'United Kingdom').allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc('2026-09-09T13:00:00Z'), 'United States').allowed).toBe(true)
    // 08:00 UTC = 09:00 London (inside) but 04:00 New York (the middle of the night).
    expect(maySendNow(SCHEDULE, utc('2026-09-09T08:00:00Z'), 'United Kingdom').allowed).toBe(true)
    expect(maySendNow(SCHEDULE, utc('2026-09-09T08:00:00Z'), 'United States').allowed,
      'a single UTC window would cold-email American founders at 4am').toBe(false)
  })

  it('an unknown country falls back to the default zone AND says that it did', () => {
    const v = maySendNow(SCHEDULE, utc('2026-09-09T10:00:00Z'), null)
    expect(v.allowed).toBe(true)
    expect(v.allowed && v.fellBackToDefault, 'a silently guessed timezone is how a window stops meaning anything').toBe(true)
    expect(zoneForRecipient('Sweden', 'Europe/London')).toEqual({ zone: 'Europe/London', fellBack: true })
    expect(zoneForRecipient('GB', 'Europe/London')).toEqual({ zone: 'Europe/London', fellBack: false })
  })

  it('an invalid timezone is unreadable, never permission', () => {
    const v = maySendNow({ ...SCHEDULE, default_tz: 'Not/AZone' }, utc('2026-09-09T10:00:00Z'), null)
    expect(v.allowed).toBe(false)
    expect(v.allowed === false && v.reason).toBe('unreadable')
  })
})

// ── ③ 15 / 16 · A RUN AND A RETRY ARE JUDGED AT THE MOMENT OF THE ATTEMPT ────────────

describe('③ nothing outlasts the window — there is no ticket that says "allowed earlier"', () => {
  it('🛑 16 · the same work refused at 19:00 is refused again five minutes later', () => {
    expect(maySendNow(SCHEDULE, utc('2026-09-09T18:00:00Z'), 'United Kingdom').allowed).toBe(false)
    expect(maySendNow(SCHEDULE, utc('2026-09-09T18:05:00Z'), 'United Kingdom').allowed).toBe(false)
    // …and allowed the next morning, without anybody re-queuing anything.
    expect(maySendNow(SCHEDULE, utc('2026-09-10T08:00:00Z'), 'United Kingdom').allowed).toBe(true)
  })

  it('🛑 15 / 16 · the guard is enforced at the ONE authority door, so Run and retry inherit it', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const AUTH = readFileSync(join(__dirname, './programme-authority.ts'), 'utf8')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    // Every outbound path already reaches `outreachStillMatchesApproval` (the 7-Sep bypass
    // audit made sure of it), so putting the window there means the cron, the operator Run, a
    // retry, the day-1 batch, both provider pushes and LinkedIn all inherit it.
    const at = AUTH.indexOf('async function outreachStillMatchesApproval')
    expect(at).toBeGreaterThan(-1)
    expect(AUTH.slice(at, at + 1200)).toContain('maySendNow(')
    // ⚠️ DEFAULT-ON. Forgetting the flag yields the enforced answer; only an explicit
    // `enforceSchedule: false` opts out, and campaign activation is the one caller that does.
    expect(AUTH).toContain("if (ctx?.enforceSchedule !== false) {")
    const START = readFileSync(join(__dirname, './start-work.ts'), 'utf8')
    expect(START).toContain("{ enforceSchedule: false }")
  })
})

// ── ④ 17 / 18 · THE STEP COUNT COMES FROM THE WORK ───────────────────────────────────

describe('④ the reply branch works for any sequence length', () => {
  it('🛑 18 · the length is read from the enrolment, not from a constant', async () => {
    const { sequenceTotalFor } = await import('./figsy')
    const step = (n: number) => ({ subject: `s${n}`, body: `b${n}`, wait_days: n })
    expect(sequenceTotalFor({ steps: [step(1), step(2), step(3)] })).toBe(3)
    expect(sequenceTotalFor({ steps: [step(1), step(2), step(3), step(4), step(5)] })).toBe(5)
    // Arbitrary supported length — seven is not special, and neither is five.
    expect(sequenceTotalFor({ steps: Array.from({ length: 7 }, (_, i) => step(i + 1)) })).toBe(7)
    // `total_steps` is the fallback when the copy is absent…
    expect(sequenceTotalFor({ total_steps: 5 })).toBe(5)
    // …and 3 is the LEGACY fallback only: an enrolment written before either column existed
    // genuinely had three steps, which is what `enrollmentStep` still returns for it.
    expect(sequenceTotalFor({})).toBe(3)
  })

  it('🛑 17 · a 5-step sequence does not complete after step 3', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    // ⚠️ JSDoc LINES TOO. The explanation of the defect quotes the literal `if (skipped >= 3)`,
    // so a stripper that only removed `//` comments flagged the comment that documents the fix.
    const FIG = readFileSync(join(__dirname, './figsy.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    // The literal that was the defect. `skipped >= 3` completed a 5-step enrolment at step 3,
    // silently dropping steps 4 and 5 for somebody who had just replied.
    expect(FIG, 'the hardcoded three-step reply branch is back').not.toContain('if (skipped >= 3)')
    expect(FIG).toContain('const total = sequenceTotalFor(enrollment)')
    expect(FIG).toContain('if (skipped >= total) {')
    // And the WAIT comes from the enrolment's own step where it has one.
    expect(FIG).toContain("? (enrollment.steps as Array<{ wait_days?: number }>)[skipped - 1]?.wait_days")
  })
})
