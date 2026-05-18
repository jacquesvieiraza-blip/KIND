import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { Resend } from 'resend'

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

export async function notifyHotLead(
  clientId: string,
  sessionId: string,
  visitorName: string,
  visitorEmail: string | null,
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

  await resend.emails.send({
    from: FROM,
    to: notifyEmail,
    subject: `New hot lead from ${botName} — ${displayName}`,
    html: `
      <p>Hi there,</p>
      <p><strong>${displayName}</strong> was on your website and is interested in working with you.</p>
      <p>${emailLine}</p>
      <p><a href="${process.env.PORTAL_URL || 'https://app.get-kind.com'}/dashboard/chatbot">View the full conversation →</a></p>
      <p style="color:#666;font-size:12px;">Session ID: ${sessionId}</p>
      <p style="color:#666;font-size:12px;">Sent by ${botName} via K.I.N.D</p>
    `,
  })
}
