// Mount in index.ts: app.use('/vida', vidaRouter)

import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { generateVidaReply, scoreSession, notifyHotLead, speedToLeadHandoff } from '../lib/vida'
import { rateLimit } from '../lib/rate-limit'
import { BACKGROUND_MODEL } from '../lib/models'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// R3 (V2-11): Vida in-portal help bubble. Vida answers the CLIENT's own
// "how do I…" questions about using K.I.N.D — distinct from the Vida widget,
// which talks to the client's website visitors. Stateless Q&A, no DB writes.
const VIDA_HELP_SYSTEM = [
  "You are Vida, the friendly in-app help assistant inside the K.I.N.D client portal.",
  "K.I.N.D is an AI sales platform. Its agents: FIGSY (the AI SDR — finds leads, writes & sends cold email sequences), Milla (business-intelligence assistant — daily briefs, pipeline signals), Vida (website chatbot that qualifies visitors), and Denise (the AI closer — warm follow-ups & proposals).",
  "Key areas of the portal: Leads (scored prospects), FIGSY campaigns & sequences, Inbox (replies), ICP setup (who to target), Settings (business profile, CRM integration, writing style, notifications, booking link), Billing & credits, Documents, Team invites.",
  "How outreach works: the client defines an ICP → FIGSY finds & scores leads → drafts personalised cold emails → sends them on a warmed schedule (respecting POPIA consent in South Africa) → replies land in the Inbox where the client (or Denise) follows up.",
  "Credits are spent when leads are delivered. Campaigns can auto-pause on low performance and be resumed from the FIGSY page.",
  "Answer concisely — 2-4 sentences. Be warm, practical, and specific to where in the portal the client should click. If you genuinely don't know or it needs a human, point them to hello@get-kind.com.",
  "Never invent metrics, prices, or features you're unsure about. If unsure, say so.",
].join(' ')

export const vidaRouter = Router()

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return (data as any)?.id ?? null
}

// Returns true if the client has an active Vida (chatbot) subscription.
// FAIL SAFE: on lookup error, log and return true so a transient DB error
// never takes a paying client's widget offline.
async function hasActiveVidaSubscription(clientId: string): Promise<boolean> {
  try {
    const { data, error } = await db
      .from('subscriptions')
      .select('id')
      .eq('client_id', clientId)
      .in('product', ['chatbot', 'vida'])
      .eq('status', 'active')
      .limit(1)

    if (error) {
      console.error('[vida] subscription lookup failed — failing open:', error)
      return true
    }
    return Array.isArray(data) && data.length > 0
  } catch (err) {
    console.error('[vida] subscription lookup threw — failing open:', err)
    return true
  }
}

async function getOrCreateConfig(clientId: string) {
  const { data: existing } = await db
    .from('vida_configs')
    .select('*')
    .eq('client_id', clientId)
    .single()

  if (existing) return existing

  const { data: created } = await db
    .from('vida_configs')
    .insert({ client_id: clientId })
    .select('*')
    .single()

  return created
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP A — Client portal (auth required)
// ─────────────────────────────────────────────────────────────────────────────

const portalRouter = Router()
portalRouter.use(requireAuth)

// #321 — per-user cap on the Claude-backed in-portal help chat (keyed by userId).
// The public website widget (widgetRouter) already has its own widgetRateLimit.
const vidaHelpAiLimit = rateLimit({ limit: 20, windowMs: 60_000, key: 'vida-help-ai', byUser: true })

// GET /vida/config
portalRouter.get('/config', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const config = await getOrCreateConfig(clientId)
    res.json({ success: true, data: config })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch config' })
  }
})

const UpdateConfigSchema = z.object({
  bot_name:      z.string().min(1).max(100).optional(),
  greeting:      z.string().min(1).max(500).optional(),
  system_prompt: z.string().max(2000).nullable().optional(),
  primary_color: z.string().max(20).optional(),
  collect_email: z.boolean().optional(),
  collect_phone: z.boolean().optional(),
  notify_email:  z.string().email().nullable().optional(),
})

// PUT /vida/config
portalRouter.put('/config', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const parsed = UpdateConfigSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' })
      return
    }

    await getOrCreateConfig(clientId)

    const { data, error } = await db
      .from('vida_configs')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .select('*')
      .single()

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to update config' })
  }
})

// POST /vida/help — R3 (V2-11): in-portal product help. Stateless: the client
// sends the recent turns and the latest question; Vida replies with how-to help.
portalRouter.post('/help', vidaHelpAiLimit, async (req: AuthRequest, res) => {
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
      model: BACKGROUND_MODEL,
      max_tokens: 400,
      system: VIDA_HELP_SYSTEM,
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
    console.error('[vida/help]', err)
    res.status(500).json({ success: false, error: 'Help is temporarily unavailable' })
  }
})

