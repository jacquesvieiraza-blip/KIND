import { createClient } from '@supabase/supabase-js'
import { PRODUCTS } from '@kind/shared'
import { Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'

async function getAdminStats() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const [{ count: totalClients }, { data: activeSubs }, { data: trialSubs }, { count: pastDue }, { count: totalLeads }] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('*').eq('status', 'active'),
    supabase.from('subscriptions').select('*').eq('status', 'trialing'),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'past_due'),
    supabase.from('leads').select('id', { count: 'exact', head: true }),
  ])
  const mrrUsd = (activeSubs || []).reduce((sum, sub) => sum + (sub.amount_usd || 0), 0)
  const mrrZar = Math.round(mrrUsd * 19)
  return { totalClients: totalClients || 0, activeSubscriptions: activeSubs?.length || 0, trialClients: trialSubs?.length || 0, pastDue: pastDue || 0, totalLeads: totalLeads || 0, mrrZar, mrrUsd }
}

export default async function AdminPage() {
  const stats = await getAdminStats()
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#001f4d] text-white px-8 py-4 flex items-center justify-between">
        <div><h1 className="font-bold text-lg">K.I.N.D Admin</h1><p className="text-white/50 text-xs">Operations Dashboard</p></div>
        <div className="flex items-center gap-6">
          <a href="/roadmap" className="text-xs text-white/60 hover:text-white transition-colors">Roadmap →</a>
          <span className="text-xs text-white/40">{new Date().toLocaleDateString('en-ZA', { dateStyle: 'full' })}</span>
        </div>
      </header>
      <main className="px-8 py-6 max-w-6xl space-y-6">
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
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">Progress to $26K MRR (Month 6 target)</h2>
          <div className="mb-2 flex justify-between text-sm"><span className="text-gray-500">Current MRR</span><span className="font-semibold">${stats.mrrUsd.toLocaleString()} / $26,000</span></div>
          <div className="w-full bg-gray-100 rounded-full h-3"><div className="bg-[#0066FF] h-3 rounded-full" style={{ width: `${Math.min((stats.mrrUsd / 26000) * 100, 100)}%` }} /></div>
          <p className="text-xs text-gray-400 mt-2">{((stats.mrrUsd / 26000) * 100).toFixed(1)}% of Month 6 MRR target</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">Product Catalog</h2>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(PRODUCTS).map(([key, product]) => (
              <div key={key} className="border border-gray-100 rounded-lg p-4">
                <p className="font-medium text-sm">{product.name}</p>
                <div className="mt-2 space-y-1">
                  {Object.entries(product.tiers).map(([tier, config]) => {
                    const c = config as { price_usd: number; custom?: boolean }
                    return (
                      <div key={tier} className="flex justify-between text-xs text-gray-500">
                        <span className="capitalize">{tier}</span>
                        <span>{c.custom ? 'Custom' : `$${c.price_usd}/mo`}</span>
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
