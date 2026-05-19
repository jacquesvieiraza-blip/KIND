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

// ── KPIs ──────────────────────────────────────────────────────────────────────
figsyRouter.get('/kpis', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const [
      sentRes, repliesRes, interestedRes, optOutRes,
      activeCampaignsRes, totalLeadsRes, leadsContactedRes, avgScoreRes,
    ] = await Promise.all([
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('classification', 'interested'),
      db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('classification', 'opt_out'),
      db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'active'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'contacted'),
      db.from('leads').select('score').eq('client_id', clientId).not('score', 'is', null),
    ])

    const totalSent        = sentRes.count ?? 0
    const totalReplied     = repliesRes.count ?? 0
    const interested       = interestedRes.count ?? 0
    const optOuts          = optOutRes.count ?? 0
    const activeCampaigns  = activeCampaignsRes.count ?? 0
    const totalLeads       = totalLeadsRes.count ?? 0
    const leadsContacted   = leadsContactedRes.count ?? 0

    const scores = (avgScoreRes.data ?? []) as { score: number }[]
    const avgScore = scores.length
      ? Math.round(scores.reduce((sum, l) => sum + (l.score || 0), 0) / scores.length)
      : 0

    const replyRate     = totalSent > 0 ? totalReplied / totalSent : 0
    const interestedRate = totalSent > 0 ? interested / totalSent : 0

    res.json({
      success: true,
      data: {
        totalSent,
        totalReplied,
        replyRate,
        interested,
        interestedRate,
        optOuts,
        activeCampaigns,
        totalLeads,
        leadsContacted,
        avgScore,
      },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch KPIs' }) }
})

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

