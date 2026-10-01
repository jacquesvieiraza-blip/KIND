// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 · Coaching #2494) — WHAT'S CONVERTING, FROM THIS CLIENT'S OWN PROGRAMME.
//
// R180 puts *What's converting* in Growth ($199) and above (Enterprise, or Full Coaching). It is a
// handful of plain-English findings about what is working in THEIR current programme: which
// roles, seniorities and industries booked meetings or replied well, which email step drew the
// positive replies, what those replies said, and (from F1 "How did it go?") which meetings moved
// forward. Nothing here is a model's opinion — every finding is counted from their own rows, so
// it is the same answer every time it is asked, on the Coaching screen (⛓️ 1 Oct, placement — ~~Programme~~) and in Milla's chat.
//
// 🛑 WHAT A FINDING MAY NEVER SAY (R136 · R87):
//   · never a percentage, a rate or a ratio — only small whole counts ("3 of your 4 meetings")
//   · never how many people we found, contacted or could contact (the pool and the limit are ours)
//   · never a money value — a finding counts outcomes, it does not price them
// The denominators below are ALWAYS positive replies or meetings, never people contacted, which
// is what makes the first two rules structural rather than a promise.
//
// ⚠️ A PATTERN NEEDS EVIDENCE. Below MIN_EVIDENCE positive outcomes (distinct people who replied
// positively or booked) the whole answer is "too early"; and a single finding needs at least two
// examples AND a majority of its group, or it is not a pattern, it is one person.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import type { MeetingAnswer } from './meeting-outcome'

/** Distinct people with a positive reply or a counted meeting, before any pattern is claimed. */
export const MIN_EVIDENCE = 3
/** Answered meetings (that happened) before F1 says anything about meetings moving forward. */
export const MIN_ANSWERED = 3
export const TOO_EARLY = 'Too early to say — this fills in as replies and meetings come in.'
export const NOT_IN_PLAN = "What's converting comes with Growth or Full Coaching."

/** The reply classifications that count as a positive reply (the recorded vocabulary, figsy.ts). */
export const POSITIVE_REPLY = ['hot', 'warm', 'interested', 'referral'] as const
const isPositive = (c: string | null | undefined) => (POSITIVE_REPLY as readonly string[]).includes(String(c ?? ''))
/** A meeting that counts here: booked or held. A no-show is not a conversion. */
// ⚑ 1 Oct (#2497 · Growth Reporting) — exported, unchanged, so the Reports screen counts the same meetings.
export const COUNTED_MEETING = ['BOOKED', 'BOOKED_UNVERIFIED', 'HELD']

export type LeadFacts = { id: string; job_title?: string | null; seniority?: string | null; industry?: string | null }
export type ReplyRow = { lead_id: string; classification: string | null; body_text?: string | null; body?: string | null; received_at: string }
export type SendRow = { lead_id: string; step: number; sent_at: string }
export type MeetingRowLite = { id: string; leadId: string | null; state: string }

export type ConvertingInput = {
  leads: LeadFacts[]
  replies: ReplyRow[]
  sends: SendRow[]
  meetings: MeetingRowLite[]
  /** Latest F1 answer per meeting id. `null` = unreadable (F1 findings are skipped, never guessed). */
  answers: Map<string, MeetingAnswer> | null
}

export type FindingKind = 'role' | 'seniority' | 'industry' | 'role_replied_not_booked' | 'step' | 'theme' | 'moved_forward' | 'forward_role'
export type Finding = { kind: FindingKind; text: string }
export type WhatsConverting = {
  ready: boolean
  findings: Finding[]
  /** Shown instead of findings when there are none. */
  note: string | null
  /** The evidence counted — positive replies and meetings, never people contacted. */
  basis: { positiveReplies: number; meetings: number }
}

