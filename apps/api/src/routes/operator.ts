import { Router, Request, Response } from 'express'
import { db } from '@kind/db'
import { adminKeyValid } from './admin'
import { getExcludedClientIds } from '../lib/real-clients'
import { writeOperatorAudit } from '../lib/operator-audit'

// #483–#487 — VIDA OPERATOR CONSOLE API.
// This is the server side of Vida: the surfaces WE (operators) use to run a client's
// pipeline end to end. Mounted at /operator and gated by the SAME admin key the admin
// app already injects server-side (x-admin-key). It is deliberately SEPARATE from the
// client-authed /vida router (the old inbound chatbot) so the two auth models never mix.
export const operatorRouter = Router()

// Admin-key gate (identical to adminRouter). Never proxied from a browser — the admin
// Next.js app injects x-admin-key server-side after verifying the operator's Supabase
// session (ADMIN_ALLOWED_EMAILS).
operatorRouter.use((req: Request, res: Response, next: () => void) => {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    res.status(401).json({ success: false, error: 'Unauthorized' }); return
  }
  next()
})

// The operator's identity, read ONLY from the header the admin proxy sets from the
// verified session (#486). Never from a request body. Falls back to a sentinel so an
// audit row is always attributable to *something* even if the header is missing.
function operatorEmail(req: Request): string {
  const h = req.headers['x-operator-email']
  return (typeof h === 'string' && h.trim()) ? h.trim() : 'unknown-operator'
}

// Validate a client_id exists — never trust a default. Returns the row or null.
async function requireClient(clientId: unknown): Promise<{ id: string; company_name: string | null } | null> {
  if (typeof clientId !== 'string' || !clientId) return null
  const { data } = await db.from('clients').select('id, company_name').eq('id', clientId).maybeSingle()
  return (data as { id: string; company_name: string | null } | null) ?? null
}

// ── #483 CLIENT PICKER ────────────────────────────────────────────────────────
// Every real client (+ house/demo labelled) for the operator's client selector.
operatorRouter.get('/clients', async (_req: Request, res: Response) => {
  try {
    const { data: clients } = await db.from('clients')
      .select('id, company_name, industry, country, created_at, is_demo, wallet_balance_usd')
      .order('created_at', { ascending: false })
    const excluded = await getExcludedClientIds()   // house/demo — labelled, not hidden
    const rows = (clients ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      house_or_demo: c.is_demo === true || excluded.has(c.id as string),
    }))
    res.json({ success: true, data: rows })
  } catch (err) { console.error('[operator/clients]', err); res.status(500).json({ success: false, error: 'Failed to load clients' }) }
})

// ── #484 PIPELINE BOARD ───────────────────────────────────────────────────────
// Real per-client board: Sourced → Needs approval → Sending → Replied → Qualified ($4).
// Reads live tables (leads, figsy_approval_queue, figsy_enrollments, figsy_replies) —
// counts + a bounded card sample per column. No fabricated data.
operatorRouter.get('/board', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(req.query.client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const cid = client.id
    const SAMPLE = 25

    // Sourced = scored, not yet revealed/approved, not passed. surfaced_for_approval_at
    // tells the card whether it's already been Sent to the client (awaiting their 👍).
    const sourced = await db.from('leads')
      .select('id, first_name, last_name, company, job_title, score, status, surfaced_for_approval_at, approval_expires_at', { count: 'exact' })
      .eq('client_id', cid).is('revealed_at', null).neq('status', 'passed')
      .in('status', ['scored', 'pending']).order('score', { ascending: false }).limit(SAMPLE)

    // Needs approval = pending drafts in the co-pilot queue (#15) for this client. Carries
    // the FULL draft (to_email/subject/body/step) + the lead name so the operator can READ
    // the email before releasing it — never a blind approve.
    const needsApproval = await db.from('figsy_approval_queue')
      .select('id, lead_id, status, created_at, to_email, subject, body, sequence_step, leads ( first_name, last_name, company )', { count: 'exact' })
      .eq('client_id', cid).eq('status', 'pending').order('created_at', { ascending: false }).limit(SAMPLE)

    // Sending = active enrollments mid-sequence.
    const sending = await db.from('figsy_enrollments')
      .select('id, lead_id, current_step, total_steps, status, next_send_at', { count: 'exact' })
      .eq('client_id', cid).eq('status', 'enrolled').order('next_send_at', { ascending: true }).limit(SAMPLE)

    // Replied = replies in the unibox for this client (real columns: classification /
    // received_at — figsy_replies has no 'sentiment'/'subject'/'created_at').
    const replied = await db.from('figsy_replies')
      .select('id, lead_id, from_name, from_email, classification, meeting_booked_at, received_at, qualified_at', { count: 'exact' })
      .eq('client_id', cid).order('received_at', { ascending: false }).limit(SAMPLE)

    // Qualified ($4) = leads that were actually WORKED — an enrollment row exists ⟺ the
    // $3 fired (fail-closed charge before insert, refunded on failure), on top of the $1
    // reveal. Counting revealed-only leads here would overstate the $4 column (a reveal
    // alone is $1) — so the count comes from enrollments, and the cards join back to
    // leads for names. (Fable verify fix — the founder reads this column as money.)
    const enrollAll = await db.from('figsy_enrollments')
      .select('lead_id', { count: 'exact' })
      .eq('client_id', cid).order('enrolled_at', { ascending: false }).limit(SAMPLE)
    const qualLeadIds = Array.from(new Set((enrollAll.data ?? []).map((e: { lead_id: string }) => e.lead_id)))
    const qualCards = qualLeadIds.length > 0
      ? await db.from('leads')
          .select('id, first_name, last_name, company, email, score')
          .in('id', qualLeadIds).order('score', { ascending: false })
      : { data: [] }
    const qualified = { count: enrollAll.count ?? 0, data: qualCards.data ?? [] }

    // #493 Booked = confirmed meetings (the $3 captured). Real calendar_bookings, joined
    // to the lead for a name.
    const bookedRows = await db.from('calendar_bookings')
      .select('id, lead_id, meeting_title, start_time, status', { count: 'exact' })
      .eq('client_id', cid).eq('status', 'confirmed').order('start_time', { ascending: true }).limit(SAMPLE)
    const bookedLeadIds = Array.from(new Set((bookedRows.data ?? []).map((b: { lead_id: string }) => b.lead_id).filter(Boolean)))
    const bookedLeadNames = bookedLeadIds.length > 0
      ? await db.from('leads').select('id, first_name, last_name, company').in('id', bookedLeadIds)
      : { data: [] }
    const nameById = new Map((bookedLeadNames.data ?? []).map((l: Record<string, unknown>) => [l.id as string, l]))
    const bookedCards = (bookedRows.data ?? []).map((b: Record<string, unknown>) => {
      const l = nameById.get(b.lead_id as string) as Record<string, unknown> | undefined
      return { id: b.id, lead_id: b.lead_id, start_time: b.start_time,
        first_name: l?.first_name ?? null, last_name: l?.last_name ?? null, company: l?.company ?? null }
    })

    res.json({
      success: true,
      client: { id: cid, company_name: client.company_name },
      columns: {
        sourced:       { count: sourced.count ?? 0,       cards: sourced.data ?? [] },
        needs_approval:{ count: needsApproval.count ?? 0, cards: needsApproval.data ?? [] },
        sending:       { count: sending.count ?? 0,       cards: sending.data ?? [] },
        replied:       { count: replied.count ?? 0,       cards: replied.data ?? [] },
        qualified:     { count: qualified.count ?? 0,     cards: qualified.data ?? [] },
        booked:        { count: bookedRows.count ?? 0,    cards: bookedCards },
      },
    })
  } catch (err) { console.error('[operator/board]', err); res.status(500).json({ success: false, error: 'Failed to load board' }) }
})

// ── #493 SEND TO CLIENT (operators NEVER spend — invariant #1) ─────────────────
// The operator's only move on a masked lead is to SURFACE it to the client for the
// client's own 👍 in Milla. This spends NOTHING — it starts the #492 72h approval TTL and
// writes an audit row. (The old operator "approve-on-behalf $4" endpoint was removed: no
// path may let an operator spend a client's credits.)
operatorRouter.post('/leads/:id/surface', async (req: Request, res: Response) => {
  try {
    const { client_id } = (req.body ?? {}) as { client_id?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const { surfaceLeadForApproval } = await import('../lib/operator-queue')
    const { surfaced } = await surfaceLeadForApproval(client.id, req.params.id)
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'surface_lead',
      subjectType: 'lead', subjectId: req.params.id, detail: { on_behalf: true, surfaced },
    })
    if (!surfaced) { res.status(404).json({ success: false, error: 'Lead not found or already actioned' }); return }
    res.json({ success: true, surfaced: true })
  } catch (err) { console.error('[operator/surface]', err); res.status(500).json({ success: false, error: 'Failed to send lead to client' }) }
})

operatorRouter.post('/leads/:id/pass', async (req: Request, res: Response) => {
  try {
    const { client_id } = (req.body ?? {}) as { client_id?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const { passLead } = await import('../lib/approve-lead')
    const outcome = await passLead(req.params.id, client.id)
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'pass_lead',
      subjectType: 'lead', subjectId: req.params.id, detail: { outcome: outcome.status, on_behalf: true },
    })
    if (outcome.status === 'not_found') { res.status(404).json({ success: false, error: 'Lead not found or already actioned' }); return }
    res.json({ success: true, passed: true })
  } catch (err) { console.error('[operator/pass]', err); res.status(500).json({ success: false, error: 'Failed to pass lead' }) }
})

// ── THE LAUNCH PATH (operator-side) ────────────────────────────────────────────────
// Everything below already existed in the retired self-serve console, but only behind a
// CLIENT Bearer token. Vida proxies with an admin key and no client session, so the
// operator could see a campaign but never propose, preview, test or RUN one. These are the
// operator twins — same logic, admin-key auth, always scoped by client_id.

// Vida proposes a campaign (name + who it hunts for) from the client's live ICP.
// Proposal only — nothing is created until the operator accepts it.
operatorRouter.post('/campaign/suggest', async (req: Request, res: Response) => {
  try {
    const { client_id } = (req.body ?? {}) as { client_id?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const { data: icp } = await db.from('icps')
      .select('name, industries, job_titles, seniority_levels, geographies, company_sizes, keywords')
      .eq('client_id', client.id).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!icp) { res.status(409).json({ success: false, error: 'No active ICP — the client needs one before we can target anyone.' }); return }

    const { data: c } = await db.from('clients').select('company_name, industry').eq('id', client.id).maybeSingle()
    const who = [
      (icp.job_titles ?? []).slice(0, 3).join(', '),
      (icp.industries ?? []).slice(0, 3).join(', '),
      (icp.geographies ?? []).slice(0, 2).join(', '),
    ].filter(Boolean).join(' · ')

    // Deterministic when there is no LLM key — never invent, never fail the flow.
    let name = `${(icp.job_titles ?? [])[0] ?? 'Decision makers'} — ${(icp.industries ?? [])[0] ?? 'target market'}`
    let intent = who || icp.name
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const { default: Anthropic } = await import('@anthropic-ai/sdk')
        const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const msg = await ai.messages.create({
          model: 'claude-haiku-4-5-20251001', max_tokens: 200,
          messages: [{ role: 'user', content:
            `Name an outbound campaign for ${c?.company_name ?? 'a client'}${c?.industry ? ` (${c.industry})` : ''} targeting: ${who || icp.name}.\n` +
            `Reply as exactly two lines and nothing else:\nNAME: <max 6 words>\nHUNTING: <one sentence, who and why now>` }],
        })
        const txt = msg.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('')
        const n = txt.match(/NAME:\s*(.+)/i)?.[1]?.trim()
        const h = txt.match(/HUNTING:\s*(.+)/i)?.[1]?.trim()
        if (n) name = n.slice(0, 120)
        if (h) intent = h.slice(0, 500)
      } catch { /* keep the deterministic proposal */ }
    }
    res.json({ success: true, data: { name, campaign_intent: intent, icp_name: icp.name } })
  } catch (err) { console.error('[operator/campaign-suggest]', err); res.status(500).json({ success: false, error: 'Failed to suggest a campaign' }) }
})

