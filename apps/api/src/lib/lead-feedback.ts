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

/** The seven chips, in the order Milla renders them. */
export const REASON_CODES = [
  'too_big', 'too_small', 'wrong_industry', 'wrong_role', 'wrong_geography', 'bad_timing', 'other',
] as const
export type ReasonCode = typeof REASON_CODES[number]

/** What a client sees on the chip. Kept beside the code so the two can never drift apart. */
export const REASON_LABELS: Record<ReasonCode, string> = {
  too_big:         'Too big',
  too_small:       'Too small',
  wrong_industry:  'Wrong industry',
  wrong_role:      'Wrong role',
  wrong_geography: 'Wrong geography',
  bad_timing:      'Bad timing',
  other:           'Other',
}

export function isReasonCode(v: unknown): v is ReasonCode {
  return typeof v === 'string' && (REASON_CODES as readonly string[]).includes(v)
}

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
