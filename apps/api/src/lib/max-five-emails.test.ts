// 25 Sep (R166 ⑥ · P1b, board #2362) — NOBODY IS EMAILED MORE THAN FIVE TIMES.
//
// The founder set the most emails to one person at "5". Every door refuses a longer sequence,
// and a sequence stored before the change simply ENDS at five instead of mailing past it.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@kind/db', () => ({ db: { from: () => ({}) } }))
import { MAX_SEQUENCE_STEPS } from '@kind/shared'
import { enrollmentStep } from './figsy'
import { SEQUENCE_DEPTHS, normaliseDepth } from './sequence-templates'

const seven = Array.from({ length: 7 }, (_, i) => ({ subject: `s${i + 1}`, body: `b${i + 1}`, wait_days: 3 }))

describe('🛑 five emails, at most', () => {
  it('the shared maximum is 5 and no depth offers more', () => {
    expect(MAX_SEQUENCE_STEPS).toBe(5)
    expect(Math.max(...SEQUENCE_DEPTHS)).toBeLessThanOrEqual(5)
    expect(normaliseDepth(7)).not.toBe(7)
  })

  it('a stored 7-step sequence ends at step 5 — step 6 is never offered', () => {
    const e = { steps: seven }
    expect(enrollmentStep(e, 5)).toMatchObject({ subject: 's5', total: 5 })
    expect(enrollmentStep(e, 6)).toBeNull()
    expect(enrollmentStep(e, 7)).toBeNull()
  })

  it('a normal 5-step sequence is untouched', () => {
    const e = { steps: seven.slice(0, 5) }
    expect(enrollmentStep(e, 1)).toMatchObject({ subject: 's1', total: 5 })
    expect(enrollmentStep(e, 5)).toMatchObject({ subject: 's5', total: 5 })
  })

  it('Vida no longer offers 7 touches', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs')
    const vida = readFileSync(require('node:path').join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
    expect(vida).not.toContain('<option value={7}>7 touches</option>')
  })
})
