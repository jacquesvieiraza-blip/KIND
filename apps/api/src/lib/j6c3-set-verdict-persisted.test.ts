// ══════════════════════════════════════════════════════════════════════════════════════════
// J6-C3 · THE SET-LEVEL VERDICT IS RECORDED, AND VIDA CAN SEE IT
//
// REQ: *"Set-level verdict unlocks attempt 2; visible in Vida"* (PV 02).
//
// ── WHAT EXISTED: A SPEND GATE NOBODY COULD ACCOUNT FOR ─────────────────────────────────
//
// `mayRequestStrongerSet` is the one gate between a client and their SECOND automatic Proof
// attempt — real paid sourcing. It returned a bare boolean, derived from `lead_feedback` ×
// `leads` on every read, and then thrown away. So:
//
//   · nothing recorded WHY a second set was unlocked at the moment the client was looking at
//     the screen, and nothing recorded that it ever was;
//   · the refusal had no stated cause either — "the button is not there" was the whole of it;
//   · and the operator evidence panel, which exists precisely to answer questions about this
//     client's Proof, did not carry the verdict at all.
//
// ── WHAT THIS DOES *NOT* DO, AND THAT IS THE CARE ───────────────────────────────────────
//
// 🛑 IT DOES NOT CACHE THE GATE. The live derivation remains the only thing that decides
// whether a second set may be sourced. A persisted boolean beside a live one is two answers to
// one question, and the one that drifts is always the one nobody re-reads.
//
// ⚠️ SO WHAT IS PERSISTED IS AN EVENT: it was first unlocked at T, on this basis. An event
// cannot drift out of step with a derivation, because it is not a copy of one — it is a fact
// about a moment. Nothing reads it to spend, and a write failure cannot cost a client the set
// the rule already granted them.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  strongerSetVerdict, mayRequestStrongerSet, STRONGER_SET_REASON_COPY,
  type CalibrationState,
} from './proof-calibration'

