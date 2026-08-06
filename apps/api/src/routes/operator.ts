import { Router, Request, Response } from 'express'
import { db } from '@kind/db'
import { adminKeyValid } from './admin'
import { getExcludedClientIds } from '../lib/real-clients'
import { writeOperatorAudit, campaignAuditAction } from '../lib/operator-audit'
import { PAID_TX_TYPES, CASH_TX_TYPES, packState, packLabel, PACK_PRICE_USD } from '../lib/onboarding-pack'
import { namesPerApproval } from '../lib/money-path-math'
import { coldView } from '../lib/cold-client'
import type { InboxRow } from '../lib/sending-inbox'

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

// ── THE WORKLIST — every client, where they are, and the ONE next action ──────────
// This replaces "eight tabs and work out where you are". The step logic is a pure decision
// table in lib/client-step.ts (unit-tested); this endpoint only gathers the facts.
//
// Batched deliberately: one query per TABLE across all clients, never one per client. A
// per-client loop would be ~8 round trips × N clients on the console's front door.
operatorRouter.get('/worklist', async (_req: Request, res: Response) => {
  try {
    const { data: clients } = await db.from('clients')
      // #626/C6 — `vat_number` rides the query that was already being made. It is the ONE field
      // `vatBadge` needs (the sentinel NOT_REGISTERED lives in it, #615), and a second query per
      // client to fetch it would be exactly the round trip this endpoint exists to avoid.
      .select('id, company_name, industry, country, is_demo, wallet_balance_usd, created_at, vat_number')
      .order('created_at', { ascending: false }).limit(200)
    const rows = (clients ?? []) as Record<string, unknown>[]
    const ids = rows.map(c => c.id as string)
    if (ids.length === 0) { res.json({ success: true, data: [] }); return }

    // client_inboxes may not exist yet on an un-migrated database — degrade to "no inbox"
    // rather than failing the whole console.
    const inboxQ = db.from('client_inboxes').select('client_id, status').in('client_id', ids)
      .then(r => r, () => ({ data: [] as { client_id: string; status: string }[] }))

    // Leads and replies are PAGED, not `.limit(20000)`. 100 clients × 200 leads already hits
    // that ceiling, and past it PostgREST returns an arbitrary 20,000 rows — so half the
    // board's clients would silently read as zero sourced, zero approved, never cold. A
    // board that quietly lies is worse than one that loads a beat slower.
    const { pageRows } = await import('../lib/page-rows')

    const [icps, purchases, inboxes, leadsPaged, seqs, camps, queue, repliesPaged, approvalsPaged] = await Promise.all([
      db.from('icps').select('client_id').in('client_id', ids).eq('is_active', true),
      // `type`, `reference` and `amount` ride along on a query that was already being made —
      // #619 needs to tell a payment from a comp and #623 needs to SUM the real cash, and a
      // second query per client to learn either would be exactly the per-client round trip
      // this endpoint is built to avoid.
      //
      // #623 widened the type filter to CASH_TX_TYPES (PAID_TX_TYPES + 'refund'): without the
      // refund rows a fully-refunded client would still read "$299 in", which is the same
      // overstatement #623 exists to end.
      db.from('credit_transactions').select('client_id, type, reference, amount')
        .in('client_id', ids).in('type', CASH_TX_TYPES),
      inboxQ,
      // Passed leads are INCLUDED here (they used to be filtered out at the query) because
      // the names-per-approval ratio is meaningless without them: a client who passes on 190
      // of 200 is exactly the case the number exists to catch.
      pageRows<Record<string, unknown>>('leads',
        q => (q as any).select('client_id, surfaced_for_approval_at, revealed_at, status, id').in('client_id', ids),
        { orderBy: 'id', label: 'worklist:leads' }),
      db.from('figsy_sequences').select('client_id').in('client_id', ids),
      db.from('figsy_campaigns').select('client_id, status').in('client_id', ids),
      db.from('figsy_approval_queue').select('client_id').in('client_id', ids).eq('status', 'pending'),
      pageRows<Record<string, unknown>>('figsy_replies',
        q => (q as any).select('client_id, classification, qualified_at, meeting_booked_at, id').in('client_id', ids),
        { orderBy: 'id', label: 'worklist:replies' }),
      // Last approval per client — drives the 30-day cold clock. Ordered newest-first so a
      // single pass over the rows keeps the first one it sees per client.
      pageRows<Record<string, unknown>>('leads',
        q => (q as any).select('client_id, revealed_at').in('client_id', ids).not('revealed_at', 'is', null),
        { orderBy: 'revealed_at', label: 'worklist:lastApproval' }),
    ])

    // pageRows returns { rows, complete }; the supabase reads return { data }. Normalise.
    const leads    = { data: leadsPaged.rows }
    const replies  = { data: repliesPaged.rows }
    const approvals = { data: approvalsPaged.rows }

    const countBy = (arr: unknown, pred?: (r: Record<string, unknown>) => boolean) => {
      const m = new Map<string, number>()
      for (const r of ((arr as { data?: Record<string, unknown>[] })?.data ?? [])) {
        if (pred && !pred(r)) continue
        const k = r.client_id as string
        m.set(k, (m.get(k) ?? 0) + 1)
      }
      return m
    }

    const icpN   = countBy(icps)
    // #623 — the query now also returns `refund` rows, so this is scoped back to the types
    // that mean ENTITLED. Without the predicate a refund row would count as funding, and
    // `hasFunded` (which gates client-step) would start answering a different question.
    const paidN  = countBy(purchases, r => PAID_TX_TYPES.includes(String(r.type ?? '')))
    const inboxN = countBy({ data: (inboxes as { data?: { client_id: string; status: string }[] }).data ?? [] },
                           r => ['assigned', 'warming', 'active'].includes(String(r.status)))
    const seqN   = countBy(seqs)
    const activeN = countBy(camps, r => r.status === 'active')
    const queueN = countBy(queue)

    const allLeadsN  = countBy(leads)                                   // incl. passed — the ratio's numerator
    const sourcedN   = countBy(leads, r => r.status !== 'passed')
    // NO TIME LIMIT ON PAID LEADS (founder-locked 25 Jul). This used to drop a lead off the
    // operator's board once its 72h expiry passed while Milla still showed it to the client —
    // so the two consoles disagreed about what was outstanding. The expiry is gone; a lead is
    // with the client until they approve or pass it.
    const withClient = countBy(leads, r => !!r.surfaced_for_approval_at && !r.revealed_at && r.status !== 'passed')
    const approvedN  = countBy(leads, r => !!r.revealed_at)

    // Replies still OPEN — not qualified, no meeting, and not noise. One bucket, because
    // nothing in the schema records that WE replied (`processed_at` is the AI classification
    // stamp). Splitting "answer it" from "qualify it" needs a `replied_at` column — flagged.
    const NOISE = ['opt_out', 'unsubscribe', 'out_of_office', 'bounce']
    const repliesOpen = countBy(replies, r => !r.qualified_at && !r.meeting_booked_at
      && !NOISE.includes(String(r.classification ?? '')))

    // Newest approval per client. Compared explicitly rather than relying on row order —
    // paging sorts ASCENDING (a stable key is what makes paging safe), and the old
    // "first row wins" logic silently became "OLDEST approval wins" the moment I paged it.
    // That would have shown an active client who first approved 60 days ago as SUSPENDED.
    const lastApproval = new Map<string, string>()
    for (const r of ((approvals as { data?: Record<string, unknown>[] })?.data ?? [])) {
      const k = r.client_id as string
      const at = String(r.revealed_at)
      const prev = lastApproval.get(k)
      if (!prev || at > prev) lastApproval.set(k, at)
    }
    const coldNow = new Date()

    // #619 — HOW each client was funded, not just whether. `manual_grant` is inside
    // PAID_TX_TYPES on purpose (it is what ENTITLES a comped account), so `hasFunded` below is
    // right to stay true for a comp — but the board must not print that as "Paid $299".
    const { fundedVia, moneyInUsd } = await import('../lib/onboarding-pack')
    const ledgerByClient = new Map<string, { type?: unknown; reference?: unknown; amount?: unknown }[]>()
    for (const r of ((purchases as { data?: Record<string, unknown>[] })?.data ?? [])) {
      const k = r.client_id as string
      const list = ledgerByClient.get(k)
      if (list) list.push(r); else ledgerByClient.set(k, [r])
    }

    // #619 — the house account resolved ONCE, before the loop, the one permitted way
    // (`decideHouseClient`, never a company-name match — #584/#593). FAILS OPEN: if it cannot
    // be resolved this stays null, `coldCheckExempt` exempts nobody, and the board shows
    // exactly what it shows today. The cron already does this; the SCREEN did not, which is
    // why the founder was looking at a red SUSPEND badge on an account that is exempt.
    let houseClientId: string | null = null
    try {
      houseClientId = await resolveHouseClientId()
    } catch (err) {
      console.error('[operator/worklist] house resolution failed — failing OPEN, no exemption:',
        err instanceof Error ? err.message : err)
    }

    const { nextAction, sortByUrgency } = await import('../lib/client-step')
    const excluded = await getExcludedClientIds()

    const out = rows.map(c => {
      const id = c.id as string
      const isDemo = c.is_demo === true
      const next = nextAction({
        hasIcp: (icpN.get(id) ?? 0) > 0,
        hasFunded: (paidN.get(id) ?? 0) > 0,
        hasInbox: (inboxN.get(id) ?? 0) > 0,
        sourced: sourcedN.get(id) ?? 0,
        withClient: withClient.get(id) ?? 0,
        approved: approvedN.get(id) ?? 0,
        hasSequence: (seqN.get(id) ?? 0) > 0,
        campaignActive: (activeN.get(id) ?? 0) > 0,
        pendingDrafts: queueN.get(id) ?? 0,
        repliesOpen: repliesOpen.get(id) ?? 0,
        isDemo,
      })
      return {
        id, company_name: (c.company_name as string | null) ?? null,
        industry: c.industry ?? null, country: c.country ?? null,
        is_demo: isDemo, house_or_demo: isDemo || excluded.has(id),
        // C6 — the raw field, not a pre-computed badge: `vatBadge` is shared, so the SCREEN
        // decides how to say it and the API never grows a second opinion about VAT status.
        vat_number: (c.vat_number as string | null) ?? null,
        wallet_balance_usd: Number((c.wallet_balance_usd as number | null) ?? 0),
        counts: {
          sourced: sourcedN.get(id) ?? 0,
          with_client: withClient.get(id) ?? 0,
          approved: approvedN.get(id) ?? 0,
        },
        // WHERE THEY ARE ON THEIR $99 — the operator needs to see the pack running out
        // BEFORE it does, because that is the moment the client starts paying $4 a lead.
        // Free to compute: paid + approved are already counted above.
        // NAMES PER APPROVAL, measured (founder-locked 25 Jul: plan on 2, let Vida measure).
        // Every name costs $0.28 whether they approve it or not, so this ratio is what the
        // cashflow model rests on — and it stays honestly "too early" until there is enough
        // of it to trust.
        ratio: namesPerApproval(allLeadsN.get(id) ?? 0, approvedN.get(id) ?? 0),
        // #619 — REAL MONEY, A COMP, OR NOTHING. `hasFunded` above stays as it is (a comp
        // entitles, and flipping it would send the house account back to "chase their $299");
        // this is the DISPLAY truth sitting next to it, so Vida can tick "Comped" instead of
        // claiming a payment nobody made.
        funded_via: fundedVia(ledgerByClient.get(id) ?? []),
        // #623 — NET CASH RECEIVED, counted off the ledger. The board used to compute this as
        // `$299 + (approved − 100) × $4`, so a free #424 charge-once approval printed money
        // that never arrived. Counted, never calculated.
        money_in_usd: moneyInUsd(ledgerByClient.get(id) ?? []),
        // 30 days without an approval and the nightly check suspends them — we carry a
        // warmed sender for them the whole time. Shown here so it's never a surprise.
        // Via `coldView`, NOT `coldState`: the exemption belongs to every surface that shows a
        // human a verdict, and this endpoint feeding the raw clock to the board is what put a
        // SUSPEND badge on our own exempt account (#619).
        cold: coldView({
          lastApprovalAt: lastApproval.get(id) ?? null,
          now: coldNow,
          clientId: id,
          isDemo,
          houseClientId,
        }),
        pack: (() => {
          const st = packState((paidN.get(id) ?? 0) > 0, approvedN.get(id) ?? 0)
          return { active: st.active, included: st.included, left: st.left, label: packLabel(st) }
        })(),
        next,
      }
    })

    // Blended across the whole book — the per-client reading is noisy on small numbers, and
    // THIS is the figure that belongs in the cashflow lab. Excludes demos and house accounts,
    // which don't buy data on the same terms.
    const real = rows.filter(c => c.is_demo !== true && !excluded.has(c.id as string)).map(c => c.id as string)
    const blended = namesPerApproval(
      real.reduce((s, id) => s + (allLeadsN.get(id) ?? 0), 0),
      real.reduce((s, id) => s + (approvedN.get(id) ?? 0), 0),
    )

    res.json({ success: true, data: sortByUrgency(out), meta: { ratio: blended } })
  } catch (err) {
    console.error('[operator/worklist]', err)
    res.status(500).json({ success: false, error: 'Failed to load the worklist' })
  }
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
      .select('id, first_name, last_name, company, job_title, score, status, surfaced_for_approval_at', { count: 'exact' })
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
    // Cards include NO-SHOWS as well as confirmed: a no-show is the booking that most needs
    // attention, and filtering to 'confirmed' made it vanish from the console entirely — so
    // the two goodwill rebooks and the client notice could never be reached from here.
    // The COUNT stays confirmed-only, because the pipeline column is a funnel stage.
    const [bookedRows, confirmedCount] = await Promise.all([
      db.from('calendar_bookings')
        .select('id, lead_id, meeting_title, start_time, status, no_show_at, rebook_count')
        .eq('client_id', cid).in('status', ['confirmed', 'no_show'])
        .order('start_time', { ascending: true }).limit(SAMPLE),
      db.from('calendar_bookings').select('id', { count: 'exact', head: true })
        .eq('client_id', cid).eq('status', 'confirmed'),
    ])
    const bookedLeadIds = Array.from(new Set((bookedRows.data ?? []).map((b: { lead_id: string }) => b.lead_id).filter(Boolean)))
    const bookedLeadNames = bookedLeadIds.length > 0
      ? await db.from('leads').select('id, first_name, last_name, company').in('id', bookedLeadIds)
      : { data: [] }
    const nameById = new Map((bookedLeadNames.data ?? []).map((l: Record<string, unknown>) => [l.id as string, l]))
    const bookedCards = (bookedRows.data ?? []).map((b: Record<string, unknown>) => {
      const l = nameById.get(b.lead_id as string) as Record<string, unknown> | undefined
      return { id: b.id, lead_id: b.lead_id, start_time: b.start_time,
        status: b.status ?? null, no_show_at: b.no_show_at ?? null,
        rebook_count: (b.rebook_count as number | null) ?? 0,
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
        booked:        { count: confirmedCount.count ?? 0, cards: bookedCards },
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

    // #612 — anything that puts this campaign LIVE passes the copy gate first. Checked on the
    // patch's status rather than on the route, because this one endpoint both creates active
    // campaigns and resumes paused ones.
    const goesLive = b.campaign_id ? patch.status === 'active' : true
    if (goesLive) {
      const gate = await sequenceGateFor(client.id, b.campaign_id as string | undefined)
      if (!gate.ok) { res.status(422).json({ success: false, error: gate.error, violations: gate.violations }); return }
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
      // #564 — this recorded `pause_campaign` for EVERY save, so a rename or a resume was
      // logged as a pause. The action is now derived from what the patch actually does.
      await writeOperatorAudit({
        operatorEmail: operatorEmail(req), clientId: client.id,
        action: campaignAuditAction({ isNew: false, nextStatus: patch.status as 'active' | 'paused' | undefined }),
        subjectType: 'campaign', subjectId: data.id,
        detail: { edited: true, co_pilot: wantCoPilot ?? null, status: patch.status ?? null },
      })
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

// ── "ASSIGN PEOPLE TO A CAMPAIGN" — DELETED 25 Jul (flow v2) ─────────────────────
// One ICP = one campaign, so a person's campaign is decided by the ICP that found them and
// there is nothing left to assign. More importantly this route enrolled and SENT with
// `prepaid: true` — asserting the $4 had been taken when it had not — so it could email a
// prospect before the client had seen, approved or paid for them. The client's 👍 is the
// only thing that starts work.

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

    // ONE FIXED TEST INBOX (flow v2). It used to fall back to whoever was logged in, which
    // makes spam placement unjudgeable — a message that lands in one operator's Gmail and
    // another's Outlook tells you nothing. Same inbox every time, unless explicitly overridden.
    const TEST_INBOX = process.env.TEST_INBOX_EMAIL || 'hello@get-kind.com'
    const to = (to_email && to_email.includes('@')) ? to_email : TEST_INBOX
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
      .select('id, first_name, last_name, job_title, company, industry, country, score, status, email, revealed_at, icp_id, surfaced_for_approval_at')
      .eq('client_id', client.id).neq('status', 'passed')
      .order('score', { ascending: false, nullsFirst: false }).limit(200)

    // ⚑ flow v2 gap: `leads.icp_id` is filled at sourcing and the People tab threw it away,
    // so a client with two ICPs saw one flat list with no way to tell which targeting found
    // whom. Names resolved in ONE query rather than per lead.
    const icpIds = [...new Set((leads ?? []).map((l: { icp_id?: string | null }) => l.icp_id).filter(Boolean))] as string[]
    const icpNames = new Map<string, string>()
    if (icpIds.length > 0) {
      const { data: icpRows } = await db.from('icps').select('id, name').in('id', icpIds)
      for (const r of (icpRows ?? []) as Array<{ id: string; name: string | null }>) icpNames.set(r.id, r.name ?? 'Untitled ICP')
    }

    // The same top-20-by-score rule the client sees in Milla, so both consoles agree on
    // which people we said we'd start with. Derived at read time — no column to go stale.
    const recommended = new Set(
      [...(leads ?? [])]
        .filter((l: Record<string, unknown>) => !!l.surfaced_for_approval_at)
        .sort((a: Record<string, unknown>, b: Record<string, unknown>) => Number(b.score ?? 0) - Number(a.score ?? 0))
        .slice(0, 20).map((l: Record<string, unknown>) => l.id as string),
    )

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
        icp_name: l.icp_id ? (icpNames.get(l.icp_id as string) ?? null) : null,
        recommended: recommended.has(l.id as string),
      })),
    })
  } catch (err) { console.error('[operator/people]', err); res.status(500).json({ success: false, error: 'Failed to load people' }) }
})

