'use client'

/** V2 — SIGNUP polish (C5) + social login + T&C. Preview, sample data. Gated /v2. */

import { Sparkles, Mail, ArrowRight } from 'lucide-react'

const BRAND = '#7C3AED'

// Inline brand glyphs (lucide has no brand logos).
function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="w-4 h-4">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.3-.1-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6.3 5.2C41.5 35.9 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  )
}

export default function SignupPolish() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#f5f0ff,#ffffff 55%,#f0f7ff)' }}>
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Signup (C5) + social login + T&amp;C · sample data
      </div>

      <div className="max-w-md mx-auto px-6 py-12">
        <div className="flex items-center justify-center gap-2 mb-7">
          <div className="w-8 h-8 rounded-lg overflow-hidden"><img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" /></div>
          <span className="font-bold text-lg tracking-tight text-gray-900">K·I·N·D</span>
        </div>

        <div className="rounded-3xl bg-white shadow-xl border border-purple-100/60 p-7">
          <h1 className="text-xl font-bold text-gray-900 text-center">Create your account</h1>
          <p className="text-sm text-gray-500 text-center mt-1 mb-6">Your AI Family, ready in 2 minutes.</p>

          {/* Social login */}
          <div className="space-y-2.5">
            <button className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              <GoogleG /> Continue with Google
            </button>
            <button className="w-full flex items-center justify-center gap-2.5 border border-gray-200 rounded-xl py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
              <span className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5"><span className="bg-[#F25022]" /><span className="bg-[#7FBA00]" /><span className="bg-[#00A4EF]" /><span className="bg-[#FFB900]" /></span>
              Continue with Microsoft
            </button>
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100" /><span className="text-[11px] text-gray-400 font-medium">or</span><div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Email */}
          <label className="block text-xs font-bold text-gray-600 mb-1.5">Work email</label>
          <div className="relative mb-4">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input placeholder="you@company.com" className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
          </div>

          {/* T&C — required */}
          <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
            <input type="checkbox" className="mt-0.5 w-4 h-4 rounded accent-[#7C3AED] shrink-0" />
            <span className="text-[12.5px] text-gray-600 leading-relaxed">
              I agree to the <span className="font-semibold" style={{ color: BRAND }}>Terms &amp; Conditions</span> and <span className="font-semibold" style={{ color: BRAND }}>Privacy Policy</span>.
            </span>
          </label>

          <button className="w-full flex items-center justify-center gap-2 text-white text-sm font-bold py-3 rounded-xl" style={{ background: BRAND }}>
            Create account <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[11px] text-gray-400 mt-4">No credit card to start · Cancel anytime</p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Already have an account? <span className="font-semibold" style={{ color: BRAND }}>Log in</span></p>
      </div>
    </div>
  )
}
