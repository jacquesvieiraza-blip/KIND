// "NO CALENDAR → SUGGEST TIMES" (flow v2, step 8 — founder-locked 25 Jul).
//
// Today the only way to book is a link, so a client with no calendar connected simply
// cannot be booked into — the prospect says yes and the thread stalls on logistics. This
// is the fallback: we offer three concrete times in the PROSPECT's working day and the
// client confirms one. Three, because a list of ten reads as an admin task and one reads
// as a demand.
//
// Pure and DB-free so the times are testable. No new dependency: offsets are computed
// from a hand-kept table of the countries we actually sell into, and an unknown country
// falls back to the client's own timezone rather than guessing wrong — a 9am suggestion
// that lands at 3am is worse than no suggestion at all.

/** Minutes offset from UTC. Deliberately small and explicit — the markets we sell into. */
const TZ_OFFSETS: Record<string, number> = {
  'south africa': 120, 'za': 120,
  'nigeria': 60, 'ng': 60,
  'kenya': 180, 'ke': 180,
  'united kingdom': 60, 'uk': 60, 'gb': 60, 'england': 60,   // BST — see the note below
  'ireland': 60, 'ie': 60,
  'united states': -300, 'usa': -300, 'us': -300,            // ET
  'canada': -300, 'ca': -300,
  'australia': 600, 'au': 600,
  'united arab emirates': 240, 'uae': 240, 'ae': 240,
  'germany': 120, 'de': 120, 'france': 120, 'fr': 120,
  'netherlands': 120, 'nl': 120, 'spain': 120, 'es': 120,
}

/** Hours of the prospect's day we will ever suggest. Never before 9, never after 4pm. */
export const SLOT_HOURS = [10, 14, 16]

export function offsetMinutesFor(country: string | null | undefined): number | null {
  if (!country) return null
  const key = country.trim().toLowerCase()
  if (key in TZ_OFFSETS) return TZ_OFFSETS[key]
  // "Cape Town, South Africa" — match on the tail rather than failing the whole lookup.
  for (const [name, off] of Object.entries(TZ_OFFSETS)) {
    if (name.length > 3 && key.includes(name)) return off
  }
  return null
}

export type Slot = { startsAtUtc: string; label: string }

/**
 * Three suggestions in the prospect's working day, starting from the next working day.
 *
 * Weekends are skipped — a Saturday 10am suggestion tells a prospect we weren't paying
 * attention. `from` is passed in rather than read from the clock so this is deterministic.
 */
export function suggestSlots(from: Date, country: string | null | undefined, count = 3): Slot[] {
  const offset = offsetMinutesFor(country)
  // Unknown country → we do not invent a timezone. The caller falls back to a booking link.
  if (offset === null) return []

  const slots: Slot[] = []
  // Walk forward day by day, taking one slot per day so the three aren't stacked on one
  // afternoon — a prospect with a busy Tuesday still has two other options.
  let dayCursor = 1
  while (slots.length < count && dayCursor <= 10) {
    const localMidnightUtc = new Date(from.getTime())
    localMidnightUtc.setUTCDate(localMidnightUtc.getUTCDate() + dayCursor)
    localMidnightUtc.setUTCHours(0, 0, 0, 0)

    // Which weekday is it where the PROSPECT is?
    const localDay = new Date(localMidnightUtc.getTime() + offset * 60_000).getUTCDay()
    if (localDay === 0 || localDay === 6) { dayCursor++; continue }

    const hour = SLOT_HOURS[slots.length % SLOT_HOURS.length]
    const startUtc = new Date(localMidnightUtc.getTime() + (hour * 60 - offset) * 60_000)
    slots.push({ startsAtUtc: startUtc.toISOString(), label: labelFor(startUtc, offset, hour) })
    dayCursor++
  }
  return slots
}

function labelFor(startUtc: Date, offsetMinutes: number, localHour: number): string {
  const local = new Date(startUtc.getTime() + offsetMinutes * 60_000)
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const suffix = localHour >= 12 ? 'pm' : 'am'
  const h12 = localHour > 12 ? localHour - 12 : localHour
  return `${days[local.getUTCDay()]} ${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]}, ${h12}${suffix} their time`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The line we actually put in the reply. Empty when we have no honest suggestion to make. */
export function suggestionSentence(slots: Slot[]): string {
  if (slots.length === 0) return ''
  const list = slots.map(s => s.label.replace(' their time', '')).join(', or ')
  return `Happy to work around you — ${list} all work on our side. Say which suits and I'll send the invite.`
}

// NOTE ON DST: these offsets are standard-time-plus-summer for the northern markets as at
// July. They are approximate by design — a suggestion an hour out is a conversation, not a
// broken booking, and the client confirms the time before anything is committed. If this
// ever books directly into a calendar, replace the table with real tz data first.
