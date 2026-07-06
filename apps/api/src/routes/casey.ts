// Mount in index.ts: app.use('/casey', caseyRouter)
//
// Casey — The Guide (onboarding agent, 113a). Casey greets new clients, walks
// them through setup (sign agreement → build ICP → launch FIGSY), then hands
// off to the AI Family. Conversational, encouraging, never overwhelming.
// Stateless side-panel chat, no DB writes — mirrors the vida/help pattern.

import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { rateLimit } from '../lib/rate-limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// #321 — per-user cap on the Claude-backed chat so one authenticated client can't
// burn unbounded tokens. Keyed by userId (requireAuth runs first).
const caseyAiLimit = rateLimit({ limit: 20, windowMs: 60_000, key: 'casey-ai', byUser: true })

const CASEY_CHAT_SYSTEM = [
  "You are Casey, the friendly onboarding guide inside the K.I.N.D client portal.",
  "Your job: welcome a brand-new client and walk them through getting set up — one calm step at a time — then hand them to the AI Family.",
  "K.I.N.D is an AI sales platform. The agent family you're introducing: FIGSY (AI SDR — finds leads & sends cold-email sequences), Milla (business-intelligence VA), Vida (website chatbot that qualifies visitors), Denise (the AI closer — warm follow-ups & proposals).",
  "The setup path you guide them through: (1) sign the service agreement, (2) build their ICP — describe who they sell to, (3) launch their first FIGSY campaign. Keep them moving to the next step.",
  "Be warm, encouraging, and concise — 2-3 sentences. Celebrate small wins. Never overwhelm with everything at once; focus on their immediate next step.",
  "Never invent prices, metrics, or features you're unsure about. If they need a human, point them to hello@get-kind.com.",
].join(' ')

export const caseyRouter = Router()
caseyRouter.use(requireAuth)

/**
 * POST /casey/chat — stateless onboarding chat for the right-rail panel on the
 * setup/onboarding screens. Body: { message, history?: [{role, content}] }
 * → { success, data: { reply } }
 */
caseyRouter.post('/chat', caseyAiLimit, async (req: AuthRequest, res) => {
  try {
    const { message, history } = z.object({
      message: z.string().min(1).max(2000),
      history: z.array(z.object({
        role:    z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })).max(12).optional(),
    }).parse(req.body)

    if (!process.env.ANTHROPIC_API_KEY) {
      res.json({ success: true, data: { reply: "I can't reach my brain right now — please email hello@get-kind.com and the team will help you get set up." } })
      return
    }

    const messages: Anthropic.MessageParam[] = [
      ...(history ?? []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: CASEY_CHAT_SYSTEM,
      messages,
    })

    const reply = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('')
      .trim() || "Sorry, I didn't catch that — could you rephrase?"

    res.json({ success: true, data: { reply } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors[0]?.message ?? 'Invalid input' }); return }
    console.error('[casey/chat]', err)
    res.status(500).json({ success: false, error: 'Casey is temporarily unavailable' })
  }
})
