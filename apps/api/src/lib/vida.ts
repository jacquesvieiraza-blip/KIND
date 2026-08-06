import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { Resend } from 'resend'
import { draftFollowUp } from './denise'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'Vida by K.I.N.D <hello@get-kind.com>'

interface VidaConfig {
  bot_name: string
  system_prompt: string | null
  collect_email: boolean
  collect_phone: boolean
}

interface MessageHistory {
  role: string
  content: string
}

interface GenerateVidaReplyParams {
  clientId: string
  sessionId: string
  userMessage: string
  config: VidaConfig
  messageHistory: MessageHistory[]
}

interface GenerateVidaReplyResult {
  reply: string
  shouldCollectEmail: boolean
  shouldCollectPhone: boolean
  isHotLead: boolean
}

export async function generateVidaReply(
  params: GenerateVidaReplyParams,
): Promise<GenerateVidaReplyResult> {
  const { clientId, config, userMessage, messageHistory } = params

  // Fetch client company name
  const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).single()
  const clientCompanyName = (client as any)?.company_name ?? 'the company'

  const systemPrompt = [
    `You are ${config.bot_name}, a friendly AI assistant for ${clientCompanyName}.`,
    config.system_prompt || 'You help website visitors by answering questions and understanding their needs.',
    'Keep responses short — 2-3 sentences. Sound warm and human.',
    'If someone seems genuinely interested in buying or working with the company, express enthusiasm.',
    config.collect_email ? 'When appropriate, ask for their email to send more information.' : '',
    'Never be pushy. If they say they want to leave, wish them well.',
  ].filter(Boolean).join(' ')

  const messages: Anthropic.MessageParam[] = [
    ...messageHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: systemPrompt,
    messages,
  })

  const reply = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('')

  // Detect buying intent in the latest user message
  const buyingIntentKeywords = [
    'pricing', 'price', 'cost', 'how much', 'want to start', 'sign up', 'get started',
    'next steps', 'next step', 'how do i', 'can i buy', 'purchase', 'subscribe', 'trial',
    'demo', 'book a call', 'schedule', 'interested in', 'ready to',
  ]
  const lowerMsg = userMessage.toLowerCase()
  const isHotLead = buyingIntentKeywords.some(kw => lowerMsg.includes(kw))

  // Determine whether to collect email/phone based on config and conversation length
  const historyLength = messageHistory.length
  const shouldCollectEmail = config.collect_email && historyLength >= 2
  const shouldCollectPhone = config.collect_phone && historyLength >= 4

  return { reply, shouldCollectEmail, shouldCollectPhone, isHotLead }
}

