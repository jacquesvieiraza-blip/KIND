import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { normalizeRevealEmail, normalizeRevealEmails } from '../lib/billing-rules'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { rateLimit } from '../lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'
import { pushToCrm } from '../lib/crm'
import { sendConsentEmail } from '../lib/email'
import { searchPeople, buildSearchBody } from '../lib/apollo'
import { scoreLeadsForIcp } from '../lib/scoring'
import type { BatchCheck } from '../lib/approval-batch'
import { getOrCreateConsentToken, buildConsentUrl } from '../lib/consent'
import { isSuppressed } from '../lib/suppression'
import { waterfallEnrich } from '../lib/enrichment'
import { launchHoldMessage } from '@kind/shared'
import { sendFounderAlert } from '../lib/alerts'

export const leadRouter = Router()

// ── PUBLIC: POPIA consent callback (no auth — lead clicks link in email) ───────
leadRouter.post('/public/consent', async (req, res) => {
  try {
    const { token, consent } = z.object({
      // lead_id is still accepted from the link for backwards compatibility but
      // is no longer trusted — the secure token is the sole proof of identity.
      lead_id: z.string().uuid().optional(),
      token:   z.string().min(1),
      consent: z.boolean(),
    }).parse(req.body)

    // Look the lead up by its unguessable consent token. A valid token IS the
    // authorisation; there is no separate id-equality check to bypass.
    const { data: lead, error: leadErr } = await db.from('leads')
      .select('id, email, first_name, last_name, linkedin_url, status, client_id')
      .eq('consent_token', token).single()

    if (leadErr || !lead) {
      res.status(404).json({ success: false, error: 'Lead not found' }); return
    }

    if (lead.status === 'consent_given' || lead.status === 'opted_out') {
      res.json({ success: true, already_processed: true, status: lead.status }); return
    }

    if (consent) {
      await db.from('leads')
        .update({ status: 'consent_given', consent_given_at: new Date().toISOString() })
        .eq('id', lead.id)

      // Fire-and-forget CRM push
      if (lead.email) {
        const { data: client } = await db.from('clients')
          .select('crm_type, crm_api_key, crm_sync_enabled').eq('id', lead.client_id).maybeSingle()
        if (client?.crm_sync_enabled && client?.crm_type && client?.crm_api_key) {
          const { pushToCrm } = await import('../lib/crm')
          pushToCrm(client.crm_type as any, client.crm_api_key, lead as any).catch(console.error)
        }
      }

      res.json({ success: true, status: 'consent_given' })
    } else {
      if (lead.email) {
        // HC-1 — NORMALISE BEFORE WRITING. `leads.email` is stored raw (icps.ts says so in
        // its own comment), so a decline from `John@Acme.com` used to land a raw row that no
        // send-path probe could match. This person has just REFUSED consent; a row nobody
        // matches is the same as no row at all.
        await db.from('opt_out_blocklist').upsert({
          email:                normalizeRevealEmail(lead.email),
          linkedin_url:         lead.linkedin_url,
          full_name:            `${lead.first_name} ${lead.last_name}`.trim(),
          reason:               'lead_declined_consent',
          blocked_by_client_id: lead.client_id,
        }, { onConflict: 'email', ignoreDuplicates: false })

        await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
          .eq('email', lead.email)
      } else {
        await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
          .eq('id', lead.id)
      }

      res.json({ success: true, status: 'opted_out' })
    }
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[leads/public/consent]', err)
    res.status(500).json({ success: false, error: 'Failed to process consent' })
  }
})

leadRouter.use(requireAuth)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// ── STATS ─────────────────────────────────────────────────────────────────────
leadRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Use allSettled so one failed count doesn't blank the whole stats panel.
    // Only count DELIVERED leads — the client is only shown (and charged for)
    // delivered leads, so stats must match what they can actually see.
    const [total, scored, consented, exported_, optedOut, pendingReview, inFigsy] = (await Promise.allSettled([
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).not('score', 'is', null),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).eq('status', 'consent_given'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).eq('status', 'exported'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).eq('status', 'opted_out'),
      // Pending Review pill: high-quality leads waiting for approval (score ≥ 70, not yet enrolled).
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).gte('score', 70).in('status', ['pending', 'scored']),
      // In FIGSY pill: consented leads in an active outreach state.
      // apollo_consented = provider-VERIFIED email, a legitimate-interest contact — NOT consent
      // (see @kind/shared `Lead`). This count is safe because it ALSO requires a consent status;
      // the flag alone would not mean what "in FIGSY" implies.
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).eq('apollo_consented', true).in('status', ['consent_given', 'consent_sent']),
    ])).map(r => r.status === 'fulfilled' ? r.value : { count: 0 })

    const { data: avgData } = await db.from('leads').select('score, estimated_deal_value_usd')
      .eq('client_id', clientId).not('delivered_at', 'is', null).not('score', 'is', null)

    const avgScore = avgData?.length
      ? Math.round(avgData.reduce((sum: number, l: any) => sum + (Number(l.score) || 0), 0) / avgData.length)
      : 0
    const pipelineValueUsd = avgData?.reduce((sum: number, l: any) => sum + (Number(l.estimated_deal_value_usd) || 0), 0) ?? 0

    res.json({
      success: true,
      data: {
        total:              total.count || 0,
        scored:             scored.count || 0,
        consented:          consented.count || 0,
        exported:           exported_.count || 0,
        opted_out:          optedOut.count || 0,
        pending_review:     pendingReview.count || 0,
        in_figsy:           inFigsy.count || 0,
        avg_score:          avgScore,
        pipeline_value_usd: pipelineValueUsd,
      },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch lead stats' }) }
})

// ── LIST ──────────────────────────────────────────────────────────────────────
leadRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, min_score, icp_id, apollo_consented, campaign_id, page = '1', limit = '50' } = req.query
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // campaign_id cross-link: a campaign's enrolled leads live in figsy_enrollments,
    // so resolve the enrolled lead IDs first, then constrain the leads query to them.
    let campaignLeadIds: string[] | null = null
    if (campaign_id) {
      const { data: enr } = await db.from('figsy_enrollments')
        .select('lead_id').eq('campaign_id', campaign_id as string)
      campaignLeadIds = (enr ?? []).map((e: { lead_id: string }) => e.lead_id).filter(Boolean)
      // No enrollments → guarantee an empty result rather than the full list.
      if (campaignLeadIds.length === 0) campaignLeadIds = ['00000000-0000-0000-0000-000000000000']
    }

    // Only show DELIVERED leads — undelivered leads are not yet paid for and
    // must not appear in the client's list/export (drip/run delivers + charges).
    let query = db.from('leads').select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .not('delivered_at', 'is', null)
      .order('score', { ascending: false, nullsFirst: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1)

    if (status) {
      const statusValues = (status as string).split(',')
      query = statusValues.length > 1
        ? query.in('status', statusValues)
        : query.eq('status', statusValues[0])
    }
    if (min_score)        query = query.gte('score', Number(min_score))
    if (icp_id)           query = query.eq('icp_id', icp_id as string)
    // Filters on the VERIFIED-EMAIL flag, not on consent (see @kind/shared `Lead`). A caller
    // reading this query name as "only consented leads" would be wrong.
    if (apollo_consented) query = query.eq('apollo_consented', apollo_consented === 'true')
    if (campaignLeadIds)  query = query.in('id', campaignLeadIds)

    const { data, count, error } = await query
    if (error) throw error

    // lead → its campaign back-link: attach the campaign each lead is enrolled in
    // (most-recent enrollment wins) so the list can link a lead back to its campaign.
    const rows = (data ?? []) as Array<Record<string, any>>
    const leadIds = rows.map(l => l.id).filter(Boolean)
    if (leadIds.length > 0) {
      const { data: enr } = await db.from('figsy_enrollments')
        .select('lead_id, enrolled_at, figsy_campaigns(id, name)')
        .in('lead_id', leadIds)
        .order('enrolled_at', { ascending: false })
      const byLead = new Map<string, { id: string; name: string }>()
      for (const e of (enr ?? []) as Array<Record<string, any>>) {
        const camp = Array.isArray(e.figsy_campaigns) ? e.figsy_campaigns[0] : e.figsy_campaigns
        if (camp?.id && !byLead.has(e.lead_id)) byLead.set(e.lead_id, { id: camp.id, name: camp.name })
      }
      for (const l of rows) l.campaign = byLead.get(l.id) ?? null
    }

    // Mask PII until revealed (#422): hide email + phone on any lead the client
    // hasn't spent $1 to reveal. `revealed` is the flag the portal reads to show
    // the value vs a "Reveal ($1)" button.
    for (const l of rows) {
      l.revealed = !!l.revealed_at
      if (!l.revealed) { l.email = null; l.phone = null }
    }

    res.json({ success: true, data: rows, total: count, page: Number(page), limit: Number(limit) })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch leads' }) }
})

// ── #488 MILLA LEAD DESK — masked leads awaiting the client's 👍 ────────────────
// The client-facing desk. Returns ONLY safe masked fields (role @ company, score, why-it-
// fits) — NEVER name/email/phone/linkedin — so masking is enforced SERVER-SIDE, not by the
// browser hiding columns. Scoped to the client's own delivered, not-yet-revealed, not-passed
// leads. After the client approves ($1), the full contact comes back through /leads/:id/reveal
// or the normal /leads list (revealed=true).
// #v2 — "here are the 50 they approved". A client working through a batch would otherwise
// fire one alert per lead, so this is throttled to one summary per client per 30 minutes
// (in-memory, per process — deliberately simple; the goal is a nudge, not an audit trail).
const lastApprovalAlert = new Map<string, number>()
const APPROVAL_ALERT_WINDOW_MS = 30 * 60 * 1000
function shouldAlertApprovals(clientId: string): boolean {
  const now = Date.now()
  const last = lastApprovalAlert.get(clientId)
  if (last && now - last < APPROVAL_ALERT_WINDOW_MS) return false
  lastApprovalAlert.set(clientId, now)
  if (lastApprovalAlert.size > 500) {
    const oldest = [...lastApprovalAlert.entries()].sort((a, b) => a[1] - b[1])[0]
    if (oldest) lastApprovalAlert.delete(oldest[0])
  }
  return true
}

