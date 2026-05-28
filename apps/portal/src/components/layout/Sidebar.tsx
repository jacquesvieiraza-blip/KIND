'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Home, Users, Inbox, Target, BarChart, CreditCard, Settings,
  LogOut, Zap, FileText, Coins, Map, Bot, MessageSquare,
  BarChart2, Brain, Search, TrendingUp, Lock, ChevronDown, Webhook,
} from 'lucide-react'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'

type AgentId = 'figsy' | 'milla' | 'vida'

interface AgentDef {
  id: AgentId
  name: string
  role: string
  accent: string
  ring: string
  price?: string
  nav: { href: string; label: string; icon: React.ElementType; badge?: 'unread'; exact?: boolean }[]
}

const AGENTS: AgentDef[] = [
  {
    id: 'figsy',
    name: 'FIGSY',
    role: 'AI SDR',
    accent: '#7C3AED',
    ring: 'ring-[#7C3AED]/30',
    nav: [
      { href: '/dashboard/figsy',           label: 'Campaigns',   icon: Target },
      { href: '/dashboard/inbox',           label: 'Inbox',       icon: Inbox,  badge: 'unread' },
      { href: '/dashboard/kpis',            label: 'Performance', icon: BarChart },
      { href: '/dashboard/knowledge',       label: 'Knowledge',   icon: Brain },
      { href: '/dashboard/figsy/webhooks',  label: 'Webhooks',    icon: Webhook },
    ],
  },
  {
    id: 'milla',
    name: 'Milla',
    role: 'Virtual Assistant',
    accent: '#F472B6',
    ring: 'ring-pink-400/30',
    price: '$49/mo',
    nav: [
      { href: '/dashboard/assistant', label: 'Assistant', icon: Bot },
      { href: '/dashboard/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    id: 'vida',
    name: 'Vida',
    role: 'Chatbot Agent',
    accent: '#14B8A6',
    ring: 'ring-teal-400/30',
    price: '$39/mo',
    nav: [
      { href: '/dashboard/chatbot', label: 'Chatbot', icon: MessageSquare },
    ],
  },
]

const AGENT_HREFS: Record<AgentId, string> = {
  figsy: '/dashboard/figsy',
  milla: '/dashboard/assistant',
  vida:  '/dashboard/chatbot',
}

const LEAD_GEN_NAV = [
  { href: '/dashboard',                label: 'Home',            icon: Home,        exact: true },
  { href: '/dashboard/leads',          label: 'People',          icon: Users,       exact: true },
  { href: '/dashboard/leads/icp',      label: 'ICP Builder',     icon: TrendingUp },
  { href: '/dashboard/leads/linkedin', label: 'LinkedIn Import', icon: Search },
]

const ACCOUNT_NAV = [
  { href: '/dashboard/usage',    label: 'Usage',    icon: BarChart2 },
  { href: '/dashboard/roadmap',  label: 'Roadmap',  icon: Map },
  { href: '/dashboard/billing',  label: 'Billing',  icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

function SystemStatus() {
  const [status, setStatus] = React.useState<'checking' | 'ok' | 'degraded'>('checking')
  React.useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
    fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? setStatus('ok') : setStatus('degraded'))
      .catch(() => setStatus('degraded'))
  }, [])
  const dot   = status === 'ok' ? 'bg-emerald-400' : status === 'degraded' ? 'bg-amber-400' : 'bg-purple-400/40'
  const label = status === 'ok' ? 'All systems operational' : status === 'degraded' ? 'Service disruption' : 'Checking…'
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${status === 'ok' ? 'animate-pulse' : ''}`} />
      <span className="text-[11px] text-purple-300/50">{label}</span>
    </div>
  )
}

export function Sidebar({
  userEmail,
  creditBalance = 0,
  hasFigsy = false,
  hasMilla = false,
  hasVida  = false,
}: {
  userEmail: string
  creditBalance?: number
  hasFigsy?: boolean
  hasMilla?: boolean
  hasVida?: boolean
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [activeId, setActiveId] = useState<AgentId>('figsy')
  const [open, setOpen]         = useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)

  const isUnlocked = (id: AgentId) => id === 'figsy' ? hasFigsy : id === 'milla' ? hasMilla : hasVida
  const agent = AGENTS.find(a => a.id === activeId)!
  const unlocked = isUnlocked(activeId)

  React.useEffect(() => {
    if (!hasFigsy) return
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      try {
        const url = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
        const res = await fetch(`${url}/figsy/replies/unread`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: AbortSignal.timeout(5000),
        })
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data?.data?.count ?? 0)
        }
      } catch { /* silent */ }
    })
  }, [supabase, hasFigsy])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function NavLink({ href, label, icon: Icon, badge, exact }: {
    href: string; label: string; icon: React.ElementType; badge?: 'unread'; exact?: boolean
  }) {
    const active = exact
      ? pathname === href
      : pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
    const showUnread = badge === 'unread' && unreadCount > 0
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
          active
            ? 'bg-[#7C3AED] text-white shadow-sm shadow-purple-900/60'
            : 'text-purple-200/55 hover:text-white hover:bg-white/[0.07]'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {showUnread && (
          <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
            active ? 'bg-white text-[#7C3AED]' : 'bg-red-500 text-white'
          }`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside className="w-[240px] flex flex-col shrink-0 border-r border-white/[0.08]" style={{ background: "linear-gradient(180deg, #1E1152 0%, #160D3D 100%)" }}>

      {/* ── Logo ──────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-2.5 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-[#7C3AED] flex items-center justify-center shadow-sm shadow-purple-950/80">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-sm tracking-tight">K.I.N.D</span>
      </div>

      <nav className="flex-1 px-3 pt-3 pb-2 space-y-0.5 overflow-y-auto">

        {/* ── LEAD GEN — primary product ─────────────────────────── */}
        <p className="text-[10px] text-purple-400/40 px-3 pb-1.5 font-semibold uppercase tracking-wider">
          Lead Gen
        </p>
        {LEAD_GEN_NAV.map(item => <NavLink key={item.href} {...item} />)}

        {/* ── AI AGENTS — dropdown switcher ──────────────────────── */}
        <div className="!mt-5">
          <p className="text-[10px] text-purple-400/40 px-3 pb-2 font-semibold uppercase tracking-wider">
            AI Agents
          </p>

          {/* Active agent card — large */}
          <div className="flex items-center gap-0 rounded-xl bg-white/[0.07] hover:bg-white/[0.10] border border-white/[0.09] transition-all group overflow-hidden">
            {/* Main area — navigates to agent page */}
            <Link
              href={AGENT_HREFS[activeId]}
              className="flex items-center gap-3 px-3 py-3.5 flex-1 min-w-0"
            >
              {/* Large photo */}
              <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 ring-2 ${agent.ring} shadow-md`}>
                <img
                  src={`/agents/${agent.id}.png`}
                  alt={agent.name}
                  className="w-full h-full object-cover object-top"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white font-bold text-sm">{agent.name}</p>
                  {unlocked
                    ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    : <Lock className="w-3 h-3 text-purple-300/40" />
                  }
                </div>
                <p className="text-purple-300/50 text-xs">{agent.role}</p>
                {!unlocked && agent.price && (
                  <p className="text-[10px] text-purple-300/35 mt-0.5">{agent.price} · Tap to unlock</p>
                )}
              </div>
            </Link>
            {/* Chevron — only toggles agent switcher */}
            <button
              onClick={() => setOpen(o => !o)}
              className="px-2.5 py-3.5 text-purple-300/30 hover:text-purple-200 transition-colors shrink-0"
              title="Switch agent"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Dropdown */}
          {open && (
            <div className="mt-1.5 rounded-xl bg-[#1A0F47] border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/60 z-50">
              <p className="text-[10px] text-purple-400/40 px-3 pt-3 pb-1.5 font-semibold uppercase tracking-wider">
                Your AI Team
              </p>
              {AGENTS.map(a => {
                const locked = !isUnlocked(a.id)
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setActiveId(a.id)
                      setOpen(false)
                      router.push(AGENT_HREFS[a.id])
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-white/[0.06] transition-colors ${
                      a.id === activeId ? 'bg-white/[0.06]' : ''
                    }`}
                  >
                    {/* Medium photo in dropdown */}
                    <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 ring-2 ${locked ? 'ring-white/10 opacity-50' : a.ring}`}>
                      <img
                        src={`/agents/${a.id}.png`}
                        alt={a.name}
                        className="w-full h-full object-cover object-top"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-semibold leading-tight ${locked ? 'text-purple-200/40' : 'text-white'}`}>
                          {a.name}
                        </p>
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: a.accent, background: `${a.accent}18` }}
                        >
                          {a.role}
                        </span>
                      </div>
                      <p className="text-purple-300/35 text-[10px] mt-0.5">
                        {locked ? `${a.price} · Unlock →` : 'Active'}
                      </p>
                    </div>
                    {locked
                      ? <Lock className="w-3 h-3 text-purple-300/25 shrink-0" />
                      : a.id === activeId && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.accent }} />
                    }
                  </button>
                )
              })}
              <div className="mx-3 my-2 border-t border-white/[0.06]" />
              <p className="text-[10px] text-purple-300/30 px-3 pb-3 leading-relaxed">
                Unlock agents from{' '}
                <Link href="/dashboard/billing" className="text-purple-300/60 font-medium hover:text-purple-200 transition-colors" onClick={() => setOpen(false)}>
                  Billing →
                </Link>
              </p>
            </div>
          )}

          {/* Active agent nav — only if subscribed */}
          {unlocked ? (
            <div className="mt-1.5 space-y-0.5">
              {agent.nav.map(item => <NavLink key={item.href} {...item} />)}
            </div>
          ) : (
            <Link
              href={AGENT_HREFS[activeId]}
              className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-white/[0.08] text-xs text-purple-300/40 hover:text-purple-200 hover:border-white/[0.14] transition-all"
            >
              <Lock className="w-3 h-3" />
              View upgrade options
            </Link>
          )}
        </div>

        {/* ── Account ─────────────────────────────────────────────── */}
        <div className="!mt-5 border-t border-white/[0.06] !pt-3 space-y-0.5">
          {ACCOUNT_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                  active
                    ? 'bg-white/[0.10] text-purple-200'
                    : 'text-purple-300/35 hover:text-purple-200 hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </Link>
            )
          })}
        </div>

      </nav>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] space-y-1.5">
        <div className="px-3 flex items-center justify-between">
          <p className="text-purple-300/35 text-[11px] truncate">{userEmail}</p>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <NotificationBell />
            <div className="flex items-center gap-1 bg-[#F59E0B]/10 border border-[#F59E0B]/25 rounded-full px-2 py-0.5">
              <Coins className="w-3 h-3 text-[#F59E0B]" />
              <span className="text-[11px] font-bold text-[#F59E0B]">{creditBalance}</span>
            </div>
          </div>
        </div>
        <SystemStatus />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[12px] text-purple-300/35 hover:text-purple-200 hover:bg-white/[0.05] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
