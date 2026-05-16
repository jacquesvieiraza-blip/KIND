import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'

const BASE_URL = 'https://graph.facebook.com/v19.0'

function getToken(): string | undefined {
  return process.env.WHATSAPP_TOKEN
}

function getPhoneNumberId(): string | undefined {
  return process.env.WHATSAPP_PHONE_NUMBER_ID
}

// ── SEND TEXT MESSAGE ─────────────────────────────────────────────────────────

export async function sendTextMessage(to: string, body: string): Promise<string | null> {
  const token = getToken()
  const phoneNumberId = getPhoneNumberId()
  if (!token || !phoneNumberId) return null

  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    })

    const data = await res.json() as { messages?: { id: string }[]; error?: { message: string } }
    if (!res.ok) {
      console.error('[whatsapp] sendTextMessage error:', data.error?.message)
      return null
    }

    return data.messages?.[0]?.id ?? null
  } catch (err) {
    console.error('[whatsapp] sendTextMessage failed:', err)
    return null
  }
}

// ── SEND TEMPLATE MESSAGE ─────────────────────────────────────────────────────
// Required for first contact or messages sent outside the 24-hour conversation window.

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  components: any[],
): Promise<string | null> {
  const token = getToken()
  const phoneNumberId = getPhoneNumberId()
  if (!token || !phoneNumberId) return null

  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    })

    const data = await res.json() as { messages?: { id: string }[]; error?: { message: string } }
    if (!res.ok) {
      console.error('[whatsapp] sendTemplateMessage error:', data.error?.message)
      return null
    }

    return data.messages?.[0]?.id ?? null
  } catch (err) {
    console.error('[whatsapp] sendTemplateMessage failed:', err)
    return null
  }
}

// ── VIDA: CLASSIFY AND RESPOND ────────────────────────────────────────────────

export async function classifyAndRespond(params: {
  incomingMessage: string
  clientId: string
  from: string
  contactName: string
}): Promise<void> {
  const { incomingMessage, clientId, from, contactName } = params
  const token = getToken()
  if (!token) return

  try {
    // Fetch client company name
    const { data: client } = await db.from('clients')
      .select('company_name')
      .eq('id', clientId)
      .single()

    const companyName = client?.company_name ?? 'our company'

    // Generate Vida's response via Claude Haiku
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: `You are Vida, a friendly AI assistant for ${companyName}. You help answer questions, qualify potential clients, and connect warm leads with the team. Keep responses short — 2-3 sentences max. Sound human and warm. If someone wants to buy, learn more, or book a call, ask for their name, email, and what they need. If they say stop or unsubscribe, say "No problem! I'll make sure you're not contacted again." and flag for opt-out.`,
      messages: [
        {
          role: 'user',
          content: `${contactName ? `The person's name is ${contactName}. ` : ''}They sent: "${incomingMessage}"`,
        },
      ],
    })

    const replyText = (response.content[0] as { type: string; text: string }).text.trim()

    // Send the reply
    await sendTextMessage(from, replyText)

    // Log interaction to whatsapp_messages table if it exists
    try {
      await db.from('whatsapp_messages').insert({
        client_id:        clientId,
        from_number:      from,
        contact_name:     contactName || null,
        incoming_message: incomingMessage,
        reply_message:    replyText,
        direction:        'inbound',
      })
    } catch {
      // Table may not exist yet — log to console as fallback
      console.log('[whatsapp] vida interaction:', {
        clientId,
        from,
        contactName,
        incomingMessage,
        replyText,
      })
    }
  } catch (err) {
    console.error('[whatsapp] classifyAndRespond failed:', err)
  }
}
