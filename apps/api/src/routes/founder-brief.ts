import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

const router = Router()

router.post('/founder-brief', async (_req, res) => {
  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const resend = new Resend(process.env.RESEND_API_KEY)
  const founderEmail = process.env.FOUNDER_EMAIL || 'hello@get-kind.com'

  const now = new Date()
  const ago24 = new Date(now.getTime() - 86400000).toISOString()
  const ago7  = new Date(now.getTime() - 7 * 86400000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  try {
    // Gather data
    const [
      { data: clients },
      { data: leads24 },
      { data: figsy7 },
      { data: replies7 },
      { data: interestedReplies },
      { data: creditsTxMonth },
      { data: atRiskLeads },
    ] = await Promise.all([
      db.from('clients').select('id, company_name, credit_balance, created_at').order('created_at', { ascending: false }),
      db.from('leads').select('client_id, score').gte('created_at', ago24),
      db.from('figsy_sent_emails').select('id').gte('sent_at', ago7),
      db.from('figsy_replies').select('client_id, classification').gte('received_at', ago7),
      db.from('figsy_replies').select('client_id').eq('classification', 'interested').gte('received_at', ago7),
      db.from('credit_transactions').select('client_id, amount').gte('created_at', monthStart).gt('amount', 0),
      db.from('leads').select('client_id').gte('created_at', ago7),
    ])

    const totalClients = (clients || []).length
    const activeClients = (clients || []).filter(c => (c.credit_balance || 0) > 0).length
    const newLeads24h = (leads24 || []).length
    const figsySent7d = (figsy7 || []).length
    const replies7d = (replies7 || []).length
    const interested7d = (interestedReplies || []).length
    const replyRate = figsySent7d > 0 ? ((replies7d / figsySent7d) * 100).toFixed(1) : '0'
    const mrrThisMonth = (creditsTxMonth || []).reduce((sum, tx) => sum + (tx.amount || 0), 0)

    // At-risk: no leads in 7 days
    const clientsWithLeads = new Set((atRiskLeads || []).map(l => l.client_id))
    const atRiskCount = (clients || []).filter(c => !clientsWithLeads.has(c.id)).length

    const dateStr = now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const prompt = `You are the K.I.N.D Founder Operations AI. Write a concise morning brief for the Founder.

Platform data for ${dateStr}:
- Total clients: ${totalClients} (${activeClients} with credits)
- New leads found (last 24h): ${newLeads24h}
- FIGSY emails sent (7d): ${figsySent7d}
- Replies received (7d): ${replies7d} (${replyRate}% reply rate)
- Interested replies (7d): ${interested7d}
- MRR credits purchased this month: ${mrrThisMonth} credits
- At-risk clients (no leads in 7 days): ${atRiskCount}

Write EXACTLY 5 bullets. Each bullet: one sharp insight or action item. No fluff. No "Good morning". No intro sentence. Just the 5 bullets.

Format:
• [bullet]
• [bullet]
• [bullet]
• [bullet]
• [bullet]

End with one line: "— Your K.I.N.D OS, ${dateStr}"`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const brief = (message.content[0] as { text: string }).text

    // Send email
    if (!process.env.RESEND_API_KEY) {
      console.warn('[founder-brief] RESEND_API_KEY not set — brief generated but not sent')
      return res.json({ success: true, sent: false, brief })
    }

    const htmlBrief = brief
      .split('\n')
      .map(line => line.startsWith('•') ? `<li style="margin-bottom:12px;color:#e5e7eb;">${line.slice(1).trim()}</li>` : `<p style="color:#9ca3af;font-size:13px;">${line}</p>`)
      .join('\n')

    await resend.emails.send({
      from: 'K.I.N.D OS <noreply@get-kind.com>',
      to: founderEmail,
      subject: `☀️ K.I.N.D Morning Brief — ${dateStr}`,
      html: `
        <div style="font-family:monospace;background:#0a0a0a;padding:32px;max-width:600px;margin:0 auto;border:1px solid #1f2937;border-radius:8px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #1f2937;">
            <div style="width:28px;height:28px;background:#7C3AED;border-radius:6px;display:flex;align-items:center;justify-content:center;">
              <span style="color:white;font-weight:bold;font-size:12px;">K</span>
            </div>
            <div>
              <p style="color:white;font-weight:600;margin:0;font-size:14px;">K.I.N.D Founder OS</p>
              <p style="color:#6b7280;font-size:11px;margin:0;">Morning Brief</p>
            </div>
          </div>
          <ul style="list-style:none;padding:0;margin:0 0 24px 0;">
            ${htmlBrief}
          </ul>
          <div style="padding-top:16px;border-top:1px solid #1f2937;">
            <p style="color:#374151;font-size:11px;margin:0;">admin.get-kind.com · Generated by Claude Haiku · ${dateStr}</p>
          </div>
        </div>
      `,
    })

    return res.json({ success: true, sent: true, to: founderEmail, brief })
  } catch (err) {
    console.error('[founder-brief] error:', err)
    return res.status(500).json({ success: false, error: String(err) })
  }
})

export default router