// Accept a proposal / edit a campaign. Creates ACTIVE when there is no id.
operatorRouter.post('/campaign/save', async (req: Request, res: Response) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>
    const client = await requireClient(b.client_id as string | undefined)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim().slice(0, 120)
    if (typeof b.campaign_intent === 'string') patch.campaign_intent = b.campaign_intent.slice(0, 500)
    if (typeof b.status === 'string' && ['draft', 'active', 'paused'].includes(b.status)) patch.status = b.status

    // THE GATES LIVE IN settings, NOT ON THE ROW. `figsy_campaigns` has look-alike
    // `copilot_mode` / `approve_before_send` columns that NOTHING reads, and no
    // `daily_send_limit` column at all — the send path reads settings.review_required
    // (lib/figsy.ts) and the cron reads settings.daily_send_limit (routes/internal.ts).
    // Writing the columns would give the operator a Co-Pilot toggle the engine ignores:
    // the UI would promise "every email waits for you" and the emails would still go out.
    // lib/campaign-settings.ts owns that mapping; the columns are kept in sync so they
    // stop being a lie sitting in the table.
    const { readCampaignGates, mergeCampaignGates, normaliseDailyCap } = await import('../lib/campaign-settings')
    const wantCoPilot = typeof b.copilot_mode === 'boolean' ? b.copilot_mode : undefined
    const wantCap = normaliseDailyCap(b.daily_send_limit)
    // V7 in full: the send WINDOW and the A/B subject variants, not just name + cap.
    // send_days/send_hour_utc were write-only until this PR — the cron now honours them
    // (routes/internal.ts), so this control is real rather than decorative.
    const wantDays = b.send_days === undefined ? undefined
      : (Array.isArray(b.send_days) ? (b.send_days as unknown[]).map(String) : null)
    const wantHour = b.send_hour_utc === undefined ? undefined
      : (b.send_hour_utc === null || b.send_hour_utc === '' ? null : Number(b.send_hour_utc))
    const abKeys = ['ab_subject_b', 'ab_subject_c', 'ab_subject_d', 'ab_subject_e'] as const
    const wantAb: Record<string, string | null | undefined> = {}
    for (const k of abKeys) {
      if (b[k] !== undefined) wantAb[k] = typeof b[k] === 'string' ? (b[k] as string) : null
    }

    const gatePatch = {
      review_required: wantCoPilot, daily_send_limit: wantCap,
      send_days: wantDays, send_hour_utc: wantHour, ...wantAb,
    }
    const touchesGates = Object.values(gatePatch).some(v => v !== undefined)
    if (wantCoPilot !== undefined) { patch.copilot_mode = wantCoPilot; patch.approve_before_send = wantCoPilot }

    const SELECT = 'id, name, status, campaign_intent, settings'
    const shape = (row: Record<string, unknown>) => {
      const gates = readCampaignGates(row.settings)
      const { settings: _drop, ...rest } = row
      return { ...rest, ...gates, copilot_mode: gates.review_required }
    }

    if (b.campaign_id) {
      // Read-merge-write: settings also carries send_days, send_hour_utc, ab_subject_b…e,
      // reply-branching steps and system_prompt. Replacing the object would drop them.
      if (touchesGates) {
        const { data: cur } = await db.from('figsy_campaigns')
          .select('settings').eq('id', b.campaign_id as string).eq('client_id', client.id).maybeSingle()
        patch.settings = mergeCampaignGates(cur?.settings, gatePatch)
      }
      const { data, error } = await db.from('figsy_campaigns').update(patch)
        .eq('id', b.campaign_id as string).eq('client_id', client.id).select(SELECT).maybeSingle()
      if (error) throw error
      if (!data) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
      await writeOperatorAudit({ operatorEmail: operatorEmail(req), clientId: client.id, action: 'pause_campaign', subjectType: 'campaign', subjectId: data.id, detail: { edited: true, co_pilot: wantCoPilot ?? null } })
      res.json({ success: true, data: shape(data) }); return
    }

    // A NEW campaign defaults to Co-Pilot even when the caller says nothing: a campaign
    // created here can start sending, and the safe default is that a human sees each email.
    patch.settings = mergeCampaignGates(null, { ...gatePatch, review_required: wantCoPilot ?? true, daily_send_limit: wantCap ?? null })
    patch.copilot_mode = wantCoPilot ?? true
    patch.approve_before_send = wantCoPilot ?? true

    const { data, error } = await db.from('figsy_campaigns')
      .insert({ client_id: client.id, name: (patch.name as string) ?? 'Outbound campaign', status: 'active', ...patch })
      .select(SELECT).single()
    if (error) throw error
    await writeOperatorAudit({ operatorEmail: operatorEmail(req), clientId: client.id, action: 'start_campaign', subjectType: 'campaign', subjectId: data.id, detail: { from_suggestion: true, co_pilot: patch.copilot_mode } })
    res.json({ success: true, data: shape(data) })
  } catch (err) { console.error('[operator/campaign-save]', err); res.status(500).json({ success: false, error: 'Failed to save the campaign' }) }
})

// Assign the people the operator PICKED into a campaign (step 7 — never "all of them").
operatorRouter.post('/campaign/:id/assign', async (req: Request, res: Response) => {
  try {
    const { client_id, lead_ids } = (req.body ?? {}) as { client_id?: string; lead_ids?: string[] }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    if (!Array.isArray(lead_ids) || lead_ids.length === 0) { res.status(400).json({ success: false, error: 'Pick at least one person' }); return }

    const { data: camp } = await db.from('figsy_campaigns')
      .select('id, name, status').eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (!camp) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    // autoEnrollLead enrols into the client's most recent ACTIVE campaign — it does not take
    // a campaign id. Assigning to a paused/draft campaign would therefore do nothing (or,
    // worse, quietly enrol into a different campaign). Refuse instead of pretending.
    if (camp.status !== 'active') {
      res.status(409).json({ success: false, error: `“${camp.name}” isn’t running — hit Run it first, then add people.` }); return
    }

    // Only this client's leads, and never re-add someone already enrolled.
    const { data: mine } = await db.from('leads').select('id').eq('client_id', client.id).in('id', lead_ids.slice(0, 200))
    const ids = (mine ?? []).map((l: { id: string }) => l.id)
    if (ids.length === 0) { res.status(400).json({ success: false, error: 'None of those leads belong to this client' }); return }
    const { data: already } = await db.from('figsy_enrollments').select('lead_id').eq('campaign_id', camp.id).in('lead_id', ids)
    const skip = new Set((already ?? []).map((e: { lead_id: string }) => e.lead_id))
    const fresh = ids.filter(id => !skip.has(id))

    const { autoEnrollLead } = await import('../lib/figsy')
    for (const leadId of fresh) {
      // prepaid: the client's $4 (or our own sourcing) already covered this lead — assigning
      // to a campaign must never charge again.
      await autoEnrollLead(leadId, client.id, { force: true, prepaid: true }).catch(() => {})
    }

    // COUNT THE TRUTH, not the loop. autoEnrollLead returns void and bails silently on any
    // of: no verified email, suppression/do-not-contact, an existing CRM match, exhausted
    // FIGSY credits, or a send engine that isn't configured. Counting successful calls would
    // report "12 added" when 3 were added — so the number comes from the table.
    const { data: after } = await db.from('figsy_enrollments')
      .select('lead_id').eq('campaign_id', camp.id).in('lead_id', ids)
    const nowIn = new Set((after ?? []).map((e: { lead_id: string }) => e.lead_id))
    const assigned = fresh.filter(id => nowIn.has(id)).length
    const notAdded = fresh.length - assigned

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'enroll_lead',
      subjectType: 'campaign', subjectId: camp.id,
      detail: { picked: ids.length, assigned, already: skip.size, not_added: notAdded },
    })
    res.json({
      success: true,
      data: {
        assigned, already_in: skip.size, not_added: notAdded,
        note: notAdded > 0
          ? `${notAdded} couldn’t be added — no verified email, on the do-not-contact list, already in the client’s CRM, or the sending pool is empty.`
          : null,
      },
    })
  } catch (err) { console.error('[operator/campaign-assign]', err); res.status(500).json({ success: false, error: 'Failed to assign people' }) }
})

// Preview step 1 exactly as it will send, and optionally post it to the operator's inbox.
// This is the last gate before anything reaches a real prospect.
operatorRouter.post('/campaign/:id/test', async (req: Request, res: Response) => {
  try {
    const { client_id, send, to_email } = (req.body ?? {}) as { client_id?: string; send?: boolean; to_email?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const { data: camp } = await db.from('figsy_campaigns')
      .select('id, name, campaign_intent, settings').eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (!camp) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    const { data: c } = await db.from('clients')
      .select('company_name, industry, signer_name').eq('id', client.id).maybeSingle()

    // A representative lead from this client's own pool, so the preview is honest.
    const { data: sample } = await db.from('leads')
      .select('first_name, last_name, job_title, company, industry, country, score')
      .eq('client_id', client.id).order('score', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
    const lead = sample ?? { first_name: 'Alex', last_name: 'Morgan', job_title: 'Head of Operations', company: 'Sample Co', industry: c?.industry ?? null, country: 'ZA', score: 85 }

    const { generateSequence, getClientKnowledgeForOutreach } = await import('../lib/figsy')
    const knowledge = await getClientKnowledgeForOutreach(client.id).catch(() => undefined)
    const seq = await generateSequence(
      lead as never, c?.company_name ?? '', c?.industry ?? null,
      camp.campaign_intent ?? undefined, undefined, c?.signer_name ?? null, knowledge as never,
    )
    const step1 = (seq as { step1?: { subject?: string; body?: string } } | null)?.step1
    if (!step1?.subject || !step1?.body) { res.status(502).json({ success: false, error: 'Could not draft a preview — try again.' }); return }

    if (!send) { res.json({ success: true, data: { preview: step1, sent: false, to: null } }); return }

    const to = (to_email && to_email.includes('@')) ? to_email : operatorEmail(req)
    if (!to || !to.includes('@')) { res.status(400).json({ success: false, error: 'No address to send the test to' }); return }
    const { Resend: ResendCls } = await import('resend')
    if (!process.env.RESEND_API_KEY) { res.status(503).json({ success: false, error: 'Email sending is not configured' }); return }
    const resend = new ResendCls(process.env.RESEND_API_KEY)
    const { COLD_FROM, COLD_REPLY_TO } = await import('../lib/deliverability')
    const { error: sendErr } = await resend.emails.send({
      from: COLD_FROM, reply_to: COLD_REPLY_TO, to,
      subject: `[TEST · ${c?.company_name ?? 'client'}] ${step1.subject}`, text: step1.body,
    })
    if (sendErr) throw sendErr

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'send_now',
      subjectType: 'campaign', subjectId: camp.id, detail: { test_email: true, to },
    })
    res.json({ success: true, data: { preview: step1, sent: true, to } })
  } catch (err) { console.error('[operator/campaign-test]', err); res.status(500).json({ success: false, error: 'Failed to build the test' }) }
})

// V4 — the people the operator picks from. /board's "sourced" column only shows
// unrevealed leads; picking who goes into a campaign needs the whole pool plus whether
// each person is ALREADY enrolled (so we never double-add and never re-charge).
operatorRouter.get('/people', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(String(req.query.client_id ?? ''))
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const campaignId = typeof req.query.campaign_id === 'string' ? req.query.campaign_id : null

    const { data: leads } = await db.from('leads')
      .select('id, first_name, last_name, job_title, company, industry, country, score, status, email, revealed_at')
      .eq('client_id', client.id).neq('status', 'passed')
      .order('score', { ascending: false, nullsFirst: false }).limit(200)

    // Enrolled anywhere (so the operator sees "already working") and, when a campaign is
    // in play, enrolled in THAT campaign (so the checkbox can be disabled).
    const ids = (leads ?? []).map((l: { id: string }) => l.id)
    let enrolledAll = new Set<string>()
    let enrolledHere = new Set<string>()
    if (ids.length > 0) {
      const { data: e } = await db.from('figsy_enrollments')
        .select('lead_id, campaign_id').eq('client_id', client.id).in('lead_id', ids)
      enrolledAll = new Set((e ?? []).map((r: { lead_id: string }) => r.lead_id))
      enrolledHere = new Set((e ?? [])
        .filter((r: { campaign_id: string }) => campaignId && r.campaign_id === campaignId)
        .map((r: { lead_id: string }) => r.lead_id))
    }

    res.json({
      success: true,
      data: (leads ?? []).map((l: Record<string, unknown>) => ({
        ...l,
        // Never leak an unrevealed address into the operator console — masked is masked.
        email: l.revealed_at ? l.email : null,
        enrolled: enrolledAll.has(l.id as string),
        in_campaign: enrolledHere.has(l.id as string),
      })),
    })
  } catch (err) { console.error('[operator/people]', err); res.status(500).json({ success: false, error: 'Failed to load people' }) }
})

// V14 — who is actually IN this campaign, and where each of them is in the sequence.
operatorRouter.get('/campaign/:id/enrollments', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(String(req.query.client_id ?? ''))
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const { data: rows } = await db.from('figsy_enrollments')
      .select('id, lead_id, current_step, total_steps, status, next_send_at, enrolled_at')
      .eq('client_id', client.id).eq('campaign_id', req.params.id)
      .order('enrolled_at', { ascending: false }).limit(200)

    const ids = Array.from(new Set((rows ?? []).map((r: { lead_id: string }) => r.lead_id).filter(Boolean)))
    const { data: leads } = ids.length > 0
      ? await db.from('leads').select('id, first_name, last_name, job_title, company').in('id', ids)
      : { data: [] }
    const byId = new Map((leads ?? []).map((l: Record<string, unknown>) => [l.id as string, l]))

    // Replied trumps "sending" in the operator's head — surface it on the row.
    const { data: replies } = ids.length > 0
      ? await db.from('figsy_replies').select('lead_id, classification').eq('client_id', client.id).in('lead_id', ids)
      : { data: [] }
    const replyBy = new Map((replies ?? []).map((r: Record<string, unknown>) => [r.lead_id as string, r.classification as string]))

    res.json({
      success: true,
      data: (rows ?? []).map((r: Record<string, unknown>) => {
        const l = byId.get(r.lead_id as string) as Record<string, unknown> | undefined
        return {
          id: r.id, lead_id: r.lead_id, status: r.status,
          current_step: r.current_step, total_steps: r.total_steps, next_send_at: r.next_send_at,
          first_name: l?.first_name ?? null, last_name: l?.last_name ?? null,
          job_title: l?.job_title ?? null, company: l?.company ?? null,
          replied: replyBy.get(r.lead_id as string) ?? null,
        }
      }),
    })
  } catch (err) { console.error('[operator/enrollments]', err); res.status(500).json({ success: false, error: 'Failed to load who is in this campaign' }) }
})

