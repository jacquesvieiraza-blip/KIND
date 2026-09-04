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
// BUILD-003 item 2 — public.meetings is the sole source of meeting counts.
import { clientMeetingCounts } from '../lib/meeting-truth'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { sendSeatInviteEmail } from '../lib/email'

export const companyRouter = Router()
companyRouter.use(requireAuth)

const canManage = (role: string) => role === 'owner' || role === 'manager'

/**
 * The seat limit a company gets if its row carries none.
 *
 * ⚠️ #616 — THIS WAS THE WHOLE PROBLEM. `companies.seat_cap` has a DB default of 25 and, until
 * now, **no write path anywhere in the product**: not a route, not a Vida control, not an admin
 * screen. Every company on the platform sat at exactly 25 forever, the number was never
 * displayed, and the 409 at rep 26 told the operator to "raise the cap" — a control that did
 * not exist. Enforced, invisible, and unchangeable is the worst of the three states.
 */
export const DEFAULT_SEAT_CAP = 25
export const MAX_SEAT_CAP = 100

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
// ══ 🛑 4 Sep — THE COMMAND CENTRE WAS THE LAST UNBOUNDED CURRENT-WORK SURFACE ═══════════
//
// Every figure below was `client_id` per rep with NO boundary, on a page reachable from the
// normal Milla rail. For a programme-model seat that means the retired book — every lead ever
// sourced, every historical reply, every meeting from a motion that no longer exists —
// rendered as **Leads · Reply % · Booked · Contacted** under a heading that claims to be the
// company's current picture.
//
// ⚠️ THE BOUNDARY IS THE ONE #1639/#1640 ESTABLISHED, applied PER REP. Every rep IS their own
// `clients` row (their leads are `leads.client_id = seat`), so `currentOutreachLeads` answers
// for a seat exactly as it answers for a customer. No second interpretation, no new resolver.
//
// ⚠️ AND THE SCOPE IS RETURNED, not just consumed. The caller needs it for the ECONOMICS
// decision too — a programme seat must not be shown credits — and resolving it twice is how
// two answers about one seat start to disagree.
type RepScopeMode = 'ids' | 'client' | 'none' | 'unreadable'
type RepStat = {
  contacted: number; replies: number; booked: number; leads: number; deduped: number
  /** Which commercial model governs this seat. Drives BOTH the activity and the economics. */
  mode: RepScopeMode
}

