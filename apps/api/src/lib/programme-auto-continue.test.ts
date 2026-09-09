// ═══════════════════════════════════════════════════════════════════════════════════════
// THE NORMAL FLOW RUNS ITSELF — and the operator button is the recovery door, not the path.
//
// ⛓️ FOUNDER-CORRECTED 9 Sep. #1660's first cut made `Ready for approval` WORK; the locked rule
// is that it should be UNNECESSARY:
//
//     P1 authorised → source → enrich → qualify → account → PREPARE.  Automatically.
//     Vida interrupts only for a real exception.
//
// A button that must be pressed on every healthy programme is a step somebody will one day not
// press, on a launch nobody is watching. So these cases prove the CONTINUATION HAPPENS BY
// ITSELF at the settlement boundary, and — the other half, which matters just as much — that it
// FAILS CLOSED when a real requirement is missing rather than advancing anyway.
//
// ⚠️ `advanceAfterSettlement` NEVER THROWS, so "it did not blow up" proves nothing on its own.
// Every case here asserts what it RETURNED and what it did or did not CALL.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})
import { join } from 'node:path'

const HOUSE = '8a8d0fd7-bf6b-4d87-9188-9b3f17864bca'
const CLIENT = '6bd2046b-5da7-4d48-a249-b9412b7dd554'

// ⚠️ THE REAL ORCHESTRATOR RUNS IN EVERY CASE BELOW, and that is deliberate rather than
// convenient. `advanceAfterSettlement` calls `advanceProgrammeToReview` INSIDE ITS OWN MODULE,
// so no module-registry mock can sit between them — stubbing the pair apart would have proved
// only that a stub returns what it was told to. What is mocked instead is the layer beneath:
// the database row, and the three collaborators the orchestrator reaches by import. So these
// cases exercise the genuine authority checks, the genuine ordering and the genuine fail-closed
// behaviour, and only the expensive work is stood in for.

/** The programme row every case reads. Rewritten per test. */
const state: { row: Record<string, unknown> | null } = { row: null }

vi.mock('@kind/db', () => {
  const make = (table: string) => {
    const self: Record<string, unknown> = {}
    for (const op of ['eq', 'gt', 'gte', 'lt', 'lte', 'is', 'not', 'in', 'neq', 'order', 'limit', 'select']) {
      self[op] = () => self
    }
    self.update = () => self
    self.insert = () => self
    self.maybeSingle = async () => ({ data: table === 'programmes' ? state.row : null, error: null })
    self.single = async () => ({ data: table === 'programmes' ? state.row : null, error: null })
    self.then = (res: (v: unknown) => unknown) => res({ data: [], error: null, count: 0 })
    return self
  }
  return { db: { from: (t: string) => make(t), rpc: async () => ({ data: null, error: null }) } }
})

/** What preparation and readiness answer this test. */
const prep: { impl: () => unknown } = { impl: () => ({}) }
const ready: { impl: () => unknown } = { impl: () => ({ ready: true, blockers: [], facts: null, degraded: null }) }
const marked: { impl: () => unknown } = { impl: () => ({ ok: true }) }

const completePrep = (over: Record<string, unknown> = {}) => ({
  ok: true, complete: true, remaining: 0, total: 246,
  campaigns: ['camp'], enrolled: Array.from({ length: 246 }, (_, i) => `l${i}`),
  alreadyEnrolled: 0, skipped: 0, failed: [], problems: [], ...over,
})

vi.mock('./programme-preparation', async (orig) => {
  const actual = await orig<typeof import('./programme-preparation')>()
  return { ...actual, prepareProgrammeOutreach: async () => prep.impl() }
})
vi.mock('./preparation-readiness', async (orig) => {
  const actual = await orig<typeof import('./preparation-readiness')>()
  return { ...actual, programmePreparationReadiness: async () => ready.impl() }
})
vi.mock('./programme', async (orig) => {
  const actual = await orig<typeof import('./programme')>()
  return { ...actual, markReadyForApproval: async () => marked.impl() }
})

const { advanceAfterSettlement, AT_OR_PAST_REVIEW } = await import('./programme-advance')

const settledRow = (over: Record<string, unknown> = {}) => ({
  id: HOUSE, client_id: CLIENT, status: 'SOURCING', paused_at: null, approved_at: null,
  first_paid_at: null, first_authorised_at: '2026-09-01T00:00:00.000Z',
  second_paid_at: null, second_payment_ref: null, second_authorised_at: null,
  ...over,
})

const LIB = join(__dirname)
const ICPS = readFileSync(join(LIB, '..', 'routes', 'icps.ts'), 'utf8')
const RECOVERY = readFileSync(join(LIB, 'programme-batch-recovery.ts'), 'utf8')
const ADVANCE = readFileSync(join(LIB, 'programme-advance.ts'), 'utf8')
const VIDA = readFileSync(
  join(LIB, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'page.tsx'), 'utf8')

