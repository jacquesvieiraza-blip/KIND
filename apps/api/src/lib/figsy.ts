import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { Resend } from 'resend'
import { logOutcomeEvent } from './outcomes'
import { isSuppressed } from './suppression'
import { canEnroll } from './billing-rules'
import { sendFounderAlert } from './alerts'
import { interpretSend } from './resend-checked'
import { isDemoClient } from './demo'
import { buildDraftFromSequence, buildDraftStepsFromSequence, draftToSteps, type SequenceStep } from './sequence-apply'
import { bookingUrlForLead } from './booking-token'
// ONE WALLET (24 Jul): no holds — money is a single $4 charged at approve. The old
// credit-holds release/capture calls are removed; nothing to import here anymore.
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
export function coldDailyCap(): number | null {   // #485 exported — the Vida status chip must show the REAL cap
  const explicit = parseInt(process.env.FIGSY_COLD_DAILY_CAP ?? '', 10)
  if (Number.isFinite(explicit) && explicit > 0) return explicit
  const start = process.env.FIGSY_WARMUP_START
  return start ? warmupRampCap(start) : null
}

// #344 (AR-07) — THE KILL-SWITCH. `AUTO_OUTREACH_ENABLED` was read only on the on-run
// path (icps.ts); the three cron send paths call sendSequenceEmail directly, so "off"
// never stopped follow-up steps to already-enrolled leads. This is the single chokepoint
// every real send funnels through, so checking it here makes the switch actually global.
export function outreachEnabled(): boolean {
  return process.env.AUTO_OUTREACH_ENABLED === 'true'
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

// PER-CLIENT daily cap — enforced IN ADDITION to the global cap above (T3).
// Today all clients share one domain, so the GLOBAL cap protects that domain; this
// per-client cap adds FAIRNESS (one client can't consume the whole global quota) and
// becomes each client's own limit once #211 gives them isolated inboxes. Default 50/day,
// override with FIGSY_PER_CLIENT_DAILY_CAP. Fails OPEN (never blocks a send on a query
// error — the global cap is the backstop). Counts today's sends for this client via the
// figsy_sent_emails→leads join (sent_emails has no client_id column).
async function perClientCapReached(clientId: string | null | undefined): Promise<boolean> {
  if (!clientId) return false
  const cap = parseInt(process.env.FIGSY_PER_CLIENT_DAILY_CAP ?? '50', 10)
  if (!Number.isFinite(cap) || cap <= 0) return false
  try {
    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    const { count } = await db.from('figsy_sent_emails')
      .select('id, leads!inner(client_id)', { count: 'exact', head: true })
      .eq('leads.client_id', clientId)
      .gte('sent_at', start.toISOString())
    return (count ?? 0) >= cap
  } catch { return false }
}

// Strip markdown code fences that Claude sometimes wraps JSON in
function stripJson(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

export interface Lead {
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
//
// #212 — surfaces MORE distinct, truthful hooks (seniority/role, geography,
// company size) so a multi-step sequence can open each follow-up on a fresh
// angle instead of repeating the one opener. Priority order is unchanged
// (tech_stack → industry → score_reasoning first) so the Step-1 best-signal
// behaviour is identical; the extra hooks only add depth for later steps.
export function personalizationSignals(
  lead: Pick<Lead, 'tech_stack' | 'industry' | 'score_reasoning' | 'seniority' | 'job_title' | 'country'>,
): string[] {
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
  if (lead.seniority || lead.job_title) {
    signals.push(`Is a ${[lead.seniority, lead.job_title].filter(Boolean).join(' ')} — pitch to their level of decision-making`)
  }
  if (lead.country) {
    signals.push(`Based in ${lead.country} — a local/geography angle will land`)
  }
  return signals
}

// #335 — Feed the client's own business knowledge (the Train-FIGSY "knowledge"
// store, figsy_knowledge) into cold-outreach generation so the SOLUTION half of
// every email is grounded in what the sender actually sells, their proof points
// and results — instead of a generic pitch — and so the AI can never invent
// claims about the sender's own product. Returns a compact plain-text digest,
// capped so the prompt stays bounded, or '' when the client has saved nothing
// (→ generation behaves exactly as before: generic but never fabricated).
export async function getClientKnowledgeForOutreach(clientId: string): Promise<string> {
  if (!clientId) return ''
  try {
    // Only the kinds that describe the SENDER's offer/positioning — not the
    // targeting keywords or guardrails, which don't belong in the copy.
    const KINDS = ['pitch', 'messaging']
    const { data } = await db.from('figsy_knowledge')
      .select('kind, data').eq('client_id', clientId).in('kind', KINDS)
    if (!data?.length) return ''
    const byKind = new Map<string, Record<string, unknown>>()
    for (const row of data as { kind: string; data: Record<string, unknown> | null }[]) {
      byKind.set(row.kind, row.data ?? {})
    }
    const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
    const lines: string[] = []
    const pitch = byKind.get('pitch')
    if (pitch) {
      if (str(pitch.pitch))           lines.push(`Value proposition: ${str(pitch.pitch)}`)
      if (str(pitch.product))         lines.push(`What the sender sells: ${str(pitch.product)}`)
      if (str(pitch.pain_points))     lines.push(`Pains the sender solves: ${str(pitch.pain_points)}`)
      if (str(pitch.differentiators)) lines.push(`Differentiators / proof points: ${str(pitch.differentiators)}`)
    }
    const messaging = byKind.get('messaging')
    if (messaging && str(messaging.style)) lines.push(`Preferred voice/persona: ${str(messaging.style)}`)
    const digest = lines.filter(Boolean).join('\n').trim()
    // Cap so the prompt stays bounded regardless of how much the client saved.
    return digest.slice(0, 1500)
  } catch (err) {
    console.warn('[figsy] getClientKnowledgeForOutreach failed — proceeding without grounding', err)
    return ''
  }
}

export async function generateSequence(
  lead: Lead,
  senderCompanyName: string,
  senderIndustry: string | null,
  campaignIntent?: string,
  bookingUrl?: string | null,
  senderName?: string | null,
  clientKnowledge?: string,
): Promise<SequenceDraft> {
  // ── Signal detection — pick the best personalization hook ─────────────────
  const signals = personalizationSignals(lead)
  const bestSignal = signals[0] ?? null
  // #212 — the remaining hooks feed later steps so each follow-up opens on a
  // fresh, real angle rather than re-using the Step-1 opener.
  const extraSignals = signals.slice(1)

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
${extraSignals.length ? `- Other real signals about this lead (use a DIFFERENT one to open each follow-up so no two emails repeat the same angle):\n${extraSignals.map(s => `  • ${s}`).join('\n')}` : ''}
${clientKnowledge ? `
What the sender offers (grounding) — the ONLY source of truth about ${senderCompanyName}'s product, results and proof. Use these facts to make the SOLUTION half of each email specific ("this is YOUR problem, and here's how ${senderCompanyName} solves it"):
${clientKnowledge}
` : ''}
Write a 3-email sequence:

Step 1 (Day 0) — First touch:
- MANDATORY: Open with a specific observation using the personalization signal provided above. If they use Salesforce, reference it. If they're in fintech, reference it. Make them feel like you actually looked them up — because we did.
- One sentence on what ${senderCompanyName} does and why it matters to them specifically.
- One soft CTA: ${bookingUrl ? `invite them to grab a 15-minute slot and include this exact booking link on its own line: ${bookingUrl}` : 'quick call, 15 minutes.'}
- Max 70 words. No subject line tricks. Subject should feel like a colleague's email.

Step 2 (Day 4) — Follow-up:
- Acknowledge you sent something already — don't pretend this is the first email.
- Add a new angle: a question, a stat, a short insight relevant to their industry.${extraSignals.length ? ' Open on a DIFFERENT real signal from the list above than Step 1 used.' : ''}
- Keep it shorter than Step 1. Lighter. No pressure.
- Max 60 words.

Step 3 (Day 9) — Final touch:
- Be direct: this is the last email.
- Leave it genuinely open — no guilt, no urgency tactics.${extraSignals.length ? '\n- If it fits naturally, ground the close in a real signal not yet used in Steps 1–2.' : ''}
${bookingUrl ? `- Include the booking link once more on its own line: ${bookingUrl}` : ''}
- 3–4 sentences max.

Hard rules (violating any of these makes the email useless):
- Never say "Hope this finds you well", "I wanted to reach out", "touch base", "synergy", "leverage", "game-changer", or "revolutionary"
- No bullet points in the email body
- No em-dashes (—) — they read as AI
- Don't mention you're an AI or automation
- Don't make up facts about their company you don't know
- Only describe the sender's product, results, metrics, or customers using facts from the "What the sender offers (grounding)" block above. If that block is empty or doesn't cover something, stay generic about the sender — never invent a capability, metric, customer, or result for ${senderCompanyName}.
- Subject lines: 4–6 words, lowercase, no punctuation, no questions
- End every email with: "Reply STOP to opt out."
${senderName ? `- Sign off as exactly "${senderName}". Do NOT invent, shorten, or use any other name.` : '- Sign off with a real first name (pick a name that fits the sender\'s company)'}
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

// E7 — the legal/reputational risk filter lives in its own pure module (reply-risk.ts) so it
// stays db-free + unit-testable. Re-exported here so the reply-intake route imports it alongside
// classifyReply from a single place.
export { isRiskyReply } from './reply-risk'

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
    // #492/F1 — a reply that stops the sequence releases the held $3 ONLY when it is a
    // clearly-NEGATIVE reply (this lead will not book). Positive replies (hot/warm) keep
    // the hold until the booking captures it — releasing here would free the $3 right
    // before the meeting that should capture it. Ambiguous classes (other/OOO) also keep
    // the hold; a post-gate stale-hold sweep reclaims any stragglers.
    const { data: lastReply } = await db.from('figsy_replies')
      .select('classification').eq('enrollment_id', enrollment.id)
      .order('received_at', { ascending: false }).limit(1).maybeSingle()
    const NEGATIVE = ['cold', 'opt_out', 'unsubscribe', 'wrong_person', 'referral']
    if (lastReply && NEGATIVE.includes((lastReply.classification ?? '') as string)) {
      // ONE WALLET: no held $3 to release — the $4 was final at approve.
    }
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
    // ONE WALLET: no held $3 — the $4 was final at approve; nothing to release.
  } else {
    const nextSendAt = new Date(Date.now() + (STEP_FOLLOWUP_DELAYS[skipped] ?? 4) * 86400000).toISOString()
    await db.from('figsy_enrollments').update({
      status: 'in_progress', current_step: skipped,
      next_send_at: nextSendAt, reply_branch_handled_at: now,
    }).eq('id', enrollment.id)
  }
  return 'skip'
}

// #212 — a stored enrollment step + the total length of its sequence. Reads the
// jsonb `steps` array when present, else falls back to the legacy step1-3 columns
// (3-step behaviour, unchanged for pre-#212 enrollments). One source of truth so
// the three send loops (internal.ts + routes/figsy.ts ×2) never diverge.
export interface EnrollmentStepView { subject: string; body: string; wait_days: number; total: number }
export function enrollmentStep(
  enrollment: Record<string, any>,
  stepNum: number,
): EnrollmentStepView | null {
  const arr = Array.isArray(enrollment.steps) ? (enrollment.steps as Array<{ subject?: string; body?: string; wait_days?: number }>) : null
  if (arr && arr.length > 0) {
    const total = arr.length
    if (stepNum < 1 || stepNum > total) return null
    const s = arr[stepNum - 1]
    if (!s?.subject || !s?.body) return null
    return { subject: s.subject, body: s.body, wait_days: Math.max(0, Math.round(s.wait_days ?? 4)), total }
  }
  // Legacy: step1-3 columns, 3-step cadence.
  if (stepNum < 1 || stepNum > 3) return null
  const subject = enrollment[`step${stepNum}_subject`] as string | undefined
  const body    = enrollment[`step${stepNum}_body`] as string | undefined
  if (!subject || !body) return null
  return { subject, body, wait_days: STEP_FOLLOWUP_DELAYS[stepNum] ?? 4, total: 3 }
}

// #15 — the send path now reports its outcome so callers (the approval-queue producer,
// especially) never have to GUESS whether mail actually left. 'sent' = it went out;
// 'queued' = held for human review (co-pilot mode); 'deferred' = a retryable skip
// (kill-switch off, cap reached, no Resend key, lost the atomic claim); 'suppressed' =
// a permanent no-send (demo / do-not-contact / opted-out); 'failed' = Resend rejected.
// Existing callers that ignore the return value keep compiling unchanged.
export type SendOutcome = 'sent' | 'queued' | 'deferred' | 'suppressed' | 'failed'

export async function sendSequenceEmail(
  enrollmentId: string,
  lead: Lead,
  step: number,
  subject: string,
  body: string,
  campaignId: string,
  opts?: { totalSteps?: number; waitDaysNext?: number; isPreview?: boolean; skipReview?: boolean },
): Promise<SendOutcome> {
  if (!lead.email) throw new Error('Lead has no email')

  // #344 (AR-07) — KILL-SWITCH. If auto-outreach is off, DEFER (no send, no state
  // change → the enrollment stays due and resumes when the switch is turned back on).
  // The founder's test-email path (isPreview) is a deliberate 1:1 send to their own
  // inbox, so it bypasses the switch.
  if (!opts?.isPreview && !outreachEnabled()) {
    console.warn(`[figsy] sendSequenceEmail: AUTO_OUTREACH_ENABLED != true — step ${step} to ${lead.email} DEFERRED (kill-switch off).`)
    return 'deferred'
  }

  // #453 — DEMO BACKSTOP (safety-critical). This is the single chokepoint every real
  // sequence-step send funnels through (the three cron paths call it directly), so an
  // is_demo client can NEVER email a real prospect from here — even if a higher-level
  // call site is ever missed. Resolve the lead's client; if demo, DO NOT send. Unlike
  // the kill-switch (which DEFERS so it resumes later), demo suppression is permanent:
  // NULL out next_send_at so the cron never re-picks this enrollment and burns cycles.
  // The founder's own preview/test send (isPreview → own inbox) is not a prospect send,
  // so it is exempt.
  if (!opts?.isPreview) {
    // Resolve the client. Prefer the lead's own client_id; if a caller passed a
    // client-less lead, fall back to the enrollment's client_id so the backstop still
    // fires (defence-in-depth for a missed call site).
    let demoClientId: string | null | undefined = lead.client_id
    if (!demoClientId && enrollmentId) {
      const { data: enr } = await db.from('figsy_enrollments').select('client_id').eq('id', enrollmentId).maybeSingle()
      demoClientId = (enr?.client_id as string | null | undefined) ?? null
    }
    if (await isDemoClient(demoClientId)) {
      console.log(`[demo] prospect send suppressed for client ${demoClientId ?? 'unknown'} — sequence step ${step} to ${lead.email} NOT sent (demo).`)
      if (enrollmentId) {
        await db.from('figsy_enrollments').update({ next_send_at: null }).eq('id', enrollmentId).then(() => {}, () => {})
      }
      return 'suppressed'
    }
  }

  // DO-NOT-CONTACT: hard stop — never email anyone connected to the founder's
  // employer, no matter how this lead got enrolled.
  if (isSuppressed({ email: lead.email, company: lead.company })) {
    console.warn(`[figsy] sendSequenceEmail: ${lead.email} is on the do-not-contact list — step ${step} NOT sent.`)
    return 'suppressed'
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
    // ONE WALLET: opt-out moves no money — the $4 was final at approve.
    return 'suppressed'
  }

  // #15 (AR / co-pilot) — HUMAN-IN-THE-LOOP REVIEW GATE. If the campaign is in co-pilot
  // mode (settings.review_required = true) this step does NOT auto-send: it enqueues a
  // pending draft into figsy_approval_queue and PAUSES the enrollment (next_send_at=null)
  // so the cron stops re-picking it. The client approves in the portal, and the approve
  // endpoint re-enters this function with opts.skipReview=true to run the SAME charged,
  // logged, atomically-claimed send the auto path would have. Runs AFTER the permanent
  // "never contact" gates (kill-switch / demo / do-not-contact / opt-out) so a suppressed
  // lead is never queued, and BEFORE the caps + atomic claim (those are send-time concerns
  // the approval re-entry re-checks). Skipped for the preview/test path and the re-entry.
  if (!opts?.isPreview && !opts?.skipReview) {
    const { data: camp } = await db.from('figsy_campaigns')
      .select('settings').eq('id', campaignId).maybeSingle()
    const reviewRequired = (camp?.settings as { review_required?: boolean } | null)?.review_required === true
    if (reviewRequired) {
      // Resolve client_id (approval_queue.client_id is NOT NULL). Prefer the lead's own;
      // fall back to the enrollment's for a client-less caller (defence-in-depth).
      let queueClientId: string | null | undefined = lead.client_id
      if (!queueClientId && enrollmentId) {
        const { data: enr } = await db.from('figsy_enrollments').select('client_id').eq('id', enrollmentId).maybeSingle()
        queueClientId = (enr?.client_id as string | null | undefined) ?? null
      }
      // Don't pile up duplicate drafts if this enrollment-step is already pending review.
      const { data: dupe } = await db.from('figsy_approval_queue')
        .select('id').eq('enrollment_id', enrollmentId).eq('sequence_step', step).eq('status', 'pending').maybeSingle()
      if (!dupe) {
        const { error: qErr } = await db.from('figsy_approval_queue').insert({
          client_id:      queueClientId,
          campaign_id:    campaignId,
          enrollment_id:  enrollmentId,
          lead_id:        lead.id,
          sequence_step:  step,
          to_email:       lead.email,
          subject,
          body,
          status:         'pending',
          total_steps:    opts?.totalSteps ?? null,
          wait_days_next: opts?.waitDaysNext ?? null,
        })
        if (qErr) {
          // FAIL-CLOSED: could not queue → do NOT send and do NOT pause (leave the
          // enrollment due so a later cron retries the queue). Never send unreviewed.
          console.error(`[figsy] sendSequenceEmail: review-queue insert FAILED for enrollment ${enrollmentId} step ${step} — not sending (fail-closed)`, qErr.message)
          return 'deferred'
        }
      }
      // Pause the enrollment while it waits for the human. The approve path re-arms + sends.
      await db.from('figsy_enrollments').update({ next_send_at: null }).eq('id', enrollmentId)
      console.log(`[figsy] sendSequenceEmail: step ${step} for enrollment ${enrollmentId} QUEUED for human review (co-pilot) — not sent.`)
      return 'queued'
    }
  }

  // WARMUP cap — if today's cold quota is used up, DEFER (don't advance state, no
  // record inserted → enrollment stays due and retries on the next cron run).
  if (await coldCapReached()) {
    console.warn(`[figsy] sendSequenceEmail: daily cold-send cap reached — step ${step} to ${lead.email} deferred to next run.`)
    return 'deferred'
  }

  // PER-CLIENT cap (T3) — defer if THIS client has hit their own daily limit, even if
  // the global cap has room (fairness). Same defer semantics: enrollment stays due.
  if (await perClientCapReached(lead.client_id)) {
    console.warn(`[figsy] sendSequenceEmail: per-client daily cap reached for client ${lead.client_id} — step ${step} to ${lead.email} deferred.`)
    return 'deferred'
  }

  // #311 — if Resend isn't configured, DEFER: do not record a "sent" row and do not
  // advance the enrollment. Previously the row was inserted + the enrollment advanced
  // to sent/completed REGARDLESS of whether mail left, so a dead/rotated RESEND_API_KEY
  // was invisible: dashboards + counters showed sends, AND the sends-stalled watchdog
  // (which counts these rows) stayed silent on the exact outage it exists to catch.
  // Deferring leaves the enrollment due; the next cron retries once the key is restored.
  if (!resend) {
    console.warn(`[figsy] sendSequenceEmail: RESEND_API_KEY not set — step ${step} to ${lead.email} DEFERRED (no send, no row, no state change).`)
    return 'deferred'
  }

  // #354 (AR-16) — ATOMIC STEP CLAIM. Before sending, move the enrollment from step-1
  // to `step` conditioned on it STILL being at step-1. If the UPDATE claims no row, a
  // concurrent runner (overlapping cron / manual send-now) already took this step —
  // bail so the same prospect is never emailed twice. Skipped for the preview/test path
  // (no real enrollment row). Runs AFTER the defer guards above so a deferred send never
  // advances the step without sending. On send failure (#338) the claim is rolled back.
  if (!opts?.isPreview) {
    const { data: claimed } = await db.from('figsy_enrollments')
      .update({ current_step: step })
      .eq('id', enrollmentId)
      .eq('current_step', step - 1)
      .select('id')
      .maybeSingle()
    if (!claimed) {
      console.warn(`[figsy] sendSequenceEmail: step ${step} for enrollment ${enrollmentId} already claimed/advanced — skipping (no double-send)`)
      return 'deferred'
    }
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

  // resend is guaranteed configured here (deferred above otherwise).
  {
    // Cold email = a personal 1:1 message → Primary, not Promotions. NO pixel, image
    // banner, visible unsubscribe footer, or templated shell (see coldEmailHtml). The
    // one-click List-Unsubscribe header + the body's "Reply STOP" line cover compliance.
    // #338 (AR-01) — Resend RETURNS { error } instead of throwing. A failed send must
    // NOT advance the enrollment or leave a phantom "sent" row: delete the row we
    // inserted for the pixel, leave the enrollment DUE (so the cron retries once the
    // cause clears), alert the founder, and bail. This is the exact defer-on-failure
    // shape as the RESEND-unset guard above — a failure is retryable, never a phantom.
    // F1 (Fable audit) — a network THROW mid-send (socket drop) must hit the SAME
    // rollback as a returned { error }; otherwise the claimed step + inserted row strand
    // as a phantom and the next cron fires step N+1 while step N never left. Catch it
    // and synthesise a failed verdict so the one rollback below covers both cases.
    let checked: ReturnType<typeof interpretSend>
    try {
      const result = await resend.emails.send({
        from:     FROM,
        reply_to: REPLY_TO,
        to:       lead.email,
        subject,
        headers:  unsubscribeHeaders(lead.email),
        text:     body,
        html:     coldEmailHtml(body, emailId),
      })
      checked = interpretSend(result)
    } catch (thrown) {
      checked = { ok: false, id: null, error: thrown }
    }
    if (!checked.ok) {
      console.error(`[figsy] sendSequenceEmail: send FAILED for ${lead.email} step ${step} — not advancing enrollment`, checked.error)
      if (emailId) await db.from('figsy_sent_emails').delete().eq('id', emailId)
      // #354 — roll the atomic claim back to step-1 so the step stays DUE and a later
      // run retries it (the claim above tentatively moved current_step to `step`).
      if (!opts?.isPreview) {
        await db.from('figsy_enrollments')
          .update({ current_step: step - 1, next_send_at: new Date().toISOString() })
          .eq('id', enrollmentId)
      }
      void sendFounderAlert('sends_stalled', 'FIGSY send failed — email did not leave', [
        `Lead: ${lead.email}`,
        `Enrollment: ${enrollmentId} (step ${step})`,
        `Campaign: ${campaignId}`,
        `Resend error: ${checked.error instanceof Error ? checked.error.message : JSON.stringify(checked.error)}`,
        `The enrollment stays due and will retry on the next send run.`,
      ])
      return 'failed'
    }
    messageId = checked.id ?? undefined

    // Update resend_id now that we have it
    if (emailId && messageId) {
      await db.from('figsy_sent_emails').update({ resend_id: messageId }).eq('id', emailId)
    }
  }

  // Advance enrollment state. #212 — total-steps aware: a sequence completes at its
  // OWN last step (opts.totalSteps, default 3 for legacy callers), and the delay to
  // the next step comes from that step's wait_days (opts.waitDaysNext).
  const totalSteps = opts?.totalSteps ?? 3
  const isLast = step >= totalSteps
  const waitDays = opts?.waitDaysNext ?? STEP_FOLLOWUP_DELAYS[step] ?? 4
  const nextSendAt = isLast
    ? null
    : new Date(Date.now() + waitDays * 86400000).toISOString()

  await db.from('figsy_enrollments').update({
    current_step: step,
    status:       isLast ? 'completed' : 'in_progress',
    next_send_at: nextSendAt,
    ...(isLast ? { completed_at: new Date().toISOString() } : {}),
  }).eq('id', enrollmentId)
  // ONE WALLET: last step sent moves no money — the $4 was final at approve.

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
    // F2 (Fable audit / #383) — do NOT chain .maybeSingle() here: the RPC returns a
    // scalar, and if PostgREST rejects that response shape the UPDATE has ALREADY
    // committed server-side — then the fallback below would bump the counter a SECOND
    // time, drifting it UP (the exact bug #383 exists to kill). Read the plain { error }
    // so the fallback only runs on a genuine RPC failure.
    const { error: rpcErr } = await db.rpc('increment_figsy_emails_sent', { campaign_id: campaignId })
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

  return 'sent'
}

// #310/#332 — charge 1 FIGSY credit for one enrollment, FAIL-CLOSED. The
// try_charge_figsy_credit RPC makes the decrement itself the gate: a single
// atomic conditional UPDATE that only decrements at balance >= 1 and reports via
// its boolean whether it actually charged. This kills the gate-then-charge race
// at balance 1 AND the old silent clamp-at-0 free enroll (increment_figsy_credits
// GREATEST(0,…) returned "success" while charging nothing). Callers MUST charge
// BEFORE inserting the enrollment and abort the enroll on a false return.
// Returns true only when a credit was really taken (then the ledger row is written).
// (F1 fix) Tri-state so callers know whether a credit was ACTUALLY taken:
//   'charged' — a FIGSY credit was decremented (refund it if the enrollment insert then fails)
//   'skipped' — no charge (demo, or the $3 is already held/captured for this lead) → NEVER refund
//   'failed'  — the charge failed, nothing taken → do not enroll, nothing to refund
// The old boolean conflated 'skipped' with 'charged', so a hold-skip that hit an insert failure
// wrongly refunded a credit that was never charged (wallet inflation / ledger drift).
export type EnrollChargeResult = 'charged' | 'skipped' | 'failed'
export async function chargeFigsyEnroll(
  clientId: string,
  lead: { id?: string; first_name?: string | null; last_name?: string | null; company?: string | null },
): Promise<EnrollChargeResult> {
  const leadName = `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || '(unknown lead)'

  // #453 — DEMO MODE: enrolling for a demo client is FREE and OFF-LEDGER. Skip the $1
  // reveal charge, the $3 FIGSY charge and every credit_transactions/usage row — but
  // return true so the caller still WRITES the enrollment + drafted sequence (the demo
  // must showcase drafts in the portal). Nothing sends: the sendSequenceEmail backstop
  // suppresses the actual outreach. This single gate covers all three enroll paths
  // (autoEnrollLead + the two manual /figsy enroll loops) so demo work never bills.
  if (await isDemoClient(clientId)) {
    console.log(`[demo] FIGSY enroll free (off-ledger) for client ${clientId} — ${leadName}`)
    return 'skipped'
  }

  // ONE WALLET — a lead is worked for a flat $4, charged ONCE ever from the wallet.
  // If this lead was already charged (typically the client's approve took the $4, or a
  // prior enrol), skip — the work is already paid. Dedup on the per-lead ledger row.
  if (lead.id) {
    const { data: existing } = await db.from('credit_transactions')
      .select('id').eq('client_id', clientId).eq('reference', `lead:${lead.id}`).eq('type', 'wallet_charge').limit(1).maybeSingle()
    if (existing) {
      console.log(`[figsy] chargeFigsyEnroll: lead ${lead.id} already charged $4 — skipping (client ${clientId})`)
      return 'skipped'
    }
  }

  // Charge the flat $4 (the atomic decrement IS the gate). Fail CLOSED — only a hard
  // `true` counts; a null/undefined must never be treated as a successful charge.
  const { data: charged, error } = await db.rpc('try_charge_wallet', { p_client_id: clientId, p_amount: 4 })
  if (error || charged !== true) {
    console.error('[figsy] chargeFigsyEnroll: wallet charge failed', error?.message ?? 'insufficient balance', 'client', clientId)
    void sendFounderAlert('charge_failed', 'FIGSY enrollment charge failed — lead NOT enrolled', [
      `Client: ${clientId}`,
      `Lead: ${leadName}${lead.company ? ` at ${lead.company}` : ''}`,
      error ? `Reason: RPC error — ${error.message}` : 'Reason: wallet balance below $4 at charge time.',
    ])
    return 'failed'
  }
  await db.from('credit_transactions').insert({
    client_id: clientId,
    amount: -4,
    type: 'wallet_charge',
    plan: 'work_model',
    reference: lead.id ? `lead:${lead.id}` : null,
    note: `Approved lead worked ($4): ${leadName}${lead.company ? ` at ${lead.company}` : ''}`.trim(),
    created_at: new Date().toISOString(),
  }).then(() => {}, () => {})
  return 'charged'
}

// #332 — return the $4 when the enrollment insert fails AFTER we charged (charge-first
// ordering). Best-effort: credits the wallet and removes the per-lead charge ledger row
// (so a legitimate retry can charge again) — never throws into the caller.
export async function refundFigsyEnroll(clientId: string, leadId?: string): Promise<void> {
  await db.rpc('increment_wallet', { p_client_id: clientId, p_amount: 4 }).then(() => {}, (e: unknown) => {
    console.error('[figsy] refundFigsyEnroll: $4 wallet reversal failed', String(e), 'client', clientId)
    void sendFounderAlert('charge_failed', 'Wallet reversal failed — client lost $4', [
      `Client: ${clientId}`,
      'An enrollment failed after the $4 was charged, and returning it also failed.',
      'Action: add $4 to this client’s wallet manually.',
    ])
  })
  // W3 — free the per-lead charge reference so a legitimate retry can re-charge, and
  // give the reverse row a NULL reference so it can never collide with the unique
  // `lead:{id}` index (a same-reference reverse would block the retry-charge silently).
  if (leadId) {
    await db.from('credit_transactions').delete()
      .eq('client_id', clientId).eq('reference', `lead:${leadId}`).eq('type', 'wallet_charge').then(() => {}, () => {})
  }
  await db.from('credit_transactions').insert({
    client_id: clientId, amount: 4, type: 'wallet_reverse', plan: 'work_model',
    reference: null,
    note: leadId ? `Enrollment failed after charge — $4 returned (lead ${leadId})` : 'Enrollment failed after charge — $4 returned',
    created_at: new Date().toISOString(),
  }).then(() => {}, () => {})
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
  clientKnowledge?: string,
): Promise<Day1Draft> {
  const prompt = `You are writing a cold email on behalf of ${senderCompany}${senderIndustry ? ` (${senderIndustry})` : ''}. You write as a real person at the company — someone who noticed this prospect and decided to reach out. Not templated. Not AI-sounding. Like someone who typed this in 90 seconds.

Lead:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'unknown'}
- Company: ${lead.company || 'unknown'}
- Industry: ${lead.industry || 'unknown'}
- Country: ${lead.country || 'unknown'}
${lead.score_reasoning ? `- Why they're a fit: ${lead.score_reasoning}` : ''}
${clientKnowledge ? `
What the sender offers (grounding) — the ONLY source of truth about ${senderCompany}'s product, results and proof. Use these facts to make the "why it matters to them" line specific; never invent a capability, metric, customer, or result for ${senderCompany} beyond it:
${clientKnowledge}
` : ''}
Write one cold email. First touch. Under 70 words.

Rules:
- Open with a specific observation about their role or company — not a compliment, a real observation
- One sentence on what ${senderCompany} does and why it matters to them
- Only describe the sender's product, results, metrics, or customers using facts from the "What the sender offers (grounding)" block above. If that block is empty or doesn't cover something, stay generic about the sender — never invent a capability, metric, customer, or result for ${senderCompany}.
- One CTA: short call, 15 minutes
- No bullet points in the body
- No em-dashes (—)
- No buzzwords: no "synergy", "leverage", "touch base", "game-changer", "revolutionary", "Hope this finds you well", "I wanted to reach out"
- Don't mention AI or automation
- Subject: 4–6 words, lowercase, no punctuation
${senderName ? `- Sign off as exactly "${senderName}". Do NOT invent or use any other name.` : '- Sign off with a real first name that fits the sender\'s region and industry'}
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
  // #453 — DEMO MODE: day-1 cold outreach is a prospect send. A demo client must never
  // email a real person, so suppress the entire batch (the backstop in resend never runs).
  if (await isDemoClient(clientId)) {
    console.log(`[demo] prospect send suppressed for client ${clientId} — ${leadIds.length} day-1 outreach emails NOT sent (demo).`)
    return
  }

  // #344 (AR-07) — KILL-SWITCH. Day-1 cold outreach is a send path; honour the switch.
  if (!outreachEnabled()) {
    console.warn(`[figsy] sendDay1OutreachBatch: AUTO_OUTREACH_ENABLED != true — ${leadIds.length} leads NOT day-1 emailed (kill-switch off).`)
    return
  }

  const { data: client } = await db.from('clients')
    .select('company_name, industry').eq('id', clientId).single()
  // P-a: configurable sign-off name (guarded — null if column missing pre-migration).
  const { data: clientSigner } = await db.from('clients').select('signer_name').eq('id', clientId).maybeSingle()
  const senderName: string | null = (clientSigner?.signer_name as string | null) ?? null

  // P10/#335 — ground the day-1 writer in what the client actually sells (fetched
  // ONCE for the whole batch), so it can't invent sender claims. Same digest +
  // hard no-fabrication rule the multi-step generateSequence path already uses.
  const clientKnowledge = await getClientKnowledgeForOutreach(clientId)

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
      const draft = await generateDay1Email(lead, clientCompanyName, client?.industry ?? null, senderName, clientKnowledge)

      // #311 — do not record a day-1 "sent" row when Resend is unconfigured (that made
      // a dead key invisible + fed the watchdog false sends). Skip the lead instead.
      if (!resend) {
        console.warn(`[figsy] sendDay1OutreachBatch: RESEND_API_KEY not set — day-1 to ${lead.email} skipped (no send, no row).`)
        continue
      }

      const day1Result = await resend.emails.send({
        from: FROM,
        reply_to: REPLY_TO,
        to: lead.email,
        subject: draft.subject,
        // Personal 1:1 cold email (Primary, not Promotions) — header-only unsubscribe.
        headers: unsubscribeHeaders(lead.email),
        text: draft.body,
        html: coldEmailHtml(draft.body),
      })

      // #338 (AR-01) — a failed send must not leave a phantom "sent" row or flip the
      // lead to 'contacted'. Skip the lead (stays 'scored' → retried next run) + alert.
      const day1Checked = interpretSend(day1Result)
      if (!day1Checked.ok) {
        console.error(`[day1-outreach] send FAILED for ${lead.email} — no row, lead stays scored`, day1Checked.error)
        void sendFounderAlert('sends_stalled', 'FIGSY day-1 send failed — email did not leave', [
          `Lead: ${lead.email} (${lead.id})`,
          `Resend error: ${day1Checked.error instanceof Error ? day1Checked.error.message : JSON.stringify(day1Checked.error)}`,
        ])
        continue
      }

      await db.from('figsy_sent_emails').insert({
        enrollment_id: null,
        campaign_id:   null,
        lead_id:       lead.id,
        step:          1,
        subject:       draft.subject,
        body:          draft.body,
        resend_id:     day1Checked.id,
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

  // Client booking link to offer leads (FIGSY's whole job is booking meetings). #361b —
  // when the client has connected Google Calendar, this is the per-lead tokenised page
  // (FIGSY books straight into their calendar); otherwise their static booking_url.
  const { data: clientBooking } = await db.from('clients')
    .select('booking_url, calendar_booking_enabled').eq('id', clientId).maybeSingle()
  const bookingUrl: string | null = bookingUrlForLead(clientBooking as { booking_url?: string | null; calendar_booking_enabled?: boolean | null } | null, lead.id, clientId)
  // P-a: configurable sign-off name. Separate guarded select so a missing column
  // (pre-migration) returns null rather than breaking the booking_url read above.
  const { data: clientSigner } = await db.from('clients').select('signer_name').eq('id', clientId).maybeSingle()
  const senderName: string | null = (clientSigner?.signer_name as string | null) ?? null

  // #335 — ground the SOLUTION half in what the client actually sells.
  const clientKnowledge = await getClientKnowledgeForOutreach(clientId)

  if (!memory || (memory.total_sent_all_time ?? 0) < 20) {
    return generateSequence(lead, senderCompanyName, senderIndustry, campaignIntent, bookingUrl, senderName, clientKnowledge)
  }

  // P2-1: 3-type memory model
  // Episodic: recent patterns (last 14 days) — what's working right now
  const episodic = (memory as any).episodic_memory as Record<string, unknown> | null
  // Long-term: accumulated learning — winning angles, best subjects
  const longterm = (memory as any).longterm_memory as Record<string, unknown> | null
  // Preference: tone/format per client
  const preference = (memory as any).preference_memory as Record<string, unknown> | null

  let memoryContext = [
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

  // ── #511t2 NEXUS COPY TUNING (GATED — default-deny) ───────────────────────
  // When THIS client's auto-tune is enabled AND the confidence gate passes, fold in what the
  // client's own Nexus has learned about who BOOKS (persona) and what they push back with
  // (objections), so the copy leans into the buyer that converts. If the gate isn't 'ready'
  // (the default for every client), memoryContext is byte-identical to today — nothing tunes.
  // Best-effort + fenced: a Nexus hiccup never breaks sequence generation, and the loaded
  // profile is asserted to belong to THIS client before it can shape a single word.
  try {
    const { getNexusProfile } = await import('./nexus')
    const { nexusTuneGate, nexusGlobalKill, assertSameClient } = await import('./nexus-guard')
    const prof = await getNexusProfile(clientId)
    assertSameClient(prof.client_id, clientId) // THE FENCE — never another client's brain
    const { data: tuneFlag } = await db.from('clients').select('nexus_autotune_enabled').eq('id', clientId).maybeSingle()
    const gate = nexusTuneGate(prof, tuneFlag?.nexus_autotune_enabled === true, nexusGlobalKill())
    if (gate.allowed) {
      const persona = [prof.top_persona.job_title, prof.top_persona.seniority, prof.top_persona.industry].filter(Boolean).join(' · ')
      const parts: string[] = []
      if (persona) parts.push(`This client books best with ${persona} — mirror that buyer's priorities and language.`)
      if (prof.objections.length) parts.push(`Pre-empt the common pushback: ${prof.objections.slice(0, 3).map(o => o.class.replace(/_/g, ' ')).join(', ')}.`)
      if (parts.length) memoryContext += `\nNexus (this client's own learned pattern — weight it heavily): ${parts.join(' ')}`
    }
  } catch { /* Nexus is best-effort — never break sequence generation */ }

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
${clientKnowledge ? `
What the sender offers (grounding) — the ONLY source of truth about ${senderCompanyName}'s product, results and proof. Use it to make the solution half specific; never invent a capability, metric, customer, or result for ${senderCompanyName} beyond it:
${clientKnowledge}
` : ''}${campaignIntent ? `
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
- Only describe the sender's product, results, metrics, or customers using facts from the "What the sender offers (grounding)" block above; if it's empty or silent on something, stay generic about the sender — never fabricate.
- Subject: 4–6 words, lowercase, no punctuation
- End every email: "Reply STOP to opt out."
${senderName ? `- Sign off as exactly "${senderName}". Do NOT invent or use any other name.` : '- Sign with a real first name that fits the sender\'s region and industry'}

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
    return generateSequence(lead, senderCompanyName, senderIndustry, campaignIntent, bookingUrl, senderName, clientKnowledge)
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

export async function autoEnrollLead(leadId: string, clientId: string, opts?: { force?: boolean; prepaid?: boolean }): Promise<void> {
  try {
    // #344 (AR-07) — KILL-SWITCH, checked BEFORE the charge. autoEnrollLead charges a
    // FIGSY credit then sends step 1; if the switch is off, sendSequenceEmail would defer
    // the send but the charge would already be taken. Bail here so "off" never charges.
    //
    // #487 — EXCEPTION: the approve-gated $4 trigger passes { force: true }. An explicit
    // client (or operator-on-behalf) approval is a DELIBERATE decision to buy the work,
    // so it charges + enrols even while AUTO_OUTREACH_ENABLED is off — but the actual
    // SEND still defers, because the sendSequenceEmail call at the end of this function
    // has its OWN kill-switch check that returns 'deferred' without sending or advancing.
    // Net: approve charges $3 + creates the enrolment now; nothing leaves until the
    // switch is turned on. The auto (non-approve) path is unchanged — it still bails here.
    if (!opts?.force && !outreachEnabled()) {
      console.warn(`[figsy] autoEnrollLead: AUTO_OUTREACH_ENABLED != true — not enrolling/charging lead ${leadId} (kill-switch off).`)
      return
    }

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
      .select('company_name, industry, crm_dedup_enabled, crm_type, crm_api_key, figsy_credits_remaining, is_demo').eq('id', clientId).single()

    // #453 — DEMO MODE: enroll for FREE (no FIGSY credit, no reveal charge), still
    // DRAFT + persist the sequence so the portal showcases it, but send NOTHING. The
    // credit/send gates below are bypassed for demo; the send call at the end is skipped
    // and the enrollment is inserted with next_send_at = null so the cron never fires it.
    const isDemo = client?.is_demo === true

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
    if (!isDemo && !canEnroll(client?.figsy_credits_remaining)) {
      console.warn(`[figsy] autoEnrollLead: client ${clientId} has no FIGSY credits — skipping enrollment for lead ${leadId}.`)
      return
    }

    // Charge-without-send guard (audit 2 Jul): FIGSY bills one credit AT enrollment,
    // then sends step 1 immediately. If the send engine is unconfigured (RESEND_API_KEY
    // unset → `resend` is null), step 1 would silently never leave while the client is
    // still charged. Refuse to enroll/charge when we cannot send at all — a
    // misconfiguration must never bill a client for outreach that didn't go out.
    // (Note: blocklist / daily-cap skips inside sendSequenceEmail are by-design deferrals,
    // NOT this bug — this guard targets only the no-send-capability case.)
    if (!isDemo && !resend) {
      console.error(`[figsy] autoEnrollLead: RESEND_API_KEY unset — refusing to enroll/charge lead ${leadId} (would deduct a FIGSY credit with no send).`)
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

    // #212 — build the FULL ordered step array (≤10). A client-built sequence carries
    // its own copy + per-step cadence; the AI path is the 3-step draft. The first step's
    // subject is overwritten with the A/B-selected variant so what we STORE equals what
    // we SEND. The step1-3 columns below are still written (first 3) for legacy readers.
    const fullSteps = (usingSequence && appliedSequence)
      ? buildDraftStepsFromSequence(appliedSequence, lead as any, client?.company_name ?? null)
      : draftToSteps(draft)
    if (fullSteps.length > 0) fullSteps[0] = { ...fullSteps[0], subject: step1Subject }
    const totalSteps = fullSteps.length > 0 ? fullSteps.length : 3

    // #302 — idempotency guard. Without it a retried autoEnrollLead (webhook re-fire,
    // cron overlap, manual re-run) inserts a SECOND enrollment for the same lead AND
    // deducts a SECOND FIGSY credit — a real double-charge. Refuse to re-enrol a lead
    // that already has an enrollment in this campaign. (Belt-and-braces at the app
    // layer; a DB unique(campaign_id, lead_id) index would enforce it at the store —
    // proposed as a follow-up migration, see the PR body.)
    const { data: existingEnrollment } = await db.from('figsy_enrollments')
      .select('id').eq('campaign_id', campaign.id).eq('lead_id', leadId).maybeSingle()
    if (existingEnrollment) {
      console.log(`[figsy] autoEnrollLead: lead ${leadId} already enrolled in campaign ${campaign.id} — skipping (idempotent, no re-charge)`)
      return
    }

    // ── CHARGE FIRST (#332) ─────────────────────────────────────────────────────
    // Fail-closed ordering: charge the FIGSY credit BEFORE inserting the enrollment.
    // The charge is the real gate (try_charge_figsy_credit) — canEnroll() above is
    // only the fast UX pre-check. The per-campaign idempotency guard runs ABOVE this,
    // so a lead already enrolled is never charged. If the charge fails (RPC error or
    // no credit), abort WITHOUT inserting or sending — chargeFigsyEnroll already
    // alerted the founder.
    // ONE WALLET — when `prepaid` is set (the client-approve path already took the $4)
    // we do NOT charge again here; enrolment proceeds on the already-paid lead.
    // tri-state: 'charged' = the $4 was taken by THIS call (refund on failure); 'skipped'
    // = demo or already-paid (never refund — nothing taken here); 'failed' = wallet too
    // low (don't enrol, don't refund).
    const chargeResult: EnrollChargeResult =
      (isDemo || opts?.prepaid) ? 'skipped' : await chargeFigsyEnroll(clientId, lead)
    if (chargeResult === 'failed') {
      console.warn(`[figsy] autoEnrollLead: charge failed for lead ${leadId} — not enrolling (nothing charged).`)
      return
    }

    // P8 — a supabase insert normally RETURNS its error, but any THROW here (network
    // drop, unexpected client error) after a successful charge would otherwise land in
    // the outer catch as a SILENT credit leak (charged, never enrolled, never refunded).
    // Guard the insert: on a throw, return the credit before bailing.
    let insertRes
    try {
      insertRes = await db.from('figsy_enrollments').insert({
        campaign_id:    campaign.id,
        lead_id:        leadId,
        client_id:      clientId,
        status:         'enrolled',
        current_step:   0,
        // #453 — demo enrollments never send, so leave next_send_at null (the cron
        // gates on next_send_at) so a demo enrollment is drafted-only and inert.
        next_send_at:   isDemo ? null : new Date().toISOString(), // send step 1 immediately
        // #212 — full ≤10-step sequence walked by the send engine.
        steps:          fullSteps.length > 0 ? fullSteps : null,
        total_steps:    fullSteps.length > 0 ? fullSteps.length : null,
        // Back-compat: first 3 steps mirrored to the legacy columns (voice.ts, A/B view).
        step1_subject:  step1Subject,
        step1_body:     draft.step1.body,
        step2_subject:  draft.step2.subject,
        step2_body:     draft.step2.body,
        step3_subject:  draft.step3.subject,
        step3_body:     draft.step3.body,
      }).select('id').single()
    } catch (insertThrow) {
      console.error('[figsy] autoEnrollLead: enrollment insert threw after charge — returning $4 for lead', leadId, insertThrow)
      // Return ONLY money taken by THIS call: refund the $4 if we charged it. A 'skipped'
      // result (demo, or already paid by the approve) took nothing here → return nothing.
      if (chargeResult === 'charged') await refundFigsyEnroll(clientId, leadId)
      return
    }
    const { data: enrollment, error } = insertRes

    if (error || !enrollment) {
      // We already charged — return the $4 so the wallet + ledger reconcile.
      console.error('[figsy] autoEnrollLead: enrollment insert failed after charge', error?.message, 'for lead', leadId, '— returning $4')
      if (chargeResult === 'charged') await refundFigsyEnroll(clientId, leadId)
      return
    }

    // Increment campaign enrolled count
    const { data: camp } = await db.from('figsy_campaigns')
      .select('leads_enrolled').eq('id', campaign.id).single()
    if (camp) {
      await db.from('figsy_campaigns')
        .update({ leads_enrolled: (camp.leads_enrolled ?? 0) + 1 })
        .eq('id', campaign.id)
    }

    // Send step 1 immediately (using the selected variant subject) — EXCEPT for demo:
    // #453 the sequence is drafted + stored above for the portal, but a demo client must
    // never email a real prospect, so no send fires (the sendSequenceEmail backstop would
    // also suppress it, but skipping avoids the wasted call).
    if (isDemo) {
      console.log(`[demo] enrollment ${enrollment.id} drafted for client ${clientId} lead ${leadId} — no prospect send (demo).`)
    } else {
      await sendSequenceEmail(
        enrollment.id,
        lead as Lead,
        1,
        step1Subject,
        draft.step1.body,
        campaign.id,
        { totalSteps, waitDaysNext: fullSteps[0]?.wait_days },
      )
    }
  } catch (err) {
    console.error('[figsy] autoEnrollLead failed for lead', leadId, ':', err instanceof Error ? err.message : err)
  }
}
