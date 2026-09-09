// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CONTINUATION, EXERCISED — because a source-order assertion is not a behaviour proof.
//
// ⛓️ THIS FILE EXISTS BECAUSE A MUTATION CAME BACK GREEN. `programme-advance.test.ts` proves
// the already-advanced short circuit sits ABOVE the preparation call, and that is a true and
// useful fact about the source. It is not the fact that matters. Disabling the branch —
// `if (false && AT_OR_PAST_REVIEW.includes(...))` — leaves the text exactly where it was and
// every one of those 38 cases still passed, while a reviewable programme's frozen set would
// have been prepared into on the next press.
//
// 🛑 A CHECKER NEVER RUN AGAINST A BAD STATE PROVES NOTHING. So these cases CALL the function,
// against a database and a preparation module that both refuse to be touched when they should
// not be. The refusal is the assertion: `prepareProgrammeOutreach` throws if it is reached at
// all on a frozen programme, so "it was not called" cannot be mistaken for "it was called and
// did nothing".
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

const HOUSE = '8a8d0fd7-bf6b-4d87-9188-9b3f17864bca'
const CLIENT = '6bd2046b-5da7-4d48-a249-b9412b7dd554'

/** The single programme row every case in this file reads. Rewritten per test. */
const state: { row: Record<string, unknown> | null } = { row: null }

/** Every write this run attempted, so "nothing was changed" is checked rather than asserted. */
const writes: { table: string; op: string; payload: unknown }[] = []

vi.mock('@kind/db', () => {
  const make = (table: string) => {
    const self: Record<string, unknown> = {}
    for (const op of ['eq', 'gt', 'gte', 'lt', 'lte', 'is', 'not', 'in', 'neq', 'order', 'limit', 'select']) {
      self[op] = () => self
    }
    self.update = (payload: unknown) => { writes.push({ table, op: 'update', payload }); return self }
    self.insert = (payload: unknown) => { writes.push({ table, op: 'insert', payload }); return self }
    self.delete = () => { writes.push({ table, op: 'delete', payload: null }); return self }
    self.maybeSingle = async () => ({
      data: table === 'programmes' ? state.row : null, error: null,
    })
    self.single = async () => ({ data: table === 'programmes' ? state.row : null, error: null })
    // A bare await on the builder — used by count/head reads — resolves to an empty result.
    self.then = (res: (v: unknown) => unknown) => res({ data: [], error: null, count: 0 })
    return self
  }
  return { db: { from: (t: string) => make(t), rpc: async () => ({ data: null, error: null }) } }
})

// 🛑 THE TRIPWIRES. Neither of these may run on a programme that is already reviewable, and
// neither may run at all on one lacking authority. Throwing is what makes the absence provable.
const prepareSpy = vi.fn(async () => { throw new Error('prepareProgrammeOutreach was called') })
const markSpy = vi.fn(async () => { throw new Error('markReadyForApproval was called') })

vi.mock('./programme-preparation', async (orig) => {
  const actual = await orig<typeof import('./programme-preparation')>()
  return { ...actual, prepareProgrammeOutreach: (...a: unknown[]) => prepareSpy(...(a as [])) }
})
vi.mock('./programme', async (orig) => {
  const actual = await orig<typeof import('./programme')>()
  return { ...actual, markReadyForApproval: (...a: unknown[]) => markSpy(...(a as [])) }
})

import { advanceProgrammeToReview } from './programme-advance'

const settled = (over: Record<string, unknown> = {}) => ({
  id: HOUSE, client_id: CLIENT, status: 'SOURCING',
  paused_at: null, approved_at: null,
  first_paid_at: null, first_authorised_at: '2026-09-01T00:00:00.000Z',
  second_paid_at: null, second_payment_ref: null, second_authorised_at: null,
  ...over,
})

beforeEach(() => {
  writes.length = 0
  prepareSpy.mockClear()
  markSpy.mockClear()
})

describe('a programme already at the review boundary is left completely alone', () => {
  // ⚑ THE CASE THE GREEN MUTATION EXPOSED. Once reviewable, material preparation is FROZEN
  // (8 Sep lock). Preparation ADDS enrolments, so running it here changes the very set the
  // client is reading and the freeze stops describing what is on screen.
  for (const status of ['READY_FOR_APPROVAL', 'APPROVED', 'LIVE']) {
    it(`${status}: preparation is never reached, and nothing is written`, async () => {
      state.row = settled({ status })
      const r = await advanceProgrammeToReview(HOUSE)

      expect(r.ok, `advancing an already-${status} programme should succeed as a no-op`).toBe(true)
      expect(prepareSpy, `preparation ran on a frozen ${status} review set`).not.toHaveBeenCalled()
      expect(markSpy, `the transition was re-run on an already-${status} programme`).not.toHaveBeenCalled()
      expect(writes, `advancing an already-${status} programme wrote to the database`).toEqual([])
      if (r.ok) {
        expect(r.report.status_before).toBe(status)
        expect(r.report.reviewable).toBe(true)
        expect(r.report.enrolled).toBe(0)
        expect(r.report.headline).toContain('already')
      }
    })
  }
})

