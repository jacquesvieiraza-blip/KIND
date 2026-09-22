// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 HOW MANY MEETINGS THIS POOL CAN CARRY — founder-locked 22 Sep
//
// ── THE RULE, IN THE FOUNDER'S OWN WORDS ────────────────────────────────────────────────
//
//     "well we would not offer 10 meetings when we can only deliver 6. so our calulator
//      presented to the client in the portal says. we can get you 10. we best have the
//      amount of people to do so."
//
//     "we do 400. but present 250 to the client. we build buffer only we know. and if we
//      execute 250 we then have room to find more should the client wish too"
//
// ── TWO NUMBERS, TWO DIFFERENT JOBS, AND CONFLATING THEM IS THE WHOLE RISK ───────────────
//
// `LEADS_PER_TARGETED_MEETING` (250) is the PLANNING benchmark. It is what the programme is
// sized and priced at, what the client sees in the calculator, and what `recommendedVolume`
// already derives. It answers *how much work do we expect this to take*.
//
// `LEADS_PER_MEETING_WORST_CASE` (400) is the CAPACITY divisor, and it is ours. It answers a
// different and much harsher question: *if everything goes badly, is there enough humanity in
// this pool to still owe them what we sold?* Planning at 250 and SELLING at 250 are not the
// same act — the second one spends the buffer before the programme has started.
//
// 🛑 WHY THE GAP IS THE PRODUCT AND NOT PADDING. The commercial promise is that ten bought is
// ten owed: if the planned volume runs out at eight meetings we keep working at our cost. That
// promise is only safe to make because we sold against 400 and plan against 250 — a pool of
// 4,317 carries **ten** at the worst case and **seventeen** at the benchmark, and those seven
// meetings of headroom are the room to keep going. Sell the seventeen and the guarantee
// becomes a hope.
//
// ⚠️ THE CLIENT IS NEVER SHOWN THE POOL SIZE OR THE 400. Founder-locked: *"we build buffer
// only we know."* They are shown what we can commit to. `benchmarkMeetings` exists for the
// OPERATOR view, where the difference between the two is the headroom an operator is
// deliberately being shown.
//
// ⚠️ EVERYTHING ROUNDS DOWN, AND THAT IS A COMMERCIAL RULE RATHER THAN A ROUNDING STYLE. A
// pool that carries 10.9 meetings carries TEN meetings we can promise; selling the eleventh
// on a rounding convention is selling a meeting the pool cannot account for. The founder's
// own preview arithmetic is floor twice over — 4,120 ÷ 400 → 10, and 4,317 ÷ 400 → 10 with
// 4,317 ÷ 250 → 17.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { LEADS_PER_TARGETED_MEETING } from './programme-pricing'

/**
 * 🛑 THE WORST-CASE PEOPLE-PER-MEETING RATE. Internal. Never shown to a client.
 *
 * ⚠️ IT MUST STAY ABOVE THE BENCHMARK, and `capacityInvariant` below proves it rather than
 * trusting it. If this ever fell to or below 250 the headroom would vanish silently: the
 * product would keep working, the numbers would keep rendering, and the overrun promise would
 * quietly have nothing behind it.
 */
export const LEADS_PER_MEETING_WORST_CASE = 400

/**
 * The workable pool: everyone the search matched, minus the companies the client told us to
 * leave out, minus everyone we have already sourced for this client.
 *
 * ── 🛑 ⚑ 22 Sep — THE THIRD SUBTRACTION, AND IT WAS MISSING ──────────────────────────────
 *
 * ⛓️ WAS: ~~`workablePool(matched, excluded)`~~ — matched minus exclusions, full stop. That
 * shipped, and it over-promises on a client's SECOND programme.
 *
 * 🛑 FOUNDER-LOCKED 22 Sep: *"we only count the unworked amount. and if we dont have enough
 * we tll the client improve your ICP. Widen your target market."*
 *
 * 🛑 AND THE REASON IS HARDER THAN "THEY ALREADY HAD OUR EMAIL". The sourcing loop REFUSES a
 * person it has already created a lead row for — `leads` keyed on `(client_id, apollo_id)`,
 * counted as `removedByDedupe` and logged as *"already owned by this client"*. So those
 * people are not merely less likely to convert the second time: **they cannot be served
 * again at all.** Counting them would promise meetings against humans the product itself
 * will decline to hand over — which is the precise failure the 400 exists to prevent.
 *
 * ⚠️ A SET-ASIDE ROW STILL COUNTS AS WORKED, because the dedupe does not care why the row
 * exists. Anyone with a lead row is unavailable, refused or not.
 *
 * ⚠️ EXCLUSIONS AND ALREADY-WORKED ARE THE ONLY TWO SUBTRACTIONS. Not people we judged a poor
 * fit, not unknowns, not a category mismatch — those are real people we can still contact,
 * ranked lower. What removes somebody is an instruction the client gave us, or the fact that
 * we have already used them.
 *
 * ⚠️ CLAMPED AT ZERO. Subtractions larger than the match are nonsense rather than a negative
 * pool, and a negative pool would produce a negative capacity that reads as a number.
 */
