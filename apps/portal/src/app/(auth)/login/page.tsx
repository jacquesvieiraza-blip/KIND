'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap, Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    if (searchParams.get('error') === 'confirmation_failed') {
      setError('Email confirmation failed or link expired. Please try signing up again.')
    }
    const ref = searchParams.get('ref')
    if (ref) localStorage.setItem('kind_referral', ref)
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    if (mode === 'signup') {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'}/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!data.success) {
          setError(data.error || 'Signup failed — please try again')
        } else {
          window.location.href = data.data.redirect_url
        }
      } catch {
        setError('Could not connect — please try again.')
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'}/clients/me`, {
            headers: { Authorization: `Bearer ${data.session?.access_token}` },
          })
          if (res.status === 404) {
            router.push('/onboard')
          } else {
            const body = await res.json()
            if (!body?.data?.company_name) {
              router.push('/onboard')
            } else {
              router.push('/dashboard')
            }
          }
        } catch {
          router.push('/dashboard')
        }
        router.refresh()
      }
    }
    setLoading(false)
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    if (error) { setError(error.message) } else { setResetSent(true) }
    setResetLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}
    >
      {/* Floating dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {[
          { top: '8%',  left: '12%', size: 6, delay: '0s',   dur: '7s'  },
          { top: '15%', left: '78%', size: 4, delay: '1.2s', dur: '9s'  },
          { top: '72%', left: '6%',  size: 8, delay: '0.5s', dur: '8s'  },
          { top: '85%', left: '88%', size: 5, delay: '2s',   dur: '6s'  },
          { top: '45%', left: '92%', size: 4, delay: '3s',   dur: '10s' },
          { top: '30%', left: '4%',  size: 6, delay: '1.5s', dur: '8s'  },
          { top: '60%', left: '55%', size: 3, delay: '0.8s', dur: '11s' },
          { top: '20%', left: '45%', size: 5, delay: '2.5s', dur: '7s'  },
          { top: '90%', left: '35%', size: 4, delay: '0.3s', dur: '9s'  },
          { top: '55%', left: '22%', size: 7, delay: '1.8s', dur: '8s'  },
          { top: '5%',  left: '60%', size: 3, delay: '4s',   dur: '12s' },
          { top: '78%', left: '70%', size: 5, delay: '2.2s', dur: '7s'  },
        ].map((dot, i) => (
          <div key={i} className="absolute rounded-full" style={{
            top: dot.top, left: dot.left, width: dot.size, height: dot.size,
            background: '#A5B4FC', opacity: 0.45,
            animation: `floatDot ${dot.dur} ease-in-out ${dot.delay} infinite alternate`,
          }} />
        ))}
      </div>
      <style>{`@keyframes floatDot{0%{transform:translateY(0) translateX(0)}50%{transform:translateY(-18px) translateX(6px)}100%{transform:translateY(-30px) translateX(-4px)}}`}</style>

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-[#7C3AED] flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-[#1E0A5C]">K.I.N.D</span>
          </div>
          <p className="text-sm text-[#7B6FA0]">AI Revenue Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100/60 p-8">
          {showReset ? (
            <>
              <h2 className="text-lg font-bold text-[#1E0A5C] mb-1">Reset your password</h2>
              <p className="text-sm text-[#7B6FA0] mb-5">We&apos;ll send a reset link to your email.</p>
              {resetSent ? (
                <div className="text-center py-4">
                  <p className="text-sm text-green-600 font-medium">Reset link sent — check your inbox.</p>
                  <button onClick={() => { setShowReset(false); setResetSent(false) }}
                    className="mt-4 text-xs text-[#7C3AED] font-medium hover:underline">
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required
                      className="w-full border border-purple-100/80 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                      placeholder="you@company.com" />
                  </div>
                  {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                  <button type="submit" disabled={resetLoading}
                    className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-60">
                    {resetLoading ? 'Sending…' : 'Send reset link'}
                  </button>
                  <button type="button" onClick={() => setShowReset(false)}
                    className="w-full text-center text-sm text-[#7B6FA0] hover:text-[#7C3AED] transition-colors">
                    Back to sign in
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#1E0A5C] mb-5">
                {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full border border-purple-100/80 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                    placeholder="you@company.com" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => setShowReset(true)}
                        className="text-xs text-[#7C3AED] hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                      className="w-full border border-purple-100/80 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                      placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                {message && <p className="text-green-600 text-sm bg-green-50 rounded-xl px-3 py-2">{message}</p>}
                <button type="submit" disabled={loading}
                  className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-60">
                  {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>
              <p className="text-center text-sm text-[#7B6FA0] mt-4">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
                  className="text-[#7C3AED] font-semibold hover:underline">
                  {mode === 'login' ? 'Sign up free' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-[#9B8EC4] mt-5">
          FIGSY is ready to find your first leads.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }} />
    }>
      <LoginForm />
    </Suspense>
  )
}
