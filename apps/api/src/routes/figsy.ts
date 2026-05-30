import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { generateSequence, classifyReply, sendSequenceEmail, autoEnrollLead } from '../lib/figsy'
import { pushDealToCrm } from '../lib/crm'
import { syncFigsyInterestedToHubspot } from '../lib/hubspot'

export const figsyRouter = Router()

// ── INBOUND REPLY WEBHOOK — must be registered BEFORE requireAuth ─────────────
// Called by Resend when a prospect replies to a FIGSY sequence email.
// No JWT auth — protected by RESEND_WEBHOOK_SECRET header check instead.
// Resend inbound payload: { from, to, subject, text, html } OR { type, data: { from, ... } }
figsyRouter.post('/replies/inbound', async (req, res) => {
  // Verify webhook secret
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (secret && req.headers['x-webhook-secret'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' }); return
  }

  try {
    // Handle both Resend webhook format { type, data: {...} } and flat { from, subject, text }
    const raw = req.body as Record<string, unknown>
    const payload = (raw.type === 'email.received' && raw.data && typeof raw.data === 'object')
      ? raw.data as Record<string, unknown>
      : raw

    // Extract just the email address from "Name <email@domain.com>" or plain "email@domain.com"
    const rawFrom = (payload.from as string) ?? ''
    const emailMatch = rawFrom.match(/<([^>]+)>/) || rawFrom.match(/^([^\s]+@[^\s]+)/)
    const fromEmail = (emailMatch?.[1] ?? rawFrom).toLowerCase().trim()

    // Extract name from "Name <email>" format
    const fromName = rawFrom.includes('<') ? rawFrom.split('<')[0].trim().replace(/^["']|["']$/g, '') : null

    const body = (payload.text as string) || ((payload.html as string)?.replace(/<[^>]+>/g, ' ') ?? '') || ''

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
      from_name:                   fromName,
      subject:                     (payload.subject as string) ?? null,
      body,
      body_text:                   body,
      classification,
      classification_reasoning:    reasoning,
      raw_payload:                 payload,
      processed_at:                new Date().toISOString(),
      received_at:                 new Date().toISOString(),
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
          .select('opted_out, replies_total').eq('id', enrollment.campaign_id).maybeSingle()
        if (camp) {
          await db.from('figsy_campaigns').update({
            opted_out:    (camp.opted_out    ?? 0) + 1,
            replies_total:(camp.replies_total?? 0) + 1,
          }).eq('id', enrollment.campaign_id)
        }
      }
    }

    // Handle hot — pause sequence, bump stats, push deal to CRM
    if (classification === 'hot' && enrollment) {
      await db.from('figsy_enrollments')
        .update({ status: 'replied' }).eq('id', enrollment.id)

      const { data: camp } = await db.from('figsy_campaigns')
        .select('replies_interested, replies_total').eq('id', enrollment.campaign_id).maybeSingle()
      if (camp) {
        await db.from('figsy_campaigns').update({
          replies_interested: (camp.replies_interested ?? 0) + 1,
          replies_total:      (camp.replies_total       ?? 0) + 1,
        }).eq('id', enrollment.campaign_id)
      }

      // F2-2 — push deal/opportunity to client's CRM
      const { data: leadFull } = await db.from('leads')
        .select('id, first_name, last_name, email, job_title, company, linkedin_url, country, score')
        .eq('id', lead.id).maybeSingle()
      const { data: client } = await db.from('clients')
        .select('crm_type, crm_api_key, crm_sync_enabled').eq('id', lead.client_id).maybeSingle()

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

      // Sync interested reply to HubSpot (no-op if HUBSPOT_API_KEY not set)
      syncFigsyInterestedToHubspot({
        lead_email:    fromEmail,
        lead_name:     leadFull ? `${leadFull.first_name} ${leadFull.last_name}`.trim() : '',
        company:       leadFull?.company ?? '',
        client_id:     lead.client_id,
        reply_snippet: body.slice(0, 300),
      }).catch(console.error)

      // Auto top-up check
      try {
        const { data: clientForTopup } = await db.from('clients')
          .select('id, user_id, credit_balance, auto_topup_enabled, auto_topup_threshold, auto_topup_plan, auto_topup_bundle_size, auto_topup_paystack_auth')
          .eq('id', lead.client_id).maybeSingle()
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
            const { data: { user } } = await db.auth.admin.getUserById(clientForTopup.user_id)
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

figsyRouter.use(requireAuth)

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
figsyRouter.get('/kpis', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const period = (req.query.period as string) ?? 'all'
    const since = period === '7d'  ? new Date(Date.now() - 7  * 86400000).toISOString()
                : period === '30d' ? new Date(Date.now() - 30 * 86400000).toISOString()
                : period === '90d' ? new Date(Date.now() - 90 * 86400000).toISOString()
                : null

    let sentQuery = db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).eq('client_id', clientId)
    if (since !== null) sentQuery = sentQuery.gte('sent_at', since)

    let repliesQuery = db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId)
    if (since !== null) repliesQuery = repliesQuery.gte('received_at', since)

    let interestedQuery = db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('classification', 'hot')
    if (since !== null) interestedQuery = interestedQuery.gte('received_at', since)

    let optOutQuery = db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('classification', 'opt_out')
    if (since !== null) optOutQuery = optOutQuery.gte('received_at', since)

    const [
      sentRes, repliesRes, interestedRes, optOutRes,
      activeCampaignsRes, totalLeadsRes, leadsContactedRes, avgScoreRes,
      meetingsRes,
    ] = await Promise.all([
      sentQuery,
      repliesQuery,
      interestedQuery,
      optOutQuery,
      db.from('figsy_campaigns').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'active'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('status', 'contacted'),
      db.from('leads').select('score').eq('client_id', clientId).not('score', 'is', null),
      db.from('figsy_campaigns').select('meetings_booked').eq('client_id', clientId),
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

    const meetingsBooked = (meetingsRes.data ?? []).reduce((s, c) => s + (c.meetings_booked ?? 0), 0)

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
        meetingsBooked,
        period,
      },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch KPIs' }) }
})

// ── DAILY SENDS TIME SERIES (for the KPIs sparkline) ─────────────────────────
// GET /figsy/sends-daily?days=7 → [{ date: 'YYYY-MM-DD', count }] oldest→newest
figsyRouter.get('/sends-daily', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const days = Math.min(Math.max(parseInt((req.query.days as string) ?? '7', 10) || 7, 1), 90)
    const since = new Date(Date.now() - (days - 1) * 86400000)
    since.setUTCHours(0, 0, 0, 0)

    const { data, error } = await db.from('figsy_sent_emails')
      .select('sent_at')
      .eq('client_id', clientId)
      .gte('sent_at', since.toISOString())
    if (error) throw error

    // Pre-seed one bucket per day (UTC) so days with zero sends still appear.
    const buckets: Record<string, number> = {}
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 86400000)
      buckets[d.toISOString().split('T')[0]] = 0
    }
    for (const row of data ?? []) {
      const key = (row.sent_at as string).split('T')[0]
      if (key in buckets) buckets[key]++
    }

    const series = Object.entries(buckets).map(([date, count]) => ({ date, count }))
    res.json({ success: true, data: series })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch daily sends' }) }
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

figsyRouter.get('/campaigns/:id', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('figsy_campaigns')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (error || !data) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch campaign' }) }
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
      name:             z.string().min(1).optional(),
      status:           z.enum(['draft','active','paused','completed','archived']).optional(),
      system_prompt:    z.string().max(2000).nullable().optional(),
      daily_send_limit: z.number().int().min(0).max(500).nullable().optional(),
      review_required:  z.boolean().optional(),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Build update payload — merge settings fields into existing settings JSONB
    const dbUpdate: Record<string, unknown> = {}
    if (body.name !== undefined) dbUpdate.name = body.name
    if (body.status !== undefined) dbUpdate.status = body.status

    const settingsUpdate: Record<string, unknown> = {}
    if (body.system_prompt !== undefined) settingsUpdate.system_prompt = body.system_prompt
    if (body.daily_send_limit !== undefined) settingsUpdate.daily_send_limit = body.daily_send_limit
    if (body.review_required !== undefined) settingsUpdate.review_required = body.review_required

    if (Object.keys(settingsUpdate).length > 0) {
      const { data: existing } = await db.from('figsy_campaigns')
        .select('settings').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
      dbUpdate.settings = { ...(existing?.settings ?? {}), ...settingsUpdate }
    }

    const { data, error } = await db.from('figsy_campaigns')
      .update(dbUpdate).eq('id', req.params.id).eq('client_id', clientId).select().single()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    res.json({ success: true, data })

    // Auto-enroll all consent_given leads when campaign is activated (fire-and-forget)
    if (body.status === 'active') {
      ;(async () => {
        try {
          const { data: leads } = await db.from('leads')
            .select('id').eq('client_id', clientId).eq('status', 'consent_given')
          for (const lead of leads ?? []) {
            await autoEnrollLead(lead.id, clientId)
          }
        } catch (e) { console.error('[figsy] auto-enroll on activation failed', e) }
      })()
    }
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update campaign' })
  }
})

// ── ENROLL ALL CONSENTED LEADS ────────────────────────────────────────────────
figsyRouter.post('/campaigns/:id/enroll-consented', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id, status').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    const { data: leads } = await db.from('leads')
      .select('id').eq('client_id', clientId).eq('status', 'consent_given')

    let enrolled = 0, skipped = 0
    res.json({ success: true, data: { enrolled: leads?.length ?? 0, skipped: 0, message: 'Enrolling in background…' } })

    // Fire-and-forget — respond immediately, enroll async
    ;(async () => {
      for (const lead of leads ?? []) {
        const { data: existing } = await db.from('figsy_enrollments')
          .select('id').eq('campaign_id', campaign.id).eq('lead_id', lead.id).maybeSingle()
        if (existing) { skipped++; continue }
        await autoEnrollLead(lead.id, clientId)
        enrolled++
      }
      console.log(`[figsy] enroll-consented: enrolled=${enrolled} skipped=${skipped} campaign=${campaign.id}`)
    })()
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, error: 'Failed to start enrollment' })
  }
})

