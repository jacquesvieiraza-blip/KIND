import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  decideCalibrationResponse, calibrationActionable,
  CALIBRATION_MISMATCH_COPY, CALIBRATION_READ_FAILED_COPY,
  type CalibrationReason,
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
  verdicts: Array<{ forClient: string; verdict: CalibrationReason }> = []

  /** The client-switch reset: bump first, clear, then (maybe) load. */
  select(clientId: string | null) {
    this.generation += 1
    this.view = null
    this.error = null
    this.selected = clientId
  }

  /**
   * Issue a read for the currently selected client; returns its deliver() thunk.
   *
   * ⚠️ THE THUNK MIRRORS THE LOADER EXACTLY: decide, then discard silently / fail loudly /
   * accept. If the page and this driver ever diverge, the guards at the bottom of the file
   * catch it.
   */
  issue(forClient: string) {
    const generation = this.generation
    return (ownerInPayload: string | null, api: { success?: boolean; error?: string } = { success: true }) => {
      const outcome = decideCalibrationResponse({
        requestedClientId: forClient,
        payloadClientId:   ownerInPayload,
        selectedClientId:  this.selected,
        requestGeneration: generation,
        currentGeneration: this.generation,
        apiSuccess:        api.success === true,
        apiError:          api.error ?? null,
      })
      this.verdicts.push({ forClient, verdict: outcome.reason })
      if (outcome.action === 'discard') return outcome.reason
      if (outcome.action === 'fail') {
        this.view = null
        this.error = outcome.message ?? CALIBRATION_READ_FAILED_COPY
        return outcome.reason
      }
      this.view = payload(ownerInPayload)
      return outcome.reason
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
    expect(decideCalibrationResponse({
      requestedClientId: A, payloadClientId: A, selectedClientId: null,
      requestGeneration: 3, currentGeneration: 3,
    apiSuccess: true,
    }).reason).toBe('no_selection')
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
    expect(decideCalibrationResponse({
      requestedClientId: B, payloadClientId: A, selectedClientId: B,
      requestGeneration: 7, currentGeneration: 7,
    apiSuccess: true,
    }).reason).toBe('identity_mismatch')
  })
})

