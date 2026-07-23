import { describe, it, expect, vi, beforeEach } from 'vitest'

// #492 — the hold engine money invariants, DB + RPC mocked:
//   • HOLD only when try_charge_figsy_credit really returns true (fail-closed) + writes the row.
//   • CAPTURE flips held→captured exactly once; a missing hold NEVER fabricates a charge.
//   • RELEASE returns the credit (increment_figsy_credits) and flips held→released once.
// The balance itself is the RPC's job; here we prove the orchestration can't double-spend
// or double-return, and that nothing captures without a prior hold.

const rpcCalls: Array<{ fn: string; args: any }> = []
let rpcReturns: Record<string, unknown> = {}
let holdRowByStatus: Record<string, { id: string } | null> = {}
const inserts: Array<{ table: string; row: any }> = []
const updates: Array<{ table: string; row: any }> = []
let lastEqStatus: string | null = null

function makeQuery(table: string) {
  const q: any = {
    _status: null as string | null,
    insert(row: any) { inserts.push({ table, row }); return { then: (r: any) => r({ error: null }) } },
    update(row: any) { q._u = row; return q },
    select() { return q },
    eq(col: string, val: unknown) { if (col === 'status') { q._status = val; lastEqStatus = val as string } return q },
    order() { return q }, limit() { return q },
    async maybeSingle() {
      if (q._u) { updates.push({ table, row: q._u }); return { data: { id: 'h1' }, error: null } }
      return { data: holdRowByStatus[q._status ?? '_'] ?? null, error: null }
    },
    then(resolve: (v: unknown) => unknown) {
      if (q._u) { updates.push({ table, row: q._u }); return resolve({ data: [{ id: 'h1' }], error: null }) }
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => makeQuery(table),
    rpc: async (fn: string, args: any) => { rpcCalls.push({ fn, args }); return { data: rpcReturns[fn], error: null } },
  },
}))
vi.mock('./demo', () => ({ isDemoClient: vi.fn(async () => false) }))

import { holdFigsyCredit, captureFigsyHold, releaseFigsyHold } from './credit-holds'

beforeEach(() => {
  rpcCalls.length = 0; inserts.length = 0; updates.length = 0; lastEqStatus = null
  rpcReturns = { try_charge_figsy_credit: true, increment_figsy_credits: 1 }
  holdRowByStatus = {}
})

describe('holdFigsyCredit', () => {
  it('charges a FIGSY credit then writes a held row', async () => {
    const r = await holdFigsyCredit('c1', 'l1', { first_name: 'A' })
    expect(r.ok).toBe(true)
    expect(rpcCalls.find(c => c.fn === 'try_charge_figsy_credit')).toBeTruthy()
    expect(inserts.find(i => i.table === 'credit_holds' && i.row.status === 'held')).toBeTruthy()
  })

  it('fail-closed: no credit → no hold row, insufficient_work_credits', async () => {
    rpcReturns.try_charge_figsy_credit = false
    const r = await holdFigsyCredit('c1', 'l1')
    expect(r).toEqual({ ok: false, reason: 'insufficient_work_credits' })
    expect(inserts.find(i => i.table === 'credit_holds')).toBeFalsy()
  })

  it('idempotent: an existing held row → no second charge', async () => {
    holdRowByStatus['held'] = { id: 'h1' }
    const r = await holdFigsyCredit('c1', 'l1')
    expect(r.ok).toBe(true)
    expect(rpcCalls.find(c => c.fn === 'try_charge_figsy_credit')).toBeFalsy()
  })
})

describe('captureFigsyHold', () => {
  it('flips a held row to captured, writes NO new debit', async () => {
    holdRowByStatus['held'] = { id: 'h1' }
    await captureFigsyHold('c1', 'l1')
    expect(updates.find(u => u.table === 'credit_holds' && u.row.status === 'captured')).toBeTruthy()
    // no increment/refund RPC on capture (the credit already left at hold)
    expect(rpcCalls.find(c => c.fn === 'increment_figsy_credits')).toBeFalsy()
  })

  it('NO held row → never fabricates a charge (no update, no rpc)', async () => {
    holdRowByStatus['held'] = null; holdRowByStatus['captured'] = null
    await captureFigsyHold('c1', 'l1')
    expect(updates.find(u => u.table === 'credit_holds' && u.row.status === 'captured')).toBeFalsy()
    expect(rpcCalls.length).toBe(0)
  })
})

describe('releaseFigsyHold', () => {
  it('returns the credit and flips held → released', async () => {
    holdRowByStatus['held'] = { id: 'h1' }
    await releaseFigsyHold('c1', 'l1', 'no_booking')
    expect(rpcCalls.find(c => c.fn === 'increment_figsy_credits' && c.args.p_amount === 1)).toBeTruthy()
    expect(updates.find(u => u.table === 'credit_holds' && u.row.status === 'released')).toBeTruthy()
  })

  it('no held row → no-op (no double-return)', async () => {
    holdRowByStatus['held'] = null
    await releaseFigsyHold('c1', 'l1', 'no_booking')
    expect(rpcCalls.find(c => c.fn === 'increment_figsy_credits')).toBeFalsy()
  })
})
