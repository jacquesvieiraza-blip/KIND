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
// Every one returns a BOOLEAN rather than throwing, and the caller records what actually
// happened. A silent email failure on this path means somebody is waiting for a message that
// is never coming, and neither side knows.

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const PARTNERS_FROM = 'K.I.N.D Partners <partners@get-kind.com>'

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

export async function sendPartnerInvite(o: { name: string; email: string; inviteUrl: string }): Promise<boolean> {
  if (!resend) return false
  await resend.emails.send({
    from: PARTNERS_FROM,
    to: o.email,
    subject: 'Your K.I.N.D Client Partner invitation',
    html: shell(`Hi ${o.name}, welcome aboard.`, `
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
      </p>`),
  })
  return true
}

export async function sendCountersignAlert(o: { partnerName: string; vidaUrl: string }): Promise<boolean> {
  const founderEmail = process.env.FOUNDER_EMAIL
  if (!resend || !founderEmail) return false
  await resend.emails.send({
    from: PARTNERS_FROM,
    to: founderEmail,
    subject: `${o.partnerName} has signed — your counter-signature is the last step`,
    html: shell('Awaiting your signature', `
      <p style="font-size:0.95rem;color:#444;margin:0 0 20px">
        <strong>${o.partnerName}</strong> has completed their information pack and signed all
        three documents.
      </p>
      <p style="font-size:0.95rem;color:#444;margin:0 0 24px">
        Nothing is live until you counter-sign: their referral code does not resolve, so they
        cannot land a client yet.
      </p>
      <p style="margin:0">${button(o.vidaUrl, 'Review and counter-sign →')}</p>`),
  })
  return true
}

export async function sendPartnerLiveEmail(o: { name: string; email: string; referralLink: string; portalUrl: string }): Promise<boolean> {
  if (!resend) return false
  await resend.emails.send({
    from: PARTNERS_FROM,
    to: o.email,
    subject: "You're live — your K.I.N.D referral link is ready",
    html: shell(`${o.name}, you're live.`, `
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
      <p style="margin:0">${button(o.portalUrl, 'Open your portal →')}</p>`),
  })
  return true
}
