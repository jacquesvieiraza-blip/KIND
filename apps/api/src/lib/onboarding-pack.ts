// THE $99 ONBOARDING PACK — 100 approvals included, then $4 a lead.
//
// Founder-locked 25 Jul. Deliberately a QUOTA, not a wallet trick: the alternative was
// crediting $499 for a $99 payment so that "$4 a lead" happened to reach 100, which meant a
// wallet balance that was mostly fiction and a revenue figure you couldn't trust. A count is
// something a client can read — "72 of your 100 left" — and something we can reason about.
//
// No new columns. Everything here is derived from rows that already exist:
//   • has the client bought the pack?  → a purchase row in credit_transactions
//   • how many have they used?         → leads with revealed_at set (an approval reveals)
//
// Cost basis behind the number (docs/run-costs-and-cashflow.md §1): 200 records sourced at
// $0.28 = $56 · working the 100 they approve ≈ $6 · Stripe $3.17 · first month of their
// inbox $4.50 ≈ $70, leaving ~$29 on the $99.

/** Approvals included in the first purchase. */
export const PACK_LEADS = 100
/** What the pack costs the client. */
export const PACK_PRICE_USD = 99
/** How many people we source to let them approve PACK_LEADS — they pass on roughly half. */
export const PACK_SOURCE_TARGET = 200
/** Flat price per approved lead once the pack is used up. */
export const LEAD_PRICE_USD = 4

/**
 * REAL MONEY IN — a client actually paid us. Drives revenue counting and the
 * "first purchase must be $99" rule. A comp is not a purchase.
 */
export const PURCHASE_TX_TYPES: string[] = ['wallet_topup', 'purchase', 'credit_purchase']

/**
 * ENTITLED — this client is unlocked: we may spend on sourcing for them, and they hold the
 * 100-lead pack. That is the $99 OR a manual grant, because a manual grant is exactly how we
 * comp a client or open a walkthrough account.
 *
 * These two lists were previously inlined in six places and one of them disagreed: the Vida
 * worklist counted `manual_grant` as paid while every money path did not, so a comped client
 * showed as funded on the operator's board and then got a 402 the moment anyone tried to
 * source for them. One definition, two named meanings.
 */
export const PAID_TX_TYPES: string[] = [...PURCHASE_TX_TYPES, 'manual_grant']

export type PackState = {
  /** They've bought the pack. */
  active: boolean
  included: number
  used: number
  /** Approvals still free. 0 once the pack is spent. */
  left: number
  /** What THIS approval costs the client right now. */
  nextLeadCostUsd: number
}

/**
 * Where is this client against their pack?
 *
 * `approvedCount` is every lead they have ever approved — the pack is the FIRST 100 of those,
 * so a client who has approved 140 has used the pack and pays $4 from 101 onwards.
 */
export function packState(hasPurchased: boolean, approvedCount: number): PackState {
  if (!hasPurchased) {
    // No purchase, no pack, and no work: the $99 is what starts everything.
    return { active: false, included: 0, used: 0, left: 0, nextLeadCostUsd: LEAD_PRICE_USD }
  }
  const used = Math.max(0, Math.min(PACK_LEADS, Math.floor(approvedCount)))
  const left = PACK_LEADS - used
  return {
    active: true,
    included: PACK_LEADS,
    used,
    left,
    nextLeadCostUsd: left > 0 ? 0 : LEAD_PRICE_USD,
  }
}

/**
 * How many people to source for a client, given what they already have.
 *
 * Tops back up to PACK_SOURCE_TARGET rather than adding a fixed batch, so repeated runs can't
 * quietly buy the same 200 twice — the cost of over-sourcing lands on us, not the client.
 */
export function sourceTarget(alreadySourced: number): number {
  return Math.max(0, PACK_SOURCE_TARGET - Math.max(0, Math.floor(alreadySourced)))
}

/** What the client sees in Milla. Plain words — never a raw number on its own. */
export function packLabel(s: PackState): string {
  if (!s.active) return 'Load $99 to start — 100 leads included'
  if (s.left === 0) return `Pack used · $${LEAD_PRICE_USD} per approved lead from here`
  return `${s.left} of your ${s.included} included leads left`
}

/**
 * How many records a sourcing run should ASK for.
 *
 * `leads_per_run` is the client's own preference for a self-serve run — the default when
 * nobody said how many. It is NOT a ceiling on an explicit request.
 *
 * It used to be `Math.min(maxLeads, leadsPerRun ?? 20)`, which silently capped every
 * managed run at 20: the $99 asks for 200 so the client can pass on half and still approve
 * 100, and got 20 — a desk with no choice on it, against a pack promising a hundred.
 * Nothing surfaced it, because 20 is a plausible number to see, and `leads_per_run` has no
 * UI in Vida at all, so it sat at its default with no way to raise it.
 *
 * Spend is unaffected: try_spend_sourcing still enforces the client's pre-funded allowance,
 * the per-client daily record cap and the global monthly ceiling. This decides what we ASK
 * for, never what we may spend.
 */
export function sourcingTarget(
  requested: number | undefined,
  leadsPerRun: number | null | undefined,
): number {
  if (requested !== undefined && Number.isFinite(requested)) return Math.max(0, Math.floor(requested))
  const pref = Number(leadsPerRun)
  return Number.isFinite(pref) && pref > 0 ? Math.floor(pref) : 20
}
