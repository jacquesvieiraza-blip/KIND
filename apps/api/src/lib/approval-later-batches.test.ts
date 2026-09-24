// ═══════════════════════════════════════════════════════════════════════════════════════
// 24 Sep — "BUT WHY 234. WE NEED TO SHOW THEM WAY MORE. THEY APPROVED WAY MORE"
//
// The founder, on House's Approval screen: a 10-meeting programme showed "234 people we will
// write to" and nothing else. 234 is the FIRST batch; later batches of about 250 are found after
// approval under the same approved package, up to the plan (meetings × 250). This holds the line
// that says so, and holds it to the PLAN — the internal sourcing ceiling never reaches a client.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  laterBatchesLine, PROGRAMME_BATCH_SIZE, LEADS_PER_TARGETED_MEETING, sourcingCeiling,
} from '@kind/shared'

const APPROVAL = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeApproval.tsx'), 'utf8')

describe('the Approval screen says more people follow the first batch', () => {
  it('🛑 the House case: 234 now, batches of about 250, about 2,500 planned', () => {
    const line = laterBatchesLine(234, 10)!
    expect(line).toContain('first 234')
    expect(line).toContain(`batches of about ${PROGRAMME_BATCH_SIZE}`)
    expect(line).toContain(`about ${(10 * LEADS_PER_TARGETED_MEETING).toLocaleString('en-US')} planned`)
    expect(line).toContain('same messages, timing and sender')
  })

  it('🛑 the plan, never the internal limit', () => {
    const line = laterBatchesLine(234, 10)!
    const ceiling = sourcingCeiling(10)
    expect(ceiling).toBeGreaterThan(10 * LEADS_PER_TARGETED_MEETING)
    expect(line).not.toContain(ceiling.toLocaleString('en-US'))
    expect(line).not.toContain('400')
  })

  it('says nothing when there is no target, or this batch already covers the plan', () => {
    expect(laterBatchesLine(234, null)).toBeNull()
    expect(laterBatchesLine(234, 0)).toBeNull()
    expect(laterBatchesLine(250, 1)).toBeNull()
  })

  it('one batch size, shared by the engine and the screen', () => {
    // Read, not imported: the engine module opens a database client on load.
    const ENGINE = readFileSync(join(__dirname, 'programme.ts'), 'utf8')
    expect(ENGINE).toContain("import { PROGRAMME_BATCH_SIZE } from '@kind/shared'")
    expect(ENGINE).not.toMatch(/const PROGRAMME_BATCH_SIZE\s*=/)
  })

  it('🛑 the People card draws the line from the frozen package\'s own numbers', () => {
    expect(APPROVAL).toContain('const laterBatches = laterBatchesLine(population, frozen?.meeting_target ?? data.programme?.meeting_target ?? null)')
    expect(APPROVAL).toContain('{laterBatches && <small data-testid="later-batches">{laterBatches}</small>}')
  })
})
