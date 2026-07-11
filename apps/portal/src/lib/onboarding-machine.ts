/**
 * Guided onboarding tour — the step machine (#454).
 *
 * PURE, DOM-FREE logic: advance / back / skip / resume + the data-check that lets an
 * experienced client sail past steps their real data already satisfies (§7). Kept
 * separate from the React orchestrator so it's unit-testable with no DOM.
 */

import type { OnboardingStep, ProgressCheck } from './onboarding-steps'

export type OnboardingStatus = 'not_started' | 'in_progress' | 'skipped' | 'completed'

export type ProgressFlags = Partial<Record<ProgressCheck, boolean>>

export interface MachineState {
  /** index into the steps array; -1 = tour not showing. */
  index: number
  status: OnboardingStatus
  /** ids of steps the client has completed / passed. */
  completed: string[]
}

/**
 * Is this step ALREADY satisfied by real data? Only data-check steps can be
 * auto-satisfied — action / route-reached steps always need the client to act.
 */
export function isStepSatisfied(step: OnboardingStep, flags: ProgressFlags): boolean {
  if (step.completionCondition !== 'data-check' || !step.completionCheck) return false
  return flags[step.completionCheck] === true
}

/**
 * From `fromIndex`, walk FORWARD skipping any steps already satisfied by real data.
 * Returns the first index the client actually needs to act on, or steps.length when
 * everything ahead is already done (→ tour complete).
 */
export function nextActionableIndex(
  steps: OnboardingStep[],
  flags: ProgressFlags,
  fromIndex: number,
): number {
  let i = Math.max(0, fromIndex)
  while (i < steps.length && isStepSatisfied(steps[i], flags)) i++
  return i
}

function idsUpTo(steps: OnboardingStep[], index: number, existing: string[]): string[] {
  const set = new Set(existing)
  for (let i = 0; i < index && i < steps.length; i++) set.add(steps[i].id)
  return Array.from(set)
}

/** Start / resume the tour. Resumes at `savedStepId` if given, else the first step,
 *  then skips forward over anything real data already satisfies. */
export function startState(
  steps: OnboardingStep[],
  flags: ProgressFlags,
  savedStepId?: string | null,
): MachineState {
  const savedIdx = savedStepId ? steps.findIndex(s => s.id === savedStepId) : -1
  const from = savedIdx >= 0 ? savedIdx : 0
  const index = nextActionableIndex(steps, flags, from)
  if (index >= steps.length) {
    return { index: steps.length, status: 'completed', completed: steps.map(s => s.id) }
  }
  return { index, status: 'in_progress', completed: idsUpTo(steps, index, []) }
}

/** Next: mark current complete, advance past satisfied steps. Past the end → completed. */
export function advance(state: MachineState, steps: OnboardingStep[], flags: ProgressFlags): MachineState {
  if (state.index < 0 || state.index >= steps.length) return state
  const index = nextActionableIndex(steps, flags, state.index + 1)
  // Record the current step AND any data-satisfied steps we skipped over.
  const completed = idsUpTo(steps, index, state.completed)
  if (index >= steps.length) {
    return { index: steps.length, status: 'completed', completed }
  }
  return { index, status: 'in_progress', completed }
}

/**
 * Back: step to the nearest EARLIER step the client can act on, walking BACKWARD
 * past any steps already satisfied by real data (the mirror of nextActionableIndex).
 * Without this, Back could land on a data-check step whose flag is already true and
 * the orchestrator's auto-advance would instantly bounce forward again — Back would
 * look dead. Floors at index 0 so it never goes before the first step.
 */
export function back(state: MachineState, steps: OnboardingStep[], flags: ProgressFlags): MachineState {
  if (state.index <= 0) return { ...state, index: 0, status: 'in_progress' }
  let i = Math.min(state.index, steps.length) - 1
  while (i > 0 && isStepSatisfied(steps[i], flags)) i--
  return { ...state, index: i, status: 'in_progress' }
}

/** Skip: exit the tour cleanly. It never blocks the app — status becomes 'skipped'
 *  and the current step id is remembered so a later resume can pick it back up. */
export function skipTour(state: MachineState): MachineState {
  return { ...state, index: -1, status: 'skipped' }
}

/** The step id to persist for the current state (null when not on a step). */
export function currentStepId(state: MachineState, steps: OnboardingStep[]): string | null {
  if (state.index < 0 || state.index >= steps.length) return null
  return steps[state.index].id
}