/** A client one pass in, who marked a card with a reason. */
const BASE: CalibrationState = {
  clientId: 'c1', passesDone: 1, escalated: false, escalatedAt: null, resolvedAt: null,
  trigger: null, phone: null, contactName: null, phoneConfirmedAt: null, operatorNote: null,
  restartAt: null, restartUsedAt: null, resolvedBy: null, refinement: null,
  attempts: [{
    pass: 1, kind: 'automatic', surfaced: 20, looksRight: 3, notAFit: 2,
    reasons: { too_big: 2 }, notes: [],
  }],
} as unknown as CalibrationState

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE VERDICT STATES ITS CAUSE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J6-C3 · the set-level verdict answers WHY, not just whether', () => {
  it('🛑 unlocked by per-card feedback names that as the cause', () => {
    expect(strongerSetVerdict(BASE)).toEqual({ unlocked: true, because: 'per_card_feedback' })
  })

  it('a confirmed refinement is its own instruction, and is named as one', () => {
    const s = { ...BASE, attempts: [], refinement: { proposedAt: 'x', confirmedAt: 'y' } } as unknown as CalibrationState
    expect(strongerSetVerdict(s)).toEqual({ unlocked: true, because: 'confirmed_refinement' })
  })

  it('🛑 every REFUSAL is named too — "the button is not there" was the whole of it before', () => {
    const cases: [Partial<CalibrationState>, string][] = [
      [{ escalated: true }, 'escalated'],
      // ⛓️ 22 Sep — ~~`[{ passesDone: 2 }, 'not_on_pass_one']`~~ IS GONE, not moved. Refinement
      // is unlimited (founder-locked, "2. unlimited now"), so a client on pass 2 is refused by
      // NOTHING here — which is the change. The zero case below is what the reason means now.
      [{ passesDone: 0 }, 'not_on_pass_one'],
      [{ refinement: { proposedAt: 'x', confirmedAt: null } as never }, 'refinement_in_flight'],
      [{ attempts: [{ pass: 1, kind: 'automatic', surfaced: 20, looksRight: 0, notAFit: 4, reasons: {}, notes: [] }] as never }, 'no_usable_feedback'],
    ]
    for (const [over, because] of cases) {
      const v = strongerSetVerdict({ ...BASE, ...over } as CalibrationState)
      expect(v.unlocked, `${because} unlocked a paid second attempt`).toBe(false)
      expect(v.because).toBe(because)
    }
  })

  it('every reason has an operator sentence, and none of them is a score', () => {
    for (const k of Object.keys(STRONGER_SET_REASON_COPY) as (keyof typeof STRONGER_SET_REASON_COPY)[]) {
      expect(STRONGER_SET_REASON_COPY[k].length, `${k} has no sentence`).toBeGreaterThan(20)
    }
  })

  it('🛑 THE GATE IS UNCHANGED — one rule, delegated, never restated', () => {
    // Two copies of a spend gate is one copy too many. `mayRequestStrongerSet` is the name
    // every caller already uses and must keep answering exactly what it answered.
    const cases: Partial<CalibrationState>[] = [
      {}, { escalated: true }, { passesDone: 0 }, { passesDone: 2 },
      { refinement: { proposedAt: 'x', confirmedAt: null } as never },
      { refinement: { proposedAt: 'x', confirmedAt: 'y' } as never },
      { attempts: [] as never },
    ]
    for (const over of cases) {
      const s = { ...BASE, ...over } as CalibrationState
      expect(mayRequestStrongerSet(s)).toBe(strongerSetVerdict(s).unlocked)
    }
    const src = readFileSync(join(__dirname, 'proof-calibration.ts'), 'utf8')
    expect(src, 'the gate was restated instead of delegated')
      .toMatch(/export function mayRequestStrongerSet\(s: CalibrationState\): boolean \{\s*\n\s*return strongerSetVerdict\(s\)\.unlocked/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② IT IS RECORDED, ONCE, AND IT DECIDES NOTHING
// ═════════════════════════════════════════════════════════════════════════════════════════
type Row = Record<string, unknown>
const dbState: { clients: Row[] } = { clients: [] }
const updates: Row[] = []
let updateFails: { message: string; code?: string } | null = null

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: any = {
        _f: [] as ((r: Row) => boolean)[],
        select() { return q },
        eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
        is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
        not() { return q },
        or() { return q },
        order() { return q },
        limit() { return q },
        update(patch: Row) {
          updates.push(patch)
          q._patch = patch
          return q
        },
        _hit() { return dbState.clients.filter(r => q._f.every((f: (r: Row) => boolean) => f(r))) },
        async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
        async single() { return { data: q._hit()[0] ?? null, error: null } },
        then(res: (v: unknown) => unknown) {
          if (q._patch) {
            if (updateFails) return Promise.resolve({ data: null, error: updateFails }).then(res)
            const hit = q._hit()
            for (const r of hit) Object.assign(r, q._patch)
            return Promise.resolve({ data: hit, error: null }).then(res)
          }
          return Promise.resolve({ data: q._hit(), error: null }).then(res)
        },
      }
      return q
    },
    rpc: async () => ({ data: null, error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'x@y.z' } } }) } },
  },
}))

