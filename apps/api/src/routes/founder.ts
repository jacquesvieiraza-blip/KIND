/**
 * Founder Agent Stack — support, CS, and AE agents running KIND's own business
 * Protected by ADMIN_SECRET_KEY header.
 *
 * POST /founder/support/inbound    — triage inbound email to hello@get-kind.com
 * POST /founder/cs/followup        — send CS onboarding follow-up to a client
 * POST /founder/ae/demo-request    — draft and send AE demo booking email
 * GET  /founder/digest             — agent activity summary for admin dashboard
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend    = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM      = 'K.I.N.D <hello@get-kind.com>'
const FOUNDER   = process.env.FOUNDER_EMAIL || 'hello@get-kind.com'

export const founderRouter = Router()

function requireAdminKey(req: Request, res: Response, next: () => void) {
  if (!process.env.ADMIN_SECRET_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_SECRET_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
}

founderRouter.use(requireAdminKey)

// ── SUPPORT TRIAGE ─────────────────────────────────────────────────────────────
founderRouter.post('/support/inbound', async (req: Request, res: Response) => {
  try {
    const { from, subject, body } = z.object({
      from:    z.string().email(),
      subject: z.string().default(''),
      body:    z.string().min(1),
    }).parse(req.body)

    // Classify the email
    const classifyRes = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Classify this inbound support email for K.I.N.D (a B2B AI lead gen platform).
From: ${from}
Subject: ${subject}
Body: ${body.slice(0, 1000)}

Respond with JSON only: { "category": "billing|technical|sales|general", "urgency": "low|medium|high", "can_auto_reply": true|false, "summary": "one sentence" }`,
      }],
    })

    let classification = { category: 'general', urgency: 'low', can_auto_reply: false, summary: '' }
    try {
      const text = (classifyRes.content[0] as { type: string; text: string }).text
      classification = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {}

    // Log the inbound email
    await Promise.resolve(db.from('founder_agent_logs').insert({
      agent:   'support',
      action:  'inbound_email',
      payload: { from, subject, body: body.slice(0, 500), classification },
    })).catch(() => {})

    let autoReplied = false

    if (classification.can_auto_reply) {
      const replyRes = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: `You are K.I.N.D support. K.I.N.D is a B2B AI platform for lead generation and automated outreach (FIGSY). You answer support emails on behalf of the K.I.N.D team. Be helpful, warm, and concise. Sign off as "The K.I.N.D Team".`,
        messages: [{
          role: 'user',
          content: `Reply to this support email:
From: ${from}
Subject: ${subject}
Body: ${body.slice(0, 1000)}

Write a helpful reply. Do not include the subject line.`,
        }],
      })
      const replyText = (replyRes.content[0] as { type: string; text: string }).text

      if (resend) {
        await resend.emails.send({
          from, to: [from], subject: `Re: ${subject}`,
          text: replyText,
        })
        autoReplied = true
      }
    }

    // Always forward to founder for awareness (non-auto or high urgency)
    if (!autoReplied || classification.urgency === 'high') {
      if (resend) {
        await resend.emails.send({
          from, to: [FOUNDER],
          subject: `[Support ${classification.urgency.toUpperCase()}] ${subject}`,
          text: `From: ${from}\nCategory: ${classification.category}\nUrgency: ${classification.urgency}\nAuto-replied: ${autoReplied}\nSummary: ${classification.summary}\n\n---\n${body}`,
        })
      }
    }

    res.json({ success: true, data: { classification, auto_replied: autoReplied } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[founder/support]', err)
    res.status(500).json({ success: false, error: 'Failed to process support email' })
  }
})

// ── CS ONBOARDING FOLLOW-UP ───────────────────────────────────────────────────
founderRouter.post('/cs/followup', async (req: Request, res: Response) => {
  try {
    const { client_id, step } = z.object({
      client_id: z.string().uuid(),
      step:      z.enum(['day1', 'day3', 'day7']).default('day1'),
    }).parse(req.body)

    const { data: client } = await db.from('clients')
      .select('id, company_name, industry, user_id')
      .eq('id', client_id).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: { user } } = await db.auth.admin.getUserById(client.user_id!)
    const email = user?.email
    if (!email) { res.status(400).json({ success: false, error: 'No email for client' }); return }

    // Fetch their current state
    const [leadsRes, icpRes] = await Promise.all([
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
      db.from('icps').select('id, name').eq('client_id', client.id).limit(1),
    ])
    const leadCount = leadsRes.count ?? 0
    const hasIcp    = (icpRes.data?.length ?? 0) > 0

    const STEP_PROMPTS: Record<string, string> = {
      day1: `Write a warm, brief Day 1 onboarding email for a new client of K.I.N.D (B2B AI lead gen platform).
Company: ${client.company_name}, Industry: ${client.industry || 'unknown'}
Their leads so far: ${leadCount}, Has ICP: ${hasIcp}
3 tips to get started: 1) Build their ICP, 2) Run it to get leads, 3) Send consent emails.
Keep it under 120 words. Subject line should be engaging. Output format: SUBJECT: ...\nBODY: ...`,
      day3: `Write a Day 3 follow-up email for a K.I.N.D client.
Company: ${client.company_name}
They have ${leadCount} leads${hasIcp ? ' and an active ICP' : ' but no ICP yet'}.
${!hasIcp ? 'Nudge them to build their ICP — it takes 2 minutes.' : leadCount === 0 ? 'Nudge them to run their ICP to pull leads.' : 'Congratulate them on their leads, suggest sending consent emails.'}
Under 80 words. Output: SUBJECT: ...\nBODY: ...`,
      day7: `Write a Day 7 check-in email for a K.I.N.D client.
Company: ${client.company_name}, Leads: ${leadCount}
Ask if they need help, offer a 15-min call, mention FIGSY outreach if they have consented leads.
Under 80 words. Output: SUBJECT: ...\nBODY: ...`,
    }

    const draftRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 400,
      messages: [{ role: 'user', content: STEP_PROMPTS[step] }],
    })
    const draftText = (draftRes.content[0] as { type: string; text: string }).text

    const subjectMatch = draftText.match(/SUBJECT:\s*(.+)/i)
    const bodyMatch    = draftText.match(/BODY:\s*([\s\S]+)/i)
    const subject = subjectMatch?.[1]?.trim() || `Your K.I.N.D onboarding — ${step}`
    const body    = bodyMatch?.[1]?.trim() || draftText

    if (resend) {
      await resend.emails.send({ from: FROM, to: [email], subject, text: body })
    }

    await Promise.resolve(db.from('founder_agent_logs').insert({
      agent:   'cs',
      action:  `followup_${step}`,
      payload: { client_id, email, subject, sent: !!resend },
    })).catch(() => {})

    res.json({ success: true, data: { step, subject, sent: !!resend } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[founder/cs]', err)
    res.status(500).json({ success: false, error: 'Failed to send CS follow-up' })
  }
})

// ── AE DEMO BOOKING ───────────────────────────────────────────────────────────
founderRouter.post('/ae/demo-request', async (req: Request, res: Response) => {
  try {
    const { name, email, company, message, source } = z.object({
      name:    z.string().min(1),
      email:   z.string().email(),
      company: z.string().optional(),
      message: z.string().optional(),
      source:  z.string().optional(),
    }).parse(req.body)

    // Claude drafts a personalised booking email
    const draftRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Draft a personalised demo booking email for a prospect who requested a demo of K.I.N.D.
Prospect: ${name}, ${company || 'unknown company'}
Their message: "${message || 'Interested in a demo'}"
Source: ${source || 'website'}

The email should:
1. Thank them for their interest
2. Give 2-3 specific meeting time options (Mon/Wed/Fri next week, 10am or 2pm GMT+2)
3. Mention a relevant benefit of K.I.N.D based on their context
4. Include a Calendly fallback: calendly.com/kind-ai/demo
5. Be warm, confident, and under 100 words

Output: SUBJECT: ...\nBODY: ...`,
      }],
    })
    const draftText = (draftRes.content[0] as { type: string; text: string }).text
    const subjectMatch = draftText.match(/SUBJECT:\s*(.+)/i)
    const bodyMatch    = draftText.match(/BODY:\s*([\s\S]+)/i)
    const subject = subjectMatch?.[1]?.trim() || 'K.I.N.D demo — let\'s talk'
    const body    = bodyMatch?.[1]?.trim() || draftText

    // Send to prospect
    if (resend) {
      await resend.emails.send({ from: FROM, to: [email], subject, text: body })
    }

    // Alert founder
    if (resend) {
      await resend.emails.send({
        from: FROM, to: [FOUNDER],
        subject: `[AE] New demo request — ${name} (${company || 'unknown'})`,
        text: `Name: ${name}\nEmail: ${email}\nCompany: ${company}\nMessage: ${message}\n\nDraft sent:\nSubject: ${subject}\n\n${body}`,
      })
    }

    await Promise.resolve(db.from('founder_agent_logs').insert({
      agent:   'ae',
      action:  'demo_request',
      payload: { name, email, company, message, subject, sent: !!resend },
    })).catch(() => {})

    res.json({ success: true, data: { subject, sent: !!resend } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[founder/ae]', err)
    res.status(500).json({ success: false, error: 'Failed to process demo request' })
  }
})

// ── FOUNDER DIGEST ────────────────────────────────────────────────────────────
founderRouter.get('/digest', async (_req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    const [logsRes, clientsRes, leadsRes] = await Promise.all([
      db.from('founder_agent_logs')
        .select('*').gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false }).limit(50),
      db.from('clients').select('id', { count: 'exact', head: true }),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    ])

    const logs = logsRes.data ?? []
    const supportCount  = logs.filter((l: any) => l.agent === 'support').length
    const csCount       = logs.filter((l: any) => l.agent === 'cs').length
    const aeCount       = logs.filter((l: any) => l.agent === 'ae').length

    res.json({
      success: true,
      data: {
        total_clients:      clientsRes.count ?? 0,
        new_leads_7d:       leadsRes.count ?? 0,
        agent_actions_7d:   { support: supportCount, cs: csCount, ae: aeCount },
        recent_logs:        logs.slice(0, 20),
      },
    })
  } catch (err) {
    console.error('[founder/digest]', err)
    res.status(500).json({ success: false, error: 'Failed to get digest' })
  }
})
