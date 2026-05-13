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
 */

import { Router, Request, Response } from 'express'
import { db } from '@kind/db'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { sendWeeklyLeadsDigest } from '../lib/email'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = 'K.I.N.D <hello@get-kind.com>'
const DASH   = 'https://app.get-kind.com/dashboard'

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

        const [totalRes, newRes, avgRes, consentedRes] = await Promise.all([
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('created_at', weekStart),
          db.from('leads').select('score, estimated_deal_value_usd').eq('client_id', client.id).not('score', 'is', null),
          db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'consent_given'),
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
        }, topLeads ?? [])

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
      db.from('subscriptions').select('amount_usd, created_at').eq('status', 'active'),
      db.from('subscriptions').select('id, trial_ends_at').eq('status', 'trialing'),
      db.from('subscriptions').select('id, cancelled_at').eq('status', 'cancelled').gte('cancelled_at', monthStart),
      db.from('clients').select('id', { count: 'exact', head: true }),
      db.from('leads').select('id', { count: 'exact', head: true }),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
    ])

    const mrrUsd     = (activeSubs ?? []).reduce((s: number, sub: any) => s + (sub.amount_usd ?? 0), 0)
    const lastMrrUsd = (activeSubs ?? []).filter((s: any) => s.created_at < monthStart)
      .reduce((sum: number, sub: any) => sum + (sub.amount_usd ?? 0), 0)
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
      db.from('subscriptions').select('amount_usd').eq('status', 'active'),
      db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
      db.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      db.from('leads').select('id', { count: 'exact', head: true }),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'consent_given'),
      db.from('clients').select('company_name, first_icp_run_at, created_at').lte('created_at', weekStart),
    ])

    const mrrUsd = (activeSubs ?? []).reduce((s: number, sub: any) => s + (sub.amount_usd ?? 0), 0)
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
