'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Bot, MessageSquare, CreditCard, Settings,
  LogOut, Zap, FileText, Coins, BarChart2, TrendingUp, LineChart,
  Inbox, Play, GitBranch, Target, ChevronRight,
} from 'lucide-react'
import { NotificationBell } from '@/components/ui/NotificationBell'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'

function RobotIcon({ className }: { className?: string }) {
  return <span className={className} style={{ fontSize: '1rem', lineHeight: 1 }}>🤖</span>
}

// ── Product tabs ────────────────────────────────────────────────────────────
type Product = 'leadgen' | 'figsy' | 'more'

const PRODUCT_TABS: { id: Product; label: string; icon: React.ReactNode; match: string[] }[] = [
  {
    id: 'leadgen',
    label: 'Lead Gen',
    icon: <Users className="w-4 h-4" />,
    match: ['/dashboard/leads', '/dashboard/analytics', '/dashboard/kpis', '/dashboard/usage'],
  },
  {
    id: 'figsy',
    label: 'FIGSY',
    icon: <RobotIcon className="text-base leading-none" />,
    match: ['/dashboard/figsy'],
  },
  {
    id: 'more',
    label: 'Products',
    icon: <Zap className="w-4 h-4" />,
    match: ['/dashboard/assistant', '/dashboard/chatbot', '/dashboard/documents'],
  },
]

// ── Sub-nav per product ─────────────────────────────────────────────────────
const SUB_NAV: Record<Product, { href: string; label: string; icon: React.ReactNode }[]> = {
  leadgen: [
    { href: '/dashboard',            label: 'Overview',    icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: '/dashboard/leads/icp',  label: 'ICP Builder', icon: <Target className="w-4 h-4" /> },
    { href: '/dashboard/leads',      label: 'Leads',       icon: <Users className="w-4 h-4" /> },
    { href: '/dashboard/analytics',  label: 'Analytics',   icon: <LineChart className="w-4 h-4" /> },
    { href: '/dashboard/kpis',       label: 'KPIs',        icon: <TrendingUp className="w-4 h-4" /> },
    { href: '/dashboard/usage',      label: 'Usage',       icon: <BarChart2 className="w-4 h-4" /> },
  ],
  figsy: [
    { href: '/dashboard/figsy',         label: 'Campaigns',  icon: <Play className="w-4 h-4" /> },
    { href: '/dashboard/figsy/replies', label: 'Inbox',      icon: <Inbox className="w-4 h-4" /> },
    { href: '/dashboard/analytics',     label: 'Analytics',  icon: <LineChart className="w-4 h-4" /> },
    { href: '/dashboard/kpis',          label: 'KPIs',       icon: <TrendingUp className="w-4 h-4" /> },
  ],
  more: [
    { href: '/dashboard/assistant', label: 'Milla — VA', icon: <Bot className="w-4 h-4" /> },
    { href: '/dashboard/chatbot',   label: 'Vida — Chatbot',     icon: <MessageSquare className="w-4 h-4" /> },
    { href: '/dashboard/documents', label: 'Documents',          icon: <FileText className="w-4 h-4" /> },
  ],
}

// ── System status dot ───────────────────────────────────────────────────────
function SystemStatus() {
  const [status, setStatus] = React.useState<'ok' | 'degraded' | 'checking'>('checking')
  React.useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
    fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) })
      .then(r => setStatus(r.ok ? 'ok' : 'degraded'))
      .catch(() => setStatus('degraded'))
  }, [])
  const dot   = status === 'ok' ? 'bg-green-400' : status === 'degraded' ? 'bg-amber-400' : 'bg-gray-500'
  const label = status === 'ok' ? 'All systems operational' : status === 'degraded' ? 'Degraded' : 'Checking…'
  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${status === 'ok' ? 'animate-pulse' : ''}`} />
      <span className="text-[11px] text-white/30">{label}</span>
    </div>
  )
}

// ── Sidebar V2 ──────────────────────────────────────────────────────────────
export function SidebarV2({ userEmail, creditBalance = 0 }: { userEmail: string; creditBalance?: number }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  // Detect active product from pathname
  function detectProduct(path: string): Product {
    if (PRODUCT_TABS[1].match.some(m => path.startsWith(m))) return 'figsy'
    if (PRODUCT_TABS[2].match.some(m => path.startsWith(m))) return 'more'
    return 'leadgen'
  }

  const [activeProduct, setActiveProduct] = useState<Product>(() => detectProduct(pathname))

  // Keep product tab in sync when navigating
  useEffect(() => {
    setActiveProduct(detectProduct(pathname))
  }, [pathname])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const subNav = SUB_NAV[activeProduct]

  return (
    <aside className="w-64 bg-[#080f1e] flex flex-col shrink-0 border-r border-white/[0.06]">

      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 shadow-ds-brand">
            <img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">K.I.N.D</span>
        </div>
      </div>

      {/* ── Product switcher tabs ─────────────────────────────────────── */}
      <div className="px-3 pt-4 pb-3 border-b border-white/[0.06]">
        <p className="px-1 mb-2 text-[10px] font-semibold text-white/25 uppercase tracking-widest">Product</p>
        <div className="space-y-0.5">
          {PRODUCT_TABS.map(tab => {
            const active = activeProduct === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveProduct(tab.id)
                  // Navigate to first item in that product's sub-nav
                  router.push(SUB_NAV[tab.id][0].href)
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-ds-md text-sm font-medium transition-all ${
                  active
                    ? 'bg-brand-500 text-white shadow-ds-brand'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {tab.icon}
                  {tab.label}
                </span>
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Contextual sub-nav ────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="px-1 mb-2 text-[10px] font-semibold text-white/25 uppercase tracking-widest">
          {activeProduct === 'leadgen' ? 'Lead Generation' : activeProduct === 'figsy' ? 'FIGSY SDR' : 'Products'}
        </p>
        <div className="space-y-0.5">
          {subNav.map(({ href, label, icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-ds-md text-sm transition-all ${
                  active
                    ? 'bg-white/[0.1] text-white font-medium'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <span className={active ? 'text-white' : 'text-white/40'}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </div>

        {/* Always-visible account section */}
        <div className="mt-6">
          <p className="px-1 mb-2 text-[10px] font-semibold text-white/25 uppercase tracking-widest">Account</p>
          <div className="space-y-0.5">
            {[
              { href: '/dashboard/billing',  label: 'Billing',  icon: <CreditCard className="w-4 h-4" /> },
              { href: '/dashboard/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
            ].map(({ href, label, icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-ds-md text-sm transition-all ${
                    active ? 'bg-white/[0.1] text-white font-medium' : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                  }`}>
                  <span className={active ? 'text-white' : 'text-white/40'}>{icon}</span>
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* ── Bottom: user + controls ───────────────────────────────────── */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
        {/* User + credits row */}
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-white/40 text-xs truncate">{userEmail}</p>
            <SystemStatus />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <NotificationBell />
            <div className="flex items-center gap-1 bg-white/[0.08] rounded-full px-2 py-0.5">
              <Coins className="w-3 h-3 text-yellow-400" />
              <span className="text-xs font-semibold text-white">{creditBalance}</span>
            </div>
          </div>
        </div>

        <DarkModeToggle />

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-ds-md text-sm text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />Sign out
        </button>
      </div>
    </aside>
  )
}
