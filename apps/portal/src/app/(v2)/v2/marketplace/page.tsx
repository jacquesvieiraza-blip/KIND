'use client'

/** V2 — AGENT MARKETPLACE. Full-screen preview, sample data. Gated /v2. */

import { Sparkles, Check } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const AGENTS = [
  { name: 'FIGSY', role: 'AI SDR', stage: 'Finds & books', emoji: '🤖', price: 'Included', owned: true },
  { name: 'Denise', role: 'The Closer', stage: 'Closes the deal', emoji: '🤝', price: '$99/mo', owned: false },
  { name: 'Lena', role: 'Customer Success', stage: 'Retains & grows', emoji: '🌱', price: 'Soon', owned: false },
  { name: 'Tony', role: 'Operations', stage: 'Keeps it clean', emoji: '👔', price: 'Soon', owned: false },
  { name: 'Milla', role: 'Assistant', stage: 'The brain', emoji: '💼', price: '$49/mo', owned: false },
  { name: 'Vida', role: 'Chatbot', stage: 'Inbound capture', emoji: '💬', price: '$29/mo', owned: false },
]

export default function Marketplace() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Agent Marketplace · sample data
      </div>
      <div className="max-w-5xl mx-auto px-6 py-7 space-y-6">
        <div className="rounded-2xl p-7 text-white" style={{ background: `linear-gradient(135deg, ${BRAND}, #a78bfa)` }}>
          <h1 className="text-2xl font-bold mb-1">Meet your AI Revenue Team</h1>
          <p className="text-sm text-white/85 max-w-lg">Each agent owns one stage of the funnel. Add the ones you need — one company bill, every rep covered.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
          {AGENTS.map(a => (
            <div key={a.name} className={`${card} p-5 text-center`}>
              <div className="text-4xl mb-3">{a.emoji}</div>
              <p className="font-bold text-gray-900 text-lg">{a.name}</p>
              <p className="text-xs text-gray-400">{a.role}</p>
              <p className="text-[13px] text-gray-600 mt-2 mb-4">{a.stage}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">{a.price}</span>
                {a.owned ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg"><Check className="w-3.5 h-3.5" /> Active</span>
                ) : (
                  <button className="text-xs font-bold text-white px-4 py-1.5 rounded-lg" style={{ background: BRAND }}>Add</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
