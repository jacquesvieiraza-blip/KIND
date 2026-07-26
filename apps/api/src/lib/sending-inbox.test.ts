import { describe, it, expect } from 'vitest'
import { pickSendingInbox, fromHeader, refusalLabel, type InboxRow } from './sending-inbox'

// #547 — WHOSE MAILBOX DOES THIS LEAVE FROM?
//
// The bug this replaces: `figsy.ts:26` was `const FROM = COLD_FROM`, a module-level
// constant, so every client emailed from ONE shared address. `client_inboxes` was written
// and never read. RULEBOOK 12.2 — one client's spam complaints poison the rest.
//
// The rule under test is deliberately harsh: **no usable mailbox = no send.** These tests
// exist because "fall back to ours" is the tempting, silent, catastrophic branch, and a
// pure decision function is the only place it can be proved absent.

const CREDS = {
  smtp_host: 'smtp.zapmail.example',
  smtp_port: 587,
  smtp_user: 'natalie@boostreachhq.co',
  smtp_pass_enc: 'v1:aa:bb:cc',
}

function inbox(over: Partial<InboxRow> = {}): InboxRow {
  return {
    id: 'ib-1',
    email: 'natalie@boostreachhq.co',
    kind: 'pooled',
    status: 'assigned',
    ...CREDS,
    ...over,
  }
}

describe('no mailbox = no send (never a fallback to the shared address)', () => {
  it('refuses when the client has no rows at all', () => {
    const r = pickSendingInbox([], true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no_inbox')
  })

  it('refuses when every row is released or retired', () => {
    const r = pickSendingInbox([
      inbox({ status: 'released' }),
      inbox({ id: 'ib-2', status: 'retired' }),
    ], true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no_inbox')
  })

  it('refuses when the mailbox exists but has no SMTP details', () => {
    // The row can be created by the assign step before anyone pastes the credentials in.
    // That must read as "cannot send", not as "send from somewhere else".
    const r = pickSendingInbox([inbox({ smtp_host: null, smtp_user: null, smtp_pass_enc: null })], true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no_credentials')
  })

  it('refuses when the password cannot be read because there is no key', () => {
    const r = pickSendingInbox([inbox()], false)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('no_secret_key')
  })

  it('a partially-filled mailbox is not usable — all three parts or none', () => {
    for (const missing of ['smtp_host', 'smtp_user', 'smtp_pass_enc'] as const) {
      const r = pickSendingInbox([inbox({ [missing]: null })], true)
      expect(r.ok).toBe(false)
    }
  })
})

describe('a WARMING mailbox never sends — sending on it is what un-warms it', () => {
  it('refuses when the only mailbox is warming', () => {
    const r = pickSendingInbox([inbox({ kind: 'branded', status: 'warming' })], true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('warming_only')
  })

  it('during the pooled→branded overlap, the POOLED one sends', () => {
    // The SOP overlap: they send on the pool from day 1 while their branded mailbox warms
    // ~14 days, so the ~day-29 switch is gapless. Picking the warming branded one here
    // would burn the very mailbox we are paying to warm.
    const r = pickSendingInbox([
      inbox({ id: 'branded', kind: 'branded', status: 'warming', email: 'ceo@theirdomain.com' }),
      inbox({ id: 'pooled', kind: 'pooled', status: 'assigned', email: 'natalie@boostreachhq.co' }),
    ], true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.inbox.id).toBe('pooled')
  })
})

describe('which mailbox wins once both are live', () => {
  it('an ACTIVE branded mailbox beats the pooled one it is replacing', () => {
    // After the switch the pooled row lingers until it is released. The client's own domain
    // is the whole point of the upgrade, so it must win the moment it is active.
    const r = pickSendingInbox([
      inbox({ id: 'pooled', kind: 'pooled', status: 'assigned' }),
      inbox({ id: 'branded', kind: 'branded', status: 'active', email: 'ceo@theirdomain.com' }),
    ], true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.inbox.id).toBe('branded')
  })

  it('order in the array never decides it', () => {
    const rows = [
      inbox({ id: 'branded', kind: 'branded', status: 'active' }),
      inbox({ id: 'pooled', kind: 'pooled', status: 'assigned' }),
    ]
    const a = pickSendingInbox(rows, true)
    const b = pickSendingInbox([...rows].reverse(), true)
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) expect(a.inbox.id).toBe(b.inbox.id)
  })

  it('skips a preferred mailbox that has no credentials rather than refusing outright', () => {
    // A half-configured branded mailbox must not take the client off the air when a working
    // pooled one is sitting right there.
    const r = pickSendingInbox([
      inbox({ id: 'branded', kind: 'branded', status: 'active', smtp_pass_enc: null }),
      inbox({ id: 'pooled', kind: 'pooled', status: 'assigned' }),
    ], true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.inbox.id).toBe('pooled')
  })

  it('tolerates junk rows instead of throwing mid-send', () => {
    const r = pickSendingInbox([null as unknown as InboxRow, inbox()], true)
    expect(r.ok).toBe(true)
  })
})

describe('the From header', () => {
  it('carries a display name when there is one — a bare address reads as machine-sent', () => {
    expect(fromHeader(inbox({ from_name: 'Natalie Blake' }))).toBe('Natalie Blake <natalie@boostreachhq.co>')
  })

  it('falls back to the bare address rather than inventing a name', () => {
    expect(fromHeader(inbox())).toBe('natalie@boostreachhq.co')
    expect(fromHeader(inbox({ from_name: '   ' }))).toBe('natalie@boostreachhq.co')
  })

  it('the ADDRESS is always the mailbox we authenticate as', () => {
    // A From address that differs from the authenticated user reads as spoofing to the
    // receiving server — the fastest way to land in spam with a warm mailbox.
    const r = pickSendingInbox([inbox({ from_name: 'Natalie Blake' })], true)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.from).toContain('<natalie@boostreachhq.co>')
  })
})

describe('every refusal is something an operator can act on', () => {
  it('is a readable sentence, never the bare reason code echoed back', () => {
    // The reason codes are for us; the label is what a human reads on the Vida card. The
    // one exception is INBOX_SECRET_KEY, which is named on purpose — that label's whole job
    // is to tell an operator which variable to set.
    for (const reason of ['no_inbox', 'warming_only', 'no_credentials', 'no_secret_key'] as const) {
      const label = refusalLabel(reason)
      expect(label.length).toBeGreaterThan(10)
      expect(label).not.toBe(reason)
      expect(label).toMatch(/^[A-Z]/)
      expect(label.replace('INBOX_SECRET_KEY', '')).not.toContain('_')
    }
  })

  it('the detail says what to do, not just what went wrong', () => {
    const r = pickSendingInbox([], true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.detail.toLowerCase()).toContain('assign')
  })
})
