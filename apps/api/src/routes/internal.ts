/**
 * Internal agent routes — AE + CRO agents (INT-1 to INT-7)
 * Protected by ADMIN_SECRET_KEY header.
 * These routes are called by cron jobs (Railway / external scheduler).
 *
 * Endpoints:
 *   POST /internal/digest/weekly          — D5: send weekly leads digest to all active clients
 *   POST /internal/ae/at-risk             — INT-2: detect and alert on at-risk clients
 *   POST /internal/ae/trial-expiry        — INT-4: send trial expiry emails (day 10/12/14)
 *   GET  /internal/cro/dashboard          — INT-5: revenue + retention dashboard data
 *   POST /internal/cro/weekly-digest      — INT-6: send weekly founder digest email
 *   POST /internal/figsy/check-performance — pause active campaigns with reply rate < 1%
 */

import { Router, Request, Response } from 'express'
import { db } from '@kind/db'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { sendWeeklyLeadsDigest, sendNurtureEmail, sendZeroCreditsWarning, sendCampaignPausedEmail } from '../lib/email'
import { KIND_BRAND, findKindProspects } from '../lib/cmo'
import { getHubspotPipelineView } from '../lib/hubspot'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = 'K.I.N.D <hello@get-kind.com>'
const DASH   = `${process.env.PORTAL_URL || 'https://app.get-kind.com'}/dashboard`

export const internalRouter = Router()

