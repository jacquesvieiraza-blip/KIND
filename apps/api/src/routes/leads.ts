import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const leadRouter = Router()
leadRouter.use(requireAuth)

leadRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const [total, scored, consented, exported] = await Promise.all([
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).not('score', 'is', null),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'consent_given'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('status', 'exported'),
    ])
    const { data: avgData } = await db.from('leads').select('score').eq('client_id', client.id).not('score', 'is', null)
    const avgScore = avgData?.length ? Math.round(avgData.reduce((sum, l) => sum + (l.score || 0), 0) / avgData.length) : 0
    res.json({ success: true, data: { total: total.count || 0, scored: scored.count || 0, consented: consented.count || 0, exported: exported.count || 0, avg_score: avgScore } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch lead stats' }) }
})

leadRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, min_score, page = '1', limit = '50' } = req.query
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    let query = db.from('leads').select('*', { count: 'exact' }).eq('client_id', client.id).order('score', { ascending: false }).range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1)
    if (status) query = query.eq('status', status as string)
    if (min_score) query = query.gte('score', Number(min_score))
    const { data, count, error } = await query
    if (error) throw error
    res.json({ success: true, data, total: count, page: Number(page), limit: Number(limit) })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch leads' }) }
})
