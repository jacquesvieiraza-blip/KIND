// 14c (#2561) — THE CLIENT IS TOLD, IN PLAIN WORDS, WHY A REVERSED PROGRAMME IS PAUSED.
//
// ⛓️ FOUNDER-RULED 2 Oct (R191): *"Refuse until it's settled"* — "The client sees why in plain
// words". A refund or dispute pauses with `pause_reason = 'quality'`, so the screen used to say
// "We've paused sending while we check quality" — not the reason.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { MILLA_PAYMENT_REVERSED_COPY, MILLA_PAUSE_COPY, pausedCopyForProgramme } from '@kind/shared'

const CP = readFileSync(join(__dirname, 'customer-programme.ts'), 'utf8')

describe('14c — a reversed payment is named as the reason', () => {
  it('the words say refunded or disputed, and nothing about quality', () => {
    expect(MILLA_PAYMENT_REVERSED_COPY).toMatch(/refunded or disputed with your bank/)
    expect(MILLA_PAYMENT_REVERSED_COPY).not.toMatch(/quality/)
    expect(MILLA_PAYMENT_REVERSED_COPY).not.toBe(MILLA_PAUSE_COPY.quality)
  })
  // ⛓️ 3 Oct (review S14): this asserted `(p.disputed_at ? MILLA_PAYMENT_REVERSED_COPY : …)`.
  // `disputed_at` is never cleared (it is evidence), so EVERY later pause said "refunded or
  // disputed" — after a won dispute too. The intent stands; the choice now asks which pause it is.
  it('the client read selects disputed_at and asks which pause this is', () => {
    expect(CP).toMatch(/paused_at, pause_reason, disputed_at, /)
    expect(CP).toContain('pausedCopy: pausedCopyForProgramme(p ')
  })
})

describe('14c — the reversal sentence belongs to the reversal\'s pause only', () => {
  const DISPUTED = '2026-10-01T10:00:00.000Z'
  it('paused by the refund or dispute → says so', () => {
    expect(pausedCopyForProgramme({ paused_at: DISPUTED, pause_reason: 'quality', disputed_at: DISPUTED })).toBe(MILLA_PAYMENT_REVERSED_COPY)
  })
  it('already paused when the money was reversed → says so', () => {
    expect(pausedCopyForProgramme({ paused_at: '2026-09-30T08:00:00.000Z', pause_reason: 'icp_change', disputed_at: DISPUTED })).toBe(MILLA_PAYMENT_REVERSED_COPY)
  })
  it('a dispute won and resumed, then paused again → the ordinary reason', () => {
    expect(pausedCopyForProgramme({ paused_at: '2026-10-09T09:00:00.000Z', pause_reason: 'icp_change', disputed_at: DISPUTED })).toBe(MILLA_PAUSE_COPY.icp_change)
  })
  it('not paused → nothing', () => {
    expect(pausedCopyForProgramme({ paused_at: null, pause_reason: null, disputed_at: DISPUTED })).toBeNull()
  })
})