// GET /vida/sessions
portalRouter.get('/sessions', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db
      .from('vida_sessions')
      .select('id, visitor_name, visitor_email, visitor_phone, channel, lead_score, outcome, created_at, ended_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' })
  }
})

// GET /vida/sessions/:sessionId/messages
portalRouter.get('/sessions/:sessionId/messages', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { sessionId } = req.params

    // Verify session belongs to this client
    const { data: session } = await db
      .from('vida_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('client_id', clientId)
      .single()

    if (!session) { res.status(404).json({ success: false, error: 'Session not found' }); return }

    const { data, error } = await db
      .from('vida_messages')
      .select('id, role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch messages' })
  }
})

// GET /vida/stats
portalRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const [totalRes, hotRes, interestedRes, scoresRes] = await Promise.all([
      db.from('vida_sessions').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('vida_sessions').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('outcome', 'hot_lead'),
      db.from('vida_sessions').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('outcome', 'interested'),
      db.from('vida_sessions').select('lead_score').eq('client_id', clientId).not('lead_score', 'is', null),
    ])

    const totalSessions = totalRes.count ?? 0
    const hotLeads      = hotRes.count ?? 0
    const interested    = interestedRes.count ?? 0

    const scores = (scoresRes.data ?? []) as { lead_score: number }[]
    const avgScore = scores.length
      ? Math.round(scores.reduce((sum, s) => sum + (s.lead_score || 0), 0) / scores.length)
      : 0

    res.json({ success: true, data: { totalSessions, hotLeads, interested, avgScore } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch stats' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// GROUP B — Public widget API (NO auth)
// ─────────────────────────────────────────────────────────────────────────────

const widgetRouter = Router()

// Simple in-memory rate limiter for public widget message endpoint
// 20 messages per IP per minute — prevents bot abuse without a package dep
const _widgetRateMap = new Map<string, { count: number; resetAt: number }>()
const WIDGET_RATE_LIMIT = 20
const WIDGET_RATE_WINDOW_MS = 60_000
function widgetRateLimit(req: any, res: any, next: any) {
  // Prefer the Express-resolved req.ip (honours app 'trust proxy' config) over
  // the raw X-Forwarded-For first token, which is trivially spoofable.
  const ip = req.ip
    ?? (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim()
    ?? 'unknown'
  const now = Date.now()
  const entry = _widgetRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    _widgetRateMap.set(ip, { count: 1, resetAt: now + WIDGET_RATE_WINDOW_MS })
    return next()
  }
  entry.count++
  if (entry.count > WIDGET_RATE_LIMIT) {
    res.setHeader('Retry-After', '60')
    res.status(429).json({ success: false, error: 'Too many requests' }); return
  }
  next()
}
// Prune stale entries every 5 min to avoid memory leak
setInterval(() => {
  const now = Date.now()
  for (const [ip, e] of _widgetRateMap.entries()) {
    if (now > e.resetAt) _widgetRateMap.delete(ip)
  }
}, 300_000)

// GET /vida/widget/:clientId/config
widgetRouter.get('/:clientId/config', async (req, res) => {
  try {
    const { clientId } = req.params

    // Don't serve the widget for clients without an active subscription.
    if (!(await hasActiveVidaSubscription(clientId))) {
      res.json({ success: true, data: { enabled: false } })
      return
    }

    const { data: config, error } = await db
      .from('vida_configs')
      .select('bot_name, greeting, primary_color, collect_email, collect_phone')
      .eq('client_id', clientId)
      .eq('active', true)
      .single()

    if (error || !config) {
      // Return sensible defaults if no config exists yet
      res.json({
        success: true,
        data: {
          enabled:       true,
          bot_name:      'Vida',
          greeting:      'Hi! How can I help you today?',
          primary_color: '#7C3AED',
          collect_email: true,
          collect_phone: false,
        },
      })
      return
    }

    res.json({ success: true, data: { enabled: true, ...config } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch widget config' })
  }
})

// POST /vida/widget/:clientId/session
widgetRouter.post('/:clientId/session', widgetRateLimit, async (req, res) => {
  try {
    const { clientId } = req.params
    const channel = req.body?.channel ?? 'web'

    // Don't create sessions for clients without an active subscription.
    if (!(await hasActiveVidaSubscription(clientId))) {
      res.status(403).json({ success: false, error: 'Chatbot is not active' }); return
    }

    const { data, error } = await db
      .from('vida_sessions')
      .insert({ client_id: clientId, channel })
      .select('id')
      .single()

    if (error) throw error
    res.json({ success: true, data: { sessionId: (data as any).id } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to create session' })
  }
})

const SendMessageSchema = z.object({
  message:       z.string().min(1).max(2000),
  visitorName:   z.string().max(200).optional(),
  visitorEmail:  z.string().email().optional(),
  visitorPhone:  z.string().max(50).optional(),
})

// POST /vida/widget/:clientId/session/:sessionId/message
widgetRouter.post('/:clientId/session/:sessionId/message', widgetRateLimit, async (req, res) => {
  try {
    const { clientId, sessionId } = req.params

    const parsed = SendMessageSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' })
      return
    }

    const { message, visitorName, visitorEmail, visitorPhone } = parsed.data

    // Don't answer (and don't spend on Anthropic) for inactive clients.
    if (!(await hasActiveVidaSubscription(clientId))) {
      res.json({
        success: true,
        data: { reply: 'This chat is currently unavailable. Please try again later.', shouldCollectEmail: false, shouldCollectPhone: false },
      })
      return
    }

    // Update visitor info if provided
    const visitorUpdate: Record<string, string> = {}
    if (visitorName)  visitorUpdate.visitor_name  = visitorName
    if (visitorEmail) visitorUpdate.visitor_email = visitorEmail
    if (visitorPhone) visitorUpdate.visitor_phone = visitorPhone

    if (Object.keys(visitorUpdate).length > 0) {
      await db.from('vida_sessions').update(visitorUpdate).eq('id', sessionId).eq('client_id', clientId)
    }

    // Fetch config
    const { data: configData } = await db
      .from('vida_configs')
      .select('bot_name, system_prompt, collect_email, collect_phone')
      .eq('client_id', clientId)
      .single()

    const config = {
      bot_name:      (configData as any)?.bot_name      ?? 'Vida',
      system_prompt: (configData as any)?.system_prompt ?? null,
      collect_email: (configData as any)?.collect_email ?? true,
      collect_phone: (configData as any)?.collect_phone ?? false,
    }

    // Persist the inbound visitor message BEFORE the AI call so it isn't lost
    // if Anthropic fails mid-conversation.
    await db.from('vida_messages').insert([
      { session_id: sessionId, client_id: clientId, role: 'user', content: message },
    ])

    // Fetch recent message history (last 10 messages for context).
    // The just-inserted user message is excluded here and passed separately as
    // userMessage to avoid duplicating it in the prompt.
    const { data: history } = await db
      .from('vida_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(11)

    const allHistory = (history ?? []) as { role: string; content: string }[]
    // Drop the trailing user message we just inserted — it's sent as userMessage.
    const messageHistory =
      allHistory.length && allHistory[allHistory.length - 1].role === 'user'
        ? allHistory.slice(0, -1)
        : allHistory

    // Generate reply
    const { reply, shouldCollectEmail, shouldCollectPhone, isHotLead } = await generateVidaReply({
      clientId,
      sessionId,
      userMessage: message,
      config,
      messageHistory,
    })

    // Save the assistant reply (the visitor message was already persisted above)
    await db.from('vida_messages').insert([
      { session_id: sessionId, client_id: clientId, role: 'assistant', content: reply },
    ])

    // Handle hot lead
    if (isHotLead) {
      await db
        .from('vida_sessions')
        .update({ outcome: 'hot_lead' })
        .eq('id', sessionId)
        .eq('client_id', clientId)

      // Fetch latest visitor info for notification
      const { data: sessionData } = await db
        .from('vida_sessions')
        .select('visitor_name, visitor_email')
        .eq('id', sessionId)
        .single()

      const name  = (sessionData as any)?.visitor_name  ?? visitorName ?? 'Anonymous'
      const email = (sessionData as any)?.visitor_email ?? visitorEmail ?? null

      // R4 (#80): speed-to-lead — create the pipeline lead + Denise draft, then
      // notify with the draft inline. Sequential so the email carries the draft;
      // fully best-effort so it never blocks the widget response.
      speedToLeadHandoff({ clientId, sessionId, visitorName: name, visitorEmail: email })
        .then(({ draft }) => notifyHotLead(clientId, sessionId, name, email, draft))
        .catch(console.error)
    }

    res.json({ success: true, data: { reply, shouldCollectEmail, shouldCollectPhone } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to process message' })
  }
})

// POST /vida/widget/:clientId/session/:sessionId/end
widgetRouter.post('/:clientId/session/:sessionId/end', async (req, res) => {
  try {
    const { clientId, sessionId } = req.params

    await db
      .from('vida_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('client_id', clientId)

    // Score session asynchronously — don't block response
    scoreSession(sessionId).catch(console.error)

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to end session' })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Mount sub-routers
// ─────────────────────────────────────────────────────────────────────────────

vidaRouter.use('/widget', widgetRouter)
vidaRouter.use('/', portalRouter)
