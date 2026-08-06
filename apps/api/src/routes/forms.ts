// R12 (#83, ClickUp) — Embeddable lead-capture forms.
// A public, unauthenticated endpoint that turns a website form submission into a
// scored lead in the client's pipeline. Paired with a copy-paste snippet shown
// in Settings. Mounted in index.ts: app.use('/forms', formsRouter)

import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'

export const formsRouter = Router()

// In-memory rate limiter — 10 submissions per IP per minute. Prevents spam
// without a package dependency (mirrors the Vida widget limiter).
const _rate = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
function rateLimited(ip: string): boolean {
  const now = Date.now()
  const e = _rate.get(ip)
  if (!e || now > e.resetAt) { _rate.set(ip, { count: 1, resetAt: now + 60_000 }); return false }
  e.count++
  return e.count > RATE_LIMIT
}

const SubmitSchema = z.object({
  name:    z.string().max(200).optional(),
  email:   z.string().email().max(320),
  company: z.string().max(200).optional(),
  phone:   z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
  // Honeypot: real users never fill this hidden field; bots do.
  _hp:     z.string().max(0).optional().or(z.literal('')),
})

// POST /forms/:clientId/submit
formsRouter.post('/:clientId/submit', async (req, res) => {
  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown'
    if (rateLimited(ip)) { res.status(429).json({ success: false, error: 'Too many submissions — please try again shortly.' }); return }

    const { clientId } = req.params
    const parsed = SubmitSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: 'Please enter a valid email.' }); return }
    const { name, email, company, phone, message, _hp } = parsed.data

    // Honeypot tripped — pretend success, drop silently.
    if (_hp) { res.json({ success: true }); return }

    // Validate the client exists (and isn't a demo account).
    const { data: client } = await db.from('clients')
      .select('id, is_demo').eq('id', clientId).maybeSingle()
    if (!client || (client as { is_demo?: boolean }).is_demo) {
      res.status(404).json({ success: false, error: 'Form not found.' }); return
    }

    const [firstName, ...rest] = (name || '').trim().split(/\s+/)
    const emailLower = email.toLowerCase()

    // Dedup on email — a repeat submitter updates, doesn't duplicate.
    const { data: existing } = await db.from('leads')
      .select('id').eq('client_id', clientId).eq('email', emailLower).maybeSingle()

    if (!existing) {
      // #349/#639 — CHECKED, NOT SWALLOWED. This was a bare `await …insert({…})`. It writes
      // `source` below — a column no migration created until 6 Aug — so EVERY submission of
      // the website lead-capture form was rejected by Postgres, the route answered
      // `{ success: true }`, and the visitor saw a thank-you. The third writer of the same
      // missing column, and the third to lose real people silently (see lib/vida.ts).
      const { error: leadErr } = await db.from('leads').insert({
        client_id:       clientId,
        first_name:      firstName || 'Web',
        last_name:       rest.join(' ') || 'Lead',
        email:           emailLower,
        phone:           phone || null,
        company:         company || null,
        status:          'scored',
        score:           80,                 // inbound form fill = strong intent
        score_reasoning: message ? `Inbound web form: "${message.slice(0, 200)}"` : 'Submitted your website lead-capture form.',
        scored_at:       new Date().toISOString(),
        source:          'web_form',
      })
      if (leadErr) {
        console.error(`[forms/submit] A WEBSITE FORM SUBMISSION WAS NOT SAVED — ${emailLower} is lost unless someone reads this line:`, leadErr.message)
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[forms/submit]', err)
    res.status(500).json({ success: false, error: 'Something went wrong — please try again.' })
  }
})
