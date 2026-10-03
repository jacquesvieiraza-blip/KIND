// 14d (#2561) — DAILY: EVERY PAID PROGRAMME CHECKOUT IS RECORDED, OR THE FOUNDER IS TOLD.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const alerts: { subject: string; lines: string[]; about: { dedupeKey?: string } }[] = []
let stripeRows: unknown[] | null = []
let programmes: Record<string, unknown>[] = []

vi.mock('./stripe', () => ({
  listPaidProgrammeCheckouts: async () => (stripeRows === null ? null : { rows: stripeRows, truncated: false }),
}))
vi.mock('./alerts', () => ({
  sendFounderAlert: async (_k: string, subject: string, lines: string[], about: { dedupeKey?: string }) => { alerts.push({ subject, lines, about }); return { delivered: true } },
}))
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const q = {
        select: () => q, eq: () => q,
        in: async () => ({ data: programmes, error: null }),
        maybeSingle: async () => ({ data: t === 'clients' ? { company_name: 'Acme Ltd' } : null, error: null }),
      }
      return q
    },
  },
}))

import { findUnrecorded, reconcileProgrammePayments, GRACE_SECONDS } from './payment-reconcile'

const NOW = new Date('2026-10-02T12:00:00Z')
const nowUnix = Math.floor(NOW.getTime() / 1000)
const paid = (over: Record<string, unknown> = {}) => ({
  sessionId: 'cs_1', programmeId: 'p1', clientId: 'c1', stage: 'first', amountTotal: 450000, currency: 'usd',
  paymentIntentId: 'pi_1', created: nowUnix - 2 * 3600, ...over,
})

beforeEach(() => { alerts.length = 0; stripeRows = []; programmes = [] })

describe('14d — the comparison', () => {
  it('recorded → nothing; missing → flagged; another payment on record → a double payment', () => {
    const rows = [paid(), paid({ sessionId: 'cs_2', programmeId: 'p2' }), paid({ sessionId: 'cs_3', programmeId: 'p3' })] as never[]
    const progs = [
      { id: 'p1', first_payment_ref: 'cs_1', second_payment_ref: null },
      { id: 'p2', first_payment_ref: null, second_payment_ref: null },
      { id: 'p3', first_payment_ref: 'cs_other', second_payment_ref: null },
    ]
    const f = findUnrecorded(rows, progs, nowUnix)
    expect(f.map(u => [u.sessionId, u.kind])).toEqual([['cs_2', 'missing'], ['cs_3', 'other_payment_on_record']])
  })
  it('a payment under an hour old is left alone — its webhook may still be coming', () => {
    const f = findUnrecorded([paid({ created: nowUnix - GRACE_SECONDS + 60 })] as never[], [{ id: 'p1', first_payment_ref: null, second_payment_ref: null }], nowUnix)
    expect(f).toEqual([])
  })
  it('the second stage is compared with the second payment', () => {
    const f = findUnrecorded([paid({ stage: 'second' })] as never[], [{ id: 'p1', first_payment_ref: 'cs_1', second_payment_ref: null }], nowUnix)
    expect(f[0].kind).toBe('missing')
  })
})

describe('14d — the daily run', () => {
  it('tells the founder once per unrecorded payment, naming the client, amount and Stripe link', async () => {
    stripeRows = [paid()]
    programmes = [{ id: 'p1', first_payment_ref: null, second_payment_ref: null }]
    const r = await reconcileProgrammePayments(NOW)
    expect(r).toEqual({ ok: true, checked: 1, unrecorded: 1 })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].subject).toBe('A paid programme payment is not recorded — Acme Ltd')
    expect(alerts[0].lines.join('\n')).toMatch(/4500\.00 USD/)
    expect(alerts[0].lines.join('\n')).toMatch(/payments\/pi_1/)
    expect(alerts[0].about.dedupeKey).toBe('payment_unrecorded:cs_1')
  })
  it('a double payment collapses into the webhook\'s own double-payment task', async () => {
    stripeRows = [paid()]
    programmes = [{ id: 'p1', first_payment_ref: 'cs_earlier', second_payment_ref: null }]
    await reconcileProgrammePayments(NOW)
    expect(alerts[0].about.dedupeKey).toBe('double_payment:cs_1')
  })
  it('everything recorded → no alert; Stripe unreadable → not ok, and no false "all clear"', async () => {
    stripeRows = [paid()]
    programmes = [{ id: 'p1', first_payment_ref: 'cs_1', second_payment_ref: null }]
    expect(await reconcileProgrammePayments(NOW)).toEqual({ ok: true, checked: 1, unrecorded: 0 })
    expect(alerts).toHaveLength(0)
    stripeRows = null
    expect((await reconcileProgrammePayments(NOW)).ok).toBe(false)
  })
  it('it runs every day', () => {
    const CRON = readFileSync(join(__dirname, '../cron.ts'), 'utf8')
    expect(CRON).toMatch(/cron\.schedule\('25 6 \* \* \*', \(\) => \{ void reconcilePayments\(\) \}/)
  })
})
