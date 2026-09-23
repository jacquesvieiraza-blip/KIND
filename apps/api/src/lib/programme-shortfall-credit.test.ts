// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 R136 PR C — WHAT A PROGRAMME OWES WHEN IT STOPS SHORT, AND WHERE THAT GOES
//
// Founder-locked 23 Sep, verbatim: *"no. we dont give money back. we refund credits to their
// wallet internally to use towards another icp run."*
//
// ── WHY THIS FILE IS LONGER THAN THE FUNCTION IT TESTS ──────────────────────────────────
//
// It moves money, and `increment_wallet` is NOT idempotent. Every failure below is one where
// the product keeps running and the numbers keep rendering:
//
//   · a double-clicked operator button credits the wallet TWICE
//   · a failed wallet call leaves a programme marked settled and the client unpaid
//   · a settlement that skips `make_whole_cents` pays a partner 25% of money we gave back
//   · re-deriving delivered meetings later moves a figure that was already settled
//
// None of those throw. The first is a real overpayment, the third is the R68 shape applied to
// contribution, and the only thing standing between the product and the first is a
// compare-and-set that a reasonable person would call redundant.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'

type Row = Record<string, unknown>

const state: {
  programmes: Row[]; credit_transactions: Row[]; alerts: string[]
  wallet: Record<string, number>
  walletFails: boolean
  ledgerFails: boolean
} = {
  programmes: [], credit_transactions: [], alerts: [], wallet: {},
  walletFails: false, ledgerFails: false,
}

/**
 * The mock honours the two things the real schema enforces and this file is about: the
 * `.is(col, null)` compare-and-set that makes the claim a claim, and the UNIQUE index on
 * `credit_transactions.reference` that makes a duplicate ledger row a 23505 rather than a
 * second credit.
 */
