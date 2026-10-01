// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 Q2 · R184 · Coaching F3 · #2485 / #2521) — FULL COACHING: THE ONE PAYMENT.
//
// ① every refusal happens BEFORE Stripe (a call count, not a comment), and the allow path charges
//   exactly uplift × meetings still to come, from the shared constant;
// ② the webhook's record: once per session, never twice per programme, never on a wrong amount;
// ③ a refund or dispute switches Coaching off (stamped, never deleted); a partial refund does not;
// ④ the settlement's uplift return, as a pure sum.
// 🛑 NO REAL STRIPE: the SDK is a fake class and its create() is a spy.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>
const state = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_coaching_billing'
  return {
    creates: [] as Row[],
    demo: false,
    view: null as Row | null,
    activations: [] as Row[],
    activationReadError: null as { code?: string; message: string } | null,
    insertError: null as { code?: string; message: string } | null,
    updateError: null as { code?: string; message: string } | null,
    updates: [] as Array<{ patch: Row; filters: Array<[string, unknown]> }>,
    email: 'buyer@realco.test' as string | null,
    alerts: [] as Array<{ kind: string; subject: string }>,
  }
})

vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: async (p: Row) => { state.creates.push(p); return { id: 'cs_coach_1', url: 'https://stripe.test/coach' } } } }
  },
}))
vi.mock('./demo', () => ({ isDemoClient: async () => state.demo }))
vi.mock('./expansion-moments', () => ({ ensureMoment: async () => state.view }))
vi.mock('./alerts', () => ({ sendFounderAlert: async (kind: string, subject: string) => { state.alerts.push({ kind, subject }); return {} } }))
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const filters: Array<[string, unknown]> = []
      let patch: Row | null = null
      const hit = () => state.activations.filter(r => filters.every(([c, v]) => (r[c] ?? null) === v))
      const q: Record<string, any> = {
        select: () => q, order: () => q, limit: () => q,
        eq: (c: string, v: unknown) => { filters.push([c, v]); return q },
        is: (c: string, v: unknown) => { filters.push([c, v]); return q },
        maybeSingle: async () => {
          if (t === 'clients') return { data: state.email === null ? { contact_email: null } : { contact_email: state.email }, error: null }
          if (state.activationReadError) return { data: null, error: state.activationReadError }
          return { data: hit()[0] ?? null, error: null }
        },
        // THE TABLE'S TWO UNIQUE KEYS, honoured: programme_id and payment_ref.
        insert: async (row: Row) => {
          if (state.insertError) return { error: state.insertError }
          if (state.activations.some(r => r.programme_id === row.programme_id || r.payment_ref === row.payment_ref)) {
            return { error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
          }
          state.activations.push({ id: `act-${state.activations.length + 1}`, deactivated_at: null, uplift_returned_cents: 0, ...row })
          return { error: null }
        },
        update: (p: Row) => { patch = p; return q },
        then: (res: (v: unknown) => unknown) => {
          if (patch) {
            state.updates.push({ patch, filters: [...filters] })
            if (state.updateError) return Promise.resolve({ data: null, error: state.updateError }).then(res)
            const rows = hit(); for (const r of rows) Object.assign(r, patch)
            return Promise.resolve({ data: rows.map(r => ({ id: r.id })), error: null }).then(res)
          }
          return Promise.resolve({ data: hit(), error: null }).then(res)
        },
      }
      return q
    },
  },
}))

import { FULL_COACHING_UPLIFT_PER_MEETING_USD, FULL_COACHING_UPLIFT_PER_MEETING_CENTS } from '@kind/shared'
import {
  createCoachingCheckout, recordCoachingActivation, deactivateCoachingForPayment, upliftReturnCents,
  type CoachingActivationRow,
} from './coaching-billing'

