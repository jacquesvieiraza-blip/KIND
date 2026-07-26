import { describe, it, expect, vi, beforeEach } from 'vitest'

// RULE 2: a lead inside the client's included 100 is NEVER charged.
//
// `chargeFigsyEnroll` asks one question — "has this lead already been paid for?" — and it
// asked it in only one of the two formats the ledger actually uses:
//   • a WALLET approval writes  reference='lead:<id>'   type='wallet_charge'  (−$4)
//   • a PACK   approval writes  reference='pack_<id>'   type='usage'          ($0)
// It looked only for the wallet form, so a lead approved FREE inside the included 100 read
// as "never paid" — and any enrol path that does not pass `prepaid` (icps auto-enrol, the
// two /figsy enrol loops, the intent sweep, two internal crons — six call sites) would take
// $4 for a lead we had promised free.
//
// Latent only because AUTO_OUTREACH_ENABLED is off. Live the moment it flips, which is why
// it is tested rather than trusted.

const state = {
  /** the ledger rows that exist for this lead */
  ledger: [] as Array<{ reference: string; type: string }>,
  chargeAttempts: 0,
}

function query(table: string) {
  let refs: string[] = []
  let types: string[] = []
  const q: Record<string, unknown> = {
    select() { return q },
    eq() { return q },
    in(col: string, vals: string[]) {
      if (col === 'reference') refs = vals
      if (col === 'type') types = vals
      return q
    },
    limit() { return q },
    insert() { return { then: (r: (v: unknown) => unknown) => r({ error: null }) } },
    async maybeSingle() {
      if (table !== 'credit_transactions') return { data: null, error: null }
      const hit = state.ledger.find(r => refs.includes(r.reference) && types.includes(r.type))
      return { data: hit ? { id: 'row-1' } : null, error: null }
    },
    then(resolve: (v: unknown) => unknown) { return resolve({ data: [], error: null }) },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => query(t),
    rpc: async (name: string) => {
      if (name === 'try_charge_wallet') { state.chargeAttempts++; return { data: true, error: null } }
      return { data: null, error: null }
    },
  },
}))
vi.mock('./demo', () => ({ isDemoClient: async () => false }))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => {} }))

beforeEach(() => { state.ledger = []; state.chargeAttempts = 0 })

const LEAD = { id: 'lead-1', first_name: 'Thandi', last_name: 'Mokoena', company: 'Rivo' }

describe('chargeFigsyEnroll — a pack-approved lead is never charged again', () => {
  it('SKIPS when the lead was approved inside the pack (reference=pack_, type=usage)', async () => {
    // This is the bug. Before the fix the guard looked only for `lead:` + `wallet_charge`,
    // so this returned 'charged' and took $4 from a client who was promised it free.
    state.ledger = [{ reference: 'pack_lead-1', type: 'usage' }]
    const { chargeFigsyEnroll } = await import('./figsy')
    const r = await chargeFigsyEnroll('client-1', LEAD)
    expect(r).toBe('skipped')
    expect(state.chargeAttempts).toBe(0)
  })

  it('SKIPS when the lead was already charged from the wallet', async () => {
    state.ledger = [{ reference: 'lead:lead-1', type: 'wallet_charge' }]
    const { chargeFigsyEnroll } = await import('./figsy')
    expect(await chargeFigsyEnroll('client-1', LEAD)).toBe('skipped')
    expect(state.chargeAttempts).toBe(0)
  })

  it('CHARGES when the lead has genuinely never been paid for', async () => {
    // The guard must not become so broad that a real, unpaid lead slips through free.
    state.ledger = []
    const { chargeFigsyEnroll } = await import('./figsy')
    expect(await chargeFigsyEnroll('client-1', LEAD)).toBe('charged')
    expect(state.chargeAttempts).toBe(1)
  })

  it('is not fooled by another lead pack row', async () => {
    state.ledger = [{ reference: 'pack_some-other-lead', type: 'usage' }]
    const { chargeFigsyEnroll } = await import('./figsy')
    expect(await chargeFigsyEnroll('client-1', LEAD)).toBe('charged')
  })
})
