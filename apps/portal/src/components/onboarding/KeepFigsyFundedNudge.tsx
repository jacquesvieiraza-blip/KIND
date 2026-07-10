'use client'

/**
 * KeepFigsyFundedNudge (#454, Phase 5) — the "keep FIGSY funded" soft nudge.
 *
 * Fires on the REAL zero/low-balance event (not only during the tour): the reveal
 * 402 on the leads page and the out-of-FIGSY-credits enroll path on the figsy page
 * both raise a `kind:credit-nudge` window event. This is a NUDGE, never a lock —
 * full access stays, in-flight campaigns keep running, it only points at billing.
 *
 * The billing link is gated to owner/admin (team role). A non-owner sees a "ask your
 * account owner to top up" line instead — they can't be sent to a billing page they
 * don't control. Styled with the brand token #7C3AED, same look as LowCreditsNotice.
 */

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { X, Zap, Coins } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CREDIT_NUDGE_EVENT, type CreditNudgeKind } from '@/lib/onboarding-nudge'

const BRAND = '#7C3AED'

export function KeepFigsyFundedNudge() {
  const [kind, setKind] = useState<CreditNudgeKind | null>(null)
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CreditNudgeKind>).detail
      if (detail === 'figsy-empty' || detail === 'reveal-empty') setKind(detail)
    }
    window.addEventListener(CREDIT_NUDGE_EVENT, handler as EventListener)
    return () => window.removeEventListener(CREDIT_NUDGE_EVENT, handler as EventListener)
  }, [])

  // Lazily resolve the team role the first time the nudge is shown (gates the link).
  useEffect(() => {
    if (kind === null || isOwnerOrAdmin !== null) return
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setIsOwnerOrAdmin(false); return }
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
        const r = await fetch(`${apiUrl}/team/members`, { headers: { Authorization: `Bearer ${session.access_token}` } })
        const members: { email: string; role: string }[] = r.ok ? await r.json() : []
        const me = members.find(m => m.email === session.user.email)
        setIsOwnerOrAdmin(me ? (me.role === 'owner' || me.role === 'admin') : true)
      } catch {
        // Can't resolve role → assume they can top up (owner is the common case).
        setIsOwnerOrAdmin(true)
      }
    })
  }, [kind, isOwnerOrAdmin])

  if (kind === null) return null

  const isFigsy = kind === 'figsy-empty'
  const title = isFigsy
    ? "You're out of FIGSY credits"
    : "You're out of reveal credits"
  const body = isFigsy
    ? 'Top up to keep FIGSY working — writing, sending and following up on your behalf. Your enrolled campaigns keep running in the meantime.'
    : 'Add reveal credits to unmask more leads — $1 unmasks one, and you never pay twice for the same person.'

  return (
    <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      {/* dim scrim — click to dismiss (never traps) */}
      <div className="absolute inset-0 bg-black/40" onClick={() => setKind(null)} />

      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-purple-100 p-5">
        <button
          onClick={() => setKind(null)}
          className="absolute top-3 right-3 p-1 rounded-lg text-[#9B8EC4] hover:bg-gray-100 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#F5F0FF' }}>
          {isFigsy ? <Zap className="w-5 h-5" style={{ color: BRAND }} /> : <Coins className="w-5 h-5 text-amber-500" />}
        </div>

        <h3 className="text-base font-bold text-[#1E1152]">{title}</h3>
        <p className="mt-1.5 text-sm text-gray-600 leading-relaxed">{body}</p>

        <div className="mt-4 flex items-center gap-2">
          {isOwnerOrAdmin === false ? (
            <p className="text-sm text-[#7B6FA0]">
              Ask your account owner to top up to keep FIGSY funded.
            </p>
          ) : (
            <Link
              href="/dashboard/billing"
              onClick={() => setKind(null)}
              style={{ background: BRAND }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Go to billing
            </Link>
          )}
          <button
            onClick={() => setKind(null)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-[#7C3AED] bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  )
}
