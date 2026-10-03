// 7e·4 (#2547) — A MAILBOX WHOSE CONNECTION CHANGED IS NO LONGER "VERIFIED".

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))

import { connectionChanged } from './sending-inbox'

const before = { smtp_host: 'smtp.zoho.com', smtp_port: 465, smtp_user: 'ops@acme.com' }

describe('7e·4 — what counts as a change', () => {
  it('host, username, port or a new password → changed', () => {
    expect(connectionChanged(before, { ...before, smtp_host: 'smtp.gmail.com' }, false)).toBe(true)
    expect(connectionChanged(before, { ...before, smtp_user: 'sales@acme.com' }, false)).toBe(true)
    expect(connectionChanged(before, { ...before, smtp_port: 587 }, false)).toBe(true)
    expect(connectionChanged(before, before, true)).toBe(true)
  })
  it('the same details (case and spaces aside) → not changed, so a From-name edit keeps the mark', () => {
    expect(connectionChanged(before, { smtp_host: ' SMTP.zoho.com ', smtp_port: 465, smtp_user: 'Ops@Acme.com' }, false)).toBe(false)
  })
  it('no row read → treated as changed', () => {
    expect(connectionChanged(null, before as never, false)).toBe(true)
  })
})

describe('7e·4 — the save clears it', () => {
  it('the credentials save sets verified_at to null when the connection changed', () => {
    const op = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    const route = op.slice(op.indexOf("operatorRouter.post('/inboxes/:id/credentials'"))
    const clear = route.indexOf('patch.verified_at = null')
    const write = route.indexOf("db.from('client_inboxes').update(patch)")
    expect(clear).toBeGreaterThan(-1)
    expect(write).toBeGreaterThan(clear)
  })
})
