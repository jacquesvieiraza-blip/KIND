// ═══════════════════════════════════════════════════════════════════════════════════════
// THE RECOVERY DOOR IN THE BACKGROUND — the run outlives the response, and the record outlives both.
//
// ⛓️ 9 Sep — WHAT THIS GUARDS. The founder pressed *Ready for approval* on House; the route held
// the connection open for the whole chain; an edge closed it with plain-text `upstream error`;
// the API finished anyway and told nobody, and — because the route audited success only —
// recorded nothing. These cases prove the shape that replaces it: a start that returns at once,
// one run per programme at a time, an audit row on EVERY outcome, a runner that never rejects,
// and a reader that hands the last outcome back to the screen.
//
// ⚠️ THE REAL `advanceProgrammeToReview` RUNS UNDERNEATH. It is called inside its own module,
// where no registry mock can reach it, so the layer beneath it is stubbed instead — exactly as
// programme-auto-continue.test.ts does — and the runner's behaviour is proved on the genuine
// orchestrator, not on a stand-in that returns what it was told.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

const HOUSE = '8a8d0fd7-bf6b-4d87-9188-9b3f17864bca'
const CLIENT = '6bd2046b-5da7-4d48-a249-b9412b7dd554'

const state: { row: Record<string, unknown> | null; auditRows: Record<string, unknown>[] } = { row: null, auditRows: [] }
const audits: Record<string, unknown>[] = []

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
    self.then = (res: (v: unknown) => unknown) =>
      res({ data: table === 'operator_audit_log' ? state.auditRows : [], error: null, count: 0 })
    return self
  }
  return { db: { from: (t: string) => make(t), rpc: async () => ({ data: null, error: null }) } }
})

vi.mock('./operator-audit', () => ({
  writeOperatorAudit: async (e: Record<string, unknown>) => { audits.push(e) },
}))

/** A gate the test can hold open, so a run is provably IN FLIGHT while a second start arrives. */
const gate: { release: () => void; wait: Promise<void> } = { release: () => {}, wait: Promise.resolve() }
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
  return { ...actual, prepareProgrammeOutreach: async () => { await gate.wait; return prep.impl() } }
})
vi.mock('./preparation-readiness', async (orig) => {
  const actual = await orig<typeof import('./preparation-readiness')>()
  return { ...actual, programmePreparationReadiness: async () => ready.impl() }
})
vi.mock('./programme', async (orig) => {
  const actual = await orig<typeof import('./programme')>()
  return { ...actual, markReadyForApproval: async () => marked.impl() }
})

const {
  startAdvanceInBackground, isAdvanceRunning, lastPreparationAttempt,
} = await import('./programme-advance')

const settledRow = (over: Record<string, unknown> = {}) => ({
  id: HOUSE, client_id: CLIENT, status: 'SOURCING', paused_at: null, approved_at: null,
  first_paid_at: null, first_authorised_at: '2026-09-01T00:00:00.000Z',
  second_paid_at: null, second_payment_ref: null, second_authorised_at: null,
  ...over,
})

/** Wait for the in-flight run for HOUSE to leave the map. Bounded, and by quiescence not a clock. */
async function settle(): Promise<void> {
  for (let i = 0; i < 200 && isAdvanceRunning(HOUSE); i++) await new Promise(r => setTimeout(r, 0))
}

beforeEach(() => {
  state.row = settledRow()
  state.auditRows = []
  audits.length = 0
  gate.wait = Promise.resolve()
  prep.impl = () => completePrep()
  ready.impl = () => ({ ready: true, blockers: [], facts: null, degraded: null })
  marked.impl = () => { if (state.row) state.row.status = 'READY_FOR_APPROVAL'; return { ok: true } }
})

describe('① the start returns at once and the run finishes on its own', () => {
  it('returns started:true synchronously, and the programme reaches review afterwards', async () => {
    const out = startAdvanceInBackground(HOUSE, 'operator_recovery', 'founder@kind')
    expect(out).toEqual({ started: true, already_running: false })
    expect(isAdvanceRunning(HOUSE), 'the run is not registered as in flight').toBe(true)
    await settle()
    expect(isAdvanceRunning(HOUSE), 'the run never left the in-flight map').toBe(false)
    expect(state.row?.status).toBe('READY_FOR_APPROVAL')
  })
})

