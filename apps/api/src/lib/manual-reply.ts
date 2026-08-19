import { db } from '@kind/db'
import { normalizeRevealEmail } from './billing-rules'
import { isDemoClient } from './demo'
import { outreachEnabled } from './figsy'

// MANUAL PROSPECT REPLY — one implementation, two callers.
//
// A human-written reply to a prospect is a REAL outbound prospect send, so it has to pass
// exactly the same gates as the automation (#453 demo suppression, #468 opt-out blocklist +
// kill-switch). It was previously inline in the client route (`POST /figsy/replies/:id/
// send-reply`); the operator now needs it too (Vida's per-client Inbox — "a prospect asks a
// question, WE answer it"). Extracted here rather than copied so a guard can never be
// present on one path and missing on the other.
//
// Auth is the CALLER's job: the client route resolves clientId from the JWT, the operator
// route from an admin-key-gated client_id. This function is always scoped by clientId.
//
// ── #547 — THE LAST SHARED SENDER TO A REAL PROSPECT ─────────────────────────────────────
//
// This file used to send from `COLD_FROM` — the one module-level constant #547 removed from
// the sequence path and left standing here. So after #547 shipped, the automated steps went
// out from each client's own mailbox and a HUMAN reply in the same conversation went out
// from the shared address: the thread visibly changed sender mid-conversation, and every
// client's manual replies pooled their complaints onto one domain. RULEBOOK 12.2 — you
// cannot share a sender across clients; one client's complaints poison the rest.
//
// It now resolves the client's own mailbox and REFUSES when there isn't one. The refusal is
// the point: falling back to the shared address looks like success and lands the damage on
// every other client weeks later, where nobody connects it back.
//
// THREADING NOTE — this is now MORE correct, not less. The prospect is replying to mail that
// left the client's mailbox, so their message arrived AT that mailbox; answering from the
// same one is what keeps the thread intact and what #551's inbox→client→lead routing
// resolves on. The old `COLD_REPLY_TO` header is deliberately gone: pointing replies at our
// shared address would send the prospect's next message to us instead of the mailbox that
// holds the conversation, and a From/Reply-To split across two domains is itself a spam
// signal. With no Reply-To, replies return to the From — the client's mailbox. Correct.

export type ManualReplyResult =
  | { ok: true; sent: true; resendId?: string }
  | { ok: true; sent: false; demo: true }              // demo client — suppressed, not an error
  | { ok: false; status: number; error: string }

export async function sendManualReply(
  replyId: string, clientId: string, replyBody: string,
): Promise<ManualReplyResult> {
  const { data: reply } = await db.from('figsy_replies')
    .select('id, from_email, subject, lead_id, client_id')
    .eq('id', replyId).eq('client_id', clientId).maybeSingle()
  if (!reply) return { ok: false, status: 404, error: 'Reply not found' }

  // RESEND IS NO LONGER THE TRANSPORT HERE. This path used to refuse without
  // RESEND_API_KEY; it now sends over SMTP through the client's own mailbox, so the
  // credential that matters is the mailbox's, checked by `resolveSendingInbox` below.

  // #453 — a demo client must never email a real person.
  if (await isDemoClient(clientId)) {
    console.log(`[demo] prospect send suppressed for client ${clientId} — manual reply to ${reply.from_email} NOT sent (demo).`)
    return { ok: true, sent: false, demo: true }
  }

  // #468 (1) — never email someone who opted out.
  // HC-1 — probe with the NORMALISED address. The From header preserves whatever case the
  // sender typed, so a human clicking reply could reach someone who had opted out.
  const { data: blocked } = await db.from('opt_out_blocklist')
    .select('email').eq('email', normalizeRevealEmail(reply.from_email)).maybeSingle()
  if (blocked) return { ok: false, status: 409, error: 'This contact opted out — you can’t reply to them.' }

  // #468 (2) — a deliberate kill-switch OFF means OFF, even for a human click.
  if (!outreachEnabled()) {
    return { ok: false, status: 409, error: 'Outreach is paused — the kill-switch (AUTO_OUTREACH_ENABLED) is off. Turn it on to send replies.' }
  }

  const reSubject = reply.subject?.startsWith('Re:') ? reply.subject : `Re: ${reply.subject ?? 'Your enquiry'}`

  // #547 — WHOSE MAILBOX DOES THIS LEAVE FROM? Same resolve-or-refuse as the sequence path
  // (figsy.ts). No inbox = no send. There is deliberately nothing to fall back TO.
  const { resolveSendingInbox, refusalLabel } = await import('./sending-inbox')
  const resolved = await resolveSendingInbox(clientId)
  if (!resolved.ok) {
    console.error(`[manual-reply] NOT sending to ${reply.from_email} for client ${clientId} — ${refusalLabel(resolved.reason)}. ${resolved.detail}`)
    // 409, not 500: every one of these is a state an operator can fix, and the message says
    // which. A human is watching this one — they clicked Send — so the reason goes back to
    // the screen rather than only into a log.
    return {
      ok: false,
      status: 409,
      error: `${refusalLabel(resolved.reason)}. ${resolved.detail} Nothing was sent, and nothing fell back to a shared address.`,
    }
  }

  // Sent through the client's OWN mailbox over SMTP. `sendAs` never throws — it returns the
  // same verdict shape as `interpretSend` — so the old `if (sendError) throw sendError` is
  // gone with it: a throw here would have surfaced as a 500 on a button the operator just
  // pressed, with no indication of whether the mail left.
  const { sendAs } = await import('./mailer')
  const sent = await sendAs(resolved.inbox, {
    to: reply.from_email,
    subject: reSubject,
    text: replyBody,
  })
  if (!sent.ok) {
    const detail = sent.error instanceof Error ? sent.error.message : String(sent.error ?? 'unknown error')
    console.error(`[manual-reply] send FAILED to ${reply.from_email} via ${resolved.inbox.email}`, sent.error)
    return {
      ok: false,
      status: 502,
      error: `The mailbox ${resolved.inbox.email} did not accept the message, so nothing was sent. ${detail}`,
    }
  }

  // Recorded against the mailbox it actually left from — the bare address, not the display
  // header, so this column keeps matching `client_inboxes.email`.
  await db.from('figsy_replies').insert({
    client_id: clientId, from_email: resolved.inbox.email, subject: reSubject, body: replyBody,
    classification: 'sent_reply', processed_at: new Date().toISOString(), lead_id: reply.lead_id,
  })

  return { ok: true, sent: true, resendId: sent.id ?? undefined }
}
