
'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, CreditCard, ShieldCheck, XCircle, Coins, Plus, Minus, Building2 } from 'lucide-react'

interface Client {
  id: string; company_name: string; industry: string | null; country: string
  website: string | null; phone: string | null; created_at: string
  terms_accepted_at: string | null; terms_accepted_ip: string | null
  company_registration: string | null; vat_number: string | null
  credit_balance: number
}
interface Subscription { id: string; product: string; tier: string; status: string; amount_usd: number }
interface CreditTx {
  id: string; type: string; amount: number; note: string | null; reference: string | null; created_at: string
}

async function proxyGet(path: string) {
  const r = await fetch(`/api/proxy/admin/${path}`)
  return r.json()
}
async function proxyPost(path: string, body: object) {
  const r = await fetch(`/api/proxy/admin/${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.json()
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient]   = useState<Client | null>(null)
  const [subs, setSubs]       = useState<Subscription[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [txs, setTxs]         = useState<CreditTx[]>([])
  const [loading, setLoading] = useState(true)

  // Credit grant form
  const [grantAmt, setGrantAmt]   = useState('')
  const [grantType, setGrantType] = useState<'manual_grant' | 'refund'>('manual_grant')
  const [grantNote, setGrantNote] = useState('')
  const [granting, setGranting]   = useState(false)
  const [grantMsg, setGrantMsg]   = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const [clientRes, creditRes] = await Promise.all([
        proxyGet(`clients/${params.id}`),
        proxyGet(`clients/${params.id}/credits`),
      ])
      if (clientRes.success) {
        setClient(clientRes.data)
        setSubs(clientRes.data.subscriptions || [])
      }
      if (creditRes.success) {
        setBalance(creditRes.data.balance)
        setTxs(creditRes.data.transactions)
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseInt(grantAmt)
    if (!amt || isNaN(amt)) { setGrantMsg({ ok: false, text: 'Enter a valid amount' }); return }
    setGranting(true)
    setGrantMsg(null)
    const res = await proxyPost(`clients/${params.id}/credits`, {
      amount: amt,
      type: grantType,
      note: grantNote || undefined,
    })
    if (res.success) {
      setBalance(res.data.new_balance)
      setGrantMsg({ ok: true, text: `Done — new balance: ${res.data.new_balance} credits` })
      setGrantAmt('')
      setGrantNote('')
      // Refresh transactions
      const fresh = await proxyGet(`clients/${params.id}/credits`)
      if (fresh.success) setTxs(fresh.data.transactions)
    } else {
      setGrantMsg({ ok: false, text: res.error ?? 'Failed' })
    }
    setGranting(false)
  }

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
        <div className="ml-auto flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
          <Coins className="w-4 h-4 text-yellow-300" />
          <span className="text-sm font-semibold">{balance} credits</span>
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

        {/* Credit management */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><Coins className="w-4 h-4 text-yellow-500" />Credits</h3>
            <span className="text-2xl font-bold text-gray-900">{balance}</span>
          </div>

          {/* Grant / Refund form */}
          <form onSubmit={handleGrant} className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Grant or Adjust Credits</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount</label>
                <input type="number" min="1" value={grantAmt} onChange={e => setGrantAmt(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select value={grantType} onChange={e => setGrantType(e.target.value as 'manual_grant' | 'refund')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]">
                  <option value="manual_grant">Manual Grant (add)</option>
                  <option value="refund">Refund (add back)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
                <input type="text" value={grantNote} onChange={e => setGrantNote(e.target.value)}
                  placeholder="Reason / reference"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
              </div>
            </div>
            {grantMsg && (
              <p className={`text-sm ${grantMsg.ok ? 'text-green-600' : 'text-red-500'}`}>{grantMsg.text}</p>
            )}
            <button type="submit" disabled={granting}
              className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 transition-colors">
              {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Apply Credits
            </button>
          </form>

          {/* Transaction history */}
          {txs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Recent Transactions</p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {txs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium mr-2 ${
                        tx.amount > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {tx.amount > 0 ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {Math.abs(tx.amount)}
                      </span>
                      <span className="text-gray-600 capitalize">{tx.type.replace(/_/g, ' ')}</span>
                      {tx.note && <span className="text-gray-400 ml-1.5">· {tx.note}</span>}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-ZA', { dateStyle: 'medium' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700"><Building2 className="w-4 h-4 text-gray-400" />Client Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {([
              ['Company',  client.company_name],
              ['Country',  client.country],
              ['Industry', client.industry || '—'],
              ['Website',  client.website || '—'],
              ['Phone',    client.phone || '—'],
              ['Registration No.', client.company_registration || '—'],
              ['VAT Number', client.vat_number || '—'],
              ['Joined',   new Date(client.created_at).toLocaleDateString('en-ZA', { dateStyle: 'long' })],
            ] as [string, string][]).map(([label, val]) => (
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
