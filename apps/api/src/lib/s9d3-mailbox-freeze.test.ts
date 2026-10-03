// 9d·3 (#2559 · R189 ②) — AN APPROVED, RUNNING PROGRAMME'S MAILBOXES DO NOT CHANGE UNDER IT.
//
// ⛓️ 3 Oct (review S2 · S6): the first version froze every approved open programme, and nothing
// clears `approved_at`, so its "pause, change, approve again" unlocked nothing — not even
// retiring a bouncing mailbox. Old assertions kept below as comments where they changed.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

let rows: { approved_at: string | null; paused_at?: string | null }[] = []
let fail = false
vi.mock('@kind/db', () => ({
  db: { from: () => { const q: Record<string, (...a: unknown[]) => unknown> = { select: () => q, eq: () => q, not: () => Promise.resolve(fail ? { data: null, error: { message: 'down' } } : { data: rows, error: null }) }; return q } },
}))
vi.mock('./programme', () => ({ TERMINAL_STATUSES: ['COMPLETED', 'CANCELLED'] }))

import { mailboxChangeRefusal, MAILBOX_FROZEN_COPY, changeIsAlwaysSafe } from './mailbox-freeze'

beforeEach(() => { rows = []; fail = false })
const ASSIGN = { kind: 'assign' } as const

describe('9d·3 — the rule', () => {
  it('approved and running → refused, with a way through that exists', async () => {
    rows = [{ approved_at: '2026-10-01', paused_at: null }]
    expect(await mailboxChangeRefusal('c1', ASSIGN)).toBe(MAILBOX_FROZEN_COPY)
    // ⛓️ was /pause the programme, make the change, then ask the client to approve again/
    expect(MAILBOX_FROZEN_COPY).toMatch(/pause the programme, make the change, press "New version for approval"/)
  })
  it('approved but PAUSED → allowed (the change is then re-approved before anything sends)', async () => {
    rows = [{ approved_at: '2026-10-01', paused_at: '2026-10-03' }]
    expect(await mailboxChangeRefusal('c1', ASSIGN)).toBeNull()
  })
  it('stopping a mailbox is always allowed, even while running', async () => {
    rows = [{ approved_at: '2026-10-01', paused_at: null }]
    expect(await mailboxChangeRefusal('c1', { kind: 'status', to: 'retired' })).toBeNull()
    expect(await mailboxChangeRefusal('c1', { kind: 'status', to: 'released' })).toBeNull()
    expect(await mailboxChangeRefusal('c1', { kind: 'status', to: 'active' })).toBe(MAILBOX_FROZEN_COPY)
  })
  it('recording a warming mailbox is allowed; adding a live one is not', async () => {
    rows = [{ approved_at: '2026-10-01', paused_at: null }]
    expect(await mailboxChangeRefusal('c1', { kind: 'add', status: 'warming' })).toBeNull()
    expect(await mailboxChangeRefusal('c1', { kind: 'add', status: 'active' })).toBe(MAILBOX_FROZEN_COPY)
    expect(changeIsAlwaysSafe({ kind: 'assign' })).toBe(false)
  })
  it('not approved yet, or no open programme → allowed', async () => {
    rows = [{ approved_at: null }]
    expect(await mailboxChangeRefusal('c1', ASSIGN)).toBeNull()
    rows = []
    expect(await mailboxChangeRefusal('c1', ASSIGN)).toBeNull()
  })
  it('unreadable → refused, never a guess', async () => {
    fail = true
    expect(await mailboxChangeRefusal('c1', ASSIGN)).toMatch(/could not be checked/)
  })
})

describe('9d·3 — every door that changes which mailboxes send asks it', () => {
  it('assign, add and status change ask, saying what the change is; branded-warming and a password fix do not', () => {
    const op = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    const route = (path: string) => { const i = op.indexOf(`operatorRouter.post('${path}'`); return op.slice(i, op.indexOf('operatorRouter.', i + 20)) }
    expect(route('/inboxes/assign')).toContain("mailboxChangeRefusal(client.id, { kind: 'assign' })")
    expect(route('/inboxes/:id/status')).toContain("mailboxChangeRefusal(client.id, { kind: 'status', to: String(status) })")
    expect(route('/inboxes')).toContain("mailboxChangeRefusal(client.id, { kind: 'add', status: String(v.status) })")
    for (const p of ['/inboxes/brand', '/inboxes/:id/credentials']) expect(route(p), p).not.toContain('mailboxChangeRefusal(')
  })
})
