'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, CalendarCheck, Target, FileBarChart, LogOut, TrendingUp, LineChart, Gem,
  LayoutGrid, Users, Star, User, CreditCard, Gauge, FileText, Gift, ChevronDown, Bell,
} from 'lucide-react'

// #490/#510 — the Milla client shell (docs/mv-previews/milla2.html): slim top bar (brand +
// live wallet balance chip + notification + account dropdown), a full client rail
// (New leads · Meetings · My campaign · Reports · INSIGHTS · COMPANY · RECENT REPLIES from
// LIVE data), and the working area. Insights/Company link the client's existing real pages.

type Summary = {
  wallet_balance_usd: number; leads_awaiting: number; meetings_booked: number
  recent_replies: { name: string; classification: string }[]
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

const REPLY_TONE: Record<string, string> = {
  hot: 'interested', warm: 'interested', interested: 'interested',
  cold: 'not now', opt_out: 'opted out', unsubscribe: 'opted out',
  wrong_person: 'wrong person', referral: 'referral', out_of_office: 'out of office',
}

export function MillaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [s, setS] = useState<Summary | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ;(async () => {
      try { const r = await api.get<{ data: Summary }>('/leads/milla-summary', await token()); setS(r.data) } catch { /* chips degrade */ }
    })()
  }, [])

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc); return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function signOut() {
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    window.location.href = '/login'
  }

  // #513 — onboarding is full-screen (no rail/top bar) until the client's ICP is live.
  if (pathname === '/milla/welcome') return <>{children}</>

  const isLeads = pathname === '/milla'
  const link = (href: string, label: string, Icon: React.ElementType, active: boolean, badge?: number) => (
    <Link key={label} href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13.5px] font-semibold mb-0.5 transition-colors ${
      active ? 'bg-[#f3ecff] text-[#7C3AED]' : 'text-[#5c5279] hover:bg-[#f7f4fd]'
    }`}>
      <Icon className="w-4 h-4 shrink-0" /> {label}
      {badge ? <span className="ml-auto text-[10px] font-bold text-white bg-[#7C3AED] rounded-full px-1.5">{badge}</span> : null}
    </Link>
  )
  const section = (label: string) => (
    <div className="mt-4 mb-1 px-3 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc]">{label}</div>
  )

  const ACCOUNT: [string, string, React.ElementType][] = [
    ['/milla/settings', 'My profile', User], ['/milla/billing', 'Billing', CreditCard],
    ['/milla/usage', 'Usage', Gauge], ['/milla/documents', 'Documents', FileText],
    ['/milla/referral', 'Referral', Gift],
  ]

  return (
    <div className="h-screen flex flex-col bg-[#faf8ff] text-[#1f1235] overflow-hidden">
      {/* top bar */}
      <header className="h-[54px] shrink-0 flex items-center gap-3 px-5 border-b border-[#eee7f7] bg-white">
        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center text-[14px] font-extrabold">M</div>
        <div className="text-[15px] font-extrabold">Milla<span className="text-[#9b8ec4] font-semibold text-[12.5px]">&amp;Vida</span></div>
        <div className="ml-auto flex items-center gap-3.5">
          <span className="text-[13.5px] font-extrabold text-[#7C3AED]">${s ? s.wallet_balance_usd.toLocaleString() : '…'} <span className="text-[#9b8ec4] font-semibold text-[12px]">wallet</span></span>
          <Bell className="w-4.5 h-4.5 text-[#9b8ec4]" style={{ width: 18, height: 18 }} />
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)} className="flex items-center gap-2 h-8 rounded-full border border-[#ece5fb] bg-white pl-1.5 pr-3 text-[13px] font-extrabold hover:bg-[#f7f4fd]">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white text-[10px] font-extrabold flex items-center justify-center">AC</span>
              Account <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-[#e9e2f8] bg-white shadow-xl py-2">
                <div className="px-3 pb-1.5 pt-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc]">Account</div>
                {ACCOUNT.map(([href, label, Icon]) => (
                  <a key={label} href={href} className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-[#5c5279] hover:bg-[#f7f4fd]">
                    <Icon className="w-4 h-4 text-[#9b8ec4]" /> {label}
                  </a>
                ))}
                <div className="my-1.5 border-t border-[#f0eafa]" />
                <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* #501 flow ribbon — the client's journey, with live badges */}
      <div className="shrink-0 flex items-center gap-1 overflow-x-auto px-5 py-2 bg-[#2a1747] text-white">
        <span className="text-[10px] font-extrabold tracking-[0.1em] text-[#b9a6e6] mr-2.5">FLOW</span>
        {[
          ['Sign up'], ['Build plan'], ['We reach out'], ['Replies'],
          ['You approve', s?.leads_awaiting], ['Follow-up'], ['Meeting booked', s?.meetings_booked], ['Results'],
        ].map(([label, badge], i, arr) => (
          <span key={label as string} className="flex items-center shrink-0">
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#d9cef2] px-1">
              <span className="w-[18px] h-[18px] rounded-full bg-[#3d2a63] text-white text-[10px] font-extrabold flex items-center justify-center">{i + 1}</span>
              {label as string}
              {typeof badge === 'number' && badge > 0 && <span className="text-[9px] font-extrabold bg-[#EC4899] text-white rounded-full px-1.5">{badge}</span>}
            </span>
            {i < arr.length - 1 && <span className="text-[#5b4785] px-0.5">›</span>}
          </span>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* rail */}
        <aside className="w-[216px] shrink-0 border-r border-[#eee7f7] bg-[#fdfcff] flex flex-col px-3 py-4 overflow-y-auto">
          <nav>
            {link('/milla', 'New leads', Sparkles, isLeads, s?.leads_awaiting || undefined)}
            {link('/milla/meetings', 'Meetings', CalendarCheck, pathname.startsWith('/milla/meetings'), s?.meetings_booked || undefined)}
            {link('/milla/campaign', 'My campaign', Target, pathname.startsWith('/milla/campaign'))}
            {link('/milla/reports', 'Reports', FileBarChart, pathname.startsWith('/milla/reports'))}
          </nav>
          {section('Insights')}
          <nav>
            {link('/milla/performance', 'Performance', TrendingUp, pathname.startsWith('/milla/performance'))}
            {link('/milla/analytics', 'Analytics', LineChart, pathname.startsWith('/milla/analytics'))}
            {link('/milla/roi', 'Your ROI', Gem, pathname.startsWith('/milla/roi'))}
          </nav>
          {section('Company')}
          <nav>
            {link('/milla/command-centre', 'Command Centre', LayoutGrid, pathname.startsWith('/milla/command-centre'))}
            {link('/milla/teams', 'Teams Hub', Users, pathname.startsWith('/milla/teams'))}
          </nav>
          {section('Recent replies')}
          <div className="px-1">
            {s && s.recent_replies.length === 0 && <div className="text-[11.5px] text-[#b3a9cc] px-2 py-1">No replies yet.</div>}
            {(s?.recent_replies ?? []).map((r, i) => (
              <div key={i} className="flex items-start gap-2 px-2 py-1.5 text-[12px]">
                <Star className="w-3.5 h-3.5 text-[#EC4899] shrink-0 mt-0.5" />
                <div className="min-w-0"><b className="font-bold">{r.name}</b> <span className="text-[#9b8ec4]">· {REPLY_TONE[r.classification] ?? r.classification}</span></div>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-4 text-[11px] text-[#b3a9cc] px-2 leading-relaxed">We run your outbound. You just approve the leads worth pursuing.</div>
        </aside>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
