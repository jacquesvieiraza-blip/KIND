// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (Coaching #2501 Meeting Debrief, PHASE 1 · #2518 Enterprise Coaching Review #1 · R180)
// AFTER "HOW DID IT GO?", A FIVE-QUESTION DEBRIEF — AND, AT 25%, ENTERPRISE'S FIRST REVIEW OF THEM.
//
// DEBRIEF (Full Coaching: Enterprise, or Founders/Growth with Full Coaching on). Once the client
// has said a meeting happened (F1: next step · not now · not a fit), they can answer five short
// questions under it in Coaching's "After your meetings" (⛓️ 1 Oct, placement — ~~on the Meetings screen~~): who was in the room, what they cared about most,
// what objections came up, what was agreed next, and what they would do differently. Every answer
// is optional; at least one is needed to save. PHASE 1 IS TYPED ONLY — no call recording and no
// transcription (that is Phase 3, #2501's F4). Nothing here calls a model.
//
// COACHING REVIEW #1 (Enterprise, at the 25% moment). Built ONLY from what the client recorded:
// how many meetings they answered for, how each went, how many debriefs they wrote, and which
// objection keeps coming up across those debriefs — grouped by plain keywords, the same approach
// as `whats-converting.ts`. Below MIN_REVIEW_MEETINGS answered meetings, Milla says plainly it is
// too early. Never a percentage or a rate (R136); never a value claim or a figure (R87) — every
// number is a count of the client's own answers.
//
// WHERE IT LIVES. `outcome_events` (event_type `meeting_debrief`), like F1's answers — no new
// table, no migration. Append-only: changing a debrief writes a new one; the latest per meeting is
// the debrief. Written HERE with its error checked, because the client is shown what they saved.
//
// Access is asked of `coachingAccessFor` (the one home of the ladder), never of the band.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import type { MeetingAnswer } from './meeting-outcome'
import { countPhrase } from './whats-converting'

export const DEBRIEF_KEYS = ['who', 'cared', 'objections', 'agreed', 'differently'] as const
export type DebriefKey = typeof DEBRIEF_KEYS[number]
export type DebriefAnswers = Record<DebriefKey, string>
export type Debrief = DebriefAnswers & { at: string }

/** The five questions, in order. The portal shows these words; tested so they cannot drift. */
export const DEBRIEF_QUESTIONS: Record<DebriefKey, string> = {
  who: 'Who was in the room?',
  cared: 'What did they care about most?',
  objections: 'What objections came up?',
  agreed: 'What was agreed next?',
  differently: 'What would you do differently next time?',
}

export const DEBRIEF_ANSWER_MAX = 280
/** ⚠️ Founder copy: a statement of what the plan includes, not a sale (R180: no hard sell). */
export const DEBRIEF_LOCKED = 'Meeting debriefs come with Full Coaching.'

/** The F1 answers that say the meeting HAPPENED. A "didn't show" has nothing to debrief. */
export const DEBRIEF_ANSWERS: readonly MeetingAnswer[] = ['next_step', 'not_now', 'not_fit']
export const canDebrief = (answer: unknown): boolean =>
  typeof answer === 'string' && (DEBRIEF_ANSWERS as readonly string[]).includes(answer)

const clip = (v: unknown): string => (typeof v === 'string' ? v.trim().slice(0, DEBRIEF_ANSWER_MAX) : '')

/** Pure: the five answers, trimmed and bounded. `null` = nothing was answered. */
export function cleanDebrief(body: unknown): DebriefAnswers | null {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const out = Object.fromEntries(DEBRIEF_KEYS.map(k => [k, clip(b[k])])) as DebriefAnswers
  return DEBRIEF_KEYS.some(k => out[k]) ? out : null
}

