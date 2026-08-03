// #340 — A DECLINED CARD BOUGHT A WORKING PRODUCT.
//
// `routes/stripe.ts` decided a subscription's status like this:
//
//     const status = sub.status === 'active' || sub.status === 'trialing' ? sub.status : 'active'
//
// Read the false branch. **Everything that is not already good is written as `active`.**
// Stripe's `incomplete` (the card was declined at signup and the subscription never
// started), `past_due`, `unpaid` (dunning exhausted), `canceled`, `incomplete_expired` —
// all of them landed in the database as a live, paid subscription.
//
// Every consumer gates on `.eq('status','active')` or `.in('status',['active','trialing'])`,
// so that one ternary is the whole authorisation decision for the paid product. A card that
// never cleared bought full access, indefinitely, with nothing anywhere to show it.
//
// IT ALSO UNDID THE DUNNING. `invoice.payment_failed` correctly writes `past_due` and alerts
// the founder — and Stripe sends `customer.subscription.updated` alongside it, carrying
// `past_due`, which the ternary immediately coerced back to `active`. So the one path built
// to catch non-payment was overwritten by the bug within the same second.
//
// ── THE TRAP THIS FIX HAD TO AVOID (#342, the very next item) ────────────────────────────
//
// Production's `subscriptions.status` is a **Postgres enum**, not a text+CHECK column — the
// repo's `schema.sql` drifted and says otherwise, and #190 already discovered this the hard
// way: *"invalid input value for enum subscription_status: paused"*. #342 is the same bug
// still live: the lapse cron writes `'lapsed'`, which is not in the enum, so it 500s daily
// and unpaid clients keep access forever.
//
// So "map Stripe faithfully" is only half an instruction. Writing `incomplete` into an enum
// that has never heard of it fails **exactly like #342** — and a failed write here leaves the
// row on its previous value, which for an existing subscription means it stays `active`. The
// honest fix would have recreated the bug it was fixing.
//
// Hence two things: the migration adds the values, AND every mapping carries a `fallback`
// that is drawn only from the values we can prove were already in the enum and that also
// denies access. If the write is rejected, the fallback still locks the account and the
// founder is told the migration has not been run.

/** Values we can PROVE are in the production enum today (from committed migrations). */
export const ENUM_PRESENT_BEFORE = ['active', 'trialing', 'past_due', 'cancelled', 'paused'] as const

/** Values the 20260727_subscription_status migration adds. */
export const ENUM_ADDED = ['incomplete', 'incomplete_expired', 'unpaid'] as const

export type DbSubscriptionStatus =
  | typeof ENUM_PRESENT_BEFORE[number]
  | typeof ENUM_ADDED[number]

export type StatusMapping = {
  /** What we want to store — faithful to Stripe. */
  status: DbSubscriptionStatus
  /** What to store instead if the enum rejects `status`. Always from ENUM_PRESENT_BEFORE. */
  fallback: typeof ENUM_PRESENT_BEFORE[number]
  /** Does this status entitle the client to the paid product? */
  grantsAccess: boolean
  /** True when Stripe sent a status we have never seen — deny, and tell someone. */
  unrecognised: boolean
}

/**
 * Map a Stripe subscription status onto ours.
 *
 * Note `canceled` → `cancelled`. Stripe spells it with one L and our enum with two; a
 * straight pass-through would have written a value the enum rejects, which is #342 again.
 *
 * AN UNKNOWN STATUS DENIES ACCESS. Stripe can add states, and the two ways to be wrong are
 * not equal: denying a paying client is visible within minutes and alerted, while granting
 * free access to an unknown state is invisible until someone reads the revenue report and
 * wonders. Deny, alert, map it properly next release.
 */
export function mapStripeStatus(stripeStatus: string): StatusMapping {
  switch (stripeStatus) {
    case 'active':
      return { status: 'active', fallback: 'active', grantsAccess: true, unrecognised: false }
    case 'trialing':
      return { status: 'trialing', fallback: 'trialing', grantsAccess: true, unrecognised: false }
    case 'past_due':
      return { status: 'past_due', fallback: 'past_due', grantsAccess: false, unrecognised: false }
    case 'paused':
      return { status: 'paused', fallback: 'paused', grantsAccess: false, unrecognised: false }
    case 'canceled':
    case 'cancelled':   // accept both spellings coming in; always store ours
      return { status: 'cancelled', fallback: 'cancelled', grantsAccess: false, unrecognised: false }
    case 'unpaid':
      // Dunning exhausted. past_due is the honest fallback — same meaning, one step earlier.
      return { status: 'unpaid', fallback: 'past_due', grantsAccess: false, unrecognised: false }
    case 'incomplete':
      // THE ONE THAT COST US THE PRODUCT: the first payment never succeeded, so the
      // subscription never really began.
      return { status: 'incomplete', fallback: 'past_due', grantsAccess: false, unrecognised: false }
    case 'incomplete_expired':
      // Stripe gave up waiting for that first payment. It is over — cancelled is exact.
      return { status: 'incomplete_expired', fallback: 'cancelled', grantsAccess: false, unrecognised: false }
    default:
      return { status: 'past_due', fallback: 'past_due', grantsAccess: false, unrecognised: true }
  }
}

/**
 * Does a stored status entitle the client to the paid product?
 *
 * This is an ALLOWLIST on purpose, and it is the same allowlist every consumer already
 * applies (`.eq('status','active')` / `.in('status',['active','trialing'])`). Written as a
 * denylist, every status added later would default to granting access — which is precisely
 * how the ternary this file replaces behaved.
 *
 * ⚠️ #607 — `trialing` IS LEGACY TOLERANCE, NOT CURRENT BEHAVIOUR. Since 1 Aug nothing in this
 * codebase creates a trialing subscription: a signup writes `paused` (dormant until the $99
 * onboarding pack lands — see `lib/signup-subscription.ts`). It is still honoured here on
 * purpose, so that rows written before that date do not lose access the instant this deploys.
 * `supabase/migrations/20260801_retire_trial_status.sql` converts them; once
 * `/internal/status/snapshot` reports `legacy_trialing: 0`, this branch is dead and can go.
 * Do NOT read it as "we grant access during trials" — there are no trials.
 */
export function statusGrantsAccess(status: string): boolean {
  return status === 'active' || status === 'trialing'
}

/** Was this write rejected because the enum has never heard of the value (#342's shape)? */
export function isEnumRejection(error: { code?: string | null; message?: string | null } | null): boolean {
  if (!error) return false
  const msg = error.message ?? ''
  // 22P02 = invalid_text_representation, which is what Postgres raises for a bad enum input.
  return error.code === '22P02' || /invalid input value for enum/i.test(msg)
}
