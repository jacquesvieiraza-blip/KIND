import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  acceptCalibrationResponse, calibrationActionable, CALIBRATION_MISMATCH_COPY,
  type CalibrationAcceptance,
} from './vida-calibration-isolation'

// ═══════════════════════════════════════════════════════════════════════════════════════
// R1 — CALIBRATION EVIDENCE BELONGS TO ONE CLIENT, AND ONLY THAT CLIENT MAY BE ACTED ON.
//
// 🛑 THE DEFECT. `calib` lives at PAGE level and the workspace switches client in place. It
// was not in the client-switch reset, the loader had no cancellation or identity check, and
// the server's own `client_id` was never compared — while `resolveCalibration(selected)` and
// `grantCalibratedRestart(selected)` target the CURRENT client. So a slow read for client A,
// landing after the operator moved to B, put A's attempt history, phone and note on screen
// while the restart button granted **B** a free Proof set.
//
// ⚠️ THE RACES BELOW ARE DRIVEN, NOT DESCRIBED. `runOrdered` reproduces the loader's exact
// generation discipline and lets each response be resolved in a chosen order, so "A finishes
// after B was selected but before B's response" is a real sequence of calls with a real
// outcome — not a comment claiming it is handled.
// ═══════════════════════════════════════════════════════════════════════════════════════

const A = 'client-A'
const B = 'client-B'

/** A payload as the server sends it: it states its own owner. */
const payload = (owner: string | null) => ({ client_id: owner, may_restart: true })

// ── THE DRIVER ────────────────────────────────────────────────────────────────────────
// A faithful model of the page: one generation counter bumped on every switch, one `view`
// that only an ACCEPTED response may write, and a selection that can change mid-flight.
class Workspace {
  generation = 0
  selected: string | null = null
  view: { client_id?: string | null } | null = null
  error: string | null = null
  /** Every verdict, in order — so a test can assert what was discarded and why. */
  verdicts: Array<{ forClient: string; verdict: CalibrationAcceptance }> = []

  /** The client-switch reset: bump first, clear, then (maybe) load. */
  select(clientId: string | null) {
    this.generation += 1
    this.view = null
    this.error = null
    this.selected = clientId
  }

  /** Issue a read for the currently selected client; returns its deliver() thunk. */
  issue(forClient: string) {
    const generation = this.generation
    return (ownerInPayload: string | null) => {
      const verdict = acceptCalibrationResponse({
        requestedClientId: forClient,
        payloadClientId:   ownerInPayload,
        selectedClientId:  this.selected,
        requestGeneration: generation,
        currentGeneration: this.generation,
      })
      this.verdicts.push({ forClient, verdict })
      if (verdict !== 'accept') {
        if (verdict === 'identity_mismatch') this.error = CALIBRATION_MISMATCH_COPY
        return verdict
      }
      this.view = payload(ownerInPayload)
      return verdict
    }
  }

  /** What the page would offer: the two calibration authorities. */
  get actionable() { return calibrationActionable(this.view, this.selected) }
}

describe('🛑 R1-A · A completes AFTER B is selected but BEFORE B answers', () => {
  it('A’s result is discarded, no A evidence appears for B, and nothing is actionable', () => {
    const w = new Workspace()
    w.select(A)
    const deliverA = w.issue(A)
    w.select(B)
    const deliverB = w.issue(B)

    expect(deliverA(A)).toBe('stale_generation')       // A lands first, and is dropped
    expect(w.view, 'A’s evidence was written into B’s view').toBeNull()
    expect(w.actionable, 'a calibration authority was offered from a discarded response').toBe(false)

    deliverB(B)                                        // …then B arrives and fills the view
    expect(w.view?.client_id).toBe(B)
    expect(w.actionable).toBe(true)
  })
})

describe('🛑 R1-B · B answers first, then A lands late', () => {
  it('B’s evidence remains; A cannot overwrite it', () => {
    const w = new Workspace()
    w.select(A)
    const deliverA = w.issue(A)
    w.select(B)
    const deliverB = w.issue(B)

    deliverB(B)
    expect(w.view?.client_id).toBe(B)

    expect(deliverA(A)).toBe('stale_generation')
    expect(w.view?.client_id, 'a late A response overwrote B').toBe(B)
    expect(w.actionable).toBe(true)
  })
})

describe('🛑 R1-C · the payload says A while B is selected', () => {
  it('resolve and restart are unavailable, and the mismatch is stated', () => {
    const w = new Workspace()
    w.select(B)
    const deliver = w.issue(B)
    // The request was issued for B and is current — but the SERVER says this body describes A.
    // Only the identity check catches this; generation and selection both pass.
    expect(deliver(A)).toBe('identity_mismatch')
    expect(w.view, 'evidence the server attributed to another client was displayed').toBeNull()
    expect(w.actionable).toBe(false)
    expect(w.error).toBe(CALIBRATION_MISMATCH_COPY)
  })

  it('and no POST could be built from it — the action gate refuses too', () => {
    expect(calibrationActionable(payload(A), B)).toBe(false)
  })
})