// V14 — who is actually IN this campaign, and where each of them is in the sequence.
// ── #620 — THE LAST ENROL RUN, AND WHO IT REFUSED ─────────────────────────────────────────
//
// The enrol paths name every refusal and return it in their response. Nothing rendered it, so on
// send-day "every draft was refused" and "nothing happened" looked identical on this board. A
// toast is not enough: it is gone on refresh, and a cron-triggered enrol never showed one at all.
// This reads the `enrol_skips` trail (#620) so the last run's refusals are on the screen the
// operator actually watches.
operatorRouter.get('/enrol-skips', async (req: Request, res: Response) => {
  try {
    const clientId = String(req.query.client_id ?? '').trim()
    if (!clientId) { res.status(400).json({ success: false, error: 'client_id is required' }); return }
    const { data, error } = await db.from('operator_audit_log')
      .select('created_at, detail, subject_id')
      .eq('client_id', clientId).eq('action', 'enrol_skips')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    // A missing trail is NOT an error — most runs refuse nobody, and that is the good case.
    if (error) { res.json({ success: true, data: null }); return }
    res.json({ success: true, data: data ?? null })
  } catch (err) {
    console.error('[operator/enrol-skips]', err)
    res.status(500).json({ success: false, error: 'Failed to read the enrol trail' })
  }
})

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

