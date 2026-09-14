import { Router, Request, Response } from 'express'
import { db } from '@kind/db'
import { normalizeRevealEmails } from '../lib/billing-rules'
import { adminKeyValid } from './admin'
import { getExcludedClientIds } from '../lib/real-clients'
import { documentReadFailure } from '../lib/document-read-failure'
import { writeOperatorAudit, campaignAuditAction } from '../lib/operator-audit'
import { PAID_TX_TYPES, CASH_TX_TYPES, packState, packLabel, PACK_PRICE_USD } from '../lib/onboarding-pack'
import { MAX_SEQUENCE_STEPS } from '@kind/shared'
import { namesPerApproval } from '../lib/money-path-math'
import { invitePartner } from '../lib/partner-invite'
import { coldView } from '../lib/cold-client'
import type { InboxRow } from '../lib/sending-inbox'
// ⚑ 14 Sep (S1-RT-005) — the fail-soft provider translation. The operator rail below is
// where a Brief we could not translate reaches a person, before Proof or any spend.
import {
  icpNeedsReview, resolveReview, type ProviderField,
} from '../lib/icp-provider-translation'

/**
 * 🛑 THE THREE CLOSED PROVIDER VOCABULARIES, IN ONE PLACE FOR THE OPERATOR RAIL.
 *
 * ⚠️ THEY ARE DECLARED HERE RATHER THAN IMPORTED FROM `routes/icps.ts` because that module
 * keeps them module-private and importing the ICP route into the operator route to reach
 * three arrays would pull a 5,000-line router in for a constant. A drift guard in
 * `s1-icp-review.test.ts` asserts these are byte-identical to the ICP route's, so the two
 * cannot disagree without a test going red — which is the property that matters, not where
 * the literal lives.
 */
const ICP_REVIEW_VOCABULARIES: Record<ProviderField, readonly string[]> = {
  industries:       ['Fintech', 'Healthtech', 'E-commerce', 'SaaS', 'Logistics', 'Agriculture', 'Education', 'Manufacturing', 'Real Estate', 'Media', 'Consulting', 'Retail', 'Banking', 'Insurance', 'Telecoms', 'Energy'],
  seniority_levels: ['C-Suite', 'VP / Director', 'Head of', 'Manager', 'Senior', 'Individual Contributor'],
  company_sizes:    ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,000+'],
}

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
// ── ⚑ MVP1 — THE PEOPLE WHO HAVE SIGNED UP BUT NOT CONFIRMED (Preview 07) ──────────────
//
// 🛑 A PROJECTION, NOT A CLIENT LIST, AND THAT IS THE WHOLE DESIGN. These rows are NOT
// clients and rendering them beside clients does not make them clients: "a client" still
// means a confirmed client in `/clients`, the worklist, the lifecycle board and every count.
// Vida's rail merges two reads; nothing downstream is asked to change its mind.
//
// ⚠️ OPEN ONLY. A promoted draft is excluded by the same condition that makes it evidence, so
// one person can never appear twice — the transition is draft row OUT, client row IN, not
// both at once.
//
// ⚠️ STAGE IS ALWAYS Brief AND THE MODE IS ALWAYS "No action needed". Milla is collecting; an
// operator has nothing to do. Manufacturing a task here would rebuild the queue the console
// exists to delete — and the founder's rule is that a lifecycle transition which happened by
// itself is not a task.
//
// ⚠️ NO NAME IS INVENTED. A draft with no company name yet renders as what it is — somebody
// who has signed up and not said their company yet — never as a placeholder that reads like
// a real account.
operatorRouter.get('/brief-drafts', async (_req: Request, res: Response) => {
  const { openBriefDrafts, draftProgress } = await import('../lib/brief-draft')
  const drafts = await openBriefDrafts()
  res.json({
    success: true,
    data: drafts.map(d => {
      const p = draftProgress(d)
      return {
        id: d.id,
        user_id: d.userId,
        company_name: (d.facts.company_name ?? '').trim() || null,
        contact_name: (d.facts.contact_name ?? '').trim() || null,
        country: (d.facts.country ?? '').trim() || null,
        created_at: d.createdAt,
        updated_at: d.updatedAt,
        // The SHARED counter — there is no second eleven-fact list anywhere in Vida.
        brief: { collected: p.count, total: p.total, missing: p.missing, complete: p.complete },
        // ⚠️ COMPLETE IS NOT CONFIRMED. Eleven facts collected still leaves the client's own
        // confirmation outstanding, and that gate is what starts Proof.
        confirmed_at: d.confirmedAt,
      }
    }),
  })
})

operatorRouter.get('/clients', async (_req: Request, res: Response) => {
  try {
    // ⚑ MVP1 — `user_id` IS IN THE PROJECTION so the rail can reconcile the two sources it
    // merges on DURABLE IDENTITY. A person mid-promotion can legitimately appear in both the
    // clients read and the open-drafts read for a round; `user_id` is the same auth user on
    // both sides of that transition, and it is what the clients row is created against.
    // Matching on company name would merge two different companies that share one, and would
    // fail to merge the same person whose draft said "Redmayne" and whose row says
    // "Redmayne & Co." It is an id the operator console already handles, not a new fact.
    const { data: clients } = await db.from('clients')
      .select('id, user_id, company_name, industry, country, created_at, is_demo, wallet_balance_usd')
      .order('created_at', { ascending: false })
    const excluded = await getExcludedClientIds()   // house/demo — labelled, not hidden
    const rows = (clients ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      house_or_demo: c.is_demo === true || excluded.has(c.id as string),
    }))
    res.json({ success: true, data: rows })
  } catch (err) { console.error('[operator/clients]', err); res.status(500).json({ success: false, error: 'Failed to load clients' }) }
})

