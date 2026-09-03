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
    async maybeSingle() {
      // ⚑ 3 Sep (PR B) — A LEGACY CLIENT WITH NO PROGRAMME, STATED RATHER THAN IMPLIED.
      // `approveLead` now opens with the legacy per-lead fence, which reads `programmes`
      // and fails closed on anything it cannot interpret. Without this line the fallthrough
      // answered that read with `leadRow` and the fence saw a lead as an open programme.
      // These tests are the $299 pack model — the no-programme case the founder locked as
      // UNCHANGED — so "no programme" is the honest fixture answer.
      if (table === 'programmes') return { data: null, error: null }
      // ⛓️ 3 Sep (C2) — THE CLIENT ROW CARRIES THE COLUMN, because `clientCommercialModel`
      // selects it and a MISSING FIELD is now `unreadable` rather than a NULL. A fixture that
      // answers `select('commercial_model')` with a row that has no such key was never faithful
      // to PostgREST, which either returns the column or errors. `commercial_model: null` is the
      // UNCLASSIFIED state the whole live book holds, so every assertion keeps its meaning.
      if (table === 'clients') return { data: { id: 'c1', commercial_model: null }, error: null }
      return { data: table === 'figsy_campaigns' ? campaignRow : leadRow, error: null }
    },
    async single() {
      if (table === 'programmes') return { data: null, error: null }
      // ⛓️ 3 Sep (C2) — THE CLIENT ROW CARRIES THE COLUMN, because `clientCommercialModel`
      // selects it and a MISSING FIELD is now `unreadable` rather than a NULL. A fixture that
      // answers `select('commercial_model')` with a row that has no such key was never faithful
      // to PostgREST, which either returns the column or errors. `commercial_model: null` is the
      // UNCLASSIFIED state the whole live book holds, so every assertion keeps its meaning.
      if (table === 'clients') return { data: { id: 'c1', commercial_model: null }, error: null }
      return { data: table === 'figsy_campaigns' ? campaignRow : leadRow, error: null }
    },
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
  // `country` is set because step 3d holds any lead outside the launch allowlist BEFORE the
  // charge — a fixture with no country would be refused for geography and this file would
  // stop testing the money at all. The launch gate has its own file; here it must not fire.
  leadRow = { id: 'lead1', client_id: 'c1', email: null, first_name: 'A', last_name: 'B', company: 'Acme', country: 'United States', crm_existing: false }
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