// ── #612 — THE SEQUENCE QUALITY GATE, ASKED ONCE AND ASKED THE SAME WAY ─────────────────
//
// Founder-ruled 4 Aug: *"shit emails out = zero meetings booked. for all clients."* The four
// Google boxes finish warming ~25 Aug, and the FIRST sends out of them set those domains'
// reputation permanently — so the gate has to exist before the boxes do, not after.
//
// ⚠️ ONE HELPER, THREE ACTIVATION ROUTES. A campaign can be switched live from three separate
// places (`/campaign/save` creating or patching to active, `/campaign/:id/status`, and
// `/campaign/start`), and a gate wired into two of them is not a gate — it is a detour sign.
// Every one calls THIS, so a fourth route added later fails the wiring test rather than
// silently opening a hole.
//
// It reads the client's most recent sequence — the same row `smartlead-send.ts` and
// `instantly-push.ts` read (`client_id`, newest first), because the copy that would actually
// leave is the only copy worth judging.
//
// FAILS OPEN ON A READ ERROR, DELIBERATELY, and this is the one judgement call in the file:
// if the sequence table cannot be READ we do not know the copy is bad, and refusing to start a
// campaign because the database hiccuped would make an outage look like a copy problem — the
// #565 shape. A missing sequence is likewise not this gate's business: `smartlead-send` already
// refuses `no_sequence` at the point of sending, which is where that belongs.
// ⚠️ IT JUDGES THE APPLIED SEQUENCE, NOT THE NEWEST SAVED ONE (#612 Part B).
//
// This first shipped reading the client's most recent `figsy_sequences` row. But a campaign
// carries an APPLIED sequence — `figsy.ts` writes `settings.sequence` + `applied_sequence_id`
// when a sequence is put on a campaign — and the two are not the same row. Save a clean new
// draft while an older bad one is still applied and the gate green-lit copy that was never
// going to send, while the copy that WAS going to send went unread. The gate has to judge what
// will actually leave.
//
// `campaignId` is optional because `/campaign/start` has no campaign yet; there the newest
// saved row is the only thing to judge, and it is the right thing to judge.
async function sequenceGateFor(clientId: string, campaignId?: string | null): Promise<{ ok: true } | { ok: false; error: string; violations: unknown[] }> {
  const { lintSequence, refusalMessage } = await import('../lib/sequence-quality')

  let steps: Record<string, unknown>[] = []
  if (campaignId) {
    const { data: camp } = await db.from('figsy_campaigns')
      .select('settings').eq('id', campaignId).eq('client_id', clientId).maybeSingle()
    const applied = (camp?.settings as { sequence?: unknown } | null)?.sequence
    if (Array.isArray(applied)) steps = applied as Record<string, unknown>[]
  }

  if (steps.length === 0) {
    const { data, error } = await db.from('figsy_sequences')
      .select('steps').eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error || !data) return { ok: true }
    steps = Array.isArray(data.steps) ? (data.steps as Record<string, unknown>[]) : []
  }

  const report = lintSequence(steps as never)
  if (report.ok) return { ok: true }
  return { ok: false, error: refusalMessage(report), violations: report.hardFails }
}

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

    // #612 — THE AI'S OWN DRAFT GOES THROUGH THE SAME GATE. If FIGSY could propose copy the
    // gate would later refuse, the operator would approve a draft that cannot be activated and
    // find out one screen later — and worse, a draft arriving from "the AI" carries an
    // authority a hand-typed one does not, which is exactly when a bad email gets waved past.
    const { lintSequence } = await import('../lib/sequence-quality')
    const quality = lintSequence(steps as never)

    res.json({
      success: true,
      data: {
        name: camp?.name ? `${camp.name} — 3 touches` : '3-touch sequence',
        steps,
        quality,
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

    // #612 — the verdict travels with the preview, because this is the screen an operator
    // reads just before pressing Run.
    //
    // ⚠️ LINTED ON THE RAW STEPS, NOT ON `rendered`. The rendered copy has had its tokens
    // FILLED from a sample lead, so "Hi {{first_name}}" has already become "Hi Alex" —
    // linting that would report the template as un-personalised on every single preview, and a
    // rule that cries wolf on correct copy is a rule the operator learns to ignore.
    const { lintSequence } = await import('../lib/sequence-quality')
    const quality = lintSequence(raw as never)

    res.json({ success: true, data: { name: seq.name, steps: rendered, sample_lead: lead, quality } })
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
    // ── WHAT THE CLIENT SAID UNPROMPTED ───────────────────────────────────────────
    // Everything above needs US to have asked first. A client who opens Milla and types
    // "pause my campaign" produced nothing here — their one channel was invisible, on a
    // service where asking us IS how anything gets done.
    //
    // Unprompted = a client message with no open ask above it. Newest first, and only the
    // last 7 days, because a fortnight-old question is history rather than a to-do.
    const weekAgo = Date.now() - 7 * 86_400_000
    const unprompted: { id: string; content: string; at: string }[] = []
    let inAsk: boolean = false
    for (const m of asc) {
      if (m.role === 'assistant' && m.content.startsWith(ASK_PREFIX)) inAsk = true
      else if (m.role === 'assistant') inAsk = false
      else if (m.role === 'user' && !inAsk && new Date(m.created_at).getTime() > weekAgo) {
        unprompted.push({ id: m.id, content: m.content.slice(0, 1000), at: m.created_at })
      }
    }

    res.json({
      success: true, data: asks.reverse().slice(0, 20), window: WINDOW,
      from_client: unprompted.reverse().slice(0, 20),
    })
  } catch (err) { console.error('[operator/asks]', err); res.status(500).json({ success: false, error: 'Failed to load asks' }) }
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
// #298 — THE BACKUP MANIFEST. Every table and its exact row count, right now.
//
// This is the piece a restore drill cannot work without and which does not exist today:
// **nobody knows what "restored correctly" would look like.** Press restore, get a green
// tick, and there is no way to tell whether you got everything, half of it, or last week's
// copy. Take a manifest now, take another after any restore, compare — that comparison IS
// the drill; the button is not.
//
// Counts come from a real COUNT(*) per table rather than the planner's `reltuples` estimate,
// which is only as fresh as the last ANALYZE and can be wrong by thousands on a table that
// has just been restored. An estimate would make a broken restore look fine.
//
// CARRIES NO DATA, deliberately. An endpoint that dumped rows would be one URL that
// exfiltrates the entire customer database — including client_inboxes, which #554b found
// with no row-level security at all. Counts prove completeness without moving a single
// personal detail.
operatorRouter.get('/backup/manifest', async (_req: Request, res: Response) => {
  try {
    const { readLiveTableCounts } = await import('../lib/backup-live')
    const manifest = await readLiveTableCounts()
    await writeOperatorAudit({
      operatorEmail: operatorEmail(_req), clientId: null, action: 'backup_manifest',
      subjectType: 'backup', subjectId: null,
      detail: { tables: manifest.totalTables, rows: manifest.totalRows, host: manifest.host },
    })
    res.json({ success: true, data: manifest })
  } catch (err) {
    console.error('[operator/backup-manifest]', err)
    // Never an empty manifest. A manifest that failed to build, saved as the reference for a
    // future restore, would make an empty database compare clean.
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Could not take a manifest' })
  }
})

// #329 — THE SEED-DATA REPORT. READ-ONLY, ALWAYS SAFE.
//
// The plan is docs/SEED-WIPE-PLAN.md; this is the part that reads production and says what
// would actually be touched. It deletes nothing and can be run at any time.
//
// The classification (lib/seed-wipe.ts) protects, in order: any client with a real payment,
// any client holding leads with real addresses, the house account, and the demo. Real money
// outranks `is_demo` deliberately — the flag is a human's opinion and a Stripe-referenced
// ledger row is a fact, and on a destructive path the fact has to win.
operatorRouter.get('/seed-report', async (_req: Request, res: Response) => {
  try {
    const { buildReport } = await import('../lib/seed-wipe')
    type SeedCandidate = import('../lib/seed-wipe').SeedCandidate
    const { resolveHouseUserIds, HOUSE_ACCOUNT_EMAIL } = await import('../lib/real-clients')
    const { PURCHASE_TX_TYPES } = await import('../lib/onboarding-pack')

    const { data: clients, error } = await db.from('clients').select('id, company_name, is_demo, user_id')
    if (error) throw error

    const houseIds = await resolveHouseUserIds()
    const candidates: SeedCandidate[] = []
    for (const c of (clients ?? []) as { id: string; company_name: string | null; is_demo: boolean | null; user_id: string | null }[]) {
      // A real payment = a purchase-type ledger row carrying a provider reference. A
      // manual_grant is NOT real money, which is why PURCHASE_TX_TYPES is used rather than
      // PAID_TX_TYPES — a founder-granted credit must not make a test account undeletable.
      const { count: paid } = await db.from('credit_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', c.id).in('type', PURCHASE_TX_TYPES).not('reference', 'is', null)
      // Real leads = anything not on a .invalid address. Every seeded person uses .invalid
      // by construction (demo-mbf.ts, seed-company.ts), so this separates invented people
      // from real ones without trusting a flag.
      const { count: realLeads } = await db.from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', c.id).not('email', 'is', null).not('email', 'like', '%.invalid')
      candidates.push({
        id: c.id,
        company_name: c.company_name,
        is_demo: c.is_demo,
        email: c.user_id && houseIds.has(c.user_id) ? HOUSE_ACCOUNT_EMAIL : null,
        realPayments: paid ?? 0,
        realLeads: realLeads ?? 0,
      })
    }

    const report = buildReport(candidates, new Set([HOUSE_ACCOUNT_EMAIL]))
    res.json({ success: true, data: { ...report, checked_at: new Date().toISOString() } })
  } catch (err) {
    console.error('[operator/seed-report]', err)
    // Never an empty pass. A report that could not be produced must not read as "nothing to
    // clean" — that is the reading that gets somebody to arm the wipe on bad information.
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Could not build the seed report' })
  }
})

// #554 — RLS AUDIT, READ FROM THE LIVE DATABASE.
//
// Read-only: two SELECTs against pg_catalog. It changes nothing, so it is safe to run at any
// time — and it is the only way to get a TRUE verdict per table. The repo has three
// migration directories and two disagreeing schema snapshots, and #558 is the standing
// finding that none of them describes production. `docs/RLS-AUDIT.md` records what the FILES
// say; this endpoint says what the DATABASE says, and where they differ the database wins.
operatorRouter.get('/rls-audit', async (_req: Request, res: Response) => {
  try {
    const { readLiveRls } = await import('../lib/rls-live')
    const { verdictFor, summarise, VERDICT_ORDER, BROWSER_READ_TABLES } = await import('../lib/rls-audit')
    const live = await readLiveRls(null)
    const browserReads = new Set<string>(BROWSER_READ_TABLES)
    const verdicts = live.states
      .map(s => verdictFor(s, browserReads.has(s.tablename)))
      .sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || a.tablename.localeCompare(b.tablename))
    res.json({
      success: true,
      data: {
        verdicts,
        summary: summarise(verdicts),
        tables_read: live.states.length,
        host: live.host,
        checked_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[operator/rls-audit]', err)
    // NOT-MEASURED, never a green. A security check that cannot reach the database must say
    // so — reporting "no problems found" because the query failed is the worst possible lie
    // on this particular screen.
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Could not read RLS state' })
  }
})

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
// ── THE SYSTEM CHECK — everything live, both halves, one call ─────────────────────
//
// Founder's spec, 26 Jul: *"I want to know everything live reported back through one check.
// reports back errors of state."* Plus the integrity check — what the already-shipped bugs
// actually did, and to whom.
//
// READ-ONLY. Every row is CHECKED-OK / CHECKED-BROKEN / NOT-MEASURED with a reason, and
// nothing is green unless it was really probed. Provider probes use each vendor's cheapest
// free endpoint; PDL is deliberately NOT called, because every PDL request costs money and a
// health report must not spend to prove a key works.
//
// Slow by design (it makes real network calls), so it runs on demand from a button — never
// on page load.
operatorRouter.get('/system', async (_req: Request, res: Response) => {
  try {
    const { runSystemCheck } = await import('../lib/system-probes')
    const { tally, systemHeadline } = await import('../lib/system-check')
    const { runIntegrity } = await import('../lib/integrity')

    // Integrity must not be able to take the system report down, and vice versa.
    const [sections, integrity] = await Promise.all([
      runSystemCheck(),
      runIntegrity().catch(e => ({
        checks: [], summary: { critical: 0, high: 0, medium: 0, clean: 0, unknown: 1 },
        headline: `The integrity check could not run: ${e instanceof Error ? e.message : String(e)}`,
      })),
    ])
    const totals = tally(sections)
    res.json({ success: true, data: {
      generated_at: new Date().toISOString(),
      totals,
      headline: systemHeadline(totals),
      sections,
      integrity,
    } })
  } catch (err) {
    console.error('[operator/system]', err)
    res.status(500).json({ success: false, error: 'The system check itself failed — that is a finding, not a clean result.' })
  }
})

// ── #626 — THE PDL MONTHLY CAP, SET FROM VIDA ─────────────────────────────────────────────
//
// The System check reported "no usable pdl_monthly_cap_usd setting exists" and told the operator
// to set it — with no way to do so. It needed SQL, and the Supabase dashboard is locked. A screen
// that names a fix nobody can perform is worse than one that stays quiet: it reads as neglect.
//
// A DATA write to a table that already exists. Migrations stay frozen. Admin-gated like every
// route on this router (`adminKeyValid`, applied at the top).
operatorRouter.get('/settings/pdl-cap', async (_req: Request, res: Response) => {
  try {
    const { PDL_MONTHLY_CAP_KEY } = await import('../lib/app-settings')
    const { data, error } = await db.from('app_settings')
      .select('value').eq('key', PDL_MONTHLY_CAP_KEY).maybeSingle()
    if (error) {
      // #627 — the table missing is a DIFFERENT problem from the database being unwell, and the
      // card must say which: one is "run a migration", the other is "try again".
      const { isMissingTable } = await import('../lib/schema-probe')
      res.status(500).json({
        success: false,
        error: isMissingTable(error as never)
          ? 'The app_settings table does not exist yet — run the 20260806_app_settings migration from Vida → Engine (needs DATABASE_URL fixed first, runlist A15).'
          : `Could not read the cap: ${error.message}`,
      })
      return
    }
    const raw = (data as { value?: unknown } | null)?.value
    const n = Number(raw)
    // A stored value that is not a usable number reads as UNSET here, exactly as the probe
    // treats it — the screen and the check must never disagree about whether a cap exists.
    res.json({ success: true, data: { cap_usd: Number.isFinite(n) && n > 0 ? n : null } })
  } catch (err) {
    console.error('[operator/settings/pdl-cap:get]', err)
    res.status(500).json({ success: false, error: 'Could not read the PDL cap' })
  }
})

operatorRouter.post('/settings/pdl-cap', async (req: Request, res: Response) => {
  try {
    const { PDL_MONTHLY_CAP_KEY, validateCapUsd } = await import('../lib/app-settings')
    const verdict = validateCapUsd((req.body ?? {}).cap_usd)
    if (!verdict.ok) { res.status(400).json({ success: false, error: verdict.error }); return }

    // CHECKED, never swallowed (#349): reporting a cap saved that was never written would leave
    // the founder believing sourcing is bounded when it is not.
    const { error } = await db.from('app_settings')
      .upsert({ key: PDL_MONTHLY_CAP_KEY, value: String(verdict.value) }, { onConflict: 'key' })
    if (error) { res.status(500).json({ success: false, error: `The cap was NOT saved: ${error.message}` }); return }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: null, action: 'set_pdl_cap',
      subjectType: 'setting', subjectId: PDL_MONTHLY_CAP_KEY,
      detail: { cap_usd: verdict.value },
    })

    // RE-READ rather than echo the input: the caller must see what the DATABASE holds, not what
    // we hoped to put there. An echo would hide a write that silently landed as something else.
    const { data } = await db.from('app_settings')
      .select('value').eq('key', PDL_MONTHLY_CAP_KEY).maybeSingle()
    const stored = Number((data as { value?: unknown } | null)?.value)
    res.json({ success: true, data: { cap_usd: Number.isFinite(stored) ? stored : null } })
  } catch (err) {
    console.error('[operator/settings/pdl-cap:post]', err)
    res.status(500).json({ success: false, error: 'Could not save the PDL cap' })
  }
})

operatorRouter.get('/engine', async (_req: Request, res: Response) => {
  try {
    const since = new Date(Date.now() - 7 * 864e5).toISOString()
    const midnight = new Date(); midnight.setUTCHours(0, 0, 0, 0)

    // The client_inboxes table arrives with 20260725_client_inboxes.sql, which is applied by
    // hand in Supabase. If the code ships BEFORE that SQL is run, this query errors — and a
    // 500 here would take the whole Engine page down. Degrade instead: no inbox rows, and a
    // migration_pending flag the page can explain. Everything else on the page still works.
    const [inboxes, clients, sent7, sentToday, bounced7, optOuts, opened7] = await Promise.all([
      // #552 — the SMTP columns come with it, because "has a mailbox row" and "can actually
      // send" are different questions and the page was only able to answer the first. A row
      // with no credentials is exactly the state that made "Assign pooled inbox" look like
      // it worked while the client still couldn't email anyone.
      db.from('client_inboxes')
        .select('id, client_id, email, kind, status, provider, daily_cap, warmup_started_at, warmup_ready_at, assigned_at, from_name, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc')
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

    // #552 — the password NEVER leaves this process. `describeCipher` is the only thing any
    // surface may show about it: "set · fingerprint a1b2c3d4". Enough to confirm one was
    // saved and to tell two apart; never enough to use.
    const { describeCipher, secretState } = await import('../lib/inbox-secret')
    const { pickSendingInbox, refusalLabel, boxSendVerdict } = await import('../lib/sending-inbox')
    const { warmupProgress } = await import('../lib/house-client')
    const secretOk = secretState().ok

    const rawRows = (inboxes.data ?? []) as Record<string, unknown>[]
    const now = new Date()
    const rows: Record<string, unknown>[] = rawRows.map((i: Record<string, unknown>) => {
      // #611 — the fraction is DERIVED from this row's own dates. It used to clamp the day to
      // a hardcoded 14 while the board wrote "/14" after it, so a 21-day Google box read
      // "14/14 · ready" a week before its own ready date. See `warmupProgress`.
      const warm = warmupProgress(
        i.warmup_started_at as string | null,
        i.warmup_ready_at as string | null,
        now,
      )
      const { smtp_pass_enc, ...safe } = i
      // #611 — CAN THIS ONE MAILBOX SEND? Asked of the send path itself. The board used to
      // answer a different question (`has_smtp`), which rendered a green "can send" on every
      // warming box while `pickSendingInbox` refused all of them.
      const verdict = boxSendVerdict(i as unknown as InboxRow, secretOk)
      return { ...safe, company_name: nameById.get(i.client_id as string) ?? null,
        warmup_day: warm.day, warmup_days: warm.days, warmup_ready: warm.ready,
        smtp_secret: describeCipher(smtp_pass_enc as string | null),
        can_send: verdict.canSend,
        send_block: verdict.canSend ? null : verdict.label,
        has_smtp: Boolean(i.smtp_host && i.smtp_user && smtp_pass_enc) }
    })

    // Which clients can ACTUALLY send — the same decision the send path makes, asked here so
    // the board shows the truth rather than "a row exists". Before #552 a client with a
    // credential-less mailbox counted as covered on this page and then silently sent nothing.
    const byClient = new Map<string, InboxRow[]>()
    for (const r of rawRows) {
      const k = r.client_id as string
      if (!byClient.has(k)) byClient.set(k, [])
      byClient.get(k)!.push(r as unknown as InboxRow)
    }

    // READINESS FOR EVERY CLIENT, INCLUDING THE ONES THAT CAN SEND (#552 ③).
    //
    // This used to compute only the refusals. A client that COULD send appeared nowhere on
    // the page at all — so "everything is fine" and "this client is missing for some other
    // reason" rendered identically, which is the #565 shape: absence read as health. The
    // positive verdict is now stated out loud, and `needs_inbox` is DERIVED from the same
    // list rather than computed a second time, so the two can never disagree.
    const { readinessTone, nextStepFor } = await import('../lib/house-client')
    const excluded = new Set(await getExcludedClientIds())
    const readiness = migrationPending ? [] : (clients.data ?? [])
      .filter((c: { id: string }) => !excluded.has(c.id))
      .map((c: { id: string; company_name: string | null }) => {
        const decision = pickSendingInbox(byClient.get(c.id) ?? [], secretOk)
        const reason = decision.ok ? null : decision.reason
        return {
          client_id: c.id, company_name: c.company_name,
          can_send: decision.ok,
          reason,
          why: decision.ok ? 'Can send' : refusalLabel(decision.reason),
          detail: decision.ok ? `Sending from ${decision.from}.` : decision.detail,
          tone: readinessTone(decision.ok, reason),
          next_step: nextStepFor(reason),
        }
      })
    const needsInbox = readiness.filter(r => !r.can_send)

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
      needs_inbox: needsInbox,
      // Every client's verdict, pass or fail. `needs_inbox` above is this list filtered.
      readiness,
      migration_pending: migrationPending,
      // #548 — without this key the saved passwords cannot be read, so NOTHING sends. Said
      // out loud on the page rather than discovered as a mysteriously silent outbox.
      secret_key_set: secretOk,
        // The committed migrations the runner will apply. The page used to show its "Run it
        // now" button ONLY when `migration_pending` was true — a flag derived purely from
        // whether `client_inboxes` exists. Once that one migration had run the button
        // vanished, taking every LATER migration with it: two were owed and the UI offered
        // no way to run them. The list is always sent now, so the control can always be
        // there. Every entry is idempotent, so running them again is a no-op.
        migrations: (await import('../lib/pending-migrations')).PENDING_MIGRATIONS.map(m => ({ key: m.key, title: m.title })),
    } })
  } catch (err) { console.error('[operator/engine]', err); res.status(500).json({ success: false, error: 'Failed to load engine' }) }
})

// ── #552 — SAVE THE MAILBOX'S SMTP DETAILS ─────────────────────────────────────────
//
// The gap this closes: `/inboxes/assign` created a row with an email address and nothing
// else, and the Engine page had nowhere to type the connection details. So pressing "Assign
// pooled inbox" produced a client who looked covered on the board and could still not send
// a single email — a control that promises what the endpoint doesn't do, the same class as
// the Delete button that deleted nothing and the migration card that hid itself.
//
// The password is encrypted here and never read back out. A blank `smtp_pass` means "leave
// the stored one alone", so an operator can correct a typo'd port without re-typing the
// password — the alternative is people pasting passwords more often than they need to.
operatorRouter.post('/inboxes/:id/credentials', async (req: Request, res: Response) => {
  try {
    const { client_id, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, from_name } =
      (req.body ?? {}) as Record<string, unknown>
    const client = await requireClient(client_id as string | undefined)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const host = String(smtp_host ?? '').trim()
    const user = String(smtp_user ?? '').trim()
    if (!host) { res.status(400).json({ success: false, error: 'The SMTP host is required (e.g. smtp.zoho.com)' }); return }
    if (!user) { res.status(400).json({ success: false, error: 'The SMTP username is required — usually the full email address' }); return }

    // Port and encryption mode are settled together, and NaN from an empty box must never
    // reach the transport — see `normalisePort` for why the two cannot be decided apart.
    const { normalisePort } = await import('../lib/sending-inbox')
    const { port, secure } = normalisePort(smtp_port, smtp_secure)

    const patch: Record<string, unknown> = {
      smtp_host: host,
      smtp_port: port,
      smtp_secure: secure,
      smtp_user: user,
      from_name: from_name ? String(from_name).trim() : null,
      updated_at: new Date().toISOString(),
    }

    if (typeof smtp_pass === 'string' && smtp_pass.length > 0) {
      const { secretState, encryptSecret } = await import('../lib/inbox-secret')
      const s = secretState()
      if (!s.ok) {
        // Refuse rather than store plaintext, and say exactly what to do about it.
        res.status(503).json({ success: false, error:
          'INBOX_SECRET_KEY is not set on the API, so the password cannot be encrypted — and it will never be stored unencrypted. Set it in Railway → @kind/api → Variables (generate with: openssl rand -hex 32), then save again.' })
        return
      }
      patch.smtp_pass_enc = encryptSecret(smtp_pass)
    }

    const { data, error } = await db.from('client_inboxes').update(patch)
      .eq('id', req.params.id).eq('client_id', client.id)
      .select('id, email, kind, status, smtp_host, smtp_port, smtp_secure, smtp_user, from_name').maybeSingle()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'Inbox not found for this client' }); return }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'assign_inbox',
      subjectType: 'inbox', subjectId: req.params.id,
      // The audit records THAT a password was set, never the password.
      detail: { smtp_host: host, smtp_port: port, smtp_user: user, password_changed: typeof smtp_pass === 'string' && smtp_pass.length > 0 },
    })
    res.json({ success: true, data })
  } catch (err) { console.error('[operator/inbox-credentials]', err); res.status(500).json({ success: false, error: 'Failed to save the mailbox details' }) }
})

