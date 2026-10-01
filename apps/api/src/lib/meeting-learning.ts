// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 · Coaching #2496) — MEETING LEARNING: THE PREP BRIEF LEARNS FROM THIS CLIENT'S
// OWN PAST MEETINGS.
//
// R180 lists "meeting learning" in Phase 1 of the Full Coaching product. After the client has
// answered F1 ("How did it go?") for a few meetings, the next prep brief is grounded in what those
// meetings taught: what the next-step meetings had in common, and which reasons keep coming back
// in the "not now" and "not a fit" answers — plus the client's own one-line notes, in their words.
//
// 🛑 ONLY FROM F1. The lines are built from the client's own answers and notes and the role of the
// person each answered meeting was with — never from replies, sends or anything we inferred. A
// prep brief that cited a pattern the client never told us would be Coaching inventing evidence.
// 🛑 ONLY FOR FULL COACHING (`coachingAccessFor(...).full`). Growth keeps the standard prep brief.
// ⚠️ A HELP, NEVER A GATE: an unreadable read gives no lines and the brief is built as before.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import type { MeetingAnswer } from './meeting-outcome'
import { roleOf, countPhrase } from './whats-converting'

/** Answered meetings that happened, before any learning is offered. */
export const MIN_LEARNING = 3
const NOTE_QUOTE_MAX = 160
const QUOTES_PER_KIND = 2

export type LearnedMeeting = {
  answer: MeetingAnswer
  note: string | null
  at: string
  /** The person the meeting was with — the role is all the learning uses. */
  jobTitle?: string | null
}

