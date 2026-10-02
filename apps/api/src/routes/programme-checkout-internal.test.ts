// ⚑ 1 Oct (#2229) — THE OPERATOR CHECKOUT REFUSES A PROGRAMME SETTLED BY INTERNAL AUTHORITY.
// House's programme is authorised internally, never paid. `POST /programmes/:id/checkout/first` checked
// only `first_payment_ref`, so it would mint a live Stripe checkout for it. These run the real handler.
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>
const state = { programme: null as Row | null, client: null as Row | null, sessions: [] as Row[], writes: [] as Row[] }

function table(name: string) {
  const rows = (): Row[] => name === 'programmes' ? (state.programme ? [state.programme] : [])
    : name === 'clients' ? (state.client ? [state.client] : []) : []
  const q: Record<string, unknown> = {
    select() { return q }, eq() { return q }, is() { return q }, not() { return q }, in() { return q },
    order() { return q }, limit() { return q },
    async maybeSingle() { return { data: rows()[0] ?? null, error: null } },
    async single() { return { data: rows()[0] ?? null, error: null } },
    update(patch: Row) {
      state.writes.push({ table: name, patch })
      const u: Record<string, unknown> = { eq() { return u }, is() { return u }, in() { return u }, select() { return u },
        then: (r: (v: unknown) => unknown) => r({ data: rows(), error: null }) }
      return u
    },
    insert() { return q },
    then(resolve: (v: unknown) => unknown) { return resolve({ data: rows(), error: null }) },
  }
  return q
}
vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))
vi.mock('./admin', () => ({ adminKeyValid: () => true }))
// 🛑 NO REAL STRIPE.
vi.mock('../lib/programme-checkout', () => ({
  createProgrammeCheckoutSession: async (p: Row) => { state.sessions.push(p); return { url: 'https://stripe.test/s', sessionId: 'cs_test' } },
  // ⚑ 1 Oct (#2226) — the stored quote for the stage, as the real helper reads it.
  quotedStageCents: (p: Row, s: string) => Number(s === 'programme_first' ? p.first_payment_cents : p.second_payment_cents) || 0,
}))

async function callCheckoutFirst() {
  const { programmeRouter } = await import('./programme')
  const layer = (programmeRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/:id/checkout/first' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /:id/checkout/first not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const res = { headersSent: false, status(c: number) { out.code = c; return res }, json(p: Row) { out.payload = p; res.headersSent = true; return res } }
  handler({ body: {}, headers: {}, params: { id: 'prog-1' }, query: {} }, res, () => {})
  for (let i = 0; i < 50 && !res.headersSent; i++) await new Promise(r => setTimeout(r, 5))
  return out
}

const PROG = (over: Row = {}): Row => ({
  id: 'prog-1', client_id: 'client-1', status: 'AWAITING_FIRST_PAYMENT', meeting_target: 10,
  first_payment_ref: null, first_paid_at: null, first_authorised_at: null,
  second_payment_ref: null, second_paid_at: null, second_authorised_at: null, paused_at: null,
  size_band: 'growth', first_payment_cents: 199_000, second_payment_cents: 0, ...over,
})

beforeEach(() => {
  state.programme = PROG(); state.client = { id: 'client-1', contact_email: 'buyer@client.test' }
  state.sessions = []; state.writes = []
})

describe('#2229 — no checkout for a programme authorised internally', () => {
  it('🛑 internally authorised (House): refused, no Stripe session, nothing written', async () => {
    state.programme = PROG({ first_authorised_at: '2026-09-30T08:00:00Z' })
    const r = await callCheckoutFirst()
    expect(r.code).toBe(400)
    expect(String(r.payload.error)).toMatch(/authorised internally/)
    expect(state.sessions, 'a Stripe session was minted').toEqual([])
    expect(state.writes, 'the programme was moved').toEqual([])
  })

  it('a normal unpaid programme still gets its checkout (the allow path)', async () => {
    const r = await callCheckoutFirst()
    expect(r.code).toBe(200)
    expect(state.sessions).toHaveLength(1)
  })

  it('an already-paid programme is still refused, as before', async () => {
    state.programme = PROG({ first_payment_ref: 'cs_paid' })
    const r = await callCheckoutFirst()
    expect(r.code).toBe(400)
    expect(state.sessions).toEqual([])
  })
})
