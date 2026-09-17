// Mount in index.ts: app.use('/milla', millaRouter)

import { Router } from 'express'
import { z } from 'zod'
import { createHash, randomUUID } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { CONVERSATION_MODEL, AI_TURN_BOUND } from '../lib/models'
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
/**
 * 🛑 THE ID OF MILLA'S ANSWER TO ONE CUSTOMER TURN — derived, never random.
 *
 * ⚑ 15 Sep (O1 durability). One sentence may have exactly one stored answer, however many
 * times the send is replayed after an ambiguous failure. Deriving the reply's primary key
 * from the customer row's makes that a property of the table rather than of the caller's
 * retry discipline, and it costs one hash instead of a migration or a second column.
 *
 * ⚠️ IT IS A FORMATTING OF A DIGEST, NOT A SECURITY BOUNDARY. Nothing is authorised by this
 * value; it identifies a row whose session and client are checked separately above.
 */
function replyRowIdFor(userRowId: string): string {
  const h = createHash('sha256').update(`${userRowId}:milla-reply`).digest('hex')
  // Shape it as a v4-looking UUID so the column's type is satisfied.
  const v = h.slice(0, 32).split('')
  v[12] = '4'
  v[16] = '89ab'[parseInt(h[16], 16) & 0x3]
  const s = v.join('')
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`
}

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
    // ⚑ 15 Sep (O1 durability) — `messageId` IS OPTIONAL AND IS THE EXACTLY-ONCE TOKEN.
    // Absent (the ordinary composer), the row gets a server-side uuid exactly as before.
    // Present (a handed-over sentence, or any retry of one), it becomes the PRIMARY KEY of
    // the customer's row, so replaying the same send cannot create a second one.
    const { message, messageId } = z.object({
      message:   z.string().min(1).max(2000),
      messageId: z.string().uuid().optional(),
    }).parse(req.body)

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
      // ⚑ 14 Sep (R121, Build 2) — 10 → 40. Ten turns is about five exchanges: a client who
      // explained something at the top of a conversation was talking to somebody who had
      // forgotten it by the bottom. 40 matches the window the onboarding route gives her and
      // the bound the Brief transcript is stored at, so "how much does Milla remember?" has
      // one answer across the product. Deliberately NOT a summarisation call — that is a
      // second model turn per message for a problem a bigger window already solves.
      .limit(40)

    const messageHistory = (historyRows ?? []).reverse()

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 🛑 ⚑ 15 Sep (O1 durability) — ONCE THEY HAVE SENT IT, WE OWN IT. BEFORE THE MODEL.
    //
    // ⛓️ BOTH INSERTS USED TO SIT BELOW THE `chat()` CALL. So every provider failure — a
    // 529, a timeout, an interrupted response — ended with NOTHING of the customer's in
    // `milla_messages`. The browser was the only thing still holding their sentence, and one
    // reload took it. The founder's rule is that our failure never costs them their words,
    // and the Brief path has written the customer's turn before the provider since 14 Sep
    // (guarded by M6). This is the same rule, on the same kind of turn, a route later.
    //
    // ⚠️ AFTER THE HISTORY READ, DELIBERATELY. Reading first keeps the payload byte-identical
    // to what it was: the new turn reaches the model as `userMessage`, exactly once, and not
    // also as the newest row of `messageHistory`.
    //
    // ⚠️ AND IT IS IDEMPOTENT. `userRowId` is the client's `messageId` when one was sent, so a
    // retry of the same send replays the same primary key. 23505 is Postgres refusing the
    // duplicate — the repo's existing idempotency signal (`webhook-idempotency.ts`,
    // `morning-brief-deliver.ts`, `approve-lead.ts`) — and it means ALREADY OWNED, which is
    // success, not failure.
    //
    // ⚠️ FAIL-CLOSED ON ANYTHING ELSE. If the turn cannot be stored we do not call the model:
    // answering a question we did not manage to record is how a conversation silently loses
    // a turn, and the client's own composer still holds the sentence to try again.
    // ═══════════════════════════════════════════════════════════════════════════════════
    const userRowId      = messageId ?? randomUUID()
    const assistantRowId = replyRowIdFor(userRowId)

    const { error: ownErr } = await db.from('milla_messages').insert({
      id:         userRowId,
      session_id: req.params.sessionId,
      client_id:  clientId,
      role:       'user',
      content:    message,
      sources:    null,
    })
    const alreadyOwned = (ownErr as { code?: string } | null)?.code === '23505'
    if (ownErr && !alreadyOwned) {
      console.error('[milla/chat POST] could not store the customer turn', ownErr)
      res.status(503).json({ success: false, error: 'Failed to send message' })
      return
    }

    // 🛑 A RETRY OF A SEND THAT ALREADY SUCCEEDED REPLAYS THE ANSWER — IT DOES NOT RE-ASK.
    // The reply row's id is derived from the customer row's, so this is one primary-key
    // lookup. Without it an ambiguous failure after a complete turn would spend a second
    // model call and leave the client with two Milla replies to one sentence.
    if (alreadyOwned) {
      const { data: prior } = await db.from('milla_messages')
        .select('content, sources').eq('id', assistantRowId).maybeSingle()
      if (prior?.content) {
        res.json({ success: true, reply: prior.content, sources: prior.sources ?? [] })
        return
      }
    }

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

    // ⛓️ 15 Sep (O1 durability) — the user insert that stood here has moved ABOVE the model
    // call; see the block before `chat()`. Only her reply is written at this point, because
    // only her reply exists at this point.
    //
    // ⚠️ THE REPLY ROW'S ID IS DERIVED FROM THE CUSTOMER'S, so one sentence can only ever
    // have one answer stored against it, however many times the send is replayed.
    await db.from('milla_messages').insert({
      id:         assistantRowId,
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

    // ── 🛑 ⚑ 14 Sep (M4) — A CONFIGURATION FAULT IS NOT MILLA SPEAKING ──────────────────
    //
    // ⛓️ THIS ANSWERED `success: true` WITH A SENTENCE IN HER VOICE: ~~"I can't reach my
    // brain right now — please email hello@get-kind.com and the team will help."~~ To the
    // client that reads as Milla having HEARD them and declined. It is an operational fault
    // on our side, the same one the Vida console had, and it is reported as one.
    //
    // ⚠️ THE ADDRESS IS KEPT, because a client who cannot reach her still needs a way out —
    // it just travels as an honest error rather than as her answer.
    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(503).json({
        success: false, retryable: true,
        error: 'Milla is not reachable right now. Nothing you typed is lost — please try again, or email hello@get-kind.com.',
      })
      return
    }

    // ⚑ 31 Aug — SAME RE-ASSERTION AS THE DESK CHAT, AND FOR THE SAME REASON. This door
    // replays `history` from the request body, so it carries the identical exposure: prior
    // assistant turns stating the pre-#1616 sequence sit AFTER the system prompt in the
    // payload and outweigh it. The correction goes in the final user turn, with the client's
    // question still last.
    const { buildLifecycleReassertion } = await import('../lib/milla-chat-system')
    const messages: Anthropic.MessageParam[] = [
      ...(history ?? []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: `${buildLifecycleReassertion()}\n\nQuestion: ${message}` },
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
    // ⚑ 10 Sep (C06) — THE PROOF DESK, ON THIS DOOR TOO. Both chat doors share one system
    // builder precisely so a fix cannot land on one of them; a Proof block on the desk chat
    // alone would leave the side panel answering about the same set without seeing it.
    let proof = null as import('../lib/milla-proof-context').ProofChatContext | null
    try {
      const { readProofChatContext } = await import('../lib/milla-proof-context-io')
      proof = await readProofChatContext(access.clientId)
    } catch (e) {
      console.error('[milla/chat stateless] proof desk lookup failed — answering without it', e)
    }
    const { buildMillaChatSystem } = await import('../lib/milla-chat-system')

    const response = await anthropic.messages.create({
      model: CONVERSATION_MODEL,
      max_tokens: 600,
      system: buildMillaChatSystem(snapshot, programme, proof),
      messages,
    }, AI_TURN_BOUND)

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

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE PRE-CONFIRMATION BRIEF — the two doors Milla uses before a client exists.
//
// 🛑 WHY THEY EXIST. `/auth/signup` creates an auth user and nothing else; the `clients` row
// is created by the CONFIRM click. So the whole Brief conversation lived in React state in one
// browser tab — a closed tab destroyed it, and Vida could not see a person who had not
// confirmed. Preview 07 ("signed up 14 minutes ago … 10 of 11 … confirmation pending") had no
// data behind it.
//
// ⚠️ AUTH, NOT CLIENT. Every other route on this router resolves a `clients` row first. These
// two deliberately do not: the entire point is the window BEFORE one exists. `requireAuth` at
// the top of the router is the boundary, and the draft is keyed by the authenticated user.
//
// ⚠️ THEY STORE AND READ. They do not decide completeness — `draftProgress` is the shared
// eleven-fact counter, the same one the builder gate calls. There is one definition of the
// Brief in this codebase and it is not here.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The client's own draft, with its progress through the canonical eleven.
 *
 * ⚠️ A USER WITH NO DRAFT IS A 200 WITH `draft: null`, NEVER A 404. "You have not started" is
 * a normal state for a person who signed up eight seconds ago, and a 404 would have the portal
 * render an error over an empty conversation.
 */
millaRouter.get('/brief-draft', async (req: AuthRequest, res) => {
  const { briefDraftFor, draftProgress } = await import('../lib/brief-draft')
  const { onboardingState } = await import('../lib/onboarding-state')
  const { BRIEF_FACT_LABEL } = await import('@kind/shared')
  const draft = await briefDraftFor(req.userId!)
  const progress = draftProgress(draft)
  // ⚑ 16 Sep (S1-ONB-001) — THE SAME AUTHORITY THE CHAT AND CONFIRM DOORS USE, so a refresh
  // returns the client to the state the server actually holds rather than to whatever the
  // browser last believed. This is the portal's progression gate.
  const onboarding = onboardingState(draft?.facts ?? null)
  const onboardingFacts = (draft?.facts ?? {}) as Record<string, unknown>
  const onboardingText = (k: string): string =>
    typeof onboardingFacts[k] === 'string' ? (onboardingFacts[k] as string).trim() : ''
  // ⚠️ THE NEXT FACT IS NAMED HERE, NOT WORKED OUT IN THE BROWSER. The portal's resume line
  // says what Milla still needs; deriving that in the portal would mean a second eleven-fact
  // list in a second app, which is exactly how Vida came to disagree with Milla about the
  // count. `missing` is already in the approved order, so the next one is its head.
  const nextId = progress.missing[0] ?? null
  res.json({
    success: true,
    data: {
      draft: draft ? { facts: draft.facts, confirmed_at: draft.confirmedAt, promoted_client_id: draft.promotedClientId } : null,
      progress,
      next: nextId ? { id: nextId, label: BRIEF_FACT_LABEL[nextId] } : null,
      // ⚠️ THE STATE IS THE SERVER'S ANSWER, not a count for the client to read. The portal
      // gates the targeting plan and the Confirm CTA on it and renders no counter.
      onboarding_state: onboarding.state,
      onboarding_unresolved: onboarding.unresolvedLabels,
      // ── ⚑ 16 Sep (S1-ONB-001) — THE RENDER SHAPE, BUILT HERE AND NOT IN THE BROWSER ───
      //
      // 🛑 THE CARDS USED TO COME ONLY FROM A COMPLETION REPLY held in one tab, so a client
      // who had already said where they are based and then refreshed was shown
      // "Based in — still needed" about a country THIS VERY ROW was holding.
      //
      // ⚠️ MAPPED SERVER-SIDE ON PURPOSE. Sending raw `facts` would make the portal learn our
      // fact vocabulary — `exclusions`, `what_they_do` — which is the first step back towards
      // a second opinion about the Brief. It receives finished render objects and assigns them.
      onboarding_profile: {
        company_name: onboardingText('company_name'),
        country:      onboardingText('country'),
        contact_name: onboardingText('contact_name'),
        phone:        onboardingText('phone'),
        website:      onboardingText('website'),
        industry:     onboardingText('what_they_do'),
      },
      onboarding_business: {
        product: onboardingText('what_they_do'),
        bad_fit: onboardingText('exclusions'),
      },
      // ── ⚑ 14 Sep (S1-RT-003) — THE CONVERSATION, so re-entry continues it ────────────
      //
      // 🛑 THE FACTS ALONE WERE NEVER ENOUGH. The resume line could say "9 of 11", but the
      // transcript lived in one tab's React state — so a refresh, a closed laptop or a
      // logout put the client in front of a blank conversation, and sent Milla her NEXT turn
      // with a one-line greeting as its entire history. She is conversational by design,
      // because clients express the same truth in different ways; a Milla with no memory of
      // the last ten minutes is a different product.
      //
      // ⚠️ ALREADY BOUNDED AND ALREADY VALIDATED by `readConversation` — at most the last 40
      // turns, each clamped, unknown roles dropped. A corrupt jsonb value reads as `[]` and
      // the page behaves exactly as it did before this existed.
      //
      // ⚠️ AND IT IS THE CLIENT'S OWN. This router carries the client's token and the draft
      // is keyed on `user_id`, so no transcript can reach anybody but the person who spoke it.
      conversation: draft?.conversation ?? [],
    },
  })
})

/**
 * Persist what Milla has learned so far.
 *
 * ⚠️ MERGED, NOT REPLACED — see `saveBriefDraft`. Milla learns one thing at a time and a PUT
 * carrying only the newest answer must never erase the ten before it.
 *
 * ⚠️ A PROMOTED DRAFT IS REFUSED WITH 409. It is evidence: the confirmed client and ICP are
 * the operational truth, and a late write here could leave the draft's category wording and
 * the ICP's disagreeing with nothing to say which was right.
 *
 * ⚠️ AND AN UNSTORABLE WRITE ANSWERS HONESTLY (503). Silently discarding a client's answers is
 * the defect this whole table replaces; a portal that is told the save failed can keep its own
 * state and try again, which is strictly better than believing a lie.
 */
/**
 * 🛑 THE CLIENT CONFIRMS THEIR BRIEF — the separate gate, and the door promotion waits behind.
 *
 * ⚠️ ELEVEN FACTS DO NOT CONFIRM ANYTHING. Holding all eleven means Milla has stopped asking.
 * It says nothing about whether the client read what she understood and agreed to it, and
 * Proof is sourced against this brief. So confirmation is an ACT, never an inference from a
 * count, from silence, or from the screen having got as far as showing a button.
 *
 * ⚠️ THE ELEVEN ARE RE-CHECKED HERE. 400 with the missing facts NAMED, so the client is told
 * what is outstanding rather than that something went wrong.
 *
 * ⚠️ IT CREATES NOTHING. No client, no ICP, no Proof — it records agreement. `/auth/onboard`
 * is what promotes, and it now refuses a draft this route has not stamped.
 *
 * ⚠️ AND IT IS THE CLIENT'S OWN, NOT AN OPERATOR'S. This router carries the client's token.
 */
millaRouter.post('/brief-draft/confirm', async (req: AuthRequest, res) => {
  const { confirmBriefDraft } = await import('../lib/brief-draft')
  const { BRIEF_FACT_LABEL } = await import('@kind/shared')
  const r = await confirmBriefDraft(req.userId!)
  // ── 🛑 J4-C1 · PROMOTION IS THIS CALL'S JOB NOW, NOT THE BROWSER'S ──────────────────
  //
  // ⛓️ WHAT THIS REPLACED: ~~`res.json({ data: { confirmed_at } })`~~ and then THREE more
  // browser calls — `/auth/onboard`, `POST /icps`, `POST /icps/:id/proof`. Every gap between
  // them stranded a real person: a closed tab, a slept phone or a 500 on leg 3 left a seal
  // with no client, or a client with no targeting, and nothing server-side knew the journey
  // was meant to continue. LR 6/21 and PV 07: the four legs are ONE decision.
  //
  // ⚠️ VALIDATION STILL HAPPENS FIRST, AND THAT ORDER IS THE CONTRACT. `confirmBriefDraft`
  // runs the eleven-fact gate and the geography refusal above; a refusal returns below having
  // created nothing. Only a confirmed brief is ever promoted.
  //
  // ⚠️ PROMOTION FAILING DOES NOT UNDO THE CONFIRMATION, and must not. `confirmed_at` is the
  // client's own act and is a fact once it happened; `promoteConfirmedBrief` is ensure-shaped,
  // so the next call finishes what this one could not. What the client must never see is a
  // success that created nothing — hence the 503 with `retryable`.
  if (r.ok) {
    const { promoteConfirmedBrief } = await import('../lib/promotion')
    const p = await promoteConfirmedBrief(req.userId!, r.draft, { authEmail: req.authEmail ?? null })
    if (!p.ok) {
      res.status(503).json({
        success: false, retryable: true, code: p.reason,
        error: 'We recorded your confirmation but could not finish setting your account up. Nothing you told Milla is lost — please try again.',
      })
      return
    }
    res.json({ success: true, data: {
      confirmed_at: r.draft.confirmedAt,
      client_id: p.clientId,
      icp_id: p.icpId,
      // The desk uses this to decide whether to claim a wait. `proof_note` is carried so the
      // surface can be honest when Proof did not start — never silently optimistic.
      proof_started: Boolean(p.proofClaimId),
      ...(p.proofNote ? { proof_note: p.proofNote } : {}),
      replayed: p.replayed === true,
    } })
    return
  }
  if (r.reason === 'incomplete') {
    // ⛓️ 16 Sep (S1-ONB-001) — THE SENTENCE NAMES BOTH CLASSES. `missing` is the canonical
    // eleven as ids and is unchanged for existing callers; `missingLabels` is the complete
    // list, so a Brief held back only by the client's own country no longer produces
    // "Milla still needs  before you can confirm."
    const names = (r.missingLabels && r.missingLabels.length > 0)
      ? r.missingLabels
      : (r.missing ?? []).map(id => BRIEF_FACT_LABEL[id as keyof typeof BRIEF_FACT_LABEL])
    res.status(400).json({
      success: false,
      error: `Milla still needs ${names.join(', ')} before you can confirm.`,
      missing: r.missing ?? [],
    })
    return
  }
  // ── 🛑 ⚑ 14 Sep (S1-RT-006) — A RECOVERABLE CONVERSATIONAL STATE, NOT AN ERROR ──────
  //
  // 🛑 THE CLIENT ASKED FOR A MARKET WE DO NOT WORK IN, and until now they found that out as
  // a raw Zod 400 on `POST /icps` — AFTER `/auth/onboard` had created their canonical client
  // row. A real person, now a client, with no ICP and a validation error on screen.
  //
  // ⚠️ 409 WITH A `code`, SO THE CONVERSATION CAN HANDLE IT. The portal branches on the code
  // and puts `ask` into the thread as Milla's own turn; the client answers in words. This is
  // the difference between a limitation explained and a product that broke.
  //
  // ⚠️ NOTHING HAS BEEN CREATED AND NOTHING IS LOST. The stamp was not written, so the client
  // row, the ICP, the welcome email and Proof are all still behind a door that did not open —
  // and the draft still holds every answer and the whole conversation.
  //
  // ⚠️ BOTH HALVES TRAVEL. `supported` and `unsupported` are returned so the client is told
  // exactly what we can and cannot do: "UK, US and Brazil" must never quietly become "UK and
  // US" without them choosing it.
  if (r.reason === 'unsupported_geography') {
    res.status(409).json({
      success: false,
      code: 'unsupported_geography',
      error: r.ask,
      ask: r.ask,
      unsupported: r.unsupported,
      supported: r.supported,
    })
    return
  }
  // ── 🛑 J4-C1 · A REPLAY IS ANSWERED WITH THE WINNER'S IDS, NOT A 409 ────────────────
  //
  // ⛓️ WHAT THIS REPLACED: ~~`res.status(409)`~~ with "this brief has already been confirmed".
  //
  // That was right while confirming and promoting were separate acts — the second confirm
  // genuinely had nothing to do. Now that confirm IS promotion, a 409 punishes the normal
  // case: a double click on a slow connection, or a retry after a response we never received.
  // The manifest's own GREEN for this item says it — *"a duplicate confirm returns the
  // winner's ids"* — and the caller needs those ids to navigate.
  //
  // ⚠️ IT CREATES NOTHING. `promoteConfirmedBrief` is ensure-shaped, so this path also
  // FINISHES an interrupted promotion (client exists, ICP never written) instead of leaving a
  // real person behind a door that answers 409 for ever. `replayed: true` tells the caller
  // which happened without it having to guess.
  if (r.reason === 'promoted') {
    const { promoteConfirmedBrief } = await import('../lib/promotion')
    const { briefDraftFor } = await import('../lib/brief-draft')
    const again = await briefDraftFor(req.userId!)
    if (again) {
      const p = await promoteConfirmedBrief(req.userId!, again, { authEmail: req.authEmail ?? null })
      if (p.ok) {
        res.json({ success: true, data: {
          confirmed_at: again.confirmedAt,
          client_id: p.clientId, icp_id: p.icpId,
          proof_started: Boolean(p.proofClaimId),
          ...(p.proofNote ? { proof_note: p.proofNote } : {}),
          replayed: true,
        } })
        return
      }
    }
    // Only when the replay itself cannot be completed does the client see a refusal — and it
    // is retryable, because the ids exist and the next attempt will find them.
    res.status(503).json({
      success: false, retryable: true,
      error: 'Your brief is confirmed. We could not read your account back just now — please try again.',
    })
    return
  }
  if (r.reason === 'no_draft') {
    res.status(404).json({ success: false, error: 'There is no brief to confirm yet.' })
    return
  }
  res.status(503).json({
    success: false, retryable: true,
    error: 'We could not record that just yet. Nothing you told Milla is lost — please try again.',
  })
})

millaRouter.put('/brief-draft', async (req: AuthRequest, res) => {
  const facts = z.object({
    contact_name:        z.string().max(120).nullish(),
    company_name:        z.string().max(200).nullish(),
    website:             z.string().max(300).nullish(),
    website_none:        z.boolean().nullish(),
    what_they_do:        z.string().max(1200).nullish(),
    target_category:     z.string().max(200).nullish(),
    geographies:         z.array(z.string().max(80)).max(8).nullish(),
    target_company_type: z.string().max(120).nullish(),
    company_sizes:       z.array(z.string().max(40)).max(6).nullish(),
    job_titles:          z.array(z.string().max(80)).max(10).nullish(),
    seniority_levels:    z.array(z.string().max(40)).max(6).nullish(),
    exclusions:          z.string().max(600).nullish(),
    desired_outcome:     z.string().max(2000).nullish(),
    desired_outcome_kind: z.string().max(20).nullish(),
    country:             z.string().max(120).nullish(),
    phone:               z.string().max(60).nullish(),
  }).parse(req.body ?? {})

  const { saveBriefDraft, draftProgress } = await import('../lib/brief-draft')
  const r = await saveBriefDraft(req.userId!, facts)
  if (!r.ok) {
    if (r.reason === 'promoted') {
      res.status(409).json({
        success: false,
        error: 'This brief has already been confirmed. Your programme is the live record of it now.',
      })
      return
    }
    // ⚠️ `unverifiable` IS ALSO 503-RETRYABLE, AND IT IS THE FAIL-CLOSED PATH. We could not
    // establish whether this brief has already been confirmed, so we refuse rather than risk
    // writing beside a confirmed client — and rather than upserting a facts object built from
    // a read that failed, which would erase every answer already collected.
    res.status(503).json({
      success: false, retryable: true,
      error: 'We could not save that just yet. Nothing you told Milla is lost — she still has it.',
    })
    return
  }
  res.json({ success: true, data: { progress: draftProgress(r.draft) } })
})
