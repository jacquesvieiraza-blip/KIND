// Mount in index.ts: app.use('/calendar', calendarRouter)

import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { rateLimit } from '../lib/rate-limit'
import { logOutcomeEvent } from '../lib/outcomes'
import { recomputeCampaignCounters } from '../lib/figsy'
// BUILD-003 item 2 — the ONE place a meeting is created. Never `.from('meetings')` here.
import { recordBooking } from '../lib/meeting-truth'
import {
  getAuthUrl,
  exchangeCodeForTokens,
  getAvailableSlots,
  createMeeting,
  isSlotFree,
  isGoogleAuthError,
} from '../lib/gcal'
import {
  signOAuthState,
  verifyOAuthState,
  verifyBookingToken,
} from '../lib/booking-token'

export const calendarRouter = Router()

// Guard: if Google OAuth is not configured, every route returns gracefully.
function isGoogleConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
}

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).single()
  return data?.id ?? null
}

// A revoked/expired Google token means the calendar is no longer connected. Flip the
// flag off (honestly), so status/slots report disconnected instead of erroring forever.
async function markDisconnected(clientId: string): Promise<void> {
  await db.from('clients').update({ calendar_booking_enabled: false }).eq('id', clientId).then(() => {}, () => {})
}

// ── SHARED BOOKING CORE ─────────────────────────────────────────────────────────
// One code path for BOTH the authed /book (client books manually) and the public
// /public/:token/book (a cold prospect self-books). Creates the real Google event,
// records calendar_bookings, logs the highest-value outcome, and moves the campaign KPI.
// Returns a discriminated result the callers map to HTTP. NEVER reports success unless
// the Google event was actually created (#268 honesty rail).
type BookingResult =
  | { ok: true; meetLink: string | null; eventId: string }
  | { ok: false; status: number; error: string; existing?: { start: string | null; meetLink: string | null } }

/**
 * Record a booking we cannot verify, for every GOOGLE-side failure.
 *
 * ⚠️ THE DISTINCTION THIS FUNCTION EXISTS TO HOLD (founder-corrected 29 Aug):
 *
 *   K.I.N.D APPLICATION auth/authorisation fails → fail closed. No booking, no meeting.
 *     Enforced BEFORE this file's booking core is ever entered — `requireAuth` on the authed
 *     route, a signed booking token on the public one — so an unauthenticated caller cannot
 *     reach any code that could create a fallback. That is the strongest possible form of
 *     "fails closed": the path does not exist for them.
 *
 *   GOOGLE calendar auth/connection fails → the prospect must not disappear. They accepted a
 *     time; the only thing missing is our ability to prove a calendar entry.
 *
 * Returns a BookingResult to send back, or null if the caller should fall through to its own
 * error — null means we could not even record the fallback, which must not be reported as a
 * successfully-captured booking.
 */
async function recordUnverifiedBooking(
  params: { clientId: string; leadId: string; enrollmentId?: string | null; start: string },
  cause: 'calendar_not_connected' | 'google_auth_failed' | 'google_unavailable',
): Promise<BookingResult | null> {
  const recorded = await recordBooking({
    clientId:      params.clientId,
    leadId:        params.leadId,
    scheduledAt:   params.start,
    enrollmentId:  params.enrollmentId ?? null,
    // ⚠️ NEVER AN INVENTED ID. No event id means BOOKED_UNVERIFIED and verified_at NULL —
    // the row says exactly what we know and nothing we do not.
    googleEventId: null,
  })

  if (!recorded.ok) {
    if (recorded.refused.reason === 'already_booked') {
      return { ok: false, status: 409, error: 'That lead already has a confirmed booking.' }
    }
    console.error(`[calendar/performBooking] fallback booking (${cause}) could not be recorded:`, recorded.refused.message)
    return null
  }

  // Reconnection is surfaced in the message rather than buried in a log, because the person
  // who can fix it is the one reading this response.
  const reconnect = cause === 'google_unavailable'
    ? 'We will add the calendar invite once Google is reachable.'
    : 'Google Calendar is not connected — reconnect it and we will add the invite.'

  return {
    ok: false,
    status: 202,
    error: `The meeting is booked, but the calendar entry could not be created. ${reconnect} Please confirm the time with the prospect directly.`,
  }
}

