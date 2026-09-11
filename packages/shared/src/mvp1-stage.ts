// ═══════════════════════════════════════════════════════════════════════════════════════
// MVP1 — THE SIX VISIBLE STAGES. One vocabulary, one projection, both consoles.
//
// 🛑 WHY THIS FILE EXISTS (C41). The stage a client was "at" was rendered from THREE places
// with THREE vocabularies: `MILLA_STAGES` (seven) in the portal, `LIFECYCLE_STAGES` (eight)
// in the admin, and a hand-written strip inside the Vida workspace. One client could be at
// a different stage depending on which screen was open — DRAFT said `Proof` on Milla and
// `recommendation` on Vida until somebody noticed and fixed one of them by hand. The founder
// approved six visible stages per console; this is where that mapping lives, once.
//
// ⚠️ A PROJECTION, NOT A SECOND STATE MACHINE. Nothing here decides anything. It reads the
// engine truth that already exists (`programmes.status`, the lifecycle verdict) and answers
// "what does the ribbon print?". It stores nothing, writes nothing, and has no authority.
// The MVP1 rule is explicit: Milla and Vida read ONE canonical truth and the six-stage UI is
// a projection of it. The moment this file starts deciding rather than describing, it has
// become the competing authority it was written to delete.
//
// ⚠️ THE TWO SIXES ARE POSITIONALLY IDENTICAL, and that is load-bearing. Milla stage N and
// Vida stage N are the same point in one client's journey:
//
//     1 Brief      1 Brief
//     2 Proof      2 Proof
//     3 Programme  3 Prepare      ← client chooses/pays; operator watches preparation
//     4 Approval   4 Ready        ← the same frozen package, two readers
//     5 Results    5 Run          ← the same delivery, two readers
//     6 Complete   6 Complete
//
// So an operator on the phone to a client is never describing a differently-numbered view of
// the same fact. `mvp1-stage.test.ts` asserts that correspondence, because adding a stage to
// one side only is the easiest way to break it.
//
// ⚠️ THERE IS NO VISIBLE "Review" STAGE AND NO VISIBLE "Sourcing" STAGE. Both exist in the
// engine and both remain there. A review hold is an OPERATOR exception on a delivering
// programme — the client's screen still says Results. Sourcing is preparation the client is
// told about in words ("we are preparing your programme") while their ribbon stays at
// Programme, because there is nothing to approve until the frozen package exists.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { millaStage, type MillaStage, type EngineProgrammeStatus } from './programme-stage'

/** The six stages the client sees. Index + 1 is the number the ribbon prints. */
export const MVP1_MILLA_STAGES = [
  'Brief', 'Proof', 'Programme', 'Approval', 'Results', 'Complete',
] as const
export type Mvp1MillaStage = (typeof MVP1_MILLA_STAGES)[number]

/** The six stages the operator sees. Same six positions, operator words. */
export const MVP1_VIDA_STAGES = [
  'Brief', 'Proof', 'Prepare', 'Ready', 'Run', 'Complete',
] as const
export type Mvp1VidaStage = (typeof MVP1_VIDA_STAGES)[number]

/**
 * The eight engine lifecycle stages, mirrored here so this package stays dependency-free.
 *
 * ⚠️ MIRRORED, NOT RE-DECLARED AS TRUTH. `LIFECYCLE_STAGES` in `apps/api` remains the
 * definition; this is a structural copy so `@kind/shared` does not have to import the API.
 * `mvp1-stage.test.ts` iterates the REAL `LIFECYCLE_STAGES` through `mvp1VidaStage`, so the
 * two cannot drift without a red test.
 */
export type EngineLifecycleStage =
  | 'signup' | 'proof' | 'recommendation' | 'sourcing'
  | 'approval' | 'live' | 'review' | 'completion'

/** What the client's ribbon prints, given the canonical engine truth. */
export type Mvp1MillaStageInput = {
  /**
   * ⚠️ THE BRIEF GATE. Eleven data facts collected AND the client's explicit confirmation.
   * Confirmation is NOT the eleventh fact — it is the separate step that follows all eleven,
   * and it is what starts Proof.
   *
   * 🛑 FAIL CLOSED. Undefined means "not confirmed", never "assume yes". A client whose
   * confirmation we cannot read has not confirmed, and showing them Proof would say we are
   * spending against a brief they never agreed.
   */
  briefConfirmed?: boolean
  /** null when the client has no programme row at all. */
  status: EngineProgrammeStatus | null
  /** A review hold is OPEN. An operator exception; it does not move the client's stage. */
  reviewOpen?: boolean
  /** The client said their Proof examples are right (`clients.proof_completed_at`). */
  proofComplete?: boolean
}

/**
 * ⚠️ THE SEVEN LEGACY STAGES COLLAPSE TO FIVE HERE — Brief is added in front, and the
 * mapping is total by construction (`Record<MillaStage, …>` is a compile error if a stage is
 * missed, which is the guard `switch` without `never` does not give you).
 */
const MILLA_SIX: Record<MillaStage, Mvp1MillaStage> = {
  Proof:          'Proof',
  Recommendation: 'Programme',
  Sourcing:       'Programme',
  Approval:       'Approval',
  Live:           'Results',
  Review:         'Results',
  Completion:     'Complete',
}

export function mvp1MillaStage(input: Mvp1MillaStageInput): Mvp1MillaStage {
  // Brief outranks everything, because it is the only stage that exists before the engine
  // has an opinion. It is checked FIRST and it is checked strictly.
  if (input.briefConfirmed !== true) return 'Brief'
  return MILLA_SIX[millaStage({
    status: input.status,
    reviewOpen: input.reviewOpen,
    proofComplete: input.proofComplete,
  })]
}

/**
 * ⚠️ TOTAL BY CONSTRUCTION, same reason. `recommendation` and `sourcing` both land on
 * `Prepare`: the operator has no action while the client decides and pays, and none while
 * preparation runs by itself, so one operator stage covers both. `review` lands on `Run`
 * because a review hold is an exception inside delivery, not a place in the journey.
 */
const VIDA_SIX: Record<EngineLifecycleStage, Mvp1VidaStage> = {
  signup:         'Brief',
  proof:          'Proof',
  recommendation: 'Prepare',
  sourcing:       'Prepare',
  approval:       'Ready',
  live:           'Run',
  review:         'Run',
  completion:     'Complete',
}

export function mvp1VidaStage(stage: EngineLifecycleStage): Mvp1VidaStage {
  return VIDA_SIX[stage]
}

/**
 * The 1-based number the ribbon prints, for either console.
 *
 * ⚠️ ONE HELPER FOR BOTH, so a ribbon cannot compute its own index from a local array and
 * drift by one. Returns 0 for an unknown value rather than -1 + 1 = 0 by accident — an
 * unknown stage has no number and the caller must not print one.
 */
export function mvp1StageNumber(stage: Mvp1MillaStage | Mvp1VidaStage): number {
  const m = (MVP1_MILLA_STAGES as readonly string[]).indexOf(stage)
  if (m >= 0) return m + 1
  const v = (MVP1_VIDA_STAGES as readonly string[]).indexOf(stage)
  return v >= 0 ? v + 1 : 0
}
