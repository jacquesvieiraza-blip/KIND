// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R166 ⑥ · P1, board #2347) — THE SENDING LIMITS WE ALREADY HAVE, MADE TO HOLD.
//
// The founder: *"i am very seriouos about how many leads we also try and attempt. the barriers
// need to be there."* Each clause below is proved to REFUSE at the limit and when the count
// cannot be read, and to let an ordinary send through — a limit that blocked everything would
// pass the first half alone.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({ sent: [] as Row[], sentError: false, clientCount: 0, clientError: false, reads: 0 }))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const f: ((r: Row) => boolean)[] = []
      let head = false
      const q: any = {
        select: (_c: string, o?: { head?: boolean }) => { head = !!o?.head; return q },
        in: (c: string, l: unknown[]) => { f.push(r => l.includes(r[c])); return q },
        eq: () => q, gte: () => q, limit: () => q, order: () => q,
        then: (res: (v: unknown) => unknown) => {
          state.reads++
          if (table === 'figsy_sent_emails' && head) {
            return Promise.resolve(state.clientError ? { count: null, error: { message: 'down' } } : { count: state.clientCount, error: null }).then(res)
          }
          if (table === 'figsy_sent_emails') {
            return Promise.resolve(state.sentError ? { data: null, error: { message: 'down' } } : { data: state.sent.filter(r => f.every(fn => fn(r))), error: null }).then(res)
          }
          return Promise.resolve({ data: [], error: null }).then(res)
        },
      }
      return q
    },
  },
}))

import { mailboxDailyCap, DEFAULT_MAILBOX_DAILY_CAP, mailboxSentToday, seedRotationFromToday, mailboxCapState } from './mailbox-daily-cap'
import { nextFromRotation } from './sending-inbox'

const LIB = __dirname
const src = (f: string) => readFileSync(join(LIB, f), 'utf8')
const sent = (inbox: string, n: number) => Array.from({ length: n }, () => ({ inbox_id: inbox }))

beforeEach(() => { state.sent = []; state.sentError = false; state.clientCount = 0; state.clientError = false; state.reads = 0 })

describe('C2 · a mailbox with no limit set is held to 30, never unlimited', () => {
  it('blank → 30; an explicit number stands, including 0', () => {
    expect(DEFAULT_MAILBOX_DAILY_CAP).toBe(30)
    expect(mailboxDailyCap(null)).toBe(30)
    expect(mailboxDailyCap(undefined)).toBe(30)
    expect(mailboxDailyCap(45)).toBe(45)
    expect(mailboxDailyCap(0)).toBe(0)
  })
})

describe('C1 · a mailbox\'s daily limit holds across runs', () => {
  it('each run starts from what the box has ALREADY sent today', async () => {
    state.sent = [...sent('A', 30), ...sent('B', 4)]
    const seeded = (await seedRotationFromToday([
      { id: 'A', dailyCap: null, sentThisBatch: 0 },
      { id: 'B', dailyCap: null, sentThisBatch: 0 },
    ]))!
    expect(seeded.map(s => [s.id, s.sentThisBatch, s.dailyCap])).toEqual([['A', 30, 30], ['B', 4, 30]])
    // 🛑 A is full for the day — the next run cannot pick it again.
    expect(nextFromRotation(seeded)).toBe('B')
  })

  it('every box full → nothing is picked (the run stops, it does not fall back)', async () => {
    state.sent = [...sent('A', 30), ...sent('B', 30)]
    const seeded = (await seedRotationFromToday([{ id: 'A', dailyCap: null, sentThisBatch: 0 }, { id: 'B', dailyCap: null, sentThisBatch: 0 }]))!
    expect(nextFromRotation(seeded)).toBeNull()
  })

  it('🛑 an unreadable count holds the boxes — it never guesses zero', async () => {
    state.sentError = true
    expect(await mailboxSentToday(['A'])).toBeNull()
    expect(await seedRotationFromToday([{ id: 'A', dailyCap: 30, sentThisBatch: 0 }])).toBeNull()
  })

  it('the last check before sending: room, at the limit, unreadable', async () => {
    state.sent = sent('A', 29)
    expect(await mailboxCapState({ id: 'A', daily_cap: null })).toBe('room')
    state.sent = sent('A', 30)
    expect(await mailboxCapState({ id: 'A', daily_cap: null })).toBe('at_cap')
    state.sentError = true
    expect(await mailboxCapState({ id: 'A', daily_cap: 30 })).toBe('unreadable')
    expect(await mailboxCapState({ id: null })).toBe('unreadable')
  })

  it('🛑 every send path checks it, and every send records its mailbox', () => {
    const figsy = src('figsy.ts')
    const fn = figsy.slice(figsy.indexOf('async function sendSequenceEmailCore('))  // both public senders run through the core
    const check = fn.indexOf('await mailboxCapState(sendingInbox)')
    const insert = fn.indexOf("db.from('figsy_sent_emails').insert(")
    expect(check, 'sendSequenceEmail no longer checks the mailbox limit').toBeGreaterThan(-1)
    expect(check, 'the limit is checked AFTER the send is logged').toBeLessThan(insert)
    expect(fn).toContain("if (capState !== 'room') {")
    expect(fn).toContain('inbox_id:      sendingInbox.id ?? null,')
    // Both rotations start from today's count.
    expect(src('send-due.ts')).toContain('await seedRotationFromToday(base)')
    expect(figsy).toContain('await seedRotationFromToday(rotationBase)')
    expect(figsy).toContain('inbox_id:      sendingInbox.id ?? null,   // ⚑ 25 Sep (P1)')
  })

  it('the column exists in the migration and the runner', () => {
    expect(readFileSync(join(LIB, '../../../../supabase/migrations/20260925_sent_email_inbox.sql'), 'utf8'))
      .toContain('ADD COLUMN IF NOT EXISTS inbox_id uuid REFERENCES public.client_inboxes(id) ON DELETE SET NULL')
    expect(src('pending-migrations.ts')).toContain("key: '20260925_sent_email_inbox'")
  })
})

describe('C3 · the per-client daily limit stops when its count cannot be read', () => {
  it('unreadable → held; at the limit → held; room → sends', async () => {
    const { perClientCapReached } = await import('./figsy')
    state.clientError = true
    expect(await perClientCapReached('c1')).toBe(true)
    state.clientError = false
    state.clientCount = 50
    expect(await perClientCapReached('c1')).toBe(true)
    state.clientCount = 12
    expect(await perClientCapReached('c1')).toBe(false)
  })
})

describe('C4 · the programme sequence door has the same maximum as every other door', () => {
  it('🛑 too many steps is refused before anything is read or written', async () => {
    const { MAX_SEQUENCE_STEPS } = await import('@kind/shared')
    const { applyProgrammeSequence } = await import('./programme-sequence')
    const step = (i: number) => ({ subject: `s${i}`, body: `b${i}`, wait_days: i === 0 ? 0 : 3 })
    const tooMany = Array.from({ length: MAX_SEQUENCE_STEPS + 1 }, (_, i) => step(i))
    state.reads = 0
    const r = await applyProgrammeSequence('p1', tooMany as never)
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toContain(`at most ${MAX_SEQUENCE_STEPS} emails`)
    expect(state.reads, 'it read the database before refusing').toBe(0)
  })
})
