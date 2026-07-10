'use client'

/**
 * OnboardingProvider (#454) — loads /onboarding/progress ONCE on mount, holds the
 * tour's shared state (auth token, real-data flags, the server-persisted cursor),
 * and exposes helpers the orchestrator + welcome card use:
 *   - flags        : the real data-checks (hasIcp/hasLeads/…), refetched on a light poll
 *   - saved        : { step, status, version } — the persisted cursor for RESUME
 *   - patchProgress: guarded PATCH so the cursor survives refresh / second device
 *   - startTour    : launch the tour (WelcomeVideoCard's "Start the guided tour")
 *   - refetch      : re-pull progress (orchestrator polls this for async data-checks)
 * Reuses the brand token #7C3AED + existing button styles — no new visual system.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import type { ProgressFlags, OnboardingStatus } from '@/lib/onboarding-machine'

type ProgressResponse = {
  hasIcp: boolean; hasLeads: boolean; hasReveal: boolean; hasEnrollment: boolean; hasPurchase: boolean
  current_step: string | null
  completed_steps: string[]
  status: OnboardingStatus
  version: number
}

export type SavedCursor = {
  step: string | null
  status: OnboardingStatus
  completed: string[]
  version: number
}

type PatchInput = { step?: string | null; status?: OnboardingStatus; completed?: string[] }

interface OnboardingContextValue {
  ready: boolean
  token: string | null
  flags: ProgressFlags
  saved: SavedCursor
  /** bumped each time startTour() is called — orchestrator watches it to (re)launch. */
  launchNonce: number
  startTour: () => void
  refetch: () => Promise<void>
  patchProgress: (p: PatchInput) => Promise<void>
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used inside <OnboardingProvider>')
  return ctx
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [flags, setFlags] = useState<ProgressFlags>({})
  const [saved, setSaved] = useState<SavedCursor>({ step: null, status: 'not_started', completed: [], version: 1 })
  const [launchNonce, setLaunchNonce] = useState(0)
  const tokenRef = useRef<string | null>(null)

  const applyResponse = useCallback((d: ProgressResponse) => {
    setFlags({
      hasIcp: d.hasIcp, hasLeads: d.hasLeads, hasReveal: d.hasReveal,
      hasEnrollment: d.hasEnrollment, hasPurchase: d.hasPurchase,
    })
    setSaved({
      step: d.current_step ?? null,
      status: d.status ?? 'not_started',
      completed: d.completed_steps ?? [],
      version: d.version ?? 1,
    })
  }, [])

  const refetch = useCallback(async () => {
    const t = tokenRef.current
    if (!t) return
    try {
      const res = await api.get<{ data: ProgressResponse }>('/onboarding/progress', t)
      if (res?.data) applyResponse(res.data)
    } catch { /* transient — keep last known state, tour never blocks on a fetch */ }
  }, [applyResponse])

  // Load once on mount.
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return
      if (!session) { setReady(true); return }
      tokenRef.current = session.access_token
      setToken(session.access_token)
      try {
        const res = await api.get<{ data: ProgressResponse }>('/onboarding/progress', session.access_token)
        if (!cancelled && res?.data) applyResponse(res.data)
      } catch { /* non-fatal — tour just won't have server state */ }
      if (!cancelled) setReady(true)
    })
    return () => { cancelled = true }
  }, [applyResponse])

  const patchProgress = useCallback(async (p: PatchInput) => {
    // Optimistically reflect locally so the UI never waits on the network.
    setSaved(prev => ({
      step: p.step !== undefined ? p.step : prev.step,
      status: p.status ?? prev.status,
      completed: p.completed ?? prev.completed,
      version: prev.version,
    }))
    const t = tokenRef.current
    if (!t) return
    try { await api.patch('/onboarding/progress', p, t) }
    catch { /* guarded write already logs server-side; local state stands */ }
  }, [])

  const startTour = useCallback(() => setLaunchNonce(n => n + 1), [])

  return (
    <OnboardingContext.Provider value={{ ready, token, flags, saved, launchNonce, startTour, refetch, patchProgress }}>
      {children}
    </OnboardingContext.Provider>
  )
}
