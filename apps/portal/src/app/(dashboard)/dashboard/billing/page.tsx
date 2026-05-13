'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Coins, Zap, TrendingUp, Loader2, Check, ChevronDown } from 'lucide-react'

interface CreditTransaction {
  id: string
  type: string
  amount: number
  plan: string | null
  note: string | null
  created_at: string
}

const KIND_AI_BUNDLES  = [{ size: 20, price: 20 }, { size: 40, price: 40 }, { size: 100, price: 100 }]
const FIGSY_BUNDLES    = [{ size: 20, price: 60 }, { size: 40, price: 120 }, { size: 100, price: 300 }]

function BundleCard({
  plan, label, tagline, bundles, accentClass, bgClass, initiating, onBuy,
}: {
  plan: 'kind_ai' | 'figsy'
  label: string
  tagline: string
  bundles: { size: number; price: number }[]
  accentClass: string
  bgClass: string
  initiating: string | null
  onBuy: (plan: 'kind_ai' | 'figsy', size: number) => void
}) {
  const [selected, setSelected] = useState(bundles[0].size)
  const bundle = bundles.find(b => b.size === selected)!
  const key = `${plan}_${selected}`

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-100`}>
      <div className={`${bgClass} px-5 py-4 text-white`}>
        <p className="font-semibold">{label}</p>
        <p className="text-white/60 text-xs mt-0.5">{tagline}</p>
      </div>
      <div className="bg-white px-5 py-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Bundle size</p>
          <div className="relative">
            <select
              value={selected}
              onChange={e => setSelected(Number(e.target.value))}
              className="w-full appearance-none border border-gray-200 rounded-lg px-4 py-2.5 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              {bundles.map(b => (
                <option key={b.size} value={b.size}>
                  {b.size} credits — ${b.price} (${(b.price / b.size).toFixed(2)}/credit)
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Credits</span><span className="font-semibold text-gray-900">{selected}</span>
          </div>
          <div className="flex justify-between">
            <span>Price</span><span className="font-semibold text-gray-900">${bundle.price} USD</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400 pt-1 border-t border-gray-200">
            <span>Billed in ZAR at current rate</span>
            <span>≈ R{(bundle.price * 19).toLocaleString()}</span>
          </div>
        </div>

        <button
          onClick={() => onBuy(plan, selected)}
          disabled={initiating === key}
          className={`w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60 ${accentClass}`}>
          {initiating === key
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Coins className="w-4 h-4" />}
          {initiating === key ? 'Redirecting…' : `Buy ${selected} credits`}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Credits never expire · No refunds on spent credits
        </p>
      </div>
    </div>
  )
}

export default function BillingPage() {
  const supabase = createClient()
  const [balance, setBalance]           = useState<number | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [initiating, setInitiating]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const res = await api.get<{ data: { balance: number; transactions: CreditTransaction[] } }>('/credits', session.access_token)
        setBalance(res.data.balance)
        setTransactions(res.data.transactions)
      } catch { }
      setLoading(false)
    }
    load()
  }, [])

  async function handleBuy(plan: 'kind_ai' | 'figsy', bundle_size: number) {
    const key = `${plan}_${bundle_size}`
    setInitiating(key)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await api.post<{ data: { authorization_url: string } }>('/credits/topup', { plan, bundle_size }, session.access_token)
      window.location.href = res.data.authorization_url
    } catch (err) { console.error(err) }
    setInitiating(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
    </div>
  )

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Credits</h1>
        <p className="text-gray-500 text-sm mt-1">Buy credit bundles. 1 credit = 1 qualified lead reply.</p>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-r from-[#001f4d] to-[#003080] rounded-xl p-6 text-white flex items-center justify-between">
        <div>
          <p className="text-white/60 text-sm mb-1">Current balance</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-bold">{balance ?? 0}</p>
            <p className="text-white/60 mb-1">credits</p>
          </div>
          <p className="text-white/40 text-xs mt-1">Credits are consumed only when a lead replies positively</p>
        </div>
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
          <Coins className="w-8 h-8 text-yellow-400" />
        </div>
      </div>

      {/* How credits work */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Zap className="w-4 h-4 text-blue-500" />, title: 'Lead found', sub: 'No credit used', bg: 'bg-blue-50' },
          { icon: <TrendingUp className="w-4 h-4 text-indigo-500" />, title: 'Outreach sent', sub: 'No credit used', bg: 'bg-indigo-50' },
          { icon: <Check className="w-4 h-4 text-green-500" />, title: 'Positive reply', sub: '1 credit consumed', bg: 'bg-green-50' },
        ].map(({ icon, title, sub, bg }) => (
          <div key={title} className="bg-white border border-gray-100 rounded-xl p-4 text-center">
            <div className={`w-8 h-8 ${bg} rounded-full flex items-center justify-center mx-auto mb-2`}>{icon}</div>
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Bundle cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top up credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <BundleCard
            plan="kind_ai"
            label="K.I.N.D AI"
            tagline="Lead Gen — sourcing + scoring"
            bundles={KIND_AI_BUNDLES}
            bgClass="bg-[#0066FF]"
            accentClass="bg-brand-500 hover:bg-brand-600 text-white"
            initiating={initiating}
            onBuy={handleBuy}
          />
          <BundleCard
            plan="figsy"
            label="FIGSY Advanced"
            tagline="Full outreach — sourcing + email SDR"
            bundles={FIGSY_BUNDLES}
            bgClass="bg-[#001f4d]"
            accentClass="bg-[#001f4d] hover:bg-[#002a6e] text-white"
            initiating={initiating}
            onBuy={handleBuy}
          />
        </div>
      </div>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Credit history</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {transactions.map((tx, i) => (
              <div key={tx.id} className={`flex items-center justify-between px-5 py-3.5 text-sm ${i < transactions.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div>
                  <p className="font-medium text-gray-800">{tx.note || tx.type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(tx.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</p>
                </div>
                <span className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