// V2 — BUILD / REFINE THE ICP BY CONVERSATION (replaces the form).
// The client-side twin is POST /icps/chat-build, which is client-JWT-only. This one is
// seeded with the client's CURRENT active ICP, so the operator's conversation refines what
// exists instead of starting from nothing. Returns a proposal — POST /operator/icp saves it.
operatorRouter.post('/icp/chat', async (req: Request, res: Response) => {
  try {
    const { client_id, message, history } = (req.body ?? {}) as
      { client_id?: string; message?: string; history?: { role: 'user' | 'assistant'; content: string }[] }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    if (typeof message !== 'string' || !message.trim()) { res.status(400).json({ success: false, error: 'Say something first' }); return }

    const { data: current } = await db.from('icps')
      .select('id, name, industries, job_titles, seniority_levels, company_sizes, geographies, tech_stack, keywords')
      .eq('client_id', client.id).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const { data: c } = await db.from('clients').select('company_name, industry, country').eq('id', client.id).maybeSingle()

    const system = `You are Vida, the operator-side ICP builder for K.I.N.D. You are talking to a K.I.N.D OPERATOR who is building or refining the ICP for their client ${c?.company_name ?? 'the client'}${c?.industry ? ` (${c.industry})` : ''}${c?.country ? `, based in ${c.country}` : ''}.

${current ? `Their CURRENT active ICP is:\n${JSON.stringify(current, null, 1)}\nRefine it — keep what is already right, change only what the operator asks about.` : 'They have NO ICP yet — build the first one.'}

Reply with ONLY valid JSON (no markdown fence):
{"message":"<your reply to the operator, max 2 sentences>","icp":{"name":"...","industries":[],"job_titles":[],"seniority_levels":[],"company_sizes":[],"geographies":[],"tech_stack":[],"keywords":[]}}

Rules:
- "industries" from: Fintech, Healthtech, E-commerce, SaaS, Logistics, Agriculture, Education, Manufacturing, Real Estate, Media, Consulting, Retail, Banking, Insurance, Telecoms, Energy
- "seniority_levels" from: C-Suite, VP / Director, Head of, Manager, Senior, Individual Contributor
- "company_sizes" from: 1–10, 11–50, 51–200, 201–500, 501–1,000, 1,000+
- Include "icp" on EVERY reply, carrying the full proposed profile (current values plus your changes) so the editor always has something to save. Use [] for anything you genuinely don't know.
- Never invent a fact about the client's business. Ask instead.`

    if (!process.env.ANTHROPIC_API_KEY) {
      // No LLM key: stay useful rather than failing the step — hand back exactly what
      // exists so the operator can still edit and save it.
      res.json({ success: true, data: { message: 'I can’t reach my brain right now — here is the current profile to edit directly.', icp: current ?? null } })
      return
    }

    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 900, system,
      messages: [
        ...(history ?? []).slice(-12).map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: message.slice(0, 2000) },
      ],
    })
    const raw = msg.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('')
      .trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    let parsed: { message?: string; icp?: Record<string, unknown> }
    try { parsed = JSON.parse(raw) } catch { parsed = { message: raw.slice(0, 400) || 'Tell me more — industry, titles, seniority, size, region?' } }

    res.json({
      success: true,
      data: {
        message: parsed.message ?? 'Tell me more about who we should be hunting.',
        icp: parsed.icp ?? current ?? null,
        icp_id: current?.id ?? null,
      },
    })
  } catch (err) { console.error('[operator/icp-chat]', err); res.status(500).json({ success: false, error: 'Failed to work the ICP' }) }
})

// V9 — AI PROPOSES A SEQUENCE, the operator approves it.
// Drafted against a REAL top-scoring lead from this client's pool so the copy is honest,
// then de-personalised back into {{tokens}} so it is reusable as a template.
operatorRouter.post('/sequence/suggest', async (req: Request, res: Response) => {
  try {
    const { client_id, campaign_id } = (req.body ?? {}) as { client_id?: string; campaign_id?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const { data: c } = await db.from('clients')
      .select('company_name, industry, signer_name, booking_url').eq('id', client.id).maybeSingle()
    const { data: camp } = campaign_id
      ? await db.from('figsy_campaigns').select('name, campaign_intent').eq('id', campaign_id).eq('client_id', client.id).maybeSingle()
      : { data: null }

    const { data: sample } = await db.from('leads')
      .select('id, first_name, last_name, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
      .eq('client_id', client.id).order('score', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
    if (!sample) { res.status(409).json({ success: false, error: 'No people sourced yet — source someone first so the draft is written against a real prospect.' }); return }

    const { generateSequence, getClientKnowledgeForOutreach } = await import('../lib/figsy')
    const knowledge = await getClientKnowledgeForOutreach(client.id).catch(() => undefined)
    const draft = await generateSequence(
      sample as never, c?.company_name ?? '', c?.industry ?? null,
      camp?.campaign_intent ?? undefined, c?.booking_url ?? null, c?.signer_name ?? null, knowledge as never,
    ) as unknown as Record<string, { subject?: string; body?: string }>

    // Put the tokens back so this reads as a template, not one person's email. Shared with
    // the preview side so the two can never drift (lib/sequence-tokens.ts).
    const { detokenise } = await import('../lib/sequence-tokens')
    const lead = sample as { first_name?: string | null; last_name?: string | null; job_title?: string | null; company?: string | null }

    const steps = [1, 2, 3].map(n => {
      const st = draft[`step${n}`]
      return {
        step: n,
        subject: detokenise(String(st?.subject ?? ''), lead),
        body: detokenise(String(st?.body ?? ''), lead),
        wait_days: n === 1 ? 0 : n === 2 ? 4 : 7,
      }
    }).filter(s => s.subject && s.body)
    if (steps.length === 0) { res.status(502).json({ success: false, error: 'Could not draft a sequence — try again.' }); return }

    res.json({
      success: true,
      data: {
        name: camp?.name ? `${camp.name} — 3 touches` : '3-touch sequence',
        steps,
        drafted_against: { first_name: sample.first_name, job_title: sample.job_title, company: sample.company },
      },
    })
  } catch (err) { console.error('[operator/sequence-suggest]', err); res.status(500).json({ success: false, error: 'Failed to draft a sequence' }) }
})

// V11 — PREVIEW A SAVED SEQUENCE as a real prospect will receive it (tokens filled from a
// real lead in this client's pool). Read-only: it renders, it never sends.
operatorRouter.get('/sequence/:id/preview', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(String(req.query.client_id ?? ''))
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const { data: seq } = await db.from('figsy_sequences')
      .select('id, name, steps').eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (!seq) { res.status(404).json({ success: false, error: 'Sequence not found' }); return }

    const { data: sample } = await db.from('leads')
      .select('first_name, last_name, job_title, company').eq('client_id', client.id)
      .order('score', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
    const lead = sample ?? { first_name: 'Alex', last_name: 'Morgan', job_title: 'Head of Operations', company: 'Sample Co' }
    const { data: c } = await db.from('clients').select('company_name, signer_name').eq('id', client.id).maybeSingle()

    const { fillTokens, stepDays } = await import('../lib/sequence-tokens')
    const sender = { signer_name: c?.signer_name ?? null, company_name: c?.company_name ?? null }

    const raw = Array.isArray(seq.steps) ? (seq.steps as Record<string, unknown>[]) : []
    const days = stepDays(raw.map(st => ({ wait_days: st.wait_days as number | null | undefined })))
    const rendered = raw.map((st, i) => ({
      step: i + 1, day: days[i],
      subject: fillTokens(String(st.subject ?? ''), lead, sender),
      body: fillTokens(String(st.body ?? ''), lead, sender),
    }))

    res.json({ success: true, data: { name: seq.name, steps: rendered, sample_lead: lead } })
  } catch (err) { console.error('[operator/sequence-preview]', err); res.status(500).json({ success: false, error: 'Failed to preview the sequence' }) }
})

// ── V3 / M2 — "ASK THEM FOR THESE" actually reaches Milla ──────────────────────────
// The operator's question lands in the client's own Milla thread (milla_messages), so the
// client answers it in the one place they already talk to us — and their answer comes back
// here. No new table: the conversation IS the surface.
const ASK_PREFIX = '**Quick ask from your K.I.N.D team**\n\n'

async function latestMillaSession(clientId: string): Promise<string | null> {
  const { data } = await db.from('milla_sessions')
    .select('id').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (data?.id) return data.id as string
  const { data: made } = await db.from('milla_sessions')
    .insert({ client_id: clientId, title: 'From your K.I.N.D team' }).select('id').maybeSingle()
  return (made?.id as string | undefined) ?? null
}

operatorRouter.post('/ask', async (req: Request, res: Response) => {
  try {
    const { client_id, question } = (req.body ?? {}) as { client_id?: string; question?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const q = String(question ?? '').trim()
    if (!q) { res.status(400).json({ success: false, error: 'Write the question first' }); return }

    const sessionId = await latestMillaSession(client.id)
    if (!sessionId) { res.status(503).json({ success: false, error: 'Could not open the client’s Milla thread' }); return }

    const { data, error } = await db.from('milla_messages').insert({
      session_id: sessionId, client_id: client.id, role: 'assistant',
      content: ASK_PREFIX + q.slice(0, 2000), sources: null,
    }).select('id, created_at').maybeSingle()
    if (error) throw error

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'vida_command',
      subjectType: 'ask', subjectId: data?.id ?? null, detail: { asked: q.slice(0, 300) },
    })
    res.json({ success: true, data: { id: data?.id ?? null, sent_at: data?.created_at ?? null } })
  } catch (err) { console.error('[operator/ask]', err); res.status(500).json({ success: false, error: 'Failed to send the ask' }) }
})

// What we asked, and what they said back (the client's replies AFTER each ask).
operatorRouter.get('/asks', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(String(req.query.client_id ?? ''))
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    // Bounded read of the recent thread. An ask further back than this window won't appear —
    // stated here rather than pretended away.
    const WINDOW = 200
    const { data: rows } = await db.from('milla_messages')
      .select('id, role, content, created_at').eq('client_id', client.id)
      .order('created_at', { ascending: false }).limit(WINDOW)
    const asc = (rows ?? []).slice().reverse() as { id: string; role: string; content: string; created_at: string }[]

    // An answer is a client message in the turn IMMEDIATELY after our ask — i.e. before Milla
    // replies again. Attributing every later user message to the last ask would show ordinary
    // chatter ("which look strongest?") as if it answered our question, which is worse than
    // showing nothing: it reads like the client responded when they didn't.
    const asks: { id: string; question: string; asked_at: string; answers: { content: string; at: string }[] }[] = []
    let openAsk: (typeof asks)[number] | null = null
    for (const m of asc) {
      if (m.role === 'assistant' && m.content.startsWith(ASK_PREFIX)) {
        openAsk = { id: m.id, question: m.content.slice(ASK_PREFIX.length), asked_at: m.created_at, answers: [] }
        asks.push(openAsk)
      } else if (m.role === 'user') {
        if (openAsk) openAsk.answers.push({ content: m.content.slice(0, 1000), at: m.created_at })
      } else {
        openAsk = null   // Milla answered — the turn is closed; anything later is a new topic.
      }
    }
    res.json({ success: true, data: asks.reverse().slice(0, 20), window: WINDOW })
  } catch (err) { console.error('[operator/asks]', err); res.status(500).json({ success: false, error: 'Failed to load asks' }) }
})

