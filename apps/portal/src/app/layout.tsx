import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KIND Portal',
  description: 'Your AI intelligence platform',
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
      </head>
      <body>{children}</body>
    </html>
  )
}
