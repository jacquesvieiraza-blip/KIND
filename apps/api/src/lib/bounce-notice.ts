// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R166 ⑥ · P4, board #2350) — A RETURNED-EMAIL NOTICE IS A BOUNCE, NOT A REPLY.
//
// Cold outreach now leaves from the client's own mailbox over SMTP. When an address is dead,
// the receiving server sends a "delivery failed" notice BACK to that mailbox, which forwards
// inbound mail to us the same way it forwards replies. Until now such a notice would have been
// recorded as a reply from "mailer-daemon" — and the dead address never reached the blocklist,
// because bounces were only captured from Resend's webhook, which SMTP sends never pass through.
//
// This recognises the notice, reads the address that failed, blocklists it as a hard bounce
// (the same record the send path and the bounce-rate hold read), and never files it as a reply.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

const SENDER = /^(mailer-daemon|postmaster|mail-daemon)@/i
const SUBJECT = /(undeliver|delivery status notification \(failure\)|returned to sender|delivery has failed|failure notice|mail delivery (failed|subsystem)|could not be delivered|address not found)/i

/** Is this inbound message a server's delivery-failure notice? Pure. */
export function isBounceNotice(m: { fromEmail: string; subject?: string | null }): boolean {
  if (SENDER.test(String(m.fromEmail ?? '').trim())) return true
  return SUBJECT.test(String(m.subject ?? ''))
}

/**
 * The address that failed, read from the notice. Standard reports carry `Final-Recipient:
 * rfc822; addr` (or `Original-Recipient`); otherwise the first address after a "delivered to"
 * phrase. `null` when it cannot be read with confidence — a guessed address would blocklist a
 * real person.
 */
export function failedRecipient(body: string, exclude: string[] = []): string | null {
  const text = String(body ?? '')
  const skip = new Set(exclude.map(e => e.toLowerCase()))
  const rfc = text.match(/(?:Final|Original)-Recipient:\s*rfc822;\s*<?([^\s<>;]+@[^\s<>;]+)>?/i)
  if (rfc && !skip.has(rfc[1].toLowerCase())) return rfc[1].toLowerCase().replace(/[.,]$/, '')
  const phrase = text.match(/(?:delivered to|delivery to|wasn't delivered to|could not be delivered to|failed to deliver to|recipient address rejected:?|address not found:?)[^A-Za-z0-9<]*<?([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>?/i)
  if (phrase && !skip.has(phrase[1].toLowerCase())) return phrase[1].toLowerCase()
  return null
}

/**
 * Handle a notice: blocklist the failed address as a hard bounce. Returns what happened so the
 * pipeline can drop the message (it is never a reply). An unreadable address alerts a person.
 */
export async function recordBounceNotice(m: { fromEmail: string; toEmail?: string | null; subject?: string | null; body: string }): Promise<'blocklisted' | 'address_unreadable' | 'write_failed'> {
  const addr = failedRecipient(m.body, [m.fromEmail, m.toEmail ?? ''].filter(Boolean))
  if (!addr) {
    const { sendFounderAlert } = await import('./alerts')
    void sendFounderAlert('sends_stalled', 'A bounce notice arrived and the failed address could not be read', [
      `From: ${m.fromEmail} · to mailbox: ${m.toEmail ?? '(unknown)'} · subject: ${m.subject ?? '(none)'}`,
      'It was NOT filed as a reply. Read it in that mailbox and blocklist the address by hand if it is a real bounce.',
    ]).catch(() => {})
    return 'address_unreadable'
  }
  // HC-1 — the stored key goes through the same normaliser every probe uses.
  const { normalizeRevealEmail } = await import('./billing-rules')
  const { error } = await db.from('opt_out_blocklist')
    .upsert({ email: normalizeRevealEmail(addr), reason: 'hard_bounce' }, { onConflict: 'email', ignoreDuplicates: false })
  if (error) {
    console.error(`[bounce-notice] blocklist write FAILED for ${addr} — this address is NOT suppressed:`, error.message)
    return 'write_failed'
  }
  console.warn(`[bounce-notice] ${addr} bounced (notice to ${m.toEmail ?? 'unknown mailbox'}) — blocklisted as hard_bounce.`)
  return 'blocklisted'
}
