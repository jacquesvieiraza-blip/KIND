// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME DELIVERY IS ECONOMICS-NEUTRAL — AND THAT IS PROVEN, NOT ASSERTED
//
// 🛑 THE FOUNDER'S RULING (2 Sep): "PROGRAMME ENROLMENT IS INCLUDED PROGRAMME FULFILMENT."
// P1/P2 pay for delivery. A programme prospect must never cost the customer a second time:
// no wallet gate, no wallet decrement, no $1 reveal, no $3 enrol, no credit transaction, no
// per-lead payment, invoice or revenue record.
//
// ⚠️ WHY THIS FILE EXISTS. `prepareProgrammeOutreach` requires `delivered_at`, and the act
// that writes `delivered_at` is `enrichAndDeliverLeads` — a function whose own header still
// says "Enrich + deliver + CHARGE" and whose comments say "charge 1 credit per delivered
// lead". Those sentences pre-date #420 and are now false: delivery has been free since the
// per-qualified-lead model landed, and the only executable money statement left in the file
// is an invariant that THROWS if that ever stops being true. Prose that describes a charge
// which no longer happens is exactly how a reviewer talks themselves into believing there is
// one — so the behaviour is pinned here rather than read off the comments.
//
// ⚠️ THE ASSERTION IS AN ALLOWLIST, NOT A SPOT-CHECK. Naming the tables that must not be
// written is a test that passes for every table nobody thought of. This records EVERY table
// the delivery path touches and every RPC it calls, and requires the write set to be exactly
// `leads` and the RPC list to be empty. A newly-added charge cannot slip past it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>

const state: {
  leads: Row[]
  clients: Row[]
  /** Every table an UPDATE / INSERT / UPSERT / DELETE was issued against. */
  written: string[]
  /** Every RPC name called. The money path in this repo is RPC-driven — `try_charge_wallet`,
   *  `try_charge_reveal_credit`, `try_charge_figsy_credit`, `record_reveal_or_refund` — so an
   *  empty RPC list is the strongest single statement that no charge was attempted. */
  rpcs: string[]
  /** Every table READ, so "did it even look at the wallet" can be answered separately from
   *  "did it spend it". Reading `clients` is not a charge, but it IS how a gate is built. */
  read: string[]
  /** Every founder alert raised, by kind. Delivery must raise none for a solvent-or-not
   *  programme client — an alert here would mean a wallet-shaped refusal fired somewhere. */
  alerts: string[]
} = { leads: [], clients: [], written: [], rpcs: [], read: [], alerts: [] }

function table(name: string) {
  const rows = () => (name === 'leads' ? state.leads : name === 'clients' ? state.clients : [])
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _mode: '', _payload: null as Row | null, _limit: 0,
    select() { state.read.push(name); return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    neq(c: string, v: unknown) { q._f.push((r: Row) => r[c] !== v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    not(c: string, op: string, v: unknown) {
      if (op === 'is' && v === null) { q._f.push((r: Row) => (r[c] ?? null) !== null); return q }
      q._f.push((r: Row) => r[c] !== v); return q
    },
    order() { return q },
    limit(n: number) { q._limit = n; return q },
    insert(p: Row) { q._mode = 'insert'; q._payload = p; state.written.push(name); return q },
    upsert(p: Row) { q._mode = 'insert'; q._payload = p; state.written.push(name); return q },
    delete() { q._mode = 'delete'; state.written.push(name); return q },
    update(p: Row) { q._mode = 'update'; q._payload = p; state.written.push(name); return q },
    _hit() {
      const all = rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r)))
      return q._limit > 0 ? all.slice(0, q._limit) : all
    },
    async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
    async single() { return { data: q._hit()[0] ?? null, error: null } },
    _run() {
      if (q._mode === 'update') { const h = q._hit(); for (const r of h) Object.assign(r, q._payload); return { data: h, error: null } }
      if (q._mode === 'insert') { const row = { id: `x${rows().length + 1}`, ...(q._payload as Row) }; rows().push(row); return { data: row, error: null } }
      return { data: q._hit(), error: null, count: q._hit().length }
    },
    then(res: (v: unknown) => unknown) { return Promise.resolve(q._run()).then(res) },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async (name: string) => { state.rpcs.push(name); return { data: null, error: null } },
  },
}))
// Providers are stubbed: this file is about money, not about enrichment. `bulkMatchEmails`
// returns nothing because every lead below already carries an address — the reveal branch is
// proved elsewhere, and calling it here would only add provider noise to a money assertion.
vi.mock('./apollo', () => ({ bulkMatchEmails: async () => new Map<string, string>() }))
vi.mock('./enrichment', () => ({ waterfallEnrich: async () => ({ email: null }) }))
vi.mock('./alerts', () => ({
  sendFounderAlert: (kind: string) => { state.alerts.push(kind); return Promise.resolve() },
}))

