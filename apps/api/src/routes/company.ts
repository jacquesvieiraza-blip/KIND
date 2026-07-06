// #88 Company Engine — backend (per-rep workspaces under an owner-funded company).
//
// Model: each rep is their own `clients` workspace (own leads/campaigns/FIGSY),
// linked to a `companies` row by company_id. The owner funds the company credit
// pool and allocates a per-seat budget to each rep; reps request more, the owner
// approves (credits move pool → rep balance). Reps see only their own data; the
// owner/managers see the whole company via this API (service role).
//
// Mount: app.use('/company', companyRouter). Gated in the portal behind
// v2Enabled('company') — safe until merged + flipped.

import { Router } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { sendSeatInviteEmail } from '../lib/email'

export const companyRouter = Router()
companyRouter.use(requireAuth)

const canManage = (role: string) => role === 'owner' || role === 'manager'

interface Ctx { companyId: string; clientId: string | null; role: string; isOwner: boolean }

// Resolve the caller → their company + role. Auto-provisions a company for a
// solo owner the first time they open the Command Centre, so onboarding is
// seamless (their existing client becomes the company's owner seat).
// Resolve the caller → their company + role. Does NOT auto-create a company —
// a solo client must explicitly opt in via POST /company/provision. This keeps
// existing production accounts untouched when they merely open the page.
async function resolveContext(userId: string): Promise<Ctx | null> {
  const { data: client } = await db.from('clients')
    .select('id, company_id, seat_role')
    .eq('user_id', userId).maybeSingle()
  if (!client?.company_id) return null
  return { companyId: client.company_id, clientId: client.id, role: client.seat_role ?? 'rep', isOwner: client.seat_role === 'owner' }
}

// Does this user have a client account at all (eligible to start a company)?
async function getClientForUser(userId: string): Promise<{ id: string; company_id: string | null; company_name: string | null } | null> {
  const { data } = await db.from('clients')
    .select('id, company_id, company_name').eq('user_id', userId).maybeSingle()
  return (data as any) ?? null
}

// Batch per-rep outreach stats (one query per source, aggregated in JS).
// #110 — `deduped` counts this rep's leads that FIGSY flagged as already-in-CRM
// (leads.crm_existing). These are real, written by the live dedup path in
// lib/figsy.ts; we never re-spend credits re-working them. Read-only here.
async function repStats(repIds: string[]): Promise<Record<string, { contacted: number; replies: number; booked: number; leads: number; deduped: number }>> {
  const stats: Record<string, { contacted: number; replies: number; booked: number; leads: number; deduped: number }> = {}
  for (const id of repIds) stats[id] = { contacted: 0, replies: 0, booked: 0, leads: 0, deduped: 0 }
  if (repIds.length === 0) return stats

  const [leadsRes, repliesRes, campsRes] = await Promise.all([
    db.from('leads').select('client_id, crm_existing').in('client_id', repIds),
    db.from('figsy_replies').select('client_id, meeting_booked_at').in('client_id', repIds),
    db.from('figsy_campaigns').select('id, client_id').in('client_id', repIds),
  ])

  for (const r of (leadsRes.data ?? []) as any[]) {
    if (!stats[r.client_id]) continue
    stats[r.client_id].leads++
    if (r.crm_existing) stats[r.client_id].deduped++
  }
  for (const r of (repliesRes.data ?? []) as any[]) {
    if (!stats[r.client_id]) continue
    stats[r.client_id].replies++
    if (r.meeting_booked_at) stats[r.client_id].booked++
  }

  // Sent (contacted) is keyed by campaign → map campaign back to its rep.
  const campToRep: Record<string, string> = {}
  const campIds: string[] = []
  for (const c of (campsRes.data ?? []) as any[]) { campToRep[c.id] = c.client_id; campIds.push(c.id) }
  if (campIds.length) {
    const { data: sent } = await db.from('figsy_sent_emails').select('campaign_id').in('campaign_id', campIds)
    for (const s of (sent ?? []) as any[]) {
      const rep = campToRep[s.campaign_id]
      if (rep && stats[rep]) stats[rep].contacted++
    }
  }
  return stats
}

