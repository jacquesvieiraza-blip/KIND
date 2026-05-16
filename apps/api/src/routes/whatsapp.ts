// Mount in index.ts: app.use('/whatsapp', whatsappRouter)

import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { sendTextMessage, classifyAndRespond } from '../lib/whatsapp'

export const whatsappRouter = Router()

// ── WEBHOOK VERIFICATION (public) ────────────────────────────────────────────
// Meta calls this GET when you register the webhook URL in the Developer Console.

whatsappRouter.get('/webhook', (req, res) => {
  const mode        = req.query['hub.mode']
  const token       = req.query['hub.verify_token']
  const challenge   = req.query['hub.challenge']
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    res.status(200).send(challenge)
    return
  }

  res.status(403).json({ success: false, error: 'Verification failed' })
})

// ── INBOUND WEBHOOK (public) ──────────────────────────────────────────────────
// Meta POSTs here when someone messages the business WhatsApp number.
// Must return 200 immediately; processing runs in background.

whatsappRouter.post('/webhook', async (req, res) => {
  // Always respond 200 immediately — Meta will retry if it doesn't get a fast ack
  res.status(200).json({ received: true })

  if (!process.env.WHATSAPP_TOKEN) return

  try {
    const body = req.body as {
      object?: string
      entry?: {
        changes?: {
          value?: {
            messages?: {
              from: string
              type: string
              text?: { body: string }
              id: string
            }[]
            contacts?: { profile: { name: string } }[]
            metadata?: { phone_number_id: string }
          }
        }[]
      }[]
    }

    if (body.object !== 'whatsapp_business_account') return

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value
        if (!value?.messages?.length) continue

        const contactName = value.contacts?.[0]?.profile?.name ?? ''

        // Resolve clientId by matching the phone number ID, or fall back to query param
        let clientId: string | null = null
        if (phoneNumberId) {
          const { data: client } = await db.from('clients')
            .select('id')
            .eq('whatsapp_phone_number_id', phoneNumberId)
            .maybeSingle()
          clientId = client?.id ?? null
        }

        // Fallback: allow clientId to be passed as a query param during webhook registration
        if (!clientId && req.query.client_id) {
          clientId = req.query.client_id as string
        }

        if (!clientId) {
          console.warn('[whatsapp/webhook] Could not resolve clientId for phone_number_id:', phoneNumberId)
          continue
        }

        for (const message of value.messages) {
          // Only handle text messages for now
          if (message.type !== 'text' || !message.text?.body) continue

          const from        = message.from
          const messageBody = message.text.body

          // Handle explicit opt-out
          const isOptOut = /\bSTOP\b/i.test(messageBody) || /\bunsubscribe\b/i.test(messageBody)
          if (isOptOut) {
            try {
              await db.from('opt_out_blocklist').upsert({
                whatsapp_number: from,
                reason: 'whatsapp_stop',
              }, { onConflict: 'whatsapp_number', ignoreDuplicates: false })
            } catch {
              // whatsapp_number column may not exist — use email field with a note
              try {
                await db.from('opt_out_blocklist').upsert({
                  email:  `whatsapp:${from}`,
                  reason: 'whatsapp_stop',
                }, { onConflict: 'email', ignoreDuplicates: false })
              } catch (optOutErr) {
                console.error('[whatsapp/webhook] opt-out insert failed:', optOutErr)
              }
            }
          }

          // Let Vida respond (handles opt-out message text too)
          classifyAndRespond({
            incomingMessage: messageBody,
            clientId,
            from,
            contactName,
          }).catch(err => console.error('[whatsapp/webhook] classifyAndRespond error:', err))
        }
      }
    }
  } catch (err) {
    console.error('[whatsapp/webhook] processing error:', err)
  }
})

// ── SEND MESSAGE (auth required) ─────────────────────────────────────────────
// FIGSY outreach: send a WhatsApp message to an enrolled lead.

whatsappRouter.post('/send', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      to:       z.string().min(1),
      message:  z.string().min(1),
      leadId:   z.string().uuid().optional(),
    }).parse(req.body)

    if (!process.env.WHATSAPP_TOKEN) {
      res.status(503).json({ success: false, error: 'WhatsApp is not configured' })
      return
    }

    const messageId = await sendTextMessage(body.to, body.message)
    if (!messageId) {
      res.status(502).json({ success: false, error: 'Failed to send WhatsApp message' })
      return
    }

    // Log to figsy_sent_emails or whatsapp_messages if available
    try {
      await db.from('whatsapp_messages').insert({
        from_number:   process.env.WHATSAPP_PHONE_NUMBER_ID ?? null,
        to_number:     body.to,
        lead_id:       body.leadId ?? null,
        message:       body.message,
        whatsapp_id:   messageId,
        direction:     'outbound',
      })
    } catch {
      // Table may not exist — fall back to figsy_sent_emails
      try {
        if (body.leadId) {
          await db.from('figsy_sent_emails').insert({
            lead_id:  body.leadId,
            step:     1,
            subject:  'WhatsApp',
            body:     body.message,
            resend_id: messageId,
          })
        }
      } catch {
        // Best-effort logging only
        console.log('[whatsapp/send] sent:', { to: body.to, messageId })
      }
    }

    res.json({ success: true, messageId })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[whatsapp/send]', err)
    res.status(500).json({ success: false, error: 'Failed to send message' })
  }
})

// ── STATUS (auth required) ────────────────────────────────────────────────────
// Portal uses this to show whether WhatsApp is configured.

whatsappRouter.get('/status', requireAuth, (_req, res) => {
  res.json({ configured: Boolean(process.env.WHATSAPP_TOKEN) })
})