leadRouter.get('/for-approval', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    // first/last name are fetched SERVER-SIDE ONLY (never returned) so we can scrub any
    // occurrence of them from score_reasoning before it becomes the masked "why_fits".
    const { data, error } = await db.from('leads')
      .select('id, first_name, last_name, job_title, company, industry, country, score, score_reasoning, created_at')
      .eq('client_id', clientId)
      .not('delivered_at', 'is', null)
      .not('surfaced_for_approval_at', 'is', null)      // #493 — only leads the operator has Sent to the client
      // NO TIME LIMIT ON PAID LEADS (founder-locked 25 Jul). The 72h TTL used to filter here,
      // but it never *expired* anything — a surfaced lead simply stopped appearing, with no
      // notice to anyone. Against a 100-lead pack that would have silently eaten most of what
      // the client had paid for. They keep every person we send until they pick or pass.
      .is('revealed_at', null)
      .neq('status', 'passed')
      .order('score', { ascending: false, nullsFirst: false })
      .limit(50)
    if (error) throw error
    // #492/F2 — the masked card must NEVER leak the name the client hasn't paid $1 for. The
    // scoring prompt is fed the lead's name, so score_reasoning often echoes it → scrub the
    // first name, last name and full name out of why_fits before it leaves the server. Map
    // to a fixed masked shape (name/email/phone are never in the output object).
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const scrub = (why: string | null, first: string | null, last: string | null): string | null => {
      if (!why) return null
      let out = why
      const toks = [first && last ? `${first} ${last}` : null, first, last].filter((t): t is string => !!t && t.trim().length > 1)
      for (const t of toks) out = out.replace(new RegExp(`\\b${esc(t.trim())}\\b`, 'gi'), 'this prospect')
      return out
    }
    const masked = (data ?? []).map((l: Record<string, any>) => ({
      id: l.id,
      role: l.job_title ?? 'Decision-maker',
      company: l.company ?? '—',
      industry: l.industry ?? null,
      country: l.country ?? null,
      score: l.score ?? null,
      why_fits: scrub(l.score_reasoning ?? null, l.first_name ?? null, l.last_name ?? null),
      created_at: l.created_at ?? null,
    }))
    // TOP 20 RECOMMENDED — derived from score at read time rather than stored, so it can
    // never go stale against a re-score and needs no column. The client sees which ones we'd
    // start with; they still choose. (flow v2: everyone we source goes over, ranked.)
    const recommendedIds = new Set(
      [...masked].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
        .slice(0, 20).map(l => l.id as string),
    )
    res.json({ success: true, data: masked.map(l => ({ ...l, recommended: recommendedIds.has(l.id as string) })) })
  } catch (err) { console.error('[leads/for-approval]', err); res.status(500).json({ success: false, error: 'Failed to load leads' }) }
})

// ── #488 CLIENT CREDIT LEDGER — balances + every charge/hold/capture/release ────
leadRouter.get('/ledger', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const [{ data: client }, { data: tx }] = await Promise.all([
      db.from('clients').select('wallet_balance_usd').eq('id', clientId).maybeSingle(),
      db.from('credit_transactions')
        .select('amount, type, note, created_at')
        .eq('client_id', clientId).order('created_at', { ascending: false }).limit(50),
    ])
    res.json({
      success: true,
      data: {
        wallet_balance_usd: Number((client as Record<string, number> | null)?.wallet_balance_usd ?? 0),
        entries: tx ?? [],
      },
    })
  } catch (err) { console.error('[leads/ledger]', err); res.status(500).json({ success: false, error: 'Failed to load ledger' }) }
})

// ── #503/#506/#510 MILLA DASHBOARD SUMMARY — the KPI cards, the real-data chat
// opener and the recent-replies rail, all from LIVE tables. No fabricated numbers:
// meetings_booked is confirmed calendar_bookings this month; active_campaign is the
// client's newest active campaign; recent_replies is the last handful of replies.
//
// ⚠️ #570③ — THIS COMMENT USED TO CLAIM "leads_awaiting mirrors /for-approval exactly", AND
// IT DOES NOT. The two queries share every FILTER (delivered · surfaced · unrevealed · not
// passed) but not their SIZE: `leads_awaiting` below is an uncapped `count`, while
// `/for-approval` returns `.limit(50)` rows. So a client with 200 undecided leads gets a KPI
// of 200 beside a panel of 50 — by design, but not "exactly".
//
// That false sentence is why the mismatch read as already-fixed for weeks: anyone checking
// found a comment asserting the thing they were there to verify. The lesson is the same one
// three tests hit this week — a claim in a comment is not evidence, and this file is where the
// claim lived.
//
// The DIFFERENCE IS DISCLOSED TO THE CLIENT rather than hidden: `deskCoverage()` in
// @kind/shared renders "Showing the top 50 of 200. Approve or pass some to see the rest."
// directly above the list (wired at milla/page.tsx:383, unit-tested in client-honesty.test.ts).
// The 50 is the top 50 BY SCORE, and working through them surfaces the next batch — which is
// the #567 model, not a truncation.
//
// STILL OPEN, and a founder call rather than a defect: whether 50 is the right window, or the
// panel should page. Raising the limit is explicitly NOT the answer (#571: "a bigger limit is
// the same bug with a later trigger").
leadRouter.get('/milla-summary', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    // Extracted 12 Aug to lib/milla-summary so Milla's CHAT speaks from the same numbers
    // this endpoint feeds the desk — one builder, every door, nothing to drift.
    const { buildMillaSummaryData } = await import('../lib/milla-summary')
    res.json({ success: true, data: await buildMillaSummaryData(clientId) })
  } catch (err) { console.error('[leads/milla-summary]', err); res.status(500).json({ success: false, error: 'Failed to load summary' }) }
})

// ── #511f NEXUS · the client's OWN brain, surfaced in Milla (the flywheel) ──────────────
// Client-facing + SAFE: returns only this client's own learned pattern (their best-converting
// persona, how many subjects are winning, reply/meeting rate, confidence) so they see Milla
// getting sharper on their behalf. getClientId fences it to the authed user's own client —
// no operator internals, no other client's data. Empty/thin → an honest "still learning".
leadRouter.get('/nexus-summary', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { getNexusProfile } = await import('../lib/nexus')
    const p = await getNexusProfile(clientId)
    const tp = p.top_persona ?? {}
    const persona = [tp.job_title, tp.seniority, tp.industry].filter(Boolean).join(' · ')
    res.json({
      success: true,
      data: {
        confidence: p.confidence,
        reply_rate: p.reply_rate,
        meeting_rate: p.meeting_rate,
        sample_worked: p.sample_worked,
        top_persona: persona || null,
        winning_subjects: (p.best_subjects ?? []).length,
        // A friendly one-liner for the card — honest about thin data.
        learned: p.sample_worked < 20
          ? 'Milla is still learning what works best for you.'
          : persona
            ? `Milla is learning your buyers book best when they're ${persona}.`
            : 'Milla is learning which messages land best for you.',
      },
    })
  } catch (err) { console.error('[leads/nexus-summary]', err); res.status(500).json({ success: false, error: 'Failed to load Nexus summary' }) }
})

// ── #507 MILLA MEETINGS — the client's confirmed bookings (their calendar), joined to the
// lead for a name. Real calendar_bookings rows only; the $3-captured note mirrors #492.
// ── M10 CLIENT PIPELINE — what happens AFTER the client's 👍 ──────────────────
// The client approves a lead and then loses sight of it: "My campaign" is campaign-level
// and Meetings only shows the finish line. This is the in-between — their approved leads
// moving Approved → Contacted → Replied → Booked. Read-only, their own data only.
leadRouter.get('/pipeline', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Approved = the client paid the $4 and we revealed it (revealed_at is the claim).
    const { data: approved } = await db.from('leads')
      .select('id, first_name, last_name, company, job_title, score, revealed_at')
      .eq('client_id', clientId).not('revealed_at', 'is', null)
      .order('revealed_at', { ascending: false }).limit(200)
    const approvedIds = (approved ?? []).map((l: { id: string }) => l.id)
    const safeIds = approvedIds.length ? approvedIds : ['00000000-0000-0000-0000-000000000000']

    const [enrolled, replies, bookings] = await Promise.all([
      // #638 — `emails_sent` IS NOT A COLUMN ON THIS TABLE. It lives on `figsy_campaigns`
      // (002_figsy.sql:30); a name carried in from the wrong table, exactly like `why_fits`
      // in #599. Postgres rejected the whole query and `.data ?? []` below turned that into
      // an empty map, so EVERY approved lead rendered as never-contacted — including ones
      // mid-sequence. `current_step` is the honest source and always was: its own schema
      // comment reads "0 = not started, 1 = step 1 sent, etc."
      db.from('figsy_enrollments').select('lead_id, current_step, status').in('lead_id', safeIds),
      db.from('figsy_replies').select('lead_id, classification, received_at, meeting_booked_at')
        .eq('client_id', clientId).in('lead_id', safeIds),
      db.from('calendar_bookings').select('lead_id, start_time, status')
        .eq('client_id', clientId).in('lead_id', safeIds),
    ])

    const contactedIds = new Set((enrolled.data ?? []).filter((e: { current_step?: number }) => (e.current_step ?? 0) > 0).map((e: { lead_id: string }) => e.lead_id))
    const repliedMap = new Map((replies.data ?? []).map((r: { lead_id: string }) => [r.lead_id, r]))
    const bookedMap = new Map((bookings.data ?? []).map((b: { lead_id: string }) => [b.lead_id, b]))

    const card = (l: Record<string, unknown>) => ({
      id: l.id, name: [l.first_name, l.last_name].filter(Boolean).join(' ').trim() || 'Lead',
      company: l.company ?? null, job_title: l.job_title ?? null, score: l.score ?? null,
    })
    const stages = { approved: [] as unknown[], contacted: [] as unknown[], replied: [] as unknown[], booked: [] as unknown[] }
    for (const l of (approved ?? []) as Record<string, unknown>[]) {
      const id = l.id as string
      const b = bookedMap.get(id)
      if (b) { stages.booked.push({ ...card(l), start_time: (b as { start_time?: string }).start_time ?? null }); continue }
      const r = repliedMap.get(id)
      if (r) { stages.replied.push({ ...card(l), classification: (r as { classification?: string }).classification ?? null }); continue }
      if (contactedIds.has(id)) { stages.contacted.push(card(l)); continue }
      stages.approved.push(card(l))
    }

    res.json({ success: true, data: {
      counts: { approved: stages.approved.length, contacted: stages.contacted.length, replied: stages.replied.length, booked: stages.booked.length },
      stages,
    } })
  } catch (err) { console.error('[leads/pipeline]', err); res.status(500).json({ success: false, error: 'Failed to load pipeline' }) }
})

