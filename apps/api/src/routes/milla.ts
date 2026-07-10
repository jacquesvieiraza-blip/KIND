// Mount in index.ts: app.use('/milla', millaRouter)

import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { processDocument, chat } from '../lib/milla'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Stateless side-panel chat persona (113a). Distinct from the session-backed
// /sessions/:id/chat above (which does RAG + persistence): this is the quick
// "ask Milla anything" thread that lives in the right-rail agent panel.
const MILLA_CHAT_SYSTEM = [
  "You are Milla, the AI virtual assistant ('The Brain') inside the K.I.N.D client portal.",
  "K.I.N.D is an AI sales platform. The agent family: FIGSY (AI SDR — finds leads, writes & sends cold-email sequences), Milla (you — business-intelligence VA: drafting, business Q&A, daily briefs, organising knowledge), Vida (website chatbot that qualifies visitors), Denise (the AI closer — warm follow-ups & proposals).",
  "You help with: drafting documents & emails, answering business questions, summarising, and pointing the client to the right place in the portal (Leads, FIGSY campaigns, Inbox, Settings, Documents, Knowledge, Billing).",
  "Answer concisely — 2-4 sentences unless asked for a full draft. Warm, sharp, practical.",
  "Never invent metrics, prices, client data, or features you're unsure about. If you don't know or it needs a human, say so and point to hello@get-kind.com.",
].join(' ')

export const millaRouter = Router()
millaRouter.use(requireAuth)

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

/**
 * Resolves the caller's client id and verifies they hold an ACTIVE Milla
 * ('virtual_assistant') subscription. Mirrors the portal check
 * (product === 'virtual_assistant' && status === 'active').
 *
 * Returns:
 *   { clientId }                       → caller is allowed through
 *   { error, status }                  → caller should be rejected with that status
 *
 * FAIL SAFE: if the subscription lookup throws a transient error we log it and
 * allow the request through rather than hard-blocking a paying customer. We only
 * return 403 on a definitive "no active subscription" result.
 */
async function requireMillaAccess(
  userId: string,
): Promise<{ clientId: string } | { error: string; status: number }> {
  const clientId = await getClientId(userId)
  if (!clientId) return { error: 'Client not found', status: 404 }

  try {
    const { data, error } = await db.from('subscriptions')
      .select('product, status')
      .eq('client_id', clientId)
      .eq('product', 'virtual_assistant')
      .eq('status', 'active')
      .limit(1)

    if (error) {
      // Transient/lookup error — fail safe, do not block a paying user.
      console.error('[milla/requireMillaAccess] subscription lookup error (failing open):', error)
      return { clientId }
    }

    const hasActive = (data ?? []).some(s => s.product === 'virtual_assistant' && s.status === 'active')
    if (!hasActive) {
      return { error: 'An active Milla (Virtual Assistant) subscription is required to use this feature.', status: 403 }
    }

    return { clientId }
  } catch (err) {
    // Transient/network error — fail safe, do not block a paying user.
    console.error('[milla/requireMillaAccess] subscription lookup threw (failing open):', err)
    return { clientId }
  }
}

// ── FIGSY access gate ─────────────────────────────────────────────────────────
// The Notetaker was moved into the FIGSY bundle (10 Jul): any client with an active
// FIGSY plan can use it. Mirrors requireMillaAccess (fail-open on lookup error so a
// paying client is never wrongly blocked). The other Milla routes stay Milla-gated.
async function requireFigsyAccess(
  userId: string,
): Promise<{ clientId: string } | { error: string; status: number }> {
  const clientId = await getClientId(userId)
  if (!clientId) return { error: 'Client not found', status: 404 }

  try {
    const { data, error } = await db.from('subscriptions')
      .select('product, status')
      .eq('client_id', clientId)
      .in('product', ['lead_gen_figsy', 'figsy_addon'])
      .eq('status', 'active')
      .limit(1)

    if (error) {
      console.error('[milla/requireFigsyAccess] subscription lookup error (failing open):', error)
      return { clientId }
    }

    if ((data ?? []).length === 0) {
      return { error: 'An active FIGSY plan is required to use the Notetaker.', status: 403 }
    }

    return { clientId }
  } catch (err) {
    console.error('[milla/requireFigsyAccess] subscription lookup threw (failing open):', err)
    return { clientId }
  }
}

// ── STATUS ────────────────────────────────────────────────────────────────────

