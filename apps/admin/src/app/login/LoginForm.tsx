'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

// #308 — admin login gate. Sign in with the founder's existing Supabase account;
// the middleware enforces the email allowlist, so a non-admin who authenticates is
// bounced straight back here.
export function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      // Middleware re-checks the allowlist on the next request; land on the cockpit.
      router.replace('/')
      router.refresh()
    } catch {
      setError('Could not sign in — please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-kind-gradient px-4">
      <div className="w-full max-w-sm bg-white/85 backdrop-blur-sm border border-brand-200/60 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
            <Lock className="w-4 h-4 text-white" />
          </span>
          <h1 className="text-lg font-semibold text-gray-900">K.I.N.D Admin</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">Founder OS — sign in to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
              />
              <button type="button" onClick={() => setShowPassword(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-[#7C3AED] text-white text-sm font-medium py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
