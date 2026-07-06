import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AdminShell } from '@/components/AdminShell'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'KIND Admin — Founder OS', description: 'K.I.N.D Founder Admin Portal' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-[#FAFAFE]`}>
        {/* AdminShell renders the sidebar/header/Nora chrome on every page except
           /login, which stands alone behind the #308 auth gate. */}
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  )
}
