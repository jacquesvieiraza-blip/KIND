import { describe, it, expect, vi, beforeEach } from 'vitest'

// ONE WALLET — approve-path orchestration under the work model. The RPCs, autoEnrollLead,
// the waterfall and the demo check are mocked so we assert the ORCHESTRATION invariants
// without a live DB:
//   • APPROVE is the ONLY money event: a flat $4 charged ONCE at the 👍, final.
//   • The atomic revealed_at claim is the once-per-lead gate.
//   • Dead email ⟹ the $4 is REVERSED (never bill a dud).
//   • already-owned (#424) / demo / crm-existing ⟹ approved, NOT charged.
//   • pass charges NOTHING and releases nothing (there are no holds).

const rpcCalls: Array<{ fn: string; args: unknown }> = []
let rpcReturns: Record<string, unknown> = {}
let leadRow: Record<string, unknown> | null = null
// The client's ACTIVE campaign lookup (step 3c). null ⟹ nothing to enrol into, so the
// $4 must NOT be charged — we never take money for work we can't run.
let campaignRow: Record<string, unknown> | null = { id: 'camp1' }
let claimWins = true
let enrollAfter = 0
const tableInserts: Array<{ table: string; row: unknown }> = []
const leadUpdates: Array<Record<string, unknown>> = []
let isDemo = false

function makeQuery(table: string) {
  const q: any = {
    _isCount: false,
    update(row: Record<string, unknown>) { if (table === 'leads') leadUpdates.push(row); q._update = row; return q },
    insert(row: unknown) { tableInserts.push({ table, row }); return { then: (r: any) => r({ error: null }), select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }) } },
    delete() { return q },
    select(_c?: string, opts?: { count?: string; head?: boolean }) { q._isCount = !!opts?.count; return q },
    eq() { return q }, neq() { return q }, is() { return q }, in() { return q }, not() { return q },
    order() { return q }, limit() { return q },
    async maybeSingle() { return { data: table === 'figsy_campaigns' ? campaignRow : leadRow, error: null } },
    async single() { return { data: table === 'figsy_campaigns' ? campaignRow : leadRow, error: null } },
    then(resolve: (v: unknown) => unknown) {
      if (q._isCount) return resolve({ count: enrollAfter, error: null })
      if (q._update && table === 'leads') return resolve({ data: claimWins ? [leadRow] : [], error: null })
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => makeQuery(table),
    rpc: async (fn: string, args: unknown) => { rpcCalls.push({ fn, args }); return { data: rpcReturns[fn], error: null } },
  },
}))
vi.mock('./figsy', () => ({ autoEnrollLead: vi.fn(async () => { enrollAfter = 1 }) }))
vi.mock('./enrichment', () => ({ waterfallEnrich: vi.fn(async () => ({ email: 'found@acme.com' })) }))
vi.mock('./demo', () => ({ isDemoClient: vi.fn(async () => isDemo) }))
vi.mock('./billing-rules', () => ({ normalizeRevealEmail: (e: string | null) => (e ? e.toLowerCase() : null) }))
vi.mock('./alerts', () => ({ sendFounderAlert: vi.fn(async () => {}) }))

import { approveLead, passLead } from './approve-lead'
import { autoEnrollLead } from './figsy'

beforeEach(() => {
  rpcCalls.length = 0; tableInserts.length = 0; leadUpdates.length = 0
  rpcReturns = { try_charge_wallet: true, increment_wallet: null, record_reveal_or_refund: 'charged', reveal_is_owned: false }
  leadRow = { id: 'lead1', client_id: 'c1', email: null, first_name: 'A', last_name: 'B', company: 'Acme', crm_existing: false }
  campaignRow = { id: 'camp1' }
  claimWins = true; enrollAfter = 0; isDemo = false
  vi.mocked(autoEnrollLead).mockClear()
})

const charged = () => rpcCalls.filter(r => r.fn === 'try_charge_wallet')

