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
import type { CommercialModel } from './commercial-model'
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
  /** ⚑ 10 Sep — ARMED BUT NEVER RUN. Make Live produces every other condition on this list;
   *  Run is the separate operator act that permits delivery, and before this reason existed
   *  "LIVE" was indistinguishable from "sending". Deliberately NOT in `REPLY_FORGIVEN`: a
   *  programme that has never been Run has contacted nobody, so it can have no reply to send. */
  | 'programme_not_run'
  | 'review_required'
  | 'sourcing_ceiling_reached'
  /** ⚑ The work carries no programme attribution and the client HAS an open programme, so it
   *  is pre-programme history. Its OWN code, not `programme_unresolvable`: nothing is broken
   *  or unreadable here — the answer is known, and it is "not this programme's work", which a
   *  caller may reasonably want to branch on differently from a read failure. */
  | 'not_this_programme'
  /** ⚑ A sourcing run was asked for from an ICP that belongs to no programme, for a client
   *  who has one. Raised BEFORE the pool is served and before any provider is called. */
  | 'icp_not_attached_to_programme'
  /** ⚑ It is outside this programme's configured sending days or hours, in the RECIPIENT's
   *  local time — or no schedule is configured at all, which refuses (8 Sep). Temporary by
   *  nature: the same work is offered again on the next run inside the window. */
  | 'outside_send_window'
  /** ⚑ The enrolment is not pointed at the programme's canonical `figsy_sequences` row, so the
   *  words it would send are not the words the client approved (8 Sep). */
  | 'sequence_not_canonical'
  /** ⚑ The sending mailbox is ambiguous (an unbroken tie) or shared live with another client,
   *  so which human this appears to come from is not a settled fact (8 Sep). */
  | 'sender_unsafe'
  /** ⚑ The prepared work is no longer the work the customer approved (7 Sep). Its own code,
   *  because the fix is a RE-APPROVAL and not a payment, a resume or a status change — every
   *  other refusal here sends an operator somewhere different. */
  | 'preparation_changed'
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
  /**
   * 🛑 THE ROOT FIX (PR C2). Without this, `programme === null` meant LEGACY — the absence of a
   * row read as the positive assertion that a client is legacy, which is the defect the whole
   * commercial-model column exists to end.
   *
   * Optional so the hundreds of existing pure-function call sites and tests keep compiling and
   * keep meaning what they meant: omitted is COMPATIBILITY, which is exactly today's behaviour.
   * Every consequential path passes it.
   */
  model?: CommercialModel,
): AuthorityVerdict {
  if (!programme) {
    // ⚠️ AN UNREADABLE MODEL IS NEVER LEGACY. Not knowing which commercial model governs a
    // client is not permission to source, send or enrol under the retired one.
    if (model?.model === 'unreadable') {
      return {
        allowed: false, reason: 'programme_unresolvable', programme: null,
        message:
          // ⚠️ NO APOSTROPHE INSIDE THIS TEMPLATE LITERAL — see the same note in `routes/icps.ts`.
          `The commercial model for this client could not be resolved (${model.reason}), so nothing `
          + 'was started. An unresolved model is never treated as ordinary legacy work.',
      }
    }
    // 🛑 A DECLARED PROGRAMME CLIENT WITH NO OPEN PROGRAMME IS NOT LEGACY — IT IS WAITING.
    // This is the state House and MBF are in today. It is a safe, expected condition, not an
    // error: they simply hold no authority to source, send or enrol until a programme exists.
    if (model?.model === 'programme') {
      return {
        allowed: false, reason: 'not_this_programme', programme: null,
        message:
          'This client is on the programme model and has no active programme, so there is no '
          + 'authority to source, contact or enrol anyone. The retired per-lead model does not '
          + 'apply to them. Create and authorise a programme first.',
      }
    }
    // NULL model, or `legacy` declared, or no model supplied → compatibility: exactly the
    // behaviour this function has always had.
    return { allowed: true, mode: 'legacy', programme: null }
  }
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
      // ⚑ P2 may be a payment OR internal authority (House). One helper, so this gate and
      // go-live can never disagree about what "P2 is satisfied" means.
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
    // ── 🛑 10 Sep — AND RUN. THE SECOND OPERATOR ACT, WHICH DID NOT EXIST IN THE DATA ────
    //
    // The founder's rule is that Make Live ARMS and Run STARTS, and that only Run permits
    // external delivery. Every gate above this line describes the ARMED state: approved,
    // paid in full, LIVE, not paused, within the window, with a sender. That is precisely
    // what Make Live produces — and Make Live also activates the campaign and stamps every
    // enrolment `next_send_at = now`, which is exactly what `send-due` selects.
    //
    // 🛑 SO WITHOUT THIS CHECK, "LIVE" MEANT "SENDING". The first time the kill-switch was
    // turned off to let one canary Run, the two-hourly cron and the client-callable
    // `/figsy/send-due` would have delivered for every live programme with nobody pressing
    // anything. Run was a button that sent a bounded batch; it was not authority.
    //
    // ⚠️ IT IS ASKED LAST AND REFUSED FIRST — placed after approval and P2 so an operator
    // reading a refusal is told the nearest missing thing, not the furthest.
    // ⚠️ AND `undefined` REFUSES TOO. Before `20260910_programme_run_authority` runs, the
    // column does not exist and the select returns `undefined`; that reads as "not run",
    // which is the safe direction and the same answer the migration's own NULL default
    // gives. A missing column must never read as permission.
    if (!p.run_at) {
      return refuse('programme_not_run',
        'This programme is armed but has never been Run. Make Live arms and sends nothing; Run is the separate operator action that permits sending, and it has not been pressed.')
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
  // ⚑ read so `p1Authorised`/`p2Authorised` can see internal authority. Without them every
  // internally-authorised programme would read as unauthorised at every gate in this file.
  'first_payment_intent_id, second_payment_intent_id, first_authorised_at, second_authorised_at, ' +
  // ⚑ 8 Sep — the OUTREACH guards read the send window off the programme row, so it has to
  // be SELECTED. An unselected column reads `undefined`, which the schedule guard treats as
  // "no schedule configured" and refuses — a column list is a silent way to break a gate.
  'send_schedule, ' +
  // ⚑ 10 Sep — AND `run_at`, for the same reason and with more at stake: the OUTREACH gate
  // now refuses without it. Unselected it reads `undefined`, which refuses — safe, but it
  // would refuse for every programme including a genuinely Run one, so it is selected here
  // rather than left to fail closed by accident.
  'run_at, ' +
  // ⚑ 11 Sep (DAY 3 HOLD) — THE FROZEN REVIEW PACKAGE, so Vida can read the SAME persisted
  // truth Milla does instead of reconstructing approval facts from mutable current state. Its
  // panel rendered "Review snapshot frozen ✓" as a hardcoded true beside live prospect counts
  // and a live target; an operator and a client could look at one programme and read different
  // numbers, and the operator's were the ones that could move underneath them.
  //
  // ⚠️ READ-ONLY HERE. No gate in this file branches on these; an unselected column would
  // simply make the panel report "not frozen", which is why it is selected explicitly.
  'review_preparation_hash, review_preparation_snapshot, review_preparation_at, review_preparation_version'

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

/**
 * 🛑 THE EXACT WORK APPROVED IS THE EXACT WORK ALLOWED TO RUN (founder-locked 7 Sep).
 *
 * Approval used to record only a timestamp, so a sequence rewritten, a cadence retimed, a
 * sender swapped or an enrolment set replaced AFTER approval carried the old consent forward —
 * and this function, the one door to outreach, had no way to notice. It compares the current
 * preparation against the snapshot the customer actually approved.
 *
 * ⚠️ ON *OUTREACH* ONLY. `SOURCING` and `NEXT_BATCH` are Payment-1 authorities that exist
 * before there is an approval to drift from; applying this to them would stop sourcing for a
 * programme that has not been approved yet, which is every programme at the point it sources.
 *
 * ⚠️ "CANNOT TELL" IS A REFUSAL HERE, and only here does that cost nothing but a delay. An
 * unreadable snapshot on a send gate must never resolve to "unchanged" — that is the whole
 * failure mode this exists to remove, and it would remove it silently.
 */
async function outreachStillMatchesApproval(
  programme: ProgrammeRow, verdict: AuthorityVerdict, ctx?: OutreachContext,
): Promise<AuthorityVerdict> {
  // ── ⚑ 8 Sep — THE SEND SCHEDULE IS CHECKED HERE, AND THAT PLACEMENT IS THE DESIGN ──────
  //
  // 🛑 EVERY OUTBOUND PATH ALREADY REACHES THIS FUNCTION (the bypass audit of 7 Sep made sure
  // of it), so putting the window check here means the cron, the operator Run, a retry, the
  // day-1 batch, both provider pushes and the LinkedIn dispatch all inherit it — without six
  // call sites each remembering to ask. A schedule enforced in five places out of six is a
  // schedule that does not exist.
  //
  // ⚠️ AND A RETRY CANNOT OUTLAST IT. The refusal is evaluated at the moment of the attempt, so
  // work deferred at 19:00 is refused again at 19:05 and sent at 09:00 — there is no ticket
  // that says "this was allowed earlier".
  // ⚠️ DEFAULT-ON, OPT-OUT ONCE, AND THAT DIRECTION IS THE POINT. Every consumer of OUTREACH
  // authority is checked against the window unless it explicitly says it is not sending — so
  // forgetting to think about it yields the SAFE answer. The one honest opt-out today is
  // campaign ACTIVATION: turning a campaign on at 19:00 is not a touch on a prospect, and
  // refusing it would make the window a scheduling bug rather than a sending rule.
  if (ctx?.enforceSchedule !== false) {
  const { maySendNow } = await import('./send-schedule')
  const when = maySendNow(
    (programme as unknown as { send_schedule?: unknown }).send_schedule ?? null,
    ctx?.at ?? new Date(),
    // ⚠️ EVERYTHING KNOWN, IN PRECISION ORDER. Nothing writes a timezone or a region today —
    // `leads.country` is the only geographic column — so these two arrive undefined and the
    // guard falls to the country-set intersection. They are threaded now so the day the Apollo
    // reveal's state is persisted, the resolution sharpens without another authority change.
    { timezone: ctx?.recipientTimezone ?? null, region: ctx?.recipientRegion ?? null, country: ctx?.recipientCountry ?? null },
  )
  if (!when.allowed) {
    return { allowed: false, reason: 'outside_send_window', programme, message: when.detail }
  }
  }

  // ── ⚑ 8 Sep — SENDER SAFETY, at the same single door ──────────────────────────────────
  //
  // Two failures `resolveSendingInbox` cannot see, because it was written for a client with one
  // mailbox: a TIE between equally-ranked boxes (so which one sends is row order, not a
  // decision — and the frozen snapshot's sender becomes a coin toss), and the SAME address
  // being live on another client (two programmes sending as one human, sharing a reputation,
  // blind to each other's suppression). Both fail closed.
  const { programmeSenderSafety } = await import('./programme-sender')
  const senderSafe = await programmeSenderSafety(programme.client_id)
  if (!senderSafe.ok) {
    return { allowed: false, reason: 'sender_unsafe', programme, message: senderSafe.detail }
  }

  const { preparationDrift } = await import('./preparation-snapshot')
  const drift = await preparationDrift(programme.id)
  if (drift.state === 'unchanged') return verdict
  // `not_approved` cannot happen behind an allowed OUTREACH verdict — `authorityFor` already
  // required `approved_at` — but a positive answer is never inferred from that reasoning.
  if (drift.state === 'not_approved') {
    return {
      allowed: false, reason: 'programme_not_approved', programme,
      message: 'This programme has no approval recorded, so nothing may be sent.',
    }
  }
  return {
    allowed: false, reason: 'preparation_changed', programme,
    message: drift.state === 'changed' ? drift.detail : drift.detail,
  }
}

/**
 * What the OUTREACH guards need to know about the message being attempted.
 *
 * ⚠️ OPTIONAL, AND ITS ABSENCE IS HANDLED RATHER THAN ASSUMED. A batch path that does not know
 * one recipient's country falls back to the programme's `default_tz`, and the schedule guard
 * reports that it fell back — a silently guessed timezone is how a window stops meaning
 * anything. `at` exists so the window is testable without waiting for a Tuesday.
 */
export interface OutreachContext {
  /** ③ `leads.country` — the only geographic column that exists today. */
  recipientCountry?: string | null
  /** ② A state/region. Nothing persists one yet; threaded so tier ② works the day it does. */
  recipientRegion?: string | null
  /** ① An exact IANA zone. Nothing persists one yet. */
  recipientTimezone?: string | null
  at?: Date
  /**
   * `false` ONLY for a caller that is not attempting a prospect touch — campaign activation.
   * Omitted means enforced, so a new sender that forgets this field is still governed.
   */
  enforceSchedule?: boolean
}

export async function checkProgrammeAuthority(
  clientId: string,
  action: ProgrammeAction,
  ctx?: OutreachContext,
): Promise<AuthorityVerdict> {
  try {
    // ⚑ C2 — THE COMMERCIAL MODEL IS RESOLVED HERE, NOT INFERRED BELOW. `clientCommercialModel`
    // does its own open-programme read and returns it, so this is one resolution rather than
    // two that could disagree. A declared programme client with no open programme is refused
    // by `authorityFor`; a NULL client behaves exactly as before.
    const { clientCommercialModel } = await import('./commercial-model')
    const model = await clientCommercialModel(clientId)
    const programme = model.openProgramme
    const verdict = authorityFor(programme, action, model)
    if (!verdict.allowed || action !== 'OUTREACH' || !programme) return verdict
    return await outreachStillMatchesApproval(programme, verdict, ctx)
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
  ctx?: OutreachContext,
): Promise<AuthorityVerdict> {
  try {
    const { data: enr, error } = await db.from('figsy_enrollments')
      .select('id, client_id, programme_id, sequence_id').eq('id', enrollmentId).maybeSingle()
    // A read ERROR is "we cannot tell" — refuse. Absence is answered below.
    if (error) return unresolvable(`enrollment read failed: ${error.message}`)
    if (!enr) {
      return fallbackClientId
        ? await checkProgrammeAuthority(fallbackClientId, action, ctx)
        : unresolvable(`enrollment ${enrollmentId} not found and no client to fall back to`)
    }

    const e = enr as { client_id: string | null; programme_id: string | null; sequence_id: string | null }

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
      // 🛑 THE BYPASS THIS LINE WAS (found in adversarial review, 7 Sep). This returned the PURE
      // verdict, so the approved-preparation comparison — wired into `checkProgrammeAuthority`
      // — never ran on THE MAIN SEND PATH. `sendSequenceEmailCore` reaches outreach authority
      // through here, not through the client function, so a sequence rewritten, retimed or
      // re-audienced after approval was sendable with the old consent still attached.
      //
      // ⚠️ ONE GUARD, BOTH DOORS. The comparison is applied at every entry to OUTREACH
      // authority rather than at one of them; a second implementation here would be the drift
      // this module exists to remove.
      const enrolVerdict = authorityFor(p, action)
      if (!enrolVerdict.allowed || action !== 'OUTREACH') return enrolVerdict

      // ── ⚑ 8 Sep — THE WORDS THIS PERSON WOULD RECEIVE ARE THE CANONICAL ONES ────────────
      //
      // 🛑 `figsy_sequences` IS CANONICAL FOR PROGRAMME WORK (founder-locked). An enrolment
      // carries a COPY of the steps, so without this the copy could have been built from the
      // campaign settings store — or from a sequence that has since been replaced — and the
      // send path would faithfully deliver words the customer never approved.
      //
      // ⚠️ IT COMPARES IDENTITY, NOT CONTENT. Content drift is the approved-preparation hash's
      // job, immediately below; this asks the different question of whether this enrolment is
      // even pointed at the programme's current sequence. Both are needed: a matching hash on
      // an enrolment built from the wrong sequence proves nothing about what leaves.
      const { resolveProgrammeChain } = await import('./programme-chain')
      const chainRes = await resolveProgrammeChain(p.id)
      if (!chainRes.ok) {
        return unresolvable(`the programme's canonical sequence could not be resolved: ${chainRes.degraded}`)
      }
      const canonical = chainRes.chain.sequenceId
      if (!canonical) {
        return {
          allowed: false, reason: 'sequence_not_canonical', programme: p,
          message: 'This programme has no canonical sequence (programme → ICP → campaign → figsy_sequences), so there are no approved words to send.',
        }
      }
      if (e.sequence_id !== canonical) {
        return {
          allowed: false, reason: 'sequence_not_canonical', programme: p,
          message: e.sequence_id
            ? 'This enrolment was built from a different sequence than the programme\'s current canonical one, so sending it would deliver words the client did not approve. It must be re-prepared.'
            : 'This enrolment names no sequence, so nothing can prove the words it carries are the ones the client approved. It predates canonical sequence attribution and must be re-prepared.',
        }
      }

      return await outreachStillMatchesApproval(p, enrolVerdict, ctx)
    }

    if (!e.client_id) return unresolvable(`enrollment ${enrollmentId} has neither a programme nor a client`)

    // ── ⚑ ATTRIBUTION IS POSITIVE. THIS REVERSES A DOCUMENTED DECISION. ──────────────────
    //
    // What this line used to do: fall through to `checkProgrammeAuthority(client)`, so a
    // null-attributed enrollment INHERITED whatever programme the client happened to have
    // open. For a client mid-migration that was deliberate and defensible.
    //
    // 🛑 IT IS NOT DEFENSIBLE FOR A CLIENT WITH HISTORY. House carries ~263 enrollments and
    // ~166 leads from a RETIRED legacy desk, every one `programme_id = NULL`. The moment its
    // new programme reached LIVE, every one of them would have been authorised by it —
    // history re-sent as current work, with a real person at the far end of each.
    //
    // So the question is asked the other way round. Not "can this client's programme cover
    // this work?" but "does this work say which programme it belongs to?" Work that cannot
    // name its programme is history, and history is not authorised by a programme that never
    // paid for it and never sourced it.
    //
    // ⛓️ ~~"LEGACY IS NOT NARROWED. A client with NO open programme still resolves exactly as
    // before — `checkProgrammeAuthority` returns `mode: 'legacy'` for them."~~ AMENDED 3 Sep
    // (C2): that held only because "no programme row" was being read as "is legacy".
    //
    // ⚠️ ASK THE MODEL, NOT THE ABSENCE. `checkProgrammeAuthority` below now resolves the
    // commercial model itself, so a DECLARED programme client with no open programme is refused
    // there instead of falling through to a legacy allow, and an unreadable model refuses too.
    // Legacy is still not narrowed for anyone actually on it: a client declared `legacy`, and
    // every UNCLASSIFIED client with no open programme — which is the whole live book until
    // somebody classifies them — resolves to `mode: 'legacy'` exactly as before.
    const open = await openProgrammeFor(e.client_id)
    if (open) {
      return {
        allowed: false,
        reason: 'not_this_programme',
        message:
          'This work carries no programme attribution and the client has an open programme, so it is historical — ' +
          'it predates the programme, and the programme did not pay for it or source it. New programme work is ' +
          'sourced under the programme and carries its id.',
        programme: open,
      }
    }
    return await checkProgrammeAuthority(e.client_id, action, ctx)
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
/**
 * ⚑ C2 — REPLIES ARE CONVERSATION, AND THAT IS STILL TRUE UNDER THE MODEL.
 *
 * A reply can only exist because outreach we were already authorised to send arrived and a
 * human answered it. So a DECLARED programme client with no open programme may still answer a
 * person who wrote to them — refusing would mean silence to a prospect who replied, which is
 * the worst outcome of a gate meant to protect them.
 *
 * ⚠️ WHAT DOES CHANGE: an UNREADABLE model no longer resolves to a legacy allow. Not knowing
 * who this client is, is not a licence to send them anything, including a reply.
 */
export async function checkReplyAuthority(clientId: string): Promise<AuthorityVerdict> {
  try {
    const { clientCommercialModel } = await import('./commercial-model')
    const model = await clientCommercialModel(clientId)
    if (model.model === 'unreadable') return unresolvable(model.reason)
    return mayReplyToProspect(model.openProgramme)
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

  // ── 🛑 ⚑ 10 Sep (I4) — SCOPED TO THIS PROGRAMME, NOT TO THE CLIENT ────────────────────
  //
  // ⛓️ THE DEFECT, AND IT SUPPRESSED THE HOLD RATHER THAN RAISING A FALSE ONE. This asked
  // `clientMeetingCounts([p.client_id])` — every meeting the CLIENT has ever booked, under any
  // programme, at any time. So a client running two programmes where the first booked a meeting
  // and the second delivered 250 leads and produced nothing got NO review on the second: the
  // first programme's success answered for it.
  //
  // That is the wrong direction of failure. The hold exists so a human looks when the planning
  // benchmark is reached without a result, and the programme that most needs looking at is
  // exactly the one a sibling's success was covering for.
  //
  // Founder, 10 Sep: "programme_id remains canonical for outcome attribution."
  //
  // ⚠️ THE `clientId` FILTER RIDES ALONG deliberately. `programme_id` alone would be enough,
  // but scoping to both means a mis-stamped row can never pull another client's meeting into
  // this programme's answer.
  const { meetingCounts } = await import('./meeting-truth')
  const counts = await meetingCounts({ clientId: p.client_id, programmeId: p.id })
  if (counts === null) {
    // ⚠️ NULL IS "UNKNOWN", NOT "ZERO". Reading a storage failure as no-meetings would raise a
    // review hold against a perfectly healthy programme and stop its next batch — the exact
    // `.data ?? []` defect shape this repo keeps finding, pointed at delivery control.
    console.warn(`[programme-authority] meeting counts unreadable for programme ${p.id} — no review raised`)
    return null
  }
  return counts.booked === 0
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

    // Already held — leave it alone.
    if (reviewIsOpen(p)) return false
    if (TERMINAL_STATUSES.includes(p.status as ProgrammeStatus)) return false

    // ⛓️ 25 Sep (R166 ⑥ · P3a) — ~~"or already reviewed and resolved for this stretch"~~. A
    // RESOLVED review no longer ends the matter: after every further 250 people without a NEW
    // meeting, the hold is raised again. The founder: *"the barriers need to be there."*
    if ((p as unknown as { review_resolved_at?: string | null }).review_resolved_at) {
      return await raiseRepeatReviewIfNeeded(p)
    }

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

/**
 * ⚑ 25 Sep (R166 ⑥ · P3a) — THE REVIEW, AGAIN, EVERY 250 PEOPLE WITHOUT A NEW MEETING.
 *
 * Measured from the BASELINE a person left when they resolved the last review (people
 * delivered and meetings booked at that moment). A new meeting moves the baseline forward, so
 * the count restarts; another 250 people with no new meeting raises the hold again.
 *
 * ⚠️ AN UNREADABLE BASELINE RAISES THE HOLD (a person looks); UNREADABLE MEETINGS DO NOT (the
 * same rule `reviewTriggerReached` keeps: a database hiccup is never "no meetings").
 */
export function repeatReviewDecision(input: {
  sourcedUsed: number; bookedNow: number
  baselineUsed: number | null; baselineBooked: number | null
}): 'raise' | 'move_baseline' | 'wait' {
  const baseUsed = input.baselineUsed ?? 0
  const baseBooked = input.baselineBooked ?? 0
  if (input.bookedNow > baseBooked) return 'move_baseline'
  return input.sourcedUsed - baseUsed >= REVIEW_TRIGGER_LEADS ? 'raise' : 'wait'
}

async function raiseRepeatReviewIfNeeded(p: ProgrammeRow): Promise<boolean> {
  const { data: base, error: baseErr } = await db.from('programmes')
    .select('review_baseline_used, review_baseline_booked').eq('id', p.id).maybeSingle()
  const { meetingCounts } = await import('./meeting-truth')
  const counts = await meetingCounts({ clientId: p.client_id, programmeId: p.id })
  if (counts === null) {
    console.warn(`[programme-authority] meeting counts unreadable for programme ${p.id} — no repeat review raised`)
    return false
  }
  const b = (base ?? {}) as { review_baseline_used?: number | null; review_baseline_booked?: number | null }
  const decision = baseErr
    ? 'raise'
    : repeatReviewDecision({
      sourcedUsed: p.sourced_used, bookedNow: counts.booked,
      baselineUsed: b.review_baseline_used ?? null, baselineBooked: b.review_baseline_booked ?? null,
    })

  if (decision === 'move_baseline') {
    await db.from('programmes')
      .update({ review_baseline_used: p.sourced_used, review_baseline_booked: counts.booked })
      .eq('id', p.id)
    return false
  }
  if (decision === 'wait') return false

  const reason = baseErr
    ? `This programme's last review baseline could not be read, so a person must look again before the next batch. ${p.sourced_used} leads delivered in total.`
    : `${p.sourced_used - (b.review_baseline_used ?? 0)} more leads delivered since the last review with no new booked meeting. ` +
      `The review repeats every ${REVIEW_TRIGGER_LEADS} leads without a meeting (R166). The next new batch is held until a person reviews this. Delivery already in flight continues.`

  const { data: hit, error: upErr } = await db.from('programmes')
    .update({ review_required_at: new Date().toISOString(), review_resolved_at: null, review_reason: reason })
    .eq('id', p.id)
    .not('review_resolved_at', 'is', null)   // compare-and-set: only re-open a RESOLVED review
    .select('id')
  if (upErr || !hit || (hit as unknown[]).length === 0) {
    if (upErr) console.error(`[programme-authority] could not re-raise the review on ${p.id}:`, upErr.message)
    return false
  }
  console.warn(`[programme-authority] REVIEW HOLD raised AGAIN on programme ${p.id}: ${reason}`)
  const { sendFounderAlert } = await import('./alerts')
  void sendFounderAlert('sends_stalled', 'A programme needs another review', [
    `Programme ${p.id} (client ${p.client_id}): ${reason}`,
    'No new batch will start until this review is resolved. Nothing is paused, nothing is refunded, and no meeting has been created.',
  ]).catch(() => {})
  return true
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE LEGACY PER-LEAD COMMERCIAL FENCE — founder-locked 3 Sep
//
// 🛑 THE RULE, VERBATIM: **"IF THE CLIENT HAS AN OPEN PROGRAMME, THE LEGACY COMMERCIAL PER-LEAD
// APPROVE / REVEAL / BATCH-APPROVAL PATHS ARE REFUSED."**
//
// ── WHAT WAS ACTUALLY REACHABLE ─────────────────────────────────────────────────────────
//
// `approve-lead.ts` contained ZERO references to programmes. An authenticated programme
// customer calling `POST /leads/:id/approve`, `POST /leads/:id/reveal` or
// `POST /leads/approve-batch` by hand passed `batchGate` — because a programme lead is
// precisely what that gate admits: surfaced, unrevealed, not passed — and then:
//
//   ① `revealed_at` was stamped on programme work, removing it from their own review set and
//      from `markReadyForApproval`'s count;
//   ② an onboarding-pack slot was burned (a `credit_transactions` row) or **$4 was charged**
//      through `try_charge_wallet`;
//   ③ `autoEnrollLead` then refused, because `authorityFor` correctly says a non-LIVE
//      programme grants no OUTREACH — so the customer paid and got nothing.
//
// That last step is the tell. The programme model was already strong enough to refuse the
// WORK and not strong enough to refuse the CHARGE, which is the charge-then-refuse shape this
// repository forbids, arrived at from the one direction nobody had walked.
//
// ── WHY CLIENT-LEVEL, NOT LEAD-LEVEL (founder's choice, and it is the stronger one) ─────
//
// Scoping the fence to `lead.programme_id` would leave the client's HISTORICAL null-attributed
// leads commercially mutable while their programme is open — House's ~166 retired rows could
// still be revealed and charged for. For a client with an open programme the pack, the wallet
// and the $1/$3/$4 per-lead economics are INERT: their programme's P1/P2 is what they bought.
// So the question is asked about the CLIENT, not about the row.
//
// ⚠️ AND IT IS THE COMMERCIAL PATHS ONLY. Milla's calibration controls — `proof-accept`,
// `pass`, `feedback` — reveal nothing, charge nothing and call none of this; they are traced
// and proved untouched. A fence that silenced "Looks right" would have broken the free-proof
// acquisition motion to protect economics that motion never touches.
//
// ⛓️ ~~"LEGACY IS EXACTLY AS IT WAS. A client with NO open programme gets `allowed: true` from
// a single `openProgrammeFor` read and proceeds down the identical path."~~ AMENDED 3 Sep (C2).
// That was true of the question this fence used to ask, and the question was wrong: it read the
// ABSENCE of a programme row as the assertion "this client is legacy", so House and MBF — both
// declared PROGRAMME clients with no programme open — were free to use the retired per-lead
// approve/reveal/batch routes and be charged $4.
//
// ⚠️ THE QUESTION IS NOW `clientCommercialModel`, AND LEGACY IS STILL EXACTLY AS IT WAS FOR
// EVERY CLIENT WHO IS ACTUALLY ON IT. A client declared `legacy`, and an UNCLASSIFIED client
// with no open programme (which is every client on the live book until somebody classifies
// them), both resolve to legacy and proceed down the identical path — the $299 pack model,
// which is what is actually selling, is every one of those clients.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type LegacyLeadVerdict =
  | { allowed: true }
  // ⛓️ C2 added `programme_model`. THE THREE REFUSALS ARE NOT ONE REFUSAL, and collapsing them
  // is how a customer reads a sentence about a programme they do not have. `programme_open`
  // means a programme is running; `programme_model` means they are a programme client with no
  // programme running; `programme_unresolvable` means we could not tell and refused.
  | { allowed: false; code: 'programme_open' | 'programme_model' | 'programme_unresolvable'; message: string }

/** What a fenced customer reads. One sentence, true, and it names the action that replaced it. */
export const LEGACY_FENCED_COPY =
  'Your programme covers this. Individual prospects are not approved or paid for one at a time — '
  + 'you approve the programme once, and we work every prospect in it.'

/**
 * ⚑ C2 — WHAT A PROGRAMME CLIENT WITH NO RUNNING PROGRAMME READS.
 *
 * `LEGACY_FENCED_COPY` opens "Your programme covers this", and for this client that sentence
 * is false: there is no programme to cover it. Reusing it would fence them correctly and then
 * explain the fence with a programme that does not exist — the same class of untrue-but-
 * plausible sentence the whole commercial-model change exists to remove.
 */
export const PROGRAMME_MODEL_FENCED_COPY =
  'Your plan does not charge for prospects one at a time, so there is nothing to approve or pay '
  + 'for here. Your next programme covers this work — nothing has been charged.'

/**
 * May this client still use the legacy per-lead COMMERCIAL paths?
 *
 * ⚠️ FAIL-CLOSED. `openProgrammeFor` throws when the programme table cannot be read, and that
 * is refused rather than waved through: not knowing whether a client has an open programme is
 * not permission to charge them $4. The alternative — treating an unreadable state as "no
 * programme" — turns a database hiccup into a charge against somebody who already paid.
 */
export async function checkLegacyPerLeadAuthority(clientId: string): Promise<LegacyLeadVerdict> {
  try {
    // ⛓️ C2 — THIS ASKED "IS A PROGRAMME OPEN". That was the best question available before the
    // commercial model existed, and it is the wrong one: it left a DECLARED programme client
    // with no open programme — which is exactly what House and MBF are today — free to use the
    // retired per-lead approve/reveal/batch routes, charge $4 and burn pack slots.
    //
    // 🛑 THE QUESTION IS NOW THE MODEL. Only a client whose model resolves to LEGACY may use
    // the legacy commercial paths. Unreadable refuses; a conflict (declared legacy with an open
    // programme) resolves to unreadable and refuses too.
    const { clientCommercialModel, mayUseLegacyCommercialPath } = await import('./commercial-model')
    const model = await clientCommercialModel(clientId)
    if (mayUseLegacyCommercialPath(model)) return { allowed: true }
    if (model.model === 'unreadable') {
      console.error(`[programme-authority] legacy per-lead path refused for client ${clientId} — ${model.reason}`)
      return {
        allowed: false, code: 'programme_unresolvable',
        message: 'We could not confirm your account state, so nothing was approved and nothing was charged. Please try again shortly.',
      }
    }
    // ⚠️ WHICH REFUSAL IT ACTUALLY IS. A client with a programme OPEN is told their programme
    // covers it; a declared programme client with NO programme open is told the truth about
    // their plan instead of being told about a programme they do not have.
    return model.openProgramme
      ? { allowed: false, code: 'programme_open', message: LEGACY_FENCED_COPY }
      : { allowed: false, code: 'programme_model', message: PROGRAMME_MODEL_FENCED_COPY }
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err)
    console.error(`[programme-authority] legacy per-lead path refused for client ${clientId} — programme state unreadable:`, why)
    return {
      allowed: false, code: 'programme_unresolvable',
      message: 'We could not confirm your programme state, so nothing was approved and nothing was charged. Please try again shortly.',
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 16 Sep (MVP1 · D3) — THE REVIEW HOLD CAN NOW BE CLEARED, AND ONLY BY A PERSON.
//
// 🛑 THE DEFECT WAS A MISSING WRITER, NOT A BROKEN RULE. `maybeRaiseProgrammeReview` above
// writes `review_required_at`, and `reviewIsOpen` is `review_required_at && !review_resolved_at`
// — but NOTHING IN THE PRODUCT EVER WROTE `review_resolved_at`. A grep returned reads only. So
// the hold was a one-way door: once the R77 benchmark was reached, that programme's next batch
// authority never came back, for ever, and no screen could return it.
//
// ⚠️ THE TRIGGER IS UNTOUCHED. The threshold, the reason sentence, `reviewTriggerReached` and
// `reviewIsOpen`'s definition are all exactly as they were. This build adds the RESOLUTION and
// changes nothing about when a hold is raised.
//
// ⚠️ AND NOTHING RESOLVES IT AUTOMATICALLY. It takes an operator identity and it is audited by
// its route. A review that a cron could clear is not a review — the whole point of the hold is
// that a person looked at a programme which is not converting.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type ReviewResolution =
  | { ok: true;  resolvedAt: string }
  | { ok: false; reason: 'not_open' | 'not_found' | 'unreadable'; detail: string }

export async function resolveProgrammeReview(
  programmeId: string,
  by: string,
): Promise<ReviewResolution> {
  try {
    const { data, error } = await db.from('programmes')
      .select(PROGRAMME_COLUMNS).eq('id', programmeId).maybeSingle()
    if (error) {
      return { ok: false, reason: 'unreadable', detail: `the programme could not be read (${error.message})` }
    }
    if (!data) return { ok: false, reason: 'not_found', detail: 'No such programme.' }
    const p = data as unknown as ProgrammeRow

    // 🛑 ONLY AN OPEN HOLD MAY BE RESOLVED. Stamping a programme that was never held would
    // write a resolution for a review nobody did, and it would then be indistinguishable from
    // one somebody had — which is the fact `reviewIsOpen` is read for.
    if (!reviewIsOpen(p)) {
      return {
        ok: false, reason: 'not_open',
        detail: 'This programme has no open review hold, so there was nothing to resolve. Nothing was changed.',
      }
    }

    const resolvedAt = new Date().toISOString()
    // ⚑ 25 Sep (R166 ⑥ · P3a) — THE BASELINE the next review counts from: where the programme
    // stands NOW. Unreadable meetings leave it null (counted as 0 — the conservative side).
    const { meetingCounts } = await import('./meeting-truth')
    const counts = await meetingCounts({ clientId: p.client_id, programmeId: p.id })
    const { data: hit, error: upErr } = await db.from('programmes')
      .update({
        review_resolved_at: resolvedAt,
        review_baseline_used: p.sourced_used,
        review_baseline_booked: counts === null ? null : counts.booked,
      })
      .eq('id', programmeId)
      // ⚠️ COMPARE-AND-SET, the same shape the raise uses. Two operators pressing at once must
      // produce one resolution: the second finds the column already written and matches no row.
      .is('review_resolved_at', null)
      .not('review_required_at', 'is', null)
      .select('id')
    if (upErr) {
      return { ok: false, reason: 'unreadable', detail: `the resolution could not be written (${upErr.message})` }
    }
    if (!hit || (hit as unknown[]).length === 0) {
      return {
        ok: false, reason: 'not_open',
        detail: 'This review was resolved by somebody else first. Nothing was changed.',
      }
    }
    console.warn(`[programme-authority] review hold RESOLVED on programme ${programmeId} by ${by}. New batch authority resumes.`)
    return { ok: true, resolvedAt }
  } catch (err) {
    return {
      ok: false, reason: 'unreadable',
      detail: err instanceof Error ? err.message : 'The review could not be resolved.',
    }
  }
}
