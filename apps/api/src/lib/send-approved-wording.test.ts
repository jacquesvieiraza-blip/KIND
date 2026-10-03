// ⚑ 3 Oct — WHAT IS SENT IS WHAT WAS APPROVED (founder: "they need to match").
// A programme email is built from the approved version at the moment it is sent, never from a
// person's stored copy, which a rewrite can miss.
import { describe, it, expect, vi } from 'vitest'
vi.mock('@kind/db', () => ({ db: {} }))
import { readFileSync } from 'fs'
import { join } from 'path'
import { approvedStepFor } from './approved-step'
import { buildDraftStepsFromSequence } from './sequence-apply'

const STEPS = [
  { channel: 'email', subject: '{{first_name}}, who is building your pipeline?', body: 'Hi {{first_name}} at {{company}}.\n\nThe Milla & Vida Team', wait_days: 3 },
  { channel: 'email', subject: 'How this actually works', body: 'Two halves.\n\nThe Milla & Vida Team', wait_days: 4 },
]
const P = { client_id: 'house', review_preparation_hash: 'v5', approved_preparation_hash: 'v5', review_preparation_snapshot: { steps: STEPS } }
const IAN = { first_name: 'Ian', last_name: 'Garrett', company: 'Phalanx', job_title: 'CEO', industry: null }

describe('a programme email is the approved version, filled in for the person', () => {
  it('step 1 is the approved wording with this person in it', () => {
    const r = approvedStepFor(P, 1, IAN, 'Milla & Vida', buildDraftStepsFromSequence as never)
    expect(r).toEqual({ ok: true, subject: 'Ian, who is building your pipeline?', body: 'Hi Ian at Phalanx.\n\nThe Milla & Vida Team' })
  })
  it('step 2 is the approved step 2', () => {
    const r = approvedStepFor(P, 2, IAN, 'Milla & Vida', buildDraftStepsFromSequence as never)
    expect(r.ok && r.subject).toBe('How this actually works')
  })
  it('🛑 a version waiting for approval is never sent — the send waits', () => {
    const r = approvedStepFor({ ...P, review_preparation_hash: 'v6' }, 1, IAN, null, buildDraftStepsFromSequence as never)
    expect(r.ok).toBe(false)
  })
  it('🛑 nothing approved, or no such step → the send waits', () => {
    expect(approvedStepFor({ ...P, approved_preparation_hash: null }, 1, IAN, null, buildDraftStepsFromSequence as never).ok).toBe(false)
    expect(approvedStepFor(P, 3, IAN, null, buildDraftStepsFromSequence as never).ok).toBe(false)
  })
})

describe('wired into the one send door', () => {
  const src = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
  it('🛑 a programme send replaces the stored copy with the approved wording, or waits', () => {
    const at = src.indexOf('programmeApprovedSend = verdict.mode === \'programme\'')
    const block = src.slice(at, at + 4000)
    expect(block).toContain('approvedProgrammeStep(enrollmentId, step, lead)')
    expect(block).toContain('subject = approved.subject')
    expect(block).toContain('body = approved.body')
    expect(block).toMatch(/if \(!approved\.ok\) \{[\s\S]{0,300}return 'deferred'/)
  })
})

describe('Vida says whether any stored copy still differs', () => {
  it('the wording route returns the count and the panel states it, 0 in green', () => {
    const route = readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8')
    expect(route).toContain("copies_differ: await (await import('../lib/approved-step')).countDifferingCopies(req.params.id)")
    const panel = readFileSync(join(__dirname, '../../../admin/src/components/vida/FounderWordingApproval.tsx'), 'utf8')
    expect(panel).toContain("Every person\\'s stored emails match this version.")
    expect(panel).toContain('They still get this version: each email is built from it when it is sent.')
  })
})
