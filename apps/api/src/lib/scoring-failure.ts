// #477/#358 — the ONE payload written when a batch of leads can't be scored (the AI threw,
// or returned no usable scores). It must NEVER fabricate a score: null score, no fake deal
// value, scored_at null, and it deliberately does NOT set status:'scored' — so the lead is
// not delivered/charged and is picked up again by /figsy/rescore-stranded. Kept in its own
// db-free module so both scoring branches share it AND it stays unit-testable in isolation.
//
// ── ⚑ 18 Sep (J5-C8) — THE MARKER IS A CONSTANT AND THE QUESTION IS A FUNCTION ──────────
//
// The failure has always been recorded, but as PROSE inside `leads.score_reasoning`, and the
// prefix that makes it findable was spelled separately in every place that cared:
// this file wrote it, `routes/internal.ts` matched it with `.like('score_reasoning',
// 'SCORING_FAILED%')`, and any reader wanting to know had to know the wording too. One fact,
// three spellings — so rewording the sentence here would silently unhook the hourly sweeper
// that is the only thing which ever retries these leads, and nothing would fail.
//
// 🛑 AND IT LEAKED. `programme-review.ts` maps `score_reasoning` onto the approval card's
// `why_fits`, so a client reviewing their own programme was shown *"SCORING_FAILED: AI scoring
// unavailable — not a real score (retried hourly by /figsy/rescore-stranded)"* as the reason a
// prospect fitted them, on the one screen the product asks them to approve. `scoringFailed` is
// what lets every read path recognise the state instead of forwarding the sentence.

/** The prefix every recorded scoring failure starts with. The sweeper's `LIKE` derives from it. */
export const SCORING_FAILED_PREFIX = 'SCORING_FAILED'

/** The `LIKE` pattern for "this lead's scoring failed". Derived, never typed out again. */
export const SCORING_FAILED_LIKE = `${SCORING_FAILED_PREFIX}%`

/**
 * Did scoring FAIL for this lead, as recorded?
 *
 * ⚠️ `null` AND `''` ARE FALSE, AND THE DISTINCTION IS REAL. A lead nobody has scored yet has
 * no reasoning at all; a lead whose scoring failed has our marker. Both end up with no number
 * on a card — but only the second is something the sweeper must retry, and only the second
 * means a part of our own pipeline broke.
 */
export function scoringFailed(reasoning: string | null | undefined): boolean {
  return typeof reasoning === 'string' && reasoning.startsWith(SCORING_FAILED_PREFIX)
}

export function unscoredOnFailure() {
  return {
    score:                    null,
    score_reasoning:          `${SCORING_FAILED_PREFIX}: AI scoring unavailable — not a real score (retried hourly by /figsy/rescore-stranded)`,
    scored_at:                null,
    estimated_deal_value_usd: null,
  } as const
}
