// ═══════════════════════════════════════════════════════════════════════════
// THE AR5 PROVIDER BOUNDARY — one decision, used by every lead path.
//
// ── THE RULE THIS FILE EXISTS TO ENFORCE ────────────────────────────────────
// PRODUCT-RULES **AR5** (founder-locked 30 Jul, re-affirmed 1 Aug, #606):
//   "Apollo is OURS. PDL + Hunter are the CLIENTS'."
//
// Until 21 Aug that rule was enforced by **labels in a document**. The code had
// no idea whose sourcing it was running, so provider choice fell out of which
// global API keys happened to be set in Railway — and a 21-Aug read-only audit
// found FOUR live doors where that crossed the boundary in both directions:
//
//   ① Milla ICP sourcing        → Apollo ∪ PDL union, no audience concept
//   ② POST /leads/find-at-companies (CLIENT-authenticated) → our Apollo
//   ③ POST /lookalike/generate  → our Apollo, for a client
//   ④ POST /icps/preview-count  → our Apollo, for a client's preview
//
// The money did not leak at any of those doors — Apollo People Search is FREE;
// the credit is the email REVEAL. What the doors did was **stamp `apollo_id`**
// onto client leads, and `lead-delivery.ts` then spent one of K.I.N.D's Apollo
// credits per reveal on a lead that was never ours to reveal.
//
// ── WHY THE DECISION LIVES HERE AND NOT AT FOUR CALL SITES ──────────────────
// Four copies of an audience check is four chances to update three of them.
// The doors ask this module; the module is pure and unit-tested; and the answer
// depends on WHO the work is for — never on which keys exist.
//
// ⚠️ `apollo_id` ON A LEAD IS NOT AN AUDIENCE SIGNAL. It is provenance. The
// founder deliberately grandfathered existing client leads that carry a genuine
// Apollo id (AR15, 21 Aug): they may finish through the reveal path they were
// created under. But a NEW client lead is not id-less — it carries PDL's own
// `pdl_…` id — so closing the four search doors did not close the REVEAL door.
// See "THE REVEAL DOOR" below for the guard that does.
// ═══════════════════════════════════════════════════════════════════════════

import { resolveHouseUserIds } from './real-clients'
import { HOUSE_ACCOUNT_EMAIL } from './real-clients-logic'
import { db } from '@kind/db'

/** Whose work is this? The only input provider choice is ever allowed to have. */
export type Audience = 'house' | 'client'

export type SearchProvider = 'apollo' | 'pdl'

/**
 * AR5, as a function. Pure — no keys, no environment, no database.
 *
 * `'house'` → Apollo. K.I.N.D hunting for K.I.N.D's own clients, on K.I.N.D's
 *             prepaid Apollo credits.
 * `'client'` → PDL. The clients' sourcing stack, fenced by AR8's pre-funded
 *             allowance exactly as it was before this module existed.
 */
export function searchProviderFor(audience: Audience): SearchProvider {
  return audience === 'house' ? 'apollo' : 'pdl'
}

/**
 * THE SOURCING DECISION — AR5, plus the ONE founder-locked exception for FREE PROOF.
 *
 * ⛓️ 15 Sep (S2-RT-001A) — CLIENT **PROOF** SOURCES THROUGH APOLLO, NOT PDL. Founder-locked,
 * verbatim: *"CLIENT PROOF SOURCING MUST USE APOLLO."* · *"DO NOT use PDL for client Proof."*
 * · *"DO NOT add PDL as a fallback for Proof."*
 *
 * ⚠️ WHAT EARNED IT. Northstar Revenue completed its Brief, promoted to a client with an
 * active ICP, and entered Proof normally. AR5 routed the client audience to PDL, PDL answered
 * 402 — search credits exhausted — and the run resolved fail-closed with zero prospects. The
 * claim was released `run_failed`, `proof_passes_done` stayed 0, and the customer was shown
 * *"We hit a snag confirming your matches"*. Nothing was broken; Proof was simply pointed at a
 * provider that had nothing left to give.
 *
 * ⚠️ IT IS A SEPARATE FUNCTION, NOT A NEW ARGUMENT ON `searchProviderFor`. That selector is
 * AR5 itself and is read by the ICP PREVIEW (AR14) as well as by sourcing; widening it in
 * place would move the preview's provider too, and a preview is not a Proof run. Every
 * non-proof caller keeps the old function, unchanged, and the compiler shows exactly which
 * call sites opted into the exception.
 *
 * ⚠️ AND IT IS SCOPED TO PROOF, NOT TO CLIENTS. `proofMode` false — or absent — is AR5
 * byte-for-byte: a paying client's ordinary sourcing run still goes to PDL behind AR8's cash
 * fence. This is not authority to move every sourcing flow onto Apollo.
 *
 * ⚠️ THERE IS NO FALLBACK IN EITHER DIRECTION. A Proof run that Apollo cannot serve FAILS
 * CLOSED — it does not quietly try PDL, because "try the other provider" is precisely the
 * silent cross-over AR5 exists to prevent, and a prospect served from an unintended stack is
 * the defect wearing a success message.
 */
