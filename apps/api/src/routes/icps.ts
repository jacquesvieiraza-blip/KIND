import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { buildSearchBody, searchPeople } from '../lib/apollo'
import { scoreLeadsForIcp } from '../lib/scoring'
import { sendFirstLeadsReadyEmail } from '../lib/email'
import { suggestIcpFromWebsite } from '../lib/scrape'
import { autoEnrollLead } from '../lib/figsy'

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

async function runIcpJob(
  icpId: string,
  clientId: string,
  userId: string,
): Promise<{ inserted: number; skipped: number }> {
  const { data: icp, error: icpErr } = await db
    .from('icps').select('*').eq('id', icpId).eq('client_id', clientId).single()
  if (icpErr || !icp) throw new Error('ICP not found')

  const searchBody = buildSearchBody(icp)
  const contacts   = await searchPeople(searchBody)

  let inserted = 0
  let skipped  = 0
  const insertedIds: string[] = []

  for (const contact of contacts) {
    if (contact.email) {
      const { data: blocked } = await db.from('opt_out_blocklist')
        .select('id').eq('email', contact.email).is('opted_back_in_at', null).maybeSingle()
      if (blocked) { skipped++; continue }
    }

    if (contact.id) {
      const { data: existing } = await db.from('leads')
        .select('id').eq('client_id', clientId).eq('apollo_id', contact.id).maybeSingle()
      if (existing) { skipped++; continue }
    }

    const { data: newLead, error: insertErr } = await db.from('leads').insert({
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
    }).select('id').single()

    if (insertErr || !newLead) {
      skipped++
    } else {
      inserted++
      insertedIds.push(newLead.id)
    }
  }

  await db.from('icps').update({ last_run_at: new Date().toISOString() }).eq('id', icp.id)

  if (inserted > 0) {
    const { data: clientRow } = await db.from('clients')
      .select('id, company_name, referred_by, first_icp_run_at, credit_balance')
      .eq('id', clientId).single()

    scoreLeadsForIcp(insertedIds, icp, clientRow?.company_name ?? '').catch(console.error)

    // S5 — FIGSY auto-start: enroll pre-consented leads into any active campaign
    const { data: consentedLeads } = await db.from('leads')
      .select('id').in('id', insertedIds).eq('apollo_consented', true)
    for (const lead of consentedLeads ?? []) {
      autoEnrollLead(lead.id, clientId).catch(console.error)
    }

    if (clientRow && !clientRow.first_icp_run_at) {
      await db.from('clients')
        .update({ first_icp_run_at: new Date().toISOString(), credit_balance: (clientRow.credit_balance ?? 0) + 100 })
        .eq('id', clientId)

      if (clientRow.referred_by) {
        const { data: referrer } = await db.from('clients')
          .select('id, credit_balance').eq('id', clientRow.referred_by).single()
        if (referrer) {
          await db.from('clients')
            .update({ credit_balance: (referrer.credit_balance ?? 0) + 100 })
            .eq('id', referrer.id)
        }
      }

      try {
        const { data: { user } } = await db.auth.admin.getUserById(userId)
        const userEmail = user?.email ?? ''
        if (userEmail) {
          await sendFirstLeadsReadyEmail(userEmail, clientRow.company_name ?? '', inserted)
        }
      } catch (emailErr) {
        console.error('[icps] first-leads email failed:', emailErr)
      }
    }
  }

  return { inserted, skipped }
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

icpRouter.post('/prefill', async (req: AuthRequest, res) => {
  try {
    const { website_url } = z.object({ website_url: z.string().url() }).parse(req.body)
    const suggestions = await suggestIcpFromWebsite(website_url)
    res.json({ success: true, data: suggestions })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[icps/prefill]', err)
    res.status(422).json({ success: false, error: err instanceof Error ? err.message : 'Failed to analyse website' })
  }
})

icpRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const body = icpSchema.parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('icps').insert({ ...body, client_id: clientId }).select().single()
    if (error) throw error
    runIcpJob(data.id, clientId, req.userId!).catch(console.error)
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

    const { inserted, skipped } = await runIcpJob(req.params.id, clientId, req.userId!)

    res.json({ success: true, data: { inserted, skipped, total: inserted + skipped } })
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
