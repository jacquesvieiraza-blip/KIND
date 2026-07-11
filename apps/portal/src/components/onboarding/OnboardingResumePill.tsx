'use client'

/**
 * OnboardingResumePill (#454, F1) — the DORMANT state of the tour. When the client
 * navigates away from the current step's page (e.g. taps "Go to billing" from the
 * low-credit nudge), the tour no longer force-drags them back — it goes quiet and
 * shows this small pill instead. Resume takes them back to the step; ✕ skips the
 * tour (same handler as "Skip tour" in the popover). Sits BELOW the nudge/video
 * modals (z 9000 vs nudge 10001 / video 10002) so it never covers them.
 */

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { Compass, X } from 'lucide-react'

const BRAND = '#7C3AED'

export function OnboardingResumePill({
  stepNumber, totalSteps, onResume, onSkip,
}: {
  stepNumber: number
  totalSteps: number
  onResume: () => void
  onSkip: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const pill = (
    <div
      className="fixed bottom-4 right-4 z-[9000] flex items-center gap-2 rounded-full bg-white shadow-2xl border border-purple-100 pl-3 pr-2 py-2"
      role="status"
      aria-label={`Guided tour paused on step ${stepNumber} of ${totalSteps}`}
    >
      <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F5F0FF' }}>
        <Compass className="w-3.5 h-3.5" style={{ color: BRAND }} />
      </span>
      <button
        onClick={onResume}
        className="text-xs font-semibold text-[#1E1152] hover:text-[#7C3AED] transition-colors"
      >
        Continue tour — step {stepNumber}/{totalSteps}
      </button>
      <button
        onClick={onSkip}
        aria-label="End the guided tour"
        className="w-6 h-6 rounded-full flex items-center justify-center text-[#9B8EC4] hover:bg-gray-100 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )

  return createPortal(pill, document.body)
}
