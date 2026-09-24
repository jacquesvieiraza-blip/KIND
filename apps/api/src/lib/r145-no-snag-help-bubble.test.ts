// R145 tracker #95 (24 Sep) — the old dashboard's help bubble still said "I hit a snag".
// Founder, 23 Sep: *"the i hit a snag is bulsshit. it is so customer unfriendly."*
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const BUBBLE = readFileSync(join(__dirname, '../../../portal/src/components/ui/VidaHelpBubble.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('#95 · the help bubble does not say "I hit a snag"', () => {
  it('🛑 the failure line says what happened, plainly', () => {
    expect(BUBBLE).not.toMatch(/hit a snag/i)
    expect(BUBBLE).toContain('I couldn’t reach the server just now. Please try again, or email hello@get-kind.com.')
  })
})
