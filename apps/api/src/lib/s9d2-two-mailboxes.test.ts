// 9d·2 (#2559 · R189 ②) — TWO MAILBOXES PER CLIENT, APPROVED TOGETHER.
//
// R189 ②: "each client gets 2 mailboxes, set up before approval and approved together — 50 + 50
// = 100 a day; nothing changes after approval, so nothing stops; each person always gets every
// email from the same mailbox."

import { describe, it, expect, vi } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))

import { frozenSenderSet } from './preparation-snapshot'

describe('9d·2 — the approval freezes the pair', () => {
  it('an equal pair is frozen as a sorted pair, so row order cannot change it', () => {
    const a = { id: 'i2', email: 'b@pool.com', status: 'assigned', kind: 'pooled' }
    const b = { id: 'i1', email: 'a@pool.com', status: 'assigned', kind: 'pooled' }
    expect(frozenSenderSet([a, b])).toBe('i1|a@pool.com,i2|b@pool.com')
    expect(frozenSenderSet([b, a])).toBe('i1|a@pool.com,i2|b@pool.com')
  })
  it('one box, or a branded box leading a pooled one (House today), keeps the old single form', () => {
    expect(frozenSenderSet([{ id: 'i1', email: 'a@x', status: 'active', kind: 'branded' }])).toBeNull()
    expect(frozenSenderSet([
      { id: 'i1', email: 'a@x', status: 'active', kind: 'branded' },
      { id: 'i2', email: 'b@x', status: 'assigned', kind: 'pooled' },
    ])).toBeNull()
  })
})

describe('9d·2 — wired in', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
  it('the database lets a client hold two pooled boxes', () => {
    expect(existsSync(join(__dirname, '../../../../supabase/migrations/20261002_two_mailboxes_per_client.sql'))).toBe(true)
    expect(read('pending-migrations.ts')).toContain('DROP INDEX IF EXISTS public.client_inboxes_one_live_per_kind;')
  })
  // ⚑ 3 Oct (review S3) — preparation runs again at go-live; a second box claimed after approval
  // would change the approved sender and stop every send.
  it('the second box is claimed only BEFORE approval, never at go-live', () => {
    expect(read('programme-preparation.ts')).toContain("if (stage.stage === 'pre_approval' && (senderClaim.ok || senderClaim.reason === 'already_has_sender')) {")
  })
  it('preparation claims the second; Vida may assign a second and refuses a third', () => {
    expect(read('programme-preparation.ts')).toContain('await claimSecondPooledSender(p.client_id)')
    expect(read('sender-claim.ts')).toContain("if (sending >= 2) return { ok: true, skipped: 'already_two' }")
    expect(read('../routes/operator.ts')).toContain('if (existingPooledList.length >= 2) {')
  })
  it('the sender gate no longer refuses an equal pair, and checks EVERY box', () => {
    const gate = read('programme-sender.ts')
    expect(gate).not.toMatch(/reason: 'ambiguous_sender',\s*\n\s*detail: `This client has/)
    expect((gate.match(/for \(const sendingBox of boxes\.length \? boxes : \[chosen\.inbox\]\)/g) ?? []).length).toBe(2)
  })
})
