import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 11 Sep (C39 / C43 / C07) — TWO AUTOMATIC ATTEMPTS, THEN A PERSON, THEN ONE RESTART.
//
// 🛑 THE DEFECT AT THE CENTRE OF THIS FILE WAS LIVE. `POST /operator/proof-review/:id/restart`
// granted "the one human-authorised extra Proof pass" and its own comment said the Proof path
// "becomes available once more for exactly one pass". It was not:
//   · `spendDoors` answered `proof_passes_done < 2` — false at 2, for ever;
//   · `try_claim_proof_pass` refuses at 2, for ever, and the count is never reset;
//   · nothing anywhere recorded that a granted restart had been SPENT.
// So an operator pressed a real button, an audit row was written, and the client got nothing.
// A button with no authority behind it is the thing C40 exists to forbid.
//
// ⚠️ THE FIX IS A SECOND NARROW DOOR, NEVER A WIDER ONE. `proof_passes_done` stays at 2 for
// ever and the claim RPC is untouched — a restart is claimed by its own compare-and-set
// against `proof_calibrated_restart_used_at`, so one grant buys exactly one set.
//
// ⚠️ AND UNCERTAINTY IS NOT PERMISSION (C43). A calibration state we could not read means we
// do not know whether this client is escalated, whether a restart was granted, or whether it
// has been spent — and the one thing that must not follow is sourcing.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  client: null as Row | null,
  leads: [] as Row[],
  feedback: [] as Row[],
  /** the clients read fails — "we do not know where this client stands" */
  unreadable: false,
  /** the write fails, e.g. the migration has not been applied */
  unwritable: false,
  /**
   * ⚑ DAY-2 — `leads.proof_batch_kind` DOES NOT EXIST. A calibrated restart needs BOTH
   * migrations: the authority columns AND the provenance column its rows carry. This
   * simulates the partial deployment where only the first has been applied.
   */
  provenanceMissing: false,
  writes: [] as Row[],
}

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  let selected = ''
  const rows = (): Row[] =>
    name === 'clients' ? (state.client ? [state.client] : [])
    : name === 'leads' ? state.leads
    : name === 'lead_feedback' ? state.feedback
    : []
  const q: Record<string, unknown> = {
    select(cols?: string) { selected = cols ?? ''; return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    not(c: string, _op: string, v: unknown) { filters.push(r => (r[c] ?? null) !== v); return q },
    or() { return q },
    order() { return q },
    limit() { return q },
    async maybeSingle() {
      if (name === 'clients' && state.unreadable) return { data: null, error: { message: 'could not read clients' } }
      const hit = rows().filter(r => filters.every(f => f(r)))
      return { data: hit[0] ?? null, error: null }
    },
    update(patch: Row) {
      const u: Record<string, unknown> = {
        eq() { return u }, is() { return u }, not() { return u }, or() { return u },
        select() { return u },
        then(resolve: (v: unknown) => unknown) {
          if (state.unwritable) return resolve({ data: null, error: { message: 'column proof_calibrated_restart_used_at does not exist' } })
          state.writes.push(patch)
          // ⚠️ THE COMPARE-AND-SET IS SIMULATED HONESTLY: a restart already used later than
          // the grant matches no row, which is how a second claim is refused in production.
          const c = state.client
          if (patch.proof_calibrated_restart_used_at && c) {
            const used = c.proof_calibrated_restart_used_at as string | null
            const granted = c.proof_calibrated_restart_at as string | null
            if (!granted || (used && used >= granted)) return resolve({ data: [], error: null })
          }
          if (c) Object.assign(c, patch)
          return resolve({ data: [{ id: 'client-1' }], error: null })
        },
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) {
      if (name === 'clients' && state.unreadable) return resolve({ data: null, error: { message: 'could not read clients' } })
      // ⚑ DAY-2 — the capability probe reads `leads.proof_batch_kind`. Postgres answers 42703
      // for a missing column, and supabase-js RESOLVES with `{ error }` rather than throwing.
      // ⚠️ ONLY THE SELECT THAT ASKS FOR IT FAILS, which is how Postgres behaves: a query
      // naming a missing column errors, and the same query without it succeeds. That is what
      // makes `readAttempts`' fallback meaningful rather than a blanket try/catch.
      if (name === 'leads' && state.provenanceMissing && selected.includes('proof_batch_kind')) {
        return resolve({ data: null, error: { code: '42703', message: 'column leads.proof_batch_kind does not exist' } })
      }
      return resolve({ data: rows().filter(r => filters.every(f => f(r))), error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))

import {
  calibratedRestart, spendDoors, calibrationVerdict, mayRequestStrongerSet,
  attemptLabel, calibrationContactReady,
  type CalibrationState, type AttemptSummary,
} from './proof-calibration'

const attempt = (pass: number, over: Partial<AttemptSummary> = {}): AttemptSummary =>
  ({ pass, kind: 'automatic', surfaced: 20, looksRight: 0, notAFit: 0, reasons: {}, notes: [], ...over })

const st = (over: Partial<CalibrationState> = {}): CalibrationState =>
  ({ passesDone: 2, escalated: false, attempts: [attempt(1), attempt(2)], ...over })

// ⚠️ DELIBERATELY IN THE PAST, and the first draft of this file got it wrong in a way worth
// recording: the fixtures were stamped LATER than the test clock, so a claim written with
// `new Date()` landed BEFORE its own grant and `calibratedRestart` read the restart as still
// available — a second claim succeeded. In production both timestamps come from the same
// server clock and the grant always precedes the claim, so the ordering comparison is sound;
// a fixture that inverts it is testing a state the product cannot reach.
const ESCALATED = '2026-09-10T10:30:00Z'
const RESOLVED  = '2026-09-10T10:50:00Z'
const GRANTED   = '2026-09-10T11:00:00Z'

beforeEach(() => {
  state.client = null
  state.leads = []
  state.feedback = []
  state.unreadable = false
  state.unwritable = false
  state.provenanceMissing = false
  state.writes = []
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('11 · 12 · 27 · the two automatic attempts are spent for ever', () => {
  it('🛑 12 · A · no third AUTOMATIC pass is ever open, whatever else is true', () => {
    expect(spendDoors(st({ passesDone: 2 })).automaticProofPass).toBe(false)
    expect(spendDoors(st({ passesDone: 3 })).automaticProofPass).toBe(false)
  })

  it('🛑 27 · E · the restart does not touch the count — it is a different fact entirely', () => {
    const withRestart = st({ passesDone: 2, restartGrantedAt: GRANTED })
    expect(withRestart.passesDone, 'the restart reset the automatic attempts').toBe(2)
    expect(calibratedRestart(withRestart)).toBe('available')
  })

  it('11 · a client mid-loop still has their second automatic attempt', () => {
    expect(spendDoors(st({ passesDone: 1, attempts: [attempt(1, { notAFit: 3, reasons: { wrong_role: 3 } })] }))
      .automaticProofPass).toBe(true)
  })

  it('🛑 10 · 28 · 34 · the label comes from PROVENANCE, never from a pass number', () => {
    expect(attemptLabel({ pass: 1, kind: 'automatic' })).toBe('Automatic attempt 1')
    expect(attemptLabel({ pass: 2, kind: 'automatic' })).toBe('Automatic attempt 2')
    // 🛑 THE RESTART SHARES PASS 2's NUMBER AND IS STILL NOT AN AUTOMATIC ATTEMPT. That is
    // the whole point of the discriminator: the label cannot be derived from the number, so
    // it is derived from the thing the row actually says.
    expect(attemptLabel({ pass: 2, kind: 'calibrated_restart' })).toBe('Calibrated restart')
    expect(attemptLabel({ pass: 2, kind: 'calibrated_restart' })).not.toMatch(/attempt/i)
  })

  it('🛑 7 · 8 · 12 · no proof row may ever carry pass 3 — the DATABASE refuses it', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const REPO = join(__dirname, '../../../..')
    // ⚠️ THE CONSTRAINT IS THE PROOF, NOT A CONVENTION. `proof_pass = 3` was unreachable:
    // every restart insert would have been REJECTED. Asserted against the migration so a
    // future edit cannot quietly widen it to admit a third automatic attempt.
    const attribution = readFileSync(join(REPO, 'supabase/migrations/20260903_lead_proof_attribution.sql'), 'utf8')
    expect(attribution).toContain('proof_pass IS NULL OR proof_pass IN (1, 2)')
    // And no source file writes a 3 into it.
    for (const f of ['apps/api/src/routes/icps.ts', 'apps/api/src/lib/proof-calibration.ts', 'apps/api/src/lib/proof-calibration-io.ts']) {
      const code = readFileSync(join(REPO, f), 'utf8')
        .split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n')
      expect(code, `${f} writes a third proof pass`).not.toMatch(/proof_pass:\s*3\b/)
      expect(code, `${f} still carries the withdrawn CALIBRATED_RESTART_PASS`).not.toContain('CALIBRATED_RESTART_PASS')
    }
  })

  it('🛑 9 · the restart run is dispatched with explicit provenance, not a pass number', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const icps = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    expect(icps).toContain("proofKind: batchKind")
    expect(icps).toContain("proof_batch_kind: opts!.proofKind ?? 'automatic'")
    // ⚠️ WRITTEN IN THE SAME STATEMENT AS THE PASS AND THE SURFACING. A row that is visible
    // and attributed to an attempt but carries no provenance reads as an automatic one.
    const at = icps.indexOf('proof_pass: opts!.proofPass')
    expect(icps.slice(at, at + 400)).toContain('proof_batch_kind')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('23 · 25 · 29 · where the one calibrated restart stands', () => {
  it('🛑 23 · D · nothing granted means nothing available', () => {
    expect(calibratedRestart(st())).toBe('none')
    expect(spendDoors(st()).automaticProofPass).toBe(false)
  })

  it('🛑 25 · a grant makes exactly one set available', () => {
    const s = st({ restartGrantedAt: GRANTED })
    expect(calibratedRestart(s)).toBe('available')
    expect(spendDoors(s).automaticProofPass, 'C39: the grant bought a pass that could not be taken').toBe(true)
  })

  it('🛑 29 · 30 · F · once spent it is gone, and the door closes behind it', () => {
    const s = st({ restartGrantedAt: GRANTED, restartUsedAt: '2026-09-10T11:05:00Z' })
    expect(calibratedRestart(s)).toBe('used')
    expect(spendDoors(s).automaticProofPass, 'a second restart was available').toBe(false)
  })

  it('a LATER grant after an earlier use is available again — one resolution, one set', () => {
    // A client legitimately escalated, was resolved, spent their set, escalated again months
    // later and was resolved again. Each resolution buys exactly one.
    const s = st({ restartUsedAt: '2026-09-10T11:05:00Z', restartGrantedAt: '2026-10-01T09:00:00Z' })
    expect(calibratedRestart(s)).toBe('available')
  })

  it('🛑 31 · and a spent restart still leaves NO automatic attempt behind it', () => {
    const s = st({ passesDone: 2, restartGrantedAt: GRANTED, restartUsedAt: '2026-09-10T11:05:00Z' })
    expect(spendDoors(s).automaticProofPass).toBe(false)
    expect(spendDoors(s).strongerExamplesControl).toBe(false)
    expect(spendDoors(s).perCardFindMore).toBe(false)
    expect(spendDoors(s).chatSourcingRequest).toBe(false)
  })

  it('🛑 an OPEN escalation closes every door, granted restart or not', () => {
    const s = st({ escalated: true, restartGrantedAt: GRANTED })
    expect(spendDoors(s).automaticProofPass).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('13 · 15 · 17 · escalation has exactly one trigger', () => {
  const rejected = st({ attempts: [attempt(1), attempt(2, { notAFit: 20, reasons: { wrong_industry: 20 } })] })

  it('🛑 13 · C · silence after Attempt 2 escalates nothing', () => {
    expect(calibrationVerdict(rejected, 'none')).toEqual({ close: false })
  })

  it('🛑 6 · 15 · B · individual "Not a fit" marks escalate nothing, however many', () => {
    expect(calibrationVerdict(rejected, 'gave_feedback')).toEqual({ close: false })
    const one = st({ attempts: [attempt(1), attempt(2, { notAFit: 1, reasons: { wrong_role: 1 } })] })
    expect(calibrationVerdict(one, 'gave_feedback')).toEqual({ close: false })
  })

  it('🛑 17 · the explicit act AFTER Attempt 2 does escalate', () => {
    expect(calibrationVerdict(rejected, 'still_not_right'))
      .toEqual({ close: true, trigger: 'client_said_still_not_right' })
  })

  it('🛑 16 · the same act BEFORE Attempt 2 does NOT create the post-Attempt-2 state', () => {
    const midLoop = st({ passesDone: 1, attempts: [attempt(1, { notAFit: 5 })] })
    expect(calibrationVerdict(midLoop, 'still_not_right')).toEqual({ close: false })
    expect(spendDoors(midLoop).automaticProofPass, 'their second attempt was taken away').toBe(true)
  })

  it('🛑 14 · and nothing about silence opens a spend door', () => {
    const quiet = st({ attempts: [attempt(1), attempt(2)] })
    expect(spendDoors(quiet).automaticProofPass).toBe(false)
    expect(spendDoors(quiet).strongerExamplesControl).toBe(false)
    expect(calibratedRestart(quiet), 'silence granted a restart').toBe('none')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('8 · 9 · J · an interpreted refinement is not a mandate to spend', () => {
  const onePass = (over: Partial<CalibrationState> = {}) =>
    st({ passesDone: 1, attempts: [attempt(1, { notAFit: 3, reasons: { wrong_role: 3 } })], ...over })

  it('🛑 8 · J · a PROPOSED refinement closes the improved-set door until they confirm', () => {
    const s = onePass({ refinement: { clientWords: 'more senior people', proposedAt: GRANTED, confirmedAt: null } })
    expect(mayRequestStrongerSet(s), 'the model interpreting something sourced Attempt 2').toBe(false)
    expect(spendDoors(s).strongerExamplesControl).toBe(false)
  })

  it('🛑 9 · and their confirmation is what reopens it', () => {
    const s = onePass({ refinement: { clientWords: 'more senior people', proposedAt: GRANTED, confirmedAt: '2026-09-10T11:10:00Z' } })
    expect(mayRequestStrongerSet(s)).toBe(true)
  })

  it('7 · a confirmed refinement is itself the instruction — no card marking required', () => {
    const s = st({
      passesDone: 1, attempts: [attempt(1)],   // nothing marked at all
      refinement: { clientWords: 'agencies, not in-house teams', proposedAt: GRANTED, confirmedAt: '2026-09-10T11:10:00Z' },
    })
    expect(mayRequestStrongerSet(s)).toBe(true)
  })

  it('per-card feedback still works on its own — nothing was taken away', () => {
    expect(mayRequestStrongerSet(onePass())).toBe(true)
  })

  it('a row with NO refinement behaves exactly as it did before the gate existed', () => {
    expect(mayRequestStrongerSet(onePass({ refinement: null }))).toBe(true)
    expect(mayRequestStrongerSet(onePass({ refinement: undefined }))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('18 · 19 · the human calibration call needs a name and a number', () => {
  it('🛑 18 · both are required before the call can happen', () => {
    expect(calibrationContactReady(null, null)).toEqual({ ready: false, missing: ['name', 'phone'] })
    expect(calibrationContactReady('07700 900123', null)).toEqual({ ready: false, missing: ['name'] })
    expect(calibrationContactReady(null, 'Ellis')).toEqual({ ready: false, missing: ['phone'] })
  })

  it('🛑 19 · and neither is asked for again once we hold it', () => {
    expect(calibrationContactReady('07700 900123', 'Ellis')).toEqual({ ready: true, missing: [] })
  })

  it('a blank or unusable value is not an answer', () => {
    expect(calibrationContactReady('   ', 'Ellis').missing).toEqual(['phone'])
    expect(calibrationContactReady('123', 'Ellis').missing).toEqual(['phone'])
    expect(calibrationContactReady('07700 900123', '  ').missing).toEqual(['name'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('22 · 24 · 26 · 32 · the restart grant, against the real record', () => {
  const seed = (over: Row = {}) => {
    state.client = {
      id: 'client-1', phone: '07700 900123', proof_passes_done: 2,
      proof_review_requested_at: ESCALATED, proof_review_resolved_at: RESOLVED,
      proof_escalation_trigger: 'client_said_still_not_right',
      proof_calibration_note: 'Spoke to Ellis — they meant agencies, not in-house teams.',
      proof_calibrated_restart_at: null, proof_calibrated_restart_used_at: null,
      proof_completed_at: null, proof_phone_confirmed_at: null,
      ...over,
    }
  }

  const read = async () => {
    const { readCalibration } = await import('./proof-calibration-io')
    return readCalibration('client-1')
  }

  it('🛑 25 · a resolved, noted, twice-failed client may be granted one', async () => {
    seed()
    const { mayRestartCalibrated } = await import('./proof-calibration-io')
    expect(mayRestartCalibrated(await read()).allowed).toBe(true)
  })

  it('🛑 23 · D · but not before the human resolution is recorded', async () => {
    seed({ proof_review_resolved_at: null })
    const { mayRestartCalibrated } = await import('./proof-calibration-io')
    const v = mayRestartCalibrated(await read())
    expect(v.allowed).toBe(false)
    expect(v.why).toContain('has not been resolved')
  })

  it('🛑 …nor without a resolution note — a restart on an unexamined client', async () => {
    seed({ proof_calibration_note: '   ' })
    const { mayRestartCalibrated } = await import('./proof-calibration-io')
    expect(mayRestartCalibrated(await read()).allowed).toBe(false)
  })

  it('🛑 24 · nor when fewer than two automatic attempts were used', async () => {
    seed({ proof_passes_done: 1 })
    const { mayRestartCalibrated } = await import('./proof-calibration-io')
    const v = mayRestartCalibrated(await read())
    expect(v.allowed).toBe(false)
    expect(v.why).toContain('1 of their two automatic attempts')
  })

  it('🛑 22 · nor against a client who never validly escalated', async () => {
    seed({ proof_review_requested_at: null })
    const { mayRestartCalibrated } = await import('./proof-calibration-io')
    const v = mayRestartCalibrated(await read())
    expect(v.allowed).toBe(false)
    expect(v.why).toContain('never escalated')
  })

  it('🛑 F · nor twice on one resolution', async () => {
    seed({ proof_calibrated_restart_at: GRANTED })
    const { mayRestartCalibrated } = await import('./proof-calibration-io')
    expect(mayRestartCalibrated(await read()).allowed).toBe(false)
  })

  // ── 26 · 29 · 30 · THE CLAIM ITSELF ────────────────────────────────────────────────
  it('🛑 26 · the granted restart can actually be CLAIMED, at proof_passes_done = 2', async () => {
    seed({ proof_calibrated_restart_at: GRANTED })
    const { claimCalibratedRestart } = await import('./proof-calibration-io')
    const r = await claimCalibratedRestart('client-1')
    expect(r.ok, 'C39: the grant still bought a pass that could not be taken').toBe(true)
  })

  it('🛑 27 · E · and the claim never touches proof_passes_done', async () => {
    seed({ proof_calibrated_restart_at: GRANTED })
    const { claimCalibratedRestart } = await import('./proof-calibration-io')
    await claimCalibratedRestart('client-1')
    expect(state.client!.proof_passes_done, 'the restart reset the automatic attempts').toBe(2)
    for (const w of state.writes) {
      expect(Object.keys(w), 'a write touched the automatic attempt count').not.toContain('proof_passes_done')
    }
  })

  it('🛑 29 · 30 · F · a second claim gets nothing, and writes nothing', async () => {
    seed({ proof_calibrated_restart_at: GRANTED })
    const { claimCalibratedRestart } = await import('./proof-calibration-io')
    expect((await claimCalibratedRestart('client-1')).ok).toBe(true)
    state.writes = []
    const again = await claimCalibratedRestart('client-1')
    expect(again.ok).toBe(false)
    expect(again.ok === false && again.reason).toBe('already_used')
    expect(state.writes, 'a second restart wrote to the row').toEqual([])
  })

  it('🛑 23 · D · an ungranted restart cannot be claimed at all', async () => {
    seed()
    const { claimCalibratedRestart } = await import('./proof-calibration-io')
    const r = await claimCalibratedRestart('client-1')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('not_available')
    expect(state.writes).toEqual([])
  })

  it('🛑 32 · 33 · H · an unreadable state claims NOTHING and says so as retryable', async () => {
    seed({ proof_calibrated_restart_at: GRANTED })
    state.unreadable = true
    const { claimCalibratedRestart } = await import('./proof-calibration-io')
    const r = await claimCalibratedRestart('client-1')
    expect(r.ok, 'a failed read exposed the restart').toBe(false)
    expect(r.ok === false && r.reason).toBe('unreadable')
    expect(r.ok === false && r.detail).toContain('nothing was spent')
    expect(state.writes).toEqual([])
  })

  it('🛑 an un-migrated database names the migration and grants nothing', async () => {
    seed({ proof_calibrated_restart_at: GRANTED })
    state.unwritable = true
    const { claimCalibratedRestart, RESTART_MIGRATION } = await import('./proof-calibration-io')
    const r = await claimCalibratedRestart('client-1')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.detail).toContain(RESTART_MIGRATION)
    expect(r.ok === false && r.detail).toContain('nothing was spent')
  })

  // ── 34 · 35 · THE HISTORY SURVIVES ─────────────────────────────────────────────────
  it('🛑 34 · the escalation is still readable after the restart is granted and spent', async () => {
    seed({ proof_calibrated_restart_at: GRANTED })
    const { claimCalibratedRestart } = await import('./proof-calibration-io')
    await claimCalibratedRestart('client-1')
    const after = await read()
    expect(after.escalatedAt, 'the record that they escalated was erased').toBe(ESCALATED)
    expect(after.resolvedAt).toBe(RESOLVED)
    expect(after.trigger).toBe('client_said_still_not_right')
    expect(after.restartAt).toBe(GRANTED)
    expect(after.restartUsedAt).toBeTruthy()
    expect(after.passesDone).toBe(2)
  })

  it('🛑 35 · and one persisted truth answers both surfaces — no second derivation', async () => {
    seed({ proof_calibrated_restart_at: GRANTED })
    const a = await read()
    const b = await read()
    expect(calibratedRestart(a)).toBe(calibratedRestart(b))
    expect(a.doors).toEqual(b.doors)
  })

  it('an un-migrated row reads as "never granted", i.e. exactly today’s behaviour', async () => {
    // The five new columns are simply absent from the row.
    state.client = {
      id: 'client-1', proof_passes_done: 2,
      proof_review_requested_at: ESCALATED, proof_review_resolved_at: RESOLVED,
    }
    const r = await read()
    expect(calibratedRestart(r)).toBe('none')
    expect(r.refinement, 'an absent refinement read as one in flight').toBeNull()
    expect(mayRequestStrongerSet(r)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('36 · none of this needs a provider', () => {
  it('the decision module imports nothing that can spend', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('./proof-calibration.ts', import.meta.url), 'utf8')
    expect(src).not.toMatch(/^import /m)
    for (const forbidden of ['apollo', 'pdl', 'peopledatalabs', 'fetch(', 'axios']) {
      expect(src.toLowerCase(), `the pure rule module reaches ${forbidden}`).not.toContain(forbidden)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ DAY-2 SAFETY PATCH — THE TWO MIGRATIONS ARE A PAIR, AND THE RESTART PROVES IT FIRST.
//
// 🛑 THE PARTIAL DEPLOYMENT THIS MAKES IMPOSSIBLE. A calibrated restart needs BOTH
// `20260911_proof_restart_and_refinement` (the one-use authority) and
// `20260911_lead_proof_batch_kind` (the provenance its rows carry). They are separate runner
// entries, and the deploy that carries the code can reach production before either lands:
//
//     the authority columns exist  →  the restart is claimed and CONSUMED
//     →  `leads.proof_batch_kind` is missing  →  the batch cannot say what produced it
//     →  the client's one restart is spent on rows that read as an automatic attempt,
//        or on an insert that fails, and it cannot be given back.
//
// ⚠️ A ONE-USE AUTHORITY MUST NOT BE SPENT ON A WRITE THAT CANNOT COMPLETE. Documented
// migration ordering is a note to a human; this is the check.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 DAY-2 · a restart is never consumed unless its provenance can be persisted', () => {
  const ready = (over: Row = {}) => {
    state.client = {
      id: 'client-1', phone: '07700 900123', proof_passes_done: 2,
      proof_review_requested_at: ESCALATED, proof_review_resolved_at: RESOLVED,
      proof_escalation_trigger: 'client_said_still_not_right',
      proof_calibration_note: 'Spoke to Ellis — agencies only.',
      proof_calibrated_restart_at: GRANTED, proof_calibrated_restart_used_at: null,
      proof_completed_at: null, proof_phone_confirmed_at: null,
      ...over,
    }
  }
  const claim = async () => {
    const { claimCalibratedRestart } = await import('./proof-calibration-io')
    return claimCalibratedRestart('client-1')
  }

  it('🛑 1 · the RESTART AUTHORITY migration is missing → the claim fails and names it', async () => {
    ready()
    state.unwritable = true       // the authority column does not exist
    const r = await claim()
    const { RESTART_MIGRATION } = await import('./proof-calibration-io')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.detail).toContain(RESTART_MIGRATION)
    expect(r.ok === false && r.detail).toContain('nothing was spent')
  })

  it('🛑 2 · the PROVENANCE migration is missing → the claim fails and names that one', async () => {
    ready()
    state.provenanceMissing = true
    const r = await claim()
    const { PROVENANCE_MIGRATION } = await import('./proof-calibration-io')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('provenance_unavailable')
    expect(r.ok === false && r.detail).toContain(PROVENANCE_MIGRATION)
  })

  it('🛑 3 · 6 · authority present + provenance absent → restart_used_at stays UNSET', async () => {
    ready()
    state.provenanceMissing = true
    await claim()
    expect(state.client!.proof_calibrated_restart_used_at,
      'the client’s one restart was consumed on a batch that could not record what produced it').toBeNull()
    expect(state.writes, 'a write was attempted with the provenance column missing').toEqual([])
  })

  it('🛑 6 · …and the restart is still AVAILABLE afterwards — nothing was lost', async () => {
    ready()
    state.provenanceMissing = true
    await claim()
    const { readCalibration } = await import('./proof-calibration-io')
    expect(calibratedRestart(await readCalibration('client-1'))).toBe('available')
    // And the same press succeeds the moment the outstanding migration is applied.
    state.provenanceMissing = false
    expect((await claim()).ok).toBe(true)
  })

  it('🛑 4 · both capabilities present → exactly one restart may be claimed', async () => {
    ready()
    expect((await claim()).ok).toBe(true)
    const again = await claim()
    expect(again.ok, 'a second restart was claimable').toBe(false)
    expect(again.ok === false && again.reason).toBe('already_used')
  })

  it('🛑 5 · the restart batch persists `proof_batch_kind = calibrated_restart` on its rows', async () => {
    const { readFileSync } = await import('node:fs')
    const icps = readFileSync(new URL('../routes/icps.ts', import.meta.url), 'utf8')
    // ⚠️ ON THE ONE SURFACING UPDATE, so provenance lands on EVERY row of the batch in the
    // same statement that makes them visible — no partial batch can lose it.
    const at = icps.indexOf('surfaced_for_approval_at: nowIso, delivered_at: nowIso')
    expect(at, 'the surfacing update is gone').toBeGreaterThan(-1)
    const stmt = icps.slice(at, at + 1000)
    expect(stmt).toContain("proof_batch_kind: opts!.proofKind ?? 'automatic'")
    expect(stmt).toContain(".in('id', gatedIds)")
    expect(icps).toContain("const batchKind: 'automatic' | 'calibrated_restart' = calibratedRestart ? 'calibrated_restart' : 'automatic'")
    expect(icps).toContain('proofKind: batchKind')
  })

  it('🛑 the refusal is RETRYABLE at the route, never a final "your set is used"', async () => {
    const { readFileSync } = await import('node:fs')
    const icps = readFileSync(new URL('../routes/icps.ts', import.meta.url), 'utf8')
    expect(icps).toContain("claim.reason === 'unreadable' || claim.reason === 'provenance_unavailable'")
    expect(icps).toContain('res.status(retryable ? 503 : 409)')
  })

  it('🛑 the probe costs nothing and fails closed on any doubt', async () => {
    const { proofProvenanceAvailable } = await import('./proof-calibration-io')
    expect(await proofProvenanceAvailable()).toBe(true)
    state.provenanceMissing = true
    expect(await proofProvenanceAvailable()).toBe(false)
    // ⚠️ AND AN EMPTY `leads` TABLE IS "AVAILABLE", NOT "UNKNOWN" — `limit(0)` asks about the
    // COLUMN, so a client with no leads yet is never refused their restart.
    state.provenanceMissing = false
    state.leads = []
    expect(await proofProvenanceAvailable()).toBe(true)
  })
})