import { enrichAndDeliverLeads } from './lead-delivery'
import { deliveryCharge, deliveryCapBalance, normalizePlan, DAILY_BROWSE_CAP } from './billing-rules'

const HOUSE = 'house'
const PAYING = 'paying'
const LEGACY = 'legacy'
const P = 'P_NEW'

/** House as it actually is: a historical wallet nobody may spend, and an open programme. */
function seedHouse() {
  state.clients.push({ id: HOUSE, plan: 'figsy', credit_balance: 4000, figsy_credits_remaining: 4000 })
}
function seedPaying() {
  state.clients.push({ id: PAYING, plan: 'figsy', credit_balance: 0, figsy_credits_remaining: 0 })
}
function seedLegacy() {
  state.clients.push({ id: LEGACY, plan: 'lead_gen', credit_balance: 12, figsy_credits_remaining: 3 })
}
const lead = (id: string, clientId: string, programmeId: string | null) =>
  state.leads.push({
    id, client_id: clientId, programme_id: programmeId, apollo_id: `ap-${id}`,
    email: `${id}@example.com`, delivered_at: null, first_name: 'A', last_name: 'B',
    company: 'C', linkedin_url: null,
  })

const walletOf = (id: string) => {
  const c = state.clients.find(x => x.id === id)!
  return { credit_balance: c.credit_balance, figsy_credits_remaining: c.figsy_credits_remaining }
}

