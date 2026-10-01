// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 Q2 · R184 · Coaching F3 · #2485 / #2521) — FULL COACHING: ONE PAYMENT, ONE ROW.
//
// The founder's rulings: Full Coaching is paid at activation as ONE charge of uplift × the
// meetings still to come (R180 Q2: *"yes"*); any of those meetings not delivered returns its
// uplift with the shortfall credit; the uplift is LOCKED at $100 per meeting (R184: *"$100 yes"*)
// and lives in `@kind/shared` — never typed here. Founders and Growth may buy it; Enterprise
// already owns it and is NEVER sold it (R180).
//
// THREE MOVES, ALL HERE so the money rules for Coaching live in one file:
//   ① `createCoachingCheckout` — every refusal BEFORE Stripe, in plain English, nothing charged.
//   ② `recordCoachingActivation` — the webhook's record of a paid session. The webhook is the
//      authority, never the checkout URL: an abandoned checkout records nothing.
//   ③ `deactivateCoachingForPayment` — a refund or dispute switches Coaching OFF. The row stays.
// And the settlement's half: `coachingUpliftForSettlement` / `markUpliftReturned`, called from
// `settleProgrammeShortfall` inside its own claim.
//
// ⚠️ ITS OWN MODULE, LIKE `programme-checkout.ts`, and for the same reason: it imports the
// shared Coaching price and nothing legacy, so the legacy fence never needs an exception.
// ═══════════════════════════════════════════════════════════════════════════════════════
import Stripe from 'stripe'
import { db } from '@kind/db'
import { stripeSdkHostOptions } from './provider-hosts'
import { sendFounderAlert } from './alerts'
import { FULL_COACHING_UPLIFT_PER_MEETING_CENTS, fullCoachingActivationCents, coachingIncluded } from '@kind/shared'

const key = process.env.STRIPE_SECRET_KEY
// Spreads to `{}` when `STRIPE_BASE_URL` is unset: production unchanged (same as programme checkout).
const stripe = key ? new Stripe(key, { ...stripeSdkHostOptions() }) : null

export const COACHING_ACTIVATION_TYPE = 'coaching_activation'

export type CoachingActivationRow = {
  id: string
  programme_id: string
  client_id: string
  meetings_covered: number
  delivered_at_activation: number
  uplift_cents_per_meeting: number
  paid_cents: number
  payment_ref: string
  payment_intent_id: string | null
  activated_at: string
  deactivated_at: string | null
  deactivated_reason: string | null
  uplift_returned_cents: number
}

/** The programme fields the checkout needs. The route passes the full open-programme row. */
export type CoachingProgramme = {
  id: string
  client_id?: string | null
  meeting_target: number | null
  size_band?: string | null
  status?: string | null
  paused_at?: string | null
  disputed_at?: string | null
  shortfall_credited_at?: string | null
}

export type CoachingCheckoutResult =
  | { ok: true; url: string; sessionId: string; amountCents: number; meetingsCovered: number }
  | { ok: false; status: number; error: string }

/** A table that does not exist yet (migration 20261001_coaching_activations not applied). */
function isMissingTable(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  return err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache/i.test(err.message ?? '')
}

/**
 * The activation for one programme (live or switched off), or `null` for none.
 * ⚠️ AN UNREADABLE ANSWER IS ITS OWN RESULT, never "none": a checkout minted because a read
 * failed is a second charge for something already bought.
 */
export async function readActivation(programmeId: string):
  Promise<{ ok: true; row: CoachingActivationRow | null } | { ok: false; missingTable: boolean; reason: string }> {
  try {
    const { data, error } = await db.from('coaching_activations').select('*').eq('programme_id', programmeId).maybeSingle()
    if (error) return { ok: false, missingTable: isMissingTable(error), reason: error.message ?? 'unreadable' }
    const row = (data as CoachingActivationRow | null) ?? null
    // ⚠️ A ROW WITHOUT ITS MONEY FIELDS IS UNREADABLE, not "nothing owed": the settlement would
    // otherwise compute NaN and quietly return no uplift.
    if (row && ![row.meetings_covered, row.delivered_at_activation, row.uplift_cents_per_meeting, row.paid_cents]
      .every(n => Number.isInteger(n))) {
      return { ok: false, missingTable: false, reason: 'the activation row is missing its money fields' }
    }
    return { ok: true, row }
  } catch (err) {
    return { ok: false, missingTable: false, reason: err instanceof Error ? err.message : 'unreadable' }
  }
}

