export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import { StatCard } from '@/components/ui/StatCard'
import { ProductCard } from '@/components/ui/ProductCard'
import { OnboardingBanner } from '@/components/ui/OnboardingBanner'
import { OnboardingChecklist } from '@/components/ui/OnboardingChecklist'
import { ReferralBanner } from '@/components/ui/ReferralBanner'
import {
  Users, Bot, MessageSquare, TrendingUp, Zap, ShieldCheck,
  Coins, DollarSign, ArrowRight, Target, AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

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

// ── Today bar — contextual next action ───────────────────────────────────────
function TodayBar({
  hasIcps, leadTotal, figsyCount, creditBalance,
}: {
  hasIcps: boolean
  leadTotal: number
  figsyCount: number
  creditBalance: number
}) {
  if (creditBalance === 0) {
    return (
      <Link href="/dashboard/billing"
        className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl px-5 py-3.5 hover:border-red-300 dark:hover:border-red-700 transition-colors group">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm font-medium text-red-700 dark:text-red-300">No credits — outreach is paused. Top up to resume.</p>
        </div>
        <ArrowRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </Link>
    )
  }
  if (!hasIcps) {
    return (
      <Link href="/dashboard/leads/icp"
        className="flex items-center justify-between gap-3 bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-800 rounded-xl px-5 py-3.5 hover:border-brand-200 dark:hover:border-brand-700 transition-colors group">
        <div className="flex items-center gap-3">
          <Target className="w-4 h-4 text-brand-500 shrink-0" />
          <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
            Build your first ICP to start receiving targeted leads
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-brand-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </Link>
    )
  }
  if (leadTotal > 0 && figsyCount === 0) {
    return (
      <Link href="/dashboard/figsy"
        className="flex items-center justify-between gap-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 rounded-xl px-5 py-3.5 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors group">
        <div className="flex items-center gap-3">
          <Zap className="w-4 h-4 text-indigo-500 shrink-0" />
          <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            You have {leadTotal.toLocaleString()} leads ready — start FIGSY outreach to contact them
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </Link>
    )
  }
  // All good — quiet running indicator
  return (
    <div className="flex items-center gap-3 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900 rounded-xl px-5 py-3.5">
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
      <p className="text-sm text-green-700 dark:text-green-400 font-medium">Pipeline running — leads searching, outreach active</p>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let companyName   = ''
  let creditBalance = 0
  let clientId: string | null = null
  let subs: Record<string, unknown>[] = []
  let leadStats  = null
  let icpCount   = 0
  let figsyCount = 0

  if (user) {
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

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const [statsRes, icpRes, figsyRes] = await Promise.allSettled([
        api.get<{ data: Record<string, unknown> }>('/leads/stats', session.access_token),
        api.get<{ data: unknown[] }>('/icps', session.access_token),
        api.get<{ data: unknown[] }>('/figsy/campaigns', session.access_token),
      ])
      if (statsRes.status === 'fulfilled')  leadStats  = statsRes.value.data
      if (icpRes.status === 'fulfilled')    icpCount   = (icpRes.value.data ?? []).length
      if (figsyRes.status === 'fulfilled')  figsyCount = (figsyRes.value.data ?? []).length
    }
  }

  const { state, trialDaysLeft } = getBannerState(subs)
  const stats = leadStats as { total: number; scored: number; consented: number; avg_score: number; pipeline_value_usd: number } | null

  const hasProduct = (product: string) =>
    subs.some(s => s.product === product && (s.status === 'active' || s.status === 'trialing'))
  const hasFigsy   = hasProduct('lead_gen_figsy')
  const hasVA      = hasProduct('virtual_assistant')
  const hasChatbot = hasProduct('chatbot')

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-5">

      {/* ── Hero panel ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#001220] via-[#001f4d] to-[#003580] p-7 text-white">
        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Glow accent */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <p className="text-white/50 text-sm">{greeting}{companyName ? `, ${companyName}` : ''}</p>
          <h1 className="text-2xl font-bold mt-1">Your pipeline at a glance</h1>

          <div className="mt-7 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
            <div>
              <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1.5">Pipeline Value</p>
              <p className="text-3xl font-bold tracking-tight">
                ${(stats?.pipeline_value_usd ?? 0).toLocaleString()}
              </p>
              <p className="text-white/35 text-xs mt-1">estimated deal value</p>
            </div>
            <div>
              <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1.5">Total Leads</p>
              <p className="text-3xl font-bold tracking-tight">
                {(stats?.total ?? 0).toLocaleString()}
              </p>
              <p className="text-white/35 text-xs mt-1">sourced by K.I.N.D</p>
            </div>
            <div>
              <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest mb-1.5">Avg Score</p>
              <p className="text-3xl font-bold tracking-tight">
                {stats?.avg_score ?? 0}
                <span className="text-lg text-white/35 font-normal ml-1">/100</span>
              </p>
              <p className="text-white/35 text-xs mt-1">ICP match quality</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Today bar — contextual action ───────────────────────────────── */}
      <TodayBar
        hasIcps={icpCount > 0}
        leadTotal={stats?.total ?? 0}
        figsyCount={figsyCount}
        creditBalance={creditBalance}
      />

      {/* ── Onboarding + trial banners ───────────────────────────────────── */}
      <OnboardingChecklist
        hasCompanyName={!!companyName}
        hasIcps={icpCount > 0}
        hasLeads={(stats?.total ?? 0) > 0}
        hasFigsyCampaigns={figsyCount > 0}
      />
      <OnboardingBanner state={state} trialDaysLeft={trialDaysLeft} />

      {/* ── Secondary stats strip ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Scored Leads"    value={stats?.scored ?? 0}    icon={<TrendingUp className="w-4 h-4" />}   color="indigo" size="small" />
        <StatCard label="POPIA Consented" value={stats?.consented ?? 0} icon={<ShieldCheck className="w-4 h-4" />}  color="green"  size="small" />
        <StatCard label="Credits"         value={creditBalance}          icon={<Coins className="w-4 h-4" />}        color="yellow" size="small" />
      </div>

      {/* ── Referral banner ──────────────────────────────────────────────── */}
      {clientId && <ReferralBanner referralCode={clientId} />}

      {/* ── AI Products ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Your AI Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ProductCard
            title="AI Lead Generation"
            description="Precision-targeted B2B leads, scored and POPIA-compliant."
            icon={<Users className="w-5 h-5" />}
            href="/dashboard/leads"
            status="active"
            metric={`${stats?.total ?? 0} leads sourced`}
          />
          <ProductCard
            title="FIGSY — AI SDR"
            description="Autonomous outreach: personalise, send, follow up, book."
            icon={<Zap className="w-5 h-5" />}
            href="/dashboard/figsy"
            status={hasFigsy ? 'active' : 'locked'}
            metric={hasFigsy ? `${figsyCount} campaign${figsyCount !== 1 ? 's' : ''}` : 'Lead Gen + FIGSY bundle'}
            upgradeHref="/dashboard/billing"
          />
          <ProductCard
            title="Virtual Assistant"
            description="Scheduling, email drafting, and knowledge queries."
            icon={<Bot className="w-5 h-5" />}
            href="/dashboard/assistant"
            status={hasVA ? 'active' : 'locked'}
            metric={hasVA ? 'Ready to use' : 'Add-on'}
            upgradeHref="/dashboard/billing"
          />
          <ProductCard
            title="Chatbot Agent"
            description="Web and WhatsApp AI chatbot for your customers."
            icon={<MessageSquare className="w-5 h-5" />}
            href="/dashboard/chatbot"
            status={hasChatbot ? 'active' : 'locked'}
            metric={hasChatbot ? 'Configure your bot' : 'Add-on'}
            upgradeHref="/dashboard/billing"
          />
        </div>
      </div>

    </div>
  )
}
