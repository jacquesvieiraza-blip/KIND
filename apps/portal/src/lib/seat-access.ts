// ⚑ AUTH-002 — MAY THIS VISITOR ENTER A SEAT SURFACE? (founder-authorised, 6 Sep)
//
// ONE DECISION, IN ONE PLACE, AND IT FAILS CLOSED.
//
// `(seat)/layout.tsx` owns `/dashboard/client-partner` — a partner-only surface. It used to
// answer "is this visitor a partner?" by calling `/partners/me`, and in its catch it answered
// **true**: a timeout, a DNS failure or a thrown fetch granted access. The reasoning recorded
// there was that locking a Client Partner out of her own earnings because a fetch was slow is
// the worse failure.
//
// ⚠️ THAT TRADE IS THE WRONG WAY ROUND FOR AN ACCESS DECISION. The cost of failing closed is
// that one partner sees Milla for a few seconds during an API wobble. The cost of failing
// open is an ordinary paying customer standing inside a partner-only surface because the
// network hiccuped — and neither she nor we would know it happened. **An absence of an answer
// is not an answer**: the rule R90 states for lead attribution and R96/R97 state for
// commercial model, applied to identity.
//
// ⚠️ NOTHING ELSE CHANGES. The request is byte-for-byte the one the layout already made —
// same URL, same bearer header, same 4s budget — so a genuine partner's path is untouched and
// no visible UI moves. Only the unreadable case changes answer.
//
// ⚠️ WHY THIS IS A FUNCTION RATHER THAN AN INLINE CATCH. The layout is an async Next server
// component; the gate's vitest run cannot execute it (it resolves through the portal's `@/`
// alias, which the root vitest config deliberately does not provide). A source-shape
// assertion on a catch block is not a behavioural proof — R100 said so in terms. Pulled out
// here, with the lookup injected, every branch is executed by `seat-access.test.ts`.

/** The only part of the lookup response this decision reads. */
export type SeatLookupResponse = { ok: boolean }

export interface SeatAccessInput {
  /** The signed-in user's access token, or undefined when there is no session. */
  token: string | undefined
  /** Base URL of the API that owns seat identity. */
  apiUrl: string
  /** Injected so the decision is provable without a network. In the layout this is `fetch`. */
  fetcher: (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<SeatLookupResponse>
}

/**
 * True ONLY when the API positively confirmed this token holds a seat.
 *
 * Every other outcome — no session, a refusal, a 404, a 5xx, a thrown fetch, an aborted
 * request — is false. There is deliberately no third state and no "unknown": a caller that
 * has to interpret `undefined` is a caller that will eventually interpret it as access.
 */
export async function isAuthorisedSeat(input: SeatAccessInput): Promise<boolean> {
  // No token is not an error, it is simply not a seat. Asking the API without one would spend
  // 4s to be told what we already know.
  if (!input.token) return false

  try {
    const res = await input.fetcher(`${input.apiUrl}/partners/me`, {
      headers: { Authorization: `Bearer ${input.token}` },
      signal: AbortSignal.timeout(4000),
    })
    // `ok` is the whole answer: 200 → a seat, anything else (404 no seat, 401, 5xx) → not one.
    return res.ok
  } catch {
    // ⛓️ THE CORRECTION. This branch used to return true. A lookup that did not complete
    // tells us NOTHING about who is knocking, and "we could not tell" is never permission.
    return false
  }
}