/** The latest debrief per meeting. `null` = the read failed (never "no debriefs"). */
export async function latestDebriefs(clientId: string, meetingIds: string[]): Promise<Map<string, Debrief> | null> {
  const out = new Map<string, Debrief>()
  if (meetingIds.length === 0) return out
  const { data, error } = await db.from('outcome_events')
    .select('payload, occurred_at')
    .eq('client_id', clientId).eq('event_type', 'meeting_debrief')
    .in('payload->>meeting_id', meetingIds)
    .order('occurred_at', { ascending: false })
    .limit(500)
  if (error) { console.error('[meeting-debrief] read failed:', error.message); return null }
  for (const r of (data ?? []) as Array<{ payload?: Record<string, unknown> | null; occurred_at: string }>) {
    const id = String(r.payload?.meeting_id ?? '')
    if (!id || out.has(id)) continue
    const d = cleanDebrief(r.payload)
    if (d) out.set(id, { ...d, at: r.occurred_at })
  }
  return out
}

export type DebriefResult = { ok: true; debrief: Debrief } | { ok: false; status: number; error: string }

/**
 * Keep the client's debrief for one of THEIR meetings. The caller has scoped the meeting to this
 * client and checked Full Coaching; this checks the meeting happened and the answers are real.
 */
export async function recordDebrief(input: {
  clientId: string
  meeting: { id: string; state: string; programmeId?: string | null }
  /** The client's latest F1 answer for this meeting, if any. */
  answer: MeetingAnswer | null | undefined
  body: unknown
  by: string
  now?: number
}): Promise<DebriefResult> {
  if (input.meeting.state === 'NO_SHOW' || !canDebrief(input.answer)) {
    return { ok: false, status: 409, error: 'Tell us how the meeting went first, then debrief it.' }
  }
  const answers = cleanDebrief(input.body)
  if (!answers) return { ok: false, status: 400, error: 'Answer at least one question.' }
  const at = new Date(input.now ?? Date.now()).toISOString()
  const { error } = await db.from('outcome_events').insert({
    client_id: input.clientId, event_type: 'meeting_debrief', channel: 'milla',
    payload: { meeting_id: input.meeting.id, programme_id: input.meeting.programmeId ?? null, ...answers, by: input.by },
    occurred_at: at,
  })
  if (error) {
    console.error('[meeting-debrief] write failed:', error.message)
    return { ok: false, status: 503, error: "We couldn't save that just now. Nothing changed — please try again." }
  }
  return { ok: true, debrief: { ...answers, at } }
}

// ── COACHING REVIEW #1 (Enterprise · 25%) ─────────────────────────────────────────────────

/** Answered meetings (that happened) before a review says anything. Below it: "too early". */
export const MIN_REVIEW_MEETINGS = 2

// ⚑ 1 Oct — an objection becomes a GROUP by plain keyword, the way `whats-converting.ts` groups
// job titles and reply themes. One debrief can touch several groups; a group counts once per
// debrief. An objection that matches nothing is left out of the count — never forced into a group.
export const OBJECTION_GROUPS: Array<[string, RegExp]> = [
  ['Price or budget', /\b(price|prices|pricing|cost|costs|costly|budget|budgets|expensive|afford\w*|spend)\b/i],
  ['Timing', /\b(timing|not now|later|next (year|quarter|month)|too busy|busy|priorit\w*|q[1-4])\b/i],
  ['Already have something', /\b(already (have|use|using|got)|existing|current (system|tool|provider|supplier|setup)|competitor\w*|spreadsheets?|in-house|another provider)\b/i],
  ['Needs someone else to sign off', /\b(sign[- ]?off|approv\w*|board|boss|decision[- ]?maker\w*|finance team|procurement|budget holder)\b/i],
  ['Effort to switch', /\b(switch\w*|migrat\w*|implement\w*|roll[- ]?out|set[- ]?up|training|integrat\w*|disrupt\w*|change fatigue)\b/i],
  ['Trust or proof', /\b(proof|case stud(y|ies)|references?|trust|risk\w*|security|track record)\b/i],
]

export function objectionGroups(text: string | null | undefined): string[] {
  const t = String(text ?? '')
  return t.trim() ? OBJECTION_GROUPS.filter(([, re]) => re.test(t)).map(([label]) => label) : []
}

