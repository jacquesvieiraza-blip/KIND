import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { Resend } from 'resend'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = 'K.I.N.D <hello@get-kind.com>'

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string | null
  job_title: string | null
  company: string | null
  industry: string | null
  seniority: string | null
  country: string | null
  tech_stack: string[] | null
  score: number | null
  score_reasoning: string | null
}

interface EmailStep {
  subject: string
  body: string
}

interface SequenceDraft {
  step1: EmailStep
  step2: EmailStep
  step3: EmailStep
}

export async function generateSequence(
  lead: Lead,
  senderCompanyName: string,
  senderIndustry: string | null,
): Promise<SequenceDraft> {
  const prompt = `You are an expert B2B sales copywriter for ${senderCompanyName}${senderIndustry ? ` (${senderIndustry})` : ''}.

Write a 3-step cold outreach email sequence for this lead:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'unknown'}
- Company: ${lead.company || 'unknown'}
- Industry: ${lead.industry || 'unknown'}
- Seniority: ${lead.seniority || 'unknown'}
- Country: ${lead.country || 'unknown'}
${lead.tech_stack?.length ? `- Tech stack: ${lead.tech_stack.slice(0, 5).join(', ')}` : ''}
${lead.score_reasoning ? `- Why they match: ${lead.score_reasoning}` : ''}

Rules:
- Step 1 (Day 0): First touch. Short, personal, specific to their role. Single CTA: 15-min call.
- Step 2 (Day 4): Follow-up. Reference step 1, add a relevant insight or case study angle. Keep it light.
- Step 3 (Day 9): Final touch. Brief, no pressure, leave the door open.
- Each email ≤ 120 words.
- No buzzwords. No "Hope this finds you well". Sound human.
- Subject lines: short, specific, no clickbait.

Return ONLY valid JSON, no markdown:
{
  "step1": {"subject": "...", "body": "..."},
  "step2": {"subject": "...", "body": "..."},
  "step3": {"subject": "...", "body": "..."}
}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  return JSON.parse(raw) as SequenceDraft
}

export async function classifyReply(body: string): Promise<{
  classification: 'interested' | 'not_interested' | 'opt_out' | 'out_of_office' | 'other'
  reasoning: string
}> {
  const prompt = `Classify this email reply from a B2B cold outreach recipient.

Reply:
"""
${body.slice(0, 1000)}
"""

Classify as exactly one of:
- "interested": They want to learn more, ask a question, or agree to a call
- "not_interested": They politely decline, say not now, or not relevant
- "opt_out": They explicitly ask to be removed, say stop emailing, or unsubscribe
- "out_of_office": Auto-reply or OOO message
- "other": Anything else (bounce, spam, unclear)

Return ONLY valid JSON: {"classification": "...", "reasoning": "one sentence"}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 128,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  return JSON.parse(raw)
}

export async function sendSequenceEmail(
  enrollmentId: string,
  lead: Lead,
  step: 1 | 2 | 3,
  subject: string,
  body: string,
  campaignId: string,
): Promise<void> {
  if (!lead.email) throw new Error('Lead has no email')

  let messageId: string | undefined
  if (resend) {
    const result = await resend.emails.send({
      from: FROM,
      to: lead.email,
      subject,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.7">
        ${body.split('\n').map(line => `<p style="margin:0 0 12px">${line}</p>`).join('')}
      </div>`,
    })
    messageId = (result as any).data?.id ?? undefined
  }

  await db.from('figsy_sent_emails').insert({
    enrollment_id: enrollmentId,
    campaign_id:   campaignId,
    lead_id:       lead.id,
    step,
    subject,
    body,
    resend_id:     messageId ?? null,
  })

  // Advance enrollment state
  const nextSendDelays: Record<number, number> = { 1: 4, 2: 5 } // days until next step
  const nextSendAt = step < 3
    ? new Date(Date.now() + (nextSendDelays[step] ?? 4) * 86400000).toISOString()
    : null

  await db.from('figsy_enrollments').update({
    current_step: step,
    status:       step === 3 ? 'completed' : 'in_progress',
    next_send_at: nextSendAt,
    ...(step === 3 ? { completed_at: new Date().toISOString() } : {}),
  }).eq('id', enrollmentId)

  // Bump campaign email count
  await db.rpc('increment_figsy_emails_sent', { campaign_id: campaignId }).maybeSingle()
    .catch(() => {
      // RPC may not exist yet — do direct update fallback
      db.from('figsy_campaigns')
        .select('emails_sent').eq('id', campaignId).single()
        .then(({ data }: { data: any }) => {
          if (data) {
            db.from('figsy_campaigns')
              .update({ emails_sent: (data.emails_sent ?? 0) + 1 })
              .eq('id', campaignId)
          }
        })
    })
}

// Auto-enroll a single consented lead into the active campaign (S5 — FIGSY auto-start)
export async function autoEnrollLead(leadId: string, clientId: string): Promise<void> {
  try {
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id, name')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!campaign) return // No active campaign — nothing to do

    const { data: lead } = await db.from('leads')
      .select('id, first_name, last_name, email, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
      .eq('id', leadId).single()
    if (!lead?.email) return

    const { data: client } = await db.from('clients')
      .select('company_name, industry').eq('id', clientId).single()

    const draft = await generateSequence(lead as Lead, client?.company_name ?? '', client?.industry ?? null)

    const { data: enrollment, error } = await db.from('figsy_enrollments').insert({
      campaign_id:    campaign.id,
      lead_id:        leadId,
      client_id:      clientId,
      status:         'enrolled',
      current_step:   0,
      next_send_at:   new Date().toISOString(), // send step 1 immediately
      step1_subject:  draft.step1.subject,
      step1_body:     draft.step1.body,
      step2_subject:  draft.step2.subject,
      step2_body:     draft.step2.body,
      step3_subject:  draft.step3.subject,
      step3_body:     draft.step3.body,
    }).select('id').single()

    if (error || !enrollment) return

    // Increment campaign enrolled count
    const { data: camp } = await db.from('figsy_campaigns')
      .select('leads_enrolled').eq('id', campaign.id).single()
    if (camp) {
      await db.from('figsy_campaigns')
        .update({ leads_enrolled: (camp.leads_enrolled ?? 0) + 1 })
        .eq('id', campaign.id)
    }

    // Send step 1 immediately
    await sendSequenceEmail(
      enrollment.id,
      lead as Lead,
      1,
      draft.step1.subject,
      draft.step1.body,
      campaign.id,
    )
  } catch (err) {
    console.error('[figsy] autoEnrollLead failed:', err)
  }
}
