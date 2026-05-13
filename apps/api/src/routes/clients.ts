import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const clientRouter = Router()
clientRouter.use(requireAuth)

clientRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const { data: client, error } = await db.from('clients').select('*, subscriptions(*), usage_metrics(*)').eq('user_id', req.userId!).single()
    if (error || !client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    res.json({ success: true, data: client })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch client' }) }
})

clientRouter.get('/me/usage', async (req: AuthRequest, res) => {
  try {
    const { data: client, error: clientErr } = await db
      .from('clients')
      .select('id, subscriptions(current_period_start, current_period_end)')
      .eq('user_id', req.userId!)
      .single()
    if (clientErr || !client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const clientId = client.id
    const sub = Array.isArray(client.subscriptions)
      ? client.subscriptions[0]
      : client.subscriptions

    const now = new Date()
    let periodStart: string
    let periodEnd: string

    if (sub?.current_period_start) {
      periodStart = sub.current_period_start
      periodEnd = sub.current_period_end ?? new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    }

    const { count } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('created_at', periodStart)
      .neq('status', 'opted_out')

    const INCLUDED = 100
    const leadsThisPeriod = count ?? 0
    const overageLeads    = Math.max(0, leadsThisPeriod - INCLUDED)

    res.json({
      success: true,
      data: {
        leads_this_period: leadsThisPeriod,
        period_start:      periodStart,
        period_end:        periodEnd,
        included_leads:    INCLUDED,
        overage_leads:     overageLeads,
      },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch usage' }) }
})

clientRouter.patch('/me', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      company_name: z.string().min(2).optional(),
      industry: z.string().optional(),
      country: z.string().optional(),
      website: z.string().url().optional(),
      phone: z.string().optional(),
    }).parse(req.body)
    const { data, error } = await db.from('clients').update(body).eq('user_id', req.userId!).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Update failed' })
  }
})
