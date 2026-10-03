// 11c (#2556 · R189 ⑤) — THE REPLY CARRIES THE PROSPECT'S OWN BOOKING LINK; NO GO-LIVE WITHOUT A CALENDAR.

import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { calendarConnected, replyBookingClose, CALENDAR_REQUIRED_COPY } from './reply-booking'

beforeEach(() => { process.env.PORTAL_URL = 'https://app.example.com'; process.env.ADMIN_SECRET_KEY = 'test-secret-for-signing-only' })

describe('11c — how a reply closes', () => {
  it('a connected calendar → the prospect\'s own booking link', async () => {
    const close = await replyBookingClose({ client: { calendar_booking_enabled: true, google_calendar_refresh_token: 'r' }, clientId: 'c1', leadId: 'l1', leadCountry: 'GB' })
    expect(close).toMatch(/THEIR OWN booking link/)
    expect(close).toMatch(/https:\/\/app\.example\.com\/book\//)
  })
  it('no connected calendar → concrete times, never a static link', async () => {
    const close = await replyBookingClose({ client: { calendar_booking_enabled: false, google_calendar_refresh_token: null }, clientId: 'c1', leadId: 'l1', leadCountry: 'GB', now: new Date('2026-10-05T09:00:00Z') })
    expect(close).not.toMatch(/\/book\//)
    expect(close === '' || /CONCRETE TIMES/.test(close)).toBe(true)
  })
  it('connected means enabled AND a token', () => {
    expect(calendarConnected({ calendar_booking_enabled: true, google_calendar_refresh_token: null })).toBe(false)
    expect(calendarConnected({ calendar_booking_enabled: true, google_calendar_refresh_token: 'r' })).toBe(true)
  })
})

describe('11c — wired in', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
  it('both reply drafts (Milla and Vida) close through it', () => {
    expect(read('../routes/figsy.ts')).toContain(".filter(Boolean).join('\\n') + bookingClose")
    expect(read('../routes/operator.ts')).toContain('const timeHint = await replyBookingClose({')
  })
  it('Make Live refuses without a connected calendar, before anything is prepared', () => {
    const r = read('../routes/programme.ts')
    const route = r.slice(r.indexOf("programmeRouter.post('/:id/go-live'"))
    const ask = route.indexOf('CALENDAR_REQUIRED_COPY')
    expect(ask).toBeGreaterThan(-1)
    expect(ask).toBeLessThan(route.indexOf('goLiveProgramme(req.params.id'))
    // ⛓️ 3 Oct (review): was /Milla → Settings → Calendar/ — the section is headed "Google Calendar".
    expect(CALENDAR_REQUIRED_COPY).toMatch(/Milla → Settings → Google Calendar/)
  })
  // ⚑ 3 Oct (review N1) — an unreadable programme refuses (it used to skip the check and go live),
  // and an already-live programme's press stays the idempotent success it always was.
  it('an unreadable programme refuses; a live one is not asked again', () => {
    const r = read('../routes/programme.ts')
    const route = r.slice(r.indexOf("programmeRouter.post('/:id/go-live'"), r.indexOf('goLiveProgramme(req.params.id'))
    expect(route).toContain("if (progErr) { res.status(400).json({ success: false, error: `Not taken live: the programme could not be read")
    expect(route).toContain("if (clientId && (prog as { status?: string }).status !== 'LIVE') {")
  })
})
