import { describe, it, expect, vi, beforeEach } from 'vitest'

// #562 — THE $99 WAS PAID OUT TWICE, AND THE FIX HAD NO TEST.
//
// `stripe.ts` credited **$99 to the wallet** on the first purchase, while `approve-lead.ts`
// read the SAME ledger row and granted the **pack — 100 free approvals**. So a client approved
// 100 for free with their wallet still holding $99, then spent that $99 at $4 a lead:
// ~24 more. One $99 bought ~124 leads instead of 100 — roughly $96 given away per client, on a
// pack already running at −$52 in month one.
//
// #541 states the design as "a counted quota, NOT a wallet credit", so this was a defect and
// not a decision. Neither file was wrong alone, and no keyword joined them — which is exactly
// why it survived until somebody read both.
//
// THE FIX IS ON MAIN AND WAS COMPLETELY UNTESTED. `pack-double-charge.test.ts` covers
// `chargeFigsyEnroll` (the *enrol* side of the pack), not this webhook's wallet decision. So
// the one line standing between us and giving away $96 a client had nothing pinning it.
//
// The decision is ledger-derived on purpose: "first purchase" is read from
// `credit_transactions` — already the source of truth for the pack — so the two can never
// disagree about which purchase this is.

type Rpc = { fn: string; args: Record<string, unknown> }
const state = {
  /** prior PURCHASE rows for this client, EXCLUDING this session — what the count query returns */
  priorPurchases: 0,
  rpcs: [] as Rpc[],
  ledgerInserts: [] as Record<string, unknown>[],
  ledgerDeletes: 0,
  alerts: [] as { subject: string; lines: string[] }[],
  /** make increment_wallet fail, to prove the rollback still works on the top-up path */
  walletRpcError: null as { message: string } | null,
}

function query(table: string) {
  const q: Record<string, unknown> = {
    _count: false,
    select(_c?: string, opts?: { count?: string; head?: boolean }) { (q as { _count: boolean })._count = !!opts?.count; return q },
    eq() { return q }, in() { return q }, neq() { return q }, is() { return q },
    // ⛓️ 28 Aug — `not()` added when the wallet webhook began asking whether the client is
    // on a programme before it writes anything (BUILD-002 walkthrough fix). Without it the
    // chain returned undefined and the handler threw, which read as "the ledger row was
    // never written" — a mock gap wearing the costume of a real defect. supabase-js
    // returns the builder here, so this models it exactly.
    not() { return q },
    order() { return q }, limit() { return q },
    async maybeSingle() { return { data: null, error: null } },
    async single() { return { data: null, error: null } },
    insert(row: Record<string, unknown>) {
      if (table === 'credit_transactions') state.ledgerInserts.push(row)
      return { then: (r: (v: unknown) => unknown) => r({ error: null }) }
    },
    delete() {
      if (table === 'credit_transactions') state.ledgerDeletes++
      return { eq: () => ({ then: (r: (v: unknown) => unknown) => r({ error: null }) }) }
    },
    update() { return { eq: () => ({ then: (r: (v: unknown) => unknown) => r({ error: null }) }) } },
    then(resolve: (v: unknown) => unknown) {
      if ((q as { _count: boolean })._count && table === 'credit_transactions') {
        return resolve({ count: state.priorPurchases, error: null })
      }
      return resolve({ data: [], count: 0, error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => query(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpcs.push({ fn, args })
      if (fn === 'increment_wallet' && state.walletRpcError) return { data: null, error: state.walletRpcError }
      return { data: null, error: null }
    },
  },
}))
vi.mock('../lib/alerts', () => ({
  sendFounderAlert: async (_k: string, subject: string, lines: string[]) => { state.alerts.push({ subject, lines }) },
}))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))

const nextEvent = { value: null as unknown }
vi.mock('../lib/stripe', () => ({
  isStripeConfigured: () => true,
  listInvoicesByEmail: async () => [],
  createWalletCheckoutSession: async () => ({ url: null, error: null }),
  createSubscriptionCheckoutSession: async () => ({ url: null, error: null }),
  constructWebhookEvent: () => nextEvent.value,
  getSessionMetaByPaymentIntent: async () => null,
  getStripeSubscriptionPriceId: () => null,
  STRIPE_SUBSCRIPTIONS: {},
  STRIPE_BUNDLES: {},
}))

async function webhook() {
  const { stripeRouter } = await import('./stripe')
  const layer = (stripeRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/webhook' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /webhook not found on the stripe router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: { code: number } = { code: 200 }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    json() { return fakeRes }, sendStatus(c: number) { res.code = c; return fakeRes }, send() { return fakeRes },
  }
  await handler({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}'), params: {}, query: {} }, fakeRes, () => {})
  return res
}

const topUp = (amountUsd: string, sessionId = 'cs_1') => ({
  type: 'checkout.session.completed',
  data: { object: { id: sessionId, metadata: { type: 'wallet_topup', clientId: 'c1', amountUsd } } },
})

const walletCredits = () => state.rpcs.filter(r => r.fn === 'increment_wallet')
const allowanceCalls = () => state.rpcs.filter(r => r.fn === 'add_sourcing_allowance')
const settle = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  state.priorPurchases = 0
  state.rpcs = []
  state.ledgerInserts = []
  state.ledgerDeletes = 0
  state.alerts = []
  state.walletRpcError = null
  nextEvent.value = null
})

