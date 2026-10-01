// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 · R184 · Coaching #2505 Objection Coach · #2506 Roleplay, text, Phase 1)
// PRACTICE BEFORE THE CALL — two Full Coaching features, one grounding, one model door.
//
// OBJECTION COACH. The client picks one of their usual objections (their own F6 answer, a
// prospect's not-now/not-a-fit reply, a "not now"/"not a fit" note they left after a meeting)
// or types one; Milla returns the likely real concern behind it, a short answer in the client's
// own voice, and one question to ask back.
//
// ROLEPLAY. Milla plays the prospect of one of the client's OWN meetings — their role, their
// company, the words they actually wrote — and the client types replies. After six replies, or
// when the client asks "How did I do?", she gives three notes: what landed, what to tighten,
// the next step to ask for. STATELESS: the transcript lives in the browser for the length of the
// practice and is sent back each turn, bounded below. Nothing is stored — a practice run is not a
// record of anything that happened with a real prospect, so it must never sit beside one.
//
// 🛑 BOTH ARE FULL COACHING (R180: Enterprise, or Founders/Growth with Full Coaching on). The
// gate is `coachingAccessFor(...).full` and nothing else — the ladder lives in one place.
//
// 🛑 GROUNDED IN THE CLIENT'S OWN WORDS, AND NEVER AN INVENTED FIGURE (R87). The prompt is built
// from `salesContextLines` — so the offer's result reaches it ONLY when the client ticked "you
// may mention this" — and every answer is checked: a number the model wrote that appears in none
// of the facts it was given is refused as an honest, retryable error, never shown to the client.
//
// ⚠️ THE MODEL. A client is sitting in front of this waiting for Milla's reply, turn by turn —
// that is a conversational surface (models.ts: "a person is waiting for this reply"), so it is
// `CONVERSATION_MODEL`, bounded by `AI_TURN_BOUND` so the portal's 45s budget is arithmetic.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import { CONVERSATION_MODEL, AI_TURN_BOUND } from './models'
import { coachingAccessFor } from './coaching-access'
import { salesContextFrom, salesContextLines } from './sales-context'

export const FULL_COACHING_ONLY = {
  objection: 'Objection Coach comes with Full Coaching.',
  roleplay: 'Roleplay comes with Full Coaching.',
} as const

/** The longest objection a client may send. */
export const OBJECTION_MAX = 300
/** The longest single line in a roleplay transcript. */
export const TURN_MAX_CHARS = 600
/** The most lines a roleplay may carry (prospect + client together). */
export const ROLEPLAY_MAX_TURNS = 12
/** After this many client replies Milla gives her notes without being asked. */
export const ROLEPLAY_FEEDBACK_AFTER = 6
/** How far back a meeting still counts as "recent" for roleplay. */
export const ROLEPLAY_RECENT_DAYS = 30

const TRY_AGAIN = "Milla couldn't put that together just now. Nothing was lost — please try again."

export type Fail = { ok: false; status: number; error: string }
export type ObjectionOption = { text: string; source: 'yours' | 'reply' | 'meeting' }
export type Turn = { who: 'prospect' | 'you'; text: string }
export type CoachAnswer = { concern: string; answer: string; question: string }
export type RoleplayFeedback = { landed: string; tighten: string; nextStep: string }

const s = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// ── THE CLIENT'S USUAL OBJECTIONS ───────────────────────────────────────────────────────

/**
 * Their F6 answer, split into one objection per line. ⚠️ STRUCTURE, NOT MEANING: it splits on
 * the line breaks, semicolons and bullets the client typed, and keeps the part before their own
 * "→" (the placeholder teaches "objection → our answer"). Nothing here decides what they meant.
 */
export function splitObjections(raw: string): string[] {
  return raw
    .split(/\n|;|•/)
    .map(part => part.split(/→|->/)[0].replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim().replace(/^["“]|["”]$/g, '').trim())
    .filter(Boolean)
    .map(o => o.slice(0, OBJECTION_MAX))
}

