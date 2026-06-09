'use client'

/** V2 — INVITE TEAMMATE. Full-screen preview, sample data. Gated /v2. */

import { Sparkles, UserPlus, Crown } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const TEAM = [
  { name: 'Amara N.', email: 'amara@maceyluxe.com', role: 'Rep', status: 'Active', emoji: '👩🏽' },
  { name: 'Tunde A.', email: 'tunde@maceyluxe.com', role: 'Rep', status: 'Active', emoji: '👨🏾' },
  { name: 'Zola M.', email: 'zola@maceyluxe.com', role: 'Rep', status: 'Active', emoji: '👩🏾' },
  { name: 'Jack (you)', email: 'hello@maceyluxe.com', role: 'Owner', status: 'Active', emoji: '👑' },
]

export default function InviteTeam() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Invite Teammate · sample data
      </div>
      <div className="max-w-2xl mx-auto px-6 py-7 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your team</h1>
          <p className="text-sm text-gray-500 mt-0.5">Every rep gets their own autonomous FIGSY. One company bill — {TEAM.length} of 10 seats used.</p>
        </div>

        <div className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-3"><UserPlus className="w-5 h-5" style={{ color: BRAND }} /><span className="font-bold text-gray-900">Invite a rep</span></div>
          <div className="flex gap-2">
            <input placeholder="teammate@company.com" className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
            <select className="border border-gray-200 rounded-lg px-3 text-sm text-gray-600"><option>Rep</option><option>Admin</option></select>
            <button className="text-white text-sm font-bold px-5 rounded-lg" style={{ background: BRAND }}>Send invite</button>
          </div>
        </div>

        <div className={`${card} overflow-hidden`}>
          {TEAM.map(m => (
            <div key={m.email} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0">
              <span className="text-2xl">{m.emoji}</span>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900">{m.name}</p><p className="text-xs text-gray-400 truncate">{m.email}</p></div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${m.role === 'Owner' ? 'text-amber-700 bg-amber-50' : 'text-gray-600 bg-gray-100'}`}>
                {m.role === 'Owner' && <Crown className="w-3 h-3" />}{m.role}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">{m.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