const PROG = (over: Row = {}) => ({
  id: 'prog-1', client_id: 'client-1', meeting_target: 8, size_band: 'growth', status: 'LIVE',
  paused_at: null, disputed_at: null, shortfall_credited_at: null, ...over,
})
const VIEW = (over: Row = {}): Row => ({ milestone: 50, delivered: 4, target: 8, remaining: 4, response: 'shown', response50: 'shown', ...over })
const checkout = (p: Row = PROG()) => createCoachingCheckout('client-1', p as never, 'https://app/ok', 'https://app/back')
const ACT = (over: Partial<CoachingActivationRow> = {}): CoachingActivationRow => ({
  id: 'act-1', programme_id: 'prog-1', client_id: 'client-1', meetings_covered: 6, delivered_at_activation: 4,
  uplift_cents_per_meeting: 10_000, paid_cents: 60_000, payment_ref: 'cs_1', payment_intent_id: 'pi_1',
  activated_at: 'x', deactivated_at: null, deactivated_reason: null, uplift_returned_cents: 0, ...over,
})

beforeEach(() => {
  state.creates = []; state.demo = false; state.view = VIEW()
  state.activations = []; state.activationReadError = null; state.insertError = null; state.updateError = null
  state.updates = []; state.email = 'buyer@realco.test'; state.alerts = []
})

describe('① the checkout — every refusal before Stripe, in plain English', () => {
  it('the allow path: ONE charge of uplift × meetings still to come, from the shared constant, with identity metadata', async () => {
    const r = await checkout()
    expect(r).toMatchObject({ ok: true, url: 'https://stripe.test/coach', amountCents: 4 * FULL_COACHING_UPLIFT_PER_MEETING_CENTS, meetingsCovered: 4 })
    expect(state.creates).toHaveLength(1)
    const s = state.creates[0] as { line_items: Array<{ price_data: { unit_amount: number } }>; metadata: Row; customer_email: string }
    expect(s.line_items[0].price_data.unit_amount).toBe(4 * FULL_COACHING_UPLIFT_PER_MEETING_USD * 100)
    expect(s.line_items[0].price_data.unit_amount).toBe(40_000)   // R184: $100 × 4 — the constant, not a typed number
    expect(s.metadata).toEqual({
      type: 'coaching_activation', clientId: 'client-1', programmeId: 'prog-1',
      meetingsCovered: '4', deliveredAtActivation: '4', upliftCents: String(FULL_COACHING_UPLIFT_PER_MEETING_CENTS),
    })
    expect(s.customer_email).toBe('buyer@realco.test')
  })

  it('🛑 Enterprise is never sold Coaching', async () => {
    const r = await checkout(PROG({ size_band: 'enterprise' }))
    expect(r).toMatchObject({ ok: false, status: 400, error: 'Full Coaching is already part of your plan.' })
    expect(state.creates).toHaveLength(0)
  })

  it('🛑 a demo account is never charged', async () => {
    state.demo = true
    expect(await checkout()).toMatchObject({ ok: false, error: 'This is a demo account, so nothing is ever charged.' })
    expect(state.creates).toHaveLength(0)
  })

  it('🛑 already on → refused; switched off after a refund → refused with the reason', async () => {
    state.activations = [ACT()]
    expect(await checkout()).toMatchObject({ ok: false, status: 409, error: 'Full Coaching is already on for this programme.' })
    state.activations = [ACT({ deactivated_at: '2026-10-01T00:00:00Z' })]
    expect(await checkout()).toMatchObject({ ok: false, status: 409, error: expect.stringMatching(/switched off after a refund/) })
    expect(state.creates).toHaveLength(0)
  })

  it('🛑 an UNREADABLE activation refuses (503) — never a second charge on a guess', async () => {
    state.activationReadError = { code: 'XX000', message: 'boom' }
    expect(await checkout()).toMatchObject({ ok: false, status: 503 })
    expect(state.creates).toHaveLength(0)
  })

  it('🛑 75% after "no thanks" at halfway → refused; after "not now" → allowed', async () => {
    state.view = VIEW({ milestone: 75, delivered: 6, remaining: 2, response50: 'declined' })
    expect(await checkout()).toMatchObject({ ok: false, status: 409, error: expect.stringMatching(/no thanks/) })
    expect(state.creates).toHaveLength(0)
    state.view = VIEW({ milestone: 75, delivered: 6, remaining: 2, response50: 'not_now' })
    expect(await checkout()).toMatchObject({ ok: true, amountCents: 2 * FULL_COACHING_UPLIFT_PER_MEETING_CENTS })
  })

  it('🛑 no meetings still to come → refused', async () => {
    state.view = VIEW({ milestone: 75, delivered: 8, remaining: 0, response50: 'not_now' })
    expect(await checkout()).toMatchObject({ ok: false, status: 409, error: expect.stringMatching(/no meetings still to come/) })
    expect(state.creates).toHaveLength(0)
  })

  it('refused at 25%, on a paused or settled programme, with no email, and for someone else\'s programme', async () => {
    state.view = VIEW({ milestone: 25 })
    expect(await checkout()).toMatchObject({ ok: false, status: 409 })
    state.view = VIEW()
    expect(await checkout(PROG({ paused_at: 'x' }))).toMatchObject({ ok: false, status: 409 })
    expect(await checkout(PROG({ shortfall_credited_at: 'x' }))).toMatchObject({ ok: false, status: 409 })
    expect(await checkout(PROG({ client_id: 'someone-else' }))).toMatchObject({ ok: false, status: 404 })
    state.email = null
    expect(await checkout()).toMatchObject({ ok: false, status: 400 })
    expect(state.creates).toHaveLength(0)
  })
})

