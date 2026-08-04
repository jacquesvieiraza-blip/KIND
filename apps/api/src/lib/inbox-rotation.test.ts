// #610 — ROTATION ACROSS A CLIENT'S MAILBOXES.
//
// Founder-ruled 4 Aug: "inbox x 2 yes for now but volume is key." One box at a 30/day cap is
// 30/day however many boxes exist; two is 60. These tests pin the distribution, the caps, and
// the two things that would make rotation LOOK implemented while doing nothing:
//
//   • the tally never incrementing (every count stays 0 → same box forever)
//   • a failed send consuming quota (a broken mailbox would eat the batch)
//
// Both are behaviours, not values, so they are tested as behaviour.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { nextFromRotation, sendablePool, pickSendingInbox, type InboxRow } from './sending-inbox'
import { stripCommentsForEnvScan } from './env-inventory'

const box = (over: Partial<InboxRow> & { id: string }): InboxRow => ({
  email: `${over.id}@kindoutreach.com`,
  kind: 'branded',
  status: 'active',
  provider: 'google-smtp',
  daily_cap: 30,
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: `${over.id}@kindoutreach.com`,
  smtp_pass_enc: 'cipher',
  from_name: 'Jacques',
  ...over,
} as InboxRow)

describe('nextFromRotation — least-used first', () => {
  it('spreads instead of draining one box', () => {
    const boxes = [
      { id: 'a', dailyCap: 30, sentThisBatch: 0 },
      { id: 'b', dailyCap: 30, sentThisBatch: 0 },
    ]
    // Simulate a batch: pick, tally, repeat. This is exactly what figsy.ts does.
    const order: string[] = []
    for (let i = 0; i < 6; i++) {
      const id = nextFromRotation(boxes)!
      order.push(id)
      boxes.find(b => b.id === id)!.sentThisBatch += 1
    }
    expect(order).toEqual(['a', 'b', 'a', 'b', 'a', 'b'])
  })

  it('a box at its cap drops out and the other carries the rest', () => {
    const boxes = [
      { id: 'a', dailyCap: 2, sentThisBatch: 2 },   // full
      { id: 'b', dailyCap: 30, sentThisBatch: 5 },
    ]
    expect(nextFromRotation(boxes)).toBe('b')
  })

  it('every box at cap returns null — the caller must STOP, not overflow', () => {
    // The alternative (falling back to the "best" box) would send past a cap the operator set,
    // on the exact mailbox reputation the cap exists to protect.
    expect(nextFromRotation([
      { id: 'a', dailyCap: 2, sentThisBatch: 2 },
      { id: 'b', dailyCap: 1, sentThisBatch: 1 },
    ])).toBeNull()
  })

  it('a null cap means uncapped, not zero', () => {
    expect(nextFromRotation([{ id: 'a', dailyCap: null, sentThisBatch: 999 }])).toBe('a')
  })

  it('ties break stably on id, so a bug is reproducible', () => {
    const a = nextFromRotation([
      { id: 'zzz', dailyCap: 30, sentThisBatch: 0 },
      { id: 'aaa', dailyCap: 30, sentThisBatch: 0 },
    ])
    const b = nextFromRotation([
      { id: 'aaa', dailyCap: 30, sentThisBatch: 0 },
      { id: 'zzz', dailyCap: 30, sentThisBatch: 0 },
    ])
    expect(a).toBe('aaa')
    expect(b).toBe('aaa')
  })
})

describe('sendablePool — the same refusals as the single picker, never a second vocabulary', () => {
  it('returns both boxes when both can send', () => {
    const r = sendablePool([box({ id: 'a' }), box({ id: 'b', kind: 'pooled' })], true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.boxes).toHaveLength(2)
  })

  it('EXCLUDES a warming box — warming is sacred', () => {
    // Sending on a warming mailbox is what un-warms it. Rotation must never widen the set of
    // boxes that may send; it only spreads across boxes that already may.
    const r = sendablePool([box({ id: 'a' }), box({ id: 'w', status: 'warming' })], true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.boxes.map(b => b.id)).toEqual(['a'])
  })

  it('refuses with warming_only when the only box is warming', () => {
    const r = sendablePool([box({ id: 'w', status: 'warming' })], true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('warming_only')
  })

  it('refuses with no_inbox when there are none', () => {
    const r = sendablePool([], true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no_inbox')
  })

  it('refuses with no_secret_key when the key is unset', () => {
    const r = sendablePool([box({ id: 'a' })], false)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no_secret_key')
  })

  it('excludes a credential-less box but still sends from the good one', () => {
    const r = sendablePool([box({ id: 'a' }), box({ id: 'x', smtp_pass_enc: null })], true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.boxes.map(b => b.id)).toEqual(['a'])
  })

  it('ranks branded-active first — the pool agrees with the single picker', () => {
    const rows = [box({ id: 'pool', kind: 'pooled' }), box({ id: 'brand', kind: 'branded' })]
    const single = pickSendingInbox(rows, true)
    const pool = sendablePool(rows, true)
    expect(single.ok && pool.ok).toBe(true)
    if (single.ok && pool.ok) expect(pool.boxes[0].id).toBe(single.inbox.id)
  })

  it('a single-box client is unchanged — one box in, one box out', () => {
    const r = sendablePool([box({ id: 'only' })], true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.boxes.map(b => b.id)).toEqual(['only'])
  })
})

describe('the send loop wires rotation — the two silent no-ops', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, 'figsy.ts'), 'utf8'))

  it('picks per lead from the rotation', () => {
    expect(src).toContain('nextFromRotation(rotation)')
  })

  it('STOPS when every box is capped rather than falling back', () => {
    expect(src).toMatch(/if \(!pickedId\)[\s\S]{0,200}break/)
  })

  it('INCREMENTS the tally — without this every count stays 0 and rotation is a no-op', () => {
    // The failure mode this catches: rotation code present, tally missing, same box forever,
    // nothing red, volume unchanged.
    expect(src).toContain('slot.sentThisBatch += 1')
  })

  it('and increments only AFTER a confirmed send, so a failure does not eat quota', () => {
    // The `!day1Checked.ok` branch must `continue` BEFORE the tally line.
    const failBranch = src.indexOf('if (!day1Checked.ok)')
    const tally = src.indexOf('slot.sentThisBatch += 1')
    expect(failBranch).toBeGreaterThan(-1)
    expect(tally).toBeGreaterThan(failBranch)
  })
})
