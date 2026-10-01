// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (Coaching F1 · #2483) — "HOW DID IT GO?": what an answer may and may not do.
//
// 🛑 The two money-adjacent rules: a client's "it happened" confirms the meeting HELD (they were
// in the room, R180 Q4); a client's "they didn't show" NEVER confirms a no-show — it raises a task
// for our team, so a meeting cannot be uncounted by the person who pays for it.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  inserts: [] as Array<Record<string, unknown>>, insertError: null as null | { message: string },
  held: [] as Array<[string, string]>, tasks: [] as Array<Record<string, unknown>>, demo: false,
  rows: [] as Array<Record<string, unknown>>,
}))

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, in() { return q }, order() { return q }, limit() { return q },
        insert(row: Record<string, unknown>) { state.inserts.push(row); return Promise.resolve({ error: state.insertError }) },
        then(r: (v: unknown) => unknown) { return Promise.resolve(r({ data: state.rows, error: null })) },
      }
      return q
    },
  },
}))
vi.mock('./meeting-truth', () => ({
  confirmHeld: async (id: string, by: string) => { state.held.push([id, by]); return { ok: true } },
}))
vi.mock('./operator-tasks', () => ({ raiseOperatorTask: async (t: Record<string, unknown>) => { state.tasks.push(t); return { ok: true } } }))
vi.mock('./demo', () => ({ isDemoClient: async () => state.demo }))

import { recordMeetingOutcome, needsAnswer, latestOutcomes } from './meeting-outcome'

const NOW = Date.parse('2026-10-01T12:00:00Z')
const PAST = { id: 'm-1', scheduledAt: '2026-09-30T10:00:00Z', state: 'BOOKED', programmeId: 'p-1' }
const rec = (answer: unknown, meeting = PAST, note?: string) =>
  recordMeetingOutcome({ clientId: 'c-1', meeting, answer, note, by: 'hannah@northwind.test', now: NOW })

beforeEach(() => { state.inserts = []; state.insertError = null; state.held = []; state.tasks = []; state.demo = false; state.rows = [] })

describe('F1 — what an answer does', () => {
  it('🛑 "next step agreed": recorded, and the meeting is confirmed HELD by the client', async () => {
    const r = await rec('next_step', PAST, '  Wants a proposal by Friday  ')
    expect(r.ok).toBe(true)
    expect(state.inserts[0]).toMatchObject({ client_id: 'c-1', event_type: 'meeting_outcome', payload: { meeting_id: 'm-1', answer: 'next_step', note: 'Wants a proposal by Friday' } })
    expect(state.held).toEqual([['m-1', 'client:hannah@northwind.test']])
    expect(state.tasks).toEqual([])
  })

  it('🛑 "they didn\'t show": recorded and a task raised for our team — the meeting is NOT confirmed either way', async () => {
    const r = await rec('no_show')
    expect(r.ok).toBe(true)
    expect(state.held).toEqual([])
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0]).toMatchObject({ kind: 'meeting_no_show_reported', subjectId: 'm-1', programmeId: 'p-1' })
  })

  it('the demo account\'s "didn\'t show" raises no task for the real team', async () => {
    state.demo = true
    expect((await rec('no_show')).ok).toBe(true)
    expect(state.tasks).toEqual([])
  })

  it('a meeting that hasn\'t happened yet cannot be answered', async () => {
    const r = await rec('next_step', { ...PAST, scheduledAt: '2026-10-02T10:00:00Z' })
    expect(r).toMatchObject({ ok: false, status: 400 })
    expect(state.inserts).toEqual([])
  })

  it('an unknown answer is refused and nothing is written', async () => {
    expect(await rec('great')).toMatchObject({ ok: false, status: 400 })
    expect(state.inserts).toEqual([])
  })

  it('a HELD meeting can change its kind of outcome, but cannot become "didn\'t show"', async () => {
    expect((await rec('not_now', { ...PAST, state: 'HELD' })).ok).toBe(true)
    expect(state.held).toEqual([])  // already held — confirmed once
    expect(await rec('no_show', { ...PAST, state: 'HELD' })).toMatchObject({ ok: false, status: 409 })
  })

  it('🛑 a failed write changes nothing: no HELD, no task, and the client is told', async () => {
    state.insertError = { message: 'down' }
    const r = await rec('next_step')
    expect(r).toMatchObject({ ok: false, status: 503 })
    expect(state.held).toEqual([])
    expect(state.tasks).toEqual([])
  })
})

describe('F1 — when to ask', () => {
  it('asks once a booked meeting\'s time has passed and nothing has settled it', () => {
    expect(needsAnswer({ scheduledAt: '2026-09-30T10:00:00Z', state: 'BOOKED' }, false, NOW)).toBe(true)
    expect(needsAnswer({ scheduledAt: '2026-09-30T10:00:00Z', state: 'BOOKED' }, true, NOW)).toBe(false)
    expect(needsAnswer({ scheduledAt: '2026-10-02T10:00:00Z', state: 'BOOKED' }, false, NOW)).toBe(false)
    expect(needsAnswer({ scheduledAt: '2026-09-30T10:00:00Z', state: 'HELD' }, false, NOW)).toBe(false)
    expect(needsAnswer({ scheduledAt: '2026-09-30T10:00:00Z', state: 'NO_SHOW' }, false, NOW)).toBe(false)
  })

  it('the latest answer wins, per meeting', async () => {
    state.rows = [
      { payload: { meeting_id: 'm-1', answer: 'not_now', note: null }, occurred_at: '2026-10-01T11:00:00Z' },
      { payload: { meeting_id: 'm-1', answer: 'next_step', note: 'old' }, occurred_at: '2026-10-01T10:00:00Z' },
    ]
    const m = await latestOutcomes('c-1', ['m-1'])
    expect(m?.get('m-1')).toMatchObject({ answer: 'not_now', label: 'Held · interested, not now' })
  })
})
