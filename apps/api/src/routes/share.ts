import { Router } from 'express'
import { db } from '@kind/db'

export const shareRouter = Router()

// ── PUBLIC: shared campaign report (no auth — resolved by share_token) ─────────
// GET /share/:token → aggregated outreach metrics for the owning client.
shareRouter.get('/:token', async (req, res) => {
  try {
    const token = req.params.token
    if (!token || token.length < 16) {
      res.status(404).json({ success: false, error: 'Report not found' }); return
    }

    const { data: client } = await db.from('clients')
      .select('id, company_name')
      .eq('share_token', token)
      .maybeSingle()

    if (!client) {
      res.status(404).json({ success: false, error: 'Report not found' }); return
    }

    // Trailing 7 days of email sends, bucketed by UTC day (zero-filled).
    const since = new Date(Date.now() - 6 * 86400000)
    since.setUTCHours(0, 0, 0, 0)

    // figsy_sent_emails has NO client_id column — scope it via the client's campaigns.
    const { data: shareCampRows } = await db.from('figsy_campaigns').select('id').eq('client_id', client.id)
    const shareCampaignIds = (shareCampRows ?? []).map((c: { id: string }) => c.id)
    const shareCampFilter = shareCampaignIds.length > 0 ? shareCampaignIds : ['00000000-0000-0000-0000-000000000000']

    const [sentRes, repliesRes, interestedRes, activeRes, dailyRes] = await Promise.all([
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', shareCampFilter),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('classification', 'hot'),
      db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'active'),
      db.from('figsy_sent_emails').select('sent_at').in('campaign_id', shareCampFilter).gte('sent_at', since.toISOString()),
    ])

    const buckets: Record<string, number> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(since.getTime() + i * 86400000)
      buckets[d.toISOString().split('T')[0]] = 0
    }
    for (const row of dailyRes.data ?? []) {
      const key = ((row as { sent_at: string }).sent_at).split('T')[0]
      if (key in buckets) buckets[key]++
    }
    const daily = Object.entries(buckets).map(([date, count]) => ({ date, count }))

    res.json({
      success: true,
      data: {
        companyName:     client.company_name ?? '',
        emailsSent:      sentRes.count ?? 0,
        totalReplies:    repliesRes.count ?? 0,
        interestedLeads: interestedRes.count ?? 0,
        activeCampaigns: activeRes.count ?? 0,
        daily,
        lastUpdated:     new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[share/:token]', err)
    res.status(500).json({ success: false, error: 'Failed to load report' })
  }
})
