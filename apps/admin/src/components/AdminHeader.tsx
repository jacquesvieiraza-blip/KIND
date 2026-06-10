'use client'

/** Admin top header — mirrors the client portal's V2 header (h-14 white bar,
 *  right-aligned chrome). Admin is gated server-side by ADMIN_SECRET_KEY, so
 *  there's no auth dropdown — just a status pill + an identity chip. */

import { ShieldCheck } from 'lucide-react'

export function AdminHeader() {
  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end gap-3 px-6 shrink-0">
      <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full text-emerald-700 bg-emerald-50">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Platform live
      </span>
      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full text-[#7C3AED] bg-purple-50">
        <ShieldCheck className="w-3.5 h-3.5" /> Admin OS
      </span>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#a78bfa] shrink-0 flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white shadow-sm" title="Admin">
        A
      </div>
    </header>
  )
}
