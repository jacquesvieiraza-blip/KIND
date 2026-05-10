import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { runLeadGeneration } from '../services/generate'

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

// POST /icps/:id/submit — submit ICP for admin review
icpRouter.post('/:id/submit', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db
      .from('icps')
      .update({ status: 'pending_review' })
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .select()
      .single()

    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'ICP not found' }); return }
    res.json({ success: true, data })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to submit ICP for review' })
  }
})

// POST /icps/:id/generate — start async lead generation job
icpRouter.post('/:id/generate', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: icp } = await db
      .from('icps')
      .select('id, status')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .single()
    if (!icp) { res.status(404).json({ success: false, error: 'ICP not found' }); return }
    if (icp.status !== 'approved' && icp.status !== 'draft') {
      res.status(403).json({ success: false, error: 'ICP must be approved before generating leads' })
      return
    }

    // Prevent duplicate running jobs
    const { data: running } = await db
      .from('lead_generation_jobs')
      .select('id')
      .eq('icp_id', req.params.id)
      .eq('status', 'running')
      .maybeSingle()
    if (running) {
      res.status(409).json({ success: false, error: 'A generation job is already running for this ICP' })
      return
    }

    const { data: job, error: jobErr } = await db
      .from('lead_generation_jobs')
      .insert({ client_id: clientId, icp_id: req.params.id, status: 'running' })
      .select()
      .single()
    if (jobErr || !job) throw jobErr ?? new Error('Failed to create job')

    // Fire and forget — runs in background
    setImmediate(() => runLeadGeneration(job.id, clientId, req.params.id))

    res.status(202).json({ success: true, data: { job_id: job.id } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to start generation' })
  }
})

// GET /icps/:id/jobs — recent generation jobs for an ICP
icpRouter.get('/:id/jobs', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db
      .from('lead_generation_jobs')
      .select('*')
      .eq('icp_id', req.params.id)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    res.json({ success: true, data: data ?? [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch jobs' })
  }
})
