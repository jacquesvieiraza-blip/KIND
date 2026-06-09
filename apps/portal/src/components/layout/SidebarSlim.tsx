'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Home, Users, TrendingUp, Search, MessageSquare, Target, Inbox, BarChart,
  Brain, Bot, Handshake, BarChart2, CreditCard, Settings, LogOut, Pin,
  ChevronDown, Lock,
} from 'lucide-react'

type Item = { href: string; label: string; icon: React.ElementType; exact?: boolean }
type AgentId = 'figsy' | 'milla' | 'vida' | 'denise'

interface AgentDef {
  id: AgentId
  name: string
  role: string
  accent: string
  price?: string
  nav: Item[]
}

const AGENTS: AgentDef[] = [
  {
    id: 'figsy', name: 'FIGSY', role: 'The Opener', accent: '#7C3AED',
    nav: [
      { href: '/dashboard/figsy-chat', label: 'Chat with FIGSY', icon: MessageSquare },
      { href: '/dashboard/figsy',      label: 'Campaigns',       icon: Target },
      { href: '/dashboard/inbox',      label: 'Inbox',           icon: Inbox },
      { href: '/dashboard/kpis',       label: 'Performance',     icon: BarChart },
      { href: '/dashboard/knowledge',  label: 'Knowledge',       icon: Brain },
    ],
  },
  {
    id: 'milla', name: 'Milla', role: 'The Brain', accent: '#F472B6', price: '$49/mo',
    nav: [{ href: '/dashboard/assistant', label: 'Assistant', icon: Bot }],
  },
  {
    id: 'vida', name: 'Vida', role: 'The Connector', accent: '#14B8A6', price: '$29/mo',
    nav: [{ href: '/dashboard/chatbot', label: 'Chatbot', icon: MessageSquare }],
  },
  {
    id: 'denise', name: 'Denise', role: 'The Closer', accent: '#D97706', price: '$99/mo',
    nav: [{ href: '/dashboard/denise', label: 'Close with Denise', icon: Handshake }],
  },
]

const AGENT_HREFS: Record<AgentId, string> = {
  figsy: '/dashboard/figsy', milla: '/dashboard/assistant', vida: '/dashboard/chatbot', denise: '/dashboard/denise',
}

interface Props {
  userEmail: string
  hasFigsy?: boolean
  hasMilla?: boolean
  hasVida?: boolean
  hasDenise?: boolean
  isPartner?: boolean
}

