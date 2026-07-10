import { describe, it, expect } from 'vitest'
import {
  startState, advance, back, skipTour, isStepSatisfied, nextActionableIndex, currentStepId,
  type ProgressFlags,
} from './onboarding-machine'
import type { OnboardingStep } from './onboarding-steps'

// Minimal fixture: 4 steps, mixing action + data-check so we can prove the
// experienced-client skip-ahead without depending on the real config.
const steps: OnboardingStep[] = [
  s('a', 'action'),
  s('b', 'data-check', 'hasIcp'),
  s('c', 'data-check', 'hasLeads'),
  s('d', 'action'),
]

function s(id: string, cond: OnboardingStep['completionCondition'], check?: OnboardingStep['completionCheck']): OnboardingStep {
  return {
    id, required: true, route: '/x', target: `[data-tour="${id}"]`,
    title: id, body: id, placement: 'bottom',
    completionCondition: cond, completionCheck: check,
    fallback: 'center', analyticsEvent: `e_${id}`, mobilePresentation: 'popover',
  }
}

const none: ProgressFlags = {}

describe('onboarding step machine', () => {
  it('starts at the first step when no data satisfies anything', () => {
    const st = startState(steps, none)
    expect(st.index).toBe(0)
    expect(st.status).toBe('in_progress')
    expect(currentStepId(st, steps)).toBe('a')
  })

  it('isStepSatisfied only fires for data-check steps whose flag is true', () => {
    expect(isStepSatisfied(steps[0], { hasIcp: true })).toBe(false) // action step
    expect(isStepSatisfied(steps[1], { hasIcp: true })).toBe(true)
    expect(isStepSatisfied(steps[1], { hasIcp: false })).toBe(false)
    expect(isStepSatisfied(steps[2], {})).toBe(false)
  })

  it('advance moves to the next step and records completion', () => {
    let st = startState(steps, none)
    st = advance(st, steps, none)
    expect(currentStepId(st, steps)).toBe('b')
    expect(st.completed).toContain('a')
  })

  it('advance skips steps already satisfied by real data (experienced client)', () => {
    // On step a; b (hasIcp) + c (hasLeads) are already satisfied → jump to d.
    let st = startState(steps, none)
    st = advance(st, steps, { hasIcp: true, hasLeads: true })
    expect(currentStepId(st, steps)).toBe('d')
    expect(st.completed).toEqual(expect.arrayContaining(['a', 'b', 'c']))
  })

  it('start skips ahead when leading data-checks are already satisfied', () => {
    // a is action (can't auto-satisfy) so start stays on a...
    expect(startState(steps, { hasIcp: true, hasLeads: true }).index).toBe(0)
    // ...but nextActionableIndex from 1 skips b+c straight to d (index 3).
    expect(nextActionableIndex(steps, { hasIcp: true, hasLeads: true }, 1)).toBe(3)
  })

  it('an experienced client with everything satisfied completes on start-from-second', () => {
    // Resume saved at 'b'; b+c satisfied and d is the only action left.
    const st = startState(steps, { hasIcp: true, hasLeads: true }, 'b')
    expect(currentStepId(st, steps)).toBe('d')
  })

  it('advancing past the last step completes the tour', () => {
    let st: ReturnType<typeof startState> = { index: 3, status: 'in_progress', completed: ['a', 'b', 'c'] }
    st = advance(st, steps, none)
    expect(st.index).toBe(steps.length)
    expect(st.status).toBe('completed')
    expect(currentStepId(st, steps)).toBeNull()
  })

  it('back steps one position earlier and never goes below zero', () => {
    let st = advance(startState(steps, none), steps, none) // on b (index 1)
    st = back(st, steps)
    expect(currentStepId(st, steps)).toBe('a')
    st = back(st, steps) // already at 0
    expect(st.index).toBe(0)
  })

  it('skipTour exits cleanly without blocking (status skipped, index -1)', () => {
    const st = skipTour(startState(steps, none))
    expect(st.status).toBe('skipped')
    expect(st.index).toBe(-1)
    expect(currentStepId(st, steps)).toBeNull()
  })

  it('resume returns to the saved step id', () => {
    const st = startState(steps, none, 'c')
    expect(currentStepId(st, steps)).toBe('c')
  })

  it('resume from an unknown saved id falls back to the first step', () => {
    const st = startState(steps, none, 'zzz')
    expect(st.index).toBe(0)
  })
})
