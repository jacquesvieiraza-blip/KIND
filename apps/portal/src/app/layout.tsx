import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PWARegister } from '@/components/PWARegister'
import { PWAInstallBanner } from '@/components/ui/PWAInstallBanner'

export const metadata: Metadata = {
  title: 'K.I.N.D — AI Revenue OS',
  description: 'FIGSY handles your outreach. Milla runs your assistant. You close the deals.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'K.I.N.D',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'K.I.N.D — AI Revenue OS',
    description: 'FIGSY handles your outreach. Milla runs your assistant. You close the deals.',
  },
}

export const viewport: Viewport = {
  themeColor: '#7C3AED',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FOUC prevention — runs before React hydrates, applies dark class from localStorage */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('kind_theme')
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark')
            }
          } catch {}
        ` }} />
        <link rel="mask-icon" href="/icons/icon-512.png" color="#7C3AED" />
        <meta name="msapplication-TileColor" content="#7C3AED" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <PWARegister />
        <PWAInstallBanner />
      </body>
    </html>
  )
}