describe('authority is proved before any work is attempted', () => {
  it('a paused programme prepares nothing', async () => {
    state.row = settled({ paused_at: '2026-09-05T00:00:00.000Z' })
    const r = await advanceProgrammeToReview(HOUSE)
    expect(r.ok).toBe(false)
    expect(prepareSpy).not.toHaveBeenCalled()
    expect(writes).toEqual([])
    if (!r.ok) expect(r.reason).toContain('paused')
  })

  it('a terminal programme prepares nothing', async () => {
    state.row = settled({ status: 'CANCELLED' })
    const r = await advanceProgrammeToReview(HOUSE)
    expect(r.ok).toBe(false)
    expect(prepareSpy).not.toHaveBeenCalled()
    expect(writes).toEqual([])
  })

  it('a programme with no P1 authority prepares nothing', async () => {
    state.row = settled({ first_authorised_at: null, first_paid_at: null })
    const r = await advanceProgrammeToReview(HOUSE)
    expect(r.ok).toBe(false)
    expect(prepareSpy, 'preparation ran without first-payment authority').not.toHaveBeenCalled()
    if (!r.ok) expect(r.reason).toContain('first-payment authority')
  })

  it('a status with no pre-approval authority prepares nothing', async () => {
    state.row = settled({ status: 'AWAITING_FIRST_PAYMENT' })
    const r = await advanceProgrammeToReview(HOUSE)
    expect(r.ok).toBe(false)
    expect(prepareSpy).not.toHaveBeenCalled()
  })

  /**
   * A preparation that ran and did not finish. Used by the cases that WANT preparation
   * reached — the tripwire's throw is for the cases where it must not be.
   */
  const ranButIncomplete = () => prepareSpy.mockImplementationOnce(async () => ({
    ok: false, complete: false, remaining: 1, total: 1,
    campaigns: [], enrolled: [], alreadyEnrolled: 0, skipped: 0, failed: [],
    problems: ['not finished'],
  }) as never)

  it('P2 is NOT required — a settled programme without it still reaches preparation', async () => {
    // 🛑 THE DEADLOCK MUST NOT REAPPEAR ONE GATE LATER. P1 is what buys preparation; demanding
    // P2 here would leave the House programme exactly as stuck as it was.
    state.row = settled({ second_authorised_at: null, second_paid_at: null, second_payment_ref: null })
    ranButIncomplete()
    await advanceProgrammeToReview(HOUSE)
    expect(prepareSpy, 'preparation was not reached on a P1-only programme — P2 is being required').toHaveBeenCalledTimes(1)
  })

  it('both pre-approval statuses reach preparation', async () => {
    for (const status of ['SOURCING', 'SOURCING_AUTHORISED']) {
      prepareSpy.mockClear()
      state.row = settled({ status })
      ranButIncomplete()
      await advanceProgrammeToReview(HOUSE)
      expect(prepareSpy, `${status} did not reach preparation`).toHaveBeenCalledTimes(1)
    }
  })
})

describe('the id is the only way in', () => {
  it('a non-uuid reads nothing and prepares nothing', async () => {
    state.row = settled()
    for (const bad of ['', '   ', 'house', CLIENT.slice(0, 8), null, undefined, 42]) {
      prepareSpy.mockClear()
      const r = await advanceProgrammeToReview(bad)
      expect(r.ok, `${String(bad)} was accepted as a programme id`).toBe(false)
      expect(prepareSpy).not.toHaveBeenCalled()
      expect(writes).toEqual([])
    }
  })

  it('a missing programme is refused rather than invented', async () => {
    state.row = null
    const r = await advanceProgrammeToReview(HOUSE)
    expect(r.ok).toBe(false)
    expect(prepareSpy).not.toHaveBeenCalled()
    if (!r.ok) expect(r.reason).toContain('no programme with that id')
  })
})

describe('incomplete preparation never reaches the transition', () => {
  it('stops and reports the problems, leaving the status alone', async () => {
    state.row = settled()
    prepareSpy.mockImplementationOnce(async () => ({
      ok: false, complete: false, remaining: 12, total: 246,
      campaigns: ['c1'], enrolled: [], alreadyEnrolled: 0, skipped: 0, failed: [],
      problems: ['No sending mailbox is assigned and ready for this client.'],
    }) as never)

    const r = await advanceProgrammeToReview(HOUSE)
    expect(r.ok).toBe(false)
    expect(markSpy, 'the transition ran on incomplete preparation').not.toHaveBeenCalled()
    if (!r.ok) {
      expect(r.reason).toContain('No sending mailbox')
      expect(r.report?.remaining).toBe(12)
    }
  })
})
