import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 11 Sep (C40 / C43 / teeth G) — THE OPERATOR'S TWO CONTROLS ARE REAL, AND THE SERVER
// IS THE BOUNDARY.
//
// 🛑 WHAT C40 ACTUALLY WAS. `vida-lifecycle-copy.ts` has read a `calibration` block since it
// was written and NOTHING EVER FETCHED ONE — so every escalated client rendered with no
// attempt history, no phone and no note — and the panel's two controls fell through
// `onLifecycleAction`'s `default: return` and made no request at all. Buttons with nothing
// behind them, on the one screen that decides whether a client gets another paid set.
//
// 🛑 AND THE POINT OF TEETH G: HIDING A BUTTON IS NOT A SECURITY BOUNDARY. The founder's rule
// across this repo is that the UI is never the safety boundary. So these cases prove the
// SERVER refuses a restart that was never authorised — whatever the screen chose to draw.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  client: null as Row | null,
  /** every write the handlers attempted — "granted nothing" is an assertion, not a hope */
  writes: [] as Row[],
  audits: [] as string[],
  unreadable: false,
}

function table(name: string) {
  const rows = (): Row[] => (name === 'clients' && state.client ? [state.client] : [])
  const q: Record<string, unknown> = {
    select() { return q },
    eq() { return q }, is() { return q }, not() { return q }, or() { return q },
    order() { return q }, limit() { return q },
    async maybeSingle() {
      if (name === 'clients' && state.unreadable) return { data: null, error: { message: 'could not read clients' } }
      return { data: rows()[0] ?? null, error: null }
    },
    update(patch: Row) {
      const u: Record<string, unknown> = {
        eq() { return u }, is() { return u }, not() { return u }, or() { return u }, select() { return u },
        then(resolve: (v: unknown) => unknown) {
          // ⚠️ THE CONDITIONAL WRITE IS SIMULATED HONESTLY. A resolve against a client who
          // never escalated matches NO ROW in production (`.not('proof_review_requested_at',
          // 'is', null)`), and that is the refusal this file is about.
          const c = state.client
          if (patch.proof_review_resolved_at && (!c || !c.proof_review_requested_at || c.proof_review_resolved_at)) {
            return resolve({ data: [], error: null })
          }
          state.writes.push(patch)
          if (c) Object.assign(c, patch)
          return resolve({ data: [{ id: 'client-1' }], error: null })
        },
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) {
      if (name === 'clients' && state.unreadable) return resolve({ data: null, error: { message: 'could not read clients' } })
      return resolve({ data: rows(), error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))
// `middleware/auth` builds a Supabase client at MODULE level, and the operator router pulls
// it in transitively — so importing the router throws "supabaseUrl is required" before a
// single line of a handler runs. The operator routes are admin-key gated and never use it.
vi.mock('../middleware/auth', () => ({
  requireAuth: (_q: unknown, _s: unknown, next: () => void) => next(),
}))
vi.mock('./operator-audit', () => ({
  writeOperatorAudit: async (a: { action: string }) => { state.audits.push(a.action) },
}))

async function callOperator(path: string, method: 'post' | 'get', params: Row) {
  const { operatorRouter } = await import('../routes/operator')
  const layer = (operatorRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer?.route) throw new Error(`${method.toUpperCase()} ${path} not found on the operator router`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { out.code = c; return fakeRes },
    json(p: Row) { out.payload = p; return fakeRes },
  }
  await handler({
    body: {}, params, query: {},
    headers: { 'x-admin-key': process.env.ADMIN_SECRET_KEY, 'x-operator-email': 'ops@get-kind.com' },
  }, fakeRes, () => {})
  return out
}

const ESCALATED = '2026-09-10T10:30:00Z'
const RESOLVED  = '2026-09-10T10:50:00Z'

const seed = (over: Row = {}) => {
  state.client = {
    id: 'client-1', phone: '07700 900123', contact_name: 'Ellis Warner', proof_passes_done: 2,
    proof_review_requested_at: ESCALATED, proof_review_resolved_at: null,
    proof_escalation_trigger: 'client_said_still_not_right',
    proof_calibration_note: null, proof_calibrated_restart_at: null,
    proof_calibrated_restart_used_at: null, proof_completed_at: null, proof_phone_confirmed_at: null,
    ...over,
  }
}

beforeEach(() => {
  state.client = null
  state.writes = []
  state.audits = []
  state.unreadable = false
  process.env.ADMIN_SECRET_KEY = 'test-operator-key'
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 G · the server refuses a restart the UI had no right to offer', () => {
  it('1 · no human resolution → 400, and NOTHING is granted', async () => {
    seed()   // escalated, unresolved, no note
    const r = await callOperator('/proof-review/:clientId/restart', 'post', { clientId: 'client-1' })
    expect(r.code).toBe(400)
    expect(state.writes, 'a restart was granted with no resolution behind it').toEqual([])
    expect(state.audits).not.toContain('proof_calibrated_restart_granted')
  })

  it('2 · resolved but NO NOTE → 400, and nothing is granted', async () => {
    seed({ proof_review_resolved_at: RESOLVED, proof_calibration_note: '   ' })
    const r = await callOperator('/proof-review/:clientId/restart', 'post', { clientId: 'client-1' })
    expect(r.code).toBe(400)
    expect(String(r.payload.error)).toContain('no resolution note')
    expect(state.writes).toEqual([])
  })

  it('3 · fewer than two automatic attempts → 400, and nothing is granted', async () => {
    seed({ proof_passes_done: 1, proof_review_resolved_at: RESOLVED, proof_calibration_note: 'Called them.' })
    const r = await callOperator('/proof-review/:clientId/restart', 'post', { clientId: 'client-1' })
    expect(r.code).toBe(400)
    expect(state.writes).toEqual([])
  })

  it('4 · 🛑 a client who NEVER escalated cannot be granted one', async () => {
    seed({ proof_review_requested_at: null, proof_review_resolved_at: RESOLVED, proof_calibration_note: 'Called them.' })
    const r = await callOperator('/proof-review/:clientId/restart', 'post', { clientId: 'client-1' })
    expect(r.code).toBe(400)
    expect(String(r.payload.error)).toContain('never escalated')
    expect(state.writes).toEqual([])
  })

  it('5 · a fully authorised restart IS granted, and audited', async () => {
    seed({ proof_review_resolved_at: RESOLVED, proof_calibration_note: 'They want agencies only.' })
    const r = await callOperator('/proof-review/:clientId/restart', 'post', { clientId: 'client-1' })
    expect(r.code).toBe(200)
    expect(state.client!.proof_calibrated_restart_at).toBeTruthy()
    expect(state.audits).toContain('proof_calibrated_restart_granted')
    // 🛑 AND IT DID NOT RESET THE AUTOMATIC ATTEMPTS.
    expect(state.client!.proof_passes_done).toBe(2)
    for (const w of state.writes) expect(Object.keys(w)).not.toContain('proof_passes_done')
  })

  it('6 · 🛑 …and the grant no longer ERASES the escalation', async () => {
    seed({ proof_review_resolved_at: RESOLVED, proof_calibration_note: 'They want agencies only.' })
    await callOperator('/proof-review/:clientId/restart', 'post', { clientId: 'client-1' })
    expect(state.client!.proof_review_requested_at,
      'the record that this client escalated was destroyed to unlock the restart').toBe(ESCALATED)
    expect(state.client!.proof_escalation_trigger).toBe('client_said_still_not_right')
  })

  it('7 · 🛑 22 · a resolution cannot be recorded against a client who never escalated', async () => {
    seed({ proof_review_requested_at: null })
    const r = await callOperator('/proof-review/:clientId/resolve', 'post', { clientId: 'client-1' })
    expect(r.payload.data).toEqual({ resolved: 'already_resolved' })
    expect(state.client!.proof_review_resolved_at, 'a resolution of nothing was recorded').toBeNull()
    expect(state.audits, 'an audit row claimed a call that could not have happened')
      .not.toContain('proof_calibration_resolved')
  })

  it('8 · 21 · a real resolution IS recorded, with the operator and an audit row', async () => {
    seed()
    const r = await callOperator('/proof-review/:clientId/resolve', 'post', { clientId: 'client-1' })
    expect(r.payload.data).toEqual({ resolved: 'resolved' })
    expect(state.client!.proof_review_resolved_at).toBeTruthy()
    expect(state.client!.proof_calibration_resolved_by).toBe('ops@get-kind.com')
    expect(state.audits).toContain('proof_calibration_resolved')
  })

  it('9 · 🛑 H · an unreadable calibration state grants nothing', async () => {
    seed({ proof_review_resolved_at: RESOLVED, proof_calibration_note: 'Called.' })
    state.unreadable = true
    const r = await callOperator('/proof-review/:clientId/restart', 'post', { clientId: 'client-1' })
    expect(r.code).toBeGreaterThanOrEqual(400)
    expect(state.writes, 'an unreadable state granted a restart').toEqual([])
  })

  it('10 · 🛑 G · the operator key is the door — no key, no grant', async () => {
    seed({ proof_review_resolved_at: RESOLVED, proof_calibration_note: 'Called.' })
    const { operatorRouter } = await import('../routes/operator')
    const layer = (operatorRouter as unknown as {
      stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
    }).stack.find(l => l.route?.path === '/proof-review/:clientId/restart' && l.route?.methods.post)!
    const handler = layer.route!.stack[layer.route!.stack.length - 1].handle
    const out: { code: number } = { code: 200 }
    const res = { status(c: number) { out.code = c; return res }, json() { return res } }
    await handler({ body: {}, params: { clientId: 'client-1' }, query: {}, headers: {} }, res, () => {})
    expect(out.code).toBe(403)
    expect(state.writes).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 11 Sep (C40) — THE CONTROLS ARE WIRED, AND NOTHING IS GRANTED IN LOCAL REACT STATE.
// ═══════════════════════════════════════════════════════════════════════════════════════
const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')
/**
 * ⚠️ BLOCK COMMENTS TOO, and the first cut of this file forgot them. Every module in this
 * package EXPLAINS in its header why the restart is not "Attempt 3" — so a scan that stripped
 * only `//` lines matched the very prose that documents the rule, and the guard failed on its
 * own explanation. What must not exist is the string in CODE.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '')
     .split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n')

describe('🛑 C40 · every control the panel draws reaches a real authority', () => {
  const vida = read('apps/admin/src/app/vida/page.tsx')
  const code = stripComments(vida)

  it('the calibration evidence is actually FETCHED — it never was', () => {
    expect(code).toContain('/evidence')
    expect(code).toContain('calibration: calib ?')
  })

  it('🛑 both actions have handlers — neither falls through to `default: return`', () => {
    expect(code).toContain("case 'contact_recalibrate':")
    expect(code).toContain("case 'restart_proof_calibrated':")
    expect(code).toMatch(/proof-review\/\$\{encodeURIComponent\([^)]+\)\}\/resolve/)
    expect(code).toMatch(/proof-review\/\$\{encodeURIComponent\([^)]+\)\}\/restart/)
  })

  it('🛑 G · availability is the SERVER’s answer — never computed or assumed locally', () => {
    // `may_restart` is `mayRestartCalibrated`'s verdict, carried through unchanged. Nothing
    // in this file decides it, and nothing sets it optimistically after a press.
    expect(code).toContain('mayRestart: calib.may_restart === true')
    expect(code, 'the screen grants itself a restart').not.toMatch(/setCalib\([^)]*may_restart:\s*true/)
    expect(code, 'the screen invents a restart verdict').not.toMatch(/mayRestart:\s*true/)
  })

  it('🛑 C43 · a failed evidence read shows NO restart and says so', () => {
    // `calib` is cleared and `calErr` set, and the fail-closed branch hard-codes mayRestart
    // false — so an unreadable authority can never leave a restart control on screen.
    expect(code).toContain('setCalib(null)')
    expect(code).toContain('mayRestart: false')
    expect(code).toContain('unreadable: true')
  })

  it('both handlers RE-READ the canonical state rather than trusting their own press', () => {
    for (const fn of ['resolveCalibration', 'grantCalibratedRestart']) {
      const at = code.indexOf(`const ${fn} = useCallback`)
      expect(at, `${fn} is gone`).toBeGreaterThan(-1)
      expect(code.slice(at, at + 1400), `${fn} does not re-read the server`).toContain('loadCalibration(clientId)')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 11 Sep — THE REPO-WIDE `proof_pass` AUDIT, PINNED SO IT CANNOT SILENTLY REGRESS.
//
// 🛑 THE DISTINCTION THE FOUNDER NAMED: a PASS NUMBER versus an AUTOMATIC ATTEMPT IDENTITY.
// Code answering "is this a proof row at all?" may read `proof_pass IS NOT NULL` for ever.
// Code answering "which AUTOMATIC attempt is this?" may not read the number alone, because
// the calibrated restart deliberately shares pass 2's number.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 the proof_pass audit — attempt identity never comes from a number alone', () => {
  it('every ATTEMPT-IDENTITY reader is provenance-aware', () => {
    // ① the attempt summaries — grouped by (pass, kind), never by pass
    const io = stripComments(read('apps/api/src/lib/proof-calibration-io.ts'))
    expect(io).toContain('proof_batch_kind')
    expect(io).toContain("r.proof_batch_kind === 'calibrated_restart' ? 'calibrated_restart' : 'automatic'")
    expect(io, 'attempts are grouped by pass number alone').not.toMatch(/byPass/)

    // ② the rules — "attempt 2" means the AUTOMATIC one
    const rules = stripComments(read('apps/api/src/lib/proof-calibration.ts'))
    expect(rules).toContain('export function automaticAttempt')
    expect(rules, 'a rule finds an attempt by pass number alone')
      .not.toMatch(/attempts\.find\(a => a\.pass === \d\)(?!\s*&&)/)

    // ③ the operator panel — labels and history from `kind`
    const copy = stripComments(read('apps/admin/src/lib/vida-lifecycle-copy.ts'))
    expect(copy).toContain("a.pass === n && a.kind === 'automatic'")
    expect(copy).toContain("a.kind === 'calibrated_restart'")
  })

  it('the PASS-FIELD readers are left exactly as they were — this is not a bulk rewrite', () => {
    // "Is this row proof work at all?" is a question about the FIELD, and a calibrated
    // restart's rows are proof work: they must stay visible on the client's desk, in their
    // summary and in their workspace. Rewriting these would have HIDDEN the restart's set.
    for (const f of [
      'apps/api/src/lib/milla-proof-context-io.ts',
      'apps/api/src/lib/milla-summary.ts',
      'apps/api/src/routes/leads.ts',
    ]) {
      expect(stripComments(read(f)), `${f} stopped treating proof rows as proof rows`)
        .toContain("not('proof_pass', 'is', null)")
    }
  })

  it('🛑 the widened-candidate machinery can only ever arise from the AUTOMATIC pass 2', () => {
    // `proof-candidate.ts` carries its own `proof_pass: 2` inside `icps.proof_widened_candidate`
    // — a different store from `leads.proof_pass`. It is safe BECAUSE the one widening
    // fallback now excludes the calibrated restart; without that, the restart would have
    // earned a second use of it purely by sharing pass 2's number.
    const icps = stripComments(read('apps/api/src/routes/icps.ts'))
    const at = icps.indexOf('const canWiden =')
    expect(at, 'the widening gate is gone').toBeGreaterThan(-1)
    expect(icps.slice(at, at + 400)).toContain("opts?.proofKind !== 'calibrated_restart'")
  })

  it('🛑 the stale per-card calibration is not re-applied to a human-corrected restart', () => {
    const icps = stripComments(read('apps/api/src/routes/icps.ts'))
    expect(icps).toContain("const confirmedRefinement = opts?.proofPass === 2 || opts?.proofKind === 'calibrated_restart'")
  })

  it('🛑 no source file anywhere writes or compares a third proof pass', () => {
    for (const f of [
      'apps/api/src/routes/icps.ts',
      'apps/api/src/routes/leads.ts',
      'apps/api/src/routes/operator.ts',
      'apps/api/src/lib/proof-calibration.ts',
      'apps/api/src/lib/proof-calibration-io.ts',
      'apps/admin/src/lib/vida-lifecycle-copy.ts',
      'apps/portal/src/components/milla/ProofCalibration.tsx',
    ]) {
      const c = stripComments(read(f))
      expect(c, `${f} writes a third proof pass`).not.toMatch(/proof_pass:\s*3\b/)
      expect(c, `${f} compares against a third proof pass`).not.toMatch(/proof_pass\s*===?\s*3\b/)
      expect(c, `${f} renders an Attempt 3`).not.toMatch(/Attempt 3/i)
    }
  })
})
