'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { PRODUCTS } from '@kind/shared'
import type { Subscription } from '@kind/shared'
import { CreditCard, Check, Loader2, ChevronDown } from 'lucide-react'

const PRODUCT_LABELS: Record<string, string> = {
  lead_gen: 'AI Lead Generation',
  virtual_assistant: 'Virtual Assistant',
  chatbot: 'AI Chatbot Agent',
  consulting: 'Monthly Consulting',
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD — US Dollar', rate: 1 },
  { code: 'ZAR', symbol: 'R', label: 'ZAR — South African Rand', rate: 19 },
  { code: 'NGN', symbol: '₦', label: 'NGN — Nigerian Naira', rate: 1600 },
  { code: 'KES', symbol: 'KSh', label: 'KES — Kenyan Shilling', rate: 130 },
  { code: 'GHS', symbol: 'GH₵', label: 'GHS — Ghanaian Cedi', rate: 15 },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro', rate: 0.92 },
  { code: 'GBP', symbol: '£', label: 'GBP — British Pound', rate: 0.79 },
]

function formatPrice(usd: number, currency: typeof CURRENCIES[0]) {
  const amount = usd * currency.rate
  if (amount >= 1000) return `${currency.symbol}${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  return `${currency.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export default function BillingPage() {
  const supabase = createClient()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [initiating, setInitiating] = useState<string | null>(null)
  const [currency, setCurrency] = useState(CURRENCIES[0])
  const [currencyOpen, setCurrencyOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await api.get<{ data: Subscription[] }>('/subscriptions', session.access_token)
        setSubscriptions(res.data || [])
      } catch {
        // no-op
      }
      setLoading(false)
    }
    load()
  }, [])

  async function subscribe(product: string, tier: string) {
    const key = `${product}_${tier}`
    setInitiating(key)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await api.post<{ data: { authorization_url: string } }>(
        '/subscriptions/initiate',
        { product, tier, billing_interval: 'monthly' },
        session.access_token
      )
      window.location.href = res.data.authorization_url
    } catch (err) {
      console.error(err)
    }
    setInitiating(null)
  }

  const activeProducts = subscriptions.map((s) => s.product)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your subscriptions. Prices shown in your selected currency.</p>
        </div>

        {/* Currency selector */}
        <div className="relative">
          <button
            onClick={() => setCurrencyOpen(o => !o)}
            className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 bg-white shadow-sm"
          >
            <span>{currency.code}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {currencyOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => { setCurrency(c); setCurrencyOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${c.code === currency.code ? 'text-brand-500 font-medium' : 'text-gray-700'}`}
                >
                  <span>{c.label}</span>
                  {c.code === currency.code && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Subscriptions */}
      {subscriptions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-500" /> Active Subscriptions
          </h2>
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-sm">{PRODUCT_LABELS[sub.product]}</p>
                  <p className="text-xs text-gray-400 capitalize">{sub.tier} · {sub.billing_interval}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatPrice(sub.amount_usd, currency)}/mo</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    sub.status === 'active' ? 'bg-green-50 text-green-700' :
                    sub.status === 'trialing' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {sub.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plans */}
      {(Object.entries(PRODUCTS) as [string, typeof PRODUCTS[keyof typeof PRODUCTS]][]).map(([productKey, product]) => (
        <div key={productKey} className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold mb-4">{product.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.entries(product.tiers) as [string, { price_usd: number }][]).map(([tierKey, tier]) => {
              if (tier.price_usd === 0) return null
              const isActive = activeProducts.includes(productKey as Subscription['product'])
              const key = `${productKey}_${tierKey}`

              return (
                <div
                  key={tierKey}
                  className={`border rounded-xl p-5 ${tierKey === 'pro' ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-100'}`}
                >
                  {tierKey === 'pro' && (
                    <span className="text-xs font-medium text-brand-500 mb-2 block">Most Popular</span>
                  )}
                  <p className="font-semibold capitalize">{tierKey}</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatPrice(tier.price_usd, currency)}
                    <span className="text-sm font-normal text-gray-400">/mo</span>
                  </p>
                  <p className="text-xs text-gray-400 mb-4">${tier.price_usd} USD · fixed rate</p>

                  <button
                    onClick={() => subscribe(productKey, tierKey)}
                    disabled={isActive || initiating === key}
                    className={`w-full text-sm font-medium rounded-lg px-4 py-2 transition-colors ${
                      isActive
                        ? 'bg-green-50 text-green-700 cursor-default'
                        : 'bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-60'
                    }`}
                  >
                    {initiating === key ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : isActive ? (
                      <span className="flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> Active</span>
                    ) : (
                      'Subscribe'
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400 text-center pb-4">
        All payments processed in USD via Paystack. Currency display is indicative only based on fixed exchange rates.
      </p>
    </div>
  )
}
