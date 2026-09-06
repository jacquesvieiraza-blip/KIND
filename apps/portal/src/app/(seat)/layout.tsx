export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAuthorisedSeat } from '@/lib/seat-access'
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
  //
  // ⛓️ AUTH-002 (6 Sep, founder-authorised) — THIS DECISION USED TO FAIL OPEN. Its catch
  // answered `isPartner = true`, on the reasoning that a slow fetch must not lock a Client
  // Partner out of her own earnings. For an ACCESS decision that trade is the wrong way
  // round: failing closed costs her a few seconds in Milla, failing open puts an ordinary
  // paying customer inside a partner-only surface because the network wobbled. The rule and
  // every branch of it now live in `isAuthorisedSeat`, which the gate can actually execute —
  // see `lib/seat-access.test.ts`. The request itself is unchanged, so a genuine partner
  // sees exactly the screen she saw before.
  let allowed = false
  try {
    const { data: { session } } = await supabase.auth.getSession()
    allowed = await isAuthorisedSeat({
      token: session?.access_token,
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app',
      fetcher: fetch,
    })
  } catch {
    // getSession itself failing is the same class of unreadable answer, and it refuses too.
    allowed = false
  }
  if (!allowed) redirect('/milla')

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
