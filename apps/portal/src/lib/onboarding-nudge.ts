/**
 * Low-credit soft-nudge bus (#454, Phase 5).
 *
 * A friendly, NON-BLOCKING prompt that fires on the REAL zero-balance event — the
 * $1 reveal 402 (leads) and the out-of-FIGSY-credits enroll path (figsy). It's a
 * window CustomEvent so any page can raise it and the single <KeepFigsyFundedNudge>
 * mounted in the dashboard layout renders it. Nothing is ever locked or hidden.
 */

export type CreditNudgeKind = 'figsy-empty' | 'reveal-empty'
export const CREDIT_NUDGE_EVENT = 'kind:credit-nudge'

export function notifyCreditNudge(kind: CreditNudgeKind): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<CreditNudgeKind>(CREDIT_NUDGE_EVENT, { detail: kind }))
}