// ── STEP 3d — THE LAUNCH-COUNTRY HOLD, AND WHY IT LIVES ON THE MONEY PATH ─────────────────
//
// Founder-locked 20 Aug: at launch we send to the US and the UK, and nowhere else. His words on
// what that must cost the client: **"never charged"**.
//
// ⚠️ THE DEFECT THIS PREVENTS IS AN ORDERING DEFECT, NOT A MISSING GATE.
//
// The obvious home for a country check is the enrol path, and there IS one there. But follow the
// order this function actually runs in:
//
//     step 4    try_charge_wallet          ← the $4 leaves the client's wallet
//     step 5    reveal the email
//     step 8    autoEnrollLead(...)        ← where the enrol-side country gate lives
//
// So with ONLY the enrol gate, a held lead is revealed, charged $4, and refused afterwards. The
// client pays for outreach we knew we would never run, the ledger looks correct, and nothing
// errors. That is precisely the charge-then-refuse #332 forbids, and it is exactly the shape of
// the #625 no-campaign bug — a gate that was real but sat on the wrong side of the till.
//
// These tests therefore assert on `try_charge_wallet` CALL COUNT, not on the returned status. A
// status assertion alone would pass on a version of this file that charges first and refuses
// second, which is the only version that matters to get wrong.
describe('step 3d — a lead outside the launch countries is HELD, and never charged', () => {
  const held = (country: string | null) => { leadRow = { ...leadRow!, country } }

  it('RED PROOF — with the enrol gate ALONE, the $4 is taken before the refusal ever runs', async () => {
    // The pre-fix ordering, reproduced from the real sequence of steps in this function. This is
    // what "gate it at enrolment" actually buys you: a charged client and a held lead.
    const oldOrder = (country: string | null) => {
      const events: string[] = []
      events.push('try_charge_wallet')                 // step 4 — unconditional
      events.push('reveal_email')                      // step 5
      if (!['United States', 'United Kingdom'].includes(country ?? '')) events.push('enrol_refused')
      return events
    }
    expect(oldOrder('Nigeria')).toEqual(['try_charge_wallet', 'reveal_email', 'enrol_refused'])  // ← RED
    expect(oldOrder('Nigeria')[0]).toBe('try_charge_wallet')
  })

  it('NEW behaviour, REAL FUNCTION: a Nigerian lead is not charged a cent', async () => {
    held('Nigeria')
    const out = await approveLead('lead1', 'c1')

    expect(out.status).toBe('launch_hold')
    expect(out.revealed).toBe(false)
    expect(charged(), 'THE ASSERTION THAT MATTERS — the wallet was never touched').toHaveLength(0)
    expect(rpcCalls.filter(r => r.fn === 'increment_wallet'), 'and nothing was refunded, because nothing was taken').toHaveLength(0)
    expect(vi.mocked(autoEnrollLead)).not.toHaveBeenCalled()
  })

  it('the lead is UN-CLAIMED, so it returns to the queue instead of being consumed', async () => {
    // A hold is a pause on OUR side. Leaving `revealed_at` set would mark the lead permanently
    // approved without an email ever being bought — it would vanish from the client's queue and
    // never come back the day the country opens.
    held('Nigeria')
    await approveLead('lead1', 'c1')
    expect(leadUpdates.some(u => u.revealed_at === null)).toBe(true)
  })

  it('names the country back, so an operator is never guessing which rule fired', async () => {
    held('Nigeria')
    const out = await approveLead('lead1', 'c1')
    expect((out as { country?: string | null }).country).toBe('Nigeria')
  })

  it('⚠️ A BLANK COUNTRY IS HELD TOO — the inversion of the PECR gate, and it was chosen', async () => {
    // `pecrVerdict` ALLOWS an unknown country; this gate refuses it. We cannot claim a lead is in
    // the US or the UK when nothing on the row says so, and the cost — the founder's own export
    // showed 166 of 166 leads with no country — was taken knowingly.
    held(null)
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('launch_hold')
    expect(charged()).toHaveLength(0)
    expect((out as { country?: string | null }).country).toBeNull()
  })

  it('a US lead and a UK lead are charged and enrolled exactly as before', async () => {
    // The gate must refuse the right leads AND ONLY THOSE. A hold that also caught the countries
    // we launched in would read as "the allowlist works" while stopping every send we want.
    for (const country of ['United States', 'united states', 'USA', 'United Kingdom', 'GB', 'Scotland']) {
      // `enrollAfter` is what the count queries read, and the mocked `autoEnrollLead` sets it to
      // 1 — so without this reset the SECOND iteration looks like a client who has bought the
      // pack, the approval comes out free, and the assertion fails for a reason that has nothing
      // to do with countries. Full per-iteration reset, not a partial one.
      rpcCalls.length = 0; leadUpdates.length = 0; enrollAfter = 0
      vi.mocked(autoEnrollLead).mockClear()
      held(country)
      const out = await approveLead('lead1', 'c1')
      expect(out.status, country).toBe('approved')
      expect(charged(), country).toHaveLength(1)
    }
  })

  it('⛓️ a SOUTH AFRICAN lead is charged and enrolled — it was held until 20 Aug', async () => {
    // ⛓️ South Africa was in the HELD set when this gate shipped earlier the same day. The
    // founder's rule is *"my launch rule is US, UK and South Africa"* (R54), so this is the
    // money gate for a third of the launch book — and the failure it guards against is silent
    // in the expensive direction: a held SA lead is not an error anybody sees, it is a sale
    // that quietly does not happen.
    for (const country of ['South Africa', 'south africa', 'ZA', 'RSA']) {
      rpcCalls.length = 0; leadUpdates.length = 0; enrollAfter = 0
      vi.mocked(autoEnrollLead).mockClear()
      held(country)
      const out = await approveLead('lead1', 'c1')
      expect(out.status, country).toBe('approved')
      expect(charged(), country).toHaveLength(1)
      expect(vi.mocked(autoEnrollLead), country).toHaveBeenCalled()
    }
  })

  it('a DEMO client is exempt — pinned on a country that is genuinely held', async () => {
    // Step 2 returns before 3d ever runs. Pinned here rather than assumed: a launch hold that
    // caught demo leads would silently break every walkthrough and every sales demo, and the
    // symptom ("the demo stopped working") points nowhere near a country allowlist.
    //
    // ⛓️ THIS TEST USED `'South Africa'` AND WENT VACUOUS ON 20 Aug. Its comment read *"the demo
    // book is entirely South African"* — true, and the reason it was chosen. The moment R54
    // opened South Africa the lead would be approved with or without the demo exemption, so the
    // test would have gone on passing while proving nothing: the #617 shape exactly. Swapped to
    // Nigeria, which is still held, so the exemption is what the green actually means.
    isDemo = true
    held('Nigeria')
    leadRow = { ...leadRow!, email: 'demo@acme.com' }
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('approved')
    expect(charged()).toHaveLength(0)
  })

  it('fires AFTER the free exits — an already-in-CRM lead is still reported as already-in-CRM', async () => {
    // Ordering among the refusals matters for the CLIENT'S reading of what happened. A lead they
    // already own is not a launch-hold story, and telling them "we can't send there yet" about a
    // contact that was never going to be charged anyway is a confusing, wrong answer.
    held('Nigeria')
    leadRow = { ...leadRow!, crm_existing: true }
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('already_in_crm')
    expect(charged()).toHaveLength(0)
  })
})
