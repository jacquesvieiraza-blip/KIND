// Mount in index.ts: app.use('/calendar', calendarRouter)

import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import {
  getAuthUrl,
  exchangeCodeForTokens,
  getAvailableSlots,
  createMeeting,
} from '../lib/gcal'

export const calendarRouter = Router()

// Guard: if Google OAuth is not configured, every route returns gracefully.
function isGoogleConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
}

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).single()
  return data?.id ?? null
}

// ── CONNECT ───────────────────────────────────────────────────────────────────
// GET /calendar/connect — Auth required. Redirects to Google OAuth.
calendarRouter.get('/connect', requireAuth, async (req: AuthRequest, res) => {
  if (!isGoogleConfigured()) {
    res.status(503).json({ success: false, error: 'Google Calendar integration is not configured.' })
    return
  }
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const url = getAuthUrl(clientId)
    res.redirect(url)
  } catch (err) {
    console.error('[calendar/connect]', err)
    res.status(500).json({ success: false, error: 'Failed to generate OAuth URL' })
  }
})

// ── CALLBACK ──────────────────────────────────────────────────────────────────
// GET /calendar/callback — Public (OAuth callback from Google).
calendarRouter.get('/callback', async (req, res) => {
  if (!isGoogleConfigured()) {
    res.status(503).json({ success: false, error: 'Google Calendar integration is not configured.' })
    return
  }
  try {
    const { code, state, error } = req.query as Record<string, string>

    if (error) {
      console.error('[calendar/callback] OAuth error:', error)
      const portalUrl = process.env.PORTAL_URL ?? 'http://localhost:3000'
      res.redirect(`${portalUrl}/dashboard/settings?calendar=error`)
      return
    }

    if (!code || !state) {
      res.status(400).json({ success: false, error: 'Missing code or state parameter' })
      return
    }

    // Decode client ID from state
    const clientId = Buffer.from(state, 'base64').toString('utf-8')

    const tokens = await exchangeCodeForTokens(code)

    const { error: dbErr } = await db.from('clients').update({
      google_calendar_access_token:  tokens.access_token,
      google_calendar_refresh_token: tokens.refresh_token,
      google_calendar_token_expiry:  new Date(tokens.expiry_date).toISOString(),
      google_calendar_email:         tokens.email,
      calendar_booking_enabled:      true,
    }).eq('id', clientId)

    if (dbErr) throw dbErr

    const portalUrl = process.env.PORTAL_URL ?? 'http://localhost:3000'
    res.redirect(`${portalUrl}/dashboard/settings?calendar=connected`)
  } catch (err) {
    console.error('[calendar/callback]', err)
    const portalUrl = process.env.PORTAL_URL ?? 'http://localhost:3000'
    res.redirect(`${portalUrl}/dashboard/settings?calendar=error`)
  }
})

// ── STATUS ────────────────────────────────────────────────────────────────────
// GET /calendar/status — Auth required. Returns connection status.
calendarRouter.get('/status', requireAuth, async (req: AuthRequest, res) => {
  if (!isGoogleConfigured()) {
    res.json({ success: true, connected: false, email: null })
    return
  }
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data } = await db.from('clients')
      .select('calendar_booking_enabled, google_calendar_email')
      .eq('id', clientId)
      .single()

    res.json({
      success:   true,
      connected: data?.calendar_booking_enabled ?? false,
      email:     data?.google_calendar_email ?? null,
    })
  } catch (err) {
    console.error('[calendar/status]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch calendar status' })
  }
})

// ── SLOTS ─────────────────────────────────────────────────────────────────────
// GET /calendar/slots — Auth required. Returns next 5 available 30-min slots.
calendarRouter.get('/slots', requireAuth, async (req: AuthRequest, res) => {
  if (!isGoogleConfigured()) {
    res.json({ success: true, connected: false, slots: [] })
    return
  }
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: client } = await db.from('clients')
      .select('calendar_booking_enabled, google_calendar_access_token, google_calendar_refresh_token')
      .eq('id', clientId)
      .single()

    if (!client?.calendar_booking_enabled || !client?.google_calendar_access_token || !client?.google_calendar_refresh_token) {
      res.json({ success: true, connected: false, slots: [] })
      return
    }

    const allSlots = await getAvailableSlots(
      client.google_calendar_access_token,
      client.google_calendar_refresh_token,
      14, // look 2 weeks ahead
    )

    res.json({ success: true, connected: true, slots: allSlots.slice(0, 5) })
  } catch (err) {
    console.error('[calendar/slots]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch available slots' })
  }
})

