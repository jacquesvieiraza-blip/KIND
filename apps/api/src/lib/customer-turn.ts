// ══════════════════════════════════════════════════════════════════════════════════════════
// J3-C2 · ONCE THEY HAVE SENT IT, WE OWN IT — BEFORE THE MODEL, ON EVERY MILLA DOOR
//
// ── WHERE THIS RULE COMES FROM ──────────────────────────────────────────────────────────
//
// It is LR 17 and it has been built twice already, once per door, because there was nowhere
// to put it: the Brief path writes the customer's turn before the provider (14 Sep, M6), and
// `POST /milla/sessions/:id/chat` does the same (15 Sep, O1), each with its own copy of the
// idempotency shape. This module is that shape, extracted, so a third door cannot be built
// without it and a correction cannot land on one door and miss the others.
//
// ── THE DOOR THAT DID NOT HAVE IT ───────────────────────────────────────────────────────
//
// `POST /icps/chat-build` — the door a PAYING client uses to change their targeting — took
// twenty turns of browser history and persisted nothing. `MillaConversation` sends through
// it and the reply lands in the SAME visible transcript as the session chat, so one
// conversation on one screen had two durability rules:
//
//     session turn  → `milla_messages`, written before the model, fail-closed
//     ICP turn      → nothing at all
//
// 🛑 AND THE CLIENT CANNOT TELL WHICH TURN IS WHICH. They reload after a provider wobble and
// half of their conversation is there. The founder's rule is that OUR failure never costs
// them their words; "half their words" is the same failure with a smaller blast radius.
//
// ── THE THREE PROPERTIES, AND WHY EACH ONE IS NOT NEGOTIABLE ────────────────────────────
//
// ① BEFORE THE MODEL. A provider 529, a timeout or an interrupted response must not end with
//    nothing of theirs stored. Afterwards is too late by exactly the window that fails.
// ② IDEMPOTENT ON THE CALLER'S ID. A retry of the same send replays the same primary key;
//    `23505` is Postgres refusing the duplicate and means ALREADY OWNED, which is success.
//    Without this, "retry once" doubles the client's sentence in their own transcript.
// ③ FAIL-CLOSED. If the turn cannot be stored we do not call the model. Answering a question
//    we did not manage to record is how a conversation silently loses a turn — and the
//    client's own composer still holds the sentence to try again.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto'
import { db } from '@kind/db'

/**
 * 🛑 THE ID OF MILLA'S ANSWER TO ONE CUSTOMER TURN — derived, never random.
 *
 * ⚑ 15 Sep (O1 durability). One sentence may have exactly one stored answer, however many
 * times the send is replayed after an ambiguous failure. Deriving the reply's primary key
 * from the customer row's makes that a property of the table rather than of the caller's
 * retry discipline, and it costs one hash instead of a migration or a second column.
 *
 * ⚠️ IT IS A FORMATTING OF A DIGEST, NOT A SECURITY BOUNDARY. Nothing is authorised by this
 * value; it identifies a row whose session and client are checked separately by the caller.
 */
export function replyRowIdFor(userRowId: string): string {
  const h = createHash('sha256').update(`${userRowId}:milla-reply`).digest('hex')
  // Shape it as a v4-looking UUID so the column's type is satisfied.
  const v = h.slice(0, 32).split('')
  v[12] = '4'
  v[16] = '89ab'[parseInt(h[16], 16) & 0x3]
  const s = v.join('')
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`
}

/**
 * ⚑ 25 Sep (R162) — THE ROW ID OF ONE SAVED MILLA NOTICE: derived from the thread, the notice's
 * key and the line's position, so saving the same notice twice (two tabs, a retry) writes it once.
 */
export function noticeRowIdFor(sessionId: string, key: string, index: number): string {
  return replyRowIdFor(`${sessionId}:notice:${key}:${index}`)
}

export type OwnTurnResult =
  /** The row is ours. `alreadyOwned` means a previous attempt stored it — success, not failure. */
  | { ok: true; userRowId: string; assistantRowId: string; alreadyOwned: boolean }
  /** It could not be stored. The caller must NOT call the model. */
  | { ok: false; error: string }

/**
 * Take ownership of one customer turn, before anything is asked of a provider.
 *
 * ⚠️ IT DOES NOT DECIDE THE ID. The caller passes the client's own `messageId` when there is
 * one, because the identity of a retry is the browser's fact, not ours — `millaSendIdentity`
 * is where that decision lives and there must not be a second one.
 */
export async function ownCustomerTurn(input: {
  sessionId: string
  clientId: string
  content: string
  /** The caller's id for this sentence. A replay MUST pass the same one. */
  userRowId: string
}): Promise<OwnTurnResult> {
  const assistantRowId = replyRowIdFor(input.userRowId)
  try {
    const { error } = await db.from('milla_messages').insert({
      id:         input.userRowId,
      session_id: input.sessionId,
      client_id:  input.clientId,
      role:       'user',
      content:    input.content,
      sources:    null,
    })
    const alreadyOwned = (error as { code?: string } | null)?.code === '23505'
    if (error && !alreadyOwned) {
      return { ok: false, error: (error as { message?: string }).message ?? String(error) }
    }
    return { ok: true, userRowId: input.userRowId, assistantRowId, alreadyOwned }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * The answer that already exists for this turn, if one does.
 *
 * 🛑 A RETRY OF A SEND THAT ALREADY SUCCEEDED REPLAYS THE ANSWER — IT DOES NOT RE-ASK. Without
 * it, an ambiguous failure after a COMPLETE turn spends a second model call and leaves the
 * client with two Milla replies to one sentence.
 */
export async function existingReply(
  assistantRowId: string,
): Promise<{ content: string; sources: unknown } | null> {
  try {
    const { data } = await db.from('milla_messages')
      .select('content, sources').eq('id', assistantRowId).maybeSingle()
    const row = data as { content?: string; sources?: unknown } | null
    return row?.content ? { content: row.content, sources: row.sources ?? [] } : null
  } catch { return null }
}

/**
 * Store Milla's answer to a turn we already own.
 *
 * ⚠️ BEST-EFFORT BY DESIGN, WHICH IS THE OPPOSITE OF THE CUSTOMER'S TURN AND DELIBERATELY SO.
 * The client has their answer on screen; failing the request now would tell them the exchange
 * did not happen when it did. Their words — the half we cannot reproduce — are already safe.
 */
export async function storeMillaReply(input: {
  assistantRowId: string
  sessionId: string
  clientId: string
  content: string
  sources?: unknown[]
}): Promise<void> {
  try {
    await db.from('milla_messages').insert({
      id:         input.assistantRowId,
      session_id: input.sessionId,
      client_id:  input.clientId,
      role:       'assistant',
      content:    input.content,
      sources:    (input.sources?.length ?? 0) > 0 ? input.sources : null,
    })
  } catch (e) {
    console.error(`[customer-turn] Milla's reply for ${input.assistantRowId} was not stored:`, e)
  }
}
