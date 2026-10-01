// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (Coaching · #2495 follow-up drafts · #2502 follow-up coach · R180 · R184) — AFTER A
// MEETING THAT WENT SOMEWHERE, THE CLIENT GETS THE FOLLOW-UP EMAIL WRITTEN FOR THEM.
//
// R180's ladder: Growth ($199) includes "post-meeting follow-up"; the whole Coaching product
// (Enterprise, or Founders/Growth with Full Coaching) adds the coaching around it. So:
//   · Founders            → nothing; one quiet line says it comes with Growth or Full Coaching.
//   · Growth extras       → a DRAFT email (subject + body). The client sends it from THEIR OWN
//                            mailbox. We never send it — there is no send path here on purpose.
//   · Full Coaching       → the same draft PLUS three short lines: what to confirm, the next step
//                            to propose and when, and the one risk to address.
// Access is asked of `coachingAccessFor` (the one home of the ladder), never of the band.
//
// ⚠️ ONLY AFTER A MEETING THAT WENT SOMEWHERE. The client's own F1 answer must be "next step
// agreed" or "interested, not now". A not-fit has nothing to follow up; a "didn't show" is being
// checked by our team (R184 ①) and a warm follow-up to someone who never turned up is wrong.
//
// ⚠️ GROUNDED IN WHAT WE KNOW, NOTHING ELSE: the prospect (name, role, company), their own reply
// words, the client's one-line F1 note, and `salesContextLines` (which already carries the
// client's result ONLY when they ticked permission to quote it).
//
// 🛑 R87 — NEVER AN INVENTED FIGURE. The prompt forbids it, and because a prompt is a request
// rather than a guarantee, `inventedFigures` checks the reply: a money, percentage or "N×" figure
// that does not appear in the grounding is refused before the client ever sees it.
//
// WHERE IT LIVES: `outcome_events` (event_type `follow_up_draft`), like F1's answers — no new
// table, no migration. The latest draft per meeting is shown again after a refresh without a new
// model call; a new one is written only when the client presses "Write it again".
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import { BACKGROUND_MODEL, AI_TURN_BOUND } from './models'
import type { MeetingAnswer } from './meeting-outcome'

export type FollowUpLevel = 'none' | 'draft' | 'coach'
export type FollowUpCoaching = { confirm: string; nextStep: string; risk: string }
export type FollowUpDraft = { subject: string; body: string; coaching: FollowUpCoaching | null; at: string }

/** The two F1 answers that earn a follow-up. */
export const FOLLOW_UP_ANSWERS: readonly MeetingAnswer[] = ['next_step', 'not_now']
export const canFollowUp = (answer: unknown): boolean =>
  typeof answer === 'string' && (FOLLOW_UP_ANSWERS as readonly string[]).includes(answer)

/** ⚠️ Founder copy: a statement of what the plan includes, not a sale (R180: no hard sell). */
export const FOLLOW_UP_LOCKED = 'Follow-up drafts come with Growth or Full Coaching.'

/** The ladder, read from the one place it lives. */
export function followUpLevel(a: { growthExtras: boolean; full: boolean }): FollowUpLevel {
  return a.full ? 'coach' : a.growthExtras ? 'draft' : 'none'
}

const SUBJECT_MAX = 150
const BODY_MAX = 2_000
const LINE_MAX = 300
const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export type FollowUpInput = {
  level: 'draft' | 'coach'
  seller: string | null
  prospect: { name: string; role: string | null; company: string | null }
  theirWords: string | null
  outcome: { answer: MeetingAnswer; note: string | null }
  /** From `salesContextLines` — the result is already absent unless the client allowed it. */
  sellerLines: string[]
}

const OUTCOME_WORDS: Partial<Record<MeetingAnswer, string>> = {
  next_step: 'The meeting went well and a next step was agreed.',
  not_now: 'The prospect is interested, but the timing is later.',
}

