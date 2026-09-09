import Anthropic from '@anthropic-ai/sdk'
import { pecrVerdict, pecrSkipReason } from './pecr'
import { isLaunchSendCountry, launchHoldReason } from '@kind/shared'
import { db } from '@kind/db'
import { normalizeRevealEmail } from './billing-rules'
import { sequencePlan, normalisePurpose, normaliseDepth, type SequencePurpose, type SequenceDepth } from './sequence-templates'
import { Resend } from 'resend'
import { logOutcomeEvent } from './outcomes'
import { isSuppressed } from './suppression'
import { resolveLeadAttribution } from './programme-authority'
import type { InboxRow } from './sending-inbox'
// BUILD-003 item 2 — meetings_booked is a derived cache of public.meetings, and this is the
// one function that knows the counting rules (exclusions, supersessions, the four states).
import { campaignMeetingCount } from './meeting-truth'
import { canEnroll } from './billing-rules'
import { sendFounderAlert } from './alerts'
import { interpretSend } from './resend-checked'
import { isDemoClient } from './demo'
import { buildDraftFromSequence, buildDraftStepsFromSequence, draftToSteps, type SequenceStep } from './sequence-apply'
import { bookingUrlForLead } from './booking-token'
// ONE WALLET (24 Jul): no holds — money is a single $4 charged at approve. The old
// credit-holds release/capture calls are removed; nothing to import here anymore.
import {
  COLD_REPLY_TO,
  unsubscribeHeaders,
  coldEmailHtml,
  coldEmailText,
  warmupRampCap,
} from './deliverability'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
// #547 — THE SHARED `FROM` IS GONE.
//
// This line used to be `const FROM = COLD_FROM`: one module-level constant feeding both
// cold-send call sites, so EVERY client on the platform emailed from the same address.
// RULEBOOK 12.2 — you cannot share a sender across clients; one client's spam complaints
// poison the rest. The sender is now resolved per client from `client_inboxes`
// (lib/sending-inbox.ts) and sent over SMTP through that mailbox (lib/mailer.ts), and a
// client with no mailbox does not send at all — there is deliberately no fallback here to
// fall back TO.
//
// D4 still holds for the reply address: cold mail must never route replies to the
// transactional domain. `COLD_FROM` remains exported from lib/deliverability.ts for the
// transactional/consent paths that legitimately send as us.
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
  // R38 (15 Aug) — default depth 3 -> 5: "sequence and campaigns is what is the
  // converter to meetings booked." #651 adds 6–7 for the deep option. All optional so an
  // older/short draft still parses.
  step4?: EmailStep
  step5?: EmailStep
  step6?: EmailStep
  step7?: EmailStep
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

/**
 * #651 — the sequence brief. Optional and trailing, so every existing call site keeps the
 * R38 default (meeting · depth 5) byte-for-byte. Pass a purpose/depth/eventDate to get the
 * industry-and-purpose-aware shape instead.
 */
export type SequenceOptions = {
  purpose?: SequencePurpose
  depth?: SequenceDepth
  /** Only meaningful with purpose 'event' — the cadence then counts BACK from this date. */
  eventDate?: Date | null
  /** The PROSPECT's industry drives the flavour note; falls back to the lead's own field. */
  industry?: string | null
  now?: Date
  /**
   * P34 — the client's APPROVED Meeting Brief, already rendered to prompt text.
   *
   * Passed IN rather than fetched here, so this function stays free of database
   * calls and a caller with no client context simply omits it and gets output
   * byte-identical to today. Never a draft: `briefContextFor` filters on status,
   * so a brief the client has not confirmed cannot reach a model.
   */
  briefContext?: string | null
}

