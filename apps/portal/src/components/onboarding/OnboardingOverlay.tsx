'use client'

/**
 * OnboardingOverlay (#454) — the dimmed scrim, rendered through a React portal at a
 * high z-index. When a target rect is provided it dims everything EXCEPT a hole around
 * the target (built from four rects so clicks on the real element still pass through);
 * with no rect it dims the whole viewport (centered-popover / fallback case).
 */

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

export type Rect = { top: number; left: number; width: number; height: number }

const PAD = 8 // breathing room around the spotlighted element
const SCRIM = 'rgba(15, 9, 41, 0.62)' // #0F0929 @ ~62% — matches the brand dark

// The scrim never dismisses on click — an accidental backdrop click killing the
// tour is worse than making the client use the explicit "Skip tour" button.
export function OnboardingOverlay({ rect }: { rect: Rect | null }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const scrimStyle: React.CSSProperties = { position: 'fixed', background: SCRIM, zIndex: 9998 }

  const content = rect
    ? (() => {
        const hole = {
          top: Math.max(0, rect.top - PAD),
          left: Math.max(0, rect.left - PAD),
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
        }
        return (
          <>
            {/* top */}
            <div style={{ ...scrimStyle, top: 0, left: 0, right: 0, height: hole.top }} />
            {/* bottom */}
            <div style={{ ...scrimStyle, top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }} />
            {/* left */}
            <div style={{ ...scrimStyle, top: hole.top, left: 0, width: hole.left, height: hole.height }} />
            {/* right */}
            <div style={{ ...scrimStyle, top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }} />
          </>
        )
      })()
    : <div style={{ ...scrimStyle, inset: 0 }} />

  return createPortal(content, document.body)
}
