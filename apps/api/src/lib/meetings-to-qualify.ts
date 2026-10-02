// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R189 ⑤ · card #2557 · sending fix #11b) — EVERY UNQUALIFIED MEETING IS ON VIDA'S LIST.
//
// The founder (R189 ⑤): *"a 'qualify this meeting' task follows"*.
//
// 🛑 WHAT WAS WRONG. Only a qualified meeting counts as delivered (R141 · `programmeDelivery`),
// and nothing asked anyone to qualify one. Until somebody remembered, the client's meetings
// against target, the 25/50/75% moments and settlement all read 0.
//
// NOW: every booked or held meeting nobody has qualified is counted per client — DERIVED from
// the meetings table on every read, so it cannot be missed by an event that did not fire, and
// it disappears the moment the meeting is qualified. House is listed like any client (R187 ①:
// House is tracked); the demo is not.
//
// ⚠️ THE DATE IS THE CLIENT'S, NOT OURS. R141 gives the client 3 business days from BOOKING to
// challenge a meeting (`addBusinessDays(booked_at, …)`, the same sum `qualifyMeeting` stamps), and
// that clock runs whether or not we have qualified it — so the line names the soonest such date,
// and turns urgent a day before it.
//
// ⚠️ A FAILED READ IS SAID OUT LOUD. An empty list from a broken query would read as "nothing to
// qualify", which is the silence this exists to end.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'
import { addBusinessDays, CHALLENGE_BUSINESS_DAYS } from './meeting-qualification'

export type MeetingsToQualify = { clientId: string; count: number; soonestDeadline: string }

/** Booked or held — the meetings a person still has to qualify. A no-show is ruled on, not qualified here. */
const AWAITING_QUALIFICATION = ['BOOKED', 'BOOKED_UNVERIFIED', 'HELD']

export async function meetingsToQualify(excludeClientIds: ReadonlySet<string>): Promise<{ rows: MeetingsToQualify[]; degraded: string | null }> {
  const { data, error } = await db.from('meetings')
    .select('id, client_id, booked_at, state')
    .is('qualified_at', null)
    .is('excluded_reason', null)
    .is('superseded_by', null)
    .in('state', AWAITING_QUALIFICATION)
    .limit(2000)
  if (error) {
    return { rows: [], degraded: `Meetings waiting to be qualified could not be checked (${error.message}). An empty list does NOT mean none are waiting.` }
  }
  const byClient = new Map<string, { count: number; soonest: number }>()
  for (const m of (data ?? []) as { client_id: string | null; booked_at: string | null }[]) {
    if (!m.client_id || excludeClientIds.has(m.client_id) || !m.booked_at) continue
    const deadline = addBusinessDays(new Date(m.booked_at), CHALLENGE_BUSINESS_DAYS).getTime()
    const entry = byClient.get(m.client_id)
    if (entry) { entry.count++; entry.soonest = Math.min(entry.soonest, deadline) }
    else byClient.set(m.client_id, { count: 1, soonest: deadline })
  }
  return {
    rows: [...byClient].map(([clientId, e]) => ({ clientId, count: e.count, soonestDeadline: new Date(e.soonest).toISOString() })),
    degraded: null,
  }
}

/** What Vida's Needs-you row says, and how loudly. Pure. */
export function meetingsToQualifyAlert(
  m: { count: number; soonestDeadline: string },
  now: Date,
): { label: string; severity: 'high' | 'normal' } {
  const deadline = new Date(m.soonestDeadline)
  const day = deadline.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' }).replace(',', '')
  const what = `${m.count} meeting${m.count === 1 ? '' : 's'} to qualify — only qualified meetings count.`
  const msLeft = deadline.getTime() - now.getTime()
  if (msLeft <= 0) {
    return { label: `${what} The client's 3-day window to challenge the soonest one already closed on ${day}.`, severity: 'high' }
  }
  return {
    label: `${what} Qualify by ${day} so the client keeps their 3-day window to challenge.`,
    severity: msLeft <= 24 * 3_600_000 ? 'high' : 'normal',
  }
}
