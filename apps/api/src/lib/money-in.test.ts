// #623 — "$ IN" MEANS CASH RECEIVED, AND IT MUST BE COUNTED, NOT CALCULATED.
//
// FOUND BY THE FOUNDER'S OWN MONEY WALK (A9 Walk 1, 5 Aug). He approved two leads on Client
// Zero and asked why the board did not show $8 more earned. It did not — and it was RIGHT not
// to: both contacts were already paid for under #424 charge-once, so no money moved. The
// wallet, the pack counter and the charge were all honest.
//
// But the board's *"$ in"* was `PACK_PRICE_USD + (approved − 100) × LEAD_PRICE_USD` —
// **arithmetic on the approval COUNT**. On any client with a repeat contact that prints cash
// that never arrived. It is #619's failure pointing the other way: #619 was a comped account
// claiming a payment; this is a real client's board inflating what they paid us.
//
// ⚠️ THE REFUND CASE IS THE ONE THE BRIEF DID NOT ASK FOR. Refunds are `type: 'refund'` with a
// NEGATIVE amount, outside PURCHASE_TX_TYPES — so summing purchases alone would leave a fully
// refunded client still reading "$299 in". That is the same overstatement, one step down the
// road, which is why a referenced refund subtracts and why the route had to widen its query.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { moneyInUsd, CASH_TX_TYPES, PAID_TX_TYPES, PURCHASE_TX_TYPES, fundedVia } from './onboarding-pack'
import { stripCommentsForEnvScan } from './env-inventory'

const PACK = { type: 'wallet_topup', reference: 'cs_test_pack', amount: 299 }
const TOPUP = { type: 'wallet_topup', reference: 'cs_test_topup', amount: 40 }

describe('moneyInUsd — cash received, counted off the ledger', () => {
  it('sums referenced purchases: the $299 pack plus a $40 top-up = $339', () => {
    expect(moneyInUsd([PACK, TOPUP])).toBe(339)
  })

  it('THE WALK THAT FOUND THIS — pack-covered and charge-once approvals move it by nothing', () => {
    // Two free approvals: one covered by the pack ($0 usage row), one a #424 charge-once
    // re-approve (no row at all). The old arithmetic added $8 for these. The ledger adds $0.
    const withFreeApprovals = [
      PACK, TOPUP,
      { type: 'usage', reference: 'pack_lead-1', amount: 0 },
      { type: 'usage', reference: 'pack_lead-2', amount: 0 },
    ]
    expect(moneyInUsd(withFreeApprovals)).toBe(339)
  })

  it('a client SPENDING their own wallet is not new cash', () => {
    // wallet_charge is money they already gave us moving inside the account. Counting it would
    // book the same dollar twice.
    expect(moneyInUsd([PACK, { type: 'wallet_charge', reference: 'lead:abc', amount: -4 }])).toBe(299)
  })

  it('a COMP is never cash — the #619 case, independently agreed', () => {
    const comped = [{ type: 'manual_grant', reference: null, amount: 4000 }]
    expect(moneyInUsd(comped)).toBe(0)
    // The two functions must agree without being wired to each other: a comp reads $0 in AND
    // 'comp'. If they ever disagree the board says "comped" next to a cash figure.
    expect(fundedVia(comped)).toBe('comp')
  })

  it('an empty or missing ledger is $0, not NaN', () => {
    expect(moneyInUsd([])).toBe(0)
    expect(moneyInUsd(null)).toBe(0)
    expect(moneyInUsd(undefined)).toBe(0)
  })

  it('an unreferenced purchase row does NOT count — ambiguity resolves downward', () => {
    // Stripe always writes a reference, so a purchase row without one is hand-made and not
    // evidenced. Same direction as fundedVia: never claim money we cannot prove arrived.
    expect(moneyInUsd([{ type: 'wallet_topup', reference: null, amount: 299 }])).toBe(0)
    expect(moneyInUsd([{ type: 'wallet_topup', reference: '   ', amount: 299 }])).toBe(0)
  })

  it('a REFUND subtracts — a refunded client must not still read $299 in', () => {
    const refunded = [PACK, { type: 'refund', reference: 'refund_ch_1', amount: -299 }]
    expect(moneyInUsd(refunded)).toBe(0)
  })

  it('a PARTIAL refund leaves the remainder', () => {
    expect(moneyInUsd([PACK, TOPUP, { type: 'refund', reference: 'refund_ch_2', amount: -40 }])).toBe(299)
  })

  it('an over-refund goes NEGATIVE rather than clamping — that anomaly must stay visible', () => {
    // Math.max(0, …) here would be this same bug a third time, in the direction of looking tidy.
    expect(moneyInUsd([PACK, { type: 'refund', reference: 'r1', amount: -299 }, { type: 'refund', reference: 'r2', amount: -299 }])).toBe(-299)
  })

  it('money is rounded to cents — no $338.99999999 on a money surface', () => {
    expect(moneyInUsd([
      { type: 'wallet_topup', reference: 'a', amount: 0.1 },
      { type: 'wallet_topup', reference: 'b', amount: 0.2 },
    ])).toBe(0.3)
  })

  it('a non-numeric amount is skipped, never NaN-poisoning the whole figure', () => {
    expect(moneyInUsd([PACK, { type: 'wallet_topup', reference: 'x', amount: 'oops' }])).toBe(299)
  })

  it('CASH_TX_TYPES is wider than PAID_TX_TYPES by exactly the refund type', () => {
    // If the query filter ever narrowed back to PAID_TX_TYPES, refunds would stop being
    // fetched and a refunded client would silently read the full original figure again.
    expect(CASH_TX_TYPES).toContain('refund')
    for (const t of PAID_TX_TYPES) expect(CASH_TX_TYPES).toContain(t)
    expect(PURCHASE_TX_TYPES).not.toContain('refund')
  })
})

