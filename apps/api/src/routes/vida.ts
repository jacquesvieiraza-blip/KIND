// Mount in index.ts: app.use('/vida', vidaRouter)

import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { generateVidaReply, scoreSession, notifyHotLead } from '../lib/vida'

export const vidaRouter = Router()

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).single()
  return (data as any)?.id ?? null
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

// GET /vida/widget/:clientId/config
widgetRouter.get('/:clientId/config', async (req, res) => {
  try {
    const { clientId } = req.params

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
          bot_name:      'Vida',
          greeting:      'Hi! How can I help you today?',
          primary_color: '#0066FF',
          collect_email: true,
          collect_phone: false,
        },
      })
      return
    }

    res.json({ success: true, data: config })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch widget config' })
  }
})

// POST /vida/widget/:clientId/session
widgetRouter.post('/:clientId/session', async (req, res) => {
  try {
    const { clientId } = req.params
    const channel = req.body?.channel ?? 'web'

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
widgetRouter.post('/:clientId/session/:sessionId/message', async (req, res) => {
  try {
    const { clientId, sessionId } = req.params

    const parsed = SendMessageSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' })
      return
    }

    const { message, visitorName, visitorEmail, visitorPhone } = parsed.data

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

    // Fetch recent message history (last 10 messages for context)
    const { data: history } = await db
      .from('vida_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(10)

    const messageHistory = (history ?? []) as { role: string; content: string }[]

    // Generate reply
    const { reply, shouldCollectEmail, shouldCollectPhone, isHotLead } = await generateVidaReply({
      clientId,
      sessionId,
      userMessage: message,
      config,
      messageHistory,
    })

    // Save both messages to DB
    await db.from('vida_messages').insert([
      { session_id: sessionId, client_id: clientId, role: 'user',      content: message },
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

      notifyHotLead(clientId, sessionId, name, email).catch(console.error)
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
