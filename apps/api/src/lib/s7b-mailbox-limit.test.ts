// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R185 ⑥ · card #2547 · S7 part b) — VIDA SHOWS THE MAILBOX LIMIT THE SENDER USES.
//
// Vida → Engine said "no cap" for a mailbox with a blank limit, and the Add Mailbox form said
// "blank = no cap". The sender holds that mailbox to 30 a day (`mailboxDailyCap`). A screen that
// promises more than the engine will do is the R87 defect in the other direction.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
vi.mock('@kind/db', () => ({ db: { from: () => ({}) } }))
import { DEFAULT_MAILBOX_DAILY_CAP as SHARED } from '@kind/shared'
import { DEFAULT_MAILBOX_DAILY_CAP as SENDER, mailboxDailyCap } from './mailbox-daily-cap'

const admin = (...p: string[]) => readFileSync(join(__dirname, '..', '..', '..', 'admin', 'src', ...p), 'utf8')

describe('one number for a blank mailbox limit, on the screen and in the sender', () => {
  it('🛑 the sender and Vida read the same constant, and a blank limit is held to it', () => {
    expect(SHARED).toBe(30)
    expect(SENDER).toBe(SHARED)
    expect(mailboxDailyCap(null)).toBe(SHARED)
  })

  it('🛑 Vida → Engine no longer says "no cap" for a blank limit', () => {
    const page = admin('app', 'vida', 'engine', 'page.tsx')
    expect(page).not.toContain("'no cap'")
    expect(page).toContain('`cap ${DEFAULT_MAILBOX_DAILY_CAP}/day (default)`')
  })

  it('🛑 the Add Mailbox form no longer says "blank = no cap"', () => {
    const form = admin('components', 'AddMailbox.tsx')
    expect(form).not.toContain('blank = no cap')
    expect(form).toContain('blank = ${DEFAULT_MAILBOX_DAILY_CAP} a day (the default)')
  })
})
