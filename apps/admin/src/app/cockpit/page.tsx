export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { Users, DollarSign, AlertCircle, Target, CheckCircle2,
  Zap, Wallet, Package, HeartPulse, ArrowUpRight, CreditCard, Repeat } from 'lucide-react'
import Link from 'next/link'
import { getZarPerUsd, zarToUsd, fxLabel, type FxRate } from '../../lib/fx'
import { getRevenueExclusions } from '../../lib/revenue-exclusions'
import { PER_CLIENT_MONTHLY_USD, TOTAL_FLOOR_USD, PLATFORM_FLOOR_USD, COMPANY_FLOOR_USD } from '@kind/shared'
// ⚑ 13 Sep (B3/B4) — the two operator surfaces for the states nothing resolves automatically.
import StaleProofClaimsPanel from '@/components/vida/StaleProofClaimsPanel'
import WelcomeEmailsPanel from '@/components/vida/WelcomeEmailsPanel'

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

// #286 dunning — past-due subscriptions surfaced as REAL action-queue rows (a failed
// payment must not silently sit). The founder is also emailed at the payment_failed
// webhook (lib/alerts). This is the "needs you now" side of the same signal.
interface PastDueEntry { client_id: string; company_name: string; product: string | null }
async function getPastDue(): Promise<PastDueEntry[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return []
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data } = await supabase.from('subscriptions').select('client_id, product, clients(company_name)').eq('status', 'past_due')
    return (data ?? []).map((s: { client_id: string; product: string | null; clients?: { company_name?: string | null } | { company_name?: string | null }[] | null }) => {
      const c = Array.isArray(s.clients) ? s.clients[0] : s.clients
      return { client_id: s.client_id, company_name: c?.company_name || '—', product: s.product }
    })
  } catch { return [] }
}

// System health = a REAL probe of the live API (was a hardcoded 'Healthy' string —
// Slice C honesty fix). Green only when /health answers 200.
async function getSystemHealth(): Promise<'Healthy' | 'Degraded' | 'Unreachable'> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
  try {
    const res = await fetch(`${apiBase}/health`, { cache: 'no-store', signal: AbortSignal.timeout(4000) })
    return res.ok ? 'Healthy' : 'Degraded'
  } catch { return 'Unreachable' }
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

  // Revenue-honesty: cockpit MRR / unit economics count real paying clients only —
  // exclude demo + house (founder testing). subscriptions carry client_id; filter in JS.
  const exclusions = await getRevenueExclusions(supabase)
  const [
    { data: allClientIds },
    { data: activeSubsRaw },
    { data: trialSubsRaw },
    { count: pastDue },
    { count: totalLeads },
    { data: clients },
    { data: allLeads },
    { data: monthLeads },
    { count: signupsThisWeek },
  ] = await Promise.all([
    supabase.from('clients').select('id'),
    supabase.from('subscriptions').select('*').eq('status', 'active'),
    supabase.from('subscriptions').select('*').eq('status', 'trialing'),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'past_due'),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('clients').select('id, company_name, created_at, subscriptions(status)').order('created_at', { ascending: false }).limit(50),
    supabase.from('leads').select('client_id, created_at').order('created_at', { ascending: true }),
    supabase.from('leads').select('client_id').gte('created_at', startOfMonth),
    supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
  ])

  const activeSubs = (activeSubsRaw || []).filter((s: { client_id: string }) => !exclusions.excludedClientIds.has(s.client_id))
  const trialSubs = (trialSubsRaw || []).filter((s: { client_id: string }) => !exclusions.excludedClientIds.has(s.client_id))
  const totalClients = (allClientIds || []).filter((c: { id: string }) => !exclusions.excludedClientIds.has(c.id)).length

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
  // MRR: amount_usd is the source of truth (C4, subscriptions.ts); amount_zar is the
  // Paystack/back-compat leg. Summing only amount_zar showed $0 with active USD subs
  // (Slice C honesty fix) — take USD when set, else convert ZAR, and COUNT the subs
  // that carry no amount at all so the tile can say so instead of silently lying.
  const mrrZar = (activeSubs || []).reduce((sum, sub) => sum + (sub.amount_zar || 0), 0)
  const mrrUsd = Math.round((activeSubs || []).reduce((sum, sub) =>
    sum + (sub.amount_usd ? Number(sub.amount_usd) : zarToUsd(sub.amount_zar || 0, fx.zarPerUsd)), 0))
  const subsMissingAmount = (activeSubs || []).filter(sub => !sub.amount_usd && !sub.amount_zar).length

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
    subsMissingAmount,
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

