'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Map, Megaphone,
  Rocket, MonitorPlay, TrendingUp, GitMerge, BookOpen, Inbox,
  ShieldCheck, BarChart2, DollarSign, Activity, FlaskConical,
  UserSquare2, Layers, ChevronRight, MessageCircle, Database,
} from 'lucide-react'

const SECTIONS = [
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
      { href: '/clients',   label: 'All Clients', icon: Users },
      { href: '/messages',  label: 'Messages',    icon: MessageCircle },
      { href: '/cohorts',   label: 'Cohorts',     icon: Layers },
      { href: '/hubspot',   label: 'HubSpot',     icon: GitMerge },
    ],
  },
  {
    label: 'Product',
    items: [
      { href: '/roadmap',    label: 'Roadmap',     icon: Map },
      { href: '/health',     label: 'Health',      icon: Activity },
      { href: '/data-moat',  label: 'Data Moat',   icon: Database },
      { href: '/smoketest',  label: 'Smoke Test',  icon: FlaskConical },
    ],
  },
  {
    label: 'Ops',
    items: [
      { href: '/cmo',           label: 'CMO Tools',   icon: Megaphone },
      { href: '/playbook',      label: 'Playbook',    icon: BookOpen },
      { href: '/compliance',    label: 'Compliance',  icon: ShieldCheck },
      { href: '/demo',          label: 'Demo Envs',   icon: MonitorPlay },
      { href: '/terms-library', label: 'Terms',       icon: FileText },
      { href: '/launch',        label: 'Launch',      icon: Rocket },
      { href: '/founder',       label: 'Founder',     icon: UserSquare2 },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col h-full overflow-y-auto border-r border-purple-100"
      style={{ background: '#F5F3FF' }}
    >
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-purple-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#7C3AED] flex items-center justify-center shrink-0 shadow-sm shadow-purple-300/40">
            <span className="text-white font-black text-sm tracking-tight">K</span>
          </div>
          <div>
            <p className="text-[#1E1152] font-bold text-sm leading-tight">K.I.N.D</p>
            <p className="text-[10px] font-semibold tracking-widest text-[#7C3AED]/50 uppercase mt-0.5">Admin OS</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {SECTIONS.map(section => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold tracking-widest text-[#7C3AED]/40 px-2 mb-1.5 uppercase">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all ${
                      active
                        ? 'bg-white border border-purple-200 text-[#7C3AED] font-semibold shadow-sm'
                        : 'text-[#4B3A7A] hover:text-[#7C3AED] hover:bg-white/70'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#7C3AED]' : 'text-[#7C3AED]/50'}`} />
                    {label}
                    {active && <ChevronRight className="w-3 h-3 ml-auto text-[#7C3AED]/40" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-purple-100">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] text-[#7C3AED]/40 font-medium">Platform live</p>
        </div>
      </div>
    </aside>
  )
}
