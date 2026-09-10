// ═══════════════════════════════════════════════════════════════════════════════════════
// THE PROGRAMME CALCULATOR — the client chooses a meeting target, in Milla.
//
// ── WHAT WAS MISSING (audit, 10 Sep) ────────────────────────────────────────────────────
//
// The canonical flow is: Proof completes → the client opens the calculator in MILLA → they
// choose a target → that becomes the recommendation → they accept → P1. None of it existed.
// The only `programmes` INSERT in the product was `createProgramme(clientId, meetings)`,
// behind an admin-key route, fed by an operator typing a number into a Vida text box while
// the client was still at Proof. The client never chose anything, and never saw the
// recommended volume at all.
//
// The only calculator in the repo was `apps/website/pipeline-calculator.html` — a marketing
// page on the RETIRED $4-per-approved-lead model, with hard-coded reply and meeting rates.
// It is not the source for any of this.
//
// ── 🛑 THIS FILE DERIVES NO MONEY OF ITS OWN ────────────────────────────────────────────
//
// Every price, split and volume comes from `quoteProgramme` in `programme-pricing.ts`. That
// is not tidiness: R68 records what a second copy of a price does — the charge read one
// constant and the partner commission read another, so moving one alone would have paid 50%
// commission on a $4 sale. What this file adds is the CLIENT'S OWN ASSUMPTIONS, which are not
// money we charge and never touch the curve.
//
// ── THE TWO KINDS OF NUMBER, AND WHY THEY MUST NOT BE CONFUSED ──────────────────────────
//
//   COMMITTED   — the meeting target, the recommended volume, the price, the 50/50 split.
//                 Ours, priced by the curve, and what the client accepts.
//   ILLUSTRATIVE — estimated clients, estimated revenue, the revenue multiple. Arithmetic on
//                 the CLIENT'S OWN GUESSES about their business. We stand behind none of it.
//
// ⚠️ AND THE TARGET IS A TARGET. R77's benchmark is "250 recommended leads per targeted booked
// meeting" and R69 forbids presenting it as "X leads = Y meetings". `TARGET_NOT_GUARANTEE`
// below is the sentence that has to appear wherever the target does.
// ═══════════════════════════════════════════════════════════════════════════════════════

import {
  LEADS_PER_TARGETED_MEETING, quoteProgramme, ProgrammePricingError,
  type ProgrammeQuote,
} from './programme-pricing'

/** The founder-locked framing, in one place so no screen writes its own softer version. */
export const TARGET_NOT_GUARANTEE =
  'This is the outcome we aim for and build the programme around. It is a target, not a guarantee.'

/** Illustrative outputs carry this, always. They are arithmetic on the client's own numbers. */
export const ILLUSTRATIVE_LABEL =
  'Your own figures, worked through — an illustration, not a forecast or a promise from us.'

/**
 * The lowest leads-per-meeting a client may model with.
 *
 * ⚠️ A GUARD, NOT A PRODUCT OPINION. Below this the volume stops being a plausible plan and
 * starts being a way to describe a programme that cannot be delivered.
 */
export const MIN_LEADS_PER_MEETING = 25

/** What the client can change. Everything else is derived. */
export interface CalculatorInputs {
  /** THE ONE COMMITTED CHOICE: targeted booked meetings. A positive whole number. */
  meetings: number
  /**
   * Leads per targeted booked meeting. Starts at the M&V benchmark (R77's 250).
   *
   * 🛑 CLAMPED AT THE BENCHMARK AS A MAXIMUM, and this is the one bounded call in this file.
   * The curve prices PER MEETING and is independent of volume, so a client who set this to
   * 1,000 would be buying four times the sourcing at the same price — a commercial change
   * nobody authorised. The benchmark is what the price is built on, so it is the ceiling.
   * Lowering it is the client's own conservatism and only reduces what we spend.
   */
  leadsPerMeeting?: number
  /** What one new client is worth to them. Their figure, in whole currency units. */
  averageClientValue?: number
  /** How many of their meetings become clients, as a percentage. Their figure. */
  meetingToClientPct?: number
}

/** The client's assumptions as stored — the snapshot that reproduces what they accepted. */
export interface CalculatorAssumptions {
  leadsPerMeeting: number
  averageClientValue: number
  meetingToClientPct: number
}