async function repStats(repIds: string[]): Promise<Record<string, RepStat>> {
  const stats: Record<string, RepStat> = {}
  for (const id of repIds) stats[id] = { contacted: 0, replies: 0, booked: 0, leads: 0, deduped: 0, mode: 'unreadable' }
  if (repIds.length === 0) return stats

  // ── THE BOUNDARY, RESOLVED ONCE PER SEAT ──────────────────────────────────────────────
  const { currentOutreachLeads, currentOutreachCampaigns } = await import('../lib/current-outreach')
  /** Seat → the lead ids that count as current, or `null` when the seat is client-wide. */
  const currentLeadIds: Record<string, string[] | null> = {}
  /** Seat → the campaign ids that count as current, or `null` when the seat is client-wide. */
  const currentCampaignIds: Record<string, string[] | null> = {}
  /** Seat → its open programme, for the meeting boundary. */
  const programmeOf: Record<string, string> = {}
  for (const id of repIds) {
    const scope = await currentOutreachLeads(id)
    stats[id].mode = scope.mode
    if (scope.mode === 'unreadable') console.error('[company/overview] seat scope unreadable:', id, scope.reason)
    if (scope.mode === 'ids') {
      currentLeadIds[id] = scope.ids
      programmeOf[id] = scope.programmeId
      const camps = await currentOutreachCampaigns(id, scope)
      if (camps.mode === 'ids') currentCampaignIds[id] = camps.ids
      else if (camps.mode === 'unreadable') { stats[id].mode = 'unreadable'; currentCampaignIds[id] = [] }
      else currentCampaignIds[id] = []
    } else if (scope.mode === 'client') {
      currentLeadIds[id] = null
      currentCampaignIds[id] = null
    } else {
      // 🛑 `none` (proof / programme with no programme) and `unreadable` BOTH count NOTHING.
      // A number is an assertion about work we did; not knowing is never grounds to make one,
      // and a calibration seat has no outreach by definition (R91). Fail closed to zero — and
      // never to the historical fallback (R96).
      currentLeadIds[id] = []
      currentCampaignIds[id] = []
    }
  }
  /** Seats whose figures may be counted at all. */
  const counting = repIds.filter(id => stats[id].mode === 'ids' || stats[id].mode === 'client')

  const [leadsRes, repliesRes, campsRes] = await Promise.all([
    db.from('leads').select('id, client_id, crm_existing').in('client_id', counting.length ? counting : ['00000000-0000-0000-0000-000000000000']),
    db.from('figsy_replies').select('client_id, lead_id, meeting_booked_at').in('client_id', counting.length ? counting : ['00000000-0000-0000-0000-000000000000']),
    db.from('figsy_campaigns').select('id, client_id').in('client_id', counting.length ? counting : ['00000000-0000-0000-0000-000000000000']),
  ])

  /** Is this row inside the seat's CURRENT work? `null` ids = the whole seat (legacy). */
  const inScope = (map: Record<string, string[] | null>, seat: string, rowId: unknown): boolean => {
    const allowed = map[seat]
    if (allowed === null || allowed === undefined) return allowed === null
    return typeof rowId === 'string' && allowed.includes(rowId)
  }

  for (const r of (leadsRes.data ?? []) as any[]) {
    if (!stats[r.client_id]) continue
    if (!inScope(currentLeadIds, r.client_id, r.id)) continue
    stats[r.client_id].leads++
    if (r.crm_existing) stats[r.client_id].deduped++
  }
  for (const r of (repliesRes.data ?? []) as any[]) {
    if (!stats[r.client_id]) continue
    // `figsy_replies` carries no programme_id, so attribution is DERIVED through `lead_id` —
    // the same derivation the Home rail and the Replies page use. No column, no migration.
    if (!inScope(currentLeadIds, r.client_id, r.lead_id)) continue
    stats[r.client_id].replies++
    // ⛓️ `if (r.meeting_booked_at) stats[...].booked++` USED TO BE HERE (BUILD-003 item 2).
    // A rep's booked count came from reply timestamps, so it counted a reschedule twice and
    // could not drop a duplicate or a spam booking. It now comes from public.meetings.
  }

  // ── BUILD-003 item 2 — the meeting number, from the one place that knows the rules ──────
  //
  // ⚠️ `public.meetings` STAYS THE SOURCE, and `excluded_reason` / `superseded_by` are still
  // applied inside meeting-truth — so duplicate and reschedule truth is untouched. What is
  // ADDED is the programme boundary: `meetingCounts` has taken `programmeId` since BUILD-003
  // and this caller never passed it, so a programme seat counted its retired meetings too.
  //
  // ⚠️ A FAILED READ IS STILL NOT A ZERO. Legacy seats keep the existing behaviour exactly:
  // on a null map their figures are left alone rather than written as zeros, because telling
  // a company every rep booked nothing is a worse answer than telling them nothing at all.
  const legacySeats = repIds.filter(id => stats[id].mode === 'client')
  if (legacySeats.length) {
    const bookedByRep = await clientMeetingCounts(legacySeats)
    if (bookedByRep) {
      for (const id of legacySeats) if (stats[id]) stats[id].booked = bookedByRep[id] ?? 0
    } else {
      console.error('[company] meeting counts unreadable — booked figures left unchanged')
    }
  }
  const { meetingCounts } = await import('../lib/meeting-truth')
  for (const id of repIds) {
    if (stats[id].mode !== 'ids') continue
    const counts = await meetingCounts({ clientId: id, programmeId: programmeOf[id] })
    // null = the read failed. Left at 0 rather than guessed, and logged.
    if (counts) stats[id].booked = counts.booked
    else console.error('[company] programme meeting counts unreadable for seat', id)
  }

  // Sent (contacted) is keyed by campaign → map campaign back to its rep.
  // ⚠️ FOR A PROGRAMME SEAT ONLY ITS PROGRAMME'S CAMPAIGNS COUNT — derived through the ICP,
  // exactly as `campaignFor` derives it. A retired campaign's sends are not current contact.
  const campToRep: Record<string, string> = {}
  const campIds: string[] = []
  for (const c of (campsRes.data ?? []) as any[]) {
    if (!inScope(currentCampaignIds, c.client_id, c.id)) continue
    campToRep[c.id] = c.client_id; campIds.push(c.id)
  }
  if (campIds.length) {
    const { data: sent } = await db.from('figsy_sent_emails').select('campaign_id').in('campaign_id', campIds)
    for (const s of (sent ?? []) as any[]) {
      const rep = campToRep[s.campaign_id]
      if (rep && stats[rep]) stats[rep].contacted++
    }
  }
  return stats
}

/**
 * May this seat be shown the RETIRED credit economics?
 *
 * 🛑 ONLY A LEGACY SEAT. Founder-ruled 4 Sep: for programme-model customers the wallet, the
 * credit pool and the per-seat budget are retired, and a page that still prints them is making
 * a commercial claim the product no longer honours. `none` (proof, or a programme client
 * between programmes) and `unreadable` are refused for the same reason the metrics are —
 * not knowing is never grounds to assert, and an unreadable seat must never fall through to
 * legacy economics (R96).
 *
 * ⚠️ NOTHING IS REPLACED WITH AN INVENTED FIGURE. The values become `null`, which the page
 * hides; `0` would be a claim ("you have no credits left") about a thing that does not exist.
 */
const showsRetiredEconomics = (mode: RepScopeMode) => mode === 'client'

