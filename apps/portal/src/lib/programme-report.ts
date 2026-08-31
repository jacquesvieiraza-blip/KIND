// ═══════════════════════════════════════════════════════════════════════════════════════
// WHAT THE REPORTING PAGES ARE ALLOWED TO SAY — one read, one set of rules, executable.
//
// ⚑ 31 Aug (BUILD-004A-2C). Reports, Performance, Analytics and Your ROI all answer questions
// about the same programme. Four pages each deciding for themselves what counts as "activity"
// is four chances to disagree on one screen — which is the exact shape of every live-walk
// finding in this build (a campaign row saying "Paused" beside a programme at Proof; a
// formatter rounding two halves to a total that did not add up).
//
// ⚠️ PLAIN TS, NO JSX, ON PURPOSE. The rules below are decisions about what is TRUE, and the
// suite has to be able to RUN them. A guard that reads a component as a string cannot tell
// "shows zero replies" from "shows nothing because outreach has not started" — and that
// distinction is most of this slice.
// ═══════════════════════════════════════════════════════════════════════════════════════

import type { MillaStage } from '@kind/shared'

/**
 * Stages at which outreach can have produced anything.
 *
 * ⚠️ OUTREACH IS AUTHORISED BY PAYMENT 2, which lands at Approval → Live. Before that, a reply
 * or meeting count belongs to legacy history or another programme — either way it is not this
 * programme's work, and showing it as such is a false claim about what we did for them.
 */
export const OUTREACH_STAGES: MillaStage[] = ['Live', 'Review', 'Completion']

/** Stages at which sourcing can have happened — authorised by Payment 1. */
export const SOURCING_STAGES: MillaStage[] = ['Sourcing', 'Approval', ...OUTREACH_STAGES]

export function outreachHasRun(stage: MillaStage): boolean {
  return OUTREACH_STAGES.includes(stage)
}

export function sourcingHasRun(stage: MillaStage): boolean {
  return SOURCING_STAGES.includes(stage)
}

/**
 * 🛑 CAN WE STATE A RETURN ON THIS PROGRAMME?
 *
 * NO — and this function exists to make that answer impossible to route around.
 *
 * A return needs what the programme was worth TO THE CUSTOMER: deal value, close rate,
 * revenue attributed to a meeting we booked. **The product holds none of that.** Nobody has
 * ever asked a client what a meeting is worth to them, and no column stores it.
 *
 * ⚠️ WHAT THE ROI PAGE WAS DOING INSTEAD, and this is the finding of the slice. Its hero card
 * read "Pipeline value touched", from `/leads/stats.pipeline_value_usd`, which sums
 * `leads.estimated_deal_value_usd` — a column written at `lib/scoring.ts:221` as:
 *
 *     estimated_deal_value_usd: r.score * 100
 *
 * The lead's FIT SCORE multiplied by one hundred. A prospect scored 85 became "$8,500 of
 * pipeline". Summed across a client's leads and printed as the headline of the page called
 * "What K.I.N.D did for you". It is not a measurement of anything; it is the scoring model
 * wearing a currency symbol.
 *
 * ⚠️ AND IT WOULD CONTRADICT MILLA. Asked about ROI on the House walk she correctly said she
 * needs a target outcome to measure against. A page claiming a return while she says she
 * cannot compute one is the product disagreeing with itself in front of the customer.
 */
export function canComputeRoi(): false {
  return false
}

/**
 * Inputs a real return would need. Kept as a list so "we don't have it" is specific.
 *
 * ⛓️ 31 Aug — "worth to THEM" → "worth to YOU" (founder). These were written as a note about
 * a customer and are READ BY that customer: the third person turned a plain admission into
 * something overheard. The meaning is unchanged and nothing was added.
 */
export const ROI_MISSING_INPUTS = [
  'what a booked meeting is worth to you',
  'how many of those meetings become customers',
  'revenue attributed to a meeting we booked',
] as const