export interface CalculatorResult {
  /** ── COMMITTED: ours, from the curve. ─────────────────────────────────────────────── */
  meetings: number
  recommendedVolume: number
  totalCents: number
  firstPaymentCents: number
  secondPaymentCents: number
  /**
   * Effective cost per targeted meeting, in cents.
   *
   * ⚠️ CANONICALLY DERIVABLE, so it is derived rather than invented: it is the curve's own
   * per-meeting price. Shown because "what does a meeting cost me" is the question a client
   * actually asks, and answering it with a number that is not the curve's would be a second
   * price.
   */
  effectiveCostPerMeetingCents: number
  /** ── ILLUSTRATIVE: arithmetic on their guesses. ───────────────────────────────────── */
  estimatedClients: number
  estimatedRevenueCents: number
  /** Illustrative revenue ÷ programme cost. Null when there is no revenue to compare. */
  revenueMultiple: number | null
  /** Exactly what was assumed, ready to persist. */
  assumptions: CalculatorAssumptions
  /** The full canonical quote, so a caller never re-derives a figure from the parts. */
  quote: ProgrammeQuote
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * Read one assumption, falling back to the benchmark or to zero.
 *
 * ⚠️ A MISSING ASSUMPTION IS NOT AN ERROR, and a nonsense one is not silently kept. The
 * client is modelling their own business; the calculator must answer for a half-filled form
 * rather than refuse, because refusing is how a client concludes the product is broken.
 */
function readAssumptions(i: CalculatorInputs): CalculatorAssumptions {
  const lpm = Number(i.leadsPerMeeting)
  const value = Number(i.averageClientValue)
  const pct = Number(i.meetingToClientPct)
  return {
    leadsPerMeeting: Number.isFinite(lpm) && lpm > 0
      ? Math.round(clamp(lpm, MIN_LEADS_PER_MEETING, LEADS_PER_TARGETED_MEETING))
      : LEADS_PER_TARGETED_MEETING,
    averageClientValue: Number.isFinite(value) && value > 0 ? Math.round(value) : 0,
    // 0 is a legitimate answer ("I don't know yet"); above 100 is not a percentage.
    meetingToClientPct: Number.isFinite(pct) && pct > 0 ? clamp(Math.round(pct), 0, 100) : 0,
  }
}

/**
 * The whole calculator, in one pure function.
 *
 * @throws ProgrammePricingError for a meeting target the curve refuses (zero, fractional,
 *         negative). The client's screen bounds the input, and this is the boundary that
 *         cannot be talked past — a programme with no target cannot be sourced or delivered.
 */
export function calculateProgramme(inputs: CalculatorInputs): CalculatorResult {
  const assumptions = readAssumptions(inputs)
  // 🛑 THE MONEY IS THE CURVE'S. This throws for an invalid target before anything else is
  // computed, so no illustrative figure is ever produced for a programme that cannot exist.
  const quote = quoteProgramme(inputs.meetings)

  // ⚠️ THE VOLUME FOLLOWS THE CLIENT'S ASSUMPTION, WITHIN THE CLAMP — so the number they
  // accept is the number they were shown. At the default it is exactly `quote.recommendedVolume`.
  const recommendedVolume = inputs.meetings * assumptions.leadsPerMeeting

  const estimatedClients = (inputs.meetings * assumptions.meetingToClientPct) / 100
  const estimatedRevenueCents = Math.round(estimatedClients * assumptions.averageClientValue * 100)

  return {
    meetings: inputs.meetings,
    recommendedVolume,
    totalCents: quote.totalCents,
    firstPaymentCents: quote.firstPaymentCents,
    secondPaymentCents: quote.secondPaymentCents,
    effectiveCostPerMeetingCents: quote.pricePerMeetingCents,
    estimatedClients,
    estimatedRevenueCents,
    // ⚠️ NULL RATHER THAN ZERO OR INFINITY. A client who has not given a deal value has no
    // multiple to see, and rendering "0×" beside their programme price reads as a verdict on it.
    revenueMultiple: estimatedRevenueCents > 0 && quote.totalCents > 0
      ? estimatedRevenueCents / quote.totalCents
      : null,
    assumptions,
    quote,
  }
}

/**
 * Is this a target the calculator will accept? Used by the screen to enable its own control,
 * so the client is never invited to press something the server will refuse.
 */
export function meetingTargetProblem(meetings: unknown): string | null {
  const n = Number(meetings)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    return 'Choose a whole number of meetings, at least one.'
  }
  if (n > 500) return 'For a programme this size, talk to us first — we will shape it with you.'
  return null
}

/**
 * 🛑 DID THE PROGRAMME WE STORED MATCH WHAT THE CLIENT WAS SHOWN?
 *
 * ⚠️ THIS EXISTS BECAUSE "the client accepted a number" IS A COMMERCIAL CLAIM. The
 * recommendation screen renders from the calculator; the programme row is written by the
 * server from the same inputs. If those ever disagree, the client accepted one price and owes
 * another — so the row is re-derived and compared before acceptance is recorded, and a
 * mismatch refuses rather than picking one.
 */
export function programmeMatchesQuote(
  row: { meeting_target?: unknown; price_total_cents?: unknown; recommended_volume?: unknown },
  result: CalculatorResult,
): boolean {
  return Number(row.meeting_target) === result.meetings
    && Number(row.price_total_cents) === result.totalCents
    && Number(row.recommended_volume) === result.recommendedVolume
}

export { ProgrammePricingError }
