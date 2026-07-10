'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LogOut, Settings, Inbox, Zap, MessageSquare, FileText,
  LayoutDashboard, GitBranch, Plug, GraduationCap, Building2,
  LayoutGrid, Activity, UserPlus, Store, Sliders, PanelLeft,
  Pin,
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

export function SidebarV2Preview({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [pinned, setPinned] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Collapsed by default (icons only) → widens on hover; pin locks it open.
  const widthCls = pinned ? 'w-56' : 'w-16 hover:w-56'
  const labelCls = pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'

  function Row({ href, label, icon: Icon }: Item) {
    const active = href === '/v2' ? pathname === '/v2' : pathname.startsWith(href)
    return (
      <Link href={href}
        className={`mx-2 flex items-center gap-3 h-10 px-3 rounded-xl transition-colors ${
          active ? 'bg-white/15 text-white' : 'text-purple-200/55 hover:text-white hover:bg-white/[0.08]'
        }`}>
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className={`text-[13px] font-medium whitespace-nowrap transition-opacity duration-150 ${labelCls}`}>{label}</span>
      </Link>
    )
  }

  return (
    <aside className={`group ${widthCls} shrink-0 h-screen bg-[#0F0929] flex flex-col py-3 border-r border-white/[0.06] transition-[width] duration-200 overflow-hidden`}>
      {/* Logo + pin */}
      <div className="flex items-center h-10 mx-2 px-3 mb-1">
        <Link href="/v2" className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 -ml-1.5">
          <img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" />
        </Link>
        <span className={`ml-1.5 text-white font-bold text-sm tracking-tight whitespace-nowrap transition-opacity ${labelCls}`}>K·I·N·D</span>
        <button onClick={() => setPinned(p => !p)}
          className={`ml-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all ${labelCls} ${pinned ? 'text-[#a78bfa] bg-white/10' : 'text-purple-200/50 hover:text-white hover:bg-white/[0.08]'}`}
          title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}>
          <Pin className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rail */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden no-scrollbar">
        {ITEMS.map((it, i) => it === null
          ? <div key={`d${i}`} className="h-px bg-white/[0.08] my-1.5 mx-4" />
          : <Row key={it.href} {...it} />
        )}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-0.5 pt-2 border-t border-white/[0.06]">
        <Row href="/dashboard/settings" label="Settings" icon={Settings} />
        <button onClick={signOut}
          className="mx-2 flex items-center gap-3 h-10 px-3 rounded-xl text-purple-200/55 hover:text-white hover:bg-white/[0.08] transition-colors">
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          <span className={`text-[13px] font-medium whitespace-nowrap transition-opacity ${labelCls}`}>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