describe('② one run per programme at a time', () => {
  it('a second press while the first is in flight starts nothing', async () => {
    let release = () => {}
    gate.wait = new Promise<void>(r => { release = r })
    const first = startAdvanceInBackground(HOUSE, 'operator_recovery', 'founder@kind')
    const second = startAdvanceInBackground(HOUSE, 'operator_recovery', 'founder@kind')
    expect(first.started).toBe(true)
    expect(second, 'a concurrent press started a second run').toEqual({ started: false, already_running: true })
    release()
    await settle()
    // 🛑 EXACTLY ONE OUTCOME WAS RECORDED — the second press wrote nothing.
    expect(audits.filter(a => a.subjectId === HOUSE)).toHaveLength(1)
  })

  it('and a press AFTER it finishes starts a fresh run, which is the idempotent no-op', async () => {
    startAdvanceInBackground(HOUSE, 'operator_recovery', 'founder@kind')
    await settle()
    // The row is now READY_FOR_APPROVAL; the second run must not prepare again.
    prep.impl = () => { throw new Error('prepareProgrammeOutreach ran on a frozen review set') }
    const again = startAdvanceInBackground(HOUSE, 'operator_recovery', 'founder@kind')
    expect(again.started).toBe(true)
    await settle()
    const last = audits[audits.length - 1]
    expect(last.action).toBe('programme_prepared_for_review')
    expect(String((last.detail as { headline: string }).headline)).toContain('already')
  })
})

describe('③ the outcome is audited on every branch — the record outlives the response', () => {
  it('success writes programme_prepared_for_review with the headline and counts', async () => {
    startAdvanceInBackground(HOUSE, 'operator_recovery', 'founder@kind')
    await settle()
    const a = audits.find(x => x.action === 'programme_prepared_for_review')
    expect(a, 'no success audit row').toBeTruthy()
    expect(a!.subjectId).toBe(HOUSE)
    expect(a!.clientId).toBe(CLIENT)
    expect(a!.operatorEmail).toBe('founder@kind')
    const d = a!.detail as Record<string, unknown>
    expect(d.trigger).toBe('operator_recovery')
    expect(d.enrolled).toBe(246)
    expect(d.status_after).toBe('READY_FOR_APPROVAL')
    expect(String(d.headline)).toContain('ready for the client')
  })

  it('a readiness refusal writes programme_prepare_for_review_refused with the NAMED blockers', async () => {
    ready.impl = () => ({
      ready: false,
      blockers: [{ code: 'no_sender', detail: 'No sending mailbox is assigned and ready for this client.' }],
      facts: null, degraded: null,
    })
    marked.impl = () => { throw new Error('the transition ran on a blocked readiness') }
    startAdvanceInBackground(HOUSE, 'operator_recovery', 'founder@kind')
    await settle()
    const a = audits.find(x => x.action === 'programme_prepare_for_review_refused')
    expect(a, 'no refusal audit row — a failed background run left no record').toBeTruthy()
    const d = a!.detail as { blockers: { code: string }[]; reason: string }
    expect(d.blockers.map(b => b.code)).toContain('no_sender')
    expect(d.reason).toContain('mailbox')
    expect(state.row?.status, 'the status moved despite a missing sender').toBe('SOURCING')
  })

  it('a throw inside the chain is contained, recorded as a refusal, and never rejects', async () => {
    prep.impl = () => { throw new Error('database exploded') }
    const out = startAdvanceInBackground(HOUSE, 'operator_recovery', 'founder@kind')
    expect(out.started).toBe(true)
    await settle()
    const a = audits.find(x => x.action === 'programme_prepare_for_review_refused')
    expect(a, 'a thrown run left no record').toBeTruthy()
    expect(String((a!.detail as { reason: string }).reason)).toContain('database exploded')
    expect(String((a!.detail as { reason: string }).reason)).toContain('Ready for approval again')
    expect(isAdvanceRunning(HOUSE)).toBe(false)
  })

  it('a retry after the cause is fixed completes — the failure is not sticky', async () => {
    prep.impl = () => { throw new Error('transient') }
    startAdvanceInBackground(HOUSE, 'operator_recovery', 'founder@kind')
    await settle()
    expect(state.row?.status).toBe('SOURCING')
    prep.impl = () => completePrep({ enrolled: [], alreadyEnrolled: 246 })
    startAdvanceInBackground(HOUSE, 'operator_recovery', 'founder@kind')
    await settle()
    expect(state.row?.status).toBe('READY_FOR_APPROVAL')
    expect(audits.map(a => a.action)).toEqual(['programme_prepare_for_review_refused', 'programme_prepared_for_review'])
  })

  it('an unknown programme id is refused and recorded, not thrown', async () => {
    state.row = null
    startAdvanceInBackground(HOUSE, 'operator_recovery', 'founder@kind')
    await settle()
    const a = audits.find(x => x.action === 'programme_prepare_for_review_refused')
    expect(a).toBeTruthy()
    expect(String((a!.detail as { reason: string }).reason)).toContain('no programme with that id')
  })
})

