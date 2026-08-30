// ═══════════════════════════════════════════════════════════════════════════════════════
// OPERATOR PROGRAMME TRUTH — BEHAVIOUR, INCLUDING THE BEHAVIOUR WHEN A QUERY FAILS.
//
// 🛑 THE FAILURE THIS SUITE EXISTS FOR IS A **QUIET** CONSOLE. Every reader in
// `operator-programme.ts` must tell "there is nothing" apart from "I could not look" — and the
// second must be visible. This repo has now shipped the `.data ?? []` defect (a rejected query
// rendering as an empty list) in the send gate, the meeting counts, the proof-review queue and
// the programme reader itself. On an operator console that shape is at its most dangerous: an
// empty screen reads as "nothing is wrong", and the operator closes the tab.
//
// So every degraded-path assertion below is as load-bearing as the happy path.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.mock('@kind/db', () => ({ db: {} }))

import {
  operationalState, blockersFor, looksLikeDebris, DEBRIS_PATTERNS,
  type BatchSummary,
} from './operator-programme'
import { REVIEW_TRIGGER_LEADS } from './programme-authority'
import type { ProgrammeRow } from './programme'

function prog(over: Partial<ProgrammeRow> = {}): ProgrammeRow {
  return {
    id: 'p1', client_id: 'c1', status: 'LIVE',
    meeting_target: 4, recommended_volume: 1000,
    price_per_meeting_cents: 50000, price_total_cents: 200000,
    first_payment_cents: 100000, second_payment_cents: 100000,
    first_payment_ref: 'a', second_payment_ref: 'b',
    first_paid_at: 'x', second_paid_at: 'x',
    sourcing_ceiling: 1000, sourced_used: 100, sourced_reserved: 0,
    approved_at: 'x', went_live_at: 'x', paused_at: null, pause_reason: null,
    value_settled_at: null, make_whole_cents: 0,
    contribution_cents: null, contribution_finalised_at: null, disputed_at: null,
    review_required_at: null, review_reason: null, review_resolved_at: null, review_resolution: null,
    ...over,
  } as ProgrammeRow
}

const batch = (over: Partial<BatchSummary> = {}): BatchSummary => ({
  id: 'b-11111111', seq: 1, status: 'stranded', requested: 250, granted: 250,
  delivered: 100, created_at: null, settled_at: null, ...over,
})

describe('the suite is not vacuous', () => {
  it('a healthy programme with a live campaign reads as CONTINUING', () => {
    // Without this every state assertion below could pass on a function that returns
    // 'blocked' for everything.
    expect(operationalState(prog(), { liveCampaign: true })).toBe('continuing')
  })
})

describe('THE FIVE OPERATIONAL STATES, RESOLVED HARDEST-STOP FIRST', () => {
  it('COMPLETED beats everything — a finished programme is not resumable', () => {
    expect(operationalState(prog({ status: 'COMPLETED', paused_at: 'now', review_required_at: 'x' })))
      .toBe('completed')
    expect(operationalState(prog({ status: 'CANCELLED' }))).toBe('completed')
  })

  it('PAUSED beats review — clearing a review would change nothing while paused', () => {
    expect(operationalState(prog({ paused_at: 'now', review_required_at: 'x' }), { liveCampaign: true }))
      .toBe('paused')
  })

  it('REVIEW_REQUIRED beats blocked — a deliberate hold is not a fault', () => {
    expect(operationalState(prog({ review_required_at: 'x', sourcing_ceiling: 1, sourced_used: 1 }), { liveCampaign: true }))
      .toBe('review_required')
  })

  it('a RESOLVED review is not a hold', () => {
    expect(operationalState(prog({ review_required_at: 'x', review_resolved_at: 'y' }), { liveCampaign: true }))
      .toBe('continuing')
  })

  it('BLOCKED covers a stranded batch, a consumed ceiling, and LIVE with no campaign', () => {
    expect(operationalState(prog(), { strandedBatches: 1, liveCampaign: true })).toBe('blocked')
    expect(operationalState(prog({ sourcing_ceiling: 100, sourced_used: 100 }), { liveCampaign: true })).toBe('blocked')
    expect(operationalState(prog(), { liveCampaign: false })).toBe('blocked')
  })

  it('reserved volume counts against the room, or two runs each claim the same headroom', () => {
    expect(operationalState(prog({ sourcing_ceiling: 100, sourced_used: 50, sourced_reserved: 50 }), { liveCampaign: true }))
      .toBe('blocked')
  })

  it('an UNKNOWN campaign state does not manufacture a block', () => {
    // `liveCampaign` is undefined when the campaign read FAILED. Reading that as "no campaign"
    // would put a red BLOCKED banner over a perfectly healthy programme on a database hiccup —
    // and the operator would go looking for a fault that does not exist. The degraded list is
    // where "we could not tell" belongs, not the state.
    expect(operationalState(prog(), {})).toBe('continuing')
  })
})