// ── CLONE CAMPAIGN ────────────────────────────────────────────────────────────
figsyRouter.post('/campaigns/:campaignId/clone', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: original, error: fetchErr } = await db.from('figsy_campaigns')
      .select('name, icp_id, status, settings')
      .eq('id', req.params.campaignId)
      .eq('client_id', clientId)
      .single()

    if (fetchErr || !original) {
      res.status(404).json({ success: false, error: 'Campaign not found' }); return
    }

    const { data: newCampaign, error: insertErr } = await db.from('figsy_campaigns')
      .insert({
        name:      `${original.name} (copy)`,
        icp_id:    original.icp_id ?? null,
        status:    'draft',
        settings:  original.settings ?? null,
        client_id: clientId,
      })
      .select()
      .single()

    if (insertErr) throw insertErr
    res.status(201).json({ success: true, campaign: newCampaign })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, error: 'Failed to clone campaign' })
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

    // Domain warming cap — FIGSY_DAILY_SEND_LIMIT env var limits total sends per day across all clients
    const dailyLimit = process.env.FIGSY_DAILY_SEND_LIMIT ? parseInt(process.env.FIGSY_DAILY_SEND_LIMIT, 10) : null
    let remaining = 20 // default batch size
    if (dailyLimit !== null && !isNaN(dailyLimit)) {
      const todayUTC = new Date()
      todayUTC.setUTCHours(0, 0, 0, 0)
      const { count } = await db.from('figsy_sent_emails')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayUTC.toISOString())
      const sentToday = count ?? 0
      remaining = Math.max(0, dailyLimit - sentToday)
      if (remaining === 0) {
        res.json({ success: true, data: { sent: 0, capped: true, daily_limit: dailyLimit } })
        return
      }
    }

    const now = new Date().toISOString()
    const { data: due } = await db.from('figsy_enrollments')
      .select('*, leads(id,first_name,last_name,email,job_title,company,industry,seniority,country,tech_stack,score,score_reasoning)')
      .eq('client_id', clientId)
      .in('status', ['enrolled', 'in_progress'])
      .lte('next_send_at', now)
      .limit(remaining)

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

    res.json({ success: true, data: { sent, ...(dailyLimit !== null ? { daily_limit: dailyLimit } : {}) } })
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

      // Auto top-up check
      try {
        const { data: clientForTopup } = await db.from('clients')
          .select('id, credit_balance, auto_topup_enabled, auto_topup_threshold, auto_topup_plan, auto_topup_bundle_size, auto_topup_paystack_auth')
          .eq('id', lead.client_id).single()
        if (clientForTopup?.auto_topup_enabled &&
            clientForTopup.auto_topup_paystack_auth &&
            (clientForTopup.credit_balance ?? 0) < (clientForTopup.auto_topup_threshold ?? 0)) {
          const plan = clientForTopup.auto_topup_plan ?? 'kind_ai'
          const bundleSize = clientForTopup.auto_topup_bundle_size ?? 20
          const BUNDLES: Record<string, Record<number, number>> = {
            kind_ai: { 10: 12, 20: 20, 40: 38, 75: 68, 100: 88, 200: 160, 500: 375 },
            figsy:   { 10: 35, 20: 60, 40: 110, 75: 195, 100: 250, 200: 460, 500: 1100 },
          }
          const amountUsd = BUNDLES[plan]?.[bundleSize]
          if (amountUsd) {
            const { data: { user } } = await db.auth.admin.getUserById(clientForTopup.id)
            const topupEmail = user?.email
            if (!topupEmail) throw new Error('No email for auto-topup client')
            const amountZarKobo = Math.round(amountUsd * 19 * 100)
            const chargeRes = await fetch('https://api.paystack.co/transaction/charge_authorization', {
              method: 'POST',
              headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                authorization_code: clientForTopup.auto_topup_paystack_auth,
                email: topupEmail,
                amount: amountZarKobo,
                currency: 'ZAR',
                metadata: { client_id: clientForTopup.id, type: 'credit_purchase', plan, bundle_size: bundleSize, amount_usd: amountUsd, auto_topup: true },
              }),
            })
            const chargeData = await chargeRes.json() as { status: boolean; data: { status: string } }
            if (chargeData.status && chargeData.data?.status === 'success') {
              const newBal = (clientForTopup.credit_balance ?? 0) + bundleSize
              await Promise.all([
                db.from('clients').update({ credit_balance: newBal }).eq('id', clientForTopup.id),
                db.from('credit_transactions').insert({
                  client_id: clientForTopup.id,
                  type: 'purchase',
                  amount: bundleSize,
                  plan,
                  note: `Auto top-up: ${bundleSize} credits (${plan})`,
                }),
              ])
            }
          }
        }
      } catch (autoErr) { console.error('[auto-topup]', autoErr) }
    }

    res.status(200).json({ received: true, id: reply?.id })
  } catch (err) {
    console.error('[figsy/inbound]', err)
    res.status(200).json({ received: true }) // Always 200 to webhook provider
  }
})

// ── AI FOLLOW-UP DRAFT ────────────────────────────────────────────────────────
figsyRouter.post('/replies/:id/draft-followup', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: reply } = await db.from('figsy_replies')
      .select('id, body, from_email, classification, lead_id')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .single()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    const { data: lead } = await db.from('leads')
      .select('first_name, last_name, job_title, company')
      .eq('id', reply.lead_id).single()

    const { data: client } = await db.from('clients')
      .select('company_name').eq('id', clientId).single()

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are an AI sales assistant. Draft a concise, professional follow-up reply to this interested lead.

Lead: ${lead?.first_name} ${lead?.last_name}, ${lead?.job_title} at ${lead?.company}
Our company: ${client?.company_name}
Their reply: "${reply.body.slice(0, 600)}"

Write a warm, brief reply (3-5 sentences) that:
1. Thanks them for their interest
2. Proposes a short call to learn about their needs
3. Offers 2-3 specific times or asks for their availability
4. Keeps it conversational and not salesy

