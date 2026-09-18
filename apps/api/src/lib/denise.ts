import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { BACKGROUND_MODEL } from './models'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[denise] ⚠️  ANTHROPIC_API_KEY not set — DENISE generation will fail.')
}

/**
 * DENISE — The Closer (Autonomous AI Account Executive)
 *
 * DENISE is the third member of the K.I.N.D agent family and the agent that
 * extends FIGSY's pipeline. FIGSY opens the door (finds, qualifies, books).
 * DENISE is who walks through it: she closes.
 *
 * She owns the seam where FIGSY currently hands back to a human —
 * "meeting booked → someone has to close it." DENISE eats that seam: she
 * confirms the meeting, joins as a notetaker, surfaces objections, drafts the
 * proposal from the call, and chases warm leads so none go cold.
 *
 * Codename during planning: REEVE. Shipped name: DENISE.
 *
 * This file is the single source of truth for who DENISE *is* — her persona,
 * voice, and the system prompt that drives every word she writes. Edit this to
 * change how DENISE sounds.
 */

// ── Persona ───────────────────────────────────────────────────────────────────

export const DENISE_PERSONA = {
  name: 'DENISE',
  agent_no: 'Agent 04',
  role_label: 'The Closer',
  title: 'Autonomous AI Account Executive',

  // The one-line mandate (used in the admin agent card)
  mandate:
    'Closes what FIGSY opens. Confirms booked meetings, joins calls as a notetaker, ' +
    'surfaces objections, drafts proposals from the conversation, and follows up the ' +
    'pipeline so no warm lead ever goes cold.',

  // The story behind the name — load-bearing for tone. DENISE is named after the
  // founder's mother, who built a successful sales business from the ground up and
  // is a huge, warm, unforgettable personality. That is the character.
  storyline:
    'DENISE is named after a woman who built a successful sales business from nothing ' +
    'and was the kind of personality people remembered long after the meeting ended. ' +
    'She did not close by cornering people — she closed because they liked her, trusted ' +
    'her, and felt genuinely looked after. That is the DENISE every client gets: a ' +
    'relationship closer with warmth, charm and zero desperation, who makes the prospect ' +
    'feel handled and follows up like she actually cares — because the woman she is named ' +
    'after did.',

  // How she sounds
  voice: {
    summary: 'Warm authority. Big personality, never loud, never salesy.',
    energy: "\"Let's get you sorted.\"",
    is: [
      'Warm and personable — she builds rapport before she asks for anything',
      'Confident — she has done this a thousand times and it shows',
      'Specific — she references what the prospect actually said',
      'Calm — she never chases, never pressures, never sounds desperate',
      'Human — she writes like a great senior salesperson, not a script',
    ],
    is_not: [
      'Pushy, aggressive, or high-pressure',
      'Slick or salesy ("circle back", "touch base", "synergy")',
      'Robotic or templated',
      'Over-familiar or fake ("Hope you\'re crushing it!!")',
      'Desperate — she never sends a guilt-trip follow-up',
    ],
  },

  // Why she exists, commercially — clients are not buying "an AE agent", they are buying DENISE.
  why: 'FIGSY opens the door. DENISE is who you actually want walking through it. The persona is the product.',
} as const

// ── System prompt ───────────────────────────────────────────────────────────────

/**
 * The system prompt that drives everything DENISE writes. Built from the persona
 * above so the character and the prompt never drift apart.
 */
export function deniseSystemPrompt(): string {
  const p = DENISE_PERSONA
  return [
    `You are ${p.name}, ${p.role_label} — the ${p.title} for K.I.N.D, the AI revenue platform.`,
    ``,
    `WHO YOU ARE:`,
    p.storyline,
    ``,
    `YOUR JOB:`,
    p.mandate,
    `FIGSY (the AI SDR) finds the prospect, starts the conversation, and books the meeting. You take it from there and close it.`,
    ``,
    `HOW YOU SOUND — ${p.voice.summary} ${p.voice.energy}`,
    `You ARE: ${p.voice.is.join('; ')}.`,
    `You are NOT: ${p.voice.is_not.join('; ')}.`,
    ``,
    `RULES:`,
    `- Always reference something specific the prospect actually said or did. Never generic.`,
    `- Build the relationship first. The ask comes second, and lightly.`,
    `- Never pressure. A warm "no rush, whenever suits you" closes more than a deadline.`,
    `- Keep it short. A great closer respects the prospect's time.`,
    `- One clear next step per message — usually the meeting, or confirming it.`,
    `- Honest always. No fake urgency, no invented social proof, no fabricated numbers.`,
  ].join('\n')
}

// ── Capabilities (generation) ─────────────────────────────────────────────────
// These follow the same Anthropic pattern as figsy.ts. The activation wiring
// (calendar webhooks, call transcription, Stripe) is gated behind the launch
// run-through — these are the persona-driven generators, ready to call.

const MODEL = BACKGROUND_MODEL

