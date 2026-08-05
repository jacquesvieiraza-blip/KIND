'use client'

/** Top-right profile menu — the ACCOUNT HUB for the V2 layout.
 *  The slim left rail holds work only; everything account/settings/growth lives
 *  here under the user's name, grouped so it doesn't become a flat clunky list. */

import Link from 'next/link'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Settings, LogOut, User, BarChart2, CreditCard, Code2,
  Plug, Network, FileText, MessageCircle, Handshake, Gift, Mic,
} from 'lucide-react'

type MenuLink = { href: string; label: string; icon: React.ElementType }
type Group = { heading: string; links: MenuLink[] }

const GROUPS: Group[] = [
  {
    heading: 'Account',
    links: [
      // #628 — the SECOND place that called this page "My profile". The founder went looking
      // for Settings on his own product and could not find it, because neither entry point
      // used the word. The page holds account settings, not a profile — both say so now.
      { href: '/dashboard/settings',  label: 'Settings',   icon: User },
      { href: '/dashboard/billing',   label: 'Billing',    icon: CreditCard },
      { href: '/dashboard/usage',     label: 'Usage',      icon: BarChart2 },
      { href: '/dashboard/documents', label: 'Documents',  icon: FileText },
      // Notetaker re-homed here 10 Jul (FIGSY-only cut) — standalone utility that
      // was buried under the removed Milla agent.
      { href: '/dashboard/notetaker', label: 'Notetaker',  icon: Mic },
    ],
  },
  {
    heading: 'Connect',
    links: [
      { href: '/dashboard/integrations', label: 'Integrations',  icon: Plug },
      { href: '/dashboard/developer',    label: 'Developer API', icon: Code2 },
      { href: '/dashboard/mcp',          label: 'MCP Connect',   icon: Network },
    ],
  },
  {
    heading: 'Grow',
    links: [
      { href: '/dashboard/proposals',  label: 'Proposals',   icon: FileText },
      { href: '/dashboard/messages',   label: 'Messages',    icon: MessageCircle },
      { href: '/dashboard/partner',    label: 'Partner Hub', icon: Handshake },
      { href: '/dashboard/referral',   label: 'Referral',    icon: Gift },
      // Marketplace + What's New hidden from nav 10 Jul (FIGSY-only cut).
    ],
  },
]

function initialsFrom(name: string, email: string): string {
  const src = (name || email.split('@')[0] || '').trim()
  const parts = src.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (src.slice(0, 2) || '?').toUpperCase()
}

export function ProfileMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const closeT = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initials = initialsFrom(name, email)
  const display = name || email.split('@')[0]

  function show() { if (closeT.current) clearTimeout(closeT.current); setOpen(true) }
  function hide() { closeT.current = setTimeout(() => setOpen(false), 160) }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-50 transition-colors"
        title={display}
      >
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#a78bfa] shrink-0 flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white shadow-sm">
          {initials}
        </span>
        <span className="hidden sm:block text-[13px] font-medium text-gray-700 max-w-[120px] truncate">{display}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-[78vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-br from-[#7C3AED] to-[#a78bfa] sticky top-0">
            <div className="w-10 h-10 rounded-full bg-white/20 ring-2 ring-white/40 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{display}</p>
              <p className="text-white/75 text-[11px] truncate">{email}</p>
            </div>
          </div>

          {/* Grouped links */}
          <div className="py-1">
            {GROUPS.map(group => (
              <div key={group.heading} className="py-1">
                <p className="px-4 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.heading}</p>
                {group.links.map(({ href, label, icon: Icon }) => (
                  <Link key={label} href={href} onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Icon className="w-4 h-4 text-gray-400 shrink-0" /> {label}
                  </Link>
                ))}
              </div>
            ))}

            {/* Settings + Sign out */}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <Link href="/dashboard/settings" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Settings className="w-4 h-4 text-gray-400 shrink-0" /> Settings
              </Link>
              <button onClick={signOut}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4 shrink-0" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