describe('the FIRST purchase buys the pack, and does NOT also credit the wallet', () => {
  beforeEach(() => { state.priorPurchases = 0; nextEvent.value = topUp('99') })

  it('does not call increment_wallet at all', async () => {
    // The whole defect in one assertion. Before the fix this credited $99 on top of the
    // 100 included leads — the client got the quota AND the money for ~24 more.
    await webhook()
    expect(walletCredits()).toHaveLength(0)
  })

  it('STILL writes the ledger row — the pack is derived from it', async () => {
    // The row is not bookkeeping: `approve-lead.ts` counts these rows to decide whether the
    // client holds a pack at all. Skipping the wallet must not skip the record, or the fix
    // would take the money and grant nothing.
    await webhook()
    expect(state.ledgerInserts).toHaveLength(1)
    expect(state.ledgerInserts[0]).toMatchObject({ client_id: 'c1', type: 'wallet_topup', amount: 99, reference: 'cs_1' })
  })

  it('STILL accrues the sourcing allowance — that is what funds finding the people', async () => {
    // `add_sourcing_allowance` is unaffected by the pack/wallet question: it accrues on every
    // payment. Suppressing it here would leave a paying client with a quota and no data budget
    // to fill it from.
    await webhook()
    expect(allowanceCalls()).toHaveLength(1)
    expect(allowanceCalls()[0].args).toMatchObject({ p_records: 198 })   // $99 × 2
  })

  it('raises no money alert — this is the ordinary happy path, not an exception', async () => {
    // Scoped to the subject rather than asserting an empty array. `subscription-write-errors
    // .test.ts` also drives this router, and when vitest schedules both files into one worker
    // the module graph is shared — so a global `toHaveLength(0)` on alerts flaked 1 run in 3
    // on the OTHER file's alerts, not on anything this code did. Filtering by subject asserts
    // the claim that actually matters and cannot be polluted.
    await webhook()
    await settle()
    expect(state.alerts.filter(a => /wallet|pack|purchase/i.test(a.subject))).toHaveLength(0)
  })
})

describe('every LATER purchase is a top-up and DOES credit the wallet', () => {
  beforeEach(() => { state.priorPurchases = 1; nextEvent.value = topUp('200', 'cs_2') })

  it('credits the full amount', async () => {
    // The other direction matters just as much: suppressing the credit on a top-up would take
    // $200 and give the client nothing at all.
    await webhook()
    expect(walletCredits()).toHaveLength(1)
    expect(walletCredits()[0].args).toMatchObject({ p_client_id: 'c1', p_amount: 200 })
  })

  it('a second $99 is a top-up, not a second pack', async () => {
    // The pack is once. A repeat $99 credits $99 of wallet — which is the behaviour #567
    // discusses, and is deliberately NOT a second 100 included leads.
    nextEvent.value = topUp('99', 'cs_3')
    await webhook()
    expect(walletCredits()[0].args).toMatchObject({ p_amount: 99 })
  })

  it('a failed wallet credit rolls the ledger row back so Stripe can retry', async () => {
    // Paid-safe: the ledger row is the idempotency key, so leaving it behind after a failed
    // credit would make Stripe's retry a no-op and the client would never get their money.
    state.walletRpcError = { message: 'deadlock detected' }
    const res = await webhook()
    await settle()
    expect(state.ledgerDeletes).toBe(1)
    expect(res.code).toBe(500)
    expect(state.alerts.some(a => a.subject.includes('Wallet credit failed'))).toBe(true)   // by subject, per the note above
  })
})

describe('the decision is read from the ledger, not guessed', () => {
  it('the count EXCLUDES this session — otherwise the first purchase would look like a second', async () => {
    // `.neq('reference', session.id)` is load-bearing. The ledger row for THIS payment is
    // written before the count runs, so without the exclusion `priorPurchases` would be 1 on
    // a genuine first purchase and the pack client would be credited after all — the original
    // bug, reintroduced through the back door.
    state.priorPurchases = 0
    nextEvent.value = topUp('99')
    await webhook()
    expect(walletCredits()).toHaveLength(0)
  })

  it('an unparseable amount is refused before any money moves', async () => {
    nextEvent.value = topUp('not-a-number')
    await webhook()
    expect(walletCredits()).toHaveLength(0)
    expect(state.ledgerInserts).toHaveLength(0)
  })
})
