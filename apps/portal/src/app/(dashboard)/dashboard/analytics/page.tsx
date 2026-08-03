'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import {
  Loader2, Users, Send, MessageSquare,
  TrendingUp, BarChart2, Target, Star, Calendar, Eye,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MonthPoint {
  month:      string
  unsubscribed?: number   // #406 — REAL per-month opt-outs, counted server-side
  leads:      number
  emails:     number
  opened:     number
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
  byMonth:        MonthPoint[]
  byCampaign?:    CampaignPerf[]
  totals?:        { sent: number; opened: number; replied: number }
  icpBreakdown:   IcpPoint[]
  scoreDist:      ScoreBucket[]
  topIndustries:  IndustryPoint[]
  trackingEnabled?: boolean
}

// Per-campaign performance, derived server-side from REAL send-log rows (not counters)
// so this table always agrees with the summary cards.
interface CampaignPerf {
  id: string
  name: string
  status: string
  created_at: string
  contacts: number
  sent: number
  opened: number
  open_rate: number
  replies: number
  interested: number
  reply_rate: number
}

interface LeadStats {
  total: number
  scored: number
  consented: number
  exported: number
  opted_out: number
  avg_score: number
  pipeline_value_usd: number
}

interface Reply {
  id: string
  classification: string
  created_at: string
}

// ── 9-metric time series point ────────────────────────────────────────────────
interface TimeSeriesPoint {
  week: string
  new_contacted: number
  emails_sent: number
  emails_opened: number
  emails_replied: number
  bounced: number
  linkedin_connections: number
  linkedin_messages: number
  meetings_booked: number
  unsubscribed: number
}

// ── Prospect status breakdown ─────────────────────────────────────────────────
interface ProspectStatus {
  name: string
  value: number
  color: string
}

// ── Custom tooltip for LineChart ──────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white border border-purple-100 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-900">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Metric toggle pill ────────────────────────────────────────────────────────
const METRICS = [
  { key: 'new_contacted',       label: 'New Contacted',        color: '#7C3AED' },
  { key: 'emails_sent',         label: 'Emails Sent',          color: '#2563EB' },
  { key: 'emails_opened',       label: 'Emails Opened',        color: '#0891B2' },
  { key: 'emails_replied',      label: 'Emails Replied',       color: '#059669' },
  // #406 — these three have NO data source. They were selectable and drew a flat zero line
  // labelled like a real measurement, which reads as "we sent 400 emails and none bounced"
  // rather than "we do not track this". `unavailable` disables the chip and says which.
  { key: 'bounced',             label: 'Bounced',              color: '#DC2626', unavailable: 'not tracked yet' },
  { key: 'linkedin_connections',label: 'LinkedIn Connections', color: '#0A66C2', unavailable: 'LinkedIn not connected' },
  { key: 'linkedin_messages',   label: 'LinkedIn Messages',    color: '#1D4ED8', unavailable: 'LinkedIn not connected' },
  { key: 'meetings_booked',     label: 'Meetings Booked',      color: '#D97706' },
  { key: 'unsubscribed',        label: 'Unsubscribed',         color: '#6B7280' },
]

const PIE_COLORS = ['#7C3AED', '#2563EB', '#059669', '#D97706', '#DC2626', '#6B7280']

