export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

interface Subscription { status: string; product: string }
interface Client {
  id: string
  company_name: string
  country: string
  industry: string | null
  created_at: string
  terms_accepted_at: string | null
  user_id: string | null
  credit_balance: number
  subscriptions: Subscription[]
}

interface EnrichedClient extends Client {
  last_login_days: number | null
  leads_14d: number
  figsy_active: number
  figsy_sent_7d: number
  health: 'green' | 'amber' | 'red'
  mrr_this_month: number
}

function clientHealth(client: {
  last_login_days: number | null
  leads_14d: number
  figsy_active: number
  credit_balance: number
}): 'green' | 'amber' | 'red' {
  if (client.last_login_days === null || client.last_login_days > 7) return 'red'
  if (client.last_login_days > 3 || client.credit_balance < 20) return 'amber'
  return 'green'
}

async function getEnrichedClients(): Promise<EnrichedClient[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return []
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const now = new Date()
  const ago14 = new Date(now.getTime() - 14 * 86400000).toISOString()
  const ago7  = new Date(now.getTime() - 7  * 86400000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { data: clientsRaw },
    { data: leads14 },
    { data: figsyCampaigns },
    { data: figsyEmails7 },
    { data: creditTxMonth },
  ] = await Promise.all([
    db.from('clients').select('*, subscriptions(*)').order('created_at', { ascending: false }),
    db.from('leads').select('client_id, id').gte('created_at', ago14),
    db.from('figsy_campaigns').select('client_id, status').eq('status', 'active'),
    db.from('figsy_sent_emails').select('client_id, id').gte('sent_at', ago7),
    db.from('credit_transactions').select('client_id, amount').gte('created_at', monthStart).gt('amount', 0),
  ])

  const clients = (clientsRaw || []) as Client[]

  // Count leads per client (14d)
  const leadsPerClient: Record<string, number> = {}
  for (const l of (leads14 || [])) {
    leadsPerClient[l.client_id] = (leadsPerClient[l.client_id] || 0) + 1
  }

  // Count active FIGSY campaigns per client
  const figsyActivePerClient: Record<string, number> = {}
  for (const c of (figsyCampaigns || [])) {
    figsyActivePerClient[c.client_id] = (figsyActivePerClient[c.client_id] || 0) + 1
  }

  // Count FIGSY sent emails per client (7d)
  const figsySentPerClient: Record<string, number> = {}
  for (const e of (figsyEmails7 || [])) {
    figsySentPerClient[e.client_id] = (figsySentPerClient[e.client_id] || 0) + 1
  }

  // Sum MRR credits purchased per client this month
  const mrrPerClient: Record<string, number> = {}
  for (const tx of (creditTxMonth || [])) {
    mrrPerClient[tx.client_id] = (mrrPerClient[tx.client_id] || 0) + (tx.amount || 0)
  }

  // Try to get last login per client via admin API
  const lastLoginMap: Record<string, number | null> = {}
  try {
    const { data: { users } } = await db.auth.admin.listUsers({ perPage: 1000 })
    const userIdToClient: Record<string, string> = {}
    for (const c of clients) {
      if (c.user_id) userIdToClient[c.user_id] = c.id
    }
    for (const u of (users || [])) {
      const clientId = userIdToClient[u.id]
      if (clientId) {
        if (u.last_sign_in_at) {
          const diffDays = Math.floor((now.getTime() - new Date(u.last_sign_in_at).getTime()) / 86400000)
          lastLoginMap[clientId] = diffDays
        } else {
          lastLoginMap[clientId] = null
        }
      }
    }
  } catch {
    // Fall back gracefully — last_login_days will be null
  }

  return clients.map(c => {
    const last_login_days = lastLoginMap[c.id] !== undefined ? lastLoginMap[c.id] : null
    const leads_14d = leadsPerClient[c.id] || 0
    const figsy_active = figsyActivePerClient[c.id] || 0
    const figsy_sent_7d = figsySentPerClient[c.id] || 0
    const mrr_this_month = mrrPerClient[c.id] || 0
    const health = clientHealth({
      last_login_days,
      leads_14d,
      figsy_active,
      credit_balance: c.credit_balance || 0,
    })
    return { ...c, last_login_days, leads_14d, figsy_active, figsy_sent_7d, mrr_this_month, health }
  })
}

const HEALTH_DOT: Record<'green' | 'amber' | 'red', string> = {
  green: 'bg-emerald-400',
  amber: 'bg-amber-400',
  red:   'bg-red-400',
}

function LastLoginCell({ days }: { days: number | null }) {
  if (days === null) return <span className="text-white/30 text-xs">Never</span>
  if (days === 0) return <span className="text-emerald-400 text-xs">Today</span>
  if (days === 1) return <span className="text-emerald-400 text-xs">Yesterday</span>
  const color = days <= 3 ? 'text-emerald-400' : days <= 7 ? 'text-amber-400' : 'text-red-400'
  return <span className={`text-xs ${color}`}>{days}d ago</span>
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const atRiskOnly = searchParams.filter === 'atrisk'
  const allClients = await getEnrichedClients()
  const clients = atRiskOnly ? allClients.filter(c => c.health === 'red') : allClients

  const counts = {
    active:  allClients.filter(c => c.subscriptions?.some(s => s.status === 'active')).length,
    trial:   allClients.filter(c => c.subscriptions?.some(s => s.status === 'trialing')).length,
    atRisk:  allClients.filter(c => c.health === 'red').length,
    noCredits: allClients.filter(c => (c.credit_balance || 0) < 1).length,
  }

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active',         value: counts.active,        color: 'text-green-600' },
          { label: 'On Trial',       value: counts.trial,         color: 'text-[#7C3AED]' },
          { label: 'T&Cs Accepted',  value: counts.termsAccepted, color: 'text-[#7C3AED]' },
          { label: 'No Credits',     value: counts.noCredits,     color: 'text-gray-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Client table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
        {clients.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No clients yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-100">
                {['Company', 'Country', 'Status', 'T&Cs', 'Active Products', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {clients.map(client => {
                const st = clientStatus(client)
                const activeProducts = (client.subscriptions || []).filter(s => s.status === 'active' || s.status === 'trialing')

                return (
                  <tr key={client.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{client.company_name}</p>
                      {client.industry && <p className="text-xs text-gray-400">{client.industry}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{client.country}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                        {st.icon}{st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {client.terms_accepted_at ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {new Date(client.terms_accepted_at).toLocaleDateString('en-ZA')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not accepted</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {activeProducts.length > 0
                        ? activeProducts.map(s => <span key={s.product} className="text-xs bg-purple-50 text-[#7C3AED] border border-purple-100 px-1.5 py-0.5 rounded-full mr-1 font-medium">{s.product.replace('_', ' ')}</span>)
                        : <span className="text-xs text-gray-400">None</span>
                      }
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/clients/${client.id}`}
                        className="text-xs text-[#7C3AED] hover:text-purple-800 font-semibold">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
