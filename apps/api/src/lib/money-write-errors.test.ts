import { describe, it, expect, vi, beforeEach } from 'vitest'

// #349 — THE MONEY LEFT THE WALLET AND NOTHING RECORDED IT.
//
// `chargeFigsyEnroll` decrements the wallet with an atomic RPC and THEN writes the ledger row
// that says it did. That row is not bookkeeping — it is the answer to the only question the
// enrol guard asks: "has this lead already been paid for?" Six enrol call sites ask it.
//
// The insert was written `.then(() => {}, () => {})`. So if it failed, the $4 was gone and the
// lead read as UNPAID — and the next enrol path through that lead charged the client a SECOND
// time, silently. `approve-lead.ts:258` was fixed for exactly this in the wallet-approve path
// and this door was left swallowed.
//
// The rule these tests pin: a charge that succeeds and a ledger row that fails must ALERT.
// Never pass silently, and never abort the enrol — the money has already moved, so refusing
// here would take the $4 and refuse the work too.

const state = {
  chargeOk: true,
  /** what the credit_transactions insert returns */
  ledgerError: null as { message: string; code?: string } | null,
  inserts: [] as Record<string, unknown>[],
  alerts: [] as { kind: string; subject: string; lines: string[] }[],
  /** enrollment update failures, keyed by nothing — one switch for the whole table */
  enrollmentError: null as { message: string } | null,
  enrollmentUpdates: [] as Record<string, unknown>[],
}

function query(table: string) {
  const q: Record<string, unknown> = {
    select() { return q },
    eq() { return q },
    in() { return q },
    limit() { return q },
    async maybeSingle() { return { data: null, error: null } },
    insert(row: Record<string, unknown>) {
      if (table === 'credit_transactions') {
        state.inserts.push(row)
        return Promise.resolve({ data: null, error: state.ledgerError })
      }
      return Promise.resolve({ data: null, error: null })
    },
    update(patch: Record<string, unknown>) {
      if (table === 'figsy_enrollments') state.enrollmentUpdates.push(patch)
      const chain: Record<string, unknown> = {
        eq() { return Promise.resolve({ data: null, error: table === 'figsy_enrollments' ? state.enrollmentError : null }) },
        in() { return chain },
      }
      return chain
    },
    then(resolve: (v: unknown) => unknown) { return resolve({ data: [], error: null }) },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => query(t),
    rpc: async (name: string) => {
      if (name === 'try_charge_wallet') return { data: state.chargeOk, error: null }
      return { data: null, error: null }
    },
  },
}))
vi.mock('./demo', () => ({ isDemoClient: async () => false }))
vi.mock('./alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, lines: string[]) => {
    state.alerts.push({ kind, subject, lines })
  },
}))

import { chargeFigsyEnroll, updateEnrollmentState } from './figsy'

const LEAD = { id: 'lead-1', first_name: 'Thandi', last_name: 'Mokoena', company: 'Rivo' }

beforeEach(() => {
  state.chargeOk = true
  state.ledgerError = null
  state.inserts = []
  state.alerts = []
  state.enrollmentError = null
  state.enrollmentUpdates = []
})

// Alerts are dispatched with `void ... .catch()`, so they are queued but not awaited by the
// function under test. One microtask turn lets them land before the assertion reads them.
const settle = () => new Promise(r => setTimeout(r, 0))

describe('the charge succeeded and the ledger row did not', () => {
  it('ALERTS — it does not pass silently', async () => {
    // The whole point. This is the state where the client is $4 lighter with no record.
    state.ledgerError = { message: 'violates check constraint "credit_transactions_type_check"' }
    await chargeFigsyEnroll('c1', LEAD)
    await settle()
    expect(state.alerts).toHaveLength(1)
    expect(state.alerts[0].kind).toBe('charge_failed')
  })

  it('the alert names the client and the lead, so it can be reconciled by hand', async () => {
    state.ledgerError = { message: 'boom' }
    await chargeFigsyEnroll('c1', LEAD)
    await settle()
    const body = state.alerts[0].lines.join(' ')
    expect(body).toContain('c1')
    expect(body).toContain('lead-1')
    expect(body).toContain('Thandi')
  })

  it('the alert says the money moved and the record did not', async () => {
    state.ledgerError = { message: 'boom' }
    await chargeFigsyEnroll('c1', LEAD)
    await settle()
    const body = state.alerts[0].lines.join(' ')
    expect(body).toContain('left the wallet')
    expect(body.toLowerCase()).toContain('charged a second time')
  })

  it('STILL RETURNS "charged" — the $4 is gone, so the enrol must proceed', async () => {
    // Returning 'failed' here would be worse than the bug: it takes the money AND refuses
    // the work the money paid for.
    state.ledgerError = { message: 'boom' }
    expect(await chargeFigsyEnroll('c1', LEAD)).toBe('charged')
  })
})

