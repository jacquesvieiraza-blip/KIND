'use client'

/** Demo auto-login. The admin "Open Demo" sends here with the demo user's email +
 *  one-time code. We sign OUT any existing session (so it doesn't fall back to the
 *  founder's own account) then verifyOtp INTO the demo session — no PKCE, no
 *  sign-in screen — and land on the dashboard. */

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

function DemoLogin() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const [error, setError] = useState('')

  useEffect(() => {
    const email = params.get('e')
    const otp = params.get('o')
    if (!email || !otp) { setError('Missing demo credentials — generate the link again.'); return }

    ;(async () => {
      // Drop any current session so we don't land on the wrong (e.g. founder's) account.
      await supabase.auth.signOut()
      // Try 'email' OTP type, fall back to 'magiclink' (varies by Supabase version).
      let vErr = (await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })).error
      if (vErr) vErr = (await supabase.auth.verifyOtp({ email, token: otp, type: 'magiclink' })).error
      if (vErr) { setError(vErr.message); return }
      // Milla is the client console. /dashboard is retired and only bounces here anyway —
      // that bounce is what made opening a demo look scruffy in front of a prospect.
      router.replace('/milla')
      router.refresh()
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: 'linear-gradient(135deg,#FFF5EE 0%,#FAF0FF 55%,#EDE6FF 100%)' }}>
      {error ? (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 max-w-sm text-center">{error}</p>
      ) : (
        <>
          <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
          <p className="text-sm text-[#7B6FA0]">Opening demo…</p>
        </>
      )}
    </div>
  )
}

export default function DemoLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /></div>}>
      <DemoLogin />
    </Suspense>
  )
}