// ── #552 — CAN THIS MAILBOX ACTUALLY LOG IN? ────────────────────────────────────────
//
// Authenticates and sends nothing. The alternative is finding out the password is wrong when
// a real prospect's email fails on a warmed mailbox, which is expensive to unwind — so this
// is the button an operator presses before a client goes anywhere near live.
operatorRouter.post('/inboxes/:id/verify', async (req: Request, res: Response) => {
  try {
    const { client_id } = (req.body ?? {}) as { client_id?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const { data, error } = await db.from('client_inboxes')
      .select('id, email, kind, status, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name')
      .eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'Inbox not found for this client' }); return }

    const { verifyInbox } = await import('../lib/mailer')
    const result = await verifyInbox(data as never)

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'assign_inbox',
      subjectType: 'inbox', subjectId: req.params.id, detail: { verified: result.ok },
    })
    // 200 either way: "we asked and it said no" is a successful check, not a server error.
    res.json({ success: true, data: result })
  } catch (err) { console.error('[operator/inbox-verify]', err); res.status(500).json({ success: false, error: 'Failed to check the mailbox' }) }
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
    // One ICP = one campaign — born together, never assigned (flow v2).
    const { ensureCampaignForIcp } = await import('../lib/start-work')
    void ensureCampaignForIcp(client.id, data.id, data.name).catch(() => {})
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

    // #612 — SAVE IS NOT BLOCKED, ACTIVATION IS. An operator must be able to save work in
    // progress; what they must not be able to do is put it in front of a stranger. So the
    // verdict rides back on the response and the refusal happens at `sequenceGateFor`.
    const { lintSequence } = await import('../lib/sequence-quality')
    const quality = lintSequence(steps as never)

    if (b.sequence_id) {
      const { data, error } = await db.from('figsy_sequences')
        .update({ name, steps, updated_at: new Date().toISOString() })
        .eq('id', b.sequence_id).eq('client_id', client.id).select('id, name').maybeSingle()
      if (error) throw error
      if (!data) { res.status(404).json({ success: false, error: 'Sequence not found' }); return }
      await writeOperatorAudit({ operatorEmail: operatorEmail(req), clientId: client.id, action: 'edit_sequence', subjectType: 'sequence', subjectId: data.id, detail: { steps: steps.length, hard_fails: quality.hardFails.length } })
      res.json({ success: true, data, quality }); return
    }

    const { data, error } = await db.from('figsy_sequences')
      .insert({ client_id: client.id, name, steps }).select('id, name').single()
    if (error) throw error
    await writeOperatorAudit({ operatorEmail: operatorEmail(req), clientId: client.id, action: 'edit_sequence', subjectType: 'sequence', subjectId: data.id, detail: { created: true, steps: steps.length, hard_fails: quality.hardFails.length } })
    res.json({ success: true, data, quality })
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

    let leadCtx = '', leadCountry: string | null = null
    if (reply.lead_id) {
      const { data: lead } = await db.from('leads')
        .select('first_name, last_name, job_title, company, industry, country').eq('id', reply.lead_id).maybeSingle()
      if (lead) {
        leadCountry = (lead.country as string | null) ?? null
        leadCtx = [lead.first_name && `Name: ${lead.first_name} ${lead.last_name ?? ''}`.trim(),
          lead.job_title && `Role: ${lead.job_title}`, lead.company && `Company: ${lead.company}`,
          lead.industry && `Industry: ${lead.industry}`].filter(Boolean).join('; ')
      }
    }
    const { data: c } = await db.from('clients')
      .select('company_name, signer_name, industry, calendar_booking_enabled, booking_url').eq('id', client.id).maybeSingle()

    // ⚑ flow v2 (step 8): "no calendar → suggest times the prospect is available." With no
    // calendar connected the only close available was a booking link the client doesn't
    // have, so the thread stalled on logistics after the prospect had already said yes.
    // Three concrete times in THEIR working day instead. Unknown country → no suggestion,
    // because a 3am proposal is worse than none.
    const hasCalendar = c?.calendar_booking_enabled === true || !!c?.booking_url
    let timeHint = ''
    if (!hasCalendar) {
      const { suggestSlots, suggestionSentence } = await import('../lib/suggest-times')
      const sentence = suggestionSentence(suggestSlots(new Date(), leadCountry))
      if (sentence) timeHint = `\n\nThey have no booking link, so CLOSE ON CONCRETE TIMES. Use exactly these, verbatim: "${sentence}"`
    }

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
        `Plain text, no subject line, no placeholders. Sign off as ${c?.signer_name ?? c?.company_name ?? 'the team'}.` +
        timeHint }],
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

    // #612 — pressing Run is an activation. Pausing is never gated: stopping a campaign with
    // bad copy is the thing we WANT to stay one click away.
    if (status === 'active') {
      const gate = await sequenceGateFor(client.id, req.params.id)
      if (!gate.ok) { res.status(422).json({ success: false, error: gate.error, violations: gate.violations }); return }
    }

    const { data: updated, error } = await db.from('figsy_campaigns')
      .update({ status }).eq('id', req.params.id).eq('client_id', client.id)
      .select('id, name, status').maybeSingle()
    if (error) throw error
    if (!updated) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    await writeOperatorAudit({
      // #564 — the Run/Pause route logged `pause_campaign` for BOTH, so pressing "Run it"
      // recorded the opposite of what happened. This is the site the founder named.
      operatorEmail: operatorEmail(req), clientId: client.id,
      action: campaignAuditAction({ isNew: false, nextStatus: status }),
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

    // #612 — this route creates the campaign ACTIVE (deliberately: a draft would leave the
    // client just as blocked), so it is an activation and takes the gate. Checked AFTER the
    // idempotent early-return above, so a client whose campaign already runs is not refused by
    // a rule that would not change anything.
    const gate = await sequenceGateFor(client.id)
    if (!gate.ok) { res.status(422).json({ success: false, error: gate.error, violations: gate.violations }); return }

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
    // "N to triage" counted replies that ARRIVED TODAY, while the client list counts replies
    // still OPEN at any age — so the header read "0 to triage" beside a client showing "152
    // replies to handle". Both numbers were right; the label was wrong. It now measures what
    // it says: open, unhandled, not noise.
    const NOISE = ['opt_out', 'unsubscribe', 'out_of_office', 'bounce']
    const [sent, openReplies, pending] = await Promise.all([
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', iso),
      db.from('figsy_replies').select('client_id, classification, qualified_at, meeting_booked_at').limit(20000),
      db.from('figsy_approval_queue').select('client_id', { count: 'exact' }).eq('status', 'pending').limit(20000),
    ])

    // Demos and house accounts are OURS — counting them put our own test noise in the
    // operator's headline numbers, which is how a real client's reply gets lost in them.
    const excluded = await getExcludedClientIds()
    const { data: demoRows } = await db.from('clients').select('id').eq('is_demo', true).limit(500)
    for (const r of (demoRows ?? []) as { id: string }[]) excluded.add(r.id)
    const ours = (cid: unknown) => !excluded.has(String(cid))

    const toTriage = ((openReplies.data ?? []) as Record<string, unknown>[]).filter(r =>
      ours(r.client_id) && !r.qualified_at && !r.meeting_booked_at
      && !NOISE.includes(String(r.classification ?? ''))).length
    const toApprove = ((pending.data ?? []) as Record<string, unknown>[]).filter(r => ours(r.client_id)).length

    res.json({
      success: true,
      data: {
        sent_today:        sent.count ?? 0,
        // Kept as `replies_today` so nothing that reads it breaks; it is now open replies.
        replies_today:     toTriage,
        pending_approvals: toApprove,
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
      .select('id, lead_id, start_time, end_time, rebook_count').eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (!booking) { res.status(404).json({ success: false, error: 'Booking not found' }); return }
    const used = (booking.rebook_count as number | null) ?? 0
    if (used >= 2) { res.status(409).json({ success: false, error: 'Two attempts used — tell the client and offer the $4 re-run.' }); return }

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
    // ⚑ flow v2 (step 8): "tell the client after two failed attempts, with the choice —
    // they pursue, or we re-run for another $4." Nothing said anything before; the booking
    // simply went quiet and the client was left assuming a meeting was still coming.
    if (used + 1 >= 2) {
      void (async () => {
        const { data: lead } = await db.from('leads')
          .select('first_name, last_name, company').eq('id', (booking as Record<string, unknown>).lead_id as string).maybeSingle()
        const who = [lead?.first_name, lead?.last_name].filter(Boolean).join(' ') || 'the prospect'
        const at  = lead?.company ? ` at ${lead.company}` : ''
        const { sendPushToClient } = await import('../lib/push')
        await sendPushToClient(client.id, {
          title: 'We tried twice — your call',
          body: `${who}${at} has missed two meetings. You're welcome to pursue them yourself, or we can re-run them for $4.`,
          url: '/milla',
        }).catch(() => {})
        const { sendFounderAlert } = await import('../lib/alerts')
        await sendFounderAlert('churn_risk', `Two no-shows — ${client.company_name ?? 'a client'} told`, [
          `${who}${at} missed two meetings; the client has been told and offered the $4 re-run.`,
          'No money moved — the original $4 stands and a re-run is a fresh charge.',
        ]).catch(() => {})
      })().catch(e => console.error('[rebook] client notice failed (non-fatal)', e))
    }

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
    // MONEY GATES THE SPEND (flow v2). PDL is billed at SOURCING, whether the client ever
    // approves anyone or not — so sourcing for a client who has never paid spends OUR money
    // on someone who may never return. This had no check at all.
    const { count: paid } = await db.from('credit_transactions').select('id', { count: 'exact', head: true })
      .eq('client_id', client.id).in('type', PAID_TX_TYPES)
    const { data: demoRow } = await db.from('clients').select('is_demo').eq('id', client.id).maybeSingle()
    if ((paid ?? 0) === 0 && demoRow?.is_demo !== true) {
      res.status(402).json({ success: false, error: `They haven’t paid the $${PACK_PRICE_USD} yet — nothing sources until it lands.` }); return
    }
    const cid = client.id
    const want = Math.max(1, Math.min(200, parseInt(String(req.query.count ?? '20'), 10) || 20))

    // Client run-cap + allowance (the real spend fence reads the same allowance).
    const { data: cs } = await db.from('clients').select('leads_per_run, sourcing_allowance, is_demo').eq('id', cid).maybeSingle()
    const leadsPerRun = (cs?.leads_per_run as number | null) ?? 20
    const allowance = (cs?.sourcing_allowance as number | null) ?? 0
    const isDemo = cs?.is_demo === true
    const count = Math.min(want, leadsPerRun)

    // #571 — THE THIRD INSTANCE, AND THE ONE THAT MADE THE OTHER TWO UNREACHABLE.
    //
    // This read was `.eq('is_active', true).maybeSingle()` with no `.limit(1)`, exactly like
    // POST /source. But this route renders Vida's "Source N leads?" CARD — the step BEFORE the
    // button. So for a client with two active ICPs the preview errored, `icp` came back null,
    // the card rendered "no active ICP", **and the Source button never appeared at all**.
    // Fixing POST /source alone would have left a working door behind a gate that refused to
    // open, for precisely the client the fix was for.
    const { data: icpRows } = await db.from('icps')
      .select('id, name, job_titles, industries, geographies, seniority_levels')
      .eq('client_id', cid).eq('is_active', true)
      .order('created_at', { ascending: false })
    const icps = ((icpRows ?? []) as Record<string, unknown>[]).filter(i => i?.id)
    if (icps.length === 0) { res.json({ success: true, data: { count, pool_free: 0, pdl_needed: 0, pdl_cost_est: 0, allowance_left: allowance, leads_per_run: leadsPerRun, capped: want > leadsPerRun, is_demo: isDemo, no_active_icp: true, icps_active: 0 } }); return }

    // The estimate is built PER ICP against the same split POST /source will actually use, so
    // the card predicts the run rather than a different run that happens to share a total.
    const { splitSourceTarget } = await import('../lib/start-work')
    const shares = splitSourceTarget(count, icps.length)

    // Mirror servePoolLeads' OR-generous candidate query (read-only, no insert), once per ICP.
    const clean = (v: string) => v.replace(/[,()*%]/g, ' ').trim()
    const candidatesFor = async (icp: Record<string, unknown>, share: number): Promise<string[]> => {
      const geos = ((icp.geographies as string[] | null) ?? []).map(clean).filter(Boolean)
      const roleOr = [
        ...((icp.job_titles as string[] | null) ?? []).map(clean).filter(Boolean).map(t => `title.ilike.*${t}*`),
        ...((icp.industries as string[] | null) ?? []).map(clean).filter(Boolean).map(i => `industry.ilike.*${i}*`),
        ...((icp.seniority_levels as string[] | null) ?? []).map(clean).filter(Boolean).map(s => `seniority.ilike.*${s}*`),
      ]
      let q = db.from('lead_pool').select('email_norm')
      if (geos.length) q = q.or(geos.map(g => `country.ilike.*${g}*`).join(','))
      if (roleOr.length) q = q.or(roleOr.join(','))
      const { data } = await q.limit(Math.max(share * 5, 50))
      return ((data ?? []) as { email_norm: string | null }[]).map(c => c.email_norm).filter((e): e is string => !!e)
    }

    const perIcp: { icp_id: string; icp_name: string | null; requested: number; pool_free: number }[] = []
    const candByIcp: string[][] = []
    for (let i = 0; i < icps.length; i++) {
      candByIcp.push(shares[i] > 0 ? await candidatesFor(icps[i], shares[i]) : [])
    }
    const allCand = [...new Set(candByIcp.flat())]

    // The owned/blocked/suppressed subtraction is fetched ONCE for the whole preview rather
    // than per ICP — same answer, N fewer round trips on a screen an operator is waiting on.
    let poolFree = 0
    {
      // (audit fix) Mirror the REAL pool serve (icps.ts servePoolLeads): a candidate is only
      // pool-eligible if the client doesn't already own it AND it's not opted-out AND not on the
      // do-not-contact suppression floor. Subtracting only owned emails over-stated pool_free and
      // under-stated the PDL cost the operator confirms — the opposite of a conservative floor.
      const { isSuppressed } = await import('../lib/suppression')
      const { data: ownedRows } = await db.from('leads').select('email').eq('client_id', cid).not('email', 'is', null)
      const owned = new Set(((ownedRows ?? []) as { email: string | null }[]).map(r => (r.email ?? '').trim().toLowerCase()).filter(Boolean))
      const blockedRows = allCand.length > 0
        ? (await db.from('opt_out_blocklist').select('email').is('opted_back_in_at', null).in('email', allCand)).data
        : []
      const blocked = new Set(((blockedRows ?? []) as { email: string | null }[]).map(r => (r.email ?? '').trim().toLowerCase()).filter(Boolean))

      // COUNTED ONCE ACROSS ICPs. Two audiences legitimately overlap — the same person can
      // match both — and the real serve would hand them over once. Without this set the
      // preview double-counts the overlap, overstates the free pool and understates the PDL
      // cost the operator is about to confirm, which is the direction that costs us money.
      const taken = new Set<string>()
      for (let i = 0; i < icps.length; i++) {
        const fresh = candByIcp[i].filter(e => {
          const norm = e.trim().toLowerCase()
          if (owned.has(norm) || blocked.has(norm) || taken.has(norm) || isSuppressed({ email: norm })) return false
          return true
        })
        const free = Math.min(fresh.length, shares[i])
        fresh.slice(0, free).forEach(e => taken.add(e.trim().toLowerCase()))
        poolFree += free
        perIcp.push({
          icp_id: String(icps[i].id), icp_name: (icps[i].name as string | null) ?? null,
          requested: shares[i], pool_free: free,
        })
      }
    }
    const pdlNeeded = isDemo ? 0 : Math.max(0, count - poolFree) // demo never hits PDL
    res.json({
      success: true,
      data: {
        count, pool_free: poolFree, pdl_needed: pdlNeeded,
        pdl_cost_est: Math.round(pdlNeeded * PDL_COST_PER_RECORD * 100) / 100,
        allowance_left: allowance, leads_per_run: leadsPerRun,
        capped: want > leadsPerRun, is_demo: isDemo,
        // `icp_name` stays for backwards compatibility (the Vida type still declares it); the
        // newest ICP's name, as before. `icps` is the honest breakdown when there are several.
        icp_name: (icps[0].name as string | null) ?? null,
        icps_active: icps.length, icps: perIcp,
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
    // MONEY GATES THE SPEND (flow v2). PDL is billed at SOURCING, whether the client ever
    // approves anyone or not — so sourcing for a client who has never paid spends OUR money
    // on someone who may never return. This had no check at all.
    const { count: paid } = await db.from('credit_transactions').select('id', { count: 'exact', head: true })
      .eq('client_id', client.id).in('type', PAID_TX_TYPES)
    const { data: demoRow } = await db.from('clients').select('is_demo').eq('id', client.id).maybeSingle()
    if ((paid ?? 0) === 0 && demoRow?.is_demo !== true) {
      res.status(402).json({ success: false, error: `They haven’t paid the $${PACK_PRICE_USD} yet — nothing sources until it lands.` }); return
    }
    if (confirm !== true) { res.status(400).json({ success: false, error: 'Sourcing spends our PDL budget — confirm required' }); return }
    const cid = client.id
    const want = Math.max(1, Math.min(200, typeof count === 'number' ? count : 20))

    // #571 — THE SAME DEFECT, ONE ROUTE OVER. This read was
    //   .eq('is_active', true).maybeSingle()   ← no .limit(1)
    // so a client with TWO active ICPs made PostgREST return "multiple rows returned", `icp`
    // came back null, and the route answered "No active ICP — set the client's targeting
    // before sourcing." The operator was sent to fix targeting that was already correct, for
    // the one client who had done MORE of it than required.
    //
    // PR #1209 fixed this shape in `lib/start-work.ts`. Adding `.limit(1)` here would have
    // stopped the error and kept the real bug: one of the client's ICPs silently never
    // sourced. So this route now does what the paid path does — every active ICP, target
    // split across them — and it imports `splitSourceTarget` rather than re-deriving the
    // arithmetic, because two copies of a split rule is how the two paths drift apart.
    const { data: icpRows } = await db.from('icps')
      .select('id, name').eq('client_id', cid).eq('is_active', true)
      .order('created_at', { ascending: false })
    const icps = ((icpRows ?? []) as { id: string; name: string | null }[]).filter(i => i?.id)
    if (icps.length === 0) { res.status(400).json({ success: false, error: 'No active ICP — set the client\'s targeting before sourcing.' }); return }

    // runIcpJob wants a userId (unused in its body, but pass the client's owner for attribution).
    const { data: owner } = await db.from('clients').select('user_id').eq('id', cid).maybeSingle()
    const userId = (owner?.user_id as string | null) || 'operator'

    const { runIcpJob } = await import('./icps')
    const { splitSourceTarget } = await import('../lib/start-work')
    const shares = splitSourceTarget(want, icps.length)

    // SEQUENTIAL, exactly as the paid path is: every run spends the same pre-funded allowance
    // through `try_spend_sourcing`, and firing them together would race that check — two runs
    // each reading "enough left" and both spending it.
    const runs: { icp_id: string; icp_name: string | null; requested: number; inserted: number; skipped: number; relaxed?: string | null; error?: string }[] = []
    for (let i = 0; i < icps.length; i++) {
      const share = shares[i]
      if (share <= 0) continue   // more ICPs than leads to fetch — an empty run helps nobody
      try {
        const r = await runIcpJob(icps[i].id, cid, userId, share)
        runs.push({ icp_id: icps[i].id, icp_name: icps[i].name, requested: share, inserted: r.inserted, skipped: r.skipped, relaxed: r.relaxed })
      } catch (e) {
        // An operator is watching this one — they pressed the button — so a failure goes back
        // in the response rather than only to a log. One ICP failing is not the whole run
        // failing: the others' people are real and already on the desk.
        const why = e instanceof Error ? e.message : String(e)
        console.error('[operator/source] ICP run failed', cid, icps[i].id, why)
        runs.push({ icp_id: icps[i].id, icp_name: icps[i].name, requested: share, inserted: 0, skipped: 0, error: why })
      }
    }

    // Only a TOTAL failure is a 500. A partial one reports what landed and what did not.
    if (runs.length > 0 && runs.every(r => r.error)) {
      res.status(502).json({ success: false, error: `Sourcing failed for all ${runs.length} ICP(s): ${runs.map(r => r.error).join(' · ')}` })
      return
    }

    // The "we widened the search" note is PER-ICP, so with several it has to say which one —
    // a bare "we relaxed the filters" is unreadable when three audiences ran and one widened.
    // Failures are a SEPARATE sentence: folding them into `relaxed` would have quietly thrown
    // away the genuine widening note, which is the operator's signal that an audience is thin.
    const widened = runs.filter(r => r.relaxed).map(r => `${r.icp_name ?? r.icp_id}: ${r.relaxed}`)
    const failed  = runs.filter(r => r.error)
    const result = {
      inserted: runs.reduce((s, r) => s + r.inserted, 0),
      skipped:  runs.reduce((s, r) => s + r.skipped, 0),
      relaxed: [
        ...(widened.length ? [widened.join(' · ')] : []),
        ...(failed.length ? [`${failed.length} of ${runs.length} ICP run(s) FAILED — see runs[]`] : []),
      ].join(' · ') || null,
    }

    // EVERYONE WE SOURCE GOES TO THE CLIENT (flow v2, founder-locked 25 Jul). The paid path
    // did this already; this manual top-up left them parked in a "sourced but not sent"
    // bucket that only cleared if an operator remembered to push each one across. Same call,
    // so both routes put people in front of the client identically.
    const { surfaceEverything, sendReadiness } = await import('../lib/start-work')
    const { surfaced, recommended } = await surfaceEverything(cid)

    // #552 — CAN THEY SEND? Reported, not enforced. Sourcing spends our data budget and fills
    // the desk; sending touches a real prospect, and that is where the fail-closed gate lives
    // (figsy.ts refuses and rolls the step back). Blocking sourcing on a mailbox would idle a
    // paying client's onboarding for a purchase we control and often make days later.
    //
    // The operator pressed this button, so the answer goes back to their screen rather than
    // waiting to be discovered when the first send silently defers.
    const readiness = await sendReadiness(cid)
    const sendWarning = readiness.canSend ? null : readiness.warning

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: cid, action: 'source_run',
      // The newest ICP stays the subject so the row is never subject-less; the full set lives
      // in `detail`, because with several ICPs "which one" is the first question afterwards.
      subjectType: 'icp', subjectId: icps[0].id,
      detail: { requested: want, inserted: result.inserted, skipped: result.skipped, note: result.relaxed, surfaced,
                // #571 — how many ICPs this actually ran across. Before this fix the answer
                // was always "one, whichever the database happened to return".
                icps_active: icps.length, icps_run: runs.length, runs,
                // Recorded on the audit row too: "we sourced 200 for a client who could not
                // send" is exactly the kind of thing worth being able to look up afterwards.
                cannot_send: sendWarning?.reason ?? null },
    })
    res.json({ success: true, requested: want, inserted: result.inserted, skipped: result.skipped,
               surfaced, recommended, note: result.relaxed, send_warning: sendWarning,
               icps_run: runs.length, runs })
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
// ── MBF — THE DEMO ACCOUNT (founder-locked 26 Jul) ────────────────────────────────────
// "5 demos = 1 sale." One demo client, one FIXED cast of forty invented people, one fixed
// story — so the pitch is a script the founder can learn rather than a different stage every
// time. Creates it if it has never existed; otherwise wipes and rebuilds it to byte-identical
// state, which is the reset you run between demos or when you've broken it mid-pitch.
//
// Nothing here can reach a real person: the client is `is_demo`, which is a hard stop inside
// the send path itself, and every address is `.invalid` (RFC 2606 — can never resolve).
operatorRouter.post('/demo/mbf/reset', async (req: Request, res: Response) => {
  try {
    const { findMbf, findAdoptableMbf, adoptAsMbf, seedMbf, MBF_NAME } = await import('../lib/demo-mbf')
    let mbf = await findMbf()

    // ADOPT BEFORE CREATING. The live account was called "MBF Demo" and was never flagged
    // `is_demo`, so `findMbf` couldn't see it AND the demo purge refused to delete it — a row
    // no control in Vida could touch, while the System screen correctly showed the missing
    // hard stop as BROKEN. Minting a second account around it would have added a stray
    // rather than fixed anything, so we take it over instead. `canAdoptAsMbf` (pure, tested)
    // refuses anything that has ever been paid for or holds a real email address.
    if (!mbf) {
      const cand = await findAdoptableMbf()
      if (cand.kind === 'refused') {
        res.status(409).json({ success: false, error:
          `There is already an account called "${cand.name}", and I will not take it over because ${cand.reason}. Nothing was changed. Rename or remove it, then run this again.` })
        return
      }
      if (cand.kind === 'adoptable') {
        const adopted = await adoptAsMbf(cand.id)
        if (!adopted.ok) { res.status(500).json({ success: false, error: `Found "${cand.name}" but ${adopted.error}` }); return }
        mbf = { id: cand.id, user_id: cand.user_id }
      }
    }

    // First run: mint the client. clients.user_id is NOT NULL and unique, so the demo needs
    // its own auth user — it never logs in through it; you open MBF from Vida.
    if (!mbf) {
      const suffix = Math.random().toString(36).slice(2, 10)
      const { data: user, error: uErr } = await db.auth.admin.createUser({
        email: `mbf-demo-${suffix}@kind-demo.internal`, password: `Demo${suffix}!`, email_confirm: true,
      })
      if (uErr || !user?.user) { res.status(500).json({ success: false, error: `Could not create the demo login: ${uErr?.message ?? 'unknown'}` }); return }

      const { data: created, error: cErr } = await db.from('clients').insert({
        user_id: user.user.id, company_name: MBF_NAME, is_demo: true,
        industry: 'Logistics', country: 'South Africa', plan: 'figsy',
        onboarded_at: new Date().toISOString(),
      }).select('id, user_id').single()
      if (cErr) { res.status(500).json({ success: false, error: `Could not create MBF: ${cErr.message}` }); return }
      mbf = { id: created.id as string, user_id: created.user_id as string }
    }

    const result = await seedMbf(mbf.id)
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: mbf.id, action: 'demo_reset',
      subjectType: 'client', subjectId: mbf.id, detail: { ...result, no_money_moved: true },
    })
    // Say so when a step failed. A confident green tick over a half-seeded demo is how you
    // find out mid-pitch that the inbox is empty.
    const ok = result.problems.length === 0
    res.json({
      success: ok, data: result,
      error: ok ? undefined : `MBF built with ${result.problems.length} problem(s): ${result.problems.join(' · ')}`,
      message: ok
        ? `MBF is ready — ${result.leads} people, ${result.waiting} waiting to be picked, ${result.replies} replies, ${result.bookings} meetings booked.`
        : undefined,
    })
  } catch (err) {
    console.error('[operator/demo-reset]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to reset the demo' })
  }
})

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

// ── SENDING HEALTH — the one glance (#576/#553) ─────────────────────────────────────────
//
// Client Zero runs on OUR engine (#577 amended 30 Jul), so when a send breaks it is our
// break to see. Founder's condition: *"we need a way to monitor the break."* The alerts are
// the push; this is the pull.
//
// Read-only over writes that already happen — no new tables, no new crons. The judgement
// (severity, expected-vs-quiet, what is unmeasurable) is pure and unit-tested in
// `lib/sending-health.ts`; this half only fetches.
//
// ⚠️ FAILED SENDS ARE NOT COUNTED HERE, DELIBERATELY. `sendSequenceEmail` deletes the
// `figsy_sent_emails` row when a send fails, so no row survives to count. Reporting 0 would
// be stating an unmeasured fact — see FAILED_NOT_MEASURED for the sentence the UI renders.
operatorRouter.get('/sending-health', async (req: Request, res: Response) => {
  try {
    const {
      measured, NOT_MEASURED, FAILED_NOT_MEASURED, BOUNCE_REASONS, OPT_OUT_REASONS,
      isSendingExpected, tallyClassifications,
    } = await import('../lib/sending-health')

    const clientId = String(req.query.client_id ?? '').trim() || null
    const now = new Date()
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

    // `figsy_sent_emails` carries no client_id — the join through leads is how the daily-cap
    // counter already does it (figsy.ts). Same shape here so the two can never disagree.
    const sentIn = async (since: string) => {
      let q = db.from('figsy_sent_emails').select('id, leads!inner(client_id)', { count: 'exact', head: true }).gte('sent_at', since)
      if (clientId) q = q.eq('leads.client_id', clientId)
      const { count, error } = await q
      if (error) throw new Error(`sent counts: ${error.message}`)
      return count ?? 0
    }

    const repliesIn = async (since: string) => {
      let q = db.from('figsy_replies').select('classification').gte('received_at', since)
      if (clientId) q = q.eq('client_id', clientId)
      const { data, error } = await q
      if (error) throw new Error(`replies: ${error.message}`)
      return (data ?? []) as { classification: string | null }[]
    }

    // The blocklist doubles as the bounce ledger: routes/figsy.ts upserts exactly
    // 'hard_bounce' | 'spam_complaint' | 'list_unsubscribe' as the reason. NOT client-scoped —
    // the blocklist is global by design (one opt-out protects every client), so these two
    // numbers are house-wide even when a client filter is applied. Said on screen.
    const blocklistIn = async (since: string, reasons: readonly string[]) => {
      const { count, error } = await db.from('opt_out_blocklist')
        .select('email', { count: 'exact', head: true })
        .in('reason', [...reasons]).gte('created_at', since)
      if (error) throw new Error(`blocklist (${reasons.join('/')}): ${error.message}`)
      return count ?? 0
    }

    const windowFor = async (since: string) => {
      const [sent, replyRows, bounced, optOuts] = await Promise.all([
        sentIn(since), repliesIn(since),
        blocklistIn(since, BOUNCE_REASONS), blocklistIn(since, OPT_OUT_REASONS),
      ])
      return {
        sent: measured(sent),
        failed: NOT_MEASURED(FAILED_NOT_MEASURED),
        bounced: measured(bounced),
        optOuts: measured(optOuts),
        replies: measured(replyRows.length),
        repliesByClass: tallyClassifications(replyRows),
      }
    }

    // Is sending expected? Three reads, and every one of them is a reason the operator can act
    // on rather than a bare boolean.
    const [{ count: activeCampaigns }, { count: enrollmentsDue }] = await Promise.all([
      db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('figsy_enrollments').select('id', { count: 'exact', head: true })
        .in('status', ['enrolled', 'in_progress']).lte('next_send_at', now.toISOString()),
    ])
    const expected = isSendingExpected({
      autoOutreachEnabled: process.env.AUTO_OUTREACH_ENABLED === 'true',
      activeCampaigns: activeCampaigns ?? 0,
      enrollmentsDue: enrollmentsDue ?? 0,
    })

    const [today, last7] = await Promise.all([windowFor(startOfToday), windowFor(sevenDaysAgo)])

    res.json({
      success: true,
      data: {
        today, last7,
        // Empty until failures are recorded at all — NOT an assertion that none happened.
        recentFailures: [],
        sendingExpected: expected.expected,
        sendingExpectedWhy: expected.why,
        blocklistIsGlobal: true,
        generated_at: now.toISOString(),
      },
    })
  } catch (err) {
    console.error('[operator/sending-health]', err)
    // A failed load must reach the UI as an ERROR, never as an empty report the panel would
    // render as zeros (#565).
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to load sending health' })
  }
})

// ── CSV LEAD IMPORT (#549 amended 30 Jul) ───────────────────────────────────────────────
//
// Client Zero's prospects arrive as an Apollo CSV export from the founder's own account.
// Our engine can only mail what is in our tables, so without this the leads exist in a
// spreadsheet and nowhere the product can reach.
//
// ⚠️ WHY NOT REUSE `POST /figsy/webhook/enrol` (#250), the only other inbound lead path:
// it authenticates with a per-CLIENT developer key, enrols straight into a campaign, and
// **CHARGES on the way in** (`chargeFigsyEnroll`, charge-first #310/#332). Pushing a
// thousand prospects through it would bill for a thousand leads nobody approved. Approve
// is the only money event, and this route touches no money at all.
//
// The gates are NOT reimplemented here — the judgement lives in `lib/lead-import.ts`,
// pure and unit-tested, and mirrors the pool-serve sequence in `routes/icps.ts`. This half
// only reads the two sets from the database and writes the rows.
// ── #631 — ENROL A STRANDED PAID LEAD ────────────────────────────────────────────────────
//
// The integrity panel has a HIGH row: *"N paid lead(s) are in NO sequence — charged for work
// that never started."* Both alerts in `approve-lead.ts` end *"enrol it from Vida"* — and
// until now **there was no operator control to do that.** The two enrol routes on the figsy
// router are CLIENT-authed and take a campaign id. A screen naming a fix nobody can perform is
// the #626 defect, and this closes it.
//
// ⚠️ IT GOES THROUGH `autoEnrollLead`, NEVER A HAND-ROLLED INSERT. That function owns the ICP →
// campaign resolution, the PECR gate, suppression, the opt-out check and the enrollment shape.
// Writing a row directly would produce an enrolment none of those rules had seen.
//
// ⚠️ AND IT VERIFIES. `autoEnrollLead` returns `void` and its no-campaign branch RETURNS rather
// than throwing — that is precisely how #625 reported success while a lead entered nothing. So
// this re-reads `figsy_enrollments` afterwards and reports what is actually there.
//
// NO MONEY MOVES: `prepaid: true` skips the charge (the client paid at approve — M2/#424, the
// charge-once law). `force: true` matches the approve path: it enrols while the kill-switch is
// off, and the SEND still defers because `sendSequenceEmail` has its own check (S2 stands).
operatorRouter.post('/clients/:clientId/enrol-stranded', async (req: Request, res: Response) => {
  const clientId = req.params.clientId
  try {
    const { mayEnrolStranded, describeEnrolOutcome } = await import('../lib/stranded-leads')

    // ⚠️ CLIENT-SCOPED, NOT LEAD-SCOPED, BECAUSE THAT IS WHAT THE PANEL KNOWS. The integrity
    // check reports `affected` as CLIENT ids (it counts orphan leads but lists the clients), so
    // a per-lead button cannot be rendered from that row without inventing data the screen does
    // not have. This finds the same leads the check finds, the same way it finds them.
    const client = await db.from('clients').select('is_demo').eq('id', clientId).maybeSingle()
    if (client.error) { res.status(500).json({ success: false, error: `Could not read the client: ${client.error.message}` }); return }
    if (!client.data) { res.status(404).json({ success: false, error: 'No such client.' }); return }

    const leads = await db.from('leads').select('id, revealed_at')
      .eq('client_id', clientId).not('revealed_at', 'is', null).not('email', 'is', null).limit(1000)
    if (leads.error) { res.status(500).json({ success: false, error: `Could not read the leads: ${leads.error.message}` }); return }
    const rows = (leads.data ?? []) as { id: string; revealed_at: string | null }[]

    const enrolled = rows.length
      ? await db.from('figsy_enrollments').select('lead_id').eq('client_id', clientId).in('lead_id', rows.map(r => r.id))
      : { data: [] as { lead_id: string }[], error: null }
    if (enrolled.error) { res.status(500).json({ success: false, error: `Could not read enrollments: ${enrolled.error.message}` }); return }
    const has = new Set((enrolled.data ?? []).map((e: { lead_id: string }) => e.lead_id))
    const stranded = rows.filter(r => !has.has(r.id))

    if (stranded.length === 0) {
      res.json({ success: true, data: { attempted: 0, enrolled: 0, results: [], headline: 'Nothing stranded — every paid lead for this client is already in a sequence.' } })
      return
    }

    const { autoEnrollLead } = await import('../lib/figsy')
    const results: { lead_id: string; state: string; detail: string; action?: string }[] = []
    let ok = 0

    for (const lead of stranded) {
      const verdict = mayEnrolStranded({
        exists: true, isDemo: client.data.is_demo === true,
        approved: !!lead.revealed_at, alreadyEnrolled: false,
      })
      if (!verdict.ok) { results.push({ lead_id: lead.id, state: 'refused', detail: verdict.reason }); continue }

      let threw: string | null = null
      try { await autoEnrollLead(lead.id, clientId, { force: true, prepaid: true }) }
      catch (e) { threw = e instanceof Error ? e.message : String(e) }

      // ⚠️ VERIFIED, NEVER ASSUMED. `autoEnrollLead` returns void and its no-campaign branch
      // RETURNS rather than throwing — reporting success off the absence of an exception is
      // exactly how #625 told the founder a lead was approved when it had entered nothing.
      const [after, campaign] = await Promise.all([
        db.from('figsy_enrollments').select('id').eq('lead_id', lead.id).eq('client_id', clientId).limit(1).maybeSingle(),
        db.from('figsy_campaigns').select('id').eq('client_id', clientId).eq('status', 'active').limit(1).maybeSingle(),
      ])
      const outcome = describeEnrolOutcome({ enrolledAfter: !!after.data, hasActiveCampaign: !!campaign.data, threw })
      if (outcome.state === 'enrolled') ok++
      results.push({ lead_id: lead.id, state: outcome.state, detail: outcome.detail, ...('action' in outcome ? { action: outcome.action } : {}) })
    }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId, action: 'enrol_stranded',
      subjectType: 'client', subjectId: clientId,
      detail: { attempted: stranded.length, enrolled: ok, charged: false },
    })

    res.json({ success: true, data: {
      attempted: stranded.length, enrolled: ok, results,
      headline: ok === stranded.length
        ? `${ok} of ${stranded.length} enrolled. NO charge — these were already paid for. NOTHING has been sent: the kill-switch and the warming-mailbox guard both still sit in front of every send.`
        : `${ok} of ${stranded.length} enrolled — the rest are STILL stranded. Read each reason below; do not treat this as done.`,
    } })
  } catch (err) {
    console.error('[operator/enrol-stranded]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Enrol failed' })
  }
})

