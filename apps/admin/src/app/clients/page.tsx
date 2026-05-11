import { createClient } from '@supabase/supabase-js'
import { Users, FileText, CreditCard, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'

interface OrderForm { status: string; signed_at: string | null }
interface Subscription { status: string; product: string }
interface Client {
  id: string
  company_name: string
  country: string
  industry: string | null
  created_at: string
  order_forms: OrderForm[]
  subscriptions: Subscription[]
}

async function getClients(): Promise<Client[]> {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const { data } = await db
    .from('clients')
    .select('*, order_forms(*), subscriptions(*)')
    .order('created_at', { ascending: false })
  return (data || []) as Client[]
}

function clientStatus(client: Client): { label: string; color: string; icon: React.ReactNode } {
  const of = client.order_forms?.[0]
  const subs = client.subscriptions || []
  const active = subs.some(s => s.status === 'active')
  const trial  = subs.some(s => s.status === 'trialing')

  if (active)                         return { label: 'Active',            color: 'bg-green-100 text-green-700',  icon: <CheckCircle className="w-3.5 h-3.5" /> }
  if (trial)                          return { label: 'Trial',             color: 'bg-blue-100 text-blue-700',    icon: <Clock className="w-3.5 h-3.5" /> }
  if (of?.status === 'signed')        return { label: 'Signed — unpaid',   color: 'bg-amber-100 text-amber-700',  icon: <CreditCard className="w-3.5 h-3.5" /> }
  if (of?.status === 'sent')          return { label: 'Awaiting signature', color: 'bg-orange-100 text-orange-700', icon: <FileText className="w-3.5 h-3.5" /> }
  return                               { label: 'No order form',           color: 'bg-gray-100 text-gray-500',    icon: <XCircle className="w-3.5 h-3.5" /> }
}

export default async function ClientsPage() {
  const clients = await getClients()

  const counts = {
    active:    clients.filter(c => c.subscriptions?.some(s => s.status === 'active')).length,
    trial:     clients.filter(c => c.subscriptions?.some(s => s.status === 'trialing')).length,
    unsigned:  clients.filter(c => c.order_forms?.[0]?.status === 'sent').length,
    noForm:    clients.filter(c => !c.order_forms?.length).length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#001f4d] text-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">K.I.N.D Admin</h1>
          <p className="text-white/50 text-xs">Clients</p>
        </div>
        <div className="flex items-center gap-6">
          <a href="/" className="text-xs text-white/60 hover:text-white">← Dashboard</a>
          <a href="/terms-library" className="text-xs text-white/60 hover:text-white">Terms Library</a>
          <a href="/roadmap" className="text-xs text-white/60 hover:text-white">Roadmap →</a>
        </div>
      </header>

      <main className="px-8 py-8 max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">All Clients</h2>
          <p className="text-gray-500 text-sm mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Active',             value: counts.active,   color: 'text-green-600' },
            { label: 'On Trial',           value: counts.trial,    color: 'text-blue-600' },
            { label: 'Awaiting signature', value: counts.unsigned, color: 'text-orange-600' },
            { label: 'No order form',      value: counts.noForm,   color: 'text-gray-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Client table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {clients.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No clients yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Company', 'Country', 'Status', 'Order Form', 'Active Products', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clients.map(client => {
                  const st = clientStatus(client)
                  const of = client.order_forms?.[0]
                  const activeProducts = (client.subscriptions || []).filter(s => s.status === 'active' || s.status === 'trialing')

                  return (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
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
                        {of ? (
                          <div>
                            <span className={`text-xs font-medium ${of.status === 'signed' ? 'text-green-600' : of.status === 'sent' ? 'text-orange-600' : 'text-gray-400'}`}>
                              {of.status === 'signed' ? `✓ Signed ${of.signed_at ? new Date(of.signed_at).toLocaleDateString('en-ZA') : ''}` : of.status === 'sent' ? '⏳ Awaiting signature' : of.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not sent</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {activeProducts.length > 0
                          ? activeProducts.map(s => <span key={s.product} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mr-1">{s.product.replace('_', ' ')}</span>)
                          : <span className="text-xs text-gray-400">None</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/clients/${client.id}`}
                          className="text-xs text-[#0066FF] hover:underline font-medium">
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
      </main>
    </div>
  )
}