describe('ONE WALLET — approveLead ($4 flat, final)', () => {
  it('charges a flat $4, enrols prepaid, returns charged:true', async () => {
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect(charged()).toHaveLength(1)
    expect((charged()[0].args as { p_amount: number }).p_amount).toBe(4)
    expect(vi.mocked(autoEnrollLead)).toHaveBeenCalledWith('lead1', 'c1', { force: true, prepaid: true })
    expect((out as { charged?: boolean }).charged).toBe(true)
  })

  it('wallet below $4 → insufficient_funds, nothing moves, no enrol', async () => {
    rpcReturns.try_charge_wallet = false
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('insufficient_funds')
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled()
    // the wallet debit was attempted but returned false — it is the gate
    expect(charged()).toHaveLength(1)
  })

  it('dead email → the $4 is REVERSED, status no_email, no enrol', async () => {
    vi.mocked(await import('./enrichment')).waterfallEnrich.mockResolvedValueOnce({ email: null } as any)
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('no_email')
    const reverse = rpcCalls.find(r => r.fn === 'increment_wallet')
    expect(reverse).toBeTruthy()
    expect((reverse!.args as { p_amount: number }).p_amount).toBe(4)
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled()
  })

  it('already-owned email (#424) → approved, NOT charged, enrols prepaid', async () => {
    leadRow = { ...leadRow!, email: 'known@acme.com' }
    rpcReturns.reveal_is_owned = true
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect(charged()).toHaveLength(0)                                   // no $4 — already paid before
    expect((out as { charged?: boolean }).charged).toBe(false)
    expect(vi.mocked(autoEnrollLead)).toHaveBeenCalledWith('lead1', 'c1', { force: true, prepaid: true })
  })

  it('already in the client CRM → already_in_crm, no charge', async () => {
    leadRow = { ...leadRow!, crm_existing: true }
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('already_in_crm')
    expect(charged()).toHaveLength(0)
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled()
  })

  it('demo client → free (no charge), approved, enrols prepaid', async () => {
    isDemo = true
    leadRow = { ...leadRow!, email: 'demo@acme.com' }
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect(charged()).toHaveLength(0)
    expect((out as { charged?: boolean }).charged).toBe(false)
    expect(vi.mocked(autoEnrollLead)).toHaveBeenCalledWith('lead1', 'c1', { force: true, prepaid: true })
  })

  // REGRESSION GUARD — the $4 buys WORK. autoEnrollLead bails silently when the client has
  // no ACTIVE campaign, so charging first would debit the wallet, write no enrolment and
  // send nothing: paid-for-nothing, with no error and no refund. Fail closed instead.
  it('NO active campaign ⟹ does NOT charge, returns no_campaign, un-claims the lead', async () => {
    campaignRow = null
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('no_campaign')
    expect(out.revealed).toBe(false)
    expect(charged()).toHaveLength(0)                                   // wallet untouched
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled()
    // the claim is released so the lead can be approved again once we start their campaign
    expect(leadUpdates.some(u => u.revealed_at === null)).toBe(true)
  })

  it('NO active campaign ⟹ never reverses/credits the wallet either (nothing moved at all)', async () => {
    campaignRow = null
    await approveLead('lead1', 'c1')
    expect(rpcCalls.filter(r => r.fn === 'increment_wallet')).toHaveLength(0)
    expect(rpcCalls.filter(r => r.fn === 'try_charge_wallet')).toHaveLength(0)
  })

  it('re-approve of an already-approved lead (lost claim) takes NO new charge (idempotent)', async () => {
    claimWins = false
    leadRow = { ...leadRow!, revealed_at: '2026-07-23T00:00:00Z', email: 'known@acme.com' }
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect((out as { charged?: boolean }).charged).toBe(true)
    expect(charged()).toHaveLength(0)                                   // no second $4
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled()
  })

  it('pass charges NOTHING and releases nothing, marks the lead passed', async () => {
    leadRow = { id: 'lead1' }
    const out = await passLead('lead1', 'c1')
    expect(out.status).toBe('passed')
    expect(rpcCalls.length).toBe(0)                                     // zero money RPCs
    expect(leadUpdates.some(u => u.status === 'passed')).toBe(true)
  })
})
