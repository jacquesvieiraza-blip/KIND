// ═══════════════════════════════════════════════════════════════════════════
// MILLA'S MORNING BRIEF (P33 v3) — the in-app brief, in the client's own thread.
//
// THE FLYWHEEL (founder, 19 Aug): login is not a dashboard — it is ONE CONTINUOUS
// CONVERSATION with Milla that was already happening. The brief arrives IN that
// conversation, the client replies IN it, and the reply feeds the learning loop.
//
// ── WHICH CONVERSATION, AND WHY THIS FILE SAYS SO LOUDLY ────────────────────
// The first version of this prompt named `figsy_chat_messages` as "the client's
// chat". It is NOT. That table's only reader — `AskFigsyButton` — is mounted
// nowhere, so a brief written there would have been invisible forever. The
// client's real conversation is the /milla page, backed by milla_sessions /
// milla_messages, and the founder's own screenshot is what caught it. R64 and
// `scripts/dead-surfaces.sh` exist because of that near miss.
//   ⚠️ Do not "simplify" this into figsy_chat_messages. Nothing reads it.
//
// ── THIS IS THE SECOND MORNING BRIEF, AND THEY ARE DIFFERENT THINGS ─────────
// `POST /internal/milla/morning-brief-all` (internal.ts) already exists and runs
// daily at 07:30 UTC — but it is an EMAIL, gated behind a paid `virtual_assistant`
// subscription, and it links to the retired /dashboard. This one is in-app, for
// EVERY client, in the thread they actually read. The email one is deliberately
// UNTOUCHED here: P33's NO-TOUCH list covers outbound email paths.
//
// ── TWO NUMBERS, AND THE TWO THAT ARE MISSING ON PURPOSE ────────────────────
// The prompt asked for four. Two cannot be built honestly, so they are CUT and
// said out loud rather than faked (#136a — a number with no query and no
// canonical meaning CANNOT RENDER):
//   • "X match strongly" — NO canonical strong-match rule exists anywhere in the
//     repo. Vida's "Top 20" badge is `p.recommended`, a different concept.
//     Picking a score threshold here would be inventing product policy.
//   • "Y replies need you" — replies carry a classification (hot/warm/…) but
//     NOTHING records whether one has been handled, so "need you" has no state
//     to test. A count of hot replies would say "needs you" about replies the
//     client answered last week.
// Adding either = the founder defines the rule first, then a build.
//
// ── TIMEZONE ────────────────────────────────────────────────────────────────
// R62, founder-ruled 21 Aug: Europe/London. His words: "why we working in SA
// time when I am based in the UK." Europe/London and never a fixed offset — it
// carries BST itself, and a hardcoded +0/+1 drifts twice a year. There is no
// timezone column anywhere in the schema; per-client zones are post-launch.
// ═══════════════════════════════════════════════════════════════════════════

export const BRIEF_KIND = 'morning_brief'
export const BRIEF_TZ = 'Europe/London'

/**
 * The London calendar day as `YYYY-MM-DD`.
 *
 * `en-CA` is not a style choice — it is the locale whose short date format IS
 * ISO (`2026-08-22`), so this needs no manual padding or re-ordering. Combined
 * with `timeZone`, the conversion is done by the platform's own tz database,
 * which is what makes it BST-correct without us tracking clock changes.
 */
export function londonDay(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRIEF_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(at)
}

/**
 * The UTC instant at which the current London week began (Monday 00:00 London).
 *
 * "This week" has to mean something a client would recognise, and a rolling
 * 7-day window is not it: on a Monday morning, "meetings booked this week"
 * counting last Tuesday's meeting is wrong in the only way that matters — it
 * flatters the number. So this is a real week boundary.
 *
 * Built by walking back day by day in London terms rather than by subtracting
 * 86_400_000 ms from a UTC clock: the two disagree across a BST transition,
 * which is exactly the bug this whole file is careful about.
 */
export function londonWeekStart(at: Date): Date {
  // Which weekday is it in London? (Not in UTC — near midnight they differ.)
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: BRIEF_TZ, weekday: 'short' }).format(at)
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const back = Math.max(0, order.indexOf(weekday))   // -1 (unparseable) → treat as Monday

  // Step back `back` London-days, then take that day's London midnight.
  const dayMs = 86_400_000
  const target = londonDay(new Date(at.getTime() - back * dayMs))
  return londonMidnightUtc(target)
}


/**
 * The UTC instant of 00:00 London on a given `YYYY-MM-DD`.
 *
 * Probing both candidate offsets (UTC+0 and UTC+1) and keeping whichever really
 * lands on that London date avoids hardcoding when BST starts and ends. On the
 * two ambiguous nights of the year both probes can look plausible; the EARLIER
 * instant is taken, which errs toward including a booking rather than dropping
 * one from the count.
 */
export function londonMidnightUtc(day: string): Date {
  const utcMidnight = new Date(`${day}T00:00:00Z`).getTime()
  // London is either UTC+0 (GMT) or UTC+1 (BST). Under UTC+1, local midnight is
  // one hour EARLIER in UTC terms. Test both; keep the ones that really fall on
  // this London date.
  const candidates = [
    new Date(utcMidnight - 3_600_000),  // as if BST  (UTC+1)
    new Date(utcMidnight),              // as if GMT  (UTC+0)
  ]
  const valid = candidates.filter(d => londonDay(d) === day)
  // Earliest valid instant wins: on the two ambiguous clock-change nights that
  // errs toward INCLUDING a booking rather than silently dropping one.
  return valid.length > 0 ? valid[0] : candidates[1]
}

export type BriefNumbers = {
  /** Prospects delivered + surfaced, not yet revealed, not passed — the review queue. */
  pendingReview: number
  /** Confirmed calendar bookings starting inside the current London week. */
  meetingsThisWeek: number
}

/**
 * The brief's text. Pure, so the red proof can assert exact strings.
 *
 * ZERO/QUIET STATE — the rule is narrow and the prompt is explicit: "Quiet
 * night" ONLY when the day is genuinely empty. One zero beside one non-zero
 * still renders the real activity, because calling a day quiet while a meeting
 * sits in it is the same class of lie as an invented number.
 */
export function composeBrief(n: BriefNumbers): string {
  const parts: string[] = []
  if (n.pendingReview > 0) {
    parts.push(n.pendingReview === 1
      ? '1 prospect is waiting for your review'
      : `${n.pendingReview} prospects are waiting for your review`)
  }
  if (n.meetingsThisWeek > 0) {
    parts.push(n.meetingsThisWeek === 1
      ? '1 meeting booked this week'
      : `${n.meetingsThisWeek} meetings booked this week`)
  }

  if (parts.length === 0) {
    // Founder-ruled 21 Aug: the first brief goes out on day one — "yes send on
    // day 1" — so this is a real state a brand-new client sees, not a rare edge.
    // It says what happens next instead of just reporting nothing.
    return 'Morning. Quiet night — nothing new waiting for you. I\'ll keep sourcing and bring you the next batch as soon as it\'s ready.'
  }
  return `Morning. ${parts.join(' · ')}.`
}

/**
 * The jsonb tag stamped on a brief message.
 *
 * `sources` already exists on milla_messages (it carries RAG citations), and
 * ordinary chat rows put an ARRAY there. `sources->>'kind'` on an array yields
 * NULL rather than erroring, so the partial unique index below can key off this
 * object shape without ever colliding with a real conversation row.
 */
export function briefTag(day: string): { kind: string; day: string } {
  return { kind: BRIEF_KIND, day }
}