/** Every objection the client could practise, from their own sources only. */
export async function objectionOptions(clientId: string, pitch: Record<string, unknown> | null): Promise<ObjectionOption[]> {
  const out: ObjectionOption[] = []
  const seen = new Set<string>()
  const add = (text: string, source: ObjectionOption['source']) => {
    const t = text.trim().slice(0, OBJECTION_MAX)
    if (!t || seen.has(t)) return
    seen.add(t); out.push({ text: t, source })
  }
  for (const o of splitObjections(salesContextFrom(pitch).objections)) add(o, 'yours')

  // ⚠️ A REPLY IS CHOSEN BY THE CLASSIFIER'S ENUM, NEVER BY READING ITS WORDS HERE: `warm`
  // (interested, not now) and `cold` (not a fit) are where objections live. The words are shown
  // as the prospect wrote them; Milla works out the concern behind them.
  const [replies, notes] = await Promise.all([
    db.from('figsy_replies').select('body_text, body, classification').eq('client_id', clientId)
      .in('classification', ['warm', 'cold']).order('received_at', { ascending: false }).limit(5),
    db.from('outcome_events').select('payload').eq('client_id', clientId).eq('event_type', 'meeting_outcome')
      .order('occurred_at', { ascending: false }).limit(50),
  ])
  for (const r of (replies.data ?? []) as Array<{ body_text?: string | null; body?: string | null }>) {
    add(s(r.body_text ?? r.body, 200), 'reply')
  }
  let fromMeetings = 0
  for (const e of (notes.data ?? []) as Array<{ payload?: Record<string, unknown> | null }>) {
    const answer = e.payload?.answer
    if (fromMeetings >= 5 || (answer !== 'not_now' && answer !== 'not_fit')) continue
    const before = out.length
    add(s(e.payload?.note, 200), 'meeting')
    if (out.length > before) fromMeetings += 1
  }
  return out.slice(0, 15)
}

// ── GROUNDING, AND THE FIGURE CHECK ─────────────────────────────────────────────────────

async function readPitchSafe(clientId: string): Promise<Record<string, unknown> | null> {
  // A help, never a gate: an unreadable pitch means Milla coaches without it.
  try {
    const { data } = await db.from('figsy_knowledge').select('data').eq('client_id', clientId).eq('kind', 'pitch').maybeSingle()
    return (data as { data?: Record<string, unknown> | null } | null)?.data ?? null
  } catch { return null }
}

const norm = (t: string) => t.replace(/,/g, '').replace(/\s+/g, '')

/**
 * The figures in `text` that appear in none of `sources`. ⚠️ A SAFETY CHECK ON MILLA'S OUTPUT,
 * not a reading of the client's words (R87: never invent a value figure). Digits only.
 */
export function inventedFigures(text: string, sources: string[]): string[] {
  const pool = norm(sources.join(' '))
  const found = text.match(/\d[\d,.]*\s?%?/g) ?? []
  return found.map(f => norm(f).replace(/[.,]+$/, '')).filter(f => f && !pool.includes(f))
}

/** The ONE model door for both features. A client is waiting: conversational model, bounded. */
async function askMilla(system: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>, maxTokens: number): Promise<string | null> {
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await ai.messages.create({ model: CONVERSATION_MODEL, max_tokens: maxTokens, system, messages }, AI_TURN_BOUND)
    const text = msg.content.filter(b => b.type === 'text').map(b => (b as { text: string }).text).join('').trim()
    return text || null
  } catch (err) {
    console.error('[coaching-practice] model call failed:', err)
    return null
  }
}

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null
  const t = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try { const v = JSON.parse(t); return v && typeof v === 'object' ? v as Record<string, unknown> : null } catch { return null }
}

