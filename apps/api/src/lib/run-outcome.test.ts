import { describe, it, expect } from 'vitest'
import { deriveRunStatus, runOutcomeMessage } from './run-outcome'

describe('deriveRunStatus', () => {
  it('quota refused always wins, even with a demo client', () => {
    expect(deriveRunStatus(true, 0, true)).toBe('quota_exhausted')
    expect(deriveRunStatus(false, 0, true)).toBe('quota_exhausted')
  })
  it('demo (not quota-refused) → demo regardless of count', () => {
    expect(deriveRunStatus(true, 0, false)).toBe('demo')
    expect(deriveRunStatus(true, 5, false)).toBe('demo')
  })
  it('real client with leads → served', () => {
    expect(deriveRunStatus(false, 12, false)).toBe('served')
  })
  it('real client, budget available but zero returned → no_match (widen ICP)', () => {
    // ⛓️ 26 Aug — the trust argument is now REQUIRED and has no default. "Zero returned"
    // only means "widen your ICP" when the search actually COMPLETED, so the completion
    // fact is stated here rather than assumed. An unfinished search reaching this same
    // zero is `failed`, and telling those two apart is the whole point of the argument.
    expect(deriveRunStatus(false, 0, false, false, true)).toBe('no_match')
  })
})

describe('runOutcomeMessage', () => {
  it('quota_exhausted reassures nothing of theirs was spent, never blames the ICP', () => {
    // ⛓️ 18 Sep (J12-C4 · PV 09 B) — ~~`expect(m).toMatch(/credits are untouched/i)`~~.
    //
    // 🛑 THE REASSURANCE IS KEPT AND ITS SUBJECT IS CORRECTED. R124 (16 Sep, founder-locked):
    // *"299/4 is gone. out. we are on the programme. all clients."* — so a client reassured
    // about their CREDITS is being reassured about a wallet the product no longer has, which
    // R94 had already named as one of *"three false claims in one card."* What the client is
    // owed is the same promise about the thing they DO have: their programme volume, which
    // this path genuinely releases in full.
    const m = runOutcomeMessage('quota_exhausted', 0)
    expect(m).toMatch(/none of your programme volume has been used/i)
    expect(m, 'the retired economics are back in front of a client').not.toMatch(/credit|wallet/i)
    expect(m).not.toMatch(/widen/i)
  })
  it('no_match tells the client to widen the ICP', () => {
    expect(runOutcomeMessage('no_match', 0)).toMatch(/widen/i)
  })
  it('served reports the real count with correct pluralisation', () => {
    expect(runOutcomeMessage('served', 1)).toBe('Sourced 1 lead.')
    expect(runOutcomeMessage('served', 3)).toBe('Sourced 3 leads.')
  })
})
