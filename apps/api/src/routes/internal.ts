/**
 * Internal agent routes — AE + CRO agents (INT-1 to INT-7)
 * Protected by ADMIN_SECRET_KEY header.
 * These routes are called by cron jobs (Railway / external scheduler).
 *
 * Endpoints:
 *   POST /internal/digest/weekly          — D5: send weekly leads digest to all active clients
 *   POST /internal/ae/at-risk             — INT-2: detect and alert on at-risk clients
 *   POST /internal/ae/trial-expiry        — INT-4: RETIRED (#607) — refuses 410, sends nothing
 *   POST /internal/ae/nurture             — M-2:  RETIRED (#607) — refuses 410, sends nothing
 *   GET  /internal/cro/dashboard          — INT-5: revenue + retention dashboard data
 *   POST /internal/cro/weekly-digest      — INT-6: send weekly founder digest email
 *   POST /internal/figsy/check-performance — pause active campaigns with reply rate < 1%
 */

import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { db } from '@kind/db'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { sendWeeklyLeadsDigest, sendZeroCreditsWarning, sendLowCreditsWarning, sendCampaignPausedEmail, isRealRecipient, sendOnboardingEmail, lifecycleEmailsEnabled } from '../lib/email'
import { KIND_BRAND, findKindProspects } from '../lib/cmo'
import { isPlaceholderEmail } from '../lib/email-hygiene'
import { scoreLeadsForIcp } from '../lib/scoring'
import { getHubspotPipelineView } from '../lib/hubspot'
import { enrichAndDeliverLeads } from '../lib/lead-delivery'
import { deliveryCapBalance, normalizePlan } from '../lib/billing-rules'
import { recomputeCampaignCounters } from '../lib/figsy'
import { getClientExclusions } from '../lib/real-clients'
import { sendFounderAlert } from '../lib/alerts'
import { isEnumRejection } from '../lib/subscription-status'
import {
  decideLapse, webhookSuspectLines, LAPSED_STATUS, LAPSED_FALLBACK, type LapseCandidate,
} from '../lib/subscription-lapse'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = 'K.I.N.D <hello@get-kind.com>'
// #607 — DASH was the '/dashboard/billing' link in the trial-expiry email ('Subscribe now →')
// and had no other consumer; retiring that handler left it unused. Note the URL it built was
// already wrong: middleware redirects every signed-in client off /dashboard to /milla.

export const internalRouter = Router()

// figsy_sent_emails has NO client_id column — it's keyed by campaign_id. Returns
// the client's campaign IDs (or a sentinel that matches nothing) for scoping.
async function clientCampaignFilter(clientId: string): Promise<string[]> {
  const { data } = await db.from('figsy_campaigns').select('id').eq('client_id', clientId)
  const ids = (data ?? []).map((c: { id: string }) => c.id)
  return ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000']
}

// Constant-time admin-key check — avoids the char-by-char timing side-channel of `!==`.
function adminKeyValid(provided: unknown): boolean {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false
  const a = Buffer.from(String(provided ?? ''))
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function requireAdminKey(req: Request, res: Response, next: () => void) {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
}

internalRouter.use(requireAdminKey)

// ── R16 (Learning Engine ③) — EVALS HARNESS ───────────────────────────────────
// Internal-only. Measures what's actually working across all outreach so we can
// learn and tune: reply rate per sequence step, the best/worst subject-line
// variants, and the reply-classification distribution (intent quality + opt-out
// rate). GET /internal/evals?days=30
internalRouter.get('/evals', async (req: Request, res: Response) => {
  try {
    const days = Math.min(180, Math.max(1, parseInt(String(req.query.days ?? '30'), 10) || 30))
    const since = new Date(Date.now() - days * 86400000).toISOString()

    // Pull sent emails + replies in the window (capped to keep it bounded).
    const [{ data: sent }, { data: replies }] = await Promise.all([
      db.from('figsy_sent_emails').select('lead_id, step, subject, sent_at').gte('sent_at', since).limit(20000),
      db.from('figsy_replies').select('lead_id, classification, received_at').gte('received_at', since).limit(20000),
    ])

    const sentRows = (sent ?? []) as { lead_id: string | null; step: number | null; subject: string | null }[]
    const replyRows = (replies ?? []) as { lead_id: string | null; classification: string | null }[]

    // Leads that replied (any reply) — used as the "got a reply" signal.
    const repliedLeads = new Set(replyRows.map(r => r.lead_id).filter(Boolean) as string[])
    const positiveLeads = new Set(replyRows.filter(r => r.classification === 'hot' || r.classification === 'interested').map(r => r.lead_id).filter(Boolean) as string[])

    // Per-step reply rate.
    const byStep: Record<number, { sent: number; leads: Set<string> }> = {}
    for (const s of sentRows) {
      const step = s.step ?? 1
      byStep[step] ??= { sent: 0, leads: new Set() }
      byStep[step].sent++
      if (s.lead_id) byStep[step].leads.add(s.lead_id)
    }
    const stepStats = Object.entries(byStep).map(([step, v]) => {
      const repliedCount = [...v.leads].filter(l => repliedLeads.has(l)).length
      return { step: Number(step), sent: v.sent, leads: v.leads.size, replied: repliedCount,
        reply_rate_pct: v.leads.size ? +(repliedCount / v.leads.size * 100).toFixed(1) : 0 }
    }).sort((a, b) => a.step - b.step)

    // Subject-variant performance (step-1 subjects = the A/B variants).
    const bySubject: Record<string, Set<string>> = {}
    for (const s of sentRows) {
      if ((s.step ?? 1) !== 1 || !s.subject || !s.lead_id) continue
      const key = s.subject.trim().toLowerCase()
      ;(bySubject[key] ??= new Set()).add(s.lead_id)
    }
    const subjectStats = Object.entries(bySubject)
      .map(([subject, leads]) => {
        const repliedCount = [...leads].filter(l => repliedLeads.has(l)).length
        return { subject, sent: leads.size, replied: repliedCount,
          reply_rate_pct: leads.size ? +(repliedCount / leads.size * 100).toFixed(1) : 0 }
      })
      .filter(s => s.sent >= 5)                                   // ignore tiny samples
      .sort((a, b) => b.reply_rate_pct - a.reply_rate_pct)
    const topSubjects = subjectStats.slice(0, 10)
    const bottomSubjects = subjectStats.slice(-10).reverse()

    // Reply-classification distribution.
    const classDist: Record<string, number> = {}
    for (const r of replyRows) {
      const c = r.classification ?? 'unknown'
      classDist[c] = (classDist[c] ?? 0) + 1
    }

    const totalSentLeads = new Set(sentRows.map(s => s.lead_id).filter(Boolean) as string[]).size

    res.json({
      success: true,
      data: {
        window_days: days,
        totals: {
          emails_sent:      sentRows.length,
          leads_contacted:  totalSentLeads,
          replies:          replyRows.length,
          leads_replied:    repliedLeads.size,
          reply_rate_pct:   totalSentLeads ? +(repliedLeads.size / totalSentLeads * 100).toFixed(1) : 0,
          positive_rate_pct: totalSentLeads ? +(positiveLeads.size / totalSentLeads * 100).toFixed(1) : 0,
        },
        per_step:          stepStats,
        top_subjects:      topSubjects,
        bottom_subjects:   bottomSubjects,
        classification:    classDist,
      },
    })
  } catch (err) {
    console.error('[internal/evals]', err)
    res.status(500).json({ success: false, error: 'Evals computation failed' })
  }
})

// ── D5 — WEEKLY LEADS DIGEST ──────────────────────────────────────────────────
// Send every Monday morning to all active clients.
internalRouter.post('/digest/weekly', async (_req: Request, res: Response) => {
  try {
    const now       = new Date()
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString()

    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id')
      .not('user_id', 'is', null)

    let sent = 0
    let failed = 0

    for (const client of clients ?? []) {
      try {
        const { data: { user } } = await db.auth.admin.getUserById(client.user_id!)
        const email = user?.email
        if (!email) continue

        const campFilter = await clientCampaignFilter(client.id)
        const [totalRes, newRes, avgRes, consentedRes, figsySentRes, figsyRepliesRes, figsyInterestedRes, figsyCampaignsRes] = await Promise.all([
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('created_at', weekStart),
          db.from('leads').select('score, estimated_deal_value_usd').eq('client_id', client.id).not('score', 'is', null),
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'consent_given'),
          db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', campFilter).gte('sent_at', weekStart),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('received_at', weekStart),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).in('classification', ['hot', 'interested']).gte('received_at', weekStart),
          db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'active'),
        ])

        const scores = (avgRes.data ?? []) as { score: number; estimated_deal_value_usd: number | null }[]
        const avgScore = scores.length
          ? Math.round(scores.reduce((s, l) => s + l.score, 0) / scores.length)
          : 0
        const pipelineValue = scores.reduce((s, l) => s + (l.estimated_deal_value_usd ?? 0), 0)

        const { data: topLeads } = await db.from('leads')
          .select('first_name, last_name, job_title, company, score, linkedin_url')
          .eq('client_id', client.id)
          .not('score', 'is', null)
          .order('score', { ascending: false })
          .limit(10)

        await sendWeeklyLeadsDigest(email, client.company_name ?? '', {
          total_leads:    totalRes.count    ?? 0,
          new_this_week:  newRes.count      ?? 0,
          avg_score:      avgScore,
          pipeline_value: pipelineValue,
          consented:      consentedRes.count ?? 0,
        }, topLeads ?? [], {
          emails_sent:        figsySentRes.count      ?? 0,
          total_replies:      figsyRepliesRes.count   ?? 0,
          interested_replies: figsyInterestedRes.count ?? 0,
          active_campaigns:   figsyCampaignsRes.count ?? 0,
        })

        sent++
      } catch (err) {
        console.error(`[digest/weekly] failed for client ${client.id}:`, err)
        failed++
      }
    }

    res.json({ success: true, data: { sent, failed } })
  } catch (err) {
    console.error('[digest/weekly]', err)
    res.status(500).json({ success: false, error: 'Failed to send weekly digests' })
  }
})

// ── INT-2 — AT-RISK ALERT ─────────────────────────────────────────────────────
// Flag clients with no login activity or no ICP after 3 days. Email founder.
internalRouter.post('/ae/at-risk', async (_req: Request, res: Response) => {
  try {
    const cutoff = new Date(Date.now() - 3 * 86400000).toISOString()

    const { data: clients } = await db.from('clients')
      .select('id, company_name, created_at, user_id, first_icp_run_at')
      .lte('created_at', cutoff)

    const atRisk: { id: string; company_name: string; reason: string; days_old: number }[] = []

    for (const client of clients ?? []) {
      const daysOld = Math.floor((Date.now() - new Date(client.created_at).getTime()) / 86400000)

      // No ICP run yet
      if (!client.first_icp_run_at) {
        atRisk.push({ id: client.id, company_name: client.company_name ?? '—', reason: 'No ICP built yet', days_old: daysOld })
        continue
      }

      // No leads at all
      const { count } = await db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id)
      if (!count) {
        atRisk.push({ id: client.id, company_name: client.company_name ?? '—', reason: 'ICP built but no leads delivered', days_old: daysOld })
      }
    }

    if (atRisk.length === 0) {
      res.json({ success: true, data: { at_risk: 0 } })
      return
    }

    // Send alert to founder
    const founderEmail = process.env.FOUNDER_EMAIL
    if (founderEmail && resend) {
      const rows = atRisk.map(c =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${c.company_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#dc2626">${c.reason}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#888">${c.days_old}d old</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">
            <a href="https://admin.get-kind.com" style="color:#7C3AED;font-size:0.8rem">View →</a>
          </td>
        </tr>`
      ).join('')

      await resend.emails.send({
        from: FROM,
        to:   founderEmail,
        subject: `⚠️ ${atRisk.length} at-risk client${atRisk.length > 1 ? 's' : ''} need attention — K.I.N.D`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
            <h2 style="color:#dc2626">At-risk clients — ${new Date().toLocaleDateString('en-ZA')}</h2>
            <p style="color:#555">${atRisk.length} client${atRisk.length > 1 ? 's are' : ' is'} showing churn signals:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#888">Company</th>
                  <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#888">Signal</th>
                  <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#888">Age</th>
                  <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#888"></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="color:#888;font-size:0.8rem;margin-top:24px">
              Act now — clients who don't get value in week 1 rarely convert.
            </p>
          </div>
        `,
      })
    }

    res.json({ success: true, data: { at_risk: atRisk.length, clients: atRisk } })
  } catch (err) {
    console.error('[ae/at-risk]', err)
    res.status(500).json({ success: false, error: 'At-risk check failed' })
  }
})

