// ── THE PROGRAMME PRICING CURVE — the single home for programme money ────────────────────
//
// The founder-locked commercial destination (PRODUCT-RULES R74 · R77 · R78 · R81). A client
// buys BOOKED MEETINGS, not leads: they choose a meeting target, the curve prices it, and the
// recommended sourcing volume falls out at 250 leads per targeted meeting (R77).
//
// ⚠️ THIS IS NOT LIVE COMMERCIAL TRUTH YET. What runs today is the legacy model — $299 pack,
// first 100 approvals included, $4 per approved lead thereafter — and it stays running until
// the coordinated migration is founder-approved and deployed (R74). Nothing in this file may
// be quoted to a client, a partner or the website until then.
//
// ⚠️ AND NOTHING HERE MAY IMPORT A LEGACY MONEY CONSTANT. `LEAD_PRICE_USD`, `PACK_PRICE_USD`,
// `PACK_LEADS` and `PARTNER_COMMISSION_PER_LEAD_USD` belong to the other model. The two must
// never read each other — `programme-legacy-fence.test.ts` enforces it in both directions,
// and it exists because R68 already proved what a half-migrated price does: change the shared
// constant alone and a partner is paid $2 commission on a $4 charge.
//
// ── WHY EVERY BOUNDARY IS INTEGER CENTS ──────────────────────────────────────────────────
//
// The curve's interpolation produces genuinely fractional dollars — at 7 meetings the price
// per meeting is $441.6666…, and 7 × that is $3,091.6666…. Carrying that as a float to a
// payment boundary is how a programme gets charged $3,091.67 and refunded $3,091.66.
//
// So: DOLLARS ARE THE MODEL, CENTS ARE THE MONEY. `pricePerMeetingUsd` is the honest
// unrounded curve value and is for display and reasoning. Every number that reaches Stripe,
// the database or a partner commission goes through `programmeTotalCents` and is an integer.
// **Rounding happens ONCE, on the total** — never per meeting and then multiplied, because
// rounding 441.6666 to 44167 cents and multiplying by 7 gives $3,091.69, which is 3 cents the
// client never agreed to.
//
// The 50/50 split then partitions that integer exactly (R81): `floor(total/2)` first, and the
// remainder second, so **first + second === total, always** — the odd cent goes to payment
// two. That is a founder-locked rule, not a rounding convenience, and it is why the split is
// computed by subtraction rather than by rounding each half.

/** Leads recommended per targeted booked meeting (FD-01 · R77). A PLANNING BENCHMARK, NEVER A GUARANTEE. */
export const LEADS_PER_TARGETED_MEETING = 250

/** Partner commission as a percentage of PROGRAMME CONTRIBUTION (FD-02 · R78) — never of revenue. */
export const PROGRAMME_PARTNER_COMMISSION_PCT = 25

/** The curve's anchor points, in dollars per targeted booked meeting (R81). */
export const PROGRAMME_ANCHOR_1_USD = 450
export const PROGRAMME_ANCHOR_10_USD = 437.5
export const PROGRAMME_ANCHOR_50_USD = 400
/** Below this, price per meeting never falls — 50+ is a floor, not a continuing slope. */
export const PROGRAMME_FLOOR_USD = PROGRAMME_ANCHOR_50_USD

/** The largest programme the curve is defined for. Above this the floor applies unchanged. */
const FLOOR_FROM_MEETINGS = 50

export class ProgrammePricingError extends Error {}

/**
 * Meetings must be a positive integer. A fractional or zero meeting target is not a small
 * pricing problem — it is a programme that cannot be sourced for or delivered, so it is
 * refused at the boundary rather than silently floored into something plausible.
 */
function assertMeetings(meetings: number): void {
  if (!Number.isInteger(meetings) || meetings < 1) {
    throw new ProgrammePricingError(
      `Meeting target must be a whole number of at least 1 — received ${meetings}.`,
    )
  }
}

/**
 * Price per targeted booked meeting, in DOLLARS, unrounded (R81).
 *
 * Piecewise-linear between the three anchors, then flat:
 *   1        → $450.00
 *   2 … 10   → 450 − ((m − 1) × 12.50 / 9)      → $437.50 at 10
 *   11 … 50  → 437.50 − ((m − 10) × 37.50 / 40) → $400.00 at 50
 *   51 +     → $400.00 (floor)
 *
 * ⚠️ FOR DISPLAY AND REASONING ONLY. Money boundaries use `programmeTotalCents`.
 */
export function pricePerMeetingUsd(meetings: number): number {
  assertMeetings(meetings)
  if (meetings === 1) return PROGRAMME_ANCHOR_1_USD
  if (meetings <= 10) {
    return PROGRAMME_ANCHOR_1_USD - ((meetings - 1) * 12.5) / 9
  }
  if (meetings <= FLOOR_FROM_MEETINGS) {
    return PROGRAMME_ANCHOR_10_USD - ((meetings - 10) * 37.5) / 40
  }
  return PROGRAMME_FLOOR_USD
}