export function workablePool(matched: number, excluded = 0, alreadyWorked = 0): number {
  const n = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0)
  return Math.max(0, n(matched) - n(excluded) - n(alreadyWorked))
}

/**
 * 🛑 HOW MANY BOOKED MEETINGS WE MAY SELL AGAINST THIS POOL.
 *
 * This is the number the client sees, the number the Programme slider stops at, and the
 * number the commitment is made against. It is the WORST case on purpose.
 */
export function committedCapacity(workable: number): number {
  const w = Number.isFinite(workable) ? Math.max(0, Math.floor(workable)) : 0
  return Math.floor(w / LEADS_PER_MEETING_WORST_CASE)
}

/**
 * What the same pool would carry at the planning benchmark — the OPERATOR's view of headroom.
 *
 * ⚠️ NEVER A CLIENT-FACING NUMBER. It is always the larger of the two, so showing it would be
 * showing a client a capacity we have deliberately decided not to sell them.
 */
export function benchmarkMeetings(workable: number): number {
  const w = Number.isFinite(workable) ? Math.max(0, Math.floor(workable)) : 0
  return Math.floor(w / LEADS_PER_TARGETED_MEETING)
}

/** `{ workable, committed, benchmark, headroom }` — one object so no caller re-derives a part. */
export interface PoolCapacity {
  /** Matched minus the client's exclusions. */
  workable: number
  /** What we may sell. Worst case. */
  committed: number
  /** What it would carry at the benchmark. Operator only. */
  benchmark: number
  /** The meetings we chose not to sell — the room the overrun promise is paid for out of. */
  headroom: number
}

export function poolCapacity(matched: number, excluded = 0, alreadyWorked = 0): PoolCapacity {
  const workable = workablePool(matched, excluded, alreadyWorked)
  const committed = committedCapacity(workable)
  const benchmark = benchmarkMeetings(workable)
  return { workable, committed, benchmark, headroom: Math.max(0, benchmark - committed) }
}

/**
 * 🛑 THE INVARIANT THIS MODULE EXISTS TO HOLD, ASSERTABLE AT RUNTIME.
 *
 * The worst case must be strictly harsher than the benchmark, or there is no headroom and the
 * "ten bought is ten owed" promise has nothing behind it. Exported so a test proves it by
 * RUNNING it rather than by reading the two constants and agreeing with itself.
 */
export function capacityInvariant(): boolean {
  return LEADS_PER_MEETING_WORST_CASE > LEADS_PER_TARGETED_MEETING
}

/**
 * The client-facing sentence for a pool, in the founder's own shape:
 * *"around ten meetings at this size"*.
 *
 * ⚠️ IT NEVER STATES THE POOL SIZE AND NEVER STATES THE RATE. Both are the buffer the founder
 * locked as ours; the client is told what we can commit to, which is the only part that is a
 * promise to them.
 *
 * ⚠️ AND IT IS HONEST WHEN THE ANSWER IS ZERO. A pool too small to carry a single meeting must
 * not render "around 0 meetings" — that is a number pretending to be an offer. It says so in
 * words, which is the state the founder's own ruling covers: *"we need to say based on your
 * current ICP we cannot find more people. we can help widen the ICP."*
 */
export function capacitySentence(committed: number): string {
  if (committed <= 0) return 'not enough people yet for a programme at this targeting'
  if (committed === 1) return 'around one meeting at this size'
  return `around ${committed} meetings at this size`
}
