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
// `LEADS_PER_TARGETED_MEETING` (250) is the PLANNING benchmark — the rate we EXPECT. It is
// what the programme is sized and priced at and what `recommendedVolume` derives. It answers
// *how much work do we expect this to take*.
//
// `LEADS_PER_MEETING_WORST_CASE` (400) is the LIMIT. It answers a different question: *how far
// do we keep going before we stop?* Selling against it also answers *is there enough humanity
// in this pool to spend the full effort on every meeting we sold?*
//
// ── 🛑 ⚑ 23 Sep — THE OVERRUN PROMISE IS GONE. READ THIS BEFORE THE STRUCK TEXT BELOW ─────
//
// 🛑 FOUNDER-LOCKED 23 Sep, verbatim: *"we dont promise 10 if we cant deliver 10. so the limit
// is 400 not 250. if we hit the 400 we stop. and we have to add a disclaimer to the client we
// do our best. this is not a guarentee."*
//
// ⛓️ WAS: ~~*"WHY THE GAP IS THE PRODUCT AND NOT PADDING. The commercial promise is that ten
// bought is ten owed: if the planned volume runs out at eight meetings we keep working at our
// cost… those seven meetings of headroom are the room to keep going. Sell the seventeen and
// the guarantee becomes a hope."*~~ — struck 23 Sep, kept because it is the reasoning every
// surface was built from, and a reader who meets only the new rule will not know why the old
// shape is still visible in the code around it.
//
// **THE MEETING COUNT IS A TARGET, NOT AN OBLIGATION.** We work to `meetings × 400` and then we
// stop. Nothing is absorbed at our cost beyond that line. What the client is told instead is a
// disclaimer — *we do our best, this is not a guarantee* — and a shortfall is settled as
// WALLET CREDIT toward another ICP run, never as money back (founder, 23 Sep: *"we dont give
// money back. we refund credits to their wallet internally to use towards another icp run."*).
//
// ⚠️ THE GAP BETWEEN 250 AND 400 IS THEREFORE NO LONGER A FUNDED PROMISE. It is the range
// between what we expect and where we stop — nothing more. Do not describe it as headroom we
// have set aside to keep working, because we have not.
//
// ⚠️ AND IT COSTS MARGIN, KNOWINGLY. Working to 400 instead of 250 takes worst-case programme
// contribution from ~76% to ~65%, below the ~70% target in R74. Founder-locked 23 Sep: *"i
// would rather get clients meetings with lessor margin than nothing… and 65% i can live with."*
// That is a decision, not a drift — do not "fix" the ceiling back to 250 on margin grounds.
//
// ⚠️ THE CLIENT IS NEVER SHOWN THE POOL SIZE OR THE 400. Founder-locked, and REAFFIRMED
// 23 Sep — *"i said 400 internally. we dont disclose this."* (originally *"we build buffer
// only we know"*). They are shown what we can commit to, and the disclaimer. `benchmarkMeetings`
// exists for the OPERATOR view, where the distance between the expected rate and the limit is
// how far a programme may still have to run.
//
// ⚠️ EVERYTHING ROUNDS DOWN, AND THAT IS A COMMERCIAL RULE RATHER THAN A ROUNDING STYLE. A
// pool that carries 10.9 meetings carries TEN meetings we can promise; selling the eleventh
// on a rounding convention is selling a meeting the pool cannot account for. The founder's
// own preview arithmetic is floor twice over — 4,120 ÷ 400 → 10, and 4,317 ÷ 400 → 10 with
// 4,317 ÷ 250 → 17.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { LEADS_PER_TARGETED_MEETING } from './programme-pricing'

/**
 * 🛑 THE LIMIT: people worked per meeting before we stop. Internal. Never shown to a client.
 *
 * ⚠️ IT MUST STAY ABOVE THE BENCHMARK, and `capacityInvariant` below proves it rather than
 * trusting it. If this ever fell to or below 250 we would stop at or before the point we
 * EXPECTED to succeed — every programme would down tools exactly when the plan said it should
 * be working — and nothing would fail loudly: the product would keep running and the numbers
 * would keep rendering. That is the state the repo was actually in until 23 Sep, when the
 * sourcing ceiling was still being opened at the 250 benchmark.
 */
export const LEADS_PER_MEETING_WORST_CASE = 400

/**
 * 🛑 HOW MANY PEOPLE A PROGRAMME MAY WORK BEFORE IT STOPS — `meetings × 400`.
 *
 * This is the programme's `sourcing_ceiling`, and it is the whole of the 23 Sep ruling in one
 * line. Until then the ceiling was opened at `recommendedVolume` (meetings × 250), so the
 * LIMIT and the EXPECTATION were the same number and a programme gave up at precisely the
 * point the plan said it should be landing its meetings.
 *
 * ⚠️ NOT `recommendedVolume`, AND THE TWO MUST NOT BE MERGED BACK. 250 still sizes and prices
 * the programme; 400 decides when we stop. One is a plan, the other is a boundary.
 */
export function sourcingCeiling(meetings: number): number {
  const m = Number.isFinite(meetings) ? Math.max(0, Math.floor(meetings)) : 0
  return m * LEADS_PER_MEETING_WORST_CASE
}

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
  /**
   * The distance between what we expect and where we stop, in meetings.
   *
   * ⛓️ 23 Sep — THE NAME IS OLDER THAN THE MEANING. ~~*"the meetings we chose not to sell — the
   * room the overrun promise is paid for out of"*~~. There is no overrun promise any more, so
   * this is no longer work we have set aside to absorb: it is simply how much further than the
   * plan a programme may still have to run before it hits the limit. The FIELD keeps its name
   * because it is in a live response shape; the operator LABEL does not (see `operator.ts`).
   */
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
 * The limit must be strictly harsher than the benchmark, or we stop at — or before — the point
 * we expected to succeed, and every programme gives up exactly when the plan says it should be
 * landing meetings. Exported so a test proves it by RUNNING it rather than by reading the two
 * constants and agreeing with itself.
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
