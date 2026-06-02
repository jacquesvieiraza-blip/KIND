'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ensurePushSubscription } from '@/lib/push'

export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(async () => {
          // Re-attach the push subscription if the user already opted in.
          try {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.access_token) await ensurePushSubscription(session.access_token)
          } catch { /* best-effort */ }
        })
        .catch(() => {})
    }
  }, [])

  return null
}
