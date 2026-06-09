'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Home, Users, TrendingUp, Search, MessageSquare, Target, Inbox, BarChart,
  Brain, Bot, Handshake, BarChart2, CreditCard, Settings, LogOut, Pin,
} from 'lucide-react'

type Item = { href: string; label: string; icon: React.ElementType; exact?: boolean }

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

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Build the nav from the real product nav (flattened), respecting what's unlocked.
  const items: (Item | null)[] = [
    { href: '/dashboard',            label: 'Home',          icon: Home, exact: true },
    { href: '/dashboard/leads',      label: 'People',        icon: Users, exact: true },
    { href: '/dashboard/leads/icp',  label: 'ICP Builder',   icon: TrendingUp },
    { href: '/dashboard/leads/linkedin', label: 'LinkedIn Import', icon: Search },
    null,
    ...(hasFigsy ? [
      { href: '/dashboard/figsy-chat', label: 'Chat with FIGSY', icon: MessageSquare },
      { href: '/dashboard/figsy',      label: 'Campaigns',       icon: Target },
      { href: '/dashboard/inbox',      label: 'Inbox',           icon: Inbox },
      { href: '/dashboard/kpis',       label: 'Performance',     icon: BarChart },
      { href: '/dashboard/knowledge',  label: 'Knowledge',       icon: Brain },
    ] : []),
    ...(hasMilla  ? [{ href: '/dashboard/assistant', label: 'Assistant', icon: Bot }] : []),
    ...(hasVida   ? [{ href: '/dashboard/chatbot',   label: 'Chatbot',   icon: MessageSquare }] : []),
    ...(hasDenise ? [{ href: '/dashboard/denise',    label: 'Denise',    icon: Handshake }] : []),
    null,
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
        {items.map((it, i) => it === null
          ? <div key={`d${i}`} className="h-px bg-white/[0.08] my-1.5 mx-4" />
          : <Row key={it.href} {...it} />
        )}
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