// ── INT-3 — AI CHECK-IN DRAFT ─────────────────────────────────────────────────
// Claude drafts a personalised check-in email for a specific client.
internalRouter.post('/ae/checkin-draft', async (req: Request, res: Response) => {
  try {
    const { client_id } = req.body as { client_id: string }
    if (!client_id) { res.status(400).json({ success: false, error: 'client_id required' }); return }

    const { data: client } = await db.from('clients')
      .select('id, company_name, industry, country, created_at, first_icp_run_at')
      .eq('id', client_id).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { count: leadCount } = await db.from('leads')
      .select('id', { count: 'exact', head: true }).eq('client_id', client_id)
    const { count: consentCount } = await db.from('leads')
      .select('id', { count: 'exact', head: true }).eq('client_id', client_id).eq('status', 'consent_given')

    const daysOld = Math.floor((Date.now() - new Date(client.created_at).getTime()) / 86400000)

    const prompt = `You are an account executive at K.I.N.D, an AI lead generation platform. Write a short, warm check-in email to this client.

Client: ${client.company_name}
Industry: ${client.industry || 'unknown'}
Days since signup: ${daysOld}
Leads delivered: ${leadCount ?? 0}
Consented leads: ${consentCount ?? 0}
ICP built: ${client.first_icp_run_at ? 'Yes' : 'No'}

Write a 3-4 sentence check-in email that:
1. References something specific about their situation (no ICP? low leads? great progress?)
2. Offers one concrete next step or tip
3. Ends with a low-friction CTA (quick call, question, etc.)

Output only the email body. No subject line. No placeholders.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const draft = (message.content[0] as { type: string; text: string }).text.trim()
    res.json({ success: true, data: { draft, client_name: client.company_name } })
  } catch (err) {
    console.error('[ae/checkin-draft]', err)
    res.status(500).json({ success: false, error: 'Failed to generate check-in draft' })
  }
})

// ── INT-4 — TRIAL EXPIRY SEQUENCE — RETIRED (#607, 1 Aug) ────────────────────
// This sent a real person: "Your K.I.N.D trial ends in 4 days… Subscribe now →", with a
// button to /billing. There is no trial and there is no subscription — the money model has
// been $99 for the onboarding pack then $4 per approved lead since 24 Jul. It ran daily at
// 07:00 UTC against every row still carrying status='trialing'.
//
// It REFUSES rather than being deleted, because the danger was never the schedule alone: any
// stale scheduler, run-book entry or hand-rolled POST could fire the sequence at a live
// client. A 410 cannot send an email; a quietly-removed cron line can be re-added by someone
// reading an old doc. The behaviour it used to have is in this file's history.
internalRouter.post('/ae/trial-expiry', async (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'Retired (#607). There is no trial: the model is $99 for the onboarding pack, then $4 per approved lead. This endpoint used to email clients about a trial ending and it will not send anything.',
  })
})

// ── INT-5 — CRO DASHBOARD ─────────────────────────────────────────────────────
// Revenue + retention metrics for admin dashboard.
internalRouter.get('/cro/dashboard', async (_req: Request, res: Response) => {
  try {
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      exclusions,
      { data: activeSubsRaw },
      { data: trialSubsRaw },
      { data: cancelledSubsRaw },
      { count: totalClientsDemoFiltered },
      { count: totalLeads },
      { count: leadsThisMonth },
    ] = await Promise.all([
      // Revenue-honesty: exclude demo (#364) AND the house account (founder testing).
      // subscriptions has no is_demo/email, so we carry client_id and filter in JS
      // against the excluded set (demo ∪ house).
      getClientExclusions(),
      db.from('subscriptions').select('client_id, amount_zar, created_at, clients!inner(is_demo)').eq('status', 'active').eq('clients.is_demo', false),
      db.from('subscriptions').select('client_id, trial_ends_at, clients!inner(is_demo)').eq('status', 'trialing').eq('clients.is_demo', false),
      db.from('subscriptions').select('client_id, cancelled_at, clients!inner(is_demo)').eq('status', 'cancelled').eq('clients.is_demo', false).gte('cancelled_at', monthStart),
      db.from('clients').select('id', { count: 'exact', head: true }).eq('is_demo', false),
      db.from('leads').select('id', { count: 'exact', head: true }),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    ])

    const notExcluded = (s: any) => !exclusions.excludedClientIds.has(s.client_id)
    const activeSubs    = (activeSubsRaw    ?? []).filter(notExcluded)
    const trialSubs     = (trialSubsRaw     ?? []).filter(notExcluded)
    const cancelledSubs = (cancelledSubsRaw ?? []).filter(notExcluded)
    // total non-demo clients minus any house clients caught in that count.
    const houseNonDemo  = [...exclusions.houseClientIds].filter((id) => !exclusions.demoClientIds.has(id)).length
    const totalClients  = Math.max(0, (totalClientsDemoFiltered ?? 0) - houseNonDemo)

    const mrrZar     = activeSubs.reduce((s: number, sub: any) => s + (sub.amount_zar ?? 0), 0)
    const mrrUsd     = Math.round(mrrZar / 19)
    const lastMrrZar = activeSubs.filter((s: any) => s.created_at < monthStart)
      .reduce((sum: number, sub: any) => sum + (sub.amount_zar ?? 0), 0)
    const lastMrrUsd = Math.round(lastMrrZar / 19)
    const mrrGrowth  = lastMrrUsd > 0 ? Math.round(((mrrUsd - lastMrrUsd) / lastMrrUsd) * 100) : null

    // Trials expiring in next 7 days
    const expiringTrials = trialSubs.filter((s: any) => {
      if (!s.trial_ends_at) return false
      const daysLeft = (new Date(s.trial_ends_at).getTime() - now.getTime()) / 86400000
      return daysLeft >= 0 && daysLeft <= 7
    }).length

    res.json({
      success: true,
      data: {
        mrr_usd:            mrrUsd,
        mrr_zar:            Math.round(mrrUsd * 19),
        mrr_growth_pct:     mrrGrowth,
        target_mrr_usd:     26000,
        target_pct:         Math.round((mrrUsd / 26000) * 100),
        active_clients:     activeSubs?.length ?? 0,
        trialing_clients:   trialSubs?.length  ?? 0,
        trials_expiring_7d: expiringTrials,
        churned_this_month: cancelledSubs?.length ?? 0,
        total_clients:      totalClients ?? 0,
        total_leads:        totalLeads   ?? 0,
        leads_this_month:   leadsThisMonth ?? 0,
        as_of:              now.toISOString(),
      },
    })
  } catch (err) {
    console.error('[cro/dashboard]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch CRO dashboard' })
  }
})

// ── INT-6 — WEEKLY FOUNDER DIGEST ────────────────────────────────────────────
// Claude writes a brief weekly summary of the business and emails it to the founder.
internalRouter.post('/cro/weekly-digest', async (_req: Request, res: Response) => {
  try {
    const founderEmail = process.env.FOUNDER_EMAIL
    if (!founderEmail) { res.status(422).json({ success: false, error: 'FOUNDER_EMAIL not set' }); return }

    // Gather metrics
    const now        = new Date()
    const weekStart  = new Date(now.getTime() - 7 * 86400000).toISOString()

    const [
      exclusions,
      { data: activeSubsRaw },
      { count: trialing },
      { count: newThisWeek },
      { count: totalLeads },
      { count: leadsThisWeek },
      { count: consentedTotal },
      { data: atRiskClients },
    ] = await Promise.all([
      // Revenue-honesty: exclude demo (#364) AND the house account from digest MRR.
      getClientExclusions(),
      db.from('subscriptions').select('client_id, amount_zar, clients!inner(is_demo)').eq('status', 'active').eq('clients.is_demo', false),
      db.from('subscriptions').select('id, clients!inner(is_demo)', { count: 'exact', head: true }).eq('status', 'trialing').eq('clients.is_demo', false),
      db.from('clients').select('id', { count: 'exact', head: true }).eq('is_demo', false).gte('created_at', weekStart),
      db.from('leads').select('id', { count: 'exact', head: true }),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'consent_given'),
      db.from('clients').select('company_name, first_icp_run_at, created_at').eq('is_demo', false).lte('created_at', weekStart),
    ])

    const activeSubs = (activeSubsRaw ?? []).filter((s: any) => !exclusions.excludedClientIds.has(s.client_id))
    const mrrUsd = Math.round(activeSubs.reduce((s: number, sub: any) => s + (sub.amount_zar ?? 0), 0) / 19)
    const atRisk = (atRiskClients ?? []).filter((c: any) => !c.first_icp_run_at).length

    const prompt = `You are the AI chief of staff for K.I.N.D, an African B2B AI platform. Write a brief weekly digest for the founder.

Business metrics this week:
- MRR: $${mrrUsd.toLocaleString()} / $26,000 target (${Math.round((mrrUsd / 26000) * 100)}% of Month 6 target)
- Active subscriptions: ${activeSubs?.length ?? 0}
- Clients on trial: ${trialing ?? 0}
- New signups this week: ${newThisWeek ?? 0}
- At-risk clients (no ICP built): ${atRisk}
- Total leads in platform: ${totalLeads ?? 0}
- New leads this week: ${leadsThisWeek ?? 0}
- Consented leads (contactable): ${consentedTotal ?? 0}

Write a 4-5 sentence founder digest that:
1. Leads with the most important number (MRR progress or biggest win)
2. Flags the biggest risk right now
3. Gives one clear action for this week
4. Ends with an encouraging one-liner

Tone: honest, direct, no fluff. Like a trusted advisor, not a PR spin.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const digest = (message.content[0] as { type: string; text: string }).text.trim()
    const weekOf  = now.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

    if (resend) {
      await resend.emails.send({
        from: FROM,
        to:   founderEmail,
        subject: `K.I.N.D weekly digest — ${weekOf}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
            <p style="color:#888;font-size:0.8rem;margin-bottom:4px">Week of ${weekOf}</p>
            <h2 style="margin-top:0;color:#111">K.I.N.D Weekly Digest</h2>
            <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px">
              ${digest.split('\n').filter(Boolean).map(p => `<p style="margin:0 0 12px;line-height:1.7;color:#333">${p}</p>`).join('')}
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border-radius:8px;overflow:hidden;margin-bottom:24px">
              <tr>
                <td align="center" style="padding:16px 12px">
                  <p style="margin:0;font-size:1.3rem;font-weight:700;color:#7C3AED">$${mrrUsd.toLocaleString()}</p>
                  <p style="margin:2px 0 0;font-size:0.7rem;color:#888;text-transform:uppercase">MRR</p>
                </td>
                <td align="center" style="padding:16px 12px;border-left:1px solid #d0e8ff">
                  <p style="margin:0;font-size:1.3rem;font-weight:700;color:#111">${activeSubs?.length ?? 0}</p>
                  <p style="margin:2px 0 0;font-size:0.7rem;color:#888;text-transform:uppercase">Active</p>
                </td>
                <td align="center" style="padding:16px 12px;border-left:1px solid #d0e8ff">
                  <p style="margin:0;font-size:1.3rem;font-weight:700;color:#111">${trialing ?? 0}</p>
                  <p style="margin:2px 0 0;font-size:0.7rem;color:#888;text-transform:uppercase">Trialing</p>
                </td>
                <td align="center" style="padding:16px 12px;border-left:1px solid #d0e8ff">
                  <p style="margin:0;font-size:1.3rem;font-weight:700;color:${atRisk > 0 ? '#dc2626' : '#16a34a'}">${atRisk}</p>
                  <p style="margin:2px 0 0;font-size:0.7rem;color:#888;text-transform:uppercase">At risk</p>
                </td>
              </tr>
            </table>
            <a href="https://admin.get-kind.com"
               style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:0.85rem">
              Open admin dashboard →
            </a>
          </div>`,
      })
    }

    res.json({ success: true, data: { digest } })
  } catch (err) {
    console.error('[cro/weekly-digest]', err)
    res.status(500).json({ success: false, error: 'Failed to send founder digest' })
  }
})

// ── INT-7 — CHURN PREDICTION ─────────────────────────────────────────────────
// Score each active/trialing client for churn risk (0-100).
internalRouter.get('/cro/churn-risk', async (_req: Request, res: Response) => {
  try {
    const now        = new Date()
    const weekAgo    = new Date(now.getTime() - 7 * 86400000).toISOString()

    const { data: clients } = await db.from('clients')
      .select('id, company_name, created_at, first_icp_run_at')
      .not('user_id', 'is', null)

    const scores = await Promise.all(
      (clients ?? []).map(async (client: any) => {
        const [leadsRes, recentLeadsRes, consentRes] = await Promise.all([
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('created_at', weekAgo),
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'consent_given'),
        ])

        const totalLeads   = leadsRes.count   ?? 0
        const recentLeads  = recentLeadsRes.count ?? 0
        const consentLeads = consentRes.count  ?? 0
        const daysOld      = Math.floor((now.getTime() - new Date(client.created_at).getTime()) / 86400000)
        const hasIcp       = !!client.first_icp_run_at

        // Risk scoring: higher = more likely to churn
        let risk = 0
        if (!hasIcp)             risk += 40  // never built ICP
        if (totalLeads === 0)    risk += 20  // no leads ever
        if (recentLeads === 0 && daysOld > 7) risk += 20  // no activity this week
        if (consentLeads === 0 && totalLeads > 10) risk += 20  // lots of leads, none consented

        return {
          client_id:    client.id,
          company_name: client.company_name,
          risk_score:   Math.min(risk, 100),
          signals: {
            no_icp:          !hasIcp,
            no_leads:        totalLeads === 0,
            inactive_week:   recentLeads === 0 && daysOld > 7,
            no_consent:      consentLeads === 0 && totalLeads > 10,
          },
        }
      }),
    )

    const sorted = scores.sort((a: any, b: any) => b.risk_score - a.risk_score)
    res.json({ success: true, data: sorted })
  } catch (err) {
    console.error('[cro/churn-risk]', err)
    res.status(500).json({ success: false, error: 'Failed to compute churn risk' })
  }
})

// ── M-2 — TRIAL NURTURE SEQUENCE — RETIRED (#607, 1 Aug) ─────────────────────
// Days 1/3/5/7/10 after signup, to anyone without an ACTIVE subscription. Its first line was
// "Your K.I.N.D trial is live." — it was not; nothing is live until the $99 lands.
//
// TWO THINGS FOUND RETIRING IT, both worth recording rather than deleting quietly:
//   • It never read status='trialing' at all — it read `clients.created_at` inside 14 days and
//     skipped anyone with an active subscription. So it emailed EVERY new signup about a trial
//     regardless of what their subscription row said, and retiring the status alone would have
//     left it running.
//   • Unlike the six other lifecycle crons it had NO `lifecycleEmailsEnabled()` gate, so the
//     master kill-switch (#480) never covered it. Turning lifecycle email off did not turn
//     this off.
//
// Refuses rather than deleted — same reasoning as INT-4 above.
internalRouter.post('/ae/nurture', async (_req: Request, res: Response) => {
  res.status(410).json({
    success: false,
    error: 'Retired (#607). There is no trial to nurture: the model is $99 for the onboarding pack, then $4 per approved lead. This endpoint used to email every new signup "your trial is live" and it will not send anything.',
  })
})

// R6 (#32) — Onboarding activation sequence (days 0/3/7) for ACTIVATED (paid)
// clients. The trial nurture above deliberately skips paid clients, so they
// previously received no lifecycle onboarding at all. Mutually exclusive with
// the nurture (gated on an ACTIVE subscription) so a client never gets both on
// the same day. Same exact-day-match pattern as the nurture cron.
internalRouter.post('/onboarding/activation-sequence', async (_req: Request, res: Response) => {
  try {
    const now = new Date()

    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id, created_at, first_icp_run_at')
      .not('user_id', 'is', null)
      .neq('is_demo', true)
      .gte('created_at', new Date(now.getTime() - 14 * 86400000).toISOString())

    const STAGES = [0, 3, 7] as const
    let sent = 0

    for (const client of clients ?? []) {
      const daysOld = Math.floor((now.getTime() - new Date(client.created_at).getTime()) / 86400000)
      if (!(STAGES as readonly number[]).includes(daysOld)) continue

      // Activation sequence is for PAID clients only — trial clients get the
      // conversion nurture instead (no overlap).
      const { data: activeSub } = await db.from('subscriptions')
        .select('id').eq('client_id', client.id).eq('status', 'active').maybeSingle()
      if (!activeSub) continue

      try {
        const { data: { user } } = await db.auth.admin.getUserById(client.user_id!)
        const email = user?.email
        if (!email) continue

        const { count: leadCount } = await db.from('leads')
          .select('id', { count: 'exact', head: true }).eq('client_id', client.id)
        const { count: campaignCount } = await db.from('figsy_campaigns')
          .select('id', { count: 'exact', head: true }).eq('client_id', client.id)

        await sendOnboardingEmail(email, client.company_name ?? '', daysOld as 0|3|7, {
          has_icp:      !!client.first_icp_run_at,
          lead_count:   leadCount ?? 0,
          has_campaign: (campaignCount ?? 0) > 0,
        })
        sent++
      } catch (err) {
        console.error(`[onboarding/activation] failed for client ${client.id}:`, err)
      }
    }

    res.json({ success: true, data: { sent } })
  } catch (err) {
    console.error('[onboarding/activation]', err)
    res.status(500).json({ success: false, error: 'Onboarding activation run failed' })
  }
})

// ── INT-8 — CMO: BRAND VOICE CONFIG ──────────────────────────────────────────
// In-memory brand voice — update lib/cmo.ts to change permanently.
let brandVoiceOverride: Record<string, unknown> | null = null

internalRouter.get('/cmo/brand-voice', (_req: Request, res: Response) => {
  res.json({ success: true, data: brandVoiceOverride ?? KIND_BRAND })
})

internalRouter.post('/cmo/brand-voice', (req: Request, res: Response) => {
  brandVoiceOverride = req.body as Record<string, unknown>
  res.json({ success: true, data: brandVoiceOverride, note: 'Override active until next deploy. Edit lib/cmo.ts to persist.' })
})

