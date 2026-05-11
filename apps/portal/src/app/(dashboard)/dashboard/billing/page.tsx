'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { PRODUCTS, FIGSY_ADDONS } from '@kind/shared'
import type { Subscription } from '@kind/shared'
import { CreditCard, Check, Loader2, Zap } from 'lucide-react'

const PRODUCT_LABELS: Record<string, string> = {
  lead_gen:          'AI Lead Generation',
  lead_gen_figsy:    'Lead Gen + FIGSY Bundle',
  virtual_assistant: 'Virtual Assistant',
  chatbot:           'AI Chatbot Agent',
}

const TIER_LABELS: Record<string, string> = {
  starter:    'Starter',
  advanced:   'Advanced',
  pro:        'Pro',
  enterprise: 'Enterprise',
}

export default function BillingPage() {
  const supabase = createClient()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [initiating, setInitiating] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await api.get<{ data: Subscription[] }>('/subscriptions', session.access_token)
        setSubscriptions(res.data || [])
      } catch { }
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

      {/* Lead Gen plans */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold mb-1">AI Lead Generation</h2>
        <p className="text-sm text-gray-400 mb-4">Precision-targeted B2B leads, Apollo-sourced, POPIA-compliant.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['starter', 'advanced', 'enterprise'] as const).map((tier) => {
            const config = PRODUCTS.lead_gen.tiers[tier] as { price_usd: number; leads_per_month: number; custom?: boolean }
            const isActive = activeProducts.includes('lead_gen')
            const key = `lead_gen_${tier}`
            if (config.custom) {
              return (
                <div key={tier} className="border border-gray-100 rounded-xl p-5 flex flex-col">
                  <p className="font-semibold capitalize">{TIER_LABELS[tier]}</p>
                  <p className="text-2xl font-bold mt-1">Custom</p>
                  <p className="text-xs text-gray-400 mb-4">Unlimited leads · Dedicated support</p>
                  <a href="mailto:hello@kind.ai?subject=Enterprise%20Lead%20Gen" className="mt-auto w-full text-center text-sm font-medium rounded-lg px-4 py-2 border border-gray-200 hover:border-gray-400 transition-colors">Contact us</a>
                </div>
              )
            }
            return (
              <div key={tier} className={`border rounded-xl p-5 flex flex-col ${tier === 'advanced' ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-100'}`}>
                {tier === 'advanced' && <span className="text-xs font-medium text-brand-500 mb-2">Most Popular</span>}
                <p className="font-semibold">{TIER_LABELS[tier]}</p>
                <p className="text-2xl font-bold mt-1">${config.price_usd}<span className="text-sm font-normal text-gray-400">/mo</span></p>
                <p className="text-xs text-gray-400 mb-4">{config.leads_per_month} leads/month</p>
                <button onClick={() => subscribe('lead_gen', tier)} disabled={isActive || initiating === key}
                  className={`mt-auto w-full text-sm font-medium rounded-lg px-4 py-2 transition-colors ${isActive ? 'bg-green-50 text-green-700 cursor-default' : 'bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-60'}`}>
                  {initiating === key ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isActive ? <span className="flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> Active</span> : 'Subscribe'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* FIGSY Bundle plans */}
      <div className="bg-gradient-to-br from-[#001f4d] to-[#003080] rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-blue-400" />
          <h2 className="font-semibold">Lead Gen + FIGSY Bundle</h2>
          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Best value</span>
        </div>
        <p className="text-white/60 text-sm mb-4">Everything in Lead Gen, plus FIGSY — your AI SDR that runs outreach and books meetings.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['starter', 'advanced', 'enterprise'] as const).map((tier) => {
            const config = PRODUCTS.lead_gen_figsy.tiers[tier] as { price_usd: number; leads_per_month: number; custom?: boolean }
            const isActive = activeProducts.includes('lead_gen_figsy')
            const key = `lead_gen_figsy_${tier}`
            if (config.custom) {
              return (
                <div key={tier} className="bg-white/10 rounded-xl p-5 flex flex-col">
                  <p className="font-semibold capitalize">{TIER_LABELS[tier]}</p>
                  <p className="text-2xl font-bold mt-1">Custom</p>
                  <p className="text-xs text-white/50 mb-4">Full stack · Unlimited</p>
                  <a href="mailto:hello@kind.ai?subject=Enterprise%20Bundle" className="mt-auto w-full text-center text-sm font-medium rounded-lg px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors">Contact us</a>
                </div>
              )
            }
            return (
              <div key={tier} className={`rounded-xl p-5 flex flex-col ${tier === 'advanced' ? 'bg-white text-gray-900' : 'bg-white/10'}`}>
                {tier === 'advanced' && <span className="text-xs font-medium text-brand-500 mb-2">Most Popular</span>}
                <p className={`font-semibold ${tier === 'advanced' ? 'text-gray-900' : 'text-white'}`}>{TIER_LABELS[tier]}</p>
                <p className={`text-2xl font-bold mt-1 ${tier === 'advanced' ? 'text-gray-900' : 'text-white'}`}>${config.price_usd}<span className="text-sm font-normal opacity-60">/mo</span></p>
                <p className={`text-xs mb-4 ${tier === 'advanced' ? 'text-gray-400' : 'text-white/50'}`}>{config.leads_per_month} leads + FIGSY outreach</p>
                <button onClick={() => subscribe('lead_gen_figsy', tier)} disabled={isActive || initiating === key}
                  className={`mt-auto w-full text-sm font-medium rounded-lg px-4 py-2 transition-colors disabled:opacity-60
                    ${tier === 'advanced' ? 'bg-brand-500 hover:bg-brand-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'}
                    ${isActive ? '!bg-green-500/20 !text-green-300 cursor-default' : ''}`}>
                  {initiating === key ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isActive ? <span className="flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> Active</span> : 'Subscribe'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add-on: FIGSY for existing clients */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold mb-1">Add FIGSY to your existing plan</h2>
        <p className="text-sm text-gray-400 mb-4">Already on Lead Gen? Add FIGSY as an upgrade.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
          {(['starter', 'enterprise'] as const).map((tier) => (
            <div key={tier} className="border border-gray-100 rounded-xl p-5">
              <p className="font-semibold capitalize">FIGSY {TIER_LABELS[tier]}</p>
              <p className="text-2xl font-bold mt-1">+${FIGSY_ADDONS[tier].price_usd}<span className="text-sm font-normal text-gray-400">/mo</span></p>
              <p className="text-xs text-gray-400 mb-4">Add-on to any Lead Gen plan</p>
              <a href="mailto:hello@kind.ai?subject=FIGSY+Addon" className="block w-full text-center text-sm font-medium rounded-lg px-4 py-2 border border-gray-200 hover:border-brand-500 hover:text-brand-500 transition-colors">Request add-on</a>
            </div>
          ))}
        </div>
      </div>

      {/* Other products */}
      {(['virtual_assistant', 'chatbot'] as const).map((productKey) => {
        const product = PRODUCTS[productKey]
        return (
          <div key={productKey} className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold mb-4">{product.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.entries(product.tiers) as [string, { price_usd: number }][]).map(([tierKey, tier]) => {
                const isActive = activeProducts.includes(productKey)
                const key = `${productKey}_${tierKey}`
                return (
                  <div key={tierKey} className={`border rounded-xl p-5 ${tierKey === 'pro' ? 'border-brand-500 ring-1 ring-brand-500' : 'border-gray-100'}`}>
                    {tierKey === 'pro' && <span className="text-xs font-medium text-brand-500 mb-2 block">Most Popular</span>}
                    <p className="font-semibold capitalize">{TIER_LABELS[tierKey] || tierKey}</p>
                    <p className="text-2xl font-bold mt-1">${tier.price_usd}<span className="text-sm font-normal text-gray-400">/mo</span></p>
                    <button onClick={() => subscribe(productKey, tierKey)} disabled={isActive || initiating === key}
                      className={`w-full mt-4 text-sm font-medium rounded-lg px-4 py-2 transition-colors ${isActive ? 'bg-green-50 text-green-700 cursor-default' : 'bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-60'}`}>
                      {initiating === key ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : isActive ? <span className="flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> Active</span> : 'Subscribe'}
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
