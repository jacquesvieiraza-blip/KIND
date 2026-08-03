// #607 — RETIRING THE TRIAL STATE. What a signup writes, and why it is no longer a trial.
//
// THE MODEL (founder-locked 24–25 Jul, `packages/shared/src/constants/index.ts:161`): there is
// ONE money event. The first purchase is $99 for the onboarding pack (100 approvals included),
// then $4 per approved lead. There is no trial, no subscription, nothing free.
//
// THE CODE DISAGREED. `routes/auth.ts` wrote a subscription row on every signup with
// `status:'trialing'` and `trial_ends_at` 14 days out, and two crons acted on it every morning
// — one of them emailing the client *"Your K.I.N.D trial ends in 4 days… Subscribe now"*, which
// is a sentence about a product we do not sell, sent to a real person.
//
// ── WHAT THE ROW IS ACTUALLY FOR ────────────────────────────────────────────────────────────
//
// Read end to end, the row does two jobs that had been conflated:
//
//   1. ENTITLEMENT — "this client has the FIGSY product". `product:'lead_gen_figsy'` is what
//      the portal's `isLive('lead_gen_figsy')` reads. This job is real and must survive.
//   2. TRIAL — `status:'trialing'` + a 14-day `trial_ends_at`. This job describes a commercial
//      state that no longer exists. This job dies here.
//
// Job 1 is why we do NOT simply stop writing the row: deleting the entitlement is a bigger
// change than the founder asked for, and it would silently alter what a client's account
// contains. The row stays; only its STATUS becomes honest.
//
// ── WHY `paused`, AND WHY NOT THE OBVIOUS ALTERNATIVES ──────────────────────────────────────
//
// The founder's words for the replacement: *"the client exists, dormant, until the $99 pack
// lands — nothing sources or sends before payment, which is already the pack rule."*
//
// THE CONSTRAINT THAT DECIDES IT IS #342, and it is a live scar, not a hypothetical.
// `subscriptions.status` is a Postgres ENUM in production. Writing a value the enum has never
// heard of raises 22P02 — and `auth.ts:198` THROWS on a failed subscription insert. So an
// invented status ("dormant", "pending", "unpaid_pending") would not degrade; it would make
// **every signup 500**. #342 is that exact bug still live elsewhere in this repo: the lapse
// cron writes `'lapsed'`, a value in no migration, and 500s daily.
//
// So the value must come from `ENUM_PRESENT_BEFORE` — the set we can PROVE is in production:
//
//   active     ✗ grants access AND counts as a paying client in every revenue counter. Writing
//              it on signup would report every unpaid signup as revenue. That is the #340 bug
//              (a declined card reading as active) recreated deliberately.
//   past_due   ✗ means they owed money and did not pay. They never owed anything.
//   cancelled  ✗ means they had it and it ended. They never had it.
//   trialing   ✗ the thing being retired.
//   paused     ✓ the product row exists and is NOT live. Exactly "dormant until they pay",
//              `grantsAccess:false`, already in the enum (#190 added it), and it is the only
//              one of the five whose plain-English meaning is the founder's sentence.
//
// ── GRANDFATHERING (founder: "explicitly, never silently") ──────────────────────────────────
//
// Rows already carrying `trialing` in production are NOT rewritten by this code, and nothing
// here starts refusing them. Two deliberate halves:
//
//   • `statusGrantsAccess` in `subscription-status.ts` still returns true for `trialing`, so no
//     existing account loses anything the moment this deploys. That tolerance is LEGACY, and it
//     is documented as such rather than left looking current.
//   • `supabase/migrations/20260801_retire_trial_status.sql` converts them to `paused`, and it
//     is registered in `PENDING_MIGRATIONS` so the founder runs it from Vida → Engine → Run
//     migrations. Until he does, `/status` reports the remaining count as `legacy_trialing` so
//     the number is visible going to zero instead of being assumed.
//
// Nothing is silently converted, and nothing silently breaks. Both halves are stated.

/** The status a NEW signup's entitlement row is created with. Enum-safe (#342). */
export const SIGNUP_SUBSCRIPTION_STATUS = 'paused' as const