const refuse = (status: number, error: string): CoachingCheckoutResult => ({ ok: false, status, error })

/**
 * ① THE CHECKOUT. Every refusal is decided here, before a Stripe session exists, so nothing is
 * minted and nothing is charged — and each says why in the client's words.
 */
export async function createCoachingCheckout(
  clientId: string, programme: CoachingProgramme, successUrl: string, cancelUrl: string,
): Promise<CoachingCheckoutResult> {
  // 🛑 THE PROGRAMME MUST BE THIS CLIENT'S. The route resolves it from the session; this is the
  // second lock, because the metadata below becomes the webhook's authority.
  if (!programme.client_id || programme.client_id !== clientId) return refuse(404, 'There is no programme running.')

  // 🛑 A DEMO ACCOUNT IS NEVER CHARGED (25 Sep lock, `programme-checkout.ts`). House needs no check of
  // its own: it is never priced on a size band (R166 transition), so the plan check below refuses it.
  const { isDemoClient } = await import('./demo')
  if (await isDemoClient(clientId).catch(() => true)) return refuse(409, 'This is a demo account, so nothing is ever charged.')

  const plan = (['founders', 'growth', 'enterprise'] as const).find(b => b === programme.size_band) ?? null
  // 🛑 ENTERPRISE ALREADY OWNS COACHING — never sold (R180).
  if (plan && coachingIncluded(plan)) return refuse(400, 'Full Coaching is already part of your plan.')
  if (plan !== 'founders' && plan !== 'growth') return refuse(400, 'Full Coaching can be added to the Founders and Growth plans.')

  // Only while the programme is delivering: a paused, disputed or settled programme has no
  // "meetings still to come" we can promise.
  if (programme.status !== 'LIVE' || programme.paused_at || programme.disputed_at || programme.shortfall_credited_at) {
    return refuse(409, 'Full Coaching can be turned on while your programme is running. Nothing was charged.')
  }

  // The moment decides whether it is on offer: 50%, or 75% after "not now" — never after "no thanks".
  const { ensureMoment } = await import('./expansion-moments')
  const view = await ensureMoment(clientId, programme as never)
  if (!view) return refuse(409, 'Full Coaching opens at the halfway point of your programme. Nothing was charged.')
  if (view.milestone === 25) return refuse(409, 'Full Coaching opens at the halfway point of your programme. Nothing was charged.')
  if (view.milestone === 75 && view.response50 !== 'not_now' && view.response50 !== 'accepted') {
    // ⚠️ "accepted" at 50% with no payment recorded is an UNFINISHED yes (the client opened the
    // payment page and left), so it is still open at 75%. "declined" closes it (R180).
    return refuse(409, view.response50 === 'declined'
      ? 'You said no thanks to Full Coaching at halfway, so it is not offered again. Nothing was charged.'
      : 'Full Coaching is not on offer at this point of your programme. Nothing was charged.')
  }

  const existing = await readActivation(programme.id)
  if (!existing.ok) {
    console.error(`[coaching-billing] activation unreadable for ${programme.id}: ${existing.reason}`)
    return refuse(503, "We couldn't check whether Full Coaching is already on, so nothing was charged. Please try again shortly.")
  }
  if (existing.row && !existing.row.deactivated_at) return refuse(409, 'Full Coaching is already on for this programme.')
  if (existing.row) return refuse(409, 'Full Coaching was switched off after a refund on this programme. Talk to us to turn it back on. Nothing was charged.')

  const remaining = Math.max(0, Math.floor(view.remaining))
  if (remaining < 1) return refuse(409, 'There are no meetings still to come, so there is nothing to add Coaching to. Nothing was charged.')

  const { data: c } = await db.from('clients').select('contact_email').eq('id', clientId).maybeSingle()
  const email = (c as { contact_email?: string | null } | null)?.contact_email
  if (typeof email !== 'string' || email.trim() === '') {
    return refuse(400, 'We do not have your email address, so we could not start the payment. Nothing was charged.')
  }

  if (!stripe) return refuse(503, 'Payments are not set up yet, so nothing was charged. Please try again later.')

  // ⚠️ THE AMOUNT COMES FROM `@kind/shared` IN INTEGER CENTS — the same constant every screen shows.
  const amountCents = fullCoachingActivationCents(remaining)
  const upliftCents = FULL_COACHING_UPLIFT_PER_MEETING_CENTS
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email.trim(),
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: `K.I.N.D Full Coaching — the ${remaining === 1 ? 'meeting' : `${remaining} meetings`} still to come` },
        },
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // ⚠️ IDENTITY, NOT PERMISSION. The webhook re-checks the amount against these figures and
      // the table's UNIQUE keys decide whether anything is recorded.
      metadata: {
        type: COACHING_ACTIVATION_TYPE,
        clientId,
        programmeId: programme.id,
        meetingsCovered: String(remaining),
        deliveredAtActivation: String(view.delivered),
        upliftCents: String(upliftCents),
      },
    })
    if (!session.url) return refuse(502, 'We could not start the payment. Nothing was charged.')
    return { ok: true, url: session.url, sessionId: session.id, amountCents, meetingsCovered: remaining }
  } catch (err) {
    console.error('[coaching-billing] checkout error:', err)
    return refuse(502, 'We could not start the payment. Nothing was charged.')
  }
}

