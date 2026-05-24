'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Loader2, Users, Send, MessageSquare, ThumbsUp,
  TrendingUp, BarChart2, Target, Star,
} from 'lucide-react'

interface MonthPoint {
  month:      string
  leads:      number
  emails:     number
  replies:    number
  interested: number
}

interface IcpPoint {
  id:        string
  name:      string
  leads:     number
  avg_score: number
}

interface ScoreBucket { label: string; count: number }
interface IndustryPoint { industry: string; count: number }

interface AnalyticsData {
  byMonth:       MonthPoint[]
  icpBreakdown:  IcpPoint[]
  scoreDist:     ScoreBucket[]
  topIndustries: IndustryPoint[]
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────
function MiniBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const h = max > 0 ? Math.max(Math.round((value / max) * 80), value > 0 ? 4 : 0) : 0
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-semibold text-gray-700">{value > 0 ? value : ''}</span>
      <div className="w-7 bg-gray-100 rounded-sm overflow-hidden" style={{ height: 80 }}>
        <div className={`w-full rounded-sm transition-all ${color}`} style={{ height: h, marginTop: 80 - h }} />
      </div>
      <span className="text-[10px] text-gray-400 text-center leading-tight">{label}</span>
    </div>
  )
}

// ── Horizontal bar ─────────────────────────────────────────────────────────────
function HBar({ value, max, color, label, sub }: { value: number; max: number; color: string; label: string; sub?: string }) {
  const w = max > 0 ? Math.max(Math.round((value / max) * 100), value > 0 ? 3 : 0) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 text-right shrink-0">
        <p className="text-xs text-gray-700 font-medium truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-900 w-8 text-right">{value}</span>
    </div>
  )
}

export default function AnalyticsPage() {
  const supabase = createClient()
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [data, setData]         = useState<AnalyticsData | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const res = await api.get<{ data: AnalyticsData }>('/leads/analytics', session.access_token)
        setData(res.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics — please refresh.')
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-600 font-medium mb-2">Could not load analytics</p>
        <p className="text-sm text-gray-500">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 transition-colors">
          Retry
        </button>
      </div>
    </div>
  )

  if (!data) return null

  const maxLeads      = Math.max(...data.byMonth.map(m => m.leads), 1)
  const maxEmails     = Math.max(...data.byMonth.map(m => m.emails), 1)
  const maxIcpLeads   = Math.max(...data.icpBreakdown.map(i => i.leads), 1)
  const maxIndustry   = Math.max(...data.topIndustries.map(i => i.count), 1)
  const maxScore      = Math.max(...data.scoreDist.map(b => b.count), 1)

  const totalLeads    = data.byMonth.reduce((s, m) => s + m.leads, 0)
  const totalEmails   = data.byMonth.reduce((s, m) => s + m.emails, 0)
  const totalReplies  = data.byMonth.reduce((s, m) => s + m.replies, 0)
  const totalInterested = data.byMonth.reduce((s, m) => s + m.interested, 0)
  const replyRate     = totalEmails > 0 ? Math.round((totalReplies / totalEmails) * 100) : 0
  const interestedRate = totalReplies > 0 ? Math.round((totalInterested / totalReplies) * 100) : 0

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Your pipeline performance over the last 6 months.</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Leads Generated',   value: totalLeads.toLocaleString(),      icon: <Users className="w-5 h-5" />,       color: 'text-gray-900',  bg: 'bg-gray-100 text-gray-500' },
          { label: 'Emails Sent',       value: totalEmails.toLocaleString(),     icon: <Send className="w-5 h-5" />,        color: 'text-blue-700',  bg: 'bg-blue-100 text-blue-500' },
          { label: 'Reply Rate',        value: `${replyRate}%`,                  icon: <MessageSquare className="w-5 h-5" />, color: replyRate >= 3 ? 'text-green-700' : 'text-amber-700', bg: replyRate >= 3 ? 'bg-green-100 text-green-500' : 'bg-amber-100 text-amber-500' },
          { label: 'Interested Rate',   value: `${interestedRate}%`,             icon: <ThumbsUp className="w-5 h-5" />,    color: interestedRate >= 20 ? 'text-green-700' : 'text-gray-700', bg: 'bg-gray-100 text-gray-500' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>{icon}</div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Monthly lead volume */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4 text-brand-500" />
            <h3 className="font-semibold text-gray-900">Leads per Month</h3>
          </div>
          {totalLeads === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-gray-400">No leads yet</div>
          ) : (
            <div className="flex items-end justify-between gap-1 h-24">
              {data.byMonth.map(m => (
                <MiniBar key={m.month} value={m.leads} max={maxLeads} color="bg-brand-500" label={m.month} />
              ))}
            </div>
          )}
        </div>

        {/* Monthly outreach */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Send className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900">FIGSY Outreach per Month</h3>
          </div>
          {totalEmails === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-gray-400">No emails sent yet</div>
          ) : (
            <div className="flex items-end justify-between gap-1 h-24">
              {data.byMonth.map(m => (
                <div key={m.month} className="flex gap-0.5 items-end">
                  <MiniBar value={m.emails}     max={maxEmails} color="bg-blue-400"  label={m.month} />
                  <MiniBar value={m.interested} max={maxEmails} color="bg-green-400" label="" />
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" /> Sent</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" /> Interested</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ICP breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Target className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-gray-900">Leads by ICP</h3>
          </div>
          {data.icpBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-gray-400">No ICPs yet</div>
          ) : (
            <div className="space-y-3">
              {data.icpBreakdown.map(icp => (
                <HBar
                  key={icp.id}
                  label={icp.name}
                  sub={icp.avg_score > 0 ? `avg score ${icp.avg_score}` : undefined}
                  value={icp.leads}
                  max={maxIcpLeads}
                  color="bg-indigo-400"
                />
              ))}
            </div>
          )}
        </div>

        {/* Top industries */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Top Industries</h3>
          </div>
          {data.topIndustries.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-gray-400">No leads yet</div>
          ) : (
            <div className="space-y-3">
              {data.topIndustries.map(i => (
                <HBar key={i.industry} label={i.industry} value={i.count} max={maxIndustry} color="bg-purple-400" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Score distribution */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Star className="w-4 h-4 text-yellow-500" />
          <h3 className="font-semibold text-gray-900">Lead Score Distribution</h3>
          <span className="ml-auto text-xs text-gray-400">AI scores each lead 0–100 on ICP fit</span>
        </div>
        {data.scoreDist.every(b => b.count === 0) ? (
          <div className="flex items-center justify-center h-16 text-sm text-gray-400">No scored leads yet</div>
        ) : (
          <div className="flex items-end justify-around gap-4 h-20">
            {data.scoreDist.map(b => {
              const h = maxScore > 0 ? Math.max(Math.round((b.count / maxScore) * 64), b.count > 0 ? 6 : 0) : 0
              const scoreColor =
                b.label === '80–100' ? 'bg-green-400' :
                b.label === '60–79'  ? 'bg-green-200' :
                b.label === '40–59'  ? 'bg-yellow-300' :
                b.label === '20–39'  ? 'bg-orange-300' : 'bg-gray-200'
              return (
                <div key={b.label} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs font-semibold text-gray-700">{b.count > 0 ? b.count : ''}</span>
                  <div className="w-full bg-gray-100 rounded-md overflow-hidden" style={{ height: 64 }}>
                    <div className={`w-full ${scoreColor} rounded-md`} style={{ height: h, marginTop: 64 - h }} />
                  </div>
                  <span className="text-xs text-gray-400">{b.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
