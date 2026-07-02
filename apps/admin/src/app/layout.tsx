import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminHeader } from '@/components/AdminHeader'
import { NoraColumn } from '@/components/NoraColumn'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'KIND Admin — Founder OS', description: 'K.I.N.D Founder Admin Portal' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-[#FAFAFE]`}>
        <div className="flex h-full overflow-hidden">
          <AdminSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <AdminHeader />
            {/* #277 — the portal's warm peach→lavender backdrop, so admin screens
               sit on the same frosted gradient as the client portal. Nora is now
               a DOCKED collapsible right-rail (portal parity, founder-directed
               2 Jul) — she lives INSIDE the scrolled <main> so her sticky column
               tracks the content scroll, not a floating overlay. */}
            <main className="flex-1 overflow-y-auto bg-kind-gradient">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-4 lg:gap-6 w-full pr-0 lg:pr-6">
                <div className="flex-1 min-w-0">{children}</div>
                <NoraColumn />
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