const NO_FIGURES = 'Never state a number, price, percentage, time saving, customer name or result unless it appears word for word in the facts above. If the facts give no proof, make the point without one.'

/** Pure: the Objection Coach prompt. Tested directly for its grounding. */
export function objectionPrompt(input: { company: string | null; sellerLines: string[]; objection: string }): string {
  return [
    `You are Milla, coaching ${input.company ?? 'a seller'} to handle an objection on a sales call.`,
    '',
    input.sellerLines.length
      ? `HOW THE SELLER SELLS (their own words — use them, never invent beyond them):\n${input.sellerLines.map(l => `- ${l}`).join('\n')}`
      : 'The seller has not told us how they sell yet; keep the answer general and honest.',
    '',
    `THE OBJECTION: "${input.objection}"`,
    '',
    'If the seller already gave an answer to this objection above, build on THEIR answer.',
    NO_FIGURES,
    'Reply with ONLY this JSON and nothing else:',
    '{"concern": "the likely real concern behind it, one or two sentences", "answer": "a short answer the seller can say, in their own voice, first person, two to four sentences", "question": "one question to ask back"}',
  ].join('\n')
}

// ── OBJECTION COACH ─────────────────────────────────────────────────────────────────────

export async function coachObjection(clientId: string, body: unknown): Promise<{ ok: true; data: CoachAnswer } | Fail> {
  const access = await coachingAccessFor(clientId)
  if (!access.full) return { ok: false, status: 403, error: FULL_COACHING_ONLY.objection }
  const objection = s((body as Record<string, unknown> | null)?.objection, OBJECTION_MAX + 1)
  if (!objection) return { ok: false, status: 400, error: 'Pick an objection or type one.' }
  if (objection.length > OBJECTION_MAX) return { ok: false, status: 400, error: `Keep the objection under ${OBJECTION_MAX} characters.` }
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, status: 503, error: 'Coaching is not configured yet' }

  const [pitch, me] = await Promise.all([
    readPitchSafe(clientId),
    db.from('clients').select('company_name').eq('id', clientId).maybeSingle(),
  ])
  const sellerLines = salesContextLines(pitch)
  const prompt = objectionPrompt({ company: (me.data as { company_name?: string } | null)?.company_name ?? null, sellerLines, objection })
  const out = parseJson(await askMilla('You are Milla, a sales coach. You answer only in the JSON asked for.', [{ role: 'user', content: prompt }], 500))
  const data = { concern: s(out?.concern, 600), answer: s(out?.answer, 900), question: s(out?.question, 300) }
  if (!data.concern || !data.answer || !data.question) return { ok: false, status: 503, error: TRY_AGAIN }
  const invented = inventedFigures(`${data.concern} ${data.answer} ${data.question}`, [...sellerLines, objection])
  if (invented.length) {
    console.error('[coaching-practice] objection answer refused — figures not in the facts:', invented)
    return { ok: false, status: 503, error: TRY_AGAIN }
  }
  return { ok: true, data }
}

// ── ROLEPLAY ────────────────────────────────────────────────────────────────────────────

/** Pure: the transcript, checked. The browser holds it, so the server trusts none of it. */
export function cleanTurns(raw: unknown): { ok: true; turns: Turn[] } | Fail {
  if (raw === undefined || raw === null) return { ok: true, turns: [] }
  if (!Array.isArray(raw)) return { ok: false, status: 400, error: 'That practice could not be read. Start it again.' }
  if (raw.length > ROLEPLAY_MAX_TURNS) return { ok: false, status: 400, error: 'This practice has reached its end. Ask "How did I do?" or start again.' }
  const turns: Turn[] = []
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i] as Record<string, unknown> | null
    const expected: Turn['who'] = i % 2 === 0 ? 'prospect' : 'you'
    const text = typeof t?.text === 'string' ? t.text.trim() : ''
    // The prospect speaks first and the two take turns — anything else was not this practice.
    if (t?.who !== expected) return { ok: false, status: 400, error: 'That practice could not be read. Start it again.' }
    if (!text) return { ok: false, status: 400, error: 'Write a reply first.' }
    if (text.length > TURN_MAX_CHARS) return { ok: false, status: 400, error: `Keep each reply under ${TURN_MAX_CHARS} characters.` }
    turns.push({ who: expected, text })
  }
  return { ok: true, turns }
}