const SESSION = (over: Row = {}) => ({
  id: 'cs_coach_1', amount_total: 40_000, payment_intent: 'pi_coach_1',
  metadata: { type: 'coaching_activation', clientId: 'client-1', programmeId: 'prog-1', meetingsCovered: '4', deliveredAtActivation: '4', upliftCents: '10000' },
  ...over,
})

describe('② the webhook record', () => {
  it('records one row: covered, delivered at activation, uplift, paid, the session as payment_ref', async () => {
    expect(await recordCoachingActivation(SESSION())).toEqual({ ok: true, alreadyRecorded: false })
    expect(state.activations).toHaveLength(1)
    expect(state.activations[0]).toMatchObject({
      programme_id: 'prog-1', client_id: 'client-1', meetings_covered: 4, delivered_at_activation: 4,
      uplift_cents_per_meeting: 10_000, paid_cents: 40_000, payment_ref: 'cs_coach_1', payment_intent_id: 'pi_coach_1',
    })
  })

  it('🛑 a replay of the same session is success, not a second row', async () => {
    await recordCoachingActivation(SESSION())
    expect(await recordCoachingActivation(SESSION())).toEqual({ ok: true, alreadyRecorded: true })
    expect(state.activations).toHaveLength(1)
    expect(state.alerts).toHaveLength(0)
  })

  it('🛑 a DIFFERENT session for a programme already on is refused and alerted — no retry, nothing recorded', async () => {
    await recordCoachingActivation(SESSION())
    const r = await recordCoachingActivation(SESSION({ id: 'cs_coach_2' }))
    expect(r).toMatchObject({ ok: false, retry: false })
    expect(state.activations).toHaveLength(1)
    expect(state.alerts.map(a => a.subject)).toContain('A second Full Coaching payment for the same programme — not recorded')
  })

  it('🛑 an amount that is not meetings × uplift records NOTHING and tells the founder', async () => {
    const r = await recordCoachingActivation(SESSION({ amount_total: 30_000 }))
    expect(r).toMatchObject({ ok: false, retry: false })
    expect(state.activations).toHaveLength(0)
    expect(state.alerts[0]).toMatchObject({ kind: 'payment_failed', subject: 'A Full Coaching payment did not match its price — not recorded' })
  })

  it('🛑 a storage failure asks for a retry (the route answers 500)', async () => {
    state.insertError = { code: 'XX000', message: 'database unavailable' }
    expect(await recordCoachingActivation(SESSION())).toMatchObject({ ok: false, retry: true })
  })
})

