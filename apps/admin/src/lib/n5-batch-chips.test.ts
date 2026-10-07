// ══════════════════════════════════════════════════════════════════════════════════════════
// N5 · 6 Oct — THE TWO BATCH CHIPS SAY WHICH BATCH THEY COUNT
//
// Vida's pipeline read "252 Sourced · 249 Qualified" beside "234 In the sequence". By design
// Sourced and Qualified count only the NEWEST batch (the one being checked or approved) while the
// other chips count the whole programme — and nothing said so, so the numbers looked wrong.
//
// ⚠️ "qualified", NOT "checked": 249 is the people who PASSED the check; 252 were checked.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { batchChipLabels } from './pipeline-batch-chips'

describe('N5 · labels', () => {
  it('🛑 with the batch number: "Batch 2:" then "found" and "qualified"', () => {
    expect(batchChipLabels(2)).toEqual({ prefix: 'Batch 2:', sourced: 'found', qualified: 'qualified' })
  })
  it('an older API with no batch number keeps the old words, unprefixed', () => {
    expect(batchChipLabels(undefined)).toEqual({ prefix: null, sourced: 'Sourced', qualified: 'Qualified' })
    expect(batchChipLabels(null)).toEqual({ prefix: null, sourced: 'Sourced', qualified: 'Qualified' })
  })
})

describe('N5 · wiring', () => {
  const strip = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n')
  it('🛑 Vida uses the labels and the API sends the batch number', () => {
    const page = strip(readFileSync(join(__dirname, '../app/vida/page.tsx'), 'utf8'))
    expect(page).toMatch(/batchChipLabels\(/)
    const facts = strip(readFileSync(join(__dirname, '../../../api/src/lib/programme-lifecycle-facts.ts'), 'utf8'))
    expect(facts).toMatch(/out\.batchSeq = /)
  })
})