describe('🛑 R1 · ownership is never INFERRED', () => {
  it('a payload with no client_id is not assumed to be the one we asked for', () => {
    expect(decideCalibrationResponse({
      requestedClientId: B, payloadClientId: null, selectedClientId: B,
      requestGeneration: 1, currentGeneration: 1,
    apiSuccess: true,
    }).reason).toBe('unowned')
    expect(calibrationActionable({ client_id: null }, B)).toBe(false)
    expect(calibrationActionable({}, B)).toBe(false)
  })

  it('a response issued for a client who is no longer selected is refused even at the same generation', () => {
    expect(decideCalibrationResponse({
      requestedClientId: A, payloadClientId: A, selectedClientId: B,
      requestGeneration: 2, currentGeneration: 2,
    apiSuccess: true,
    }).reason).toBe('not_selected')
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
    expect(src).toMatch(/if \(outcome\.action === 'discard'\) return/)
    expect(src).toMatch(/if \(outcome\.action === 'fail'\) \{/)
    // The only write of real evidence now happens after the decision.
    const decideAt = src.indexOf('const outcome = decideCalibrationResponse(')
    const writeAt = src.indexOf('setCalib(payload)')
    expect(decideAt).toBeGreaterThan(-1)
    expect(writeAt, 'the accepted write is gone').toBeGreaterThan(decideAt)
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

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 R1-I…M — A CURRENT REQUEST THAT FAILS MUST SAY SO.
//
// ⛓️ THE DEFECT GPT FOUND IN THE ACTUAL DIFF. The first cut asked OWNERSHIP before it asked
// whether the request had SUCCEEDED. A current read for the current client that returned
// `{ success: false, error: … }` carries no `data.client_id`, so it was classified `unowned`
// and the loader returned SILENTLY. The authority stayed correctly shut — and the operator
// watched an escalated client go blank instead of being told their state could not be read.
//
// Fail-closed was never the problem. Being MUTE about it was.
//
// ⚠️ AND THE FIX MUST NOT BREAK THE STALE RULE. A failure belonging to a client the operator
// has left must still be silent (R1-J): printing "database failed" under B, about A, is the
// original cross-client defect wearing an error message.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 R1-I…M · API failure visibility, without breaking the stale rule', () => {
  it('🛑 R1-I · a CURRENT request that the API refuses is SHOWN, and authorises nothing', () => {
    const w = new Workspace()
    w.select(B)
    const reason = w.issue(B)(null, { success: false, error: 'The calibration evidence could not be read' })
    expect(reason).toBe('api_error')
    expect(w.view, 'a failed read left evidence on screen').toBeNull()
    expect(w.error, 'the operator was told nothing about a current failure')
      .toBe('The calibration evidence could not be read')
    expect(w.actionable, 'a failed read left an authority available').toBe(false)
  })

  it('R1-I · and a refusal with no sentence still says something truthful', () => {
    const w = new Workspace()
    w.select(B)
    expect(w.issue(B)(null, { success: false })).toBe('api_error')
    expect(w.error).toBe(CALIBRATION_READ_FAILED_COPY)
    expect(w.actionable).toBe(false)
  })

  it('🛑 R1-J · a STALE failure stays silent — A’s error never appears under B', () => {
    const w = new Workspace()
    w.select(A)
    const deliverA = w.issue(A)
    w.select(B)
    const deliverB = w.issue(B)
    deliverB(B)                                   // B is on screen and healthy
    expect(w.view?.client_id).toBe(B)

    // …then A's read fails, late.
    expect(deliverA(null, { success: false, error: 'database failed' })).toBe('stale_generation')
    expect(w.error, 'a stale client’s error was printed under the current client').toBeNull()
    expect(w.view?.client_id, 'a stale failure blanked the current client’s evidence').toBe(B)
    expect(w.actionable).toBe(true)
  })

  it('R1-J · and a stale failure arriving BEFORE the current response is equally silent', () => {
    const w = new Workspace()
    w.select(A)
    const deliverA = w.issue(A)
    w.select(B)
    const deliverB = w.issue(B)
    expect(deliverA(null, { success: false, error: 'database failed' })).toBe('stale_generation')
    expect(w.error).toBeNull()
    expect(w.view).toBeNull()
    deliverB(B)
    expect(w.view?.client_id).toBe(B)
    expect(w.error).toBeNull()
  })

  it('🛑 R1-K · a SUCCESSFUL response with no client_id is `unowned`, shown, and inert', () => {
    const w = new Workspace()
    w.select(B)
    expect(w.issue(B)(null, { success: true })).toBe('unowned')
    expect(w.view).toBeNull()
    expect(w.error).toBe(CALIBRATION_MISMATCH_COPY)
    expect(w.actionable).toBe(false)
  })

  it('🛑 R1-L · a SUCCESSFUL response with the WRONG client_id is a mismatch, shown, and inert', () => {
    const w = new Workspace()
    w.select(B)
    expect(w.issue(B)(A, { success: true })).toBe('identity_mismatch')
    expect(w.view).toBeNull()
    expect(w.error).toBe(CALIBRATION_MISMATCH_COPY)
    expect(w.actionable).toBe(false)
  })

  it('R1-M · a SUCCESSFUL response with the correct client_id is accepted normally', () => {
    const w = new Workspace()
    w.select(B)
    expect(w.issue(B)(B, { success: true })).toBe('accept')
    expect(w.view?.client_id).toBe(B)
    expect(w.error).toBeNull()
    expect(w.actionable).toBe(true)
  })

  it('🛑 THE ORDER IS THE CONTRACT: currency is decided WITHOUT needing a successful payload', () => {
    // A stale, failed, ownerless response — every later question would have had something to
    // say about it. Currency answers first, so none of them is asked.
    expect(decideCalibrationResponse({
      requestedClientId: A, payloadClientId: null, selectedClientId: B,
      requestGeneration: 1, currentGeneration: 2, apiSuccess: false, apiError: 'database failed',
    })).toEqual({ action: 'discard', reason: 'stale_generation' })
  })

  it('🛑 …and success is decided BEFORE ownership, so a current failure is never `unowned`', () => {
    const out = decideCalibrationResponse({
      requestedClientId: B, payloadClientId: null, selectedClientId: B,
      requestGeneration: 4, currentGeneration: 4, apiSuccess: false, apiError: 'boom',
    })
    expect(out.action).toBe('fail')
    expect(out.reason, 'a current API failure was misreported as an ownership problem').toBe('api_error')
    expect(out.reason).not.toBe('unowned')
    expect(out.message).toBe('boom')
  })

  it('every non-accept outcome leaves the authority shut', () => {
    for (const evidence of [null, { client_id: null }, { client_id: A }]) {
      expect(calibrationActionable(evidence, B)).toBe(false)
    }
  })
})