// ── M9 COACHING — help the client WIN the meeting we booked ────────────────────
// We stop at "meeting booked" today. The client still has to run that call, and we hold
// the context they need (who the prospect is, why they fit, what they actually replied).
// This turns that into a prep brief. Value-add, no money event.
leadRouter.get('/coaching', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: bookings } = await db.from('calendar_bookings')
      .select('id, lead_id, start_time, status')
      .eq('client_id', clientId).gte('start_time', new Date(Date.now() - 864e5).toISOString())
      .order('start_time', { ascending: true }).limit(25)

    const leadIds = Array.from(new Set((bookings ?? []).map((b: { lead_id: string }) => b.lead_id).filter(Boolean)))
    const safe = leadIds.length ? leadIds : ['00000000-0000-0000-0000-000000000000']
    const [leads, replies] = await Promise.all([
      // `why_fits` is NOT a column and never has been — it is the name of a RESPONSE field,
      // built in /for-approval by scrubbing `score_reasoning` (#492/F2). Selecting it made
      // Postgres reject the whole query, and `.data ?? []` turned that into an empty map:
      // every booked meeting rendered as "Prospect" with no title, company, score or reason.
      db.from('leads').select('id, first_name, last_name, job_title, company, industry, score, score_reasoning').in('id', safe),
      db.from('figsy_replies').select('lead_id, body_text, body, classification').eq('client_id', clientId).in('lead_id', safe),
    ])
    const leadById = new Map((leads.data ?? []).map((l: Record<string, unknown>) => [l.id as string, l]))
    const replyById = new Map((replies.data ?? []).map((r: Record<string, unknown>) => [r.lead_id as string, r]))

    const meetings = (bookings ?? []).map((b: Record<string, unknown>) => {
      const l = leadById.get(b.lead_id as string) as Record<string, unknown> | undefined
      const r = replyById.get(b.lead_id as string) as Record<string, unknown> | undefined
      return {
        booking_id: b.id, lead_id: b.lead_id, start_time: b.start_time, status: b.status,
        name: l ? [l.first_name, l.last_name].filter(Boolean).join(' ').trim() || 'Prospect' : 'Prospect',
        job_title: l?.job_title ?? null, company: l?.company ?? null, industry: l?.industry ?? null,
        score: l?.score ?? null,
        // The RESPONSE keeps the key `why_fits` — that is the contract the portal reads.
        // Unscrubbed on purpose: this lead is past reveal (they booked a meeting), so the
        // client already has the name — the object above returns it two lines up.
        why_fits: (l?.score_reasoning ?? null) as string | null,
        their_words: ((r?.body_text ?? r?.body ?? null) as string | null)?.slice(0, 600) ?? null,
        signal: (r?.classification ?? null) as string | null,
      }
    })
    res.json({ success: true, data: { meetings } })
  } catch (err) { console.error('[leads/coaching]', err); res.status(500).json({ success: false, error: 'Failed to load coaching' }) }
})

// Generate the prep brief for ONE booked meeting (on demand — no cost unless asked).
leadRouter.post('/coaching/:leadId/brief', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    if (!process.env.ANTHROPIC_API_KEY) { res.status(503).json({ success: false, error: 'Coaching is not configured yet' }); return }

    const { data: lead } = await db.from('leads')
      // Same non-existent column as /coaching above, and WORSE here: `.maybeSingle()` turns
      // the rejected query into `lead = null`, so this endpoint answered 404 "Lead not found"
      // for every lead that exists. The prep brief has never once been generated.
      .select('id, first_name, last_name, job_title, company, industry, score_reasoning')
      .eq('id', req.params.leadId).eq('client_id', clientId).maybeSingle()
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const { data: reply } = await db.from('figsy_replies')
      .select('body_text, body, classification').eq('client_id', clientId).eq('lead_id', lead.id)
      .order('received_at', { ascending: false }).limit(1).maybeSingle()
    const { data: me } = await db.from('clients').select('company_name, industry').eq('id', clientId).maybeSingle()

    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 700,
      messages: [{ role: 'user', content:
        `Prepare ${me?.company_name ?? 'a seller'} for a first sales call.\n\n` +
        `THEM: ${[lead.first_name, lead.last_name].filter(Boolean).join(' ')} — ${lead.job_title ?? 'unknown role'} at ${lead.company ?? 'unknown company'}` +
        `${lead.industry ? ` (${lead.industry})` : ''}.\n` +
        `${lead.score_reasoning ? `WHY THEY FIT: ${lead.score_reasoning}\n` : ''}` +
        `${reply ? `THEIR OWN WORDS: "${(reply.body_text ?? reply.body ?? '').slice(0, 800)}"\n` : ''}\n` +
        `Give exactly four short sections with these headings and nothing else:\n` +
        `WHAT THEY LIKELY CARE ABOUT\nTHREE QUESTIONS TO ASK\nTHE OBJECTION TO EXPECT\nHOW TO CLOSE THE NEXT STEP\n` +
        `Be specific to this person. Plain text, no markdown, no preamble.` }],
    })
    const brief = msg.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('').trim()
    res.json({ success: true, data: { brief } })
  } catch (err) { console.error('[leads/coaching-brief]', err); res.status(500).json({ success: false, error: 'Failed to build the brief' }) }
})

leadRouter.get('/meetings', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: rows } = await db.from('calendar_bookings')
      .select('id, lead_id, meeting_title, start_time, status')
      .eq('client_id', clientId).in('status', ['confirmed', 'completed'])
      .order('start_time', { ascending: false }).limit(100)
    const leadIds = Array.from(new Set((rows ?? []).map((b: { lead_id: string }) => b.lead_id).filter(Boolean)))
    const { data: leadRows } = leadIds.length
      ? await db.from('leads').select('id, first_name, last_name, company, email').eq('client_id', clientId).in('id', leadIds)
      : { data: [] }
    const byId = new Map((leadRows ?? []).map((l: Record<string, unknown>) => [l.id as string, l]))
    const meetings = (rows ?? []).map((b: Record<string, unknown>) => {
      const l = byId.get(b.lead_id as string) as Record<string, unknown> | undefined
      return {
        id: b.id, title: b.meeting_title ?? 'Meeting', start_time: b.start_time, status: b.status,
        name: l ? [l.first_name, l.last_name].filter(Boolean).join(' ').trim() || (l.email as string) : 'Prospect',
        company: (l?.company as string | null) ?? null,
      }
    })
    res.json({ success: true, data: meetings })
  } catch (err) { console.error('[leads/meetings]', err); res.status(500).json({ success: false, error: 'Failed to load meetings' }) }
})

// ── CREATE ────────────────────────────────────────────────────────────────────
leadRouter.post('/', rateLimit({ limit: 60, windowMs: 60_000, key: 'leads-create', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      icp_id:                    z.string().uuid().optional(),
      first_name:                z.string().min(1),
      last_name:                 z.string().default(''),
      email:                     z.string().email().optional(),
      phone:                     z.string().optional(),
      job_title:                 z.string().optional(),
      company:                   z.string().optional(),
      linkedin_url:              z.string().url().optional(),
      country:                   z.string().optional(),
      company_size:              z.string().optional(),
      industry:                  z.string().optional(),
      seniority:                 z.string().optional(),
      tech_stack:                z.array(z.string()).optional(),
      apollo_id:                 z.string().optional(),
      // NOT consent — a provider-VERIFIED email flag. See @kind/shared `Lead`.
      apollo_consented:          z.boolean().default(false),
      score:                     z.number().min(0).max(100).optional(),
      score_reasoning:           z.string().optional(),
      estimated_deal_value_usd:  z.number().optional(),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Blocklist check
    if (body.email) {
      // HC-1 — probe with the NORMALISED address.
      const { data: blocked } = await db.from('opt_out_blocklist')
        .select('id').eq('email', normalizeRevealEmail(body.email)).is('opted_back_in_at', null).maybeSingle()
      if (blocked) {
        res.status(409).json({ success: false, error: 'Lead is on the opt-out blocklist', code: 'BLOCKLISTED' })
        return
      }
    }

    const { data, error } = await db.from('leads').insert({ ...body, client_id: clientId }).select().single()
    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to create lead' })
  }
})

