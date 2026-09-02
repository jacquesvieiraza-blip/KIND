// ── THE PROGRAMME SERVICE — state, authority, batches, value ────────────────────────────
//
// The founder-approved commercial destination (R74 · R77 · R78 · R81). One programme buys a
// number of targeted booked meetings; the client pays 50% to authorise sourcing, approves
// once, pays the second 50% at Go Live, and the campaign runs.
//
// ⚠️ THE LEGACY MODEL IS STILL LIVE. $299 pack · first 100 approvals included · $4 per
// approved lead is what runs today and is untouched by this file.
//
// ⚠️ NOTHING HERE MAY IMPORT A LEGACY MONEY CONSTANT — `LEAD_PRICE_USD`, `PACK_PRICE_USD`,
// `PACK_LEADS`, `PARTNER_COMMISSION_PER_LEAD_USD`. Programme money comes from the shared
// curve and nowhere else. `programme-legacy-fence.test.ts` enforces this in both directions.

import { db } from '@kind/db'
import { sendFounderAlert } from './alerts'
import {
  quoteProgramme, recommendedVolume, partnerCommissionCents,
  type ProgrammeStage,
} from '@kind/shared'

/**
 * The programme lifecycle. The smallest set that survives contact with the money.
 *
 * ⚠️ THERE IS NO `PAUSED` STATUS, DELIBERATELY. Pause is ORTHOGONAL — `paused_at` plus
 * `pause_reason` on the row. A pause status would destroy the state the programme must
 * return to: a client who pauses during SOURCING and a client who pauses after APPROVED are
 * in genuinely different positions (the second is one payment from Go Live), and collapsing
 * both into PAUSED means resuming has to guess. It also multiplies every transition rule by
 * two. The database CHECK constraint carries the same list.
 */
export const PROGRAMME_STATUSES = [
  'DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT', 'SOURCING_AUTHORISED', 'SOURCING',
  'READY_FOR_APPROVAL', 'APPROVED', 'LIVE', 'COMPLETED', 'CANCELLED',
] as const
export type ProgrammeStatus = (typeof PROGRAMME_STATUSES)[number]

/** Terminal states. A client may open a new programme only when the old one is here. */
export const TERMINAL_STATUSES: ProgrammeStatus[] = ['COMPLETED', 'CANCELLED']

/** States in which programme sourcing authority exists at all. Mirrors the SQL gate. */
export const SOURCING_AUTHORISED_STATUSES: ProgrammeStatus[] = [
  'SOURCING_AUTHORISED', 'SOURCING', 'READY_FOR_APPROVAL', 'APPROVED', 'LIVE',
]

export type PauseReason = 'client' | 'quality' | 'icp_change'

/** Controlled execution batch size (founder lock 4) — "approximately 250". */
export const PROGRAMME_BATCH_SIZE = 250

export interface ProgrammeRow {
  id: string
  client_id: string
  status: ProgrammeStatus
  meeting_target: number
  recommended_volume: number
  price_per_meeting_cents: number
  price_total_cents: number
  first_payment_cents: number
  second_payment_cents: number
  first_payment_ref: string | null
  second_payment_ref: string | null
  /** Refunds/disputes key on the intent. Read by the XOR guards: ANY payment evidence
   *  on a stage makes it a paid stage, and the intent id is payment evidence. */
  first_payment_intent_id: string | null
  second_payment_intent_id: string | null
  first_paid_at: string | null
  second_paid_at: string | null
  /** ⚑ 2 Sep — INTERNAL authority. Separate from money by design; see the migration. */
  first_authorised_at: string | null
  second_authorised_at: string | null
  sourcing_ceiling: number
  sourced_used: number
  sourced_reserved: number
  approved_at: string | null
  went_live_at: string | null
  paused_at: string | null
  pause_reason: PauseReason | null
  value_settled_at: string | null
  make_whole_cents: number
  contribution_cents: number | null
  contribution_finalised_at: string | null
  disputed_at: string | null
  // ── BUILD-003 PR 2 · the review hold (20260829_programme_delivery_control) ────────────
  //
  // ⚠️ OPTIONAL BECAUSE THEY ARE NEW COLUMNS, and every existing `select('*')` in this file
  // returns rows that predate them. Marking them required would make TypeScript lie about
  // rows read before the migration ran.
  //
  // ⚠️ REVIEW IS NOT PAUSE AND IS NOT A STATUS. It is a hold on the NEXT NEW BATCH only —
  // in-flight sequences finish, replies and meetings keep ingesting. Putting it in `status`
  // would force every transition rule to double and would lose the state the programme must
  // return to, which is the same reason `paused_at` is orthogonal rather than a status.
  review_required_at?: string | null
  review_reason?: string | null
  review_resolved_at?: string | null
  review_resolution?: string | null
}

export interface ProgrammeResult { ok: boolean; reason?: string; programme?: ProgrammeRow }

