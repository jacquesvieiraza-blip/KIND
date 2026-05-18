export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import { StatCard } from '@/components/ui/StatCard'
import { ProductCard } from '@/components/ui/ProductCard'
import { OnboardingBanner } from '@/components/ui/OnboardingBanner'
import { OnboardingChecklist } from '@/components/ui/OnboardingChecklist'
import { ReferralBanner } from '@/components/ui/ReferralBanner'
import { Users, Bot, MessageSquare, TrendingUp, Zap, ShieldCheck, Coins, DollarSign } from 'lucide-react'

type BannerState = 'awaiting_payment' | 'trial' | 'none'

function getBannerState(subscriptions: Record<string, unknown>[]): { state: BannerState; trialDaysLeft?: number } {
  const active   = subscriptions.some(s => s.status === 'active')
  const trialing = subscriptions.find(s => s.status === 'trialing')
  if (active) return { state: 'none' }
  if (trialing && trialing.trial_ends_at) {
    const daysLeft = Math.ceil((new Date(trialing.trial_ends_at as string).getTime() - Date.now()) / 86400000)
    if (daysLeft <= 0) return { state: 'awaiting_payment' }
    return { state: 'trial', trialDaysLeft: Math.max(0, daysLeft) }
  }
  if (subscriptions.length === 0) return { state: 'none' }
  return { state: 'awaiting_payment' }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let companyName = ''
  let creditBalance = 0
  let clientId: string | null = null
  let subs: Record<string, unknown>[] = []
  let leadStats = null
  let icpCount  = 0
  let figsyCount = 0

  if (user) {
    // Read profile + subscriptions directly from Supabase — no Railway dependency
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id, company_name, credit_balance, subscriptions(*)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (clientRow) {
      companyName   = clientRow.company_name ?? ''
      creditBalance = clientRow.credit_balance ?? 0
      clientId      = clientRow.id
      subs          = (clientRow.subscriptions as Record<string, unknown>[]) ?? []
    }

    // Stats from Railway — optional, silent fallback if unreachable
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const [statsRes, icpRes, figsyRes] = await Promise.allSettled([
        api.get<{ data: Record<string, unknown> }>('/leads/stats', session.access_token),
        api.get<{ data: unknown[] }>('/icps', session.access_token),
        api.get<{ data: unknown[] }>('/figsy/campaigns', session.access_token),
      ])
      if (statsRes.status === 'fulfilled') leadStats = statsRes.value.data
      if (icpRes.status === 'fulfilled')   icpCount  = (icpRes.value.data ?? []).length
      if (figsyRes.status === 'fulfilled') figsyCount = (figsyRes.value.data ?? []).length
    }
  }

  const { state, trialDaysLeft } = getBannerState(subs)
  const stats = leadStats as { total: number; scored: number; consented: number; exported: number; avg_score: number; pipeline_value_usd: number } | null

  const hasProduct = (product: string) =>
    subs.some(s => s.product === product && (s.status === 'active' || s.status === 'trialing'))
  const hasFigsy   = hasProduct('lead_gen_figsy')
  const hasVA      = hasProduct('virtual_assistant')
  const hasChatbot = hasProduct('chatbot')

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{companyName ? `${greeting}, ${companyName}` : greeting}</h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening with your pipeline today.</p>
      </div>

      <OnboardingChecklist
        hasCompanyName={!!companyName}
        hasIcps={icpCount > 0}
        hasLeads={(stats?.total ?? 0) > 0}
        hasFigsyCampaigns={figsyCount > 0}
      />

      <OnboardingBanner state={state} trialDaysLeft={trialDaysLeft} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Leads"     value={stats?.total ?? 0}               icon={<Users className="w-5 h-5" />}       color="blue" />
        <StatCard label="Scored"          value={stats?.scored ?? 0}              icon={<TrendingUp className="w-5 h-5" />}  color="indigo" />
        <StatCard label="POPIA Consented" value={stats?.consented ?? 0}           icon={<ShieldCheck className="w-5 h-5" />} color="green" />
        <StatCard label="Avg Score"       value={stats?.avg_score ?? 0} suffix="/100" icon={<TrendingUp className="w-5 h-5" />} color="purple" />
        <StatCard label="Credits"         value={creditBalance}                   icon={<Coins className="w-5 h-5" />}       color="yellow" />
        <StatCard label="Pipeline Value"  value={stats?.pipeline_value_usd ?? 0}  prefix="$" icon={<DollarSign className="w-5 h-5" />} color="green" />
      </div>

      {clientId && <ReferralBanner referralCode={clientId} />}

      <div>
        <h2 className="text-lg font-semibold mb-4">Your AI Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProductCard title="AI Lead Generation" description="Precision-targeted B2B leads, scored and POPIA-compliant." icon={<Users className="w-6 h-6" />}         href="/dashboard/leads"     status="active"                    metric={`${stats?.total ?? 0} leads this month`} />
          <ProductCard title="FIGSY — AI SDR"     description="Autonomous outreach: personalise, send, follow up, book." icon={<Zap className="w-6 h-6" />}            href="/dashboard/figsy"     status={hasFigsy ? 'active' : 'locked'}   metric={hasFigsy ? `${figsyCount} campaigns` : 'Lead Gen + FIGSY bundle'} upgradeHref="/dashboard/billing" />
          <ProductCard title="Virtual Assistant"  description="Scheduling, email drafting, and knowledge queries."       icon={<Bot className="w-6 h-6" />}           href="/dashboard/assistant" status={hasVA ? 'active' : 'locked'}      metric={hasVA ? 'Ready to use' : 'Add-on — coming soon'} upgradeHref="/dashboard/billing" />
          <ProductCard title="Chatbot Agent"      description="Web and WhatsApp AI chatbot for your customers."          icon={<MessageSquare className="w-6 h-6" />} href="/dashboard/chatbot"   status={hasChatbot ? 'active' : 'locked'}  metric={hasChatbot ? 'Configure your bot' : 'Add-on — coming soon'} upgradeHref="/dashboard/billing" />
        </div>
      </div>
    </div>
  )
}
