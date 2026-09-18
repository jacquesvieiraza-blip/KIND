// ══════════════════════════════════════════════════════════════════════════════════════════
// J6-C4 · ONE REASON-CODE LIST (LR 6)
//
// ── FOUR COPIES, AND TWO OF THEM DISAGREED ─────────────────────────────────────────────
//
//   1. `apps/api/src/lib/lead-feedback.ts`      — REASON_CODES, SEVEN, with `bad_timing`
//   2. `apps/api/src/lib/proof-calibration.ts`  — PROOF_REASON_CODES, SIX, WITHOUT it
//   3. `apps/portal/.../milla/page.tsx`         — REASON_CHIPS, a hand-typed seven
//   4. `20260821_lead_feedback.sql`'s CHECK     — seven
//
// 🛑 SO "BAD TIMING" WAS RECORDED AND THEN ERASED. The chip renders, the client taps it, the
// CHECK accepts it and the row stores `bad_timing`. Then `readAttempts` asks
// `PROOF_REASON_CODES` whether that is a reason, is told no, and writes it down as **`other`**:
//
//     const code: ProofReasonCode = isReason(f.reason_code) ? f.reason_code : 'other'
//
// So Vida's calibration evidence shows "Other" where the client said "Bad timing", and
// `whatChangedSentence` — the one line an operator reads before phoning them about it —
// cannot name the thing they actually said. The client's own words survived the database and
// were lost to a second list that had drifted.
//
// ⚠️ THE SEVEN ARE THE SUPERSET AND THE DATABASE ALREADY ACCEPTS THEM, so this list is the
// six-item one CORRECTED, never the seven-item one narrowed: narrowing would make a value
// already stored in production unreadable, which is the same defect pointing the other way.
//
// ⚠️ THIS FILE HAS NO IMPORTS ON PURPOSE. It is consumed by the API, the portal and the
// admin app, so anything it pulled in would be pulled into all three.
// ══════════════════════════════════════════════════════════════════════════════════════════

/** The chips a client may tap on a card they passed, in the order Milla renders them. */
export const LEAD_REASON_CODES = [
  'too_big', 'too_small', 'wrong_industry', 'wrong_role', 'wrong_geography', 'bad_timing', 'other',
] as const

export type LeadReasonCode = typeof LEAD_REASON_CODES[number]

/** What the client sees on the chip. Beside the code so the two can never drift apart. */
export const LEAD_REASON_LABELS: Record<LeadReasonCode, string> = {
  too_big:         'Too big',
  too_small:       'Too small',
  wrong_industry:  'Wrong industry',
  wrong_role:      'Wrong role',
  wrong_geography: 'Wrong geography',
  bad_timing:      'Bad timing',
  other:           'Other',
}

export function isLeadReasonCode(v: unknown): v is LeadReasonCode {
  return typeof v === 'string' && (LEAD_REASON_CODES as readonly string[]).includes(v)
}
