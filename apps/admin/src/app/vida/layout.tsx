'use client'

// #485 — the Vida operator shell. Full-screen, light theme, matching
// docs/mv-previews/vida2.html: a slim top bar (Milla&Vida · operator + live chips +
// account dropdown holding the nervous system), a Vida-only left rail (operations +
// engine-health), and the working area ({children} = the clients panel + pipeline board).
// AdminShell bypasses its old chrome for /vida so this is the only shell here.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Power, ClipboardList, Sparkles, Users, CalendarClock, Ban, Receipt,
  ChevronDown, LogOut, Gauge, Wallet, TrendingUp, Rocket, Inbox, Brain,
} from 'lucide-react'

type Status = { outreach_enabled: boolean; daily_cap: number | null }
type Health = { sent_today: number; replies_today: number; pending_approvals: number }

// The nervous system — every existing admin page, reachable from the dropdown.
// Order + labels MIRROR docs/mv-previews/vida2.html exactly (Cockpit·Clients /
// Money Path·Billing / Revenue·GTM / Unibox·Health / Ops·Founder). Outreach +
// Compliance are real extra pages appended after the 10 so no nav is lost.
// (The mockup also shows a "⚙ Settings" link — omitted here on purpose: there is
// no /settings page yet, and a dead link would break the honesty rule.)
const NERVOUS_SYSTEM: { href: string; label: string; icon: string }[] = [
  { href: '/vida/cockpit',    label: 'Cockpit',    icon: '📟' },
  { href: '/vida/clients-admin',    label: 'Clients',    icon: '👥' },
  { href: '/vida/money-path', label: 'Money Path', icon: '💰' },
  { href: '/vida/billing',    label: 'Billing',    icon: '🧾' },
  { href: '/vida/revenue',    label: 'Revenue',    icon: '📈' },
  { href: '/vida/gtm',        label: 'GTM Hub',    icon: '🚀' },
  { href: '/vida/unibox',     label: 'Unibox',     icon: '📥' },
  { href: '/vida/health',     label: 'Health',     icon: '❤️' },
  { href: '/vida/ops',        label: 'Ops',        icon: '🛠' },
  { href: '/vida/founder',    label: 'Founder',    icon: '👑' },
  { href: '/vida/outreach',   label: 'Outreach',   icon: '🎯' },
  { href: '/vida/compliance', label: 'Compliance', icon: '🛡' },
]

function initials(email: string): string {
  const name = email.split('@')[0] || 'OP'
  return name.slice(0, 2).toUpperCase()
}

// Friendly display name for the account button: "jacques.vieiraza@…" → "Jacques".
function displayName(email: string): string {
  const local = (email.split('@')[0] || '').split('.')[0]
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'Operator'
}

