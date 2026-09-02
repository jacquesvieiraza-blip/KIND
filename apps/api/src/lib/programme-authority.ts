// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME AUTHORITY — ONE MODULE, THREE ACTIONS. THE ONLY PLACE THIS IS DECIDED.
//
// WHAT WAS TRUE BEFORE THIS FILE. Exactly one programme gate existed, inline in
// `ensureCampaignForIcp` (start-work.ts), and it fired only when a campaign was ACTIVATED.
// It gated neither SOURCING nor SENDING. Meanwhile `programme.ts` already exported
// `mayStartCampaign` — a correct pure decision — that NOTHING consumed. So the same rule was
// written twice, in two shapes, with two different sentences for the client, and neither copy
// stood between a paused programme and an outgoing email.
//
// `cron.ts:373-377` had already written down where the fix belonged:
//     "programme authority has to be applied at each entry point, or below both in runIcpJob."
// It was never built. This is that.
//
// ═══ THE ACTION SPLIT IS LOAD-BEARING, NOT TIDINESS (founder correction, 29 Aug) ═══
//
// A single "go live" rule for everything would be WRONG in the direction that costs money:
//
//     PAYMENT 1              →  authorises SOURCING / PREPARATION
//     APPROVAL + PAYMENT 2   →  authorises GO LIVE / OUTREACH
//
// Requiring Payment 2 to SOURCE would mean we cannot prepare the programme the client has
// already half-paid for — they would be asked to approve work we were forbidden to do. And
// accepting Payment-1 authority for OUTREACH would send on a programme that has not been paid
// for and never approved. The two gates must differ, so they are separate ACTIONS over one
// shared truth rather than two functions that will drift.
//
//   SOURCING    — Payment 1 · sourcing-authorised status · not paused · not terminal
//   OUTREACH    — approval · Payment 2 · status LIVE · not paused · not terminal
//   NEXT_BATCH  — everything SOURCING needs, PLUS the review hold and remaining ceiling
//
// ═══ REVIEW HOLD ≠ PAUSE, AND COLLAPSING THEM WOULD BE A PRODUCT ERROR ═══
//
//   PAUSE  is the hard stop. No new sourcing, no new outreach, no new programme sends.
//   REVIEW is a hold on the NEXT NEW BATCH. An in-flight sequence finishes its story;
//          replies and meetings keep ingesting; history stays history.
//
// A prospect dropped halfway through a three-step sequence has been told the beginning of
// something and never the end. That is worse for the client than pausing intake, so review
// stops what has not started and never what has.
//
// ═══ LEGACY CLIENTS ARE NOT PROGRAMME CLIENTS (founder decision, 29 Aug) ═══
//
// The live commercial model is still $299 pack · 100 included · $4 per approved lead, and
// those clients have NO programme row. No programme ⇒ `mode: 'legacy'` ⇒ allowed. Forcing
// them through programme controls would break the model that is actually selling.
//
// 🛑 BUT A BROKEN LINK IS NOT LEGACY. If an execution object IS programme-linked and its
// programme cannot be resolved — a dangling `programme_id`, an unreadable row — that is
// `mode: 'unresolvable'` and it FAILS CLOSED. Falling back to legacy on a broken link is how
// a programme client's work would quietly escape every control in this file, and it would
// look exactly like an ordinary legacy send in every log.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { LEADS_PER_TARGETED_MEETING } from '@kind/shared'
import {
  type ProgrammeRow,
  type ProgrammeStatus,
  SOURCING_AUTHORISED_STATUSES,
  TERMINAL_STATUSES,
  mayStartCampaign,
  p1Authorised,
  p2Authorised,
} from './programme'

/** The three things a programme can authorise. Nothing else asks this module anything. */
export type ProgrammeAction = 'SOURCING' | 'OUTREACH' | 'NEXT_BATCH'

export type AuthorityRefusal =
  | 'programme_paused'
  | 'programme_terminal'
  | 'programme_not_sourcing_authorised'
  | 'first_payment_missing'
  | 'programme_not_live'
  | 'programme_not_approved'
  | 'second_payment_missing'
  | 'review_required'
  | 'sourcing_ceiling_reached'
  /** ⚑ 2 Sep — the work carries no programme attribution and the client has an open
   *  programme, so it is pre-programme history. Its OWN code, not `programme_unresolvable`:
   *  nothing is broken or unreadable here — the answer is known and it is "not this
   *  programme's work", which a caller may want to branch on differently. */
  | 'not_this_programme'
  | 'programme_unresolvable'

