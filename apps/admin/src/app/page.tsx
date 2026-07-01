export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { PRICING, PRODUCTS } from '@kind/shared'
import { Users, DollarSign, TrendingUp, AlertCircle, Clock, Target, CheckCircle2, XCircle, MinusCircle,
  Zap, Wallet, Package, HeartPulse, ArrowUpRight, CreditCard, Repeat } from 'lucide-react'
import Link from 'next/link'
import { getZarPerUsd, zarToUsd, fxLabel, type FxRate } from '../lib/fx'

// ── Action Queue: at-risk clients are REAL (from /admin/churn-risk); the trigger
// rows (signup→assign · payment→provision · day-29 switch · pool-low) are wired
// when #270/#271 + Smartlead land — shown as "coming soon" until then.
interface ChurnRiskEntry { client_id: string; company_name: string; churn_score?: number; reasons?: string[] }
async function getChurnRisk(): Promise<ChurnRiskEntry[]> {
  const adminKey = process.env.ADMIN_SECRET_KEY
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
  if (!adminKey) return []
  try {
    const res = await fetch(`${apiBase}/admin/churn-risk`, { headers: { 'x-admin-key': adminKey }, cache: 'no-store' })
    if (!res.ok) return []
    const json = await res.json() as { success: boolean; data?: { at_risk: ChurnRiskEntry[] } }
    return json.data?.at_risk ?? []
  } catch { return [] }
}

interface ClientRow {
  id: string
  company_name: string | null
  created_at: string
  ttfl_hours?: number | null
  status?: string | null
  // `clients` has no status column — the badge status is derived from the
  // client's subscription(s), embedded via the FK.
  subscriptions?: { status: string | null }[] | null
}

// Roll a client's subscription rows up into a single status for the pipeline badge.
function deriveClientStatus(subs: { status: string | null }[] | null | undefined): string {
  if (!subs || subs.length === 0) return 'none'
  const statuses = subs.map(s => s.status)
  if (statuses.includes('active'))   return 'active'
  if (statuses.includes('trialing')) return 'trial'
  if (statuses.includes('past_due')) return 'past_due'
  return 'cancelled'
}

interface LeadCountRow {
  client_id: string
  total: number
  this_month: number
}

async function getAdminStats() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[admin] Missing Supabase env vars — check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Railway')
    return null
  }
  try {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const [
    { count: totalClients },
    { data: activeSubs },
    { data: trialSubs },
    { count: pastDue },
    { count: totalLeads },
    { data: clients },
    { data: allLeads },
    { data: monthLeads },
    { count: signupsThisWeek },
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*').eq('status', 'active'),
    supabase.from('subscriptions').select('*').eq('status', 'trialing'),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'past_due'),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('clients').select('id, company_name, created_at, subscriptions(status)').order('created_at', { ascending: false }).limit(50),
    supabase.from('leads').select('client_id, created_at').order('created_at', { ascending: true }),
    supabase.from('leads').select('client_id').gte('created_at', startOfMonth),
    supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
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

  const fx = await getZarPerUsd()
  const mrrZar = (activeSubs || []).reduce((sum, sub) => sum + (sub.amount_zar || 0), 0)
  const mrrUsd = zarToUsd(mrrZar, fx.zarPerUsd)

  const firstLeadByClient: Record<string, string> = {}
  for (const row of allLeads ?? []) {
    if (!firstLeadByClient[row.client_id]) firstLeadByClient[row.client_id] = row.created_at
  }

  const clientsWithTtfl = (clients ?? []).map((c: ClientRow) => {
    const firstLead = firstLeadByClient[c.id]
    const ttfl_hours = firstLead
      ? (new Date(firstLead).getTime() - new Date(c.created_at).getTime()) / 3600000
      : null
    return { ...c, ttfl_hours, status: deriveClientStatus(c.subscriptions) }
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
    signupsThisWeek: signupsThisWeek || 0,
    mrrZar,
    mrrUsd,
    fx,
    avgTtfl,
    clients: clientsWithTtfl as ClientRow[],
    leadCountMap,
    monthLeadMap,
  }
  } catch (err) {
    console.error('[admin] getAdminStats failed:', err)
    return null
  }
}