// ── COMP / TEST FUNDING — put money in a client's wallet without a card ────────────
// Why this exists: the $4 approve gate reads `wallet_balance_usd` via try_charge_wallet, and
// the ONLY way to fill it was a real Stripe purchase. So a test client — or a comped one —
// could never be walked through the flow: their 👍 fails on an empty wallet. The old
// `POST /admin/clients/:id/credits` does not help, it writes the RETIRED `credit_balance`
// column, not the one-wallet balance.
//
// Deliberately NOT revenue. The ledger row is `manual_grant`, never `purchase`/`wallet_topup`,
// so nothing here can inflate the revenue reports. Capped, audited, and the note says who did
// it and why.
operatorRouter.post('/clients/:id/wallet', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(req.params.id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client' }); return }

    const raw = (req.body ?? {}) as { amount_usd?: unknown; note?: unknown }
    const amount = Number(raw.amount_usd)
    if (!Number.isFinite(amount) || amount === 0) {
      res.status(400).json({ success: false, error: 'Enter an amount (negative to take it back).' }); return
    }
    // Capped BOTH ways — a large negative could silently drain a real client's wallet.
    if (Math.abs(amount) > 500) {
      res.status(400).json({ success: false, error: 'Capped at $500 a time. Do it twice if you mean it.' }); return
    }
    const rounded = Math.round(amount * 100) / 100
    const note = typeof raw.note === 'string' ? raw.note.slice(0, 300) : ''

    const who = operatorEmail(req)
    const { error: ledgerErr } = await db.from('credit_transactions').insert({
      client_id: client.id,
      type:      'manual_grant',   // NOT a purchase — must never read as revenue
      amount:    rounded,
      plan:      'work_model',
      note:      `${note ? note + ' · ' : ''}[operator wallet grant ${rounded > 0 ? '+' : ''}$${rounded} by ${who} @ ${new Date().toISOString()}]`,
    })
    if (ledgerErr) throw ledgerErr

    const { error: walletErr } = await db.rpc('increment_wallet', { p_client_id: client.id, p_amount: rounded })
    if (walletErr) {
      // The ledger row exists but the balance did not move — say so loudly rather than
      // report a success the wallet does not reflect.
      console.error('[operator/wallet-grant] increment_wallet failed', walletErr.message, 'client', client.id)
      res.status(500).json({ success: false, error: `Ledger written but the balance did not move: ${walletErr.message}` }); return
    }

    const { data: after } = await db.from('clients')
      .select('wallet_balance_usd').eq('id', client.id).maybeSingle()

    await writeOperatorAudit({
      operatorEmail: who, clientId: client.id, action: 'wallet_grant',
      subjectType: 'client', subjectId: client.id,
      detail: { amount_usd: rounded, note: note || null, new_balance: after?.wallet_balance_usd ?? null },
    })
    res.json({ success: true, data: { amount_usd: rounded, wallet_balance_usd: Number(after?.wallet_balance_usd ?? 0) } })
  } catch (err) {
    console.error('[operator/wallet-grant]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to fund the wallet' })
  }
})

// ── V17 — THE BELL: what changed for a client that we need to look at ──────────────
// Derived live from real rows (no notifications table, no new SQL): a brand-new client
// whose first ICP is waiting on us, an ICP revised after the campaign was built, a client
// with no active campaign, and unread-ish prospect replies.
operatorRouter.get('/alerts', async (_req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const [clients, icps, camps, replies] = await Promise.all([
      db.from('clients').select('id, company_name, created_at, is_demo').order('created_at', { ascending: false }).limit(200),
      // NOT date-filtered on purpose. "ICP approved, no campaign — they can't be worked" is
      // the highest-value alert here, and a 14-day window would go silent for exactly the
      // clients it matters most for: the ones onboarded a while ago and still not working.
      db.from('icps').select('client_id, name, created_at, updated_at, is_active').limit(1000),
      db.from('figsy_campaigns').select('client_id, status, created_at').limit(400),
      db.from('figsy_replies').select('client_id, classification, received_at, qualified_at').gte('received_at', since).limit(400),
    ])
    const excluded = await getExcludedClientIds()

    const icpByClient = new Map<string, { created_at: string; updated_at: string | null }[]>()
    for (const i of (icps.data ?? []) as Record<string, unknown>[]) {
      const k = i.client_id as string
      if (!icpByClient.has(k)) icpByClient.set(k, [])
      icpByClient.get(k)!.push({ created_at: i.created_at as string, updated_at: (i.updated_at as string | null) ?? null })
    }
    const campByClient = new Map<string, { status: string; created_at: string }[]>()
    for (const c of (camps.data ?? []) as Record<string, unknown>[]) {
      const k = c.client_id as string
      if (!campByClient.has(k)) campByClient.set(k, [])
      campByClient.get(k)!.push({ status: c.status as string, created_at: c.created_at as string })
    }
    const replyByClient = new Map<string, number>()
    for (const r of (replies.data ?? []) as Record<string, unknown>[]) {
      if (r.qualified_at) continue
      const k = r.client_id as string
      replyByClient.set(k, (replyByClient.get(k) ?? 0) + 1)
    }

    const out: { client_id: string; company_name: string | null; kind: string; label: string; severity: 'high' | 'normal' }[] = []
    for (const c of (clients.data ?? []) as Record<string, unknown>[]) {
      const id = c.id as string
      if (c.is_demo === true || excluded.has(id)) continue
      const name = (c.company_name as string | null) ?? null
      const myIcps = icpByClient.get(id) ?? []
      const myCamps = campByClient.get(id) ?? []
      const hasActive = myCamps.some(x => x.status === 'active')
      const newish = (c.created_at as string) >= since

      if (newish && myIcps.length > 0 && !hasActive) {
        out.push({ client_id: id, company_name: name, kind: 'new_client_icp', label: 'New client — first ICP is waiting on us', severity: 'high' })
      } else if (!hasActive && myCamps.length === 0 && myIcps.length > 0) {
        out.push({ client_id: id, company_name: name, kind: 'no_campaign', label: 'ICP approved, no campaign yet — they can’t be worked', severity: 'high' })
      }
      // Revised ICP: touched after the newest campaign was built → the targeting moved
      // under a live campaign, so the people in it may be the wrong people now.
      const newestCamp = myCamps.map(x => x.created_at).sort().pop()
      const icpTouched = myIcps.map(x => x.updated_at ?? x.created_at).sort().pop()
      if (newestCamp && icpTouched && icpTouched > newestCamp) {
        out.push({ client_id: id, company_name: name, kind: 'icp_revised', label: 'ICP revised since the campaign was built', severity: 'normal' })
      }
      const rc = replyByClient.get(id) ?? 0
      if (rc > 0) {
        out.push({ client_id: id, company_name: name, kind: 'replies', label: `${rc} repl${rc === 1 ? 'y' : 'ies'} to answer`, severity: 'normal' })
      }
    }

    res.json({ success: true, data: out })
  } catch (err) { console.error('[operator/alerts]', err); res.status(500).json({ success: false, error: 'Failed to load alerts' }) }
})

// ── RUN PENDING MIGRATIONS (from Vida) ─────────────────────────────────────────────
// The Supabase SQL editor is unreachable (GitHub OAuth + a flagged account), and we are
// adding no new local tooling. This runs the reviewed, committed, idempotent statements in
// lib/pending-migrations.ts against DATABASE_URL. It never accepts SQL from the request —
// the body is ignored entirely — so this cannot become an arbitrary-SQL hole.
operatorRouter.post('/migrations/run', async (req: Request, res: Response) => {
  try {
    const { runPendingMigrations, PENDING_MIGRATIONS } = await import('../lib/pending-migrations')
    // An optional password for THIS RUN ONLY — the escape hatch for "the stored password is
    // stale and the Supabase dashboard that could reset it is unreachable" (GitHub removed
    // the Supabase OAuth app, so there is no way back into that dashboard at all). It is
    // never stored, never logged and never written to the audit row. Still not SQL: the only
    // statements that can run are the reviewed, committed ones in pending-migrations.ts.
    const dbPassword = typeof (req.body ?? {}).db_password === 'string' ? (req.body as { db_password: string }).db_password : null
    const run = await runPendingMigrations(dbPassword)
    const results = run.results
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: null, action: 'run_migration',
      subjectType: 'migration', subjectId: null,
      detail: {
        ran: results.filter(r => r.ok).map(r => r.key),
        failed: results.filter(r => !r.ok).map(r => r.key),
        host: run.host, used_pooler_fallback: run.usedFallback,
      },
    })
    res.json({
      success: true,
      data: {
        results, host: run.host, used_fallback: run.usedFallback, hint: run.hint ?? null,
        available: PENDING_MIGRATIONS.map(m => ({ key: m.key, title: m.title })),
      },
    })
  } catch (err) {
    console.error('[operator/migrations]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to run migrations' })
  }
})

// ── V7 ENGINE — the deliverability surface (item 211) ──────────────────────────────
// RULEBOOK 12.2: you cannot share a sender across clients. This is the page that proves
// each client has isolated, warmed sending and that it is HEALTHY — sends, opens, bounces,
// opt-outs, warm-up state and the daily cap, per inbox. Previously invisible: a burning
// inbox would take delivery down silently.
operatorRouter.get('/engine', async (_req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 7 * 864e5).toISOString()
    const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0)

    // The client_inboxes table arrives with 20260725_client_inboxes.sql, which is applied by
    // hand in Supabase. If the code ships BEFORE that SQL is run, this query errors — and a
    // 500 here would take the whole Engine page down. Degrade instead: no inbox rows, and a
    // migration_pending flag the page can explain. Everything else on the page still works.
    const [inboxes, clients, sent7, sentToday, bounced7, optOuts, opened7] = await Promise.all([
      db.from('client_inboxes')
        .select('id, client_id, email, kind, status, provider, daily_cap, warmup_started_at, warmup_ready_at, assigned_at')
        .not('status', 'in', '("released","retired")').order('assigned_at', { ascending: false })
        .then(r => r, () => ({ data: null, error: { message: 'client_inboxes missing' } })),
      db.from('clients').select('id, company_name'),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', since),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', midnight.toISOString()),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', since).eq('status', 'bounced'),
      db.from('opt_out_blocklist').select('email', { count: 'exact', head: true }),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', since).not('opened_at', 'is', null),
    ])

    const migrationPending = !!inboxes.error
    const nameById = new Map((clients.data ?? []).map((c: { id: string; company_name: string | null }) => [c.id, c.company_name]))
    const rows: Record<string, unknown>[] = (inboxes.data ?? []).map((i: Record<string, unknown>) => {
      const ready = i.warmup_ready_at ? new Date(i.warmup_ready_at as string).getTime() : null
      const started = i.warmup_started_at ? new Date(i.warmup_started_at as string).getTime() : null
      let warmupDay: number | null = null
      if (started) warmupDay = Math.max(0, Math.min(14, Math.round((Date.now() - started) / 864e5)))
      return { ...i, company_name: nameById.get(i.client_id as string) ?? null,
        warmup_day: warmupDay, warmup_ready: ready ? Date.now() >= ready : null }
    })

    // Clients with NO live sender — nothing can go out for them (the #270/#271 queue).
    const withInbox = new Set(rows.map(r => r.client_id as string))
    const excluded = new Set(await getExcludedClientIds())
    const needsInbox = (clients.data ?? [])
      .filter((c: { id: string }) => !withInbox.has(c.id) && !excluded.has(c.id))
      .map((c: { id: string; company_name: string | null }) => ({ client_id: c.id, company_name: c.company_name }))

    const sent = sent7.count ?? 0
    res.json({ success: true, data: {
      totals: {
        sent_7d: sent, sent_today: sentToday.count ?? 0,
        opened_7d: opened7.count ?? 0, bounced_7d: bounced7.count ?? 0,
        opt_outs_total: optOuts.count ?? 0,
        bounce_rate: sent > 0 ? Math.round(((bounced7.count ?? 0) / sent) * 1000) / 10 : 0,
        open_rate:   sent > 0 ? Math.round(((opened7.count ?? 0) / sent) * 1000) / 10 : 0,
      },
      inboxes: rows,
      needs_inbox: migrationPending ? [] : needsInbox,
      migration_pending: migrationPending,
    } })
  } catch (err) { console.error('[operator/engine]', err); res.status(500).json({ success: false, error: 'Failed to load engine' }) }
})

// ── V9 #270 — assign a PRE-WARMED POOLED inbox (instant; client sends day 1) ────────
operatorRouter.post('/inboxes/assign', async (req: Request, res: Response) => {
  try {
    const { client_id, email, daily_cap } = (req.body ?? {}) as { client_id?: string; email?: string; daily_cap?: number }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    if (!email || !email.includes('@')) { res.status(400).json({ success: false, error: 'A pooled inbox email is required' }); return }

    const { data, error } = await db.from('client_inboxes').insert({
      client_id: client.id, email: email.trim().toLowerCase(), kind: 'pooled',
      status: 'active', daily_cap: daily_cap ?? null,
    }).select('id, email, kind, status').single()
    if (error) throw error

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'assign_inbox',
      subjectType: 'inbox', subjectId: data.id, detail: { email, kind: 'pooled' },
    })
    res.json({ success: true, data })
  } catch (err) { console.error('[operator/inbox-assign]', err); res.status(500).json({ success: false, error: 'Failed to assign inbox' }) }
})

