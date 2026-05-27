'use client'

import { useEffect, useState } from 'react'
import { Loader2, GitMerge, AlertCircle, DollarSign, Columns } from 'lucide-react'

interface PipelineStage {
  name: string
  count: number
  totalValue: number
}

interface PipelineData {
  connected: boolean
  stages?: PipelineStage[]
}

const STAGE_LABELS: Record<string, string> = {
  appointmentscheduled:    'Appointment Scheduled',
  qualifiedtobuy:          'Qualified to Buy',
  presentationscheduled:   'Presentation Scheduled',
  decisionmakerboughtin:   'Decision Maker Bought In',
  contractsent:            'Contract Sent',
  closedwon:               'Closed Won',
  closedlost:              'Closed Lost',
}

const STAGE_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  appointmentscheduled:    { bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700',    text: 'text-blue-800' },
  qualifiedtobuy:          { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', text: 'text-indigo-800' },
  presentationscheduled:   { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', text: 'text-violet-800' },
  decisionmakerboughtin:   { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', text: 'text-purple-800' },
  contractsent:            { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700',   text: 'text-amber-800' },
  closedwon:               { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700',   text: 'text-green-800' },
  closedlost:              { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',       text: 'text-red-800' },
}

const DEFAULT_COLORS = { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700', text: 'text-gray-800' }

function formatValue(usd: number): string {
  if (usd === 0) return '$0'
  if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`
  return `$${usd.toLocaleString()}`
}

function stageLabel(name: string): string {
  return STAGE_LABELS[name] ?? name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function HubspotPage() {
  const [loading, setLoading]   = useState(true)
  const [data, setData]         = useState<PipelineData | null>(null)
  const [error, setError]       = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/proxy/internal/hubspot/pipeline')
      const json = await res.json() as { success: boolean; data?: PipelineData; error?: string }
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError(json.error ?? 'Failed to load pipeline data')
      }
    } catch {
      setError('Request failed — check API connection')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalDeals  = data?.stages?.reduce((s, st) => s + st.count, 0) ?? 0
  const totalValue  = data?.stages?.reduce((s, st) => s + st.totalValue, 0) ?? 0
  const closedWon   = data?.stages?.find(s => s.name === 'closedwon')
  const openDeals   = data?.stages?.filter(s => !['closedwon', 'closedlost'].includes(s.name))
  const openValue   = openDeals?.reduce((s, st) => s + st.totalValue, 0) ?? 0

  return (

      <div className="px-8 py-6 max-w-7xl space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HubSpot Pipeline</h1>
            <p className="text-gray-500 text-sm mt-1">Live deal pipeline synced from HubSpot CRM</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ── Not connected ─────────────────────────────────────────────────── */}
        {!loading && data && !data.connected && (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <GitMerge className="w-7 h-7 text-orange-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Connect HubSpot</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
              HubSpot integration is not active. Set the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">HUBSPOT_API_KEY</code> environment
              variable in your Railway service to enable automatic CRM sync.
            </p>
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 text-left max-w-lg mx-auto space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Setup Instructions</p>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Go to your HubSpot account → Settings → Integrations → Private Apps</li>
                <li>Create a new Private App with scopes: <code className="bg-gray-100 px-1 rounded text-xs font-mono">crm.objects.contacts.write</code>, <code className="bg-gray-100 px-1 rounded text-xs font-mono">crm.objects.companies.write</code>, <code className="bg-gray-100 px-1 rounded text-xs font-mono">crm.objects.deals.write</code></li>
                <li>Copy the generated token</li>
                <li>Add <code className="bg-gray-100 px-1 rounded text-xs font-mono">HUBSPOT_API_KEY=pat-na1-xxxx</code> to Railway environment variables</li>
                <li>Redeploy the API service</li>
              </ol>
            </div>
          </div>
        )}

        {/* ── Summary cards ─────────────────────────────────────────────────── */}
        {!loading && data?.connected && data.stages && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Deals</p>
                <p className="text-2xl font-bold text-gray-900">{totalDeals}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Open Pipeline</p>
                <p className="text-2xl font-bold text-gray-900">{formatValue(openValue)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Closed Won</p>
                <p className="text-2xl font-bold text-green-600">{formatValue(closedWon?.totalValue ?? 0)}</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatValue(totalValue)}</p>
              </div>
            </div>

            {/* ── Kanban columns ────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Columns className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Deal Stages</h2>
              </div>

              {data.stages.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
                  No deals found in HubSpot yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                  {data.stages.map((stage) => {
                    const colors = STAGE_COLORS[stage.name] ?? DEFAULT_COLORS
                    return (
                      <div
                        key={stage.name}
                        className={`${colors.bg} border ${colors.border} rounded-xl p-4 flex flex-col gap-3`}
                      >
                        <div>
                          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                            {stage.count} deal{stage.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div>
                          <p className={`text-sm font-semibold leading-tight ${colors.text}`}>
                            {stageLabel(stage.name)}
                          </p>
                        </div>
                        <div className="mt-auto pt-2 border-t border-black/5">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-gray-400" />
                            <span className="text-sm font-bold text-gray-800">
                              {formatValue(stage.totalValue)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">total value</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Loading skeleton ───────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading pipeline…</span>
            </div>
          </div>
        )}
    </div>
  )
}
