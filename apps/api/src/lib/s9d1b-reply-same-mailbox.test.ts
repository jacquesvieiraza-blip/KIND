// 9d part 1b (#2559 · R187 ④ · R189 ② · review S5) — AN ANSWER LEAVES FROM THE MAILBOX THE
// PROSPECT WROTE TO. With two mailboxes, a reply sent from Milla could leave from the other one.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { pickInboxForPerson, type InboxRow } from './sending-inbox'

const box = (id: string, extra: Partial<InboxRow> = {}): InboxRow => ({
  id, email: `${id}@pool.com`, kind: 'pooled', status: 'assigned',
  smtp_host: 'smtp.x', smtp_port: 587, smtp_user: id, smtp_pass_enc: 'enc', ...extra,
})

describe('9d·1b — which mailbox answers', () => {
  const A = box('a'), B = box('b')
  it('emailed from B → the answer leaves from B, even though A ranks the same', () => {
    const r = pickInboxForPerson([A, B], true, 'b')
    expect(r.ok && r.inbox.id).toBe('b')
  })
  it('never emailed on record → the usual pick', () => {
    const r = pickInboxForPerson([A, B], true, null)
    expect(r.ok).toBe(true)
  })
  it('emailed from B, B still the client\'s but cannot send → refused with the reason, never A', () => {
    const r = pickInboxForPerson([A, box('b', { smtp_pass_enc: null, smtp_user: null })], true, 'b')
    expect(r.ok).toBe(false)
    expect(!r.ok && r.detail).toMatch(/was emailed from b@pool\.com, so the answer must leave from it too/)
  })
  it('emailed from a mailbox no longer the client\'s → the usual pick', () => {
    const r = pickInboxForPerson([A, box('b', { status: 'released' })], true, 'b')
    expect(r.ok && r.inbox.id).toBe('a')
  })
})

describe('9d·1b — wired into the reply sent from Milla', () => {
  it('manual-reply asks for the person\'s mailbox, not the client\'s top-ranked one', () => {
    const src = readFileSync(join(__dirname, 'manual-reply.ts'), 'utf8')
    expect(src).toContain('await resolveInboxForPerson(clientId, reply.lead_id ?? null)')
    expect(src).not.toContain('await resolveSendingInbox(clientId)')
  })
})