// ── The plain-English groups ─────────────────────────────────────────────────────────────
// ⚑ 1 Oct — a job title becomes a FUNCTION by keyword, first match wins (C-level first, so a
// "Chief Operating Officer" is C-level rather than Operations). An unmatched title is left out of
// the count rather than forced into a group — a finding is never built on a guess.
const ROLE_RULES: Array<[RegExp, string]> = [
  [/\b(ceo|coo|cfo|cto|cio|cmo|cro|chief|founder|co-founder|owner|managing director|president)\b/i, 'C-level'],
  [/\b(operations?|ops|facilities|logistics|supply chain|fleet|maintenance|plant)\b/i, 'Operations'],
  [/\b(finance|financial|accounts?|accounting|controller|treasury)\b/i, 'Finance'],
  [/\b(sales|business development|revenue|account executive|commercial)\b/i, 'Sales'],
  [/\b(marketing|brand|growth|demand gen|communications)\b/i, 'Marketing'],
  [/\b(it|technology|engineering|engineer|software|data|digital|security|infrastructure)\b/i, 'Technology'],
  [/\b(hr|people|talent|recruit\w*|human resources)\b/i, 'People and HR'],
  [/\b(procurement|purchasing|sourcing|buyer)\b/i, 'Procurement'],
  [/\b(product)\b/i, 'Product'],
  [/\b(customer success|customer experience|support|service)\b/i, 'Customer'],
]
export function roleOf(title: string | null | undefined): string | null {
  const t = String(title ?? '').trim()
  if (!t) return null
  for (const [re, label] of ROLE_RULES) if (re.test(t)) return label
  return null
}

const SENIORITY_LABEL: Record<string, string> = {
  c_suite: 'C-level people', founder: 'founders', owner: 'owners', partner: 'partners', vp: 'VPs',
  head: 'heads of department', director: 'directors', manager: 'managers', senior: 'senior staff', entry: 'junior staff',
}
export function seniorityOf(s: string | null | undefined): string | null {
  return SENIORITY_LABEL[String(s ?? '').trim().toLowerCase()] ?? null
}

export function industryOf(s: string | null | undefined): string | null {
  const t = String(s ?? '').trim()
  return t ? t.replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : null
}