/**
 * Programme storage could not be read. NOT the same as "there is no programme".
 *
 * ⚠️ THIS EXISTS BECAUSE THE FOUNDER'S LIVE WALKTHROUGH FOUND THE TWO INDISTINGUISHABLE.
 * Both readers below destructured only `{ data }` and dropped the error, so a missing table,
 * a broken connection or a rejected query all returned `null` — exactly what a client with
 * no programme returns. Every caller then reported "no programme exists" and carried on.
 *
 * That is the same defect shape this repo keeps finding — `.data ?? []` rendering a rejected
 * query as an empty result — pointed at the table the entire commercial model lives in. On a
 * money path, "I could not read it" and "it is not there" must never render the same.
 */
export class ProgrammeStorageError extends Error {
  constructor(detail: string) {
    super(`Programme storage could not be read: ${detail}`)
    this.name = 'ProgrammeStorageError'
  }
}

/**
 * The client's single open programme, or null.
 *
 * ⚠️ `null` MEANS ONE THING ONLY: THE QUERY RAN AND MATCHED NO ROW. A database, query or
 * schema error THROWS `ProgrammeStorageError` and never returns null — because a caller
 * reading null decides "this is a legacy client" and proceeds, which is the wrong decision
 * to make on missing information.
 */
export async function openProgrammeForClient(clientId: string): Promise<ProgrammeRow | null> {
  const { data, error } = await db.from('programmes').select('*')
    .eq('client_id', clientId)
    .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
    .maybeSingle()
  if (error) throw new ProgrammeStorageError(`open programme for client ${clientId} — ${error.message}`)
  return (data as ProgrammeRow | null) ?? null
}

/** One programme by id, or null for a genuine no-row. Throws on a storage error — see above. */
export async function getProgramme(programmeId: string): Promise<ProgrammeRow | null> {
  const { data, error } = await db.from('programmes').select('*').eq('id', programmeId).maybeSingle()
  if (error) throw new ProgrammeStorageError(`programme ${programmeId} — ${error.message}`)
  return (data as ProgrammeRow | null) ?? null
}

/**
 * Create a priced programme in DRAFT.
 *
 * Every money figure is derived ONCE from the shared curve and STORED. Storing rather than
 * recomputing on read is deliberate: a price quoted to a client must not move if the curve is
 * ever amended, and a programme mid-flight must bill what it sold.
 */
export async function createProgramme(clientId: string, meetings: number): Promise<ProgrammeResult> {
  const existing = await openProgrammeForClient(clientId)
  if (existing) return { ok: false, reason: 'This client already has an open programme.' }

  const q = quoteProgramme(meetings)
  const { data, error } = await db.from('programmes').insert({
    client_id: clientId,
    status: 'DRAFT',
    meeting_target: q.meetings,
    recommended_volume: q.recommendedVolume,
    price_per_meeting_cents: q.pricePerMeetingCents,
    price_total_cents: q.totalCents,
    first_payment_cents: q.firstPaymentCents,
    second_payment_cents: q.secondPaymentCents,
  }).select().single()

  if (error) {
    // 23505 = the one-open-programme partial unique index. Two tabs, one client.
    if (error.code === '23505') return { ok: false, reason: 'This client already has an open programme.' }
    return { ok: false, reason: error.message }
  }
  return { ok: true, programme: data as ProgrammeRow }
}

async function setStatus(programmeId: string, status: ProgrammeStatus, extra: Record<string, unknown> = {}) {
  return db.from('programmes').update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', programmeId)
}

/** DRAFT → RECOMMENDED → AWAITING_FIRST_PAYMENT. Presentation steps; no money moves. */
export async function recommendProgramme(programmeId: string): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (p.status !== 'DRAFT') return { ok: false, reason: `Cannot recommend from ${p.status}.` }
  await setStatus(programmeId, 'RECOMMENDED')
  return { ok: true }
}

export async function awaitFirstPayment(programmeId: string): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (p.status !== 'RECOMMENDED' && p.status !== 'DRAFT') {
    return { ok: false, reason: `Cannot request first payment from ${p.status}.` }
  }
  await setStatus(programmeId, 'AWAITING_FIRST_PAYMENT')
  return { ok: true }
}

// ── PAYMENTS ─────────────────────────────────────────────────────────────────────────────

/**
 * Record the FIRST 50% and authorise sourcing.
 *
 * ⚠️ IDEMPOTENT ON THE STRIPE SESSION ID. The partial unique index on `first_payment_ref` is
 * the real guard — a replayed webhook updates zero rows and returns `alreadyRecorded`, so it
 * can never re-authorise a ceiling or double-count. This is the `credit_transactions.reference`
 * pattern the wallet path already uses, applied to the programme row itself.
 *
 * ⚠️ AND IT DOES NOT START WORK. The legacy first purchase calls `startWorkForClient` from
 * inside the webhook; a programme deliberately does not. The first payment buys AUTHORITY to
 * source, in controlled batches, under K.I.N.D's GO — not an immediate run. Breaking that
 * coupling is the point: money arriving must never be the thing that starts sourcing.
 */
