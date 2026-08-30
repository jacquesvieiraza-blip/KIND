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
// ── ONE NUMBER, AND WHY IT IS NOT THREE ─────────────────────────────────────
// ⚠️ THE LEAD COUNT IS DELIBERATELY NOT HERE, AND THAT IS A LATE CORRECTION.
// This was built reporting prospects-waiting AND meetings, and only then did a
// read of the live page show that /milla ALREADY greets the client with the lead
// count — from `milla-summary.ts`, which mirrors /for-approval with the exact
// same four conditions this file was using. The numbers would always have
// agreed; they would simply have been printed twice, in consecutive messages.
// Founder's call, given the choice: "1" — drop it from the brief and let the
// greeting keep owning it. What is left here is what the greeting never says.
//
// ── THE TWO THAT ARE MISSING ON PURPOSE ─────────────────────────────────────
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
  /** Confirmed calendar bookings starting inside the current London week. */
  meetingsThisWeek: number
}

/**
 * The brief's text. Pure, so the red proof can assert exact strings.
 *
 * Returns null when there is nothing to say. That is not an edge case — it is
 * most days early on, and it is the right answer: /milla already opens with a
 * live greeting, so a brief that adds no new fact would be a second message
 * saying nothing. Silence beats noise in a thread the client is meant to read.
 */
export function composeBrief(n: BriefNumbers): string | null {
  if (n.meetingsThisWeek <= 0) return null
  return n.meetingsThisWeek === 1
    ? 'Morning. 1 meeting booked this week — it\'s in your Meetings tab.'
    : `Morning. ${n.meetingsThisWeek} meetings booked this week — they're in your Meetings tab.`
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

// ── ⚑ 30 Aug (BUILD-004A-2A) — IS THIS BRIEF NEWS, OR THE SAME NEWS AGAIN? ──────────────
//
// 🛑 THE DEFECT THIS REPLACES WAS MY OWN, AND GPT'S REVIEW CAUGHT IT. The first cut of the
// duplicate fix compared the composed text against the most recent brief with no window at
// all. That suppressed the real duplicate — Monday/Tuesday/Wednesday of one week all saying
// "2 meetings booked this week" — and ALSO suppressed a legitimate, truthful Week-2 brief
// that happened to report 2 again. Content-only dedup does not decay: the client would never
// hear that number again until it changed.
//
// ⚠️ THE PERIOD IS THE POINT. The fact this brief reports is WEEKLY (`meetingsThisWeek`), so
// the window in which a repeat is "the same news" is exactly one London week. Two identical
// sentences inside one week are one piece of news. The same sentence in a later week is a
// new, true statement about a different week and must always be allowed through.
//
// ⚠️ PURE, so both halves are provable without a database — the rule this file exists under
// (the DB half lives in `morning-brief-deliver.ts`). The suppression and the release are each
// one assertion.
//
// ⚠️ FAILS OPEN. An absent or unparseable stamp on the previous brief means we cannot say it
// belongs to this week, so it does not suppress. A duplicate is a small harm; silently
// withholding a client's real news is a larger one.

export type LastBrief = { content: string; day: string | null } | null

/**
 * Should this brief be suppressed as a repeat of one already sent THIS WEEK?
 *
 * @param text          the brief just composed
 * @param last          the most recent brief already in the thread, with its London-day stamp
 * @param weekStartDay  `YYYY-MM-DD` of the current London week's Monday
 */
export function briefIsRepeat(text: string, last: LastBrief, weekStartDay: string): boolean {
  if (!last || last.content !== text) return false
  // ISO `YYYY-MM-DD` compares correctly as text, so no date parsing is needed — and a stamp
  // that is not that shape is treated as unknown rather than coerced into a comparison.
  if (!last.day || !/^\d{4}-\d{2}-\d{2}$/.test(last.day)) return false
  return last.day >= weekStartDay
}
