export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { PRICING, PRODUCTS, FIGSY_ADDON } from '@kind/shared'
import { Users, DollarSign, TrendingUp, AlertCircle, Clock, Target, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import { AdminNav } from '@/components/AdminNav'

interface ClientRow {
  id: string
  company_name: string | null
  created_at: string
  ttfl_hours?: number | null
  status: string | null
}

interface LeadCountRow {
  client_id: string
  total: number
  this_month: number
}

async function getAdminStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: totalClients },
    { data: activeSubs },
    { data: trialSubs },
    { count: pastDue },
    { count: totalLeads },
    { data: clients },
    { data: allLeads },
    { data: monthLeads },
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*').eq('status', 'active'),
    supabase.from('subscriptions').select('*').eq('status', 'trialing'),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'past_due'),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('clients').select('id, company_name, created_at, status').order('created_at', { ascending: false }).limit(50),
    supabase.from('leads').select('client_id, created_at').order('created_at', { ascending: true }),
    supabase.from('leads').select('client_id').gte('created_at', startOfMonth),
  ])

  const leadCounts = (() => {
    const counts: Record<string, number> = {}
    for (const row of allLeads ?? []) counts[row.client_id] = (counts[row.client_id] ?? 0) + 1
    return { data: Object.entries(counts).map(([client_id, total]) => ({ client_id, total })) as LeadCountRow[] }
  })()

  const monthLeadCounts = (() => {
    const counts: Record<string, number> = {}
    for (const row of monthLeads ?? []) counts[row.client_id] = (counts[row.client_id] ?? 0) + 1
    return { data: counts }
  })()

  const mrrUsd = (activeSubs || []).reduce((sum, sub) => sum + (sub.amount_usd || 0), 0)
  const mrrZar = Math.round(mrrUsd * 19)

  // Compute TTFL: hours from client created_at to first lead created_at
  const firstLeadByClient: Record<string, string> = {}
  for (const row of allLeads ?? []) {
    if (!firstLeadByClient[row.client_id]) firstLeadByClient[row.client_id] = row.created_at
  }

  const clientsWithTtfl = (clients ?? []).map((c: ClientRow) => {
    const firstLead = firstLeadByClient[c.id]
    const ttfl_hours = firstLead
      ? (new Date(firstLead).getTime() - new Date(c.created_at).getTime()) / 3600000
      : null
    return { ...c, ttfl_hours }
  })

  const avgTtfl = (() => {
    const withData = clientsWithTtfl.filter((c) => c.ttfl_hours !== null)
    if (!withData.length) return null
    return withData.reduce((sum, c) => sum + (c.ttfl_hours ?? 0), 0) / withData.length
  })()

  const leadCountMap: Record<string, number> = {}
  for (const row of leadCounts.data ?? []) {
    leadCountMap[row.client_id] = row.total
  }
  const monthLeadMap = monthLeadCounts.data as Record<string, number>

  return {
    totalClients: totalClients || 0,
    activeSubscriptions: activeSubs?.length || 0,
    trialClients: trialSubs?.length || 0,
    pastDue: pastDue || 0,
    totalLeads: totalLeads || 0,
    mrrZar,
    mrrUsd,
    avgTtfl,
    clients: clientsWithTtfl as ClientRow[],
    leadCountMap,
    monthLeadMap,
  }
}

function ttflColor(hours: number | null): string {
  if (hours === null) return 'text-gray-400'
  if (hours < 2) return 'text-green-600'
  if (hours <= 6) return 'text-amber-600'
  return 'text-red-600'
}

