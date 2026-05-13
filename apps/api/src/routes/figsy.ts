import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { generateSequence, classifyReply, sendSequenceEmail, autoEnrollLead } from '../lib/figsy'
import { pushDealToCrm } from '../lib/crm'

export const figsyRouter = Router()
figsyRouter.use(requireAuth)

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).single()
  return data?.id ?? null
}

// ── CAMPAIGNS ────────────────────────────────────────────────────────────────

figsyRouter.get('/campaigns', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('figsy_campaigns')
      .select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch campaigns' }) }
})

figsyRouter.post('/campaigns', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      name:   z.string().min(1),
      icp_id: z.string().uuid().optional(),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('figsy_campaigns')
      .insert({ ...body, client_id: clientId }).select().single()
    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to create campaign' })
  }
})

figsyRouter.patch('/campaigns/:id', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      name:   z.string().min(1).optional(),
      status: z.enum(['draft','active','paused','completed','archived']).optional(),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // F1-9: gate activation behind a FIGSY-enabled subscription
    if (body.status === 'active') {
      const { data: sub } = await db.from('subscriptions')
        .select('product, status')
        .eq('client_id', clientId)
        .in('product', ['lead_gen_figsy', 'figsy_addon'])
        .in('status', ['active', 'trialing'])
        .maybeSingle()

      if (!sub) {
        res.status(403).json({
          success: false,
          error: 'FIGSY requires an active subscription. Upgrade to Lead Gen + FIGSY or add the FIGSY add-on.',
          upgrade_url: 'https://app.get-kind.com/dashboard/billing',
        })
        return
      }
    }

    const { data, error } = await db.from('figsy_campaigns')
      .update(body).eq('id', req.params.id).eq('client_id', clientId).select().single()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update campaign' })
  }
})

figsyRouter.delete('/campaigns/:id', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { error } = await db.from('figsy_campaigns')
      .delete().eq('id', req.params.id).eq('client_id', clientId)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to delete campaign' }) }
})

// ── ENROLLMENTS ───────────────────────────────────────────────────────────────

figsyRouter.get('/campaigns/:id/enrollments', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id').eq('id', req.params.id).eq('client_id', clientId).single()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    const { data, error } = await db.from('figsy_enrollments')
      .select('*, leads(first_name,last_name,email,job_title,company,score)')
      .eq('campaign_id', req.params.id)
      .order('enrolled_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch enrollments' }) }
})

