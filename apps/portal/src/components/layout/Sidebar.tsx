'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Home, Users, Inbox, Target, BarChart, CreditCard, Settings,
  LogOut, Zap, FileText, Coins, Map, Bot, MessageSquare,
  BarChart2, Brain, Search, TrendingUp, Lock, ChevronDown, Webhook, ShieldCheck,
  Menu, X, UserCheck, Plug, MessageCircle, Code2, Handshake, LayoutTemplate, Sparkles, Mic, GitBranch,
} from 'lucide-react'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { StatusBar } from '@/components/layout/StatusBar'

type AgentId = 'figsy' | 'milla' | 'vida' | 'denise'

interface AgentDef {
  id: AgentId
  name: string
  subtitle: string
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
    subtitle: 'The Opener',
    role: 'AI SDR · Outbound Sales Specialist',
    accent: '#7C3AED',
    ring: 'ring-[#7C3AED]/20',
    nav: [
      { href: '/dashboard/figsy-chat',             label: 'Chat with FIGSY',  icon: MessageSquare },
      { href: '/dashboard/figsy',                  label: 'Campaigns',        icon: Target },
      { href: '/dashboard/templates',              label: 'Templates',        icon: LayoutTemplate },
      { href: '/dashboard/figsy/sequence-builder', label: 'Sequence Builder', icon: GitBranch },
      { href: '/dashboard/inbox',                  label: 'Inbox',            icon: Inbox, badge: 'unread' },
      { href: '/dashboard/kpis',                   label: 'Performance',      icon: BarChart },
      { href: '/dashboard/deliverability',         label: 'Deliverability',   icon: ShieldCheck },
      { href: '/dashboard/knowledge',              label: 'Knowledge',        icon: Brain },
      { href: '/dashboard/figsy/webhooks',         label: 'Webhooks',         icon: Webhook },
    ],
  },
  {
    id: 'milla',
    name: 'Milla',
    subtitle: 'The Brain',
    role: 'Virtual Assistant · Business Operations',
    accent: '#F472B6',
    ring: 'ring-pink-300/30',
    price: '$49/mo',
    nav: [
      { href: '/dashboard/assistant',  label: 'Assistant',  icon: Bot },
      { href: '/dashboard/documents',  label: 'Documents',  icon: FileText },
      { href: '/dashboard/notetaker',  label: 'Notetaker',  icon: Mic },
    ],
  },
  {
    id: 'vida',
    name: 'Vida',
    subtitle: 'The Connector',
    role: 'Chatbot Agent · Inbound Specialist',
    accent: '#14B8A6',
    ring: 'ring-teal-300/30',
    price: '$29/mo',
    nav: [
      { href: '/dashboard/chatbot', label: 'Chatbot', icon: MessageSquare },
    ],
  },
  {
    id: 'denise',
    name: 'Denise',
    subtitle: 'The Closer',
    role: 'AI Account Executive · Closing',
    accent: '#D97706',
    ring: 'ring-amber-300/30',
    price: '$39/mo',
    nav: [
      { href: '/dashboard/denise', label: 'Close with Denise', icon: Handshake },
    ],
  },
]

const AGENT_HREFS: Record<AgentId, string> = {
  figsy:   '/dashboard/figsy',
  milla:   '/dashboard/assistant',
  vida:    '/dashboard/chatbot',
  denise:  '/dashboard/denise',
}

const LEAD_GEN_NAV = [
  { href: '/dashboard',                label: 'Home',            icon: Home,        exact: true },
  { href: '/dashboard/leads',          label: 'People',          icon: Users,       exact: true },
  { href: '/dashboard/leads/icp',      label: 'ICP Builder',     icon: TrendingUp },
  { href: '/dashboard/leads/linkedin', label: 'LinkedIn Import', icon: Search },
]

const ACCOUNT_NAV = [
  { href: '/dashboard/whats-new',  label: "What's New",   icon: Sparkles },
  { href: '/dashboard/usage',      label: 'Usage',        icon: BarChart2 },
  { href: '/dashboard/roadmap',    label: 'Roadmap',      icon: Map },
  { href: '/dashboard/partner',       label: 'Partner Hub',   icon: Handshake },
  { href: '/dashboard/integrations',  label: 'Integrations',  icon: Plug },
  { href: '/dashboard/mcp',           label: 'MCP Connect',   icon: Plug },
  { href: '/dashboard/proposals',  label: 'Proposals',    icon: FileText },
  { href: '/dashboard/developer',  label: 'Developer API', icon: Code2 },
  { href: '/dashboard/billing',    label: 'Billing',      icon: CreditCard },
  { href: '/dashboard/team',       label: 'Team',         icon: UserCheck },
  { href: '/dashboard/messages',   label: 'Messages',     icon: MessageCircle },
  { href: '/dashboard/settings',   label: 'Settings',     icon: Settings },
]