// ── V9 #271 — client paid: record their BRANDED inbox, warming ~14d, no gap ─────────
operatorRouter.post('/inboxes/brand', async (req: Request, res: Response) => {
  try {
    const { client_id, email } = (req.body ?? {}) as { client_id?: string; email?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    if (!email || !email.includes('@')) { res.status(400).json({ success: false, error: 'A branded inbox email is required' }); return }

    const now = Date.now()
    const { data, error } = await db.from('client_inboxes').insert({
      client_id: client.id, email: email.trim().toLowerCase(), kind: 'branded',
      status: 'warming',
      warmup_started_at: new Date(now).toISOString(),
      warmup_ready_at: new Date(now + 14 * 864e5).toISOString(),
    }).select('id, email, kind, status, warmup_ready_at').single()
    if (error) throw error

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'assign_inbox',
      subjectType: 'inbox', subjectId: data.id, detail: { email, kind: 'branded', warming: true },
    })
    res.json({ success: true, data })
  } catch (err) { console.error('[operator/inbox-brand]', err); res.status(500).json({ success: false, error: 'Failed to record branded inbox' }) }
})

// Switch a warmed branded inbox live and release the pooled one (the ~day-29 switch).
operatorRouter.post('/inboxes/:id/status', async (req: Request, res: Response) => {
  try {
    const { client_id, status } = (req.body ?? {}) as { client_id?: string; status?: string }
    if (!['active', 'warming', 'released', 'retired'].includes(String(status))) {
      res.status(400).json({ success: false, error: 'Invalid status' }); return
    }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'released' || status === 'retired') patch.released_at = new Date().toISOString()

    const { data, error } = await db.from('client_inboxes').update(patch)
      .eq('id', req.params.id).eq('client_id', client.id)
      .select('id, email, kind, status').maybeSingle()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'Inbox not found' }); return }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'assign_inbox',
      subjectType: 'inbox', subjectId: req.params.id, detail: { status },
    })
    res.json({ success: true, data })
  } catch (err) { console.error('[operator/inbox-status]', err); res.status(500).json({ success: false, error: 'Failed to update inbox' }) }
})

// ── V4d — ICP AUTHORING (create a new version / edit the current one) ──────────────
operatorRouter.post('/icp', async (req: Request, res: Response) => {
  try {
    const b = (req.body ?? {}) as Record<string, unknown>
    const client = await requireClient(b.client_id as string | undefined)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const arr = (v: unknown): string[] => Array.isArray(v)
      ? v.map(x => String(x).trim()).filter(Boolean).slice(0, 60)
      : String(v ?? '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 60)

    const payload = {
      name: String(b.name ?? '').trim().slice(0, 120) || 'ICP',
      industries: arr(b.industries), job_titles: arr(b.job_titles),
      seniority_levels: arr(b.seniority_levels), company_sizes: arr(b.company_sizes),
      geographies: arr(b.geographies), tech_stack: arr(b.tech_stack), keywords: arr(b.keywords),
      updated_at: new Date().toISOString(),
    }

    if (b.icp_id) {
      const { data, error } = await db.from('icps').update(payload)
        .eq('id', b.icp_id as string).eq('client_id', client.id).select('id, name').maybeSingle()
      if (error) throw error
      if (!data) { res.status(404).json({ success: false, error: 'ICP not found' }); return }
      await writeOperatorAudit({ operatorEmail: operatorEmail(req), clientId: client.id, action: 'edit_icp', subjectType: 'icp', subjectId: data.id, detail: { updated: true } })
      res.json({ success: true, data }); return
    }

    // New version becomes the active one; older versions are deactivated.
    await db.from('icps').update({ is_active: false }).eq('client_id', client.id)
    const { data, error } = await db.from('icps')
      .insert({ client_id: client.id, ...payload, is_active: true }).select('id, name').single()
    if (error) throw error
    await writeOperatorAudit({ operatorEmail: operatorEmail(req), clientId: client.id, action: 'edit_icp', subjectType: 'icp', subjectId: data.id, detail: { created: true } })
    res.json({ success: true, data })
  } catch (err) { console.error('[operator/icp]', err); res.status(500).json({ success: false, error: 'Failed to save ICP' }) }
})

// Read one ICP in full (the editor needs every field, /cockpit only lists them).
operatorRouter.get('/icp/:id', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(String(req.query.client_id ?? ''))
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const { data } = await db.from('icps').select('*').eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (!data) { res.status(404).json({ success: false, error: 'ICP not found' }); return }
    res.json({ success: true, data })
  } catch (err) { console.error('[operator/icp-get]', err); res.status(500).json({ success: false, error: 'Failed to load ICP' }) }
})

// ── V4d — SEQUENCE AUTHORING (steps: subject + body per step) ──────────────────────
operatorRouter.post('/sequence', async (req: Request, res: Response) => {
  try {
    const b = (req.body ?? {}) as { client_id?: string; sequence_id?: string; name?: string; steps?: unknown }
    const client = await requireClient(b.client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    if (!Array.isArray(b.steps) || b.steps.length === 0) { res.status(400).json({ success: false, error: 'At least one step is required' }); return }
    if (b.steps.length > 10) { res.status(400).json({ success: false, error: 'Maximum 10 steps' }); return }

    const steps = (b.steps as Record<string, unknown>[]).map((st, i) => ({
      step: i + 1,
      subject: String(st.subject ?? '').slice(0, 200),
      body: String(st.body ?? '').slice(0, 5000),
      wait_days: Number(st.wait_days ?? (i === 0 ? 0 : 3)) || 0,
    }))
    const name = String(b.name ?? '').trim().slice(0, 120) || 'Sequence'

    if (b.sequence_id) {
      const { data, error } = await db.from('figsy_sequences')
        .update({ name, steps, updated_at: new Date().toISOString() })
        .eq('id', b.sequence_id).eq('client_id', client.id).select('id, name').maybeSingle()
      if (error) throw error
      if (!data) { res.status(404).json({ success: false, error: 'Sequence not found' }); return }
      await writeOperatorAudit({ operatorEmail: operatorEmail(req), clientId: client.id, action: 'edit_sequence', subjectType: 'sequence', subjectId: data.id, detail: { steps: steps.length } })
      res.json({ success: true, data }); return
    }

    const { data, error } = await db.from('figsy_sequences')
      .insert({ client_id: client.id, name, steps }).select('id, name').single()
    if (error) throw error
    await writeOperatorAudit({ operatorEmail: operatorEmail(req), clientId: client.id, action: 'edit_sequence', subjectType: 'sequence', subjectId: data.id, detail: { created: true, steps: steps.length } })
    res.json({ success: true, data })
  } catch (err) { console.error('[operator/sequence]', err); res.status(500).json({ success: false, error: 'Failed to save sequence' }) }
})

// ── INBOX: read one reply thread, draft an answer, send it (operator-on-behalf) ────
// "A prospect asks a question — WE handle it." The client never touches this.
operatorRouter.get('/replies/:id', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(String(req.query.client_id ?? ''))
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const { data: reply } = await db.from('figsy_replies')
      .select('id, lead_id, from_name, from_email, subject, body, body_text, classification, qualified_at, meeting_booked_at, received_at')
      .eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    let lead: Record<string, unknown> | null = null
    if (reply.lead_id) {
      const { data } = await db.from('leads')
        .select('id, first_name, last_name, job_title, company, industry, email')
        .eq('id', reply.lead_id).maybeSingle()
      lead = data ?? null
    }
    res.json({ success: true, data: { reply, lead } })
  } catch (err) { console.error('[operator/reply]', err); res.status(500).json({ success: false, error: 'Failed to load reply' }) }
})

// Draft an answer in the CLIENT's voice. Returns text for the operator to edit — never sends.
operatorRouter.post('/replies/:id/draft', async (req: Request, res: Response) => {
  try {
    const { client_id } = (req.body ?? {}) as { client_id?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    if (!process.env.ANTHROPIC_API_KEY) { res.status(503).json({ success: false, error: 'AI drafting not configured' }); return }

    const { data: reply } = await db.from('figsy_replies')
      .select('id, from_name, from_email, subject, body, body_text, classification, lead_id')
      .eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    let leadCtx = ''
    if (reply.lead_id) {
      const { data: lead } = await db.from('leads')
        .select('first_name, last_name, job_title, company, industry').eq('id', reply.lead_id).maybeSingle()
      if (lead) leadCtx = [lead.first_name && `Name: ${lead.first_name} ${lead.last_name ?? ''}`.trim(),
        lead.job_title && `Role: ${lead.job_title}`, lead.company && `Company: ${lead.company}`,
        lead.industry && `Industry: ${lead.industry}`].filter(Boolean).join('; ')
    }
    const { data: c } = await db.from('clients')
      .select('company_name, signer_name, industry').eq('id', client.id).maybeSingle()

    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 500,
      messages: [{ role: 'user', content:
        `You write a short B2B email reply ON BEHALF OF ${c?.company_name ?? 'our client'}` +
        `${c?.industry ? ` (${c.industry})` : ''}. Write as them, never mention an agency or AI.\n\n` +
        `Prospect: ${reply.from_name ?? reply.from_email}\n${leadCtx ? `Context: ${leadCtx}\n` : ''}` +
        `Their message:\n"""${(reply.body_text ?? reply.body ?? '').slice(0, 2000)}"""\n\n` +
        `Reply in 2-4 short sentences. Answer their actual question, then propose a 15-minute call. ` +
        `Plain text, no subject line, no placeholders. Sign off as ${c?.signer_name ?? c?.company_name ?? 'the team'}.` }],
    })
    const draft = msg.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('').trim()
    res.json({ success: true, data: { draft } })
  } catch (err) { console.error('[operator/reply-draft]', err); res.status(500).json({ success: false, error: 'Failed to draft reply' }) }
})

// Send it. Same gates as every other prospect send (demo · opt-out · kill-switch).
operatorRouter.post('/replies/:id/send', async (req: Request, res: Response) => {
  try {
    const { client_id, body } = (req.body ?? {}) as { client_id?: string; body?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    if (typeof body !== 'string' || !body.trim()) { res.status(400).json({ success: false, error: 'body is required' }); return }

    const { sendManualReply } = await import('../lib/manual-reply')
    const r = await sendManualReply(req.params.id, client.id, body.trim().slice(0, 5000))
    if (!r.ok) { res.status(r.status).json({ success: false, error: r.error }); return }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'send_reply',
      subjectType: 'reply', subjectId: req.params.id, detail: { sent: r.sent, on_behalf: true },
    })
    res.json({ success: true, data: r.sent ? { sent: true } : { sent: false, demo: true } })
  } catch (err) { console.error('[operator/reply-send]', err); res.status(500).json({ success: false, error: 'Failed to send reply' }) }
})

// ── PER-CLIENT COCKPIT (ICP · campaigns · sequences · inbox) ──────────────────────
// The data path Vida never had. /figsy/* and /icps are gated by requireAuth (a CLIENT
// Bearer JWT), but the admin app proxies with x-admin-key and no client session — so the
// operator console literally could not read a client's ICP, campaigns or sequences. That
// is why Vida had no ICP/campaign/sequence surfaces at all, and why the old client-detail
// page's `/api/proxy/figsy/campaigns?client_id=` + `/api/proxy/icps?client_id=` calls
// silently 401'd and always rendered "none". One admin-key-gated, client_id-scoped read
// replaces all of them.
operatorRouter.get('/cockpit', async (req: Request, res: Response) => {
  try {
    const clientId = String(req.query.client_id ?? '')
    const client = await requireClient(clientId)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const cid = client.id

    const [icps, campaigns, sequences, replies] = await Promise.all([
      db.from('icps').select('id, name, created_at, last_run_at')
        .eq('client_id', cid).order('created_at', { ascending: false }).limit(20),
      // campaign_intent + settings are here because the Campaign editor pre-fills from this
      // read — without them "Edit" would open blank and saving would wipe the brief every
      // email is written from. `settings` (not a `daily_send_limit` column, which does not
      // exist) is where the real send gates live — see lib/campaign-settings.ts.
      db.from('figsy_campaigns')
        .select('id, name, status, leads_enrolled, emails_sent, replies_total, replies_interested, created_at, campaign_intent, settings')
        .eq('client_id', cid).order('created_at', { ascending: false }).limit(20),
      db.from('figsy_sequences').select('id, name, steps, created_at, updated_at')
        .eq('client_id', cid).order('created_at', { ascending: false }).limit(20),
      db.from('figsy_replies')
        .select('id, lead_id, from_name, from_email, classification, qualified_at, meeting_booked_at, received_at')
        .eq('client_id', cid).order('received_at', { ascending: false }).limit(40),
    ])

    // V11 ONBOARDING GATE — "is this client 100%? if not, ask more or book a call."
    // Vida could not previously tell you a client was half-onboarded, so work started on
    // thin information. Scored off what we actually need to target well.
    const { data: prof } = await db.from('clients')
      .select('company_name, industry, country, website, phone, signer_name').eq('id', cid).maybeSingle()
    const checks: { key: string; label: string; ok: boolean }[] = [
      { key: 'company_name', label: 'Company name',        ok: !!prof?.company_name },
      { key: 'industry',     label: 'Industry',            ok: !!prof?.industry },
      { key: 'country',      label: 'Country',             ok: !!prof?.country },
      { key: 'website',      label: 'Website',             ok: !!prof?.website },
      { key: 'signer_name',  label: 'Who signs the emails', ok: !!prof?.signer_name },
      { key: 'icp',          label: 'Approved ICP',        ok: (icps.data ?? []).length > 0 },
      { key: 'sequence',     label: 'Sequence written',    ok: (sequences.data ?? []).length > 0 },
      { key: 'campaign',     label: 'Campaign live',       ok: (campaigns.data ?? []).some((c: { status: string }) => c.status === 'active') },
    ]
    const done = checks.filter(c => c.ok).length
    const onboarding = {
      percent: Math.round((done / checks.length) * 100),
      missing: checks.filter(c => !c.ok).map(c => c.label),
      checks,
    }

    // Flatten the gates out of settings so the editor gets plain fields and never has to
    // know where they live (one mapping, in lib/campaign-settings.ts).
    const { readCampaignGates } = await import('../lib/campaign-settings')
    const campaignRows = (campaigns.data ?? []).map((c: Record<string, unknown>) => {
      const gates = readCampaignGates(c.settings)
      const { settings: _drop, ...rest } = c
      return { ...rest, ...gates, copilot_mode: gates.review_required }
    })

    res.json({
      success: true,
      data: {
        client:    { id: cid, company_name: client.company_name ?? null },
        onboarding,
        icps:      icps.data ?? [],
        campaigns: campaignRows,
        sequences: sequences.data ?? [],
        replies:   replies.data ?? [],
      },
    })
  } catch (err) { console.error('[operator/cockpit]', err); res.status(500).json({ success: false, error: 'Failed to load client cockpit' }) }
})