export type CoachingReview = {
  ready: boolean
  /** Meetings the client told us happened (F1: next step · not now · not a fit). */
  answered: number
  outcomes: { nextStep: number; notNow: number; notFit: number }
  debriefs: number
  /** Objection groups raised in at least two debriefs, most first. */
  recurring: Array<{ label: string; count: number }>
  /** Milla's plain lines, in order. Every number in them is one of the counts above. */
  lines: string[]
}

const lower1 = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

/** Pure: the review, from the client's own answers. Tested directly with fixtures. */
export function computeCoachingReview(input: { answers: MeetingAnswer[]; debriefs: DebriefAnswers[] }): CoachingReview {
  const held = input.answers.filter(a => canDebrief(a))
  const outcomes = {
    nextStep: held.filter(a => a === 'next_step').length,
    notNow: held.filter(a => a === 'not_now').length,
    notFit: held.filter(a => a === 'not_fit').length,
  }
  const answered = held.length
  const debriefs = input.debriefs.length
  const base = { answered, outcomes, debriefs }

  if (answered < MIN_REVIEW_MEETINGS) {
    const sofar = answered === 0 ? "you haven't told me how any of your meetings went yet"
      : `you've told me how ${answered} meeting went`
    return { ...base, ready: false, recurring: [], lines: [
      `It's too early for your first Coaching Review: ${sofar}. Once you've told me about ${MIN_REVIEW_MEETINGS}, on the Meetings screen, I'll put it together here from your own answers.`,
    ] }
  }

  const counts = new Map<string, number>()
  for (const d of input.debriefs) for (const g of objectionGroups(d.objections)) counts.set(g, (counts.get(g) ?? 0) + 1)
  // Ties break alphabetically so the same answers always give the same review.
  const recurring = [...counts.entries()].filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => ({ label, count }))

  const parts = [
    outcomes.nextStep ? `${outcomes.nextStep} agreed a next step` : null,
    outcomes.notNow ? `${outcomes.notNow} ${plural(outcomes.notNow, 'is', 'are')} interested, but not now` : null,
    outcomes.notFit ? `${outcomes.notFit} ${plural(outcomes.notFit, "wasn't", "weren't")} a fit` : null,
  ].filter((p): p is string => !!p)
  const lines = [`You've told me how ${answered} meetings went: ${parts.join(', ')}.`]
  if (debriefs === 0) {
    // ⛓️ 1 Oct (placement) — the debrief moved to Coaching's "After your meetings", where this review
    // now shows too. WAS ~~"Add one under a meeting on the Meetings screen"~~.
    lines.push("You haven't written a debrief yet. Add one under a meeting in After your meetings, below, and I'll show you which objections keep coming up.")
  } else {
    lines.push(`You've written ${debriefs} ${plural(debriefs, 'debrief', 'debriefs')}.`)
    for (const r of recurring) lines.push(`${r.label} came up in ${lower1(countPhrase(r.count, debriefs, 'debriefs'))}.`)
    if (!recurring.length) {
      lines.push(debriefs < 2
        ? "Once you've written a second debrief, I'll show you any objection that keeps coming up."
        : 'No objection has come up in more than one debrief yet.')
    }
  }
  return { ...base, ready: true, recurring, lines }
}

/** The review for one programme, from its own meetings. `null` = a read failed (never "too early"). */
export async function readCoachingReview(clientId: string, programmeId: string): Promise<CoachingReview | null> {
  const { meetingsForClient } = await import('./meeting-truth')
  const rows = await meetingsForClient({ clientId, programmeId, limit: 100 })
  if (rows === null) return null
  const ids = rows.filter(r => r.state !== 'NO_SHOW').map(r => r.id)
  const { latestOutcomes } = await import('./meeting-outcome')
  const [outcomes, debriefs] = await Promise.all([latestOutcomes(clientId, ids), latestDebriefs(clientId, ids)])
  if (outcomes === null || debriefs === null) return null
  return computeCoachingReview({
    answers: ids.map(id => outcomes.get(id)?.answer).filter((a): a is MeetingAnswer => !!a),
    debriefs: ids.map(id => debriefs.get(id)).filter((d): d is Debrief => !!d),
  })
}
