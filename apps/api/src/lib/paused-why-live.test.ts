// ⚑ 3 Oct (#2561 · R191 ⑤) — A PAUSED LIVE PROGRAMME SAYS WHY ON ITS OWN PROGRAMME SCREEN.
//
// RUNTIME-FOUND (round screenshots, 3 Oct): a live programme paused for a refund showed no reason
// on the Programme page (the live screen is `ProgrammeOutcome`); only Settings and Performance
// rendered `pausedCopy`. R191 ⑤: the client sees why, in plain words.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const OUTCOME = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeOutcome.tsx'), 'utf8')

describe('the live Programme screen shows the pause reason', () => {
  it('renders the server\'s sentence when paused, on the live (not finished) layout', () => {
    const live = OUTCOME.slice(OUTCOME.lastIndexOf('  return (\n    <div className="flex flex-col gap-4">\n      {hero}'))
    expect(live).toContain('{p.paused && p.pausedCopy && (')
    expect(live).toContain('{p.pausedCopy}</p>')
  })
  it('never types its own sentence — it is the server\'s copy', () => {
    expect(OUTCOME).not.toContain('Your payment for this programme')
    expect(OUTCOME).not.toContain("We've paused")
  })
})
