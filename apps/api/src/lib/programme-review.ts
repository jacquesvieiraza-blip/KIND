// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CUSTOMER'S PROGRAMME REVIEW SET — ONE READ, POSITIVELY SCOPED, AND ACTUALLY WORKABLE
//
// ── ① THE SCOPING DEFECT ────────────────────────────────────────────────────────────────
//
// `/leads/for-approval` is `client_id` + four review conditions and **no `programme_id`**. For
// a client with history that is the wrong set: House carries ~166 leads from a retired legacy
// desk, every one `programme_id = NULL`, delivered and surfaced long ago. Ask that route what a
// House programme customer should review and it answers with the retired desk mixed in.
//
// ── ② THE SUPPRESSION DEFECT — AND IT WAS THE MORE DANGEROUS OF THE TWO ─────────────────
//
// ⛓️ THE FIRST VERSION OF THIS FILE COPIED `/leads/for-approval`'s four conditions verbatim and
// STOPPED THERE — `delivered_at`, `surfaced_for_approval_at`, `revealed_at IS NULL`,
// `status != 'passed'`. I then described that predicate as excluding opted-out, rejected and
// bounced prospects. **It excludes none of them.** `status != 'passed'` is one status, not a
// suppression rule, and nothing in those four conditions consults an email, an opt-out stamp,
// a provider eviction or the blocklist.
//
// 🛑 AND THE STATES ARE REACHABLE, NOT THEORETICAL. `surfaceEverything` (`start-work.ts`) is
// what writes both stamps, and its own selection is `client_id` + not-surfaced + not-revealed +
// `status != 'passed'` — **no email filter and no suppression filter of any kind.** So an
// opted-out person, somebody with no address at all, somebody we owe a provider removal for, or
// somebody who hard-bounced through another client is surfaced and delivered exactly like
// anybody else, and would have appeared on the customer's review desk.
//
// The founder's invariant: **a programme must not be customer-approved solely because the
// review desk contains records already known to be permanently ineligible for programme
// outreach.** With the four-condition predicate, a desk of 200 opted-out people counted as 200
// reviewable prospects and would have satisfied the approval gate.
//
// ── WHAT THE PREDICATE IS NOW ───────────────────────────────────────────────────────────
//
// The review desk is **the population A2 preparation will actually work**, and not one row
// more. No new suppression semantics are invented here — every condition below is lifted from
// `prepareProgrammeOutreach`'s existing eligibility filter, which is the definition of "a
// programme prospect we can legitimately work":
//
//   · `programme_id` = this programme          positive attribution (the send layers' own rule)
//   · `client_id`    = this client             tenancy, on the same query, always
//   · `delivered_at IS NOT NULL`               we have a contactable person
//   · `surfaced_for_approval_at IS NOT NULL`   #493 — an operator actually Sent it to them
//   · `revealed_at IS NULL`                    not already disposed of through the legacy path
//   · status NOT IN (passed, rejected, opted_out)   the client or the engine disposed of it
//   · `opted_out_at IS NULL`                   the person asked us to stop
//   · `provider_eviction_required_at IS NULL`  we owe a provider a removal for this person
//   · `email IS NOT NULL`                      nothing can ever be sent to them
//   · not on `opt_out_blocklist`               hard bounce · spam complaint · cross-client STOP
//
// ⚠️ AND NOTHING SEND-TIME IS DUPLICATED IN HERE, deliberately. Mailbox caps, warm-up, PECR,
// launch-country holds and the kill switches are properties of a SEND, not of a prospect: they
// change by the hour, they are re-asked on every send, and freezing one into a review desk
// would tell a customer a person is unusable when they are merely not sendable today. Every
// condition above is a PERMANENT, PROSPECT-LEVEL fact.
//
// ── ONE PREDICATE, TWO CALLERS ──────────────────────────────────────────────────────────
//
// 🛑 THE DESK AND THE APPROVAL GATE RUN THE SAME FUNCTION. Not "the same conditions written
// twice" — the same function, so they cannot drift. If they could disagree, a customer could be
// shown cards they cannot approve, or approve a programme whose desk is empty.
//
// 🛑 THIS READ IS COMPLETELY MASKED. Name, email, phone and LinkedIn never leave the server.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { normalizeRevealEmail, normalizeRevealEmails } from './billing-rules'

