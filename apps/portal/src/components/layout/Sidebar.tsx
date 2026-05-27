'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Home, Users, Inbox, Target, BarChart, CreditCard, Settings,
  LogOut, Zap, FileText, Coins, Map, Bot, MessageSquare,
  ChevronDown, BarChart2, BookOpen,
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
}

const AGENTS: AgentDef[] = [
  {
    id: 'figsy',
    name: 'FIGSY',
    role: 'AI SDR',
    gradient: 'from-[#0066FF] to-[#003d99]',
    ringColor: 'ring-blue-400/30',
    initial: 'F',
    description: 'Outbound prospecting & sequences',
    available: true,
    nav: [
      { href: '/dashboard',               label: 'Home',        icon: Home },
      { href: '/dashboard/figsy',         label: 'Campaigns',   icon: Target },
      { href: '/dashboard/leads',         label: 'People',      icon: Users },
      { href: '/dashboard/figsy/replies', label: 'Inbox',       icon: Inbox },
      { href: '/dashboard/kpis',          label: 'Performance', icon: BarChart },
    ],
  },
  {
    id: 'milla',
    name: 'Milla',
    role: 'Virtual Assistant',
    gradient: 'from-purple-500 to-purple-900',
    ringColor: 'ring-purple-400/30',
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
    gradient: 'from-teal-400 to-cyan-700',
    ringColor: 'ring-teal-400/30',
    initial: 'V',
    description: 'Website & WhatsApp inbound',
    available: false,
    nav: [
      { href: '/dashboard',         label: 'Home',    icon: Home },
      { href: '/dashboard/chatbot', label: 'Chatbot', icon: MessageSquare },
    ],
  },
]

const BOTTOM_NAV: NavItem[] = [
  { href: '/dashboard/usage',    label: 'Usage',    icon: BarChart2 },
  { href: '/dashboard/roadmap',  label: 'Roadmap',  icon: Map },
  { href: '/dashboard/billing',  label: 'Billing',  icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

function AgentAvatar({
  agent,
  size = 'md',
}: {
  agent: AgentDef
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-lg' }
  return (
    <div
      className={`${sizes[size]} rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center font-bold text-white shrink-0 ring-2 ${agent.ringColor} shadow-lg`}
    >
      {agent.initial}
    </div>
  )
}

function SystemStatus() {
  const [status, setStatus] = React.useState<'checking' | 'ok' | 'degraded'>('checking')
  React.useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
    fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? setStatus('ok') : setStatus('degraded'))
      .catch(() => setStatus('degraded'))
  }, [])
  const dot =
    status === 'ok' ? 'bg-green-400' : status === 'degraded' ? 'bg-amber-400' : 'bg-gray-500'
  const label =
    status === 'ok' ? 'All systems operational' : status === 'degraded' ? 'Service disruption' : 'Checking…'
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${status === 'ok' ? 'animate-pulse' : ''}`} />
      <span className="text-[11px] text-white/35">{label}</span>
    </div>
  )
}

export function Sidebar({
  userEmail,
  creditBalance = 0,
}: {
  userEmail: string
  creditBalance?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [activeId, setActiveId] = useState<AgentId>('figsy')
  const [open, setOpen] = useState(false)

  const agent = AGENTS.find(a => a.id === activeId)!

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-[220px] bg-[#001228] flex flex-col shrink-0 border-r border-white/5">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-2 border-b border-white/5">
        <div className="w-6 h-6 rounded-md bg-[#0066FF] flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-white font-bold text-sm tracking-tight">K.I.N.D</span>
      </div>

      {/* Active Agent Card */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/6 hover:bg-white/10 border border-white/8 transition-all"
        >
          <AgentAvatar agent={agent} size="md" />
          <div className="flex-1 text-left min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">{agent.name}</p>
            <p className="text-white/45 text-[11px] mt-0.5">{agent.role}</p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-white/30 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Switcher dropdown */}
        {open && (
          <div className="mt-1.5 rounded-xl bg-[#001f4d] border border-white/8 overflow-hidden shadow-xl">
            <p className="text-[10px] text-white/30 px-3 pt-2.5 pb-1 font-semibold uppercase tracking-wider">
              Your AI Agents
            </p>
            {AGENTS.map(a => (
              <button
                key={a.id}
                onClick={() => {
                  setActiveId(a.id)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/6 transition-colors ${
                  a.id === activeId ? 'bg-white/4' : ''
                }`}
              >
                <AgentAvatar agent={a} size="sm" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-white text-xs font-medium leading-tight">{a.name}</p>
                  <p className="text-white/35 text-[10px]">{a.description}</p>
                </div>
                {!a.available && (
                  <span className="text-[9px] text-white/30 bg-white/8 px-1.5 py-0.5 rounded-full shrink-0">
                    Soon
                  </span>
                )}
                {a.id === activeId && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Agent nav */}
      <nav className="flex-1 px-3 pt-2 pb-2 space-y-0.5 overflow-y-auto">
        {agent.nav.map(({ href, label, icon: Icon, badge }) => {
          const active =
            pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                active
                  ? 'bg-[#0066FF] text-white font-semibold'
                  : 'text-white/55 hover:text-white hover:bg-white/6'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[10px] bg-[#0066FF]/25 text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}

        {/* Divider */}
        <div className="!my-3 border-t border-white/6" />

        {/* Common nav — smaller, secondary */}
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-colors ${
                active
                  ? 'bg-white/10 text-white/90 font-medium'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/4'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom strip */}
      <div className="px-3 pb-3 pt-2 border-t border-white/5 space-y-1.5">
        <div className="px-3 flex items-center justify-between">
          <p className="text-white/30 text-[11px] truncate">{userEmail}</p>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <NotificationBell />
            <div className="flex items-center gap-1 bg-white/8 rounded-full px-2 py-0.5">
              <Coins className="w-3 h-3 text-yellow-400" />
              <span className="text-[11px] font-semibold text-white">{creditBalance}</span>
            </div>
          </div>
        </div>
        <SystemStatus />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[12px] text-white/30 hover:text-white/60 hover:bg-white/4 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