type Persona = { firstName: string; role: string; company: string; industry: string | null; theirWords: string | null }

/** Pure: who Milla plays, and what she may raise. */
export function prospectSystem(p: Persona, objections: string[]): string {
  return [
    'You are role-playing a prospect on a sales call so a seller can practise. Stay in character the whole time.',
    `You are ${p.firstName}, ${p.role} at ${p.company}${p.industry ? ` (${p.industry})` : ''}.`,
    p.theirWords ? `Before this call you wrote to the seller: "${p.theirWords}"` : '',
    'Be realistic, polite and busy: one to three sentences a turn, the way people talk on a call.',
    objections.length
      ? `Over the whole call raise at most two objections, and only from this list:\n${objections.map(o => `- ${o}`).join('\n')}`
      : 'Over the whole call raise at most one objection, about timing or priorities.',
    'Never state a number, price, percentage, headcount, budget or result unless the seller said it first.',
    'Never say you are an AI, never coach, never break character. Reply with only what you would say.',
  ].filter(Boolean).join('\n')
}

/** Pure: the three notes prompt. */
export function feedbackPrompt(p: Persona, turns: Turn[], sellerLines: string[]): string {
  return [
    `A seller just practised a call with ${p.firstName}, ${p.role} at ${p.company} (played by you, Milla). The transcript:`,
    turns.map(t => `${t.who === 'you' ? 'SELLER' : 'PROSPECT'}: ${t.text}`).join('\n'),
    '',
    sellerLines.length ? `HOW THE SELLER SELLS (their own words):\n${sellerLines.map(l => `- ${l}`).join('\n')}` : '',
    'Coach the SELLER. Be specific to what they actually said. Each note one or two short sentences.',
    NO_FIGURES,
    'Reply with ONLY this JSON and nothing else:',
    '{"landed": "what landed", "tighten": "what to tighten", "next_step": "the next step to ask for"}',
  ].filter(Boolean).join('\n')
}

export type RoleplayResult =
  | { ok: true; data: { done: false; line: string } | { done: true; feedback: RoleplayFeedback } }
  | Fail

