// R145 tracker #86 (24 Sep) — a late Stripe event for an old wallet top-up must not start
// retired per-lead work for ANY client (R137: *"the 299/4 is retired/ this must go."*).
// The open-programme check only covered clients with an open programme; a Brief/Proof client
// or one whose programme had ended still reached `startWorkForClient`.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const STRIPE = readFileSync(join(__dirname, '../routes/stripe.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('#86 · a late legacy top-up starts no work', () => {
  it('🛑 the retired-door verdict is asked BEFORE start-work is even imported', () => {
    const doorAt = STRIPE.indexOf('const door = await legacyDoorVerdict(clientId)')
    const startAt = STRIPE.indexOf("const { startWorkForClient } = await import('../lib/start-work')")
    expect(doorAt).toBeGreaterThan(-1)
    expect(doorAt).toBeLessThan(startAt)
  })

  it('🛑 a refused verdict returns before any work, and says so', () => {
    const doorAt = STRIPE.indexOf('const door = await legacyDoorVerdict(clientId)')
    const block = STRIPE.slice(doorAt, STRIPE.indexOf("const { startWorkForClient }", doorAt))
    expect(block).toMatch(/if \(!door\.allowed\) \{[\s\S]*return\s*\}/)
    expect(block).toContain('work NOT started (R137)')
  })

  it('🛑 and under R137 that verdict is always no', () => {
    const CM = readFileSync(join(__dirname, './commercial-model.ts'), 'utf8')
    const fn = CM.slice(CM.indexOf('export function mayUseLegacyCommercialPath'))
    expect(fn.slice(0, fn.indexOf('\n}') + 2)).toMatch(/return false\s*\n\}/)
  })
})
