'use client'

/** V2 — SIGNUP polish (C5). Conversational signup, cleaner/premium. Preview, sample data. Gated /v2. */

import { Sparkles, Send } from 'lucide-react'

const BRAND = '#7C3AED'

export default function SignupPolish() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#f5f0ff,#ffffff 55%,#f0f7ff)' }}>
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Signup polish (C5) · sample data
      </div>

      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg overflow-hidden"><img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" /></div>
          <span className="font-bold text-lg tracking-tight text-gray-900">K·I·N·D</span>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white shadow-xl border border-purple-100/60 overflow-hidden">
          {/* Hero */}
          <div className="relative h-44 overflow-hidden bg-purple-50">
            <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover object-top" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0F0929] to-transparent px-5 py-3">
              <p className="text-white font-bold">FIGSY <span className="text-[#a78bfa] text-xs font-semibold">The Opener</span></p>
              <p className="text-white/70 text-[11px]">Setting up your AI revenue team</p>
            </div>
          </div>

          {/* Progress */}
          <div className="px-6 pt-5">
            <div className="flex justify-between text-[11px] mb-1.5"><span className="font-semibold text-gray-500">Step 1 of 4</span><span className="font-bold" style={{ color: BRAND }}>25%</span></div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: '25%', background: BRAND }} /></div>
          </div>

          {/* Conversation */}
          <div className="px-6 py-5 space-y-3">
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-purple-100"><img src="/agents/figsy.png" alt="" className="w-full h-full object-cover object-top" /></div>
              <div className="bg-[#faf9ff] border border-purple-100/60 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] text-gray-800 leading-relaxed max-w-[85%]">
                Hey! I'm FIGSY, your AI SDR. I'm about to find your first leads — but first, what's your company called?
              </div>
            </div>
            <div className="text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px] max-w-[85%] ml-auto" style={{ background: BRAND }}>Northwind Labs</div>
          </div>

          {/* Input */}
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2">
              <input placeholder="Type your answer…" className="flex-1 border border-purple-100/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
              <button className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: BRAND }}><Send className="w-4 h-4" /></button>
            </div>
            <p className="text-center text-[11px] text-gray-400 mt-3">Takes about 2 minutes · No credit card to start</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Already have an account? <span className="font-semibold" style={{ color: BRAND }}>Log in</span></p>
      </div>
    </div>
  )
}
