// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C2 · THE PROOF WORDS COME FROM THE RECORDED STATE, ON BOTH SURFACES
//
// ── THE DEFECT: THE DESK'S WORD COMES FROM A CLOCK ──────────────────────────────────────
//
// `proofWaitState` is the shared rule both surfaces use, and its whole vocabulary is:
//
//     type ProofWaitState = 'none' | 'finding' | 'recovery'
//
// Three words for six recorded states. Two consequences, and both are things the product
// says out loud to a client:
//
//   ① A RECORDED FAILURE IS INVISIBLE. `hasTerminalOutcome` collapses EVERY terminal
//      outcome to `'none'` — "nothing is happening" — so a run the server recorded as
//      `failed` and a run that completed perfectly produce the same desk state. The desk
//      then has to infer which from lead counts and message prose.
//   ② `'recovery'` IS DERIVED FROM A TIMER, not from a fact:
//          `input.now - input.serverStartedAt > PROOF_WAIT_MS ? 'recovery' : 'finding'`
//      So a run that FAILED at second 3 is described as "finding your matches" for the rest
//      of the bound, and a run that is genuinely still going is described as recovered the
//      instant the bound passes. The clock is asked a question only the record can answer.
//
// ③ AND `stuck` HAS NO PATH TO EITHER SURFACE. J5-C1 gave the run an owner whose detector
//    marks it `stuck`; nothing carries that to the client, so the most important state — we
//    know this is broken and a human has been told — is the one the desk cannot say.
//
// ── WHAT LR 6 REQUIRES ──────────────────────────────────────────────────────────────────
//
// Started / finding / failed / released / needs-review / stuck, each from the RECORDED
// transition, on Milla AND Vida. A derived-on-read status is exactly the class of defect
// that let the desk claim a search was running against a row that said otherwise.
//
// ⚠️ THE CLOCK IS NOT DELETED — IT IS DEMOTED. Where nothing is recorded (a claim the
// summary has not caught up with, a row from before ownership existed) the bounded poll is
// still the only thing there is. It must never outrank a record.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { proofWaitState, PROOF_WAIT_MS, type ProofWaitInput } from './proof-start'

/** A client who claimed a pass one minute ago, server reachable, nothing recorded yet. */
const WAITING: ProofWaitInput = {
  hasTerminalOutcome: false,
  pendingCount: 0,
  revealedCount: 0,
  server: 'ok',
  proofPassesDone: 1,
  serverStartedAt: 1_000_000,
  urlFinding: false,
  now: 1_000_000 + 60_000,
  pollExhausted: false,
}

/** Past the bound, so the TIMER alone would say 'recovery'. */
const PAST_BOUND: ProofWaitInput = { ...WAITING, now: 1_000_000 + PROOF_WAIT_MS + 60_000 }

describe('J5-C2 · a recorded state outranks the clock', () => {
  it('🛑 a run recorded FAILED says failed — not "finding" because the bound has not passed', () => {
    const s = proofWaitState({ ...WAITING, recordedRunState: 'failed' })
    expect(s, 'a failed run was described as still searching').toBe('failed')
  })

  it('🛑 a run recorded STUCK says stuck — the one state J5-C1 added and nothing carried', () => {
    const s = proofWaitState({ ...WAITING, recordedRunState: 'stuck' })
    expect(s, 'a stuck run is invisible to the client').toBe('stuck')
  })

  it('🛑 a recorded failure is not erased by the bound passing either', () => {
    const s = proofWaitState({ ...PAST_BOUND, recordedRunState: 'failed' })
    expect(s, 'the clock overwrote a recorded failure with the generic recovery state').toBe('failed')
  })

  it('a run recorded STARTED is `finding` — the honest present tense, from the record', () => {
    expect(proofWaitState({ ...WAITING, recordedRunState: 'started' })).toBe('finding')
  })

  it('a run recorded COMPLETED ends the wait', () => {
    expect(proofWaitState({ ...WAITING, recordedRunState: 'completed' })).toBe('none')
  })

  it('🛑 RELEASED is its own word — the pass came back, which is not a failure and not a set', () => {
    // `terminalForRunStatus` returns `released` when a run delivered nothing and the pass was
    // RETURNED. Telling the client "failed" would be wrong (nothing was consumed) and telling
    // them "none" would be wrong (no set arrived).
    expect(proofWaitState({ ...WAITING, recordedOutcome: 'released' })).toBe('released')
  })

  it('🛑 NEEDS-REVIEW is its own word — a human is finishing the translation', () => {
    expect(proofWaitState({ ...WAITING, needsIcpReview: true })).toBe('needs_review')
  })
})

describe('J5-C2 · the clock is demoted, not deleted', () => {
  it('with NOTHING recorded, the bounded poll still decides — that is all there is', () => {
    expect(proofWaitState(WAITING)).toBe('finding')
    expect(proofWaitState(PAST_BOUND)).toBe('recovery')
  })

  it('an unreachable server still cannot claim a state it does not know', () => {
    const s = proofWaitState({ ...WAITING, server: 'unreachable', recordedRunState: null })
    expect(['none', 'finding', 'recovery']).toContain(s)
  })

  it('🛑 F-DBREAD · a recorded state is not invented from an unreachable server', () => {
    // The surface may not upgrade "we cannot reach the server" into "your run failed".
    const s = proofWaitState({ ...WAITING, server: 'unreachable' })
    expect(s, 'an unreachable server was reported to the client as a failed run').not.toBe('failed')
    expect(s, 'an unreachable server was reported as stuck').not.toBe('stuck')
  })

  it('real leads still win — a client looking at cards is not shown a wait', () => {
    expect(proofWaitState({ ...WAITING, pendingCount: 3, recordedRunState: 'started' })).toBe('none')
  })
})

describe('J5-C2 · the vocabulary is the recorded vocabulary', () => {
  it('🛑 every recorded state the product can persist has a word', () => {
    // If `automatic_work` gains a state, or a terminal gains a value, this fails and the
    // surface has to be given a word for it rather than silently falling back to a clock.
    const states: Array<NonNullable<ProofWaitInput['recordedRunState']>> =
      ['requested', 'started', 'completed', 'failed', 'stuck']
    for (const st of states) {
      const s = proofWaitState({ ...WAITING, recordedRunState: st })
      expect(s, `recorded state "${st}" has no word on the desk`).toBeTruthy()
    }
  })
})
