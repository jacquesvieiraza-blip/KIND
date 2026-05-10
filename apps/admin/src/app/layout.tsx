import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'KIND Admin',
  description: 'K.I.N.D operations dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-56 bg-gray-900 flex flex-col shrink-0">
            <div className="px-5 py-5 border-b border-white/10">
              <p className="text-white font-bold text-base tracking-tight">K.I.N.D Admin</p>
              <p className="text-white/40 text-xs mt-0.5">Operations</p>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-0.5 text-sm">
              {[
                { href: '/', label: 'Dashboard' },
                { href: '/clients', label: 'Clients' },
                { href: '/icps', label: 'ICP Review' },
                { href: '/terms', label: 'Terms Library' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="block px-3 py-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="px-5 py-4 border-t border-white/10">
              <p className="text-white/30 text-xs">{new Date().toLocaleDateString('en-ZA', { dateStyle: 'medium' })}</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
      </body>
    </html>
  )
}
