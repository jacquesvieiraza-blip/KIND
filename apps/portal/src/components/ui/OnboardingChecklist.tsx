'use client'

import Link from 'next/link'

interface Step {
  label: string
  done: boolean
  href: string
}

interface Props {
  hasCompanyName: boolean
  hasIcps: boolean
  hasLeads: boolean
  hasFigsyCampaigns: boolean
}

export function OnboardingChecklist({ hasCompanyName, hasIcps, hasLeads, hasFigsyCampaigns }: Props) {
  const steps: Step[] = [
    { label: 'Complete your business profile', done: hasCompanyName,      href: '/dashboard/settings' },
    { label: 'Build your first ICP',           done: hasIcps,             href: '/dashboard/leads/icp' },
    { label: 'Receive your first leads',       done: hasLeads,            href: '/dashboard/leads' },
    { label: 'Set up FIGSY outreach',          done: hasFigsyCampaigns,   href: '/dashboard/figsy' },
  ]

  const completedCount = steps.filter(s => s.done).length

  // All done — hide the checklist entirely
  if (completedCount === steps.length) return null

  const incomplete = steps.filter(s => !s.done)
  const progress   = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="bg-white rounded-xl border-t-4 border-indigo-500 border border-gray-100 shadow-sm px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Get started with K.I.N.D</p>
          <p className="text-xs text-gray-400 mt-0.5">{completedCount} of {steps.length} complete</p>
        </div>
        {/* Progress bar */}
        <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {steps.map(step => (
          <li key={step.label} className="flex items-center gap-3 text-sm">
            {step.done ? (
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">✓</span>
            ) : (
              <span className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
            )}
            {step.done ? (
              <span className="text-gray-400 line-through">{step.label}</span>
            ) : (
              <Link href={step.href} className="text-gray-700 hover:text-indigo-600 hover:underline transition-colors">
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ul>

      {incomplete.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Next up:{' '}
            <Link href={incomplete[0].href} className="text-indigo-600 font-medium hover:underline">
              {incomplete[0].label}
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}
