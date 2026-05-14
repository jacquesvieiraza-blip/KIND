
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Loader2, CreditCard, ShieldCheck, XCircle } from 'lucide-react'

interface Client {
  id: string; company_name: string; industry: string | null; country: string
  website: string | null; phone: string | null; created_at: string
  terms_accepted_at: string | null; terms_accepted_ip: string | null
}
interface Subscription { id: string; product: string; tier: string; status: string; amount_usd: number }

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null)
  const [subs, setSubs]     = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    Promise.all([
      db.from('clients').select('*').eq('id', params.id).single(),
      db.from('subscriptions').select('*').eq('client_id', params.id),
    ]).then(([clientRes, subsRes]) => {
      setClient(clientRes.data)
      setSubs(subsRes.data || [])
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0066FF]" /></div>
  if (!client) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Client not found</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#001f4d] text-white px-8 py-4 flex items-center gap-4">
        <a href="/clients" className="text-white/60 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /></a>
        <div>
          <h1 className="font-bold text-lg">{client.company_name}</h1>
          <p className="text-white/50 text-xs">{client.country}{client.industry ? ` · ${client.industry}` : ''}</p>
        </div>
      </header>

      <main className="px-8 py-8 max-w-4xl mx-auto space-y-6">

        {/* Current subscriptions */}
        {subs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" />Active Subscriptions</h3>
            <div className="space-y-2">
              {subs.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 capitalize">{s.product.replace(/_/g, ' ')} — {s.tier}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">${s.amount_usd}/mo</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'trialing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* T&C acceptance */}
        <div className={`rounded-xl p-5 flex items-start gap-3 ${client.terms_accepted_at ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
          {client.terms_accepted_at ? (
            <>
              <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 text-sm">Terms &amp; Conditions accepted</p>
                <p className="text-green-700 text-xs mt-0.5">
                  Accepted on {new Date(client.terms_accepted_at).toLocaleDateString('en-ZA', { dateStyle: 'long' })}
                  {client.terms_accepted_ip ? ` · IP: ${client.terms_accepted_ip}` : ''}
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-gray-500 text-sm">T&amp;Cs not yet accepted — client has not completed a purchase.</p>
            </>
          )}
        </div>

        {/* Client details */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold mb-3 text-sm text-gray-700">Client Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Company',  client.company_name],
              ['Country',  client.country],
              ['Industry', client.industry || '—'],
              ['Website',  client.website || '—'],
              ['Phone',    client.phone || '—'],
              ['Joined',   new Date(client.created_at).toLocaleDateString('en-ZA', { dateStyle: 'long' })],
            ].map(([label, val]) => (
              <div key={label}>
                <span className="text-gray-400 text-xs">{label}</span>
                <p className="text-gray-700 mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
