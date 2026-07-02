'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Map, Megaphone,
  Rocket, MonitorPlay, BookOpen, Inbox,
  ShieldCheck, BarChart2, DollarSign, Activity, FlaskConical,
  UserSquare2, Layers, Database, Eye,
  Handshake, Pin, Gauge, Wallet, HeartPulse, Sprout, Boxes,
} from 'lucide-react'

// NOTE: do not name this `ref` — React reserves `ref`, and since the items are
// spread onto <Row> with {...it}, a `ref` field gets hijacked as a real ref and
// crashes the whole app (strict-mode `true.current = …`). Use `isRef`.
// `soon` = built but not yet wired to live data (M3 build in progress).
type Item = { href: string; label: string; icon: React.ElementType; isRef?: boolean; soon?: boolean }
type Section = { label: string; items: Item[] }

// M3 Admin Centre IA (docs/admin-centre-spec.md): Cockpit + 6 sections +
// Command Centre + Ops; the 8 cut-from-daily pages moved to "Dev · not daily".
const SECTIONS: Section[] = [
  {
    label: 'Cockpit',
    items: [
      { href: '/',          label: 'Cockpit',       icon: HeartPulse },
    ],
  },
  {
    // Activity · Activation · Messages folded into the Clients hub tab bar (#281).
    label: 'Clients',
    items: [
      { href: '/clients',    label: 'Clients', icon: Users },
    ],
  },
  {
    label: 'Sales Channel',
    items: [
      { href: '/command',    label: 'Sales Channel', icon: Gauge },
      { href: '/partners',   label: 'Partners (manage)', icon: Handshake },
      { href: '/proposals',  label: 'Proposals',   icon: FileText },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/revenue',    label: 'Revenue',     icon: DollarSign },
      { href: '/cohorts',    label: 'Cohorts',     icon: Layers },
    ],
  },
  {
    label: 'GTM / Pipeline',
    items: [
      { href: '/gtm',        label: 'GTM Hub',     icon: Rocket },
      { href: '/cmo',        label: 'CMO Tools',   icon: Megaphone },
      { href: '/unibox',     label: 'Unibox',      icon: Inbox },
      { href: '/visitors',   label: 'Visitors',    icon: Eye },
    ],
  },
  {
    label: 'Engine',
    items: [
      { href: '/health',     label: 'Deliverability', icon: Activity, isRef: true },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/compliance',    label: 'Compliance',  icon: ShieldCheck },
      { href: '/terms-library', label: 'Terms',       icon: FileText },
    ],
  },
  {
    label: 'Ops',
    items: [
      { href: '/ops',        label: 'Ops',         icon: Boxes },
      { href: '/demo',       label: 'Sales Demo',  icon: MonitorPlay },
      { href: '/founder',    label: 'Founder',     icon: UserSquare2 },
    ],
  },
  {
    label: 'Dev',
    items: [
      { href: '/seed',       label: 'Seed',        icon: Sprout,       isRef: true },
      { href: '/smoketest',  label: 'Smoke Test',  icon: FlaskConical, isRef: true },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  // Slim by default (portal parity, founder-directed 2 Jul) — the rail starts
  // collapsed to w-16 and expands on hover; pin to keep it open.
  const [pinned, setPinned] = useState(false)

  const widthCls = pinned ? 'w-56' : 'w-16 hover:w-56'
  const labelCls = pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'

  function Row({ href, label, icon: Icon, isRef, soon }: Item) {
    const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
    return (
      <Link href={href}
        className={`mx-2 flex items-center gap-3 h-10 px-3 rounded-xl transition-colors ${
          active ? 'bg-white/15 text-white' : 'text-purple-200/55 hover:text-white hover:bg-white/[0.08]'
        }`}>
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className={`text-[13px] font-medium whitespace-nowrap transition-opacity duration-150 ${labelCls}`}>{label}</span>
        {soon && (
          <span
            title="Built — live data coming as we hire AEs / onboard partners"
            className={`ml-auto text-[9px] font-bold uppercase tracking-wide text-[#a78bfa] bg-[#7C3AED]/25 rounded-full px-1.5 py-0.5 transition-opacity duration-150 ${labelCls}`}>
            soon
          </span>
        )}
        {isRef && !soon && (
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
