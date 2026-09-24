// ═══════════════════════════════════════════════════════════════════════════════════════
// 24 Sep — REWRITE A PACKAGE NOBODY HAS APPROVED AND NOTHING HAS LEFT.
//
// House's package awaiting approval carried copy naming one sample prospect (#2320 fixed new
// copy; this reaches the copy already written). These run the real rewrite over a fake store:
// every refusal writes nothing, and a success rewrites every prepared person, then re-freezes.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Enrol = { id: string; lead_id: string; status: string; current_step: number; programme_id: string; steps?: unknown; step1_subject?: string }
const state = vi.hoisted(() => ({
  programme: null as null | { id: string; status: string; approved_at: string | null; paused_at: string | null },
  sent: 0,
  enrolments: [] as Enrol[],
  leads: [] as { id: string; first_name: string; last_name: string; company: string; job_title: string; industry: string | null }[],
  newSteps: [] as { channel: 'email'; subject: string; body: string; wait_days: number }[],
  genCalls: [] as unknown[],
  genOk: true,
  refreezes: 0,
  updates: 0,
}))

function builder(table: string) {
  const filters: Record<string, unknown> = {}
  let op: 'select' | 'update' = 'select'
  let patch: Record<string, unknown> = {}
  let inIds: string[] | null = null
  let head = false
  const b: Record<string, unknown> = {}
  b.select = (_c?: string, o?: { head?: boolean }) => { if (o?.head) head = true; return b }
  b.eq = (k: string, v: unknown) => { filters[k] = v; return b }
  b.in = (_k: string, v: string[]) => { inIds = v; return b }
  b.order = () => b
  b.range = () => b
  b.update = (p: Record<string, unknown>) => { op = 'update'; patch = p; return b }
  b.maybeSingle = async () => ({ data: table === 'clients' ? { company_name: 'Kind' } : null, error: null })
  b.then = (resolve: (v: unknown) => void) => {
    if (table === 'figsy_sent_emails' && head) return resolve({ count: state.sent, error: null })
    if (table === 'leads') return resolve({ data: state.leads.filter(l => !inIds || inIds.includes(l.id)), error: null })
    if (table === 'figsy_enrollments' && op === 'select') return resolve({ data: state.enrolments, error: null })
    if (table === 'figsy_enrollments' && op === 'update') {
      const row = state.enrolments.find(e => e.id === filters.id && e.programme_id === filters.programme_id
        && e.current_step === filters.current_step && e.status === filters.status)
      if (!row) return resolve({ data: [], error: null })
      Object.assign(row, patch); state.updates++
      return resolve({ data: [{ id: row.id }], error: null })
    }
    return resolve({ data: null, error: null })
  }
  return b
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => builder(t) } }))
vi.mock('./programme', () => ({
  getProgramme: async () => state.programme,
  refreezeForReview: async () => { state.refreezes++; return { ok: true, changed: true, hash: 'h2', version: 2 } },
}))
vi.mock('./programme-chain', () => ({
  resolveProgrammeChain: async () => ({
    ok: true,
    chain: { clientId: 'client-1', campaignId: 'camp-1', sequenceId: 'seq-1', steps: state.newSteps },
  }),
}))
vi.mock('./programme-sequence-generation', () => ({
  generateProgrammeSequence: async (id: string, opts: unknown) => {
    state.genCalls.push({ id, opts })
    return state.genOk
      ? { ok: true, created: false, steps: 5, sequenceId: 'seq-1', name: 'House — Meeting — 5 touches', drafted_against: 'CEO' }
      : { ok: false, alreadyPresent: false, reason: 'The drafted outreach did not pass the quality rules.' }
  },
}))

import { rewriteProgrammeMessages } from './programme-rewrite'

const OLD = 'christopher, ceo lead gen question'
beforeEach(() => {
  state.programme = { id: 'prog-1', status: 'READY_FOR_APPROVAL', approved_at: null, paused_at: null }
  state.sent = 0
  state.leads = [
    { id: 'l1', first_name: 'Dana', last_name: 'Okafor', company: 'Harbour Point LLC', job_title: 'CEO', industry: null },
    { id: 'l2', first_name: 'Sam', last_name: 'Reyes', company: 'Blue Sky Ltd', job_title: 'Founder', industry: null },
  ]
  state.enrolments = state.leads.map((l, i) => ({ id: `e${i + 1}`, lead_id: l.id, status: 'enrolled', current_step: 0, programme_id: 'prog-1', step1_subject: OLD }))
  state.newSteps = [
    { channel: 'email', subject: '{{first_name}}, quick question', body: 'Hi {{first_name}}, a thought for {{company}}.\n\nKind', wait_days: 4 },
    { channel: 'email', subject: 'following up', body: 'Hi {{first_name}}, one more idea.\n\nKind', wait_days: 0 },
  ]
  state.genCalls = []; state.genOk = true; state.refreezes = 0; state.updates = 0
})

