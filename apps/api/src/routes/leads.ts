import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import Anthropic from '@anthropic-ai/sdk'
import { sendConsentEmail } from '../lib/email'

export const leadRouter = Router()
leadRouter.use(requireAuth)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).single()
  return data?.id ?? null
}

// ── STATS ─────────────────────────────────────────────────────────────────────
leadRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const [total, scored, consented, exported_, optedOut] = await Promise.all([
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('score', 'is', null),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'consent_given'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'exported'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'opted_out'),
    ])

    const { data: avgData } = await db.from('leads').select('score, estimated_deal_value_usd')
      .eq('client_id', clientId).not('score', 'is', null)

    const avgScore = avgData?.length
      ? Math.round(avgData.reduce((sum: number, l: any) => sum + (l.score || 0), 0) / avgData.length)
      : 0
    const pipelineValueUsd = avgData?.reduce((sum: number, l: any) => sum + (l.estimated_deal_value_usd || 0), 0) ?? 0

    res.json({
      success: true,
      data: {
        total:              total.count || 0,
        scored:             scored.count || 0,
        consented:          consented.count || 0,
        exported:           exported_.count || 0,
        opted_out:          optedOut.count || 0,
        avg_score:          avgScore,
        pipeline_value_usd: pipelineValueUsd,
      },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch lead stats' }) }
})

// ── LIST ──────────────────────────────────────────────────────────────────────
leadRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, min_score, icp_id, apollo_consented, page = '1', limit = '50' } = req.query
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    let query = db.from('leads').select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .order('score', { ascending: false, nullsFirst: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1)

    if (status)           query = query.eq('status', status as string)
    if (min_score)        query = query.gte('score', Number(min_score))
    if (icp_id)           query = query.eq('icp_id', icp_id as string)
    if (apollo_consented) query = query.eq('apollo_consented', apollo_consented === 'true')

    const { data, count, error } = await query
    if (error) throw error
    res.json({ success: true, data, total: count, page: Number(page), limit: Number(limit) })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch leads' }) }
})

// ── CREATE ────────────────────────────────────────────────────────────────────
leadRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      icp_id:                    z.string().uuid().optional(),
      first_name:                z.string().min(1),
      last_name:                 z.string().default(''),
      email:                     z.string().email().optional(),
      phone:                     z.string().optional(),
      job_title:                 z.string().optional(),
      company:                   z.string().optional(),
      linkedin_url:              z.string().url().optional(),
      country:                   z.string().optional(),
      company_size:              z.string().optional(),
      industry:                  z.string().optional(),
      seniority:                 z.string().optional(),
      tech_stack:                z.array(z.string()).optional(),
      apollo_id:                 z.string().optional(),
      apollo_consented:          z.boolean().default(false),
      score:                     z.number().min(0).max(100).optional(),
      score_reasoning:           z.string().optional(),
      estimated_deal_value_usd:  z.number().optional(),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Blocklist check
    if (body.email) {
      const { data: blocked } = await db.from('opt_out_blocklist')
        .select('id').eq('email', body.email).is('opted_back_in_at', null).maybeSingle()
      if (blocked) {
        res.status(409).json({ success: false, error: 'Lead is on the opt-out blocklist', code: 'BLOCKLISTED' })
        return
      }
    }

    const { data, error } = await db.from('leads').insert({ ...body, client_id: clientId }).select().single()
    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to create lead' })
  }
})

// ── UPDATE STATUS ─────────────────────────────────────────────────────────────
leadRouter.patch('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { status } = z.object({
      status: z.enum(['pending', 'scored', 'consent_sent', 'consent_given', 'exported', 'rejected', 'opted_out']),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const now = new Date().toISOString()
    const extra: Record<string, unknown> = {}
    if (status === 'consent_sent')  extra.consent_sent_at = now
    if (status === 'consent_given') extra.consent_given_at = now
    if (status === 'exported')      extra.exported_at = now
    if (status === 'opted_out')     extra.opted_out_at = now

    const { data, error } = await db.from('leads')
      .update({ status, ...extra }).eq('id', req.params.id).eq('client_id', clientId).select().single()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update lead status' })
  }
})

