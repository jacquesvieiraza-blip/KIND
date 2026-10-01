// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 · Coaching #2497) — GROWTH REPORTING: WHERE THE MEETINGS WENT, AND WHAT IS WORKING.
//
// The founder's Growth room: *"Four progressed to a second step and one pattern is now strong
// enough to act on … I'd narrow the next wave there."* The review kept it — *"needs outcome data
// from F1"* and the recommendation is *"fine, as long as the client approves the change."* So the
// Reports screen gains, for Growth and above (the `growthExtras` ladder, `coaching-access.ts`):
//
//   ① PROGRESSION — how many meetings progressed to a next step, counted ONLY from the client's
//     own F1 "How did it go?" answers (`meeting-outcome.ts`). Below MIN_ANSWERED answered meetings
//     it says "too early" instead of a thin number.
//   ② PATTERNS — the What's converting findings (`whats-converting.ts`), the very same sentences
//     the Programme screen and Milla's chat show. Nothing is re-counted a second way here.
//   ③ ONE SUGGESTION, AT MOST — where the meetings that agreed a next step cluster (the same
//     "at least two, and a majority" pattern rule). It is WORDS ONLY: nothing here, and nothing
//     the screen does with it, changes the programme. The client talks it through with Milla,
//     and any change is theirs to approve.
//
// 🛑 R136 · R87 — never a rate, a percentage, the pool or a money value. Every number is a small
// whole count of the client's own answered meetings, positive replies or meetings.
// ═══════════════════════════════════════════════════════════════════════════════════════
import {
  computeWhatsConverting, readConvertingInput, roleOf, industryOf, countPhrase, tally, isPattern,
  COUNTED_MEETING, MIN_ANSWERED, TOO_EARLY,
  type ConvertingInput, type Finding, type LeadFacts,
} from './whats-converting'
import { ANSWER_LABEL, type MeetingAnswer } from './meeting-outcome'

export const PROGRESSION_TOO_EARLY = 'Too early to say — this fills in as you answer “How did it go?” after your meetings.'
export const SUGGESTION_NOTE = 'Only a suggestion. Nothing changes unless you approve it.'

const HELD: MeetingAnswer[] = ['next_step', 'not_now', 'not_fit']
/** "Held · next step agreed" → "Next step agreed": F1's own words, so the two screens agree. */
const heldWord = (a: MeetingAnswer) => {
  const w = ANSWER_LABEL[a].replace(/^Held · /, '')
  return w.charAt(0).toUpperCase() + w.slice(1)
}

export type Progression = {
  ready: boolean
  /** Meetings the client says happened (next step · not now · not a fit). */
  answered: number
  /** The breakdown, in F1's words. Empty below the minimum — never a thin number. */
  rows: Array<{ label: string; count: number }>
  text: string
}
export type Suggestion = { text: string; note: string; ask: string }
export type GrowthReport = {
  /** `null` = the F1 answers could not be read (never shown as "none"). */
  progression: Progression | null
  patterns: Finding[]
  /** Shown instead of patterns when there are none. */
  note: string | null
  suggestion: Suggestion | null
}

/** Pure: the report, from the client's own rows. Tested directly with fixtures. */
export function computeGrowthReport(input: ConvertingInput): GrowthReport {
  const meetings = input.meetings.filter(m => COUNTED_MEETING.includes(m.state))
  const answers = input.answers

  let progression: Progression | null = null
  let forwardLeads: LeadFacts[] = []
  if (answers) {
    const held = meetings.filter(m => HELD.includes(answers.get(m.id) as MeetingAnswer))
    const count = (a: MeetingAnswer) => held.filter(m => answers.get(m.id) === a).length
    if (held.length < MIN_ANSWERED) {
      progression = { ready: false, answered: held.length, rows: [], text: PROGRESSION_TOO_EARLY }
    } else {
      const forward = count('next_step')
      progression = {
        ready: true, answered: held.length,
        rows: HELD.map(a => ({ label: heldWord(a), count: count(a) })),
        text: forward === 0
          ? `None of your ${held.length} answered meetings has progressed to a next step yet.`
          : `${countPhrase(forward, held.length, 'answered meetings')} progressed to a next step.`,
      }
      const leadById = new Map(input.leads.map(l => [l.id, l]))
      forwardLeads = held.filter(m => answers.get(m.id) === 'next_step')
        .map(m => (m.leadId ? leadById.get(m.leadId) : undefined)).filter((l): l is LeadFacts => !!l)
    }
  }

  // ② The What's converting findings, minus the one ① already says in full.
  const v = computeWhatsConverting(input)
  const patterns = v.ready ? v.findings.filter(f => f.kind !== 'moved_forward') : []

  // ③ One suggestion, only where the next steps cluster: role first, then industry.
  let suggestion: Suggestion | null = null
  for (const [key, who] of [
    [(l: LeadFacts) => roleOf(l.job_title), (g: string) => `${g} leads`],
    [(l: LeadFacts) => industryOf(l.industry), (g: string) => `${g} companies`],
  ] as const) {
    const t = tally(forwardLeads, key)
    if (t.top && isPattern(t.top[1], t.total)) {
      const group = who(t.top[0])
      suggestion = {
        text: `Aim the next wave more at ${group} — that is where your next steps are coming from.`,
        note: SUGGESTION_NOTE,
        ask: `Should we aim the next wave more at ${group}?`,
      }
      break
    }
  }

  return { progression, patterns, note: patterns.length ? null : TOO_EARLY, suggestion }
}

export type GrowthReportResult =
  | { ok: true; report: GrowthReport | null }
  | { ok: false; status: 503; error: string }

/**
 * The gate and the read, in one place. Not on the plan (Founders without Full Coaching, or no
 * programme) is `report: null` — the Reports screen simply has no such section, the same quiet
 * What's converting keeps with Founders. A failed read is a 503, never an empty report.
 */
export async function growthReportFor(clientId: string): Promise<GrowthReportResult> {
  const { coachingAccessFor } = await import('./coaching-access')
  const access = await coachingAccessFor(clientId)
  if (!access.growthExtras) return { ok: true, report: null }
  const input = await readConvertingInput(clientId)
  if (!input) return { ok: false, status: 503, error: "We couldn't read your meetings just now. Nothing has changed." }
  return { ok: true, report: computeGrowthReport(input) }
}
