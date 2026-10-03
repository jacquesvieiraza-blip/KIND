// 9c part 2 (#2560 · review S17) — A FINISHED CLIENT'S POOLED MAILBOXES GO BACK AFTER A QUIET MONTH.
//
// Released at the finish line, a prospect replying a week later could not be answered from the
// mailbox they wrote to (R187 ④). Now: every programme ended 30+ days ago and no reply in 30 days.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const NOW = new Date('2026-11-15T05:45:00Z')
const OLD = '2026-10-01T10:00:00Z'     // 45 days before NOW
const RECENT = '2026-11-01T10:00:00Z'  // 14 days before NOW
let programmes: Record<string, { status: string; updated_at: string }[]> = {}
let replies: Record<string, number> = {}
const released: string[] = []

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      let client = ''
      let patch = false
      const q: Record<string, (...a: unknown[]) => unknown> = {
        select: () => q, update: () => { patch = true; return q }, not: () => q, gte: () => q, in: () => q,
        eq: (c: unknown, v: unknown) => { if (c === 'client_id') client = String(v); return q },
      }
      ;(q as Record<string, unknown>).then = (ok: (v: unknown) => unknown) => {
        if (t === 'client_inboxes' && patch) { released.push(client); return Promise.resolve({ data: [{ email: `${client}@pool.com` }], error: null }).then(ok) }
        if (t === 'client_inboxes') return Promise.resolve({ data: Object.keys(programmes).map(c => ({ client_id: c })), error: null }).then(ok)
        if (t === 'programmes') return Promise.resolve({ data: programmes[client] ?? [], error: null }).then(ok)
        if (t === 'figsy_replies') return Promise.resolve({ count: replies[client] ?? 0, data: null, error: null }).then(ok)
        return Promise.resolve({ data: [], error: null }).then(ok)
      }
      return q
    },
  },
}))
vi.mock('./house-client', () => ({ isHouseClient: async (c: string) => c === 'house' }))
vi.mock('./inbox-secret', () => ({ encryptSecret: (s: string) => s }))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => ({ delivered: true }) }))
vi.mock('./programme', () => ({ TERMINAL_STATUSES: ['COMPLETED', 'CANCELLED'] }))

import { releaseQuietPooledSenders, POOLED_RELEASE_QUIET_DAYS } from './sender-claim'

beforeEach(() => { programmes = {}; replies = {}; released.length = 0 })

describe('9c·2 — who is released', () => {
  it('a month is the rule', () => expect(POOLED_RELEASE_QUIET_DAYS).toBe(30))
  it('ended over 30 days ago and quiet → released', async () => {
    programmes = { done: [{ status: 'COMPLETED', updated_at: OLD }] }
    const r = await releaseQuietPooledSenders(NOW)
    expect(r.released).toEqual({ done: ['done@pool.com'] })
  })
  it('ended only 14 days ago → kept', async () => {
    programmes = { fresh: [{ status: 'COMPLETED', updated_at: RECENT }] }
    expect((await releaseQuietPooledSenders(NOW)).released).toEqual({})
  })
  it('a reply in the last 30 days → kept, so it can be answered from the same mailbox', async () => {
    programmes = { chatty: [{ status: 'COMPLETED', updated_at: OLD }] }
    replies = { chatty: 1 }
    expect((await releaseQuietPooledSenders(NOW)).released).toEqual({})
  })
  it('refunded or disputed (still paused, not ended), or any open programme → kept', async () => {
    programmes = { refunded: [{ status: 'LIVE', updated_at: OLD }], mixed: [{ status: 'COMPLETED', updated_at: OLD }, { status: 'READY_FOR_APPROVAL', updated_at: OLD }] }
    expect((await releaseQuietPooledSenders(NOW)).released).toEqual({})
  })
  it('House is never released', async () => {
    programmes = { house: [{ status: 'COMPLETED', updated_at: OLD }] }
    expect((await releaseQuietPooledSenders(NOW)).released).toEqual({})
    expect(released).toEqual([])
  })
})

describe('9c·2 — wired into the daily programme run, and never fails it', () => {
  it('the auto-batch route calls it inside its own try', () => {
    const src = readFileSync(join(__dirname, '../routes/internal.ts'), 'utf8')
    const route = src.slice(src.indexOf("internalRouter.post('/programmes/auto-batch'"), src.indexOf('// ── MILLA MORNING BRIEF'))
    expect(route).toContain('const rel = await releaseQuietPooledSenders()')
    expect(route).toContain("catch (relErr) { console.error('[programmes/auto-batch] pooled release threw', relErr) }")
  })
})
