// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 Q2 · Coaching F3 · #2485) — THE COACHING UPLIFT COMES BACK IN THE SETTLEMENT.
//
// The founder: Full Coaching is paid for the meetings still to come, and *"any of those meetings
// not delivered returns its uplift with the shortfall credit"*. The real `settleProgrammeShortfall`,
// against in-memory tables that honour its compare-and-set claim and the unique ledger reference.
// ⚠️ The once-per-client rule NOT swallowing the uplift is the RECOMMENDED reading, not yet ruled.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({
  tables: { programmes: [], clients: [], credit_transactions: [], coaching_activations: [] } as Record<string, Row[]>,
  activationReadError: null as { code?: string; message: string } | null,
  rpc: [] as Row[],
  alerts: [] as string[],
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const filters: Array<(r: Row) => boolean> = []
      let patch: Row | null = null
      const rows = () => state.tables[t] ?? []
      const hit = () => rows().filter(r => filters.every(f => f(r)))
      const q: Record<string, any> = {
        select: () => q, order: () => q, limit: () => q,
        eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return q },
        is: (c: string, v: unknown) => { filters.push(r => (r[c] ?? null) === v); return q },
        maybeSingle: async () => {
          if (t === 'coaching_activations' && state.activationReadError) return { data: null, error: state.activationReadError }
          return { data: hit()[0] ?? null, error: null }
        },
        insert: async (row: Row) => {
          if (t === 'credit_transactions' && rows().some(r => r.reference === row.reference)) return { error: { code: '23505', message: 'dup' } }
          rows().push({ ...row }); return { error: null }
        },
        update: (p: Row) => { patch = p; return q },
        then: (res: (v: unknown) => unknown) => {
          if (patch) { const h = hit(); for (const r of h) Object.assign(r, patch); return Promise.resolve({ data: h, error: null }).then(res) }
          return Promise.resolve({ data: hit(), error: null }).then(res)
        },
      }
      return q
    },
    rpc: async (_fn: string, args: Row) => { state.rpc.push(args); return { data: null, error: null } },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: (_k: string, s: string, lines: string[]) => { state.alerts.push([s, ...lines].join(' ')); return Promise.resolve() } }))

import { settleProgrammeShortfall } from './programme'
import { FULL_COACHING_UPLIFT_PER_MEETING_CENTS } from '@kind/shared'

// Growth ($199) · 10 meetings · paid in full. Settled at 8 delivered → 2 short → 2 × $199 = $398 credit.
const PROGRAMME = (): Row => ({
  id: 'p1', client_id: 'c1', status: 'LIVE', meeting_target: 10, size_band: 'growth', paused_at: 'x',
  sourcing_ceiling: 0, sourced_used: 0, sourced_reserved: 0,
  price_per_meeting_cents: 19_900, price_total_cents: 199_000, first_payment_cents: 199_000, second_payment_cents: 0,
  first_paid_at: 'x', second_paid_at: null, shortfall_credited_at: null, shortfall_credit_cents: 0,
  delivered_meetings: null, make_whole_cents: 0,
})
// Turned on at 4 delivered for the 6 still to come: 6 × $100 = $600 paid.
const ACTIVATION = (over: Row = {}): Row => ({
  id: 'act-1', programme_id: 'p1', client_id: 'c1', meetings_covered: 6, delivered_at_activation: 4,
  uplift_cents_per_meeting: FULL_COACHING_UPLIFT_PER_MEETING_CENTS, paid_cents: 6 * FULL_COACHING_UPLIFT_PER_MEETING_CENTS,
  payment_ref: 'cs_1', deactivated_at: null, uplift_returned_cents: 0, ...over,
})
const prog = () => state.tables.programmes[0]
const settle = () => settleProgrammeShortfall({ programmeId: 'p1', deliveredMeetings: 8, note: 'closing' })

beforeEach(() => {
  state.tables = {
    programmes: [PROGRAMME()],
    clients: [{ id: 'c1', shortfall_credit_granted_at: null, shortfall_credit_expires_at: null, shortfall_credit_expiring_cents: null }],
    credit_transactions: [], coaching_activations: [ACTIVATION()],
  }
  state.activationReadError = null; state.rpc = []; state.alerts = []
})

