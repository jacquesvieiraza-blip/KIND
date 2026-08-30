// Mount in index.ts: app.use('/milla', millaRouter)

import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { processDocument, chat } from '../lib/milla'
import { ensureTodaysBrief } from '../lib/morning-brief-deliver'
import { ensureBrief, approveBrief, editBrief } from '../lib/meeting-brief-deliver'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Stateless side-panel chat persona (113a). Distinct from the session-backed
// /sessions/:id/chat above (which does RAG + persistence): this is the quick
// "ask Milla anything" thread that lives in the right-rail agent panel.
// 12 Aug — the old constant here described the RETIRED product: the platform-era framing,
// a deleted closer agent, and Vida as a website chatbot (Vida is the INTERNAL
// operator room and never appears in anything a client reads), and portal pages from the
// retired /dashboard. Both chat doors now share ONE prompt built in lib/milla-chat-system,
// with the client's live snapshot injected — see that file for the whole story.

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
  // #489 — MANAGED-SERVICE PIVOT: Milla is the client concierge, included for EVERY managed
  // client. The old per-agent `virtual_assistant` subscription gate is superseded pricing
  // (KIND-MASTER: "+$1 Milla/Denise layer pricing → superseded"), so the only requirement
  // now is a valid client record. No separate subscription blocks the concierge chat.
  const clientId = await getClientId(userId)
  if (!clientId) return { error: 'Client not found', status: 404 }
  return { clientId }
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

// ── THE MEETING BRIEF (P34) — "Here's what I understand" ──────────────────────
//
// The client's own view of what we've understood about their business, and the
// place they correct it. Founder-ruled 21 Aug: the CLIENT approves their own
// brief — it is their business, and routing every one through an operator would
// be work nobody needs.
//
// v1 arrives as a DRAFT. A draft never reaches a model: both consumers read
// through `currentBrief`, which filters on status. Nothing about scoring or
// sequences changes until the client says the brief is right.

// GET /milla/brief — the current brief (assembling v1 on first ask).
millaRouter.get('/brief', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const r = await ensureBrief(clientId)
    if (r.status === 'no_evidence') {
      // Honest empty state. A brand-new client with no ICP and no pitch has
      // nothing we could have understood yet, and inventing a brief to fill the
      // screen is the exact thing the evidence rule forbids.
      res.json({ success: true, data: null, reason: 'no_evidence' }); return
    }
    if (r.status === 'failed') { res.status(500).json({ success: false, error: r.reason }); return }
    res.json({ success: true, data: r.brief })
  } catch (err) {
    console.error('[milla/brief GET]', err)
    res.status(500).json({ success: false, error: 'Failed to load your brief' })
  }
})

// POST /milla/brief/approve — the client confirms a draft. Metadata only.
millaRouter.post('/brief/approve', async (req: AuthRequest, res) => {
  try {
    const { version } = z.object({ version: z.number().int().positive() }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const r = await approveBrief(clientId, version)
    if (r.status === 'not_found') {
      // Either the version does not exist, belongs to someone else, or is already
      // approved. All three are "nothing to do here" and none of them should say
      // which, because that would answer a question about another tenant's data.
      res.status(404).json({ success: false, error: 'No draft at that version to approve' }); return
    }
    if (r.status === 'failed') { res.status(500).json({ success: false, error: r.reason }); return }
    res.json({ success: true, data: r.brief })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'A version number is required' }); return }
    console.error('[milla/brief approve]', err)
    res.status(500).json({ success: false, error: 'Failed to approve your brief' })
  }
})

