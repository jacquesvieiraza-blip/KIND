export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { TrendingUp, Users, UserCheck, UserX, ArrowUpRight } from 'lucide-react'

interface ClientRow {
  id: string
  company_name: string | null
  created_at: string
  first_icp_run_at: string | null
}

interface SubRow {
  client_id: string
  status: string
  created_at: string
  product: string | null
}

interface CohortData {
  month: string          // "2026-05"
  label: string          // "May 2026"
  total: number
  activated: number      // ran first ICP (= engaged)
  converted: number      // reached 'active' subscription
  churned: number        // was active, now cancelled/past_due
  still_trial: number
  activationRate: number // %
  conversionRate: number // %
  churnRate: number      // %
  clients: Array<{
    id: string
    name: string
    activated: boolean
    converted: boolean
    churned: boolean
  }>
}

async function getCohorts(): Promise<{ cohorts: CohortData[]; summary: { totalClients: number; totalConverted: number; avgConversion: number; avgChurn: number } }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { cohorts: [], summary: { totalClients: 0, totalConverted: 0, avgConversion: 0, avgChurn: 0 } }
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const [{ data: clients }, { data: subs }] = await Promise.all([
    db.from('clients').select('id, company_name, created_at, first_icp_run_at').order('created_at'),
    db.from('subscriptions').select('client_id, status, created_at, product'),
  ])

  const clientList = (clients || []) as ClientRow[]
  const subList    = (subs    || []) as SubRow[]

  // Index subs by client
  const subsByClient: Record<string, SubRow[]> = {}
  for (const s of subList) {
    if (!subsByClient[s.client_id]) subsByClient[s.client_id] = []
    subsByClient[s.client_id].push(s)
  }

  // Group clients by signup month
  const byMonth: Record<string, ClientRow[]> = {}
  for (const c of clientList) {
    const m = c.created_at.slice(0, 7) // "YYYY-MM"
    if (!byMonth[m]) byMonth[m] = []
    byMonth[m].push(c)
  }

  const cohorts: CohortData[] = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cohortClients]) => {
      const [year, mon] = month.split('-').map(Number)
      const label = new Date(year, mon - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

      const detail = cohortClients.map(c => {
        const csubs = subsByClient[c.id] || []
        const activated = !!c.first_icp_run_at
        const converted = csubs.some(s => s.status === 'active')
        const churned   = !converted && csubs.some(s => s.status === 'cancelled' || s.status === 'past_due')
        return { id: c.id, name: c.company_name || '(unnamed)', activated, converted, churned }
      })

      const total       = cohortClients.length
      const activated   = detail.filter(d => d.activated).length
      const converted   = detail.filter(d => d.converted).length
      const churned     = detail.filter(d => d.churned).length
      const still_trial = detail.filter(d => !d.converted && !d.churned &&
        (subsByClient[detail.find(x => x.id === detail.find(y => !y.converted && !y.churned)?.id)?.id ?? '']?.some(s => s.status === 'trialing') ?? false)
      ).length

      return {
        month,
        label,
        total,
        activated,
        converted,
        churned,
        still_trial,
        activationRate: total ? Math.round((activated / total) * 100) : 0,
        conversionRate: total ? Math.round((converted / total) * 100) : 0,
        churnRate:      total ? Math.round((churned / total) * 100) : 0,
        clients:        detail,
      }
    })

  const totalClients  = clientList.length
  const totalConverted = cohorts.reduce((s, c) => s + c.converted, 0)
  const avgConversion = cohorts.length
    ? Math.round(cohorts.reduce((s, c) => s + c.conversionRate, 0) / cohorts.length)
    : 0
  const avgChurn = cohorts.length
    ? Math.round(cohorts.reduce((s, c) => s + c.churnRate, 0) / cohorts.length)
    : 0

  return { cohorts: cohorts.reverse(), summary: { totalClients, totalConverted, avgConversion, avgChurn } }
}

