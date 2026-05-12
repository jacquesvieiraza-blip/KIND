'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, Map } from 'lucide-react'

const NAV = [
  { href: '/',              label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/clients',       label: 'Clients',       icon: Users },
  { href: '/terms-library', label: 'Terms Library', icon: FileText },
  { href: '/roadmap',       label: 'Roadmap',       icon: Map },
]

function pageTitle(pathname: string) {
  if (pathname.startsWith('/clients/')) return 'Client Detail'
  const match = NAV.find(n => n.href !== '/' && pathname.startsWith(n.href))
  return match?.label ?? 'Dashboard'
}

export function AdminNav() {
  const pathname = usePathname()
  return (
    <header className="bg-[#001f4d] text-white px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="font-bold text-lg">K.I.N.D Admin</h1>
        <p className="text-white/50 text-xs">{pageTitle(pathname)}</p>
      </div>
      <nav className="flex items-center gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors ${
                active ? 'bg-white/15 text-white font-medium' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
