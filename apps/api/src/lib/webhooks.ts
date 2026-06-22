import crypto from 'crypto'
import { db } from '@kind/db'
import type { OutcomeEvent } from './outcomes'

/**
 * OUTBOUND WEBHOOKS + ZAPIER/MAKE-FRIENDLY EVENT PUSH (PRODUCT-INVENTORY #182, #185).
 *
 * The OUTBOUND direction of our event system: when a customer-facing event
 * happens (lead delivered · reply received · meeting booked · opt-out) we POST a
 * stable JSON payload to every webhook endpoint the client has registered. This
 * is what lets Zapier / Make / n8n / Slack consume our events with zero custom
 * connector work — they each accept a plain inbound webhook URL.
 *
 * DESIGN RULES (mirrors lib/outcomes.ts):
 * - Fire-and-forget. Delivery must NEVER block or break the main flow. Every
 *   error is swallowed (logged to console only) — a missed webhook is far better
 *   than a failed reply/booking.
 * - Safe before migration. The webhook_endpoints table is FLAGGED, not yet
 *   migrated on the live DB (see migrations/20260622_webhook_endpoints.sql). If
 *   the table does not exist, the lookup fails softly and we no-op — so shipping
 *   this code is risk-free even before the table lands.
 * - Client-scoped. We only ever read endpoints for ev.client_id and only send
 *   that client's own event. No cross-client leakage.
 * - Signed. Each delivery carries an HMAC-SHA256 signature of the raw body in
 *   `X-Kind-Signature` so receivers can verify authenticity against their secret.
 */

/** Public, customer-facing event names (the stable contract for Zapier/Make). */
export type PublicEventType =
  | 'lead.delivered'   // a lead was enrolled / first touch sent
  | 'reply.received'   // a prospect replied
  | 'meeting.booked'   // a meeting was booked
  | 'opt_out'          // a prospect opted out

/**
 * Map an internal outcome event_type → the public, stable webhook event name.
 * Internal vocabulary is deliberately open (lib/outcomes.ts); the OUTBOUND
 * contract is closed and stable so integrations never break.
 */
const EVENT_NAME_MAP: Record<string, PublicEventType> = {
  send:           'lead.delivered',
  reply:          'reply.received',
  meeting_booked: 'meeting.booked',
  opt_out:        'opt_out',
}

/** The events we actually push outbound. Anything else is internal-only. */
export function publicEventName(internalType: string): PublicEventType | null {
  return EVENT_NAME_MAP[internalType] ?? null
}

interface WebhookEndpointRow {
  id: string
  client_id: string
  url: string
  secret: string | null
  event_types: string[] | null   // null/empty = all events
  active: boolean
}

/**
 * The stable outbound payload shape. THIS IS THE PUBLIC CONTRACT — keep it
 * additive-only. Zapier/Make/Slack map directly off these fields.
 *
 *   {
 *     "event":        "meeting.booked",          // stable event name
 *     "occurred_at":  "2026-06-22T10:00:00.000Z",// ISO-8601 UTC timestamp
 *     "client_id":    "uuid",                     // YOUR client id (scope)
 *     "campaign_id":  "uuid" | null,
 *     "lead_id":      "uuid" | null,
 *     "enrollment_id":"uuid" | null,
 *     "channel":      "email" | "calendar" | ...,
 *     "data":         { ...full-fidelity detail... }
 *   }
 */
export interface OutboundWebhookPayload {
  event: PublicEventType
  occurred_at: string
  client_id: string | null
  campaign_id: string | null
  lead_id: string | null
  enrollment_id: string | null
  channel: string | null
  data: Record<string, unknown>
}

export function buildOutboundPayload(ev: OutcomeEvent, event: PublicEventType): OutboundWebhookPayload {
  return {
    event,
    occurred_at:   ev.occurred_at ?? new Date().toISOString(),
    client_id:     ev.client_id ?? null,
    campaign_id:   ev.campaign_id ?? null,
    lead_id:       ev.lead_id ?? null,
    enrollment_id: ev.enrollment_id ?? null,
    channel:       ev.channel ?? null,
    data:          ev.payload ?? {},
  }
}

/** HMAC-SHA256 of the raw body, hex-encoded — sent as X-Kind-Signature. */
export function signPayload(rawBody: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
}

async function postWithTimeout(url: string, body: string, headers: Record<string, string>, ms = 8000): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    await fetch(url, { method: 'POST', headers, body, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Deliver an outcome event to all of the client's registered webhook endpoints.
 *
 * Fire-and-forget: call with `void deliverWebhooks(ev)` — it never throws. Safe
 * to run before the webhook_endpoints table exists (it simply finds nothing).
 */
export async function deliverWebhooks(ev: OutcomeEvent): Promise<void> {
  try {
    if (!ev.client_id) return
    const event = publicEventName(String(ev.event_type))
    if (!event) return // internal-only event type — never pushed outbound

    const { data, error } = await db
      .from('webhook_endpoints')
      .select('id, client_id, url, secret, event_types, active')
      .eq('client_id', ev.client_id)
      .eq('active', true)

    // Table missing (pre-migration) or query failed → soft no-op.
    if (error || !data || data.length === 0) return

    const payload = buildOutboundPayload(ev, event)
    const rawBody = JSON.stringify(payload)

    await Promise.allSettled(
      (data as WebhookEndpointRow[])
        // event_types null/empty = subscribe to all; otherwise must include this event
        .filter(ep => !ep.event_types || ep.event_types.length === 0 || ep.event_types.includes(event))
        .map(ep => {
          const headers: Record<string, string> = {
            'Content-Type':       'application/json',
            'User-Agent':         'KIND-Webhooks/1.0',
            'X-Kind-Event':       event,
            'X-Kind-Delivery':    crypto.randomUUID(),
          }
          if (ep.secret) headers['X-Kind-Signature'] = signPayload(rawBody, ep.secret)
          return postWithTimeout(ep.url, rawBody, headers).catch(err => {
            console.warn(`[webhooks] delivery to ${ep.url} failed (non-fatal):`, err instanceof Error ? err.message : String(err))
          })
        }),
    )
  } catch (err) {
    // Never break the caller. A dropped webhook is acceptable; a broken flow is not.
    console.warn('[webhooks] deliverWebhooks failed (non-fatal):', err instanceof Error ? err.message : String(err))
  }
}
