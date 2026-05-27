export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import { OnboardingBanner } from '@/components/ui/OnboardingBanner'
import {
  Users, TrendingUp, ShieldCheck, Coins, Target,
  Inbox, BarChart, CheckCircle2, Circle, ArrowRight,
  Zap, Bot, MessageSquare, ChevronRight, BookOpen, Brain,
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

function StatPill({
  label,
  value,
  prefix = '',
  suffix = '',
  highlight = false,
}: {
  label: string
  value: number | string
  prefix?: string
  suffix?: string
  highlight?: boolean
}) {
  return (
    <div className={`flex flex-col gap-0.5 p-4 rounded-2xl border ${highlight ? 'bg-[#0066FF] border-[#0066FF]' : 'bg-white border-gray-100'}`}>
      <p className={`text-2xl font-bold tracking-tight ${highlight ? 'text-white' : 'text-gray-900'}`}>
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
      <p className={`text-xs ${highlight ? 'text-blue-100' : 'text-gray-400'}`}>{label}</p>
    </div>
  )
}

function CompassStep({
  done,
  label,
  href,
}: {
  done: boolean
  label: string
  href: string
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors group ${
        done
          ? 'bg-green-50 border-green-100'
          : 'bg-gray-50 border-gray-100 hover:border-[#0066FF]/30 hover:bg-blue-50/40'
      }`}
    >
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
      ) : (
        <Circle className="w-4 h-4 text-gray-300 shrink-0 group-hover:text-[#0066FF]/60 transition-colors" />
      )}
      <span className={`text-sm flex-1 ${done ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
        {label}
      </span>
      {!done && (
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0066FF] transition-colors" />
      )}
    </Link>
  )
}

function AgentTeamCard({
  initial,
  gradient,
  name,
  role,
  description,
  href,
  active,
  comingSoon,
}: {
  initial: string
  gradient: string
  name: string
  role: string
  description: string
  href: string
  active: boolean
  comingSoon?: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/60 transition-all group"
    >
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <span className="text-[10px] text-gray-400">{role}</span>
          {comingSoon && (
            <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-medium ml-auto">
              Soon
            </span>
          )}
          {active && !comingSoon && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto animate-pulse" />
          )}
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-gray-200 group-hover:text-gray-400 transition-colors shrink-0" />
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let companyName    = ''
  let creditBalance  = 0
  let subs: Record<string, unknown>[] = []
  let leadStats      = null
  let icpCount       = 0
  let figsyCount     = 0
  let figsyCampaigns: { emails_sent?: number; replies_total?: number; replies_interested?: number; leads_enrolled?: number }[] = []

  if (user) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id, company_name, credit_balance, subscriptions(*)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (clientRow) {
      companyName   = clientRow.company_name ?? ''
      creditBalance = clientRow.credit_balance ?? 0
      subs          = (clientRow.subscriptions as Record<string, unknown>[]) ?? []
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const [statsRes, icpRes, figsyRes] = await Promise.allSettled([
        api.get<{ data: Record<string, unknown> }>('/leads/stats', session.access_token),
        api.get<{ data: unknown[] }>('/icps', session.access_token),
        api.get<{ data: typeof figsyCampaigns }>('/figsy/campaigns', session.access_token),
      ])
      if (statsRes.status === 'fulfilled')  leadStats     = statsRes.value.data
      if (icpRes.status === 'fulfilled')    icpCount      = (icpRes.value.data ?? []).length
      if (figsyRes.status === 'fulfilled') {
        figsyCampaigns = figsyRes.value.data ?? []
        figsyCount     = figsyCampaigns.length
      }
    }
  }

  const { state, trialDaysLeft } = getBannerState(subs)
  const stats = leadStats as {
    total: number
    scored: number
    consented: number
    avg_score: number
    pipeline_value_usd: number
  } | null

  const hasProduct = (p: string) =>
    subs.some(s => s.product === p && (s.status === 'active' || s.status === 'trialing'))
  const hasFigsy   = hasProduct('lead_gen_figsy') || hasProduct('figsy_addon')
  const hasVA      = hasProduct('virtual_assistant')
  const hasChatbot = hasProduct('chatbot')

  // Aggregate FIGSY metrics for stats bar
  const totalEnrolled   = figsyCampaigns.reduce((s, c) => s + (c.leads_enrolled ?? 0), 0)
  const totalSent       = figsyCampaigns.reduce((s, c) => s + (c.emails_sent ?? 0), 0)
  const totalReplies    = figsyCampaigns.reduce((s, c) => s + (c.replies_total ?? 0), 0)
  const totalInterested = figsyCampaigns.reduce((s, c) => s + (c.replies_interested ?? 0), 0)
  const replyRate       = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0

  // Compass completion
  const compassSteps = [
    { done: !!companyName,              label: 'Set up company profile',    href: '/dashboard/settings' },
    { done: icpCount > 0,               label: 'Define your ICP',           href: '/dashboard/leads/icp' },
    { done: (stats?.total ?? 0) > 0,    label: 'Import your first leads',   href: '/dashboard/leads' },
    { done: figsyCount > 0,             label: 'Launch a FIGSY campaign',   href: '/dashboard/figsy' },
    { done: false,                      label: 'Train FIGSY — add your pitch & keywords', href: '/dashboard/knowledge' },
  ]
  const compassDone = compassSteps.filter(s => s.done).length

  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── FIGSY Hero ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {/* FIGSY avatar */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0066FF] to-[#003d99] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
              F
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">
              Good {timeOfDay}{companyName ? `, ${companyName}` : ''} — I'm FIGSY, your AI SDR.
            </p>
            <h1 className="text-xl font-bold text-gray-900 mb-3">
              Who should we target today?
            </h1>

            {/* CRM suggestion chips */}
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/figsy" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] hover:bg-blue-600 text-white text-xs font-semibold rounded-full transition-colors shadow-sm shadow-blue-400/30">
                <Target className="w-3 h-3" />
                Start new campaign
              </Link>
              {(stats?.consented ?? 0) > 0 && (
                <Link href="/dashboard/leads?filter=consented" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700 rounded-full transition-colors">
                  <Users className="w-3 h-3 text-green-500" />
                  {stats!.consented.toLocaleString()} consented leads
                </Link>
              )}
              {totalInterested > 0 && (
                <Link href="/dashboard/figsy/replies" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-xs font-medium text-green-700 rounded-full transition-colors">
                  <Inbox className="w-3 h-3" />
                  {totalInterested} interested {totalInterested === 1 ? 'reply' : 'replies'}
                </Link>
              )}
              {figsyCount > 0 && (
                <Link href="/dashboard/kpis" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-xs font-medium text-gray-700 rounded-full transition-colors">
                  <BarChart className="w-3 h-3 text-indigo-400" />
                  View performance
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatPill label="Total leads"     value={stats?.total ?? 0}    highlight />
        <StatPill label="Enrolled"        value={totalEnrolled}        />
        <StatPill label="Emails sent"     value={totalSent}            />
        <StatPill label="Reply rate"      value={replyRate} suffix="%" />
        <StatPill label="Interested"      value={totalInterested}      />
      </div>

      {/* ── Two-column section ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Compass */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0066FF]/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#0066FF]" />
              </div>
              <h2 className="font-semibold text-gray-900 text-sm">Setup Compass</h2>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              compassDone === compassSteps.length
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {compassDone}/{compassSteps.length}
            </span>
          </div>
          <div className="space-y-2">
            {compassSteps.map(step => (
              <CompassStep key={step.href} done={step.done} label={step.label} href={step.href} />
            ))}
          </div>
        </div>

        {/* Agent team */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-gray-500" />
            </div>
            <h2 className="font-semibold text-gray-900 text-sm">Your AI Team</h2>
          </div>
          <div className="space-y-2">
            <AgentTeamCard
              initial="F"
              gradient="from-[#0066FF] to-[#003d99]"
              name="FIGSY"
              role="AI SDR"
              description="Finds leads, writes emails, books meetings"
              href="/dashboard/figsy"
              active={hasFigsy}
            />
            <AgentTeamCard
              initial="M"
              gradient="from-purple-500 to-purple-900"
              name="Milla"
              role="Virtual Assistant"
              description="Handles emails, scheduling & knowledge queries"
              href="/dashboard/assistant"
              active={hasVA}
              comingSoon={!hasVA}
            />
            <AgentTeamCard
              initial="V"
              gradient="from-teal-400 to-cyan-700"
              name="Vida"
              role="Chatbot Agent"
              description="Converts website & WhatsApp visitors 24/7"
              href="/dashboard/chatbot"
              active={hasChatbot}
              comingSoon={!hasChatbot}
            />
          </div>
        </div>
      </div>

      {/* ── FIGSY performance summary (only if campaigns exist) ─── */}
      {figsyCount > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <BarChart className="w-4 h-4 text-[#0066FF]" />
              FIGSY at a glance
            </h2>
            <Link href="/dashboard/kpis" className="text-xs text-[#0066FF] hover:underline flex items-center gap-0.5">
              Full report <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Active campaigns', value: figsyCampaigns.filter((c: any) => c.status === 'active').length },
              { label: 'Total enrolled',   value: totalEnrolled.toLocaleString() },
              { label: 'Emails sent',      value: totalSent.toLocaleString() },
              { label: 'Hot replies',      value: totalInterested },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <OnboardingBanner state={state} trialDaysLeft={trialDaysLeft} />
    </div>
  )
}