describe('the uplift return (R180 Q2)', () => {
  it('🛑 6 covered, 4 delivered since activation → 2 × $100 back, in the SAME wallet movement as the shortfall credit', async () => {
    const r = await settle()
    expect(r).toMatchObject({ ok: true, creditCents: 39_800, upliftReturnedCents: 20_000 })
    expect(state.rpc).toEqual([{ p_client_id: 'c1', p_amount: 598 }])          // $398 + $200, one movement
    const refs = state.tables.credit_transactions.map(t => [t.reference, t.amount])
    expect(refs).toEqual([['programme-shortfall:p1', 398], ['coaching-uplift-return:p1', 200]])
    expect(state.tables.coaching_activations[0].uplift_returned_cents).toBe(20_000)
    expect(prog().make_whole_cents).toBe(59_800)                                  // contribution sees both
    expect(prog().shortfall_credit_cents).toBe(39_800)                            // the shortfall figure is unchanged
    // The 90-day expiring part is the shortfall credit only — the uplift does not expire.
    expect(state.tables.clients[0].shortfall_credit_expiring_cents).toBe(39_800)
  })

  it('🛑 a switched-off (refunded) activation returns nothing — the money already went back through Stripe', async () => {
    state.tables.coaching_activations = [ACTIVATION({ deactivated_at: '2026-10-01T00:00:00Z' })]
    const r = await settle()
    expect(r).toMatchObject({ ok: true, creditCents: 39_800, upliftReturnedCents: 0 })
    expect(state.rpc).toEqual([{ p_client_id: 'c1', p_amount: 398 }])
    expect(state.tables.credit_transactions.map(t => t.reference)).toEqual(['programme-shortfall:p1'])
  })

  it('🛑 ⚠️ the once-per-client rule does NOT swallow the uplift: no shortfall credit, uplift still returned', async () => {
    state.tables.clients[0].shortfall_credit_granted_at = '2026-08-01T00:00:00Z'   // had their one credit already
    const r = await settle()
    expect(r).toMatchObject({ ok: true, creditCents: 0, upliftReturnedCents: 20_000 })
    expect(state.rpc).toEqual([{ p_client_id: 'c1', p_amount: 200 }])
    expect(state.tables.credit_transactions.map(t => t.reference)).toEqual(['coaching-uplift-return:p1'])
    expect(prog().make_whole_cents).toBe(20_000)
  })

  it('settled twice → the second is "already settled" and moves no money', async () => {
    await settle(); const again = await settle()
    expect(again).toMatchObject({ ok: true, alreadySettled: true })
    expect(state.rpc).toHaveLength(1)
  })

  it('🛑 an UNREADABLE activation refuses the settlement — nothing claimed, nothing paid (retryable)', async () => {
    state.activationReadError = { code: 'XX000', message: 'down' }
    const r = await settle()
    expect(r.ok).toBe(false)
    expect(state.rpc).toEqual([])
    expect(prog().shortfall_credited_at).toBeNull()
  })

  it('no activation (or the table not yet migrated) → exactly the old settlement', async () => {
    state.tables.coaching_activations = []
    expect(await settle()).toMatchObject({ ok: true, creditCents: 39_800, upliftReturnedCents: 0 })
    state.tables.programmes = [PROGRAMME()]; state.rpc = []; state.tables.credit_transactions = []
    state.tables.clients[0].shortfall_credit_granted_at = null
    state.activationReadError = { code: '42P01', message: 'relation "public.coaching_activations" does not exist' }
    expect(await settle()).toMatchObject({ ok: true, creditCents: 39_800, upliftReturnedCents: 0 })
    expect(state.rpc).toEqual([{ p_client_id: 'c1', p_amount: 398 }])
  })
})

describe('coachingActivated() ignores a switched-off activation', () => {
  it('a live row is "on"; a deactivated row is "off"', async () => {
    const { coachingActivated } = await import('./coaching-access')
    expect(await coachingActivated('p1')).toBe(true)
    state.tables.coaching_activations[0].deactivated_at = '2026-10-01T00:00:00Z'
    expect(await coachingActivated('p1')).toBe(false)
  })
})
