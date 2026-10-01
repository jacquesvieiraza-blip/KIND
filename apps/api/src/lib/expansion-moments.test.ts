// ⚑ 1 Oct (R180 · Coaching F2 · #2484) — the 25/50/75% moments: trigger, once-only, memory, and
// "Enterprise is never offered Coaching".
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  delivered: 3, events: [] as Array<{ payload: Record<string, unknown>; occurred_at: string }>,
  inserts: [] as Array<Record<string, unknown>>, messages: [] as Array<Record<string, unknown>>,
  tasks: [] as Array<Record<string, unknown>>, demo: false,
  checkouts: [] as Array<Record<string, unknown>>, checkout: { ok: true, url: 'https://stripe.test/coaching' } as Record<string, unknown>,
  active: false,
  reviews: [] as Array<[string, string]>, review: { ready: false, lines: ['too early'] } as Record<string, unknown> | null, reviewThrows: false,
  programmes: [] as Array<Record<string, unknown>>,
}))
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, order() { return q }, limit() { return q }, is() { return q },
        insert(row: Record<string, unknown>) {
          if (t === 'outcome_events') { state.inserts.push(row); state.events.unshift({ payload: row.payload as Record<string, unknown>, occurred_at: String(row.occurred_at) }) }
          if (t === 'milla_messages') state.messages.push(row)
          return Promise.resolve({ error: null })
        },
        then(r: (v: unknown) => unknown) {
          return Promise.resolve(r(t === 'milla_sessions' ? { data: [{ id: 's-1' }], error: null }
            : t === 'programmes' ? { data: state.programmes, error: null } : { data: state.events, error: null }))
        },
      }
      return q
    },
  },
}))
vi.mock('./meeting-truth', () => ({ programmeDelivery: async () => ({ delivered: state.delivered, unqualified: 0, openChallenges: 0, upheld: 0 }) }))
vi.mock('./operator-tasks', () => ({ raiseOperatorTask: async (t: Record<string, unknown>) => { state.tasks.push(t); return { ok: true } } }))
vi.mock('./demo', () => ({ isDemoClient: async () => state.demo }))
// ⚑ 1 Oct (F3) — the one payment is `coaching-billing.ts`'s job (tested in coaching-billing.test.ts);
// here it is a spy, so "a yes opens the checkout" is a call count.
vi.mock('./coaching-billing', () => ({
  createCoachingCheckout: async (clientId: string, p: Record<string, unknown>, successUrl: string, cancelUrl: string) => {
    state.checkouts.push({ clientId, programmeId: p.id, successUrl, cancelUrl }); return state.checkout
  },
}))
vi.mock('./coaching-access', () => ({ coachingActivated: async () => state.active }))
// ⚑ 1 Oct (#2518) — Coaching Review #1 is `meeting-debrief.ts`'s job (tested in meeting-debrief.test.ts);
// here it is a spy, so "Enterprise at 25% only" is a call count.
vi.mock('./meeting-debrief', () => ({
  readCoachingReview: async (clientId: string, programmeId: string) => {
    state.reviews.push([clientId, programmeId]); if (state.reviewThrows) throw new Error('down'); return state.review
  },
}))

import { milestoneFor, momentChat, ensureMoment, respondToMoment, handoffFrom, handoffFor, readMemory, coachingReviewFor } from './expansion-moments'