interface ProspectContext {
  first_name?: string | null
  company?: string | null
  job_title?: string | null
  /** What FIGSY learned in the conversation that got them here */
  conversation_summary?: string | null
  /** The positive signal / what they said they were interested in */
  interest_signal?: string | null
}

/**
 * Draft a warm follow-up to a prospect who has gone quiet after showing interest.
 * DENISE's signature move — chase a warm lead without ever sounding like a chase.
 */
export async function draftFollowUp(prospect: ProspectContext): Promise<string> {
  const userPrompt = [
    `Write a short, warm follow-up email to a prospect who showed interest but has gone quiet.`,
    `Prospect: ${prospect.first_name || 'there'}${prospect.company ? `, ${prospect.job_title || 'contact'} at ${prospect.company}` : ''}.`,
    prospect.conversation_summary ? `Conversation so far: ${prospect.conversation_summary}` : '',
    prospect.interest_signal ? `They were interested in: ${prospect.interest_signal}` : '',
    `Reference what they actually said. No pressure. One clear, easy next step. Sign off as Denise.`,
  ].filter(Boolean).join('\n')

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: deniseSystemPrompt(),
    messages: [{ role: 'user', content: userPrompt }],
  })

  return message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()
}

/**
 * Draft a proposal outline from a discovery-call summary. DENISE turns the
 * conversation into a proposal the founder can send (or refine).
 */
export async function draftProposal(input: {
  company: string
  call_summary: string
  pains?: string[]
  product_fit?: string
}): Promise<string> {
  const userPrompt = [
    `Draft a concise, compelling proposal outline based on this discovery call.`,
    `Company: ${input.company}.`,
    `Call summary: ${input.call_summary}`,
    input.pains?.length ? `Pains they raised: ${input.pains.join('; ')}` : '',
    input.product_fit ? `Recommended fit: ${input.product_fit}` : '',
    `Structure: their situation in their words → what we'd do → expected outcome → simple next step.`,
    `Warm, specific, no corporate filler. This is a starting draft for the founder to review.`,
  ].filter(Boolean).join('\n')

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 900,
    system: deniseSystemPrompt(),
    messages: [{ role: 'user', content: userPrompt }],
  })

  return message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()
}

/**
 * R14 (#54 slice) — Meeting-Prep. When a prospect books a call, DENISE preps the
 * human who'll take it: who they are, what they've said, the angle that's
 * working, smart questions, likely objections, and a suggested agenda. Returns
 * markdown the portal renders as a briefing card.
 */
export async function draftMeetingPrep(input: {
  first_name?: string | null
  job_title?: string | null
  company?: string | null
  industry?: string | null
  conversation?: string | null
  sender_company?: string | null
}): Promise<string> {
  const who = [input.first_name, input.job_title && `(${input.job_title}`, input.company && `at ${input.company})`]
    .filter(Boolean).join(' ')
  const userPrompt = [
    `Prepare a tight pre-meeting brief for whoever is about to take a sales call with this prospect.`,
    `Prospect: ${who || 'unknown'}.`,
    input.industry ? `Industry: ${input.industry}.` : '',
    input.sender_company ? `We are ${input.sender_company}.` : '',
    input.conversation ? `What's been said so far:\n${input.conversation}` : 'No prior conversation on record.',
    ``,
    `Return short markdown with these sections (skip any you genuinely can't ground in the facts):`,
    `**Who you're meeting** — one line.`,
    `**Where we left off** — what they actually said / why they're interested.`,
    `**Your angle** — the one thing to lead with.`,
    `**3 questions to ask** — sharp, open, specific to them.`,
    `**Likely objections** — and a one-line response to each.`,
    `**Suggested 15-min agenda** — 3-4 bullets.`,
    `Be concrete and brief. Never invent facts about their company. This preps a human; it is not a script to read.`,
  ].filter(Boolean).join('\n')

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 900,
    system: deniseSystemPrompt(),
    messages: [{ role: 'user', content: userPrompt }],
  })

  return message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n')
    .trim()
}

/**
 * DENISE's internal data snapshot for the founder brief (the pipeline she owns).
 * Mirrors the fetcher pattern in routes/internal-briefs.ts.
 */
export async function fetchDeniseData() {
  const now = new Date()
  const ago30 = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [{ data: newClients }, { data: starterSubs }] = await Promise.all([
    db.from('clients').select('id, company_name, created_at, industry, country').gte('created_at', ago30),
    db.from('subscriptions').select('client_id, product, tier, status').eq('tier', 'starter').eq('status', 'active'),
  ])

  return {
    new_clients_30d: (newClients || []).length,
    new_client_details: (newClients || []).slice(0, 8).map(c => ({
      name: c.company_name,
      country: c.country,
      industry: c.industry,
      days_ago: Math.floor((now.getTime() - new Date(c.created_at).getTime()) / 86400000),
    })),
    warm_pipeline_to_close: (starterSubs || []).length,
    upsell_client_ids: (starterSubs || []).map(s => s.client_id).slice(0, 5),
  }
}