// ── GET /company/overview — the owner's command centre ──────────────────────
companyRouter.get('/overview', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) {
      // No company yet — tell the page whether this user *could* start one,
      // so it can show a "Set up your team" intro instead of an error.
      const client = await getClientForUser(req.userId!)
      res.json({ success: true, data: { has_company: false, can_create: !!client } })
      return
    }

    const [{ data: company }, { data: seats }, { data: requests }] = await Promise.all([
      db.from('companies').select('id, name, credit_pool, seat_cap').eq('id', ctx.companyId).maybeSingle(),
      db.from('clients')
        .select('id, company_name, invited_email, seat_role, autonomy, seat_budget, seat_active, seat_accepted_at, credit_balance, enabled_agents, crm_dedup_enabled, calendar_booking_enabled, google_calendar_email, booking_url')
        .eq('company_id', ctx.companyId).order('seat_role', { ascending: true }),
      db.from('seat_credit_requests')
        .select('id, rep_client_id, amount, reason, status, created_at')
        .eq('company_id', ctx.companyId).eq('status', 'pending').order('created_at', { ascending: false }),
    ])

    const seatRows = (seats ?? []) as any[]
    const reps = seatRows.filter(s => s.seat_role === 'rep')
    const stats = await repStats(reps.map(r => r.id))

    const seatsOut = seatRows.map(s => {
      const st = stats[s.id] ?? { contacted: 0, replies: 0, booked: 0, leads: 0, deduped: 0 }
      const budget = s.seat_budget ?? 0
      const used = Math.max(0, budget - (s.credit_balance ?? 0))
      return {
        id: s.id,
        email: s.invited_email || s.company_name || '—',
        name: s.company_name || s.invited_email || '—',
        role: s.seat_role,
        autonomy: s.autonomy ?? 'auto',
        credit_budget: budget,
        credits_used: used,
        credit_balance: s.credit_balance ?? 0,
        seat_active: s.seat_active ?? true,
        accepted_at: s.seat_accepted_at ?? null,
        enabled_agents: s.enabled_agents ?? ['figsy'],
        // real per-rep outreach
        contacted: st.contacted, replies: st.replies, booked: st.booked, leads: st.leads,
        reply_pct: st.contacted > 0 ? Math.round((st.replies / st.contacted) * 1000) / 10 : 0,
        // #110 — per-rep lead ownership / routing + CRM dedup (read-only).
        // Every rep IS their own clients workspace, so their leads are already
        // owned by them (leads.client_id = this seat). `deduped` is the count
        // FIGSY's CRM-dedup flagged as already-known, and `dedup_enabled` is
        // whether this rep's FIGSY runs that read-only CRM check before enrolling.
        deduped: st.deduped,
        dedup_enabled: s.crm_dedup_enabled ?? false,
        // #111 — per-rep / multi-provider calendar (read-only). Each rep's seat
        // carries its own Google Calendar connection + booking link, so the
        // owner can see at a glance who is bookable. Google = native slots;
        // booking_url = any external provider (Calendly/Zoho/etc.).
        calendar_connected: s.calendar_booking_enabled ?? false,
        calendar_email: s.google_calendar_email ?? null,
        booking_url: s.booking_url ?? null,
      }
    })

    const repOut = seatsOut.filter(s => s.role === 'rep')
    const totals = {
      seats:            repOut.length,
      active_seats:     repOut.filter(s => s.seat_active && s.accepted_at).length,
      seat_cap:         (company as any)?.seat_cap ?? 25,
      allocated:        repOut.reduce((n, s) => n + s.credit_budget, 0),
      used:             repOut.reduce((n, s) => n + s.credits_used, 0),
      company_pool:     (company as any)?.credit_pool ?? 0,
      pending_requests: (requests ?? []).length,
      total_booked:     repOut.reduce((n, s) => n + s.booked, 0),
      total_contacted:  repOut.reduce((n, s) => n + s.contacted, 0),
      // #110 — company-wide leads owned across reps + total deduped (saved from
      // re-working). #111 — how many reps have a booking calendar connected.
      total_leads:        repOut.reduce((n, s) => n + s.leads, 0),
      total_deduped:      repOut.reduce((n, s) => n + s.deduped, 0),
      calendars_connected: repOut.filter(s => s.calendar_connected || s.booking_url).length,
    }

    res.json({
      success: true,
      data: {
        company: { id: ctx.companyId, name: (company as any)?.name ?? '' },
        role: ctx.role,
        can_manage: canManage(ctx.role),
        seats: seatsOut,
        pending_requests: requests ?? [],
        totals,
      },
    })
  } catch (err) {
    console.error('[company/overview]', err)
    res.status(500).json({ success: false, error: 'Failed to load company' })
  }
})

