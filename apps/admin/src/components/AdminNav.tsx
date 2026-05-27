'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, Map, Megaphone, Rocket, MonitorPlay, TrendingUp, GitMerge, BookOpen, Inbox, BarChart2, DollarSign, Activity, ShieldCheck, FlaskConical } from 'lucide-react'

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
      { href: '/clients',       label: 'All Clients',   icon: Users },
      { href: '/cohorts',       label: 'Cohorts',       icon: TrendingUp },
      { href: '/hubspot',       label: 'HubSpot',       icon: GitMerge },
    ],
  },
  {
    label: 'Product',
    items: [
      { href: '/roadmap',       label: 'Roadmap',       icon: Map },
      { href: '/health',        label: 'Health',        icon: Activity },
      { href: '/status',        label: 'System Status', icon: Activity },
      { href: '/smoketest',     label: 'Smoke Test',    icon: FlaskConical },
    ],
  },
  {
    label: 'Ops',
    items: [
      { href: '/cmo',           label: 'CMO Tools',     icon: Megaphone },
      { href: '/playbook',      label: 'Playbook',      icon: BookOpen },
      { href: '/compliance',    label: 'Compliance',    icon: ShieldCheck },
      { href: '/demo',          label: 'Demo Envs',     icon: MonitorPlay },
      { href: '/terms-library', label: 'Terms',         icon: FileText },
      { href: '/launch',        label: 'Launch',        icon: Rocket },
    ],
  },
]

function isActive(pathname: string, href: string): boolean {
  if (href.includes('?')) {
    return pathname + (typeof window !== 'undefined' ? window.location.search : '') === href
  }
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function AdminNav() {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-[#0a0a0a] border-r border-white/[0.06] flex flex-col z-50 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">K.I.N.D</p>
            <p className="text-white/40 text-[11px] leading-tight">Founder OS</p>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold tracking-widest text-white/25 px-2 mb-1.5 uppercase">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                        active
                          ? 'bg-white/10 text-white font-medium'
                          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Status footer */}
      <div className="px-5 py-4 border-t border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-[11px] text-white/40">All systems operational</span>
        </div>
      </div>
    </aside>
  )
}