// ── ⚑ 9 Sep · THE LIFECYCLE BOARD — the stage word on every client row, and Needs you ─────
//
// 🛑 THE SAME DERIVATION AS THE PANEL, ON THINNER FACTS. The list and the selected client's
// three columns must never disagree about where a client is, so both go through
// `deriveLifecycle`. What differs is only how much is gathered: the board cannot afford a
// readiness run and a preparation history per client, so where a fact is too expensive in bulk
// it is supplied in the direction that does NOT invent a task.
//
// ⚠️ WHICH MEANS THE BADGE UNDER-COUNTS RATHER THAN OVER-COUNTS. A client whose exception only
// the detail call can see appears the moment they are opened. A badge that cried wolf would be
// worse than one that is occasionally quiet — the operator would learn to ignore it, which is
// the failure the whole Needs-you rule is written to avoid.
operatorRouter.get('/lifecycle-board', async (_req: Request, res: Response) => {
  try {
    const { data: clients, error } = await db.from('clients').select('id')
    if (error) throw new Error(error.message)
    const ids = ((clients ?? []) as { id: string }[]).map(c => c.id)
    const { lifecycleBoard } = await import('../lib/programme-lifecycle-facts')
    const rows = await lifecycleBoard(ids)
    res.json({ success: true, data: rows, meta: { needs_you: rows.filter(r => r.needs_you).length } })
  } catch (err) {
    console.error('[operator/lifecycle-board]', err)
    res.status(500).json({ success: false, error: 'Failed to read the lifecycle board' })
  }
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
      // ⚑ 10 Sep (I3) — `commercial_model` rides this query too. It is the field that decides
      // whether the retired pack vocabulary applies to a client at all, and a second query per
      // client to learn it would be exactly the round trip this endpoint exists to avoid.
      .select('id, company_name, industry, country, is_demo, wallet_balance_usd, created_at, vat_number, commercial_model')
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

    // ── 🛑 ⚑ 10 Sep (I3) — THE CANONICAL VERDICT, FOR THE CLIENTS IT APPLIES TO ──────────
    //
    // ⛓️ WHAT THIS ENDS. `nextAction`'s decision table is the RETIRED $299-pack flow, and this
    // route ran it over every client. A programme client's money arrives as `programme_first`,
    // never as a pack purchase, so `hasFunded` is false for them permanently — and the table's
    // answer to that is "Waiting on their $299", printed beside a client sitting at Proof who
    // owes us nothing. Two steps further down it offered "Approve the sequence" and "Ready to
    // run" as operator tasks, gated only on whether a sequence row and an active campaign
    // happened to exist, on programmes that were still sourcing.
    //
    // 🛑 WHICH CLIENTS. Declared `programme`, OR carrying a programme row at all. That is
    // narrower than re-deriving `clientCommercialModel` (which would be a second copy of a
    // rule that already exists) and it lands on the same answer for the case that matters: an
    // UNCLASSIFIED client with an open programme is `compat_programme` to the resolver too.
    // An unclassified client with no programme stays on the legacy table, which is correct —
    // that is the book that is actually selling.
    //
    // ⚠️ FAILS SOFT TO THE LEGACY TABLE. If the lifecycle cannot be read, every client keeps
    // the answer the console gives today rather than losing their row.
    const withProgramme = new Set<string>()
    try {
      const { data } = await db.from('programmes').select('client_id').in('client_id', ids)
      for (const r of ((data ?? []) as { client_id: string | null }[])) if (r.client_id) withProgramme.add(r.client_id)
    } catch (err) {
      console.error('[operator/worklist] programme membership unreadable — every client keeps the legacy step:', err)
    }
    const programmeIds = rows
      .map(c => c.id as string)
      .filter(id => withProgramme.has(id) || rows.find(c => c.id === id)?.commercial_model === 'programme')
    const lifecycleByClient = new Map<string, import('../lib/client-step').ProgrammeLifecycle>()
    if (programmeIds.length > 0) {
      try {
        const { lifecycleBoard } = await import('../lib/programme-lifecycle-facts')
        for (const r of await lifecycleBoard(programmeIds)) {
          lifecycleByClient.set(r.client_id, {
            stage: r.stage, stageLabel: r.stage_label, state: r.state,
            needsYou: r.needs_you, needsYouReason: r.needs_you_reason,
          })
        }
      } catch (err) {
        console.error('[operator/worklist] lifecycle unreadable — programme clients keep the legacy step:', err)
      }
    }

    const out = rows.map(c => {
      const id = c.id as string
      const isDemo = c.is_demo === true
      const next = nextAction({
        // ⚠️ WHEN THIS IS SET, EVERY FACT BELOW IT IS IGNORED — see `client-step.ts`. They all
        // describe the retired pack model and none of them is true of a programme client.
        lifecycle: lifecycleByClient.get(id) ?? null,
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
// ── TEST BOOKING LINK (P47 follow-on, 21 Aug) ─────────────────────────────────────────────
//
// R55/L2, the founder's own words: *"we need to book in the clients calendar and see"* ·
// *"this is essential to pre 25th."* He connected Google on 20 Aug and it worked — and then
// could not test the half that matters, because **nothing in the product lets an operator or a
// client book anything.**
//
// ⚠️ WHAT THE AUDIT FOUND. `/calendar/book` (authed) exists in the API and NO SCREEN CALLS IT —
// verified by grepping the whole portal and admin for `calendar/book`: zero hits. The only
// booking path that reaches a real calendar is `/book/<signed-token>`, the page a COLD PROSPECT
// lands on from a sequence email. So proving a booking end-to-end required sourcing a lead,
// approving it, enrolling it, sending a real sequence, and clicking the link as the recipient.
// That is a fair test of the product and a terrible way to answer "does the calendar work".
//
// This mints the same token `bookingUrlForLead` embeds in that email, for any lead, so the
// founder can open the REAL prospect page and book into the REAL calendar in two minutes.
//
// ⚠️ IT IS NOT A SHORTCUT AROUND THE PRODUCT. The link returned IS the product's link — same
// signing key, same TTL, same page, same `performBooking` path. Nothing here books anything;
// it hands back a URL and the founder walks the actual flow. A test that bypassed the real
// page would prove the bypass works.
// ── PICKABLE LEADS FOR THE BOOKING WALK (21 Aug) ──────────────────────────────────────────
//
// ⚠️ ADDED BECAUSE THE FIRST VERSION WAS NOT ACTUALLY USABLE. The booking-link panel below
// asked the founder to paste a lead UUID — and NO SCREEN IN VIDA RENDERS ONE. `lead_id` exists
// in the queue's data and is never displayed, so "paste a lead ID" meant "go and query the
// database". A tool that needs a UUID a human cannot see is not a tool.
//
// Returns the client's most recent leads so the panel can offer a list to click.
// GET /operator/clients/:id/meeting-brief — the version history, for the operator.
//
// P34 clause 11 asked for an EXISTING Vida surface rather than a new screen; the
// client detail page (/vida/clients-admin/[id] -> /clients/[id]) already renders a
// client's ICP, so their brief history belongs beside it. This is the read that
// page needs — newest version first, every version kept.
operatorRouter.get('/clients/:id/meeting-brief', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(req.params.id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    const { briefHistory } = await import('../lib/meeting-brief-deliver')
    const history = await briefHistory(client.id)
    res.json({ success: true, data: history })
  } catch (err) {
    console.error('[operator/meeting-brief]', err)
    res.status(500).json({ success: false, error: 'Failed to load the meeting brief history' })
  }
})

operatorRouter.get('/clients/:id/recent-leads', async (req: Request, res: Response) => {
  try {
    const client = await requireClient(req.params.id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    // ⚠️ THE ERROR IS CHECKED, AND THAT IS THE WHOLE FIX. The first version destructured
    // `{ data }` only and answered `data ?? []` — so ANY query failure rendered as "This client
    // has no leads yet". The founder saw that on every client and reported it as no data; it
    // was a broken query reporting an empty one. A screen that cannot tell "none" from "broken"
    // sends somebody looking in the wrong place, which is the #620 defect in a new costume.
    //
    // ⚠️ AND IT ORDERS BY `score`, not `created_at`. Every working lead query in this file
    // orders by score (lines 304, 336, 686); `created_at` appears nowhere in a lead ORDER BY,
    // and PostgREST fails the whole request on an unknown column rather than ignoring it — the
    // exact way this returned nothing while looking fine.
    const { data, error } = await db.from('leads')
      .select('id, first_name, last_name, company, job_title, status')
      .eq('client_id', client.id)
      .order('score', { ascending: false, nullsFirst: false })
      .limit(25)
    if (error) {
      console.error('[operator/recent-leads] query failed for client', client.id, error)
      res.status(500).json({ success: false, error: `Could not load leads: ${error.message}` })
      return
    }
    res.json({ success: true, data: data ?? [] })
  } catch (err) {
    console.error('[operator/recent-leads]', err)
    res.status(500).json({ success: false, error: 'Failed to load leads' })
  }
})


operatorRouter.get('/leads/:id/booking-link', async (req: Request, res: Response) => {
  try {
    const { client_id } = (req.query ?? {}) as { client_id?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    // The lead must belong to this client — the token binds lead→client and is the
    // authorization on a public page, so minting one across a tenant boundary would be
    // handing out a key to somebody else's calendar.
    const { data: lead } = await db.from('leads')
      .select('id, first_name, last_name, company')
      .eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found for this client' }); return }

    const { data: c } = await db.from('clients')
      .select('calendar_booking_enabled, booking_url, google_calendar_refresh_token')
      .eq('id', client.id).maybeSingle()

    const { bookingUrlForLead } = await import('../lib/booking-token')
    const url = bookingUrlForLead(c ?? null, lead.id, client.id)

    // Say WHY there is no link rather than returning null and letting the screen guess.
    // Each of these is a different fix, and "no link" reads identically for all three.
    const blocked =
      !process.env.PORTAL_URL        ? 'PORTAL_URL is not set — the link would be a dead URL, so none is issued'
      : !process.env.ADMIN_SECRET_KEY ? 'ADMIN_SECRET_KEY is not set — tokens cannot be signed'
      : !c?.calendar_booking_enabled  ? 'This client has not connected Google Calendar (calendar_booking_enabled is false)'
      : !c?.google_calendar_refresh_token ? 'No refresh token stored — the connection needs redoing'
      : null

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'booking_link_issued',
      subjectType: 'lead', subjectId: lead.id,
      detail: { issued: !!url && !blocked, blocked },
    })

    res.json({
      success: true,
      url: blocked ? null : url,
      blocked,
      lead: { id: lead.id, name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || null, company: lead.company ?? null },
    })
  } catch (err) {
    console.error('[operator/booking-link]', err)
    res.status(500).json({ success: false, error: 'Failed to issue booking link' })
  }
})


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

    // ⚠️ GENERATION IS NOT DELIVERY. Everything above drafts copy and returns it — no message
    // leaves, so it is not gated and must not be: reading what WOULD go out is exactly the
    // thing that has to stay possible while the switch is on.
    if (!send) { res.json({ success: true, data: { preview: step1, sent: false, to: null } }); return }

    // ══ 🛑 BUT `send: true` IS A REAL SEND, SO THE KILL-SWITCH GOVERNS IT ════════════════
    //
    // ⛓️ ADDED 9 Sep. This posts generated cold copy through the COLD Resend identity, to an
    // address the request names via `to_email` — the same rails and the same reach as a
    // prospect send. Calling it a "test" described who we hoped would read it, not where the
    // mail went. **KILL-SWITCH ON = NO EXTERNALLY DELIVERED OUTREACH OF ANY KIND**, and a
    // test send is a send.
    const { outreachDeliveryPermitted, KILL_SWITCH_REFUSAL } = await import('../lib/outreach-kill-switch')
    if (!outreachDeliveryPermitted()) {
      res.status(503).json({ success: false, error: KILL_SWITCH_REFUSAL, data: { preview: step1, sent: false, to: null } })
      return
    }

    // ONE FIXED TEST INBOX (flow v2). It used to fall back to whoever was logged in, which
    // makes spam placement unjudgeable — a message that lands in one operator's Gmail and
    // another's Outlook tells you nothing. Same inbox every time, unless explicitly overridden.
    const TEST_INBOX = process.env.TEST_INBOX_EMAIL || 'hello@get-kind.com'
    const to = (to_email && to_email.includes('@')) ? to_email : TEST_INBOX
    if (!to || !to.includes('@')) { res.status(400).json({ success: false, error: 'No address to send the test to' }); return }
    // ── 🛑 10 Sep (I) — THROUGH THE COLD SEAM, NOT A HAND-ROLLED CLIENT ────────────────
    //
    // ⛓️ THIS BUILT ITS OWN Resend CLIENT and called `emails.send` directly with COLD_FROM —
    // real cold mail, on the cold identity, to an address the request could name. The
    // kill-switch was checked at the top of the route, twenty lines above, with nothing making
    // the send depend on that check. `sendColdEmail` asks the switch and sends in the same
    // call, so the gate is structural rather than a convention two people have to maintain.
    if (!process.env.RESEND_API_KEY) { res.status(503).json({ success: false, error: 'Email sending is not configured' }); return }
    const { sendColdEmail } = await import('../lib/email')
    const delivered = await sendColdEmail({
      to,
      subject: `[TEST · ${c?.company_name ?? 'client'}] ${step1.subject}`,
      text: step1.body,
    })
    if (!delivered) {
      const { KILL_SWITCH_REFUSAL } = await import('../lib/outreach-kill-switch')
      res.status(503).json({ success: false, error: KILL_SWITCH_REFUSAL, data: { preview: step1, sent: false, to: null } })
      return
    }

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

// ── HOW MANY OF THIS CLIENT'S LEADS CAN WE ACTUALLY SEND TO? ──────────────────────────────
//
// `pecr.ts`'s `unknown_country` class said it was *"counted so the volume is visible."* It was
// not: the class is an ALLOW, so nothing ever called `noteSkip` for it and the only trace was a
// `console.warn`. Nothing has ever counted it.
//
// ⚠️ AND `/enrol-skips` CANNOT ANSWER THIS. That surface reads the LAST ENROL RUN — and no
// enrol run has ever happened (`AUTO_OUTREACH_ENABLED` is off), so it renders nothing at all
// and would keep rendering nothing until send-day. It also counts leads that reached the enrol
// gate, not leads that exist. The founder's question is about the BOOK.
//
// Read-only, one query, no new table — the schema is untouched.
operatorRouter.get('/country-coverage', async (req: Request, res: Response) => {
  try {
    const clientId = String(req.query.client_id ?? '').trim()
    if (!clientId) { res.status(400).json({ success: false, error: 'client_id is required' }); return }

    // ⚠️ CAPPED, AND THE CAP IS REPORTED. Reading every lead of a large book to tally one field
    // would be a page-load cost that grows silently. 5,000 is far above any current book (206
    // on 20 Aug), and if it is ever hit the screen SAYS the numbers are a floor rather than
    // quietly showing a wrong total — "no silent caps" (RULEBOOK).
    const CAP = 5000
    const { data, error } = await db.from('leads')
      .select('country').eq('client_id', clientId).limit(CAP)
    if (error) {
      // An unreadable count must not render as "all clear". Say so and show nothing.
      console.error('[operator/country-coverage]', error.message)
      res.json({ success: true, data: null, error: error.message }); return
    }

    const rows = (data ?? []) as { country: string | null }[]
    // The CHIP is computed here, not in the console. `apps/admin` cannot import from
    // `apps/api` (#563/#614), so a decision left to the JSX would be a second implementation
    // of the same rule with no test on it — which is how four different sequence limits ended
    // up live at once. The console renders what this returns and decides nothing.
    const { countryCoverage, coverageChip } = await import('../lib/country-coverage')
    const coverage = countryCoverage(rows.map(r => r.country), rows.length >= CAP)
    res.json({ success: true, data: { ...coverage, chip: coverageChip(coverage) } })
  } catch (err) {
    console.error('[operator/country-coverage]', err)
    res.status(500).json({ success: false, error: 'Failed to read country coverage' })
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
// The client-side twin is POST /icps/chat-build, which is client-JWT-only. Returns a
// proposal — POST /operator/icp saves it.
//
// ── ⚑ 4 Sep — TWO REPAIRS, NEITHER OF THEM A NEW ENGINE ─────────────────────────────────
//
// 🛑 ① `fresh` — A CLIENT WITH HISTORY COULD ONLY EVER REFINE. This route seeded the client's
// ACTIVE ICP unconditionally and told the model "keep what is already right, change only what
// the operator asks about." For House — three historical ICPs and a NEW programme needing a
// NEW definition — that is the wrong conversation, and there was no way to ask for the right
// one. `fresh: true` starts from nothing. It reads no ICP, seeds no ICP, and **writes
// nothing** either way: this route only ever proposes, and the operator saves.
//
// 🛑 ② THE #1444 DISCIPLINE, IMPORTED RATHER THAN RE-WRITTEN. The prompt below used to ask for
// the whole profile on every reply, with enum menus for industry, seniority and size — the
// filter-form shape #1444 removed from Milla's builder and never removed from here. The rules
// now come from `lib/icp-conversation-rules`, whose own test proves the text is VERBATIM the
// text inside `/icps/builder/chat`. One authored source, two consoles, and a red test the day
// either drifts.
//
// ⚠️ WHAT DELIBERATELY DID NOT CHANGE: the transport (one Haiku call), the JSON contract, the
// vocabulary lists (they map operator words onto the columns FIGSY actually filters on), and
// "save" still being a separate press in the form editor.
operatorRouter.post('/icp/chat', async (req: Request, res: Response) => {
  try {
    const { client_id, message, history, fresh } = (req.body ?? {}) as
      { client_id?: string; message?: string; history?: { role: 'user' | 'assistant'; content: string }[]; fresh?: boolean }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    if (typeof message !== 'string' || !message.trim()) { res.status(400).json({ success: false, error: 'Say something first' }); return }

    const startFresh = fresh === true
    // 🛑 A FRESH BUILD DOES NOT READ THE EXISTING ICP AT ALL. Fetching it "just in case" is how
    // a seed leaks back into the prompt on a later edit; the read is skipped, not filtered.
    const { data: current } = startFresh
      ? { data: null }
      : await db.from('icps')
          .select('id, name, industries, job_titles, seniority_levels, company_sizes, geographies, tech_stack, keywords')
          .eq('client_id', client.id).eq('is_active', true)
          .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const { data: c } = await db.from('clients').select('company_name, industry, country').eq('id', client.id).maybeSingle()

    const { ICP_CONVERSATION_DISCIPLINE } = await import('../lib/icp-conversation-rules')

    const system = `You are Vida, the operator-side ICP builder for K.I.N.D. You are talking to a K.I.N.D OPERATOR who is building or refining the ICP for their client ${c?.company_name ?? 'the client'}${c?.industry ? ` (${c.industry})` : ''}${c?.country ? `, based in ${c.country}` : ''}.

${startFresh
  ? 'BUILD A BRAND-NEW ICP FROM THIS CONVERSATION. Any earlier ICP this client has is deliberately NOT shown to you and must NOT be assumed, reused or referred to. Start from what the operator tells you now, and nothing else.'
  : current
    ? `Their CURRENT active ICP is:\n${JSON.stringify(current, null, 1)}\nRefine it — keep what is already right, change only what the operator asks about.`
    : 'They have NO ICP yet — build the first one.'}

${ICP_CONVERSATION_DISCIPLINE}

── AND ONE THING THAT IS DIFFERENT HERE ────────────────────────────────────────────────
You are talking to an OPERATOR about their client, not to the client. So "learn the business
before you collect targeting fields" means the CLIENT'S business: if you do not understand
what ${c?.company_name ?? 'this client'} actually sells, ask that before any targeting field.
An operator often knows it already and will tell you in one line — take it and move on.

Reply with ONLY valid JSON (no markdown fence):
{"message":"<your reply to the operator — ONE question, or a short confirmation>","icp":{"name":"...","industries":[],"job_titles":[],"seniority_levels":[],"company_sizes":[],"geographies":[],"tech_stack":[],"keywords":[]}}

Vocabulary — map what the operator says onto these; never read them out as a menu:
- "industries" from: Fintech, Healthtech, E-commerce, SaaS, Logistics, Agriculture, Education, Manufacturing, Real Estate, Media, Consulting, Retail, Banking, Insurance, Telecoms, Energy
- "seniority_levels" from: C-Suite, VP / Director, Head of, Manager, Senior, Individual Contributor
- "company_sizes" from: 1–10, 11–50, 51–200, 201–500, 501–1,000, 1,000+

- Include "icp" on EVERY reply, carrying the full proposed profile so far. That is a RECORD of what you have been told, not a prompt to fill it in: leave [] for anything genuinely still MISSING and ask for one of them in "message". Never fill a field to make the object look finished.
- Never invent a fact about the client's business. Ask instead.
- Nothing you propose is saved. The operator reviews and saves it themselves.`

    if (!process.env.ANTHROPIC_API_KEY) {
      // No LLM key: stay useful rather than failing the step — hand back exactly what
      // exists so the operator can still edit and save it. On a FRESH build there is
      // deliberately nothing to hand back.
      res.json({ success: true, data: {
        message: startFresh
          ? 'I can’t reach my brain right now — start the new profile in the form and I’ll pick it up when I’m back.'
          : 'I can’t reach my brain right now — here is the current profile to edit directly.',
        icp: startFresh ? null : (current ?? null),
      } })
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
    // ⚑ 4 Sep — the unparseable-reply fallback used to read "Tell me more — industry, titles,
    // seniority, size, region?": the filter-form checklist surviving in the one place nobody
    // reviews. A fallback still speaks in Vida's voice and still obeys the one-thing rule.
    try { parsed = JSON.parse(raw) } catch { parsed = { message: raw.slice(0, 400) || 'Say a bit more about who we should be hunting for.' } }

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
    const { client_id, campaign_id, purpose: rawPurpose, depth: rawDepth, event_date } =
      (req.body ?? {}) as { client_id?: string; campaign_id?: string; purpose?: string; depth?: number; event_date?: string }
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

    // #651 — the operator's choice of purpose · depth · event date drives the plan. With
    // none of them supplied this is byte-identical to the R38 meeting-at-5 default.
    const { normalisePurpose, normaliseDepth, sequencePlan } = await import('../lib/sequence-templates')
    const purpose = normalisePurpose(rawPurpose)
    const depth = normaliseDepth(rawDepth)
    const eventDate = (purpose === 'event' && event_date) ? new Date(event_date) : null
    if (eventDate && Number.isNaN(eventDate.getTime())) {
      res.status(400).json({ success: false, error: 'event_date is not a readable date' }); return
    }
    const plan = sequencePlan({ purpose, depth, industry: sample.industry ?? c?.industry ?? null, eventDate })

    const { generateSequence, getClientKnowledgeForOutreach } = await import('../lib/figsy')
    const knowledge = await getClientKnowledgeForOutreach(client.id).catch(() => undefined)
    const draft = await generateSequence(
      sample as never, c?.company_name ?? '', c?.industry ?? null,
      camp?.campaign_intent ?? undefined, c?.booking_url ?? null, c?.signer_name ?? null, knowledge as never,
      { purpose, depth, eventDate, industry: sample.industry ?? c?.industry ?? null },
    ) as unknown as Record<string, { subject?: string; body?: string }>

    // Put the tokens back so this reads as a template, not one person's email. Shared with
    // the preview side so the two can never drift (lib/sequence-tokens.ts).
    const { detokenise } = await import('../lib/sequence-tokens')
    const lead = sample as { first_name?: string | null; last_name?: string | null; job_title?: string | null; company?: string | null }

    // ⚠️ TWO BUGS FIXED HERE (found 15 Aug building #651, both live before this):
    //   1. `[1,2,3]` TRUNCATED the draft — R38 deepened the generator to 5 steps on 15 Aug,
    //      and this endpoint silently threw steps 4–5 away, so every operator-suggested
    //      sequence was 3 emails no matter what the model wrote.
    //   2. The cadence used the WRONG CONVENTION. `wait_days` is the delay AFTER a step
    //      (the send engine does `next_send_at = now + steps[n].wait_days`), but this wrote
    //      step 1 = 0 — "send step 2 immediately". A suggested-and-saved sequence therefore
    //      fired steps 1 and 2 on the SAME DAY, to a cold prospect. Now taken from the plan.
    const steps = Array.from({ length: plan.depth }, (_, i) => i + 1).map(n => {
      const st = draft[`step${n}`]
      return {
        step: n,
        subject: detokenise(String(st?.subject ?? ''), lead),
        body: detokenise(String(st?.body ?? ''), lead),
        wait_days: plan.gaps[n - 1] ?? 4,
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
        name: camp?.name ? `${camp.name} — ${plan.template.name}` : plan.template.name,
        steps,
        quality,
        purpose: plan.purpose,
        depth: plan.depth,
        // The operator must SEE when a date cannot hold the chosen depth — never silently
        // compress a sequence past the event it is inviting people to.
        event: plan.event
          ? { days_until_event: plan.event.daysUntilEvent, fits: plan.event.fits,
              last_send_in_days: plan.event.lastSendOffsetDays }
          : null,
        drafted_against: { first_name: sample.first_name, job_title: sample.job_title, company: sample.company },
      },
    })
  } catch (err) { console.error('[operator/sequence-suggest]', err); res.status(500).json({ success: false, error: 'Failed to draft a sequence' }) }
})

// ── R40 — CREATE A CLIENT PARTNER SEAT ──────────────────────────────────────────────
//
// The founder creates her seat here when she actually starts (15 Aug: "she will start
// later"). It reuses the auth path every other account uses — an auth user plus a password
// reset link she follows to set her own password. No new auth system, no password ever
// typed by an operator, nothing emailed from here that isn't already emailed elsewhere.
//
// The seat carries its OWN retain rate (R40 = 8%) because the comp engine reads the rate
// from the seat rather than hard-coding a person's pay, and `seat_type = 'client_partner'`
// is what every access check keys on: this seat can never reach sourcing or lead tools.
operatorRouter.post('/seats/client-partner', async (req: Request, res: Response) => {
  try {
    // ⛓️ 16 Aug — CREATION IS NOW AN INVITE, NOT A COMPLETED RECORD (R42). It used to demand
    // address, country and mobile here, which meant the OPERATOR typed a person's own details
    // for them. The founder's flow inverts that: "they then sign up and complete their
    // information pack." She knows her own address; he should only need her name and email.
    const { name, email, company } = (req.body ?? {}) as {
      name?: string; email?: string; company?: string
    }
    const cleanEmail = String(email ?? '').trim().toLowerCase()
    const cleanName = String(name ?? '').trim()
    if (!cleanName || !cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ success: false, error: 'A name and a real email address are required.' }); return
    }

    // One seat per address — the identity fix (#370) is worthless if two seats can share an
    // email, because "exact match" would then be ambiguous again.
    const { data: existing } = await db.from('partners').select('id').eq('email', cleanEmail).maybeSingle()
    if (existing) {
      res.status(409).json({ success: false, error: 'A seat already exists for that email address.' }); return
    }

    const { RATES } = await import('../lib/comp-engine')

    // The account and the email are both handled by invitePartner below — see that file for
    // why this is the only path standing, and what was tried before it.

    const base = cleanName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 6) || 'partner'
    const referral_code = `${base}${Math.random().toString(36).slice(2, 6)}`
    // The invite link's credential. Long and random because it is the only thing standing
    // between the internet and the start of somebody's onboarding; it stops being the
    // credential the moment she sets a password (auth takes over from there).
    const inviteToken = `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`

    const { data: seat, error: seatErr } = await db.from('partners').insert({
      name: cleanName,
      email: cleanEmail,
      company: String(company ?? '').trim() || null,
      seat_type: 'client_partner',
      commission_rate: RATES.PARTNER_ACQUISITION,
      retain_rate: RATES.CLIENT_PARTNER_RETENTION,
      referral_code,
      status: 'active',
      // R42 — the seat exists, the code exists, and NEITHER earns anything yet. `invited` is
      // what /partners/ref/:code refuses to resolve, so an unsigned partner cannot land a
      // client. Existing rows default to 'active' in the migration and are untouched.
      onboarding_state: 'invited',
      invite_token: inviteToken,
      invite_sent_at: new Date().toISOString(),
    }).select('id, name, email, referral_code, seat_type, retain_rate, onboarding_state').single()

    if (seatErr || !seat) {
      res.status(500).json({ success: false, error: `Seat not created: ${seatErr?.message ?? 'unknown error'}` }); return
    }

    // The invite. Before this existed, a seat was created and the person was never told —
    // she could only get in via a "forgot password" nobody had mentioned to her.
    //
    // ⚠️ THE LINK MUST CARRY A SESSION, NOT JUST A PAGE. Fable's verification caught the
    // first version of this dead on arrival: the onboarding page's very first step calls
    // `updateUser({ password })`, which requires an EXISTING session — and an invitee has
    // none, because her auth user was created with a random password nobody is ever told.
    // She would have been stuck on screen one with "Auth session missing", and no test
    // could see it, because every test here reads source rather than walking the flow.
    //
    // So the button is a Supabase RECOVERY action link that redirects through
    // `/auth/callback?next=…` — the handler that already exchanges the code for cookies and
    // already honours `next`. She lands on the onboarding page signed in, and step one works.
    // THE INVITATION — sent by Supabase, which is the mailer with evidence behind it. See
    // lib/partner-invite.ts for what that evidence is. One call creates the account and sends
    // the email, so choosing a password IS signing up: "a partner should recieve the link. and
    // sign up. not have to set a new password. they would never know" (founder, 16 Aug).
    //
    // A failed send must never roll back the seat — it can be re-sent, and the copyable link
    // comes back either way. But it must be REPORTED WITH ITS REASON, or the operator is told
    // "Invited" about an email that does not exist. That happened, and this is the fix.
    const invite = await invitePartner({ email: cleanEmail, packPath: `/partner-onboarding?token=${inviteToken}` })
    const inviteSent = invite.sent
    const inviteError = invite.error
    const inviteUrl = invite.inviteUrl
    const userId = invite.userId
    // ⚠️ TWO DIFFERENT FACTS, and conflating them told the operator a lie. The EMAIL is a
    // Supabase password link and always signs her in when it sends. The COPYABLE link is a
    // best-effort extra for handing over by WhatsApp; if generateLink fails it degrades to the
    // plain page URL, which does not sign anyone in. Reporting the second as if it described
    // the first would have said "her link does not sign her in" about an email that works.
    const copyLinkSignsIn = inviteUrl.includes('/auth/v1/verify')

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: null, action: 'client_partner_seat_created',
      subjectType: 'partner', subjectId: seat.id,
      detail: {
        email: cleanEmail, retain_rate: seat.retain_rate,
        invite_sent: inviteSent, copy_link_signs_in: copyLinkSignsIn,
        ...(inviteError ? { invite_error: inviteError } : {}),
      },
    })

    res.json({
      success: true,
      data: {
        ...seat,
        user_created: !!userId,
        invite_sent: inviteSent,
        copy_link_signs_in: copyLinkSignsIn,
        invite_url: inviteUrl,
        invite_error: inviteError,
        next: !inviteSent
          ? `SEAT CREATED BUT THE EMAIL DID NOT SEND${inviteError ? ` — ${inviteError}` : ''}. Copy the link below and send it to her yourself, or press Resend.`
          : 'Emailed. She sets her own password, completes her details, and signs — then it comes back to you to counter-sign before the seat goes live.'
            + (copyLinkSignsIn ? '' : ' (The copyable link below is only the page address this time — the emailed link is the one that signs her in.)'),
      },
    })
  } catch (err) {
    console.error('[operator/seats/client-partner]', err)
    res.status(500).json({ success: false, error: 'Failed to create the seat' })
  }
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

    // ⚑ 27 Aug (PR2) — UNRESOLVED PROOF REVIEWS.
    //
    // A prospect who used both free proof passes and asked for another was told "K.I.N.D will
    // review this with you" and nothing reached us. `POST /icps/:id/proof` now persists that
    // ask on the client row; this is where it becomes visible to a human.
    //
    // ⚠️ ITS OWN QUERY, NOT THE `clients` FETCH ABOVE, AND THAT IS DELIBERATE. That fetch is
    // `order(created_at desc).limit(200)` — a newest-200 window. Proof exhaustion is most
    // likely for a prospect who has been going back and forth with us for a while, which is
    // exactly the client who falls out of a newest-first window as others sign up. Reading
    // the review off that page would make the alert disappear on a busy week, silently, for
    // the people who had waited longest. This predicate is bounded by the number of OPEN
    // reviews instead, which is the handful actually owed, and is served by the partial index
    // `clients_proof_review_open_idx`.
    const { data: proofReviews, error: proofReviewErr } = await db.from('clients')
      .select('id, company_name, is_demo, proof_review_requested_at, proof_review_icp_id')
      .not('proof_review_requested_at', 'is', null)
      .is('proof_review_resolved_at', null)
      .order('proof_review_requested_at', { ascending: true })
      .limit(200)

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

    // Oldest first, and pushed AHEAD of the derived alerts: a person who has been promised a
    // human and is waiting outranks a state we merely noticed. `severity: 'high'` for the
    // same reason — this is the only alert here where someone is expecting a reply.
    const proofOut: typeof out = []
    for (const c of (proofReviews ?? []) as Record<string, unknown>[]) {
      const id = c.id as string
      if (c.is_demo === true || excluded.has(id)) continue
      const at = c.proof_review_requested_at as string
      const icpId = (c.proof_review_icp_id as string | null) ?? null
      proofOut.push({
        client_id: id,
        company_name: (c.company_name as string | null) ?? null,
        kind: 'proof_review',
        label: `Proof review required — both free passes used, they asked for another${icpId ? ` (ICP ${icpId.slice(0, 8)})` : ''}. Requested ${at}. Review targeting or contact them.`,
        severity: 'high',
      })
    }

    // ⚠️ A RETURNED `error` MUST NEVER READ AS "NO REVIEWS OWED".
    //
    // supabase-js resolves with `{ data: null, error }` for a missing column or a permission
    // refusal — it does not reject. Reading only `data` made `(proofReviews ?? [])` an empty
    // list, so a FAILED query and a genuinely empty queue produced the identical screen: a
    // quiet Vida. That is the same silence this whole PR exists to remove, in the one surface
    // that had not been hardened — and it is exactly what happens while the
    // 20260827_proof_review_handoff migration is still unapplied.
    //
    // ⚠️ IT DEGRADES, IT DOES NOT FAIL. The rest of the feed is real and still useful, so it
    // is returned as normal; only the proof-review section is unknown. `degraded` says so,
    // and the admin console raises the EXISTING red "part of this console could not load"
    // banner from it — whose copy already reads *"a quiet bell does NOT mean there is nothing
    // wrong"*. No new alert subsystem, and deliberately NO `sendFounderAlert`: this endpoint
    // is polled, and an email per poll would be alert spam, not a signal.
    if (proofReviewErr) {
      console.error('[operator/alerts] PROOF-REVIEW QUERY FAILED — the queue could not be checked:', proofReviewErr.message)
    }

    // ══ BUILD-003 PR3 — PROGRAMME EXCEPTIONS REACH THE BELL ═══════════════════════════════
    //
    // 🛑 THESE TWO STATES ALERTED BY EMAIL AND NOWHERE ELSE. A stranded batch holds a client's
    // PAID volume in reserve where they cannot use it; an unclosed provider eviction is a real
    // person still receiving mail from a provider's own copy of their record after asking us
    // to stop. Both had a database index built for exactly this query and no reader, and an
    // email is read once or not at all. Neither is a state anyone should have to remember.
    //
    // ⚠️ PUSHED AHEAD OF THE DERIVED ALERTS, like the proof reviews, for the same reason: a
    // person who is still being emailed after opting out outranks a state we merely noticed.
    const programmeOut: typeof out = []
    const programmeDegraded: string[] = []
    try {
      const { strandedBatches, openEvictions } = await import('../lib/operator-programme')
      const [stranded, evictions] = await Promise.all([strandedBatches(), openEvictions()])
      if (stranded.degraded) programmeDegraded.push(stranded.degraded)
      if (evictions.degraded) programmeDegraded.push(evictions.degraded)

      for (const b of stranded.rows) {
        if (b.client_id && excluded.has(b.client_id)) continue
        programmeOut.push({
          client_id: b.client_id ?? '',
          company_name: null,
          kind: 'stranded_batch',
          label: `Programme batch ${b.seq} is STRANDED — ${b.granted - (b.delivered ?? 0)} record(s) of paid volume are reserved and unusable until reconciled by hand.`,
          severity: 'high',
        })
      }
      for (const e of evictions.rows) {
        if (e.client_id && excluded.has(e.client_id)) continue
        programmeOut.push({
          client_id: e.client_id ?? '',
          company_name: null,
          kind: 'provider_eviction',
          label: `Someone who opted out is still inside ${e.provider ?? 'a provider'} — eviction required since ${e.required_at}${e.reason ? ` (${e.reason})` : ''}. They may still be receiving mail.`,
          severity: 'high',
        })
      }
    } catch (err) {
      // Never let the new section break the existing feed. Degrade, say so, carry on.
      programmeDegraded.push(`Programme exceptions could not be checked (${err instanceof Error ? err.message : String(err)}).`)
    }

    res.json({
      success: true,
      data: [...proofOut, ...programmeOut, ...out],
      ...(proofReviewErr || programmeDegraded.length > 0
        ? { degraded: {
            ...(proofReviewErr ? { proof_review: `Proof-review queue could not be checked — operator review state may be incomplete. Do NOT read an empty list as "nobody is waiting". Check the database and whether 20260827_proof_review_handoff has been run (Vida → Engine). Reason: ${proofReviewErr.message}` } : {}),
            ...(programmeDegraded.length > 0 ? { programme: programmeDegraded.join(' ') } : {}),
          } }
        : {}),
    })
  } catch (err) { console.error('[operator/alerts]', err); res.status(500).json({ success: false, error: 'Failed to load alerts' }) }
})

// ── PR2 — MARK A PROOF REVIEW HANDLED ───────────────────────────────────────────────
//
// The smallest action that closes the loop: one operator POST that stamps
// `proof_review_resolved_at`, after which the alert above stops being returned. No workflow
// engine, no status enum, no new table — the same `adminKeyValid` + `db.update` shape every
// other operator action in this file already uses.
//
// ⚠️ CONDITIONAL, LIKE THE OPEN. It resolves only a review that is actually OPEN, so a
// double-click cannot overwrite the first operator's timestamp with a later one, and it can
// never invent a resolution for a client who never asked. A second click reports
// `already_resolved` rather than failing — the operator's intent was satisfied either way.
// ══ BUILD-003 PR3 — OPERATOR PROGRAMME TRUTH ═══════════════════════════════════════════
//
// 🛑 EVERYTHING PR2 BUILT WAS INVISIBLE. No admin page referenced `programmes` and no operator
// endpoint returned one, so programme status, pause, the review hold, the sourcing ceiling,
// batches and stranded batches could not be seen by the people who operate them. The founder
// created a test ICP against a live programme and could not find where it was meant to appear
// — because for programme state there was nowhere. These routes are that nowhere, filled in.
//
// ⚠️ READ-ONLY except for the ONE reversible action at the end of this block.
operatorRouter.get('/programme', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' })
      return
    }
    const clientId = String(req.query.client_id ?? '').trim()
    if (!clientId) {
      res.status(400).json({ success: false, error: 'client_id is required' })
      return
    }
    const { programmeTruthFor } = await import('../lib/operator-programme')
    const truth = await programmeTruthFor(clientId)
    // ⚑ PR A2 — the programme's ICP section, on the endpoint the panel already calls rather
    // than a second API. Which targeting feeds a programme is programme truth: without it the
    // screen cannot show why a programme is sourcing nothing, and the operator would be left
    // to infer the one link that decides all downstream attribution.
    const { programmeIcps } = await import('../lib/programme-icp')
    const icps = await programmeIcps(clientId, truth.programme?.id ?? null)
    // ⚑ 3 Sep (C2) — WHICH COMMERCIAL MODEL GOVERNS THIS CLIENT, on the endpoint the panel
    // already calls. This has to sit beside the programme, because the panel's single most
    // consequential sentence is the one it prints when there is NO programme — and until this
    // field existed that sentence asserted the client was on the legacy $299/$4 model purely
    // because a programme row was absent. Absence of X cannot mean "is Y".
    const { clientCommercialModel, commercialModelLabel, storedModelFor } = await import('../lib/commercial-model')
    const model = await clientCommercialModel(clientId)
    // ⚑ 8 Sep (HOUSE-009) — MAY THE ONE-TIME SOURCING RECONCILIATION BE OFFERED HERE?
    //
    // 🛑 THE ANSWER IS COMPUTED ON THE SERVER AND THE BROWSER IS GIVEN A BOOLEAN. It turns on
    // `HOUSE_LAUNCH_PROGRAMME_ID` and a House audience proved from the AUTH USER — two facts a
    // browser cannot hold and must never be handed, because a value shipped to a browser is a
    // value anybody can read and lie back to us. Vida renders this; it never derives it.
    const { reconcileAvailability } = await import('../lib/programme-reconcile-availability')
    const reconcile = await reconcileAvailability(truth.programme?.id ?? null, clientId)
    // ⚑ 9 Sep (HOUSE-009) — MAY THIS PROGRAMME BE HANDED TO THE CLIENT YET?
    //
    // 🛑 THE LIFECYCLE IS SOURCE → QUALIFY → PREPARE → FREEZE → READY FOR APPROVAL, and Vida
    // was offering the last step from the first. `lcCan('ready-for-approval')` tested the
    // STATUS alone, so on a programme with 246 unjudged candidates, no batch, no campaign, no
    // sequence, no sender and no frozen set, the button was drawn active and inviting. The
    // route refused — `markReadyForApproval` consults this same rule and always has — but an
    // operator does not learn a lifecycle from a refusal they had to trigger.
    //
    // ⚠️ COMPUTED HERE, ON THE SERVER, AND HANDED OVER AS A BOOLEAN. This is the SAME
    // `programmePreparationReadiness` the transition itself is gated by, so the screen and the
    // route cannot answer differently — the alternative is a browser re-deriving thirteen
    // conditions from data it does not have, which is a second source of truth wearing a
    // convenience's clothes.
    //
    // ⚠️ AND AN UNREADABLE ANSWER IS `false`, NEVER "PROBABLY FINE". `programmePreparationReadiness`
    // already fails closed on every unreadable fact; its `degraded` sentence joins the array
    // this panel already renders in red, so "we could not tell" reaches the operator as itself
    // rather than as a missing button.
    //
    // ⛓️ 9 Sep — AND `ready` ALONE WAS AN UNREACHABLE GATE. Readiness requires a campaign,
    // sequence, schedule and enrolments; those are created by PREPARATION; and preparation is
    // what the button now runs. Gated on `ready` alone the control could never appear, because
    // the only way to reach the state that reveals it was to press it. `preparable` is the
    // second, strictly narrower fact — every outstanding blocker is one preparation clears —
    // and it is computed from the SAME blocker list, so no new rule enters the screen.
    const { programmePreparationReadiness, onlyPreparationBlocks } = await import('../lib/preparation-readiness')
    const readiness = truth.programme
      ? await programmePreparationReadiness(truth.programme.id)
      : null
    // ⛓️ 9 Sep — THE BACKGROUND RUN'S TWO FACTS, SO A LOST RESPONSE LOSES NOTHING. `preparing`
    // is whether a continuation is in flight in this process right now (the button hides while
    // it is); `last_preparation` is the most recent audited outcome — headline on success, the
    // named blockers on refusal — which is the founder's only record of an attempt whose HTTP
    // response an edge threw away.
    const { outreachEnabled, operatorSendEnabled } = await import('../lib/figsy')
    const { isAdvanceRunning, lastPreparationAttempt } = await import('../lib/programme-advance')
    const preparing = truth.programme ? isAdvanceRunning(truth.programme.id) : false
    const lastPreparation = truth.programme ? await lastPreparationAttempt(truth.programme.id) : null
    // ── ⚑ 9 Sep — WHERE THIS CLIENT IS, AND WHETHER THE OPERATOR HAS TO DO ANYTHING ───────
    //
    // 🛑 DECIDED HERE, ON THE SERVER, AND HANDED OVER AS A VERDICT. The lifecycle ribbon, the
    // stage word on the client row, the middle column's message, the right panel and the
    // Needs-you filter all ask the same question; five copies of it in a browser is five
    // chances to disagree, and the one that disagrees silently is the filter — an operator
    // told nothing needs them, beside a panel drawing a button.
    //
    // ⚠️ IT NEVER THROWS. This drives the whole Clients workspace; an unreadable count must
    // degrade to a safe fact, not blank the console.
    const { lifecycleDetailFor } = await import('../lib/programme-lifecycle-facts')
    const lifecycle = await lifecycleDetailFor(clientId).catch(err => {
      console.error('[operator/programme] lifecycle unreadable for', clientId, err)
      return null
    })
    res.json({ success: true, data: { ...truth,
      lifecycle,
      degraded: readiness?.degraded ? [...truth.degraded, readiness.degraded] : truth.degraded,
      readiness: {
        ready: readiness?.ready === true,
        // ⛓️ 9 Sep, LATER — THE PROVED `autoSequence` FACT IS GONE BECAUSE IT BECAME A CONSTANT.
        // This read `isHouseLaunchProgramme` to decide whether preparation could clear
        // `no_sequence` / `no_send_schedule`, since only House had copy to apply automatically.
        // Preparation now writes any programme's sequence from its own client context, so every
        // programme has that capability and asking which one this is would answer the same way
        // every time — while leaving a route open to hiding a control that does work.
        preparable: readiness ? onlyPreparationBlocks(readiness.blockers) : false,
        blockers: (readiness?.blockers ?? []).map(b => ({ code: b.code, detail: b.detail })),
      },
      preparing,
      last_preparation: lastPreparation,
      // ── ⛓️ 9 Sep — THE TWO SEND SWITCHES, STATED RATHER THAN INFERRED ──────────────────
      //
      // 🛑 THE LOCKED MEANING. Kill-switch ON = sending blocked. OFF = sending permitted,
      // subject to every other gate. Vida must never present a bare "OFF" under "SENDING" —
      // read alone it says the opposite of what it means.
      //
      // ⚠️ AND MAKE LIVE IS NOT SENDING. A programme can be LIVE with nothing going out: the
      // automatic cron obeys `AUTO_OUTREACH_ENABLED`, and the founder's canary goes through the
      // separate operator Run, which needs `FIGSY_OPERATOR_SEND_ENABLED`. A screen that says
      // "outreach has started" because a status changed is lying about the only thing on it
      // that reaches a real stranger. Both are reported so the console can say which is true.
      send_controls: {
        /** The automatic cron. TRUE means the kill-switch is OFF and the cron may send. */
        auto_outreach_enabled: outreachEnabled(),
        /** The founder's explicit Run-once. Independent of the switch above. */
        operator_run_enabled: operatorSendEnabled(),
      },
      icps, reconcile, commercial: {
      stored:   storedModelFor(model),
      resolved: model.model,
      declared: model.declared,
      label:    commercialModelLabel(model),
      // Present ONLY on `unreadable`, and it is the operator's instruction: it names the
      // conflict (declared legacy, programme open) or the read that failed.
      reason:   model.model === 'unreadable' ? model.reason : null,
    } } })
  } catch (err) {
    console.error('[operator/programme]', err)
    res.status(500).json({ success: false, error: 'Failed to load programme truth' })
  }
})

