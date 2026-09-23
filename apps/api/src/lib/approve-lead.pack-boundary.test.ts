import { describe, it, expect, vi, beforeEach } from 'vitest'

// ⚑ 23 Sep (R137) — 🧪 LEGACY-ERA FIXTURE. Production no longer resolves any client to the retired
// per-lead model (founder: *"the 299/4 is retired/ this must go."*), so the code this file tests
// is unreachable from production and is removed, with these tests, by its own follow-up PR.
// Until then it runs against the resolver exactly as it stood before R137 — the only state in
// which it was reachable — rather than being deleted or skipped (R131). See
// `apps/api/test-support/legacy-era-commercial-model.ts`; production's behaviour is proven in
// `commercial-model.test.ts`, which does not use it.
vi.mock('./commercial-model', async (importOriginal) =>
  (await import('../../test-support/legacy-era-commercial-model'))
    .legacyEraCommercialModel(await importOriginal()))

// THE 100th APPROVAL OF "100 INCLUDED" WAS CHARGED $4.
//
// `approve-lead.ts` claims the lead by setting `revealed_at` (the atomic once-per-lead gate)
// and THEN counts rows where `revealed_at is not null` to decide where the client sits against
// their pack. So the count included the lead being approved right now: at approval #100 it
// read 100, `packState` returned `left: 0`, and `try_charge_wallet` took $4 for the hundredth
// of the hundred they had already paid for.
//
// `onboarding-pack.test.ts` asserts `packState(true, 99).left === 1` and PASSES — it calls the
// pure function with 99 while the route hands it 100. That is the same failure as the min-20
// gate whose 18 unit tests passed on a bypassable route, so this file drives `approveLead`
// itself and counts the RPC calls. A pure-function test cannot catch an off-by-one that lives
// in the caller.
//
// These counts are what the route reads, per table:
//   • credit_transactions (count) → has this client ever paid?  → pack active
//   • leads (count, revealed_at not null) → approvals INCLUDING the one being made now

const rpcCalls: Array<{ fn: string; args: unknown }> = []
let rpcReturns: Record<string, unknown> = {}
let leadRow: Record<string, unknown> | null = null
let purchaseCount = 1
/** Approvals AFTER the claim — i.e. what the route's count query actually returns. */
let approvedCountIncludingThisOne = 1
let emailUpdateFails = false
let existingChargeRow: { id: string } | null = null
/** false ⟹ the atomic claim matches no rows, i.e. this lead was already approved. */
let claimWins = true
const inserts: Array<{ table: string; row: any }> = []
const deletes: string[] = []

