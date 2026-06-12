// #88 Company / Per-Rep Engine — backend.
// Mount in index.ts: app.use('/company', companyRouter)
//
// The owner's command centre + per-seat autonomy/budget + the request/approve
// credit loop + the shared winning-play library. Builds on client_members
// (seats). Every route is scoped to the caller's client and role-checked.
// Gated in the portal behind v2Enabled('company') — safe until merged + flipped.

import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const companyRouter = Router()
companyRouter.use(requireAuth)

// Resolve the caller's client + their seat role. Owners (clients.user_id) and
// owner/admin members manage the company; everyone else is read-limited.
async function resolveContext(userId: string): Promise<
  | { clientId: string; role: string; memberId: string | null }
  | null
> {
  const { data: ownerClient } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  if (ownerClient?.id) {
    const { data: m } = await db.from('client_members')
      .select('id, role').eq('client_id', ownerClient.id).eq('user_id', userId).maybeSingle()
    return { clientId: ownerClient.id, role: m?.role ?? 'owner', memberId: m?.id ?? null }
  }
  const { data: member } = await db.from('client_members')
    .select('id, client_id, role').eq('user_id', userId).maybeSingle()
  if (member?.client_id) return { clientId: member.client_id, role: member.role, memberId: member.id }
  return null
}

const canManage = (role: string) => role === 'owner' || role === 'admin'

// GET /company/overview — the owner's command centre (item 36 / Teams Hub).
// Seats with their budget/autonomy/status + pending credit requests + the
// company credit pool. Per-rep outreach stats become real once per-rep lead
// ownership lands (item 38); until then seat-level activity is shown.
companyRouter.get('/overview', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }

    const [{ data: company }, { data: seats }, { data: requests }] = await Promise.all([
      db.from('clients').select('id, company_name, credit_balance').eq('id', ctx.clientId).maybeSingle(),
      db.from('client_members')
        .select('id, email, role, autonomy, credit_budget, credits_used, seat_active, accepted_at, invited_at')
        .eq('client_id', ctx.clientId).order('invited_at', { ascending: true }),
      db.from('seat_credit_requests')
        .select('id, member_id, amount, reason, status, created_at')
        .eq('client_id', ctx.clientId).eq('status', 'pending').order('created_at', { ascending: false }),
    ])

    const seatRows = seats ?? []
    const totals = {
      seats:          seatRows.length,
      active_seats:   seatRows.filter((s: any) => s.seat_active && s.accepted_at).length,
      allocated:      seatRows.reduce((n: number, s: any) => n + (s.credit_budget ?? 0), 0),
      used:           seatRows.reduce((n: number, s: any) => n + (s.credits_used ?? 0), 0),
      company_pool:   (company as { credit_balance?: number } | null)?.credit_balance ?? 0,
      pending_requests: (requests ?? []).length,
    }

    res.json({
      success: true,
      data: {
        company: { id: ctx.clientId, name: (company as { company_name?: string } | null)?.company_name ?? '' },
        role: ctx.role,
        can_manage: canManage(ctx.role),
        seats: seatRows,
        pending_requests: requests ?? [],
        totals,
      },
    })
  } catch (err) {
    console.error('[company/overview]', err)
    res.status(500).json({ success: false, error: 'Failed to load company' })
  }
})

// PATCH /company/seats/:id — set a seat's autonomy + budget (items 35 + 37).
companyRouter.patch('/seats/:id', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or an admin can manage seats' }); return }

    const body = z.object({
      autonomy:      z.enum(['auto', 'copilot', 'off']).optional(),
      credit_budget: z.number().int().min(0).max(1_000_000).optional(),
      seat_active:   z.boolean().optional(),
    }).parse(req.body)

    // Ensure the seat belongs to this company before updating.
    const { data: seat } = await db.from('client_members')
      .select('id').eq('id', req.params.id).eq('client_id', ctx.clientId).maybeSingle()
    if (!seat) { res.status(404).json({ success: false, error: 'Seat not found' }); return }

    const { error } = await db.from('client_members').update(body).eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/seats PATCH]', err)
    res.status(500).json({ success: false, error: 'Failed to update seat' })
  }
})