export type AuthorityVerdict =
  | { allowed: true; mode: 'legacy'; programme: null }
  | { allowed: true; mode: 'programme'; programme: ProgrammeRow }
  | { allowed: false; reason: AuthorityRefusal; message: string; programme: ProgrammeRow | null }

/**
 * ⚠️ THE CLIENT-FACING SENTENCE FOR A PAUSED PROGRAMME IS ALREADY LOCKED.
 * "Sourcing is paused while we recover." — reused verbatim rather than re-written, because a
 * second sentence for the same state is how two different truths start being told.
 */
export const PAUSED_CUSTOMER_COPY = 'Sourcing is paused while we recover.'

/**
 * REVIEW TERRITORY — derived from the planning benchmark, never a second literal.
 *
 * ⚠️ 250 IS A PLANNING BENCHMARK, NOT A GUARANTEE, AND THIS CODE MUST NOT IMPLY OTHERWISE.
 * R77 sizes a programme at 250 leads per targeted booked meeting. Reaching 250 delivered with
 * no meeting is the point at which a human looks — it is not a promise broken, not a refund
 * owed, and not a meeting we may invent. The ONLY thing this module does with it is stop the
 * next NEW batch until a person decides. Nothing here computes money.
 */
export const REVIEW_TRIGGER_LEADS = LEADS_PER_TARGETED_MEETING

/** Is a review currently OWED and unresolved? */
export function reviewIsOpen(p: ProgrammeRow): boolean {
  const r = p as unknown as { review_required_at?: string | null; review_resolved_at?: string | null }
  return Boolean(r.review_required_at) && !r.review_resolved_at
}

/**
 * THE PURE DECISION. No database, no I/O — so every branch is provable in a unit test, and so
 * the same answer cannot depend on which caller asked.
 *
 * `programme === null` means this client has no programme at all: LEGACY, allowed. Callers
 * that hold a BROKEN link must not pass null — they pass through `unresolvable()` instead.
 */
export function authorityFor(
  programme: ProgrammeRow | null,
  action: ProgrammeAction,
): AuthorityVerdict {
  if (!programme) return { allowed: true, mode: 'legacy', programme: null }
  const p = programme
  const refuse = (reason: AuthorityRefusal, message: string): AuthorityVerdict =>
    ({ allowed: false, reason, message, programme: p })

  // ── Shared floor: terminal and paused refuse EVERY action ────────────────────────────
  //
  // Terminal first. A COMPLETED programme that is also paused should read as finished, not as
  // something a resume could revive.
  if (TERMINAL_STATUSES.includes(p.status as ProgrammeStatus)) {
    return refuse('programme_terminal', `This programme is ${p.status}. No further delivery happens on it.`)
  }
  if (p.paused_at) {
    return refuse('programme_paused',
      `This programme is paused${p.pause_reason ? ` (${p.pause_reason})` : ''}. Pause stops new sourcing AND new sending.`)
  }

  if (action === 'OUTREACH') {
    // ⚠️ REUSES `mayStartCampaign` RATHER THAN RESTATING IT. That function is the existing
    // go-live rule and it is correct; a second copy here is exactly the drift this module was
    // built to remove. Its refusals are mapped to reasons so callers can branch on a code
    // instead of matching prose.
    const verdict = mayStartCampaign(p)
    if (!verdict.allowed) {
      if (!p.approved_at) {
        return refuse('programme_not_approved',
          'This programme has not been approved, so no outreach may start. Approval comes before Go Live.')
      }
      // ⚑ 2 Sep — P2 may be a payment OR internal authority (House). One helper so this gate
      // and go-live can never disagree about what "P2 is satisfied" means.
      if (!p2Authorised(p)) {
        return refuse('second_payment_missing',
          'The second payment has not been received, so no outreach may start. Payment 1 authorises sourcing and preparation only.')
      }
      return refuse('programme_not_live', verdict.reason ?? `This programme is ${p.status}, not LIVE.`)
    }
    // ⚠️ APPROVAL IS CHECKED EVEN WHEN `mayStartCampaign` PASSES. It reads status, pause and
    // the second payment — not `approved_at`. A programme that reached LIVE and was paid for
    // without an approval row would otherwise send, and "one programme approval" is a founder
    // lock, not an implementation detail of the status column.
    if (!p.approved_at) {
      return refuse('programme_not_approved',
        'This programme has not been approved, so no outreach may start. Approval comes before Go Live.')
    }
    return { allowed: true, mode: 'programme', programme: p }
  }

  // ── SOURCING and NEXT_BATCH share the Payment-1 floor ────────────────────────────────
  //
  // ⚠️ DELIBERATELY DOES **NOT** REQUIRE PAYMENT 2. Payment 1 buys the right to source and
  // prepare; demanding the second payment here would make it impossible to build the thing
  // the client is being asked to approve.
  if (!SOURCING_AUTHORISED_STATUSES.includes(p.status as ProgrammeStatus)) {
    return refuse('programme_not_sourcing_authorised',
      `This programme is ${p.status}, which carries no sourcing authority yet.`)
  }
  if (!p1Authorised(p)) {
    return refuse('first_payment_missing',
      'The first payment has not been received, so no sourcing is authorised.')
  }

  if (action === 'NEXT_BATCH') {
    // The review hold bites HERE and nowhere else — that is the whole difference between
    // review and pause.
    if (reviewIsOpen(p)) {
      return refuse('review_required',
        `This programme has reached ${REVIEW_TRIGGER_LEADS} delivered leads without a booked meeting and is held for review. ` +
        'No new batch starts until that review is resolved. Delivery already in flight is unaffected.')
    }
    const room = p.sourcing_ceiling - p.sourced_used - p.sourced_reserved
    if (room <= 0) {
      return refuse('sourcing_ceiling_reached',
        'This programme has consumed its authorised sourcing volume. Unused value never expires; opening more is a human decision.')
    }
  }

  return { allowed: true, mode: 'programme', programme: p }
}

