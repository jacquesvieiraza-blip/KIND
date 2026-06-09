'use client'

/** WELCOME CONCEPT A — "The Introduction" · immersive split (agent left, chat right). */

import { Send, Sparkles } from 'lucide-react'

const BRAND = '#7C3AED'

export default function WelcomeA() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white shrink-0" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> CONCEPT A · "The Introduction" — immersive split
      </div>
      <div className="flex-1 flex">
        {/* Left — full immersive agent */}
        <div className="hidden lg:block w-[44%] relative bg-purple-100">
          <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover object-top" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-10">
            <p className="text-white text-3xl font-bold leading-none">FIGSY</p>
            <p className="text-white/85 text-base mt-1">The Opener · your AI SDR</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 text-sm font-medium">Online · ready to find your first leads</span>
            </div>
          </div>
        </div>

        {/* Right — conversation */}
        <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'linear-gradient(135deg,#faf7ff,#ffffff 60%,#f3f0ff)' }}>
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-7 h-7 rounded-lg overflow-hidden"><img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" /></div>
              <span className="font-bold tracking-tight text-gray-900">K·I·N·D</span>
            </div>

            {/* progress */}
            <div className="flex items-center gap-1.5 mb-6">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-1 rounded-full flex-1" style={{ background: i === 0 ? BRAND : '#e9e3fb' }} />)}
            </div>

            <p className="text-2xl font-bold text-gray-900 leading-tight">Let's hire your AI Family.</p>
            <p className="text-gray-500 mt-2 mb-7">I just need a few things first — takes 2 minutes.</p>

            <div className="bg-white border border-purple-100/70 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 text-[15px] text-gray-800 leading-relaxed mb-5">
              Hey! I'm FIGSY. To find your first leads, what's your company called?
            </div>

            <div className="flex items-center gap-2">
              <input autoFocus placeholder="e.g. Acme Corp" className="flex-1 border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]" />
              <button className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: BRAND }}><Send className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-400 mt-4">No credit card to start · Your first leads are free</p>
          </div>
        </div>
      </div>
    </div>
  )
}