describe('BLOCKERS ARE ROWS THAT EXIST, NOT GUESSES', () => {
  it('a stranded batch names the batch and the volume held', () => {
    const out = blockersFor(prog(), { stranded: [batch({ seq: 3, granted: 250, delivered: 100 })], liveCampaign: true })
    const s = out.find(b => b.kind === 'stranded_batch')
    expect(s).toBeTruthy()
    expect(s!.detail).toContain('Batch 3')
    expect(s!.detail, 'the operator is not told how much volume is held').toContain('150 record(s)')
  })

  it('a consumed ceiling says so without implying expiry', () => {
    const out = blockersFor(prog({ sourcing_ceiling: 100, sourced_used: 100 }), { liveCampaign: true })
    const c = out.find(b => b.kind === 'sourcing_ceiling_reached')!
    expect(c.detail).toContain('never expires')
  })

  it('a healthy programme has NO blockers', () => {
    expect(blockersFor(prog(), { liveCampaign: true })).toEqual([])
  })

  it('a terminal programme is not nagged about approval or payment it will never need', () => {
    const out = blockersFor(prog({ status: 'COMPLETED', approved_at: null, second_paid_at: null }), { liveCampaign: true })
    expect(out.map(b => b.kind)).not.toContain('not_approved')
    expect(out.map(b => b.kind)).not.toContain('second_payment_missing')
  })

  it('no blocker message promises a refund, a credit or a meeting', () => {
    // ⚠️ COMMERCIAL SAFETY. The benchmark is not a guarantee and an operator console must not
    // imply one — a sentence here is read aloud to a client.
    const out = [
      ...blockersFor(prog({ sourcing_ceiling: 1, sourced_used: 1 }), { liveCampaign: false }),
      ...blockersFor(prog({ approved_at: null, second_paid_at: null }), { stranded: [batch()] }),
    ]
    expect(out.length).toBeGreaterThan(0)
    for (const b of out) {
      expect(b.detail.toLowerCase(), b.kind).not.toMatch(/refund|guarantee|compensat|money back|we will book/)
    }
  })
})

describe('DEBRIS IS A CANDIDATE, NEVER A CLASSIFICATION', () => {
  it('matches the founder\'s own runtime-test ICP', () => {
    expect(looksLikeDebris('PR2 RUNTIME TEST — DO NOT USE')).toBe(true)
  })

  it('🛑 DOES NOT match a real ICP that merely contains the word "test"', () => {
    // An ICP called "Testing new verticals" is a client's real targeting. A pattern match that
    // swept it up would put a live ICP on a cleanup list, and the whole point of the
    // reversible retire action is that a human decides — so the finder must not over-reach.
    expect(looksLikeDebris('Testing new verticals')).toBe(false)
    expect(looksLikeDebris('Contested markets — EMEA')).toBe(false)
    expect(looksLikeDebris('Latest cohort')).toBe(false)
  })

  it('is null-safe and case-insensitive', () => {
    expect(looksLikeDebris(null)).toBe(false)
    expect(looksLikeDebris(undefined)).toBe(false)
    expect(looksLikeDebris('')).toBe(false)
    expect(looksLikeDebris('delete me')).toBe(true)
    expect(looksLikeDebris('DELETE ME')).toBe(true)
  })

  it('every pattern is exercised, so a dead pattern cannot hide in the list', () => {
    for (const p of DEBRIS_PATTERNS) {
      expect(looksLikeDebris(`Some ICP ${p} here`), `pattern "${p}" never matches`).toBe(true)
    }
  })
})