/** The transition succeeding: the row moves, exactly as `setStatus` would move it. */
const transitionSucceeds = () => marked.impl = () => {
  if (state.row) state.row.status = 'READY_FOR_APPROVAL'
  return { ok: true }
}

beforeEach(() => {
  state.row = settledRow()
  prep.impl = () => completePrep()
  ready.impl = () => ({ ready: true, blockers: [], facts: null, degraded: null })
  transitionSucceeds()
})

describe('① a settled programme continues without any operator action', () => {
  it('the successful settlement boundary reaches the review boundary by itself', async () => {
    const out = await advanceAfterSettlement(HOUSE, 'sourcing_run')
    expect(out.attempted).toBe(true)
    expect(out.reviewable, 'a healthy settled programme did not reach review automatically').toBe(true)
    expect(out.blockers).toEqual([])
    // 🛑 THE POINT OF THE WHOLE CORRECTION: no operator pressed anything.
    expect(state.row?.status).toBe('READY_FOR_APPROVAL')
  })

  it('counts every at-or-past-review status as continued, not only the transition it just made', async () => {
    // A second settle on a programme the client has since approved must read as "already
    // there", not as a failure to advance — otherwise a healthy multi-batch programme would
    // raise a false exception on every later batch.
    for (const status of AT_OR_PAST_REVIEW) {
      state.row = settledRow({ status })
      const out = await advanceAfterSettlement(HOUSE, 'sourcing_run')
      expect(out.reviewable, `${status} was not treated as continued`).toBe(true)
      expect(out.blockers).toEqual([])
    }
  })

  it('is idempotent — a repeated settlement boundary is a no-op, never a second advance', async () => {
    const first = await advanceAfterSettlement(HOUSE, 'sourcing_run')
    expect(first.reviewable).toBe(true)
    expect(state.row?.status).toBe('READY_FOR_APPROVAL')

    // 🛑 THE SECOND PRESS MUST NOT PREPARE AGAIN. The row is now READY_FOR_APPROVAL and its
    // set is frozen; preparation ADDS enrolments, so a second run would change what the client
    // is reading. The tripwire proves it was not merely harmless but never reached.
    prep.impl = () => { throw new Error('prepareProgrammeOutreach was called on a frozen review set') }
    const second = await advanceAfterSettlement(HOUSE, 'sourcing_run')
    expect(second.reviewable).toBe(true)
    expect(second.detail).toContain('already')
  })
})