// Pause / resume a client's campaign (operator-side; the client's view is read-only).
operatorRouter.post('/campaign/:id/status', async (req: Request, res: Response) => {
  try {
    const { client_id, status } = (req.body ?? {}) as { client_id?: string; status?: string }
    if (status !== 'active' && status !== 'paused') {
      res.status(400).json({ success: false, error: 'status must be active or paused' }); return
    }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const { data: updated, error } = await db.from('figsy_campaigns')
      .update({ status }).eq('id', req.params.id).eq('client_id', client.id)
      .select('id, name, status').maybeSingle()
    if (error) throw error
    if (!updated) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'pause_campaign',
      subjectType: 'campaign', subjectId: req.params.id, detail: { status, on_behalf: true },
    })
    res.json({ success: true, data: updated })
  } catch (err) { console.error('[operator/campaign/status]', err); res.status(500).json({ success: false, error: 'Failed to update campaign' }) }
})

// ── START A CLIENT'S CAMPAIGN (operator-side, the managed model) ──────────────────
// In the work model WE run the outreach, so campaign creation belongs to the operator,
// not the client (their "My campaign" is read-only status). Without this there is no
// way to create a campaign at all: POST /figsy/campaigns is client-JWT-only and was
// only ever reachable from the self-serve console we removed from Milla.
//
// A client with no ACTIVE campaign cannot be worked — approveLead now fail-closes and
// refuses to charge the $4 rather than take money for work that can't run. This is the
// button that unblocks them. Idempotent: if an active campaign already exists it is
// returned untouched (never a second one). Created ACTIVE on purpose — the table default
// is 'draft', and a draft would leave the client just as blocked.
operatorRouter.post('/campaign/start', async (req: Request, res: Response) => {
  try {
    const { client_id, name } = (req.body ?? {}) as { client_id?: string; name?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const { data: existing } = await db.from('figsy_campaigns')
      .select('id, name, status').eq('client_id', client.id).eq('status', 'active')
      .limit(1).maybeSingle()
    if (existing) { res.json({ success: true, data: existing, created: false }); return }

    const campaignName = (typeof name === 'string' && name.trim()) ? name.trim().slice(0, 120) : 'Outbound campaign'
    const { data: created, error } = await db.from('figsy_campaigns')
      .insert({ client_id: client.id, name: campaignName, status: 'active' })
      .select('id, name, status').single()
    if (error) throw error

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'start_campaign',
      subjectType: 'campaign', subjectId: created.id, detail: { name: campaignName, on_behalf: true },
    })
    res.json({ success: true, data: created, created: true })
  } catch (err) { console.error('[operator/campaign/start]', err); res.status(500).json({ success: false, error: 'Failed to start campaign' }) }
})

// ── #494 QUALIFY GATE — operator marks a reply a qualified conversation (NO SPEND) ──
// A human judgement on a reply: the right person, real interest — distinct from the AI
// `classification`. This is a triage marker only: it spends nothing and moves no money
// (the $3 hold is untouched). Idempotent — marking an already-qualified reply is a no-op
// that still returns success. Un-qualify by passing { qualified: false }.
operatorRouter.post('/replies/:id/qualify', async (req: Request, res: Response) => {
  try {
    const { client_id, qualified } = (req.body ?? {}) as { client_id?: string; qualified?: boolean }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    // Scope the reply to this client so an operator can't qualify another client's reply.
    const { data: reply } = await db.from('figsy_replies')
      .select('id, qualified_at').eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }
    const setQualified = qualified !== false // default true
    const { error } = await db.from('figsy_replies').update({
      qualified_at: setQualified ? new Date().toISOString() : null,
      qualified_by: setQualified ? operatorEmail(req) : null,
    }).eq('id', req.params.id).eq('client_id', client.id)
    if (error) throw error
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'qualify_reply',
      subjectType: 'reply', subjectId: req.params.id, detail: { qualified: setQualified, on_behalf: true },
    })
    res.json({ success: true, qualified: setQualified })
  } catch (err) { console.error('[operator/qualify]', err); res.status(500).json({ success: false, error: 'Failed to qualify reply' }) }
})

// ── #487 DRAFT-QUEUE RELEASE (operator releases a FIGSY-written draft) ──────────
// The "Needs approval" column is the figsy_approval_queue (drafts FIGSY wrote, awaiting a
// human gate). These are NOT the $4 lead-approve — the $4 already fired when the lead was
// revealed+enrolled. Approving here RELEASES the draft (the real, charged, logged send)
// via the SAME approveQueuedDraft path the portal uses; rejecting closes it.
operatorRouter.post('/queue/:id/approve', async (req: Request, res: Response) => {
  try {
    const { client_id } = (req.body ?? {}) as { client_id?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const { approveDraftOnBehalf } = await import('../lib/operator-queue')
    const r = await approveDraftOnBehalf(client.id, req.params.id)
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'approve_draft',
      subjectType: 'approval_queue', subjectId: req.params.id,
      detail: { on_behalf: true, sent: r.body.sent === true, outcome: r.body.outcome ?? (r.body.sent === true ? 'sent' : null) },
    })
    res.status(r.http).json(r.body)
  } catch (err) { console.error('[operator/queue/approve]', err); res.status(500).json({ success: false, error: 'Failed to approve draft' }) }
})

operatorRouter.post('/queue/:id/reject', async (req: Request, res: Response) => {
  try {
    const { client_id } = (req.body ?? {}) as { client_id?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const { rejectDraftOnBehalf } = await import('../lib/operator-queue')
    const { rejected } = await rejectDraftOnBehalf(client.id, req.params.id)
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'reject_draft',
      subjectType: 'approval_queue', subjectId: req.params.id, detail: { on_behalf: true, found: rejected },
    })
    if (!rejected) { res.status(404).json({ success: false, error: 'Draft not found or already processed' }); return }
    res.json({ success: true, rejected: true })
  } catch (err) { console.error('[operator/queue/reject]', err); res.status(500).json({ success: false, error: 'Failed to reject draft' }) }
})

// ── #486 OPERATOR AUDIT LOG (read-only viewer) ────────────────────────────────
operatorRouter.get('/audit', async (req: Request, res: Response) => {
  try {
    let q = db.from('operator_audit_log')
      .select('id, operator_email, client_id, action, subject_type, subject_id, detail, created_at')
      .order('created_at', { ascending: false }).limit(200)
    if (typeof req.query.client_id === 'string' && req.query.client_id) q = q.eq('client_id', req.query.client_id)
    const { data, error } = await q
    if (error) throw error
    res.json({ success: true, data: data ?? [] })
  } catch (err) { console.error('[operator/audit]', err); res.status(500).json({ success: false, error: 'Failed to load audit log' }) }
})

// ── #485 who am I — echoes the operator email the proxy injected (rail identity) ──
operatorRouter.get('/whoami', (req: Request, res: Response) => {
  res.json({ success: true, data: { email: operatorEmail(req) } })
})

// ── #485 engine-health card (rail) — REAL live numbers, never hardcoded ───────
operatorRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0)
    const iso = midnight.toISOString()
    const [sent, replies, pending] = await Promise.all([
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', iso),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).gte('received_at', iso),
      db.from('figsy_approval_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    res.json({
      success: true,
      data: {
        sent_today:        sent.count ?? 0,
        replies_today:     replies.count ?? 0,
        pending_approvals: pending.count ?? 0,
      },
    })
  } catch (err) { console.error('[operator/health]', err); res.status(500).json({ success: false, error: 'Failed to load health' }) }
})

// ── #485 top-bar status chips (honest kill-switch + cap state) ────────────────
// Fable verify fix: the chip must show the REAL send cap. The engine's cap is
// coldDailyCap() (FIGSY_COLD_DAILY_CAP, else the FIGSY_WARMUP_START ramp) — and
// null means NO cap is configured, which the console must say plainly, never a
// fabricated "20".
operatorRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const { coldDailyCap, outreachEnabled } = await import('../lib/figsy')
    res.json({
      success: true,
      data: {
        outreach_enabled: outreachEnabled(),
        daily_cap: coldDailyCap(),   // number | null — null = no cap set
      },
    })
  } catch (err) { console.error('[operator/status]', err); res.status(500).json({ success: false, error: 'Failed to load status' }) }
})

// ── #498 VIDA COMMAND BAR — conversational operator control, client-scoped ─────────
// Phase 1 is DETERMINISTIC and HONEST: it answers status/blockers questions from LIVE
// board data, and for write-intents (source / build campaign / update sequence) it hands
// off to the existing engine tools rather than pretending to run them. Nothing here spends
// a client's credits (invariant #1). Every command writes an audit row.
operatorRouter.post('/command', async (req: Request, res: Response) => {
  try {
    const { client_id, text } = (req.body ?? {}) as { client_id?: string; text?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const q = (typeof text === 'string' ? text : '').trim()
    if (!q) { res.status(400).json({ success: false, error: 'Empty command' }); return }
    const cid = client.id
    const lc = q.toLowerCase()

    // Live counts for this client (the honest denominator behind every answer).
    const [sourced, needs, sending, replied, enrolled, booked] = await Promise.all([
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', cid).is('revealed_at', null).neq('status', 'passed').in('status', ['scored', 'pending']),
      db.from('figsy_approval_queue').select('id', { count: 'exact', head: true }).eq('client_id', cid).eq('status', 'pending'),
      db.from('figsy_enrollments').select('id', { count: 'exact', head: true }).eq('client_id', cid).eq('status', 'enrolled'),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', cid),
      db.from('figsy_enrollments').select('id', { count: 'exact', head: true }).eq('client_id', cid),
      db.from('calendar_bookings').select('id', { count: 'exact', head: true }).eq('client_id', cid).eq('status', 'confirmed'),
    ])
    const c = {
      sourced: sourced.count ?? 0, needs: needs.count ?? 0, sending: sending.count ?? 0,
      replied: replied.count ?? 0, enrolled: enrolled.count ?? 0, booked: booked.count ?? 0,
    }
    const surfaced = await db.from('leads').select('id', { count: 'exact', head: true })
      .eq('client_id', cid).not('surfaced_for_approval_at', 'is', null).is('revealed_at', null)

    let reply: string
    let kind: 'answer' | 'handoff' = 'answer'
    let link: string | null = null

    if (/(block|stuck|waiting|what.?s left|to.?do|next)/.test(lc)) {
      reply = `Blockers for ${client.company_name ?? 'this client'}: `
        + `${c.needs} draft${c.needs === 1 ? '' : 's'} at your Send gate · `
        + `${surfaced.count ?? 0} lead${(surfaced.count ?? 0) === 1 ? '' : 's'} sent to the client, awaiting their 👍 (Money gate) · `
        + `${c.sourced} sourced lead${c.sourced === 1 ? '' : 's'} you haven't sent yet.`
    } else if (/(status|how.*(going|doing)|summary|overview|pipeline)/.test(lc)) {
      reply = `${client.company_name ?? 'Client'} pipeline — sourced ${c.sourced} · needs approval ${c.needs} · sending ${c.sending} · replied ${c.replied} · worked ${c.enrolled} · booked ${c.booked}.`
    } else if (/(source|find|new lead|prospect|pull)/.test(lc)) {
      kind = 'handoff'; link = `/vida?client=${cid}`
      reply = `Sourcing runs in the FIGSY engine against this client's ICP. Open the ICP & Campaigns tools to source a new batch — new leads land in the Sourced column here. (One-click sourcing from this bar is on the build list.)`
    } else if (/(sequence|email|copy|draft|campaign)/.test(lc)) {
      kind = 'handoff'; link = `/vida?client=${cid}`
      reply = `Campaigns & sequences live in the FIGSY engine. Build or edit there; drafts come back to the Needs-approval column for your Send gate.`
    } else if (/(icp|target|persona|who)/.test(lc)) {
      kind = 'handoff'; link = `/vida?client=${cid}`
      reply = `Redefine the ICP in the ICP builder — the next sourcing run uses the new definition.`
    } else {
      reply = `I can tell you this client's status or what's blocking, and point you to the ICP / campaign / sequence tools. Try "what's blocking?" or "status".`
    }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: cid, action: 'vida_command',
      subjectType: 'client', subjectId: cid, detail: { text: q, kind },
    })
    res.json({ success: true, reply, kind, link, counts: c })
  } catch (err) { console.error('[operator/command]', err); res.status(500).json({ success: false, error: 'Command failed' }) }
})

