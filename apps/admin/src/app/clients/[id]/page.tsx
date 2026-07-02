'use client'

import { useState, useEffect } from 'react'
import { Loader2, CreditCard, ShieldCheck, XCircle, Coins, Plus, Minus, Building2, Zap, Target } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string; company_name: string; industry: string | null; country: string
  website: string | null; phone: string | null; created_at: string
  terms_accepted_at: string | null; terms_accepted_ip: string | null
  company_registration: string | null; vat_number: string | null
  credit_balance: number
}
interface Subscription { id: string; product: string; tier: string; status: string; amount_zar: number }
interface CreditTx {
  id: string; type: string; amount: number; note: string | null; reference: string | null; created_at: string
}
interface FigsyCampaign {
  id: string; name: string; status: string; enrolled_count?: number; created_at: string
}
interface ICP {
  id: string; name: string; last_run_at: string | null; created_at: string
}
interface Lead {
  id: string; score: number | null; first_name: string | null; last_name: string | null
  company_name: string | null; created_at: string
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
  const [campaigns, setCampaigns] = useState<FigsyCampaign[]>([])
  const [icps, setIcps]       = useState<ICP[]>([])
  const [leads, setLeads]     = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  // Credit grant form
  const [grantAmt, setGrantAmt]   = useState('')
  const [grantType, setGrantType] = useState<'manual_grant' | 'refund'>('manual_grant')
  const [grantNote, setGrantNote] = useState('')
  const [granting, setGranting]   = useState(false)
  const [grantMsg, setGrantMsg]   = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const [clientRes, creditRes, campaignsRes, icpsRes, leadsRes] = await Promise.all([
        proxyGet(`clients/${params.id}`),
        proxyGet(`clients/${params.id}/credits`),
        fetch(`/api/proxy/figsy/campaigns?client_id=${params.id}`).then(r => r.json()),
        fetch(`/api/proxy/icps?client_id=${params.id}`).then(r => r.json()),
        fetch(`/api/proxy/leads?client_id=${params.id}&limit=50`).then(r => r.json()),
      ])
      if (clientRes.success) {
        setClient(clientRes.data)
        setSubs(clientRes.data.subscriptions || [])
      }
      if (creditRes.success) {
        setBalance(creditRes.data.balance)
        setTxs(creditRes.data.transactions)
      }
      if (campaignsRes.success) {
        setCampaigns(campaignsRes.data || [])
      }
      if (icpsRes.success) {
        setIcps(icpsRes.data || [])
      }
      if (leadsRes.success) {
        setLeads(leadsRes.data || [])
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
      amount: amt, type: grantType, note: grantNote || undefined,
    })
    if (res.success) {
      setBalance(res.data.new_balance)
      setGrantMsg({ ok: true, text: `Done — new balance: ${res.data.new_balance} credits` })
      setGrantAmt('')
      setGrantNote('')
      const fresh = await proxyGet(`clients/${params.id}/credits`)
      if (fresh.success) setTxs(fresh.data.transactions)
    } else {
      setGrantMsg({ ok: false, text: res.error ?? 'Failed' })
    }
    setGranting(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
    </div>
  )
  if (!client) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <p className="text-gray-400">Client not found</p>
    </div>
  )

  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= thisMonth).length
  const topLead = leads.filter(l => l.score != null).sort((a, b) => (b.score || 0) - (a.score || 0))[0]
  const activeCampaigns = campaigns.filter(c => c.status === 'active')

  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* Back link */}
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
        ← All Clients
      </Link>

      {/* Client header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.company_name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {client.country}{client.industry ? ` · ${client.industry}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-2 rounded-xl">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-gray-900 font-semibold">{balance}</span>
          <span className="text-gray-400 text-sm">credits</span>
        </div>
      </div>

      {/* Subscriptions */}
      {subs.length > 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-400" />Active Subscriptions
          </h3>
          <div className="space-y-2">
            {subs.map(s => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 capitalize">{s.product.replace(/_/g, ' ')} — {s.tier}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">R{s.amount_zar}/mo</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    s.status === 'active'
                      ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
                      : s.status === 'trialing'
                      ? 'bg-blue-400/10 border-blue-400/20 text-blue-400'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leads summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Leads</p>
          <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">This Month</p>
          <p className="text-2xl font-bold text-gray-900">{leadsThisMonth}</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Top Lead</p>
          {topLead ? (
            <div>
              <p className="text-gray-900 font-medium text-sm">
                {[topLead.first_name, topLead.last_name].filter(Boolean).join(' ') || 'Unknown'}
              </p>
              {topLead.company_name && <p className="text-gray-400 text-xs">{topLead.company_name}</p>}
              <p className="text-emerald-400 text-xs mt-0.5">Score: {topLead.score}</p>
            </div>
          ) : <p className="text-gray-400 text-sm">—</p>}
        </div>
      </div>

      {/* Credit management */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />Credits
          </h3>
          <span className="text-2xl font-bold text-gray-900">{balance}</span>
        </div>

        {/* Grant form */}
        <form onSubmit={handleGrant} className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Grant or Adjust Credits</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Amount</label>
              <input type="number" min="1" value={grantAmt} onChange={e => setGrantAmt(e.target.value)}
                placeholder="e.g. 100"
                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] placeholder:text-gray-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select value={grantType} onChange={e => setGrantType(e.target.value as 'manual_grant' | 'refund')}
                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED]">
                <option value="manual_grant">Manual Grant (add)</option>
                <option value="refund">Refund (add back)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Note (optional)</label>
              <input type="text" value={grantNote} onChange={e => setGrantNote(e.target.value)}
                placeholder="Reason / reference"
                className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#7C3AED] placeholder:text-gray-300" />
            </div>
          </div>
          {grantMsg && (
            <p className={`text-sm ${grantMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{grantMsg.text}</p>
          )}
          <button type="submit" disabled={granting}
            className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 transition-colors">
            {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Apply Credits
          </button>
        </form>

        {/* Transaction history */}
        {txs.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Recent Transactions</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {txs.map(tx => (
                <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                  <div>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium mr-2 ${
                      tx.amount > 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'
                    }`}>
                      {tx.amount > 0 ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {Math.abs(tx.amount)}
                    </span>
                    <span className="text-gray-500 capitalize">{tx.type.replace(/_/g, ' ')}</span>
                    {tx.note && <span className="text-gray-400 ml-1.5">· {tx.note}</span>}
                  </div>
                  <span className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('en-ZA', { dateStyle: 'medium' })}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FIGSY Campaigns */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-gray-400" />FIGSY Campaigns
        </h3>
        {activeCampaigns.length > 0 ? (
          <div className="space-y-2">
            {activeCampaigns.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                <div>
                  <p className="text-gray-900 text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Started {new Date(c.created_at).toLocaleDateString('en-ZA', { dateStyle: 'medium' })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {c.enrolled_count != null && (
                    <span className="text-xs text-gray-400">{c.enrolled_count} enrolled</span>
                  )}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-400/10 border border-emerald-400/20 text-emerald-400">
                    Active
                  </span>
                </div>
              </div>
            ))}
            {campaigns.filter(c => c.status !== 'active').length > 0 && (
              <p className="text-xs text-gray-400 pt-1">
                +{campaigns.filter(c => c.status !== 'active').length} inactive campaign(s)
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No active FIGSY campaigns</p>
        )}
      </div>

      {/* ICPs */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-400" />Ideal Customer Profiles
        </h3>
        {icps.length > 0 ? (
          <div className="space-y-2">
            {icps.map(icp => (
              <div key={icp.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                <div>
                  <p className="text-gray-900 text-sm font-medium">{icp.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {icp.last_run_at
                      ? `Last run ${new Date(icp.last_run_at).toLocaleDateString('en-ZA', { dateStyle: 'medium' })}`
                      : 'Never run'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No ICPs configured</p>
        )}
      </div>

      {/* T&C acceptance */}
      <div className={`rounded-xl p-5 flex items-start gap-3 ${
        client.terms_accepted_at
          ? 'bg-emerald-400/[0.06] border border-emerald-400/20'
          : 'bg-gray-50 border border-gray-100'
      }`}>
        {client.terms_accepted_at ? (
          <>
            <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-400 text-sm">Terms &amp; Conditions accepted</p>
              <p className="text-emerald-400/70 text-xs mt-0.5">
                Accepted on {new Date(client.terms_accepted_at).toLocaleDateString('en-ZA', { dateStyle: 'long' })}
                {client.terms_accepted_ip ? ` · IP: ${client.terms_accepted_ip}` : ''}
              </p>
            </div>
          </>
        ) : (
          <>
            <XCircle className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-gray-400 text-sm">T&amp;Cs not yet accepted — client has not completed a purchase.</p>
          </>
        )}
      </div>

      {/* Client details */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <Building2 className="w-4 h-4 text-gray-400" />Client Details
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
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
              <p className="text-gray-800 mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