describe('R1-D · the payload says B while B is selected', () => {
  it('the intended controls operate normally', () => {
    const w = new Workspace()
    w.select(B)
    expect(w.issue(B)(B)).toBe('accept')
    expect(w.view?.client_id).toBe(B)
    expect(w.actionable).toBe(true)
    expect(w.error).toBeNull()
  })
})

describe('🛑 R1-E · A’s calibration state does not survive into B', () => {
  it('the switch clears the view and the error before anything else', () => {
    const w = new Workspace()
    w.select(A)
    w.issue(A)(A)
    expect(w.view?.client_id).toBe(A)
    expect(w.actionable).toBe(true)

    w.select(B)
    expect(w.view, 'A’s evidence survived the switch').toBeNull()
    expect(w.error).toBeNull()
    expect(w.actionable, 'a calibration authority survived the switch').toBe(false)
  })
})

describe('🛑 R1-F · switching while an action is busy', () => {
  it('neither a completion nor an error from A can create actionable B state', () => {
    const w = new Workspace()
    w.select(A)
    const deliverA = w.issue(A)      // an in-flight refresh, as an action’s `finally` would issue
    w.select(B)                      // …the operator moves on mid-action

    expect(deliverA(A)).toBe('stale_generation')
    expect(w.view).toBeNull()
    expect(w.actionable).toBe(false)
    // An A-shaped failure is equally inert: the loader returns before touching the view.
    expect(w.error).toBeNull()
  })
})

describe('🛑 R1-G · no client selected', () => {
  it('nothing is actionable, and a response cannot fill an empty selection', () => {
    const w = new Workspace()
    w.select(A)
    const deliverA = w.issue(A)
    w.select(null)
    expect(deliverA(A)).toBe('stale_generation')
    expect(w.actionable).toBe(false)
    expect(calibrationActionable(payload(A), null)).toBe(false)
    expect(calibrationActionable(null, null)).toBe(false)
  })

  it('and a response that is somehow current with no selection is still refused', () => {
    expect(acceptCalibrationResponse({
      requestedClientId: A, payloadClientId: A, selectedClientId: null,
      requestGeneration: 3, currentGeneration: 3,
    })).toBe('no_selection')
  })
})

describe('🛑 R1-H · rapid A → B → A with out-of-order responses', () => {
  it('only evidence belonging to the CURRENT selection ever becomes actionable', () => {
    const w = new Workspace()
    w.select(A); const a1 = w.issue(A)
    w.select(B); const b1 = w.issue(B)
    w.select(A); const a2 = w.issue(A)

    // Everything lands in the worst possible order.
    expect(b1(B)).toBe('stale_generation')
    expect(a1(A)).toBe('stale_generation')   // ⚠️ the SECOND A request is current, not the first
    expect(w.view).toBeNull()
    expect(w.actionable).toBe(false)

    expect(a2(A)).toBe('accept')
    expect(w.view?.client_id).toBe(A)
    expect(w.actionable).toBe(true)
  })

  it('🛑 identity alone would NOT have caught that — the first A response describes A too', () => {
    // This is why both checks exist. `a1`'s body is a correct description of A, and A is
    // selected again; only the GENERATION distinguishes the stale read from the live one.
    const w = new Workspace()
    w.select(A); const a1 = w.issue(A)
    w.select(B)
    w.select(A); w.issue(A)
    expect(a1(A)).toBe('stale_generation')
    expect(w.view).toBeNull()
  })

  it('🛑 and generation alone would NOT have caught R1-C — that response is perfectly current', () => {
    expect(acceptCalibrationResponse({
      requestedClientId: B, payloadClientId: A, selectedClientId: B,
      requestGeneration: 7, currentGeneration: 7,
    })).toBe('identity_mismatch')
  })
})

