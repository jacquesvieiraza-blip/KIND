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
      dormantRes,
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
      // #607 — this counted "clients on trial". There is no trial. What it counts now is the
      // GRANDFATHERED remainder: rows still carrying `trialing` from before 1 Aug, which the
      // 20260801_retire_trial_status migration converts to `paused`. The founder asked for the
      // grandfathering to be explicit, so the number stays on screen until it reaches zero
      // rather than being assumed to have gone.
      db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
      // Dormant: signed up, entitlement row exists, nothing bought yet (routes/auth.ts).
      db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'paused'),
      db.from('clients').select('credit_balance').gt('credit_balance', 0),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', ago24h),
      db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      // #641⑦ — `figsy_sessions` IS NOT A TABLE. Nothing in 130 migrations or three schema
      // snapshots creates it, and nothing writes it: FIGSY's history lives in
      // `figsy_chat_messages` (20260602_figsy_chat_history.sql). The count was rejected on
      // every request, `.count ?? 0` turned that into 0, and the status page has reported
      // "0 sessions today" since it was built — indistinguishable from a genuinely quiet day.
      // Distinct clients who sent a FIGSY chat message in 24h IS a session count; bounded so
      // this can never become an unbounded scan on the status page.
      db.from('figsy_chat_messages').select('client_id').gte('created_at', ago24h).limit(2000),
      db.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', ago24h),
      db.from('credit_transactions').select('amount').eq('type', 'purchase').gte('created_at', ago7d),
      // #607 — was `.in('status',['active','trialing'])`. A legacy trialing row past its end
      // date is not a lapsed SUBSCRIPTION, and counting it here is what made "at risk" read
      // as a billing problem when it was just an expired trial. At risk now means what the
      // summary line below says it means: a PAID subscription past its period end.
      db.from('subscriptions').select('client_id', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('current_period_end', now.toISOString()),
    ])

    const totalClients   = clientsRes.status === 'fulfilled'     ? (clientsRes.value.count ?? 0) : 0
    const activeClients  = activeSubsRes.status === 'fulfilled'  ? (activeSubsRes.value.count ?? 0) : 0
    const legacyTrialing = trialRes.status === 'fulfilled'       ? (trialRes.value.count ?? 0) : 0
    const dormantClients = dormantRes.status === 'fulfilled'     ? (dormantRes.value.count ?? 0) : 0
    const leadsToday     = leadsRes.status === 'fulfilled'       ? (leadsRes.value.count ?? 0) : 0
    const activeCampaigns = figsyCampaignRes.status === 'fulfilled' ? (figsyCampaignRes.value.count ?? 0) : 0
    const figsyToday     = figsySessionRes.status === 'fulfilled'
      ? new Set(((figsySessionRes.value.data ?? []) as { client_id: string }[]).map(r => r.client_id)).size
      : 0
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
        // #607 — `trialing` was renamed rather than kept, because a field named "trialing"
        // reading 0 looks like "no trials right now" instead of "there are no trials".
        dormant:          dormantClients,
        legacy_trialing:  legacyTrialing,
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
      `Clients: ${totalClients} total (${activeClients} paid, ${dormantClients} dormant awaiting first purchase, ${newSignups} new today).`
        + (legacyTrialing > 0 ? ` ⚠️ ${legacyTrialing} legacy 'trialing' row(s) remain — run the 20260801_retire_trial_status migration (#607).` : ''),
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
