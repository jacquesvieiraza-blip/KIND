// ⚑ 3 Oct (sequencing piece 7 — the founder's blueprint view 9). Past programmes side by side and
// a timeline of what changed — read-only, from what is already stored.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@kind/db', () => ({ db: {} }))
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildHistory } from './programme-history'
import type { Direction } from './programme-direction'

const D = (v: number, over: Partial<Direction>): Direction => ({
  goal: `goal ${v}`, who: 'w', problem: `problem ${v}`, impact: 'i', answer: 'a', proof: 'p', ask: `ask ${v}`,
  version: v, status: 'approved', programme_id: null, drafted_at: `2026-10-0${v}T09:00:00Z`, approved_at: `2026-10-0${v}T10:00:00Z`, ...over,
})
const PROGS = [
  { id: 'p2', status: 'READY_FOR_APPROVAL', meeting_target: 5, first_paid_at: '2026-10-03T11:00:00Z', created_at: null },
  { id: 'p1', status: 'COMPLETED', meeting_target: 8, first_paid_at: '2026-09-01T11:00:00Z', created_at: null },
  { id: 'p0', status: 'COMPLETED', meeting_target: 3, first_paid_at: '2026-08-01T11:00:00Z', created_at: null },
]

describe('programme comparison', () => {
  it('one column per programme a direction was approved for — oldest first; a programme from before directions is left out', () => {
    const h = buildHistory({ current: D(3, { programme_id: 'p2', business_version: 4 }), history: [D(1, { programme_id: 'p1', business_version: 2 })] }, PROGS, [])
    expect(h.programmes.map(p => [p.programmeId, p.goal, p.problem, p.ask, p.businessVersion])).toEqual([
      ['p1', 'goal 1', 'problem 1', 'ask 1', 2], ['p2', 'goal 3', 'problem 3', 'ask 3', 4],
    ])
  })
  it("a draft is never shown as a programme's direction", () => {
    const h = buildHistory({ current: D(3, { programme_id: 'p2', status: 'draft', approved_at: null }), history: [] }, PROGS, [])
    expect(h.programmes).toEqual([])
  })
})

describe('the timeline', () => {
  it('direction versions drafted and approved, and "Your business" changes — newest first, no duplicates', () => {
    const h = buildHistory(
      { current: D(2, { programme_id: 'p2' }), history: [D(1, { programme_id: 'p1' }), D(1, { programme_id: 'p1' })] }, PROGS,
      [{ version: 2, key: 'sells', at: '2026-10-01T12:00:00Z' }],
    )
    expect(h.events.map(e => e.title)).toEqual([
      'Direction version 2 approved', 'Direction version 2 drafted', 'Your business — version 2',
      'Direction version 1 approved', 'Direction version 1 drafted',
    ])
    expect(h.events.find(e => e.title === 'Your business — version 2')?.detail).toBe('What you sell changed.')
  })
})

describe('wired, read-only, and honest about retention', () => {
  it('the route, the panel, no typing box (R196), the R145 words', () => {
    expect(readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')).toContain("myProgrammeRouter.get('/history'")
    const panel = readFileSync(join(__dirname, '../../../portal/src/components/milla/PastProgrammes.tsx'), 'utf8')
    expect(panel).toContain('New goal = new sequence. Not new onboarding.')
    expect(panel).toContain('Prospect details kept 90 days · your business is kept')
    expect(panel).not.toMatch(/<(input|textarea|form|select)\b/)
    expect(panel).not.toMatch(/api\.(post|put|patch|delete)\(/)
    expect(readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/programme/page.tsx'), 'utf8')).toContain('<PastProgrammes />')
  })
  it('approval records which "Your business" version the direction was approved against', () => {
    expect(readFileSync(join(__dirname, 'programme-direction.ts'), 'utf8')).toContain('business_version: (await readBusiness(clientId)).version')
  })
})
