// #342 — THE LAPSE CRON HAS BEEN 500-ing EVERY DAY, SO NOTHING EVER LAPSED.
//
// `/subscriptions/check-lapsed` runs daily at 09:00 UTC and does this:
//
//     .update({ status: 'lapsed' }).eq('status', 'active').lt('current_period_end', now)
//
// `lapsed` is not a value in the production `subscription_status` enum. Postgres rejects it,
// the handler rethrows, the route 500s — every day since it was written. **No subscription
// has ever been marked lapsed, so an unpaid client keeps access forever.** Same family as
// #190 (`paused`) and #340 (the statuses this codebase writes vs the ones the column takes):
// a green unit test proves the code does what it says, and the database says no.
//
// ── AND THE FIX IS NOT JUST "ADD THE VALUE" ──────────────────────────────────────────────
//
// Make the write succeed and it starts locking accounts daily. Which accounts, exactly?
//
// `current_period_end` is only ever written by OUR Stripe webhook handler. Miss one
// `customer.subscription.updated` — a deploy during the delivery, a 500, a retry we returned
// 200 to — and the column silently goes stale while the client is paying perfectly well. A
// cron that lapses on that column alone would lock out a paying customer using nothing but
// our own bookkeeping error as evidence.
//
// So a subscription Stripe manages is NEVER lapsed here. Stripe already tells us the truth
// through `past_due`, `unpaid` and `canceled`, and since #340 we store those faithfully
// instead of coercing them to `active`. A Stripe subscription sitting `active` well past its
// period end is not an unpaid client — it is a MISSED WEBHOOK, and the right response is to
// say so, not to punish the client for it.
//
// What genuinely needs this cron is the other kind: subscriptions granted by hand in Vida
// (`admin.ts` sets `status: 'active'` with a `current_period_end` and no
// `stripe_subscription_id`). Nothing else in the system will ever expire those.

export type LapseCandidate = {
  id: string
  client_id: string
  product: string
  status: string
  current_period_end: string | null
  stripe_subscription_id: string | null
}

export type LapseDecision = {
  /** Lock the account: the granted period is over and nothing external will end it. */
  lapse: boolean
  /** Plain-language why — this ends up in the log and the founder alert. */
  reason: string
  /**
   * Stripe manages this one, it is well past its period end, and Stripe has not told us
   * anything. That is almost certainly a webhook we never processed. Not a lapse — a
   * warning about our own bookkeeping.
   */
  webhookSuspect: boolean
}

/**
 * How far past `current_period_end` a Stripe-managed subscription may drift before we treat
 * the silence as a missed webhook rather than ordinary billing lag.
 *
 * Stripe's renewal invoice, its retries and the resulting `customer.subscription.updated` can
 * legitimately take hours. Three days is comfortably beyond any of that and still well inside
 * Stripe's own dunning window, so a genuine non-payment reaches us as `past_due` long before
 * this fires.
 */
export const STRIPE_STALE_DAYS = 3

/**
 * Decide what to do with one subscription whose period has ended.
 *
 * Deliberately pure and total: every branch returns a sentence. A cron that locks accounts
 * should never be able to act for a reason nobody wrote down.
 */
export function decideLapse(sub: LapseCandidate, now: Date): LapseDecision {
  if (sub.status !== 'active') {
    return { lapse: false, reason: `already ${sub.status} — only an active subscription can lapse`, webhookSuspect: false }
  }
  if (!sub.current_period_end) {
    // A hand-granted subscription with no end date is indefinite ON PURPOSE — that is how a
    // partner, a pilot or the founder's own account is set up. Expiring it because a column
    // is null would revoke access nobody asked to revoke.
    return { lapse: false, reason: 'no period end — an open-ended grant, indefinite by design', webhookSuspect: false }
  }
  const endedAt = new Date(sub.current_period_end)
  if (Number.isNaN(endedAt.getTime())) {
    // Unparseable is not expired. Guessing here would lock an account on a typo.
    return { lapse: false, reason: `current_period_end is not a readable date (${sub.current_period_end})`, webhookSuspect: false }
  }
  if (endedAt.getTime() > now.getTime()) {
    return { lapse: false, reason: 'still inside the paid period', webhookSuspect: false }
  }

  if (sub.stripe_subscription_id) {
    // STRIPE IS THE AUTHORITY. It will send past_due / unpaid / canceled when this client
    // actually stops paying, and since #340 we store exactly that. Our own stale column is
    // not evidence of non-payment.
    const daysPast = (now.getTime() - endedAt.getTime()) / 864e5
    return {
      lapse: false,
      reason: `Stripe manages this subscription — its status is the authority, not our copy of the period end (${daysPast.toFixed(1)}d past)`,
      webhookSuspect: daysPast > STRIPE_STALE_DAYS,
    }
  }

  return {
    lapse: true,
    reason: `hand-granted subscription whose period ended ${sub.current_period_end} — nothing external will ever expire it`,
    webhookSuspect: false,
  }
}

/** What we write, and what to write instead if the enum still has not been widened. */
export const LAPSED_STATUS = 'lapsed'
/**
 * `past_due` is the fallback, not `cancelled`. Both deny access, but a lapse is a period that
 * ran out — nobody cancelled anything — and telling a client their subscription was cancelled
 * when it was not is a support conversation we would deserve.
 */
export const LAPSED_FALLBACK = 'past_due'

/** The alert body for a Stripe subscription that has drifted far past its period end. */
export function webhookSuspectLines(subs: Array<{ client_id: string; product: string; current_period_end: string | null }>): string[] {
  return [
    `${subs.length} Stripe-managed subscription(s) are still marked active well past the period end we have on file.`,
    'They were NOT lapsed — Stripe, not our copy of the date, decides whether a client is paying, and locking out a payer over our own stale column is the worse mistake.',
    'But this pattern means we are probably missing customer.subscription.updated webhooks, so our billing view is drifting from Stripe.',
    'Check: Stripe → Developers → Webhooks → the endpoint\'s recent deliveries and failures.',
    ...subs.slice(0, 10).map(s => `  · client ${s.client_id} · ${s.product} · period end on file ${s.current_period_end}`),
  ]
}
