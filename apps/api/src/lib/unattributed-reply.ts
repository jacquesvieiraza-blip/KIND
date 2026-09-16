// ⚑ 17 Sep — THE DURABLE HOME FOR A REPLY WE REFUSED TO ATTRIBUTE.
//
// ── 🛑 WHAT THIS FIXES, AND IT IS THE HALF THE FAN-OUT FIX CREATED ─────────────────────
//
// 16 Sep stopped one external reply becoming two clients' inbound mail. Correct — and the
// ambiguous reply then had nowhere to go. The body is fetched from Resend's API into a local
// variable (their `email.received` webhook is metadata-only), the dedup ledger stores an id
// and a source, the route answered 200, and the content was gone. The provider never
// redelivers, because 200 told it we had the event.
//
// So this module owns four acts and nothing else:
//
//   · `retainUnattributedReply`  — persist the complete inbound before anyone is told
//   · `openUnattributedReplies`  — what is still waiting on a person (the operator feed)
//   · `claimUnattributedReply`   — one worker may attribute it; two pressing cannot both
//   · `settleUnattributedReply`  — record the outcome, or release the claim on failure
//
// ⚠️ IT DECIDES NOTHING ABOUT OWNERSHIP. `routeReply` remains the only code that decides who
// a reply belongs to, and this module never guesses, never ranks, and never reads a date to
// break a tie. It stores candidates and it stores what a human chose.
//
// ⚠️ AND `founder_alerts` IS NOT THE AUTHORITY. The alert stays as secondary notification —
// it has no reader anywhere in the product, which is exactly why it cannot be the recovery
// mechanism. The authority is this table, read by Vida's existing operator feed.

import { db } from '@kind/db'

/** A retained reply, as the operator feed and the resolve path read it. */
export type UnattributedReply = {
  id: string
  provider: string
  provider_event_key: string | null
  from_email: string
  from_name: string | null
  to_email: string | null
  subject: string | null
  body: string
  raw_payload: Record<string, unknown> | null
  candidate_client_ids: string[]
  candidate_lead_ids: string[]
  received_at: string
  resolve_claimed_at: string | null
  resolved_at: string | null
}

/** What `retainUnattributedReply` is handed. Every field is evidence, not a derivation. */
export type RetentionInput = {
  provider: string
  providerEventKey: string | null
  fromEmail: string
  fromName: string | null
  toEmail: string | null
  subject: string | null
  body: string
  rawPayload: Record<string, unknown> | null
  candidateClientIds: string[]
  candidateLeadIds: string[]
}

export type RetentionResult =
  | { ok: true; id: string; already: boolean }
  | { ok: false; detail: string }

/** Postgres unique violation — here it means this exact provider event is already retained. */
function isUniqueViolation(e: { code?: string | null; message?: string | null } | null): boolean {
  if (!e) return false
  return e.code === '23505' || /duplicate key|unique constraint/i.test(e.message ?? '')
}

const dedupe = (ids: string[]): string[] => [...new Set(ids.filter(Boolean))]

/**
 * Persist an ambiguous inbound reply in full.
 *
 * 🛑 THE CALLER MUST NOT REPORT SUCCESS UNTIL THIS HAS. That is the entire contract: a 200
 * to the provider is a promise that we have the event, and making that promise without the
 * content is how the reply was lost. A failure here is a 500 and a released dedup claim, so
 * the provider redelivers.
 *
 * ⚠️ A REDELIVERY IS `already: true`, NOT AN ERROR. The unique index on
 * (provider, provider_event_key) makes a replay idempotent, so a second delivery of the same
 * event finds the row already there and the caller may legitimately answer 200 — the evidence
 * is retained, which is all the promise ever meant.
 */
