// ⚑ 16 Sep (GAP 1) — THE FIVE SENDER-ISOLATION CASES, PROVED BEHAVIOURALLY.
//
// The sibling file proves these as source guards; these run the real `claimPooledSender`
// against a `client_inboxes` double, because "a House mailbox cannot be claimed by a fresh
// client" is a claim about what the function DOES, and a source scan cannot make it.
//
// ⚠️ NO REAL CREDENTIAL ANYWHERE. The injected inventory is fake hosts, fake users and a fake
// secret, and `verifyInbox` is stubbed — nothing opens a connection and nothing sends.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ⚠️ NO PROCESS-GLOBAL SECRET IS SET HERE, DELIBERATELY. An earlier cut set
// `INBOX_SECRET_KEY` for the whole worker, which is exactly the kind of cross-file leakage
// that makes an unrelated suite fail in a full run and pass on its own. `encryptSecret` is
// stubbed below, so this file never needs the real key.
vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'
})

/** Rows in `client_inboxes`, as the double serves them. */
type Row = { id: string; client_id: string; email: string; status: string }
const state: { inboxes: Row[]; inserts: Record<string, unknown>[]; failInsertFor: string[] } = {
  inboxes: [], inserts: [], failInsertFor: [],
}

/**
 * A `client_inboxes` double that honours the two things this test is about: filtering by
 * status and by client, and the UNIQUE INDEX refusing a second live row for one address.
 */
vi.mock('@kind/db', () => {
  const makeQuery = () => {
    const q: Record<string, unknown> = {}
    const filters: Array<(r: Row) => boolean> = []
    let payload: Record<string, unknown> | null = null
    let mode = ''
    Object.assign(q, {
      select: () => q,
      eq: (col: string, val: unknown) => { filters.push(r => (r as unknown as Record<string, unknown>)[col] === val); return q },
      in: (col: string, vals: unknown[]) => { filters.push(r => (vals as unknown[]).includes((r as unknown as Record<string, unknown>)[col])); return q },
      is: () => q, not: () => q, order: () => q, limit: () => q,
      update: () => { mode = 'update'; return q },
      insert: (p: Record<string, unknown>) => { mode = 'insert'; payload = p; return q },
      async maybeSingle() {
        const hit = state.inboxes.filter(r => filters.every(f => f(r)))
        return { data: hit[0] ?? null, error: null }
      },
      async single() {
        if (mode !== 'insert' || !payload) return { data: null, error: null }
        const email = String(payload.email).toLowerCase()
        // 🛑 THE INDEX. One live row per address, across every client.
        const live = state.inboxes.some(r => r.email.toLowerCase() === email &&
          ['assigned', 'warming', 'active'].includes(r.status))
        if (live || state.failInsertFor.includes(email)) {
          return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
        }
        state.inserts.push(payload)
        const row: Row = {
          id: `inbox-${state.inboxes.length + 1}`,
          client_id: String(payload.client_id), email, status: String(payload.status),
        }
        state.inboxes.push(row)
        return { data: { id: row.id }, error: null }
      },
      then(res: (v: { data: unknown; error: unknown }) => unknown) {
        if (mode === 'update') return Promise.resolve({ data: [], error: null }).then(res)
        const hit = state.inboxes.filter(r => filters.every(f => f(r)))
        return Promise.resolve({ data: hit, error: null }).then(res)
      },
    })
    return q
  }
  return { db: { from: () => makeQuery(), rpc: async () => ({ data: null, error: null }) } }
})

// Verification is a network act. Stubbed to succeed; GAP 1 is about WHICH mailbox is chosen.
vi.mock('./mailer', () => ({
  verifyInbox: async () => ({ ok: true, message: 'stubbed — nothing connected, nothing sent' }),
}))
vi.mock('./inbox-secret', () => ({ encryptSecret: (v: string) => `enc:${v.length}` }))

import { claimPooledSender } from './sender-claim'
import { SENDER_POOL_ENV } from './sender-pool'

const sender = (email: string) => ({
  email, smtp_host: 'smtp.example-pool.test', smtp_port: 587, smtp_secure: false,
  smtp_user: email, smtp_pass: 'fake-not-a-real-password', from_name: 'Outreach',
})

const HOUSE = 'client-house'
const A = 'client-A'
const B = 'client-B'

beforeEach(() => {
  state.inboxes = []; state.inserts = []; state.failInsertFor = []
  delete process.env[SENDER_POOL_ENV]
})

