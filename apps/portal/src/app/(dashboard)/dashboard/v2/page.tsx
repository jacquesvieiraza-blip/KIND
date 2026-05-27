export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import Link from 'next/link'
import {
  Users, Zap, TrendingUp, ShieldCheck, Coins, MessageSquare,
  ArrowRight, Target, Play, Inbox, BarChart2, AlertCircle,
  ChevronRight, Activity,
} from 'lucide-react'

// ── Type helpers ────────────────────────────────────────────────────────────
interface LeadStats { total: number; scored: number; consented: number; avg_score: number; pipeline_value_usd: number }
interface FigsyKPIs { totalSent: number; totalReplied: number; replyRate: number; interested: number; activeCampaigns: number }
interface Campaign { id: string; name: string; status: string; leads_enrolled?: number }
interface Lead { id: string; first_name: string; last_name: string; company: string | null; job_title: string | null; score: number | null }

// ── Small metric chip ───────────────────────────────────────────────────────
function Chip({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-ds-md px-4 py-3 border ${accent ? 'bg-brand-500/10 border-brand-500/20 dark:bg-brand-500/15' : 'ds-card'}`}>
      <p className={`text-2xl font-bold tracking-tight ${accent ? 'text-brand-500' : 'text-gray-900 dark:text-white'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs ds-text-muted mt-0.5">{label}</p>
    </div>
  )
}

// ── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">{title}</h2>
      {href && (
        <Link href={href} className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1 transition-colors">
          {linkLabel ?? 'View all'}<ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  )
}

// ── Status badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:              'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
    paused:              'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    paused_low_performance: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
    draft:               'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    completed:           'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  }
  const label: Record<string, string> = {
    active: 'Active', paused: 'Paused', paused_low_performance: 'Auto-paused',
    draft: 'Draft', completed: 'Done',
  }
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {label[status] ?? status}
    </span>
  )
}

// ── Score ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number | null }) {
  if (!score) return <span className="text-xs text-gray-400">—</span>
  const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-blue-500' : score >= 40 ? 'text-amber-500' : 'text-gray-400'
  return <span className={`text-sm font-bold ${color}`}>{score}</span>
}

