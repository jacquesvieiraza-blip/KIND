'use client'

import { usePathname } from 'next/navigation'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminHeader } from '@/components/AdminHeader'
import { NoraColumn } from '@/components/NoraColumn'

// Renders the admin chrome (sidebar · header · Nora) around every page EXCEPT the
// login page, which must appear standalone (no nav to a gated cockpit). #308.
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="flex h-full overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        {/* #277 — the portal's warm peach→lavender backdrop; Nora is a docked
           collapsible right-rail inside the scrolled <main>. */}
        <main className="flex-1 overflow-y-auto bg-kind-gradient">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-4 lg:gap-6 w-full pr-0 lg:pr-6">
            <div className="flex-1 min-w-0">{children}</div>
            <NoraColumn />
          </div>
        </main>
      </div>
    </div>
  )
}
