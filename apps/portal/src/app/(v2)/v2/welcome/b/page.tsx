'use client'

/** WELCOME CONCEPT B — "The Spotlight" · centered, clean, Apple-style whitespace. */

import { Send, Sparkles } from 'lucide-react'

const BRAND = '#7C3AED'

export default function WelcomeB() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(1200px 600px at 50% -10%, #f1ebff, #ffffff 60%)' }}>
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white shrink-0" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> CONCEPT B · "The Spotlight" — centered &amp; calm
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg text-center">
          {/* Avatar in a soft ring */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: BRAND }} />
            <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-white shadow-xl">
              <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover object-top" />
            </div>
            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-400 ring-4 ring-white" />
          </div>

          <p className="text-sm font-semibold tracking-wide" style={{ color: BRAND }}>FIGSY · The Opener</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-2 leading-tight">Hey — let's find your<br />first leads together.</h1>
          <p className="text-gray-500 mt-3 mb-8 max-w-md mx-auto">I'm your AI SDR. Answer 4 quick questions and I'll start building your pipeline today.</p>

          {/* Single focused question */}
          <div className="bg-white border border-purple-100/70 rounded-2xl shadow-sm p-6 text-left max-w-md mx-auto">
            <p className="text-[15px] font-semibold text-gray-900 mb-1">First — what's your company called?</p>
            <p className="text-xs text-gray-400 mb-4">So FIGSY signs your emails properly.</p>
            <div className="flex items-center gap-2">
              <input autoFocus placeholder="e.g. Acme Corp" className="flex-1 border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]" />
              <button className="px-5 h-12 rounded-xl flex items-center gap-2 text-white text-sm font-bold shrink-0" style={{ background: BRAND }}>Next <Send className="w-4 h-4" /></button>
            </div>
          </div>

          {/* progress dots */}
          <div className="flex items-center justify-center gap-2 mt-7">
            {[0, 1, 2, 3].map(i => <span key={i} className="rounded-full transition-all" style={{ width: i === 0 ? 22 : 7, height: 7, background: i === 0 ? BRAND : '#d8cffa' }} />)}
          </div>
          <p className="text-xs text-gray-400 mt-3">Step 1 of 4 · No credit card to start</p>
        </div>
      </div>
    </div>
  )
}
