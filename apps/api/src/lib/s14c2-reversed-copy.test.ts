// 14c (#2561) — THE CLIENT IS TOLD, IN PLAIN WORDS, WHY A REVERSED PROGRAMME IS PAUSED.
//
// ⛓️ FOUNDER-RULED 2 Oct (R191): *"Refuse until it's settled"* — "The client sees why in plain
// words". A refund or dispute pauses with `pause_reason = 'quality'`, so the screen used to say
// "We've paused sending while we check quality" — not the reason.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { MILLA_PAYMENT_REVERSED_COPY, MILLA_PAUSE_COPY } from '@kind/shared'

const CP = readFileSync(join(__dirname, 'customer-programme.ts'), 'utf8')

describe('14c — a reversed payment is named as the reason', () => {
  it('the words say refunded or disputed, and nothing about quality', () => {
    expect(MILLA_PAYMENT_REVERSED_COPY).toMatch(/refunded or disputed with your bank/)
    expect(MILLA_PAYMENT_REVERSED_COPY).not.toMatch(/quality/)
    expect(MILLA_PAYMENT_REVERSED_COPY).not.toBe(MILLA_PAUSE_COPY.quality)
  })
  it('the client read selects disputed_at and uses it before the pause reason', () => {
    expect(CP).toMatch(/paused_at, pause_reason, disputed_at, /)
    expect(CP).toContain('(p.disputed_at ? MILLA_PAYMENT_REVERSED_COPY : pausedCopyFor(')
  })
})
