'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Map, Megaphone,
  Rocket, MonitorPlay, BookOpen, Inbox,
  ShieldCheck, BarChart2, DollarSign, Activity, FlaskConical,
  UserSquare2, Layers, MessageCircle, Database, Eye,
  Handshake, GitMerge, Pin,
} from 'lucide-react'

// NOTE: do not name this `ref` — React reserves `ref`, and since the items are
// spread onto <Row> with {...it}, a `ref` field gets hijacked as a real ref and
// crashes the whole app (strict-mode `true.current = …`). Use `isRef`.
type Item = { href: string; label: string; icon: React.ElementType; isRef?: boolean }
type Section = { label: string; items: Item[] }

const SECTIONS: Section[] = [
  {
    label: 'Overview',
    items: [
      { href: '/',          label: 'Dashboard',   icon: LayoutDashboard },
      { href: '/unibox',    label: 'Unibox',      icon: Inbox },
      { href: '/analytics', label: 'Analytics',   icon: BarChart2 },
      { href: '/revenue',   label: 'Revenue',     icon: DollarSign },
    ],
  },
  {
    label: 'Clients',
    items: [
      { href: '/clients',    label: 'All Clients', icon: Users },
      { href: '/partners',   label: 'Partners',    icon: Handshake },
      { href: '/messages',   label: 'Messages',    icon: MessageCircle },
      { href: '/proposals',  label: 'Proposals',   icon: FileText },
      { href: '/visitors',   label: 'Visitors',    icon: Eye },
      { href: '/cohorts',    label: 'Cohorts',     icon: Layers },
      { href: '/hubspot',    label: 'HubSpot',     icon: GitMerge },
    ],
  },
  {
    label: 'Product',
    items: [
      { href: '/health',     label: 'Health',      icon: Activity,  isRef: true },
      { href: '/data-moat',  label: 'Data Moat',   icon: Database },
    ],
  },
  {
    label: 'Ops',
    items: [
      { href: '/cmo',           label: 'CMO Tools',   icon: Megaphone },
      { href: '/demo',          label: 'Demo Envs',   icon: MonitorPlay },
      { href: '/terms-library', label: 'Terms',       icon: FileText },
      { href: '/founder',       label: 'Founder',     icon: UserSquare2 },
    ],
  },
  {
    label: 'Reference',
    items: [
      { href: '/roadmap',     label: 'Roadmap',     icon: Map,          isRef: true },
      { href: '/smoketest',   label: 'Smoke Test',  icon: FlaskConical, isRef: true },
      { href: '/playbook',    label: 'Playbook',    icon: BookOpen,     isRef: true },
      { href: '/compliance',  label: 'Compliance',  icon: ShieldCheck,  isRef: true },
      { href: '/launch',      label: 'Launch',      icon: Rocket,       isRef: true },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [pinned, setPinned] = useState(true)

  const widthCls = pinned ? 'w-56' : 'w-16 hover:w-56'
  const labelCls = pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'

  function Row({ href, label, icon: Icon, isRef }: Item) {
    const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href}
        className={`mx-2 flex items-center gap-3 h-10 px-3 rounded-xl transition-colors ${
          active ? 'bg-white/15 text-white' : 'text-purple-200/55 hover:text-white hover:bg-white/[0.08]'
        }`}>
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className={`text-[13px] font-medium whitespace-nowrap transition-opacity duration-150 ${labelCls}`}>{label}</span>
        {isRef && (
          <span
            title="Static reference — not live data"
            className={`ml-auto text-[9px] font-semibold uppercase tracking-wide text-purple-300/30 transition-opacity duration-150 ${labelCls}`}>
            ref
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside className={`group ${widthCls} shrink-0 h-full bg-[#0F0929] flex flex-col py-3 border-r border-white/[0.06] transition-[width] duration-200 overflow-hidden z-30`}>
      {/* Logo + pin */}
      <div className="flex items-center h-10 mx-2 px-3 mb-1">
        <Link href="/" className="w-9 h-9 rounded-xl bg-[#7C3AED] flex items-center justify-center shrink-0 -ml-1.5 shadow-sm shadow-purple-900/40">
          <span className="text-white font-black text-sm tracking-tight">K</span>
        </Link>
        <div className={`ml-2 leading-tight whitespace-nowrap transition-opacity ${labelCls}`}>
          <p className="text-white font-bold text-sm tracking-tight">K·I·N·D</p>
          <p className="text-[9px] font-semibold tracking-widest text-[#9B8EC4] uppercase">Admin OS</p>
        </div>
        <button onClick={() => setPinned(p => !p)}
          className={`ml-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all ${labelCls} ${pinned ? 'text-[#a78bfa] bg-white/10' : 'text-purple-200/50 hover:text-white hover:bg-white/[0.08]'}`}
          title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}>
          <Pin className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden no-scrollbar pt-1">
        {SECTIONS.map(section => (
          <div key={section.label} className="mb-1">
            <p className={`px-5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-purple-300/35 transition-opacity ${labelCls}`}>
              {section.label}
            </p>
            {section.items.map(it => <Row key={it.href} {...it} />)}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex items-center gap-2 h-8 mx-2 px-4 pt-2 border-t border-white/[0.06]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <p className={`text-[10px] text-purple-300/40 font-medium whitespace-nowrap transition-opacity ${labelCls}`}>Platform live</p>
      </div>
    </aside>
  )
}