// ══ 🛑 4 Sep — THE RETIRED CREDIT MODEL IS NOT ONLY A DISPLAY, IT IS A SET OF ACTIONS ═══
//
// #1641 suppressed the credit NUMBERS and left every credit VERB reachable: a rep could still
// POST a credit request, an owner could still approve one (which MOVES credits), allocate from
// the pool, set a seat budget, and top the pool up. And the "Add a rep" form carried a
// `Budget … cr` input defaulting to 5000 with no guard at all, so every invite a programme
// company sent allocated a retired credit budget.
//
// 🛑 A SUPPRESSED NUMBER BESIDE A LIVE BUTTON IS NOT A SUPPRESSION. Hiding "Credits left" while
// leaving "Approve +5,000 credits" on the same page tells the customer the credit model is
// still theirs — more convincingly than the figure did, because a button is a promise the
// software will do something.
//
// ⚠️ THE AUTHORITY IS THE SAME ONE, AGAIN. No new resolver, no new notion of "is this a credit
// customer" — `currentOutreachLeads` → `showsRetiredEconomics`, exactly as the roster uses it.
//
// ⚠️ AND THE GATES FAIL CLOSED. A read error resolves `unreadable`, which is NOT legacy (R96),
// so the verb is refused rather than allowed "to be safe". Refusing an action states nothing
// false; performing one moves real credits.

/** May THIS seat take part in the retired credit model at all? Positive attribution only. */
async function seatHasRetiredEconomics(clientId: string): Promise<boolean> {
  if (!clientId) return false
  const { currentOutreachLeads } = await import('../lib/current-outreach')
  return showsRetiredEconomics((await currentOutreachLeads(clientId)).mode)
}

/**
 * Is the COMPANY-WIDE credit surface truthful — i.e. is every rep seat still on the retired
 * model? Mirrors `/overview`'s `companyEconomics` exactly (including "no reps yet keeps the
 * existing view"), so the page and these endpoints can never disagree about one company.
 *
 * ⚠️ A FAILED ROSTER READ RETURNS FALSE. Not knowing who the seats are is not grounds to open
 * a pool action on all of them.
 */
async function companyHasRetiredEconomics(companyId: string): Promise<boolean> {
  // 🛑 4 Sep, RUNTIME-FOUND — EVERY SEAT, NOT EVERY REP, AND AN EMPTY ROSTER IS NOT A YES.
  // This filtered `seat_role = 'rep'` and returned TRUE when it found none. House is an
  // explicit programme client whose company has an owner seat and NO reps, so the filter
  // matched nothing, the empty roster read as permission, and every retired credit action
  // stayed open on a programme account. **The owner is a seat.**
  const { data, error } = await db.from('clients')
    .select('id').eq('company_id', companyId)
  if (error) { console.error('[company] seat roster unreadable for economics gate:', error.message); return false }
  const seats = (data ?? []) as Array<{ id: string }>
  if (seats.length === 0) return false
  for (const s of seats) if (!(await seatHasRetiredEconomics(s.id))) return false
  return true
}

