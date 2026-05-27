'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Home, Users, Inbox, Target, BarChart, CreditCard, Settings,
  LogOut, Zap, FileText, Coins, Map, Bot, MessageSquare,
  BarChart2, Brain, Search, TrendingUp, Lock, ChevronRight,
} from 'lucide-react'
import { NotificationBell } from '@/components/ui/NotificationBell'

// ── Nav definitions ───────────────────────────────────────────────────────────

const LEAD_GEN_NAV = [
  { href: '/dashboard',                label: 'Home',            icon: Home },
  { href: '/dashboard/leads',          label: 'People',          icon: Users },
  { href: '/dashboard/leads/icp',      label: 'ICP Builder',     icon: TrendingUp },
  { href: '/dashboard/leads/linkedin', label: 'LinkedIn Import', icon: Search },
]

const FIGSY_NAV = [
  { href: '/dashboard/figsy',          label: 'Campaigns',   icon: Target },
  { href: '/dashboard/figsy/replies',  label: 'Inbox',       icon: Inbox,  badge: 'unread' as const },
  { href: '/dashboard/kpis',           label: 'Performance', icon: BarChart },
  { href: '/dashboard/knowledge',      label: 'Knowledge',   icon: Brain },
]

const MILLA_NAV = [
  { href: '/dashboard/assistant', label: 'Assistant', icon: Bot },
  { href: '/dashboard/documents', label: 'Documents', icon: FileText },
]

const VIDA_NAV = [
  { href: '/dashboard/chatbot', label: 'Chatbot', icon: MessageSquare },
]

