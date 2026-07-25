import { describe, it, expect } from 'vitest'
import { detokenise, fillTokens, stepDays } from './sequence-tokens'

const LEAD = { first_name: 'Alex', last_name: 'Morgan', job_title: 'Head of Operations', company: 'Nandos Logistics' }

describe('detokenise', () => {
  it('turns one prospect’s email back into a template', () => {
    const written = 'Hi Alex — saw Nandos Logistics is hiring. As Head of Operations you probably feel it. — Alex'
    expect(detokenise(written, LEAD)).toBe(
      'Hi {{first_name}} — saw {{company}} is hiring. As {{job_title}} you probably feel it. — {{first_name}}',
    )
  })

  it('replaces the longest value first so a full name is not shredded', () => {
    // "Morgan" also appears inside "Alex Morgan"; company must not swallow the name either.
    const lead = { first_name: 'Morgan', last_name: 'Morganson', company: 'Morgan Freight' }
    expect(detokenise('Morgan Freight, hi Morganson', lead)).toBe('{{company}}, hi {{last_name}}')
  })

  it('skips one-character values rather than shredding the copy', () => {
    // A lead legitimately recorded as first_name "A" must not turn every "A" into a token.
    expect(detokenise('A quick note about Acme', { first_name: 'A', company: 'Acme' }))
      .toBe('A quick note about {{company}}')
  })

  it('leaves copy with nothing to match untouched', () => {
    expect(detokenise('No personal details in here.', LEAD)).toBe('No personal details in here.')
  })
})

describe('fillTokens', () => {
  it('is the exact inverse of detokenise for the same lead', () => {
    const written = 'Hi Alex, quick one about Nandos Logistics.'
    expect(fillTokens(detokenise(written, LEAD), LEAD)).toBe(written)
  })

  it('tolerates whitespace and casing an operator will actually type', () => {
    expect(fillTokens('Hi {{ First_Name }} at {{COMPANY}}', LEAD)).toBe('Hi Alex at Nandos Logistics')
  })

  it('falls back to something sendable when a field is missing', () => {
    expect(fillTokens('Hi {{first_name}}, as {{job_title}} at {{company}}…', {}))
      .toBe('Hi there, as their role at their company…')
  })

  it('fills the sender from the signer, then the company name', () => {
    expect(fillTokens('— {{sender_name}}', LEAD, { signer_name: 'Jacques', company_name: 'M&V' })).toBe('— Jacques')
    expect(fillTokens('— {{sender_name}}', LEAD, { company_name: 'M&V' })).toBe('— M&V')
  })

  it('leaves an unknown token visible instead of silently blanking it', () => {
    // A visible {{discount_code}} in the preview is a bug the operator can catch; an empty
    // gap in the sentence is one they cannot.
    expect(fillTokens('Use {{discount_code}} before Friday', LEAD)).toBe('Use {{discount_code}} before Friday')
  })
})

describe('stepDays', () => {
  it('starts at day 0 and accumulates each wait', () => {
    expect(stepDays([{ wait_days: 0 }, { wait_days: 4 }, { wait_days: 7 }])).toEqual([0, 4, 11])
  })

  it('defaults a missing wait to 3 days for follow-ups, 0 for the first touch', () => {
    expect(stepDays([{}, {}, {}])).toEqual([0, 3, 6])
  })

  it('treats junk as no wait rather than NaN', () => {
    expect(stepDays([{ wait_days: 0 }, { wait_days: null }])).toEqual([0, 3])
  })
})
