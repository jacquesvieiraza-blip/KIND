// ⚑ 3 Oct (#2552 · R185 ③) — A MAILBOX'S DAILY LIMIT IS SET IN VIDA, NEVER BY HAND-TYPED SQL.
// The founder's setup card asked for "one SQL line"; O3 forbids it (the runner is the only write).

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))

const OP = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
const ENGINE = readFileSync(join(__dirname, '../../../admin/src/app/vida/engine/page.tsx'), 'utf8')

describe('the daily limit', () => {
  it('1 to 100, whole numbers only (R185 ③: 100 a day per client)', async () => {
    const { parseDailyCap } = await import('./inbox-limits')
    expect(parseDailyCap(50)).toEqual({ ok: true, cap: 50 })
    expect(parseDailyCap('100')).toEqual({ ok: true, cap: 100 })
    for (const bad of [0, 101, 2.5, 'fifty', null, '']) expect(parseDailyCap(bad).ok, String(bad)).toBe(false)
  })
  it('the route writes only daily_cap, for this client\'s mailbox, refuses on a failed write, and is audited', () => {
    const route = OP.slice(OP.indexOf("operatorRouter.post('/inboxes/:id/daily-cap'"), OP.indexOf("operatorRouter.post('/inboxes/:id/credentials'"))
    expect(route).toContain(".update({ daily_cap: parsed.cap, updated_at: new Date().toISOString() })")
    expect(route).toContain(".eq('id', req.params.id).eq('client_id', client.id)")
    expect(route).toContain('Nothing changed.')
    expect(route).toContain('writeOperatorAudit(')
  })
  it('Vida → Engine has the button', () => {
    expect(ENGINE).toContain('post(`inboxes/${i.id}/daily-cap`, { client_id: i.client_id, daily_cap: Number(v) }, i.id)')
  })
})
