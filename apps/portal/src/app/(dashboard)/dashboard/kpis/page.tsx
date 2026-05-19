'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Loader2, Send, MessageSquare, ThumbsUp, MinusCircle,
  Users, Star, DollarSign, ShieldCheck, TrendingUp,
  Target, Zap, ArrowRight,
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
}

function StatCard({
  label, value, sub, icon, accent = false, warn = false,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  accent?: boolean
  warn?: boolean
}) {
  const border = accent ? 'border-green-200 bg-green-50/30' : warn ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 bg-white'
  const valColor = accent ? 'text-green-700' : warn ? 'text-amber-700' : 'text-gray-900'
  return (
    <div className={`rounded-xl border p-5 ${border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ? 'bg-green-100 text-green-600' : warn ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${valColor}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-right text-xs text-gray-500 shrink-0">{label}</div>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }} />
      </div>
      <div className="w-20 flex items-center gap-1">
        <span className="text-sm font-semibold text-gray-900">{value.toLocaleString()}</span>
        <span className="text-xs text-gray-400">{pct > 0 ? `(${pct}%)` : ''}</span>
      </div>
    </div>
  )
}

function Benchmark({ label, value, good, ok }: { label: string; value: number; good: number; ok: number }) {
  const pct = Math.round(value * 100 * 10) / 10
  const status = value >= good ? 'good' : value >= ok ? 'ok' : 'low'
  const dot = status === 'good' ? 'bg-green-400' : status === 'ok' ? 'bg-amber-400' : 'bg-gray-300'
  const text = status === 'good' ? 'text-green-700' : status === 'ok' ? 'text-amber-700' : 'text-gray-400'
  const label2 = status === 'good' ? 'Great' : status === 'ok' ? 'Good' : 'Building'
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">{pct}%</span>
        <span className={`flex items-center gap-1 text-xs font-medium ${text}`}>
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          {label2}
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      try {
        const [leadsRes, figsyRes] = await Promise.all([
          api.get<{ success: boolean; data: LeadStats }>('/leads/stats', session.access_token),
          api.get<{ success: boolean; data: FigsyKPIs }>('/figsy/kpis', session.access_token),
        ])
        setLeads(leadsRes.data)
        setFigsy(figsyRes.data)
      } catch { }
      setLoading(false)
    })
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  const l: LeadStats = leads ?? { total: 0, scored: 0, consented: 0, exported: 0, opted_out: 0, avg_score: 0, pipeline_value_usd: 0 }
  const f: FigsyKPIs = figsy ?? { totalSent: 0, totalReplied: 0, replyRate: 0, interested: 0, interestedRate: 0, optOuts: 0, activeCampaigns: 0, totalLeads: 0, leadsContacted: 0, avgScore: 0 }

  const pipelineValue = l.pipeline_value_usd > 0
    ? l.pipeline_value_usd >= 1000000
      ? `$${(l.pipeline_value_usd / 1000000).toFixed(1)}M`
      : `$${Math.round(l.pipeline_value_usd / 1000)}k`
    : '$0'

  const oneInEvery = f.interested > 0 && f.totalReplied > 0
    ? Math.round(f.totalReplied / f.interested)
    : null

  const contacted = f.leadsContacted > 0 ? f.leadsContacted : f.totalSent > 0 ? Math.ceil(f.totalSent / 3) : 0

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KPI Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Live performance across your lead pipeline and FIGSY outreach campaigns.</p>
      </div>

      {/* Lead Gen stat cards */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Lead Pipeline</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total leads" value={l.total.toLocaleString()} icon={<Users className="w-4 h-4" />} />
          <StatCard
            label="Avg lead score"
            value={l.avg_score > 0 ? `${l.avg_score}/100` : '—'}
            sub={l.avg_score >= 70 ? 'High quality' : l.avg_score >= 50 ? 'Good fit' : undefined}
            icon={<Star className="w-4 h-4" />}
            accent={l.avg_score >= 70}
          />
          <StatCard label="POPIA consented" value={l.consented.toLocaleString()} icon={<ShieldCheck className="w-4 h-4" />} accent={l.consented > 0} />
          <StatCard label="Pipeline value" value={pipelineValue} sub="estimated deal value" icon={<DollarSign className="w-4 h-4" />} accent={l.pipeline_value_usd > 0} />
        </div>
      </div>

      {/* FIGSY stat cards */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">FIGSY Outreach</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Emails sent" value={f.totalSent.toLocaleString()} icon={<Send className="w-4 h-4" />} />
          <StatCard
            label="Reply rate"
            value={f.totalSent > 0 ? `${(f.replyRate * 100).toFixed(1)}%` : '—'}
            sub="industry avg ~8%"
            icon={<MessageSquare className="w-4 h-4" />}
            accent={f.replyRate >= 0.08}
            warn={f.totalSent > 0 && f.replyRate > 0 && f.replyRate < 0.03}
          />
          <StatCard
            label="Interested replies"
            value={f.interested.toLocaleString()}
            sub={f.interested > 0 ? `${(f.interestedRate * 100).toFixed(1)}% of emails` : undefined}
            icon={<ThumbsUp className="w-4 h-4" />}
            accent={f.interested > 0}
          />
          <StatCard label="Active campaigns" value={f.activeCampaigns.toLocaleString()} icon={<Zap className="w-4 h-4" />} accent={f.activeCampaigns > 0} />
        </div>
      </div>

      {/* Pipeline funnel + benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Pipeline funnel</h2>
          <div className="space-y-3">
            <FunnelBar label="Total leads" value={l.total} max={l.total} color="bg-blue-400" />
            <div className="flex items-center pl-28 text-gray-300"><ArrowRight className="w-4 h-4" /></div>
            <FunnelBar label="AI scored" value={l.scored} max={l.total} color="bg-indigo-400" />
            <div className="flex items-center pl-28 text-gray-300"><ArrowRight className="w-4 h-4" /></div>
            <FunnelBar label="FIGSY contacted" value={contacted} max={l.total} color="bg-purple-400" />
            <div className="flex items-center pl-28 text-gray-300"><ArrowRight className="w-4 h-4" /></div>
            <FunnelBar label="Replied" value={f.totalReplied} max={l.total} color="bg-amber-400" />
            <div className="flex items-center pl-28 text-gray-300"><ArrowRight className="w-4 h-4" /></div>
            <FunnelBar label="Interested" value={f.interested} max={l.total} color="bg-green-400" />
          </div>
        </div>

        {/* Benchmarks + Insights */}
        <div className="space-y-4">
          {f.totalSent > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Outreach benchmarks</h2>
              <p className="text-xs text-gray-400 mb-3">vs industry averages for cold B2B outreach</p>
              <Benchmark label="Reply rate" value={f.replyRate} good={0.08} ok={0.03} />
              <Benchmark label="Interested rate" value={f.interestedRate} good={0.02} ok={0.005} />
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Key insights</h2>
            {l.total === 0 ? (
              <p className="text-sm text-gray-400">Build your first ICP in Lead Gen to start seeing metrics here.</p>
            ) : (
              <>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">{l.scored}</span> of{' '}
                  <span className="font-semibold text-gray-900">{l.total}</span> leads have been AI-scored.
                </p>
                {f.totalSent > 0 && (
                  <p className="text-sm text-gray-700">
                    FIGSY sent <span className="font-semibold text-gray-900">{f.totalSent.toLocaleString()}</span> emails
                    and received <span className="font-semibold text-gray-900">{f.totalReplied}</span> replies.
                  </p>
                )}
                {oneInEvery !== null && (
                  <p className="text-sm text-gray-700">
                    1 in every <span className="font-semibold text-gray-900">{oneInEvery}</span> replies is a warm lead.
                  </p>
                )}
                {l.pipeline_value_usd > 0 && (
                  <p className="text-sm text-gray-700">
                    Estimated pipeline value: <span className="font-semibold text-green-700">{pipelineValue}</span>
                  </p>
                )}
                {f.optOuts > 0 && (
                  <p className="text-sm text-gray-500">
                    {f.optOuts} leads have opted out and are permanently blocked.
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
