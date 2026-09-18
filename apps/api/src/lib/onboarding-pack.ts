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

// #563 — RE-EXPORTED, NOT REDECLARED. These three now live in `@kind/shared` so the CLIENT can
// read them too: the portal cannot import from `apps/api`, so every client-facing sentence about
// the money was hand-typed, and that is how the $99 starter card came to say "Fund your wallet.
// Each approved lead is a flat $4" — both halves false after #562. One source, no drift.
import { PACK_LEADS, PACK_PRICE_USD, LEAD_PRICE_USD } from '@kind/shared'
export { PACK_LEADS, PACK_PRICE_USD, LEAD_PRICE_USD }
/** How many people we source to let them approve PACK_LEADS — they pass on roughly half. */
export const PACK_SOURCE_TARGET = PACK_LEADS * 2

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

// ── #619 — ENTITLED IS NOT THE SAME SENTENCE AS "PAID US $299" ────────────────────────────
//
// The two lists above already say a comp is not a purchase. What was missing is the surface:
// Vida's client board ticked **"Paid $299 ✓"** on the house account, which has never paid us
// anything — it holds a `manual_grant`, which is inside `PAID_TX_TYPES` on purpose, because it
// is ENTITLED. The board read entitlement and printed a payment. The founder caught it on the
// live site, and it is the same class as #613: a money surface must never round up.
//
// This function exists so the distinction is made ONCE and provably, rather than inlined at
// each surface — which is how the six inlined copies above came to disagree in the first place.

export type FundedVia = 'real' | 'comp' | null

/**
 * How was this client funded — real money, a comp, or not at all?
 *
 * `'real'` requires BOTH a purchase type AND a provider reference, which is the rule the wipe
 * guard already applies to decide whether an account has real money in it (`operator.ts`:
 * *"a purchase-type ledger row carrying a provider reference is real money"*). Stripe always
 * writes one (`reference: session.id`), so a purchase row without a reference is a hand-made
 * row, not a payment we can evidence.
 *
 * ⚠️ AMBIGUITY RESOLVES DOWNWARD, DELIBERATELY. A funded client we cannot prove paid us reads
 * as `'comp'`, never `'real'`. Understating what came in is a correctable annoyance; the board
 * claiming money that never arrived is the exact failure this was built to end.
 *
 * Takes the client's ledger rows so it stays pure — no database, no client id, nothing to mock.
 */
export function fundedVia(
  rows: ReadonlyArray<{ type?: unknown; reference?: unknown }> | null | undefined,
): FundedVia {
  let funded = false
  for (const r of rows ?? []) {
    const type = typeof r?.type === 'string' ? r.type : ''
    if (!PAID_TX_TYPES.includes(type)) continue          // usage/charges/bonuses are not funding
    funded = true
    const ref = r?.reference
    const hasReference = ref !== null && ref !== undefined && String(ref).trim() !== ''
    if (PURCHASE_TX_TYPES.includes(type) && hasReference) return 'real'
  }
  return funded ? 'comp' : null
}

// ── #623 — "$ IN" MEANS CASH RECEIVED, AND IT MUST BE COUNTED, NOT CALCULATED ──────────────
//
// Found by the founder's own money walk (A9 Walk 1, 5 Aug): he approved two leads and asked why
// Vida did not show $8 more earned. It did not, and it was right not to — both contacts were
// already paid for under **#424 charge-once**, so no money moved. But the board's *"$ in"* was
// computed as `PACK_PRICE_USD + (approved − 100) × LEAD_PRICE_USD` — **arithmetic on the
// approval COUNT** — so on any client with a repeat contact it prints cash that never arrived.
//
// That is #619's failure pointing the other way: #619 was a comped account claiming a payment;
// this is a real client's board inflating what they paid us. The engine was never wrong — the
// wallet, the pack counter and the charge are all honest. Only the DISPLAY did sums.
//
// ⚠️ NET OF REFUNDS, AND THAT IS NOT WHAT THE BRIEF ASKED FOR. Refunds are written as
// `type: 'refund'` with a NEGATIVE amount (`routes/stripe.ts`), which sits outside
// PURCHASE_TX_TYPES. Summing purchases alone would leave a fully-refunded client still reading
// "$299 in" — the exact overstatement this function exists to end, one step down the road. So a
// referenced refund subtracts. "Cash received" means what we actually kept.
//
// ⚠️ NOT CLAMPED AT ZERO. If refunds ever exceed purchases the figure goes negative, and it
// should: that is a real anomaly (a double claw-back) and hiding it behind `Math.max(0, …)`
// would be this same bug a third time, in the direction of looking tidy.

/** Refund rows carry a negative amount and a `refund_<id>` reference. Not a purchase type. */
const REFUND_TX_TYPE = 'refund'

/** Every type `moneyInUsd` needs to see. Wider than PAID_TX_TYPES — it must fetch refunds too. */
export const CASH_TX_TYPES: string[] = [...PAID_TX_TYPES, REFUND_TX_TYPE]

