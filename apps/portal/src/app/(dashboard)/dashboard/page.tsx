export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import { FirstRunChecklist } from '@/components/ui/FirstRunChecklist'
import { OneWalletExplainer } from '@/components/ui/OneWalletExplainer'
import { ActivityFeed, type ActivityEvent } from '@/components/ui/ActivityFeed'
import { WelcomeVideoCard } from '@/components/onboarding/WelcomeVideoCard'
import { LearningCentre } from '@/components/onboarding/LearningCentre'
import { Target, Inbox, ArrowRight, Zap, ChevronRight, Flame, ThermometerSun } from 'lucide-react'
import Link from 'next/link'
import { FigsyConversation } from './FigsyConversation'
import { CopyShareLink } from '@/components/ui/CopyShareLink'
import { v2Enabled } from '@/lib/flags'
import { DashboardHomeV2 } from './DashboardHomeV2'
import { DashboardLive } from './DashboardLive'

type TopLead = { id: string; first_name: string; last_name: string; company: string; job_title: string; score: number }
type FigsyKpis = { totalSent: number; totalReplied: number; interested: number; meetingsBooked: number }

export default async function DashboardPage() {
  if (process.env.FEATURE_PORTAL_V2 === 'true') {
    const { redirect } = await import('next/navigation')
    redirect('/dashboard/v2')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let companyName    = ''
  let clientId       = ''
  let subs: Record<string, unknown>[] = []
  let sparkPoints: number[] = [0, 0, 0, 0, 0, 0, 0]
  let figsyCampaigns: {
    id?: string; name?: string; status?: string
    emails_sent?: number; replies_total?: number
    replies_interested?: number; leads_enrolled?: number; meetings_booked?: number
  }[] = []
  type LeadStats = { total: number; consented: number; avg_score: number }
  let shareToken: string | null = null
  let leadStats: LeadStats | null = null
  let hotReplies: { id: string; from_email: string; leads?: { first_name?: string; last_name?: string; company?: string }; classification: string; received_at: string }[] = []
  let topLeads: TopLead[] = []
  let activityEvents: ActivityEvent[] = []
  // FIGSY headline numbers come from the REAL send-log (one source of truth, shared
  // with Performance/Deliverability/Analytics) — NOT the figsy_campaigns counters,
  // which drift. Counter sums remain only as a fallback if /figsy/kpis fails.
  let figsyKpis: FigsyKpis | null = null
  type OnboardingProgress = { hasIcp: boolean; hasLeads: boolean; hasReveal: boolean; hasEnrollment: boolean; hasPurchase: boolean }
  let onboarding: OnboardingProgress | null = null

  if (user) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('id, company_name, share_token, subscriptions(*)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (clientRow) {
      companyName   = clientRow.company_name ?? ''
      clientId      = clientRow.id as string ?? ''
      shareToken    = (clientRow as Record<string, unknown>).share_token as string | null ?? null
      subs          = (clientRow.subscriptions as Record<string, unknown>[]) ?? []
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session && clientId) {
      // Real sparkline: daily email sends for last 7 days
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: sparkData } = await supabase
          .from('figsy_sent_emails')
          .select('sent_at')
          .eq('client_id', clientId)
          .gte('sent_at', sevenDaysAgo)
        const dayMap: Record<string, number> = {}
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          dayMap[d.toISOString().split('T')[0]] = 0
        }
        for (const row of sparkData ?? []) {
          const key = (row.sent_at as string).split('T')[0]
          if (key in dayMap) dayMap[key]++
        }
        sparkPoints = Object.values(dayMap)
      } catch { /* keep default zeros */ }
    }
    if (session) {
      const [statsRes, figsyRes, repliesRes, leadsRes, activityRes, kpisRes, onboardingRes] = await Promise.allSettled([
        api.get<{ data: LeadStats }>('/leads/stats', session.access_token),
        api.get<{ data: typeof figsyCampaigns }>('/figsy/campaigns', session.access_token),
        api.get<{ data: typeof hotReplies }>('/figsy/replies/all?limit=5', session.access_token),
        api.get<{ data: TopLead[] }>('/leads?limit=5&sort=score&order=desc', session.access_token),
        api.get<{ data: ActivityEvent[] }>('/figsy/activity?limit=20', session.access_token),
        api.get<{ data: FigsyKpis }>('/figsy/kpis', session.access_token),
        api.get<{ data: OnboardingProgress }>('/onboarding/progress', session.access_token),
      ])
      if (statsRes.status === 'fulfilled')    leadStats       = statsRes.value.data
      if (figsyRes.status === 'fulfilled')    figsyCampaigns  = figsyRes.value.data ?? []
      if (repliesRes.status === 'fulfilled')  hotReplies      = repliesRes.value.data ?? []
      if (leadsRes.status === 'fulfilled')    topLeads        = leadsRes.value.data ?? []
      if (activityRes.status === 'fulfilled') activityEvents  = activityRes.value.data ?? []
      if (kpisRes.status === 'fulfilled')     figsyKpis       = kpisRes.value.data ?? null
      if (onboardingRes.status === 'fulfilled') onboarding    = onboardingRes.value.data ?? null
    }
  }

  // Real send-log numbers (one source of truth); counter sums are the fallback only.
  const totalSent       = figsyKpis?.totalSent     ?? figsyCampaigns.reduce((s, c) => s + (c.emails_sent ?? 0), 0)
  const totalReplies    = figsyKpis?.totalReplied  ?? figsyCampaigns.reduce((s, c) => s + (c.replies_total ?? 0), 0)
  const totalInterested = figsyKpis?.interested    ?? figsyCampaigns.reduce((s, c) => s + (c.replies_interested ?? 0), 0)
  const totalMeetings   = figsyKpis?.meetingsBooked ?? figsyCampaigns.reduce((s, c) => s + (c.meetings_booked ?? 0), 0)
  const activeCampaigns = figsyCampaigns.filter(c => c.status === 'active')
  const replyRate       = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0
  const leadCount       = leadStats?.total ?? 0

  // Greeting helpers
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = companyName
    ? companyName.split(' ')[0]
    : user?.email?.split('@')[0] ?? 'there'

  const greetingSubtitle = leadCount > 0 && totalReplies > 0
    ? `${leadCount.toLocaleString()} leads ready · FIGSY handled ${totalReplies} repl${totalReplies === 1 ? 'y' : 'ies'} this week`
    : leadCount > 0
    ? 'Your first leads are ready — FIGSY is standing by. Start outreach and let it run 24/7.'
    : 'Your AI Revenue OS is ready. Build your ICP and FIGSY handles outreach — no SDR required.'

  // ── V2 HOME (Agent Grid) — gated by FEATURE_V2_SCREENS=home. OFF by default. ──
  const isLive = (p: string) => subs.some((s) => {
    const sub = s as { product?: string; status?: string }
    return sub.product === p && (sub.status === 'active' || sub.status === 'trialing')
  })
  if (v2Enabled('home')) {
    return (
      <DashboardHomeV2
        firstName={firstName}
        timeOfDay={timeOfDay}
        sent={totalSent}
        replied={totalReplies}
        hot={totalInterested}
        shareToken={shareToken}
        hasFigsy={isLive('lead_gen_figsy') || isLive('figsy_addon')}
        hasMilla={isLive('virtual_assistant')}
        hasVida={isLive('chatbot')}
        hasDenise={isLive('denise') || isLive('denise_addon')}
        clientId={clientId}
        topLeadId={topLeads[0]?.id ?? null}
        hasIcp={onboarding?.hasIcp ?? false}
        hasLeadsOnb={onboarding?.hasLeads ?? (leadCount > 0)}
        hasReveal={onboarding?.hasReveal ?? false}
        hasEnrollment={onboarding?.hasEnrollment ?? (figsyCampaigns.length > 0)}
        hasPurchase={onboarding?.hasPurchase ?? false}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="pt-1 pb-2">
        <h2 className="text-2xl font-bold text-[#1E1152] leading-tight">
          Good {timeOfDay}, {firstName}
        </h2>
        <p className="text-sm text-[#7C3AED]/60 mt-0.5">{greetingSubtitle}</p>
      </div>

      {/* Welcome video + guided-tour launcher (#454) — first login only. */}
      <WelcomeVideoCard />

      {/* First-run checklist (#447) — the four money-model steps, lit from real
          data (/onboarding/progress). Hides permanently once all four are done. */}
      {clientId && (
        <FirstRunChecklist
          clientId={clientId}
          hasIcp={onboarding?.hasIcp ?? false}
          hasLeads={onboarding?.hasLeads ?? (leadCount > 0)}
          hasReveal={onboarding?.hasReveal ?? false}
          hasEnrollment={onboarding?.hasEnrollment ?? (figsyCampaigns.length > 0)}
          topLeadId={topLeads[0]?.id ?? null}
        />
      )}

      {/* One-wallet explainer (#447) — shows until the first wallet top-up. */}
      {clientId && (
        <OneWalletExplainer clientId={clientId} hasPurchase={onboarding?.hasPurchase ?? false} />
      )}

      {/* FIGSY conversation — tour anchor: step 1 "Welcome" points here (#454). */}
      <div data-tour="figsy-card">
      <FigsyConversation
        leadCount={leadCount}
        campaignCount={figsyCampaigns.length}
        activeCampaignCount={activeCampaigns.length}
        totalEmailsSent={totalSent}
        totalInterested={totalInterested}
        topLeads={topLeads}
        hotReplies={hotReplies}
        activeCampaigns={activeCampaigns}
        companyName={companyName}
      />
      </div>

      {/* Stats — only when there's real activity; realtime updates via DashboardLive */}
      {totalSent > 0 && shareToken && (
        <div className="flex justify-end">
          <CopyShareLink token={shareToken} />
        </div>
      )}
      <DashboardLive
        clientId={clientId}
        initialLeadCount={leadCount}
        initialTotalSent={totalSent}
        initialTotalReplies={totalReplies}
        initialTotalInterested={totalInterested}
        initialTotalMeetings={totalMeetings}
        initialActiveCampaignCount={activeCampaigns.length}
        initialReplyRate={replyRate}
        initialSparkPoints={sparkPoints}
      />

      {/* Active campaigns + hot replies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Active Campaigns */}
        <div className="bg-white rounded-2xl border border-[#EDE9FE] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-[#7C3AED]" />
              </div>
              <h2 className="font-semibold text-[#1E0A5C] text-sm">Active Campaigns</h2>
            </div>
            <Link href="/dashboard/figsy" className="text-xs text-[#7C3AED] hover:underline flex items-center gap-0.5">
              All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {activeCampaigns.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#7C3AED]/60" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1E0A5C]">
                  {leadCount > 0 ? `FIGSY has ${leadCount} leads ready` : 'FIGSY is ready when you are'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {leadCount > 0
                    ? 'Launch a campaign and FIGSY will write your first outreach sequence.'
                    : 'Build an ICP and FIGSY will find your first leads within minutes.'}
                </p>
              </div>
              <Link href={leadCount > 0 ? '/dashboard/figsy' : '/dashboard/leads/icp'} className="text-xs text-[#7C3AED] font-semibold hover:underline">
                {leadCount > 0 ? 'Launch a campaign →' : 'Build my ICP →'}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCampaigns.slice(0, 4).map(c => {
                const sent = c.emails_sent ?? 0, enrolled = c.leads_enrolled ?? 0
                const interested = c.replies_interested ?? 0
                const rate = sent > 0 ? Math.round((interested / sent) * 100) : 0
                const pct  = enrolled > 0 ? Math.min(100, Math.round((sent / enrolled) * 100)) : 0
                return (
                  <Link key={c.id} href={`/dashboard/figsy/${c.id}`} className="block group">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-[#1E0A5C] group-hover:text-[#7C3AED] transition-colors truncate">{c.name ?? 'Campaign'}</p>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[10px] text-slate-400">{sent} sent</span>
                        {rate > 0 && <span className="text-[10px] font-semibold text-emerald-600">{rate}% reply</span>}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#EDE9FE] overflow-hidden">
                      <div className="h-full rounded-full bg-[#7C3AED] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{pct}% of {enrolled} enrolled leads contacted</p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Hot Replies */}
        <div className="bg-white rounded-2xl border border-[#EDE9FE] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-red-500" />
              </div>
              <h2 className="font-semibold text-[#1E0A5C] text-sm">Hot Replies</h2>
              {totalInterested > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{totalInterested}</span>
              )}
            </div>
            <Link href="/dashboard/inbox" className="text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
              Open Inbox <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {hotReplies.length === 0 ? (
            <Link href="/dashboard/inbox" className="flex flex-col items-center py-6 gap-3 rounded-xl border border-dashed border-purple-100 hover:border-[#7C3AED]/40 hover:bg-purple-50/30 transition-colors cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                <Inbox className="w-5 h-5 text-[#7C3AED]/60" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[#1E0A5C]">No replies yet</p>
                <p className="text-xs text-slate-400 mt-0.5 max-w-[200px]">Campaigns usually see first replies within 48–72 hours of sending.</p>
              </div>
              <span className="text-xs font-semibold text-[#7C3AED] flex items-center gap-1">Go to Inbox <ArrowRight className="w-3 h-3" /></span>
            </Link>
          ) : (
            <div className="space-y-2">
              {hotReplies.map(r => {
                const name = r.leads ? `${r.leads.first_name ?? ''} ${r.leads.last_name ?? ''}`.trim() : r.from_email
                const company = r.leads?.company ?? ''
                const mins = Math.floor((Date.now() - new Date(r.received_at).getTime()) / 60000)
                const timeAgo = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`
                const isHot = r.classification === 'hot'
                return (
                  <Link key={r.id} href="/dashboard/inbox" className="flex items-center gap-3 p-3 rounded-xl bg-[#FFFBF5] border border-[#EDE9FE] hover:border-[#7C3AED]/30 transition-colors group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isHot ? 'bg-red-100' : 'bg-amber-100'}`}>
                      {isHot ? <Flame className="w-4 h-4 text-red-500" /> : <ThermometerSun className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1E0A5C] truncate">{name}</p>
                      {company && <p className="text-xs text-slate-400 truncate">{company}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400">{timeAgo}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#7C3AED] transition-colors" />
                    </div>
                  </Link>
                )
              })}
              {totalInterested > 5 && (
                <Link href="/dashboard/inbox" className="block text-center text-xs text-[#7C3AED] font-semibold py-2 hover:underline">
                  +{totalInterested - 5} more replies →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Activity feed — real data */}
      <ActivityFeed events={activityEvents} />

      {/* Learning Centre (#454, Phase 6) — permanent "Learn with FIGSY" grid. */}
      <LearningCentre />
    </div>
  )
}
