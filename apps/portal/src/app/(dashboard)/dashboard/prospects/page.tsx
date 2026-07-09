'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Search, Download, Users, TrendingUp, MessageSquare, Flame,
  ChevronDown, ChevronRight, ExternalLink, Calendar, X,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Prospect {
  id: string
  first_name: string | null
  last_name: string | null
  title: string | null
  company: string | null
  email: string | null
  status: string | null
  score: number | null
  icp_id: string | null
  created_at: string
  linkedin_url: string | null
  email_draft?: string | null
  icp_name?: string | null
  score_reasoning?: string | null
}

interface LeadStats {
  total: number
  this_month: number
  hot: number
  replied: number
}

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">—</span>
  }
  const color =
    score >= 80 ? 'bg-green-100 text-green-700' :
    score >= 60 ? 'bg-amber-100 text-amber-700' :
    'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}
    </span>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending:       'Pending',
  scored:        'Scored',
  consent_sent:  'Contacted',
  consent_given: 'Consented',
  exported:      'In Pipeline',
  rejected:      'Rejected',
  opted_out:     'Opted Out',
  replied:       'Replied',
}
const STATUS_COLORS: Record<string, string> = {
  pending:       'bg-gray-100 text-gray-600',
  scored:        'bg-blue-100 text-blue-700',
  consent_sent:  'bg-indigo-100 text-indigo-700',
  consent_given: 'bg-green-100 text-green-700',
  exported:      'bg-purple-100 text-purple-700',
  rejected:      'bg-red-100 text-red-700',
  opted_out:     'bg-gray-100 text-gray-400',
  replied:       'bg-teal-100 text-teal-700',
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const label = STATUS_LABELS[status] ?? status
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')
  const hue = (name.charCodeAt(0) * 37 + (name.charCodeAt(1) ?? 0) * 13) % 360
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
      style={{ background: `hsl(${hue}, 55%, 55%)` }}
    >
      {initials || '?'}
    </div>
  )
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value, icon: Icon, accent }: {
  label: string; value: number | string; icon: React.ElementType; accent?: string
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm px-4 py-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ?? 'bg-[#F5F0FF]'}`}>
        <Icon className="w-4 h-4 text-[#7C3AED]" />
      </div>
      <div>
        <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-[#9B8EC4] mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Expanded row ──────────────────────────────────────────────────────────────
function ExpandedRow({ prospect }: { prospect: Prospect }) {
  return (
    <tr className="bg-[#F5F0FF]/30">
      <td colSpan={7} className="px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {/* ICP */}
          <div>
            <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wide mb-1">ICP Profile</p>
            <p className="text-gray-700">{prospect.icp_name ?? '—'}</p>
          </div>
          {/* Score reasoning */}
          <div>
            <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wide mb-1">Score Reasoning</p>
            <p className="text-gray-700 leading-relaxed">{prospect.score_reasoning ?? 'No reasoning available.'}</p>
          </div>
          {/* Email draft */}
          <div>
            <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wide mb-1">Email Draft</p>
            {prospect.email_draft ? (
              <p className="text-gray-700 leading-relaxed text-xs whitespace-pre-wrap line-clamp-6">{prospect.email_draft}</p>
            ) : (
              <p className="text-gray-400 italic text-xs">No draft yet — enrol in a campaign to generate one.</p>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProspectsPage() {
  const supabase = createClient()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [stats, setStats] = useState<LeadStats>({ total: 0, this_month: 0, hot: 0, replied: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [scoreMin, setScoreMin] = useState(0)
  const [scoreMax, setScoreMax] = useState(100)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const [leadsRes, statsRes] = await Promise.allSettled([
        api.get<{ data: Prospect[]; total?: number }>('/leads?limit=500', token),
        api.get<{ data: LeadStats }>('/leads/stats', token),
      ])

      if (leadsRes.status === 'fulfilled') {
        const data = leadsRes.value.data ?? []
        setProspects(data)
        // Compute stats from data if API stats fail
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        setStats({
          total: data.length,
          this_month: data.filter(p => new Date(p.created_at) >= monthStart).length,
          hot: data.filter(p => (p.score ?? 0) >= 80).length,
          replied: data.filter(p => p.status === 'replied' || p.status === 'consent_given').length,
        })
      } else {
        throw new Error((leadsRes.reason as Error)?.message ?? 'Failed to load prospects')
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setStats(statsRes.value.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prospects')
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    return prospects.filter(p => {
      const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase()
      const company = (p.company ?? '').toLowerCase()
      const q = search.toLowerCase()
      if (q && !name.includes(q) && !company.includes(q)) return false
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      const s = p.score ?? 0
      if (s < scoreMin || s > scoreMax) return false
      return true
    })
  }, [prospects, search, statusFilter, scoreMin, scoreMax])

  async function handleExport() {
    setExporting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
      // #384 — the real endpoint is /leads/export/csv (leads.ts:1058); /leads/export 404'd.
      const res = await fetch(`${API_URL}/leads/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prospects-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail — export is best-effort
    }
    setExporting(false)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Prospects
            {!loading && (
              <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-[#F5F0FF] text-[#7C3AED] border border-purple-100/60">
                {stats.total.toLocaleString()} total
              </span>
            )}
          </h1>
          <p className="text-sm text-[#7B6FA0] mt-0.5">
            Every lead ever touched — across all campaigns and ICP runs.
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="flex items-center gap-2 px-4 py-2 border border-purple-100/80 hover:border-gray-300 text-gray-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip label="Total" value={loading ? '…' : stats.total.toLocaleString()} icon={Users} />
        <StatChip label="This Month" value={loading ? '…' : stats.this_month.toLocaleString()} icon={Calendar} />
        <StatChip label="Hot (80+)" value={loading ? '…' : stats.hot.toLocaleString()} icon={Flame} accent="bg-green-50" />
        <StatChip label="Replied" value={loading ? '…' : stats.replied.toLocaleString()} icon={MessageSquare} />
      </div>

      {/* Filter bar */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B8EC4]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or company…"
              className="w-full pl-9 pr-3 py-2 border border-purple-100/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-purple-100/80 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 bg-white"
            >
              <option value="all">All statuses</option>
              <option value="scored">Scored</option>
              <option value="consent_sent">Contacted</option>
              <option value="consent_given">Consented</option>
              <option value="replied">Replied</option>
              <option value="opted_out">Opted Out</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Score range */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-xs text-[#9B8EC4] shrink-0">Score:</span>
            <input
              type="number"
              min={0} max={100}
              value={scoreMin}
              onChange={e => setScoreMin(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              className="w-14 border border-purple-100/80 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
            />
            <span className="text-[#9B8EC4]">–</span>
            <input
              type="number"
              min={0} max={100}
              value={scoreMax}
              onChange={e => setScoreMax(Math.max(0, Math.min(100, parseInt(e.target.value) || 100)))}
              className="w-14 border border-purple-100/80 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[#9B8EC4]">Loading prospects…</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-sm font-medium text-red-600">Could not load prospects</p>
            <p className="text-xs text-[#7B6FA0]">{error}</p>
            <button
              onClick={load}
              className="px-4 py-2 bg-[#7C3AED] text-white text-sm font-medium rounded-lg hover:bg-[#6D28D9] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 && prospects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F0FF] flex items-center justify-center">
              <Users className="w-7 h-7 text-[#9B8EC4]" />
            </div>
            <p className="text-gray-600 font-medium">No prospects yet</p>
            <p className="text-sm text-[#9B8EC4] text-center max-w-xs">
              No prospects yet — run your first ICP to start building your database
            </p>
            <a
              href="/dashboard/leads/icp"
              className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Run an ICP
            </a>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Search className="w-8 h-8 text-[#9B8EC4]" />
            <p className="text-gray-600 font-medium">No results</p>
            <p className="text-sm text-[#9B8EC4]">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-100/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#9B8EC4] uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#9B8EC4] uppercase tracking-wide hidden sm:table-cell">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#9B8EC4] uppercase tracking-wide hidden md:table-cell">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#9B8EC4] uppercase tracking-wide">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#9B8EC4] uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#9B8EC4] uppercase tracking-wide hidden lg:table-cell">Added</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#9B8EC4] uppercase tracking-wide w-8"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(prospect => {
                  const fullName = [prospect.first_name, prospect.last_name].filter(Boolean).join(' ') || prospect.email || 'Unknown'
                  const isExpanded = expandedId === prospect.id
                  return (
                    <>
                      <tr
                        key={prospect.id}
                        onClick={() => setExpandedId(isExpanded ? null : prospect.id)}
                        className="border-b border-purple-100/30 hover:bg-[#F5F0FF]/20 cursor-pointer transition-colors"
                      >
                        {/* Name + avatar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={fullName} />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{fullName}</p>
                              {prospect.email && (
                                <p className="text-xs text-[#9B8EC4] truncate">{prospect.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Title */}
                        <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                          <span className="truncate max-w-[160px] block">{prospect.title ?? '—'}</span>
                        </td>
                        {/* Company */}
                        <td className="px-4 py-3 text-gray-700 font-medium hidden md:table-cell">
                          {prospect.company ?? '—'}
                        </td>
                        {/* Score */}
                        <td className="px-4 py-3">
                          <ScoreBadge score={prospect.score} />
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge status={prospect.status} />
                        </td>
                        {/* Added date */}
                        <td className="px-4 py-3 text-xs text-[#9B8EC4] hidden lg:table-cell">
                          {new Date(prospect.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        {/* LinkedIn + expand */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {prospect.linkedin_url && (
                              <a
                                href={prospect.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-[#0A66C2] hover:text-[#004182] transition-colors"
                                title="View on LinkedIn"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4 text-[#9B8EC4]" />
                              : <ChevronRight className="w-4 h-4 text-[#9B8EC4]" />
                            }
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <ExpandedRow key={`${prospect.id}-expanded`} prospect={prospect} />
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>

            {/* Footer count */}
            <div className="px-4 py-3 border-t border-purple-100/40 text-xs text-[#9B8EC4]">
              Showing {filtered.length.toLocaleString()} of {prospects.length.toLocaleString()} prospects
              {(search || statusFilter !== 'all' || scoreMin > 0 || scoreMax < 100) && (
                <button
                  onClick={() => { setSearch(''); setStatusFilter('all'); setScoreMin(0); setScoreMax(100) }}
                  className="ml-3 text-[#7C3AED] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
