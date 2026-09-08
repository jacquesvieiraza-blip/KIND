// ═══════════════════════════════════════════════════════════════════════════════════════
// WHEN OUTBOUND MAY LEAVE — in the recipient's ACTUAL local time, or not at all.
//
// 🛑 THERE WAS NO SCHEDULE ANYWHERE. `getDay`, `getHours`, "business hours" and "send window"
// appear nowhere in the send path, so the product was ready to cold-email founders at 03:00 on
// a Sunday. A mailbox reputation, once burned, is not something a later fix gives back.
//
// 🛑 AND THE FIRST FIX WAS WRONG IN THE SAME FAMILY (corrected 8 Sep, founder-caught). It mapped
// `United States → America/New_York` and called the result "recipient-local". It is not:
//
//     08:30 New York  =  05:30 Los Angeles
//
// A West Coast founder would have been cold-emailed at half past five in the morning, by a
// guard whose whole purpose is to stop exactly that — and the log would have said the send was
// inside an 08:30 window. **A guess dressed as a fact is worse than an admitted unknown**, and
// this file previously produced one.
//
// ── THE RESOLUTION HIERARCHY (founder-locked) ───────────────────────────────────────────
//
//   ① an exact persisted IANA timezone on the lead            → judge in it
//   ② a state/region precise enough to resolve one            → judge in the resolved zone
//   ③ a country whose zone SET we know                        → require the window to be open
//                                                               in EVERY zone of that set
//   ④ anything else                                           → FAIL CLOSED
//
// ⚠️ TIER ③ IS AN INTERSECTION, AND THAT IS WHAT MAKES IT SAFE RATHER THAN CONVENIENT. For an
// American lead whose state we do not hold, "allowed" means allowed in Hawaii AND Alaska AND
// Pacific AND Mountain AND Central AND Eastern simultaneously. The window therefore opens when
// it is 08:30 in the WESTERNMOST zone and closes when it is 17:00 in the EASTERNMOST — so no
// recipient anywhere in the set can receive a message before their own 08:30. It costs volume
// (roughly two and a half hours a day for the US) and it cannot produce an early-hours send.
//
// ⚠️ AND `default_tz` NO LONGER GRANTS ANYTHING. Falling back to the programme's home zone for
// an unknown recipient is the same defect as assuming New York: it makes the window mean
// something true about US rather than about them. Unknown is refused.
//
// ⚠️ DST IS NOT MODELLED HERE, AND MUST NOT BE. `Intl.DateTimeFormat` with a real IANA zone
// applies the rules for the actual instant, so London is GMT in January and BST in July without
// a line of code. A hand-rolled offset table is how a schedule silently drifts by an hour twice
// a year — `America/Phoenix` is in the set below precisely because it does NOT observe DST.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The stored shape of `programmes.send_schedule`. */
export interface SendSchedule {
  /** ISO weekdays: 1 = Monday … 7 = Sunday. */
  days: number[]
  /** "HH:MM", inclusive. */
  start: string
  /** "HH:MM", exclusive — a window ending "17:00" does not send at 17:00. */
  end: string
  /**
   * The programme's home zone. Kept for display and for the operator's own reading of the
   * schedule — it is NOT consulted by the decision, because judging a recipient in our timezone
   * is the defect this file was corrected for.
   */
  default_tz: string
}

/** Everything we might know about where the recipient is. All optional; all may be absent. */
export interface RecipientLocation {
  /** ① An exact IANA zone persisted on the lead. Nothing writes one today — see the note in D. */
  timezone?: string | null
  /** ② A state, province or region. Nothing writes one today — the Apollo reveal carries it. */
  region?: string | null
  /** ③ The country, which IS persisted (`leads.country`). */
  country?: string | null
}

export type ScheduleVerdict =
  | { allowed: true; zones: string[]; precision: 'exact' | 'region' | 'country_set' }
  | {
      allowed: false
      reason: 'no_schedule' | 'wrong_day' | 'outside_window' | 'unknown_timezone' | 'unreadable'
      detail: string
    }

// ── THE ZONE TABLES ─────────────────────────────────────────────────────────────────────
//
// Deliberately small: the two geographies House sells into, plus Ireland because an Irish lead
// on a UK-targeted list is an ordinary mistake and Dublin is a real, different zone.