/**
 * A refusal that must REACH somebody, thrown where a return value would be mistaken for zero.
 *
 * ⚠️ WHY A THROW AND NOT `{ inserted: 0 }`. `runIcpJob` returns a count, and a refused run
 * returning zero is indistinguishable from a client who was already stocked or an audience
 * that matched nobody — the exact "reads as nothing to do on every board" failure this repo
 * has fixed twice (start-work.ts:379-384, and #342). Every caller of `runIcpJob` already
 * catches, logs and — in `startWorkForClient` — alerts the founder, so a throw is the path
 * that ends at a human.
 */
export class ProgrammeAuthorityError extends Error {
  constructor(public readonly reason: AuthorityRefusal, message: string) {
    super(message)
    this.name = 'ProgrammeAuthorityError'
  }
}

/** A programme-linked object whose programme could not be resolved. ALWAYS refused. */
function unresolvable(detail: string): AuthorityVerdict {
  return {
    allowed: false,
    reason: 'programme_unresolvable',
    message:
      `This work is linked to a programme whose state could not be resolved (${detail}), so nothing was started. ` +
      'A broken programme link is never treated as ordinary non-programme work.',
    programme: null,
  }
}

const PROGRAMME_COLUMNS =
  'id, client_id, status, meeting_target, recommended_volume, first_paid_at, second_paid_at, ' +
  'first_payment_ref, second_payment_ref, sourcing_ceiling, sourced_used, sourced_reserved, ' +
  'approved_at, went_live_at, paused_at, pause_reason, review_required_at, review_reason, review_resolved_at, ' +
  'first_authorised_at, second_authorised_at'

/**
 * The client's open (non-terminal) programme, or null if they have none.
 *
 * ⚠️ THROWS ON A READ ERROR rather than returning null. `null` here means "legacy client,
 * proceed" — so swallowing an error would convert a database hiccup into permission to send.
 * Callers turn the throw into a closed gate.
 */
export async function openProgrammeFor(clientId: string): Promise<ProgrammeRow | null> {
  const { data, error } = await db.from('programmes')
    .select(PROGRAMME_COLUMNS)
    .eq('client_id', clientId)
    .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
    .limit(1).maybeSingle()
  if (error) throw new Error(`programme read failed for client ${clientId}: ${error.message}`)
  return (data as ProgrammeRow | null) ?? null
}

/**
 * ── THE ONE CALL EVERY EXECUTION PATH MAKES ──────────────────────────────────────────────
 *
 * Fail-closed by construction: the only way to reach `allowed: true` is for the read to have
 * succeeded AND `authorityFor` to have said yes. Every error path refuses.
 */
