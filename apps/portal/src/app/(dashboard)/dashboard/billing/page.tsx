'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { packLine, PACK_LEADS, PACK_PRICE_USD, LEAD_PRICE_USD, type PackView } from '@kind/shared'
import {
  Zap, TrendingUp, Loader2, Check,
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

// ── One wallet ────────────────────────────────────────────────────────────────
// ONE wallet, one balance in dollars. $99 to start, then free top-ups of $40/$100/$200.
// Each approved lead is a flat $4, final. Checkout takes { amount_usd } — no bundle SKUs.
// #563 — DERIVED, NOT TYPED. This was a hardcoded 99 sitting beside copy that hand-typed the
// same number and the $4, which is how the starter card came to state two things that stopped
// being true when #562 landed. The constants live in `@kind/shared` precisely so the client can
// read the same figures the API charges from.
const WALLET_FIRST_PURCHASE_USD = PACK_PRICE_USD
const WALLET_TOPUP_AMOUNTS_USD = [40, 100, 200]


function printReceipt(tx: CreditTransaction) {
  const html = `<!DOCTYPE html><html><head><title>K.I.N.D Receipt</title><style>body{font-family:sans-serif;padding:40px;max-width:500px;margin:0 auto}h1{font-size:20px;font-weight:bold;margin-bottom:4px}.logo{color:#7C3AED;font-weight:bold;font-size:18px;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-top:16px}td{padding:8px 0;border-bottom:1px solid #eee;font-size:14px}td:last-child{text-align:right;font-weight:500}.footer{font-size:12px;color:#888;margin-top:32px}@media print{button{display:none}}</style></head><body>
<div class="logo">⚡ K.I.N.D</div>
<h1>Credit Purchase Receipt</h1>
<p style="color:#666;font-size:14px">${new Date(tx.created_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}</p>
<table>
<tr><td>Description</td><td>${tx.note || 'Wallet top-up'}</td></tr>
<tr><td>Amount</td><td>${tx.amount > 0 ? '+' : ''}$${tx.amount}</td></tr>
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
  const [pack, setPack]                   = useState<PackView | null>(null)
  const [packUnknown, setPackUnknown]     = useState(false)
  const [transactions, setTransactions]   = useState<CreditTransaction[]>([])
  const [loading, setLoading]             = useState(true)
  const [loadError, setLoadError]         = useState<string | null>(null)
  const [buyError, setBuyError]           = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Wallet top-up (dollars). One wallet, one balance.
  const [topUpAmount, setTopUpAmount]           = useState(WALLET_TOPUP_AMOUNTS_USD[0])
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
        // #563 — THE PACK. This page read `/credits` and knew ONLY the wallet, so a client
        // who had just paid $99 opened their billing page and saw a $0 balance with no
        // mention of the 100 approvals they had bought — on the one screen that exists to
        // explain what they paid for. The pack is a counted quota, not a wallet credit
        // (#541), so a wallet-only page can never show it. `milla-summary` already computes
        // it with the same `packState` the desk and the greeting use — one source of truth.
        const [creditsRes, subsRes, packRes] = await Promise.allSettled([
          api.get<{ data: { wallet_balance_usd: number; transactions?: CreditTransaction[] } }>('/credits', session.access_token),
          api.get<{ data: { id: string; product: string; status: string; paused_until?: string | null }[] }>('/subscriptions', session.access_token),
          api.get<{ data: { pack?: PackView } }>('/leads/milla-summary', session.access_token),
        ])

        if (creditsRes.status === 'fulfilled') {
          setBalance(creditsRes.value.data.wallet_balance_usd ?? 0)
          setTransactions(creditsRes.value.data.transactions ?? [])
        } else {
          setLoadError('Could not load billing data — please refresh.')
        }

        // A failed pack fetch must not claim the client has no pack — that would be the
        // wallet-only lie again, wearing a different hat.
        if (packRes.status === 'fulfilled') setPack(packRes.value.data?.pack ?? null)
        else setPackUnknown(true)

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

  async function handleTopUp(amountUsd: number) {
    if (!termsAccepted) { setBuyError('Please accept the terms before purchasing.'); return }
    setCreditInitiating(String(amountUsd))
    setBuyError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setCreditInitiating(null); return }
    try {
      const res = await api.post<{ url?: string; error?: string }>('/stripe/checkout', { amount_usd: amountUsd }, session.access_token)
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

  // First purchase is the $99 starter; after any funding we show the free top-ups.
  const hasPurchased = (balance ?? 0) > 0 || transactions.some(t => t.amount > 0)

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Wallet</h1>
        <p className="text-[#7B6FA0] text-sm mt-1">One wallet. ${PACK_PRICE_USD} to start, then top up any time. ${LEAD_PRICE_USD} per approved lead.</p>
      </div>

      {/* NO FREEBIES — the paywall banner: a client who hasn't paid is sent here to load $99. */}
      {!hasPurchased && (
        <div className="rounded-xl border border-[#7C3AED]/25 bg-gradient-to-r from-[#f3ecff] to-[#fdecf5] px-5 py-4">
          <p className="font-bold text-[#5b21b6]">You're one step from live — load your wallet to begin.</p>
          <p className="text-sm text-[#6b6088] mt-0.5">Your first purchase is <b>${PACK_PRICE_USD}</b> — the onboarding pack, which includes your first <b>{PACK_LEADS}</b> approved leads. It does NOT fund your wallet: it buys those approvals outright. Each approved lead after them is a flat $4. Nothing is charged until you approve.</p>
        </div>
      )}

      {/* Wallet balance — one wallet, one balance in dollars */}
      <div className="bg-gradient-to-r from-[#1A0F47] to-[#0F0929] rounded-xl text-white">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white/60 text-sm">Wallet</p>
            <Zap className="w-5 h-5 text-purple-300" />
          </div>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-bold">${balance ?? 0}</p>
          </div>
          <p className="text-white/40 text-xs mt-1">$4 per approved lead — final</p>
        </div>

        {/* #563 — THE INCLUDED PACK. This page knew only the wallet, so a client who had just
            paid $99 saw a $0 balance and NO mention of the 100 approvals they had bought — on
            the one screen that exists to explain what they paid for. The pack is a counted
            quota, not a wallet credit (#541), which is exactly why a wallet-only page could
            never show it: the money is not in the balance, it is in the entitlement. */}
        {packLine(pack) && (
          <div className="px-6 pb-5 -mt-1">
            <div className="rounded-lg bg-white/10 px-4 py-3">
              <p className="text-white/60 text-xs uppercase tracking-wide font-bold">Your ${PACK_PRICE_USD} pack</p>
              <p className="text-white text-[13.5px] mt-1">{packLine(pack)}</p>
            </div>
          </div>
        )}
        {packUnknown && (
          <div className="px-6 pb-5 -mt-1">
            <div className="rounded-lg bg-white/10 px-4 py-3">
              <p className="text-white text-[13px]">
                We couldn&apos;t load your included-leads balance just now. <b>This does not mean you have none</b> — refresh in a moment.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* How the wallet works */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          // One wallet: delivery is FREE + masked; you approve a lead for a flat $4,
          // final — FIGSY's work is included. Nothing is charged until you approve.
          { icon: <Zap className="w-4 h-4 text-purple-500" />, title: 'Lead found & delivered', sub: 'No charge — masked', bg: 'bg-[#F5F0FF]' },
          { icon: <Check className="w-4 h-4 text-green-500" />, title: 'You approve a lead', sub: '$4 per approved lead', bg: 'bg-green-50' },
          { icon: <TrendingUp className="w-4 h-4 text-indigo-500" />, title: 'FIGSY works it', sub: 'Included — writes, sends, books', bg: 'bg-indigo-50' },
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

      {/* ── WALLET ──────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{hasPurchased ? 'Top up your wallet' : 'Get started'}</h2>
        <p className="text-sm text-[#9B8EC4] mb-4">One wallet · Funds never expire · Billed in USD via Stripe · $4 per approved lead</p>

        {!hasPurchased ? (
          /* #563 — THE FIRST-PURCHASE CARD. It used to read "Fund your wallet. Each approved
             lead is a flat $4", and after #562 BOTH halves were false: the first payment does
             NOT credit the wallet (it buys the pack — `isPackPurchase` skips `increment_wallet`),
             and the first 100 approvals are NOT $4 each, they are included. That is the screen a
             client reads immediately before entering a card. Every figure is now derived. */
          <div className="rounded-xl overflow-hidden border border-purple-100/60 max-w-md">
            <div className="bg-[#7C3AED] px-5 py-4 text-white">
              <p className="font-semibold">Get started — ${WALLET_FIRST_PURCHASE_USD}</p>
              <p className="text-white/70 text-xs mt-0.5">
                Your onboarding pack — <b>{PACK_LEADS} approved leads included</b>. Reviewing is always free;
                after the {PACK_LEADS} are used, approvals are ${LEAD_PRICE_USD} each from your wallet.
              </p>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
              <button
                onClick={() => handleTopUp(WALLET_FIRST_PURCHASE_USD)}
                disabled={!!creditInitiating || !termsAccepted}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {creditInitiating === String(WALLET_FIRST_PURCHASE_USD) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Get started — ${WALLET_FIRST_PURCHASE_USD}
              </button>
              <p className="text-xs text-[#9B8EC4] text-center">Funds never expire</p>
            </div>
          </div>
        ) : (
          /* Free top-ups — $40 / $100 / $200 added straight to the one wallet. */
          <div className="rounded-xl overflow-hidden border border-purple-100/60 max-w-md">
            <div className="bg-[#0F0929] px-5 py-4 text-white">
              <p className="font-semibold">Top up</p>
              <p className="text-white/60 text-xs mt-0.5">Add funds to your wallet — no fees.</p>
            </div>
            <div className="bg-white px-5 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {WALLET_TOPUP_AMOUNTS_USD.map(amt => (
                  <button key={amt} type="button" onClick={() => setTopUpAmount(amt)}
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold border transition-colors ${topUpAmount === amt ? 'border-[#7C3AED] bg-[#F5F0FF] text-[#7C3AED]' : 'border-purple-100/80 text-gray-700 hover:bg-gray-50'}`}>
                    ${amt}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleTopUp(topUpAmount)}
                disabled={!!creditInitiating || !termsAccepted}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#0F0929] hover:bg-[#1A0F47] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {creditInitiating === String(topUpAmount) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Top up ${topUpAmount}
              </button>
              <p className="text-xs text-[#9B8EC4] text-center">Funds never expire</p>
            </div>
          </div>
        )}
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
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Wallet balance over time</h2>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Wallet history</h2>
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
