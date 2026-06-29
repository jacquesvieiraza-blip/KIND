import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { Resend } from 'resend'
import { logOutcomeEvent } from './outcomes'
import { isSuppressed } from './suppression'
import { canEnroll } from './billing-rules'
import { buildDraftFromSequence, type SequenceStep } from './sequence-apply'
import {
  COLD_FROM,
  COLD_REPLY_TO,
  unsubscribeHeaders,
  coldEmailHtml,
  warmupRampCap,
} from './deliverability'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
// D4: cold outreach sends from a dedicated, separately-warmed domain — NEVER the
// transactional domain. See lib/deliverability.ts.
const FROM     = COLD_FROM
const REPLY_TO = COLD_REPLY_TO

if (!process.env.RESEND_API_KEY) {
  console.warn('[figsy] ⚠️  RESEND_API_KEY not set — ALL outreach emails will be silently skipped. Set this in Railway env vars.')
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[figsy] ⚠️  ANTHROPIC_API_KEY not set — email generation will fail.')
}

// ── WARMUP: daily cold-send cap ──────────────────────────────────────────────
// Enforces the domain warmup ramp so cold volume can't accidentally spike. When
// the cap is hit, sends are DEFERRED (enrollment stays due and retries next cron
// run), never dropped.
//
// Two ways to configure (explicit override wins):
//   • FIGSY_COLD_DAILY_CAP — a fixed max cold emails per UTC day. Unset/0 = ignore.
//   • FIGSY_WARMUP_START   — a YYYY-MM-DD date; the cap then AUTO-RAMPS by day:
//        day ≤3 → 10 · day 4 → 20 · day 5–6 → 30 · day 7–8 → 40 · day 9+ → 50.
//        (Mirrors the gettingkind.com warmup plan; day 1 = the start date.)
// If neither is set → no cap (unchanged default behaviour).
function coldDailyCap(): number | null {
  const explicit = parseInt(process.env.FIGSY_COLD_DAILY_CAP ?? '', 10)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  const start = process.env.FIGSY_WARMUP_START
  return start ? warmupRampCap(start) : null
}

async function coldCapReached(): Promise<boolean> {
  const cap = coldDailyCap()
  if (cap === null) return false
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const { count } = await db.from('figsy_sent_emails')
    .select('id', { count: 'exact', head: true })
    .gte('sent_at', start.toISOString())
  return (count ?? 0) >= cap
}

