export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FlaskConical } from 'lucide-react'

/**
 * THE SEAT SHELL — for people who work FOR us, not people who buy from us.
 *
 * Why this exists (founder's walk, 16 Aug). The Client Partner portal was built as a
 * self-contained page — its own header, its own name menu, its own sign-out — and then
 * placed inside `(dashboard)`, the CLIENT shell. So the first time she signed in she got
 * the client chrome wrapped around her page: a **wallet balance**, a red **"you have no
 * credits — top up"** banner, and the **FIGSY** panel. The founder's words on seeing it:
 * *"landed on the old portal... portal version 1. same error."*
 *
 * Every one of those three is a surface R40 says she must not have. Two are client money
 * ("her cut only") and the third is the sourcing tool ("her own network only") — and none
 * of them meant anything on her screen anyway: with no client row the wallet reads $0 and
 * the banner tells a seller who has nothing to send that her outreach is paused.
 *
 * The fix is not another `!isPartner` guard bolted onto the client layout. That layout
 * already carries four of them and these three were still missed, which is what a shared
 * shell does — every new client feature is one more thing that must remember she exists.
 * A separate shell inverts the default: nothing reaches her unless it is put here on
 * purpose. The client layout is untouched, so no client and no legacy partner is affected.
 */

const IS_STAGING = process.env.NEXT_PUBLIC_IS_STAGING === 'true'

export default async function SeatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // A seat page is for a partner. A signed-in CLIENT who types the URL is not one, and
  // belongs on their own console — the API refuses them either way (it resolves the seat
  // from the auth token, never from the URL), so this is about sending someone to the right
  // place rather than about keeping data in.
  let isPartner = false
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
      const res = await fetch(`${apiUrl}/partners/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: AbortSignal.timeout(4000),
      })
      isPartner = res.ok
    }
  } catch {
    // A timeout or a wobbling API is NOT proof that she is not a partner. Locking her out
    // of her own earnings because a fetch was slow is the worse failure, and the page
    // itself re-checks against the same API — so let it through and let the page speak.
    isPartner = true
  }
  if (!isPartner) redirect('/milla')

  return (
    <div className="min-h-screen bg-[#FAFAFE]">
      {IS_STAGING && (
        <div className="flex items-center justify-center gap-2 bg-amber-400 text-amber-900 text-xs font-bold py-1.5 px-4">
          <FlaskConical className="w-3.5 h-3.5" />
          STAGING — test data only — changes here never affect production
        </div>
      )}
      <main className="px-4 sm:px-6 lg:px-8 pb-16 max-w-5xl mx-auto">{children}</main>
    </div>
  )
}
