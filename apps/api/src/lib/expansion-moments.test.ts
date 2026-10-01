// ⚑ 1 Oct (R180 · Coaching F2 · #2484) — the 25/50/75% moments: trigger, once-only, memory, and
// "Enterprise is never offered Coaching".
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  delivered: 3, events: [] as Array<{ payload: Record<string, unknown>; occurred_at: string }>,
  inserts: [] as Array<Record<string, unknown>>, messages: [] as Array<Record<string, unknown>>,
  tasks: [] as Array<Record<string, unknown>>, demo: false,
}))
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, order() { return q }, limit() { return q },
        insert(row: Record<string, unknown>) {
          if (t === 'outcome_events') { state.inserts.push(row); state.events.unshift({ payload: row.payload as Record<string, unknown>, occurred_at: String(row.occurred_at) }) }
          if (t === 'milla_messages') state.messages.push(row)
          return Promise.resolve({ error: null })
        },
        then(r: (v: unknown) => unknown) {
          return Promise.resolve(r(t === 'milla_sessions' ? { data: [{ id: 's-1' }], error: null } : { data: state.events, error: null }))
        },
      }
      return q
    },
  },
}))
vi.mock('./meeting-truth', () => ({ programmeDelivery: async () => ({ delivered: state.delivered, unqualified: 0, openChallenges: 0, upheld: 0 }) }))
vi.mock('./operator-tasks', () => ({ raiseOperatorTask: async (t: Record<string, unknown>) => { state.tasks.push(t); return { ok: true } } }))
vi.mock('./demo', () => ({ isDemoClient: async () => state.demo }))

import { milestoneFor, momentChat, ensureMoment, respondToMoment } from './expansion-moments'

const P = (band = 'growth', target = 8) => ({ id: 'p-1', meeting_target: target, size_band: band })
beforeEach(() => { state.delivered = 3; state.events = []; state.inserts = []; state.messages = []; state.tasks = []; state.demo = false })

describe('F2 — the trigger', () => {
  it('delivered ÷ target; only the highest milestone crossed', () => {
    expect(milestoneFor(1, 8)).toBeNull()
    expect(milestoneFor(2, 8)).toBe(25)
    expect(milestoneFor(4, 8)).toBe(50)
    expect(milestoneFor(5, 10)).toBe(50)
    expect(milestoneFor(6, 8)).toBe(75)
    expect(milestoneFor(8, 8)).toBe(75)
    expect(milestoneFor(3, 0)).toBeNull()
  })
})

describe('F2 — fires once, remembers the answer', () => {
  it('🛑 the first look fires it: one remembered "shown" and one Milla line — the second look fires nothing', async () => {
    const a = await ensureMoment('c-1', P())
    expect(a?.milestone).toBe(25)
    expect(state.inserts).toHaveLength(1)
    expect(state.messages).toHaveLength(1)
    await ensureMoment('c-1', P())
    expect(state.inserts).toHaveLength(1)
    expect(state.messages).toHaveLength(1)
  })

  it('50% for Growth is the Full Coaching offer, priced from the shared list: uplift × meetings still to come', async () => {
    state.delivered = 4
    const v = await ensureMoment('c-1', P('growth', 8))
    expect(v).toMatchObject({ milestone: 50, pricePerMeeting: 199, upliftPerMeeting: 100, remaining: 4, activationTotal: 400, coachingIncluded: false })
  })

  it('🛑 Enterprise is never offered Coaching — not in the copy, and a "yes" is refused', async () => {
    state.delivered = 4
    const v = await ensureMoment('c-1', P('enterprise', 8))
    expect(v?.coachingIncluded).toBe(true)
    expect(v?.chat).toMatch(/not going to sell it to you again/)
    expect(await respondToMoment('c-1', P('enterprise', 8), 50, 'accepted')).toMatchObject({ ok: false, status: 400 })
  })

  it('🛑 a "yes" at 50% is a REQUEST to our team — a task, never a charge', async () => {
    state.delivered = 4
    await ensureMoment('c-1', P('founders', 8))
    expect(await respondToMoment('c-1', P('founders', 8), 50, 'accepted')).toEqual({ ok: true })
    expect(state.tasks).toHaveLength(1)
    expect(state.tasks[0]).toMatchObject({ kind: 'full_coaching_requested' })
  })

  it('75% re-opens Coaching only after "not now" — never after "no thanks"', () => {
    const base = { milestone: 75 as const, plan: 'growth' as const, delivered: 6, target: 8, remaining: 2, coachingRequested: false }
    expect(momentChat({ ...base, response50: 'not_now' })).toMatch(/still open/)
    expect(momentChat({ ...base, response50: 'declined' })).not.toMatch(/Coaching/)
  })

  it('only the moment on screen can be answered', async () => {
    expect(await respondToMoment('c-1', P(), 50, 'not_now')).toMatchObject({ ok: false, status: 409 })
  })
})
