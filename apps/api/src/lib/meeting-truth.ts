// ═══════════════════════════════════════════════════════════════════════════════════════
// MEETING TRUTH — the ONE place a meeting is created, moved, confirmed or excluded.
//
// THE LOCKED MODEL (founder, 29 Aug):
//
//   public.meetings                    sole meeting STATE and COUNT truth
//   figsy_campaigns.meetings_booked    derived cache ONLY — recomputed from public.meetings,
//                                      never incremented directly
//   figsy_replies.meeting_booked_at    RETAINED AS HISTORY — stamped where it always was,
//                                      never read for count or state truth
//   logOutcomeEvent                    append-only telemetry — never creates or reconciles
//                                      meeting truth
//
// WHY A WRITE LAYER AND NOT JUST A TABLE. The old shape was a nullable timestamp on a reply
// row, and six call sites each re-derived "is this a meeting?" as `if (r.meeting_booked_at)
// n++`. Six answers to one question is how a count drifts: none of them could exclude a
// duplicate, none could tell HELD from NO_SHOW, and a reschedule counted twice in all of
// them. The database now refuses a meaningless row (CHECK constraints and the live-booking
// unique index in 20260829_meetings.sql); this module is what stops a MEANINGFUL row being
// written the wrong way.
//
// ⚠️ EVERY WRITE TO public.meetings GOES THROUGH HERE. `meeting-truth-confinement` in the
// test suite fails the build if a `.from('meetings')` write appears anywhere else.
//
// ⚠️ THIS MODULE MAKES NO LEGAL CLAIM. Erasure behaviour lives in the database trigger, and
// #704 (retention duration) remains unresolved and untouched.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

/** The four states, exactly as the CHECK constraint spells them. */
export type MeetingState = 'BOOKED' | 'BOOKED_UNVERIFIED' | 'HELD' | 'NO_SHOW'

/** Why a real row does not count. Never a reason to delete it — the evidence stays. */
export type MeetingExclusion = 'duplicate' | 'spam' | 'outside_icp'

export interface MeetingRow {
  id: string
  client_id: string
  lead_id: string | null
  campaign_id: string | null
  enrollment_id: string | null
  programme_id: string | null
  state: MeetingState
  google_event_id: string | null
  scheduled_at: string
  booked_at: string
  verified_at: string | null
  held_confirmed_at: string | null
  no_show_confirmed_at: string | null
  confirmed_by: string | null
  rescheduled_from: string | null
  superseded_by: string | null
  excluded_reason: MeetingExclusion | null
  excluded_at: string | null
  excluded_note: string | null
}

/**
 * A refusal that is NOT an error.
 *
 * `already_booked` is the normal, expected answer when two replies race for the same lead —
 * the database's live-booking unique index picked a winner and this is the loser being told
 * so. Reporting it as a failure would make an operator try to "fix" a correctly-prevented
 * double booking.
 */
export type MeetingRefusal =
  | { reason: 'already_booked'; message: string }
  | { reason: 'not_found'; message: string }
  | { reason: 'illegal_transition'; message: string }
  | { reason: 'storage_unreadable'; message: string }

export type MeetingResult =
  | { ok: true; meeting: MeetingRow }
  | { ok: false; refused: MeetingRefusal }

const MEETING_COLUMNS =
  'id, client_id, lead_id, campaign_id, enrollment_id, programme_id, state, google_event_id, ' +
  'scheduled_at, booked_at, verified_at, held_confirmed_at, no_show_confirmed_at, confirmed_by, ' +
  'rescheduled_from, superseded_by, excluded_reason, excluded_at, excluded_note'

/** Postgres unique-violation. The house idiom for "somebody else got there first". */
function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === '23505'
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// BOOKING
// ═══════════════════════════════════════════════════════════════════════════════════════

export interface RecordBookingParams {
  clientId: string
  leadId: string | null
  scheduledAt: string
  campaignId?: string | null
  enrollmentId?: string | null
  programmeId?: string | null
  /**
   * The Google event id, present ONLY when the calendar write actually succeeded.
   *
   * ⚠️ ITS PRESENCE IS THE VERIFICATION. Passing an id we did not get back from Google — or
   * inventing one so the row looks tidy — would claim a calendar entry that does not exist,
   * which is the precise failure BOOKED_UNVERIFIED was created to make impossible.
   */
  googleEventId?: string | null
}

