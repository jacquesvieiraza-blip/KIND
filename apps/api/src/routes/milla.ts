// Mount in index.ts: app.use('/milla', millaRouter)

import { Router } from 'express'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { processDocument, chat } from '../lib/milla'
import { ensureTodaysBrief } from '../lib/morning-brief-deliver'
import { ensureBrief, approveBrief, editBrief } from '../lib/meeting-brief-deliver'
import { BACKGROUND_MODEL } from '../lib/models'
// ⚑ 22 Sep — THE REQUEST BUILDER, so the Brief panel's "stored & sent as" line can print what
// Apollo actually receives rather than our own stored labels. Pure, spends nothing, makes no
// network call — the panel reads the search instead of describing it.
import { buildSearchBody } from '../lib/apollo'
import { apolloIndustriesOnly, NEVER_CONTACT_KINDS } from '@kind/shared'

// ⛓️ 18 Sep (D-63) — ~~`const anthropic = new Anthropic(…)`~~ AND THE PERSONA NOTE THAT STOOD
// HERE WENT WITH THE STATELESS DOOR. The module-level client had exactly one reader, the
// removed `POST /milla/chat`; `/notetaker` builds its own below. The note described how the
// two chat doors shared one prompt — true, and now there is only one door, so the whole story
// lives where it always did: `lib/milla-chat-system`.

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

// ── ⚑ 25 Sep (R162) — MILLA'S PROGRAMME NOTICES ARE KEPT IN THE CLIENT'S THREAD ─────────────
// The founder's House walk: "this is now version 4" vanished on a refresh — Milla's screen drew it
// and nothing kept it. The browser sends only WHICH notice (a kind, its parameter and a key); the
// sentences are composed here from `millaNoticeLines`, so a client screen can never put words in
// Milla's mouth. Row ids derive from the key, so the same notice is written once. Own thread only.
millaRouter.post('/sessions/:sessionId/notices', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: session } = await db.from('milla_sessions')
      .select('id').eq('id', req.params.sessionId).eq('client_id', clientId).single()
    if (!session) { res.status(404).json({ success: false, error: 'Session not found' }); return }

    const body = (req.body ?? {}) as { kind?: unknown; param?: unknown; key?: unknown }
    const key = typeof body.key === 'string' ? body.key.trim().slice(0, 160) : ''
    const param = typeof body.param === 'string' || typeof body.param === 'number' ? body.param : null
    const { isMillaNoticeKind, millaNoticeLines } = await import('@kind/shared')
    const lines = isMillaNoticeKind(body.kind) && key ? millaNoticeLines(body.kind, param) : null
    if (!lines) { res.status(400).json({ success: false, error: 'Not a notice Milla can keep. Nothing was written.' }); return }

    const { noticeRowIdFor } = await import('../lib/customer-turn')
    for (let i = 0; i < lines.length; i++) {
      const { error } = await db.from('milla_messages').insert({
        id: noticeRowIdFor(req.params.sessionId, key, i),
        session_id: req.params.sessionId, client_id: clientId,
        role: 'assistant', content: lines[i], sources: null,
      })
      // Already kept (the same notice from another tab or a retry) is success, not failure.
      if (error && (error as { code?: string }).code !== '23505') throw error
    }
    res.json({ success: true, kept: lines.length })
  } catch (err) {
    console.error('[milla/notices POST]', err)
    res.status(500).json({ success: false, error: 'The notice could not be kept' })
  }
})

