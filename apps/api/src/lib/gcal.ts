// Google Calendar OAuth2 + API integration — loaded dynamically to avoid
// pulling googleapis into the build graph (it triggers native apt deps on Railway).
//
// ⛓️ CORRECTED 20 Aug. This line used to read *"Re-add googleapis to package.json when Google
// Calendar goes live."* It is already there (`apps/api/package.json` → `googleapis ^173.0.0`),
// and had been for some time. The dynamic `require` below is still deliberate — it keeps the
// package off the BUILD graph — but the dependency itself is not missing.

import { createHash } from 'crypto'
// C-11 (17 Sep) — the Calendar DATA endpoints must be redirectable, because `googleapis`
// takes its endpoint from its OWN client options and never from `fetch`: redirecting
// GOOGLE_API_BASE_URL reached the probe surface but not this runtime path, so a harness could
// look redirected while a real Calendar call left the box. `rootUrl` is the SDK's supported
// injection point — its generated client resolves every URL as `options.rootUrl ||
// 'https://www.googleapis.com/'` — so no URL is hand-built here.
//
// 🛑 THE OAUTH SCOPES BELOW ARE NOT ADDRESSES AND ARE NEVER INTERPOLATED. Google matches them
// exactly; building one from this base URL would silently rewrite consent for every connected
// client the moment the variable is set. The OAuth2 TOKEN exchange is also deliberately NOT
// redirected (it lives in `google-auth-library` and is out of Batch 1b's scope by ruling).
import { googleApiBase } from './provider-hosts'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI  ??
  (process.env.PORTAL_URL ? `${process.env.PORTAL_URL}/calendar/callback` : 'http://localhost:3000/calendar/callback')

// ── WHAT WE ASK A CLIENT FOR, AND WHY EACH ONE ─────────────────────────────────────────────
//
// ⛓️ NARROWED 20 Aug. This list used to carry `calendar.readonly`, which grants read access to
// the CONTENT of every event on the client's calendar — titles, attendees, notes. We never read
// an event body. It was requested for exactly one line: `calendars.get` in `getPrimaryTimeZone`
// below, to learn which timezone to draw business hours in.
//
// ⚠️ AND DROPPING IT OUTRIGHT WOULD HAVE FAILED SILENTLY, which is why the answer was to narrow
// rather than delete. `getPrimaryTimeZone` swallows its error and returns 'UTC', so a missing
// scope produces no error anywhere — just business hours computed in the wrong zone. For a US
// Pacific client, 9–17 UTC is 02:00–10:00 local: the exact "3am slots" failure the comment on
// `zonedWeekdayHour` warns about, arriving quietly.
//
// Every scope below is load-bearing, checked against Google's own per-method scope declarations
// (`googleapis` typings, v173) and pinned by `gcal-scopes.test.ts`:
//
//   calendar.events             → events.insert (create the meeting) + events.get (409 retry)
//   calendar.freebusy           → freebusy.query ×2 (busy TIMES only, never event content)
//   calendar.calendars.readonly → calendars.get, for the timezone and nothing else
//   userinfo.email              → the client's own address, used as an ATTENDEE on the invite;
//                                 without it we cannot invite the client to their own meeting
//
// ⚠️ EXISTING CONNECTIONS ARE UNAFFECTED AND NOTHING BREAKS. A stored token keeps the scopes it
// was issued with, and the old `calendar.readonly` already covers both `calendars.get` and
// `freebusy.query` — so previously-connected clients keep working unchanged. Re-consent is what
// SHRINKS their grant; it is not needed to keep them running. The reduction applies to every
// client who connects or reconnects from here.
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.calendars.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadGoogle(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
  return (require('googleapis') as any).google
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createOAuth2Client(google: any) {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

// #368 — `state` is now an HMAC-signed token minted by the caller (booking-token.ts),
// NOT raw base64(clientId). Google echoes it back verbatim to /callback where it is
// verified. This function just threads it into the consent URL.
export async function getAuthUrl(state: string): Promise<string> {
  const google = await loadGoogle()
  const oauth2Client = createOAuth2Client(google)
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt:      'consent',
    scope:       SCOPES,
    state,
  })
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token:  string
  refresh_token: string
  expiry_date:   number
  email:         string
}> {
  const google = await loadGoogle()
  const oauth2Client = createOAuth2Client(google)
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Google did not return expected tokens.')
  }

  oauth2Client.setCredentials(tokens)
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data: userInfo } = await oauth2.userinfo.get()

  return {
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date:   tokens.expiry_date ?? Date.now() + 3600 * 1000,
    email:         userInfo.email ?? '',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCalendarClient(accessToken: string, refreshToken: string): Promise<any> {
  const google = await loadGoogle()
  const oauth2Client = createOAuth2Client(google)
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
  return oauth2Client
}

// The weekday (0=Sun..6=Sat) and hour (0..23) of an absolute instant AS SEEN in a given
// IANA timezone — via Intl, so no tz library is pulled in. This is how business hours are
// computed in the CLIENT's calendar timezone instead of the server's UTC (a Railway box
// in UTC would otherwise offer a Cape Town client 3am slots).
function zonedWeekdayHour(date: Date, timeZone: string): { weekday: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', hour: 'numeric', hour12: false,
  }).formatToParts(date)
  const wd = parts.find(p => p.type === 'weekday')?.value ?? 'Sun'
  let hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10)
  if (hour === 24) hour = 0 // Intl can emit "24" for midnight in some locales
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { weekday: map[wd] ?? 0, hour }
}

