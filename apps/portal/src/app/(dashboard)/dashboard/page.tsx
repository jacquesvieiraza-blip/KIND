export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import { StatCard } from '@/components/ui/StatCard'
import { ProductCard } from '@/components/ui/ProductCard'
import { OnboardingBanner } from '@/components/ui/OnboardingBanner'
import { ReferralBanner } from '@/components/ui/ReferralBanner'
import { Users, Bot, MessageSquare, TrendingUp, Zap, ShieldCheck, Coins, DollarSign } from 'lucide-react'

type BannerState = 'no_form' | 'awaiting_signature' | 'awaiting_payment' | 'trial' | 'none'

function getBannerState(orderForm: Record<string, unknown> | null, subscriptions: Record<string, unknown>[]): { state: BannerState; trialDaysLeft?: number } {
  const active   = subscriptions.some(s => s.status === 'active')
  const trialing = subscriptions.find(s => s.status === 'trialing')

  if (active) return { state: 'none' }

  if (trialing && trialing.trial_ends_at) {
    const daysLeft = Math.ceil((new Date(trialing.trial_ends_at as string).getTime() - Date.now()) / 86400000)
    const clamped  = Math.max(0, daysLeft)

    // Order form must be signed during (and after) trial
    if (!orderForm || orderForm.status !== 'signed') {
      return { state: 'awaiting_signature', trialDaysLeft: clamped }
    }
    if (daysLeft <= 0) return { state: 'awaiting_payment' }
    return { state: 'trial', trialDaysLeft: clamped }
  }

  if (!orderForm) return { state: 'no_form' }
  if (orderForm.status === 'sent')   return { state: 'awaiting_signature' }
  if (orderForm.status === 'signed') return { state: 'awaiting_payment' }

  return { state: 'no_form' }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  let client      = null
  let leadStats   = null
  let orderForm   = null
  let subs: Record<string, unknown>[] = []

  if (session) {
    try {
      const [clientRes, statsRes, docsRes] = await Promise.all([
        api.get<{ data: Record<string, unknown> }>('/clients/me', session.access_token),
        api.get<{ data: Record<string, unknown> }>('/leads/stats', session.access_token).catch(() => ({ data: null })),
        api.get<{ data: { order_form: Record<string, unknown> | null } }>('/order-forms/me', session.access_token).catch(() => ({ data: { order_form: null } })),
      ])
      client    = clientRes.data
      leadStats = statsRes.data
      orderForm = docsRes.data.order_form
      subs      = (client?.subscriptions as Record<string, unknown>[]) || []
    } catch { }
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Zap className="w-12 h-12 text-brand-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Welcome to K.I.N.D</h2>
          <p className="text-gray-500 mb-4">Complete your business profile to get started.</p>
          <a href="/onboard" className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors">Set up my profile</a>
        </div>
      </div>
    )
  }

  const { state, trialDaysLeft } = getBannerState(orderForm, subs)
  const stats   = leadStats as { total: number; scored: number; consented: number; exported: number; avg_score: number; pipeline_value_usd: number } | null
  const credits = (client as { credit_balance?: number }).credit_balance ?? 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {(client as { company_name: string }).company_name}</h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening with your pipeline today.</p>
      </div>

      {/* Three-tier onboarding banner */}
      <OnboardingBanner state={state} trialDaysLeft={trialDaysLeft} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Leads"     value={stats?.total ?? 0}              icon={<Users className="w-5 h-5" />}       color="blue" />
        <StatCard label="Scored"          value={stats?.scored ?? 0}             icon={<TrendingUp className="w-5 h-5" />}  color="indigo" />
        <StatCard label="POPIA Consented" value={stats?.consented ?? 0}          icon={<ShieldCheck className="w-5 h-5" />} color="green" />
        <StatCard label="Avg Score"       value={stats?.avg_score ?? 0} suffix="/100" icon={<TrendingUp className="w-5 h-5" />} color="purple" />
        <StatCard label="Credits"         value={credits}                        icon={<Coins className="w-5 h-5" />}       color="yellow" />
        <StatCard label="Pipeline Value"  value={stats?.pipeline_value_usd ?? 0} prefix="$" icon={<DollarSign className="w-5 h-5" />} color="green" />
      </div>

      {/* Referral banner — only show for active/trialing clients */}
      {(client as { id?: string }).id && (
        <ReferralBanner referralCode={(client as { id: string }).id} />
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Your AI Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProductCard title="AI Lead Generation"  description="Precision-targeted B2B leads, scored and POPIA-compliant." icon={<Users className="w-6 h-6" />}         href="/dashboard/leads"    status="active" metric={`${stats?.total ?? 0} leads this month`} />
          <ProductCard title="Virtual Assistant"   description="Scheduling, email drafting, and knowledge queries."       icon={<Bot className="w-6 h-6" />}           href="/dashboard/assistant" status="active" metric="Ready to use" />
          <ProductCard title="Chatbot Agent"       description="Web and WhatsApp AI chatbot for your customers."          icon={<MessageSquare className="w-6 h-6" />} href="/dashboard/chatbot"   status="active" metric="Configure your bot" />
        </div>
      </div>
    </div>
  )
}
