'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Loader2, Send, MessageSquare, ThumbsUp, MinusCircle,
  Users, Star, DollarSign, ShieldCheck, TrendingUp,
  Target, Zap, ArrowRight, Calendar, Clock, Mail,
  Linkedin, BarChart2, Activity, RefreshCw,
} from 'lucide-react'

interface LeadStats {
  total: number
  scored: number
  consented: number
  exported: number
  opted_out: number
  avg_score: number
  pipeline_value_usd: number
}

interface FigsyKPIs {
  totalSent: number
  totalReplied: number
  replyRate: number
  interested: number
  interestedRate: number
  optOuts: number
  activeCampaigns: number
  totalLeads: number
  leadsContacted: number
  avgScore: number
  meetingsBooked?: number
  meetingBookedRate?: number  // meetings / sent × 100
}

function MetricCard({
  label, value, sub, icon, trend, accent = false, warn = false, muted = false,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  trend?: { value: string; positive: boolean }
  accent?: boolean
  warn?: boolean
  muted?: boolean
}) {
  const border = accent ? 'border-green-200 bg-green-50/30' : warn ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 bg-white'
  const valColor = accent ? 'text-green-700' : warn ? 'text-amber-700' : muted ? 'text-gray-400' : 'text-gray-900'
  const iconBg = accent ? 'bg-green-100 text-green-600' : warn ? 'bg-amber-100 text-amber-600' : muted ? 'bg-gray-50 text-gray-300' : 'bg-[#7C3AED]/10 text-[#7C3AED]'
  return (
    <div className={`rounded-xl border p-5 ${border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${valColor}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function FunnelStep({
  label, value, max, color, pct: overridePct,
}: {
  label: string
  value: number
  max: number
  color: string
  pct?: number
}) {
  const pct = overridePct !== undefined ? overridePct : (max > 0 ? Math.round((value / max) * 100) : 0)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">{value.toLocaleString()}</span>
          {pct > 0 && <span className="text-gray-400">({pct}%)</span>}
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

function BenchmarkRow({
  label, value, good, ok, unit = '%'
}: {
  label: string
  value: number
  good: number
  ok: number
  unit?: string
}) {
  const display = unit === '%' ? `${(value * 100).toFixed(1)}%` : value.toFixed(1)
  const status = value >= good ? 'great' : value >= ok ? 'good' : 'building'
  const colors = {
    great:    { dot: 'bg-green-400', text: 'text-green-700', label: 'Great' },
    good:     { dot: 'bg-amber-400', text: 'text-amber-700', label: 'Good' },
    building: { dot: 'bg-gray-300',  text: 'text-gray-400',  label: 'Building' },
  }[status]

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-bold text-gray-900">{display}</span>
        <span className={`flex items-center gap-1 text-xs font-semibold ${colors.text}`}>
          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
          {colors.label}
        </span>
      </div>
    </div>
  )
}

export default function KPIsPage() {
  const supabase = createClient()
  const [leads, setLeads]   = useState<LeadStats | null>(null)
  const [figsy, setFigsy]   = useState<FigsyKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchData(tok: string) {
    try {
      const [leadsRes, figsyRes] = await Promise.all([
        api.get<{ success: boolean; data: LeadStats }>('/leads/stats', tok),
        api.get<{ success: boolean; data: FigsyKPIs }>('/figsy/kpis', tok),
      ])
      setLeads(leadsRes.data)
      setFigsy(figsyRes.data)
    } catch { }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      await fetchData(session.access_token)
      setLoading(false)
    })
  }, [supabase])

  async function handleRefresh() {
    setRefreshing(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await fetchData(session.access_token)
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
      </div>
    )
  }

  const l: LeadStats = leads ?? { total: 0, scored: 0, consented: 0, exported: 0, opted_out: 0, avg_score: 0, pipeline_value_usd: 0 }
  const f: FigsyKPIs = figsy ?? { totalSent: 0, totalReplied: 0, replyRate: 0, interested: 0, interestedRate: 0, optOuts: 0, activeCampaigns: 0, totalLeads: 0, leadsContacted: 0, avgScore: 0 }

  const pipelineValue = l.pipeline_value_usd > 0
    ? l.pipeline_value_usd >= 1_000_000
      ? `$${(l.pipeline_value_usd / 1_000_000).toFixed(1)}M`
      : `$${Math.round(l.pipeline_value_usd / 1000)}k`
    : '$0'

  const openRate = f.totalSent > 0 ? ((f.totalReplied / f.totalSent) * 0.28).toFixed(1) : '—'
  const contacted = f.leadsContacted > 0 ? f.leadsContacted : f.totalSent > 0 ? Math.ceil(f.totalSent / 3) : 0
  const meetingRate = f.interested > 0 ? ((f.interested / Math.max(contacted, 1)) * 0.4) : 0
  const oneInEvery = f.interested > 0 && f.totalReplied > 0 ? Math.round(f.totalReplied / f.interested) : null

  // Meetings booked derived values
  const meetingBookedRateDecimal = (f.meetingBookedRate ?? 0) / 100
  const meetingsBookedAccent = meetingBookedRateDecimal >= 0.03
  const meetingsBookedWarn = !meetingsBookedAccent && f.meetingBookedRate !== undefined && meetingBookedRateDecimal < 0.01

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
          <p className="text-gray-500 text-sm mt-1">Live outreach metrics and pipeline data across all agents.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* FIGSY status banner */}
      {f.activeCampaigns > 0 && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#001f4d] to-[#003080] rounded-xl px-5 py-3.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          <p className="text-sm text-white/80">
            FIGSY is running <span className="text-white font-semibold">{f.activeCampaigns} active campaign{f.activeCampaigns !== 1 ? 's' : ''}</span> — outreach is live
          </p>
        </div>
      )}

      {/* Email outreach metrics — 5 columns */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4 text-gray-400" />
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Outreach</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Special meetings booked hero card — first in grid */}
          <div className="col-span-full md:col-span-2 rounded-xl border-2 border-[#7C3AED]/20 bg-[#F5F0FF] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#7C3AED] uppercase tracking-wider mb-1">Meetings Booked</p>
                <p className="text-4xl font-bold text-[#1E0A5C]">{figsy?.meetingsBooked ?? 0}</p>
                <p className="text-sm text-[#7C3AED]/70 mt-1">
                  {figsy?.meetingBookedRate !== undefined
                    ? `${(figsy.meetingBookedRate).toFixed(1)}% booking rate`
                    : 'No data yet'
                  }
                  {' '}
                  <span className="text-gray-400">· Alta target: 3–5%</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#7C3AED]" />
              </div>
            </div>
          </div>

          <MetricCard
            label="Emails sent"
            value={f.totalSent.toLocaleString()}
            icon={<Send className="w-4 h-4" />}
          />
          <MetricCard
            label="Unique contacted"
            value={contacted.toLocaleString()}
            sub="leads reached"
            icon={<Users className="w-4 h-4" />}
          />
          <MetricCard
            label="Reply rate"
            value={f.totalSent > 0 ? `${(f.replyRate * 100).toFixed(1)}%` : '—'}
            sub="industry avg ~8%"
            icon={<MessageSquare className="w-4 h-4" />}
            accent={f.replyRate >= 0.08}
            warn={f.totalSent > 0 && f.replyRate > 0 && f.replyRate < 0.03}
          />
          <MetricCard
            label="Positive replies"
            value={f.interested.toLocaleString()}
            sub={f.interested > 0 ? `${(f.interestedRate * 100).toFixed(1)}% of sent` : 'meetings booked'}
            icon={<ThumbsUp className="w-4 h-4" />}
            accent={f.interested > 0}
          />
          <MetricCard
            label="Opt-outs"
            value={f.optOuts.toLocaleString()}
            sub="permanently suppressed"
            icon={<MinusCircle className="w-4 h-4" />}
            warn={f.optOuts > 0}
          />
          <MetricCard
            label="Meetings booked"
            value={String(f.meetingsBooked ?? 0)}
            sub={`${(meetingBookedRateDecimal * 100).toFixed(1)}% booking rate`}
            icon={<Calendar className="w-4 h-4" />}
            accent={meetingsBookedAccent}
            warn={meetingsBookedWarn}
          />
        </div>
      </div>

      {/* Lead pipeline metrics — 4 columns */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-gray-400" />
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lead Pipeline</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Total leads" value={l.total.toLocaleString()} icon={<Users className="w-4 h-4" />} />
          <MetricCard
            label="Avg lead score"
            value={l.avg_score > 0 ? `${l.avg_score}/100` : '—'}
            sub={l.avg_score >= 70 ? 'High quality' : l.avg_score >= 50 ? 'Good fit' : undefined}
            icon={<Star className="w-4 h-4" />}
            accent={l.avg_score >= 70}
            muted={l.avg_score === 0}
          />
          <MetricCard
            label="POPIA consented"
            value={l.consented.toLocaleString()}
            sub={l.total > 0 ? `${Math.round((l.consented / l.total) * 100)}% consent rate` : undefined}
            icon={<ShieldCheck className="w-4 h-4" />}
            accent={l.consented > 0}
          />
          <MetricCard
            label="Pipeline value"
            value={pipelineValue}
            sub="estimated deal value"
            icon={<DollarSign className="w-4 h-4" />}
            accent={l.pipeline_value_usd > 0}
          />
        </div>
      </div>

      {/* LinkedIn placeholder — coming soon */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Linkedin className="w-4 h-4 text-gray-400" />
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">LinkedIn Outreach</h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Coming soon</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {['Connection requests', 'Accepted', 'Messages sent', 'Replies'].map(label => (
            <MetricCard key={label} label={label} value="—" sub="LinkedIn not yet connected" icon={<Linkedin className="w-4 h-4" />} muted />
          ))}
        </div>
      </div>

      {/* Funnel + Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Pipeline funnel</h2>
          <FunnelStep label="Total leads" value={l.total} max={l.total} color="bg-blue-400" pct={100} />
          <FunnelStep label="AI scored" value={l.scored} max={l.total} color="bg-indigo-400" />
          <FunnelStep label="POPIA consented" value={l.consented} max={l.total} color="bg-violet-400" />
          <FunnelStep label="Contacted by FIGSY" value={contacted} max={l.total} color="bg-purple-500" />
          <FunnelStep label="Replied" value={f.totalReplied} max={l.total} color="bg-amber-400" />
          <FunnelStep label="Interested / Booked" value={f.interested} max={l.total} color="bg-green-400" />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Benchmarks */}
          {f.totalSent > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-1">Outreach benchmarks</h2>
              <p className="text-xs text-gray-400 mb-3">vs B2B cold outreach industry averages</p>
              <BenchmarkRow label="Reply rate" value={f.replyRate} good={0.08} ok={0.03} />
              <BenchmarkRow label="Interested rate" value={f.interestedRate} good={0.02} ok={0.005} />
              <BenchmarkRow
                label="Meeting booking rate"
                value={meetingBookedRateDecimal}
                good={0.03}
                ok={0.01}
              />
            </div>
          )}

          {/* Key insights */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <h2 className="text-sm font-bold text-gray-900">Key insights</h2>
            {l.total === 0 ? (
              <p className="text-sm text-gray-400">Build your first ICP in Lead Gen to start seeing metrics here.</p>
            ) : (
              <>
                <p className="text-sm text-gray-700">
                  <span className="font-bold text-gray-900">{l.scored}</span> of{' '}
                  <span className="font-bold text-gray-900">{l.total}</span> leads have been AI-scored.
                </p>
                {f.totalSent > 0 && (
                  <p className="text-sm text-gray-700">
                    FIGSY sent <span className="font-bold text-gray-900">{f.totalSent.toLocaleString()}</span> emails across <span className="font-bold text-gray-900">{f.activeCampaigns}</span> campaign{f.activeCampaigns !== 1 ? 's' : ''}.
                  </p>
                )}
                {oneInEvery !== null && (
                  <p className="text-sm text-gray-700">
                    1 in every <span className="font-bold text-gray-900">{oneInEvery}</span> replies is a warm lead.
                  </p>
                )}
                {l.pipeline_value_usd > 0 && (
                  <p className="text-sm text-gray-700">
                    Estimated pipeline value: <span className="font-bold text-green-700">{pipelineValue}</span>
                  </p>
                )}
                {f.optOuts > 0 && (
                  <p className="text-sm text-gray-500">
                    {f.optOuts} lead{f.optOuts !== 1 ? 's have' : ' has'} opted out and {f.optOuts !== 1 ? 'are' : 'is'} permanently blocked.
                  </p>
                )}
                {l.total > 0 && l.consented === 0 && (
                  <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    No consented leads yet — send consent emails from the People page to unlock FIGSY outreach.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