/** The one refusal these endpoints return. Never names a credit balance. */
const RETIRED_CREDITS = 'Credits are not part of this account’s plan'

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

    // ── 🛑 4 Sep, RUNTIME-FOUND — THE OWNER IS A SEAT, AND ITS MODEL WAS NEVER RESOLVED ────
    //
    // `repStats` is handed only the REP seats, so a non-rep seat fell to the `?? unreadable`
    // default below. Two consequences, in opposite directions, both live:
    //
    //   ① A PROGRAMME COMPANY WITH NO REPS SHOWED EVERYTHING. `companyEconomics` read
    //      `repOut.length === 0 || …`, and "no reps yet has nothing to contradict it" is
    //      exactly true of House — an explicit programme client with one owner seat. Zero reps
    //      meant the pool, the Requests tile, the Credits left column and the Pending credit
    //      requests card all rendered on a programme account. **The suppression was never
    //      wrong; it was never asked.**
    //   ② A LEGACY OWNER LOST THEIR OWN FIGURES. `unreadable` is not legacy (R96), so the
    //      owner's Credits left cell went blank beside every rep's.
    //
    // ⚠️ THE MODEL IS RESOLVED HERE; THE ACTIVITY NUMBERS ARE DELIBERATELY NOT. Feeding every
    // seat through `repStats` would also start printing an owner's outreach where zero has
    // always been printed — a second, unasked change to a legacy screen. The defect is the
    // ECONOMICS decision, so only that is widened.
    const nonRepEconomics: Record<string, boolean> = {}
    for (const s of seatRows) {
      if (s.seat_role !== 'rep') nonRepEconomics[s.id] = await seatHasRetiredEconomics(s.id)
    }

    const seatsOut = seatRows.map(s => {
      const st = stats[s.id] ?? { contacted: 0, replies: 0, booked: 0, leads: 0, deduped: 0, mode: 'unreadable' as const }
      const budget = s.seat_budget ?? 0
      const used = Math.max(0, budget - (s.credit_balance ?? 0))
      // 🛑 RETIRED ECONOMICS ARE SUPPRESSED, NOT ZEROED. See `showsRetiredEconomics`.
      const money = s.seat_role === 'rep'
        ? showsRetiredEconomics(st.mode)
        : (nonRepEconomics[s.id] ?? false)
      return {
        id: s.id,
        email: s.invited_email || s.company_name || '—',
        name: s.company_name || s.invited_email || '—',
        role: s.seat_role,
        autonomy: s.autonomy ?? 'auto',
        /** false → the page hides every credit figure for this seat. */
        economics_visible: money,
        credit_budget: money ? budget : null,
        credits_used: money ? used : null,
        credit_balance: money ? (s.credit_balance ?? 0) : null,
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
    // ── COMPANY-WIDE ECONOMICS: ALL OR NOTHING, AND FAIL-CLOSED ──────────────────────────
    //
    // 🛑 THE POOL IS PRESENTED AS FUNDING EVERY SEAT, so it may only be shown when every seat
    // it claims to fund is actually on the model that has one. One programme seat is enough to
    // make "Company budget pool" a retired commercial claim about this company — so the tile
    // goes, rather than being shown with a caveat nobody reads. A company with no reps yet has
    // nothing to contradict it and keeps the existing view.
    //
    // ⚠️ A MIXED COMPANY FAILS CLOSED AT THE COMPANY LEVEL, AND SAYS WHY. One legacy seat and
    // one programme seat under one roof have no shared commercial model, so there is no
    // truthful company pool to print — but the REASON differs and the page must not tell a
    // mixed company "your programme is billed as one price in two halves", which is a claim
    // about a model only some of its seats are on. `economics_hidden_reason` carries that
    // distinction to the page; it invents nothing, it only says which absence this is.
    //
    // 🛑 4 Sep, RUNTIME-FOUND — OVER EVERY SEAT, AND AN EMPTY ROSTER IS NOT A YES.
    // This read `repOut.length === 0 || repOut.every(…)`. The first clause was written as "a
    // company with no reps yet has nothing to contradict it" — and it is exactly true of a
    // one-person programme company, which is the commonest company on the platform and the one
    // the founder was looking at. It is now every seat the roster returned, owner included,
    // with no seats at all failing CLOSED rather than open.
    const companyEconomics = seatsOut.length > 0 && seatsOut.every(s => s.economics_visible)
    const economicsHiddenReason = companyEconomics ? null
      : seatsOut.some(s => s.economics_visible) ? 'mixed' : 'programme'
    const totals = {
      seats:            repOut.length,
      active_seats:     repOut.filter(s => s.seat_active && s.accepted_at).length,
      seat_cap:         (company as any)?.seat_cap ?? DEFAULT_SEAT_CAP,
      // #616 — so the UI can warn BEFORE the wall. A company used to hit a 409 at rep 26 with
      // nothing on screen having ever mentioned a limit.
      seats_used:       repOut.length,
      /** false → the page hides the budget pool, allocated and used entirely. */
      economics_visible: companyEconomics,
      /** null when visible · 'programme' when no seat has economics · 'mixed' when some do. */
      economics_hidden_reason: economicsHiddenReason,
      allocated:        companyEconomics ? repOut.reduce((n, s) => n + (s.credit_budget ?? 0), 0) : null,
      used:             companyEconomics ? repOut.reduce((n, s) => n + (s.credits_used ?? 0), 0) : null,
      company_pool:     companyEconomics ? ((company as any)?.credit_pool ?? 0) : null,
      // 🛑 A PENDING CREDIT REQUEST IS RETIRED-MODEL STATE, NOT COMPANY CONFIGURATION. Shown to
      // a programme company it says the credit model is still theirs and that there is
      // something here for them to approve. Suppressed with the rest of the economics — the
      // rows are untouched in the table, and a MIXED company suppresses too rather than
      // inventing an attribution the shared surface cannot carry (founder-ruled 4 Sep).
      pending_requests: companyEconomics ? (requests ?? []).length : 0,
      total_booked:     repOut.reduce((n, s) => n + s.booked, 0),
      total_contacted:  repOut.reduce((n, s) => n + s.contacted, 0),
      // #110 — company-wide leads owned across reps + total deduped (saved from
      // re-working). #111 — how many reps have a booking calendar connected.
      total_leads:        repOut.reduce((n, s) => n + s.leads, 0),
      total_deduped:      repOut.reduce((n, s) => n + s.deduped, 0),
      calendars_connected: repOut.filter(s => s.calendar_connected || s.booking_url).length,
    }

    // #402 (AR-65) — only owner/manager may see the whole roster. A rep calling this
    // could otherwise enumerate every colleague's seat: email, credit balance, calendar
    // address. A rep sees only their OWN seat + no company-wide totals / pending requests.
    const isManager = canManage(ctx.role)
    const visibleSeats = isManager ? seatsOut : seatsOut.filter(s => s.id === ctx.clientId)

    res.json({
      success: true,
      data: {
        company: { id: ctx.companyId, name: (company as any)?.name ?? '' },
        role: ctx.role,
        can_manage: isManager,
        seats: visibleSeats,
        pending_requests: isManager && companyEconomics ? (requests ?? []) : [],
        totals: isManager ? totals : null,
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

    // ── ⚑ 4 Sep — THE PANEL UNDERNEATH THE ROSTER WAS STILL UNBOUNDED ──────────────────────
    //
    // 🛑 The roster row above this panel is bounded (see `repStats`), so a programme seat
    // between programmes correctly reads Leads 0 · Contacted 0 · Booked 0 — and clicking it
    // opened a list of up to fifty retired campaigns with their send and reply counters, under
    // a heading that says **Recent activity**. Two views of one seat, one bounded, which is
    // WORSE than neither: they contradict each other on one screen and the detail wins, because
    // the detail is the one with the names and the dates in it (R95, the Replies lesson).
    //
    // ⚠️ THE SAME AUTHORITY, NOT A SECOND READING OF IT. `currentOutreachLeads` /
    // `currentOutreachCampaigns` are the functions `repStats` resolves twenty lines up, so the
    // row and the panel cannot disagree by construction.
    //
    // ⚠️ NOTHING IS DELETED. Retired campaigns, replies and sends stay exactly where they are;
    // this route stops presenting them as this seat's current work.
    const { currentOutreachLeads, currentOutreachCampaigns, safeIn } = await import('../lib/current-outreach')
    const scope = await currentOutreachLeads(repId)

    // 🛑 UNREADABLE REFUSES (R96). This panel is a LIST, so it fails the way lists fail — an
    // honest error the modal already renders ("Couldn't load this rep's detail. Close and try
    // again."), never `[]` dressed as "no campaigns yet" and never the historical fallback.
    if (scope.mode === 'unreadable') {
      console.error('[company/seat-detail] outreach scope unreadable for', repId, scope.reason)
      res.status(503).json({ success: false, error: 'Could not confirm which work is current for this seat' })
      return
    }
    const campScope = await currentOutreachCampaigns(repId, scope)
    if (campScope.mode === 'unreadable') {
      console.error('[company/seat-detail] campaign scope unreadable for', repId, campScope.reason)
      res.status(503).json({ success: false, error: 'Could not confirm which work is current for this seat' })
      return
    }

    // Campaigns (denormalised counters are already on the row — no extra reads).
    // ⚠️ A programme seat sees ONLY its programme's campaigns, derived through the ICP exactly
    // as `campaignFor` derives it. `none` (Proof, or a programme client between programmes) has
    // no current campaign by construction, so the read is skipped rather than filtered.
    let campQuery = db.from('figsy_campaigns')
      .select('id, name, status, leads_enrolled, emails_sent, replies_total, replies_interested, created_at')
      .eq('client_id', repId)
    if (campScope.mode === 'ids') campQuery = campQuery.in('id', safeIn(campScope.ids))
    const { data: campaigns } = scope.mode === 'none'
      ? { data: [] as any[] }
      : await campQuery.order('created_at', { ascending: false }).limit(50)
    const campIds = ((campaigns ?? []) as any[]).map(c => c.id)

    // Recent activity — same shape the rep's own FIGSY activity feed uses.
    // ⚠️ SENDS are bounded by the campaign list above. REPLIES carry no programme_id, so they
    // are bounded through `lead_id` — the same derivation the Home rail, the Replies page and
    // `repStats` use.
    let replyQuery = db.from('figsy_replies')
      .select('from_name, from_email, classification, received_at')
      .eq('client_id', repId)
    if (scope.mode === 'ids') replyQuery = replyQuery.in('lead_id', safeIn(scope.ids))
    const [sentRes, repliesRes] = await Promise.all([
      campIds.length
        ? db.from('figsy_sent_emails')
            .select('subject, step, sent_at, leads(first_name, last_name, company)')
            .in('campaign_id', campIds)
            .order('sent_at', { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [] as any[] }),
      scope.mode === 'none'
        ? Promise.resolve({ data: [] as any[] })
        : replyQuery.order('received_at', { ascending: false }).limit(30),
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
      const hot = r.classification === 'hot' || r.classification === 'interested'
      events.push({ type: 'reply', title: `${hot ? '🔥 ' : ''}Reply from ${who}`, subtitle: r.classification ? `Classified: ${r.classification}` : 'New reply', at: r.received_at, tone: hot ? 'positive' : r.classification === 'opt_out' ? 'warn' : 'neutral' })
    }

    // ── BUILD-003 item 2, ONE SURFACE LATE — the meeting events come from public.meetings ────
    //
    // ⛓️ `if (r.meeting_booked_at) events.push({ type: 'meeting', … })` USED TO BE IN THE LOOP
    // ABOVE. A meeting line was synthesised from a REPLY TIMESTAMP, which is the source
    // BUILD-003 retired precisely because it has no notion of a duplicate, a spam booking or a
    // reschedule — so a meeting moved twice appeared three times, and the `Booked` tile at the
    // top of this very modal (counted from `public.meetings` with the exclusions applied)
    // disagreed with the list directly beneath it. Same defect, same page, same fix as
    // `/leads/meetings`: the exclusion rules are the module's, not this route's.
    //
    // ⚠️ A FAILED READ IS SILENT, NOT ZERO. `meetingsForClient` returns null on a storage error
    // and the sends and replies still render — dropping the meeting lines states nothing false,
    // while a fabricated empty list beside a non-zero `Booked` tile would.
    const { meetingsForClient } = await import('../lib/meeting-truth')
    if (scope.mode !== 'none') {
      const mtgs = await meetingsForClient({
        clientId: repId,
        ...(scope.mode === 'ids' ? { programmeId: scope.programmeId } : {}),
        limit: 30,
      })
      if (mtgs === null) console.error('[company/seat-detail] meetings unreadable for seat', repId)
      else {
        const leadIds = mtgs.map(m => m.leadId).filter((v): v is string => typeof v === 'string')
        const names: Record<string, string> = {}
        if (leadIds.length) {
          const { data: mLeads } = await db.from('leads')
            .select('id, first_name, last_name, company').eq('client_id', repId).in('id', leadIds)
          for (const l of (mLeads ?? []) as any[]) {
            names[l.id] = `${l.first_name ?? ''} ${l.last_name ?? ''}`.trim() || l.company || 'a lead'
          }
        }
        for (const m of mtgs) {
          const who = (m.leadId && names[m.leadId]) || 'a lead'
          // The TITLE is unchanged — a no-show was still booked. Only the subtitle, which used
          // to be the single sentence "FIGSY closed a booking", now says which of the four
          // states this row actually is, because `public.meetings` knows and a reply did not.
          const subtitle = m.rescheduled ? 'Moved to a new time'
            : m.state === 'HELD' ? 'Meeting held'
            : m.state === 'NO_SHOW' ? 'No-show'
            : 'FIGSY closed a booking'
          events.push({
            type: 'meeting', title: `Meeting booked with ${who}`, subtitle,
            at: m.scheduledAt, tone: m.state === 'NO_SHOW' ? 'warn' : 'positive',
          })
        }
      }
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
/**
 * #616 — RAISE OR LOWER THE SEAT LIMIT. The control the 409 has always promised.
 *
 * ⚠️ OWNER ONLY, deliberately stricter than `canManage`. The founder's model is that a
 * **sysadmin / billing contact** decides how many people the company pays to have on the
 * platform — a manager runs reps day to day but must not be able to change what the company is
 * committed to. `canManage` would have let a manager do it, which is the wrong shape.
 *
 * ⚠️ REFUSES A CAP BELOW THE SEATS ALREADY IN USE, and names the count. Silently accepting it
 * would leave a company over its own limit with no way to see why the next invite fails — the
 * enforcement is a `>=` at invite time, so a cap of 3 against 7 live reps does not remove
 * anybody, it just makes the next invite refuse for a reason nothing on screen explains.
 * Deactivate seats first, then lower the cap: that order is a decision a human takes, never a
 * side effect of typing a smaller number.
 *
 * No migration: `companies.seat_cap` already exists (20260612_company_engine.sql:15).
 */
companyRouter.patch('/seat-cap', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!ctx.isOwner) {
      res.status(403).json({ success: false, error: 'Only the company owner can change the seat limit — a manager runs the reps, but what the company pays for is the owner\'s call.' }); return
    }

    const { seat_cap } = z.object({
      seat_cap: z.number().int().min(1).max(MAX_SEAT_CAP),
    }).parse(req.body)

    const { count } = await db.from('clients').select('id', { count: 'exact', head: true })
      .eq('company_id', ctx.companyId).eq('seat_role', 'rep')
    const inUse = count ?? 0
    if (seat_cap < inUse) {
      res.status(409).json({
        success: false,
        error: `You have ${inUse} rep seat${inUse === 1 ? '' : 's'} and asked for a limit of ${seat_cap}. Lowering the limit does not remove anybody — it would only make the next invite fail for a reason nothing on screen explains. Deactivate the seats you do not need first, then lower the limit.`,
        seats_used: inUse,
      }); return
    }

    // CHECKED, not swallowed (#349) — supabase-js returns { error } rather than throwing, so an
    // unchecked update here would report a new limit that was never written.
    const { error } = await db.from('companies').update({ seat_cap }).eq('id', ctx.companyId)
    if (error) { res.status(500).json({ success: false, error: `The seat limit was NOT changed: ${error.message}` }); return }

    // No company-side audit table exists (checked — `operator_audit_log` is operator actions on
    // clients, not a client's own admin acting on their company). Logged loudly rather than
    // inventing a table the schema freeze forbids.
    console.log(`[company/seat-cap] company ${ctx.companyId} seat limit -> ${seat_cap} (was in use: ${inUse}) by client ${ctx.clientId}`)

    res.json({ success: true, data: { seat_cap, seats_used: inUse } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: `The seat limit must be a whole number between 1 and ${MAX_SEAT_CAP}.` }); return
    }
    console.error('[company/seat-cap]', err)
    res.status(500).json({ success: false, error: 'Failed to change the seat limit' })
  }
})

companyRouter.post('/seats', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner or a manager can add reps' }); return }

    const { email, budget } = z.object({
      email:  z.string().email(),
      budget: z.number().int().min(0).max(1_000_000).optional(),
    }).parse(req.body)

    // Seat-cap guard. #616 — the refusal now names the ACTUAL cap and points at the control
    // that raises it. It used to say "raise the cap to add more reps" while **no way to raise
    // it existed anywhere in the product** — a promise the software could not keep.
    const { count } = await db.from('clients').select('id', { count: 'exact', head: true })
      .eq('company_id', ctx.companyId).eq('seat_role', 'rep')
    const { data: company } = await db.from('companies').select('name, seat_cap, credit_pool').eq('id', ctx.companyId).maybeSingle()
    const cap = Number((company as any)?.seat_cap ?? DEFAULT_SEAT_CAP)
    if ((count ?? 0) >= cap) {
      res.status(409).json({
        success: false,
        error: `Seat cap reached — this company is set to ${cap} rep seat${cap === 1 ? '' : 's'} and ${count ?? 0} are in use. The owner can raise it in the Command Centre (Seats → seat limit).`,
        seat_cap: cap, seats_used: count ?? 0,
      }); return
    }

    // 🛑 AN INVITE MUST NOT ALLOCATE A RETIRED BUDGET. The portal's "Add a rep" form carried a
    // `Budget … cr` input defaulting to 5,000 with no guard, so every seat a programme company
    // invited was funded from a pool it does not have. The seat is still created — only the
    // allocation is refused, and it is refused LOUDLY so a caller never believes it landed.
    if ((budget ?? 0) > 0 && !(await companyHasRetiredEconomics(ctx.companyId))) {
      res.status(403).json({ success: false, error: RETIRED_CREDITS }); return
    }

    const token = crypto.randomBytes(32).toString('hex')
    const startBudget = budget ?? 0
    const { data: newRep, error } = await db.from('clients').insert({
      company_id: ctx.companyId,
      company_name: email.split('@')[0],
      invited_email: email.toLowerCase(),
      invite_token: token,
      seat_role: 'rep',
      seat_active: true,
      seat_budget: 0,
      credit_balance: 0,   // #316 — funded atomically from the pool below (no minting)
      country: 'South Africa',
    }).select('id').single()
    if (error || !newRep) throw error ?? new Error('Failed to create seat')

    // #316 — atomically move the starting budget from the pool (guarded). The old code
    // deducted with Math.max(0, pool - budget), MINTING credits when the pool was short
    // (rep got the full budget, pool floored at 0). allocateToRep now refuses if short,
    // leaving the seat at 0 for the owner to top up later.
    if (startBudget > 0) {
      await allocateToRep(ctx.companyId, newRep.id, startBudget)
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

    // 🛑 THE PER-SEAT CREDIT BUDGET IS RETIRED FOR A PROGRAMME SEAT — and refusing the WHOLE
    // call is deliberate rather than quietly dropping the field. Silently ignoring an input is
    // how a caller comes to believe a budget was set; the seat's other settings (autonomy,
    // agents, role, active) stay editable through a call that does not carry one.
    if (body.seat_budget !== undefined && !(await seatHasRetiredEconomics(req.params.id))) {
      res.status(403).json({ success: false, error: RETIRED_CREDITS }); return
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

    // 🛑 NO TOP-UP INTO A SEAT THAT HAS NO WALLET. Same gate, same authority, same failure mode.
    if (!(await seatHasRetiredEconomics(req.params.id))) {
      res.status(403).json({ success: false, error: RETIRED_CREDITS }); return
    }

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
  // #316 — atomic guarded move via RPC (was a non-atomic read-then-write that could
  // mint credits on a double-click or when racing a drip/deactivation).
  if (!amount || amount <= 0) return false
  const { data, error } = await db.rpc('allocate_pool_to_rep', {
    p_company_id: companyId, p_rep_id: repClientId, p_amount: amount,
  })
  if (error) { console.error('[company] allocate_pool_to_rep failed', error.message); return false }
  return data === true
}

// Shared (#108b): reverse of allocateToRep — move a rep's remaining balance back
// to the company pool and zero the seat. Returns the amount reclaimed. No pool RPC
// exists (credit_pool lives on companies), so this uses the same read-then-write
// the pool is managed with everywhere in this file.
async function returnRepCreditsToPool(companyId: string, repClientId: string): Promise<number> {
  // #316 — atomic via RPC (locks the rep row); was a non-atomic read-then-write.
  const { data, error } = await db.rpc('return_rep_to_pool', {
    p_company_id: companyId, p_rep_id: repClientId,
  })
  if (error) { console.error('[company] return_rep_to_pool failed', error.message); return 0 }
  return (data as number | null) ?? 0
}

// ── POST /company/credit-requests — a rep asks the owner for more ────────────
companyRouter.post('/credit-requests', async (req: AuthRequest, res) => {
  try {
    const ctx = await resolveContext(req.userId!)
    if (!ctx || !ctx.clientId) { res.status(404).json({ success: false, error: 'No seat found' }); return }
    // 🛑 A PROGRAMME SEAT CANNOT ASK FOR CREDITS IT DOES NOT HAVE. The portal has no button for
    // this today, but the endpoint is authenticated and reachable, and a request created here
    // would surface in the owner's Command Centre as a live approval to make.
    if (!(await seatHasRetiredEconomics(ctx.clientId))) {
      res.status(403).json({ success: false, error: RETIRED_CREDITS }); return
    }

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

    // 🛑 POSITIVE ATTRIBUTION, PER REQUEST. Approving moves real credits into a seat's balance,
    // so the gate is the SEAT the request belongs to — not the caller, and not the company.
    // A legacy rep's request stays decidable; a programme seat's never becomes one.
    if (!(await seatHasRetiredEconomics((reqRow as any).rep_client_id))) {
      res.status(403).json({ success: false, error: RETIRED_CREDITS }); return
    }

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
// STAGING-ONLY test tool — it refuses to grant free credits on prod.
//
// ⚠️ 4 Sep — THE CLAIM THAT USED TO BE HERE WAS FALSE, and it was traced rather than trusted:
// *"in production the pool is funded exclusively by the Stripe purchase webhook."* **There is
// no such webhook branch.** `companies.credit_pool` is written in exactly four places — the
// operator seed, the `allocate_pool_to_rep` and `return_rep_to_pool` RPCs (which only move
// credits between the pool and a seat), and this staging tool. Nothing in `routes/stripe.ts`
// or `lib/stripe.ts` mentions `credit_pool` at all, and `retired-topup-money-authority.test.ts`
// asserts that it never will. **So the company pool has no production funding path** — which
// also means the Command Centre's "Top up company budget" button cannot work: it posts a
// `{ priceId, credits, creditType }` body to `/stripe/checkout`, a route whose schema requires
// `amount_usd`, so it 400s before it reaches anything. Reported, not fixed here — a legacy
// money path is not something to redesign inside a current-truth PR.
companyRouter.post('/pool/topup', async (req: AuthRequest, res) => {
  try {
    const isStaging = process.env.IS_STAGING === 'true' || process.env.NEXT_PUBLIC_IS_STAGING === 'true'
    if (!isStaging) { res.status(403).json({ success: false, error: 'Pool is funded via billing in production' }); return }
    const ctx = await resolveContext(req.userId!)
    if (!ctx) { res.status(404).json({ success: false, error: 'No company found' }); return }
    if (!canManage(ctx.role)) { res.status(403).json({ success: false, error: 'Only the owner can top up the pool' }); return }
    // 🛑 AND NO POOL TO TOP UP WHERE THERE IS NO POOL. Already prod-refused above; this closes
    // the staging path so the retired model cannot be exercised against a programme company at
    // all, on any environment.
    if (!(await companyHasRetiredEconomics(ctx.companyId))) {
      res.status(403).json({ success: false, error: RETIRED_CREDITS }); return
    }
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

    // ── 🛑 4 Sep — WHAT `reply_rate` ACTUALLY IS, TRACED BEFORE IT WAS BOUNDED ────────────
    //
    // ⚠️ IT IS NOT COMPUTED FROM SENDS AND REPLIES. `winning_plays.reply_rate` is a STORED
    // numeric column and **nothing in the product ever writes it from real activity**: the
    // save route (`POST /winning-plays`) does not set it at all, so a genuinely saved play is
    // NULL and renders no badge. The only writer in the repository is `lib/seed-company.ts`,
    // which hardcodes 14.5 and 11.2 — reachable solely from the operator seeding route.
    //
    // 🛑 SO THE RISK IS NOT THE ONE IT LOOKED LIKE. It is not ranking a "winning" rep from
    // historical legacy activity — it never ranked anything. It is a DEMO CONSTANT rendered to
    // a customer as **"14.5% reply"** with a crown beside it, which is a performance claim
    // about their team that no measurement stands behind.
    //
    // ⚠️ SUPPRESSED FOR PROGRAMME-MODEL COMPANIES, NOT REPLACED. There is no current-programme
    // reply figure to put here — computing one would be inventing the metric the founder
    // forbade — so the badge simply does not render and the play keeps its name and note. The
    // stored value is untouched in the database; only the claim stops being made.
    //
    // ⚠️ LEGACY IS UNCHANGED: a legacy company sees exactly what it saw.
    const { currentOutreachLeads } = await import('../lib/current-outreach')
    const self = await currentOutreachLeads(ctx.clientId ?? '')
    const claimAllowed = self.mode === 'client'
    const plays = ((data ?? []) as Array<Record<string, unknown>>).map(p => ({
      ...p,
      reply_rate: claimAllowed ? p.reply_rate : null,
    }))
    res.json({ success: true, data: plays })
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