// ── POST /operator/clients/:id/commercial-model — DECLARE THE MODEL, BY CLIENT ID ────────
//
// 🛑 THE ONLY WRITER OF `clients.commercial_model` OUTSIDE CUSTOMER SIGNUP, and the founder's
// rules for it are the shape of this route rather than a comment on top of it:
//
//   · BY CLIENT ID — the id is a path parameter and there is no name, email or company lookup
//     anywhere in this handler. "Never by company name. Never HOUSE_CLIENT_ID. Never email
//     inference for the model itself." An operator who picks the wrong account picks it in the
//     client picker, where the account is visible, not by typing a string that matches two.
//   · ONE CLIENT PER CALL — no array, no filter, no "all clients where…". A bulk endpoint for
//     this field is a bulk endpoint for how a whole book gets charged.
//   · AUDITED, with `from` and `to`, because this field is a switch between two commercial
//     models and the log is the only record of who moved it.
//
// ⚠️ AND IT REFUSES TO CREATE THE CONFLICT. Declaring `legacy` on a client who holds an OPEN
// programme produces the exact state `clientCommercialModel` fails closed on — every
// consequential path would then refuse for that client until a human undid it. The operator is
// told that here, before the write, rather than discovering it as an outage.
operatorRouter.post('/clients/:id/commercial-model', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' })
      return
    }

    const clientId = String(req.params.id ?? '').trim()
    const client = await requireClient(clientId)
    if (!client) { res.status(404).json({ success: false, error: 'No such client' }); return }

    // `null` is a real, deliberate target: it returns the client to UNCLASSIFIED, which is the
    // compatibility state — exactly the behaviour the product had before the column existed.
    // It is not "clear the field and hope"; it is a third choice with a defined meaning.
    const raw = (req.body ?? {}).model
    if (raw !== 'programme' && raw !== 'legacy' && raw !== null) {
      res.status(400).json({ success: false, error: 'model must be "programme", "legacy" or null' })
      return
    }
    const target: 'programme' | 'legacy' | null = raw

    const { clientCommercialModel, storedModelFor } = await import('../lib/commercial-model')
    const before = await clientCommercialModel(clientId)
    const from = storedModelFor(before)

    // 🛑 THE CONFLICT IS REFUSED AT THE DOOR. `before.openProgramme` is null on an unreadable
    // resolution, so this asks the question directly rather than through the resolution.
    if (target === 'legacy') {
      const { openProgrammeFor } = await import('../lib/programme-authority')
      const open = await openProgrammeFor(clientId)
      if (open) {
        res.status(409).json({
          success: false,
          error: `${client.company_name ?? 'This client'} holds an open programme (${open.status}). `
            + 'Declaring them legacy would put the account into a state where sourcing, sending, '
            + 'enrolment and charging all refuse until it is undone. Complete or cancel the '
            + 'programme first if this client really is on the legacy per-lead model.',
        })
        return
      }
    }

    const { error } = await db.from('clients').update({ commercial_model: target }).eq('id', clientId)
    if (error) { res.status(500).json({ success: false, error: `Could not set the commercial model: ${error.message}` }); return }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId, action: 'client_commercial_model_set',
      subjectType: 'client', subjectId: clientId,
      detail: { from, to: target, company_name: client.company_name, no_money_moved: true },
    })

    // Re-resolve and return the truth rather than echoing what was asked for: the caller
    // re-renders from this, and a write that returns its own input cannot show a conflict.
    const after = await clientCommercialModel(clientId)
    const { commercialModelLabel } = await import('../lib/commercial-model')
    res.json({ success: true, data: {
      stored: storedModelFor(after), resolved: after.model, declared: after.declared,
      label: commercialModelLabel(after),
      reason: after.model === 'unreadable' ? after.reason : null,
    } })
  } catch (err) {
    console.error('[operator/clients/commercial-model]', err)
    res.status(500).json({ success: false, error: 'Failed to set the commercial model' })
  }
})

