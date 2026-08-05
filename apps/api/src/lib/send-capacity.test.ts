// #622 — SEND CAPACITY: THE BOXES AND THE LADDER.
//
// ⚠️ WHAT THE READ-FIRST PASS ACTUALLY FOUND, AND IT CHANGED THE BUILD.
//
// D1 was written as "boxes 3+4 into the engine", which reads like a code change. It is not:
// there is NO two-box limit anywhere in the engine. `sendablePool` returns EVERY box that is
// sendable and credentialled, and `nextFromRotation` spreads across all of them, least-used
// first. The engine has always been able to use four boxes.
//
// Boxes 3 and 4 are excluded by exactly one thing — their `status` is `warming`, and
// SENDABLE_STATUSES is ['assigned','active']. That guard is CORRECT and this build must not
// touch it: sending on a warming mailbox is what un-warms it. So D1 is a STATUS FLIP on the
// mailbox rows when warmup completes, not a code change — a founder/data action, recorded in
// the runbook rather than built here.
//
// A6's ladder is likewise already enforced, and already tops out at exactly 50/day. What was
// missing was that the numbers lived as bare literals, so the ladder the founder rules on and
// the ladder the engine enforces matched by coincidence. Now they are named steps.

import { describe, it, expect } from 'vitest'
import { pickSendingInbox, sendablePool, nextFromRotation } from './sending-inbox'
import { warmupRampCap, WARMUP_LADDER, WARMUP_STEADY_CAP } from './deliverability'

const box = (o: Partial<Record<string, unknown>> = {}) => ({
  id: 'b1', email: 'a@gettingkind.com', kind: 'pooled', status: 'active',
  smtp_host: 'smtp.x', smtp_port: 587, smtp_secure: true,
  smtp_user: 'u', smtp_pass_enc: 'enc', from_name: 'K',
  ...o,
}) as never

describe('the engine draws on EVERY sendable box — there is no two-box limit', () => {
  it('a four-box pool returns all four', () => {
    const r = sendablePool([
      box({ id: 'b1' }), box({ id: 'b2' }), box({ id: 'b3' }), box({ id: 'b4' }),
    ], true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.boxes.map(b => b.id).sort()).toEqual(['b1', 'b2', 'b3', 'b4'])
  })

  it('THE OTHER DIRECTION — a WARMING box is still refused, and that guard must never soften', () => {
    // Sending on a warming mailbox is what un-warms it. This is the guard that protects three
    // weeks of warmup, so it is asserted in both directions rather than assumed.
    const r = sendablePool([box({ id: 'b1' }), box({ id: 'b3', status: 'warming' })], true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.boxes.map(b => b.id)).toEqual(['b1'])
  })

  it('a pool of ONLY warming boxes refuses to send at all', () => {
    const r = sendablePool([box({ id: 'b3', status: 'warming' }), box({ id: 'b4', status: 'warming' })], true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('warming_only')
  })

  it('a box with no SMTP credentials is left out of the pool', () => {
    const r = sendablePool([box({ id: 'b1' }), box({ id: 'b2', smtp_pass_enc: null })], true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.boxes.map(b => b.id)).toEqual(['b1'])
  })

  it('the single picker agrees with the pool about what is sendable', () => {
    // Two copies of "which box may send" is how a batch and a single send start disagreeing.
    expect(pickSendingInbox([box({ status: 'warming' })], true).ok).toBe(false)
    expect(pickSendingInbox([box({ status: 'active' })], true).ok).toBe(true)
  })
})

describe('rotation spreads across all four boxes, least-used first', () => {
  it('picks the least-used box', () => {
    expect(nextFromRotation([
      { id: 'b1', sentThisBatch: 5, dailyCap: 50 },
      { id: 'b2', sentThisBatch: 1, dailyCap: 50 },
      { id: 'b3', sentThisBatch: 3, dailyCap: 50 },
    ])).toBe('b2')
  })

  it('skips a box that has hit its own cap, and stops when every box is full', () => {
    expect(nextFromRotation([
      { id: 'b1', sentThisBatch: 50, dailyCap: 50 },
      { id: 'b2', sentThisBatch: 2, dailyCap: 50 },
    ])).toBe('b2')
    expect(nextFromRotation([
      { id: 'b1', sentThisBatch: 50, dailyCap: 50 },
      { id: 'b2', sentThisBatch: 50, dailyCap: 50 },
    ])).toBe(null)
  })
})

describe('the cap ladder — A6 30 → 50, as named steps', () => {
  const start = '2026-06-09'
  const at = (d: string) => Date.parse(`${d}T12:00:00Z`)

  it('tops out at exactly 50/day — A6’s standing recommendation', () => {
    expect(WARMUP_STEADY_CAP).toBe(50)
    expect(warmupRampCap(start, at('2026-06-17'))).toBe(50)
    expect(warmupRampCap(start, at('2027-01-01'))).toBe(50)
  })

  it('passes through 30 on the way — the ladder’s lower rung', () => {
    expect(WARMUP_LADDER.some(s => s.cap === 30)).toBe(true)
    expect(warmupRampCap(start, at('2026-06-13'))).toBe(30)
  })

  it('every documented step still holds after being named (behaviour unchanged)', () => {
    expect(warmupRampCap(start, at('2026-06-09'))).toBe(10)  // day 1
    expect(warmupRampCap(start, at('2026-06-12'))).toBe(20)  // day 4
    expect(warmupRampCap(start, at('2026-06-15'))).toBe(40)  // day 7
  })

  it('the ladder only ever climbs — a rung that dropped would silently cut send-day volume', () => {
    const caps = WARMUP_LADDER.map(s => s.cap)
    for (let i = 1; i < caps.length; i++) expect(caps[i]).toBeGreaterThan(caps[i - 1])
  })

  it('exactly one open-ended final step — two would make the steady cap ambiguous', () => {
    expect(WARMUP_LADDER.filter(s => s.throughDay === null)).toHaveLength(1)
    expect(WARMUP_LADDER[WARMUP_LADDER.length - 1].throughDay).toBe(null)
  })

  it('an unparseable start date yields NO cap rather than a wrong one', () => {
    expect(warmupRampCap('not-a-date')).toBeNull()
  })
})
