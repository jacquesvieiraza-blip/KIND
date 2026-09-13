import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }))

import { calibratedRestart, spendDoors, type CalibrationState } from './proof-calibration'
import { mayRestartCalibrated } from './proof-calibration-io'
import type { CalibrationRecord } from './proof-calibration-io'

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 EXACTLY ONE CALIBRATED RESTART, PER CLIENT, FOR THE CLIENT'S LIFETIME (R119).
//
// ── THE DRIFT THIS FILE EXISTS TO STOP, WHICH WAS LIVE IN `main` ───────────────────────
//
// `calibratedRestart` answered `used >= granted ? 'used' : 'available'`, and its own
// docstring called that deliberate: "A client can legitimately be granted a restart, spend
// it, be escalated again months later, be resolved again and be granted another — each
// resolution buys exactly one."
//
// That is a PER-RESOLUTION allowance, and R119 forbids it: "A SECOND CALIBRATED RESTART IS
// REFUSED, whatever happens later." It was reachable, not theoretical:
//
//   restart #1 granted and spent
//     -> the client asks again -> the claim is refused -> `icps.ts` re-opens the RESOLVED
//        review (proof_review_requested_at = now, proof_review_resolved_at = NULL)
//     -> an operator resolves again -> resolvedAt moves PAST the old grant
//     -> `restartAt >= resolvedAt` is now false -> the verdict allows grant #2
//     -> a newer grant makes `used >= granted` false -> 'available' again.
//
// Unbounded, one per cycle. It drifted because the 10–11 Sep restart rulings lived ONLY in
// the chat transcript — `docs/PRODUCT-RULES.md` contained no occurrence of "restart" until
// R119 was written, so the code became the de-facto authority.
//
// ⚠️ FOUR LAYERS ARE ASSERTED HERE, because a downstream constraint error is not a design:
// the STATE function, the operator VERDICT, the grant ROUTE, and the DATABASE index.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = join(__dirname, '../../../..')

/** Source with comments removed — every "must not contain" assertion needs this, because the
 *  struck code is quoted in the comments that explain why it was struck. */
