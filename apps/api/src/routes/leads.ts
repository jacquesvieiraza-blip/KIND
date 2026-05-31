import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import Anthropic from '@anthropic-ai/sdk'
import { pushToCrm } from '../lib/crm'
import { sendConsentEmail } from '../lib/email'
import { searchPeople, buildSearchBody } from '../lib/apollo'
import { scoreLeadsForIcp } from '../lib/scoring'
import { getOrCreateConsentToken, buildConsentUrl } from '../lib/consent'

export const leadRouter = Router()

// ── PUBLIC: POPIA consent callback (no auth — lead clicks link in email) ───────
leadRouter.post('/public/consent', async (req, res) => {
  try {
    const { token, consent } = z.object({
      // lead_id is still accepted from the link for backwards compatibility but
      // is no longer trusted — the secure token is the sole proof of identity.
      lead_id: z.string().uuid().optional(),
      token:   z.string().min(1),
      consent: z.boolean(),
    }).parse(req.body)

    // Look the lead up by its unguessable consent token. A valid token IS the
    // authorisation; there is no separate id-equality check to bypass.
    const { data: lead, error: leadErr } = await db.from('leads')
      .select('id, email, first_name, last_name, linkedin_url, status, client_id')
      .eq('consent_token', token).single()

    if (leadErr || !lead) {
      res.status(404).json({ success: false, error: 'Lead not found' }); return
    }

    if (lead.status === 'consent_given' || lead.status === 'opted_out') {
      res.json({ success: true, already_processed: true, status: lead.status }); return
    }

    if (consent) {
      await db.from('leads')
        .update({ status: 'consent_given', consent_given_at: new Date().toISOString() })
        .eq('id', lead.id)

      // Fire-and-forget CRM push
      if (lead.email) {
        const { data: client } = await db.from('clients')
          .select('crm_type, crm_api_key, crm_sync_enabled').eq('id', lead.client_id).maybeSingle()
        if (client?.crm_sync_enabled && client?.crm_type && client?.crm_api_key) {
          const { pushToCrm } = await import('../lib/crm')
          pushToCrm(client.crm_type as any, client.crm_api_key, lead as any).catch(console.error)
        }
      }

      res.json({ success: true, status: 'consent_given' })
    } else {
      if (lead.email) {
        await db.from('opt_out_blocklist').upsert({
          email:                lead.email,
          linkedin_url:         lead.linkedin_url,
          full_name:            `${lead.first_name} ${lead.last_name}`.trim(),
          reason:               'lead_declined_consent',
          blocked_by_client_id: lead.client_id,
        }, { onConflict: 'email', ignoreDuplicates: false })

        await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
          .eq('email', lead.email)
      } else {
        await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
          .eq('id', lead.id)
      }

      res.json({ success: true, status: 'opted_out' })
    }
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[leads/public/consent]', err)
    res.status(500).json({ success: false, error: 'Failed to process consent' })
  }
})

leadRouter.use(requireAuth)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// ── STATS ─────────────────────────────────────────────────────────────────────
leadRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Use allSettled so one failed count doesn't blank the whole stats panel
    const [total, scored, consented, exported_, optedOut] = (await Promise.allSettled([
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('score', 'is', null),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'consent_given'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'exported'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'opted_out'),
    ])).map(r => r.status === 'fulfilled' ? r.value : { count: 0 })

    const { data: avgData } = await db.from('leads').select('score, estimated_deal_value_usd')
      .eq('client_id', clientId).not('score', 'is', null)

    const avgScore = avgData?.length
      ? Math.round(avgData.reduce((sum: number, l: any) => sum + (Number(l.score) || 0), 0) / avgData.length)
      : 0
    const pipelineValueUsd = avgData?.reduce((sum: number, l: any) => sum + (Number(l.estimated_deal_value_usd) || 0), 0) ?? 0

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

    if (status) {
      const statusValues = (status as string).split(',')
      query = statusValues.length > 1
        ? query.in('status', statusValues)
        : query.eq('status', statusValues[0])
    }
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