export async function generateSequence(
  lead: Lead,
  senderCompanyName: string,
  senderIndustry: string | null,
  campaignIntent?: string,
  bookingUrl?: string | null,
  senderName?: string | null,
  clientKnowledge?: string,
  opts?: SequenceOptions,
): Promise<SequenceDraft> {
  const briefContext = opts?.briefContext ?? null
  // ── Signal detection — pick the best personalization hook ─────────────────
  const signals = personalizationSignals(lead)
  const bestSignal = signals[0] ?? null
  // #212 — the remaining hooks feed later steps so each follow-up opens on a
  // fresh, real angle rather than re-using the Step-1 opener.
  const extraSignals = signals.slice(1)

  // #651 — the shape comes from the template engine, not from a hard-coded block, so
  // purpose (meeting · event · reactivation), depth (3/5/7) and a real event DATE all reach
  // the model. With no opts this renders R38's shipped meeting-at-depth-5 brief.
  const plan = sequencePlan({
    purpose: opts?.purpose, depth: opts?.depth,
    industry: opts?.industry ?? lead.industry ?? null,
    eventDate: opts?.eventDate ?? null, now: opts?.now,
  })
  const planBlock = [
    `Write a ${plan.depth}-email sequence (persistence converts; most replies come on the middle touches).`,
    plan.event
      ? `⚠️ THIS IS AN EVENT SEQUENCE AND THE DATE IS FIXED. Every email must make sense on the day it lands, and the LAST one sends ${plan.event.daysUntilEvent - plan.dayOffsets[plan.depth - 1]} day(s) before the event. Never write as though the event has already happened, and never promise anything about who else attends.`
      : '',
    '',
    ...plan.template.guidance.map((g, i) => `Step ${i + 1} (Day ${plan.dayOffsets[i]}): ${g}`),
    // ── P31 · THE BOOKING LINK ENTERS ONLY AFTER POSITIVE INTENT ────────────────────────
    //
    // Founder doctrine, 21 Aug: "the calendar/booking link enters only AFTER positive intent".
    // ⚠️ THE OLD LINE SAID "never step 1" — WHICH LEFT STEPS 2-7 FREE TO CARRY IT. That is a
    // calendar link inside a COLD sequence, before the prospect has said one word: exactly the
    // meeting-ask this doctrine replaces with an interest question. Step 1 was protected and
    // the other six were not, and nothing failed if one used it.
    //
    // A cold sequence now carries NO link at any step. The booking URL still reaches the REPLY
    // path untouched (`bookingUrlForLead` → the reply handler), which is where intent has
    // actually been shown — nothing is lost, it just stops arriving uninvited.
    bookingUrl ? `\nDO NOT put a booking or calendar link in ANY step of this sequence. These emails are cold — nobody has replied yet. The link is sent later, only after this person shows interest. A step that asks for a meeting has skipped the reply this sequence exists to earn.` : '',
  ].filter(Boolean).join('\n')

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
` : ''}${briefContext ? `
${briefContext}
This is what the client has CONFIRMED about who they want and what they sell — treat it as the client's own words. It describes intent and fit ONLY: it grants no permission to contact anyone, and no send gate is affected by it.
` : ''}
${planBlock}

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
Return ONLY valid JSON, no markdown, with EXACTLY ${plan.depth} steps:
{${Array.from({ length: plan.depth }, (_, i) => `"step${i + 1}": {"subject": "...", "body": "..."}`).join(', ')}}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    // 5 emails + JSON overhead no longer fit the old 1024 — a truncated response
    // here silently becomes a parse failure and a thrown enrolment.
    max_tokens: 2048,
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
  return threadFollowUps(draft)
}

/**
 * Thread every follow-up as a reply so the whole sequence lands in ONE Gmail thread.
 * Shared by both generators — the memory path previously skipped threading entirely,
 * so its follow-ups arrived as disconnected new threads (found 15 Aug building R38).
 */
function threadFollowUps(draft: SequenceDraft): SequenceDraft {
  const baseSubject = draft.step1.subject
  for (const key of ['step2', 'step3', 'step4', 'step5', 'step6', 'step7'] as const) {
    const s = draft[key]
    if (s && (s.subject || '').trim() && !s.subject.toLowerCase().startsWith('re:')) {
      s.subject = `Re: ${baseSubject}`
    }
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
  /** ⚑ 8 Sep — how long this enrolment's OWN sequence is. See `sequenceTotalFor`. */
  steps?: unknown
  total_steps?: number | null
}

/**
 * How many steps this enrolment actually has.
 *
 * 🛑 THE HARDCODED 3 THIS REPLACES WAS A REAL DEFECT ON A 5-STEP SEQUENCE. `skip_next` at step 2
 * computed `skipped = 3`, hit `if (skipped >= 3)` and marked the enrolment COMPLETED — steps 4
 * and 5 silently never sent, on a prospect who had replied and asked for the next thing. The
 * number came from the legacy three-column era and was never a product decision.
 *
 * ⚠️ AND IT IS NOT REPLACED BY A HARDCODED 5. The enrolment carries its own `steps` array (and
 * `total_steps`, written at enrolment), so the length is read from the work rather than from a
 * constant that will be wrong again the next time the product changes shape. The final `3` is
 * the LEGACY fallback only — an enrolment written before either column existed genuinely had
 * three steps, and that is what `enrollmentStep` still returns for it.
 */
export function sequenceTotalFor(e: { steps?: unknown; total_steps?: number | null }): number {
  if (Array.isArray(e.steps) && e.steps.length > 0) return e.steps.length
  if (typeof e.total_steps === 'number' && e.total_steps > 0) return e.total_steps
  return 3
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
    await updateEnrollmentState(enrollment.id, { reply_branch_handled_at: now },
      'a reply was handled but not stamped — the branch may be applied to the same reply again')
    return 'send'
  }

  if (onReply === 'stop') {
    await updateEnrollmentState(enrollment.id,
      { status: 'replied', next_send_at: null, reply_branch_handled_at: now },
      'a prospect REPLIED and the sequence was not stopped — they stay due and may receive the next step after replying')
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
  const total = sequenceTotalFor(enrollment)
  if (skipped >= total) {
    // Nothing follows the skipped step — the sequence is finished.
    await updateEnrollmentState(enrollment.id, {
      status: 'completed', completed_at: now, next_send_at: null,
      current_step: skipped, reply_branch_handled_at: now,
    }, 'the reply branch was handled but not recorded — the sequence stays due and may re-process this reply')
    // ONE WALLET: no held $3 — the $4 was final at approve; nothing to release.
  } else {
    // ⚑ 8 Sep — the WAIT comes from this enrolment's own step where it has one. The legacy
    // map is the fallback for a legacy enrolment, not the rule for a configured sequence.
    const ownWait = Array.isArray(enrollment.steps)
      ? (enrollment.steps as Array<{ wait_days?: number }>)[skipped - 1]?.wait_days
      : undefined
    const waitDays = typeof ownWait === 'number' && ownWait > 0 ? ownWait : (STEP_FOLLOWUP_DELAYS[skipped] ?? 4)
    const nextSendAt = new Date(Date.now() + waitDays * 86400000).toISOString()
    await updateEnrollmentState(enrollment.id, {
      status: 'in_progress', current_step: skipped,
      next_send_at: nextSendAt, reply_branch_handled_at: now,
    }, 'the skipped step was not recorded — the prospect may receive the step we deliberately skipped')
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

/**
 * 🔐 THE SECOND SEND AUTHORITY — a founder-pressed run, and NOTHING else.
 *
 * ⚑ 2 Sep. `AUTO_OUTREACH_ENABLED` is one global switch that arms every automatic path at
 * once: the 2-hourly campaign cron across EVERY client, day-1 batches, co-pilot releases and
 * (with its own second key) the Instantly push. For a launch canary the founder needs the
 * opposite of that — one client, one run, pressed by hand, with the global switch still off.
 *
 * ⚠️ WHY THIS IS A SEPARATE FUNCTION AND NOT A BOOLEAN ON `sendSequenceEmail`. An
 * `opts.operatorAuthorised` flag would be a generic bypass sitting on a function five other
 * call sites already use — and the next caller to want "just this once" would reach for it.
 * The authority instead travels through a DIFFERENT NAMED ENTRY POINT
 * (`sendSequenceEmailOperatorRun`), so gaining it requires deliberately calling a function
 * whose name says what it does. A source guard pins its production callers.
 *
 * ⚠️ AND IT IS DOUBLE-KEYED. The entry point alone is not enough: the env must ALSO be
 * `'true'`. So a stray caller of the operator function, on a deployment where the founder
 * has not deliberately armed it, still sends nothing.
 *
 * Absent, empty, `'TRUE'`, `'1'` or anything but the exact string is OFF — same shape as
 * `outreachEnabled()`, deliberately, so the two switches cannot be reasoned about differently.
 */
export function operatorSendEnabled(): boolean {
  return process.env.FIGSY_OPERATOR_SEND_ENABLED === 'true'
}

/** Which authority is asking? `automatic` is every existing caller; nothing else opts in. */
type SendAuthority = 'automatic' | 'operator_run'

type CoreOpts = {
  totalSteps?: number
  waitDaysNext?: number
  isPreview?: boolean
  skipReview?: boolean
  /** #610 — the mailbox the RUN chose. Absent = resolve the client's top-ranked box, as before. */
  inbox?: InboxRow
  authority: SendAuthority
}

/**
 * THE ONE SEND IMPLEMENTATION. Private on purpose: `authority` is not a knob any caller may
 * set, it is decided by WHICH exported function you called. There is no second copy of this
 * logic anywhere — the operator run and the cron execute these exact gates.
 */
async function sendSequenceEmailCore(
  enrollmentId: string,
  lead: Lead,
  step: number,
  subject: string,
  body: string,
  campaignId: string,
  opts: CoreOpts,
): Promise<SendOutcome> {
  if (!lead.email) throw new Error('Lead has no email')

  // #344 (AR-07) — KILL-SWITCH. If auto-outreach is off, DEFER (no send, no state
  // change → the enrollment stays due and resumes when the switch is turned back on).
  // The founder's test-email path (isPreview) is a deliberate 1:1 send to their own
  // inbox, so it bypasses the switch.
  //
  // ⚑ 2 Sep — AND THE OPERATOR RUN IS THE SECOND, NARROWER AUTHORITY. It is not a bypass of
  // this gate so much as a different key to the same door: it requires the caller to have
  // come through `sendSequenceEmailOperatorRun` AND `FIGSY_OPERATOR_SEND_ENABLED === 'true'`.
  // Either one alone sends nothing. `outreachEnabled()` itself is unchanged, so every
  // automatic path behaves exactly as it did.
  const operatorAuthorised = opts.authority === 'operator_run' && operatorSendEnabled()
  if (!opts?.isPreview && !operatorAuthorised && !outreachEnabled()) {
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
        // #349 — was `.then(() => {}, () => {})`. A demo enrollment that stays DUE is
        // re-picked by every send run forever: the suppression still fires each time so
        // nothing is ever emailed, but the cron burns the work indefinitely and the demo
        // account reads as perpetually "sending". Alerting is off — a demo is not a paying
        // client and this cannot reach a real prospect — but it is no longer discarded.
        await updateEnrollmentState(enrollmentId, { next_send_at: null },
          'a DEMO enrollment was suppressed but not stood down — it stays due and will be re-processed on every send run',
          { alert: false })
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
  // HC-1 — probe with the NORMALISED address. `leads.email` is stored raw, the blocklist is
  // stored normalised, so an exact compare between the two is a coin toss on letter case.
  const { data: blocked } = await db.from('opt_out_blocklist')
    .select('id').eq('email', normalizeRevealEmail(lead.email)).is('opted_back_in_at', null).maybeSingle()
  if (blocked) {
    console.warn(`[figsy] sendSequenceEmail: ${lead.email} is on the opt-out blocklist — step ${step} NOT sent; marking enrollment opted_out.`)
    await updateEnrollmentState(enrollmentId, { status: 'opted_out' },
      'a prospect on the OPT-OUT blocklist was not marked opted_out — this step was suppressed, but the enrollment stays live and will keep trying')
    // ONE WALLET: opt-out moves no money — the $4 was final at approve.
    return 'suppressed'
  }

  // #617 PECR SAFETY NET — the same chokepoint, for the same reason the opt-out check is here.
  //
  // The enrol gate refuses a UK individual subscriber before we ever charge. This catches the
  // rows that gate could never see: enrollments created BEFORE #617 shipped, and any lead that
  // reaches an enrollment by a path the gate does not sit on. One check here covers every
  // step-1/2/3 send, exactly as the opt-out net above does.
  //
  // NOT `deferred` — refusing this lead is permanent, not a pause. `next_send_at` is NULLed so
  // the cron stops re-picking an enrollment that can never legally send; leaving it due would
  // re-run this suppression on every send cycle forever (the #349/#453 lesson).
  //
  // ONE WALLET: no money moves — the $4 was final at approve, exactly as on the opt-out branch.
  if (!opts?.isPreview) {
    const pecr = pecrVerdict({ country: lead.country, companyName: lead.company })
    if (!pecr.allow) {
      console.warn(`[figsy] #617 sendSequenceEmail: ${lead.email} is a UK individual-subscriber risk — step ${step} NOT sent. ${pecr.reason}`)
      if (enrollmentId) {
        await updateEnrollmentState(enrollmentId, { next_send_at: null },
          'a UK individual-subscriber risk (#617 PECR) was suppressed but not stood down — it stays due and will be re-processed on every send run')
      }
      return 'suppressed'
    }

    // LAUNCH COUNTRY HOLD — SAFETY NET, for the rows the enrol gates could never see.
    //
    // The enrol gates refuse a held country before the client is charged. This catches what
    // they cannot: enrollments created BEFORE this shipped, already sitting live and due, and
    // any lead reaching a send by a path those gates do not sit on. One check here covers every
    // step-1/2/3 send, exactly as the opt-out and PECR nets above do.
    //
    // ⚠️ `next_send_at: null`, NOT a deferral — but for the OPPOSITE reason to the PECR net
    // directly above. There, the refusal is permanent. Here it is temporary by design: this
    // lead sends the day the founder opens its country. Standing it down is still correct —
    // leaving it due would re-run this hold on every send cycle forever (the #349/#453 lesson)
    // — and re-arming it is a one-line update per country the day he opens one. A hold parked
    // cleanly is recoverable; a cron re-checking it every ten minutes until then is not.
    //
    // ONE WALLET: no money moves. The $4 was final at approve, exactly as on the branches above.
    if (!isLaunchSendCountry(lead.country)) {
      console.warn(`[figsy] sendSequenceEmail: ${lead.email} — ${launchHoldReason(lead.country)}; step ${step} NOT sent`)
      if (enrollmentId) {
        await updateEnrollmentState(enrollmentId, { next_send_at: null },
          'a launch-country hold was suppressed but not stood down — it stays due and will be re-processed on every send run')
      }
      return 'suppressed'
    }
  }

  // ══ THE PROGRAMME OUTREACH GATE (BUILD-003 PR2) ═══════════════════════════════════════
  //
  // ⚠️ HERE BECAUSE THIS FUNCTION IS THE SINGLE CHOKEPOINT, as the demo backstop above already
  // says in its own words: every real sequence-step send funnels through it and the three cron
  // paths call it directly. So day-1 outreach, `/figsy/send-due-all` every two hours, and
  // every step-1/2/3 send are all covered by this one check. Gating the callers instead would
  // leave whichever one nobody remembered.
  //
  // ⚠️ THIS IS THE **OUTREACH** ACTION, WHICH IS STRICTLY HARDER THAN SOURCING. It requires
  // programme approval AND the second payment AND status LIVE — because Payment 1 authorises
  // preparation only, and an email to a real prospect is not preparation. The sourcing gate in
  // `runIcpJob` deliberately does not require any of that.
  //
  // ⚠️ A REFUSAL **DEFERS**, IT DOES NOT CONSUME THE STEP. `deferred` leaves the enrollment due
  // with its state untouched, exactly like the kill-switch above — so a paused programme that
  // resumes picks up where it stopped, and a client loses no sequence step to a pause. Marking
  // it `suppressed` would stand the enrollment down permanently, which is a different and
  // irreversible product decision.
  //
  // ⛓️ ORDERED **BELOW** EVERY PERMANENT SUPPRESSION GATE, AND THAT ORDER IS A DECISION.
  // The first cut sat above them, and it was wrong: a person on the do-not-contact list or the
  // opt-out blocklist inside a PAUSED programme would have been DEFERRED rather than SUPPRESSED
  // — so their enrollment stayed due and every cron run re-picked it forever, and the day the
  // programme resumed they would be first in the queue. Suppression is permanent and is about
  // the PERSON; programme authority is temporary and about the WORK. The permanent answer must
  // be recorded first. Found by `launch-hold.figsy.test.ts` and `review-gate-fail-closed.test.ts`
  // going red — the existing suites caught the precedence, not me.
  //
  // ⚠️ THE FOUNDER'S OWN PREVIEW IS EXEMPT — a 1:1 test to their own inbox is not programme
  // delivery to a prospect, the same exemption the kill-switch and demo backstop already make.
  if (!opts?.isPreview && enrollmentId) {
    const { checkEnrollmentAuthority } = await import('./programme-authority')
    // ⚑ 8 Sep — THE RECIPIENT'S COUNTRY TRAVELS WITH THE QUESTION. The send window is judged
    // in THEIR local time; House sells into the UK and the US, five to eight hours apart, so a
    // single UTC window would put half the audience in the middle of the night. Where the
    // country is unknown the guard falls back to the programme's default zone and says so.
    const verdict = await checkEnrollmentAuthority(enrollmentId, 'OUTREACH', lead.client_id ?? null,
      { recipientCountry: (lead as { country?: string | null }).country ?? null })
    if (!verdict.allowed) {
      console.warn(`[figsy] sendSequenceEmail: step ${step} to ${lead.email} DEFERRED — programme authority refused (${verdict.reason}). ${verdict.message}`)
      return 'deferred'
    }
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
    // C7 — FAIL CLOSED WHEN THE REVIEW REQUIREMENT CANNOT BE ESTABLISHED.
    //
    // This read used to discard its error. A rejected query returns `data: null`, which made
    // `reviewRequired` false, which fell straight through to the send — so a database hiccup
    // SILENTLY DISABLED the human-review gate and a co-pilot client's step went out unreviewed.
    // Nothing logged it, because from the code's point of view nothing had gone wrong.
    //
    // ⚠️ THE DISTINCTION THAT MATTERS, and it is easy to get backwards: `maybeSingle()` returns
    // `{ data: null, error: null }` when the campaign row simply DOES NOT EXIST. That is not a
    // failure — it is a legitimate "no settings, therefore no review", and it must keep sending.
    // Only a real `error` fails closed. Failing closed on `!camp` instead would defer every send
    // whose campaign row is missing, forever.
    const { data: camp, error: campErr } = await db.from('figsy_campaigns')
      .select('settings').eq('id', campaignId).maybeSingle()
    if (campErr) {
      // Same shape as the queue-insert failure twenty lines below: do NOT send, do NOT pause
      // (leave the enrollment due so a later cron retries), and say so loudly.
      console.error(
        `[figsy] sendSequenceEmail: could not read campaign settings for ${campaignId} (enrollment ${enrollmentId} step ${step}) — ` +
        'cannot establish whether human review is required, so NOT sending (fail-closed)',
        campErr.message,
      )
      return 'deferred'
    }
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
      await updateEnrollmentState(enrollmentId, { next_send_at: null },
        'a co-pilot step was queued for review but the enrollment was not paused — it stays due, so the next cron may queue it again or send it unreviewed')
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

  // #311 was a RESEND_API_KEY guard here: if Resend wasn't configured, DEFER rather than
  // record a phantom "sent" row. **#547 retires it for this path** — cold outreach no longer
  // goes through Resend at all, it goes through the client's own mailbox over SMTP. Keeping
  // the guard would have blocked every send on a key this path stopped using.
  //
  // The concern behind #311 is unchanged and is now enforced one step lower: the inbox
  // resolve below refuses loudly, rolls the step back, and alerts, so a missing mailbox or
  // an unreadable password can never present as a send. Resend remains the transport for
  // transactional mail (that guard still stands at its own call site).

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

  // ── #547: WHOSE MAILBOX DOES THIS LEAVE FROM? ────────────────────────────────
  // Until now this function sent from `FROM` — one module-level constant, shared by every
  // client on the platform. RULEBOOK 12.2: you cannot share a sender across clients; one
  // client's spam complaints poison the rest. Resolve the client's OWN mailbox, and if
  // there isn't one, REFUSE — never fall back to the shared address, because that failure
  // looks like success and the damage lands on everyone else weeks later.
  //
  // Placed AFTER the atomic claim so the claim is rolled back on refusal exactly like a
  // send failure, and BEFORE the sent-row insert so a refusal leaves no phantom row.
  const { resolveSendingInbox, refusalLabel } = await import('./sending-inbox')
  const inboxFor = lead.client_id ?? null
  const resolved = inboxFor
    ? await resolveSendingInbox(inboxFor)
    : { ok: false as const, reason: 'no_inbox' as const, detail: 'This lead has no client on it, so there is no mailbox to send from.' }
  if (!resolved.ok) {
    console.error(`[figsy] sendSequenceEmail: NOT sending step ${step} to ${lead.email} — ${refusalLabel(resolved.reason)}. ${resolved.detail}`)
    if (!opts?.isPreview) {
      // Same rollback as a failed send: put the step back so it stays DUE and retries once
      // an operator assigns the mailbox. A missing inbox is a fixable state, not a dead lead.
      await db.from('figsy_enrollments')
        .update({ current_step: step - 1, next_send_at: new Date().toISOString() })
        .eq('id', enrollmentId)
    }
    void sendFounderAlert('sends_stalled', `Outreach held — ${refusalLabel(resolved.reason)}`, [
      `Client: ${inboxFor ?? '(none on lead)'}`,
      `Lead: ${lead.email}`,
      `Enrollment: ${enrollmentId} (step ${step})`,
      resolved.detail,
      `Nothing was sent and nothing fell back to the shared address. The step stays due and retries once this is fixed.`,
    ])
    return 'deferred'
  }
  // ⚑ 2 Sep — THE RUN MAY NAME THE MAILBOX. `resolveSendingInbox` above still runs and still
  // owns the refusal, the rollback and the founder alert — this only decides WHICH box
  // carries the message once sending is allowed at all.
  //
  // 🛑 WHY IT HAD TO BECOME OVERRIDABLE. `pickSendingInbox` ranks active-before-assigned and
  // branded-before-pooled and returns ONE row, and this line is reached ONCE PER EMAIL — so
  // on a two-box client every message resolved to the same top-ranked box and the client's
  // second mailbox never sent at all. Rotation existed (`nextFromRotation`) but only
  // `sendDay1OutreachBatch` ever called it. The run now decides and passes it in.
  const sendingInbox = opts.inbox ?? resolved.inbox

  // Insert the DB record first so we have the emailId for the tracking pixel
  const { data: emailRecord } = await db.from('figsy_sent_emails').insert({
    enrollment_id: enrollmentId,
    campaign_id:   campaignId,
    // #637 — WHOSE SEND IS THIS. Five surfaces read `figsy_sent_emails.client_id` — the
    // CLIENT'S OWN dashboard sent-counter and 7-day sparkline, the admin clients page and
    // CMO memory — and nothing has ever written it. Every one of them would have read 0
    // forever once sending started, which to a paying client reads as "KIND does nothing".
    // Taken from the lead we already hold; no extra lookup, and it is the same value
    // `inboxFor` above already resolved the sending mailbox from.
    client_id:     lead.client_id ?? null,
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
    // #547/#548 — sent through the CLIENT'S OWN mailbox over SMTP (option B, founder-locked
    // 26 Jul), not from our shared Resend domain. `sendAs` returns the same verdict shape as
    // `interpretSend` and never throws, so the rollback below is unchanged.
    let checked: ReturnType<typeof interpretSend>
    try {
      const { sendAs } = await import('./mailer')
      checked = await sendAs(sendingInbox, {
        to:       lead.email,
        replyTo:  REPLY_TO,
        subject,
        headers:  unsubscribeHeaders(lead.email),
        // CAN-SPAM §7704(a)(5)(A)(iii) — the postal address rides on BOTH parts. `text` is what
        // a plain-text client renders, so a footer in the HTML alone would be missing for
        // exactly the readers most likely to be running a strict client.
        text:     coldEmailText(body),
        html:     coldEmailHtml(body, emailId),
      })
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
        `Mailbox: ${sendingInbox.email} (${sendingInbox.kind}/${sendingInbox.status})`,
        `Mail server error: ${checked.error instanceof Error ? checked.error.message : JSON.stringify(checked.error)}`,
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

  // THE MOST DANGEROUS WRITE IN THIS FILE. The email has ALREADY LEFT at this point; this
  // row is the only record that it did. If it fails and we swallow it, the enrollment keeps
  // its old `current_step` and its old due `next_send_at`, so the very next cron run sends
  // the SAME email to the SAME real prospect again — from the client's own mailbox, against
  // their own domain reputation.
  await updateEnrollmentState(enrollmentId, {
    current_step: step,
    status:       isLast ? 'completed' : 'in_progress',
    next_send_at: nextSendAt,
    ...(isLast ? { completed_at: new Date().toISOString() } : {}),
  }, `step ${step} WAS SENT but the enrollment was not advanced — the same email will be sent to this prospect again on the next cron run`)
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
      // #383 — THE FALLBACK NO LONGER INCREMENTS; IT RECOMPUTES.
      //
      // It used to read `emails_sent` and write back `+1`. That is a read-then-write race:
      // two sends running concurrently both read N and both write N+1, so two emails move
      // the counter by one. The RPC above was written on 10 Jul to make this atomic — but it
      // was never added to PENDING_MIGRATIONS, so it has never existed in production and
      // THIS path has run for every send since. The counter has been undercounting silently.
      //
      // Counting the send log is race-free by construction: `figsy_sent_emails` already has
      // one row per send (inserted above, gated on emailId), so the count IS the truth and
      // recomputing it is idempotent — concurrent writers converge instead of colliding. It
      // also structurally enforces this function's own stated invariant, that the counter
      // "can never exceed the send log", rather than hoping arithmetic keeps them in step.
      const { count, error: countErr } = await db.from('figsy_sent_emails')
        .select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId)

      // #349 — CHECKED, NOT SWALLOWED. The old code ignored the update's error entirely, so
      // a failed counter write was indistinguishable from a successful one. A wrong number on
      // a client's dashboard must be loud: we would rather leave the counter stale and say so
      // than write a figure nobody can trust.
      if (countErr || count === null) {
        console.error('[figsy] SEND COUNTER NOT UPDATED — the email WAS sent, the counter was not:',
          campaignId, countErr?.message ?? 'no count returned')
      } else {
        const { error: setErr } = await db.from('figsy_campaigns')
          .update({ emails_sent: count }).eq('id', campaignId)
        if (setErr) {
          console.error('[figsy] SEND COUNTER NOT UPDATED — the email WAS sent, the counter was not:',
            campaignId, setErr.message)
        }
      }
    }
  }

  return 'sent'
}