// Platform-wide exceptions: stranded batches and unclosed provider evictions. Both had a
// database index built for exactly this query and no reader — a stranded batch alerted by
// EMAIL, which is read once or not at all, and an open eviction is a real person still
// receiving mail they asked us to stop.
operatorRouter.get('/programme/exceptions', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' })
      return
    }
    const { strandedBatches, openEvictions, debrisIcps, failedRuns } = await import('../lib/operator-programme')
    const [stranded, evictions, debris, failed] = await Promise.all([strandedBatches(), openEvictions(), debrisIcps(), failedRuns()])
    res.json({
      success: true,
      data: {
        stranded_batches: stranded.rows,
        open_evictions: evictions.rows,
        debris_icps: debris.rows,
        // A prospect whose run CRASHED is sitting on the approved recovery copy having been
        // promised a human. R72 recorded the crash honestly; nothing told anybody.
        failed_runs: failed.rows,
        failed_run_window_days: failed.windowDays,
        // ⚠️ A POPULATED `degraded` MEANS THE EMPTY LISTS ABOVE ARE UNKNOWN, NOT NONE.
        degraded: [stranded.degraded, evictions.degraded, debris.degraded, failed.degraded].filter(Boolean),
      },
    })
  } catch (err) {
    console.error('[operator/programme/exceptions]', err)
    res.status(500).json({ success: false, error: 'Failed to load programme exceptions' })
  }
})

// The lead pool, summarised truthfully. Counts of rows that exist — no fill-rate, no health
// score, no projected coverage. `money-path` renders "Pool data unavailable" today.
operatorRouter.get('/pool/summary', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' })
      return
    }
    const { poolSummary } = await import('../lib/operator-programme')
    res.json({ success: true, data: await poolSummary() })
  } catch (err) {
    console.error('[operator/pool/summary]', err)
    res.status(500).json({ success: false, error: 'Failed to summarise the lead pool' })
  }
})

// ── THE ONE WRITE PR3 ADDS: REVERSIBLE ICP RETIREMENT ────────────────────────────────────
//
// 🛑 DEACTIVATE, NEVER DELETE, AND THAT IS THE WHOLE DESIGN. `is_active = false` takes an ICP
// out of sourcing (`startWorkForClient` selects `.eq('is_active', true)`) while leaving every
// row it ever produced intact and every historical attribution readable. A delete would cascade
// through `icp_run_outcomes` and orphan the leads it sourced, and it would destroy the record
// of a test that a runtime verification depends on.
//
// ⚠️ REVERSIBLE ON PURPOSE: `active: true` in the body restores it. An operator who retires the
// wrong ICP must be one click from undoing it, not one support ticket.
//
// ⚠️ IT REFUSES TO TOUCH AN ICP THAT BELONGS TO A LIVE PROGRAMME unless the caller says so
// explicitly. Retiring the ICP a paid programme sources against would silently stop that
// client's delivery with no error anywhere — the exact invisible failure this PR exists to end.
operatorRouter.post('/icp/:icpId/retire', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' })
      return
    }
    const active = req.body?.active === true          // default false = retire
    const force  = req.body?.force === true
    const icpId  = req.params.icpId

    const { data: icp, error: readErr } = await db.from('icps')
      .select('id, client_id, name, is_active, programme_id').eq('id', icpId).maybeSingle()
    if (readErr) {
      res.status(500).json({ success: false, error: `Could not read the ICP — nothing changed. ${readErr.message}` })
      return
    }
    if (!icp) { res.status(404).json({ success: false, error: 'No such ICP' }); return }

    const programmeId = (icp as { programme_id?: string | null }).programme_id ?? null
    if (!active && programmeId && !force) {
      const { data: prog } = await db.from('programmes')
        .select('id, status, paused_at').eq('id', programmeId).maybeSingle()
      const p = prog as { status?: string; paused_at?: string | null } | null
      const live = p && !p.paused_at && !['COMPLETED', 'CANCELLED'].includes(String(p.status))
      if (live) {
        res.status(409).json({
          success: false,
          error: `This ICP belongs to programme ${programmeId.slice(0, 8)}, which is ${p?.status} and not paused. ` +
            'Retiring it would stop that programme sourcing with no error anywhere. Pause the programme first, or re-send with force:true.',
        })
        return
      }
    }

    const { data: updated, error: upErr } = await db.from('icps')
      .update({ is_active: active }).eq('id', icpId).select('id, name, is_active')
    if (upErr) {
      console.error('[operator/icp/retire] update failed for', icpId, upErr.message)
      res.status(500).json({ success: false, error: `Could not change the ICP — it is unchanged. ${upErr.message}` })
      return
    }
    const row = ((updated ?? []) as { id: string; name: string | null; is_active: boolean }[])[0] ?? null
    res.json({
      success: true,
      data: {
        icp: row,
        headline: active
          ? `"${row?.name ?? icpId}" is ACTIVE again and will be sourced.`
          : `"${row?.name ?? icpId}" is RETIRED — it will not be sourced. Nothing was deleted; every lead it produced is untouched and this is reversible.`,
      },
    })
  } catch (err) {
    console.error('[operator/icp/retire]', err)
    res.status(500).json({ success: false, error: 'Failed to change the ICP' })
  }
})

// ── HOUSE-009 · QUALIFY AND SETTLE ONE PROGRAMME'S ATTEMPT ───────────────────────────────
//
// 🛑 THE ACTION THE OLD RECONCILE SHOULD HAVE BEEN. Entitlement is consumed by M&V's own
// qualification verdict, not by `delivered_at`, so an attempt has to be JUDGED before it can
// be settled. This judges every unaccounted candidate of one named programme against its
// attached ICP, settles on the qualified count, and surfaces the qualified rows.
//
// ⚠️ IT MAY SPEND APOLLO REVEAL CREDITS — for a candidate whose stored facts cannot answer the
// ICP, and only for that candidate, once. It sources nobody: no People Search, no PDL, no
// Hunter, no waterfall, no phone. The response reports every provider number.
//
// ⚠️ A PARTIAL RUN NEVER SETTLES. Verdicts already written are kept and a retry skips them.
operatorRouter.post('/programme/:programmeId/qualify-batch', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' })
      return
    }
    const { qualifyAndSettleBatch } = await import('../lib/programme-batch-recovery')
    const result = await qualifyAndSettleBatch(req.params.programmeId)

    if (!result.ok) {
      await writeOperatorAudit({
        operatorEmail: operatorEmail(req), clientId: null, action: 'programme_batch_qualify_refused',
        subjectType: 'programme', subjectId: req.params.programmeId,
        detail: { reason: result.reason, partial: result.partial ?? null },
      })
      res.status(400).json({ success: false, error: result.reason, partial: result.partial ?? null })
      return
    }

    const r = result.report
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: r.client_id, action: 'programme_batch_qualified',
      subjectType: 'programme', subjectId: r.programme_id,
      detail: {
        icp_id: r.icp_id, batch_id: r.batch_id,
        candidates_total: r.candidates_total, already_judged: r.already_judged,
        judged_from_stored_facts: r.judged_from_stored_facts,
        provider_reveals_attempted: r.provider_reveals_attempted,
        provider_reveals_succeeded: r.provider_reveals_succeeded,
        qualified: r.qualified, disqualified: r.disqualified, reasons: r.reasons,
        used: r.used, reserved: r.reserved, remaining: r.remaining,
        status_before: r.status_before, status_after: r.status_after, surfaced: r.surfaced,
        // ⚑ 9 Sep — the continuation runs inside this call, so its outcome is part of the
        // record of what the operator's press actually did.
        continued_reviewable: r.continued.reviewable,
        continued_blockers: r.continued.blockers.map(b => b.code),
      },
    })

    res.json({ success: true, data: r })
  } catch (err) {
    console.error('[operator/programme/qualify-batch]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'The qualification could not be completed' })
  }
})

// ── CONTINUE A SETTLED PROGRAMME TO THE REVIEW BOUNDARY ─────────────────────────────────
//
// 🛑 THE STEP AFTER QUALIFY, WHICH NOTHING COULD REACH. Once an attempt is judged and settled,
// the programme still has to be PREPARED — campaign, canonical sequence, schedule, cadence,
// enrolments — before the client can be asked to approve it. Preparation supported that stage
// and had no caller before approval, so a settled programme sat at SOURCING with no coded path
// forward. This is that path: one exact programme id in, the canonical chain run once, and a
// named blocker back out when something genuinely is not ready.
//
// ⚠️ IT SOURCES NOBODY AND SPENDS NOTHING. No People Search, no PDL, no Apollo reveal, no
// qualification, no settlement, no entitlement movement. It re-runs no completed stage.
//
// ⚠️ IT SENDS NOTHING, AND THAT IS STRUCTURAL. Pre-approval preparation creates the campaign
// as a DRAFT; `status: 'active'` is reachable only through `assertGoingLive`, which demands an
// approval and P2. This route touches neither.
operatorRouter.post('/programme/:programmeId/prepare-for-review', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' })
      return
    }
    // ⛓️ 9 Sep — RESPOND, THEN RUN. Same reason as `/programmes/:id/ready-for-approval`: held
    // open for the whole chain, this door died at an edge with a plain-text `upstream error`
    // and its outcome reached nobody. `startAdvanceInBackground` audits the result on both
    // branches (`programme_prepared_for_review` / `programme_prepare_for_review_refused`), so
    // the record this route used to write inline is still written — by the run itself, once it
    // actually knows how it ended.
    const { startAdvanceInBackground } = await import('../lib/programme-advance')
    const started = startAdvanceInBackground(req.params.programmeId, 'operator_recovery', operatorEmail(req))
    res.status(202).json({
      success: true,
      data: {
        started: started.started,
        already_running: started.already_running,
        headline: started.started
          ? 'Preparing this programme for the client in the background. The programme panel shows the outcome when it finishes. Nothing is sent.'
          : 'This programme is already being prepared. Nothing new was started.',
      },
    })
  } catch (err) {
    console.error('[operator/programme/prepare-for-review]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'The programme could not be prepared for review' })
  }
})

// ── THE PROGRAMME'S OWN SEQUENCE AND SCHEDULE — the two a fresh client could not get ─────
//
// 🛑 WHY THESE EXIST. `figsy_sequences.campaign_id` and `programmes.send_schedule` each had
// exactly ONE writer in the product, and it was House's. Every other programme therefore
// carried no canonical sequence and no schedule, readiness refused on both, and
// READY_FOR_APPROVAL was unreachable for a paying customer. These are the generic doors.
//
// ⚠️ NEITHER SENDS, PREPARES, APPROVES OR AUTHORISES ANYTHING. They write the words and the
// timing an operator has decided; every downstream gate is untouched.
operatorRouter.post('/programme/:programmeId/sequence', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' })
      return
    }
    const body = (req.body ?? {}) as { steps?: unknown; name?: string }
    if (!Array.isArray(body.steps) || body.steps.length === 0) {
      res.status(400).json({ success: false, error: 'At least one message step is required. Nothing was changed.' })
      return
    }
    const steps = (body.steps as Record<string, unknown>[]).map(st => ({
      subject: String(st.subject ?? '').slice(0, 200),
      body: String(st.body ?? '').slice(0, 5000),
      wait_days: Number(st.wait_days ?? 0) || 0,
    }))
    const { applyProgrammeSequence } = await import('../lib/programme-sequence')
    const r = await applyProgrammeSequence(
      req.params.programmeId, steps, String(body.name ?? '').trim().slice(0, 120) || 'Programme sequence')
    if (!r.ok) { res.status(400).json({ success: false, error: r.reason }); return }
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: null,
      action: 'programme_sequence_set', subjectType: 'programme', subjectId: req.params.programmeId,
      detail: { sequence_id: r.sequenceId, campaign_id: r.campaignId, created: r.created, steps: r.steps },
    })
    res.json({ success: true, data: r })
  } catch (err) {
    console.error('[operator/programme/sequence]', err)
    res.status(500).json({ success: false, error: 'The programme sequence could not be saved' })
  }
})

operatorRouter.post('/programme/:programmeId/send-schedule', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' })
      return
    }
    const { setProgrammeSendSchedule } = await import('../lib/programme-sequence')
    const r = await setProgrammeSendSchedule(req.params.programmeId, (req.body ?? {}).schedule)
    if (!r.ok) { res.status(400).json({ success: false, error: r.reason }); return }
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: null,
      action: 'programme_send_schedule_set', subjectType: 'programme', subjectId: req.params.programmeId,
      detail: { schedule: r.schedule },
    })
    res.json({ success: true, data: r.schedule })
  } catch (err) {
    console.error('[operator/programme/send-schedule]', err)
    res.status(500).json({ success: false, error: 'The send schedule could not be saved' })
  }
})