// ── BOOK ──────────────────────────────────────────────────────────────────────
// POST /calendar/book — Auth required. Books a meeting and records it.
calendarRouter.post('/book', requireAuth, async (req: AuthRequest, res) => {
  if (!isGoogleConfigured()) {
    res.status(503).json({ success: false, error: 'Google Calendar integration is not configured.' })
    return
  }
  try {
    const body = z.object({
      leadId:       z.string().uuid(),
      enrollmentId: z.string().uuid().optional(),
      start:        z.string().datetime(),
      end:          z.string().datetime(),
      title:        z.string().optional(),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: client } = await db.from('clients')
      .select('calendar_booking_enabled, google_calendar_access_token, google_calendar_refresh_token, google_calendar_email, company_name')
      .eq('id', clientId)
      .single()

    if (!client?.calendar_booking_enabled || !client?.google_calendar_access_token || !client?.google_calendar_refresh_token) {
      res.status(400).json({ success: false, error: 'Google Calendar is not connected.' })
      return
    }

    const { data: lead } = await db.from('leads')
      .select('id, first_name, last_name, email')
      .eq('id', body.leadId)
      .eq('client_id', clientId)
      .single()

    if (!lead?.email) {
      res.status(404).json({ success: false, error: 'Lead not found or missing email' })
      return
    }

    const leadName  = `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || 'Prospect'
    const title     = body.title ?? `Meeting with ${leadName}`
    const clientEmail = client.google_calendar_email ?? ''

    const { eventId, meetLink } = await createMeeting({
      accessToken:  client.google_calendar_access_token,
      refreshToken: client.google_calendar_refresh_token,
      leadEmail:    lead.email,
      leadName,
      clientEmail,
      title,
      start:        body.start,
      end:          body.end,
      description:  `Meeting arranged via K.I.N.D FIGSY AI SDR.\nCompany: ${client.company_name ?? ''}`,
    })

    const { error: insertErr } = await db.from('calendar_bookings').insert({
      client_id:      clientId,
      lead_id:        body.leadId,
      enrollment_id:  body.enrollmentId ?? null,
      google_event_id: eventId,
      meeting_title:  title,
      start_time:     body.start,
      end_time:       body.end,
      meeting_link:   meetLink,
      status:         'confirmed',
    })

    if (insertErr) throw insertErr

    res.status(201).json({ success: true, meetLink, eventId })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[calendar/book]', err)
    res.status(500).json({ success: false, error: 'Failed to book meeting' })
  }
})

// ── GENERATE LINK ─────────────────────────────────────────────────────────────
// GET /calendar/generate-link?enrollmentId=... — Auth required.
// Returns a pre-formatted message the AI can embed in a reply suggestion.
calendarRouter.get('/generate-link', requireAuth, async (req: AuthRequest, res) => {
  if (!isGoogleConfigured()) {
    res.json({ success: true, connected: false, message: null, slot: null })
    return
  }
  try {
    const { enrollmentId: _enrollmentId } = z.object({
      enrollmentId: z.string().uuid(),
    }).parse(req.query)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: client } = await db.from('clients')
      .select('calendar_booking_enabled, google_calendar_access_token, google_calendar_refresh_token')
      .eq('id', clientId)
      .single()

    if (!client?.calendar_booking_enabled || !client?.google_calendar_access_token || !client?.google_calendar_refresh_token) {
      res.json({ success: true, connected: false, message: null, slot: null })
      return
    }

    const allSlots = await getAvailableSlots(
      client.google_calendar_access_token,
      client.google_calendar_refresh_token,
      14,
    )

    if (allSlots.length === 0) {
      res.json({ success: true, connected: true, message: null, slot: null })
      return
    }

    const slot = allSlots[0]

    const slotDate = new Date(slot.start)
    const formattedDate = slotDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month:   'long',
      day:     'numeric',
    })
    const formattedTime = slotDate.toLocaleTimeString('en-US', {
      hour:   'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    })

    const message =
      `I'd love to connect — here's a time that might work: ${formattedDate} at ${formattedTime}. ` +
      `Reply to this email and I'll send a calendar invite.`

    res.json({ success: true, connected: true, message, slot })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[calendar/generate-link]', err)
    res.status(500).json({ success: false, error: 'Failed to generate calendar link' })
  }
})