export type RecordResult =
  | { ok: true; alreadyRecorded: boolean }
  /** `retry: true` → answer Stripe 500 so it redelivers. `false` → 200; a human decides. */
  | { ok: false; retry: boolean; reason: string }

const posInt = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * ② THE WEBHOOK'S RECORD of a paid Coaching session.
 *
 * 🛑 THE AMOUNT PAID MUST BE WHAT THE ROW SAYS IT COVERS. A mismatch records nothing (a retry
 * cannot fix it) and tells the founder. 🛑 IDEMPOTENT: the same session again is success, not a
 * second row; a DIFFERENT session for a programme already activated is refused and alerted —
 * that is a client who paid twice, and the founder refunds it.
 */
export async function recordCoachingActivation(session: {
  id: string; amount_total?: number | null; payment_intent?: unknown; metadata?: Record<string, string | undefined> | null
}): Promise<RecordResult> {
  const meta = session.metadata ?? {}
  const covered = posInt(meta.meetingsCovered)
  const uplift = posInt(meta.upliftCents)
  const deliveredAt = Number(meta.deliveredAtActivation)
  const intentId = typeof session.payment_intent === 'string' ? session.payment_intent : null
  const where = `Programme ${meta.programmeId ?? '?'} (client ${meta.clientId ?? '?'}) — Stripe session ${session.id}.`

  if (!meta.programmeId || !meta.clientId || covered === null || uplift === null || !Number.isInteger(deliveredAt) || deliveredAt < 0) {
    void sendFounderAlert('payment_failed', 'A Full Coaching payment arrived without its details — not recorded', [
      where, 'The payment metadata is incomplete, so Coaching was NOT switched on. Check it in Stripe and refund or record it by hand.',
    ], { clientId: meta.clientId ?? null, programmeId: meta.programmeId ?? null, dedupeKey: `coaching_meta:${session.id}` })
    return { ok: false, retry: false, reason: 'incomplete metadata' }
  }
  const paid = session.amount_total
  if (typeof paid !== 'number' || paid !== covered * uplift) {
    void sendFounderAlert('payment_failed', 'A Full Coaching payment did not match its price — not recorded', [
      where,
      `Paid: ${typeof paid === 'number' ? `${paid} cents` : 'unknown'}. It should be ${covered} meetings × ${uplift} cents = ${covered * uplift} cents.`,
      'Coaching was NOT switched on. Decide by hand: refund in Stripe, or record what was paid.',
    ], { clientId: meta.clientId, programmeId: meta.programmeId, dedupeKey: `coaching_mismatch:${session.id}` })
    return { ok: false, retry: false, reason: 'amount mismatch' }
  }

  const now = new Date().toISOString()
  const { error } = await db.from('coaching_activations').insert({
    programme_id: meta.programmeId, client_id: meta.clientId,
    meetings_covered: covered, delivered_at_activation: deliveredAt,
    uplift_cents_per_meeting: uplift, paid_cents: paid,
    payment_ref: session.id, payment_intent_id: intentId,
    activated_at: now, created_at: now, updated_at: now,
  })
  if (!error) return { ok: true, alreadyRecorded: false }
  if (error.code !== '23505') {
    // The money arrived and we could not record it: Stripe retries; the UNIQUE keys make it safe.
    return { ok: false, retry: true, reason: error.message ?? 'insert failed' }
  }

  // A UNIQUE key fired: this session already recorded (a replay), or the programme already has one.
  const existing = await readActivation(meta.programmeId)
  if (!existing.ok) return { ok: false, retry: true, reason: existing.reason }
  if (existing.row?.payment_ref === session.id) return { ok: true, alreadyRecorded: true }
  void sendFounderAlert('payment_failed', 'A second Full Coaching payment for the same programme — not recorded', [
    where,
    `This programme already has Full Coaching from session ${existing.row?.payment_ref ?? 'unknown'}. This payment of ${paid} cents was NOT recorded.`,
    'Refund this second payment in Stripe.',
  ], { clientId: meta.clientId, programmeId: meta.programmeId, dedupeKey: `coaching_duplicate:${session.id}` })
  return { ok: false, retry: false, reason: 'programme already activated by another payment' }
}