operatorRouter.post('/import-leads', async (req: Request, res: Response) => {
  try {
    const {
      MAX_IMPORT_ROWS, parseCsv, decideRows, toLeadRow, candidateEmails,
    } = await import('../lib/lead-import')

    const clientId = typeof req.body?.client_id === 'string' ? req.body.client_id.trim() : ''
    const csv = typeof req.body?.csv === 'string' ? req.body.csv : ''
    // A dry run answers "what would happen" before anything is written. For a thousand rows
    // that is the difference between looking and hoping.
    const dryRun = req.body?.dry_run === true

    if (!clientId) { res.status(400).json({ success: false, error: 'client_id is required' }); return }
    if (!csv.trim()) { res.status(400).json({ success: false, error: 'The file was empty — nothing to import.' }); return }

    const { data: client, error: clientErr } = await db.from('clients')
      .select('id, company_name, is_demo').eq('id', clientId).maybeSingle()
    if (clientErr) { res.status(500).json({ success: false, error: `Could not read the client: ${clientErr.message}` }); return }
    if (!client) { res.status(404).json({ success: false, error: 'No client with that id' }); return }

    // DEMO CLIENTS REFUSE, and say why. A demo account exists to be shown to a prospect with
    // fabricated data; putting real people into one means the next demo mails them.
    if (client.is_demo === true) {
      res.status(400).json({
        success: false,
        error: 'This is a DEMO client. Real people must never land in a demo account — the next demo would mail them. Pick the real client.',
      })
      return
    }

    const { headers, rows } = parseCsv(csv)
    if (rows.length === 0) {
      res.status(400).json({
        success: false,
        error: headers.length === 0
          ? 'No rows found. The file did not parse as CSV.'
          : `Found the header row (${headers.join(', ')}) but no data rows beneath it.`,
      })
      return
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      res.status(400).json({
        success: false,
        error: `${rows.length.toLocaleString()} rows — the cap is ${MAX_IMPORT_ROWS.toLocaleString()} per file. Split it and upload again.`,
      })
      return
    }

    // ── THE TWO READS THE DECISION NEEDS ────────────────────────────────────────────────
    // Both are CHECKED. A failed read here is the #349 shape at its most expensive: an empty
    // `owned` set silently duplicates the client's whole desk, and an empty `blocked` set
    // imports people who opted out. Neither may be treated as "nothing found".
    const { data: ownedRows, error: ownedErr } = await db.from('leads')
      .select('email').eq('client_id', clientId).not('email', 'is', null)
    if (ownedErr) {
      res.status(500).json({ success: false, error: `Could not read this client's existing leads, so duplicates could not be ruled out — nothing was imported. (${ownedErr.message})` })
      return
    }
    const owned = new Set(
      (ownedRows ?? []).map((r: { email: string | null }) => (r.email ?? '').trim().toLowerCase()).filter(Boolean),
    )

    // Candidate emails, chunked into the blocklist lookup. A single `.in()` with a thousand
    // addresses builds a URL long enough to be truncated by a proxy — and a truncated
    // blocklist query returns FEWER blocked rows, which fails open.
    const candidates = candidateEmails(rows)
    const blocked = new Set<string>()
    for (let i = 0; i < candidates.length; i += 200) {
      const { data: blockedRows, error: blockedErr } = await db.from('opt_out_blocklist')
        .select('email').is('opted_back_in_at', null).in('email', candidates.slice(i, i + 200))
      if (blockedErr) {
        res.status(500).json({ success: false, error: `Could not read the opt-out blocklist, so suppressed people could not be ruled out — nothing was imported. (${blockedErr.message})` })
        return
      }
      for (const b of (blockedRows ?? []) as { email: string | null }[]) {
        const e = (b.email ?? '').trim().toLowerCase()
        if (e) blocked.add(e)
      }
    }

    const { verdicts, tally } = decideRows({ rows, owned, blocked })

    // Per-row outcomes, always — a partial import reporting only a success count is the #349
    // defect in file form: 1,000 uploaded, "imported" shown, and nobody learns 300 were
    // suppressed. Trimmed for transport, not for honesty: every skipped row is named.
    const skipped = verdicts.flatMap((v, idx) =>
      v.outcome === 'imported'
        ? []
        // +2 on the index: CSV lines are 1-based and line 1 is the header, so this is the
        // number the operator will see in their spreadsheet.
        : [{ line: idx + 2, outcome: v.outcome, email: 'email' in v ? v.email : null, why: v.why }],
    )

    if (dryRun) {
      res.json({
        success: true,
        data: { dry_run: true, client: client.company_name ?? clientId, headers, total: rows.length, tally, skipped, inserted: 0 },
      })
      return
    }

    // ── THE WRITE ───────────────────────────────────────────────────────────────────────
    // Chunked, and every chunk's error is checked. On a failure we report how many rows
    // ACTUALLY landed rather than a total — the operator's next move is to re-upload the
    // same file (duplicates are caught above, so a re-run is safe), and they can only decide
    // that if the number is true.
    const accepted = verdicts.filter(v => v.outcome === 'imported').map(v => toLeadRow(v.lead, clientId))
    let inserted = 0
    for (let i = 0; i < accepted.length; i += 250) {
      const { data: ins, error: insErr } = await db.from('leads').insert(accepted.slice(i, i + 250)).select('id')
      if (insErr) {
        await writeOperatorAudit({
          operatorEmail: operatorEmail(req), clientId, action: 'import_leads_failed',
          subjectType: 'client', subjectId: clientId,
          detail: { inserted, attempted: accepted.length, error: insErr.message },
        })
        res.status(500).json({
          success: false,
          error: `The import stopped partway: ${inserted} of ${accepted.length} rows were saved before the database refused the next batch. Re-uploading the same file is safe — the rows already saved will come back as duplicates. (${insErr.message})`,
          data: { tally, inserted, skipped },
        })
        return
      }
      inserted += (ins ?? []).length
    }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId, action: 'import_leads',
      subjectType: 'client', subjectId: clientId,
      detail: { total: rows.length, inserted, ...tally },
    })

    res.json({
      success: true,
      data: { dry_run: false, client: client.company_name ?? clientId, headers, total: rows.length, tally, skipped, inserted },
    })
  } catch (err) {
    console.error('[operator/import-leads]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'The import failed' })
  }
})