function requireAdminKey(req: Request, res: Response, next: () => void) {
  if (!process.env.ADMIN_SECRET_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_SECRET_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
}

internalRouter.use(requireAdminKey)

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

        const [totalRes, newRes, avgRes, consentedRes, figsySentRes, figsyRepliesRes, figsyInterestedRes, figsyCampaignsRes] = await Promise.all([
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('created_at', weekStart),
          db.from('leads').select('score, estimated_deal_value_usd').eq('client_id', client.id).not('score', 'is', null),
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'consent_given'),
          db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('sent_at', weekStart),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('received_at', weekStart),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('classification', 'interested').gte('received_at', weekStart),
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
            <a href="https://admin.get-kind.com" style="color:#0066FF;font-size:0.8rem">View →</a>
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

// ── INT-4 — TRIAL EXPIRY SEQUENCE ────────────────────────────────────────────
// Call daily. Sends emails at day 10, 12, and 14 of trial.
internalRouter.post('/ae/trial-expiry', async (_req: Request, res: Response) => {
  try {
    const now = new Date()
    const { data: trials } = await db.from('subscriptions')
      .select('client_id, trial_ends_at, clients(company_name, user_id)')
      .eq('status', 'trialing')
      .not('trial_ends_at', 'is', null)

    let sent = 0

    for (const sub of trials ?? []) {
      if (!sub.trial_ends_at) continue
      const trialEnd  = new Date(sub.trial_ends_at)
      const daysLeft  = Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000)
      if (!sub.clients) continue
      const client    = Array.isArray(sub.clients) ? sub.clients[0] : sub.clients as any
      if (!client?.user_id) continue

      const { data: { user } } = await db.auth.admin.getUserById(client.user_id)
      const email = user?.email
      if (!email) continue

      let subject = ''
      let body    = ''

      if (daysLeft === 4) { // day 10 of 14-day trial
        subject = `Your K.I.N.D trial ends in 4 days — ${client.company_name}`
        body = `
          <p>Hi there,</p>
          <p>Your K.I.N.D trial ends in <strong>4 days</strong>. Before it does, make sure you've:</p>
          <ul>
            <li>Built your ICP — it takes 60 seconds with our AI pre-fill</li>
            <li>Reviewed your scored leads</li>
            <li>Sent consent emails to your top prospects</li>
          </ul>
          <p>If you're seeing value, locking in now means your lead pipeline keeps running uninterrupted.</p>`
      } else if (daysLeft === 2) { // day 12
        subject = `2 days left on your trial — don't lose your leads`
        body = `
          <p>Hi there,</p>
          <p>Just a quick heads up — your K.I.N.D trial ends in <strong>2 days</strong>.</p>
          <p>Your leads, ICP, and pipeline data are all saved. Subscribing now takes 2 minutes and keeps everything running.</p>
          <p>Any questions about pricing or what's included? Reply to this email — I'm here.</p>`
      } else if (daysLeft <= 0) { // day 14+
        subject = `Your K.I.N.D trial has ended`
        body = `
          <p>Hi there,</p>
          <p>Your free trial has ended. Your data is safe — your leads, ICP, and pipeline are all still there.</p>
          <p>Subscribe to pick up right where you left off. Takes 2 minutes.</p>`
      }

      if (!subject) continue

      if (resend) {
        await resend.emails.send({
          from: FROM,
          to:   email,
          subject,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
              ${body}
              <a href="${DASH}/billing"
                 style="display:inline-block;margin-top:16px;background:#0066FF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
                Subscribe now →
              </a>
              <p style="color:#999;font-size:0.8rem;margin-top:24px">
                Questions? Reply to this email or book a call — <a href="mailto:hello@get-kind.com">hello@get-kind.com</a>
              </p>
            </div>`,
        })
        sent++
      }
    }

    res.json({ success: true, data: { sent } })
  } catch (err) {
    console.error('[ae/trial-expiry]', err)
    res.status(500).json({ success: false, error: 'Trial expiry run failed' })
  }
})

// ── INT-5 — CRO DASHBOARD ─────────────────────────────────────────────────────
// Revenue + retention metrics for admin dashboard.
internalRouter.get('/cro/dashboard', async (_req: Request, res: Response) => {
  try {
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      { data: activeSubs },
      { data: trialSubs },
      { data: cancelledSubs },
      { count: totalClients },
      { count: totalLeads },
      { count: leadsThisMonth },
    ] = await Promise.all([
      db.from('subscriptions').select('amount_zar, created_at').eq('status', 'active'),
      db.from('subscriptions').select('id, trial_ends_at').eq('status', 'trialing'),
      db.from('subscriptions').select('id, cancelled_at').eq('status', 'cancelled').gte('cancelled_at', monthStart),
      db.from('clients').select('id', { count: 'exact', head: true }),
      db.from('leads').select('id', { count: 'exact', head: true }),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    ])

    const mrrZar     = (activeSubs ?? []).reduce((s: number, sub: any) => s + (sub.amount_zar ?? 0), 0)
    const mrrUsd     = Math.round(mrrZar / 19)
    const lastMrrZar = (activeSubs ?? []).filter((s: any) => s.created_at < monthStart)
      .reduce((sum: number, sub: any) => sum + (sub.amount_zar ?? 0), 0)
    const lastMrrUsd = Math.round(lastMrrZar / 19)
    const mrrGrowth  = lastMrrUsd > 0 ? Math.round(((mrrUsd - lastMrrUsd) / lastMrrUsd) * 100) : null

    // Trials expiring in next 7 days
    const expiringTrials = (trialSubs ?? []).filter((s: any) => {
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
      { data: activeSubs },
      { count: trialing },
      { count: newThisWeek },
      { count: totalLeads },
      { count: leadsThisWeek },
      { count: consentedTotal },
      { data: atRiskClients },
    ] = await Promise.all([
      db.from('subscriptions').select('amount_zar').eq('status', 'active'),
      db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
      db.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      db.from('leads').select('id', { count: 'exact', head: true }),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'consent_given'),
      db.from('clients').select('company_name, first_icp_run_at, created_at').lte('created_at', weekStart),
    ])

    const mrrUsd = Math.round((activeSubs ?? []).reduce((s: number, sub: any) => s + (sub.amount_zar ?? 0), 0) / 19)
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
                  <p style="margin:0;font-size:1.3rem;font-weight:700;color:#0066FF">$${mrrUsd.toLocaleString()}</p>
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
               style="display:inline-block;background:#0066FF;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:0.85rem">
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

// ── M-2 — TRIAL NURTURE SEQUENCE ─────────────────────────────────────────────
// Call daily. Sends day-1/3/5/7/10 nurture emails to trial clients.
internalRouter.post('/ae/nurture', async (_req: Request, res: Response) => {
  try {
    const now = new Date()

    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id, created_at, first_icp_run_at')
      .not('user_id', 'is', null)
      .gte('created_at', new Date(now.getTime() - 14 * 86400000).toISOString())

    const STAGES = [1, 3, 5, 7, 10] as const
    let sent = 0

    for (const client of clients ?? []) {
      const daysOld = Math.floor((now.getTime() - new Date(client.created_at).getTime()) / 86400000)

      if (!(STAGES as readonly number[]).includes(daysOld)) continue

      // Skip if already on an active paid subscription
      const { data: activeSub } = await db.from('subscriptions')
        .select('id').eq('client_id', client.id).eq('status', 'active').maybeSingle()
      if (activeSub) continue

      try {
        const { data: { user } } = await db.auth.admin.getUserById(client.user_id!)
        const email = user?.email
        if (!email) continue

        const { count: leadCount } = await db.from('leads')
          .select('id', { count: 'exact', head: true }).eq('client_id', client.id)
        const { count: consentedCount } = await db.from('leads')
          .select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'consent_given')

        await sendNurtureEmail(email, client.company_name ?? '', daysOld as 1|3|5|7|10, {
          has_icp:        !!client.first_icp_run_at,
          lead_count:     leadCount ?? 0,
          consented_count: consentedCount ?? 0,
        })
        sent++
      } catch (err) {
        console.error(`[ae/nurture] failed for client ${client.id}:`, err)
      }
    }

    res.json({ success: true, data: { sent } })
  } catch (err) {
    console.error('[ae/nurture]', err)
    res.status(500).json({ success: false, error: 'Nurture run failed' })
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
          ${c.email ? `<a href="mailto:${c.email}" style="color:#0066FF">${c.email}</a>` : '—'}
          ${c.linkedin_url ? ` · <a href="${c.linkedin_url}" style="color:#0066FF">LinkedIn</a>` : ''}
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
      .gte('created_at', todayUTC.toISOString())

    const remaining = Math.max(0, dailyLimit - (sentToday ?? 0))
    if (remaining === 0) {
      res.json({ success: true, data: { sent: 0, capped: true, daily_limit: dailyLimit } })
      return
    }

    const now = new Date().toISOString()
    const { data: due } = await db.from('figsy_enrollments')
      .select('*, leads(id,first_name,last_name,email,job_title,company,industry,seniority,country,tech_stack,score,score_reasoning)')
      .in('status', ['enrolled', 'in_progress'])
      .lte('next_send_at', now)
      .limit(remaining)

    const { sendSequenceEmail, applyReplyBranching } = await import('../lib/figsy')

    const stepsCache = new Map<string, { step: number; on_reply?: 'stop' | 'skip_next' | 'continue' }[] | null>()
    let sent = 0
    for (const enrollment of due ?? []) {
      const lead = Array.isArray(enrollment.leads) ? enrollment.leads[0] : enrollment.leads
      if (!lead?.email) continue
      const nextStep = (enrollment.current_step + 1) as 1 | 2 | 3
      if (nextStep > 3) continue

      // Honour the step's on_reply setting if the lead has replied since last send
      try {
        if (await applyReplyBranching(enrollment, stepsCache) === 'skip') continue
      } catch (err) {
        console.error('[figsy/send-due-all] branching', enrollment.id, ':', err)
      }

      const subject = enrollment[`step${nextStep}_subject` as keyof typeof enrollment] as string
      const body    = enrollment[`step${nextStep}_body`    as keyof typeof enrollment] as string
      if (!subject || !body) continue
      try {
        await sendSequenceEmail(enrollment.id, lead, nextStep, subject, body, enrollment.campaign_id)
        sent++
      } catch (err) {
        console.error('[figsy/send-due-all] enrollment', enrollment.id, ':', err)
      }
    }

    res.json({ success: true, data: { sent, remaining_today: remaining - sent, daily_limit: dailyLimit } })
  } catch (err) {
    console.error('[figsy/send-due-all]', err)
    res.status(500).json({ success: false, error: 'FIGSY send-due-all failed' })
  }
})

// ── FIGSY CHECK PERFORMANCE ──────────────────────────────────────────────────
// Pause active campaigns whose reply rate has dropped below 1%.
internalRouter.post('/figsy/check-performance', async (_req: Request, res: Response) => {
  try {
    const { data: campaigns } = await db.from('figsy_campaigns')
      .select('id, client_id, name, status, leads_enrolled, emails_sent, replies_total, replies_interested, opted_out, created_at')
      .eq('status', 'active')
      .gt('leads_enrolled', 0)
      .gte('emails_sent', 20)

    const paused: { id: string; name: string; client_id: string; reply_rate: number }[] = []

    for (const campaign of campaigns ?? []) {
      const replyRate = campaign.replies_total / campaign.emails_sent
      if (replyRate < 0.01) {
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
    const now = new Date()

    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id, credit_balance, first_icp_run_at')
      .eq('credit_balance', 0)
      .not('first_icp_run_at', 'is', null)
      .not('user_id', 'is', null)

    let sent = 0

    for (const client of clients ?? []) {
      try {
        // Find when credits last hit zero (last deduction transaction)
        const { data: lastTx } = await db.from('credit_transactions')
          .select('created_at')
          .eq('client_id', client.id)
          .eq('type', 'deduction')
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

    res.json({ success: true, data: { sent } })
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
            <a href="https://admin.get-kind.com" style="color:#0066FF;font-size:0.8rem">Review →</a>
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
    const now       = new Date()
    const todayUTC  = new Date(now)
    todayUTC.setUTCHours(0, 0, 0, 0)
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString()

    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id')
      .not('user_id', 'is', null)

    let sent = 0

    for (const client of clients ?? []) {
      try {
        const { data: { user } } = await db.auth.admin.getUserById(client.user_id!)
        const email = user?.email
        if (!email) continue

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
          db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('sent_at', weekStart),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('received_at', weekStart),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('classification', 'interested').gte('received_at', weekStart),
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
                <span style="margin-left:8px;background:#f0f7ff;color:#0066FF;font-size:0.75rem;font-weight:700;padding:2px 8px;border-radius:100px">Score ${l.score}</span>
              </div>`
            ).join('')
          : ''

        if (resend) {
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
                      <p style="margin:0;font-size:1.4rem;font-weight:800;color:#0066FF">${activeCampaigns ?? 0}</p>
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
    const now      = new Date()
    const prev7d   = new Date(now.getTime() - 7  * 86400000).toISOString()
    const prev14d  = new Date(now.getTime() - 14 * 86400000).toISOString()
    const last48h  = new Date(now.getTime() - 2  * 86400000).toISOString()

    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id')
      .not('user_id', 'is', null)

    let alertsSent = 0

    for (const client of clients ?? []) {
      try {
        const { data: { user } } = await db.auth.admin.getUserById(client.user_id!)
        const email = user?.email
        if (!email) continue

        const [
          { count: sent7d },  { count: replied7d },  { count: interested7d },
          { count: sent14d }, { count: replied14d },
          { count: activeCampaigns },
          { count: sentLast48h },
        ] = await Promise.all([
          db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('sent_at', prev7d),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('received_at', prev7d),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('classification', 'interested').gte('received_at', prev7d),
          db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('sent_at', prev14d).lt('sent_at', prev7d),
          db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('received_at', prev14d).lt('received_at', prev7d),
          db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'active'),
          db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('sent_at', last48h),
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

        if (anomalies.length === 0 || !resend) continue

        await resend.emails.send({
          from: FROM,
          to:   email,
          subject: `Milla spotted something — ${anomalies.length} signal${anomalies.length > 1 ? 's' : ''} in your pipeline`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
              <p style="color:#888;font-size:0.78rem;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.06em">Milla · Proactive Intelligence</p>
              <h2 style="margin-top:0">I spotted ${anomalies.length > 1 ? 'a few things' : 'something'} in your pipeline.</h2>
              ${anomalies.map(a => `
                <div style="background:#fafafa;border-left:3px solid #0066FF;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:12px">
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
          score_reasoning: 'Apollo ICP match — K.I.N.D self-outreach',
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
               style="display:inline-block;margin-top:12px;background:#0066FF;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;font-size:0.85rem">
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
                 style="display:inline-block;margin-top:12px;background:#0066FF;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;font-size:0.85rem">
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
internalRouter.post('/leads/drip', async (_req: Request, res: Response) => {
  try {
    // Get all active clients with undelivered leads
    const { data: clients } = await db.from('clients')
      .select('id, company_name, user_id, daily_drip_rate, credit_balance')
      .not('first_icp_run_at', 'is', null)

    let totalDelivered = 0

    for (const client of clients ?? []) {
      try {
        const drip = client.daily_drip_rate ?? 5
        const balance = client.credit_balance ?? 0

        // Can't deliver leads to a client with no credits
        if (balance < 1) continue

        // Deliver up to min(drip_rate, credit_balance) leads
        const toDeliver = Math.min(drip, balance)

        // Find undelivered leads for this client, oldest first
        const { data: pending } = await db.from('leads')
          .select('id')
          .eq('client_id', client.id)
          .is('delivered_at', null)
          .order('created_at', { ascending: true })
          .limit(toDeliver)

        if (!pending || pending.length === 0) continue

        const ids = pending.map((l: { id: string }) => l.id)
        const now = new Date().toISOString()

        // Set delivered_at on these leads
        await db.from('leads')
          .update({ delivered_at: now })
          .in('id', ids)

        // Deduct 1 credit per delivered lead
        const newBalance = Math.max(0, balance - ids.length)
        await db.from('clients')
          .update({ credit_balance: newBalance })
          .eq('id', client.id)

        // Record the credit transaction
        await db.from('credit_transactions').insert({
          client_id: client.id,
          amount: -ids.length,
          type: 'usage',
          note: `${ids.length} lead${ids.length === 1 ? '' : 's'} delivered`,
          created_at: now,
        })

        totalDelivered += ids.length
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
    const founderEmail = process.env.FOUNDER_EMAIL || 'jacques.vieiraza@gmail.com'
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
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('classification', 'interested').gte('received_at', ago24h),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('classification', 'opt_out').gte('received_at', ago24h),
      db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('credit_transactions').select('amount').eq('type', 'purchase').gte('created_at', ago24h),
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

    const revenueToday = (purchaseTxns as { amount: number }[]).reduce((s, t) => s + (t.amount ?? 0), 0)
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
    const now = new Date().toISOString()

    // Active subscriptions whose billing period has ended — no renewal charge received
    const { data: lapsed, error } = await db.from('subscriptions')
      .update({ status: 'lapsed' })
      .eq('status', 'active')
      .lt('current_period_end', now)
      .select('id, client_id, product')

    if (error) throw error

    // For each lapsed subscription, notify the client
    for (const sub of (lapsed ?? []) as { id: string; client_id: string; product: string }[]) {
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
                 style="display:inline-block;margin-top:12px;background:#0066FF;color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:600;font-size:0.85rem">
                Renew subscription →
              </a>
            </div>`,
        })
      } catch (err) {
        console.error(`[subscriptions/lapsed] notify failed for sub ${(sub as { id: string }).id}:`, err)
      }
    }

    res.json({ success: true, data: { lapsed: (lapsed ?? []).length } })
  } catch (err) {
    console.error('[subscriptions/check-lapsed]', err)
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
      const emailsSent   = campaign.emails_sent   ?? 0
      const optedOut     = campaign.opted_out     ?? 0
      const repliesTotal = campaign.replies_total ?? 0
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
        await db
          .from('figsy_campaigns')
          .update({ settings: { ...existing, daily_send_limit: newLimit } })
          .eq('id', campaign.id)

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

// ── P2-2: A/B SUBJECT LINE WINNER CHECK ───────────────────────────────────────
// Called daily by cron. Checks all active campaigns with ab_subject_b set.
// After 48h + ≥5 sends per variant, picks winner by open rate.
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

      const abSubjectB = settings.ab_subject_b as string
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

      const variantB = sentEmails.filter(e => e.subject === abSubjectB)
      const variantA = sentEmails.filter(e => e.subject !== abSubjectB)

      if (variantA.length < 5 || variantB.length < 5) continue

      const openRateA = variantA.filter(e => e.opened_at).length / variantA.length
      const openRateB = variantB.filter(e => e.opened_at).length / variantB.length
      const winner = openRateB > openRateA ? 'b' : 'a'

      await db.from('figsy_campaigns')
        .update({
          settings: {
            ...settings,
            ab_test_resolved: true,
            ab_test_winner: winner,
          }
        })
        .eq('id', campaign.id)

      resolved++
    }

    res.json({ success: true, data: { checked, resolved } })
  } catch (err) {
    console.error('[figsy/ab-winner-check]', err)
    res.status(500).json({ success: false, error: 'AB winner check failed' })
  }
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

    for (const campaign of campaigns) {
      const settings = campaign.settings as Record<string, unknown> ?? {}
      if (!settings.intent_signal_enroll) continue

      const signalTypes = (settings.intent_signal_types as string[] | undefined) ?? ['job_change', 'funding']

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

        // Check not already enrolled in this campaign
        const { data: existing } = await db.from('figsy_enrollments')
          .select('id').eq('lead_id', lead.id).eq('campaign_id', campaign.id).maybeSingle()
        if (existing) continue

        // Enroll
        const { error: enrollErr } = await db.from('figsy_enrollments').insert({
          lead_id:     lead.id,
          campaign_id: campaign.id,
          client_id:   campaign.client_id,
          status:      'enrolled',
          trigger:     triggerReasons.join(','),
          enrolled_at: new Date().toISOString(),
        })
        if (!enrollErr) enrolled++
      }
    }

    res.json({ success: true, data: { enrolled } })
  } catch (err) {
    console.error('[figsy/check-intent-signals]', err)
    res.status(500).json({ success: false, error: 'Intent signal check failed' })
  }
})
