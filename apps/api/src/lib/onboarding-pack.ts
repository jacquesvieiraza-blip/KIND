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
 * Does this approval need the $4, or is it covered by the pack?
 *
 * The single question the approve path asks. Kept separate from `packState` so the money path
 * reads as one boolean rather than digging through a shape.
 */
export function approvalIsFree(hasPurchased: boolean, approvedCount: number): boolean {
  return packState(hasPurchased, approvedCount).left > 0
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