// ── BULK STATUS UPDATE ────────────────────────────────────────────────────────
leadRouter.post('/bulk-status', async (req: AuthRequest, res) => {
  try {
    const { leadIds, status } = z.object({
      leadIds: z.array(z.string().uuid()).min(1).max(100),
      status:  z.enum(['pending', 'scored', 'consent_sent', 'consent_given', 'exported', 'rejected', 'opted_out']),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: updated, error } = await db.from('leads')
      .update({ status })
      .in('id', leadIds)
      .eq('client_id', clientId)
      .select('id')

    if (error) throw error
    res.json({ success: true, updated: updated?.length ?? 0 })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update lead statuses' })
  }
})

// ── BULK DELETE ───────────────────────────────────────────────────────────────
// Permanently removes leads (and their dependent rows). Scoped to the caller's
// client: only leads they own are touched, even if foreign ids are passed.
leadRouter.post('/bulk-delete', async (req: AuthRequest, res) => {
  try {
    const { leadIds } = z.object({
      leadIds: z.array(z.string().uuid()).min(1).max(1000),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Verify ownership first — only delete leads that belong to this client.
    const { data: owned } = await db.from('leads')
      .select('id').in('id', leadIds).eq('client_id', clientId)
    const ids = (owned ?? []).map((l: { id: string }) => l.id)
    if (ids.length === 0) { res.json({ success: true, deleted: 0 }); return }

    // Clear dependent rows first (FK), fail-soft if a table/column isn't present.
    for (const t of ['figsy_replies', 'figsy_sent_emails', 'figsy_enrollments', 'figsy_calls']) {
      await db.from(t).delete().in('lead_id', ids).then(() => {}, () => {})
    }

    const { data: deleted, error } = await db.from('leads')
      .delete().in('id', ids).select('id')
    if (error) throw error
    res.json({ success: true, deleted: deleted?.length ?? 0 })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to delete leads' })
  }
})

// ── UPDATE STATUS ─────────────────────────────────────────────────────────────
leadRouter.patch('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { status } = z.object({
      status: z.enum(['pending', 'scored', 'consent_sent', 'consent_given', 'exported', 'rejected', 'opted_out']),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const now = new Date().toISOString()
    const extra: Record<string, unknown> = {}
    if (status === 'consent_sent')  extra.consent_sent_at = now
    if (status === 'consent_given') extra.consent_given_at = now
    if (status === 'exported')      extra.exported_at = now
    if (status === 'opted_out')     extra.opted_out_at = now

    const { data, error } = await db.from('leads')
      .update({ status, ...extra }).eq('id', req.params.id).eq('client_id', clientId).select().single()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    // Auto-push to CRM when consent given
    if (status === 'consent_given') {
      const { data: client } = await db.from('clients')
        .select('crm_type, crm_api_key, crm_sync_enabled').eq('id', clientId).single()
      if (client?.crm_sync_enabled && client.crm_type && client.crm_api_key && client.crm_type !== 'none') {
        pushToCrm(client.crm_type, client.crm_api_key, data).then(result => {
          if (result.contact_id) {
            db.from('leads').update({ crm_contact_id: result.contact_id, crm_synced: true }).eq('id', data.id)
          }
        }).catch(console.error)
      }
    }

    res.json({ success: true, data })

    // ── P0-11: Auto-fire consent email when lead status → approved/scored ────────
    // When a lead is approved (status = scored with score >= threshold), auto-send consent
    // if RESEND_API_KEY is set and consent has not yet been sent.
    if (status === 'scored' && data.email && !data.consent_sent_at) {
      ;(async () => {
        try {
          if (!process.env.RESEND_API_KEY) return
          const { data: clientForConsent } = await db.from('clients')
            .select('company_name').eq('id', clientId).maybeSingle()
          const { data: freshLead } = await db.from('leads')
            .select('id, email, first_name, consent_sent_at, consent_token, status')
            .eq('id', data.id).maybeSingle()
          if (!freshLead || freshLead.consent_sent_at || freshLead.status === 'opted_out') return
          // A status change must never cold-email a stranger while sending is off.
          if (!coldMailAllowed()) { console.warn(`[consent] status-change auto-consent SKIPPED for lead ${data.id} — outreach is off.`); return }
          const token = await getOrCreateConsentToken(freshLead)
          const consentUrl = buildConsentUrl(freshLead.id, token)
          const verdict = await sendConsentEmail(freshLead.email!, freshLead.first_name, clientForConsent?.company_name ?? '', consentUrl, clientId)
          // ⚠️ NOT-POSSIBLE: THE RESPONSE CANNOT CARRY THE REASON ON THIS DOOR, and that is a
          // property of where it sits, not an omission. This is a fire-and-forget IIFE — the
          // client's HTTP response was already sent at the top of this handler, before the
          // consent email was even attempted. There is nothing left to write a reason into.
          //
          // So the refusal is LOGGED, in the same shape as the kill-switch line three lines
          // above it. What matters most is the half that IS possible: the status write is
          // skipped, so a refused person is never recorded as having been asked.
          if (!verdict.sent) {
            console.warn(`[consent] status-change auto-consent NOT sent for lead ${data.id} — ${verdict.reason}: ${verdict.detail}`)
            return
          }
          await db.from('leads').update({
            status: 'consent_sent',
            consent_sent_at: new Date().toISOString(),
            consent_auto_fired: true,
          }).eq('id', data.id)
        } catch (autoConsentErr) {
          console.error('[leads/auto-consent]', autoConsentErr)
        }
      })()
    }
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update lead status' })
  }
})

// ── OPT-OUT (permanent, cross-client) ─────────────────────────────────────────
leadRouter.post('/:id/optout', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const { reason } = z.object({ reason: z.string().default('manual_block') }).parse(req.body)

    // Add to blocklist
    if (lead.email) {
      // HC-1 — NORMALISE BEFORE WRITING. Manual block: a human pressed the button meaning
      // "never contact this person". Storing the raw mixed-case address made that intent
      // unmatchable by every send-path probe.
      await db.from('opt_out_blocklist').upsert({
        email:                 normalizeRevealEmail(lead.email),
        linkedin_url:          lead.linkedin_url,
        full_name:             `${lead.first_name} ${lead.last_name}`.trim(),
        reason,
        blocked_by_client_id:  clientId,
      }, { onConflict: 'email', ignoreDuplicates: false })
    }

    // Mark lead as opted out across ALL clients who have this email
    if (lead.email) {
      await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
        .eq('email', lead.email)
    } else {
      await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
        .eq('id', req.params.id)
    }

    res.json({ success: true, message: 'Lead permanently blocked' })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to block lead' }) }
})

// ── REVEAL a lead — spend $1 to unmask the email (#420/#421/#422) ──────────────
// The per-qualified-lead model: leads arrive MASKED (email hidden). The client
// browses free, dedups against their own CRM, and spends $1 only to reveal the
// net-new ones they choose. Money-safe by design:
//   • Atomic CLAIM on revealed_at (…WHERE revealed_at IS NULL) → concurrent reveals
//     can't both charge. Loser is idempotent (returns the email, no charge).
//   • crm_existing → the client already owns it → NO charge.
//   • Charge is the gate: try_charge_reveal_credit. No credit → 402, un-claim.
//   • No email found → REFUND the $1 (fail-closed) + un-claim → 422.
//   • On success: unique credit_transactions.reference='reveal:'+id backstops
//     charge-once-per-lead (#424).
leadRouter.post('/:id/reveal', rateLimit({ limit: 60, windowMs: 60_000, key: 'lead-reveal', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    // The minimum-20 gate applies to every door into the money path, or it isn't a gate.
    const revealGate = await batchGate(clientId, [req.params.id])
    if ('refusal' in revealGate) { res.status(409).json({ success: false, error: 'batch_minimum', required: revealGate.refusal.required, message: revealGate.refusal.reason }); return }
    // ONE WALLET — reveal and approve are the SAME money event now: a single flat $4
    // charged once per lead. Delegate to approveLead so there is exactly one money path.
    const { approveLead } = await import('../lib/approve-lead')
    const outcome = await approveLead(req.params.id, clientId)
    if (outcome.status === 'not_found') { res.status(404).json({ success: false, error: 'Lead not found' }); return }
    if (outcome.status === 'insufficient_funds') { res.status(402).json({ success: false, error: 'insufficient_funds', message: 'You need $4 in your wallet to approve. Top up to continue.' }); return }
    if (outcome.status === 'no_email') { res.status(422).json({ success: false, error: 'no_email_found', message: 'We could not find a verified email for this lead — you were not charged.' }); return }
    if (outcome.status === 'already_in_crm') { res.status(409).json({ success: false, error: 'already_in_crm', message: 'This contact is already in your CRM — no charge.' }); return }
    if (outcome.status === 'no_campaign') { res.status(409).json({ success: false, error: 'no_campaign', message: "Your campaign isn't live yet, so we can't start outreach — you were not charged. We've been alerted and will switch it on." }); return }
    if (outcome.status === 'launch_hold') { res.status(409).json({ success: false, error: 'launch_hold', country: outcome.country, message: launchHoldMessage(outcome.country) }); return }
    // "Here are the N they approved" — throttled to one summary per client per 30 min, so a
    // client working through a batch is one nudge rather than fifty.
    if (shouldAlertApprovals(clientId)) {
      void (async () => {
        const [{ count: approvedEver }, { data: c }] = await Promise.all([
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('revealed_at', 'is', null),
          db.from('clients').select('company_name').eq('id', clientId).maybeSingle(),
        ])
        const { packState } = await import('../lib/onboarding-pack')
        const pack = packState(true, approvedEver ?? 0)
        void sendFounderAlert('new_signup', `${c?.company_name ?? 'A client'} is approving leads`, [
          `${approvedEver ?? 0} approved in total.`,
          pack.left > 0 ? `${pack.left} of their included ${pack.included} left.` : `Pack used — they're on $4 a lead now.`,
          'Next: their sequence needs approving before anything goes out.',
        ]).catch(() => {})
      })().catch(() => {})
    }
    res.json({ success: true, revealed: true, email: outcome.email, charged: outcome.charged })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to reveal lead' }) }
})

// ── #487 APPROVE-GATED REVEAL — the $4 trigger (CLIENT side, for Milla) ────────
// The client taps 👍 approve on a masked lead in their portal: this reveals the contact
// ($1) AND sets our team to work it ($3) in ONE action — the ONLY place both fire. The
// heavy lifting lives in approveLead() (shared with the operator-on-behalf path in Vida)
// so the money sequence is identical everywhere. Scoped to the client's own lead by
// getClientId → the lead's client_id (enforced inside approveLead's queries).
// ── THE KILL-SWITCH APPLIES TO CONSENT MAIL TOO ────────────────────────────────
// A consent request is an unsolicited email to a stranger. `icps.ts` already carries the
// scar: *"consent sends must obey the same kill-switch as outreach — previously they sent
// unconditionally, so a 'safe test' ICP run still cold-emailed real execs a consent
// request."* That fix was applied to the sourcing path and to none of the five consent
// doors in this file.
//
// The dangerous one is PATCH /:id/status — a status change silently triggered a cold email,
// a side effect on an endpoint that looks like bookkeeping. With AUTO_OUTREACH_ENABLED off
// you believe nothing reaches a prospect; these five made that untrue.
function coldMailAllowed(): boolean {
  return process.env.AUTO_OUTREACH_ENABLED === 'true'
}
const COLD_MAIL_OFF = {
  success: false, error: 'outreach_paused',
  message: 'Sending to prospects is switched off right now, so no consent email went out. Nothing else changed.',
}

// ── THE MINIMUM-20 GATE (founder-locked 25 Jul) ────────────────────────────────
// A client's inbox costs us ~$40/month from the day they sign, so a client who approves
// five people is a client we run a free mail service for. When we send someone their
// people they choose at least 20 — and the founder asked for a HARD gate, so it lives
// HERE, on the server, not on a disabled button anyone can step around with a fetch.
//
// ⚠️ IT COUNTS THE LEADS, NOT THE REQUEST. The first version took `selecting: number`
// straight from `ids.length`, which made the gate trivially bypassable: send twenty ids
// where nineteen are already-approved (or simply invented), the gate sees "20", and the
// client approves ONE. Eighteen unit tests passed on that, because they tested the pure
// decision function while the hole was in what the route fed it.
//
// So the ids are RESOLVED against the database first: only rows that are this client's,
// surfaced, undecided and not passed count toward the minimum. Returns the resolved ids
// on success so the caller works on exactly what was validated, never on raw input.
async function batchGate(
  clientId: string,
  requestedIds: string[],
): Promise<{ refusal: BatchCheck } | { valid: string[] }> {
  const { checkBatch } = await import('../lib/approval-batch')

  // Which of the submitted ids are genuinely approvable RIGHT NOW, for THIS client.
  const { data: rows } = requestedIds.length > 0
    ? await db.from('leads').select('id')
        .eq('client_id', clientId).in('id', requestedIds)
        .not('surfaced_for_approval_at', 'is', null)
        .is('revealed_at', null).neq('status', 'passed')
    : { data: [] as { id: string }[] }
  const valid = (rows ?? []).map((r: { id: string }) => r.id)

  const [{ count: available }, { count: approvedEver }] = await Promise.all([
    // Everything in front of them, so the requirement can never exceed what they have.
    db.from('leads').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).not('surfaced_for_approval_at', 'is', null)
      .is('revealed_at', null).neq('status', 'passed'),
    db.from('leads').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).not('revealed_at', 'is', null),
  ])

  const check = checkBatch(valid.length, available ?? 0, approvedEver ?? 0)
  return check.allowed ? { valid } : { refusal: check }
}

