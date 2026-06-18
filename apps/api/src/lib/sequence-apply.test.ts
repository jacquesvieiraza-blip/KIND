import { describe, it, expect } from 'vitest'
import { applyTokens, emailSteps, buildDraftFromSequence, emailWaitDays, type SequenceStep } from './sequence-apply'

const lead = { first_name: 'Lerato', last_name: 'Dlamini', company: 'Yoco', job_title: 'Head of Sales', industry: 'Fintech' }

describe('applyTokens', () => {
  it('substitutes known tokens (case/space tolerant)', () => {
    expect(applyTokens('Hi {{first_name}} at {{ COMPANY }}', lead)).toBe('Hi Lerato at Yoco')
  })
  it('falls back to "there" for a missing first name, "" for others', () => {
    expect(applyTokens('Hi {{first_name}}, re {{company}}', { first_name: '', company: '' })).toBe('Hi there, re ')
  })
  it('never leaves a raw placeholder', () => {
    expect(applyTokens('{{unknown_token}}', lead)).toBe('')
  })
  it('supports sender_company', () => {
    expect(applyTokens('We are {{sender_company}}', lead, 'K.I.N.D')).toBe('We are K.I.N.D')
  })
})

describe('emailSteps', () => {
  it('keeps only email steps, in order', () => {
    const steps: SequenceStep[] = [
      { channel: 'email', subject: 'a', body: 'b' },
      { channel: 'linkedin', body: 'x' },
      { channel: 'email', subject: 'c', body: 'd' },
    ]
    expect(emailSteps(steps).map(s => s.subject)).toEqual(['a', 'c'])
  })
})

describe('buildDraftFromSequence', () => {
  it('maps up to 3 email steps into step1/2/3 with tokens applied', () => {
    const steps: SequenceStep[] = [
      { channel: 'email', subject: 'Hi {{first_name}}', body: 'About {{company}}', wait_days: 0 },
      { channel: 'linkedin', body: 'connect' },
      { channel: 'email', subject: 'Following up', body: 'Re {{company}}', wait_days: 4 },
    ]
    const draft = buildDraftFromSequence(steps, lead)!
    expect(draft.step1).toEqual({ subject: 'Hi Lerato', body: 'About Yoco' })
    expect(draft.step2).toEqual({ subject: 'Following up', body: 'Re Yoco' })
    expect(draft.step3).toEqual({ subject: '', body: '' }) // unused slot stays empty → engine skips it
  })
  it('returns null when there are no usable email steps', () => {
    expect(buildDraftFromSequence([{ channel: 'linkedin', body: 'x' }], lead)).toBeNull()
    expect(buildDraftFromSequence([{ channel: 'email', subject: '', body: '' }], lead)).toBeNull()
  })
  it('caps at 3 email steps', () => {
    const steps: SequenceStep[] = Array.from({ length: 5 }, (_, i) => ({ channel: 'email' as const, subject: `s${i}`, body: `b${i}` }))
    const draft = buildDraftFromSequence(steps, lead)!
    expect([draft.step1.subject, draft.step2.subject, draft.step3.subject]).toEqual(['s0', 's1', 's2'])
  })
})

describe('emailWaitDays', () => {
  it('returns clamped, rounded wait days per email step', () => {
    const steps: SequenceStep[] = [
      { channel: 'email', subject: 'a', body: 'b', wait_days: 0 },
      { channel: 'email', subject: 'c', body: 'd', wait_days: 4.4 },
      { channel: 'email', subject: 'e', body: 'f', wait_days: -2 },
    ]
    expect(emailWaitDays(steps)).toEqual([0, 4, 0])
  })
})
