// ─────────────────────────────────────────────────────────────────────────────
// Pure billing rules — the SINGLE SOURCE of "which wallet, and how much".
//
// No DB, no side-effects → fully unit-testable. The money-path code
// (lead-delivery.ts, icps.ts, internal.ts drip, figsy.ts enrollment) calls these
// so the lead-gen + FIGSY double-charge (item 166) can never silently come back.
//
// The model (founder-locked 8 Jul — per-qualified-lead, two charges #420):
//   • DELIVERY is FREE — leads arrive MASKED (name/company/title/score visible,
//     email + phone hidden). Browsing costs nothing, so the client can dedup
//     against their own CRM before spending anything.
//   • REVEAL = $1 — when the client unmasks a lead they don't already own, $1 is
//     charged from credit_balance (try_charge_reveal_credit). Once per lead, ever.
//   • ENROLL (FIGSY work) = $3 — from figsy_credits_remaining at enrollment
//     (try_charge_figsy_credit). A fully-worked lead = $1 reveal + $3 work = $4.
// ─────────────────────────────────────────────────────────────────────────────

export type Plan = 'lead_gen' | 'figsy'

/** Normalise a possibly-missing/garbage plan value to the safe default. */
export function normalizePlan(plan: string | null | undefined): Plan {
  return plan === 'figsy' ? 'figsy' : 'lead_gen'
}

/**
 * The delivery-time charge decision. In the per-qualified-lead model (#420),
 * delivery is ALWAYS free — leads arrive masked and the $1 is taken at REVEAL,
 * not delivery. Kept as a function (not inlined) so the "delivery never charges"
 * invariant is guarded by a test and can never silently regress.
 */
export function deliveryCharge(_plan: Plan): { charge: boolean; pool: 'lead_gen' } {
  return { charge: false, pool: 'lead_gen' }
}

/**
 * The reveal-time charge (#420/#421). Unmasking a lead costs $1 from the reveal
 * wallet (credit_balance), regardless of plan. Charged at most once per lead
 * (gated by leads.revealed_at + the unique reveal ledger row).
 */
export function revealCharge(): { charge: boolean; pool: 'lead_gen'; amount: number } {
  return { charge: true, pool: 'lead_gen', amount: 1 }
}

/** Whether a client can afford to reveal at least one lead (the $1 reveal gate). */
export function canReveal(creditBalance: number | null | undefined): boolean {
  return (creditBalance ?? 0) >= 1
}

/**
 * How many masked leads may be delivered (made browsable) to a client per drip.
 * Delivery is FREE now (#420), so this is NO LONGER wallet-gated — a $0 / trial
 * client must still be able to browse masked leads and choose which to reveal.
 * Instead it's a flat daily browse allowance that bounds sourcing/enrichment cost
 * (the #423-lite throttle until per-client sourcing quotas land). Wallet params
 * are kept in the signature for call-site compatibility but no longer gate.
 */
export const DAILY_BROWSE_CAP = 25

export function deliveryCapBalance(
  _plan: Plan,
  _creditBalance: number | null | undefined,
  _figsyCredits: number | null | undefined,
): number {
  return DAILY_BROWSE_CAP
}

/**
 * Whether a FIGSY lead may be enrolled into outreach given the FIGSY balance
 * (the enrollment-time gate — "1 credit = 1 enrolled", no free outreach).
 */
export function canEnroll(figsyCredits: number | null | undefined): boolean {
  return (figsyCredits ?? 0) >= 1
}

// ── #424 charge-once — reveal is charged ONCE PER (client, email) EVER ─────────
// The per-email idempotency is enforced in Postgres (client_reveals PK +
// record_reveal_or_refund / reveal_is_owned RPCs). These two pure helpers are the
// TS side of that contract — the ledger key, and how the RPC outcome maps to
// "did the client net a charge" — shared by every reveal call site so the key is
// normalised identically everywhere (a mismatch would silently double-charge).

// The reveal-ledger key: lowercased, trimmed email. Null/blank → no key (can't
// dedupe — treated as a fresh reveal, charge stands).
export function normalizeRevealEmail(email: string | null | undefined): string | null {
  if (!email) return null
  const e = String(email).trim().toLowerCase()
  return e.length > 0 ? e : null
}

// record_reveal_or_refund returns 'charged' (first time — the $1 stands) or
// 'refunded' (already owned — the $1 was returned). The client nets a charge only
// when the outcome is NOT a refund.
export function revealCharged(outcome: string | null | undefined): boolean {
  return outcome !== 'refunded'
}
