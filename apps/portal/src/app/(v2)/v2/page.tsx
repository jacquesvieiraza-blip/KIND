export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import Link from 'next/link'
import {
  ArrowRight, Zap, MessageSquare, Bot, Play, Inbox,
  TrendingUp, Users, Mail, Flame, ChevronRight, Circle,
  CheckCircle2, Clock, Settings,
} from 'lucide-react'

interface FigsyKPIs {
  totalSent: number
  totalReplied: number
  replyRate: number
  interested: number
  activeCampaigns: number
}

interface Campaign {
  id: string
  name: string
  status: string
  created_at: string
}

interface Reply {
  id: string
  from_email: string
  classification: string
  processed_at: string
  leads?: { first_name?: string; last_name?: string } | null
}

// ── Agent status pill ────────────────────────────────────────────────────────
function AgentStatus({ live }: { live: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
      live
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-gray-100 text-gray-400 border border-gray-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
      {live ? 'Active' : 'Coming soon'}
    </span>
  )
}

// ── Metric pill inside agent card ────────────────────────────────────────────
function AgentMetric({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold tracking-tight ${highlight ? 'text-[#7C3AED]' : 'text-gray-900'}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-gray-400 mt-0.5 whitespace-nowrap">{label}</p>
    </div>
  )
}

// ── Hot reply badge ──────────────────────────────────────────────────────────
function ClassBadge({ cls }: { cls: string }) {
  const map: Record<string, string> = {
    hot: 'bg-red-50 text-red-600 border border-red-200',
    interested: 'bg-red-50 text-red-600 border border-red-200',
    warm: 'bg-amber-50 text-amber-600 border border-amber-200',
    cold: 'bg-blue-50 text-blue-500 border border-blue-200',
    not_interested: 'bg-blue-50 text-blue-500 border border-blue-200',
    opt_out: 'bg-rose-50 text-rose-600 border border-rose-200',
  }
  const labels: Record<string, string> = {
    hot: '🔥 Hot', interested: '🔥 Hot', warm: '🌤 Warm',
    cold: '❄️ Cold', not_interested: '❄️ Cold', opt_out: '🚫 Opt out',
  }
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${map[cls] ?? 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
      {labels[cls] ?? cls}
    </span>
  )
}

