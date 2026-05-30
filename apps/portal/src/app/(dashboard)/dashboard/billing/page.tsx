'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Coins, Zap, TrendingUp, Loader2, Check, ChevronDown,
  Shield, CreditCard, Bot, MessageSquare, CheckCircle,
} from 'lucide-react'

// ── Sparkline chart (pure SVG, no library) ───────────────────────────────────
function SparklineChart({
  data,
  color = '#7C3AED',
  height = 56,
}: {
  data: { label: string; value: number }[]
  color?: string
  height?: number
}) {
  if (data.length < 2) return null
  const W = 400
  const H = height
  const pad = 4
  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: H - pad - ((d.value - min) / range) * (H - pad * 2),
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${(W - pad).toFixed(1)},${H} L${pad},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
    </svg>
  )
}

interface CreditTransaction {
  id: string
  type: string
  amount: number
  plan: string | null
  note: string | null
  created_at: string
}

// ── Stripe credit bundles ─────────────────────────────────────────────────────
const STRIPE_LEADGEN_BUNDLES = [
  { credits: 20,  priceUsd: 20,  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_20  || '', creditType: 'lead_gen' as const },
  { credits: 40,  priceUsd: 38,  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_40  || '', creditType: 'lead_gen' as const },
  { credits: 100, priceUsd: 88,  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_100 || '', creditType: 'lead_gen' as const },
]
const STRIPE_FIGSY_BUNDLES = [
  { credits: 20,  priceUsd: 60,  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FIGSY_20  || '', creditType: 'figsy' as const },
  { credits: 40,  priceUsd: 110, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FIGSY_40  || '', creditType: 'figsy' as const },
  { credits: 100, priceUsd: 250, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FIGSY_100 || '', creditType: 'figsy' as const },
]

// ── Agent subscription products ───────────────────────────────────────────────
const AGENT_PRODUCTS = [
  {
    key:      'milla' as const,
    label:    'Milla',
    subtitle: 'AI Virtual Assistant',
    price:    49,
    icon:     Bot,
    color:    'bg-[#7C3AED]',
    features: ['Trained on your documents & SOPs', 'Answers questions about your business instantly', 'Drafts emails in your tone & voice', 'Available 24/7 — never misses a question'],
  },
  {
    key:      'vida' as const,
    label:    'Vida',
    subtitle: 'AI Chatbot Agent',
    price:    39,
    icon:     MessageSquare,
    color:    'bg-indigo-600',
    features: ['Answers product questions instantly', 'Captures and qualifies leads 24/7', 'Hands off to your team when needed', 'One-line embed — any website'],
  },
]