// ── ① ADD A MAILBOX TO ANY CLIENT (#547/#552/#553) ──────────────────────────────────────
//
// THE GAP, and it is the kind that only shows up when you try to use the thing: the only
// control that creates an inbox row is "Assign pooled inbox", and it renders **inside the
// `needs_inbox` card** — a list built by filtering for clients that CANNOT send. So the
// instant mailbox #1 is saved with working credentials, the client leaves that list and the
// button disappears **with three mailboxes still to add.** A control that removes itself the
// moment it half-succeeds; the same shape as the migration card that hid once the first
// migration had run.
//
// It also could not set `provider`, `daily_cap`, or a status of the operator's choosing —
// `/inboxes/assign` hardcodes `active` and `/inboxes/brand` hardcodes `warming`, so which
// endpoint you call decides the state, which is backwards.
//
// This is one submit: the row AND its credentials, for any client, any number of times.
operatorRouter.post('/inboxes', async (req: Request, res: Response) => {
  try {
    const { parseMailboxInput } = await import('../lib/house-client')
    const b = (req.body ?? {}) as Record<string, unknown>

    const client = await requireClient(b.client_id as string | undefined)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const parsed = parseMailboxInput(b)
    if (!parsed.ok) { res.status(400).json({ success: false, error: parsed.errors.join(' ') }); return }
    const v = parsed.value

    // ⚠️ FAIL CLOSED ON THE KEY, BEFORE ANY ROW IS WRITTEN. Without INBOX_SECRET_KEY the
    // password cannot be encrypted, and the one thing that must never happen is storing it
    // in plaintext instead. Checked here rather than after the insert so a keyless save
    // cannot leave a credential-less row behind that reads as "added" on the board.
    let passEnc: string | null = null
    if (v.hasPassword) {
      const { secretState, encryptSecret } = await import('../lib/inbox-secret')
      const s = secretState()
      if (!s.ok) {
        res.status(503).json({ success: false, error:
          s.reason === 'missing'
            ? 'INBOX_SECRET_KEY is not set on the API, so the mailbox password cannot be encrypted — and it will never be stored unencrypted. Set it in Railway → @kind/api → Variables (generate with: openssl rand -hex 32), then save again. Nothing was written.'
            : 'INBOX_SECRET_KEY is not 64 hex characters, so the mailbox password cannot be encrypted — and it will never be stored unencrypted. Fix it in Railway → @kind/api → Variables, then save again. Nothing was written.' })
        return
      }
      passEnc = encryptSecret(String(b.smtp_pass))
    }

    // Same mailbox twice would put two rows in front of `pickSendingInbox` with no way to
    // tell which is current — and a duplicate is nearly always a re-submitted form.
    const { data: dupe, error: dupeErr } = await db.from('client_inboxes')
      .select('id, status').eq('client_id', client.id).eq('email', v.email)
      .not('status', 'in', '("released","retired")').limit(1).maybeSingle()
    if (dupeErr) { res.status(500).json({ success: false, error: `Could not check for an existing mailbox, so nothing was written (${dupeErr.message})` }); return }
    if (dupe) { res.status(409).json({ success: false, error: `${v.email} is already recorded for this client (status: ${dupe.status}). Edit that mailbox rather than adding it twice.` }); return }

    const { normalisePort } = await import('../lib/sending-inbox')
    const { port, secure } = normalisePort(b.smtp_port, b.smtp_secure)

    const now = Date.now()
    const row: Record<string, unknown> = {
      client_id: client.id,
      email: v.email,
      kind: v.kind,
      provider: v.provider,
      status: v.status,
      daily_cap: v.daily_cap,
      from_name: v.from_name,
      smtp_host: v.smtp_host,
      smtp_user: v.smtp_user,
      smtp_port: v.smtp_host ? port : null,
      smtp_secure: v.smtp_host ? secure : null,
      smtp_pass_enc: passEnc,
    }
    // A warming mailbox carries its dates so the board can show a day count. The ready date
    // is a REMINDER, not permission — #553's ladder is what says a mailbox may send.
    if (v.status === 'warming') {
      row.warmup_started_at = new Date(now).toISOString()
      row.warmup_ready_at = new Date(now + v.warmupDays * 864e5).toISOString()
    }

    // NOTE THE SELECT: `smtp_pass_enc` is absent on purpose. Even the ciphertext does not
    // leave the process — `describeCipher` is the only thing any surface may show.
    const { data, error } = await db.from('client_inboxes').insert(row)
      .select('id, email, kind, status, provider, daily_cap, from_name, smtp_host, smtp_port, smtp_secure, smtp_user, warmup_ready_at').single()
    if (error) { res.status(500).json({ success: false, error: `Could not save the mailbox: ${error.message}` }); return }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'assign_inbox',
      subjectType: 'inbox', subjectId: data.id,
      // Records THAT a password was set. Never the password, and never the ciphertext.
      detail: { email: v.email, kind: v.kind, provider: v.provider, status: v.status, password_set: v.hasPassword },
    })

    res.json({ success: true, data })
  } catch (err) {
    console.error('[operator/inboxes-add]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to add the mailbox' })
  }
})

