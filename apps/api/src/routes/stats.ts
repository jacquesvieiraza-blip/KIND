/**
 * Public platform stats endpoint — no auth required.
 * Powers the live activity counters on the K.I.N.D website.
 * Returns cumulative real numbers from the platform.
 */

import { Router, Request, Response } from 'express'
import { db } from '@kind/db'

export const statsRouter = Router()

statsRouter.get('/platform', async (_req: Request, res: Response) => {
  try {
    const [
      { count: totalLeads },
      { count: totalEmailsSent },
      { count: totalReplies },
      { count: totalInterested },
      { count: totalClients },
      { count: totalCampaigns },
    ] = await Promise.all([
      db.from('leads').select('id', { count: 'exact', head: true }),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('classification', 'interested'),
      db.from('clients').select('id', { count: 'exact', head: true }),
      db.from('figsy_campaigns').select('id', { count: 'exact', head: true }),
    ])

    const replyRate = totalEmailsSent && totalEmailsSent > 0
      ? Math.round(((totalReplies ?? 0) / totalEmailsSent) * 1000) / 10
      : 0

    res.json({
      success: true,
      data: {
        leads_sourced:      totalLeads       ?? 0,
        emails_sent:        totalEmailsSent  ?? 0,
        total_replies:      totalReplies     ?? 0,
        interested_replies: totalInterested  ?? 0,
        reply_rate_pct:     replyRate,
        active_clients:     totalClients     ?? 0,
        campaigns_run:      totalCampaigns   ?? 0,
        as_of:              new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('[stats/platform]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch platform stats' })
  }
})
