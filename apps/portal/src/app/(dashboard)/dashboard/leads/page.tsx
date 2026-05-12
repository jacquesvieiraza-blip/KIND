'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import type { Lead, LeadStats, ICP } from '@kind/shared'
import { SCORE_THRESHOLDS } from '@kind/shared'
import {
  Users, TrendingUp, ShieldCheck, Download, Search, Filter,
  ChevronDown, Mail, Ban, Sparkles, Loader2, ExternalLink,
  AlertCircle, CheckCircle, Clock, XCircle, Plus, Settings2,
  DollarSign,
} from 'lucide-react'

// ── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-xs">—</span>
  const color = score >= SCORE_THRESHOLDS.high
    ? 'bg-green-100 text-green-700'
    : score >= SCORE_THRESHOLDS.medium
    ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{score}</span>
}

// ── Status chip ───────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  pending:       { label: 'Pending',   icon: <Clock className="w-3 h-3" />,       cls: 'bg-gray-100 text-gray-600' },
  scored:        { label: 'Scored',    icon: <TrendingUp className="w-3 h-3" />,  cls: 'bg-blue-100 text-blue-700' },
  consent_sent:  { label: 'Sent',      icon: <Mail className="w-3 h-3" />,         cls: 'bg-indigo-100 text-indigo-700' },
  consent_given: { label: 'Consented', icon: <CheckCircle className="w-3 h-3" />, cls: 'bg-green-100 text-green-700' },
  exported:      { label: 'Exported',  icon: <Download className="w-3 h-3" />,    cls: 'bg-purple-100 text-purple-700' },
  rejected:      { label: 'Rejected',  icon: <XCircle className="w-3 h-3" />,     cls: 'bg-red-100 text-red-700' },
  opted_out:     { label: 'Opted out', icon: <Ban className="w-3 h-3" />,         cls: 'bg-gray-100 text-gray-400' },
}

function StatusChip({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, icon: null, cls: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>
      {m.icon}{m.label}
    </span>
  )
}

// ── Apollo badge ──────────────────────────────────────────────────────────────
function ApolloBadge({ consented }: { consented: boolean }) {
  return consented
    ? <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600 font-medium">✓ Apollo</span>
    : null
}

