// Mount in index.ts: app.use('/voice', voiceRouter)

import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { createCall, handleWebhookEvent } from '../lib/vapi'
import crypto from 'crypto'

export const voiceRouter = Router()

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).single()
  return data?.id ?? null
}

// ── INITIATE A CALL ───────────────────────────────────────────────────────────
voiceRouter.post('/calls', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { enrollmentId, leadId, campaignId } = z.object({
      enrollmentId: z.string().uuid(),
      leadId:       z.string().uuid(),
      campaignId:   z.string().uuid(),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Fetch the lead — must belong to this client and have a phone number
    const { data: lead, error: leadErr } = await db.from('leads')
      .select('id, first_name, last_name, phone, company, status')
      .eq('id', leadId)
      .eq('client_id', clientId)
      .single()

    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }
    if (!lead.phone) { res.status(400).json({ success: false, error: 'Lead has no phone number' }); return }

    // Check opt-out blocklist (by phone is not typical, but check lead status)
    if (lead.status === 'opted_out') {
      res.status(400).json({ success: false, error: 'Lead has opted out' }); return
    }

    // Verify enrollment belongs to this client and campaign
    const { data: enrollment, error: enrollErr } = await db.from('figsy_enrollments')
      .select('id, step1_subject, client_id, lead_id, campaign_id')
      .eq('id', enrollmentId)
      .eq('lead_id', leadId)
      .eq('campaign_id', campaignId)
      .eq('client_id', clientId)
      .single()

    if (enrollErr || !enrollment) {
      res.status(404).json({ success: false, error: 'Enrollment not found' }); return
    }

    const { data: client } = await db.from('clients')
      .select('company_name').eq('id', clientId).single()

    const vapiCallId = await createCall({
      phoneNumber:       lead.phone,
      leadFirstName:     lead.first_name,
      leadLastName:      lead.last_name ?? '',
      leadCompany:       lead.company ?? null,
      senderCompanyName: client?.company_name ?? '',
      step1Subject:      enrollment.step1_subject ?? '',
      enrollmentId,
      leadId,
      campaignId,
      clientId,
    })

    // Insert call record regardless (null vapi_call_id signals skipped/failed initiation)
    const { data: callRecord, error: insertErr } = await db.from('figsy_calls').insert({
      enrollment_id: enrollmentId,
      lead_id:       leadId,
      campaign_id:   campaignId,
      client_id:     clientId,
      vapi_call_id:  vapiCallId ?? null,
      status:        vapiCallId ? 'initiated' : 'failed',
    }).select('id').single()

    if (insertErr) throw insertErr

    res.status(201).json({ success: true, callId: callRecord?.id, vapiCallId })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[voice/calls]', err)
    res.status(500).json({ success: false, error: 'Failed to initiate call' })
  }
})

// ── VAPI WEBHOOK ──────────────────────────────────────────────────────────────
// No auth — Vapi posts here with call events. Verify signature if VAPI_WEBHOOK_SECRET is set.
voiceRouter.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.VAPI_WEBHOOK_SECRET
    if (secret) {
      const signature = req.headers['x-vapi-signature'] as string | undefined
      if (!signature) {
        res.status(401).json({ success: false, error: 'Missing webhook signature' }); return
      }

      // Vapi signs the raw body with HMAC-SHA256
      const rawBody = JSON.stringify(req.body)
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        res.status(401).json({ success: false, error: 'Invalid webhook signature' }); return
      }
    }

    await handleWebhookEvent(req.body)
    res.status(200).json({ received: true })
  } catch (err) {
    console.error('[voice/webhook]', err)
    res.status(200).json({ received: true }) // Always 200 to webhook provider
  }
})

// ── LIST CALLS FOR AN ENROLLMENT ──────────────────────────────────────────────
voiceRouter.get('/calls/:enrollmentId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { enrollmentId } = z.object({
      enrollmentId: z.string().uuid(),
    }).parse(req.params)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Verify the enrollment belongs to this client
    const { data: enrollment } = await db.from('figsy_enrollments')
      .select('id').eq('id', enrollmentId).eq('client_id', clientId).single()
    if (!enrollment) { res.status(404).json({ success: false, error: 'Enrollment not found' }); return }

    const { data, error } = await db.from('figsy_calls')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[voice/calls/:enrollmentId]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch calls' })
  }
})
