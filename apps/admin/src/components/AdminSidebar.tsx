'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Map, Megaphone,
  Rocket, MonitorPlay, TrendingUp, GitMerge, BookOpen, Inbox,
  ShieldCheck, BarChart2, DollarSign, Activity, FlaskConical,
  UserSquare2, Layers,
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
      { href: '/cohorts',   label: 'Cohorts',     icon: Layers },
      { href: '/hubspot',   label: 'HubSpot',     icon: GitMerge },
    ],
  },
  {
    label: 'Product',
    items: [
      { href: '/roadmap',   label: 'Roadmap',     icon: Map },
      { href: '/health',    label: 'Health',      icon: Activity },
      { href: '/smoketest', label: 'Smoke Test',  icon: FlaskConical },
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
      { href: '/seed',          label: 'Seed Leads',  icon: Users },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-full overflow-y-auto" style={{ background: '#0F0929' }}>

      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#7C3AED] flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/40">
            <span className="text-white font-black text-sm tracking-tight">K</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">K.I.N.D</p>
            <p className="text-[10px] font-semibold tracking-widest text-purple-400/70 uppercase mt-0.5">Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {SECTIONS.map(section => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold tracking-widest text-white/20 px-2 mb-1.5 uppercase">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href))
                return (
                  <Link key={href} href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-all ${
                      active
                        ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-purple-900/30'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                    }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[10px] text-white/30 font-medium">Ops platform live</p>
        </div>
      </div>
    </aside>
  )
}
