// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (Coaching #2501 Meeting Debrief · Phase 1 · #2518 Enterprise Coaching Review #1 · R180)
//
// 🛑 What this holds: a debrief is only for a meeting the client said HAPPENED; it is the
// client's own typed words, bounded, append-only in `outcome_events`; and the review is counted
// ONLY from those answers — "too early" below two answered meetings, never a percentage (R136),
// never a figure the client did not give (R87).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const state = vi.hoisted(() => ({
  inserts: [] as Array<Record<string, unknown>>, insertError: null as null | { message: string },
  rows: [] as Array<Record<string, unknown>>, readError: null as null | { message: string },
}))

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, in() { return q }, is() { return q }, order() { return q }, limit() { return q },
        insert(row: Record<string, unknown>) { state.inserts.push(row); return Promise.resolve({ error: state.insertError }) },
        then(r: (v: unknown) => unknown) { return Promise.resolve(r({ data: state.readError ? null : state.rows, error: state.readError })) },
      }
      return q
    },
  },
}))

import {
  cleanDebrief, canDebrief, recordDebrief, latestDebriefs, computeCoachingReview, objectionGroups,
  DEBRIEF_QUESTIONS, DEBRIEF_ANSWER_MAX, MIN_REVIEW_MEETINGS, type DebriefAnswers,
} from './meeting-debrief'

const NOW = Date.parse('2026-10-01T12:00:00Z')
const M = { id: 'm-1', state: 'HELD', programmeId: 'p-1' }
const rec = (answer: unknown, body: unknown, meeting = M) =>
  recordDebrief({ clientId: 'c-1', meeting, answer: answer as never, body, by: 'hannah@northwind.test', now: NOW })
const D = (objections: string, rest: Partial<DebriefAnswers> = {}): DebriefAnswers =>
  ({ who: '', cared: '', agreed: '', differently: '', ...rest, objections })

beforeEach(() => { state.inserts = []; state.insertError = null; state.rows = []; state.readError = null })

describe('#2501 — the five questions', () => {
  it('are the five the card names, in plain words — and the portal shows the same words', () => {
    expect(Object.values(DEBRIEF_QUESTIONS)).toEqual([
      'Who was in the room?', 'What did they care about most?', 'What objections came up?',
      'What was agreed next?', 'What would you do differently next time?',
    ])
    const portal = readFileSync(join(__dirname, '../../../portal/src/components/milla/MeetingDebrief.tsx'), 'utf8')
    for (const q of Object.values(DEBRIEF_QUESTIONS)) expect(portal).toContain(`'${q}'`)
  })

  it('answers are trimmed and bounded; nothing answered is null', () => {
    expect(cleanDebrief({})).toBeNull()
    expect(cleanDebrief({ who: '   ', cared: 42 })).toBeNull()
    expect(cleanDebrief(null)).toBeNull()
    const d = cleanDebrief({ who: '  Callum and their CFO ', objections: 'x'.repeat(DEBRIEF_ANSWER_MAX + 50), sneaky: 'dropped' })!
    expect(d.who).toBe('Callum and their CFO')
    expect(d.objections).toHaveLength(DEBRIEF_ANSWER_MAX)
    expect(Object.keys(d).sort()).toEqual(['agreed', 'cared', 'differently', 'objections', 'who'])
  })

  it('only a meeting the client said happened can be debriefed', () => {
    expect(canDebrief('next_step')).toBe(true)
    expect(canDebrief('not_now')).toBe(true)
    expect(canDebrief('not_fit')).toBe(true)
    expect(canDebrief('no_show')).toBe(false)
    expect(canDebrief(undefined)).toBe(false)
  })
})

describe('#2501 — saving a debrief', () => {
  it('kept append-only in outcome_events as `meeting_debrief`, with the meeting and programme', async () => {
    const r = await rec('next_step', { objections: 'Worried about the price', agreed: 'Proposal by Friday' })
    expect(r).toMatchObject({ ok: true, debrief: { objections: 'Worried about the price', agreed: 'Proposal by Friday', who: '', at: '2026-10-01T12:00:00.000Z' } })
    expect(state.inserts).toHaveLength(1)
    expect(state.inserts[0]).toMatchObject({
      client_id: 'c-1', event_type: 'meeting_debrief', channel: 'milla',
      payload: { meeting_id: 'm-1', programme_id: 'p-1', objections: 'Worried about the price', by: 'hannah@northwind.test' },
    })
  })

  it('🛑 refused before "How did it go?", after "they didn\'t show", and on a recorded no-show — nothing written', async () => {
    expect(await rec(null, { who: 'x' })).toMatchObject({ ok: false, status: 409 })
    expect(await rec('no_show', { who: 'x' })).toMatchObject({ ok: false, status: 409 })
    expect(await rec('next_step', { who: 'x' }, { ...M, state: 'NO_SHOW' })).toMatchObject({ ok: false, status: 409 })
    expect(state.inserts).toHaveLength(0)
  })

  it('an empty debrief is refused; a failed write says nothing changed', async () => {
    expect(await rec('next_step', { who: '  ' })).toMatchObject({ ok: false, status: 400, error: 'Answer at least one question.' })
    state.insertError = { message: 'boom' }
    expect(await rec('next_step', { who: 'Callum' })).toMatchObject({ ok: false, status: 503 })
  })

  it('the latest debrief per meeting wins; an unreadable log is null, never "none"', async () => {
    state.rows = [
      { payload: { meeting_id: 'm-1', who: 'Callum and the CFO' }, occurred_at: '2026-10-01T10:00:00Z' },
      { payload: { meeting_id: 'm-1', who: 'Callum' }, occurred_at: '2026-09-30T10:00:00Z' },
      { payload: { meeting_id: 'm-2', who: '' }, occurred_at: '2026-09-30T10:00:00Z' },
    ]
    const m = (await latestDebriefs('c-1', ['m-1', 'm-2']))!
    expect(m.get('m-1')?.who).toBe('Callum and the CFO')
    expect(m.has('m-2')).toBe(false)
    state.readError = { message: 'down' }
    expect(await latestDebriefs('c-1', ['m-1'])).toBeNull()
  })
})

