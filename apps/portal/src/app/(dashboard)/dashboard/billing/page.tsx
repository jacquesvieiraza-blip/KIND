'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { PRICING, FIGSY_ADDON, PRODUCTS } from '@kind/shared'
import type { Subscription } from '@kind/shared'
import { Check, Loader2, Zap } from 'lucide-react'

export default function BillingPage() {
  const supabase = createClient()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [initiating, setInitiating] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const res = await api.get<{ data: Subscription[] }>('/subscriptions', session.access_token)
        setSubscriptions(res.data || [])
      } catch { }
      setLoading(false)
    }
    load()
  }, [])

  async function subscribe(product: string, tier = 'usage') {
    setInitiating(product)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await api.post<{ data: { authorization_url: string } }>('/subscriptions/initiate', { product, tier, billing_interval: 'monthly' }, session.access_token)
      window.location.href = res.data.authorization_url
    } catch (err) { console.error(err) }
    setInitiating(null)
  }

  const activeProducts = subscriptions.map((s) => s.product)

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 text-sm mt-1">All prices in USD. Billed in ZAR at the current exchange rate.</p>
      </div>

      {/* Lead Gen — usage-based */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold mb-1">AI Lead Generation</h2>
        <p className="text-sm text-gray-400 mb-5">Verified B2B leads sourced and scored against your ICP. Pay only for leads delivered.</p>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Volume pricing</p>
            {PRICING.lead_gen.tiers.map((t) => (
              <div key={t.label} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-600">{t.label}</span>
                <span className="font-semibold">${t.rate_usd.toFixed(2)}<span className="text-gray-400 font-normal"> /lead</span></span>
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-2">Minimum ${PRICING.lead_gen.monthly_minimum_usd}/mo · includes {PRICING.lead_gen.includes_leads} leads</p>
          </div>
          <div className="flex flex-col gap-3 md:w-52 shrink-0">
            <div>
              <p className="text-3xl font-bold">${PRICING.lead_gen.monthly_minimum_usd}<span className="text-sm font-normal text-gray-400">/mo min</span></p>
              <p className="text-xs text-gray-400">then ${PRICING.lead_gen.tiers[0].rate_usd.toFixed(2)}/lead</p>
            </div>
            <button
              onClick={() => subscribe('lead_gen')}
              disabled={activeProducts.includes('lead_gen') || initiating === 'lead_gen'}
              className={`w-full text-sm font-medium rounded-lg px-4 py-2.5 transition-colors
                ${activeProducts.includes('lead_gen') ? 'bg-green-50 text-green-700 cursor-default' : 'bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-60'}`}
            >
              {initiating === 'lead_gen' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
               activeProducts.includes('lead_gen') ? <span className="flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" />Active</span> :
               'Get started'}
            </button>
          </div>
        </div>
      </div>

      {/* Lead Gen + FIGSY bundle — usage-based */}
      <div className="bg-gradient-to-br from-[#001f4d] to-[#003080] rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold">Lead Gen + FIGSY Bundle</h2>
          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Best value</span>
        </div>
        <p className="text-white/60 text-sm mb-5">Everything in Lead Gen, plus FIGSY — your AI SDR that runs outreach and books meetings.</p>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <p className="text-xs font-medium text-white/50 uppercase tracking-wide mb-2">Volume pricing</p>
            {PRICING.lead_gen_figsy.tiers.map((t) => (
              <div key={t.label} className="flex items-center justify-between text-sm py-2 border-b border-white/10 last:border-0">
                <span className="text-white/70">{t.label}</span>
                <span className="font-semibold">${t.rate_usd.toFixed(2)}<span className="text-white/50 font-normal"> /lead</span></span>
              </div>
            ))}
            <p className="text-xs text-white/40 mt-2">Minimum ${PRICING.lead_gen_figsy.monthly_minimum_usd}/mo · includes {PRICING.lead_gen_figsy.includes_leads} leads + FIGSY outreach</p>
          </div>
          <div className="flex flex-col gap-3 md:w-52 shrink-0">
            <div>
              <p className="text-3xl font-bold">${PRICING.lead_gen_figsy.monthly_minimum_usd}<span className="text-sm font-normal text-white/50">/mo min</span></p>
              <p className="text-xs text-white/50">then ${PRICING.lead_gen_figsy.tiers[0].rate_usd.toFixed(2)}/lead</p>
            </div>
            <button
              onClick={() => subscribe('lead_gen_figsy')}
              disabled={activeProducts.includes('lead_gen_figsy') || initiating === 'lead_gen_figsy'}
              className={`w-full text-sm font-medium rounded-lg px-4 py-2.5 transition-colors
                ${activeProducts.includes('lead_gen_figsy') ? 'bg-white/20 text-white cursor-default' : 'bg-white text-[#001f4d] hover:bg-white/90 disabled:opacity-60'}`}
            >
              {initiating === 'lead_gen_figsy' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
               activeProducts.includes('lead_gen_figsy') ? <span className="flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" />Active</span> :
               'Get started'}
            </button>
          </div>
        </div>
      </div>

      {/* FIGSY add-on for existing Lead Gen clients */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold mb-1">Add FIGSY to your existing plan</h2>
        <p className="text-sm text-gray-400 mb-4">Already on Lead Gen? Upgrade to include FIGSY AI outreach and booking.</p>
        <div className="flex items-center gap-6 max-w-sm">
          <div>
            <p className="text-2xl font-bold">+${FIGSY_ADDON.price_usd}<span className="text-sm font-normal text-gray-400">/mo</span></p>
            <p className="text-xs text-gray-400 mt-0.5">{FIGSY_ADDON.description}</p>
          </div>
          <a href="mailto:hello@kind.ai?subject=FIGSY+Add-on+Request"
            className="shrink-0 text-sm font-medium rounded-lg px-4 py-2.5 border border-gray-200 hover:border-brand-500 hover:text-brand-500 transition-colors whitespace-nowrap">
            Request add-on
          </a>
        </div>
      </div>

      {/* Virtual Assistant & Chatbot — flat subscription tiers */}
      {(['virtual_assistant', 'chatbot'] as const).map((productKey) => {
        const product = PRODUCTS[productKey]
        return (
          <div key={productKey} className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold mb-4">{product.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.entries(product.tiers) as [string, { price_usd: number; custom?: boolean }][]).map(([tierKey, tier]) => {
                const isActive = activeProducts.includes(productKey)
                const key = `${productKey}_${tierKey}`
                if (tier.custom) {
                  return (
                    <div key={tierKey} className="border border-gray-100 rounded-xl p-5 flex flex-col">
                      <p className="font-semibold capitalize">{tierKey}</p>
                      <p className="text-2xl font-bold mt-1">Custom</p>
                      <p className="text-xs text-gray-400 mb-4">Tailored to your needs</p>
                      <a href={`mailto:hello@kind.ai?subject=Enterprise+${product.name}`}
                        className="mt-auto w-full text-center text-sm font-medium rounded-lg px-4 py-2 border border-gray-200 hover:border-gray-400 transition-colors">
                        Contact us
                      </a>
                    </div>
                  )
                }
                return (
                  <div key={tierKey} className={`border rounded-xl p-5 flex flex-col ${tierKey === 'pro' ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-100'}`}>
                    {tierKey === 'pro' && <span className="text-xs font-medium text-brand-500 mb-2 block">Most Popular</span>}
                    <p className="font-semibold capitalize">{tierKey}</p>
                    <p className="text-2xl font-bold mt-1">${tier.price_usd}<span className="text-sm font-normal text-gray-400">/mo</span></p>
                    <button
                      onClick={() => subscribe(productKey, tierKey)}
                      disabled={isActive || initiating === key}
                      className={`w-full mt-4 text-sm font-medium rounded-lg px-4 py-2 transition-colors
                        ${isActive ? 'bg-green-50 text-green-700 cursor-default' : 'bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-60'}`}
                    >
                      {initiating === key ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
                       isActive ? <span className="flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" />Active</span> :
                       'Subscribe'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