// ── HOUSE-009 · THE OPERATOR DOOR TO `reconcile_programme_sourcing` ──────────────────────
//
// 🛑 IT EXISTED IN THE DATABASE AND NOTHING COULD CALL IT. #1652 shipped the RPC; the fix for
// 246 unaccounted House prospects was live and unreachable, which is the "orphan helper" shape
// this package has now hit twice. This is the smallest door: one exact programme id in, one
// reviewed RPC called, the resulting counters read back out.
//
// ⚠️ THE ID COMES FROM THE URL AND IS NEVER RESOLVED. No client lookup, no "the newest
// programme", no House audience, no name. `reconcileProgrammeSourcing` refuses anything that is
// not a uuid before it reads a single row.
//
// ⚠️ NOTHING HERE SOURCES, RESERVES, APPROVES, MOVES TO P2, GOES LIVE OR SENDS. The only write
// in the whole operation happens inside the RPC, under its own guards.
operatorRouter.post('/programme/:programmeId/reconcile-sourcing', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' })
      return
    }
    const { reconcileProgrammeSourcing } = await import('../lib/programme-reconcile')
    const result = await reconcileProgrammeSourcing(req.params.programmeId)

    if (!result.ok) {
      // ⚠️ A REFUSAL IS NEVER REPORTED AS A SUCCESS WITH ZERO. The RPC raises rather than
      // half-counting, and the operator has to see which refusal fired.
      await writeOperatorAudit({
        operatorEmail: operatorEmail(req), clientId: null, action: 'programme_sourcing_reconcile_refused',
        subjectType: 'programme', subjectId: req.params.programmeId,
        detail: { reason: result.reason },
      })
      res.status(400).json({ success: false, error: result.reason })
      return
    }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: null, action: 'programme_sourcing_reconciled',
      subjectType: 'programme', subjectId: result.programme_id,
      detail: {
        reconciled_count: result.reconciled_count,
        before: result.before, after: result.after,
        status_before: result.status_before, status_after: result.status_after,
        batches: result.batches.length,
      },
    })

    res.json({ success: true, data: result })
  } catch (err) {
    console.error('[operator/programme/reconcile-sourcing]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'The reconciliation could not be completed' })
  }
})

operatorRouter.post('/proof-review/:clientId/resolve', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' })
      return
    }
    // ── ⚑ 11 Sep — THE RESOLUTION IS RECORDED AGAINST A REAL ESCALATION, AND SAYS WHO ───
    //
    // 🛑 `.not('proof_review_requested_at', 'is', null)` IS THE GUARD THE FOUNDER ASKED FOR:
    // a resolution cannot be recorded against a client who never validly escalated. It was
    // already here and is now load-bearing, because a resolution is what unlocks the one
    // calibrated restart — so a resolution of nothing would mint a paid set for a client who
    // never asked for one.
    //
    // ⚠️ AND IT PERSISTS THE OPERATOR'S IDENTITY. The audit log carries the action; an
    // operator reading this client's row should not have to go and find it.
    //
    // ⚠️ THE NOTE IS OPTIONAL HERE AND REQUIRED BY THE RESTART. Recording that a call
    // happened must never be blocked by the wording of a note; what a note gates is spending
    // another set, which `mayRestartCalibrated` refuses without one.
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 4000) : ''
    const { data: resolved, error: resolveErr } = await db.from('clients')
      .update({
        proof_review_resolved_at: new Date().toISOString(),
        proof_calibration_resolved_by: operatorEmail(req) ?? null,
        ...(note ? { proof_calibration_note: note } : {}),
      })
      .eq('id', req.params.clientId)
      .not('proof_review_requested_at', 'is', null)
      .is('proof_review_resolved_at', null)
      .select('id')

    // ⚠️ A RETURNED `error` IS NOT "ALREADY RESOLVED". supabase-js resolves with
    // `{ data: null, error }` for a missing column or a permission refusal, so reading only
    // `data` made a FAILED write indistinguishable from a no-op — and the operator was told
    // `already_resolved`, i.e. that the job was done. They would close the tab on a review
    // still open, and the prospect would keep waiting. Zero rows means "nothing to do";
    // an error means "we do not know", and those must never share an answer.
    if (resolveErr) {
      console.error('[operator/proof-review/resolve] UPDATE failed for client',
                    req.params.clientId, '—', resolveErr.message)
      res.status(500).json({
        success: false,
        error: `Could not mark the proof review handled — it is still open. ${resolveErr.message}`,
      })
      return
    }

    const didResolve = (resolved ?? []).length > 0
    if (didResolve) {
      await writeOperatorAudit({
        operatorEmail: operatorEmail(req), clientId: req.params.clientId,
        action: 'proof_calibration_resolved', subjectType: 'client', subjectId: req.params.clientId,
        detail: {
          note_recorded: !!note,
          means: 'a human spoke to this client and recorded the outcome; it does NOT by itself start anything',
        },
      })
    }
    res.json({
      success: true,
      data: { resolved: didResolve ? 'resolved' : 'already_resolved' },
    })
  } catch (err) {
    console.error('[operator/proof-review/resolve]', err)
    res.status(500).json({ success: false, error: 'Failed to resolve the proof review' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep (C07) — THE CALIBRATION EVIDENCE, AND THE ONE RESTART.
//
// 🛑 THE RESTART DOES NOT GO THROUGH `try_claim_proof_pass`, DELIBERATELY. That RPC stays the
// hard server backstop refusing a third AUTOMATIC pass forever (founder-locked: "UI is not
// the safety boundary"), and giving it an exception would be widening the one control that
// currently cannot be argued with. This is a separate door: operator-only, audited, gated on
// a resolution a human actually wrote, and self-limiting — one resolution buys one pass.
//
// ⚠️ IT DOES NOT RESET THE TWO AUTOMATIC ATTEMPTS. `proof_passes_done` is never written here.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Everything the operator needs to answer "why am I looking at this client". */
operatorRouter.get('/proof-review/:clientId/evidence', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' }); return
    }
    const { readCalibration, mayRestartCalibrated } = await import('../lib/proof-calibration-io')
    const { ESCALATION_TRIGGER_COPY, PROOF_REASON_LABELS, whatChangedSentence, automaticAttempt } =
      await import('../lib/proof-calibration')
    const cal = await readCalibration(req.params.clientId)
    const restart = mayRestartCalibrated(cal)

    // ── 🛑 ⚑ 13 Sep (B2) — IS HISTORICAL CLASSIFICATION REQUIRED? READ-ONLY, ONE DEFINITION ──
    //
    // 🛑 WHY THIS LIVES HERE AND NOWHERE ELSE. `claim_proof_authority` fails closed on
    // pre-ledger ambiguity and the two classification POSTs are the remedy — but Vida could not
    // tell a client who NEEDS classifying from one already classified, so the controls could
    // not be shown to exactly the right clients. The browser must not re-derive an authority
    // rule, so the SERVER answers it, from the SAME persisted columns the RPC locks and reads.
    //
    // ⚠️ THESE ARE THE RPC'S OWN PREDICATES, TRANSCRIBED. From
    // `20260912_proof_pass_claims.sql` (`claim_proof_authority`), which reads
    // `coalesce(proof_passes_done, 0)` into `v_done` and `proof_passes_legacy` into `v_legacy`:
    //
    //     ②  if v_legacy is null then
    //           if v_done = 0 then  <auto-classify to 0>  else  return 'unclassified'  end if;
    //        end if;
    //
    //     ③  if v_grant_used is not null and not exists (
    //             select 1 from public.proof_pass_claims
    //              where client_id = p_client_id and authority = 'calibrated_restart')
    //        then return 'restart_unclassified'; end if;
    //
    // So: passes are unclassified when the classification column is NULL **and** the coalesced
    // counter is non-zero; the restart is unclassified when it was SPENT and the ledger holds
    // no `calibrated_restart` row of ANY status. Both are copied exactly — including the
    // coalesce and including "any status" — because a second, nearly-identical definition is
    // how the gate and the control come to disagree about one client.
    //
    // ⚠️ IT REPORTS BOTH INDEPENDENTLY; THE RPC SURFACES THEM ONE AT A TIME. The RPC returns
    // `unclassified` first and never reaches ③ for that client, which is correct for a claim
    // and useless for an operator who needs to see everything waiting on them. Reporting both
    // is a reporting difference, not a semantic one: each boolean is that branch's own test.
    //
    // ⚠️ AND IT NEVER WRITES. The RPC's ② auto-classifies a zero-counter client to 0 as a side
    // effect of claiming; this read must not, so a client with a NULL classification and a zero
    // counter simply reports `false` — the same CONCLUSION (nothing to classify) reached
    // without the write. A GET that classified anything by being loaded would be the exact
    // "historical truth invented by the system" this whole design refuses.
    //
    // ⚠️ AN UNREADABLE ROW THROWS rather than answering `false`. "We could not tell" must never
    // render as "no classification needed" — that would hide the one control that unblocks the
    // client. The route's existing catch turns it into the same 503-shaped refusal the panel
    // already handles.
    const { data: clsRow, error: clsErr } = await db.from('clients')
      .select('proof_passes_done, proof_passes_legacy, proof_calibrated_restart_used_at')
      .eq('id', req.params.clientId).maybeSingle()
    if (clsErr) throw new Error(`classification state unreadable — ${clsErr.message}`)
    if (!clsRow) throw new Error('classification state unreadable — no such client')
    const cls = clsRow as unknown as Record<string, unknown>
    const clsPassesDone = Number(cls.proof_passes_done ?? 0) || 0
    const clsLegacy = cls.proof_passes_legacy == null ? null : Number(cls.proof_passes_legacy)
    const clsRestartUsedAt = (cls.proof_calibrated_restart_used_at as string | null) ?? null

    const { data: restartLedger, error: ledgerErr } = await db.from('proof_pass_claims')
      .select('id').eq('client_id', req.params.clientId).eq('authority', 'calibrated_restart').limit(1)
    if (ledgerErr) throw new Error(`classification state unreadable — ${ledgerErr.message}`)
    const hasRestartLedgerRow = ((restartLedger ?? []) as unknown[]).length > 0

    const legacyPassesClassificationRequired = clsLegacy === null && clsPassesDone !== 0
    const legacyRestartClassificationRequired = clsRestartUsedAt !== null && !hasRestartLedgerRow

    res.json({
      success: true,
      data: {
        client_id: cal.clientId,
        escalated_at: cal.escalatedAt,
        resolved_at: cal.resolvedAt,
        trigger: cal.trigger,
        why: cal.trigger ? ESCALATION_TRIGGER_COPY[cal.trigger] : null,
        passes_done: cal.passesDone,
        phone: cal.phone,
        // ⚑ 11 Sep — the NAME as well as the number. An operator with a phone and no name
        // opens the calibration call with "hello, is that… the company?"
        contact_name: cal.contactName,
        phone_confirmed_at: cal.phoneConfirmedAt,
        operator_note: cal.operatorNote,
        restart_at: cal.restartAt,
        // ⚑ 11 Sep — GRANTED AND USED ARE TWO FACTS. Without the second, the panel cannot
        // tell "one restart is waiting for the client" from "it has already been taken".
        restart_used_at: cal.restartUsedAt,
        resolved_by: cal.resolvedBy,
        // ⚠️ ATTEMPT SUMMARIES ARE DERIVED from lead_feedback × leads.proof_pass, so what the
        // operator reads is what the client actually said — not a copy taken at escalation.
        attempts: cal.attempts.map(a => ({
          ...a,
          // ⚠️ PROVENANCE TRAVELS WITH THE SUMMARY. Vida labels from `kind`, never from the
          // pass number — the calibrated restart shares pass 2's number deliberately.
          kind: a.kind,
          reason_labels: Object.fromEntries(
            Object.entries(a.reasons).map(([k, n]) => [PROOF_REASON_LABELS[k as never] ?? k, n])),
        })),
        may_restart: restart.allowed,
        may_restart_why: restart.why ?? null,
        // ⚑ 11 Sep — the one sentence naming what changed between the two AUTOMATIC sets,
        // built from the client's own reasons. The operator is about to phone them about it.
        what_changed: whatChangedSentence(automaticAttempt(cal, 1) ?? null),
        // ── ⚑ 13 Sep (B2) — THE TWO CLASSIFICATION QUESTIONS, ANSWERED BY THE SERVER ────
        //
        // ⚠️ SERVER-OWNED BOOLEANS, NOT INGREDIENTS. Vida renders each control on its own
        // boolean and re-derives nothing: an authority rule reconstructed in a browser is a
        // second definition that drifts from the first one silently.
        legacy_passes_classification_required:  legacyPassesClassificationRequired,
        legacy_restart_classification_required: legacyRestartClassificationRequired,
        // ⚠️ THE EXISTING PERSISTED COLUMN, SO THE OPERATOR CAN SEE WHAT IS ALREADY RECORDED
        // and so a successful classification is visibly reflected by the refreshed read rather
        // than by the screen assuming its own press worked. `null` means UNCLASSIFIED.
        legacy_passes_classified_as: clsLegacy,
      },
      read_only: 'This endpoint only reads. Nothing was changed by loading it. The two classification booleans are derived from persisted columns and classify nothing.',
    })
  } catch (err) {
    console.error('[operator/proof-review/evidence]', err)
    res.status(500).json({ success: false, error: 'The calibration evidence could not be read' })
  }
})

/**
 * Restart Proof (calibrated) — ONE human-authorised pass, after a real resolution.
 *
 * ⚠️ IT GRANTS, IT DOES NOT RUN. No provider is called and no batch is sourced: the grant is
 * recorded, and the ordinary Proof path becomes available once more for exactly one pass.
 * Sourcing on the operator's press would put a paid call behind a button whose purpose is to
 * say "the targeting is fixed now".
 */
