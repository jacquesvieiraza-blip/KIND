// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 · #2516) — 25% · FOUNDERS: A TASTE OF COACHING, BUILT FROM ONE REAL MEETING.
//
// The founder's room, verbatim: *"Render one follow-up / deal-coach example from an actual
// delivered meeting. No purchase CTA yet."* · *"Demonstration uses an actual meeting, not fake
// ROI."* · *"If the client explores the preview, Product 4 can use that context later."*
//
// WHAT IT IS: Full Coaching's own follow-up (`lib/follow-up.ts`, level `coach`) — the draft email
// plus what to confirm, the next step and the risk — written ONCE, for ONE of the client's own
// meetings that went somewhere. Same writer, same grounding, same R87 figure check. No buy button.
//
// ⚠️ ONLY: Founders, at the 25% moment, without Full Coaching. Growth already has follow-up drafts
// (its 25% is "what's included", not a taste); Enterprise owns Coaching and is never sold it.
// ⚠️ ONLY A MEETING THE CLIENT SAID WENT SOMEWHERE (F1 "next step agreed" / "interested, not now"),
// never a no-show — exactly the follow-up rule. No such meeting yet → no example, and the panel
// asks the client to answer "How did it go?" first. We never write a taste from nothing.
// ⚠️ ONE EXAMPLE PER PROGRAMME. Once a kept draft exists for one of these meetings it is shown
// again; the button never makes a second model call. Pressing it is remembered as 25% `engaged`.
// It is stored where every follow-up is (`outcome_events` · `follow_up_draft`), so the Meetings
// screen keeps hiding it from Founders (`forLevel('none')` is null) — no migration, nothing new.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import type { FollowUpDraft } from './follow-up'
import type { MeetingOutcome } from './meeting-outcome'
import type { MomentView } from './expansion-moments'

export type TasteMeeting = { id: string; name: string; company: string | null }
export type Taste = { meeting: TasteMeeting | null; example: FollowUpDraft | null }

type Row = { id: string; leadId: string | null; state: string }

/** Is this the moment for a taste? Founders, 25%, Full Coaching not on. Pure. */
export const tasteApplies = (v: Pick<MomentView, 'milestone' | 'plan' | 'coachingActive'> | null): boolean =>
  !!v && v.milestone === 25 && v.plan === 'founders' && !v.coachingActive

/**
 * Pure: which meeting the taste is about. Rows arrive newest first. A meeting that already has a
 * kept draft wins (one example per programme — Founders cannot write follow-ups any other way);
 * otherwise the newest meeting that went somewhere.
 */
export function pickTaste(
  rows: Row[], outcomes: Map<string, Pick<MeetingOutcome, 'answer'>>, drafts: Map<string, FollowUpDraft>,
  canFollowUp: (answer: unknown) => boolean,
): { meetingId: string | null; example: FollowUpDraft | null } {
  const followable = rows.filter(r => r.state !== 'NO_SHOW' && canFollowUp(outcomes.get(r.id)?.answer))
  const done = followable.find(r => drafts.has(r.id))
  if (done) return { meetingId: done.id, example: drafts.get(done.id)! }
  return { meetingId: followable[0]?.id ?? null, example: null }
}

type Read = { rows: Row[]; meetingId: string | null; example: FollowUpDraft | null; outcome: MeetingOutcome | null }

/** The client's meetings in this programme, read the way the Meetings screen reads them. null = unreadable. */
async function readTaste(clientId: string, programmeId: string): Promise<Read | null> {
  const { meetingsForClient } = await import('./meeting-truth')
  const rows = await meetingsForClient({ clientId, programmeId, limit: 100 })
  if (!rows) return null
  const { latestOutcomes } = await import('./meeting-outcome')
  const outcomes = await latestOutcomes(clientId, rows.map(r => r.id))
  if (!outcomes) return null
  const { canFollowUp, latestFollowUps } = await import('./follow-up')
  const ids = rows.filter(r => r.state !== 'NO_SHOW' && canFollowUp(outcomes.get(r.id)?.answer)).map(r => r.id)
  const drafts = await latestFollowUps(clientId, ids)
  if (!drafts) return null
  const pick = pickTaste(rows, outcomes, drafts, canFollowUp)
  return { rows, ...pick, outcome: pick.meetingId ? outcomes.get(pick.meetingId) ?? null : null }
}