describe('② an exception fails closed and names the blocker', () => {
  it('no_sender does NOT advance, and says what is wrong', async () => {
    // 🛑 THE ONE REQUIREMENT NO CODE CAN CREATE. A mailbox is connected by a human;
    // automation must stop here rather than advance a programme that could never send.
    ready.impl = () => ({
      ready: false,
      blockers: [{ code: 'no_sender', detail: 'No sending mailbox is assigned and ready for this client.' }],
      facts: null, degraded: null,
    })
    marked.impl = () => { throw new Error('markReadyForApproval was reached with a blocked readiness') }

    const out = await advanceAfterSettlement(HOUSE, 'sourcing_run')
    expect(out.reviewable, 'a programme with no sender was advanced anyway').toBe(false)
    expect(out.blockers.map(b => b.code)).toContain('no_sender')
    expect(out.detail).toContain('mailbox')
    expect(state.row?.status, 'the status moved despite a missing sender').toBe('SOURCING')
  })

  it('every other real blocker also stops it, and is named', async () => {
    for (const code of ['no_batch', 'no_attached_icp', 'no_reviewable_leads', 'foreign_enrolments', 'no_snapshot']) {
      state.row = settledRow()
      ready.impl = () => ({ ready: false, blockers: [{ code, detail: `d-${code}` }], facts: null, degraded: null })
      const out = await advanceAfterSettlement(HOUSE, 'sourcing_run')
      expect(out.reviewable, `${code} did not stop the continuation`).toBe(false)
      expect(out.blockers.map(b => b.code)).toContain(code)
      expect(state.row?.status, `${code} did not stop the status moving`).toBe('SOURCING')
    }
  })

  it('incomplete preparation stops before readiness is even consulted', async () => {
    prep.impl = () => completePrep({
      ok: false, complete: false, remaining: 12,
      enrolled: [], problems: ['No active campaign for this ICP.'],
    })
    ready.impl = () => { throw new Error('readiness was consulted on incomplete preparation') }
    const out = await advanceAfterSettlement(HOUSE, 'sourcing_run')
    expect(out.reviewable).toBe(false)
    expect(out.detail).toContain('No active campaign')
    expect(state.row?.status).toBe('SOURCING')
  })

  it('a throw is contained — the settled ledger is never unwound by a preparation failure', async () => {
    // 🛑 THIS RUNS AFTER THE LEDGER MOVED. An exception escaping into the sourcing run would
    // abandon the surfacing, scoring and alerts that follow it, on a settle that already
    // succeeded and cannot be taken back.
    prep.impl = () => { throw new Error('database exploded') }
    const out = await advanceAfterSettlement(HOUSE, 'sourcing_run')
    expect(out.attempted).toBe(true)
    expect(out.reviewable).toBe(false)
    expect(out.detail).toContain('settled and correct')
    expect(out.detail, 'the operator is not told how to resume').toContain('Ready for approval')
  })

  it('a retry after the cause is fixed succeeds — the exception is not sticky', async () => {
    prep.impl = () => { throw new Error('transient') }
    expect((await advanceAfterSettlement(HOUSE, 'sourcing_run')).reviewable).toBe(false)
    expect(state.row?.status).toBe('SOURCING')

    prep.impl = () => completePrep()
    expect((await advanceAfterSettlement(HOUSE, 'operator_recovery')).reviewable,
      'the recovery door could not resume after a fixed exception').toBe(true)
    expect(state.row?.status).toBe('READY_FOR_APPROVAL')
  })

  it('a programme with no P1 authority is never continued, however the settle got here', async () => {
    state.row = settledRow({ first_authorised_at: null, first_paid_at: null })
    prep.impl = () => { throw new Error('preparation ran without P1') }
    const out = await advanceAfterSettlement(HOUSE, 'sourcing_run')
    expect(out.reviewable).toBe(false)
    expect(out.detail).toContain('first-payment authority')
  })

  it('P2 is never required — a P1-only programme continues all the way', async () => {
    state.row = settledRow({ second_authorised_at: null, second_paid_at: null, second_payment_ref: null })
    const out = await advanceAfterSettlement(HOUSE, 'sourcing_run')
    expect(out.reviewable, 'the automatic path is demanding P2').toBe(true)
  })
})

