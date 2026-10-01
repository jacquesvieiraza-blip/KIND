// ⚑ 1 Oct (R180 · #2516) — 25% · Founders: a taste of Coaching from ONE real meeting, written once,
// no buy button. Who gets it, which meeting, and "never a second model call".
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  view: null as Record<string, unknown> | null,
  rows: [] as Array<{ id: string; leadId: string | null; state: string; scheduledAt: string; rescheduled: boolean }>,
  outcomes: new Map<string, { answer: string; note: string | null; label: string; at: string }>(),
  drafts: new Map<string, Record<string, unknown>>(),
  writes: [] as Array<Record<string, unknown>>, remembered: [] as Array<unknown[]>,
}))
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, neq() { return q }, order() { return q }, limit() { return q }, is() { return q },
        maybeSingle() {
          return Promise.resolve(t === 'leads' ? { data: { id: 'l-1', first_name: 'Callum', last_name: 'Reid', job_title: 'COO', company: 'Harbour Freight' }, error: null }
            : t === 'clients' ? { data: { company_name: 'Northwind' }, error: null } : { data: null, error: null })
        },
      }
      return q
    },
  },
}))
vi.mock('./expansion-moments', () => ({
  ensureMoment: async () => state.view,
  writeResponse: async (...a: unknown[]) => { state.remembered.push(a); return true },
}))
vi.mock('./meeting-truth', () => ({ meetingsForClient: async () => state.rows }))
vi.mock('./meeting-outcome', () => ({ latestOutcomes: async () => state.outcomes }))
vi.mock('./sales-context', () => ({ salesContextLines: () => [] }))
vi.mock('./follow-up', async (orig) => ({
  ...(await orig<typeof import('./follow-up')>()),
  latestFollowUps: async () => state.drafts,
  writeFollowUp: async (i: Record<string, unknown>) => {
    state.writes.push(i)
    return { ok: true, draft: { subject: 'Following up', body: 'Hi Callum', coaching: { confirm: 'c', nextStep: 'n', risk: 'r' }, at: 'now' } }
  },
}))

import { tasteApplies, pickTaste, tasteFor, writeTaste } from './coaching-taste'
import { canFollowUp } from './follow-up'

const V = (o: Record<string, unknown> = {}) => ({ milestone: 25, plan: 'founders', coachingActive: false, response: 'shown', ...o })
const row = (id: string, s = 'HELD') => ({ id, leadId: 'l-1', state: s, scheduledAt: '2026-09-30T10:00:00Z', rescheduled: false })
const ans = (answer: string) => ({ answer, note: 'Wants a proposal by Friday.', label: '', at: 'x' })
const P = { id: 'p-1', meeting_target: 8, size_band: 'founders' }
const ai = async () => ({})

beforeEach(() => {
  state.view = V(); state.rows = []; state.outcomes = new Map(); state.drafts = new Map(); state.writes = []; state.remembered = []
  process.env.ANTHROPIC_API_KEY = 'test'
})

describe('#2516 — who gets the taste', () => {
  it('🛑 Founders at 25% only: never Growth (it already has follow-up), never Enterprise, never once Full Coaching is on', () => {
    expect(tasteApplies(V() as never)).toBe(true)
    expect(tasteApplies(V({ plan: 'growth' }) as never)).toBe(false)
    expect(tasteApplies(V({ plan: 'enterprise' }) as never)).toBe(false)
    expect(tasteApplies(V({ milestone: 50 }) as never)).toBe(false)
    expect(tasteApplies(V({ coachingActive: true }) as never)).toBe(false)
    expect(tasteApplies(null)).toBe(false)
  })
})

describe('#2516 — which meeting: a real one that went somewhere', () => {
  it('🛑 never a no-show or a not-fit; the newest meeting that went somewhere; a kept example wins', () => {
    const rows = [row('m-3', 'NO_SHOW'), row('m-2'), row('m-1')]
    const outcomes = new Map([['m-3', ans('next_step')], ['m-2', ans('not_fit')], ['m-1', ans('not_now')]])
    expect(pickTaste(rows, outcomes, new Map(), canFollowUp)).toEqual({ meetingId: 'm-1', example: null })
    expect(pickTaste(rows, new Map([['m-2', ans('not_fit')]]), new Map(), canFollowUp)).toEqual({ meetingId: null, example: null })
    const kept = { subject: 's', body: 'b', coaching: null, at: 'x' }
    const two = [row('m-2'), row('m-1')]
    const both = new Map([['m-2', ans('next_step')], ['m-1', ans('next_step')]])
    expect(pickTaste(two, both, new Map([['m-1', kept]]), canFollowUp)).toEqual({ meetingId: 'm-1', example: kept })
  })

  it('no meeting answered yet → the panel asks for "How did it go?" first, and the button refuses', async () => {
    state.rows = [row('m-1')]
    expect(await tasteFor('c-1', 'p-1', V() as never)).toEqual({ meeting: null, example: null })
    const r = await writeTaste('c-1', P as never, 'me@x', ai)
    expect(r).toMatchObject({ ok: false, status: 409 })
    expect(state.writes).toHaveLength(0)
  })
})

describe('#2516 — written once, from the real meeting, with Full Coaching\'s own writer', () => {
  it('writes ONE coach-level example grounded in the client\'s own answer, and remembers 25% "engaged"', async () => {
    state.rows = [row('m-1')]; state.outcomes = new Map([['m-1', ans('next_step')]])
    const r = await writeTaste('c-1', P as never, 'me@x', ai)
    expect(r).toMatchObject({ ok: true, taste: { meeting: { id: 'm-1', name: 'Callum Reid', company: 'Harbour Freight' } } })
    expect(state.writes).toHaveLength(1)
    expect(state.writes[0]).toMatchObject({ level: 'coach', meetingId: 'm-1', outcome: { answer: 'next_step', note: 'Wants a proposal by Friday.' } })
    expect(state.remembered).toEqual([['c-1', 'p-1', 25, 'engaged']])
  })

  it('🛑 a second press returns the kept example — no second model call', async () => {
    state.rows = [row('m-1')]; state.outcomes = new Map([['m-1', ans('next_step')]])
    state.drafts = new Map([['m-1', { subject: 's', body: 'b', coaching: { confirm: 'c', nextStep: 'n', risk: 'r' }, at: 'x' }]])
    state.view = V({ response: 'engaged' })
    const r = await writeTaste('c-1', P as never, 'me@x', ai)
    expect(r).toMatchObject({ ok: true, taste: { example: { subject: 's' } } })
    expect(state.writes).toHaveLength(0)
    expect(state.remembered).toHaveLength(0)
  })

  it('🛑 not the taste moment (Growth, 50%, Coaching on) → refused, nothing written', async () => {
    state.rows = [row('m-1')]; state.outcomes = new Map([['m-1', ans('next_step')]])
    for (const v of [V({ plan: 'growth' }), V({ milestone: 50 }), V({ coachingActive: true }), null]) {
      state.view = v as never
      expect(await writeTaste('c-1', P as never, 'me@x', ai)).toMatchObject({ ok: false, status: 409 })
    }
    expect(state.writes).toHaveLength(0)
    expect(await tasteFor('c-1', 'p-1', V({ plan: 'growth' }) as never)).toBeNull()
  })
})
