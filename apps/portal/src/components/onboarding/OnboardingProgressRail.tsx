'use client'

/**
 * OnboardingProgressRail (#454) — the numbered step bar shown inside the popover.
 * REQUIRED steps only (optional steps never appear here). Brand token #7C3AED.
 */

const BRAND = '#7C3AED'

export function OnboardingProgressRail({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 flex items-center gap-1" aria-label={`Step ${current} of ${total}`}>
        {Array.from({ length: total }).map((_, i) => {
          const done = i < current
          return (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: done ? BRAND : '#EDE9FE' }}
            />
          )
        })}
      </div>
      <span className="text-[11px] font-semibold text-[#9B8EC4] shrink-0">
        {current}/{total}
      </span>
    </div>
  )
}