export function sourcingProviderFor(
  audience: Audience,
  opts?: { proofMode?: boolean },
): SearchProvider {
  if (opts?.proofMode === true) return 'apollo'
  return searchProviderFor(audience)
}

// ⚠️ THERE IS DELIBERATELY NO `revealProviderFor()` HERE (removed 22 Aug).
//
// A `revealProviderFor(audience) => 'apollo' | 'hunter'` was written here and had
// ZERO runtime callers — nothing but its own test ever read it. Dead policy code
// is bad enough; this particular dead code also *encoded a rule that does not
// exist*, reading as "house must never use Hunter". The founder ruled otherwise:
//
//   "no. we have no blocker. if we need hunter we need him."   (22 Aug)
//
// Hunter is the normal client's reveal provider AND is permitted as a house /
// Client Zero reveal fallback when needed. The live Hunter waterfall in
// `lead-delivery.ts` is gated on the key, serves any audience, and is CORRECT —
// it is not an AR5 defect and it is not changed by this module.
//
// What AR5 does constrain is the paid APOLLO reveal, and that is enforced below
// by `apolloRevealableIds()` against the id's own provenance — not by an
// audience-to-provider table nothing consults. See PRODUCT-RULES **AR5**.

/**
 * Founder-ruled 21 Aug: **company-name search is house-only, for now.**
 *   "only the house account can search by company name. for now. only us."
 *
 * It is a separate question from `searchProviderFor` because it is not a provider
 * choice at all — PDL has no company-name targeting (its query builder maps
 * industries, sizes and titles only), so for a client the capability does not
 * exist rather than moving to a different vendor. The route refuses; nothing is
 * silently downgraded to a different feature.
 */
export function companyNameSearchAllowed(audience: Audience): boolean {
  return audience === 'house'
}

/** The message the API returns when a client asks for company-name search. */
export const COMPANY_SEARCH_UNAVAILABLE =
  'Company-name search is not available for this account.'

// ── THE REVEAL DOOR ─────────────────────────────────────────────────────────
//
// Closing the four SEARCH doors was NOT sufficient, and independent review
// (GPT-5.6, 22 Aug) rejected the first version of this file for claiming it was.
// The header above used to say every new client lead "arrives with no
// `apollo_id`". That was wrong. A PDL lead arrives with `apollo_id = 'pdl_…'`,
// and `lead-delivery.ts` picks its reveal candidates on that column being
// TRUTHY — so a brand-new, PDL-sourced, client-owned record was still being
// handed to Apollo's paid `people/bulk_match`.
//
// The defence offered for that — "Apollo can't match a PDL id, so no credit is
// charged" — is not the standard. AR5 is a PROVIDER BOUNDARY, not a cost
// ceiling: a client's record must not be SENT to K.I.N.D's Apollo account at
// all, whatever comes back.
//
// The provenance was already correct at the writer: `pdl-search.ts` has stamped
// the `pdl_` prefix since it was written, precisely so PDL records "are never
// sent to Apollo's bulk_match". That was an ASPIRATION in a comment with no code
// behind it. This is the code.
//
// ⚠️ WHY THE GUARD IS HERE AND NOT AT THE WRITER. Nulling `apollo_id` for clients
// would look like the tidier fix, but `icps.ts` de-duplicates a client's sourcing
// runs against exactly that column — nulling it would re-insert the same person on
// every run. The column is a PROVIDER-ID column carrying a discriminating prefix,
// and the discriminator is what needed enforcing.
const PDL_ID_PREFIX = 'pdl_'

/**
 * Is this id one Apollo can be asked about? Provenance, read off the id itself.
 *
 * Deliberately a DISCRIMINATOR, not a cutover date: AR15 (founder, 21 Aug)
 * grandfathered existing client leads that carry a genuine Apollo id — they finish
 * through the path they were created under. This keeps every one of them.
 */
