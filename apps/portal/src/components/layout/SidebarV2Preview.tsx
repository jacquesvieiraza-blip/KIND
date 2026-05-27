'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Play, Inbox, Users, TrendingUp,
  CreditCard, Settings, LogOut, Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { href: '/v2',                    label: 'Home',       icon: LayoutDashboard, exact: true },
  { href: '/dashboard/figsy',       label: 'FIGSY',      icon: Play },
  { href: '/dashboard/inbox',       label: 'Inbox',      icon: Inbox },
  { href: '/dashboard/leads',       label: 'Leads',      icon: Users },
  { href: '/dashboard/analytics',   label: 'Analytics',  icon: TrendingUp },
  { href: '/dashboard/billing',     label: 'Billing',    icon: CreditCard },
  { href: '/dashboard/settings',    label: 'Settings',   icon: Settings },
]

export function SidebarV2Preview({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 shrink-0 h-screen bg-[#0F0929] flex flex-col border-r border-white/[0.06]">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#7C3AED] rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">K·I·N·D</span>
          <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#7C3AED]/30 text-[#a78bfa]">v2</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-purple-300/60 hover:text-white hover:bg-white/[0.06]'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
        <p className="text-[11px] text-purple-300/30 px-3 truncate">{userEmail}</p>
        <button onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-purple-300/40 hover:text-white hover:bg-white/[0.06] transition-colors">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  )
}
