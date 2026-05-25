export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { PRICING, PRODUCTS } from '@kind/shared'
import { Users, DollarSign, TrendingUp, AlertCircle, Clock, Target, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'

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
  if (hours === null) return 'text-white/40'
  if (hours < 2) return 'text-emerald-400'
  if (hours <= 6) return 'text-amber-400'
  return 'text-red-400'
}

function ttflBgColor(hours: number | null): string {
  if (hours === null) return 'bg-white/5 text-white/40'
  if (hours < 2) return 'bg-emerald-400/10 text-emerald-400'
  if (hours <= 6) return 'bg-amber-400/10 text-amber-400'
  return 'bg-red-400/10 text-red-400'
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
    trial:     'bg-blue-400/10 text-blue-400 border border-blue-400/20',
    active:    'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20',
    cancelled: 'bg-white/5 text-white/30 border border-white/10',
  }
  const cls = map[status ?? ''] ?? 'bg-white/5 text-white/30 border border-white/10'
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
  if (status === 'green') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
  if (status === 'amber') return <MinusCircle className="w-4 h-4 text-amber-400" />
  return <XCircle className="w-4 h-4 text-red-400" />
}

function getCurrentTarget() {
  const now = new Date()
  const nowMs = now.getTime()
  for (const t of MONTHLY_TARGETS) {
    const d = new Date(t.month)
    if (d.getTime() >= nowMs - 86400000 * 30) return t
  }
  return MONTHLY_TARGETS[MONTHLY_TARGETS.length - 1]
}

