import { describe, it, expect, vi, beforeEach } from 'vitest'

// #349 (tail) — THE WRITES THAT DECIDE WHETHER A CLIENT HAS ACCESS.
//
// The wallet half of #349 was closed by PR #1207. This is the other half: the Stripe webhook
// and the client-facing cancel, where the pattern is not a lost ledger row but a lost
// AUTHORISATION DECISION. Three of these writes ran on a bare `await` that discarded its
// error, and supabase-js RETURNS its error rather than throwing, so every one of them
// reported success by doing nothing at all:
//
//   customer.subscription.deleted  → row stays `active`  → the client keeps the product FREE
//   invoice.payment_succeeded      → row stays past_due  → the client PAID and stays locked out
//   invoice.payment_failed         → row stays `active`  → they stopped paying and kept access
//
// Stripe does not resend these events, so there is no second chance and no retry — the
// divergence is permanent and silent. The founder alert IS the retry.
//
// The past_due case had a second failure on top: the dunning alert stated "the subscription
// is now marked past_due" unconditionally, so the one message that would have caught the bug
// asserted the opposite of what happened.

type Rows = Record<string, unknown>[]
const state = {
  /** error returned by every write to `subscriptions` — one switch for the table */
  subWriteError: null as { message: string } | null,
  /** rows the subscriptions table has been asked to write */
  subWrites: [] as Record<string, unknown>[],
  alerts: [] as { kind: string; subject: string; lines: string[] }[],
  /** the client-facing cancel route reads the subscription first */
  sub: { id: 'sub-1', product: 'milla', status: 'active' } as Record<string, unknown> | null,
  /** the partner referral behind a renewal, or null for a client nobody referred */
  referral: null as Record<string, unknown> | null,
  commissionError: null as { message: string } | null,
  commissionInserts: [] as Record<string, unknown>[],
}

function query(table: string) {
  const write = (patch: Record<string, unknown>) => {
    if (table === 'subscriptions') state.subWrites.push(patch)
    if (table === 'partner_commissions') state.commissionInserts.push(patch)
    const err = table === 'subscriptions' ? state.subWriteError
              : table === 'partner_commissions' ? state.commissionError
              : null
    // Every terminal in the chain resolves the same way, so the test doesn't care whether the
    // route ends on .eq(), .in() or the builder itself.
    const chain: Record<string, unknown> = {
      eq() { return chain }, in() { return chain }, is() { return chain },
      select() { return chain },
      async single() { return { data: null, error: err } },
      then(resolve: (v: unknown) => unknown) { return resolve({ data: null, error: err }) },
    }
    return chain
  }
  const q: Record<string, unknown> = {
    select() { return q },
    eq() { return q }, in() { return q }, is() { return q }, order() { return q }, limit() { return q },
    async maybeSingle() {
      if (table === 'subscriptions') return { data: state.sub, error: null }
      return { data: null, error: null }
    },
    async single() {
      if (table === 'clients') return { data: { id: 'client-1' }, error: null }
      if (table === 'subscriptions') return { data: state.sub, error: null }
      if (table === 'partner_referrals') return { data: state.referral, error: null }
      // No commission recorded for this period yet — otherwise the helper returns early
      // on its idempotency check and never reaches the insert under test.
      if (table === 'partner_commissions') return { data: null, error: null }
      return { data: null, error: null }
    },
    insert(row: Record<string, unknown>) { return write(row) },
    update(patch: Record<string, unknown>) { return write(patch) },
    upsert(row: Record<string, unknown>) { return write(row) },
    then(resolve: (v: { data: Rows; error: null }) => unknown) { return resolve({ data: [], error: null }) },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: { from: (t: string) => query(t), rpc: async () => ({ data: true, error: null }) },
}))
vi.mock('../lib/alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, lines: string[]) => {
    state.alerts.push({ kind, subject, lines })
  },
}))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

// The webhook body is a signed Buffer in production. The signature check is not what these
// tests are about, so `constructWebhookEvent` hands back whatever event the test asked for.
const nextEvent = { value: null as unknown }
vi.mock('../lib/stripe', () => ({
  isStripeConfigured: () => true,
  listInvoicesByEmail: async () => [],
  createWalletCheckoutSession: async () => ({ url: null, error: null }),
  createSubscriptionCheckoutSession: async () => ({ url: null, error: null }),
  constructWebhookEvent: () => nextEvent.value,
  getSessionMetaByPaymentIntent: async () => null,
  getStripeSubscriptionPriceId: () => null,
  STRIPE_SUBSCRIPTIONS: {
    milla: { product: 'virtual_assistant', priceUsd: 99 },
  },
  STRIPE_BUNDLES: {},
}))

