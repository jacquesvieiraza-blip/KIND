// ══════════════════════════════════════════════════════════════════════════════════════════
// J6-C4 · ONE REASON-CODE LIST (LR 6)
//
// ── FOUR COPIES, AND TWO OF THEM DISAGREED ─────────────────────────────────────────────
//
//   1. `lib/lead-feedback.ts`          — REASON_CODES, SEVEN, "exactly as the founder listed"
//   2. `lib/proof-calibration.ts`      — PROOF_REASON_CODES, SIX, WITHOUT `bad_timing`
//   3. `portal/.../milla/page.tsx`     — REASON_CHIPS, a hand-typed seven
//   4. `20260821_lead_feedback.sql`    — the CHECK constraint, seven
//
// 🛑 SO "BAD TIMING" WAS STORED AND THEN ERASED IN THE READ. The card renders the chip, the
// client taps it, the route stores it and the CHECK accepts it. Then `readAttempts` asks copy
// ② whether `bad_timing` is a reason, is told no, and records it as **`other`**:
//
//     const code: ProofReasonCode = isReason(f.reason_code) ? f.reason_code : 'other'
//
// Vida's calibration evidence then showed an operator "Other" where the client had said "Bad
// timing", and `whatChangedSentence` — the one line a person reads before phoning them about
// it — could not name the thing they actually said. The client's own answer survived the
// database and was lost to a second list that had drifted.
//
// ⚠️ THE SEVEN ARE THE SUPERSET AND THE DATABASE ALREADY STORES THEM. This is copy ②
// CORRECTED, never the seven narrowed: narrowing would make a value already in production
// unreadable, which is the same defect pointing the other way.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LEAD_REASON_CODES, LEAD_REASON_LABELS, isLeadReasonCode } from '@kind/shared'
import { REASON_CODES, REASON_LABELS, isReasonCode } from './lead-feedback'
import { PROOF_REASON_CODES, PROOF_REASON_LABELS } from './proof-calibration'

describe('J6-C4 · there is one list, and every name is the same object', () => {
  it('🛑 the API list and the calibration list ARE the shared one — not copies that agree', () => {
    // `toBe`, not `toEqual`. Two arrays that happen to hold the same strings today is exactly
    // the state this item exists to end; identity is the only assertion that cannot be
    // satisfied by a copy.
    expect(REASON_CODES, 'lead-feedback holds its own copy again').toBe(LEAD_REASON_CODES)
    expect(PROOF_REASON_CODES, 'proof-calibration holds its own copy again').toBe(LEAD_REASON_CODES)
    expect(REASON_LABELS).toBe(LEAD_REASON_LABELS)
    expect(PROOF_REASON_LABELS).toBe(LEAD_REASON_LABELS)
    expect(isReasonCode).toBe(isLeadReasonCode)
  })

  it('🛑 `bad_timing` IS a reason on both sides — the defect, stated as a test', () => {
    expect([...PROOF_REASON_CODES], 'the calibration side still cannot read "Bad timing"')
      .toContain('bad_timing')
    expect(isLeadReasonCode('bad_timing')).toBe(true)
    expect(PROOF_REASON_LABELS.bad_timing).toBe('Bad timing')
  })

  it('the seven, in the order the card renders them', () => {
    expect([...LEAD_REASON_CODES]).toEqual([
      'too_big', 'too_small', 'wrong_industry', 'wrong_role', 'wrong_geography', 'bad_timing', 'other',
    ])
  })

  it('every code has a label, and nothing is labelled with a code', () => {
    for (const c of LEAD_REASON_CODES) {
      expect(LEAD_REASON_LABELS[c], c).toBeTruthy()
      expect(LEAD_REASON_LABELS[c], `${c} is labelled with its own code`).not.toBe(c)
    }
  })

  it('an unknown value is still not a reason', () => {
    for (const bad of ['TOO_BIG', 'too big', '', null, 42, undefined, 'wrong_size']) {
      expect(isLeadReasonCode(bad), String(bad)).toBe(false)
    }
  })
})

describe('J6-C4 · the two copies that are not TypeScript still agree', () => {
  const code = (p: string): string =>
    readFileSync(join(__dirname, p), 'utf8')
      .split('\n')
      .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')

  it('🛑 the DATABASE CHECK accepts exactly these seven — a rejected chip loses the note too', () => {
    // Drift here is the worst kind: the card offers a chip, the client taps it, and the write
    // fails the constraint, taking their free text with it and showing nothing.
    const migration = readFileSync(
      join(__dirname, '../../../../supabase/migrations/20260821_lead_feedback.sql'), 'utf8')
    for (const c of LEAD_REASON_CODES) {
      expect(migration, `${c} missing from the CHECK`).toContain(`'${c}'`)
    }
    // And the runner's copy of the same DDL.
    for (const c of LEAD_REASON_CODES) {
      expect(code('./pending-migrations.ts'), `${c} missing from the runner's CHECK`).toContain(`'${c}'`)
    }
  })

  it('🛑 the Milla card DERIVES its chips — it was a hand-typed fourth copy', () => {
    const page = code('../../../portal/src/app/(milla)/milla/page.tsx')
    expect(page, 'the client card still hand-types the reason list')
      .toMatch(/LEAD_REASON_CODES\.map\(code => \(\{ code, label: LEAD_REASON_LABELS\[code\] \}\)\)/)
    // 🛑 AND THE OLD LITERAL IS GONE, not merely unused beside the new one.
    expect(page, 'a hand-typed chip literal is still in the card')
      .not.toMatch(/\{ code: 'too_big',\s*label:/)
  })

  it('the shared module stays importable by a browser — it is in three bundles', () => {
    // The portal and the admin app both import `@kind/shared`. Anything this file pulled in
    // would be pulled into both, so it pulls in nothing.
    const src = readFileSync(
      join(__dirname, '../../../../packages/shared/src/lead-reason-codes.ts'), 'utf8')
    expect(src, 'the one shared list started importing something').not.toMatch(/^\s*import\s/m)
  })
})