Output ONLY the email body, no subject line, no sign-off.`,
      }],
    })

    const draft = (response.content[0] as { type: string; text: string }).text
    res.json({ success: true, data: { draft } })
  } catch (err) {
    console.error('[figsy/draft-followup]', err)
    res.status(500).json({ success: false, error: 'Failed to generate draft' })
  }
})

// ── AI REPLY SUGGESTION (F2-3) ────────────────────────────────────────────────
figsyRouter.post('/replies/:replyId/suggest', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: reply } = await db.from('figsy_replies')
      .select('id, body, classification, leads(first_name, last_name, job_title, company)')
      .eq('id', req.params.replyId)
      .eq('client_id', clientId)
      .single()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    if (reply.classification !== 'interested') {
      res.status(400).json({ error: 'Only available for interested replies' }); return
    }

    const lead = Array.isArray(reply.leads) ? reply.leads[0] : reply.leads

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are writing a short follow-up reply on behalf of a sales professional (the client). The prospect has replied to a cold outreach email and expressed interest.

Prospect: ${lead?.first_name ?? ''} ${lead?.last_name ?? ''}, ${lead?.job_title ?? 'unknown role'} at ${lead?.company ?? 'unknown company'}
Their reply: "${reply.body.slice(0, 600)}"

Write a suggested follow-up reply (50-80 words) that:
- Acknowledges their interest warmly but directly
- Proposes a specific next step: a 15-minute call, and mentions sending a calendar link
- Sounds like a real person, not a bot or a template
- Uses no buzzwords, no em-dashes
- Ends with "Best," on its own line, then "[Your name]" on the next line

Output ONLY the email body. No subject line. No preamble.`,
      }],
    })

    const suggestion = (response.content[0] as { type: string; text: string }).text.trim()
    res.json({ success: true, suggestion })
  } catch (err) {
    console.error('[figsy/replies/suggest]', err)
    res.status(500).json({ success: false, error: 'Failed to generate suggestion' })
  }
})

// Unified inbox — all replies across all campaigns for this client
figsyRouter.get('/replies/all', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('figsy_replies')
      .select('*, leads(first_name,last_name,job_title,company)')
      .eq('client_id', clientId)
      .order('processed_at', { ascending: false })
      .limit(200)
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch replies' }) }
})

// ── FIGSY MEMORY ─────────────────────────────────────────────────────────────

figsyRouter.post('/memory/refresh', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: campaigns, error } = await db.from('figsy_campaigns')
      .select('name, emails_sent, replies_total, replies_interested')
      .eq('client_id', clientId)
      .gt('emails_sent', 0)

    if (error) throw error

    const rows = campaigns ?? []
    const total_sent_all_time    = rows.reduce((sum, c) => sum + (c.emails_sent   ?? 0), 0)
    const total_replies_all_time = rows.reduce((sum, c) => sum + (c.replies_total ?? 0), 0)
    const avg_reply_rate_30d     = rows.length > 0
      ? rows.reduce((sum, c) => sum + ((c.replies_total ?? 0) / (c.emails_sent ?? 1)), 0) / rows.length
      : 0

    const { data: memoryRow, error: upsertError } = await db.from('figsy_memory')
      .upsert({
        client_id:             clientId,
        best_subject_lines:    [],
        avg_reply_rate_30d,
        total_sent_all_time,
        total_replies_all_time,
        last_updated:          new Date().toISOString(),
      }, { onConflict: 'client_id' })
      .select()
      .single()

    if (upsertError) throw upsertError

    res.json({
      success: true,
      data: { avg_reply_rate_30d, total_sent_all_time, total_replies_all_time },
    })
  } catch (err) {
    console.error('[figsy/memory/refresh]', err)
    res.status(500).json({ success: false, error: 'Failed to refresh FIGSY memory' })
  }
})

figsyRouter.get('/memory', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data, error } = await db.from('figsy_memory')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle()

    if (error) throw error

    res.json({ success: true, data: data ?? null })
  } catch (err) {
    console.error('[figsy/memory]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch FIGSY memory' })
  }
})

// Export for use in icps.ts (S5 — FIGSY auto-start)
export { autoEnrollLead }