// Enroll one or more leads into a campaign
figsyRouter.post('/campaigns/:id/enroll', async (req: AuthRequest, res) => {
  try {
    const { lead_ids } = z.object({
      lead_ids: z.array(z.string().uuid()).min(1).max(50),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id, status').eq('id', req.params.id).eq('client_id', clientId).single()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    const { data: client } = await db.from('clients')
      .select('company_name, industry').eq('id', clientId).single()

    const { data: leads } = await db.from('leads')
      .select('id, first_name, last_name, email, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
      .in('id', lead_ids).eq('client_id', clientId)

    let enrolled = 0
    let skipped  = 0

    for (const lead of leads ?? []) {
      if (!lead.email) { skipped++; continue }

      // Skip if already enrolled
      const { data: existing } = await db.from('figsy_enrollments')
        .select('id').eq('campaign_id', campaign.id).eq('lead_id', lead.id).maybeSingle()
      if (existing) { skipped++; continue }

      try {
        const draft = await generateSequence(lead as any, client?.company_name ?? '', client?.industry ?? null)

        const { error } = await db.from('figsy_enrollments').insert({
          campaign_id:    campaign.id,
          lead_id:        lead.id,
          client_id:      clientId,
          status:         'enrolled',
          current_step:   0,
          next_send_at:   new Date().toISOString(),
          step1_subject:  draft.step1.subject,
          step1_body:     draft.step1.body,
          step2_subject:  draft.step2.subject,
          step2_body:     draft.step2.body,
          step3_subject:  draft.step3.subject,
          step3_body:     draft.step3.body,
        })
        if (error) { skipped++; continue }
        enrolled++
      } catch {
        skipped++
      }
    }

    // Bump enrolled count on campaign
    const { data: camp } = await db.from('figsy_campaigns')
      .select('leads_enrolled').eq('id', campaign.id).single()
    if (camp && enrolled > 0) {
      await db.from('figsy_campaigns')
        .update({ leads_enrolled: (camp.leads_enrolled ?? 0) + enrolled })
        .eq('id', campaign.id)
    }

    res.json({ success: true, data: { enrolled, skipped } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to enroll leads' })
  }
})

// Preview AI-generated sequence for a single lead (no send)
figsyRouter.post('/campaigns/:id/preview-sequence', async (req: AuthRequest, res) => {
  try {
    const { lead_id } = z.object({ lead_id: z.string().uuid() }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead } = await db.from('leads')
      .select('id, first_name, last_name, email, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
      .eq('id', lead_id).eq('client_id', clientId).single()
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const { data: client } = await db.from('clients')
      .select('company_name, industry').eq('id', clientId).single()

    const draft = await generateSequence(lead as any, client?.company_name ?? '', client?.industry ?? null)
    res.json({ success: true, data: draft })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to generate sequence preview' })
  }
})

// ── SEND NEXT STEP (manual trigger or cron) ───────────────────────────────────
figsyRouter.post('/send-due', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const now = new Date().toISOString()
    const { data: due } = await db.from('figsy_enrollments')
      .select('*, leads(id,first_name,last_name,email,job_title,company,industry,seniority,country,tech_stack,score,score_reasoning)')
      .eq('client_id', clientId)
      .in('status', ['enrolled', 'in_progress'])
      .lte('next_send_at', now)
      .limit(20)

    let sent = 0
    for (const enrollment of due ?? []) {
      const lead = Array.isArray(enrollment.leads) ? enrollment.leads[0] : enrollment.leads
      if (!lead?.email) continue
      const nextStep = (enrollment.current_step + 1) as 1 | 2 | 3
      if (nextStep > 3) continue
      const subject = enrollment[`step${nextStep}_subject` as keyof typeof enrollment] as string
      const body    = enrollment[`step${nextStep}_body`    as keyof typeof enrollment] as string
      if (!subject || !body) continue
      try {
        await sendSequenceEmail(enrollment.id, lead, nextStep, subject, body, enrollment.campaign_id)
        sent++
      } catch (err) {
        console.error('[figsy/send-due]', err)
      }
    }

    res.json({ success: true, data: { sent } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to send due emails' }) }
})

// ── REPLIES ───────────────────────────────────────────────────────────────────

figsyRouter.get('/campaigns/:id/replies', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id').eq('id', req.params.id).eq('client_id', clientId).single()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    const { data, error } = await db.from('figsy_replies')
      .select('*').eq('campaign_id', req.params.id).order('received_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch replies' }) }
})

// Inbound reply webhook (called by Resend or email provider)
figsyRouter.post('/replies/inbound', async (req, res) => {
  try {
    const payload = req.body as {
      from: string
      subject?: string
      text?: string
      html?: string
    }

    const fromEmail = payload.from?.toLowerCase().trim()
    const body = payload.text || payload.html?.replace(/<[^>]+>/g, ' ') || ''

    if (!fromEmail || !body) { res.status(200).json({ received: true }); return }

    // Find lead by email
    const { data: lead } = await db.from('leads')
      .select('id, client_id').eq('email', fromEmail).maybeSingle()
    if (!lead) { res.status(200).json({ received: true }); return }

    // Find active enrollment
    const { data: enrollment } = await db.from('figsy_enrollments')
      .select('id, campaign_id')
      .eq('lead_id', lead.id)
      .in('status', ['enrolled', 'in_progress'])
      .order('enrolled_at', { ascending: false })
      .limit(1).maybeSingle()

    // Classify reply
    const { classification, reasoning } = await classifyReply(body)

    // Store reply
    const { data: reply } = await db.from('figsy_replies').insert({
      enrollment_id:               enrollment?.id ?? null,
      campaign_id:                 enrollment?.campaign_id ?? null,
      lead_id:                     lead.id,
      client_id:                   lead.client_id,
      from_email:                  fromEmail,
      subject:                     payload.subject ?? null,
      body,
      classification,
      classification_reasoning:    reasoning,
      raw_payload:                 payload,
      processed_at:                new Date().toISOString(),
    }).select('id').single()

    // Handle opt-out — pause enrollment and add to blocklist
    if (classification === 'opt_out') {
      if (enrollment) {
        await db.from('figsy_enrollments')
          .update({ status: 'opted_out' }).eq('id', enrollment.id)
      }
      await db.from('opt_out_blocklist').upsert({
        email:  fromEmail,
        reason: 'replied_opt_out',
      }, { onConflict: 'email', ignoreDuplicates: false })
      await db.from('leads').update({
        status: 'opted_out', opted_out_at: new Date().toISOString(),
      }).eq('email', fromEmail)

      if (enrollment?.campaign_id) {
        const { data: camp } = await db.from('figsy_campaigns')
          .select('opted_out, replies_total').eq('id', enrollment.campaign_id).single()
        if (camp) {
          await db.from('figsy_campaigns').update({
            opted_out:    (camp.opted_out    ?? 0) + 1,
            replies_total:(camp.replies_total?? 0) + 1,
          }).eq('id', enrollment.campaign_id)
        }
      }
    }

    // Handle interested — pause sequence, bump stats, push deal to CRM
    if (classification === 'interested' && enrollment) {
      await db.from('figsy_enrollments')
        .update({ status: 'replied' }).eq('id', enrollment.id)

      const { data: camp } = await db.from('figsy_campaigns')
        .select('replies_interested, replies_total').eq('id', enrollment.campaign_id).single()
      if (camp) {
        await db.from('figsy_campaigns').update({
          replies_interested: (camp.replies_interested ?? 0) + 1,
          replies_total:      (camp.replies_total       ?? 0) + 1,
        }).eq('id', enrollment.campaign_id)
      }

      // F2-2 — push deal/opportunity to client's CRM
      const { data: leadFull } = await db.from('leads')
        .select('id, first_name, last_name, email, job_title, company, linkedin_url, country, score')
        .eq('id', lead.id).single()
      const { data: client } = await db.from('clients')
        .select('crm_type, crm_api_key, crm_sync_enabled').eq('id', lead.client_id).single()

      if (client?.crm_sync_enabled && client?.crm_type && client?.crm_api_key && leadFull) {
        const leadName = `${leadFull.first_name} ${leadFull.last_name}`.trim()
        pushDealToCrm(client.crm_type, client.crm_api_key, {
          ...leadFull,
          phone: null,
        }, {
          lead_name:     leadName,
          company:       leadFull.company,
          reply_snippet: body.slice(0, 300),
        }).then(result => {
          if (result.success && result.deal_id && enrollment) {
            db.from('figsy_enrollments').update({
              crm_deal_id:   result.deal_id,
              crm_pushed_at: new Date().toISOString(),
            }).eq('id', enrollment.id).then(() => {})
          }
        }).catch(console.error)
      }
    }

    res.status(200).json({ received: true, id: reply?.id })
  } catch (err) {
    console.error('[figsy/inbound]', err)
    res.status(200).json({ received: true }) // Always 200 to webhook provider
  }
})

// Export for use in icps.ts (S5 — FIGSY auto-start)
export { autoEnrollLead }
