import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { Resend } from 'resend'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM     = 'K.I.N.D <hello@get-kind.com>'
const REPLY_TO = process.env.FIGSY_REPLY_TO || 'hello@get-kind.com'

if (!process.env.RESEND_API_KEY) {
  console.warn('[figsy] ⚠️  RESEND_API_KEY not set — ALL outreach emails will be silently skipped. Set this in Railway env vars.')
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[figsy] ⚠️  ANTHROPIC_API_KEY not set — email generation will fail.')
}

// Strip markdown code fences that Claude sometimes wraps JSON in
function stripJson(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

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
  campaignIntent?: string,
): Promise<SequenceDraft> {
  // ── Signal detection — pick the best personalization hook ─────────────────
  const signals: string[] = []
  if (lead.tech_stack && lead.tech_stack.length > 0) {
    signals.push(`Uses ${lead.tech_stack.slice(0, 2).join(' and ')} in their tech stack`)
  }
  if (lead.industry) {
    signals.push(`Works in ${lead.industry}`)
  }
  if (lead.score_reasoning) {
    signals.push(lead.score_reasoning)
  }
  const bestSignal = signals[0] ?? null

  const prompt = `You are writing cold outreach emails on behalf of ${senderCompanyName}${senderIndustry ? ` (${senderIndustry})` : ''}. You write as a real person at the company — not an AI, not a bot. Your emails sound like they were typed quickly by someone who genuinely noticed this prospect and thought "this person needs to hear this."

Lead details:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'unknown'}
- Company: ${lead.company || 'unknown'}
- Industry: ${lead.industry || 'unknown'}
- Seniority: ${lead.seniority || 'unknown'}
- Country: ${lead.country || 'unknown'}
${bestSignal ? `- Best personalization signal (USE THIS to open Step 1): ${bestSignal}` : ''}
${lead.tech_stack?.length ? `- Tech stack: ${lead.tech_stack.slice(0, 5).join(', ')}` : ''}

Write a 3-email sequence:

Step 1 (Day 0) — First touch:
- MANDATORY: Open with a specific observation using the personalization signal provided above. If they use Salesforce, reference it. If they're in fintech, reference it. Make them feel like you actually looked them up — because we did.
- One sentence on what ${senderCompanyName} does and why it matters to them specifically.
- One soft CTA: quick call, 15 minutes.
- Max 70 words. No subject line tricks. Subject should feel like a colleague's email.

Step 2 (Day 4) — Follow-up:
- Acknowledge you sent something already — don't pretend this is the first email.
- Add a new angle: a question, a stat, a short insight relevant to their industry.
- Keep it shorter than Step 1. Lighter. No pressure.
- Max 60 words.

Step 3 (Day 9) — Final touch:
- Be direct: this is the last email.
- Leave it genuinely open — no guilt, no urgency tactics.
- 3–4 sentences max.

Hard rules (violating any of these makes the email useless):
- Never say "Hope this finds you well", "I wanted to reach out", "touch base", "synergy", "leverage", "game-changer", or "revolutionary"
- No bullet points in the email body
- No em-dashes (—) — they read as AI
- Don't mention you're an AI or automation
- Don't make up facts about their company you don't know
- Subject lines: 4–6 words, lowercase, no punctuation, no questions
- End every email with: "Reply STOP to opt out."
- Sign off with a real first name (pick a South African-sounding name that fits the sender's industry)
${campaignIntent ? `
Campaign focus for this batch: ${campaignIntent}
Use this to personalise the angle, pain point references, and geography signals in your emails.` : ''}
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
  let draft: SequenceDraft
  try {
    draft = JSON.parse(stripJson(raw)) as SequenceDraft
  } catch {
    console.error('[figsy] generateSequence JSON parse failed, raw:', raw.slice(0, 200))
    throw new Error('Failed to generate email sequence — Claude returned invalid JSON')
  }
  // Thread steps 2 & 3 as replies so they land in the same Gmail thread
  const baseSubject = draft.step1.subject
  if (!draft.step2.subject.toLowerCase().startsWith('re:')) {
    draft.step2.subject = `Re: ${baseSubject}`
  }
  if (!draft.step3.subject.toLowerCase().startsWith('re:')) {
    draft.step3.subject = `Re: ${baseSubject}`
  }
  return draft
}

export type ReplyClassification =
  | 'hot'           // 🔥 Ready to talk — wants a call, asks next steps, agrees to meet
  | 'warm'          // 🌤️ Interested but not now — open to future conversation
  | 'cold'          // ❄️ Not relevant — politely declines, wrong timing, not a fit
  | 'opt_out'       // 🚫 Stop emailing — explicit unsubscribe request
  | 'wrong_person'  // 👤 Not the right contact — forwarded, CC'd someone else, refers elsewhere
  | 'out_of_office' // ✈️ Auto-reply or OOO
  | 'other'         // ❓ Unclear, bounce, spam, or unclassifiable

export async function classifyReply(body: string): Promise<{
  classification: ReplyClassification
  reasoning: string
}> {
  const prompt = `You are classifying a B2B cold outreach reply for a sales team.
Your classification determines how they handle the lead — be precise.

Reply:
"""
${body.slice(0, 1200)}
"""

Classify as exactly one of:
- "hot": Prospect wants to talk NOW — asks for a call, agrees to meet, asks about pricing/details, or says yes
- "warm": Prospect is interested but not ready — says "maybe later", "reach me in Q3", "send me more info", asks a question without committing
- "cold": Not a fit right now — politely declines, says not relevant, bad timing with no openness
- "opt_out": Explicitly wants to be removed — "unsubscribe", "stop emailing me", "remove me from your list"
- "wrong_person": Not the right contact — "I'm not the decision maker", "try [name]", forwards to someone else
- "out_of_office": Automated OOO reply, holiday message, or auto-responder
- "other": Bounce, spam filter response, completely unclear, or unrelated

Rules:
- If they ask ANY question, lean toward "hot" or "warm", not "cold"
- If they give a future date, use "warm" not "cold"
- "opt_out" requires explicit unsubscribe language
- OOO messages are almost always automated and short

Return ONLY valid JSON: {"classification": "...", "reasoning": "one sentence max"}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  const parsed = JSON.parse(raw) as { classification: string; reasoning: string }

  // Normalise legacy values that might come back from old prompts
  const legacyMap: Record<string, ReplyClassification> = {
    interested:     'hot',
    not_interested: 'cold',
  }
  const classification = (legacyMap[parsed.classification] ?? parsed.classification) as ReplyClassification

  return { classification, reasoning: parsed.reasoning }
}