export function SidebarSlim({ userEmail, hasFigsy, hasMilla, hasVida, hasDenise, isPartner }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [pinned, setPinned] = useState(false)
  const [open, setOpen] = useState(false)

  const isUnlocked = (id: AgentId) =>
    id === 'figsy' ? !!hasFigsy : id === 'milla' ? !!hasMilla : id === 'vida' ? !!hasVida : !!hasDenise

  // Active agent follows the route you're on; defaults to FIGSY.
  const deriveActive = (): AgentId => {
    const hit = AGENTS.find(a => a.nav.some(n => pathname === n.href || pathname.startsWith(n.href + '/')))
    return hit?.id ?? 'figsy'
  }
  const [activeId, setActiveId] = useState<AgentId>('figsy')
  useEffect(() => { setActiveId(deriveActive()) }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const agent = AGENTS.find(a => a.id === activeId)!
  const unlocked = isUnlocked(activeId)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const workspace: Item[] = [
    { href: '/dashboard',                label: 'Home',            icon: Home, exact: true },
    { href: '/dashboard/leads',          label: 'People',          icon: Users, exact: true },
    { href: '/dashboard/leads/icp',      label: 'ICP Builder',     icon: TrendingUp },
    { href: '/dashboard/leads/linkedin', label: 'LinkedIn Import', icon: Search },
  ]
  const account: Item[] = [
    { href: '/dashboard/usage',   label: 'Usage',   icon: BarChart2 },
    ...(isPartner ? [{ href: '/dashboard/partner', label: 'Partner Hub', icon: Handshake }] : []),
    { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  ]

  const widthCls = pinned ? 'w-56' : 'w-16 hover:w-56'
  const labelCls = pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'

  function Row({ href, label, icon: Icon, exact }: Item) {
    const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href}
        className={`mx-2 flex items-center gap-3 h-10 px-3 rounded-xl transition-colors ${
          active ? 'bg-white/15 text-white' : 'text-purple-200/55 hover:text-white hover:bg-white/[0.08]'
        }`}>
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className={`text-[13px] font-medium whitespace-nowrap transition-opacity duration-150 ${labelCls}`}>{label}</span>
      </Link>
    )
  }

  return (
    <aside className={`group ${widthCls} shrink-0 h-screen bg-[#0F0929] flex flex-col py-3 border-r border-white/[0.06] transition-[width] duration-200 overflow-hidden z-30`}>
      {/* Logo + pin */}
      <div className="flex items-center h-10 mx-2 px-3 mb-1">
        <Link href="/dashboard" className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 -ml-1.5">
          <img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" />
        </Link>
        <span className={`ml-1.5 text-white font-bold text-sm tracking-tight whitespace-nowrap transition-opacity ${labelCls}`}>K·I·N·D</span>
        <button onClick={() => setPinned(p => !p)}
          className={`ml-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all ${labelCls} ${pinned ? 'text-[#a78bfa] bg-white/10' : 'text-purple-200/50 hover:text-white hover:bg-white/[0.08]'}`}
          title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}>
          <Pin className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden no-scrollbar">
        {workspace.map(it => <Row key={it.href} {...it} />)}

        <div className="h-px bg-white/[0.08] my-1.5 mx-4" />

        {/* ── Agent switcher ─────────────────────────────────────────── */}
        <p className={`px-5 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-purple-300/35 transition-opacity ${labelCls}`}>
          Your AI Family
        </p>

        {/* Active agent card */}
        <div className="mx-2 rounded-xl overflow-hidden" style={{ background: `${agent.accent}1f`, borderLeft: `3px solid ${agent.accent}` }}>
          <Link href={AGENT_HREFS[activeId]} className="flex items-center gap-2.5 px-2.5 py-2.5">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 ring-2 ring-white/20">
              <img src={`/agents/${agent.id}.png`} alt={agent.name} className="w-full h-full object-cover object-top"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div className={`flex-1 min-w-0 text-left transition-opacity ${labelCls}`}>
              <div className="flex items-center gap-1.5">
                <p className="text-white font-bold text-[13px] truncate">{agent.name}</p>
                {unlocked
                  ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  : <Lock className="w-3 h-3 text-white/30 shrink-0" />}
              </div>
              <p className="text-[10px] font-semibold truncate" style={{ color: agent.accent }}>{agent.role}</p>
            </div>
          </Link>
          {/* Switch agent toggle — only meaningful when expanded */}
          <button onClick={() => setOpen(o => !o)}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-white/70 border-t border-white/10 hover:bg-white/[0.06] transition-colors ${labelCls}`}
            aria-label="Switch agent">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            {open ? 'Hide agents' : 'Switch agent'}
          </button>
        </div>

        {/* Dropdown — agent list with little photos */}
        {open && (
          <div className={`mx-2 mt-1.5 rounded-xl bg-[#1a0f3d] border border-white/10 overflow-hidden shadow-xl transition-opacity ${labelCls}`}>
            {AGENTS.map(a => {
              const locked = !isUnlocked(a.id)
              return (
                <button key={a.id}
                  onClick={() => { setActiveId(a.id); setOpen(false); router.push(AGENT_HREFS[a.id]) }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 hover:bg-white/[0.06] transition-colors ${a.id === activeId ? 'bg-white/[0.05]' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 ring-2 ${locked ? 'ring-white/10 opacity-50' : 'ring-white/20'}`}>
                    <img src={`/agents/${a.id}.png`} alt={a.name} className="w-full h-full object-cover object-top"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-[12px] font-semibold leading-tight truncate ${locked ? 'text-white/40' : 'text-white'}`}>{a.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: a.accent }}>{a.role}</p>
                  </div>
                  {locked
                    ? <span className="text-[9px] text-white/35 shrink-0">{a.price}</span>
                    : a.id === activeId && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.accent }} />}
                </button>
              )
            })}
            <Link href="/dashboard/billing" onClick={() => setOpen(false)}
              className="block text-[10px] text-purple-300/50 hover:text-purple-200 px-3 py-2 border-t border-white/10 transition-colors">
              Unlock agents from Billing →
            </Link>
          </div>
        )}

        {/* Active agent nav */}
        <div className="mt-1 space-y-0.5">
          {unlocked
            ? agent.nav.map(item => <Row key={item.href} {...item} />)
            : (
              <Link href="/dashboard/billing"
                className={`mx-2 flex items-center gap-3 h-10 px-3 rounded-xl text-purple-200/55 hover:text-white hover:bg-white/[0.08] transition-colors`}>
                <Lock className="w-[18px] h-[18px] shrink-0" />
                <span className={`text-[13px] font-medium whitespace-nowrap transition-opacity ${labelCls}`}>Unlock {agent.name}</span>
              </Link>
            )}
        </div>

        <div className="h-px bg-white/[0.08] my-1.5 mx-4" />
        {account.map(it => <Row key={it.href} {...it} />)}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-0.5 pt-2 border-t border-white/[0.06]">
        <Row href="/dashboard/settings" label="Settings" icon={Settings} />
        <button onClick={signOut}
          className="mx-2 flex items-center gap-3 h-10 px-3 rounded-xl text-purple-200/55 hover:text-white hover:bg-white/[0.08] transition-colors">
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <span className={`text-[13px] font-medium whitespace-nowrap transition-opacity ${labelCls}`}>Sign out</span>
        </button>
        <p className={`px-5 pt-1 text-[10px] text-purple-300/25 truncate transition-opacity ${labelCls}`}>{userEmail}</p>
      </div>
    </aside>
  )
}
