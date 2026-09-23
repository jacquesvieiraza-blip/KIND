// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 R136 ④ (SPEND) — SPENDING THE CREDIT, AND THE DOUBLE COUNT IT WOULD OTHERWISE CAUSE
//
// Founder-ruled 23 Sep, three answers that shape all of this:
//   Q1 which payment may a credit reduce?  → **P1 only**
//   Q2 may it cover a payment in full?     → **No**
//   Q3 does commission follow cash rather than price? → **yes**
//
// ── THE FAILURE THIS FILE EXISTS FOR, BECAUSE IT IS SILENT ──────────────────────────────
//
// `computeContribution` reads revenue off the programme ROW — `first_payment_cents` — which is
// what was OWED. Until a wallet credit could be spent, that was also what ARRIVED, so the
// distinction never mattered. Once it can:
//
//   Programme 1 credits $1,312 back → its own revenue correctly drops by $1,312.
//   Programme 2 is part-paid with that $1,312 → its revenue reads the FULL price.
//
// The same cents are revenue twice. Nothing throws, the screens look right, and PARTNER
// COMMISSION is 25% of contribution (R78) — so a partner is paid on money that never came in.
// That is R68's shape: one number living in two places and moving in only one of them.
//
// ── AND THE ORDER OF THE DRAW IS THE OTHER HALF ─────────────────────────────────────────
//
// `increment_wallet` is not idempotent. Drawing at CHECKOUT CREATION spends the credit of a
// client who then abandons the page; drawing on a LOST claim spends it twice for one payment.
// Both are asserted below, in both directions.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'

type Row = Record<string, unknown>

const state: {
  programmes: Row[]; clients: Row[]; credit_transactions: Row[]; alerts: string[]
  wallet: Record<string, number>
  drawFails: boolean
  /** Simulates another delivery winning the claim first. */
  stealClaim: boolean
} = {
  programmes: [], clients: [], credit_transactions: [], alerts: [], wallet: {},
  drawFails: false, stealClaim: false,
}

function makeTable(name: 'programmes' | 'clients' | 'credit_transactions') {
  const rows = () => state[name]
  const q = {
    _filters: [] as Array<(r: Row) => boolean>,
    _payload: null as Row | null,
    _mode: '' as '' | 'update' | 'insert' | 'select',
    select() { if (this._mode === '') this._mode = 'select'; return this },
    eq(col: string, val: unknown) { this._filters.push(r => r[col] === val); return this },
    is(col: string, val: unknown) { this._filters.push(r => (r[col] ?? null) === val); return this },
    order() { return this }, limit() { return this },
    insert(p: Row) { this._mode = 'insert'; this._payload = p; return this },
    update(p: Row) { this._mode = 'update'; this._payload = p; return this },
    _matched() { return rows().filter(r => this._filters.every(f => f(r))) },
    async maybeSingle() { return { data: this._matched()[0] ?? null, error: null } },
    async single() { return this._mode === 'insert' ? this._run() : { data: this._matched()[0] ?? null, error: null } },
    _run(): { data: unknown; error: unknown } {
      if (this._mode === 'insert') {
        const row = { id: `id-${rows().length + 1}`, ...(this._payload as Row) }
        rows().push(row); return { data: row, error: null }
      }
      // 🛑 THE CLAIM BEING STOLEN. `stealClaim` makes the compare-and-set match nothing, which
      // is exactly what a concurrent delivery does.
      const hit = state.stealClaim && name === 'programmes' && this._payload?.first_payment_ref
        ? [] : this._matched()
      for (const r of hit) Object.assign(r, this._payload)
      return { data: hit, error: null }
    },
    then(res: (v: { data: unknown; error: unknown }) => unknown) {
      return Promise.resolve(this._run()).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => makeTable(
      t === 'clients' ? 'clients' : t === 'credit_transactions' ? 'credit_transactions' : 'programmes'),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'increment_wallet') {
        if (state.drawFails) return { data: null, error: { message: 'wallet unavailable' } }
        const id = String(args.p_client_id)
        const next = (state.wallet[id] ?? 0) + Number(args.p_amount)
        state.wallet[id] = next
        const c = state.clients.find(x => x.id === id)
        if (c) c.wallet_balance_usd = next
        return { data: null, error: null }
      }
      return { data: null, error: null }
    },
  },
}))

vi.mock('./programme-preparation', () => ({
  prepareProgrammeOutreach: async () => ({ ok: true, complete: true, remaining: 0, total: 0, campaigns: [], enrolled: [], alreadyEnrolled: 0, skipped: 0, failed: [], problems: [] }),
  assertGoingLive: async () => ({ ok: true }),
  verifyProgrammeFulfilment: async () => ({ ok: true }),
}))

vi.mock('./alerts', () => ({
  sendFounderAlert: (_k: string, subject: string) => { state.alerts.push(subject); return Promise.resolve() },
}))

import { recordFirstPayment, computeContribution } from './programme'
import {
  walletCreditForPayment, MIN_CASH_PAYMENT_CENTS, programmeStripeAmountCents, programmeTotalCents,
} from '@kind/shared'

