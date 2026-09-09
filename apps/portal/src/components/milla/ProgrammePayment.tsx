'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CLIENT'S PAYMENT — the two moments they are asked for money, in the place they already are.
//
// 🛑 A CLIENT COULD NOT PAY. The programme checkout rails exist and always have, but they live
// behind the ADMIN KEY — so the only way to take a programme payment was for an operator to
// mint a link and send it by hand. Milla is supposed to own the client payment experience and
// had no door at all.
//
// ⚠️ NO PRICE IS COMPUTED HERE. Every figure comes from the stored programme row, priced once
// from the shared curve at creation. A screen that re-derives money is the two-places-one-number
// defect with a client-visible amount attached.
//
// ⚠️ NO PROGRAMME ID IS SENT. The route resolves the client from the session and the programme
// from the client — a body-supplied id would let a signed-in customer mint a checkout against
// somebody else's programme.
//
// ⚠️ AND PAYING IS NOT STARTING. The webhook is the authority: an abandoned or failed checkout
// leaves the row untouched and grants nothing.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { programmeMoney } from '@/lib/programme-money'

export type PaymentStage = 'first' | 'second'

export default function ProgrammePayment({
  stage, totalCents, halfCents, meetingTarget,
}: {
  stage: PaymentStage
  totalCents: number
  halfCents: number
  meetingTarget: number | null
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    setBusy(true); setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { api } = await import('@/lib/api')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const r = await api.post<{ data: { url: string } }>(
        `/my/programme/checkout/${stage}`,
        { successUrl: `${window.location.origin}/milla/programme`, cancelUrl: window.location.href },
        session?.access_token,
      )
      if (!r.data?.url) throw new Error('We could not start the payment. Nothing was charged.')
      window.location.href = r.data.url
    } catch (e) {
      // ⚠️ THE SERVER'S SENTENCE. It knows whether the stage was wrong, the email was missing
      // or Stripe refused; a cheerful summary here would hide all three.
      setError(e instanceof Error && e.message && e.message.length < 240
        ? e.message
        : 'We could not start the payment. Nothing was charged — please try again.')
      setBusy(false)
    }
  }

  const isFirst = stage === 'first'

  return (
    <div className="border border-[#eee7f7] rounded-2xl px-4 py-4">
      <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-1">
        {isFirst ? 'Start your programme' : 'Second half'}
      </div>
      <div className="text-[15px] font-extrabold mb-1">{programmeMoney(halfCents)}</div>
      <p className="text-[13.5px] text-[#6b5f8c] mb-1">
        {isFirst
          ? `Half of ${programmeMoney(totalCents)}${meetingTarget ? ` for ${meetingTarget} booked meetings` : ''}.`
          : `The remaining half of ${programmeMoney(totalCents)}.`}
      </p>
      {/* 🛑 WHAT THE MONEY BUYS, STATED AS FACT. The first half does NOT buy outreach, and a
          client who thinks it does will wonder why nothing is happening. */}
      <p className="text-[12.5px] text-[#9b8ec4] mb-3">
        {isFirst
          ? 'This authorises us to find and prepare your prospects. Nothing is sent until you have seen the work and approved it.'
          : 'You have approved the work. This releases it — outreach starts after your programme is made live.'}
      </p>

      {error && (
        <div className="border border-red-200 bg-red-50/60 rounded-xl px-3.5 py-2.5 mb-3">
          <p className="text-[12.5px] font-semibold text-red-800">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="w-full sm:w-auto bg-[#7C3AED] text-white font-bold text-[13.5px] rounded-xl px-5 py-2.5 disabled:opacity-50"
      >
        {busy ? 'Opening…' : isFirst ? 'Pay the first half and start' : 'Pay the second half'}
      </button>
    </div>
  )
}
