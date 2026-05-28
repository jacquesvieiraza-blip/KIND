export const dynamic = 'force-dynamic'

// ── Feature flag: FEATURE_PORTAL_V2=true → Mission Control dashboard ────────
import { redirect } from 'next/navigation'

if (process.env.FEATURE_PORTAL_V2 === 'true') {
  // In V2, the dashboard root redirects to /dashboard/v2 (mission control)
  // This re-export handles it cleanly
}

// ── V1 imports ───────────────────────────────────────────────────────────────
import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import { OnboardingBanner } from '@/components/ui/OnboardingBanner'
import { OnboardingChecklist } from '@/components/ui/OnboardingChecklist'
import { ActivityFeed, type ActivityEvent } from '@/components/ui/ActivityFeed'
import {
  Target, Inbox, ArrowRight, Zap,
  Calendar, TrendingUp, Mail, ChevronRight,
  Flame, ThermometerSun,
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

// ── Mini sparkline SVG ──────────────────────────────────────────────────────

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null
  const max = Math.max(...points, 1)
  const w = 80
  const h = 28
  const step = w / (points.length - 1)
  const coords = points.map((v, i) => `${i * step},${h - (v / max) * h}`)
  const d = `M ${coords.join(' L ')}`
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={coords.join(' ')} />
    </svg>
  )
}

