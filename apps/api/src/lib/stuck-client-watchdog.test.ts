// ═══════════════════════════════════════════════════════════════════════════════════════
// 28 Sep — THE STUCK-CLIENT WATCHDOG. Founder: "if a client is stuck we need to be notified."
// Found on the end-to-end walk: a Proof sat on "on their way" and nobody was told.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({
  work: [] as Row[], sizes: [] as Row[], programmes: [] as Row[],
  open: new Set<string>(), raised: [] as Row[], emailed: [] as string[], taskFails: false, emailDown: false,
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const q: any = {}
      for (const m of ['select', 'in', 'gte', 'order', 'limit', 'not', 'is', 'eq']) q[m] = () => q
      q.then = (res: (v: unknown) => unknown) => Promise.resolve({
        data: t === 'automatic_work' ? state.work
          : t === 'programmes' ? state.programmes
          : t === 'clients' ? (state.sizes.length ? state.sizes.map(s => ({ ...s, company_name: 'AAA Cleaners' })) : [{ id: 'c1', company_name: 'AAA Cleaners' }])
          : [],
        error: null,
      }).then(res)
      return q
    },
  },
}))
vi.mock('./operator-tasks', () => ({
  raiseOperatorTask: async (input: Row) => {
    if (state.taskFails) return { ok: false, error: 'no table' }
    state.raised.push(input)
    const k = String(input.dedupeKey)
    if (state.open.has(k)) return { ok: true, alreadyOpen: true }
    state.open.add(k)
    return { ok: true, taskId: `t-${state.open.size}` }
  },
}))
vi.mock('./alerts', () => ({
  // ⛓️ 28 Sep (R172 · C6) — the stand-in reports the EMAIL leg too; "told" now means an email left.
  sendFounderAlert: async (_k: string, subject: string) => { state.emailed.push(subject); return state.emailDown ? { delivered: true, emailOk: false } : { delivered: true, emailOk: true } },
}))

import { findStuckClients, runStuckClientWatchdog, STUCK_AFTER_MINUTES } from './stuck-client-watchdog'

const NOW = Date.parse('2026-09-28T10:00:00Z')
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString()
const work = (over: Row): Row => ({
  id: 'w1', kind: 'proof_run', client_id: 'c1', state: 'started', requested_at: ago(40), started_at: ago(40),
  failed_at: null, stuck_at: null, failure_reason: null, ...over,
})

beforeEach(() => {
  state.work = []; state.sizes = []; state.programmes = []
  state.open = new Set(); state.raised = []; state.emailed = []; state.taskFails = false; state.emailDown = false
})

describe('who is stuck', () => {
  it('a FAILED Proof is stuck at once — nothing is running for them', () => {
    const f = findStuckClients({ work: [work({ state: 'failed', failed_at: ago(1), failure_reason: 'Apollo reveals held' }) as never], sizes: [], programmes: [], nowMs: NOW })
    expect(f).toEqual([expect.objectContaining({ problem: 'proof', clientId: 'c1', reason: 'Apollo reveals held' })])
  })

  it('a Proof still running is stuck only past 30 minutes', () => {
    expect(findStuckClients({ work: [work({ started_at: ago(29), requested_at: ago(29) }) as never], sizes: [], programmes: [], nowMs: NOW })).toEqual([])
    expect(findStuckClients({ work: [work({ started_at: ago(31), requested_at: ago(31) }) as never], sizes: [], programmes: [], nowMs: NOW })).toHaveLength(1)
    expect(STUCK_AFTER_MINUTES.proof).toBe(30)
  })

  it('a completed Proof is not stuck', () => {
    expect(findStuckClients({ work: [work({ state: 'completed' }) as never], sizes: [], programmes: [], nowMs: NOW })).toEqual([])
  })

  it('paid, and the automatic start failed or went silent past an hour', () => {
    const f = findStuckClients({ work: [work({ id: 'w2', kind: 'p1_continuation', state: 'stuck', stuck_at: ago(5), started_at: ago(70) }) as never], sizes: [], programmes: [], nowMs: NOW })
    expect(f).toEqual([expect.objectContaining({ problem: 'paid_not_started' })])
  })

  it('a price waiting on a company-size check for over an hour', () => {
    const sizes = [{ id: 'c2', size_review_reason: 'stated_smaller', size_locked_at: null, size_checked_at: ago(61) }]
    expect(findStuckClients({ work: [], sizes: sizes as never, programmes: [], nowMs: NOW })).toEqual([expect.objectContaining({ problem: 'price_waiting', clientId: 'c2' })])
    expect(findStuckClients({ work: [], sizes: [{ ...sizes[0], size_checked_at: ago(30) }] as never, programmes: [], nowMs: NOW })).toEqual([])
  })

  it('a review hold older than a day, unresolved — and not one that was resolved after it', () => {
    const p = { id: 'p1', client_id: 'c3', status: 'SOURCING_AUTHORISED', review_required_at: ago(25 * 60), review_resolved_at: null }
    expect(findStuckClients({ work: [], sizes: [], programmes: [p] as never, nowMs: NOW })).toHaveLength(1)
    expect(findStuckClients({ work: [], sizes: [], programmes: [{ ...p, review_resolved_at: ago(60) }] as never, nowMs: NOW })).toEqual([])
    expect(findStuckClients({ work: [], sizes: [], programmes: [{ ...p, status: 'COMPLETED' }] as never, nowMs: NOW })).toEqual([])
  })
})