operatorRouter.post('/proof-review/:clientId/restart', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' }); return
    }
    const { readCalibration, mayRestartCalibrated } = await import('../lib/proof-calibration-io')
    const cal = await readCalibration(req.params.clientId)
    const verdict = mayRestartCalibrated(cal)
    if (!verdict.allowed) {
      res.status(400).json({ success: false, error: verdict.why }); return
    }
    const nowIso = new Date().toISOString()
    // ⚠️ CONDITIONAL ON THE RESOLUTION WE JUDGED. Two operators pressing together produce one
    // grant: the second matches no row because `proof_calibrated_restart_at` has moved past
    // the resolution it was checked against.
    //
    // ⛓️ 11 Sep — IT NO LONGER NULLS `proof_review_requested_at`, AND THAT WAS AN AUDIT BUG.
    // Clearing it was how the grant re-opened the spend doors, because `escalated` reads
    // "requested and not resolved". But `resolve` has already stamped `proof_review_resolved_at`
    // — which this grant REQUIRES — so `escalated` is ALREADY false by the time we get here
    // and the clear bought nothing. What it cost was the record that the escalation ever
    // happened: the founder's audit rule is that the history must prove escalation occurred,
    // human resolution occurred, the restart became available, and it was claimed. Erasing the
    // first of those to unlock the third is exactly the wrong trade.
    // ── 🛑 ⛓️ 12 Sep (R119) — `restart_at` TRANSITIONS FROM NULL EXACTLY ONCE ───────────
    //
    // ⛓️ THE STRUCK FILTER:
    // ~~`.or('proof_calibrated_restart_at.is.null,proof_calibrated_restart_at.lt.' + cal.resolvedAt)`~~
    // — which permitted a new grant whenever the newest resolution was later than the last
    // grant. That is the per-resolution allowance R119 forbids, and it was reachable: the
    // exhausted-Proof hand-off re-opens a RESOLVED review, a second resolution moved
    // `proof_review_resolved_at` forward, and this write then matched again.
    //
    // ⚠️ THE GUARD IS THE WRITE ITSELF, NOT THE VERDICT ABOVE IT. `mayRestartCalibrated`
    // already refuses, but a verdict is read BEFORE the update and a stale verdict, a
    // double-click or two operators pressing together would each carry a passing one. With
    // `.is(..., null)` the column can leave NULL exactly once, whatever the verdict said, so
    // a second grant is impossible rather than merely unlikely.
    //
    // ⚠️ AND A BURNED RESTART NEEDS NO NEW GRANT. If the one restart was consumed and then
    // RELEASED (infrastructure failure), the original grant is still on this row and the
    // durable claim ledger reissues the authority against it — so refusing here costs the
    // client nothing they are entitled to.
    const { data, error } = await db.from('clients')
      .update({ proof_calibrated_restart_at: nowIso })
      .eq('id', req.params.clientId)
      .not('proof_review_resolved_at', 'is', null)
      .is('proof_calibrated_restart_at', null)
      .select('id')
    if (error) {
      res.status(500).json({ success: false, error: `The calibrated restart could not be recorded (${error.message}). No pass was granted.` })
      return
    }
    if ((data ?? []).length === 0) {
      // R119: one grant per client, for the client's lifetime. A re-opened review and a
      // second resolution may both be legitimate; neither creates a second restart.
      res.status(409).json({ success: false, error: 'This client has already had their one calibrated restart. There is no second restart.' })
      return
    }
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: req.params.clientId,
      action: 'proof_calibrated_restart_granted', subjectType: 'client', subjectId: req.params.clientId,
      detail: {
        passes_already_used: cal.passesDone,
        note: cal.operatorNote,
        grants: 'exactly one Proof pass — the two automatic attempts are NOT reset and try_claim_proof_pass is unchanged',
      },
    })
    res.json({
      success: true,
      data: { granted: 1, passes_already_used: cal.passesDone },
      note: 'One calibrated Proof pass is available. The two automatic attempts are not reset.',
    })
  } catch (err) {
    console.error('[operator/proof-review/restart]', err)
    res.status(500).json({ success: false, error: 'The calibrated restart failed' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 12 Sep — THE DURABLE PROOF AUTHORITY LEDGER'S FOUR HUMAN CONTROLS.
//
// The migration classifies NOBODY and releases NOTHING on a timer. Both of those are
// deliberate, and both mean a person has to be able to act. These are those actions —
// admin-key gated, note-required, audited, and each refusing far more than it permits.
//
// 🛑 NONE OF THEM GRANT AUTHORITY. Classification records what ALREADY happened; reconcile
// settles a claim whose run is over. The three unique indexes remain the only thing that
// decides whether a pass can be claimed.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Classify how many automatic Proof passes a pre-ledger client LEGITIMATELY consumed.
 *
 * ⚠️ 0, 1 OR 2 — AND THE VALUE IS A HUMAN JUDGEMENT, NOT A DERIVATION. Historical authority
 * cannot be reconstructed from the data: `icp_run_outcomes` carries no pass number,
 * `proof_started_at` is overwritten on every claim, `leads.proof_pass` did not exist before
 * 3 Sep, `failed` is written by three different paths, and an ABSENT outcome row proves
 * nothing because `recordRunOutcome` swallows its own failure. The founder refused a
 * snapshot of the counter by name: it "would memorialise the defect we are fixing".
 *
 * ⚠️ IT CANNOT SILENTLY OVERWRITE. A second press answers `already_classified`; correcting a
 * classification requires `force: true`, which is a separate decision and is audited as one.
 */
/**
 * 🛑 ⚑ 14 Sep (S1-RT-005) — NEEDS ICP REVIEW: the rail, and the resolution.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────
 *
 * A client described their own market in their own words and our CLOSED provider
 * vocabularies could not take them. The old behaviour refused the whole Milla reply —
 * "Milla didn't catch that", deterministically, for ever. Their words are now kept, only
 * what we can prove is canonicalised, and what is left reaches THIS rail before Proof or any
 * provider spend is possible.
 *
 *     THE CLIENT SPEAKS NATURALLY. THE CLIENT NEVER HAS TO SPEAK APOLLO.
 *     PROVIDER TRANSLATION IS OUR PROBLEM, NOT THEIRS.
 *
 * ⚠️ READ-ONLY. It settles nothing and changes nothing; the resolve route below is the only
 * thing that writes, and it re-canonicalises every value before it does.
 */
operatorRouter.get('/icp-review', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' }); return
    }
    const { data, error } = await db.from('icps')
      .select('id, client_id, name, target_category, target_company_type, industries, seniority_levels, company_sizes, geographies, job_titles, icp_review, icp_review_at')
      .not('icp_review', 'is', null)
      .is('icp_review_resolved_at', null)
      .order('icp_review_at', { ascending: true })
      .limit(100)
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    const rows = (data ?? []) as Array<Record<string, unknown>>
    // The company name and the CONFIRMED customer truth, so an operator translates from what
    // the client actually said rather than from a field name. Two bounded reads, not a join:
    // this rail is small by construction (the partial index exists for exactly that reason).
    const out = []
    for (const r of rows) {
      const { data: c } = await db.from('clients')
        .select('company_name, user_id').eq('id', r.client_id as string).maybeSingle()
      const cl = (c ?? {}) as { company_name?: string | null; user_id?: string | null }
      let briefFactsHeld: unknown = null
      if (cl.user_id) {
        try {
          const { briefDraftFor } = await import('../lib/brief-draft')
          const draft = await briefDraftFor(cl.user_id)
          briefFactsHeld = draft?.facts ?? null
        } catch { /* the rail still renders — the review payload carries their words too */ }
      }
      out.push({
        icp_id: r.id, client_id: r.client_id, company_name: cl.company_name ?? null,
        name: r.name, review: r.icp_review, review_at: r.icp_review_at,
        // What DID translate, so the operator can see the shape they are completing.
        canonical: {
          industries: r.industries, seniority_levels: r.seniority_levels,
          company_sizes: r.company_sizes, geographies: r.geographies, job_titles: r.job_titles,
        },
        // The confirmed customer truth, in the client's own words.
        customer_truth: {
          target_category: r.target_category, target_company_type: r.target_company_type,
          brief: briefFactsHeld,
        },
      })
    }
    res.json({ success: true, data: { reviews: out, vocabularies: ICP_REVIEW_VOCABULARIES } })
  } catch (err) {
    console.error('[operator/icp-review]', err)
    res.status(500).json({ success: false, error: 'The ICP review rail could not be read' })
  }
})

/**
 * 🛑 RESOLVE ONE REVIEW — the operator supplies provider-safe values, and ONLY then does the
 * flag clear.
 *
 * ⚠️ EVERY VALUE IS RE-CANONICALISED SERVER-SIDE. An operator typing into Vida is not more
 * trusted than a model: a value outside the closed vocabulary is REFUSED, because the entire
 * point of the review is to produce a provider-safe list. A resolution that cannot be proven
 * safe must not clear the flag.
 *
 * ⚠️ AN EMPTY RESOLUTION IS REFUSED for a field that needed one. Clearing the review by
 * supplying nothing would leave the provider column empty — which downstream means
 * UNCONSTRAINED — and that is the silent widening this whole design exists to prevent.
 *
 * ⚠️ THE WRITE IS ONE CONDITIONAL UPDATE, so the canonical values and the cleared flag land
 * together or not at all: the flag can never clear without the values that justify it.
 *
 * ⚠️ AND IT IS FENCED ON THE CLIENT AND ON THE UNRESOLVED STATE. A wrong or stale client id
 * matches zero rows; a replay finds `icp_review_resolved_at` already set and matches zero
 * rows. Both answer the same way — no second write, no second ICP, no duplicate.
 */
operatorRouter.post('/icp-review/:icpId/resolve', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' }); return
    }
    const clientId = typeof req.body?.client_id === 'string' ? req.body.client_id : ''
    if (!clientId) {
      res.status(400).json({ success: false, error: 'client_id is required — a resolution must name the client it belongs to.' })
      return
    }
    // ── 🛑 ⚑ 14 Sep (S1-PD-07) — THE THREE PROVIDER COLUMNS ARE READ, AND READ HERE ────
    //
    // 🛑 THE SERVER OWNS THE MERGE. A resolution completes the UNRESOLVED half of a mixed
    // field; the half that already translated is the client's own targeting and must survive
    // it. That half is read from the ROW — never accepted from Vida, which would put the
    // browser back in charge of what a client's live targeting is (the S1-PD-01 defect, at a
    // different door and with an operator key in front of it).
    const { data: row, error: readErr } = await db.from('icps')
      .select('id, client_id, icp_review, icp_review_resolved_at, industries, seniority_levels, company_sizes')
      .eq('id', req.params.icpId).eq('client_id', clientId).maybeSingle()
    if (readErr) { res.status(500).json({ success: false, error: readErr.message }); return }
    if (!row) {
      // ⚠️ THE SAME ANSWER FOR "no such ICP" AND "not this client's ICP", deliberately: an
      // operator key is not a licence to discover which ids belong to whom.
      res.status(404).json({ success: false, error: 'No such ICP for that client.' })
      return
    }
    const r = row as { icp_review?: unknown; icp_review_resolved_at?: string | null }
    if (r.icp_review_resolved_at) {
      res.status(409).json({ success: false, error: 'This review is already resolved. Nothing was changed.' })
      return
    }
    if (!icpNeedsReview(r.icp_review, null)) {
      res.status(409).json({ success: false, error: 'This ICP is not awaiting review. Nothing was changed.' })
      return
    }
    // ⚠️ SNAPSHOTTED BEFORE THE WRITE, NOT READ THROUGH `row` AFTERWARDS. `row` is whatever
    // the database client handed back, and nothing here may depend on it still holding the
    // PRE-update values once the update has run — the merge input and the audit's record of
    // "what was already there" must both be the state this decision was made against.
    const live = row as Record<string, unknown>
    const listBefore = (k: string): string[] =>
      Array.isArray(live[k]) ? (live[k] as unknown[]).map(v => String(v ?? '')) : []
    const alreadyCanonical = {
      industries:       listBefore('industries'),
      seniority_levels: listBefore('seniority_levels'),
      company_sizes:    listBefore('company_sizes'),
    }
    const outcome = resolveReview(
      r.icp_review as { requirements: Array<{ field: ProviderField; said: string[] }> },
      (req.body?.values ?? {}) as Partial<Record<string, string[]>>,
      ICP_REVIEW_VOCABULARIES,
      // The canonical half as the DATABASE holds it, at the moment of the read that this
      // write is fenced against.
      alreadyCanonical,
    )
    if (!outcome.ok) {
      const msg = outcome.reason === 'off_vocabulary'
        ? `These are not values the provider accepts for ${outcome.field}: ${(outcome.bad ?? []).join(', ')}. Pick from the list — the whole point of this review is to produce values a provider will take.`
        : outcome.reason === 'empty'
          ? `${outcome.field} needs at least one value. Leaving it empty would mean NO constraint downstream, which would widen this client's search rather than express it.`
          : outcome.reason === 'over_max'
            // 🛑 A REFUSAL, NOT A SLICE. The operator is told exactly what the union is and
            // what the ceiling is, and makes the bounded choice themselves — because deciding
            // by array position which of a client's constraints to drop is not ours to make.
            ? `${outcome.field} would end up with ${(outcome.would ?? []).length} values and the provider takes at most ${outcome.max}. The full set is: ${(outcome.would ?? []).join(', ')} — the earlier ones are already live on this client's ICP. Nothing was changed. Send the COMPLETE final list for this field, at most ${outcome.max} values: deciding which of a client's constraints to drop is a person's call, not an array slice.`
            : 'That is not a field under review.'
      res.status(400).json({ success: false, error: msg })
      return
    }
    const now = new Date().toISOString()
    const { data: written, error: wErr } = await db.from('icps')
      .update({ ...outcome.values, icp_review_resolved_at: now, icp_review_resolved_by: req.body?.resolved_by ?? null, updated_at: now })
      .eq('id', req.params.icpId).eq('client_id', clientId)
      // 🛑 THE REPLAY FENCE. Two operators pressing save, or one pressing twice, produce
      // exactly one transition; the loser writes nothing and is told so.
      .is('icp_review_resolved_at', null)
      .select('id')
    if (wErr) { res.status(500).json({ success: false, error: `The resolution could not be stored (${wErr.message}). Nothing was changed.` }); return }
    if (!written || written.length === 0) {
      res.status(409).json({ success: false, error: 'Somebody resolved this review a moment ago. Nothing was changed.' })
      return
    }
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId,
      action: 'icp_provider_review_resolved',
      subjectType: 'icp', subjectId: req.params.icpId,
      detail: {
        values: outcome.values,
        // ⚑ 14 Sep (S1-PD-07) — what was already live, so the audit row shows the MERGE and
        // not just the operator's half. "industries became [Consulting, Media]" is only
        // readable later if the record says Consulting was already there.
        already_canonical: alreadyCanonical,
        means: 'the client described their targeting in their own words; these are the provider values an operator translated the UNRESOLVED half into, UNIONED with the half that already translated. Proof and provider sourcing were refused until this was recorded.',
      },
    })
    res.json({ success: true, data: { resolved_at: now, values: outcome.values } })
  } catch (err) {
    console.error('[operator/icp-review/resolve]', err)
    res.status(500).json({ success: false, error: 'The resolution failed' })
  }
})

operatorRouter.post('/proof-review/:clientId/classify-passes', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' }); return
    }
    const passes = Number(req.body?.passes)
    const note   = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 4000) : ''
    const force  = req.body?.force === true
    if (!Number.isInteger(passes) || passes < 0 || passes > 2) {
      res.status(400).json({ success: false, error: 'passes must be 0, 1 or 2 — how many automatic Proof passes this client legitimately consumed.' })
      return
    }
    if (!note) {
      res.status(400).json({ success: false, error: 'A note is required: say what evidence you read. A classification with no reasoning is the guess this control exists to avoid.' })
      return
    }
    const { data, error } = await db.rpc('classify_legacy_proof_passes', {
      p_client_id: req.params.clientId, p_passes: passes, p_note: note, p_force: force,
    })
    if (error) {
      res.status(500).json({ success: false, error: `The classification could not be recorded (${error.message}). Nothing was changed.` })
      return
    }
    const r = (data ?? null) as { ok?: boolean; reason?: string; existing?: number; replaced?: boolean } | null
    if (r?.ok !== true) {
      const already = r?.reason === 'already_classified'
      res.status(already ? 409 : 400).json({
        success: false,
        error: already
          ? `This client is already classified as ${r?.existing} legitimately consumed pass(es). Send force: true to change it deliberately.`
          : `The classification was refused (${r?.reason ?? 'unknown'}).`,
      })
      return
    }
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: req.params.clientId,
      action: r.replaced ? 'proof_legacy_passes_reclassified' : 'proof_legacy_passes_classified',
      subjectType: 'client', subjectId: req.params.clientId,
      detail: {
        passes, note, replaced: !!r.replaced,
        means: 'how many of the two automatic Proof passes this client consumed BEFORE the durable claim ledger existed; it grants nothing',
      },
    })
    res.json({ success: true, data: { passes, replaced: !!r.replaced } })
  } catch (err) {
    console.error('[operator/proof-review/classify-passes]', err)
    res.status(500).json({ success: false, error: 'The classification failed' })
  }
})

/**
 * Classify a pre-ledger calibrated restart: COMPLETED (they got their set) or RELEASED (it
 * was burned by infrastructure and the one restart comes back).
 *
 * ⚠️ "ZERO RESTART-ATTRIBUTED LEADS" IS NOT EVIDENCE OF A BURN, which is why this is a human
 * decision. A batch whose surfacing UPDATE failed leaves exactly that signature with the
 * leads sitting in the table invisible — the alert at that failure says so.
 */
operatorRouter.post('/proof-review/:clientId/classify-restart', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' }); return
    }
    const status = req.body?.status === 'completed' ? 'completed'
                 : req.body?.status === 'released'  ? 'released' : null
    const note   = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 4000) : ''
    if (!status) {
      res.status(400).json({ success: false, error: 'status must be "completed" (they received their restart set) or "released" (it was burned before they saw anything).' })
      return
    }
    if (!note) {
      res.status(400).json({ success: false, error: 'A note is required: say what evidence you read.' })
      return
    }
    const { data, error } = await db.rpc('classify_legacy_restart', {
      p_client_id: req.params.clientId, p_status: status, p_note: note,
    })
    if (error) {
      res.status(500).json({ success: false, error: `The restart classification could not be recorded (${error.message}). Nothing was changed.` })
      return
    }
    const r = (data ?? null) as { ok?: boolean; reason?: string } | null
    if (r?.ok !== true) {
      const already = r?.reason === 'already_classified'
      res.status(already ? 409 : 400).json({
        success: false,
        error: already
          ? 'This client\'s historical calibrated restart has already been classified. It is recorded once and not revisited.'
          : `The restart classification was refused (${r?.reason ?? 'unknown'}).`,
      })
      return
    }
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: req.params.clientId,
      action: 'proof_legacy_restart_classified', subjectType: 'client', subjectId: req.params.clientId,
      detail: {
        status, note,
        means: status === 'completed'
          ? 'the client received their one calibrated restart set; the restart door is now shut for ever'
          : 'the restart was burned by infrastructure before the client saw anything; the one restart is available again',
      },
    })
    res.json({ success: true, data: { status } })
  } catch (err) {
    console.error('[operator/proof-review/classify-restart]', err)
    res.status(500).json({ success: false, error: 'The restart classification failed' })
  }
})

/**
 * OPEN Proof claims old enough that no healthy run is still plausibly working.
 *
 * 🛑 READ-ONLY, AND THE THRESHOLD RELEASES NOTHING. There is no proven hard upper bound on
 * `runIcpJob` — the PDL search is bounded at ~155 s but every database round-trip in it is an
 * unbounded fetch (`packages/db/src/client.ts` sets no timeout) and the run is a floating
 * promise nothing can cancel. An automatic release on elapsed time could therefore reissue
 * authority while the original run is STILL ALIVE, producing two live runs for one pass. So
 * time decides only when a human is shown the claim.
 */
operatorRouter.get('/proof-claims/stale', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' }); return
    }
    const { staleProofClaims, PROOF_CLAIM_STALE_MS, RECONCILE_RELEASE_WARNING, RECONCILE_COMPLETE_WARNING } =
      await import('../lib/proof-claim')
    const claims = await staleProofClaims()
    res.json({
      success: true,
      data: {
        stale_after_ms: PROOF_CLAIM_STALE_MS,
        claims,
        release_warning:  RECONCILE_RELEASE_WARNING,
        complete_warning: RECONCILE_COMPLETE_WARNING,
      },
      read_only: 'This endpoint only reads. No claim was settled and no authority was changed by loading it.',
    })
  } catch (err) {
    console.error('[operator/proof-claims/stale]', err)
    res.status(500).json({ success: false, error: 'The stale Proof claims could not be read' })
  }
})

/**
 * Settle an OPEN claim whose run outcome is genuinely unknown — the ONLY thing that resolves
 * a process death, because nothing does it on a timer.
 *
 * ⚠️ IT REFUSES A CLAIM THAT IS NOT STALE. A fresh claim may still be a live run, and
 * settling it would be the automatic time-based release wearing a person's face.
 */
