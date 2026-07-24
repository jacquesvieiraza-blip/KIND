'use client'

/** First-run checklist (#447) — the four steps that push a new client to their first
 *  approved lead. Each step is lit from REAL data (see /onboarding/progress):
 *    ① hasIcp        — client told FIGSY who they sell to
 *    ② hasLeads      — FIGSY sourced ≥1 lead
 *    ③ hasReveal     — client approved a lead ($4, final)
 *    ④ hasEnrollment — client put FIGSY to work (≥1 enrollment)
 *  The card hides permanently once all four are complete (localStorage flag keyed
 *  by client id, so it stays gone even if a later count momentarily regresses). */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props {
  clientId: string
  hasIcp: boolean
  hasLeads: boolean
  hasReveal: boolean
  hasEnrollment: boolean
  topLeadId?: string | null
}

export function FirstRunChecklist({ clientId, hasIcp, hasLeads, hasReveal, hasEnrollment, topLeadId }: Props) {
  const dismissKey = `kind_first_run_done_${clientId || 'anon'}`
  const [dismissed, setDismissed] = useState(false)

  const revealHref = topLeadId ? `/dashboard/leads?highlight=${topLeadId}` : '/dashboard/leads'

  const steps: { label: string; done: boolean; href: string; cta: string }[] = [
    { label: 'Tell FIGSY who you sell to — 2 minutes, he takes it from there', done: hasIcp,        href: '/dashboard/leads/icp', cta: 'Build my ICP' },
    { label: 'FIGSY finds your people — free, watch them land',                 done: hasLeads,      href: '/dashboard/leads',     cta: 'See my leads' },
    { label: 'Reveal your first lead — see exactly who they are. You have 20 free reveals', done: hasReveal, href: revealHref,   cta: 'Reveal top lead' },
    { label: 'Put FIGSY to work — he writes the emails, sends, follows up while you sleep', done: hasEnrollment, href: '/dashboard/figsy', cta: 'Put FIGSY to work' },
  ]

  const completedCount = steps.filter(s => s.done).length
  const allDone = completedCount === steps.length

  // Persist "dismissed when complete" so the card never reappears once finished.
  useEffect(() => {
    try {
      if (localStorage.getItem(dismissKey) === '1') { setDismissed(true); return }
      if (allDone) { localStorage.setItem(dismissKey, '1'); setDismissed(true) }
    } catch { /* localStorage unavailable — fall back to render-time hide */ }
  }, [allDone, dismissKey])

  if (allDone || dismissed) return null

  const progress = Math.round((completedCount / steps.length) * 100)
  // First not-yet-done step is the one we nudge toward.
  const nextIdx = steps.findIndex(s => !s.done)

  return (
    <div className="bg-white rounded-xl border-t-4 border-[#7C3AED] border border-purple-100/60 shadow-sm px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Get your first meeting on autopilot</p>
          <p className="text-xs text-[#9B8EC4] mt-0.5">{completedCount} of {steps.length} steps complete</p>
        </div>
        <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#7C3AED] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ul className="space-y-2.5">
        {steps.map((step, i) => {
          const isNext = i === nextIdx
          return (
            <li key={i} className="flex items-center gap-3 text-sm">
              {step.done ? (
                <span className="w-5 h-5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] flex items-center justify-center text-xs font-bold shrink-0">✓</span>
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
              )}
              <span className={`flex-1 ${step.done ? 'text-[#9B8EC4] line-through' : 'text-gray-700'}`}>
                {step.label}
              </span>
              {!step.done && (
                <Link
                  href={step.href}
                  className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isNext
                      ? 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]'
                      : 'text-[#7C3AED] bg-purple-50 hover:bg-purple-100'
                  }`}
                >
                  {step.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