// ─────────────────────────────────────────────────────────────────────────────
describe('① a House mailbox already assigned cannot be claimed by a fresh client', () => {
  it('🛑 THE HOUSE MAILBOX IS SKIPPED, and the free one is taken instead', async () => {
    state.inboxes = [{ id: 'i-house', client_id: HOUSE, email: 'house@pool.test', status: 'assigned' }]
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('house@pool.test'), sender('free@pool.test')])

    const r = await claimPooledSender(A)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.email).toBe('free@pool.test')
    // And House's row was not touched.
    expect(state.inboxes.find(i => i.email === 'house@pool.test')!.client_id).toBe(HOUSE)
  })

  it('🛑 AND IF THE HOUSE MAILBOX IS THE ONLY ONE, THE CLAIM REFUSES — it does not steal it', async () => {
    state.inboxes = [{ id: 'i-house', client_id: HOUSE, email: 'house@pool.test', status: 'assigned' }]
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('house@pool.test')])

    const r = await claimPooledSender(A)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('all_taken')
    expect(state.inserts, 'a row was written for a mailbox House holds').toHaveLength(0)
  })

  it('a WARMING House mailbox is equally protected — warming is in play', async () => {
    state.inboxes = [{ id: 'i-house', client_id: HOUSE, email: 'house@pool.test', status: 'warming' }]
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('house@pool.test')])
    const r = await claimPooledSender(A)
    expect(r.ok).toBe(false)
  })

  it('a RELEASED House mailbox IS claimable — that is the documented lifecycle', async () => {
    // `released → back to the pool` is what the schema says the status means. Protecting a
    // released row would strand every mailbox House ever handed back.
    state.inboxes = [{ id: 'i-house', client_id: HOUSE, email: 'house@pool.test', status: 'released' }]
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('house@pool.test')])
    const r = await claimPooledSender(A)
    expect(r.ok).toBe(true)
  })
})

describe('② a mailbox assigned to Client A cannot be claimed by Client B', () => {
  it('🛑 CLIENT B IS REFUSED, and nothing is written', async () => {
    state.inboxes = [{ id: 'i-a', client_id: A, email: 'shared@pool.test', status: 'active' }]
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('shared@pool.test')])

    const r = await claimPooledSender(B)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('all_taken')
    expect(state.inserts).toHaveLength(0)
  })

  it('and a client who already HAS a mailbox is told so rather than given a second', async () => {
    state.inboxes = [{ id: 'i-a', client_id: A, email: 'mine@pool.test', status: 'assigned' }]
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('free@pool.test')])

    const r = await claimPooledSender(A)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('already_has_sender')
    expect(state.inserts, 'a second mailbox was assigned to one client').toHaveLength(0)
  })
})

describe('③ a free mailbox is claimed, once, with its credentials encrypted', () => {
  it('one client claims it and it verifies', async () => {
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('free@pool.test')])
    const r = await claimPooledSender(A)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.email).toBe('free@pool.test')
      expect(r.verified).toBe(true)
    }
  })

  it('🛑 THE PASSWORD IS ENCRYPTED IN THE WRITTEN ROW, never stored in the clear', async () => {
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('free@pool.test')])
    await claimPooledSender(A)
    const row = state.inserts[0]
    expect(row.smtp_pass_enc).toBe('enc:24')
    expect(row, 'a plaintext password column was written').not.toHaveProperty('smtp_pass')
    expect(JSON.stringify(row), 'the secret reached the row in clear text')
      .not.toContain('fake-not-a-real-password')
  })

  it('and it is written as a POOLED mailbox at `assigned`', async () => {
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('free@pool.test')])
    await claimPooledSender(A)
    expect(state.inserts[0].kind).toBe('pooled')
    expect(state.inserts[0].status).toBe('assigned')
    expect(state.inserts[0].client_id).toBe(A)
  })
})

describe('④ concurrent claims — one winner', () => {
  it('🛑 TWO CLIENTS, ONE MAILBOX: exactly one gets it', async () => {
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('only@pool.test')])
    const [ra, rb] = await Promise.all([claimPooledSender(A), claimPooledSender(B)])
    const winners = [ra, rb].filter(r => r.ok)
    expect(winners, 'both clients were given the same mailbox').toHaveLength(1)
    // And only one row exists for it.
    expect(state.inboxes.filter(i => i.email === 'only@pool.test')).toHaveLength(1)
  })

  it('🛑 THE LOSER OF A RACE TAKES THE NEXT MAILBOX rather than failing', async () => {
    // The index refuses the first candidate for B; the loop must move on, not give up.
    state.failInsertFor = ['first@pool.test']
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('first@pool.test'), sender('second@pool.test')])
    const r = await claimPooledSender(B)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.email).toBe('second@pool.test')
  })

  it('and when every mailbox is lost to a race, it refuses honestly', async () => {
    state.failInsertFor = ['first@pool.test', 'second@pool.test']
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('first@pool.test'), sender('second@pool.test')])
    const r = await claimPooledSender(B)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('all_taken')
  })
})

describe('⑤ K.I.N.D\'s own sending identity is never claimable', () => {
  it('🛑 THE TRANSACTIONAL / COLD ADDRESS IS REFUSED even when listed alone', async () => {
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('hello@get-kind.com')])
    const r = await claimPooledSender(A)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no_inventory')
    expect(state.inserts, 'a client was assigned K.I.N.D\'s own sending address').toHaveLength(0)
  })

  it('and it is skipped in favour of a legitimate mailbox beside it', async () => {
    process.env[SENDER_POOL_ENV] = JSON.stringify([sender('hello@get-kind.com'), sender('free@pool.test')])
    const r = await claimPooledSender(A)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.email).toBe('free@pool.test')
  })
})