const P1_OWED = programmeStripeAmountCents(10, 'programme_first')

function seed(over: Row = {}, balanceUsd = 0): Row {
  const total = programmeTotalCents(10)
  state.clients.push({ id: 'client-1', wallet_balance_usd: balanceUsd })
  state.wallet['client-1'] = balanceUsd
  const p: Row = {
    id: 'prog-1', client_id: 'client-1', status: 'AWAITING_FIRST_PAYMENT',
    meeting_target: 10, recommended_volume: 2_500,
    price_total_cents: total,
    first_payment_cents: Math.floor(total / 2), second_payment_cents: total - Math.floor(total / 2),
    first_payment_ref: null, second_payment_ref: null,
    first_payment_intent_id: null, second_payment_intent_id: null,
    first_paid_at: null, second_paid_at: null,
    first_authorised_at: null, second_authorised_at: null,
    sourcing_ceiling: 0, sourced_used: 0, sourced_reserved: 0,
    make_whole_cents: 0, wallet_applied_cents: 0, value_settled_at: null,
    contribution_cents: null, contribution_finalised_at: null, disputed_at: null,
    ...over,
  }
  state.programmes.push(p)
  return p
}

const prog = () => state.programmes[0]
const wallet = () => state.wallet['client-1'] ?? 0

beforeEach(() => {
  state.programmes = []; state.clients = []; state.credit_transactions = []
  state.alerts = []; state.wallet = {}; state.drawFails = false; state.stealClaim = false
})

