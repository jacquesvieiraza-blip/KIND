// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 · Coaching #2490 · #2493 · #2499) — THE CLIENT'S PLAN, IN PLAIN WORDS.
//
// One card on the existing Programme screen (R167): the plan's name, its promise in the founder's
// own words, the price per qualified meeting, what it includes, and whether Full Coaching is on.
// The review kept the founder's promises and dropped the internal words — no "Product", no
// "Included sub-products", and never "Expansion Engine" (that is our machinery, not something a
// client buys, #2499).
//
// 🛑 EVERY PRICE IS INTERPOLATED FROM `@kind/shared` (`BAND_PRICE_PER_MEETING_USD`), never typed —
// the same constant the 25/50/75% moment reads, so the two cannot show different prices. The size
// range comes from `SIZE_BANDS`. No pool, no limit, no sourcing figure (R136).
//
// ⚠️ ONLY WHAT IS BUILT IS LISTED (R87 · the R181 rule the website keeps). The rows are the
// website's own "Compare what each plan includes" wording, so the site and the portal say one
// thing. Full Coaching features appear only once built: today, Objection Coach and roleplay.
//
// ⚠️ NO SELL. The Full Coaching row states a fact (included · on · not turned on) — no price, no
// button. The Full Coaching offer lives in the 50% moment ("No Coaching pitch before 50%").
// ═══════════════════════════════════════════════════════════════════════════════════════
import { BAND_PRICE_PER_MEETING_USD, SIZE_BANDS, sizeBandLabel, coachingIncluded, type SizeBand } from '@kind/shared'

/** The founder's promise per plan, verbatim from his Master Commercial Portal (R180). */
export const PLAN_PROMISE: Record<SizeBand, string> = {
  founders:   'Get me qualified meetings.',
  growth:     'Get me meetings and help me convert them better.',
  enterprise: 'Run the pipeline and coach the team from meeting to win.',
}
/** One line under the promise. Founders' and Growth's are the founder's own; Enterprise's drops "Expansion Engine". */
export const PLAN_SUMMARY: Record<SizeBand, string> = {
  founders:   'Milla and Vida run the outbound machine. You see the brief, the proof, the approval and the meetings.',
  growth:     'Everything in Founders, plus conversion insight and post-meeting support.',
  enterprise: 'Everything in Growth, with Full Coaching included.',
}

/** Every plan — the website's comparison rows, word for word (`website-plan-comparison.test.ts`). */
export const EVERY_PLAN = [
  'Qualified meetings booked for you',
  'Milla and Vida: your brief, one approval, your results',
  'Free Proof: real examples on your own market first',
  'Prep for every meeting',
  'Reporting on your programme',
] as const
/** Growth's own extras (`growthExtras` in `coaching-access.ts`). */
export const GROWTH_EXTRAS = ['What’s converting for you', 'Follow-up drafted after each meeting'] as const
/** Full Coaching features that are BUILT today. Add a row here the day a feature ships. */
export const FULL_COACHING_BUILT = ['Objection Coach and roleplay'] as const

export type FullCoachingState = 'included' | 'on' | 'off'
export const FULL_COACHING_LINE: Record<FullCoachingState, string> = {
  included: 'Included',
  on:       'On for the meetings still to come',
  off:      'Not turned on',
}

export type PlanView = {
  plan: SizeBand
  name: string
  promise: string
  summary: string
  /** "<band price> per qualified meeting" — interpolated from BAND_PRICE_PER_MEETING_USD, never typed. */
  price: string
  /** e.g. "1–50 employees" — from SIZE_BANDS. */
  size: string
  includes: string[]
  fullCoaching: FullCoachingState
  fullCoachingLine: string
}

const usd = (n: number) => `$${n.toLocaleString('en-US')}`
function sizeRange(plan: SizeBand): string {
  const b = SIZE_BANDS.find(x => x.key === plan)!
  return b.max === null ? `${b.min}+ employees` : `${b.min}–${b.max} employees`
}

/** Pure: the card for a plan. `activated` = Full Coaching bought for this programme (F3). */
export function planView(plan: SizeBand, activated: boolean): PlanView {
  const fullCoaching: FullCoachingState = coachingIncluded(plan) ? 'included' : activated ? 'on' : 'off'
  const includes: string[] =
    plan === 'founders' ? [...EVERY_PLAN]
    : plan === 'growth' ? ['Everything in Founders', ...GROWTH_EXTRAS]
    : ['Everything in Growth', ...FULL_COACHING_BUILT]
  // Founders or Growth with Full Coaching on: what it adds, listed like everything else.
  if (fullCoaching === 'on') {
    if (plan === 'founders') includes.push(...GROWTH_EXTRAS)
    includes.push(...FULL_COACHING_BUILT)
  }
  return {
    plan, name: sizeBandLabel(plan), promise: PLAN_PROMISE[plan], summary: PLAN_SUMMARY[plan],
    price: `${usd(BAND_PRICE_PER_MEETING_USD[plan])} per qualified meeting`,
    size: sizeRange(plan), includes, fullCoaching, fullCoachingLine: FULL_COACHING_LINE[fullCoaching],
  }
}

/** The client's plan card, from their programme (`coachingAccessFor`). No band → no card. */
export async function planOverviewFor(clientId: string): Promise<PlanView | null> {
  const { coachingAccessFor } = await import('./coaching-access')
  const a = await coachingAccessFor(clientId)
  return a.plan ? planView(a.plan, a.activated) : null
}