operatorRouter.post('/proof-claims/:claimId/reconcile', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' }); return
    }
    const decision = req.body?.decision === 'completed' ? 'completed'
                   : req.body?.decision === 'released'  ? 'released' : null
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 4000) : ''
    const { reconcileProofClaim, RECONCILE_RELEASE_WARNING } = await import('../lib/proof-claim')
    if (!decision) {
      res.status(400).json({
        success: false,
        error: 'decision must be "completed" or "released".',
        release_warning: RECONCILE_RELEASE_WARNING,
      })
      return
    }
    if (!note) {
      res.status(400).json({
        success: false,
        error: 'A note is required: say what you checked and why the original run will not finish.',
        release_warning: RECONCILE_RELEASE_WARNING,
      })
      return
    }
    const r = await reconcileProofClaim(req.params.claimId, decision)
    if (!r.ok) {
      const code = r.reason === 'not_found' ? 404 : r.reason === 'unreadable' ? 500 : 409
      res.status(code).json({
        success: false,
        error: r.reason === 'not_stale'
          ? 'That claim is too recent to reconcile — the original run may still be working. Nothing was changed.'
          : r.reason === 'not_open'
            ? 'That claim has already been settled. Nothing was changed.'
            : r.reason === 'not_found'
              ? 'No such Proof claim.'
              : `The claim could not be reconciled (${r.detail ?? 'unknown'}). Nothing was changed.`,
      })
      return
    }
    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: null,
      action: 'proof_claim_reconciled', subjectType: 'proof_pass_claim', subjectId: req.params.claimId,
      detail: {
        decision, note,
        means: decision === 'released'
          ? 'the operator concluded the original run will NOT subsequently complete, so the client\'s Proof attempt was returned'
          : 'the operator confirmed the batch actually landed, so the attempt is recorded as consumed',
      },
    })
    res.json({ success: true, data: { decision } })
  } catch (err) {
    console.error('[operator/proof-claims/reconcile]', err)
    res.status(500).json({ success: false, error: 'The claim could not be reconciled' })
  }
})

/**
 * ⚑ 12 Sep (R120) — WELCOME EMAILS THAT NEED A HUMAN.
 *
 * 🛑 "OPERATOR-VISIBLE" HAS TO MEAN A REAL PATH, and this is it: the persisted truth lives on
 * the client row and this reads it. A founder alert supplements it and is deliberately NOT
 * the only record — an alert is a notification, not a queue you can come back to.
 *
 * ⚠️ READ-ONLY. It sends nothing, retries nothing and releases no claim.
 */
operatorRouter.get('/welcome-emails/unresolved', async (req: Request, res: Response) => {
  try {
    if (!adminKeyValid(req.headers['x-admin-key'])) {
      res.status(403).json({ success: false, error: 'Operator key required' }); return
    }
    const { WELCOME_UNRESOLVED_OUTCOMES, welcomeOperatorAction, WELCOME_IDEMPOTENCY_WINDOW_MS } =
      await import('../lib/welcome-email-state')
    const { data, error } = await db.from('clients')
      .select('id, company_name, welcome_email_claimed_at, welcome_email_outcome, welcome_email_message_id')
      .in('welcome_email_outcome', WELCOME_UNRESOLVED_OUTCOMES as unknown as string[])
      .order('welcome_email_claimed_at', { ascending: true })
      .limit(200)
    if (error) {
      res.status(500).json({ success: false, error: `The unresolved welcome emails could not be read (${error.message}).` })
      return
    }
    const now = Date.now()
    const rows = (data ?? []) as Array<{
      id: string; company_name: string | null; welcome_email_claimed_at: string | null
      welcome_email_outcome: string | null; welcome_email_message_id: string | null
    }>
    res.json({
      success: true,
      data: {
        window_ms: WELCOME_IDEMPOTENCY_WINDOW_MS,
        clients: rows.map(r => ({
          client_id:     r.id,
          company_name:  r.company_name,
          claimed_at:    r.welcome_email_claimed_at,
          outcome:       r.welcome_email_outcome,
          // ⚠️ ALWAYS RENDERED, EVEN WHEN NULL. "No provider id" is the fact that makes this
          // row unresolved, so it must be visible rather than absent.
          provider_message_id: r.welcome_email_message_id ?? null,
          action: welcomeOperatorAction(r.welcome_email_outcome, r.welcome_email_claimed_at, now),
        })),
      },
      read_only: 'This endpoint only reads. No email was sent and no claim was released by loading it.',
    })
  } catch (err) {
    console.error('[operator/welcome-emails/unresolved]', err)
    res.status(500).json({ success: false, error: 'The unresolved welcome emails could not be read' })
  }
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

    // ── 🛑 ⚑ 10 Sep (I2) — THE ANSWER IS STORED NOW, BECAUSE IT WAS BEING THROWN AWAY ────
    //
    // ⛓️ WHAT THIS FIXES. The check has been correct since #552 and its RESULT went nowhere but
    // a boolean inside an audit row's `detail`, which nothing reads. So every gate downstream
    // could ask "does this row have a host, a username and a password saved?" and none of them
    // could ask "do those credentials actually work?" — a typo in a password passed readiness,
    // reached READY_FOR_APPROVAL, and surfaced when a real prospect's first email failed on a
    // warmed mailbox.
    //
    // ⚠️ A FAILED CHECK CLEARS `verified_at`. A mailbox that worked in July and has had its
    // App Password revoked since must not keep reading as verified because it once passed.
    // ⚠️ THE WRITE IS NOT ALLOWED TO BREAK THE CHECK. Before the migration runs these columns
    // do not exist, and an operator pressing Test connection must still be told what the
    // mailbox said — the gate that consumes the column fails closed on its own.
    const stampedAt = new Date().toISOString()
    const { error: stampErr } = await db.from('client_inboxes').update(
      result.ok
        ? { verified_at: stampedAt, verify_failed_at: null, verify_detail: result.message }
        : { verified_at: null, verify_failed_at: stampedAt, verify_detail: result.message },
    ).eq('id', req.params.id).eq('client_id', client.id)
    if (stampErr) {
      console.error('[operator/inbox-verify] the result could not be stored:', stampErr.message,
        '— run migration 20260910_inbox_verification if the columns are missing')
    }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'assign_inbox',
      subjectType: 'inbox', subjectId: req.params.id,
      detail: { verified: result.ok, stored: !stampErr },
    })
    // 200 either way: "we asked and it said no" is a successful check, not a server error.
    res.json({ success: true, data: result })
  } catch (err) { console.error('[operator/inbox-verify]', err); res.status(500).json({ success: false, error: 'Failed to check the mailbox' }) }
})

// ── 🔐 THE FOUNDER-PRESSED SEND RUN — one client, one ceiling, one press ─────────────
//
// ⚑ 2 Sep. `AUTO_OUTREACH_ENABLED` is a single global switch that arms EVERY automatic path
// at once — the 2-hourly campaign cron across every client, day-1 batches, co-pilot releases.
// A launch canary needs the opposite of that: one client, a number the founder chose, sent
// when they press the button, with the global switch still off.
//
// ⚠️ DOUBLE-KEYED, AND BOTH KEYS ARE REQUIRED. Admin auth (the router-level guard) AND
// `FIGSY_OPERATOR_SEND_ENABLED === 'true'`. The env alone sends nothing — it authorises a
// route nobody has called yet. Arriving here alone sends nothing either.
//
// ⚠️ NO DEFAULTS ANYWHERE. `client_id` and `max_sends` are both required and both refused
// when absent: an unscoped run and an unbounded run are the two mistakes this control exists
// to make impossible, and a default is how either one arrives by accident. `max_sends` is
// also NOT derived from the mailbox caps — those are a separate, second boundary.
//
// It calls the SAME `runSendDue` the cron calls, so suppression, PECR, country, the demo
// backstop, programme authority, the review queue, the atomic claim, the global cap, the
// per-client cap, the per-campaign cap and the send window are all the cron's own gates.
operatorRouter.post('/send-due/run-once', async (req: Request, res: Response) => {
  try {
    // ══ 🛑 THE KILL-SWITCH IS ASKED FIRST, AND IT OUTRANKS THIS ROUTE'S OWN KEY ═════════
    //
    // ⛓️ CORRECTED 9 Sep. This route checked only `FIGSY_OPERATOR_SEND_ENABLED`, and the
    // send core used to let an operator run past the kill-switch on that authority alone.
    // Both halves are now wrong: **KILL-SWITCH ON = NO EXTERNALLY DELIVERED OUTREACH OF ANY
    // KIND**, with no exception for a founder-pressed run.
    //
    // ⚠️ REFUSED HERE AS WELL AS AT THE SEAM, DELIBERATELY. The core would defer every
    // enrollment one at a time and answer "0 sent" — technically safe, and unreadable. An
    // operator who pressed Run deserves the reason, not an empty run.
    const { outreachDeliveryPermitted, KILL_SWITCH_REFUSAL } = await import('../lib/outreach-kill-switch')
    if (!outreachDeliveryPermitted()) {
      res.status(503).json({ success: false, error: KILL_SWITCH_REFUSAL })
      return
    }

    // AND ITS OWN SECOND KEY, ON TOP — never instead. A run is NARROWER than the cron, so it
    // needs one more gate than the cron does, not one fewer.
    const { operatorSendEnabled } = await import('../lib/figsy')
    if (!operatorSendEnabled()) {
      res.status(503).json({ success: false, error:
        'Manual sending is switched off. FIGSY_OPERATOR_SEND_ENABLED is not set to "true" on the API, so no run can be started. Nothing was sent.' })
      return
    }

    const b = (req.body ?? {}) as Record<string, unknown>
    const client = await requireClient(b.client_id as string | undefined)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id. A run must name exactly one client — there is no all-clients mode.' }); return }

    // A whole positive number, and nothing else. `Number('')` is 0 and `Number(undefined)` is
    // NaN, so both are tested rather than trusted — the same lesson as `normalisePort`.
    const raw = b.max_sends
    const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim())
    if (!Number.isInteger(n) || n < 1) {
      res.status(400).json({ success: false, error:
        'max_sends is required and must be a whole number of 1 or more — the most successful sends this run may produce. Nothing was sent.' })
      return
    }

    const { runSendDue } = await import('../lib/send-due')
    const data = await runSendDue({ mode: 'operator_run', clientId: client.id, maxSends: n })

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'operator_send_run',
      subjectType: 'client', subjectId: client.id,
      detail: { max_sends: n, sent: data.sent, attempted: data.attempted, failed: data.failed,
                per_mailbox: data.per_mailbox, exhausted: data.exhausted_clients.length > 0 },
    })

    res.json({ success: true, data })
  } catch (err) {
    console.error('[operator/send-due-run-once]', err)
    res.status(500).json({ success: false, error: 'The send run failed to complete' })
  }
})

// ── #553 — DOES THIS ONE MAILBOX ACTUALLY DELIVER? ──────────────────────────────────
//
// `/verify` above authenticates and sends NOTHING, which proves the password and proves
// nothing about deliverability. #553's ladder asks for something `/verify` cannot answer:
// *"a test send lands in a real inbox (not Promotions, not spam) · mail-tester ≥9/10"*, and
// the runbook adds *"run this once per sending mailbox you intend to use, not just the
// first one."*
//
// 🛑 AND THE CONTROL THE RUNBOOK POINTS AT TESTS THE WRONG SENDER. `/campaign/:id/test`
// sends through **Resend from `COLD_FROM`** — our shared `gettingkind.com` identity. It
// never opens `client_inboxes` and never calls `mailer.ts`. So following the runbook
// literally scores a mailbox that will not be sending, and a Google box could fail
// placement with every check on the board green. This route is the missing one.
//
// ⚠️ THE MAILBOX IS NAMED, NEVER CHOSEN. `pickSendingInbox` exists to decide WHICH box
// sends, and for a diagnostic that is exactly the wrong behaviour: it ranks active before
// assigned and branded before pooled, so on a two-box client it would answer `jacques@`
// however hard you tried to test `hello@`. This path resolves the row by its own id and
// hands it straight to `sendAs`, which takes an InboxRow and consults no ranking. **There
// is no rotation here and there must never be.**
//
// ⚠️ WHY `warming` IS ALLOWED HERE AND NOWHERE ELSE. `SENDABLE_STATUSES` excludes warming
// because *sending on a warming mailbox is what un-warms it* — true of campaign volume, and
// the reason that rule is untouched by this file. One operator-initiated diagnostic to an
// address the operator typed is not campaign volume, and refusing it would make #553's
// ladder impossible to climb: a mailbox cannot leave `warming` until it is proven, and it
// could not be proven until it left `warming`. The exception is bounded by this handler —
// `pickSendingInbox` is not called, not modified, and still refuses warming everywhere else.
//
// ⚠️ NOT RECORDED IN `figsy_sent_emails`, DELIBERATELY. That table's `lead_id` is NOT NULL
// against `leads`, so a diagnostic could only be stored by inventing a lead — and #637 lists
// five surfaces that read it as the CLIENT'S OWN sent-counter, including their dashboard.
// A test would inflate a client's own numbers with mail no prospect received. There is no
// column distinguishing diagnostic from campaign and inventing one is a schema change this
// build was not given. The operator audit log is the right home and already exists.
operatorRouter.post('/inboxes/:id/test-send', async (req: Request, res: Response) => {
  try {
    const { client_id, to_email } = (req.body ?? {}) as { client_id?: string; to_email?: string }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    // ══ 🛑 THE KILL-SWITCH — A MAILBOX TEST IS A REAL EXTERNAL SEND ═════════════════════
    //
    // ⛓️ ADDED 9 Sep. This connects to a client's authenticated mailbox and delivers a real
    // message to a real address. `sendAs` now refuses at the seam regardless, so this is the
    // readable half of the same refusal — an operator gets the sentence rather than an SMTP
    // verdict that reads like the mailbox's fault.
    //
    // ⚠️ AND THE #553 LADDER IS NOT DEADLOCKED BY THIS. Turning the kill-switch off delivers
    // nothing on its own: programme authority, approval, P2, LIVE, the sender and the
    // schedule all still have to say yes, and with no programme LIVE the cron has nothing to
    // send. Proving a mailbox with the switch off is safe; proving it while the switch says
    // nothing can send would mean the switch does not mean what it says.
    const { outreachDeliveryPermitted: canDeliver, KILL_SWITCH_REFUSAL: refusal } =
      await import('../lib/outreach-kill-switch')
    if (!canDeliver()) { res.status(503).json({ success: false, error: refusal }); return }

    // A typo'd recipient on a warmed mailbox is a real bounce against real reputation, so
    // the address is checked before anything connects rather than left to the mail server.
    const to = String(to_email ?? '').trim()
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      res.status(400).json({ success: false, error: 'Enter the address to send the test to — a full email address, e.g. you@yourdomain.com.' })
      return
    }

    // ⚠️ SCOPED BY ID *AND* CLIENT. `.eq('id')` alone would let one client's console send
    // through another client's authenticated mailbox — the exact cross-client leak the
    // per-send transport in `mailer.ts` was written to prevent.
    const { data: inbox, error } = await db.from('client_inboxes')
      .select('id, email, kind, status, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name')
      .eq('id', req.params.id).eq('client_id', client.id).maybeSingle()
    if (error) throw error
    if (!inbox) { res.status(404).json({ success: false, error: 'Inbox not found for this client' }); return }

    const box = inbox as { email: string; status: string; smtp_host: string | null; smtp_user: string | null; smtp_pass_enc: string | null }
    if (!box.smtp_host || !box.smtp_user || !box.smtp_pass_enc) {
      res.status(400).json({ success: false, error: `${box.email} has no SMTP details saved, so there is nothing to send through. Add the host, username and app password first.` })
      return
    }
    // A released or retired mailbox is one we have deliberately stopped using. Testing it
    // would put mail on a reputation we no longer own the story of.
    if (box.status === 'released' || box.status === 'retired') {
      res.status(409).json({ success: false, error: `${box.email} is ${box.status} — a mailbox taken out of service is not tested back into one.` })
      return
    }

    // Plain text, no HTML, no pixel, no unsubscribe furniture, no template. Every one of
    // those changes what a spam filter scores, and the whole point of this message is to
    // measure the MAILBOX rather than our cold-email markup.
    const sender = String(box.smtp_user)
    const { sendAs } = await import('../lib/mailer')
    const sent = await sendAs(inbox as never, {
      to,
      subject: `M&V mailbox test — ${sender}`,
      text: `This is a controlled M&V mailbox delivery test from ${sender}.\nNo campaign or outreach has been enabled.\n`,
    })

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'mailbox_test_send',
      subjectType: 'inbox', subjectId: req.params.id,
      detail: { from: sender, to, status: box.status, delivered: sent.ok },
    })

    if (!sent.ok) {
      // 200, like `/verify`: "we asked and the mail server said no" is a completed check,
      // and a 500 would read on the board as OUR fault rather than the mailbox's.
      const why = sent.error instanceof Error ? sent.error.message : String(sent.error ?? 'unknown error')
      res.json({ success: true, data: { sent: false, from: sender, to, message: `${sender} could not send to ${to}. ${why}` } })
      return
    }

    res.json({ success: true, data: { sent: true, from: sender, to, message: `Test email sent from ${sender} to ${to}. Check that it arrived in the inbox — not Promotions, not spam.` } })
  } catch (err) {
    console.error('[operator/inbox-test-send]', err)
    res.status(500).json({ success: false, error: 'Failed to send the test' })
  }
})

