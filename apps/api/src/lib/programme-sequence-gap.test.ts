// ═══════════════════════════════════════════════════════════════════════════════════════
// 24 Sep — EVERY GENERATED 5-STEP PROGRAMME SEQUENCE WAS REFUSED. The founder's House walk:
// *"Step 5 is set to send the same day as the one before it."* The stored cadence is the gap
// AFTER each step ([4, 5, 5, 7, 0] — the last 0 means nothing follows); the quality linter reads
// the gap BEFORE each step. This runs the REAL cadence and the REAL linter through the fix.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { sequencePlan, gapsBeforeEachStep } from './sequence-templates'
import { lintSequence } from './sequence-quality'

const plan = sequencePlan({ industry: null })
const steps = plan.gaps.map((g, i) => ({ step: i + 1, subject: `Subject ${i + 1}`, body: 'Body', wait_days: g }))

describe('a programme sequence on the real cadence', () => {
  it('the defect, reproduced: handed over RAW, the real cadence is refused as "same day"', () => {
    expect(lintSequence(steps).hardFails.map(v => v.rule)).toContain('steps_same_day')
  })

  it('🛑 the generator lints the TRANSLATED steps, never the raw ones', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const src = readFileSync(join(__dirname, 'programme-sequence-generation.ts'), 'utf8')
    expect(src).toContain('const quality = lintSequence(gapsBeforeEachStep(steps) as never)')
  })

  it('🛑 is NOT refused as "same day" once its gaps are read the linter\'s way', () => {
    expect(plan.gaps[plan.gaps.length - 1], 'the last gap is the unread 0').toBe(0)
    const rules = lintSequence(gapsBeforeEachStep(steps)).hardFails.map(v => v.rule)
    expect(rules).not.toContain('steps_same_day')
  })

  it('🛑 …and a REAL zero gap between two steps still fails', () => {
    const bad = steps.map((s, i) => (i === 1 ? { ...s, wait_days: 0 } : s))   // step 2 → step 3 same day
    const hard = lintSequence(gapsBeforeEachStep(bad)).hardFails
    expect(hard.some(v => v.rule === 'steps_same_day' && v.step === 3)).toBe(true)
  })

  it('the translation keeps every word and only re-expresses the gaps', () => {
    const t = gapsBeforeEachStep(steps)
    expect(t.map(s => s.subject)).toEqual(steps.map(s => s.subject))
    expect(t.map(s => s.wait_days)).toEqual([0, ...plan.gaps.slice(0, -1)])
  })
})
