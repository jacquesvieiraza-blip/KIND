// ═══════════════════════════════════════════════════════════════════════════════
// ONE PAGE OF PROVIDER RESULTS — and, more importantly, WHETHER THE SEARCH HAPPENED
//
// ── WHY THIS TYPE EXISTS SEPARATELY FROM THE CONTACTS ─────────────────────────
//
// `icps.ts` does not only count rows. It reads this shape to decide whether a ZERO is
// EVIDENCE, and that decision is the difference between two sentences a client can be told:
//
//     "No companies match your profile yet — we are widening the search."      (a fact)
//     "No companies match your profile yet — we are widening the search."      (a lie)
//
// The words are identical. The first is true when the provider answered and the answer was
// empty. The second is what a timeout, a missing key, a 5xx or an exhausted account produces
// if nobody separates "we asked and got nothing" from "we never asked".
//
// ⛓️ 17 Sep (FD-6) — THIS REPLACES `PdlPage`, WHICH WAS THE ONLY PLACE THESE FACTS LIVED.
// The type was PDL-shaped because PDL was the only provider that reported them; the Apollo
// branch of `searchPeopleWithFallback` returned `null` for every run. That meant **no client
// run could ever reach `searchTrust = 'proven'`**: every honest empty was indistinguishable
// from an outage, and the widening ladder could not tell them apart either. With Apollo as
// the only provider (FD-6), Apollo has to answer these questions, so the type stops naming
// a vendor and starts naming the facts.
//
// `PdlPage` remains a type ALIAS of this in `pdl-search.ts`, so the historic module still
// compiles without being rewritten (CORE-MAP rule 3: nothing gets deleted).
// ═══════════════════════════════════════════════════════════════════════════════

import type { ApolloContact } from './apollo'

export type ProviderName = 'apollo' | 'pdl'

export interface ProviderPage {
  /** Which vendor actually answered. Provenance, so a stored page can never be misread. */
  provider: ProviderName

  contacts: ApolloContact[]

  /**
   * Send this back next run to get the FOLLOWING people. Null = no more pages (#366).
   *
   * Opaque to every caller: PDL issued a scroll token, Apollo pages by number. A caller
   * that parses it is coupling itself to a vendor.
   *
   * ⚠️ PRESERVED ACROSS A FAILURE, NEVER CLEARED. An outage must not lose a client's place
   * in their own audience — clearing it restarts them at page 1 and re-sources people they
   * already have.
   */
  cursor: string | null

  /**
   * The provider has nobody left for this query AFTER we walked it — a fact about the ICP
   * (#366), not about us.
   *
   * ⚠️ THIS DOES NOT MEAN "ZERO RESULTS". See `matchedNothing`.
   */
  exhausted: boolean

  /**
   * ⚑ THE FIRST PAGE MATCHED NOBODY AT ALL, from a cold start. Never paged, nothing sourced,
   * ever.
   *
   * WHY IT IS A SEPARATE FIELD. PDL answered 404 for both "your query matches nobody" and
   * "you have reached the end of the results you were paging", and the old code knew which —
   * it logged the difference — then threw the knowledge away behind one `exhausted: true`.
   * A client whose brand-new refined targeting matched zero people was told *"every matching
   * person our data source holds has already been sourced for you"*, about an audience
   * nothing had ever been sourced from. That sentence was false, and it told them to widen an
   * ICP when the real answer was that we had never found anyone in it.
   *
   * The two are mutually exclusive by construction: `exhausted` requires having paged to the
   * end with something in hand, `matchedNothing` requires a cold start with nothing.
   * **Nothing downstream may collapse them again.**
   */
  matchedNothing: boolean

  /** Set when the page could not be fetched at all. Distinct from an empty page. */
  error: string | null

  /**
   * ⚑ DID THE SEARCH ACTUALLY COMPLETE? The one fact the outcome layer was missing.
   *
   * `true` ONLY when the provider gave a trustworthy answer: results, or a demonstrable
   * "nobody matches", or a demonstrable "you have them all". Every other exit — no API key,
   * timeout, 5xx, auth failure, rate limit, malformed body, out of credits — is `false`,
   * because we do not know what this query would have returned.
   *
   * ⚠️ `error === null` IS NOT THE SAME TEST, which is exactly how the false `no_match`
   * survived: the no-key exit returned `error: null` and its own comment said "we never
   * asked, we cannot claim the audience is finished" — and then returned a shape from which
   * precisely that claim was derived. **An empty page is not evidence of an empty audience.**
   */
  completed: boolean
}
