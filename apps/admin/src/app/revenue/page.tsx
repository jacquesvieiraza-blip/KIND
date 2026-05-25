export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { DollarSign, Target, TrendingUp, CheckCircle2, MinusCircle, XCircle } from 'lucide-react'

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
    color: 'text-amber-400',
    border: 'border-amber-400/20',
    bg: 'bg-amber-400/5',
    dot: 'bg-amber-400',
    mrrMultiplier: 0.6,
    description: '60% of base target — slower trial conversion, higher churn',
    mayTarget: 300,
    junTarget: 1200,
    decTarget: 28800,
  },
  {
    name: 'Base',
    color: 'text-blue-400',
    border: 'border-blue-400/20',
    bg: 'bg-blue-400/5',
    dot: 'bg-blue-400',
    mrrMultiplier: 1.0,
    description: 'On-plan targets — steady conversion and low churn',
    mayTarget: 500,
    junTarget: 2000,
    decTarget: 48000,
  },
  {
    name: 'Optimistic',
    color: 'text-emerald-400',
    border: 'border-emerald-400/20',
    bg: 'bg-emerald-400/5',
    dot: 'bg-emerald-400',
    mrrMultiplier: 1.4,
    description: '140% of base — strong word-of-mouth, referral loop kicks in',
    mayTarget: 700,
    junTarget: 2800,
    decTarget: 67200,
  },
]

const ARPU_TIERS = [
  { name: 'Starter',  price: 20,  color: 'text-white/50',  description: 'Lead Gen only — 100 leads included' },
  { name: 'Growth',   price: 160, color: 'text-blue-400',   description: 'Lead Gen + FIGSY add-on' },
  { name: 'Scale',    price: 400, color: 'text-emerald-400', description: 'Full platform — VA + Chatbot + FIGSY' },
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
  const nowMs = Date.now()
  for (const t of MONTHLY_TARGETS) {
    const d = new Date(t.month)
    if (d.getTime() >= nowMs - 86400000 * 30) return t
  }
  return MONTHLY_TARGETS[MONTHLY_TARGETS.length - 1]
}

async function getRevStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

  const mrrUsd = (activeSubs || []).reduce((sum, sub) => sum + (sub.amount_usd || 0), 0)
  const mrrZar = Math.round(mrrUsd * 19)
  const activeCount = activeSubs?.length ?? 0
  const trialCount = trialSubs?.length ?? 0
  const blendedArpu = activeCount > 0 ? Math.round(mrrUsd / activeCount) : 0

  return { mrrUsd, mrrZar, activeCount, trialCount, totalClients: totalClients ?? 0, blendedArpu }
}

