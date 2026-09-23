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
//   • ~~legacy → allowed, a URL, one call — the model is preserved, not deleted~~
//     ⛓️ 23 Sep (R137): legacy and NULL are refused too — the model is retired for every account
//     ⛓️ 23 Sep (R137 · old-code removal): the handler and its session creators are DELETED;
//        every caller now gets 410 `retired`, and ④ proves the creators no longer exist
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
// ① + ② THE RETIRED PACK / TOP-UP DOOR, CALLED DIRECTLY — IT IS GONE, NOT FENCED
//
// ⛓️ RE-AIMED 23 Sep (R137 · old-code removal). WAS: ① refused a programme / unreadable /
// missing client with a 409 `not_on_this_model` (404 for a missing client), and ② (itself
// inverted earlier the same day from "legacy still buys") refused NULL and 'legacy' with the
// same 409, ahead of the amount rules and inside a mixed company. Founder, verbatim, for this
// removal: *"create its own PR to remove old code"*. The handler and the wallet / bundle /
// subscription session creators are DELETED, so there is no model check left to prove — the
// route answers 410 `retired` for every caller, whatever the row says or whether a row exists.
// Still proved the same way: by CALLING the handler and counting Stripe session calls.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① + ② a direct authenticated pack / top-up request — retired for everyone (R137)', () => {
  const cases: Array<[string, () => void, string]> = [
    ['programme',              () => client('programme'), USER],
    ['unreadable (no column)', () => client(undefined),   USER],
    ['commercial_model null',  () => client(null),        USER],
    ['legacy',                 () => client('legacy'),    USER],
    ['no client row at all',   () => {},                  'nobody'],
  ]
  for (const [label, seed, userId] of cases) {
    it(`🛑 ${label} → 410 retired, nothing charged, Stripe never reached`, async () => {
      seed()
      const { CHECKOUT_RETIRED_MESSAGE } = await import('./stripe')
      for (const amount of [40, 77, 100, 200, 299]) {
        const r = await postCheckout(amount, userId)
        expect(r.status, `$${amount}`).toBe(410)
        expect(r.payload.error).toBe('retired')
        expect(r.payload.message).toBe(CHECKOUT_RETIRED_MESSAGE)
        expect(r.payload.message, 'and it says nothing was charged').toContain('Nothing has been charged')
        expect(r.payload.url, 'no checkout URL of any kind').toBeUndefined()
      }
      expect(walletSession, 'NO SESSION IS EVER CREATED').not.toHaveBeenCalled()
      expect(subSession).not.toHaveBeenCalled()
      expect(progSession, 'and the programme door is not borrowed').not.toHaveBeenCalled()
    })
  }

  it('🛑 /stripe/subscribe is RETIRED — 410 for every account, and no subscription session', async () => {
    // ⚑ 23 Sep (R137). The monthly Milla / Vida / Denise subscriptions. Called directly, as a
    // client with a token could.
    for (const model of [null, 'legacy', 'programme'] as const) {
      state.clients = []; client(model); subSession.mockClear()
      const { stripeRouter, SUBSCRIBE_RETIRED_MESSAGE } = await import('./stripe')
      const layer = (stripeRouter as unknown as { stack: Array<Record<string, any>> }).stack
        .find(l => l.route?.path === '/subscribe' && l.route?.methods.post)
      if (!layer) throw new Error('POST /subscribe not found')
      const handler = layer.route.stack[layer.route.stack.length - 1].handle
      let payload: any = null; let status = 200
      const res: any = { json: (b: unknown) => { payload = b }, status: (x: number) => { status = x; return res } }
      await handler({ userId: USER, body: { product: 'milla' }, headers: { authorization: 'Bearer t' }, params: {}, query: {} }, res, () => {})
      expect(status, String(model)).toBe(410)
      expect(payload.error).toBe('retired')
      expect(payload.message).toBe(SUBSCRIBE_RETIRED_MESSAGE)
      expect(subSession, 'no subscription session is ever created').not.toHaveBeenCalled()
    }
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

  // ⛓️ RE-AIMED 23 Sep (R137 · old-code removal). WAS: '🛑 THE ONLY CALLER OF THE WALLET
  // SESSION IS THE GATED ROUTE' (one `createWalletCheckoutSession(` call site, after
  // `mayUseLegacyCommercialPath(model)`) and '🛑 THE CREDIT-BUNDLE SESSION CREATOR HAS NO CALLER AT
  // ALL' (the creator exported, never called). Both creators are now DELETED — the stronger state.
  it('🛑 THE RETIRED SESSION CREATORS NO LONGER EXIST — not exported, not called, not defined', () => {
    for (const name of ['createWalletCheckoutSession', 'createCheckoutSession', 'createSubscriptionCheckoutSession', 'checkoutLineName']) {
      expect(stripeLib, `lib/stripe.ts must not define ${name}`).not.toMatch(new RegExp(`function\\s+${name}\\s*\\(`))
      expect(stripeRoute, `routes/stripe.ts must not call ${name}`).not.toMatch(new RegExp(`[^a-zA-Z]${name}\\(`))
    }
  })

  it('🛑 BOTH RETIRED ROUTES ARE ONE-LINE 410s — no body read, no db read, no Stripe', () => {
    for (const path of ['/checkout', '/subscribe']) {
      const start = stripeRoute.indexOf(`stripeRouter.post('${path}'`)
      expect(start, `${path} still answers`).toBeGreaterThan(-1)
      const fn = stripeRoute.slice(start, stripeRoute.indexOf('\n})', start))
      expect(fn).toContain('res.status(410)')
      for (const banned of ['db.from', 'req.body', 'stripe.', 'Session(']) {
        expect(fn, `${path} must not touch ${banned}`).not.toContain(banned)
      }
    }
  })

  it('🛑 AND THE WEBHOOK IS KEPT — it reconciles money paid before the retirement', () => {
    expect(stripeRoute).toContain("stripeRouter.post('/webhook'")
    expect(stripeLib).toContain('export function constructWebhookEvent(')
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

  // ⛓️ 23 Sep (R137 · old-code removal): this read the `/subscribe` handler body between its own
  // line and the webhook's. That body is now a one-line 410, covered above — the check still
  // runs against the same slice and still holds.
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