/**
 * Record a booking.
 *
 * The state is DERIVED, never passed in: an event id means the calendar confirmed it
 * (`BOOKED`), no event id means the prospect accepted but we cannot prove the calendar
 * entry (`BOOKED_UNVERIFIED`). A caller cannot ask for `BOOKED` without the proof, because
 * a caller in a hurry is exactly who would.
 */
/**
 * Which campaign and which programme a booking belongs to — both read from ONE enrolment row.
 *
 * ⛓️ 9 Sep — `meetings.programme_id` EXISTED AND NOTHING EVER POPULATED IT. Both booking
 * writers left it NULL, so a real prospect booking off a programme's own sequence produced a
 * meeting that belonged to no programme. Every programme-scoped report then counted zero: the
 * outcome the client is buying was invisible in the product that sold it to them.
 *
 * 🛑 THE ENROLMENT IS THE ATTRIBUTION TRUTH, and it is the only honest source. A programme
 * cannot be inferred from the client (they may have had several), from the lead (it may
 * predate the programme), or from "the newest programme" (that is a guess wearing a fact's
 * clothes). The enrolment is the row that says *this person is being worked, under this
 * campaign, for this programme* — it is written at preparation and it carries both ids.
 *
 * ⚠️ BOTH FACTS COME FROM THE SAME ROW. Resolving them separately is how a booking ends up with
 * one enrolment's campaign and another's programme — a record that describes work nobody did.
 *
 * ⚠️ NULL IS AN HONEST ANSWER. A lead with no enrolment at all — a legacy booking, a manual
 * one — belongs to no programme, and inventing one would manufacture a certainty we do not
 * have. It is left NULL, exactly as it is today.
 */
export async function resolveBookingAttribution(
  leadId: string, enrollmentId?: string | null,
): Promise<{ enrollmentId: string | null; campaignId: string | null; programmeId: string | null }> {
  const none = { enrollmentId: enrollmentId ?? null, campaignId: null, programmeId: null }
  const read = async (col: 'id' | 'lead_id', val: string) => {
    const q = db.from('figsy_enrollments').select('id, campaign_id, programme_id').eq(col, val)
    // The named enrolment when we have one; otherwise the lead's most recent, which is the
    // same row the campaign lookup has always used — extended, not replaced.
    const { data } = col === 'id'
      ? await q.maybeSingle()
      : await q.order('enrolled_at', { ascending: false }).limit(1).maybeSingle()
    return (data ?? null) as { id: string; campaign_id: string | null; programme_id: string | null } | null
  }

  try {
    let row = enrollmentId ? await read('id', enrollmentId) : null
    if (!row) row = await read('lead_id', leadId)
    if (!row) return none
    return {
      enrollmentId: enrollmentId ?? row.id ?? null,
      campaignId: row.campaign_id ?? null,
      programmeId: row.programme_id ?? null,
    }
  } catch (err) {
    // ⚠️ A FAILED READ IS NOT "NO PROGRAMME". It is reported and the booking still records —
    // losing the attribution is bad; losing the prospect's accepted time is worse.
    console.error(`[meeting-truth] booking attribution could not be resolved for lead ${leadId}:`, err)
    return none
  }
}