/**
 * ③ A REFUND OR DISPUTE OF A COACHING PAYMENT SWITCHES COACHING OFF. Stamped, never deleted.
 *
 * ⚠️ A PARTIAL REFUND DOES NOT SWITCH IT OFF. The founder refunding part of the payment (say, a
 * meeting's uplift as goodwill) is not the client taking Coaching back; the founder is told and
 * decides. A dispute always switches it off — the client's bank is reversing the whole charge.
 * `ok: false` → the route answers 500 so Stripe retries (the stamp is a compare-and-set).
 */
export async function deactivateCoachingForPayment(params: {
  sessionId: string | null; paymentIntentId: string | null; chargeId: string
  kind: 'refund' | 'dispute'; amountCents?: number | null; amountRefundedCents?: number | null
  clientId?: string | null; programmeId?: string | null
}): Promise<{ ok: true; deactivated: boolean } | { ok: false; reason: string }> {
  const { sessionId, paymentIntentId, chargeId, kind } = params
  if (kind === 'refund' && typeof params.amountCents === 'number' && typeof params.amountRefundedCents === 'number'
      && params.amountRefundedCents < params.amountCents) {
    void sendFounderAlert('churn_risk', 'Part of a Full Coaching payment was refunded — Coaching is still on', [
      `Charge ${chargeId}: ${params.amountRefundedCents} of ${params.amountCents} cents refunded. Programme ${params.programmeId ?? '?'}, client ${params.clientId ?? '?'}.`,
      'A partial refund does not switch Coaching off. If it should be off, refund the rest.',
    ], { clientId: params.clientId ?? null, programmeId: params.programmeId ?? null, dedupeKey: `coaching_partial_refund:${chargeId}:${params.amountRefundedCents}` })
    return { ok: true, deactivated: false }
  }
  if (!sessionId && !paymentIntentId) return { ok: false, reason: 'no session or payment intent to find the activation by' }
  const now = new Date().toISOString()
  let q = db.from('coaching_activations').update({
    deactivated_at: now,
    deactivated_reason: `${kind === 'dispute' ? 'Dispute (chargeback)' : 'Refund'} on charge ${chargeId}`,
    updated_at: now,
  })
  q = sessionId ? q.eq('payment_ref', sessionId) : q.eq('payment_intent_id', paymentIntentId as string)
  const { data, error } = await q.is('deactivated_at', null).select('id')
  if (error) return { ok: false, reason: error.message ?? 'update failed' }
  const deactivated = Array.isArray(data) && data.length > 0
  if (deactivated) {
    void sendFounderAlert('churn_risk', `Full Coaching switched off — ${kind === 'dispute' ? 'chargeback' : 'refund'}`, [
      `Charge ${chargeId}: the Full Coaching payment for programme ${params.programmeId ?? '?'} (client ${params.clientId ?? '?'}) was ${kind === 'dispute' ? 'disputed' : 'refunded'}.`,
      'Coaching is OFF for this programme. The programme itself was not paused — it was paid separately.',
      kind === 'dispute' ? 'Review the dispute in Stripe — you may need to submit evidence.' : 'No action needed unless this was unexpected.',
    ], { clientId: params.clientId ?? null, programmeId: params.programmeId ?? null, dedupeKey: `coaching_off:${chargeId}` })
  }
  return { ok: true, deactivated }
}