function KpiTargetsSection({ mrrUsd, totalClients }: { mrrUsd: number; totalClients: number }) {
  const current = getCurrentTarget()
  const mrrPct    = Math.min((mrrUsd / current.mrrTarget) * 100, 100)
  const clientPct = Math.min((totalClients / current.clientTarget) * 100, 100)

  return (
    <div className="space-y-4">
      {/* Current month progress */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-[#0066FF]" />
          <h2 className="font-semibold text-white">KPI Progress — {current.month}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-white/60">MRR</span>
              <span className="font-semibold text-white">${mrrUsd.toLocaleString()} / ${current.mrrTarget.toLocaleString()}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${ragStatus(mrrPct) === 'green' ? 'bg-emerald-400' : ragStatus(mrrPct) === 'amber' ? 'bg-amber-400' : 'bg-[#0066FF]'}`}
                   style={{ width: `${mrrPct}%` }} />
            </div>
            <p className="text-xs text-white/30 mt-1">{mrrPct.toFixed(1)}% of target</p>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-white/60">Clients</span>
              <span className="font-semibold text-white">{totalClients} / {current.clientTarget}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${ragStatus(clientPct) === 'green' ? 'bg-emerald-400' : ragStatus(clientPct) === 'amber' ? 'bg-amber-400' : 'bg-indigo-400'}`}
                   style={{ width: `${clientPct}%` }} />
            </div>
            <p className="text-xs text-white/30 mt-1">{clientPct.toFixed(1)}% of target</p>
          </div>
        </div>
      </div>

      {/* Monthly targets roadmap */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-1">Monthly Revenue Targets</h2>
        <p className="text-xs text-white/40 mb-4">May 2026 → Dec 2026 — 8-month ramp to $48K MRR</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Month', 'MRR Target', 'Client Target', 'Current vs Target', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {MONTHLY_TARGETS.map(t => {
                const isCurrentMonth = t.month === current.month
                const pct = Math.min((mrrUsd / t.mrrTarget) * 100, 100)
                const isFuture = new Date(t.month).getTime() > Date.now() + 86400000 * 30
                return (
                  <tr key={t.month} className={isCurrentMonth ? 'bg-[#0066FF]/10' : 'hover:bg-white/[0.03]'}>
                    <td className="px-3 py-3">
                      <span className="font-medium text-white">{t.month}</span>
                      {isCurrentMonth && <span className="ml-2 text-xs bg-[#0066FF]/20 text-[#4d94ff] px-1.5 py-0.5 rounded font-medium">Now</span>}
                    </td>
                    <td className="px-3 py-3 font-medium text-white/70">${t.mrrTarget.toLocaleString()}</td>
                    <td className="px-3 py-3 text-white/50">{t.clientTarget} clients</td>
                    <td className="px-3 py-3">
                      {isFuture ? (
                        <span className="text-xs text-white/20">upcoming</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-white/10 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${ragStatus(pct) === 'green' ? 'bg-emerald-400' : ragStatus(pct) === 'amber' ? 'bg-amber-400' : 'bg-[#0066FF]'}`}
                                 style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-white/50">{pct.toFixed(0)}%</span>
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
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-1">Core KPI Targets</h2>
        <p className="text-xs text-white/40 mb-4">Track these weekly — they&apos;re the leading indicators of growth</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {KEY_KPIS.map(k => (
            <div key={k.label} className="bg-white/[0.04] border border-white/[0.06] rounded-lg px-4 py-3">
              <p className="text-xs text-white/30 font-medium uppercase tracking-wide">{k.unit}</p>
              <p className="text-lg font-bold text-white mt-0.5">{k.target}</p>
              <p className="text-xs text-white/50 mt-0.5">{k.label}</p>
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
  const avgTtflColorCls = ttflBgColor(stats.avgTtfl)

  return (
    <main className="px-8 py-6 max-w-6xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/40 mt-0.5">K.I.N.D Founder OS — operational overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Clients',        value: stats.totalClients,        icon: <Users className="w-5 h-5" />,      color: 'bg-blue-400/10 text-blue-400',    sub: `${stats.trialClients} on trial` },
          { label: 'MRR (USD)',             value: `$${stats.mrrUsd.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'bg-emerald-400/10 text-emerald-400', sub: `R${stats.mrrZar.toLocaleString()} ZAR` },
          { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-indigo-400/10 text-indigo-400',  sub: 'across all products' },
          { label: 'Past Due',             value: stats.pastDue,             icon: <AlertCircle className="w-5 h-5" />, color: stats.pastDue > 0 ? 'bg-red-400/10 text-red-400' : 'bg-white/5 text-white/30', sub: 'need follow-up' },
        ].map(({ label, value, icon, color, sub }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>{icon}</div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-white/60 mt-0.5">{label}</p>
            <p className="text-xs text-white/30 mt-0.5">{sub}</p>
          </div>
        ))}

        {/* Avg TTFL card */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${avgTtflColorCls}`}>
            <Clock className="w-5 h-5" />
          </div>
          <p className={`text-2xl font-bold ${ttflColor(stats.avgTtfl)}`}>{avgTtflDisplay}</p>
          <p className="text-sm text-white/60 mt-0.5">Avg TTFL</p>
          <p className="text-xs text-white/30 mt-0.5">avg time to first lead</p>
        </div>
      </div>

      <KpiTargetsSection mrrUsd={stats.mrrUsd} totalClients={stats.totalClients} />

      {/* Client Pipeline Health */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-1">Client Pipeline Health</h2>
        <p className="text-xs text-white/40 mb-4">Time to first lead, lead volumes, and subscription status per client</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Company', 'Joined', 'TTFL', 'Total Leads', 'This Month', 'Status'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.clients.map(client => (
                <tr key={client.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-3 py-3 font-medium text-white">{client.company_name ?? '—'}</td>
                  <td className="px-3 py-3 text-white/40 text-xs">{relativeDate(client.created_at)}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs font-semibold ${ttflColor(client.ttfl_hours ?? null)}`}>
                      {formatTtfl(client.ttfl_hours ?? null)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-white/70">{(stats.leadCountMap[client.id] ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-3 text-white/70">{(stats.monthLeadMap[client.id] ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-3"><StatusBadge status={client.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.clients.length === 0 && (
            <p className="text-center py-8 text-sm text-white/30">No clients yet.</p>
          )}
        </div>
      </div>

      {/* Product Catalog */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-1">Product Catalog</h2>
        <p className="text-xs text-white/40 mb-4">Credit-based for Lead Gen + FIGSY · Flat monthly for Milla &amp; Vida</p>
        <div className="space-y-3">
          {/* Lead Gen */}
          <div className="border border-[#0066FF]/20 rounded-lg p-4 bg-[#0066FF]/5">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm text-white">K.I.N.D AI — Lead Generation</p>
              <span className="text-xs bg-[#0066FF]/20 text-[#4d94ff] px-2 py-0.5 rounded font-medium">Credit-based</span>
            </div>
            <p className="text-xs text-white/40 mb-2">1 credit = 1 qualified lead found · 14-day trial includes 20 free credits</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/60">
                <span>20 credits</span><span className="font-medium">$20 USD</span>
              </div>
              <div className="flex justify-between text-xs text-white/60">
                <span>100 credits</span><span className="font-medium">$100 USD</span>
              </div>
            </div>
          </div>
          {/* FIGSY */}
          <div className="border border-indigo-400/20 rounded-lg p-4 bg-indigo-400/5">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm text-white">FIGSY — AI Outreach SDR</p>
              <span className="text-xs bg-indigo-400/10 text-indigo-400 px-2 py-0.5 rounded font-medium">Credit-based</span>
            </div>
            <p className="text-xs text-white/40 mb-2">1 outreach credit = 1 lead enrolled in email campaign</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-white/60">
                <span>20 outreach credits</span><span className="font-medium">$60 USD</span>
              </div>
              <div className="flex justify-between text-xs text-white/60">
                <span>100 outreach credits</span><span className="font-medium">$300 USD</span>
              </div>
            </div>
          </div>
          {/* Milla */}
          <div className="border border-white/10 rounded-lg p-4 bg-white/[0.03]">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm text-white">Milla — AI Virtual Assistant</p>
              <span className="text-xs bg-white/5 text-white/40 px-2 py-0.5 rounded font-medium">Flat subscription</span>
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>Monthly</span><span className="font-medium">$49/mo USD</span>
            </div>
          </div>
          {/* Vida */}
          <div className="border border-white/10 rounded-lg p-4 bg-white/[0.03]">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm text-white">Vida — AI Chatbot Agent</p>
              <span className="text-xs bg-white/5 text-white/40 px-2 py-0.5 rounded font-medium">Flat subscription</span>
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>Monthly</span><span className="font-medium">$29/mo USD</span>
            </div>
          </div>
          {/* Bundle */}
          <div className="border border-blue-400/20 rounded-lg p-4 bg-blue-400/5">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm text-white">Milla + Vida Bundle</p>
              <span className="text-xs bg-blue-400/10 text-blue-400 px-2 py-0.5 rounded font-medium">Best value</span>
            </div>
            <div className="flex justify-between text-xs text-white/60">
              <span>Monthly (saves $9)</span><span className="font-medium">$69/mo USD</span>
            </div>
          </div>
        </div>
      </div>

      {/* Total leads */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-1">Total Leads in Platform</h2>
        <p className="text-3xl font-bold text-white">{stats.totalLeads.toLocaleString()}</p>
        <p className="text-sm text-white/40 mt-1">across all clients</p>
      </div>
    </main>
  )
}
