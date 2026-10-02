// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (#2024) — WHAT STOPS A MAILBOX SENDING BEFORE IT IS WARM. Founder: "A for 2024".
//
// The card said no send path had been shown to refuse on the warm-up. This is the proof, on
// both doors a send goes through (`pickSendingInbox` for "may this client send at all?",
// `sendablePool` for "which boxes carry the batch?"):
//   · a mailbox whose STATUS is `warming` never sends — whatever its ready date says;
//   · the ready date (`warmup_ready_at`) is a REMINDER for the team, not permission. A mailbox
//     sends once the team moves it to `active` (#553's ladder), and only then.
// The founder chose this (A) over making the date a second gate (B), which could have stopped a
// mailbox the team had already switched on.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { pickSendingInbox, sendablePool, type InboxRow } from './sending-inbox'

const box = (over: Partial<InboxRow> & Record<string, unknown> = {}): InboxRow => ({
  id: 'ib-1', email: 'sam@client.co', kind: 'branded', status: 'warming',
  smtp_host: 'smtp.gmail.com', smtp_port: 465, smtp_user: 'sam@client.co', smtp_pass_enc: 'v1:aa:bb:cc',
  ...over,
} as InboxRow)
const IN_10_DAYS = new Date(Date.now() + 10 * 864e5).toISOString()
const LAST_WEEK = new Date(Date.now() - 7 * 864e5).toISOString()

describe('#2024 — a warming mailbox never sends', () => {
  it('🛑 warming, ready date still ahead: refused by both doors', () => {
    const rows = [box({ warmup_ready_at: IN_10_DAYS })]
    const one = pickSendingInbox(rows, true)
    expect(one.ok).toBe(false)
    if (!one.ok) expect(one.reason).toBe('warming_only')
    expect(sendablePool(rows, true).ok).toBe(false)
  })

  it('🛑 warming, ready date already passed: STILL refused — the date alone never switches a mailbox on', () => {
    const rows = [box({ warmup_ready_at: LAST_WEEK })]
    expect(pickSendingInbox(rows, true).ok).toBe(false)
    expect(sendablePool(rows, true).ok).toBe(false)
  })

  it('a warming box never joins a batch, even beside a mailbox that may send', () => {
    const rows = [
      box({ id: 'warm', warmup_ready_at: IN_10_DAYS }),
      box({ id: 'pooled', kind: 'pooled', status: 'assigned', email: 'n@pool.co' }),
    ]
    const pool = sendablePool(rows, true)
    expect(pool.ok).toBe(true)
    if (pool.ok) expect(pool.boxes.map(b => b.id)).toEqual(['pooled'])
  })

  it('once the team moves it to active, it sends — the team decides, not the clock', () => {
    const r = pickSendingInbox([box({ status: 'active', warmup_ready_at: IN_10_DAYS })], true)
    expect(r.ok).toBe(true)
  })
})
