// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (Coaching F1 · #2483 · R180 Q4) — "HOW DID IT GO?" AFTER EVERY MEETING, EVERY PLAN.
//
// After a meeting's time has passed, the client is asked once, on the Meetings screen, how it
// went: next step agreed · interested, not now · not a fit · they didn't show — plus one optional
// line. It is the first thing every Coaching feature and the 25/50/75 moments learn from.
//
// WHERE THE ANSWER LIVES. `outcome_events` (event_type `meeting_outcome`), the append-only
// outcome log — no new table, no migration. The latest answer for a meeting is its answer.
// It is written HERE with its error checked, not through the fire-and-forget logger, because
// the client is shown what they answered and a silently dropped write would show them nothing.
//
// 🛑 WHAT AN ANSWER DOES TO MEETING TRUTH:
//   · next step / not now / not a fit → the meeting HAPPENED: `confirmHeld`, confirmed by the
//     client (the one person who was in the room). Never inferred from the clock.
//   · they didn't show → NOT a no-show confirmation. A client must not be able to uncount a
//     meeting by saying so; it raises a task for our team, who check it and use Vida's existing
//     absence + one-free-reschedule route (the Terms' no-show rule).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export const MEETING_ANSWERS = ['next_step', 'not_now', 'not_fit', 'no_show'] as const
export type MeetingAnswer = typeof MEETING_ANSWERS[number]

export const ANSWER_LABEL: Record<MeetingAnswer, string> = {
  next_step: 'Held · next step agreed',
  not_now:   'Held · interested, not now',
  not_fit:   'Held · not a fit',
  no_show:   "Didn't show · being checked",
}

export const OUTCOME_NOTE_MAX = 280

export type MeetingOutcome = { answer: MeetingAnswer; label: string; note: string | null; at: string }

export const isMeetingAnswer = (v: unknown): v is MeetingAnswer =>
  typeof v === 'string' && (MEETING_ANSWERS as readonly string[]).includes(v)

/**
 * Should the client be asked about this meeting? Its time has passed and nothing has settled it:
 * no answer yet, and meeting truth does not already say HELD or NO_SHOW.
 */
export function needsAnswer(m: { scheduledAt: string; state: string }, answered: boolean, now = Date.now()): boolean {
  const t = new Date(m.scheduledAt).getTime()
  return !answered && Number.isFinite(t) && t <= now && (m.state === 'BOOKED' || m.state === 'BOOKED_UNVERIFIED')
}

/** The latest answer per meeting. `null` = the read failed (never "no answers"). */
export async function latestOutcomes(clientId: string, meetingIds: string[]): Promise<Map<string, MeetingOutcome> | null> {
  const out = new Map<string, MeetingOutcome>()
  if (meetingIds.length === 0) return out
  const { data, error } = await db.from('outcome_events')
    .select('payload, occurred_at')
    .eq('client_id', clientId).eq('event_type', 'meeting_outcome')
    .in('payload->>meeting_id', meetingIds)
    .order('occurred_at', { ascending: false })
    .limit(500)
  if (error) { console.error('[meeting-outcome] read failed:', error.message); return null }
  for (const r of (data ?? []) as Array<{ payload?: Record<string, unknown> | null; occurred_at: string }>) {
    const id = String(r.payload?.meeting_id ?? '')
    const answer = r.payload?.answer
    if (!id || out.has(id) || !isMeetingAnswer(answer)) continue
    const note = typeof r.payload?.note === 'string' && r.payload.note.trim() ? r.payload.note : null
    out.set(id, { answer, label: ANSWER_LABEL[answer], note, at: r.occurred_at })
  }
  return out
}

export type RecordResult =
  | { ok: true; outcome: MeetingOutcome }
  | { ok: false; status: number; error: string }

/**
 * Record the client's answer for one of THEIR meetings. `meeting` is the row the caller has
 * already scoped to this client (see `/leads/meetings/:id/outcome`).
 */
export async function recordMeetingOutcome(input: {
  clientId: string
  meeting: { id: string; scheduledAt: string; state: string; programmeId?: string | null }
  answer: unknown
  note?: unknown
  by: string
  now?: number
}): Promise<RecordResult> {
  if (!isMeetingAnswer(input.answer)) return { ok: false, status: 400, error: 'Pick one of the four answers.' }
  const now = input.now ?? Date.now()
  const t = new Date(input.meeting.scheduledAt).getTime()
  if (!Number.isFinite(t) || t > now) return { ok: false, status: 400, error: "This meeting hasn't happened yet." }
  if (input.meeting.state === 'NO_SHOW') return { ok: false, status: 409, error: 'This meeting is already recorded as a no-show.' }
  const answer = input.answer
  // Once the meeting is HELD, "didn't show" can no longer be the answer — held is confirmed once.
  if (input.meeting.state === 'HELD' && answer === 'no_show') {
    return { ok: false, status: 409, error: 'This meeting is already recorded as held.' }
  }
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, OUTCOME_NOTE_MAX) : ''
  const at = new Date(now).toISOString()

  const { error } = await db.from('outcome_events').insert({
    client_id: input.clientId, event_type: 'meeting_outcome', channel: 'milla',
    payload: { meeting_id: input.meeting.id, answer, note: note || null, by: input.by },
    occurred_at: at,
  })
  if (error) {
    console.error('[meeting-outcome] write failed:', error.message)
    return { ok: false, status: 503, error: "We couldn't save that just now. Nothing changed — please try again." }
  }

  if (answer === 'no_show') {
    // A demo account's answer is recorded and shown, but raises no task for our real team.
    const { isDemoClient } = await import('./demo')
    if (await isDemoClient(input.clientId).catch(() => false)) {
      return { ok: true, outcome: { answer, label: ANSWER_LABEL[answer], note: note || null, at } }
    }
    const { raiseOperatorTask } = await import('./operator-tasks')
    await raiseOperatorTask({
      kind: 'meeting_no_show_reported', severity: 'warn',
      clientId: input.clientId, programmeId: input.meeting.programmeId ?? null,
      subjectKind: 'meeting', subjectId: input.meeting.id,
      title: "A client says their prospect didn't show",
      detail: 'Check it, then record the absence and offer the one free reschedule from Vida (Terms: no-shows). The meeting still counts until our team confirms otherwise.',
      evidence: { meeting_id: input.meeting.id, note: note || null, reported_by: input.by },
    }).catch(err => console.error('[meeting-outcome] no-show task not raised:', err))
  } else if (input.meeting.state === 'BOOKED' || input.meeting.state === 'BOOKED_UNVERIFIED') {
    const { confirmHeld } = await import('./meeting-truth')
    const r = await confirmHeld(input.meeting.id, `client:${input.by}`)
    if (!r.ok) console.error('[meeting-outcome] held not confirmed:', r.refused.message)
  }
  return { ok: true, outcome: { answer, label: ANSWER_LABEL[answer], note: note || null, at } }
}
