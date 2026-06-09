'use client'

/** V2 — SLIM SIDEBAR + TOP-RIGHT HEADER. Full-screen preview, sample data. Gated /v2. */

import { Sparkles, LayoutGrid, Users, Inbox, TrendingUp, GitBranch, Settings, Bell, Coins } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'
const RAIL = [LayoutGrid, Users, GitBranch, Inbox, TrendingUp]

export default function Shell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Slim Sidebar + Top-Right Header · sample data
      </div>
      <div className="max-w-5xl mx-auto px-6 py-7 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slim Sidebar + Header</h1>
          <p className="text-sm text-gray-500 mt-0.5">Nav collapses to an icon rail; account, billing, credits &amp; profile move to a clean top-right header — more room for the work.</p>
        </div>

        {/* Mock app shell */}
        <div className={`${card} overflow-hidden flex h-[420px]`}>
          {/* slim rail */}
          <div className="w-16 bg-[#0F0929] flex flex-col items-center py-4 gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden mb-2"><img src="/logo-k.png" alt="K" className="w-full h-full object-contain" /></div>
            {RAIL.map((I, i) => (
              <div key={i} className={`w-9 h-9 rounded-xl flex items-center justify-center ${i === 0 ? 'bg-white/15' : 'hover:bg-white/10'}`}><I className="w-4.5 h-4.5 text-purple-200/70" /></div>
            ))}
            <div className="mt-auto w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10"><Settings className="w-4.5 h-4.5 text-purple-200/70" /></div>
          </div>

          {/* content */}
          <div className="flex-1 flex flex-col">
            {/* top-right header */}
            <div className="h-14 border-b border-gray-100 flex items-center justify-between px-5">
              <p className="font-bold text-gray-900">Command Centre</p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full" style={{ color: '#b45309', background: '#fffbeb' }}><Coins className="w-3.5 h-3.5" /> 999,839</span>
                <Bell className="w-4 h-4 text-gray-400" />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#a78bfa]" />
              </div>
            </div>
            {/* body placeholder */}
            <div className="flex-1 p-5 grid grid-cols-3 gap-4 content-start">
              {['Meetings 62', 'Reply 11%', 'Reps 3'].map(t => (
                <div key={t} className="bg-[#faf9ff] border border-gray-100 rounded-xl p-4"><p className="text-sm font-bold text-gray-900">{t}</p></div>
              ))}
              <div className="col-span-3 bg-[#faf9ff] border border-gray-100 rounded-xl h-40" />
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400">The nav drops to an icon rail; everything account-related lives top-right — the canvas gets the space.</p>
      </div>
    </div>
  )
}