export async function checkProgrammeAuthority(
  clientId: string,
  action: ProgrammeAction,
): Promise<AuthorityVerdict> {
  try {
    const programme = await openProgrammeFor(clientId)
    return authorityFor(programme, action)
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err)
    console.error(`[programme-authority] ${action} refused for client ${clientId} — state unreadable:`, why)
    return unresolvable(why)
  }
}

/**
 * Authority for work reached through an ENROLLMENT (the send paths).
 *
 * ⚠️ THE LINK IS CHECKED, NOT ASSUMED. `figsy_enrollments.programme_id` was added by PR 1 and
 * is nullable, so three cases must be told apart and only one of them is legacy:
 *
 *   · enrollment has NO programme_id, client has no programme  → legacy, allowed
 *   · enrollment has NO programme_id, client HAS a programme   → the client's programme rules
 *     (an older enrollment predating attribution; the programme still governs the client)
 *   · enrollment HAS a programme_id that does not resolve      → UNRESOLVABLE, refused
 *
 * The third case is the founder's fail-closed rule and the reason this is not a one-liner.
 */
export async function checkEnrollmentAuthority(
  enrollmentId: string,
  action: ProgrammeAction,
  /**
   * The client to fall back to when the enrollment row simply DOES NOT EXIST.
   *
   * ⚠️ THIS DISTINCTION IS THE REPO'S OWN C7 RULE, AND IT IS EASY TO GET BACKWARDS.
   * `maybeSingle()` returns `{ data: null, error: null }` when a row is absent — that is not a
   * failure, it is a legitimate "no such row". Only a real `error` means we could not SEE.
   * Failing closed on absence would defer every send whose enrollment row is missing, forever
   * — exactly what `figsy.ts` already warns about for the campaign read a few lines below.
   */
  fallbackClientId?: string | null,
): Promise<AuthorityVerdict> {
  try {
    const { data: enr, error } = await db.from('figsy_enrollments')
      .select('id, client_id, programme_id').eq('id', enrollmentId).maybeSingle()
    // A read ERROR is "we cannot tell" — refuse. Absence is answered below.
    if (error) return unresolvable(`enrollment read failed: ${error.message}`)
    if (!enr) {
      return fallbackClientId
        ? await checkProgrammeAuthority(fallbackClientId, action)
        : unresolvable(`enrollment ${enrollmentId} not found and no client to fall back to`)
    }

    const e = enr as { client_id: string | null; programme_id: string | null }

    if (e.programme_id) {
      const { data: prog, error: pErr } = await db.from('programmes')
        .select(PROGRAMME_COLUMNS).eq('id', e.programme_id).maybeSingle()
      if (pErr) return unresolvable(`programme read failed: ${pErr.message}`)
      if (!prog) return unresolvable(`enrollment names programme ${e.programme_id}, which does not exist`)
      const p = prog as unknown as ProgrammeRow
      // 🛑 TENANCY. A programme reached through an enrollment must belong to that
      // enrollment's client. A mismatch is not a permissions question to answer later — it is
      // a corrupt link, and it is refused here rather than allowed to authorise a send.
      if (e.client_id && p.client_id !== e.client_id) {
        return unresolvable(`enrollment ${enrollmentId} (client ${e.client_id}) names a programme owned by ${p.client_id}`)
      }
      return authorityFor(p, action)
    }

    if (!e.client_id) return unresolvable(`enrollment ${enrollmentId} has neither a programme nor a client`)

    // ⚑ 2 Sep — 🛑 ATTRIBUTION IS POSITIVE. THIS REVERSES A DOCUMENTED DECISION.
    //
    // This branch used to resolve the CLIENT'S open programme and apply its authority, on the
    // reading that an older enrollment predating attribution should keep running under the
    // programme that governs the client. For a client mid-migration that is kind. For House it
    // is the whole defect: House carries ~263 enrollments and ~166 leads from a RETIRED legacy
    // desk, all with `programme_id = NULL`, and the moment its new programme reached LIVE every
    // one of them would have been authorised by it. History would have been re-authorised as
    // current work — silently, and with a real prospect at the other end.
    //
    // ⚠️ A NULL `programme_id` IS HISTORY, NEVER "PROBABLY CURRENT". If the client has an open
    // programme, work that programme did not pay for is not that programme's to send. If the
    // client has NO open programme they are a genuine legacy client and NOTHING below changes
    // for them — the $299 pack model is untouched, which is the point of the 29-Aug decision
    // this narrows rather than removes.
    const open = await openProgrammeFor(e.client_id)
    if (open) {
      return {
        allowed: false,
        reason: 'not_this_programme',
        message:
          'This work carries no programme attribution and the client has an open programme, so it is historical — ' +
          'it predates the programme and the programme did not pay for it. New programme work is sourced under the programme and carries its id.',
        programme: open,
      }
    }
    return await checkProgrammeAuthority(e.client_id, action)
  } catch (err) {
    return unresolvable(err instanceof Error ? err.message : String(err))
  }
}

