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
