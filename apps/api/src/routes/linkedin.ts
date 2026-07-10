import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { db } from '@kind/db'
import { generateLinkedInNote, enqueueLinkedInStep, dispatchLinkedInStep } from '../lib/linkedin'

export const linkedinRouter = Router()
linkedinRouter.use(requireAuth)

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// GET /api/linkedin/queue — list pending LinkedIn steps for this client
linkedinRouter.get('/queue', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }

    const { data, error } = await db
      .from('figsy_linkedin_queue')
      .select(`
        id, linkedin_url, connection_note, status, created_at,
        leads ( first_name, last_name, job_title, company )
      `)
      .eq('client_id', clientId)
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    res.json({ queue: data })
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/linkedin/enqueue — generate note + enqueue a LinkedIn step
linkedinRouter.post('/enqueue', async (req: AuthRequest, res) => {
  const schema = z.object({
    lead_id: z.string().uuid(),
    campaign_id: z.string().uuid().nullable().optional(),
    icp_context: z.string().max(300).optional()
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return }

  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }

    const { lead_id, campaign_id, icp_context } = parsed.data

    const { data: lead, error: leadErr } = await db
      .from('leads')
      .select('first_name, last_name, job_title, company, industry, linkedin_url')
      .eq('id', lead_id)
      .eq('client_id', clientId)
      .single()

    if (leadErr || !lead) { res.status(404).json({ error: 'Lead not found' }); return }
    if (!lead.linkedin_url) { res.status(400).json({ error: 'Lead has no LinkedIn URL' }); return }

    const note = await generateLinkedInNote(lead, icp_context ?? 'B2B software decision-maker in Africa')
    const queueId = await enqueueLinkedInStep({
      clientId,
      campaignId: campaign_id ?? null,
      leadId: lead_id,
      linkedinUrl: lead.linkedin_url,
      connectionNote: note
    })

    res.json({ queue_id: queueId, connection_note: note, status: 'pending' })
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/linkedin/approve/:id — approve a pending step (triggers dispatch)
linkedinRouter.post('/approve/:id', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }

    const { id } = req.params

    const { data, error } = await db
      .from('figsy_linkedin_queue')
      .update({ status: 'approved' })
      .eq('id', id)
      .eq('client_id', clientId)
      .select('id')
      .single()

    if (error || !data) { res.status(404).json({ error: 'Step not found' }); return }

    const result = await dispatchLinkedInStep(id)
    res.json({ ...result, queue_id: id })
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message })
  }
})

// POST /api/linkedin/skip/:id — skip a pending step
linkedinRouter.post('/skip/:id', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ error: 'Client not found' }); return }

    const { id } = req.params

    await db.from('figsy_linkedin_queue')
      .update({ status: 'skipped' })
      .eq('id', id)
      .eq('client_id', clientId)
    res.json({ skipped: true })
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message })
  }
})
