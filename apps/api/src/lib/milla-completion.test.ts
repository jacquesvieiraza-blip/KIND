// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep (I5) — A CLIENT WHO FINISHED A PROGRAMME WAS PUT BACK ON THE PROOF SCREEN.
//
// ── THE DEFECT, IN ONE LINE OF SQL ──────────────────────────────────────────────────────
//
//   .not('status', 'in', '(COMPLETED,CANCELLED)')
//
// `readCustomerProgramme` filtered finished programmes OUT of the read. So the moment a
// programme completed, the query returned nothing, the handler fell through to `NO_PROGRAMME`,
// and Milla showed the client **"Tell Milla the outcome you want"** — the Proof screen. The
// entire record of what we delivered for them disappeared from their own workspace.
//
// Founder, 10 Sep: *"COMPLETED must remain visible in Milla. Do not casually treat CANCELLED as
// successful Completion; represent it truthfully using existing cancellation semantics while
// ensuring it does not fall back to Proof."*
//
// ── AND A SECOND BUG WAS HIDING BEHIND IT ───────────────────────────────────────────────
//
// There was no `.order(...)` at all — `.limit(1)` took whichever row the database happened to
// return first. A client with two programmes could be shown either one.
//
// ⚠️ THE WHOLE SUITE WAS GREEN BEFORE THIS FILE EXISTED. 303 files, 6,936 tests, and nothing
// asked what a completed client sees.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

type Row = Record<string, unknown>
const state: { programmes: Row[]; clients: Row[]; meetings: Row[]; programmesFail: boolean } =
  { programmes: [], clients: [], meetings: [], programmesFail: false }

