'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Play, Inbox, BarChart2, Settings, LogOut,
  Zap, Users, TrendingUp, MessageSquare, FileText,
  CreditCard, LayoutDashboard, Webhook,
} from 'lucide-react'

type AgentId = 'figsy' | 'milla' | 'vida' | 'denise'

const AGENTS: {
  id: AgentId
  name: string
  role: string
  emoji: string
  color: string
  gradient: string
  nav: { href: string; label: string; icon: React.ElementType }[]
}[] = [
  {
    id: 'figsy',
    name: 'FIGSY',
    role: 'AI SDR',
    emoji: '🤖',
    color: '#7C3AED',
    gradient: 'from-[#7C3AED] to-[#6025c0]',
    nav: [
      { href: '/v2/figsy',                 label: 'Campaigns',  icon: Play },
      { href: '/dashboard/inbox',          label: 'Inbox',      icon: Inbox },
      { href: '/dashboard/prospects',      label: 'Prospects',  icon: Users },
      { href: '/dashboard/analytics',      label: 'Analytics',  icon: BarChart2 },
      { href: '/dashboard/figsy/webhooks', label: 'Webhooks',   icon: Webhook },
    ],
  },
  {
    id: 'milla',
    name: 'Milla',
    role: 'Virtual Assistant',
    emoji: '💼',
    color: '#0ea5e9',
    gradient: 'from-[#0ea5e9] to-[#0284c7]',
    nav: [
      { href: '/v2/milla',                 label: 'Assistant',  icon: MessageSquare },
      { href: '/dashboard/documents',      label: 'Documents',  icon: FileText },
    ],
  },
  {
    id: 'vida',
    name: 'Vida',
    role: 'Chatbot Agent',
    emoji: '💬',
    color: '#10b981',
    gradient: 'from-[#10b981] to-[#059669]',
    nav: [
      { href: '/v2/vida',                  label: 'Chatbot',    icon: MessageSquare },
    ],
  },
  {
    id: 'denise',
    name: 'Denise',
    role: 'AI Account Executive',
    emoji: '🤝',
    color: '#D97706',
    gradient: 'from-[#D97706] to-[#b45309]',
    nav: [],
  },
]

const BOTTOM_NAV = [
  { href: '/dashboard/leads',    label: 'Leads',    icon: Users },
  { href: '/dashboard/billing',  label: 'Billing',  icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/v2' && pathname.startsWith(href))
  return (
    <Link href={href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
        active
          ? 'bg-white/[0.12] text-white'
          : 'text-purple-200/50 hover:text-white hover:bg-white/[0.06]'
      }`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {label}
    </Link>
  )
}

export function SidebarV2Preview({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const activeAgent = AGENTS.find(a =>
    a.nav.some(n => pathname === n.href || pathname.startsWith(n.href + '/'))
  ) ?? (pathname === '/v2' ? null : null)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 shrink-0 h-screen bg-[#0F0929] flex flex-col border-r border-white/[0.06] overflow-y-auto">

      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <Link href="/v2" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
            <img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" />
          </div>
          <span className="text-white font-bold text-sm tracking-tight">K·I·N·D</span>
          <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C3AED]/40 text-[#a78bfa] tracking-wide">v2</span>
        </Link>
      </div>

      {/* Home */}
      <div className="px-3 pt-3">
        <Link href="/v2"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
            pathname === '/v2'
              ? 'bg-white/[0.10] text-white'
              : 'text-purple-200/50 hover:text-white hover:bg-white/[0.06]'
          }`}>
          <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
          Home
        </Link>
      </div>

      {/* Company OS (V2) — the per-rep money engine + the full design gallery */}
      <div className="px-3 pt-3">
        <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-widest text-purple-300/30">Company OS · V2</p>
        <div className="space-y-0.5">
          <NavItem href="/v2/company" label="Command Centre" icon={LayoutDashboard} />
          <NavItem href="/v2/gallery" label="All V2 screens" icon={Zap} />
        </div>
      </div>

      {/* Agent sections */}
      <div className="flex-1 px-3 py-2 space-y-1">
        {AGENTS.map(agent => {
          const isActive = activeAgent?.id === agent.id
          return (
            <div key={agent.id}>
              {/* Agent header */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mt-2 ${
                isActive ? 'bg-white/[0.06]' : ''
              }`}>
                <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${agent.gradient} flex items-center justify-center text-xs shrink-0`}>
                  {agent.emoji}
                </div>
                <div className="min-w-0">
                  <p className={`text-[12px] font-semibold leading-tight ${isActive ? 'text-white' : 'text-purple-200/60'}`}>
                    {agent.name}
                  </p>
                  <p className="text-[10px] text-purple-300/30">{agent.role}</p>
                </div>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              </div>

              {/* Agent nav items */}
              <div className="ml-3 pl-3 border-l border-white/[0.05] space-y-0.5 mt-0.5">
                {agent.nav.map(n => (
                  <NavItem key={n.href} {...n} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom nav */}
      <div className="px-3 pb-2 border-t border-white/[0.06] pt-3 space-y-0.5">
        {BOTTOM_NAV.map(n => <NavItem key={n.href} {...n} />)}
        <button onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-purple-300/30 hover:text-white hover:bg-white/[0.06] transition-colors mt-1">
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
        <p className="text-[10px] text-purple-300/25 px-3 pt-1 truncate">{userEmail}</p>
      </div>
    </aside>
  )
}
