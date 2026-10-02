// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R189 ⑤ · card #2556 · sending fix #11a) — RECORD A MEETING AGREED BY EMAIL.
//
// The founder (R189 ⑤): *"Vida gets a 'Record meeting' control for a time agreed by email."*
//
// 🛑 WHAT WAS WRONG. Nothing in Vida could turn a prospect's "yes, Tuesday at 10" into a meeting.
// The one writer, `/figsy/replies/:id/mark-booked`, is called only from the retired /dashboard
// page — and it records the PRESS time, because nobody was asked when the meeting is. So
// meetings booked read 0 for House and every client, and everything that counts meetings
// ("How did it go?", the 25/50/75% moments, coaching, settlement) read 0 with it.
//
// NOW: the operator picks the agreed time on the reply, and this records it through
// `recordBooking` — the one meeting writer — against the reply's own prospect, attributed to
// its programme by the enrolment (`resolveBookingAttribution`), never guessed.
//
// ⚠️ IT IS "BOOKED, NOT YET ON A CALENDAR" (`BOOKED_UNVERIFIED`) BY CONSTRUCTION. No calendar
// event id is passed, because none exists: a time agreed by email is an agreement, not a proven
// calendar entry, and `recordBooking` derives the state from that proof.
//
// ⚠️ NOTHING IS STAMPED UNTIL THE MEETING EXISTS. A refused booking (a second meeting for the
// same prospect, an unreadable table) leaves the reply, the outcome log and the campaign
// counters exactly as they were.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export type RecordMeetingResult =
  | { ok: true; meetingId: string; scheduledAt: string; state: string; programmeId: string | null; leadId: string }
  | { ok: false; status: number; error: string }

export async function recordMeetingFromReply(a: {
  clientId: string
  replyId: string
  scheduledAt: string
}): Promise<RecordMeetingResult> {
  const at = new Date(a.scheduledAt)
  if (!a.scheduledAt || isNaN(at.getTime())) {
    return { ok: false, status: 400, error: 'Pick the date and time the meeting was agreed for.' }
  }

  const { data: reply, error: readErr } = await db.from('figsy_replies')
    .select('id, lead_id, campaign_id, meeting_booked_at')
    .eq('id', a.replyId).eq('client_id', a.clientId)
    .maybeSingle()
  if (readErr) return { ok: false, status: 500, error: `The reply could not be read, so nothing was recorded: ${readErr.message}` }
  if (!reply) return { ok: false, status: 404, error: 'Reply not found for this client.' }
  const r = reply as { id: string; lead_id: string | null; campaign_id: string | null; meeting_booked_at: string | null }
  if (!r.lead_id) {
    return { ok: false, status: 422, error: 'This reply is not linked to a prospect, so a meeting cannot be recorded against anyone.' }
  }

  const { resolveBookingAttribution, recordBooking } = await import('./meeting-truth')
  const attribution = await resolveBookingAttribution(r.lead_id)
  const booked = await recordBooking({
    clientId: a.clientId,
    leadId: r.lead_id,
    scheduledAt: at.toISOString(),
    campaignId: attribution.campaignId ?? r.campaign_id ?? null,
    enrollmentId: attribution.enrollmentId,
    programmeId: attribution.programmeId,
  })
  if (!booked.ok) {
    if (booked.refused.reason === 'already_booked') {
      return { ok: false, status: 409, error: 'This prospect already has a meeting booked. To change its time, use Reschedule on the meeting in Vida.' }
    }
    return { ok: false, status: 500, error: booked.refused.message }
  }

  // The meeting exists — now, and only now, the reply and the counts follow it.
  if (!r.meeting_booked_at) {
    const { error: stampErr } = await db.from('figsy_replies')
      .update({ meeting_booked_at: new Date().toISOString() })
      .eq('id', r.id).eq('client_id', a.clientId)
    if (stampErr) console.error(`[record-meeting] meeting ${booked.meeting.id} recorded, but reply ${r.id} could not be marked booked: ${stampErr.message}`)
  }
  try {
    const { logOutcomeEvent } = await import('./outcomes')
    await logOutcomeEvent({
      client_id: a.clientId,
      campaign_id: r.campaign_id ?? null,
      event_type: 'meeting_booked',
      channel: 'email',
      payload: { reply_id: r.id, meeting_id: booked.meeting.id, recorded_in: 'vida' },
    })
    if (r.campaign_id) {
      const { recomputeCampaignCounters } = await import('./figsy')
      await recomputeCampaignCounters(r.campaign_id)
    }
    const { emitSignal } = await import('../routes/signals')
    void emitSignal(a.clientId, 'figsy', 'meeting_booked', { reply_id: r.id, campaign_id: r.campaign_id ?? null })
  } catch (err) {
    // The meeting is real and recorded; a missed counter is reported, never a failed press.
    console.error(`[record-meeting] meeting ${booked.meeting.id} recorded; a follow-on update failed:`, err)
  }

  return {
    ok: true,
    meetingId: booked.meeting.id,
    scheduledAt: booked.meeting.scheduled_at,
    state: booked.meeting.state,
    programmeId: attribution.programmeId,
    leadId: r.lead_id,
  }
}
