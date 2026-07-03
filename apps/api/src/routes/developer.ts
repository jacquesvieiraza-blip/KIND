import { Router, Request, Response, NextFunction } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { rateLimit } from '../lib/rate-limit'
import crypto from 'crypto'

const router = Router()

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// ── API-KEY AUTH (public event API #185) ──────────────────────────────────────
// Resolve a `kind_...` developer key (Authorization: Bearer / X-Api-Key) → the
// owning client_id. Reuses the existing developer_keys sha256 scheme so no new
// secret store is introduced. Used ONLY by the read-only public event API.
interface ApiKeyRequest extends Request { apiClientId?: string }

async function requireApiKey(req: ApiKeyRequest, res: Response, next: NextFunction) {
  try {
    const raw = (req.headers['x-api-key'] as string | undefined)
      ?? req.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!raw || !raw.startsWith('kind_')) {
      res.status(401).json({ error: 'Missing or malformed API key' }); return
    }
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex')
    const { data, error } = await db.from('developer_keys')
      .select('id, client_id, revoked_at')
      .eq('key_hash', keyHash)
      .is('revoked_at', null)
      .maybeSingle()
    if (error || !data) { res.status(401).json({ error: 'Invalid or revoked API key' }); return }
    req.apiClientId = data.client_id
    // Best-effort usage stamp — never blocks the request.
    void db.from('developer_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
    next()
  } catch (err) {
    console.error('[developer] requireApiKey', err)
    res.status(500).json({ error: 'Auth check failed' })
  }
}

// GET /developer/keys — list client's API keys
router.get('/keys', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { data, error } = await db.from('developer_keys')
      .select('id, key_prefix, name, created_at, last_used_at, total_requests, revoked_at')
      .eq('client_id', clientId)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json(data)
  } catch (err) {
    console.error('[developer] GET /keys', err)
    res.status(500).json({ error: 'Failed to list keys' })
  }
})

// POST /developer/keys — create new API key
router.post('/keys', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { name } = req.body as { name?: string }
    const rawKey = `kind_${crypto.randomBytes(24).toString('hex')}`
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
    const keyPrefix = rawKey.substring(0, 12)
    const { data, error } = await db.from('developer_keys')
      .insert({ client_id: clientId, key_prefix: keyPrefix, key_hash: keyHash, name: name ?? 'My API Key' })
      .select('id, key_prefix, name, created_at')
      .single()
    if (error) { res.status(500).json({ error: error.message }); return }
    // Return full key ONCE only
    res.json({ ...data, key: rawKey })
  } catch (err) {
    console.error('[developer] POST /keys', err)
    res.status(500).json({ error: 'Failed to create key' })
  }
})

// DELETE /developer/keys/:id — revoke key
router.delete('/keys/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { error } = await db.from('developer_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('client_id', clientId)
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json({ ok: true })
  } catch (err) {
    console.error('[developer] DELETE /keys/:id', err)
    res.status(500).json({ error: 'Failed to revoke key' })
  }
})

// ── OUTBOUND WEBHOOK ENDPOINTS (#182 Zapier/Make · #185 outbound webhooks) ─────
// Client-scoped registration of outbound webhook URLs. Events are pushed by
// lib/webhooks.ts deliverWebhooks() from the logOutcomeEvent chokepoint.
//
// NOTE: depends on the webhook_endpoints table — FLAGGED, not yet migrated on the
// live DB (apps/api/src/migrations/20260622_webhook_endpoints.sql). Until that
// migration runs these endpoints will return a 503-style error from the DB layer,
// which the UI surfaces gracefully; delivery itself no-ops safely meanwhile.

const VALID_EVENT_TYPES = ['lead.delivered', 'reply.received', 'meeting.booked', 'opt_out'] as const

// GET /developer/webhooks — list this client's registered outbound endpoints
router.get('/webhooks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { data, error } = await db.from('webhook_endpoints')
      .select('id, url, event_types, active, created_at')   // never return `secret`
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json(data ?? [])
  } catch (err) {
    console.error('[developer] GET /webhooks', err)
    res.status(500).json({ error: 'Failed to list webhooks' })
  }
})

