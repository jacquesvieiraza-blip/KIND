// WHAT THE CLIENT IS TOLD ABOUT THEIR OWN MONEY AND THEIR OWN DESK (#563, #570).
//
// Every rule here decides a sentence a paying client reads. They are pure and tested for the
// same reason the money logic is: each one was previously inlined in a React component, where
// nothing could prove it — and two of them were provably wrong.
//
// The standard: never state a figure we cannot stand behind, and never let a partial view
// look like the whole view.

export type PackView = { active: boolean; included: number; used: number; left: number }

/**
 * The client's onboarding pack, in one sentence for the billing page (#563).
 *
 * The billing page read `/credits` and knew ONLY the wallet. So a client who had just paid
 * $99 opened their billing page and saw a **$0 balance and no mention of the 100 approvals
 * they had bought** — on the one screen that exists to explain what they paid for. The pack
 * is a counted quota, not a wallet credit (#541), so a wallet-only page can never show it.
 */
export function packLine(pack: PackView | null | undefined): string | null {
  if (!pack || !pack.active) return null
  if (pack.left <= 0) {
    return `Your ${pack.included} included leads are all used. New approvals are $4 each, taken from your wallet.`
  }
  if (pack.used === 0) {
    return `${pack.included} included leads — none used yet. Approving costs nothing until they run out.`
  }
  return `${pack.left} of your ${pack.included} included leads left (${pack.used} used). Approving costs nothing until they run out.`
}

/**
 * Does the desk show everything the client is being told they have? (#570)
 *
 * `/for-approval` is capped at **50 rows**. `leads_awaiting` is an **uncapped count**. So a
 * client with 120 waiting saw the headline "120 leads awaiting" above a list of 50, with
 * nothing explaining the other 70 — which reads as the product having lost them.
 *
 * Returns null when the list is complete, because a caveat on a complete list is noise.
 */
export function deskCoverage(a: { awaiting: number; shown: number }): string | null {
  if (a.awaiting <= a.shown) return null
  return `Showing the top ${a.shown} of ${a.awaiting}. Approve or pass some to see the rest.`
}

/**
 * What to say when the wallet is short (#570).
 *
 * The desk computed `ids.length * 4` **client-side** — a figure invented in the browser that
 * ignores how much is already in the wallet and how many of those leads are still inside the
 * included pack. The server knows both. So: use the server's numbers when it sends them, and
 * when it does not, **say what is true without naming a total we cannot stand behind**.
 *
 * A wrong number on a payment screen costs more trust than no number.
 */
export function shortfallMessage(a: {
  count: number
  /** What the server said is needed, in dollars. Absent when the server did not say. */
  neededUsd?: number | null
  /** The wallet balance the server reported. Absent when the server did not say. */
  balanceUsd?: number | null
}): string {
  const n = Math.max(1, Math.floor(a.count))
  const leads = `${n} lead${n === 1 ? '' : 's'}`
  if (typeof a.neededUsd === 'number' && Number.isFinite(a.neededUsd) && a.neededUsd > 0) {
    const bal = typeof a.balanceUsd === 'number' && Number.isFinite(a.balanceUsd)
      ? ` You have $${a.balanceUsd.toFixed(2)}.`
      : ''
    return `You need $${a.neededUsd.toFixed(2)} more to approve ${leads}.${bal} Top up to continue.`
  }
  // No server figure — describe the rule instead of inventing a total.
  return `Your wallet is short for ${leads}. Approvals outside your included pack are $4 each. Top up to continue.`
}