export default function AnalyticsPage() {
  const supabase = createClient()
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [data, setData]         = useState<AnalyticsData | null>(null)
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null)
  const [replies, setReplies]   = useState<Reply[]>([])

  // Active metrics for time-series chart
  const [activeMetrics, setActiveMetrics] = useState<string[]>(['emails_sent', 'emails_replied', 'meetings_booked'])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const [analyticsRes, statsRes, repliesRes] = await Promise.allSettled([
          api.get<{ data: AnalyticsData }>('/leads/analytics', session.access_token),
          api.get<{ data: LeadStats }>('/leads/stats', session.access_token),
          api.get<{ data: Reply[] }>('/figsy/replies/all', session.access_token),
        ])
        if (analyticsRes.status === 'fulfilled') setData(analyticsRes.value.data)
        if (statsRes.status === 'fulfilled') setLeadStats(statsRes.value.data)
        if (repliesRes.status === 'fulfilled') setReplies(repliesRes.value.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics — please refresh.')
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-600 font-medium mb-2">Could not load analytics</p>
        <p className="text-sm text-gray-500">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm hover:bg-[#6D28D9] transition-colors">
          Retry
        </button>
      </div>
    </div>
  )

  if (!data) return null

  // ── Compute time-series from byMonth data ─────────────────────────────────
  const timeSeriesData: TimeSeriesPoint[] = data.byMonth.map(m => ({
    week:                 m.month,
    new_contacted:        m.leads,
    emails_sent:          m.emails,
    emails_opened:        m.opened ?? 0,  // REAL opens (opened_at pixel) — 0 when tracking off
    emails_replied:       m.replies,
    bounced:              0,  // not tracked per-month yet — never fabricate a bounce number
    linkedin_connections: 0,  // no LinkedIn integration exists — the picker marks it unavailable
    linkedin_messages:    0,  // ditto
    meetings_booked:      m.interested,
    // #406 — WAS `Math.round(m.replies * 0.05)`: an invented unsubscribe count, shown to the
    // client on a chart, ONE LINE BELOW the comment "never fabricate a bounce number". The
    // old code even computed `rMonth` and then ignored it — it could not have worked, because
    // `m.month` is a display label ("Jan 26") and never equals a `YYYY-MM` slice. Now counted
    // properly by the server, which is the only place that holds the month key.
    unsubscribed:         m.unsubscribed ?? 0,
  }))

  // ── Prospect status breakdown from stats + replies ────────────────────────
  const hotReplies     = replies.filter(r => r.classification === 'hot' || r.classification === 'interested').length
  const optOutReplies  = replies.filter(r => r.classification === 'opt_out' || r.classification === 'unsubscribe').length
  // Real booked meetings = replies with a meeting_booked_at stamp (NOT hot replies).
  const meetingsBooked = replies.filter(r => !!(r as { meeting_booked_at?: string | null }).meeting_booked_at).length
  const totalContacted = leadStats?.consented ?? 0
  const pending        = Math.max(0, totalContacted - (leadStats?.exported ?? 0))

  const prospectStatuses: ProspectStatus[] = [
    { name: 'New',             value: Math.max(0, (leadStats?.total ?? 0) - totalContacted), color: '#7C3AED' },
    { name: 'Pending',         value: pending,           color: '#2563EB' },
    { name: 'Interested',      value: Math.max(0, hotReplies - meetingsBooked), color: '#059669' },
    { name: 'Not Interested',  value: Math.max(0, (replies.filter(r => r.classification === 'not_interested').length)), color: '#DC2626' },
    { name: 'Meeting Booked',  value: meetingsBooked,    color: '#D97706' },
    { name: 'Unsubscribed',    value: optOutReplies,     color: '#6B7280' },
  ].filter(s => s.value > 0)

  // ── Summary totals ────────────────────────────────────────────────────────
  // From the per-campaign REAL row counts (same source as the Campaign Performance
  // table and /figsy/kpis) — robust to rows with a null/old sent_at, which the
  // month-bucket sum silently drops (that gap is what made this card read 0 while
  // Performance read the real number). Falls back to the month series if needed.
  // Headline cards use `totals` — counted the EXACT way /figsy/kpis does — so they match
  // Performance. Fall back to the per-campaign/month sums only if `totals` is absent.
  const totalEmails  = data.totals?.sent    ?? (data.byCampaign ? data.byCampaign.reduce((s, c) => s + c.sent,    0) : data.byMonth.reduce((s, m) => s + m.emails, 0))
  const totalOpened  = data.totals?.opened  ?? (data.byCampaign ? data.byCampaign.reduce((s, c) => s + c.opened,  0) : data.byMonth.reduce((s, m) => s + (m.opened ?? 0), 0))
  const totalReplies = data.totals?.replied ?? (data.byCampaign ? data.byCampaign.reduce((s, c) => s + c.replies, 0) : data.byMonth.reduce((s, m) => s + m.replies, 0))
  const totalLeads   = leadStats?.total ?? data.byMonth.reduce((s, m) => s + m.leads, 0)
  const replyRate    = totalEmails > 0 ? Math.round((totalReplies / totalEmails) * 100) : 0
  const trackingOff  = data.trackingEnabled === false
  const openRate     = trackingOff ? null : (totalEmails > 0 ? Math.round((totalOpened / totalEmails) * 100) : 0)

  function toggleMetric(key: string) {
    setActiveMetrics(prev =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter(k => k !== key) : prev) : [...prev, key]
    )
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Your pipeline performance — outreach metrics, campaign results, and prospect breakdown.</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Total Leads',   value: totalLeads.toLocaleString(),     icon: <Users className="w-5 h-5" />,       bg: 'bg-purple-100 text-purple-500',  text: 'text-gray-900' },
          { label: 'Emails Sent',   value: totalEmails.toLocaleString(),    icon: <Send className="w-5 h-5" />,        bg: 'bg-blue-100 text-blue-500',       text: 'text-blue-700' },
          { label: openRate === null ? 'Open Rate · n/a' : 'Open Rate', value: openRate === null ? 'n/a' : `${openRate}%`, icon: <Eye className="w-5 h-5" />,  bg: 'bg-cyan-100 text-cyan-600',       text: openRate === null ? 'text-gray-400' : 'text-cyan-700' },
          { label: 'Reply Rate',    value: `${replyRate}%`,                 icon: <MessageSquare className="w-5 h-5" />, bg: replyRate >= 3 ? 'bg-green-100 text-green-500' : 'bg-amber-100 text-amber-500', text: replyRate >= 3 ? 'text-green-700' : 'text-amber-700' },
          { label: 'Meetings Booked', value: meetingsBooked.toLocaleString(), icon: <Calendar className="w-5 h-5" />,    bg: 'bg-amber-100 text-amber-500',     text: 'text-amber-700' },
        ].map(({ label, value, icon, bg, text }) => (
          <div key={label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>{icon}</div>
            <div>
              <p className={`text-2xl font-bold ${text}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 9-Metric Time Series Chart ───────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
          <h3 className="font-semibold text-gray-900">Outreach Metrics Over Time</h3>
          <span className="ml-auto text-xs text-gray-400">Monthly — last 6 months</span>
        </div>

        {trackingOff && (
          <div className="flex items-start gap-2 mb-4 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700">
            <Eye className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Open rate is <strong>n/a for cold outreach</strong> — cold emails deliberately carry no tracking pixel (an invisible tracker hurts inbox placement and is a spam signal). This is intentional: <strong>0 opens here does not mean nobody read your email.</strong> Reply rate is the real signal for cold.</span>
          </div>
        )}

        {/* Metric selector pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => { if (!m.unavailable) toggleMetric(m.key) }}
              disabled={!!m.unavailable}
              title={m.unavailable ? `${m.label} — ${m.unavailable}` : undefined}
              aria-label={m.unavailable ? `${m.label} (${m.unavailable})` : m.label}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                m.unavailable
                  ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  : activeMetrics.includes(m.key)
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
              style={!m.unavailable && activeMetrics.includes(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
            >
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ background: activeMetrics.includes(m.key) ? 'white' : m.color }}
              />
              {m.label}
            </button>
          ))}
        </div>

        {totalEmails === 0 && totalLeads === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">No data yet — start a campaign to see metrics here.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={timeSeriesData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              {METRICS.filter(m => activeMetrics.includes(m.key)).map(m => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={{ fill: m.color, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Campaign Performance Table ───────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2 className="w-4 h-4 text-[#7C3AED]" />
          <h3 className="font-semibold text-gray-900">Campaign Performance</h3>
        </div>
        {(data.byCampaign ?? []).length === 0 ? (
          <div className="flex items-center justify-center h-20 text-sm text-gray-400">No campaigns yet — create one in FIGSY.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-[#9B8EC4] pb-3 pr-4">Campaign</th>
                  <th className="text-right text-xs font-semibold text-[#9B8EC4] pb-3 px-3">Contacts</th>
                  <th className="text-right text-xs font-semibold text-[#9B8EC4] pb-3 px-3">Sent</th>
                  <th className="text-right text-xs font-semibold text-[#9B8EC4] pb-3 px-3">Open Rate</th>
                  <th className="text-right text-xs font-semibold text-[#9B8EC4] pb-3 px-3">Reply Rate</th>
                  <th className="text-right text-xs font-semibold text-[#9B8EC4] pb-3 px-3">Interested</th>
                  <th className="text-center text-xs font-semibold text-[#9B8EC4] pb-3 px-3">Status</th>
                  <th className="text-right text-xs font-semibold text-[#9B8EC4] pb-3 pl-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data.byCampaign ?? []).map(c => {
                  const statusColors: Record<string, string> = {
                    draft:     'bg-gray-100 text-gray-600',
                    active:    'bg-green-100 text-green-700',
                    paused:    'bg-amber-100 text-amber-700',
                    completed: 'bg-blue-100 text-[#6D28D9]',
                    archived:  'bg-gray-100 text-[#9B8EC4]',
                  }
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pr-4">
                        <a href={`/dashboard/figsy/${c.id}`} className="font-medium text-gray-900 hover:text-[#7C3AED] transition-colors">
                          {c.name}
                        </a>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700">{c.contacts}</td>
                      <td className="py-3 px-3 text-right text-gray-700">{c.sent}</td>
                      <td className="py-3 px-3 text-right">
                        {/* "n/a" when open-tracking is off (cold = no pixel), matching the summary card — never a misleading 0%. */}
                        <span className="text-gray-400">{trackingOff ? 'n/a' : `${c.open_rate}%`}</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`font-semibold ${c.reply_rate >= 5 ? 'text-green-700' : c.reply_rate >= 2 ? 'text-amber-700' : 'text-gray-500'}`}>
                          {c.reply_rate}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-gray-700">{c.interested}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 pl-3 text-right text-xs text-[#9B8EC4]">
                        {new Date(c.created_at).toLocaleDateString('en-ZA', { dateStyle: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Prospect Status Breakdown + Score Distribution ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Prospect status pie */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Target className="w-4 h-4 text-[#7C3AED]" />
            <h3 className="font-semibold text-gray-900">Prospect Status Breakdown</h3>
          </div>
          {prospectStatuses.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">No prospect data yet.</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={prospectStatuses}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {prospectStatuses.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload as ProspectStatus
                      return (
                        <div className="bg-white border border-purple-100 rounded-xl shadow-lg px-3 py-2 text-xs">
                          <span className="font-semibold text-gray-800">{d.name}: {d.value}</span>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {prospectStatuses.map(s => (
                  <div key={s.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-xs text-gray-600">{s.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Score distribution bar chart */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Star className="w-4 h-4 text-yellow-500" />
            <h3 className="font-semibold text-gray-900">Lead Score Distribution</h3>
          </div>
          {data.scoreDist.every(b => b.count === 0) ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">No scored leads yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.scoreDist} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="bg-white border border-purple-100 rounded-xl shadow-lg px-3 py-2 text-xs">
                        <span className="font-semibold text-gray-800">Score {label}: {payload[0].value} leads</span>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                  {data.scoreDist.map((b) => (
                    <Cell
                      key={b.label}
                      fill={
                        b.label === '80–100' ? '#059669' :
                        b.label === '60–79'  ? '#6EE7B7' :
                        b.label === '40–59'  ? '#FDE68A' :
                        b.label === '20–39'  ? '#FCA5A5' : '#E5E7EB'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── ICP Breakdown + Top Industries ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ICP breakdown */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Target className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold text-gray-900">Leads by ICP</h3>
          </div>
          {data.icpBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-sm text-gray-400">No ICPs yet.</div>
          ) : (
            <div className="space-y-3">
              {data.icpBreakdown.map(icp => {
                const max = Math.max(...data.icpBreakdown.map(i => i.leads), 1)
                const w = Math.max(Math.round((icp.leads / max) * 100), icp.leads > 0 ? 3 : 0)
                return (
                  <div key={icp.id} className="flex items-center gap-3">
                    <div className="w-32 text-right shrink-0">
                      <p className="text-xs text-gray-700 font-medium truncate">{icp.name}</p>
                      {icp.avg_score > 0 && <p className="text-[10px] text-gray-400">avg {icp.avg_score}</p>}
                    </div>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${w}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">{icp.leads}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top industries */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Top Industries</h3>
          </div>
          {data.topIndustries.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-sm text-gray-400">No leads yet.</div>
          ) : (
            <div className="space-y-3">
              {data.topIndustries.map(i => {
                const max = Math.max(...data.topIndustries.map(x => x.count), 1)
                const w = Math.max(Math.round((i.count / max) * 100), i.count > 0 ? 3 : 0)
                return (
                  <div key={i.industry} className="flex items-center gap-3">
                    <div className="w-32 text-right shrink-0">
                      <p className="text-xs text-gray-700 font-medium truncate">{i.industry}</p>
                    </div>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: `${w}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">{i.count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
