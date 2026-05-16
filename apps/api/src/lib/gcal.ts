// Google Calendar OAuth2 + API integration for FIGSY AI SDR.
// Requires: npm install googleapis in apps/api (if not already installed).
// Env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

import { google, Auth } from 'googleapis'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI  ??
  (process.env.PORTAL_URL ? `${process.env.PORTAL_URL}/calendar/callback` : 'http://localhost:3000/calendar/callback')

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

function createOAuth2Client(): Auth.OAuth2Client {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

/**
 * Generates a Google OAuth2 authorization URL.
 * @param clientId - The KIND client ID (stored in state param, base64-encoded).
 */
export function getAuthUrl(clientId: string): string {
  const oauth2Client = createOAuth2Client()
  const state = Buffer.from(clientId).toString('base64')
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt:      'consent',
    scope:       SCOPES,
    state,
  })
}

/**
 * Exchanges an OAuth2 authorization code for access + refresh tokens and the
 * authed user's email address.
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token:  string
  refresh_token: string
  expiry_date:   number
  email:         string
}> {
  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Google did not return expected tokens. Ensure "offline" access_type and prompt=consent.')
  }

  // Fetch user email via oauth2 API
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

/**
 * Creates and returns an authenticated Google OAuth2 client from stored tokens.
 */
export function getCalendarClient(accessToken: string, refreshToken: string): Auth.OAuth2Client {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token:  accessToken,
    refresh_token: refreshToken,
  })
  return oauth2Client
}

/**
 * Returns an array of free 30-minute slots during business hours (Mon–Fri, 9am–5pm)
 * for the next `daysAhead` days, excluding busy times from Google Calendar.
 */
export async function getAvailableSlots(
  accessToken: string,
  refreshToken: string,
  daysAhead:   number,
): Promise<Array<{ start: string; end: string }>> {
  const auth     = getCalendarClient(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const timeMin = new Date()
  timeMin.setMinutes(Math.ceil(timeMin.getMinutes() / 30) * 30, 0, 0) // round up to next 30 min

  const timeMax = new Date(timeMin)
  timeMax.setDate(timeMax.getDate() + daysAhead)

  // Query free/busy
  const { data: freeBusy } = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items:   [{ id: 'primary' }],
    },
  })

  const busyIntervals = (freeBusy.calendars?.['primary']?.busy ?? []) as Array<{
    start?: string | null
    end?:   string | null
  }>

  const busyRanges = busyIntervals
    .filter(b => b.start && b.end)
    .map(b => ({ start: new Date(b.start!).getTime(), end: new Date(b.end!).getTime() }))

  const slots: Array<{ start: string; end: string }> = []
  const cursor = new Date(timeMin)

  while (cursor < timeMax) {
    const day = cursor.getDay() // 0 = Sun, 6 = Sat
    const hour = cursor.getHours()

    if (day >= 1 && day <= 5 && hour >= 9 && hour < 17) {
      const slotStart = cursor.getTime()
      const slotEnd   = slotStart + 30 * 60 * 1000

      const isBusy = busyRanges.some(b => slotStart < b.end && slotEnd > b.start)
      if (!isBusy) {
        slots.push({
          start: new Date(slotStart).toISOString(),
          end:   new Date(slotEnd).toISOString(),
        })
      }
    }

    // Advance 30 minutes
    cursor.setTime(cursor.getTime() + 30 * 60 * 1000)
  }

  return slots
}

/**
 * Creates a Google Calendar event with Google Meet conferencing and invites both parties.
 */
export async function createMeeting(params: {
  accessToken:  string
  refreshToken: string
  leadEmail:    string
  leadName:     string
  clientEmail:  string
  title:        string
  start:        string
  end:          string
  description:  string
}): Promise<{ eventId: string; meetLink: string | null }> {
  const auth     = getCalendarClient(params.accessToken, params.refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const { data: event } = await calendar.events.insert({
    calendarId:          'primary',
    conferenceDataVersion: 1,
    sendUpdates:         'all',
    requestBody: {
      summary:     params.title,
      description: params.description,
      start:       { dateTime: params.start },
      end:         { dateTime: params.end },
      attendees: [
        { email: params.leadEmail,   displayName: params.leadName },
        { email: params.clientEmail },
      ],
      conferenceData: {
        createRequest: {
          requestId:             `kind-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    },
  })

  const meetLink = event.conferenceData?.entryPoints?.find((ep: { entryPointType: string; uri?: string }) => ep.entryPointType === 'video')?.uri ?? null

  return {
    eventId:  event.id ?? '',
    meetLink,
  }
}