millaRouter.get('/status', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const [docsRes, sessionsRes, readyRes] = await Promise.all([
      db.from('milla_documents').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('milla_sessions').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('milla_documents').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'ready'),
    ])

    res.json({
      success:        true,
      documentsCount: docsRes.count ?? 0,
      sessionsCount:  sessionsRes.count ?? 0,
      ready:          (readyRes.count ?? 0) > 0,
    })
  } catch (err) {
    console.error('[milla/status]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch status' })
  }
})

// ── DOCUMENTS ─────────────────────────────────────────────────────────────────

millaRouter.post('/documents', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      name:    z.string().min(1),
      type:    z.enum(['pdf', 'docx', 'txt', 'url', 'other']),
      content: z.string().min(1),
    }).parse(req.body)

    const access = await requireMillaAccess(req.userId!)
    if ('error' in access) { res.status(access.status).json({ success: false, error: access.error }); return }
    const clientId = access.clientId

    const { data, error } = await db.from('milla_documents')
      .insert({
        client_id: clientId,
        name:      body.name,
        type:      body.type,
        content:   body.content,
        status:    'processing',
      })
      .select('id')
      .single()

    if (error) throw error

    // Process async — do not await
    processDocument(data.id, clientId, body.content).catch(err => {
      console.error('[milla/documents POST] processDocument error:', err)
    })

    res.status(201).json({ success: true, documentId: data.id })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[milla/documents POST]', err)
    res.status(500).json({ success: false, error: 'Failed to upload document' })
  }
})

millaRouter.get('/documents', async (req: AuthRequest, res) => {
  try {
    const access = await requireMillaAccess(req.userId!)
    if ('error' in access) { res.status(access.status).json({ success: false, error: access.error }); return }
    const clientId = access.clientId

    const { data, error } = await db.from('milla_documents')
      .select('id, name, type, status, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    console.error('[milla/documents GET]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch documents' })
  }
})

millaRouter.delete('/documents/:documentId', async (req: AuthRequest, res) => {
  try {
    const access = await requireMillaAccess(req.userId!)
    if ('error' in access) { res.status(access.status).json({ success: false, error: access.error }); return }
    const clientId = access.clientId

    const { error } = await db.from('milla_documents')
      .delete()
      .eq('id', req.params.documentId)
      .eq('client_id', clientId)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('[milla/documents DELETE]', err)
    res.status(500).json({ success: false, error: 'Failed to delete document' })
  }
})

// ── SESSIONS ──────────────────────────────────────────────────────────────────

millaRouter.post('/sessions', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      title: z.string().optional(),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db.from('milla_sessions')
      .insert({
        client_id: clientId,
        title:     body.title ?? null,
      })
      .select('id')
      .single()

    if (error) throw error
    res.status(201).json({ success: true, sessionId: data.id })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[milla/sessions POST]', err)
    res.status(500).json({ success: false, error: 'Failed to create session' })
  }
})

millaRouter.get('/sessions', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db.from('milla_sessions')
      .select('id, title, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    console.error('[milla/sessions GET]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' })
  }
})

millaRouter.get('/sessions/:sessionId/messages', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Verify session belongs to client
    const { data: session } = await db.from('milla_sessions')
      .select('id').eq('id', req.params.sessionId).eq('client_id', clientId).single()
    if (!session) { res.status(404).json({ success: false, error: 'Session not found' }); return }

    const { data, error } = await db.from('milla_messages')
      .select('id, role, content, sources, created_at')
      .eq('session_id', req.params.sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    console.error('[milla/messages GET]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch messages' })
  }
})

millaRouter.post('/sessions/:sessionId/chat', async (req: AuthRequest, res) => {
  try {
    // Cap the message length so a large paste can't blow Claude's context window
    // ("prompt is too long"). Matches the 2000-char cap used by every other chat
    // endpoint; the dedicated notetaker route handles long transcripts separately.
    const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body)

    const access = await requireMillaAccess(req.userId!)
    if ('error' in access) { res.status(access.status).json({ success: false, error: access.error }); return }
    const clientId = access.clientId

    // Verify session belongs to client
    const { data: session } = await db.from('milla_sessions')
      .select('id').eq('id', req.params.sessionId).eq('client_id', clientId).single()
    if (!session) { res.status(404).json({ success: false, error: 'Session not found' }); return }

    // Fetch last 10 messages for context
    const { data: historyRows } = await db.from('milla_messages')
      .select('role, content')
      .eq('session_id', req.params.sessionId)
      .order('created_at', { ascending: false })
      .limit(10)

    const messageHistory = (historyRows ?? []).reverse()

    // Call Milla chat
    const { reply, sources } = await chat({
      clientId,
      sessionId:      req.params.sessionId,
      userMessage:    message,
      messageHistory,
    })

    // Persist user message
    await db.from('milla_messages').insert({
      session_id: req.params.sessionId,
      client_id:  clientId,
      role:       'user',
      content:    message,
      sources:    null,
    })

    // Persist assistant message
    await db.from('milla_messages').insert({
      session_id: req.params.sessionId,
      client_id:  clientId,
      role:       'assistant',
      content:    reply,
      sources:    sources.length > 0 ? sources : null,
    })

    res.json({ success: true, reply, sources })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[milla/chat POST]', err)
    res.status(500).json({ success: false, error: 'Failed to send message' })
  }
})