// One alert per client per 15 minutes — in memory, same pattern as the approval-batch
// throttle. A restart re-arms it, which is the safe direction to fail (an extra nudge).
// ⛓️ 18 Sep (J3-C2) — `replyRowIdFor` MOVED TO `lib/customer-turn.ts`, WITH THE RULE AROUND IT.
// WHAT STOOD HERE: ~~the whole derivation, private to this file~~. It was built here on 15 Sep
// (O1) and the Brief path had built the same idempotency shape a day earlier — two copies of
// "one sentence, one answer", which is exactly how a THIRD door (`/icps/chat-build`) came to be
// built with neither. The rule is now one module and every door imports it.

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
    const { ownCustomerTurn, existingReply, storeMillaReply } = await import('../lib/customer-turn')
    const owned = await ownCustomerTurn({
      sessionId: req.params.sessionId,
      clientId,
      content: message,
      userRowId: messageId ?? randomUUID(),
    })
    if (!owned.ok) {
      console.error('[milla/chat POST] could not store the customer turn', owned.error)
      res.status(503).json({ success: false, error: 'Failed to send message' })
      return
    }
    const { assistantRowId, alreadyOwned } = owned

    // 🛑 A RETRY OF A SEND THAT ALREADY SUCCEEDED REPLAYS THE ANSWER — IT DOES NOT RE-ASK.
    // The reply row's id is derived from the customer row's, so this is one primary-key
    // lookup. Without it an ambiguous failure after a complete turn would spend a second
    // model call and leave the client with two Milla replies to one sentence.
    if (alreadyOwned) {
      const prior = await existingReply(assistantRowId)
      if (prior) {
        res.json({ success: true, reply: prior.content, sources: prior.sources ?? [] })
        return
      }
    }

    // Call Milla chat
    const { reply, sources, stillNotRight } = await chat({
      clientId,
      sessionId:      req.params.sessionId,
      userMessage:    message,
      messageHistory,
    })

    // ── 🛑 ⚑ 18 Sep (J7-C2 · FD-3) — SAYING IT IN CHAT IS SAYING IT ────────────────────
    //
    // 🛑 THE ONLY WAY TO SAY IT WAS TO PRESS A BUTTON. `POST /leads/proof/still-not-right` is
    // the canonical escalation; it is reached by ONE control on the Proof panel. A client who
    // typed "honestly these still aren't the right people" into their own conversation got a
    // reply and nothing else — their sentence reached no decision at all.
    //
    // ⚠️ THE SAME CALL THE BUTTON MAKES, AND THAT IS THE ITEM. Not a second escalation path,
    // not a variant trigger, not an alert standing in for one. `closeCalibrationLoop` decides
    // (via `calibrationVerdict`, which still refuses before pass 2 — FD-3 makes the signal
    // reachable, it does not make it a bypass) and writes ONCE: its
    // `.is('proof_review_requested_at', null)` predicate is what makes "once" true whatever
    // combination of button and sentence a client uses.
    //
    // ⚠️ BEST-EFFORT, AND THE DIRECTION IS DELIBERATE. Their reply is already produced; an
    // escalation we could not record must not turn their message into an error. Logged loudly,
    // because a persistent failure here means people are asking for help and not reaching one.
    if (stillNotRight.said) {
      try {
        const { closeCalibrationLoop } = await import('../lib/proof-calibration-io')
        const outcome = await closeCalibrationLoop(clientId, 'still_not_right')
        console.log(
          `[milla/chat] client ${clientId} said the set is still not right, in chat — ` +
          `${outcome.closed ? `escalated (${outcome.trigger})` : `not closed (${outcome.reason})`}.` +
          (stillNotRight.quote ? ` Their words: "${stillNotRight.quote}"` : ''),
        )
        if (!outcome.closed && (outcome.reason === 'migration_required' || outcome.reason === 'unreadable')) {
          console.error(`[milla/chat] the hand-off for client ${clientId} could NOT be recorded: ${outcome.detail}`)
        }
      } catch (err) {
        console.error('[milla/chat] escalation from chat failed (their reply is unaffected):', err)
      }
    }

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
    await storeMillaReply({
      assistantRowId,
      sessionId: req.params.sessionId,
      clientId,
      content: reply,
      sources,
    })

    res.json({ success: true, reply, sources })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[milla/chat POST]', err)
    res.status(500).json({ success: false, error: 'Failed to send message' })
  }
})

