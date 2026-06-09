'use client'

/** V2 — AGENT CARD GRID (dashboard home). Full-screen preview, sample data. Gated /v2. */

import { Sparkles, ArrowRight, BadgeCheck } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

// Persona roles (consistent everywhere). Order = funnel; Denise (the closer) last.
const AGENTS = [
  { name: 'FIGSY',  role: 'The Opener',    img: '/agents/figsy.png',  g: 'from-[#7C3AED] to-[#6025c0]', metrics: [['Sent', '2,840'], ['Replied', '348'], ['Hot leads', '141']] },
  { name: 'Milla',  role: 'The Brain',     img: '/agents/milla.png',  g: 'from-[#0ea5e9] to-[#0284c7]', feats: ['Calendar & meetings', 'Email drafting', 'Research & briefings', 'Task tracking'] },
  { name: 'Vida',   role: 'The Connector', img: '/agents/vida.png',   g: 'from-[#10b981] to-[#059669]', feats: ['24/7 visitor engagement', 'Lead capture & qualify', 'Demo booking', 'Handoff to reps'] },
  { name: 'Denise', role: 'The Closer',    img: '/agents/denise.png', g: 'from-[#D97706] to-[#b45309]', feats: ['Confirms booked meetings', 'Joins calls as notetaker', 'Drafts proposals', 'Chases warm leads'] },
]

export default function AgentGrid() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Agent Card Grid · sample data
      </div>
      <div className="max-w-6xl mx-auto px-6 py-7 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Good morning, MaceyLuxe 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your AI Family — at a glance.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {AGENTS.map(a => (
            <div key={a.name} className={`${card} overflow-hidden flex flex-col`}>
              <div className={`relative bg-gradient-to-br ${a.g} px-5 py-5`}>
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">
                  <BadgeCheck className="w-3 h-3" /> Certified
                </span>
                <div className="w-12 h-12 rounded-xl overflow-hidden mb-3 bg-white/20 ring-2 ring-white/30"><img src={a.img} alt={a.name} className="w-full h-full object-cover" /></div>
                <p className="text-white font-bold text-lg leading-tight">{a.name}</p>
                <p className="text-white/70 text-xs mt-0.5">{a.role}</p>
              </div>
              <div className="px-5 py-4 flex-1 flex flex-col">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full self-start mb-3 bg-emerald-50 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                </span>
                {a.metrics ? (
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 mb-4 text-center">
                    {a.metrics.map(([l, v]) => (<div key={l}><p className="text-lg font-bold text-gray-900">{v}</p><p className="text-[10px] text-gray-400">{l}</p></div>))}
                  </div>
                ) : (
                  <div className="flex-1 space-y-2 mb-4">
                    {a.feats!.map(f => (<div key={f} className="flex items-start gap-2 text-[13px] text-gray-600"><span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: BRAND }} />{f}</div>))}
                  </div>
                )}
                <button className="mt-auto w-full flex items-center justify-center gap-2 text-sm font-bold py-2.5 rounded-xl text-white" style={{ background: BRAND }}>
                  Open {a.name} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
