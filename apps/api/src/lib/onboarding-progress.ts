// THE CLIENT'S FIRST-RUN CHECKLIST — what it may claim, and what it must not.
//
// Two defects, both found by reading `routes/onboarding.ts` end to end in the 27-Jul audit.
//
// ① A CLIENT PAID AND THE CHECKLIST SAID THEY HADN'T.
//    `hasPurchase` counted `.eq('type', 'purchase')`. Stripe writes `type: 'wallet_topup'`
//    for every wallet payment including the first $99 (`routes/stripe.ts:330`). So the one
//    step that proves they are a paying client never ticked — on the screen we use to teach
//    them the product. `PURCHASE_TX_TYPES` has existed for exactly this; this file predates
//    it and was never revisited, and grep for "purchase" finds the line looking correct.
//
// ② A FAILED COUNT RENDERED AS ZERO.
//    `Promise.allSettled(...).map(r => fulfilled ? count : 0)` turned a broken query into a
//    confident "you have not done this yet". Same shape as #565 in Vida — but on the CLIENT's
//    side, where nobody had looked.
//
// So the flags and the failures are separate values. A caller cannot render "not done" over a
// question we could not ask, because the answer arrives with a list of what could not be
// established.

export const PROGRESS_KEYS = ['hasIcp', 'hasLeads', 'hasReveal', 'hasEnrollment', 'hasPurchase'] as const
export type ProgressKey = typeof PROGRESS_KEYS[number]

/** One count, or the reason it could not be taken. */
export type Counted = { ok: true; count: number } | { ok: false; why: string }

export type ProgressReading = {
  flags: Record<ProgressKey, boolean>
  /** Which questions could NOT be answered. Empty means the flags are the whole truth. */
  unavailable: ProgressKey[]
}

/**
 * Turn five counts into five flags — and say which ones we failed to take.
 *
 * A failed count still yields `false`, because the checklist has to render something and an
 * unticked box is the safer of the two mistakes. **But it is also listed in `unavailable`**,
 * so the UI can say *"we couldn't check this"* instead of *"you haven't done this"* — which
 * is the difference between a product that is honest and one that quietly accuses the client
 * of not having started.
 */
export function readProgress(counts: Record<ProgressKey, Counted>): ProgressReading {
  const flags = {} as Record<ProgressKey, boolean>
  const unavailable: ProgressKey[] = []
  for (const k of PROGRESS_KEYS) {
    const c = counts[k]
    if (c.ok) flags[k] = c.count > 0
    else { flags[k] = false; unavailable.push(k) }
  }
  return { flags, unavailable }
}

/** Wording for the UI when a step could not be checked. Never "not done". */
export function unavailableNote(unavailable: ProgressKey[]): string | null {
  if (unavailable.length === 0) return null
  return `We couldn't check ${unavailable.length} of these just now — an unticked box below does NOT mean you haven't done it. Refresh in a moment.`
}
