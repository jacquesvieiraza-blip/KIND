// 9d·3 (#2559 · R189 ②) — AN APPROVED PROGRAMME'S MAILBOXES DO NOT CHANGE UNDER IT.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

let rows: { approved_at: string | null }[] = []
let fail = false
vi.mock('@kind/db', () => ({
  db: { from: () => { const q: Record<string, (...a: unknown[]) => unknown> = { select: () => q, eq: () => q, not: () => Promise.resolve(fail ? { data: null, error: { message: 'down' } } : { data: rows, error: null }) }; return q } },
}))
vi.mock('./programme', () => ({ TERMINAL_STATUSES: ['COMPLETED', 'CANCELLED'] }))

import { mailboxChangeRefusal, MAILBOX_FROZEN_COPY } from './mailbox-freeze'

beforeEach(() => { rows = []; fail = false })

describe('9d·3 — the rule', () => {
  it('approved (or live) → refused, with the way through', async () => {
    rows = [{ approved_at: '2026-10-01' }]
    expect(await mailboxChangeRefusal('c1')).toBe(MAILBOX_FROZEN_COPY)
    expect(MAILBOX_FROZEN_COPY).toMatch(/pause the programme, make the change, then ask the client to approve again/)
  })
  it('not approved yet, or no open programme → allowed', async () => {
    rows = [{ approved_at: null }]
    expect(await mailboxChangeRefusal('c1')).toBeNull()
    rows = []
    expect(await mailboxChangeRefusal('c1')).toBeNull()
  })
  it('unreadable → refused, never a guess', async () => {
    fail = true
    expect(await mailboxChangeRefusal('c1')).toMatch(/could not be checked/)
  })
})

describe('9d·3 — every door that changes which mailboxes send asks it', () => {
  it('assign, add and status change ask; branded-warming and a password fix do not', () => {
    const op = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    const route = (path: string) => { const i = op.indexOf(`operatorRouter.post('${path}'`); return op.slice(i, op.indexOf('operatorRouter.', i + 20)) }
    for (const p of ['/inboxes/assign', '/inboxes/:id/status', '/inboxes']) expect(route(p), p).toContain('mailboxChangeRefusal(client.id)')
    for (const p of ['/inboxes/brand', '/inboxes/:id/credentials']) expect(route(p), p).not.toContain('mailboxChangeRefusal(')
  })
})