const ACCOUNT_NAV = [
  { href: '/dashboard/usage',    label: 'Usage',    icon: BarChart2 },
  { href: '/dashboard/roadmap',  label: 'Roadmap',  icon: Map },
  { href: '/dashboard/billing',  label: 'Billing',  icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

// ── System status ─────────────────────────────────────────────────────────────

function SystemStatus() {
  const [status, setStatus] = React.useState<'checking' | 'ok' | 'degraded'>('checking')
  React.useEffect(() => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
    fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) })
      .then(r => r.ok ? setStatus('ok') : setStatus('degraded'))
      .catch(() => setStatus('degraded'))
  }, [])
  const dot   = status === 'ok' ? 'bg-emerald-400' : status === 'degraded' ? 'bg-amber-400' : 'bg-purple-400/40'
  const label = status === 'ok' ? 'All systems operational' : status === 'degraded' ? 'Service disruption' : 'Checking…'
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} ${status === 'ok' ? 'animate-pulse' : ''}`} />
      <span className="text-[11px] text-purple-300/50">{label}</span>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar({
  userEmail,
  creditBalance = 0,
  hasFigsy = false,
  hasMilla = false,
  hasVida  = false,
}: {
  userEmail: string
  creditBalance?: number
  hasFigsy?: boolean
  hasMilla?: boolean
  hasVida?: boolean
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || !hasFigsy) return
      try {
        const url = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
        const res = await fetch(`${url}/figsy/replies/unread`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: AbortSignal.timeout(5000),
        })
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data?.data?.count ?? 0)
        }
      } catch { /* silent */ }
    })
  }, [supabase, hasFigsy])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function NavLink({
    href, label, icon: Icon, badge,
  }: { href: string; label: string; icon: React.ElementType; badge?: 'unread' }) {
    const active      = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    const showUnread  = badge === 'unread' && unreadCount > 0
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
          active
            ? 'bg-[#7C3AED] text-white shadow-sm shadow-purple-900/60'
            : 'text-purple-200/55 hover:text-white hover:bg-white/[0.07]'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {showUnread && (
          <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
            active ? 'bg-white text-[#7C3AED]' : 'bg-red-500 text-white'
          }`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    )
  }

  // Agent upgrade card — shows when not subscribed
  function AgentUpgradeCard({
    id, name, role, price, accent, href,
  }: { id: string; name: string; role: string; price: string; accent: string; href: string }) {
    return (
      <Link
        href={href}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.04] transition-all group"
      >
        <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-white/10 shrink-0 relative">
          <img
            src={`/agents/${id}.png`}
            alt={name}
            className="w-full h-full object-cover object-top opacity-50 group-hover:opacity-70 transition-opacity"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Lock className="w-2.5 h-2.5 text-white/70" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-purple-200/50 text-xs font-semibold group-hover:text-purple-200 transition-colors">{name}</p>
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: accent, background: `${accent}18` }}>{role}</span>
          </div>
          <p className="text-purple-300/30 text-[10px] group-hover:text-purple-300/50 transition-colors">{price} · Unlock →</p>
        </div>
        <ChevronRight className="w-3 h-3 text-purple-300/20 group-hover:text-purple-300/50 transition-colors shrink-0" />
      </Link>
    )
  }

  // Active agent section header
  function AgentHeader({ id, name, role, accentDot }: { id: string; name: string; role: string; accentDot: string }) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08]">
        <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-[#7C3AED]/30 shrink-0">
          <img
            src={`/agents/${id}.png`}
            alt={name}
            className="w-full h-full object-cover object-top"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-white text-xs font-semibold">{name}</p>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentDot }} />
          </div>
          <p className="text-purple-300/40 text-[10px]">{role} · Active</p>
        </div>
      </div>
    )
  }

  return (
    <aside className="w-[224px] bg-[#0F0929] flex flex-col shrink-0 border-r border-white/[0.06]">

      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-2.5 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-[#7C3AED] flex items-center justify-center shadow-sm shadow-purple-950/80">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-sm tracking-tight">K.I.N.D</span>
      </div>

      <nav className="flex-1 px-3 pt-3 pb-2 space-y-0.5 overflow-y-auto">

        {/* ── LEAD GEN — standard product ───────────────────────────── */}
        <p className="text-[10px] text-purple-400/40 px-3 pb-1.5 font-semibold uppercase tracking-wider">
          Lead Gen
        </p>
        {LEAD_GEN_NAV.map(item => <NavLink key={item.href} {...item} />)}

        {/* ── AI AGENTS ─────────────────────────────────────────────── */}
        <div className="!mt-4">
          <p className="text-[10px] text-purple-400/40 px-3 pb-1.5 font-semibold uppercase tracking-wider">
            AI Agents
          </p>

          {/* FIGSY */}
          {hasFigsy ? (
            <div className="space-y-0.5">
              <AgentHeader id="figsy" name="FIGSY" role="AI SDR" accentDot="#7C3AED" />
              <div className="pl-1 space-y-0.5 mt-1">
                {FIGSY_NAV.map(item => <NavLink key={item.href} {...item} />)}
              </div>
            </div>
          ) : (
            <AgentUpgradeCard
              id="figsy" name="FIGSY" role="AI SDR"
              price="Add FIGSY" accent="#7C3AED"
              href="/dashboard/billing"
            />
          )}

          {/* Milla */}
          <div className="mt-1.5">
            {hasMilla ? (
              <div className="space-y-0.5">
                <AgentHeader id="milla" name="Milla" role="Virtual Assistant" accentDot="#F472B6" />
                <div className="pl-1 space-y-0.5 mt-1">
                  {MILLA_NAV.map(item => <NavLink key={item.href} {...item} />)}
                </div>
              </div>
            ) : (
              <AgentUpgradeCard
                id="milla" name="Milla" role="VA"
                price="$49/mo" accent="#F472B6"
                href="/dashboard/billing"
              />
            )}
          </div>

          {/* Vida */}
          <div className="mt-1.5">
            {hasVida ? (
              <div className="space-y-0.5">
                <AgentHeader id="vida" name="Vida" role="Chatbot" accentDot="#14B8A6" />
                <div className="pl-1 space-y-0.5 mt-1">
                  {VIDA_NAV.map(item => <NavLink key={item.href} {...item} />)}
                </div>
              </div>
            ) : (
              <AgentUpgradeCard
                id="vida" name="Vida" role="Chatbot"
                price="$39/mo" accent="#14B8A6"
                href="/dashboard/billing"
              />
            )}
          </div>
        </div>

        {/* ── Account ────────────────────────────────────────────────── */}
        <div className="!mt-4 border-t border-white/[0.06] !pt-3 space-y-0.5">
          {ACCOUNT_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${
                  active
                    ? 'bg-white/[0.10] text-purple-200'
                    : 'text-purple-300/35 hover:text-purple-200 hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {label}
              </Link>
            )
          })}
        </div>

      </nav>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] space-y-1.5">
        <div className="px-3 flex items-center justify-between">
          <p className="text-purple-300/35 text-[11px] truncate">{userEmail}</p>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <NotificationBell />
            <div className="flex items-center gap-1 bg-[#F59E0B]/10 border border-[#F59E0B]/25 rounded-full px-2 py-0.5">
              <Coins className="w-3 h-3 text-[#F59E0B]" />
              <span className="text-[11px] font-bold text-[#F59E0B]">{creditBalance}</span>
            </div>
          </div>
        </div>
        <SystemStatus />
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[12px] text-purple-300/35 hover:text-purple-200 hover:bg-white/[0.05] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