/**
 * SEND ONE SEQUENCE STEP — the ordinary path, under ordinary authority.
 *
 * Byte-for-byte the behaviour every existing caller already has: it needs
 * `AUTO_OUTREACH_ENABLED`, and there is no option it can pass to obtain any other authority.
 * `authority: 'automatic'` is fixed here and is not reachable from the argument list.
 */
export async function sendSequenceEmail(
  enrollmentId: string,
  lead: Lead,
  step: number,
  subject: string,
  body: string,
  campaignId: string,
  opts?: { totalSteps?: number; waitDaysNext?: number; isPreview?: boolean; skipReview?: boolean },
): Promise<SendOutcome> {
  return sendSequenceEmailCore(enrollmentId, lead, step, subject, body, campaignId, {
    ...opts, authority: 'automatic',
  })
}

/**
 * 🔐 SEND ONE SEQUENCE STEP UNDER AN EXPLICIT, FOUNDER-PRESSED OPERATOR RUN.
 *
 * Identical logic — the SAME private core, so suppression, PECR, country, demo backstop,
 * programme authority, the caps, the review queue, the atomic claim and the rollback are all
 * exactly the ones the cron uses. **The only difference is which authority opens the
 * kill-switch gate**, and that requires `FIGSY_OPERATOR_SEND_ENABLED === 'true'` as well as
 * arriving through this function.
 *
 * ⚠️ ITS ONLY PRODUCTION CALLER IS `lib/send-due.ts`, and a source guard in
 * `send-due-run-once.route.test.ts` holds that. If you are adding a second caller, you are
 * widening a launch-safety boundary and the guard is there to make you say so out loud.
 */