describe('🛑 Q2 — a credit may never cover a payment in full', () => {
  it('a large balance is capped so cash always goes through Stripe', () => {
    const credit = walletCreditForPayment(9_999_999, P1_OWED)
    expect(credit).toBe(P1_OWED - MIN_CASH_PAYMENT_CENTS)
    expect(P1_OWED - credit, 'nothing was left for Stripe to charge').toBeGreaterThanOrEqual(MIN_CASH_PAYMENT_CENTS)
  })

  it('🛑 THE REMAINDER IS ALWAYS AN AMOUNT STRIPE WILL ACCEPT', () => {
    // Stripe rejects a zero-amount checkout, and its own USD minimum is about $0.50.
    for (const bal of [0, 1, 100, 50_000, 218_749, 218_750, 5_000_000]) {
      expect(P1_OWED - walletCreditForPayment(bal, P1_OWED)).toBeGreaterThanOrEqual(50)
    }
  })

  it('a balance smaller than the payment is applied whole', () => {
    expect(walletCreditForPayment(50_000, P1_OWED)).toBe(50_000)
  })

  it('a payment too small to split takes no credit at all', () => {
    expect(walletCreditForPayment(9_999, MIN_CASH_PAYMENT_CENTS)).toBe(0)
    expect(walletCreditForPayment(9_999, 1)).toBe(0)
  })

  it('nonsense in produces zero, never a negative discount', () => {
    for (const bad of [Number.NaN, -1, Infinity]) {
      expect(walletCreditForPayment(bad, P1_OWED)).toBeGreaterThanOrEqual(0)
      expect(walletCreditForPayment(9_999, bad)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('🛑 Q3 — revenue is cash received, not price owed', () => {
  it('🛑 THE DOUBLE COUNT: a wallet-funded P1 does NOT report the full price as revenue', async () => {
    // The whole reason this slice needed a schema change. Without `wallet_applied_cents` in the
    // sum, the credited cents are revenue on the programme that gave them back AND on the one
    // that spent them — and a partner is paid 25% of the difference.
    seed({ first_paid_at: 'x', first_payment_ref: 'cs_1', wallet_applied_cents: 50_000 })
    const b = await computeContribution('prog-1')
    const owed = Number(prog().first_payment_cents)
    expect(b?.revenueCents, 'revenue counted the wallet credit as new money').toBe(owed - 50_000)
  })

  it('a programme paid entirely in cash is unchanged', async () => {
    seed({ first_paid_at: 'x', first_payment_ref: 'cs_1', wallet_applied_cents: 0 })
    const b = await computeContribution('prog-1')
    expect(b?.revenueCents).toBe(Number(prog().first_payment_cents))
  })

  it('an absent column is treated as zero, not as NaN revenue', async () => {
    // Every `select('*')` predating the migration returns rows without it, and a NaN revenue
    // would render as a number on a contribution screen.
    const p = seed({ first_paid_at: 'x', first_payment_ref: 'cs_1' })
    delete p.wallet_applied_cents
    const b = await computeContribution('prog-1')
    expect(Number.isFinite(b?.revenueCents)).toBe(true)
    expect(b?.revenueCents).toBe(Number(prog().first_payment_cents))
  })

  it('the credit and a make-whole both reduce revenue, and they are different facts', async () => {
    seed({ first_paid_at: 'x', first_payment_ref: 'cs_1', wallet_applied_cents: 50_000, make_whole_cents: 20_000 })
    const b = await computeContribution('prog-1')
    expect(b?.revenueCents).toBe(Number(prog().first_payment_cents) - 50_000 - 20_000)
  })
})

describe('🛑 the draw happens on the confirmed payment, exactly once', () => {
  it('a paid P1 draws the credit and records what was applied', async () => {
    seed({}, 500)                       // $500 in the wallet
    const r = await recordFirstPayment({
      programmeId: 'prog-1', sessionId: 'cs_1', walletCreditCents: 50_000,
    })
    expect(r.ok).toBe(true)
    expect(wallet(), 'the wallet was not drawn').toBeCloseTo(0, 6)
    expect(prog().wallet_applied_cents).toBe(50_000)
    expect(state.credit_transactions).toHaveLength(1)
    expect(state.credit_transactions[0].type).toBe('wallet_charge')
    expect(Number(state.credit_transactions[0].amount)).toBeLessThan(0)
  })

  it('🛑 A LOST CLAIM HANDS THE CREDIT BACK — one payment never spends it twice', async () => {
    // A redelivered webhook that drew and then lost the compare-and-set would have charged the
    // client's credit for a payment already recorded.
    seed({}, 500)
    state.stealClaim = true
    const r = await recordFirstPayment({
      programmeId: 'prog-1', sessionId: 'cs_1', walletCreditCents: 50_000,
    })
    expect(r.alreadyRecorded).toBe(true)
    expect(wallet(), 'the credit was drawn and never returned').toBeCloseTo(500, 6)
  })

  it('a payment with no credit touches the wallet at all', async () => {
    seed({}, 500)
    await recordFirstPayment({ programmeId: 'prog-1', sessionId: 'cs_1' })
    expect(wallet()).toBeCloseTo(500, 6)
    expect(state.credit_transactions).toHaveLength(0)
    expect(prog().wallet_applied_cents).toBe(0)
  })

  it('🛑 IT NEVER DRAWS MORE THAN IS ACTUALLY THERE', async () => {
    // The session may have been created days ago. Drawing the intended figure against a fallen
    // balance would take money that does not exist.
    seed({}, 100)                        // only $100 left
    await recordFirstPayment({
      programmeId: 'prog-1', sessionId: 'cs_1', walletCreditCents: 50_000,   // $500 intended
    })
    expect(wallet()).toBeCloseTo(0, 6)
    expect(prog().wallet_applied_cents).toBe(10_000)
    expect(state.alerts.join(' '), 'an underpaid programme was settled silently')
      .toMatch(/less credit than it discounted/i)
  })

  it('a wallet that refuses the draw still records the payment, and alerts', async () => {
    // The money arrived. Refusing to record it would lose a real payment; the safe direction is
    // to record it, apply nothing, and let a human see the shortfall.
    seed({}, 500)
    state.drawFails = true
    const r = await recordFirstPayment({
      programmeId: 'prog-1', sessionId: 'cs_1', walletCreditCents: 50_000,
    })
    expect(r.ok).toBe(true)
    expect(prog().first_payment_ref).toBe('cs_1')
    expect(prog().wallet_applied_cents).toBe(0)
    expect(state.alerts.join(' ')).toMatch(/could not be drawn/i)
  })

  it('a replayed webhook with the same session draws nothing more', async () => {
    seed({}, 500)
    await recordFirstPayment({ programmeId: 'prog-1', sessionId: 'cs_1', walletCreditCents: 50_000 })
    const after = wallet()
    const again = await recordFirstPayment({ programmeId: 'prog-1', sessionId: 'cs_1', walletCreditCents: 50_000 })
    expect(again.alreadyRecorded).toBe(true)
    expect(wallet(), 'a replay drew the credit a second time').toBeCloseTo(after, 6)
  })
})

describe('🛑 Q1 — the credit is P1 money only', () => {
  const CHECKOUT = (() => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs')
    const { join } = require('node:path') as typeof import('node:path')
    const raw = readFileSync(join(__dirname, '../lib/programme-checkout.ts'), 'utf8')
    let inBlock = false
    return raw.split('\n').map(l => {
      const x = l.trim()
      if (inBlock) { if (x.endsWith('*/')) inBlock = false; return '' }
      if (x.startsWith('/*')) { if (!x.endsWith('*/')) inBlock = true; return '' }
      const i = l.search(/(?<!:)\/\//)
      return i >= 0 ? l.slice(0, i) : l
    }).join('\n')
  })()

  it('🛑 THE CHECKOUT ITSELF REFUSES CREDIT ON P2, not just the caller', () => {
    // Founder-ruled: P1 authorises sourcing, so a credit reduces the cost of starting the next
    // run. P2 is going live — a different promise. A caller passing credit on P2 is a bug, and
    // enforcing it only at the caller would make that bug a silent discount.
    expect(CHECKOUT).toMatch(/isFirst \? Math\.max\(0, Math\.floor\(params\.walletCreditCents \?\? 0\)\) : 0/)
  })

  it('a zero or negative Stripe amount is refused rather than sent', () => {
    expect(CHECKOUT).toMatch(/amountCents < 1/)
    expect(CHECKOUT).toContain('cannot cover the whole payment')
  })

  it('the intended credit travels with the session so the webhook draws what was discounted', () => {
    expect(CHECKOUT).toContain('walletCreditCents: String(credit)')
  })
})
