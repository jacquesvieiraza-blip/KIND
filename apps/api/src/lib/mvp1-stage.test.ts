// ═══════════════════════════════════════════════════════════════════════════════════════
// MVP1 SIX-STAGE PROJECTION — the one vocabulary Milla and Vida both read.
//
// 🛑 THIS IS THE TEST FOR C41. Before it, the stage ribbon was rendered from THREE separate
// call sites with three separate vocabularies: `MILLA_STAGES` (seven) in the portal,
// `LIFECYCLE_STAGES` (eight) in the admin, and a hand-written strip inside the Vida
// workspace. One client could therefore be at a different stage depending on which screen
// was open — which is exactly what happened with DRAFT (Milla said Proof, Vida said
// Recommendation) and was fixed once, in one direction, by hand.
//
// ⚠️ THIS IS A PROJECTION, NOT A SECOND STATE MACHINE. It derives six visible stages from
// the engine truth that already exists. It stores nothing, decides nothing, and has no
// authority of its own — per the MVP1 build rule that Milla and Vida must read ONE canonical
// truth and the six-stage UI is a projection of it. If this file ever starts *deciding*
// rather than *describing*, that is the defect.
//
// ⚠️ THE TWO SIXES ARE POSITIONALLY IDENTICAL. Milla stage N and Vida stage N are the same
// point in one client's journey — Approval is Ready, Results is Run — so an operator and a
// client are never looking at differently-numbered views of the same fact. That property is
// asserted below, because it is easy to break by adding a stage to one side only.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  MVP1_MILLA_STAGES, MVP1_VIDA_STAGES,
  mvp1MillaStage, mvp1VidaStage,
  type Mvp1MillaStage, type Mvp1VidaStage,
  MILLA_STAGES, type MillaStage, type EngineProgrammeStatus,
} from '@kind/shared'
import { LIFECYCLE_STAGES, type LifecycleStage } from './programme-lifecycle'

describe('① the two six-stage vocabularies', () => {
  it('Milla shows exactly the six founder-approved stages, in order', () => {
    expect(MVP1_MILLA_STAGES).toEqual(
      ['Brief', 'Proof', 'Programme', 'Approval', 'Results', 'Complete'],
    )
  })

  it('Vida shows exactly the six founder-approved stages, in order', () => {
    expect(MVP1_VIDA_STAGES).toEqual(
      ['Brief', 'Proof', 'Prepare', 'Ready', 'Run', 'Complete'],
    )
  })

  it('⚠️ BOTH ARE SIX — a seventh on either side is the defect C41 describes', () => {
    expect(MVP1_MILLA_STAGES).toHaveLength(6)
    expect(MVP1_VIDA_STAGES).toHaveLength(6)
  })

  it('stage 1 and stage 6 are shared words, because they are the same two moments', () => {
    expect(MVP1_MILLA_STAGES[0]).toBe(MVP1_VIDA_STAGES[0])
    expect(MVP1_MILLA_STAGES[5]).toBe(MVP1_VIDA_STAGES[5])
  })
})

describe('② Milla — the client projection', () => {
  // ⚠️ BRIEF OUTRANKS EVERYTHING, because it is the only stage that exists before the
  // engine has an opinion at all. A client who has not confirmed their brief has no
  // programme and no Proof pass, and the six-stage ribbon must say so.
  it('an unconfirmed brief is Brief, whatever else is true', () => {
    expect(mvp1MillaStage({ briefConfirmed: false, status: null })).toBe('Brief')
    expect(mvp1MillaStage({ briefConfirmed: false, status: 'SOURCING' })).toBe('Brief')
    expect(mvp1MillaStage({ briefConfirmed: false, status: 'LIVE' })).toBe('Brief')
  })

  it('a missing briefConfirmed is treated as NOT confirmed — fail closed', () => {
    expect(mvp1MillaStage({ status: null })).toBe('Brief')
  })

  it('a confirmed brief with no programme and no finished Proof is Proof', () => {
    expect(mvp1MillaStage({ briefConfirmed: true, status: null })).toBe('Proof')
  })

  it('Proof finished but no programme yet is Programme — the calculator lives there', () => {
    expect(mvp1MillaStage({ briefConfirmed: true, status: null, proofComplete: true }))
      .toBe('Programme')
  })

  const ENGINE: ReadonlyArray<[EngineProgrammeStatus, Mvp1MillaStage]> = [
    ['DRAFT',                  'Programme'],
    ['RECOMMENDED',            'Programme'],
    ['AWAITING_FIRST_PAYMENT', 'Programme'],
    // ⚠️ SOURCING IS STILL "Programme" TO THE CLIENT. Payment 1 has been taken and we are
    // preparing; the client is told "we are preparing your programme" and there is nothing
    // for them to approve until the frozen package exists. Moving them to Approval early
    // would show an approval stage with nothing in it to approve.
    ['SOURCING_AUTHORISED',    'Programme'],
    ['SOURCING',               'Programme'],
    ['READY_FOR_APPROVAL',     'Approval'],
    ['APPROVED',               'Approval'],
    ['LIVE',                   'Results'],
    ['COMPLETED',              'Complete'],
    ['CANCELLED',              'Complete'],
  ]

  it.each(ENGINE)('engine %s projects to %s', (status, expected) => {
    expect(mvp1MillaStage({ briefConfirmed: true, status })).toBe(expected)
  })

  // ⚠️ THERE IS NO VISIBLE "Review" STAGE IN MVP1. A review hold is an OPERATOR exception;
  // the client's programme is still delivering and their screen is still Results.
  it('a review hold does not move the client off Results', () => {
    expect(mvp1MillaStage({ briefConfirmed: true, status: 'LIVE', reviewOpen: true }))
      .toBe('Results')
  })

  it('every one of the seven legacy Milla stages projects to one of the six', () => {
    for (const s of MILLA_STAGES) {
      expect(MVP1_MILLA_STAGES).toContain(mvp1MillaStageFromLegacy(s))
    }
  })
})