// Strip markdown code fences that Claude sometimes wraps JSON in
function stripJson(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

interface Lead {
  id: string
  client_id?: string | null
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

// R9 (Apollo) — "Why FIGSY wrote this": the exact personalization hooks FIGSY
// uses to open a sequence. Extracted so both the generator and the transparency
// endpoint share one source of truth (no drift between what we show and use).
export function personalizationSignals(lead: Pick<Lead, 'tech_stack' | 'industry' | 'score_reasoning'>): string[] {
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
  return signals
}

export async function generateSequence(
  lead: Lead,
  senderCompanyName: string,
  senderIndustry: string | null,
  campaignIntent?: string,
  bookingUrl?: string | null,
  senderName?: string | null,
): Promise<SequenceDraft> {
  // ── Signal detection — pick the best personalization hook ─────────────────
  const signals = personalizationSignals(lead)
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
- One soft CTA: ${bookingUrl ? `invite them to grab a 15-minute slot and include this exact booking link on its own line: ${bookingUrl}` : 'quick call, 15 minutes.'}
- Max 70 words. No subject line tricks. Subject should feel like a colleague's email.

Step 2 (Day 4) — Follow-up:
- Acknowledge you sent something already — don't pretend this is the first email.
- Add a new angle: a question, a stat, a short insight relevant to their industry.
- Keep it shorter than Step 1. Lighter. No pressure.
- Max 60 words.

Step 3 (Day 9) — Final touch:
- Be direct: this is the last email.
- Leave it genuinely open — no guilt, no urgency tactics.
${bookingUrl ? `- Include the booking link once more on its own line: ${bookingUrl}` : ''}
- 3–4 sentences max.

Hard rules (violating any of these makes the email useless):
- Never say "Hope this finds you well", "I wanted to reach out", "touch base", "synergy", "leverage", "game-changer", or "revolutionary"
- No bullet points in the email body
- No em-dashes (—) — they read as AI
- Don't mention you're an AI or automation
- Don't make up facts about their company you don't know
- Subject lines: 4–6 words, lowercase, no punctuation, no questions
- End every email with: "Reply STOP to opt out."
${senderName ? `- Sign off as exactly "${senderName}". Do NOT invent, shorten, or use any other name.` : '- Sign off with a real first name (pick a South African-sounding name that fits the sender\'s industry)'}
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
  | 'unsubscribe'   // 🚫 Variant of opt_out — explicit unsubscribe link clicked or request
  | 'wrong_person'  // 👤 Not the right contact — forwarded, CC'd someone else, refers elsewhere
  | 'referral'      // 🔀 Refers to another person/department who is a better fit
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
- "unsubscribe": Variant of opt_out — clicked unsubscribe link, or says "please unsubscribe me"
- "wrong_person": Not the right contact — "I'm not the decision maker", "try [name]", forwards to someone else without a referral
- "referral": Refers to a specific named person or department who is the correct contact — "you should speak to Sarah in procurement"
- "out_of_office": Automated OOO reply, holiday message, or auto-responder
- "other": Bounce, spam filter response, completely unclear, or unrelated

Rules:
- If they ask ANY question, lean toward "hot" or "warm", not "cold"
- If they give a future date, use "warm" not "cold"
- "opt_out" and "unsubscribe" require explicit removal language
- "referral" requires a named contact or specific department mention
- OOO messages are almost always automated and short

Return ONLY valid JSON: {"classification": "...", "reasoning": "one sentence max"}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  })

  // Guard the parse: strip any markdown fences and fall back to 'other' rather
  // than throwing — a parse failure must NOT drop the whole inbound reply.
  const textBlock = message.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined
  const raw = (textBlock?.text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  let parsed: { classification: string; reasoning: string }
  try {
    parsed = JSON.parse(raw) as { classification: string; reasoning: string }
  } catch {
    console.error('[classifyReply] could not parse model output, defaulting to other:', raw.slice(0, 200))
    return { classification: 'other', reasoning: 'Could not classify automatically' }
  }

  // Normalise legacy values that might come back from old prompts
  const legacyMap: Record<string, ReplyClassification> = {
    interested:     'hot',
    not_interested: 'cold',
    referred:       'referral',
  }
  const valid: ReplyClassification[] = ['hot','warm','cold','opt_out','unsubscribe','wrong_person','referral','out_of_office','other']
  const mapped = (legacyMap[parsed?.classification] ?? parsed?.classification) as ReplyClassification
  const classification: ReplyClassification = valid.includes(mapped) ? mapped : 'other'

  return { classification, reasoning: parsed?.reasoning ?? '' }
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

  // DO-NOT-CONTACT: hard stop — never email anyone connected to the founder's
  // employer, no matter how this lead got enrolled.
  if (isSuppressed({ email: lead.email, company: lead.company })) {
    console.warn(`[figsy] sendSequenceEmail: ${lead.email} is on the do-not-contact list — step ${step} NOT sent.`)
    return
  }

  // POPIA safety net — never send to an opted-out address, no matter which path
  // enrolled this lead. This is the single chokepoint every step-1/2/3 send funnels
  // through, so one check here closes the gap where someone opts out via one campaign
  // but still has an active enrollment in another: the inbound webhook only marks the
  // single matched enrollment opted_out, not every enrollment for that email.
  const { data: blocked } = await db.from('opt_out_blocklist')
    .select('id').eq('email', lead.email).is('opted_back_in_at', null).maybeSingle()
  if (blocked) {
    console.warn(`[figsy] sendSequenceEmail: ${lead.email} is on the opt-out blocklist — step ${step} NOT sent; marking enrollment opted_out.`)
    await db.from('figsy_enrollments').update({ status: 'opted_out' }).eq('id', enrollmentId)
    return
  }

  // WARMUP cap — if today's cold quota is used up, DEFER (don't advance state, no
  // record inserted → enrollment stays due and retries on the next cron run).
  if (await coldCapReached()) {
    console.warn(`[figsy] sendSequenceEmail: daily cold-send cap reached — step ${step} to ${lead.email} deferred to next run.`)
    return
  }

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
    // Cold email = a personal 1:1 message → Primary, not Promotions. NO pixel, image
    // banner, visible unsubscribe footer, or templated shell (see coldEmailHtml). The
    // one-click List-Unsubscribe header + the body's "Reply STOP" line cover compliance.
    const result = await resend.emails.send({
      from:     FROM,
      reply_to: REPLY_TO,
      to:       lead.email,
      subject,
      headers:  unsubscribeHeaders(lead.email),
      text:     body,
      html:     coldEmailHtml(body, emailId),
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

  // THE DATA FLOOR (#17b) — log the send (the credit-spend denominator). Fire-and-forget.
  void logOutcomeEvent({
    client_id:     lead.client_id,
    campaign_id:   campaignId,
    lead_id:       lead.id,
    enrollment_id: enrollmentId,
    event_type:    'send',
    channel:       'email',
    payload:       { step, subject, sent: !!resend, resend_id: messageId ?? null },
  })

  // Bump the campaign email counter — but ONLY when a real figsy_sent_emails row was
  // actually inserted (emailId set). Previously this ran unconditionally, so a failed
  // insert (e.g. the test-email path with placeholder enrollment/lead IDs) still bumped
  // the counter → it drifted ABOVE the real row count, which is exactly why the Home
  // card (counter) read 122 while the row-based pages read 120. Gate on emailId so the
  // counter can never exceed the send log again.
  // NOTE: supabase-js RPCs/queries RETURN errors, they don't THROW — so a try/catch
  // never sees an RPC failure. Check the returned error and run the direct-update fallback.
  if (emailId) {
    const { error: rpcErr } = await db.rpc('increment_figsy_emails_sent', { campaign_id: campaignId }).maybeSingle()
    if (rpcErr) {
      const { data } = await db.from('figsy_campaigns')
        .select('emails_sent').eq('id', campaignId).single()
      if (data) {
        await db.from('figsy_campaigns')
          .update({ emails_sent: ((data as { emails_sent?: number }).emails_sent ?? 0) + 1 })
          .eq('id', campaignId)
      }
    }
  }
}

// Recompute a single campaign's denormalised counters from the authoritative
// source tables and persist them. Call this AFTER a reply/opt-out/meeting event
// has written its source row (figsy_replies / figsy_enrollments). It replaces the
// old read-modify-write "+1" increments, which (a) lost concurrent updates under
// load and (b) silently swallowed write errors because supabase RETURNS errors
// rather than throwing. Persists Math.max(source, stored) so a counter can never
// regress below a value another path set (e.g. a calendar booking with no reply
// row to attribute it to).
export interface CampaignCounters {
  emails_sent: number
  replies_total: number
  replies_interested: number
  opted_out: number
  meetings_booked: number
  leads_enrolled: number
}

export async function recomputeCampaignCounters(campaignId: string): Promise<CampaignCounters | null> {
  if (!campaignId) return null
  try {
    const [sentRes, repliesRes, enrollRes, campRes] = await Promise.all([
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId),
      db.from('figsy_replies').select('classification, meeting_booked_at').eq('campaign_id', campaignId),
      db.from('figsy_enrollments').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId),
      db.from('figsy_campaigns')
        .select('emails_sent, replies_total, replies_interested, opted_out, meetings_booked, leads_enrolled')
        .eq('id', campaignId).maybeSingle(),
    ])
    let repliesTotal = 0, repliesInterested = 0, optedOut = 0, meetings = 0
    for (const r of (repliesRes.data ?? []) as { classification: string | null; meeting_booked_at: string | null }[]) {
      repliesTotal++
      if (r.classification === 'hot' || r.classification === 'interested') repliesInterested++
      if (r.classification === 'opt_out' || r.classification === 'unsubscribe') optedOut++
      if (r.meeting_booked_at) meetings++
    }
    const cur = (campRes.data ?? {}) as Record<string, number | null>
    const mx = (a: number, b: number | null | undefined) => Math.max(a, typeof b === 'number' ? b : 0)
    const next: CampaignCounters = {
      emails_sent:        mx(sentRes.count ?? 0,   cur.emails_sent),
      replies_total:      mx(repliesTotal,         cur.replies_total),
      replies_interested: mx(repliesInterested,    cur.replies_interested),
      opted_out:          mx(optedOut,             cur.opted_out),
      meetings_booked:    mx(meetings,             cur.meetings_booked),
      leads_enrolled:     mx(enrollRes.count ?? 0, cur.leads_enrolled),
    }
    const { error } = await db.from('figsy_campaigns').update(next).eq('id', campaignId)
    if (error) {
      console.error('[figsy] recomputeCampaignCounters update failed:', error.message, 'campaign', campaignId)
      return null
    }
    return next
  } catch (err) {
    console.error('[figsy] recomputeCampaignCounters failed:', err, 'campaign', campaignId)
    return null
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
  senderName?: string | null,
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
${senderName ? `- Sign off as exactly "${senderName}". Do NOT invent or use any other name.` : '- Sign off with a real first name (South African-sounding, fits the industry)'}
- End with: "Reply STOP to opt out."

Return ONLY valid JSON: {"subject": "...", "body": "..."}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  // Robust parse: the model occasionally wraps the JSON in prose or code fences.
  // Try the fence-stripped text, then the raw text, then the first {...} block —
  // mirroring the fallback already used in leads.ts — before giving up.
  const tryParse = (s: string): Day1Draft | null => {
    try { return JSON.parse(s) as Day1Draft } catch { return null }
  }
  let draft = tryParse(stripJson(raw)) ?? tryParse(raw)
  if (!draft) {
    const block = raw.match(/\{[\s\S]*\}/)
    if (block) draft = tryParse(block[0])
  }
  if (draft?.subject && draft?.body) return draft
  console.error('[figsy] generateDay1Email JSON parse failed, raw:', raw.slice(0, 200))
  throw new Error('Failed to generate Day 1 email — Claude returned invalid JSON')
}

export async function sendDay1OutreachBatch(
  leadIds: string[],
  clientId: string,
  clientCompanyName: string,
): Promise<void> {
  const { data: client } = await db.from('clients')
    .select('company_name, industry').eq('id', clientId).single()
  // P-a: configurable sign-off name (guarded — null if column missing pre-migration).
  const { data: clientSigner } = await db.from('clients').select('signer_name').eq('id', clientId).maybeSingle()
  const senderName: string | null = (clientSigner?.signer_name as string | null) ?? null

  const { data: leads } = await db.from('leads')
    .select('id, first_name, last_name, email, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
    .in('id', leadIds)

  for (const lead of (leads ?? []) as Lead[]) {
    if (!lead.email) continue

    // WARMUP cap — stop the batch once today's cold quota is used up (remaining
    // leads stay 'scored' and get picked up on a later run).
    if (await coldCapReached()) {
      console.warn('[day1-outreach] daily cold-send cap reached — stopping batch early; remaining leads deferred.')
      break
    }

    // DO-NOT-CONTACT: never day-1 email anyone connected to the founder's employer.
    if (isSuppressed({ email: lead.email, company: lead.company })) continue

    const { data: blocked } = await db.from('opt_out_blocklist')
      .select('id').eq('email', lead.email).is('opted_back_in_at', null).maybeSingle()
    if (blocked) continue

    try {
      const draft = await generateDay1Email(lead, clientCompanyName, client?.industry ?? null, senderName)

      if (resend) {
        await resend.emails.send({
          from: FROM,
          reply_to: REPLY_TO,
          to: lead.email,
          subject: draft.subject,
          // Personal 1:1 cold email (Primary, not Promotions) — header-only unsubscribe.
          headers: unsubscribeHeaders(lead.email),
          text: draft.body,
          html: coldEmailHtml(draft.body),
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

      // THE DATA FLOOR (#17b) — record the day-1 send in the canonical log too, so
      // it's never invisible (the figsy_sent_emails insert above can fail pre-013).
      void logOutcomeEvent({
        client_id:     lead.client_id ?? clientId,
        campaign_id:   null,
        lead_id:       lead.id,
        enrollment_id: null,
        event_type:    'send',
        channel:       'email',
        payload:       { step: 1, subject: draft.subject, sent: !!resend, day1: true },
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
    .select('best_subject_lines, avg_reply_rate_30d, total_sent_all_time, last_winning_angle, episodic_memory, longterm_memory, preference_memory')
    .eq('client_id', clientId)
    .maybeSingle()
  if (memoryResult.error) {
    memoryResult = await db.from('figsy_memory')
      .select('best_subject_lines, avg_reply_rate_30d, total_sent_all_time')
      .eq('client_id', clientId)
      .maybeSingle()
  }
  const { data: memory } = memoryResult

  // Client booking link to offer leads (FIGSY's whole job is booking meetings).
  const { data: clientBooking } = await db.from('clients').select('booking_url').eq('id', clientId).maybeSingle()
  const bookingUrl: string | null = (clientBooking?.booking_url as string | null) ?? null
  // P-a: configurable sign-off name. Separate guarded select so a missing column
  // (pre-migration) returns null rather than breaking the booking_url read above.
  const { data: clientSigner } = await db.from('clients').select('signer_name').eq('id', clientId).maybeSingle()
  const senderName: string | null = (clientSigner?.signer_name as string | null) ?? null

  if (!memory || (memory.total_sent_all_time ?? 0) < 20) {
    return generateSequence(lead, senderCompanyName, senderIndustry, campaignIntent, bookingUrl, senderName)
  }

  // P2-1: 3-type memory model
  // Episodic: recent patterns (last 14 days) — what's working right now
  const episodic = (memory as any).episodic_memory as Record<string, unknown> | null
  // Long-term: accumulated learning — winning angles, best subjects
  const longterm = (memory as any).longterm_memory as Record<string, unknown> | null
  // Preference: tone/format per client
  const preference = (memory as any).preference_memory as Record<string, unknown> | null

  const memoryContext = [
    // Episodic memory — recent reply patterns
    episodic?.recent_reply_rate != null
      ? `Recent (14d) reply rate: ${((episodic.recent_reply_rate as number) * 100).toFixed(1)}% — adapt tone accordingly.`
      : memory.avg_reply_rate_30d != null
        ? `30d average reply rate: ${(memory.avg_reply_rate_30d * 100).toFixed(1)}%`
        : null,
    episodic?.top_performing_industry
      ? `Recent top-performing industry: ${episodic.top_performing_industry}`
      : null,
    // Long-term memory — accumulated wins
    ((longterm?.best_subject_lines ?? memory.best_subject_lines) as string[] | null)?.length
      ? `Subject lines that win replies: ${((longterm?.best_subject_lines ?? memory.best_subject_lines) as string[]).slice(0, 3).join(' | ')}`
      : null,
    ((memory as any).last_winning_angle ?? longterm?.winning_angle)
      ? `Winning angle: ${(memory as any).last_winning_angle ?? longterm?.winning_angle}`
      : null,
    // Preference memory — client/ICP tone preferences
    preference?.preferred_tone
      ? `Preferred writing tone: ${preference.preferred_tone}`
      : null,
    preference?.avoid_phrases
      ? `Phrases to avoid: ${(preference.avoid_phrases as string[]).slice(0, 3).join(', ')}`
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

Step 1 (Day 0): First touch — under 70 words. MANDATORY: Open with the personalization signal above. ${bookingUrl ? `CTA: invite them to book a 15-min slot and include this exact link on its own line: ${bookingUrl}` : 'One soft CTA (quick 15-min call).'}
Step 2 (Day 4): Follow-up — new angle, shorter. Acknowledge step 1 was sent.
Step 3 (Day 9): Final — direct, no pressure, leave it open.${bookingUrl ? ` Include the booking link once more: ${bookingUrl}` : ''}

Hard rules:
- Never say "Hope this finds you well", "I wanted to reach out", "touch base", "synergy", "leverage", "game-changer"
- No bullet points in the email body
- No em-dashes (—)
- Don't mention AI or automation
- Subject: 4–6 words, lowercase, no punctuation
- End every email: "Reply STOP to opt out."
${senderName ? `- Sign off as exactly "${senderName}". Do NOT invent or use any other name.` : '- Sign with a South African-sounding first name'}

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
    return generateSequence(lead, senderCompanyName, senderIndustry, campaignIntent, bookingUrl, senderName)
  }
}

// (P2-13 personalised SVG image banner removed 17 Jun — an image in a cold email is a
//  Promotions signal; cold mail is now near-plain. See deliverability.coldEmailHtml.)

// Auto-enroll a single consented lead into the active campaign (S5 — FIGSY auto-start)
/**
 * OPTION A — campaign-ready eligibility (the one rule, used everywhere we enroll).
 *
 * A lead can be enrolled into outreach when it is Apollo-VERIFIED (apollo_consented)
 * OR has explicitly consented — and is NOT opted out / rejected. No separate consent
 * click is required: verified B2B leads are treated as legitimate-interest contacts,
 * protected by the opt-out + unsubscribe in every email. Verified-only keeps bounce
 * risk low (unverified guesses are excluded). DNC + CRM-dedup are still enforced
 * per-lead inside autoEnrollLead, and suppression + opt-out are re-checked at send time.
 */
export async function campaignReadyLeadIds(clientId: string): Promise<string[]> {
  // Filter in JS — PostgREST boolean + or/not combinations are error-prone and
  // were silently returning 0. Lead volumes per client are small enough for this.
  const { data } = await db.from('leads')
    .select('id, apollo_consented, status')
    .eq('client_id', clientId)
  return (data ?? [])
    .filter((l: { apollo_consented?: boolean | null; status?: string | null }) =>
      (l.apollo_consented === true || l.status === 'consent_given') &&
      l.status !== 'opted_out' && l.status !== 'rejected')
    .map((l: { id: string }) => l.id)
}

export async function autoEnrollLead(leadId: string, clientId: string): Promise<void> {
  try {
    const { data: campaign } = await db.from('figsy_campaigns')
      .select('id, name, campaign_intent, settings')
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

    // DO-NOT-CONTACT: never enroll anyone connected to the founder's employer.
    if (isSuppressed({ email: lead.email, company: lead.company })) {
      console.warn(`[figsy] autoEnrollLead: ${lead.email} is on the do-not-contact list — not enrolled.`)
      return
    }

    const { data: client } = await db.from('clients')
      .select('company_name, industry, crm_dedup_enabled, crm_type, crm_api_key, figsy_credits_remaining').eq('id', clientId).single()

    // ── CRM DEDUP GATE ─────────────────────────────────────────────────────────
    // Never cold-email a client's existing customers / known contacts. If the
    // client enabled dedup and connected a CRM, check it BEFORE enrolling (and
    // before spending a credit). Fail-CLOSED: if the CRM check errors, SKIP this
    // lead (item M3) — never cold-email someone who may already be in the client's
    // CRM. Per-lead skip, not a global halt — the next lead proceeds.
    if (client?.crm_dedup_enabled && client.crm_type && client.crm_type !== 'none' && client.crm_api_key) {
      try {
        const { checkCrmDuplicate } = await import('./crm')
        const dup = await checkCrmDuplicate(client.crm_type, client.crm_api_key, {
          email: lead.email,
          company: lead.company,
        })
        if (dup.exists) {
          await db.from('leads').update({
            crm_existing: true,
            crm_match_reason: dup.reason ?? 'Already in your CRM',
          }).eq('id', leadId)
          console.log(`[figsy] dedup: skipped lead ${leadId} — ${dup.reason}`)
          return // skip enrollment + credit spend
        }
      } catch (err) {
        console.warn(`[figsy] dedup: CRM check failed for lead ${leadId}, SKIPPING (fail-closed) —`, err instanceof Error ? err.message : err)
        return // fail-closed: don't enroll/charge when dedup is on but unverifiable
      }
    }

    // Billing gate (item 166): FIGSY is charged at ENROLLMENT — one FIGSY credit =
    // one lead enrolled. Don't enroll (or spend a Claude draft) when the FIGSY pool
    // is empty; upstream delivery is already capped by this pool — this is the backstop.
    if (!canEnroll(client?.figsy_credits_remaining)) {
      console.warn(`[figsy] autoEnrollLead: client ${clientId} has no FIGSY credits — skipping enrollment for lead ${leadId}.`)
      return
    }

    // Item 187 — if a saved sequence/template has been applied to this campaign, send
    // its literal copy (token-substituted) instead of AI-generating. Falls back to the
    // AI path when no sequence is applied, or the sequence has no usable email steps.
    const settings = (campaign as any).settings ?? {}
    const appliedSequence = (settings.sequence as SequenceStep[] | undefined) ?? undefined
    const sequenceDraft = appliedSequence
      ? buildDraftFromSequence(appliedSequence, lead as any, client?.company_name ?? null)
      : null
    const usingSequence = sequenceDraft !== null
    const draft = sequenceDraft ?? await generateSequenceWithMemory(
      lead as Lead,
      clientId,
      client?.company_name ?? '',
      client?.industry ?? null,
      (campaign as any).campaign_intent ?? undefined,
      (campaign as any).model_preference ?? 'haiku',
    )

    // P2-3: A/Z multi-variant subject line testing — pick one at random from all non-null
    // variants. Skipped when a literal sequence is applied (the client wrote the subject).
    const abResolved = settings.ab_test_resolved as boolean | undefined
    const allVariants: string[] = [draft.step1.subject]
    if (!usingSequence && !abResolved) {
      const b = settings.ab_subject_b as string | null | undefined
      const c = settings.ab_subject_c as string | null | undefined
      const d = settings.ab_subject_d as string | null | undefined
      const e = settings.ab_subject_e as string | null | undefined
      if (b) allVariants.push(b)
      if (c) allVariants.push(c)
      if (d) allVariants.push(d)
      if (e) allVariants.push(e)
    }
    const step1Subject = allVariants[Math.floor(Math.random() * allVariants.length)]

    const { data: enrollment, error } = await db.from('figsy_enrollments').insert({
      campaign_id:    campaign.id,
      lead_id:        leadId,
      client_id:      clientId,
      status:         'enrolled',
      current_step:   0,
      next_send_at:   new Date().toISOString(), // send step 1 immediately
      step1_subject:  step1Subject,
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

    // ── Deduct 1 FIGSY credit per lead enrolled (item 170: atomic RPC) ──────────
    // Use the increment_figsy_credits RPC (mirrors increment_client_credits) so the
    // balance update is atomic — no read-modify-write race that could desync the
    // balance from the ledger row. Clamps at 0 in SQL.
    const { error: balErr } = await db.rpc('increment_figsy_credits', { p_client_id: clientId, p_amount: -1 })
    if (balErr) {
      console.error('[figsy] autoEnrollLead: FIGSY credit deduction failed', balErr.message)
    } else {
      await db.from('credit_transactions').insert({
        client_id: clientId,
        amount: -1,
        type: 'usage',
        plan: 'figsy',
        note: `FIGSY outreach enrolled: ${lead.first_name ?? ''} ${lead.last_name ?? ''} at ${lead.company ?? ''}`.trim(),
        created_at: new Date().toISOString(),
      }).then(() => {}, () => {})
    }

    // Increment campaign enrolled count
    const { data: camp } = await db.from('figsy_campaigns')
      .select('leads_enrolled').eq('id', campaign.id).single()
    if (camp) {
      await db.from('figsy_campaigns')
        .update({ leads_enrolled: (camp.leads_enrolled ?? 0) + 1 })
        .eq('id', campaign.id)
    }

    // Send step 1 immediately (using the selected variant subject)
    await sendSequenceEmail(
      enrollment.id,
      lead as Lead,
      1,
      step1Subject,
      draft.step1.body,
      campaign.id,
    )
  } catch (err) {
    console.error('[figsy] autoEnrollLead failed for lead', leadId, ':', err instanceof Error ? err.message : err)
  }
}
