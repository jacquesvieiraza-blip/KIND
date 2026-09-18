// ══════════════════════════════════════════════════════════════════════════════════════════
// J24-C1 · AN UNREADABLE COUNT SAYS SO — on Milla and on Vida, never 0
//
// ── THE DEFECT, AND WHY IT IS ESPECIALLY WORTH NAMING ───────────────────────────────────
//
// Both ends of this were already built correctly, and the middle threw the answer away.
//
//   · `meetingCounts` returns `null` on an unreadable read, and `meeting-truth.test.ts`
//     already guards it: *"AN UNREADABLE MEETINGS TABLE RETURNS null, NEVER ZERO … 'We could
//     not read the table' and 'there were no meetings' are opposite facts."*
//   · `ProgrammeStat.tsx`'s `ValueCard` renders `null` as an em dash, and says so in its own
//     header: *"`null` IS STILL A DASH … Every figure here distinguishes 'we could not read
//     it' from zero."*
//
// 🛑 AND `millaSummary` SITS BETWEEN THEM DOING `?? 0`:
//
//     meetings_booked: meetings?.booked ?? 0,
//     leads_awaiting:  awaiting.count ?? 0,
//     replies_total:   repliesTotal.count ?? 0,
//
// So the careful `null` is converted back into a number before any surface can see it, and a
// client whose database is unreachable is shown a confident **0 meetings booked** on their own
// dashboard. The count `?? 0` reflex is the same shape as the `.data ?? []` reflex this
// repository keeps rediscovering, pointed at the outcome numbers a client judges us by.
//
// ⚠️ ZERO IS A REAL AND COMMON ANSWER, which is exactly why it must not be the error value.
// A new client legitimately has 0 meetings; the number carries no warning of its own, and it
// is the one a client reads as "this is not working".
//
// ── AND THE SAME THING ON VIDA ──────────────────────────────────────────────────────────
//
// `programme-lifecycle-facts.ts`'s `countRows` returns `error ? 0 : (count ?? 0)` — so the
// operator's panel reports "0 sends" for a programme whose sends could not be counted. That
// number is what an operator uses to decide whether a programme is working.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>

const store = vi.hoisted(() => ({
  /** Tables whose count/read fails. A count, not a row read — they fail differently. */
  broken: new Set<string>(),
  rows: {} as Record<string, Row[]>,
}))

vi.mock('@kind/db', () => {
  const from = (t: string) => {
    const q: Record<string, unknown> = {
      select(_c?: unknown, o?: { count?: string; head?: boolean }) {
        ;(q as { _isCount?: boolean })._isCount = o?.count === 'exact'
        return q
      },
      // ⚠️ EVERY CHAINABLE THE SUMMARY USES, not the four this file happened to need first.
      // A missing one throws mid-chain, which looks like a product defect for a whole run.
      eq() { return q }, neq() { return q }, is() { return q }, in() { return q },
      not() { return q }, gte() { return q }, lte() { return q }, gt() { return q },
      lt() { return q }, like() { return q }, ilike() { return q }, or() { return q },
      contains() { return q }, overlaps() { return q }, filter() { return q },
      range() { return q }, order() { return q }, limit() { return q },
      async maybeSingle() {
        if (store.broken.has(t)) return { data: null, error: { message: `${t} unreadable` } }
        return { data: (store.rows[t] ?? [])[0] ?? null, error: null }
      },
      then(res: (v: unknown) => unknown) {
        if (store.broken.has(t)) return res({ data: null, count: null, error: { message: `${t} unreadable` } })
        const rows = store.rows[t] ?? []
        return res({ data: rows, count: rows.length, error: null })
      },
    }
    return q
  }
  return { db: { from, rpc: async () => ({ data: null, error: null }) } }
})

const CLIENT = 'c1111111-1111-4111-8111-111111111111'

beforeEach(() => {
  store.broken = new Set()
  store.rows = {}
  vi.resetModules()
})

