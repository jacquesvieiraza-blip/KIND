// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep (I3) — ONE CLIENT, ONE STAGE, WHICHEVER SCREEN IS OPEN.
//
// ── THE PROBLEM THIS FILE IS THE GUARD FOR ──────────────────────────────────────────────
//
// Two stage derivations exist and both are legitimate:
//
//   `deriveLifecycle`  (apps/api)      — VIDA. Eight stages, exception-aware, and it knows
//                                        about Run, readiness, senders and blockers.
//   `millaStage`       (@kind/shared)  — MILLA. Seven stages, no Signup (a client in Milla is
//                                        signed up by definition), no exceptions.
//
// They are different VIEWS and that is correct. What is not correct is the two of them naming
// DIFFERENT STAGES for the same programme, which is what happened: `DRAFT` was `Proof` in Milla
// and `recommendation` in Vida, so a client who had finished Proof and chosen a target was told
// by their own screen that Milla was still finding their first examples.
//
// 🛑 THIS TEST IS THE THING THAT STOPS IT COMING BACK. Nothing else compares them: each has its
// own suite, each passes, and the disagreement lives in the gap. A table over EVERY engine
// status, asserted in both directions.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED. Vida's EXCEPTION states (`sourcing_exception`,
// `review_sender`, `blocked`) have no Milla equivalent and must not grow one — an operator's
// exception is not a stage in the client's journey. The agreement is about the STAGE the
// programme has reached, which is exactly the fact both screens print.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { millaStage, MILLA_STAGES, type EngineProgrammeStatus } from '@kind/shared'
import { deriveLifecycle, STAGE_LABEL, type LifecycleFacts } from './programme-lifecycle'

/** The ten engine statuses, in lifecycle order. */
const STATUSES: EngineProgrammeStatus[] = [
  'DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT', 'SOURCING_AUTHORISED', 'SOURCING',
  'READY_FOR_APPROVAL', 'APPROVED', 'LIVE', 'COMPLETED', 'CANCELLED',
]

/** A healthy programme in the given status — no exceptions, so only the stage is under test. */
function facts(status: EngineProgrammeStatus, over: Partial<NonNullable<LifecycleFacts['programme']>> = {}): LifecycleFacts {
  return {
    programme: {
      status,
      paused: false,
      approved: status === 'APPROVED' || status === 'LIVE',
      secondAuthorised: status === 'APPROVED' || status === 'LIVE',
      live: status === 'LIVE',
      run: status === 'LIVE',
      ...over,
    },
    proofStarted: true, preparationStopped: false, preparing: false,
    humanBlockers: [], readinessReady: true,
    sends: 0, repliesAwaitingDecision: 0,
    senderSendable: true, killSwitchOff: true, operatorRunEnabled: true,
    remainingEntitlement: 0, hasNewerProgramme: false, repeatDismissed: false,
  }
}

/**
 * The one table. Vida's stage on the left, Milla's on the right, for a HEALTHY programme.
 *
 * ⚠️ `APPROVED` AND `LIVE` ARE THE TWO HONEST DIVERGENCES, and they are recorded here rather
 * than asserted away:
 *
 *   APPROVED + P2 settled → Vida `live` (the operator's next act is Make Live) · Milla
 *     `Approval` (the client approved and is waiting). Both true of the same row; they answer
 *     different questions — "what do I press" and "what am I waiting for".
 *   LIVE + Run + no sends → Vida `live` · Milla `Live`. Agree.
 *   LIVE + Run + sends    → Vida `review` · Milla `Live` (Milla moves to Review only on a
 *     review HOLD, which is a client-facing decision, not a send count).
 *
 * Everything else must agree exactly, and a change to either file that breaks a row here is
 * the drift this test exists to catch.
 */
const AGREE: Partial<Record<EngineProgrammeStatus, string>> = {
  DRAFT: 'Recommendation',
  RECOMMENDED: 'Recommendation',
  AWAITING_FIRST_PAYMENT: 'Recommendation',
  SOURCING_AUTHORISED: 'Sourcing',
  SOURCING: 'Sourcing',
  READY_FOR_APPROVAL: 'Approval',
  LIVE: 'Live',
  COMPLETED: 'Completion',
}