// ── SAVE AUDIENCE SETTINGS ───────────────────────────────────────────────────
figsyRouter.put('/campaigns/:id/audience', async (req: AuthRequest, res) => {
  try {
    const { min_score, max_score, daily_limit } = z.object({
      min_score:   z.number().min(0).max(100).optional(),
      max_score:   z.number().min(0).max(100).optional(),
      daily_limit: z.number().min(1).max(500).optional(),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: existing } = await db.from('figsy_campaigns')
      .select('settings').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (existing === null) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    const updated = {
      ...(existing?.settings ?? {}),
      ...(min_score   !== undefined ? { min_score }   : {}),
      ...(max_score   !== undefined ? { max_score }   : {}),
      ...(daily_limit !== undefined ? { daily_limit } : {}),
    }
    const { data, error } = await db.from('figsy_campaigns')
      .update({ settings: updated }).eq('id', req.params.id).eq('client_id', clientId).select().maybeSingle()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to save audience settings' })
  }
})

// ── SEND DUE EMAILS NOW (manual trigger for a single campaign) ────────────────
figsyRouter.post('/campaigns/:id/send-now', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id, status').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    const now = new Date().toISOString()
    const { data: due } = await db.from('figsy_enrollments')
      .select('*, leads(id,first_name,last_name,email,job_title,company,industry,seniority,country,tech_stack,score,score_reasoning)')
      .eq('campaign_id', req.params.id)
      .in('status', ['enrolled', 'in_progress'])
      .lte('next_send_at', now)
      .limit(50)

    const { sendSequenceEmail } = await import('../lib/figsy')
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
        await sendSequenceEmail(enrollment.id, lead, nextStep, subject, body, req.params.id)
        sent++
      } catch (err) { console.error('[send-now] enrollment', enrollment.id, ':', err) }
    }
    res.json({ success: true, data: { sent, due_count: (due ?? []).length } })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, error: 'Failed to send emails' })
  }
})

