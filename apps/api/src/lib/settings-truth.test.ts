// ⚑ 3 Oct — Milla Settings told two untrue things, seen live on House's Settings page.
//  ① "Paste [a booking link] and we will share this link instead" — replies use the connected
//    Google Calendar only (R189 ⑤ · 11c); a Calendly booking lands nowhere a meeting can be recorded.
//  ② "Approve emails before sending — Available … ask us to switch yours to co-pilot" — every account
//    is on the programme (R137) and its emails are approved by the founder, then the client, before
//    anything sends; Co-Pilot is off after that (R189 ①). A dead switch beside it said "off".
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PAGE = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/settings/page.tsx'), 'utf8')

describe('Milla Settings says what is true', () => {
  it('🛑 the booking-link box no longer promises to share a pasted link with prospects', () => {
    expect(PAGE).not.toContain('Paste it here and we will share this link instead.')
    expect(PAGE).toContain('Replies to your prospects always use your connected Google Calendar')
  })
  it('🛑 approval before sending is stated as built in, with no dead switch', () => {
    expect(PAGE).not.toContain('ask us to switch yours to co-pilot')
    expect(PAGE).not.toContain('aria-label="Approve before send (coming soon)"')
    expect(PAGE).toContain('Every email is approved before anything is sent')
  })
})
