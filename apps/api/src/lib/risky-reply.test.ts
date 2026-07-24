import { describe, it, expect } from 'vitest'
import { isRiskyReply } from './reply-risk'

// E7 — the legal/reputational risk filter that escalates a reply to a human. These guard the
// two failure modes that matter: a genuine legal/complaint reply MUST trip (false negatives
// are the dangerous ones), and an ordinary reply must NOT (false positives cry wolf).
describe('isRiskyReply (E7 escalation filter)', () => {
  it('trips on legal-threat replies', () => {
    expect(isRiskyReply('I will be contacting my lawyer about this.')).toBe(true)
    expect(isRiskyReply('Stop or I will take legal action.')).toBe(true)
    expect(isRiskyReply('This is a cease and desist notice.')).toBe(true)
    expect(isRiskyReply('You are harassing me and I will sue you.')).toBe(true)
  })

  it('trips on data-protection / complaint replies', () => {
    expect(isRiskyReply('This is a GDPR violation, remove my data.')).toBe(true)
    expect(isRiskyReply('I am filing a complaint to the ICO.')).toBe(true)
    expect(isRiskyReply('This breaches POPIA and I will report you.')).toBe(true)
  })

  it('does NOT trip on ordinary replies (no crying wolf)', () => {
    expect(isRiskyReply('Thanks, not interested right now.')).toBe(false)
    expect(isRiskyReply("I'm not the right person — try Sarah in ops.")).toBe(false)
    expect(isRiskyReply('Sounds great, can we book a call next week?')).toBe(false)
    expect(isRiskyReply('I assume you meant our London office.')).toBe(false) // "assume" ≠ "sue"
    expect(isRiskyReply('')).toBe(false)
    expect(isRiskyReply(null)).toBe(false)
  })
})