// ── OPT-OUT (permanent, cross-client) ─────────────────────────────────────────
leadRouter.post('/:id/optout', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const { reason } = z.object({ reason: z.string().default('manual_block') }).parse(req.body)

    // Add to blocklist
    if (lead.email) {
      await db.from('opt_out_blocklist').upsert({
        email:                 lead.email,
        linkedin_url:          lead.linkedin_url,
        full_name:             `${lead.first_name} ${lead.last_name}`.trim(),
        reason,
        blocked_by_client_id:  clientId,
      }, { onConflict: 'email', ignoreDuplicates: false })
    }

    // Mark lead as opted out across ALL clients who have this email
    if (lead.email) {
      await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
        .eq('email', lead.email)
    } else {
      await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
        .eq('id', req.params.id)
    }

    res.json({ success: true, message: 'Lead permanently blocked' })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to block lead' }) }
})

// ── SEND POPIA CONSENT EMAIL ──────────────────────────────────────────────────
leadRouter.post('/:id/consent', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    if (!lead.email) { res.status(422).json({ success: false, error: 'Lead has no email address' }); return }

    if (lead.status === 'consent_given' || lead.status === 'opted_out') {
      res.status(409).json({ success: false, error: `Lead has already ${lead.status === 'consent_given' ? 'consented' : 'opted out'}` })
      return
    }

    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).single()

    const optOutUrl = `${process.env.PORTAL_URL}/consent?lead=${lead.id}&token=${lead.id}`
    await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl)

    await db.from('leads')
      .update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() })
      .eq('id', req.params.id)

    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to send consent email' }) }
})

// ── OPT-OUT BLOCKLIST LIST ─────────────────────────────────────────────────────
leadRouter.get('/blocklist', async (_req: AuthRequest, res) => {
  try {
    const { data, error } = await db.from('opt_out_blocklist')
      .select('*').is('opted_back_in_at', null).order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch blocklist' }) }
})

// ── AI EMAIL DRAFT ─────────────────────────────────────────────────────────────
leadRouter.post('/:id/draft-email', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const { data: client } = await db.from('clients').select('company_name, industry').eq('id', clientId).single()

    const prompt = `You are writing a cold outreach email on behalf of ${client?.company_name || 'our company'}.

Lead profile:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'unknown'}
- Company: ${lead.company || 'unknown'}
- Industry: ${lead.industry || 'unknown'}
- Country: ${lead.country || 'unknown'}
- Seniority: ${lead.seniority || 'unknown'}
${lead.tech_stack?.length ? `- Tech stack: ${lead.tech_stack.join(', ')}` : ''}

Write a short, personalised cold email (150 words max). It must:
1. Open with something specific to their role or company (not generic)
2. Mention one clear business outcome we can help with
3. End with a single, low-friction CTA (e.g. "Worth a 15-min call?")
4. Sound human — no corporate speak, no buzzwords
5. NOT include a subject line — just the email body

Output only the email body, nothing else.`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    })

    const draft = (message.content[0] as { type: string; text: string }).text

    await db.from('leads').update({ ai_email_draft: draft }).eq('id', req.params.id)

    res.json({ success: true, data: { draft } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to generate email draft' }) }
})

// ── CSV EXPORT ────────────────────────────────────────────────────────────────
leadRouter.get('/export/csv', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db.from('leads')
      .select('first_name,last_name,email,phone,job_title,company,linkedin_url,country,score,status,consent_given_at')
      .eq('client_id', clientId)
      .eq('status', 'consent_given')
      .order('score', { ascending: false, nullsFirst: false })

    if (error) throw error

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Job Title', 'Company', 'LinkedIn', 'Country', 'Score', 'Status', 'Consent Date']
    const rows = (data || []).map((l: any) => [
      l.first_name, l.last_name, l.email || '', l.phone || '',
      l.job_title || '', l.company || '', l.linkedin_url || '',
      l.country || '', l.score ?? '', l.status,
      l.consent_given_at ? new Date(l.consent_given_at).toLocaleDateString() : '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="kind-leads.csv"')
    res.send(csv)
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to export leads' }) }
})