// Days to wait after sending step N before the next step is due.
const STEP_FOLLOWUP_DELAYS: Record<number, number> = { 1: 4, 2: 5 }

type OnReply = 'stop' | 'skip_next' | 'continue'
type SeqStep = { step: number; on_reply?: OnReply }

interface BranchableEnrollment {
  id: string
  campaign_id: string
  current_step: number
  enrolled_at?: string | null
  reply_branch_handled_at?: string | null
}

/**
 * Honour a sequence step's `on_reply` setting before the cron sends the next step.
 *
 * If the lead has replied since we last acted (and the campaign has configured
 * steps), we branch based on the on_reply value of the step they're replying to
 * (the last sent step = current_step):
 *   - 'stop'      → mark the enrollment 'replied' and send nothing more
 *   - 'skip_next' → skip the immediate next step, continue with the one after
 *   - 'continue'  → acknowledge the reply and send the next step as normal
 *
 * Campaigns without configured steps keep the legacy behaviour (keep sending).
 * `reply_branch_handled_at` is advanced on every decision so a single reply only
 * branches once. Returns 'send' to proceed, or 'skip' if the enrollment was
 * already actioned this run.
 *
 * @param stepsCache per-run cache of campaign_id → steps, to avoid refetching.
 */
export async function applyReplyBranching(
  enrollment: BranchableEnrollment,
  stepsCache: Map<string, SeqStep[] | null>,
): Promise<'send' | 'skip'> {
  // Step 1 is the first contact — no reply can exist before it.
  if (enrollment.current_step < 1) return 'send'

  const since = enrollment.reply_branch_handled_at ?? enrollment.enrolled_at ?? '1970-01-01T00:00:00Z'
  const { count } = await db.from('figsy_replies')
    .select('id', { count: 'exact', head: true })
    .eq('enrollment_id', enrollment.id)
    .gt('received_at', since)
  if (!count) return 'send'

  // Resolve the campaign's configured steps (cached per run).
  let steps = stepsCache.get(enrollment.campaign_id)
  if (steps === undefined) {
    const { data: camp } = await db.from('figsy_campaigns')
      .select('settings').eq('id', enrollment.campaign_id).maybeSingle()
    steps = ((camp?.settings as { steps?: SeqStep[] } | null)?.steps) ?? null
    stepsCache.set(enrollment.campaign_id, steps)
  }

  // No configured sequence → preserve legacy behaviour (keep sending).
  const onReply: OnReply = steps
    ? (steps.find(s => s.step === enrollment.current_step)?.on_reply ?? 'stop')
    : 'continue'

  const now = new Date().toISOString()

  if (onReply === 'continue') {
    await db.from('figsy_enrollments')
      .update({ reply_branch_handled_at: now }).eq('id', enrollment.id)
    return 'send'
  }

  if (onReply === 'stop') {
    await db.from('figsy_enrollments')
      .update({ status: 'replied', next_send_at: null, reply_branch_handled_at: now })
      .eq('id', enrollment.id)
    return 'skip'
  }

  // skip_next — skip the immediate next step, continue with the one after.
  const skipped = enrollment.current_step + 1
  if (skipped >= 3) {
    // Nothing follows the skipped step — the sequence is finished.
    await db.from('figsy_enrollments').update({
      status: 'completed', completed_at: now, next_send_at: null,
      current_step: skipped, reply_branch_handled_at: now,
    }).eq('id', enrollment.id)
  } else {
    const nextSendAt = new Date(Date.now() + (STEP_FOLLOWUP_DELAYS[skipped] ?? 4) * 86400000).toISOString()
    await db.from('figsy_enrollments').update({
      status: 'in_progress', current_step: skipped,
      next_send_at: nextSendAt, reply_branch_handled_at: now,
    }).eq('id', enrollment.id)
  }
  return 'skip'
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

  // Insert the DB record first so we have the emailId for the tracking pixel
  const { data: emailRecord } = await db.from('figsy_sent_emails').insert({
    enrollment_id: enrollmentId,
    campaign_id:   campaignId,
    lead_id:       lead.id,
    step,
    subject,
    body,
    resend_id:     null, // updated below after send
  }).select('id').single()

  const emailId = (emailRecord as { id?: string } | null)?.id ?? null

  if (!resend) {
    console.warn(`[figsy] sendSequenceEmail: RESEND_API_KEY not set — step ${step} email to ${lead.email} NOT sent (enrollment still recorded)`)
  }
  if (resend) {
    // P0-4: tracking pixel injection
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
    const trackingPixel = emailId
      ? `<img src="${apiUrl}/figsy/track/open/${emailId}" width="1" height="1" style="display:none;width:1px;height:1px" alt="" />`
      : ''

    const result = await resend.emails.send({
      from:     FROM,
      reply_to: REPLY_TO,
      to:       lead.email,
      subject,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.7">
        ${body.split('\n').map(line => `<p style="margin:0 0 12px">${line}</p>`).join('')}
        ${trackingPixel}
      </div>`,
    })
    messageId = (result as any).data?.id ?? undefined

    // Update resend_id now that we have it
    if (emailId && messageId) {
      await db.from('figsy_sent_emails').update({ resend_id: messageId }).eq('id', emailId)
    }
  }

  // Advance enrollment state
  const nextSendAt = step < 3
    ? new Date(Date.now() + (STEP_FOLLOWUP_DELAYS[step] ?? 4) * 86400000).toISOString()
    : null

  await db.from('figsy_enrollments').update({
    current_step: step,
    status:       step === 3 ? 'completed' : 'in_progress',
    next_send_at: nextSendAt,
    ...(step === 3 ? { completed_at: new Date().toISOString() } : {}),
  }).eq('id', enrollmentId)

  // Bump campaign email count
  try {
    await db.rpc('increment_figsy_emails_sent', { campaign_id: campaignId }).maybeSingle()
  } catch {
    // RPC may not exist yet — do direct update fallback
    const { data } = await db.from('figsy_campaigns')
      .select('emails_sent').eq('id', campaignId).single()
    if (data) {
      await db.from('figsy_campaigns')
        .update({ emails_sent: ((data as { emails_sent?: number }).emails_sent ?? 0) + 1 })
        .eq('id', campaignId)
    }
  }
}

interface Day1Draft {
  subject: string
  body: string
}

async function generateDay1Email(
  lead: Lead,
  senderCompany: string,
  senderIndustry: string | null,
): Promise<Day1Draft> {
  const prompt = `You are writing a cold email on behalf of ${senderCompany}${senderIndustry ? ` (${senderIndustry})` : ''}. You write as a real person at the company — someone who noticed this prospect and decided to reach out. Not templated. Not AI-sounding. Like someone who typed this in 90 seconds.

Lead:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'unknown'}
- Company: ${lead.company || 'unknown'}
- Industry: ${lead.industry || 'unknown'}
- Country: ${lead.country || 'unknown'}
${lead.score_reasoning ? `- Why they're a fit: ${lead.score_reasoning}` : ''}

Write one cold email. First touch. Under 70 words.

Rules:
- Open with a specific observation about their role or company — not a compliment, a real observation
- One sentence on what ${senderCompany} does and why it matters to them
- One CTA: short call, 15 minutes
- No bullet points in the body
- No em-dashes (—)
- No buzzwords: no "synergy", "leverage", "touch base", "game-changer", "revolutionary", "Hope this finds you well", "I wanted to reach out"
- Don't mention AI or automation
- Subject: 4–6 words, lowercase, no punctuation
- Sign off with a real first name (South African-sounding, fits the industry)
- End with: "Reply STOP to opt out."

Return ONLY valid JSON: {"subject": "...", "body": "..."}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  try {
    return JSON.parse(stripJson(raw)) as Day1Draft
  } catch {
    console.error('[figsy] generateDay1Email JSON parse failed, raw:', raw.slice(0, 200))
    throw new Error('Failed to generate Day 1 email — Claude returned invalid JSON')
  }
}

export async function sendDay1OutreachBatch(
  leadIds: string[],
  clientId: string,
  clientCompanyName: string,
): Promise<void> {
  const { data: client } = await db.from('clients')
    .select('company_name, industry').eq('id', clientId).single()

  const { data: leads } = await db.from('leads')
    .select('id, first_name, last_name, email, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
    .in('id', leadIds)

  for (const lead of (leads ?? []) as Lead[]) {
    if (!lead.email) continue

    const { data: blocked } = await db.from('opt_out_blocklist')
      .select('id').eq('email', lead.email).is('opted_back_in_at', null).maybeSingle()
    if (blocked) continue

    try {
      const draft = await generateDay1Email(lead, clientCompanyName, client?.industry ?? null)

      if (resend) {
        await resend.emails.send({
          from: FROM,
          reply_to: REPLY_TO,
          to: lead.email,
          subject: draft.subject,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111;line-height:1.7">
            ${draft.body.split('\n').map((line: string) => `<p style="margin:0 0 12px">${line}</p>`).join('')}
          </div>`,
        })
      }

      await db.from('figsy_sent_emails').insert({
        enrollment_id: null,
        campaign_id:   null,
        lead_id:       lead.id,
        step:          1,
        subject:       draft.subject,
        body:          draft.body,
      })

      // 'contacted' added via migration 20260525_fix_leads_status_and_figsy_memory.sql
      // If constraint not yet updated, fall back to 'scored' (non-destructive)
      const { error: statusErr } = await db.from('leads').update({ status: 'contacted' }).eq('id', lead.id)
      if (statusErr) {
        console.warn('[day1-outreach] contacted status not in constraint yet, using scored:', statusErr.message)
        await db.from('leads').update({ status: 'scored' }).eq('id', lead.id)
      }
    } catch (err) {
      console.error('[day1-outreach] lead', lead.id, err)
    }
  }
}

const MODEL_MAP: Record<string, string> = {
  haiku:  'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-5',
}

// Generate a sequence informed by FIGSY Memory (Campaign Intelligence).
// Falls back to standard generateSequence if no memory exists.
export async function generateSequenceWithMemory(
  lead: Lead,
  clientId: string,
  senderCompanyName: string,
  senderIndustry: string | null,
  campaignIntent?: string,
  modelPreference?: string,
): Promise<SequenceDraft> {
  // last_winning_angle added via migration 20260525_fix_leads_status_and_figsy_memory.sql
  // Try with last_winning_angle; if column missing, retry without it (graceful degradation)
  let memoryResult = await db.from('figsy_memory')
    .select('best_subject_lines, avg_reply_rate_30d, total_sent_all_time, last_winning_angle')
    .eq('client_id', clientId)
    .maybeSingle()
  if (memoryResult.error?.message?.includes('last_winning_angle')) {
    memoryResult = await db.from('figsy_memory')
      .select('best_subject_lines, avg_reply_rate_30d, total_sent_all_time')
      .eq('client_id', clientId)
      .maybeSingle()
  }
  const { data: memory } = memoryResult

  if (!memory || (memory.total_sent_all_time ?? 0) < 20) {
    return generateSequence(lead, senderCompanyName, senderIndustry, campaignIntent)
  }

  const memoryContext = [
    memory.avg_reply_rate_30d != null
      ? `Your current average reply rate is ${(memory.avg_reply_rate_30d * 100).toFixed(1)}% — keep what's working, improve what isn't.`
      : null,
    (memory.best_subject_lines as string[] | null)?.length
      ? `Subject lines that have worked well: ${(memory.best_subject_lines as string[]).slice(0, 3).join(' | ')}`
      : null,
    (memory as any).last_winning_angle
      ? `Winning angle from last high-performing campaign: ${(memory as any).last_winning_angle}`
      : null,
  ].filter(Boolean).join('\n')

  // ── Signal detection — pick the best personalization hook ─────────────────
  const memSignals: string[] = []
  if (lead.tech_stack && lead.tech_stack.length > 0) {
    memSignals.push(`Uses ${lead.tech_stack.slice(0, 2).join(' and ')} in their tech stack`)
  }
  if (lead.industry) {
    memSignals.push(`Works in ${lead.industry}`)
  }
  if (lead.score_reasoning) {
    memSignals.push(lead.score_reasoning)
  }
  const memBestSignal = memSignals[0] ?? null

  const prompt = `You are writing cold outreach emails on behalf of ${senderCompanyName}${senderIndustry ? ` (${senderIndustry})` : ''}. You write as a real person — not an AI.

FIGSY Campaign Intelligence (use this to improve your writing):
${memoryContext}
${campaignIntent ? `
Campaign focus for this batch: ${campaignIntent}
Use this to personalise the angle, pain point references, and geography signals in your emails.
` : ''}
Lead details:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'unknown'}
- Company: ${lead.company || 'unknown'}
- Industry: ${lead.industry || 'unknown'}
- Seniority: ${lead.seniority || 'unknown'}
- Country: ${lead.country || 'unknown'}
${memBestSignal ? `- Best personalization signal (USE THIS to open Step 1): ${memBestSignal}` : ''}
${lead.tech_stack?.length ? `- Tech stack: ${lead.tech_stack.slice(0, 5).join(', ')}` : ''}

Write a 3-email sequence that applies the lessons from Campaign Intelligence above.

Step 1 (Day 0): First touch — under 70 words. MANDATORY: Open with the personalization signal above. One CTA.
Step 2 (Day 4): Follow-up — new angle, shorter. Acknowledge step 1 was sent.
Step 3 (Day 9): Final — direct, no pressure, leave it open.

Hard rules:
- Never say "Hope this finds you well", "I wanted to reach out", "touch base", "synergy", "leverage", "game-changer"
- No bullet points in the email body
- No em-dashes (—)
- Don't mention AI or automation
- Subject: 4–6 words, lowercase, no punctuation
- End every email: "Reply STOP to opt out."
- Sign with a South African-sounding first name

Return ONLY valid JSON:
{"step1":{"subject":"...","body":"..."},"step2":{"subject":"...","body":"..."},"step3":{"subject":"...","body":"..."}}`

  const selectedModel = MODEL_MAP[modelPreference ?? 'haiku'] ?? MODEL_MAP.haiku

  const message = await anthropic.messages.create({
    model: selectedModel,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  try {
    return JSON.parse(stripJson(raw)) as SequenceDraft
  } catch {
    console.warn('[figsy] generateSequenceWithMemory JSON parse failed — falling back to standard generateSequence')
    return generateSequence(lead, senderCompanyName, senderIndustry)
  }
}

// Auto-enroll a single consented lead into the active campaign (S5 — FIGSY auto-start)
export async function autoEnrollLead(leadId: string, clientId: string): Promise<void> {
  try {
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id, name, campaign_intent')
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

    const draft = await generateSequenceWithMemory(
      lead as Lead,
      clientId,
      client?.company_name ?? '',
      client?.industry ?? null,
      (campaign as any).campaign_intent ?? undefined,
      (campaign as any).model_preference ?? 'haiku',
    )

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

    if (error || !enrollment) {
      console.error('[figsy] autoEnrollLead: enrollment insert failed', error?.message, 'for lead', leadId)
      return
    }

    // ── Deduct 1 FIGSY credit per lead enrolled ────────────────────────────────
    try {
      const { data: clientBal } = await db.from('clients').select('figsy_credits_remaining').eq('id', clientId).single()
      const newBal = Math.max(0, (clientBal?.figsy_credits_remaining ?? 0) - 1)
      await Promise.all([
        db.from('clients').update({ figsy_credits_remaining: newBal }).eq('id', clientId),
        db.from('credit_transactions').insert({
          client_id: clientId,
          amount: -1,
          type: 'usage',
          plan: 'figsy',
          note: `FIGSY outreach enrolled: ${lead.first_name ?? ''} ${lead.last_name ?? ''} at ${lead.company ?? ''}`.trim(),
          created_at: new Date().toISOString(),
        }),
      ])
    } catch (creditErr) {
      console.error('[figsy] autoEnrollLead: credit deduction failed', creditErr)
      // Non-fatal — enrollment already happened, log and continue
    }

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
    console.error('[figsy] autoEnrollLead failed for lead', leadId, ':', err instanceof Error ? err.message : err)
  }
}
