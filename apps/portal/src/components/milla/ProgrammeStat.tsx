'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE MILLA REPORTING VISUAL KIT — the old portal's presentation, on programme truth.
//
// ⚑ 31 Aug (BUILD-004A-2C VISUAL RECOVERY). The founder's words on the live walk:
// *"The Performance, Analytics and ROI from the previous version was way better. We had
// graphs and colours. This feels very shallow. It is very flat."*
//
// 🛑 HE IS RIGHT, AND THE MISTAKE IS WORTH NAMING PRECISELY. I treated "this metric is not
// truthful" as "delete the component". Those are not the same thing. The `industryAvg`
// benchmark was false — the BenchmarkRow that drew it was not. "Pipeline value touched" was
// fabricated — the hero ValueCard that displayed it was not. I removed the honest presentation
// along with the dishonest number and left four admin pages behind.
//
// ⚠️ SO THE VISUALS COME BACK, AND ONLY THE VISUALS. Every primitive here is lifted from the
// previous `(dashboard)` pages — the hero card's `border-2 border-[#7C3AED]/20 bg-[#F5F0FF]`,
// the icon tile, the `h-2.5 bg-gray-100 rounded-full` bar, the gradient panel — so this IS the
// brand rather than an interpretation of it. What none of them carries is a number: every
// component takes what it renders from the caller, and the callers read the programme.
//
// ⚠️ AND `null` IS STILL A DASH. A richer page is a bigger surface to lie on. Every figure
// here distinguishes "we could not read it" from zero, exactly as the flat version did.
// ═══════════════════════════════════════════════════════════════════════════════════════

import type { ReactNode } from 'react'

/** The page header every Milla reporting surface uses. */
export function ProgrammeHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h1 className="text-2xl font-bold text-[#1f1235]">{title}</h1>
      <p className="text-sm text-[#7c6f9b] mt-0.5">{sub}</p>
    </>
  )
}

/**
 * The old ROI page's ValueCard, unchanged in appearance.
 *
 * ⚠️ `value` MAY BE `null`, which renders an em dash. The original could not express
 * "unreadable" at all — it printed `0` — and that is the one thing this version adds.
 */
export function ValueCard({
  label, value, sub, icon, hero = false, tone = 'violet',
}: {
  label: string
  value: string | number | null
  sub?: string
  icon?: ReactNode
  hero?: boolean
  tone?: 'violet' | 'emerald' | 'amber'
}) {
  const shown = value === null ? '—' : typeof value === 'number' ? value.toLocaleString() : value
  const TONE = {
    violet:  { chip: 'bg-[#7C3AED]/10 text-[#7C3AED]', num: 'text-gray-900' },
    emerald: { chip: 'bg-emerald-500/10 text-emerald-600', num: 'text-gray-900' },
    amber:   { chip: 'bg-amber-500/10 text-amber-600', num: 'text-gray-900' },
  }[tone]

  if (hero) {
    return (
      <div className="col-span-full sm:col-span-2 rounded-2xl border-2 border-[#7C3AED]/20 bg-[#F5F0FF] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7C3AED] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-4xl font-bold text-[#1E0A5C] tabular-nums">{shown}</p>
            {sub && <p className="text-sm text-[#7C3AED]/70 mt-1">{sub}</p>}
          </div>
          {icon && (
            <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center shrink-0 text-[#7C3AED]">
              {icon}
            </div>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-purple-100/60 bg-white p-5">
      {icon && <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${TONE.chip}`}>{icon}</div>}
      <p className={`text-2xl font-bold tabular-nums ${TONE.num}`}>{shown}</p>
      <p className="text-sm text-[#7B6FA0] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[#9B8EC4] mt-1">{sub}</p>}
    </div>
  )
}

/**
 * The old KPI page's progress bar.
 *
 * ⚠️ IT DRAWS A RATIO OF TWO REAL NUMBERS AND NOTHING ELSE. The component the founder liked
 * was never the problem — the `industryAvg={0.071}` fed into one of them was. This one has no
 * benchmark input at all, so there is nowhere for a made-up comparison to enter.
 */
export function ProgressBar({
  label, value, max, color = 'bg-[#7C3AED]', suffix,
}: {
  label: string
  value: number
  max: number
  color?: string
  suffix?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 tabular-nums">
            {value.toLocaleString()}<span className="text-gray-400 font-normal"> / {max.toLocaleString()}{suffix ?? ''}</span>
          </span>
          {pct > 0 && <span className="text-[#9B8EC4]">({pct}%)</span>}
        </div>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
        />
      </div>
    </div>
  )
}

/** The old ROI page's gradient panel — the container its trend strip lived in. */
export function Panel({ title, chip, children }: { title: string; chip?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-purple-200/60 bg-gradient-to-br from-[#F5F0FF]/60 to-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wider">{title}</p>
        {chip && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED]">
            {chip}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

/**
 * The programme's journey, drawn.
 *
 * ⚠️ THE SEVEN STAGES COME FROM `MILLA_STAGES`, the one approved lifecycle — the same
 * constant the FLOW ribbon maps. This is a picture of where they are, not a new vocabulary,
 * and it claims nothing about timing: a completed step means it happened, never that the next
 * one is imminent.
 */
export function StageRail({ stages, current }: { stages: readonly string[]; current: string }) {
  const at = stages.indexOf(current)
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.map((s, i) => {
        const done = at >= 0 && i < at
        const now  = at >= 0 && i === at
        return (
          <span key={s} className="flex items-center">
            <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${
              now  ? 'bg-[#7C3AED] text-white'
              : done ? 'bg-[#7C3AED]/10 text-[#7C3AED]'
              : 'bg-gray-100 text-gray-400'}`}>
              {s}
            </span>
            {i < stages.length - 1 && <span className="text-gray-300 px-0.5">›</span>}
          </span>
        )
      })}
    </div>
  )
}

/**
 * A pre-live state that still looks like the product.
 *
 * 🛑 THIS IS THE FOUNDER'S CORRECTION MADE CONCRETE. The flat version collapsed a whole page
 * into one grey sentence when outreach had not started. This keeps the panel, states what the
 * area will measure, and shows the metric names greyed rather than filled with zeros —
 * because "0 replies" reads as failure and "not started" is the truth.
 *
 * ⚠️ NO NUMBERS AT ALL IN HERE. Not zeros, not placeholders, not sample data.
 */
export function PreLiveState({ what, measures }: { what: string; measures: string[] }) {
  return (
    <div className="rounded-2xl border border-purple-100/60 bg-white p-6">
      <p className="text-[13.5px] text-[#5c5279] leading-relaxed">{what}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {measures.map(m => (
          <div key={m} className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/60 px-3.5 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
            <span className="text-[12.5px] text-[#9B8EC4]">{m}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
