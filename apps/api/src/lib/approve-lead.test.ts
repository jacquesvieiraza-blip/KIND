import { describe, it, expect, vi, beforeEach } from 'vitest'

// #487 — approve-path orchestration tests. The money RPCs, autoEnrollLead, the Hunter
// waterfall and demo check are mocked so we can assert the ORCHESTRATION invariants
// without a live DB: approve = reveal($1) THEN work($3); pass charges nothing; a dead
// email refunds the $1 and charges no work; double-approve is idempotent. The real $1/$3
// charge correctness lives in the RPCs themselves (try_charge_reveal_credit /
// record_reveal_or_refund / chargeFigsyEnroll) + the live money walk (Day-14 gate).

// ---- controllable fakes ----
const rpcCalls: Array<{ fn: string; args: unknown }> = []
let rpcReturns: Record<string, unknown> = {}
let leadRow: Record<string, unknown> | null = null
let claimWins = true
let enrollBefore = 0
let enrollAfter = 0
let enrollQueryN = 0   // shared across the two figsy_enrollments count queries (before/after)
const tableInserts: Array<{ table: string; row: unknown }> = []
const leadUpdates: Array<Record<string, unknown>> = []

function makeQuery(table: string) {
  const q: any = {
    _isCount: false,
    update(row: Record<string, unknown>) { if (table === 'leads') leadUpdates.push(row); q._update = row; return q },
    insert(row: unknown) { tableInserts.push({ table, row }); return { then: (r: any) => r({ error: null }), select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }) } },
    select(_c?: string, opts?: { count?: string; head?: boolean }) { q._isCount = !!opts?.count; return q },
    eq() { return q }, neq() { return q }, is() { return q }, in() { return q }, not() { return q },
    order() { return q }, limit() { return q },
    async maybeSingle() { return { data: leadRow, error: null } },
    async single() { return { data: leadRow, error: null } },
    then(resolve: (v: unknown) => unknown) {
      // update(...).eq(...).is(...).select() resolves here (claim) OR count select resolves here
      if (q._isCount) return resolve({ count: q._countValue ?? 0, error: null })
      if (q._update && table === 'leads') {
        // the atomic claim: returns [row] if claim wins, [] otherwise
        return resolve({ data: claimWins ? [leadRow] : [], error: null })
      }
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q = makeQuery(table)
      // figsy_enrollments count select returns before/after
      if (table === 'figsy_enrollments') {
        q.select = () => { q._isCount = true; return q }
        Object.defineProperty(q, '_countValue', { get() { return (enrollQueryN++ === 0) ? enrollBefore : enrollAfter } })
      }
      return q
    },
    rpc: async (fn: string, args: unknown) => { rpcCalls.push({ fn, args }); return { data: rpcReturns[fn], error: null } },
  },
}))
vi.mock('./figsy', () => ({ autoEnrollLead: vi.fn(async () => { enrollAfter = enrollBefore + 1 }) }))
vi.mock('./enrichment', () => ({ waterfallEnrich: vi.fn(async () => ({ email: 'found@acme.com' })) }))
vi.mock('./demo', () => ({ isDemoClient: vi.fn(async () => false) }))
vi.mock('./billing-rules', () => ({
  normalizeRevealEmail: (e: string | null) => (e ? e.toLowerCase() : null),
  revealCharged: (o: unknown) => o === 'charged',
}))

import { approveLead, passLead } from './approve-lead'
import { autoEnrollLead } from './figsy'

beforeEach(() => {
  rpcCalls.length = 0; tableInserts.length = 0; leadUpdates.length = 0
  rpcReturns = { try_charge_reveal_credit: true, record_reveal_or_refund: 'charged', reveal_is_owned: false }
  leadRow = { id: 'lead1', client_id: 'c1', email: null, first_name: 'A', last_name: 'B', company: 'Acme', crm_existing: false }
  claimWins = true; enrollBefore = 0; enrollAfter = 0; enrollQueryN = 0
  vi.mocked(autoEnrollLead).mockClear()
})

describe('#487 approveLead — the $4 trigger', () => {
  it('approve charges $1 reveal THEN $3 work (autoEnrollLead force), returns approved', async () => {
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect(rpcCalls.find(r => r.fn === 'try_charge_reveal_credit')).toBeTruthy()      // $1 charged
    expect(vi.mocked(autoEnrollLead)).toHaveBeenCalledWith('lead1', 'c1', { force: true })  // $3 work, force
    expect((out as { workCharged?: boolean }).workCharged).toBe(true)
  })

  it('dead email → $1 REFUNDED, no work charged, status no_email', async () => {
    vi.mocked(await import('./enrichment')).waterfallEnrich.mockResolvedValueOnce({ email: null } as any)
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('no_email')
    expect(rpcCalls.find(r => r.fn === 'increment_client_credits')).toBeTruthy()        // refund fired
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled()                            // no $3 work
  })

  it('insufficient reveal credits → no work, no charge-through', async () => {
    rpcReturns.try_charge_reveal_credit = false
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('insufficient_reveal_credits')
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled()
  })

  it('already-owned email (charge-once #424) → approved, reveal NOT re-charged', async () => {
    leadRow = { ...leadRow!, email: 'known@acme.com' }
    rpcReturns.reveal_is_owned = true
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect(rpcCalls.find(r => r.fn === 'try_charge_reveal_credit')).toBeFalsy()          // owned → no $1
    expect(vi.mocked(autoEnrollLead)).toHaveBeenCalledWith('lead1', 'c1', { force: true }) // still does $3
  })

  it('partial failure: reveal OK but work does not enrol → workCharged:false + reason', async () => {
    vi.mocked(autoEnrollLead).mockImplementationOnce(async () => { /* no enrol row created */ })
    enrollBefore = 0; enrollAfter = 0
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect((out as { workCharged?: boolean }).workCharged).toBe(false)
    expect((out as { workReason?: string }).workReason).toBeTruthy()
  })

  it('pass charges NOTHING and marks the lead passed', async () => {
    leadRow = { id: 'lead1' }
    const out = await passLead('lead1', 'c1')
    expect(out.status).toBe('passed')
    expect(rpcCalls.length).toBe(0)                                                      // zero money RPCs
    expect(leadUpdates.some(u => u.status === 'passed')).toBe(true)
  })
})
