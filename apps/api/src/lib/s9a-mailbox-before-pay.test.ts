// 9a (#2560 · R189 ②) — NO FIRST PAYMENT WITHOUT THE CLIENT'S TWO MAILBOXES.

import { describe, it, expect, vi, beforeEach } from 'vitest'

let held: { id: string }[] = []
let live: { email: string }[] = []
let readErr = false
const alerts: { subject: string; key?: string }[] = []

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      let byClient = false
      const q: Record<string, (...a: unknown[]) => unknown> = {
        select: () => q,
        eq: (c: unknown) => { if (c === 'client_id') byClient = true; return q },
        in: () => Promise.resolve(readErr ? { data: null, error: { message: 'down' } } : { data: byClient ? held : live, error: null }),
      }
      return q
    },
  },
}))
vi.mock('./sender-pool', () => ({
  SENDER_POOL_ENV: 'POOLED_SENDERS_JSON',
  senderIsReserved: () => false,
  senderPoolFromEnv: () => ({ problems: [], senders: ['a@p.com', 'b@p.com', 'c@p.com', 'd@p.com'].map(email => ({ email })) }),
}))
vi.mock('./inbox-secret', () => ({ encryptSecret: (s: string) => s }))
vi.mock('./alerts', () => ({ sendFounderAlert: async (_k: string, subject: string, _l: string[], about?: { dedupeKey?: string }) => { alerts.push({ subject, key: about?.dedupeKey }); return { delivered: true } } }))

import { mailboxGate, mailboxesReadyForPayment, pooledSenderStock, MAILBOXES_PER_CLIENT, MAILBOX_NOT_READY_COPY } from './sender-claim'

beforeEach(() => { held = []; live = []; readErr = false; alerts.length = 0 })

describe('9a — the rule (R189 ②: two per client)', () => {
  it('two per client; a client holding some needs only the rest', () => {
    expect(MAILBOXES_PER_CLIENT).toBe(2)
    expect(mailboxGate(0, 2)).toEqual({ ok: true, need: 2 })
    expect(mailboxGate(0, 1)).toEqual({ ok: false, need: 2 })
    expect(mailboxGate(1, 1)).toEqual({ ok: true, need: 1 })
    expect(mailboxGate(2, 0)).toEqual({ ok: true, need: 0 })
  })
})

describe('9a — the payment door', () => {
  it('the free count excludes every mailbox live on a client', async () => {
    live = [{ email: 'a@p.com' }, { email: 'B@p.com ' }]
    expect(await pooledSenderStock()).toEqual({ ok: true, total: 4, free: 2 })
  })
  it('enough free → may pay; leaving fewer than 2 free → the founder is warned', async () => {
    live = [{ email: 'a@p.com' }]          // 3 free, client takes 2, 1 left
    expect(await mailboxesReadyForPayment('c1', new Date('2026-10-02T09:00:00Z'))).toEqual({ ok: true })
    expect(alerts).toEqual([{ subject: 'Only 1 pooled sending mailbox left', key: 'mailbox_pool_low:2026-10-02' }])
  })
  it('not enough free → refused, and the founder is told who and how many', async () => {
    live = [{ email: 'a@p.com' }, { email: 'b@p.com' }, { email: 'c@p.com' }]
    const r = await mailboxesReadyForPayment('c1')
    expect(r.ok).toBe(false)
    expect(alerts[0].subject).toBe('A client tried to pay and no sending mailbox was free')
  })
  it('unreadable → refused, never a guess', async () => {
    readErr = true
    expect((await mailboxesReadyForPayment('c1')).ok).toBe(false)
  })
  it('the client is told plainly that nothing was charged', () => {
    expect(MAILBOX_NOT_READY_COPY).toMatch(/Nothing has been charged\.$/)
  })
})

describe('9a — wired in', () => {
  it('the only Stripe door asks before a first payment; Vida shows the free count', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const door = readFileSync(join(__dirname, 'programme-checkout.ts'), 'utf8')
    const ask = door.indexOf('await mailboxesReadyForPayment(params.clientId)')
    expect(ask).toBeGreaterThan(-1)
    expect(door.indexOf('stripe.checkout.sessions.create(')).toBeGreaterThan(ask)
    expect(readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')).toContain('pooled_stock:')
    expect(readFileSync(join(__dirname, '../../../admin/src/app/vida/engine/page.tsx'), 'utf8')).toContain('Pooled mailboxes free:')
  })
})