export async function recordFirstPayment(params: {
  programmeId: string
  sessionId: string
  paymentIntentId?: string | null
}): Promise<{ ok: boolean; alreadyRecorded?: boolean; reason?: string }> {
  const p = await getProgramme(params.programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (p.first_payment_ref === params.sessionId) return { ok: true, alreadyRecorded: true }
  if (p.first_payment_ref) {
    return { ok: false, reason: 'This programme already has a different first payment recorded.' }
  }
  // 🛑 XOR. A stage has ONE authority. Recording a payment against an internally-authorised
  // stage would leave a programme claiming both, and the DB CHECK would reject the write
  // anyway — refusing here turns a constraint violation into a sentence somebody can read.
  if (p.first_authorised_at) {
    return { ok: false, reason: 'This programme already has INTERNAL P1 authority. A stage cannot hold both internal authority and a payment.' }
  }

  // The `.is('first_payment_ref', null)` guard makes this a compare-and-set: two concurrent
  // webhook deliveries cannot both win, and the loser updates zero rows.
  const { data, error } = await db.from('programmes').update({
    first_payment_ref: params.sessionId,
    first_payment_intent_id: params.paymentIntentId ?? null,
    first_paid_at: new Date().toISOString(),
    // ⚠️ THE CEILING IS SET FROM recommended_volume, NOT FROM THE PAYMENT AMOUNT. The first
    // 50% authorises sourcing up to the FULL recommended volume (founder lock 4) — half the
    // money, all of the authority. Execution is then rationed by batch size, not by ceiling.
    sourcing_ceiling: p.recommended_volume,
    status: 'SOURCING_AUTHORISED',
    updated_at: new Date().toISOString(),
  }).eq('id', params.programmeId).is('first_payment_ref', null).select()

  if (error) return { ok: false, reason: error.message }
  if (!data || data.length === 0) return { ok: true, alreadyRecorded: true }
  return { ok: true }
}

/**
 * Record the SECOND 50% and go live.
 *
 * ⚠️ PROGRAMME STATE IS AUTHORITY, NOT THE CHECKOUT URL. A checkout created while the
 * programme was APPROVED can be paid minutes later, after the client has paused. The webhook
 * therefore RE-READS state and refuses to advance — while still recording that the money
 * arrived, because money that arrived is a fact regardless of whether we may act on it.
 *
 * Returns `recordedNotLive` for exactly that case: the payment is stored, Go Live does not
 * happen, and a human is told.
 */
export async function recordSecondPayment(params: {
  programmeId: string
  sessionId: string
  paymentIntentId?: string | null
}): Promise<{ ok: boolean; alreadyRecorded?: boolean; recordedNotLive?: boolean; reason?: string }> {
  const p = await getProgramme(params.programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (p.second_payment_ref === params.sessionId) {
    return { ok: true, alreadyRecorded: true, recordedNotLive: p.went_live_at === null }
  }
  if (p.second_payment_ref) {
    return { ok: false, reason: 'This programme already has a different second payment recorded.' }
  }
  // 🛑 XOR — see recordFirstPayment.
  if (p.second_authorised_at) {
    return { ok: false, reason: 'This programme already has INTERNAL P2 authority. A stage cannot hold both internal authority and a payment.' }
  }

  // Record the money first, in every case. What differs is whether we then go live.
  const base = {
    second_payment_ref: params.sessionId,
    second_payment_intent_id: params.paymentIntentId ?? null,
    second_paid_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // ⚠️ THE TWO REFUSAL CASES: paused, or not in APPROVED. An out-of-order webhook (second
  // payment arriving for a programme still SOURCING) must not skip approval — arrival order
  // never overrides state.
  const blocked = p.paused_at !== null || p.status !== 'APPROVED'

  const { data, error } = await db.from('programmes')
    .update(blocked ? base : { ...base, status: 'LIVE', went_live_at: new Date().toISOString() })
    .eq('id', params.programmeId).is('second_payment_ref', null).select()

  if (error) return { ok: false, reason: error.message }
  if (!data || data.length === 0) return { ok: true, alreadyRecorded: true }

  if (blocked) {
    const why = p.paused_at !== null
      ? `the programme is PAUSED (${p.pause_reason ?? 'no reason recorded'})`
      : `the programme is ${p.status}, not APPROVED`
    void sendFounderAlert('payment_failed',
      'Programme second payment received but the programme did NOT go live', [
        `Programme ${params.programmeId} (client ${p.client_id}) received its second payment (session ${params.sessionId}).`,
        `It was NOT taken live because ${why}.`,
        'The money is recorded. Decide whether to resume and go live, or to refund/settle the value.',
      ])
    return { ok: true, recordedNotLive: true }
  }
  return { ok: true }
}

/** Which Stripe stage a metadata blob describes, or null if it is not a programme payment. */
export function programmeStageOf(type: string | undefined): ProgrammeStage | null {
  return type === 'programme_first' || type === 'programme_second' ? type : null
}

// ── APPROVAL AND GO LIVE ────────────────────────────────────────────────────────────────

/**
 * ONE programme-level approval (founder lock 5) — never thousands of paid per-lead approvals.
 * Only from READY_FOR_APPROVAL, and never while paused.
 */
export async function approveProgramme(programmeId: string): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (p.paused_at) return { ok: false, reason: 'Cannot approve a paused programme.' }
  if (p.status !== 'READY_FOR_APPROVAL') return { ok: false, reason: `Cannot approve from ${p.status}.` }
  await setStatus(programmeId, 'APPROVED', { approved_at: new Date().toISOString() })
  return { ok: true }
}

export async function markReadyForApproval(programmeId: string): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (p.status !== 'SOURCING' && p.status !== 'SOURCING_AUTHORISED') {
    return { ok: false, reason: `Cannot ready-for-approval from ${p.status}.` }
  }
  await setStatus(programmeId, 'READY_FOR_APPROVAL')
  return { ok: true }
}

/**
 * ⚠️ THE CAMPAIGN GATE. A programme campaign may start ONLY when the second payment is
 * recorded and the programme is LIVE (founder lock 5). This is a function, not a comment,
 * so every caller asks the same question and no route can decide it locally.
 */
// ═══════════════════════════════════════════════════════════════════════════════════════
// 🔐 INTERNAL PROGRAMME AUTHORITY — House / Client Zero, without inventing money.
//
// ⚑ 2 Sep. House is a real internal launch canary, not a paying customer. It must walk the
// SAME lifecycle a customer walks — Proof → Recommendation → P1 → sourcing → review → ONE
// approval → P2 → Live — but its two payment stages are AUTHORITY, not money.
//
// 🛑 WHY A SEPARATE COLUMN AND NOT `first_paid_at`. That column is simultaneously the sourcing
// key AND the revenue trigger: `computeContribution` reads `(first_paid_at ? first_payment_
// cents : 0)`, and a partner's commission derives from that figure. Setting it on House would
// invent revenue on an account that has paid nothing — the exact thing the founder locked
// against ("House must NEVER create fake Stripe payments, invoices, customer revenue").
//
// ⚠️ SOURCE IS DERIVED PER STAGE, NOT STORED. There is deliberately no `authority_source`
// column: P1 and P2 are independent authorities and could legitimately differ, so one
// programme-level enum could only lie about a mixed programme. `first_paid_at` means paid;
// `first_authorised_at` means internal; the operator audit log carries who and why.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Is P1 authorised at all — by money OR internally? One question, one answer, everywhere. */
export function p1Authorised(p: ProgrammeRow): boolean {
  return !!(p.first_paid_at || p.first_authorised_at)
}

/**
 * Is P2 authorised at all?
 *
 * ⚠️ THE PAID BRANCH REQUIRES BOTH `second_paid_at` AND `second_payment_ref`, because that is
 * exactly what `authorityFor` already demands for OUTREACH. A looser test here would let a
 * half-written payment row satisfy go-live while the send gate still refused.
 */
export function p2Authorised(p: ProgrammeRow): boolean {
  return !!((p.second_paid_at && p.second_payment_ref) || p.second_authorised_at)
}

/**
 * Record INTERNAL P1 authority. No money, no Stripe object, no invoice.
 *
 * ⚠️ THE STATE IS ENFORCED HERE, NOT IN THE BUTTON. `AWAITING_FIRST_PAYMENT` only — the same
 * state the paid path passes through, because `/checkout/first` calls `awaitFirstPayment`
 * before Stripe can ever return. Allowing it from DRAFT or RECOMMENDED would let House skip
 * the Recommendation stage the lifecycle locks in, and a UI-only rule is not a control:
 * a route is callable without the screen that hides its button.
 *
 * It does exactly what the paid path does MINUS the money: opens the sourcing ceiling to the
 * full recommended volume (founder lock 4 — half the money, all of the authority; here, no
 * money, the same authority) and moves to SOURCING_AUTHORISED.
 */
export async function authoriseFirstInternal(programmeId: string): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (TERMINAL_STATUSES.includes(p.status)) return { ok: false, reason: `This programme is ${p.status}.` }
  if (p.paused_at) return { ok: false, reason: 'Cannot authorise a paused programme.' }
  if (p.status !== 'AWAITING_FIRST_PAYMENT') {
    return { ok: false, reason: `Internal P1 authority may only be recorded from AWAITING_FIRST_PAYMENT, not ${p.status}.` }
  }
  if (p.first_authorised_at) return { ok: true }   // idempotent: already internally authorised
  // 🛑 XOR, including the intent id — a stage that holds ANY payment evidence is a paid stage.
  if (p.first_paid_at || p.first_payment_ref || p.first_payment_intent_id) {
    return { ok: false, reason: 'This programme already has P1 PAYMENT evidence. A stage cannot hold both a payment and internal authority.' }
  }

  // Compare-and-set on the column itself: two concurrent presses cannot both win.
  const { error } = await db.from('programmes').update({
    first_authorised_at: new Date().toISOString(),
    sourcing_ceiling: p.recommended_volume,
    status: 'SOURCING_AUTHORISED',
    updated_at: new Date().toISOString(),
  }).eq('id', programmeId).is('first_authorised_at', null).select()
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

/**
 * Record INTERNAL P2 authority.
 *
 * 🛑 IT DOES NOT MAKE THE PROGRAMME LIVE, AND THAT IS THE WHOLE POINT. The Stripe path
 * (`recordSecondPayment`) auto-advances to LIVE because for a paying customer the payment IS
 * the last human act. For House, P2 authority and Go Live are two separate founder decisions
 * with #553's ladder, suppression and the mailbox checks in between — collapsing them would
 * remove one of the two controls the founder locked.
 */
export async function authoriseSecondInternal(programmeId: string): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (TERMINAL_STATUSES.includes(p.status)) return { ok: false, reason: `This programme is ${p.status}.` }
  if (p.paused_at) return { ok: false, reason: 'Cannot authorise a paused programme.' }
  if (p.status !== 'APPROVED' || !p.approved_at) {
    return { ok: false, reason: 'Internal P2 authority requires an APPROVED programme with an approval recorded. Approval comes first.' }
  }
  if (p.second_authorised_at) return { ok: true }   // idempotent
  if (p.second_paid_at || p.second_payment_ref || p.second_payment_intent_id) {
    return { ok: false, reason: 'This programme already has P2 PAYMENT evidence. A stage cannot hold both a payment and internal authority.' }
  }

  // ⚠️ STATUS AND went_live_at ARE ABSENT FROM THIS UPDATE ON PURPOSE.
  const { error } = await db.from('programmes').update({
    second_authorised_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', programmeId).is('second_authorised_at', null).select()
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

/**
 * THE EXPLICIT GO-LIVE — the last product control before outreach is permitted.
 *
 * ⚠️ ALREADY-LIVE IS A SUCCESS THAT WRITES NOTHING. "Requires `went_live_at` to be null" and
 * "idempotent" are different claims and both are true of different branches: a programme that
 * is legitimately live returns success without touching the row, and only a genuine
 * transition writes — guarded by `.is('went_live_at', null)` so two concurrent presses cannot
 * both stamp a timestamp. Same compare-and-set shape as `recordFirstPayment`.
 */
export async function goLiveProgramme(
  programmeId: string,
): Promise<ProgrammeResult & { alreadyLive?: boolean }> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (p.status === 'LIVE' && p.went_live_at) return { ok: true, alreadyLive: true }
  if (TERMINAL_STATUSES.includes(p.status)) return { ok: false, reason: `This programme is ${p.status}.` }
  if (p.paused_at) return { ok: false, reason: 'Cannot go live while the programme is paused.' }
  if (p.status !== 'APPROVED') return { ok: false, reason: `Cannot go live from ${p.status}. Approval comes first.` }
  if (!p.approved_at) return { ok: false, reason: 'This programme has no approval recorded, so it cannot go live.' }
  if (!p2Authorised(p)) {
    return { ok: false, reason: 'P2 authority is missing. Payment 1 authorises sourcing and preparation only.' }
  }

  const { data, error } = await db.from('programmes').update({
    status: 'LIVE',
    went_live_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', programmeId).is('went_live_at', null).select()
  if (error) return { ok: false, reason: error.message }
  if (!data || data.length === 0) return { ok: true, alreadyLive: true }
  return { ok: true }
}

export function mayStartCampaign(p: ProgrammeRow): { allowed: boolean; reason?: string } {
  if (p.paused_at) return { allowed: false, reason: 'The programme is paused.' }
  // ⚑ 2 Sep — P2 is satisfied by a payment OR internal authority, and `p2Authorised` is the
  // ONE definition of that. Restating `second_paid_at && second_payment_ref` here would let
  // a programme reach LIVE through `goLiveProgramme` (which already uses the helper) and then
  // be refused by this gate — the two would disagree about the same fact.
  if (!p2Authorised(p)) {
    return { allowed: false, reason: 'The second payment has not been received.' }
  }
  if (p.status !== 'LIVE') return { allowed: false, reason: `The programme is ${p.status}, not LIVE.` }
  return { allowed: true }
}

// ── PAUSE ───────────────────────────────────────────────────────────────────────────────

/**
 * Pause stops sourcing AND sending. Orthogonal to status — the programme keeps the state it
 * must return to.
 *
 * ⚠️ A MATERIAL ICP CHANGE PAUSES FUTURE SOURCING (founder lock 6) and is a first-class
 * reason, not an operator note: it must be distinguishable from a client-initiated pause,
 * because only one of the two is a commercial signal.
 */
export async function pauseProgramme(programmeId: string, reason: PauseReason): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (TERMINAL_STATUSES.includes(p.status)) return { ok: false, reason: `Cannot pause a ${p.status} programme.` }
  if (p.paused_at) return { ok: true } // idempotent — pausing twice is not an error
  await db.from('programmes').update({
    paused_at: new Date().toISOString(), pause_reason: reason, updated_at: new Date().toISOString(),
  }).eq('id', programmeId)
  return { ok: true }
}

export async function resumeProgramme(programmeId: string): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  await db.from('programmes').update({
    paused_at: null, pause_reason: null, updated_at: new Date().toISOString(),
  }).eq('id', programmeId)
  return { ok: true }
}

/**
 * Whether the SECOND payment may be charged at all (founder lock 6).
 *
 * "If paused before Go Live: the second 50% is not charged." So a paused, not-yet-live
 * programme must not even be offered a checkout — refusing at the webhook alone would take
 * the client's money and then refuse to act on it.
 */
export function maySecondCharge(p: ProgrammeRow): { allowed: boolean; reason?: string } {
  if (p.went_live_at) return { allowed: false, reason: 'The programme is already live.' }
  if (p.paused_at) return { allowed: false, reason: 'Paused before Go Live — the second payment is not charged.' }
  if (p.status !== 'APPROVED') return { allowed: false, reason: `The programme is ${p.status}, not APPROVED.` }
  return { allowed: true }
}

// ── BATCHES · RESERVE AND RELEASE ───────────────────────────────────────────────────────

export interface BatchRow {
  id: string; programme_id: string; seq: number
  requested: number; granted: number; delivered: number | null
  status: 'running' | 'served' | 'released' | 'stranded'
  reservation_id: string | null
}

/** The next batch size: ~250, or whatever authority remains if less (founder lock 4). */
export function nextBatchSize(p: ProgrammeRow): number {
  const room = Math.max(0, p.sourcing_ceiling - p.sourced_used - p.sourced_reserved)
  return Math.min(PROGRAMME_BATCH_SIZE, room)
}

/**
 * CLAIM the programme's open batch — return the one already running, or create exactly one.
 *
 * ⛓️ 29 Aug (BUILD-003 PR2) — THIS WAS A READ-MAX-THEN-INSERT, AND CHECK-THEN-ACT WAS THE BUG.
 * It read `MAX(seq)`, added one and inserted. `(programme_id, seq)` is unique
 * (`programme_batches_seq_uidx`, 20260828), so a straight race produced one winner and one
 * unique violation — and this function returned `null` on error, which reads as "could not
 * open a batch". A caller that RETRIED then read the NEW max, computed seq+1, and inserted
 * successfully: **two batches in status 'running' on one programme, each holding its own
 * reservation against the client's paid ceiling.** No unique key on `(programme_id, seq)`
 * could ever have caught that — the second batch has a legitimately different seq.
 *
 * 🛑 A cron re-fire, a redelivered Stripe webhook and an operator clicking twice are all that
 * retry. None of them looks like an error anywhere.
 *
 * The fix is database truth, in two layers that fail in different directions:
 *   · `claim_programme_batch` serialises claimers with `FOR UPDATE` on the programme row and
 *     returns the existing running batch instead of failing — so a retry is IDEMPOTENT.
 *   · `programme_batches_one_running_uidx` (partial unique on programme_id where running) is
 *     the backstop if anything ever writes the table without the RPC.
 *
 * Still returns `null` on failure — every caller already treats null as "not done", and that
 * contract is unchanged.
 */
export async function openBatch(programmeId: string, requested: number, granted: number): Promise<BatchRow | null> {
  const { data, error } = await db.rpc('claim_programme_batch', {
    p_programme_id: programmeId, p_requested: requested, p_granted: granted,
  })
  if (error) {
    // ⚠️ NOT SILENT. A batch that cannot be claimed means paid sourcing does not start, and
    // the old code's bare `return null` gave an operator nothing to look at.
    console.error(`[programme] could not claim a batch for programme ${programmeId}:`, error.message)
    return null
  }
  // supabase-js returns a composite-returning function as the row itself, or as a one-row
  // array depending on the driver path. Both are handled rather than assumed.
  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    console.error(`[programme] claim_programme_batch returned no row for programme ${programmeId}`)
    return null
  }
  return row as BatchRow
}

/**
 * Settle a batch once the provider has returned.
 *
 * ⚠️ RESERVE/RELEASE EXISTS BECAUSE PAID ENTITLEMENT MUST NOT EVAPORATE. Authority is
 * RESERVED at grant, then converted to `used` for what a provider actually delivered — and
 * the remainder is RELEASED. A provider returning zero (which has happened here: the 25 Aug
 * proof run reserved 20 and PDL returned nothing) must not permanently consume volume the
 * client paid for.
 *
 * ⚠️ AND IF THE RELEASE ITSELF FAILS, THAT BECOMES EVIDENCE, NOT SILENCE. The batch is marked
 * `stranded` — an indexed dead-letter state — and the founder is alerted. A swallowed release
 * error is a client quietly losing entitlement with nothing anywhere to find it by.
 */
export async function settleBatch(batchId: string, delivered: number): Promise<{ ok: boolean; delivered?: number; stranded?: boolean }> {
  const { data, error } = await db.rpc('settle_programme_batch', {
    p_batch_id: batchId, p_delivered: delivered,
  })
  if (error) {
    const { error: markErr } = await db.from('programme_batches')
      .update({ status: 'stranded', settled_at: new Date().toISOString() }).eq('id', batchId)
    void sendFounderAlert('payment_failed', 'Programme sourcing reservation could not be settled', [
      `Batch ${batchId} could not be settled (${delivered} delivered). Reason: ${error.message}`,
      markErr
        ? `⚠️ AND the batch could not even be marked stranded (${markErr.message}) — this alert is the only record.`
        : 'The batch is marked STRANDED. Client programme volume is still reserved and must be released by hand.',
      'A client has paid for this volume. It is not lost, but it is not usable until this is reconciled.',
    ])
    return { ok: false, stranded: true }
  }
  return { ok: true, delivered: typeof data === 'number' ? data : 0 }
}

// ── VALUE, COMPLETION AND MAKE-WHOLE ────────────────────────────────────────────────────

/**
 * ⚠️ UNUSED PROGRAMME VALUE NEVER EXPIRES (founder lock 6). A programme may become COMPLETED
 * only when its authorised volume is consumed, OR when the value has been deliberately
 * settled by a human. **No background job may complete a programme on a clock.**
 */
export function mayComplete(p: ProgrammeRow): { allowed: boolean; reason?: string } {
  if (p.sourced_used >= p.sourcing_ceiling && p.sourcing_ceiling > 0) return { allowed: true }
  if (p.value_settled_at) return { allowed: true }
  return {
    allowed: false,
    reason: `${p.sourcing_ceiling - p.sourced_used} of ${p.sourcing_ceiling} authorised leads are undelivered and the value has not been settled. Unused programme value never expires.`,
  }
}

export async function completeProgramme(programmeId: string): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  const gate = mayComplete(p)
  if (!gate.allowed) return { ok: false, reason: gate.reason }
  await setStatus(programmeId, 'COMPLETED')
  return { ok: true }
}

