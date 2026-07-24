'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Coins, TrendingUp, Users, ShieldCheck, Loader2, ArrowUpRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'

// ── Bar chart (weekly usage) — pure SVG ────────────────────────────────────────
function UsageBarChart({ transactions }: { transactions: CreditTransaction[] }) {
  if (transactions.length === 0) return null

  // Group consumed credits by week
  const weeks: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.amount >= 0) continue // skip top-ups, only show usage
    const d = new Date(tx.created_at)
    // ISO week start (Monday)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setDate(diff)
    const key = monday.toISOString().slice(0, 10)
    weeks[key] = (weeks[key] ?? 0) + Math.abs(tx.amount)
  }

  const sorted = Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])).slice(-8)
  if (sorted.length < 2) return null

  const maxVal = Math.max(...sorted.map(([, v]) => v), 1)
  const W = 400
  const H = 80
  const barW = Math.floor((W - sorted.length * 4) / sorted.length)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ height: H + 24 }}>
        {sorted.map(([week, val], i) => {
          const x = i * (barW + 4)
          const barH = Math.max(3, Math.round((val / maxVal) * H))
          const y = H - barH
          const label = new Date(week).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          return (
            <g key={week}>
              <rect x={x} y={y} width={barW} height={barH} rx="3" fill="#7C3AED" opacity="0.8" />
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">{label}</text>
              {val > 0 && (
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="600">{val}</text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

interface CreditTransaction { id: string; type: string; amount: number; plan: string | null; note: string | null; created_at: string }
interface LeadStats { total: number; scored: number; consented: number; exported: number; avg_score: number; pipeline_value_usd: number }
interface UsageData {
  leads_this_period: number
  included_leads: number
  period_start: string
  period_end: string
  overage_leads: number
  overage_cost_usd: number
  reveals_this_month?: number
  figsy_this_month?: number
}

// Keys must match the transaction `type` values the API actually writes:
// 'usage' (lead/FIGSY spend), 'referral_bonus', 'trial_bonus', 'purchase'.
const TYPE_LABEL: Record<string, string> = {
  purchase:       'Top-up',
  usage:          'Credit used',
  referral_bonus: 'Referral reward',
  trial_bonus:    'Trial bonus',
  // legacy / fallback labels
  referral:       'Referral reward',
  consumed:       'Credit used',
  manual_grant:   'Manual grant',
  refund:         'Refund',
}

const APPROVED_LEAD_RATE_USD = 4

export default function UsagePage() {
  const supabase = createClient()
  const [loading, setLoading]           = useState(true)
  const [loadError, setLoadError]       = useState<string | null>(null)
  const [balance, setBalance]           = useState(0)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [totals, setTotals]             = useState<{ purchased: number | null; used: number | null }>({ purchased: null, used: null })
  const [stats, setStats]               = useState<LeadStats | null>(null)
  const [usage, setUsage]               = useState<UsageData | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const [creditsRes, statsRes, usageRes] = await Promise.all([
          api.get<{ data: { wallet_balance_usd: number; total_purchased?: number; total_used?: number; transactions?: CreditTransaction[] } }>('/credits', session.access_token),
          api.get<{ data: LeadStats }>('/leads/stats', session.access_token).catch(() => ({ data: null })),
          api.get<{ data: UsageData }>('/clients/me/usage', session.access_token).catch(() => ({ data: null })),
        ])
        setBalance(creditsRes.data.wallet_balance_usd ?? 0)
        setTransactions(creditsRes.data.transactions ?? [])
        setTotals({
          purchased: creditsRes.data.total_purchased ?? null,
          used:      creditsRes.data.total_used ?? null,
        })
        if (statsRes.data) setStats(statsRes.data)
        if (usageRes.data) setUsage(usageRes.data)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load usage data — please refresh.')
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
    </div>
  )

  if (loadError) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-600 font-medium mb-2">Could not load usage data</p>
        <p className="text-sm text-[#7B6FA0] mb-4">{loadError}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm hover:bg-[#6D28D9] transition-colors">
          Retry
        </button>
      </div>
    </div>
  )

  // Prefer the server-computed totals (full ledger); fall back to summing the
  // 50-row display slice only if the API didn't supply them (older API).
  const totalSpent     = totals.used      ?? transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalPurchased = totals.purchased ?? transactions.filter(t => t.type === 'purchase').reduce((s, t) => s + t.amount, 0)


  // #385 — real month-to-date per-lead spend from the server (FULL ledger, not the
  // 50-row /credits slice which under-reports high-volume clients). One wallet: a flat
  // $4 per approved lead, final — FIGSY's work is included.
  const approvedThisMonth = usage?.reveals_this_month ?? 0
  const spendThisMonthUsd = approvedThisMonth * APPROVED_LEAD_RATE_USD


  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
        <p className="text-[#7B6FA0] text-sm mt-1">Credits, lead pipeline, and outreach performance.</p>
      </div>

      {/* #385 — Per-approved-lead spend this month (REAL ledger, not a fake bundle).
          One wallet: a flat $4 per approved lead, final. No monthly included bundle. */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-6 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-gray-900">Per-lead spend this month</h2>
          <span className="text-xs text-[#9B8EC4]">You pay per approved lead — no monthly bundle</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{approvedThisMonth}</p>
            <p className="text-xs text-[#7B6FA0] mt-1">Leads approved · $4 each</p>
          </div>
          <div className="bg-[#F5EEFF]/60 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">${spendThisMonthUsd.toFixed(0)}</p>
            <p className="text-xs text-[#7B6FA0] mt-1">Spent this month</p>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-[#F5F0FF]/60 border border-purple-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 text-[#7C3AED] mt-0.5 shrink-0" />
          <p className="text-xs text-[#7B6FA0]">
            Approve a delivered lead for a flat <strong>$4</strong>, final.
            Sourcing, delivery and FIGSY&apos;s work are included — you only pay for leads you approve.
          </p>
        </div>
      </div>

      {/* Credit summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Wallet', value: `$${balance ?? 0}`, icon: <Coins className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Added', value: `$${totalPurchased}`, icon: <ArrowUpRight className="w-5 h-5" />, color: 'text-[#7C3AED]', bg: 'bg-[#F5F0FF]' },
          { label: 'Spent', value: `$${totalSpent}`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg} ${color}`}>{icon}</div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-[#7B6FA0] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline stats */}
      {stats && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Lead pipeline</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total leads', value: stats.total, icon: <Users className="w-4 h-4" />, color: 'text-[#7C3AED]', bg: 'bg-[#F5F0FF]' },
              { label: 'Scored', value: stats.scored, icon: <TrendingUp className="w-4 h-4" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'POPIA consented', value: stats.consented, icon: <ShieldCheck className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Est. pipeline value', value: `$${stats.pipeline_value_usd.toLocaleString()}`, icon: <Coins className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(({ label, value, icon, color, bg }) => (
              <div key={label} className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg} ${color}`}>{icon}</div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-[#7B6FA0]">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly credit usage bar chart */}
      {transactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Weekly credit usage</h2>
            <span className="text-xs text-[#9B8EC4]">Last 8 weeks</span>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-5">
            {transactions.some(t => t.amount < 0) ? (
              <UsageBarChart transactions={transactions} />
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-[#9B8EC4]">No credits used yet — chart will appear here once you start using FIGSY.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Outreach performance — placeholder until FIGSY is live */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Outreach performance</h2>
        <div className="bg-white rounded-xl border border-dashed border-purple-100/80 p-8 text-center">
          <p className="text-sm font-medium text-[#7B6FA0]">Outreach metrics available once FIGSY is active</p>
          <p className="text-xs text-[#9B8EC4] mt-1">Email send rate, reply rate, and positive reply rate will appear here.</p>
        </div>
      </div>

      {/* Credit history */}
      {transactions.length > 0 ? (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Credit history</h2>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 overflow-hidden">
            {transactions.map((tx, i) => (
              <div key={tx.id} className={`flex items-center justify-between px-5 py-3.5 text-sm ${i < transactions.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div>
                  <p className="font-medium text-gray-800">{TYPE_LABEL[tx.type] ?? tx.type.replace(/_/g, ' ')}{tx.plan ? ` · ${tx.plan === 'kind_ai' ? 'K.I.N.D AI' : 'FIGSY'}` : ''}</p>
                  <p className="text-xs text-[#9B8EC4] mt-0.5">{new Date(tx.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</p>
                </div>
                <span className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Credit history</h2>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-8 text-center text-sm text-[#9B8EC4]">
            No transactions yet.{' '}
            <Link href="/dashboard/billing" className="text-[#7C3AED] hover:underline">Top up credits →</Link>
          </div>
        </div>
      )}
    </div>
  )
}