function ttflBgColor(hours: number | null): string {
  if (hours === null) return 'bg-gray-50 text-gray-400'
  if (hours < 2) return 'bg-green-50 text-green-700'
  if (hours <= 6) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

function formatTtfl(hours: number | null): string {
  if (hours === null) return '—'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}yr ago`
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, string> = {
    trial:     'bg-blue-100 text-blue-700',
    active:    'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  const cls = map[status ?? ''] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status ?? '—'}
    </span>
  )
}

const MONTHLY_TARGETS = [
  { month: 'May 2026',  mrrTarget: 500,    clientTarget: 8   },
  { month: 'Jun 2026',  mrrTarget: 2000,   clientTarget: 15  },
  { month: 'Jul 2026',  mrrTarget: 5000,   clientTarget: 30  },
  { month: 'Aug 2026',  mrrTarget: 10000,  clientTarget: 55  },
  { month: 'Sep 2026',  mrrTarget: 17000,  clientTarget: 80  },
  { month: 'Oct 2026',  mrrTarget: 26000,  clientTarget: 120 },
  { month: 'Nov 2026',  mrrTarget: 36000,  clientTarget: 160 },
  { month: 'Dec 2026',  mrrTarget: 48000,  clientTarget: 200 },
]

const KEY_KPIS = [
  { label: 'Time to First Lead',     target: '< 4 hrs',   unit: 'TTFL' },
  { label: 'Trial → Paid Conv.',     target: '> 40%',     unit: 'CVR' },
  { label: 'Monthly Churn',          target: '< 5%',      unit: 'Churn' },
  { label: 'FIGSY Reply Rate',       target: '> 3%',      unit: 'Reply' },
  { label: 'FIGSY Interested Rate',  target: '> 0.5%',    unit: 'Int.' },
  { label: 'NPS',                    target: '> 50',      unit: 'NPS' },
]

function ragStatus(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'amber'
  return 'red'
}

function RagIcon({ pct }: { pct: number }) {
  const status = ragStatus(pct)
  if (status === 'green') return <CheckCircle2 className="w-4 h-4 text-green-500" />
  if (status === 'amber') return <MinusCircle className="w-4 h-4 text-amber-500" />
  return <XCircle className="w-4 h-4 text-red-400" />
}

function getCurrentTarget() {
  const now = new Date()
  // Find the target for the current or nearest upcoming month
  const nowMs = now.getTime()
  for (const t of MONTHLY_TARGETS) {
    const d = new Date(t.month)
    if (d.getTime() >= nowMs - 86400000 * 30) return t
  }
  return MONTHLY_TARGETS[MONTHLY_TARGETS.length - 1]
}

function KpiTargetsSection({ mrrUsd, totalClients }: { mrrUsd: number; totalClients: number }) {
  const current = getCurrentTarget()
  const mrrPct     = Math.min((mrrUsd / current.mrrTarget) * 100, 100)
  const clientPct  = Math.min((totalClients / current.clientTarget) * 100, 100)

  return (
    <div className="space-y-4">
      {/* Current month progress */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-[#0066FF]" />
          <h2 className="font-semibold">KPI Progress — {current.month}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-500">MRR</span>
              <span className="font-semibold">${mrrUsd.toLocaleString()} / ${current.mrrTarget.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${ragStatus(mrrPct) === 'green' ? 'bg-green-500' : ragStatus(mrrPct) === 'amber' ? 'bg-amber-500' : 'bg-[#0066FF]'}`}
                   style={{ width: `${mrrPct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{mrrPct.toFixed(1)}% of target</p>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-500">Clients</span>
              <span className="font-semibold">{totalClients} / {current.clientTarget}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${ragStatus(clientPct) === 'green' ? 'bg-green-500' : ragStatus(clientPct) === 'amber' ? 'bg-amber-500' : 'bg-indigo-500'}`}
                   style={{ width: `${clientPct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{clientPct.toFixed(1)}% of target</p>
          </div>
        </div>
      </div>

      {/* Monthly targets roadmap */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold mb-1">Monthly Revenue Targets</h2>
        <p className="text-xs text-gray-400 mb-4">May 2026 → Dec 2026 — 8-month ramp to $48K MRR</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Month', 'MRR Target', 'Client Target', 'Current vs Target', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MONTHLY_TARGETS.map(t => {
                const isCurrentMonth = t.month === current.month
                const pct = Math.min((mrrUsd / t.mrrTarget) * 100, 100)
                const isFuture = new Date(t.month).getTime() > Date.now() + 86400000 * 30
                return (
                  <tr key={t.month} className={isCurrentMonth ? 'bg-blue-50/50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-3">
                      <span className="font-medium text-gray-900">{t.month}</span>
                      {isCurrentMonth && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Now</span>}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-700">${t.mrrTarget.toLocaleString()}</td>
                    <td className="px-3 py-3 text-gray-500">{t.clientTarget} clients</td>
                    <td className="px-3 py-3">
                      {isFuture ? (
                        <span className="text-xs text-gray-300">upcoming</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${ragStatus(pct) === 'green' ? 'bg-green-500' : ragStatus(pct) === 'amber' ? 'bg-amber-500' : 'bg-[#0066FF]'}`}
                                 style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{pct.toFixed(0)}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {!isFuture && <RagIcon pct={pct} />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key KPI targets */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold mb-1">Core KPI Targets</h2>
        <p className="text-xs text-gray-400 mb-4">Track these weekly — they're the leading indicators of growth</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {KEY_KPIS.map(k => (
            <div key={k.label} className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{k.unit}</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{k.target}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function AdminPage() {
  const stats = await getAdminStats()

  const avgTtflDisplay = stats.avgTtfl !== null ? `${stats.avgTtfl.toFixed(1)} hrs` : '—'
  const avgTtflColor = ttflBgColor(stats.avgTtfl)

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="px-8 py-6 max-w-6xl space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Clients', value: stats.totalClients, icon: <Users className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600', sub: `${stats.trialClients} on trial` },
            { label: 'MRR (USD)', value: `$${stats.mrrUsd.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'bg-green-50 text-green-600', sub: `R${stats.mrrZar.toLocaleString()} ZAR` },
            { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-indigo-50 text-indigo-600', sub: 'across all products' },
            { label: 'Past Due', value: stats.pastDue, icon: <AlertCircle className="w-5 h-5" />, color: stats.pastDue > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400', sub: 'need follow-up' },
          ].map(({ label, value, icon, color, sub }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>{icon}</div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}

          {/* Avg TTFL card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${avgTtflColor}`}>
              <Clock className="w-5 h-5" />
            </div>
            <p className={`text-2xl font-bold ${ttflColor(stats.avgTtfl)}`}>{avgTtflDisplay}</p>
            <p className="text-sm text-gray-500 mt-0.5">Avg TTFL</p>
            <p className="text-xs text-gray-400 mt-0.5">avg time to first lead</p>
          </div>
        </div>

        <KpiTargetsSection mrrUsd={stats.mrrUsd} totalClients={stats.totalClients} />

        {/* Client Pipeline Health */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-1">Client Pipeline Health</h2>
          <p className="text-xs text-gray-400 mb-4">Time to first lead, lead volumes, and subscription status per client</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Company', 'Joined', 'TTFL', 'Total Leads', 'This Month', 'Status'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.clients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 font-medium text-gray-900">{client.company_name ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">
                      {relativeDate(client.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold ${ttflColor(client.ttfl_hours ?? null)}`}>
                        {formatTtfl(client.ttfl_hours ?? null)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700">{(stats.leadCountMap[client.id] ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-3 text-gray-700">{(stats.monthLeadMap[client.id] ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-3"><StatusBadge status={client.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.clients.length === 0 && (
              <p className="text-center py-8 text-sm text-gray-400">No clients yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-1">Product Catalog</h2>
          <p className="text-xs text-gray-400 mb-4">Current pricing model — usage-based for Lead Gen, flat subscription for VA &amp; Chatbot</p>
          <div className="space-y-3">
            {Object.entries(PRICING).map(([key, p]) => (
              <div key={key} className="border border-blue-100 rounded-lg p-4 bg-blue-50/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm text-gray-900">{p.name}</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Usage-based</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">Min ${p.monthly_minimum_usd}/mo · includes {p.includes_leads} leads</p>
                <div className="space-y-1">
                  {p.tiers.map(t => (
                    <div key={t.label} className="flex justify-between text-xs text-gray-600">
                      <span>{t.label}</span>
                      <span className="font-medium">${t.rate_usd}/lead · R{t.rate_zar}/lead</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="border border-indigo-100 rounded-lg p-4 bg-indigo-50/30">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-sm text-gray-900">{FIGSY_ADDON.name}</p>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-medium">Add-on</span>
              </div>
              <p className="text-xs text-gray-400">{FIGSY_ADDON.description}</p>
              <p className="text-xs font-medium text-gray-700 mt-1">${FIGSY_ADDON.price_usd}/mo · R{FIGSY_ADDON.price_zar}/mo</p>
            </div>
            {Object.entries(PRODUCTS).map(([key, product]) => (
              <div key={key} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm text-gray-900">{product.name}</p>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">Flat subscription</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(product.tiers).map(([tier, config]) => {
                    const c = config as { price_usd: number; custom?: boolean }
                    return (
                      <div key={tier} className="flex justify-between text-xs text-gray-600">
                        <span className="capitalize">{tier}</span>
                        <span className="font-medium">{c.custom ? 'Custom' : `$${c.price_usd}/mo`}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-1">Total Leads in Platform</h2>
          <p className="text-3xl font-bold text-gray-900">{stats.totalLeads.toLocaleString()}</p>
          <p className="text-sm text-gray-400 mt-1">across all clients</p>
        </div>
      </main>
    </div>
  )
}
