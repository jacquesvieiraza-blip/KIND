// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME OUTREACH PREPARATION — THE SPINE, END TO END
//
// A programme could reach LIVE and be unable to work a single lead: no campaign was created
// by any lifecycle path, `autoEnrollLead` had already refused those leads before Live, and
// every enrolment required a legacy FIGSY credit it would then have spent.
//
// ── THE FOUNDER'S RULING (2 Sep) ────────────────────────────────────────────────────────
// "PROGRAMME ENROLMENT IS INCLUDED PROGRAMME FULFILMENT." P1/P2 pay for delivery; enrolment
// is not separately billable, must not require or decrement the wallet, and must not create
// per-lead revenue. Legacy clients keep their wallet economics exactly as they are.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const state: {
  programmes: Row[]; icps: Row[]; leads: Row[]; campaigns: Row[]; enrollments: Row[]; clients: Row[]
  charges: string[]; sends: string[]; ensureCalls: { clientId: string; icpId: string; activate: boolean }[]
  ensureRefuses: boolean; blocklist: Row[]
} = {
  programmes: [], icps: [], leads: [], campaigns: [], enrollments: [], clients: [],
  charges: [], sends: [], ensureCalls: [], ensureRefuses: false, blocklist: [],
}

/** A tiny in-memory Supabase stand-in that honours eq / in / not / limit. */
function table(name: keyof typeof state) {
  const rows = () => state[name] as Row[]
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _mode: '' as string, _payload: null as Row | null,
    select() { return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    gt(c: string, v: unknown) { q._f.push((r: Row) => String(r[c]) > String(v)); return q },
    neq(c: string, v: unknown) { q._f.push((r: Row) => r[c] !== v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    in(c: string, list: unknown[]) { q._f.push((r: Row) => list.includes(r[c] as never)); return q },
    not(c: string, op: string, v: unknown) {
      if (op === 'is' && v === null) { q._f.push((r: Row) => (r[c] ?? null) !== null); return q }
      const set = String(v).replace(/[()]/g, '').split(',')
      q._f.push((r: Row) => !set.includes(String(r[c]))); return q
    },
    order() { return q }, limit() { return q },
    insert(p: Row) { q._mode = 'insert'; q._payload = p; return q },
    update(p: Row) { q._mode = 'update'; q._payload = p; return q },
    _hit() { return rows().filter(r => q._f.every(f => f(r))) },
    async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
    async single() { return q._mode === 'insert' ? q._run() : { data: q._hit()[0] ?? null, error: null } },
    _run() {
      if (q._mode === 'insert') {
        const row = { id: `${String(name)}-${rows().length + 1}`, ...(q._payload as Row) }
        rows().push(row); return { data: row, error: null }
      }
      if (q._mode === 'update') { const h = q._hit(); for (const r of h) Object.assign(r, q._payload); return { data: h, error: null } }
      return { data: q._hit(), error: null, count: q._hit().length }
    },
    then(res: (v: unknown) => unknown) { return Promise.resolve(q._run()).then(res) },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(
      t === 'programmes' ? 'programmes' : t === 'icps' ? 'icps' : t === 'leads' ? 'leads'
      : t === 'figsy_campaigns' ? 'campaigns' : t === 'figsy_enrollments' ? 'enrollments'
      : t === 'opt_out_blocklist' ? 'blocklist' : 'clients',
    ),
    rpc: async () => ({ data: null, error: null }),
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))

// `ensureCampaignForIcp` is the real product's only door to an active campaign. It is stubbed
// so this file can drive the ORDERING and the refusal path deterministically; what it decides
// is proved against the real function in `house-authority.test.ts`.
vi.mock('./start-work', () => ({
  ensureCampaignForIcp: async (clientId: string, icpId: string, _n: string | null, opts?: { activate?: boolean }) => {
    state.ensureCalls.push({ clientId, icpId, activate: opts?.activate === true })
    if (state.ensureRefuses) return { refused: { reason: 'programme_not_live', message: 'not live' } }
    const found = state.campaigns.find(c => c.icp_id === icpId && c.client_id === clientId)
    if (found) { found.status = 'active'; return { id: found.id as string } }
    const row = { id: `camp-${state.campaigns.length + 1}`, client_id: clientId, icp_id: icpId, status: 'active', leads_enrolled: 0 }
    state.campaigns.push(row)
    return { id: row.id }
  },
}))

// The real `autoEnrollLead` is a very large function whose own economics are proved in
// `house-authority.test.ts`. Here it is replaced with a recorder that reproduces exactly the
// two decisions this file is about: does it charge the wallet, and does it send?
vi.mock('./figsy', () => ({
  autoEnrollLead: async (leadId: string, clientId: string, opts?: { programmeFulfilment?: { programmeId: string } }) => {
    const { verifyProgrammeFulfilment } = await import('./programme-preparation')
    if (opts?.programmeFulfilment) {
      const v = await verifyProgrammeFulfilment(leadId, clientId, opts.programmeFulfilment.programmeId)
      if (!v.ok) return                                  // refused: no row, no charge, no send
    } else {
      const c = state.clients.find(x => x.id === clientId)
      if (((c?.figsy_credits_remaining as number) ?? 0) < 1) return   // the legacy wallet gate
      state.charges.push(leadId)                                       // the legacy wallet charge
    }
    const lead = state.leads.find(l => l.id === leadId)
    state.enrollments.push({
      id: `enr-${state.enrollments.length + 1}`, lead_id: leadId, client_id: clientId,
      programme_id: lead?.programme_id ?? null, campaign_id: state.campaigns[0]?.id ?? null,
      status: 'enrolled',
    })
    // ⚠️ NOTHING IS PUSHED TO `sends`. Preparation prepares; the send is a separate decision
    // made later by AUTO_OUTREACH_ENABLED or the founder's Run-once.
  },
}))

import { prepareProgrammeOutreach, verifyProgrammeFulfilment, PREPARE_BUDGET } from './programme-preparation'

const P_NEW = 'P_NEW'
const H = 'house'

function seedProgrammeReadyForLive(over: Row = {}) {
  state.programmes.push({
    id: P_NEW, client_id: H, status: 'APPROVED', approved_at: 'a',
    meeting_target: 4, recommended_volume: 1000, sourcing_ceiling: 1000,
    sourced_used: 0, sourced_reserved: 0,
    first_authorised_at: 'i1', second_authorised_at: 'i2',
    first_paid_at: null, second_paid_at: null,
    first_payment_ref: null, second_payment_ref: null,
    first_payment_intent_id: null, second_payment_intent_id: null,
    paused_at: null, went_live_at: null, ...over,
  })
  state.icps.push({ id: 'ICP_NEW', client_id: H, name: 'Programme targeting', programme_id: P_NEW, is_active: true })
  state.clients.push({ id: H, figsy_credits_remaining: 0, is_demo: false })
}
const newLead = (id: string, over: Row = {}) =>
  state.leads.push({
    id, client_id: H, icp_id: 'ICP_NEW', programme_id: P_NEW, delivered_at: 'd',
    status: 'scored', email: `${id.toLowerCase()}@example.com`,
    opted_out_at: null, provider_eviction_required_at: null, ...over,
  })

beforeEach(() => {
  state.programmes = []; state.icps = []; state.leads = []; state.campaigns = []
  state.enrollments = []; state.clients = []
  state.charges = []; state.sends = []; state.ensureCalls = []; state.ensureRefuses = false
  state.blocklist = []
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE HOUSE SPINE, END TO END
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① a House programme becomes OPERABLE, and costs nothing to do so', () => {
  it('🛑 campaign + enrolment exist, the wallet is untouched, and NO email is sent', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    newLead('L_NEW_1'); newLead('L_NEW_2')
    // House holds ZERO FIGSY credits — the legacy gate would have refused every enrolment.
    expect(state.clients[0].figsy_credits_remaining).toBe(0)

    const r = await prepareProgrammeOutreach(P_NEW)

    expect(r.complete, r.problems.join(' | ')).toBe(true)
    expect(r.remaining).toBe(0)
    expect(r.campaigns).toHaveLength(1)
    expect(r.enrolled).toEqual(['L_NEW_1', 'L_NEW_2'])
    // Included fulfilment: no wallet charge, and the balance is not consulted as a gate.
    expect(state.charges, 'programme enrolment must never charge the wallet').toEqual([])
    expect(state.clients[0].figsy_credits_remaining, 'the wallet balance is unchanged').toBe(0)
    // Preparation is not sending.
    expect(state.sends, 'preparation must send nothing').toEqual([])
    // Every enrolment carries the exact programme.
    for (const e of state.enrollments) expect(e.programme_id).toBe(P_NEW)
  })

  it('the campaign is created ACTIVE for the attached ICP, by the programme itself', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    newLead('L1')
    await prepareProgrammeOutreach(P_NEW)
    expect(state.ensureCalls).toEqual([{ clientId: H, icpId: 'ICP_NEW', activate: true }])
  })

  it('🛑 HISTORICAL NULL-ATTRIBUTED LEADS ARE NOT IN THE SET AT ALL', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    newLead('L_NEW')
    // House's retired desk: same client, same shape, no programme attribution.
    state.leads.push({ id: 'L_OLD_1', client_id: H, icp_id: 'ICP_OLD', programme_id: null, delivered_at: 'd', status: 'scored' })
    state.leads.push({ id: 'L_OLD_2', client_id: H, icp_id: 'ICP_OLD', programme_id: null, delivered_at: 'd', status: 'scored' })

    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.enrolled).toEqual(['L_NEW'])
    expect(state.enrollments.map(e => e.lead_id)).toEqual(['L_NEW'])
    // ⚠️ AND THE SELECTION ITSELF EXCLUDED THEM — not merely the second gate downstream.
    // Two independent defences: `prepareProgrammeOutreach` selects by `programme_id`, and
    // `verifyProgrammeFulfilment` refuses anything null-attributed. If only the second were
    // doing the work, the historical leads would have been ATTEMPTED and each failure would
    // surface here as a problem. A clean run proves they were never candidates.
    expect(r.problems, 'history must never even be attempted').toEqual([])
    expect(r.ok).toBe(true)
  })

  it('another programme\'s leads and another client\'s leads are excluded', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    newLead('L_NEW')
    state.leads.push({ id: 'L_OTHER_PROG', client_id: H, icp_id: 'ICP_NEW', programme_id: 'P_OTHER', delivered_at: 'd', status: 'scored' })
    state.leads.push({ id: 'L_OTHER_CLIENT', client_id: 'mbf', icp_id: 'ICP_NEW', programme_id: P_NEW, delivered_at: 'd', status: 'scored' })
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.enrolled).toEqual(['L_NEW'])
  })

  it('ineligible work is excluded by the EXISTING rules, not new ones', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    newLead('L_OK')
    newLead('L_UNDELIVERED', { delivered_at: null })
    newLead('L_OPTED_OUT', { status: 'opted_out' })
    newLead('L_REJECTED', { status: 'rejected' })
    newLead('L_PASSED', { status: 'passed' })
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.enrolled).toEqual(['L_OK'])
  })

  it('🛑 IDEMPOTENT — a second preparation duplicates nothing', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    newLead('L1'); newLead('L2')
    const first = await prepareProgrammeOutreach(P_NEW)
    expect(first.enrolled).toHaveLength(2)

    const second = await prepareProgrammeOutreach(P_NEW)
    expect(second.complete).toBe(true)
    expect(second.enrolled, 'nothing new on a repeat').toEqual([])
    expect(second.alreadyEnrolled).toBe(2)
    expect(state.enrollments, 'no duplicate enrolment row').toHaveLength(2)
    expect(state.campaigns, 'no duplicate campaign').toHaveLength(1)
    expect(state.charges).toEqual([])
    expect(state.sends).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② AUTHORITY — THE WALLET BYPASS IS UNLOCKED BY NOTHING ELSE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② programme fulfilment is verified from the database, never from the caller', () => {
  beforeEach(() => { seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' }); newLead('L1') })

  it('accepts the genuine article', async () => {
    const v = await verifyProgrammeFulfilment('L1', H, P_NEW)
    expect(v.ok).toBe(true)
  })

  const refusals: [string, () => void][] = [
    ['a null-attributed lead', () => { state.leads[0].programme_id = null }],
    ['a lead of another programme', () => { state.leads[0].programme_id = 'P_OTHER' }],
    ['a lead of another client', () => { state.leads[0].client_id = 'mbf' }],
    ['a paused programme', () => { state.programmes[0].paused_at = 'p' }],
    ['a terminal programme', () => { state.programmes[0].status = 'CANCELLED' }],
    ['a programme with no approval', () => { state.programmes[0].approved_at = null }],
    ['a programme with no P2 authority', () => { state.programmes[0].second_authorised_at = null }],
    ['a programme still SOURCING', () => { state.programmes[0].status = 'SOURCING' }],
    ['an ICP not attached to the programme', () => { state.icps[0].programme_id = null }],
    ['an ICP of another programme', () => { state.icps[0].programme_id = 'P_OTHER' }],
    ['an ICP of another client', () => { state.icps[0].client_id = 'mbf' }],
    ['a lead with no ICP', () => { state.leads[0].icp_id = null }],
  ]
  for (const [label, mutate] of refusals) {
    it(`🛑 refuses ${label} — no free enrolment`, async () => {
      mutate()
      const v = await verifyProgrammeFulfilment('L1', H, P_NEW)
      expect(v.ok, label).toBe(false)
    })
  }

  it('🛑 A NULL-ATTRIBUTED LEAD IS REFUSED BY ITS OWN CHECK, not only by the id comparison', async () => {
    // Both guards must independently hold. `null !== 'P_NEW'` would catch this case anyway,
    // so the explicit null check is asserted on its own terms — otherwise removing it looks
    // harmless, and the next person to pass a null programmeId inherits a hole.
    state.leads[0].programme_id = null
    const v = await verifyProgrammeFulfilment('L1', H, P_NEW)
    expect(v.ok).toBe(false)
    expect(v.ok === false && v.reason).toBe('lead carries no programme attribution')
  })

  it('EITHER source of P2 satisfies it — paid or internal', async () => {
    state.programmes[0].second_authorised_at = null
    state.programmes[0].second_paid_at = 'x'; state.programmes[0].second_payment_ref = 'cs_2'
    expect((await verifyProgrammeFulfilment('L1', H, P_NEW)).ok).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ FAILURE IS VISIBLE, AND RETRY COMPLETES IT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ a programme that could not be prepared never reports itself operable', () => {
  it('no attached ICP → not operable, and it says why', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    state.icps[0].programme_id = null
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.ok).toBe(false)
    expect(r.problems.join(' ')).toMatch(/No ICP is attached/)
    expect(state.enrollments).toHaveLength(0)
  })

  it('🛑 CAMPAIGN REFUSED → NOT OPERABLE, and no lead is enrolled into nothing', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    newLead('L1')
    state.ensureRefuses = true
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.ok).toBe(false)
    expect(r.problems.join(' ')).toMatch(/No programme campaign could be made available/)
    expect(state.enrollments).toHaveLength(0)
  })

  it('a programme with no eligible lead is NOT operable — nothing to send is not success', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.complete).toBe(false)
    expect(r.problems.join(' ')).toMatch(/nothing to send/)
  })

  it('🛑 RETRY AFTER A FAILURE COMPLETES WHAT IS MISSING, without duplicating', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    newLead('L1')
    state.ensureRefuses = true
    expect((await prepareProgrammeOutreach(P_NEW)).ok).toBe(false)
    expect(state.enrollments).toHaveLength(0)

    state.ensureRefuses = false            // the operator fixed the cause
    const retry = await prepareProgrammeOutreach(P_NEW)
    expect(retry.complete, retry.problems.join(' | ')).toBe(true)
    expect(retry.enrolled).toEqual(['L1'])
    expect(state.enrollments).toHaveLength(1)
    expect(state.campaigns).toHaveLength(1)
  })

  it('preparation refuses outright before APPROVED — P2 alone is not sending authority', async () => {
    seedProgrammeReadyForLive({ status: 'SOURCING_AUTHORISED', approved_at: null })
    newLead('L1')
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.ok).toBe(false)
    expect(state.enrollments).toHaveLength(0)
    expect(state.ensureCalls, 'no campaign may be created before approval').toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ THE LEGACY CLIENT IS UNTOUCHED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ a client with no programme keeps wallet economics exactly as they are', () => {
  it('the legacy path still gates on the wallet and still charges it', async () => {
    // No programme anywhere — the ordinary $299 pack client.
    state.clients.push({ id: 'pack', figsy_credits_remaining: 5, is_demo: false })
    state.leads.push({ id: 'LEG_1', client_id: 'pack', icp_id: 'ICP_L', programme_id: null, delivered_at: 'd', status: 'scored' })
    const { autoEnrollLead } = await import('./figsy')
    await autoEnrollLead('LEG_1', 'pack')
    expect(state.charges, 'the legacy enrolment still charges the wallet').toEqual(['LEG_1'])
    expect(state.enrollments).toHaveLength(1)
    expect(state.enrollments[0].programme_id).toBeNull()
  })

  it('and a legacy client with an empty wallet still cannot enrol', async () => {
    state.clients.push({ id: 'pack', figsy_credits_remaining: 0, is_demo: false })
    state.leads.push({ id: 'LEG_2', client_id: 'pack', icp_id: 'ICP_L', programme_id: null, delivered_at: 'd', status: 'scored' })
    const { autoEnrollLead } = await import('./figsy')
    await autoEnrollLead('LEG_2', 'pack')
    expect(state.enrollments, 'the wallet gate still bites for legacy work').toHaveLength(0)
    expect(state.charges).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ THE SOURCE ITSELF — one mechanism, both Live paths, no wallet, no send
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ both Live paths reach the same preparation', () => {
  const API = join(__dirname, '..')
  const strip = (s: string) => s.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
  const prog = strip(readFileSync(join(API, 'lib/programme.ts'), 'utf8'))

  it('🛑 goLiveProgramme (House) prepares AFTER the transition and reports failure', () => {
    const at = prog.indexOf('export async function goLiveProgramme')
    const f = prog.slice(at, at + 3000)
    expect(f).toContain('const prep = await prepareProgrammeOutreach(programmeId)')
    // ⛓️ THE ORDER IS NOW THE OTHER WAY, and that is the correction. LIVE is durable evidence
    // that preparation SUCCEEDED, so it is written last — a response saying "preparation
    // failed" is read once by one caller, while the ROW is read by every later reader.
    expect(f.indexOf('prepareProgrammeOutreach')).toBeLessThan(f.indexOf("status: 'LIVE'"))
    expect(f, 'an incomplete preparation must not transition').toContain('if (!prep.complete)')
    expect(f).toContain('was NOT taken live because outreach preparation did not complete')
    expect(f, 'it stays APPROVED and can send nothing').toContain('It remains APPROVED and can send nothing')
  })

  it('🛑 recordSecondPayment (paying client) prepares too — the same function', () => {
    const at = prog.indexOf('export async function recordSecondPayment')
    const f = prog.slice(at, at + 4200)
    expect(f).toContain('const prep = await prepareProgrammeOutreach(params.programmeId)')
    expect(f, 'the paid path must report an incomplete preparation').toContain('preparationIncomplete: true')
    // The money write no longer carries the status — payment truth and operational truth are
    // two separate writes now.
    expect(f).toContain('.update(base)')
    expect(f.indexOf('.update(base)')).toBeLessThan(f.indexOf('prepareProgrammeOutreach'))
    expect(f.indexOf('prepareProgrammeOutreach')).toBeLessThan(f.indexOf("status: 'LIVE', went_live_at"))
  })

  it('🛑 AND THE PAYMENT IS NEVER ROLLED BACK BY A PREPARATION FAILURE', () => {
    const at = prog.indexOf('export async function recordSecondPayment')
    const f = prog.slice(at, at + 4200)
    // The money write commits before preparation is even called.
    expect(f.indexOf('second_payment_ref: params.sessionId')).toBeLessThan(f.indexOf('prepareProgrammeOutreach'))
    // ⚠️ ASSERTED ON CODE, NOT PROSE — `strip()` removes comments, so a phrase from one can
    // never be the evidence. The money update is unconditional: `.update(base)` with no
    // ternary, unlike the old `blocked ? base : {...base, status:'LIVE'}` it replaced.
    expect(f, 'the money write must carry no status branch').not.toMatch(/\.update\(blocked \?/)
    // …and nothing undoes it.
    // ⚠️ THE ASSERTION IS ABOUT THE WRITE, NOT THE PROSE. A first version also forbade the
    // word "refund", which matched the honest alert sentence "nothing was refunded or
    // reversed" — a check that failed on the very text proving the property.
    expect(f, 'the payment fields are never un-written').not.toMatch(/second_payment_ref:\s*null/)
    expect(f, 'the paid timestamp is never un-written').not.toMatch(/second_paid_at:\s*null/)
    expect(f, 'the alert says plainly that nothing was reversed').toContain('Nothing was refunded, reversed or invented')
  })

  it('🛑 PREPARATION NEVER PASSES `force` — it is fulfilment, not a purchase', () => {
    // `force` means "a human approval bought this work" AND it bypasses the send kill-switch
    // bail. Adding it here would both lie about why the work happened and make preparation
    // capable of sending.
    const prep = strip(readFileSync(join(API, 'lib/programme-preparation.ts'), 'utf8'))
    expect(prep).toContain('autoEnrollLead(lead.id, p.client_id, { programmeFulfilment: { programmeId } })')
    expect(prep, 'preparation must never force').not.toMatch(/force:\s*true/)
  })

  it('the programme-fulfilment flag starts NULL and is only set by a verified check', () => {
    const fig = strip(readFileSync(join(API, 'lib/figsy.ts'), 'utf8'))
    // If this were initialised to anything truthy, EVERY enrolment — legacy included — would
    // skip the wallet.
    expect(fig).toContain('let programmeFulfilment: { programmeId: string } | null = null')
    expect(fig).toContain('programmeFulfilment = opts.programmeFulfilment')
  })

  it('there is ONE preparation implementation, not two', () => {
    const calls = (prog.match(/prepareProgrammeOutreach\(/g) ?? [])
    expect(calls.length, 'both Live paths, one function').toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ VOLUME — 2,000 MUST NEVER SILENTLY MEAN "COMPLETE"
// ═══════════════════════════════════════════════════════════════════════════════════════
//
// R77 sizes a programme at 250 prospects per targeted meeting, so a ten-meeting programme is
// 2,500 people. The first version of this file stopped at a hard `.limit(2000)` and reported
// the programme operable — 500 real prospects prepared for nobody, and a LIVE label over them.
describe('⑥ the full eligible set is prepared, and anything left blocks LIVE', () => {
  const seedN = (n: number) => { for (let i = 0; i < n; i++) newLead(`L${String(i).padStart(6, '0')}`) }

  it('0 eligible leads → NOT complete, and it says there is nothing to send', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.complete).toBe(false)
    expect(r.total).toBe(0)
    expect(r.problems.join(' ')).toMatch(/nothing to send/)
  })

  it('1 eligible lead → complete, nothing remaining', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    seedN(1)
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.complete).toBe(true)
    expect(r.total).toBe(1); expect(r.enrolled).toHaveLength(1); expect(r.remaining).toBe(0)
  })

  it('🛑 EXACTLY 2,000 — the old cap boundary — is prepared IN FULL', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    seedN(2000)
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.total).toBe(2000)
    expect(r.enrolled).toHaveLength(2000)
    expect(r.remaining).toBe(0)
    expect(r.complete).toBe(true)
  })

  it('🛑 2,001 — one past the old cap — is NOT silently truncated', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    seedN(2001)
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.total).toBe(2001)
    expect(r.enrolled, 'the 2,001st must not be dropped').toHaveLength(2001)
    expect(r.remaining).toBe(0)
    expect(r.complete).toBe(true)
  })

  it('🛑 2,500 — a real ten-meeting programme — is prepared IN FULL', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    seedN(2500)
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.total).toBe(2500)
    expect(r.enrolled).toHaveLength(2500)
    expect(r.remaining).toBe(0)
    expect(r.complete).toBe(true)
    // Pagination must not duplicate across page boundaries.
    expect(new Set(state.enrollments.map(e => e.lead_id)).size).toBe(2500)
    expect(state.enrollments).toHaveLength(2500)
    // …and still no wallet, still no send.
    expect(state.charges).toEqual([]); expect(state.sends).toEqual([])
  })

  it('🛑 BEYOND THE BUDGET → remaining > 0 AND complete === false', async () => {
    // The invariant the founder set: `remaining > 0` ⇒ never LIVE. Proved at the budget
    // boundary rather than assumed, because this is the branch that used to lie.
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    seedN(PREPARE_BUDGET + 25)
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.enrolled).toHaveLength(PREPARE_BUDGET)
    expect(r.remaining, 'the overflow is reported, never rounded up').toBe(25)
    expect(r.complete).toBe(false)
  })

  it('…and a retry finishes the overflow without duplicating anything', async () => {
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    seedN(PREPARE_BUDGET + 25)
    await prepareProgrammeOutreach(P_NEW)
    const retry = await prepareProgrammeOutreach(P_NEW)
    expect(retry.enrolled).toHaveLength(25)
    expect(retry.alreadyEnrolled).toBe(PREPARE_BUDGET)
    expect(retry.remaining).toBe(0)
    expect(retry.complete).toBe(true)
    expect(new Set(state.enrollments.map(e => e.lead_id)).size).toBe(PREPARE_BUDGET + 25)
  })

  it('every page re-applies the programme AND client filter', async () => {
    // A paginated query that narrows only on its first page is how one drifts into another
    // tenant. Two full pages of foreign rows sit either side of the real ones by id order.
    seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' })
    seedN(1200)
    for (let i = 0; i < 600; i++) {
      state.leads.push({ id: `A${String(i).padStart(6, '0')}`, client_id: H, icp_id: 'ICP_NEW', programme_id: 'P_OTHER', delivered_at: 'd', status: 'scored', email: `a${i}@x.com`, opted_out_at: null, provider_eviction_required_at: null })
      state.leads.push({ id: `Z${String(i).padStart(6, '0')}`, client_id: 'mbf', icp_id: 'ICP_NEW', programme_id: P_NEW, delivered_at: 'd', status: 'scored', email: `z${i}@x.com`, opted_out_at: null, provider_eviction_required_at: null })
    }
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.total).toBe(1200)
    expect(r.enrolled).toHaveLength(1200)
    for (const e of state.enrollments) expect(e.programme_id).toBe(P_NEW)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑦ ELIGIBILITY — NO ACTIVE ENROLMENT FOR SOMEBODY PERMANENTLY INELIGIBLE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑦ preparation reuses the existing suppression truth', () => {
  beforeEach(() => seedProgrammeReadyForLive({ status: 'LIVE', went_live_at: 'w' }))

  const excluded: [string, Row][] = [
    ['status opted_out', { status: 'opted_out' }],
    ['status rejected', { status: 'rejected' }],
    ['status passed', { status: 'passed' }],
    ['opted_out_at set', { opted_out_at: 'now' }],
    ['provider eviction owed', { provider_eviction_required_at: 'now' }],
    ['no email address', { email: null }],
    ['not delivered', { delivered_at: null }],
  ]
  for (const [label, over] of excluded) {
    it(`🛑 excludes ${label}`, async () => {
      newLead('L_OK'); newLead('L_BAD', over)
      const r = await prepareProgrammeOutreach(P_NEW)
      expect(r.enrolled, label).toEqual(['L_OK'])
      expect(state.enrollments.map(e => e.lead_id)).toEqual(['L_OK'])
    })
  }

  it('🛑 excludes anyone on the CROSS-CLIENT opt-out blocklist', async () => {
    // A person who opted out through any client is suppressed for all of them, and that fact
    // lives in `opt_out_blocklist`, not on the lead row — the same table the send path reads.
    newLead('L_OK'); newLead('L_BLOCKED')
    state.blocklist.push({ email: 'l_blocked@example.com' })
    const r = await prepareProgrammeOutreach(P_NEW)
    expect(r.enrolled).toEqual(['L_OK'])
    expect(r.skipped).toBe(1)
  })

  it('an unreadable blocklist FAILS CLOSED — not knowing is not permission', async () => {
    newLead('L1')
    const realFrom = (await import('@kind/db')).db.from
    ;(await import('@kind/db')).db.from = ((t: string) =>
      t === 'opt_out_blocklist'
        ? ({ select: () => ({ in: async () => ({ data: null, error: { message: 'reset' } }) }) } as never)
        : realFrom(t)) as typeof realFrom
    try {
      const r = await prepareProgrammeOutreach(P_NEW)
      expect(r.complete).toBe(false)
      expect(r.problems.join(' ')).toMatch(/opt-out blocklist/)
      expect(state.enrollments).toHaveLength(0)
    } finally { (await import('@kind/db')).db.from = realFrom }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑧ A PARTIALLY PREPARED PROGRAMME GAINS NO SEND AUTHORITY
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑧ partial preparation cannot be sent, by anyone, until it completes', () => {
  it('🛑 CAMPAIGN + SOME ENROLMENTS + A FAILURE → still APPROVED, and no send authority', async () => {
    const { mayStartCampaign, authorityFor } = await import('./programme')
      .then(async m => ({ mayStartCampaign: m.mayStartCampaign, authorityFor: (await import('./programme-authority')).authorityFor }))
    // The programme is APPROVED with P2 — everything except the transition.
    const row = {
      id: P_NEW, client_id: H, status: 'APPROVED', approved_at: 'a', went_live_at: null,
      second_authorised_at: 'i', second_paid_at: null, second_payment_ref: null,
      paused_at: null,
    } as never
    // Neither gate grants anything to a non-LIVE programme, however many rows already exist.
    expect(mayStartCampaign(row).allowed, 'the campaign gate refuses a non-LIVE programme').toBe(false)
    expect(authorityFor(row, 'OUTREACH').allowed, 'outreach authority refuses it too').toBe(false)
  })

  it('and the send-selection layer only ever offers the OPEN programme\'s own work', () => {
    const sd = readFileSync(join(join(__dirname, '..'), 'lib/send-due.ts'), 'utf8')
    expect(sd).toContain("return (e as { programme_id?: string | null }).programme_id === openId")
  })
})