// ── ② THE HOUSE CLIENT — Client Zero, created or adopted from Vida (#549/#593) ──────────
//
// `clients.user_id` is NOT NULL and unique, so a client row cannot be conjured out of
// nothing — it needs an auth user, and the founder already has one (`HOUSE_ACCOUNT_EMAIL`).
// The question this route answers is therefore "adopt or create", and **adopt wins**:
// signing into the portal already creates a client row, so minting a second would leave two
// accounts for one person with nothing deciding which is real. That is #584 exactly.
//
// IDEMPOTENT. Pressing it twice adopts the same row and changes nothing.
//
// ⚠️ It returns the id to PASTE NOWHERE. See HOUSE_CLIENT_ID_NOTICE — that variable gates
// the parked Instantly push (#593), not our sending, and it stays unset.
operatorRouter.post('/house-client', async (req: Request, res: Response) => {
  try {
    const {
      decideHouseClient, HOUSE_CLIENT_NAME, HOUSE_CLIENT_ID_NOTICE, HOUSE_ACCOUNT_EMAIL,
    } = await import('../lib/house-client')
    const { resolveHouseUserIds } = await import('../lib/real-clients')
    const { PAID_TX_TYPES } = await import('../lib/onboarding-pack')

    const houseUserIds = [...await resolveHouseUserIds()]
    const { data: clientRows, error: clientsErr } = await db.from('clients')
      .select('id, user_id, company_name, is_demo')
    if (clientsErr) {
      res.status(500).json({ success: false, error: `Could not read the client list, so nothing was created (${clientsErr.message})` })
      return
    }

    const decision = decideHouseClient({
      houseUserIds,
      clients: (clientRows ?? []) as { id: string; user_id: string | null; company_name: string | null; is_demo: boolean | null }[],
    })

    if (decision.action === 'refuse') {
      res.status(409).json({ success: false, error: decision.why, data: { candidates: decision.candidates ?? [] } })
      return
    }

    let clientId: string
    let created = false

    if (decision.action === 'adopt') {
      clientId = decision.clientId
      // Only write what actually needs changing — a no-op update on every press would put a
      // fresh `updated_at` on the account each time and make the audit log lie about activity.
      const patch: Record<string, unknown> = {}
      if (decision.needsUnDemo) patch.is_demo = false     // a demo account is excluded from revenue AND refused by the CSV import (#599)
      if (decision.needsRename) patch.company_name = HOUSE_CLIENT_NAME
      if (Object.keys(patch).length > 0) {
        const { error } = await db.from('clients').update(patch).eq('id', clientId)
        if (error) { res.status(500).json({ success: false, error: `Found the house account but could not update it: ${error.message}` }); return }
      }
    } else {
      const { data, error } = await db.from('clients').insert({
        user_id: decision.userId,
        company_name: HOUSE_CLIENT_NAME,
        is_demo: false,
      }).select('id').single()
      if (error || !data) { res.status(500).json({ success: false, error: `Could not create the house client: ${error?.message ?? 'no row returned'}` }); return }
      clientId = data.id as string
      created = true
    }

    // ── ENTITLEMENT ─────────────────────────────────────────────────────────────────────
    // Sourcing refuses for a client with no paid transaction (`startWorkForClient`'s money
    // gate), so Client Zero would have a mailbox and an empty desk. `manual_grant` is the
    // EXISTING comp pattern — it is already inside `PAID_TX_TYPES` precisely because "a
    // manual grant is how we comp a client or open a walkthrough account" — so this uses it
    // rather than inventing a house-only flag. It also makes `packState` active, which is
    // correct: our own first 100 approvals cost us nothing, the same as a paying client's.
    const { count: paid, error: paidErr } = await db.from('credit_transactions')
      .select('id', { count: 'exact', head: true }).eq('client_id', clientId).in('type', PAID_TX_TYPES)
    if (paidErr) { res.status(500).json({ success: false, error: `The account is ready but its entitlement could not be checked (${paidErr.message}) — press this again.` }); return }

    let granted = false
    if ((paid ?? 0) === 0) {
      const { error: grantErr } = await db.from('credit_transactions').insert({
        client_id: clientId, type: 'manual_grant', amount: 100,
        note: `[house client comp — Client Zero, opened from Vida ${new Date().toISOString()}]`,
      })
      // CHECKED, not swallowed (#349). A failed grant leaves an account that looks set up and
      // refuses to source, with nothing on screen explaining why.
      if (grantErr) { res.status(500).json({ success: false, error: `The account exists but could not be entitled to source (${grantErr.message}). Press this again — it is safe to repeat.` }); return }
      granted = true
    }

    const { sendReadiness } = await import('../lib/start-work')
    const readiness = await sendReadiness(clientId)

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId, action: 'house_client_setup',
      subjectType: 'client', subjectId: clientId,
      detail: { action: decision.action, created, granted },
    })

    res.json({
      success: true,
      data: {
        client_id: clientId,
        name: HOUSE_CLIENT_NAME,
        house_email: HOUSE_ACCOUNT_EMAIL,
        action: decision.action,
        why: decision.why,
        granted,
        can_send: readiness.canSend,
        readiness: readiness.canSend ? null : readiness.warning,
        // Travels WITH the id, every time, because the id is exactly what makes somebody
        // want to set the variable.
        house_client_id_notice: HOUSE_CLIENT_ID_NOTICE,
      },
    })
  } catch (err) {
    console.error('[operator/house-client]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Failed to set up the house client' })
  }
})

// ── SCHEMA PROBE — #558's questions, asked of the live database ─────────────────────────
//
// `docs/SCHEMA-DRIFT.md` shipped eight queries and told the founder to paste them into
// "Vida → Engine → SQL". **That screen does not exist.** The only SQL path is
// `/operator/migrations/run`, which runs reviewed constants and refuses anything else —
// correct, and not something to widen — and `DATABASE_URL` is mangled, so there is no pg
// connection either. Eight correct queries with nowhere to run them is a finding that sits
// there, and that was my error to fix.
//
// This answers SIX of the eight with the supabase-js client we already have, and no SQL:
// selecting a column that does not exist is an error with a specific code, and selecting one
// that does is a clean empty result — so the request IS the probe.
//
// ⚠️ IT ACCEPTS NO INPUT, deliberately. A probe endpoint that took a table name would be the
// arbitrary-read surface `pending-migrations.ts` refuses to be. The list is a constant.
//
// Read-only: every call is `select … limit 0` or a head count. Nothing is written, and
// nothing is read either — only whether the request could be built at all.
// ── #611 — THE HOUSE-ACCOUNT AUDIT. READ-ONLY, AND THAT IS THE POINT ──────────────────────
//
// Client Zero was ADOPTED from the founder's existing account and inherited its history: a
// multi-million-dollar test wallet, 159 approved leads, 263 enrollments, a "Suspended" badge.
// On ~25 Aug real prospecting flows into it. Nobody could say which rows were real, because
// there is NO SQL ACCESS — no dashboard, no password, `DATABASE_URL` is a placeholder. So the
// audit is an instrument the founder runs rather than a query someone types.
//
// ⚠️ GET, AND IT MUST STAY GET. Every statement below is a `.select()`. This route exists to
// let a human decide; it must never be the thing that acts. Phase B — if the founder wants one
// — is a separate PR built against his rulings, with its own gate.
operatorRouter.get('/house-audit', async (_req: Request, res: Response) => {
  try {
    const { decideHouseClient } = await import('../lib/house-client')
    const { resolveHouseUserIds } = await import('../lib/real-clients')
    const { auditRows, auditHeadline, coldCronWouldAct } = await import('../lib/house-audit')
    const { secretState } = await import('../lib/inbox-secret')

    // Resolved the SAME way the setup route resolves it — `decideHouseClient` — rather than by
    // matching the display name. `house-client.ts` is explicit that the name is "A LABEL ONLY —
    // nothing matches on it", and two resolvers that can disagree about which row is Client
    // Zero is exactly the #584 shape this audit exists to clean up after.
    const houseUserIds = [...await resolveHouseUserIds()]
    const { data: clientRows } = await db.from('clients').select('id, user_id, company_name, is_demo')
    const decision = decideHouseClient({
      houseUserIds,
      clients: (clientRows ?? []) as { id: string; user_id: string | null; company_name: string | null; is_demo: boolean | null }[],
    })
    if (decision.action !== 'adopt' || !decision.clientId) {
      res.status(404).json({
        success: false,
        error: decision.action === 'refuse'
          ? decision.why
          : 'No house client is set up yet — press "Set up the house client" first, then run the audit.',
      })
      return
    }
    const clientId = decision.clientId

    const [client, ledger, leads, enroll, sent, camps, inboxes] = await Promise.all([
      db.from('clients').select('id, company_name, is_demo, wallet_balance_usd').eq('id', clientId).maybeSingle(),
      db.from('credit_transactions').select('type, amount').eq('client_id', clientId).limit(2000),
      db.from('leads').select('status, revealed_at, surfaced_for_approval_at, created_at').eq('client_id', clientId).limit(5000),
      db.from('figsy_enrollments').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('figsy_campaigns').select('status').eq('client_id', clientId).limit(500),
      db.from('client_inboxes').select('email, kind, status, smtp_host, smtp_user, smtp_pass_enc')
        .eq('client_id', clientId).not('status', 'in', '("released","retired")').limit(50),
    ])

    const ledgerRows = (ledger.data ?? []) as Array<{ type: string; amount: number | null }>
    const byType = new Map<string, { count: number; totalUsd: number }>()
    for (const r of ledgerRows) {
      const k = String(r.type ?? 'unknown')
      const cur = byType.get(k) ?? { count: 0, totalUsd: 0 }
      byType.set(k, { count: cur.count + 1, totalUsd: cur.totalUsd + Number(r.amount ?? 0) })
    }

    const leadRows = (leads.data ?? []) as Array<Record<string, unknown>>
    const dates = leadRows.map(l => String(l.created_at ?? '')).filter(Boolean).sort()
    const approvals = leadRows.map(l => String(l.revealed_at ?? '')).filter(Boolean).sort()

    const campRows = (camps.data ?? []) as Array<{ status: string }>
    const campByStatus = new Map<string, number>()
    for (const c of campRows) campByStatus.set(String(c.status), (campByStatus.get(String(c.status)) ?? 0) + 1)

    const c = (client.data ?? {}) as Record<string, unknown>
    const facts = {
      clientId,
      companyName: (c.company_name as string | null) ?? null,
      isDemo: (c.is_demo as boolean | null) ?? null,
      walletBalanceUsd: Number((c.wallet_balance_usd as number | null) ?? 0),
      ledger: [...byType.entries()].map(([type, v]) => ({ type, ...v })),
      leadsTotal: leadRows.length,
      leadsApproved: leadRows.filter(l => !!l.revealed_at).length,
      leadsWithClient: leadRows.filter(l => !!l.surfaced_for_approval_at && !l.revealed_at && l.status !== 'passed').length,
      leadsPassed: leadRows.filter(l => l.status === 'passed').length,
      oldestLeadAt: dates[0] ?? null,
      newestLeadAt: dates[dates.length - 1] ?? null,
      enrollments: enroll.count ?? 0,
      sentEmails: sent.count ?? 0,
      campaigns: [...campByStatus.entries()].map(([status, count]) => ({ status, count })),
      inboxes: ((inboxes.data ?? []) as Array<Record<string, unknown>>).map(i => ({
        email: String(i.email), kind: String(i.kind), status: String(i.status),
        hasSmtp: Boolean(i.smtp_host && i.smtp_user && i.smtp_pass_enc),
      })),
      lastApprovalAt: approvals[approvals.length - 1] ?? null,
      // Read at request time so the panel shows the live truth, not a build-time snapshot.
      autoOutreachEnabled: String(process.env.AUTO_OUTREACH_ENABLED ?? '').toLowerCase() === 'true',
      secretKeySet: secretState().ok,
    }

    const now = new Date()
    const rows = auditRows(facts, now)
    res.json({
      success: true,
      client_id: clientId,
      headline: auditHeadline(rows),
      cold: coldCronWouldAct(facts, now),
      facts,
      rows,
      // Said out loud on every response so nobody has to infer it from the verb.
      read_only: 'This endpoint only reads. Nothing was changed by loading it.',
    })
  } catch (err) {
    console.error('[house-audit]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'audit failed' })
  }
})

// ── #611 PHASE B — THE ACTIONS THE FOUNDER RULED FOR ON 4 AUG ─────────────────────────────
//
// Phase A read and refused to act; its comment said any cleanup would be *"a separate,
// deliberate piece of work"*. This is that work. All the judgement is in `cleanup-guards.ts`,
// pure and tested; these routes do the reading, the writing and the logging around it.

/**
 * Resolve Client Zero the ONE permitted way, for the routes below.
 *
 * `decideHouseClient`, never a company-name match — `house-client.ts` is explicit that the
 * name is *"A LABEL ONLY"*, and #584/#582 were both caused by matching on one. On a route that
 * empties a wallet or refuses a delete, a second resolver that could disagree is the bug.
 */
async function resolveHouseClientId(): Promise<string | null> {
  const { decideHouseClient } = await import('../lib/house-client')
  const { resolveHouseUserIds } = await import('../lib/real-clients')
  const houseUserIds = [...await resolveHouseUserIds()]
  const { data } = await db.from('clients').select('id, user_id, company_name, is_demo')
  const decision = decideHouseClient({
    houseUserIds,
    clients: (data ?? []) as { id: string; user_id: string | null; company_name: string | null; is_demo: boolean | null }[],
  })
  return decision.action === 'adopt' ? decision.clientId : null
}

/**
 * ZERO THE HOUSE WALLET.
 *
 * The audit found `wallet_balance_usd = $3,999,038` on Client Zero against a ledger summing to
 * **−$305** (trial_bonus $20 · usage −$525 · referral_bonus $100 · manual_grant $100). The
 * balance is inherited test grants, and it is NOT cosmetic: once the onboarding pack is used,
 * `approve-lead` spends the wallet, so real approvals on this account would draw on invented
 * money and land in revenue figures.
 *
 * ⚠️ IT WRITES NO LEDGER ROW, AND THAT IS THE DESIGN. A `credit_transactions` entry for
 * −$3,999,038 would be a fabricated event: no money ever moved, so recording a movement would
 * put a lie in the one table that is supposed to be the audit trail. The balance column is
 * CORRECTED; the history is left exactly as it is. The record that this happened is the
 * `operator_audit_log` line, which is what that table is for.
 */
operatorRouter.post('/house-audit/zero-wallet', async (req: Request, res: Response) => {
  try {
    const { zeroWalletCheck } = await import('../lib/cleanup-guards')
    const houseClientId = await resolveHouseClientId()
    if (!houseClientId) {
      res.status(404).json({ success: false, error: 'No house client is set up (or the login owns more than one). Press "Set up the house client" first — this endpoint will not guess which account is ours.' })
      return
    }

    const { data: client, error: readErr } = await db.from('clients')
      .select('id, company_name, wallet_balance_usd').eq('id', houseClientId).maybeSingle()
    if (readErr || !client) {
      res.status(500).json({ success: false, error: `Could not read the house account (${readErr?.message ?? 'no row'}) — refusing to write a balance without knowing the one it replaces.` })
      return
    }

    const check = zeroWalletCheck({
      houseClientId,
      targetClientId: houseClientId,
      balanceUsd: Number((client as { wallet_balance_usd: number | null }).wallet_balance_usd ?? 0),
      typed: (req.body ?? {}).confirm,
    })
    if (!check.ok) { res.status(400).json({ success: false, error: check.why }); return }

    // CHECKED, not swallowed (#349) — supabase-js returns `{ error }` rather than throwing, so
    // an unchecked update here would report a zeroed wallet that is still $3,999,038.
    const { error: wErr } = await db.from('clients')
      .update({ wallet_balance_usd: 0 }).eq('id', houseClientId)
    if (wErr) { res.status(500).json({ success: false, error: `The wallet was NOT zeroed: ${wErr.message}` }); return }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: houseClientId, action: 'house_wallet_zeroed',
      subjectType: 'client', subjectId: houseClientId,
      detail: { from_usd: check.from, to_usd: 0, ledger_row_written: false },
    })

    res.json({
      success: true,
      data: {
        client_id: houseClientId,
        from_usd: check.from,
        to_usd: 0,
        note: 'The balance was corrected. NO ledger row was written — no money ever moved, and inventing a transaction would put a false event in the audit trail. This action is recorded in operator_audit_log.',
      },
    })
  } catch (err) {
    console.error('[house-audit/zero-wallet]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Could not zero the wallet' })
  }
})

