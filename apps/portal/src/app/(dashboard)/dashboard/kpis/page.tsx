'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Loader2, Send, MessageSquare, ThumbsUp, MinusCircle,
  Users, Star, DollarSign, ShieldCheck, TrendingUp,
  Target, Zap, ArrowRight, Calendar, Clock, Mail,
  Linkedin, BarChart2, Activity, RefreshCw,
  Download, Globe, AlertCircle, CheckCircle2,
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
  totalOpened?: number
  openRate?: number
  period?: string
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
  const border = accent ? 'border-green-200 bg-green-50/30' : warn ? 'border-amber-200 bg-amber-50/30' : 'border-purple-100/60 bg-white'
  const valColor = accent ? 'text-green-700' : warn ? 'text-amber-700' : muted ? 'text-[#9B8EC4]' : 'text-gray-900'
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
      <p className="text-sm text-[#7B6FA0] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[#9B8EC4] mt-1">{sub}</p>}
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
          {pct > 0 && <span className="text-[#9B8EC4]">({pct}%)</span>}
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
  label, value, good, ok, industryAvg, unit = '%'
}: {
  label: string
  value: number
  good: number
  ok: number
  industryAvg: number
  unit?: string
}) {
  const display = unit === '%' ? `${(value * 100).toFixed(1)}%` : value.toFixed(1)
  const avgDisplay = unit === '%' ? `${(industryAvg * 100).toFixed(1)}%` : industryAvg.toFixed(1)
  const status = value >= good ? 'great' : value >= ok ? 'good' : 'building'
  const colors = {
    great:    { dot: 'bg-green-400', text: 'text-green-700', label: 'Above avg' },
    good:     { dot: 'bg-amber-400', text: 'text-amber-700', label: 'Near avg' },
    building: { dot: 'bg-gray-300',  text: 'text-[#9B8EC4]',  label: 'Below avg' },
  }[status]

  return (
    <div className="py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">{label}</span>
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-gray-900">{display}</span>
          <span className={`flex items-center gap-1 text-xs font-semibold ${colors.text}`}>
            <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
            {colors.label}
          </span>
        </div>
      </div>
      <p className="text-[11px] text-[#9B8EC4] mt-0.5">Industry avg {avgDisplay}</p>
    </div>
  )
}

interface DailySend {
  date: string   // YYYY-MM-DD (UTC)
  count: number
}

