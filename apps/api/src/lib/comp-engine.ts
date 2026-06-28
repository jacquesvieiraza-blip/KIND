// ─────────────────────────────────────────────────────────────────────────────
// CORE commission engine — K.I.N.D item 203, phase 1 (the pure maths only).
//
// This is the SINGLE place the "20/5/5" comp rules live (BRIEF §2 discipline #3:
// "The comp rules live in exactly ONE engine — never reimplement 20/5/5 in
//  multiple places. All portals read the same engine").
//
// SCOPE OF THIS FILE — pure functions only:
//   • NO database, NO Stripe, NO I/O, NO side-effects.
//   • Typed inputs → typed outputs. Fully unit-testable in isolation.
//   • Currency = USD (founder decided 22 Jun). All amounts are USD.
//
// Reference / oracle:
//   • docs/hiring/KIND-CLAUDE-CODE-BRIEF.md §3 (the comp model)
//   • docs/hiring/KIND-AE-COMP-PLAN.md  + KIND-AE-commission-calculator.html
//   • docs/hiring/KIND-PARTNER-COMP-PLAN.md + KIND-partner-calculator.html
//   (the calculators' compute() functions are the reference implementation)
//
// Money handling: all amounts are USD. We keep cents-accurate maths by computing
// in floating dollars and rounding ONLY at the reported boundaries with a single
// half-up `roundUsd` helper (round to whole cents). Inputs are plain dollars.
// ─────────────────────────────────────────────────────────────────────────────

// ── money helper ─────────────────────────────────────────────────────────────

