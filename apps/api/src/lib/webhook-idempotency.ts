// #264 — inbound-webhook idempotency guard.
//
// Resend delivers inbound events through Svix, which RETRIES the same event
// (same `svix-id`) on any non-2xx or timeout. The signature is verified, so a
// retried payload is authentic — and without a dedup guard it re-runs the whole
// hot-reply path: a second CRM deal push AND a second Paystack auto-top-up charge
// (a real double charge). We record each delivery's stable id and skip any id we
// have already processed.
//
// FAIL OPEN: the only "duplicate" signal is a genuine unique-constraint violation
// (Postgres 23505). Every other outcome — a not-yet-migrated table, a transient
// error, a thrown exception, or a missing id — returns `false` (process it), so
// this can never silently DROP a legitimate reply.

export type IdempotencyDb = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: { code?: string; message?: string } | null }>
  }
}

/**
 * Returns true if this exact webhook delivery was already processed (caller should
 * skip and 200). Returns false when the event is new OR when we cannot prove it is
 * a duplicate (fail open).
 */
export async function isDuplicateWebhookEvent(
  db: IdempotencyDb,
  eventId: string | string[] | undefined | null,
  source: string,
): Promise<boolean> {
  const id = (Array.isArray(eventId) ? eventId[0] : eventId ?? '').trim()
  if (!id) return false // no stable id (e.g. flat manual-test payload) → can't dedup → process

  try {
    const { error } = await db.from('processed_webhook_events').insert({ event_id: id, source })
    if (!error) return false                 // fresh insert → new event → process
    if (error.code === '23505') return true  // unique violation → already processed → skip
    // Any other error (table not migrated yet, transient failure) → fail open.
    console.error('[webhook-idempotency] insert error (processing anyway):', error.message)
    return false
  } catch (e) {
    console.error('[webhook-idempotency] threw (processing anyway):', e)
    return false
  }
}