function printReceipt(tx: CreditTransaction) {
  const html = `<!DOCTYPE html><html><head><title>K.I.N.D Receipt</title><style>body{font-family:sans-serif;padding:40px;max-width:500px;margin:0 auto}h1{font-size:20px;font-weight:bold;margin-bottom:4px}.logo{color:#7C3AED;font-weight:bold;font-size:18px;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px 0;border-bottom:1px solid #eee;font-size:14px}td:last-child{text-align:right;font-weight:500}.footer{font-size:12px;color:#888;margin-top:32px}@media print{button{display:none}}</style></head><body>
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
<br><button onclick="window.print()" style="margin-top:16px;padding:10px 20px;background:#7C3AED;color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px">Print / Save as PDF</button>
</body></html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

export default function BillingPage() {
  const supabase = createClient()
  const [balance, setBalance]             = useState<number | null>(null)
  const [transactions, setTransactions]   = useState<CreditTransaction[]>([])
  const [loading, setLoading]             = useState(true)
  const [loadError, setLoadError]         = useState<string | null>(null)
  const [buyError, setBuyError]           = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const [figsyBalance, setFigsyBalance] = useState<number | null>(null)

  // Credit purchases
  const [selectedLeadGen, setSelectedLeadGen] = useState(STRIPE_LEADGEN_BUNDLES[0].credits)
  const [selectedFigsy, setSelectedFigsy]     = useState(STRIPE_FIGSY_BUNDLES[0].credits)
  const [creditInitiating, setCreditInitiating] = useState<string | null>(null)

  // Subscriptions
  const [subInitiating, setSubInitiating]   = useState<string | null>(null)
  const [activeProducts, setActiveProducts] = useState<string[]>([])

  // Auto top-up
  const [autoTopup, setAutoTopup]   = useState({ enabled: false, threshold: 10, plan: 'kind_ai' as 'kind_ai' | 'figsy', bundle_size: 20 })
  const [savingTopup, setSavingTopup] = useState(false)
  const [topupSaved, setTopupSaved]   = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      try {
        const [creditsRes, subsRes, autoRes] = await Promise.allSettled([
          api.get<{ data: { balance: number; figsy_credits_remaining: number; transactions: CreditTransaction[] } }>('/credits', session.access_token),
          api.get<{ data: { product: string; status: string }[] }>('/subscriptions', session.access_token),
          api.get<{ data: { auto_topup_enabled?: boolean; auto_topup_threshold?: number; auto_topup_plan?: string; auto_topup_bundle_size?: number } }>('/clients/me', session.access_token),
        ])

        if (creditsRes.status === 'fulfilled') {
          setBalance(creditsRes.value.data.balance)
          setFigsyBalance(creditsRes.value.data.figsy_credits_remaining ?? 0)
          setTransactions(creditsRes.value.data.transactions)
        } else {
          setLoadError('Could not load billing data — please refresh.')
        }

        if (subsRes.status === 'fulfilled') {
          const active = (subsRes.value.data ?? [])
            .filter(s => s.status === 'active')
            .map(s => s.product)
          setActiveProducts(active)
        }

        if (autoRes.status === 'fulfilled' && autoRes.value.data) {
          const d = autoRes.value.data
          setAutoTopup({
            enabled:     d.auto_topup_enabled ?? false,
            threshold:   d.auto_topup_threshold ?? 10,
            plan:        (d.auto_topup_plan as 'kind_ai' | 'figsy') ?? 'kind_ai',
            bundle_size: d.auto_topup_bundle_size ?? 20,
          })
        }
      } catch { setLoadError('Could not load billing data — please refresh.') }

      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleCreditBuy(priceId: string, credits: number, creditType: 'lead_gen' | 'figsy') {
    if (!termsAccepted) { setBuyError('Please accept the terms before purchasing.'); return }
    const key = `${creditType}_${credits}`
    setCreditInitiating(key)
    setBuyError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setCreditInitiating(null); return }
    try {
      const res = await api.post<{ url?: string; error?: string }>('/stripe/checkout', { priceId, credits, creditType }, session.access_token)
      if (res.url) { window.location.href = res.url }
      else setBuyError('Checkout could not be created. Please contact hello@get-kind.com.')
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Checkout failed. Please try again.')
    }
    setCreditInitiating(null)
  }

  async function handleSubscribe(product: 'milla' | 'vida') {
    setSubInitiating(product)
    setBuyError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSubInitiating(null); return }
    try {
      const res = await api.post<{ url?: string; error?: string }>('/stripe/subscribe', { product }, session.access_token)
      if (res.url) { window.location.href = res.url }
      else setBuyError(res.error || 'Subscription checkout failed. Please contact hello@get-kind.com.')
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : 'Subscription failed. Please try again.')
    }
    setSubInitiating(null)
  }

  async function handleDemoRequest(product: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'}/demo-request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product, client_id: session.user.id, message: '' }),
      })
    } catch { /* silent */ }
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
    } catch { setBuyError('Failed to save auto-topup settings') }
    setSavingTopup(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
    </div>
  )

  if (loadError) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <p className="text-red-600 font-medium mb-2">Could not load billing</p>
        <p className="text-sm text-[#7B6FA0] mb-4">{loadError}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm">Retry</button>
      </div>
    </div>
  )

  const leadGenBundle   = STRIPE_LEADGEN_BUNDLES.find(b => b.credits === selectedLeadGen)!
  const figsyBundle     = STRIPE_FIGSY_BUNDLES.find(b => b.credits === selectedFigsy)!
  const stripeReady     = STRIPE_LEADGEN_BUNDLES.some(b => b.priceId)

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Credits</h1>
        <p className="text-[#7B6FA0] text-sm mt-1">Manage credits and agent subscriptions.</p>
      </div>

      {/* Balance */}
      <div className="bg-gradient-to-r from-[#1A0F47] to-[#0F0929] rounded-xl text-white grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
        <div className="px-6 py-5">
          <p className="text-white/60 text-sm mb-1">Current balance</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-bold">{balance ?? 0}</p>
            <p className="text-white/60 mb-1">credits</p>
          </div>
          <p className="text-white/40 text-xs mt-1">1 credit = 1 qualified lead delivered</p>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white/60 text-sm">FIGSY outreach credits</p>
            <Zap className="w-5 h-5 text-purple-300" />
          </div>
          <p className="text-4xl font-bold">{figsyBalance ?? 0}</p>
          <p className="text-white/40 text-xs mt-1">1 credit = 1 lead enrolled in email campaign</p>
        </div>
      </div>

      {/* How credits work */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: <Zap className="w-4 h-4 text-purple-500" />, title: 'Lead found', sub: 'No credit used', bg: 'bg-[#F5F0FF]' },
          { icon: <TrendingUp className="w-4 h-4 text-indigo-500" />, title: 'Outreach sent', sub: 'No credit used', bg: 'bg-indigo-50' },
          { icon: <Check className="w-4 h-4 text-green-500" />, title: 'Lead delivered', sub: '1 credit consumed', bg: 'bg-green-50' },
        ].map(({ icon, title, sub, bg }) => (
          <div key={title} className="bg-purple-50/40 rounded-xl p-4 text-center">
            <div className={`w-8 h-8 ${bg} rounded-full flex items-center justify-center mx-auto mb-2`}>{icon}</div>
            <p className="text-sm font-medium text-gray-900">{title}</p>
            <p className="text-xs text-[#9B8EC4] mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Terms */}
      <div className="border-t border-gray-100 pt-4">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] shrink-0" />
          <span className="text-sm text-gray-700 leading-relaxed">
            I have read and agree to the{' '}
            <a href="https://get-kind.com/terms" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline font-medium">Terms of Service</a>
            {' '}and{' '}
            <a href="https://get-kind.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:underline font-medium">Privacy Policy</a>.
            {' '}My acceptance is recorded with a timestamp and is legally binding under ECTA No. 25 of 2002.
          </span>
        </label>
        {termsAccepted && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
            <Shield className="w-3.5 h-3.5 shrink-0" /> Terms accepted.
          </div>
        )}
      </div>

      {buyError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{buyError}</div>
      )}

      {/* ── CREDIT BUNDLES ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Top up credits</h2>
        <p className="text-sm text-[#9B8EC4] mb-4">One-time purchase · Credits never expire · Billed in USD via Stripe</p>

        {!stripeReady && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-700 mb-4">
            Stripe is not yet configured. Contact hello@get-kind.com to complete your purchase.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Lead Gen */}
          <div className="rounded-xl overflow-hidden border border-purple-100/60">
            <div className="bg-[#7C3AED] px-5 py-4 text-white">
              <p className="font-semibold">K.I.N.D AI — Lead Gen</p>
              <p className="text-white/60 text-xs mt-0.5">Sourcing + scoring + delivery</p>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
              <div className="relative">
                <select value={selectedLeadGen} onChange={e => setSelectedLeadGen(Number(e.target.value))}
                  className="w-full appearance-none border border-purple-100/80 rounded-lg px-4 py-2.5 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                  {STRIPE_LEADGEN_BUNDLES.map(b => (
                    <option key={b.credits} value={b.credits}>{b.credits} credits — ${b.priceUsd}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#9B8EC4] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                onClick={() => handleCreditBuy(leadGenBundle.priceId, leadGenBundle.credits, 'lead_gen')}
                disabled={!!creditInitiating || !termsAccepted || !leadGenBundle.priceId}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {creditInitiating === `lead_gen_${selectedLeadGen}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Buy {selectedLeadGen} credits — ${leadGenBundle.priceUsd}
              </button>
              <p className="text-xs text-[#9B8EC4] text-center">Credits never expire</p>
            </div>
          </div>

          {/* FIGSY */}
          <div className="rounded-xl overflow-hidden border border-purple-100/60">
            <div className="bg-[#0F0929] px-5 py-4 text-white">
              <p className="font-semibold">FIGSY Advanced</p>
              <p className="text-white/60 text-xs mt-0.5">Full outreach — AI SDR credits</p>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
              <div className="relative">
                <select value={selectedFigsy} onChange={e => setSelectedFigsy(Number(e.target.value))}
                  className="w-full appearance-none border border-purple-100/80 rounded-lg px-4 py-2.5 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                  {STRIPE_FIGSY_BUNDLES.map(b => (
                    <option key={b.credits} value={b.credits}>{b.credits} credits — ${b.priceUsd}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#9B8EC4] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <button
                onClick={() => handleCreditBuy(figsyBundle.priceId, figsyBundle.credits, 'figsy')}
                disabled={!!creditInitiating || !termsAccepted || !figsyBundle.priceId}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#0F0929] hover:bg-[#1A0F47] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {creditInitiating === `figsy_${selectedFigsy}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Buy {selectedFigsy} credits — ${figsyBundle.priceUsd}
              </button>
              <p className="text-xs text-[#9B8EC4] text-center">Credits never expire</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── AGENT SUBSCRIPTIONS ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">AI Agents</h2>
        <p className="text-sm text-[#9B8EC4] mb-4">Monthly subscriptions · Cancel anytime · Activates instantly after payment</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {AGENT_PRODUCTS.map(agent => {
            const dbProduct     = agent.key === 'milla' ? 'virtual_assistant' : 'chatbot'
            const isActive      = activeProducts.includes(dbProduct)
            const isLoading     = subInitiating === agent.key
            const Icon          = agent.icon

            return (
              <div key={agent.key} className="rounded-xl overflow-hidden border border-purple-100/60">
                <div className={`${agent.color} px-5 py-4 text-white`}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <p className="font-semibold">{agent.label}</p>
                    {isActive && (
                      <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-white/60 text-xs mt-0.5">{agent.subtitle}</p>
                </div>
                <div className="bg-white px-5 py-5">
                  <ul className="space-y-2 mb-5">
                    {agent.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-green-600" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold text-gray-900">${agent.price}</span>
                    <span className="text-[#9B8EC4] text-sm ml-1">/month</span>
                  </div>

                  {isActive ? (
                    <div className="flex items-center justify-center gap-2 w-full bg-green-50 text-green-700 font-semibold rounded-xl px-6 py-3 text-sm border border-green-200">
                      <CheckCircle className="w-4 h-4" /> Subscribed — go to{' '}
                      <a href={`/dashboard/${agent.key === 'milla' ? 'assistant' : 'chatbot'}`} className="underline">
                        {agent.label}
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => handleSubscribe(agent.key)}
                        disabled={isLoading || !termsAccepted}
                        className={`w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-xl text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${agent.color} hover:opacity-90`}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        Unlock {agent.label} — ${agent.price}/month
                      </button>
                      <button
                        onClick={() => handleDemoRequest(agent.key)}
                        className="w-full flex items-center justify-center gap-2 text-sm text-[#7B6FA0] hover:text-gray-800 border border-purple-100/80 hover:border-gray-300 rounded-xl px-4 py-2.5 transition-colors">
                        Request a demo instead
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── AUTO TOP-UP ─────────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Auto top-up</h2>
            <p className="text-xs text-[#9B8EC4] mt-0.5">Automatically recharge when balance drops below your threshold.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={autoTopup.enabled} onChange={e => setAutoTopup(p => ({ ...p, enabled: e.target.checked }))} className="sr-only peer" />
            <div className="w-10 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:bg-[#7C3AED] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4"></div>
          </label>
        </div>
        {autoTopup.enabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-medium text-[#7B6FA0] mb-1.5">Recharge when below</p>
                <select value={autoTopup.threshold} onChange={e => setAutoTopup(p => ({ ...p, threshold: Number(e.target.value) }))}
                  className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  {[5, 10, 20, 50].map(v => <option key={v} value={v}>{v} credits</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-[#7B6FA0] mb-1.5">Plan</p>
                <select value={autoTopup.plan} onChange={e => setAutoTopup(p => ({ ...p, plan: e.target.value as 'kind_ai' | 'figsy' }))}
                  className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="kind_ai">K.I.N.D AI</option>
                  <option value="figsy">FIGSY</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-[#7B6FA0] mb-1.5">Recharge amount</p>
                <select value={autoTopup.bundle_size} onChange={e => setAutoTopup(p => ({ ...p, bundle_size: Number(e.target.value) }))}
                  className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  {[10, 20, 40, 75, 100, 200].map(v => <option key={v} value={v}>{v} credits</option>)}
                </select>
              </div>
            </div>
            <button onClick={saveAutoTopup} disabled={savingTopup}
              className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              {savingTopup ? <Loader2 className="w-4 h-4 animate-spin" /> : topupSaved ? <Check className="w-4 h-4" /> : null}
              {topupSaved ? 'Saved!' : 'Save settings'}
            </button>
          </div>
        )}
      </div>

      {/* ── SPENDING SPARKLINE ──────────────────────────────────────────────── */}
      {transactions.length >= 2 && (() => {
        // Build running balance from transactions (most recent last for chart)
        const sorted = [...transactions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        let running = (balance ?? 0)
        // Reconstruct by working backwards from current balance
        const points: { label: string; value: number }[] = []
        const rev = [...sorted].reverse()
        let bal = balance ?? 0
        for (const tx of rev) {
          bal -= tx.amount
          points.unshift({ label: new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), value: Math.max(0, bal) })
        }
        points.push({ label: 'Now', value: balance ?? 0 })
        if (points.length < 2) return null
        const totalSpent = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
        const totalTopUps = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
        running = running // silence unused var warning
        return (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Credit balance over time</h2>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <span className="text-[#7B6FA0]">Top-ups: <span className="font-semibold text-green-600">+{totalTopUps}</span></span>
                  <span className="text-[#7B6FA0]">Used: <span className="font-semibold text-red-500">−{totalSpent}</span></span>
                  <span className="text-[#7B6FA0]">Balance: <span className="font-semibold text-gray-900">{balance ?? 0}</span></span>
                </div>
              </div>
              <SparklineChart data={points} color="#7C3AED" height={64} />
              <div className="flex items-center justify-between mt-2 text-[10px] text-[#9B8EC4]">
                <span>{points[0]?.label}</span>
                <span>Now</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── TRANSACTION HISTORY ─────────────────────────────────────────────── */}
      {transactions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Credit history</h2>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {transactions.map((tx, i) => (
              <div key={tx.id} className={`flex items-center justify-between px-5 py-3.5 text-sm ${i < transactions.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div>
                  <p className="font-medium text-gray-800">{tx.note || tx.type}</p>
                  <p className="text-xs text-[#9B8EC4] mt-0.5">{new Date(tx.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</p>
                </div>
                <div className="flex items-center">
                  <span className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                  {tx.type === 'purchase' && (
                    <button onClick={() => printReceipt(tx)} className="ml-3 text-xs text-purple-500 hover:underline shrink-0">Receipt</button>
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