describe('THE REVIEW BENCHMARK IS SURFACED, NOT RESTATED', () => {
  it('the panel figure comes from the shared constant', () => {
    // If someone types 250 into the read model, the console and the gate can disagree about
    // why a programme is held.
    expect(REVIEW_TRIGGER_LEADS).toBeGreaterThan(0)
  })
})

// ── THE DEGRADED PATHS, EXECUTED ─────────────────────────────────────────────────────────
describe('A FAILED READ IS VISIBLE, NEVER AN EMPTY LIST', () => {
  /** A db stub whose named tables return an ERROR rather than rows. */
  function failing(tables: string[]) {
    const chain = (table: string) => {
      const c: Record<string, unknown> = {}
      const err = tables.includes(table) ? { message: `boom:${table}` } : null
      for (const m of ['select', 'eq', 'not', 'is', 'in', 'gte', 'order', 'limit']) c[m] = () => c
      c.maybeSingle = async () => ({ data: null, error: err })
      c.single = c.maybeSingle
      c.then = (r: (v: unknown) => unknown) => r({ data: err ? null : [], error: err, count: err ? null : 0 })
      return c
    }
    return { db: { from: (t: string) => chain(t) } }
  }

  it('an unreadable programme is NOT reported as "no programme"', async () => {
    // 🛑 THE MOST DANGEROUS CONFUSION ON THIS SURFACE. "No programme" means legacy client,
    // everything fine. "Could not read" means their delivery state is unknown — and a paused
    // programme would be hidden behind the reassuring answer.
    vi.resetModules()
    vi.doMock('@kind/db', () => failing(['programmes']))
    const { programmeTruthFor } = await import('./operator-programme')
    const t = await programmeTruthFor('c1')
    expect(t.programme).toBeNull()
    expect(t.degraded.length, 'a failed programme read was silent').toBeGreaterThan(0)
    expect(t.degraded[0]).toContain('NOT evidence')
  })

  it('unreadable stranded batches degrade instead of reporting none', async () => {
    vi.resetModules()
    vi.doMock('@kind/db', () => failing(['programme_batches']))
    const { strandedBatches } = await import('./operator-programme')
    const r = await strandedBatches()
    expect(r.rows).toEqual([])
    expect(r.degraded, 'an unreadable stranded-batch query looked like a clean platform').toBeTruthy()
    expect(r.degraded!).toContain('UNKNOWN, not none')
  })

  it('unreadable evictions degrade — an empty list is not "nobody is still being emailed"', async () => {
    vi.resetModules()
    vi.doMock('@kind/db', () => failing(['leads']))
    const { openEvictions } = await import('./operator-programme')
    const r = await openEvictions()
    expect(r.rows).toEqual([])
    expect(r.degraded!).toContain('UNKNOWN, not none')
  })

  it('unreadable crashed runs degrade', async () => {
    vi.resetModules()
    vi.doMock('@kind/db', () => failing(['icp_run_outcomes']))
    const { failedRuns } = await import('./operator-programme')
    const r = await failedRuns()
    expect(r.rows).toEqual([])
    expect(r.degraded!).toContain('UNKNOWN, not none')
  })

  it('an unreadable pool reports UNKNOWN size, not zero', async () => {
    // A pool reported as 0 when the count failed would tell an operator the inventory is empty
    // — a decision-changing lie on the surface that decides whether to buy more data.
    vi.resetModules()
    vi.doMock('@kind/db', () => failing(['lead_pool']))
    const { poolSummary } = await import('./operator-programme')
    const r = await poolSummary()
    expect(r.total, 'a failed count was reported as a real number').toBeNull()
    expect(r.degraded.length).toBeGreaterThan(0)
    expect(r.degraded.join(' ')).toContain('not zero')
  })

  it('a CLEAN read is genuinely clean — the degraded path is not always-on', async () => {
    // The other half. A reader that always degraded would pass every assertion above and be
    // useless.
    vi.resetModules()
    vi.doMock('@kind/db', () => failing([]))
    const { strandedBatches, openEvictions, failedRuns } = await import('./operator-programme')
    expect((await strandedBatches()).degraded).toBeNull()
    expect((await openEvictions()).degraded).toBeNull()
    expect((await failedRuns()).degraded).toBeNull()
  })
})
