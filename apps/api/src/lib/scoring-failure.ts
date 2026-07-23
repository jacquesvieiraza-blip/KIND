// #477/#358 — the ONE payload written when a batch of leads can't be scored (the AI threw,
// or returned no usable scores). It must NEVER fabricate a score: null score, no fake deal
// value, scored_at null, and it deliberately does NOT set status:'scored' — so the lead is
// not delivered/charged and is picked up again by /figsy/rescore-stranded. Kept in its own
// db-free module so both scoring branches share it AND it stays unit-testable in isolation.
export function unscoredOnFailure() {
  return {
    score:                    null,
    score_reasoning:          'SCORING_FAILED: AI scoring unavailable — not a real score (retried hourly by /figsy/rescore-stranded)',
    scored_at:                null,
    estimated_deal_value_usd: null,
  } as const
}
