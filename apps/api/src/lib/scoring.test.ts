import { describe, it, expect } from 'vitest'
import { unscoredOnFailure } from './scoring-failure'

// #477 — the crash path (and the no-results path) must NEVER fabricate a score. Before
// this fix, an AI throw stamped score:50 / estimated_deal_value_usd:5000 / status:'scored',
// so a fake "qualified" lead was delivered and charged. The shared failure payload is the
// single source of truth for "we could not score this" — assert it fakes nothing.
describe('unscoredOnFailure (#477 — never fake a score on failure)', () => {
  const payload = unscoredOnFailure()

  it('leaves the score NULL — never a fabricated 50', () => {
    expect(payload.score).toBeNull()
  })

  it('writes NO fabricated deal value — never $5,000', () => {
    expect(payload.estimated_deal_value_usd).toBeNull()
  })

  it('does NOT flip the lead to "scored" (so it is not delivered/charged)', () => {
    expect('status' in payload).toBe(false)
  })

  it('leaves scored_at NULL so the rescore job picks it up again', () => {
    expect(payload.scored_at).toBeNull()
  })

  it('marks the reasoning distinctly as a failure, not a real score', () => {
    expect(payload.score_reasoning).toMatch(/^SCORING_FAILED/)
  })
})
