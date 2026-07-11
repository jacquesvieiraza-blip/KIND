'use client'

/**
 * OnboardingOrchestrator (#454) — the step machine's React host. It:
 *   - starts / RESUMES the tour from the server cursor (saved.step) — closing the
 *     browser and returning picks up exactly where the client left off (§7)
 *   - watches the route (next/navigation) and navigates to each step's route
 *   - measures the step's data-tour target and drives Overlay + Spotlight + Popover
 *   - PATCHes progress on every advance / back / skip
 *   - polls /onboarding/progress so real data-checks auto-complete, and NEVER blocks:
 *     the async ICP run just shows "FIGSY's searching", Next always stays clickable
 *
 * Mobile is out of scope this sprint (Phase 8) — a bottom-sheet seam is TODO'd below.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ONBOARDING_STEPS, REQUIRED_STEPS, EXAMPLE_ICP_PREFILL } from '@/lib/onboarding-steps'
import {
  startState, advance, back, skipTour, isStepSatisfied, currentStepId,
  type MachineState,
} from '@/lib/onboarding-machine'
import { useOnboarding } from './OnboardingProvider'
import { OnboardingOverlay, type Rect } from './OnboardingOverlay'
import { OnboardingSpotlight } from './OnboardingSpotlight'
import { OnboardingPopover } from './OnboardingPopover'
import { OnboardingResumePill } from './OnboardingResumePill'

const steps = ONBOARDING_STEPS
const TOTAL = REQUIRED_STEPS.length

function readRect(selector: string): Rect | null {
  const el = document.querySelector(selector) as HTMLElement | null
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

export function OnboardingOrchestrator() {
  const { ready, flags, saved, launchNonce, refetch, patchProgress } = useOnboarding()
  const pathname = usePathname()
  const router = useRouter()

  const [machine, setMachine] = useState<MachineState | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const active = machine !== null && machine.index >= 0 && machine.index < steps.length
  const startedRef = useRef(false)
  const lastLaunchRef = useRef(0)

  const current = active ? steps[machine!.index] : null

  // Commit a new machine state locally AND persist the cursor.
  const commit = useCallback((next: MachineState) => {
    setMachine(next)
    patchProgress({
      step: currentStepId(next, steps),
      status: next.status,
      completed: next.completed,
    })
  }, [patchProgress])

  // Auto-START for a brand-new client (founder-ruled: a new signup gets walked
  // next→next→next immediately, no button hunt) and auto-RESUME an in-progress
  // tour — once, after progress has loaded. Skipped/completed never auto-launch;
  // the Learning Centre "Restart" button is their re-entry.
  useEffect(() => {
    if (!ready || startedRef.current) return
    if (saved.status !== 'in_progress' && saved.status !== 'not_started') return
    startedRef.current = true
    const next = startState(steps, flags, saved.step)
    setMachine(next)
    if (saved.status === 'not_started') {
      patchProgress({ step: currentStepId(next, steps), status: 'in_progress', completed: next.completed })
      const target = next.index >= 0 && next.index < steps.length ? steps[next.index].route : null
      if (target && pathname !== target) router.push(target)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, saved.status, saved.step, flags])

  // Manual launch (WelcomeVideoCard / Learning Centre "Restart" → startTour()).
  // Navigates to the resumed step's route explicitly — the route-watch below only
  // fires on step CHANGE, and a restart can resume the very same step.
  useEffect(() => {
    if (launchNonce === 0 || launchNonce === lastLaunchRef.current) return
    lastLaunchRef.current = launchNonce
    startedRef.current = true
    const next = startState(steps, flags, saved.step)
    setMachine(next)
    patchProgress({ step: currentStepId(next, steps), status: 'in_progress', completed: next.completed })
    const target = next.index >= 0 && next.index < steps.length ? steps[next.index].route : null
    if (target && pathname !== target) router.push(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchNonce, flags, saved.step, patchProgress])

  // Route-watch: navigate to a step's route ONCE, when the STEP changes — NOT on
  // every pathname change. This is the F1 fix: the old version re-pushed whenever
  // pathname !== route, so any manual navigation (e.g. the low-credit nudge's "Go to
  // billing") was instantly yanked back. Now the client can walk away; the tour goes
  // dormant (see the resume pill below) instead of trapping them on the step page.
  // While DORMANT, even a step change must not navigate (leads landing in the
  // background auto-advance step 4 → without this guard the client browsing billing
  // would still get yanked). We only auto-navigate when the client was following the
  // tour — i.e. they were on the previous step's route (or the tour just launched).
  const prevRouteRef = useRef<string | null>(null)
  useEffect(() => {
    if (!current) { prevRouteRef.current = null; return }
    const wasFollowing = prevRouteRef.current === null || pathname === prevRouteRef.current || pathname === current.route
    prevRouteRef.current = current.route
    if (wasFollowing && pathname !== current.route) router.push(current.route)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  // Step 2 anti-empty-form: drop an example ICP into the EXISTING kind_icp_prefill
  // key so "New ICP" opens pre-filled. Only when the client has no ICP yet.
  useEffect(() => {
    if (!current?.prefillExampleIcp || flags.hasIcp) return
    try {
      if (!localStorage.getItem('kind_icp_prefill')) {
        localStorage.setItem('kind_icp_prefill', JSON.stringify(EXAMPLE_ICP_PREFILL))
      }
    } catch { /* localStorage unavailable — form just starts empty, no crash */ }
  }, [current?.id, current?.prefillExampleIcp, flags.hasIcp])

  // Measure the target while on its route — poll (element may appear late, e.g. when
  // a form opens or async leads land) plus react to scroll/resize.
  useEffect(() => {
    if (!current || pathname !== current.route) { setRect(null); return }
    const measure = () => setRect(readRect(current.target))
    measure()
    const id = window.setInterval(measure, 250)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [current?.id, current?.target, current?.route, pathname])

  // Poll progress while the tour is active so data-checks reflect real state.
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => { refetch() }, 3500)
    return () => window.clearInterval(id)
  }, [active, refetch])

  // Auto-advance a data-check step the moment real data satisfies it (e.g. ICP saved,
  // leads landed, reveal confirmed) — the experienced-client / async-run path.
  useEffect(() => {
    if (!current) return
    if (isStepSatisfied(current, flags)) {
      commit(advance(machine!, steps, flags))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, flags.hasIcp, flags.hasLeads, flags.hasReveal, flags.hasEnrollment])

  // Fallback: target genuinely absent AND the step says 'skip' → move on.
  useEffect(() => {
    if (!current || rect !== null) return
    if (current.fallback === 'skip') commit(advance(machine!, steps, flags))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, rect])

  if (!active || !current) return null

  const handleNext = () => commit(advance(machine!, steps, flags))
  const handleBack = () => commit(back(machine!, steps, flags))
  const handleSkip = () => {
    const next = skipTour(machine!)
    setMachine(next)
    patchProgress({ step: current.id, status: 'skipped', completed: next.completed })
  }

  // DORMANT (F1): the client has navigated away from this step's page. Don't drag
  // them back and don't show the scrim/spotlight/popover — show a quiet pill they
  // can tap to resume (or ✕ to skip). rect is already cleared off-route by the
  // measure effect, so no stale spotlight lingers on the wrong page.
  const onRoute = pathname === current.route
  if (!onRoute) {
    return (
      <OnboardingResumePill
        stepNumber={machine!.index + 1}
        totalSteps={TOTAL}
        onResume={() => router.push(current.route)}
        onSkip={handleSkip}
      />
    )
  }

  // No rect + fallback 'center'/'wait' → centered popover, full scrim, no spotlight.
  const showSpotlight = rect !== null
  const searching = current.completionCondition === 'data-check'
    && current.fallback === 'wait'
    && !isStepSatisfied(current, flags)

  return (
    <>
      <OnboardingOverlay rect={rect} />
      {showSpotlight && <OnboardingSpotlight rect={rect} />}
      <OnboardingPopover
        rect={rect}
        placement={rect ? current.placement : 'center'}
        title={current.title}
        body={current.body}
        stepNumber={machine!.index + 1}
        totalSteps={TOTAL}
        isFirst={machine!.index === 0}
        isLast={machine!.index === steps.length - 1}
        searching={searching}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={handleSkip}
      />
    </>
  )
}
