'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Users, TrendingUp, ShieldCheck, DollarSign, Search,
  Target, Zap, ArrowRight, Loader2, Plus, Settings2,
  CheckCircle2, Circle, ChevronRight, BarChart2, Star,
  Globe, Linkedin, FileText, Upload, Filter,
} from 'lucide-react'
import Link from 'next/link'

interface LeadStats {
  total: number
  scored: number
  consented: number
  exported: number
  opted_out: number
  avg_score: number
  pipeline_value_usd: number
}

interface ICP {
  id: string
  name: string
  industries: string[]
  job_titles: string[]
  geographies: string[]
  updated_at?: string
}

function SourceCard({
  icon,
  title,
  description,
  badge,
  href,
  active,
}: {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-start gap-4 p-4 rounded-2xl border transition-all group ${
        active
          ? 'border-[#0066FF]/30 bg-blue-50/30 hover:bg-blue-50/50'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        active ? 'bg-[#0066FF] text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              badge === 'Live' ? 'bg-green-100 text-green-700' :
              badge === 'Beta' ? 'bg-amber-100 text-amber-700' :
                                 'bg-gray-100 text-gray-400'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0066FF] transition-colors shrink-0 mt-1" />
    </Link>
  )
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-gray-500 w-32 text-right shrink-0">{label}</p>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }} />
      </div>
      <div className="flex items-center gap-1.5 w-20 shrink-0">
        <span className="text-sm font-bold text-gray-900">{value.toLocaleString()}</span>
        {pct > 0 && <span className="text-xs text-gray-400">({pct}%)</span>}
      </div>
    </div>
  )
}

export default function LeadGenOverviewPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [icps, setIcps] = useState<ICP[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      try {
        const [statsRes, icpRes] = await Promise.all([
          api.get<{ data: LeadStats }>('/leads/stats', session.access_token),
          api.get<{ data: ICP[] }>('/icps', session.access_token),
        ])
        setStats(statsRes.data)
        setIcps(icpRes.data ?? [])
      } catch { /* ignore */ }
      setLoading(false)
    })
  }, [supabase])

  const s: LeadStats = stats ?? { total: 0, scored: 0, consented: 0, exported: 0, opted_out: 0, avg_score: 0, pipeline_value_usd: 0 }

  const pipelineValue = s.pipeline_value_usd > 0
    ? s.pipeline_value_usd >= 1_000_000
      ? `$${(s.pipeline_value_usd / 1_000_000).toFixed(1)}M`
      : `$${Math.round(s.pipeline_value_usd / 1000)}k`
    : '$0'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#0066FF]" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Product header */}
      <div className="bg-gradient-to-br from-[#001228] to-[#003080] rounded-2xl p-6">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[#0066FF] flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-white">AI Lead Generation</h1>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-400/15 text-green-400 border border-green-400/20">
                Active
              </span>
            </div>
            <p className="text-white/50 text-sm mb-5">
              Precision B2B leads — AI-scored, POPIA-compliant, ready for FIGSY outreach.
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total leads',     value: s.total.toLocaleString() },
                { label: 'AI scored',       value: s.scored.toLocaleString() },
                { label: 'Consented',       value: s.consented.toLocaleString() },
                { label: 'Pipeline value',  value: pipelineValue },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/6 rounded-xl px-4 py-3">
                  <p className="text-white font-bold text-lg">{value}</p>
                  <p className="text-white/35 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: quick actions + sources */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Quick actions</h2>
            <div className="space-y-2">
              <Link
                href="/dashboard/leads"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                <Users className="w-4 h-4" />
                View all leads
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </Link>
              <Link
                href="/dashboard/leads/icp"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
              >
                <Settings2 className="w-4 h-4 text-gray-500" />
                {icps.length > 0 ? `Manage ICPs (${icps.length})` : 'Build your first ICP'}
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-gray-400" />
              </Link>
              {s.consented > 0 && (
                <Link
                  href="/dashboard/figsy"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-blue-100 hover:bg-blue-50 text-[#0066FF] text-sm font-medium transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Send to FIGSY
                  <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                </Link>
              )}
            </div>
          </div>

          {/* Lead sources */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Lead sources</h2>
            <div className="space-y-2">
              <SourceCard
                icon={<Search className="w-5 h-5" />}
                title="Apollo.io"
                description="Pull targeted leads based on your ICP criteria"
                badge="Live"
                href="/dashboard/leads/icp"
                active={s.total > 0}
              />
              <SourceCard
                icon={<Linkedin className="w-5 h-5" />}
                title="LinkedIn"
                description="Import leads from LinkedIn searches and exports"
                badge="Soon"
                href="/dashboard/leads/icp"
                active={false}
              />
              <SourceCard
                icon={<Upload className="w-5 h-5" />}
                title="CSV Upload"
                description="Upload your own lead list and let AI score it"
                badge="Soon"
                href="/dashboard/leads"
                active={false}
              />
            </div>
          </div>
        </div>

        {/* Right: pipeline funnel + ICP list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pipeline funnel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Lead pipeline</h2>
              <Link href="/dashboard/kpis" className="text-xs text-[#0066FF] hover:underline flex items-center gap-0.5">
                Full report <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              <FunnelBar label="Total leads"    value={s.total}     max={s.total}  color="bg-gray-300" />
              <FunnelBar label="AI scored"      value={s.scored}    max={s.total}  color="bg-blue-400" />
              <FunnelBar label="Consented"      value={s.consented} max={s.total}  color="bg-indigo-500" />
              <FunnelBar label="Ready for FIGSY" value={s.consented} max={s.total} color="bg-[#0066FF]" />
            </div>

            {/* Avg score */}
            {s.avg_score > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-3">
                <Star className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-gray-700">
                  Average lead score: <span className="font-bold text-gray-900">{s.avg_score}/100</span>
                  <span className="text-gray-400 ml-2 text-xs">
                    {s.avg_score >= 70 ? '— High quality' : s.avg_score >= 50 ? '— Good fit' : '— Building'}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* ICP list */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Ideal Customer Profiles</h2>
              <Link
                href="/dashboard/leads/icp"
                className="flex items-center gap-1.5 text-xs font-medium text-[#0066FF] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> New ICP
              </Link>
            </div>

            {icps.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-8 h-8 mx-auto mb-3 text-gray-200" />
                <p className="text-sm font-medium text-gray-600 mb-1">No ICPs yet</p>
                <p className="text-xs text-gray-400 mb-4">Define who you want to target so K.I.N.D knows who to find.</p>
                <Link
                  href="/dashboard/leads/icp"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" /> Build your ICP
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {icps.map(icp => (
                  <Link
                    key={icp.id}
                    href="/dashboard/leads/icp"
                    className="flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-100 hover:border-[#0066FF]/20 hover:bg-blue-50/20 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <Target className="w-4 h-4 text-[#0066FF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{icp.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {[
                          icp.industries.slice(0, 2).join(', '),
                          icp.job_titles.slice(0, 2).join(', '),
                          icp.geographies.slice(0, 1).join(''),
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* POPIA compliance notice */}
          <div className="flex items-start gap-3 px-4 py-3.5 bg-green-50 border border-green-100 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">POPIA & GDPR compliant by design</p>
              <p className="text-xs text-green-600 mt-0.5">
                All leads sourced with consent filters active. Opt-outs permanently suppressed.{' '}
                <span className="font-semibold">{s.consented} leads</span> are currently consented for outreach.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
