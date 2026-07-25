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
      db.from('figsy_campaigns')
        .select('id, name, status, leads_enrolled, emails_sent, replies_total, replies_interested, created_at')
        .eq('client_id', cid).order('created_at', { ascending: false }).limit(20),
      db.from('figsy_sequences').select('id, name, steps, created_at, updated_at')
        .eq('client_id', cid).order('created_at', { ascending: false }).limit(20),
      db.from('figsy_replies')
        .select('id, lead_id, from_name, from_email, classification, qualified_at, meeting_booked_at, received_at')
        .eq('client_id', cid).order('received_at', { ascending: false }).limit(40),
    ])

    res.json({
      success: true,
      data: {
        client:    { id: cid, company_name: client.company_name ?? null },
        icps:      icps.data ?? [],
        campaigns: campaigns.data ?? [],
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
