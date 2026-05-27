'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, FileText, Map, Megaphone,
  Rocket, MonitorPlay, TrendingUp, GitMerge, BookOpen, Inbox,
  ShieldCheck,
} from 'lucide-react'

const NAV = [
  { href: '/',              label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/unibox',        label: 'Unibox',           icon: Inbox },
  { href: '/clients',       label: 'Clients',          icon: Users },
  { href: '/demo',          label: 'Demo Envs',        icon: MonitorPlay },
  { href: '/terms-library', label: 'Terms Library',    icon: FileText },
  { href: '/roadmap',       label: 'Roadmap',          icon: Map },
  { href: '/scalability',   label: 'Scalability',      icon: TrendingUp },
  { href: '/playbook',      label: 'Playbook',         icon: BookOpen },
  { href: '/cmo',           label: 'CMO Tools',        icon: Megaphone },
  { href: '/launch',        label: 'Launch',           icon: Rocket },
  { href: '/hubspot',       label: 'HubSpot',          icon: GitMerge },
  { href: '/founder',       label: 'Founder',          icon: ShieldCheck },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col h-full overflow-y-auto"
      style={{ background: '#0F0929' }}
    >
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
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                active
                  ? 'bg-[#7C3AED] text-white font-semibold shadow-md shadow-purple-900/30'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
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