leadRouter.post('/:id/approve', rateLimit({ limit: 60, windowMs: 60_000, key: 'lead-approve', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const gate = await batchGate(clientId, [req.params.id])
    if ('refusal' in gate) { res.status(409).json({ success: false, error: 'batch_minimum', required: gate.refusal.required, message: gate.refusal.reason }); return }
    const { approveLead } = await import('../lib/approve-lead')
    const outcome = await approveLead(req.params.id, clientId)
    if (outcome.status === 'not_found') { res.status(404).json({ success: false, error: 'Lead not found' }); return }
    if (outcome.status === 'insufficient_funds') {
      // ONE WALLET — the flat $4 couldn't be charged, so NOTHING moved.
      res.status(402).json({ success: false, error: 'insufficient_funds', message: 'You need $4 in your wallet to approve. Top up to continue.' }); return
    }
    if (outcome.status === 'no_email') {
      res.status(422).json({ success: false, error: 'no_email_found', message: 'We could not verify an email for this lead — you were not charged.' }); return
    }
    if (outcome.status === 'already_in_crm') {
      res.status(409).json({ success: false, error: 'already_in_crm', message: 'This contact is already in your CRM — no charge.' }); return
    }
    if (outcome.status === 'no_campaign') {
      // We charge for WORK. With no active campaign there is nothing to enrol into, so
      // the wallet was deliberately left untouched (see approve-lead.ts step 3c).
      res.status(409).json({ success: false, error: 'no_campaign', message: "Your campaign isn't live yet, so we can't start outreach — you were not charged. We've been alerted and will switch it on." }); return
    }
    if (outcome.status === 'launch_hold') {
      // Not an error the client did anything to cause, and not a dead end for the lead — it
      // goes back on the queue untouched. Said in those words rather than as a failure.
      res.status(409).json({ success: false, error: 'launch_hold', country: outcome.country, message: launchHoldMessage(outcome.country) }); return
    }
    res.json({ success: true, ...outcome })
  } catch (err) { console.error('[approve]', err); res.status(500).json({ success: false, error: 'Failed to approve lead' }) }
})

// ── APPROVE A BATCH — the door the minimum-20 gate sends people through ────────
// One request, N leads. Each still goes through approveLead(), so the money path is
// byte-identical to a single approve — the pack quota, the $4 charge, the dead-email
// refund, the no-campaign refusal. Nothing is charged until the gate passes.
//
// Partial failures are reported per lead rather than rolled back: a dud email in a batch
// of 30 must not un-approve the other 29, and approveLead already refuses to charge for
// the ones it can't complete.
leadRouter.post('/approve-batch', rateLimit({ limit: 12, windowMs: 60_000, key: 'lead-approve-batch', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const ids = Array.isArray(req.body?.lead_ids) ? [...new Set(req.body.lead_ids.filter((v: unknown) => typeof v === 'string'))] as string[] : []
    if (ids.length === 0) { res.status(400).json({ success: false, error: 'lead_ids required' }); return }
    // A bounded batch: 200 is the whole desk, and an unbounded loop here would hold the
    // request open long enough to time out mid-charge.
    if (ids.length > 200) { res.status(400).json({ success: false, error: 'Too many at once — 200 max.' }); return }

    const gate = await batchGate(clientId, ids)
    if ('refusal' in gate) { res.status(409).json({ success: false, error: 'batch_minimum', required: gate.refusal.required, message: gate.refusal.reason }); return }
    // Work on what the gate VALIDATED, not on what was posted. Anything the client sent
    // that wasn't theirs, wasn't surfaced or was already decided is simply not here.
    const approvable = gate.valid

    const { approveLead } = await import('../lib/approve-lead')
    const results: Array<{ id: string; status: string; email?: string | null; charged?: boolean }> = []
    // SEQUENTIAL on purpose: try_charge_wallet is the atomic gate, and firing 30 charges
    // concurrently against one wallet is how a client gets charged past their balance.
    for (const id of approvable) {
      const out = await approveLead(id, clientId).catch(() => ({ status: 'error' as const }))
      results.push({ id, status: out.status, email: 'email' in out ? out.email : null, charged: 'charged' in out ? out.charged : undefined })
      // Stop the moment the money runs out — every further attempt would fail the same way.
      if (out.status === 'insufficient_funds') break
    }

    const approved = results.filter(r => r.status === 'approved')
    res.json({
      success: true, approved: approved.length, attempted: approvable.length, results,
      message: approved.length === approvable.length
        ? `${approved.length} approved — we're on it.`
        : `${approved.length} of ${approvable.length} approved. The rest are listed below with why.`,
    })
  } catch (err) { console.error('[approve-batch]', err); res.status(500).json({ success: false, error: 'Failed to approve' }) }
})

// ✕ pass — client says "not a fit". No charge, no reveal; the lead leaves the queue.
leadRouter.post('/:id/pass', rateLimit({ limit: 120, windowMs: 60_000, key: 'lead-pass', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { passLead } = await import('../lib/approve-lead')
    const outcome = await passLead(req.params.id, clientId)
    if (outcome.status === 'not_found') { res.status(404).json({ success: false, error: 'Lead not found or already actioned' }); return }
    res.json({ success: true, passed: true })
  } catch (err) { console.error('[pass]', err); res.status(500).json({ success: false, error: 'Failed to pass lead' }) }
})

// ── SEND POPIA CONSENT EMAIL ──────────────────────────────────────────────────
leadRouter.post('/:id/consent', async (req: AuthRequest, res) => {
  try {
    // Cold mail is cold mail, even when a human pressed the button.
    if (!coldMailAllowed()) { res.status(409).json(COLD_MAIL_OFF); return }
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    if (!lead.email) { res.status(422).json({ success: false, error: 'Lead has no email address' }); return }

    // DO-NOT-CONTACT: never email anyone connected to the founder's employer.
    if (isSuppressed({ email: lead.email, company: lead.company, linkedin: lead.linkedin_url })) {
      res.status(403).json({ success: false, error: 'This lead is on the do-not-contact list and cannot be contacted.' }); return
    }

    if (lead.status === 'consent_given' || lead.status === 'opted_out') {
      res.status(409).json({ success: false, error: `Lead has already ${lead.status === 'consent_given' ? 'consented' : 'opted out'}` })
      return
    }

    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).single()

    const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
    const verdict = await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl, clientId)
    // HC-4 gave sendConsentEmail a verdict and only ONE of its six callers read it. Writing
    // `consent_sent` for a person the function refused records them as having been ASKED for
    // consent they were never asked for — a false entry in the one row that proves we asked.
    if (!verdict.sent) { res.status(409).json({ success: false, error: verdict.reason, message: verdict.detail }); return }

    await db.from('leads')
      .update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() })
      .eq('id', req.params.id)

    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to send consent email' }) }
})

// ── RESEND CONSENT EMAIL (for already-sent leads that haven't responded) ─────
leadRouter.post('/:id/resend-consent', async (req: AuthRequest, res) => {
  try {
    // Cold mail is cold mail, even when a human pressed the button.
    if (!coldMailAllowed()) { res.status(409).json(COLD_MAIL_OFF); return }
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: lead } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }
    if (!lead.email) { res.status(422).json({ success: false, error: 'Lead has no email' }); return }
    if (lead.status === 'consent_given') { res.status(409).json({ success: false, error: 'Already consented' }); return }
    if (lead.status === 'opted_out') { res.status(409).json({ success: false, error: 'Lead has opted out' }); return }
    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).maybeSingle()
    const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
    const verdict = await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl, clientId)
    // Same refusal shape as POST /:id/consent — one wording, both doors (see there for why).
    if (!verdict.sent) { res.status(409).json({ success: false, error: verdict.reason, message: verdict.detail }); return }
    await db.from('leads').update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() }).eq('id', req.params.id)
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to resend consent email' }) }
})