export async function retainUnattributedReply(input: RetentionInput): Promise<RetentionResult> {
  // ⚠️ AN EMPTY BODY IS NOT RETAINABLE EVIDENCE, and the column says so (NOT NULL). It cannot
  // happen on this path — `isUnusable` already refused a body-less reply well before routing —
  // but a retention row a human cannot read would be a false record of safety.
  if (!input.body || input.body.trim() === '') {
    return { ok: false, detail: 'the reply had no readable body, so there was nothing to retain' }
  }
  try {
    const { data, error } = await db.from('unattributed_replies').insert({
      provider: input.provider,
      provider_event_key: input.providerEventKey,
      from_email: input.fromEmail,
      from_name: input.fromName,
      to_email: input.toEmail,
      subject: input.subject,
      body: input.body,
      raw_payload: input.rawPayload,
      candidate_client_ids: dedupe(input.candidateClientIds),
      candidate_lead_ids: dedupe(input.candidateLeadIds),
    }).select('id').single()

    if (error) {
      if (isUniqueViolation(error)) {
        // Already retained by an earlier delivery of this same event. Find it so the caller
        // can name it, but the retention promise is already kept either way.
        const { data: existing } = await db.from('unattributed_replies')
          .select('id').eq('provider', input.provider)
          .eq('provider_event_key', input.providerEventKey ?? '')
          .limit(1).maybeSingle()
        return { ok: true, id: String((existing as { id?: string } | null)?.id ?? ''), already: true }
      }
      return { ok: false, detail: error.message }
    }
    return { ok: true, id: String((data as { id: string }).id), already: false }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'the reply could not be retained' }
  }
}

/**
 * Every retained reply still waiting on a person.
 *
 * ⚠️ AN ERROR IS NOT AN EMPTY QUEUE, and the caller is given the difference. supabase-js
 * resolves with `{ data: null, error }` for a missing table — which is exactly the state while
 * this migration is unapplied — so returning `[]` would make a broken read indistinguishable
 * from "nobody is waiting". That silence is the defect the whole ticket is about.
 */
export async function openUnattributedReplies(limit = 200): Promise<{
  rows: UnattributedReply[]
  degraded: string | null
}> {
  try {
    const { data, error } = await db.from('unattributed_replies')
      .select('id, provider, provider_event_key, from_email, from_name, to_email, subject, body, raw_payload, candidate_client_ids, candidate_lead_ids, received_at, resolve_claimed_at, resolved_at')
      .is('resolved_at', null)
      .order('received_at', { ascending: true })
      .limit(limit)
    if (error) {
      return {
        rows: [],
        degraded: `Unattributed inbound replies could not be checked, so an empty list here does NOT mean none are waiting. Check whether 20260917_unattributed_replies has been run (Vida → Engine). Reason: ${error.message}`,
      }
    }
    return { rows: (data ?? []) as UnattributedReply[], degraded: null }
  } catch (err) {
    return {
      rows: [],
      degraded: `Unattributed inbound replies could not be checked (${err instanceof Error ? err.message : String(err)}). An empty list here does NOT mean none are waiting.`,
    }
  }
}

/** One retained reply by id, whatever its state. Used by both operator actions. */
export async function getUnattributedReply(id: string): Promise<
  { ok: true; row: UnattributedReply | null } | { ok: false; detail: string }
> {
  try {
    const { data, error } = await db.from('unattributed_replies')
      .select('id, provider, provider_event_key, from_email, from_name, to_email, subject, body, raw_payload, candidate_client_ids, candidate_lead_ids, received_at, resolve_claimed_at, resolved_at')
      .eq('id', id).limit(1).maybeSingle()
    if (error) return { ok: false, detail: error.message }
    return { ok: true, row: (data as UnattributedReply | null) ?? null }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'the retained reply could not be read' }
  }
}

export type ClaimResult =
  | { ok: true }
  | { ok: false; reason: 'already_resolved' | 'already_claimed' | 'unreadable'; detail: string }

/**
 * Take the exclusive right to attribute this reply.
 *
 * 🛑 THIS IS WHY THERE ARE TWO COLUMNS AND NOT ONE. Writing `resolved_at` up front would mean
 * a failed attribution leaves a resolved exception with no reply — invisible, and the reply
 * lost for a second time. Writing it only at the end would let two operators pressing at once
 * both write a reply. The claim is compare-and-set on `resolve_claimed_at IS NULL`, so exactly
 * one caller proceeds, and `settleUnattributedReply` either records the outcome or hands the
 * claim back.
 *
 * ⚠️ A CLAIMED ROW IS STILL VISIBLE. The operator feed reads `resolved_at IS NULL`, so an
 * exception whose attribution is mid-flight — or whose final write failed — stays on screen
 * rather than disappearing into a held claim.
 */
