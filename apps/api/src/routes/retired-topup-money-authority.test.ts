// ═══════════════════════════════════════════════════════════════════════════════════════
// THE RETIRED TOP-UP GATE, PROVED BY CALLING IT — NOT BY READING IT
//
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────
//
// 🛑 I REPORTED THAT `/stripe/checkout` WAS "NOT ITSELF MODEL-GATED". THAT WAS WRONG.
// C2 (#1635, merged 3 Sep) put `mayUseLegacyCommercialPath` in front of it, and the refusal
// sits above `createWalletCheckoutSession` so no session is ever minted for a programme or
// unreadable client. I read the Command Centre's caller and inferred the callee.
//
// ── AND WHAT WAS ACTUALLY MISSING ───────────────────────────────────────────────────────
//
// The gate's only coverage was a SOURCE-SHAPE assertion in `commercial-model.test.ts`: it
// proves the literal `if (!mayUseLegacyCommercialPath(model)) { … return }` exists and precedes
// the session call. That is a good guard and it is not a behavioural proof — it cannot see a
// refactor that keeps the shape, and it never once asks the handler what it does.
//
// So this file makes a DIRECT AUTHENTICATED REQUEST, exactly as a client could with a token
// and curl, and asserts on the answer AND on whether Stripe was reached at all:
//
//   • the session creator is a spy, so "rejected before Stripe" is a CALL COUNT, not a comment
//   • programme · unreadable → refused, zero calls
//   • legacy → allowed, a URL, one call — the model is preserved, not deleted
//   • P1 and P2 go through a DIFFERENT route, module and session creator, and are untouched
//
// 🛑 NO REAL STRIPE CALL IS MADE AND NO PAYMENT IS SIMULATED. Every session creator is mocked;
// nothing here writes money state.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: { clients: Row[]; programmes: Row[]; txs: Row[] } =
  { clients: [], programmes: [], txs: [] }

function table(name: string) {
  const rows = (): Row[] =>
    name === 'programmes' ? state.programmes
    : name === 'credit_transactions' ? state.txs
    : state.clients
  const q: any = {
    _f: [] as ((r: Row) => boolean)[],
    select() { return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    neq(c: string, v: unknown) { q._f.push((r: Row) => r[c] !== v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    not() { return q }, gte() { return q }, order() { return q }, limit() { return q },
    _hit() { return rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r))) },
    async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
    async single() { return { data: q._hit()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) {
      return Promise.resolve({ data: q._hit(), error: null, count: q._hit().length }).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async () => ({ data: null, error: null }),
    auth: {
      getUser: async () => ({ data: { user: { email: 'buyer@example.com' } } }),
      admin: { getUserById: async () => ({ data: { user: { email: 'buyer@example.com' } } }) },
    },
  },
}))

// ── THE MONEY DOORS, EVERY ONE A SPY ────────────────────────────────────────────────────
// If a refusal is real, these counters stay at zero. That is the whole assertion.
const walletSession = vi.fn(async () => ({ url: 'https://stripe.test/wallet' }))
const subSession    = vi.fn(async () => ({ url: 'https://stripe.test/sub' }))
const progSession   = vi.fn(async () => ({ url: 'https://stripe.test/programme', sessionId: 'cs_prog' }))

vi.mock('../lib/stripe', async (orig) => {
  const actual = await (orig() as Promise<Record<string, unknown>>)
  return {
    ...actual,
    isStripeConfigured: () => true,
    createWalletCheckoutSession: (...a: unknown[]) => walletSession(...(a as [])),
    createSubscriptionCheckoutSession: (...a: unknown[]) => subSession(...(a as [])),
  }
})
vi.mock('../lib/programme-checkout', () => ({
  createProgrammeCheckoutSession: (...a: unknown[]) => progSession(...(a as [])),
  programmeStripeAmountCents: () => 45000,
}))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_q: unknown, _r: unknown, next: () => void) => next(),
}))

const CLIENT = 'c-1'
const USER   = 'u-1'
const PROG   = 'p-1'

/** One client row. `model === undefined` omits the column — a missing field is not a NULL. */
function client(model: string | null | undefined, id = CLIENT, userId = USER) {
  const row: Row = { id, user_id: userId, contact_email: 'buyer@example.com', company_id: null }
  if (model !== undefined) row.commercial_model = model
  state.clients.push(row)
}

