import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminHeader } from '@/components/AdminHeader'

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
            <main className="flex-1 overflow-y-auto bg-[#FAFAFE]">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