export async function recordBooking(params: RecordBookingParams): Promise<MeetingResult> {
  const verified = !!params.googleEventId
  const now = new Date().toISOString()

  const { data, error } = await db.from('meetings').insert({
    client_id:       params.clientId,
    lead_id:         params.leadId,
    campaign_id:     params.campaignId ?? null,
    enrollment_id:   params.enrollmentId ?? null,
    programme_id:    params.programmeId ?? null,
    state:           verified ? 'BOOKED' : 'BOOKED_UNVERIFIED',
    google_event_id: params.googleEventId ?? null,
    scheduled_at:    params.scheduledAt,
    verified_at:     verified ? now : null,
  }).select(MEETING_COLUMNS).single()

  if (error) {
    // The live-booking unique index did its job: this lead already has a booking that is
    // neither superseded nor excluded. Two replies arrived at once and one of them lost.
    if (isUniqueViolation(error)) {
      return { ok: false, refused: {
        reason: 'already_booked',
        message: 'This lead already has a live booking — the concurrent one was refused by the database, not lost.',
      } }
    }
    // ⚠️ FAIL LOUD. supabase-js returns { error } rather than throwing, and the recurring
    // defect in this repo is a call site reading `.data ?? []` and treating a rejected query
    // as an empty truth. A meeting we failed to record must never look like a meeting that
    // did not happen.
    console.error('[meeting-truth] recordBooking failed:', error.message)
    return { ok: false, refused: {
      reason: 'storage_unreadable',
      message: `The meeting could not be recorded: ${error.message}`,
    } }
  }

  return { ok: true, meeting: data as unknown as MeetingRow }
}

/**
 * Promote a BOOKED_UNVERIFIED meeting once the calendar entry is proven.
 *
 * This is the second half of the fallback: a booking taken while Google was unreachable is
 * not abandoned, it is recorded honestly and reconciled when the event id arrives.
 */