export async function roleplayTurn(clientId: string, body: unknown, now = Date.now()): Promise<RoleplayResult> {
  const access = await coachingAccessFor(clientId)
  if (!access.full) return { ok: false, status: 403, error: FULL_COACHING_ONLY.roleplay }
  const b = (body ?? {}) as Record<string, unknown>
  const leadId = typeof b.leadId === 'string' ? b.leadId : ''
  if (!leadId) return { ok: false, status: 400, error: 'Pick a meeting to practise.' }
  const cleaned = cleanTurns(b.turns)
  if (!cleaned.ok) return cleaned
  const turns = cleaned.turns
  const replies = turns.filter(t => t.who === 'you').length
  const finish = b.finish === true || replies >= ROLEPLAY_FEEDBACK_AFTER
  if (finish && replies === 0) return { ok: false, status: 400, error: 'Reply at least once, then ask how you did.' }
  // A turn is asked for only after the client has spoken (or to open the call).
  if (!finish && turns.length > 0 && turns[turns.length - 1].who !== 'you') return { ok: false, status: 400, error: 'Write a reply first.' }
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, status: 503, error: 'Coaching is not configured yet' }

  // 🛑 THE PERSONA IS THIS CLIENT'S OWN PROSPECT, WITH A REAL MEETING — scoped by the session's
  // client, never by the request. Another client's lead, or one with no meeting, is a 404.
  const { data: lead } = await db.from('leads').select('id, first_name, job_title, company, industry')
    .eq('id', leadId).eq('client_id', clientId).maybeSingle()
  if (!lead) return { ok: false, status: 404, error: "We couldn't find that meeting." }
  const { meetingsForClient } = await import('./meeting-truth')
  const meetings = await meetingsForClient({ clientId, leadId, limit: 10 })
  if (meetings === null) return { ok: false, status: 503, error: "We couldn't read your meetings just now." }
  const since = now - ROLEPLAY_RECENT_DAYS * 864e5
  const hasMeeting = meetings.some(m => m.state !== 'NO_SHOW' && new Date(m.scheduledAt).getTime() >= since)
  if (!hasMeeting) return { ok: false, status: 404, error: "We couldn't find that meeting." }

  const l = lead as { first_name?: string | null; job_title?: string | null; company?: string | null; industry?: string | null }
  const [pitch, reply] = await Promise.all([
    readPitchSafe(clientId),
    // ⛓️ 25 Sep (P5d) — never our own outbound as "their own words".
    db.from('figsy_replies').select('body_text, body').eq('client_id', clientId).eq('lead_id', leadId)
      .neq('classification', 'sent_reply').order('received_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const r = reply.data as { body_text?: string | null; body?: string | null } | null
  const persona: Persona = {
    firstName: s(l.first_name, 60) || 'the prospect', role: s(l.job_title, 120) || 'a decision maker',
    company: s(l.company, 120) || 'their company', industry: s(l.industry, 120) || null,
    theirWords: s(r?.body_text ?? r?.body, 600) || null,
  }
  const sellerLines = salesContextLines(pitch)
  const sources = [...sellerLines, ...turns.filter(t => t.who === 'you').map(t => t.text)]

  if (finish) {
    const out = parseJson(await askMilla('You are Milla, a sales coach. You answer only in the JSON asked for.',
      [{ role: 'user', content: feedbackPrompt(persona, turns, sellerLines) }], 500))
    const feedback = { landed: s(out?.landed, 400), tighten: s(out?.tighten, 400), nextStep: s(out?.next_step, 400) }
    if (!feedback.landed || !feedback.tighten || !feedback.nextStep) return { ok: false, status: 503, error: TRY_AGAIN }
    if (inventedFigures(`${feedback.landed} ${feedback.tighten} ${feedback.nextStep}`, [...sources, ...turns.map(t => t.text)]).length) {
      return { ok: false, status: 503, error: TRY_AGAIN }
    }
    return { ok: true, data: { done: true, feedback } }
  }

  const objections = (await objectionOptions(clientId, pitch)).map(o => o.text).slice(0, 6)
  // The prospect is the assistant; the seller is the user. The call opens with a stage note so
  // the transcript starts with the user, as the API requires.
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [{ role: 'user', content: '(The call has just connected. Greet the seller briefly.)' }]
  for (const t of turns) messages.push({ role: t.who === 'you' ? 'user' : 'assistant', content: t.text })
  const line = s(await askMilla(prospectSystem(persona, objections), messages, 300), TURN_MAX_CHARS)
  if (!line) return { ok: false, status: 503, error: TRY_AGAIN }
  if (inventedFigures(line, [...sources, persona.theirWords ?? '', ...objections]).length) return { ok: false, status: 503, error: TRY_AGAIN }
  return { ok: true, data: { done: false, line } }
}

/** What the Coaching screen needs to draw both cards. Lower plans get `full: false` and nothing else. */
export async function practiceState(clientId: string): Promise<{ full: boolean; objections: ObjectionOption[] }> {
  const access = await coachingAccessFor(clientId)
  if (!access.full) return { full: false, objections: [] }
  try { return { full: true, objections: await objectionOptions(clientId, await readPitchSafe(clientId)) } }
  catch { return { full: true, objections: [] } }
}