describe('③ Vida — the operator projection', () => {
  const LIFECYCLE: ReadonlyArray<[LifecycleStage, Mvp1VidaStage]> = [
    ['signup',         'Brief'],
    ['proof',          'Proof'],
    // ⚠️ recommendation AND sourcing ARE BOTH "Prepare". The operator has no action while
    // the client decides and pays, and none while preparation runs — one stage covers both.
    ['recommendation', 'Prepare'],
    ['sourcing',       'Prepare'],
    ['approval',       'Ready'],
    ['live',           'Run'],
    // ⚠️ A REVIEW HOLD IS AN EXCEPTION WITHIN Run, NOT A STAGE. Preview 11 shows it as a
    // Needs-you reason on a delivering programme.
    ['review',         'Run'],
    ['completion',     'Complete'],
  ]

  it.each(LIFECYCLE)('lifecycle %s projects to %s', (stage, expected) => {
    expect(mvp1VidaStage(stage)).toBe(expected)
  })

  it('every one of the eight lifecycle stages projects to one of the six', () => {
    for (const s of LIFECYCLE_STAGES) {
      expect(MVP1_VIDA_STAGES).toContain(mvp1VidaStage(s))
    }
  })
})

describe('④ the two sixes line up — one journey, two views', () => {
  // The whole point of C41: an operator and a client looking at the same client are looking
  // at the same numbered point. If these ever diverge, the ribbon lies to one of them.
  const SAME_POINT: ReadonlyArray<[EngineProgrammeStatus | null, LifecycleStage]> = [
    [null,                  'proof'],
    ['RECOMMENDED',         'recommendation'],
    ['SOURCING',            'sourcing'],
    ['READY_FOR_APPROVAL',  'approval'],
    ['LIVE',                'live'],
    ['COMPLETED',           'completion'],
  ]

  it.each(SAME_POINT)('engine %s and lifecycle %s are the same stage number', (status, stage) => {
    const milla = MVP1_MILLA_STAGES.indexOf(mvp1MillaStage({ briefConfirmed: true, status }))
    const vida = MVP1_VIDA_STAGES.indexOf(mvp1VidaStage(stage))
    expect(vida).toBe(milla)
  })

  it('signup is stage 1 on both sides', () => {
    expect(MVP1_MILLA_STAGES.indexOf(mvp1MillaStage({ briefConfirmed: false, status: null })))
      .toBe(MVP1_VIDA_STAGES.indexOf(mvp1VidaStage('signup')))
  })
})

// ── helper: exercise the legacy-stage branch of the projection ─────────────────────────
function mvp1MillaStageFromLegacy(s: MillaStage): Mvp1MillaStage {
  const byLegacy: Record<MillaStage, EngineProgrammeStatus | null> = {
    Proof: null, Recommendation: 'RECOMMENDED', Sourcing: 'SOURCING',
    Approval: 'READY_FOR_APPROVAL', Live: 'LIVE', Review: 'LIVE', Completion: 'COMPLETED',
  }
  return mvp1MillaStage({
    briefConfirmed: true,
    status: byLegacy[s],
    reviewOpen: s === 'Review',
  })
}