// ── INT-9 — CMO: LINKEDIN POST GENERATOR ─────────────────────────────────────
// Claude generates 3 LinkedIn post drafts using K.I.N.D brand voice.
internalRouter.post('/cmo/linkedin-posts', async (req: Request, res: Response) => {
  try {
    const { theme, product_update, count = 3 } = req.body as {
      theme?: string
      product_update?: string
      count?: number
    }

    const brand = brandVoiceOverride ?? KIND_BRAND as any
    const pillars = (brand.messaging_pillars as string[]).join('\n- ')
    const hooks   = (brand.tone as any).example_hooks.join('\n- ')

    const prompt = `You are the CMO of K.I.N.D — ${brand.tagline}.

Brand voice: ${(brand.tone as any).voice}
Avoid: ${(brand.tone as any).avoid.join(', ')}
Messaging pillars:
- ${pillars}

Example hooks:
- ${hooks}

${theme ? `Theme for this batch: ${theme}` : ''}
${product_update ? `Product update to feature: ${product_update}` : ''}

Write ${count} LinkedIn post drafts for K.I.N.D. Each post should:
- Be 100–200 words
- Lead with a punchy hook (first line is what people see before "see more")
- Target B2B founders and sales directors at African SMEs (5-50 employees)
- Include a clear point of view — no wishy-washy "it depends" content
- End with a question or subtle CTA (not "DM me for a demo")
- Do NOT include hashtags

Separate posts with "---POST---".`

    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw   = (message.content[0] as { type: string; text: string }).text.trim()
    const posts = raw.split('---POST---').map(p => p.trim()).filter(Boolean)

    const schedule = ['Monday', 'Wednesday', 'Friday'].slice(0, posts.length)

    res.json({
      success: true,
      data: {
        posts: posts.map((text, i) => ({ day: schedule[i] ?? `Post ${i + 1}`, text })),
        generated_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[cmo/linkedin-posts]', err)
    res.status(500).json({ success: false, error: 'Failed to generate posts' })
  }
})

// ── INT-10 — CMO: K.I.N.D OUTBOUND (KIND RUNS FIGSY ON ITSELF) ───────────────
// Run Apollo with K.I.N.D's own ICP — emails founder a prospect list.
internalRouter.post('/cmo/prospect', async (_req: Request, res: Response) => {
  try {
    const founderEmail = process.env.FOUNDER_EMAIL
    if (!founderEmail) { res.status(422).json({ success: false, error: 'FOUNDER_EMAIL not set' }); return }

    const contacts = await findKindProspects()

    if (contacts.length === 0) {
      res.json({ success: true, data: { found: 0, message: 'No new prospects found' } })
      return
    }

    const rows = contacts.slice(0, 20).map(c => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${c.first_name ?? ''} ${c.last_name ?? ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#555">${c.title ?? '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#555">${c.organization?.name ?? c.organization_name ?? '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#555">${c.country ?? '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">
          ${c.email ? `<a href="mailto:${c.email}" style="color:#7C3AED">${c.email}</a>` : '—'}
          ${c.linkedin_url ? ` · <a href="${c.linkedin_url}" style="color:#7C3AED">LinkedIn</a>` : ''}
        </td>
      </tr>`).join('')

    if (resend) {
      await resend.emails.send({
        from: FROM,
        to:   founderEmail,
        subject: `K.I.N.D outbound prospects — ${contacts.length} found — ${new Date().toLocaleDateString('en-ZA')}`,
        html: `
          <div style="font-family:sans-serif;max-width:700px;margin:0 auto;color:#111">
            <h2 style="margin-bottom:4px">K.I.N.D Outbound Prospects</h2>
            <p style="color:#888;font-size:0.85rem">Apollo search · ${new Date().toLocaleDateString('en-ZA')} · ${contacts.length} contacts found</p>
            <p style="color:#555;line-height:1.6">
              These are B2B founders and sales leaders at African SMEs who match K.I.N.D's own ICP.
              Top 20 shown below — enroll them into a FIGSY campaign for automated outreach.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden">
              <thead>
                <tr style="background:#f9fafb">
                  <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#888">Name</th>
                  <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#888">Title</th>
                  <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#888">Company</th>
                  <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#888">Country</th>
                  <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#888">Contact</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="color:#888;font-size:0.8rem;margin-top:24px">
              Go to admin → create a FIGSY campaign → enroll these contacts.
            </p>
          </div>`,
      })
    }

    res.json({ success: true, data: { found: contacts.length, emailed_to: founderEmail } })
  } catch (err) {
    console.error('[cmo/prospect]', err)
    res.status(500).json({ success: false, error: 'Outbound prospect run failed' })
  }
})

// ── FIGSY GLOBAL SEND-DUE ─────────────────────────────────────────────────────
// Call every 2 hours. Sends due FIGSY sequence emails across all active campaigns.
internalRouter.post('/figsy/send-due-all', async (_req: Request, res: Response) => {
  try {
    const dailyLimit = process.env.FIGSY_DAILY_SEND_LIMIT ? parseInt(process.env.FIGSY_DAILY_SEND_LIMIT, 10) : 200
    const todayUTC = new Date()
    todayUTC.setUTCHours(0, 0, 0, 0)

    const { count: sentToday } = await db.from('figsy_sent_emails')
      .select('id', { count: 'exact', head: true })
      .gte('sent_at', todayUTC.toISOString())

    const remaining = Math.max(0, dailyLimit - (sentToday ?? 0))
    if (remaining === 0) {
      res.json({ success: true, data: { sent: 0, capped: true, daily_limit: dailyLimit } })
      return
    }

    // Only send for ACTIVE campaigns — paused / archived / low-performance
    // campaigns must stop sending. Pull each active campaign's client + settings so
    // we can (a) enforce its per-campaign daily_send_limit and (b) spread the shared
    // budget FAIRLY across clients instead of letting one client's backlog drain it.
    const { data: activeCamps } = await db.from('figsy_campaigns')
      .select('id, client_id, settings')
      .eq('status', 'active')
    const activeCampaignIds = (activeCamps ?? []).map((c: { id: string }) => c.id)
    if (activeCampaignIds.length === 0) {
      res.json({ success: true, data: { sent: 0, no_active_campaigns: true } })
      return
    }

    // Per-campaign daily cap (#320): `settings.daily_send_limit` was written by the UI
    // + the auto-tuner but never read on the send path. A numeric value caps that
    // campaign's sends for the UTC day (0 = paused for today); null/absent = no
    // per-campaign cap (only the global cap applies).
    const campaignLimit = new Map<string, number | null>()
    for (const c of activeCamps ?? []) {
      const dl = (c as { settings?: { daily_send_limit?: unknown } | null }).settings?.daily_send_limit
      campaignLimit.set((c as { id: string }).id, typeof dl === 'number' && dl >= 0 ? dl : null)
    }

    // SEND WINDOW (settings.send_days / settings.send_hour_utc) — same bug class as the
    // per-campaign cap above: the UI has written these for months and NOTHING on the send
    // path ever read them, so a "Mon–Thu from 07:00" window was decorative. Now honoured.
    // Fails OPEN (no window, or one we can't parse, means send) — the kill-switch, the caps
    // and the approval queue are the real safety gates, and a garbled preference field must
    // never silently halt a client's outreach.
    const { withinSendWindow } = await import('../lib/campaign-settings')
    const windowNow = new Date()
    const outsideWindow = new Set<string>()
    for (const c of activeCamps ?? []) {
      const row = c as { id: string; settings?: unknown }
      if (!withinSendWindow(row.settings, windowNow)) outsideWindow.add(row.id)
    }

    // How many each campaign has ALREADY sent today, to enforce the per-campaign cap.
    const { data: sentRows } = await db.from('figsy_sent_emails')
      .select('campaign_id')
      .gte('sent_at', todayUTC.toISOString())
      .in('campaign_id', activeCampaignIds)
    const sentByCampaign = new Map<string, number>()
    for (const r of sentRows ?? []) {
      const cid = (r as { campaign_id: string | null }).campaign_id
      if (cid) sentByCampaign.set(cid, (sentByCampaign.get(cid) ?? 0) + 1)
    }

    // Pull a WIDE window of due enrollments (more than the global budget) so the fair
    // scheduler has candidates from every client to interleave, oldest-due first.
    // Capped so a huge backlog can't blow memory.
    const now = new Date().toISOString()
    const fetchCeil = Math.min(Math.max(remaining, 1) * 5, 2000)
    const { data: due } = await db.from('figsy_enrollments')
      .select('*, leads(id,first_name,last_name,email,job_title,company,industry,seniority,country,tech_stack,score,score_reasoning)')
      .in('status', ['enrolled', 'in_progress'])
      .in('campaign_id', activeCampaignIds)
      .lte('next_send_at', now)
      .order('next_send_at', { ascending: true })
      .limit(fetchCeil)

    // FAIR ORDER (#320): group due enrollments by client, then interleave round-robin —
    // every client's Nth email is only reached after every client's (N-1)th. So a
    // client with 500 due leads can't send its 3rd before another client with 5 due
    // gets its 1st. Prevents one backlog starving everyone under the shared cap.
    const dueRows = due ?? []
    const byClient = new Map<string, typeof dueRows>()
    for (const e of dueRows) {
      const cid = ((e as { client_id?: string | null }).client_id) ?? 'unknown'
      if (!byClient.has(cid)) byClient.set(cid, [])
      byClient.get(cid)!.push(e)
    }
    const clientQueues = [...byClient.values()]
    const maxLen = clientQueues.reduce((m, q) => Math.max(m, q.length), 0)
    const fairOrder: typeof dueRows = []
    for (let i = 0; i < maxLen; i++) {
      for (const q of clientQueues) {
        if (i < q.length) fairOrder.push(q[i])
      }
    }

    const { sendSequenceEmail, applyReplyBranching, enrollmentStep } = await import('../lib/figsy')

    const stepsCache = new Map<string, { step: number; on_reply?: 'stop' | 'skip_next' | 'continue' }[] | null>()
    let sent = 0
    let campaignCappedSkips = 0
    let windowSkips = 0
    for (const enrollment of fairOrder) {
      if (sent >= remaining) break   // shared daily budget spent
      const lead = Array.isArray(enrollment.leads) ? enrollment.leads[0] : enrollment.leads
      if (!lead?.email) continue
      // #212 — walk the full ≤10-step sequence via enrollmentStep (jsonb `steps`,
      // else legacy step1-3 columns). null = past the last usable step (skip).
      const nextStep = enrollment.current_step + 1
      const stepView = enrollmentStep(enrollment, nextStep)
      if (!stepView) continue

      // Per-campaign daily cap — skip if this campaign hit its own limit today.
      const campId = enrollment.campaign_id as string
      const capForCampaign = campaignLimit.get(campId)
      if (capForCampaign != null && (sentByCampaign.get(campId) ?? 0) >= capForCampaign) {
        campaignCappedSkips++
        continue
      }

      // Outside this campaign's configured send window — leave it due and pick it up on the
      // next run inside the window. Nothing is lost: next_send_at is untouched.
      if (outsideWindow.has(campId)) { windowSkips++; continue }

      // Honour the step's on_reply setting if the lead has replied since last send
      try {
        if (await applyReplyBranching(enrollment, stepsCache) === 'skip') continue
      } catch (err) {
        console.error('[figsy/send-due-all] branching', enrollment.id, ':', err)
      }

      try {
        // #15 — count ONLY a real 'sent' against the shared daily budget and the
        // per-campaign tally. A co-pilot campaign's steps come back 'queued' (draft
        // enqueued for review, nothing sent) — if those burned budget slots, one
        // co-pilot campaign could eat the whole day's budget and starve every
        // auto-pilot campaign. Deferred/suppressed/failed likewise sent nothing.
        const outcome = await sendSequenceEmail(enrollment.id, lead, nextStep, stepView.subject, stepView.body, enrollment.campaign_id, { totalSteps: stepView.total, waitDaysNext: stepView.wait_days })
        if (outcome === 'sent') {
          sent++
          sentByCampaign.set(campId, (sentByCampaign.get(campId) ?? 0) + 1)
        }
      } catch (err) {
        console.error('[figsy/send-due-all] enrollment', enrollment.id, ':', err)
      }
    }

    // window_skips is reported, not swallowed: "sent 0" with a window set must be
    // explainable, or it looks like the engine died.
    res.json({ success: true, data: { sent, remaining_today: remaining - sent, daily_limit: dailyLimit, clients_served: byClient.size, campaign_capped_skips: campaignCappedSkips, window_skips: windowSkips, campaigns_outside_window: outsideWindow.size } })
  } catch (err) {
    console.error('[figsy/send-due-all]', err)
    res.status(500).json({ success: false, error: 'FIGSY send-due-all failed' })
  }
})

// ── FIGSY CHECK PERFORMANCE ──────────────────────────────────────────────────
// Pause active campaigns whose reply rate has dropped below 1%.
internalRouter.post('/figsy/check-performance', async (_req: Request, res: Response) => {
  try {
    // Don't judge a campaign's reply rate until BOTH: (a) the full 3-step sequence
    // has had time to fire (step 3 = day 9) and replies a chance to land (~day 10+),
    // and (b) there's enough volume for <1% to be a real signal, not noise. A young
    // or warming campaign with 0 replies is EXPECTED — auto-pausing it (e.g. the
    // warmup campaign at day 3) wrongly halts domain warming. Raised from 20 → 50
    // emails + a 10-day age gate after that exact false-pause hit the live warmup.
    const MIN_EMAILS = 50
    const MIN_AGE_DAYS = 10
    const { data: campaigns } = await db.from('figsy_campaigns')
      .select('id, client_id, name, status, leads_enrolled, emails_sent, replies_total, replies_interested, opted_out, created_at')
      .eq('status', 'active')
      .gt('leads_enrolled', 0)
      .gte('emails_sent', MIN_EMAILS)

    const paused: { id: string; name: string; client_id: string; reply_rate: number }[] = []

    for (const campaign of campaigns ?? []) {
      // Age gate — skip campaigns younger than the full sequence + reply window.
      const ageDays = (Date.now() - new Date(campaign.created_at as string).getTime()) / 86_400_000
      if (ageDays < MIN_AGE_DAYS) continue

      // Reconcile from source before deciding — a drifted replies_total (the known
      // failure mode is drift DOWN to 0) would otherwise auto-pause a healthy campaign.
      const fresh = await recomputeCampaignCounters(campaign.id)
      const repliesTotal = fresh?.replies_total ?? campaign.replies_total
      const emailsSent   = fresh?.emails_sent   ?? campaign.emails_sent
      const replyRate = emailsSent > 0 ? repliesTotal / emailsSent : 0
      if (emailsSent >= MIN_EMAILS && replyRate < 0.01) {
        await db.from('figsy_campaigns')
          .update({ status: 'paused_low_performance' })
          .eq('id', campaign.id)
        paused.push({ id: campaign.id, name: campaign.name, client_id: campaign.client_id, reply_rate: replyRate })
        console.log(`[figsy/check-performance] paused campaign ${campaign.id} (${campaign.name}) — reply rate ${(replyRate * 100).toFixed(2)}%`)

        // Notify the client their campaign was auto-paused (best-effort — never block the loop)
        try {
          const { data: client } = await db.from('clients')
            .select('company_name, user_id').eq('id', campaign.client_id).maybeSingle()
          if (client?.user_id) {
            const { data: { user } } = await db.auth.admin.getUserById(client.user_id)
            if (user?.email) {
              await sendCampaignPausedEmail(user.email, client.company_name ?? '', campaign.name, replyRate)
            }
          }
        } catch (emailErr) {
          console.error('[figsy/check-performance] pause email failed for', campaign.id, emailErr)
        }
      }
    }

    res.json({ success: true, data: { checked: (campaigns ?? []).length, paused: paused.length, campaigns: paused } })
  } catch (err) {
    console.error('[figsy/check-performance]', err)
    res.status(500).json({ success: false, error: 'FIGSY performance check failed' })
  }
})

// ── FIGSY MEMORY REFRESH (ALL CLIENTS) ───────────────────────────────────────
// Call after each campaign analysis cycle to keep FIGSY agent memory current.
internalRouter.post('/figsy/refresh-memory-all', async (_req: Request, res: Response) => {
  try {
    const { data: clients, error: clientsError } = await db.from('clients').select('id')
    if (clientsError) throw clientsError

    let updated = 0

    for (const client of clients ?? []) {
      try {
        const { data: campaigns } = await db.from('figsy_campaigns')
          .select('emails_sent, replies_total, replies_interested')
          .eq('client_id', client.id)
          .gt('emails_sent', 0)

        const rows = campaigns ?? []
        const total_sent_all_time    = rows.reduce((sum, c) => sum + (c.emails_sent   ?? 0), 0)
        const total_replies_all_time = rows.reduce((sum, c) => sum + (c.replies_total ?? 0), 0)
        const avg_reply_rate_30d     = rows.length > 0
          ? rows.reduce((sum, c) => sum + ((c.replies_total ?? 0) / (c.emails_sent ?? 1)), 0) / rows.length
          : 0

        // P2-1: build 3-type memory model — episodic + longterm + preference
        const { data: recentReplies } = await db.from('figsy_replies')
          .select('classification, received_at')
          .eq('client_id', client.id)
          .gte('received_at', new Date(Date.now() - 14 * 86400000).toISOString())

        const episodicReplies = recentReplies ?? []
        const episodicTotal = episodicReplies.length
        const hotRecent = episodicReplies.filter(r => r.classification === 'hot').length
        const recent_reply_rate = episodicTotal > 0 ? hotRecent / episodicTotal : 0

        const { data: topSubjects } = await db.from('figsy_sent_emails')
          .select('subject')
          .eq('client_id', client.id)
          .not('opened_at', 'is', null)
          .limit(50)
        const subjectFreq: Record<string, number> = {}
        for (const s of topSubjects ?? []) {
          if (s.subject) subjectFreq[s.subject] = (subjectFreq[s.subject] ?? 0) + 1
        }
        const best_subject_lines = Object.entries(subjectFreq)
          .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s)

        const { error: upsertError } = await db.from('figsy_memory')
          .upsert({
            client_id:             client.id,
            best_subject_lines,
            avg_reply_rate_30d,
            total_sent_all_time,
            total_replies_all_time,
            last_updated:          new Date().toISOString(),
            episodic_memory:       { recent_reply_rate, recent_total: episodicTotal, window_days: 14 },
            longterm_memory:       { best_subject_lines, total_campaigns: rows.length },
            preference_memory:     { preferred_tone: 'direct and concise', avoid_phrases: ['hope this finds you', 'touch base', 'synergy'] },
          }, { onConflict: 'client_id' })

        if (!upsertError) updated++
      } catch (err) {
        console.error(`[figsy/refresh-memory-all] failed for client ${client.id}:`, err)
      }
    }

    res.json({ success: true, data: { updated } })
  } catch (err) {
    console.error('[figsy/refresh-memory-all]', err)
    res.status(500).json({ success: false, error: 'FIGSY memory refresh failed' })
  }
})

// ── INT-11 — ZERO CREDITS WARNING ────────────────────────────────────────────
// Call daily. Warns clients with zero credit balance.
internalRouter.post('/ae/zero-credits', async (_req: Request, res: Response) => {
  try {
    // #480 (Fable verify) — this handler stamps low_credit_warned_at AFTER the send; if
    // only the sender were gated, a suppressed send would still stamp → the warning is
    // lost for up to 7 days after re-enabling. Gate the whole handler like its siblings.
    if (!lifecycleEmailsEnabled()) { res.json({ success: true, data: { skipped: true, reason: 'LIFECYCLE_EMAILS_ENABLED=false' } }); return }

    const now = new Date()

    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id, credit_balance, first_icp_run_at')
      .eq('credit_balance', 0)
      .not('first_icp_run_at', 'is', null)
      .not('user_id', 'is', null)

    let sent = 0

    for (const client of clients ?? []) {
      try {
        // Find when credits last hit zero (the last time money left the wallet).
        //
        // This filtered on type='deduction', which NOTHING in the codebase has ever
        // written — so the query always came back empty, the `continue` below always fired,
        // and this cron has never sent a single email. A dead feature that looked alive.
        // The real spend types are the ONE WALLET ones.
        const { data: lastTx } = await db.from('credit_transactions')
          .select('created_at')
          .eq('client_id', client.id)
          .in('type', ['wallet_charge', 'usage', 'consumed'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!lastTx?.created_at) continue

        const daysAtZero = Math.floor((now.getTime() - new Date(lastTx.created_at).getTime()) / 86400000)
        if (![1, 4, 7].includes(daysAtZero)) continue

        const { data: { user } } = await db.auth.admin.getUserById(client.user_id!)
        const email = user?.email
        if (!email) continue

        await sendZeroCreditsWarning(email, client.company_name ?? '', daysAtZero)
        sent++
      } catch (err) {
        console.error(`[zero-credits] failed for client ${client.id}:`, err)
      }
    }

    // ── #337② — FIGSY low-credit warning sweep ────────────────────────────────
    // FIGSY-plan clients still selling but running low (1–5 credits). Warn once,
    // then re-warn at most every 7 days (low_credit_warned_at).
    let lowSent = 0
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
    const { data: lowClients } = await db.from('clients')
      .select('id, company_name, user_id, figsy_credits_remaining, low_credit_warned_at')
      .eq('plan', 'figsy')
      .gte('figsy_credits_remaining', 1)
      .lte('figsy_credits_remaining', 5)
      .not('user_id', 'is', null)

    for (const client of lowClients ?? []) {
      try {
        if (client.low_credit_warned_at && client.low_credit_warned_at > sevenDaysAgo) continue

        const { data: { user } } = await db.auth.admin.getUserById(client.user_id!)
        const email = user?.email
        if (!email) continue

        await sendLowCreditsWarning(email, client.company_name ?? '', client.figsy_credits_remaining ?? 0)
        await db.from('clients').update({ low_credit_warned_at: now.toISOString() }).eq('id', client.id)
        lowSent++
      } catch (err) {
        console.error(`[low-credits-figsy] failed for client ${client.id}:`, err)
      }
    }

    res.json({ success: true, data: { sent, low_credits_sent: lowSent } })
  } catch (err) {
    console.error('[zero-credits]', err)
    res.status(500).json({ success: false, error: 'Zero-credits run failed' })
  }
})

// ── FIGSY AUTO-REPLENISH ──────────────────────────────────────────────────────
// Call daily. For clients with active campaigns running low on enrollments,
// surface a notification so they can top up. Also auto-refreshes FIGSY Memory.
internalRouter.post('/figsy/auto-replenish', async (_req: Request, res: Response) => {
  try {
    const founderEmail = process.env.FOUNDER_EMAIL

    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id, credit_balance, first_icp_run_at')
      .not('first_icp_run_at', 'is', null)
      .gt('credit_balance', 0)

    const alerts: { client_id: string; company_name: string; enrollments_remaining: number }[] = []

    for (const client of clients ?? []) {
      const { count: activeEnrollments } = await db.from('figsy_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .in('status', ['enrolled', 'in_progress'])

      const remaining = activeEnrollments ?? 0

      if (remaining < 5 && remaining >= 0) {
        alerts.push({
          client_id:            client.id,
          company_name:         client.company_name ?? '—',
          enrollments_remaining: remaining,
        })
      }
    }

    if (alerts.length > 0 && founderEmail && resend) {
      const rows = alerts.map(a =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${a.company_name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#d97706">${a.enrollments_remaining} left</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">
            <a href="https://admin.get-kind.com" style="color:#7C3AED;font-size:0.8rem">Review →</a>
          </td>
        </tr>`
      ).join('')

      await resend.emails.send({
        from: FROM,
        to:   founderEmail,
        subject: `FIGSY pipeline alert — ${alerts.length} client${alerts.length > 1 ? 's' : ''} running low on enrollments`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
            <h2>FIGSY Pipeline Alert</h2>
            <p style="color:#555">${alerts.length} client${alerts.length > 1 ? 's are' : ' is'} running low on active enrollments. FIGSY will run dry without replenishment.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px">
              <thead>
                <tr style="background:#fafafa">
                  <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#888">Client</th>
                  <th style="padding:10px 12px;text-align:left;font-size:0.8rem;color:#888">Active enrollments</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`,
      })
    }

    res.json({ success: true, data: { checked: (clients ?? []).length, alerts: alerts.length, clients: alerts } })
  } catch (err) {
    console.error('[figsy/auto-replenish]', err)
    res.status(500).json({ success: false, error: 'FIGSY auto-replenish check failed' })
  }
})

// ── MILLA MORNING BRIEF ───────────────────────────────────────────────────────
// Call daily 07:30 UTC. Sends each active client a brief morning intelligence
// summary: pipeline value, reply rate vs benchmark, leads added today, active campaigns.
internalRouter.post('/milla/morning-brief-all', async (_req: Request, res: Response) => {
  try {
    // #480 — client lifecycle cron: skip entirely when the master switch is off, so
    // no nudge fires AND no 'notified' state is stamped (it re-fires when re-enabled).
    if (!lifecycleEmailsEnabled()) { res.json({ success: true, data: { skipped: true, reason: 'LIFECYCLE_EMAILS_ENABLED=false' } }); return }
    const now       = new Date()
    const todayUTC  = new Date(now)
    todayUTC.setUTCHours(0, 0, 0, 0)
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString()

    // Milla is a paid product — only brief clients with an ACTIVE Milla sub.
    // (Previously this emailed every client, leaking the $49/mo value + spam.)
    const { data: millaSubs } = await db.from('subscriptions')
      .select('client_id').eq('product', 'virtual_assistant').eq('status', 'active')
    const millaClientIds = new Set((millaSubs ?? []).map((s: { client_id: string }) => s.client_id))

    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id, daily_brief_enabled')
      .not('user_id', 'is', null)
      .neq('is_demo', true)   // R1: never email synthetic demo mailboxes — they hard-bounce

    let sent = 0

    for (const client of clients ?? []) {
      if (!millaClientIds.has(client.id)) continue
      // R2 (#27): respect the client's opt-out from Settings → Notifications.
      if ((client as { daily_brief_enabled?: boolean | null }).daily_brief_enabled === false) continue
      try {
        const { data: { user } } = await db.auth.admin.getUserById(client.user_id!)
        const email = user?.email
        if (!email) continue

        const briefCampFilter = await clientCampaignFilter(client.id)
        const [
          { count: totalLeads },
          { count: newToday },
          { count: activeCampaigns },
          { count: emailsThisWeek },
          { count: repliesThisWeek },
          { count: interestedThisWeek },
          { data: topScored },
        ] = await Promise.all([
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('created_at', todayUTC.toISOString()),
          db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'active'),
          db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', briefCampFilter).gte('sent_at', weekStart),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('received_at', weekStart),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).in('classification', ['hot', 'interested']).gte('received_at', weekStart),
          db.from('leads').select('first_name, last_name, job_title, company, score').eq('client_id', client.id).not('score', 'is', null).order('score', { ascending: false }).limit(3),
        ])

        const replyRatePct = (emailsThisWeek ?? 0) > 0
          ? ((repliesThisWeek ?? 0) / (emailsThisWeek ?? 1) * 100).toFixed(1)
          : '—'

        const topLeadsHtml = (topScored ?? []).length > 0
          ? `<p style="margin:0 0 8px;font-size:0.8rem;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em">Top leads right now</p>` +
            (topScored ?? []).map((l: any) =>
              `<div style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:0.85rem">
                <strong>${l.first_name} ${l.last_name}</strong> · ${l.job_title ?? '—'} at ${l.company ?? '—'}
                <span style="margin-left:8px;background:#f0f7ff;color:#7C3AED;font-size:0.75rem;font-weight:700;padding:2px 8px;border-radius:100px">Score ${l.score}</span>
              </div>`
            ).join('')
          : ''

        if (resend && isRealRecipient(email)) {
          const dayStr = now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
          await resend.emails.send({
            from: FROM,
            to:   email,
            subject: `Milla's morning brief — ${dayStr}`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
                <p style="color:#888;font-size:0.78rem;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em">Milla · Business Intelligence</p>
                <h2 style="margin-top:0">Good morning${client.company_name ? `, ${client.company_name}` : ''}.</h2>
                <p style="color:#555;line-height:1.7">Here's your pipeline intelligence for ${dayStr}.</p>

                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;margin-bottom:24px">
                  <tr>
                    <td align="center" style="padding:16px 12px">
                      <p style="margin:0;font-size:1.4rem;font-weight:800;color:#111">${totalLeads ?? 0}</p>
                      <p style="margin:2px 0 0;font-size:0.7rem;color:#888;text-transform:uppercase">Total leads</p>
                    </td>
                    <td align="center" style="padding:16px 12px;border-left:1px solid #ebebeb">
                      <p style="margin:0;font-size:1.4rem;font-weight:800;color:#059669">+${newToday ?? 0}</p>
                      <p style="margin:2px 0 0;font-size:0.7rem;color:#888;text-transform:uppercase">Added today</p>
                    </td>
                    <td align="center" style="padding:16px 12px;border-left:1px solid #ebebeb">
                      <p style="margin:0;font-size:1.4rem;font-weight:800;color:#7C3AED">${activeCampaigns ?? 0}</p>
                      <p style="margin:2px 0 0;font-size:0.7rem;color:#888;text-transform:uppercase">Active campaigns</p>
                    </td>
                    <td align="center" style="padding:16px 12px;border-left:1px solid #ebebeb">
                      <p style="margin:0;font-size:1.4rem;font-weight:800;color:#7c3aed">${replyRatePct}%</p>
                      <p style="margin:2px 0 0;font-size:0.7rem;color:#888;text-transform:uppercase">Reply rate (7d)</p>
                    </td>
                  </tr>
                </table>

                ${interestedThisWeek && (interestedThisWeek ?? 0) > 0
                  ? `<div style="background:#f0fdf4;border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:14px 18px;margin-bottom:16px">
                      <p style="margin:0;font-size:0.9rem;color:#059669"><strong>${interestedThisWeek} interested ${(interestedThisWeek ?? 0) === 1 ? 'reply' : 'replies'}</strong> this week. FIGSY is tracking ${(interestedThisWeek ?? 0) === 1 ? 'it' : 'them'} — check your dashboard for the latest.</p>
                    </div>`
                  : ''}

                ${topLeadsHtml}

                <a href="https://app.get-kind.com/dashboard"
                   style="display:inline-block;margin-top:20px;background:#0a0a0a;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;font-size:0.85rem">
                  Open dashboard →
                </a>
                <p style="color:#bbb;font-size:0.75rem;margin-top:20px">
                  Milla · K.I.N.D Business Intelligence · <a href="https://app.get-kind.com/settings" style="color:#bbb">Manage notifications</a>
                </p>
              </div>`,
          })
          sent++
        }
      } catch (err) {
        console.error(`[milla/morning-brief] failed for client ${client.id}:`, err)
      }
    }

    res.json({ success: true, data: { sent } })
  } catch (err) {
    console.error('[milla/morning-brief-all]', err)
    res.status(500).json({ success: false, error: 'Milla morning brief failed' })
  }
})

// ── MILLA ANOMALY CHECK ───────────────────────────────────────────────────────
// Call daily. Detects significant metric changes and alerts clients proactively.
// Signals: reply rate drop >30%, interested reply spike, no emails sent in 48h on active campaign.
internalRouter.post('/milla/check-anomalies', async (_req: Request, res: Response) => {
  try {
    // #480 — client lifecycle cron: skip entirely when the master switch is off, so
    // no nudge fires AND no 'notified' state is stamped (it re-fires when re-enabled).
    if (!lifecycleEmailsEnabled()) { res.json({ success: true, data: { skipped: true, reason: 'LIFECYCLE_EMAILS_ENABLED=false' } }); return }
    const now      = new Date()
    const prev7d   = new Date(now.getTime() - 7  * 86400000).toISOString()
    const prev14d  = new Date(now.getTime() - 14 * 86400000).toISOString()
    const last48h  = new Date(now.getTime() - 2  * 86400000).toISOString()

    // Milla is a paid product — only alert clients with an ACTIVE Milla sub.
    const { data: millaSubs } = await db.from('subscriptions')
      .select('client_id').eq('product', 'virtual_assistant').eq('status', 'active')
    const millaClientIds = new Set((millaSubs ?? []).map((s: { client_id: string }) => s.client_id))

    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id')
      .not('user_id', 'is', null)
      .neq('is_demo', true)   // R1: never email synthetic demo mailboxes — they hard-bounce

    let alertsSent = 0

    for (const client of clients ?? []) {
      if (!millaClientIds.has(client.id)) continue
      try {
        const { data: { user } } = await db.auth.admin.getUserById(client.user_id!)
        const email = user?.email
        if (!email) continue

        const anomCampFilter = await clientCampaignFilter(client.id)
        const [
          { count: sent7d },  { count: replied7d },  { count: interested7d },
          { count: sent14d }, { count: replied14d },
          { count: activeCampaigns },
          { count: sentLast48h },
        ] = await Promise.all([
          db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', anomCampFilter).gte('sent_at', prev7d),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('received_at', prev7d),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).in('classification', ['hot', 'interested']).gte('received_at', prev7d),
          db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', anomCampFilter).gte('sent_at', prev14d).lt('sent_at', prev7d),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('received_at', prev14d).lt('received_at', prev7d),
          db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'active'),
          db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', anomCampFilter).gte('sent_at', last48h),
        ])

        const anomalies: string[] = []

        // Reply rate drop
        const rate7d  = (sent7d  ?? 0) > 0 ? (replied7d  ?? 0) / (sent7d  ?? 1) : null
        const rate14d = (sent14d ?? 0) > 0 ? (replied14d ?? 0) / (sent14d ?? 1) : null
        if (rate7d !== null && rate14d !== null && rate14d > 0) {
          const drop = (rate14d - rate7d) / rate14d
          if (drop > 0.3) {
            anomalies.push(`Reply rate dropped ${Math.round(drop * 100)}% vs last week (${(rate7d * 100).toFixed(1)}% this week vs ${(rate14d * 100).toFixed(1)}% prior week).`)
          }
        }

        // Interested reply spike
        if ((interested7d ?? 0) >= 3) {
          anomalies.push(`${interested7d} interested replies this week — your hottest leads. Check your dashboard now.`)
        }

        // Active campaign stalled
        if ((activeCampaigns ?? 0) > 0 && (sentLast48h ?? 0) === 0) {
          anomalies.push(`FIGSY has active campaigns but no emails sent in 48 hours. Check your campaign status and credit balance.`)
        }

        if (anomalies.length === 0 || !resend || !isRealRecipient(email)) continue

        await resend.emails.send({
          from: FROM,
          to:   email,
          subject: `Milla spotted something — ${anomalies.length} signal${anomalies.length > 1 ? 's' : ''} in your pipeline`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
              <p style="color:#888;font-size:0.78rem;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em">Milla · Proactive Intelligence</p>
              <h2 style="margin-top:0">I spotted ${anomalies.length > 1 ? 'a few things' : 'something'} in your pipeline.</h2>
              ${anomalies.map(a => `
                <div style="background:#fafafa;border-left:3px solid #7C3AED;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:12px">
                  <p style="margin:0;font-size:0.9rem;color:#333;line-height:1.6">${a}</p>
                </div>`).join('')}
              <a href="https://app.get-kind.com/dashboard"
                 style="display:inline-block;margin-top:16px;background:#0a0a0a;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;font-size:0.85rem">
                Open dashboard →
              </a>
              <p style="color:#bbb;font-size:0.75rem;margin-top:20px">Milla · K.I.N.D Business Intelligence</p>
            </div>`,
        })
        alertsSent++
      } catch (err) {
        console.error(`[milla/check-anomalies] failed for client ${client.id}:`, err)
      }
    }

    res.json({ success: true, data: { clients_checked: (clients ?? []).length, alerts_sent: alertsSent } })
  } catch (err) {
    console.error('[milla/check-anomalies]', err)
    res.status(500).json({ success: false, error: 'Milla anomaly check failed' })
  }
})

// ── CMO: KIND SELF-OUTREACH CAMPAIGN ─────────────────────────────────────────
// Finds K.I.N.D's own ideal prospects via Apollo and auto-enrolls them in FIGSY.
// Requires FIGSY_KIND_CLIENT_ID env var — the client_id of K.I.N.D in the system.
// Finds up to 20 net-new prospects per run. Skips anyone already in the pipeline.
// Schedule: POST /internal/cmo/self-outreach (call weekly via cron)
internalRouter.post('/cmo/self-outreach', async (_req: Request, res: Response) => {
  try {
    // #481 — DORMANT-SAFE. This job SOURCES (spends PDL) then ENROLS + sends. Gate the
    // WHOLE job on the same kill-switch the send path uses, checked BEFORE any sourcing,
    // so nothing spends PDL or enrols while we're building dark. autoEnrollLead also
    // re-checks the switch before charging, but that's downstream of the PDL spend — this
    // top gate is what keeps sourcing itself dormant until AUTO_OUTREACH_ENABLED (Day 14).
    if (process.env.AUTO_OUTREACH_ENABLED !== 'true') {
      res.json({ success: true, data: { found: 0, enrolled: 0, skipped: 0, message: 'Self-outreach dormant — AUTO_OUTREACH_ENABLED is off (no sourcing, no sends).' } })
      return
    }

    const kindClientId = process.env.FIGSY_KIND_CLIENT_ID
    const founderEmail = process.env.FOUNDER_EMAIL
    if (!kindClientId) {
      res.status(422).json({ success: false, error: 'FIGSY_KIND_CLIENT_ID not set. Add K.I.N.D\'s own client_id to env.' })
      return
    }

    const contacts = await findKindProspects()
    if (contacts.length === 0) {
      res.json({ success: true, data: { found: 0, enrolled: 0, message: 'No new prospects found' } })
      return
    }

    const { autoEnrollLead } = await import('../lib/figsy')
    let enrolled = 0
    let skipped  = 0

    for (const contact of contacts.slice(0, 20)) {
      if (!contact.email) { skipped++; continue }
      // #375 (AR-38) — never insert/charge/cold-email an Apollo placeholder address.
      if (isPlaceholderEmail(contact.email)) { skipped++; continue }

      // Skip if already in pipeline
      const { count: existing } = await db.from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', kindClientId)
        .eq('email', contact.email)
      if ((existing ?? 0) > 0) { skipped++; continue }

      // Check opt-out blocklist
      const { data: blocked } = await db.from('opt_out_blocklist')
        .select('id').eq('email', contact.email).is('opted_back_in_at', null).maybeSingle()
      if (blocked) { skipped++; continue }

      try {
        // Insert lead into K.I.N.D's pipeline
        const { data: lead, error: leadError } = await db.from('leads').insert({
          client_id:  kindClientId,
          first_name: contact.first_name ?? '',
          last_name:  contact.last_name  ?? '',
          email:      contact.email,
          job_title:  contact.title      ?? null,
          company:    contact.organization?.name ?? (contact as any).organization_name ?? null,
          industry:   (contact as any).industry ?? null,
          country:    contact.country    ?? null,
          status:     'new',
          score:      70, // default score for ICP-matched outbound
          score_reasoning: 'PDL/ICP match — K.I.N.D self-outreach',
        }).select('id').single()

        if (leadError || !lead) continue

        await autoEnrollLead(lead.id, kindClientId)
        enrolled++
      } catch (err) {
        console.error('[cmo/self-outreach] failed for', contact.email, err)
        skipped++
      }
    }

    // Notify founder
    if (founderEmail && resend && enrolled > 0) {
      await resend.emails.send({
        from: FROM,
        to:   founderEmail,
        subject: `FIGSY self-outreach — ${enrolled} new K.I.N.D prospects enrolled`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
            <h2>K.I.N.D Self-Outreach Update</h2>
            <p style="color:#555;line-height:1.7">
              FIGSY just enrolled <strong>${enrolled} new prospects</strong> into K.I.N.D's own outreach pipeline.<br/>
              Skipped ${skipped} (already in pipeline or no email).
            </p>
            <p style="color:#555;line-height:1.7">FIGSY is now sending personalised sequences to each of them automatically. You'll get replies in your inbox.</p>
            <a href="https://admin.get-kind.com"
               style="display:inline-block;margin-top:12px;background:#7C3AED;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;font-size:0.85rem">
              View in admin →
            </a>
          </div>`,
      })
    }

    res.json({ success: true, data: { found: contacts.length, enrolled, skipped } })
  } catch (err) {
    console.error('[cmo/self-outreach]', err)
    res.status(500).json({ success: false, error: 'K.I.N.D self-outreach failed' })
  }
})

// ── LOW CREDIT WARNING — fires daily, warns clients with 1–4 credits remaining ──
internalRouter.post('/ae/low-credits', async (_req: Request, res: Response) => {
  try {
    // #480 — client lifecycle cron: skip entirely when the master switch is off, so
    // no nudge fires AND no 'notified' state is stamped (it re-fires when re-enabled).
    if (!lifecycleEmailsEnabled()) { res.json({ success: true, data: { skipped: true, reason: 'LIFECYCLE_EMAILS_ENABLED=false' } }); return }
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 86400000).toISOString()

    // Only clients who have used the platform (first ICP run done), have 1-4 credits,
    // and haven't been emailed about low credits in the past 24 hours
    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id, credit_balance, last_low_credit_email_at')
      .gt('credit_balance', 0)
      .lt('credit_balance', 5)
      .not('first_icp_run_at', 'is', null)
      .not('user_id', 'is', null)

    let sent = 0

    for (const client of clients ?? []) {
      try {
        // Don't spam — max once per 24 hours
        if (client.last_low_credit_email_at && client.last_low_credit_email_at > oneDayAgo) continue

        const { data: { user } } = await db.auth.admin.getUserById(client.user_id!)
        const email = user?.email
        if (!email || !resend) continue

        await resend.emails.send({
          from: FROM,
          to: email,
          subject: `Low credits — ${client.credit_balance} credit${client.credit_balance === 1 ? '' : 's'} remaining`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
              <h2>You're running low on credits</h2>
              <p style="color:#555;line-height:1.7">
                Hi ${client.company_name ?? 'there'},<br/><br/>
                You have <strong>${client.credit_balance} lead credit${client.credit_balance === 1 ? '' : 's'}</strong> remaining.
                Top up now to keep your ICP running and leads flowing.
              </p>
              <a href="${process.env.PORTAL_URL || 'https://app.get-kind.com'}/dashboard/billing"
                 style="display:inline-block;margin-top:12px;background:#7C3AED;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;font-size:0.85rem">
                Top up credits →
              </a>
              <p style="color:#9ca3af;font-size:0.8rem;margin-top:24px">K.I.N.D · <a href="https://get-kind.com" style="color:#9ca3af">get-kind.com</a></p>
            </div>`,
        })

        await db.from('clients')
          .update({ last_low_credit_email_at: now.toISOString() })
          .eq('id', client.id)

        sent++
      } catch (err) {
        console.error(`[low-credits] failed for client ${client.id}:`, err)
      }
    }

    res.json({ success: true, data: { sent } })
  } catch (err) {
    console.error('[low-credits]', err)
    res.status(500).json({ success: false, error: 'Low-credits run failed' })
  }
})

// ── LEAD DRIP DELIVERY — fires daily, delivers up to daily_drip_rate leads per client ──
// Credits are deducted HERE (at delivery), not at insertion.
// ── THE $99 CHASE — remind a client whose ICP is sitting dormant ──────────────────────
// ⚑ flow v2 (step 2): "push reminders to an unpaid client — the push table exists, nothing
// uses it." A client who approved their ICP and then didn't pay has told us exactly what
// they want and is one step from getting it, and we were saying nothing.
//
// Deliberately restrained: reminders on day 1, 3 and 7 after they approved their targeting,
// then we stop and it becomes a human call (their mobile is captured at sign-up now). A
// daily push until they pay is how an app gets muted.
internalRouter.post('/clients/chase-unpaid', async (_req: Request, res: Response) => {
  try {
    const { PAID_TX_TYPES } = await import('../lib/onboarding-pack')
    const { sendPushToClient } = await import('../lib/push')
    const REMIND_ON_DAYS = [1, 3, 7]

    // Everyone with an approved ICP...
    const { data: icpRows } = await db.from('icps')
      .select('client_id, created_at').eq('is_active', true).limit(5000)
    const icpByClient = new Map<string, string>()
    for (const r of (icpRows ?? []) as Array<{ client_id: string; created_at: string }>) {
      const prev = icpByClient.get(r.client_id)
      if (!prev || r.created_at < prev) icpByClient.set(r.client_id, r.created_at)  // their FIRST ICP
    }
    if (icpByClient.size === 0) { res.json({ success: true, reminded: 0 }); return }

    // ...minus everyone who has already paid.
    const ids = [...icpByClient.keys()]
    const { data: paidRows } = await db.from('credit_transactions')
      .select('client_id').in('client_id', ids).in('type', PAID_TX_TYPES)
    const paid = new Set((paidRows ?? []).map((r: { client_id: string }) => r.client_id))

    const now = Date.now()
    let reminded = 0
    for (const [cid, at] of icpByClient) {
      if (paid.has(cid)) continue
      const days = Math.floor((now - new Date(at).getTime()) / 86_400_000)
      if (!REMIND_ON_DAYS.includes(days)) continue
      await sendPushToClient(cid, {
        title: days >= 7 ? 'Your people are waiting' : 'One step left',
        body: days >= 7
          ? "Your targeting is ready and nothing has started. $99 gets your sender and your first 100 approved leads."
          : "Your targeting is approved — go live for $99 and we'll start finding your people today.",
        url: '/milla/billing?start=1',
      }).catch(() => {})
      reminded++
    }

    res.json({ success: true, checked: icpByClient.size, reminded })
  } catch (err) {
    console.error('[clients/chase-unpaid]', err)
    res.status(500).json({ success: false, error: 'Chase run failed' })
  }
})

// ── COLD CLIENTS — 30 DAYS WITHOUT AN APPROVAL, WE SUSPEND ────────────────────────────
// Founder-locked 25 Jul: "we're not a free service. a client needs to be working with us or
// we freeze their inbox." Their sender costs us ~$40/month from the day they sign and keeps
// costing whether they approve anybody or not.
//
// Suspending = pausing their ACTIVE campaigns. Nothing further sends. It is reversible by
// the client themselves: approving anyone puts them back (see the reactivation in
// approve-lead's caller below), their leads keep waiting, their pack is untouched.
//
// Warned a week out so it is never a surprise. Called daily by cron; safe to run repeatedly —
// a client with no active campaigns is already suspended and is skipped silently.
internalRouter.post('/clients/cold-check', async (_req: Request, res: Response) => {
  try {
    const { coldState, suspensionMessage, COLD_DAYS } = await import('../lib/cold-client')
    const { sendFounderAlert } = await import('../lib/alerts')
    const { PAID_TX_TYPES } = await import('../lib/onboarding-pack')

    // Only clients who have PAID — an unpaid client has no sender to freeze and is chased
    // in a different place (the $99 prompt at step 2). Paged for the same reason as above:
    // a truncated window here means a client we ARE carrying an inbox for is never checked.
    const { paidClientIds } = await import('../lib/page-rows')
    const { ids: paidSet } = await paidClientIds(PAID_TX_TYPES)
    const paidIds = [...paidSet]
    if (paidIds.length === 0) { res.json({ success: true, checked: 0, warned: 0, suspended: 0 }); return }

    const { data: clients } = await db.from('clients')
      .select('id, company_name, is_demo').in('id', paidIds)

    const now = new Date()
    let warned = 0, suspended = 0
    for (const c of (clients ?? []) as Array<Record<string, unknown>>) {
      const cid = c.id as string
      if (c.is_demo === true) continue                       // demos are ours, not theirs

      // Their last approval IS the newest revealed lead — no column to keep in sync.
      const { data: last } = await db.from('leads')
        .select('revealed_at').eq('client_id', cid).not('revealed_at', 'is', null)
        .order('revealed_at', { ascending: false }).limit(1).maybeSingle()
      const state = coldState((last?.revealed_at as string | null) ?? null, now)
      if (state.neverStarted) continue

      if (state.cold) {
        const { data: paused } = await db.from('figsy_campaigns')
          .update({ status: 'paused' }).eq('client_id', cid).eq('status', 'active').select('id')
        if ((paused ?? []).length === 0) continue            // already suspended — say nothing
        suspended++
        console.log(`[cold-check] suspended ${c.company_name ?? cid} — ${state.daysIdle} days idle`)
        void sendFounderAlert('churn_risk', `Suspended — ${c.company_name ?? 'a client'} has gone quiet`, [
          `No approvals in ${state.daysIdle} days, so their campaigns are paused.`,
          `We were keeping a warmed sender running the whole time — that is roughly $${Math.round(40 * (state.daysIdle! / 30))} of inbox we carried.`,
          'They come straight back the moment they approve anyone. Worth a call before that.',
          suspensionMessage(c.company_name as string | null),
        ]).catch(() => {})
      } else if (state.warn) {
        warned++
        void sendFounderAlert('churn_risk', `Going quiet — ${c.company_name ?? 'a client'}`, [
          `${state.daysIdle} days since their last approval. We suspend at ${COLD_DAYS}.`,
          'A nudge now is cheaper than a restart later.',
        ]).catch(() => {})
      }
    }

    res.json({ success: true, checked: (clients ?? []).length, warned, suspended })
  } catch (err) {
    console.error('[clients/cold-check]', err)
    res.status(500).json({ success: false, error: 'Cold check failed' })
  }
})

// ── FLOW V2 · NIGHTLY SOURCING TOP-UP ─────────────────────────────────────────────────
// The $99 buys 200 sourced people so the client can approve 100 after passing on roughly
// half. try_spend_sourcing caps a client at 100 RECORDS PER DAY (v_daily_cap in
// 20260711_sourcing_fences.sql), so payment day can only ever deliver 100 — the other 100
// has to arrive the next day or the client is choosing from a list with no choice in it.
//
// This is that second half. startWorkForClient tops UP to the target rather than adding a
// batch, so a client already at 200 costs one count query and nothing else. Every real
// spend still passes the same fences: the money gate, the client's own allowance
// (2 records per $1 they paid), the daily cap and the global monthly ceiling.
//
// Called daily by cron. Safe to run repeatedly.
internalRouter.post('/leads/top-up', async (_req: Request, res: Response) => {
  try {
    const { PAID_TX_TYPES, PACK_SOURCE_TARGET } = await import('../lib/onboarding-pack')
    const { startWorkForClient } = await import('../lib/start-work')

    // Only clients who have paid AND still have allowance to spend — anyone else would
    // burn a round trip to be refused by the fence.
    //
    // Paged, not `.limit(20000)`. This asks a question about CLIENTS from a table of
    // TRANSACTIONS, and an active client generates many rows — so a fixed window let a busy
    // client crowd a quiet one out entirely, and that client then never got topped up.
    const { paidClientIds } = await import('../lib/page-rows')
    const { ids: paidSet } = await paidClientIds(PAID_TX_TYPES)
    const paidIds = [...paidSet]
    if (paidIds.length === 0) { res.json({ success: true, checked: 0, topped_up: 0 }); return }

    const { data: clients } = await db.from('clients')
      .select('id, company_name, sourcing_allowance, is_demo').in('id', paidIds)

    let toppedUp = 0, sourced = 0, surfaced = 0
    for (const c of (clients ?? []) as Array<Record<string, unknown>>) {
      const cid = c.id as string
      if (c.is_demo === true) continue                       // demos never spend PDL
      if (((c.sourcing_allowance as number | null) ?? 0) <= 0) continue

      const { count: have } = await db.from('leads')
        .select('id', { count: 'exact', head: true }).eq('client_id', cid).neq('status', 'passed')
      if ((have ?? 0) >= PACK_SOURCE_TARGET) continue

      const r = await startWorkForClient(cid)                // never throws
      if (r.sourced > 0 || r.surfaced > 0) {
        toppedUp++; sourced += r.sourced; surfaced += r.surfaced
        console.log(`[leads/top-up] ${c.company_name ?? cid}: sourced ${r.sourced}, surfaced ${r.surfaced}`)
      }
    }

    res.json({ success: true, checked: (clients ?? []).length, topped_up: toppedUp, sourced, surfaced })
  } catch (err) {
    console.error('[leads/top-up]', err)
    res.status(500).json({ success: false, error: 'Top-up run failed' })
  }
})

internalRouter.post('/leads/drip', async (_req: Request, res: Response) => {
  try {
    // Get all active clients with undelivered leads
    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id, daily_drip_rate, plan, credit_balance, figsy_credits_remaining')
      .not('first_icp_run_at', 'is', null)

    let totalDelivered = 0

    for (const client of clients ?? []) {
      try {
        const drip = client.daily_drip_rate ?? 5
        // Cap by the wallet that matches the client's plan (item 167) — pure rule.
        const balance = deliveryCapBalance(normalizePlan(client.plan), client.credit_balance, client.figsy_credits_remaining)

        // Can't deliver leads to a client with no credits in the relevant pool
        if (balance < 1) continue

        // ── #331 — cap the free-leads drip (FIGSY plan only; lead_gen untouched) ──
        if (normalizePlan(client.plan) === 'figsy') {
          // (a) THE TRIAL-EXPIRED-UNCONVERTED HALT WAS RETIRED HERE (#607, 1 Aug).
          //
          // It read the client's subscriptions and continued only on an ACTIVE sub, a
          // still-in-period `trialing` sub, or a past FIGSY purchase. Removed for two
          // reasons, and the second is the one that matters:
          //
          //   1. Its premise is gone. It existed to stop free TRIAL credits dripping leads
          //      forever. Since 24 Jul a signup gets a $0 wallet and $0 sourcing (see
          //      routes/auth.ts) — and `if (balance < 1) continue` on the line above already
          //      refuses every unfunded client. With no freebies, a balance above zero means
          //      someone paid or an operator deliberately comped them.
          //
          //   2. KEEPING IT WOULD HAVE BROKEN CLIENT ZERO. Our own house client (#600) is
          //      comped by an operator so sourcing is not refused — it never buys anything,
          //      so `hasPurchased` is false and `hasActive` is false. Its only qualifying
          //      condition was the 14-day `trialing` row this change stops writing. Retire
          //      the trial and leave this block, and our own outreach silently stops
          //      dripping — on day 15 for the existing house client, immediately for a new
          //      one. A halt whose last remaining branch is the thing being deleted is not a
          //      safety net; it is a trap that springs a fortnight later.
          //
          // The wallet is the gate, and it is one line up. (b) below is independent of any of
          // this — it bounds free (delivered-but-never-enrolled) leads against the balance.

          // (b) 3× free-leads cap: never let delivered-but-never-enrolled (free) leads
          // run more than 3× the client's current FIGSY balance ahead. A delivered
          // lead with no figsy_enrollments row for this client is a free lead.
          const [deliveredRes, enrolledRows] = await Promise.all([
            db.from('leads').select('id', { count: 'exact', head: true })
              .eq('client_id', client.id).not('delivered_at', 'is', null),
            db.from('figsy_enrollments').select('lead_id')
              .eq('client_id', client.id),
          ])
          // P14 — count DISTINCT enrolled leads. A lead enrolled in 2 campaigns has 2
          // figsy_enrollments rows; a raw row count would over-count enrollments and
          // under-count free leads (a delivered lead is "free" only if it has NO
          // enrollment at all, regardless of how many campaigns it's in).
          const deliveredCount = deliveredRes.count ?? 0
          const enrolledCount = new Set((enrolledRows.data ?? []).map((r: { lead_id: string }) => r.lead_id)).size
          const freeLeads = Math.max(0, deliveredCount - enrolledCount)
          if (freeLeads >= 3 * balance) {
            console.log(`[leads/drip] skip client ${client.id} — free-leads cap hit (${freeLeads} delivered-unenrolled ≥ 3× ${balance} FIGSY credits)`)
            continue
          }
        }

        // Deliver up to min(drip_rate, pool balance) leads
        const toDeliver = Math.min(drip, balance)

        // Find undelivered leads for this client, oldest first
        const { data: pending } = await db.from('leads')
          .select('id')
          .eq('client_id', client.id)
          .is('delivered_at', null)
          .order('created_at', { ascending: true })
          .limit(toDeliver)

        if (!pending || pending.length === 0) continue

        const candidateIds = pending.map((l: { id: string }) => l.id)

        // enrichAndDeliverLeads reveals each lead's email (Apollo search returns
        // none), then atomically delivers + charges only the emailable ones — a
        // lead we can't get an email for is never charged. Idempotent: the
        // `.is('delivered_at', null)` claim inside prevents double-delivery across
        // concurrent/retried drip runs.
        const claimedCount = await enrichAndDeliverLeads(client.id, candidateIds)
        if (claimedCount === 0) continue

        totalDelivered += claimedCount
      } catch (err) {
        console.error(`[leads/drip] failed for client ${client.id}:`, err)
      }
    }

    res.json({ success: true, data: { clients_processed: (clients ?? []).length, total_delivered: totalDelivered } })
  } catch (err) {
    console.error('[leads/drip]', err)
    res.status(500).json({ success: false, error: 'Lead drip failed' })
  }
})

// ── FOUNDER MORNING BRIEF — daily 07:00 SAST (05:00 UTC) platform digest ────────
internalRouter.post('/founder-brief', async (_req: Request, res: Response) => {
  try {
    const founderEmail = process.env.FOUNDER_EMAIL || 'hello@get-kind.com'
    const now     = new Date()
    const ago24h  = new Date(now.getTime() - 86400000).toISOString()
    const dateStr = now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const [
      totalClientsRes,
      newClientsRes,
      totalLeadsRes,
      newLeadsRes,
      figsySentRes,
      figsyRepliesRes,
      figsyInterestedRes,
      figsyOptOutsRes,
      activeCampaignsRes,
      creditPurchasesRes,
      lowCreditClientsRes,
      expiredSubsRes,
    ] = await Promise.allSettled([
      db.from('clients').select('id', { count: 'exact', head: true }),
      db.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', ago24h),
      db.from('leads').select('id', { count: 'exact', head: true }),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', ago24h),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).gte('sent_at', ago24h),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).gte('received_at', ago24h),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).in('classification', ['hot', 'interested']).gte('received_at', ago24h),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('classification', 'opt_out').gte('received_at', ago24h),
      db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('credit_transactions').select('client_id, amount').eq('type', 'purchase').gte('created_at', ago24h),
      db.from('clients').select('id, company_name, credit_balance').lt('credit_balance', 5).not('first_icp_run_at', 'is', null),
      db.from('subscriptions').select('id, client_id, product, clients(company_name)').eq('status', 'lapsed').gte('updated_at', ago24h),
    ])

    const val = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
      r.status === 'fulfilled' ? r.value : fallback

    const totalClients     = val(totalClientsRes, { count: 0 } as any).count ?? 0
    const newClients       = val(newClientsRes,   { count: 0 } as any).count ?? 0
    const totalLeads       = val(totalLeadsRes,   { count: 0 } as any).count ?? 0
    const newLeads         = val(newLeadsRes,      { count: 0 } as any).count ?? 0
    const figsySent        = val(figsySentRes,     { count: 0 } as any).count ?? 0
    const figsyReplies     = val(figsyRepliesRes,  { count: 0 } as any).count ?? 0
    const figsyInterested  = val(figsyInterestedRes, { count: 0 } as any).count ?? 0
    const figsyOptOuts     = val(figsyOptOutsRes,  { count: 0 } as any).count ?? 0
    const activeCampaigns  = val(activeCampaignsRes, { count: 0 } as any).count ?? 0
    const purchaseTxns     = val(creditPurchasesRes, { data: [] } as any).data ?? []
    const lowCreditClients = val(lowCreditClientsRes, { data: [] } as any).data ?? []
    const expiredSubs      = val(expiredSubsRes, { data: [] } as any).data ?? []

    // Revenue-honesty: "Revenue (last 24h)" counts only real paying clients — drop
    // purchases from demo + house (founder testing) accounts.
    const digestExclusions = await getClientExclusions()
    const revenueToday = (purchaseTxns as { client_id: string; amount: number }[])
      .filter((t) => !digestExclusions.excludedClientIds.has(t.client_id))
      .reduce((s, t) => s + (t.amount ?? 0), 0)
    const replyRatePct = figsySent > 0 ? ((figsyReplies / figsySent) * 100).toFixed(1) : '—'

    // ── Low-credit clients list ──────────────────────────────────────────────
    const lowCreditRows = (lowCreditClients as { id: string; company_name: string | null; credit_balance: number }[])
      .map(c => `
        <tr>
          <td style="padding:7px 14px;border-bottom:1px solid #1e2030;color:#e2e8f0;font-size:0.85rem">${c.company_name ?? '—'}</td>
          <td style="padding:7px 14px;border-bottom:1px solid #1e2030;color:#f59e0b;font-size:0.85rem;font-weight:700">${c.credit_balance} credits</td>
        </tr>`).join('')

    // ── Expired subscriptions list ──────────────────────────────────────────
    const expiredSubRows = (expiredSubs as { id: string; product: string | null; clients: { company_name: string | null } | { company_name: string | null }[] | null }[])
      .map(s => {
        const client = Array.isArray(s.clients) ? s.clients[0] : s.clients
        return `
        <tr>
          <td style="padding:7px 14px;border-bottom:1px solid #1e2030;color:#e2e8f0;font-size:0.85rem">${client?.company_name ?? '—'}</td>
          <td style="padding:7px 14px;border-bottom:1px solid #1e2030;color:#f87171;font-size:0.85rem">${s.product ?? '—'} lapsed</td>
        </tr>`
      }).join('')

    const alertsSection = (lowCreditRows || expiredSubRows)
      ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px">
        <thead>
          <tr style="background:#1e2030">
            <th style="padding:8px 14px;text-align:left;font-size:0.75rem;color:#6366f1;letter-spacing:0.06em;text-transform:uppercase">Client</th>
            <th style="padding:8px 14px;text-align:left;font-size:0.75rem;color:#6366f1;letter-spacing:0.06em;text-transform:uppercase">Issue</th>
          </tr>
        </thead>
        <tbody>
          ${lowCreditRows}
          ${expiredSubRows}
        </tbody>
      </table>`
      : `<p style="color:#64748b;font-size:0.85rem;margin:0;padding:12px 0">No active alerts — all systems healthy.</p>`

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#070b12;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);border-radius:14px 14px 0 0;padding:28px 32px 24px">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.65);font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase">K.I.N.D Platform Intelligence</p>
      <h1 style="margin:0;color:#fff;font-size:1.5rem;font-weight:700;line-height:1.2">Good morning ☀️</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:0.9rem">${dateStr}</p>
    </div>

    <!-- Platform Health -->
    <div style="background:#0f1117;border-left:1px solid #1e2030;border-right:1px solid #1e2030;padding:24px 32px 20px">
      <p style="margin:0 0 14px;font-size:0.7rem;font-weight:700;color:#6366f1;letter-spacing:0.12em;text-transform:uppercase">🧠 Platform Health</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#161b27;border-radius:10px;overflow:hidden;margin-bottom:4px">
        <tr>
          <td align="center" style="padding:18px 12px;border-right:1px solid #1e2030">
            <p style="margin:0;font-size:1.6rem;font-weight:800;color:#fff">${totalClients.toLocaleString()}</p>
            <p style="margin:3px 0 0;font-size:0.7rem;color:#64748b;text-transform:uppercase">Total clients</p>
            ${newClients > 0 ? `<p style="margin:4px 0 0;font-size:0.75rem;color:#34d399;font-weight:600">+${newClients} today</p>` : ''}
          </td>
          <td align="center" style="padding:18px 12px">
            <p style="margin:0;font-size:1.6rem;font-weight:800;color:#fff">${totalLeads.toLocaleString()}</p>
            <p style="margin:3px 0 0;font-size:0.7rem;color:#64748b;text-transform:uppercase">Total leads</p>
            ${newLeads > 0 ? `<p style="margin:4px 0 0;font-size:0.75rem;color:#34d399;font-weight:600">+${newLeads} today</p>` : ''}
          </td>
        </tr>
      </table>
    </div>

    <!-- FIGSY Performance -->
    <div style="background:#0f1117;border-left:1px solid #1e2030;border-right:1px solid #1e2030;padding:20px 32px">
      <p style="margin:0 0 14px;font-size:0.7rem;font-weight:700;color:#6366f1;letter-spacing:0.12em;text-transform:uppercase">📧 FIGSY Performance (last 24h)</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#161b27;border-radius:10px;overflow:hidden;margin-bottom:4px">
        <tr>
          <td align="center" style="padding:16px 8px;border-right:1px solid #1e2030">
            <p style="margin:0;font-size:1.3rem;font-weight:700;color:#fff">${figsySent.toLocaleString()}</p>
            <p style="margin:3px 0 0;font-size:0.68rem;color:#64748b;text-transform:uppercase">Sent</p>
          </td>
          <td align="center" style="padding:16px 8px;border-right:1px solid #1e2030">
            <p style="margin:0;font-size:1.3rem;font-weight:700;color:#fff">${figsyReplies.toLocaleString()}</p>
            <p style="margin:3px 0 0;font-size:0.68rem;color:#64748b;text-transform:uppercase">Replies</p>
          </td>
          <td align="center" style="padding:16px 8px;border-right:1px solid #1e2030">
            <p style="margin:0;font-size:1.3rem;font-weight:700;color:#6366f1">${replyRatePct}%</p>
            <p style="margin:3px 0 0;font-size:0.68rem;color:#64748b;text-transform:uppercase">Reply rate</p>
          </td>
          <td align="center" style="padding:16px 8px;border-right:1px solid #1e2030">
            <p style="margin:0;font-size:1.3rem;font-weight:700;color:#34d399">${figsyInterested.toLocaleString()}</p>
            <p style="margin:3px 0 0;font-size:0.68rem;color:#64748b;text-transform:uppercase">Interested</p>
          </td>
          <td align="center" style="padding:16px 8px">
            <p style="margin:0;font-size:1.3rem;font-weight:700;color:#f87171">${figsyOptOuts.toLocaleString()}</p>
            <p style="margin:3px 0 0;font-size:0.68rem;color:#64748b;text-transform:uppercase">Opt-outs</p>
          </td>
        </tr>
      </table>
      <p style="margin:10px 0 0;font-size:0.8rem;color:#475569">${activeCampaigns} active campaign${activeCampaigns !== 1 ? 's' : ''} running</p>
    </div>

    <!-- Revenue -->
    <div style="background:#0f1117;border-left:1px solid #1e2030;border-right:1px solid #1e2030;padding:20px 32px">
      <p style="margin:0 0 14px;font-size:0.7rem;font-weight:700;color:#6366f1;letter-spacing:0.12em;text-transform:uppercase">💰 Revenue (last 24h)</p>
      <div style="background:#161b27;border-radius:10px;padding:18px 22px;display:flex;align-items:center">
        <p style="margin:0;font-size:1.8rem;font-weight:800;color:${revenueToday > 0 ? '#34d399' : '#64748b'}">${revenueToday > 0 ? `R${revenueToday.toLocaleString()}` : 'R0'}</p>
        <p style="margin:0 0 0 14px;font-size:0.8rem;color:#64748b">credits purchased today<br/>${purchaseTxns.length} transaction${purchaseTxns.length !== 1 ? 's' : ''}</p>
      </div>
    </div>

    <!-- Alerts -->
    <div style="background:#0f1117;border-left:1px solid #1e2030;border-right:1px solid #1e2030;padding:20px 32px">
      <p style="margin:0 0 14px;font-size:0.7rem;font-weight:700;color:#f59e0b;letter-spacing:0.12em;text-transform:uppercase">⚠️ Alerts</p>
      <div style="background:#161b27;border-radius:10px;overflow:hidden">
        ${alertsSection}
      </div>
    </div>

    <!-- Today's Priority -->
    <div style="background:#0f1117;border:1px solid #1e2030;border-top:none;border-radius:0 0 14px 14px;padding:20px 32px 28px">
      <p style="margin:0 0 14px;font-size:0.7rem;font-weight:700;color:#6366f1;letter-spacing:0.12em;text-transform:uppercase">📋 Today's Priority</p>
      <div style="background:#161b27;border-radius:10px;padding:16px 20px">
        <p style="margin:0 0 8px;color:#e2e8f0;font-size:0.875rem;line-height:1.6">1. Apollo upgrade → leads live.</p>
        <p style="margin:0 0 8px;color:#e2e8f0;font-size:0.875rem;line-height:1.6">2. Check Railway deploy.</p>
        <p style="margin:0;color:#e2e8f0;font-size:0.875rem;line-height:1.6">3. HubSpot setup.</p>
      </div>
    </div>

    <!-- Footer -->
    <p style="margin:20px 0 0;text-align:center;color:#334155;font-size:0.75rem">
      K.I.N.D · Founder Morning Brief · <a href="https://admin.get-kind.com" style="color:#6366f1;text-decoration:none">admin.get-kind.com</a>
    </p>

  </div>
</body>
</html>`

    const stats = {
      total_clients:     totalClients,
      new_clients_24h:   newClients,
      total_leads:       totalLeads,
      new_leads_24h:     newLeads,
      figsy_sent_24h:    figsySent,
      figsy_replies_24h: figsyReplies,
      figsy_reply_rate:  replyRatePct,
      figsy_interested_24h: figsyInterested,
      figsy_opt_outs_24h:   figsyOptOuts,
      active_campaigns:  activeCampaigns,
      revenue_today:     revenueToday,
      low_credit_clients: (lowCreditClients as any[]).length,
      expired_subs_24h:  (expiredSubs as any[]).length,
    }

    if (resend) {
      await resend.emails.send({
        from: FROM,
        to:   founderEmail,
        subject: `☀️ KIND Morning Brief — ${dateStr}`,
        html,
      })
    }

    res.json({ success: true, stats })
  } catch (err) {
    console.error('[founder-brief]', err)
    res.status(500).json({ success: false, error: 'Founder morning brief failed' })
  }
})

// ── SUBSCRIPTION LAPSE CHECK — fires daily, marks overdue active subscriptions as lapsed ──
internalRouter.post('/subscriptions/check-lapsed', async (_req: Request, res: Response) => {
  try {
    // #342 — THE EMAIL SWITCH NO LONGER GATES THE BILLING DECISION.
    //
    // This handler used to return early on `!lifecycleEmailsEnabled()`, exactly like the six
    // other lifecycle crons. For those it is right — they only send mail. This one CHANGES
    // BILLING STATE, so turning off marketing email silently switched off billing
    // enforcement, and nothing said so. The lapse now always runs; only the notification is
    // gated, at the point the notification is sent.
    const now = new Date()
    const nowIso = now.toISOString()

    // #342 — READ, DECIDE, THEN WRITE. This was a single blind bulk update:
    //
    //   .update({ status: 'lapsed' }).eq('status','active').lt('current_period_end', now)
    //
    // Two defects in one statement. `lapsed` is not in the production `subscription_status`
    // enum, so Postgres rejected the whole thing and the route 500'd EVERY DAY since it was
    // written — no subscription was ever lapsed, and an unpaid client kept access forever.
    // And had it succeeded it would have locked out Stripe-managed subscriptions on the
    // strength of `current_period_end`, a column only our own webhook handler writes: one
    // missed `customer.subscription.updated` and a paying client is locked out using our
    // bookkeeping error as the evidence. See lib/subscription-lapse.ts.
    const { data: candidates, error: readErr } = await db.from('subscriptions')
      .select('id, client_id, product, status, current_period_end, stripe_subscription_id')
      .eq('status', 'active')
      .lt('current_period_end', nowIso)

    if (readErr) throw readErr

    const toLapse: LapseCandidate[] = []
    const webhookSuspects: LapseCandidate[] = []
    for (const c of (candidates ?? []) as LapseCandidate[]) {
      const d = decideLapse(c, now)
      if (d.lapse) toLapse.push(c)
      else if (d.webhookSuspect) webhookSuspects.push(c)
    }

    // Stripe subscriptions drifting far past the period end we hold are a MISSED WEBHOOK,
    // not an unpaid client. Say that, rather than locking anyone out over it.
    if (webhookSuspects.length > 0) {
      console.warn(`[subscriptions/lapsed] ${webhookSuspects.length} Stripe sub(s) stale past period end — not lapsed`)
      void sendFounderAlert('charge_failed', 'Stripe subscriptions look stale — we may be missing webhooks', webhookSuspectLines(webhookSuspects))
    }

    const lapsed: { id: string; client_id: string; product: string }[] = []
    for (const sub of toLapse) {
      // Write the honest value; fall back to one the enum definitely holds if it is rejected.
      // Both deny access, so the account locks either way — this only decides how precisely
      // the reason is recorded (#340's pattern, and #342 is why the pattern exists).
      let { error: wErr } = await db.from('subscriptions').update({ status: LAPSED_STATUS }).eq('id', sub.id)
      if (wErr && isEnumRejection(wErr)) {
        const retry = await db.from('subscriptions').update({ status: LAPSED_FALLBACK }).eq('id', sub.id)
        wErr = retry.error
        console.error(`[subscriptions/lapsed] enum rejected "${LAPSED_STATUS}" — stored "${LAPSED_FALLBACK}" for ${sub.id}`)
        void sendFounderAlert('charge_failed', 'Subscription enum is missing "lapsed" — run the migration', [
          `The lapse cron could not write "${LAPSED_STATUS}"; it stored "${LAPSED_FALLBACK}" instead, which also denies access.`,
          'Fix: Vida → Engine → run the pending migrations (20260727_subscription_lapsed).',
        ])
      }
      if (wErr) {
        // One failed row must not abandon the rest — that is how a single bad row used to
        // take the whole run down with it.
        console.error(`[subscriptions/lapsed] could not lapse ${sub.id}:`, wErr.message)
        continue
      }
      lapsed.push({ id: sub.id, client_id: sub.client_id, product: sub.product })
    }

    // For each lapsed subscription, notify the client — THIS is what the lifecycle switch
    // controls, and only this.
    for (const sub of lapsed) {
      if (!lifecycleEmailsEnabled()) break
      try {
        const { data: client } = await db.from('clients')
          .select('user_id, company_name').eq('id', sub.client_id).single()
        if (!client?.user_id || !resend) continue

        const { data: { user } } = await db.auth.admin.getUserById(client.user_id)
        const email = user?.email
        if (!email) continue

        const productLabel = sub.product === 'virtual_assistant' ? 'Milla' : sub.product === 'chatbot' ? 'Vida' : sub.product

        await resend.emails.send({
          from: FROM,
          to: email,
          subject: `Your ${productLabel} subscription has lapsed`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
              <h2>Your ${productLabel} subscription has lapsed</h2>
              <p style="color:#555;line-height:1.7">
                Hi ${client.company_name ?? 'there'},<br/><br/>
                Your <strong>${productLabel}</strong> subscription couldn't be renewed. Access has been paused.
                Renew now to restore access.
              </p>
              <a href="${process.env.PORTAL_URL || 'https://app.get-kind.com'}/dashboard/billing"
                 style="display:inline-block;margin-top:12px;background:#7C3AED;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;font-size:0.85rem">
                Renew subscription →
              </a>
            </div>`,
        })
      } catch (err) {
        console.error(`[subscriptions/lapsed] notify failed for sub ${(sub as { id: string }).id}:`, err)
      }
    }

    res.json({
      success: true,
      data: {
        lapsed: lapsed.length,
        considered: (candidates ?? []).length,
        stripeStale: webhookSuspects.length,
        emailsSent: lifecycleEmailsEnabled(),
      },
    })
  } catch (err) {
    // #342 — this route 500'd every day for months and nobody knew: the cron logs the
    // failure and dead-letters it, but nothing ever put it in front of a human. A billing
    // enforcement job that has silently stopped working is exactly the thing that must not
    // wait to be noticed.
    console.error('[subscriptions/check-lapsed]', err)
    void sendFounderAlert('charge_failed', 'The subscription lapse check is failing', [
      `The daily lapse cron errored: ${err instanceof Error ? err.message : String(err)}`,
      'While it fails, hand-granted subscriptions never expire — clients keep access past their paid period.',
      'This job silently 500\'d every day before #342 for exactly this reason.',
    ])
    res.status(500).json({ success: false, error: 'Subscription lapse check failed' })
  }
})

// ── FIGSY ADAPTIVE SEND VOLUME ────────────────────────────────────────────────
// Called daily at 09:30 UTC by cron. Checks each active campaign's opt-out and
// reply rates, then auto-adjusts daily_send_limit in settings JSONB to protect
// domain reputation.
internalRouter.post('/figsy/adaptive-send-check', async (_req: Request, res: Response) => {
  try {
    const { data: campaigns } = await db
      .from('figsy_campaigns')
      .select('id, client_id, emails_sent, opted_out, replies_total, settings')
      .eq('status', 'active')
      .gt('emails_sent', 20)

    const changes: { campaignId: string; oldLimit: number; newLimit: number; reason: string }[] = []
    let adjusted = 0

    for (const campaign of campaigns ?? []) {
      // Reconcile from source first — these counters drive send-volume throttling,
      // so a drifted opted_out/replies_total would mis-adjust the daily limit.
      const fresh = await recomputeCampaignCounters(campaign.id)
      const emailsSent   = fresh?.emails_sent   ?? campaign.emails_sent   ?? 0
      const optedOut     = fresh?.opted_out     ?? campaign.opted_out     ?? 0
      const repliesTotal = fresh?.replies_total ?? campaign.replies_total ?? 0
      const existing     = (campaign.settings ?? {}) as Record<string, unknown>
      const currentLimit = typeof existing.daily_send_limit === 'number' ? existing.daily_send_limit : 50

      const optOutRate = optedOut     / emailsSent
      const replyRate  = repliesTotal / emailsSent

      let newLimit  = currentLimit
      let reason    = ''

      if (optOutRate > 0.02) {
        newLimit = Math.max(10, Math.floor(currentLimit * 0.75))
        reason   = `opt-out rate ${(optOutRate * 100).toFixed(2)}% > 2% — reduced 25%`
      } else if (optOutRate > 0.01) {
        newLimit = Math.max(15, Math.floor(currentLimit * 0.90))
        reason   = `opt-out rate ${(optOutRate * 100).toFixed(2)}% > 1% — reduced 10%`
      } else if (optOutRate < 0.005 && replyRate > 0.01) {
        newLimit = Math.min(150, Math.floor(currentLimit * 1.10))
        reason   = `healthy (opt-out ${(optOutRate * 100).toFixed(2)}%, reply ${(replyRate * 100).toFixed(2)}%) — increased 10%`
      }

      if (newLimit !== currentLimit) {
        // #391 (AR-61) — merge ONLY daily_send_limit at the DB (atomic, against the
        // current row) instead of writing the whole settings blob back from a stale
        // read, which could clobber a concurrent UI save / resurrect a founder pause.
        // F3 (Fable audit) — check the returned { error }: supabase-js RPCs return their
        // error, they don't throw. If the RPC fails (or the migration isn't applied) we
        // must NOT report "adjusted" as though the write landed.
        const { error: mergeErr } = await db.rpc('figsy_merge_settings', {
          p_campaign_id: campaign.id,
          p_patch: { daily_send_limit: newLimit },
        })
        if (mergeErr) {
          console.error('[figsy/adaptive-send-check] figsy_merge_settings failed for', campaign.id, mergeErr)
          continue
        }

        changes.push({ campaignId: campaign.id, oldLimit: currentLimit, newLimit, reason })
        adjusted++
      }
    }

    res.json({ checked: (campaigns ?? []).length, adjusted, changes })
  } catch (err) {
    console.error('[figsy/adaptive-send-check]', err)
    res.status(500).json({ success: false, error: 'Adaptive send check failed' })
  }
})

// ── P2-3: A/Z SUBJECT LINE WINNER CHECK ───────────────────────────────────────
// Called daily by cron. Checks all active campaigns with ab_subject_b set.
// After 48h + ≥5 sends per variant, picks winner by open rate across all variants (A-E).
internalRouter.post('/figsy/ab-winner-check', async (_req: Request, res: Response) => {
  try {
    const { data: campaigns } = await db.from('figsy_campaigns')
      .select('id, settings, step1_subject')
      .eq('status', 'active')
      .not('settings->ab_subject_b', 'is', null)

    let checked = 0
    let resolved = 0

    for (const campaign of campaigns ?? []) {
      const settings = campaign.settings as Record<string, unknown> ?? {}
      if (settings.ab_test_resolved) continue

      checked++

      // Get all step-1 sent emails for this campaign
      const { data: sentEmails } = await db.from('figsy_sent_emails')
        .select('id, subject, opened_at, sent_at')
        .eq('campaign_id', campaign.id)
        .eq('step', 1)
        .order('sent_at', { ascending: true })

      if (!sentEmails || sentEmails.length < 10) continue

      // Need 48h since first send
      const firstSent = new Date(sentEmails[0].sent_at)
      if (Date.now() - firstSent.getTime() < 48 * 60 * 60 * 1000) continue

      // Build map of variant label -> subject string
      const variantSubjects: Record<string, string | null> = {
        b: settings.ab_subject_b as string | null,
        c: (settings.ab_subject_c as string | null) ?? null,
        d: (settings.ab_subject_d as string | null) ?? null,
        e: (settings.ab_subject_e as string | null) ?? null,
      }

      // Group emails by variant (emails NOT matching any named variant = variant A)
      const variantGroups: Record<string, typeof sentEmails> = { a: [] }
      for (const [label, subject] of Object.entries(variantSubjects)) {
        if (subject) variantGroups[label] = []
      }
      for (const email of sentEmails) {
        const matchedLabel = Object.entries(variantSubjects).find(([, s]) => s && s === email.subject)?.[0]
        if (matchedLabel) {
          variantGroups[matchedLabel].push(email)
        } else {
          variantGroups['a'].push(email)
        }
      }

      // Only proceed if variant A and at least one other variant have >= 5 sends
      const activeVariants = Object.entries(variantGroups).filter(([, emails]) => emails.length >= 5)
      if (activeVariants.length < 2) continue

      // #392 (AR-62) — never resolve on ZERO data. If open-tracking is unset (no
      // TRACKING_URL / pixel), every variant's open rate is 0 and the first one would
      // "win" at rate 0 > -1 — irreversibly (ab_test_resolved:true). Require a minimum
      // of real opens across the active variants before crowning a winner; otherwise
      // leave the test open so it resolves once tracking data actually accrues.
      const MIN_OPENS_TO_RESOLVE = 5
      const totalOpens = activeVariants.reduce(
        (sum, [, emails]) => sum + emails.filter(e => e.opened_at).length, 0,
      )
      if (totalOpens < MIN_OPENS_TO_RESOLVE) continue

      // Find winner by open rate
      let bestLabel = 'a'
      let bestRate = -1
      for (const [label, emails] of activeVariants) {
        const rate = emails.filter(e => e.opened_at).length / emails.length
        if (rate > bestRate) { bestRate = rate; bestLabel = label }
      }

      // #391 (AR-61) — merge only the A/B result keys atomically (see adaptive-send
      // above) instead of writing the whole settings blob back from a stale read.
      // F3 (Fable audit) — check the returned { error } so a failed merge isn't counted
      // as "resolved" (and the test stays open to resolve on a later run).
      const { error: abMergeErr } = await db.rpc('figsy_merge_settings', {
        p_campaign_id: campaign.id,
        p_patch: { ab_test_resolved: true, ab_test_winner: bestLabel },
      })
      if (abMergeErr) {
        console.error('[figsy/ab-winner-check] figsy_merge_settings failed for', campaign.id, abMergeErr)
        continue
      }

      resolved++
    }

    res.json({ success: true, data: { checked, resolved } })
  } catch (err) {
    console.error('[figsy/ab-winner-check]', err)
    res.status(500).json({ success: false, error: 'AB winner check failed' })
  }
})

// ── #358 (F4) — RE-SCORE STRANDED LEADS ───────────────────────────────────────
// When AI scoring returns no usable result, that batch is left UNSCORED (score null,
// score_reasoning 'SCORING_FAILED…') rather than faked as a real 50/$5000. But scoring
// only runs at sourcing time, so nothing re-scored them — "will retry" was aspirational.
// This sweep makes it true: find stranded leads, group by ICP, re-score each group
// (scoreLeadsForIcp re-marks them stranded + alerts again if the AI is still down, so
// it is safe to run repeatedly). Called hourly by cron.
internalRouter.post('/figsy/rescore-stranded', async (_req: Request, res: Response) => {
  try {
    const { data: stranded } = await db.from('leads')
      .select('id, icp_id')
      .is('score', null)
      .like('score_reasoning', 'SCORING_FAILED%')
      .not('icp_id', 'is', null)
      .limit(500)
    if (!stranded || stranded.length === 0) {
      res.json({ success: true, data: { rescored: 0, groups: 0 } }); return
    }

    const byIcp = new Map<string, string[]>()
    for (const l of stranded) {
      const icpId = (l as { icp_id: string }).icp_id
      if (!byIcp.has(icpId)) byIcp.set(icpId, [])
      byIcp.get(icpId)!.push((l as { id: string }).id)
    }

    let rescored = 0
    for (const [icpId, leadIds] of byIcp) {
      const { data: icp } = await db.from('icps')
        .select('client_id, job_titles, seniority_levels, industries, company_sizes, geographies, keywords')
        .eq('id', icpId).maybeSingle()
      if (!icp) continue
      const { data: client } = await db.from('clients')
        .select('company_name').eq('id', (icp as { client_id: string }).client_id).maybeSingle()
      await scoreLeadsForIcp(leadIds, icp as any, (client as { company_name?: string } | null)?.company_name ?? '', (icp as { client_id: string }).client_id)
      rescored += leadIds.length
    }
    res.json({ success: true, data: { rescored, groups: byIcp.size } })
  } catch (err) {
    console.error('[figsy/rescore-stranded]', err)
    res.status(500).json({ success: false, error: 'Re-score sweep failed' })
  }
})

// ── #511 NEXUS · recompute every client's learning profile (nightly) ────────────────
// Deterministic per-client aggregate (lib/nexus.computeNexusProfile) — fenced by client_id,
// no LLM, no money. Bounded by client count. Fail-soft per client so one bad client can't
// abort the sweep.
internalRouter.post('/nexus/recompute-all', async (_req: Request, res: Response) => {
  try {
    const { computeNexusProfile } = await import('../lib/nexus')
    const { data: clients } = await db.from('clients').select('id').limit(5000)
    let done = 0, failed = 0
    for (const c of (clients ?? []) as { id: string }[]) {
      try { await computeNexusProfile(c.id); done++ } catch (e) { failed++; console.error('[nexus/recompute] client failed', c.id, e instanceof Error ? e.message : e) }
    }
    res.json({ success: true, data: { clients: (clients ?? []).length, computed: done, failed } })
  } catch (err) {
    console.error('[nexus/recompute-all]', err)
    res.status(500).json({ success: false, error: 'Nexus recompute failed' })
  }
})

// ── ONE WALLET (24 Jul): the stale-hold sweep is RETIRED — there are no $3 holds to
// release. The $4 is final at approve; no TTL, no capture, no release. Endpoint removed;
// remove its cron schedule entry too (nothing to sweep). ────────────────────────────
internalRouter.post('/figsy/sweep-stale-holds', async (_req: Request, res: Response) => {
  res.json({ success: true, data: { retired: true, note: 'one-wallet model: no holds to sweep' } })
})

// ── HUBSPOT PIPELINE VIEW ─────────────────────────────────────────────────────
// Returns HubSpot deals grouped by stage. Protected by ADMIN_SECRET.
// Returns { connected: false } if HUBSPOT_API_KEY is not set.
internalRouter.get('/hubspot/pipeline', async (_req: Request, res: Response) => {
  if (!process.env.HUBSPOT_API_KEY) {
    res.json({ success: true, data: { connected: false } })
    return
  }
  try {
    const pipeline = await getHubspotPipelineView()
    if (!pipeline) {
      res.status(500).json({ success: false, error: 'Failed to fetch HubSpot pipeline' })
      return
    }
    res.json({ success: true, data: { connected: true, ...pipeline } })
  } catch (err) {
    console.error('[hubspot/pipeline]', err)
    res.status(500).json({ success: false, error: 'HubSpot pipeline fetch failed' })
  }
})

// P2-6: Intent signal triggers — detect buying signals and auto-enroll leads
// Signals: job_change (title contains new seniority keywords), funding (company_size grew),
// tech_stack_change (new tools added). Checks all active ICPs with intent_signal_enroll=true.
internalRouter.post('/figsy/check-intent-signals', async (_req: Request, res: Response) => {
  try {
    // Get all active clients with at least one active campaign that has intent signal enrollment enabled
    const { data: campaigns } = await db.from('figsy_campaigns')
      .select('id, client_id, icp_id, settings')
      .eq('status', 'active')

    if (!campaigns?.length) { res.json({ success: true, data: { enrolled: 0 } }); return }

    let enrolled = 0
    let capped = 0

    // #374 (AR-37) — the triggers below are STATIC attributes (senior title, company
    // size), not real deltas, so a client's ENTIRE qualifying book would auto-enrol +
    // charge in a single run — an unbounded wallet drain + a mass cold-send. Bound each
    // run: at most INTENT_ENROLL_CAP_PER_CAMPAIGN new enrolments per campaign per run
    // (env-overridable). True delta detection needs a signal-source feed (follow-up).
    const INTENT_ENROLL_CAP_PER_CAMPAIGN = Math.max(
      1, parseInt(process.env.INTENT_ENROLL_CAP_PER_CAMPAIGN || '10', 10) || 10,
    )

    for (const campaign of campaigns) {
      const settings = campaign.settings as Record<string, unknown> ?? {}
      if (!settings.intent_signal_enroll) continue

      const signalTypes = (settings.intent_signal_types as string[] | undefined) ?? ['job_change', 'funding']
      let enrolledThisCampaign = 0

      // Find leads for this client/ICP that are scored but not yet enrolled
      // and were updated in the last 7 days (recently changed)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const query = db.from('leads')
        .select('id, first_name, last_name, job_title, company_size, tech_stack, score, status')
        .eq('client_id', campaign.client_id)
        .gte('score', 60)
        .in('status', ['scored', 'new'])
        .gte('updated_at', sevenDaysAgo)
        .is('opted_out_at', null)

      if (campaign.icp_id) query.eq('icp_id', campaign.icp_id)

      const { data: leads } = await query

      for (const lead of leads ?? []) {
        let triggered = false
        const triggerReasons: string[] = []

        if (signalTypes.includes('job_change') && lead.job_title) {
          const seniorityKws = ['cto', 'ceo', 'cfo', 'coo', 'vp', 'head of', 'director', 'founder', 'co-founder']
          if (seniorityKws.some(kw => lead.job_title!.toLowerCase().includes(kw))) {
            triggered = true
            triggerReasons.push('seniority_title')
          }
        }

        if (signalTypes.includes('funding') && lead.company_size) {
          // Signal: company_size recently moved to 51-200 or above (growth signal)
          if (['51-200', '201-1000', '1001+'].includes(lead.company_size)) {
            triggered = true
            triggerReasons.push('company_growth')
          }
        }

        if (!triggered) continue

        // #374 — stop this campaign once the per-run cap is hit (the rest wait for the
        // next run, so no single run can drain the wallet / cold-send the whole book).
        if (enrolledThisCampaign >= INTENT_ENROLL_CAP_PER_CAMPAIGN) { capped++; break }

        // Check not already enrolled in this campaign
        const { data: existing } = await db.from('figsy_enrollments')
          .select('id').eq('lead_id', lead.id).eq('campaign_id', campaign.id).maybeSingle()
        if (existing) continue

        // #337① — enroll through the CHARGED path. The old raw insert here created a
        // free "enrolled" row with no gate, no charge and no sequence — which then
        // permanently blocked paid re-enrollment of that lead (the idempotency guards
        // key on existence). autoEnrollLead gates on the FIGSY balance, charges one
        // credit (fail-closed) and writes a real sequence. Count is best-effort — it
        // no-ops silently when the balance is empty or the lead is already enrolled.
        const { autoEnrollLead } = await import('../lib/figsy')
        await autoEnrollLead(lead.id, campaign.client_id)
        enrolled++
        enrolledThisCampaign++
      }
    }

    res.json({ success: true, data: { enrolled, campaigns_capped: capped } })
  } catch (err) {
    console.error('[figsy/check-intent-signals]', err)
    res.status(500).json({ success: false, error: 'Intent signal check failed' })
  }
})

// P3-13: African data moat — aggregate anonymised lead outcomes into adm table
// Strips PII, stores country/industry/seniority/score/reply patterns
internalRouter.post('/data-moat/aggregate', async (_req: Request, res: Response) => {
  try {
    // Pull leads updated in the last 7 days with enough signal to be useful
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: leads, error } = await db.from('leads')
      .select('country, industry, seniority, company_size, job_title, score, status, icp_id')
      .gte('updated_at', sevenDaysAgo)
      .not('country', 'is', null)
      .gte('score', 40)
      .limit(500)

    if (error || !leads?.length) {
      res.json({ success: true, data: { inserted: 0 } }); return
    }

    const rows = leads.map(lead => ({
      country:    lead.country,
      industry:   lead.industry,
      seniority:  lead.seniority,
      company_size: lead.company_size,
      job_title:  lead.job_title,
      score:      lead.score,
      replied:    ['replied_positive', 'replied_neutral', 'replied_negative', 'meeting_booked'].includes(lead.status ?? ''),
      reply_type: lead.status?.startsWith('replied') ? lead.status.replace('replied_', '') : null,
      opened:     ['opened', 'replied_positive', 'replied_neutral', 'meeting_booked'].includes(lead.status ?? ''),
      meeting_booked: lead.status === 'meeting_booked',
      aggregated_at: new Date().toISOString(),
    }))

    const { error: insertErr } = await db.from('african_data_moat').insert(rows)
    if (insertErr) throw insertErr

    res.json({ success: true, data: { inserted: rows.length } })
  } catch (err) {
    console.error('[data-moat/aggregate]', err)
    res.status(500).json({ success: false, error: 'Aggregation failed' })
  }
})

// P3-13: Data moat stats — returns aggregate analytics for admin dashboard
internalRouter.get('/data-moat/stats', async (_req: Request, res: Response) => {
  try {
    const { count: total } = await db.from('african_data_moat').select('*', { count: 'exact', head: true })

    const { data: byCountry } = await db.from('african_data_moat')
      .select('country')
      .then(r => ({
        data: (r.data ?? []).reduce<Record<string, number>>((acc, row) => {
          acc[row.country] = (acc[row.country] ?? 0) + 1; return acc
        }, {})
      }))

    const { data: byIndustry } = await db.from('african_data_moat')
      .select('industry')
      .not('industry', 'is', null)
      .then(r => ({
        data: (r.data ?? []).reduce<Record<string, number>>((acc, row) => {
          const k = row.industry ?? 'Unknown'
          acc[k] = (acc[k] ?? 0) + 1; return acc
        }, {})
      }))

    const { data: replyStats } = await db.from('african_data_moat')
      .select('replied, opened, meeting_booked')
    const replied = replyStats?.filter(r => r.replied).length ?? 0
    const opened  = replyStats?.filter(r => r.opened).length ?? 0
    const meetings = replyStats?.filter(r => r.meeting_booked).length ?? 0
    const n = replyStats?.length ?? 1

    res.json({
      success: true,
      data: {
        total_records:   total ?? 0,
        by_country:      byCountry ?? {},
        by_industry:     byIndustry ?? {},
        reply_rate:      n > 0 ? Math.round((replied / n) * 100) / 100 : 0,
        open_rate:       n > 0 ? Math.round((opened / n) * 100) / 100 : 0,
        meeting_rate:    n > 0 ? Math.round((meetings / n) * 100) / 100 : 0,
      }
    })
  } catch (err) {
    console.error('[data-moat/stats]', err)
    res.status(500).json({ success: false, error: 'Stats query failed' })
  }
})

// ── P3-6: CHURN RISK SCORING ──────────────────────────────────────────────────
// POST /internal/ae/churn-risk-check
// Scores each client with an active subscription for churn likelihood (0-100).
// Score components:
//   +30 no login in 14 days (last_seen_at / last_sign_in_at)
//   +25 zero active campaigns
//   +20 reply_rate < 2%
//   +15 < 10 leads total
//   +10 subscription status = 'past_due'
// Returns { at_risk: [{client_id, company_name, churn_score, reasons}] }
export async function computeChurnRisk(): Promise<{
  client_id: string
  company_name: string
  churn_score: number
  reasons: string[]
}[]> {
  // Fetch all clients with subscriptions
  const { data: clients } = await db.from('clients')
    .select('id, company_name, user_id, last_seen_at')
    .not('user_id', 'is', null)

  const now = new Date()

  const results: { client_id: string; company_name: string; churn_score: number; reasons: string[] }[] = []

  for (const client of clients ?? []) {
    let score = 0
    const reasons: string[] = []

    // +10 if subscription is past_due
    const { data: subs } = await db.from('subscriptions')
      .select('status').eq('client_id', client.id)
    const isPastDue = (subs ?? []).some((s: any) => s.status === 'past_due')
    const hasActiveSub = (subs ?? []).some((s: any) => s.status === 'active' || s.status === 'trialing' || s.status === 'past_due')
    if (!hasActiveSub) continue // Skip clients without any subscription

    if (isPastDue) { score += 10; reasons.push('past_due_subscription') }

    // +30 if no login in 14 days
    let lastSeenAt: string | null = client.last_seen_at as string | null
    if (!lastSeenAt && client.user_id) {
      try {
        const { data: { user } } = await db.auth.admin.getUserById(client.user_id)
        lastSeenAt = user?.last_sign_in_at ?? null
      } catch {}
    }
    const daysSinceLogin = lastSeenAt
      ? Math.floor((now.getTime() - new Date(lastSeenAt).getTime()) / 86400000)
      : 999
    if (daysSinceLogin > 14) { score += 30; reasons.push(`no_login_${daysSinceLogin}d`) }

    // +25 if 0 active campaigns
    const { count: activeCampaigns } = await db.from('figsy_campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .eq('status', 'active')
    if ((activeCampaigns ?? 0) === 0) { score += 25; reasons.push('no_active_campaigns') }

    // +20 if reply_rate < 2% (campaigns with >= 20 sent emails)
    const { data: campaigns } = await db.from('figsy_campaigns')
      .select('emails_sent, replies_total')
      .eq('client_id', client.id)
      .gte('emails_sent', 20)
    const totalSent = (campaigns ?? []).reduce((s: number, c: any) => s + (c.emails_sent ?? 0), 0)
    const totalReplied = (campaigns ?? []).reduce((s: number, c: any) => s + (c.replies_total ?? 0), 0)
    const replyRate = totalSent > 0 ? totalReplied / totalSent : null
    if (replyRate !== null && replyRate < 0.02) { score += 20; reasons.push(`low_reply_rate_${(replyRate * 100).toFixed(1)}pct`) }

    // +15 if < 10 leads total
    const { count: leadsTotal } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id)
    if ((leadsTotal ?? 0) < 10) { score += 15; reasons.push('fewer_than_10_leads') }

    score = Math.min(100, score)

    if (score >= 50) {
      results.push({
        client_id:    client.id,
        company_name: client.company_name ?? '—',
        churn_score:  score,
        reasons,
      })
    }
  }

  return results.sort((a, b) => b.churn_score - a.churn_score)
}

internalRouter.post('/ae/churn-risk-check', async (_req: Request, res: Response) => {
  try {
    const at_risk = await computeChurnRisk()
    res.json({ success: true, data: { at_risk } })
  } catch (err) {
    console.error('[ae/churn-risk-check]', err)
    res.status(500).json({ success: false, error: 'Churn risk check failed' })
  }
})

// ── #287 — MRR daily snapshot (MRR waterfall + MoM trend) ─────────────────────
// Writes one row/day into metrics_daily so the admin revenue page can chart MRR
// over time and diff two days to show movement (new / churned / expansion /
// contraction). MRR = sum(amount_usd) of ACTIVE subscriptions — the same active
// set the revenue page sums. subs_json holds { client_id, amount_usd } per active
// sub so movement can be computed. Scheduled daily in cron.ts. Upsert keyed on
// today's date → re-running the same day is a safe overwrite, never a duplicate.
internalRouter.post('/metrics/snapshot', async (_req: Request, res: Response) => {
  try {
    const [exclusions, { data: activeSubs }, { data: trialSubsRaw }] = await Promise.all([
      // Revenue-honesty: the nightly MRR snapshot feeds the historical trend chart, so it
      // must exclude demo + house (founder testing) subs — otherwise every night bakes a
      // poisoned data point into metrics_daily.
      getClientExclusions(),
      db.from('subscriptions').select('client_id, amount_usd').eq('status', 'active'),
      db.from('subscriptions').select('client_id').eq('status', 'trialing'),
    ])

    const subsJson = (activeSubs ?? [])
      .filter((s: { client_id: string }) => !exclusions.excludedClientIds.has(s.client_id))
      .map((s: { client_id: string; amount_usd: number | null }) => ({
        client_id:  s.client_id,
        amount_usd: s.amount_usd ?? 0,
      }))
    const trialCount = (trialSubsRaw ?? [])
      .filter((s: { client_id: string }) => !exclusions.excludedClientIds.has(s.client_id)).length
    const mrrUsd = subsJson.reduce((sum, s) => sum + (s.amount_usd || 0), 0)
    const today  = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)

    const { error } = await db.from('metrics_daily').upsert({
      date:        today,
      mrr_usd:     mrrUsd,
      active_subs: subsJson.length,
      trial_subs:  trialCount ?? 0,
      subs_json:   subsJson,
    }, { onConflict: 'date' })
    if (error) throw error

    res.json({ success: true, data: { date: today, mrr_usd: mrrUsd, active_subs: subsJson.length, trial_subs: trialCount ?? 0 } })
  } catch (err) {
    console.error('[metrics/snapshot]', err)
    res.status(500).json({ success: false, error: 'Metrics snapshot failed' })
  }
})
