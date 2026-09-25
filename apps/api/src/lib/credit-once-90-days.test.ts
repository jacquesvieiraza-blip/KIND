// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R166 ⑤ · P11, board #2357) — THE SHORTFALL CREDIT: ONCE PER CLIENT, 90 DAYS.
//
// Founder: "Once only, 90 days, new programmes". Credit already promised as "never expires" is
// honoured. Still credit, never cash.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({ programme: null as Row | null, client: {} as Row, updates: [] as { t: string; p: Row }[], rpc: [] as Row[], alerts: [] as string[] }))

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      let patch: Row | null = null
      const q: any = {
        select: () => q, eq: () => q, is: () => q,
        insert: () => Promise.resolve({ error: null }),
        update: (p: Row) => { patch = p; return q },
        maybeSingle: async () => ({ data: t === 'programmes' ? state.programme : state.client, error: null }),
        single: async () => ({ data: t === 'programmes' ? state.programme : state.client, error: null }),
        then: (res: (v: unknown) => unknown) => {
          if (patch) { state.updates.push({ t, p: patch }); Object.assign(t === 'programmes' ? state.programme! : state.client, patch) }
          return Promise.resolve({ data: [{ id: 'x' }], error: null }).then(res)
        },
      }
      return q
    },
    rpc: async (_fn: string, args: Row) => { state.rpc.push(args); return { data: null, error: null } },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: (_k: string, s: string, lines: string[]) => { state.alerts.push([s, ...lines].join(' ')); return Promise.resolve() } }))

import { availableCreditCents, expiringAfterSpend, SHORTFALL_CREDIT_EXPIRY_DAYS } from './shortfall-credit'
import { settleProgrammeShortfall } from './programme'

const DAY = 86_400_000
const bandProgramme = (over: Row = {}): Row => ({
  id: 'p1', client_id: 'c1', status: 'LIVE', meeting_target: 10, size_band: 'growth',
  price_per_meeting_cents: 19_900, price_total_cents: 199_000, first_payment_cents: 199_000, second_payment_cents: 0,
  first_paid_at: 'x', second_paid_at: 'x', first_payment_ref: 'cs', second_payment_ref: 'cs',
  shortfall_credited_at: null, shortfall_credit_cents: 0, delivered_meetings: null, make_whole_cents: 0, ...over,
})

beforeEach(() => {
  state.updates = []; state.rpc = []; state.alerts = []
  state.client = { id: 'c1', shortfall_credit_granted_at: null, shortfall_credit_expires_at: null, shortfall_credit_expiring_cents: null }
})

describe('90 days — the expired part is not spendable, the expiring part is spent first', () => {
  const now = new Date('2026-12-30T00:00:00Z')
  it('before expiry the whole balance is available; after it, the expiring part is not', () => {
    const e = { grantedAt: '2026-10-01T00:00:00Z', expiresAt: '2026-12-30T00:00:00Z', expiringCents: 59_700 }
    expect(availableCreditCents(100_000, e, now)).toBe(100_000)
    expect(availableCreditCents(100_000, e, new Date(now.getTime() + 1))).toBe(40_300)
    expect(availableCreditCents(30_000, e, new Date(now.getTime() + 1))).toBe(0)   // never below zero
    expect(SHORTFALL_CREDIT_EXPIRY_DAYS).toBe(90)
  })
  it('⛓️ credit with no stamp (running programmes) never expires; an unreadable expiry takes nothing away', () => {
    expect(availableCreditCents(100_000, { grantedAt: null, expiresAt: null, expiringCents: 0 })).toBe(100_000)
    expect(availableCreditCents(100_000, null)).toBe(100_000)
  })
  it('spending uses the expiring credit first', () => {
    const e = { grantedAt: 'x', expiresAt: '2027-01-01T00:00:00Z', expiringCents: 59_700 }
    expect(expiringAfterSpend(e, 20_000, now)).toBe(39_700)
    expect(expiringAfterSpend(e, 90_000, now)).toBe(0)
  })
})

describe('🛑 once per client', () => {
  it('the first new-terms shortfall is credited and stamped for 90 days', async () => {
    state.programme = bandProgramme()
    const before = Date.now()
    const r = await settleProgrammeShortfall({ programmeId: 'p1', deliveredMeetings: 7, note: 'x' })
    expect(r).toMatchObject({ ok: true, creditCents: 59_700 })            // 3 × $199
    expect(state.rpc[0]).toMatchObject({ p_client_id: 'c1', p_amount: 597 })
    const stamp = state.updates.find(u => u.t === 'clients')!.p
    expect(stamp.shortfall_credit_expiring_cents).toBe(59_700)
    const days = (new Date(String(stamp.shortfall_credit_expires_at)).getTime() - before) / DAY
    expect(days).toBeGreaterThan(89.9); expect(days).toBeLessThan(90.1)
  })

  it('🛑 a second new-terms shortfall for the same client is settled at 0 credit, and says why', async () => {
    state.client.shortfall_credit_granted_at = '2026-10-01T00:00:00Z'
    state.client.shortfall_credit_expires_at = '2026-12-30T00:00:00Z'
    state.programme = bandProgramme()
    const r = await settleProgrammeShortfall({ programmeId: 'p1', deliveredMeetings: 7, note: 'x' })
    expect(r).toMatchObject({ ok: true, creditCents: 0 })
    expect(state.rpc).toEqual([])                                         // nothing credited
    expect(state.programme!.delivered_meetings).toBe(7)                   // still settled
    expect(state.alerts.join(' ')).toMatch(/already had their one shortfall credit/)
  })

  it('⛓️ a programme on the curve (running, House) is credited exactly as before — no stamp, no limit', async () => {
    state.client.shortfall_credit_granted_at = '2026-10-01T00:00:00Z'
    state.programme = bandProgramme({ size_band: null, first_payment_cents: 218_750, second_payment_cents: 218_750, price_total_cents: 437_500, second_payment_ref: 'cs2' })
    const r = await settleProgrammeShortfall({ programmeId: 'p1', deliveredMeetings: 7, note: 'x' })
    expect(r.ok).toBe(true)
    expect(r.creditCents).toBeGreaterThan(0)
    expect(state.updates.some(u => u.t === 'clients')).toBe(false)
  })
})

describe('the spending doors read the available balance', () => {
  it('the checkout and the P1 draw both leave expired credit out; the draw spends expiring first', () => {
    const route = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')
    expect(route).toContain('availableCreditCents(balanceCents, await readCreditExpiry(clientId))')
    const prog = readFileSync(join(__dirname, 'programme.ts'), 'utf8')
    expect(prog).toContain('applied = Math.min(intended, availableCreditCents(balCents, await readCreditExpiry(p.client_id)))')
    expect(prog).toContain('await recordCreditSpent(p.client_id, applied)')
  })
})
