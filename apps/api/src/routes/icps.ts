import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { buildSearchBody, searchPeople } from '../lib/apollo'

export const icpRouter = Router()
icpRouter.use(requireAuth)

const icpSchema = z.object({
  name:                  z.string().min(1),
  industries:            z.array(z.string()).default([]),
  job_titles:            z.array(z.string()).default([]),
  seniority_levels:      z.array(z.string()).default([]),
  company_sizes:         z.array(z.string()).default([]),
  geographies:           z.array(z.string()).default([]),
  tech_stack:            z.array(z.string()).default([]),
  keywords:              z.array(z.string()).default([]),
  apollo_only_consented: z.boolean().default(true),
})

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).single()
  return data?.id ?? null
}

icpRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('icps').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch ICPs' }) }
})

icpRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const body = icpSchema.parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('icps').insert({ ...body, client_id: clientId }).select().single()
    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to create ICP' })
  }
})

icpRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const body = icpSchema.partial().parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('icps')
      .update(body).eq('id', req.params.id).eq('client_id', clientId).select().single()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'ICP not found' }); return }
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update ICP' })
  }
})

icpRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { error } = await db.from('icps').delete().eq('id', req.params.id).eq('client_id', clientId)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to delete ICP' }) }
})

// ── RUN ICP — search Apollo and insert matched leads ──────────────────────────
icpRouter.post('/:id/run', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: icp, error: icpErr } = await db
      .from('icps').select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (icpErr || !icp) { res.status(404).json({ success: false, error: 'ICP not found' }); return }

    const searchBody = buildSearchBody(icp)
    const contacts   = await searchPeople(searchBody)

    let inserted = 0
    let skipped  = 0

    for (const contact of contacts) {
      // Skip permanently opted-out emails
      if (contact.email) {
        const { data: blocked } = await db.from('opt_out_blocklist')
          .select('id').eq('email', contact.email).is('opted_back_in_at', null).maybeSingle()
        if (blocked) { skipped++; continue }
      }

      // Skip duplicates by apollo_id for this client
      if (contact.id) {
        const { data: existing } = await db.from('leads')
          .select('id').eq('client_id', clientId).eq('apollo_id', contact.id).maybeSingle()
        if (existing) { skipped++; continue }
      }

      const { error: insertErr } = await db.from('leads').insert({
        client_id:        clientId,
        icp_id:           icp.id,
        first_name:       contact.first_name || '',
        last_name:        contact.last_name  || '',
        email:            contact.email      || null,
        job_title:        contact.title      || null,
        company:          contact.organization?.name ?? contact.organization_name ?? null,
        linkedin_url:     contact.linkedin_url || null,
        country:          contact.country    || null,
        industry:         contact.organization?.industry || null,
        company_size:     contact.organization?.num_employees
                            ? String(contact.organization.num_employees) : null,
        seniority:        contact.seniority  || null,
        tech_stack:       contact.organization?.technology_names ?? [],
        apollo_id:        contact.id,
        apollo_consented: contact.email_status === 'verified' ||
                          contact.email_status === 'likely_to_engage',
        status:           'pending',
      })

      insertErr ? skipped++ : inserted++
    }

    // Record when this ICP was last run (column added via migration below)
    await db.from('icps').update({ last_run_at: new Date().toISOString() }).eq('id', icp.id)

    res.json({ success: true, data: { inserted, skipped, total: contacts.length } })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to run ICP',
    })
  }
})

icpRouter.patch('/:id/activate', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    await db.from('icps').update({ is_active: false }).eq('client_id', clientId)
    const { data, error } = await db.from('icps')
      .update({ is_active: true }).eq('id', req.params.id).eq('client_id', clientId).select().single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to activate ICP' }) }
})