describe('#2518 — Coaching Review #1', () => {
  it(`🛑 below ${MIN_REVIEW_MEETINGS} answered meetings Milla says plainly it is too early — no counts claimed`, () => {
    const none = computeCoachingReview({ answers: [], debriefs: [] })
    expect(none.ready).toBe(false)
    expect(none.lines).toEqual([
      "It's too early for your first Coaching Review: you haven't told me how any of your meetings went yet. Once you've told me about 2, on the Meetings screen, I'll put it together here from your own answers.",
    ])
    // A "didn't show" is not a meeting that happened, so it does not count towards the review.
    const one = computeCoachingReview({ answers: ['next_step', 'no_show'], debriefs: [D('price')] })
    expect(one.ready).toBe(false)
    expect(one.lines[0]).toContain("you've told me how 1 meeting went")
    expect(one.recurring).toEqual([])
  })

  it('counts the answers, the debriefs and the objection that keeps coming up', () => {
    const v = computeCoachingReview({
      answers: ['next_step', 'next_step', 'not_now', 'not_fit', 'no_show'],
      debriefs: [
        D('They said the price is high for this year'),
        D('Budget is tight, and they already use spreadsheets'),
        D('Need the board to sign off — cost again'),
      ],
    })
    expect(v).toMatchObject({ ready: true, answered: 4, outcomes: { nextStep: 2, notNow: 1, notFit: 1 }, debriefs: 3 })
    expect(v.recurring).toEqual([{ label: 'Price or budget', count: 3 }])
    expect(v.lines).toEqual([
      "You've told me how 4 meetings went: 2 agreed a next step, 1 is interested, but not now, 1 wasn't a fit.",
      "You've written 3 debriefs.",
      'Price or budget came up in all 3 of your debriefs.',
    ])
  })

  it('no debriefs yet, one debrief, and nothing recurring each say so plainly', () => {
    expect(computeCoachingReview({ answers: ['next_step', 'not_now'], debriefs: [] }).lines[1])
      // ⛓️ 1 Oct (placement) — WAS ~~"Add one under a meeting on the Meetings screen"~~: the debrief
      // and this review both live on the Coaching screen now.
      .toBe("You haven't written a debrief yet. Add one under a meeting in After your meetings, below, and I'll show you which objections keep coming up.")
    expect(computeCoachingReview({ answers: ['next_step', 'not_now'], debriefs: [D('price')] }).lines[2])
      .toBe("Once you've written a second debrief, I'll show you any objection that keeps coming up.")
    expect(computeCoachingReview({ answers: ['next_step', 'not_now'], debriefs: [D('price'), D('timing is wrong')] }).lines[2])
      .toBe('No objection has come up in more than one debrief yet.')
    expect(computeCoachingReview({ answers: ['not_fit', 'not_fit'], debriefs: [D('price'), D('cost')] }).lines)
      .toContain('Price or budget came up in both of your debriefs.')
  })

  it('🛑 R136 · R87 — never a percentage, a rate or a money figure, whatever the client typed', () => {
    const v = computeCoachingReview({
      answers: ['next_step', 'not_now', 'not_fit'],
      debriefs: [D('Price — they want 20% off $5,000'), D('Price again, budget is $3k'), D('Timing')],
    })
    const all = v.lines.join(' ')
    expect(all).not.toMatch(/%|\$|£|€|percent|rate\b|per cent/i)
  })

  it('objection groups are plain keywords; an unmatched objection is left out, never forced', () => {
    expect(objectionGroups('Too expensive and we already have a system')).toEqual(['Price or budget', 'Already have something'])
    expect(objectionGroups('They need sign-off from procurement')).toEqual(['Needs someone else to sign off'])
    expect(objectionGroups('Worried about migrating the data')).toEqual(['Effort to switch'])
    expect(objectionGroups('He wanted to see a case study')).toEqual(['Trust or proof'])
    expect(objectionGroups('Not now, maybe next year')).toEqual(['Timing'])
    expect(objectionGroups('He seemed distracted')).toEqual([])
    expect(objectionGroups('')).toEqual([])
  })
})