export function isApolloPersonId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.length > 0 && !id.startsWith(PDL_ID_PREFIX)
}

/** The subset of a reveal batch that Apollo is allowed to be shown. */
export function apolloRevealableIds(ids: Array<string | null | undefined>): string[] {
  return ids.filter(isApolloPersonId) as string[]
}

/**
 * IO — which audience does this client belong to?
 *
 * ⚠️ FAILS CLOSED TO `'client'`, AND THAT IS THE WHOLE POINT. `resolveHouseUserIds`
 * fails OPEN by design (an auth-lookup outage must not break an admin revenue
 * page — it returns an empty set and simply does not exclude the house). Inherited
 * here, that same failure would answer "not house" — which is the SAFE answer for
 * a revenue report and the SAFE answer here too, but for the opposite reason: an
 * unknown audience must never be handed K.I.N.D's Apollo credits. Both callers get
 * the fail-safe they need from one behaviour; this comment exists so nobody
 * "fixes" the resolver to throw and quietly flips that.
 *
 * Identity is the AUTH USER, never the company name — #593, after #584/#582 both
 * broke by matching an account on `MBF Holdings` vs `MBF Demo`.
 */
/**
 * IO — audience for an AUTH USER, when a route has `req.userId` and no client row.
 *
 * Used by the stateless ICP preview, which resolves no client at all. Same fail-closed
 * contract as `audienceForClient`: anything unexpected answers `'client'`.
 */
export async function audienceForUser(userId: string | undefined | null): Promise<Audience> {
  if (!userId) return 'client'
  try {
    const houseUserIds = await resolveHouseUserIds()
    return houseUserIds.has(String(userId)) ? 'house' : 'client'
  } catch (err) {
    console.warn(`[provider-boundary] audience lookup failed for user ${userId} — defaulting to client:`, err)
    return 'client'
  }
}

/**
 * Thrown when a SOURCING RUN cannot prove whose work it is about to spend money on.
 *
 * ⚠️ IT EXISTS BECAUSE THE SAFE DEFAULT IN ONE PLACE IS THE UNSAFE DEFAULT IN ANOTHER.
 * `audienceForClient` answers `'client'` on any failure — correct there, because an unknown
 * account must never be handed K.I.N.D's prepaid Apollo credits. On the sourcing path that
 * same answer selects PDL, so an auth blink moves House onto the clients' provider, spends
 * their budget doing it, and leaves nothing in the logs that reads as a decision.
 */
export class AudienceUnresolvedError extends Error {
  readonly clientId: string
  constructor(clientId: string, why: string) {
    super(
      `Could not prove which audience client ${clientId} belongs to (${why}). ` +
      'The sourcing run was stopped rather than guessing a provider — nothing was searched, ' +
      'reserved or spent. Retry once the lookup is healthy.',
    )
    this.name = 'AudienceUnresolvedError'
    this.clientId = clientId
  }
}

/** How long the strict path will wait for either lookup before it gives up LOUDLY. */
export const IDENTITY_LOOKUP_TIMEOUT_MS = 10_000

const why = (err: unknown) => (err instanceof Error ? err.message : String(err))

/**
 * A lookup that never settles is worse here than one that fails: the run neither proceeds nor
 * reports, and nothing anywhere says why. Founder rule 5 of the identity lock — *"Timeout →
 * THROW / FAIL LOUDLY"* — so every await on this path is bounded.
 */
