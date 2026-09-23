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
import { DEFAULT_PROGRAMME_SEND_SCHEDULE } from './programme-sequence'
import {
  quoteProgramme, recommendedVolume, partnerCommissionCents, sourcingCeiling,
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
  // ⚠️ THE INTENT IDS ARE PAYMENT EVIDENCE, and the XOR guards below read them. A stage
  // holding a Stripe payment intent is a paid stage even before its session ref lands, so
  // omitting them from the row would leave the internal-authority guards blind to the exact
  // window the refund/dispute path cares about.
  first_payment_intent_id: string | null
  second_payment_intent_id: string | null
  first_paid_at: string | null
  second_paid_at: string | null
  // ── PR A1/A2 · INTERNAL AUTHORITY (20260902_programme_internal_authority) ──────────────
  //
  // 🛑 SEPARATE FROM `first_paid_at` ON PURPOSE. That column is simultaneously the sourcing
  // key AND the revenue trigger — `computeContribution` reads it — so authorising House by
  // stamping it would have invented revenue, an invoice figure and a partner commission on
  // an account that has paid nothing. Authority and money are different facts; only one of
  // them is money.
  //
  // PER STAGE, not per programme: a House programme authorised internally at P1 may take a
  // genuine payment at P2, and one programme-level `authority_source` enum could only lie
  // about that row. Two DB CHECKs enforce that a single stage never holds both.
  first_authorised_at: string | null
  second_authorised_at: string | null
  sourcing_ceiling: number
  sourced_used: number
  sourced_reserved: number
  approved_at: string | null
  went_live_at: string | null
  // ── ⚑ 10 Sep · RUN (20260910_programme_run_authority) ────────────────────────────────
  //
  // 🛑 THE SECOND OPERATOR ACT, AND THE ONLY ONE THAT PERMITS DELIVERY. `went_live_at` is
  // ARMED; `run_at` is STARTED. Optional for the same reason as the review columns below —
  // they are new, and every `select('*')` that predates the migration returns rows without
  // them. `undefined` and `null` both mean "never run", which refuses.
  run_at?: string | null
  run_by?: string | null
  went_live_by?: string | null
  paused_at: string | null
  pause_reason: PauseReason | null
  value_settled_at: string | null
  make_whole_cents: number
  // ── ⚑ 23 Sep · THE SHORTFALL CREDIT (20260923_programme_shortfall_credit) ─────────────
  //
  // 🛑 OPTIONAL FOR THE SAME REASON THE RUN COLUMNS ARE: they are new, and every `select('*')`
  // that predates the migration returns rows without them. `settleProgrammeShortfall` treats an
  // ABSENT `shortfall_credited_at` as "cannot settle yet" rather than as "not yet settled" —
  // without the column there is no claim, and without a claim a retry credits a wallet twice.
  shortfall_credited_at?: string | null
  shortfall_credit_cents?: number
  /** Meetings actually delivered when the programme stopped. Persisted, never re-derived. */
  delivered_meetings?: number | null
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
 * ⚑ 16 Sep (MVP1 · A3) — MAY THIS CLIENT HAVE A PROGRAMME AT ALL?
 *
 * Two facts, both already the rule on the client's own path:
 *
 *   ① `clients.proof_completed_at` — the client said their examples are RIGHT. A programme is
 *      priced against a Proof they accepted; without that acceptance there is nothing to
 *      price against and no decision to bill.
 *   ② an ICP exists — a programme with no targeting cannot source, and the P1 continuation
 *      refuses without exactly one attached ICP. Discovering that AFTER a client has paid is
 *      what stranding looks like, so it is refused before the row is written.
 *
 * ⚠️ IT FAILS CLOSED ON AN UNREADABLE ANSWER. A programme is the commercial object; creating
 * one because a read failed is exactly the direction that must never be taken.
 *
 * ⚠️ THE REASONS ARE OPERATOR-FACING. The client calculator wraps its own sentences around
 * the same two facts, because a client and an operator are not reading the same screen.
 */
async function programmeEntryAllowed(clientId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { data: client, error: clientErr } = await db.from('clients')
    .select('proof_completed_at').eq('id', clientId).maybeSingle()
  if (clientErr) {
    return { ok: false, reason: `This client's Proof state could not be read (${clientErr.message}), so nothing was created.` }
  }
  if (!client) {
    return { ok: false, reason: 'There is no such client, so no programme was created.' }
  }
  const completedAt = (client as unknown as { proof_completed_at?: string | null }).proof_completed_at
  if (!completedAt) {
    return {
      ok: false,
      reason: 'This client has not completed Proof yet, so a programme cannot be created. They confirm their examples are right in Milla first — the same rule their own calculator applies.',
    }
  }

  // ⚠️ THE CLIENT'S LIVE ICP, ELSE THEIR NEWEST — the same resolution the calculator uses, so
  // the targeting a programme is born against is the targeting they calibrated during Proof.
  const { data: icp, error: icpErr } = await db.from('icps')
    .select('id').eq('client_id', clientId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (icpErr) {
    return { ok: false, reason: `This client's targeting could not be read (${icpErr.message}), so nothing was created.` }
  }
  if (!(icp as { id?: string } | null)?.id) {
    return {
      ok: false,
      reason: 'This client has no ICP, so a programme created now could never source. Build their targeting first.',
    }
  }
  return { ok: true }
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

  // ── 🛑 ⚑ 16 Sep (MVP1 · A3) — THE JOURNEY IS CHECKED BEFORE THE ROW IS WRITTEN ────────
  //
  // 🛑 TWO DOORS INTO ONE TABLE, AND ONLY ONE WAS GATED. This function is the only INSERT
  // into `programmes`, and it had two callers: Milla's calculator, which refuses unless
  // `proof_completed_at` is set and an accepted ICP exists, and `POST /programmes` behind the
  // operator key, which checked NEITHER. So an operator could price and create a programme
  // for a client who had never seen a Proof set — and that programme then OWNS the journey,
  // because `deriveLifecycle` only awards Recommendation on `proofCompleted`. The result is a
  // commercial object with no client decision underneath it.
  //
  // ⚠️ THE GATE IS HERE, NOT IN THE ROUTE, and that is the founder's boundary: *"Do not
  // create a second commercial path."* One insert, one gate — a third door added later
  // cannot forget it, because there is nowhere else to write the row.
  //
  // ⚠️ IT IS THE SAME RULE, NOT A SECOND OPINION. `programmeEntryAllowed` reads the same two
  // facts the calculator reads. The calculator keeps its own client-facing sentences (a client
  // needs a sentence, an operator needs a reason) and simply passes this check on the way
  // through, because it has already proved both.
  const entry = await programmeEntryAllowed(clientId)
  if (!entry.ok) return { ok: false, reason: entry.reason }

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
    // ── ⛓️ 9 Sep — EVERY PROGRAMME IS BORN WITH A SENDING SCHEDULE ────────────────────────
    //
    // 🛑 `programmes.send_schedule` had exactly one writer and it was House's, so every other
    // programme carried NULL. NULL correctly means REFUSE — readiness blocks on
    // `no_send_schedule` — and nothing generic could ever clear it, which made
    // READY_FOR_APPROVAL unreachable for a paying client.
    //
    // ⚠️ A CREATION-TIME DEFAULT IS NOT A SEND-TIME ONE. This is a visible, operator-editable
    // setting that exists long before anything can send; the founder-locked rule against
    // inventing a schedule AT SEND TIME is untouched, and `isSendSchedule`'s NULL refusal still
    // stands for any row that predates this.
    send_schedule: DEFAULT_PROGRAMME_SEND_SCHEDULE,
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

// ── STAGE AUTHORITY — ONE DEFINITION, TWO SOURCES ────────────────────────────────────────
//
// A stage is authorised by a PAYMENT or by INTERNAL AUTHORITY, never by both, and every
// caller must ask the same question. These two functions are that question.
//
// 🛑 WHY THEY EXIST AS FUNCTIONS. Before them, `mayStartCampaign` restated
// `second_paid_at && second_payment_ref` inline while `goLiveProgramme` asked something
// else — so a programme could reach LIVE through one gate and be refused by the other about
// the identical fact. Restating a rule is how two gates come to disagree.

/**
 * P1: sourcing and preparation are authorised.
 *
 * ⚠️ `first_paid_at` ALONE IS THE PAID TEST, deliberately unlike P2. `recordFirstPayment`
 * writes ref, intent and timestamp in one compare-and-set update, so the timestamp cannot
 * exist without the ref — and `computeContribution` already reads exactly this column for
 * revenue, so agreeing with it keeps money and authority reading the same fact.
 */
export function p1Authorised(p: ProgrammeRow): boolean {
  return !!(p.first_paid_at || p.first_authorised_at)
}

/**
 * P2: outreach and Go Live are authorised.
 *
 * ⚠️ THE PAID TEST REQUIRES BOTH `second_paid_at` AND `second_payment_ref` — this preserves
 * `mayStartCampaign`'s original wording exactly. It is stricter than P1's on purpose: the
 * second payment is the gate on emailing real prospects, and it is the one place a partially
 * written row must not be read as authority.
 */
export function p2Authorised(p: ProgrammeRow): boolean {
  return !!((p.second_paid_at && p.second_payment_ref) || p.second_authorised_at)
}

/**
 * Is this half settled by INTERNAL authority rather than money?
 *
 * ⛓️ 9 Sep — ADDED HERE, IN THE MODULE THAT OWNS THE COLUMNS, because the alternative was
 * worse. The client checkout doors need to know that an internally-authorised programme owes
 * nothing — House must never be shown a price to pay — and reading `first_authorised_at`
 * directly in a route would both restate the rule in a second place AND breach the
 * internal-authority allowlist, which exists precisely so a fourth module cannot invent its own
 * answer to "who owes what".
 *
 * ⚠️ THIS IS NOT `p1Authorised`. That one asks *may this programme proceed* — paid OR internal.
 * This asks the narrower question *was it settled WITHOUT money*, which is the only one that
 * decides whether a client is asked to pay.
 */
export function firstInternallyAuthorised(p: ProgrammeRow): boolean {
  return !!p.first_authorised_at
}

export function secondInternallyAuthorised(p: ProgrammeRow): boolean {
  return !!p.second_authorised_at
}

/** Has a real first payment been recorded? The paid half of `p1Authorised`. */
export function firstPaid(p: ProgrammeRow): boolean {
  return !!p.first_payment_ref
}

/**
 * INTERNAL P1 — the House / Client Zero equivalent of the first payment.
 *
 * Does exactly what `recordFirstPayment` does to the programme's STATE, and nothing at all to
 * money: no `first_paid_at`, no ref, no intent, no Stripe call, no invoice, no wallet
 * movement, and `computeContribution` never reads the column it writes.
 *
 * ⚠️ AWAITING_FIRST_PAYMENT ONLY. The paid path reaches `recordFirstPayment` only after
 * `/checkout/first` has called `awaitFirstPayment`, so the internal path must not be allowed
 * to skip what the paid path cannot skip. A UI-only rule would not be a control: a route is
 * callable without the screen that hides its button.
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

  // ── 🛑 ⚑ 11 Sep (C38, DAY 3) — INTERNAL MONEY IS HOUSE'S ALONE ─────────────────────
  //
  // 🛑 WHAT THIS CLOSES. This door records P1 AUTHORITY WITHOUT A PAYMENT — no Stripe object,
  // no invoice, no revenue — and it asked only what STATE the programme was in. So an operator
  // with the admin key could authorise P1 on ANY programme, including a real paying client's:
  // a generic operator payment override, which the founder's Day-3 lock forbids by name.
  // "House is the only internal-money exception."
  //
  // ⚠️ HOUSE, AND HOUSE ALONE — NOT "EXCLUDED FROM REVENUE".
  //
  // ⛓️ THE FIRST CUT OF THIS ASKED `getExcludedClientIds`, which is demo ∪ house. Those are
  // two different questions: revenue exclusion answers "should this account count in the
  // numbers?", and a historic demo or test account answers YES to that while being nothing to
  // do with House. Reusing the broader set because it already existed would have handed
  // internal P1 money authority to every demo and test client in the book.
  //
  // ⚠️ IT IS THE REPO'S OWN HOUSE CLASSIFICATION, NOT A SECOND ONE. `computeExcludedClientIds`
  // already computes `houseClientIds` separately — clients whose `user_id` is the auth user
  // holding `HOUSE_ACCOUNT_EMAIL` — and that is the canonical answer the revenue logic itself
  // keeps apart from `demoClientIds`. Nothing new is defined here.
  //
  // ⚠️ AND IT FAILS CLOSED, IN BOTH DIRECTIONS OF DOUBT. A thrown lookup refuses; and an EMPTY
  // House set refuses with a different sentence, because `resolveHouseUserIds` deliberately
  // fails OPEN to an empty set for the revenue roll-ups — so "no House client" and "we could
  // not reach the auth directory" look identical from here. Either way no authority is minted;
  // only the wording distinguishes them, so an operator is sent to the right problem.
  //
  // ⚠️ IT IS NOT A SAFETY EXCEPTION. House still goes through the same Prepare, the same
  // sender verification, the same Freeze and the same approval. This is the MONEY exception
  // and nothing else.
  try {
    const { getClientExclusions } = await import('./real-clients')
    const { houseClientIds } = await getClientExclusions()
    if (!houseClientIds.has(p.client_id)) {
      return {
        ok: false,
        reason: houseClientIds.size === 0
          ? 'We could not confirm the House account, so no internal authority was recorded. Nothing was changed.'
          : 'Internal P1 authority is House-only. This is a client programme, and a client programme is authorised by their payment. Nothing was changed.',
      }
    }
  } catch (err) {
    return {
      ok: false,
      reason: `We could not establish whether this is a House programme (${err instanceof Error ? err.message : String(err)}), so no internal authority was recorded. Nothing was changed.`,
    }
  }

  // 🛑 XOR, INCLUDING THE INTENT ID — a stage holding ANY payment evidence is a paid stage.
  if (p.first_paid_at || p.first_payment_ref || p.first_payment_intent_id) {
    return { ok: false, reason: 'This programme already has P1 PAYMENT evidence. A stage cannot hold both a payment and internal authority.' }
  }
  // 🛑 NEVER OPEN A CEILING FROM A FIGURE THAT ISN'T ONE. The next statement derives
  // `sourcing_ceiling` from `meeting_target`, so a row carrying 0 — or anything non-positive —
  // would transition to SOURCING_AUTHORISED with no authority to source at all: a programme
  // that reads as authorised and can deliver nothing, which is worse than one that refuses.
  //
  // ⚠️ THIS SHOULD BE UNREACHABLE, AND IS GUARDED ANYWAY. `createProgramme` is the only writer
  // and derives the value through `assertMeetings` (whole number ≥ 1), and the column is
  // `int NOT NULL`, so neither NULL nor 0 can be produced by the product today. The guard costs
  // one comparison and covers hand-written rows, a future writer, and any relaxation of the
  // curve — none of which the paid path would catch either (it is noted as a shared, currently
  // theoretical exposure rather than silently fixed here, because changing `recordFirstPayment`
  // changes paying-client behaviour).
  //
  // ⛓️ 23 Sep — THE GUARD MOVED FROM `recommended_volume` TO `meeting_target`, because the
  // ceiling is no longer derived from the former. A valid recommended volume no longer implies
  // a valid ceiling, so guarding the old field would have left the new derivation unchecked.
  if (!Number.isInteger(p.meeting_target) || p.meeting_target <= 0) {
    return {
      ok: false,
      reason: `This programme has no valid meeting target (${p.meeting_target}), so there is no ceiling to authorise. Nothing was changed.`,
    }
  }

  // Compare-and-set on the column itself: two concurrent presses cannot both win.
  const { error } = await db.from('programmes').update({
    first_authorised_at: new Date().toISOString(),
    // ⚠️ THE CEILING IS THE LIMIT, NOT THE PLAN — exactly as the paid path does it. The
    // internal route must authorise the same volume a payment would, or House is not walking
    // the customer's lifecycle at all.
    sourcing_ceiling: sourcingCeiling(p.meeting_target),
    status: 'SOURCING_AUTHORISED',
    updated_at: new Date().toISOString(),
  }).eq('id', programmeId).is('first_authorised_at', null).select()
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

/**
 * INTERNAL P2 — the House equivalent of the second payment.
 *
 * ⚠️ STATUS AND `went_live_at` ARE ABSENT FROM THIS UPDATE ON PURPOSE. The paid path takes an
 * APPROVED programme live inside `recordSecondPayment` because the money arriving IS the last
 * event. Internally there is no such event, and collapsing "authorise P2" into "go live"
 * would take two separate founder decisions and make them one keystroke.
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

  // ── 🛑 ⚑ 11 Sep (DAY 3 HOLD) — HOUSE-ONLY, AND IT WAS NOT CHECKED AT ALL ──────────────
  //
  // 🛑 THE DEFECT. `authoriseFirstInternal` was corrected on 11 Sep to prove the canonical
  // House identity before minting P1 money authority. **P2 was never given the same check** —
  // this function proved APPROVED, an approval timestamp and the payment XOR, and would then
  // record internal P2 authority on ANY client's programme. An operator with the admin key
  // could settle a paying client's second half with no payment, no invoice and no revenue.
  // P1 was fixed, P2 was not, and the two are the same money exception.
  //
  // ⚠️ THE SAME PREDICATE AS P1, NOT A SECOND ONE. `houseClientIds` from
  // `computeExcludedClientIds` — clients whose `user_id` is the auth user holding
  // `HOUSE_ACCOUNT_EMAIL`. NOT `getExcludedClientIds` (demo ∪ house): that answers "whose
  // numbers stay out of the revenue roll-ups", and every demo and test account answers YES to
  // it while being nothing to do with House.
  //
  // ⚠️ FAILS CLOSED IN BOTH DIRECTIONS OF DOUBT. A thrown lookup refuses; an EMPTY House set
  // refuses with its own sentence, because `resolveHouseUserIds` deliberately fails open to an
  // empty set for the roll-ups — so "no House client" and "the auth directory is unreachable"
  // are indistinguishable from here. Neither mints authority.
  try {
    const { getClientExclusions } = await import('./real-clients')
    const { houseClientIds } = await getClientExclusions()
    if (!houseClientIds.has(p.client_id)) {
      return {
        ok: false,
        reason: houseClientIds.size === 0
          ? 'We could not confirm the House account, so no internal P2 authority was recorded. Nothing was changed.'
          : 'Internal P2 authority is House-only. This is a client programme, and a client programme settles its second half by payment. Nothing was changed.',
      }
    }
  } catch (err) {
    return {
      ok: false,
      reason: `We could not establish whether this is a House programme (${err instanceof Error ? err.message : String(err)}), so no internal P2 authority was recorded. Nothing was changed.`,
    }
  }

  // ── 🛑 AND THE APPROVAL MUST STILL COVER THE WORK ────────────────────────────────────
  //
  // 🛑 `status === 'APPROVED'` IS NOT "APPROVED FOR THIS". The paid door was corrected on
  // 11 Sep to refuse P2 when the prepared work has moved since the approval; the INTERNAL door
  // asked only for the status, so House could settle its second half against an approval that
  // no longer describes the programme — which the run gate would then correctly refuse to make
  // live. The money exception is about WHO PAYS, never about WHAT WAS AGREED.
  //
  // ⚠️ "WE CANNOT TELL" REFUSES TOO. Not knowing whether the approval still covers the work is
  // not permission to authorise against it.
  const { preparationDrift } = await import('./preparation-snapshot')
  const drift = await preparationDrift(programmeId)
  if (drift.state !== 'unchanged') {
    return {
      ok: false,
      reason: drift.state === 'changed'
        ? 'This programme has changed since it was approved, so its second half is not due on it. Re-freeze it, have it approved again, and then record P2. Nothing was changed.'
        : `The approval on this programme could not be confirmed to still cover the current work, so no internal P2 authority was recorded. ${drift.state === 'unreadable' ? drift.detail : 'There is no approval to authorise against.'} Nothing was changed.`,
    }
  }

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
 * "idempotent" are different claims, and both are true of different branches: a programme that
 * is legitimately live returns success without touching the row — so no timestamp is rewritten
 * and no second transition is recorded — and only a genuine transition writes, guarded by
 * `.is('went_live_at', null)` so two concurrent presses cannot both stamp a time.
 */
export async function goLiveProgramme(programmeId: string, pressedBy?: string | null): Promise<ProgrammeResult & { alreadyLive?: boolean; preparation?: import('./programme-preparation').PrepareResult }> {
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

  // ── ⚑ PREPARE FIRST. LIVE IS DURABLE EVIDENCE THAT PREPARATION SUCCEEDED ─────────────
  //
  // ⛓️ CORRECTED. An earlier version wrote LIVE and prepared afterwards, returning an error
  // when preparation failed. That is not enough: the RESPONSE is read once, by one caller,
  // while the ROW is read by every later reader — Vida, Milla, `mayStartCampaign`, the send
  // authority. A failed preparation left a durable LIVE that all of them believed.
  //
  // Preparation therefore runs while the row still says APPROVED. `ensureCampaignForIcp`
  // normally demands status LIVE, so it is given `goingLive`, which re-proves every
  // substantive condition LIVE would have proven — approval, P2, not paused, not terminal —
  // and refuses on its own if any is missing. The label is written last, not relied upon.
  const { prepareProgrammeOutreach } = await import('./programme-preparation')
  const prep = await prepareProgrammeOutreach(programmeId)
  if (!prep.complete) {
    // 🛑 NOT LIVE. The programme stays APPROVED with its P2 authority intact, so it has
    // gained NO send authority: `mayStartCampaign` refuses anything that is not LIVE, and
    // any campaign or enrolment already created sits inert behind that gate. Pressing Make
    // live again re-runs preparation and completes what is outstanding.
    return {
      ok: false,
      preparation: prep,
      reason:
        'The programme was NOT taken live because outreach preparation did not complete: ' +
        prep.problems.join(' ') +
        (prep.remaining > 0 ? ` ${prep.remaining} eligible prospect(s) still need preparing.` : '') +
        ' It remains APPROVED and can send nothing. Press Make live again — preparation is idempotent and continues where it stopped.',
    }
  }

  // ⚠️ 10 Sep — THIS WRITE ARMS AND GRANTS NOTHING. `run_at` is untouched here, deliberately
  // and permanently: LIVE is the armed state, and `authorityFor(..., 'OUTREACH')` refuses
  // `programme_not_run` until the separate Run action stamps it. Setting `run_at` from this
  // function would collapse the founder's two acts back into one.
  const { data, error } = await db.from('programmes').update({
    status: 'LIVE',
    went_live_at: new Date().toISOString(),
    went_live_by: pressedBy ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', programmeId).is('went_live_at', null).select()
  if (error) return { ok: false, preparation: prep, reason: error.message }
  if (!data || data.length === 0) return { ok: true, alreadyLive: true, preparation: prep }
  return { ok: true, preparation: prep }
}

/**
 * 🛑 RUN — THE SECOND OPERATOR ACT, AND THE ONLY ONE THAT PERMITS EXTERNAL DELIVERY.
 *
 * ── WHAT THIS FIXES (audit, 10 Sep) ────────────────────────────────────────────────────
 *
 * Run existed as a button (`POST /operator/send-due/run-once`) that sent a bounded batch. It
 * did not exist as AUTHORITY: nothing on the programme recorded that it had happened, and
 * `authorityFor(..., 'OUTREACH')` never asked. Make Live activates the campaign and stamps
 * every enrolment `next_send_at = now` — exactly what `send-due` selects — so the moment the
 * kill-switch was turned off for one canary, the two-hourly cron and the client-callable
 * `/figsy/send-due` would have delivered for every LIVE programme with nobody pressing Run.
 *
 * ⚠️ IT GRANTS, IT DOES NOT SEND. This function writes one timestamp. No provider is called,
 * no enrolment is touched, no campaign is activated (Make Live did that). Sending still has
 * to pass the kill-switch, the schedule, the caps, the sender, DNC/opt-out and every other
 * gate — Run only stops those gates being reached by a programme nobody started.
 *
 * ⚠️ IDEMPOTENT, AND THE FIRST PRESS IS THE ONE RECORDED. `.is('run_at', null)` means a
 * second press writes nothing and returns success, so the audit shows who actually started
 * the programme rather than whoever pressed it last.
 *
 * ⚠️ IT RE-PROVES THE ARMED STATE FROM THE ROW rather than trusting that Make Live ran: LIVE,
 * `went_live_at`, `approved_at`, P2 and not-paused. A Run on a programme that reached LIVE by
 * some other route would otherwise be a way in.
 */
export async function runProgramme(
  programmeId: string,
  pressedBy?: string | null,
): Promise<ProgrammeResult & { alreadyRunning?: boolean; runAt?: string }> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (p.run_at) return { ok: true, alreadyRunning: true, runAt: p.run_at }
  if (TERMINAL_STATUSES.includes(p.status)) return { ok: false, reason: `This programme is ${p.status}.` }
  if (p.paused_at) {
    return { ok: false, reason: `Cannot Run a paused programme${p.pause_reason ? ` (${p.pause_reason})` : ''}. Resume it first.` }
  }
  if (p.status !== 'LIVE' || !p.went_live_at) {
    return { ok: false, reason: `This programme is ${p.status} and has not been made live. Make Live arms the programme; Run starts it.` }
  }
  if (!p.approved_at) return { ok: false, reason: 'This programme has no client approval recorded, so it cannot be Run.' }
  if (!p2Authorised(p)) return { ok: false, reason: 'P2 authority is missing, so this programme cannot be Run.' }

  const runAt = new Date().toISOString()
  const { data, error } = await db.from('programmes')
    .update({ run_at: runAt, run_by: pressedBy ?? null, updated_at: runAt })
    .eq('id', programmeId).is('run_at', null).select('run_at')
  if (error) return { ok: false, reason: error.message }
  // A concurrent press won the compare-and-set. That is success, not a failure — and the
  // stamp on the row is theirs.
  if (!data || data.length === 0) {
    const again = await getProgramme(programmeId)
    return { ok: true, alreadyRunning: true, runAt: again?.run_at ?? undefined }
  }
  return { ok: true, runAt }
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
  // 🛑 XOR. A stage holds ONE authority. The DB CHECK would reject this write anyway —
  // refusing here turns a constraint violation into a sentence a human can read, and keeps
  // the webhook's own error path in charge rather than a 500 from Postgres.
  if (p.first_authorised_at) {
    return { ok: false, reason: 'This programme already has INTERNAL P1 authority. A stage cannot hold both internal authority and a payment.' }
  }

  // The `.is('first_payment_ref', null)` guard makes this a compare-and-set: two concurrent
  // webhook deliveries cannot both win, and the loser updates zero rows.
  const { data, error } = await db.from('programmes').update({
    first_payment_ref: params.sessionId,
    first_payment_intent_id: params.paymentIntentId ?? null,
    first_paid_at: new Date().toISOString(),
    // ⚠️ THE CEILING IS DERIVED FROM THE MEETING TARGET, NOT FROM THE PAYMENT AMOUNT. The
    // first 50% authorises sourcing up to the FULL limit (founder lock 4) — half the money,
    // all of the authority. Execution is then rationed by batch size, not by ceiling.
    //
    // ⛓️ 23 Sep — WAS `p.recommended_volume` (meetings × 250). That made the LIMIT and the
    // EXPECTATION the same number, so a programme stopped sourcing at exactly the volume the
    // plan said it needed to land its meetings — no room to keep trying on the ones that were
    // running long. Founder-locked: *"the limit is 400 not 250. if we hit the 400 we stop."*
    // `recommended_volume` is untouched and still sizes and prices the programme.
    sourcing_ceiling: sourcingCeiling(p.meeting_target),
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
}): Promise<{
  ok: boolean; alreadyRecorded?: boolean; recordedNotLive?: boolean; reason?: string
  /** ⚑ What preparation achieved. `preparationIncomplete` means PAID + LIVE but not operable. */
  preparation?: import('./programme-preparation').PrepareResult
  preparationIncomplete?: boolean
}> {
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

  // ── ⚑ THE MONEY IS RECORDED ON ITS OWN, AND THE STATUS IS NOT PART OF IT ─────────────
  //
  // ⛓️ CORRECTED. This update used to write `status: 'LIVE'` and `went_live_at` in the same
  // statement as the payment. That made LIVE a consequence of the money arriving rather than
  // of the programme being operable — so a paid programme whose preparation then failed was
  // durably LIVE, and every later reader believed it.
  //
  // 🛑 PAYMENT TRUTH AND OPERATIONAL TRUTH ARE NOW SEPARATE WRITES. Money that arrived is a
  // fact and is committed here unconditionally; nothing below can reverse it, and there is no
  // refund, no rollback and no new payment state. Going live is decided afterwards, by
  // whether preparation actually completed.
  const { data, error } = await db.from('programmes')
    .update(base)
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

  // ── 🛑 10 Sep (G) — P2 IS MONEY. IT DOES NOT ARM, PREPARE OR GO LIVE ─────────────────
  //
  // ⛓️ WHAT THIS REPLACES, AND IT WAS THE FOUNDER'S OWN SENTENCE BEING BROKEN. This function
  // used to run `prepareProgrammeOutreach` and then write `status: 'LIVE', went_live_at` —
  // with the comment "the successful paid path still auto-goes-live, exactly as it always
  // has." R108 records the founder's words verbatim: *"Approval does not send. **P2 does not
  // Make Live.** Make Live does not broadly enable uncontrolled sending."* So for every
  // PAYING client the operator's Make Live was skipped entirely: the money arriving armed the
  // programme, activated its campaign and stamped every enrolment due. House, which reaches
  // arming through Make Live, was the only path that behaved as ruled.
  //
  // 🛑 THE MONEY IS UNAFFECTED AND IS NEVER UNDONE. `second_payment_ref`, `second_paid_at`
  // and the intent id were committed by the update above, unconditionally. Nothing here
  // reverses, refunds or re-records them. What changed is only what the payment CAUSES.
  //
  // ⚠️ AND NOTHING IS PREPARED HERE EITHER. Post-approval preparation activates the campaign
  // and enrols without `prepareOnly` — it is the arming half of Make Live, and it belongs to
  // the operator act, not to a webhook. `goLiveProgramme` runs exactly the same mechanism, so
  // there is one implementation of "operable" and it is reached by pressing Make Live.
  //
  // The programme therefore sits APPROVED and paid in full, which `deriveLifecycle` reads as
  // `live_ready_to_make_live` with a `make_live_required` task — a real control that exists.
  void sendFounderAlert('new_signup',
    'Programme paid in full — ready for Make Live', [
      `Programme ${params.programmeId} (client ${p.client_id}) has received its second payment (session ${params.sessionId}).`,
      'It is APPROVED and PAID IN FULL, and it is NOT live: P2 records money and arms nothing.',
      'Nothing was refunded, reversed or invented — the payment is recorded exactly once and no later step can undo it.',
      'Press Make live in Vida to arm it. Make Live sends zero — Run is the separate action that starts sending.',
    ])
  return { ok: true, recordedNotLive: true }
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
/**
 * The columns an approval must ALSO write: what, exactly, was approved.
 *
 * 🛑 APPROVAL USED TO RECORD ONLY *WHEN*. So a sequence rewritten, a cadence retimed, a sender
 * swapped or an enrolment set replaced after approval carried the old consent forward in
 * silence, and every gate downstream read that consent as permission to send THIS.
 *
 * ⚠️ IT IS COMPUTED BEFORE THE WRITE AND WRITTEN *WITH* IT — one conditional UPDATE, the safest
 * transaction boundary this code already has. A snapshot stamped separately could land against
 * a programme whose approval never happened, or an approval could land with no record of what
 * it covered; both are the inconsistency the hash exists to detect, manufactured by the fix.
 *
 * 🛑 AND A PROGRAMME THAT CANNOT BE DESCRIBED CANNOT BE APPROVED. If the snapshot cannot be
 * built, this returns `null` and the caller REFUSES — approving work we cannot characterise
 * would produce exactly the "approved, but nobody can say to what" state that reads as
 * unreadable forever afterwards.
 */
async function approvedPreparationColumns(programmeId: string, at: string): Promise<Record<string, unknown> | null> {
  // ── ⚑ 8 Sep — APPROVAL COPIES THE REVIEWED SNAPSHOT; IT DOES NOT TAKE A FRESH ONE ───────
  //
  // 🛑 THE DEFECT IN TAKING A FRESH ONE. This originally built the snapshot at approval time,
  // which records whatever the work had BECOME. If the sequence, the sender or the audience
  // changed while the client was reading, the approval would faithfully have recorded consent
  // to the new thing. So the current state is recomputed only to be COMPARED, and what is
  // STORED is the material the client actually read.
  //
  // ⚠️ A MISMATCH REFUSES, AND SO DOES A MISSING REVIEW FREEZE. "We cannot prove what they were
  // shown" is not permission to approve on their behalf.
  const { reviewDrift } = await import('./preparation-snapshot')
  const drift = await reviewDrift(programmeId)
  if (drift.state !== 'unchanged') return null

  const { data: prog, error } = await db.from('programmes')
    .select('review_preparation_hash, review_preparation_snapshot, review_preparation_version')
    .eq('id', programmeId).maybeSingle()
  if (error || !prog) return null
  const rp = prog as {
    review_preparation_hash: string | null
    review_preparation_snapshot: unknown
    review_preparation_version?: number | null
  }
  if (!rp.review_preparation_hash) return null

  return {
    approved_preparation_hash: rp.review_preparation_hash,
    approved_preparation_snapshot: rp.review_preparation_snapshot,
    approved_preparation_at: at,
    // ⚑ 11 Sep (DAY 3) — WHICH VERSION WAS APPROVED, copied from the review freeze rather than
    // recomputed. It stays put when a later re-freeze moves `review_preparation_version`, and
    // the two disagreeing is how an approval is known not to cover the current package.
    //
    // ⚠️ `?? null` IS NOT A DEFAULT HERE. A programme frozen before versioning existed carries
    // no version, and recording it as 1 would invent a claim about which package was read.
    approved_preparation_version: rp.review_preparation_version ?? null,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 11 Sep (DAY 3) — RE-FREEZING: THE MISSING HALF OF "A CHANGE MEANS A NEW VERSION"
//
// ── 🛑 THE DEAD END THIS CLOSES ─────────────────────────────────────────────────────────
//
// The rule was fully enforced and had no remedy. `reviewDrift` refuses an approval whose
// package has moved — correctly — and the ONLY writer of a review freeze was
// `markReadyForApproval`, which runs from `SOURCING` / `SOURCING_AUTHORISED` and from nowhere
// else. Nothing moves a programme back out of `READY_FOR_APPROVAL`. So the moment anything
// approval-relevant changed under a reviewing client — a prospect opted out, the sending
// mailbox was re-assigned, the window was edited — the programme became **permanently
// unapprovable**: every press answered "it must be re-frozen and reviewed again" and nothing in
// the product could re-freeze it. A rule with no path forward is an outage with good manners.
//
// ── WHAT IT IS, AND WHAT IT REFUSES TO BE ───────────────────────────────────────────────
//
//   • it re-proves EVERY preparation requirement first, so a re-freeze cannot rescue a
//     programme whose sender is unverified or whose review desk has emptied
//   • it writes a NEW version — hash, snapshot, timestamp and a counter that only ever rises
//   • an UNCHANGED package writes nothing at all, so re-opening a screen cannot churn the
//     version a client is quoting back to us
//   • it NEVER touches `approved_*`. The old approval does not carry forward; it is left
//     exactly where it was, pointing at the version it actually covered.
//
// 🛑 AND IT GRANTS NOTHING. No approval, no P2, no LIVE, no send. It refreshes the question,
// it does not answer it.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type RefreezeResult =
  | { ok: true; changed: boolean; hash: string; version: number | null }
  | { ok: false; code: 'not_found' | 'wrong_state' | 'not_ready' | 'unreadable'; reason: string }

export async function refreezeForReview(programmeId: string): Promise<RefreezeResult> {
  let p: ProgrammeRow | null
  try { p = await getProgramme(programmeId) }
  catch (err) { return { ok: false, code: 'unreadable', reason: err instanceof Error ? err.message : String(err) } }
  if (!p) return { ok: false, code: 'not_found', reason: 'No such programme.' }

  // 🛑 ONLY FROM `READY_FOR_APPROVAL`, AND THAT IS THE WHOLE SCOPE. Earlier states reach their
  // first freeze through `markReadyForApproval`; APPROVED and LIVE must NOT be re-frozen at all
  // — re-freezing an approved programme is precisely the in-place mutation of approved work the
  // founder's rule forbids, and `preparationDrift` already refuses the run for it.
  if (p.status !== 'READY_FOR_APPROVAL') {
    return { ok: false, code: 'wrong_state', reason: `This programme is ${p.status}, so there is no review package to re-freeze.` }
  }
  if (p.paused_at) return { ok: false, code: 'wrong_state', reason: 'This programme is paused, so its review package was not re-frozen.' }

  const { programmePreparationReadiness } = await import('./preparation-readiness')
  const readiness = await programmePreparationReadiness(programmeId)
  if (!readiness.ready) {
    return {
      ok: false, code: 'not_ready',
      reason: 'This programme cannot be re-frozen for review yet — ' + readiness.blockers.map(b => b.detail).join(' '),
    }
  }

  const { buildPreparationSnapshot } = await import('./preparation-snapshot')
  const built = await buildPreparationSnapshot(programmeId)
  if (!built.ok) {
    return { ok: false, code: 'unreadable', reason: `The prepared work could not be described, so nothing was re-frozen. ${built.degraded}` }
  }

  const current = p as unknown as { review_preparation_hash?: string | null; review_preparation_version?: number | null }
  if (current.review_preparation_hash === built.hash) {
    // ⚠️ NOTHING WRITTEN. Bumping the version for an identical package would invalidate the
    // exact version string a client is holding on an open screen, for no change at all.
    return { ok: true, changed: false, hash: built.hash, version: current.review_preparation_version ?? null }
  }

  const at = new Date().toISOString()
  const nextVersion = (typeof current.review_preparation_version === 'number' ? current.review_preparation_version : 0) + 1

  // 🛑 COMPARE-AND-SET ON THE OLD HASH AND THE STATUS. Two operators pressing at once, or a
  // client approving while this runs, must not produce a version that skipped a package: the
  // loser matches no row and is told, rather than overwriting a freeze somebody has approved
  // against in the meantime.
  let claim = db.from('programmes')
    .update({
      review_preparation_hash: built.hash,
      review_preparation_snapshot: built.snapshot as unknown,
      review_preparation_at: at,
      review_preparation_version: nextVersion,
      updated_at: at,
    })
    .eq('id', programmeId)
    .eq('status', 'READY_FOR_APPROVAL')
  claim = current.review_preparation_hash
    ? claim.eq('review_preparation_hash', current.review_preparation_hash)
    : claim.is('review_preparation_hash', null)

  const { data: won, error: writeErr } = await claim.select('id')
  if (writeErr) {
    return { ok: false, code: 'unreadable', reason: `The new review package could not be written (${writeErr.message}). Nothing was changed.` }
  }
  if (((won ?? []) as unknown[]).length === 0) {
    return {
      ok: false, code: 'wrong_state',
      reason: 'This programme changed while it was being re-frozen, so nothing was written. Take another look and try again.',
    }
  }
  return { ok: true, changed: true, hash: built.hash, version: nextVersion }
}

/**
 * 🛑 THE OPERATOR APPROVAL IS WITHDRAWN. IT REFUSES, ALWAYS (founder-locked 11 Sep).
 *
 * ── ⛓️ WHAT THIS USED TO DO, AND WHY THAT WAS THE BYPASS ────────────────────────────────
 *
 * It took a programme id and nothing else, proved READY_FOR_APPROVAL and not-paused, and wrote
 * `status = 'APPROVED'`. **No client, no ownership, no House check, no restriction of any
 * kind.** So anybody holding the admin key could approve ANY client's programme — and the row
 * afterwards was indistinguishable, to every downstream reader, from the client having agreed.
 *
 * The founder's rule: **client approval is CLIENT-OWNED. An operator must not be able to
 * substitute for it.** House is not an exception — *"House still follows the same client
 * approval truth. House gets a MONEY COLLECTION exception only."* P1 and P2 internal authority
 * are that money exception, and neither of them replaces this step.
 *
 * ── ⚠️ WHY IT IS INVERTED RATHER THAN DELETED ───────────────────────────────────────────
 *
 * The repo's own discipline: a withdrawn rule becomes a guard that refuses, not a hole where a
 * guard used to be. Deleting the export would leave `POST /programmes/:id/approve` to be
 * re-implemented by the next person who wanted it, against a comment nobody reads. This way the
 * refusal IS the code, the reason names the rule, and the sentence points at the only authority
 * that can approve — the client, in Milla, through `approveProgrammeAsCustomer`.
 *
 * 🛑 THIS IS NOT A "NO OPERATOR PATH FOR A STUCK CLIENT" GAP. A client who cannot approve
 * because the package moved is a real state, it is surfaced in Vida as `approval_package_stale`,
 * and its remedy is `refreezeForReview` — which publishes a new version and asks THEM again.
 * The remedy for "the client has not approved" is never "approve for them".
 */
export async function approveProgramme(programmeId: string): Promise<ProgrammeResult> {
  // ⚠️ IT READS NOTHING AND WRITES NOTHING. There is no state in which this succeeds, so
  // looking one up would only invite a future edit to branch on it.
  void programmeId
  return {
    ok: false,
    reason: 'A programme can only be approved by the client, in Milla, from their own session. '
      + 'Approving on their behalf is not available to an operator — approval is consent to email real strangers, '
      + 'and it is theirs to give. House is not an exception: internal P1 and P2 authority cover money collection only. '
      + 'If the client cannot approve because the prepared work has changed, re-freeze it and they are asked again. '
      + 'Nothing was changed.',
  }
}

/**
 * ── THE CUSTOMER'S OWN APPROVAL — THE ONE COMMERCIAL ACTION THEY TAKE ───────────────────
 *
 * R39 (founder-locked 15 Aug): *"We run it in Vida; the client approves in Milla."* This is
 * that sentence as a function, and it is deliberately NOT `approveProgramme` with a client
 * argument bolted on.
 *
 * ⚠️ WHY A SEPARATE FUNCTION AT ALL. `approveProgramme` takes a programme id and nothing else,
 * which is correct behind `routes/programme.ts`'s router-level `adminKeyValid` — an operator
 * who already proved admin authority is not also proving tenancy. A customer proves the
 * opposite: they have no admin authority and their ONLY claim is ownership. Adding an optional
 * client parameter to the operator function would make tenancy something a caller can forget
 * to pass; here it is the first argument and there is no shape of this call without it.
 *
 * 🛑 IT WRITES EXACTLY TWO COLUMNS: `status` and `approved_at`. Not P2, not `went_live_at`, not
 * a payment, not a wallet, not an invoice. Programme approval ≠ P2 ≠ Live ≠ send authority, and
 * this function is where that sentence has to be true rather than documented.
 *
 * ⚠️ IDEMPOTENT BY COMPARE-AND-SET, NOT BY RE-READING. The status guard below is a READ, and a
 * read cannot make two concurrent double-clicks safe: both would see READY_FOR_APPROVAL and
 * both would write, and the second write would REPLACE `approved_at` with a later timestamp —
 * a moved audit date on the one act the customer performed. So the write itself carries
 * `.eq('status', 'READY_FOR_APPROVAL')`: the database decides the winner, and the loser gets
 * `already_approved` from the re-read rather than a second write. The pre-read stays because
 * it is what produces a HONEST REFUSAL REASON for every other state.
 */
export type CustomerApproval =
  | { ok: true; programme: ProgrammeRow; alreadyApproved: boolean }
  | { ok: false; code: CustomerApprovalRefusal; reason: string }

export type CustomerApprovalRefusal =
  | 'not_found'          // no such programme, or not this client's — deliberately the same code
  | 'paused'
  | 'terminal'
  | 'wrong_state'
  | 'nothing_to_review'
  /**
   * ⚑ 11 Sep (DAY 3) — the client approved a version that is no longer the frozen one, or did
   * not say which version they were approving. Never a fault: the package changed, so it needs
   * a fresh look and a fresh approval. Nothing is written and nothing is charged.
   */
  | 'stale_version'
  | 'unreadable'

export async function approveProgrammeAsCustomer(
  clientId: string, programmeId: string,
  /**
   * ⚑ 11 Sep (DAY 3) — THE EXACT VERSION THE CLIENT WAS LOOKING AT.
   *
   * 🛑 WHY IT IS REQUIRED. Approval used to record `approved_preparation_hash` from whatever
   * was frozen AT THE MOMENT OF THE PRESS. The client never said WHICH package they were
   * approving, so a re-preparation between the screen rendering and the button being pressed
   * was approved in silence — the client would have approved a set of people, a set of words
   * and a sending window they had never read.
   *
   * ⚠️ `null` IS ACCEPTED ONLY WHERE NO VERSION EXISTS TO QUOTE. A programme that is
   * READY_FOR_APPROVAL always carries a frozen hash, so in practice null from a client is a
   * refusal; the parameter is nullable so internal callers on a pre-freeze database behave
   * exactly as they did.
   */
  expectedVersion: string | null = null,
  /**
   * ⚑ 11 Sep (DAY 3) — WHO IS APPROVING, taken from the session and never from the body.
   *
   * 🛑 AN APPROVAL RECORDED NO AUTHOR. `approved_at` said when and the snapshot said what, so
   * *"the client approved this"* was a sentence the database could not support — on the single
   * act that turns prepared work into work we are allowed to run.
   *
   * ⚠️ IT AUTHORISES NOTHING. Tenancy is still proved by `clientId` against the row; this is
   * recorded alongside the approval, and no branch below reads it to decide anything.
   */
  approvedByUserId: string | null = null,
): Promise<CustomerApproval> {
  let p: ProgrammeRow | null
  try {
    p = await getProgramme(programmeId)
  } catch (err) {
    // A storage error is "we cannot tell", never "no". Approving on an unreadable programme,
    // or refusing as though it did not exist, are both wrong for different reasons.
    return { ok: false, code: 'unreadable', reason: err instanceof Error ? err.message : String(err) }
  }

  // 🛑 TENANCY, AND IT ANSWERS IDENTICALLY TO "NO SUCH PROGRAMME". A customer who guesses
  // another tenant's programme id must not be able to tell a real id they do not own from an
  // id that does not exist — the difference is an enumeration oracle, and there is nothing a
  // legitimate customer can do with the distinction.
  if (!p || p.client_id !== clientId) {
    return { ok: false, code: 'not_found', reason: 'No such programme.' }
  }

  // ⚠️ ALREADY APPROVED IS A SUCCESS, NOT A REFUSAL — but only for THIS client's own programme,
  // which the check above has already established. A repeated request after a successful
  // approval is a double-click, a retry or a refresh, and the honest answer is "yes, it is
  // approved" with the ORIGINAL `approved_at` untouched.
  if (p.status === 'APPROVED') return { ok: true, programme: p, alreadyApproved: true }

  if (TERMINAL_STATUSES.includes(p.status)) {
    return { ok: false, code: 'terminal', reason: `This programme is ${p.status}.` }
  }
  if (p.paused_at) return { ok: false, code: 'paused', reason: 'This programme is paused.' }
  if (p.status !== 'READY_FOR_APPROVAL') {
    return { ok: false, code: 'wrong_state', reason: `This programme is not ready to approve yet (${p.status}).` }
  }

  // ── 🛑 ⚑ 11 Sep (DAY 3) — THEY APPROVE THE EXACT VERSION THEY READ ──────────────────
  //
  // 🛑 WHAT THIS CLOSES. The approval recorded `approved_preparation_hash` from whatever was
  // frozen at the moment of the press. If the work was re-prepared between the screen
  // rendering and the button being pressed — a prospect evicted, a message re-drafted, the
  // window changed, the sender re-assigned — the client approved a package they had never
  // read, and nothing anywhere would have said so.
  //
  // ⚠️ THE FOUNDER'S RULE IS A NEW VERSION AND A NEW APPROVAL, never a mutated one. So a
  // mismatch REFUSES and names the change; Milla re-renders the current package and asks
  // again. Nothing is written, and the programme stays READY_FOR_APPROVAL.
  //
  // ⚠️ IT IS ASKED BEFORE THE WRITE AND AGAIN BY THE WRITE. The compare-and-set below pins
  // `status`; this pins WHAT WAS FROZEN. A check without the write's own condition could be
  // overtaken by a re-freeze landing in between.
  const frozenNow = (p as unknown as { review_preparation_hash?: string | null }).review_preparation_hash ?? null
  if (frozenNow && expectedVersion !== null && expectedVersion !== frozenNow) {
    return {
      ok: false, code: 'stale_version',
      reason: 'This programme has been updated since you opened it, so that version cannot be approved. Nothing has been charged — take another look and approve the current one.',
    }
  }
  if (frozenNow && expectedVersion === null) {
    return {
      ok: false, code: 'stale_version',
      reason: 'We could not tell which version you were approving, so nothing was approved and nothing has been charged. Please reload and try again.',
    }
  }

  // 🛑 THERE MUST BE SOMETHING THEY COULD ACTUALLY HAVE REVIEWED.
  //
  // `markReadyForApproval` proved this on the way IN, but the two moments are days apart and
  // the set can empty between them — every prospect passed, or opted out, or evicted. A
  // programme sitting in READY_FOR_APPROVAL with an empty desk is an inconsistency, and the
  // founder's rule is that it must FAIL VISIBLY rather than present a successful approval of
  // nothing. Same predicate as the review read, so the desk and the gate cannot disagree.
  let reviewable: number
  try {
    const { countProgrammeReviewable } = await import('./programme-review')
    reviewable = await countProgrammeReviewable(clientId, programmeId)
  } catch (err) {
    return { ok: false, code: 'unreadable', reason: err instanceof Error ? err.message : String(err) }
  }
  if (reviewable <= 0) {
    return {
      ok: false, code: 'nothing_to_review',
      reason: 'This programme has no prospects to review, so it cannot be approved yet.',
    }
  }

  // ── THE WRITE. ONE CONDITIONAL UPDATE, NOW CARRYING WHAT WAS APPROVED ─────────────────
  //
  // ⛓️ 7 Sep — the approved preparation snapshot is written HERE, in the same claim, so a
  // programme can never hold an approved snapshot it was not approved with. It is computed
  // first because it reads several tables; the race guard below still decides who wins.
  const at = new Date().toISOString()
  const prepared = await approvedPreparationColumns(programmeId, at)
  if (!prepared) {
    return {
      ok: false, code: 'unreadable',
      reason: 'This programme cannot be approved: the prepared work is not the work you reviewed, or no review freeze exists. It must be re-frozen and reviewed again. Nothing was changed.',
    }
  }
  let claim = db.from('programmes')
    .update({
      status: 'APPROVED', approved_at: at, updated_at: at,
      // ⚠️ WRITTEN IN THE SAME CONDITIONAL UPDATE AS THE APPROVAL, so a programme can never
      // hold an author it was not approved by — the same discipline the snapshot follows.
      approved_by_kind: 'client',
      approved_by_user_id: approvedByUserId,
      ...prepared,
    })
    .eq('id', programmeId)
    .eq('client_id', clientId)
    // 🛑 THE RACE GUARD. Only a row still in READY_FOR_APPROVAL is claimed, so of two
    // simultaneous approvals exactly one writes and `approved_at` is set once, ever.
    .eq('status', 'READY_FOR_APPROVAL')
  // ── 🛑 ⚑ 11 Sep (DAY 3) — AND THE VERSION IS PINNED BY THE WRITE, NOT ONLY THE READ ──
    //
  // ⚠️ THE CHECK ABOVE CAN BE OVERTAKEN. A re-freeze landing between the read and this
  // statement would move `review_preparation_hash` — and `prepared` was computed from the OLD
  // read, so the row would be stamped APPROVED against a package the client read and a hash
  // that had already moved on. Postgres re-evaluates this after taking the row lock, so a
  // version that changed underneath simply matches no row and the customer is told.
  if (frozenNow) claim = claim.eq('review_preparation_hash', frozenNow)
  const { data: won, error: writeErr } = await claim.select('*')
  if (writeErr) return { ok: false, code: 'unreadable', reason: writeErr.message }

  const row = (won ?? [])[0] as ProgrammeRow | undefined
  if (row) return { ok: true, programme: row, alreadyApproved: false }

  // Lost the claim. Somebody else approved it between the read and the write — which is the
  // same outcome the customer wanted, so report the state rather than an error.
  const after = await getProgramme(programmeId).catch(() => null)
  if (after && after.client_id === clientId && after.status === 'APPROVED') {
    return { ok: true, programme: after, alreadyApproved: true }
  }
  return { ok: false, code: 'wrong_state', reason: 'This programme changed while you were approving it. Reload and try again.' }
}

export async function markReadyForApproval(programmeId: string): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }
  if (p.status !== 'SOURCING' && p.status !== 'SOURCING_AUTHORISED') {
    return { ok: false, reason: `Cannot ready-for-approval from ${p.status}.` }
  }

  // 🛑 THERE MUST BE SOMETHING TO REVIEW. Before this, a programme could go
  // P1 → Ready for approval with nothing sourced at all, and the client would be asked to
  // approve an empty programme.
  //
  // ⚠️ NO NEW THRESHOLD IS INVENTED HERE, and that is deliberate. The rule is the smallest
  // one existing truth can answer: does ANY lead positively carry this programme's id? Not a
  // volume, not a percentage of the ceiling, not a ratio anybody has to agree — a count of
  // zero versus more than zero. `sourced_used` is NOT used for this: it counts what the
  // PROVIDER delivered, so a programme served entirely from the pool would read zero while
  // holding real reviewable people.
  //
  // ⚠️ AND IT COUNTS POSITIVE ATTRIBUTION, which is the same rule the send layers use. Work
  // that carries no programme id is history; it cannot make a new programme reviewable.
  // ⚠️ AND IT COUNTS ONLY WHAT COULD EVER BE REVIEWED. `programme_id` alone would count a lead
  // that failed enrichment or was never sent to the client — a record that can never appear in
  // the customer's review set, so a programme could be declared ready on work nobody can see.
  //
  // The two filters are NOT invented here: they are the existing definition `/leads/for-approval`
  // already uses — `delivered_at` (we have a contactable person) and `surfaced_for_approval_at`
  // (#493: an operator has actually Sent it to the client).
  //
  // ⛓️ CORRECTED. An earlier version copied only the first two filters, reasoning that
  // `revealed_at IS NULL` and `status != 'passed'` answer "what is still OUTSTANDING" rather
  // than "what can ever appear". That reasoning is wrong AT THIS TRANSITION, and the
  // difference matters: the client has not reviewed anything yet — that is the step this
  // status hands them — so a lead that is already revealed or already passed was disposed of
  // through the legacy per-lead path and will NEVER appear in their review set.
  //
  // Counting one would let READY_FOR_APPROVAL succeed while Milla opens on an empty list: the
  // exact failure the guard exists to prevent, arrived at by being clever about it.
  //
  // 🛑 SO THE PREDICATE IS THE REVIEW QUERY, NOT AN APPROXIMATION OF IT. All four conditions
  // from `/leads/for-approval`, in the same order, so "ready" and "there is something to
  // review" cannot answer differently. No new customer-facing rule is invented here — every
  // condition is lifted from the route that already defines the set.
  const { count, error } = await db.from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('programme_id', programmeId)
    .not('delivered_at', 'is', null)
    .not('surfaced_for_approval_at', 'is', null)
    // ⚑ 9 Sep (HOUSE-009) — AND M&V's PASSING VERDICT, so this cannot drift from the desk.
    // The comment above promises "ready" and "there is something to review" cannot disagree;
    // once the review desk required a verdict, that promise held only while nothing surfaced
    // an unjudged programme row — which `surfaceEverything` could do until it was fenced.
    // Asserting it here makes the agreement structural instead of incidental.
    .not('qualified_at', 'is', null)
    .is('disqualified_at', null)
    .is('revealed_at', null)
    .neq('status', 'passed')
  // A read failure is "we cannot tell", never "there is nothing" — the recurring `?? []`
  // defect in this codebase, applied to a gate.
  if (error) {
    return { ok: false, reason: `Could not read this programme's delivered work, so it was not moved. Nothing changed. (${error.message})` }
  }
  if (!count || count <= 0) {
    return { ok: false, reason: 'No sourced work carries this programme yet, so there is nothing for the client to review. Attach an ICP to the programme and source at least once first.' }
  }

  // ── ⚑ 7 Sep — AND REVIEWABLE PROSPECTS ARE NOT THE SAME AS REVIEWABLE WORK ───────────
  //
  // 🛑 THE LAUNCH-CRITICAL DEFECT THIS CLOSES. Everything above proves there is somebody to
  // show the client. It proves nothing about what would be DONE with them — and Vida offered
  // "Ready for approval" on the House programme with 246 reviewable prospects and no batch, no
  // campaign, no sequence, no messaging, no cadence, no sender and no frozen set.
  //
  // READY_FOR_APPROVAL means "a human may now look at what will run, and approve it". An
  // approval collected against work that does not exist is worse than no approval, because
  // everybody downstream treats it as consent to send.
  //
  // ⚠️ ONE CANONICAL RULE, so the API and the screen cannot disagree about what is allowed —
  // and it names the specific blocker, because the operator's next action depends entirely on
  // WHICH piece is missing.
  const { programmePreparationReadiness } = await import('./preparation-readiness')
  const readiness = await programmePreparationReadiness(programmeId)
  if (!readiness.ready) {
    return {
      ok: false,
      reason: 'This programme is not ready for the client to approve yet — ' +
        readiness.blockers.map(b => b.detail).join(' '),
    }
  }

  // ── ⚑ 8 Sep — FREEZE THE REVIEW SNAPSHOT, IN THE SAME WRITE AS THE STATUS ─────────────
  //
  // 🛑 THE CLIENT MUST REVIEW THE EXACT THING THEY LATER APPROVE (founder-locked). Freezing
  // only at APPROVED proved what was approved and nothing about what was READ: the work could
  // change underneath somebody mid-review and the approval would faithfully record the new
  // state — a perfect record of consent to something nobody looked at.
  //
  // ⚠️ SAME UPDATE AS THE STATUS, so a programme can never be READY_FOR_APPROVAL without a
  // record of what it was ready WITH; and a programme that cannot be described cannot become
  // reviewable, for the same reason it cannot become approved.
  const frozenAt = new Date().toISOString()
  const { buildPreparationSnapshot } = await import('./preparation-snapshot')
  const frozen = await buildPreparationSnapshot(programmeId)
  if (!frozen.ok) {
    return { ok: false, reason: `The prepared work could not be described, so there is nothing to freeze for the client to review. ${frozen.degraded}` }
  }
  await setStatus(programmeId, 'READY_FOR_APPROVAL', {
    review_preparation_hash: frozen.hash,
    review_preparation_snapshot: frozen.snapshot as unknown,
    review_preparation_at: frozenAt,
    // ⚑ 11 Sep (DAY 3) — VERSION 1, AND ONLY EVER 1 HERE. This transition is reachable only
    // from SOURCING / SOURCING_AUTHORISED, so it is always a programme's FIRST review package;
    // every later one is written by `refreezeForReview`, which counts up from whatever is
    // stored. Two writers, one counter, and neither invents a number the other could reuse.
    review_preparation_version: 1,
  })
  return { ok: true }
}

/**
 * ⚠️ THE CAMPAIGN GATE. A programme campaign may start ONLY when the second payment is
 * recorded and the programme is LIVE (founder lock 5). This is a function, not a comment,
 * so every caller asks the same question and no route can decide it locally.
 */
export function mayStartCampaign(p: ProgrammeRow): { allowed: boolean; reason?: string } {
  if (p.paused_at) return { allowed: false, reason: 'The programme is paused.' }
  // ⚑ P2 is satisfied by a payment OR internal authority, and `p2Authorised` is the ONE
  // definition of that. Restating the paid test here would let a programme reach LIVE through
  // `goLiveProgramme` (which uses the helper) and then be refused by this gate — two gates
  // disagreeing about one fact.
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

/**
 * 🛑 SETTLE A PROGRAMME THAT STOPPED SHORT — the credit goes to their WALLET (R136 ④).
 *
 * Founder-locked 23 Sep, verbatim: *"no. we dont give money back. we refund credits to their
 * wallet internally to use towards another icp run."*
 *
 * ── WHY THIS EXISTS AT ALL, AND WHY IT DID NOT BEFORE ───────────────────────────────────
 *
 * Until R136 a programme could not honestly stop short: ten bought was ten owed, and we kept
 * working at our cost. That promise is gone — we work to `meetings × 400` and stop — so a
 * programme can now end owing a client the difference, and this is where that is settled.
 *
 * ── THE ORDER IS THE WHOLE DESIGN, AND EACH STEP IS WHERE IT IS FOR A REASON ─────────────
 *
 * ① **CLAIM** — compare-and-set on `shortfall_credited_at IS NULL`. `increment_wallet` is NOT
 *    idempotent, so without a claim a double-clicked operator button credits twice. Exactly one
 *    caller wins; the loser is told it is already settled and moves no money.
 *
 * ② **PAY** — the atomic `increment_wallet` RPC, the same mechanism every other money path
 *    uses. Never a read-modify-write on `wallet_balance_usd`, which loses a concurrent credit.
 *
 * ③ **RECORD** — the ledger row, and `make_whole_cents`.
 *
 * ⚠️ **AND A FAILURE RELEASES THE CLAIM.** If ② or ③ fails the marker is set back to NULL, so a
 * retry is possible without anybody editing the database — R132a's lesson in the founder's own
 * words: *"Do not require the operator or Founder to manually edit the database."* A claim that
 * cannot be handed back is a programme stuck with no exit.
 *
 * 🛑 THE CREDIT IS ADDED TO `make_whole_cents`, AND THAT IS NOT BOOKKEEPING TIDINESS.
 * `computeContribution` subtracts that column from revenue, so partner commission automatically
 * stops being paid on money we gave back. Writing the credit anywhere else would leave a
 * partner earning 25% of revenue the client no longer owes — the R68 shape exactly.
 *
 * ⚠️ **DELIVERED MEETINGS ARE PERSISTED, NOT RE-DERIVED.** Meetings keep being booked on other
 * programmes; recomputing this later would move a settled figure, which is the one thing a
 * settlement may never do.
 *
 * ⚠️ **AND A ZERO CREDIT IS STILL A SETTLEMENT.** A programme that delivered everything it sold
 * owes nothing and is closed here all the same — the timestamp records that the question was
 * asked and answered, which is what stops it being asked again.
 */
export async function settleProgrammeShortfall(params: {
  programmeId: string
  deliveredMeetings: number
  note: string
}): Promise<ProgrammeResult & { creditCents?: number; alreadySettled?: boolean }> {
  const { programmeId, deliveredMeetings, note } = params
  if (!Number.isInteger(deliveredMeetings) || deliveredMeetings < 0) {
    return { ok: false, reason: 'Delivered meetings must be a whole number of at least 0.' }
  }
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }

  const already = (p as unknown as { shortfall_credited_at?: string | null }).shortfall_credited_at
  if (!('shortfall_credited_at' in (p as object))) {
    // ⚠️ FAIL CLOSED ON AN UNMIGRATED COLUMN. Without the marker there is no claim, and without
    // a claim this would credit a wallet again on every press. Retryable — it is our ordering.
    return { ok: false, reason: 'This programme cannot be settled yet — run migration 20260923_programme_shortfall_credit. Nothing was credited.' }
  }
  if (already) return { ok: true, alreadySettled: true, creditCents: (p as unknown as { shortfall_credit_cents?: number }).shortfall_credit_cents ?? 0 }

  // What they actually received, and what that leaves owing against money we actually hold.
  const collectedCents =
    (p.first_paid_at ? p.first_payment_cents : 0) + (p.second_paid_at ? p.second_payment_cents : 0)
  let creditCents: number
  try {
    const { shortfallCreditCents } = await import('@kind/shared')
    creditCents = shortfallCreditCents(p.meeting_target, deliveredMeetings, collectedCents)
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'The credit could not be computed.' }
  }

  // ① CLAIM. `.is('shortfall_credited_at', null)` makes this a compare-and-set: two concurrent
  // presses cannot both win, and the loser updates zero rows.
  const now = new Date().toISOString()
  const { data: claimed, error: claimErr } = await db.from('programmes').update({
    shortfall_credited_at: now,
    shortfall_credit_cents: creditCents,
    delivered_meetings: deliveredMeetings,
    updated_at: now,
  }).eq('id', programmeId).is('shortfall_credited_at', null).select()
  if (claimErr) return { ok: false, reason: claimErr.message }
  if (!claimed || claimed.length === 0) return { ok: true, alreadySettled: true }

  const release = async (): Promise<void> => {
    await db.from('programmes').update({
      shortfall_credited_at: null, shortfall_credit_cents: 0, delivered_meetings: null,
      updated_at: new Date().toISOString(),
    }).eq('id', programmeId)
  }

  // ② PAY. Skipped entirely when nothing is owed — a $0 wallet movement is a ledger row that
  // says something happened when nothing did.
  if (creditCents > 0) {
    const { error: walletErr } = await db.rpc('increment_wallet', {
      p_client_id: p.client_id, p_amount: creditCents / 100,
    })
    if (walletErr) {
      await release()
      return { ok: false, reason: `The wallet could not be credited (${walletErr.message}). Nothing was settled — try again.` }
    }

    // ③ RECORD. `reference` is uniquely indexed, so a row for this programme already existing
    // means a previous attempt got here — that is the dedup working, not a failure.
    const { error: ledgerErr } = await db.from('credit_transactions').insert({
      client_id: p.client_id, type: 'wallet_topup', amount: creditCents / 100, plan: 'work_model',
      reference: `programme-shortfall:${programmeId}`,
      note: `Programme delivered ${deliveredMeetings} of ${p.meeting_target} — credit toward another run`,
      created_at: now,
    })
    if (ledgerErr && ledgerErr.code !== '23505') {
      // 🛑 THE MONEY MOVED AND THE LEDGER DID NOT. The claim is NOT released — releasing it
      // would invite a retry that credits the wallet a second time. It is alerted instead, so
      // a human reconciles a recorded overpayment rather than the product silently creating one.
      void sendFounderAlert('payment_failed', 'Programme shortfall credited but not ledgered', [
        `Programme ${programmeId} (client ${p.client_id}): ${creditCents} cents were added to the wallet and the ledger row FAILED (${ledgerErr.message}).`,
        'The wallet balance is correct and the programme records the settlement. The ledger is missing one row.',
        'Do NOT re-run the settlement — it would credit the wallet twice.',
      ])
    }
  }

  // The credit reduces revenue for contribution, exactly as operator-decided make-whole does.
  await db.from('programmes').update({
    make_whole_cents: p.make_whole_cents + creditCents,
    value_settled_at: now,
    updated_at: new Date().toISOString(),
  }).eq('id', programmeId)

  void sendFounderAlert('churn_risk', 'Programme settled short', [
    `Programme ${programmeId} (client ${p.client_id}) delivered ${deliveredMeetings} of ${p.meeting_target} meetings.`,
    creditCents > 0
      ? `${creditCents} cents credited to their wallet toward another run.`
      : 'Nothing was owed back.',
    note,
    'This is WALLET CREDIT, not a Stripe refund. If money is also to be returned, do that separately.',
  ])
  return { ok: true, creditCents }
}

/** A chargeback cannot be refused by code. Record it, stop delivery, preserve evidence, alert. */
export async function recordDispute(
  programmeId: string, detail: string, kind: 'dispute' | 'refund' = 'dispute',
): Promise<ProgrammeResult> {
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, reason: 'No such programme.' }

  // ⚑ 9 Sep — IDEMPOTENT, BECAUSE STRIPE RETRIES. A duplicate `charge.refunded` must not move
  // the timestamps: `disputed_at` is when the money was reversed, and rewriting it on every
  // redelivery would make the evidence trail say the dispute kept happening. The FIRST stamp
  // is the fact; later deliveries confirm a state that already holds.
  const now = new Date().toISOString()
  const alreadyReversed = !!p.disputed_at
  await db.from('programmes').update({
    disputed_at: p.disputed_at ?? now,
    paused_at: p.paused_at ?? now,
    pause_reason: p.pause_reason ?? 'quality',
    updated_at: now,
  }).eq('id', programmeId)

  if (alreadyReversed) return { ok: true }

  const word = kind === 'refund' ? 'refunded' : 'disputed'
  void sendFounderAlert('churn_risk', `Programme payment ${word} — delivery stopped`, [
    `Programme ${programmeId} (client ${p.client_id}) was ${word}.`,
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