function ttflColor(hours: number | null): string {
  if (hours === null) return 'text-gray-400'
  if (hours < 2) return 'text-emerald-600'
  if (hours <= 6) return 'text-amber-600'
  return 'text-red-600'
}

function ttflBgColor(hours: number | null): string {
  if (hours === null) return 'bg-gray-50 text-gray-400'
  if (hours < 2) return 'bg-emerald-50 text-emerald-600'
  if (hours <= 6) return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-600'
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
    trial:     'bg-blue-50 text-blue-600 border border-blue-100',
    active:    'bg-emerald-50 text-emerald-700 border border-emerald-100',
    past_due:  'bg-amber-50 text-amber-700 border border-amber-100',
    cancelled: 'bg-gray-50 text-gray-400 border border-gray-100',
    none:      'bg-gray-50 text-gray-400 border border-gray-100',
  }
  const labels: Record<string, string> = { past_due: 'past due', none: 'no sub' }
  const cls = map[status ?? ''] ?? 'bg-gray-50 text-gray-400 border border-gray-100'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {labels[status ?? ''] ?? status ?? '—'}
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
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-[#7C3AED]" />
          <h2 className="font-semibold text-gray-900">KPI Progress — {current.month}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-500">MRR</span>
              <span className="font-semibold text-gray-900">${mrrUsd.toLocaleString()} / ${current.mrrTarget.toLocaleString()}</span>
            </div>
            <div className="w-full bg-purple-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${ragStatus(mrrPct) === 'green' ? 'bg-green-500' : ragStatus(mrrPct) === 'amber' ? 'bg-amber-500' : 'bg-[#7C3AED]'}`}
                   style={{ width: `${mrrPct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{mrrPct.toFixed(1)}% of target</p>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-500">Clients</span>
              <span className="font-semibold text-gray-900">{totalClients} / {current.clientTarget}</span>
            </div>
            <div className="w-full bg-purple-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${ragStatus(clientPct) === 'green' ? 'bg-green-500' : ragStatus(clientPct) === 'amber' ? 'bg-amber-500' : 'bg-[#7C3AED]'}`}
                   style={{ width: `${clientPct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{clientPct.toFixed(1)}% of target</p>
          </div>
        </div>
      </div>

      {/* Monthly targets roadmap */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Monthly Revenue Targets</h2>
        <p className="text-xs text-gray-400 mb-4">May 2026 → Dec 2026 — 8-month ramp to $48K MRR</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-100">
                {['Month', 'MRR Target', 'Client Target', 'Current vs Target', ''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {MONTHLY_TARGETS.map(t => {
                const isCurrentMonth = t.month === current.month
                const pct = Math.min((mrrUsd / t.mrrTarget) * 100, 100)
                const isFuture = new Date(t.month).getTime() > Date.now() + 86400000 * 30
                return (
                  <tr key={t.month} className={isCurrentMonth ? 'bg-purple-50/60' : 'hover:bg-purple-50/30 transition-colors'}>
                    <td className="px-3 py-3">
                      <span className="font-medium text-gray-900">{t.month}</span>
                      {isCurrentMonth && <span className="ml-2 text-xs bg-[#7C3AED] text-white px-1.5 py-0.5 rounded font-medium">Now</span>}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-700">${t.mrrTarget.toLocaleString()}</td>
                    <td className="px-3 py-3 text-gray-500">{t.clientTarget} clients</td>
                    <td className="px-3 py-3">
                      {isFuture ? (
                        <span className="text-xs text-gray-300">upcoming</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-purple-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${ragStatus(pct) === 'green' ? 'bg-green-500' : ragStatus(pct) === 'amber' ? 'bg-amber-500' : 'bg-[#7C3AED]'}`}
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
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Core KPI Targets</h2>
        <p className="text-xs text-gray-400 mb-4">Track these weekly — they're the leading indicators of growth</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {KEY_KPIS.map(k => (
            <div key={k.label} className="bg-purple-50/60 border border-purple-100 rounded-xl px-4 py-3">
              <p className="text-xs text-[#7C3AED]/60 font-semibold uppercase tracking-wide">{k.unit}</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{k.target}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── PULSE — 6 tiles: the whole business at a glance ──────────────────────────
function PulseTiles({ stats, atRiskCount }: { stats: NonNullable<Awaited<ReturnType<typeof getAdminStats>>>; atRiskCount: number }) {
  const tiles = [
    { label: 'MRR (USD)', value: `$${stats.mrrUsd.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, cls: 'bg-green-50 text-green-600',
      note: <span className="text-gray-400">{stats.activeSubscriptions} active · R{stats.mrrZar.toLocaleString()}</span> },
    { label: 'Cash & runway', value: 'Connect Wise', icon: <Wallet className="w-5 h-5" />, cls: 'bg-gray-50 text-gray-400',
      note: <span className="text-amber-600">needs Jacques — link Wise</span> },
    { label: 'Clients', value: stats.totalClients, icon: <Users className="w-5 h-5" />, cls: 'bg-purple-50 text-[#7C3AED]',
      note: <span className="text-gray-400">{stats.trialClients} trial · {atRiskCount > 0 ? <span className="text-red-600">{atRiskCount} at-risk</span> : 'none at-risk'}</span> },
    { label: 'This week', value: stats.signupsThisWeek, icon: <ArrowUpRight className="w-5 h-5" />, cls: 'bg-purple-50 text-[#7C3AED]',
      note: <span className="text-gray-400">new signups (7d)</span> },
    { label: 'System health', value: 'Healthy', icon: <HeartPulse className="w-5 h-5" />, cls: 'bg-emerald-50 text-emerald-600',
      note: <Link href="/health" className="text-[#7C3AED] hover:underline">open engine →</Link> },
    { label: 'Pool stock', value: 'Connect', icon: <Package className="w-5 h-5" />, cls: 'bg-gray-50 text-gray-400',
      note: <span className="text-amber-600">needs Jacques — Smartlead</span> },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {tiles.map(t => (
        <div key={t.label} className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${t.cls}`}>{t.icon}</div>
          <p className="text-2xl font-bold text-gray-900">{t.value}</p>
          <p className="text-sm text-gray-500 mt-0.5">{t.label}</p>
          <p className="text-xs mt-0.5">{t.note}</p>
        </div>
      ))}
    </div>
  )
}

