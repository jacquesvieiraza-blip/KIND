import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { rateLimit } from '../lib/rate-limit'
import { sendFounderAlert } from '../lib/alerts'

export const supportRouter = Router()
supportRouter.use(requireAuth)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// #321 — per-user cap on the Claude-backed support chat (keyed by userId).
const supportAiLimit = rateLimit({ limit: 20, windowMs: 60_000, key: 'support-ai', byUser: true })

const SYSTEM_PROMPT = `You are K.I.N.D Support, the helpful AI assistant for the K.I.N.D platform.

K.I.N.D (Knowledge Intelligence Network & Distribution) is a B2B AI platform for South African businesses that provides:
- **AI Lead Generation**: Finds and scores B2B leads that match your ICP (Ideal Customer Profile). Leads are POPIA-compliant. 1 credit = 1 positive reply from a lead.
- **FIGSY AI SDR**: Automated 3-step email outreach sequence. Finds leads, emails them, classifies replies, and pushes interested leads to your CRM. Requires FIGSY subscription.
- **Virtual Assistant**: Scheduling, email drafting, knowledge queries for your business.
- **Chatbot Agent**: Web and WhatsApp AI chatbot for your customers.

Credits:
- Credits are consumed only when a lead replies positively to an outreach.
- Finding leads = free. Scoring leads = free. Only positive replies consume credits.
- Credit bundles: K.I.N.D AI (from 10 credits/$12) and FIGSY (from 10 credits/$35).
- Credits never expire.

POPIA Compliance:
- All leads are sourced from consented databases or pre-consented via Apollo.io.
- Leads can opt out at any time via consent email link.
- By paying, clients accept K.I.N.D's Terms of Service and DPA (ECTA No. 25 of 2002).

Billing:
- Payment via Paystack (credit/debit card, instant EFT).
- Billed in ZAR at prevailing exchange rate.
- No refunds on spent credits.

FIGSY setup:
- Activate a campaign on the FIGSY page.
- Requires a FIGSY subscription to activate campaigns.
- Sequences go out over 9 days: step 1 (day 0), step 2 (day 4), step 3 (day 9).

Answer questions helpfully and concisely. If you don't know something specific about the client's account (like their lead count or balance), tell them to check the relevant dashboard page. Keep answers under 120 words unless the question genuinely needs more detail. Be friendly and professional.

IMPORTANT FORMATTING RULES — you must follow these without exception:
- Respond in plain conversational English only.
- Never use JSON, XML, or any structured data format.
- Never use markdown: no code blocks, no backticks, no bullet points with -, no headers with #.
- Never wrap your response in \`\`\` or any code fence.
- Write as if you are texting a friendly reply — plain sentences only.`

const bodySchema = z.object({
  messages: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).min(1).max(20),
})

supportRouter.post('/chat', supportAiLimit, async (req: AuthRequest, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: 'Invalid request' }); return }

    const { messages } = parsed.data

    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system:     SYSTEM_PROMPT,
      messages,
    })

    const text = (response.content[0] as { type: string; text: string }).text
    res.json({ success: true, data: { reply: text } })
  } catch (err) {
    console.error('[support] chat error:', err)
    res.status(500).json({ success: false, error: 'Failed to get response' })
  }
})

// ── PR-D (#377): SUPPORT ESCALATION — "Talk to a human" ─────────────────────────
// The in-portal help is Claude-only; a stuck client had no way to reach a person. This
// routes the client's message to the founder (sendFounderAlert also writes a durable
// founder_alerts row, so it survives even if email + Slack both fail) and confirms.
// No ticketing system, no new deps.
supportRouter.post(
  '/escalate',
  rateLimit({ limit: 5, windowMs: 60_000, key: 'support-escalate', byUser: true }),
  async (req: AuthRequest, res) => {
    try {
      const { message } = z.object({ message: z.string().min(1).max(4000) }).parse(req.body)

      // Resolve who's asking + a reply-to email so the founder can respond.
      const { data: client } = await db.from('clients')
        .select('company_name').eq('user_id', req.userId!).maybeSingle()
      let email = ''
      try {
        const { data: { user } } = await db.auth.admin.getUserById(req.userId!)
        email = user?.email ?? ''
      } catch { /* best-effort — the alert still goes, just without a reply-to */ }

      await sendFounderAlert(
        'support_escalation',
        `🆘 Support request — ${client?.company_name ?? 'a client'}`,
        [
          `Client: ${client?.company_name ?? '(unknown)'}`,
          `Reply to: ${email || '(no email on file)'}`,
          '',
          message.trim(),
        ],
      )

      res.json({ success: true, data: { escalated: true } })
    } catch (err) {
      if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
      console.error('[support/escalate]', err)
      res.status(500).json({ success: false, error: 'Failed to escalate to the team' })
    }
  },
)
