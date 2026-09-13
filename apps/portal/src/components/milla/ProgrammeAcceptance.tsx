'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// "YES, BUILD THIS PROGRAMME" — the client's explicit acceptance of the recommendation. (B1.)
//
// 🛑 WHY THIS EXISTS. `POST /my/programme/accept` is the ONE canonical writer of
// `programmes.recommendation_accepted_at`, and nothing in Milla called it. `checkout/first`
// refuses while that column is null, so every client reached the payment card and was told
// `409 not_accepted` — a dead end with their money on the other side of it.
//
// 🛑 THE THREE ACTS STAY SEPARATE (founder-locked):
//   CHOOSING a size (the calculator) is not ACCEPTING. ACCEPTING is not PAYING.
// This component does exactly one of them and authorises nothing.
//
// ⚠️ IT HOLDS NO ACCEPTANCE STATE OF ITS OWN. On success it calls `onAccepted()`, the page
// re-reads `GET /my/programme`, and the PERSISTED `recommendation.acceptedAt` is what opens
// the payment card. A local boolean would unlock payment on a request that never landed —
// the failure the server's 409 exists to prevent, moved somewhere nobody would see it.
//
// ⚠️ AND IT NEVER SENDS A TIMESTAMP. The server stamps the acceptance; a browser-supplied
// time would be a client writing its own consent record.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { postAcceptance, PROGRAMME_ACCEPT_PATH, type AcceptResponse } from '@/lib/programme-acceptance'
import { programmeMoney } from '@/lib/programme-money'

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function ProgrammeAcceptance({
  meetingTarget, totalCents, firstPaymentCents, onAccepted,
}: {
  meetingTarget: number | null
  totalCents: number
  firstPaymentCents: number
  /** Re-read the canonical programme. The page decides what to show from the server, not us. */
  onAccepted: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accept = useCallback(async () => {
    // ⚠️ THE GUARD IS THE FIRST LINE, NOT A DISABLED ATTRIBUTE. A double click can land two
    // presses before React re-renders; the route is idempotent anyway (`already_accepted`),
    // and this keeps the screen from showing two conflicting results for one decision.
    if (busy) return
    setBusy(true)
    setError(null)
    const tk = await token()
    const r = await postAcceptance((path, body) =>
      api.post<AcceptResponse>(path, body, tk) as Promise<AcceptResponse>)
    if (r.ok) {
      // Success — including `already_accepted`. The page re-reads and the payment card opens
      // from the PERSISTED column.
      onAccepted()
      setBusy(false)
      return
    }
    // ⚠️ NOTHING IS UNLOCKED HERE. The failure is shown and the canonical payload is
    // unchanged, so the payment card stays shut on the next render.
    setError(r.message)
    setBusy(false)
  }, [busy, onAccepted])

  return (
    <div className="border border-[#e6e0f5] bg-white rounded-2xl px-4 py-4 max-w-xl">
      <p className="text-[13.5px] font-semibold text-[#2b2145]">Your recommendation</p>
      <p className="mt-1 text-[13px] text-[#5b5175] leading-relaxed">
        {meetingTarget
          ? <>We have put together a programme aimed at <strong>{meetingTarget} meetings</strong>, at {programmeMoney(totalCents)} in total.</>
          : <>We have put together a programme at {programmeMoney(totalCents)} in total.</>}
        {' '}The first payment would be {programmeMoney(firstPaymentCents)}.
      </p>
      {/* 🛑 THE TARGET IS A TARGET. The founder's rule: a recommendation is not a guarantee,
          and the client must be told so before they agree to it rather than after. */}
      <p className="mt-2 text-[12.5px] text-[#6b6188] leading-relaxed">
        This is what we are aiming for, not a guarantee. Accepting it does not pay for anything —
        the first payment is a separate step, and you will be asked for it after this.
      </p>
      <button
        onClick={() => void accept()}
        disabled={busy}
        className="mt-3 rounded-xl bg-[#7C3AED] text-white text-[13px] font-semibold px-4 py-2 disabled:opacity-50"
      >
        {busy ? 'Recording your acceptance…' : 'Accept this recommendation'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-red-700">{error}</p>
      )}
      {/* The path is referenced once, from the module that owns it, so a rename cannot leave
          a hand-typed string behind. */}
      <span hidden data-accept-path={PROGRAMME_ACCEPT_PATH} />
    </div>
  )
}
