import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="border-b border-gray-100 px-6 h-14 flex items-center justify-between sticky top-0 bg-white z-10">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#0066FF]" />
          <span className="font-bold text-sm tracking-tight text-gray-900">K.I.N.D</span>
        </Link>
        <div className="flex items-center gap-6 text-xs text-gray-400">
          <Link href="/legal/terms" className="hover:text-gray-700">Terms</Link>
          <Link href="/legal/privacy" className="hover:text-gray-700">Privacy</Link>
          <Link href="/legal/popia" className="hover:text-gray-700">POPIA</Link>
          <Link href="/legal/dpa" className="hover:text-gray-700">DPA</Link>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-16">
        {children}
      </main>
      <footer className="border-t border-gray-100 py-8 px-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} K.I.N.D Intelligence (Pty) Ltd. All rights reserved.
      </footer>
    </div>
  )
}