/** One masked prospect card. No identity field exists on this type, by construction. */
export type ReviewProspect = {
  id: string
  role: string
  company: string
  industry: string | null
  country: string | null
  score: number | null
  why_fits: string | null
  created_at: string | null
  /** Which batch, never who — the same timestamp discriminator the lead desk already returns. */
  surfaced_for_approval_at: string | null
}

export type ReviewSet = {
  /** The masked prospects the customer may review, best-scoring first. */
  prospects: ReviewProspect[]
  /** Eligible prospects found. `complete === false` means "at least this many". */
  total: number
  /** Did the scan see the whole programme, or stop at its budget? */
  complete: boolean
}

/** How many cards one review page shows. The same cap `/leads/for-approval` uses. */
export const REVIEW_PAGE = 50
/** Rows per scan page. Keyset on `id`, so pages cannot overlap or skip. */
const SCAN_PAGE = 500
/**
 * How many rows one review scan will read.
 *
 * ⚠️ DELIBERATELY THE SAME NUMBER AS A2's `PREPARE_BUDGET`. The desk and the preparation run
 * describe the same population, so a review that could see further than preparation — or less
 * far — would be describing a different programme from the one that gets worked.
 */
export const REVIEW_SCAN_BUDGET = 5000

/**
 * Statuses that permanently disqualify a prospect.
 *
 * ⚠️ NOT INVENTED HERE — this is `prepareProgrammeOutreach`'s own list. `passed` is the customer
 * saying no, `rejected` is the engine disqualifying it, `opted_out` is the person asking us to
 * stop. None of the three can ever become programme outreach, so none belongs on a review desk.
 */
export const REVIEW_SUPPRESSED_STATUSES = ['passed', 'rejected', 'opted_out'] as const

/**
 * Scrub the prospect's own name out of the "why it fits" sentence.
 *
 * ⚠️ THE SCORING PROMPT IS FED THE LEAD'S NAME and the reasoning often echoes it. A masked card
 * whose explanation names the person is not masked.
 */
function scrub(why: string | null, first: string | null, last: string | null): string | null {
  if (!why) return null
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let out = why
  const toks = [first && last ? `${first} ${last}` : null, first, last]
    .filter((t): t is string => !!t && t.trim().length > 1)
  for (const t of toks) out = out.replace(new RegExp(`\\b${esc(t.trim())}\\b`, 'gi'), 'this prospect')
  return out
}

type ScanRow = Record<string, unknown>

/**
 * ── THE ONE PREDICATE ───────────────────────────────────────────────────────────────────
 *
 * Every eligible prospect for this programme, up to `stopAfter`, scanned within the budget.
 *
 * ⚠️ THROWS ON ANY READ ERROR, INCLUDING THE BLOCKLIST. An empty review set BLOCKS approval, so
 * a failed read that returned `[]` would be indistinguishable from "this programme genuinely
 * has nobody" — turning a database hiccup into a refusal nobody can explain. And a failed
 * BLOCKLIST read must never resolve to "nobody is suppressed": not knowing whether somebody
 * opted out is not permission to put them on a review desk. The `?? []` reflex is the defect
 * this comment exists to prevent, and it is fail-closed in both directions.
 */