describe('🛑 the founder is told — once', () => {
  it('a stuck client → one task and ONE email, naming the client and the reason', async () => {
    state.work = [work({ state: 'failed', failed_at: ago(2), failure_reason: 'Apollo reveals held — the credit balance could not be read' })]
    const r = await runStuckClientWatchdog({ nowMs: NOW })
    expect(r).toMatchObject({ ok: true, found: 1, told: 1 })
    expect(state.emailed).toEqual(['A client is stuck — AAA Cleaners: Proof has not reached them'])
    expect(state.raised[0]).toMatchObject({ kind: 'support_escalation', severity: 'critical', clientId: 'c1', dedupeKey: 'stuck:proof:c1:w1' })
  })

  it('🛑 the next sweeps do NOT email again while the task is open', async () => {
    state.work = [work({ state: 'failed', failed_at: ago(2) })]
    await runStuckClientWatchdog({ nowMs: NOW })
    await runStuckClientWatchdog({ nowMs: NOW + 10 * 60_000 })
    const third = await runStuckClientWatchdog({ nowMs: NOW + 20 * 60_000 })
    expect(state.emailed).toHaveLength(1)
    expect(third).toMatchObject({ told: 0, alreadyOpen: 1 })
  })

  it('an older failure followed by a newer good run is history, not a stuck client', async () => {
    state.work = [work({ id: 'w-new', state: 'completed', requested_at: ago(5) }), work({ id: 'w-old', state: 'failed', failed_at: ago(50), requested_at: ago(60) })]
    expect(await runStuckClientWatchdog({ nowMs: NOW })).toMatchObject({ found: 0, told: 0 })
  })

  it('⚑ C6 · an email that did not go is NOT counted as telling the founder', async () => {
    state.emailDown = true
    state.work = [work({ state: 'failed', failed_at: ago(2) })]
    expect(await runStuckClientWatchdog({ nowMs: NOW })).toMatchObject({ told: 0, unmailed: 1 })
  })

  it('if the task cannot be written, it does not email every 10 minutes', async () => {
    state.taskFails = true
    state.work = [work({ state: 'failed', failed_at: ago(2) })]
    await runStuckClientWatchdog({ nowMs: NOW })
    expect(state.emailed).toEqual([])
  })
})

describe('it runs', () => {
  it('every 10 minutes, cron-claimed', () => {
    const cron = readFileSync(join(__dirname, '..', 'cron.ts'), 'utf8')
    expect(cron).toContain("cron.schedule('*/10 * * * *', () => { void watchStuckClients() }, { timezone: 'UTC' })")
    expect(cron).toContain("claimCronSlot('watchdog:stuck-clients', new Date())")
  })
})