// ── BULK CONSENT SEND (/leads/consent/bulk) ───────────────────────────────────
leadRouter.post('/consent/bulk', async (req: AuthRequest, res) => {
  try {
    // Cold mail is cold mail, even when a human pressed the button.
    if (!coldMailAllowed()) { res.status(409).json(COLD_MAIL_OFF); return }
    const { leadIds } = z.object({
      leadIds: z.array(z.string().uuid()).min(1).max(50),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: leads } = await db.from('leads')
      .select('id, email, first_name, last_name, apollo_consented, consent_sent_at, status, consent_token')
      .in('id', leadIds)
      .eq('client_id', clientId)

    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).single()

    let sent = 0
    let alreadySent = 0
    // ⛓️ RENAMED FROM `alreadyConsented` ON 20 Aug (#675). It counts leads skipped because
    // `apollo_consented` is true — a provider-VERIFIED email, NOT a consent record — so the old
    // key reported "already consented" about people who had clicked nothing. Nothing unsafe
    // happened; the operator was simply told something untrue. `alreadyContactable` is what the
    // condition actually means: we already hold a verified address for them, so they are
    // reachable under legitimate interest and a consent request adds nothing.
    let alreadyContactable = 0
    let optedOut = 0
    // ⚠️ A COUNTED MAP, NOT A SENTENCE. The single-lead doors put the mailer's refusal in
    // `res.detail`; a loop over 50 leads has no single detail to carry. So the refusals join
    // the reasons this route ALREADY counts, keyed by `verdict.reason` — one wording, reused,
    // and a caller reading `skippedReasons` learns why without a per-lead trawl of the logs.
    const refused: Record<string, number> = {}

    for (const lead of leads ?? []) {
      // ⛓️ FIXED 20 Aug (#675) — this line was flagged the same day and parked for one PR.
      // `apollo_consented` is a provider-VERIFIED email, NOT a consent record, so the counter
      // this feeds was called `alreadyConsented` and told the operator "30 already consented"
      // about 30 people who had clicked nothing. Nothing unsafe ever happened — no message went
      // to anyone who should not have had one — the defect was the sentence afterwards.
      // The counter is now `alreadyContactable`; see its declaration above.
      if (lead.apollo_consented)              { alreadyContactable++; continue }
      if (lead.status === 'opted_out')        { optedOut++;         continue }
      if (lead.consent_sent_at)              { alreadySent++;      continue }
      if (!lead.email)                        { alreadySent++;      continue }

      try {
        const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
        const verdict = await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl, clientId)
        // The write is what made this a lie: `status: 'consent_sent'` on a lead the mailer
        // refused. The row then reads as contacted, the resend door's `consent_given` /
        // `opted_out` checks never look at it again, and the blocklist entry that stopped the
        // send leaves no trace on the lead at all.
        if (!verdict.sent) {
          refused[verdict.reason] = (refused[verdict.reason] ?? 0) + 1
          console.warn(`[leads/consent/bulk] lead ${lead.id} NOT sent — ${verdict.reason}: ${verdict.detail}`)
          continue
        }
        await db.from('leads')
          .update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() })
          .eq('id', lead.id)
        sent++
      } catch (err) {
        console.error('[leads/consent/bulk] lead', lead.id, err)
      }
    }

    const refusedTotal = Object.values(refused).reduce((a, b) => a + b, 0)
    const skipped = alreadySent + alreadyContactable + optedOut + refusedTotal
    res.json({
      success: true,
      sent,
      skipped,
      skippedReasons: { alreadySent, alreadyContactable, optedOut, ...refused },
    })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[leads/consent/bulk]', err)
    res.status(500).json({ success: false, error: 'Failed to send bulk consent' })
  }
})

// ── OPT-OUT BLOCKLIST LIST ─────────────────────────────────────────────────────
leadRouter.get('/blocklist', async (req: AuthRequest, res) => {
  try {
    // #260: scope the LIST to the caller's own client. Suppression-at-send stays
    // global (a lead opted out anywhere is never mailed), but the list endpoint
    // must not expose other clients' opted-out emails/names.
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('opt_out_blocklist')
      .select('*').eq('blocked_by_client_id', clientId).is('opted_back_in_at', null).order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch blocklist' }) }
})

// ── AI ENRICHMENT ─────────────────────────────────────────────────────────────
leadRouter.post('/:id/enrich', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    // Check for cached enrichment less than 7 days old
    try {
      const { data: existing } = await db.from('lead_enrichment')
        .select('*').eq('lead_id', req.params.id).maybeSingle()

      if (existing?.enriched_at) {
        const enrichedAt = new Date(existing.enriched_at)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        if (enrichedAt > sevenDaysAgo) {
          res.json({ success: true, data: existing, cached: true }); return
        }
      }
    } catch (cacheErr: any) {
      // Table doesn't exist yet — fall through to Claude call
      if (!String(cacheErr?.message ?? '').includes('does not exist')) {
        console.error('[leads/enrich] cache check error', cacheErr)
      }
    }

    const prompt = `You are a B2B sales researcher. Given the following lead profile, generate research that will help a sales rep reach out at exactly the right moment.

Lead profile:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'unknown'}
- Company: ${lead.company || 'unknown'}
- LinkedIn: ${lead.linkedin_url || 'not available'}
- Industry: ${lead.industry || 'unknown'}
- Country: ${lead.country || 'unknown'}
- Seniority: ${lead.seniority || 'unknown'}

Generate a JSON object with EXACTLY these fields (no extra text, no markdown, just valid JSON):
{
  "recent_signal": "One sentence about a timely reason to reach out now — e.g. funding round, product launch, leadership change, hiring surge, or industry trend affecting them",
  "company_context": "One sentence summarising what the company does and their current growth/market position",
  "opening_line": "A personalised first line for a cold email, max 20 words, referencing something specific about them or their company. Do NOT start with I or We.",
  "enrichment_score": <integer 1-10 rating how strong the outreach signal is, where 10 = perfect timing>
}

Output ONLY the JSON object, nothing else.`

    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    })

    const rawText = (message.content[0] as { type: string; text: string }).text.trim()
    let enrichment: { recent_signal: string; company_context: string; opening_line: string; enrichment_score: number }
    try {
      enrichment = JSON.parse(rawText)
    } catch {
      // Try to extract JSON from the response if wrapped in markdown
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Claude returned invalid JSON')
      enrichment = JSON.parse(jsonMatch[0])
    }

    // Validate enrichment_score
    enrichment.enrichment_score = Math.max(1, Math.min(10, Math.round(Number(enrichment.enrichment_score) || 5)))

    const row = {
      lead_id:          req.params.id,
      recent_signal:    enrichment.recent_signal,
      company_context:  enrichment.company_context,
      opening_line:     enrichment.opening_line,
      enrichment_score: enrichment.enrichment_score,
      enriched_at:      new Date().toISOString(),
    }

    try {
      const { error: upsertErr } = await db.from('lead_enrichment')
        .upsert(row, { onConflict: 'lead_id' })
      if (upsertErr) throw upsertErr
    } catch (dbErr: any) {
      const msg = String(dbErr?.message ?? '')
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42P01')) {
        res.status(503).json({ success: false, error: 'Run migrations first' }); return
      }
      throw dbErr
    }

    res.json({ success: true, data: row, cached: false })
  } catch (err) { console.error('[leads/enrich]', err); res.status(500).json({ success: false, error: 'Failed to enrich lead' }) }
})

// P2-5: Waterfall enrichment — Apollo → PDL → Hunter → Clearbit
leadRouter.post('/:id/waterfall-enrich', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('id, first_name, last_name, email, phone, company, linkedin_url, company_size, industry, tech_stack, revealed_at')
      .eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    // #422 — enrichment must not become a free unmask: waterfall-enrich finds and
    // writes the EMAIL, so it requires the $1 reveal first. POST /leads/:id/reveal
    // already runs the waterfall as part of the paid reveal.
    if (!(lead as { revealed_at?: string | null }).revealed_at) {
      res.status(402).json({ success: false, error: 'reveal_required', message: 'Reveal this lead first ($1) — the reveal includes email enrichment.' })
      return
    }

    const result = await waterfallEnrich({
      first_name:   lead.first_name,
      last_name:    lead.last_name,
      company:      lead.company,
      email:        lead.email,
      linkedin_url: lead.linkedin_url,
    })

    if (result.source === 'none') {
      res.json({ success: true, data: { filled: 0, source: 'none' }, message: 'No enrichment providers available — add PDL_API_KEY, HUNTER_API_KEY, or CLEARBIT_API_KEY to Railway env' }); return
    }

    // Only update fields that are currently missing on the lead
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (!lead.email        && result.email)        updates.email        = result.email
    if (!lead.phone        && result.phone)         updates.phone        = result.phone
    if (!lead.company_size && result.company_size)  updates.company_size = result.company_size
    if (!lead.industry     && result.industry)      updates.industry     = result.industry
    if (!lead.linkedin_url && result.linkedin_url)  updates.linkedin_url = result.linkedin_url
    if (!lead.tech_stack?.length && result.tech_stack?.length) updates.tech_stack = result.tech_stack

    const filled = Object.keys(updates).length - 1 // exclude updated_at
    if (filled > 0) {
      await db.from('leads').update(updates).eq('id', req.params.id)
    }

    res.json({ success: true, data: { filled, source: result.source, updates } })
  } catch (err) { console.error('[leads/waterfall-enrich]', err); res.status(500).json({ success: false, error: 'Enrichment failed' }) }
})

// ── AI EMAIL DRAFT ─────────────────────────────────────────────────────────────
leadRouter.post('/:id/draft-email', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const { data: client } = await db.from('clients').select('company_name, industry').eq('id', clientId).single()

    const prompt = `You are writing a cold outreach email on behalf of ${client?.company_name || 'our company'}.

Lead profile:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'unknown'}
- Company: ${lead.company || 'unknown'}
- Industry: ${lead.industry || 'unknown'}
- Country: ${lead.country || 'unknown'}
- Seniority: ${lead.seniority || 'unknown'}
${lead.tech_stack?.length ? `- Tech stack: ${lead.tech_stack.join(', ')}` : ''}

Write a short, personalised cold email (150 words max). It must:
1. Open with something specific to their role or company (not generic)
2. Mention one clear business outcome we can help with
3. End with a single, low-friction CTA (e.g. "Worth a 15-min call?")
4. Sound human — no corporate speak, no buzzwords
5. NOT include a subject line — just the email body

Output only the email body, nothing else.`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    })

    const draft = (message.content[0] as { type: string; text: string }).text

    await db.from('leads').update({ ai_email_draft: draft }).eq('id', req.params.id)

    res.json({ success: true, data: { draft } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to generate email draft' }) }
})