async function scanEligible(
  clientId: string, programmeId: string, stopAfter: number,
): Promise<{ rows: ScanRow[]; complete: boolean }> {
  const out: ScanRow[] = []
  // ⛓️ 9 Sep — `null`, NOT `''`, AND IT IS THE SAME BUG THAT BROKE THE HOUSE QUALIFY IN
  // PRODUCTION. `leads.id` is `uuid`, so a first page asking for `id > ''` fails the cast
  // before any row is considered: *invalid input syntax for type uuid: ""*. An empty string is
  // not a cursor, it is the ABSENCE of one — and the predicate is now omitted rather than sent
  // empty. This desk had never been exercised on a programme, so nothing had found it here yet.
  let after: string | null = null
  let budget = REVIEW_SCAN_BUDGET
  // A page bound as well as a row budget: a cursor that failed to advance would spin forever.
  let pagesLeft = Math.ceil(REVIEW_SCAN_BUDGET / SCAN_PAGE) + 2

  for (;;) {
    if (budget <= 0 || pagesLeft-- <= 0) return { rows: out, complete: false }

    const base = db.from('leads')
      // first/last name are read SERVER-SIDE ONLY — never returned — so `why_fits` can be
      // scrubbed of them before it leaves this module.
      .select('id, first_name, last_name, job_title, company, industry, country, score, score_reasoning, created_at, surfaced_for_approval_at, email')
      // ── TENANCY AND ATTRIBUTION, BOTH, ALWAYS ────────────────────────────────────────
      .eq('client_id', clientId)
      // 🛑 POSITIVE PROGRAMME ATTRIBUTION — what keeps House's ~166 retired NULL-programme
      // leads out. `programme_id IS NULL` does not equal this id; there is no "unattributed
      // means mine" reading of an equality test.
      .eq('programme_id', programmeId)
      // ── REVIEWABILITY ────────────────────────────────────────────────────────────────
      .not('delivered_at', 'is', null)
      .not('surfaced_for_approval_at', 'is', null)
      // ⚑ 9 Sep (HOUSE-009) — the desk is the population preparation will actually work, and
      // preparation now requires M&V's passing verdict. Without this the two could disagree:
      // a customer would be shown a card they could approve and nothing could ever enrol.
      .not('qualified_at', 'is', null)
      .is('disqualified_at', null)
      .is('revealed_at', null)
      // ── PERMANENT PROSPECT-LEVEL SUPPRESSION, FROM A2's OWN ELIGIBILITY RULE ─────────
      .not('status', 'in', `(${REVIEW_SUPPRESSED_STATUSES.join(',')})`)
      .is('opted_out_at', null)
      .is('provider_eviction_required_at', null)
      .not('email', 'is', null)
    const { data, error } = await (after === null ? base : base.gt('id', after))
      .order('id', { ascending: true })
      .limit(SCAN_PAGE)
    if (error) throw new Error(`programme review read failed: ${error.message}`)

    const page = (data ?? []) as ScanRow[]
    if (page.length === 0) return { rows: out, complete: true }
    after = String(page[page.length - 1].id)
    budget -= page.length

    // 🛑 THE CROSS-CLIENT BLOCKLIST — hard bounce, spam complaint, and anyone who said STOP
    // through any client. It does not live on the lead row, so no column filter can reach it.
    // ⚠️ NORMALISED, NOT `.toLowerCase()` — HC-1. The blocklist is deduped on a normalised
    // address, so a raw comparison misses a case- or dot-variant of somebody who opted out.
    const reviewEmails = normalizeRevealEmails(page.map(r => r.email as string | null))
    const blocked = new Set<string>()
    if (reviewEmails.length > 0) {
      const { data: bl, error: blErr } = await db.from('opt_out_blocklist')
        .select('email').in('email', reviewEmails)
      if (blErr) throw new Error(`programme review read failed: opt-out blocklist unreadable (${blErr.message})`)
      for (const b of (bl ?? []) as { email: string | null }[]) {
        const k = normalizeRevealEmail(b.email)
        if (k) blocked.add(k)
      }
    }

    for (const r of page) {
      const k = normalizeRevealEmail(r.email as string | null)
      if (k && blocked.has(k)) continue
      out.push(r)
      if (out.length >= stopAfter) return { rows: out, complete: false }
    }

    if (page.length < SCAN_PAGE) return { rows: out, complete: true }
  }
}