// ── Reply themes ─────────────────────────────────────────────────────────────────────────
// Only THEIR words: a reply body usually carries our own email quoted underneath, and a theme
// found in our words ("happy to jump on a call") would be a finding about ourselves.
export function ownWords(body: string | null | undefined): string {
  const b = String(body ?? '')
  const cut = b.search(/^\s*>|^On .{0,200}wrote:|^-{2,}\s*Original Message|^From:\s/im)
  return (cut >= 0 ? b.slice(0, cut) : b).trim()
}
const THEMES: Array<[string, (r: ReplyRow, words: string) => boolean]> = [
  ['asked for a call or a time to talk', (_r, w) => /\b(call|chat|meet|meeting|demo|calendar|diary|slot|catch up|speak|talk)\b/i.test(w)],
  ['asked for more detail first', (_r, w) => /\b(more (info|information|detail|details)|send (me|over|through)|how (does|would) (it|this) work|deck|brochure|case stud(y|ies)|overview)\b/i.test(w)],
  ['said the timing is right', (_r, w) => /\b(timely|good timing|perfect timing|right time|currently (looking|reviewing)|looking (at|into) this|this quarter)\b/i.test(w)],
  ['pointed to a colleague', (r, w) => r.classification === 'referral' || /\b(colleague|cc'?d|copying in|introduc\w*|the right person)\b/i.test(w)],
]

// ── Counting helpers ─────────────────────────────────────────────────────────────────────
// ⚑ 1 Oct (#2497 · Growth Reporting) — `tally` and `isPattern` are exported, unchanged, so the
// Reports screen's suggestion uses the very same "what counts as a pattern" rule as these findings.
export function tally<T>(items: T[], key: (t: T) => string | null): { total: number; top: [string, number] | null; counts: Map<string, number> } {
  const counts = new Map<string, number>()
  let total = 0
  for (const it of items) {
    const k = key(it)
    if (!k) continue
    total += 1
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  // Ties break alphabetically so the same rows always give the same sentence.
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? null
  return { total, top, counts }
}
/** A pattern: at least two, and more than half of the group that could be classified. */
export const isPattern = (n: number, total: number) => n >= 2 && n * 2 > total

/** "3 of your 4 meetings" · "Both of your meetings" · "All 3 of your meetings". */
export function countPhrase(n: number, total: number, noun: string, whose = 'your'): string {
  if (n === total) return total === 2 ? `Both of ${whose} ${noun}` : `All ${total} of ${whose} ${noun}`
  return `${n} of ${whose} ${total} ${noun}`
}

/** Pure: the findings, from the client's own rows. Tested directly with fixtures. */
export function computeWhatsConverting(input: ConvertingInput): WhatsConverting {
  const leadById = new Map(input.leads.map(l => [l.id, l]))
  const positive = new Map<string, ReplyRow>()   // first positive reply per person
  for (const r of [...input.replies].sort((a, b) => a.received_at.localeCompare(b.received_at))) {
    if (isPositive(r.classification) && r.lead_id && !positive.has(r.lead_id)) positive.set(r.lead_id, r)
  }
  const meetings = input.meetings.filter(m => COUNTED_MEETING.includes(m.state))
  const evidence = new Set<string>([...positive.keys(), ...meetings.map(m => m.leadId ?? `m:${m.id}`)])
  const basis = { positiveReplies: positive.size, meetings: meetings.length }
  if (evidence.size < MIN_EVIDENCE) return { ready: false, findings: [], note: TOO_EARLY, basis }

  const findings: Finding[] = []
  const lead = (id: string | null) => (id ? leadById.get(id) : undefined)

  // ① WHO BOOKED — meetings first: a meeting is the outcome the programme is for.
  const meetingLeads = meetings.map(m => lead(m.leadId)).filter((l): l is LeadFacts => !!l)
  const replyLeads = [...positive.keys()].map(id => lead(id)).filter((l): l is LeadFacts => !!l)
  const groups: Array<[FindingKind, (l: LeadFacts) => string | null, (label: string) => string]> = [
    ['role', l => roleOf(l.job_title), label => `${label} leads`],
    ['seniority', l => seniorityOf(l.seniority), label => label],
    ['industry', l => industryOf(l.industry), label => `${label} companies`],
  ]
  for (const [kind, key, who] of groups) {
    const m = tally(meetingLeads, key)
    if (meetings.length >= MIN_EVIDENCE && m.top && isPattern(m.top[1], m.total)) {
      findings.push({ kind, text: `${countPhrase(m.top[1], m.total, 'meetings')} came from ${who(m.top[0])}.` })
      continue
    }
    const r = tally(replyLeads, key)
    if (positive.size >= MIN_EVIDENCE && r.top && isPattern(r.top[1], r.total)) {
      findings.push({ kind, text: `${countPhrase(r.top[1], r.total, 'positive replies')} came from ${who(r.top[0])}.` })
    }
  }

  // ② REPLIED BUT NOT BOOKED — a role that answers warmly and has not yet turned into a meeting.
  if (meetings.length >= MIN_EVIDENCE) {
    const booked = new Set(meetingLeads.map(l => roleOf(l.job_title)).filter(Boolean))
    const r = tally(replyLeads, l => roleOf(l.job_title))
    const gap = [...r.counts.entries()].filter(([role, n]) => n >= 2 && !booked.has(role))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
    if (gap) findings.push({ kind: 'role_replied_not_booked', text: `${gap[0]} leads replied positively ${gap[1]} times but none has booked yet.` })
  }

  // ③ WHICH EMAIL — the last step sent to that person before their positive reply arrived.
  if (positive.size >= MIN_EVIDENCE) {
    const stepFor = (r: ReplyRow): string | null => {
      const before = input.sends.filter(s => s.lead_id === r.lead_id && s.sent_at <= r.received_at)
      if (before.length === 0) return null
      const step = Math.max(...before.map(s => Number(s.step) || 0))
      return step >= 1 && step <= 3 ? String(step) : null
    }
    const s = tally([...positive.values()], stepFor)
    if (s.top && isPattern(s.top[1], s.total)) {
      const which = s.top[0] === '1' ? 'your first email' : s.top[0] === '2' ? 'your second email' : 'your third email'
      findings.push({ kind: 'step', text: `${countPhrase(s.top[1], s.total, 'positive replies')} came after ${which}.` })
    }

    // ④ WHAT THE POSITIVE REPLIES SAID — the two most common themes, each in at least two replies.
    const themes = THEMES.map(([label, test]) => [label, [...positive.values()].filter(r => test(r, ownWords(r.body_text ?? r.body))).length] as const)
      .filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2)
    for (const [label, n] of themes) findings.push({ kind: 'theme', text: `${countPhrase(n, positive.size, 'positive replies')} ${label}.` })
  }

  // ⑤ WHICH MEETINGS MOVED FORWARD (F1). Only meetings the client says happened.
  if (input.answers) {
    const held = meetings.filter(m => {
      const a = input.answers!.get(m.id)
      return a === 'next_step' || a === 'not_now' || a === 'not_fit'
    })
    if (held.length >= MIN_ANSWERED) {
      const forward = held.filter(m => input.answers!.get(m.id) === 'next_step')
      findings.push({ kind: 'moved_forward', text: forward.length === 0
        ? `None of your ${held.length} meetings so far has agreed a next step yet.`
        : `${countPhrase(forward.length, held.length, 'meetings')} so far agreed a next step.` })
      const f = tally(forward.map(m => lead(m.leadId)).filter((l): l is LeadFacts => !!l), l => roleOf(l.job_title))
      if (f.top && isPattern(f.top[1], f.total)) {
        findings.push({ kind: 'forward_role', text: `${countPhrase(f.top[1], f.total, 'meetings that agreed a next step')} were with ${f.top[0]} leads.` })
      }
    }
  }

  return { ready: true, findings, note: findings.length ? null : TOO_EARLY, basis }
}

/**
 * Milla's chat reads the SAME findings (the "What's working?" quick reply), so the screen and
 * the chat can never disagree. Empty when there is nothing to add.
 */
export function describeWhatsConverting(v: WhatsConverting | null | undefined): string {
  if (!v) return ''
  // ⛓️ 1 Oct (placement) — the section moved to the Coaching screen. WAS ~~"their Programme screen shows"~~.
  const head = "WHAT'S CONVERTING IN THIS CLIENT'S PROGRAMME (counted from their own replies and meetings — the same findings their Coaching screen shows; when they ask what's working, answer from these, in these counts, and never as a percentage or rate):"
  if (!v.ready || v.findings.length === 0) return `${head}\n- ${TOO_EARLY}`
  return [head, ...v.findings.map(f => `- ${f.text}`)].join('\n')
}

// ── The read ─────────────────────────────────────────────────────────────────────────────

/** The client's own rows for their current programme. `null` = a read failed (never "nothing"). */
export async function readConvertingInput(clientId: string): Promise<ConvertingInput | null> {
  const { currentOutreachLeads } = await import('./current-outreach')
  const scope = await currentOutreachLeads(clientId)
  if (scope.mode === 'unreadable') return null
  if (scope.mode === 'none') return { leads: [], replies: [], sends: [], meetings: [], answers: new Map() }

  const { meetingsForClient } = await import('./meeting-truth')
  const [meetingRows, replyRes] = await Promise.all([
    meetingsForClient({ clientId, ...(scope.mode === 'ids' ? { programmeId: scope.programmeId } : {}), limit: 100 }),
    // ⚠️ Our own outbound (`sent_reply`) is never "their reply". Filtered to the programme's
    // people in memory, not with a 400-id IN list in the URL.
    db.from('figsy_replies').select('lead_id, classification, body_text, body, received_at')
      .eq('client_id', clientId).neq('classification', 'sent_reply')
      .order('received_at', { ascending: false }).limit(500),
  ])
  if (meetingRows === null || replyRes.error) return null
  const inScope = scope.mode === 'ids' ? new Set(scope.ids) : null
  const replies = ((replyRes.data ?? []) as ReplyRow[]).filter(r => !inScope || inScope.has(r.lead_id))
  const positiveIds = [...new Set(replies.filter(r => isPositive(r.classification)).map(r => r.lead_id))]
  const meetingLeadIds = meetingRows.map(m => m.leadId).filter((v): v is string => !!v)
  const leadIds = [...new Set([...positiveIds, ...meetingLeadIds])]

  const { latestOutcomes } = await import('./meeting-outcome')
  const [leadRes, sendRes, outcomes] = await Promise.all([
    leadIds.length ? db.from('leads').select('id, job_title, seniority, industry').eq('client_id', clientId).in('id', leadIds)
      : Promise.resolve({ data: [], error: null }),
    positiveIds.length ? db.from('figsy_sent_emails').select('lead_id, step, sent_at').in('lead_id', positiveIds)
      : Promise.resolve({ data: [], error: null }),
    latestOutcomes(clientId, meetingRows.map(m => m.id)),
  ])
  if (leadRes.error || sendRes.error) return null
  const answers = outcomes === null ? null : new Map([...outcomes.entries()].map(([id, o]) => [id, o.answer]))
  return {
    leads: (leadRes.data ?? []) as LeadFacts[], replies, sends: (sendRes.data ?? []) as SendRow[],
    meetings: meetingRows.map(m => ({ id: m.id, leadId: m.leadId, state: m.state })), answers,
  }
}

export type ConvertingResult =
  | { ok: true; data: WhatsConverting }
  | { ok: false; status: 403 | 503; error: string }

/** The gate and the read, in one place: the route and Milla's chat both ask this. */
export async function whatsConvertingFor(clientId: string): Promise<ConvertingResult> {
  const { coachingAccessFor } = await import('./coaching-access')
  const access = await coachingAccessFor(clientId)
  if (!access.growthExtras) return { ok: false, status: 403, error: NOT_IN_PLAN }
  const input = await readConvertingInput(clientId)
  if (!input) return { ok: false, status: 503, error: "We couldn't read what's converting just now. Nothing has changed." }
  return { ok: true, data: computeWhatsConverting(input) }
}
