'use client'

/**
 * OnboardingPopover (#454) — the tour card: title, FIGSY-voice body, Next / Back /
 * Skip, and the numbered progress rail. Positions itself off the target per the step's
 * placement and is CLAMPED to the viewport so it can never render off-screen (falls
 * back to centered when there's no target). Brand token #7C3AED + existing button look.
 */

import { createPortal } from 'react-dom'
import { useLayoutEffect, useRef, useState } from 'react'
import type { Rect } from './OnboardingOverlay'
import type { Placement } from '@/lib/onboarding-steps'
import { OnboardingProgressRail } from './OnboardingProgressRail'

const BRAND = '#7C3AED'
const CARD_W = 340
const GAP = 16
const MARGIN = 12

type Props = {
  rect: Rect | null
  placement: Placement
  title: string
  body: string
  stepNumber: number      // 1-based position among REQUIRED steps
  totalSteps: number
  isFirst: boolean
  isLast: boolean
  searching?: boolean     // async data-check not yet satisfied (e.g. leads landing)
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

function computePosition(rect: Rect | null, placement: Placement, cardH: number): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (!rect || placement === 'center') {
    return { top: Math.max(MARGIN, vh / 2 - cardH / 2), left: Math.max(MARGIN, vw / 2 - CARD_W / 2) }
  }
  let top = rect.top
  let left = rect.left
  switch (placement) {
    case 'top':    top = rect.top - cardH - GAP;            left = rect.left + rect.width / 2 - CARD_W / 2; break
    case 'bottom': top = rect.top + rect.height + GAP;      left = rect.left + rect.width / 2 - CARD_W / 2; break
    case 'left':   left = rect.left - CARD_W - GAP;         top = rect.top + rect.height / 2 - cardH / 2;   break
    case 'right':  left = rect.left + rect.width + GAP;     top = rect.top + rect.height / 2 - cardH / 2;   break
  }
  // Clamp to viewport so the card is always fully visible.
  left = Math.min(Math.max(MARGIN, left), vw - CARD_W - MARGIN)
  top = Math.min(Math.max(MARGIN, top), vh - cardH - MARGIN)
  return { top, left }
}

export function OnboardingPopover(props: Props) {
  const { rect, placement, title, body, stepNumber, totalSteps, isFirst, isLast, searching, onNext, onBack, onSkip } = props
  const cardRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  useLayoutEffect(() => { setMounted(true) }, [])

  useLayoutEffect(() => {
    if (!mounted) return
    const h = cardRef.current?.offsetHeight ?? 220
    setPos(computePosition(rect, placement, h))
  }, [mounted, rect, placement, title, body, searching])

  if (!mounted) return null

  const card = (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: CARD_W,
        zIndex: 10000,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="rounded-2xl bg-white shadow-2xl border border-purple-100 p-5"
    >
      <OnboardingProgressRail current={stepNumber} total={totalSteps} />

      <h3 className="mt-3 text-base font-bold text-[#1E1152]">{title}</h3>
      <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{body}</p>

      {searching && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#7C3AED] bg-purple-50 rounded-lg px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-[#7C3AED] animate-pulse" />
          FIGSY&apos;s searching — keep going, I&apos;ll let you know the moment leads land.
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-xs font-medium text-[#9B8EC4] hover:text-gray-600 transition-colors"
        >
          Skip tour
        </button>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#7C3AED] bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={onNext}
            style={{ background: BRAND }}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(card, document.body)
}