// ── PULSE — 6 tiles: the whole business at a glance ──────────────────────────
function PulseTiles({ stats, atRiskCount, health }: { stats: NonNullable<Awaited<ReturnType<typeof getAdminStats>>>; atRiskCount: number; health: 'Healthy' | 'Degraded' | 'Unreachable' }) {
  const healthCls = health === 'Healthy' ? 'bg-emerald-50 text-emerald-600' : health === 'Degraded' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
  const tiles = [
    { label: 'MRR (USD)', value: `$${stats.mrrUsd.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, cls: 'bg-green-50 text-green-600',
      // #282 single-home: MRR's detailed home is Finance — the Cockpit only glances + links.
      note: <span className="text-gray-400">{stats.activeSubscriptions} active{stats.subsMissingAmount > 0 && <span className="text-amber-600"> · {stats.subsMissingAmount} missing amount</span>} · <Link href="/revenue" className="text-[#7C3AED] hover:underline">Finance →</Link></span> },
    { label: 'Cash & runway', value: 'Connect Wise', icon: <Wallet className="w-5 h-5" />, cls: 'bg-gray-50 text-gray-400',
      note: <span className="text-amber-600">needs Jacques — link Wise</span> },
    { label: 'Clients', value: stats.totalClients, icon: <Users className="w-5 h-5" />, cls: 'bg-purple-50 text-[#7C3AED]',
      // #282 single-home: at-risk / churn's detailed home is Clients — glance + link only.
      note: <span className="text-gray-400">{stats.trialClients} trial · {atRiskCount > 0 ? <Link href="/clients" className="text-red-600 hover:underline">{atRiskCount} at-risk →</Link> : 'none at-risk'}</span> },
    { label: 'This week', value: stats.signupsThisWeek, icon: <ArrowUpRight className="w-5 h-5" />, cls: 'bg-purple-50 text-[#7C3AED]',
      note: <span className="text-gray-400">new signups (7d)</span> },
    { label: 'System health', value: health, icon: <HeartPulse className="w-5 h-5" />, cls: healthCls,
      note: <Link href="/health" className="text-[#7C3AED] hover:underline">live `/health` probe · open engine →</Link> },
    { label: 'Pool stock', value: 'Connect', icon: <Package className="w-5 h-5" />, cls: 'bg-gray-50 text-gray-400',
      note: <span className="text-amber-600">needs Jacques — Smartlead</span> },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {tiles.map(t => (
        <div key={t.label} className="bg-white/80 backdrop-blur-sm rounded-xl border border-brand-200/60 p-5">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${t.cls}`}>{t.icon}</div>
          <p className="text-2xl font-bold text-gray-900">{t.value}</p>
          <p className="text-sm text-[#7B6FA0] mt-0.5">{t.label}</p>
          <p className="text-xs mt-0.5">{t.note}</p>
        </div>
      ))}
    </div>
  )
}

