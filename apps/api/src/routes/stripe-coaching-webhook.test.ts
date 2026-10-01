// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 Q2 · Coaching F3 · #2485) — THE STRIPE WEBHOOK, CALLED, FOR A COACHING PAYMENT.
//
// The real `/webhook` handler and the real `lib/coaching-billing.ts`, against an in-memory
// `coaching_activations` that honours its two UNIQUE keys. Only the signature check and the
// session lookup are stubbed. What each test proves is in its name.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({
  activations: [] as Row[],
  insertError: null as { code?: string; message: string } | null,
  updateError: null as { code?: string; message: string } | null,
  writesElsewhere: [] as Array<{ table: string; op: string }>,
  alerts: [] as Array<{ kind: string; subject: string }>,
  disputes: [] as unknown[],
  event: null as unknown,
  linked: null as { sessionId: string; metadata: Record<string, string> } | null,
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const filters: Array<[string, unknown]> = []
      let patch: Row | null = null
      const hit = () => state.activations.filter(r => filters.every(([c, v]) => (r[c] ?? null) === v))
      const q: Record<string, any> = {
        select: () => q, order: () => q, limit: () => q, in: () => q, not: () => q,
        eq: (c: string, v: unknown) => { filters.push([c, v]); return q },
        is: (c: string, v: unknown) => { filters.push([c, v]); return q },
        maybeSingle: async () => ({ data: t === 'coaching_activations' ? hit()[0] ?? null : null, error: null }),
        single: async () => ({ data: null, error: null }),
        insert: async (row: Row) => {
          if (t !== 'coaching_activations') { state.writesElsewhere.push({ table: t, op: 'insert' }); return { error: null } }
          if (state.insertError) return { error: state.insertError }
          if (state.activations.some(r => r.programme_id === row.programme_id || r.payment_ref === row.payment_ref)) {
            return { error: { code: '23505', message: 'duplicate key' } }
          }
          state.activations.push({ id: `act-${state.activations.length + 1}`, deactivated_at: null, ...row })
          return { error: null }
        },
        update: (p: Row) => { patch = p; if (t !== 'coaching_activations') state.writesElsewhere.push({ table: t, op: 'update' }); return q },
        then: (res: (v: unknown) => unknown) => {
          if (patch && t === 'coaching_activations') {
            if (state.updateError) return Promise.resolve({ data: null, error: state.updateError }).then(res)
            const rows = hit(); for (const r of rows) Object.assign(r, patch)
            return Promise.resolve({ data: rows.map(r => ({ id: r.id })), error: null }).then(res)
          }
          return Promise.resolve({ data: [], error: null }).then(res)
        },
      }
      return q
    },
    rpc: async () => { state.writesElsewhere.push({ table: 'rpc', op: 'rpc' }); return { data: null, error: null } },
  },
}))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: async (kind: string, subject: string) => { state.alerts.push({ kind, subject }); return {} } }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))
vi.mock('../lib/stripe', () => ({
  isStripeConfigured: () => true,
  listInvoicesByEmail: async () => [],
  constructWebhookEvent: () => state.event,
  getSessionMetaByPaymentIntent: async () => state.linked,
  annotateSettlement: async () => {},
  STRIPE_SUBSCRIPTIONS: {},
  STRIPE_BUNDLES: {},
}))
// 🛑 A spy on the programme's dispute stop: a Coaching refund must NEVER reach it.
vi.mock('../lib/programme', async (orig) => ({
  ...(await (orig() as Promise<Record<string, unknown>>)),
  recordDispute: async (...a: unknown[]) => { state.disputes.push(a); return { ok: true } },
  returnRefundedWalletCredit: async () => ({ returnedCents: 0 }),
}))

async function webhook() {
  const { stripeRouter } = await import('./stripe')
  const layer = (stripeRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/webhook' && l.route?.methods.post)
  const handler = layer!.route!.stack[layer!.route!.stack.length - 1].handle
  const out = { code: 200 }
  const res = {
    status(c: number) { out.code = c; return res }, json() { return res },
    sendStatus(c: number) { out.code = c; return res }, send() { return res },
  }
  await handler({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}'), params: {}, query: {} }, res, () => {})
  await new Promise(r => setTimeout(r, 0))
  return out
}

const META = { type: 'coaching_activation', clientId: 'client-1', programmeId: 'prog-1', meetingsCovered: '4', deliveredAtActivation: '4', upliftCents: '10000' }
const completed = (over: Row = {}) => ({
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_coach_1', amount_total: 40_000, payment_intent: 'pi_coach_1', metadata: META, ...over } },
})

beforeEach(() => {
  state.activations = []; state.insertError = null; state.updateError = null; state.writesElsewhere = []
  state.alerts = []; state.disputes = []; state.event = null; state.linked = null
})

describe('checkout.session.completed — a Coaching payment', () => {
  it('records Full Coaching ON (one row) and answers 200; nothing legacy is touched', async () => {
    state.event = completed()
    expect((await webhook()).code).toBe(200)
    expect(state.activations).toHaveLength(1)
    expect(state.activations[0]).toMatchObject({ programme_id: 'prog-1', paid_cents: 40_000, payment_ref: 'cs_coach_1' })
    expect(state.writesElsewhere, 'Coaching money reached another table or the wallet').toEqual([])
  })

  it('🛑 a Stripe redelivery is 200 and still ONE row', async () => {
    state.event = completed()
    await webhook(); const again = await webhook()
    expect(again.code).toBe(200)
    expect(state.activations).toHaveLength(1)
  })

  it('🛑 an amount mismatch records nothing, alerts payment_failed, and answers 200 (a retry cannot fix it)', async () => {
    state.event = completed({ amount_total: 39_999 })
    expect((await webhook()).code).toBe(200)
    expect(state.activations).toHaveLength(0)
    expect(state.alerts.map(a => a.kind)).toContain('payment_failed')
  })

  it('🛑 a storage failure answers 500 so Stripe retries', async () => {
    state.event = completed(); state.insertError = { code: 'XX000', message: 'database unavailable' }
    expect((await webhook()).code).toBe(500)
    expect(state.activations).toHaveLength(0)
  })
})

describe('charge.refunded / charge.dispute.created — a Coaching payment', () => {
  beforeEach(() => {
    state.activations = [{ id: 'act-1', programme_id: 'prog-1', payment_ref: 'cs_coach_1', deactivated_at: null }]
    state.linked = { sessionId: 'cs_coach_1', metadata: META }
  })

  it('🛑 a refund switches Coaching OFF — the row is kept — and the PROGRAMME is not paused', async () => {
    state.event = { type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_coach_1', amount: 40_000, amount_refunded: 40_000 } } }
    expect((await webhook()).code).toBe(200)
    expect(state.activations).toHaveLength(1)
    expect(state.activations[0].deactivated_at).toBeTruthy()
    expect(state.disputes, 'a Coaching refund paused the programme').toEqual([])
    expect(state.writesElsewhere, 'campaigns or wallet were touched').toEqual([])
  })

  it('a dispute switches it off the same way', async () => {
    state.event = { type: 'charge.dispute.created', data: { object: { id: 'dp_1', payment_intent: 'pi_coach_1', amount: 40_000 } } }
    expect((await webhook()).code).toBe(200)
    expect(state.activations[0].deactivated_at).toBeTruthy()
    expect(state.disputes).toEqual([])
  })

  it('a failed stamp answers 500 so Stripe retries', async () => {
    state.event = { type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_coach_1', amount: 40_000, amount_refunded: 40_000 } } }
    state.updateError = { message: 'down' }
    expect((await webhook()).code).toBe(500)
  })
})