async function postCheckout(amountUsd = 40, userId = USER) {
  const { stripeRouter } = await import('./stripe')
  const layer = (stripeRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/checkout' && l.route?.methods.post)
  if (!layer) throw new Error('POST /checkout not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null; let status = 200
  const res: any = { json: (b: unknown) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ userId, body: { amount_usd: amountUsd }, headers: { authorization: 'Bearer t' }, params: {}, query: {} }, res, () => {})
  return { payload, status }
}

async function postProgrammeCheckout(stage: 'first' | 'second') {
  const { programmeRouter } = await import('./programme')
  const path = `/:id/checkout/${stage}`
  const layer = (programmeRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === path && l.route?.methods.post)
  if (!layer) throw new Error(`POST ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null; let status = 200
  const res: any = { json: (b: unknown) => { payload = b }, status: (s: number) => { status = s; return res }, headersSent: false }
  await handler({ params: { id: PROG }, body: { successUrl: 's', cancelUrl: 'c' }, headers: {}, query: {} }, res, () => {})
  await new Promise(r => setTimeout(r, 0))   // `guard` wraps in a promise chain
  return { payload, status }
}

beforeEach(() => {
  state.clients = []; state.programmes = []; state.txs = []
  walletSession.mockClear(); subSession.mockClear(); progSession.mockClear()
  // A prior purchase, so the amount rules take the TOP-UP branch rather than the first-pack
  // branch. This is the retired top-up intent itself, which is what is under test.
  state.txs.push({ id: 'tx-1', client_id: CLIENT, type: 'wallet_topup' })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE RETIRED TOP-UP INTENT, CALLED DIRECTLY
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① a direct authenticated retired top-up request', () => {
  it('🛑 PROGRAMME — refused, and Stripe is never reached', async () => {
    client('programme')
    const r = await postCheckout()
    expect(r.status).toBe(409)
    expect(r.payload.error).toBe('not_on_this_model')
    expect(r.payload.message, 'and it says nothing was charged').toContain('Nothing has been charged')
    expect(walletSession, 'REJECTED BEFORE ANY SESSION IS CREATED').not.toHaveBeenCalled()
    expect(r.payload.url, 'no checkout URL of any kind').toBeUndefined()
  })

  it('🛑 UNREADABLE — fails closed, and Stripe is never reached', async () => {
    // The row carries NO `commercial_model` field at all.
    client(undefined)
    const r = await postCheckout()
    expect(r.status).toBe(409)
    expect(r.payload.error).toBe('not_on_this_model')
    expect(r.payload.message, 'the honest answer, not a charge').toContain('could not confirm your plan')
    expect(walletSession).not.toHaveBeenCalled()
  })

  it('🛑 A MISSING CLIENT IS NOT A LEGACY CLIENT', async () => {
    const r = await postCheckout(40, 'nobody')
    expect(r.status).toBe(404)
    expect(walletSession).not.toHaveBeenCalled()
  })

  it('🛑 AND THE REFUSAL IS NOT AN AMOUNT RULE — every preset is refused the same way', async () => {
    client('programme')
    for (const amount of [40, 100, 200]) {
      walletSession.mockClear()
      const r = await postCheckout(amount)
      expect(r.status, `$${amount}`).toBe(409)
      expect(walletSession).not.toHaveBeenCalled()
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② LEGACY IS PRESERVED — the fence must not be satisfiable by breaking the paying model
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② legacy still buys', () => {
  for (const model of [null, 'legacy'] as const) {
    it(`🛑 commercial_model ${String(model)} → a real checkout URL, exactly as today`, async () => {
      client(model)
      const r = await postCheckout(100)
      expect(r.status).toBe(200)
      expect(r.payload.url).toBe('https://stripe.test/wallet')
      expect(walletSession).toHaveBeenCalledTimes(1)
      expect(walletSession.mock.calls[0][0]).toMatchObject({ clientId: CLIENT, amountUsd: 100 })
    })
  }

  it('the existing amount rules are untouched — an off-preset top-up is still refused', async () => {
    client('legacy')
    const r = await postCheckout(77)
    expect(r.status).toBe(400)
    expect(r.payload.error).toBe('invalid_topup_amount')
    expect(walletSession).not.toHaveBeenCalled()
  })

  it('a legacy seat inside a MIXED company still buys its OWN wallet', async () => {
    // ⚠️ THIS ENDPOINT IS PER-CLIENT, NOT PER-COMPANY: it tops up the caller's own wallet and
    // cannot reach `companies.credit_pool` at all. The COMPANY-WIDE pool action is
    // `POST /company/pool/topup`, which refuses a mixed company — proved in
    // `command-centre-truth.test.ts` ⑪E. Suppressing this one too would take a legacy
    // customer's own working wallet away because a colleague moved to a programme.
    client('legacy')
    state.clients.push({ id: 'c-2', user_id: 'u-2', commercial_model: 'programme', company_id: 'co-1' })
    const r = await postCheckout(40)
    expect(r.status).toBe(200)
    expect(walletSession).toHaveBeenCalledTimes(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ P1 AND P2 ARE A DIFFERENT DOOR — and the retired gate never touches them
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ programme payments are unaffected', () => {
  beforeEach(() => {
    client('programme')
    state.programmes.push({
      id: PROG, client_id: CLIENT, status: 'APPROVED', meeting_target: 10,
      first_payment_ref: null, second_payment_ref: null, paused_at: null,
      review_required_at: null, went_live_at: null, approved_at: 'a',
    })
  })

  it('🛑 P1 — a PROGRAMME client still gets a first-payment checkout', async () => {
    const r = await postProgrammeCheckout('first')
    expect(r.status).toBe(200)
    expect(r.payload.url).toBe('https://stripe.test/programme')
    expect(progSession).toHaveBeenCalledTimes(1)
    expect(progSession.mock.calls[0][0]).toMatchObject({ clientId: CLIENT, stage: 'programme_first' })
    expect(walletSession, 'and it never touches the retired wallet door').not.toHaveBeenCalled()
  })

  it('🛑 P2 — and a second-payment checkout', async () => {
    state.programmes[0].first_payment_ref = 'cs_first'
    const r = await postProgrammeCheckout('second')
    expect(r.status).toBe(200)
    expect(progSession).toHaveBeenCalledTimes(1)
    expect(progSession.mock.calls[0][0]).toMatchObject({ stage: 'programme_second' })
    expect(walletSession).not.toHaveBeenCalled()
  })

  it('🛑 AND THE PROGRAMME DOOR KEEPS ITS OWN STATE RULES — a paused programme is still refused', async () => {
    state.programmes[0].first_payment_ref = 'cs_first'
    state.programmes[0].paused_at = '2026-09-01'
    const r = await postProgrammeCheckout('second')
    expect(r.status).toBe(400)
    expect(progSession, 'refused before the session, as founder lock 6 requires').not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ THE MONEY DOORS ARE ENUMERATED — no unlisted way to mint credits, a wallet or a pool
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ every retired money entry point is accounted for', () => {
  const src = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')
  const stripeRoute = src('routes/stripe.ts')
  const stripeLib   = src('lib/stripe.ts')
  const companyRoute = src('routes/company.ts')

  it('🛑 THE ONLY CALLER OF THE WALLET SESSION IS THE GATED ROUTE', () => {
    const callers = stripeRoute.split('\n').filter(l => l.includes('createWalletCheckoutSession(') && !l.trim().startsWith('*'))
    expect(callers, 'one call site, inside /checkout').toHaveLength(1)
    const fn = stripeRoute.slice(stripeRoute.indexOf("stripeRouter.post('/checkout'"))
    expect(fn.indexOf('mayUseLegacyCommercialPath(model)'))
      .toBeLessThan(fn.indexOf('createWalletCheckoutSession('))
  })

  it('🛑 THE CREDIT-BUNDLE SESSION CREATOR HAS NO CALLER AT ALL', () => {
    // `createCheckoutSession` mints a `type: 'credit_purchase'` session with `credits` /
    // `creditType` metadata — the retired PACK door. It is exported and, in the whole
    // repository, never called. The webhook branches that GRANT those credits are therefore
    // reachable only by an inbound signature-verified Stripe event, never by a client.
    expect(stripeLib).toContain('export async function createCheckoutSession(')
    expect(stripeRoute, 'no route mints a credit-bundle session').not.toMatch(/[^a-zA-Z]createCheckoutSession\(/)
  })

  it('🛑 NOTHING IN THE STRIPE PATH CAN REACH THE COMPANY CREDIT POOL', () => {
    expect(stripeRoute, 'companies.credit_pool is not written by any Stripe handler')
      .not.toContain('credit_pool')
    expect(stripeLib).not.toContain('credit_pool')
  })

  it('🛑 AND THE ONE POOL TOP-UP THAT EXISTS IS GATED', () => {
    const fn = companyRoute.slice(companyRoute.indexOf("companyRouter.post('/pool/topup'"))
    expect(fn).toContain('companyHasRetiredEconomics(ctx.companyId)')
    expect(fn.indexOf('companyHasRetiredEconomics'), 'refused before the pool is read')
      .toBeLessThan(fn.indexOf("db.from('companies')"))
  })

  it('🛑 SUBSCRIPTIONS ARE A DIFFERENT PRODUCT — they mint no credits, wallet or pool', () => {
    const fn = stripeRoute.slice(
      stripeRoute.indexOf("stripeRouter.post('/subscribe'"),
      stripeRoute.indexOf("stripeRouter.post('/webhook'"),
    )
    for (const banned of ['credit_pool', 'increment_wallet', 'creditType']) {
      expect(fn, `/subscribe must not touch ${banned}`).not.toContain(banned)
    }
  })
})