// ── THE WIRING — a figure nothing serves is not a fix ──────────────────────────────────────
describe('the worklist route serves it', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8'))
  const route = src.slice(src.indexOf("operatorRouter.get('/worklist'"))
  const body = route.slice(0, route.indexOf('operatorRouter.', 20))

  it('was found', () => { expect(body.length).toBeGreaterThan(500) })

  it('serves money_in_usd from the pure function', () => {
    expect(body).toContain('moneyInUsd(')
    expect(body).toContain('money_in_usd:')
  })

  it('fetches the refund rows — a narrowed filter silently re-breaks the refund case', () => {
    expect(body).toContain('CASH_TX_TYPES')
    expect(body).toContain('amount')
  })

  it('LEAVES hasFunded MEANING WHAT IT MEANT — a refund row must not read as funding', () => {
    // The query now returns refund rows too. Without the predicate, `paidN` would count them
    // and `hasFunded` (which gates client-step) would start answering a different question.
    expect(body).toContain('PAID_TX_TYPES.includes(String(r.type')
  })
})

describe('Vida renders the counted figure, not a sum', () => {
  const src = stripCommentsForEnvScan(
    readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8'))

  it('the count arithmetic is GONE from the money line', () => {
    // Bounded to the "$ in" line rather than the whole file: the constant is still legitimately
    // used by the flow rail and the chase message, so a file-wide assertion would be wrong.
    const at = src.indexOf('</b> in{selectedWork.funded_via')
    expect(at, 'the "$ in" line must exist').toBeGreaterThan(-1)
    const line = src.slice(Math.max(0, at - 400), at)
    expect(line).not.toContain('PACK_PRICE_USD + Math.max(')
    expect(line).not.toContain('LEAD_PRICE_USD')
    expect(line).toContain('money_in_usd')
  })

  it('still shows the #619 comped suffix — this fix must not undo that one', () => {
    expect(src).toContain("funded_via === 'comp' &&")
    expect(src).toContain('· comped')
  })
})
