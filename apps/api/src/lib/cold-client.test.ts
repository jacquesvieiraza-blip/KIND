import { describe, it, expect } from 'vitest'
import { coldState, suspensionMessage, COLD_DAYS, WARN_DAYS } from './cold-client'

const NOW = new Date('2026-07-25T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString()

describe('the windows are the founder-locked ones', () => {
  it('30 days to suspend, warned a week out', () => {
    expect(COLD_DAYS).toBe(30)
    expect(WARN_DAYS).toBe(23)
    expect(COLD_DAYS - WARN_DAYS).toBe(7)
  })
})

describe('coldState', () => {
  it('a client who approved today is fine', () => {
    const s = coldState(daysAgo(0), NOW)
    expect(s).toMatchObject({ daysIdle: 0, cold: false, warn: false })
    expect(s.label).toBe('Approved today')
  })

  it('warns exactly a week before suspending', () => {
    expect(coldState(daysAgo(22), NOW).warn).toBe(false)
    const s = coldState(daysAgo(23), NOW)
    expect(s.warn).toBe(true)
    expect(s.cold).toBe(false)
    expect(s.label).toBe('Going quiet — 7 days until we suspend')
  })

  it('suspends exactly at 30 days, not before', () => {
    // Off-by-one here suspends a paying client a day early.
    expect(coldState(daysAgo(29), NOW).cold).toBe(false)
    expect(coldState(daysAgo(30), NOW).cold).toBe(true)
    expect(coldState(daysAgo(90), NOW).cold).toBe(true)
  })

  it('a warned client is not also cold — they are one state, not two', () => {
    const s = coldState(daysAgo(40), NOW)
    expect(s.cold).toBe(true)
    expect(s.warn).toBe(false)
  })

  it('never-approved is NOT cold — that client has not started, which is a different chase', () => {
    // Suspending someone who never got going punishes us for our own onboarding.
    const s = coldState(null, NOW)
    expect(s.cold).toBe(false)
    expect(s.neverStarted).toBe(true)
    expect(s.daysIdle).toBeNull()
  })

  it('an unparseable date never reads as idle — it must not suspend a paying client', () => {
    const s = coldState('not-a-date', NOW)
    expect(s.cold).toBe(false)
    expect(s.neverStarted).toBe(true)
  })

  it('a future timestamp clamps to 0 rather than going negative', () => {
    expect(coldState(daysAgo(-5), NOW).daysIdle).toBe(0)
  })

  it('accepts a Date as well as a string', () => {
    expect(coldState(new Date(daysAgo(31)), NOW).cold).toBe(true)
  })
})

describe('suspensionMessage', () => {
  it('names them, says why, and says how to undo it in the same breath', () => {
    const m = suspensionMessage('Acme Corp')
    expect(m).toContain('Acme Corp')
    expect(m).toContain('30 days')
    expect(m).toContain('Approve anyone')
  })

  it('never leaves a blank where the company should be', () => {
    expect(suspensionMessage(null)).toContain('your account')
    expect(suspensionMessage('   ')).toContain('your account')
  })

  it('does not threaten and does not imply anything was lost', () => {
    const m = suspensionMessage('Acme')
    expect(m).toMatch(/nothing has been lost/i)
    expect(m).not.toMatch(/cancel|terminate|forfeit/i)
  })
})
