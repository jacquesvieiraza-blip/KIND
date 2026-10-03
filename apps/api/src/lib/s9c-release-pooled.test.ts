// 9c (#2560) — POOLED MAILBOXES GO BACK TO THE POOL WHEN THE CLIENT IS DONE.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

let openProgrammes: { id: string }[] = []
let house = false
const updates: { patch: Record<string, unknown>; filters: string[] }[] = []

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const filters: string[] = []
      let patch: Record<string, unknown> | null = null
      const q: Record<string, (...a: unknown[]) => unknown> = {
        select: () => q,
        update: (p: unknown) => { patch = p as Record<string, unknown>; return q },
        eq: (c: unknown, v: unknown) => { filters.push(`${c}=${v}`); return q },
        in: (c: unknown) => { filters.push(`in:${c}`); return q },
        not: () => Promise.resolve({ data: openProgrammes, error: null }),
      }
      ;(q as Record<string, unknown>).then = (ok: (v: unknown) => unknown) => {
        if (t === 'client_inboxes' && patch) { updates.push({ patch, filters }); return Promise.resolve({ data: [{ email: 'a@pool.com' }, { email: 'b@pool.com' }], error: null }).then(ok) }
        return Promise.resolve({ data: [], error: null }).then(ok)
      }
      return q
    },
  },
}))
vi.mock('./house-client', () => ({ isHouseClient: async () => house }))
vi.mock('./inbox-secret', () => ({ encryptSecret: (s: string) => s }))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => ({ delivered: true }) }))

import { releasePooledSenders } from './sender-claim'

beforeEach(() => { openProgrammes = []; house = false; updates.length = 0 })

describe('9c — release', () => {
  it('no other open programme → the client\'s live POOLED mailboxes are released', async () => {
    expect(await releasePooledSenders('c1', 'completed')).toEqual({ ok: true, released: ['a@pool.com', 'b@pool.com'] })
    expect(updates[0].patch.status).toBe('released')
    expect(updates[0].filters).toEqual(expect.arrayContaining(['client_id=c1', 'kind=pooled', 'in:status']))
  })
  it('a refunded programme is not counted as still open; another open programme keeps them', async () => {
    openProgrammes = [{ id: 'p1' }]
    expect(await releasePooledSenders('c1', 'refunded', 'p1')).toMatchObject({ ok: true, released: ['a@pool.com', 'b@pool.com'] })
    updates.length = 0
    openProgrammes = [{ id: 'p1' }, { id: 'p2' }]
    expect(await releasePooledSenders('c1', 'refunded', 'p1')).toEqual({ ok: true, released: [] })
    expect(updates).toHaveLength(0)
  })
  it('House keeps its mailboxes', async () => {
    house = true
    expect(await releasePooledSenders('house', 'completed')).toEqual({ ok: true, released: [] })
    expect(updates).toHaveLength(0)
  })
  // ⛓️ 3 Oct (review S17): this asserted that completion and a refund both release AT ONCE. A
  // prospect replying after the finish then had no mailbox to be answered from, and releasing on
  // a refund was never ruled. Now neither releases; the daily job does, after a quiet month
  // (s9c2-quiet-release.test.ts).
  it('completion and a refund release nothing at once', () => {
    const src = readFileSync(join(__dirname, 'programme.ts'), 'utf8')
    expect(src).not.toContain('releasePooledAfter(')
    expect(src).not.toContain("releasePooledSenders(")
  })
})
