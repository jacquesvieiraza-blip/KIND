'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, CalendarCheck, Target, BarChart3, LogOut } from 'lucide-react'

// #488 — the Milla client shell: a slim light top bar (Milla brand + live credit chips +
// account), a client-only left rail (New leads / Meetings / Campaign / Reports), and the
// working area ({children}). Matches docs/mv-previews/milla2.html.

type Ledger = { reveal_credits: number; work_credits: number }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export function MillaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [led, setLed] = useState<Ledger | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const tok = await token()
        const res = await api.get<{ data: Ledger }>('/leads/ledger', tok)
        setLed(res.data)
      } catch { /* chips degrade to … */ }
    })()
  }, [])

  async function signOut() {
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    window.location.href = '/login'
  }

  const isLeads = pathname === '/milla'
  const rail = (href: string, label: string, Icon: React.ElementType, active: boolean, soon?: boolean) =>
    soon ? (
      <span className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13.5px] font-semibold mb-0.5 text-[#c3bad9] cursor-not-allowed" title="Coming soon">
        <Icon className="w-4 h-4 shrink-0" /> {label}
        <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-[#b3a9cc] bg-[#efeafc] rounded-full px-1.5 py-0.5">soon</span>
      </span>
    ) : (
      <Link href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13.5px] font-semibold mb-0.5 transition-colors ${
        active ? 'bg-[#f3ecff] text-[#7C3AED]' : 'text-[#5c5279] hover:bg-[#f7f4fd]'
      }`}>
        <Icon className="w-4 h-4 shrink-0" /> {label}
      </Link>
    )

  return (
    <div className="h-screen flex flex-col bg-[#faf8ff] text-[#1f1235] overflow-hidden">
      {/* top bar */}
      <header className="h-[52px] shrink-0 flex items-center gap-3 px-4 border-b border-[#eee7f7] bg-white">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center text-[13px] font-extrabold">M</div>
        <div className="text-[15px] font-extrabold">Milla <span className="text-[#9b8ec4] font-semibold text-[13px]">· your campaign partner</span></div>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 border text-[#7C3AED] bg-purple-50 border-purple-200" title="Reveal credits ($1 each)">
            🪙 {led ? led.reveal_credits : '…'} reveal
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 border text-[#EC4899] bg-pink-50 border-pink-200" title="Work credits ($3 each, held on approve)">
            ⚡ {led ? led.work_credits : '…'} work
          </span>
          <button onClick={signOut} title="Sign out" className="w-8 h-8 rounded-full border border-[#e4dcf7] bg-[#f6f2fd] flex items-center justify-center text-[#7c6f9b] hover:bg-[#f0ebfa]">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* body */}
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[210px] shrink-0 border-r border-[#eee7f7] bg-[#fdfcff] flex flex-col px-3 py-4">
          <nav className="mt-1">
            {rail('/milla', 'New leads', Sparkles, isLeads)}
            {rail('#', 'Meetings', CalendarCheck, false, true)}
            {rail('#', 'Campaign', Target, false, true)}
            {rail('#', 'Reports', BarChart3, false, true)}
          </nav>
          <div className="mt-auto text-[11px] text-[#b3a9cc] px-2 leading-relaxed">
            We run your outbound. You just approve the leads worth pursuing.
          </div>
        </aside>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