/** Pure: the whole prompt, so what reaches the model is tested directly. */
export function followUpPrompt(i: FollowUpInput): string {
  const who = [i.prospect.name, i.prospect.role ? `— ${i.prospect.role}` : '', i.prospect.company ? `at ${i.prospect.company}` : '']
    .filter(Boolean).join(' ')
  const shape = i.level === 'coach'
    ? '{"subject": "...", "body": "...", "confirm": "...", "next_step": "...", "risk": "..."}'
    : '{"subject": "...", "body": "..."}'
  return [
    `Write the follow-up email ${i.seller ?? 'a seller'} will send after a first sales meeting. They send it themselves, from their own mailbox.`,
    '',
    `THE PROSPECT: ${who}.`,
    `HOW IT WENT: ${OUTCOME_WORDS[i.outcome.answer] ?? ''}`,
    i.outcome.note ? `THE SELLER'S NOTE FROM THE MEETING (their own words): "${i.outcome.note}"` : null,
    i.theirWords ? `THE PROSPECT'S OWN WORDS BEFORE THE MEETING: "${i.theirWords.slice(0, 800)}"` : null,
    i.sellerLines.length ? `HOW THE SELLER SELLS (their own words — use it, never go beyond it):\n${i.sellerLines.map(l => `- ${l}`).join('\n')}` : null,
    '',
    'RULES:',
    '- Use only the facts above. Never invent a number, price, percentage, saving, result, customer name or date that is not written above.',
    i.outcome.answer === 'not_now'
      ? '- They are interested but not now: keep it light, thank them, leave the door open and suggest a sensible time to reconnect.'
      : '- A next step was agreed: thank them, restate that next step plainly, and make it easy to confirm.',
    '- Short: under 150 words. Plain, warm, professional. No markdown. Sign off with "[Your name]".',
    i.level === 'coach'
      ? '- Also coach the seller in one short sentence each: "confirm" = what to confirm with them; "next_step" = the next step to propose and when; "risk" = the one risk to address.'
      : null,
    '',
    `Reply with JSON only, exactly this shape: ${shape}`,
  ].filter((l): l is string => l !== null).join('\n')
}

/** Everything the model was allowed to know — the reference `inventedFigures` checks against. */
export function groundingText(i: FollowUpInput): string {
  return [i.prospect.name, i.prospect.role, i.prospect.company, i.theirWords, i.outcome.note, ...i.sellerLines]
    .filter((v): v is string => typeof v === 'string').join('\n')
}

const FIGURE = /(?:[$£€]\s?\d[\d,.]*(?:\s?(?:k|m|bn|million|billion)\b)?|\d[\d,.]*\s?(?:%|percent\b|per cent\b|x\b|×))/gi
const norm = (s: string) => s.toLowerCase().replace(/[\s,]/g, '').replace(/percent/g, '%').replace(/×/g, 'x').replace(/\.+$/, '')

/**
 * 🛑 R87 — money, percentage and multiplier figures in `text` that the grounding never gave.
 * Empty = clean. A figure the client wrote themselves (in their note or a result they allowed) passes.
 */
export function inventedFigures(text: string, grounding: string): string[] {
  const known = norm(grounding)
  return (text.match(FIGURE) ?? []).map(f => f.trim().replace(/[.,]+$/, '')).filter(f => !known.includes(norm(f)))
}

/** The model's JSON, cleaned. Growth never receives coaching lines, whatever the model sent. */
export function parseFollowUp(raw: string, level: 'draft' | 'coach'): Omit<FollowUpDraft, 'at'> | null {
  const a = raw.indexOf('{'); const b = raw.lastIndexOf('}')
  if (a < 0 || b <= a) return null
  let j: Record<string, unknown>
  try { j = JSON.parse(raw.slice(a, b + 1)) as Record<string, unknown> } catch { return null }
  const subject = clip(j.subject, SUBJECT_MAX); const body = clip(j.body, BODY_MAX)
  if (!subject || !body) return null
  if (level !== 'coach') return { subject, body, coaching: null }
  const coaching = { confirm: clip(j.confirm, LINE_MAX), nextStep: clip(j.next_step, LINE_MAX), risk: clip(j.risk, LINE_MAX) }
  return { subject, body, coaching: coaching.confirm || coaching.nextStep || coaching.risk ? coaching : null }
}

