export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { Rocket, Target, TrendingUp, Trophy, CalendarDays, Filter } from 'lucide-react'

// M3 · Admin GTM hub (#278 + #291). Strategy · Results · Winning plays · Content
// calendar are honest wire-in SHELLS. The FUNNEL tab (#291) is LIVE: it joins the
// visitor → signup → trial → paid stages that already exist but were never joined,
// with real conversion rates. NO fake data — each stage degrades to an honest state
// when its source has nothing yet. CAC-by-channel stays out (needs ad-spend, ⏸).

const TABS = [
  { key: 'strategy', label: 'Strategy',         icon: Target },
  { key: 'funnel',   label: 'Funnel',           icon: Filter },
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

// ── #291 · the marketing funnel, JOINED from the stages that already exist ──
interface FunnelData { visitors: number; signups: number; trials: number; paid: number; dbReady: boolean }

async function getFunnel(): Promise<FunnelData> {
  const API = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
  const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || ''

  // Top of funnel — visitor sessions from the tracking API (same source as /visitors).
  let visitors = 0
  try {
    const res = await fetch(`${API}/track/admin/visitors`, { headers: { 'x-admin-key': ADMIN_KEY }, cache: 'no-store' })
    if (res.ok) { const j = await res.json(); visitors = Array.isArray(j) ? j.length : 0 }
  } catch { /* honest 0 if tracking unreachable */ }

  // Signups / trial / paid — real counts from Supabase (same pattern as the Cockpit).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { visitors, signups: 0, trials: 0, paid: 0, dbReady: false }
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const [{ count: signups }, { count: trials }, { count: paid }] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trialing'),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])
  return { visitors, signups: signups || 0, trials: trials || 0, paid: paid || 0, dbReady: true }
}

// conversion a→b as a %; honest '—' when the prior stage is empty (no divide-by-zero lie)
const rate = (b: number, a: number) => (a > 0 ? Math.round((b / a) * 100) + '%' : '—')

function FunnelView({ f }: { f: FunnelData }) {
  const stages: { label: string; value: number; note: string; conv: string | null }[] = [
    { label: 'Visitors',  value: f.visitors, note: 'tracked website sessions', conv: null },
    { label: 'Signups',   value: f.signups,  note: 'clients created',          conv: rate(f.signups, f.visitors) },
    { label: 'Trialing',  value: f.trials,   note: 'active trials',            conv: rate(f.trials, f.signups) },
    { label: 'Paid',      value: f.paid,     note: 'active paid subs',         conv: rate(f.paid, f.trials) },
  ]
  const max = Math.max(1, ...stages.map(s => s.value))
  return (
    <div className="space-y-6">
      {!f.dbReady && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 inline-block">
          Supabase env not set here — signup/trial/paid read 0. Visitor count is live.
        </div>
      )}
      {f.visitors === 0 && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 inline-block">
          No visitor sessions tracked yet — add the tracking snippet (Visitors page) so the top of the funnel fills. Signup→paid below are live.
        </div>
      )}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 p-6">
        <div className="space-y-3">
          {stages.map((s, i) => (
            <div key={s.label}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm font-semibold text-gray-900">{s.label}</span>
                <span className="text-sm text-gray-500">
                  <b className="text-gray-900">{s.value.toLocaleString()}</b> · {s.note}
                  {s.conv && <span className="ml-2 text-[11px] font-semibold text-[#7C3AED]">{s.conv} of {stages[i - 1].label.toLowerCase()}</span>}
                </span>
              </div>
              <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
                <div className="h-full rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#4C1D95]" style={{ width: `${Math.max(2, Math.round((s.value / max) * 100))}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-purple-50 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span className="text-gray-500">Visitor→Paid: <b className="text-gray-900">{rate(f.paid, f.visitors)}</b></span>
          <span className="text-gray-500">Trial→Paid (CVR): <b className="text-gray-900">{rate(f.paid, f.trials)}</b></span>
        </div>
      </div>
      <div className="bg-white border border-dashed border-purple-200 rounded-2xl p-5 text-sm text-gray-500">
        📉 <b className="text-gray-700">CAC by channel</b> and source attribution need ad-spend + a per-visitor source tag — not wired yet (needs spend data). The stage counts above are live.
      </div>
    </div>
  )
}

export default async function GtmPage({ searchParams }: { searchParams: { tab?: string } }) {
  const active: TabKey = (TABS.some(t => t.key === searchParams.tab) ? searchParams.tab : 'strategy') as TabKey
  const funnel = active === 'funnel' ? await getFunnel() : null

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Rocket className="w-6 h-6 text-[#7C3AED]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GTM Hub</h1>
          <p className="text-sm text-gray-500 mt-0.5">Go-to-market strategy, the conversion funnel, results, winning plays and the content calendar.</p>
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

      {/* Panels */}
      {active === 'strategy' && (
        <WireIn
          title="GTM Strategy"
          blurb="Our ICPs, channels, positioning and the plan per channel — the single place the strategy lives so every campaign traces back to it."
          waiting="pending strategy sign-off"
        />
      )}
      {active === 'funnel' && funnel && <FunnelView f={funnel} />}
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