// The calendar's own configured timezone (falls back to UTC). Business hours are drawn
// in this zone so slots land in the client's real working day.
async function getPrimaryTimeZone(calendar: { calendars: { get: (a: unknown) => Promise<{ data?: { timeZone?: string | null } }> } }): Promise<string> {
  try {
    const { data } = await calendar.calendars.get({ calendarId: 'primary' })
    return data?.timeZone ?? 'UTC'
  } catch {
    return 'UTC'
  }
}

export async function getAvailableSlots(
  accessToken: string,
  refreshToken: string,
  daysAhead:   number,
): Promise<Array<{ start: string; end: string }>> {
  const google = await loadGoogle()
  const auth     = await getCalendarClient(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth, rootUrl: googleApiBase() })

  const timeZone = await getPrimaryTimeZone(calendar)

  const timeMin = new Date()
  timeMin.setMinutes(Math.ceil(timeMin.getMinutes() / 30) * 30, 0, 0)
  const timeMax = new Date(timeMin)
  timeMax.setDate(timeMax.getDate() + daysAhead)

  const { data: freeBusy } = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items:   [{ id: 'primary' }],
    },
  })

  const busyIntervals = (freeBusy.calendars?.['primary']?.busy ?? []) as Array<{
    start?: string | null; end?: string | null
  }>
  const busyRanges = busyIntervals
    .filter(b => b.start && b.end)
    .map(b => ({ start: new Date(b.start!).getTime(), end: new Date(b.end!).getTime() }))

  const slots: Array<{ start: string; end: string }> = []
  const cursor = new Date(timeMin)
  while (cursor < timeMax) {
    // Weekday + hour AS SEEN in the calendar's timezone → 9–17 Mon–Fri, local.
    const { weekday, hour } = zonedWeekdayHour(cursor, timeZone)
    if (weekday >= 1 && weekday <= 5 && hour >= 9 && hour < 17) {
      const slotStart = cursor.getTime()
      const slotEnd   = slotStart + 30 * 60 * 1000
      if (!busyRanges.some(b => slotStart < b.end && slotEnd > b.start)) {
        slots.push({ start: new Date(slotStart).toISOString(), end: new Date(slotEnd).toISOString() })
      }
    }
    cursor.setTime(cursor.getTime() + 30 * 60 * 1000)
  }
  return slots
}

