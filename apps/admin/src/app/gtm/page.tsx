export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Rocket, Target, TrendingUp, Trophy, CalendarDays } from 'lucide-react'

// M3 · Admin GTM hub (#278). Strategy · Results · Winning plays · Content calendar.
// SHELLS — honest wire-in states, NO fake data. Each panel states exactly what it
// will surface and what it's waiting on (our own outreach going live / a data feed).
// CMO tools · Unibox · Visitor intel keep their own live pages; this hub is the
// strategy/results/plays/calendar layer the audit called out as 🔴.

const TABS = [
  { key: 'strategy', label: 'Strategy',         icon: Target },
  { key: 'results',  label: 'Results',          icon: TrendingUp },
  { key: 'plays',    label: 'Winning plays',    icon: Trophy },
  { key: 'calendar', label: 'Content calendar', icon: CalendarDays },
] as const

type TabKey = typeof TABS[number]['key']

function WireIn({ title, blurb, waiting }: { title: string; blurb: string; waiting: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7C3AED] flex items-center justify-center mx-auto mb-4">
        <Rocket className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">{blurb}</p>
      <span className="inline-block mt-5 text-[11px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
        Wire-in · {waiting}
      </span>
    </div>
  )
}

export default function GtmPage({ searchParams }: { searchParams: { tab?: string } }) {
  const active: TabKey = (TABS.some(t => t.key === searchParams.tab) ? searchParams.tab : 'strategy') as TabKey

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Rocket className="w-6 h-6 text-[#7C3AED]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GTM Hub</h1>
          <p className="text-sm text-gray-500 mt-0.5">Go-to-market strategy, results, winning plays and the content calendar.</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-brand-200/60 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => {
          const on = key === active
          return (
            <Link
              key={key}
              href={`/gtm?tab=${key}`}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                on ? 'border-[#7C3AED] text-[#7C3AED]' : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </div>

      {/* Panels — honest shells */}
      {active === 'strategy' && (
        <WireIn
          title="GTM Strategy"
          blurb="Our ICPs, channels, positioning and the plan per channel — the single place the strategy lives so every campaign traces back to it."
          waiting="pending strategy sign-off"
        />
      )}
      {active === 'results' && (
        <WireIn
          title="GTM Results"
          blurb="Funnel and campaign results across channels — sends, replies, meetings, pipeline. Populates the moment our own outreach starts sending."
          waiting="needs our outreach live (M1)"
        />
      )}
      {active === 'plays' && (
        <WireIn
          title="Winning plays"
          blurb="The messages, sequences and angles that actually convert — surfaced so we double down on what works instead of guessing."
          waiting="needs the winning-plays feed"
        />
      )}
      {active === 'calendar' && (
        <WireIn
          title="Content calendar"
          blurb="LinkedIn and blog cadence — what's scheduled, drafted and shipped, so content ships on a rhythm rather than ad-hoc."
          waiting="needs the content feed"
        />
      )}
    </div>
  )
}