// ── NEEDS YOU NOW — the Action Queue ─────────────────────────────────────────
function ActionQueue({ atRisk, pastDue }: { atRisk: ChurnRiskEntry[]; pastDue: PastDueEntry[] }) {
  const soon = [
    { icon: <Users className="w-4 h-4" />, cls: 'bg-blue-50 text-blue-600', title: 'New trial → assign a pooled inbox', sub: 'Trigger ① (#270) — wired when signup trigger + Smartlead land' },
    { icon: <CreditCard className="w-4 h-4" />, cls: 'bg-green-50 text-green-600', title: 'Payment → provision branded inbox', sub: 'Trigger ② (#271) — buy branded + start warm clock' },
    { icon: <Repeat className="w-4 h-4" />, cls: 'bg-amber-50 text-amber-600', title: 'Day-29 switch → move to branded domain', sub: 'scheduled when a client converts' },
    { icon: <Package className="w-4 h-4" />, cls: 'bg-amber-50 text-amber-600', title: 'Pool low → reorder pre-warmed inboxes', sub: 'live once Smartlead pool is connected' },
  ]
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-purple-100">
        <Zap className="w-5 h-5 text-[#7C3AED]" />
        <h2 className="font-semibold text-gray-900">Needs you now</h2>
        {pastDue.length > 0 && <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">{pastDue.length} past-due</span>}
        {atRisk.length > 0 && <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5">{atRisk.length} at-risk</span>}
      </div>
      <div className="divide-y divide-purple-50">
        {/* REAL: past-due payments (#286 dunning) — most urgent, top of queue */}
        {pastDue.map(c => (
          <div key={`pd-${c.client_id}`} className="flex items-center gap-3 px-6 py-3 bg-amber-50/50">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0"><CreditCard className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Payment failed — {c.company_name}</p>
              <p className="text-xs text-gray-500 truncate">past-due{c.product ? ` · ${c.product}` : ''} · send a card-update nudge or offer a pause</p>
            </div>
            <Link href={`/clients/${c.client_id}`} className="text-xs font-semibold text-[#7C3AED] hover:underline whitespace-nowrap">Open client →</Link>
          </div>
        ))}
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
  // #614 — was `= 95`, a number typed into this page. The maintained model is
  // docs/CASHFLOW-LAB.html and a drift test now binds the two.
  const estCostPerClient = PER_CLIENT_MONTHLY_USD
  const estMarginPerClient = perClientRev - estCostPerClient
  const marginPct = perClientRev > 0 ? Math.round((estMarginPerClient / perClientRev) * 100) : 0
  // #614 — was `= 690`. The real floor is the platform lines plus the UK-company lines
  // (ICO, Companies House, accountant, accounting software, insurance), which had never been
  // modelled anywhere in this repo until 4 Aug.
  const estStack = TOTAL_FLOOR_USD
  const net = mrrUsd - estStack
  return (
    <div>
      <div className="flex items-center gap-2 pt-2 mb-3">
        <Target className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Unit economics</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">costs from docs/CASHFLOW-LAB · company lines unverified</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 p-6">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Margin per paying client (avg)</h3>
          <div className="flex justify-between text-sm py-1 border-b border-dashed border-purple-50"><span className="text-gray-500">Revenue / client / mo</span><span className="font-semibold text-gray-900">${perClientRev.toLocaleString()}</span></div>
          <div className="flex justify-between text-sm py-1 border-b border-dashed border-purple-50"><span className="text-gray-500">Est. cost (inbox+data+AI+infra)</span><span className="text-gray-400">– ${estCostPerClient}</span></div>
          <div className="flex justify-between text-sm py-1"><span className="text-gray-900 font-semibold">Margin / client / mo</span><span className={`font-bold ${estMarginPerClient >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${estMarginPerClient.toLocaleString()} ({marginPct}%)</span></div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 p-6">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Aggregate</h3>
          <div className="flex justify-between text-sm py-1 border-b border-dashed border-purple-50"><span className="text-gray-500">MRR</span><span className="font-semibold text-gray-900">${mrrUsd.toLocaleString()}</span></div>
          <div className="flex justify-between text-sm py-1 border-b border-dashed border-purple-50"><span className="text-gray-500">Monthly cost stack</span><span className="text-gray-400">– ${estStack}</span></div>
          {/* #614 — the split, because "platform" and "the company itself" are different
              decisions: one scales with product, the other is the price of existing as a
              UK Ltd and had never been modelled anywhere until 4 Aug. */}
          <div className="flex justify-between text-[11px] py-0.5"><span className="text-gray-400">· platform</span><span className="text-gray-400">${PLATFORM_FLOOR_USD}</span></div>
          <div className="flex justify-between text-[11px] py-0.5 border-b border-dashed border-purple-50"><span className="text-gray-400">· company (ICO · Companies House · accountant · software · insurance)</span><span className="text-gray-400">${COMPANY_FLOOR_USD}</span></div>
          <div className="flex justify-between text-sm py-1"><span className="text-gray-900 font-semibold">Net</span><span className={`font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{net >= 0 ? '+' : ''}${net.toLocaleString()} {net >= 0 ? '· profitable' : '· burning'}</span></div>
        </div>
      </div>
    </div>
  )
}

export default async function AdminPage() {
  const [stats, atRisk, health, pastDue] = await Promise.all([getAdminStats(), getChurnRisk(), getSystemHealth(), getPastDue()])

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
      <PulseTiles stats={stats} atRiskCount={atRisk.length} health={health} />

      {/* NEEDS YOU NOW — the Action Queue */}
      <ActionQueue atRisk={atRisk} pastDue={pastDue} />

      {/* ── 🛑 13 Sep (B3/B4) — THE TWO FAIL-CLOSED STATES THAT ONLY A PERSON RESOLVES ────
          Both of these are states the system deliberately REFUSES to resolve on its own, and
          both were invisible: a welcome email past Resend's 24-hour window is never resent
          automatically, and a Proof claim is never released on a timer. The design is correct
          and the cost of it is that somebody has to look — so this is where they look.
          Client components inside this server page; each issues one GET and settles nothing. */}
      <StaleProofClaimsPanel />
      <WelcomeEmailsPanel />

      {/* UNIT ECONOMICS */}
      <UnitEconomics mrrUsd={stats.mrrUsd} activeSubs={stats.activeSubscriptions} />

      <p className="text-xs text-gray-400 pt-1">
        Full client list → <a href="/clients" className="text-[#7C3AED] hover:underline">Clients</a> · targets → <a href="/command" className="text-[#7C3AED] hover:underline">Sales Channel</a> · money → <a href="/revenue" className="text-[#7C3AED] hover:underline">Finance</a>.
      </p>
    </div>
  )
}