async function performBooking(params: {
  clientId:      string
  leadId:        string
  enrollmentId?: string | null
  start:         string
  end:           string
  title?:        string
}): Promise<BookingResult> {
  const { data: client } = await db.from('clients')
    .select('calendar_booking_enabled, google_calendar_access_token, google_calendar_refresh_token, google_calendar_email, company_name')
    .eq('id', params.clientId)
    .single()

  // ⛓️ THIS USED TO RETURN 400 HERE AND END THE STORY (corrected 29 Aug, BUILD-003 item 8).
  //
  // A DISCONNECTED CALENDAR IS A GOOGLE-SIDE FAILURE, NOT A REASON TO LOSE THE PROSPECT.
  // The person has chosen a slot and submitted it — the booking has been ACCEPTED. Refusing
  // outright meant they vanished from the one number the commercial model is judged on, and
  // the client found out only if they happened to read a support ticket.
  //
  // So the decision is deferred: validate the lead and the no-duplicate rule first, then
  // record BOOKED_UNVERIFIED and tell the client to reconnect. The rejection is not skipped
  // — it is moved to where it can be honest about what happened.
  const calendarConnected = !!client?.calendar_booking_enabled
    && !!client?.google_calendar_access_token
    && !!client?.google_calendar_refresh_token

  const { data: lead } = await db.from('leads')
    .select('id, first_name, last_name, email')
    .eq('id', params.leadId)
    .eq('client_id', params.clientId)
    .single()

  if (!lead?.email) {
    return { ok: false, status: 404, error: 'Lead not found or missing email' }
  }

  // One active FUTURE booking per lead+client — a prospect (or client) clicking twice
  // must not create two meetings. Return the existing one so the caller can 409.
  const { data: existing } = await db.from('calendar_bookings')
    .select('start_time, meeting_link')
    .eq('client_id', params.clientId)
    .eq('lead_id', params.leadId)
    .eq('status', 'confirmed')
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (existing) {
    return {
      ok: false, status: 409, error: 'A meeting is already booked for this lead.',
      existing: { start: existing.start_time ?? null, meetLink: existing.meeting_link ?? null },
    }
  }

  // ── GOOGLE CALENDAR NOT CONNECTED — record, then ask them to reconnect ────────────────
  // The lead is real and there is no existing booking, both checked above, so this is a
  // genuine accepted booking we simply cannot put in a calendar.
  if (!calendarConnected) {
    const fallback = await recordUnverifiedBooking(params, 'calendar_not_connected')
    if (fallback) return fallback
    return { ok: false, status: 400, error: 'Google Calendar is not connected.' }
  }

  const leadName    = `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || 'Prospect'
  const title       = params.title ?? `Meeting with ${leadName}`
  const clientEmail = client.google_calendar_email ?? ''

  // Race guard + auth-honesty: re-verify the slot is free right now, then create. Any
  // Google auth failure here disconnects the calendar rather than faking a booking.
  let meetLink: string | null
  let eventId: string
  try {
    const free = await isSlotFree(client.google_calendar_access_token, client.google_calendar_refresh_token, params.start, params.end)
    if (!free) {
      return { ok: false, status: 409, error: 'That time was just taken — please pick another slot.' }
    }
    // E9 — RETRY LADDER. A booking is the highest-value outcome (#17b) — a transient Google
    // hiccup (5xx, rate-limit, network blip) must not lose it. Retry up to 3 attempts with
    // backoff. An AUTH error (disconnected calendar) is NOT transient → break immediately and
    // fail closed. A taken slot already returned 409 above, so it never reaches here.
    let created: Awaited<ReturnType<typeof createMeeting>> | null = null
    let lastErr: unknown = null
    const BACKOFF_MS = [0, 600, 1800]
    for (let attempt = 0; attempt < BACKOFF_MS.length; attempt++) {
      if (BACKOFF_MS[attempt] > 0) await new Promise(r => setTimeout(r, BACKOFF_MS[attempt]))
      try {
        created = await createMeeting({
          accessToken:  client.google_calendar_access_token,
          refreshToken: client.google_calendar_refresh_token,
          leadEmail:    lead.email,
          leadName,
          clientEmail,
          title,
          start:        params.start,
          end:          params.end,
          description:  `Meeting arranged via K.I.N.D FIGSY AI SDR.\nCompany: ${client.company_name ?? ''}`,
          // (audit fix M4) stable across retries → one deterministic Google event, never a duplicate
          idempotencyKey: `${params.clientId}:${params.leadId}:${params.start}`,
        })
        break // success
      } catch (err) {
        lastErr = err
        if (isGoogleAuthError(err)) break // not transient — stop retrying, handled below
        console.error(`[calendar/performBooking] createMeeting attempt ${attempt + 1}/${BACKOFF_MS.length} failed:`, err)
      }
    }
    if (!created) throw lastErr ?? new Error('createMeeting failed')
    meetLink = created.meetLink
    eventId  = created.eventId
  } catch (err) {
    // ── EVERY GOOGLE-SIDE FAILURE RECORDS THE BOOKING (BUILD-003 item 8) ───────────────
    //
    // ⛓️ CORRECTED 29 Aug. The first cut sent Google AUTH errors down a separate path that
    // returned 400 and recorded nothing, on the reasoning that a disconnected calendar is a
    // configuration problem rather than a transient one. The founder's ruling is that the
    // distinction I drew was the wrong one:
    //
    //   K.I.N.D APPLICATION auth/authorisation failure  → fail closed, NO booking, NO meeting
    //   GOOGLE calendar auth / connection failure       → never make the prospect disappear
    //
    // Application auth is enforced by `requireAuth` on the route and by the signed booking
    // token on the public route — neither reaches this function at all, so failing closed
    // there is already absolute. Everything that reaches THIS catch is Google's side:
    // disconnected, token expired, event not created or not read back, provider down. All of
    // it is a booking the prospect has already accepted and we merely cannot verify.
    //
    // The retry ladder above reduces how often this happens; it cannot make it never happen.
    // Recording BOOKED_UNVERIFIED is honest about the missing calendar entry, countable as
    // the outcome it is, and reconcilable by verifyBooking() once an event id exists.
    //
    // ⚠️ WE NEVER PRETEND IT IS VERIFIED: no event id is invented, verified_at stays NULL,
    // and the caller is told the invite is missing.
    const authFailure = isGoogleAuthError(err)
    if (authFailure) {
      // Still surfaced as a configuration problem — the client must reconnect, and the flag
      // is what makes status/slots report disconnected instead of erroring forever.
      await markDisconnected(params.clientId)
    }
    console.error('[calendar/performBooking] createMeeting failed after retries:', err)

    const fallback = await recordUnverifiedBooking(
      params, authFailure ? 'google_auth_failed' : 'google_unavailable')
    if (fallback) return fallback

    return authFailure
      ? { ok: false, status: 400, error: 'Google Calendar is not connected.' }
      : { ok: false, status: 502, error: 'Could not create the calendar event — please try again.' }
  }

  const { error: insertErr } = await db.from('calendar_bookings').insert({
    client_id:       params.clientId,
    lead_id:         params.leadId,
    enrollment_id:   params.enrollmentId ?? null,
    google_event_id: eventId,
    meeting_title:   title,
    start_time:      params.start,
    end_time:        params.end,
    meeting_link:    meetLink,
    status:          'confirmed',
  })
  if (insertErr) {
    // (audit fix M6) A UNIQUE violation (23505) means a concurrent request already booked this
    // lead — the OTHER request owns the confirmed row + the $3 capture. Do NOT capture again or
    // claim success here; report it as already-booked so we never leave a duplicate.
    if ((insertErr as { code?: string }).code === '23505') {
      console.warn('[calendar/performBooking] duplicate booking blocked by unique guard — lead', params.leadId)
      return { ok: false, status: 409, error: 'That lead already has a confirmed booking.' }
    }
    // Otherwise the Google event DID get created — a real confirmed meeting. Surface the meet
    // link so it isn't lost. ONE WALLET: booking moves NO money — the $4 was final at approve;
    // a meeting is a reported outcome only.
    console.error('[calendar/performBooking] booking row insert failed (event created):', insertErr.message)
    return { ok: true, meetLink, eventId }
  }

  // THE DATA FLOOR (#17b) — a real calendar booking is the highest-value outcome and
  // cannot be back-filled. Log it before anything else can fail.
  void logOutcomeEvent({
    client_id:     params.clientId,
    lead_id:       params.leadId,
    enrollment_id: params.enrollmentId ?? null,
    event_type:    'meeting_booked',
    channel:       'calendar',
    payload:       { google_event_id: eventId, meeting_link: meetLink, start: params.start, end: params.end, source: 'calendar_book' },
  })

  // Unify the booking KPI: attribute to the lead's active enrollment's campaign and
  // stamp the matching reply so recompute counts it from source.
  try {
    let campaignId: string | null = null
    if (params.enrollmentId) {
      const { data: enr } = await db.from('figsy_enrollments')
        .select('campaign_id').eq('id', params.enrollmentId).maybeSingle()
      campaignId = enr?.campaign_id ?? null
    }
    if (!campaignId) {
      const { data: enr } = await db.from('figsy_enrollments')
        .select('campaign_id').eq('lead_id', params.leadId).order('enrolled_at', { ascending: false }).limit(1).maybeSingle()
      campaignId = enr?.campaign_id ?? null
    }
    // ── MEETING TRUTH (BUILD-003 item 2) ────────────────────────────────────────────
    // The authoritative record. Everything below this line is history and cache.
    const recorded = await recordBooking({
      clientId:      params.clientId,
      leadId:        params.leadId,
      scheduledAt:   params.start,
      campaignId,
      enrollmentId:  params.enrollmentId ?? null,
      googleEventId: eventId,
    })
    if (!recorded.ok && recorded.refused.reason !== 'already_booked') {
      console.error('[calendar/performBooking] meeting truth not recorded:', recorded.refused.message)
    }

    // RETAINED AS HISTORY (founder-locked 29 Aug). `meeting_booked_at` is still stamped
    // where it always was — it is a real historical fact about a reply, and deleting the
    // stamp would destroy history to make a point. ⚠️ It is no longer READ for any count or
    // state: public.meetings is the sole truth, and this is a footprint, not a source.
    await db.from('figsy_replies')
      .update({ meeting_booked_at: new Date().toISOString() })
      .eq('lead_id', params.leadId).is('meeting_booked_at', null)
      .in('classification', ['hot', 'warm'])
      .select('id')

    if (campaignId) {
      // ⛓️ THE READ-MODIFY-WRITE IS GONE. This used to
      //     select meetings_booked → update meetings_booked = value + 1
      // which is a lost update the instant two bookings land together: both read N, both
      // write N+1, and one real meeting disappears from the cache permanently, with nothing
      // to reconcile it against because the counter WAS the record.
      //
      // `figsy_campaigns.meetings_booked` is now a DERIVED CACHE, recomputed from
      // public.meetings and never incremented. That is the difference that matters: a
      // counter that drifts stays wrong; a cache that drifts is corrected on the next write.
      // One write, not two: recomputeCampaignCounters now derives meetings_booked from
      // public.meetings itself, so calling the meeting-cache helper as well would simply
      // write the same value twice.
      await recomputeCampaignCounters(campaignId)
    }
  } catch (kpiErr) {
    console.error('[calendar/performBooking] KPI update failed (booking still saved):', kpiErr)
  }

  // ONE WALLET: a confirmed booking moves NO money — the $4 was final at approve.
  // The meeting is captured above as a reported outcome (logOutcomeEvent + KPI).
  return { ok: true, meetLink, eventId }
}

// ── CONNECT ───────────────────────────────────────────────────────────────────
// GET /calendar/connect — Auth required. Returns the Google OAuth consent URL as
// JSON; the portal fetches this WITH the bearer token, then navigates the browser
// to the returned URL. (It used to res.redirect() — dead on arrival, because the
// portal linked here with a plain <a href>, and a top-level browser navigation
// carries no Authorization header → requireAuth 401'd "Missing auth token" for
// every client, so calendar connect never worked from the UI.)
calendarRouter.get('/connect', requireAuth, async (req: AuthRequest, res) => {
  if (!isGoogleConfigured()) {
    res.status(503).json({ success: false, error: 'Google Calendar integration is not configured.' })
    return
  }
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // #368 — signed, short-lived CSRF state (was raw base64(clientId)).
    const url = await getAuthUrl(signOAuthState(clientId))
    res.json({ success: true, url })
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
  const portalUrl = process.env.PORTAL_URL ?? 'http://localhost:3000'
  try {
    const { code, state, error } = req.query as Record<string, string>

    if (error) {
      console.error('[calendar/callback] OAuth error:', error)
      res.redirect(`${portalUrl}/dashboard/settings?calendar=error`)
      return
    }

    if (!code || !state) {
      res.redirect(`${portalUrl}/dashboard/settings?calendar=error`)
      return
    }

    // #368 — verify the HMAC-signed state (rejects forged/expired/tampered state, so an
    // attacker can't bind their Google account to a victim's client row).
    const verified = verifyOAuthState(state)
    if (!verified) {
      console.warn('[calendar/callback] invalid or expired OAuth state — rejected')
      res.redirect(`${portalUrl}/dashboard/settings?calendar=error`)
      return
    }
    const clientId = verified.clientId

    const tokens = await exchangeCodeForTokens(code)

    const { error: dbErr } = await db.from('clients').update({
      google_calendar_access_token:  tokens.access_token,
      google_calendar_refresh_token: tokens.refresh_token,
      google_calendar_token_expiry:  new Date(tokens.expiry_date).toISOString(),
      google_calendar_email:         tokens.email,
      calendar_booking_enabled:      true,
    }).eq('id', clientId)

    if (dbErr) throw dbErr

    res.redirect(`${portalUrl}/dashboard/settings?calendar=connected`)
  } catch (err) {
    console.error('[calendar/callback]', err)
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

    try {
      const allSlots = await getAvailableSlots(
        client.google_calendar_access_token,
        client.google_calendar_refresh_token,
        14,
      )
      res.json({ success: true, connected: true, slots: allSlots.slice(0, 5) })
    } catch (err) {
      if (isGoogleAuthError(err)) {
        await markDisconnected(clientId)
        res.json({ success: true, connected: false, slots: [] })
        return
      }
      throw err
    }
  } catch (err) {
    console.error('[calendar/slots]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch available slots' })
  }
})

// ── BOOK (authed) ───────────────────────────────────────────────────────────────
// POST /calendar/book — Auth required. The client books a meeting manually.
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

    const result = await performBooking({
      clientId,
      leadId:       body.leadId,
      enrollmentId: body.enrollmentId ?? null,
      start:        body.start,
      end:          body.end,
      title:        body.title,
    })

    if (!result.ok) {
      res.status(result.status).json({ success: false, error: result.error, ...(result.existing ? { existing: result.existing } : {}) })
      return
    }
    res.status(201).json({ success: true, meetLink: result.meetLink, eventId: result.eventId })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[calendar/book]', err)
    res.status(500).json({ success: false, error: 'Failed to book meeting' })
  }
})

// ── PUBLIC PROSPECT BOOKING (#361b) ──────────────────────────────────────────────
// No auth — the signed booking token IS the authorization (binds leadId→clientId).
// Rate-limited per IP so an anonymous caller can't scrape a calendar or spam events.
const publicBookLimit = rateLimit({ limit: 20, windowMs: 60_000, key: 'calendar-public' })

// GET /calendar/public/:token/slots — the prospect's view of the client's open slots.
calendarRouter.get('/public/:token/slots', publicBookLimit, async (req, res) => {
  if (!isGoogleConfigured()) {
    res.json({ success: true, connected: false, slots: [], company: null })
    return
  }
  try {
    const claims = verifyBookingToken(req.params.token)
    if (!claims) { res.status(404).json({ success: false, error: 'This booking link is invalid or has expired.' }); return }

    const { data: client } = await db.from('clients')
      .select('company_name, calendar_booking_enabled, google_calendar_access_token, google_calendar_refresh_token')
      .eq('id', claims.clientId)
      .single()

    if (!client?.calendar_booking_enabled || !client?.google_calendar_access_token || !client?.google_calendar_refresh_token) {
      res.json({ success: true, connected: false, slots: [], company: client?.company_name ?? null })
      return
    }

    try {
      const allSlots = await getAvailableSlots(
        client.google_calendar_access_token,
        client.google_calendar_refresh_token,
        14,
      )
      // Give a prospect a real choice without exposing the entire calendar.
      res.json({ success: true, connected: true, slots: allSlots.slice(0, 12), company: client.company_name ?? null })
    } catch (err) {
      if (isGoogleAuthError(err)) {
        await markDisconnected(claims.clientId)
        res.json({ success: true, connected: false, slots: [], company: client.company_name ?? null })
        return
      }
      throw err
    }
  } catch (err) {
    console.error('[calendar/public/slots]', err)
    res.status(500).json({ success: false, error: 'Could not load available times.' })
  }
})

// POST /calendar/public/:token/book — the prospect books the chosen slot.
calendarRouter.post('/public/:token/book', publicBookLimit, async (req, res) => {
  if (!isGoogleConfigured()) {
    res.status(503).json({ success: false, error: 'Booking is not available right now.' })
    return
  }
  try {
    const claims = verifyBookingToken(req.params.token)
    if (!claims) { res.status(404).json({ success: false, error: 'This booking link is invalid or has expired.' }); return }

    const body = z.object({
      start: z.string().datetime(),
      end:   z.string().datetime(),
    }).parse(req.body)

    // ABUSE GUARD — this is a PUBLIC endpoint, so the requested time must be one the
    // server actually OFFERS (business hours, 30 min, next 14 days, currently free).
    // Without this, anyone holding a booking link could zod-validly create a 10-hour
    // 3am event months out on the client's real calendar — isSlotFree alone would
    // allow it (an empty calendar at 3am IS free). Membership in the freshly-computed
    // slot list enforces duration, hours, and horizon in one check.
    const { data: slotClient } = await db.from('clients')
      .select('calendar_booking_enabled, google_calendar_access_token, google_calendar_refresh_token')
      .eq('id', claims.clientId)
      .single()
    if (!slotClient?.calendar_booking_enabled || !slotClient?.google_calendar_access_token || !slotClient?.google_calendar_refresh_token) {
      res.status(400).json({ success: false, error: 'Booking is not available right now.' })
      return
    }
    let offered: Array<{ start: string; end: string }>
    try {
      offered = await getAvailableSlots(slotClient.google_calendar_access_token, slotClient.google_calendar_refresh_token, 14)
    } catch (err) {
      if (isGoogleAuthError(err)) {
        await markDisconnected(claims.clientId)
        res.status(400).json({ success: false, error: 'Booking is not available right now.' })
        return
      }
      throw err
    }
    const reqStart = new Date(body.start).getTime()
    const reqEnd   = new Date(body.end).getTime()
    const isOffered = offered.some(s => new Date(s.start).getTime() === reqStart && new Date(s.end).getTime() === reqEnd)
    if (!isOffered) {
      res.status(409).json({ success: false, error: 'That time is not available — please pick another slot.' })
      return
    }

    const result = await performBooking({
      clientId:     claims.clientId,
      leadId:       claims.leadId,
      enrollmentId: claims.enrollmentId,
      start:        body.start,
      end:          body.end,
    })

    if (!result.ok) {
      res.status(result.status).json({ success: false, error: result.error, ...(result.existing ? { existing: result.existing } : {}) })
      return
    }
    res.status(201).json({ success: true, meetLink: result.meetLink })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid booking request.' }); return }
    console.error('[calendar/public/book]', err)
    res.status(500).json({ success: false, error: 'Could not book the meeting — please try again.' })
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
