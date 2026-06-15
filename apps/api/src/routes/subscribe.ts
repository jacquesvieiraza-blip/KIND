import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { z } from 'zod'
import { rateLimit } from '../lib/rate-limit'

const router = Router()

const schema = z.object({
  name: z.string(),
  email: z.string().email(),
  company: z.string().optional(),
})

router.post('/public/subscribe', rateLimit({ limit: 5, windowMs: 60_000, key: 'subscribe' }), async (req, res) => {
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ success: false, error: 'Invalid request' })

  const { name, email, company } = parse.data

  // Try to insert into Supabase — don't fail if table doesn't exist
  try {
    const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    await db.from('subscribers').insert({ name, email, company, source: 'playbook' })
  } catch (err) {
    console.warn('[subscribe] Supabase insert skipped:', err)
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('[subscribe] RESEND_API_KEY not set — subscriber logged but not emailed')
    return res.json({ success: true })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const founderEmail = process.env.FOUNDER_EMAIL || 'hello@get-kind.com'

  await resend.emails.send({
    from: 'K.I.N.D OS <noreply@get-kind.com>',
    to: founderEmail,
    subject: `📖 New Playbook Download — ${name} <${email}>`,
    html: `
      <div style="font-family:sans-serif;background:#0a0a0a;padding:32px;max-width:500px;border:1px solid #1f2937;border-radius:8px;">
        <p style="color:#7C3AED;font-weight:600;margin:0 0 16px;">New Playbook Download</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#6b7280;padding:6px 0;font-size:13px;">Name</td><td style="color:#e5e7eb;font-size:13px;font-weight:600;">${name}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0;font-size:13px;">Email</td><td style="color:#e5e7eb;font-size:13px;">${email}</td></tr>
          ${company ? `<tr><td style="color:#6b7280;padding:6px 0;font-size:13px;">Company</td><td style="color:#e5e7eb;font-size:13px;">${company}</td></tr>` : ''}
        </table>
      </div>
    `,
  })

  return res.json({ success: true })
})

export default router