function makeQuery(table: string) {
  const q: any = {
    _isCount: false, _refEq: null as string | null, _typeEq: null as string | null,
    update(row: Record<string, unknown>) { q._update = row; return q },
    insert(row: unknown) { inserts.push({ table, row }); return { then: (r: any) => r({ error: null }) } },
    delete() { q._delete = true; return q },
    select(_c?: string, opts?: { count?: string; head?: boolean }) { q._isCount = !!opts?.count; return q },
    eq(col: string, val: unknown) {
      if (col === 'reference') q._refEq = String(val)
      if (col === 'type') q._typeEq = String(val)
      return q
    },
    neq() { return q }, is() { return q }, in() { return q }, not() { return q },
    order() { return q }, limit() { return q },
    async maybeSingle() {
      // ⚑ 3 Sep (PR B) — THIS FIXTURE'S CLIENT IS A LEGACY PACK CLIENT WITH NO PROGRAMME, and
      // it now has to SAY so. `approveLead` opens with the legacy per-lead fence, which reads
      // `programmes` for an open row and FAILS CLOSED on anything it cannot interpret. The
      // fallthrough below answered every unknown table with `leadRow`, so the fence read a
      // lead as a programme and refused — a fixture gap, not a behaviour change. The $299 pack
      // model this file tests is exactly the no-programme case the founder locked as
      // UNCHANGED, so the honest answer here is "no programme", stated rather than implied.
      if (table === 'programmes') return { data: null, error: null }
      // ⛓️ 3 Sep (C2) — THE CLIENT ROW CARRIES THE COLUMN, because `clientCommercialModel`
      // selects it and a MISSING FIELD is now `unreadable` rather than a NULL. A fixture that
      // answers `select('commercial_model')` with a row that has no such key was never faithful
      // to PostgREST, which either returns the column or errors. `commercial_model: null` is the
      // UNCLASSIFIED state the whole live book holds, so every assertion keeps its meaning.
      if (table === 'clients') return { data: { id: 'c1', commercial_model: null }, error: null }
      if (table === 'figsy_campaigns') return { data: { id: 'camp1' }, error: null }
      // The re-approve path asks the ledger "was a wallet charge written for this lead?"
      if (table === 'credit_transactions') return { data: existingChargeRow, error: null }
      return { data: leadRow, error: null }
    },
    async single() { return { data: leadRow, error: null } },
    then(resolve: (v: unknown) => unknown) {
      if (q._isCount) {
        return resolve({ count: table === 'credit_transactions' ? purchaseCount : approvedCountIncludingThisOne, error: null })
      }
      if (q._delete) { deletes.push(String(q._refEq)); return resolve({ error: null }) }
      // The email-persist update — the one that used to be swallowed.
      if (q._update && table === 'leads' && 'email' in q._update) {
        return resolve({ error: emailUpdateFails ? { message: 'column leads.email is read only' } : null })
      }
      // The atomic claim.
      if (q._update && table === 'leads') return resolve({ data: claimWins ? [leadRow] : [], error: null })
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => makeQuery(t),
    rpc: async (fn: string, args: unknown) => { rpcCalls.push({ fn, args }); return { data: rpcReturns[fn], error: null } },
  },
}))
vi.mock('./figsy', () => ({ autoEnrollLead: vi.fn(async () => {}) }))
vi.mock('./enrichment', () => ({ waterfallEnrich: vi.fn(async () => ({ email: 'found@acme.com' })) }))
vi.mock('./demo', () => ({ isDemoClient: vi.fn(async () => false) }))
vi.mock('./billing-rules', () => ({ normalizeRevealEmail: (e: string | null) => (e ? e.toLowerCase() : null) }))
vi.mock('./alerts', () => ({ sendFounderAlert: vi.fn(async () => {}) }))

import { approveLead } from './approve-lead'
import { autoEnrollLead } from './figsy'

beforeEach(() => {
  rpcCalls.length = 0; inserts.length = 0; deletes.length = 0
  rpcReturns = { try_charge_wallet: true, increment_wallet: null, record_reveal_or_refund: 'charged', reveal_is_owned: false }
  // See approve-lead.test.ts: an allowed country keeps step 3d's launch hold out of a file
  // whose subject is the pack boundary.
  leadRow = { id: 'lead1', client_id: 'c1', email: 'known@acme.com', first_name: 'A', last_name: 'B', company: 'Acme', country: 'United States', crm_existing: false }
  purchaseCount = 1
  approvedCountIncludingThisOne = 1
  emailUpdateFails = false
  existingChargeRow = null
  claimWins = true
  vi.mocked(autoEnrollLead).mockClear()
})

const walletCharges = () => rpcCalls.filter(r => r.fn === 'try_charge_wallet')
const packRows     = () => inserts.filter(i => i.table === 'credit_transactions' && i.row?.type === 'usage')

