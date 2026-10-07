// ══════════════════════════════════════════════════════════════════════════════════════════
// N2 · 6 Oct — VIDA'S TOP BAR SHOWS THE REAL SENDING LIMITS
//
// The chip read only the overall warm-up cap (FIGSY_COLD_DAILY_CAP / FIGSY_WARMUP_START). That
// one is not set, so it said "⚠ No send cap set" — while every client IS held to the per-client
// limit (FIGSY_PER_CLIENT_DAILY_CAP) and every mailbox to its own. Founder chose A: show the
// real limits.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sendLimitChip } from './send-limit-chip'

describe('N2 · the limits chip', () => {
  it('🛑 no overall cap but a per-client limit → shows the per-client limit, never "No send cap"', () => {
    const c = sendLimitChip({ outreach_enabled: true, daily_cap: null, per_client_cap: 100 })
    expect(c.label).toBe('Limit 100/day per client')
    expect(c.label).not.toMatch(/no send cap/i)
    expect(c.tone).toBe('set')
  })

  it('both set → both shown', () => {
    expect(sendLimitChip({ outreach_enabled: true, daily_cap: 1000, per_client_cap: 100 }).label)
      .toBe('Limit 1000/day overall · 100/day per client')
  })

  it('an older API that sends no per-client field is read as unknown, not as none', () => {
    const c = sendLimitChip({ outreach_enabled: true, daily_cap: 40 })
    expect(c.label).toBe('Limit 40/day overall')
  })

  it('only when neither is set does it warn — and it says mailboxes still hold their own', () => {
    const c = sendLimitChip({ outreach_enabled: true, daily_cap: null, per_client_cap: null })
    expect(c.tone).toBe('warn')
    expect(c.title).toMatch(/mailbox/i)
  })

  it('not loaded → neutral, claims nothing', () => {
    expect(sendLimitChip(null)).toMatchObject({ label: 'Limit …', tone: 'unknown' })
  })
})

describe('N2 · wiring', () => {
  const strip = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n')
  it('🛑 the layout uses the chip rule, and the API sends the per-client limit', () => {
    const layout = strip(readFileSync(join(__dirname, '../app/vida/layout.tsx'), 'utf8'))
    expect(layout).toMatch(/sendLimitChip\(/)
    expect(layout).not.toMatch(/No send cap set/)
    const api = strip(readFileSync(join(__dirname, '../../../api/src/routes/operator.ts'), 'utf8'))
    const at = api.indexOf("operatorRouter.get('/status'")
    expect(api.slice(at, at + 800)).toMatch(/per_client_cap:\s*perClientDailyCap\(\)/)
  })
})