describe('① the two derivations name the same stage', () => {
  for (const status of Object.keys(AGREE) as EngineProgrammeStatus[]) {
    it(`${status} is ${AGREE[status]} on both screens`, () => {
      const vida = deriveLifecycle(facts(status))
      expect(STAGE_LABEL[vida.stage], `Vida puts ${status} at ${vida.stage}`).toBe(AGREE[status])
      expect(millaStage({ status }), `Milla puts ${status} elsewhere`).toBe(AGREE[status])
    })
  }

  it('🛑 DRAFT is the row this test was written for', () => {
    // Milla said `Proof` and Vida said `recommendation`, so a client who had finished Proof and
    // chosen a target in the calculator was told their examples were still being found.
    expect(millaStage({ status: 'DRAFT' }),
      'a client with a drafted programme is sent back to Proof').toBe('Recommendation')
  })
})

describe('② the two honest divergences, recorded rather than asserted away', () => {
  it('APPROVED with the second payment settled: Vida says Live, Milla says Approval', () => {
    // Both are true of the same row and they answer different questions — "what do I press"
    // and "what am I waiting for". Written down so a future reader does not treat it as drift.
    const vida = deriveLifecycle(facts('APPROVED'))
    expect(STAGE_LABEL[vida.stage]).toBe('Live')
    expect(millaStage({ status: 'APPROVED' })).toBe('Approval')
  })

  it('APPROVED with the second payment OUTSTANDING: both say Approval', () => {
    const vida = deriveLifecycle(facts('APPROVED', { secondAuthorised: false }))
    expect(STAGE_LABEL[vida.stage]).toBe('Approval')
    expect(millaStage({ status: 'APPROVED' })).toBe('Approval')
  })

  it('LIVE with sends: Vida says Review, Milla says Live until a review HOLD is open', () => {
    const vida = deriveLifecycle({ ...facts('LIVE'), sends: 40 })
    expect(STAGE_LABEL[vida.stage]).toBe('Review')
    expect(millaStage({ status: 'LIVE' })).toBe('Live')
    expect(millaStage({ status: 'LIVE', reviewOpen: true })).toBe('Review')
  })
})

describe('③ the stage vocabularies still line up', () => {
  it('every Milla stage is one of Vida\'s eight', () => {
    const vidaLabels = new Set(Object.values(STAGE_LABEL))
    for (const s of MILLA_STAGES) {
      expect(vidaLabels.has(s), `Milla has a stage Vida does not: ${s}`).toBe(true)
    }
  })

  it('Signup is the one Vida has and Milla does not, and that is deliberate', () => {
    // A client looking at Milla has, by definition, signed up. A Signup stage in the client's
    // own workspace would be a screen telling somebody they have not arrived where they are.
    const extra = Object.values(STAGE_LABEL).filter(l => !(MILLA_STAGES as readonly string[]).includes(l))
    expect(extra).toEqual(['Signup'])
  })

  it('🛑 no engine status is left without a stage on either screen', () => {
    for (const status of STATUSES) {
      expect(MILLA_STAGES, `Milla has no stage for ${status}`).toContain(millaStage({ status }))
      const v = deriveLifecycle(facts(status))
      expect(STAGE_LABEL[v.stage], `Vida has no label for ${status}`).toBeTruthy()
    }
  })
})

describe('④ a client with no programme is not sent backwards either', () => {
  it('Proof finished, no programme yet: both say Recommendation', () => {
    const vida = deriveLifecycle({
      ...facts('DRAFT'), programme: null, proofCompleted: true, proofStarted: true,
    })
    expect(STAGE_LABEL[vida.stage]).toBe('Recommendation')
    expect(millaStage({ status: null, proofComplete: true })).toBe('Recommendation')
  })

  it('Proof not finished, no programme: Vida says Proof, Milla says Proof', () => {
    const vida = deriveLifecycle({ ...facts('DRAFT'), programme: null, proofStarted: true })
    expect(STAGE_LABEL[vida.stage]).toBe('Proof')
    expect(millaStage({ status: null })).toBe('Proof')
  })
})
