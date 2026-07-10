'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Coins, Zap, TrendingUp, Loader2, Check, ChevronDown,
  Shield, CreditCard,
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
// FIGSY is $3/credit flat (locked, @kind/shared) → $60 / $120 / $300 (item 168).
// (#284 — the $1 Lead-Gen bundles were removed; FIGSY is the single live product.)
const STRIPE_FIGSY_BUNDLES = [
  { credits: 20,  priceUsd: 60,  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FIGSY_20  || '', creditType: 'figsy' as const },
  { credits: 40,  priceUsd: 120, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FIGSY_40  || '', creditType: 'figsy' as const },
  { credits: 100, priceUsd: 300, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FIGSY_100 || '', creditType: 'figsy' as const },
]

// $1 reveal top-ups (SPRINT line 3) — the reveal wallet of the per-qualified-lead
// model: $1 unmasks a lead, +$3 FIGSY work = $4. Un-retired (#420/#394). Price IDs
// live in Stripe as the "KIND Lead Gen" one-time prices; wired via Railway env.
const STRIPE_LEADGEN_BUNDLES = [
  { credits: 20,  priceUsd: 20,  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_20  || '', creditType: 'lead_gen' as const },
  { credits: 40,  priceUsd: 40,  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_40  || '', creditType: 'lead_gen' as const },
  { credits: 100, priceUsd: 100, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_100 || '', creditType: 'lead_gen' as const },
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
  const [selectedFigsy, setSelectedFigsy]     = useState(STRIPE_FIGSY_BUNDLES[0].credits)
  const [selectedLeadGen, setSelectedLeadGen] = useState(STRIPE_LEADGEN_BUNDLES[0].credits)
  const [creditInitiating, setCreditInitiating] = useState<string | null>(null)

  // Subscriptions
  const [subInitiating, setSubInitiating]   = useState<string | null>(null)
  const [activeProducts, setActiveProducts] = useState<string[]>([])
  // Item 190 — pause-instead-of-cancel: keep the full sub records so we can offer
  // a pause on the cancel path and reflect a paused state.
  const [subRecords, setSubRecords]         = useState<{ id: string; product: string; status: string; paused_until?: string | null }[]>([])
  const [pausing, setPausing]               = useState<string | null>(null)
  const [pauseNotice, setPauseNotice]       = useState<string | null>(null)

  // Auto top-up — display only. The backend gate (apps/api figsy route) requires a
  // saved Paystack card, and Paystack was removed from the product (#325/#334), so
  // this can never fire. Shown disabled + "Soon" so we don't promise a safety net we
  // can't keep. No save handler: the controls no longer write (dead writes removed).
  const [autoTopup] = useState({ enabled: false, threshold: 10, plan: 'figsy' as 'kind_ai' | 'figsy', bundle_size: 20 })

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      try {
        const [creditsRes, subsRes] = await Promise.allSettled([
          api.get<{ data: { balance: number; figsy_credits_remaining: number; transactions: CreditTransaction[] } }>('/credits', session.access_token),
          api.get<{ data: { id: string; product: string; status: string; paused_until?: string | null }[] }>('/subscriptions', session.access_token),
        ])

        if (creditsRes.status === 'fulfilled') {
          setBalance(creditsRes.value.data.balance)
          setFigsyBalance(creditsRes.value.data.figsy_credits_remaining ?? 0)
          setTransactions(creditsRes.value.data.transactions)
        } else {
          setLoadError('Could not load billing data — please refresh.')
        }

        if (subsRes.status === 'fulfilled') {
          const records = subsRes.value.data ?? []
          setSubRecords(records)
          const active = records
            .filter(s => s.status === 'active')
            .map(s => s.product)
          setActiveProducts(active)
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

  async function handleSubscribe(product: 'milla' | 'vida' | 'denise') {
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

  // Item 190 — graceful pause instead of cancel. Stops billing for 1–3 months
  // while keeping data + settings warm. Never deletes anything.
  async function handlePause(dbProduct: string, months: number) {
    const rec = subRecords.find(s => s.product === dbProduct && s.status === 'active')
    if (!rec) return
    if (!confirm(`Pause this subscription for ${months} month${months > 1 ? 's' : ''}? Billing stops and your data + settings are kept safe. You can resume anytime.`)) return
    setPausing(dbProduct)
    setPauseNotice(null)
    setBuyError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setPausing(null); return }
    try {
      const res = await api.post<{ success: boolean; message?: string }>(`/subscriptions/${rec.id}/pause`, { months }, session.access_token)
      setPauseNotice(res.message || 'Subscription paused.')
      // Reflect locally without a full reload
      setSubRecords(prev => prev.map(s => s.id === rec.id ? { ...s, status: 'paused' } : s))
      setActiveProducts(prev => prev.filter(p => p !== dbProduct))
    } catch (err) {
      // 409 = pause not enabled yet (migration not applied). Surface plainly.
      setBuyError(err instanceof Error ? err.message : 'Could not pause — please contact hello@get-kind.com.')
    }
    setPausing(null)
  }

  async function handleDemoRequest(product: string) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      // #384 — the demo-request router is mounted at /api (index.ts:172); the bare
      // /demo-request path 404'd.
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'}/api/demo-request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product, client_id: session.user.id, message: '' }),
      })
      if (res.ok) setPauseNotice("Thanks — we'll email you when it's ready.")
    } catch { /* silent */ }
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

  const figsyBundle     = STRIPE_FIGSY_BUNDLES.find(b => b.credits === selectedFigsy)!
  const leadGenBundle   = STRIPE_LEADGEN_BUNDLES.find(b => b.credits === selectedLeadGen)!
  const leadGenReady    = STRIPE_LEADGEN_BUNDLES.some(b => b.priceId)
  const stripeReady     = STRIPE_FIGSY_BUNDLES.some(b => b.priceId) || leadGenReady

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
          // #406 — honest two-wallet model: delivery is FREE + masked; $1 reveals a lead
          // (reveal wallet), $3 has FIGSY work it (FIGSY wallet). No charge at delivery.
          { icon: <Zap className="w-4 h-4 text-purple-500" />, title: 'Lead found & delivered', sub: 'No charge — masked', bg: 'bg-[#F5F0FF]' },
          { icon: <Check className="w-4 h-4 text-green-500" />, title: 'Reveal a lead', sub: '$1 · reveal credit', bg: 'bg-green-50' },
          { icon: <TrendingUp className="w-4 h-4 text-indigo-500" />, title: 'FIGSY works it', sub: '$3 · FIGSY credit', bg: 'bg-indigo-50' },
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

      {pauseNotice && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">{pauseNotice}</div>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
          {/* Reveal top-ups — $1 unmasks a lead (SPRINT line 3). Shown once its
              Stripe price IDs are wired (NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_*). */}
          {leadGenReady && (
            <div className="rounded-xl overflow-hidden border border-purple-100/60">
              <div className="bg-[#7C3AED] px-5 py-4 text-white">
                <p className="font-semibold">Reveal credits</p>
                <p className="text-white/70 text-xs mt-0.5">$1 unmasks a verified lead</p>
              </div>
              <div className="bg-white px-5 py-5 space-y-4">
                <div className="relative">
                  <select value={selectedLeadGen} onChange={e => setSelectedLeadGen(Number(e.target.value))}
                    className="w-full appearance-none border border-purple-100/80 rounded-lg px-4 py-2.5 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    {STRIPE_LEADGEN_BUNDLES.map(b => (
                      <option key={b.credits} value={b.credits}>{b.credits} reveals — ${b.priceUsd}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#9B8EC4] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <button
                  onClick={() => handleCreditBuy(leadGenBundle.priceId, leadGenBundle.credits, 'lead_gen')}
                  disabled={!!creditInitiating || !termsAccepted || !leadGenBundle.priceId}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {creditInitiating === `lead_gen_${selectedLeadGen}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Buy {selectedLeadGen} reveals — ${leadGenBundle.priceUsd}
                </button>
                <p className="text-xs text-[#9B8EC4] text-center">Credits never expire</p>
              </div>
            </div>
          )}

          {/* FIGSY work credits — $3/lead, the outreach layer on top of a reveal. */}
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

      {/* AGENT SUBSCRIPTIONS block removed 10 Jul (FIGSY-only cut) — Milla/Vida/Denise
          are not purchasable; the upsell cards return when the agents do. */}

      {/* ── AUTO TOP-UP ─────────────────────────────────────────────────────── */}
      {/* #334 — the backend gate (apps/api figsy route) requires a saved Paystack
          card, and Paystack was removed from the product (#325). So auto top-up can
          never fire. Disabled + "Soon" (the #326 honesty class) so we never promise
          a safety net we can't keep; controls no longer persist (dead writes gone). */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              Auto top-up
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">Soon</span>
            </h2>
            <p className="text-xs text-[#9B8EC4] mt-0.5">
              Auto top-up is coming soon. Until then we&apos;ll email you when credits run low, and again at zero.
            </p>
          </div>
          <button
            type="button"
            disabled
            aria-label="Auto top-up (coming soon)"
            title="Auto top-up is coming soon"
            className="relative inline-flex h-5 w-9 shrink-0 rounded-full bg-gray-100 cursor-not-allowed"
          >
            <span className="inline-block h-4 w-4 rounded-full bg-gray-300 shadow transform mt-0.5 translate-x-0.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md opacity-60">
          <div>
            <p className="text-xs font-medium text-[#7B6FA0] mb-1.5">Recharge when below</p>
            <select
              value={autoTopup.threshold}
              disabled
              aria-label="Recharge threshold (coming soon)"
              title="Auto top-up is coming soon"
              className="w-full border border-purple-100/80 bg-gray-50 text-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-not-allowed"
            >
              {[5, 10, 20, 50].map(v => <option key={v} value={v}>{v} credits</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs font-medium text-[#7B6FA0] mb-1.5">Recharge amount</p>
            <select
              value={autoTopup.bundle_size}
              disabled
              aria-label="Recharge amount (coming soon)"
              title="Auto top-up is coming soon"
              className="w-full border border-purple-100/80 bg-gray-50 text-gray-400 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-not-allowed"
            >
              {[10, 20, 40, 75, 100, 200].map(v => <option key={v} value={v}>{v} credits</option>)}
            </select>
          </div>
        </div>
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
