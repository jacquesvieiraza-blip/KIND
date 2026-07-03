export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { DollarSign, Target, TrendingUp, CheckCircle2, MinusCircle, XCircle, Wallet, Landmark, ExternalLink, CreditCard, AlertTriangle } from 'lucide-react'

// Revenue-at-risk: at-risk clients from the churn engine (same source as the cockpit).
interface ChurnRiskEntry { client_id: string; company_name: string; reasons?: string[] }
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

// #289 — NPS aggregate (admin/founder side). NPS = %promoters(9–10) − %detractors(0–6).
// The client-facing collection widget is a SEPARATE preview-gated follow-up — this
// only READS/computes what /admin/nps returns. Degrades to null on any failure.
interface NpsData { nps: number | null; count: number; avg: number | null; promoters: number; passives: number; detractors: number }
async function getNps(): Promise<NpsData | null> {
  const adminKey = process.env.ADMIN_SECRET_KEY
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
  if (!adminKey) return null
  try {
    const res = await fetch(`${apiBase}/admin/nps`, { headers: { 'x-admin-key': adminKey }, cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json() as { success: boolean; data?: NpsData }
    return json.data ?? null
  } catch { return null }
}
import { getZarPerUsd, zarToUsd, fxLabel } from '../../lib/fx'

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

const SCENARIOS = [
  {
    name: 'Conservative',
    color: 'text-amber-600',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
    mrrMultiplier: 0.6,
    description: '60% of base target — slower trial conversion, higher churn',
    mayTarget: 300,
    junTarget: 1200,
    decTarget: 28800,
  },
  {
    name: 'Base',
    color: 'text-blue-600',
    border: 'border-blue-200',
    bg: 'bg-blue-50',
    dot: 'bg-blue-500',
    mrrMultiplier: 1.0,
    description: 'On-plan targets — steady conversion and low churn',
    mayTarget: 500,
    junTarget: 2000,
    decTarget: 48000,
  },
  {
    name: 'Optimistic',
    color: 'text-emerald-600',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    dot: 'bg-emerald-500',
    mrrMultiplier: 1.4,
    description: '140% of base — strong word-of-mouth, referral loop kicks in',
    mayTarget: 700,
    junTarget: 2800,
    decTarget: 67200,
  },
]


function ragStatus(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'amber'
  return 'red'
}

function RagIcon({ pct }: { pct: number }) {
  const status = ragStatus(pct)
  if (status === 'green') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
  if (status === 'amber') return <MinusCircle className="w-4 h-4 text-amber-600" />
  return <XCircle className="w-4 h-4 text-red-600" />
}

function getCurrentTarget() {
  const nowMs = Date.now()
  for (const t of MONTHLY_TARGETS) {
    const d = new Date(t.month)
    if (d.getTime() >= nowMs - 86400000 * 30) return t
  }
  return MONTHLY_TARGETS[MONTHLY_TARGETS.length - 1]
}

async function getRevStats() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const [
    { data: activeSubs },
    { data: trialSubs },
    { count: totalClients },
  ] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('status', 'active'),
    supabase.from('subscriptions').select('*').eq('status', 'trialing'),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
  ])

  const mrrZar = (activeSubs || []).reduce((sum, sub) => sum + (sub.amount_zar || 0), 0)
  const fx = await getZarPerUsd()
  // MRR: amount_usd is the source of truth (matches the Cockpit fix, C4). Fall back
  // to converting amount_zar ONLY when a sub has no USD amount — summing amount_zar
  // alone read $0 for USD-only subs, and Finance is the MRR single-home (#282).
  const mrrUsd = Math.round((activeSubs || []).reduce((sum, sub) =>
    sum + (sub.amount_usd ? Number(sub.amount_usd) : zarToUsd(sub.amount_zar || 0, fx.zarPerUsd)), 0))
  const activeCount = activeSubs?.length ?? 0
  const trialCount = trialSubs?.length ?? 0
  const blendedArpu = activeCount > 0 ? Math.round(mrrUsd / activeCount) : 0

  return { mrrUsd, mrrZar, activeCount, trialCount, totalClients: totalClients ?? 0, blendedArpu, fx }
}

