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
