'use client'

/**
 * Clients hub tab bar (#281) — folds the formerly-loose sidebar rows
 * (Activity · Activation · Messages) under the Clients hub. Rendered at the top
 * of all four pages; the sidebar now carries a single "Clients" row.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Activity, Flag, MessageCircle } from 'lucide-react'

const TABS = [
  { href: '/clients',    label: 'Clients',    icon: Users },
  { href: '/activity',   label: 'Activity',   icon: Activity },
  { href: '/activation', label: 'Activation', icon: Flag },
  { href: '/messages',   label: 'Messages',   icon: MessageCircle },
]

export function ClientsTabs() {
  const pathname = usePathname()
  return (
    <div className="flex items-center gap-1 border-b border-brand-200/60 -mb-px overflow-x-auto">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === '/clients'
          ? pathname === '/clients' || pathname.startsWith('/clients/')
          : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active
                ? 'border-[#7C3AED] text-[#7C3AED]'
                : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
