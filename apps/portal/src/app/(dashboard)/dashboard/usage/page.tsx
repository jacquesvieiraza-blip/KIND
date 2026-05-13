'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Coins, TrendingUp, Users, ShieldCheck, Loader2, ArrowUpRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface CreditTransaction { id: string; type: string; amount: number; plan: string | null; note: string | null; created_at: string }
interface LeadStats { total: number; scored: number; consented: number; exported: number; avg_score: number; pipeline_value_usd: number }
interface UsageData {
  leads_this_period: number
  included_leads: number
  period_start: string
  period_end: string
  overage_leads: number
  overage_cost_usd: number
}

const TYPE_LABEL: Record<string, string> = {
  purchase:     'Top-up',
  referral:     'Referral reward',
  consumed:     'Credit used',
  manual_grant: 'Manual grant',
  refund:       'Refund',
}

const INCLUDED_LEADS = 100
const OVERAGE_RATE_USD = 1

export default function UsagePage() {
  const supabase = createClient()
  const [loading, setLoading]           = useState(true)
  const [balance, setBalance]           = useState(0)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [stats, setStats]               = useState<LeadStats | null>(null)
  const [usage, setUsage]               = useState<UsageData | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const [creditsRes, statsRes, usageRes] = await Promise.all([
          api.get<{ data: { balance: number; transactions: CreditTransaction[] } }>('/credits', session.access_token),
          api.get<{ data: LeadStats }>('/leads/stats', session.access_token).catch(() => ({ data: null })),
          api.get<{ data: UsageData }>('/clients/me/usage', session.access_token).catch(() => ({ data: null })),
        ])
        setBalance(creditsRes.data.balance)
        setTransactions(creditsRes.data.transactions)
        if (statsRes.data) setStats(statsRes.data)
        if (usageRes.data) setUsage(usageRes.data)
      } catch { }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
    </div>
  )

  const totalSpent     = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
  const totalPurchased = transactions.filter(t => t.type === 'purchase').reduce((s, t) => s + t.amount, 0)

  const leadsThisPeriod = usage?.leads_this_period ?? 0
  const overageLeads    = Math.max(0, leadsThisPeriod - INCLUDED_LEADS)
  const overageCost     = usage?.overage_cost_usd ?? overageLeads * OVERAGE_RATE_USD
  const progressPct     = Math.min((leadsThisPeriod / INCLUDED_LEADS) * 100, 100)

  const periodStart = usage?.period_start ? new Date(usage.period_start).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : null
  const periodEnd   = usage?.period_end   ? new Date(usage.period_end).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : null

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
        <p className="text-gray-500 text-sm mt-1">Credits, lead pipeline, and outreach performance.</p>
      </div>

      {/* Lead usage this billing period */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Leads this billing period</h2>
          {periodStart && periodEnd && (
            <span className="text-xs text-gray-400">{periodStart} – {periodEnd}</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{leadsThisPeriod}</p>
            <p className="text-xs text-gray-500 mt-1">Leads used</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{INCLUDED_LEADS}</p>
            <p className="text-xs text-gray-500 mt-1">Included</p>
          </div>
          <div className={`rounded-xl p-4 text-center ${overageLeads > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <p className={`text-3xl font-bold ${overageLeads > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{overageLeads}</p>
            <p className="text-xs text-gray-500 mt-1">
              Overage {overageLeads > 0 ? `· $${overageCost.toFixed(2)}` : ''}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>{leadsThisPeriod} of {INCLUDED_LEADS} included leads used</span>
            <span>{progressPct.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all ${overageLeads > 0 ? 'bg-amber-500' : 'bg-brand-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {overageLeads > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                You've used {overageLeads} overage lead{overageLeads !== 1 ? 's' : ''} this period at ${OVERAGE_RATE_USD}/lead.
                Overage total: <strong>${overageCost.toFixed(2)}</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Credit summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Balance', value: balance, icon: <Coins className="w-5 h-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Credits purchased', value: totalPurchased, icon: <ArrowUpRight className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Credits used', value: totalSpent, icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${bg} ${color}`}>{icon}</div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Pipeline stats */}
      {stats && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Lead pipeline</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total leads', value: stats.total, icon: <Users className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Scored', value: stats.scored, icon: <TrendingUp className="w-4 h-4" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'POPIA consented', value: stats.consented, icon: <ShieldCheck className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Pipeline value', value: `$${stats.pipeline_value_usd.toLocaleString()}`, icon: <Coins className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(({ label, value, icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg} ${color}`}>{icon}</div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outreach performance — placeholder until FIGSY is live */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Outreach performance</h2>
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-500">Outreach metrics available once FIGSY is active</p>
          <p className="text-xs text-gray-400 mt-1">Email send rate, reply rate, and positive reply rate will appear here.</p>
        </div>
      </div>

      {/* Credit history */}
      {transactions.length > 0 ? (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Credit history</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {transactions.map((tx, i) => (
              <div key={tx.id} className={`flex items-center justify-between px-5 py-3.5 text-sm ${i < transactions.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div>
                  <p className="font-medium text-gray-800">{TYPE_LABEL[tx.type] ?? tx.type}{tx.plan ? ` · ${tx.plan === 'kind_ai' ? 'K.I.N.D AI' : 'FIGSY'}` : ''}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(tx.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</p>
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
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-400">
            No transactions yet.{' '}
            <Link href="/dashboard/billing" className="text-brand-500 hover:underline">Top up credits →</Link>
          </div>
        </div>
      )}
    </div>
  )
}
