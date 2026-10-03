// ⚑ 3 Oct (R195 ④ · sequencing piece 2) — "YOUR BUSINESS" IN MY ICP, KEPT ONCE.
// The facts Milla already holds are shown once; a change is proposed in the chat and saved only
// when the client approves it; every approved change raises the version and is kept in history.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@kind/db', () => ({ db: {} }))
import { readFileSync } from 'fs'
import { join } from 'path'
import { businessFromRows, mergeBusinessChange, cleanBusinessChange, BUSINESS_KEYS } from './client-business'
import { offerDigestLines } from './client-offer'

const PITCH = {
  product: 'Scheduling and job-tracking software for field-service teams.',
  pain_points: 'Old pains from the Brief.',
  differentiators: 'One app.',
  bad_fit: 'No councils.',
  proof_all: [{ claim: 'Acme cut no-shows', permitted: false }],
  offer: { problems: 'Engineers booked from spreadsheets.', impact: 'Coordinators lose hours.', roi: '', roi_may_quote: false, solution: 'Scheduling, tracking and sign-off in one app.', answered_at: '2026-09-20T10:00:00Z', source: 'milla_offer_card' },
}
const ICP = { industries: ['Facilities Services'], company_sizes: ['51–200'], job_titles: ['Operations Director'], geographies: ['United Kingdom'] }

describe('what the client sees is what Milla holds', () => {
  it('reads every fact from the store the email writer reads, and the market from the live targeting', () => {
    const b = businessFromRows(PITCH, ICP, '2026-09-20T10:00:00Z')
    expect(b.facts).toEqual({
      sells: PITCH.product, problems: PITCH.offer.problems, impact: PITCH.offer.impact,
      answer: PITCH.offer.solution, result: '', not_fit: PITCH.bad_fit,
    })
    expect(b.resultMayQuote).toBe(false)
    expect(b.market).toBe('Facilities Services · 51–200 staff · United Kingdom')
    expect(b.buyers).toBe('Operations Director')
    expect(b.version).toBe(1)
  })
  it('the problems fall back to the Brief when the offer questions were never answered', () => {
    expect(businessFromRows({ pain_points: 'From the Brief' }, null, null).facts.problems).toBe('From the Brief')
  })
  it('nothing held → version 0, every fact empty (never invented)', () => {
    const b = businessFromRows(null, null, null)
    expect(b.version).toBe(0)
    expect(Object.values(b.facts).every(v => v === '')).toBe(true)
  })
})

describe('an approved change lands where the email writer reads it, and nothing else moves', () => {
  const at = '2026-10-03T12:00:00Z'
  it('each fact writes its own place and keeps every other field', () => {
    expect(mergeBusinessChange(PITCH, { key: 'sells', value: 'New product' }, at).product).toBe('New product')
    expect((mergeBusinessChange(PITCH, { key: 'impact', value: 'New impact' }, at).offer as Record<string, unknown>).impact).toBe('New impact')
    expect((mergeBusinessChange(PITCH, { key: 'answer', value: 'New answer' }, at).offer as Record<string, unknown>).solution).toBe('New answer')
    expect(mergeBusinessChange(PITCH, { key: 'not_fit', value: 'No charities' }, at).bad_fit).toBe('No charities')
    const m = mergeBusinessChange(PITCH, { key: 'sells', value: 'New product' }, at)
    expect(m.differentiators).toBe(PITCH.differentiators)
    expect(m.proof_all).toEqual(PITCH.proof_all)
    expect((m.offer as Record<string, unknown>).answered_at).toBe(PITCH.offer.answered_at)
  })
  it('a new problem replaces BOTH places, so the writer is never handed the old one beside it', () => {
    const m = mergeBusinessChange(PITCH, { key: 'problems', value: 'Jobs at risk are invisible.' }, at)
    expect(m.pain_points).toBe('Jobs at risk are invisible.')
    expect((m.offer as Record<string, unknown>).problems).toBe('Jobs at risk are invisible.')
  })
  it('🛑 a result is quoted only with the tick — the writer never sees it without one', () => {
    const no = mergeBusinessChange(PITCH, { key: 'result', value: 'Cut missed visits by a third' }, at)
    expect(offerDigestLines(no).join(' ')).not.toContain('Cut missed visits')
    const yes = mergeBusinessChange(PITCH, { key: 'result', value: 'Cut missed visits by a third', mayQuote: true }, at)
    expect(offerDigestLines(yes).join(' ')).toContain('Cut missed visits by a third')
  })
  it('the new answer reaches the writer', () => {
    const m = mergeBusinessChange(PITCH, { key: 'answer', value: 'One live view of every job' }, at)
    expect(offerDigestLines(m).join(' ')).toContain('One live view of every job')
  })
  it('every approval raises the version and keeps the before and after', () => {
    const one = mergeBusinessChange(PITCH, { key: 'sells', value: 'A' }, at)
    const two = mergeBusinessChange(one, { key: 'impact', value: 'B' }, '2026-10-03T12:05:00Z')
    const p = two.profile as { version: number; approved_at: string; history: { version: number; key: string; before: string; after: string }[] }
    expect(p.version).toBe(3)
    expect(p.approved_at).toBe('2026-10-03T12:05:00Z')
    expect(p.history.map(h => [h.version, h.key, h.before, h.after])).toEqual([
      [2, 'sells', PITCH.product, 'A'], [3, 'impact', PITCH.offer.impact, 'B'],
    ])
  })
})

