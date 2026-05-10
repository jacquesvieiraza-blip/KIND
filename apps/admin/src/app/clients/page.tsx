export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Users, TrendingUp } from 'lucide-react'

const API_URL = process.env.API_URL || 'https://kindapi-production.up.railway.app'
const ADMIN_SECRET = process.env.ADMIN_SECRET || ''

interface ClientRow {
  id: string
  company_name: string
  industry: string | null
  country: string
  created_at: string
  subscriptions: Array<{ tier: string; status: string; trial_ends_at: string | null }>
  leads: Array<{ id: string }>
  unread_messages?: number
}

async function getClients(): Promise<ClientRow[]> {
  if (!ADMIN_SECRET) return []
  try {
    const res = await fetch(`${API_URL}/admin-api/clients`, {
      headers: { 'x-admin-secret': ADMIN_SECRET },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json() as { data: ClientRow[] }
    return data.data ?? []
  } catch {
    return []
  }
}

function SubBadge({ tier, status }: { tier: string; status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    trialing: 'bg-blue-50 text-blue-700',
    past_due: 'bg-red-50 text-red-600',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${colors[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status} · {tier}
    </span>
  )
}

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">{clients.length} total</p>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No clients yet or admin secret not configured.</p>
          <p className="text-xs mt-1">Set ADMIN_SECRET env var on both Railway and Vercel.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Industry</th>
                <th className="px-5 py-3">Subscription</th>
                <th className="px-5 py-3 text-center">Leads</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map((client) => {
                const leadSub = client.subscriptions?.find((s) => s.status !== 'cancelled')
                const leadCount = client.leads?.length ?? 0
                return (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{client.company_name}</p>
                      <p className="text-xs text-gray-400">{client.country}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{client.industry ?? '—'}</td>
                    <td className="px-5 py-4">
                      {leadSub ? (
                        <SubBadge tier={leadSub.tier} status={leadSub.status} />
                      ) : (
                        <span className="text-gray-300 text-xs">No subscription</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-gray-600">
                        <TrendingUp className="w-3.5 h-3.5 text-brand-500" />
                        {leadCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {new Date(client.created_at).toLocaleDateString('en-ZA')}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
