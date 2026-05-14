import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { testCrmConnection } from '../lib/crm'

export const clientRouter = Router()
clientRouter.use(requireAuth)

clientRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const { data: client, error } = await db.from('clients').select('*, subscriptions(*), usage_metrics(*), auto_topup_enabled, auto_topup_threshold, auto_topup_plan, auto_topup_bundle_size').eq('user_id', req.userId!).single()
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
      company_name:      z.string().min(2).optional(),
      industry:          z.string().optional(),
      country:           z.string().optional(),
      website:           z.string().url().optional(),
      phone:             z.string().optional(),
      crm_type:          z.enum(['hubspot', 'pipedrive', 'none']).optional(),
      crm_api_key:       z.string().optional(),
      crm_sync_enabled:  z.boolean().optional(),
    }).parse(req.body)
    const { data, error } = await db.from('clients').update(body).eq('user_id', req.userId!).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Update failed' })
  }
})

clientRouter.post('/me/crm/test', async (req: AuthRequest, res) => {
  try {
    const { crm_type, crm_api_key } = z.object({
      crm_type:    z.enum(['hubspot', 'pipedrive']),
      crm_api_key: z.string().min(1),
    }).parse(req.body)
    const result = await testCrmConnection(crm_type, crm_api_key)
    res.json({ success: result.success, error: result.error })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Test failed' })
  }
})

clientRouter.patch('/me/auto-topup', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      auto_topup_enabled:     z.boolean(),
      auto_topup_threshold:   z.number().int().min(0).max(500),
      auto_topup_plan:        z.enum(['kind_ai', 'figsy']).optional(),
      auto_topup_bundle_size: z.number().int().positive().optional(),
    }).parse(req.body)
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    await db.from('clients').update(body).eq('id', client.id)
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to save auto top-up settings' })
  }
})

clientRouter.get('/me/notifications', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients')
      .select('id, credit_balance, subscriptions(status, trial_ends_at)')
      .eq('user_id', req.userId!).single()
    if (!client) { res.json({ success: true, data: [] }); return }

    const notifications: { id: string; type: string; title: string; message: string; created_at: string }[] = []
    const now = new Date()

    // Low credits
    if ((client.credit_balance ?? 0) < 10) {
      notifications.push({ id: 'low_credits', type: 'low_credits', title: 'Low credit balance', message: `You have ${client.credit_balance ?? 0} credits remaining. Top up to keep outreach running.`, created_at: now.toISOString() })
    }

    // Interested replies in last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
    const { data: interestedReplies } = await db.from('figsy_replies')
      .select('id, from_email, received_at')
      .eq('client_id', client.id)
      .eq('classification', 'interested')
      .gte('received_at', sevenDaysAgo)
      .order('received_at', { ascending: false })
      .limit(5)
    for (const r of interestedReplies ?? []) {
      notifications.push({ id: `reply_${r.id}`, type: 'interested_reply', title: 'Interested reply', message: `${r.from_email} replied positively to your outreach.`, created_at: r.received_at })
    }

    // New consented leads in last 48h
    const twoDaysAgo = new Date(now.getTime() - 48 * 3600000).toISOString()
    const { count: newConsented } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .eq('status', 'consent_given')
      .gte('consent_given_at', twoDaysAgo)
    if ((newConsented ?? 0) > 0) {
      notifications.push({ id: 'new_consented', type: 'new_consented_lead', title: `${newConsented} new consented lead${newConsented === 1 ? '' : 's'}`, message: 'New leads have given POPIA consent and are ready for outreach.', created_at: now.toISOString() })
    }

    // Trial expiring
    const subs = (client as any).subscriptions ?? []
    const trialing = subs.find((s: any) => s.status === 'trialing' && s.trial_ends_at)
    if (trialing) {
      const daysLeft = Math.ceil((new Date(trialing.trial_ends_at).getTime() - now.getTime()) / 86400000)
      if (daysLeft <= 3 && daysLeft >= 0) {
        notifications.push({ id: 'trial_expiring', type: 'trial_expiring', title: 'Trial expiring soon', message: `Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Add billing to keep access.`, created_at: now.toISOString() })
      }
    }

    // Sort by created_at desc
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    res.json({ success: true, data: notifications })
  } catch (err) { console.error(err); res.status(500).json({ success: false, data: [] }) }
})
