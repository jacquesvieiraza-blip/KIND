'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Coins, Zap, TrendingUp, Loader2, Check, ChevronDown, Shield, CreditCard } from 'lucide-react'

interface CreditTransaction {
  id: string
  type: string
  amount: number
  plan: string | null
  note: string | null
  created_at: string
}

const KIND_AI_BUNDLES = [
  { size: 10,  price: 10  },
  { size: 20,  price: 20  },
  { size: 40,  price: 40  },
  { size: 75,  price: 75  },
  { size: 100, price: 100 },
  { size: 200, price: 200 },
  { size: 500, price: 500 },
]

const FIGSY_BUNDLES = [
  { size: 10,  price: 30   },
  { size: 20,  price: 60   },
  { size: 40,  price: 120  },
  { size: 75,  price: 225  },
  { size: 100, price: 300  },
  { size: 200, price: 600  },
  { size: 500, price: 1500 },
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
            <span>Billed in USD</span>
            <span>Secure payment</span>
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

// Stripe credit bundles — 3 tiers each
const STRIPE_LEADGEN_BUNDLES = [
  { credits: 20,  priceUsd: 20,  label: '20 credits — $20',  creditType: 'lead_gen' as const, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_20  || '' },
  { credits: 40,  priceUsd: 40,  label: '40 credits — $40',  creditType: 'lead_gen' as const, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_40  || '' },
  { credits: 100, priceUsd: 100, label: '100 credits — $100', creditType: 'lead_gen' as const, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_100 || '' },
]
const STRIPE_FIGSY_BUNDLES = [
  { credits: 20,  priceUsd: 60,  label: '20 outreach credits — $60',  creditType: 'figsy' as const, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FIGSY_20  || '' },
  { credits: 40,  priceUsd: 120, label: '40 outreach credits — $120', creditType: 'figsy' as const, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FIGSY_40  || '' },
  { credits: 100, priceUsd: 300, label: '100 outreach credits — $300', creditType: 'figsy' as const, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FIGSY_100 || '' },
]

export default function BillingPage() {
  const supabase = createClient()
  const [balance, setBalance]           = useState<number | null>(null)
  const [figsyBalance, setFigsyBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [initiating, setInitiating]     = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [receiptTx, setReceiptTx] = useState<CreditTransaction | null>(null)
  const [autoTopup, setAutoTopup]         = useState({ enabled: false, threshold: 10, plan: 'kind_ai' as 'kind_ai' | 'figsy', bundle_size: 20 })
  const [savingTopup, setSavingTopup]     = useState(false)
  const [topupSaved, setTopupSaved]       = useState(false)
  const [stripeConfigured, setStripeConfigured] = useState(false)
  const [stripeInitiating, setStripeInitiating] = useState<string | null>(null)
  const [buyError, setBuyError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [initiatingSubscription, setInitiatingSubscription] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const res = await api.get<{ data: { balance: number; figsy_credits_remaining: number; transactions: CreditTransaction[] } }>('/credits', session.access_token)
        setBalance(res.data.balance)
        setFigsyBalance(res.data.figsy_credits_remaining ?? 0)
        setTransactions(res.data.transactions)
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load billing data — please refresh.')
      }
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
      try {
        const stripeRes = await api.get<{ configured: boolean }>('/stripe/status', session.access_token)
        setStripeConfigured(stripeRes.configured ?? false)
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
    } catch (err) { console.error(err); setBuyError('Failed to save auto-topup settings') }
    setSavingTopup(false)
  }

  async function handleBuy(plan: 'kind_ai' | 'figsy', bundle_size: number) {
    const key = `${plan}_${bundle_size}`
    setInitiating(key)
    setBuyError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setInitiating(null); return }
    try {
      const res = await api.post<{ data: { authorization_url: string } }>('/credits/topup', { plan, bundle_size, terms_accepted: termsAccepted }, session.access_token)
      if (res.data?.authorization_url) {
        window.location.href = res.data.authorization_url
      } else {
        setBuyError('Payment gateway did not return a redirect URL. Please try again or contact support.')
      }
    } catch (err) {
      console.error(err)
      setBuyError(err instanceof Error ? err.message : 'Payment initiation failed. Please try again or email hello@get-kind.com.')
    }
    setInitiating(null)
  }

  async function handleStripeBuy(priceId: string, credits: number, creditType: 'lead_gen' | 'figsy') {
    const key = `stripe_${creditType}_${credits}`
    setStripeInitiating(key)
    setBuyError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setStripeInitiating(null); return }
    try {
      const res = await api.post<{ url?: string; error?: string }>('/stripe/checkout', { priceId, credits, creditType }, session.access_token)
      if (res.url) {
        window.location.href = res.url
      } else {
        setBuyError('Checkout session could not be created. Please contact hello@get-kind.com.')
      }
    } catch (err) {
      console.error('[Stripe] checkout error:', err)
      setBuyError('Stripe checkout failed. Please try again or email hello@get-kind.com.')
    }
    setStripeInitiating(null)
  }

  async function handleSubscribe(product: 'virtual_assistant' | 'chatbot') {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setInitiatingSubscription(product)
    try {
      const res = await api.post<{ success: boolean; authorization_url?: string; message?: string }>(
        '/subscriptions/initiate',
        { product, tier: 'starter', billing_interval: 'monthly' },
        session.access_token
      )
      if (res.authorization_url) {
        window.location.href = res.authorization_url
      } else if (res.message) {
        alert(res.message)
      }
    } catch (err) {
      alert('Unable to start subscription. Please try again or contact support.')
    } finally {
      setInitiatingSubscription(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
    </div>
  )

  if (loadError) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-600 font-medium mb-2">Could not load billing data</p>
        <p className="text-sm text-gray-500 mb-4">{loadError}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 transition-colors">
          Retry
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Credits</h1>
        <p className="text-gray-500 text-sm mt-1">Buy credit bundles. 1 Lead Gen credit = 1 qualified lead found. 1 FIGSY credit = 1 lead enrolled in outreach.</p>
      </div>

      {/* Balance cards — Lead Gen + FIGSY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-[#001f4d] to-[#003080] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/60 text-sm">Lead Gen credits</p>
            <Coins className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-4xl font-bold">{balance ?? 0}</p>
          <p className="text-white/40 text-xs mt-2">1 credit = 1 qualified lead found via ICP</p>
        </div>
        <div className="bg-gradient-to-r from-[#1a0040] to-[#2d0070] rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/60 text-sm">FIGSY outreach credits</p>
            <Zap className="w-5 h-5 text-purple-300" />
          </div>
          <p className="text-4xl font-bold">{figsyBalance ?? 0}</p>
          <p className="text-white/40 text-xs mt-2">1 credit = 1 lead enrolled in email campaign</p>
        </div>
      </div>

      {/* How credits work */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Zap className="w-4 h-4 text-blue-500" />, title: 'ICP runs', sub: '1 credit per lead found', bg: 'bg-blue-50' },
          { icon: <TrendingUp className="w-4 h-4 text-indigo-500" />, title: 'FIGSY enrolled', sub: '1 outreach credit per lead', bg: 'bg-indigo-50' },
          { icon: <Check className="w-4 h-4 text-green-500" />, title: 'Milla & Vida', sub: 'Flat $49/$29/mo', bg: 'bg-green-50' },
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

      {/* Payment error banner */}
      {buyError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          {buyError}
        </div>
      )}

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

      {/* Stripe — USD billing */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-1">
            <CreditCard className="w-5 h-5 text-[#635bff]" />
            <h2 className="text-lg font-semibold text-gray-900">Pay in USD / GBP</h2>
          </div>
          <p className="text-sm text-gray-400 mb-5">
            Paying from outside South Africa? Use a card below — billed in USD via Stripe, no exchange rate surprises.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Lead Gen via Stripe */}
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <div className="bg-[#0066FF] px-5 py-4 text-white">
                <p className="font-semibold">K.I.N.D AI — Lead Gen</p>
                <p className="text-white/60 text-xs mt-0.5">Sourcing + scoring · USD billing</p>
              </div>
              <div className="bg-white px-5 py-5 space-y-3">
                {STRIPE_LEADGEN_BUNDLES.map(b => {
                  const key = `stripe_lead_gen_${b.credits}`
                  return (
                    <button
                      key={b.credits}
                      onClick={() => handleStripeBuy(b.priceId, b.credits, b.creditType)}
                      disabled={stripeInitiating === key || !b.priceId}
                      className="w-full flex items-center justify-between text-sm font-medium px-4 py-3 rounded-xl border border-gray-200 hover:border-[#0066FF] hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <span className="text-gray-700">{b.credits} credits</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">${b.priceUsd}</span>
                        {stripeInitiating === key
                          ? <Loader2 className="w-4 h-4 animate-spin text-[#0066FF]" />
                          : <CreditCard className="w-4 h-4 text-gray-400" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            {/* FIGSY via Stripe */}
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <div className="bg-[#001f4d] px-5 py-4 text-white">
                <p className="font-semibold">FIGSY Advanced</p>
                <p className="text-white/60 text-xs mt-0.5">Full outreach SDR · USD billing</p>
              </div>
              <div className="bg-white px-5 py-5 space-y-3">
                {STRIPE_FIGSY_BUNDLES.map(b => {
                  const key = `stripe_figsy_${b.credits}`
                  return (
                    <button
                      key={b.credits}
                      onClick={() => handleStripeBuy(b.priceId, b.credits, b.creditType)}
                      disabled={stripeInitiating === key || !b.priceId}
                      className="w-full flex items-center justify-between text-sm font-medium px-4 py-3 rounded-xl border border-gray-200 hover:border-[#001f4d] hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <span className="text-gray-700">{b.credits} outreach credits</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">${b.priceUsd}</span>
                        {stripeInitiating === key
                          ? <Loader2 className="w-4 h-4 animate-spin text-[#001f4d]" />
                          : <CreditCard className="w-4 h-4 text-gray-400" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">
            Powered by Stripe · Secure card processing · Credits appear immediately after payment
          </p>
        </div>

      {/* ── AI Assistants ─────────────────────────────────────────────────────────── */}
      <div id="assistants" className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-semibold text-gray-900">AI Team Members</h2>
          <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">Monthly subscription</span>
        </div>
        <p className="text-sm text-gray-400 mb-5">Unlock Milla and Vida. Billed monthly. Cancel anytime. Activates the moment payment clears.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Milla */}
          <div id="milla" className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-blue-600 px-5 py-4 text-white">
              <p className="font-semibold">Milla — VA</p>
              <p className="text-white/60 text-xs mt-0.5">AI Virtual Assistant</p>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
              <div className="space-y-2">
                {['Document Q&A', 'Drafts in your tone', '24/7 availability'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </div>
                ))}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">$49</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <button
                onClick={() => handleSubscribe('virtual_assistant')}
                disabled={!!initiatingSubscription || !termsAccepted}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                {initiatingSubscription === 'virtual_assistant' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {initiatingSubscription === 'virtual_assistant' ? 'Redirecting…' : 'Unlock Milla'}
              </button>
            </div>
          </div>

          {/* Vida */}
          <div id="vida" className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="bg-purple-600 px-5 py-4 text-white">
              <p className="font-semibold">Vida — Chatbot</p>
              <p className="text-white/60 text-xs mt-0.5">AI Chatbot Agent</p>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
              <div className="space-y-2">
                {['Qualifies leads 24/7', 'Website embed', 'Hot lead alerts'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-3 h-3 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </div>
                ))}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">$29</span>
                <span className="text-gray-400 text-sm">/month</span>
              </div>
              <button
                onClick={() => handleSubscribe('chatbot')}
                disabled={!!initiatingSubscription || !termsAccepted}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                {initiatingSubscription === 'chatbot' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {initiatingSubscription === 'chatbot' ? 'Redirecting…' : 'Unlock Vida'}
              </button>
            </div>
          </div>

          {/* Bundle */}
          <div className="rounded-xl border-2 border-blue-200 overflow-hidden relative">
            <div className="absolute top-3 right-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">BEST VALUE</div>
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 px-5 py-4 text-white">
              <p className="font-semibold">Milla + Vida Bundle</p>
              <p className="text-white/60 text-xs mt-0.5">Both AI assistants</p>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
              <div className="space-y-2">
                {['Everything in Milla', 'Everything in Vida', 'Save $9/month'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs text-gray-500">
                    <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </div>
                ))}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">$69</span>
                <span className="text-gray-400 text-sm">/month</span>
                <span className="text-xs text-gray-400 line-through ml-1">$78</span>
              </div>
              <button
                onClick={() => { handleSubscribe('virtual_assistant'); handleSubscribe('chatbot') }}
                disabled={!!initiatingSubscription || !termsAccepted}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                Unlock Both
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4 text-center">Subscriptions managed via Paystack · Cancel anytime from this page</p>
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