/**
 * The Stripe route's door for `charge.refunded` / `charge.dispute.created` on a Coaching payment.
 *
 * ⚠️ IT ANSWERS AND THE ROUTE STOPS. The Coaching payment carries `programmeId`, so without this
 * early stop the route's generic reversal handling would reach `recordDispute` and PAUSE THE
 * PROGRAMME — whose meetings were paid for separately — and pause the client's campaigns. Taking
 * back the Coaching money takes back Coaching, not the programme. A failed stamp answers 500 so
 * Stripe retries (the stamp is a compare-and-set, so the retry is safe).
 */
export async function coachingReversalStatus(
  eventType: string, object: unknown, sessionId: string | null, meta: Record<string, string | undefined>,
): Promise<200 | 500> {
  const obj = (object ?? {}) as { id?: string; payment_intent?: string | null; amount?: number | null; amount_refunded?: number | null }
  const r = await deactivateCoachingForPayment({
    sessionId, paymentIntentId: obj.payment_intent ?? null, chargeId: String(obj.id ?? 'unknown'),
    kind: eventType === 'charge.dispute.created' ? 'dispute' : 'refund',
    amountCents: obj.amount ?? null, amountRefundedCents: obj.amount_refunded ?? null,
    clientId: meta.clientId ?? null, programmeId: meta.programmeId ?? null,
  })
  if (!r.ok) {
    console.error(`[coaching-billing] ${eventType} — Full Coaching could not be switched off: ${r.reason}`)
    return 500
  }
  return 200
}

/**
 * THE UPLIFT OWED BACK AT SETTLEMENT. Pure.
 *
 * Covered meetings not delivered = max(0, covered − max(0, delivered − delivered at activation)),
 * each returning the uplift it was paid at (R180 Q2). A switched-off (refunded) activation returns
 * nothing — the money already went back through Stripe. One already returned returns nothing again.
 */
export function upliftReturnCents(row: CoachingActivationRow | null, deliveredMeetings: number): number {
  if (!row || row.deactivated_at || Number(row.uplift_returned_cents ?? 0) > 0) return 0
  const deliveredSince = Math.max(0, deliveredMeetings - row.delivered_at_activation)
  const notDelivered = Math.max(0, row.meetings_covered - deliveredSince)
  return Math.min(row.paid_cents, notDelivered * row.uplift_cents_per_meeting)
}

/**
 * For `settleProgrammeShortfall`: the activation and what it returns. Only Founders and Growth
 * programmes can hold one, so other programmes are not read at all.
 * ⚠️ UNREADABLE REFUSES THE SETTLEMENT (retryable) — settling without it would close the
 * programme and strand the client's uplift. An absent TABLE is "none": no row can exist yet.
 */
export async function coachingUpliftForSettlement(
  p: { id: string; size_band?: string | null }, deliveredMeetings: number,
): Promise<{ ok: true; row: CoachingActivationRow | null; cents: number } | { ok: false; reason: string }> {
  if (p.size_band !== 'founders' && p.size_band !== 'growth') return { ok: true, row: null, cents: 0 }
  const r = await readActivation(p.id)
  if (!r.ok) return r.missingTable ? { ok: true, row: null, cents: 0 } : { ok: false, reason: r.reason }
  return { ok: true, row: r.row, cents: upliftReturnCents(r.row, deliveredMeetings) }
}

/** Record the uplift returned. Compare-and-set on 0, so it is written once. */
export async function markUpliftReturned(activationId: string, cents: number): Promise<boolean> {
  const { data, error } = await db.from('coaching_activations')
    .update({ uplift_returned_cents: cents, updated_at: new Date().toISOString() })
    .eq('id', activationId).eq('uplift_returned_cents', 0).select('id')
  return !error && Array.isArray(data) && data.length > 0
}
