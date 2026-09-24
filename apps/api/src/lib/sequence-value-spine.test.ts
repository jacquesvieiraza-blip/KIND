// ═══════════════════════════════════════════════════════════════════════════════════════
// 24 Sep (R157) — EVERY MEETING EMAIL: PROBLEM → IMPACT → RETURN → SOLUTION.
//
// The founder, reading House's version-2 sequence: "weak outreach is not good … you need to add
// value here. what the problem is. how it impacts. and the return on investment. and then
// soluition." Asked what numbers the return may use, he chose B — none. This holds the order,
// the no-numbers rule, and that BOTH sequence writers actually hand it to the model.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { VALUE_SPINE, templateFor } from './sequence-templates'

const FIGSY = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the value spine', () => {
  it('🛑 is the founder\'s four parts, in his order', () => {
    const at = ['1. THE PROBLEM', '2. THE IMPACT', '3. THE RETURN', '4. THE SOLUTION'].map(p => VALUE_SPINE.indexOf(p))
    expect(at.every(i => i >= 0), at.join(',')).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('🛑 option B: the return is put in their terms and carries no number of ours', () => {
    const ret = VALUE_SPINE.slice(VALUE_SPINE.indexOf('3. THE RETURN'), VALUE_SPINE.indexOf('4. THE SOLUTION'))
    expect(ret).toMatch(/THEIR terms/)
    expect(ret).toMatch(/NEVER a number, percentage, price, result, timeframe or customer of our own/)
    // The example itself must be free of digits, or the model copies one.
    expect(ret.replace(/^3\. /, '')).not.toMatch(/\d/)
  })

  it('the solution comes only from the grounding, and the email still closes on one question', () => {
    expect(VALUE_SPINE).toMatch(/only from the grounding block, then the step's one low-friction question/)
  })

  it('🛑 BOTH sequence writers hand it to the model — for meeting sequences', () => {
    const sites = FIGSY.match(/plan\.purpose === 'meeting' \? `\\n\$\{VALUE_SPINE\}` : ''/g) ?? []
    expect(sites.length).toBe(2)
  })

  it('it sits on top of the P31 angles — the seven-angle arc is unchanged', () => {
    expect(templateFor('meeting', 7).angles).toEqual([
      'why-now', 'different-commercial-problem', 'proof', 'objection',
      'alternative-angle', 'new-evidence', 'final-low-friction-question',
    ])
  })
})
