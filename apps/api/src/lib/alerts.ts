/**
 * Founder alerting (#285/#286) — the admin's first sense. The business ran on
 * "remember to look"; this pushes to the founder when something needs them.
 *
 * Default channel = founder email (Resend, already configured). If SLACK_WEBHOOK_URL
 * is set, it also posts to Slack. Zero config required beyond FOUNDER_EMAIL/RESEND
 * that already exist. Every send is best-effort and never throws into the caller —
 * an alert failing must not break the payment webhook / signup path it rides on.
 */
import { Resend } from 'resend'

const resend  = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM    = 'K.I.N.D Alerts <hello@get-kind.com>'
const FOUNDER = process.env.FOUNDER_EMAIL || 'hello@get-kind.com'
const SLACK   = process.env.SLACK_WEBHOOK_URL || ''

export type AlertKind = 'payment_failed' | 'new_signup' | 'sends_stalled' | 'api_down' | 'churn_risk' | 'charge_failed' | 'source_down'

export async function sendFounderAlert(kind: AlertKind, subject: string, lines: string[]): Promise<void> {
  const body = lines.filter(Boolean).join('\n')
  const tag = `[${kind}]`

  if (resend) {
    try {
      await resend.emails.send({ from: FROM, to: [FOUNDER], subject: `🔔 ${subject}`, text: `${body}\n\n${tag}` })
    } catch (err) {
      console.error('[alerts] email send failed', err)
    }
  } else {
    // No email transport — still log so the signal is not lost.
    console.warn(`[alerts] (no RESEND_API_KEY) ${subject} — ${body}`)
  }

  if (SLACK) {
    try {
      await fetch(SLACK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `*🔔 ${subject}*\n${body}\n${tag}` }),
      })
    } catch (err) {
      console.error('[alerts] slack post failed', err)
    }
  }
}