// ── BULK STATUS UPDATE ────────────────────────────────────────────────────────
leadRouter.post('/bulk-status', async (req: AuthRequest, res) => {
  try {
    const { leadIds, status } = z.object({
      leadIds: z.array(z.string().uuid()).min(1).max(100),
      status:  z.enum(['pending', 'scored', 'consent_sent', 'consent_given', 'exported', 'rejected', 'opted_out']),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: updated, error } = await db.from('leads')
      .update({ status })
      .in('id', leadIds)
      .eq('client_id', clientId)
      .select('id')

    if (error) throw error
    res.json({ success: true, updated: updated?.length ?? 0 })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update lead statuses' })
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

    // Auto-push to CRM when consent given
    if (status === 'consent_given') {
      const { data: client } = await db.from('clients')
        .select('crm_type, crm_api_key, crm_sync_enabled').eq('id', clientId).single()
      if (client?.crm_sync_enabled && client.crm_type && client.crm_api_key && client.crm_type !== 'none') {
        pushToCrm(client.crm_type, client.crm_api_key, data).then(result => {
          if (result.contact_id) {
            db.from('leads').update({ crm_contact_id: result.contact_id, crm_synced: true }).eq('id', data.id)
          }
        }).catch(console.error)
      }
    }

    res.json({ success: true, data })

    // ── P0-11: Auto-fire consent email when lead status → approved/scored ────────
    // When a lead is approved (status = scored with score >= threshold), auto-send consent
    // if RESEND_API_KEY is set and consent has not yet been sent.
    if (status === 'scored' && data.email && !data.consent_sent_at) {
      ;(async () => {
        try {
          if (!process.env.RESEND_API_KEY) return
          const { data: clientForConsent } = await db.from('clients')
            .select('company_name').eq('id', clientId).maybeSingle()
          const { data: freshLead } = await db.from('leads')
            .select('id, email, first_name, consent_sent_at, consent_token, status')
            .eq('id', data.id).maybeSingle()
          if (!freshLead || freshLead.consent_sent_at || freshLead.status === 'opted_out') return
          const token = await getOrCreateConsentToken(freshLead)
          const consentUrl = buildConsentUrl(freshLead.id, token)
          await sendConsentEmail(freshLead.email!, freshLead.first_name, clientForConsent?.company_name ?? '', consentUrl)
          await db.from('leads').update({
            status: 'consent_sent',
            consent_sent_at: new Date().toISOString(),
            consent_auto_fired: true,
          }).eq('id', data.id)
        } catch (autoConsentErr) {
          console.error('[leads/auto-consent]', autoConsentErr)
        }
      })()
    }
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

    const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
    await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl)

    await db.from('leads')
      .update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() })
      .eq('id', req.params.id)

    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to send consent email' }) }
})

// ── RESEND CONSENT EMAIL (for already-sent leads that haven't responded) ─────
leadRouter.post('/:id/resend-consent', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: lead } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }
    if (!lead.email) { res.status(422).json({ success: false, error: 'Lead has no email' }); return }
    if (lead.status === 'consent_given') { res.status(409).json({ success: false, error: 'Already consented' }); return }
    if (lead.status === 'opted_out') { res.status(409).json({ success: false, error: 'Lead has opted out' }); return }
    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).maybeSingle()
    const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
    await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl)
    await db.from('leads').update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() }).eq('id', req.params.id)
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to resend consent email' }) }
})

// ── BULK CONSENT SEND (/leads/consent/bulk) ───────────────────────────────────
leadRouter.post('/consent/bulk', async (req: AuthRequest, res) => {
  try {
    const { leadIds } = z.object({
      leadIds: z.array(z.string().uuid()).min(1).max(50),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: leads } = await db.from('leads')
      .select('id, email, first_name, last_name, apollo_consented, consent_sent_at, status, consent_token')
      .in('id', leadIds)
      .eq('client_id', clientId)

    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).single()

    let sent = 0
    let alreadySent = 0
    let alreadyConsented = 0
    let optedOut = 0

    for (const lead of leads ?? []) {
      if (lead.apollo_consented)              { alreadyConsented++; continue }
      if (lead.status === 'opted_out')        { optedOut++;         continue }
      if (lead.consent_sent_at)              { alreadySent++;      continue }
      if (!lead.email)                        { alreadySent++;      continue }

      try {
        const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
        await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl)
        await db.from('leads')
          .update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() })
          .eq('id', lead.id)
        sent++
      } catch (err) {
        console.error('[leads/consent/bulk] lead', lead.id, err)
      }
    }

    const skipped = alreadySent + alreadyConsented + optedOut
    res.json({
      success: true,
      sent,
      skipped,
      skippedReasons: { alreadySent, alreadyConsented, optedOut },
    })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[leads/consent/bulk]', err)
    res.status(500).json({ success: false, error: 'Failed to send bulk consent' })
  }
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