/**
 * FUND THE HOUSE ACCOUNT — its hunting budget, through the mechanism that already exists.
 *
 * `manual_grant` is how a client is comped; it is already inside `PAID_TX_TYPES` for exactly
 * that reason, and `house-client.ts` already uses it to entitle Client Zero to source. This
 * adds the working budget on top rather than inventing a house-only money path.
 *
 * The amount is a CONSTANT, not a field on the request. An endpoint that takes an amount is a
 * "give any client any money" surface; a constant is one reviewable decision (see
 * `HOUSE_HUNTING_BUDGET_USD`).
 */
operatorRouter.post('/house-audit/grant', async (req: Request, res: Response) => {
  try {
    const { HOUSE_HUNTING_BUDGET_USD, houseGrantNote, priorHouseGrant } = await import('../lib/cleanup-guards')
    const houseClientId = await resolveHouseClientId()
    if (!houseClientId) {
      res.status(404).json({ success: false, error: 'No house client is set up. Press "Set up the house client" first.' })
      return
    }

    // ⚠️ ONCE. Without this check, every later press is another $4,000 — and we just built the
    // endpoint above to REMOVE invented money from this account. The ledger is asked, not
    // memory: it is the record that survives sessions. Answered from the rows' notes because
    // the $100 comp grant is also a manual_grant and must not block this one.
    const { data: grants, error: grErr } = await db.from('credit_transactions')
      .select('note, created_at').eq('client_id', houseClientId).eq('type', 'manual_grant').limit(200)
    if (grErr) {
      res.status(500).json({ success: false, error: `Could not read the existing grants (${grErr.message}) — refusing to grant blind, because blind is how it gets granted twice.` })
      return
    }
    const prior = priorHouseGrant((grants ?? []) as Array<{ note: string | null; created_at: string | null }>)
    if (prior.granted) {
      res.status(409).json({ success: false, error: `The hunting budget was already granted${prior.when ? ` on ${prior.when.slice(0, 10)}` : ''}. It goes on once — if the balance looks wrong, run the audit and read the ledger rather than pressing this again.` })
      return
    }

    const { error: gErr } = await db.from('credit_transactions').insert({
      client_id: houseClientId, type: 'manual_grant', amount: HOUSE_HUNTING_BUDGET_USD,
      note: houseGrantNote(new Date().toISOString()),
    })
    if (gErr) { res.status(500).json({ success: false, error: `The grant did NOT go through: ${gErr.message}` }); return }

    // The ledger row is the entitlement; the balance column is what `approve-lead` spends, so
    // both have to move or the grant is invisible to the thing it exists for. The write is the
    // ATOMIC `increment_wallet` RPC — the same mechanism every other money path uses — rather
    // than a read-then-write that can lose a concurrent update.
    const { error: bErr } = await db.rpc('increment_wallet', { p_client_id: houseClientId, p_amount: HOUSE_HUNTING_BUDGET_USD })
    if (bErr) {
      res.status(500).json({ success: false, error: `The ledger row was written but the balance was NOT updated (${bErr.message}). Do not press this again — the grant is recorded and the repeat-guard will refuse; fix the balance instead.` })
      return
    }
    const { data: c } = await db.from('clients').select('wallet_balance_usd').eq('id', houseClientId).maybeSingle()
    const after = Number((c as { wallet_balance_usd: number | null } | null)?.wallet_balance_usd ?? 0)

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: houseClientId, action: 'house_wallet_granted',
      subjectType: 'client', subjectId: houseClientId,
      detail: { amount_usd: HOUSE_HUNTING_BUDGET_USD, to_usd: after },
    })

    res.json({ success: true, data: { client_id: houseClientId, granted_usd: HOUSE_HUNTING_BUDGET_USD, to_usd: after } })
  } catch (err) {
    console.error('[house-audit/grant]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Could not grant the budget' })
  }
})

/**
 * DELETE A TEST CLIENT — rows and all.
 *
 * ⚠️ THE FIRST DELETE OF A NON-DEMO CLIENT ROW IN THE PRODUCT. `purgeDemoClient` deletes
 * clients today and refuses anything not flagged `is_demo` — its comment calls that check
 * *"the whole safety of this function"*. Stripe Test and ACME are not demo rows, so that guard
 * cannot be reused and a new one has to be at least as strong. There are four:
 *
 *   ① the classification from `seed-wipe.ts`, IMPORTED not re-implemented — real money outranks
 *     every label, then real leads, then the house account, then the demo;
 *   ② an explicit id refusal for the house account, which survives the classifier being fooled;
 *   ③ an explicit id refusal for every `is_demo` row;
 *   ④ the client's own company name, typed.
 *
 * And a fifth that is structural: the house account must RESOLVE before anything is deleted.
 * If we cannot say which row is Client Zero, we are not in a position to delete anything.
 */
operatorRouter.post('/seed-data/wipe-client', async (req: Request, res: Response) => {
  try {
    const { classify } = await import('../lib/seed-wipe')
    const { wipeClientCheck } = await import('../lib/cleanup-guards')
    const { resolveHouseUserIds, HOUSE_ACCOUNT_EMAIL } = await import('../lib/real-clients')
    const { PURCHASE_TX_TYPES } = await import('../lib/onboarding-pack')
    const { wipeMbf } = await import('../lib/demo-mbf')

    const clientId = String((req.body ?? {}).client_id ?? '').trim()
    if (!clientId) { res.status(400).json({ success: false, error: 'client_id is required.' }); return }

    const houseClientId = await resolveHouseClientId()
    if (!houseClientId) {
      res.status(409).json({ success: false, error: 'The house account could not be resolved, so nothing may be deleted. If we cannot say which row is Client Zero, we are not in a position to delete another one — set up the house client first.' })
      return
    }

    const { data: client, error: cErr } = await db.from('clients')
      .select('id, company_name, is_demo, user_id').eq('id', clientId).maybeSingle()
    if (cErr || !client) { res.status(404).json({ success: false, error: `No such client (${cErr?.message ?? 'not found'}).` }); return }
    const row = client as { id: string; company_name: string | null; is_demo: boolean | null; user_id: string | null }

    // The SAME two facts `/seed-report` gathers, gathered the same way. A purchase-type ledger
    // row carrying a provider reference is real money; a `manual_grant` is not, which is why a
    // founder-granted credit cannot make a test account undeletable.
    const houseIds = await resolveHouseUserIds()
    const { count: paid } = await db.from('credit_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).in('type', PURCHASE_TX_TYPES).not('reference', 'is', null)
    const { count: realLeads } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).not('email', 'is', null).not('email', 'like', '%.invalid')

    const classification = classify({
      id: row.id,
      company_name: row.company_name,
      is_demo: row.is_demo,
      email: row.user_id && houseIds.has(row.user_id) ? HOUSE_ACCOUNT_EMAIL : null,
      realPayments: paid ?? 0,
      realLeads: realLeads ?? 0,
    }, new Set([HOUSE_ACCOUNT_EMAIL]))

    const { data: demoRows } = await db.from('clients').select('id').eq('is_demo', true)
    const check = wipeClientCheck({
      classification,
      houseClientId,
      demoClientIds: ((demoRows ?? []) as { id: string }[]).map(d => d.id),
      typedCompanyName: (req.body ?? {}).confirm_company_name,
    })
    if (!check.ok) { res.status(400).json({ success: false, error: check.why, classification }); return }

    // ── PAST THE GUARDS. Everything below destroys data. ──────────────────────────────────
    //
    // `wipeMbf` is IMPORTED rather than re-listed. It already deletes every table a client owns
    // in child-first order, and it is the list `purgeDemoClient` uses — a second copy here
    // would silently fall behind the day a table is added, and the row it missed would be an
    // orphan pointing at a client that no longer exists.
    await wipeMbf(clientId)
    for (const t of ['figsy_memory', 'client_inboxes', 'subscriptions', 'push_subscriptions', 'milla_messages', 'milla_sessions', 'operator_audit_log']) {
      await db.from(t).delete().eq('client_id', clientId).then(() => {}, () => {})
    }
    const { error: dErr } = await db.from('clients').delete().eq('id', clientId)
    if (dErr) { res.status(500).json({ success: false, error: `The owned rows were deleted but the client row was not: ${dErr.message}` }); return }

    // The login goes too, so a deleted test account cannot be signed into and re-create itself
    // — signing in to the portal mints a client row, which is how a "deleted" account comes back.
    if (row.user_id) await db.auth.admin.deleteUser(row.user_id).then(() => {}, () => {})

    // ⚠️ WRITTEN AFTER the wipe, and deliberately NOT scoped to the deleted client — the loop
    // above clears `operator_audit_log` for that client_id, so a line written before the delete
    // would delete itself. `client_id: null` keeps the record of the deletion alive.
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: null, action: 'seed_client_wiped',
      subjectType: 'client', subjectId: clientId,
      detail: {
        company_name: row.company_name, disposition: classification.disposition,
        reason: classification.reason, real_payments: paid ?? 0, real_leads: realLeads ?? 0,
        auth_user_deleted: Boolean(row.user_id),
      },
    })

    res.json({ success: true, data: { client_id: clientId, company_name: row.company_name, deleted: true } })
  } catch (err) {
    console.error('[seed-data/wipe-client]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Could not remove the client' })
  }
})

// ── #613 — WHAT THE BANK ACTUALLY RECEIVED ───────────────────────────────────────────────
//
// Every money figure in this console is the price we QUOTED. `routes/stripe.ts` writes
// `amount` from the checkout metadata, and the subscription path writes a hardcoded constant —
// nothing has ever read `balance_transaction`. So no number here reconciles to the bank, and
// on a $299 sold in USD into a GBP account the gap is the card fee plus the currency
// conversion: roughly £210–£213 arrives against a console that says $299.
//
// This route reads the OTHER number, live from Stripe, and puts the two side by side.
// Read-only, no input but a limit, and it never writes.
//
// ⚠️ A FAILED READ IS `unknown`, NEVER `match`. If Stripe cannot be reached, the panel says so
// — an unmeasured row rendered as reconciled is the calm-green-over-nothing failure this repo
// has met four times (#565/#576/#581/#611).
operatorRouter.get('/revenue/reconcile', async (req: Request, res: Response) => {
  try {
    const { listRecentSettlements } = await import('../lib/stripe')
    const { majorUnits, reconcileVerdict } = await import('../lib/stripe-settlement')

    const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 25) || 25))
    const settlements = await listRecentSettlements(limit)
    if (settlements === null) {
      res.status(503).json({
        success: false,
        error: 'Stripe could not be read, so nothing was compared. This is NOT "everything reconciles" — it is "we could not look". Check STRIPE_SECRET_KEY and try again.',
      })
      return
    }

    const ids = settlements.map(x => x.sessionId)
    const { data: rows, error } = ids.length > 0
      ? await db.from('credit_transactions').select('reference, amount, type, note, created_at, client_id').in('reference', ids)
      : { data: [], error: null }
    if (error) { res.status(500).json({ success: false, error: `The ledger could not be read (${error.message}) — nothing was compared.` }); return }

    const byRef = new Map((rows ?? []).map((r: Record<string, unknown>) => [String(r.reference), r]))
    const out = settlements.map(s => {
      const row = byRef.get(s.sessionId) as Record<string, unknown> | undefined
      const cur = s.bt?.currency ?? null
      const gross = s.bt ? majorUnits(s.bt.amount, cur) : null
      const fee   = s.bt ? majorUnits(s.bt.fee, cur) : null
      const net   = s.bt ? majorUnits(s.bt.net, cur) : null
      const v = reconcileVerdict({
        ledgerAmountUsd: row ? Number(row.amount) : null,
        grossMajor: gross, netMajor: net, settlementCurrency: cur,
      })
      return {
        session_id: s.sessionId,
        created_at: s.created ? new Date(s.created * 1000).toISOString() : null,
        paid_amount_usd: s.amountPaidMinor != null ? majorUnits(s.amountPaidMinor, s.currencyPaid) : null,
        paid_currency: s.currencyPaid,
        ledger_amount: row ? Number(row.amount) : null,
        ledger_type: row ? String(row.type) : null,
        in_ledger: !!row,
        settlement_currency: cur,
        gross, fee, net,
        verdict: row ? v.verdict : 'unknown',
        why: row ? v.why : 'This Stripe payment has no matching ledger row. Either it was a test, or a payment was taken and never recorded — read it.',
      }
    })

    const counts = out.reduce((a, r) => { a[r.verdict] = (a[r.verdict] ?? 0) + 1; return a }, {} as Record<string, number>)
    // Fees are only summable when they are all in one settlement currency; mixing GBP and USD
    // into one total would be a number that means nothing.
    const currencies = [...new Set(out.map(r => r.settlement_currency).filter(Boolean))]
    const feeTotal = currencies.length === 1 ? out.reduce((a, r) => a + (r.fee ?? 0), 0) : null

    res.json({
      success: true,
      data: {
        rows: out,
        counts,
        fee_total: feeTotal,
        fee_currency: currencies.length === 1 ? currencies[0] : null,
        fee_note: currencies.length === 1 ? null : 'Payments settled in more than one currency, so the fees are not totalled — a mixed-currency sum would be a meaningless number.',
        checked_at: new Date().toISOString(),
        read_only: 'This endpoint only reads. Nothing was changed by loading it.',
      },
    })
  } catch (err) {
    console.error('[operator/revenue/reconcile]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Could not reconcile' })
  }
})

operatorRouter.get('/schema-probe', async (_req: Request, res: Response) => {
  try {
    const {
      PROBES, NEEDS_PG_CONNECTION, LEDGER_TYPES_TO_COUNT,
      classifyProbeError, migrationSafety,
    } = await import('../lib/schema-probe')

    const results = await Promise.all(PROBES.map(async spec => {
      try {
        // LIMIT 0 + head: PostgREST still parses and plans the select, so a missing column
        // errors — but no row is read, so no row-level policy can turn a schema question
        // into a permissions answer.
        const column = spec.kind === 'column' ? spec.column : '*'
        const { error } = await db.from(spec.table).select(column, { head: true, count: 'exact' }).limit(0)
        const r = classifyProbeError(error, spec.kind)
        return { ...spec, ...r }
      } catch (err) {
        // A throw is UNKNOWABLE, never missing. This is the branch that fires during an
        // outage, and calling it "missing" would print a schema verdict about a database we
        // could not reach (#565).
        return { ...spec, verdict: 'unknowable' as const, code: null,
          detail: err instanceof Error ? err.message : 'the probe threw and gave no reason' }
      }
    }))

    // The ledger counts that decide whether Run migrations is safe. Head counts, so no row
    // data leaves the database — only how many there are.
    const counts: Record<string, { measured: true; value: number } | { measured: false; why: string }> = {}
    for (const t of LEDGER_TYPES_TO_COUNT) {
      try {
        const { count, error } = await db.from('credit_transactions')
          .select('id', { count: 'exact', head: true }).eq('type', t)
        counts[t] = error
          ? { measured: false, why: error.message }
          : { measured: true, value: count ?? 0 }
      } catch (err) {
        counts[t] = { measured: false, why: err instanceof Error ? err.message : 'the count threw' }
      }
    }

    res.json({
      success: true,
      data: {
        probes: results,
        ledger_counts: counts,
        migration_safety: migrationSafety(counts),
        // Travels WITH the answers, so the gap is never discovered later.
        needs_pg_connection: NEEDS_PG_CONNECTION,
        generated_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[operator/schema-probe]', err)
    // A failed probe run must reach the UI as an ERROR. An empty result set would render as
    // "nothing wrong", which is the exact inversion this endpoint exists to prevent.
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'The schema probe could not run' })
  }
})
