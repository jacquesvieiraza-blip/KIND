'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

function AcceptInviteInner() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')
  const [status, setStatus] = useState<'loading' | 'accepting' | 'done' | 'no-token' | 'login-required' | 'error'>('loading')

  useEffect(() => {
    if (!token) { setStatus('no-token'); return }
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (!user) { setStatus('login-required'); return }
      setStatus('accepting')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
      // Try a company-seat invite first (rep joining a company), then fall back
      // to a team-member invite (teammate on one account).
      try {
        const companyRes = await fetch(`${apiUrl}/company/accept-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session!.access_token}` },
          body: JSON.stringify({ token }),
        })
        if (companyRes.ok) {
          setStatus('done')
          setTimeout(() => router.push('/dashboard'), 1500)
          return
        }
      } catch { /* fall through to team accept */ }

      // #266: accepting user is taken from the auth token server-side, not a spoofable user_id param
      const res = await fetch(`${apiUrl}/team/accept?token=${token}`, {
        headers: { Authorization: `Bearer ${data.session!.access_token}` },
      })
      if (res.ok) {
        setStatus('done')
        setTimeout(() => router.push('/dashboard'), 1500)
      } else {
        setStatus('error')
      }
    })
  }, [token])

  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-8 max-w-sm w-full text-center">
      <img src="/agents/figsy.png" alt="KIND" className="w-16 h-16 rounded-2xl mx-auto mb-4" />
      {status === 'loading' && <p className="text-gray-500">Checking invitation…</p>}
      {status === 'accepting' && <p className="text-gray-500">Accepting invitation…</p>}
      {status === 'done' && (
        <>
          <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re in!</h1>
          <p className="text-gray-500 text-sm">Redirecting to your workspace…</p>
        </>
      )}
      {status === 'login-required' && (
        <>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Accept your invitation</h1>
          <p className="text-gray-500 text-sm mb-4">Log in or create an account to join the workspace.</p>
          <a
            href={`/login?redirect=/invite/accept?token=${token}`}
            className="block w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#6D28D9] transition-colors"
          >
            Log in to accept
          </a>
        </>
      )}
      {status === 'no-token' && <p className="text-red-500 text-sm">Invalid invite link.</p>}
      {status === 'error' && <p className="text-red-500 text-sm">This invite has expired or already been used.</p>}
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFE] flex items-center justify-center">
      <Suspense fallback={
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-8 max-w-sm w-full text-center">
          <p className="text-gray-500">Loading…</p>
        </div>
      }>
        <AcceptInviteInner />
      </Suspense>
    </div>
  )
}
