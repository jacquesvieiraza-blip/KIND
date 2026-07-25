import { db } from '@kind/db'
import { isDemoClient } from './demo'
import { outreachEnabled } from './figsy'
import { COLD_FROM, COLD_REPLY_TO } from './deliverability'

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

  const { Resend: ResendCls } = await import('resend')
  const resendInst = process.env.RESEND_API_KEY ? new ResendCls(process.env.RESEND_API_KEY) : null
  if (!resendInst) return { ok: false, status: 503, error: 'Email sending not configured' }

  // #453 — a demo client must never email a real person.
  if (await isDemoClient(clientId)) {
    console.log(`[demo] prospect send suppressed for client ${clientId} — manual reply to ${reply.from_email} NOT sent (demo).`)
    return { ok: true, sent: false, demo: true }
  }

  // #468 (1) — never email someone who opted out.
  const { data: blocked } = await db.from('opt_out_blocklist')
    .select('email').eq('email', reply.from_email).maybeSingle()
  if (blocked) return { ok: false, status: 409, error: 'This contact opted out — you can’t reply to them.' }

  // #468 (2) — a deliberate kill-switch OFF means OFF, even for a human click.
  if (!outreachEnabled()) {
    return { ok: false, status: 409, error: 'Outreach is paused — the kill-switch (AUTO_OUTREACH_ENABLED) is off. Turn it on to send replies.' }
  }

  const reSubject = reply.subject?.startsWith('Re:') ? reply.subject : `Re: ${reply.subject ?? 'Your enquiry'}`
  // D4 — reply from the cold domain the thread is already on (keeps threading, never leaks
  // the transactional domain into a cold conversation).
  const fromAddr = COLD_FROM

  const { data: sendResult, error: sendError } = await resendInst.emails.send({
    from: fromAddr, reply_to: COLD_REPLY_TO, to: reply.from_email,
    subject: reSubject, text: replyBody,
  })
  if (sendError) throw sendError

  await db.from('figsy_replies').insert({
    client_id: clientId, from_email: fromAddr, subject: reSubject, body: replyBody,
    classification: 'sent_reply', processed_at: new Date().toISOString(), lead_id: reply.lead_id,
  })

  return { ok: true, sent: true, resendId: (sendResult as { id?: string } | null)?.id }
}
