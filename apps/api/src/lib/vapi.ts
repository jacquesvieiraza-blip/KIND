import { db } from '@kind/db'

const VAPI_BASE_URL = 'https://api.vapi.ai'

export interface CreateCallParams {
  phoneNumber: string
  leadFirstName: string
  leadLastName: string
  leadCompany: string | null
  senderCompanyName: string
  step1Subject: string
  enrollmentId: string
  leadId: string
  campaignId: string
  clientId: string
}

/**
 * Initiates a Vapi voice call for a FIGSY follow-up.
 * Returns the Vapi call ID, or null if VAPI_API_KEY is not set or the call fails.
 */
export async function createCall(params: CreateCallParams): Promise<string | null> {
  const apiKey = process.env.VAPI_API_KEY
  if (!apiKey) {
    console.warn('[vapi] VAPI_API_KEY is not set — skipping voice call')
    return null
  }

  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID
  const assistantId   = process.env.VAPI_ASSISTANT_ID

  const firstMessage = `Hi ${params.leadFirstName}, this is calling from ${params.senderCompanyName}. I reached out by email a few days ago with the subject '${params.step1Subject}' — I wanted to follow up quickly. We help companies like ${params.leadCompany ?? 'yours'} with AI-powered outreach. Do you have two minutes?`

  const assistantInstructions = `You are a friendly, professional outreach caller for ${params.senderCompanyName}. You already sent an email to ${params.leadFirstName}. Your goal is to briefly introduce why you reached out, answer any questions, and try to book a 15-minute discovery call. Keep it short — under 3 minutes total. If they say they're not interested or ask you to stop calling, say 'No problem at all, I won't call again' and end the call. Never be pushy. Sound like a real person.`

  const body: Record<string, unknown> = {
    phoneNumberId,
    assistantId,
    customer: {
      number: params.phoneNumber,
    },
    assistantOverrides: {
      firstMessage,
      model: {
        systemPrompt: assistantInstructions,
        messages: [
          {
            role: 'system',
            content: assistantInstructions,
          },
        ],
      },
      variableValues: {
        leadFirstName:      params.leadFirstName,
        leadLastName:       params.leadLastName,
        leadCompany:        params.leadCompany ?? '',
        senderCompanyName:  params.senderCompanyName,
        step1Subject:       params.step1Subject,
        enrollmentId:       params.enrollmentId,
        leadId:             params.leadId,
        campaignId:         params.campaignId,
        clientId:           params.clientId,
      },
    },
  }

  try {
    const response = await fetch(`${VAPI_BASE_URL}/call`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[vapi] createCall failed:', response.status, text)
      return null
    }

    const data = await response.json() as { id?: string }
    return data.id ?? null
  } catch (err) {
    console.error('[vapi] createCall error:', err)
    return null
  }
}

/**
 * Handles Vapi webhook events and updates the figsy_calls table accordingly.
 * Supported events: call-started, call-ended, transcript-ready
 */
export async function handleWebhookEvent(event: any): Promise<void> {
  const eventType: string = event?.message?.type ?? event?.type
  const call = event?.message?.call ?? event?.call

  if (!call?.id) {
    console.warn('[vapi/webhook] No call ID in event:', eventType)
    return
  }

  const vapiCallId: string = call.id

  if (eventType === 'call-started') {
    await db.from('figsy_calls')
      .update({ status: 'ringing' })
      .eq('vapi_call_id', vapiCallId)
    return
  }

  if (eventType === 'call-ended') {
    const endedAt = call.endedAt ?? new Date().toISOString()

    // Map Vapi end reasons to outcome values
    const endReason: string | undefined = call.endedReason
    let outcome: string | null = null
    if (endReason) {
      if (endReason.includes('voicemail')) {
        outcome = 'voicemail'
      } else if (endReason.includes('no-answer') || endReason.includes('no_answer')) {
        outcome = 'no_answer'
      } else if (endReason.includes('error') || endReason.includes('fail')) {
        outcome = 'failed'
      } else if (endReason.includes('customer-ended') || endReason.includes('assistant-ended') || endReason.includes('hangup')) {
        outcome = 'answered'
      }
    }

    const durationSeconds: number | null = call.duration != null ? Math.round(call.duration) : null

    await db.from('figsy_calls')
      .update({
        status:           'ended',
        outcome,
        duration_seconds: durationSeconds,
        ended_at:         endedAt,
      })
      .eq('vapi_call_id', vapiCallId)
    return
  }

  if (eventType === 'transcript-ready') {
    const transcript: string | undefined = event?.message?.transcript ?? event?.transcript
    if (transcript) {
      await db.from('figsy_calls')
        .update({ transcript })
        .eq('vapi_call_id', vapiCallId)
    }
    return
  }

  console.warn('[vapi/webhook] Unhandled event type:', eventType)
}