// ── NEEDS YOU NOW — the Action Queue ─────────────────────────────────────────
function ActionQueue({ atRisk }: { atRisk: ChurnRiskEntry[] }) {
  const soon = [
    { icon: <Users className="w-4 h-4" />, cls: 'bg-blue-50 text-blue-600', title: 'New trial → assign a pooled inbox', sub: 'Trigger ① (#270) — wired when signup trigger + Smartlead land' },
    { icon: <CreditCard className="w-4 h-4" />, cls: 'bg-green-50 text-green-600', title: 'Payment → provision branded inbox', sub: 'Trigger ② (#271) — buy branded + start warm clock' },
    { icon: <Repeat className="w-4 h-4" />, cls: 'bg-amber-50 text-amber-600', title: 'Day-29 switch → move to branded domain', sub: 'scheduled when a client converts' },
    { icon: <Package className="w-4 h-4" />, cls: 'bg-amber-50 text-amber-600', title: 'Pool low → reorder pre-warmed inboxes', sub: 'live once Smartlead pool is connected' },
  ]
  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-purple-100">
        <Zap className="w-5 h-5 text-[#7C3AED]" />
        <h2 className="font-semibold text-gray-900">Needs you now</h2>
        {atRisk.length > 0 && <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5">{atRisk.length} at-risk</span>}
      </div>
      <div className="divide-y divide-purple-50">
        {/* REAL: at-risk clients from churn engine */}
        {atRisk.slice(0, 6).map(c => (
          <div key={c.client_id} className="flex items-center gap-3 px-6 py-3 bg-red-50/40">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0"><AlertCircle className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">At-risk — {c.company_name}</p>
              <p className="text-xs text-gray-500 truncate">{c.reasons?.join(' · ') || 'churn signals detected'}{c.churn_score != null ? ` · score ${c.churn_score}` : ''}</p>
            </div>
            <Link href={`/clients/${c.client_id}`} className="text-xs font-semibold text-[#7C3AED] hover:underline whitespace-nowrap">Open client →</Link>
          </div>
        ))}
        {atRisk.length === 0 && (
          <div className="flex items-center gap-3 px-6 py-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-4 h-4" /></div>
            <p className="text-sm text-gray-500">No clients at risk right now.</p>
          </div>
        )}
        {/* COMING SOON: trigger-driven rows */}
        {soon.map(s => (
          <div key={s.title} className="flex items-center gap-3 px-6 py-3 opacity-70">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.cls}`}>{s.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{s.title}</p>
              <p className="text-xs text-gray-400 truncate">{s.sub}</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide bg-purple-50 text-[#7C3AED] rounded-full px-2 py-0.5 whitespace-nowrap">soon</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── UNIT ECONOMICS — is a client profitable? ─────────────────────────────────
function UnitEconomics({ mrrUsd, activeSubs }: { mrrUsd: number; activeSubs: number }) {
  // Revenue is REAL. Cost stack is an ESTIMATE until Xero connects — labelled as such.
  const perClientRev = activeSubs > 0 ? Math.round(mrrUsd / activeSubs) : 0
  const estCostPerClient = 95 // branded inbox + data + AI + infra share (estimate)
  const estMarginPerClient = perClientRev - estCostPerClient
  const marginPct = perClientRev > 0 ? Math.round((estMarginPerClient / perClientRev) * 100) : 0
  const estStack = 690 // monthly cost stack estimate
  const net = mrrUsd - estStack
  return (
    <div>
      <div className="flex items-center gap-2 pt-2 mb-3">
        <Target className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Unit economics</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">cost = estimate until Xero connects</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Margin per paying client (avg)</h3>
          <div className="flex justify-between text-sm py-1 border-b border-dashed border-purple-50"><span className="text-gray-500">Revenue / client / mo</span><span className="font-semibold text-gray-900">${perClientRev.toLocaleString()}</span></div>
          <div className="flex justify-between text-sm py-1 border-b border-dashed border-purple-50"><span className="text-gray-500">Est. cost (inbox+data+AI+infra)</span><span className="text-gray-400">– ${estCostPerClient}</span></div>
          <div className="flex justify-between text-sm py-1"><span className="text-gray-900 font-semibold">Margin / client / mo</span><span className={`font-bold ${estMarginPerClient >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${estMarginPerClient.toLocaleString()} ({marginPct}%)</span></div>
        </div>
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Aggregate</h3>
          <div className="flex justify-between text-sm py-1 border-b border-dashed border-purple-50"><span className="text-gray-500">MRR</span><span className="font-semibold text-gray-900">${mrrUsd.toLocaleString()}</span></div>
          <div className="flex justify-between text-sm py-1 border-b border-dashed border-purple-50"><span className="text-gray-500">Est. monthly cost stack</span><span className="text-gray-400">– ${estStack}</span></div>
          <div className="flex justify-between text-sm py-1"><span className="text-gray-900 font-semibold">Net</span><span className={`font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{net >= 0 ? '+' : ''}${net.toLocaleString()} {net >= 0 ? '· profitable' : '· burning'}</span></div>
        </div>
      </div>
    </div>
  )
}

export default async function AdminPage() {
  const [stats, atRisk] = await Promise.all([getAdminStats(), getChurnRisk()])

  if (!stats) {
    return (
      <div className="px-8 py-16 max-w-2xl mx-auto text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-amber-800 mb-2">Configuration Required</h1>
          <p className="text-amber-700 text-sm">
            Admin dashboard requires <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> and{' '}
            <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> to be set in Railway environment variables.
          </p>
          <p className="text-amber-600 text-xs mt-3">Add these in Railway → kind/admin → Variables, then redeploy.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🩺 Cockpit</h1>
          <p className="text-sm text-gray-500 mt-0.5">The whole business at a glance, then exactly what needs you.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-purple-100 rounded-xl px-3 py-1.5 shadow-sm" title="Stat cards + client table are live from the database. Targets below are reference figures.">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-gray-500">Live stats · {fxLabel(stats.fx)}</span>
        </div>
      </div>

      {/* PULSE — 6 tiles */}
      <PulseTiles stats={stats} atRiskCount={atRisk.length} />

      {/* NEEDS YOU NOW — the Action Queue */}
      <ActionQueue atRisk={atRisk} />

      {/* UNIT ECONOMICS */}
      <UnitEconomics mrrUsd={stats.mrrUsd} activeSubs={stats.activeSubscriptions} />

      {/* Avg TTFL now shown in the pipeline table below; kept out of Pulse */}

      <div className="flex items-center gap-2 pt-2">
        <Target className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Goals &amp; Targets</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Reference — fixed planning figures</span>
      </div>
      <KpiTargetsSection mrrUsd={stats.mrrUsd} totalClients={stats.totalClients} />

      {/* Client Pipeline Health */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Client Pipeline Health</h2>
        <p className="text-xs text-gray-400 mb-4">Time to first lead, lead volumes, and subscription status per client</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-100">
                {['Company', 'Joined', 'TTFL', 'Total Leads', 'This Month', 'Status'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {stats.clients.map(client => (
                <tr key={client.id} className="hover:bg-purple-50/30 transition-colors">
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
                  <td className="px-3 py-3"><StatusBadge status={client.status ?? null} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.clients.length === 0 && (
            <p className="text-center py-8 text-sm text-gray-400">No clients yet.</p>
          )}
        </div>
      </div>

      {/* Product Catalog + Total Leads side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Product Catalog</h2>
          <p className="text-xs text-gray-400 mb-4">Usage-based for Lead Gen · flat subscription for VA &amp; Chatbot</p>
          <div className="space-y-3">
            {Object.entries(PRICING).map(([key, p]) => (
              <div key={key} className="border border-purple-100 rounded-xl p-4 bg-purple-50/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm text-gray-900">{p.name}</p>
                  <span className="text-xs bg-[#7C3AED]/10 text-[#7C3AED] px-2 py-0.5 rounded-full font-semibold">Credit-based</span>
                </div>
                <p className="text-xs text-gray-400 mb-2">${p.credit_rate_usd}/credit · {p.bundles.length} bundle options</p>
                <div className="space-y-1">
                  {p.bundles.map(b => (
                    <div key={b.credits} className="flex justify-between text-xs text-gray-600">
                      <span>{b.credits} credits</span>
                      <span className="font-medium">${b.price_usd} USD</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.entries(PRODUCTS).map(([key, product]) => (
              <div key={key} className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm text-gray-900">{product.name}</p>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Flat</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Monthly</span>
                  <span className="font-medium">${product.price_usd}/mo</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6 flex flex-col justify-center items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
            <TrendingUp className="w-7 h-7 text-[#7C3AED]" />
          </div>
          <p className="text-4xl font-black text-gray-900">{stats.totalLeads.toLocaleString()}</p>
          <p className="text-sm font-semibold text-gray-600 mt-1">Total Leads</p>
          <p className="text-xs text-gray-400 mt-0.5">across all clients</p>
        </div>
      </div>
    </div>
  )
}