function code(relPath: string): string {
  return readFileSync(join(REPO, relPath), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => {
      const dash = l.indexOf('--')
      const slash = l.search(/(?<!:)\/\//)
      const cut = [dash, slash].filter(i => i >= 0).sort((a, b) => a - b)[0]
      return cut === undefined ? l : l.slice(0, cut)
    })
    .join('\n')
}

const T1 = '2026-09-01T10:00:00.000Z'   // escalation
const T2 = '2026-09-02T10:00:00.000Z'   // resolution #1
const G1 = '2026-09-03T10:00:00.000Z'   // grant #1
const U1 = '2026-09-04T10:00:00.000Z'   // claimed
const T3 = '2026-09-10T10:00:00.000Z'   // resolution #2 — NEWER than the grant
const G2 = '2026-09-11T10:00:00.000Z'   // grant #2 — must never exist

function state(over: Partial<CalibrationState> = {}): CalibrationState {
  return { passesDone: 2, escalated: false, attempts: [], ...over }
}
function record(over: Partial<CalibrationRecord> = {}): CalibrationRecord {
  return {
    clientId: 'client-1', phone: '07700 900123', contactName: 'Ellis Warner',
    escalatedAt: T1, resolvedAt: T2, trigger: 'client_said_still_not_right',
    phoneConfirmedAt: T1, operatorNote: 'spoke to them, corrected the targeting',
    restartAt: null, restartUsedAt: null, resolvedBy: 'ops@get-kind.com',
    ...state(over as Partial<CalibrationState>),
    ...over,
  } as CalibrationRecord
}

// ── LAYER 1 — THE STATE FUNCTION ──────────────────────────────────────────────────────
describe('layer 1 — calibratedRestart(): used is TERMINAL', () => {
  it('no grant at all reads none', () => {
    expect(calibratedRestart(state())).toBe('none')
  })

  it('a granted, unspent restart reads available', () => {
    expect(calibratedRestart(state({ restartGrantedAt: G1 }))).toBe('available')
  })

  it('a spent restart reads used', () => {
    expect(calibratedRestart(state({ restartGrantedAt: G1, restartUsedAt: U1 }))).toBe('used')
  })

  it('🛑 A NEWER GRANT CANNOT REOPEN IT — this is the exact struck behaviour', () => {
    // Under `used >= granted` this returned 'available' again, because G2 > U1.
    expect(calibratedRestart(state({ restartGrantedAt: G2, restartUsedAt: U1 }))).toBe('used')
  })

  it('a consumption with no grant fails CLOSED, not open', () => {
    // Impossible under current code; a hand-edit or a restore must read as spent.
    expect(calibratedRestart(state({ restartUsedAt: U1 }))).toBe('used')
  })

  it('the struck timestamp comparison is gone from the source', () => {
    const src = code('apps/api/src/lib/proof-calibration.ts')
    expect(src).not.toMatch(/used\s*&&\s*used\s*>=\s*granted/)
  })
})

// ── LAYER 6 — MILLA (derives from layer 1) ────────────────────────────────────────────
describe('layer 6 — Milla never offers a second restart', () => {
  it('the automatic-proof door is OPEN for a granted, unspent restart', () => {
    expect(spendDoors(state({ restartGrantedAt: G1 })).automaticProofPass).toBe(true)
  })

  it('🛑 and SHUT once it is spent, whatever a later grant says', () => {
    expect(spendDoors(state({ restartGrantedAt: G1, restartUsedAt: U1 })).automaticProofPass).toBe(false)
    expect(spendDoors(state({ restartGrantedAt: G2, restartUsedAt: U1 })).automaticProofPass).toBe(false)
  })

  it('a client with an automatic attempt still in hand is unaffected', () => {
    expect(spendDoors(state({ passesDone: 1 })).automaticProofPass).toBe(true)
  })
})

// ── LAYER 2 — THE OPERATOR VERDICT (also layer 7, Vida reads it) ──────────────────────
describe('layer 2/7 — mayRestartCalibrated(): one grant, ever', () => {
  it('permits the FIRST grant after a real, noted resolution', () => {
    expect(mayRestartCalibrated(record()).allowed).toBe(true)
  })

  it('🛑 refuses once a grant exists — even with a NEWER resolution behind it', () => {
    const v = mayRestartCalibrated(record({ restartAt: G1, restartUsedAt: U1, resolvedAt: T3 }))
    expect(v.allowed).toBe(false)
    expect(v.why).toMatch(/already had their one calibrated restart/)
  })

  it('🛑 refuses an UNSPENT existing grant too — one grant, not one spend', () => {
    expect(mayRestartCalibrated(record({ restartAt: G1 })).allowed).toBe(false)
  })

  it('refuses a consumption with no grant rather than issuing a new one', () => {
    expect(mayRestartCalibrated(record({ restartUsedAt: U1 })).allowed).toBe(false)
  })

  it('the existing conditions are untouched — a restart still needs the whole ladder', () => {
    expect(mayRestartCalibrated(record({ passesDone: 1 })).allowed).toBe(false)
    expect(mayRestartCalibrated(record({ escalatedAt: null })).allowed).toBe(false)
    expect(mayRestartCalibrated(record({ resolvedAt: null })).allowed).toBe(false)
    expect(mayRestartCalibrated(record({ operatorNote: '   ' })).allowed).toBe(false)
  })

  it('the struck per-resolution comparison is gone from the source', () => {
    const src = code('apps/api/src/lib/proof-calibration-io.ts')
    expect(src).not.toMatch(/r\.restartAt\s*>=\s*r\.resolvedAt/)
  })
})

// ── LAYER 3 — THE GRANT ROUTE ─────────────────────────────────────────────────────────
describe('layer 3 — the grant route cannot write restart_at twice', () => {
  const op = code('apps/api/src/routes/operator.ts')

  it('🛑 the write itself is the guard — restart_at leaves NULL exactly once', () => {
    expect(op).toMatch(/\.is\('proof_calibrated_restart_at',\s*null\)/)
  })

  it('the struck per-resolution filter is gone', () => {
    expect(op).not.toMatch(/proof_calibrated_restart_at\.lt\./)
  })

  it('a stale verdict or a double-click gets the R119 sentence, not a second grant', () => {
    expect(op).toMatch(/already had their one calibrated restart\. There is no second restart/)
  })
})

// ── LAYER 4 — THE CLAIM FUNCTION · LAYER 5 — THE DATABASE INDEX ───────────────────────
describe('layers 4 and 5 — the ledger refuses, and the index is the backstop', () => {
  const sql = code('supabase/migrations/20260912_proof_pass_claims.sql')

  it('🛑 the claim function refuses with restart_already_used', () => {
    expect(sql).toMatch(/'restart_already_used'/)
    // It is asked BEFORE any insert, so the client gets a sentence rather than a DB error.
    const idx = sql.indexOf("'restart_already_used'")
    const insertIdx = sql.indexOf("values (p_client_id, 'calibrated_restart'")
    expect(idx).toBeLessThan(insertIdx)
  })

  it('🛑 the unique index is keyed on client_id ALONE, never on the grant', () => {
    const m = /create unique index if not exists proof_pass_claims_one_completed_restart\s*\n\s*on public\.proof_pass_claims \(([^)]*)\)/i.exec(sql)
    expect(m).toBeTruthy()
    expect(m![1].trim()).toBe('client_id')
  })

  it('restart_grant_at is stored as audit evidence and is in no unique key', () => {
    expect(sql).toMatch(/restart_grant_at timestamptz/)
    const uniqueKeys = sql.match(/create unique index[^;]*/gi) ?? []
    for (const k of uniqueKeys) expect(k).not.toContain('restart_grant_at')
  })

  it('re-escalation stays possible — it is the RESTART that is capped, not the review', () => {
    // `icps.ts` may still re-open a resolved review; nothing here forbids that, and R119 says
    // so explicitly. What it can no longer do is produce a second grant.
    const icps = code('apps/api/src/routes/icps.ts')
    expect(icps).toMatch(/proof_review_requested_at:\s*nowIso/)
    expect(icps).toMatch(/proof_review_resolved_at:\s*null/)
  })
})

// ── THE RULE IS IN THE REGISTER, NOT ONLY IN THE CODE ─────────────────────────────────
describe('R119 is recorded where it can be grepped', () => {
  const rules = readFileSync(join(REPO, 'docs/PRODUCT-RULES.md'), 'utf8')

  it('🛑 PRODUCT-RULES names the calibrated restart — it contained NO occurrence before this build', () => {
    expect(rules).toMatch(/R119/)
    expect(rules.toLowerCase()).toContain('calibrated restart')
  })

  it('it states every clause the founder listed', () => {
    for (const clause of [
      'Exactly ONE calibrated restart per client, ever.',
      'Two automatic Proof attempts.',
      'Explicit Still Not Right after attempt 2 may escalate.',
      'Human resolution may grant ONE calibrated restart.',
      'proof_passes_done remains 2.',
      'No third automatic Proof.',
      'A SECOND CALIBRATED RESTART IS REFUSED, whatever happens later.',
      'later re-escalation/review may exist, but can never create another restart grant',
    ]) {
      expect(rules, `R119 is missing the founder's clause: ${clause}`).toContain(clause)
    }
  })
})