// ── A22 / R25 — THE UNLOCK-DAY BACKFILL ─────────────────────────────────────────────
// Re-offers leads that were approved BEFORE the Smartlead key existed. Without this, every
// lead approved before unlock day stays un-pushed forever — charged, revealed, enrolled and
// never in the client's campaign — which would make "day 1 a client uses the system" (R25)
// true only for leads approved after the purchase. Operator-triggered, never automatic:
// a backfill that fires on its own lands a month of leads in a campaign nobody was watching.
// Every gate re-runs per lead because it calls the same push the money path calls.
operatorRouter.post('/smartlead/backfill', async (req: Request, res: Response) => {
  try {
    const { client_id, limit } = (req.body ?? {}) as { client_id?: string; limit?: number }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }

    const { backfillSmartleadForClient, backfillSummary, BACKFILL_DEFAULT_LIMIT } =
      await import('../lib/smartlead-backfill')
    const capped = Math.min(Number(limit) > 0 ? Number(limit) : BACKFILL_DEFAULT_LIMIT, BACKFILL_DEFAULT_LIMIT)
    const outcome = await backfillSmartleadForClient(client.id, capped)

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: client.id, action: 'assign_inbox',
      subjectType: 'inbox', subjectId: 'smartlead-backfill',
      detail: { found: outcome.found, pushed: outcome.pushed, refused: outcome.refused, halted: outcome.haltedBefore ?? null },
    })
    // 200 even when nothing was pushed: "we asked and every gate said no" is a successful
    // check, not a server error — the summary is where the operator reads the verdict.
    res.json({ success: true, data: { ...outcome, summary: backfillSummary(outcome) } })
  } catch (err) {
    console.error('[operator/smartlead-backfill]', err)
    res.status(500).json({ success: false, error: 'Failed to run the backfill' })
  }
})

// ── V9 #270 — assign a PRE-WARMED POOLED inbox (instant; client sends day 1) ────────
operatorRouter.post('/inboxes/assign', async (req: Request, res: Response) => {
  try {
    const { client_id, email, daily_cap } = (req.body ?? {}) as { client_id?: string; email?: string; daily_cap?: number }
    const client = await requireClient(client_id)
    if (!client) { res.status(404).json({ success: false, error: 'Unknown client_id' }); return }
    if (!email || !email.includes('@')) { res.status(400).json({ success: false, error: 'A pooled inbox email is required' }); return }

    // ⚠️ A22 — CHECK FIRST, DO NOT LEAN ON THE INDEX. `client_inboxes_one_live_per_kind`
    // (migration 20260725_client_inboxes) is the backstop and it does hold — but a raw
    // constraint violation surfaces here as a 500 "Failed to assign inbox", which tells the
    // operator nothing and looks like a broken server rather than a second pooled box.
    const { data: existingPooled } = await db.from('client_inboxes')
      .select('id, email').eq('client_id', client.id).eq('kind', 'pooled')
      .in('status', ['assigned', 'warming', 'active']).maybeSingle()
    if (existingPooled) {
      res.status(409).json({ success: false,
        error: `This client already has a live pooled mailbox (${(existingPooled as { email?: string }).email ?? 'unknown'}). Release that one first, or record the client's own branded mailbox instead — a second pooled box would give them two senders and no rule for which one sends.` })
      return
    }

    // ⚠️ 13 Aug — `provider` MUST be set here, and it took a hard verify to see why. The
    // month-one push gate (`hasSmartleadInbox`) requires provider = SMARTLEAD_SENDING_MODE
    // ('smartlead-api'), but this insert predates that mode and leaned on the column default
    // ('smartlead') — so a pooled box assigned from Vida NEVER satisfied the gate. On unlock
    // day the key would be green, the box assigned exactly per the runbook, and every push
    // AND the whole backfill would still refuse 'no_smartlead_inbox' — quietly, because that
    // refusal is one of the expected-not-news five. The pooled box IS the Smartlead-rented,
    // API-driven mailbox; it must say so.
    const { SMARTLEAD_SENDING_MODE } = await import('../lib/smartlead-map')
    const { data, error } = await db.from('client_inboxes').insert({
      client_id: client.id, email: email.trim().toLowerCase(), kind: 'pooled',
      status: 'active', daily_cap: daily_cap ?? null, provider: SMARTLEAD_SENDING_MODE,
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
    // `activate: true` because this IS K.I.N.D: an operator creating a client's ICP in Vida
    // has just set it active on the line above, so its campaign goes live with it. The
    // one-active invariant still applies inside — a competing live campaign refuses, and
    // this call already tolerates that (it is fire-and-forget and the ICP row is the
    // operator's record either way).
    const { ensureCampaignForIcp } = await import('../lib/start-work')
    void ensureCampaignForIcp(client.id, data.id, data.name, { activate: true }).catch(() => {})
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
    // R3 — WAS `> 10`, AND THE GATE HAS BEEN 7 SINCE THE FOUNDER RULED IT. So an operator
    // could build an 8-, 9- or 10-step sequence, save it with no complaint, and only meet the
    // wall on pressing activate — a screen that lets you do what the system will refuse
    // (#626's shape). The error names the real number so the fix is obvious from the message.
    if (b.steps.length > MAX_SEQUENCE_STEPS) {
      res.status(400).json({ success: false, error: `Maximum ${MAX_SEQUENCE_STEPS} steps — past that, persistence reads as pestering and activation will refuse it.` })
      return
    }

    const steps = (b.steps as Record<string, unknown>[]).map((st, i) => ({
      step: i + 1,
      subject: String(st.subject ?? '').slice(0, 200),
      body: String(st.body ?? '').slice(0, 5000),
      // #651 — `wait_days` is the delay AFTER this step. The old default (`i === 0 ? 0 : 3`)
      // used the opposite convention, so a step saved without one told the engine to send
      // the NEXT email immediately. 4 days is the meeting-cadence default.
      wait_days: Number(st.wait_days ?? 4) || 0,
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
      // `pending_targeting` / `pending_submitted_at` are here so Vida can SEE that a live
      // client's revision is waiting for review. Without them the founder's ruling would be
      // enforced invisibly: the change would correctly not apply, and nobody here would
      // know there was anything to look at.
      db.from('icps').select('id, name, created_at, last_run_at, is_active, pending_targeting, pending_submitted_at, pending_campaign_intent')
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
    /** The operator's own words, forwarded to the surface the handoff opens. Never a summary. */
    let handoffText: string | null = null

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
      // ── ⚑ 4 Sep — THE TYPED DEFINITION IS CARRIED, NOT DISCARDED ────────────────────────
      //
      // 🛑 THE FOUNDER TYPED A WHOLE ICP INTO THIS BAR AND GOT A SENTENCE BACK. This branch
      // matched on `/icp|target|persona|who/`, returned canned prose and threw `q` away, so he
      // was told to go and say it again somewhere else. The two failures were separate and
      // both are fixed here: the link named no destination (`/vida?client=` lands on the
      // default tab, which is Inbox), and the words he had already written were dropped.
      //
      // ⚠️ THIS DOES NOT MAKE THE COMMAND BAR AN ICP ENGINE. It resolves no targeting, calls
      // no model and proposes nothing — it hands the operator's own sentence to the surface
      // that does, as the opening turn. `handoff_text` is exactly what they typed.
      kind = 'handoff'; link = `/vida?client=${cid}&tab=ICP&mode=chat`
      handoffText = q
      reply = `Taking you to the ICP conversation with what you just said — Vida will pick it up from there.`
    } else {
      // ── ⚑ 4 Sep — THE FALLBACK NO LONGER SHRUGS AND DROPS THE SENTENCE ──────────────────
      //
      // 🛑 THE ICP BRANCH ABOVE ONLY FIRES ON THE WORDS "icp / target / persona / who". The
      // founder typed *"Founder-led B2B agencies and consultancies in the UK and United
      // States"* — a complete ICP containing none of those words — so it fell to here, and
      // here used to reply with a menu and discard what he had written. He then had to say it
      // again somewhere else.
      //
      // ⚠️ THE FIX IS NOT WIDER INTENT MATCHING. Guessing that an arbitrary sentence is
      // targeting is how a status question becomes an ICP proposal. Nothing is classified and
      // nothing is auto-opened: the words are simply KEPT and offered, and the operator
      // decides by pressing or not pressing. The reply is honest that it did not understand.
      kind = 'handoff'; link = `/vida?client=${cid}&tab=ICP&mode=chat`
      handoffText = q
      reply = `I'm not sure what you're asking me to do with that. If it describes who we should be hunting for, open the ICP conversation and I'll carry your words straight in. Otherwise try "status" or "what's blocking?".`
    }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: cid, action: 'vida_command',
      subjectType: 'client', subjectId: cid, detail: { text: q, kind },
    })
    res.json({ success: true, reply, kind, link, handoff_text: handoffText, counts: c })
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
      // HC-1 — normalise the PROBE. `allCand` carried raw candidate addresses, so this
      // preview could show a blocklisted person as servable.
      const blockedRows = allCand.length > 0
        ? (await db.from('opt_out_blocklist').select('email').is('opted_back_in_at', null)
            .in('email', normalizeRevealEmails(allCand))).data
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

// ── PROGRAMME-NATIVE SOURCING (founder-locked 7 Sep) ──────────────────────────────────
//
// 🛑 WHY THE ROUTE ABOVE COULD NOT DO THIS. `/source` picks ICPs with `.eq('is_active', true)`
// — the client's own screen state — and then hands them to a job whose authority comes from
// `icps.programme_id`. For House those two disagree on purpose: v4 is ATTACHED to the open
// programme but deliberately not client-facing active, while the retired audience still is.
// So `/source` cannot reach the targeting the programme is actually authorised to run.
//
// It also gates on a PAID transaction, which House will never have — House holds INTERNAL P1
// authority instead, and manufacturing a payment to satisfy a check would invent revenue on an
// account that has paid nothing. (The column that carries internal authority is deliberately
// not named here: `programme-authority-schema.test.ts` allowlists the modules that may name it,
// and this route reads authority through `authorityFor`, never through the column.)
//
// The other door, `POST /icps/:id/run`, can address an ICP by id but is the client WALLET
// path: an empty balance mints 20 credits and a `trial_bonus` ledger row.
//
// This route starts from the PROGRAMME instead. All of the real machinery — authority, the
// ceiling, the reservation, the batch, the AR5 provider boundary — stays in `runIcpJob`; this
// is only the door, and `sourceProgramme` writes nothing at all.
operatorRouter.post('/programme/source', async (req: Request, res: Response) => {
  try {
    const { programme_id, confirm } = (req.body ?? {}) as { programme_id?: string; confirm?: boolean }
    if (!programme_id || typeof programme_id !== 'string') {
      res.status(400).json({ success: false, error: 'programme_id is required — this route never infers the programme from a client.' })
      return
    }
    // Sourcing spends real provider budget, so it is never a side effect of a GET-shaped call.
    if (confirm !== true) {
      res.status(400).json({ success: false, error: 'Sourcing spends real provider budget — confirm required' })
      return
    }

    const { sourceProgramme } = await import('../lib/programme-sourcing')
    const result = await sourceProgramme(programme_id)

    if (!result.ok) {
      // A refusal is an ANSWER, not a server fault — it names which control stopped the run so
      // an operator can act on it instead of retrying blindly.
      await writeOperatorAudit({
        operatorEmail: operatorEmail(req), action: 'programme_source_refused',
        subjectType: 'programme', subjectId: programme_id,
        detail: { reason: result.reason, message: result.message },
      })
      res.status(409).json({ success: false, error: result.message, reason: result.reason })
      return
    }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req), clientId: result.clientId, action: 'programme_source_run',
      subjectType: 'icp', subjectId: result.icpId,
      detail: {
        programme_id: result.programmeId, icp_name: result.icpName,
        requested: result.requested, inserted: result.inserted, skipped: result.skipped, note: result.relaxed,
      },
    })
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('[operator/programme/source]', err)
    res.status(500).json({ success: false, error: 'Failed to source for this programme' })
  }
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
      // HC-1 — normalise the PROBE (the returned rows were already lowercased below, which
      // on its own does nothing).
      const { data: blockedRows, error: blockedErr } = await db.from('opt_out_blocklist')
        .select('email').is('opted_back_in_at', null)
        .in('email', normalizeRevealEmails(candidates.slice(i, i + 200)))
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

// ── R46 · GOVERNED DOCUMENTS — VIDA IS THE SINGLE HOME, AND THE CHAIN IS THE HISTORY ───────
//
// Founder-ruled 17 Aug: *"any documents we need to create hold of be governed get held in Vida
// operator. on sole truth of source."*
//
// ⚠️ THERE IS NO UPDATE ROUTE AND NO DELETE ROUTE, AND THAT IS THE FEATURE. A governed document
// is amended by writing a NEW VERSION that names what it supersedes — the same law the rules
// register runs on, and for the same reason: a superseded document that vanishes takes with it
// the evidence that it was ever in force. `governed-documents.test.ts` asserts the absence,
// because an absence nobody guards is an absence somebody adds a handler to next month.
//
// ⚠️ NOT `terms-library`. That screen holds blank uploadable TEMPLATES and legitimately has a
// delete button. This holds instruments whose TEXT is the record. Both screens say so.

/** The document families, newest version of each first. */
operatorRouter.get('/governed-documents', async (_req: Request, res) => {
  try {
    const { data, error } = await db.from('governed_documents')
      .select('id, title, kind, version, supersedes_id, created_at, created_by')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data: data ?? [] })
  } catch (err) {
    // A failed read must NOT render as an empty library — "no governed documents" and "we
    // could not ask" are opposite facts and only one of them is calm.
    console.error('[operator/governed-documents]', err)
    res.status(500).json({ success: false, ...documentReadFailure(err) })
  }
})

/** One document, with its full chain oldest-first, so the history reads as a history. */
operatorRouter.get('/governed-documents/:id', async (req: Request, res) => {
  try {
    const { data: row, error } = await db.from('governed_documents')
      .select('*').eq('id', req.params.id).maybeSingle()
    if (error) throw error
    if (!row) { res.status(404).json({ success: false, error: 'Document not found' }); return }

    // Walk BACKWARDS along supersedes_id to the first version. Bounded: a chain longer than
    // this is a bug, and an unbounded walk on a cycle would hang the request rather than fail.
    const chain: Record<string, unknown>[] = [row]
    let cursor = row.supersedes_id as string | null
    for (let hops = 0; cursor && hops < 100; hops++) {
      const { data: prev } = await db.from('governed_documents').select('*').eq('id', cursor).maybeSingle()
      if (!prev) break
      chain.unshift(prev)
      cursor = prev.supersedes_id as string | null
    }
    res.json({ success: true, data: { current: row, chain } })
  } catch (err) {
    console.error('[operator/governed-documents/:id]', err)
    res.status(500).json({ success: false, ...documentReadFailure(err) })
  }
})

/**
 * Write a document: version 1 when `supersedes_id` is absent, otherwise the next link.
 *
 * ⚠️ THE VERSION NUMBER IS DERIVED, NEVER ACCEPTED FROM THE CALLER. A client-supplied version
 * is a client-supplied lie waiting to happen — two rows claiming v2, or a v7 with no v6. It is
 * read from the row being superseded and incremented here.
 */
operatorRouter.post('/governed-documents', async (req: Request, res) => {
  try {
    const { title, kind, body_md, supersedes_id } = req.body ?? {}
    if (typeof title !== 'string' || !title.trim())     { res.status(400).json({ success: false, error: 'A title is required' }); return }
    if (typeof kind !== 'string' || !kind.trim())       { res.status(400).json({ success: false, error: 'A kind is required' }); return }
    if (typeof body_md !== 'string' || !body_md.trim()) { res.status(400).json({ success: false, error: 'The document body is required' }); return }

    let version = 1
    if (supersedes_id) {
      const { data: prev } = await db.from('governed_documents')
        .select('id, version').eq('id', supersedes_id).maybeSingle()
      if (!prev) { res.status(404).json({ success: false, error: 'The document this supersedes does not exist' }); return }
      version = Number(prev.version ?? 0) + 1
    }

    const { data, error } = await db.from('governed_documents').insert({
      title: title.trim(), kind: kind.trim(), body_md,
      version, supersedes_id: supersedes_id ?? null,
      created_by: operatorEmail(req),
    }).select('id, title, kind, version, supersedes_id, created_at, created_by').single()

    if (error) {
      // 23505 is `governed_documents_one_successor` refusing a FORK — somebody else already
      // superseded this version while this operator was typing. Say that, rather than "insert
      // failed": the fix is to re-read the chain and amend the new head.
      if ((error as { code?: string }).code === '23505') {
        res.status(409).json({ success: false, error: 'That version has already been superseded — reload and amend the newest version.' })
        return
      }
      throw error
    }

    await writeOperatorAudit({
      operatorEmail: operatorEmail(req),
      action: supersedes_id ? 'governed_document_version_added' : 'governed_document_created',
      subjectType: 'governed_document',
      subjectId: data.id,
      detail: { title: data.title, kind: data.kind, version: data.version, supersedes_id: data.supersedes_id },
    })

    res.json({ success: true, data })
  } catch (err) {
    console.error('[operator/governed-documents POST]', err)
    // Same mapping on the write path: a missing table looks identical from here, and an
    // operator who has just typed a document deserves to know it was the migration, not them.
    res.status(500).json({ success: false, ...documentReadFailure(err) })
  }
})
