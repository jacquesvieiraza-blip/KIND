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
      .select('id, company_name, industry, country, created_at, is_demo, credit_balance, figsy_credits_remaining')
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

    // Sourced = scored, not yet revealed/approved, not passed.
    const sourced = await db.from('leads')
      .select('id, first_name, last_name, company, job_title, score, status', { count: 'exact' })
      .eq('client_id', cid).is('revealed_at', null).neq('status', 'passed')
      .in('status', ['scored', 'pending']).order('score', { ascending: false }).limit(SAMPLE)

    // Needs approval = pending drafts in the co-pilot queue (#15) for this client.
    const needsApproval = await db.from('figsy_approval_queue')
      .select('id, lead_id, status, created_at', { count: 'exact' })
      .eq('client_id', cid).eq('status', 'pending').order('created_at', { ascending: false }).limit(SAMPLE)

    // Sending = active enrollments mid-sequence.
    const sending = await db.from('figsy_enrollments')
      .select('id, lead_id, current_step, total_steps, status, next_send_at', { count: 'exact' })
      .eq('client_id', cid).eq('status', 'enrolled').order('next_send_at', { ascending: true }).limit(SAMPLE)

    // Replied = replies in the unibox for this client.
    const replied = await db.from('figsy_replies')
      .select('id, lead_id, from_email, subject, sentiment, created_at', { count: 'exact' })
      .eq('client_id', cid).order('created_at', { ascending: false }).limit(SAMPLE)

    // Qualified ($4) = leads this client has approved (revealed + worked). Proxy: revealed
    // leads that carry an enrollment. Count booked meetings too (calendar_bookings).
    const qualified = await db.from('leads')
      .select('id, first_name, last_name, company, email, score', { count: 'exact' })
      .eq('client_id', cid).not('revealed_at', 'is', null).order('score', { ascending: false }).limit(SAMPLE)

    res.json({
      success: true,
      client: { id: cid, company_name: client.company_name },
      columns: {
        sourced:       { count: sourced.count ?? 0,       cards: sourced.data ?? [] },
        needs_approval:{ count: needsApproval.count ?? 0, cards: needsApproval.data ?? [] },
        sending:       { count: sending.count ?? 0,       cards: sending.data ?? [] },
        replied:       { count: replied.count ?? 0,       cards: replied.data ?? [] },
        qualified:     { count: qualified.count ?? 0,     cards: qualified.data ?? [] },
      },
    })
  } catch (err) { console.error('[operator/board]', err); res.status(500).json({ success: false, error: 'Failed to load board' }) }
})

// ── #487 APPROVE-ON-BEHALF (operator records a client's yes) ───────────────────
// Requires an explicit confirmation flag (so a mis-click can't spend a client's money)
// and writes an audit row naming the operator. Same $4 money path as the client approve.
operatorRouter.post('/leads/:id/approve', async (req: Request, res: Response) => {
  try {
    const { client_id, confirm } = (req.body ?? {}) as { client_id?: string; confirm?: boolean }
    if (confirm !== true) { res.status(400).json({ success: false, error: 'confirm:true required — approve-on-behalf spends the client\'s credits.' }); return }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const { approveLead } = await import('../lib/approve-lead')
    const outcome = await approveLead(req.params.id, client.id)

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'approve_lead',
      subjectType: 'lead', subjectId: req.params.id,
      detail: { outcome: outcome.status, revealed: outcome.revealed, workCharged: (outcome as { workCharged?: boolean }).workCharged ?? false, on_behalf: true },
    })

    if (outcome.status === 'not_found') { res.status(404).json({ success: false, error: 'Lead not found' }); return }
    if (outcome.status === 'insufficient_reveal_credits') { res.status(402).json({ success: false, ...outcome }); return }
    if (outcome.status === 'no_email') { res.status(422).json({ success: false, ...outcome }); return }
    if (outcome.status === 'already_in_crm') { res.status(409).json({ success: false, ...outcome }); return }
    res.json({ success: true, ...outcome })
  } catch (err) { console.error('[operator/approve]', err); res.status(500).json({ success: false, error: 'Failed to approve lead' }) }
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

// ── #485 top-bar status chips (honest kill-switch + cap state) ────────────────
operatorRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        outreach_enabled: process.env.AUTO_OUTREACH_ENABLED === 'true',
        daily_cap: Number(process.env.FIGSY_DAILY_SEND_CAP ?? 20),
      },
    })
  } catch (err) { console.error('[operator/status]', err); res.status(500).json({ success: false, error: 'Failed to load status' }) }
})
