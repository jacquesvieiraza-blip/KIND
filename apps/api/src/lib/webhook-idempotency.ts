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
 * The db shape `releaseWebhookEvent` needs: a delete narrowed by two equalities.
 *
 * Kept separate from `IdempotencyDb` so the dedup guard's own contract does not widen — the
 * guard can still only INSERT, which is the point of it.
 */
export type ReleasableDb = {
  from: (table: string) => {
    delete: () => {
      eq: (col: string, val: unknown) => {
        eq: (col: string, val: unknown) => PromiseLike<{ error: { code?: string; message?: string } | null }>
      }
    }
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

/**
 * ⚑ 17 Sep — HAND ONE DEDUP CLAIM BACK, SO THE PROVIDER REDELIVERS.
 *
 * ── 🛑 WHAT THIS IS FOR, AND IT IS EXACTLY ONE CASE ────────────────────────────────────
 *
 * The dedup claim above is taken BEFORE the reply is processed, which is correct: it is what
 * stops a Svix retry re-running a hot reply and pushing a second CRM deal. But it also means
 * the claim is a PROMISE — "we have this event" — and if we then fail to retain an ambiguous
 * reply durably, the promise is false. The provider will never send it again, and the reply is
 * gone. So in that one case the claim is released and the route answers 500, which is how a
 * webhook asks to be redelivered.
 *
 * ⚠️ IT DOES NOT WEAKEN IDEMPOTENCY. It is not a general "forget this event" — it is called
 * only on the retention-failure path, before anything client-visible has been written, so
 * there is nothing for a redelivery to duplicate. Every other outcome (processed, deduped,
 * dropped, refused) keeps its claim.
 *
 * ⚠️ AND IT IS NARROWED BY BOTH COLUMNS. `event_id` is the primary key, so id alone would be
 * exact — matching `source` too means a wrong-provider argument deletes nothing rather than
 * releasing a different provider's claim that happens to share an id.
 *
 * ⚠️ A FAILED RELEASE IS REPORTED, NOT SWALLOWED. If the claim cannot be handed back, the
 * caller must still refuse the webhook — but a redelivery will then be deduped, so the reply
 * really is lost and that has to be loud rather than inferred from silence.
 */
export async function releaseWebhookEvent(
  db: ReleasableDb,
  eventId: string | string[] | undefined | null,
  source: string,
): Promise<boolean> {
  const id = (Array.isArray(eventId) ? eventId[0] : eventId ?? '').trim()
  if (!id) return true // nothing was ever claimed (no stable id), so nothing to release

  try {
    const { error } = await db.from('processed_webhook_events').delete()
      .eq('event_id', id).eq('source', source)
    if (error) {
      console.error(`[webhook-idempotency] ⛔ COULD NOT RELEASE the dedup claim for ${source}:${id} — a redelivery of this event will be treated as a duplicate:`, error.message)
      return false
    }
    console.warn(`[webhook-idempotency] released the dedup claim for ${source}:${id} so the provider redelivers.`)
    return true
  } catch (e) {
    console.error(`[webhook-idempotency] ⛔ RELEASE THREW for ${source}:${id} — a redelivery will be treated as a duplicate:`, e)
    return false
  }
}
