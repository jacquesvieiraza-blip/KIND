// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R166 ⑥ · P3a, board #2349) — THE NO-MEETING REVIEW FIRES AGAIN EVERY 250 PEOPLE.
//
// It used to fire once per programme: after a person resolved it, a programme could source to
// its full limit with no meeting and nothing looked again. The founder: "the barriers need to
// be there."
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({
  programme: {} as Row,
  baseline: { review_baseline_used: null, review_baseline_booked: null } as Row,
  baselineError: false,
  booked: 0 as number | null,
  updates: [] as Row[],
  alerts: [] as string[],
}))

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      let selected = ''
      let pendingUpdate: Row | null = null
      const q: any = {
        select: (c: string) => { selected = c; return q },
        update: (row: Row) => { pendingUpdate = row; return q },
        eq: () => q, is: () => q, not: () => q,
        maybeSingle: async () => {
          if (selected.includes('review_baseline_used')) {
            return state.baselineError ? { data: null, error: { message: 'column does not exist' } } : { data: state.baseline, error: null }
          }
          return { data: state.programme, error: null }
        },
        then: (r: (v: unknown) => unknown) => {
          if (pendingUpdate) { state.updates.push(pendingUpdate); return Promise.resolve({ data: [{ id: 'p1' }], error: null }).then(r) }
          return Promise.resolve({ data: null, error: null }).then(r)
        },
      }
      return q
    },
  },
}))
vi.mock('./meeting-truth', () => ({ meetingCounts: async () => (state.booked === null ? null : { booked: state.booked }) }))
vi.mock('./alerts', () => ({ sendFounderAlert: async (_k: string, subject: string) => { state.alerts.push(subject); return {} } }))

import { repeatReviewDecision, raiseReviewIfNeeded, resolveProgrammeReview, REVIEW_TRIGGER_LEADS } from './programme-authority'

const resolvedProgramme = (sourced: number): Row => ({
  id: 'p1', client_id: 'c1', status: 'LIVE', sourced_used: sourced,
  review_required_at: '2026-09-20T00:00:00Z', review_resolved_at: '2026-09-21T00:00:00Z',
})

beforeEach(() => {
  state.programme = {}; state.baseline = { review_baseline_used: null, review_baseline_booked: null }
  state.baselineError = false; state.booked = 0; state.updates = []; state.alerts = []
})

describe('the rule, pure', () => {
  it('250 more people with no new meeting → review again', () => {
    expect(REVIEW_TRIGGER_LEADS).toBe(250)
    expect(repeatReviewDecision({ sourcedUsed: 750, bookedNow: 0, baselineUsed: 500, baselineBooked: 0 })).toBe('raise')
    expect(repeatReviewDecision({ sourcedUsed: 749, bookedNow: 0, baselineUsed: 500, baselineBooked: 0 })).toBe('wait')
  })

  it('a new meeting moves the baseline — the count restarts', () => {
    expect(repeatReviewDecision({ sourcedUsed: 900, bookedNow: 1, baselineUsed: 500, baselineBooked: 0 })).toBe('move_baseline')
  })

  it('a review resolved before this change (no baseline) counts from zero', () => {
    expect(repeatReviewDecision({ sourcedUsed: 300, bookedNow: 0, baselineUsed: null, baselineBooked: null })).toBe('raise')
  })
})

describe('🛑 through the real raise', () => {
  it('a resolved review is raised AGAIN after 250 more people with no meeting', async () => {
    state.programme = resolvedProgramme(760)
    state.baseline = { review_baseline_used: 500, review_baseline_booked: 0 }
    expect(await raiseReviewIfNeeded('p1')).toBe(true)
    expect(state.updates[0]).toMatchObject({ review_resolved_at: null })
    expect(String(state.updates[0].review_required_at)).toMatch(/^20/)
    expect(state.alerts).toContain('A programme needs another review')
  })

  it('…but not before the 250', async () => {
    state.programme = resolvedProgramme(700)
    state.baseline = { review_baseline_used: 500, review_baseline_booked: 0 }
    expect(await raiseReviewIfNeeded('p1')).toBe(false)
    expect(state.updates).toEqual([])
  })

  it('a new meeting moves the baseline instead of raising', async () => {
    state.programme = resolvedProgramme(900)
    state.baseline = { review_baseline_used: 500, review_baseline_booked: 0 }
    state.booked = 2
    expect(await raiseReviewIfNeeded('p1')).toBe(false)
    expect(state.updates[0]).toEqual({ review_baseline_used: 900, review_baseline_booked: 2 })
  })

  it('🛑 an unreadable baseline raises the hold — a person looks', async () => {
    state.programme = resolvedProgramme(260)
    state.baselineError = true
    expect(await raiseReviewIfNeeded('p1')).toBe(true)
  })

  it('unreadable meetings never raise it (a hiccup is not "no meetings")', async () => {
    state.programme = resolvedProgramme(5000)
    state.booked = null
    expect(await raiseReviewIfNeeded('p1')).toBe(false)
  })
})

describe('resolving a review leaves the baseline the next one counts from', () => {
  it('sourced so far and meetings so far are written with the resolution', async () => {
    state.programme = { id: 'p1', client_id: 'c1', status: 'LIVE', sourced_used: 510, review_required_at: '2026-09-20T00:00:00Z', review_resolved_at: null }
    state.booked = 0
    const r = await resolveProgrammeReview('p1', 'founder@kind')
    expect(r.ok).toBe(true)
    expect(state.updates[0]).toMatchObject({ review_baseline_used: 510, review_baseline_booked: 0 })
  })
})