/**
 * ── ANSWERING A PROSPECT WHO ALREADY WROTE TO US ────────────────────────────────────────
 *
 * A manual reply is CONVERSATION, not new delivery, and the two must not be gated the same
 * way. A reply can only exist because outreach we were already authorised to send arrived and
 * a human answered it. Requiring approval and Payment 2 to answer them would mean a prospect
 * who replied during preparation gets silence from us — the worst possible outcome of a gate
 * meant to protect them.
 *
 * ⚠️ BUT PAUSE AND TERMINAL STILL BITE. Pause is the hard stop the founder specified — no new
 * programme sends through any supported path — and a paused programme must not be quietly
 * emailing prospects because the message happens to be a reply.
 *
 * Implemented by REUSING `authorityFor` rather than re-deciding: the only refusals forgiven
 * are the two that describe money and approval, and every other refusal stands. A new reason
 * added to `authorityFor` therefore blocks replies by default, which is the safe direction.
 */
const REPLY_FORGIVEN: AuthorityRefusal[] = [
  'programme_not_approved', 'second_payment_missing', 'programme_not_live',
  'programme_not_sourcing_authorised', 'first_payment_missing',
  'review_required', 'sourcing_ceiling_reached',
]

export function mayReplyToProspect(programme: ProgrammeRow | null): AuthorityVerdict {
  const verdict = authorityFor(programme, 'OUTREACH')
  if (verdict.allowed) return verdict
  if (REPLY_FORGIVEN.includes(verdict.reason)) {
    return programme
      ? { allowed: true, mode: 'programme', programme }
      : { allowed: true, mode: 'legacy', programme: null }
  }
  return verdict
}

/** Reply authority for a client, fail-closed on an unreadable programme. */
export async function checkReplyAuthority(clientId: string): Promise<AuthorityVerdict> {
  try {
    return mayReplyToProspect(await openProgrammeFor(clientId))
  } catch (err) {
    return unresolvable(err instanceof Error ? err.message : String(err))
  }
}

/**
 * ── ATTRIBUTION, READ FROM THE PERSON RATHER THAN GUESSED FROM THE CLIENT ────────────────
 *
 * `leads.programme_id` / `leads.batch_id` are stamped by the sourcing run that paid for that
 * individual, so an enrollment copies the provenance of the actual person.
 *
 * ⚠️ WHY NOT "the client's current programme". A lead sourced under batch 1 and enrolled
 * weeks later would be attributed to batch 7 — a number that is confidently wrong, which is
 * strictly worse than null. Every downstream question ("what did batch 3 produce?") would get
 * a plausible answer that never happened.
 *
 * ⚠️ NULL IS A RESULT, NOT A FAILURE. Legacy leads have no programme; leads sourced before
 * these columns existed have no batch. Both stay null, permanently and deliberately — this
 * function never backfills and never infers.
 */
export async function resolveLeadAttribution(
  leadId: string,
): Promise<{ programmeId: string | null; batchId: string | null }> {
  const none = { programmeId: null, batchId: null }
  try {
    const { data, error } = await db.from('leads')
      .select('programme_id, batch_id').eq('id', leadId).maybeSingle()
    if (error || !data) return none
    const l = data as { programme_id: string | null; batch_id: string | null }
    return { programmeId: l.programme_id ?? null, batchId: l.batch_id ?? null }
  } catch {
    // Attribution is a RECORD, not a gate. It must never be the reason an enrollment fails —
    // the authority gates above are what decide whether work may happen.
    return none
  }
}

