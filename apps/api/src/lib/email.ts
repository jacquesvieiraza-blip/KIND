import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'K.I.N.D <hello@get-kind.com>'

export async function sendWelcomeEmail(to: string, companyName: string) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome to K.I.N.D — your 14-day trial has started',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h1 style="font-size:1.5rem;margin-bottom:8px">Welcome, ${companyName} 👋</h1>
        <p style="color:#555;line-height:1.6">Your 14-day free trial has started. Here's what to do next:</p>
        <ol style="color:#555;line-height:2">
          <li>Sign your <strong>Service Agreement</strong> in the Documents tab</li>
          <li>Set up your <strong>Ideal Customer Profile</strong> so we know who to find</li>
          <li>Your first leads will appear within 24 hours</li>
        </ol>
        <a href="https://app.get-kind.com/dashboard"
           style="display:inline-block;margin-top:16px;background:#0066FF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Go to my dashboard →
        </a>
        <p style="color:#999;font-size:0.8rem;margin-top:32px">
          Questions? Reply to this email or book a call at <a href="mailto:hello@get-kind.com">hello@get-kind.com</a>.
        </p>
      </div>
    `,
  })
}

export async function sendConsentEmail(
  to: string,
  firstName: string,
  senderCompanyName: string,
  optOutUrl: string,
) {
  if (!resend) return
  const consentUrl = `${optOutUrl}?consent=true`
  const declineUrl = `${optOutUrl}?consent=false`
  await resend.emails.send({
    from: FROM,
    to,
    subject: `[Action required] ${senderCompanyName} would like to connect`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <p style="line-height:1.6">Hi ${firstName},</p>
        <p style="color:#555;line-height:1.6">
          <strong>${senderCompanyName}</strong> would like your permission to send you B2B communication.
          Under POPIA, they need your consent before reaching out further.
        </p>
        <p style="color:#555;line-height:1.6">
          If you're open to hearing from them, click the button below. You can withdraw consent at any time.
        </p>
        <a href="${consentUrl}"
           style="display:inline-block;margin-top:8px;background:#16a34a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Give Consent
        </a>
        <p style="margin-top:24px">
          <a href="${declineUrl}" style="color:#888;font-size:0.875rem">No thanks, I'd prefer not to be contacted</a>
        </p>
        <p style="color:#bbb;font-size:0.75rem;margin-top:32px;border-top:1px solid #eee;padding-top:16px">
          This email was sent on behalf of ${senderCompanyName} via K.I.N.D.
          If you did not expect this, you can safely ignore it.
        </p>
      </div>
    `,
  })
}

export async function sendFirstLeadsReadyEmail(to: string, companyName: string, leadCount: number) {
  if (!resend) return
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your first ${leadCount} leads are ready — K.I.N.D`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h1 style="font-size:1.5rem;margin-bottom:8px">Your leads are in, ${companyName}!</h1>
        <p style="color:#555;line-height:1.6">
          We've found <strong>${leadCount} leads</strong> that match your Ideal Customer Profile.
          They're scored, ranked, and waiting in your pipeline — ready to contact.
        </p>
        <a href="https://app.get-kind.com/dashboard/leads"
           style="display:inline-block;margin-top:16px;background:#0066FF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          View my leads →
        </a>
        <p style="color:#999;font-size:0.8rem;margin-top:32px">
          Questions? Reply to this email — we're here to help.
        </p>
      </div>
    `,
  })
}