/**
 * Make whole for authorised value K.I.N.D cannot deliver (founder lock 6).
 *
 * ⚠️ THIS IS A DELIVERY OBLIGATION, NOT A REFUND, and the two are kept separate on purpose.
 * A refund is money returning through Stripe; make-whole is value we owe. Conflating them
 * would let a make-whole decision look like a payment reversal in the ledger, and would
 * encode a contract interpretation nobody has taken.
 */
export async function recordMakeWhole(programmeId: string, cents: number, note: string): Promise<ProgrammeResult> {
  if (!Number.isInteger(cents) || cents < 0) return { ok: false, reason: 'Make-whole must be a non-negative integer number of cents.' }
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  await db.from('programmes').update({
    make_whole_cents: p.make_whole_cents + cents,
    value_settled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', programmeId)
  void sendFounderAlert('churn_risk', 'Programme make-whole recorded', [
    `Programme ${programmeId} (client ${p.client_id}): ${cents} cents of undelivered authorised value settled.`,
    note,
    'This is a DELIVERY obligation, not a Stripe refund. If money is also to be returned, do that separately.',
  ])
  return { ok: true }
}

/** A chargeback cannot be refused by code. Record it, stop delivery, preserve evidence, alert. */
export async function recordDispute(programmeId: string, detail: string): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  await db.from('programmes').update({
    disputed_at: new Date().toISOString(),
    paused_at: p.paused_at ?? new Date().toISOString(),
    pause_reason: p.pause_reason ?? 'quality',
    updated_at: new Date().toISOString(),
  }).eq('id', programmeId)
  void sendFounderAlert('churn_risk', 'Programme payment disputed — delivery stopped', [
    `Programme ${programmeId} (client ${p.client_id}) has a dispute/chargeback.`,
    detail,
    'Sourcing and sending are paused. Nothing has been deleted — the programme, its batches and its ledger rows are preserved as evidence.',
  ])
  return { ok: true }
}

// ── CONTRIBUTION ────────────────────────────────────────────────────────────────────────

/**
 * The launch estimates for costs we cannot yet attribute exactly.
 *
 * ⚠️ EVERY ONE OF THESE IS AN ESTIMATE AND IS LABELLED AS ONE. Provider sourcing is ACTUAL —
 * read from the programme-attributed `sourcing_ledger` rows. The rest have no per-programme
 * instrumentation yet, so they are rates, and `ContributionBreakdown.estimated` says so. A
 * figure presented as measured when it was assumed is the defect this whole reset exists for.
 */
export const CONTRIBUTION_RATES = {
  /** AI/work per delivered lead, cents. Launch estimate. */
  aiPerLeadCents: 2,
  /** Sending per delivered lead, cents. Launch estimate. */
  sendingPerLeadCents: 3,
  /** Stripe + FX as a percentage of programme revenue. Estimate until actual fees attribute. */
  stripePct: 5,
} as const

export interface ContributionBreakdown {
  programmeId: string
  revenueCents: number
  providerSourcingCents: number
  aiCents: number
  sendingCents: number
  stripeCents: number
  contributionCents: number
  /** True while any input is a rate rather than a measurement. */
  estimated: boolean
  /** True unless the programme is terminal AND settled — see `finaliseContribution`. */
  provisional: boolean
}

/**
 * Compute programme contribution (R78): programme revenue MINUS directly attributable
 * acquisition and delivery costs. **Fixed company overhead is excluded** — which is exactly
 * why this is never "net profit" and never "net margin".
 *
 * ⚠️ REVENUE IS WHAT WAS ACTUALLY COLLECTED, not what was quoted. A programme that took only
 * its first payment contributes only that; counting the full price would inflate contribution
 * — and therefore a partner's commission — on money nobody has paid.
 */
export async function computeContribution(programmeId: string): Promise<ContributionBreakdown | null> {
  const p = await getProgramme(programmeId)
  if (!p) return null

  const revenueCents =
    (p.first_paid_at ? p.first_payment_cents : 0) +
    (p.second_paid_at ? p.second_payment_cents : 0) -
    p.make_whole_cents

  // ACTUAL provider cost, attributed to this programme by the sourcing ledger.
  const { data: rows } = await db.from('sourcing_ledger')
    .select('cost_usd').eq('programme_id', programmeId)
  const providerUsd = ((rows ?? []) as { cost_usd: number | string }[])
    .reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0)
  const providerSourcingCents = Math.round(providerUsd * 100)

  const aiCents = p.sourced_used * CONTRIBUTION_RATES.aiPerLeadCents
  const sendingCents = p.sourced_used * CONTRIBUTION_RATES.sendingPerLeadCents
  const stripeCents = Math.round((revenueCents * CONTRIBUTION_RATES.stripePct) / 100)

  const contributionCents = revenueCents - providerSourcingCents - aiCents - sendingCents - stripeCents

  return {
    programmeId, revenueCents, providerSourcingCents, aiCents, sendingCents, stripeCents,
    contributionCents,
    estimated: true, // ai, sending and stripe are rates until real attribution exists
    provisional: !(TERMINAL_STATUSES.includes(p.status) && p.value_settled_at !== null),
  }
}

