// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CUSTOMER'S PROGRAMME REVIEW SET — ONE READ, POSITIVELY SCOPED TO ONE PROGRAMME
//
// ── WHAT WAS BROKEN ─────────────────────────────────────────────────────────────────────
//
// `/leads/for-approval` is `client_id` + four review conditions and **no `programme_id`**. For
// a client with history that is not a near-miss, it is the wrong set: House carries ~166 leads
// from a retired legacy desk, every one `programme_id = NULL`, and every one delivered and
// surfaced years-of-product ago. Ask that route what a House programme customer should review
// and it answers with the retired desk mixed into the new programme's work.
//
// The customer would then approve a programme having reviewed people the programme never
// sourced — and A2 already proved the mirror of this on the way out: outreach may only reach
// somebody who was genuinely surfaced. This is the same invariant on the way IN.
//
// ── WHAT THIS IS ────────────────────────────────────────────────────────────────────────
//
// The four review conditions are NOT re-invented here. They are lifted verbatim from
// `/leads/for-approval`, which is the route that already defines "what a customer can review":
//
//   • `delivered_at IS NOT NULL`              we have a contactable person
//   • `surfaced_for_approval_at IS NOT NULL`  #493 — an operator actually Sent it to them
//   • `revealed_at IS NULL`                   not already disposed of through the legacy path
//   • `status != 'passed'`                    they have not already said no to this one
//
// What is ADDED is the one thing that route cannot express: **`programme_id = this programme`**
// — positive attribution, the same rule every send layer and `markReadyForApproval` already
// use. Work that cannot name its programme is history, and history is not a new programme's
// review set.
//
// ⚠️ AND `client_id` IS STILL APPLIED, ALONGSIDE the programme. Either alone would be a hole:
// `client_id` alone is the defect above; `programme_id` alone would trust a programme id the
// caller supplied. Both, always, on the same query.
//
// 🛑 THIS READ IS COMPLETELY MASKED, exactly like `/leads/for-approval`. Name, email, phone and
// LinkedIn never leave the server — the customer is reviewing WHO WILL BE WORKED, not buying a
// contact. The programme has already been paid for; there is nothing here to unlock.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

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
  /** The masked prospects the customer may review for THIS programme. */
  prospects: ReviewProspect[]
  /** How many matched the review conditions in total (the page is capped). */
  total: number
}

/** How many cards one review page returns. The same cap `/leads/for-approval` uses. */
export const REVIEW_PAGE = 50

/**
 * Scrub the prospect's own name out of the "why it fits" sentence.
 *
 * ⚠️ LIFTED FROM `/leads/for-approval` RATHER THAN REIMPLEMENTED, because the scoring prompt is
 * fed the lead's name and the reasoning often echoes it. A masked card whose explanation names
 * the person is not masked. Two copies of this could drift, and the one that drifted would be
 * the leak — so if this ever grows a third caller it moves to one shared module.
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

/**
 * The prospects a customer may review for one programme.
 *
 * ⚠️ THROWS ON A READ ERROR, and does not return an empty set. An empty review set is a
 * meaningful product state — it BLOCKS approval (see `approveProgrammeAsCustomer`) — so a
 * failed read that returned `[]` would be indistinguishable from "this programme genuinely has
 * nothing", and would turn a database hiccup into a refusal the customer cannot explain. The
 * `?? []` reflex is the defect this comment exists to prevent.
 */
export async function readProgrammeReviewSet(
  clientId: string, programmeId: string,
): Promise<ReviewSet> {
  const { data, error, count } = await db.from('leads')
    // first/last name are read SERVER-SIDE ONLY — never returned — so `why_fits` can be
    // scrubbed of them before it leaves this function.
    .select(
      'id, first_name, last_name, job_title, company, industry, country, score, score_reasoning, created_at, surfaced_for_approval_at',
      { count: 'exact' },
    )
    // ── TENANCY AND ATTRIBUTION, BOTH, ALWAYS ──────────────────────────────────────────
    .eq('client_id', clientId)
    // 🛑 POSITIVE PROGRAMME ATTRIBUTION. This single line is what keeps House's ~166 retired
    // NULL-programme leads out of a new programme's review set. `programme_id IS NULL` does
    // not equal this id, so those rows cannot match — there is no "unattributed means mine"
    // reading of an equality test.
    .eq('programme_id', programmeId)
    // ── THE FOUR EXISTING REVIEW CONDITIONS, VERBATIM FROM `/leads/for-approval` ────────
    .not('delivered_at', 'is', null)
    .not('surfaced_for_approval_at', 'is', null)
    .is('revealed_at', null)
    .neq('status', 'passed')
    .order('score', { ascending: false, nullsFirst: false })
    .limit(REVIEW_PAGE)
  if (error) throw new Error(`programme review read failed: ${error.message}`)

  const rows = (data ?? []) as Record<string, unknown>[]
  const prospects: ReviewProspect[] = rows.map(l => ({
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
  }))

  // ⚠️ `count` IS THE MATCHING TOTAL, NOT THE PAGE. A programme of 2,500 shows 50 cards and
  // must still say 2,500 — telling a customer they are approving 50 people when the programme
  // will work 2,500 is a smaller lie than the empty desk, and still a lie.
  return { prospects, total: count ?? prospects.length }
}

/**
 * Does this programme have real reviewable work RIGHT NOW?
 *
 * ⚠️ SEPARATE FROM THE PAGE READ, and deliberately a head count: approval must be gated on the
 * whole matching population, never on whichever 50 rows the page happened to return. It is the
 * SAME predicate — if these two could disagree, a customer could be shown cards they cannot
 * approve, or approve a programme whose desk is empty.
 *
 * Throws on a read error for the same reason as above: "we cannot tell" is not "there is
 * nothing", and it must never become a silent approval.
 */
export async function countProgrammeReviewable(
  clientId: string, programmeId: string,
): Promise<number> {
  const { count, error } = await db.from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('programme_id', programmeId)
    .not('delivered_at', 'is', null)
    .not('surfaced_for_approval_at', 'is', null)
    .is('revealed_at', null)
    .neq('status', 'passed')
  if (error) throw new Error(`programme reviewable count failed: ${error.message}`)
  return count ?? 0
}