async function bounded<T>(work: PromiseLike<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${what} did not answer within ${ms}ms`)), ms)
        ;(timer as unknown as { unref?: () => void }).unref?.()
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * AUDIENCE FOR A SOURCING RUN — POSITIVELY proved, or the run stops (founder-locked 7 Sep).
 *
 * Same question as `audienceForClient`, opposite failure direction, and BOTH are deliberate:
 * that one fails open so a reporting surface survives a blink; this one throws so money is
 * never spent on a guess. Used ONLY where a provider is about to be chosen.
 *
 * THE TRUTH TABLE, exactly as the founder locked it:
 *   · row with NULL user_id                       → client  (a seat with no auth user is not House)
 *   · auth user found, email === House            → house
 *   · auth user found, email present, not House   → client  (POSITIVELY identified)
 *   · no client row                               → THROW   (there is nothing to resolve)
 *   · client lookup errored                       → THROW   (we could not read)
 *   · identity lookup errored / threw / timed out → THROW   (we could not resolve the user)
 *   · identity lookup SUCCEEDED but returned no user, no email field, or a blank email
 *                                                 → THROW   (it did not answer the question)
 *
 * ⛓️ WHY IT ASKS `getUserById` AND NOT `resolveHouseUserIds` — THIS IS THE WHOLE FIX.
 * The first version of this function resolved the SET of House user ids and then returned
 * `'client'` whenever the user was not in it. That reads a NON-MEMBERSHIP as a positive fact,
 * and it is not one: an empty set, a truncated page and a permission-limited listing are all
 * indistinguishable from a genuine ordinary client under that test. So a lookup that succeeded
 * and established NOTHING selected PDL, on House, silently — the exact outcome this function
 * exists to prevent. The founder rejected it as a partial pass on 7 Sep:
 *
 *   "The strict sourcing path must NEVER turn an indeterminate identity result into `client`.
 *    House must NEVER silently fall to PDL."
 *
 * Asking about THE USER instead of about the set removes the inference entirely. `getUserById`
 * either returns that identity — whose own email is what House IS (#593: identity is the auth
 * user, never the company name) — or it does not, and "it does not" is now a throw.
 *
 * ⚠️ A NULL `user_id` IS AN ANSWER, NOT AN AMBIGUITY. `20260612_company_engine.sql` DROPS the
 * NOT NULL so a company seat can exist without its own auth user, and House is identified by
 * auth EMAIL — so a row with no auth user is definitively not House. An earlier version threw
 * on it and killed 74 tests across 14 files; the fixtures were right and the rule was wrong.
 * This is the ONE resolved-without-an-auth-user answer, and it is why ordinary clients — the
 * overwhelmingly normal case — are entirely unaffected by everything above.
 *
 * ⚠️ AND A MISSING EMAIL IS NOT AN EMPTY ONE. A user record that comes back without a usable
 * email cannot be compared to House in either direction, so it is indeterminate, not "not
 * House". That distinction is the difference between the partial pass and this.
 */
export async function audienceForClientStrict(
  clientId: string,
  opts?: { timeoutMs?: number },
): Promise<Audience> {
  const ms = opts?.timeoutMs ?? IDENTITY_LOOKUP_TIMEOUT_MS

  let data: { user_id?: string | null } | null
  try {
    const res = await bounded(
      db.from('clients').select('user_id').eq('id', clientId).maybeSingle(),
      ms, 'the client lookup',
    )
    if (res?.error) throw new Error(res.error.message ?? String(res.error))
    data = (res?.data ?? null) as { user_id?: string | null } | null
  } catch (err) {
    throw new AudienceUnresolvedError(clientId, `the client lookup failed — ${why(err)}`)
  }
  if (!data) throw new AudienceUnresolvedError(clientId, 'there is no client row with that id')

  // The one resolved answer that needs no auth user at all.
  if (!data.user_id) return 'client'

  const userId = String(data.user_id)
  let user: { email?: string | null } | null
  try {
    const res = await bounded(
      db.auth.admin.getUserById(userId) as PromiseLike<{
        data?: { user?: { email?: string | null } | null } | null
        error?: { message?: string } | null
      }>,
      ms, 'the identity lookup',
    )
    if (res?.error) throw new Error(res.error.message ?? String(res.error))
    user = res?.data?.user ?? null
  } catch (err) {
    throw new AudienceUnresolvedError(clientId, `the identity lookup failed — ${why(err)}`)
  }

  if (!user) {
    throw new AudienceUnresolvedError(
      clientId,
      `the identity lookup succeeded but returned no auth user for ${userId}, so neither House nor a client could be proved`,
    )
  }

  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
  if (!email) {
    throw new AudienceUnresolvedError(
      clientId,
      `auth user ${userId} came back without an email, and House is an email — so this identity is indeterminate, not "not House"`,
    )
  }

  return email === HOUSE_ACCOUNT_EMAIL ? 'house' : 'client'
}

export async function audienceForClient(clientId: string): Promise<Audience> {
  try {
    const { data, error } = await db
      .from('clients')
      .select('user_id')
      .eq('id', clientId)
      .maybeSingle()
    if (error || !data?.user_id) return 'client'

    const houseUserIds = await resolveHouseUserIds()
    return houseUserIds.has(String(data.user_id)) ? 'house' : 'client'
  } catch (err) {
    console.warn(`[provider-boundary] audience lookup failed for ${clientId} — defaulting to client:`, err)
    return 'client'
  }
}