export default function VidaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [status, setStatus] = useState<Status | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [email, setEmail] = useState<string>('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/proxy/operator/status').then(r => r.json()).then(j => { if (j?.success) setStatus(j.data) }).catch(() => {})
    fetch('/api/proxy/operator/health').then(r => r.json()).then(j => { if (j?.success) setHealth(j.data) }).catch(() => {})
    fetch('/api/proxy/operator/whoami').then(r => r.json()).then(j => { if (j?.success) setEmail(j.data.email) }).catch(() => {})
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function signOut() {
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    window.location.href = '/login'
  }

  const on = status?.outreach_enabled === true
  const isClients = pathname === '/vida'
  const isAudit = pathname.startsWith('/vida/audit')
  const isQueue = pathname.startsWith('/vida/queue')
  const isBookings = pathname.startsWith('/vida/bookings')
  const isSuppression = pathname.startsWith('/vida/suppression')
  const isReports = pathname.startsWith('/vida/reports')
  const pendingCount = health?.pending_approvals ?? null

  // #502 — the ENGINE section, moved OUT of the account dropdown into the rail (native
  // Vida routes, no old-admin exit). Nexus signals is now LIVE (#511 complete) — a real
  // /vida/nexus route in the rail below, never a dead link. Design ref: the approved Vida blend.
  const ENGINE_RAIL: { href: string; label: string; icon: React.ElementType }[] = [
    { href: '/vida/cockpit',    label: 'Cockpit',    icon: Gauge },
    { href: '/vida/money-path', label: 'Money Path', icon: Wallet },
    { href: '/vida/revenue',    label: 'Revenue',    icon: TrendingUp },
    { href: '/vida/gtm',        label: 'GTM Hub',    icon: Rocket },
    { href: '/vida/unibox',     label: 'Unibox',     icon: Inbox },
  ]

  const railLink = (href: string, label: string, Icon: React.ElementType, active: boolean) => (
    <Link href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13.5px] font-semibold mb-0.5 transition-colors ${
      active ? 'bg-[#f3ecff] text-[#7C3AED]' : 'text-[#5c5279] hover:bg-[#f7f4fd]'
    }`}>
      <Icon className="w-4 h-4 shrink-0" /> {label}
    </Link>
  )

  return (
    <div className="h-screen flex flex-col bg-[#faf8ff] text-[#1f1235] overflow-hidden">
      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <header className="h-[52px] shrink-0 flex items-center gap-3 px-4 border-b border-[#eee7f7] bg-white">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center text-[13px] font-extrabold">V</div>
        <div className="text-[15px] font-extrabold">Milla&amp;Vida <span className="text-[#9b8ec4] font-semibold text-[13px]">· operator</span></div>

        <div className="ml-auto flex items-center gap-2">
          {/* Kill-switch chip */}
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 border ${
            on ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'
          }`} title="Global outreach kill-switch (AUTO_OUTREACH_ENABLED)">
            <Power className="w-3.5 h-3.5" /> Kill-switch {status ? (on ? 'ON' : 'OFF') : '…'}
          </span>
          {/* Cap chip — neutral "…" until status loads (never assert "no cap" on unknown),
              amber only when status has loaded AND no cap is configured, purple with the cap. */}
          <span className={`inline-flex items-center text-xs font-bold rounded-full px-3 py-1 border ${
            !status ? 'text-[#9b8ec4] bg-[#f6f2fd] border-[#e4dcf7]'
              : status.daily_cap == null ? 'text-amber-700 bg-amber-50 border-amber-200'
              : 'text-[#7C3AED] bg-purple-50 border-purple-200'
          }`} title="Global daily cold-send cap (FIGSY_COLD_DAILY_CAP / warm-up ramp)">
            {!status ? 'Cap …' : status.daily_cap == null ? '⚠ No send cap set' : `Cap ${status.daily_cap}/day`}
          </span>

          {/* Account dropdown = the nervous system */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)}
              className="flex items-center gap-2 rounded-full border border-[#e4dcf7] bg-[#f6f2fd] py-1 pl-1 pr-3 hover:bg-[#f0ebfa] transition-colors">
              <span className="w-7 h-7 rounded-full bg-[#151033] text-white flex items-center justify-center text-[11px] font-bold">{email ? initials(email) : 'OP'}</span>
              <span className="text-[13px] font-semibold text-[#1f1235]">{email ? displayName(email) : 'Operator'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#9b8ec4]" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-[42px] w-[280px] bg-white border border-[#ece5fb] rounded-2xl shadow-[0_12px_40px_rgba(124,58,237,0.15)] p-2 z-50">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-[#b3a9cc] px-2.5 pt-1.5 pb-1">Nervous system · admin</p>
                <div className="grid grid-cols-2 gap-0.5">
                  {NERVOUS_SYSTEM.map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] text-[#4c4368] hover:bg-[#f7f4fd] transition-colors">
                      <span>{item.icon}</span> {item.label}
                    </Link>
                  ))}
                </div>
                <div className="h-px bg-[#f0ebfa] my-1.5" />
                <button onClick={signOut} className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[12.5px] text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY: rail + working area ───────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[212px] shrink-0 border-r border-[#eee7f7] bg-[#fdfcff] flex flex-col px-3 py-4">
          <div className="flex items-center gap-2.5 px-2 pb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold">V</div>
            <div className="leading-tight">
              <b className="text-[13.5px]">Vida</b>
              <span className="block text-[10.5px] text-[#9b8ec4]">Engine console</span>
            </div>
          </div>

          <nav className="mt-1">
            {railLink('/vida', 'Clients', Users, isClients)}
            {railLink('/vida/audit', 'Audit log', ClipboardList, isAudit)}
            <Link href="/vida/queue" className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13.5px] font-semibold mb-0.5 transition-colors ${
              isQueue ? 'bg-[#f3ecff] text-[#7C3AED]' : 'text-[#5c5279] hover:bg-[#f7f4fd]'
            }`}>
              <Sparkles className="w-4 h-4 shrink-0" /> Lead queue
              {pendingCount != null && pendingCount > 0 && (
                <span className="ml-auto text-[10px] font-extrabold text-white bg-[#7C3AED] rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{pendingCount}</span>
              )}
            </Link>
            {railLink('/vida/bookings', 'Bookings', CalendarClock, isBookings)}
            {railLink('/vida/suppression', 'Suppression', Ban, isSuppression)}
            {railLink('/vida/reports', 'Reports & billing', Receipt, isReports)}
          </nav>

          {/* #502 ENGINE — the nervous system in the rail (native routes) */}
          <div className="mt-4 px-3 text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-[#b3a9cc]">Engine</div>
          <nav className="mt-1.5">
            {ENGINE_RAIL.map(item => railLink(item.href, item.label, item.icon, pathname.startsWith(item.href)))}
            {railLink('/vida/nexus', 'Nexus signals', Brain, pathname.startsWith('/vida/nexus'))}
          </nav>

          {/* Engine health — real numbers */}
          <div className="mt-5 bg-[#f7f4fd] border border-[#eee7f7] rounded-xl p-3">
            <h4 className="text-[10px] tracking-[0.07em] uppercase text-[#b3a9cc] font-bold mb-2.5">Engine health · FIGSY</h4>
            <div className="flex justify-between text-xs py-0.5 text-[#5c5279]"><span>Sends (today)</span><b className={on ? 'text-emerald-600' : 'text-[#9b8ec4]'}>{on ? 'live' : 'paused'}</b></div>
            <div className="flex justify-between text-xs py-0.5 text-[#5c5279]"><span>Sent today</span><b>{health?.sent_today ?? '—'}</b></div>
            <div className="flex justify-between text-xs py-0.5 text-[#5c5279]"><span>Replies to triage</span><b>{health?.replies_today ?? '—'}</b></div>
            <div className="flex justify-between text-xs py-0.5 text-[#5c5279]"><span>Awaiting approval</span><b>{health?.pending_approvals ?? '—'}</b></div>
          </div>

          <div className="mt-auto flex items-center gap-2.5 px-2.5 py-2.5 border-t border-[#eee7f7]">
            <span className="w-[30px] h-[30px] rounded-full bg-[#151033] text-white flex items-center justify-center text-[11px] font-bold">{email ? initials(email) : 'OP'}</span>
            <div className="leading-tight min-w-0">
              <b className="text-xs block">Operator</b>
              <span className="text-[10.5px] text-[#9b8ec4] block truncate">{email || '…'}</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
