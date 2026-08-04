// #613 — the settlement stamp and the reconcile verdict, proved.
//
// The thing that must not break: the client's money is credited BEFORE any of this runs, and
// nothing here may be able to stop that. The ordering test at the bottom is the one that
// matters — the format tests protect the future backfill, but the ordering test protects a
// payment.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  settlementNote, appendSettlement, majorUnits, reconcileVerdict,
} from './stripe-settlement'
import { stripCommentsForEnvScan } from './env-inventory'

// A real-shaped balance transaction: $299 paid in USD, settled into a GBP account.
const GBP_SETTLEMENT = {
  amount: 22262,      // £222.62 gross
  fee: 1043,          // £10.43
  net: 21219,         // £212.19 — what the bank actually receives
  currency: 'gbp',
  exchange_rate: 0.744548,
}

// ── RED PROOF ① — THE FORMAT IS PINNED ───────────────────────────────────────────────────
describe('settlementNote — the format a future backfill will parse', () => {
  it('renders gross, fee, net, payout currency and the FX rate', () => {
    expect(settlementNote(GBP_SETTLEMENT)).toBe(
      '[settled: gross £222.62 · stripe fee £10.43 · net £212.19 · payout currency GBP · fx 0.744548]',
    )
  })

  it('omits the FX rate when no conversion happened — rate 1 would imply one did', () => {
    const n = settlementNote({ amount: 29900, fee: 1001, net: 28899, currency: 'usd', exchange_rate: 1 })
    expect(n).toBe('[settled: gross $299.00 · stripe fee $10.01 · net $288.99 · payout currency USD]')
    expect(n).not.toContain('fx')
  })

  it('returns null rather than an empty annotation that looks like a measurement', () => {
    expect(settlementNote(null)).toBeNull()
    expect(settlementNote(undefined)).toBeNull()
    expect(settlementNote({ currency: 'gbp' })).toBeNull()          // no amounts
    expect(settlementNote({ amount: 100, fee: 1, net: 99 })).toBeNull()  // no currency
  })

  it('a zero-decimal currency is not divided by 100', () => {
    // ¥30,000 is ¥30,000, not ¥300. Getting this wrong understates by 100× in the one
    // direction nobody re-checks.
    expect(majorUnits(30000, 'jpy')).toBe(30000)
    expect(majorUnits(30000, 'JPY')).toBe(30000)
    expect(majorUnits(30000, 'usd')).toBe(300)
    expect(majorUnits(30000, null)).toBe(300)
  })

  it('a fee of zero still records — "no fee" is a fact, not a missing value', () => {
    expect(settlementNote({ amount: 1000, fee: 0, net: 1000, currency: 'usd' }))
      .toContain('stripe fee $0.00')
  })
})

describe('appendSettlement — idempotent, and never destroys the existing note', () => {
  const NOTE = '[settled: gross $10.00 · stripe fee $0.59 · net $9.41 · payout currency USD]'

  it('appends to what is already there', () => {
    expect(appendSettlement('Wallet top-up $299 via Stripe', NOTE))
      .toBe(`Wallet top-up $299 via Stripe ${NOTE}`)
  })

  it('a webhook retry does NOT double-stamp', () => {
    const once = appendSettlement('Wallet top-up', NOTE)
    expect(appendSettlement(once, NOTE)).toBe(once)
  })

  it('handles an empty or null note', () => {
    expect(appendSettlement(null, NOTE)).toBe(NOTE)
    expect(appendSettlement('  ', NOTE)).toBe(NOTE)
  })
})