async function leadFor(clientId: string, leadId: string | null) {
  if (!leadId) return null
  const { data } = await db.from('leads').select('id, first_name, last_name, job_title, company')
    .eq('id', leadId).eq('client_id', clientId).maybeSingle()
  return (data as { id: string; first_name: string | null; last_name: string | null; job_title: string | null; company: string | null } | null) ?? null
}
const nameOf = (l: { first_name: string | null; last_name: string | null } | null) =>
  (l ? [l.first_name, l.last_name].filter(Boolean).join(' ').trim() : '') || 'your prospect'

/** The taste for this moment, or null when it is not a taste moment or the meetings could not be read. */
export async function tasteFor(clientId: string, programmeId: string, view: MomentView | null): Promise<Taste | null> {
  if (!tasteApplies(view)) return null
  const r = await readTaste(clientId, programmeId)
  if (!r) return null
  if (!r.meetingId) return { meeting: null, example: null }
  const row = r.rows.find(x => x.id === r.meetingId)!
  const lead = await leadFor(clientId, row.leadId)
  return { meeting: { id: row.id, name: nameOf(lead), company: lead?.company ?? null }, example: r.example }
}

export type TasteResult = { ok: true; taste: Taste } | { ok: false; status: number; error: string }

/**
 * "Show me on a real meeting": the one example, written once. A second press returns the same one.
 * The caller passes the open programme; the moment is re-read here, never trusted from the body.
 */
export async function writeTaste(
  clientId: string, p: Parameters<typeof import('./expansion-moments').ensureMoment>[1], by: string,
  ai: () => Promise<unknown>,
): Promise<TasteResult> {
  const { ensureMoment, writeResponse } = await import('./expansion-moments')
  const view = await ensureMoment(clientId, p)
  if (!tasteApplies(view)) return { ok: false, status: 409, error: 'This moment has moved on. Refresh to see the current one.' }
  const r = await readTaste(clientId, p.id)
  if (!r) return { ok: false, status: 503, error: "We couldn't read your meetings just now. Please try again." }
  if (!r.meetingId || !r.outcome) {
    return { ok: false, status: 409, error: 'Tell us how one of your meetings went on the Meetings screen first. The example is built from it.' }
  }
  const row = r.rows.find(x => x.id === r.meetingId)!
  const lead = await leadFor(clientId, row.leadId)
  const meeting = { id: row.id, name: nameOf(lead), company: lead?.company ?? null }
  // Memory only: a failed write never blocks the example (logged in writeResponse).
  if (view!.response !== 'engaged') await writeResponse(clientId, p.id, 25, 'engaged')
  if (r.example) return { ok: true, taste: { meeting, example: r.example } }

  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, status: 503, error: 'Coaching is not configured yet' }
  // The same grounding the follow-up route gives the writer — nothing more (R87).
  const { data: reply } = lead
    // ⛓️ 25 Sep (P5d) — never our own outbound as "their own words".
    ? await db.from('figsy_replies').select('body_text, body').eq('client_id', clientId).eq('lead_id', lead.id)
      .neq('classification', 'sent_reply').order('received_at', { ascending: false }).limit(1).maybeSingle()
    : { data: null }
  const { data: me } = await db.from('clients').select('company_name').eq('id', clientId).maybeSingle()
  const { data: pitchRow } = await db.from('figsy_knowledge').select('data').eq('client_id', clientId).eq('kind', 'pitch').maybeSingle()
  const { salesContextLines } = await import('./sales-context')
  const { writeFollowUp } = await import('./follow-up')
  const w = await writeFollowUp({
    level: 'coach',
    seller: (me?.company_name as string | null) ?? null,
    prospect: { name: lead ? nameOf(lead) : 'the prospect', role: lead?.job_title ?? null, company: lead?.company ?? null },
    theirWords: (((reply as Record<string, unknown> | null)?.body_text ?? (reply as Record<string, unknown> | null)?.body ?? null) as string | null) || null,
    outcome: { answer: r.outcome.answer, note: r.outcome.note },
    sellerLines: salesContextLines((pitchRow as { data?: Record<string, unknown> | null } | null)?.data ?? null),
    clientId, meetingId: row.id, by, ai: (await ai()) as never,
  })
  if (!w.ok) return w
  return { ok: true, taste: { meeting, example: w.draft } }
}