// POST /milla/brief — a client edit. INSERTS version+1; nothing is overwritten.
millaRouter.post('/brief', async (req: AuthRequest, res) => {
  try {
    const body = z.record(z.unknown()).parse(req.body ?? {})
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const r = await editBrief(clientId, body)
    if (r.status === 'no_base') { res.status(404).json({ success: false, error: 'There is no brief to edit yet' }); return }
    if (r.status === 'conflict') {
      // Two tabs both wrote the next version. Told plainly rather than silently
      // overwriting whichever landed first.
      res.status(409).json({ success: false, error: 'Your brief changed in another tab — reload and try again' }); return
    }
    if (r.status === 'failed') { res.status(500).json({ success: false, error: r.reason }); return }
    res.status(201).json({ success: true, data: r.brief })
  } catch (err) {
    console.error('[milla/brief POST]', err)
    res.status(500).json({ success: false, error: 'Failed to save your brief' })
  }
})

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

    // P33 — MILLA'S MORNING BRIEF lands here, on the client's way IN.
    //
    // WHY THIS DOOR. /milla calls GET /sessions first, then reads the newest
    // session's messages. Writing the brief here means it is already in the thread
    // by the time that second call runs — the founder's "waiting when they log in"
    // — with no cron needed and no chance of a client arriving before one fired.
    // The founder ruled it goes out from day one ("yes send on day 1"), so a
    // brand-new client with no session gets one created for them.
    //
    // ⚠️ AWAITED, BUT IT CAN NEVER BREAK THIS RESPONSE. `ensureTodaysBrief` does
    // not throw — every failure comes back as a value — and its result is
    // deliberately ignored here. A greeting must never be the reason a client
    // cannot reach their leads. It is awaited rather than fired-and-forgotten so
    // the message is in the thread before the page asks for it; a floating promise
    // would race the very fetch it exists to populate.
    await ensureTodaysBrief(clientId)

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

// One alert per client per 15 minutes — in memory, same pattern as the approval-batch
// throttle. A restart re-arms it, which is the safe direction to fail (an extra nudge).
const lastClientMessageAlert = new Map<string, number>()
function shouldAlertClientMessage(clientId: string): boolean {
  const now = Date.now()
  const prev = lastClientMessageAlert.get(clientId) ?? 0
  if (now - prev < 15 * 60_000) return false
  lastClientMessageAlert.set(clientId, now)
  return true
}

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

    // ── THE CLIENT'S ONLY CHANNEL HAS TO REACH SOMEONE ────────────────────────────
    // Milla's chat cannot pause a campaign, source people or change an ICP — it writes a
    // message and returns text. And `/operator/asks` only surfaces threads WE started, so
    // a client typing "pause my campaign" landed in a table nobody looks at. On a managed
    // service that is the client's one channel, so it now pages the operator.
    //
    // Throttled to one alert per client per 15 minutes: a client working through a few
    // questions is one nudge, not five.
    void (async () => {
      if (!shouldAlertClientMessage(clientId)) return
      const { data: c } = await db.from('clients').select('company_name').eq('id', clientId).maybeSingle()
      const { sendFounderAlert } = await import('../lib/alerts')
      await sendFounderAlert('new_signup', `${c?.company_name ?? 'A client'} said something in Milla`, [
        `"${message.slice(0, 300)}"`,
        'Milla can answer questions but cannot DO anything — if this is a request, it needs you.',
        'It is waiting in their thread: Vida → the client → Asks.',
      ]).catch(() => {})
    })().catch(() => {})

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

    // Same fail-soft snapshot as the desk chat — one builder, every door.
    let snapshot = null as import('../lib/milla-chat-system').MillaSnapshot | null
    try {
      const { buildMillaSummaryData } = await import('../lib/milla-summary')
      snapshot = await buildMillaSummaryData(access.clientId)
    } catch (e) {
      console.error('[milla/chat stateless] snapshot lookup failed — answering without live numbers', e)
    }
    // ⚑ 30 Aug (BUILD-004A-2) — HER PROGRAMME TRUTH, from the SAME reader the workspace
    // uses. Fail-soft in its own right: `null` tells her she cannot see it, which is very
    // different from telling a paying client they have no programme.
    let programme = null as import('../lib/customer-programme').CustomerProgramme | null
    try {
      const { readCustomerProgramme } = await import('../lib/customer-programme')
      programme = await readCustomerProgramme(access.clientId)
    } catch (e) {
      console.error('[milla/chat stateless] programme lookup failed — answering without it', e)
    }
    const { buildMillaChatSystem } = await import('../lib/milla-chat-system')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: buildMillaChatSystem(snapshot, programme),
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