describe('J24-C1 · Milla never shows a fabricated zero', () => {
  async function summary() {
    const { buildMillaSummaryData } = await import('./milla-summary')
    return buildMillaSummaryData(CLIENT)
  }

  it('🛑 an unreadable MEETINGS read is null on the summary, not 0', async () => {
    // `meetingCounts` already answers `null` here. The only question is whether the summary
    // keeps that answer or replaces it with the most misleading number available.
    store.broken.add('meetings')
    const s = await summary()
    expect(
      s.meetings_booked,
      'a client whose meetings could not be counted was shown a confident 0 booked',
    ).toBeNull()
    expect(s.meetings_total, 'the all-time figure fabricated a zero too').toBeNull()
  })

  it('🛑 an unreadable LEADS count is null, not 0', async () => {
    store.broken.add('leads')
    const s = await summary()
    expect(s.leads_awaiting, 'an uncountable desk was reported as an empty one').toBeNull()
    expect(s.leads_approved_total).toBeNull()
  })

  it('🛑 an unreadable REPLIES count is null, not 0', async () => {
    store.broken.add('figsy_replies')
    expect((await summary()).replies_total, 'an uncountable reply history was reported as none').toBeNull()
  })

  it('🛑 a count we correctly did NOT take is 0, not unreadable', async () => {
    // ⚠️ THE DISTINCTION THIS ITEM'S FIRST CUT GOT WRONG. The month's meetings are read only
    // when a client has CURRENT outreach (`outreach ? meetingCounts(…) : Promise.resolve(null)`)
    // — the attribution boundary that stops a proof-scoped client reading a retired desk's
    // meeting as a current result. For them the honest answer is a genuine 0: nothing has been
    // sent under this scope, so nothing has been booked under it. Writing `?? null` everywhere
    // turned "we correctly did not ask" into "we could not read it" and would have shown an em
    // dash where a client should see zero.
    //
    // The meetings table is READABLE here; there is simply no current outreach.
    const s = await summary()
    expect(
      s.meetings_booked,
      'a deliberately-skipped count was reported as unreadable',
    ).toBe(0)
  })

  it('a readable count of genuinely zero is still 0 — the honest answer is unchanged', async () => {
    const s = await summary()
    expect(s.leads_awaiting, 'a real zero became an unreadable').toBe(0)
    expect(s.replies_total).toBe(0)
    expect(s.meetings_booked).toBe(0)
  })

  it('🛑 a DERIVED boolean does not launder an unreadable count into a confident no', async () => {
    // `calibration_set_on_desk` was `(awaiting.count ?? 0) > 0`, so an unreadable desk became
    // "there is nothing on your desk" — a sentence Milla says out loud, from a failed read.
    store.broken.add('leads')
    const s = await summary()
    expect(
      s.calibration_set_on_desk,
      'an unreadable desk was stated to the client as an empty one',
    ).not.toBe(false)
  })

  it('🛑 the paywall does not open or close on an unreadable funding read', async () => {
    // `has_funded: (purchases.count ?? 0) > 0` — an unreadable `credit_transactions` becomes
    // "this client has never paid", which gates a paying client out of their own product.
    store.broken.add('credit_transactions')
    const s = await summary()
    expect(s.has_funded, 'an unreadable funding history was read as "never paid"').not.toBe(false)
  })
})

describe('J24-C1 · and the MODEL is told, in words, that it may not state the number', () => {
  it('🛑 an unreadable count reaches Milla as UNAVAILABLE, never as 0', async () => {
    // `describeOutcomes` IS the prompt. Whatever is in it, Milla states to the client as
    // current fact — so `replies_total: 0` from a failed read became "Replies all-time: 0".
    const { describeOutcomes } = await import('./milla-chat-system')
    const out = describeOutcomes({
      meetings_booked: null, meetings_total: null, replies_total: null,
      calibration_set_on_desk: null,
    })
    expect(out, 'the model was handed a confident zero for a count nobody could read').not.toMatch(/: 0\b/)
    expect(out, 'nothing told the model the figure was unavailable').toMatch(/UNAVAILABLE/)
    expect(out, 'the model was not forbidden from estimating').toMatch(/do NOT state, estimate or imply/i)
  })

  it('🛑 an unreadable DESK is not described to the client as an empty one', async () => {
    const { describeOutcomes } = await import('./milla-chat-system')
    const out = describeOutcomes({
      meetings_booked: 2, meetings_total: 9, replies_total: 31,
      calibration_set_on_desk: null,
    })
    expect(out, 'Milla was told to deny a set is on a screen she cannot see').not.toMatch(/THEIR DESK IS EMPTY RIGHT NOW/)
    expect(out).toMatch(/UNKNOWN/)
  })

  it('real counts still reach the model as numbers — nothing was made vaguer', async () => {
    const { describeOutcomes } = await import('./milla-chat-system')
    const out = describeOutcomes({
      meetings_booked: 0, meetings_total: 0, replies_total: 0,
      calibration_set_on_desk: false,
    })
    expect(out, 'a genuine zero stopped being sayable').toMatch(/Replies all-time: 0/)
    expect(out, 'a genuinely empty desk stopped being sayable').toMatch(/THEIR DESK IS EMPTY RIGHT NOW/)
  })
})

describe('J24-C1 · Vida never shows a fabricated zero either', () => {
  it('🛑 an unreadable count on the operator panel is null, not 0', async () => {
    store.broken.add('figsy_sent_emails')
    const { countRowsOrNull } = await import('./programme-lifecycle-facts')
    const n = await countRowsOrNull('figsy_sent_emails', (q: never) => q)
    expect(n, 'an uncountable send history was reported to the operator as zero sends').toBeNull()
  })

  it('a readable count of zero is still 0', async () => {
    const { countRowsOrNull } = await import('./programme-lifecycle-facts')
    expect(await countRowsOrNull('figsy_sent_emails', (q: never) => q)).toBe(0)
  })
})