export default function LeadsPage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [stats, setStats] = useState<LeadStats | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [icps, setIcps] = useState<ICP[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [emailDraft, setEmailDraft] = useState<{ leadId: string; draft: string } | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [minScore, setMinScore] = useState('')
  const [icpFilter, setIcpFilter] = useState('')
  const [apolloOnly, setApolloOnly] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const fetchData = useCallback(async (tok: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      if (minScore)     params.set('min_score', minScore)
      if (icpFilter)    params.set('icp_id', icpFilter)
      if (apolloOnly)   params.set('apollo_consented', 'true')

      const [statsRes, leadsRes, icpsRes] = await Promise.all([
        api.get<{ data: LeadStats }>('/leads/stats', tok),
        api.get<{ data: Lead[]; total: number }>(`/leads?${params}`, tok),
        api.get<{ data: ICP[] }>('/icps', tok),
      ])
      setStats(statsRes.data)
      setLeads(leadsRes.data || [])
      setTotal(leadsRes.total || 0)
      setIcps(icpsRes.data || [])
    } catch { }
    setLoading(false)
  }, [page, statusFilter, minScore, icpFilter, apolloOnly])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setToken(session.access_token); fetchData(session.access_token) }
    })
  }, [fetchData])

  async function updateStatus(leadId: string, status: Lead['status']) {
    if (!token) return
    setActionLoading(`status-${leadId}`)
    try {
      await api.patch(`/leads/${leadId}/status`, { status }, token)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))
    } catch { }
    setActionLoading(null)
  }

  async function blockLead(leadId: string) {
    if (!token || !confirm('Permanently block this lead? They will be removed from all future pipelines.')) return
    setActionLoading(`block-${leadId}`)
    try {
      await api.post(`/leads/${leadId}/optout`, { reason: 'manual_block' }, token)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: 'opted_out' } : l))
    } catch { }
    setActionLoading(null)
  }

  async function draftEmail(leadId: string) {
    if (!token) return
    setActionLoading(`email-${leadId}`)
    try {
      const res = await api.post<{ data: { draft: string } }>(`/leads/${leadId}/draft-email`, {}, token)
      setEmailDraft({ leadId, draft: res.data.draft })
    } catch { }
    setActionLoading(null)
  }

  async function exportCSV() {
    if (!token) return
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/leads/export/csv?token=${token}`, '_blank')
  }

  const filteredLeads = leads.filter(l =>
    !search || `${l.first_name} ${l.last_name} ${l.company} ${l.job_title}`.toLowerCase().includes(search.toLowerCase())
  )

  const statCards = [
    { label: 'Total Leads',      value: stats?.total ?? 0,              icon: <Users className="w-5 h-5" />,       color: 'bg-blue-50 text-blue-600' },
    { label: 'Avg Score',        value: `${stats?.avg_score ?? 0}/100`, icon: <TrendingUp className="w-5 h-5" />,  color: 'bg-indigo-50 text-indigo-600' },
    { label: 'POPIA Consented',  value: stats?.consented ?? 0,          icon: <ShieldCheck className="w-5 h-5" />, color: 'bg-green-50 text-green-600' },
    { label: 'Pipeline Value',   value: `$${(stats?.pipeline_value_usd ?? 0).toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Lead Generation</h1>
          <p className="text-gray-500 text-sm mt-1">Precision-targeted B2B leads, AI-scored and POPIA-compliant.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/dashboard/leads/icp"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors">
            <Settings2 className="w-4 h-4" />ICP Settings
          </a>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors">
            <Download className="w-4 h-4" />Export CSV
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>{icon}</div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Compliance notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>POPIA & GDPR compliant.</strong> All leads are sourced from Apollo with consent filters active.
          Opt-out requests are permanently blocked across all clients. Only send outreach to <strong>Consented</strong> leads.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
            <option value="">All statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={minScore} onChange={e => { setMinScore(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
            <option value="">Any score</option>
            <option value="80">Score 80+</option>
            <option value="60">Score 60+</option>
            <option value="40">Score 40+</option>
          </select>
          {icps.length > 0 && (
            <select value={icpFilter} onChange={e => { setIcpFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option value="">All ICPs</option>
              {icps.map(icp => <option key={icp.id} value={icp.id}>{icp.name}</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 px-3 py-2 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
            <input type="checkbox" checked={apolloOnly} onChange={e => { setApolloOnly(e.target.checked); setPage(1) }}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500" />
            Apollo consented only
          </label>
        </div>
      </div>

      {/* Lead table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            {icps.length === 0 ? (
              <>
                <p className="text-sm font-medium text-gray-700">No ICP set up yet</p>
                <p className="text-xs mt-1">Define your ideal customer profile so K.I.N.D knows who to find.</p>
                <a href="/dashboard/leads/icp"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
                  <Plus className="w-4 h-4" />Build your ICP
                </a>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">No leads yet</p>
                <p className="text-xs mt-1">Your ICP is saved — run it to pull matching leads from Apollo.</p>
                <a href="/dashboard/leads/icp"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors">
                  <Settings2 className="w-4 h-4" />Run your ICP →
                </a>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Lead', 'Company', 'Score', 'Status', 'Source', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className={`hover:bg-gray-50 transition-colors ${lead.status === 'opted_out' ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{lead.first_name} {lead.last_name}</p>
                        <p className="text-xs text-gray-400">{lead.job_title || '—'}</p>
                        {lead.email && <p className="text-xs text-gray-400">{lead.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700">{lead.company || '—'}</p>
                        <p className="text-xs text-gray-400">{lead.country || ''}</p>
                      </td>
                      <td className="px-4 py-3"><ScoreBadge score={lead.score} /></td>
                      <td className="px-4 py-3"><StatusChip status={lead.status} /></td>
                      <td className="px-4 py-3">
                        <ApolloBadge consented={lead.apollo_consented} />
                        {lead.linkedin_url && (
                          <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 ml-1 text-xs text-blue-500 hover:underline">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.status !== 'opted_out' && (
                          <div className="flex items-center gap-1">
                            {lead.status === 'scored' && (
                              <button onClick={() => updateStatus(lead.id, 'consent_sent')}
                                disabled={actionLoading === `status-${lead.id}`}
                                title="Send POPIA consent"
                                className="p-1.5 rounded-md hover:bg-indigo-50 text-indigo-600 transition-colors disabled:opacity-40">
                                {actionLoading === `status-${lead.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {lead.status === 'consent_sent' && (
                              <button onClick={() => updateStatus(lead.id, 'consent_given')}
                                disabled={actionLoading === `status-${lead.id}`}
                                title="Mark as consented"
                                className="p-1.5 rounded-md hover:bg-green-50 text-green-600 transition-colors disabled:opacity-40">
                                {actionLoading === `status-${lead.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {lead.status === 'consent_given' && lead.email && (
                              <button onClick={() => draftEmail(lead.id)}
                                disabled={actionLoading === `email-${lead.id}`}
                                title="Generate AI outreach email"
                                className="p-1.5 rounded-md hover:bg-purple-50 text-purple-600 transition-colors disabled:opacity-40">
                                {actionLoading === `email-${lead.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <button onClick={() => blockLead(lead.id)}
                              disabled={actionLoading === `block-${lead.id}`}
                              title="Permanently block this lead"
                              className="p-1.5 rounded-md hover:bg-red-50 text-red-400 transition-colors disabled:opacity-40">
                              {actionLoading === `block-${lead.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 50 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">Showing {Math.min(page * 50, total)} of {total} leads</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:border-gray-400 disabled:opacity-40 transition-colors">Previous</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:border-gray-400 disabled:opacity-40 transition-colors">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* AI Email draft modal */}
      {emailDraft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">AI-generated outreach email</h3>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-4 max-h-72 overflow-y-auto">
              {emailDraft.draft}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => { navigator.clipboard.writeText(emailDraft.draft) }}
                className="flex-1 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
                Copy to clipboard
              </button>
              <button onClick={() => setEmailDraft(null)}
                className="px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:border-gray-400 transition-colors">
                Close
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">Review before sending. Only send to POPIA-consented leads.</p>
          </div>
        </div>
      )}
    </div>
  )
}