describe('④ the last attempt is read back for the screen', () => {
  it('returns null when nothing was ever recorded', async () => {
    state.auditRows = []
    expect(await lastPreparationAttempt(HOUSE)).toBeNull()
  })

  it('hands back a refusal with its blockers as the server\'s own sentences', async () => {
    state.auditRows = [{
      operator_email: 'founder@kind', action: 'programme_prepare_for_review_refused',
      created_at: '2026-09-09T10:00:00.000Z',
      detail: {
        reason: 'This programme is prepared but not yet ready — No sending mailbox is assigned.',
        blockers: [{ code: 'no_sender', detail: 'No sending mailbox is assigned.' }, { code: 7, detail: 'junk' }],
      },
    }]
    const last = await lastPreparationAttempt(HOUSE)
    expect(last).toEqual({
      at: '2026-09-09T10:00:00.000Z', ok: false, by: 'founder@kind',
      detail: 'This programme is prepared but not yet ready — No sending mailbox is assigned.',
      blockers: [{ code: 'no_sender', detail: 'No sending mailbox is assigned.' }],
    })
  })

  it('asks for the NEWEST attempt, which the fake cannot express and the source can', async () => {
    // ⛓️ ADDED 9 Sep after a mutation came back green. Flipping `ascending: false` to `true`
    // changed nothing here, because the db fake returns the rows it is given whatever the
    // query says — so "the most recent attempt" was resting on a line no test read. It matters:
    // ascending would hand the founder the FIRST attempt ever made, which for House is the one
    // that failed, forever. A fake cannot prove an ordering it does not implement, so the
    // ordering is pinned where it is actually expressed.
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(__dirname, 'programme-advance.ts'), 'utf8')
    const fn = src.slice(src.indexOf('export async function lastPreparationAttempt'))
    expect(fn).toContain("order('created_at', { ascending: false })")
    expect(fn).toContain('.limit(1)')
    // And it reads only the two preparation actions — never a lifecycle row that would make
    // "requested" look like "completed".
    // ⚠️ THE EXACT LIST, CLOSED. A `toContain` of the two names still matches when a third is
    // appended — and appending `programme_lifecycle` would let the row the ROUTE writes when a
    // run is merely REQUESTED be read back as the outcome, so "started" would render as
    // "completed" on the founder's screen.
    expect(fn).toContain(".in('action', ['programme_prepared_for_review', 'programme_prepare_for_review_refused'])")
    expect(fn).toContain(".eq('subject_id', programmeId)")
  })

  it('hands back a success with its headline', async () => {
    state.auditRows = [{
      operator_email: 'founder@kind', action: 'programme_prepared_for_review',
      created_at: '2026-09-09T10:05:00.000Z',
      detail: { headline: 'This programme is ready for the client to approve.' },
    }]
    const last = await lastPreparationAttempt(HOUSE)
    expect(last?.ok).toBe(true)
    expect(last?.detail).toContain('ready for the client')
    expect(last?.blockers).toEqual([])
  })
})

describe('⑤ the background path grants nothing it did not have', () => {
  it('no P2, no Make Live, no Run, no send, no sourcing, no requalification, no entitlement write', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(__dirname, 'programme-advance.ts'), 'utf8')
    const body = src.slice(src.indexOf('export function startAdvanceInBackground'))
    for (const forbidden of [
      'p2Authorised', 'second_authorised_at', 'goLiveProgramme', 'went_live_at', 'activate: true',
      'send-due', 'sendSequenceEmail', 'FIGSY_OPERATOR_SEND_ENABLED',
      'sourceProgramme', 'qualifyCandidates', 'qualifyAndSettleBatch', 'reconcile_programme_sourcing',
      'sourced_used', 'sourced_reserved', 'settle_programme_batch', 'setStatus(',
    ]) {
      expect(body.includes(forbidden), `the background runner can reach ${forbidden}`).toBe(false)
    }
  })
})
