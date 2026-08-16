'use client'

/**
 * SET A NEW PASSWORD — the screen the reset email has always pointed at, and which had
 * never been built.
 *
 * Found on the founder's walk (16 Aug): the login page has offered "Forgot password?"
 * since it shipped, and sent people to `/auth/reset` — a route that did not exist. Every
 * reset link in the product's history landed on a 404, so no client has ever recovered a
 * password, and a Client Partner seat (R40) — created with a random password nobody is
 * ever told — had no way in at all. 2,286 tests were green the whole time, because the
 * link and the page were each fine on their own; the bug lived in the gap between them.
 *
 * How the session gets here: the email link now goes to `/auth/callback?next=/auth/reset`,
 * so the EXISTING handler exchanges Supabase's one-time code for cookies before this page
 * renders. That is deliberate — a second exchange path is a second thing to get wrong.
 *
 * Where it sends people afterwards is not cosmetic. A Client Partner must land on HER
 * portal, never the client lead desk and never the legacy partner dashboard, because
 * "her cut only" (R40) is a rule about what she can see.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Eye, EyeOff } from 'lucide-react'

const MIN_PASSWORD = 8

export default function ResetPasswordPage() {
  const router = useRouter()

  // ⚠️ The Supabase browser client is built inside the effect and the submit handler, NEVER in
  // the component body. Next pre-renders this page at BUILD time, where NEXT_PUBLIC_SUPABASE_URL
  // does not exist, and `createBrowserClient` throws on missing config — which failed the build
  // outright the first time this page was written. (The login page gets away with a top-level
  // call only because `useSearchParams` opts it out of pre-rendering; that is a side effect of
  // reading the query string, not a decision anyone made here.) Effects and event handlers never
  // run during a pre-render, so this placement is the fix rather than a workaround.
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // The callback set cookies before redirecting here. No session means the link was already
  // used, expired, or somebody typed the URL — all three get a real answer, never a blank.
  useEffect(() => {
    let live = true
    createClient().auth.getSession().then(({ data }) => {
      if (!live) return
      setHasSession(!!data.session)
      setChecking(false)
    })
    return () => { live = false }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < MIN_PASSWORD) {
      setError(`Your password needs at least ${MIN_PASSWORD} characters.`); return
    }
    if (password !== confirm) {
      setError('Those two passwords do not match.'); return
    }
    setSaving(true)

    const supabase = createClient()
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) {
      setError(updateErr.message)
      setSaving(false)
      return
    }

    setDone(true)

    // Send them where they actually belong. A partner seat has no client row, so the client
    // routing would strand them; and a Client Partner has her own page, which is not the
    // legacy partner dashboard.
    let destination = '/'
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      const me = await api.get<{ seat_type?: string }>('/partners/me', token)
      destination = me?.seat_type === 'client_partner' ? '/dashboard/client-partner' : '/dashboard/partner'
    } catch {
      // Not a partner (the API answers 404) — a client goes to the front door, and the
      // middleware takes a signed-in client on to Milla.
      destination = '/'
    }
    router.push(destination)
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}
    >
      <div className="w-full max-w-sm">

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-purple-500/25">
              <img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold text-[#1E0A5C]">K.I.N.D</span>
          </div>
          <p className="text-sm text-[#7B6FA0]">AI Revenue Platform</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100/60 p-8">
          {checking ? (
            <p className="text-sm text-[#7B6FA0] text-center py-4">Checking your link…</p>
          ) : !hasSession ? (
            <>
              <h2 className="text-lg font-bold text-[#1E0A5C] mb-1">This link has expired</h2>
              <p className="text-sm text-[#7B6FA0] mb-5">
                Reset links can only be used once, and they time out. Request a new one and it will
                arrive in a moment.
              </p>
              <a href="/login"
                className="block w-full text-center bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors">
                Back to sign in
              </a>
            </>
          ) : done ? (
            <div className="text-center py-4">
              <p className="text-sm text-green-600 font-medium">Password saved — signing you in…</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-[#1E0A5C] mb-1">Set your password</h2>
              <p className="text-sm text-[#7B6FA0] mb-5">
                Choose a password of at least {MIN_PASSWORD} characters. You will be signed in
                straight afterwards.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password} onChange={e => setPassword(e.target.value)} required minLength={MIN_PASSWORD}
                      className="w-full border border-purple-100/80 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                      placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={MIN_PASSWORD}
                    className="w-full border border-purple-100/80 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                    placeholder="••••••••" />
                </div>
                {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                <button type="submit" disabled={saving}
                  className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-60">
                  {saving ? 'Saving…' : 'Save password'}
                </button>
              </form>
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
