import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { z } from 'zod'
import { rateLimit } from '../lib/rate-limit'

// ── THE TWO WEBSITE FORMS, WIRED ─────────────────────────────────────────────────────────
//
// `contact.html` and `get-started.html` shipped with `<button type="button">` and no handler.
// A visitor filled either one in, pressed the button and nothing happened — no request, no
// error, no message. The founder's call, 21 Sep: make them work.
//
// WHY NOT `/api/demo-request`, WHICH ALREADY EXISTS: it requires a `client_id` uuid, so it
// can only be used by somebody who is already a client in the database. The whole point of
// these two forms is the person who is NOT one yet. It also still names the retired
// per-seat products ($49/$29/$39 a month), which is a separate problem.
//
// TWO PLACES, ON PURPOSE. The submission is emailed to the founder AND written to
// `contact_requests`. Email is how he actually finds out; the row is so a Resend outage or a
// spam filter cannot silently lose a lead. Neither one failing may lose the other: the
// insert is attempted first and its failure is logged, not thrown, and the email is sent
// even if the insert failed. A form that reports success while dropping the enquiry is worse
// than the dead button it replaced.

const router = Router()

/** Shared by both forms. `type` decides which shape the rest of the payload takes. */
const base = {
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
}

const contactSchema = z.object({
  ...base,
  type: z.literal('contact'),
  contacting_as: z.string().trim().max(80).optional(),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().max(4000).optional(),
})

const getStartedSchema = z.object({
  ...base,
  type: z.literal('get-started'),
  company: z.string().trim().max(200).optional(),
  website: z.string().trim().max(200).optional(),
  outcome: z.string().trim().max(4000).optional(),
  target: z.string().trim().max(4000).optional(),
  volume: z.string().trim().max(80).optional(),
  when: z.string().trim().max(80).optional(),
})

const schema = z.discriminatedUnion('type', [contactSchema, getStartedSchema])

/**
 * Escape before interpolating into the notification email.
 *
 * The existing public routes (`subscribe`, `demo-request`) drop form input straight into an
 * HTML template. Anyone can type `<img src=x onerror=...>` into a public form, and the
 * founder's mail client is what renders it. The input is untrusted by definition — it came
 * from a stranger on the internet — so it is escaped here rather than trusted there.
 */
export function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type Enquiry = z.infer<typeof schema>

/** The rows of the notification email, in the order the founder wants to read them. */
export function fieldsOf(e: Enquiry): Array<[string, string]> {
  const rows: Array<[string, string | undefined]> = e.type === 'contact'
    ? [
        ['Name', e.name],
        ['Email', e.email],
        ['Contacting as', e.contacting_as],
        ['Subject', e.subject],
        ['Message', e.message],
      ]
    : [
        ['Name', e.name],
        ['Email', e.email],
        ['Company', e.company],
        ['Website', e.website],
        ['Outcome they want', e.outcome],
        ['Who to target', e.target],
        ['Volume', e.volume],
        ['Timing', e.when],
      ]
  return rows.filter((r): r is [string, string] => Boolean(r[1]))
}

/** Everything that is not a first-class column on `contact_requests`, kept as JSON. */
export function detailsOf(e: Enquiry): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [label, value] of fieldsOf(e)) {
    if (label === 'Name' || label === 'Email' || label === 'Company') continue
    out[label] = value
  }
  return out
}

export function emailHtml(e: Enquiry): string {
  const heading = e.type === 'contact' ? 'New contact enquiry' : 'New Get Started enquiry'
  const rows = fieldsOf(e)
    .map(([label, value]) =>
      `<tr><td style="color:#8F8E98;padding:7px 14px 7px 0;font-size:13px;vertical-align:top;white-space:nowrap">${esc(label)}</td>` +
      `<td style="color:#21103F;font-size:13px;vertical-align:top">${esc(value).replace(/\n/g, '<br/>')}</td></tr>`)
    .join('')
  return (
    `<div style="font-family:system-ui,-apple-system,sans-serif;background:#fff;padding:28px;max-width:620px;border:1px solid #E9E6F0">` +
    `<p style="color:#5931FC;font-weight:700;margin:0 0 18px;font-size:14px">${esc(heading)}</p>` +
    `<table style="width:100%;border-collapse:collapse">${rows}</table>` +
    `<p style="margin:22px 0 0;font-size:11px;color:#8F8E98">Sent from the Milla &amp; Vida website. Reply straight to this message to answer them.</p>` +
    `</div>`
  )
}

router.post(
  '/public/enquiry',
  rateLimit({ limit: 5, windowMs: 60_000, key: 'website-enquiry' }),
  async (req, res) => {
    const parse = schema.safeParse(req.body)
    if (!parse.success) {
      return res.status(400).json({ success: false, error: 'Please check the form and try again.' })
    }
    const e = parse.data

    // 1. Persist first. If this throws we still send the email — losing the row is
    //    recoverable from the founder's inbox; losing both is not.
    let stored = false
    try {
      const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false },
      })
      const { error } = await db.from('contact_requests').insert({
        name: e.name,
        email: e.email,
        company: e.type === 'get-started' ? e.company ?? null : null,
        message: e.type === 'contact' ? e.message ?? null : e.outcome ?? null,
        type: e.type,
        details: detailsOf(e),
      })
      if (error) throw error
      stored = true
    } catch (err) {
      console.error('[website-enquiry] could not store the enquiry:', err)
    }

    // 2. Notify. Without a key there is nowhere to send it — say so in the log and, if the
    //    row did not store either, tell the CALLER it failed rather than showing a stranger
    //    a success message for an enquiry that went nowhere.
    if (!process.env.RESEND_API_KEY) {
      console.warn('[website-enquiry] RESEND_API_KEY not set — enquiry not emailed')
      if (!stored) return res.status(503).json({ success: false, error: 'not-delivered' })
      return res.json({ success: true, stored, emailed: false })
    }

    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Milla & Vida <noreply@get-kind.com>',
        to: process.env.FOUNDER_EMAIL || 'hello@get-kind.com',
        replyTo: e.email,
        subject: e.type === 'contact'
          ? `Contact — ${e.name}${e.subject ? `: ${e.subject}` : ''}`
          : `Get Started — ${e.name}${e.company ? ` (${e.company})` : ''}`,
        html: emailHtml(e),
      })
    } catch (err) {
      console.error('[website-enquiry] could not email the enquiry:', err)
      if (!stored) return res.status(503).json({ success: false, error: 'not-delivered' })
      return res.json({ success: true, stored, emailed: false })
    }

    return res.json({ success: true, stored, emailed: true })
  },
)

export default router
