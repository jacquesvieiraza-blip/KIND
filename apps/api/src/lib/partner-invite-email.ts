import { Resend } from 'resend'

// ── THE THREE EMAILS OF THE PARTNER FLOW (R42, 16 Aug) ──────────────────────────────────
//
// Founder-ruled: "i create the partner seat. it should send them an email notifying them …
// once they have this they are notified."
//
// Before this, seat creation sent NOTHING. A person was given a login that reads commission
// money and was never told it existed; the only way in was a "forgot password" nobody had
// mentioned. These are the three moments a human needs to hear from us:
//
//   1. sendPartnerInvite       → her: you have been invited, start here
//   2. sendCountersignAlert    → him: she has signed, it is your turn
//   3. sendPartnerLiveEmail    → her: you are live, here is your link
//
// Every one reports WHAT ACTUALLY HAPPENED and the caller records it. A silent email failure
// on this path means somebody is waiting for a message that is never coming, and neither side
// knows.
//
// ⚠️ 16 Aug — THIS FILE SHIPPED WITH THE EXACT BUG IT CLAIMED TO PREVENT. The first version
// called `await resend.emails.send(...)` and then `return true`. Resend does NOT throw when it
// rejects a send — an unverified sender, a bad address or a rate limit come back as
// `{ data: null, error }` in the RETURN VALUE. So the boolean meant "we called the API and it
// did not crash", never "the email was accepted", and the founder created a seat, was told
// "Invited", and no email existed anywhere.
//
// `alerts.ts` in this same codebase already did it correctly, with a comment spelling out the
// trap: "supabase-js-style clients and Resend RETURN their error — they don't throw it." One
// helper below is now the only place any of these emails are sent, so there is one thing to
// get right instead of three.

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const PARTNERS_FROM = 'K.I.N.D Partners <partners@get-kind.com>'

export type SendResult = { ok: boolean; error?: string }

/**
 * The ONE place these emails are actually sent. Reads Resend's returned error rather than
 * assuming silence means success, and reports the reason so an operator is never told
 * "invited" about an email that does not exist.
 */
async function send(fn: string, to: string, subject: string, html: string): Promise<SendResult> {
  if (!resend) return { ok: false, error: 'RESEND_API_KEY is not set on the API' }
  try {
    const { data, error } = await resend.emails.send({ from: PARTNERS_FROM, to, subject, html })
    if (error) {
      const reason = (error as { message?: string })?.message ?? JSON.stringify(error)
      console.error(`[${fn}] Resend REJECTED the send to ${to}:`, reason)
      return { ok: false, error: reason }
    }
    if (!data?.id) {
      // Accepted with no id is not a send we can claim happened.
      console.error(`[${fn}] Resend returned no message id for ${to}`)
      return { ok: false, error: 'Resend returned no message id' }
    }
    return { ok: true }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error(`[${fn}] send threw for ${to}:`, reason)
    return { ok: false, error: reason }
  }
}

/** The house style already used by the approved-partner email — kept identical on purpose. */
function shell(headline: string, body: string): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#7C3AED;border-radius:12px 12px 0 0;padding:28px 32px">
        <p style="color:#fff;font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px">K.I.N.D Partner Programme</p>
        <h1 style="color:#fff;font-size:1.5rem;font-weight:800;margin:0">${headline}</h1>
      </div>
      <div style="background:#fff;border:1px solid #e9e9e9;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">
        ${body}
      </div>
    </div>`
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#7C3AED;color:#fff;font-size:0.9rem;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">${label}</a>`
}

export async function sendPartnerInvite(o: { name: string; email: string; inviteUrl: string }): Promise<SendResult> {
  return send('partner-invite', o.email, 'Your K.I.N.D Client Partner invitation',
    shell(`Hi ${o.name}, welcome aboard.`, `
      <p style="font-size:0.95rem;color:#444;margin:0 0 20px">
        You have been invited to join K.I.N.D as a <strong>Client Partner</strong>. Setting up
        takes a few minutes: choose a password, tell us where to send your money, then read and
        sign your agreement, NDA and IP terms.
      </p>
      <p style="font-size:0.95rem;color:#444;margin:0 0 24px">
        Once you have signed, it comes back to us to counter-sign — and then you are live and
        can start introducing clients.
      </p>
      <p style="margin:0 0 24px">${button(o.inviteUrl, 'Start your setup →')}</p>
      <p style="font-size:0.82rem;color:#888;margin:0;border-top:1px solid #f0f0f0;padding-top:16px">
        This link is personal to you. If it stops working, reply to this email and we will send
        a new one.
      </p>`))
}

export async function sendCountersignAlert(o: { partnerName: string; vidaUrl: string }): Promise<SendResult> {
  const founderEmail = process.env.FOUNDER_EMAIL
  if (!founderEmail) return { ok: false, error: 'FOUNDER_EMAIL is not set on the API' }
  return send('countersign-alert', founderEmail,
    `${o.partnerName} has signed — your counter-signature is the last step`,
    shell('Awaiting your signature', `
      <p style="font-size:0.95rem;color:#444;margin:0 0 20px">
        <strong>${o.partnerName}</strong> has completed their information pack and signed all
        three documents.
      </p>
      <p style="font-size:0.95rem;color:#444;margin:0 0 24px">
        Nothing is live until you counter-sign: their referral code does not resolve, so they
        cannot land a client yet.
      </p>
      <p style="margin:0">${button(o.vidaUrl, 'Review and counter-sign →')}</p>`))
}

export async function sendPartnerLiveEmail(o: { name: string; email: string; referralLink: string; portalUrl: string; sandboxReady?: boolean }): Promise<SendResult> {
  return send('partner-live', o.email, "You're live — your K.I.N.D referral link is ready",
    shell(`${o.name}, you're live.`, `
      <p style="font-size:0.95rem;color:#444;margin:0 0 20px">
        Both signatures are in and your seat is active. Anyone who signs up through your link
        is attributed to you from this moment.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:24px">
        <tr>
          <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888;width:140px">Your referral link</td>
          <td style="padding:10px 16px;font-size:0.9rem"><a href="${o.referralLink}" style="color:#7C3AED;word-break:break-all">${o.referralLink}</a></td>
        </tr>
      </table>
      <p style="font-size:0.95rem;color:#444;margin:0 0 24px">
        Your portal shows every client you hold, what you have earned and what is due — and
        your signed documents are in the menu under your name.
      </p>
      ${o.sandboxReady ? `<p style="font-size:0.95rem;color:#444;margin:0 0 24px">
        <strong>Your demo environment is ready too.</strong> It is in your portal — a full working
        version of the product, loaded with example leads, so you can show somebody exactly what
        they would be buying instead of describing it.
      </p>` : ''}
      <p style="margin:0">${button(o.portalUrl, 'Open your portal →')}</p>`))
}