/** The product enum value the FIGSY entitlement row carries. */
export const SIGNUP_SUBSCRIPTION_PRODUCT = 'lead_gen_figsy' as const

export type SignupSubscriptionRow = {
  client_id: string
  product: typeof SIGNUP_SUBSCRIPTION_PRODUCT
  tier: 'starter'
  status: typeof SIGNUP_SUBSCRIPTION_STATUS
  billing_interval: 'monthly'
  amount_usd: 0
  amount_zar: 0
  /**
   * NULL on purpose. A trial end date on a row that is not a trial is the field that fed the
   * expiry cron its "4 days left" arithmetic; leaving it populated would keep that sentence
   * computable by anything that reads the column later.
   */
  trial_ends_at: null
  current_period_start: string
  /**
   * NULL on purpose. The old code set this 14 days out — a billing period for a subscription
   * that bills nothing. `/status`'s at-risk query compares `current_period_end` against now,
   * so a fabricated date would have made every dormant signup "at risk" the day it expired.
   */
  current_period_end: null
}

/**
 * The entitlement row a signup creates: the client exists and holds the product, dormant,
 * until their $99 lands. Pure — no database, no clock beyond the caller's timestamp.
 */
export function signupSubscriptionRow(clientId: string, nowIso: string): SignupSubscriptionRow {
  return {
    client_id: clientId,
    product: SIGNUP_SUBSCRIPTION_PRODUCT,
    tier: 'starter',
    status: SIGNUP_SUBSCRIPTION_STATUS,
    billing_interval: 'monthly',
    amount_usd: 0,
    amount_zar: 0,
    trial_ends_at: null,
    current_period_start: nowIso,
    current_period_end: null,
  }
}

/**
 * Is this stored status one we still honour but no longer create?
 *
 * Used to keep the grandfathering visible in code rather than as a comment: anything this
 * returns true for is a value in production that this build will never write again.
 */
// ── THE LIVE SCHEMA DISAGREES WITH THE HONEST ROW, AND MIGRATIONS CANNOT RUN ────────────────
//
// FOUND 4 AUG BY THE FOUNDER, AS THE FIRST PERSON TO SIGN UP SINCE #607 SHIPPED. The row above
// writes `current_period_end: null` on purpose (see the field comment) — but the production
// `subscriptions` table has a NOT NULL constraint on that column, so the insert died with
// 23502 and **every new client signup failed at the front door for two days**. The schema is
// frozen (no dashboard, no password, no runnable migrations), so the code adapts:
//
// Try the honest null FIRST. If the live schema refuses it, retry once with the sentinel
// below. The day the constraint is relaxed, the honest write simply starts succeeding and
// the sentinel stops being written — no second deploy needed. Same fail-open shape as
// #342's `isEnumRejection` fallback, one file over.

/**
 * Far-future period end for schemas that refuse NULL. 2099 rather than a fabricated near
 * date because `/status`'s at-risk query compares `current_period_end` against NOW — a
 * realistic date would make every dormant signup read "at risk" the day it passed, which is
 * the exact defect the null was chosen to avoid. 2099 is also this repo's established
 * far-future sentinel (`subscription-lapse.test.ts` uses `2099-01-01`).
 */
export const PERIOD_END_SENTINEL = '2099-12-31T00:00:00.000Z'

/** Postgres 23502 (not_null_violation) on the one column the live schema disputes. */
export function isPeriodEndNotNullRejection(error: { code?: string | null; message?: string | null } | null): boolean {
  if (!error) return false
  const msg = error.message ?? ''
  return error.code === '23502' && /current_period_end/i.test(msg)
}

/** The same row with the sentinel in place of the honest null — the retry, never the first try. */
export function signupSubscriptionRowCompat(clientId: string, nowIso: string): Omit<SignupSubscriptionRow, 'current_period_end'> & { current_period_end: string } {
  return { ...signupSubscriptionRow(clientId, nowIso), current_period_end: PERIOD_END_SENTINEL }
}

export function isLegacyStatus(status: string): boolean {
  return status === 'trialing'
}
