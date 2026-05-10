import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const clientRouter = Router()

clientRouter.use(requireAuth)

// GET /clients/me — fetch own client profile + subscriptions
clientRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const { data: client, error } = await db
      .from('clients')
      .select('*, subscriptions(*), usage_metrics(*)')
      .eq('user_id', req.userId!)
      .single()

    if (error || !client) {
      res.status(404).json({ success: false, error: 'Client not found' })
      return
    }

    res.json({ success: true, data: client })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch client' })
  }
})

// PATCH /clients/me — update client profile
const updateSchema = z.object({
  company_name: z.string().min(2).optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  website: z.union([z.string().url(), z.literal('')]).optional(),
  phone: z.string().optional(),
})

clientRouter.patch('/me', async (req: AuthRequest, res) => {
  try {
    const body = updateSchema.parse(req.body)

    const { data, error } = await db
      .from('clients')
      .update(body)
      .eq('user_id', req.userId!)
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ success: false, error: err.errors })
      return
    }
    console.error(err)
    res.status(500).json({ success: false, error: 'Update failed' })
  }
})

// GET /clients/me/usage — current period usage metrics
clientRouter.get('/me/usage', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('user_id', req.userId!)
      .single()

    if (!client) {
      res.status(404).json({ success: false, error: 'Client not found' })
      return
    }

    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data } = await db
      .from('usage_metrics')
      .select('*')
      .eq('client_id', client.id)
      .gte('period_start', periodStart)
      .order('period_start', { ascending: false })
      .limit(1)
      .single()

    res.json({ success: true, data: data || null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch usage' })
  }
})