function table(name: string) {
  const q: Record<string, unknown> = {}
  const filters: Array<(r: Row) => boolean> = []
  let order: { c: string; asc: boolean } | null = null
  let lim: number | undefined
  q.select = () => q
  q.order = (c: string, o?: { ascending?: boolean }) => { order = { c, asc: o?.ascending !== false }; return q }
  q.limit = (n: number) => { lim = n; return q }
  q.eq = (c: string, v: unknown) => { filters.push(r => r[c] === v); return q }
  q.is = (c: string, v: unknown) => { filters.push(r => (r[c] ?? null) === v); return q }
  q.not = (c: string, op: string, v: unknown) => {
    // ⚠️ THE MOCK SPEAKS `not in (…)` FOR REAL. Ignoring it would have made the old filter
    // invisible here, and the whole point of this file is that the filter had a consequence.
    if (op === 'in') {
      const set = String(v).replace(/^\(|\)$/g, '').split(',').map(x => x.trim())
      filters.push(r => !set.includes(String(r[c])))
    } else {
      filters.push(r => (r[c] ?? null) !== v)
    }
    return q
  }
  q.gte = (c: string, v: string) => { filters.push(r => String(r[c] ?? '') >= v); return q }
  q.in = (c: string, l: unknown[]) => { filters.push(r => l.includes(r[c] as never)); return q }
  const run = () => {
    if (name === 'programmes' && state.programmesFail) {
      return { data: null, count: null, error: { message: 'programmes unreadable' } }
    }
    const src = name === 'programmes' ? state.programmes : name === 'clients' ? state.clients
      : name === 'meetings' ? state.meetings : []
    let rows = src.filter(r => filters.every(f => f(r)))
    if (order) {
      const o = order as { c: string; asc: boolean }
      rows = [...rows].sort((a, b) => String(a[o.c] ?? '').localeCompare(String(b[o.c] ?? '')) * (o.asc ? 1 : -1))
    }
    if (typeof lim === 'number') rows = rows.slice(0, lim)
    return { data: rows, count: rows.length, error: null }
  }
  q.maybeSingle = async () => { const r = run(); return { data: (r.data ?? [])[0] ?? null, error: r.error } }
  q.single = q.maybeSingle
  q.then = (res: (v: unknown) => unknown) => Promise.resolve(run()).then(res)
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('./house-client', () => ({ isHouseClient: async () => false }))

import { readCustomerProgramme } from './customer-programme'

const CLIENT = 'client-1'

const programme = (id: string, status: string, createdAt: string, over: Row = {}): Row => ({
  id, client_id: CLIENT, status,
  meeting_target: 10, recommended_volume: 2500, price_total_cents: 400000,
  price_per_meeting_cents: 40000, first_payment_cents: 200000, second_payment_cents: 200000,
  calculator_assumptions: null, recommendation_accepted_at: null,
  sourcing_ceiling: 2500, sourced_used: 2500,
  first_paid_at: '2026-08-01', second_paid_at: '2026-08-20',
  first_authorised_at: null, second_authorised_at: null,
  approved_at: '2026-08-20', went_live_at: '2026-08-21', paused_at: null,
  review_required_at: null, review_resolved_at: null,
  created_at: createdAt, ...over,
})

beforeEach(() => {
  state.programmes = []
  state.meetings = []
  state.programmesFail = false
  state.clients = [{ id: CLIENT, outcome_stated: 'Book qualified meetings', proof_completed_at: '2026-07-01' }]
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① COMPLETED STAYS VISIBLE
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('① a finished client can still see what we delivered', () => {
  it('🛑 THE BUG: a COMPLETED programme is returned, not swallowed into the Proof screen', async () => {
    state.programmes = [programme('p1', 'COMPLETED', '2026-08-01')]
    const p = await readCustomerProgramme(CLIENT)
    expect(p, 'the read failed rather than answering').not.toBeNull()
    expect(p!.hasProgramme, 'a completed client was told they have no programme').toBe(true)
    expect(p!.programmeId).toBe('p1')
    expect(p!.stage, 'a finished client was sent back to Proof').toBe('Completion')
  })

  it('and it carries the real numbers, not the empty ones', async () => {
    // ⚠️ THE STAGE ALONE WOULD NOT PROVE THIS. `NO_PROGRAMME` could have been given the
    // Completion stage and still be a blank card; what a finished client needs to see is what
    // their programme actually did.
    state.programmes = [programme('p1', 'COMPLETED', '2026-08-01')]
    state.meetings = [
      { id: 'm1', client_id: CLIENT, programme_id: 'p1', state: 'BOOKED', excluded_reason: null, superseded_by: null },
      { id: 'm2', client_id: CLIENT, programme_id: 'p1', state: 'HELD', excluded_reason: null, superseded_by: null },
    ]
    const p = await readCustomerProgramme(CLIENT)
    expect(p!.progress.delivered).toBe(2500)
    expect(p!.progress.outcomesAchieved).toBe(2)
    expect(p!.money.totalCents).toBe(400000)
  })

  it('🛑 the terminal state says COMPLETED, so nothing has to infer it from the stage', async () => {
    state.programmes = [programme('p1', 'COMPLETED', '2026-08-01')]
    expect((await readCustomerProgramme(CLIENT))!.terminal).toBe('completed')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② CANCELLED IS NOT COMPLETE
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('② cancelled is visible, and is not dressed up as success', () => {
  it('🛑 a CANCELLED programme does not fall back to Proof either', async () => {
    state.programmes = [programme('p1', 'CANCELLED', '2026-08-01')]
    const p = await readCustomerProgramme(CLIENT)
    expect(p!.hasProgramme).toBe(true)
    expect(p!.stage).not.toBe('Proof')
  })

  it('🛑 AND IT IS DISTINGUISHABLE FROM A COMPLETED ONE', async () => {
    // The screen heading for `Completion` is "Programme complete". Without this field it would
    // print that to a client whose programme was cancelled — a false statement about their own
    // account, on the first line of their own workspace.
    state.programmes = [programme('p1', 'CANCELLED', '2026-08-01')]
    expect((await readCustomerProgramme(CLIENT))!.terminal,
      'a cancelled programme is indistinguishable from a completed one').toBe('cancelled')
  })

  it('a LIVE programme is not terminal at all', async () => {
    // ⚠️ THE COMPLEMENT, so "everything is terminal" cannot be how the cases above pass.
    state.programmes = [programme('p1', 'LIVE', '2026-08-01')]
    const p = await readCustomerProgramme(CLIENT)
    expect(p!.terminal).toBeNull()
    expect(p!.stage).toBe('Live')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ WHICH PROGRAMME, WHEN THERE ARE SEVERAL
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('③ the open programme wins, and the order is no longer whatever the database said', () => {
  it('🛑 a client who finished one and started another sees the NEW one', async () => {
    state.programmes = [
      programme('p-old', 'COMPLETED', '2026-06-01'),
      programme('p-new', 'SOURCING', '2026-09-01'),
    ]
    const p = await readCustomerProgramme(CLIENT)
    expect(p!.programmeId, 'the finished programme took over the workspace').toBe('p-new')
    expect(p!.terminal).toBeNull()
  })

  it('🛑 and the row order does not decide it — reversed input, same answer', async () => {
    // There was no `.order(...)` before, so `.limit(1)` took whatever came back first.
    state.programmes = [
      programme('p-new', 'SOURCING', '2026-09-01'),
      programme('p-old', 'COMPLETED', '2026-06-01'),
    ]
    expect((await readCustomerProgramme(CLIENT))!.programmeId).toBe('p-new')
  })

  it('🛑 AN OPEN PROGRAMME BEATS A NEWER FINISHED ONE — "open wins" is not "newest wins"', async () => {
    // ⛓️ THIS CASE EXISTS BECAUSE A MUTATION PROVED THE SECTION ABOVE DID NOT COVER IT.
    // Replacing "prefer the open one, else the newest" with a bare `all[0]` left every test
    // green: in the cases above the open programme HAPPENED to also be the newest, so both
    // rules gave the same answer. Only a client whose open programme is the OLDER one can tell
    // the two apart — and that client would otherwise have their live work replaced in their
    // own workspace by a finished programme.
    state.programmes = [
      programme('p-open', 'SOURCING', '2026-06-01'),
      programme('p-done', 'COMPLETED', '2026-09-01'),
    ]
    const p = await readCustomerProgramme(CLIENT)
    expect(p!.programmeId, 'a finished programme took over from live work').toBe('p-open')
    expect(p!.terminal).toBeNull()
  })

  it('when EVERY programme is over, the newest finished one is what they see', async () => {
    state.programmes = [
      programme('p-old', 'COMPLETED', '2026-06-01'),
      programme('p-newer', 'COMPLETED', '2026-08-01'),
    ]
    const p = await readCustomerProgramme(CLIENT)
    expect(p!.programmeId).toBe('p-newer')
    expect(p!.terminal).toBe('completed')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ THE TWO ANSWERS THAT ARE NOT "A COMPLETED PROGRAMME"
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('④ absence and failure are still different from each other, and from Completion', () => {
  it('a client with no programme at all is still at Proof', async () => {
    state.programmes = []
    const p = await readCustomerProgramme(CLIENT)
    expect(p!.hasProgramme).toBe(false)
    // ⚠️ `proof_completed_at` IS SET IN THE FIXTURE, so this client is at the calculator —
    // which is Recommendation, not Proof. The distinction A added, still holding.
    expect(p!.stage).toBe('Recommendation')
    expect(p!.terminal).toBeNull()
  })

  it('🛑 A FAILED READ IS STILL null, NEVER "no programme"', async () => {
    // The recurring defect shape in this repo, and the one that matters most on this row: a
    // database failure rendered as absence would tell a paying client they have no programme.
    state.programmesFail = true
    expect(await readCustomerProgramme(CLIENT)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ THE SCREEN THAT RENDERS IT
//
// 🛑 THIS SECTION EXISTS BECAUSE A MUTATION PROVED NOTHING COVERED THE HEADING. Reverting
// `ProgrammeWorkspace` to a bare "Programme complete" left every suite green — the portal has
// no test that renders this component, so the one sentence a cancelled client reads first was
// unguarded. A cross-file assertion is weaker than rendering it, and far stronger than nothing.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('⑤ the Milla heading does not call a cancelled programme complete', () => {
  it('🛑 the Completion heading branches on the terminal state', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(
      join(__dirname, '..', '..', '..', 'portal', 'src', 'components', 'milla', 'ProgrammeWorkspace.tsx'), 'utf8')
    const at = src.indexOf("case 'Completion':")
    expect(at, 'the Completion heading has moved or been renamed').toBeGreaterThan(-1)
    const line = src.slice(at, src.indexOf('\n', at))
    expect(line, 'a cancelled programme is still told it is complete').toContain('terminal')
    expect(line).toContain("'Programme cancelled'")
  })

  it('and the screen still knows the field exists', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(
      join(__dirname, '..', '..', '..', 'portal', 'src', 'components', 'milla', 'ProgrammeWorkspace.tsx'), 'utf8')
    expect(src, "the portal's mirrored type dropped `terminal`, so the heading reads undefined")
      .toContain("terminal?: 'completed' | 'cancelled' | null")
  })
})
