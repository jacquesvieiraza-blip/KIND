'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, DollarSign, Activity, Users, AlertTriangle,
  Bot, Megaphone, BarChart2, MonitorPlay, FileText, Rocket, Map,
  BookOpen, TrendingUp, UserCheck, Briefcase, Cpu, PieChart,
} from 'lucide-react'

type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean }
type NavSection = { title: string; items: NavItem[] }

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { href: '/',        label: 'Dashboard',       icon: LayoutDashboard, exact: true },
      { href: '/revenue', label: 'Revenue',          icon: DollarSign },
      { href: '/health',  label: 'Platform Health',  icon: Activity },
    ],
  },
  {
    title: 'CLIENTS',
    items: [
      { href: '/clients',              label: 'All Clients', icon: Users },
      { href: '/clients?filter=atrisk', label: 'At-Risk',    icon: AlertTriangle },
    ],
  },
  {
    title: 'AI EXEC TEAM',
    items: [
      { href: '/agents/otto',  label: 'OTTO — CRO', icon: TrendingUp },
      { href: '/agents/lena',  label: 'LENA — CS',  icon: UserCheck },
      { href: '/agents/reeve', label: 'REEVE — AE', icon: Briefcase },
      { href: '/agents/cmo',   label: 'CMO',         icon: Megaphone },
      { href: '/agents/cto',   label: 'CTO',         icon: Cpu },
      { href: '/agents/cfo',   label: 'CFO',         icon: PieChart },
    ],
  },
  {
    title: 'SALES',
    items: [
      { href: '/scalability',          label: 'Scalability',    icon: TrendingUp },
      { href: '/docs/sales-playbook',  label: 'Sales Playbook', icon: BookOpen },
    ],
  },
  {
    title: 'TOOLS',
    items: [
      { href: '/cmo',          label: 'CMO Tools',     icon: Megaphone },
      { href: '/cohorts',      label: 'Cohorts',        icon: BarChart2 },
      { href: '/demo',         label: 'Demo Envs',      icon: MonitorPlay },
      { href: '/terms-library', label: 'Terms Library', icon: FileText },
      { href: '/launch',       label: 'Launch',         icon: Rocket },
      { href: '/roadmap',      label: 'Roadmap',        icon: Map },
    ],
  },
  {
    title: 'DOCS',
    items: [
      { href: '/docs/master',     label: 'MASTER',        icon: BookOpen },
      { href: '/docs/run-costs',  label: 'Run Costs',     icon: DollarSign },
      { href: '/docs/legal',      label: 'Legal',         icon: FileText },
      { href: '/docs/audits',     label: 'Audit Reports', icon: Bot },
      { href: '/compliance',      label: 'Compliance',    icon: FileText },
    ],
  },
]

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  // Strip query string from href for comparison
  const hrefPath = href.split('?')[0]
  if (exact) return pathname === hrefPath
  return pathname === hrefPath || pathname.startsWith(hrefPath + '/')
}

export function AdminNav() {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-[#0a0a0a] flex flex-col z-40 border-r border-white/[0.06]">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#0066FF] flex items-center justify-center">
            <span className="text-white font-bold text-xs">K</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">K.I.N.D</p>
            <p className="text-white/30 text-[10px] mt-0.5">Founder OS</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-white/25 text-[10px] uppercase tracking-widest font-semibold px-3 mb-1 mt-4 first:mt-1">
              {section.title}
            </p>
            {section.items.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(pathname, href, exact)
              return (
                <Link
                  key={href + label}
                  href={href}
                  className={`flex items-center gap-2.5 text-xs px-3 py-2 rounded-md transition-colors ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* System status */}
      <div className="px-4 py-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
          <span className="text-white/30 text-[10px]">All systems operational</span>
        </div>
      </div>
    </aside>
  )
}