// ── STATELESS SIDE-PANEL CHAT (113a) ───────────────────────────────────────────
/**
 * POST /milla/chat — quick stateless "ask Milla anything" for the right-rail
 * agent panel. Gated on an active Milla subscription (fail-open on lookup error).
 * Body: { message, history?: [{role, content}] }  →  { success, data: { reply } }
 */
millaRouter.post('/chat', async (req: AuthRequest, res) => {
  try {
    const { message, history } = z.object({
      message: z.string().min(1).max(2000),
      history: z.array(z.object({
        role:    z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })).max(12).optional(),
    }).parse(req.body)

    const access = await requireMillaAccess(req.userId!)
    if ('error' in access) { res.status(access.status).json({ success: false, error: access.error }); return }

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
      system: MILLA_CHAT_SYSTEM,
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
    console.error('[milla/chat stateless]', err)
    res.status(500).json({ success: false, error: 'Milla is temporarily unavailable' })
  }
})

// ── NOTETAKER ─────────────────────────────────────────────────────────────────

/**
 * POST /milla/notetaker
 * Accepts a meeting transcript and uses Claude to extract action items.
 * Returns { success: true, items: [{task, owner, due}] }
 */
millaRouter.post('/notetaker', async (req: AuthRequest, res) => {
  try {
    const { transcript } = z.object({
      transcript: z.string().min(1).max(20000),
    }).parse(req.body)

    // Notetaker is part of the FIGSY bundle (10 Jul) — gate on FIGSY access, not Milla.
    const access = await requireFigsyAccess(req.userId!)
    if ('error' in access) { res.status(access.status).json({ success: false, error: access.error }); return }

    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({
        success: false,
        error: 'AI service is not configured. Please set ANTHROPIC_API_KEY to enable the Notetaker feature.',
      })
      return
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const systemPrompt =
      'Extract all action items from this meeting transcript. ' +
      'Return a JSON array: [{task: string, owner: string, due: string}]. ' +
      'Owner should be a first name from the transcript. ' +
      "Due should be a natural date like 'Mon 8 Jun'. " +
      'Return ONLY the JSON array, no other text.'

    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: transcript }],
    })

    const textBlock = response.content.find(
      (block): block is Anthropic.Messages.TextBlock => block.type === 'text',
    )
    const rawText = textBlock?.text.trim() ?? '[]'

    // The model often wraps the array in a ```json … ``` fence or adds a sentence
    // of prose. Strip the fence and pull out the JSON array before parsing so the
    // UI never receives the raw fenced text as a "task".
    let cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    const firstBracket = cleaned.indexOf('[')
    const lastBracket  = cleaned.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.slice(firstBracket, lastBracket + 1)
    }

    try {
      const parsed = JSON.parse(cleaned) as unknown
      // Keep only well-formed action items; drop anything malformed so the UI
      // shows real items or a clean empty state — never raw text.
      const items = Array.isArray(parsed)
        ? parsed
            .filter((it): it is { task: unknown; owner?: unknown; due?: unknown } =>
              !!it && typeof it === 'object' && 'task' in it)
            .map(it => ({
              task:  String(it.task ?? '').trim(),
              owner: String(it.owner ?? 'Unknown').trim() || 'Unknown',
              due:   String(it.due ?? '').trim(),
            }))
            .filter(it => it.task.length > 0)
        : []
      res.json({ success: true, items })
    } catch {
      // Parsing failed entirely — return a clean empty result, not raw text.
      res.json({ success: true, items: [] })
    }
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[milla/notetaker POST]', err)
    res.status(500).json({ success: false, error: 'Failed to extract action items' })
  }
})