describe('J6-C3 · the verdict is recorded where it changes, exactly once', () => {
  beforeEach(() => {
    dbState.clients = [{ id: 'c1', proof_stronger_set_unlocked_at: null }]
    updates.length = 0
    updateFails = null
  })

  it('🛑 an unlocked verdict is written, with its reason code', async () => {
    const { recordStrongerSetVerdict } = await import('./proof-calibration-io')
    const r = await recordStrongerSetVerdict('c1', BASE)
    expect(r).toEqual({ recorded: true, reason: 'per_card_feedback' })
    expect(updates[0].proof_stronger_set_unlocked_reason).toBe('per_card_feedback')
    expect(String(updates[0].proof_stronger_set_unlocked_at ?? '')).toMatch(/^\d{4}-/)
  })

  it('🛑 WRITTEN ONCE — the recorded reason is the one that opened the door', async () => {
    // Every later call must match no row. Without the predicate the column would track
    // whatever was true the last time somebody filed feedback, which is a different fact.
    const { recordStrongerSetVerdict } = await import('./proof-calibration-io')
    await recordStrongerSetVerdict('c1', BASE)
    const again = await recordStrongerSetVerdict('c1', {
      ...BASE, attempts: [], refinement: { proposedAt: 'x', confirmedAt: 'y' },
    } as unknown as CalibrationState)
    expect(again).toEqual({ recorded: false, why: 'already' })
    expect(dbState.clients[0].proof_stronger_set_unlocked_reason).toBe('per_card_feedback')
  })

  it('a REFUSED verdict records nothing — the column is not a running state', async () => {
    const { recordStrongerSetVerdict } = await import('./proof-calibration-io')
    // ⛓️ 22 Sep — ~~`passesDone: 2`~~ is no longer a refusal; refinement is unlimited. The
    // rule this case is about — a REFUSED verdict writes nothing — is unchanged, so it is
    // proved with a state that is still genuinely refused.
    const r = await recordStrongerSetVerdict('c1', { ...BASE, passesDone: 0 } as CalibrationState)
    expect(r).toEqual({ recorded: false, why: 'not_unlocked' })
    expect(updates).toHaveLength(0)
  })

  it('🛑 a MISSING COLUMN names the migration and does not pretend it worked', async () => {
    updateFails = { message: 'column "proof_stronger_set_unlocked_at" does not exist', code: '42703' }
    const { recordStrongerSetVerdict, SET_VERDICT_MIGRATION } = await import('./proof-calibration-io')
    const r = await recordStrongerSetVerdict('c1', BASE)
    expect(r.recorded).toBe(false)
    if (r.recorded) throw new Error('unreachable')
    expect(r.why).toBe('migration_required')
    expect(String(r.detail)).toContain(SET_VERDICT_MIGRATION)
    // 🛑 AND IT SAYS THE CLIENT IS UNAFFECTED, because they are: the gate does not read this.
    expect(String(r.detail)).toMatch(/second attempt is UNAFFECTED|second attempt is unaffected/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ THE WIRING — WRITTEN WHERE THE JUDGEMENT LANDS, READ WHERE AN OPERATOR LOOKS
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J6-C3 · recorded on the feedback door, visible on the Vida panel', () => {
  const code = (p: string): string =>
    readFileSync(join(__dirname, p), 'utf8')
      .split('\n')
      .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')

  it('🛑 the feedback route records it — that is the only place the verdict can move', () => {
    const src = code('../routes/leads.ts')
    const at = src.indexOf("post('/:id/feedback'")
    expect(at).toBeGreaterThan(-1)
    const handler = src.slice(at, src.indexOf('\n})', at))
    expect(handler, 'a client\'s judgement about a set changes the verdict and records nothing')
      .toMatch(/recordStrongerSetVerdict\(/)
  })

  it('🛑 and it can never fail the client\'s feedback', () => {
    const src = code('../routes/leads.ts')
    const at = src.indexOf('recordStrongerSetVerdict(')
    const region = src.slice(Math.max(0, at - 400), at + 600)
    expect(region, 'a failed record takes the client\'s reaction down with it').toMatch(/catch/)
  })

  it('🛑 Vida\'s evidence panel carries the verdict AND the recorded event', () => {
    const src = code('../routes/operator.ts')
    const at = src.indexOf("'/proof-review/:clientId/evidence'")
    expect(at, 'the evidence route moved — this guard must be repointed').toBeGreaterThan(-1)
    const handler = src.slice(at, at + 9_000)
    // The live verdict — the actual gate, answered now.
    expect(handler, 'an operator cannot see whether this client has a second set')
      .toMatch(/stronger_set_unlocked: setVerdict\.unlocked/)
    expect(handler, 'the refusal or grant has no stated cause on the panel')
      .toMatch(/stronger_set_why: STRONGER_SET_REASON_COPY/)
    // The recorded event — a different fact, and the one "persisted" means.
    expect(handler).toMatch(/stronger_set_recorded_at: recordedAt/)
    expect(handler).toMatch(/stronger_set_recorded_reason: recordedReason/)
  })

  it('the panel keeps working before the migration runs', () => {
    // The columns are additive, so a read that errors must degrade to "not recorded" rather
    // than 500 an operator's whole calibration panel.
    const src = code('../routes/operator.ts')
    const at = src.indexOf('proof_stronger_set_unlocked_at')
    const region = src.slice(Math.max(0, at - 600), at + 800)
    expect(region).toMatch(/catch/)
  })

  it('the migration exists in both homes — O3 admits no other way to add a column', () => {
    expect(code('./pending-migrations.ts')).toMatch(/20260918_proof_set_verdict/)
    const sql = readFileSync(
      join(__dirname, '../../../../supabase/migrations/20260918_proof_set_verdict.sql'), 'utf8')
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS proof_stronger_set_unlocked_at/)
    expect(sql, 'a backfill would invent a verdict for a client nobody judged').toMatch(/NO BACKFILL/)
  })
})