// ── ⛓️ STATELESS SIDE-PANEL CHAT (113a) — UNMOUNTED 18 Sep (D-63) ──────────────────────
//
// 🛑 ~~`millaRouter.post('/chat', …)`~~ STOOD HERE, AND IT WAS A SECOND MILLA WITH NO MEMORY.
// It answered from the `history` array in the request body and stored nothing: close the tab
// and every word was gone, while the desk conversation beside it remembered everything. Two
// Millas, one client, and only one of them could be asked "what did we say last week?".
//
// ⛓️ IT WAS DISCONNECTED ON 14 Sep (R121 · O1) — `liveChatEndpoint="/milla/chat"` came off
// `AgentColumn`'s Milla card and nothing in the product has posted to it since. But
// DISCONNECTED IS NOT UNMOUNTED: the door stayed open on an authenticated, subscription-gated
// route, so any caller that still knew the URL got the forgetful Milla back — and the guard
// that protects this only ever proved no UI hands out the endpoint, never that the endpoint
// was gone. That gap is what this closes.
//
// ⚠️ NOTHING MOVED WITH IT. Every capability this door had — the lifecycle re-assertion, the
// snapshot, the programme read, the proof-desk context — is built by the SAME
// `buildMillaChatSystem`/`buildLifecycleReassertion` the persisted desk chat uses, and the
// desk chat is untouched. There was never a fact reachable here and nowhere else.
//
// ⚠️ THE ONE DISCLOSED CONSEQUENCE: a browser still running a bundle from before 14 Sep would
// POST here and now receives 404 instead of an answer. A reload resolves it, and the reply it
// used to get was one no session would have remembered.

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
      model:      BACKGROUND_MODEL,
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
/**
 * ── 🛑 ⚑ 18 Sep (J3-C2's sibling, J3-C3) — ONE BRIEF READ MODEL ────────────────────────
 *
 * LR 6: two projections of one truth that nobody reconciles WILL drift. `GET /brief-draft`
 * answered with the draft, the progress, the next fact, the onboarding state and unresolved
 * labels, the two render blocks and the conversation. `PUT /brief-draft` answered with
 * `{ progress }` and nothing else.
 *
 * 🛑 SO EVERY CALLER HELD A STALE ANSWER THE MOMENT IT SAVED. A PUT that completes the tenth
 * fact returns a progress object while `onboarding_state`, `next` and the render cards in the
 * browser still describe the state BEFORE the save — which is the "Based in — still needed"
 * shape S1-ONB-001 already fixed once, arriving through the other verb. A caller either
 * re-GETs (a second round trip and a window in which the two disagree) or renders something
 * the server does not believe.
 *
 * ⚠️ IT IS BUILT ONCE AND RETURNED BY BOTH VERBS. Not "the same fields" — the same function,
 * so a field added to one is added to both by construction and there is no reconciliation to
 * forget.
 */
async function briefReadModel(userId: string): Promise<Record<string, unknown>> {
  const { briefDraftFor, draftProgress } = await import('../lib/brief-draft')
  const { onboardingState } = await import('../lib/onboarding-state')
  const { BRIEF_FACT_LABEL } = await import('@kind/shared')
  const { icpFromDraft } = await import('../lib/promotion')
  const draft = await briefDraftFor(userId)
  return briefReadModelFrom(
    draft, draftProgress(draft), onboardingState(draft?.facts ?? null), BRIEF_FACT_LABEL, icpFromDraft,
  )
}

/**
 * The shape, from facts already in hand — so a writer that just saved need not re-read.
 *
 * ⚑ 22 Sep — EXPORTED, AND ONLY SO THE PANEL CAN BE PROVED BY RUNNING IT. The defect this
 * function carried for a month — an empty draft producing NO targeting rows, so the client's
 * first screen had nothing on it — was invisible to every source-scanning guard in the repo,
 * because the bug was in what the code DID, not in what it said. It is pure and synchronous
 * (that is why `labels` and `icpFrom` are parameters), so a test can call it with a blank
 * draft and count the rows. No route behaviour changes: both verbs still call it internally.
 */