const P = (band = 'growth', target = 8) => ({ id: 'p-1', meeting_target: target, size_band: band })
beforeEach(() => {
  state.delivered = 3; state.events = []; state.inserts = []; state.messages = []; state.tasks = []; state.demo = false
  state.checkouts = []; state.checkout = { ok: true, url: 'https://stripe.test/coaching' }; state.active = false
  state.reviews = []; state.review = { ready: false, lines: ['too early'] }; state.reviewThrows = false
  state.programmes = []
})

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

  // ⛓️ 1 Oct (F3 · #2485) — WAS '🛑 a "yes" at 50% is a REQUEST to our team — a task, never a charge'.
  // Coaching billing now exists (R180 Q2: one payment at activation), so a yes opens that payment.
  it('🛑 a "yes" at 50% opens the one Full Coaching payment — no task, and the answer is remembered', async () => {
    state.delivered = 4
    await ensureMoment('c-1', P('founders', 8))
    const r = await respondToMoment('c-1', P('founders', 8), 50, 'accepted', { successUrl: 'https://app/ok', cancelUrl: 'https://app/back' })
    expect(r).toEqual({ ok: true, url: 'https://stripe.test/coaching' })
    expect(state.checkouts).toEqual([{ clientId: 'c-1', programmeId: 'p-1', successUrl: 'https://app/ok', cancelUrl: 'https://app/back' }])
    expect(state.tasks).toHaveLength(0)
    expect(state.inserts.at(-1)?.payload).toMatchObject({ milestone: 50, response: 'accepted' })
  })

  it('a refused checkout (a demo, say) changes nothing: the refusal is returned and no answer is written', async () => {
    state.delivered = 4
    await ensureMoment('c-1', P('founders', 8))
    const before = state.inserts.length
    state.checkout = { ok: false, status: 409, error: 'This is a demo account, so nothing is ever charged.' }
    expect(await respondToMoment('c-1', P('founders', 8), 50, 'accepted')).toEqual(state.checkout)
    expect(state.inserts).toHaveLength(before)
  })

  it('once Full Coaching is on, the 50% moment says so — not "you asked"', async () => {
    state.delivered = 4; state.active = true
    const v = await ensureMoment('c-1', P('growth', 8))
    expect(v).toMatchObject({ coachingActive: true, coachingRequested: false })
    expect(momentChat({ ...v!, coachingActive: true })).toMatch(/Full Coaching is on/)
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

describe('#2518 — Enterprise Coaching Review #1 at 25%', () => {
  it('🛑 Enterprise at 25% carries the review for THIS programme; no other plan or milestone reads it', async () => {
    const v = await ensureMoment('c-1', P('enterprise', 8))
    expect(v?.milestone).toBe(25)
    expect(v?.review).toEqual({ ready: false, lines: ['too early'] })
    expect(state.reviews).toEqual([['c-1', 'p-1']])

    state.reviews = []
    expect((await ensureMoment('c-1', P('growth', 8)))?.review).toBeUndefined()
    state.active = true
    expect((await ensureMoment('c-1', P('founders', 8)))?.review).toBeUndefined()
    state.delivered = 4
    expect((await ensureMoment('c-1', P('enterprise', 8)))?.review).toBeUndefined()
    expect(state.reviews).toEqual([])
  })

  it('a review that cannot be read drops the review, never the moment', async () => {
    state.reviewThrows = true
    const v = await ensureMoment('c-1', P('enterprise', 8))
    expect(v?.milestone).toBe(25)
    expect(v?.review).toBeNull()
    state.reviewThrows = false; state.review = null
    expect((await ensureMoment('c-1', P('enterprise', 8)))?.review).toBeNull()
  })

  // ⚑ 1 Oct (placement) — the Coaching screen reads the review itself; the 25% panel only points there.
  it('🛑 the Coaching screen read: Enterprise at 25%, 50% and 75% — fires no moment, writes nothing', async () => {
    for (const delivered of [2, 4, 6]) {
      state.delivered = delivered
      expect(await coachingReviewFor('c-1', P('enterprise', 8))).toEqual({ ready: false, lines: ['too early'] })
    }
    expect(state.reviews).toHaveLength(3)
    expect(state.inserts).toEqual([])
    expect(state.messages).toEqual([])
  })

  it('no review below 25%, for any other plan, or when the read fails', async () => {
    state.delivered = 1
    expect(await coachingReviewFor('c-1', P('enterprise', 8))).toBeNull()
    state.delivered = 4
    expect(await coachingReviewFor('c-1', P('growth', 8))).toBeNull()
    expect(await coachingReviewFor('c-1', P('founders', 8))).toBeNull()
    expect(state.reviews).toEqual([])
    state.reviewThrows = true
    expect(await coachingReviewFor('c-1', P('enterprise', 8))).toBeNull()
  })
})

// ⚑ 1 Oct (R180 · #2520 · #2522 · #2523) — finishing the partial moments.
describe('#2520 50% Enterprise — expansion, remembered by the move chosen', () => {
  it('the next programme is offered up to the per-programme maximum, from @kind/shared', async () => {
    state.delivered = 4
    const v = await ensureMoment('c-1', P('enterprise', 8))
    expect(v).toMatchObject({ milestone: 50, coachingIncluded: true, maxMeetings: 50 })
  })

  it('"engaged" remembers WHICH move: the next programme, or a different segment', async () => {
    state.delivered = 4
    await ensureMoment('c-1', P('enterprise', 8))
    expect(await respondToMoment('c-1', P('enterprise', 8), 50, 'engaged', undefined, 'segment')).toEqual({ ok: true })
    expect(state.inserts.at(-1)?.payload).toMatchObject({ milestone: 50, response: 'engaged', choice: 'segment' })
    const mem = await readMemory('p-1')
    expect(mem?.choices.get(50)?.has('segment')).toBe(true)
  })

  it('🛑 a move rides only on "engaged", only at 50% or 75%, and only a known one', async () => {
    state.delivered = 4
    await ensureMoment('c-1', P('enterprise', 8))
    const before = state.inserts.length
    expect(await respondToMoment('c-1', P('enterprise', 8), 50, 'not_now', undefined, 'segment')).toMatchObject({ ok: false, status: 400 })
    expect(await respondToMoment('c-1', P('enterprise', 8), 50, 'engaged', undefined, 'another_team')).toMatchObject({ ok: false, status: 400 })
    state.delivered = 2
    expect(await respondToMoment('c-1', P('founders', 8), 25, 'engaged', undefined, 'next_programme')).toMatchObject({ ok: false, status: 400 })
    expect(state.inserts.slice(before).filter(r => (r.payload as Record<string, unknown>).choice)).toHaveLength(0)
  })
})

describe('#2522 75% — continuation first, the Coaching state said plainly', () => {
  const base = { milestone: 75 as const, delivered: 6, target: 8, remaining: 2, coachingRequested: false, response50: null }
  it('Full Coaching on → it stays on to the end of THIS programme (nothing promised about the next one)', () => {
    const line = momentChat({ ...base, plan: 'growth', coachingActive: true })
    expect(line).toMatch(/plan your next programme/)
    expect(line).toMatch(/Full Coaching stays on to the end of this programme\./)
    expect(line).not.toMatch(/next programme.*Full Coaching.*next/)
  })
  it('🛑 Enterprise at 75% hears no Coaching line; "no thanks" at 50% is never re-opened', () => {
    expect(momentChat({ ...base, plan: 'enterprise', coachingActive: true })).not.toMatch(/Coaching/)
    expect(momentChat({ ...base, plan: 'founders', response50: 'declined' })).not.toMatch(/Coaching/)
  })
  it('"Plan my next programme" at 75% is remembered with its move — the hand-off reads it', async () => {
    state.delivered = 6
    await ensureMoment('c-1', P('growth', 8))
    expect(await respondToMoment('c-1', P('growth', 8), 75, 'engaged', undefined, 'next_programme')).toEqual({ ok: true })
    expect(state.inserts.at(-1)?.payload).toMatchObject({ milestone: 75, response: 'engaged', choice: 'next_programme' })
  })
})

describe('#2523 Complete — the hand-off inherits the 75% decision', () => {
  const mem = (rows: Array<[number, string, string?]>) => {
    const responses = new Map(); const choices = new Map()
    for (const [m, r, c] of rows) {
      if (!responses.has(m)) responses.set(m, r)
      if (c) choices.set(m, (choices.get(m) ?? new Set()).add(c))
    }
    return { responses, choices } as Parameters<typeof handoffFrom>[1]
  }
  it('75% "plan my next programme" → planning; a later "not yet" → not yet (latest wins)', () => {
    expect(handoffFrom('growth', mem([[75, 'engaged', 'next_programme']]), false).nextProgramme).toBe('planning')
    expect(handoffFrom('growth', mem([[75, 'not_now'], [75, 'engaged', 'next_programme']]), false).nextProgramme).toBe('not_yet')
    expect(handoffFrom('growth', mem([[75, 'shown']]), false).nextProgramme).toBeNull()
  })
  it('a different segment asked at 50% is carried; 🛑 Enterprise is never "Coaching was on"', () => {
    const h = handoffFrom('enterprise', mem([[50, 'engaged', 'segment']]), true)
    expect(h).toMatchObject({ segment: true, coachingWasOn: false })
  })
  it('reads the FINISHED programme only — an open or cancelled latest programme hands off nothing', async () => {
    state.events = [{ payload: { programme_id: 'p-1', milestone: 75, response: 'engaged', choice: 'next_programme' }, occurred_at: '2026-10-01T10:00:00Z' }]
    state.programmes = [{ id: 'p-1', size_band: 'growth', status: 'ACTIVE' }]
    expect(await handoffFor('c-1')).toBeNull()
    state.programmes = [{ id: 'p-1', size_band: 'growth', status: 'CANCELLED' }]
    expect(await handoffFor('c-1')).toBeNull()
    state.programmes = [{ id: 'p-1', size_band: 'growth', status: 'COMPLETED' }]; state.active = true
    expect(await handoffFor('c-1')).toEqual({ plan: 'growth', nextProgramme: 'planning', segment: false, coachingWasOn: true })
  })
  it('nothing decided and no Coaching → no hand-off (Complete stays as it was)', async () => {
    state.events = [{ payload: { programme_id: 'p-1', milestone: 50, response: 'declined' }, occurred_at: '2026-10-01T10:00:00Z' }]
    state.programmes = [{ id: 'p-1', size_band: 'founders', status: 'COMPLETED' }]
    expect(await handoffFor('c-1')).toBeNull()
  })
})