/** Map an eligible row to its masked card. The email is dropped here and never leaves. */
function toCard(l: ScanRow): ReviewProspect {
  return {
    id: l.id as string,
    role: (l.job_title as string | null) ?? 'Decision-maker',
    company: (l.company as string | null) ?? '—',
    industry: (l.industry as string | null) ?? null,
    country: (l.country as string | null) ?? null,
    score: (l.score as number | null) ?? null,
    why_fits: scrub(
      (l.score_reasoning as string | null) ?? null,
      (l.first_name as string | null) ?? null,
      (l.last_name as string | null) ?? null,
    ),
    created_at: (l.created_at as string | null) ?? null,
    surfaced_for_approval_at: (l.surfaced_for_approval_at as string | null) ?? null,
  }
}

/**
 * The prospects a customer may review for one programme.
 *
 * ⚠️ THE SCAN IS ORDERED BY `id` AND THE CARDS ARE ORDERED BY SCORE. Keyset pagination needs a
 * stable unique key and `score` is neither (nullable, ties common) — so the scan pages on `id`
 * and the ranking is applied to what it found. The old single-page `.order('score')` chose
 * which rows were SEEN by score, which is a different and wrong thing.
 */
export async function readProgrammeReviewSet(
  clientId: string, programmeId: string,
): Promise<ReviewSet> {
  const { rows, complete } = await scanEligible(clientId, programmeId, REVIEW_SCAN_BUDGET)
  const ranked = [...rows].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
  return { prospects: ranked.slice(0, REVIEW_PAGE).map(toCard), total: rows.length, complete }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 11 Sep (DAY 3) — THE FROZEN SET, ALL OF IT, READ FROM THE FREEZE
//
// ── 🛑 THE TWO DEFECTS ABOVE THIS LINE ──────────────────────────────────────────────────
//
// ① THE CLIENT WAS SHOWN A LIVE RECOMPUTATION AND ASKED TO APPROVE A FREEZE. Everything above
//    re-runs the eligibility predicate against `leads` at the moment of the read. That is the
//    right definition of "who could be worked", and it is NOT what the client is approving: the
//    approved audience is `enrolled_lead_ids` inside the frozen snapshot. The two were allowed
//    to differ — a prospect enrolled at freeze time who was later marked `passed` vanished from
//    the screen while remaining in the package, and one who became eligible afterwards appeared
//    on the screen while being in no package at all. `reviewDrift` catches the package moving;
//    nothing caught the SCREEN describing a different set from the package.
//
// ② `REVIEW_PAGE = 50` WITH A LARGER `total` IS A VIEW-ALL THAT VIEWS NOTHING. The route
//    returned the top 50 cards and a total of, say, 250, and there was no parameter anywhere
//    that could fetch cards 51–250. A client asked to approve 250 people could see 50 of them.
//
// ── HOW IT PAGES, AND WHY IN TWO READS ──────────────────────────────────────────────────
//
// The frozen id list is the population, so the total is `ids.length` — exact, never a floor.
// Ranking is best-scoring first, which must be STABLE ACROSS PAGES, so the whole set's scores
// are read first (id and score only, in chunks) and ranked once; the page's full cards are then
// read for the ~50 ids that survive. Ordering inside a single page would put the same prospect
// on two pages and none on a third.
//
// 🛑 TENANCY IS RE-ASSERTED EVEN THOUGH THE IDS CAME FROM OUR OWN SNAPSHOT. A corrupted or
// mis-attributed snapshot must not be able to turn into a read of another client's people, and
// the cost of the extra predicate is nothing.
//
// ⚠️ AN ID IN THE FREEZE WITH NO ROW BEHIND IT IS REPORTED, NOT DROPPED. It still counts toward
// the total, because the package contains it; silently shrinking the set would be the screen
// disagreeing with the package all over again.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** How many ids one ranking chunk asks for. Keeps the request URL well inside every limit. */
const RANK_CHUNK = 400

export type FrozenReviewPage = {
  /** The cards for this page, best-scoring first across the WHOLE frozen set. */
  prospects: ReviewProspect[]
  /** The exact size of the frozen set. Never a floor — the freeze is a finite list. */
  total: number
  /** Where this page starts. */
  offset: number
  /** Ids in the frozen package with no readable lead row behind them. */
  missing: number
}

export async function readFrozenReviewPage(
  clientId: string, programmeId: string, frozenLeadIds: readonly string[],
  offset: number, limit: number,
): Promise<FrozenReviewPage> {
  const ids = [...new Set(frozenLeadIds.filter(v => typeof v === 'string' && v.length > 0))]
  const total = ids.length
  const start = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0
  const size = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), REVIEW_PAGE) : REVIEW_PAGE
  if (total === 0) return { prospects: [], total: 0, offset: start, missing: 0 }

  // ── ① RANK THE WHOLE SET ONCE ────────────────────────────────────────────────────────
  const scored: { id: string; score: number }[] = []
  const found = new Set<string>()
  for (let i = 0; i < ids.length; i += RANK_CHUNK) {
    const chunk = ids.slice(i, i + RANK_CHUNK)
    const { data, error } = await db.from('leads')
      .select('id, score').eq('client_id', clientId).eq('programme_id', programmeId).in('id', chunk)
    // ⚠️ THROWS. A failed read here would silently shrink the approved audience on screen, which
    // is the exact class of lie `?? []` produces everywhere else in this file's history.
    if (error) throw new Error(`frozen review read failed: ${error.message}`)
    for (const r of (data ?? []) as { id: string; score: number | null }[]) {
      found.add(r.id)
      scored.push({ id: r.id, score: Number(r.score ?? 0) })
    }
  }
  // Ties broken by id so the order is total and identical on every request.
  scored.sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

  const pageIds = scored.slice(start, start + size).map(r => r.id)
  if (pageIds.length === 0) {
    return { prospects: [], total, offset: start, missing: total - found.size }
  }

  // ── ② READ THE PAGE'S CARDS ──────────────────────────────────────────────────────────
  const { data: rows, error: rowErr } = await db.from('leads')
    .select('id, first_name, last_name, job_title, company, industry, country, score, score_reasoning, created_at, surfaced_for_approval_at')
    .eq('client_id', clientId).eq('programme_id', programmeId).in('id', pageIds)
  if (rowErr) throw new Error(`frozen review read failed: ${rowErr.message}`)

  const byId = new Map<string, ScanRow>()
  for (const r of (rows ?? []) as ScanRow[]) byId.set(String(r.id), r)
  const prospects = pageIds.map(id => byId.get(id)).filter((r): r is ScanRow => !!r).map(toCard)

  return { prospects, total, offset: start, missing: total - found.size }
}

/**
 * Does this programme have real reviewable work RIGHT NOW?
 *
 * 🛑 IT IS THE SAME FUNCTION THE DESK RUNS, stopped at the first hit. Not "the same conditions"
 * — the same code — so the gate and the desk cannot answer differently about one prospect.
 *
 * ⚠️ IT RETURNS 0 OR 1, NOT A TOTAL, and the caller only asks `> 0`. Counting the whole
 * population to answer "is there at least one" would read up to 5,000 rows and ten blocklist
 * queries on every approval click, for a number nothing uses.
 */
export async function countProgrammeReviewable(
  clientId: string, programmeId: string,
): Promise<number> {
  const { rows } = await scanEligible(clientId, programmeId, 1)
  return rows.length
}
