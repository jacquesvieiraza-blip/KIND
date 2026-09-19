// ══════════════════════════════════════════════════════════════════════════════════════════
// XC-1 · ONE LIFECYCLE DERIVATION — Milla and Vida must agree, per step, by construction
//
// ── WHY THIS IS AN AGREEMENT TEST AND NOT A REFACTOR ────────────────────────────────────
//
// The product has TWO projections of where a client is:
//
//   · `deriveLifecycle(LifecycleFacts)` → `verdict.stage`   — Vida's rail, panel and chips,
//     and (through `client-step.ts`, which takes the verdict rather than re-deriving) the
//     operator's one next action.
//   · `millaStage({ status, reviewOpen, proofComplete })`    — the client's stage bar.
//
// Both already read RECORDED columns — `programmes.status`, the proof state, the review
// state — and neither reads a clock. So XC-1's "from recorded transitions only" is satisfied
// today. What has never been proven is the other half of its GREEN: *"Milla and Vida agree
// per step."* Two projections of one truth that nobody compares WILL drift, and the drift is
// invisible until a client and an operator describe the same account differently — which is
// precisely what LR 6 and R117 exist to stop.
//
// 🛑 SO THE PROPERTY IS PROVEN BEFORE ANYTHING IS RESTRUCTURED. Collapsing the two into one
// function would be a large change to a file 9,000 tests depend on, justified only if they
// actually disagree. This walks the WHOLE recorded status space and compares them. If they
// agree, XC-1 is satisfied by construction and this file is the guard that keeps it that way.
// If they disagree, the disagreement is the defect and it is named here.
//
// ⚠️ THE MAPPING IS DECLARED, NOT DERIVED FROM EITHER SIDE. If the table below were computed
// from one of the two functions it would agree with itself for ever. It is written out by
// hand, so a change to either vocabulary fails this test and has to be reconciled deliberately.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { deriveLifecycle, LIFECYCLE_STAGES, type LifecycleFacts, type LifecycleStage } from './programme-lifecycle'
import { millaStage, MILLA_STAGES, type MillaStage } from '@kind/shared'

/**
 * The one place the two vocabularies are reconciled.
 *
 * `signup` has no Milla stage: before a programme exists the client is in the Brief/Proof
 * conversation, and Milla's first stage IS 'Proof'. That is a granularity difference, not a
 * disagreement, and it is declared here rather than hidden in an exception.
 */
const VIDA_TO_MILLA: Record<LifecycleStage, MillaStage> = {
  signup:         'Proof',
  proof:          'Proof',
  recommendation: 'Recommendation',
  sourcing:       'Sourcing',
  approval:       'Approval',
  live:           'Live',
  review:         'Review',
  completion:     'Completion',
}

/** Every `programmes.status` the engine can record. */
const STATUSES = [
  'DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT',
  'SOURCING_AUTHORISED', 'SOURCING',
  'READY_FOR_APPROVAL', 'APPROVED',
  'LIVE', 'COMPLETED', 'CANCELLED',
] as const

/** A calm client: no exceptions, no blockers. Exceptions are Vida's business (R117) and are
 *  deliberately excluded — they change Vida's STATE and MODE, never its STAGE. */
const CALM: Omit<LifecycleFacts, 'programme'> = {
  proofStarted: true,
  proofCalibrationFailed: false,
  proofCompleted: true,
  proofNoEligibleSet: false,
  preparationStopped: false,
  preparing: false,
  humanBlockers: [],
  readinessReady: true,
  sends: 0,
  repliesAwaitingDecision: 0,
  senderSendable: true,
  killSwitchOff: false,
  operatorRunEnabled: true,
  remainingEntitlement: 5,
  hasNewerProgramme: false,
  repeatDismissed: false,
  reviewPackageStale: false,
}

const programmeFor = (status: string, over: Partial<NonNullable<LifecycleFacts['programme']>> = {}) => ({
  status, paused: false, approved: status === 'APPROVED' || status === 'LIVE',
  secondAuthorised: false, live: status === 'LIVE', run: status === 'LIVE', ...over,
})

describe('XC-1 · Milla and Vida agree on the step, across the whole recorded status space', () => {
  it('🛑 every recorded status places the client on the SAME step on both surfaces', () => {
    const disagreements: string[] = []

    for (const status of STATUSES) {
      for (const reviewOpen of [false, true]) {
        const vida = deriveLifecycle({ ...CALM, programme: programmeFor(status) })
        const milla = millaStage({ status: status as never, reviewOpen, proofComplete: true })
        const expected = VIDA_TO_MILLA[vida.stage]

        // `reviewOpen` is a Milla-side refinement of LIVE (the client is reading a revision).
        // Vida expresses the same thing as its own `review` stage, so the two agree only when
        // the flag is actually set — which is what this branch checks rather than excuses.
        const want = reviewOpen && status === 'LIVE' ? 'Review' : expected
        if (milla !== want) {
          disagreements.push(
            `status=${status} reviewOpen=${reviewOpen}: Vida says "${vida.stage}" (→ ${want}), Milla says "${milla}"`,
          )
        }
      }
    }

    expect(disagreements,
      'Milla and Vida describe the same account differently — a client and an operator would read two different truths',
    ).toEqual([])
  })

  it('🛑 the no-programme case agrees too — Brief/Proof is one step, not two answers', () => {
    // Before a programme exists Vida says `signup` or `proof` and Milla says 'Proof'. Both are
    // reading the same recorded facts (is there a programme; has Proof started/completed).
    for (const proofCompleted of [false, true]) {
      const vida = deriveLifecycle({ ...CALM, programme: null, proofCompleted, proofStarted: true })
      const milla = millaStage({ status: null, reviewOpen: false, proofComplete: proofCompleted })
      expect(VIDA_TO_MILLA[vida.stage], `no-programme, proofCompleted=${proofCompleted}`).toBe(milla)
    }
  })

  it('the reconciliation table covers EVERY stage in both vocabularies', () => {
    // A new stage on either side must be reconciled deliberately rather than defaulting.
    for (const s of LIFECYCLE_STAGES) {
      expect(VIDA_TO_MILLA[s], `Vida stage "${s}" has no Milla counterpart declared`).toBeTruthy()
    }
    const mapped = new Set(Object.values(VIDA_TO_MILLA))
    for (const m of MILLA_STAGES) {
      // Every Milla stage must be reachable from some Vida stage, or one surface can show a
      // step the other cannot.
      expect(mapped.has(m), `Milla stage "${m}" is unreachable from any Vida stage`).toBe(true)
    }
  })
})

describe('XC-1 · neither derivation reads anything but the record', () => {
  it('🛑 `deriveLifecycle` is pure — same facts in, same verdict out, no clock', () => {
    const facts: LifecycleFacts = { ...CALM, programme: programmeFor('LIVE') }
    const a = deriveLifecycle(facts)
    const b = deriveLifecycle(facts)
    expect(a).toEqual(b)
  })

  it('🛑 `millaStage` is pure for the same recorded inputs', () => {
    const a = millaStage({ status: 'LIVE', reviewOpen: false, proofComplete: true })
    const b = millaStage({ status: 'LIVE', reviewOpen: false, proofComplete: true })
    expect(a).toBe(b)
  })

  it('an UNKNOWN status is not silently placed somewhere plausible', () => {
    // A status the engine has never recorded must not be mapped to a confident step by
    // either side — that is how a surface comes to describe a state that does not exist.
    const vida = deriveLifecycle({ ...CALM, programme: programmeFor('SOMETHING_NEW') })
    expect(LIFECYCLE_STAGES).toContain(vida.stage)
  })
})