// POST /company/credit-requests — a rep asks the owner for more credits (2d).
companyRouter.post('/credit-requests', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx || !ctx.memberId) { res.status(404).json({ success: false, error: 'No seat found' }); return }
    const { amount, reason } = z.object({
      amount: z.number().int().positive().max(1_000_000),
      reason: z.string().max(500).optional(),
    }).parse(req.body)

    const { error } = await db.from('seat_credit_requests')
      .insert({ client_id: ctx.clientId, member_id: ctx.memberId, amount, reason: reason ?? null })
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/credit-requests POST]', err)
    res.status(500).json({ success: false, error: 'Failed to submit request' })
  }
})

// POST /company/credit-requests/:id/decide — owner approves/denies (2d).
// On approve, the requested amount is added to the seat's budget.
companyRouter.post('/credit-requests/:id/decide', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or an admin can decide requests' }); return }

    const { decision } = z.object({ decision: z.enum(['approved', 'denied']) }).parse(req.body)

    const { data: reqRow } = await db.from('seat_credit_requests')
      .select('id, member_id, amount, status').eq('id', req.params.id).eq('client_id', ctx.clientId).maybeSingle()
    if (!reqRow) { res.status(404).json({ success: false, error: 'Request not found' }); return }
    if ((reqRow as any).status !== 'pending') { res.status(409).json({ success: false, error: 'Request already decided' }); return }

    await db.from('seat_credit_requests')
      .update({ status: decision, decided_by: req.userId!, decided_at: new Date().toISOString() })
      .eq('id', req.params.id)

    if (decision === 'approved') {
      // Top up the seat's budget by the requested amount.
      const { data: seat } = await db.from('client_members')
        .select('credit_budget').eq('id', (reqRow as any).member_id).maybeSingle()
      const next = ((seat as { credit_budget?: number } | null)?.credit_budget ?? 0) + (reqRow as any).amount
      await db.from('client_members').update({ credit_budget: next }).eq('id', (reqRow as any).member_id)
    }

    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/credit-requests decide]', err)
    res.status(500).json({ success: false, error: 'Failed to decide request' })
  }
})

// GET /company/winning-plays + POST (create) + POST /:id/push (item 39).
companyRouter.get('/winning-plays', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    const { data } = await db.from('winning_plays')
      .select('id, name, note, reply_rate, pushed_to_all, created_at')
      .eq('client_id', ctx.clientId).order('created_at', { ascending: false }).limit(50)
    res.json({ success: true, data: data ?? [] })
  } catch (err) {
    console.error('[company/winning-plays GET]', err)
    res.status(500).json({ success: false, error: 'Failed to load plays' })
  }
})

companyRouter.post('/winning-plays', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or an admin can save plays' }); return }
    const { name, note, sequence } = z.object({
      name:     z.string().min(1).max(120),
      note:     z.string().max(500).optional(),
      sequence: z.record(z.any()).optional(),
    }).parse(req.body)
    const { error } = await db.from('winning_plays')
      .insert({ client_id: ctx.clientId, name, note: note ?? null, sequence: sequence ?? {}, created_by: req.userId! })
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/winning-plays POST]', err)
    res.status(500).json({ success: false, error: 'Failed to save play' })
  }
})

companyRouter.post('/winning-plays/:id/push', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or an admin can push plays' }); return }
    const { error } = await db.from('winning_plays')
      .update({ pushed_to_all: true }).eq('id', req.params.id).eq('client_id', ctx.clientId)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('[company/winning-plays push]', err)
    res.status(500).json({ success: false, error: 'Failed to push play' })
  }
})
