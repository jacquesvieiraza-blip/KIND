'use client'

/**
 * OnboardingSpotlight (#454) — the highlight ring drawn around the registered
 * data-tour target. Purely decorative (pointer-events: none) so it never intercepts
 * clicks on the real element inside the overlay's hole. Brand token #7C3AED.
 */

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import type { Rect } from './OnboardingOverlay'

const PAD = 8
const BRAND = '#7C3AED'

export function OnboardingSpotlight({ rect }: { rect: Rect | null }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || !rect) return null

  const style: React.CSSProperties = {
    position: 'fixed',
    top: Math.max(0, rect.top - PAD),
    left: Math.max(0, rect.left - PAD),
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
    borderRadius: 12,
    boxShadow: `0 0 0 3px ${BRAND}, 0 0 0 9999px transparent`,
    pointerEvents: 'none',
    zIndex: 9999,
    transition: 'top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease',
  }
  return createPortal(<div style={style} aria-hidden />, document.body)
}
