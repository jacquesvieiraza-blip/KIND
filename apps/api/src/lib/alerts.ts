/**
 * Founder alerting (#285/#286) — the admin's first sense. The business ran on
 * "remember to look"; this pushes to the founder when something needs them.
 *
 * Default channel = founder email (Resend, already configured). If SLACK_WEBHOOK_URL
 * is set, it also posts to Slack. Zero config required beyond FOUNDER_EMAIL/RESEND
 * that already exist. Every send is best-effort and never throws into the caller —
 * an alert failing must not break the payment webhook / signup path it rides on.
 *
 * #339 (AR-02) — BLIND-ALARM FIX. This is the stated mitigation for ~15 money-failure
 * paths, so it must not fail silently:
 *   1. resend.emails.send() RETURNS { error } (it does NOT throw on an API-level
 *      failure — bad recipient, rate limit, rotated key). The old try/catch only saw
 *      network throws, so those failures were swallowed. We now CHECK the result.
 *   2. Every alert is written to the durable `founder_alerts` table regardless of push
 *      outcome, so the founder can still see it in admin even if BOTH channels fail.
 *   3. If NOTHING delivered (no email, no Slack) AND the durable write also failed, we
 *      escalate with a loud, greppable console.error — the true last resort.
 */
import { Resend } from 'resend'
import { db } from '@kind/db'

const resend  = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM    = 'K.I.N.D Alerts <hello@get-kind.com>'
const FOUNDER = process.env.FOUNDER_EMAIL || 'hello@get-kind.com'
const SLACK   = process.env.SLACK_WEBHOOK_URL || ''

export type AlertKind = 'payment_failed' | 'new_signup' | 'sends_stalled' | 'api_down' | 'churn_risk' | 'charge_failed' | 'source_down'

export async function sendFounderAlert(kind: AlertKind, subject: string, lines: string[]): Promise<void> {
  const body = lines.filter(Boolean).join('\n')
  const tag = `[${kind}]`

  let emailOk = false
  let slackOk = false

  // ── EMAIL ─────────────────────────────────────────────────────────────────────
  if (resend) {
    try {
      // supabase-js-style clients and Resend RETURN their error — they don't throw it.
      // Treat a returned { error } as a failed send, not a success.
      const { error } = await resend.emails.send({
        from: FROM, to: [FOUNDER], subject: `🔔 ${subject}`, text: `${body}\n\n${tag}`,
      })
      if (error) {
        console.error('[alerts] email send returned error', error)
      } else {
        emailOk = true
      }
    } catch (err) {
      console.error('[alerts] email send threw', err)
    }
  } else {
    // No email transport — still log so the signal is not lost.
    console.warn(`[alerts] (no RESEND_API_KEY) ${subject} — ${body}`)
  }

  // ── SLACK (real fallback, not decoration) ───────────────────────────────────────
  if (SLACK) {
    try {
      const res = await fetch(SLACK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `*🔔 ${subject}*\n${body}\n${tag}` }),
      })
      if (res.ok) slackOk = true
      else console.error('[alerts] slack post non-OK', res.status)
    } catch (err) {
      console.error('[alerts] slack post threw', err)
    }
  }

  // ── DURABLE STORE — always write, so the alert survives even if both pushes fail ──
  let durableOk = false
  try {
    const { error } = await db.from('founder_alerts').insert({
      kind, subject, body, email_ok: emailOk, slack_ok: slackOk,
    })
    if (error) console.error('[alerts] durable insert returned error', error)
    else durableOk = true
  } catch (err) {
    console.error('[alerts] durable insert threw', err)
  }

  // ── LAST RESORT — nothing landed anywhere. Make it loud + greppable. ─────────────
  if (!emailOk && !slackOk && !durableOk) {
    console.error(`[alerts] ⛔ ALERT LOST — no channel delivered: ${tag} ${subject} — ${body}`)
  }
}