// ── GET /company/seats/:id/detail — owner read-only drill-down into a rep ─────
// #107 — from the Command Centre rep list, the owner clicks a rep and sees that
// rep's detail: their campaigns (with denormalised stats) + recent activity
// (sent emails + replies/meetings). READ-ONLY. Owner/manager-scoped: the seat
// must belong to the caller's company. Headline stats (contacted / reply % /
// booked / credits / leads) already come from /overview — this fills in the
// per-rep campaigns + activity that the list row can't show.
companyRouter.get('/seats/:id/detail', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or a manager can view a rep' }); return }

    // Seat must belong to this company (owner-scoped guard).
    const { data: seat } = await db.from('clients')
      .select('id, company_name, invited_email, seat_role')
      .eq('id', req.params.id).eq('company_id', ctx.companyId).maybeSingle()
    if (!seat) { res.status(404).json({ success: false, error: 'Seat not found' }); return }

    const repId = (seat as any).id

    // Campaigns (denormalised counters are already on the row — no extra reads).
    const { data: campaigns } = await db.from('figsy_campaigns')
      .select('id, name, status, leads_enrolled, emails_sent, replies_total, replies_interested, created_at')
      .eq('client_id', repId)
      .order('created_at', { ascending: false })
      .limit(50)
    const campIds = ((campaigns ?? []) as any[]).map(c => c.id)

    // Recent activity — same shape the rep's own FIGSY activity feed uses.
    const [sentRes, repliesRes] = await Promise.all([
      campIds.length
        ? db.from('figsy_sent_emails')
            .select('subject, step, sent_at, leads(first_name, last_name, company)')
            .in('campaign_id', campIds)
            .order('sent_at', { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] as any[] }),
      db.from('figsy_replies')
        .select('from_name, from_email, classification, meeting_booked_at, received_at')
        .eq('client_id', repId)
        .order('received_at', { ascending: false })
        .limit(30),
    ])

    type Event = { type: 'sent' | 'reply' | 'meeting'; title: string; subtitle: string; at: string; tone: 'neutral' | 'positive' | 'warn' }
    const events: Event[] = []
    for (const s of (sentRes.data ?? []) as any[]) {
      const lead = Array.isArray(s.leads) ? s.leads[0] : s.leads
      const who = lead ? `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || lead.company || 'a lead' : 'a lead'
      events.push({ type: 'sent', title: `FIGSY sent to ${who}`, subtitle: `Step ${s.step}${s.subject ? ` · ${s.subject}` : ''}`, at: s.sent_at, tone: 'neutral' })
    }
    for (const r of (repliesRes.data ?? []) as any[]) {
      const who = r.from_name || (r.from_email ? r.from_email.split('@')[0] : 'a lead')
      if (r.meeting_booked_at) events.push({ type: 'meeting', title: `Meeting booked with ${who}`, subtitle: 'FIGSY closed a booking', at: r.meeting_booked_at, tone: 'positive' })
      const hot = r.classification === 'hot' || r.classification === 'interested'
      events.push({ type: 'reply', title: `${hot ? '🔥 ' : ''}Reply from ${who}`, subtitle: r.classification ? `Classified: ${r.classification}` : 'New reply', at: r.received_at, tone: hot ? 'positive' : r.classification === 'opt_out' ? 'warn' : 'neutral' })
    }
    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

    res.json({
      success: true,
      data: {
        seat: { id: repId, role: (seat as any).seat_role },
        campaigns: (campaigns ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          leads_enrolled: c.leads_enrolled ?? 0,
          emails_sent: c.emails_sent ?? 0,
          replies_total: c.replies_total ?? 0,
          replies_interested: c.replies_interested ?? 0,
          created_at: c.created_at,
        })),
        activity: events.slice(0, 30),
      },
    })
  } catch (err) {
    console.error('[company/seats detail]', err)
    res.status(500).json({ success: false, error: 'Failed to load rep detail' })
  }
})

// ── POST /company/provision — explicitly turn this account into a company ────
// Opt-in only. The caller's existing client becomes the owner seat. No-op if
// they already belong to a company.
companyRouter.post('/provision', async (req: AuthRequest, res) => {
  try {
    const client = await getClientForUser(req.userId!)
    if (!client) { res.status(404).json({ success: false, error: 'No client account found' }); return }
    if (client.company_id) { res.json({ success: true, data: { company_id: client.company_id, already: true } }); return }

    const name = z.object({ name: z.string().min(1).max(200).optional() }).parse(req.body ?? {}).name
    const { data: company, error } = await db.from('companies')
      .insert({ owner_user_id: req.userId!, name: name || client.company_name || 'My Company' })
      .select('id').single()
    if (error || !company) throw error ?? new Error('insert failed')
    await db.from('clients').update({ company_id: company.id, seat_role: 'owner', seat_active: true, seat_accepted_at: new Date().toISOString() }).eq('id', client.id)
    res.json({ success: true, data: { company_id: company.id } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/provision]', err)
    res.status(500).json({ success: false, error: 'Failed to create company workspace' })
  }
})

// ── POST /company/seats — invite a rep (creates their workspace seat) ────────
companyRouter.post('/seats', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or a manager can add reps' }); return }

    const { email, budget } = z.object({
      email:  z.string().email(),
      budget: z.number().int().min(0).max(1_000_000).optional(),
    }).parse(req.body)

    // Seat-cap guard.
    const { count } = await db.from('clients').select('id', { count: 'exact', head: true })
      .eq('company_id', ctx.companyId).eq('seat_role', 'rep')
    const { data: company } = await db.from('companies').select('name, seat_cap, credit_pool').eq('id', ctx.companyId).maybeSingle()
    if ((count ?? 0) >= ((company as any)?.seat_cap ?? 25)) {
      res.status(409).json({ success: false, error: 'Seat cap reached — raise the cap to add more reps' }); return
    }

    const token = crypto.randomBytes(32).toString('hex')
    const startBudget = budget ?? 0
    const { error } = await db.from('clients').insert({
      company_id: ctx.companyId,
      company_name: email.split('@')[0],
      invited_email: email.toLowerCase(),
      invite_token: token,
      seat_role: 'rep',
      seat_active: true,
      seat_budget: startBudget,
      credit_balance: startBudget,   // pre-allocate their starting budget
      country: 'South Africa',
    })
    if (error) throw error

    // Move the starting budget out of the company pool.
    if (startBudget > 0) {
      await db.from('companies')
        .update({ credit_pool: Math.max(0, ((company as any)?.credit_pool ?? 0) - startBudget) })
        .eq('id', ctx.companyId)
    }

    // #106 — Deliver the invite email so the rep gets their accept link directly
    // (the link is still returned for copy-paste as a fallback). Best-effort: a
    // delivery failure must never break the invite, so we never throw here.
    try {
      const portalUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.PORTAL_URL || 'https://app.get-kind.com'
      const inviteUrl = `${portalUrl}/invite/accept?token=${token}`
      let inviterName: string | null = null
      if (ctx.clientId) {
        const { data: inviter } = await db.from('clients')
          .select('company_name').eq('id', ctx.clientId).maybeSingle()
        inviterName = (inviter as any)?.company_name ?? null
      }
      await sendSeatInviteEmail(email.toLowerCase(), inviteUrl, {
        companyName: (company as any)?.name ?? null,
        inviterName,
      })
    } catch (mailErr) {
      console.error('[company/seats POST] invite email failed (non-fatal):', mailErr)
    }

    res.json({ success: true, token })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/seats POST]', err)
    res.status(500).json({ success: false, error: 'Failed to add rep' })
  }
})

// ── PATCH /company/seats/:id — autonomy / active / budget ────────────────────
companyRouter.patch('/seats/:id', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or a manager can manage seats' }); return }

    const body = z.object({
      autonomy:       z.enum(['auto', 'copilot', 'off']).optional(),
      seat_active:    z.boolean().optional(),
      // #108 — owner edits a rep's per-seat credit budget directly. This sets the
      // seat_budget cap only; it does NOT move credits between the company pool
      // and the rep's balance. Allocation stays the job of /allocate + credit
      // requests, which remain the credit-pool authority. See PR note.
      seat_budget:    z.number().int().min(0).max(1_000_000).optional(),
      enabled_agents: z.array(z.enum(['figsy', 'milla', 'vida', 'denise'])).optional(),
      // #109 — owner sets a seat's role to manager (same manage powers as the
      // owner, via canManage) or back to rep. Owner-only; the owner seat itself
      // can never be re-roled. Uses the existing seat_role column — no migration.
      seat_role:      z.enum(['manager', 'rep']).optional(),
    }).parse(req.body)

    const { data: seat } = await db.from('clients')
      .select('id, seat_role, seat_active, credit_balance').eq('id', req.params.id).eq('company_id', ctx.companyId).maybeSingle()
    if (!seat) { res.status(404).json({ success: false, error: 'Seat not found' }); return }

    // #109 — Only the OWNER may change a seat's role (a manager runs reps but must
    // not promote/demote). The owner seat itself can never be re-roled.
    if (body.seat_role !== undefined) {
      if (!ctx.isOwner) { res.status(403).json({ success: false, error: 'Only the owner can change a seat role' }); return }
      if ((seat as any).seat_role === 'owner') { res.status(400).json({ success: false, error: 'The owner seat cannot be re-roled' }); return }
    }

    // FIGSY is always available on a seat — never let the owner remove it.
    if (body.enabled_agents) body.enabled_agents = Array.from(new Set(['figsy', ...body.enabled_agents]))

    const { error } = await db.from('clients').update(body).eq('id', req.params.id)
    if (error) throw error

    // #108b — deactivating a rep returns their remaining credits to the company
    // pool so funds aren't stranded on an inactive seat. Fires only on the active→
    // inactive transition, and is idempotent (a zero balance returns nothing).
    if (body.seat_active === false && (seat as any).seat_active !== false) {
      await returnRepCreditsToPool(ctx.companyId, req.params.id)
    }

    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/seats PATCH]', err)
    res.status(500).json({ success: false, error: 'Failed to update seat' })
  }
})

// ── POST /company/seats/:id/allocate — owner tops up a rep from the pool ──────
companyRouter.post('/seats/:id/allocate', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or a manager can allocate credits' }); return }

    const { amount } = z.object({ amount: z.number().int().positive().max(1_000_000) }).parse(req.body)
    const ok = await allocateToRep(ctx.companyId, req.params.id, amount)
    if (!ok) { res.status(400).json({ success: false, error: 'Not enough in the company pool, or seat not found' }); return }
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/seats allocate]', err)
    res.status(500).json({ success: false, error: 'Failed to allocate' })
  }
})

// Shared: move `amount` from the company pool → a rep's budget + balance.
async function allocateToRep(companyId: string, repClientId: string, amount: number): Promise<boolean> {
  const [{ data: company }, { data: rep }] = await Promise.all([
    db.from('companies').select('credit_pool').eq('id', companyId).maybeSingle(),
    db.from('clients').select('id, seat_budget, credit_balance').eq('id', repClientId).eq('company_id', companyId).maybeSingle(),
  ])
  if (!company || !rep) return false
  const pool = (company as any).credit_pool ?? 0
  if (pool < amount) return false
  await Promise.all([
    db.from('companies').update({ credit_pool: pool - amount }).eq('id', companyId),
    db.from('clients').update({
      seat_budget:    ((rep as any).seat_budget ?? 0) + amount,
      credit_balance: ((rep as any).credit_balance ?? 0) + amount,
    }).eq('id', repClientId),
  ])
  return true
}

// Shared (#108b): reverse of allocateToRep — move a rep's remaining balance back
// to the company pool and zero the seat. Returns the amount reclaimed. No pool RPC
// exists (credit_pool lives on companies), so this uses the same read-then-write
// the pool is managed with everywhere in this file.
async function returnRepCreditsToPool(companyId: string, repClientId: string): Promise<number> {
  const [{ data: company }, { data: rep }] = await Promise.all([
    db.from('companies').select('credit_pool').eq('id', companyId).maybeSingle(),
    db.from('clients').select('id, credit_balance').eq('id', repClientId).eq('company_id', companyId).maybeSingle(),
  ])
  if (!company || !rep) return 0
  const remaining = (rep as any).credit_balance ?? 0
  if (remaining <= 0) return 0
  const pool = (company as any).credit_pool ?? 0
  await Promise.all([
    db.from('companies').update({ credit_pool: pool + remaining }).eq('id', companyId),
    db.from('clients').update({ credit_balance: 0 }).eq('id', repClientId),
  ])
  return remaining
}

// ── POST /company/credit-requests — a rep asks the owner for more ────────────
companyRouter.post('/credit-requests', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx || !ctx.clientId) { res.status(404).json({ success: false, error: 'No seat found' }); return }
    const { amount, reason } = z.object({
      amount: z.number().int().positive().max(1_000_000),
      reason: z.string().max(500).optional(),
    }).parse(req.body)

    const { error } = await db.from('seat_credit_requests')
      .insert({ company_id: ctx.companyId, rep_client_id: ctx.clientId, amount, reason: reason ?? null })
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/credit-requests POST]', err)
    res.status(500).json({ success: false, error: 'Failed to submit request' })
  }
})

// ── POST /company/credit-requests/:id/decide — owner approves/denies ─────────
companyRouter.post('/credit-requests/:id/decide', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or a manager can decide requests' }); return }

    const { decision } = z.object({ decision: z.enum(['approved', 'denied']) }).parse(req.body)
    const { data: reqRow } = await db.from('seat_credit_requests')
      .select('id, rep_client_id, amount, status').eq('id', req.params.id).eq('company_id', ctx.companyId).maybeSingle()
    if (!reqRow) { res.status(404).json({ success: false, error: 'Request not found' }); return }
    if ((reqRow as any).status !== 'pending') { res.status(409).json({ success: false, error: 'Request already decided' }); return }

    if (decision === 'approved') {
      const ok = await allocateToRep(ctx.companyId, (reqRow as any).rep_client_id, (reqRow as any).amount)
      if (!ok) { res.status(400).json({ success: false, error: 'Not enough in the company pool to approve' }); return }
    }
    await db.from('seat_credit_requests')
      .update({ status: decision, decided_by: req.userId!, decided_at: new Date().toISOString() })
      .eq('id', req.params.id)
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/credit-requests decide]', err)
    res.status(500).json({ success: false, error: 'Failed to decide request' })
  }
})

// ── POST /company/pool/topup — add credits to the company pool ───────────────
// STAGING-ONLY test tool. In production the pool is funded exclusively by the
// Stripe purchase webhook — this endpoint refuses to grant free credits on prod.
companyRouter.post('/pool/topup', async (req: AuthRequest, res) => {
  try {
    const isStaging = process.env.IS_STAGING === 'true' || process.env.NEXT_PUBLIC_IS_STAGING === 'true'
    if (!isStaging) { res.status(403).json({ success: false, error: 'Pool is funded via billing in production' }); return }
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner can top up the pool' }); return }
    const { amount } = z.object({ amount: z.number().int().positive().max(10_000_000) }).parse(req.body)
    const { data: company } = await db.from('companies').select('credit_pool').eq('id', ctx.companyId).maybeSingle()
    await db.from('companies').update({ credit_pool: ((company as any)?.credit_pool ?? 0) + amount }).eq('id', ctx.companyId)
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/pool/topup]', err)
    res.status(500).json({ success: false, error: 'Failed to top up pool' })
  }
})

// ── POST /company/accept-invite — rep attaches their login to their seat ─────
// Called after the invited rep signs up / logs in. Finds the seat by token and
// binds the caller's auth user to it. The rep then owns that workspace.
companyRouter.post('/accept-invite', async (req: AuthRequest, res) => {
  try {
    const { token } = z.object({ token: z.string().min(10) }).parse(req.body)

    const { data: seat } = await db.from('clients')
      .select('id, user_id, company_id, invited_email')
      .eq('invite_token', token).maybeSingle()
    if (!seat) { res.status(404).json({ success: false, error: 'Invite not found or already used' }); return }
    if ((seat as any).user_id) { res.status(409).json({ success: false, error: 'This seat has already been claimed' }); return }

    // The caller must not already own another workspace (unique user_id).
    const { data: existing } = await db.from('clients').select('id').eq('user_id', req.userId!).maybeSingle()
    if (existing) {
      res.status(409).json({ success: false, error: 'This account already has a workspace. Use a fresh email for the rep seat.' }); return
    }

    const { error } = await db.from('clients')
      .update({ user_id: req.userId!, seat_accepted_at: new Date().toISOString(), invite_token: null })
      .eq('id', (seat as any).id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: 'Invalid input' }); return }
    console.error('[company/accept-invite]', err)
    res.status(500).json({ success: false, error: 'Failed to accept invite' })
  }
})

// ── WINNING PLAYS — company-shared library ──────────────────────────────────
companyRouter.get('/winning-plays', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    const { data } = await db.from('winning_plays')
      .select('id, name, note, reply_rate, pushed_to_all, created_at')
      .eq('company_id', ctx.companyId).order('created_at', { ascending: false }).limit(50)
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
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or a manager can save plays' }); return }
    const { name, note, sequence } = z.object({
      name:     z.string().min(1).max(120),
      note:     z.string().max(500).optional(),
      sequence: z.record(z.any()).optional(),
    }).parse(req.body)
    const { error } = await db.from('winning_plays')
      .insert({ company_id: ctx.companyId, name, note: note ?? null, sequence: sequence ?? {}, created_by: req.userId! })
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
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or a manager can push plays' }); return }
    const { error } = await db.from('winning_plays')
      .update({ pushed_to_all: true }).eq('id', req.params.id).eq('company_id', ctx.companyId)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('[company/winning-plays push]', err)
    res.status(500).json({ success: false, error: 'Failed to push play' })
  }
})
