// ═══════════════════════════════════════════════════════════════════════════════════════
// WHOSE WEBSITE REACHES THE CLIENT ROW AT PROMOTION — the pure decision. (S1-AUDIT-002.)
//
// ── THE DEFECT THIS FIXES ──────────────────────────────────────────────────────────────
//
// Brief fact #3 is founder-locked as "website/domain OR explicit none". The first cut of the
// server-owned promotion recognised that `website_none` exists, but did only this:
//
//     ~~const site = text(draftFacts.website)~~
//     ~~if (site && /^https?:\/\//i.test(site)) profileFields.website = site~~
//
// Two ways the browser stayed the authority for a fact the client had already confirmed:
//
//   ① EXPLICIT NONE LOST. A confirmed brief saying "we have no website" set nothing, so a
//      stale or contradictory `website` in the request body survived untouched and was
//      written to the promoted client. The client agreed to "no website"; the row said
//      otherwise, sourced from component state the client never saw.
//   ② A DOMAIN WITHOUT A SCHEME LOST. A client who answered "redmayne.co.uk" holds the fact
//      — `briefFactValues` counts any non-empty string, and the locked wording says DOMAIN —
//      but the `^https?://` test rejected it, so the body's different value won there too.
//
// Both are the same bug as the one S1-AUDIT-002 was opened for, surviving inside its own fix.
//
// ── WHY THIS FILE IS PURE ──────────────────────────────────────────────────────────────
//
// The decision is four-way (draft address · draft explicit none · draft silent · no draft at
// all) and each branch has a wrong answer that either loses a confirmed fact or lets the
// browser reintroduce one. A pure function can be driven through every combination with no
// database, no Express and no mocks — so the states that matter are the states the tests
// visit most, and the route keeps one line instead of a branch nobody can exercise.
//
// 🛑 THE INVARIANT: THE CONFIRMED SERVER-SIDE BRIEF IS THE AUTHORITY. The browser may not
// override, reintroduce or lose a fact the client confirmed.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Exactly the two draft fields that answer fact #3. Nothing else is consulted. */
export interface PromotionWebsiteFacts {
  website?: string | null
  website_none?: boolean | null
}

/**
 *   draft_value — the confirmed brief holds an address. It wins over the body, always.
 *   draft_none  — the confirmed brief says explicitly "no website". Persist NOTHING, and
 *                 persist it POSITIVELY (see `website: null` below).
 *   body        — there is no confirmed draft, or the draft is silent on this fact. Today's
 *                 path, untouched: whatever the caller sent stands.
 */
export type OwnedWebsiteSource = 'draft_value' | 'draft_none' | 'body'

export interface OwnedWebsite {
  source: OwnedWebsiteSource
  /**
   * What to persist.
   *
   * ⚠️ `null` IS NOT `undefined` HERE, AND THE DIFFERENCE IS THE WHOLE FIX. `undefined` is
   * dropped by JSON serialisation, so on the UPDATE branch of a re-onboarding it leaves any
   * stale `clients.website` exactly where it is — which is precisely how a contradicted value
   * survives. An explicit `null` clears it. "No website" has to be written, not omitted.
   */
  website: string | null | undefined
}

/** An address already carrying its transport. */
const SCHEMED = /^https?:\/\//i

/**
 * A bare domain, optionally with a path: labels of letters/digits/hyphens separated by dots,
 * at least two labels. Deliberately strict — anything with whitespace, an `@`, another scheme
 * or no dot at all is NOT an address.
 */
const BARE_DOMAIN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:\/[^\s]*)?$/i

/**
 * The draft's website as something storable, or null when the draft holds no address.
 *
 * ⚠️ A BARE DOMAIN IS PROMOTED TO `https://`, AND THAT IS NOT INVENTING A WEBSITE. The locked
 * fact is "website/DOMAIN or explicit none", so a client who said "redmayne.co.uk" answered
 * it. The scheme is transport, not content: nothing about which site is being named is
 * guessed. Rejecting it instead — as the struck `^https?://` test did — silently handed the
 * fact back to the browser, which is the defect.
 *
 * ⚠️ AND ANYTHING THAT IS NOT AN ADDRESS RETURNS null RATHER THAN BEING REPAIRED. A draft
 * holding "not sure yet" or "ask Ellis" is a fact the counter considers held and this function
 * considers unusable; it falls through to `website_none`, and failing that to the body —
 * exactly today's behaviour. We never fabricate a URL out of prose.
 */
export function draftWebsiteAddress(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim()
  if (v === '') return null
  if (SCHEMED.test(v)) return /\s/.test(v) ? null : v
  if (BARE_DOMAIN.test(v)) return `https://${v}`
  return null
}

/**
 * 🛑 WHOSE WEBSITE WINS. One place, four outcomes, no caller judgement.
 *
 * ⚠️ AN ADDRESS BEATS AN EXPLICIT NONE, and that ordering is not arbitrary — it is the same
 * precedence the canonical counter already applies in `briefFactValues`:
 *
 *     website: trimmed(input.website) || (input.websiteNone === true ? 'they have no website' : '')
 *
 * A draft carrying both is contradictory (Milla should never write both), and the two readers
 * must not resolve that contradiction differently, or the gate and the write disagree again.
 *
 * ⚠️ `website_none` MUST BE EXACTLY `true`. `null`, `undefined` and `false` are not an answer
 * — the same rule `briefFactValues` applies — so a draft that merely never mentioned a website
 * falls back to the body rather than erasing it.
 */
export function resolveOwnedWebsite(
  facts: PromotionWebsiteFacts | null | undefined,
  bodyWebsite: string | undefined,
): OwnedWebsite {
  // No confirmed, unpromoted draft: a legacy client re-onboarding, an operator-created
  // account, every pre-draft journey. Nothing is owned and nothing changes.
  if (!facts) return { source: 'body', website: bodyWebsite }

  const address = draftWebsiteAddress(facts.website)
  if (address) return { source: 'draft_value', website: address }

  if (facts.website_none === true) return { source: 'draft_none', website: null }

  return { source: 'body', website: bodyWebsite }
}
