'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Coins, Zap, TrendingUp, Loader2, Check, ChevronDown, Shield } from 'lucide-react'

interface CreditTransaction {
  id: string
  type: string
  amount: number
  plan: string | null
  note: string | null
  created_at: string
}

const KIND_AI_BUNDLES = [
  { size: 10,  price: 12  },
  { size: 20,  price: 20  },
  { size: 40,  price: 38  },
  { size: 75,  price: 68  },
  { size: 100, price: 88  },
  { size: 200, price: 160 },
  { size: 500, price: 375 },
]

const FIGSY_BUNDLES = [
  { size: 10,  price: 35   },
  { size: 20,  price: 60   },
  { size: 40,  price: 110  },
  { size: 75,  price: 195  },
  { size: 100, price: 250  },
  { size: 200, price: 460  },
  { size: 500, price: 1100 },
]

function BundleCard({
  plan, label, tagline, bundles, accentClass, bgClass, initiating, termsAccepted, onBuy,
}: {
  plan: 'kind_ai' | 'figsy'
  label: string
  tagline: string
  bundles: { size: number; price: number }[]
  accentClass: string
  bgClass: string
  initiating: string | null
  termsAccepted: boolean
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
          disabled={initiating === key || !termsAccepted}
          title={!termsAccepted ? 'Please accept the terms below before purchasing' : undefined}
          className={`w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${accentClass}`}>
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
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [receiptTx, setReceiptTx] = useState<CreditTransaction | null>(null)
  const [autoTopup, setAutoTopup]         = useState({ enabled: false, threshold: 10, plan: 'kind_ai' as 'kind_ai' | 'figsy', bundle_size: 20 })
  const [savingTopup, setSavingTopup]     = useState(false)
  const [topupSaved, setTopupSaved]       = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const res = await api.get<{ data: { balance: number; transactions: CreditTransaction[] } }>('/credits', session.access_token)
        setBalance(res.data.balance)
        setTransactions(res.data.transactions)
      } catch { }
      try {
        const clientRes = await api.get<{ data: { auto_topup_enabled?: boolean; auto_topup_threshold?: number; auto_topup_plan?: string; auto_topup_bundle_size?: number } }>('/clients/me', session.access_token)
        if (clientRes.data) {
          setAutoTopup({
            enabled:     clientRes.data.auto_topup_enabled ?? false,
            threshold:   clientRes.data.auto_topup_threshold ?? 10,
            plan:        (clientRes.data.auto_topup_plan as 'kind_ai' | 'figsy') ?? 'kind_ai',
            bundle_size: clientRes.data.auto_topup_bundle_size ?? 20,
          })
        }
      } catch { }
      setLoading(false)
    }
    load()
  }, [])

  function printReceipt(tx: CreditTransaction) {
    const html = `<!DOCTYPE html><html><head><title>K.I.N.D Receipt</title><style>body{font-family:sans-serif;padding:40px;max-width:500px;margin:0 auto}h1{font-size:20px;font-weight:bold;margin-bottom:4px}.logo{color:#0066FF;font-weight:bold;font-size:18px;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px 0;border-bottom:1px solid #eee;font-size:14px}td:last-child{text-align:right;font-weight:500}.footer{font-size:12px;color:#888;margin-top:32px}@media print{button{display:none}}</style></head><body>
<div class="logo">⚡ K.I.N.D</div>
<h1>Credit Purchase Receipt</h1>
<p style="color:#666;font-size:14px">${new Date(tx.created_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}</p>
<table>
<tr><td>Description</td><td>${tx.note || 'Credit purchase'}</td></tr>
<tr><td>Credits added</td><td>+${tx.amount}</td></tr>
<tr><td>Plan</td><td>${tx.plan ? (tx.plan === 'kind_ai' ? 'K.I.N.D AI' : 'FIGSY') : '—'}</td></tr>
<tr><td>Transaction ID</td><td style="font-size:11px">${tx.id}</td></tr>
</table>
<div class="footer">K.I.N.D AI · get-kind.com · hello@get-kind.com<br>Questions? Reply to this email.</div>
<br><button onclick="window.print()" style="margin-top:16px;padding:10px 20px;background:#0066FF;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px">Print / Save as PDF</button>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  async function saveAutoTopup() {
    setSavingTopup(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      await api.patch('/clients/me/auto-topup', {
        auto_topup_enabled:     autoTopup.enabled,
        auto_topup_threshold:   autoTopup.threshold,
        auto_topup_plan:        autoTopup.plan,
        auto_topup_bundle_size: autoTopup.bundle_size,
      }, session.access_token)
      setTopupSaved(true)
      setTimeout(() => setTopupSaved(false), 3000)
    } catch (err) { console.error(err) }
    setSavingTopup(false)
  }

  async function handleBuy(plan: 'kind_ai' | 'figsy', bundle_size: number) {
    const key = `${plan}_${bundle_size}`
    setInitiating(key)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await api.post<{ data: { authorization_url: string } }>('/credits/topup', { plan, bundle_size, terms_accepted: termsAccepted }, session.access_token)
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

      {/* Terms acceptance — must tick before any purchase */}
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 shrink-0"
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            I have read and agree to the{' '}
            <a href="https://get-kind.com/terms" target="_blank" rel="noopener noreferrer"
               className="text-[#0066FF] hover:underline font-medium">Terms of Service</a>
            {' '}and{' '}
            <a href="https://get-kind.com/privacy" target="_blank" rel="noopener noreferrer"
               className="text-[#0066FF] hover:underline font-medium">Privacy Policy</a>.
            By completing a purchase I confirm I am authorised to act on behalf of my organisation.
            My acceptance will be recorded with a timestamp and is legally binding under the Electronic
            Communications and Transactions Act (ECTA), No. 25 of 2002.
          </span>
        </label>
        {termsAccepted && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            Terms accepted — you can now complete your purchase.
          </div>
        )}
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
            termsAccepted={termsAccepted}
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
            termsAccepted={termsAccepted}
            onBuy={handleBuy}
          />
        </div>
      </div>

      {/* Auto top-up settings */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Auto top-up</h2>
            <p className="text-xs text-gray-400 mt-0.5">Automatically recharge when balance drops below your threshold. Requires a saved card from a previous purchase.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={autoTopup.enabled} onChange={e => setAutoTopup(p => ({ ...p, enabled: e.target.checked }))} className="sr-only peer" />
            <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-[#0066FF] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4"></div>
          </label>
        </div>
        {autoTopup.enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Recharge when below</p>
                <select value={autoTopup.threshold} onChange={e => setAutoTopup(p => ({ ...p, threshold: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                  {[5, 10, 20, 50].map(v => <option key={v} value={v}>{v} credits</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Plan</p>
                <select value={autoTopup.plan} onChange={e => setAutoTopup(p => ({ ...p, plan: e.target.value as 'kind_ai' | 'figsy' }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="kind_ai">K.I.N.D AI</option>
                  <option value="figsy">FIGSY</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Recharge amount</p>
                <select value={autoTopup.bundle_size} onChange={e => setAutoTopup(p => ({ ...p, bundle_size: Number(e.target.value) }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                  {[10, 20, 40, 75, 100, 200].map(v => <option key={v} value={v}>{v} credits</option>)}
                </select>
              </div>
            </div>
            <button onClick={saveAutoTopup} disabled={savingTopup} className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              {savingTopup ? <Loader2 className="w-4 h-4 animate-spin" /> : topupSaved ? <Check className="w-4 h-4" /> : null}
              {topupSaved ? 'Saved!' : 'Save settings'}
            </button>
          </div>
        )}
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
                <div className="flex items-center">
                  <span className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                  {tx.type === 'purchase' && (
                    <button onClick={() => printReceipt(tx)} className="ml-3 text-xs text-blue-500 hover:underline shrink-0">Receipt</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