// ── LEAD QUEUE — every pending draft across ALL clients (the operator's inbox) ─────
// So the operator never has to open each client to find what's waiting. Read-only; the
// Approve & send / Reject actions reuse the per-draft /queue/:id endpoints above.
operatorRouter.get('/queue', async (_req: Request, res: Response) => {
  try {
    const { listPendingDrafts } = await import('../lib/operator-queue')
    const drafts = await listPendingDrafts(100)
    res.json({ success: true, data: drafts })
  } catch (err) { console.error('[operator/queue-list]', err); res.status(500).json({ success: false, error: 'Failed to load lead queue' }) }
})

// ── SUPPRESSION — the real do-not-contact / opt-out list (opt_out_blocklist) ───────
// The compliance-critical list the send path checks per send. Read-only viewer: latest
// entries + a total count + a by-reason breakdown. This is the REAL suppression data —
// NOT the static certifications page the old rail linked to.
operatorRouter.get('/suppression', async (_req: Request, res: Response) => {
  try {
    const LIST = 200
    const [rows, totalQ] = await Promise.all([
      db.from('opt_out_blocklist').select('email, reason, created_at').order('created_at', { ascending: false }).limit(LIST),
      db.from('opt_out_blocklist').select('email', { count: 'exact', head: true }),
    ])
    const list = (rows.data ?? []) as { email: string | null; reason: string | null; created_at: string | null }[]
    const byReason: Record<string, number> = {}
    for (const r of list) { const k = r.reason ?? 'unknown'; byReason[k] = (byReason[k] ?? 0) + 1 }
    res.json({
      success: true,
      data: { total: totalQ.count ?? 0, showing: list.length, by_reason: byReason, entries: list },
    })
  } catch (err) { console.error('[operator/suppression]', err); res.status(500).json({ success: false, error: 'Failed to load suppression list' }) }
})

// ── REPORTS & BILLING — per-client revenue essentials the operator reads ───────────
// For each client: credits balance, FIGSY credits, revealed count ($1 each) and qualified
// count (an enrollment ⟺ the $4 fired). Real aggregates — no fabricated MRR. Bounded by
// client count (a couple of head-count queries per client).
operatorRouter.get('/reports', async (_req: Request, res: Response) => {
  try {
    const { data: clients } = await db.from('clients')
      .select('id, company_name, wallet_balance_usd, is_demo')
      .order('created_at', { ascending: false })
    const excluded = await getExcludedClientIds()
    const rows = await Promise.all((clients ?? []).map(async (c: Record<string, unknown>) => {
      const cid = c.id as string
      const [qual, revealed] = await Promise.all([
        db.from('figsy_enrollments').select('lead_id', { count: 'exact', head: true }).eq('client_id', cid),
        db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', cid).not('revealed_at', 'is', null),
      ])
      return {
        client_id: cid,
        company_name: (c.company_name as string | null) ?? null,
        house_or_demo: c.is_demo === true || excluded.has(cid),
        wallet_balance_usd: Number((c.wallet_balance_usd as number | null) ?? 0),
        revealed_count: revealed.count ?? 0,
        qualified_count: qual.count ?? 0,
      }
    }))
    const totals = rows.reduce((a, r) => ({
      revealed: a.revealed + r.revealed_count,
      qualified: a.qualified + r.qualified_count,
    }), { revealed: 0, qualified: 0 })
    res.json({ success: true, data: { clients: rows, totals } })
  } catch (err) { console.error('[operator/reports]', err); res.status(500).json({ success: false, error: 'Failed to load reports' }) }
})

// ── #505 LIVE BLOCKERS — the structured "what's stuck for this client right now" strip ──
// The same three gates the command bar answers in prose, as data so the board can render a
// live strip under the command bar (no LLM, no fabrication). Read-only, non-spend:
//   • send_gate     — drafts waiting on the operator's Send gate (figsy_approval_queue)
//   • money_gate    — leads sent to the client, awaiting THEIR 👍 (surfaced, not revealed)
//   • unsent_sourced— sourced leads the operator hasn't sent to the client yet
//   • replies_to_triage — replies in the unibox not yet qualified
operatorRouter.get('/blockers', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(req.query.client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const cid = client.id
    const [sendGate, moneyGate, unsent, triage] = await Promise.all([
      db.from('figsy_approval_queue').select('id', { count: 'exact', head: true }).eq('client_id', cid).eq('status', 'pending'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', cid).not('surfaced_for_approval_at', 'is', null).is('revealed_at', null),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', cid).is('revealed_at', null).is('surfaced_for_approval_at', null).neq('status', 'passed').in('status', ['scored', 'pending']),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', cid).is('qualified_at', null),
    ])
    res.json({
      success: true,
      data: {
        send_gate:          sendGate.count ?? 0,
        money_gate:         moneyGate.count ?? 0,
        unsent_sourced:     unsent.count ?? 0,
        replies_to_triage:  triage.count ?? 0,
      },
    })
  } catch (err) { console.error('[operator/blockers]', err); res.status(500).json({ success: false, error: 'Failed to load blockers' }) }
})

// ── #499 BOOKINGS — the operator's meetings view for a client (READ) ────────────────
// Every booking for the client (confirmed + no-show), joined to the lead for a name. This
// is a real read of calendar_bookings — the $3-on-booking capture is unchanged. The $3 is
// KEPT on a no-show (money already captured at booking); #499m tracks rebook_count so the
// console gives at most 2 goodwill rebooks before the meeting is terminal-kept.
operatorRouter.get('/bookings', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(req.query.client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const cid = client.id
    const { data: rows } = await db.from('calendar_bookings')
      .select('id, lead_id, meeting_title, start_time, end_time, status, meeting_link, no_show_at, rebook_count, created_at')
      .eq('client_id', cid).order('start_time', { ascending: false }).limit(100)
    const leadIds = Array.from(new Set((rows ?? []).map((b: { lead_id: string | null }) => b.lead_id).filter(Boolean))) as string[]
    const leadNames = leadIds.length > 0
      ? await db.from('leads').select('id, first_name, last_name, company').in('id', leadIds)
      : { data: [] }
    const nameById = new Map((leadNames.data ?? []).map((l: Record<string, unknown>) => [l.id as string, l]))
    const bookings = (rows ?? []).map((b: Record<string, unknown>) => {
      const l = nameById.get(b.lead_id as string) as Record<string, unknown> | undefined
      return {
        id: b.id, lead_id: b.lead_id, meeting_title: b.meeting_title, start_time: b.start_time,
        end_time: b.end_time, status: b.status, meeting_link: b.meeting_link, no_show_at: b.no_show_at,
        rebook_count: (b.rebook_count as number | null) ?? 0,
        first_name: l?.first_name ?? null, last_name: l?.last_name ?? null, company: l?.company ?? null,
      }
    })
    const confirmed = bookings.filter(b => b.status === 'confirmed').length
    const noShow = bookings.filter(b => b.status === 'no_show').length
    res.json({ success: true, client: { id: cid, company_name: client.company_name }, data: bookings, counts: { total: bookings.length, confirmed, no_show: noShow } })
  } catch (err) { console.error('[operator/bookings]', err); res.status(500).json({ success: false, error: 'Failed to load bookings' }) }
})

// ── #499 MARK NO-SHOW — record that a booked meeting did not happen (STATE ONLY) ─────
// Flips the booking to status='no_show' and stamps who/when. NON-MONEY: the $3 was captured
// at booking and is KEPT — no refund/release fires here (founder rule 24 Jul: no-show → up
// to 2 rebooks → keep). The rebook ladder lives in POST /bookings/:id/rebook below.
// Un-mark (mis-click) with { no_show: false }.
operatorRouter.post('/bookings/:id/no-show', async (req: Request, res: Response) => {
  try {
    const { client_id, no_show } = (req.body ?? {}) as { client_id?: string; no_show?: boolean }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const { data: booking } = await db.from('calendar_bookings')
      .select('id, status').eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (!booking) { res.status(404).json({ success: false, error: 'Booking not found' }); return }
    const mark = no_show !== false // default true
    const { error } = await db.from('calendar_bookings').update({
      status: mark ? 'no_show' : 'confirmed',
      no_show_at: mark ? new Date().toISOString() : null,
      no_show_by: mark ? operatorEmail(req) : null,
    }).eq('id', req.params.id).eq('client_id', client.id)
    if (error) throw error
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'booking_no_show',
      subjectType: 'booking', subjectId: req.params.id, detail: { no_show: mark, money_untouched: true },
    })
    res.json({ success: true, no_show: mark })
  } catch (err) { console.error('[operator/no-show]', err); res.status(500).json({ success: false, error: 'Failed to update booking' }) }
})

// ── #499m REBOOK — a goodwill retry after a no-show (NO NEW CHARGE, MAX 2) ───────────
// Founder rule (24 Jul): a no-show gets up to TWO rebooks; after that the $3 is kept and no
// more rebooks are offered. The $3 was already captured at booking and is NEVER refunded —
// this endpoint moves NO money. It records the retry: increments rebook_count, clears the
// no-show flag, and (if the operator supplies the newly-agreed time) reschedules OUR booking
// record. It does NOT re-invite via Google (gcal has no patch); the operator sends the new
// invite out-of-band — reflected honestly in the UI. The 3rd no-show has no rebook button.
operatorRouter.post('/bookings/:id/rebook', async (req: Request, res: Response) => {
  try {
    const { client_id, new_start } = (req.body ?? {}) as { client_id?: string; new_start?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const { data: booking } = await db.from('calendar_bookings')
      .select('id, start_time, end_time, rebook_count').eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (!booking) { res.status(404).json({ success: false, error: 'Booking not found' }); return }
    const used = (booking.rebook_count as number | null) ?? 0
    if (used >= 2) { res.status(409).json({ success: false, error: 'Max 2 rebooks reached — the $3 is kept and no further rebook is offered.' }); return }

    // Optional reschedule: if the operator passes the newly-agreed time, move OUR record and
    // preserve the meeting's duration; otherwise just count the rebook and clear the no-show.
    const update: Record<string, unknown> = {
      rebook_count: used + 1, status: 'confirmed', no_show_at: null, no_show_by: null,
    }
    if (typeof new_start === 'string' && new_start) {
      const start = new Date(new_start)
      if (isNaN(start.getTime())) { res.status(400).json({ success: false, error: 'Invalid new_start time' }); return }
      const oldStart = booking.start_time ? new Date(booking.start_time as string).getTime() : NaN
      const oldEnd = booking.end_time ? new Date(booking.end_time as string).getTime() : NaN
      const durMs = (!isNaN(oldStart) && !isNaN(oldEnd) && oldEnd > oldStart) ? oldEnd - oldStart : 30 * 60 * 1000
      update.start_time = start.toISOString()
      update.end_time = new Date(start.getTime() + durMs).toISOString()
    }
    const { error } = await db.from('calendar_bookings').update(update).eq('id', req.params.id).eq('client_id', client.id)
    if (error) throw error
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'booking_rebook',
      subjectType: 'booking', subjectId: req.params.id,
      detail: { rebook_count: used + 1, rescheduled: !!(new_start), no_new_charge: true },
    })
    res.json({ success: true, rebook_count: used + 1, rebooks_left: 2 - (used + 1) })
  } catch (err) { console.error('[operator/rebook]', err); res.status(500).json({ success: false, error: 'Failed to rebook' }) }
})