export async function claimUnattributedReply(id: string, by: string | null): Promise<ClaimResult> {
  try {
    const { data, error } = await db.from('unattributed_replies')
      .update({ resolve_claimed_at: new Date().toISOString(), resolve_claimed_by: by ?? null })
      .eq('id', id)
      .is('resolved_at', null)
      .is('resolve_claimed_at', null)
      .select('id')
    // ⚠️ AN ERROR IS NOT A LOST RACE. A returned error means we do not know whether we hold
    // the claim, and proceeding on "we do not know" is how a second reply gets written.
    if (error) return { ok: false, reason: 'unreadable', detail: error.message }
    if ((data ?? []).length > 0) return { ok: true }

    // Zero rows: either it is already resolved, or another caller holds the claim. The two
    // read very differently to an operator, so they are told apart rather than merged.
    const current = await getUnattributedReply(id)
    if (!current.ok) return { ok: false, reason: 'unreadable', detail: current.detail }
    if (!current.row) return { ok: false, reason: 'unreadable', detail: 'no such retained reply' }
    if (current.row.resolved_at) {
      return { ok: false, reason: 'already_resolved', detail: 'this reply has already been attributed or discarded' }
    }
    return {
      ok: false, reason: 'already_claimed',
      detail: `another attribution of this reply is in progress or did not finish (claimed ${current.row.resolve_claimed_at}). It is still open and still visible; it was NOT attributed twice.`,
    }
  } catch (err) {
    return { ok: false, reason: 'unreadable', detail: err instanceof Error ? err.message : 'the claim could not be taken' }
  }
}

/** Hand the claim back, so a failed attribution leaves the exception exactly as it was. */
export async function releaseUnattributedClaim(id: string): Promise<{ ok: boolean; detail?: string }> {
  try {
    const { error } = await db.from('unattributed_replies')
      .update({ resolve_claimed_at: null, resolve_claimed_by: null })
      .eq('id', id).is('resolved_at', null)
    if (error) return { ok: false, detail: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : 'the claim could not be released' }
  }
}

/**
 * Record the outcome. Called ONLY after the work it describes actually happened.
 *
 * ⚠️ `attributed` REQUIRES THE CLIENT, and the table's CHECK constraint enforces it too — an
 * attributed row with no client would be the guess this table exists to prevent, wearing the
 * clothes of a human decision.
 */
export async function settleUnattributedReply(a: {
  id: string
  resolution: 'attributed' | 'discarded'
  clientId: string | null
  by: string | null
}): Promise<{ ok: boolean; changed: boolean; detail?: string }> {
  try {
    const { data, error } = await db.from('unattributed_replies')
      .update({
        resolved_at: new Date().toISOString(),
        resolution: a.resolution,
        resolved_client_id: a.resolution === 'attributed' ? a.clientId : null,
        resolved_by: a.by ?? null,
      })
      .eq('id', a.id).is('resolved_at', null).select('id')
    if (error) return { ok: false, changed: false, detail: error.message }
    return { ok: true, changed: (data ?? []).length > 0 }
  } catch (err) {
    return { ok: false, changed: false, detail: err instanceof Error ? err.message : 'the outcome could not be recorded' }
  }
}

/**
 * The event key a human-resolved reply is written under.
 *
 * 🛑 THE DATABASE IS THE LAST BACKSTOP AGAINST A DUPLICATE. `figsy_replies` carries a partial
 * unique index on `provider_event_key`, so keying the resolved reply on the RETENTION ROW's id
 * means a second attempt — a retry after a half-finished settle, an operator pressing again —
 * is refused by Postgres rather than by our own bookkeeping alone.
 *
 * ⚠️ NOT the provider's original key. That one is already on the dedup ledger for the ingest
 * that refused; reusing it would conflate "we received this" with "a human attributed this".
 */
export function resolvedReplyEventKey(retentionId: string): string {
  return `unattributed:${retentionId}`
}

/**
 * The operator-facing label for one candidate client.
 *
 * ⚠️ IT DELIBERATELY CARRIES NO REPLY BODY. This string lands in a chip row in Vida beside
 * every other alert for that client; an inbound message from a stranger is not something to
 * render into a shared list. The sender, the count and the id are what an operator needs to
 * decide; the content is read on the surface that opens it.
 */
export function unattributedAlertLabel(a: { fromEmail: string; candidateCount: number }): string {
  return `Reply from ${a.fromEmail} could not be attributed — ${a.candidateCount} clients hold this person. Attribute it or discard it.`
}