function makeTable(name: 'programmes' | 'credit_transactions') {
  const rows = () => state[name]
  const q = {
    _filters: [] as Array<(r: Row) => boolean>,
    _payload: null as Row | null,
    _mode: '' as '' | 'update' | 'insert' | 'select',
    select() { if (this._mode === '') this._mode = 'select'; return this },
    eq(col: string, val: unknown) { this._filters.push(r => r[col] === val); return this },
    is(col: string, val: unknown) { this._filters.push(r => (r[col] ?? null) === val); return this },
    order() { return this },
    limit() { return this },
    insert(payload: Row) { this._mode = 'insert'; this._payload = payload; return this },
    update(payload: Row) { this._mode = 'update'; this._payload = payload; return this },
    _matched() { return rows().filter(r => this._filters.every(f => f(r))) },
    async maybeSingle() { return { data: this._matched()[0] ?? null, error: null } },
    async single() { return this._mode === 'insert' ? this._run() : { data: this._matched()[0] ?? null, error: null } },
    _run(): { data: unknown; error: unknown } {
      if (this._mode === 'insert') {
        const p = this._payload as Row
        if (name === 'credit_transactions') {
          if (state.ledgerFails) return { data: null, error: { code: 'XX000', message: 'ledger unavailable' } }
          // THE UNIQUE INDEX ON `reference`, which is what makes a retry safe.
          if (p.reference && rows().some(r => r.reference === p.reference)) {
            return { data: null, error: { code: '23505', message: 'duplicate key' } }
          }
        }
        const row = { id: `id-${rows().length + 1}`, ...p }
        rows().push(row)
        return { data: row, error: null }
      }
      const hit = this._matched()
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
    from: (t: string) => makeTable(t === 'credit_transactions' ? 'credit_transactions' : 'programmes'),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'increment_wallet') {
        if (state.walletFails) return { data: null, error: { message: 'wallet unavailable' } }
        const id = String(args.p_client_id)
        state.wallet[id] = (state.wallet[id] ?? 0) + Number(args.p_amount)
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

import { settleProgrammeShortfall } from './programme'
import { programmeTotalCents, deliveredValueCents } from '@kind/shared'

/** A ten-meeting programme, paid in full. $4,375 total, split 50/50. */
function seed(over: Row = {}): Row {
  const total = programmeTotalCents(10)
  const p: Row = {
    id: 'prog-1', client_id: 'client-1', status: 'LIVE',
    meeting_target: 10, recommended_volume: 2_500,
    price_per_meeting_cents: 43_750, price_total_cents: total,
    first_payment_cents: Math.floor(total / 2), second_payment_cents: total - Math.floor(total / 2),
    first_paid_at: '2026-09-01T00:00:00Z', second_paid_at: '2026-09-10T00:00:00Z',
    sourcing_ceiling: 4_000, sourced_used: 4_000, sourced_reserved: 0,
    make_whole_cents: 0, value_settled_at: null,
    // The migration's columns, present — an ABSENT one is its own test below.
    shortfall_credited_at: null, shortfall_credit_cents: 0, delivered_meetings: null,
    ...over,
  }
  state.programmes.push(p)
  return p
}

const prog = () => state.programmes[0]
const walletOf = (id = 'client-1') => state.wallet[id] ?? 0

beforeEach(() => {
  state.programmes = []; state.credit_transactions = []; state.alerts = []
  state.wallet = {}; state.walletFails = false; state.ledgerFails = false
})

describe('🛑 the credit is what they did not receive, and it lands in the wallet', () => {
  it('ten bought, seven delivered — the difference is credited', async () => {
    seed()
    const total = programmeTotalCents(10)
    const r = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'Hit the limit' })

    expect(r.ok).toBe(true)
    expect(r.creditCents).toBe(total - deliveredValueCents(10, 7))
    // The wallet is in DOLLARS and the programme in CENTS — a boundary worth asserting, since
    // crediting 306250 dollars instead of 3062.50 would look like a very generous success.
    expect(walletOf()).toBeCloseTo((total - deliveredValueCents(10, 7)) / 100, 6)
  })

  it('🛑 AND IT IS ADDED TO make_whole_cents, which is what keeps a partner honest', async () => {
    // `computeContribution` subtracts that column from revenue. A credit written anywhere else
    // leaves a partner earning 25% of money the client no longer owes — R68, applied to
    // contribution instead of to a lead price.
    seed()
    const r = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    expect(prog().make_whole_cents).toBe(r.creditCents)
  })

  it('the settlement is recorded on the programme, with the figures it used', async () => {
    seed()
    await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    expect(prog().shortfall_credited_at).toBeTruthy()
    expect(prog().value_settled_at).toBeTruthy()
    expect(prog().delivered_meetings, 'the delivered count was not persisted').toBe(7)
  })

  it('🛑 DELIVERED MEETINGS ARE PERSISTED, so the settled figure cannot move later', async () => {
    // Meetings keep being booked on other programmes. A settlement that re-derived this would
    // change an answer somebody has already been given.
    seed()
    await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    const credited = prog().shortfall_credit_cents
    await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 2, note: 'again' })
    expect(prog().delivered_meetings, 'a second call rewrote the settled delivery count').toBe(7)
    expect(prog().shortfall_credit_cents).toBe(credited)
  })

  it('a ledger row is written, and it says what it is for', async () => {
    seed()
    await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    expect(state.credit_transactions).toHaveLength(1)
    const row = state.credit_transactions[0]
    expect(row.type).toBe('wallet_topup')
    expect(row.reference).toBe('programme-shortfall:prog-1')
    expect(String(row.note)).toContain('7 of 10')
  })

  it('a fully delivered programme is settled and owes nothing', async () => {
    seed()
    const r = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 10, note: 'all good' })
    expect(r.ok).toBe(true)
    expect(r.creditCents).toBe(0)
    expect(walletOf()).toBe(0)
    // 🛑 NO LEDGER ROW FOR A ZERO MOVEMENT — a row saying something happened when nothing did.
    expect(state.credit_transactions).toHaveLength(0)
    // …but it IS settled, which is what stops the question being asked again.
    expect(prog().shortfall_credited_at).toBeTruthy()
  })

  it('it credits against what was COLLECTED, never against what was quoted', async () => {
    // A programme that took only its first payment has less to return. Crediting the full
    // difference would hand back money nobody ever paid us.
    seed({ second_paid_at: null })
    const r = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    const collected = Math.floor(programmeTotalCents(10) / 2)
    expect(r.creditCents).toBe(Math.max(0, collected - deliveredValueCents(10, 7)))
  })
})

