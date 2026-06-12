// Mount in index.ts: app.use('/denise', deniseRouter)
//
// Denise — The Closer (AI Account Executive). Client-facing endpoints that turn
// her persona/generators (lib/denise.ts) into real work the client can trigger:
//   POST /denise/draft-followup  → warm follow-up to a quiet prospect
//   POST /denise/draft-proposal  → proposal outline from a discovery call
//   GET  /denise/drafts          → the client's saved drafts
//
// Access requires an ACTIVE 'denise' subscription, mirroring the Milla pattern.

import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { draftFollowUp, draftProposal, draftMeetingPrep } from '../lib/denise'

export const deniseRouter = Router()
deniseRouter.use(requireAuth)

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

/**
 * Resolves the caller's client id and verifies an ACTIVE 'denise' subscription.
 * FAIL SAFE: transient lookup errors let a paying user through; only a definitive
 * "no active subscription" returns 403.
 */
async function requireDeniseAccess(
  userId: string,
): Promise<{ clientId: string } | { error: string; status: number }> {
  const clientId = await getClientId(userId)
  if (!clientId) return { error: 'Client not found', status: 404 }

  try {
    const { data, error } = await db.from('subscriptions')
      .select('product, status')
      .eq('client_id', clientId)
      .eq('product', 'denise')
      .in('status', ['active', 'trialing'])
      .limit(1)

    if (error) {
      console.error('[denise/requireDeniseAccess] lookup error (failing open):', error)
      return { clientId }
    }

    const hasActive = (data ?? []).some(s => s.product === 'denise')
    if (!hasActive) {
      return { error: 'An active Denise (AI Account Executive) subscription is required.', status: 403 }
    }
    return { clientId }
  } catch (err) {
    console.error('[denise/requireDeniseAccess] lookup threw (failing open):', err)
    return { clientId }
  }
}

// ── POST /denise/draft-followup ────────────────────────────────────────────────
deniseRouter.post('/draft-followup', async (req: AuthRequest, res) => {
  try {
    const access = await requireDeniseAccess(req.userId!)
    if ('error' in access) { res.status(access.status).json({ success: false, error: access.error }); return }

    const input = z.object({
      first_name:           z.string().trim().max(120).optional(),
      company:              z.string().trim().max(200).optional(),
      job_title:            z.string().trim().max(200).optional(),
      conversation_summary: z.string().trim().max(4000).optional(),
      interest_signal:      z.string().trim().max(1000).optional(),
    }).parse(req.body)

    const output = await draftFollowUp(input)

    await db.from('denise_drafts').insert({
      client_id: access.clientId, kind: 'follow_up', input, output,
    })

    res.json({ success: true, draft: output })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[denise] /draft-followup error:', err)
    res.status(500).json({ success: false, error: 'Failed to draft follow-up' })
  }
})

// ── POST /denise/meeting-prep ──────────────────────────────────────────────────
// R14 (#54 slice) — Denise preps the human for a booked meeting. Pass a reply_id
// and she assembles the prospect + conversation context and returns a briefing.
deniseRouter.post('/meeting-prep', async (req: AuthRequest, res) => {
  try {
    const access = await requireDeniseAccess(req.userId!)
    if ('error' in access) { res.status(access.status).json({ success: false, error: access.error }); return }

    const { reply_id } = z.object({ reply_id: z.string().uuid() }).parse(req.body)

    const { data: reply } = await db.from('figsy_replies')
      .select('id, from_name, from_email, body, body_text, lead_id, client_id')
      .eq('id', reply_id).eq('client_id', access.clientId).maybeSingle()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    let lead: any = null
    if (reply.lead_id) {
      const { data } = await db.from('leads')
        .select('first_name, job_title, company, industry').eq('id', reply.lead_id).maybeSingle()
      lead = data
    }
    const { data: client } = await db.from('clients')
      .select('company_name').eq('id', access.clientId).maybeSingle()

    const output = await draftMeetingPrep({
      first_name:     lead?.first_name ?? reply.from_name ?? null,
      job_title:      lead?.job_title ?? null,
      company:        lead?.company ?? null,
      industry:       lead?.industry ?? null,
      conversation:   (reply.body_text || reply.body || '').slice(0, 3000) || null,
      sender_company: (client as { company_name?: string } | null)?.company_name ?? null,
    })

    await db.from('denise_drafts').insert({
      client_id: access.clientId, kind: 'meeting_prep', input: { reply_id }, output,
    }).select('id').maybeSingle()

    res.json({ success: true, brief: output })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[denise] /meeting-prep error:', err)
    res.status(500).json({ success: false, error: 'Failed to prepare meeting brief' })
  }
})

// ── POST /denise/draft-proposal ────────────────────────────────────────────────
deniseRouter.post('/draft-proposal', async (req: AuthRequest, res) => {
  try {
    const access = await requireDeniseAccess(req.userId!)
    if ('error' in access) { res.status(access.status).json({ success: false, error: access.error }); return }

    const input = z.object({
      company:      z.string().trim().min(1).max(200),
      call_summary: z.string().trim().min(1).max(6000),
      pains:        z.array(z.string().trim().max(300)).max(20).optional(),
      product_fit:  z.string().trim().max(1000).optional(),
    }).parse(req.body)

    const output = await draftProposal(input)

    await db.from('denise_drafts').insert({
      client_id: access.clientId, kind: 'proposal', input, output,
    })

    res.json({ success: true, draft: output })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[denise] /draft-proposal error:', err)
    res.status(500).json({ success: false, error: 'Failed to draft proposal' })
  }
})

// ── GET /denise/drafts — the client's saved drafts ─────────────────────────────
deniseRouter.get('/drafts', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data } = await db.from('denise_drafts')
      .select('id, kind, input, output, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50)

    res.json({ success: true, drafts: data ?? [] })
  } catch (err) {
    console.error('[denise] /drafts error:', err)
    res.status(500).json({ success: false, error: 'Failed to load drafts' })
  }
})

