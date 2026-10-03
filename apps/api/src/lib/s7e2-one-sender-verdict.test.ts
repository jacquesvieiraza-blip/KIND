// 7e·2 (#2547) — ONE SENDER-SAFETY VERDICT ON EVERY SCREEN.
//
// Vida's mailbox board and the System check asked only `pickSendingInbox`, and said "Can send"
// for a mailbox the send gate refuses (a tie between two boxes, or a box live on another client).

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))

import { screenSendVerdict, senderSafetyLabel } from './programme-sender'

describe('7e·2 — the screens use the gate\'s answer', () => {
  it('a refusal from the gate is a refusal on the screen, with the gate\'s own detail', async () => {
    const v = await screenSendVerdict('c1', async () => ({ ok: false, reason: 'shared_sender', detail: 'ops@acme.com is live on two clients.' }))
    expect(v).toEqual({ canSend: false, reason: 'shared_sender', label: 'This mailbox is live on another client too', detail: 'ops@acme.com is live on two clients.' })
  })
  it('the gate saying yes is the only way the screen says yes', async () => {
    expect(await screenSendVerdict('c1', async () => ({ ok: true, inboxId: 'i', email: 'a@b.c', status: 'live', kind: 'pooled' })))
      .toEqual({ canSend: true })
    expect(senderSafetyLabel('ambiguous_sender')).toMatch(/tie/)
  })
  it('Vida\'s board and the System check both ask it after the picker says yes', () => {
    const op = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    const probes = readFileSync(join(__dirname, 'system-probes.ts'), 'utf8')
    expect(op).toMatch(/if \(decision\.ok\) \{\s*const gate = await screenSendVerdict\(c\.id\)/)
    expect(probes).toContain('const gate = await screenSendVerdict(c.id)')
    expect(probes.indexOf('screenSendVerdict(c.id)')).toBeLessThan(probes.indexOf('return ok(name, `Can send from ${send.inbox.email}'))
  })
})
