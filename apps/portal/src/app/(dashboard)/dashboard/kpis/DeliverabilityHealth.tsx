'use client'

// Sender-health + warmup-pacing — the two signals that used to live on the standalone
// Deliverability page. Folded into Performance (item 195 PR-2) so clients have TWO
// metric surfaces, not three. Self-contained: fetches /figsy/pulse + /figsy/kpis itself.
// (The old page's engagement cards duplicated Performance; its send-volume chart
// duplicates Analytics' "Outreach Metrics Over Time" — so only these two move here.)

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Flame, Info } from 'lucide-react'

interface Pulse { active_campaigns: number; sent_today: number; warmup_cap: number | null }
interface Kpis { totalSent: number; optOuts: number }

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export function DeliverabilityHealth() {
  const supabase = createClient()
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const [kpis, setKpis] = useState<Kpis | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const [p, k] = await Promise.all([
          api.get<{ data: Pulse }>('/figsy/pulse', session.access_token),
          api.get<{ data: Kpis }>('/figsy/kpis', session.access_token),
        ])
        setPulse(p.data); setKpis(k.data)
      } catch { /* keep empty — section just renders neutral */ }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sentToday = pulse?.sent_today ?? 0
  const cap = pulse?.warmup_cap ?? null
  const capPct = cap && cap > 0 ? Math.min(100, Math.round((sentToday / cap) * 100)) : null
  const optOutRate = kpis && kpis.totalSent > 0 ? kpis.optOuts / kpis.totalSent : 0

  // Health band derived from opt-out rate (the one reliable risk signal we have).
  const health = optOutRate <= 0.005
    ? { label: 'Healthy', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' }
    : optOutRate <= 0.02
      ? { label: 'Watch', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' }
      : { label: 'At risk', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-400' }

  return (
    <div className="space-y-3 mb-3">
      {/* Sender health */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${health.bg}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${health.dot} animate-pulse`} />
        <div className="flex-1">
          <p className={`text-sm font-bold ${health.color}`}>Sender health: {health.label}</p>
          <p className="text-xs text-gray-500">Opt-out rate {pct(optOutRate)} across {kpis?.totalSent ?? 0} sends · under 0.5% keeps you out of spam folders.</p>
        </div>
      </div>

      {/* Warmup pacing */}
      <div className="rounded-xl border border-purple-100/60 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Warmup pacing — today
          </h3>
          <span className="text-xs text-gray-400">
            {pulse?.active_campaigns ?? 0} active campaign{(pulse?.active_campaigns ?? 0) === 1 ? '' : 's'}
          </span>
        </div>
        {cap !== null ? (
          <>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-gray-900">{sentToday}</span>
              <span className="text-sm text-gray-400">/ {cap} cold emails today</span>
            </div>
            <div className="h-2.5 rounded-full bg-purple-50 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${capPct ?? 0}%`, background: (capPct ?? 0) >= 90 ? '#ea580c' : '#7C3AED' }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              The cap ramps automatically as the domain warms — 10/day → 20 → 30 → 40 → 50. Sends above the cap defer to tomorrow, never drop.
            </p>
          </>
        ) : (
          <div className="flex items-start gap-2 text-sm text-gray-500">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <span>No warmup cap configured — sends are unthrottled.</span>
          </div>
        )}
      </div>
    </div>
  )
}