export function briefReadModelFrom(
  draft: Awaited<ReturnType<typeof import('../lib/brief-draft')['briefDraftFor']>>,
  progress: { missing: string[] } & Record<string, unknown>,
  onboarding: { state: unknown; unresolvedLabels: unknown },
  labels: Record<string, string>,
  // ⚑ 22 Sep — PASSED IN, LIKE `labels`, FOR THE REASON THIS FUNCTION ALREADY EXISTS. It is
  // promotion's own `icpFromDraft`; handing it in keeps this builder synchronous and keeps
  // both verbs on one function, so the panel cannot describe a draft differently depending on
  // which verb asked.
  icpFrom: (d: NonNullable<Parameters<typeof briefReadModelFrom>[0]>) => Record<string, unknown>,
): Record<string, unknown> {
  const targetingFromDraft = (d: typeof draft) => (d ? icpFrom(d) : null)
  const onboardingFacts = (draft?.facts ?? {}) as Record<string, unknown>
  const onboardingText = (k: string): string =>
    typeof onboardingFacts[k] === 'string' ? (onboardingFacts[k] as string).trim() : ''
  const nextId = progress.missing[0] ?? null
  return {
    draft: draft ? { facts: draft.facts, confirmed_at: draft.confirmedAt, promoted_client_id: draft.promotedClientId } : null,
    progress,
    next: nextId ? { id: nextId, label: labels[nextId] } : null,
    onboarding_state: onboarding.state,
    onboarding_unresolved: onboarding.unresolvedLabels,
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
    // ⚑ 22 Sep — THE OUTCOME TILE'S ONE SOURCE. The approved portal leads the workspace with
    // what the client is trying to ACHIEVE, in their words, before any targeting detail —
    // and it is the client's own `desired_outcome` fact, never a sentence we compose about
    // them. Empty string is the locked empty state ("Not set yet"), not a missing field.
    onboarding_outcome: onboardingText('desired_outcome'),
    // ── 🛑 ⚑ 22 Sep — WHAT THEY SAID, AND WHAT WE WILL ACTUALLY SEARCH ON ────────────────
    //
    // 🛑 FOUNDER-LOCKED 22 Sep: *"they speak there and see there."* A client could talk to
    // Milla and see nothing of what she had understood until she proposed a finished ICP at
    // the end — so a misread fact was discovered after a run, by which time it had already
    // shaped a search. This puts each fact on the panel AS IT LANDS, beside the provider
    // value it produces, while the client is still in the conversation to correct it.
    //
    // 🛑 AND IT IS `icpFromDraft`, NOT A SECOND DERIVATION. That function is promotion's own
    // — *"the one server-side derivation"* — so what this panel shows is the same bytes the
    // confirm will persist and the search will send. A display-only copy of the same rules
    // would agree today and drift on the first change to either; this cannot drift, because
    // there is only one of it.
    //
    // ⚠️ FINISHED RENDER OBJECTS, so the portal still learns nothing about our vocabulary —
    // the rule this read model already follows for the profile and business cards.
    // `sending: []` is a real and meaningful state, not a gap: a category we could not place
    // in the provider's closed list is used to ORDER results rather than to filter them, and
    // exclusions never reach a search at all because they remove people rather than find any.
    ...(() => {
      // ── 🛑 ⚑ 22 Sep — THE SIX FIELDS ARE THE WORKSPACE, SO THEY ALWAYS EXIST ───────────
      //
      // ⛓️ WAS: ~~`if (!icp) return { onboarding_targeting: [] … }`~~ followed by
      // ~~`.filter(r => r.said !== '' || r.sending.length > 0)`~~ — the two lines that made
      // the locked landing screen impossible to render.
      //
      // 🛑 THE DEFECT THEY CAUSED, EXACTLY. A client who has just signed up has no draft, so
      // the first branch returned an EMPTY LIST; a client three answers in had four empty
      // rows, so the filter DROPPED them. Either way the panel could only ever show a field
      // that was already answered — and the approved portal's first screen is six LABELLED,
      // EMPTY fields reading "Milla will fill this". The workspace is the thing the client
      // watches fill up. A workspace that does not exist until it is full cannot do that, and
      // what the founder actually landed on was one sentence in a white box.
      //
      // ⚠️ SO THE LIST IS FIXED AND ITS LENGTH IS CONSTANT. Six rows, in the approved order,
      // present before a single word has been spoken. `said`/`sending` empty is the EMPTY
      // STATE — a real state the panel renders — never a reason to omit the field.
      //
      // ⚠️ `placeholder` IS THE SERVER'S, like every other word here. This read model's own
      // rule is that the portal learns nothing about our vocabulary, so the copy for an
      // unanswered field is sent rather than reconstructed from the row's id — otherwise the
      // portal would need to know that `exclusions` is the one field Milla ASKS for rather
      // than derives, which is exactly the knowledge this boundary exists to withhold.
      const icp = (targetingFromDraft(draft) ?? {}) as Record<string, unknown>
      const list = (k: string): string[] =>
        Array.isArray(icp[k]) ? (icp[k] as unknown[]).filter((x): x is string => typeof x === 'string') : []

      // ── 🛑 ⚑ 22 Sep — "stored & sent as" NOW MEANS WHAT IT SAYS ────────────────────────
      //
      // ⛓️ WAS: the panel printed `sending` — our OWN stored labels, `'C-Suite'` and
      // `'11–50'` — under a line reading *"stored & sent as"*. Stored, yes. Sent, no: Apollo
      // receives `c_suite` and `11,50`, and the locked preview prints exactly those.
      //
      // 🛑 THE LINE IS THE WHOLE CLAIM OF THIS PANEL — *"no later comparison can disagree with
      // what was searched"* — so a caption that names the request and shows something else is
      // worse than no caption. `buildSearchBody` IS the request builder; calling it means the
      // panel cannot drift from the search, because it is reading the search.
      //
      // ⚠️ IT TOUCHES NO PROVIDER AND SPENDS NOTHING. It is a pure object builder; the network
      // call is `searchPeople`, which is not here.
      const sent = buildSearchBody({
        job_titles: list('job_titles'), seniority_levels: list('seniority_levels'),
        company_sizes: list('company_sizes'), geographies: list('geographies'),
        // ⛓️ 24 Sep (R145 step 3a) — WAS `industries: []`: the industry was never sent. It is now
        // (Apollo's own entries only), so this preview is still the real request.
        industries: list('industries'), tech_stack: [], keywords: [], apollo_only_consented: true,
      }, 1)
      const asSent = (k: 'person_titles' | 'person_seniorities' | 'organization_num_employees_ranges' | 'person_locations' | 'q_organization_keyword_tags'): string[] =>
        Array.isArray(sent[k]) ? (sent[k] as string[]) : []

      // ⚑ 23 Sep (R142 · A2a) — the industries the client PICKED from Apollo's list, and nothing else.
      const pickedFacts = ((draft?.facts ?? {}) as Record<string, unknown>).picked as Record<string, unknown> | undefined
      const pickedIndustries = apolloIndustriesOnly(Array.isArray(pickedFacts?.industries) ? pickedFacts!.industries as unknown[] : [])
      const strs = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
      const pickedKinds = strs(pickedFacts?.exclusion_kinds)
      const pickedNamed = strs(pickedFacts?.exclusions)
      const REVIEW_ROW: Record<string, string> = { seniority_levels: 'seniority', company_sizes: 'company_size' }
      const review = icp.icp_review as { requirements?: Array<{ field?: string; said?: unknown }> } | undefined
      const needsPick = (review?.requirements ?? [])
        .filter(r => typeof r.field === 'string' && REVIEW_ROW[r.field])
        .map(r => ({ id: REVIEW_ROW[r.field as string], said: strs(r.said) }))

      const row = (
        id: string, label: string, said: string, sending: string[], placeholder: string,
        note?: string, provider?: string[],
        // ⚑ 24 Sep (R145 step 2 · #73) — a row the client edits under its OWN draft key, with a
        // second closed tick-list. Sent, so the portal never names a fact of ours.
        pickAs?: { key: string; kinds: readonly string[]; kinds_chosen: string[]; kinds_key: string },
      ) => ({ id, label, said, sending, placeholder, provider: provider ?? [], ...(note ? { note } : {}), ...(pickAs ? { pick: pickAs } : {}) })
      const FILL = 'Milla will fill this'
      return {
        onboarding_targeting: [
          row('target_roles',    'Job titles',   onboardingText('target_roles'),    list('job_titles'),      FILL,
            undefined, asSent('person_titles')),
          row('seniority',       'Seniority',    onboardingText('target_roles'),    list('seniority_levels'), FILL,
            undefined, asSent('person_seniorities')),
          row('company_size',    'Employees',    onboardingText('company_size'),    list('company_sizes'),   FILL,
            undefined, asSent('organization_num_employees_ranges')),
          row('geography',       'Location',     onboardingText('geography'),       list('geographies'),     FILL,
            undefined, asSent('person_locations')),
          // ── 🛑 ⚑ 22 Sep — IT ORDERS THE RESULTS. IT NEVER LEAVES ANYBODY OUT ────────────
          //
          // ⛓️ WAS: ~~`'Kind of company'`~~, with the "used to order" note attached ONLY when
          // `industries` came back EMPTY — so the client was told it never excludes anyone in
          // precisely the case where it excluded nobody, and told nothing at all in the case
          // where it excluded thousands. The label and the note both described the failure
          // mode rather than the rule.
          //
          // 🛑 THE APPROVED PORTAL NAMES THIS FIELD "Order by (never excludes)" AND MEANS IT
          // UNCONDITIONALLY. `buildSearchBody` no longer sends the client's category to the
          // provider as a filter at all (see `apollo.ts`), so the note is now simply TRUE
          // rather than true-when-we-happened-to-fail — which is why it is no longer
          // conditional. A sentence that is only accurate in the degraded case is the kind of
          // copy that reads as reassurance and functions as a lie.
          // ⛓️ 23 Sep (R142 · A2a) — WAS `row('target_category', 'Order by (never excludes)', …,
          // FILL, 'used to order the results — it never leaves anybody out')`. Founder: *"this is
          // why we use apollo drop downs and make sure we do not assume"* · *"milla must say
          // please look to the right and drop down and choose."* The client now PICKS their
          // industries from Apollo's own list here; their words stay shown underneath.
          // ⚠️ ONLY WHAT THE CLIENT PICKED. `list('industries')` would also show a value WE derived
          // from their sentence through the old sixteen-word list — an assumption, and one that
          // would satisfy the "pick an industry first" lock without the client ever choosing.
          row('target_category', 'Industry', onboardingText('target_category'), pickedIndustries,
            'Choose from the list', 'from Apollo’s own industry list', asSent('q_organization_keyword_tags')),
          // ⚠️ THE ONE FIELD MILLA ASKS FOR. Exclusions are never derived from anything the
          // client said about who they WANT — they are an instruction, which is why this is
          // also the only row whose note claims to remove anybody.
          // ⚑ 24 Sep (R145 step 2 · #73) — WAS `[]`: the row could only ever be said, never picked.
          // It now shows what the client ticked and named, so "Never contact" is a list they can see.
          row('exclusions',      'Never contact', onboardingText('exclusions'),
            pickedNamed,
            'Milla will ask', 'the only thing that removes anybody', undefined,
            { key: 'exclusions', kinds: NEVER_CONTACT_KINDS, kinds_chosen: pickedKinds, kinds_key: 'exclusion_kinds' }),
        ],
        // ── ⚑ 24 Sep (R145 step 2 · #71) — WORDS APOLLO HAS NO OPTION FOR, AND THE CLIENT PICKS ──
        //
        // Founder: *"we dont assume again. if unsure milla needs to ask."* ⛓️ WAS: an answer we
        // could not match (seniority or size) was stored as an operator review, and the client
        // waited on K.I.N.D after pressing confirm. Now the same verdict — `icpFromDraft`'s own
        // `icp_review`, the one promotion would store — is sent BEFORE confirm, so the screen
        // asks the client to pick on the right, and a pick resolves it.
        needs_pick: needsPick,
        // ⚑ 24 Sep (R145 step 2 · #8) — THE CLIENT'S OWN PICKS, AS STORED. The PUT replaces the
        // whole `picked` object, and a tab that had been reloaded held none of the earlier picks —
        // so choosing a size after a reload silently dropped the seniority chosen before it. The
        // screen now starts from the stored set and sends it back whole.
        onboarding_picked: Object.fromEntries(
          ['job_titles', 'seniority_levels', 'company_sizes', 'geographies', 'industries', 'exclusions', 'exclusion_kinds']
            .filter(k => Array.isArray(pickedFacts?.[k]))
            .map(k => [k, strs(pickedFacts?.[k])]),
        ),
        // The canonical arrays, for the free live count. People Search costs nothing; the
        // reveal is the cost, and nothing here reveals anybody.
        onboarding_search: {
          job_titles: list('job_titles'), seniority_levels: list('seniority_levels'),
          company_sizes: list('company_sizes'), geographies: list('geographies'),
          industries: list('industries'),
        },
      }
    })(),
    conversation: draft?.conversation ?? [],
  }
}

