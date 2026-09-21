// ── CALIBRATION v1 — THE REASON BEHIND A PASS (P32, 21 Aug) ────────────────────────────────
//
// Founder doctrine: *"Approve/Pass IS the calibration event — capture the REASON and the
// product gets smarter every time a client clicks."*
//
// ⚠️ THE CONSTRAINT THAT SHAPES THIS WHOLE FILE: *"One tap, never mandatory, never blocks the
// action."* The pass has ALREADY HAPPENED before any of this runs. A chip is a second, separate
// call, and every failure path here returns quietly rather than throwing — a lost calibration
// row is a small loss, and a pass that 500s because a nice-to-have write failed is a client
// watching a button do nothing.
//
// ⚠️ AND FREE TEXT IS STORED, NEVER ACTED ON. The founder gated auto-parsing: a human reads it
// in Vida. There is deliberately no parser in this file and no place to add one quietly —
// `applicableAntiSignals` below reads ONLY the structured codes, and its own test asserts that
// free text cannot influence it.

// ── ⛓️ 18 Sep (J6-C4 · LR 6) — ONE LIST, IN `@kind/shared` ─────────────────────
//
// The seven codes and their labels were declared HERE and, separately, as
// `PROOF_REASON_CODES` in `proof-calibration.ts` — where there were only SIX. `bad_timing` was
// missing from that copy, so a client who tapped "Bad timing" had it stored by this route and
// read back as `other` by `readAttempts`: Vida showed an operator a reason the client never
// gave. A third copy was hand-typed into the Milla card and a fourth is the database CHECK.
//
// ⚠️ THE NAMES ARE UNCHANGED so no caller moves, and a guard asserts they still ARE the
// shared list rather than a copy that happens to match today.
import {
  LEAD_REASON_CODES, LEAD_REASON_LABELS, isLeadReasonCode, type LeadReasonCode,
} from '@kind/shared'

export const REASON_CODES = LEAD_REASON_CODES
export const REASON_LABELS = LEAD_REASON_LABELS
export const isReasonCode = isLeadReasonCode
export type ReasonCode = LeadReasonCode

/**
 * Normalise what arrived on the request into something storable, or reject it.
 *
 * ⚠️ AN UNKNOWN CODE IS DROPPED, NOT STORED AND NOT FATAL. A client is not typing these — they
 * tap a chip — so an unrecognised code means a stale client build or somebody poking the API.
 * Storing it would put a value in the column that the CHECK constraint rejects (failing the
 * whole write, taking the free text with it); rejecting the request would fail a call the
 * client never needed to make. Keeping the free text and dropping the bad code loses the least.
 */
export function normaliseFeedback(input: { reason_code?: unknown; free_text?: unknown }): {
  reasonCode: ReasonCode | null
  freeText: string | null
  hasSomething: boolean
} {
  const reasonCode = isReasonCode(input.reason_code) ? input.reason_code : null
  const raw = typeof input.free_text === 'string' ? input.free_text.trim() : ''
  // 2,000 is generous for a sentence and small enough that nobody pastes a CRM export into it.
  const freeText = raw ? raw.slice(0, 2_000) : null
  return { reasonCode, freeText, hasSomething: !!reasonCode || !!freeText }
}

// ── THE ANTI-SIGNAL READ (used by PR 2's sourcing filter; defined here with the codes) ──────
//
// Kept in this file rather than the sourcing one because it is a statement ABOUT FEEDBACK, and
// the rule it encodes — how many passes make an opinion — belongs beside the thing it counts.

/** The founder's threshold: *"3+ leads of a size band"*. */
export const ANTI_SIGNAL_MIN_COUNT = 3

export type FeedbackRow = {
  reason_code: ReasonCode | null
  /** The passed lead's `leads.company_size` — the band the opinion was expressed about. */
  company_size?: string | null
  free_text?: string | null
}

/**
 * Which structured reasons this client has expressed often enough to act on.
 *
 * ⚠️ STRUCTURED CODES ONLY. `free_text` is in the row type so callers can pass whole rows
 * without stripping them, and it is never read. That is asserted by a test, because "we don't
 * parse free text" is a promise that decays the moment somebody adds one convenient regex.
 */
export function applicableAntiSignals(rows: readonly FeedbackRow[]): Map<ReasonCode, number> {
  const counts = new Map<ReasonCode, number>()
  for (const r of rows) {
    if (!r.reason_code) continue
    counts.set(r.reason_code, (counts.get(r.reason_code) ?? 0) + 1)
  }
  for (const [code, n] of [...counts]) if (n < ANTI_SIGNAL_MIN_COUNT) counts.delete(code)
  return counts
}