describe('③ refund / dispute switches Coaching off — stamped, never deleted', () => {
  it('a full refund stamps deactivated_at on THIS payment\'s row, once', async () => {
    state.activations = [ACT({ payment_ref: 'cs_coach_1' })]
    const r = await deactivateCoachingForPayment({ sessionId: 'cs_coach_1', paymentIntentId: 'pi_1', chargeId: 'ch_1', kind: 'refund', amountCents: 60_000, amountRefundedCents: 60_000 })
    expect(r).toEqual({ ok: true, deactivated: true })
    expect(state.activations).toHaveLength(1)
    expect(state.activations[0].deactivated_at).toBeTruthy()
    expect(state.activations[0].deactivated_reason).toMatch(/Refund on charge ch_1/)
    expect(state.updates[0].filters).toEqual([['payment_ref', 'cs_coach_1'], ['deactivated_at', null]])
    // A redelivery finds it already off and changes nothing.
    expect(await deactivateCoachingForPayment({ sessionId: 'cs_coach_1', paymentIntentId: 'pi_1', chargeId: 'ch_1', kind: 'refund' })).toEqual({ ok: true, deactivated: false })
  })

  it('a dispute switches it off too', async () => {
    state.activations = [ACT({ payment_ref: 'cs_coach_1' })]
    expect(await deactivateCoachingForPayment({ sessionId: 'cs_coach_1', paymentIntentId: null, chargeId: 'dp_1', kind: 'dispute' })).toEqual({ ok: true, deactivated: true })
  })

  it('⚠️ a PARTIAL refund leaves Coaching on and tells the founder', async () => {
    state.activations = [ACT({ payment_ref: 'cs_coach_1' })]
    const r = await deactivateCoachingForPayment({ sessionId: 'cs_coach_1', paymentIntentId: 'pi_1', chargeId: 'ch_1', kind: 'refund', amountCents: 60_000, amountRefundedCents: 10_000 })
    expect(r).toEqual({ ok: true, deactivated: false })
    expect(state.activations[0].deactivated_at).toBeNull()
    expect(state.alerts[0].subject).toMatch(/Part of a Full Coaching payment was refunded/)
  })

  it('a storage failure is reported (the route answers 500 for a retry)', async () => {
    state.activations = [ACT({ payment_ref: 'cs_coach_1' })]
    state.updateError = { message: 'down' }
    expect(await deactivateCoachingForPayment({ sessionId: 'cs_coach_1', paymentIntentId: null, chargeId: 'ch_1', kind: 'refund' })).toMatchObject({ ok: false })
  })
})

describe('④ the uplift owed back at settlement (R180 Q2)', () => {
  it('6 covered, activated at 4 delivered, 8 delivered at the end → 4 delivered since → 2 × $100 back', () => {
    expect(upliftReturnCents(ACT(), 8)).toBe(2 * FULL_COACHING_UPLIFT_PER_MEETING_CENTS)
  })
  it('all covered meetings delivered → nothing back; none delivered since → all of it back', () => {
    expect(upliftReturnCents(ACT(), 10)).toBe(0)
    expect(upliftReturnCents(ACT(), 12)).toBe(0)
    expect(upliftReturnCents(ACT(), 4)).toBe(60_000)
  })
  it('🛑 a switched-off (refunded) activation returns nothing; one already returned returns nothing again', () => {
    expect(upliftReturnCents(ACT({ deactivated_at: 'x' }), 4)).toBe(0)
    expect(upliftReturnCents(ACT({ uplift_returned_cents: 20_000 }), 8)).toBe(0)
    expect(upliftReturnCents(null, 4)).toBe(0)
  })
})