// ── #498b SOURCE PREVIEW — the pool-aware DRY RUN behind the one-click confirm ───────
// Answers "if I source N leads for this client, what does it cost US?" — WITHOUT spending a
// cent. Mirrors the pool-first candidate match (lead_pool, OR-generous, minus what the client
// already owns) so the operator sees the split BEFORE confirming: pool serves at $0, only the
// remainder hits PDL (~$0.28/record) and only within the client's pre-funded allowance. It
// NEVER calls try_spend_sourcing and NEVER inserts — pool_free is an estimate (upper bound),
// so pdl_needed / cost is a conservative floor. The real fence still governs the actual run.
const PDL_COST_PER_RECORD = 0.28
operatorRouter.get('/source-preview', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(req.query.client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const cid = client.id
    const want = Math.max(1, Math.min(200, parseInt(String(req.query.count ?? '20'), 10) || 20))

    // Client run-cap + allowance (the real spend fence reads the same allowance).
    const { data: cs } = await db.from('clients').select('leads_per_run, sourcing_allowance, is_demo').eq('id', cid).maybeSingle()
    const leadsPerRun = (cs?.leads_per_run as number | null) ?? 20
    const allowance = (cs?.sourcing_allowance as number | null) ?? 0
    const isDemo = cs?.is_demo === true
    const count = Math.min(want, leadsPerRun)

    // Active ICP — FIGSY only sources against the active targeting.
    const { data: icp } = await db.from('icps')
      .select('id, name, job_titles, industries, geographies, seniority_levels')
      .eq('client_id', cid).eq('is_active', true).maybeSingle()
    if (!icp) { res.json({ success: true, data: { count, pool_free: 0, pdl_needed: 0, pdl_cost_est: 0, allowance_left: allowance, leads_per_run: leadsPerRun, capped: want > leadsPerRun, is_demo: isDemo, no_active_icp: true } }); return }

    // Mirror servePoolLeads' OR-generous candidate query (read-only, no insert).
    const clean = (v: string) => v.replace(/[,()*%]/g, ' ').trim()
    const geos = ((icp.geographies as string[] | null) ?? []).map(clean).filter(Boolean)
    const roleOr = [
      ...((icp.job_titles as string[] | null) ?? []).map(clean).filter(Boolean).map(t => `title.ilike.*${t}*`),
      ...((icp.industries as string[] | null) ?? []).map(clean).filter(Boolean).map(i => `industry.ilike.*${i}*`),
      ...((icp.seniority_levels as string[] | null) ?? []).map(clean).filter(Boolean).map(s => `seniority.ilike.*${s}*`),
    ]
    let q = db.from('lead_pool').select('email_norm')
    if (geos.length) q = q.or(geos.map(g => `country.ilike.*${g}*`).join(','))
    if (roleOr.length) q = q.or(roleOr.join(','))
    const { data: candidates } = await q.limit(Math.max(count * 5, 50))
    const candEmails = ((candidates ?? []) as { email_norm: string | null }[]).map(c => c.email_norm).filter((e): e is string => !!e)

    // Subtract what the client already owns (the dominant real filter). Bounded to this client.
    let poolFree = 0
    if (candEmails.length > 0) {
      // (audit fix) Mirror the REAL pool serve (icps.ts servePoolLeads): a candidate is only
      // pool-eligible if the client doesn't already own it AND it's not opted-out AND not on the
      // do-not-contact suppression floor. Subtracting only owned emails over-stated pool_free and
      // under-stated the PDL cost the operator confirms — the opposite of a conservative floor.
      const { isSuppressed } = await import('../lib/suppression')
      const { data: ownedRows } = await db.from('leads').select('email').eq('client_id', cid).not('email', 'is', null)
      const owned = new Set(((ownedRows ?? []) as { email: string | null }[]).map(r => (r.email ?? '').trim().toLowerCase()).filter(Boolean))
      const { data: blockedRows } = await db.from('opt_out_blocklist').select('email').is('opted_back_in_at', null).in('email', candEmails)
      const blocked = new Set(((blockedRows ?? []) as { email: string | null }[]).map(r => (r.email ?? '').trim().toLowerCase()).filter(Boolean))
      const freshPool = candEmails.filter(e => {
        const norm = e.trim().toLowerCase()
        return !owned.has(norm) && !blocked.has(norm) && !isSuppressed({ email: norm })
      })
      poolFree = Math.min(freshPool.length, count)
    }
    const pdlNeeded = isDemo ? 0 : Math.max(0, count - poolFree) // demo never hits PDL
    res.json({
      success: true,
      data: {
        count, pool_free: poolFree, pdl_needed: pdlNeeded,
        pdl_cost_est: Math.round(pdlNeeded * PDL_COST_PER_RECORD * 100) / 100,
        allowance_left: allowance, leads_per_run: leadsPerRun,
        capped: want > leadsPerRun, is_demo: isDemo, icp_name: icp.name ?? null,
      },
    })
  } catch (err) { console.error('[operator/source-preview]', err); res.status(500).json({ success: false, error: 'Failed to preview sourcing' }) }
})

// ── #498b SOURCE — one-click sourcing run, GATED BY EXPLICIT CONFIRM ─────────────────
// Only fires with { confirm: true } (the operator saw the pool/PDL split first). Runs the
// SAME fenced, pool-first path the client-side ICP runs use (runIcpJob → servePoolLeads →
// try_spend_sourcing for the remainder), so every existing budget guard — pool-first, daily
// cap, monthly PDL ceiling, per-client allowance — still applies. No guard is bypassed; this
// only saves the operator a trip into the engine. Spends OUR PDL budget, never client credits.
operatorRouter.post('/source', async (req: Request, res: Response) => {
  try {
    const { client_id, count, confirm } = (req.body ?? {}) as { client_id?: string; count?: number; confirm?: boolean }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    if (confirm !== true) { res.status(400).json({ success: false, error: 'Sourcing spends our PDL budget — confirm required' }); return }
    const cid = client.id
    const want = Math.max(1, Math.min(200, typeof count === 'number' ? count : 20))

    const { data: icp } = await db.from('icps').select('id, name').eq('client_id', cid).eq('is_active', true).maybeSingle()
    if (!icp) { res.status(400).json({ success: false, error: 'No active ICP — set the client\'s targeting before sourcing.' }); return }

    // runIcpJob wants a userId (unused in its body, but pass the client's owner for attribution).
    const { data: owner } = await db.from('clients').select('user_id').eq('id', cid).maybeSingle()
    const userId = (owner?.user_id as string | null) || 'operator'

    const { runIcpJob } = await import('./icps')
    const result = await runIcpJob(icp.id as string, cid, userId, want)

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: cid, action: 'source_run',
      subjectType: 'icp', subjectId: icp.id as string,
      detail: { requested: want, inserted: result.inserted, skipped: result.skipped, note: result.relaxed },
    })
    res.json({ success: true, requested: want, inserted: result.inserted, skipped: result.skipped, note: result.relaxed })
  } catch (err) { console.error('[operator/source]', err); res.status(500).json({ success: false, error: 'Failed to source' }) }
})

// ── #511 NEXUS · SIGNALS (read) — this client's private learning brain, surfaced ───────
// Returns the client's Nexus profile (what's converting: winning angle, best subjects, top
// persona, reply/meeting rates, objection patterns) with honest confidence. Compute-on-read
// if the stored profile is stale/missing (the nightly cron keeps it warm). Fenced by
// client_id — a client's brain is computed only from its own outcomes, never shared.
operatorRouter.get('/nexus', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(req.query.client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const { getNexusProfile } = await import('../lib/nexus')
    const { nexusTuneGate, nexusGlobalKill } = await import('../lib/nexus-guard')
    const profile = await getNexusProfile(client.id)
    // #511g2/g3 — the tune gate state (off/learning/ready) so the panel can show whether the
    // brain is allowed to auto-tune. Default-deny: reads the per-client kill-switch flag.
    const { data: flag } = await db.from('clients').select('nexus_autotune_enabled').eq('id', client.id).maybeSingle()
    const gate = nexusTuneGate(profile, flag?.nexus_autotune_enabled === true, nexusGlobalKill())
    res.json({ success: true, client: { id: client.id, company_name: client.company_name }, data: profile, tune: { ...gate, enabled: flag?.nexus_autotune_enabled === true } })
  } catch (err) { console.error('[operator/nexus]', err); res.status(500).json({ success: false, error: 'Failed to load Nexus' }) }
})

// ── #511g3 NEXUS AUTO-TUNE KILL-SWITCH — enable/disable per client (founder gate) ──────
// Auto-tune is OFF by default for every client. This flips the per-client flag; the Phase-2
// write-back path consults `nexusTuneGate` (this flag + the confidence gate + the global
// kill) before ever changing a client's sequences or sourcing. Audited. No money moves here.
operatorRouter.post('/nexus/autotune', async (req: Request, res: Response) => {
  try {
    const { client_id, enabled } = (req.body ?? {}) as { client_id?: string; enabled?: boolean }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const on = enabled === true
    const { error } = await db.from('clients').update({ nexus_autotune_enabled: on }).eq('id', client.id)
    if (error) throw error
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'nexus_autotune_toggle',
      subjectType: 'client', subjectId: client.id, detail: { enabled: on },
    })
    res.json({ success: true, enabled: on })
  } catch (err) { console.error('[operator/nexus/autotune]', err); res.status(500).json({ success: false, error: 'Failed to update auto-tune' }) }
})

// ── #517 UNIFIED OPERATING RECORD — one lead's whole story, assembled from the sources ──
// The single place an operator sees everything that happened to a lead: every send/reply/
// booking (outcome_events), every operator action (operator_audit_log), every money move
// (credit_transactions: hold/capture/release), plus bookings + replies — merged into ONE
// chronological timeline with a money summary. Pure READ over existing tables; no new
// storage, no fabrication. Scoped to the lead's own client so cross-client data can't leak.
operatorRouter.get('/record', async (req: Request, res: Response) => {
  try {
    const leadId = typeof req.query.lead_id === 'string' ? req.query.lead_id : ''
    if (!leadId) { res.status(400).json({ success: false, error: 'lead_id required' }); return }
    const { data: lead } = await db.from('leads')
      .select('id, client_id, first_name, last_name, company, job_title, email, status, score, revealed_at, created_at')
      .eq('id', leadId).maybeSingle()
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }
    const cid = lead.client_id as string
    const { data: client } = await db.from('clients').select('company_name').eq('id', cid).maybeSingle()

    // Pull each source (bounded), then merge. All scoped to this lead (+ client for money).
    const [events, audit, ledger, bookings, replies] = await Promise.all([
      db.from('outcome_events').select('event_type, channel, payload, occurred_at').eq('lead_id', leadId).order('occurred_at', { ascending: true }).limit(200),
      db.from('operator_audit_log').select('operator_email, action, subject_type, subject_id, detail, created_at').eq('client_id', cid).eq('subject_id', leadId).order('created_at', { ascending: true }).limit(200),
      db.from('credit_transactions').select('amount, type, note, reference, created_at').eq('client_id', cid).or(`reference.eq.hold:${leadId},reference.eq.release:${leadId}`).order('created_at', { ascending: true }).limit(100),
      db.from('calendar_bookings').select('id, start_time, status, no_show_at, rebook_count, created_at').eq('lead_id', leadId).eq('client_id', cid).order('created_at', { ascending: true }).limit(50),
      db.from('figsy_replies').select('classification, from_name, qualified_at, received_at').eq('lead_id', leadId).order('received_at', { ascending: true }).limit(100),
    ])

    type Entry = { at: string | null; kind: string; label: string; detail?: string | null }
    const timeline: Entry[] = []
    for (const e of (events.data ?? []) as Record<string, unknown>[]) {
      const p = (e.payload ?? {}) as Record<string, unknown>
      timeline.push({ at: e.occurred_at as string, kind: `event:${e.event_type}`, label: String(e.event_type), detail: (p.classification as string) || (p.subject as string) || (p.snippet as string) || (e.channel as string) || null })
    }
    for (const a of (audit.data ?? []) as Record<string, unknown>[]) {
      timeline.push({ at: a.created_at as string, kind: `operator:${a.action}`, label: String(a.action).replace(/_/g, ' '), detail: (a.operator_email as string) ?? null })
    }
    for (const t of (ledger.data ?? []) as Record<string, unknown>[]) {
      timeline.push({ at: t.created_at as string, kind: `money:${t.type}`, label: `${t.type} ${(t.amount as number) > 0 ? '+' : ''}${t.amount} work credit`, detail: (t.note as string) ?? null })
    }
    for (const b of (bookings.data ?? []) as Record<string, unknown>[]) {
      timeline.push({ at: (b.created_at as string) || (b.start_time as string), kind: `booking:${b.status}`, label: `booking ${b.status}${(b.rebook_count as number) ? ` · ${b.rebook_count} rebook(s)` : ''}`, detail: b.start_time ? new Date(b.start_time as string).toISOString() : null })
    }
    timeline.sort((x, y) => new Date(x.at ?? 0).getTime() - new Date(y.at ?? 0).getTime())

    // ONE WALLET — a lead is charged a flat $4 once at approve (final). Money state is
    // simply charged / not charged, read from the per-lead wallet_charge ledger row.
    const { data: chargeRow } = await db.from('credit_transactions')
      .select('id').eq('client_id', cid).eq('reference', `lead:${leadId}`).eq('type', 'wallet_charge').limit(1).maybeSingle()
    const isCharged = !!chargeRow
    const money = {
      charged: isCharged,
      state:   isCharged ? 'Charged $4' : 'Not charged',
    }

    res.json({
      success: true,
      client: { id: cid, company_name: client?.company_name ?? null },
      lead: {
        id: lead.id, name: [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || null,
        company: lead.company, job_title: lead.job_title, status: lead.status, score: lead.score,
        revealed: !!lead.revealed_at,
      },
      money,
      replies: (replies.data ?? []).map((r: Record<string, unknown>) => ({ classification: r.classification, qualified: !!r.qualified_at, at: r.received_at })),
      timeline,
    })
  } catch (err) { console.error('[operator/record]', err); res.status(500).json({ success: false, error: 'Failed to load record' }) }
})