// ── PR 2 · THE SIZE ANTI-SIGNAL — "too big" / "too small" NARROW A CLIENT'S OWN SOURCING ───
//
// Founder-ruled 21 Aug: *"a client who passed 'too big' on 3+ leads of a size band gets that
// band excluded from THEIR next sourcing run"* — and, on the question of how far to exclude:
// **that band AND everything above it.** His words on the choice: *"go with both your
// recommendations"*, the recommendation being that "too big" means too big, and excluding only
// the exact band leaves the larger companies flowing straight back.
//
// ⚠️ CLIENT-SCOPED, ALWAYS. Every function here takes one client's rows and returns one
// client's narrowed list. Nothing global, nothing that reaches the pool, nothing another
// client's feedback can influence — asserted in the guard, because "client-scoped" is a
// property that decays silently the first time somebody adds a convenient cross-client read.
//
// ⚠️ AND IT CAN NEVER EMPTY THE SEARCH. If a client's feedback would exclude every band they
// target, the narrowing is ABANDONED and the original list returned. A search with no sizes
// finds nobody, and "we listened to you so hard you now get zero leads" is a worse outcome
// than "we kept looking while you tell us more".

/** The size ladder, smallest → largest. The ICP labels, exactly as the portal stores them. */
export const SIZE_LADDER = ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,000+'] as const

/** A passed lead's band, matched tolerantly — `leads.company_size` is provider text, not ours. */
export function bandIndex(companySize: string | null | undefined): number {
  if (!companySize) return -1
  const s = companySize.replace(/[\s,]/g, '').replace(/[–—]/g, '-')
  return SIZE_LADDER.findIndex(b => b.replace(/[\s,]/g, '').replace(/[–—]/g, '-') === s)
}

// ── 🛑 ⚑ 18 Sep (J5-C5) — A RAW HEADCOUNT IS A BAND, AND IT WAS BEING READ AS SILENCE ────
//
// 🛑 WHAT THIS FIXES, MEASURED. `bandIndex` matches the six LADDER LABELS and nothing else —
// which is right for the portal and for `lead_pool` rows written from a label. But the two
// writers that actually populate a sourced candidate's size write a RAW HEADCOUNT:
//
//     company_size: contact.organization?.num_employees ? String(...num_employees) : null
//
// — in `leads` and in `lead_pool`, in `runIcpJob`. So `bandIndex('4000')` is `-1`, and
// `sizeVerdict` answered **`unknown`** for a four-thousand-person company shown to a client
// who asked for 11–50. Not "no". Not a refusal. *"Their headcount could not be confirmed"* —
// about a company whose headcount the provider told us exactly.
//
// The consequence is that ONE OF THE FOUNDER'S FOUR CANARY CRITERIA — *"UK digital marketing
// agencies, 10–50 staff, Founder or CEO"* — has never refused a single provider-sourced
// candidate. The existing guard did not catch it because every size case in it is written
// with a ladder label, which is the one shape the provider path never produces.
//
// ⚠️ `bandIndex` ITSELF IS UNTOUCHED, DELIBERATELY. `narrowSizeBands` (the calibration
// anti-signal) reads it too, and widening a shared function would change what a client's own
// "too big" passes exclude from their next run — a different behaviour, not asked for here.
// This is a SECOND resolver over the SAME ladder, so there is still one size vocabulary.

/** Upper bound of each `SIZE_LADDER` band, in people. The last band is open-ended. */
const LADDER_MAX = [10, 50, 200, 500, 1000, Number.POSITIVE_INFINITY]

/**
 * The ladder band a RAW HEADCOUNT falls in — `'24'` → `11–50`. `-1` when the value is not a
 * plain headcount (a label, a range, free text, or a nonsense zero), which keeps it honestly
 * unknown rather than guessing a band from a string we did not understand.
 */
export function headcountBandIndex(companySize: string | null | undefined): number {
  const raw = String(companySize ?? '').replace(/[\s,]/g, '')
  if (!/^\d+$/.test(raw)) return -1
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return -1
  return LADDER_MAX.findIndex(max => n <= max)
}

