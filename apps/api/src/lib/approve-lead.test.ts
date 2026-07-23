import { describe, it, expect, vi, beforeEach } from 'vitest'

// #492 — approve-path orchestration under the RE-TIMED money model. credit-holds,
// autoEnrollLead, the RPCs, the waterfall and the demo check are mocked so we assert the
// ORCHESTRATION invariants without a live DB:
//   • HOLD the $3 FIRST — no work credit ⟹ nothing moves (no reveal), insufficient_work_credits.
//   • reveal ($1) then; if reveal can't complete, the held $3 is RELEASED (nothing stranded).
//   • enrol on the hold with { force, figsyHeld } — figsyHeld skips the $3 charge (already held).
//   • no work starts ⟹ the hold is RELEASED (never hold money for absent work); workHeld:false.
//   • pass releases any hold. No path spends without the client's approval.
// The real $1/$3 correctness lives in credit-holds.test.ts + the RPCs + the Day-14 walk.

const rpcCalls: Array<{ fn: string; args: unknown }> = []
let rpcReturns: Record<string, unknown> = {}
let leadRow: Record<string, unknown> | null = null
let claimWins = true
let enrollBefore = 0
let enrollAfter = 0
let enrollQueryN = 0
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
      if (q._isCount) return resolve({ count: q._countValue ?? 0, error: null })
      if (q._update && table === 'leads') return resolve({ data: claimWins ? [leadRow] : [], error: null })
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q = makeQuery(table)
      if (table === 'figsy_enrollments') {
        q.select = () => { q._isCount = true; return q }
        // #492 fix — approveLead now runs ONE enrolment count (post-enrol): "does an active
        // enrolment exist?" → return the post-enrol count.
        Object.defineProperty(q, '_countValue', { get() { enrollQueryN++; return enrollAfter } })
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
// #492 — the hold engine is mocked here; its money correctness is covered in credit-holds.test.ts.
let holdOk = true
const holdFigsyCredit = vi.fn(async () => (holdOk ? { ok: true } : { ok: false, reason: 'insufficient_work_credits' }))
const releaseFigsyHold = vi.fn(async () => {})
vi.mock('./credit-holds', () => ({ holdFigsyCredit: (...a: unknown[]) => holdFigsyCredit(...(a as [])), releaseFigsyHold: (...a: unknown[]) => releaseFigsyHold(...(a as [])) }))

import { approveLead, passLead } from './approve-lead'
import { autoEnrollLead } from './figsy'

beforeEach(() => {
  rpcCalls.length = 0; tableInserts.length = 0; leadUpdates.length = 0
  rpcReturns = { try_charge_reveal_credit: true, record_reveal_or_refund: 'charged', reveal_is_owned: false }
  leadRow = { id: 'lead1', client_id: 'c1', email: null, first_name: 'A', last_name: 'B', company: 'Acme', crm_existing: false }
  claimWins = true; enrollBefore = 0; enrollAfter = 0; enrollQueryN = 0; holdOk = true
  vi.mocked(autoEnrollLead).mockClear(); holdFigsyCredit.mockClear(); releaseFigsyHold.mockClear()
})

describe('#492 approveLead — $1 charged + $3 HELD', () => {
  it('holds $3 FIRST, then charges $1 reveal, enrols on the hold (figsyHeld), returns workHeld', async () => {
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect(holdFigsyCredit).toHaveBeenCalledTimes(1)                                    // $3 held first
    expect(rpcCalls.find(r => r.fn === 'try_charge_reveal_credit')).toBeTruthy()        // $1 charged
    expect(vi.mocked(autoEnrollLead)).toHaveBeenCalledWith('lead1', 'c1', { force: true, figsyHeld: true })
    expect((out as { workHeld?: boolean }).workHeld).toBe(true)
    expect(releaseFigsyHold).not.toHaveBeenCalled()                                     // work started → hold stays
  })

  it('NO work credit → hold fails → NOTHING moves (no reveal), insufficient_work_credits', async () => {
    holdOk = false
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('insufficient_work_credits')
    expect(rpcCalls.find(r => r.fn === 'try_charge_reveal_credit')).toBeFalsy()         // $1 never charged
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled()
  })

  it('dead email → $1 REFUNDED, held $3 RELEASED, no work, status no_email', async () => {
    vi.mocked(await import('./enrichment')).waterfallEnrich.mockResolvedValueOnce({ email: null } as any)
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('no_email')
    expect(rpcCalls.find(r => r.fn === 'increment_client_credits')).toBeTruthy()        // $1 refund fired
    expect(releaseFigsyHold).toHaveBeenCalled()                                         // held $3 returned
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled()
  })

  it('insufficient reveal credits → held $3 RELEASED, no work', async () => {
    rpcReturns.try_charge_reveal_credit = false
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('insufficient_reveal_credits')
    expect(releaseFigsyHold).toHaveBeenCalled()
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled()
  })

  it('already-owned email (charge-once #424) → approved, reveal NOT re-charged, still holds+works', async () => {
    leadRow = { ...leadRow!, email: 'known@acme.com' }
    rpcReturns.reveal_is_owned = true
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect(rpcCalls.find(r => r.fn === 'try_charge_reveal_credit')).toBeFalsy()
    expect(vi.mocked(autoEnrollLead)).toHaveBeenCalledWith('lead1', 'c1', { force: true, figsyHeld: true })
  })

  it('reveal OK but work does NOT start → hold RELEASED, workHeld:false + reason', async () => {
    vi.mocked(autoEnrollLead).mockImplementationOnce(async () => { /* no enrol row */ })
    enrollBefore = 0; enrollAfter = 0
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect((out as { workHeld?: boolean }).workHeld).toBe(false)
    expect((out as { workReason?: string }).workReason).toBeTruthy()
    expect(releaseFigsyHold).toHaveBeenCalledWith('c1', 'lead1', 'no_work_started')     // don't hold for absent work
  })

  it('#492/F3 — re-approve of an ALREADY-REVEALED lead takes NO new hold (idempotent)', async () => {
    leadRow = { ...leadRow!, revealed_at: '2026-07-23T00:00:00Z', email: 'known@acme.com' }
    enrollAfter = 1 // it already has an active enrolment
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect((out as { workHeld?: boolean }).workHeld).toBe(true)
    expect(holdFigsyCredit).not.toHaveBeenCalled()   // no second hold
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled() // no re-enrol
    expect(rpcCalls.find(r => r.fn === 'try_charge_reveal_credit')).toBeFalsy() // no re-charge
  })

  it('pass charges NOTHING, releases any hold, marks the lead passed', async () => {
    leadRow = { id: 'lead1' }
    const out = await passLead('lead1', 'c1')
    expect(out.status).toBe('passed')
    expect(rpcCalls.length).toBe(0)                                                     // zero money RPCs
    expect(releaseFigsyHold).toHaveBeenCalledWith('c1', 'lead1', 'passed')
    expect(leadUpdates.some(u => u.status === 'passed')).toBe(true)
  })
})
