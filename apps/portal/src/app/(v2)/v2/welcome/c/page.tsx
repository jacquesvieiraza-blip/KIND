'use client'

/** WELCOME CONCEPT C — "The Conversation" · premium dark chat-app feel. */

import { Send, Sparkles } from 'lucide-react'

const BRAND = '#7C3AED'

export default function WelcomeC() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg,#0F0929,#1a1040 60%,#0F0929)' }}>
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white shrink-0" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> CONCEPT C · "The Conversation" — premium dark chat
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          {/* Hero */}
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <div className="relative h-64 bg-[#0F0929]">
              <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover object-top" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F0929] to-transparent px-5 pt-10 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-white font-bold text-lg">FIGSY</p>
                      <span className="text-[#a78bfa] text-xs font-semibold">The Opener</span>
                    </div>
                    <p className="text-white/50 text-[11px]">AI SDR · K.I.N.D</p>
                  </div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span className="text-emerald-300 text-[11px] font-medium">Online</span></div>
                </div>
              </div>
            </div>

            {/* Conversation */}
            <div className="bg-[#130b2e] px-4 py-4 space-y-3">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5 ring-1 ring-white/15"><img src="/agents/figsy.png" alt="" className="w-full h-full object-cover object-top" /></div>
                <div className="bg-white/[0.08] text-white/90 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] leading-relaxed max-w-[85%]">
                  Hey! I'm FIGSY — your AI SDR. I'm about to go find your first leads. First up: what's your company called?
                </div>
              </div>
              {/* typing hint */}
              <div className="flex gap-2 items-center pl-8">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300/60 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300/60 animate-bounce" style={{ animationDelay: '120ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-300/60 animate-bounce" style={{ animationDelay: '240ms' }} />
              </div>
            </div>

            {/* Input */}
            <div className="bg-[#130b2e] px-4 pb-4 pt-1">
              <div className="flex items-center gap-2">
                <input autoFocus placeholder="e.g. Acme Corp" className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40" />
                <button className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: BRAND }}><Send className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1">{[0, 1, 2, 3].map(i => <span key={i} className="rounded-full" style={{ width: i === 0 ? 18 : 6, height: 6, background: i === 0 ? '#a78bfa' : 'rgba(255,255,255,0.15)' }} />)}</div>
                <span className="text-white/30 text-[11px]">Step 1 of 4</span>
              </div>
            </div>
          </div>
          <p className="text-center text-white/30 text-xs mt-5">No credit card to start · Your first leads are free</p>
        </div>
      </div>
    </div>
  )
}