/** Price per targeted booked meeting in integer cents — display/quote use, rounded once. */
export function pricePerMeetingCents(meetings: number): number {
  return Math.round(pricePerMeetingUsd(meetings) * 100)
}

/**
 * The programme's total price in INTEGER CENTS — the authoritative money figure.
 *
 * `meetings × pricePerMeeting`, rounded ONCE at the end. Rounding the per-meeting price first
 * and multiplying would drift by up to a cent per meeting (see the header).
 */
export function programmeTotalCents(meetings: number): number {
  assertMeetings(meetings)
  return Math.round(pricePerMeetingUsd(meetings) * meetings * 100)
}

/**
 * Recommended sourcing volume for a programme: `meetings × 250` (R77).
 *
 * This becomes the programme's `sourcing_ceiling` when the first payment authorises sourcing.
 * ⚠️ A PLANNING BENCHMARK, NOT A PROMISE — never present it as "X leads = Y meetings" (R69).
 */
export function recommendedVolume(meetings: number): number {
  assertMeetings(meetings)
  return meetings * LEADS_PER_TARGETED_MEETING
}

/**
 * The first 50%, in integer cents: `floor(total / 2)`.
 * Authorises sourcing up to the full recommended volume (R81 · founder lock 4).
 */
export function firstPaymentCents(totalCents: number): number {
  assertTotal(totalCents)
  return Math.floor(totalCents / 2)
}

/**
 * The second 50%, in integer cents: `total − first`.
 *
 * ⚠️ COMPUTED BY SUBTRACTION, DELIBERATELY. The odd cent goes to payment two (R81), and
 * subtraction is the only formulation where `first + second === total` holds for every input
 * without a reconciliation step. Rounding each half independently does not.
 */
export function secondPaymentCents(totalCents: number): number {
  assertTotal(totalCents)
  return totalCents - firstPaymentCents(totalCents)
}

function assertTotal(totalCents: number): void {
  if (!Number.isInteger(totalCents) || totalCents < 1) {
    throw new ProgrammePricingError(
      `Programme total must be a positive whole number of cents — received ${totalCents}.`,
    )
  }
}

/** Every money figure for a meeting target, derived once so no caller re-types the curve. */
export interface ProgrammeQuote {
  meetings: number
  pricePerMeetingUsd: number
  pricePerMeetingCents: number
  totalCents: number
  firstPaymentCents: number
  secondPaymentCents: number
  recommendedVolume: number
}

/**
 * The one function a route, a service or an operator screen should call.
 *
 * ⚠️ CALLERS MUST NOT RE-DERIVE ANY OF THESE. The curve living in two places is exactly the
 * three-`$4`-literals defect R68 records — where the charge read one constant and the partner
 * commission read another, so moving one alone would have paid 50% commission on a $4 sale.
 */
export function quoteProgramme(meetings: number): ProgrammeQuote {
  const totalCents = programmeTotalCents(meetings)
  return {
    meetings,
    pricePerMeetingUsd: pricePerMeetingUsd(meetings),
    pricePerMeetingCents: pricePerMeetingCents(meetings),
    totalCents,
    firstPaymentCents: firstPaymentCents(totalCents),
    secondPaymentCents: secondPaymentCents(totalCents),
    recommendedVolume: recommendedVolume(meetings),
  }
}

/** Which half of a programme a payment is. Both stages carry the programme id in metadata. */
export type ProgrammeStage = 'programme_first' | 'programme_second'

/**
 * The exact integer amount, in cents, to charge for one stage.
 *
 * Stripe takes integer minor units, so this IS the Stripe amount — no further conversion, no
 * float multiplication at the boundary.
 */
export function programmeStripeAmountCents(meetings: number, stage: ProgrammeStage): number {
  const total = programmeTotalCents(meetings)
  return stage === 'programme_first' ? firstPaymentCents(total) : secondPaymentCents(total)
}

/**
 * Partner commission on a FINALISED programme contribution: 25% of contribution (R78).
 *
 * ⚠️ THE ARGUMENT IS CONTRIBUTION, NOT REVENUE, AND THE NAME SAYS SO. Passing programme
 * revenue here produces a number roughly four times too large. Contribution is programme
 * revenue minus directly attributable acquisition and delivery costs, with fixed company
 * overhead excluded — so it is **never** "net profit" and **never** "net margin" (R78).
 *
 * ⚠️ ONLY EVER CALLED WITH A FINALISED FIGURE. A provisional contribution on a live programme
 * must not be written to a partner commission row; `contribution.ts` enforces that seam.
 */
export function partnerCommissionCents(programmeContributionCents: number): number {
  if (!Number.isInteger(programmeContributionCents)) {
    throw new ProgrammePricingError(
      `Programme contribution must be integer cents — received ${programmeContributionCents}.`,
    )
  }
  // A negative contribution (costs exceeded revenue) pays no commission rather than clawing
  // money back from a partner — a negative commission row is a debt nobody agreed to.
  if (programmeContributionCents <= 0) return 0
  return Math.round((programmeContributionCents * PROGRAMME_PARTNER_COMMISSION_PCT) / 100)
}