// ── SAVE SEQUENCE STEPS ───────────────────────────────────────────────────────
figsyRouter.put('/campaigns/:id/sequence', async (req: AuthRequest, res) => {
  try {
    const { steps } = z.object({ steps: z.array(z.any()).min(1) }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: existing } = await db.from('figsy_campaigns')
      .select('settings').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (existing === null) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    const { data, error } = await db.from('figsy_campaigns')
      .update({ settings: { ...(existing.settings ?? {}), steps } })
      .eq('id', req.params.id).eq('client_id', clientId).select().maybeSingle()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to save sequence' })
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
      .select('id').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
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
      .select('id, status').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    const { data: client } = await db.from('clients')
      .select('company_name, industry').eq('id', clientId).maybeSingle()

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
      .select('leads_enrolled').eq('id', campaign.id).maybeSingle()
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
      .eq('id', lead_id).eq('client_id', clientId).maybeSingle()
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const { data: client } = await db.from('clients')
      .select('company_name, industry').eq('id', clientId).maybeSingle()

    const draft = await generateSequence(lead as any, client?.company_name ?? '', client?.industry ?? null)
    res.json({ success: true, data: draft })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to generate sequence preview' })
  }
})

// ── SEND TEST EMAIL ───────────────────────────────────────────────────────────
figsyRouter.post('/campaigns/:id/test-email', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: campaign } = await db.from('figsy_campaigns')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }

    const { data: client } = await db.from('clients')
      .select('company_name, industry').eq('id', clientId).maybeSingle()

    // Get sender's own email from auth
    const { data: { user } } = await db.auth.admin.getUserById(req.userId!)
    const toEmail = user?.email
    if (!toEmail) { res.status(400).json({ success: false, error: 'Could not resolve your email address' }); return }

    // Generate sequence using a placeholder lead representing the sender
    const fakeLead = {
      id: 'test', first_name: 'You', last_name: '(Test)', email: toEmail,
      job_title: 'Decision Maker', company: 'Your Company',
      industry: client?.industry ?? null, seniority: 'senior',
      country: 'ZA', tech_stack: [], score: 85, score_reasoning: 'Test preview',
    }
    const sequence = await generateSequence(fakeLead as any, client?.company_name ?? '', client?.industry ?? null)
    const step1 = sequence?.step1
    if (!step1?.subject || !step1?.body) {
      res.status(500).json({ success: false, error: 'Failed to generate email preview' }); return
    }

    await sendSequenceEmail('test-preview', fakeLead as any, 1, step1.subject, step1.body, req.params.id)
    res.json({ success: true, message: `Test email sent to ${toEmail}` })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, error: 'Failed to send test email' })
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
      .select('id').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!campaign) { res.status(404).json({ success: false, error: 'Campaign not found' }); return }
    const { data, error } = await db.from('figsy_replies')
      .select('*').eq('campaign_id', req.params.id).order('received_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch replies' }) }
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
      .maybeSingle()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    const { data: lead } = await db.from('leads')
      .select('first_name, last_name, job_title, company')
      .eq('id', reply.lead_id).maybeSingle()

    const { data: client } = await db.from('clients')
      .select('company_name').eq('id', clientId).maybeSingle()

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
      .maybeSingle()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    if (reply.classification !== 'hot' && reply.classification !== 'interested') {
      res.status(400).json({ error: 'Only available for hot/interested replies' }); return
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

// ── SEND MANUAL REPLY FROM UNIBOX ─────────────────────────────────────────────
figsyRouter.post('/replies/:id/send-reply', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { body: replyBody } = z.object({
      body: z.string().min(1).max(5000),
    }).parse(req.body)

    const { data: reply } = await db.from('figsy_replies')
      .select('id, from_email, subject, lead_id, client_id')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .maybeSingle()

    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    const { Resend: ResendCls } = await import('resend')
    const resendInst = process.env.RESEND_API_KEY ? new ResendCls(process.env.RESEND_API_KEY) : null

    if (!resendInst) {
      res.status(503).json({ success: false, error: 'Email sending not configured' })
      return
    }

    const reSubject = reply.subject?.startsWith('Re:') ? reply.subject : `Re: ${reply.subject ?? 'Your enquiry'}`
    const fromAddr  = 'K.I.N.D <hello@get-kind.com>'

    const { data: sendResult, error: sendError } = await resendInst.emails.send({
      from:    fromAddr,
      to:      reply.from_email,
      subject: reSubject,
      text:    replyBody,
    })

    if (sendError) throw sendError

    // Log the sent reply
    await db.from('figsy_replies').insert({
      client_id:      clientId,
      from_email:     fromAddr,
      subject:        reSubject,
      body:           replyBody,
      classification: 'sent_reply',
      processed_at:   new Date().toISOString(),
      lead_id:        reply.lead_id,
    })

    res.json({ success: true, data: { sent: true, resend_id: (sendResult as any)?.id } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[figsy/send-reply]', err)
    res.status(500).json({ success: false, error: 'Failed to send reply' })
  }
})

// ── MARK AS BOOKED ────────────────────────────────────────────────────────────
figsyRouter.post('/replies/:id/mark-booked', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: reply } = await db.from('figsy_replies')
      .select('id, campaign_id, meeting_booked_at')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .maybeSingle()
    if (!reply) { res.status(404).json({ success: false, error: 'Reply not found' }); return }

    if (reply.meeting_booked_at) {
      res.json({ success: true, data: { already_booked: true } }); return
    }

    await db.from('figsy_replies').update({
      meeting_booked_at: new Date().toISOString(),
    }).eq('id', req.params.id)

    if (reply.campaign_id) {
      const { data: camp } = await db.from('figsy_campaigns')
        .select('meetings_booked').eq('id', reply.campaign_id).maybeSingle()
      if (camp !== null) {
        await db.from('figsy_campaigns').update({
          meetings_booked: (camp.meetings_booked ?? 0) + 1,
        }).eq('id', reply.campaign_id)
      }
    }

    res.json({ success: true, data: { booked: true } })
  } catch (err) {
    console.error('[figsy/mark-booked]', err)
    res.status(500).json({ success: false, error: 'Failed to mark as booked' })
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

// ── DEMO SEED REPLY (dev/demo only) ──────────────────────────────────────────
figsyRouter.post('/replies/seed-demo', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Pick the most recent active campaign
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id').eq('client_id', clientId).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    // Pick a real lead from this client's pool (scored/consent_given)
    const { data: lead } = await db.from('leads')
      .select('id, first_name, last_name, email, job_title, company')
      .eq('client_id', clientId)
      .in('status', ['scored', 'consent_given', 'exported'])
      .order('score', { ascending: false }).limit(1).maybeSingle()

    const fromEmail = lead?.email ?? `demo.prospect@example.com`
    const fromName  = lead ? `${lead.first_name} ${lead.last_name}` : 'Demo Prospect'
    const jobTitle  = lead?.job_title ?? 'CEO'
    const company   = lead?.company ?? 'Acme Corp'

    const { data: reply, error } = await db.from('figsy_replies').insert({
      campaign_id:              campaign?.id ?? null,
      lead_id:                  lead?.id ?? null,
      client_id:                clientId,
      from_email:               fromEmail,
      from_name:                fromName,
      subject:                  'Re: Exploring a partnership',
      body:                     `Hi,\n\nThanks for reaching out — this actually looks interesting. We've been looking at ways to improve our outbound. Can we jump on a quick call this week?\n\nBest,\n${fromName}\n${jobTitle} at ${company}`,
      body_text:                `Hi,\n\nThanks for reaching out — this actually looks interesting. We've been looking at ways to improve our outbound. Can we jump on a quick call this week?\n\nBest,\n${fromName}\n${jobTitle} at ${company}`,
      classification:           'hot',
      classification_reasoning: 'Prospect expressed clear interest and requested a call.',
      processed_at:             new Date().toISOString(),
      received_at:              new Date().toISOString(),
    }).select('id').single()

    if (error) throw error

    // Bump campaign stats
    if (campaign?.id) {
      const { data: camp } = await db.from('figsy_campaigns')
        .select('replies_total, replies_interested').eq('id', campaign.id).maybeSingle()
      if (camp) {
        await db.from('figsy_campaigns').update({
          replies_total:       (camp.replies_total       ?? 0) + 1,
          replies_interested:  (camp.replies_interested  ?? 0) + 1,
        }).eq('id', campaign.id)
      }
    }

    res.json({ success: true, data: { reply_id: reply?.id, from: fromName } })
  } catch (err) {
    console.error(err); res.status(500).json({ success: false, error: 'Failed to seed demo reply' })
  }
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

    const { error: upsertError } = await db.from('figsy_memory')
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

// Preview the signal that FIGSY would use for a lead (for display in leads table)
figsyRouter.get('/leads/:leadId/signal-preview', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead } = await db.from('leads')
      .select('tech_stack, industry, score_reasoning, company')
      .eq('id', req.params.leadId)
      .eq('client_id', clientId)
      .maybeSingle()

    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const signals: string[] = []
    if (lead.tech_stack && Array.isArray(lead.tech_stack) && lead.tech_stack.length > 0) {
      signals.push(`Uses ${(lead.tech_stack as string[]).slice(0, 2).join(' and ')}`)
    }
    if (lead.score_reasoning) signals.push(lead.score_reasoning)
    if (lead.industry) signals.push(`${lead.industry} sector`)

    res.json({ success: true, data: { signal: signals[0] ?? null, all_signals: signals } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to get signal preview' })
  }
})