/**
 * Has this programme crossed into review territory?
 *
 * ⚠️ MEETINGS ARE COUNTED FROM `public.meetings` AND NOWHERE ELSE. That table is the sole
 * meeting truth (BUILD-003 PR 1) and this must not become a second opinion — so the count is
 * read through `clientMeetingCounts`, the same accessor everything else uses. A storage error
 * returns null there, and null must NEVER be read as "no meetings": that would raise a review
 * against a healthy programme on a database hiccup.
 *
 * Returns null when the answer is unknown. The caller does nothing on null.
 */
export async function reviewTriggerReached(p: ProgrammeRow): Promise<boolean | null> {
  const delivered = p.sourced_used
  if (delivered < REVIEW_TRIGGER_LEADS) return false
  const { clientMeetingCounts } = await import('./meeting-truth')
  const counts = await clientMeetingCounts([p.client_id])
  if (counts === null) {
    // ⚠️ NULL IS "UNKNOWN", NOT "ZERO". Reading a storage failure as no-meetings would raise a
    // review hold against a perfectly healthy programme and stop its next batch — the exact
    // `.data ?? []` defect shape this repo keeps finding, pointed at delivery control.
    console.warn(`[programme-authority] meeting counts unreadable for client ${p.client_id} — no review raised`)
    return null
  }
  return (counts[p.client_id] ?? 0) === 0
}

/**
 * ── RAISE THE REVIEW HOLD ────────────────────────────────────────────────────────────────
 *
 * Called after a batch settles, when `sourced_used` has just moved. Idempotent: a programme
 * already under review is left exactly as it is, so re-running never restarts the clock or
 * overwrites the reason a person is about to read.
 *
 * 🛑 WHAT THIS DELIBERATELY DOES NOT DO, because every one of them would be a lie:
 *   · it does not create, imply or promise a meeting — `public.meetings` is the sole meeting
 *     truth and nothing here writes to it;
 *   · it does not compute, owe or record any refund, credit or make-whole;
 *   · it does not pause the programme, cancel it, or change its status;
 *   · it does not stop delivery already in flight.
 *
 * All it does is set a flag that `authorityFor(..., 'NEXT_BATCH')` refuses on — so the next
 * NEW batch waits for a person. 250 leads per targeted meeting is a planning benchmark, and
 * reaching it without a meeting is when a human looks. It is not a broken promise.
 *
 * Returns whether a hold was raised by THIS call.
 */
export async function raiseReviewIfNeeded(programmeId: string): Promise<boolean> {
  try {
    const { data, error } = await db.from('programmes')
      .select(PROGRAMME_COLUMNS).eq('id', programmeId).maybeSingle()
    if (error || !data) return false
    const p = data as unknown as ProgrammeRow

    // Already held, or already reviewed and resolved for this stretch — leave it alone.
    if (reviewIsOpen(p)) return false
    if (TERMINAL_STATUSES.includes(p.status as ProgrammeStatus)) return false

    const reached = await reviewTriggerReached(p)
    if (reached !== true) return false   // false = not there yet; null = unknown, never guess

    const reason =
      `${p.sourced_used} leads delivered with no live booked meeting. The R77 planning benchmark is ` +
      `${REVIEW_TRIGGER_LEADS} leads per targeted meeting — a benchmark, not a guarantee. The next new ` +
      `batch is held until a person reviews this. Delivery already in flight continues.`

    const { error: upErr } = await db.from('programmes')
      .update({ review_required_at: new Date().toISOString(), review_reason: reason })
      .eq('id', programmeId)
      .is('review_required_at', null)   // last-writer guard: never overwrite an open hold

    if (upErr) {
      console.error(`[programme-authority] could not raise the review hold on ${programmeId}:`, upErr.message)
      return false
    }
    console.warn(`[programme-authority] REVIEW HOLD raised on programme ${programmeId}: ${reason}`)
    const { sendFounderAlert } = await import('./alerts')
    void sendFounderAlert('sends_stalled', 'A programme has reached review territory', [
      `Programme ${programmeId} (client ${p.client_id}): ${reason}`,
      'No new batch will start until this review is resolved. Nothing is paused, nothing is refunded, and no meeting has been created.',
      'This is a benchmark being reached, not a promise being broken.',
    ]).catch(() => {})
    return true
  } catch (err) {
    console.error(`[programme-authority] raiseReviewIfNeeded failed for ${programmeId}:`, err)
    return false
  }
}