// ── AI ENRICHMENT ─────────────────────────────────────────────────────────────
leadRouter.post('/:id/enrich', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    // Check for cached enrichment less than 7 days old
    try {
      const { data: existing } = await db.from('lead_enrichment')
        .select('*').eq('lead_id', req.params.id).maybeSingle()

      if (existing?.enriched_at) {
        const enrichedAt = new Date(existing.enriched_at)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        if (enrichedAt > sevenDaysAgo) {
          res.json({ success: true, data: existing, cached: true }); return
        }
      }
    } catch (cacheErr: any) {
      // Table doesn't exist yet — fall through to Claude call
      if (!String(cacheErr?.message ?? '').includes('does not exist')) {
        console.error('[leads/enrich] cache check error', cacheErr)
      }
    }

    const prompt = `You are a B2B sales researcher. Given the following lead profile, generate research that will help a sales rep reach out at exactly the right moment.

Lead profile:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'unknown'}
- Company: ${lead.company || 'unknown'}
- LinkedIn: ${lead.linkedin_url || 'not available'}
- Industry: ${lead.industry || 'unknown'}
- Country: ${lead.country || 'unknown'}
- Seniority: ${lead.seniority || 'unknown'}

Generate a JSON object with EXACTLY these fields (no extra text, no markdown, just valid JSON):
{
  "recent_signal": "One sentence about a timely reason to reach out now — e.g. funding round, product launch, leadership change, hiring surge, or industry trend affecting them",
  "company_context": "One sentence summarising what the company does and their current growth/market position",
  "opening_line": "A personalised first line for a cold email, max 20 words, referencing something specific about them or their company. Do NOT start with I or We.",
  "enrichment_score": <integer 1-10 rating how strong the outreach signal is, where 10 = perfect timing>
}

Output ONLY the JSON object, nothing else.`

    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    })

    const rawText = (message.content[0] as { type: string; text: string }).text.trim()
    let enrichment: { recent_signal: string; company_context: string; opening_line: string; enrichment_score: number }
    try {
      enrichment = JSON.parse(rawText)
    } catch {
      // Try to extract JSON from the response if wrapped in markdown
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Claude returned invalid JSON')
      enrichment = JSON.parse(jsonMatch[0])
    }

    // Validate enrichment_score
    enrichment.enrichment_score = Math.max(1, Math.min(10, Math.round(Number(enrichment.enrichment_score) || 5)))

    const row = {
      lead_id:          req.params.id,
      recent_signal:    enrichment.recent_signal,
      company_context:  enrichment.company_context,
      opening_line:     enrichment.opening_line,
      enrichment_score: enrichment.enrichment_score,
      enriched_at:      new Date().toISOString(),
    }

    try {
      const { error: upsertErr } = await db.from('lead_enrichment')
        .upsert(row, { onConflict: 'lead_id' })
      if (upsertErr) throw upsertErr
    } catch (dbErr: any) {
      const msg = String(dbErr?.message ?? '')
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42P01')) {
        res.status(503).json({ success: false, error: 'Run migrations first' }); return
      }
      throw dbErr
    }

    res.json({ success: true, data: row, cached: false })
  } catch (err) { console.error('[leads/enrich]', err); res.status(500).json({ success: false, error: 'Failed to enrich lead' }) }
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

// ── BULK CONSENT SEND ─────────────────────────────────────────────────────────
// POST /leads/bulk-consent
leadRouter.post('/bulk-consent', async (req: AuthRequest, res) => {
  try {
    const { lead_ids } = z.object({
      lead_ids: z.array(z.string().uuid()).min(1).max(100),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: leads } = await db.from('leads')
      .select('id, email, first_name, last_name, status, consent_token')
      .in('id', lead_ids)
      .eq('client_id', clientId)

    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).single()

    let sent = 0, skipped = 0
    for (const lead of leads ?? []) {
      if (!lead.email || lead.status === 'opted_out' || lead.status === 'consent_given' || lead.status === 'consent_sent') {
        skipped++; continue
      }
      try {
        const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
        await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl)
        await db.from('leads').update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() }).eq('id', lead.id)
        sent++
      } catch { skipped++ }
    }

    res.json({ success: true, data: { sent, skipped } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to send bulk consent' })
  }
})