export async function scoreSession(sessionId: string): Promise<void> {
  const { data: messages } = await db
    .from('vida_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (!messages || messages.length === 0) return

  const transcript = (messages as { role: string; content: string }[])
    .map(m => `${m.role === 'user' ? 'Visitor' : 'Vida'}: ${m.content}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `Score this conversation 0-100 for purchase intent. Return ONLY a JSON: {"score": number, "outcome": "browsing"|"interested"|"hot_lead"|"spam"}\n\nConversation:\n${transcript}`,
      },
    ],
  })

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('')

  try {
    const parsed = JSON.parse(text.trim())
    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : null
    const validOutcomes = ['browsing', 'interested', 'hot_lead', 'spam']
    const outcome = validOutcomes.includes(parsed.outcome) ? parsed.outcome : 'browsing'

    await db
      .from('vida_sessions')
      .update({ lead_score: score, outcome })
      .eq('id', sessionId)
  } catch {
    // If parsing fails, leave session as-is
  }
}

// R4 (#80, Atlas steal) — Speed-to-lead. The moment Vida flags a website
// visitor as hot, convert them into a real pipeline lead and (for Denise
// subscribers) draft an instant warm reply, so the client can respond in
// seconds while the visitor is still hot. Best-effort: never throws — a failure
// here must never break the live chat widget.
export interface SpeedToLeadResult {
  leadId: string | null
  draft: string | null
}

export async function speedToLeadHandoff(params: {
  clientId: string
  sessionId: string
  visitorName: string | null
  visitorEmail: string | null
}): Promise<SpeedToLeadResult> {
  const { clientId, sessionId, visitorName, visitorEmail } = params
  try {
    // Build a short conversation summary for context + the Denise draft.
    const { data: msgs } = await db
      .from('vida_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20)
    const transcript = ((msgs ?? []) as { role: string; content: string }[])
      .map(m => `${m.role === 'user' ? 'Visitor' : 'Vida'}: ${m.content}`)
      .join('\n')

    const [firstName, ...rest] = (visitorName || '').trim().split(/\s+/)
    const lastName = rest.join(' ')

    // Create / dedup the lead. A hot website visitor enters the pipeline
    // pre-scored — they raised their hand, so they're a strong lead.
    let leadId: string | null = null
    const emailLower = visitorEmail?.toLowerCase() || null
    if (emailLower) {
      const { data: existing } = await db.from('leads')
        .select('id').eq('client_id', clientId).eq('email', emailLower).maybeSingle()
      leadId = (existing as { id?: string } | null)?.id ?? null
    }
    if (!leadId) {
      // #349 — CHECKED, NOT SWALLOWED. This was `const { data: row }` with the error thrown
      // away, and it cost weeks: `source` below is a column no migration had ever created, so
      // Postgres rejected every one of these inserts, `row` came back null, and `leadId` fell
      // through as null with nothing logged. An inbound visitor who typed their email into
      // the website chat — the warmest lead there is — simply never became a lead, and the
      // failure was indistinguishable from nobody having visited.
      const { data: row, error: insertErr } = await db.from('leads').insert({
        client_id:      clientId,
        first_name:     firstName || 'Website',
        last_name:      lastName  || 'Visitor',
        email:          emailLower,
        status:         'scored',
        score:          85,
        score_reasoning: 'Inbound — raised their hand via the Vida website chat.',
        scored_at:      new Date().toISOString(),
        source:         'vida_chat',
      }).select('id').single()
      if (insertErr) {
        console.error('[vida/chat] an inbound website-chat visitor could NOT be saved as a lead — they are lost unless someone reads this line:', insertErr.message)
      }
      leadId = (row as { id?: string } | null)?.id ?? null
    }

    // Denise instant draft — gated on an active Denise subscription so we don't
    // leak the closer's value to non-subscribers (matches the morning-brief gate).
    let draft: string | null = null
    const { data: deniseSub } = await db.from('subscriptions')
      .select('id').eq('client_id', clientId)
      .in('product', ['denise', 'denise_addon']).eq('status', 'active').limit(1)
    if (Array.isArray(deniseSub) && deniseSub.length > 0 && process.env.ANTHROPIC_API_KEY) {
      draft = await draftFollowUp({
        first_name:           firstName || null,
        conversation_summary: transcript.slice(0, 1500),
        interest_signal:      'Reached out through the website chat and showed buying intent.',
      }).catch(() => null)
      if (draft && leadId) {
        await db.from('leads').update({ ai_email_draft: draft }).eq('id', leadId)
      }
    }

    return { leadId, draft }
  } catch (err) {
    console.error('[vida] speedToLeadHandoff failed:', err)
    return { leadId: null, draft: null }
  }
}

export async function notifyHotLead(
  clientId: string,
  sessionId: string,
  visitorName: string,
  visitorEmail: string | null,
  deniseDraft: string | null = null,
): Promise<void> {
  if (!resend) return

  const { data: config } = await db
    .from('vida_configs')
    .select('notify_email, bot_name')
    .eq('client_id', clientId)
    .single()

  const notifyEmail = (config as any)?.notify_email
  if (!notifyEmail) return

  const botName = (config as any)?.bot_name ?? 'Vida'
  const displayName = visitorName || 'A visitor'
  const emailLine = visitorEmail ? `Email: ${visitorEmail}` : 'No email provided'

  // R4: when Denise drafted an instant reply, surface it so the client can
  // respond in seconds — speed-to-lead is the whole point.
  const draftBlock = deniseDraft ? `
      <div style="margin:16px 0;padding:14px 16px;background:#f6f3ff;border-left:3px solid #7C3AED;border-radius:8px">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#7C3AED;text-transform:uppercase;letter-spacing:.05em">Denise drafted a reply — send it while they're hot</p>
        <p style="margin:0;white-space:pre-wrap;color:#333;font-size:14px;line-height:1.6">${deniseDraft.replace(/</g, '&lt;')}</p>
      </div>` : ''

  await resend.emails.send({
    from: FROM,
    to: notifyEmail,
    subject: `🔥 New hot lead from ${botName} — ${displayName}`,
    html: `
      <p>Hi there,</p>
      <p><strong>${displayName}</strong> was on your website and is interested in working with you. They're now in your pipeline as a scored lead.</p>
      <p>${emailLine}</p>
      ${draftBlock}
      <p><a href="${process.env.PORTAL_URL || 'https://app.get-kind.com'}/dashboard/leads">Open in your pipeline →</a> &nbsp;·&nbsp; <a href="${process.env.PORTAL_URL || 'https://app.get-kind.com'}/dashboard/chatbot">View the full conversation →</a></p>
      <p style="color:#666;font-size:12px;">Session ID: ${sessionId}</p>
      <p style="color:#666;font-size:12px;">Sent by ${botName} via K.I.N.D</p>
    `,
  })
}
