// #366 — WHERE PDL GOT TO, AND WHETHER THERE IS ANYTHING LEFT.
//
// THE BUG. `pdlSearchPeople(icp, _page = 1, size = 50)` took a page number and threw it
// away — the underscore is the whole story. Every run therefore asked PDL for the SAME
// first page. Run 1 kept those people. Run 2 got the identical page back, deduped every
// one of them against the leads the client already held (`icps.ts` checks `apollo_id`),
// and inserted **nothing**. The run reported `inserted: 0` and the client read
// "no leads matched this ICP" — a sentence about their targeting that was actually a
// sentence about our paging.
//
// A client's SECOND MONTH is the business. The first month is the sale; the repeat is the
// revenue. Sourcing that structurally cannot find anybody new after month one is a churn
// machine dressed as a product.
//
// THE FIX. PDL v5 pages with `scroll_token`, not `from` (which now 400s). The response
// carries a token; passing it back returns the NEXT batch; a null token — or a 404 — means
// there is nothing after this page. So the token has to SURVIVE the run: it is stored on
// the ICP row and read back on the next one.
//
// THE TRAP THAT COMES WITH IT. A scroll token belongs to ONE QUERY. Edit the ICP — add a
// country, drop a job title — and the stored token is a cursor into a result set that no
// longer exists. Replaying it either errors or, worse, quietly returns people from the OLD
// query, which reads as a working search returning irrelevant leads. So the token is stored
// WITH a fingerprint of the query that produced it, and is discarded the moment they differ.
//
// AND THE HONESTY CLAUSE. When PDL genuinely has nobody left, that is a FACT ABOUT THE ICP
// and the client must be told it in those words — "we have reached the end of this
// audience" — not shown a zero that looks like a bad day. `never return 0 silently`.

/** The five fields that define a PDL person-search query. Change any one → new result set. */
export type CursorQuery = {
  job_titles:       string[]
  seniority_levels: string[]
  company_sizes:    string[]
  geographies:      string[]
  industries:       string[]
}

/** What the ICP row remembers between runs. */
export type StoredCursor = {
  pdl_scroll_token?: string | null
  /** Fingerprint of the query the token belongs to. */
  pdl_scroll_query?: string | null
  /** When PDL last said "nothing left" for this exact query. */
  pdl_exhausted_at?: string | null
}

/**
 * A stable fingerprint of the query.
 *
 * Sorted and lowercased so a cosmetic reorder in the portal (the client drags a job title
 * up the list) does NOT throw away a perfectly good cursor — only a real change of audience
 * does. Case-folded because the portal's checkboxes and a hand-typed title differ only in
 * capitalisation more often than they differ in meaning.
 */
export function cursorFingerprint(q: CursorQuery): string {
  const norm = (xs: string[]) => [...new Set(xs.map(s => s.trim().toLowerCase()).filter(Boolean))].sort()
  return JSON.stringify([
    norm(q.job_titles),
    norm(q.seniority_levels),
    norm(q.company_sizes),
    norm(q.geographies),
    norm(q.industries),
  ])
}

export type CursorDecision = {
  /** The token to send to PDL, or null to start from the top. */
  token: string | null
  /** True when a stored token was thrown away because the ICP changed under it. */
  reset: boolean
  /** True when PDL already told us this exact query is finished. */
  exhausted: boolean
}

/**
 * Decide what to send PDL this run.
 *
 * Three outcomes, and the difference between them is the whole feature:
 *   • a matching token      → page forward, find NEW people
 *   • a stale token         → the ICP changed; start again from page 1, which is now a
 *                             different page 1 (and clears a previous exhaustion — a wider
 *                             ICP genuinely has more people in it)
 *   • already exhausted     → do not spend a credit re-asking a question we know the answer
 *                             to; say so instead
 */
export function decideCursor(stored: StoredCursor | null | undefined, q: CursorQuery): CursorDecision {
  const fp = cursorFingerprint(q)
  const sameQuery = !!stored?.pdl_scroll_query && stored.pdl_scroll_query === fp
  if (!sameQuery) {
    // Either we have never paged this query, or the ICP was edited. Both start clean.
    return { token: null, reset: !!stored?.pdl_scroll_token || !!stored?.pdl_exhausted_at, exhausted: false }
  }
  if (stored?.pdl_exhausted_at) return { token: null, reset: false, exhausted: true }
  return { token: stored?.pdl_scroll_token ?? null, reset: false, exhausted: false }
}

/**
 * What the PROVIDER told us this run.
 *
 * ⛓️ 17 Sep (FD-6) — `cursor` is the provider-neutral name and the one `ProviderPage` uses.
 * `scrollToken` is still accepted so every historic caller and test keeps working: PDL
 * issued an opaque scroll token, Apollo pages by number, and the cursor is opaque to this
 * module either way.
 *
 * ⚠️ THE STORED COLUMN NAMES STILL SAY `pdl_`. They are database columns and renaming them
 * needs a migration nobody needs: `pdl_scroll_token` now holds an Apollo page number. The
 * name is historic, the value is current, and this note is the bridge between them.
 */
export type PageResult = { cursor?: string | null; scrollToken?: string | null; exhausted: boolean }

/**
 * The columns to write back to the ICP row after a run.
 *
 * Note it always writes the fingerprint, even on exhaustion — the fingerprint is what makes
 * the exhaustion *specific to this audience*. Without it, a client who widens their ICP
 * would stay permanently marked exhausted, which is the same silent zero from the other end.
 */
export function nextCursorState(q: CursorQuery, page: PageResult, now: string): StoredCursor {
  return {
    pdl_scroll_token: page.exhausted ? null : (page.cursor ?? page.scrollToken ?? null),
    pdl_scroll_query: cursorFingerprint(q),
    pdl_exhausted_at: page.exhausted ? now : null,
  }
}

/**
 * What the CLIENT is told when their audience runs out.
 *
 * Deliberately not an error and not an apology. Reaching the end of an audience is a normal,
 * finite fact — every ICP has a bottom — and the only useful next move is to widen it. The
 * one thing this must never read as is "something went wrong" or "you got nothing today".
 */
export function exhaustedMessage(alreadyHeld: number): string {
  const held = alreadyHeld > 0
    ? `You already have all ${alreadyHeld} of them.`
    : 'There are no more people in it.'
  return `We have reached the end of this audience — every matching person our data source holds has already been sourced for you. ${held} ` +
    'To find more, widen the ICP: add job titles, seniority levels, industries or countries.'
}

/** What the FOUNDER is told — a client who can no longer be served needs a human. */
export function exhaustedAlertLines(companyName: string, icpName: string, alreadyHeld: number): string[] {
  return [
    `${companyName || 'A client'} has exhausted the ICP "${icpName || 'unnamed'}" — the data source has nobody left who matches it.`,
    `They already hold ${alreadyHeld} lead(s) from this audience, and every future run will source ZERO until the ICP is widened.`,
    'This is not a failure — it is a finite audience reaching its end. But it does mean their next month delivers nothing unless someone helps them broaden it.',
    'Action: contact them and widen the job titles, seniority levels, industries or countries on this ICP.',
  ]
}
