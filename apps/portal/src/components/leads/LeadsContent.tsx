'use client'

import { useState, useEffect, useCallback, MutableRefObject } from 'react'
import { api } from '@/lib/api'
import {
  Users,
  TrendingUp,
  ShieldCheck,
  Download,
  Linkedin,
  Loader2,
  Search,
  Filter,
  CheckSquare,
  Square,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'

type LeadStatus = 'pending' | 'scored' | 'consent_sent' | 'consent_given' | 'exported' | 'rejected'

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  job_title: string | null
  company: string | null
  linkedin_url: string | null
  country: string | null
  score: number | null
  score_reasoning: string | null
  status: LeadStatus
  consent_given_at: string | null
  exported_at: string | null
  created_at: string
}

interface LeadStats {
  total: number
  scored: number
  consented: number
  exported: number
  avg_score: number
}

const STATUS_STYLES: Record<LeadStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  scored: 'bg-blue-50 text-blue-700',
  consent_sent: 'bg-amber-50 text-amber-700',
  consent_given: 'bg-green-50 text-green-700',
  exported: 'bg-purple-50 text-purple-700',
  rejected: 'bg-red-50 text-red-600',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  pending: 'Pending',
  scored: 'Scored',
  consent_sent: 'Consent Sent',
  consent_given: 'Consented',
  exported: 'Exported',
  rejected: 'Rejected',
}

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'scored', label: 'Scored' },
  { value: 'consent_sent', label: 'Consent Sent' },
  { value: 'consent_given', label: 'Consented' },
  { value: 'exported', label: 'Exported' },
]

function scoreColor(score: number | null) {
  if (score === null) return 'bg-gray-100 text-gray-400'
  if (score >= 80) return 'bg-green-100 text-green-700'
  if (score >= 60) return 'bg-blue-100 text-blue-700'
  if (score >= 40) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-600'
}

