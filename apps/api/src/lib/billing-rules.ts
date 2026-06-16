// ─────────────────────────────────────────────────────────────────────────────
// Pure billing rules — the SINGLE SOURCE of "which wallet, and how much".
//
// No DB, no side-effects → fully unit-testable. The money-path code
// (lead-delivery.ts, icps.ts, internal.ts drip, figsy.ts enrollment) calls these
// so the lead-gen + FIGSY double-charge (item 166) can never silently come back.
//
// The model (founder-locked 16 Jun): ONE lead = ONE charge = ONE wallet, keyed
// off clients.plan:
//   • lead_gen → charged once AT DELIVERY  ($1 from credit_balance)
//   • figsy    → NOT charged at delivery; charged once AT ENROLLMENT
//                ($3 / 1 credit from figsy_credits_remaining)
// ─────────────────────────────────────────────────────────────────────────────

export type Plan = 'lead_gen' | 'figsy'

/** Normalise a possibly-missing/garbage plan value to the safe default. */
export function normalizePlan(plan: string | null | undefined): Plan {
  return plan === 'figsy' ? 'figsy' : 'lead_gen'
}

/**
 * The delivery-time charge decision (item 166). Returns whether a delivered lead
 * is charged AT DELIVERY and from which wallet.
 *   lead_gen → { charge: true,  pool: 'lead_gen' }  → deduct 1 from credit_balance
 *   figsy    → { charge: false, pool: 'lead_gen' }  → delivery is free; the single
 *              FIGSY credit is taken later, at enrollment.
 * The invariant a FIGSY lead is NEVER charged at delivery is what kills the
 * double-charge — guard it with a test, never inline it again.
 */
export function deliveryCharge(plan: Plan): { charge: boolean; pool: 'lead_gen' } {
  return { charge: plan === 'lead_gen', pool: 'lead_gen' }
}

/**
 * The wallet balance that caps how many leads may be delivered to a client, by
 * plan (item 167). FIGSY-plan clients deliver against the FIGSY pool (so a
 * FIGSY-only client with 0 lead-gen credits can still receive leads); lead-gen
 * clients deliver against the lead-gen balance.
 */
export function deliveryCapBalance(
  plan: Plan,
  creditBalance: number | null | undefined,
  figsyCredits: number | null | undefined,
): number {
  const pool = plan === 'figsy' ? (figsyCredits ?? 0) : (creditBalance ?? 0)
  return Math.max(0, pool)
}

/**
 * Whether a FIGSY lead may be enrolled into outreach given the FIGSY balance
 * (the enrollment-time gate — "1 credit = 1 enrolled", no free outreach).
 */
export function canEnroll(figsyCredits: number | null | undefined): boolean {
  return (figsyCredits ?? 0) >= 1
}