/** ② state/region → zone. Compact on purpose; extended only when the data starts arriving. */
const REGION_ZONES: Record<string, string> = {
  // Pacific
  ca: 'America/Los_Angeles', california: 'America/Los_Angeles',
  wa: 'America/Los_Angeles', washington: 'America/Los_Angeles',
  or: 'America/Los_Angeles', oregon: 'America/Los_Angeles',
  nv: 'America/Los_Angeles', nevada: 'America/Los_Angeles',
  // Mountain (Arizona is its own: no DST)
  az: 'America/Phoenix', arizona: 'America/Phoenix',
  co: 'America/Denver', colorado: 'America/Denver',
  ut: 'America/Denver', utah: 'America/Denver',
  nm: 'America/Denver', 'new mexico': 'America/Denver',
  mt: 'America/Denver', montana: 'America/Denver',
  id: 'America/Denver', idaho: 'America/Denver',
  wy: 'America/Denver', wyoming: 'America/Denver',
  // Central
  tx: 'America/Chicago', texas: 'America/Chicago',
  il: 'America/Chicago', illinois: 'America/Chicago',
  mn: 'America/Chicago', minnesota: 'America/Chicago',
  mo: 'America/Chicago', missouri: 'America/Chicago',
  wi: 'America/Chicago', wisconsin: 'America/Chicago',
  la: 'America/Chicago', louisiana: 'America/Chicago',
  ok: 'America/Chicago', oklahoma: 'America/Chicago',
  ar: 'America/Chicago', arkansas: 'America/Chicago',
  ia: 'America/Chicago', iowa: 'America/Chicago',
  ks: 'America/Chicago', kansas: 'America/Chicago',
  ne: 'America/Chicago', nebraska: 'America/Chicago',
  al: 'America/Chicago', alabama: 'America/Chicago',
  ms: 'America/Chicago', mississippi: 'America/Chicago',
  tn: 'America/Chicago', tennessee: 'America/Chicago',
  // Eastern
  ny: 'America/New_York', 'new york': 'America/New_York',
  ma: 'America/New_York', massachusetts: 'America/New_York',
  nj: 'America/New_York', 'new jersey': 'America/New_York',
  pa: 'America/New_York', pennsylvania: 'America/New_York',
  fl: 'America/New_York', florida: 'America/New_York',
  ga: 'America/New_York', georgia: 'America/New_York',
  nc: 'America/New_York', 'north carolina': 'America/New_York',
  sc: 'America/New_York', 'south carolina': 'America/New_York',
  va: 'America/New_York', virginia: 'America/New_York',
  md: 'America/New_York', maryland: 'America/New_York',
  dc: 'America/New_York', 'washington dc': 'America/New_York',
  oh: 'America/New_York', ohio: 'America/New_York',
  mi: 'America/New_York', michigan: 'America/New_York',
  ct: 'America/New_York', connecticut: 'America/New_York',
  me: 'America/New_York', maine: 'America/New_York',
  // Outside the lower 48 — named so they resolve EXACTLY when we do know them, rather than
  // only ever widening the American intersection.
  ak: 'America/Anchorage', alaska: 'America/Anchorage',
  hi: 'Pacific/Honolulu', hawaii: 'Pacific/Honolulu',
}

/**
 * ③ country → EVERY zone a recipient there might be in.
 *
 * ⚠️ THE AMERICAN SET INCLUDES ALASKA AND HAWAII. They are unlikely in the House ICP and they
 * are not impossible, and the cost of including them is throughput while the cost of omitting
 * them is a 05:30 send to somebody we cannot place. The founder can narrow this to the lower 48
 * as a deliberate decision; it must not be narrowed by an oversight.
 */
const COUNTRY_ZONE_SETS: Record<string, string[]> = {
  'united kingdom': ['Europe/London'], uk: ['Europe/London'], gb: ['Europe/London'],
  'great britain': ['Europe/London'], england: ['Europe/London'], scotland: ['Europe/London'],
  wales: ['Europe/London'], 'northern ireland': ['Europe/London'],
  ireland: ['Europe/Dublin'],
  'united states': US_ZONES(), usa: US_ZONES(), us: US_ZONES(),
  'united states of america': US_ZONES(),
}
function US_ZONES(): string[] {
  return ['Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles',
          'America/Phoenix', 'America/Denver', 'America/Chicago', 'America/New_York']
}

const norm = (v: string | null | undefined) =>
  typeof v === 'string' ? v.trim().toLowerCase() : ''

export type ZoneResolution =
  | { ok: true; zones: string[]; precision: 'exact' | 'region' | 'country_set' }
  | { ok: false; detail: string }

/**
 * Which zone(s) this recipient must be judged in.
 *
 * ⚠️ NEVER RETURNS A GUESS. Where the answer is a SET, the caller must satisfy every member of
 * it; where there is no answer, the caller must refuse. There is no third outcome in which we
 * pick something plausible.
 */