// Race guard for the public booking path: re-check that a chosen slot is still free
// immediately before creating the event (the slot list a prospect sees can be seconds
// stale). True = the [start,end) window has no busy overlap on the primary calendar.
export async function isSlotFree(
  accessToken:  string,
  refreshToken: string,
  start:        string,
  end:          string,
): Promise<boolean> {
  const google = await loadGoogle()
  const auth     = await getCalendarClient(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth, rootUrl: googleApiBase() })
  const { data } = await calendar.freebusy.query({
    requestBody: { timeMin: start, timeMax: end, items: [{ id: 'primary' }] },
  })
  const busy = (data.calendars?.['primary']?.busy ?? []) as Array<{ start?: string | null; end?: string | null }>
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return !busy.some(b => b.start && b.end && s < new Date(b.end).getTime() && e > new Date(b.start).getTime())
}

// Classify a thrown Google error as an AUTH failure (revoked/expired refresh token) vs a
// transient one. Only an auth failure should flip calendar_booking_enabled off — a network
// blip must not disconnect a working calendar.
export function isGoogleAuthError(err: unknown): boolean {
  const e = err as { response?: { status?: number }; code?: number | string; message?: string } | undefined
  const status = e?.response?.status ?? (typeof e?.code === 'number' ? e.code : undefined)
  if (status === 401 || status === 403) return true
  const msg = (e?.message ?? '').toLowerCase()
  return msg.includes('invalid_grant') || msg.includes('invalid credentials') || msg.includes('no refresh token')
}

export async function createMeeting(params: {
  accessToken:  string; refreshToken: string; leadEmail: string
  leadName:     string; clientEmail:  string; title:     string
  start:        string; end:          string; description: string
  idempotencyKey?: string   // (audit fix) stable across retries → deterministic event id
}): Promise<{ eventId: string; meetLink: string | null }> {
  const google = await loadGoogle()
  const auth     = await getCalendarClient(params.accessToken, params.refreshToken)
  const calendar = google.calendar({ version: 'v3', auth, rootUrl: googleApiBase() })

  const meetLinkOf = (event: { conferenceData?: { entryPoints?: { entryPointType: string; uri?: string }[] } }) =>
    event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri ?? null

  // #E9/M4 IDEMPOTENCY — when a caller supplies an idempotencyKey, derive a DETERMINISTIC event
  // id (sha1 hex = 0-9a-f ⊂ Google's base32hex id charset) and a stable conference requestId.
  // A retry after a transient post-commit failure re-inserts the SAME id → Google returns 409
  // "already exists" instead of creating a duplicate; we then GET that event and return it. So
  // the retry ladder can never create two calendar events / two invites for one booking.
  const eventId = params.idempotencyKey
    ? createHash('sha1').update(params.idempotencyKey).digest('hex')
    : undefined
  const requestId = eventId ? `kind-${eventId.slice(0, 24)}` : `kind-${Date.now()}`

  try {
    const { data: event } = await calendar.events.insert({
      calendarId:            'primary',
      conferenceDataVersion: 1,
      sendUpdates:           'all',
      requestBody: {
        ...(eventId ? { id: eventId } : {}),
        summary:     params.title,
        description: params.description,
        start:       { dateTime: params.start },
        end:         { dateTime: params.end },
        attendees: [
          { email: params.leadEmail, displayName: params.leadName },
          { email: params.clientEmail },
        ],
        conferenceData: {
          createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
        },
      },
    })
    return { eventId: event.id ?? '', meetLink: meetLinkOf(event) }
  } catch (err) {
    // Duplicate deterministic id (409) = the event already landed on a prior attempt. Fetch it
    // and return it as success rather than erroring — this is exactly what makes the retry safe.
    const status = (err as { code?: number; status?: number })?.code ?? (err as { status?: number })?.status
    if (eventId && (status === 409 || status === 200)) {
      try {
        const { data: existing } = await calendar.events.get({ calendarId: 'primary', eventId })
        return { eventId: existing.id ?? eventId, meetLink: meetLinkOf(existing) }
      } catch { /* fall through to rethrow below */ }
    }
    throw err
  }
}