// ── BULK CONSENT SEND ─────────────────────────────────────────────────────────
// POST /leads/bulk-consent
leadRouter.post('/bulk-consent', async (req: AuthRequest, res) => {
  try {
    // Cold mail is cold mail, even when a human pressed the button.
    if (!coldMailAllowed()) { res.status(409).json(COLD_MAIL_OFF); return }
    const { lead_ids } = z.object({
      lead_ids: z.array(z.string().uuid()).min(1).max(100),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: leads } = await db.from('leads')
      .select('id, email, first_name, last_name, status, consent_token')
      .in('id', lead_ids)
      .eq('client_id', clientId)

    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).single()

    let sent = 0, skipped = 0
    // Same counted map as `/consent/bulk` — one shape, both loops. This route had no reason
    // breakdown at all, so a refusal here was indistinguishable from an ineligible lead.
    const refused: Record<string, number> = {}
    for (const lead of leads ?? []) {
      if (!lead.email || lead.status === 'opted_out' || lead.status === 'consent_given' || lead.status === 'consent_sent') {
        skipped++; continue
      }
      try {
        const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
        const verdict = await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl, clientId)
        // Refused ⇒ no status write. See `/consent/bulk` for why the write is the harm.
        if (!verdict.sent) {
          refused[verdict.reason] = (refused[verdict.reason] ?? 0) + 1
          console.warn(`[leads/bulk-consent] lead ${lead.id} NOT sent — ${verdict.reason}: ${verdict.detail}`)
          skipped++; continue
        }
        await db.from('leads').update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() }).eq('id', lead.id)
        sent++
      } catch { skipped++ }
    }

    res.json({ success: true, data: { sent, skipped, skippedReasons: { ...refused } } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to send bulk consent' })
  }
})

