// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 ② · PR 1c) — A TEST BOOKING BOOKS NOBODY REAL AND COUNTS FOR NOTHING.
//
// The founder built this tool to see a booking land in a CLIENT's own Google Calendar
// ("we need to book in the clients calendar and see"). But it minted the real prospect booking
// link for any real lead: booking through it created a Google event with the REAL prospect as
// attendee and `sendUpdates: 'all'` — the prospect got an invite — and wrote a `public.meetings`
// row attributed to the lead's programme, so a test could be qualified and counted.
//
// Founder ruling (R174): any client, but only against a throwaway test person the tool itself
// creates (`.invalid`, status `passed` so nothing ever sources or enrols them, no programme), and
// the booking never counts: the event lands in the client's calendar with NO attendee invited,
// and no booking row, meeting, outcome event or counter is written.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export const TEST_BOOKING_DOMAIN = 'kind-test.invalid'

export function isTestBookingEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.trim().toLowerCase().endsWith(`@${TEST_BOOKING_DOMAIN}`)
}

export function testBookingEmail(clientId: string): string {
  return `booking-test+${clientId.replace(/[^a-z0-9]/gi, '').slice(0, 12).toLowerCase()}@${TEST_BOOKING_DOMAIN}`
}

/** The client's one test person — found, or created once. Never sourced, never enrolled. */
export async function ensureTestBookingLead(clientId: string): Promise<{ ok: true; leadId: string } | { ok: false; error: string }> {
  const email = testBookingEmail(clientId)
  const { data: found, error: readErr } = await db.from('leads').select('id')
    .eq('client_id', clientId).eq('email', email).maybeSingle()
  if (readErr) return { ok: false, error: readErr.message }
  if (found) return { ok: true, leadId: (found as { id: string }).id }
  const { data: made, error } = await db.from('leads').insert({
    client_id: clientId, email, first_name: 'Booking', last_name: 'Test',
    company: 'K.I.N.D booking test', job_title: 'Test person', status: 'passed',
  }).select('id').single()
  if (error || !made) return { ok: false, error: error?.message ?? 'not created' }
  return { ok: true, leadId: (made as { id: string }).id }
}
