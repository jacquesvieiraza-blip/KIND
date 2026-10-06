// ⚑ 6 Oct (item 1 · founder "lock that as a fix", then GO for all) — THE TOP-UP READS THE REAL
// DAILY LIMIT.
//
// Railway's log, every morning for weeks, for House's live programme:
//   [auto-batch] 9ec26cad no_cap — No send cap is set, so "two days of sending left" cannot be
//   worked out. Set a cap and automatic batches resume.
// The job read ONLY `coldDailyCap()` (FIGSY_COLD_DAILY_CAP, else the FIGSY_WARMUP_START ramp).
// The warm-up ramp was removed on 3 Oct when the real limits went in (R185 ③: 100 a day per
// client), so the job found no limit and never added anyone: House stayed at 234 people.
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@kind/db', () => ({ db: {} }))
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { decideAutoBatch, autoBatchDailyCap, type AutoBatchFacts } from './programme-auto-batch'
import { perClientDailyCap } from './figsy'

const live: AutoBatchFacts = {
  status: 'LIVE', isDemo: false, paused: false, killSwitchOn: false,
  authority: { allowed: true }, nextBatch: 250, dailyCap: null, leftToContact: 120,
  latestBatch: { seq: 1, status: 'served', stillChecking: 0, awaitingSend: 0, surfaced: 234, enrolled: 234 },
}

describe('item 1 — the daily limit the top-up uses', () => {
  const saved = process.env.FIGSY_PER_CLIENT_DAILY_CAP
  afterEach(() => { if (saved === undefined) delete process.env.FIGSY_PER_CLIENT_DAILY_CAP; else process.env.FIGSY_PER_CLIENT_DAILY_CAP = saved })

  it('House today — no old cold cap, 100 a day per client: the top-up is DUE, never "no_cap"', () => {
    const d = decideAutoBatch({ ...live, dailyCap: autoBatchDailyCap(null, 100) })
    expect(d.state).toBe('due')
    expect(d.action).toBe('source')
  })

  it('two days of sending at 100 a day is 200: at 200 left it waits, at 199 it tops up', () => {
    expect(decideAutoBatch({ ...live, dailyCap: autoBatchDailyCap(null, 100), leftToContact: 200 }).state).toBe('enough_left')
    expect(decideAutoBatch({ ...live, dailyCap: autoBatchDailyCap(null, 100), leftToContact: 199 }).state).toBe('due')
  })

  it('a lower global cold cap, when one IS set, still wins — it is what the sender would stop at', () => {
    expect(autoBatchDailyCap(30, 100)).toBe(30)
    expect(autoBatchDailyCap(300, 100)).toBe(100)
  })

  it('no limit anywhere is still "no_cap" — the job never guesses a number', () => {
    expect(autoBatchDailyCap(null, null)).toBeNull()
    expect(decideAutoBatch({ ...live, dailyCap: autoBatchDailyCap(null, null) }).state).toBe('no_cap')
  })

  it('the per-client limit is the SAME number the sender enforces: the env value, else 50; 0 or junk is "none"', () => {
    process.env.FIGSY_PER_CLIENT_DAILY_CAP = '100'
    expect(perClientDailyCap()).toBe(100)
    delete process.env.FIGSY_PER_CLIENT_DAILY_CAP
    expect(perClientDailyCap()).toBe(50)
    process.env.FIGSY_PER_CLIENT_DAILY_CAP = '0'
    expect(perClientDailyCap()).toBeNull()
    process.env.FIGSY_PER_CLIENT_DAILY_CAP = 'abc'
    expect(perClientDailyCap()).toBeNull()
  })

  it('the job reads both limits, and the sender reads the same per-client function', () => {
    const lib = readFileSync(join(__dirname, 'programme-auto-batch.ts'), 'utf8')
    expect(lib).toContain('dailyCap: autoBatchDailyCap(coldDailyCap(), perClientDailyCap()),')
    expect(lib).not.toMatch(/dailyCap: coldDailyCap\(\),/)
    const figsy = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
    const send = figsy.slice(figsy.indexOf('export async function perClientCapReached'))
    expect(send.slice(0, 400)).toContain('const cap = perClientDailyCap()')
  })
})