/**
 * Persist contribution ONCE, when the programme is terminal and its value is settled.
 *
 * ⚠️ A PROVISIONAL FIGURE IS NEVER STORED. While a programme is live its costs are still
 * moving, so `contribution_cents` stays NULL and callers compute on demand and label the
 * result provisional. Persisting a live number would make a partner commission derivable
 * from a figure that later changed — the precise shape of R68's warning about a half-migrated
 * price, applied to contribution instead.
 */
export async function finaliseContribution(programmeId: string): Promise<{ ok: boolean; cents?: number; reason?: string }> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (p.contribution_finalised_at) return { ok: true, cents: p.contribution_cents ?? 0 }
  if (!TERMINAL_STATUSES.includes(p.status)) {
    return { ok: false, reason: `Contribution is finalised only on a terminal programme — this one is ${p.status}.` }
  }
  if (!p.value_settled_at && p.sourced_used < p.sourcing_ceiling) {
    return { ok: false, reason: 'Undelivered authorised value has not been settled — contribution is not final.' }
  }
  const b = await computeContribution(programmeId)
  if (!b) return { ok: false, reason: 'Could not compute contribution.' }
  await db.from('programmes').update({
    contribution_cents: b.contributionCents,
    contribution_finalised_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', programmeId)
  return { ok: true, cents: b.contributionCents }
}

/**
 * Write the partner's commission for a programme: 25% of FINALISED contribution (R78).
 *
 * ⚠️ REFUSES A PROGRAMME WHOSE CONTRIBUTION IS NOT FINALISED. This is the seam that stops a
 * partner being paid on a provisional number, and it is a hard refusal rather than a warning
 * because the money leaves the company.
 */
export async function writeProgrammePartnerCommission(params: {
  programmeId: string; partnerId: string; periodMonth: string
}): Promise<{ ok: boolean; cents?: number; reason?: string }> {
  const p = await getProgramme(params.programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (p.contribution_cents === null || !p.contribution_finalised_at) {
    return { ok: false, reason: 'Programme contribution is not finalised — a partner is never paid on a provisional figure.' }
  }
  const cents = partnerCommissionCents(p.contribution_cents)
  const { error } = await db.from('partner_commissions').insert({
    partner_id: params.partnerId,
    client_id: p.client_id,
    programme_id: p.id,
    basis: 'programme_contribution',
    amount_usd: cents / 100,
    amount_zar: 0,
    period_month: params.periodMonth,
    status: 'pending',
  })
  if (error) return { ok: false, reason: error.message }
  return { ok: true, cents }
}

export { recommendedVolume }