async function post(path: string, req: Record<string, unknown>) {
  const { stripeRouter } = await import('./stripe')
  return callRoute(stripeRouter, path, 'post', req)
}

async function callRoute(router: unknown, path: string, method: string, req: Record<string, unknown>) {
  const layer = (router as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer?.route) throw new Error(`${method.toUpperCase()} ${path} not found on the router`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    json(p: Record<string, unknown>) { res.payload = p; return fakeRes },
    sendStatus(c: number) { res.code = c; return fakeRes },
    send() { return fakeRes },
  }
  await handler({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}'), params: {}, query: {}, ...req }, fakeRes, () => {})
  return res
}

// Alerts are dispatched with `void`, so they are queued rather than awaited by the handler.
const settle = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  state.subWriteError = null
  state.subWrites = []
  state.alerts = []
  state.sub = { id: 'sub-1', product: 'milla', status: 'active' }
  state.referral = null
  state.commissionError = null
  state.commissionInserts = []
  nextEvent.value = null
})

const SUB_META = { clientId: 'client-1', product: 'milla' }

describe('customer.subscription.deleted — Stripe stopped billing them', () => {
  beforeEach(() => {
    nextEvent.value = {
      type: 'customer.subscription.deleted',
      data: { object: { id: 'stripe-sub-1', metadata: SUB_META } },
    }
  })

  it('ALERTS when the local row could not follow — otherwise they keep the product free', async () => {
    state.subWriteError = { message: 'invalid input value for enum subscription_status' }
    await post('/webhook', {})
    await settle()
    expect(state.alerts).toHaveLength(1)
    const body = state.alerts[0].lines.join(' ')
    expect(body).toContain('client-1')
    expect(body).toContain('for free')
  })

  it('says Stripe will not resend it — this is the only chance to catch it', async () => {
    state.subWriteError = { message: 'boom' }
    await post('/webhook', {})
    await settle()
    expect(state.alerts[0].lines.join(' ')).toContain('does not resend')
  })

  it('stays quiet on the ordinary path', async () => {
    await post('/webhook', {})
    await settle()
    expect(state.alerts).toHaveLength(0)
    expect(state.subWrites).toContainEqual({ status: 'cancelled' })
  })
})

describe('invoice.payment_succeeded — they paid and the lockout should end', () => {
  beforeEach(() => {
    nextEvent.value = {
      type: 'invoice.payment_succeeded',
      data: { object: { subscription: 'stripe-sub-1', billing_reason: 'subscription_cycle', customer_email: 'ops@rivo.co' } },
    }
  })

  it('ALERTS that a paying client is still locked out', async () => {
    // The worst direction of the bug: we have their money and they cannot use the product.
    state.subWriteError = { message: 'timeout' }
    await post('/webhook', {})
    await settle()
    const alert = state.alerts.find(a => a.subject.includes('locked out'))
    expect(alert).toBeDefined()
    expect(alert!.lines.join(' ')).toContain('ops@rivo.co')
    expect(alert!.lines.join(' ')).toContain('charged')
  })

  it('says nothing retries it — the next invoice is a month away', async () => {
    state.subWriteError = { message: 'timeout' }
    await post('/webhook', {})
    await settle()
    const alert = state.alerts.find(a => a.subject.includes('locked out'))!
    expect(alert.lines.join(' ')).toContain('month away')
  })

  it('stays quiet on the ordinary path', async () => {
    await post('/webhook', {})
    await settle()
    expect(state.alerts).toHaveLength(0)
    expect(state.subWrites).toContainEqual({ status: 'active' })
  })
})