// ── FIGSY CHAT — conversational AI assistant for lead gen and pipeline advice ──
figsyRouter.post('/chat', async (req: AuthRequest, res) => {
  try {
    const { messages, mode } = z.object({
      messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).min(1).max(20),
      mode:     z.enum(['full', 'lead_gen']).default('lead_gen'),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)

    // Fetch client context for a personalised reply
    let clientContext = ''
    if (clientId) {
      const { data: client } = await db.from('clients')
        .select('company_name, industry, credit_balance').eq('id', clientId).maybeSingle()
      const { data: icps } = await db.from('icps')
        .select('name, industries, job_titles, geographies').eq('client_id', clientId).limit(3)
      if (client) {
        clientContext = `\nClient: ${client.company_name ?? 'Unknown'} | Industry: ${client.industry ?? 'Unknown'} | Credits: ${client.credit_balance ?? 0}`
        if (icps?.length) {
          clientContext += `\nICPs: ${icps.map(i => i.name).join(', ')}`
        }
      }
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const system = mode === 'full'
      ? `You are FIGSY, an expert AI SDR and sales strategist for K.I.N.D — a B2B lead generation platform.${clientContext}
You help the user with: campaign strategy, reply rate improvement, lead scoring, ICP refinement, outreach copy, and pipeline advice.
Keep replies concise (2-4 sentences max). Be direct, specific, and actionable. No fluff.`
      : `You are FIGSY, an AI lead generation assistant for K.I.N.D — a B2B platform.${clientContext}
You help the user understand their ICP, lead scoring, and who to target first. You can advise on lead gen strategy.
For campaign management features (sequences, email sends, inbox), mention they can upgrade to full FIGSY.
Keep replies concise (2-4 sentences max). Be direct and helpful.`

    const response = await ai.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const reply = (response.content[0] as { type: string; text: string }).text.trim()
    res.json({ success: true, data: { reply } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[figsy/chat]', err)
    res.status(500).json({ success: false, error: 'Failed to generate response' })
  }
})

// ── ACTIVITY FEED ─────────────────────────────────────────────────────────────
figsyRouter.get('/activity', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 50)

    const [sentRes, repliesRes, campaignsRes, leadsRes] = await Promise.all([
      db.from('figsy_sent_emails')
        .select('id, sent_at, step, leads(first_name, last_name, company)')
        .eq('client_id', clientId)
        .order('sent_at', { ascending: false })
        .limit(limit),
      db.from('figsy_replies')
        .select('id, processed_at, received_at, classification, from_name, from_email, leads(first_name, last_name)')
        .eq('client_id', clientId)
        .order('processed_at', { ascending: false })
        .limit(limit),
      db.from('figsy_campaigns')
        .select('id, name, created_at, status')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10),
      db.from('leads')
        .select('id, created_at, source')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ])

    type ActivityEvent = {
      id: string
      type: 'email_sent' | 'reply_received' | 'campaign_created' | 'lead_added'
      description: string
      timestamp: string
    }

    const events: ActivityEvent[] = []

    for (const row of sentRes.data ?? []) {
      const lead = (row as any).leads
      const name = lead ? `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() : 'a lead'
      const company = lead?.company ? ` at ${lead.company}` : ''
      events.push({
        id: `sent-${row.id}`,
        type: 'email_sent',
        description: `FIGSY sent Day ${row.step ?? 1} email to ${name}${company}`,
        timestamp: row.sent_at ?? new Date().toISOString(),
      })
    }

    for (const row of repliesRes.data ?? []) {
      const lead = (row as any).leads
      const name = lead ? `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim()
        : (row.from_name ?? row.from_email ?? 'Unknown')
      const label = row.classification === 'hot' ? 'Hot reply' :
        row.classification === 'warm' ? 'Warm reply' :
        row.classification === 'opt_out' ? 'Opt-out' : 'Reply'
      events.push({
        id: `reply-${row.id}`,
        type: 'reply_received',
        description: `${label} from ${name}`,
        timestamp: row.received_at ?? row.processed_at ?? new Date().toISOString(),
      })
    }

    for (const row of campaignsRes.data ?? []) {
      events.push({
        id: `campaign-${row.id}`,
        type: 'campaign_created',
        description: `Campaign "${row.name}" created`,
        timestamp: row.created_at ?? new Date().toISOString(),
      })
    }

    // Group leads by day to avoid 25 separate "lead added" events
    const leadsByDay: Record<string, number> = {}
    for (const row of leadsRes.data ?? []) {
      const day = (row.created_at ?? '').slice(0, 10)
      if (day) leadsByDay[day] = (leadsByDay[day] ?? 0) + 1
    }
    for (const [day, count] of Object.entries(leadsByDay)) {
      events.push({
        id: `leads-${day}`,
        type: 'lead_added',
        description: `${count} lead${count === 1 ? '' : 's'} added`,
        timestamp: `${day}T12:00:00.000Z`,
      })
    }

    // Sort by timestamp descending, cap at limit
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    res.json({ success: true, data: events.slice(0, limit) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Failed to fetch activity' })
  }
})

// Export for use in icps.ts (S5 — FIGSY auto-start)
export { autoEnrollLead }

// ── FIGSY PROACTIVE INSIGHTS (Learning Agent Phase 2) ─────────────────────────
// Analyses campaign patterns and surfaces 2-3 actionable insights.
// Rule-based — no AI cost. Refreshes on every call (fast enough for a KPI page).
figsyRouter.get('/insights', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const [campsRes, repliesRes, leadsRes] = await Promise.all([
      db.from('figsy_campaigns')
        .select('id, name, emails_sent, replies_total, replies_interested, opted_out, meetings_booked, status')
        .eq('client_id', clientId)
        .gt('emails_sent', 0),
      db.from('figsy_replies')
        .select('classification, received_at')
        .eq('client_id', clientId),
      db.from('leads')
        .select('score, industry, seniority')
        .eq('client_id', clientId)
        .not('score', 'is', null),
    ])

    const campaigns = campsRes.data ?? []
    const replies   = repliesRes.data ?? []
    const leads     = leadsRes.data ?? []

    const insights: { icon: string; title: string; body: string; action?: string; priority: number }[] = []

    // ── Pattern 1: Best performing campaign ──────────────────────────
    if (campaigns.length >= 2) {
      const withRate = campaigns.map(c => ({
        ...c,
        rate: (c.emails_sent ?? 0) > 0 ? (c.replies_total ?? 0) / (c.emails_sent ?? 1) : 0,
      }))
      const best  = withRate.reduce((a, b) => a.rate > b.rate ? a : b)
      const worst = withRate.reduce((a, b) => a.rate < b.rate ? a : b)
      if (best.id !== worst.id && best.rate > 0) {
        const diff = Math.round((best.rate - worst.rate) * 100)
        insights.push({
          icon: '🔥',
          title: `"${best.name}" is your top performer`,
          body: `${Math.round(best.rate * 100)}% reply rate — ${diff}pp above your lowest campaign. Consider reusing its messaging or ICP targeting in new campaigns.`,
          action: `View campaign`,
          priority: 1,
        })
      }
    }

    // ── Pattern 2: Hot reply concentration ───────────────────────────
    const hotCount  = replies.filter(r => r.classification === 'hot' || r.classification === 'interested').length
    const totalReplies = replies.length
    if (totalReplies >= 5) {
      const hotRate = hotCount / totalReplies
      if (hotRate >= 0.30) {
        insights.push({
          icon: '📈',
          title: `${Math.round(hotRate * 100)}% of replies are positive`,
          body: `Your targeting is precise — nearly 1 in 3 replies shows buying intent. Industry benchmark is 15–20%. Time to scale volume.`,
          priority: 2,
        })
      } else if (hotRate < 0.10 && totalReplies >= 20) {
        insights.push({
          icon: '🎯',
          title: `Replies are coming in, but few show buying intent`,
          body: `Only ${Math.round(hotRate * 100)}% of replies are positive. I'd recommend tightening the ICP — narrower targeting usually lifts intent quality even if volume drops slightly.`,
          action: `Review ICP`,
          priority: 2,
        })
      }
    }

    // ── Pattern 3: Opt-out signal ─────────────────────────────────────
    const totalSent    = campaigns.reduce((s, c) => s + (c.emails_sent ?? 0), 0)
    const totalOptOuts = campaigns.reduce((s, c) => s + (c.opted_out    ?? 0), 0)
    if (totalSent >= 50 && totalOptOuts > 0) {
      const optRate = totalOptOuts / totalSent
      if (optRate > 0.05) {
        insights.push({
          icon: '⚠️',
          title: `Opt-out rate is above average`,
          body: `${(optRate * 100).toFixed(1)}% of contacts have opted out — the threshold to watch is 3%. This usually means the ICP or opening message needs to be more specific and less generic.`,
          action: `Review messaging`,
          priority: 1,
        })
      }
    }

    // ── Pattern 4: Lead scoring spread ───────────────────────────────
    if (leads.length >= 10) {
      const highScore = leads.filter(l => (l.score ?? 0) >= 70).length
      const highPct   = Math.round((highScore / leads.length) * 100)
      if (highPct >= 40) {
        insights.push({
          icon: '⭐',
          title: `${highPct}% of your leads score 70+`,
          body: `Strong ICP match — your targeting filters are pulling the right people. Leads with score ≥ 70 typically convert at 2× the rate of the broader pool.`,
          priority: 3,
        })
      }
    }

    // ── Pattern 5: Volume nudge ───────────────────────────────────────
    if (totalSent === 0 && campaigns.length === 0) {
      insights.push({
        icon: '🚀',
        title: `Ready to launch`,
        body: `You have leads scored and ready. Create your first campaign and I'll write sequences, handle replies, and book meetings — all automatically.`,
        action: `Create campaign`,
        priority: 1,
      })
    } else if (totalSent > 0 && campaigns.filter(c => c.status === 'active').length === 0) {
      insights.push({
        icon: '⏸️',
        title: `No active campaigns running`,
        body: `You have ${totalSent.toLocaleString()} emails sent historically but nothing running now. Activate a campaign to keep pipeline moving.`,
        action: `Go to campaigns`,
        priority: 2,
      })
    }

    // ── Recent reply velocity ─────────────────────────────────────────
    const recentReplies = replies.filter(r => {
      const age = Date.now() - new Date(r.received_at).getTime()
      return age < 7 * 86400000
    })
    if (recentReplies.length >= 3) {
      insights.push({
        icon: '💬',
        title: `${recentReplies.length} replies in the last 7 days`,
        body: `${recentReplies.filter(r => r.classification === 'hot' || r.classification === 'interested').length} are positive. Check your inbox — quick follow-ups within 24h convert at 4× the rate of delayed responses.`,
        action: `Go to inbox`,
        priority: 2,
      })
    }

    // Return top 3 by priority, then recency
    const top = insights
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3)
      .map(({ priority: _p, ...i }) => i)

    res.json({ success: true, data: top })
  } catch (err) {
    console.error('[figsy/insights]', err)
    res.status(500).json({ success: false, error: 'Failed to generate insights' })
  }
})