/**
 * ⚑ 21 Sep — THE BOUNDS OF THE LADDER BAND A HEADCOUNT FALLS IN. `20` → `{ min: 11, max: 50 }`.
 *
 * 🛑 WHY THIS EXISTS, AND IT IS WHY NO CLIENT HAD EVER RECEIVED A LEAD. `statedSizeRange` read
 * a client's single spoken number as an EXACT match — *"around 20 people"* became
 * `{ min: 20, max: 20 }` — and that range OUTRANKS the band we actually searched (J5-C4). So
 * Apollo was asked for 11–50, returned genuinely in-band people, and our own gate set aside
 * every one of them that was not precisely twenty. AAA Operations Studio: 20 sourced, 0
 * eligible, 20 set aside on size. GREAT Studio: identical.
 *
 * ⚠️ IT LIVES HERE BECAUSE THE LADDER LIVES HERE. `LADDER_MAX` has one owner, and a second
 * copy of these bounds in `proof-fit` is how two functions come to disagree about one fact —
 * the defect class this repository has paid for more than once.
 *
 * ⚠️ THE OPEN-ENDED TOP BAND ANSWERS `max: null`, which every caller already reads as "no
 * ceiling". `null` for a value that is not a plain headcount, so nothing is guessed.
 */
export function headcountBandBounds(
  companySize: string | null | undefined,
): { min: number; max: number | null } | null {
  const i = headcountBandIndex(companySize)
  if (i < 0) return null
  const min = i === 0 ? 1 : LADDER_MAX[i - 1] + 1
  const max = Number.isFinite(LADDER_MAX[i]) ? LADDER_MAX[i] : null
  return { min, max }
}

export type SizedFeedback = { reason_code: ReasonCode | null; company_size?: string | null }

/**
 * Narrow a client's targeted size bands using their own recent passes.
 *
 * `too_big`   on band i → drop band i and everything ABOVE it.
 * `too_small` on band i → drop band i and everything BELOW it.
 *
 * Both need `ANTI_SIGNAL_MIN_COUNT` passes at the same band before they count: three is an
 * opinion, one is a bad afternoon.
 */
export function narrowSizeBands(
  targeted: readonly string[],
  rows: readonly SizedFeedback[],
): { sizes: string[]; excluded: string[]; reason: string | null } {
  const tooBigAt = new Map<number, number>()
  const tooSmallAt = new Map<number, number>()
  for (const r of rows) {
    const i = bandIndex(r.company_size)
    if (i < 0) continue                                  // unknown band — no opinion to act on
    if (r.reason_code === 'too_big')   tooBigAt.set(i, (tooBigAt.get(i) ?? 0) + 1)
    if (r.reason_code === 'too_small') tooSmallAt.set(i, (tooSmallAt.get(i) ?? 0) + 1)
  }

  // The LOWEST band called "too big" enough times sets the ceiling; the HIGHEST called
  // "too small" sets the floor.
  const ceiling = [...tooBigAt.entries()].filter(([, n]) => n >= ANTI_SIGNAL_MIN_COUNT)
    .map(([i]) => i).sort((a, b) => a - b)[0]
  const floor = [...tooSmallAt.entries()].filter(([, n]) => n >= ANTI_SIGNAL_MIN_COUNT)
    .map(([i]) => i).sort((a, b) => b - a)[0]

  if (ceiling === undefined && floor === undefined) return { sizes: [...targeted], excluded: [], reason: null }

  const keep = targeted.filter(b => {
    const i = SIZE_LADDER.indexOf(b as typeof SIZE_LADDER[number])
    if (i < 0) return true                               // a band we do not recognise is left alone
    if (ceiling !== undefined && i >= ceiling) return false
    if (floor   !== undefined && i <= floor)   return false
    return true
  })

  // ⚠️ NEVER NARROW TO NOTHING. See the header: a client who has rejected every band they
  // target would otherwise get zero leads, which is a worse answer than continuing to look.
  if (keep.length === 0) return { sizes: [...targeted], excluded: [], reason: null }

  const excluded = targeted.filter(b => !keep.includes(b))
  if (excluded.length === 0) return { sizes: [...targeted], excluded: [], reason: null }

  const parts: string[] = []
  if (ceiling !== undefined) parts.push(`passed ${ANTI_SIGNAL_MIN_COUNT}+ as "too big" at ${SIZE_LADDER[ceiling]}`)
  if (floor   !== undefined) parts.push(`passed ${ANTI_SIGNAL_MIN_COUNT}+ as "too small" at ${SIZE_LADDER[floor]}`)
  return { sizes: keep, excluded, reason: parts.join(' · ') }
}

/**
 * The client's recent feedback, as one line for FIGSY's scoring prompt.
 *
 * Structured codes only — free text never reaches a model here for the same reason it never
 * reaches the filter: the founder gated it, and a prompt is an application.
 */
export function scoringFeedbackContext(rows: readonly SizedFeedback[]): string | null {
  const counts = applicableAntiSignals(rows)
  if (counts.size === 0) return null
  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, n]) => `${REASON_LABELS[code].toLowerCase()} (${n}×)`)
  return `This client has recently passed on leads for: ${parts.join(', ')}. Score accordingly.`
}