export default async function RevenuePage() {
  const [stats, atRisk, nps] = await Promise.all([getRevStats(), getChurnRisk(), getNps()])
  if (!stats) return <div className="p-8 text-amber-600">Missing env vars — add SUPABASE_SERVICE_ROLE_KEY in Railway admin service.</div>
  const current = getCurrentTarget()
  const mrrPct = Math.min((stats.mrrUsd / current.mrrTarget) * 100, 100)
  const clientPct = Math.min((stats.totalClients / current.clientTarget) * 100, 100)

  // Determine which scenario the founder is tracking toward
  let scenarioLabel = 'Conservative'
  if (stats.mrrUsd >= current.mrrTarget) scenarioLabel = 'Optimistic'
  else if (stats.mrrUsd >= current.mrrTarget * 0.7) scenarioLabel = 'Base'

  return (
    <main className="px-8 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DollarSign className="w-6 h-6 text-gray-400" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">💷 Finance</h1>
          <p className="text-sm text-gray-400 mt-0.5">The money truth — Xero &amp; Wise, MRR tracking, scenarios, ARPU</p>
        </div>
        <span className="text-xs bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Live MRR · projections below
        </span>
      </div>

      {/* Finance — the money truth (Xero / Wise hyperlinked; cost stack an estimate until Xero) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Finance — the money truth</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">connect Xero + Wise to go live</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Xero card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Landmark className="w-5 h-5" /></div>
              <a href="https://go.xero.com" target="_blank" rel="noopener noreferrer" className="text-xs text-[#7C3AED] font-semibold inline-flex items-center gap-1 hover:underline">Open Xero <ExternalLink className="w-3 h-3" /></a>
            </div>
            <p className="text-lg font-bold text-gray-900">P&amp;L · VAT</p>
            <p className="text-sm text-gray-500 mt-0.5">Books &amp; tax at a glance</p>
            <p className="text-xs text-amber-600 mt-1">needs Jacques — connect Xero (item 196)</p>
          </div>
          {/* Wise card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
              <a href="https://wise.com/user/account" target="_blank" rel="noopener noreferrer" className="text-xs text-[#7C3AED] font-semibold inline-flex items-center gap-1 hover:underline">Open Wise <ExternalLink className="w-3 h-3" /></a>
            </div>
            <p className="text-lg font-bold text-gray-900">Cash &amp; runway</p>
            <p className="text-sm text-gray-500 mt-0.5">The #1 &quot;lights on&quot; number</p>
            <p className="text-xs text-amber-600 mt-1">needs Jacques — connect Wise</p>
          </div>
          {/* Stripe */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#7C3AED] flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-xs text-[#7C3AED] font-semibold inline-flex items-center gap-1 hover:underline">Open Stripe <ExternalLink className="w-3 h-3" /></a>
            </div>
            <p className="text-lg font-bold text-gray-900">Payments</p>
            <p className="text-sm text-gray-500 mt-0.5">${stats.mrrUsd.toLocaleString()} payouts this month</p>
            <p className="text-xs text-gray-400 mt-1">checkout live · payouts via Wise</p>
          </div>
        </div>
      </div>

      {/* Risk — revenue at risk (from the churn engine) */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Risk — revenue at risk</span>
        </div>
        {atRisk.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 p-5 text-sm text-gray-500">No clients at risk right now — MRR is protected.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-red-200 p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Accounts at risk</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{atRisk.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">save these → protect MRR</p>
            </div>
            <div className="md:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 p-5">
              {atRisk.slice(0, 4).map(c => (
                <div key={c.client_id} className="flex items-center justify-between text-sm py-1.5 border-b border-dashed border-purple-50 last:border-0">
                  <span className="text-gray-700">{c.company_name} <span className="text-gray-400">— {c.reasons?.join(' · ') || 'churn signals'}</span></span>
                  <a href={`/clients/${c.client_id}`} className="text-xs font-semibold text-[#7C3AED] hover:underline whitespace-nowrap">Open →</a>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">Pulled live from the churn engine.</p>
            </div>
          </div>
        )}
      </div>

      {/* Live MRR + context */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'MRR (USD)',          value: `$${stats.mrrUsd.toLocaleString()}`,   sub: 'live from Supabase', color: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'MRR (ZAR)',          value: `R${stats.mrrZar.toLocaleString()}`,   sub: fxLabel(stats.fx),    color: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Active Paying',      value: stats.activeCount,                      sub: 'subscriptions',      color: 'bg-blue-500/10 text-blue-600' },
          { label: 'Blended ARPU',       value: stats.blendedArpu ? `$${stats.blendedArpu}` : '—', sub: 'per active client', color: 'bg-purple-400/10 text-purple-400' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* FX disclosure — USD figures are converted at this rate */}
      <p className="text-xs text-gray-400 -mt-2">FX: {fxLabel(stats.fx)} · as of {stats.fx.asOf}</p>

      {/* #289 — NPS (admin side). Client-facing survey widget is a separate preview-gated follow-up. */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-5 h-5 text-purple-500" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">NPS — Net Promoter Score</h2>
          <span className="rounded-full text-[10px] uppercase tracking-wider bg-gray-100 text-gray-400 px-2 py-0.5 font-semibold">Target &gt; 50</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">% promoters (9–10) − % detractors (0–6). Collection widget is a separate preview-gated follow-up.</p>
        {!nps || nps.count === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-5 text-center">
            <p className="text-gray-400 text-sm">No responses yet — score appears once NPS surveys are collected.</p>
            <p className="text-gray-400 text-xs mt-2">Run migration <code>20260703_nps_responses.sql</code>, then responses POST to <code>/admin/nps</code>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-purple-100 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">NPS</p>
              <p className={`text-3xl font-bold mt-1 ${nps.nps! >= 50 ? 'text-emerald-600' : nps.nps! >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{nps.nps! > 0 ? '+' : ''}{nps.nps}</p>
            </div>
            <div className="bg-white border border-purple-100 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Responses</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{nps.count}</p>
            </div>
            <div className="bg-white border border-purple-100 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Avg score</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{nps.avg}<span className="text-sm text-gray-400">/10</span></p>
            </div>
            <div className="bg-white border border-purple-100 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Breakdown</p>
              <p className="text-sm font-medium mt-2"><span className="text-emerald-600">{nps.promoters} prom</span> · <span className="text-gray-400">{nps.passives} pass</span> · <span className="text-red-600">{nps.detractors} detr</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Targets moved → Sales Channel (target-based sales). See /command → Targets. */}
      <p className="text-xs text-gray-400 -mt-2">🎯 KPI progress, monthly revenue targets &amp; core KPIs now live in <a href="/command" className="text-[#7C3AED] hover:underline">Sales Channel → Targets</a> (target‑based sales).</p>

      {/* Scenario Tracker */}
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Scenario Tracker — {current.month}</h2>
          <span className="rounded-full text-[10px] uppercase tracking-wider bg-gray-100 text-gray-400 px-2 py-0.5 font-semibold">Projection</span>
        </div>
        <p className="text-xs text-gray-400 mb-5">Which path are you on? Current MRR tracked against 3 scenarios.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SCENARIOS.map(s => {
            const monthTarget = Math.round(current.mrrTarget * s.mrrMultiplier)
            const isActive = s.name === scenarioLabel
            return (
              <div key={s.name} className={`rounded-xl border p-5 relative ${s.bg} ${s.border} ${isActive ? 'ring-1 ring-gray-200' : ''}`}>
                {isActive && (
                  <div className="absolute top-3 right-3 text-xs bg-gray-100 text-gray-900 px-2 py-0.5 rounded-full font-medium">
                    You are here
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className={`font-semibold text-sm ${s.color}`}>{s.name}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">${monthTarget.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">MRR target</p>
                <p className="text-xs text-gray-400 mt-3 leading-relaxed">{s.description}</p>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Dec 2026 target</span>
                    <span className="text-gray-500 font-medium">${s.decTarget.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Blended ARPU — real, computed from active subs. (The old product-tier
         cards were removed 2 Jul: they hardcoded the retired "$20 Lead Gen" tiers
         as current pricing — #284/#283 retired that model.) */}
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Blended ARPU</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Average revenue per active client — computed live from Supabase</p>
        <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Blended ARPU</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stats.blendedArpu ? `$${stats.blendedArpu}` : '—'}
              {stats.blendedArpu > 0 && <span className="text-sm text-gray-400">/mo per active client</span>}
            </p>
          </div>
          <p className="text-xs text-gray-400 text-right max-w-xs">Calculated from {stats.activeCount} active subscriptions in Supabase</p>
        </div>
      </div>

      {/* 90-Day Revenue Forecast */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">90-Day Revenue Forecast</h2>
          <span className="rounded-full text-[10px] uppercase tracking-wider bg-gray-100 text-gray-400 px-2 py-0.5 font-semibold">Projection</span>
        </div>
        <p className="text-xs text-gray-400 mb-5">Based on current MRR, growth trajectory, and churn assumptions</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-100">
                {['Scenario', 'Month 1', 'Month 2', 'Month 3'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {[
                {
                  name: 'Conservative',
                  color: 'text-amber-600',
                  dot: 'bg-amber-500',
                  bg: 'bg-amber-50/40',
                  rate: 1.05,
                  note: '5% growth / 8% churn',
                },
                {
                  name: 'Base',
                  color: 'text-blue-600',
                  dot: 'bg-blue-500',
                  bg: 'bg-blue-50/40',
                  rate: 1.15,
                  note: '15% growth / 5% churn',
                },
                {
                  name: 'Optimistic',
                  color: 'text-emerald-600',
                  dot: 'bg-emerald-500',
                  bg: 'bg-emerald-50/40',
                  rate: 1.30,
                  note: '30% growth / 3% churn',
                },
              ].map(s => (
                <tr key={s.name} className={`${s.bg}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                      <div>
                        <span className={`font-semibold text-sm ${s.color}`}>{s.name}</span>
                        <p className="text-xs text-gray-400">{s.note}</p>
                      </div>
                    </div>
                  </td>
                  {[1, 2, 3].map(n => (
                    <td key={n} className="px-4 py-3 font-medium text-gray-700">
                      ${Math.round(stats.mrrUsd * Math.pow(s.rate, n)).toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Forecast assumes no major churn events. Based on {stats.activeCount} active clients at ${stats.mrrUsd}/mo MRR.
        </p>
      </div>

      {/* Credit sales placeholder */}
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Credit Sales — This Month</h2>
        <p className="text-xs text-gray-400 mb-4">Apollo credit purchases attributed to client accounts</p>
        <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-lg p-5 text-center">
          <p className="text-gray-400 text-sm">Credit transaction data will appear here once the billing webhook is connected.</p>
          <p className="text-gray-400 text-xs mt-2">Expected data: credit_type | client_id | amount_usd | timestamp</p>
        </div>
      </div>

      {/* Cohorts — SINGLE HOME is /cohorts (#282 dedup). Finance no longer
         duplicates the table (it was hardcoded sample rows); it glances + links. */}

      {/* Cost stack — money out */}
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Cost stack — money out</h2>
        <p className="text-xs text-gray-400 mb-4">~$690/mo · estimate until Xero connects</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">{['Item', 'Monthly', 'Notes'].map(h => <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {[['Infra (Railway / Supabase / Cloudflare)', '~$138', 'fixed'],
                ['Smartlead inboxes (pool + branded)', '~$220', 'scales with clients'],
                ['Data credits (Apollo / PDL / Hunter / Clearbit)', '~$180', 'per-lead, variable'],
                ['Claude (AI) + Resend', '~$150', 'per-send, variable']].map(r => (
                <tr key={r[0]}><td className="px-3 py-3 text-gray-900">{r[0]}</td><td className="px-3 py-3 font-medium text-gray-700">{r[1]}</td><td className="px-3 py-3 text-gray-500">{r[2]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">Retention cohorts → <a href="/cohorts" className="text-[#7C3AED] hover:underline">Cohorts</a> · targets → <a href="/command" className="text-[#7C3AED] hover:underline">Sales Channel</a>.</p>
    </main>
  )
}