describe('the duplicate-row case is the guard working, not a failure', () => {
  it('23505 does NOT alert — it means the lead is already recorded as paid', async () => {
    // The UNIQUE index on `reference` firing is the dedup doing its job. Alerting on it would
    // page the founder on every legitimate retry and train them to ignore the alert.
    state.ledgerError = { message: 'duplicate key value violates unique constraint', code: '23505' }
    await chargeFigsyEnroll('c1', LEAD)
    await settle()
    expect(state.alerts).toHaveLength(0)
  })
})

describe('the ordinary path is untouched', () => {
  it('a clean charge writes the ledger row and raises nothing', async () => {
    await chargeFigsyEnroll('c1', LEAD)
    await settle()
    expect(state.alerts).toHaveLength(0)
    expect(state.inserts).toHaveLength(1)
    expect(state.inserts[0]).toMatchObject({ client_id: 'c1', amount: -4, type: 'wallet_charge', reference: 'lead:lead-1' })
  })

  it('a FAILED charge never reaches the ledger at all', async () => {
    // Nothing moved, so there is nothing to record — and the alert is the charge alert,
    // not the ledger one.
    state.chargeOk = false
    expect(await chargeFigsyEnroll('c1', LEAD)).toBe('failed')
    expect(state.inserts).toHaveLength(0)
  })
})

// ── ENROLLMENT STATE WRITES ──────────────────────────────────────────────────────────────
//
// Every enrolled lead has already been paid for, so there is no cosmetic enrollment write.
// The one that matters most is the post-send advance: the email has already gone when it
// runs, so a swallowed failure re-sends it to a real prospect on the next cron run.
describe('enrollment state writes are checked, not assumed', () => {
  it('returns true and stays quiet when the row moves', async () => {
    expect(await updateEnrollmentState('e1', { status: 'completed' }, 'x')).toBe(true)
    await settle()
    expect(state.alerts).toHaveLength(0)
  })

  it('returns FALSE when the write is rejected — the caller can stop reporting success', async () => {
    state.enrollmentError = { message: 'column does not exist' }
    expect(await updateEnrollmentState('e1', { status: 'completed' }, 'x')).toBe(false)
  })

  it('alerts with the CONSEQUENCE spelled out, not just the error', async () => {
    // "update failed" tells the founder nothing. "the same email will be sent again" tells
    // them whether to stop the sends.
    state.enrollmentError = { message: 'timeout' }
    await updateEnrollmentState('e7', { current_step: 2 },
      'step 2 WAS SENT but the enrollment was not advanced — the same email will be sent to this prospect again')
    await settle()
    expect(state.alerts).toHaveLength(1)
    const body = state.alerts[0].lines.join(' ')
    expect(body).toContain('e7')
    expect(body).toContain('sent to this prospect again')
    expect(body).toContain('timeout')
  })

  it('says the lead was already paid for — that is why it is worth waking up for', async () => {
    state.enrollmentError = { message: 'timeout' }
    await updateEnrollmentState('e1', {}, 'x')
    await settle()
    expect(state.alerts[0].lines.join(' ')).toContain('already been paid for')
  })

  it('can be silenced deliberately for a caller that handles it itself', async () => {
    state.enrollmentError = { message: 'timeout' }
    expect(await updateEnrollmentState('e1', {}, 'x', { alert: false })).toBe(false)
    await settle()
    expect(state.alerts).toHaveLength(0)
  })
})