function buildCsv(leads: Lead[]): string {
  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Job Title', 'Company', 'Country', 'Score', 'LinkedIn', 'Status']
  const rows = leads.map((l) => [
    l.first_name,
    l.last_name,
    l.email ?? '',
    l.phone ?? '',
    l.job_title ?? '',
    l.company ?? '',
    l.country ?? '',
    l.score?.toString() ?? '',
    l.linkedin_url ?? '',
    l.status,
  ])
  return [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

export function LeadsContent({
  token,
  refreshRef,
}: {
  token: string
  refreshRef?: MutableRefObject<(() => void) | null>
}) {
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState('')
  const [minScore, setMinScore] = useState('')
  const [search, setSearch] = useState('')
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null)

  const LIMIT = 50

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get<{ data: LeadStats }>('/leads/stats', token)
      setStats(res.data)
    } catch { /* ignore */ }
  }, [token])

  const fetchLeads = useCallback(async (p: number, status: string, score: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (status) params.set('status', status)
      if (score) params.set('min_score', score)
      const res = await api.get<{ data: Lead[]; total: number }>(`/leads?${params}`, token)
      setLeads(res.data ?? [])
      setTotal(res.total ?? 0)
    } catch { /* ignore */ }
    setLoading(false)
  }, [token])

  useEffect(() => {
    fetchStats()
    fetchLeads(1, '', '')
  }, [fetchStats, fetchLeads])

  // Expose a refresh function to the parent wrapper
  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = () => {
        setPage(1)
        setStatusFilter('')
        setMinScore('')
        fetchStats()
        fetchLeads(1, '', '')
      }
    }
  }, [refreshRef, fetchStats, fetchLeads])

  function applyFilters() {
    setPage(1)
    setSelected(new Set())
    fetchLeads(1, statusFilter, minScore)
  }

  function clearFilters() {
    setStatusFilter('')
    setMinScore('')
    setSearch('')
    setPage(1)
    setSelected(new Set())
    fetchLeads(1, '', '')
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const exportableLeads = leads.filter((l) => l.status === 'consent_given')
  const selectedExportable = exportableLeads.filter((l) => selected.has(l.id))

  function toggleAllExportable() {
    if (selectedExportable.length === exportableLeads.length && exportableLeads.length > 0) {
      setSelected((prev) => {
        const next = new Set(prev)
        exportableLeads.forEach((l) => next.delete(l.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        exportableLeads.forEach((l) => next.add(l.id))
        return next
      })
    }
  }

  async function handleExport() {
    const ids = Array.from(selected).filter((id) => exportableLeads.some((l) => l.id === id))
    if (!ids.length) return
    setExporting(true)
    try {
      const res = await api.post<{ data: Lead[] }>('/leads/export', { lead_ids: ids }, token)
      const csv = buildCsv(res.data)
      downloadCsv(csv, `kind-leads-${new Date().toISOString().slice(0, 10)}.csv`)
      setSelected(new Set())
      fetchStats()
      fetchLeads(page, statusFilter, minScore)
    } catch { /* ignore */ }
    setExporting(false)
  }

  const filteredLeads = search
    ? leads.filter((l) =>
        [l.first_name, l.last_name, l.email, l.company, l.job_title]
          .some((v) => v?.toLowerCase().includes(search.toLowerCase()))
      )
    : leads

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats?.total ?? '—'} icon={<Users className="w-5 h-5" />} color="bg-blue-50 text-blue-600" />
        <StatCard label="Avg Score" value={stats ? `${stats.avg_score}/100` : '—'} icon={<TrendingUp className="w-5 h-5" />} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="POPIA Consented" value={stats?.consented ?? '—'} icon={<ShieldCheck className="w-5 h-5" />} color="bg-green-50 text-green-600" />
        <StatCard label="Exported" value={stats?.exported ?? '—'} icon={<Download className="w-5 h-5" />} color="bg-purple-50 text-purple-600" />
      </div>

      {/* Lead Pipeline */}
      <div className="bg-white rounded-xl border border-gray-100">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-gray-900 mr-auto">Lead Pipeline</h2>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 w-44"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Min score */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400" />
            <input
              type="number"
              min={0}
              max={100}
              placeholder="Min score"
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            onClick={applyFilters}
            className="text-sm bg-brand-500 hover:bg-brand-600 text-white font-medium px-3 py-2 rounded-lg transition-colors"
          >
            Apply
          </button>
          {(statusFilter || minScore) && (
            <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2">
              Clear
            </button>
          )}

          {/* Export button */}
          {selectedExportable.length > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export {selectedExportable.length} lead{selectedExportable.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Export hint */}
        {exportableLeads.length > 0 && selectedExportable.length === 0 && (
          <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-xs text-green-700">
              {exportableLeads.length} consented lead{exportableLeads.length !== 1 ? 's' : ''} ready to export. Select them to download as CSV.
            </p>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No leads found.</p>
            {(statusFilter || minScore || search) && (
              <button onClick={clearFilters} className="text-xs text-brand-500 mt-1 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3 w-8">
                    <button onClick={toggleAllExportable} className="text-gray-400 hover:text-gray-600">
                      {selectedExportable.length > 0 && selectedExportable.length === exportableLeads.length
                        ? <CheckSquare className="w-4 h-4 text-brand-500" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Job Title</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.map((lead) => {
                  const isExportable = lead.status === 'consent_given'
                  const isSelected = selected.has(lead.id)
                  return (
                    <>
                      <tr
                        key={lead.id}
                        className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-brand-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          {isExportable ? (
                            <button onClick={() => toggleRow(lead.id)} className="text-gray-400 hover:text-brand-500">
                              {isSelected
                                ? <CheckSquare className="w-4 h-4 text-brand-500" />
                                : <Square className="w-4 h-4" />}
                            </button>
                          ) : (
                            <span className="w-4 h-4 block" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </div>
                          {lead.email && (
                            <div className="text-xs text-gray-400 mt-0.5">{lead.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{lead.job_title ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700">{lead.company ?? '—'}</div>
                          {lead.country && <div className="text-xs text-gray-400">{lead.country}</div>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {lead.score !== null ? (
                            <button
                              onClick={() => setExpandedReasoning(expandedReasoning === lead.id ? null : lead.id)}
                              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${scoreColor(lead.score)} cursor-pointer hover:opacity-80`}
                            >
                              {lead.score}
                              {lead.score_reasoning && <AlertCircle className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[lead.status]}`}>
                            {STATUS_LABELS[lead.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {lead.linkedin_url && (
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-300 hover:text-brand-500 transition-colors"
                            >
                              <Linkedin className="w-4 h-4" />
                            </a>
                          )}
                        </td>
                      </tr>
                      {expandedReasoning === lead.id && lead.score_reasoning && (
                        <tr key={`${lead.id}-reasoning`} className="bg-blue-50">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <ExternalLink className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                              <p className="text-xs text-blue-700">{lead.score_reasoning}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>{total.toLocaleString()} leads total</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => { setPage(page - 1); fetchLeads(page - 1, statusFilter, minScore) }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => { setPage(page + 1); fetchLeads(page + 1, statusFilter, minScore) }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