export default async function DashboardPage() {
  // V2: redirect to mission control
  if (process.env.FEATURE_PORTAL_V2 === 'true') {
    redirect('/dashboard/v2')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let companyName    = ''
  let creditBalance  = 0
  let subs: Record<string, unknown>[] = []
  let icpCount       = 0
  let figsyCampaigns: {
    id?: string
    name?: string
    status?: string
    emails_sent?: number
    replies_total?: number
    replies_interested?: number
    leads_enrolled?: number
    meetings_booked?: number
  }[] = []
  type LeadStats = { total: number; consented: number; avg_score: number }
  let leadStats: LeadStats | null = null
  let hotReplies: { id: string; from_email: string; leads?: { first_name?: string; last_name?: string; company?: string }; classification: string; received_at: string }[] = []

  if (user) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('company_name, credit_balance, subscriptions(*)')
      .eq('user_id', user.id)
      .maybeSingle()

    if (clientRow) {
      companyName   = clientRow.company_name ?? ''
      creditBalance = clientRow.credit_balance ?? 0
      subs          = (clientRow.subscriptions as Record<string, unknown>[]) ?? []
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const [statsRes, icpRes, figsyRes, repliesRes] = await Promise.allSettled([
        api.get<{ data: LeadStats }>('/leads/stats', session.access_token),
        api.get<{ data: unknown[] }>('/icps', session.access_token),
        api.get<{ data: typeof figsyCampaigns }>('/figsy/campaigns', session.access_token),
        api.get<{ data: typeof hotReplies }>('/figsy/replies?classification=hot&limit=3', session.access_token),
      ])
      if (statsRes.status === 'fulfilled')   leadStats      = statsRes.value.data
      if (icpRes.status === 'fulfilled')     icpCount       = (icpRes.value.data ?? []).length
      if (figsyRes.status === 'fulfilled')   figsyCampaigns = figsyRes.value.data ?? []
      if (repliesRes.status === 'fulfilled') hotReplies     = repliesRes.value.data ?? []
    }
  }

  const { state, trialDaysLeft } = getBannerState(subs)

  // ── Aggregate metrics ──────────────────────────────────────────────────────
  const totalSent       = figsyCampaigns.reduce((s, c) => s + (c.emails_sent ?? 0), 0)
  const totalReplies    = figsyCampaigns.reduce((s, c) => s + (c.replies_total ?? 0), 0)
  const totalInterested = figsyCampaigns.reduce((s, c) => s + (c.replies_interested ?? 0), 0)
  const totalMeetings   = figsyCampaigns.reduce((s, c) => s + (c.meetings_booked ?? 0), 0)
  const activeCampaigns = figsyCampaigns.filter(c => c.status === 'active')
  const replyRate       = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0
  const bookingRate     = totalSent > 0 ? ((totalMeetings / totalSent) * 100).toFixed(1) : '0.0'

  // ── Compass completion ─────────────────────────────────────────────────────
  const compassDone = [
    !!companyName,
    icpCount > 0,
    (leadStats?.total ?? 0) > 0,
    figsyCampaigns.length > 0,
  ].filter(Boolean).length
  const compassTotal = 4

  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'

  // Fake 7-day sparkline from aggregated data (will be real when per-day API exists)
  const sparkPoints = totalSent > 0
    ? [Math.floor(totalSent * 0.08), Math.floor(totalSent * 0.12), Math.floor(totalSent * 0.10), Math.floor(totalSent * 0.15), Math.floor(totalSent * 0.18), Math.floor(totalSent * 0.20), Math.floor(totalSent * 0.17)]
    : [0, 0, 1, 2, 1, 3, 2]

  return (
    <div className="space-y-4 max-w-6xl">

      {/* Onboarding */}
      <OnboardingChecklist hasCompanyName={!!companyName} hasIcps={icpCount > 0} hasLeads={(leadStats?.total ?? 0) > 0} hasFigsyCampaigns={figsyCampaigns.length > 0} />
      <OnboardingBanner state={state} trialDaysLeft={trialDaysLeft} />

      {/* ── Proactive FIGSY prompt — W8 ────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] rounded-2xl p-6 text-white mb-6 shadow-lg shadow-purple-900/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">FIGSY is ready</p>
            <h2 className="text-xl font-bold mb-1">Who should we target today?</h2>
            <p className="text-white/70 text-sm mb-4">
              Describe your ideal prospect and FIGSY will find matching leads from 250M+ contacts.
            </p>
            <a href="/dashboard/leads/icp"
              className="inline-flex items-center gap-2 bg-white text-[#7C3AED] font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition-colors shadow-sm">
              <Target className="w-4 h-4" />
              Build your ICP → Find leads
            </a>
          </div>
          <div className="hidden sm:grid grid-cols-3 gap-3 text-center shrink-0">
            {[
              { label: 'Leads found', value: leadStats?.total ?? 0 },
              { label: 'Hot replies', value: hotReplies.length },
              { label: 'Campaigns', value: figsyCampaigns.length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 rounded-xl px-3 py-2.5">
                <p className="text-xl font-bold">{value}</p>
                <p className="text-[11px] text-white/60 font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick action chips — W8 ───────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { label: '🔥 Review hot replies', href: '/dashboard/figsy', show: hotReplies.length > 0 },
          { label: '✉️ Launch a campaign', href: '/dashboard/figsy', show: true },
          { label: '👥 View my leads', href: '/dashboard/leads', show: (leadStats?.total ?? 0) > 0 },
          { label: '⚙️ Update my ICP', href: '/dashboard/leads/icp', show: true },
        ].filter(item => item.show).map(item => (
          <a key={item.label} href={item.href}
            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-white/80 border border-purple-100/60 text-gray-700 hover:border-[#7C3AED]/40 hover:text-[#7C3AED] transition-colors shadow-sm backdrop-blur-sm">
            {item.label}
          </a>
        ))}
      </div>

      {/* ── HERO ROW — FIGSY greeting + compass progress ──────────────── */}
      <div className="flex items-start gap-4 bg-white rounded-2xl border border-[#EDE9FE] px-5 py-4 shadow-sm">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-[#7C3AED]/20 shadow-md shadow-purple-200/40">
            <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-400 mb-0.5">
            Good {timeOfDay}{companyName ? ` · ${companyName}` : ''} — FIGSY is ready
          </p>
          <h1 className="text-lg font-bold text-[#1E0A5C] leading-tight">
            {totalSent === 0 ? 'Let\'s start your first campaign' : 'Your pipeline, at a glance'}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <Link href="/dashboard/figsy" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-full transition-colors shadow-sm shadow-purple-400/30">
              <Target className="w-3 h-3" />
              New campaign
            </Link>
            {totalInterested > 0 && (
              <Link href="/dashboard/figsy/replies" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-medium text-emerald-700 rounded-full transition-colors">
                <Inbox className="w-3 h-3" />
                {totalInterested} interested
              </Link>
            )}
            {totalMeetings > 0 && (
              <Link href="/dashboard/kpis" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F0FF] hover:bg-[#EDE9FE] border border-[#EDE9FE] text-xs font-medium text-[#7C3AED] rounded-full transition-colors">
                <Calendar className="w-3 h-3" />
                {totalMeetings} meetings booked
              </Link>
            )}
          </div>
        </div>
        {/* Compass mini progress */}
        {compassDone < compassTotal && (
          <Link href="/dashboard/settings" className="shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-[#FFFBF5] border border-[#EDE9FE] hover:border-[#7C3AED]/30 transition-colors">
            <div className="flex gap-1">
              {Array.from({ length: compassTotal }).map((_, i) => (
                <span key={i} className={`w-2 h-2 rounded-full ${i < compassDone ? 'bg-[#7C3AED]' : 'bg-[#EDE9FE]'}`} />
              ))}
            </div>
            <p className="text-[10px] text-slate-400 whitespace-nowrap">Setup {compassDone}/{compassTotal}</p>
          </Link>
        )}
      </div>

      {/* ── 5-STAT COMMAND BAR ────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            label: 'Sent',
            value: totalSent.toLocaleString(),
            sub: 'emails',
            color: 'text-slate-700',
            bg: 'bg-white',
            border: 'border-[#EDE9FE]',
            trend: sparkPoints,
            trendColor: '#7C3AED',
          },
          {
            label: 'Reply Rate',
            value: `${replyRate}%`,
            sub: replyRate >= 8 ? '↑ above avg' : 'avg 8%',
            color: replyRate >= 8 ? 'text-emerald-600' : 'text-slate-700',
            bg: replyRate >= 8 ? 'bg-emerald-50/50' : 'bg-white',
            border: replyRate >= 8 ? 'border-emerald-200' : 'border-[#EDE9FE]',
            trend: null,
            trendColor: '',
          },
          {
            label: 'Interested',
            value: totalInterested.toLocaleString(),
            sub: 'warm leads',
            color: 'text-amber-600',
            bg: totalInterested > 0 ? 'bg-amber-50/40' : 'bg-white',
            border: totalInterested > 0 ? 'border-amber-200' : 'border-[#EDE9FE]',
            trend: null,
            trendColor: '',
          },
          {
            label: 'Meetings Booked',
            value: totalMeetings.toLocaleString(),
            sub: `${bookingRate}% · Alta: 3–5%`,
            color: 'text-[#7C3AED]',
            bg: totalMeetings > 0 ? 'bg-[#F5F0FF]' : 'bg-white',
            border: totalMeetings > 0 ? 'border-[#EDE9FE]' : 'border-[#EDE9FE]',
            trend: null,
            trendColor: '',
          },
          {
            label: 'Active Campaigns',
            value: activeCampaigns.length.toString(),
            sub: `${figsyCampaigns.length} total`,
            color: 'text-slate-700',
            bg: 'bg-white',
            border: 'border-[#EDE9FE]',
            trend: null,
            trendColor: '',
          },
        ].map(({ label, value, sub, color, bg, border, trend, trendColor }) => (
          <div key={label} className={`rounded-xl border ${bg} ${border} px-4 py-3 flex flex-col gap-1`}>
            <p className="text-[11px] text-slate-400 font-medium">{label}</p>
            <div className="flex items-end justify-between gap-1">
              <p className={`text-2xl font-bold tracking-tight leading-none ${color}`}>{value}</p>
              {trend && <MiniSparkline points={trend} color={trendColor} />}
            </div>
            <p className="text-[10px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── TWO-COLUMN MAIN VIEW ──────────────────────────────────────── */}
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
            <div className="flex flex-col items-center py-6 gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#7C3AED]/40" />
              </div>
              <p className="text-sm text-slate-400 text-center">No active campaigns yet</p>
              <Link href="/dashboard/figsy" className="text-xs text-[#7C3AED] font-semibold hover:underline">
                Launch your first campaign →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCampaigns.slice(0, 4).map(c => {
                const sent       = c.emails_sent ?? 0
                const enrolled   = c.leads_enrolled ?? 0
                const interested = c.replies_interested ?? 0
                const rate       = sent > 0 ? Math.round((interested / sent) * 100) : 0
                const pct        = enrolled > 0 ? Math.min(100, Math.round((sent / enrolled) * 100)) : 0
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

        {/* Hot Inbox Preview */}
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
            <Link href="/dashboard/figsy/replies" className="text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
              Open Inbox <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {hotReplies.length === 0 ? (
            <Link href="/dashboard/figsy/replies" className="flex flex-col items-center py-6 gap-3 rounded-xl border border-dashed border-purple-100 hover:border-[#7C3AED]/40 hover:bg-purple-50/30 transition-colors cursor-pointer group">
              <div className="w-10 h-10 rounded-xl bg-[#F5F0FF] group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                <Inbox className="w-5 h-5 text-[#7C3AED]/60" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500">No replies yet</p>
                <p className="text-xs text-slate-300 mt-0.5">Hot and warm prospects appear here the moment they reply</p>
              </div>
              <span className="text-xs font-semibold text-[#7C3AED] flex items-center gap-1">
                Go to Inbox <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ) : (
            <div className="space-y-2">
              {hotReplies.map(r => {
                const name = r.leads ? `${r.leads.first_name ?? ''} ${r.leads.last_name ?? ''}`.trim() : r.from_email
                const company = r.leads?.company ?? ''
                const timeAgo = (() => {
                  const mins = Math.floor((Date.now() - new Date(r.received_at).getTime()) / 60000)
                  if (mins < 60) return `${mins}m ago`
                  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
                  return `${Math.floor(mins / 1440)}d ago`
                })()
                const isHot = r.classification === 'hot'
                return (
                  <Link key={r.id} href="/dashboard/figsy/replies" className="flex items-center gap-3 p-3 rounded-xl bg-[#FFFBF5] border border-[#EDE9FE] hover:border-[#7C3AED]/30 transition-colors group">
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
              {totalInterested > 3 && (
                <Link href="/dashboard/figsy/replies" className="block text-center text-xs text-[#7C3AED] font-semibold py-2 hover:underline">
                  +{totalInterested - 3} more replies →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── PERFORMANCE STRIP ─────────────────────────────────────────── */}
      {figsyCampaigns.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#EDE9FE] px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span className="text-xs font-semibold text-slate-500">Pipeline</span>
              </div>
              {[
                { label: 'Total leads', value: (leadStats?.total ?? 0).toLocaleString() },
                { label: 'Emails sent',  value: totalSent.toLocaleString() },
                { label: 'Replies',      value: totalReplies.toLocaleString() },
                { label: 'Interested',   value: totalInterested.toLocaleString() },
                { label: 'Meetings',     value: totalMeetings.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[#1E0A5C]">{value}</span>
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/kpis" className="text-xs text-[#7C3AED] font-semibold hover:underline flex items-center gap-0.5">
                Full report <ArrowRight className="w-3 h-3" />
              </Link>
              <Link href="/dashboard/figsy/replies" className="text-xs text-[#7C3AED] font-semibold hover:underline flex items-center gap-0.5">
                <Mail className="w-3 h-3" /> Inbox
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVITY FEED ─────────────────────────────────────────────── */}
      {(() => {
        const mockEvents: ActivityEvent[] = [
          { id: '1', type: 'email_sent',       description: 'FIGSY sent Day 1 email to Sarah Chen at Acme Corp',       timestamp: new Date(Date.now() - 8 * 60000).toISOString() },
          { id: '2', type: 'reply_received',   description: "Hot reply from Marcus Williams — \"Interested, let's chat\"", timestamp: new Date(Date.now() - 23 * 60000).toISOString() },
          { id: '3', type: 'lead_added',       description: '12 new leads added from ICP: Cape Town Fintechs',         timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
          { id: '4', type: 'credit_used',      description: '3 credits used — 3 leads delivered',                      timestamp: new Date(Date.now() - 5 * 3600000).toISOString() },
          { id: '5', type: 'campaign_created', description: 'Campaign "Q2 SA Outreach" created',                       timestamp: new Date(Date.now() - 24 * 3600000).toISOString() },
        ]
        return <ActivityFeed events={mockEvents} />
      })()}

    </div>
  )
}
