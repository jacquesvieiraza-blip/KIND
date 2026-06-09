'use client'

/** Top-right profile chip for the V2 header. Shows the user's initials; on hover
 *  (or click) reveals a profile card with name, email, and quick links.
 *  Replaces the bare purple dot. Rendered only inside the flagged V2 layout. */

import Link from 'next/link'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Settings, LogOut, User } from 'lucide-react'

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
        className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#a78bfa] shrink-0 flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white shadow-sm hover:shadow-md transition-shadow"
        title={display}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-br from-[#7C3AED] to-[#a78bfa]">
            <div className="w-10 h-10 rounded-full bg-white/20 ring-2 ring-white/40 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{display}</p>
              <p className="text-white/75 text-[11px] truncate">{email}</p>
            </div>
          </div>
          <div className="py-1.5">
            <Link href="/dashboard/settings" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <User className="w-4 h-4 text-gray-400" /> My profile
            </Link>
            <Link href="/dashboard/settings" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4 text-gray-400" /> Settings
            </Link>
            <button onClick={signOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
