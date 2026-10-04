// ⚑ 3 Oct (sequencing piece 4 — the founder's blueprint view 5) — WHO THIS PROGRAMME IS FOR.
// A narrower slice of the client's own targeting, approved with the direction, searched for THIS
// programme only; the saved targeting (My ICP) is never changed.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@kind/db', () => ({ db: {} }))
import { readFileSync } from 'fs'
import { join } from 'path'
import { cleanAudience, applyAudienceSlice, directionPromptBlock, fitsAudience, type Audience, type Direction } from './programme-direction'

const MASTER = {
  industries: ['Facilities Services', 'Construction', 'Building Maintenance'],
  company_sizes: ['51–200', '201–500'],
  job_titles: ['Operations Director', 'Head of Operations', 'Service Delivery Manager'],
}
const A: Audience = { industries: ['Facilities Services'], company_sizes: ['51–200'], job_titles: ['Operations Director'], exclude: 'consultancies', reason: 'r' }

describe('Milla chooses only from the client\'s own targeting', () => {
  it('keeps listed values (in the client\'s spelling), drops anything invented', () => {
    const a = cleanAudience({ industries: ['facilities services', 'Aerospace'], company_sizes: ['51–200'], job_titles: ['CEO', 'Head of Operations'] }, MASTER)
    expect(a.industries).toEqual(['Facilities Services'])
    expect(a.job_titles).toEqual(['Head of Operations'])
  })
  it('🛑 a list the model left empty or invented entirely is the whole targeting — never empty', () => {
    const a = cleanAudience({ industries: ['Aerospace'] }, MASTER)
    expect(a.industries).toEqual(MASTER.industries)
    expect(a.company_sizes).toEqual(MASTER.company_sizes)
    expect(cleanAudience(null, MASTER).job_titles).toEqual(MASTER.job_titles)
  })
})

describe('🛑 the programme searches the slice, and the saved targeting is never changed', () => {
  const icp = { id: 'i', industries: [...MASTER.industries], company_sizes: [...MASTER.company_sizes], job_titles: [...MASTER.job_titles], exclusions: 'no councils' }
  it('narrows each list and adds the exclusions', () => {
    const s = applyAudienceSlice(icp, A)
    expect(s).toMatchObject({ industries: ['Facilities Services'], company_sizes: ['51–200'], job_titles: ['Operations Director'], exclusions: 'no councils; consultancies' })
  })
  it('never widens and never empties a list', () => {
    const s = applyAudienceSlice({ ...icp, industries: ['Construction'] }, A)
    expect(s.industries).toEqual(['Construction'])
  })
  it('returns a new object — the row it was given is untouched', () => {
    applyAudienceSlice(icp, A)
    expect(icp.industries).toEqual(MASTER.industries)
    expect(icp.exclusions).toBe('no councils')
  })
  it('wired into the one search door: only for a programme run, never proof, before the pool is served', () => {
    const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    const at = src.indexOf('applyAudienceSlice(icp as Record<string, unknown>, slice)')
    expect(at).toBeGreaterThan(-1)
    expect(src.slice(at - 600, at)).toMatch(/if \(!proofMode && \(icp as \{ programme_id\?: string \| null \}\)\.programme_id\)/)
    expect(at).toBeLessThan(src.indexOf('servePoolLeads(icp'))
    expect(at).toBeLessThan(src.indexOf('searchPeopleWithFallback(icpForSearch'))
    // The only write to the ICP row in a run is the timestamp and the cursor — never a list.
    expect(src).toContain(".update({ last_run_at: new Date().toISOString(), ...(cursorUpdate ?? {}) })")
  })
})

describe('the writer and the screen', () => {
  it('the email writer is told who the programme is for', () => {
    const d = { goal: 'g', who: 'w', problem: 'p', impact: 'i', answer: 'a', proof: 'pr', ask: 'k', audience: A, version: 1, status: 'approved', programme_id: 'p1', drafted_at: '', approved_at: '' } as Direction
    expect(directionPromptBlock(d)).toContain('The audience for this programme: industries Facilities Services · company size 51–200 · roles Operations Director · leaving out consultancies')
  })
  it('a found person fits when their role matches', () => {
    expect(fitsAudience('Operations Director, UK', A)).toBe(true)
    expect(fitsAudience('Finance Manager', A)).toBe(false)
  })
  it('🛑 R196 — the audience is changed by telling Milla, never typed on the right', () => {
    const card = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeDirection.tsx'), 'utf8')
    const conv = readFileSync(join(__dirname, '../../../portal/src/components/milla/MillaConversation.tsx'), 'utf8')
    const route = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')
    expect(card).toContain('data-testid="programme-audience"')
    expect(card).toContain("conversation.focus('direction:audience'")
    expect(card).not.toMatch(/<(input|textarea|form|select)\b/)
    expect(conv).toContain("'/my/programme/direction/audience'")
    expect(route).toContain("myProgrammeRouter.post('/direction/audience'")
  })
})
