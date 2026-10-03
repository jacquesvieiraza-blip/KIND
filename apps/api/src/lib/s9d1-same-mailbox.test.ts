// 9d·1 (#2559 · R189 ②) — EACH PERSON GETS EVERY EMAIL FROM THE SAME MAILBOX.
//
// R189 ②: "each person always gets every email from the same mailbox". Rotation picked the
// least-used box for every message, so step 2 could come from a different sender than step 1.

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))

import { pickForPerson } from './sending-inbox'

const box = (id: string, sent: number, cap: number | null = 50) => ({ id, dailyCap: cap, sentThisBatch: sent })

describe('9d·1 — which mailbox carries the next email', () => {
  it('never emailed → the least-used mailbox', () => {
    expect(pickForPerson([box('a', 10), box('b', 3)], null, new Set())).toEqual({ id: 'b' })
  })
  it('emailed before → the same mailbox, even when another is less used', () => {
    expect(pickForPerson([box('a', 40), box('b', 3)], 'a', new Set())).toEqual({ id: 'a' })
  })
  it('that mailbox is at its daily limit → the email waits; it never leaves from another box', () => {
    expect(pickForPerson([box('a', 50), box('b', 3)], 'a', new Set())).toEqual({ hold: 'first_mailbox_at_cap' })
  })
  it('that mailbox failed this run → wait for the next run', () => {
    expect(pickForPerson([box('b', 3)], 'a', new Set(['a']))).toEqual({ hold: 'first_mailbox_failed' })
  })
  it('that mailbox is no longer the client\'s → the least-used one, so the person can still be reached', () => {
    expect(pickForPerson([box('b', 3), box('c', 1)], 'gone', new Set())).toEqual({ id: 'c' })
  })
  it('every box at its limit → nothing', () => {
    expect(pickForPerson([box('b', 50)], null, new Set())).toBeNull()
  })
})

describe('9d·1 — the send run uses it', () => {
  it('reads the first mailbox per person and holds follow-ups when that read fails', () => {
    const src = readFileSync(join(__dirname, 'send-due.ts'), 'utf8')
    expect(src).toContain("const pick = rotation.length > 0 ? pickForPerson(rotation, firstInbox, evictedIds) : null")
    expect(src).toContain('if (nextStep > 1 && firstInboxUnreadable) { r.skipped++; continue }')
    expect(src).not.toMatch(/nextFromRotation\(rotation\)/)
  })
})