millaRouter.get('/brief-draft', async (req: AuthRequest, res) => {
  // ⛓️ 18 Sep (J3-C3) — THE PAYLOAD MOVED INTO `briefReadModel`, UNCHANGED FIELD FOR FIELD.
  // It is the same object this route has always returned; what changed is that `PUT` now
  // returns it too, from the same function, so the two verbs cannot describe one draft
  // differently. The commentary that explained each field lives with the builder above.
  res.json({ success: true, data: await briefReadModel(req.userId!) })
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
    // ⚑ 25 Sep (R166 ② · P7) — AFTER THE BRIEF, FIND THE CLIENT'S OWN SIZE BAND. In the
    // background: the client is never kept waiting on Apollo, and a failure only means a person
    // sets the band in Vida (the check files the Needs-you task itself).
    // ⛓️ 25 Sep (P11) — only when Apollo is configured: with no key there is nothing to look up
    // in the background, and the price path (`pricingTermsFor`) still marks the client for a
    // person. Without this guard the background check logged after the request had finished —
    // which surfaced as a test-worker teardown error in the gate.
    if (p.clientId && process.env.APOLLO_API_KEY) {
      const cid = p.clientId
      void import('../lib/client-size')
        .then(m => m.ensureClientSize(cid, { email: req.authEmail ?? null }))
        .catch(err => console.error('[milla/brief-draft/confirm] size check failed:', err))
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
  // ── 🛑 ⚑ 19 Sep — A DRAFT STORE THAT IS NOT THERE MUST NOT END THE JOURNEY ──────────
  //
  // ⛓️ `store_unavailable` USED TO FALL THROUGH TO THE 503 BELOW, and that was the second
  // door of the same dead end the chat had. The client finishes talking to Milla, presses
  // Confirm, and is told *"please try again"* — on a refusal that is identical on every
  // retry and for every client, because the draft table cannot be read at all.
  //
  // 🛑 IT IS ANSWERED EXACTLY LIKE `no_draft`, WHICH IS WHAT IT ACTUALLY IS. With no readable
  // store this user HAS no draft, and the whole promotion path is already built to stand
  // aside in that state: `welcome/page.tsx` treats 404 as "carry on" in as many words —
  // *"a client whose draft predates this table, or whose draft could not be stored, has
  // nothing to confirm; promotion then behaves exactly as it did before drafts existed"* —
  // `/auth/onboard` skips its brief gate when `briefDraftFor` answers null (`auth.ts:252`),
  // and the draft override at `POST /icps` skips too. So the browser's own four legs create
  // the client exactly as they did before drafts existed: the path every client this product
  // has ever had was created through.
  //
  // ⚠️ AND IT IS NOT SILENT — that is the whole difference from the pre-16-Sep behaviour.
  // The founder is alerted and Vida gets a `brief_write_failed` task, deduped per user, so a
  // store that is down is something we find out today rather than from a client.
  //
  // ⚠️ NARROW ON PURPOSE. Only the READ of the draft store degrades. `unstorable` below still
  // means the row is right there and the stamp would not write — a real transient where a
  // retry can succeed, and where 404 would push the client into `/auth/onboard` only to be
  // refused again with *"this brief has not been confirmed yet"*. Different failure, different
  // answer. `incomplete` and `unsupported_geography` above are product refusals and unmoved.
  if (r.reason === 'no_draft' || r.reason === 'store_unavailable') {
    if (r.reason === 'store_unavailable') {
      console.error('[milla/brief-draft/confirm] draft store unreadable —', JSON.stringify({
        stage: 'confirm', reason: r.reason,
        consequence: 'the founder is alerted; the client is carried through the pre-draft path',
      }))
      void import('../lib/alerts')
        .then(({ sendFounderAlert }) => sendFounderAlert(
          'brief_write_failed',
          'The brief draft store could not be read at Confirm',
          [
            'Reason: store_unavailable (the onboarding_brief_drafts read failed).',
            'The client was NOT stopped — they were carried through the pre-draft promotion path.',
            'Check that 20260911_onboarding_brief_drafts is applied (Vida → Engine → Run).',
            `User: ${req.userId}`,
          ],
          { dedupeKey: `brief_write_failed:store_unavailable:${req.userId}` },
        ))
        .catch(() => {})
    }
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
    // ── 🛑 ⚑ 22 Sep — WHAT THE CLIENT PICKED IN THE WORKSPACE, AS OPPOSED TO SAID ────────
    //
    // 🛑 FOUNDER-LOCKED: *"you either talk to Milla or drop them down."* This is the second
    // half. `icpFromDraft` prefers these over what it derived from the conversation, and a
    // pick also RESOLVES the provider review — see its own note for why that is the point
    // rather than a side effect.
    //
    // ⚠️ SENT WHOLE, NEVER PATCHED. `saveBriefDraft` merges at the TOP level, so a body
    // carrying `picked: { seniority_levels: [...] }` would replace the entire object and
    // silently drop a size the client chose a minute earlier. The portal holds the full set
    // and sends all four every time; asking for a deep merge here would be a second merge
    // rule living somewhere nobody would look for it.
    //
    // ⚠️ THE BOUNDS ARE THE VOCABULARIES' OWN. Seniority and size are closed lists of six, so
    // six is every option at once. Titles and locations are free text at Apollo and keep the
    // same limits the spoken facts above already carry.
    picked: z.object({
      job_titles:       z.array(z.string().max(80)).max(10).nullish(),
      // ⛓️ 23 Sep (R142) — WAS `.max(6)`, the size of our invented six-label list. A1 offers
      // Apollo's eleven, and a client who ticked a seventh was refused and had the pick put
      // back. Every option at once is still the bound.
      seniority_levels: z.array(z.string().max(40)).max(11).nullish(),
      company_sizes:    z.array(z.string().max(40)).max(6).nullish(),
      geographies:      z.array(z.string().max(80)).max(8).nullish(),
      // ⚑ 23 Sep (R142 · A2a) — industries picked from Apollo's own list. Anything not on it is
      // dropped by `promotion.ts`, never stored. Six is the ICP's own bound on industries.
      industries:       z.array(z.string().max(80)).max(6).nullish(),
      // ⚑ 24 Sep (R145 step 2 · #73) — "Never contact" as picks. `exclusions` is the free list of
      // named companies or domains; `exclusion_kinds` the two lists only the client holds, ticked
      // so Milla asks for them. Neither is a provider filter — both only ever REMOVE people.
      exclusions:       z.array(z.string().trim().min(1).max(120)).max(50).nullish(),
      exclusion_kinds:  z.array(z.enum(NEVER_CONTACT_KINDS)).max(NEVER_CONTACT_KINDS.length).nullish(),
    }).nullish(),
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
  // ── ⛓️ 18 Sep (J3-C3) — THE SAME TRUTH THE GET CARRIES, FROM THE SAME BUILDER ────────
  //
  // WHAT THIS REPLACED: ~~`res.json({ success: true, data: { progress: draftProgress(r.draft) } })`~~
  // — a progress object and nothing else. So a save that completed the tenth fact left every
  // other answer in the browser describing the state BEFORE it: `onboarding_state`, the next
  // fact to ask for, and the render cards. That is the "Based in — still needed" defect
  // S1-ONB-001 already fixed once, arriving through the other verb, and the caller's only
  // remedies were a second round trip or rendering something the server does not believe.
  //
  // ⚠️ BUILT FROM THE ROW THIS WRITE JUST RETURNED, not from a re-read. `saveBriefDraft` hands
  // back the merged draft, so re-reading would be a query for what we are holding — and worse,
  // a second read is a second chance to disagree with the write that produced it.
  const { onboardingState } = await import('../lib/onboarding-state')
  const { BRIEF_FACT_LABEL } = await import('@kind/shared')
  res.json({
    success: true,
    data: briefReadModelFrom(
      r.draft,
      draftProgress(r.draft),
      onboardingState(r.draft?.facts ?? null),
      BRIEF_FACT_LABEL,
      (await import('../lib/promotion')).icpFromDraft,
    ),
  })
})
