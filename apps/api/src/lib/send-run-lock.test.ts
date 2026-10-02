// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (#2141 · POST-006) — 🛑 TWO SEND RUNS NEVER OVERLAP.
//
// A run reads "sent today" once and spends the remainder. Two runs at once would both read the
// same remainder and both spend it — the day's limit sent twice. These run the real
// `runSendDue` with the first run held open on its first database read, and prove the second
// steps aside, the first still completes, and the lock is released afterwards — even when a
// run throws.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = {
  /** When set, the "sent today" read waits on this before it answers. */
  gate: null as Promise<void> | null,
  countReads: 0,
  throwOnCount: false,
  alerts: 0,
}

vi.mock('@kind/db', () => ({
  db: {
    rpc: async () => ({ data: null, error: null }),
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select(_c?: unknown, opts?: { head?: boolean }) { (q as { _head?: boolean })._head = opts?.head === true; return q },
        eq() { return q }, in() { return q }, is() { return q }, not() { return q },
        gte() { return q }, lte() { return q }, order() { return q }, limit() { return q },
        insert() { return q }, update() { return q },
        async maybeSingle() { return { data: null, error: null } },
        async single() { return { data: null, error: null } },
        then(r: (v: unknown) => unknown, rej?: (e: unknown) => unknown) {
          if (table === 'figsy_sent_emails' && (q as { _head?: boolean })._head) {
            state.countReads++
            if (state.throwOnCount) return Promise.reject(new Error('boom')).then(r, rej)
            const answer = { data: null, count: 0, error: null }
            return (state.gate ?? Promise.resolve()).then(() => r(answer))
          }
          // No active campaigns: a run that gets past the budget ends cleanly, sending nothing.
          return Promise.resolve(r({ data: [], count: 0, error: null }))
        },
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => { state.alerts++; return { delivered: true } } }))

const run = async () => (await import('./send-due')).runSendDue({ mode: 'automatic' })

beforeEach(() => { state.gate = null; state.countReads = 0; state.throwOnCount = false; state.alerts = 0 })

describe('#2141 — one send run at a time', () => {
  it('🛑 a run that starts while another is going steps aside: reads nothing, sends nothing, raises no alert', async () => {
    let release!: () => void
    state.gate = new Promise<void>(res => { release = res })
    const first = run()
    await new Promise(r => setTimeout(r, 0))
    const second = await run()
    expect(second.halted?.reason).toBe('run_in_progress')
    expect(second.attempted).toBe(0)
    expect(second.sent).toBe(0)
    expect(state.countReads, 'the second run read the budget').toBe(1)
    expect(state.alerts).toBe(0)
    release()
    const done = await first
    expect(done.halted).toBeUndefined()
  })

  it('once the first run finishes, the next run goes ahead', async () => {
    await run()
    const next = await run()
    expect(next.halted).toBeUndefined()
    expect(state.countReads).toBe(2)
  })

  it('🛑 a run that throws still releases the lock — a crash never stops sending for good', async () => {
    state.throwOnCount = true
    await expect(run()).rejects.toThrow('boom')
    state.throwOnCount = false
    const next = await run()
    expect(next.halted).toBeUndefined()
  })
})