export async function sendSequenceEmailOperatorRun(
  enrollmentId: string,
  lead: Lead,
  step: number,
  subject: string,
  body: string,
  campaignId: string,
  opts?: { totalSteps?: number; waitDaysNext?: number; skipReview?: boolean; inbox?: InboxRow },
): Promise<SendOutcome> {
  return sendSequenceEmailCore(enrollmentId, lead, step, subject, body, campaignId, {
    ...opts, authority: 'operator_run',
  })
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
    // ⚠️ TWO REFERENCE FORMATS, ONE QUESTION: "has this lead already been paid for?"
    //   • a WALLET approval writes  reference='lead:<id>'  type='wallet_charge'  (−$4)
    //   • a PACK approval writes    reference='pack_<id>'  type='usage'          ($0)
    // The original guard only looked for the wallet form, so a lead approved FREE inside
    // the client's included 100 read as "never paid" — and any enrol path that doesn't
    // pass `prepaid` (icps auto-enrol, the two /figsy enrol loops, the intent sweep, two
    // internal crons: six call sites) would charge $4 for a lead we had promised free.
    // Latent only because AUTO_OUTREACH_ENABLED is off; live the moment it flips.
    const { data: existing } = await db.from('credit_transactions')
      .select('id').eq('client_id', clientId)
      .in('reference', [`lead:${lead.id}`, `pack_${lead.id}`])
      .in('type', ['wallet_charge', 'usage'])
      .limit(1).maybeSingle()
    if (existing) {
      console.log(`[figsy] chargeFigsyEnroll: lead ${lead.id} already paid for — skipping (client ${clientId})`)
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
  // THIS ROW IS LOAD-BEARING — the same row `approve-lead.ts` alerts on, written by the
  // other door into the same money.
  //
  // The dedup guard 30 lines above asks "has this lead already been paid for?" by looking
  // for exactly this row. It was written `.then(() => {}, () => {})`, so if the insert
  // failed the $4 had ALREADY left the wallet (the RPC above is the atomic decrement) and
  // nothing recorded it — the lead then reads as UNPAID to every one of the six enrol call
  // sites, and the next one charges the client a second time. Silently.
  //
  // approve-lead.ts:258 was fixed for precisely this in the wallet-approve path; this is the
  // same failure through the enrol path, and it stayed swallowed. Now it alerts.
  const { error: ledgerErr } = await db.from('credit_transactions').insert({
    client_id: clientId,
    amount: -4,
    type: 'wallet_charge',
    plan: 'work_model',
    reference: lead.id ? `lead:${lead.id}` : null,
    note: `Approved lead worked ($4): ${leadName}${lead.company ? ` at ${lead.company}` : ''}`.trim(),
    created_at: new Date().toISOString(),
  })
  // 23505 is the UNIQUE index on credit_transactions.reference doing its job: a row for
  // `lead:<id>` already exists, so this lead is already recorded as paid. That is the dedup
  // working, not a failure — alerting on it would page the founder on every legitimate retry.
  if (ledgerErr && ledgerErr.code !== '23505') {
    console.error('[figsy] LEDGER ROW FAILED after charging $4 — double-charge risk', clientId, lead.id ?? '(no lead id)', ledgerErr.message)
    void sendFounderAlert('charge_failed', 'Charged $4 but the ledger row failed', [
      `Client ${clientId}, lead ${lead.id ?? '(no id)'} — ${leadName}${lead.company ? ` at ${lead.company}` : ''}.`,
      'The money left the wallet; the record of it did not.',
      `Reason: ${ledgerErr.message}`,
      'This lead now reads as UNPAID to the enrol guard, so it could be charged a second time. Check credit_transactions_type_check allows wallet_charge (migration 20260726_wallet_tx_types).',
    ]).catch(() => {})
  }
  return 'charged'
}

// #349 — EVERY ENROLLMENT STATE WRITE IS CHECKED, because supabase-js RETURNS its error
// rather than throwing it, so a bare `await db.from(...).update(...)` discards the failure
// and the code carries on as if the row moved.
//
// In the ONE WALLET model every enrolled lead has already been paid for ($4 at approve), so
// there is no such thing as a cosmetic enrollment write here — each one is the record of
// what a paying client is owed. The failure modes are concrete, not theoretical:
//
//   • the post-send advance fails  → the step stays due and the SAME email goes to the same
//                                    real prospect again on the next cron run
//   • the opt-out write fails      → we keep emailing someone who asked us to stop
//   • the co-pilot pause fails     → an unreviewed step can go out
//   • a completion fails           → the enrollment is perpetually due and re-processed
//
// Returns true when the row actually moved, so callers that report success to a client can
// stop reporting it when it did not.
export async function updateEnrollmentState(
  enrollmentId: string | number,
  patch: Record<string, unknown>,
  consequence: string,
  opts?: { alert?: boolean },
): Promise<boolean> {
  const { error } = await db.from('figsy_enrollments').update(patch).eq('id', enrollmentId)
  if (!error) return true
  console.error(`[figsy] ENROLLMENT WRITE FAILED (${enrollmentId}) — ${consequence}`, error.message, patch)
  if (opts?.alert !== false) {
    void sendFounderAlert('sends_stalled', 'An enrollment state write failed on a paid lead', [
      `Enrollment ${enrollmentId}.`,
      `Consequence: ${consequence}`,
      `Reason: ${error.message}`,
      `Attempted: ${JSON.stringify(patch)}`,
      'This lead has already been paid for, so the client is owed the outcome this write records.',
    ]).catch(() => {})
  }
  return false
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
    // #349 — this delete swallowed its error. It frees the `lead:{id}` reference so a retry
    // can charge again; if it fails silently the reference stays taken and the legitimate
    // retry is blocked by the unique index — the client cannot be charged, so the lead is
    // never worked, and nothing says why.
    const { error: freeErr } = await db.from('credit_transactions').delete()
      .eq('client_id', clientId).eq('reference', `lead:${leadId}`).eq('type', 'wallet_charge')
    if (freeErr) {
      console.error('[figsy] charge reference NOT freed — a retry cannot re-charge', clientId, leadId, freeErr.message)
      void sendFounderAlert('api_down', 'Refund left the charge reference locked', [
        `Client ${clientId}, lead ${leadId}: the $4 was returned but the ledger row \`lead:${leadId}\` could not be deleted (${freeErr.message}).`,
        'The unique index still holds that reference, so a retry cannot charge for this lead and it will never be worked.',
        'Fix: delete that credit_transactions row by hand.',
      ])
    }
    // NOTE: deliberately does NOT touch a `pack_` row. A pack approval took no money, so
    // there is nothing to reverse — and deleting the pack row would silently hand the
    // client back a slot out of their included 100 that they had already used.
  }
  // #349 — the reverse row swallowed its error, and this is the one that makes the LEDGER
  // DISAGREE WITH THE WALLET. By this point the $4 has already been put back by the RPC
  // above; if this row never lands, the money moved and nothing records it, so the ledger
  // under-reports the client's balance forever. That is precisely the drift #349 exists for.
  const { error: reverseErr } = await db.from('credit_transactions').insert({
    client_id: clientId, amount: 4, type: 'wallet_reverse', plan: 'work_model',
    reference: null,
    note: leadId ? `Enrollment failed after charge — $4 returned (lead ${leadId})` : 'Enrollment failed after charge — $4 returned',
    created_at: new Date().toISOString(),
  })
  if (reverseErr) {
    console.error('[figsy] REFUND NOT LEDGERED — wallet and ledger now disagree by $4', clientId, leadId, reverseErr.message)
    void sendFounderAlert('api_down', 'Refund happened but was not recorded', [
      `Client ${clientId}${leadId ? `, lead ${leadId}` : ''}: $4 was returned to the wallet, but the wallet_reverse ledger row failed to insert (${reverseErr.message}).`,
      'The money moved and nothing records it — the ledger now under-reports this client by $4 and will not self-correct.',
      'Fix: add the wallet_reverse row by hand so the ledger reconciles.',
    ])
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
    let repliesTotal = 0, repliesInterested = 0, optedOut = 0
    for (const r of (repliesRes.data ?? []) as { classification: string | null; meeting_booked_at: string | null }[]) {
      repliesTotal++
      if (r.classification === 'hot' || r.classification === 'interested') repliesInterested++
      if (r.classification === 'opt_out' || r.classification === 'unsubscribe') optedOut++
      // ⛓️ `if (r.meeting_booked_at) meetings++` USED TO BE HERE (BUILD-003 item 2).
      // meeting_booked_at is RETAINED AS HISTORY and is still selected above for the reply
      // counts, but it is no longer a source of meeting truth: it cannot tell HELD from
      // NO_SHOW, cannot exclude a duplicate or a spam booking, and counts a reschedule twice.
      // The number now comes from public.meetings, through the one function that knows the
      // counting rules.
    }
    const cur = (campRes.data ?? {}) as Record<string, number | null>
    const mx = (a: number, b: number | null | undefined) => Math.max(a, typeof b === 'number' ? b : 0)

    // ⚠️ NOT RATCHETED, AND THAT IS THE FIX. Every other counter here takes max(computed,
    // current) so a partial recount cannot lose data. Applying that to meetings would make
    // the number one-way: excluding a spam or duplicate booking could never bring it DOWN,
    // so the exclusion feature would be silently inert. `meetings_booked` is a derived cache
    // of public.meetings, so it takes the derived value exactly — up or down.
    // A read failure returns null and leaves the cached value ALONE rather than writing 0:
    // "we could not read the meetings table" must never render as "there were no meetings".
    const derivedMeetings = await campaignMeetingCount(campaignId)

    const next: CampaignCounters = {
      emails_sent:        mx(sentRes.count ?? 0,   cur.emails_sent),
      replies_total:      mx(repliesTotal,         cur.replies_total),
      replies_interested: mx(repliesInterested,    cur.replies_interested),
      opted_out:          mx(optedOut,             cur.opted_out),
      meetings_booked:    derivedMeetings ?? (typeof cur.meetings_booked === 'number' ? cur.meetings_booked : 0),
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

  // ══ THE PROGRAMME OUTREACH GATE — ADDED 7 Sep, AND IT WAS SIMPLY ABSENT ═══════════════
  //
  // 🛑 FOUND IN ADVERSARIAL REVIEW, NOT BY A TEST. Every other outbound path in this product
  // asks programme authority — the sequence sender, the Smartlead push, the Instantly push,
  // the LinkedIn dispatch, campaign activation. This one asked NOTHING: it checked the demo
  // flag and the kill-switch and then cold-emailed real prospects. So a programme client whose
  // programme was paused, unapproved, unpaid at P2, or not LIVE would still be day-1 mailed the
  // moment `AUTO_OUTREACH_ENABLED` was on and their ICP run inserted leads — and after 7 Sep it
  // would ALSO have escaped the approved-preparation comparison, because there was no gate for
  // that comparison to live in.
  //
  // ⚠️ LEGACY IS UNAFFECTED. `checkProgrammeAuthority` answers `mode: 'legacy'` for a client
  // with no programme, which is the entire live book — their day-1 outreach behaves exactly as
  // it does today. What changes is that PROGRAMME work is now governed on this path too.
  //
  // ⚠️ AND IT FAILS CLOSED. An unreadable programme state refuses the batch; the leads stay
  // `scored` and are picked up on a later run, which is the same recoverable shape the mailbox
  // refusal below already uses.
  {
    const { checkProgrammeAuthority } = await import('./programme-authority')
    const verdict = await checkProgrammeAuthority(clientId, 'OUTREACH')
    if (!verdict.allowed) {
      console.warn(`[figsy] sendDay1OutreachBatch: ${leadIds.length} lead(s) NOT day-1 emailed for client ${clientId} — programme authority refused (${verdict.reason}). ${verdict.message}`)
      return
    }
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

  // #547 — resolve the client's OWN mailbox ONCE for the whole batch (it cannot change
  // mid-loop, and a read per lead would be a query per prospect for no new information).
  // No mailbox = the batch does not run. Every lead stays 'scored' and is picked up on a
  // later run once an operator assigns one — nothing falls back to our shared address.
  const { resolveSendingInbox, refusalLabel, sendablePool, nextFromRotation } = await import('./sending-inbox')
  const batchInbox = await resolveSendingInbox(clientId)
  if (!batchInbox.ok) {
    console.error(`[day1-outreach] NOT sending for client ${clientId} — ${refusalLabel(batchInbox.reason)}. ${batchInbox.detail}`)
    void sendFounderAlert('sends_stalled', `Day-1 outreach held — ${refusalLabel(batchInbox.reason)}`, [
      `Client: ${clientId} (${clientCompanyName})`,
      `Leads waiting: ${leadIds.length}`,
      batchInbox.detail,
      `Nothing was sent, no rows were written, and nothing fell back to the shared address. The leads stay scored and retry once this is fixed.`,
    ])
    return
  }
  // ── #610 ROTATION — spread the batch across EVERY sendable box, not just the best one ──
  //
  // Founder-ruled 4 Aug: *"inbox x 2 yes for now but volume is key."* One box at a 30/day cap
  // is 30/day however many boxes the client owns; two is 60. `resolveSendingInbox` above is
  // kept as the gate (it produces the refusal message and the alert, already tested), and the
  // pool below decides WHICH box carries each message once sending is allowed at all.
  //
  // ⚠️ THE COUNTS ARE PER-BATCH AND IN MEMORY, AND THAT IS A LIMIT, NOT A CHOICE.
  // `figsy_sent_emails` has no column naming the mailbox that sent — so "sent today by this
  // box" cannot be read back from the database, and adding it is a migration the frozen schema
  // forbids. Within this run the spread and the per-box caps are exact; two runs in one day
  // could put a box over its own cap, bounded still by the global `coldCapReached()`. #610
  // carries the fix: one column, the day migrations return.
  const poolRows = await (async () => {
    const { data } = await db.from('client_inboxes')
      .select('id, email, kind, status, provider, daily_cap, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name')
      .eq('client_id', clientId).not('status', 'in', '("released","retired")')
    return (data ?? []) as unknown as Parameters<typeof sendablePool>[0]
  })()
  const { secretState } = await import('./inbox-secret')
  const pooled = sendablePool(poolRows, secretState().ok)
  // A pool failure cannot happen here (resolveSendingInbox already said ok, and the pool
  // reuses its verdict) — but falling back to the single box is the honest degradation if it
  // ever does, rather than throwing away a batch that was cleared to send.
  const rotation = pooled.ok && pooled.boxes.length > 0
    ? pooled.boxes.map(b => ({ id: String(b.id), dailyCap: b.daily_cap ?? null, sentThisBatch: 0, row: b }))
    : [{ id: String(batchInbox.inbox.id), dailyCap: batchInbox.inbox.daily_cap ?? null, sentThisBatch: 0, row: batchInbox.inbox }]
  if (rotation.length > 1) {
    console.log(`[day1-outreach] rotating across ${rotation.length} mailboxes for ${clientId}: ${rotation.map(r => r.row.email).join(', ')}`)
  }


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

    // HC-1 — probe with the NORMALISED address (see sendSequenceEmail).
    const { data: blocked } = await db.from('opt_out_blocklist')
      .select('id').eq('email', normalizeRevealEmail(lead.email)).is('opted_back_in_at', null).maybeSingle()
    if (blocked) continue

    // #617 PECR — THE GATE THIS PATH NEVER HAD.
    //
    // Day-1 outreach is the fallback for a client with no active campaign, and it is the FIRST
    // email a prospect ever receives from us. It honoured the kill-switch, the demo lock, the
    // do-not-contact list and the opt-out blocklist — and asked nothing about PECR, while
    // sending through `sendAs` directly rather than the guarded chokepoint every other send
    // funnels through. A UK sole trader landing here was cold-emailed with no lawful basis.
    //
    // SKIPPED, not deferred: a refusal here is permanent, not a pause. There is no enrollment
    // to stand down on this path (day-1 sends carry no campaign and no enrollment), so `continue`
    // is the whole of it — the lead stays 'scored' and simply is never day-1 mailed.
    //
    // Named through `pecrSkipReason` so this gate and the two enrol gates cannot word the same
    // refusal three different ways — which is how one gate's counts stop reconciling with another's.
    const pecr = pecrVerdict({ country: lead.country, companyName: lead.company })
    if (!pecr.allow) {
      console.warn(`[day1-outreach] ${lead.email} NOT day-1 emailed — ${pecrSkipReason(pecr)}`)
      continue
    }

    // LAUNCH COUNTRY HOLD — and on this path it is the ONLY country gate that can fire.
    //
    // Day-1 outreach is the fallback for a client with no active campaign, and it is the FIRST
    // email a prospect ever receives from us — so a lead outside the launch countries reaching
    // here would be our opening move in a market we have not opened. No charge lives on this
    // path (day-1 sends carry no campaign and no enrollment), so `continue` is the whole of it:
    // the lead stays 'scored' and is simply never day-1 mailed. It is picked up normally the
    // day its country opens — nothing here consumes or marks the lead.
    //
    // No demo check needed: the whole batch returns at the top for a demo client (#453).
    if (!isLaunchSendCountry(lead.country)) {
      console.warn(`[day1-outreach] ${lead.email} NOT day-1 emailed — ${launchHoldReason(lead.country)}`)
      continue
    }

    // Which mailbox carries THIS message? Least-used first; null means every box is at its
    // cap, which is a STOP — never a fall-back to a box that is already over its limit.
    const pickedId = nextFromRotation(rotation)
    if (!pickedId) {
      console.warn('[day1-outreach] every mailbox has hit its daily cap — stopping batch early; remaining leads deferred.')
      break
    }
    const slot = rotation.find(r => r.id === pickedId)!
    const sendingInbox = slot.row

    try {
      const draft = await generateDay1Email(lead, clientCompanyName, client?.industry ?? null, senderName, clientKnowledge)

      // #547/#548 — sent through the CLIENT'S OWN mailbox over SMTP, resolved once above.
      // The #311 RESEND_API_KEY guard that stood here is retired for this path: day-1 cold
      // mail no longer touches Resend, so gating it on that key would have blocked sends on
      // a credential this path stopped using. The concern it existed for is enforced by the
      // resolve above, which refuses and alerts rather than writing a phantom row.
      const { sendAs } = await import('./mailer')
      const day1Checked = await sendAs(sendingInbox, {
        to: lead.email,
        replyTo: REPLY_TO,
        subject: draft.subject,
        // Personal 1:1 cold email (Primary, not Promotions) — header-only unsubscribe.
        headers: unsubscribeHeaders(lead.email),
        // CAN-SPAM §7704(a)(5)(A)(iii) — same footer, same constant. This is the FIRST email a
        // prospect ever receives from us, so it is the one that least of all may be missing it.
        text: coldEmailText(draft.body),
        html: coldEmailHtml(draft.body),
      })

      // #338 (AR-01) — a failed send must not leave a phantom "sent" row or flip the
      // lead to 'contacted'. Skip the lead (stays 'scored' → retried next run) + alert.
      if (!day1Checked.ok) {
        console.error(`[day1-outreach] send FAILED for ${lead.email} — no row, lead stays scored`, day1Checked.error)
        void sendFounderAlert('sends_stalled', 'FIGSY day-1 send failed — email did not leave', [
          `Lead: ${lead.email} (${lead.id})`,
          `Mailbox: ${sendingInbox.email} (${sendingInbox.kind}/${sendingInbox.status})`,
          `Mail server error: ${day1Checked.error instanceof Error ? day1Checked.error.message : JSON.stringify(day1Checked.error)}`,
        ])
        continue
      }

      // ⚠️ THE TALLY IS THE ROTATION. Incremented ONLY after a confirmed send — a failed send
      // must not consume a box's quota, and without this line every count stays 0, so
      // `nextFromRotation` returns the same box forever and rotation is a silent no-op that
      // looks implemented. Placed after the `!ok` continue above for exactly that reason.
      slot.sentThisBatch += 1

      await db.from('figsy_sent_emails').insert({
        enrollment_id: null,
        campaign_id:   null,
        // #637 — the day-1 path carries NO campaign, so the backfill (campaign_id →
        // figsy_campaigns.client_id) can never reach these rows. Without this line every
        // day-1 send would stay invisible to the client's own counter permanently, and it is
        // the FIRST email any prospect ever receives.
        client_id:     lead.client_id ?? null,
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
  opts?: SequenceOptions,
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

  // P34 — the client's approved Meeting Brief. Fetched ONCE here and threaded into
  // both branches below, so the short-history path and the memory path cannot end up
  // writing from different understandings of the same client. Never throws; a client
  // with no approved brief yields null and every prompt stays exactly as it is today.
  const { briefContextFor } = await import('./meeting-brief-deliver')
  const briefContext = await briefContextFor(clientId)

  if (!memory || (memory.total_sent_all_time ?? 0) < 20) {
    return generateSequence(lead, senderCompanyName, senderIndustry, campaignIntent, bookingUrl, senderName, clientKnowledge, { briefContext })
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

  // #651 — same plan engine as the non-memory path, so both write the same shape.
  const plan = sequencePlan({
    purpose: opts?.purpose, depth: opts?.depth,
    industry: opts?.industry ?? lead.industry ?? null,
    eventDate: opts?.eventDate ?? null, now: opts?.now,
  })
  const planBlock = [
    `Write a ${plan.depth}-email sequence that applies the lessons from Campaign Intelligence above.`,
    plan.event
      ? `⚠️ EVENT SEQUENCE — the date is fixed. Every email must make sense on the day it lands and the last sends before the event. Never write as though it has already happened.`
      : '',
    '',
    ...plan.template.guidance.map((g, i) => `Step ${i + 1} (Day ${plan.dayOffsets[i]}): ${g}`),
    // ── P31 · THE BOOKING LINK ENTERS ONLY AFTER POSITIVE INTENT ────────────────────────
    //
    // Founder doctrine, 21 Aug: "the calendar/booking link enters only AFTER positive intent".
    // ⚠️ THE OLD LINE SAID "never step 1" — WHICH LEFT STEPS 2-7 FREE TO CARRY IT. That is a
    // calendar link inside a COLD sequence, before the prospect has said one word: exactly the
    // meeting-ask this doctrine replaces with an interest question. Step 1 was protected and
    // the other six were not, and nothing failed if one used it.
    //
    // A cold sequence now carries NO link at any step. The booking URL still reaches the REPLY
    // path untouched (`bookingUrlForLead` → the reply handler), which is where intent has
    // actually been shown — nothing is lost, it just stops arriving uninvited.
    bookingUrl ? `\nDO NOT put a booking or calendar link in ANY step of this sequence. These emails are cold — nobody has replied yet. The link is sent later, only after this person shows interest. A step that asks for a meeting has skipped the reply this sequence exists to earn.` : '',
  ].filter(Boolean).join('\n')

  const prompt = `You are writing cold outreach emails on behalf of ${senderCompanyName}${senderIndustry ? ` (${senderIndustry})` : ''}. You write as a real person — not an AI.

FIGSY Campaign Intelligence (use this to improve your writing):
${memoryContext}
${clientKnowledge ? `
What the sender offers (grounding) — the ONLY source of truth about ${senderCompanyName}'s product, results and proof. Use it to make the solution half specific; never invent a capability, metric, customer, or result for ${senderCompanyName} beyond it:
${clientKnowledge}
` : ''}${briefContext ? `
${briefContext}
This is what the client has CONFIRMED about who they want and what they sell — treat it as the client's own words. It describes intent and fit ONLY: it grants no permission to contact anyone, and no send gate is affected by it.
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

${planBlock}

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
{${Array.from({ length: plan.depth }, (_, i) => `"step${i + 1}":{"subject":"...","body":"..."}`).join(',')}}`

  const selectedModel = MODEL_MAP[modelPreference ?? 'haiku'] ?? MODEL_MAP.haiku

  const message = await anthropic.messages.create({
    model: selectedModel,
    // 5 emails + JSON overhead no longer fit the old 1024 (a truncation = parse
    // failure = silent fallback to the non-memory generator on every call).
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  try {
    return threadFollowUps(JSON.parse(stripJson(raw)) as SequenceDraft)
  } catch {
    console.warn('[figsy] generateSequenceWithMemory JSON parse failed — falling back to standard generateSequence')
    return generateSequence(lead, senderCompanyName, senderIndustry, campaignIntent, bookingUrl, senderName, clientKnowledge, { ...opts, briefContext })
  }
}

// (P2-13 personalised SVG image banner removed 17 Jun — an image in a cold email is a
//  Promotions signal; cold mail is now near-plain. See deliverability.coldEmailHtml.)

// Auto-enroll a single consented lead into the active campaign (S5 — FIGSY auto-start)
/**
 * OPTION A — campaign-ready eligibility (the one rule, used everywhere we enroll).
 *
 * ⚠️ `apollo_consented` IS NOT CONSENT — third of the three homes for this warning, and it
 * sits here because this is the read that decides who gets emailed. The flag means a
 * provider-VERIFIED email, treated as a legitimate-interest contact. **It is NOT a consent
 * record.** Naming predates the pivot; do not build consent logic on this flag.
 *
 * ⚠️ AND THE RULE BELOW IS CORRECT AS WRITTEN — it is not an instance of that mistake. It
 * enrols on verified-email OR explicit consent *deliberately*, on the legitimate-interest
 * basis spelled out in the next paragraph, with the opt-out and unsubscribe carrying the
 * obligation. Read it as a documented decision, not as consent logic built on the flag.
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

/**
 * ⚑ 2 Sep (PR A2) — `programmeFulfilment` IS ITS OWN MODE, NEVER `force`.
 *
 * 🛑 WHY NOT REUSE `force`. That flag means "a human approval BOUGHT this work" — the
 * per-lead $4 approval. Reusing it for programme delivery would make every log line, every
 * alert and every future reader of this function believe a client had approved and paid for
 * an individual lead. Programme enrolment is INCLUDED FULFILMENT: the programme's own P1/P2
 * economics already paid for delivery, and there is no per-lead purchase to represent. A flag
 * that lies about why work happened is how the next defect gets built on top of it.
 */
export type EnrolMode = {
  force?: boolean
  prepaid?: boolean
  /** The programme this enrolment is fulfilment for. Verified here, never trusted. */
  programmeFulfilment?: { programmeId: string }
  /**
   * ⚑ 9 Sep — PREPARE THE ENROLMENT, ATTEMPT NO OUTREACH. Set only by pre-approval programme
   * preparation. See `EnrolOutcome` below for the whole argument.
   */
  prepareOnly?: boolean
}

/**
 * Why an enrolment attempt ended the way it did.
 *
 * ⛓️ 9 Sep — THIS FUNCTION USED TO RETURN `void`, AND THAT IS WHAT PRODUCED
 * *"Lead … was not enrolled — no enrolment row exists after the attempt"* FOR MANY HOUSE
 * PROSPECTS. Fourteen different refusals here are a bare `return`; the caller could only look
 * for a row afterwards, not find one, and report the same empty sentence for every one of
 * them. The founder was shown a wall of identical lines that named no cause.
 *
 * A refusal now carries its own reason, so preparation can aggregate causes instead of
 * counting absences.
 */
export type EnrolRefusal =
  | 'kill_switch' | 'programme_refused' | 'no_campaign' | 'no_email' | 'do_not_contact'
  | 'crm_duplicate' | 'crm_unreadable' | 'pecr' | 'launch_country' | 'not_legacy_model'
  | 'no_credits' | 'no_send_capability' | 'no_canonical_sequence' | 'charge_failed'
  | 'insert_failed' | 'unexpected_error'

export type EnrolOutcome =
  /** A row was created by THIS call. */
  | { state: 'created'; enrollmentId: string; sent: boolean }
  /** A row for this lead in this campaign already existed. Nothing was written or charged. */
  | { state: 'already' }
  /** Nothing was written. `reason` is founder-plain and already names the cause. */
  | { state: 'refused'; code: EnrolRefusal; reason: string }

/**
 * ── ⛓️ 9 Sep — PREPARATION CREATES THE ROW; SENDING REMAINS A SEPARATE, LATER ACT ─────────
 *
 * 🛑 THE COUPLING THAT BROKE THE HOUSE RECOVERY. This function was written for the legacy
 * model, where *enrol* means **charge a credit and send step one immediately**. So it runs the
 * per-lead SEND gates — do-not-contact, PECR, the launch-country hold, and "is Resend even
 * configured" — BEFORE the insert, and each one aborts the enrolment entirely.
 *
 * That is right for a legacy enrolment, which exists only to send. It is wrong for programme
 * PREPARATION, which must build the reviewable set **before** approval, P2, Make Live or Run,
 * and must send nothing at all. Applied there, a prospect who merely cannot be *emailed yet*
 * never gets a row — and the programme can never satisfy readiness.
 *
 * ⚠️ AND NOT ONE OF THOSE GATES IS BEING WEAKENED, because none of them lived only here.
 * Every one is independently enforced at the moment of sending, inside `sendSequenceEmailCore`:
 * do-not-contact (`figsy.ts` ~720), the cross-client opt-out blocklist (~732), PECR (~755) and
 * the launch-country hold (~780) — each suppressing the send permanently. `prepareOnly` moves
 * the decision to where the decision belongs; it does not remove it.
 *
 * 🛑 `do_not_contact` IS THE ONE REFUSAL PREPARATION KEEPS. The others are about *when* and
 * *whether* an email may go out. That one is about a person we must never build outreach for
 * at all, so it refuses at preparation too, by name.
 *
 * ⚠️ `prepareOnly` ALSO SKIPS THE STEP-ONE SEND, which is the only line here that could ever
 * emit anything. Today that call already returns `deferred` for a pre-approval programme (the
 * OUTREACH gate demands approval AND P2 AND status LIVE), so this removes no protection — it
 * removes 246 pointless round trips from a request that was already timing out.
 *
 * ⚠️ `next_send_at` IS DELIBERATELY LEFT EXACTLY AS IT WAS. Writing `null` for a prepared row
 * would look safer and would silently break Make Live: `send-due` selects on
 * `next_send_at <= now`, nothing re-arms an existing enrolment, and the programme would go
 * live and never send. The row is already inert by construction three times over — its
 * campaign is a DRAFT and the cron only selects `status = 'active'` campaigns; the OUTREACH
 * authority check refuses without approval + P2 + LIVE; and the kill-switch sits in front of
 * both.
 */
export async function autoEnrollLead(leadId: string, clientId: string, opts?: EnrolMode): Promise<EnrolOutcome> {
  const refuse = (code: EnrolRefusal, reason: string): EnrolOutcome => ({ state: 'refused', code, reason })
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
    // ⚑ PROGRAMME FULFILMENT PREPARES WHILE THE SWITCH IS OFF, AND THAT IS THE POINT.
    // `AUTO_OUTREACH_ENABLED` is the AUTOMATIC SEND control. Making a programme operable is
    // preparation, not sending — and the send at the bottom of this function still consults
    // the switch itself, so a prepared programme with the switch off has enrolments and has
    // sent nothing. Every other caller keeps the original bail unchanged.
    if (!opts?.force && !opts?.programmeFulfilment && !outreachEnabled()) {
      console.warn(`[figsy] autoEnrollLead: AUTO_OUTREACH_ENABLED != true — not enrolling/charging lead ${leadId} (kill-switch off).`)
      return refuse('kill_switch', 'Automatic outreach is switched off, so this lead was not enrolled or charged.')
    }

    // ── 🛑 PROGRAMME AUTHORITY IS RE-PROVED HERE, NOT TAKEN ON TRUST ────────────────────
    //
    // The caller (`programme-preparation.ts`) has already checked all of this. It is checked
    // AGAIN because a guard that depends on another guard having run is not a guard — and the
    // thing being unlocked is the wallet bypass. If this claim were ever wrong, a legacy lead
    // would be enrolled for free against a programme it does not belong to.
    //
    // Everything here is read from the DATABASE, never from the caller's argument: the lead's
    // own `programme_id`, its client, and the programme row itself.
    let programmeFulfilment: { programmeId: string } | null = null
    if (opts?.programmeFulfilment) {
      const { verifyProgrammeFulfilment } = await import('./programme-preparation')
      const v = await verifyProgrammeFulfilment(leadId, clientId, opts.programmeFulfilment.programmeId)
      if (!v.ok) {
        console.warn(`[figsy] autoEnrollLead: programme fulfilment REFUSED for lead ${leadId} — ${v.reason}. Nothing enrolled, nothing charged.`)
        return refuse('programme_refused', v.reason)
      }
      programmeFulfilment = opts.programmeFulfilment
    }

    // ONE ICP = ONE CAMPAIGN (flow v2). A lead's campaign is decided by the ICP that found
    // them — `leads.icp_id` — not by "whichever campaign happens to be newest and active",
    // which silently ignored the campaign you meant the moment a client had two.
    const { data: leadIcp } = await db.from('leads').select('icp_id, programme_id').eq('id', leadId).maybeSingle()
    const leadProgrammeId = (leadIcp as { programme_id?: string | null } | null)?.programme_id ?? null
    let campaign: { id: string; name?: string; campaign_intent?: string | null; settings?: unknown } | null = null
    if (leadIcp?.icp_id) {
      // ── ⚑ 7 Sep — PROGRAMME PREPARATION ACCEPTS A *DRAFT* CAMPAIGN, AND ONLY IT DOES ────
      //
      // 🛑 WHY. Preparation now runs BEFORE the client approves (founder-locked), and before
      // approval the programme campaign is deliberately a DRAFT — `activate: true` is the only
      // door to `status: 'active'`, the status the outreach machinery looks for, and it stays
      // shut until Make Live. Requiring `active` here would therefore make pre-approval
      // preparation impossible: the campaign it just created would be invisible to it.
      //
      // ⚠️ THIS WIDENS *WHICH CAMPAIGN IS FOUND*, NOT WHAT MAY BE SENT. The lead is still
      // resolved by its own ICP — the positive, programme-correct link — and this branch is
      // reached ONLY through `programmeFulfilment`, which `verifyProgrammeFulfilment` has
      // already re-proved against the database. Every ordinary caller still gets `active` only.
      //
      // ⚠️ AND AN ENROLMENT IS NOT A SEND. Whether anything leaves is decided by OUTREACH
      // authority — approval AND Payment 2 AND status LIVE — which a pre-approval programme
      // does not have. The row is inert by construction, not by promise.
      const q = db.from('figsy_campaigns')
        .select('id, name, campaign_intent, settings')
        .eq('client_id', clientId).eq('icp_id', leadIcp.icp_id)
      const { data: byIcp } = await (opts?.programmeFulfilment ? q : q.eq('status', 'active'))
        .limit(1).maybeSingle()
      campaign = byIcp ?? null
    }
    if (!campaign && leadProgrammeId) {
      // ── ⚑ 2 Sep (PR A2) — THE FALLBACK IS NOT AVAILABLE TO PROGRAMME WORK ──────────────
      //
      // 🛑 THE DEFECT THIS CLOSES, EXACTLY. The fallback below picks the client's NEWEST
      // ACTIVE campaign — any campaign, no ICP, no programme. House carries historical
      // campaigns from a retired desk. So a lead correctly sourced under the new programme,
      // correctly stamped `programme_id`, could be enrolled into an OLD campaign and sent
      // that campaign's sequence: right attribution, wrong story, real prospect.
      //
      // Every gate downstream would have allowed it. The enrollment copies `programme_id`
      // from the lead, so send SELECTION matches and send AUTHORITY matches — both are
      // satisfied by a programme-attributed row, and neither has any opinion about which
      // campaign the row points at. Attribution being right is precisely what made this
      // invisible.
      //
      // ⚠️ THE ICP IS THE ONLY HONEST LINK, and it already exists. One ICP = one campaign,
      // and an ICP belongs to exactly one programme (`icps.programme_id`, written only by the
      // attach action). So the campaign found BY ICP above is programme-correct by
      // construction — while "newest active" is a guess that happens to be right for a client
      // with one campaign and silently wrong for a client with history. No campaign column is
      // needed to tell them apart.
      //
      // Not finding one is a refusal, never a substitute: the lead stays enrolled in nothing,
      // which is recoverable. Enrolling it in the wrong sequence is not.
      console.error(
        `[figsy] autoEnrollLead: lead ${leadId} belongs to programme ${leadProgrammeId} and its ICP has no active campaign. ` +
        'NOT falling back to the newest active campaign — that campaign predates the programme. Nothing was enrolled.',
      )
      return refuse('no_campaign', "This lead's ICP has no campaign of its own, and the client's older campaigns predate the programme, so there is nothing safe to enrol it into.")
    }
    if (!campaign) {
      // Fallback for leads sourced before ICPs carried a campaign. Legacy work only — a
      // client with no programme attribution on the lead, exactly as before.
      const { data: newest } = await db.from('figsy_campaigns')
        .select('id, name, campaign_intent, settings')
        .eq('client_id', clientId).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      campaign = newest ?? null
    }

    // ⚠️ #625 — THIS SILENT RETURN IS WHY TWO GUARDS BOTH MISSED. approve-lead wraps this call
    // in a `.catch` that alerts on failure — but bailing here is a RETURN, not a throw, so the
    // catch never ran and a lead came back "approved" having entered no sequence at all.
    //
    // `force` is the distinction. It means a HUMAN approval bought this work (approve-lead
    // passes it on every explicit approval), so a client is now waiting on outreach that will
    // never arrive — an event worth waking somebody for. The auto path (no force) runs on cron
    // across the whole book, where a campaignless client is an ordinary state and not news;
    // alerting there would train the founder to ignore the alert that matters.
    //
    // #625 also closed the door upstream, so approve-lead should never reach this branch. This
    // stays as defence in depth for every OTHER forced caller, and because a guard that only
    // works while a second guard is correct is not a guard.
    if (!campaign) {
      if (opts?.force) {
        console.error('[figsy] autoEnrollLead: NO ACTIVE CAMPAIGN on a forced enrol — the lead will never be worked', clientId, leadId)
        void sendFounderAlert('sends_stalled', 'An approved lead was never enrolled — no active campaign', [
          `Client ${clientId}, lead ${leadId}.`,
          'The approval went through but the client has NO active campaign, so the lead entered no sequence.',
          'The lead is approved and revealed, but it is in no sequence — start their campaign in Vida and enrol it, or nothing will ever be sent.',
        ]).catch(() => {})
      }
      return refuse('no_campaign', 'This client has no active campaign, so there is no sequence for the lead to enter.')
    }

    const { data: lead } = await db.from('leads')
      .select('id, first_name, last_name, email, job_title, company, industry, seniority, country, tech_stack, score, score_reasoning')
      .eq('id', leadId).single()
    if (!lead?.email) return refuse('no_email', 'This lead has no email address, so it cannot be enrolled.')

    // DO-NOT-CONTACT: never enroll anyone connected to the founder's employer.
    if (isSuppressed({ email: lead.email, company: lead.company })) {
      console.warn(`[figsy] autoEnrollLead: ${lead.email} is on the do-not-contact list — not enrolled.`)
      return refuse('do_not_contact', 'This person is on the do-not-contact list, so no outreach may be prepared for them.')
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
          return refuse('crm_duplicate', `Already in the client's CRM — ${dup.reason ?? 'a matching contact exists'}.`)
        }
      } catch (err) {
        console.warn(`[figsy] dedup: CRM check failed for lead ${leadId}, SKIPPING (fail-closed) —`, err instanceof Error ? err.message : err)
        return refuse('crm_unreadable', "The client's CRM could not be checked for duplicates, so this lead was not enrolled (fail-closed).")
      }
    }

    // ⚠️ #617 PECR — THE THIRD ENROL PATH, AND THE ONE THAT ACTUALLY RUNS ON SEND-DAY.
    //
    // The two `/figsy` enrol routes take this check before their charge. THIS function is the
    // path a client's own approval takes (`approve-lead.ts` → here, `{ force: true, prepaid:
    // true }`), so it is the one that matters most — and it charges a few lines below.
    //
    // Without this the send-time net would still stop the email, but the client would have been
    // CHARGED for a lead we can never legally send to, and the enrollment would sit suppressed
    // forever. That is the charge-then-refuse #332 forbids: correct-looking money for nothing.
    //
    // Placed with the other refusals (do-not-contact above, CRM dedup above) and BEFORE the
    // billing gate, so it costs neither a credit nor a Claude draft.
    // ⚑ 9 Sep — NOT AT PREPARATION. PECR decides whether an email may LEAVE, and
    // `sendSequenceEmailCore` asks it again for every step, suppressing permanently when it
    // refuses. Asking it here as well cost the House programme its enrolments.
    if (!isDemo && !opts?.prepareOnly) {
      const pecr = pecrVerdict({ country: lead.country, companyName: lead.company })
      if (!pecr.allow) {
        console.warn(`[figsy] #617 autoEnrollLead: lead ${leadId} not enrolled — ${pecr.reason}`)
        return refuse('pecr', pecr.reason)
      }
    }

    // LAUNCH COUNTRY HOLD — at launch we send to the US and the UK, and nowhere else.
    //
    // Beside the PECR gate because it is the same kind of question — may we write to this
    // person? — but it is NOT the same question, and the two must not be merged. PECR asks
    // whether UK law forbids the send; this asks whether the founder has opened the country.
    // A Nigerian lead passes PECR happily and is held here, which is the whole point.
    //
    // THE MONEY IS ALREADY GONE BY THE TIME WE GET HERE, and that is why this is not the only
    // launch gate. `approve-lead.ts` step 3d holds the lead BEFORE `try_charge_wallet` so the
    // client is never charged. This line is the backstop for every other road into enrolment —
    // an operator enrolling on behalf, a re-approve of a contact paid for before this shipped.
    // Reaching this gate with money already moved means the 3d gate was bypassed, not that the
    // hold is wrong: hold anyway, because a send we cannot make is worse than a stranded $4.
    //
    // Demo exempt, exactly as above: the demo book is entirely South African and drafts only.
    // ⚑ 9 Sep — NOT AT PREPARATION, for the same reason as PECR immediately above. The hold is
    // re-applied at send time (`sendSequenceEmailCore`), where it stops the email rather than
    // the preparation.
    if (!isDemo && !opts?.prepareOnly && !isLaunchSendCountry(lead.country)) {
      console.warn(`[figsy] autoEnrollLead: lead ${leadId} not enrolled — ${launchHoldReason(lead.country)}`)
      return refuse('launch_country', launchHoldReason(lead.country))
    }

    // Billing gate (item 166): FIGSY is charged at ENROLLMENT — one FIGSY credit =
    // one lead enrolled. Don't enroll (or spend a Claude draft) when the FIGSY pool
    // is empty; upstream delivery is already capped by this pool — this is the backstop.
    // ⚑ PROGRAMME FULFILMENT DOES NOT CONSULT THE LEGACY WALLET (founder ruling, 2 Sep):
    // "P1/P2 programme economics pay for programme delivery. Enrolment is NOT separately
    // billable." A programme client holding zero FIGSY credits has still paid in full, and
    // for a PAYING programme client this gate would have charged them a second time for
    // delivery their programme price already covers.
    //
    // ⛓️ ~~"THE GATE IS UNTOUCHED FOR EVERYONE ELSE. A client with no programme reaches it
    // exactly as before."~~ AMENDED 3 Sep (C2) — see immediately below. It is still untouched
    // for every client actually on the legacy model; what changed is that "no programme" is no
    // longer what decides who that is.
    // ── ⚑ C2 — THE COMMERCIAL MODEL DECIDES WHICH GATE EVEN APPLIES ─────────────────────
    //
    // 🛑 A DECLARED PROGRAMME CLIENT HAS NO LEGACY ENROLMENT AUTHORITY AT ALL. Before the
    // model existed, such a client with no open programme fell through to the wallet gate:
    // holding credits, they would have been enrolled under retired economics; holding none,
    // they were told they had "no FIGSY credits" — a wallet that governs nothing they bought.
    // Both answers are wrong for the same reason.
    //
    // The only legitimate enrolment for them is PROGRAMME FULFILMENT, which arrives with
    // `programmeFulfilment` and is separately re-proved end to end by
    // `verifyProgrammeFulfilment` (A2). Anything else is refused here, before any charge.
    //
    // ⚠️ AND UNREADABLE REFUSES TOO. Not knowing which model governs a client is not a licence
    // to spend their wallet.
    //
    // ⛓️ CORRECTED 3 Sep — ~~`if (!isDemo && !programmeFulfilment)`.~~ FOUNDER-RULED:
    // **`is_demo` AND `commercial_model` ARE ORTHOGONAL.** Skipping the model question for a
    // demo turned the demo flag into a grant of legacy commercial workflow, so MBF — a demo AND
    // a programme client — would have enrolled down the retired per-lead path. Demo decides
    // whether money and provider spend are real (the wallet gate below still skips for it); it
    // never decides which commercial model governs. A demo account with a NULL model resolves
    // to legacy and reaches the gate below exactly as it does today.
    if (!programmeFulfilment) {
      const { clientCommercialModel, mayUseLegacyCommercialPath } = await import('./commercial-model')
      const model = await clientCommercialModel(clientId)
      if (!mayUseLegacyCommercialPath(model)) {
        console.warn(`[figsy] autoEnrollLead: client ${clientId} is not on the legacy commercial model (${model.model}) — no legacy enrolment authority for lead ${leadId}. Nothing charged.`)
        return refuse('not_legacy_model', `This client is on the ${model.model} commercial model, so it has no legacy per-lead enrolment authority.`)
      }
    }
    // ⚠️ THE WALLET GATE IS UNTOUCHED FOR A LEGACY CLIENT. Reached only when the model above
    // resolved to legacy — the $299 pack model, which is what is actually selling.
    if (!isDemo && !programmeFulfilment && !canEnroll(client?.figsy_credits_remaining)) {
      console.warn(`[figsy] autoEnrollLead: client ${clientId} has no FIGSY credits — skipping enrollment for lead ${leadId}.`)
      return refuse('no_credits', 'This client has no FIGSY credits left, so the lead was not enrolled.')
    }

    // Charge-without-send guard (audit 2 Jul): FIGSY bills one credit AT enrollment,
    // then sends step 1 immediately. If the send engine is unconfigured (RESEND_API_KEY
    // unset → `resend` is null), step 1 would silently never leave while the client is
    // still charged. Refuse to enroll/charge when we cannot send at all — a
    // misconfiguration must never bill a client for outreach that didn't go out.
    // (Note: blocklist / daily-cap skips inside sendSequenceEmail are by-design deferrals,
    // NOT this bug — this guard targets only the no-send-capability case.)
    // ⚑ 9 Sep — NOT AT PREPARATION. This guard exists to stop a client being CHARGED for a
    // send that cannot happen; programme fulfilment charges nothing (`chargeResult` is
    // 'skipped' below), and a missing provider key is a deployment fact about the future, not a
    // reason to refuse to build the set the customer is about to review.
    if (!isDemo && !opts?.prepareOnly && !resend) {
      console.error(`[figsy] autoEnrollLead: RESEND_API_KEY unset — refusing to enroll/charge lead ${leadId} (would deduct a FIGSY credit with no send).`)
      return refuse('no_send_capability', 'The email provider is not configured, so enrolling this lead would charge for a send that cannot happen.')
    }

    // Item 187 — if a saved sequence/template has been applied to this campaign, send
    // its literal copy (token-substituted) instead of AI-generating. Falls back to the
    // AI path when no sequence is applied, or the sequence has no usable email steps.
    const settings = (campaign as any).settings ?? {}

    // ── ⚑ 8 Sep — ONE CANONICAL SEQUENCE STORE FOR PROGRAMME WORK (founder-locked) ────────
    //
    // 🛑 THERE WERE TWO STORES AND THEY COULD DISAGREE. The customer reviews and approves the
    // sequence resolved through `programme → ICP → campaign → figsy_sequences`; this function
    // built every enrolment from `figsy_campaigns.settings.sequence`. Same client, same
    // campaign, different words — the customer could read one thing while the send path
    // executed another, and nothing anywhere would say so.
    //
    // **THE RULE: `figsy_sequences` is canonical for programme work.** Review, readiness, the
    // snapshot, the enrolment step count, send execution and next-step timing all read it.
    //
    // ⚠️ NO PROGRAMME FALLBACK. Not to campaign settings, not to `client_id`, not to a newest
    // row, and not to the AI draft path. If the canonical sequence is missing or empty this
    // REFUSES — an enrolment built from words nobody approved is worse than no enrolment,
    // because it looks prepared.
    //
    // ⚠️ LEGACY IS UNTOUCHED. `programmeFulfilment` is the only door to this branch, and the
    // whole live $299 book goes through the settings path below exactly as it did.
    let canonicalSequenceId: string | null = null
    let canonicalSteps: SequenceStep[] | null = null
    if (programmeFulfilment) {
      const { resolveProgrammeChain } = await import('./programme-chain')
      const chainRes = await resolveProgrammeChain(programmeFulfilment.programmeId)
      if (!chainRes.ok) {
        console.error(`[figsy] autoEnrollLead: lead ${leadId} NOT enrolled — the programme's canonical sequence could not be resolved. ${chainRes.degraded}`)
        return refuse('no_canonical_sequence', chainRes.degraded)
      }
      if (!chainRes.chain.sequenceId || chainRes.chain.steps.length === 0) {
        console.error(`[figsy] autoEnrollLead: lead ${leadId} NOT enrolled — programme ${programmeFulfilment.programmeId} has no canonical sequence with message steps (programme -> ICP -> campaign -> figsy_sequences). NOT falling back to the campaign settings copy: the customer approves the canonical sequence, so anything else would send words nobody agreed to.`)
        return refuse('no_canonical_sequence', 'This programme has no canonical sequence with message steps, so no prospect can be prepared from it.')
      }
      canonicalSequenceId = chainRes.chain.sequenceId
      canonicalSteps = chainRes.chain.steps as unknown as SequenceStep[]
    }

    const appliedSequence = canonicalSteps ?? ((settings.sequence as SequenceStep[] | undefined) ?? undefined)
    const sequenceDraft = appliedSequence
      ? buildDraftFromSequence(appliedSequence, lead as any, client?.company_name ?? null)
      : null
    const usingSequence = sequenceDraft !== null
    // #651 — the campaign's own sequence plan (purpose · depth · event date), stored in the
    // settings JSONB by Vida. Absent = the R38 meeting-at-5 default, unchanged.
    const storedPurpose = normalisePurpose(settings.sequence_purpose)
    const storedDepth = settings.sequence_depth != null ? normaliseDepth(settings.sequence_depth) : undefined
    const storedEventDate = (storedPurpose === 'event' && typeof settings.sequence_event_date === 'string')
      ? new Date(settings.sequence_event_date) : null
    const seqOpts: SequenceOptions = {
      purpose: storedPurpose,
      depth: storedDepth,
      eventDate: storedEventDate && !Number.isNaN(storedEventDate.getTime()) ? storedEventDate : null,
      industry: (lead as any).industry ?? null,
    }
    const draft = sequenceDraft ?? await generateSequenceWithMemory(
      lead as Lead,
      clientId,
      client?.company_name ?? '',
      client?.industry ?? null,
      (campaign as any).campaign_intent ?? undefined,
      (campaign as any).model_preference ?? 'haiku',
      seqOpts,
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
    // its own copy + per-step cadence; the AI path is the 5-step draft (R38). The first step's
    // subject is overwritten with the A/B-selected variant so what we STORE equals what
    // we SEND. The step1-3 columns below are still written (first 3) for legacy readers.
    const fullSteps = (usingSequence && appliedSequence)
      ? buildDraftStepsFromSequence(appliedSequence, lead as any, client?.company_name ?? null)
      : draftToSteps(draft, sequencePlan({
          purpose: seqOpts.purpose, depth: seqOpts.depth,
          industry: seqOpts.industry, eventDate: seqOpts.eventDate,
        }).gaps)
    if (fullSteps.length > 0) fullSteps[0] = { ...fullSteps[0], subject: step1Subject }
    const totalSteps = fullSteps.length > 0 ? fullSteps.length : 5

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
      return { state: 'already' }
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
      (isDemo || opts?.prepaid || programmeFulfilment) ? 'skipped' : await chargeFigsyEnroll(clientId, lead)
    if (chargeResult === 'failed') {
      console.warn(`[figsy] autoEnrollLead: charge failed for lead ${leadId} — not enrolling (nothing charged).`)
      return refuse('charge_failed', 'The enrolment charge did not go through, so the lead was not enrolled.')
    }

    // P8 — a supabase insert normally RETURNS its error, but any THROW here (network
    // drop, unexpected client error) after a successful charge would otherwise land in
    // the outer catch as a SILENT credit leak (charged, never enrolled, never refunded).
    // Guard the insert: on a throw, return the credit before bailing.
    // ══ DELIVERY ATTRIBUTION (BUILD-003 PR2-E) ═══════════════════════════════════════════
    //
    // PR 1 added `figsy_enrollments.programme_id` and `.batch_id`, both nullable and indexed,
    // and NOTHING wrote them. This is the wiring: every enrollment created from here on
    // records which programme and which batch produced it.
    //
    // ⚠️ RESOLVED FROM THE LEAD'S OWN BATCH, NOT GUESSED FROM THE CLIENT. `leads.programme_id`
    // and `leads.batch_id` are stamped by the sourcing run that bought that person, so the
    // attribution follows the actual person rather than "whatever the client's programme is
    // today" — which would silently re-attribute a lead to a later batch.
    //
    // ⚠️ NO BACKFILL, AND NULL IS AN HONEST ANSWER. A lead sourced before attribution existed
    // has no batch, and inventing one would manufacture a certainty we do not have. Legacy
    // (non-programme) work is null here for the same reason: it belongs to no programme.
    const attribution = await resolveLeadAttribution(leadId)

    let insertRes
    try {
      insertRes = await db.from('figsy_enrollments').insert({
        // ⚑ 8 Sep — the enrolment NAMES its sequence, so "which words will this person get"
        // is a positive fact rather than an unverifiable copy. NULL for legacy work, which is
        // the honest answer for an enrolment whose words came from the settings copy.
        sequence_id:    canonicalSequenceId,
        campaign_id:    campaign.id,
        lead_id:        leadId,
        client_id:      clientId,
        programme_id:   attribution.programmeId,
        batch_id:       attribution.batchId,
        status:         'enrolled',
        current_step:   0,
        // #453 — demo enrollments never send, so leave next_send_at null (the cron
        // gates on next_send_at) so a demo enrollment is drafted-only and inert.
        next_send_at:   isDemo ? null : new Date().toISOString(), // send step 1 immediately
        // #212 — full ≤7-step sequence walked by the send engine.
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
      return refuse('insert_failed', `The enrolment could not be written (${insertThrow instanceof Error ? insertThrow.message : String(insertThrow)}).`)
    }
    const { data: enrollment, error } = insertRes

    if (error || !enrollment) {
      // We already charged — return the $4 so the wallet + ledger reconcile.
      console.error('[figsy] autoEnrollLead: enrollment insert failed after charge', error?.message, 'for lead', leadId, '— returning $4')
      if (chargeResult === 'charged') await refundFigsyEnroll(clientId, leadId)
      return refuse('insert_failed', `The enrolment could not be written${error?.message ? ` (${error.message})` : ''}.`)
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
      return { state: 'created', enrollmentId: String(enrollment.id), sent: false }
    }
    // ⚑ 9 Sep — PREPARATION STOPS HERE, AND THIS IS THE LINE THAT MAKES "PREPARING IS NOT
    // SENDING" STRUCTURAL RATHER THAN A PROMISE. The row exists; no outreach was attempted.
    // For a pre-approval programme this call could only ever have returned `deferred` anyway
    // (OUTREACH demands approval + P2 + LIVE), so nothing is lost but the round trip.
    if (opts?.prepareOnly) {
      return { state: 'created', enrollmentId: String(enrollment.id), sent: false }
    }
    await sendSequenceEmail(
      enrollment.id,
      lead as Lead,
      1,
      step1Subject,
      draft.step1.body,
      campaign.id,
      { totalSteps, waitDaysNext: fullSteps[0]?.wait_days },
    )
    return { state: 'created', enrollmentId: String(enrollment.id), sent: true }
  } catch (err) {
    console.error('[figsy] autoEnrollLead failed for lead', leadId, ':', err instanceof Error ? err.message : err)
    return refuse('unexpected_error', err instanceof Error ? err.message : String(err))
  }
}
