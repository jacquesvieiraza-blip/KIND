// ═══════════════════════════════════════════════════════════════════════════════════════
// HOW A REPLY DRAFT CLOSES — WITH THE PROSPECT'S OWN BOOKING LINK (R189 ⑤ · #2556 · 11c).
//
// ⛓️ R189 ⑤ (founder, 2 Oct): "the reply carries the prospect's own booking link; the time they
// pick is booked into the client's connected Google calendar and recorded as a meeting at once
// … the client must connect their calendar before going live".
//
// The prospect's own link is `bookingUrlForLead` with the client's connected calendar: the page
// books into that calendar and records the meeting (`/calendar/public/:token/book`). A client's
// static booking link (Calendly, say) is NOT used in a reply: a time picked there is booked
// nowhere we can see, so no meeting would ever be recorded. Without a connected calendar the
// draft proposes concrete times instead (and Make Live refuses until it is connected).
// ═══════════════════════════════════════════════════════════════════════════════════════

export type BookingClient = { calendar_booking_enabled?: boolean | null; google_calendar_refresh_token?: string | null }

export function calendarConnected(c: BookingClient | null | undefined): boolean {
  return !!c?.calendar_booking_enabled && !!c?.google_calendar_refresh_token
}

/** The closing instruction for a reply draft, or '' when there is nothing safe to offer. */
export async function replyBookingClose(args: {
  client: BookingClient | null; clientId: string; leadId: string | null; leadCountry: string | null; now?: Date
}): Promise<string> {
  if (args.leadId && calendarConnected(args.client)) {
    const { bookingUrlForLead } = await import('./booking-token')
    const url = bookingUrlForLead({ calendar_booking_enabled: true, booking_url: null }, args.leadId, args.clientId)
    if (url) return `\n\nTo agree a time, give them THEIR OWN booking link, exactly as written, on its own line: ${url}`
  }
  const { suggestSlots, suggestionSentence } = await import('./suggest-times')
  const sentence = suggestionSentence(suggestSlots(args.now ?? new Date(), args.leadCountry))
  return sentence ? `\n\nThere is no booking link to give, so CLOSE ON CONCRETE TIMES. Use exactly these, verbatim: "${sentence}"` : ''
}

/** Make Live's sentence when the client's calendar is not connected, or null. */
export const CALENDAR_REQUIRED_COPY =
  "Not taken live: the client's Google calendar is not connected. Prospects book into it from their own booking link (R189). Ask the client to connect it in Milla → Settings → Google Calendar, then press Make live again."
