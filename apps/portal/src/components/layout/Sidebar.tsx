'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, Users, Bot, MessageSquare, CreditCard, Settings, LogOut, Zap } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/leads', label: 'Lead Gen', icon: Users },
  { href: '/dashboard/assistant', label: 'Virtual Assistant', icon: Bot },
  { href: '/dashboard/chatbot', label: 'Chatbot Agent', icon: MessageSquare },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 bg-[#001f4d] flex flex-col shrink-0">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Zap className="text-[#0066FF] w-5 h-5" />
          <span className="text-white font-bold text-lg tracking-tight">K.I.N.D</span>
        </div>
        <p className="text-white/40 text-xs mt-1">AI Intelligence Platform</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? 'bg-[#0066FF] text-white font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />{label}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 mb-2"><p className="text-white/40 text-xs truncate">{userEmail}</p></div>
        <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />Sign out
        </button>
      </div>
    </aside>
  )
}
