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
