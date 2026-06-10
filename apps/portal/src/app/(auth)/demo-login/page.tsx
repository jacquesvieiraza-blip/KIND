'use client'

/** Demo auto-login. The admin "Open Demo" sends here with the demo user's token
 *  hash. We sign OUT any existing session (so it doesn't fall back to the
 *  founder's own account) then verifyOtp INTO the demo session — no PKCE, no
 *  sign-in screen — and land on the dashboard. */

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

type OtpType = 'magiclink' | 'email' | 'signup' | 'invite' | 'recovery' | 'email_change'

function DemoLogin() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()
  const [error, setError] = useState('')

  useEffect(() => {
    const tokenHash = params.get('t')
    const ty = (params.get('ty') || 'magiclink') as OtpType
    if (!tokenHash) { setError('Missing demo token — generate the link again.'); return }

    ;(async () => {
      // Drop any current session so we don't land on the wrong (e.g. founder's) account.
      await supabase.auth.signOut()
      const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: ty })
      if (vErr) {
        // Fall back to 'email' type if the magiclink type isn't accepted.
        if (ty !== 'email') {
          const { error: e2 } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
          if (!e2) { router.replace('/dashboard'); router.refresh(); return }
        }
        setError(vErr.message)
        return
      }
      router.replace('/dashboard')
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