export async function verifyBooking(meetingId: string, googleEventId: string): Promise<MeetingResult> {
  const { data: existing, error: readErr } = await db.from('meetings')
    .select(MEETING_COLUMNS).eq('id', meetingId).maybeSingle()

  if (readErr) {
    console.error('[meeting-truth] verifyBooking read failed:', readErr.message)
    return { ok: false, refused: { reason: 'storage_unreadable', message: readErr.message } }
  }
  if (!existing) {
    return { ok: false, refused: { reason: 'not_found', message: `No meeting ${meetingId}.` } }
  }

  const row = existing as unknown as MeetingRow
  if (row.state !== 'BOOKED_UNVERIFIED') {
    return { ok: false, refused: {
      reason: 'illegal_transition',
      message: `Only a BOOKED_UNVERIFIED meeting is verified — this one is ${row.state}.`,
    } }
  }

  const { data, error } = await db.from('meetings').update({
    state:           'BOOKED',
    google_event_id: googleEventId,
    verified_at:     new Date().toISOString(),
    updated_at:      new Date().toISOString(),
  }).eq('id', meetingId).select(MEETING_COLUMNS).single()

  if (error) {
    // A duplicate event id means this calendar event is already on another meeting row.
    if (isUniqueViolation(error)) {
      return { ok: false, refused: {
        reason: 'already_booked',
        message: `Calendar event ${googleEventId} is already recorded against another meeting.`,
      } }
    }
    console.error('[meeting-truth] verifyBooking failed:', error.message)
    return { ok: false, refused: { reason: 'storage_unreadable', message: error.message } }
  }

  return { ok: true, meeting: data as unknown as MeetingRow }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// OUTCOME — HELD and NO_SHOW, both by EXPLICIT confirmation only
//
// ⚠️ NEITHER IS EVER INFERRED FROM THE CLOCK. A meeting whose time has passed is not
// evidence that anyone attended it, and the database refuses the row without its stamp
// anyway (meetings_held_requires_confirmation / meetings_no_show_requires_confirmation).
// `confirmedBy` records WHO said so, because "the system decided" is not a confirmation.
// ═══════════════════════════════════════════════════════════════════════════════════════

async function confirmOutcome(
  meetingId: string,
  state: 'HELD' | 'NO_SHOW',
  confirmedBy: string,
): Promise<MeetingResult> {
  const { data: existing, error: readErr } = await db.from('meetings')
    .select(MEETING_COLUMNS).eq('id', meetingId).maybeSingle()

  if (readErr) {
    console.error('[meeting-truth] confirmOutcome read failed:', readErr.message)
    return { ok: false, refused: { reason: 'storage_unreadable', message: readErr.message } }
  }
  if (!existing) {
    return { ok: false, refused: { reason: 'not_found', message: `No meeting ${meetingId}.` } }
  }

  const row = existing as unknown as MeetingRow
  if (row.state === 'HELD' || row.state === 'NO_SHOW') {
    return { ok: false, refused: {
      reason: 'illegal_transition',
      message: `This meeting is already settled as ${row.state} — an outcome is confirmed once.`,
    } }
  }

  const now = new Date().toISOString()
  // Only the stamp for THIS outcome is written; the other stays NULL. The database refuses
  // a row carrying both (meetings_not_both_outcomes), so a mistake here fails loudly rather
  // than producing a meeting that both happened and did not.
  const { data, error } = await db.from('meetings').update({
    state,
    held_confirmed_at:    state === 'HELD'    ? now : null,
    no_show_confirmed_at: state === 'NO_SHOW' ? now : null,
    confirmed_by:         confirmedBy,
    updated_at:           now,
  }).eq('id', meetingId).select(MEETING_COLUMNS).single()

  if (error) {
    console.error('[meeting-truth] confirmOutcome failed:', error.message)
    return { ok: false, refused: { reason: 'storage_unreadable', message: error.message } }
  }
  return { ok: true, meeting: data as unknown as MeetingRow }
}

/** The meeting happened. Confirmed by a person or a named process, never by the clock. */
export function confirmHeld(meetingId: string, confirmedBy: string): Promise<MeetingResult> {
  return confirmOutcome(meetingId, 'HELD', confirmedBy)
}

/** The prospect did not attend. Same rule: somebody says so, nothing infers it. */
export function confirmNoShow(meetingId: string, confirmedBy: string): Promise<MeetingResult> {
  return confirmOutcome(meetingId, 'NO_SHOW', confirmedBy)
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// RESCHEDULE — counts ONCE
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Move a meeting to a new time.
 *
 * A reschedule INSERTS a new row and stamps the old one `superseded_by`. Both rows survive,
 * so "this meeting moved twice" stays answerable, and only the surviving row is counted —
 * `superseded_by IS NOT NULL` is excluded by every counter in this module and by the
 * live-booking unique index.
 *
 * ⚠️ ORDER MATTERS, AND IT IS THIS ORDER ON PURPOSE. The old row is superseded FIRST,
 * because the live-booking unique index permits only one non-superseded booking per lead —
 * inserting the new row first would collide with the old one and the reschedule would be
 * refused as a double booking. Superseding first also means the failure mode of a crash
 * between the two writes is a lead with NO live booking, which an operator can see and fix,
 * rather than TWO live bookings, which silently inflates the outcome count.
 */
export async function rescheduleMeeting(
  meetingId: string,
  newScheduledAt: string,
  opts: { googleEventId?: string | null } = {},
): Promise<MeetingResult> {
  const { data: existing, error: readErr } = await db.from('meetings')
    .select(MEETING_COLUMNS).eq('id', meetingId).maybeSingle()

  if (readErr) {
    console.error('[meeting-truth] rescheduleMeeting read failed:', readErr.message)
    return { ok: false, refused: { reason: 'storage_unreadable', message: readErr.message } }
  }
  if (!existing) {
    return { ok: false, refused: { reason: 'not_found', message: `No meeting ${meetingId}.` } }
  }

  const old = existing as unknown as MeetingRow
  if (old.superseded_by) {
    return { ok: false, refused: {
      reason: 'illegal_transition',
      message: 'That meeting was already rescheduled — move the meeting that replaced it.',
    } }
  }
  if (old.state === 'HELD' || old.state === 'NO_SHOW') {
    return { ok: false, refused: {
      reason: 'illegal_transition',
      message: `A ${old.state} meeting is history and is not rescheduled — book a new meeting.`,
    } }
  }

  const now = new Date().toISOString()
  const verified = !!opts.googleEventId

  // 1 — free the lead's live-booking slot.
  //
  // ⚠️ THE SELF-STAMP IS DELIBERATE AND TEMPORARY. `superseded_by` is a foreign key into this
  // same table, so it cannot point at the replacement before the replacement exists, and the
  // replacement cannot be inserted while this row still occupies the lead's live-booking
  // slot. Pointing the row at ITSELF is the only FK-valid way to mark it superseded in the
  // gap between those two facts — and it is the RIGHT value to be wrong with, because
  // "superseded" is exactly what this row now is: it stops counting immediately, which is the
  // property that matters. Step 3 replaces it with the real pointer.
  const { error: supErr } = await db.from('meetings')
    .update({ superseded_by: meetingId, updated_at: now })
    .eq('id', meetingId)
  if (supErr) {
    console.error('[meeting-truth] rescheduleMeeting supersede failed:', supErr.message)
    return { ok: false, refused: { reason: 'storage_unreadable', message: supErr.message } }
  }

  // 2 — the replacement.
  const { data: created, error: insErr } = await db.from('meetings').insert({
    client_id:       old.client_id,
    lead_id:         old.lead_id,
    campaign_id:     old.campaign_id,
    enrollment_id:   old.enrollment_id,
    programme_id:    old.programme_id,
    state:           verified ? 'BOOKED' : 'BOOKED_UNVERIFIED',
    google_event_id: opts.googleEventId ?? null,
    scheduled_at:    newScheduledAt,
    verified_at:     verified ? now : null,
    rescheduled_from: old.id,
  }).select(MEETING_COLUMNS).single()

  if (insErr) {
    // Put the old row back so the lead is not left with no live booking.
    await db.from('meetings').update({ superseded_by: null, updated_at: now }).eq('id', meetingId)
    console.error('[meeting-truth] rescheduleMeeting insert failed:', insErr.message)
    return { ok: false, refused: { reason: 'storage_unreadable', message: insErr.message } }
  }

  const replacement = created as unknown as MeetingRow

  // 3 — point the old row at its actual replacement.
  const { error: linkErr } = await db.from('meetings')
    .update({ superseded_by: replacement.id, updated_at: now }).eq('id', meetingId)
  if (linkErr) {
    // The chain is imperfect but the COUNT is already correct — the old row is superseded
    // either way, so nothing is double-counted. Logged, not thrown.
    console.error('[meeting-truth] rescheduleMeeting link failed (count is still correct):', linkErr.message)
  }

  return { ok: true, meeting: replacement }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// EXCLUSION — a real row that does not count
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Exclude a meeting from the outcome count without destroying it.
 *
 * A duplicate, a spam booking or a prospect outside the ICP all really happened; deleting
 * them would erase the evidence of why the number moved, and "the count dropped and nobody
 * knows why" is worse than a slightly larger table.
 */
export async function excludeMeeting(
  meetingId: string,
  reason: MeetingExclusion,
  note?: string,
): Promise<MeetingResult> {
  const now = new Date().toISOString()
  const { data, error } = await db.from('meetings').update({
    excluded_reason: reason,
    excluded_at:     now,
    excluded_note:   note ?? null,
    updated_at:      now,
  }).eq('id', meetingId).select(MEETING_COLUMNS).maybeSingle()

  if (error) {
    console.error('[meeting-truth] excludeMeeting failed:', error.message)
    return { ok: false, refused: { reason: 'storage_unreadable', message: error.message } }
  }
  if (!data) {
    return { ok: false, refused: { reason: 'not_found', message: `No meeting ${meetingId}.` } }
  }
  return { ok: true, meeting: data as unknown as MeetingRow }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// COUNTING — the ONE definition
// ═══════════════════════════════════════════════════════════════════════════════════════

export interface MeetingCounts {
  /**
   * Meetings BOOKED — the product-outcome number (P v1 r21).
   *
   * ⚠️ A NO_SHOW IS COUNTED HERE, DELIBERATELY. The founder's boundary is MEETING_BOOKED,
   * not MEETING_HELD: the prospect agreed and the meeting was made. Whether they turned up
   * is a separate fact, reported separately below, and quietly dropping no-shows from the
   * booked number would make the boundary mean something it does not say.
   */
  booked: number
  /** Of those, confirmed to have happened. */
  held: number
  /** Of those, confirmed not to have. */
  noShow: number
  /** Of those, still without a proven calendar entry. */
  unverified: number
  /** Real rows deliberately outside the count: duplicate, spam, outside ICP. */
  excluded: number
}

export interface MeetingCountFilter {
  clientId?: string
  programmeId?: string
  /** ISO timestamp — meetings scheduled at or after this moment. */
  since?: string
}

/**
 * THE ONLY PLACE A MEETING COUNT IS DERIVED.
 *
 * The exclusion rules — not excluded, not superseded — are applied here once. Six call sites
 * each applying them from memory is the drift this module exists to end, and the number they
 * were each deriving is the number the entire commercial model is judged on.
 *
 * ⚠️ FAILS LOUD. Returns null on a storage error rather than zeros. A count of 0 and "we
 * could not read the meetings table" are opposite facts, and the second must never be
 * rendered as the first — the exact `.data ?? []` shape this repo keeps rediscovering.
 */
export async function meetingCounts(filter: MeetingCountFilter = {}): Promise<MeetingCounts | null> {
  let q = db.from('meetings')
    .select('state, excluded_reason, superseded_by, scheduled_at')
    .is('excluded_reason', null)
    .is('superseded_by', null)

  if (filter.clientId)    q = q.eq('client_id', filter.clientId)
  if (filter.programmeId) q = q.eq('programme_id', filter.programmeId)
  if (filter.since)       q = q.gte('scheduled_at', filter.since)

  const { data, error } = await q
  if (error) {
    console.error('[meeting-truth] meetingCounts failed:', error.message)
    return null
  }

  const rows = (data ?? []) as { state: MeetingState }[]
  const counts: MeetingCounts = {
    booked:     rows.length,
    held:       rows.filter(r => r.state === 'HELD').length,
    noShow:     rows.filter(r => r.state === 'NO_SHOW').length,
    unverified: rows.filter(r => r.state === 'BOOKED_UNVERIFIED').length,
    excluded:   0,
  }

  // Counted separately because the main query deliberately excludes them — a caller asking
  // "how many did we discount?" is asking a different question from "how many happened?".
  let ex = db.from('meetings').select('id', { count: 'exact', head: true }).not('excluded_reason', 'is', null)
  if (filter.clientId)    ex = ex.eq('client_id', filter.clientId)
  if (filter.programmeId) ex = ex.eq('programme_id', filter.programmeId)
  if (filter.since)       ex = ex.gte('scheduled_at', filter.since)
  const { count, error: exErr } = await ex
  if (exErr) {
    console.error('[meeting-truth] meetingCounts exclusion count failed:', exErr.message)
    return null
  }
  counts.excluded = count ?? 0

  return counts
}

/**
 * Recompute `figsy_campaigns.meetings_booked` FROM public.meetings.
 *
 * ⚠️ THIS REPLACES A READ-MODIFY-WRITE. The old booking path did
 * `select meetings_booked` → `update meetings_booked = value + 1` (routes/calendar.ts), which
 * is a lost update the moment two bookings land together: both read N, both write N+1, and
 * one real meeting vanishes from the cache forever with nothing to reconcile it against.
 *
 * The cache is now DERIVED, so it is self-healing: whatever it held, the next recompute makes
 * it agree with the meetings table. That is the difference between a cache and a counter —
 * a counter that drifts stays wrong, a cache that drifts is corrected on the next write.
 */
// ⚠️ THE COUNTING PREDICATE — `.is('excluded_reason', null).is('superseded_by', null)` —
// is repeated in each reader below rather than hidden behind a helper. That is deliberate:
// supabase-js query builders are chained, so a wrapper would have to be typed loosely enough
// to accept any builder, and a mistyped wrapper that silently dropped a filter would break
// every count at once with nothing to show for it in review. Repeated three times IN ONE
// MODULE is reviewable; the defect being fixed was the predicate scattered across six FILES,
// three of which had drifted. The confinement test is what keeps it to this module.

/**
 * Meeting counts for many campaigns at once.
 *
 * ⚠️ RETURNS null ON FAILURE, NEVER AN EMPTY MAP. A caller that received `{}` could not tell
 * "no campaign has a meeting" from "the query failed", and would render both as zeros.
 */
export async function campaignMeetingCounts(campaignIds: string[]): Promise<Record<string, number> | null> {
  if (campaignIds.length === 0) return {}
  const { data, error } = await db.from('meetings')
    .select('campaign_id')
    .in('campaign_id', campaignIds)
    .is('excluded_reason', null)
    .is('superseded_by', null)

  if (error) {
    console.error('[meeting-truth] campaignMeetingCounts failed:', error.message)
    return null
  }
  const out: Record<string, number> = {}
  for (const r of (data ?? []) as { campaign_id: string | null }[]) {
    if (r.campaign_id) out[r.campaign_id] = (out[r.campaign_id] ?? 0) + 1
  }
  return out
}

/** The same, keyed by client — for per-rep and per-account rollups. */
export async function clientMeetingCounts(clientIds: string[]): Promise<Record<string, number> | null> {
  if (clientIds.length === 0) return {}
  const { data, error } = await db.from('meetings')
    .select('client_id')
    .in('client_id', clientIds)
    .is('excluded_reason', null)
    .is('superseded_by', null)

  if (error) {
    console.error('[meeting-truth] clientMeetingCounts failed:', error.message)
    return null
  }
  const out: Record<string, number> = {}
  for (const r of (data ?? []) as { client_id: string }[]) {
    out[r.client_id] = (out[r.client_id] ?? 0) + 1
  }
  return out
}

export interface LiveMeeting { id: string; leadId: string; scheduledAt: string; state: MeetingState }

/** One row for the customer's Meetings page. Identity stays on `leads`; this carries none. */
export interface MeetingListRow {
  id: string
  leadId: string | null
  scheduledAt: string
  state: MeetingState
  /** True when this row REPLACED an earlier booking — the honest source of "Rescheduled". */
  rescheduled: boolean
}

/**
 * THE CUSTOMER'S MEETINGS, from the table that is the meeting truth.
 *
 * ── ⚑ 4 Sep — WHY THIS EXISTS RATHER THAN A QUERY IN THE ROUTE ──────────────────────────
 *
 * 🛑 `/leads/meetings` WAS STILL READING `calendar_bookings`, and it was the LAST customer
 * surface doing so. BUILD-003 item 2 made `public.meetings` the sole source of meeting state
 * precisely because `calendar_bookings` records what we asked Google to create and has no
 * notion of a duplicate, a spam booking or a reschedule — so a meeting moved twice appeared
 * three times on the client's own page. `/leads/pipeline` was migrated at the time and its
 * comment says why; the Meetings PAGE was left behind, which is how the rail badge (counted
 * from `public.meetings`) and the page it links to came to disagree.
 *
 * ⚠️ THE EXCLUSION RULES ARE THE MODULE'S, NOT THE CALLER'S — `excluded_reason IS NULL` and
 * `superseded_by IS NULL`, identical to `meetingCounts` two screens up, so the page and the
 * badge cannot drift. That is the whole reason this is a function here and not a select there.
 *
 * ⚠️ "RESCHEDULED" IS THE SURVIVING ROW, NOT THE DEAD ONE. A reschedule inserts a new row and
 * stamps the old one `superseded_by`; showing the old row would put the same meeting on the
 * page twice, which is the exact duplication this replaces. The live row carries
 * `rescheduled_from`, so it can say it was moved without anything being counted twice.
 *
 * ⚠️ NO_SHOW IS INCLUDED HERE, UNLIKE `liveMeetingsByLead`. That function answers "is a
 * meeting on the books for this person?" for a pipeline stage; this one is the client's
 * RECORD of their meetings, and a meeting nobody attended still happened to their diary.
 *
 * ⚠️ FAILS LOUD. `null` on a storage error, never an empty list — a client with meetings must
 * never be shown "no meetings" because a query failed.
 */
export async function meetingsForClient(filter: {
  clientId: string
  /** When present, ONLY this programme's meetings. Absent = the whole client (legacy). */
  programmeId?: string
  limit?: number
}): Promise<MeetingListRow[] | null> {
  let q = db.from('meetings')
    .select('id, lead_id, scheduled_at, state, rescheduled_from')
    .eq('client_id', filter.clientId)
    .is('excluded_reason', null)
    .is('superseded_by', null)
  if (filter.programmeId) q = q.eq('programme_id', filter.programmeId)

  const { data, error } = await q
    .order('scheduled_at', { ascending: false })
    .limit(filter.limit ?? 100)

  if (error) {
    console.error('[meeting-truth] meetingsForClient failed:', error.message)
    return null
  }
  return ((data ?? []) as Array<{
    id: string; lead_id: string | null; scheduled_at: string
    state: MeetingState; rescheduled_from: string | null
  }>).map(r => ({
    id: r.id,
    leadId: r.lead_id,
    scheduledAt: r.scheduled_at,
    state: r.state,
    rescheduled: r.rescheduled_from !== null && r.rescheduled_from !== undefined,
  }))
}

/**
 * The live meeting for each of the given leads, if any.
 *
 * "Live" means countable AND not settled as a no-show — this answers "is a meeting on the
 * books for this person?", which is what a pipeline stage and a lead card are asking. A
 * HELD meeting stays live here because it is still the meeting that happened.
 */
export async function liveMeetingsByLead(
  clientId: string,
  leadIds: string[],
): Promise<Map<string, LiveMeeting> | null> {
  if (leadIds.length === 0) return new Map()
  const { data, error } = await db.from('meetings')
    .select('id, lead_id, scheduled_at, state')
    .eq('client_id', clientId)
    .in('lead_id', leadIds)
    .is('excluded_reason', null)
    .is('superseded_by', null)
    .neq('state', 'NO_SHOW')

  if (error) {
    console.error('[meeting-truth] liveMeetingsByLead failed:', error.message)
    return null
  }
  const out = new Map<string, LiveMeeting>()
  for (const r of (data ?? []) as { id: string; lead_id: string | null; scheduled_at: string; state: MeetingState }[]) {
    if (r.lead_id) out.set(r.lead_id, { id: r.id, leadId: r.lead_id, scheduledAt: r.scheduled_at, state: r.state })
  }
  return out
}

/**
 * Which of these leads have a countable meeting on this campaign.
 *
 * Campaign-scoped rather than client-scoped because the A/B resolver holds a campaign and
 * not a client — asking it to fetch a client id first would be a round-trip bought to satisfy
 * a signature.
 */
export async function meetingLeadIdsForCampaign(
  campaignId: string,
  leadIds: string[],
): Promise<Set<string> | null> {
  if (leadIds.length === 0) return new Set()
  const { data, error } = await db.from('meetings')
    .select('lead_id')
    .eq('campaign_id', campaignId)
    .in('lead_id', leadIds)
    .is('excluded_reason', null)
    .is('superseded_by', null)

  if (error) {
    console.error('[meeting-truth] meetingLeadIdsForCampaign failed:', error.message)
    return null
  }
  const out = new Set<string>()
  for (const r of (data ?? []) as { lead_id: string | null }[]) if (r.lead_id) out.add(r.lead_id)
  return out
}

/** Every lead with a countable meeting for this client. */
export async function meetingLeadIdsForClient(clientId: string): Promise<Set<string> | null> {
  const { data, error } = await db.from('meetings')
    .select('lead_id')
    .eq('client_id', clientId)
    .is('excluded_reason', null)
    .is('superseded_by', null)

  if (error) {
    console.error('[meeting-truth] meetingLeadIdsForClient failed:', error.message)
    return null
  }
  const out = new Set<string>()
  for (const r of (data ?? []) as { lead_id: string | null }[]) if (r.lead_id) out.add(r.lead_id)
  return out
}

export async function campaignMeetingCount(campaignId: string): Promise<number | null> {
  const { data, error } = await db.from('meetings')
    .select('id')
    .eq('campaign_id', campaignId)
    .is('excluded_reason', null)
    .is('superseded_by', null)

  if (error) {
    console.error('[meeting-truth] campaignMeetingCount failed:', error.message)
    return null   // ⚠️ null, never 0 — "unreadable" and "none" are opposite facts.
  }
  return (data ?? []).length
}

export async function recomputeCampaignMeetingCache(campaignId: string): Promise<boolean> {
  const count = await campaignMeetingCount(campaignId)
  if (count === null) return false

  const { error: upErr } = await db.from('figsy_campaigns')
    .update({ meetings_booked: count })
    .eq('id', campaignId)

  if (upErr) {
    console.error('[meeting-truth] recompute write failed:', upErr.message)
    return false
  }
  return true
}
