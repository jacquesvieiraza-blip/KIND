import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const icpRouter = Router()

icpRouter.use(requireAuth)

const icpSchema = z.object({
  industries: z.array(z.string()).min(1, 'At least one industry required'),
  job_titles: z.array(z.string()).min(1, 'At least one job title required'),
  company_sizes: z.array(z.string()),
  locations: z.array(z.string()),
  keywords: z.array(z.string()),
})

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).single()
  return data?.id ?? null
}

// GET /icps — list all ICPs for the authenticated client
icpRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db
      .from('icps')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, data: data ?? [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch ICPs' })
  }
})

// POST /icps — create a new ICP
icpRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const body = icpSchema.parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db
      .from('icps')
      .insert({ ...body, client_id: clientId })
      .select()
      .single()

    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to create ICP' })
  }
})

// PATCH /icps/:id — update an existing ICP
icpRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const body = icpSchema.partial().parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db
      .from('icps')
      .update(body)
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .select()
      .single()

    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'ICP not found' }); return }
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to update ICP' })
  }
})

// DELETE /icps/:id — delete an ICP
icpRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { error } = await db
      .from('icps')
      .delete()
      .eq('id', req.params.id)
      .eq('client_id', clientId)

    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to delete ICP' })
  }
})
