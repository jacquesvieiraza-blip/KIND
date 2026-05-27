'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Home, Users, Inbox, Target, BarChart, CreditCard, Settings,
  LogOut, Zap, FileText, Coins, Map, Bot, MessageSquare,
  ChevronDown, BarChart2, Brain, Search, TrendingUp,
} from 'lucide-react'
import { NotificationBell } from '@/components/ui/NotificationBell'

type AgentId = 'figsy' | 'milla' | 'vida'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
}

interface AgentDef {
  id: AgentId
  name: string
  role: string
  gradient: string
  ringColor: string
  initial: string
  description: string
  nav: NavItem[]
  available: boolean
  accentColor: string
}

const AGENTS: AgentDef[] = [
  {
    id: 'figsy',
    name: 'FIGSY',
    role: 'AI SDR',
    gradient: 'from-[#7C3AED] to-[#4C1D95]',
    ringColor: 'ring-[#7C3AED]/30',
    accentColor: '#7C3AED',
    initial: 'F',
    description: 'Outbound campaigns & sequences',
    available: true,
    nav: [
      { href: '/dashboard',               label: 'Home',        icon: Home },
      { href: '/dashboard/figsy',         label: 'Campaigns',   icon: Target },
      { href: '/dashboard/figsy/replies', label: 'Inbox',       icon: Inbox,   badge: 'unread' },
      { href: '/dashboard/kpis',          label: 'Performance', icon: BarChart },
      { href: '/dashboard/knowledge',     label: 'Knowledge',   icon: Brain },
    ],
  },
  {
    id: 'milla',
    name: 'Milla',
    role: 'Virtual Assistant',
    gradient: 'from-pink-400 to-purple-600',
    ringColor: 'ring-pink-400/30',
    accentColor: '#F472B6',
    initial: 'M',
    description: 'Email, scheduling & knowledge',
    available: false,
    nav: [
      { href: '/dashboard',           label: 'Home',      icon: Home },
      { href: '/dashboard/assistant', label: 'Assistant', icon: Bot },
      { href: '/dashboard/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    id: 'vida',
    name: 'Vida',
    role: 'Chatbot Agent',
    gradient: 'from-teal-400 to-cyan-600',
    ringColor: 'ring-teal-400/30',
    accentColor: '#14B8A6',
    initial: 'V',
    description: 'Website & WhatsApp inbound',
    available: false,
    nav: [
      { href: '/dashboard',         label: 'Home',    icon: Home },
      { href: '/dashboard/chatbot', label: 'Chatbot', icon: MessageSquare },
    ],
  },
]

// Lead Gen — standalone product section
const LEAD_GEN_NAV: NavItem[] = [
  { href: '/dashboard/leads',          label: 'People',          icon: Users },
  { href: '/dashboard/leads/icp',      label: 'ICP Builder',     icon: TrendingUp },
  { href: '/dashboard/leads/linkedin', label: 'LinkedIn Import', icon: Search },
]

const BOTTOM_NAV: NavItem[] = [
  { href: '/dashboard/usage',    label: 'Usage',    icon: BarChart2 },
  { href: '/dashboard/roadmap',  label: 'Roadmap',  icon: Map },
  { href: '/dashboard/billing',  label: 'Billing',  icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

// ── Agent avatar ──────────────────────────────────────────────────────────────

function AgentAvatar({ agent, size = 'md' }: { agent: AgentDef; size?: 'sm' | 'md' | 'lg' }) {
  const sizes     = { sm: 'w-8 h-8',   md: 'w-11 h-11', lg: 'w-14 h-14' }
  const textSizes = { sm: 'text-xs',   md: 'text-sm',   lg: 'text-lg' }
  return (
    <div className={`${sizes[size]} rounded-xl overflow-hidden shrink-0 ring-2 ${agent.ringColor} shadow-sm`}>
      <img
        src={`/agents/${agent.id}.png`}
        alt={agent.name}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            parent.classList.add('bg-gradient-to-br', agent.gradient, 'flex', 'items-center', 'justify-center', 'font-bold', 'text-white', textSizes[size])
            parent.textContent = agent.initial
          }
        }}
      />
    </div>
  )
}

// ── System status pill ────────────────────────────────────────────────────────

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

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({
  userEmail,
  creditBalance = 0,
}: {
  userEmail: string
  creditBalance?: number
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [activeId, setActiveId] = useState<AgentId>('figsy')
  const [open, setOpen]         = useState(false)
  const [unreadCount, setUnreadCount] = React.useState(0)

  const agent = AGENTS.find(a => a.id === activeId)!

  // Fetch unread reply count for Inbox badge
  React.useEffect(() => {
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
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-[224px] bg-[#0F0929] flex flex-col shrink-0 border-r border-white/[0.06]">

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-2.5 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-[#7C3AED] flex items-center justify-center shadow-sm shadow-purple-950/80">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-sm tracking-tight">K.I.N.D</span>
        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-purple-300 border border-[#7C3AED]/25">Beta</span>
      </div>

      {/* ── Active agent card ─────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] transition-all group"
        >
          <AgentAvatar agent={agent} size="md" />
          <div className="flex-1 text-left min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">{agent.name}</p>
            <p className="text-purple-300/50 text-[11px] mt-0.5">{agent.role}</p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-purple-300/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Switcher dropdown */}
        {open && (
          <div className="mt-1.5 rounded-xl bg-[#1A0F47] border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/60 z-50">
            <p className="text-[10px] text-purple-400/40 px-3 pt-2.5 pb-1.5 font-semibold uppercase tracking-wider">
              Your AI Agents
            </p>
            {AGENTS.map(a => (
              <button
                key={a.id}
                onClick={() => { setActiveId(a.id); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.06] transition-colors ${
                  a.id === activeId ? 'bg-white/[0.06]' : ''
                }`}
              >
                <AgentAvatar agent={a} size="sm" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white text-xs font-semibold leading-tight">{a.name}</p>
                  <p className="text-purple-300/40 text-[10px] mt-0.5 truncate">{a.description}</p>
                </div>
                {!a.available && (
                  <span className="text-[9px] text-purple-400/50 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded-full shrink-0 font-medium">
                    Soon
                  </span>
                )}
                {a.id === activeId && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.accentColor }} />
                )}
              </button>
            ))}
            <div className="mx-3 mb-2 mt-1 border-t border-white/[0.06]" />
            <p className="text-[10px] text-purple-300/35 px-3 pb-2.5 leading-relaxed">
              Milla & Vida unlock with a subscription →{' '}
              <Link href="/dashboard/billing" className="text-purple-300/70 font-medium hover:text-purple-200 transition-colors" onClick={() => setOpen(false)}>Billing</Link>
            </p>
          </div>
        )}
      </div>

      {/* ── Agent nav ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 pt-2 pb-2 space-y-0.5 overflow-y-auto">
        {agent.nav.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          const showUnread = badge === 'unread' && unreadCount > 0
          return (
            <Link
              key={href}
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
        })}

        {/* ── Lead Gen section ──────────────────────────────────────────── */}
        <div className="!my-3 border-t border-white/[0.06]" />
        <p className="text-[10px] text-purple-400/35 px-3 pt-1 pb-1.5 font-semibold uppercase tracking-wider">
          Lead Gen
        </p>
        {LEAD_GEN_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-[#7C3AED] text-white shadow-sm shadow-purple-900/60'
                  : 'text-purple-200/55 hover:text-white hover:bg-white/[0.07]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          )
        })}

        {/* ── Secondary nav ─────────────────────────────────────────────── */}
        <div className="!my-3 border-t border-white/[0.06]" />
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
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
      </nav>

      {/* ── Footer strip ──────────────────────────────────────────────────── */}
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