function draftFrom(p: Record<string, unknown> | null | undefined, at: string): FollowUpDraft | null {
  const subject = clip(p?.subject, SUBJECT_MAX); const body = clip(p?.body, BODY_MAX)
  if (!subject || !body) return null
  const c = (p?.coaching ?? null) as Record<string, unknown> | null
  const coaching = c ? { confirm: clip(c.confirm, LINE_MAX), nextStep: clip(c.nextStep, LINE_MAX), risk: clip(c.risk, LINE_MAX) } : null
  return { subject, body, coaching, at }
}

/** The latest draft per meeting. `null` = the read failed (never "no drafts"). */
export async function latestFollowUps(clientId: string, meetingIds: string[]): Promise<Map<string, FollowUpDraft> | null> {
  const out = new Map<string, FollowUpDraft>()
  if (meetingIds.length === 0) return out
  const { data, error } = await db.from('outcome_events')
    .select('payload, occurred_at')
    .eq('client_id', clientId).eq('event_type', 'follow_up_draft')
    .in('payload->>meeting_id', meetingIds)
    .order('occurred_at', { ascending: false })
    .limit(200)
  if (error) { console.error('[follow-up] read failed:', error.message); return null }
  for (const r of (data ?? []) as Array<{ payload?: Record<string, unknown> | null; occurred_at: string }>) {
    const id = String(r.payload?.meeting_id ?? '')
    if (!id || out.has(id)) continue
    const d = draftFrom(r.payload, r.occurred_at)
    if (d) out.set(id, d)
  }
  return out
}

/** What a level may see: a draft written under Full Coaching shows no coaching to a Growth view. */
export const forLevel = (d: FollowUpDraft | null, level: FollowUpLevel): FollowUpDraft | null =>
  !d || level === 'none' ? null : level === 'coach' ? d : { ...d, coaching: null }

type AiLike = { messages: { create: (body: Record<string, unknown>, opts?: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text?: string }> }> } }

export type WriteResult = { ok: true; draft: FollowUpDraft } | { ok: false; status: number; error: string }

/** Write one draft with the model, check it, and keep it. The caller has scoped and gated. */
export async function writeFollowUp(input: FollowUpInput & { clientId: string; meetingId: string; by: string; ai: AiLike }): Promise<WriteResult> {
  // ⚠️ Background model (models.test.ts: only Milla and Vida are conversational) and BOUNDED:
  // the client is waiting on a button, so the worst case must fit the portal's 45s budget.
  const msg = await input.ai.messages.create({
    model: BACKGROUND_MODEL, max_tokens: input.level === 'coach' ? 900 : 700,
    messages: [{ role: 'user', content: followUpPrompt(input) }],
  }, AI_TURN_BOUND)
  const raw = msg.content.filter(b => b.type === 'text').map(b => b.text ?? '').join('')
  const parsed = parseFollowUp(raw, input.level)
  if (!parsed) return { ok: false, status: 502, error: "We couldn't write that draft just now. Press it again in a moment." }
  const all = [parsed.subject, parsed.body, parsed.coaching?.confirm, parsed.coaching?.nextStep, parsed.coaching?.risk].filter(Boolean).join('\n')
  const invented = inventedFigures(all, groundingText(input))
  if (invented.length) {
    console.error('[follow-up] refused a draft quoting figures nobody gave:', invented.join(', '))
    return { ok: false, status: 502, error: "That draft quoted a figure you never gave us, so we didn't show it. Press Write it again." }
  }
  const at = new Date().toISOString()
  const { error } = await db.from('outcome_events').insert({
    client_id: input.clientId, event_type: 'follow_up_draft', channel: 'milla',
    payload: {
      meeting_id: input.meetingId, subject: parsed.subject, body: parsed.body,
      ...(parsed.coaching ? { coaching: parsed.coaching } : {}), by: input.by,
    },
    occurred_at: at,
  })
  // A failed keep still shows the client their draft — it simply will not survive a refresh.
  if (error) console.error('[follow-up] write failed:', error.message)
  return { ok: true, draft: { ...parsed, at } }
}
