export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClientDocuments } from './ClientDocuments'
import { ClientMessages } from './ClientMessages'
import { ClientIcps } from './ClientIcps'
import { OrderFormManager } from './OrderFormManager'

const API_URL = process.env.API_URL || 'https://kindapi-production.up.railway.app'
const ADMIN_SECRET = process.env.ADMIN_SECRET || ''

async function adminFetch(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'x-admin-secret': ADMIN_SECRET },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

interface PageProps {
  params: { id: string }
  searchParams: { tab?: string }
}

export default async function ClientDetailPage({ params, searchParams }: PageProps) {
  const [clientRes, docsRes, messagesRes, orderFormRes] = await Promise.all([
    adminFetch(`/admin-api/clients/${params.id}`),
    adminFetch(`/admin-api/clients/${params.id}/documents`),
    adminFetch(`/admin-api/clients/${params.id}/messages`),
    adminFetch(`/admin-api/clients/${params.id}/order-form`),
  ])

  if (!clientRes?.data) notFound()

  const client = clientRes.data
  const docs = docsRes?.data ?? []
  const messages = messagesRes?.data ?? []
  const icps = client.icps ?? []
  const orderForm = orderFormRes?.data ?? null

  const tab = searchParams.tab ?? 'order-form'

  const orderFormLabel = orderForm
    ? orderForm.status === 'signed' ? 'Order Form ✓' : 'Order Form !'
    : 'Order Form'

  const TABS = [
    { key: 'order-form', label: orderFormLabel },
    { key: 'documents', label: `Documents (${docs.length})` },
    { key: 'messages', label: `Messages (${messages.length})` },
    { key: 'icps', label: `ICPs (${icps.length})` },
  ]

  const leadSub = client.subscriptions?.find((s: { status: string }) => s.status !== 'cancelled')

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/clients" className="hover:text-gray-700">Clients</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{client.company_name}</span>
      </div>

      {/* Client header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{client.company_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{client.industry ?? 'No industry'} · {client.country}</p>
            {client.website && (
              <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-500 hover:underline mt-1 block">
                {client.website}
              </a>
            )}
          </div>
          <div className="text-right text-sm space-y-1">
            {leadSub && (
              <div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                  leadSub.status === 'active' ? 'bg-green-50 text-green-700' :
                  leadSub.status === 'trialing' ? 'bg-blue-50 text-blue-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {leadSub.status} · {leadSub.tier}
                </span>
              </div>
            )}
            <p className="text-xs text-gray-400">
              Joined {new Date(client.created_at).toLocaleDateString('en-ZA')}
            </p>
            <p className="text-xs text-gray-400">{client.lead_count ?? 0} leads generated</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map(({ key, label }) => (
            <Link
              key={key}
              href={`/clients/${params.id}?tab=${key}`}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === 'order-form' && (
        <OrderFormManager clientId={params.id} initialForm={orderForm} />
      )}
      {tab === 'documents' && (
        <ClientDocuments clientId={params.id} initialDocs={docs} />
      )}
      {tab === 'messages' && (
        <ClientMessages clientId={params.id} initialMessages={messages} />
      )}
      {tab === 'icps' && (
        <ClientIcps clientId={params.id} icps={icps} />
      )}
    </div>
  )
}
