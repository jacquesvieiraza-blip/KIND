// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 · Coaching) — WHAT FULL COACHING ADDS TO A PROGRAMME'S PRICE.
//
// Founders ($99) and Growth ($199) can turn on Full Coaching; Enterprise ($299) already has it.
// The uplift is per meeting STILL TO COME, paid once at activation (R180 Q2): uplift × remaining.
// ⛓️ R180 recorded the +$100 as a PROPOSED price; the founder LOCKED it on 1 Oct (R184: "$100 yes").
// Every screen reads it from here — never typed — so changing it for new programmes is this one line.
// ═══════════════════════════════════════════════════════════════════════════════════════
import type { SizeBand } from './size-band'

export const FULL_COACHING_UPLIFT_PER_MEETING_USD = 100

/** Does this plan already include Full Coaching? Enterprise does (R180). */
export const coachingIncluded = (band: SizeBand | null | undefined): boolean => band === 'enterprise'

/** The one payment to turn on Full Coaching now: uplift × the meetings still to come. */
export function fullCoachingActivationUsd(remainingMeetings: number): number {
  return Math.max(0, Math.floor(remainingMeetings)) * FULL_COACHING_UPLIFT_PER_MEETING_USD
}