const nothingWritten = () => {
  expect(state.genCalls).toHaveLength(0)
  expect(state.updates).toBe(0)
  expect(state.refreezes).toBe(0)
}

describe('refuses — and writes nothing — unless nobody approved and nothing left', () => {
  it('🛑 an approved or live programme', async () => {
    state.programme!.status = 'APPROVED'
    expect((await rewriteProgrammeMessages('prog-1')).ok).toBe(false)
    nothingWritten()
  })

  it('🛑 approved_at set, even if the status still reads READY_FOR_APPROVAL', async () => {
    state.programme!.approved_at = '2026-09-24T10:00:00Z'
    expect((await rewriteProgrammeMessages('prog-1')).ok).toBe(false)
    nothingWritten()
  })

  it('🛑 paused', async () => {
    state.programme!.paused_at = '2026-09-24T10:00:00Z'
    expect((await rewriteProgrammeMessages('prog-1')).ok).toBe(false)
    nothingWritten()
  })

  it('🛑 a single email already sent', async () => {
    state.sent = 1
    const r = await rewriteProgrammeMessages('prog-1')
    expect(r.ok ? '' : r.code).toBe('already_sent')
    nothingWritten()
  })

  it('🛑 a single prepared person already past step 0', async () => {
    state.enrolments[1].current_step = 1
    const r = await rewriteProgrammeMessages('prog-1')
    expect(r.ok ? '' : r.code).toBe('already_sent')
    nothingWritten()
  })

  it('the generator refusing (quality or leak guard) leaves every person untouched', async () => {
    state.genOk = false
    const r = await rewriteProgrammeMessages('prog-1')
    expect(r.ok ? '' : r.code).toBe('generation_refused')
    expect(state.updates).toBe(0)
    expect(state.refreezes).toBe(0)
  })
})

describe('the rewrite', () => {
  it('🛑 replaces the sequence, rebuilds EVERY prepared person from it, then re-freezes', async () => {
    const r = await rewriteProgrammeMessages('prog-1')
    expect(r).toEqual({ ok: true, rewritten: 2, version: 2, sequenceName: 'House — Meeting — 5 touches' })
    expect(state.genCalls).toEqual([{ id: 'prog-1', opts: { replaceExisting: true } }])
    expect(state.enrolments[0].step1_subject).toBe('Dana, quick question')
    expect(state.enrolments[1].step1_subject).toBe('Sam, quick question')
    expect(JSON.stringify(state.enrolments)).not.toContain('christopher')
    expect((state.enrolments[0].steps as { body: string }[])[0].body).toContain('Harbour Point LLC')
    expect(state.refreezes).toBe(1)
  })

  it('🛑 a person who cannot be rebuilt means NO new version is frozen', async () => {
    state.leads = state.leads.slice(0, 1)   // l2's lead row is missing
    const r = await rewriteProgrammeMessages('prog-1')
    expect(r.ok ? '' : r.code).toBe('partial')
    expect(state.refreezes).toBe(0)
  })
})

describe('the doors', () => {
  const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')
  it('the generator replaces only when asked; every other caller still keeps an existing sequence', () => {
    const gen = read('programme-sequence-generation.ts')
    expect(gen).toContain('if (sequenceId && existingSteps.length > 0 && opts.replaceExisting !== true) {')
    expect(read('programme-preparation.ts')).toContain('await generateProgrammeSequence(programmeId)')
  })

  it('the route calls the rewrite and audits both outcomes', () => {
    const route = read('../routes/programme.ts')
    expect(route).toContain("programmeRouter.post('/:id/rewrite-messages'")
    expect(route).toContain("rewrite_messages: 'refused'")
    expect(route).toContain("rewrite_messages: 'rewritten'")
  })

  it('Vida draws the button only for a package awaiting approval that was never approved, and outside the six lifecycle moves', () => {
    const vida = read('../../../admin/src/app/vida/page.tsx')
    expect(vida).toContain("return !!p && p.status === 'READY_FOR_APPROVAL' && !p.approved_at && !p.paused_at && prog?.preparing !== true")
    expect(vida).toContain('{canRewriteMessages() && (')
    // Its own function, like the re-freeze: never a seventh `lifecycle()` move.
    expect(vida).toContain('const rewriteMessages = useCallback')
    expect(vida).not.toContain("lifecycle('rewrite-messages'")
  })
})
