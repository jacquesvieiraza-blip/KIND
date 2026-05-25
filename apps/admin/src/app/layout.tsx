import type { Metadata } from 'next'
import './globals.css'
import { AdminNav } from '@/components/AdminNav'

export const metadata: Metadata = { title: 'KIND Admin — Founder OS', description: 'K.I.N.D Founder Admin Portal' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0f0f0f] text-white">
        <AdminNav />
        <div className="ml-60 min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