export function resolveRecipientZones(loc: RecipientLocation | null | undefined): ZoneResolution {
  // ① an exact zone, validated by actually using it rather than by pattern-matching a string.
  const tz = norm(loc?.timezone)
  if (tz) {
    const raw = String(loc?.timezone).trim()
    if (isUsableZone(raw)) return { ok: true, zones: [raw], precision: 'exact' }
    return { ok: false, detail: `The timezone recorded for this recipient ("${raw}") is not a usable IANA zone, so their local time cannot be established.` }
  }

  // ② a region we can resolve deterministically.
  const region = norm(loc?.region)
  if (region && REGION_ZONES[region]) {
    return { ok: true, zones: [REGION_ZONES[region]], precision: 'region' }
  }

  // ③ a country whose zone set we know — satisfied only when EVERY zone allows.
  const country = norm(loc?.country)
  const set = country ? COUNTRY_ZONE_SETS[country] : undefined
  if (set && set.length > 0) {
    return { ok: true, zones: set, precision: set.length === 1 ? 'exact' : 'country_set' }
  }

  // ④ fail closed.
  return {
    ok: false,
    detail: country
      ? `No timezone is recorded for this recipient and "${loc?.country}" is not a country whose zones are mapped, so their local time cannot be established.`
      : 'No country, region or timezone is recorded for this recipient, so their local time cannot be established.',
  }
}

/** Is this a zone `Intl` will actually accept? Proved by using it, not by a regex. */
function isUsableZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit' }).format(new Date())
    return true
  } catch { return false }
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

/**
 * Minutes since local midnight, and the ISO weekday, for `at` in `zone`.
 *
 * ⚠️ DST COMES FREE AND MUST. `Intl` applies the zone's real rules for the real instant, so
 * London is GMT in January and BST in July with no branch here. A hand-rolled offset is how a
 * schedule silently moves by an hour twice a year.
 */
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
    return null
  }
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))

/**
 * May a message to this recipient leave right now?
 *
 * PURE. The schedule, the clock and everything known about the recipient are all passed in, so
 * every branch is provable without a database, a timer or a network.
 */
export function maySendNow(
  schedule: unknown,
  at: Date,
  recipient: RecipientLocation | string | null | undefined,
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

  const start = toMinutes(schedule.start)
  const end = toMinutes(schedule.end)
  // ⚠️ NO OVERNIGHT WRAP. A window that crossed midnight would be a different product decision
  // (and a nasty one for cold outreach); an inverted pair is malformed, never reinterpreted.
  if (end <= start) {
    return {
      allowed: false, reason: 'unreadable',
      detail: `This programme's send window ends (${schedule.end}) at or before it starts (${schedule.start}), so it describes no time at all.`,
    }
  }

  // A bare country string is still accepted, so no caller has to be rewritten to keep working.
  const loc: RecipientLocation | null =
    typeof recipient === 'string' ? { country: recipient } : (recipient ?? null)

  const zones = resolveRecipientZones(loc)
  if (!zones.ok) {
    return { allowed: false, reason: 'unknown_timezone', detail: `${zones.detail} Nothing may be sent to them until it can.` }
  }

  const names = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  // 🛑 EVERY ZONE MUST ALLOW. For a one-zone answer this is an exact judgement; for a country
  // set it is the intersection, which is what makes an unplaced American recipient safe: the
  // window opens at 08:30 in the westernmost zone and closes at 17:00 in the easternmost.
  for (const zone of zones.zones) {
    const local = localParts(at, zone)
    if (!local) {
      return {
        allowed: false, reason: 'unreadable',
        detail: `The local time for this recipient could not be computed (timezone "${zone}"), so nothing may leave.`,
      }
    }
    if (!schedule.days.includes(local.isoDay)) {
      return {
        allowed: false, reason: 'wrong_day',
        detail: `It is ${names[local.isoDay]} in ${zone}, which is not a sending day for this programme.`,
      }
    }
    if (local.minutes < start || local.minutes >= end) {
      const hh = String(Math.floor(local.minutes / 60)).padStart(2, '0')
      const mm = String(local.minutes % 60).padStart(2, '0')
      return {
        allowed: false, reason: 'outside_window',
        detail: zones.zones.length > 1
          ? `It is ${hh}:${mm} in ${zone}. This recipient's exact timezone is not known, so the window must be open in every zone their country spans (${zones.zones.length} of them) — otherwise somebody there would be emailed before ${schedule.start} their time.`
          : `It is ${hh}:${mm} where this person is (${zone}); this programme sends between ${schedule.start} and ${schedule.end}.`,
      }
    }
  }

  return { allowed: true, zones: zones.zones, precision: zones.precision }
}
