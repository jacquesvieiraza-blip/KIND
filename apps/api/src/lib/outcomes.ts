import { db } from '@kind/db'

/**
 * THE DATA FLOOR (EVERYTHING.md #17b).
 *
 * Append-only logger for every outcome event. This is the raw truth behind the
 * aggregate counters — the one thing we cannot back-fill. The cross-client
 * outcome moat, and one day per-meeting pricing, can only learn from data we
 * start keeping now.
 *
 * RULES:
 * - Append only. There is deliberately no update or delete helper here.
 * - Fire-and-forget. Logging must NEVER block or break the main flow. All
 *   errors are swallowed (logged to console only) — a failed write is better
 *   than a failed reply/booking.
 * - Capture full fidelity. Put the raw detail in `payload`; do not pre-summarise.
 */

export type OutcomeEventType =
  | 'send'
  | 'reply'
  | 'meeting_booked'
  | 'opt_out'
  | (string & {}) // open vocabulary — capture whatever happens, classify later

export interface OutcomeEvent {
  client_id?: string | null
  campaign_id?: string | null
  lead_id?: string | null
  enrollment_id?: string | null
  event_type: OutcomeEventType
  channel?: string | null
  /** Raw, full-fidelity detail: subject, body, reply text, classification, model, timings. */
  payload?: Record<string, unknown>
  occurred_at?: string
}

/**
 * Log a single outcome event. Never throws — safe to call without await in a
 * hot path, or with a floating await; failures are logged and swallowed.
 */
export async function logOutcomeEvent(ev: OutcomeEvent): Promise<void> {
  try {
    await db.from('outcome_events').insert({
      client_id:     ev.client_id ?? null,
      campaign_id:   ev.campaign_id ?? null,
      lead_id:       ev.lead_id ?? null,
      enrollment_id: ev.enrollment_id ?? null,
      event_type:    ev.event_type,
      channel:       ev.channel ?? null,
      payload:       ev.payload ?? {},
      occurred_at:   ev.occurred_at ?? new Date().toISOString(),
    })
  } catch (err) {
    // Never break the caller. A dropped event is acceptable; a broken flow is not.
    console.warn('[outcomes] failed to log outcome event (non-fatal):', err instanceof Error ? err.message : String(err))
  }
}