// ── BULK EXPORT (POST) ────────────────────────────────────────────────────────
leadRouter.post('/bulk-export', async (req: AuthRequest, res) => {
  try {
    const { leadIds } = z.object({
      leadIds: z.array(z.string().uuid()).optional(),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const EXPORT_LIMIT = 5000
    // Only export DELIVERED leads — clients can't export leads they haven't
    // been charged for / can't see.
    let query = db.from('leads')
      .select('first_name,last_name,email,phone,job_title,company,industry,country,score,status,created_at,revealed_at')
      .eq('client_id', clientId)
      .not('delivered_at', 'is', null)
      .order('score', { ascending: false, nullsFirst: false })
      .limit(EXPORT_LIMIT)

    if (leadIds && leadIds.length > 0) {
      query = query.in('id', leadIds)
    }

    const { data, error } = await query
    if (error) throw error

    const date = new Date().toISOString().slice(0, 10)
    if ((data?.length ?? 0) >= EXPORT_LIMIT) {
      res.setHeader('X-Export-Truncated', 'true')
      res.setHeader('X-Export-Limit', String(EXPORT_LIMIT))
    }
    const headers = ['first_name', 'last_name', 'email', 'phone', 'job_title', 'company', 'industry', 'country', 'score', 'status', 'created_at']
    // #422 — masked leads export WITHOUT contact details: email/phone are only
    // included once the $1 reveal has been paid (revealed_at set).
    const rows = (data || []).map((l: any) => [
      l.first_name, l.last_name, l.revealed_at ? (l.email || '') : '', l.revealed_at ? (l.phone || '') : '',
      l.job_title || '', l.company || '', l.industry || '',
      l.country || '', l.score ?? '', l.status,
      l.created_at ? new Date(l.created_at).toLocaleDateString() : '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="kind-leads-${date}.csv"`)
    res.send(csv)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to export leads' })
  }
})

// ── CSV EXPORT ────────────────────────────────────────────────────────────────
// ── GET /leads/analytics — monthly time-series for portal analytics page ──────
leadRouter.get('/analytics', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // figsy_sent_emails has NO client_id column — scope it via the client's campaigns.
    const { data: campRows } = await db.from('figsy_campaigns')
      .select('id, name, status, created_at').eq('client_id', clientId)
    const campaignIds = (campRows ?? []).map((c: { id: string }) => c.id)
    const campaignFilter = campaignIds.length > 0 ? campaignIds : ['00000000-0000-0000-0000-000000000000']

    const [
      { data: leads },
      { data: emails },
      { data: replies },
      { data: icps },
      { data: enrollments },
    ] = await Promise.all([
      db.from('leads').select('id, created_at, score, status, icp_id, industry, seniority').eq('client_id', clientId).not('delivered_at', 'is', null),
      db.from('figsy_sent_emails').select('id, sent_at, opened_at, campaign_id').in('campaign_id', campaignFilter),
      db.from('figsy_replies').select('id, received_at, classification, campaign_id').eq('client_id', clientId),
      db.from('icps').select('id, name').eq('client_id', clientId),
      db.from('figsy_enrollments').select('campaign_id').in('campaign_id', campaignFilter),
    ])

    // Monthly buckets — last 6 months
    const months: { key: string; label: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
      months.push({ key, label })
    }

    const byMonth = months.map(m => {
      const mLeads   = (leads   || []).filter((l: any) => l.created_at?.slice(0,7) === m.key)
      const mEmails  = (emails  || []).filter((e: any) => e.sent_at?.slice(0,7) === m.key)
      const mReplies = (replies || []).filter((r: any) => r.received_at?.slice(0,7) === m.key)
      const mInterested = mReplies.filter((r: any) => r.classification === 'interested' || r.classification === 'hot')
      // Real opens — count sent emails in this month that have an opened_at stamp
      // (recorded by the tracking pixel). 0 if tracking is off (no branded TRACKING_URL).
      const mOpened = mEmails.filter((e: any) => !!e.opened_at)
      return {
        month:      m.label,
        leads:      mLeads.length,
        emails:     mEmails.length,
        opened:     mOpened.length,
        replies:    mReplies.length,
        interested: mInterested.length,
        // #406 — REAL per-month unsubscribes, counted here because only the server has the
        // month KEY. `month` above is the display label ("Jan 26"); the portal receives that
        // and nothing else, so it could never match a reply's `YYYY-MM` timestamp against it.
        // The analytics page had tried, given up, and fallen back to `replies * 0.05` — an
        // invented unsubscribe count shown to the client, one line below a comment reading
        // "never fabricate a bounce number". Counted properly it costs nothing: mReplies is
        // already filtered to this month, and this matches the same classifications the
        // page's own total uses.
        unsubscribed: mReplies.filter((r: any) =>
          r.classification === 'opt_out' || r.classification === 'unsubscribe').length,
      }
    })

    // ICP breakdown
    const icpMap: Record<string, { id: string; name: string; leads: number; avg_score: number }> = {}
    for (const icp of (icps || [])) {
      const icpLeads = (leads || []).filter((l: any) => l.icp_id === icp.id)
      const scores   = icpLeads.map((l: any) => Number(l.score)).filter(Boolean)
      icpMap[icp.id] = {
        id:        icp.id,
        name:      icp.name,
        leads:     icpLeads.length,
        avg_score: scores.length ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0,
      }
    }
    const icpBreakdown = Object.values(icpMap).sort((a, b) => b.leads - a.leads).slice(0, 8)

    // Score distribution (buckets: 0–19, 20–39, 40–59, 60–79, 80–100)
    const scoredLeads = (leads || []).filter((l: any) => l.score != null)
    const scoreDist = [
      { label: '0–19',   count: scoredLeads.filter((l: any) => l.score < 20).length },
      { label: '20–39',  count: scoredLeads.filter((l: any) => l.score >= 20 && l.score < 40).length },
      { label: '40–59',  count: scoredLeads.filter((l: any) => l.score >= 40 && l.score < 60).length },
      { label: '60–79',  count: scoredLeads.filter((l: any) => l.score >= 60 && l.score < 80).length },
      { label: '80–100', count: scoredLeads.filter((l: any) => l.score >= 80).length },
    ]

    // Top industries
    const industryCounts: Record<string, number> = {}
    for (const l of (leads || []) as any[]) {
      if (l.industry) industryCounts[l.industry] = (industryCounts[l.industry] ?? 0) + 1
    }
    const topIndustries = Object.entries(industryCounts)
      .sort(([,a],[,b]) => b - a).slice(0, 6)
      .map(([industry, count]) => ({ industry, count }))

    // Per-campaign performance — derived from REAL send-log rows (figsy_sent_emails)
    // and real enrollments/replies, NOT the figsy_campaigns counters. The counters can
    // drift (e.g. seeded/warmup data), which made the table read "120 sent" while the
    // summary cards (also row-based) read 0. Reading rows here = one source of truth, so
    // the table and the cards always agree.
    const byCampaign = (campRows ?? []).map((c: any) => {
      const cSent       = (emails || []).filter((e: any) => e.campaign_id === c.id)
      const cOpened     = cSent.filter((e: any) => !!e.opened_at).length
      const cReplies    = (replies || []).filter((r: any) => r.campaign_id === c.id)
      const cInterested = cReplies.filter((r: any) => r.classification === 'interested' || r.classification === 'hot').length
      const contacts    = (enrollments || []).filter((en: any) => en.campaign_id === c.id).length
      const sent        = cSent.length
      return {
        id:         c.id,
        name:       c.name,
        status:     c.status,
        created_at: c.created_at,
        contacts,
        sent,
        opened:     cOpened,
        open_rate:  sent > 0 ? Math.round((cOpened / sent) * 100) : 0,
        replies:    cReplies.length,
        interested: cInterested,
        reply_rate: sent > 0 ? Math.round((cReplies.length / sent) * 100) : 0,
      }
    }).sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))

    // Open-tracking is OFF for FIGSY cold outreach BY DESIGN: cold mail is sent via
    // `coldEmailHtml`, which deliberately embeds NO open pixel (D3 — an invisible <img>
    // to a tracking host is a phishing signal that tanks inbox placement). So `opened_at`
    // is structurally always null here, regardless of TRACKING_URL. We report tracking as
    // off so the UI shows an honest "n/a" instead of a misleading 0% open rate. (A branded
    // TRACKING_URL only powers warm/transactional opens, not this cold analytics.)
    const trackingEnabled = false

    // ── Headline totals counted the EXACT way /figsy/kpis does (a head count, no row
    // fetch) so the Analytics summary cards CANNOT disagree with Performance. We also
    // expose _debug: if `sentRowsFetched` (the row select above) is less than
    // `sentHeadCount` (this count), the row fetch is silently truncating/erroring — which
    // is the only way KPIs could read 120 while the per-campaign/month breakdowns read 0.
    const [{ count: sentHeadCount }, { count: openedHeadCount }] = await Promise.all([
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', campaignFilter),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', campaignFilter).not('opened_at', 'is', null),
    ])
    const totals = {
      sent:    sentHeadCount ?? 0,
      opened:  openedHeadCount ?? 0,
      replied: (replies ?? []).length,
    }

    res.json({
      success: true,
      data: { byMonth, byCampaign, totals, icpBreakdown, scoreDist, topIndustries, trackingEnabled },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch analytics' }) }
})

leadRouter.get('/export/csv', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Export every DELIVERED (= charged) lead the client can see, excluding only
    // those who opted out. Leads are worked under legitimate interest, so gating
    // on status='consent_given' was wrong — it returned an EMPTY file for every
    // client (nobody clicks an explicit opt-in link), despite paid-for leads.
    // NOTE: do NOT filter `.neq('status','opted_out')` — the live lead_status enum
    // doesn't contain 'opted_out' (schema drift), so comparing against it throws
    // 22P02 and 500s the whole export. Opt-outs are tracked in opt_out_blocklist,
    // not this status, and no lead can hold an enum value that doesn't exist — so
    // there's nothing to exclude here. Matches the working /bulk-export endpoint:
    // delivered (= charged) leads only.
    const { data, error } = await db.from('leads')
      .select('first_name,last_name,email,phone,job_title,company,linkedin_url,country,score,status,consent_given_at')
      .eq('client_id', clientId)
      .not('delivered_at', 'is', null)
      .order('score', { ascending: false, nullsFirst: false })

    if (error) throw error

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Job Title', 'Company', 'LinkedIn', 'Country', 'Score', 'Status', 'Consent Date']
    const rows = (data || []).map((l: any) => [
      l.first_name, l.last_name, l.email || '', l.phone || '',
      l.job_title || '', l.company || '', l.linkedin_url || '',
      l.country || '', l.score ?? '', l.status,
      l.consent_given_at ? new Date(l.consent_given_at).toLocaleDateString() : '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="kind-leads.csv"')
    res.send(csv)
  } catch (err) {
    // Supabase/PostgREST errors are plain objects (not JS Errors), so String(err)
    // gave "[object Object]". Pull the actual fields so the real cause is visible.
    const e = err as { message?: string; details?: string; hint?: string; code?: string }
    const msg = e?.message || e?.details || e?.hint || e?.code || JSON.stringify(err)
    console.error('[leads/export/csv] FAILED:', msg, '| code:', e?.code, '| details:', e?.details)
    res.status(500).json({ success: false, error: `Failed to export leads: ${msg}` })
  }
})

// ── IMPORT FROM LINKEDIN / ZOOMINFO CSV ───────────────────────────────────────
leadRouter.post('/import/linkedin', async (req: AuthRequest, res) => {
  try {
    const { leads } = z.object({
      leads: z.array(z.object({
        first_name:   z.string().optional(),
        last_name:    z.string().optional(),
        email:        z.string().email().optional(),
        phone:        z.string().optional(),
        job_title:    z.string().optional(),
        company:      z.string().optional(),
        linkedin_url: z.string().optional(),
        country:      z.string().optional(),
        company_size: z.string().optional(),
        industry:     z.string().optional(),
        seniority:    z.string().optional(),
      })).min(1).max(500),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Fetch existing emails to deduplicate
    const emails = leads.map(l => l.email).filter(Boolean) as string[]
    const existingSet = new Set<string>()
    if (emails.length) {
      const { data: existing } = await db.from('leads')
        .select('email').eq('client_id', clientId).in('email', emails)
      existing?.forEach((r: any) => r.email && existingSet.add(r.email.toLowerCase()))
    }

    // Fetch blocklist
    // HC-1 — normalise the PROBE, not just the answer. This site already lowercased the rows
    // it got back, which does nothing: a row that fails to match is never returned.
    const { data: blocklisted } = await db.from('opt_out_blocklist')
      .select('email').in('email', normalizeRevealEmails(emails))
    const blockSet = new Set(normalizeRevealEmails((blocklisted ?? []).map((r: any) => r.email)))

    let created = 0, skipped = 0, errors = 0
    const insertedIds: string[] = []

    for (const lead of leads) {
      const emailLower = lead.email?.toLowerCase()
      if (emailLower && (existingSet.has(emailLower) || blockSet.has(emailLower))) {
        skipped++
        continue
      }
      const { data: row, error } = await db.from('leads').insert({
        client_id:    clientId,
        first_name:   lead.first_name || 'Unknown',
        last_name:    lead.last_name || '',
        email:        lead.email || null,
        phone:        lead.phone || null,
        job_title:    lead.job_title || null,
        company:      lead.company || null,
        linkedin_url: lead.linkedin_url || null,
        country:      lead.country || null,
        company_size: lead.company_size || null,
        industry:     lead.industry || null,
        seniority:    lead.seniority || null,
        status:       'pending',
        source:       'linkedin_csv',
      }).select('id').single()
      if (error) { errors++; continue }
      created++
      if (row?.id) insertedIds.push(row.id)
    }

    // Fire-and-forget scoring against the client's most recent ICP
    if (insertedIds.length > 0) {
      const { data: icpRow } = await db.from('icps')
        .select('*').eq('client_id', clientId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      const { data: clientRow } = await db.from('clients')
        .select('company_name').eq('id', clientId).maybeSingle()
      if (icpRow) {
        scoreLeadsForIcp(insertedIds, icpRow as any, clientRow?.company_name ?? '', clientId).catch(console.error)
      }
    }

    res.json({ success: true, data: { created, skipped, errors } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to import leads' })
  }
})

// ── AI RESEARCH PER LEAD (P1-12) ──────────────────────────────────────────────
// GET /leads/:id/research
// Returns a 3-bullet research summary for a lead (cached in research_summary column)
leadRouter.get('/:id/research', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('id, first_name, last_name, job_title, company, industry, country, score, research_summary')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .maybeSingle()

    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    // Return cached result if available
    if ((lead as any).research_summary) {
      res.json({ success: true, data: { bullets: (lead as any).research_summary, cached: true } }); return
    }

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are a B2B sales researcher. For this lead, provide exactly 3 concise bullet points:
1. What the company does (one sentence)
2. Likely pain points for someone in their role
3. A suggested opener line for cold outreach

Lead:
- Name: ${lead.first_name} ${lead.last_name}
- Role: ${lead.job_title ?? 'unknown'}
- Company: ${lead.company ?? 'unknown'}
- Industry: ${lead.industry ?? 'unknown'}
- Country: ${lead.country ?? 'unknown'}

Return ONLY valid JSON, no markdown: { "bullets": ["bullet 1", "bullet 2", "bullet 3"] }`,
      }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    let bullets: string[]
    try {
      const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(clean)
      bullets = parsed.bullets ?? [text]
    } catch {
      bullets = [
        `${lead.company ?? 'This company'} operates in the ${lead.industry ?? 'B2B'} space.`,
        `As a ${lead.job_title ?? 'decision maker'}, they likely face challenges around efficiency and growth.`,
        `Opening line: "I noticed ${lead.company ?? 'your company'} is focused on growth — wanted to share how we've helped similar teams."`,
      ]
    }

    // Cache the result (gracefully handle missing column)
    try {
      await db.from('leads').update({ research_summary: bullets }).eq('id', req.params.id)
    } catch (cacheErr) {
      console.warn('[leads/research] Could not cache result:', cacheErr)
    }

    res.json({ success: true, data: { bullets, cached: false } })
  } catch (err) {
    console.error('[leads/research]', err)
    res.status(500).json({ success: false, error: 'Failed to generate research' })
  }
})

// ── FIND CONTACTS AT SPECIFIC COMPANIES (from company CSV upload) ─────────────
leadRouter.post('/find-at-companies', async (req: AuthRequest, res) => {
  try {
    const { companies, limit } = z.object({
      companies: z.array(z.string().min(1)).min(1).max(100),
      limit:     z.number().int().min(1).max(200).default(50),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Load client ICP — fall back to a generic SDM search if none set
    const { data: icpRow } = await db.from('icps')
      .select('*').eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const { data: clientRow } = await db.from('clients')
      .select('company_name').eq('id', clientId).maybeSingle()

    const icp = icpRow ?? {
      job_titles: ['CEO', 'Founder', 'Director', 'Head of', 'VP'],
      seniority_levels: ['director', 'vp', 'c_suite', 'owner', 'founder'],
      company_sizes: [],
      geographies: [],
      industries: [],
      tech_stack: [],
      keywords: [],
      apollo_only_consented: false,
      intent_signals: [],
    }

    // Build Apollo search body targeting specific companies
    const searchBody = buildSearchBody({ ...icp, organization_names: companies }, 1)
    searchBody.per_page = Math.min(limit, 100)

    const contacts = await searchPeople(searchBody)
    if (!contacts.length) {
      res.json({ success: true, data: { created: 0, skipped: 0, message: 'No contacts found at these companies in Apollo' } })
      return
    }

    // Fetch existing emails and blocklist
    const contactEmails = contacts.map(c => c.email).filter(Boolean) as string[]
    const { data: existing } = await db.from('leads')
      .select('email').eq('client_id', clientId).in('email', contactEmails)
    // HC-1 — normalise the PROBE. Same wrong-side normalisation as the CSV path above.
    // (This reader was not in the prompt's list; found by enumerating every call site.)
    const { data: blocklisted } = await db.from('opt_out_blocklist')
      .select('email').in('email', normalizeRevealEmails(contactEmails))
    const existingSet = new Set([
      ...normalizeRevealEmails((existing ?? []).map((r: any) => r.email)),
      ...normalizeRevealEmails((blocklisted ?? []).map((r: any) => r.email)),
    ])

    let created = 0, skipped = 0
    const insertedIds: string[] = []

    for (const c of contacts) {
      if (c.email && existingSet.has(c.email.toLowerCase())) { skipped++; continue }
      const { data: row, error } = await db.from('leads').insert({
        client_id:    clientId,
        first_name:   c.first_name || 'Unknown',
        last_name:    c.last_name || '',
        email:        c.email || null,
        job_title:    c.title || null,
        company:      c.organization_name || null,
        linkedin_url: c.linkedin_url || null,
        country:      c.country || null,
        company_size: c.organization?.num_employees ? String(c.organization.num_employees) : null,
        apollo_id:    c.id || null,
        status:       'pending',
        source:       'company_csv',
      }).select('id').single()
      if (error) { skipped++; continue }
      created++
      if (row?.id) insertedIds.push(row.id)
    }

    // Score in background
    if (insertedIds.length > 0 && icpRow) {
      scoreLeadsForIcp(insertedIds, icpRow as any, clientRow?.company_name ?? '', clientId).catch(console.error)
    }

    res.json({ success: true, data: { created, skipped, total_found: contacts.length } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to find contacts at companies' })
  }
})
