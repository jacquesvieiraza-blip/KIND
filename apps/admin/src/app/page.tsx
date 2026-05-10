export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'

const EMPTY_STATS = { totalClients: 0, activeSubscriptions: 0, trialClients: 0, pastDue: 0, totalLeads: 0, mrrZar: 0, mrrUsd: 0, recentSubs: [] }

// Admin page — uses service role server-side only
async function getAdminStats() {
  try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !serviceKey) return EMPTY_STATS

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const [
    { count: totalClients },
    { data: activeSubs },
    { data: trialSubs },
    { count: pastDue },
    { count: totalLeads },
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*').eq('status', 'active'),
    supabase.from('subscriptions').select('*').eq('status', 'trialing'),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'past_due'),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
  ])

  const mrrZar = (activeSubs || []).reduce((sum, sub) => {
    return sum + (sub.amount_zar || 0) / 100
  }, 0)

  return {
    totalClients: totalClients || 0,
    activeSubscriptions: activeSubs?.length || 0,
    trialClients: trialSubs?.length || 0,
    pastDue: pastDue || 0,
    totalLeads: totalLeads || 0,
    mrrZar,
    mrrUsd: Math.round(mrrZar / 19),
    recentSubs: activeSubs?.slice(0, 10) || [],
  }
  } catch (err) {
    console.error('Admin stats error:', err)
    return EMPTY_STATS
  }
}

export default async function AdminPage() {
  const stats = await getAdminStats()

  return (
    <div className="space-y-6 max-w-5xl">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>

        {/* Revenue to Target */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">Progress to $100K Target</h2>
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-500">Current MRR</span>
            <span className="font-semibold">${stats.mrrUsd.toLocaleString()} / $26,000</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-brand-500 h-3 rounded-full transition-all"
              style={{ width: `${Math.min((stats.mrrUsd / 26000) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {((stats.mrrUsd / 26000) * 100).toFixed(1)}% of Month 6 MRR target
          </p>
        </div>

        {/* Total Leads */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-2">Platform Leads</h2>
          <p className="text-3xl font-bold text-brand-500">{stats.totalLeads.toLocaleString()}</p>
          <p className="text-sm text-gray-400 mt-1">Total leads sourced across all clients</p>
        </div>

        {/* Products */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">Products</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Lead Generation', tiers: [{ tier: 'Starter', price: 99 }, { tier: 'Pro', price: 249 }, { tier: 'Enterprise', price: 599 }] },
              { name: 'Virtual Assistant', tiers: [{ tier: 'Starter', price: 149 }, { tier: 'Pro', price: 349 }, { tier: 'Enterprise', price: 799 }] },
              { name: 'Chatbot Agent', tiers: [{ tier: 'Starter', price: 99 }, { tier: 'Pro', price: 249 }, { tier: 'Enterprise', price: 499 }] },
              { name: 'Consulting', tiers: [{ tier: 'Pro', price: 499 }, { tier: 'Enterprise', price: 999 }] },
            ].map((product) => (
              <div key={product.name} className="border border-gray-100 rounded-lg p-4">
                <p className="font-medium text-sm">{product.name}</p>
                <div className="mt-2 space-y-1">
                  {product.tiers.map(({ tier, price }) => (
                    <div key={tier} className="flex justify-between text-xs text-gray-500">
                      <span>{tier}</span>
                      <span>${price}/mo</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
    </div>
  )
}