// ── RED PROOF ③ — THE MISMATCH VERDICT FIRES ─────────────────────────────────────────────
describe('reconcileVerdict — a real discrepancy is found, an ordinary fee is not called one', () => {
  it('MISMATCH when the gross differs from what we recorded', () => {
    // A $299 row against a $199 charge — a discount applied in Stripe that the ledger never saw.
    const r = reconcileVerdict({ ledgerAmountUsd: 299, grossMajor: 199, netMajor: 192, settlementCurrency: 'usd' })
    expect(r.verdict).toBe('mismatch')
    expect(r.why).toContain('299.00')
    expect(r.why).toContain('199.00')
  })

  it('FEE_ONLY when the gross agrees and only the net is lower — the healthy state', () => {
    // If this ever rendered as a mismatch, every single row would be red and the column would
    // stop being read. That is the failure mode this verdict exists to avoid.
    const r = reconcileVerdict({ ledgerAmountUsd: 299, grossMajor: 299, netMajor: 288.99, settlementCurrency: 'usd' })
    expect(r.verdict).toBe('fee_only')
    expect(r.why).toContain('10.01')
  })

  it('FEE_ONLY for a converted payout — GBP cannot be compared to a USD ledger figure', () => {
    const r = reconcileVerdict({ ledgerAmountUsd: 299, grossMajor: 222.62, netMajor: 212.19, settlementCurrency: 'gbp' })
    expect(r.verdict).toBe('fee_only')
    expect(r.why).toContain('GBP')
  })

  it('MATCH when gross and net both agree', () => {
    expect(reconcileVerdict({ ledgerAmountUsd: 100, grossMajor: 100, netMajor: 100, settlementCurrency: 'usd' }).verdict).toBe('match')
  })

  it('UNKNOWN when Stripe returned nothing — never silently "match"', () => {
    const r = reconcileVerdict({ ledgerAmountUsd: 299, grossMajor: null, netMajor: null, settlementCurrency: null })
    expect(r.verdict).toBe('unknown')
    expect(r.why).toContain('NOT evidence')
  })

  it('UNKNOWN when the ledger row has no amount', () => {
    expect(reconcileVerdict({ ledgerAmountUsd: null, grossMajor: 299, netMajor: 288, settlementCurrency: 'usd' }).verdict).toBe('unknown')
  })

  it('a cent of float drift is not a discrepancy', () => {
    expect(reconcileVerdict({ ledgerAmountUsd: 299, grossMajor: 299.004, netMajor: 299.004, settlementCurrency: 'usd' }).verdict).toBe('match')
  })
})

// ── RED PROOF ② — THE MONEY IS CREDITED FIRST, ALWAYS ────────────────────────────────────
describe('the settlement read can never block a payment', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/stripe.ts'), 'utf8'))

  it('every annotate call sits AFTER its OWN path\'s ledger insert and error check', () => {
    // The property: by the time we ask Stripe anything, the client already has their money.
    // If this inverts, a Stripe outage becomes a failed payment.
    //
    // ⚠️ SCOPED PER PATH, and that is the whole test. The first version compared each call
    // against the index of the FIRST `credit_transactions.insert` anywhere in the file — so
    // moving a stamp above its own insert still left it "after" an unrelated earlier one, and
    // the red proof stayed green. Third time this repo has been bitten by an index comparison
    // that was not bounded by the thing it was asserting about (#612 twice, now this).
    //
    // Each call is checked against the window since the PREVIOUS call (or the branch start),
    // so a stamp that jumps above its own insert leaves a window with no `if (ledgerErr)` in it.
    const calls: number[] = []
    let from = 0
    for (;;) {
      const i = src.indexOf('await annotateSettlement(', from)
      if (i === -1) break
      calls.push(i); from = i + 10
    }
    expect(calls, 'both payment paths stamp').toHaveLength(2)

    const branchStart = src.indexOf("event.type === 'checkout.session.completed'")
    expect(branchStart).toBeGreaterThan(-1)

    let windowStart = branchStart
    for (const c of calls) {
      const window = src.slice(windowStart, c)
      expect(window, 'a ledger insert and its error check must precede this stamp in the same path')
        .toContain('if (ledgerErr)')
      windowStart = c
    }
  })

  it('the annotator swallows its own failures rather than throwing', () => {
    const lib = stripCommentsForEnvScan(readFileSync(join(__dirname, './stripe.ts'), 'utf8'))
    const fn = lib.slice(lib.indexOf('export async function annotateSettlement'))
    const body = fn.slice(0, fn.indexOf('export async function listRecentSettlements'))
    expect(body).toContain('catch')
    expect(body).not.toContain('throw ')
  })

  it('readSettlement returns null on failure instead of rejecting', () => {
    const lib = stripCommentsForEnvScan(readFileSync(join(__dirname, './stripe.ts'), 'utf8'))
    const fn = lib.slice(lib.indexOf('export async function readSettlement'))
    const body = fn.slice(0, fn.indexOf('export async function annotateSettlement'))
    expect(body).toContain('return null')
    expect(body).toContain('catch')
  })

  it('the reconcile route refuses to render a failed read as reconciled', () => {
    const op = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8'))
    const i = op.indexOf("operatorRouter.get('/revenue/reconcile'")
    expect(i).toBeGreaterThan(-1)
    const route = op.slice(i, op.indexOf('operatorRouter.', i + 20))
    expect(route).toContain('503')
    expect(route).toContain('could not look')
  })
})