// Small time-series sparkline of emails sent per day over the trailing window.
function EmailsSparkline({ data }: { data: DailySend[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const max   = Math.max(...data.map(d => d.count), 1)
  const n     = data.length
  const VBW = 100, VBH = 36

  const coords = data.map((d, i) => {
    const x = n > 1 ? (i / (n - 1)) * VBW : VBW / 2
    const y = VBH - (d.count / max) * (VBH - 4) - 2
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const linePts = coords.join(' ')
  const areaPts = `0,${VBH} ${linePts} ${VBW},${VBH}`

  const dayLabel = (s: string) =>
    new Date(`${s}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#7C3AED]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">FIGSY sent</h2>
            <p className="text-xs text-[#9B8EC4]">Last {n} days</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
          <p className="text-xs text-[#9B8EC4]">FIGSY sent</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${VBW} ${VBH}`} preserveAspectRatio="none" className="w-full h-16" aria-hidden>
        <defs>
          <linearGradient id="kpiSparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </linearGradient>
        </defs>
        {total > 0 && <polygon points={areaPts} fill="url(#kpiSparkFill)" />}
        <polyline
          points={linePts}
          fill="none"
          stroke="#7C3AED"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="flex mt-2">
        {data.map(d => (
          <div key={d.date} className="flex-1 text-center">
            <p className="text-xs font-semibold text-gray-700">{d.count}</p>
            <p className="text-[10px] text-[#9B8EC4]">{dayLabel(d.date)}</p>
          </div>
        ))}
      </div>

      {total === 0 && (
        <p className="text-center text-xs text-[#9B8EC4] mt-3">No emails sent in this window yet.</p>
      )}
    </div>
  )
}

interface FigsyInsight {
  icon: string
  title: string
  body: string
  action?: string
}

function FigsyInsightsPanel({ token }: { token: string }) {
  const [insights, setInsights] = useState<FigsyInsight[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!token) return
    api.get<{ data: FigsyInsight[] }>('/figsy/insights', token)
      .then(r => setInsights(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="rounded-2xl border border-purple-100/60 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-purple-100 shrink-0">
          <img src="/agents/figsy.png" className="w-full h-full object-cover object-top" alt="FIGSY" />
        </div>
        <span className="text-sm font-bold text-gray-900">FIGSY Insights</span>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9B8EC4] ml-auto" />
      </div>
    </div>
  )

  if (insights.length === 0) return null

  return (
    <div className="rounded-2xl border border-purple-200/60 bg-[#F5F0FF]/40 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-purple-200 shrink-0">
          <img src="/agents/figsy.png" className="w-full h-full object-cover object-top" alt="FIGSY" />
        </div>
        <div>
          <p className="text-sm font-bold text-[#5B21B6]">FIGSY is watching your patterns</p>
          <p className="text-xs text-[#7C3AED]">Here's what I'm seeing in your data</p>
        </div>
      </div>
      <div className="space-y-3">
        {insights.map((ins, i) => (
          <div key={i} className="bg-white rounded-xl border border-purple-100/60 px-4 py-3 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0 mt-0.5">{ins.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-snug">{ins.title}</p>
                <p className="text-xs text-[#7B6FA0] mt-1 leading-relaxed">{ins.body}</p>
                {ins.action && (
                  <button className="mt-2 text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9] flex items-center gap-0.5">
                    {ins.action} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function KPIsPage() {
  const supabase = createClient()
  const [leads, setLeads]   = useState<LeadStats | null>(null)
  const [figsy, setFigsy]   = useState<FigsyKPIs | null>(null)
  const [sends, setSends]   = useState<DailySend[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('all')
  const [token, setToken]   = useState('')

  async function fetchData(tok: string, p: '7d' | '30d' | '90d' | 'all' = 'all') {
    try {
      const [leadsRes, figsyRes, sendsRes] = await Promise.all([
        api.get<{ success: boolean; data: LeadStats }>('/leads/stats', tok),
        api.get<{ success: boolean; data: FigsyKPIs }>('/figsy/kpis?period=' + p, tok),
        // Sparkline always shows the trailing 7 days, independent of the period filter
        api.get<{ success: boolean; data: DailySend[] }>('/figsy/sends-daily?days=7', tok),
      ])
      setLeads(leadsRes.data)
      setFigsy(figsyRes.data)
      setSends(sendsRes.data ?? [])
    } catch { }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      setToken(session.access_token)
      await fetchData(session.access_token, period)
      setLoading(false)
    })
  }, [supabase, period])

  async function handleRefresh() {
    setRefreshing(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) await fetchData(session.access_token, period)
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

  const openRate = f.totalSent > 0 ? ((f.totalReplied / f.totalSent) * 100).toFixed(1) : '—'
  const contacted = f.leadsContacted > 0 ? f.leadsContacted : f.totalSent > 0 ? Math.ceil(f.totalSent / 3) : 0
  const meetingRate = f.meetingsBooked != null && contacted > 0 ? (f.meetingsBooked / Math.max(contacted, 1)) * 100 : 0
  const oneInEvery = f.interested > 0 && f.totalReplied > 0 ? Math.round(f.totalReplied / f.interested) : null

  // ── P1-10: PDF/HTML report generator ────────────────────────────────────────
  function generateReport() {
    const now = new Date()
    const dateRange = `${new Date(now.getTime() - 30 * 86400000).toLocaleDateString()} – ${now.toLocaleDateString()}`
    const replyRatePct = f.totalSent > 0 ? ((f.replyRate ?? 0) * 100).toFixed(1) : '0'
    const openRatePct  = f.totalSent > 0 && f.openRate ? (f.openRate * 100).toFixed(1) : '0'
    const interestedRatePct = f.totalSent > 0 ? ((f.interestedRate ?? 0) * 100).toFixed(1) : '0'
    const pipeVal = pipelineValue

    const metrics = [
      { label: 'Leads sourced', value: l.total, max: Math.max(l.total, 100) },
      { label: 'FIGSY sent', value: f.totalSent, max: Math.max(f.totalSent, 100) },
      { label: 'Open rate', value: parseFloat(openRatePct), max: 60, unit: '%' },
      { label: 'Reply rate', value: parseFloat(replyRatePct), max: 30, unit: '%' },
      { label: 'Positive replies', value: f.interested, max: Math.max(f.interested, 10) },
      { label: 'Meetings booked', value: f.meetingsBooked ?? 0, max: Math.max(f.meetingsBooked ?? 0, 10) },
    ]

    const bars = metrics.map(m => {
      const pct = m.max > 0 ? Math.round((m.value / m.max) * 100) : 0
      return `
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:13px;color:#374151">${m.label}</span>
            <span style="font-size:13px;font-weight:700;color:#111827">${m.value.toLocaleString()}${m.unit ?? ''}</span>
          </div>
          <div style="height:10px;background:#F3F4F6;border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${Math.min(pct, 100)}%;background:#7C3AED;border-radius:99px"></div>
          </div>
        </div>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>KIND AI — Performance Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FAFAFE; color: #111827; padding: 40px; }
    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #7C3AED20; }
    .logo { font-size: 24px; font-weight: 800; color: #7C3AED; letter-spacing: -0.5px; }
    .date { font-size: 12px; color: #6B7280; }
    .section { background: white; border-radius: 16px; border: 1px solid #EDE9FE; padding: 24px; margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat { background: #F5F3FF; border-radius: 12px; padding: 16px; }
    .stat-value { font-size: 28px; font-weight: 800; color: #1E0A5C; }
    .stat-label { font-size: 12px; color: #7B6FA0; margin-top: 2px; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #9CA3AF; }
    @media print { body { background: white; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">K I N D ·AI</div>
    <div class="date">Report period: ${dateRange}</div>
  </div>

  <div class="stats-grid">
    <div class="stat"><div class="stat-value">${l.total.toLocaleString()}</div><div class="stat-label">Leads sourced</div></div>
    <div class="stat"><div class="stat-value">${f.totalSent.toLocaleString()}</div><div class="stat-label">Emails sent</div></div>
    <div class="stat"><div class="stat-value">${replyRatePct}%</div><div class="stat-label">Reply rate</div></div>
    <div class="stat"><div class="stat-value">${interestedRatePct}%</div><div class="stat-label">Positive reply rate</div></div>
    <div class="stat"><div class="stat-value">${f.meetingsBooked ?? 0}</div><div class="stat-label">Meetings booked</div></div>
    <div class="stat"><div class="stat-value">${pipeVal}</div><div class="stat-label">Est. pipeline value</div></div>
  </div>

  <div class="section">
    <div class="section-title">Metric breakdown</div>
    ${bars}
  </div>

  <div class="section">
    <div class="section-title">Key highlights</div>
    <ul style="list-style:none;space-y:8px">
      <li style="padding:8px 0;border-bottom:1px solid #F3F4F6;font-size:13px;color:#374151">
        ${l.scored} of ${l.total} leads have been AI-scored for ICP fit.
      </li>
      <li style="padding:8px 0;border-bottom:1px solid #F3F4F6;font-size:13px;color:#374151">
        FIGSY sent ${f.totalSent.toLocaleString()} emails and received ${f.totalReplied} replies (${replyRatePct}% reply rate).
      </li>
      <li style="padding:8px 0;font-size:13px;color:#374151">
        ${f.interested} positive replies — indicating buying intent.
      </li>
    </ul>
  </div>

  <div class="footer">Generated by KIND AI · app.get-kind.com · ${now.toLocaleDateString()}</div>

  <script>window.print()</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

  // Meetings booked derived values
  const meetingBookedRateDecimal = (f.meetingBookedRate ?? 0) / 100
  const meetingsBookedAccent = meetingBookedRateDecimal >= 0.03
  const meetingsBookedWarn = !meetingsBookedAccent && f.meetingBookedRate !== undefined && meetingBookedRateDecimal < 0.01

  const periodLabel: Record<string, string> = {
    '7d': '7 days', '30d': '30 days', '90d': '90 days', 'all': 'All time',
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance</h1>
          <p className="text-[#7B6FA0] text-sm mt-1">Live FIGSY campaign metrics and pipeline data across all agents.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateReport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#7C3AED] border border-[#7C3AED]/30 bg-[#F5F0FF] hover:bg-[#EDE9FF] rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Report
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-purple-100/80 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-white border border-purple-100/60 rounded-xl p-1 w-fit">
          {(['7d', '30d', '90d', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === p
                  ? 'bg-[#7C3AED] text-white shadow-sm'
                  : 'text-[#7B6FA0] hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {p === 'all' ? 'All time' : p}
            </button>
          ))}
        </div>
        {period !== 'all' && (
          <span className="text-xs text-[#9B8EC4]">Showing metrics for the last {periodLabel[period]}</span>
        )}
      </div>

      {/* FIGSY Proactive Insights */}
      {token && <FigsyInsightsPanel token={token} />}

      {/* FIGSY status banner */}
      {f.activeCampaigns > 0 && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#1A0F47] to-[#0F0929] rounded-xl px-5 py-3.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          <p className="text-sm text-white/80">
            FIGSY is running <span className="text-white font-semibold">{f.activeCampaigns} active campaign{f.activeCampaigns !== 1 ? 's' : ''}</span> — outreach is live
          </p>
        </div>
      )}

      {/* Email outreach metrics — 5 columns */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wider">Email Outreach</h2>
          {period !== 'all' && (
            <span className="text-[10px] font-medium text-[#9B8EC4] bg-gray-100 px-2 py-0.5 rounded-full">({periodLabel[period]})</span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Special meetings booked hero card — first in grid */}
          <div className="col-span-full md:col-span-2 rounded-xl border-2 border-[#7C3AED]/20 bg-[#F5F0FF] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#7C3AED] uppercase tracking-wider mb-1">Meetings Booked</p>
                <p className="text-4xl font-bold text-[#1E0A5C]">{figsy?.meetingsBooked ?? 0}</p>
                <p className="text-sm text-[#7C3AED]/70 mt-1">
                  {(figsy?.meetingsBooked ?? 0) === 0
                    ? 'No data yet'
                    : figsy?.meetingBookedRate !== undefined
                      ? `${(figsy.meetingBookedRate).toFixed(1)}% booking rate`
                      : 'Meetings on the board'
                  }
                  {' '}
                  <span className="text-[#9B8EC4]">· Alta target: 3–5%</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#7C3AED]" />
              </div>
            </div>
          </div>

          <MetricCard
            label="FIGSY sent"
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
          {(f.totalOpened !== undefined && f.totalOpened > 0) && (
            <MetricCard
              label="Email opens"
              value={f.totalOpened.toLocaleString()}
              sub={f.totalSent > 0 ? `${((f.openRate ?? 0) * 100).toFixed(1)}% open rate` : undefined}
              icon={<Mail className="w-4 h-4" />}
              accent={(f.openRate ?? 0) >= 0.25}
            />
          )}
        </div>

        {/* Emails-sent sparkline — trailing 7 days */}
        {sends.length > 0 && (
          <div className="mt-3">
            <EmailsSparkline data={sends} />
          </div>
        )}
      </div>

      {/* Lead pipeline metrics — 4 columns */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wider">Lead Pipeline</h2>
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
            label="Est. pipeline value"
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
          <Linkedin className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wider">LinkedIn Outreach</h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-[#9B8EC4]">Coming soon</span>
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
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-5 space-y-3">
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
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-1">Outreach benchmarks</h2>
              <p className="text-xs text-[#9B8EC4] mb-3">vs B2B cold outreach industry averages</p>
              <BenchmarkRow label="Reply rate" value={f.replyRate} good={0.08} ok={0.03} industryAvg={0.071} />
              <BenchmarkRow label="Open rate" value={f.openRate ?? 0} good={0.42} ok={0.20} industryAvg={0.42} />
              <BenchmarkRow label="Interested rate" value={f.interestedRate} good={0.02} ok={0.005} industryAvg={0.020} />
              <BenchmarkRow
                label="Meeting booking rate"
                value={meetingBookedRateDecimal}
                good={0.03}
                ok={0.01}
                industryAvg={0.010}
              />
            </div>
          )}

          {/* Key insights */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-5 space-y-3">
            <h2 className="text-sm font-bold text-gray-900">Key insights</h2>
            {l.total === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {[
                  { icon: <Zap className="w-5 h-5 text-[#7C3AED]" />, title: 'Launch your first campaign', desc: 'FIGSY writes and sends personalised outreach sequences.', href: '/dashboard/figsy-chat', cta: 'Chat with FIGSY →' },
                  { icon: <Target className="w-5 h-5 text-[#7C3AED]" />, title: 'Define your ICP', desc: 'Tell FIGSY who to target and she\'ll find matching leads.', href: '/dashboard/leads/icp', cta: 'Build ICP →' },
                  { icon: <BarChart2 className="w-5 h-5 text-[#7C3AED]" />, title: 'Import leads from LinkedIn', desc: 'Upload a LinkedIn CSV and score your network instantly.', href: '/dashboard/leads/linkedin', cta: 'Import →' },
                ].map(card => (
                  <a key={card.title} href={card.href}
                    className="flex items-start gap-3 p-4 bg-white border border-purple-100 rounded-xl hover:border-[#7C3AED]/40 hover:shadow-sm transition-all group">
                    <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center shrink-0">{card.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1E1152]">{card.title}</p>
                      <p className="text-xs text-[#9B8EC4] mt-0.5 leading-relaxed">{card.desc}</p>
                      <span className="text-xs font-semibold text-[#7C3AED] mt-1.5 flex items-center gap-0.5 group-hover:underline">{card.cta}</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700">
                  <span className="font-bold text-gray-900">{l.scored}</span> of{' '}
                  <span className="font-bold text-gray-900">{l.total}</span> leads have been AI-scored.
                </p>
                {f.totalSent > 0 && (
                  <p className="text-sm text-gray-700">
                    FIGSY sent <span className="font-bold text-gray-900">{f.totalSent.toLocaleString()}</span> emails across <span className="font-bold text-gray-900">{f.activeCampaigns}</span> FIGSY campaign{f.activeCampaigns !== 1 ? 's' : ''}.
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
                  <p className="text-sm text-[#7B6FA0]">
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

      {/* ── P1-1: Deliverability section ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wider">Deliverability</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Sending domain"
            value="Not configured"
            sub="Add a custom domain in settings"
            icon={<Globe className="w-4 h-4" />}
            muted
          />
          <MetricCard
            label="Open rate (7d)"
            value={f.totalSent > 0 && f.openRate ? `${(f.openRate * 100).toFixed(1)}%` : '—'}
            sub={f.totalSent > 0 ? `${f.totalOpened ?? 0} opens of ${f.totalSent} sent` : 'No data yet'}
            icon={<Mail className="w-4 h-4" />}
            accent={(f.openRate ?? 0) >= 0.25}
          />
          <MetricCard
            label="Bounce rate"
            value="—"
            sub="Needs Resend webhook setup"
            icon={<AlertCircle className="w-4 h-4" />}
            muted
          />
          <MetricCard
            label="Spam complaints"
            value="—"
            sub="Needs Resend webhook setup"
            icon={<AlertCircle className="w-4 h-4" />}
            muted
          />
        </div>

        {/* Deliverability tips */}
        <div className="mt-3 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[#7C3AED]" />
            <h3 className="text-sm font-bold text-gray-900">Deliverability tips</h3>
          </div>
          <ul className="space-y-2">
            {[
              'Warm up your domain before high-volume sending — start with 10–20 emails/day and increase gradually over 4 weeks',
              'Keep emails under 200 words for better inbox placement — long emails trigger more spam filters',
              'Personalise the first line — generic openers like "I hope this finds you well" trigger spam filters',
            ].map(tip => (
              <li key={tip} className="flex items-start gap-2.5 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
