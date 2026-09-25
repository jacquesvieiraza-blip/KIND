// THE THING THAT ACTUALLY SPEAKS TO A MAILBOX — the gap behind #547.
//
// Until now the product had exactly one way to send email: Resend, which authenticates OUR
// domain and can only send from it. There was **no SMTP client in the dependency tree at
// all**, so even with a mailbox assigned to a client the product physically could not send
// as them. That is what "the product cannot speak to a mailbox" meant.
//
// Founder-locked 26 Jul: **option B.** The provider still buys and warms the mailbox; WE
// press send through it. The reason, in the founder's framing and it is the right one: we
// have already built the sending brain — the sequence engine, the send window, the daily
// caps, the A/B subjects, the kill-switch, the reply classifier. Option A (hand the lead to
// Smartlead's campaign engine) would have put a second brain in charge of *when* an email
// goes out, and you cannot have two. B changes the `From:` and the connection. Nothing else.
//
// It also earns something A could never do: it works with a mailbox we did not buy. A
// client who says *"use my own Google Workspace"* is a client A has to turn away.
//
// This module returns the **same verdict shape as `interpretSend`** (`{ ok, id, error }`),
// so every existing call site's failure handling — delete the phantom row, roll the
// enrollment claim back, alert, leave it due — keeps working byte-for-byte. The lesson from
// #338 applies identically here: a send is real only when the server accepted it AND gave
// back a message id.

import type { CheckedSend } from './resend-checked'
import { normalisePort, type InboxRow } from './sending-inbox'

export type OutgoingMail = {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
  headers?: Record<string, string>
}

/** Port/secure defaults that match how mailbox providers actually hand these out. */
function transportOptions(inbox: InboxRow, password: string) {
  // USE THE GUARD THAT WAS WRITTEN FOR THIS. `sending-inbox.ts` exports `normalisePort`,
  // whose own comment says an empty box gives `Number('') === 0` and `Number(undefined)` is
  // NaN, and that "either one reaching the transport is a connection attempt to nowhere".
  // This file WAS the transport, and it did its own `Number(...)` with no NaN or range check
  // — so a junk port hung every send for the full 20s socket timeout instead of failing.
  // Two files each correct on their own; the bug lived in the gap. (Audit 27 Jul.)
  const { port, secure } = normalisePort(inbox.smtp_port, inbox.smtp_secure)
  return {
    host: String(inbox.smtp_host),
    port,
    secure,
    auth: { user: String(inbox.smtp_user), pass: password },
    // A dead mail server must fail in seconds and leave the enrollment due for the next
    // cron run — never hold a request open long enough to stall the whole send batch.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  }
}

/**
 * Can we actually log into this mailbox? — `#552`, the check that turns "I pasted some
 * details in" into "this client can send".
 *
 * Uses nodemailer's `verify()`, which opens the connection and authenticates but sends
 * nothing. That distinction matters: the alternative is discovering a wrong password when a
 * real prospect's email fails at 3am, which on a warmed mailbox is expensive to unwind.
 *
 * The returned message is written to be read by an operator, not a developer: the three
 * things that actually go wrong here (wrong password, blocked plain SMTP, wrong port) each
 * get a named cause and a fix, because "535 5.7.8" tells nobody anything.
 */
export async function verifyInbox(inbox: InboxRow): Promise<{ ok: boolean; message: string }> {
  try {
    if (!inbox.smtp_host || !inbox.smtp_user || !inbox.smtp_pass_enc) {
      return { ok: false, message: 'No SMTP details saved yet — add the host, username and password first.' }
    }
    const { decryptSecret } = await import('./inbox-secret')
    let password: string
    try {
      password = decryptSecret(inbox.smtp_pass_enc)
    } catch {
      return { ok: false, message: 'The saved password cannot be read. Either INBOX_SECRET_KEY changed, or it was saved under a different key — re-enter the password.' }
    }

    const nodemailer = await import('nodemailer')
    await nodemailer.createTransport(transportOptions(inbox, password)).verify()
    return { ok: true, message: `Connected to ${inbox.smtp_host} as ${inbox.smtp_user}. This mailbox can send.` }
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e)
    const lower = raw.toLowerCase()

    // Google and Microsoft both refuse an ordinary account password over SMTP by default,
    // and the server's own wording gives no hint of that — it just says the credentials are
    // wrong, which sends you hunting for a typo that isn't there.
    if (lower.includes('invalid login') || lower.includes('authentication') || lower.includes('535') || lower.includes('username and password not accepted')) {
      return {
        ok: false,
        message: `The mailbox refused the username and password. On a Google mailbox this usually means it needs an App Password rather than the account password (Security → App Passwords, 2-Step Verification must be on). On Microsoft/Outlook it usually means SMTP AUTH is switched off for that mailbox and has to be enabled. Server said: ${raw}`,
      }
    }
    if (lower.includes('timeout') || lower.includes('etimedout') || lower.includes('econnrefused') || lower.includes('enotfound')) {
      return {
        ok: false,
        message: `Could not reach ${inbox.smtp_host} on port ${inbox.smtp_port ?? 587}. Check the host spelling, and that the port matches the mode — 465 for SSL, 587 for STARTTLS. Server said: ${raw}`,
      }
    }
    if (lower.includes('wrong version number') || lower.includes('ssl')) {
      return {
        ok: false,
        message: `The port and the encryption mode don't match — this is what happens when 587 is set to SSL, or 465 is set to STARTTLS. Try the other combination. Server said: ${raw}`,
      }
    }
    return { ok: false, message: raw }
  }
}