describe('invoice.payment_failed — the dunning alert must not lie', () => {
  beforeEach(() => {
    nextEvent.value = {
      type: 'invoice.payment_failed',
      data: { object: { subscription: 'stripe-sub-1', customer_email: 'ops@rivo.co' } },
    }
  })

  it('the alert states past_due WAS set when the write succeeded', async () => {
    await post('/webhook', {})
    await settle()
    const body = state.alerts[0].lines.join(' ')
    expect(body).toContain('now marked past_due')
    expect(body).not.toContain('could NOT be marked')
  })

  it('the alert says the OPPOSITE when the write failed — the founder is told access is still open', async () => {
    // This is the assertion the fix exists for. The alert used to say "the subscription is now
    // marked past_due" whether or not the write landed, so the single message that could have
    // surfaced this bug was the message asserting it had not happened.
    state.subWriteError = { message: 'deadlock detected' }
    await post('/webhook', {})
    await settle()
    const body = state.alerts[0].lines.join(' ')
    expect(body).toContain('could NOT be marked past_due')
    expect(body).toContain('still have full access')
    expect(body).not.toContain('now marked past_due. Stripe will retry')
  })

  it('still alerts about the failed payment either way — dunning is not skipped', async () => {
    state.subWriteError = { message: 'deadlock detected' }
    await post('/webhook', {})
    await settle()
    expect(state.alerts).toHaveLength(1)
    expect(state.alerts[0].kind).toBe('payment_failed')
  })
})

describe('the partner commission on a renewal — ⛓️ NOW ZERO, founder-ruled 19 Aug', () => {
  // ⛓️ AMENDED 19 Aug 2026. These three tests asserted that a renewal WRITES a commission row
  // and alerts if that write fails. Both were true and are now wrong: the founder ruled
  // commission is earned on the $4 lead sale and on nothing else —
  //
  //   *"she earns on leads purchased not when they top up. because our calulators on leads
  //     not money in. we earn money when they buy leads. so thye need to be managing their
  //     customers to buy leads."*
  //
  // A renewal is money arriving. So the assertion inverts, and the inverted form is a STRONGER
  // test of the ruling than the original was of the old behaviour: not "it pays a smaller
  // amount" but "this path cannot pay at all".
  beforeEach(() => {
    state.sub = { client_id: 'client-1', product: 'virtual_assistant' }
    state.referral = { id: 'ref-1', partner_id: 'partner-1', partners: { commission_rate: 0.25, tier: 'agency' } }
    nextEvent.value = {
      type: 'invoice.payment_succeeded',
      data: { object: { subscription: 'stripe-sub-1', billing_reason: 'subscription_cycle', customer_email: 'ops@rivo.co' } },
    }
  })

  it('a renewal writes NO commission row — even for a partner-attributed client', async () => {
    await post('/webhook', {})
    await settle()
    expect(state.commissionInserts, 'money arriving is not a lead being bought').toHaveLength(0)
  })

  it('and raises no commission alert either — there is nothing to fail', async () => {
    // The old code alerted when the commission insert errored. With no insert attempted there
    // is no failure mode left on this path, so silence here is correctness, not a swallow.
    state.commissionError = { message: 'violates foreign key constraint' }
    await post('/webhook', {})
    await settle()
    expect(state.alerts.find(a => a.subject.includes('commission'))).toBeUndefined()
  })

  it('the renewal itself still works — the ruling removed a payout, not the product', async () => {
    await post('/webhook', {})
    await settle()
    expect(state.alerts, 'a healthy renewal is quiet').toHaveLength(0)
  })
})

describe('POST /subscriptions/:id/cancel — the client is told what actually happened', () => {
  async function cancel() {
    const { subscriptionRouter } = await import('./subscriptions')
    return callRoute(subscriptionRouter, '/:id/cancel', 'post', { params: { id: 'sub-1' }, userId: 'user-1' })
  }

  it('REFUSES when the write failed, instead of reporting a cancellation that never happened', async () => {
    // Swallowed, this told the client "cancelled — access continues until end of period"
    // while the row still read active. They stop watching for the charge; Stripe keeps
    // charging; the churn report never counts them.
    state.subWriteError = { message: 'permission denied for table subscriptions' }
    const res = await cancel()
    expect(res.code).toBe(500)
    expect(res.payload.success).toBe(false)
    expect(String(res.payload.error)).toContain('nothing was changed')
  })

  it('confirms the cancellation when the write landed', async () => {
    const res = await cancel()
    expect(res.code).toBe(200)
    expect(res.payload.success).toBe(true)
    expect(state.subWrites[0]).toMatchObject({ status: 'cancelled' })
  })
})