// POST /developer/webhooks — register a new outbound endpoint. Returns the
// signing secret ONCE so the client can verify X-Kind-Signature on deliveries.
router.post('/webhooks', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { url, event_types } = req.body as { url?: string; event_types?: string[] }
    if (!url || !/^https?:\/\//i.test(url)) {
      res.status(400).json({ error: 'A valid http(s) url is required' }); return
    }
    // Validate event_types if supplied; empty/undefined = subscribe to all.
    const types = Array.isArray(event_types)
      ? event_types.filter(t => (VALID_EVENT_TYPES as readonly string[]).includes(t))
      : []
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`
    const { data, error } = await db.from('webhook_endpoints')
      .insert({ client_id: clientId, url, secret, event_types: types, active: true })
      .select('id, url, event_types, active, created_at')
      .single()
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json({ ...data, secret })   // secret returned ONCE only
  } catch (err) {
    console.error('[developer] POST /webhooks', err)
    res.status(500).json({ error: 'Failed to create webhook' })
  }
})

// DELETE /developer/webhooks/:id — remove an endpoint (client-scoped)
router.delete('/webhooks/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }
    const { error } = await db.from('webhook_endpoints')
      .delete()
      .eq('id', req.params.id)
      .eq('client_id', clientId)
    if (error) { res.status(500).json({ error: error.message }); return }
    res.json({ ok: true })
  } catch (err) {
    console.error('[developer] DELETE /webhooks/:id', err)
    res.status(500).json({ error: 'Failed to delete webhook' })
  }
})

// ── PUBLIC EVENT API (#185) ────────────────────────────────────────────────────
// Read-only, API-key authenticated, client-scoped. Lets Zapier/Make/n8n POLL
// recent events when they cannot receive a webhook. Stable JSON: event name,
// ISO timestamp, client-scoped ids. Never exposes another client's rows.
//
// GET /developer/events?since=<ISO>&type=<event>&limit=<n>
const EVENT_TYPE_DB_MAP: Record<string, string> = {
  'lead.delivered': 'send',
  'reply.received': 'reply',
  'meeting.booked': 'meeting_booked',
  'opt_out':        'opt_out',
}
const PUBLIC_NAME_BY_DB: Record<string, string> = {
  send:           'lead.delivered',
  reply:          'reply.received',
  meeting_booked: 'meeting.booked',
  opt_out:        'opt_out',
}

// Per-API-key rate limit (#269) — caps the public event API at 120 requests/min
// PER KEY so a single key holder can't run up unlimited requests. Runs after
// requireApiKey so the presented key is available for the limiter to hash.
const eventsRateLimit = rateLimit({ limit: 120, windowMs: 60_000, key: 'dev-events', byApiKey: true })

router.get('/events', requireApiKey, eventsRateLimit, async (req: ApiKeyRequest, res) => {
  try {
    const clientId = req.apiClientId!
    const { since, type, limit } = req.query as { since?: string; type?: string; limit?: string }
    const lim = Math.min(Math.max(parseInt(limit ?? '50', 10) || 50, 1), 200)

    let q = db.from('outcome_events')
      .select('id, event_type, channel, campaign_id, lead_id, enrollment_id, payload, occurred_at')
      .eq('client_id', clientId)                              // hard client scope
      .in('event_type', Object.keys(PUBLIC_NAME_BY_DB))       // public events only
      .order('occurred_at', { ascending: false })
      .limit(lim)

    if (since) q = q.gt('occurred_at', since)
    if (type && EVENT_TYPE_DB_MAP[type]) q = q.eq('event_type', EVENT_TYPE_DB_MAP[type])

    const { data, error } = await q
    if (error) { res.status(500).json({ error: error.message }); return }

    const events = (data ?? []).map(r => ({
      id:            r.id,
      event:         PUBLIC_NAME_BY_DB[r.event_type] ?? r.event_type,
      occurred_at:   r.occurred_at,
      client_id:     clientId,
      campaign_id:   r.campaign_id ?? null,
      lead_id:       r.lead_id ?? null,
      enrollment_id: r.enrollment_id ?? null,
      channel:       r.channel ?? null,
      data:          r.payload ?? {},
    }))
    res.json({ events, count: events.length })
  } catch (err) {
    console.error('[developer] GET /events', err)
    res.status(500).json({ error: 'Failed to fetch events' })
  }
})

export default router