export function Sidebar({
  userEmail,
  creditBalance = 0,
  hasFigsy = false,
  hasMilla = false,
  hasVida  = false,
  hasDenise = false,
  isNewUser = false,
  isPartner = false,
}: {
  userEmail: string
  creditBalance?: number
  hasFigsy?: boolean
  hasMilla?: boolean
  hasVida?: boolean
  hasDenise?: boolean
  isNewUser?: boolean
  isPartner?: boolean
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const [activeId, setActiveId] = useState<AgentId>('figsy')
  const [open, setOpen]         = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount] = React.useState(0)

  React.useEffect(() => { setMobileOpen(false) }, [pathname])

  React.useEffect(() => {
    if (!mobileOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const isUnlocked = (id: AgentId) =>
    id === 'figsy' ? hasFigsy : id === 'milla' ? hasMilla : id === 'vida' ? hasVida : hasDenise
  const agent = AGENTS.find(a => a.id === activeId)!
  const unlocked = isUnlocked(activeId)

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
            ? 'bg-[#7C3AED]/[0.08] text-[#7C3AED] font-semibold'
            : 'text-[#6B21A8]/55 hover:text-[#7C3AED] hover:bg-purple-50'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {showUnread && (
          <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
            active ? 'bg-[#7C3AED] text-white' : 'bg-red-500 text-white'
          }`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* ── Mobile top bar ──────────────────────────────────────────── */}
      <header
        className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4 border-b border-purple-100"
        style={{ background: '#F5F3FF' }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center justify-center w-9 h-9 -ml-1.5 rounded-lg text-[#7C3AED] hover:bg-purple-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center">
            <img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" />
          </div>
          <span className="text-[#1E1152] font-bold text-sm tracking-tight">K.I.N.D</span>
        </div>
        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 rounded-full px-2 py-0.5">
          <Coins className="w-3 h-3 text-amber-500" />
          <span className="text-[11px] font-bold text-amber-600">{creditBalance}</span>
        </div>
      </header>

      {/* ── Mobile backdrop ──────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] flex flex-col border-r border-purple-100 transform transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:w-[220px] lg:max-w-none lg:translate-x-0 lg:shrink-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: '#F5F3FF' }}
      >

        {/* ── Logo ─────────────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-4 flex items-center gap-2.5 border-b border-purple-100">
          <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shadow-sm shadow-purple-200">
            <img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" />
          </div>
          <span className="text-[#1E1152] font-bold text-sm tracking-tight">K.I.N.D</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto flex items-center justify-center w-8 h-8 -mr-1 rounded-lg text-[#7C3AED]/60 hover:text-[#7C3AED] hover:bg-purple-100 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 pt-3 pb-2 space-y-0.5 overflow-y-auto">

          {/* ── Lead Gen ──────────────────────────────────────────── */}
          <p className="text-[10px] text-[#7C3AED]/40 px-3 pb-1.5 font-semibold uppercase tracking-wider">
            Lead Gen
          </p>
          {LEAD_GEN_NAV.map(item => <NavLink key={item.href} {...item} />)}

          {/* ── AI Agents ─────────────────────────────────────────── */}
          <div className="!mt-5">
            <Link href="/dashboard/agents" className="flex items-center justify-between px-3 pb-2 group">
              <p className="text-[10px] text-[#7C3AED]/40 group-hover:text-[#7C3AED] font-semibold uppercase tracking-wider transition-colors">
                KIND AI
              </p>
              <span className="text-[9px] text-[#7C3AED]/30 group-hover:text-[#7C3AED]/60 transition-colors">View all →</span>
            </Link>

            {/* Active agent card */}
            <div
              className="rounded-xl border border-purple-100 overflow-hidden shadow-sm"
              style={{
                background: `${agent.accent}08`,
                borderLeft: `3px solid ${agent.accent}`,
              }}
            >
              <Link
                href={AGENT_HREFS[activeId]}
                className="flex items-center gap-3 px-3 py-3"
              >
                <div className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 ring-2 ${agent.ring} shadow-sm`}>
                  <img
                    src={`/agents/${agent.id}.png`}
                    alt={agent.name}
                    className="w-full h-full object-cover object-top"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-[#1E1152] font-bold text-sm truncate">{agent.name}</p>
                    {unlocked
                      ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      : <Lock className="w-3 h-3 text-[#7C3AED]/25 shrink-0" />
                    }
                  </div>
                  <p className="text-[10px] font-semibold truncate" style={{ color: agent.accent }}>{agent.subtitle}</p>
                  {!unlocked && agent.price && (
                    <p className="text-[10px] text-[#6B7280] mt-0.5">{agent.price} · tap to unlock</p>
                  )}
                </div>
              </Link>
              {/* Clear, full-width agent switcher */}
              <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold border-t transition-colors hover:bg-white/70"
                style={{ color: agent.accent, background: `${agent.accent}0c`, borderColor: `${agent.accent}1f` }}
                aria-label="Switch agent"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                {open ? 'Hide agents' : 'Switch agent'}
              </button>
            </div>
            {!open && (
              <p className="px-3 pt-1.5 text-[10px] text-[#7C3AED]/40">
                4 agents · <button onClick={() => setOpen(true)} className="font-semibold text-[#7C3AED]/70 hover:text-[#7C3AED] transition-colors">switch or unlock →</button>
              </p>
            )}

            {/* Dropdown */}
            {open && (
              <div className="mt-1.5 rounded-xl bg-white border border-purple-100 overflow-hidden shadow-lg shadow-purple-100/50 z-50">
                <p className="text-[10px] text-[#7C3AED]/40 px-3 pt-3 pb-1.5 font-semibold uppercase tracking-wider">
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
                      className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-purple-50 transition-colors ${
                        a.id === activeId ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl overflow-hidden shrink-0 ring-2 ${locked ? 'ring-purple-100 opacity-50' : a.ring}`}>
                        <img
                          src={`/agents/${a.id}.png`}
                          alt={a.name}
                          className="w-full h-full object-cover object-top"
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-semibold leading-tight ${locked ? 'text-[#7C3AED]/30' : 'text-[#1E1152]'}`}>
                            {a.name}
                          </p>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ color: a.accent, background: `${a.accent}18` }}
                          >
                            {a.role}
                          </span>
                        </div>
                        <p className="text-[#6B7280] text-[10px] mt-0.5">
                          {locked ? `${a.price} · Unlock →` : 'Active'}
                        </p>
                      </div>
                      {locked
                        ? <Lock className="w-3 h-3 text-[#7C3AED]/20 shrink-0" />
                        : a.id === activeId && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.accent }} />
                      }
                    </button>
                  )
                })}
                <div className="mx-3 my-2 border-t border-purple-100" />
                <p className="text-[10px] text-[#9CA3AF] px-3 pb-3 leading-relaxed">
                  Unlock agents from{' '}
                  <Link href="/dashboard/billing" className="text-[#7C3AED]/70 font-medium hover:text-[#7C3AED] transition-colors" onClick={() => setOpen(false)}>
                    Billing →
                  </Link>
                </p>
              </div>
            )}

            {/* Active agent nav */}
            {unlocked ? (
              <div className="mt-1.5 space-y-0.5">
                {agent.nav.map(item => <NavLink key={item.href} {...item} />)}
              </div>
            ) : (
              <Link
                href={AGENT_HREFS[activeId]}
                className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-purple-100 text-xs text-[#7C3AED]/40 hover:text-[#7C3AED] hover:border-purple-200 transition-all"
              >
                <Lock className="w-3 h-3" />
                View upgrade options
              </Link>
            )}
          </div>

          {/* ── Account ───────────────────────────────────────────── */}
          <div className="!mt-5 border-t border-purple-100 !pt-3 space-y-0.5">
            {ACCOUNT_NAV.filter(({ href }) => href !== '/dashboard/partner' || isPartner).map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                    active
                      ? 'bg-purple-50 text-[#7C3AED]'
                      : 'text-[#7C3AED]/40 hover:text-[#7C3AED] hover:bg-purple-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>

        </nav>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div className="px-3 pb-3 pt-2 border-t border-purple-100 space-y-1.5">
          <div className="px-3 flex items-center justify-between">
            <p className="text-[#7C3AED]/35 text-[11px] truncate">{userEmail}</p>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <NotificationBell />
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 rounded-full px-2 py-0.5">
                <Coins className="w-3 h-3 text-amber-500" />
                <span className="text-[11px] font-bold text-amber-600">{creditBalance}</span>
              </div>
            </div>
          </div>
          <StatusBar />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[12px] text-[#7C3AED]/40 hover:text-[#7C3AED] hover:bg-purple-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
