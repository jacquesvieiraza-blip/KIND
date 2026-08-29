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
  first_paid_at: string | null
  second_paid_at: string | null
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
}

export interface ProgrammeResult { ok: boolean; reason?: string; programme?: ProgrammeRow }

/** The client's single open programme, or null. Terminal programmes are not "open". */
export async function openProgrammeForClient(clientId: string): Promise<ProgrammeRow | null> {
  const { data } = await db.from('programmes').select('*')
    .eq('client_id', clientId)
    .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
    .maybeSingle()
  return (data as ProgrammeRow | null) ?? null
}

export async function getProgramme(programmeId: string): Promise<ProgrammeRow | null> {
  const { data } = await db.from('programmes').select('*').eq('id', programmeId).maybeSingle()
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
export function mayStartCampaign(p: ProgrammeRow): { allowed: boolean; reason?: string } {
  if (p.paused_at) return { allowed: false, reason: 'The programme is paused.' }
  if (!p.second_paid_at || !p.second_payment_ref) {
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

export async function openBatch(programmeId: string, requested: number, granted: number): Promise<BatchRow | null> {
  const { data: last } = await db.from('programme_batches').select('seq')
    .eq('programme_id', programmeId).order('seq', { ascending: false }).limit(1).maybeSingle()
  const seq = ((last as { seq?: number } | null)?.seq ?? 0) + 1
  const { data, error } = await db.from('programme_batches')
    .insert({ programme_id: programmeId, seq, requested, granted, status: 'running' })
    .select().single()
  if (error) return null
  return data as BatchRow
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
