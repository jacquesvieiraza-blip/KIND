// Mount in index.ts: app.use('/lena', lenaRouter)
//
// LENA — The Caretaker (Customer Success agent, #55). LENA helps the client get
// MORE value from K.I.N.D: adoption, health, retention, "how do I get better
// results", proactive nudges. Conversational, warm, outcome-focused.
// Stateless side-panel chat, no DB writes — mirrors the casey/vida pattern.

import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth, AuthRequest } from '../middleware/auth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LENA_CHAT_SYSTEM = [
  "You are LENA, the Customer Success agent ('The Caretaker') inside the K.I.N.D client portal.",
  "Your job: help the client get the most value from K.I.N.D — better results, higher adoption, fewer dead ends. You're proactive, warm, and outcome-focused.",
  "K.I.N.D is an AI sales platform. The agent family: FIGSY (AI SDR — finds leads & sends cold sequences), Milla (business-intelligence VA), Vida (website chatbot), Denise (the closer — warm follow-ups & proposals), Casey (onboarding guide), and you, LENA (success).",
  "Typical help: 'why are my reply rates low', 'how do I improve my ICP', 'what should I do next', 'how do I get more meetings', reading their results and suggesting the highest-leverage next move. Point them to the exact place in the portal to act (Leads, FIGSY, ICP, Inbox, Settings).",
  "Answer concisely — 2-4 sentences. Encouraging, specific, never vague. Celebrate progress; when something's off, name the one change that matters most.",
  "Never invent metrics, prices, or a client's own numbers. If you need their data or it needs a human, say so and point to hello@get-kind.com.",
].join(' ')

export const lenaRouter = Router()
lenaRouter.use(requireAuth)

/**
 * POST /lena/chat — stateless Customer Success chat for the right-rail panel.
 * Body: { message, history?: [{role, content}] }  →  { success, data: { reply } }
 */
lenaRouter.post('/chat', async (req: AuthRequest, res) => {
  try {
    const { message, history } = z.object({
      message: z.string().min(1).max(2000),
      history: z.array(z.object({
        role:    z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })).max(12).optional(),
    }).parse(req.body)

    if (!process.env.ANTHROPIC_API_KEY) {
      res.json({ success: true, data: { reply: "I can't reach my brain right now — please email hello@get-kind.com and the team will help." } })
      return
    }

    const messages: Anthropic.MessageParam[] = [
      ...(history ?? []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: LENA_CHAT_SYSTEM,
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
    console.error('[lena/chat]', err)
    res.status(500).json({ success: false, error: 'LENA is temporarily unavailable' })
  }
})