describe('③ the automatic hook sits at the canonical settlement boundary', () => {
  it('the fresh sourcing run continues after a SUCCESSFUL settle', () => {
    const settleOk = ICPS.indexOf('if (r.ok) {')
    const call = ICPS.indexOf("advanceAfterSettlement(programmeIdForRun, 'sourcing_run')")
    expect(call, 'the sourcing run does not continue the programme at all').toBeGreaterThan(-1)
    expect(settleOk, 'the settle success branch is gone').toBeGreaterThan(-1)
    expect(call, 'the continuation runs outside the settle success branch').toBeGreaterThan(settleOk)
  })

  it('…and AFTER surfacing, because the review boundary requires the surfaced stamp', () => {
    const surface = ICPS.indexOf('await surfaceQualifiedBatch(programmeIdForRun, clientId, programmeBatch.id)')
    const call = ICPS.indexOf("advanceAfterSettlement(programmeIdForRun, 'sourcing_run')")
    expect(surface).toBeGreaterThan(-1)
    // `markReadyForApproval` and the customer's desk both require `surfaced_for_approval_at`.
    // Called earlier the continuation would refuse every single time.
    expect(call, 'the continuation runs before the prospects are surfaced').toBeGreaterThan(surface)
  })

  it('the partial-judgement branch never continues — an unsettled attempt is not a boundary', () => {
    // 🛑 THE SAFETY ARGUMENT OF THE WHOLE RECOVERY PACKAGE. A provider outage leaves verdicts
    // written and a remainder unjudged; that branch refuses to settle, and must equally refuse
    // to prepare — preparing there would build a review set from half a judgement.
    const notSettled = ICPS.indexOf('NOT settled — ${q.still_unjudged} candidate(s) still unjudged')
    const call = ICPS.indexOf("advanceAfterSettlement(programmeIdForRun, 'sourcing_run')")
    expect(notSettled).toBeGreaterThan(-1)
    const between = ICPS.slice(notSettled, call)
    expect(between).toContain('} else {')
  })

  it('the operator qualify path continues the same way, through the same function', () => {
    expect(RECOVERY).toContain("advanceAfterSettlement(id, 'operator_qualify')")
    // 🛑 AND OWNS NO PREPARATION LOGIC OF ITS OWN.
    //
    // ⚠️ EXECUTABLE LINES ONLY. The comment beside the call names the chain it delegates to —
    // `advanceAfterSettlement → prepareProgrammeOutreach → markReadyForApproval` — so a bare
    // file search matches the sentence that documents the delegation and reads it as the
    // duplication it was written to rule out.
    const code = RECOVERY.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    for (const forbidden of ['prepareProgrammeOutreach', 'markReadyForApproval', 'ensureCampaignForIcp', 'autoEnrollLead']) {
      expect(code.includes(forbidden), `the recovery path reimplements ${forbidden}`).toBe(false)
    }
  })

  it('the recovery path re-reads the status after continuing, so it cannot report a stale one', () => {
    const call = RECOVERY.indexOf("advanceAfterSettlement(id, 'operator_qualify')")
    const reread = RECOVERY.indexOf("db.from('programmes').select('status').eq('id', id)")
    expect(reread, 'the status is not re-read after the continuation').toBeGreaterThan(call)
    expect(RECOVERY).toContain('status_after: statusAfter')
  })

  it('there is exactly ONE orchestrator, called from both boundaries', () => {
    expect((ICPS.match(/advanceAfterSettlement\(/g) ?? []).length).toBe(1)
    expect((RECOVERY.match(/advanceAfterSettlement\(/g) ?? []).length).toBe(1)
    // And it is defined once, in the module that owns the chain.
    expect((ADVANCE.match(/export async function advanceAfterSettlement/g) ?? []).length).toBe(1)
  })
})

describe('④ the automatic path grants nothing it did not have', () => {
  const BODY = ADVANCE.slice(ADVANCE.indexOf('export async function advanceAfterSettlement'))

  it('no P2, no Make Live, no Run, no send', () => {
    for (const forbidden of [
      'p2Authorised', 'second_paid_at', 'second_authorised_at',
      'goLiveProgramme', 'went_live_at', 'assertGoingLive', 'activate: true',
      'send-due', 'sendDue', 'FIGSY_OPERATOR_SEND_ENABLED', 'AUTO_OUTREACH_ENABLED',
    ]) {
      expect(BODY.includes(forbidden), `the continuation can reach ${forbidden}`).toBe(false)
    }
  })

  it('no new sourcing and no requalification', () => {
    for (const forbidden of [
      'sourceProgramme', 'qualifyCandidates', 'qualifyAndSettleBatch',
      'servePoolLeads', 'bulkMatchEmails', 'reconcile_programme_sourcing',
    ]) {
      expect(BODY.includes(forbidden), `the continuation can reach ${forbidden}`).toBe(false)
    }
  })

  it('no entitlement is moved twice — the continuation touches no counter', () => {
    for (const col of ['sourced_used', 'sourced_reserved', 'sourcing_ceiling', 'settle_programme_batch', 'settleBatch']) {
      expect(BODY.includes(col), `the continuation touches ${col}`).toBe(false)
    }
  })

  it('and it writes nothing itself — every write belongs to the functions it calls', () => {
    expect(BODY.includes('.update('), 'the continuation writes to the database').toBe(false)
    expect(BODY.includes('.insert('), 'the continuation inserts rows').toBe(false)
    expect(BODY.includes('setStatus('), 'the continuation sets a status').toBe(false)
  })
})

describe('⑤ the operator door survives as recovery, and says what happened', () => {
  it('the Ready for approval control still exists — House needs it once', () => {
    // House settled before this hook existed, so its one-time route to the review boundary is
    // the recovery door. Removing it while adding automation would strand the launch programme.
    expect(VIDA).toContain("case 'ready-for-approval':")
    const PROG_ROUTE = readFileSync(join(LIB, '..', 'routes', 'programme.ts'), 'utf8')
    expect(PROG_ROUTE).toContain("programmeRouter.post('/:id/ready-for-approval'")
    expect(PROG_ROUTE).toContain('advanceProgrammeToReview')
  })

  it('a blocked continuation is reported amber on the qualify screen, never green', () => {
    const at = VIDA.indexOf('d.continued && d.continued.reviewable === false')
    expect(at, 'the screen does not report a blocked continuation at all').toBeGreaterThan(-1)
    const block = VIDA.slice(at, at + 500)
    expect(block, 'a blocked continuation is painted as success').toContain("tone: 'warn'")
    expect(block).toContain('did not reach the client')
    // The API's own sentence, not a cheerful summary invented here.
    expect(block).toContain('d.continued.detail')
  })

  it('a successful continuation says the client has it, rather than implying a pending step', () => {
    const at = VIDA.indexOf("d.status_after === 'READY_FOR_APPROVAL'")
    expect(at).toBeGreaterThan(-1)
    expect(VIDA.slice(at, at + 220)).toContain('with the client to approve')
  })

  it('the settled report carries the continuation outcome', () => {
    expect(RECOVERY).toContain('continued: {')
    expect(RECOVERY).toContain('reviewable: continued.reviewable')
    expect(RECOVERY).toContain('blockers: continued.blockers')
  })
})
