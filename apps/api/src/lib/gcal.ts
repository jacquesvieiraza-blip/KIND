// Google Calendar OAuth2 + API integration — loaded dynamically to avoid
// pulling googleapis into the build graph (it triggers native apt deps on Railway).
// Re-add googleapis to package.json when Google Calendar goes live.

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI  ??
  (process.env.PORTAL_URL ? `${process.env.PORTAL_URL}/calendar/callback` : 'http://localhost:3000/calendar/callback')

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadGoogle(): Promise<any> {
  const { google } = await import('googleapis')
  return google
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createOAuth2Client(google: any) {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

export async function getAuthUrl(clientId: string): Promise<string> {
  const google = await loadGoogle()
  const oauth2Client = createOAuth2Client(google)
  const state = Buffer.from(clientId).toString('base64')
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

export async function getAvailableSlots(
  accessToken: string,
  refreshToken: string,
  daysAhead:   number,
): Promise<Array<{ start: string; end: string }>> {
  const google = await loadGoogle()
  const auth     = await getCalendarClient(accessToken, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

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
    const day = cursor.getDay()
    const hour = cursor.getHours()
    if (day >= 1 && day <= 5 && hour >= 9 && hour < 17) {
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

export async function createMeeting(params: {
  accessToken:  string; refreshToken: string; leadEmail: string
  leadName:     string; clientEmail:  string; title:     string
  start:        string; end:          string; description: string
}): Promise<{ eventId: string; meetLink: string | null }> {
  const google = await loadGoogle()
  const auth     = await getCalendarClient(params.accessToken, params.refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const { data: event } = await calendar.events.insert({
    calendarId:            'primary',
    conferenceDataVersion: 1,
    sendUpdates:           'all',
    requestBody: {
      summary:     params.title,
      description: params.description,
      start:       { dateTime: params.start },
      end:         { dateTime: params.end },
      attendees: [
        { email: params.leadEmail, displayName: params.leadName },
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

  return {
    eventId:  event.id ?? '',
    meetLink: event.conferenceData?.entryPoints?.find((ep: { entryPointType: string; uri?: string }) => ep.entryPointType === 'video')?.uri ?? null,
  }
}