describe('what a change may be', () => {
  it('only the six facts; a fact cannot be emptied, except the result', () => {
    expect([...BUSINESS_KEYS]).toEqual(['sells', 'problems', 'impact', 'answer', 'result', 'not_fit'])
    expect(cleanBusinessChange({ key: 'pitch', value: 'x', base_version: 1 })).toBeNull()
    expect(cleanBusinessChange({ key: 'sells', value: '   ', base_version: 1 })).toBeNull()
    expect(cleanBusinessChange({ key: 'result', value: '', base_version: 1 })).toEqual({ key: 'result', value: '', mayQuote: false, baseVersion: 1 })
    expect(cleanBusinessChange({ key: 'sells', value: 'x', base_version: 'one' })).toBeNull()
  })
  it('a permission is only ever an explicit true', () => {
    expect(cleanBusinessChange({ key: 'result', value: 'r', may_quote: 'yes', base_version: 0 })?.mayQuote).toBe(false)
    expect(cleanBusinessChange({ key: 'result', value: 'r', may_quote: true, base_version: 0 })?.mayQuote).toBe(true)
  })
})

describe('wired in, and approved emails are untouched', () => {
  const lib = readFileSync(join(__dirname, 'client-business.ts'), 'utf8')
  const route = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')
  const page = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/icp/page.tsx'), 'utf8')
  const conv = readFileSync(join(__dirname, '../../../portal/src/components/milla/MillaConversation.tsx'), 'utf8')
  it('🛑 the change touches only the business facts — never a programme, an enrolment or an email', () => {
    expect(lib).not.toMatch(/from\('(programmes|figsy_enrollments|figsy_sequences|sent_emails)'\)/)
    expect(lib).toContain(".from('figsy_knowledge')")
  })
  it('🛑 a change made against an older version is refused, not written over', () => {
    expect(lib).toMatch(/baseVersion !== current\.version[\s\S]{0,200}stale/)
    expect(route).toMatch(/myProgrammeRouter\.post\('\/business\/change'[\s\S]{0,900}status\(409\)/)
  })
  it('the page shows the section, and the ONLY save is the client pressing approve in the chat', () => {
    expect(page).toContain('data-testid="your-business"')
    expect(page).toContain("'/my/programme/business'")
    expect(page).not.toContain('/my/programme/business/change')
    expect(conv).toContain("'/my/programme/business/change'")
    expect(conv).toMatch(/onClick=\{approveBusinessDraft\}[\s\S]{0,200}Approve this change/)
  })
})