/**
 * NET CASH RECEIVED from this client, in dollars.
 *
 * Counted off the ledger, never derived from approval counts. Only rows that EVIDENCE money
 * moving count — a purchase type (or a refund) carrying a provider reference, the same test
 * `fundedVia` above and the wipe guard already apply.
 *
 * Deliberately excluded, each for its own reason:
 *   • `manual_grant` — a comp. Entitles work; no cash arrived.
 *   • `usage` $0      — a pack-covered approval. Already paid for by the $299.
 *   • `wallet_charge` — the client spending money they already loaded. Not new cash.
 *   • unreferenced purchase rows — hand-made, not evidenced (ambiguity resolves downward).
 *
 * Pure, so the figure is provable without a database — and it lives beside `fundedVia` so the
 * two cannot drift apart while reading the same rows.
 */
export function moneyInUsd(
  rows: ReadonlyArray<{ type?: unknown; reference?: unknown; amount?: unknown }> | null | undefined,
): number {
  let total = 0
  for (const r of rows ?? []) {
    const type = typeof r?.type === 'string' ? r.type : ''
    if (!PURCHASE_TX_TYPES.includes(type) && type !== REFUND_TX_TYPE) continue
    const ref = r?.reference
    if (ref === null || ref === undefined || String(ref).trim() === '') continue
    const amount = Number(r?.amount)
    if (!Number.isFinite(amount)) continue
    total += amount
  }
  // Round to cents — floating-point addition of money must not surface as $338.99999999.
  return Math.round(total * 100) / 100
}

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
 * How many people to source, given how many are still WAITING FOR A DECISION on the
 * client's desk.
 *
 * THE ARGUMENT USED TO BE "everyone we have ever sent them", and that made it a **lifetime
 * cap of 200 leads per client**. The model is: $99 once for 100 included, then top-ups in
 * bundles at $4 a lead. So a client works through their desk — approves 100, passes the
 * rest — then tops up $200 to approve fifty more... and this returned 0, because they had
 * "already had" 200. They had paid and there was **nobody left to approve**. Sourcing simply
 * stopped for that client, permanently, with no error.
 *
 * Counting only the UNDECIDED keeps the desk stocked instead: work through it and we top it
 * back up. An approved or passed lead is finished business and must not hold a slot open
 * against them forever.
 *
 * Over-sourcing is not the risk this function guards. `try_spend_sourcing` is — the client's
 * pre-funded allowance (2 records per $1 they have paid), the per-client daily record cap and
 * the global monthly ceiling. Those decide what we may SPEND. This only decides what to ASK
 * for, and asking for people we cannot afford is refused there, not here.
 */
export function sourceTarget(awaitingDecision: number): number {
  return Math.max(0, PACK_SOURCE_TARGET - Math.max(0, Math.floor(awaitingDecision)))
}

/**
 * What the client sees in Milla. Plain words — never a raw number on its own.
 *
 * ⚠️ THE PRICE AND THE COUNT ARE INTERPOLATED FROM THE CONSTANTS, NOT TYPED. This line read
 * `'Load $99 to start — 100 leads included'` with both numbers hand-typed, so the 3-Aug move
 * to $299 would have left the one sentence a client reads before paying quoting the old
 * price — the exact failure #563 records, in the exact file that records it.
 */
export function packLabel(s: PackState): string {
  if (!s.active) return `Load $${PACK_PRICE_USD} to start — ${PACK_LEADS} leads included`
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

// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C7 (LR 21) · READING THE FUNDING STATE, WITH NO WAY TO DROP THE ERROR
//
// `fundedVia` above is PURE: give it rows, it tells you how the client is funded. The defect
// was never in it — it was in the three callers that fetched those rows like this:
//
//     const { data: fundingRows } = await db.from('credit_transactions')…
//     if (fundedVia(fundingRows ?? []) !== null) { …they are live… }
//
// The `error` was destructured away at all three (`routes/icps.ts` at the Proof route, the
// `proofMode` branch, and `proofRefinementVerdict`). supabase-js answers a failed read with
// `{ data: null, error }`, so one blip made the rows null, `fundedVia([])` answered "not
// funded", and a client who may be live and paying had a free Proof pass spent on them.
//
// 🛑 SO THE FETCH LIVES HERE AND RETURNS A VERDICT THAT CANNOT BE MISREAD. There is no `data`
// on the failure branch to accidentally use: an unreadable funding state is `ok: false`, and a
// caller that ignores it gets a type error rather than a silent "not funded". Three call sites
// that each had to remember the rule became one that enforces it.
// ══════════════════════════════════════════════════════════════════════════════════════════
export type FundingRead =
  | { ok: true; funded: FundedVia }
  | { ok: false; detail: string }

export async function readFundingState(clientId: string): Promise<FundingRead> {
  const { db } = await import('@kind/db')
  try {
    const { data, error } = await db.from('credit_transactions')
      .select('type, reference').eq('client_id', clientId)
    if (error) return { ok: false, detail: error.message ?? String(error) }
    return { ok: true, funded: fundedVia((data ?? []) as Array<{ type?: unknown; reference?: unknown }>) }
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) }
  }
}