describe('the pack boundary — 100 included means 100', () => {
  it('the FIRST approval is free', async () => {
    approvedCountIncludingThisOne = 1
    const out = await approveLead('lead1', 'c1')
    expect(out).toMatchObject({ status: 'approved', charged: false })
    expect(walletCharges()).toHaveLength(0)
  })

  it('the 100th approval is FREE — this is the bug', async () => {
    // 99 approvals before this one, so the route's post-claim count reads 100.
    // Before the fix: packState(true, 100) → left 0 → $4 taken for an included lead.
    approvedCountIncludingThisOne = 100
    const out = await approveLead('lead1', 'c1')
    expect(walletCharges()).toHaveLength(0)
    expect(out).toMatchObject({ status: 'approved', charged: false })
  })

  it('the 101st approval IS charged $4', async () => {
    approvedCountIncludingThisOne = 101
    const out = await approveLead('lead1', 'c1')
    expect(walletCharges()).toHaveLength(1)
    expect((walletCharges()[0].args as { p_amount: number }).p_amount).toBe(4)
    expect(out).toMatchObject({ status: 'approved', charged: true })
  })

  it('the boundary is exactly at 100 — not 99, not 101', async () => {
    // Walked rather than asserted at one point, because an off-by-one is invisible from a
    // single sample. 100 free, then charged from 101 on.
    for (const n of [1, 50, 99, 100]) {
      rpcCalls.length = 0
      approvedCountIncludingThisOne = n
      await approveLead('lead1', 'c1')
      expect(walletCharges(), `approval #${n} must be free`).toHaveLength(0)
    }
    for (const n of [101, 150]) {
      rpcCalls.length = 0
      approvedCountIncludingThisOne = n
      await approveLead('lead1', 'c1')
      expect(walletCharges(), `approval #${n} must be charged`).toHaveLength(1)
    }
  })

  it('the ledger note numbers the approval correctly — the first is "1 of 100"', async () => {
    // `pack.used + 1` double-counted, because `used` already included this lead: a client's
    // first approval was recorded in their own ledger as "approval 2 of 100".
    approvedCountIncludingThisOne = 1
    await approveLead('lead1', 'c1')
    expect(packRows()).toHaveLength(1)
    expect(String(packRows()[0].row.note)).toContain('approval 1 of 100')
  })

  it('a client who never paid gets NO free approvals', async () => {
    purchaseCount = 0
    approvedCountIncludingThisOne = 1
    await approveLead('lead1', 'c1')
    expect(walletCharges()).toHaveLength(1)
  })
})

describe('a re-approve tells the truth about whether money moved', () => {
  it('a re-approve of a lead covered by the PACK reports charged:false', async () => {
    // The lost-claim path hardcoded `charged: true`, so a double-click, a retry or a refresh
    // on a lead covered by the included 100 told the client "$4 charged" for an approval that
    // cost nothing. #541 fixed this on the first-approval path and missed this one. The fix
    // asks the ledger what happened: a wallet charge writes `lead:<id>`, a pack approval
    // writes `pack_<id>` at $0.
    claimWins = false                 // already revealed → the claim matches nothing
    existingChargeRow = null          // and no wallet_charge row exists → it was free
    const out = await approveLead('lead1', 'c1')
    expect(out).toMatchObject({ status: 'approved', revealed: true, charged: false })
    expect(walletCharges()).toHaveLength(0)   // and re-approving never charges again
  })

  it('a re-approve of a lead that WAS charged reports charged:true', async () => {
    claimWins = false
    existingChargeRow = { id: 'tx1' }  // a wallet_charge row exists → money did move
    const out = await approveLead('lead1', 'c1')
    expect(out).toMatchObject({ status: 'approved', revealed: true, charged: true })
    expect(walletCharges()).toHaveLength(0)
  })

  it('a re-approve of a lead with no email is not reported as approved', async () => {
    claimWins = false
    leadRow = { id: 'lead1', client_id: 'c1', email: null, crm_existing: false }
    const out = await approveLead('lead1', 'c1')
    expect(out).toMatchObject({ status: 'no_email', revealed: false })
  })
})

describe('the email write is no longer swallowed', () => {
  it('a failed email write returns the money, releases the claim, and does not claim success', async () => {
    // It was `.then(() => {}, () => {})`. On failure: $4 gone, revealed_at set, email never
    // stored — and the atomic claim then blocks every retry, so the lead could NEVER be
    // re-revealed. The client paid for a contact we permanently lost, silently.
    approvedCountIncludingThisOne = 101      // past the pack, so real money moves
    emailUpdateFails = true
    const out = await approveLead('lead1', 'c1')
    expect(out).toMatchObject({ status: 'no_email', revealed: false })
    expect(walletCharges()).toHaveLength(1)                       // it was charged…
    expect(rpcCalls.some(r => r.fn === 'increment_wallet')).toBe(true)  // …and returned
  })

  it('inside the pack, a failed email write hands the SLOT back rather than crediting $4', async () => {
    // Crediting $4 for a pack approval would pay the client money they never spent.
    approvedCountIncludingThisOne = 5
    emailUpdateFails = true
    const out = await approveLead('lead1', 'c1')
    expect(out.status).toBe('no_email')
    expect(rpcCalls.some(r => r.fn === 'increment_wallet')).toBe(false)
    expect(deletes).toContain('pack_lead1')
  })
})