/** Reasons that recur in "not now" / "not a fit" notes. Keyword-matched, deterministic. */
const REASONS: Array<[string, RegExp]> = [
  ['timing', /\b(timing|not now|not right now|next (year|quarter|month)|later in the year|too busy|busy|too early|revisit)\b/i],
  ['budget', /\b(budget|cost|costs|price|pricing|expensive|afford|spend)\b/i],
  ['an existing supplier or contract', /\b(already (have|has|use|uses|using|work with|works with)|incumbent|current (provider|supplier|vendor)|contract|locked in|in-house)\b/i],
  ['not the decision-maker', /\b(not the (right )?(person|decision[- ]maker)|decision[- ]maker|wrong person|someone else decides|their boss|the board|sign[- ]off)\b/i],
  ['no clear need', /\b(no need|don'?t need|not relevant|not a priority|no pain|too small|too big|not a fit)\b/i],
]

const quote = (s: string) => `"${s.replace(/\s+/g, ' ').trim().slice(0, NOTE_QUOTE_MAX)}"`

/**
 * Pure: the lines a Full Coaching prep brief gains from the client's own F1 answers. Empty below
 * MIN_LEARNING answered meetings, and always empty without full access. Tested directly.
 */
export function meetingLearningLines(meetings: LearnedMeeting[], access: { full: boolean }): string[] {
  if (!access.full) return []
  const held = meetings.filter(m => m.answer === 'next_step' || m.answer === 'not_now' || m.answer === 'not_fit')
    .sort((a, b) => b.at.localeCompare(a.at))
  if (held.length < MIN_LEARNING) return []
  const by = (a: MeetingAnswer) => held.filter(m => m.answer === a)
  const forward = by('next_step'), notNow = by('not_now'), notFit = by('not_fit')

  const lines: string[] = [
    `Of the seller's last ${held.length} meetings that happened: ${forward.length} agreed a next step, ${notNow.length} ${notNow.length === 1 ? 'was' : 'were'} interested but not now, ${notFit.length} ${notFit.length === 1 ? 'was' : 'were'} not a fit.`,
  ]

  // What the next-step meetings had in common — the role of the person, when most of them share it.
  const roles = new Map<string, number>()
  for (const m of forward) { const r = roleOf(m.jobTitle); if (r) roles.set(r, (roles.get(r) ?? 0) + 1) }
  const known = [...roles.values()].reduce((a, b) => a + b, 0)
  const top = [...roles.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  if (top && top[1] >= 2 && top[1] * 2 > known) {
    lines.push(`${countPhrase(top[1], known, 'meetings that agreed a next step', "the seller's")} were with ${top[0]} people.`)
  }

  // Reasons that keep coming back when a meeting did not move forward — in at least two notes.
  const stalled = [...notNow, ...notFit].filter(m => m.note)
  for (const [reason, re] of REASONS) {
    const n = stalled.filter(m => re.test(String(m.note))).length
    if (n >= 2) lines.push(`A reason that came up in ${n} of the seller's "not now" or "not a fit" meetings: ${reason}. Prepare an answer for it.`)
  }

  // The client's own notes, newest first — their words, quoted, never paraphrased.
  const notes = (list: LearnedMeeting[]) => list.filter(m => m.note).slice(0, QUOTES_PER_KIND).map(m => quote(String(m.note)))
  const fwdNotes = notes(forward)
  if (fwdNotes.length) lines.push(`What the seller noted after meetings that agreed a next step: ${fwdNotes.join(' · ')}`)
  const stalledNotes = notes([...notNow, ...notFit].sort((a, b) => b.at.localeCompare(a.at)))
  if (stalledNotes.length) lines.push(`What the seller noted after meetings that did not move forward: ${stalledNotes.join(' · ')}`)
  return lines
}

/** The client's answered meetings (all their programmes), with the role of each person met. */
export async function readLearnedMeetings(clientId: string): Promise<LearnedMeeting[]> {
  const { meetingsForClient } = await import('./meeting-truth')
  const rows = await meetingsForClient({ clientId, limit: 100 })
  if (!rows || rows.length === 0) return []
  const { latestOutcomes } = await import('./meeting-outcome')
  const answers = await latestOutcomes(clientId, rows.map(r => r.id))
  if (!answers || answers.size === 0) return []
  const leadIds = [...new Set(rows.filter(r => answers.has(r.id)).map(r => r.leadId).filter((v): v is string => !!v))]
  const { data } = leadIds.length
    ? await db.from('leads').select('id, job_title').eq('client_id', clientId).in('id', leadIds)
    : { data: [] }
  const title = new Map(((data ?? []) as Array<{ id: string; job_title: string | null }>).map(l => [l.id, l.job_title]))
  return rows.filter(r => answers.has(r.id)).map(r => {
    const o = answers.get(r.id)!
    return { answer: o.answer, note: o.note, at: o.at, jobTitle: r.leadId ? title.get(r.leadId) ?? null : null }
  })
}

/** The gate and the read: Full Coaching only, and an unreadable read is "no lines". */
export async function meetingLearningFor(clientId: string): Promise<string[]> {
  try {
    const { coachingAccessFor } = await import('./coaching-access')
    const access = await coachingAccessFor(clientId)
    if (!access.full) return []
    return meetingLearningLines(await readLearnedMeetings(clientId), access)
  } catch (err) {
    console.error('[meeting-learning] not read — brief built without it:', err)
    return []
  }
}

/**
 * Pure: the prep-brief prompt (`POST /leads/coaching/:leadId/brief`). Moved here from the route,
 * unchanged apart from the meeting-learning block, so what reaches the model is tested.
 */
export function prepBriefPrompt(input: {
  sellerName: string | null | undefined
  lead: { first_name?: string | null; last_name?: string | null; job_title?: string | null; company?: string | null; industry?: string | null; score_reasoning?: string | null }
  replyText: string | null
  sellerLines: string[]
  learningLines: string[]
}): string {
  const { lead } = input
  return `Prepare ${input.sellerName ?? 'a seller'} for a first sales call.\n\n` +
    `THEM: ${[lead.first_name, lead.last_name].filter(Boolean).join(' ')} — ${lead.job_title ?? 'unknown role'} at ${lead.company ?? 'unknown company'}` +
    `${lead.industry ? ` (${lead.industry})` : ''}.\n` +
    `${lead.score_reasoning ? `WHY THEY FIT: ${lead.score_reasoning}\n` : ''}` +
    `${input.replyText !== null ? `THEIR OWN WORDS: "${input.replyText.slice(0, 800)}"\n` : ''}` +
    `${input.sellerLines.length ? `HOW THE SELLER SELLS (their own words — use it, never invent beyond it):\n${input.sellerLines.map(l => `- ${l}`).join('\n')}\n` : ''}` +
    // ⚑ 1 Oct (#2496) — Full Coaching only; empty otherwise, and the prompt is exactly as before.
    `${input.learningLines.length ? `WHAT THE SELLER'S OWN PAST MEETINGS TAUGHT (from their own after-meeting answers — use it to sharpen the objection and the next step; never invent beyond it, and never quote a count to them as a percentage):\n${input.learningLines.map(l => `- ${l}`).join('\n')}\n` : ''}\n` +
    `Give exactly four short sections with these headings and nothing else:\n` +
    `WHAT THEY LIKELY CARE ABOUT\nTHREE QUESTIONS TO ASK\nTHE OBJECTION TO EXPECT\nHOW TO CLOSE THE NEXT STEP\n` +
    `Be specific to this person. Plain text, no markdown, no preamble.`
}