export default async function MissionControlPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let companyName   = ''
  let creditBalance = 0
  let leadStats:  LeadStats | null = null
  let figsyKpis:  FigsyKPIs | null = null
  let campaigns:  Campaign[]       = []
  let topLeads:   Lead[]           = []
  let icpCount    = 0

  if (user) {
    const { data: clientRow } = await supabase
      .from('clients').select('company_name, credit_balance').eq('user_id', user.id).maybeSingle()
    companyName   = clientRow?.company_name ?? ''
    creditBalance = clientRow?.credit_balance ?? 0

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const [lsRes, fkRes, campRes, leadsRes, icpRes] = await Promise.allSettled([
        api.get<{ data: LeadStats }>('/leads/stats', session.access_token),
        api.get<{ data: FigsyKPIs }>('/figsy/kpis', session.access_token),
        api.get<{ data: Campaign[] }>('/figsy/campaigns', session.access_token),
        api.get<{ data: Lead[] }>('/leads?limit=5&sort=score&order=desc', session.access_token),
        api.get<{ data: unknown[] }>('/icps', session.access_token),
      ])
      if (lsRes.status   === 'fulfilled') leadStats = lsRes.value.data
      if (fkRes.status   === 'fulfilled') figsyKpis = fkRes.value.data
      if (campRes.status === 'fulfilled') campaigns  = (campRes.value.data ?? []).slice(0, 4)
      if (leadsRes.status === 'fulfilled') topLeads  = (leadsRes.value.data ?? []).slice(0, 5)
      if (icpRes.status  === 'fulfilled') icpCount   = (icpRes.value.data ?? []).length
    }
  }

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length

  return (
    <div className="space-y-ds-6 max-w-7xl">

      {/* ── Mission header ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-ds-2xl bg-gradient-to-br from-[#05091a] via-[#001f4d] to-[#003580] px-8 py-7 text-white">
        {/* Texture */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-brand-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 left-1/3 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-6">
          <div>
            <p className="text-white/45 text-sm font-medium">
              {greeting}{companyName ? `, ${companyName}` : ''} · Mission Control
            </p>
            <h1 className="text-2xl font-bold mt-1 tracking-tight">
              {activeCampaigns > 0
                ? `${activeCampaigns} campaign${activeCampaigns !== 1 ? 's' : ''} running`
                : icpCount > 0
                  ? 'Pipeline ready — start outreach'
                  : 'Set up your pipeline'}
            </h1>
            <p className="text-white/35 text-sm mt-1.5">
              {leadStats?.total
                ? `${leadStats.total.toLocaleString()} leads · $${(leadStats.pipeline_value_usd ?? 0).toLocaleString()} pipeline`
                : 'Build your ICP to start receiving leads'}
            </p>
          </div>

          {/* Live status */}
          <div className="shrink-0 flex items-center gap-2 bg-white/8 border border-white/10 rounded-ds-md px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/60 text-xs font-medium">Live</span>
          </div>
        </div>

        {/* Key metrics row */}
        <div className="relative mt-7 grid grid-cols-4 gap-px bg-white/10 rounded-xl overflow-hidden">
          {[
            { label: 'Total Leads',    value: (leadStats?.total ?? 0).toLocaleString() },
            { label: 'Pipeline Value', value: `$${(leadStats?.pipeline_value_usd ?? 0).toLocaleString()}` },
            { label: 'Avg Score',      value: leadStats?.avg_score ? `${leadStats.avg_score}/100` : '—' },
            { label: 'FIGSY Sent',     value: (figsyKpis?.totalSent ?? 0).toLocaleString() },
          ].map(m => (
            <div key={m.label} className="bg-white/[0.05] px-5 py-3.5 backdrop-blur-sm">
              <p className="text-white/40 text-[11px] uppercase tracking-widest font-semibold mb-1">{m.label}</p>
              <p className="text-xl font-bold tracking-tight">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column mission grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-ds-6">

        {/* ── Left: Lead pipeline ───────────────────────── */}
        <div className="col-span-3 space-y-ds-4">

          {/* Lead Gen stats */}
          <div className="ds-card p-5 shadow-ds-sm">
            <SectionHeader title="Lead Pipeline" href="/dashboard/leads" linkLabel="All leads" />
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Chip label="Total Leads"  value={leadStats?.total ?? 0} accent />
              <Chip label="Scored"       value={leadStats?.scored ?? 0} />
              <Chip label="POPIA Ready"  value={leadStats?.consented ?? 0} />
            </div>

            {/* No ICP state */}
            {icpCount === 0 && (
              <Link href="/dashboard/leads/icp"
                className="flex items-center justify-between p-4 rounded-ds-md bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-800 hover:border-brand-200 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Build your first ICP</p>
                    <p className="text-xs text-brand-500/70 dark:text-brand-400/60">Define your ideal customer to start receiving leads</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {/* Top leads table */}
            {topLeads.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Top scored leads</p>
                <div className="space-y-1">
                  {topLeads.map(lead => (
                    <div key={lead.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-ds-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {lead.job_title ?? '—'}{lead.company ? ` · ${lead.company}` : ''}
                        </p>
                      </div>
                      <ScoreRing score={lead.score} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topLeads.length === 0 && icpCount > 0 && (
              <div className="flex items-center justify-center py-8 text-sm text-gray-400 dark:text-gray-600">
                Searching for leads — check back shortly
              </div>
            )}
          </div>

          {/* Credits + secondary metrics */}
          <div className="grid grid-cols-3 gap-3">
            <Chip label="Credits"         value={creditBalance} />
            <Chip label="POPIA Consented" value={leadStats?.consented ?? 0} />
            <Chip label="Avg Score"       value={leadStats?.avg_score ? `${leadStats.avg_score}/100` : '—'} />
          </div>
        </div>

        {/* ── Right: FIGSY status ──────────────────────── */}
        <div className="col-span-2 space-y-ds-4">

          {/* FIGSY KPIs */}
          <div className="ds-card p-5 shadow-ds-sm">
            <SectionHeader title="FIGSY Outreach" href="/dashboard/figsy" linkLabel="Campaigns" />

            <div className="grid grid-cols-2 gap-3 mb-5">
              <Chip label="Sent"       value={figsyKpis?.totalSent ?? 0} />
              <Chip label="Replies"    value={figsyKpis?.totalReplied ?? 0} />
              <Chip label="Reply rate" value={figsyKpis?.replyRate ? `${(figsyKpis.replyRate * 100).toFixed(1)}%` : '—'} />
              <Chip label="Interested" value={figsyKpis?.interested ?? 0} accent />
            </div>

            {/* Campaign list */}
            {campaigns.length === 0 ? (
              <Link href="/dashboard/figsy"
                className="flex items-center justify-between p-3.5 rounded-ds-md bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <Play className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Start first campaign</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Campaigns</p>
                {campaigns.map(c => (
                  <div key={c.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-ds-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate pr-2">{c.name}</p>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inbox shortcut */}
          <Link href="/dashboard/figsy/replies"
            className="ds-card p-5 shadow-ds-sm flex items-center justify-between hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-ds-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950 rounded-ds-md flex items-center justify-center">
                <Inbox className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Reply Inbox</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Review and respond</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Low credits warning */}
          {creditBalance <= 10 && (
            <Link href="/dashboard/billing"
              className="flex items-center justify-between p-4 rounded-ds-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 hover:border-red-300 transition-colors group">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {creditBalance === 0 ? 'No credits — outreach paused' : `${creditBalance} credits left`}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </Link>
          )}
        </div>
      </div>

    </div>
  )
}