export default async function RevenuePage() {
  const stats = await getRevStats()
  const current = getCurrentTarget()
  const mrrPct = Math.min((stats.mrrUsd / current.mrrTarget) * 100, 100)
  const clientPct = Math.min((stats.totalClients / current.clientTarget) * 100, 100)

  // Determine which scenario the founder is tracking toward
  let scenarioLabel = 'Conservative'
  if (stats.mrrUsd >= current.mrrTarget) scenarioLabel = 'Optimistic'
  else if (stats.mrrUsd >= current.mrrTarget * 0.7) scenarioLabel = 'Base'

  return (
    <main className="px-8 py-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DollarSign className="w-6 h-6 text-white/40" />
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue</h1>
          <p className="text-sm text-white/40 mt-0.5">Deep-dive: MRR tracking, scenarios, ARPU breakdown</p>
        </div>
      </div>

      {/* Live MRR + context */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'MRR (USD)',          value: `$${stats.mrrUsd.toLocaleString()}`,   sub: 'live from Supabase', color: 'bg-emerald-400/10 text-emerald-400' },
          { label: 'MRR (ZAR)',          value: `R${stats.mrrZar.toLocaleString()}`,   sub: '@ R19 / USD',        color: 'bg-emerald-400/10 text-emerald-400' },
          { label: 'Active Paying',      value: stats.activeCount,                      sub: 'subscriptions',      color: 'bg-blue-400/10 text-blue-400' },
          { label: 'Blended ARPU',       value: stats.blendedArpu ? `$${stats.blendedArpu}` : '—', sub: 'per active client', color: 'bg-purple-400/10 text-purple-400' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-white/60 mt-0.5">{label}</p>
            <p className="text-xs text-white/30 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Current month progress */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Target className="w-5 h-5 text-[#0066FF]" />
          <h2 className="font-semibold text-white">KPI Progress — {current.month}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-white/60">MRR</span>
              <span className="font-semibold text-white">${stats.mrrUsd.toLocaleString()} / ${current.mrrTarget.toLocaleString()}</span>
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
              <span className="font-semibold text-white">{stats.totalClients} / {current.clientTarget}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${ragStatus(clientPct) === 'green' ? 'bg-emerald-400' : ragStatus(clientPct) === 'amber' ? 'bg-amber-400' : 'bg-indigo-400'}`}
                   style={{ width: `${clientPct}%` }} />
            </div>
            <p className="text-xs text-white/30 mt-1">{clientPct.toFixed(1)}% of target</p>
          </div>
        </div>
      </div>

      {/* Scenario Tracker */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-white/40" />
          <h2 className="font-semibold text-white">Scenario Tracker — {current.month}</h2>
        </div>
        <p className="text-xs text-white/40 mb-5">Which path are you on? Current MRR tracked against 3 scenarios.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SCENARIOS.map(s => {
            const monthTarget = Math.round(current.mrrTarget * s.mrrMultiplier)
            const isActive = s.name === scenarioLabel
            return (
              <div key={s.name} className={`rounded-xl border p-5 relative ${s.bg} ${s.border} ${isActive ? 'ring-1 ring-white/20' : ''}`}>
                {isActive && (
                  <div className="absolute top-3 right-3 text-xs bg-white/10 text-white px-2 py-0.5 rounded-full font-medium">
                    You are here
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className={`font-semibold text-sm ${s.color}`}>{s.name}</span>
                </div>
                <p className="text-2xl font-bold text-white">${monthTarget.toLocaleString()}</p>
                <p className="text-xs text-white/40 mt-0.5">MRR target</p>
                <p className="text-xs text-white/30 mt-3 leading-relaxed">{s.description}</p>
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/30">Dec 2026 target</span>
                    <span className="text-white/50 font-medium">${s.decTarget.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Monthly revenue targets table */}
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
                const pct = Math.min((stats.mrrUsd / t.mrrTarget) * 100, 100)
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

      {/* ARPU Breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-1">ARPU Breakdown</h2>
        <p className="text-xs text-white/40 mb-4">Average Revenue Per User across product tiers</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {ARPU_TIERS.map(tier => (
            <div key={tier.name} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
              <p className={`text-lg font-bold ${tier.color}`}>{tier.name}</p>
              <p className="text-2xl font-bold text-white mt-1">${tier.price}<span className="text-sm text-white/40">/mo</span></p>
              <p className="text-xs text-white/30 mt-2">{tier.description}</p>
            </div>
          ))}
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">Blended ARPU</p>
            <p className="text-2xl font-bold text-white mt-1">
              {stats.blendedArpu ? `$${stats.blendedArpu}` : '—'}
              {stats.blendedArpu > 0 && <span className="text-sm text-white/40">/mo per active client</span>}
            </p>
          </div>
          <p className="text-xs text-white/30 text-right max-w-xs">Calculated from {stats.activeCount} active subscriptions in Supabase</p>
        </div>
      </div>

      {/* Core KPI Targets */}
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

      {/* Credit sales placeholder */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-1">Credit Sales — This Month</h2>
        <p className="text-xs text-white/40 mb-4">Apollo credit purchases attributed to client accounts</p>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5 text-center">
          <p className="text-white/40 text-sm">Credit transaction data will appear here once the billing webhook is connected.</p>
          <p className="text-white/20 text-xs mt-2">Expected data: credit_type | client_id | amount_usd | timestamp</p>
        </div>
      </div>
    </main>
  )
}
