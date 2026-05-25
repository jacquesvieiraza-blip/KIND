export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Users, AlertTriangle, CreditCard, Activity } from 'lucide-react'

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
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {atRiskOnly ? 'At-Risk Clients' : 'All Clients'}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {clients.length} client{clients.length !== 1 ? 's' : ''}
            {atRiskOnly && ' flagged at-risk'}
          </p>
        </div>
        {atRiskOnly && (
          <Link href="/clients" className="text-sm text-white/40 hover:text-white/70 transition-colors">
            ← All Clients
          </Link>
        )}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: 'Active',
            value: counts.active,
            icon: <Activity className="w-4 h-4 text-emerald-400" />,
            val_color: 'text-emerald-400',
          },
          {
            label: 'On Trial',
            value: counts.trial,
            icon: <CreditCard className="w-4 h-4 text-blue-400" />,
            val_color: 'text-blue-400',
          },
          {
            label: 'At-Risk',
            value: counts.atRisk,
            icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
            val_color: 'text-red-400',
            href: '/clients?filter=atrisk',
          },
          {
            label: 'No Credits',
            value: counts.noCredits,
            icon: <Users className="w-4 h-4 text-white/30" />,
            val_color: 'text-white/60',
          },
        ].map(({ label, value, icon, val_color, href }) => {
          const inner = (
            <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-white/40">{label}</span></div>
              <p className={`text-2xl font-bold ${val_color}`}>{value}</p>
            </div>
          )
          return href ? <Link key={label} href={href}>{inner}</Link> : inner
        })}
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        {clients.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 mx-auto mb-3 text-white/20" />
            <p className="text-sm text-white/30">
              {atRiskOnly ? 'No at-risk clients — all good!' : 'No clients yet'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Company', 'Joined', 'MRR Credits', 'Leads (14d)', 'FIGSY', 'Health', 'Last Login', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {clients.map(client => {
                const rowBg = client.health === 'red' ? 'bg-red-400/[0.03]' : ''
                const activeSubs = (client.subscriptions || []).filter(s => s.status === 'active' || s.status === 'trialing')

                return (
                  <tr key={client.id} className={`hover:bg-white/[0.03] transition-colors ${rowBg}`}>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-white">{client.company_name}</p>
                      {client.industry && <p className="text-xs text-white/30 mt-0.5">{client.industry}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-white/50 text-xs">
                      {new Date(client.created_at).toLocaleDateString('en-ZA', { dateStyle: 'medium' })}
                    </td>
                    <td className="px-5 py-3.5">
                      {client.mrr_this_month > 0
                        ? <span className="text-emerald-400 font-medium">{client.mrr_this_month}</span>
                        : <span className="text-white/30">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {client.leads_14d > 0
                        ? <span className="text-white font-medium">{client.leads_14d}</span>
                        : <span className="text-white/30">0</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      {client.figsy_active > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-400/10 border border-emerald-400/20 text-emerald-400">
                          Active
                        </span>
                      ) : (
                        <span className="text-white/30 text-xs">Off</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${HEALTH_DOT[client.health]}`} />
                    </td>
                    <td className="px-5 py-3.5">
                      <LastLoginCell days={client.last_login_days} />
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/clients/${client.id}`}
                        className="text-xs text-[#0066FF] hover:text-blue-400 font-medium transition-colors">
                        View →
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
