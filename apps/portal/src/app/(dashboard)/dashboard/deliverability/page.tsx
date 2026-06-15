'use client'

/**
 * DELIVERABILITY DASHBOARD (#48)
 * --------------------------------------------------------------------------
 * Inbox-health monitoring. Composed entirely from existing endpoints — no new
 * backend, no fabricated numbers:
 *   • /figsy/pulse       → today's warmup cap + emails sent today
 *   • /figsy/sends-daily → 14-day send-volume series
 *   • /figsy/kpis        → open rate, reply rate, opt-outs (all-time)
 *
 * Bounce/spam-complaint rates are intentionally NOT shown as numbers: the
 * platform has no reliable per-client source for them yet, and inventing them
 * would breach the honesty rule. The health band is derived from opt-out rate.
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Loader2, ShieldCheck, Send, MailOpen, MessageSquare,
  AlertTriangle, TrendingUp, Flame, RefreshCw, Info,
} from 'lucide-react'

interface Pulse { active_campaigns: number; sent_today: number; warmup_cap: number | null; credit_balance: number }
interface Kpis { totalSent: number; totalReplied: number; replyRate: number; optOuts: number; totalOpened?: number; openRate?: number }
interface DayPoint { date: string; count: number }

function pct(n: number) { return `${(n * 100).toFixed(1)}%` }

export default function DeliverabilityPage() {
  const supabase = createClient()
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [series, setSeries] = useState<DayPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const t = session.access_token
      const [p, k, s] = await Promise.all([
        api.get<{ data: Pulse }>('/figsy/pulse', t),
        api.get<{ data: Kpis }>('/figsy/kpis', t),
        api.get<{ data: DayPoint[] }>('/figsy/sends-daily?days=14', t),
      ])
      setPulse(p.data); setKpis(k.data); setSeries(s.data ?? [])
    } catch { /* keep last good */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#7C3AED]">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  const sentToday = pulse?.sent_today ?? 0
  const cap = pulse?.warmup_cap ?? null
  const capPct = cap && cap > 0 ? Math.min(100, Math.round((sentToday / cap) * 100)) : null
  const optOutRate = kpis && kpis.totalSent > 0 ? kpis.optOuts / kpis.totalSent : 0
  const openRate = kpis?.openRate ?? 0
  const replyRate = kpis?.replyRate ?? 0

  // Health band derived from opt-out rate (the one reliable risk signal we have).
  const health = optOutRate <= 0.005
    ? { label: 'Healthy', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' }
    : optOutRate <= 0.02
      ? { label: 'Watch', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' }
      : { label: 'At risk', color: 'text-red-700', bg: 'bg-red-50 border-red-200', dot: 'bg-red-400' }

  const maxCount = Math.max(1, ...series.map(d => d.count))

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#7C3AED]" /> Deliverability
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Inbox health, warmup pacing, and engagement signals.</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); load() }}
          className="flex items-center gap-1.5 text-xs font-medium text-[#7C3AED] hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Health band */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${health.bg}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${health.dot} animate-pulse`} />
        <div className="flex-1">
          <p className={`text-sm font-bold ${health.color}`}>Sender health: {health.label}</p>
          <p className="text-xs text-gray-500">Opt-out rate {pct(optOutRate)} across {kpis?.totalSent ?? 0} sends · keeping it under 0.5% keeps you out of spam folders.</p>
        </div>
      </div>

      {/* Warmup pacing */}
      <div className="rounded-xl border border-purple-100/60 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Warmup pacing — today
          </h2>
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
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${capPct}%`, background: (capPct ?? 0) >= 90 ? '#ea580c' : '#7C3AED' }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              The cap ramps automatically as the domain warms — 10/day → 20 → 30 → 40 → 50. Sends above the cap defer to tomorrow, never drop.
            </p>
          </>
        ) : (
          <div className="flex items-start gap-2 text-sm text-gray-500">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
            <span>No warmup cap configured. Sends are unthrottled. Set <code className="text-xs bg-gray-100 px-1 rounded">FIGSY_WARMUP_START</code> to enable auto-ramp pacing.</span>
          </div>
        )}
      </div>

      {/* Engagement metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric icon={<Send className="w-4 h-4" />} label="Sent (all time)" value={String(kpis?.totalSent ?? 0)} />
        <Metric icon={<MailOpen className="w-4 h-4" />} label="Open rate" value={pct(openRate)} accent={openRate >= 0.3} />
        <Metric icon={<MessageSquare className="w-4 h-4" />} label="Reply rate" value={pct(replyRate)} accent={replyRate >= 0.05} />
        <Metric icon={<AlertTriangle className="w-4 h-4" />} label="Opt-outs" value={String(kpis?.optOuts ?? 0)} warn={optOutRate > 0.02} />
      </div>

      {/* 14-day send volume */}
      <div className="rounded-xl border border-purple-100/60 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#7C3AED]" /> Send volume — last 14 days
        </h2>
        {series.length === 0 ? (
          <p className="text-sm text-gray-400">No sends recorded yet.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-32">
            {series.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full flex items-end justify-center h-full">
                  <div
                    className="w-full max-w-[28px] rounded-t bg-[#7C3AED]/80 hover:bg-[#7C3AED] transition-colors relative"
                    style={{ height: `${Math.max(4, (d.count / maxCount) * 100)}%` }}
                    title={`${d.date}: ${d.count} sent`}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.count}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] text-gray-400">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
        <Info className="w-3 h-3" />
        Bounce and spam-complaint rates are not yet tracked per client — they’ll appear here once inbound delivery webhooks are wired (D9).
      </p>
    </div>
  )
}

function Metric({ icon, label, value, accent, warn }: {
  icon: React.ReactNode; label: string; value: string; accent?: boolean; warn?: boolean
}) {
  const border = accent ? 'border-emerald-200 bg-emerald-50/30' : warn ? 'border-amber-200 bg-amber-50/30' : 'border-purple-100/60 bg-white'
  const iconBg = accent ? 'bg-emerald-100 text-emerald-600' : warn ? 'bg-amber-100 text-amber-600' : 'bg-[#7C3AED]/10 text-[#7C3AED]'
  const valColor = accent ? 'text-emerald-700' : warn ? 'text-amber-700' : 'text-gray-900'
  return (
    <div className={`rounded-xl border p-4 ${border}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${iconBg}`}>{icon}</div>
      <p className={`text-xl font-bold ${valColor}`}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