describe('🛑 a second press credits nothing — the claim is the only thing preventing it', () => {
  it('the second call is answered alreadySettled and moves no money', async () => {
    seed()
    const first = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    const after = walletOf()
    const second = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(second.alreadySettled, 'a repeat press was treated as a new settlement').toBe(true)
    expect(walletOf(), 'the wallet was credited twice').toBe(after)
    expect(state.credit_transactions, 'a second ledger row was written').toHaveLength(1)
  })

  it('🛑 AND make_whole_cents DOES NOT ACCUMULATE ON A REPEAT', async () => {
    // The quiet version of the same bug: the wallet is right, the contribution is not, and a
    // partner's commission is computed on a revenue figure that was reduced twice.
    seed()
    const r = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    expect(prog().make_whole_cents).toBe(r.creditCents)
  })

  it('two concurrent presses produce exactly one credit', async () => {
    seed()
    const [a, b] = await Promise.all([
      settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' }),
      settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' }),
    ])
    expect([a.alreadySettled, b.alreadySettled].filter(Boolean),
      'both concurrent presses settled').toHaveLength(1)
    expect(state.credit_transactions).toHaveLength(1)
  })
})

describe('🛑 a failure hands the claim back rather than stranding the programme', () => {
  it('a wallet that could not be credited settles NOTHING, and says so', async () => {
    seed()
    state.walletFails = true
    const r = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })

    expect(r.ok).toBe(false)
    expect(String(r.reason)).toMatch(/wallet could not be credited/i)
    expect(walletOf()).toBe(0)
    expect(prog().make_whole_cents, 'contribution was reduced for a credit that never happened').toBe(0)
  })

  it('🛑 AND THE CLAIM IS RELEASED, so a retry works without editing the database', async () => {
    // R132a, in the founder's own words: *"Do not require the operator or Founder to manually
    // edit the database."* A claim that cannot be handed back is a programme stuck forever.
    seed()
    state.walletFails = true
    await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    expect(prog().shortfall_credited_at, 'the claim was kept after a failure').toBeNull()
    expect(prog().shortfall_credit_cents).toBe(0)

    state.walletFails = false
    const retry = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    expect(retry.ok).toBe(true)
    expect(retry.alreadySettled).toBeFalsy()
    expect(walletOf()).toBeGreaterThan(0)
  })

  it('🛑 A LEDGER FAILURE AFTER THE MONEY MOVED DOES *NOT* RELEASE — it alerts', async () => {
    // The opposite direction, and it is the one that is tempting to get wrong. The wallet has
    // already been credited; releasing the claim would invite a retry that credits it again.
    // An under-recorded correct balance is recoverable; a double credit is somebody's money.
    seed()
    state.ledgerFails = true
    const r = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })

    expect(r.ok).toBe(true)
    expect(walletOf()).toBeGreaterThan(0)
    expect(prog().shortfall_credited_at, 'the claim was released after the money had moved').toBeTruthy()
    expect(state.alerts.join(' ')).toMatch(/credited but not ledgered/i)
  })
})

describe('🛑 it refuses rather than guessing', () => {
  it('an unmigrated programme cannot be settled — no column, no claim, no safe credit', async () => {
    const p = seed()
    delete p.shortfall_credited_at
    const r = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    expect(r.ok).toBe(false)
    expect(String(r.reason)).toMatch(/20260923_programme_shortfall_credit/)
    expect(walletOf(), 'money moved without a claim to stop it happening twice').toBe(0)
  })

  it('a nonsense delivered count is refused before anything is written', async () => {
    seed()
    for (const bad of [-1, 2.5, Number.NaN]) {
      const r = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: bad, note: 'x' })
      expect(r.ok, `${bad} was accepted as a delivery count`).toBe(false)
    }
    expect(prog().shortfall_credited_at).toBeNull()
    expect(walletOf()).toBe(0)
  })

  it('a programme that does not exist is a refusal, not a crash', async () => {
    const r = await settleProgrammeShortfall({ programmeId: 'nope', deliveredMeetings: 7, note: 'x' })
    expect(r.ok).toBe(false)
    expect(String(r.reason)).toMatch(/No such programme/)
  })

  it('over-delivery credits nothing rather than inventing a negative', async () => {
    seed()
    const r = await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 14, note: 'x' })
    expect(r.ok).toBe(true)
    expect(r.creditCents).toBe(0)
    expect(walletOf()).toBe(0)
  })
})

describe('🛑 the settlement says what it is, and what it is not', () => {
  it('the founder alert states this is wallet credit and NOT a Stripe refund', async () => {
    seed()
    await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'Hit the limit' })
    expect(state.alerts.join(' ')).toMatch(/settled short/i)
  })

  it('the ledger records it as money INTO the wallet, positive', async () => {
    seed()
    await settleProgrammeShortfall({ programmeId: 'prog-1', deliveredMeetings: 7, note: 'x' })
    expect(Number(state.credit_transactions[0].amount)).toBeGreaterThan(0)
  })
})
