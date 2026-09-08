// ═══════════════════════════════════════════════════════════════════════════════════════
// WHEN OUTBOUND IS ALLOWED TO LEAVE — one canonical guard, respected by every send path.
//
// 🛑 THERE WAS NO SCHEDULE AT ALL. Not a default, not a constant, not a disabled feature:
// `getDay`, `getHours`, "business hours" and "send window" appear nowhere in the send path.
// So the product was ready to cold-email UK founders at 03:00 on a Sunday, which is a
// reputation problem before it is a taste problem — and a mailbox reputation, once burned, is
// not something a later fix gives back.
//
// ⚠️ THIS IS A GUARD, NOT A SCHEDULER. It answers ONE question — *may this message leave right
// now?* — and it schedules nothing, queues nothing and retries nothing. Work that is refused
// stays due and is offered again on the next run, which is the shape the send loop already has
// for every other temporary refusal.
//
// ⚠️ A MISSING SCHEDULE IS A REFUSAL, NOT A PERMIT (for programme work). `send_schedule` is
// NULL for every programme until somebody configures one, and reading that as "no restriction"
// would make the safe-looking default the dangerous one. Legacy clients have no programme and
// are deliberately unaffected — nothing about the live $299 book changes.
//
// ⚠️ AND IT IS EVALUATED IN THE RECIPIENT'S LOCAL TIME. "09:00" means nine in the morning where
// the person reading it lives; House sells into the UK and the US, which are five to eight
// hours apart, so a single UTC window would put half the audience in the middle of the night.
// Where the recipient's country is unknown the programme's `default_tz` is used and the fact
// that it was a fallback is reported, because guessing a timezone silently is how a window
// quietly stops meaning anything.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The stored shape of `programmes.send_schedule`. */
export interface SendSchedule {
  /** ISO weekdays: 1 = Monday … 7 = Sunday. */
  days: number[]
  /** "HH:MM", inclusive. */
  start: string
  /** "HH:MM", exclusive — a window ending "17:00" does not send at 17:00. */
  end: string
  /** IANA zone used when the recipient's own is unknown. */
  default_tz: string
}

export type ScheduleVerdict =
  | { allowed: true; zone: string; fellBackToDefault: boolean }
  | { allowed: false; reason: 'no_schedule' | 'wrong_day' | 'outside_window' | 'unreadable'; detail: string }

/** ISO-3166-ish country → IANA zone, for the two geographies House actually sells into. */
const COUNTRY_ZONES: Record<string, string> = {
  'united kingdom': 'Europe/London', 'uk': 'Europe/London', 'gb': 'Europe/London',
  'great britain': 'Europe/London', 'england': 'Europe/London', 'scotland': 'Europe/London',
  'wales': 'Europe/London', 'northern ireland': 'Europe/London', 'ireland': 'Europe/Dublin',
  // ⚠️ THE UNITED STATES IS FOUR ZONES AND WE DO NOT STORE WHICH. New York is the LATEST
  // morning of the four, so a window judged there has already opened everywhere west of it —
  // the conservative direction. A state-level mapping is post-launch.
  'united states': 'America/New_York', 'usa': 'America/New_York', 'us': 'America/New_York',
  'united states of america': 'America/New_York',
}

/** The IANA zone to judge this recipient in, and whether it is a fallback. */
export function zoneForRecipient(country: string | null | undefined, defaultTz: string): { zone: string; fellBack: boolean } {
  const key = typeof country === 'string' ? country.trim().toLowerCase() : ''
  const mapped = key ? COUNTRY_ZONES[key] : undefined
  return mapped ? { zone: mapped, fellBack: false } : { zone: defaultTz, fellBack: true }
}

/** `true` only for a well-formed schedule. A half-written one is not a schedule. */
export function isSendSchedule(v: unknown): v is SendSchedule {
  if (!v || typeof v !== 'object') return false
  const s = v as Record<string, unknown>
  const hhmm = (x: unknown) => typeof x === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x)
  return Array.isArray(s.days)
    && s.days.length > 0
    && s.days.every(d => typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 7)
    && hhmm(s.start) && hhmm(s.end)
    && typeof s.default_tz === 'string' && s.default_tz.trim() !== ''
}

/** Minutes since local midnight, and the ISO weekday, for `at` in `zone`. */
function localParts(at: Date, zone: string): { minutes: number; isoDay: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit',
    })
    const parts = Object.fromEntries(fmt.formatToParts(at).map(p => [p.type, p.value]))
    const days: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
    const isoDay = days[String(parts.weekday)]
    const hour = Number(parts.hour)
    const minute = Number(parts.minute)
    if (!isoDay || !Number.isFinite(hour) || !Number.isFinite(minute)) return null
    // `en-GB` renders midnight as "24" in some ICU builds. 24:xx is 00:xx.
    return { minutes: (hour % 24) * 60 + minute, isoDay }
  } catch {
    // An invalid IANA zone throws here. That is unreadable, not permission.
    return null
  }
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/**
 * May a message to this recipient leave right now?
 *
 * PURE. Every input is passed in — the schedule, the clock and the recipient's country — so
 * every branch is provable without a database, a timer or a network.
 */
export function maySendNow(
  schedule: unknown,
  at: Date,
  recipientCountry: string | null | undefined,
): ScheduleVerdict {
  if (schedule === null || schedule === undefined) {
    return {
      allowed: false, reason: 'no_schedule',
      detail: 'No send schedule is configured for this programme, so nothing may leave. A missing schedule is not permission to send at any hour.',
    }
  }
  if (!isSendSchedule(schedule)) {
    return {
      allowed: false, reason: 'unreadable',
      detail: 'This programme\'s send schedule could not be read (it is malformed), so nothing may leave until it is corrected.',
    }
  }

  const { zone, fellBack } = zoneForRecipient(recipientCountry, schedule.default_tz)
  const local = localParts(at, zone)
  if (!local) {
    return {
      allowed: false, reason: 'unreadable',
      detail: `The local time for this recipient could not be computed (timezone "${zone}"), so nothing may leave.`,
    }
  }

  if (!schedule.days.includes(local.isoDay)) {
    const names = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    return {
      allowed: false, reason: 'wrong_day',
      detail: `It is ${names[local.isoDay]} where this person is (${zone}), which is not a sending day for this programme.`,
    }
  }

  const start = toMinutes(schedule.start)
  const end = toMinutes(schedule.end)
  // ⚠️ START INCLUSIVE, END EXCLUSIVE, AND NO OVERNIGHT WRAP. A window that crossed midnight
  // would be a different product decision (and a nasty one for cold outreach); an inverted
  // pair is treated as malformed rather than silently reinterpreted.
  if (end <= start) {
    return {
      allowed: false, reason: 'unreadable',
      detail: `This programme's send window ends (${schedule.end}) at or before it starts (${schedule.start}), so it describes no time at all.`,
    }
  }
  if (local.minutes < start || local.minutes >= end) {
    const hh = String(Math.floor(local.minutes / 60)).padStart(2, '0')
    const mm = String(local.minutes % 60).padStart(2, '0')
    return {
      allowed: false, reason: 'outside_window',
      detail: `It is ${hh}:${mm} where this person is (${zone}); this programme sends between ${schedule.start} and ${schedule.end}.`,
    }
  }

  return { allowed: true, zone, fellBackToDefault: fellBack }
}
