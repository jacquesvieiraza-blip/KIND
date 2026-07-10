/**
 * POST /internal/status/snapshot
 * Called by cron 3× daily — generates a full platform status snapshot
 * and writes it to platform_status table. Admin portal reads the latest row.
 *
 * Sessions: morning (07:05 SAST), lunch (12:00 SAST), evening (19:00 SAST)
 */

import { Router } from 'express'
import { db } from '@kind/db'
import { adminKeyValid } from './admin'
export const statusRouter = Router()

// Admin key guard — #402 (AR-65): constant-time compare (no timing side-channel).
statusRouter.use((req, res, next) => {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    res.status(401).json({ success: false, error: 'Unauthorized' }); return
  }
  next()
})

statusRouter.post('/snapshot', async (_req, res) => {
  try {
    const now = new Date()
    const hourUTC = now.getUTCHours()
    // Determine session name based on UTC hour (SAST = UTC+2)
    const session: 'morning' | 'lunch' | 'evening' =
      hourUTC < 10 ? 'morning' :
      hourUTC < 14 ? 'lunch' :
      'evening'

    const ago24h = new Date(now.getTime() - 86400000).toISOString()
    const ago7d  = new Date(now.getTime() - 7 * 86400000).toISOString()

    // ── Gather data in parallel ──────────────────────────────────────────────
    const [
      clientsRes,
      activeSubsRes,
      trialRes,
      creditsRes,
      leadsRes,
      figsyCampaignRes,
      figsySessionRes,
      newSignupsRes,
      revenueRes,
      atRiskRes,
    ] = await Promise.allSettled([
      db.from('clients').select('id', { count: 'exact', head: true }),
      db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
      db.from('clients').select('credit_balance').gt('credit_balance', 0),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', ago24h),
      db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      db.from('figsy_sessions').select('id', { count: 'exact', head: true }).gte('created_at', ago24h),
      db.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', ago24h),
      db.from('credit_transactions').select('amount').eq('type', 'purchase').gte('created_at', ago7d),
      db.from('subscriptions').select('client_id', { count: 'exact', head: true })
        .in('status', ['active', 'trialing'])
        .lt('current_period_end', now.toISOString()),
    ])

    const totalClients   = clientsRes.status === 'fulfilled'     ? (clientsRes.value.count ?? 0) : 0
    const activeClients  = activeSubsRes.status === 'fulfilled'  ? (activeSubsRes.value.count ?? 0) : 0
    const trialClients   = trialRes.status === 'fulfilled'       ? (trialRes.value.count ?? 0) : 0
    const leadsToday     = leadsRes.status === 'fulfilled'       ? (leadsRes.value.count ?? 0) : 0
    const activeCampaigns = figsyCampaignRes.status === 'fulfilled' ? (figsyCampaignRes.value.count ?? 0) : 0
    const figsyToday     = figsySessionRes.status === 'fulfilled' ? (figsySessionRes.value.count ?? 0) : 0
    const newSignups     = newSignupsRes.status === 'fulfilled'  ? (newSignupsRes.value.count ?? 0) : 0
    const atRisk         = atRiskRes.status === 'fulfilled'      ? (atRiskRes.value.count ?? 0) : 0

    const revenueWeek = revenueRes.status === 'fulfilled'
      ? (revenueRes.value.data ?? []).reduce((sum: number, t: { amount: number }) => sum + (t.amount || 0), 0)
      : 0

    const creditBalances = creditsRes.status === 'fulfilled'
      ? (creditsRes.value.data ?? []) as { credit_balance: number }[]
      : []
    const totalCreditsHeld = creditBalances.reduce((sum, c) => sum + (c.credit_balance || 0), 0)
    const zeroCredits = totalClients - creditBalances.length

    const data = {
      generated_at:    now.toISOString(),
      session,
      clients: {
        total:         totalClients,
        active_paid:   activeClients,
        trialing:      trialClients,
        new_24h:       newSignups,
        at_risk:       atRisk,
        zero_credits:  zeroCredits,
      },
      leads: {
        delivered_24h: leadsToday,
        credits_held:  totalCreditsHeld,
      },
      figsy: {
        active_campaigns: activeCampaigns,
        sessions_24h:     figsyToday,
      },
      revenue: {
        purchases_7d_usd: revenueWeek,
      },
    }

    // ── Plain text summary ───────────────────────────────────────────────────
    const summary = [
      `K.I.N.D ${session} status — ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      `Clients: ${totalClients} total (${activeClients} paid, ${trialClients} trial, ${newSignups} new today).`,
      `Leads: ${leadsToday} delivered in last 24h. ${totalCreditsHeld} credits held across platform.`,
      `FIGSY: ${activeCampaigns} active campaigns, ${figsyToday} sessions in last 24h.`,
      `Revenue: $${revenueWeek} in credit purchases (last 7 days).`,
      atRisk > 0 ? `⚠️ ${atRisk} client(s) have lapsed subscriptions.` : `All subscriptions current.`,
      zeroCredits > 0 ? `⚠️ ${zeroCredits} client(s) have zero credits.` : `All active clients have credits.`,
    ].join(' ')

    // ── Write to DB ──────────────────────────────────────────────────────────
    await db.from('platform_status').insert({ session, summary, data })

    res.json({ success: true, data: { session, summary, snapshot: data } })
  } catch (err) {
    console.error('[status/snapshot]', err)
    res.status(500).json({ success: false, error: 'Failed to generate status snapshot' })
  }
})

// GET latest snapshot (for admin portal)
statusRouter.get('/latest', async (_req, res) => {
  try {
    const { data, error } = await db
      .from('platform_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      res.json({ success: true, data: null })
      return
    }

    res.json({ success: true, data })
  } catch (err) {
    console.error('[status/latest]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch status' })
  }
})

// GET last 10 snapshots (for admin history view)
statusRouter.get('/history', async (_req, res) => {
  try {
    const { data, error } = await db
      .from('platform_status')
      .select('id, session, summary, generated_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error
    res.json({ success: true, data: data ?? [] })
  } catch (err) {
    console.error('[status/history]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch history' })
  }
})
