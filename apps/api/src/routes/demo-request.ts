import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { z } from 'zod'

const router = Router()

const schema = z.object({
  product: z.enum(['milla', 'vida', 'denise', 'figsy', 'general']),
  client_id: z.string().uuid(),
  message: z.string().max(500).optional(),
})

router.post('/demo-request', async (req, res) => {
  const parse = schema.safeParse(req.body)
  if (!parse.success) return res.status(400).json({ success: false, error: 'Invalid request' })

  const { product, client_id, message } = parse.data
  const resend = new Resend(process.env.RESEND_API_KEY)
  const founderEmail = process.env.FOUNDER_EMAIL || 'hello@get-kind.com'

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: client } = await db.from('clients').select('company_name, country, industry').eq('id', client_id).single()

  const productNames: Record<string, string> = {
    milla: 'Milla — Virtual Assistant ($49/month)',
    vida: 'Vida — Chatbot Agent ($29/month)',
    denise: 'Denise — AI Account Executive ($99/month)',
    figsy: 'FIGSY — AI SDR',
    general: 'K.I.N.D Platform',
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('[demo-request] RESEND_API_KEY not set — request logged but not emailed')
    return res.json({ success: true, emailed: false })
  }

  await resend.emails.send({
    from: 'K.I.N.D OS <noreply@get-kind.com>',
    to: founderEmail,
    subject: `🎯 Demo Request — ${productNames[product]}`,
    html: `
      <div style="font-family:sans-serif;background:#0a0a0a;padding:32px;max-width:500px;border:1px solid #1f2937;border-radius:8px;">
        <p style="color:#7C3AED;font-weight:600;margin:0 0 16px;">New Demo Request</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="color:#6b7280;padding:6px 0;font-size:13px;">Product</td><td style="color:#e5e7eb;font-size:13px;font-weight:600;">${productNames[product]}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0;font-size:13px;">Company</td><td style="color:#e5e7eb;font-size:13px;">${client?.company_name || client_id}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0;font-size:13px;">Country</td><td style="color:#e5e7eb;font-size:13px;">${client?.country || '—'}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0;font-size:13px;">Industry</td><td style="color:#e5e7eb;font-size:13px;">${client?.industry || '—'}</td></tr>
          ${message ? `<tr><td style="color:#6b7280;padding:6px 0;font-size:13px;">Message</td><td style="color:#e5e7eb;font-size:13px;">${message}</td></tr>` : ''}
        </table>
        <a href="https://admin.get-kind.com/clients" style="display:inline-block;margin-top:20px;background:#7C3AED;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">View in Admin →</a>
      </div>
    `,
  })

  return res.json({ success: true, emailed: true })
})

export default router
