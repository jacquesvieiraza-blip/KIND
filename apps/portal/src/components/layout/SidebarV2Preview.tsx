'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LogOut, Settings, Inbox, Zap, MessageSquare, FileText,
  LayoutDashboard, GitBranch, Plug, GraduationCap, Building2,
  LayoutGrid, Activity, UserPlus, Store, Sliders, PanelLeft, Rocket,
} from 'lucide-react'

type Item = { href: string; label: string; icon: React.ElementType }

// Slim rail — grouped; a `null` entry renders a divider.
const ITEMS: (Item | null)[] = [
  { href: '/v2',              label: 'Home',             icon: LayoutDashboard },
  null,
  { href: '/v2/company',      label: 'Command Centre',   icon: Building2 },
  { href: '/v2/sequences',    label: 'Sequence Builder', icon: GitBranch },
  { href: '/v2/inbox',        label: 'Smart Inbox',      icon: Inbox },
  { href: '/v2/integrations', label: 'Integrations',     icon: Plug },
  { href: '/v2/train',        label: 'Train FIGSY',      icon: GraduationCap },
  null,
  { href: '/v2/onboarding',   label: 'Setup / Onboarding', icon: Rocket },
  { href: '/v2/agents',       label: 'Agent Grid',       icon: LayoutGrid },
  { href: '/v2/thinking',     label: 'Thinking State',   icon: Activity },
  { href: '/v2/setup',        label: 'Conversational',   icon: MessageSquare },
  { href: '/v2/config',       label: 'Config Panel',     icon: Sliders },
  { href: '/v2/marketplace',  label: 'Marketplace',      icon: Store },
  { href: '/v2/shell',        label: 'Slim Layout',      icon: PanelLeft },
  { href: '/v2/invite',       label: 'Invite Team',      icon: UserPlus },
  { href: '/v2/notetaker',    label: 'AI Notetaker',     icon: FileText },
  { href: '/v2/gallery',      label: 'All screens',      icon: Zap },
]

function RailLink({ href, label, icon: Icon }: Item) {
  const pathname = usePathname()
  const active = href === '/v2' ? pathname === '/v2' : pathname.startsWith(href)
  return (
    <Link href={href} className="group relative flex items-center justify-center">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
        active ? 'bg-white/15 text-white' : 'text-purple-200/55 hover:text-white hover:bg-white/[0.08]'
      }`}>
        <Icon className="w-[18px] h-[18px]" />
      </span>
      {/* hover tooltip */}
      <span className="pointer-events-none absolute left-[52px] z-50 whitespace-nowrap rounded-md bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-lg">
        {label}
      </span>
    </Link>
  )
}

export function SidebarV2Preview({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-16 shrink-0 h-screen bg-[#0F0929] flex flex-col items-center py-3 border-r border-white/[0.06]">
      {/* Logo */}
      <Link href="/v2" className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center mb-3 shrink-0">
        <img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" />
      </Link>

      {/* Rail */}
      <nav className="flex-1 w-full flex flex-col items-center gap-1 overflow-y-auto no-scrollbar px-2">
        {ITEMS.map((it, i) => it === null
          ? <div key={`d${i}`} className="w-7 h-px bg-white/[0.08] my-1.5" />
          : <RailLink key={it.href} {...it} />
        )}
      </nav>

      {/* Bottom */}
      <div className="w-full flex flex-col items-center gap-1 pt-2 border-t border-white/[0.06]">
        <RailLink href="/dashboard/settings" label="Settings" icon={Settings} />
        <button onClick={signOut} title={userEmail || 'Sign out'}
          className="group relative w-10 h-10 rounded-xl flex items-center justify-center text-purple-200/55 hover:text-white hover:bg-white/[0.08] transition-colors">
          <LogOut className="w-[18px] h-[18px]" />
          <span className="pointer-events-none absolute left-[52px] z-50 whitespace-nowrap rounded-md bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">Sign out</span>
        </button>
      </div>
    </aside>
  )
}