// ── BULK EXPORT (POST) ────────────────────────────────────────────────────────
leadRouter.post('/bulk-export', async (req: AuthRequest, res) => {
  try {
    const { leadIds } = z.object({
      leadIds: z.array(z.string().uuid()).optional(),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const EXPORT_LIMIT = 5000
    let query = db.from('leads')
      .select('first_name,last_name,email,phone,job_title,company,industry,country,score,status,created_at')
      .eq('client_id', clientId)
      .order('score', { ascending: false, nullsFirst: false })
      .limit(EXPORT_LIMIT)

    if (leadIds && leadIds.length > 0) {
      query = query.in('id', leadIds)
    }

    const { data, error } = await query
    if (error) throw error

    const date = new Date().toISOString().slice(0, 10)
    if ((data?.length ?? 0) >= EXPORT_LIMIT) {
      res.setHeader('X-Export-Truncated', 'true')
      res.setHeader('X-Export-Limit', String(EXPORT_LIMIT))
    }
    const headers = ['first_name', 'last_name', 'email', 'phone', 'job_title', 'company', 'industry', 'country', 'score', 'status', 'created_at']
    const rows = (data || []).map((l: any) => [
      l.first_name, l.last_name, l.email || '', l.phone || '',
      l.job_title || '', l.company || '', l.industry || '',
      l.country || '', l.score ?? '', l.status,
      l.created_at ? new Date(l.created_at).toLocaleDateString() : '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="kind-leads-${date}.csv"`)
    res.send(csv)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to export leads' })
  }
})

// ── CSV EXPORT ────────────────────────────────────────────────────────────────
// ── GET /leads/analytics — monthly time-series for portal analytics page ──────
leadRouter.get('/analytics', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const [
      { data: leads },
      { data: emails },
      { data: replies },
      { data: icps },
    ] = await Promise.all([
      db.from('leads').select('id, created_at, score, status, icp_id, industry, seniority').eq('client_id', clientId),
      db.from('figsy_sent_emails').select('id, created_at').eq('client_id', clientId),
      db.from('figsy_replies').select('id, created_at, classification').eq('client_id', clientId),
      db.from('icps').select('id, name').eq('client_id', clientId),
    ])

    // Monthly buckets — last 6 months
    const months: { key: string; label: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
      months.push({ key, label })
    }

    const byMonth = months.map(m => {
      const mLeads   = (leads   || []).filter((l: any) => l.created_at?.slice(0,7) === m.key)
      const mEmails  = (emails  || []).filter((e: any) => e.created_at?.slice(0,7) === m.key)
      const mReplies = (replies || []).filter((r: any) => r.created_at?.slice(0,7) === m.key)
      const mInterested = mReplies.filter((r: any) => r.classification === 'interested' || r.classification === 'hot')
      return {
        month:      m.label,
        leads:      mLeads.length,
        emails:     mEmails.length,
        replies:    mReplies.length,
        interested: mInterested.length,
      }
    })

    // ICP breakdown
    const icpMap: Record<string, { id: string; name: string; leads: number; avg_score: number }> = {}
    for (const icp of (icps || [])) {
      const icpLeads = (leads || []).filter((l: any) => l.icp_id === icp.id)
      const scores   = icpLeads.map((l: any) => Number(l.score)).filter(Boolean)
      icpMap[icp.id] = {
        id:        icp.id,
        name:      icp.name,
        leads:     icpLeads.length,
        avg_score: scores.length ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0,
      }
    }
    const icpBreakdown = Object.values(icpMap).sort((a, b) => b.leads - a.leads).slice(0, 8)

    // Score distribution (buckets: 0–19, 20–39, 40–59, 60–79, 80–100)
    const scoredLeads = (leads || []).filter((l: any) => l.score != null)
    const scoreDist = [
      { label: '0–19',   count: scoredLeads.filter((l: any) => l.score < 20).length },
      { label: '20–39',  count: scoredLeads.filter((l: any) => l.score >= 20 && l.score < 40).length },
      { label: '40–59',  count: scoredLeads.filter((l: any) => l.score >= 40 && l.score < 60).length },
      { label: '60–79',  count: scoredLeads.filter((l: any) => l.score >= 60 && l.score < 80).length },
      { label: '80–100', count: scoredLeads.filter((l: any) => l.score >= 80).length },
    ]

    // Top industries
    const industryCounts: Record<string, number> = {}
    for (const l of (leads || []) as any[]) {
      if (l.industry) industryCounts[l.industry] = (industryCounts[l.industry] ?? 0) + 1
    }
    const topIndustries = Object.entries(industryCounts)
      .sort(([,a],[,b]) => b - a).slice(0, 6)
      .map(([industry, count]) => ({ industry, count }))

    res.json({
      success: true,
      data: { byMonth, icpBreakdown, scoreDist, topIndustries },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch analytics' }) }
})

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

// ── IMPORT FROM LINKEDIN / ZOOMINFO CSV ───────────────────────────────────────
leadRouter.post('/import/linkedin', async (req: AuthRequest, res) => {
  try {
    const { leads } = z.object({
      leads: z.array(z.object({
        first_name:   z.string().optional(),
        last_name:    z.string().optional(),
        email:        z.string().email().optional(),
        phone:        z.string().optional(),
        job_title:    z.string().optional(),
        company:      z.string().optional(),
        linkedin_url: z.string().optional(),
        country:      z.string().optional(),
        company_size: z.string().optional(),
        industry:     z.string().optional(),
        seniority:    z.string().optional(),
      })).min(1).max(500),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Fetch existing emails to deduplicate
    const emails = leads.map(l => l.email).filter(Boolean) as string[]
    const existingSet = new Set<string>()
    if (emails.length) {
      const { data: existing } = await db.from('leads')
        .select('email').eq('client_id', clientId).in('email', emails)
      existing?.forEach((r: any) => r.email && existingSet.add(r.email.toLowerCase()))
    }

    // Fetch blocklist
    const { data: blocklisted } = await db.from('opt_out_blocklist')
      .select('email').in('email', emails)
    const blockSet = new Set((blocklisted ?? []).map((r: any) => r.email?.toLowerCase()))

    let created = 0, skipped = 0, errors = 0
    const insertedIds: string[] = []

    for (const lead of leads) {
      const emailLower = lead.email?.toLowerCase()
      if (emailLower && (existingSet.has(emailLower) || blockSet.has(emailLower))) {
        skipped++
        continue
      }
      const { data: row, error } = await db.from('leads').insert({
        client_id:    clientId,
        first_name:   lead.first_name || 'Unknown',
        last_name:    lead.last_name || '',
        email:        lead.email || null,
        phone:        lead.phone || null,
        job_title:    lead.job_title || null,
        company:      lead.company || null,
        linkedin_url: lead.linkedin_url || null,
        country:      lead.country || null,
        company_size: lead.company_size || null,
        industry:     lead.industry || null,
        seniority:    lead.seniority || null,
        status:       'pending',
        source:       'linkedin_csv',
      }).select('id').single()
      if (error) { errors++; continue }
      created++
      if (row?.id) insertedIds.push(row.id)
    }

    // Fire-and-forget scoring against the client's most recent ICP
    if (insertedIds.length > 0) {
      const { data: icpRow } = await db.from('icps')
        .select('*').eq('client_id', clientId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      const { data: clientRow } = await db.from('clients')
        .select('company_name').eq('id', clientId).maybeSingle()
      if (icpRow) {
        scoreLeadsForIcp(insertedIds, icpRow as any, clientRow?.company_name ?? '').catch(console.error)
      }
    }

    res.json({ success: true, data: { created, skipped, errors } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to import leads' })
  }
})

// ── AI RESEARCH PER LEAD (P1-12) ──────────────────────────────────────────────
// GET /leads/:id/research
// Returns a 3-bullet research summary for a lead (cached in research_summary column)
leadRouter.get('/:id/research', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('id, first_name, last_name, job_title, company, industry, country, score, research_summary')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .maybeSingle()

    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    // Return cached result if available
    if ((lead as any).research_summary) {
      res.json({ success: true, data: { bullets: (lead as any).research_summary, cached: true } }); return
    }

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are a B2B sales researcher. For this lead, provide exactly 3 concise bullet points:
1. What the company does (one sentence)
2. Likely pain points for someone in their role
3. A suggested opener line for cold outreach

Lead:
- Name: ${lead.first_name} ${lead.last_name}
- Role: ${lead.job_title ?? 'unknown'}
- Company: ${lead.company ?? 'unknown'}
- Industry: ${lead.industry ?? 'unknown'}
- Country: ${lead.country ?? 'unknown'}

Return ONLY valid JSON, no markdown: { "bullets": ["bullet 1", "bullet 2", "bullet 3"] }`,
      }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    let bullets: string[]
    try {
      const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(clean)
      bullets = parsed.bullets ?? [text]
    } catch {
      bullets = [
        `${lead.company ?? 'This company'} operates in the ${lead.industry ?? 'B2B'} space.`,
        `As a ${lead.job_title ?? 'decision maker'}, they likely face challenges around efficiency and growth.`,
        `Opening line: "I noticed ${lead.company ?? 'your company'} is focused on growth — wanted to share how we've helped similar teams."`,
      ]
    }

    // Cache the result (gracefully handle missing column)
    try {
      await db.from('leads').update({ research_summary: bullets }).eq('id', req.params.id)
    } catch (cacheErr) {
      console.warn('[leads/research] Could not cache result:', cacheErr)
    }

    res.json({ success: true, data: { bullets, cached: false } })
  } catch (err) {
    console.error('[leads/research]', err)
    res.status(500).json({ success: false, error: 'Failed to generate research' })
  }
})

// ── FIND CONTACTS AT SPECIFIC COMPANIES (from company CSV upload) ─────────────
leadRouter.post('/find-at-companies', async (req: AuthRequest, res) => {
  try {
    const { companies, limit } = z.object({
      companies: z.array(z.string().min(1)).min(1).max(100),
      limit:     z.number().int().min(1).max(200).default(50),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Load client ICP — fall back to a generic SDM search if none set
    const { data: icpRow } = await db.from('icps')
      .select('*').eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const { data: clientRow } = await db.from('clients')
      .select('company_name').eq('id', clientId).maybeSingle()

    const icp = icpRow ?? {
      job_titles: ['CEO', 'Founder', 'Director', 'Head of', 'VP'],
      seniority_levels: ['director', 'vp', 'c_suite', 'owner', 'founder'],
      company_sizes: [],
      geographies: [],
      industries: [],
      tech_stack: [],
      keywords: [],
      apollo_only_consented: false,
      intent_signals: [],
    }

    // Build Apollo search body targeting specific companies
    const searchBody = buildSearchBody({ ...icp, organization_names: companies }, 1)
    searchBody.per_page = Math.min(limit, 100)

    const contacts = await searchPeople(searchBody)
    if (!contacts.length) {
      res.json({ success: true, data: { created: 0, skipped: 0, message: 'No contacts found at these companies in Apollo' } })
      return
    }

    // Fetch existing emails and blocklist
    const contactEmails = contacts.map(c => c.email).filter(Boolean) as string[]
    const { data: existing } = await db.from('leads')
      .select('email').eq('client_id', clientId).in('email', contactEmails)
    const { data: blocklisted } = await db.from('opt_out_blocklist')
      .select('email').in('email', contactEmails)
    const existingSet = new Set([
      ...(existing ?? []).map((r: any) => r.email?.toLowerCase()),
      ...(blocklisted ?? []).map((r: any) => r.email?.toLowerCase()),
    ])

    let created = 0, skipped = 0
    const insertedIds: string[] = []

    for (const c of contacts) {
      if (c.email && existingSet.has(c.email.toLowerCase())) { skipped++; continue }
      const { data: row, error } = await db.from('leads').insert({
        client_id:    clientId,
        first_name:   c.first_name || 'Unknown',
        last_name:    c.last_name || '',
        email:        c.email || null,
        job_title:    c.title || null,
        company:      c.organization_name || null,
        linkedin_url: c.linkedin_url || null,
        country:      c.country || null,
        company_size: c.organization?.num_employees ? String(c.organization.num_employees) : null,
        apollo_id:    c.id || null,
        status:       'pending',
        source:       'company_csv',
      }).select('id').single()
      if (error) { skipped++; continue }
      created++
      if (row?.id) insertedIds.push(row.id)
    }

    // Score in background
    if (insertedIds.length > 0 && icpRow) {
      scoreLeadsForIcp(insertedIds, icpRow as any, clientRow?.company_name ?? '').catch(console.error)
    }

    res.json({ success: true, data: { created, skipped, total_found: contacts.length } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to find contacts at companies' })
  }
})