describe('🛑 R1 · ownership is never INFERRED', () => {
  it('a payload with no client_id is not assumed to be the one we asked for', () => {
    expect(acceptCalibrationResponse({
      requestedClientId: B, payloadClientId: null, selectedClientId: B,
      requestGeneration: 1, currentGeneration: 1,
    })).toBe('unowned')
    expect(calibrationActionable({ client_id: null }, B)).toBe(false)
    expect(calibrationActionable({}, B)).toBe(false)
  })

  it('a response issued for a client who is no longer selected is refused even at the same generation', () => {
    expect(acceptCalibrationResponse({
      requestedClientId: A, payloadClientId: A, selectedClientId: B,
      requestGeneration: 2, currentGeneration: 2,
    })).toBe('not_selected')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE WIRING. Structural, and stated as such — there is no React component-test runtime here
// and adding one is a dependency change this batch forbids. Every DECISION above is driven for
// real; what is pinned here is that the page applies all three protections and both gates.
// These are the founder's teeth T-R1-1, T-R1-2, T-R1-3 and T-R1-6.
// ═══════════════════════════════════════════════════════════════════════════════════════
const REPO = join(__dirname, '../../../..')
const PAGE = 'apps/admin/src/app/vida/page.tsx'
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

describe('🛑 R1 wiring — all three protections are applied in the page', () => {
  it('T-R1-1 · PROTECTION 1: the client-switch effect clears calibration state immediately', () => {
    const src = read(PAGE)
    expect(src, 'the calibration state is no longer cleared on a client switch')
      .toMatch(/calGen\.current \+= 1\s*\n\s*setCalib\(null\); setCalErr\(null\); setCalBusy\(null\)/)
  })

  it('T-R1-2 · PROTECTION 2: a generation is captured per request and re-checked on arrival', () => {
    const src = read(PAGE)
    expect(src).toMatch(/const calGen = useRef\(0\)/)
    expect(src).toMatch(/const generation = calGen\.current/)
    expect(src, 'the late-response guard is gone').toMatch(/requestGeneration: generation,\s*\n\s*currentGeneration: calGen\.current,/)
    // …and a failing OLD request must not blank a view a newer one already filled.
    expect(src).toMatch(/if \(calGen\.current !== generation\) return/)
  })

  it('T-R1-3 · PROTECTION 3: the payload’s own client_id is declared and compared', () => {
    const src = read(PAGE)
    expect(src, 'client_id is no longer declared on the evidence type').toMatch(/client_id\?: string \| null/)
    expect(src).toMatch(/payloadClientId:\s+payload\?\.client_id \?\? null/)
    expect(src).toMatch(/selectedClientId:\s+selectedRef\.current/)
  })

  // ⚠️ COMMENTS ARE STRIPPED FIRST, and that is not a loophole — it is the mistake this repo
  // has now made ten times. The page's own `⛓️ WHAT STOOD HERE` note QUOTES the struck line, so
  // a raw `not.toContain` matches the comment that records the fix and fails on correct code.
  const codeOnly = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .split('\n').map(l => { const i = l.search(/(?<!:)\/\//); return i < 0 ? l : l.slice(0, i) }).join('\n')

  it('🛑 T-R1-6 · the unguarded write is GONE', () => {
    const src = codeOnly(read(PAGE))
    // ⛓️ The struck line was `setCalib(j.data as CalibrationEvidence)` — unguarded.
    expect(src, 'the unguarded setCalib is back').not.toContain('setCalib(j.data as CalibrationEvidence)')
    expect(src).toMatch(/if \(verdict !== 'accept'\) \{/)
    // The only write of real evidence now happens after the verdict.
    const verdictAt = src.indexOf("if (verdict !== 'accept')")
    const writeAt = src.indexOf('setCalib(payload)')
    expect(verdictAt).toBeGreaterThan(-1)
    expect(writeAt, 'the accepted write is gone').toBeGreaterThan(verdictAt)
  })

  it('🛑 T-R1-4/T-R1-5 · BOTH authority actions are gated on ownership, at the press', () => {
    const src = read(PAGE)
    const gates = src.match(/if \(!calibrationActionable\(calib, selected\)\) return/g) ?? []
    expect(gates.length, 'a calibration authority action is no longer ownership-gated').toBe(2)
    // resolve…
    expect(src).toMatch(/case 'contact_recalibrate':[\s\S]{0,200}if \(!calibrationActionable\(calib, selected\)\) return/)
    // …and restart.
    expect(src).toMatch(/case 'restart_proof_calibrated':[\s\S]{0,120}if \(!calibrationActionable\(calib, selected\)\) return/)
    // The dispatch must SEE the current evidence, or it would close over a stale one.
    expect(src).toMatch(/selected, calib, resolveCalibration, grantCalibratedRestart\]/)
  })

  it('🛑 the rendered restart authority is gated on ownership too', () => {
    expect(read(PAGE)).toMatch(
      /mayRestart: calib\.may_restart === true && calibrationActionable\(calib, selected \?\? null\),/)
  })

  it('the selection is read from a ref, not a closure captured when the request was issued', () => {
    const src = read(PAGE)
    expect(src).toMatch(/const selectedRef = useRef<string \| null>\(selected \?\? null\)/)
    expect(src).toMatch(/selectedRef\.current = selected \?\? null/)
  })
})
