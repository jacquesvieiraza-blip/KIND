import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KIND Admin',
  description: 'K.I.N.D operations dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
