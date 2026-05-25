'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Bot, MessageSquare, CreditCard, Settings,
  LogOut, Zap, Map, FileText, Coins, BarChart2, TrendingUp, LineChart,
} from 'lucide-react'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'

function SystemStatus() {
  const [status, setStatus] = React.useState<'checking' | 'ok' | 'degraded'>('checking')

  React.useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
    fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? setStatus('ok') : setStatus('degraded'))
      .catch(() => setStatus('degraded'))
  }, [])

  const dot   = status === 'ok' ? 'bg-green-400' : status === 'degraded' ? 'bg-amber-400' : 'bg-gray-500'
  const label = status === 'ok' ? 'All systems operational' : status === 'degraded' ? 'Service disruption' : 'Checking…'

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot} ${status === 'ok' ? 'animate-pulse' : ''}`} />
      <span className="text-xs text-white/35">{label}</span>
    </div>
  )
}

function RobotIcon({ className }: { className?: string }) {
  return <span className={className} style={{ fontSize: '1rem', lineHeight: 1 }}>🤖</span>
}

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { href: '/dashboard/leads', label: 'Lead Gen', icon: Users },
      { href: '/dashboard/figsy', label: 'FIGSY',    icon: RobotIcon },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { href: '/dashboard/analytics', label: 'Analytics', icon: LineChart },
      { href: '/dashboard/kpis',      label: 'KPIs',       icon: TrendingUp },
      { href: '/dashboard/usage',     label: 'Usage',      icon: BarChart2 },
    ],
  },
  {
    label: 'PRODUCTS',
    items: [
      { href: '/dashboard/assistant', label: 'Milla — VA', icon: Bot },
      { href: '/dashboard/chatbot',   label: 'Vida — Chatbot',     icon: MessageSquare },
      { href: '/dashboard/documents', label: 'Documents',          icon: FileText },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { href: '/dashboard/roadmap',  label: 'Roadmap',  icon: Map },
      { href: '/dashboard/billing',  label: 'Billing',  icon: CreditCard },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function Sidebar({ userEmail, creditBalance = 0 }: { userEmail: string; creditBalance?: number }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 bg-[#001220] flex flex-col shrink-0 border-r border-white/5">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">K.I.N.D</span>
        </div>
        <p className="text-white/30 text-[11px] mt-1.5 ml-9.5">AI Intelligence Platform</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-5">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-white/25 uppercase select-none">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                return (
                  <Link key={href} href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      active
                        ? 'bg-brand-500 text-white font-medium shadow-sm shadow-brand-500/30'
                        : 'text-white/55 hover:text-white hover:bg-white/6'
                    }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/8 space-y-1">
        {/* User row */}
        <div className="px-3 py-2 flex items-center justify-between">
          <p className="text-white/40 text-xs truncate">{userEmail}</p>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <NotificationBell />
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5">
              <Coins className="w-3 h-3 text-yellow-400" />
              <span className="text-xs font-semibold text-white">{creditBalance}</span>
            </div>
          </div>
        </div>

        {/* System status */}
        <div className="px-0">
          <SystemStatus />
        </div>

        {/* Dark mode toggle */}
        <DarkModeToggle />

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-white/55 hover:text-white hover:bg-white/6 transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />Sign out
        </button>
      </div>
    </aside>
  )
}