/** Round a USD amount to whole cents, half-up, avoiding binary-float drift. */
export function roundUsd(amount: number): number {
  // +Number.EPSILON nudge defeats e.g. (1.005) float cases; scale by 100.
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

// ── plan-rate constants (the locked "20/5/5") ────────────────────────────────

/** The locked commission rates. BRIEF §3 + both comp plans. */
export const RATES = {
  /** Land — one-time, 20% of a new client's first-month MRR. */
  LAND: 0.2,
  /** Retain — recurring, 5% of the rep's active book each month. */
  RETAIN: 0.05,
  /** Expansion — one-time, 20% of an MRR increase (new product line / upsell /
   *  added seat). Set to 20% (founder, 28 Jun): expansion is treated like a new
   *  logo for that product — it drives reps/partners to hunt new departments AND
   *  grow their existing book, not just chase fresh accounts. */
  EXPAND: 0.20,
  /** Multi-seat kicker — +5% added to the land rate on deals of 2+ seats. */
  MULTI_SEAT_KICKER: 0.05,
  /** Partner acquisition — one-time, 20% of a new client's first-month MRR. */
  PARTNER_ACQUISITION: 0.2,
  /** Partner retention — recurring, 5% of the partner's active book. */
  PARTNER_RETENTION: 0.05,
} as const

/** AE ramp guarantee schedule (months 1-4) as a fraction of monthly variable. */
export const RAMP_GUARANTEE = [1, 1, 0.75, 0.75] as const

// ── accelerators ─────────────────────────────────────────────────────────────

/**
 * Land accelerator multiplier by new-MRR quota attainment.
 * BRIEF §5 / AE-COMP-PLAN §5 (matches the calculator: at>1.4 → 1.5, at>=1 → 1.25).
 *   < 100% of quota   → 1.0×
 *   100% – 140%       → 1.25×
 *   > 140%            → 1.5×
 * Applied ONLY to land commission; retain & expansion stay flat-rate. Uncapped.
 *
 * @param newMrr   new MRR landed this period (USD)
 * @param quota    the rep's full monthly new-MRR quota (USD); must be > 0
 */
export function landAccelerator(newMrr: number, quota: number): number {
  if (quota <= 0) return 1.0
  const attainment = newMrr / quota
  if (attainment > 1.4) return 1.5
  if (attainment >= 1.0) return 1.25
  return 1.0
}

// ── AE: a single deal's land commission ──────────────────────────────────────

export interface LandDealInput {
  /** First-month MRR of the new client (USD). */
  firstMonthMrr: number
  /** Number of seats on the deal (2+ triggers the multi-seat kicker). */
  seats: number
  /**
   * The rep's TOTAL new MRR for the quota period this deal counts toward (USD).
   * Drives the accelerator. Pass `firstMonthMrr` if this is the only deal.
   */
  periodNewMrr: number
  /** The rep's full monthly new-MRR quota (USD). */
  quota: number
}

export interface LandDealResult {
  /** Effective land rate after the multi-seat kicker (before accelerator). */
  baseRate: number
  /** Accelerator multiplier applied (1.0 / 1.25 / 1.5). */
  accelerator: number
  /** Land commission earned on this deal (USD, rounded to cents). */
  commission: number
}

/**
 * Land commission for one new-client deal:
 *   land = (20% + 5% if 2+ seats) × first-month MRR × accelerator(periodNewMrr/quota)
 */
export function aeLandCommission(input: LandDealInput): LandDealResult {
  const { firstMonthMrr, seats, periodNewMrr, quota } = input
  const baseRate =
    RATES.LAND + (seats >= 2 ? RATES.MULTI_SEAT_KICKER : 0)
  const accelerator = landAccelerator(periodNewMrr, quota)
  const commission = roundUsd(firstMonthMrr * baseRate * accelerator)
  return { baseRate, accelerator, commission }
}

/** Retain commission: 5% × the rep's active (collected) book MRR. */
export function aeRetainCommission(activeBookMrr: number): number {
  return roundUsd(activeBookMrr * RATES.RETAIN)
}

/** Expansion commission: 5% × the MRR increase (new − prior), one-time. */
export function aeExpansionCommission(priorMrr: number, newMrr: number): number {
  const increase = Math.max(newMrr - priorMrr, 0)
  return roundUsd(increase * RATES.EXPAND)
}

// ── AE: ramp guarantee (greater-of) ──────────────────────────────────────────

/**
 * The guarantee floor for a given month, as a USD amount.
 * Months 1-4 → [100%, 100%, 75%, 75%] of the monthly variable target.
 * Month 1 is gated on completing onboarding objectives — if not met, floor = 0.
 * Months 5+ → 0 (pure performance).
 *
 * @param month               1-based month number in the rep's tenure
 * @param monthlyVariable     the rep's monthly variable target (USD)
 * @param onboardingComplete  month-1 gate (ignored for months 2+); default true
 */
export function aeGuaranteeFloor(
  month: number,
  monthlyVariable: number,
  onboardingComplete = true,
): number {
  if (month < 1 || month > RAMP_GUARANTEE.length) return 0
  if (month === 1 && !onboardingComplete) return 0
  return roundUsd(RAMP_GUARANTEE[month - 1] * monthlyVariable)
}

// ── AE: monthly pay roll-up ──────────────────────────────────────────────────

export interface AeMonthlyInput {
  /** 1-based month number in the rep's tenure (drives the guarantee). */
  month: number
  /** The rep's monthly base salary (USD) — base/12. */
  monthlyBase: number
  /** The rep's monthly variable target (USD) — drives the guarantee floor. */
  monthlyVariable: number
  /** New-client land deals closed this month. */
  landDeals: LandDealInput[]
  /** The rep's active (collected) book MRR for the retain calc (USD). */
  activeBookMrr: number
  /** Expansions this month: prior & new MRR per upsell. */
  expansions?: Array<{ priorMrr: number; newMrr: number }>
  /** Month-1 onboarding gate (default true). */
  onboardingComplete?: boolean
}

export interface AeMonthlyResult {
  landCommission: number
  retainCommission: number
  expansionCommission: number
  /** Sum of land + retain + expansion (USD). */
  earnedCommission: number
  /** The guarantee floor that applies this month (USD). */
  guaranteeFloor: number
  /** max(earnedCommission, guaranteeFloor) — what the variable pays out. */
  variablePaid: number
  /** Whether the guarantee floor beat earned commission this month. */
  guaranteeApplied: boolean
  /** monthlyBase + variablePaid (USD) — total cash for the month. */
  totalPay: number
}

/**
 * Roll up one month of AE pay:
 *   earned   = Σ land + retain + Σ expansion
 *   variable = max(earned, guarantee-this-month)
 *   totalPay = monthlyBase + variable
 */
export function aeMonthlyPay(input: AeMonthlyInput): AeMonthlyResult {
  const {
    month,
    monthlyBase,
    monthlyVariable,
    landDeals,
    activeBookMrr,
    expansions = [],
    onboardingComplete = true,
  } = input

  const landCommission = roundUsd(
    landDeals.reduce((sum, d) => sum + aeLandCommission(d).commission, 0),
  )
  const retainCommission = aeRetainCommission(activeBookMrr)
  const expansionCommission = roundUsd(
    expansions.reduce(
      (sum, e) => sum + aeExpansionCommission(e.priorMrr, e.newMrr),
      0,
    ),
  )

  const earnedCommission = roundUsd(
    landCommission + retainCommission + expansionCommission,
  )
  const guaranteeFloor = aeGuaranteeFloor(
    month,
    monthlyVariable,
    onboardingComplete,
  )
  const guaranteeApplied = guaranteeFloor > earnedCommission
  const variablePaid = Math.max(earnedCommission, guaranteeFloor)
  const totalPay = roundUsd(monthlyBase + variablePaid)

  return {
    landCommission,
    retainCommission,
    expansionCommission,
    earnedCommission,
    guaranteeFloor,
    variablePaid,
    guaranteeApplied,
    totalPay,
  }
}

// ── Partner: commission (no base, no guarantee, no expansion) ────────────────

export interface PartnerMonthlyInput {
  /** New-client first-month MRR landed this month (USD). */
  newClientMrr: number
  /** The partner's active (collected) book MRR (USD). */
  activeBookMrr: number
}

export interface PartnerMonthlyResult {
  /** 20% × new-client first-month MRR (one-time). */
  acquisitionCommission: number
  /** 5% × active book MRR (recurring). */
  retentionCommission: number
  /** acquisition + retention (USD). */
  totalPay: number
}

/**
 * Partner monthly commission:
 *   acquisition = 20% × new-client first-month MRR (one-time)
 *   retention   = 5%  × active book MRR (recurring)
 *   totalPay    = acquisition + retention   (no base, ever)
 */
export function partnerMonthlyPay(
  input: PartnerMonthlyInput,
): PartnerMonthlyResult {
  const acquisitionCommission = roundUsd(
    input.newClientMrr * RATES.PARTNER_ACQUISITION,
  )
  const retentionCommission = roundUsd(
    input.activeBookMrr * RATES.PARTNER_RETENTION,
  )
  const totalPay = roundUsd(acquisitionCommission + retentionCommission)
  return { acquisitionCommission, retentionCommission, totalPay }
}

// ── earned-when-collected + windfall review ──────────────────────────────────

export interface CollectibleDeal {
  /** The deal's MRR (USD). */
  mrr: number
  /**
   * Whether the underlying revenue has been COLLECTED & reconciled.
   * Commission is earned only on collected MRR (BRIEF §3 / both plans §3/§6).
   */
  collected: boolean
}

/**
 * Earned-when-collected gate: returns the portion of MRR that may earn
 * commission — i.e. only deals whose revenue has actually been collected.
 * Uncollected MRR contributes $0 (nothing is paid ahead of cash).
 */
export function collectedMrr(deals: CollectibleDeal[]): number {
  return roundUsd(
    deals.reduce((sum, d) => sum + (d.collected ? d.mrr : 0), 0),
  )
}

/**
 * Windfall-review flag: any SINGLE deal landing above ~2× the monthly quota
 * is held for review before its commission earns, so one whale doesn't overpay.
 * (AE-COMP-PLAN §7: "~2× the AE's monthly quota (~$9,000 new MRR)".)
 *
 * @param dealMrr       a single deal's new MRR (USD)
 * @param monthlyQuota  the rep's monthly new-MRR quota (USD)
 * @param multiple      windfall threshold as a multiple of quota (default 2)
 */
export function isWindfall(
  dealMrr: number,
  monthlyQuota: number,
  multiple = 2,
): boolean {
  if (monthlyQuota <= 0) return false
  return dealMrr > monthlyQuota * multiple
}