export default async function V2Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let companyName   = ''
  let creditBalance = 0
  let figsyKpis: FigsyKPIs | null = null
  let campaigns: Campaign[] = []
  let recentReplies: Reply[] = []

  if (user) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('company_name, credit_balance, id')
      .eq('user_id', user.id)
      .maybeSingle()

    companyName   = clientRow?.company_name ?? ''
    creditBalance = clientRow?.credit_balance ?? 0

    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const [kpiRes, campRes] = await Promise.allSettled([
        api.get<{ data: FigsyKPIs }>('/figsy/kpis', session.access_token),
        api.get<{ data: Campaign[] }>('/figsy/campaigns', session.access_token),
      ])
      if (kpiRes.status === 'fulfilled')  figsyKpis = kpiRes.value.data
      if (campRes.status === 'fulfilled') campaigns = (campRes.value.data ?? []).slice(0, 5)
    }

    if (clientRow?.id) {
      const { data: replies } = await supabase
        .from('figsy_replies')
        .select('id, from_email, classification, processed_at, leads(first_name, last_name)')
        .eq('client_id', clientRow.id)
        .in('classification', ['hot', 'interested', 'warm'])
        .order('processed_at', { ascending: false })
        .limit(5)
      recentReplies = (replies ?? []) as Reply[]
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = companyName || user?.email?.split('@')[0] || 'there'
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length
  const hotReplies = recentReplies.filter(r => r.classification === 'hot' || r.classification === 'interested').length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* ── Greeting ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Your AI sales team is{activeCampaigns > 0 ? ' working' : ' ready to launch'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hotReplies > 0 && (
              <Link href="/dashboard/inbox"
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
                <Flame className="w-4 h-4" />
                {hotReplies} hot {hotReplies === 1 ? 'reply' : 'replies'}
              </Link>
            )}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500">
              <span className="font-semibold text-[#7C3AED]">{creditBalance.toLocaleString()}</span>
              <span>credits</span>
            </div>
          </div>
        </div>

        {/* ── Agent cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-5">

          {/* FIGSY */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            {/* Card header */}
            <div className="bg-gradient-to-br from-[#7C3AED] to-[#6025c0] px-5 py-5 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
              <div className="absolute -bottom-4 right-8 w-16 h-16 bg-white/5 rounded-full" />
              <div className="relative">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-2xl">🤖</span>
                </div>
                <h2 className="text-white font-bold text-lg leading-tight">FIGSY</h2>
                <p className="text-white/60 text-xs mt-0.5">AI Sales Development Rep</p>
              </div>
            </div>

            {/* Status + metrics */}
            <div className="px-5 py-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <AgentStatus live={true} />
                <span className="text-xs text-gray-400">{activeCampaigns} active</span>
              </div>

              <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-100 mb-4">
                <AgentMetric label="Sent" value={figsyKpis?.totalSent ?? 0} />
                <AgentMetric label="Replied" value={figsyKpis?.totalReplied ?? 0} />
                <AgentMetric label="Hot leads" value={figsyKpis?.interested ?? 0} highlight />
              </div>

              <div className="space-y-1.5 flex-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Campaigns</p>
                {campaigns.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No campaigns yet</p>
                ) : (
                  campaigns.slice(0, 3).map(c => (
                    <div key={c.id} className="flex items-center justify-between py-1.5">
                      <p className="text-sm text-gray-700 truncate pr-2">{c.name}</p>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        c.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}>{c.status === 'active' ? 'Live' : 'Draft'}</span>
                    </div>
                  ))
                )}
              </div>

              <Link href="/dashboard/figsy"
                className="mt-4 w-full flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6025c0] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                Open FIGSY <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Milla */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] px-5 py-5 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
              <div className="relative">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-2xl">💼</span>
                </div>
                <h2 className="text-white font-bold text-lg">Milla</h2>
                <p className="text-white/60 text-xs mt-0.5">Virtual Executive Assistant</p>
              </div>
            </div>

            <div className="px-5 py-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <AgentStatus live={false} />
              </div>

              <div className="flex-1 space-y-3">
                {[
                  'Calendar & meeting management',
                  'Email drafting & follow-ups',
                  'Research & briefing documents',
                  'Task delegation & tracking',
                ].map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <Circle className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-400">{feat}</p>
                  </div>
                ))}
              </div>

              <button disabled
                className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 text-sm font-semibold py-2.5 rounded-xl cursor-not-allowed">
                Coming soon
              </button>
            </div>
          </div>

          {/* Vida */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gradient-to-br from-[#10b981] to-[#059669] px-5 py-5 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
              <div className="relative">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <span className="text-2xl">💬</span>
                </div>
                <h2 className="text-white font-bold text-lg">Vida</h2>
                <p className="text-white/60 text-xs mt-0.5">Website Chatbot Agent</p>
              </div>
            </div>

            <div className="px-5 py-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <AgentStatus live={false} />
              </div>

              <div className="flex-1 space-y-3">
                {[
                  '24/7 website visitor engagement',
                  'Lead capture & qualification',
                  'Product FAQ & demo booking',
                  'Handoff to human reps',
                ].map(feat => (
                  <div key={feat} className="flex items-start gap-2.5">
                    <Circle className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-400">{feat}</p>
                  </div>
                ))}
              </div>

              <button disabled
                className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 text-sm font-semibold py-2.5 rounded-xl cursor-not-allowed">
                Coming soon
              </button>
            </div>
          </div>
        </div>

        {/* ── Bottom row: activity + quick actions ──────────────────────── */}
        <div className="grid grid-cols-3 gap-5">

          {/* Recent hot replies */}
          <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent replies</h3>
              <Link href="/dashboard/inbox" className="text-xs text-[#7C3AED] hover:underline font-medium flex items-center gap-1">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentReplies.length === 0 ? (
              <div className="py-8 text-center">
                <Inbox className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Replies will appear here as leads respond</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentReplies.map(r => {
                  const lead = Array.isArray(r.leads) ? r.leads[0] : r.leads
                  const name = lead
                    ? `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || r.from_email
                    : r.from_email
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-gray-500">
                            {name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{name}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(r.processed_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <ClassBadge cls={r.classification} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Quick actions</h3>
            <div className="space-y-2">
              {[
                { href: '/dashboard/figsy', icon: <Play className="w-4 h-4" />, label: 'New campaign', color: 'bg-[#7C3AED]/10 text-[#7C3AED]' },
                { href: '/dashboard/leads/icp', icon: <Users className="w-4 h-4" />, label: 'Build ICP', color: 'bg-blue-50 text-blue-600' },
                { href: '/dashboard/inbox', icon: <Inbox className="w-4 h-4" />, label: 'Check inbox', color: 'bg-amber-50 text-amber-600' },
                { href: '/dashboard/analytics', icon: <TrendingUp className="w-4 h-4" />, label: 'View analytics', color: 'bg-emerald-50 text-emerald-600' },
                { href: '/dashboard/settings', icon: <Settings className="w-4 h-4" />, label: 'Settings', color: 'bg-gray-100 text-gray-600' },
              ].map(({ href, icon, label, color }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    {icon}
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