function pct(n: number, color: string) {
  return (
    <span className={`font-semibold ${color}`}>{n}%</span>
  )
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${w}%` }} />
    </div>
  )
}

export default async function CohortsPage() {
  const { cohorts, summary } = await getCohorts()
  const maxClients = Math.max(...cohorts.map(c => c.total), 1)

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Cohort Analytics</h2>
        <p className="text-gray-400 text-sm mt-1">Clients grouped by signup month — activation, conversion, and churn.</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Clients',    value: summary.totalClients,        color: 'text-gray-900',       icon: <Users className="w-5 h-5 text-gray-400" /> },
          { label: 'Total Converted',  value: summary.totalConverted,      color: 'text-emerald-400', icon: <UserCheck className="w-5 h-5 text-emerald-400" /> },
          { label: 'Avg Conversion %', value: `${summary.avgConversion}%`, color: 'text-blue-400',    icon: <TrendingUp className="w-5 h-5 text-blue-400" /> },
          { label: 'Avg Churn %',      value: `${summary.avgChurn}%`,      color: 'text-red-400',     icon: <UserX className="w-5 h-5 text-red-400" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-5 flex items-center gap-4">
            {icon}
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cohort table */}
      {cohorts.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-16 text-center text-gray-400">
          No clients yet.
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cohort</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Clients</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Activated</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Trial → Paid</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Churned</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-8"></th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c, i) => (
                <tr key={c.month} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i === 0 ? 'bg-blue-400/[0.04]' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{c.label}</div>
                    {i === 0 && <div className="text-xs text-blue-400 mt-0.5">Current cohort</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 w-6 text-right">{c.total}</span>
                      <Bar value={c.total} max={maxClients} color="bg-gray-200" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-right text-gray-500">{c.activated}</span>
                      <Bar value={c.activated} max={c.total} color="bg-indigo-400" />
                      <span className="text-xs text-gray-400">{c.activationRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-right text-gray-500">{c.converted}</span>
                      <Bar value={c.converted} max={c.total} color="bg-emerald-400" />
                      {pct(c.conversionRate, c.conversionRate >= 30 ? 'text-emerald-400' : c.conversionRate >= 10 ? 'text-amber-400' : 'text-gray-400')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-right text-gray-500">{c.churned}</span>
                      <Bar value={c.churned} max={c.total} color="bg-red-400" />
                      {pct(c.churnRate, c.churnRate === 0 ? 'text-gray-400' : c.churnRate <= 10 ? 'text-amber-400' : 'text-red-400')}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <ArrowUpRight className="w-4 h-4 text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-cohort client breakdown */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Client Breakdown by Cohort</h3>
        {cohorts.map(c => (
          <details key={c.month} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden group">
            <summary className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors list-none">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">{c.label}</span>
                <span className="text-xs text-gray-400">{c.total} client{c.total !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-indigo-400">{c.activationRate}% activated</span>
                <span className="text-emerald-400">{c.conversionRate}% converted</span>
                {c.churnRate > 0 && <span className="text-red-400">{c.churnRate}% churned</span>}
                <span className="text-gray-400 ml-1">▸</span>
              </div>
            </summary>
            <div className="border-t border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-2 text-left text-xs font-semibold text-gray-400">Company</th>
                    <th className="px-6 py-2 text-left text-xs font-semibold text-gray-400">Activated ICP</th>
                    <th className="px-6 py-2 text-left text-xs font-semibold text-gray-400">Converted</th>
                    <th className="px-6 py-2 text-left text-xs font-semibold text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {c.clients.map(cl => (
                    <tr key={cl.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-3 font-medium text-gray-800">{cl.name}</td>
                      <td className="px-6 py-3">
                        {cl.activated
                          ? <span className="inline-flex items-center gap-1 text-xs text-indigo-400">✓ Yes</span>
                          : <span className="text-xs text-gray-400">Not yet</span>}
                      </td>
                      <td className="px-6 py-3">
                        {cl.converted
                          ? <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">✓ Paid</span>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-3">
                        {cl.churned   && <span className="text-xs px-2 py-0.5 rounded-full bg-red-400/10 border border-red-400/20 text-red-400">Churned</span>}
                        {cl.converted && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400">Active</span>}
                        {!cl.churned && !cl.converted && <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-400">Trial / Free</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>

      {/* Metric notes */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-xs text-gray-400 space-y-1">
        <p><strong className="text-gray-500">Activated</strong> — client ran their first ICP search (<code>first_icp_run_at</code> is set)</p>
        <p><strong className="text-gray-500">Converted</strong> — client has at least one <code>active</code> subscription</p>
        <p><strong className="text-gray-500">Churned</strong> — client has a <code>cancelled</code> or <code>past_due</code> subscription with no active one</p>
        <p><strong className="text-gray-500">Cohort</strong> — grouped by the month of <code>clients.created_at</code></p>
      </div>
    </div>
  )
}