beforeEach(() => {
  state.leads = []; state.clients = []; state.written = []; state.rpcs = []
  state.read = []; state.alerts = []
  delete process.env.HUNTER_API_KEY
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① WHAT THE "CLAIM" ACTUALLY IS
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① the atomic claim in lead-delivery is an IDEMPOTENCY claim, not a money claim', () => {
  it('🛑 delivery NEVER charges — for either plan, and the rule is a function so it cannot drift', () => {
    // The invariant guard inside `enrichAndDeliverLeads` THROWS if this ever returns true, so
    // this is not decoration: flipping it turns every delivery in production into an exception.
    expect(deliveryCharge('lead_gen').charge).toBe(false)
    expect(deliveryCharge('figsy').charge).toBe(false)
  })

  it('🛑 the delivery cap is a flat browse allowance — the wallet does not gate it', () => {
    // A zero wallet and a $4,000 wallet return the SAME number. There is no balance in the
    // answer, so there is no balance-shaped refusal for a programme client to run into.
    expect(deliveryCapBalance('figsy', 0, 0)).toBe(DAILY_BROWSE_CAP)
    expect(deliveryCapBalance('figsy', 4000, 4000)).toBe(DAILY_BROWSE_CAP)
    expect(deliveryCapBalance('lead_gen', null, null)).toBe(DAILY_BROWSE_CAP)
    expect(normalizePlan(null)).toBe('lead_gen')
  })

  it('a repeat delivery of the same lead claims nothing the second time', async () => {
    seedHouse(); lead('L1', HOUSE, P)
    expect(await enrichAndDeliverLeads(HOUSE, ['L1'])).toBe(1)
    // The claim is `.is('delivered_at', null)`. Second call: the row is already stamped, so it
    // is not re-claimed — which is all the "claim" was ever protecting.
    expect(await enrichAndDeliverLeads(HOUSE, ['L1'])).toBe(0)
    expect(state.rpcs).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② HOUSE — ZERO SPEND AGAINST THE HISTORICAL WALLET
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② House programme delivery does not touch the historical wallet', () => {
  it('🛑 delivered_at IS written, the ~$4k wallet is UNCHANGED, and no money table is written', async () => {
    seedHouse()
    lead('L1', HOUSE, P); lead('L2', HOUSE, P)
    const before = walletOf(HOUSE)

    const n = await enrichAndDeliverLeads(HOUSE, ['L1', 'L2'])

    expect(n).toBe(2)
    // 5. `delivered_at` is written correctly, which is what programme review depends on.
    for (const l of state.leads) expect(l.delivered_at, 'delivery must be recorded truthfully').toBeTruthy()
    // The wallet is byte-identical.
    expect(walletOf(HOUSE)).toEqual(before)
    // 🛑 THE ALLOWLIST. Exactly one table is written, and it is not a money table.
    expect([...new Set(state.written)], 'delivery may write ONLY the leads table').toEqual(['leads'])
    // And no charge was even attempted — every charge in this repo goes through an RPC.
    expect(state.rpcs, 'no charge RPC may be called').toEqual([])
  })

  it('🛑 a client with a ZERO wallet still receives its programme leads', async () => {
    // House is comped, but a programme client need not be. Prove the zero case directly: if
    // any wallet gate survived anywhere in this path, this is the call that would return 0.
    state.clients.push({ id: HOUSE, plan: 'figsy', credit_balance: 0, figsy_credits_remaining: 0 })
    lead('L1', HOUSE, P)

    expect(await enrichAndDeliverLeads(HOUSE, ['L1'])).toBe(1)
    expect(state.leads[0].delivered_at).toBeTruthy()
    expect(state.rpcs).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ A PAYING PROGRAMME CLIENT IS NOT CHARGED TWICE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ a paying programme client incurs no per-lead charge after P1/P2', () => {
  it('🛑 no credit transaction, no reveal, no enrol charge, no invoice — nothing but delivered_at', async () => {
    seedPaying()
    lead('L1', PAYING, P); lead('L2', PAYING, P); lead('L3', PAYING, P)

    expect(await enrichAndDeliverLeads(PAYING, ['L1', 'L2', 'L3'])).toBe(3)
    expect(walletOf(PAYING)).toEqual({ credit_balance: 0, figsy_credits_remaining: 0 })
    expect([...new Set(state.written)]).toEqual(['leads'])
    expect(state.rpcs).toEqual([])
    // ⚠️ NAMED EXPLICITLY AS WELL AS BY ALLOWLIST, because these are the five records the
    // founder's ruling forbids by name. The allowlist above already covers them; naming them
    // makes the refusal legible to somebody reading the ruling rather than the code.
    for (const t of ['credit_transactions', 'client_reveals', 'invoices', 'payments', 'figsy_enrollments']) {
      expect(state.written, `${t} must never be written by delivery`).not.toContain(t)
    }
  })

  it('the money-path RPCs are never reached by name', async () => {
    seedPaying(); lead('L1', PAYING, P)
    await enrichAndDeliverLeads(PAYING, ['L1'])
    for (const r of ['try_charge_wallet', 'try_charge_reveal_credit', 'try_charge_figsy_credit', 'record_reveal_or_refund', 'try_spend_sourcing']) {
      expect(state.rpcs, `${r} must not be called at delivery`).not.toContain(r)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ THE LEGACY CLIENT IS UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ a legacy client with NO programme keeps exactly the economics it had', () => {
  it('🛑 delivery is free for them too — it always was, since #420 — and their wallet is untouched', async () => {
    // ⚠️ THE POINT OF THIS TEST IS THAT NOTHING WAS TAKEN AWAY. Delivery has been free for
    // every client since the per-qualified-lead model; the legacy $1 reveal and $3 enrol are
    // charged by `approveLead` and `autoEnrollLead`, on different acts, and neither is on this
    // path. So "programme delivery costs nothing" required no exemption to be carved out of
    // legacy behaviour — there was no charge here to exempt anybody from.
    seedLegacy()
    lead('L1', LEGACY, null); lead('L2', LEGACY, null)
    const before = walletOf(LEGACY)

    expect(await enrichAndDeliverLeads(LEGACY, ['L1', 'L2'])).toBe(2)
    expect(walletOf(LEGACY), 'the legacy wallet is not spent BY DELIVERY, and was not before').toEqual(before)
    expect([...new Set(state.written)]).toEqual(['leads'])
    expect(state.rpcs).toEqual([])
  })

  it('🛑 the programme lead and the legacy lead take the IDENTICAL path — no branch was added', async () => {
    // ⚠️ THIS IS THE REGRESSION THAT MATTERS. If a future change makes programme delivery free
    // by adding a programme branch, it has also created a second delivery path that can drift.
    // The correct answer is that there is no branch: `enrichAndDeliverLeads` never reads
    // `programme_id` at all, so the two runs are indistinguishable.
    seedLegacy()
    lead('L_LEGACY', LEGACY, null)
    await enrichAndDeliverLeads(LEGACY, ['L_LEGACY'])
    const legacyWrites = [...state.written]; const legacyRpcs = [...state.rpcs]

    state.written = []; state.rpcs = []
    seedPaying()
    lead('L_PROG', PAYING, P)
    await enrichAndDeliverLeads(PAYING, ['L_PROG'])

    expect(state.written).toEqual(legacyWrites)
    expect(state.rpcs).toEqual(legacyRpcs)
  })

  it('an unemailable lead is still not delivered — the existing refusal is intact', async () => {
    seedLegacy()
    state.leads.push({ id: 'L_NONE', client_id: LEGACY, programme_id: null, apollo_id: null, email: null, delivered_at: null })
    expect(await enrichAndDeliverLeads(LEGACY, ['L_NONE'])).toBe(0)
    expect(state.leads[0].delivered_at ?? null).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ NO LOW-CREDIT / ZERO-CREDIT BEHAVIOUR IS TRIGGERED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ programme delivery triggers no low-credit or zero-credit behaviour', () => {
  it('🛑 a zero wallet produces the same delivery count as a full one', async () => {
    seedPaying()                       // 0 / 0
    lead('A1', PAYING, P)
    const poor = await enrichAndDeliverLeads(PAYING, ['A1'])

    state.leads = []; state.clients = []; state.written = []; state.rpcs = []
    seedHouse()                        // 4000 / 4000
    lead('B1', HOUSE, P)
    const rich = await enrichAndDeliverLeads(HOUSE, ['B1'])

    expect(poor).toBe(rich)
    expect(poor).toBe(1)
  })

  it('🛑 the drip\'s only balance refusal can never fire, because the balance is a constant', () => {
    // `routes/internal.ts` guards the drip with `if (balance < 1) continue`, where `balance`
    // is `deliveryCapBalance(...)`. That function returns DAILY_BROWSE_CAP regardless of the
    // wallet, so the refusal is unreachable for EVERY client — a programme client cannot be
    // skipped for being broke. Asserted as a value rather than as source text, because the
    // question is what the number IS, not what the line looks like.
    expect(deliveryCapBalance('figsy', 0, 0)).toBeGreaterThanOrEqual(1)
    expect(deliveryCapBalance('lead_gen', 0, 0)).toBeGreaterThanOrEqual(1)
    expect(deliveryCapBalance('figsy', null, undefined)).toBeGreaterThanOrEqual(1)
  })

  it('delivery emits no alert of any kind for a zero-wallet programme client', async () => {
    // The low-credit fences added in this PR live on the notification paths. Delivery is a
    // separate act and must not reach them at all: with every lead emailable there is no
    // reveal failure, so not even the `source_down` alert fires.
    seedPaying(); lead('L1', PAYING, P)
    await enrichAndDeliverLeads(PAYING, ['L1'])
    expect(state.alerts).toEqual([])
  })
})