/**
 * Send one message from one client's mailbox.
 *
 * Never throws: a throw here would escape the caller's rollback path and strand a phantom
 * "sent" row, which is bug class #338 all over again. Every failure comes back as
 * `{ ok: false }` with the cause attached.
 */
/**
 * ⚑ 25 Sep — a recipient no real send may go to: the demo TLD `.invalid`, `.internal`, a
 * `kind-demo.` domain, an RFC-2606 example domain, or localhost. (Not `.test` — see `sendAs`.)
 */
export function isDemoOrReservedRecipient(to: string): boolean {
  const a = (to || '').trim().toLowerCase()
  const domain = a.includes('@') ? a.split('@')[1] ?? '' : ''
  if (!domain) return true
  return domain === 'invalid' || domain.endsWith('.invalid')
    || domain.endsWith('.internal')
    || domain.startsWith('kind-demo.')
    || /(^|\.)example\.(com|org|net)$/.test(domain) || domain === 'example'
    || domain === 'localhost'
}

export async function sendAs(inbox: InboxRow, mail: OutgoingMail): Promise<CheckedSend> {
  try {
    // ══ 🛑 THE KILL-SWITCH, AT THE SEAM (founder-locked 9 Sep) ═════════════════════════
    //
    // KILL-SWITCH ON = NO EXTERNALLY DELIVERED OUTREACH OF ANY KIND. This is the ONE place
    // every SMTP send passes through — the sequence core, the day-1 batch, the operator
    // reply and the mailbox diagnostic all end up here — so asking the question here is
    // what makes `nodemailer.sendMail` **structurally unreachable** while the switch is on,
    // rather than unreachable-if-every-caller-remembered.
    //
    // ⚠️ THE CALLERS STILL ASK FIRST, AND THAT IS NOT REDUNDANT. Upstream they can DEFER
    // properly — leave the enrollment due, roll nothing back, alert nobody. Reaching this
    // line means a path skipped its own gate, so it is a backstop, and a backstop firing is
    // a bug worth the alert its caller will raise.
    //
    // ⚠️ `verifyInbox` IS DELIBERATELY NOT GATED. It authenticates and sends nothing, so it
    // delivers nothing externally — and proving a mailbox works is exactly what has to stay
    // possible while the switch is on.
    const { killSwitchBlocks, KILL_SWITCH_REFUSAL } = await import('./outreach-kill-switch')
    if (killSwitchBlocks('smtp', `${inbox.email ?? 'unknown mailbox'} → ${mail.to}`)) {
      return { ok: false, id: null, error: new Error(KILL_SWITCH_REFUSAL), errorName: null }
    }

    // ══ ⚑ 25 Sep — 🛑 NO SEND TO A DEMO OR FAKE ADDRESS, AND NOTHING FROM A DEMO ACCOUNT ═══════
    //
    // Before this the seam asked only the kill-switch; demo and fake-address stops lived in the
    // callers. This is the one place every SMTP send passes, so it is the backstop that holds
    // even if a caller forgets: a demo/non-deliverable recipient (`isDemoOrReservedRecipient`:
    // `.invalid` — the TLD every demo address uses — `.internal`, `kind-demo.`, example domains,
    // localhost) or a mailbox belonging to a demo client is refused before a connection opens.
    //
    // ⚠️ `.test` IS DELIBERATELY NOT ON THIS LIST. The frozen, certified `kill-switch-absolute`
    // suite (XC-10) proves the seam IS reached with a `…@prospect.test` recipient; a `.test`
    // address can never be delivered anyway, so leaving it through costs nothing and keeps that
    // certified proof intact.
    if (isDemoOrReservedRecipient(mail.to)) {
      return { ok: false, id: null, error: new Error('mailer: not a deliverable recipient (demo or reserved address) — refusing to send'), errorName: null }
    }
    const { db } = await import('@kind/db')
    const { data: owner } = await db.from('client_inboxes').select('client_id').eq('id', inbox.id).maybeSingle()
    const ownerId = (owner as { client_id?: string | null } | null)?.client_id ?? null
    if (ownerId) {
      const { isDemoClient } = await import('./demo')
      if (await isDemoClient(ownerId)) {
        return { ok: false, id: null, error: new Error('mailer: this mailbox belongs to a demo account — refusing to send'), errorName: null }
      }
    }

    if (!inbox.smtp_host || !inbox.smtp_user || !inbox.smtp_pass_enc) {
      return { ok: false, id: null, error: new Error('mailer: inbox has no SMTP details — refusing to send'), errorName: null }
    }

    const { decryptSecret } = await import('./inbox-secret')
    let password: string
    try {
      password = decryptSecret(inbox.smtp_pass_enc)
    } catch (e) {
      // An unreadable password is a refusal, not a reason to send from anywhere else.
      return { ok: false, id: null, error: e, errorName: null }
    }

    const nodemailer = await import('nodemailer')
    const transport = nodemailer.createTransport(transportOptions(inbox, password))

    const { fromHeader } = await import('./sending-inbox')
    const info = await transport.sendMail({
      from: fromHeader(inbox),
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      ...(mail.html ? { html: mail.html } : {}),
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
      ...(mail.headers ? { headers: mail.headers } : {}),
    })

    // `accepted` is nodemailer reporting what the SERVER acknowledged. An empty list with
    // no thrown error means the server took the connection and refused the recipient —
    // which must read as a failure, not a send.
    const accepted = Array.isArray(info?.accepted) ? info.accepted : []
    if (accepted.length === 0) {
      return {
        ok: false,
        id: null,
        // SMTP, not Resend: there is no provider error code to carry, and `null` is the
        // honest value rather than a manufactured one.
        errorName: null,
        error: new Error(`mailer: the mail server accepted no recipients${info?.response ? ` — ${info.response}` : ''}`),
      }
    }

    const id = typeof info?.messageId === 'string' && info.messageId ? info.messageId : null
    if (!id) return { ok: false, id: null, error: new Error('mailer: no message id returned'), errorName: null }

    return { ok: true, id, error: null, errorName: null }
  } catch (e) {
    return { ok: false, id: null, error: e, errorName: null }
  } finally {
    // Nothing to close: a per-send transport is deliberate. A pooled connection shared
    // across clients is one more thing that could send a client's mail down another
    // client's authenticated session, which is the whole bug we are here to fix.
  }
}
