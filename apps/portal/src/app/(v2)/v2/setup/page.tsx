'use client'

/** V2 — CONVERSATIONAL AGENT SETUP (Casey). Full-screen preview, sample data. Gated /v2. */

import { Sparkles } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

export default function ConversationalSetup() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Conversational Setup (Casey) · sample data
      </div>
      <div className="max-w-2xl mx-auto px-6 py-7 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conversational Setup</h1>
          <p className="text-sm text-gray-500 mt-0.5">No forms. Casey just asks, you answer, and your ICP + first campaign are built.</p>
        </div>
        <div className={`${card} overflow-hidden`}>
          <div className="px-5 py-4 text-white flex items-center gap-3" style={{ background: BRAND }}>
            <span className="w-9 h-9 rounded-full overflow-hidden bg-white/20 ring-2 ring-white/40"><img src="/agents/casey.png" alt="Casey" className="w-full h-full object-cover" /></span>
            <div><p className="font-bold">Casey</p><p className="text-[11px] text-white/70">Onboarding agent · Online</p></div>
          </div>
          <div className="p-5 space-y-3.5">
            <Bubble who="casey">Hey 👋 I'm Casey. Let's get your FIGSY ready in 2 minutes. Who do you sell to?</Bubble>
            <Bubble who="me">Heads of sales at African fintechs, 10–200 staff.</Bubble>
            <Bubble who="casey">Love it. Which markets first?</Bubble>
            <div className="flex gap-2 flex-wrap">
              {['Nigeria', 'South Africa', 'Kenya', 'Egypt'].map(c => (<span key={c} className="text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer hover:bg-[#f3eeff]" style={{ color: BRAND, borderColor: '#c4b5fd' }}>{c}</span>))}
            </div>
            <Bubble who="me">Nigeria and South Africa.</Bubble>
            <Bubble who="casey">Perfect — I found <b>1,083</b> matching, verified leads. Want me to build your first campaign now?</Bubble>
            <div className="flex gap-2">
              <button className="text-sm font-bold text-white px-4 py-2 rounded-xl" style={{ background: BRAND }}>Yes, build it</button>
              <button className="text-sm font-semibold px-4 py-2 rounded-xl border border-gray-200 text-gray-600">Refine first</button>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
            <input placeholder="Type your answer…" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <button className="text-white text-sm font-bold px-4 rounded-lg" style={{ background: BRAND }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Bubble({ who, children }: { who: 'casey' | 'me'; children: React.ReactNode }) {
  const me = who === 'me'
  return (
    <div className={`max-w-[80%] px-4 py-2.5 text-[13px] ${me ? 'ml-auto text-white rounded-2xl rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-sm'}`} style={me ? { background: BRAND } : undefined}>
      {children}
    </div>
  )
}
