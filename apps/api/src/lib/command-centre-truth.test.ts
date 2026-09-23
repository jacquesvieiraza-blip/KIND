// ═══════════════════════════════════════════════════════════════════════════════════════
// THE COMMAND CENTRE WAS THE LAST UNBOUNDED CURRENT-WORK SURFACE
//
// ── WHAT IT WAS SHOWING ─────────────────────────────────────────────────────────────────
//
// `/milla/command-centre` is reachable from the normal Milla rail, and for a programme-model
// customer it printed two different kinds of falsehood side by side:
//
//   ① RETIRED ECONOMICS — "Company budget pool", "Credits left", a per-seat credit budget and
//      a control to edit it. The wallet and the credit pool do not exist under the programme
//      model; a page that still prints them is making a commercial claim the product no longer
//      honours.
//
//   ② UNBOUNDED ACTIVITY — Leads · Reply % · Booked · Contacted, every one `client_id` per rep
//      with no boundary, so the retired book rendered as the company's current picture.
//
// ── AND A THIRD THAT WAS NOT WHAT IT LOOKED LIKE ────────────────────────────────────────
//
// 🛑 WINNING PLAYS DOES NOT RANK ANYTHING. `winning_plays.reply_rate` is a STORED column and
// nothing in the product computes it: the save route never sets it, so a genuinely saved play
// is NULL and shows no badge. The ONLY writer in the repository is `lib/seed-company.ts`,
// which hardcodes 14.5 and 11.2. So the risk was never "ranking a winner from legacy activity"
// — it was a DEMO CONSTANT rendered to a customer as "14.5% reply" under a crown, a
// performance claim about their team with no measurement behind it.
//
// ── WHAT IS PROVED HERE ─────────────────────────────────────────────────────────────────
//
// Every case is a MIXED-HISTORY company: seats carrying a large historical book AND, where
// relevant, current programme work. A clean fixture cannot fail the way this surface failed.
//
// 🛑 NOTHING IS DELETED OR BACKFILLED, and no figure is invented to replace a suppressed one.
// A suppressed economic value is `null` — absence — never `0`, which would be a claim that
// they have no credits left rather than that credits are not part of their product.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: {
  clients: Row[]; leads: Row[]; programmes: Row[]; replies: Row[]; meetings: Row[]
  campaigns: Row[]; icps: Row[]; sent: Row[]; companies: Row[]; requests: Row[]; plays: Row[]
} = { clients: [], leads: [], programmes: [], replies: [], meetings: [], campaigns: [], icps: [], sent: [], companies: [], requests: [], plays: [] }

/** Every write any route attempted this test, in order. */
const writes: Array<{ op: 'insert' | 'update'; table: string; row: Row }> = []

function table(name: string) {
  const rows = (): Row[] =>
    name === 'leads' ? state.leads : name === 'programmes' ? state.programmes
    : name === 'figsy_replies' ? state.replies : name === 'meetings' ? state.meetings
    : name === 'figsy_campaigns' ? state.campaigns : name === 'icps' ? state.icps
    : name === 'figsy_sent_emails' ? state.sent : name === 'companies' ? state.companies
    : name === 'seat_credit_requests' ? state.requests : name === 'winning_plays' ? state.plays
    : state.clients
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _limit: 0, _inserted: null as Row | null,
    select() { return q },
    // Writes are RECORDED as well as applied, so a test can assert that a refused action
    // touched nothing — a 403 that still wrote would pass every status assertion.
    insert(v: Row | Row[]) {
      const row = { id: `new-${name}`, ...(Array.isArray(v) ? v[0] : v) } as Row
      writes.push({ op: 'insert', table: name, row }); q._inserted = row; rows().push(row); return q
    },
    update(v: Row) { writes.push({ op: 'update', table: name, row: v }); return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    neq(c: string, v: unknown) { q._f.push((r: Row) => r[c] !== v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    gte() { return q }, lte() { return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    not(c: string, op: string, v: unknown) {
      if (op === 'is' && v === null) { q._f.push((r: Row) => (r[c] ?? null) !== null); return q }
      const set = String(v).replace(/[()]/g, '').split(',')
      q._f.push((r: Row) => !set.includes(String(r[c]))); return q
    },
    order() { return q }, limit(n: number) { q._limit = n; return q },
    _hit() {
      const all = rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r)))
      return q._limit > 0 ? all.slice(0, q._limit) : all
    },
    async maybeSingle() { return { data: q._inserted ?? q._hit()[0] ?? null, error: null } },
    async single() { return { data: q._inserted ?? q._hit()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) {
      return Promise.resolve({ data: q._hit(), error: null, count: q._hit().length }).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    // `allocate_pool_to_rep` returns TRUE when the guarded move succeeded, so the legacy path
    // can be walked all the way to success rather than stopping at "pool too small".
    rpc: async () => ({ data: true, error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'nobody@example.com' } } }) } },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../lib/email', () => ({ sendSeatInviteEmail: () => Promise.resolve() }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))

const CO = 'co-1'
const OWNER = 'seat-owner'
const REP = 'seat-rep'
const OWNER_USER = 'u-owner'
const P_NEW = 'P_NEW'

async function callGet(path: string, params: Record<string, string> = {}, userId = OWNER_USER) {
  const m = await import('../routes/company')
  const layer = (m.companyRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === path && l.route?.methods.get)
  if (!layer) throw new Error(`GET ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null; let status = 200
  const res: any = { json: (b: unknown) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ userId, query: {}, body: {}, params }, res, () => {})
  return { payload, status }
}
const overview = () => callGet('/overview')
const plays    = () => callGet('/winning-plays')
/** The panel one click beneath the roster row. */
const detail   = (id = REP) => callGet('/seats/:id/detail', { id })

async function callPost(
  path: string, body: Record<string, unknown> = {}, params: Record<string, string> = {}, userId = OWNER_USER,
) {
  const m = await import('../routes/company')
  const layer = (m.companyRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === path && l.route?.methods.post)
  if (!layer) throw new Error(`POST ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null; let status = 200
  const res: any = { json: (b: unknown) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ userId, query: {}, body, params }, res, () => {})
  return { payload, status }
}
async function callPatch(path: string, body: Record<string, unknown>, params: Record<string, string> = {}, userId = OWNER_USER) {
  const m = await import('../routes/company')
  const layer = (m.companyRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === path && l.route?.methods.patch)
  if (!layer) throw new Error(`PATCH ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null; let status = 200
  const res: any = { json: (b: unknown) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ userId, query: {}, body, params }, res, () => {})
  return { payload, status }
}

/** The company shell: an owner seat that opens the page, and one rep seat under it. */
function company(repModel: string | null | undefined, ownerModel: string | null = 'legacy') {
  state.companies.push({ id: CO, name: 'Acme', credit_pool: 5000, seat_cap: 25 })
  const owner: Row = {
    id: OWNER, user_id: OWNER_USER, company_id: CO, seat_role: 'owner', company_name: 'Owner',
    seat_budget: 1000, credit_balance: 900, seat_active: true, seat_accepted_at: 'a',
    proof_passes_done: 0, wallet_balance_usd: 0,
  }
  if (ownerModel !== undefined) owner.commercial_model = ownerModel
  state.clients.push(owner)
  const rep: Row = {
    id: REP, user_id: 'u-rep', company_id: CO, seat_role: 'rep', company_name: 'Rep One',
    seat_budget: 500, credit_balance: 200, seat_active: true, seat_accepted_at: 'a',
    proof_passes_done: 0, wallet_balance_usd: 0,
  }
  // `undefined` = the column is ABSENT → the resolver reads UNREADABLE (a missing field is not
  // a NULL). That is the transient-authority-failure fixture.
  if (repModel !== undefined) rep.commercial_model = repModel
  state.clients.push(rep)
}

/** The rep's large historical book: leads, replies, sends, meetings — all NULL-programme. */
function repHistory(seat = REP) {
  for (const n of [1, 2, 3]) {
    state.leads.push({ id: `h${n}-${seat}`, client_id: seat, programme_id: null, proof_pass: null, crm_existing: n === 1, first_name: 'Retired', last_name: `Lead ${n}`, company: 'Retired Co', revealed_at: 'r', delivered_at: 'd', surfaced_for_approval_at: 's', status: 'exported' })
  }
  state.replies.push({ id: `r-old-${seat}`, client_id: seat, lead_id: `h1-${seat}`, from_name: 'Retired Prospect', from_email: 'old@x.com', classification: 'hot', received_at: '2026-02-02', processed_at: '2026-02-02', meeting_booked_at: '2026-02-03' })
  state.icps.push({ id: `icp-old-${seat}`, client_id: seat, programme_id: null, created_at: '2026-01-01' })
  state.campaigns.push({ id: `camp-old-${seat}`, client_id: seat, icp_id: `icp-old-${seat}`, name: 'Retired Q1 blast', status: 'active', leads_enrolled: 300, emails_sent: 900, replies_total: 42, replies_interested: 9, created_at: '2026-02-01' })
  state.sent.push({ id: `s-old-${seat}`, campaign_id: `camp-old-${seat}`, subject: 'Retired subject', step: 1, sent_at: '2026-02-01', opened_at: null })
  state.meetings.push({ id: `m-old-${seat}`, client_id: seat, lead_id: `h1-${seat}`, programme_id: null, state: 'HELD', scheduled_at: '2026-02-03', excluded_reason: null, superseded_by: null, rescheduled_from: null })
}
/** The rep's CURRENT programme work. */
function repProgramme(seat = REP) {
  state.programmes.push({ id: P_NEW, client_id: seat, status: 'LIVE', meeting_target: 10, first_paid_at: 'p1', second_paid_at: 'p2', approved_at: 'a', went_live_at: 'w', paused_at: null, review_required_at: null, review_resolved_at: null, price_total_cents: 100000, sourcing_ceiling: 100, sourced_used: 2 })
  state.icps.push({ id: `icp-new-${seat}`, client_id: seat, programme_id: P_NEW, created_at: '2026-09-01' })
  state.campaigns.push({ id: `camp-new-${seat}`, client_id: seat, icp_id: `icp-new-${seat}`, name: 'Programme launch', status: 'active', leads_enrolled: 2, emails_sent: 1, replies_total: 1, replies_interested: 1, created_at: '2026-09-01' })
  for (const n of [1, 2]) {
    state.leads.push({ id: `n${n}-${seat}`, client_id: seat, programme_id: P_NEW, proof_pass: null, crm_existing: false, first_name: 'Current', last_name: `Lead ${n}`, company: 'Current Co', revealed_at: null, delivered_at: 'd', surfaced_for_approval_at: 's', status: 'scored' })
  }
  state.replies.push({ id: `r-new-${seat}`, client_id: seat, lead_id: `n2-${seat}`, from_name: 'Programme Prospect', from_email: 'new@x.com', classification: 'hot', received_at: '2026-09-03', processed_at: '2026-09-03', meeting_booked_at: null })
  state.sent.push({ id: `s-new-${seat}`, campaign_id: `camp-new-${seat}`, subject: 'Programme subject', step: 1, sent_at: '2026-09-02', opened_at: null })
  state.meetings.push({ id: `m-new-${seat}`, client_id: seat, lead_id: `n1-${seat}`, programme_id: P_NEW, state: 'BOOKED', scheduled_at: '2026-09-10', excluded_reason: null, superseded_by: null, rescheduled_from: null })
}
const repSeat = (p: any) => p.payload.data.seats.find((s: Row) => s.id === REP)

beforeEach(() => {
  state.clients = []; state.leads = []; state.programmes = []; state.replies = []
  state.meetings = []; state.campaigns = []; state.icps = []; state.sent = []
  state.companies = []; state.requests = []; state.plays = []
  writes.length = 0
})

/** The retired credit model, mid-flight: a pending request sitting on a seat. */
function pendingRequest(seat = REP, id = 'cr-1') {
  state.requests.push({
    id, company_id: CO, rep_client_id: seat, amount: 5000,
    reason: 'Running low', status: 'pending', created_at: '2026-02-01',
  })
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① PROGRAMME-MODEL SEAT, NO ACTIVE PROGRAMME, LARGE HISTORY
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① a programme seat between programmes, carrying a full historical book', () => {
  beforeEach(() => { company('programme', 'programme'); repHistory() })

  it('the fixture is not vacuous — the history really is in the tables', () => {
    expect(state.leads).toHaveLength(3)
    expect(state.replies).toHaveLength(1)
    expect(state.meetings).toHaveLength(1)
    expect(state.sent).toHaveLength(1)
  })

  it('🛑 NO RETIRED ECONOMICS — suppressed as ABSENT, never as zero', async () => {
    const p = await overview()
    const seat = repSeat(p)
    expect(seat.economics_visible).toBe(false)
    expect(seat.credit_budget).toBeNull()
    expect(seat.credits_used).toBeNull()
    expect(seat.credit_balance).toBeNull()
    expect(p.payload.data.totals.economics_visible).toBe(false)
    expect(p.payload.data.totals.company_pool).toBeNull()
    expect(p.payload.data.totals.allocated).toBeNull()
    expect(p.payload.data.totals.used).toBeNull()
  })

  it('🛑 LEADS 0 · REPLY % 0 · BOOKED 0 · CONTACTED 0', async () => {
    const seat = repSeat(await overview())
    expect(seat.leads).toBe(0)
    expect(seat.reply_pct).toBe(0)
    expect(seat.booked).toBe(0)
    expect(seat.contacted).toBe(0)
    expect(seat.replies).toBe(0)
  })

  it('🛑 AND THE COMPANY TOTALS INHERIT NOTHING EITHER', async () => {
    const t = (await overview()).payload.data.totals
    expect(t.total_leads).toBe(0)
    expect(t.total_booked).toBe(0)
    expect(t.total_contacted).toBe(0)
  })

  it('🛑 WINNING PLAYS CARRIES NO INHERITED PERFORMANCE CLAIM', async () => {
    state.plays.push({ id: 'p1', company_id: CO, name: 'Fintech opener', note: 'x', reply_rate: 14.5, pushed_to_all: true, created_at: '2026-02-01' })
    const out = (await plays()).payload.data
    expect(out).toHaveLength(1)
    expect(out[0].name, 'the play itself is kept — only the claim goes').toBe('Fintech opener')
    expect(out[0].reply_rate).toBeNull()
  })

  it('🛑 HISTORY IS PRESERVED — nothing deleted, nothing backfilled', () => {
    expect(state.leads.every(l => l.programme_id === null)).toBe(true)
    expect(state.meetings).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② A PROOF SEAT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② a calibration seat inherits no outreach', () => {
  it('🛑 proof cards may exist and the Command Centre still shows no outreach activity', async () => {
    company('programme', 'programme'); repHistory()
    state.leads.push({ id: 'p1', client_id: REP, programme_id: null, proof_pass: 1, crm_existing: false, revealed_at: null, delivered_at: 'd', surfaced_for_approval_at: 's', status: 'scored' })
    state.clients.find(c => c.id === REP)!.proof_passes_done = 1
    const seat = repSeat(await overview())
    expect(seat.leads).toBe(0)
    expect(seat.contacted).toBe(0)
    expect(seat.booked).toBe(0)
    expect(seat.reply_pct).toBe(0)
    expect(seat.economics_visible).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ ACTIVE P_NEW + THE SAME HISTORY — BOTH HALVES ASSERTED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ only the current programme contributes', () => {
  beforeEach(() => { company('programme', 'programme'); repHistory(); repProgramme() })

  it('🛑 LEADS COUNTS THE PROGRAMME ONLY — 2, not 5. An empty board would be a FAILURE here', async () => {
    const seat = repSeat(await overview())
    expect(seat.leads).toBe(2)
  })

  it('🛑 CONTACTED AND REPLIES COME FROM THE PROGRAMME CAMPAIGN AND ITS LEADS', async () => {
    const seat = repSeat(await overview())
    expect(seat.contacted, 'the retired campaign send is excluded').toBe(1)
    expect(seat.replies, 'the historical reply is excluded').toBe(1)
    expect(seat.reply_pct).toBe(100)
  })

  it('🛑 BOOKED IS THE PROGRAMME MEETING, from public.meetings', async () => {
    const seat = repSeat(await overview())
    expect(seat.booked).toBe(1)
  })

  it('🛑 A SUPERSEDED OR EXCLUDED MEETING IS STILL NEVER COUNTED — no duplicate regression', async () => {
    state.meetings.push({ id: 'm-moved-old', client_id: REP, lead_id: `n1-${REP}`, programme_id: P_NEW, state: 'BOOKED', scheduled_at: '2026-09-08', excluded_reason: null, superseded_by: 'm-moved-new', rescheduled_from: null })
    state.meetings.push({ id: 'm-moved-new', client_id: REP, lead_id: `n1-${REP}`, programme_id: P_NEW, state: 'BOOKED', scheduled_at: '2026-09-12', excluded_reason: null, superseded_by: null, rescheduled_from: 'm-moved-old' })
    state.meetings.push({ id: 'm-dupe', client_id: REP, lead_id: `n1-${REP}`, programme_id: P_NEW, state: 'BOOKED', scheduled_at: '2026-09-11', excluded_reason: 'duplicate', superseded_by: null, rescheduled_from: null })
    const seat = repSeat(await overview())
    // m-new + m-moved-new. The superseded original and the duplicate are both excluded.
    expect(seat.booked).toBe(2)
  })

  it('🛑 ECONOMICS STAY SUPPRESSED — an active programme does not restore a credit pool', async () => {
    const p = await overview()
    expect(repSeat(p).economics_visible).toBe(false)
    expect(p.payload.data.totals.company_pool).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ LEGACY / UNCLASSIFIED — PROGRAMME COMPANIES NOW (R137)
//
// ⛓️ INVERTED 23 Sep (R137). WAS: `④ LEGACY / COMPAT_LEGACY — UNCHANGED` /
// `describe('④ the retired book keeps its economics and its numbers')`, asserting credits
// visible, the 5,000 pool shown and the historical book counted. Founder, verbatim: *"the 299/4 is retired/ this must go. everything must be updated to new programme pricing model."*
// A NULL or stored-'legacy' company is a programme company now, so it reads exactly as ① does.
// ⚠️ NOTHING IS DELETED — the credit columns and the historical rows are untouched.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ a formerly legacy / unclassified company reads as a programme company (R137)', () => {
  for (const model of [null, 'legacy'] as const) {
    it(`🛑 commercial_model ${String(model)} → no retired economics and no historical book as current work`, async () => {
      // ⛓️ WAS: `…→ credits visible and history counted, exactly as before`.
      company(model, model); repHistory()
      expect(state.leads, 'the history exists — this fixture is not vacuous').toHaveLength(3)
      const p = await overview()
      const seat = repSeat(p)
      expect(seat.economics_visible).toBe(false)
      expect(seat.credit_budget, 'absent, never zero').toBeNull()
      expect(seat.credits_used).toBeNull()
      expect(p.payload.data.totals.economics_visible).toBe(false)
      expect(p.payload.data.totals.company_pool).toBeNull()
      expect(p.payload.data.totals.economics_hidden_reason).toBe('programme')
      expect(seat.leads).toBe(0)
      expect(seat.replies).toBe(0)
      expect(seat.contacted).toBe(0)
      expect(seat.booked).toBe(0)
    })
  }

  it('🛑 a formerly legacy company carries no inherited Winning Plays reply claim', async () => {
    // ⛓️ WAS: `'a legacy company keeps its Winning Plays reply badge'` (14.5).
    company('legacy', 'legacy')
    state.plays.push({ id: 'p1', company_id: CO, name: 'Fintech opener', reply_rate: 14.5, pushed_to_all: true, created_at: '2026-02-01' })
    const out = (await plays()).payload.data
    expect(out[0].name, 'the play itself is kept — only the claim goes').toBe('Fintech opener')
    expect(out[0].reply_rate).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ UNREADABLE — FAIL CLOSED, NEVER TO LEGACY (R96)
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ an unreadable seat asserts nothing', () => {
  beforeEach(() => {
    // The rep row exists but carries NO `commercial_model` field — a missing field is not a
    // NULL, so the resolver answers unreadable while the full history sits in the tables.
    company(undefined, 'programme'); repHistory()
  })

  it('🛑 NO RETIRED ECONOMICS — an unreadable seat must not fall through to legacy', async () => {
    const p = await overview()
    expect(repSeat(p).economics_visible).toBe(false)
    expect(repSeat(p).credit_budget).toBeNull()
    expect(p.payload.data.totals.company_pool).toBeNull()
  })

  it('🛑 NO HISTORICAL CURRENT-WORK METRICS EITHER', async () => {
    const seat = repSeat(await overview())
    expect(seat.leads).toBe(0)
    expect(seat.contacted).toBe(0)
    expect(seat.booked).toBe(0)
    expect(seat.replies).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ TENANCY
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑥ no cross-tenant bleed', () => {
  it("🛑 ANOTHER COMPANY'S SEAT AND ITS ACTIVITY NEVER REACH THIS ROSTER", async () => {
    company('programme', 'programme'); repHistory(); repProgramme()
    state.companies.push({ id: 'co-2', name: 'Other', credit_pool: 999, seat_cap: 25 })
    state.clients.push({ id: 'seat-other', user_id: 'u-other', company_id: 'co-2', seat_role: 'rep', commercial_model: 'legacy', company_name: 'Other Rep', seat_budget: 10, credit_balance: 10, seat_active: true, seat_accepted_at: 'a', proof_passes_done: 0 })
    repHistory('seat-other')
    const p = await overview()
    expect(p.payload.data.seats.map((s: Row) => s.id).sort()).toEqual([OWNER, REP].sort())
    expect(p.payload.data.totals.total_leads, "only this company's current work").toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑨ THE PANEL ONE CLICK BENEATH THE ROSTER
//
// 🛑 A BOUNDED ROW THAT OPENS ONTO AN UNBOUNDED PANEL IS WORSE THAN NEITHER. The roster row
// and this drill-down are two views of ONE seat: when only the row is bounded they contradict
// each other on one screen, and the panel wins, because the panel is the one with the names
// and the dates in it. That is the Replies lesson (R95) reproduced one click deeper.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑨ the seat drill-down agrees with the row above it', () => {
  it('🛑 PROGRAMME SEAT, NO PROGRAMME — the row reads zero and the panel is empty to match', async () => {
    company('programme', 'programme'); repHistory()
    const seat = repSeat(await overview())
    const d = await detail()
    expect(seat.contacted).toBe(0)
    expect(d.status, 'a resolved scope is not an error').toBe(200)
    expect(d.payload.data.campaigns, 'the retired campaign is not current work').toHaveLength(0)
    expect(d.payload.data.activity, 'no retired sends, replies or meetings').toHaveLength(0)
  })

  it('🛑 AND THE RETIRED CAMPAIGN COUNTERS GO WITH IT — 900 sent never reaches the panel', async () => {
    company('programme', 'programme'); repHistory()
    const body = JSON.stringify((await detail()).payload)
    expect(state.campaigns[0].emails_sent, 'the fixture really does carry the counter').toBe(900)
    expect(body).not.toContain('900')
    expect(body).not.toContain('Retired Q1 blast')
  })

  it('🛑 PROOF SEAT — calibration has no campaigns and no activity', async () => {
    company('programme', 'programme'); repHistory()
    state.leads.push({ id: 'p1', client_id: REP, programme_id: null, proof_pass: 1, crm_existing: false, delivered_at: 'd', surfaced_for_approval_at: 's', status: 'scored' })
    state.clients.find(c => c.id === REP)!.proof_passes_done = 1
    const d = await detail()
    expect(d.payload.data.campaigns).toHaveLength(0)
    expect(d.payload.data.activity).toHaveLength(0)
  })

  it('🛑 ACTIVE P_NEW — the panel shows the programme campaign and NOT the retired one', async () => {
    company('programme', 'programme'); repHistory(); repProgramme()
    const d = await detail()
    const camps = d.payload.data.campaigns as Row[]
    // BOTH HALVES (R92): the current campaign IS present, the retired one is NOT.
    expect(camps).toHaveLength(1)
    expect(camps[0].name).toBe('Programme launch')
    expect(camps[0].emails_sent).toBe(1)
  })

  it('🛑 ACTIVITY IS THE PROGRAMME’S — the retired send, reply and meeting are all absent', async () => {
    company('programme', 'programme'); repHistory(); repProgramme()
    const acts = (await detail()).payload.data.activity as Array<Record<string, string>>
    const titles = acts.map(a => a.title).join(' | ')
    expect(titles).toContain('Programme Prospect')
    expect(titles, 'the retired reply must not appear').not.toContain('Retired Prospect')
    expect(titles, 'the retired send must not appear').not.toContain('Retired Lead')
    expect(acts.filter(a => a.type === 'sent'), 'one programme send, not the retired one').toHaveLength(1)
    expect(acts.filter(a => a.type === 'reply')).toHaveLength(1)
  })

  it('🛑 THE ROW AND THE PANEL CANNOT DISAGREE — booked matches, from public.meetings', async () => {
    company('programme', 'programme'); repHistory(); repProgramme()
    const seat = repSeat(await overview())
    const acts = (await detail()).payload.data.activity as Array<Record<string, string>>
    const meetings = acts.filter(a => a.type === 'meeting')
    expect(seat.booked).toBe(1)
    expect(meetings, 'the panel lists exactly what the tile counts').toHaveLength(1)
    expect(meetings[0].title).toContain('Current Lead 1')
  })

  it('🛑 NO DUPLICATE OR RESCHEDULE REGRESSION IN THE PANEL EITHER', async () => {
    company('programme', 'programme'); repHistory(); repProgramme()
    state.meetings.push({ id: 'm-moved-old', client_id: REP, lead_id: `n1-${REP}`, programme_id: P_NEW, state: 'BOOKED', scheduled_at: '2026-09-08', excluded_reason: null, superseded_by: 'm-moved-new', rescheduled_from: null })
    state.meetings.push({ id: 'm-moved-new', client_id: REP, lead_id: `n1-${REP}`, programme_id: P_NEW, state: 'BOOKED', scheduled_at: '2026-09-12', excluded_reason: null, superseded_by: null, rescheduled_from: 'm-moved-old' })
    state.meetings.push({ id: 'm-dupe', client_id: REP, lead_id: `n1-${REP}`, programme_id: P_NEW, state: 'BOOKED', scheduled_at: '2026-09-11', excluded_reason: 'duplicate', superseded_by: null, rescheduled_from: null })
    const seat = repSeat(await overview())
    const acts = (await detail()).payload.data.activity as Array<Record<string, string>>
    const meetings = acts.filter(a => a.type === 'meeting')
    expect(seat.booked).toBe(2)
    expect(meetings, 'the superseded original and the duplicate are excluded from BOTH').toHaveLength(2)
    expect(meetings.map(m => m.subtitle)).toContain('Moved to a new time')
  })

  it('🛑 THE MEETING LINE NO LONGER COMES FROM A REPLY TIMESTAMP', async () => {
    // The retired reply carries `meeting_booked_at`. Under the old code that alone minted a
    // "Meeting booked with …" line — with no notion of a duplicate, a spam booking or a
    // reschedule, and with no programme boundary at all.
    company('programme', 'programme'); repHistory()
    expect(state.replies[0].meeting_booked_at).toBe('2026-02-03')
    const acts = (await detail()).payload.data.activity as Array<Record<string, string>>
    expect(acts.filter(a => a.type === 'meeting')).toHaveLength(0)
  })

  it('🛑 UNREADABLE REFUSES — 503, never [] dressed as "no campaigns yet" (R96)', async () => {
    company(undefined, 'programme'); repHistory()
    const d = await detail()
    expect(d.status).toBe(503)
    expect(d.payload.success).toBe(false)
    expect(JSON.stringify(d.payload), 'no historical fallback rides along').not.toContain('Retired Q1 blast')
  })

  it('🛑 A FORMERLY LEGACY SEAT READS LIKE ANY PROGRAMME SEAT — the retired book is not current (R137)', async () => {
    // ⛓️ INVERTED 23 Sep (R137). WAS: `'🛑 LEGACY IS UNCHANGED — the whole book still opens,
    // exactly as today'`, asserting the retired campaign, its 900 sends and the historical
    // meeting all showed. Founder: *"the 299/4 is retired/ this must go. everything must be updated to new programme pricing model."*
    company('legacy', 'legacy'); repHistory()
    const d = await detail()
    expect(d.status, 'a resolved scope is not an error').toBe(200)
    expect(d.payload.data.campaigns, 'the retired campaign is not current work').toHaveLength(0)
    expect(d.payload.data.activity, 'no retired sends, replies or meetings').toHaveLength(0)
    expect(JSON.stringify(d.payload)).not.toContain('Retired Q1 blast')
  })

  it('🛑 TENANCY — another company’s seat cannot be drilled into', async () => {
    company('legacy', 'legacy'); repHistory()
    state.companies.push({ id: 'co-2', name: 'Other', credit_pool: 999, seat_cap: 25 })
    state.clients.push({ id: 'seat-other', user_id: 'u-other', company_id: 'co-2', seat_role: 'rep', commercial_model: 'legacy', company_name: 'Other Rep', seat_budget: 10, credit_balance: 10, seat_active: true, seat_accepted_at: 'a' })
    repHistory('seat-other')
    const d = await detail('seat-other')
    expect(d.status).toBe(404)
  })

  it('🛑 HISTORY IS STILL STORED — the panel stopped showing it, nothing deleted it', async () => {
    company('programme', 'programme'); repHistory(); repProgramme()
    await detail()
    expect(state.campaigns).toHaveLength(2)
    expect(state.sent).toHaveLength(2)
    expect(state.replies).toHaveLength(2)
    expect(state.meetings).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑩ A COMPANY WITH ONE LEGACY SEAT AND ONE PROGRAMME SEAT
//
// 🛑 THERE IS NO TRUTHFUL SHARED POOL HERE. "Company budget pool" is presented as funding
// every seat; half these seats are on a model that has no pool at all. So the company level
// FAILS CLOSED rather than inventing a shared arrangement — and the page must not then tell a
// mixed company "your programme is billed as one price in two halves", which is a claim about
// a model only some of its seats are on.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑩ a mixed-model company makes no shared-credit claim', () => {
  const REP2 = 'seat-rep-2'
  beforeEach(() => {
    company('legacy', 'legacy')          // REP is the LEGACY seat
    repHistory()
    state.clients.push({                  // REP2 is the PROGRAMME seat
      id: REP2, user_id: 'u-rep2', company_id: CO, seat_role: 'rep', commercial_model: 'programme',
      company_name: 'Rep Two', seat_budget: 700, credit_balance: 100, seat_active: true,
      seat_accepted_at: 'a', proof_passes_done: 0, wallet_balance_usd: 0,
    })
    repHistory(REP2)
  })
  const seatOf = (p: any, id: string) => p.payload.data.seats.find((s: Row) => s.id === id)

  it('🛑 THE COMPANY POOL IS HIDDEN — one programme seat retires the shared claim', async () => {
    const t = (await overview()).payload.data.totals
    expect(t.economics_visible).toBe(false)
    expect(t.company_pool).toBeNull()
    expect(t.allocated).toBeNull()
    expect(t.used).toBeNull()
  })

  it('🛑 AND IT SAYS WHICH ABSENCE THIS IS — there is no "mixed" company any more (R137)', async () => {
    // ⛓️ 23 Sep (R137). WAS: `'…so the page cannot claim one model for both'`, expecting
    // `'mixed'`. The stored-'legacy' seat is a programme seat now, so the company is uniformly
    // programme and says so.
    const t = (await overview()).payload.data.totals
    expect(t.economics_hidden_reason).toBe('programme')
  })

  it('🛑 THE PROGRAMME SEAT CARRIES NO CREDIT FIGURES — never a 0, never an inherited 700', async () => {
    const s2 = seatOf(await overview(), REP2)
    expect(s2.economics_visible).toBe(false)
    expect(s2.credit_budget).toBeNull()
    expect(s2.credits_used).toBeNull()
    expect(s2.credit_balance).toBeNull()
  })

  it('🛑 THE FORMERLY LEGACY SEAT CARRIES NO CREDIT FIGURES EITHER — and nothing is destroyed (R137)', async () => {
    // ⛓️ INVERTED 23 Sep (R137). WAS: `'🛑 THE LEGACY SEAT KEEPS ITS OWN VALUES ON THE WIRE —
    // nothing is destroyed'` (500 / 300 visible). The values stay in the ROW; they are no
    // longer presented, because nothing on the programme spends them.
    const s1 = seatOf(await overview(), REP)
    expect(s1.economics_visible).toBe(false)
    expect(s1.credit_budget).toBeNull()
    expect(s1.credits_used).toBeNull()
    expect(state.clients.find(c => c.id === REP)!.seat_budget, 'the stored value is untouched').toBe(500)
  })

  it('🛑 ACTIVITY STAYS PER SEAT — and neither seat has current work without a programme (R137)', async () => {
    // ⛓️ INVERTED 23 Sep (R137). WAS: `'…the legacy book counts, the programme seat counts
    // nothing'` (REP 3, total 3). The retired book is history for both seats now.
    const p = await overview()
    expect(seatOf(p, REP).leads, 'the formerly legacy seat has no current work').toBe(0)
    expect(seatOf(p, REP2).leads, 'the programme seat has no current work').toBe(0)
    expect(p.payload.data.totals.total_leads, 'the roll-up is the sum of the truths').toBe(0)
  })

  it('🛑 A UNIFORMLY PROGRAMME COMPANY IS A DIFFERENT ABSENCE, and says so', async () => {
    // ⚠️ THE OWNER IS FLIPPED TOO, and that is the correction rather than an accommodation:
    // this fixture's owner is `legacy`, so flipping only the reps leaves a genuinely MIXED
    // company. It read 'programme' before only because the owner seat was invisible to the
    // decision — the runtime defect block ⑫ exists for.
    state.clients.find(c => c.id === REP)!.commercial_model = 'programme'
    state.clients.find(c => c.id === OWNER)!.commercial_model = 'programme'
    const t = (await overview()).payload.data.totals
    expect(t.economics_visible).toBe(false)
    expect(t.economics_hidden_reason).toBe('programme')
  })

  it('🛑 AN ALL-LEGACY COMPANY IS A PROGRAMME COMPANY NOW — the pool is hidden, and says why (R137)', async () => {
    // ⛓️ INVERTED 23 Sep (R137). WAS: `'🛑 AN ALL-LEGACY COMPANY IS UNCHANGED — the pool and
    // the reason both stay'` (visible, reason null, pool 5000).
    state.clients.find(c => c.id === REP2)!.commercial_model = 'legacy'
    const t = (await overview()).payload.data.totals
    expect(t.economics_visible).toBe(false)
    expect(t.economics_hidden_reason).toBe('programme')
    expect(t.company_pool).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑪ THE RETIRED CREDIT MODEL IS A SET OF VERBS, NOT ONLY A SET OF NUMBERS
//
// 🛑 A SUPPRESSED FIGURE BESIDE A LIVE BUTTON IS NOT A SUPPRESSION. The earlier passes hid
// "Credits left" and left every credit ACTION reachable: a rep could POST a credit request, an
// owner could approve one (which MOVES credits), allocate from the pool, set a seat budget, or
// top the pool up — and the "Add a rep" form carried a `Budget … cr` input defaulting to 5,000
// with no guard at all, so every invite a programme company sent allocated a retired budget.
//
// A button is a stronger claim than a number: a number says a thing exists, a button promises
// the software will do it.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑪ a programme company has no credit verbs, not just no credit figures', () => {
  const REQ = 'cr-1'

  describe('A · programme seat, no programme, carrying a historical request', () => {
    beforeEach(() => { company('programme', 'programme'); repHistory(); pendingRequest() })

    it('the fixture is not vacuous — the request really is pending in the table', () => {
      expect(state.requests).toHaveLength(1)
      expect(state.requests[0].status).toBe('pending')
    })

    it('🛑 NO COUNT AND NO LIST — the historical request is not current state', async () => {
      const p = await overview()
      expect(p.payload.data.totals.pending_requests).toBe(0)
      expect(p.payload.data.pending_requests).toEqual([])
    })

    it('🛑 NO REQUEST-CREDITS ACTION', async () => {
      const r = await callPost('/credit-requests', { amount: 100 })
      expect(r.status).toBe(403)
      expect(writes.filter(w => w.table === 'seat_credit_requests'), 'refused AND wrote nothing').toHaveLength(0)
    })

    it('🛑 NO APPROVE / DENY ACTION — and no credits move', async () => {
      for (const decision of ['approved', 'denied'] as const) {
        const r = await callPost('/credit-requests/:id/decide', { decision }, { id: REQ })
        expect(r.status).toBe(403)
      }
      expect(writes, 'nothing was written by either refusal').toHaveLength(0)
      expect(state.requests[0].status, 'the historical row is untouched').toBe('pending')
    })

    it('🛑 NO ALLOCATION, NO SEAT BUDGET, NO POOL TOP-UP', async () => {
      expect((await callPost('/seats/:id/allocate', { amount: 100 }, { id: REP })).status).toBe(403)
      expect((await callPatch('/seats/:id', { seat_budget: 900 }, { id: REP })).status).toBe(403)
      expect((await callPost('/pool/topup', { amount: 100 })).status).toBe(403)
      expect(writes).toHaveLength(0)
    })

    it('🛑 AN INVITE CANNOT CARRY A RETIRED BUDGET — the 5,000 default is refused', async () => {
      const r = await callPost('/seats', { email: 'new@rep.com', budget: 5000 })
      expect(r.status).toBe(403)
      expect(writes, 'no seat created, no credits moved').toHaveLength(0)
    })

    it('the seat’s OTHER settings are still editable — the gate is the budget, not the seat', async () => {
      const r = await callPatch('/seats/:id', { autonomy: 'copilot' }, { id: REP })
      expect(r.status).toBe(200)
    })
  })

  describe('B · an active programme does not restore the credit model', () => {
    it('🛑 STILL SUPPRESSED, STILL REFUSED', async () => {
      company('programme', 'programme'); repHistory(); repProgramme(); pendingRequest()
      const p = await overview()
      expect(p.payload.data.totals.pending_requests).toBe(0)
      expect(p.payload.data.pending_requests).toEqual([])
      expect((await callPost('/credit-requests/:id/decide', { decision: 'approved' }, { id: REQ })).status).toBe(403)
    })
  })

  // ⛓️ INVERTED 23 Sep (R137). WAS: `describe('C · legacy is unchanged, end to end')`, asserting
  // a legacy company still saw its pending request, a rep could still ask, the owner could still
  // approve (credits moved), and allocate / seat budget / pool top-up / invite-with-budget all
  // returned 200. Founder, verbatim: *"the 299/4 is retired/ this must go. everything must be updated to new programme pricing model."*
  // A formerly legacy company now gets exactly what ⑪A gets.
  describe('C · a formerly legacy company has no credit verbs either (R137)', () => {
    beforeEach(() => { company('legacy', 'legacy'); repHistory(); pendingRequest() })

    it('🛑 NO COUNT AND NO LIST — the historical request is not current state', async () => {
      // ⛓️ WAS: `'🛑 THE COUNT AND THE LIST ARE STILL THERE'` (1 pending, amount 5000).
      const p = await overview()
      expect(state.requests, 'the request is still in the table — not vacuous').toHaveLength(1)
      expect(p.payload.data.totals.pending_requests).toBe(0)
      expect(p.payload.data.pending_requests).toEqual([])
    })

    it('🛑 A FORMERLY LEGACY REP CANNOT ASK', async () => {
      // ⛓️ WAS: `'🛑 A LEGACY REP CAN STILL ASK'` (200 + an insert).
      const r = await callPost('/credit-requests', { amount: 100 }, {}, 'u-owner')
      expect(r.status).toBe(403)
      expect(writes.some(w => w.table === 'seat_credit_requests' && w.op === 'insert')).toBe(false)
    })

    it('🛑 AND THE OWNER CANNOT APPROVE — no credits move', async () => {
      // ⛓️ WAS: `'🛑 AND THE OWNER CAN STILL APPROVE — credits still move'` (200 + an update).
      const r = await callPost('/credit-requests/:id/decide', { decision: 'approved' }, { id: REQ })
      expect(r.status).toBe(403)
      expect(writes).toHaveLength(0)
    })

    it('🛑 ALLOCATE · SEAT BUDGET · TOP-UP · INVITE-WITH-BUDGET are all refused', async () => {
      // ⛓️ WAS: `'🛑 ALLOCATE · SEAT BUDGET · TOP-UP · INVITE-WITH-BUDGET all still work'`.
      expect((await callPost('/seats/:id/allocate', { amount: 100 }, { id: REP })).status).toBe(403)
      expect((await callPatch('/seats/:id', { seat_budget: 900 }, { id: REP })).status).toBe(403)
      process.env.IS_STAGING = 'true'
      expect((await callPost('/pool/topup', { amount: 100 })).status).toBe(403)
      delete process.env.IS_STAGING
      expect((await callPost('/seats', { email: 'new@rep.com', budget: 5000 })).status).toBe(403)
      expect(writes).toHaveLength(0)
    })
  })

  describe('D · unreadable fails closed', () => {
    beforeEach(() => { company(undefined, 'programme'); repHistory(); pendingRequest() })

    it('🛑 NO CREDIT-REQUEST SURFACE AND NO CREDIT VERBS — never a fall-through to legacy', async () => {
      const p = await overview()
      expect(p.payload.data.totals.pending_requests).toBe(0)
      expect(p.payload.data.pending_requests).toEqual([])
      expect((await callPost('/credit-requests/:id/decide', { decision: 'approved' }, { id: REQ })).status).toBe(403)
      expect((await callPost('/seats/:id/allocate', { amount: 1 }, { id: REP })).status).toBe(403)
      expect(writes).toHaveLength(0)
    })
  })

  describe('E · a mixed company suppresses the shared surface rather than inventing attribution', () => {
    const REP2 = 'seat-rep-2'
    beforeEach(() => {
      company('legacy', 'legacy'); repHistory()          // REP is legacy
      state.clients.push({                                // REP2 is programme
        id: REP2, user_id: 'u-rep2', company_id: CO, seat_role: 'rep', commercial_model: 'programme',
        company_name: 'Rep Two', seat_budget: 700, credit_balance: 100, seat_active: true,
        seat_accepted_at: 'a', proof_passes_done: 0,
      })
      repHistory(REP2)
      pendingRequest(REP, 'cr-legacy')
      pendingRequest(REP2, 'cr-programme')
    })

    it('🛑 NO SHARED COMPANY CREDIT CLAIM — the count and the list are suppressed for BOTH', async () => {
      const p = await overview()
      expect(p.payload.data.totals.pending_requests).toBe(0)
      expect(p.payload.data.pending_requests).toEqual([])
    })

    it('🛑 THE PROGRAMME SEAT NEVER APPEARS TO USE CREDITS', async () => {
      expect((await callPost('/seats/:id/allocate', { amount: 1 }, { id: REP2 })).status).toBe(403)
      expect((await callPatch('/seats/:id', { seat_budget: 1 }, { id: REP2 })).status).toBe(403)
      expect((await callPost('/credit-requests/:id/decide', { decision: 'approved' }, { id: 'cr-programme' })).status).toBe(403)
    })

    it('🛑 THE FORMERLY LEGACY SEAT’S REQUEST IS NOT DECIDABLE EITHER — its seat is programme now (R137)', async () => {
      // ⛓️ INVERTED 23 Sep (R137). WAS: `'🛑 THE LEGACY SEAT’S OWN REQUEST STAYS DECIDABLE —
      // positive attribution, not invention'` (200). The gate is still the SEAT the request
      // belongs to — and that seat no longer carries the retired model.
      const r = await callPost('/credit-requests/:id/decide', { decision: 'approved' }, { id: 'cr-legacy' })
      expect(r.status, 'the gate is the SEAT the request belongs to').toBe(403)
    })

    it('🛑 AND A COMPANY-WIDE ACTION IS REFUSED — one programme seat retires the pool', async () => {
      process.env.IS_STAGING = 'true'
      expect((await callPost('/pool/topup', { amount: 100 })).status).toBe(403)
      expect((await callPost('/seats', { email: 'x@y.com', budget: 5000 })).status).toBe(403)
      delete process.env.IS_STAGING
    })
  })

  describe('F · nothing is deleted and nothing is backfilled', () => {
    it('🛑 THE HISTORICAL REQUESTS ARE STILL EXACTLY WHERE THEY WERE', async () => {
      company('programme', 'programme'); repHistory(); pendingRequest()
      await overview()
      await callPost('/credit-requests/:id/decide', { decision: 'denied' }, { id: REQ })
      expect(state.requests).toHaveLength(1)
      expect(state.requests[0]).toMatchObject({ id: REQ, status: 'pending', amount: 5000, rep_client_id: REP })
      expect(writes).toHaveLength(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑫ THE OWNER IS A SEAT — AND A COMPANY OF ONE IS THE COMMONEST COMPANY THERE IS
//
// 🛑 THIS IS THE ONE THE FOUNDER FOUND ON THE LIVE SITE, AND EVERY TEST ABOVE MISSED IT.
// `repStats` is handed ONLY the rep seats, so the OWNER's commercial model was never resolved
// at all — and the company-wide decision was `repOut.length === 0 || repOut.every(…)`, whose
// first clause reads "a company with no reps yet has nothing to contradict it."
//
// For House — an explicit programme client whose company has an owner seat and NO reps — that
// clause is the whole bug: zero reps ⇒ `companyEconomics = true` ⇒ **Pool credits, the Requests
// tile, the Credits left column and the Pending credit requests card all render**, exactly the
// four things he saw. The suppression was never wrong; it was never asked.
//
// ⚠️ AND IT CUT THE OTHER WAY TOO. Because the owner was absent from `stats`, it fell to the
// `?? { mode: 'unreadable' }` default — so a LEGACY owner's own "Credits left" cell went blank
// while every rep's stayed. One omission, a false claim for one model and a lost figure for
// the other.
//
// ⚠️ THE LESSON, WHICH IS THE REUSABLE PART: I proved the boundary on the seats I remembered to
// enumerate. A fixture that always had a rep could never fail this way — and the commonest
// company on the platform is one person.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑫ a programme company with no rep seats', () => {
  /** House: one programme-model owner seat, a company row, a full historical book. No reps. */
  function soloCompany(model: string | null = 'programme') {
    state.companies.push({ id: CO, name: 'House', credit_pool: 5000, seat_cap: 25 })
    const owner: Row = {
      id: OWNER, user_id: OWNER_USER, company_id: CO, seat_role: 'owner', company_name: 'House',
      seat_budget: 1000, credit_balance: 900, seat_active: true, seat_accepted_at: 'a',
      proof_passes_done: 0, wallet_balance_usd: 0,
    }
    if (model !== undefined) owner.commercial_model = model
    state.clients.push(owner)
    repHistory(OWNER)
  }
  const ownerSeat = (p: any) => p.payload.data.seats.find((s: Row) => s.id === OWNER)

  it('the fixture is the live shape — one owner seat, no reps, and a real history', () => {
    soloCompany()
    expect(state.clients.filter(c => c.seat_role === 'rep')).toHaveLength(0)
    expect(state.leads).toHaveLength(3)
  })

  it('🛑 NO POOL CREDITS — zero reps is not permission to show a retired pool', async () => {
    soloCompany()
    const t = (await overview()).payload.data.totals
    expect(t.economics_visible).toBe(false)
    expect(t.company_pool).toBeNull()
    expect(t.allocated).toBeNull()
    expect(t.used).toBeNull()
    expect(t.economics_hidden_reason).toBe('programme')
  })

  it('🛑 NO REQUESTS TILE AND NO PENDING CREDIT REQUESTS', async () => {
    soloCompany(); pendingRequest(OWNER, 'cr-owner')
    const p = await overview()
    expect(p.payload.data.totals.pending_requests).toBe(0)
    expect(p.payload.data.pending_requests).toEqual([])
  })

  it('🛑 NO CREDITS LEFT ON THE OWNER SEAT — suppressed as absent, never zeroed', async () => {
    soloCompany()
    const s = ownerSeat(await overview())
    expect(s.economics_visible).toBe(false)
    expect(s.credit_budget).toBeNull()
    expect(s.credits_used).toBeNull()
    expect(s.credit_balance).toBeNull()
  })

  it('🛑 AND NO CREDIT VERBS EITHER — the company-wide gates see the owner too', async () => {
    soloCompany(); pendingRequest(OWNER, 'cr-owner')
    process.env.IS_STAGING = 'true'
    expect((await callPost('/pool/topup', { amount: 100 })).status).toBe(403)
    delete process.env.IS_STAGING
    expect((await callPost('/seats', { email: 'x@y.com', budget: 5000 })).status).toBe(403)
    expect((await callPost('/credit-requests/:id/decide', { decision: 'approved' }, { id: 'cr-owner' })).status).toBe(403)
    expect(writes).toHaveLength(0)
  })

  it('🛑 A SOLO PROOF SEAT IS ALSO REFUSED — "none" is not legacy', async () => {
    soloCompany()
    state.leads.push({ id: 'pf1', client_id: OWNER, programme_id: null, proof_pass: 1, crm_existing: false, delivered_at: 'd', surfaced_for_approval_at: 's', status: 'scored' })
    const t = (await overview()).payload.data.totals
    expect(t.economics_visible).toBe(false)
    expect(t.company_pool).toBeNull()
  })

  it('🛑 A SOLO UNREADABLE SEAT FAILS CLOSED — never a fall-through to legacy (R96)', async () => {
    soloCompany(undefined)
    const t = (await overview()).payload.data.totals
    expect(t.economics_visible).toBe(false)
    expect(t.company_pool).toBeNull()
  })

  for (const model of [null, 'legacy'] as const) {
    it(`🛑 A SOLO ${String(model)} COMPANY IS A PROGRAMME COMPANY — nothing retired is shown (R137)`, async () => {
      // ⛓️ INVERTED 23 Sep (R137). WAS: `…COMPANY KEEPS EVERYTHING — the fix must not blank a
      // paying owner` (1000 / 100 / 900, pool 5000, 1 pending). There is no paying legacy owner
      // left to blank. Founder: *"the 299/4 is retired/ this must go. everything must be updated to new programme pricing model."*
      soloCompany(model); pendingRequest(OWNER, 'cr-owner')
      const p = await overview()
      const s = ownerSeat(p)
      expect(s.economics_visible).toBe(false)
      expect(s.credit_budget, 'absent, never zero').toBeNull()
      expect(s.credits_used).toBeNull()
      expect(s.credit_balance).toBeNull()
      expect(p.payload.data.totals.economics_visible).toBe(false)
      expect(p.payload.data.totals.company_pool).toBeNull()
      expect(p.payload.data.totals.pending_requests).toBe(0)
      expect(p.payload.data.pending_requests).toEqual([])
    })
  }

  it('🛑 AND AN OWNER IN A COMPANY THAT HAS REPS IS RESOLVED TOO', async () => {
    // The mirror of the bug: a LEGACY company whose owner seat is the one carrying the
    // retired book. Before the fix the owner was `unreadable` by accident and their own
    // Credits left cell rendered blank beside every rep's.
    // ⛓️ 23 Sep (R137) — WAS: economics visible, credit_budget 1000. The owner is still RESOLVED
    // (not unreadable, the bug this test guards) — it now resolves to programme, like the reps.
    company('legacy', 'legacy'); repHistory(); repHistory(OWNER)
    const p = await overview()
    const s = ownerSeat(p)
    expect(s.economics_visible).toBe(false)
    expect(s.credit_budget).toBeNull()
    expect(p.payload.data.totals.economics_hidden_reason, 'resolved, not unreadable').toBe('programme')
  })

  it('🛑 ONE PROGRAMME OWNER OVER LEGACY REPS STILL RETIRES THE SHARED POOL', async () => {
    company('legacy', 'programme')   // reps legacy, OWNER on the programme
    repHistory(); repHistory(OWNER)
    const t = (await overview()).payload.data.totals
    expect(t.economics_visible).toBe(false)
    // ⛓️ 23 Sep (R137) — WAS `'mixed'`. The stored-'legacy' reps are programme seats now.
    expect(t.economics_hidden_reason).toBe('programme')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑦ THE BOUNDARY IS THE SHARED ONE, AND NOTHING IS INVENTED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑦ one interpretation, no invented values', () => {
  const src = readFileSync(join(__dirname, '../routes/company.ts'), 'utf8')

  /**
   * The drill-down handler ALONE — bounded at the next route registration.
   * ⚠️ A slice that runs to end-of-file reads every later route's writes and proves nothing
   * about this one; that mistake is why guard ⑫ in `milla-programme.test.ts` was tightened.
   */
  const drillDownSource = () => {
    const start = src.indexOf("companyRouter.get('/seats/:id/detail'")
    expect(start, 'the drill-down route must exist').toBeGreaterThan(-1)
    const next = src.indexOf('companyRouter.', start + 20)
    expect(next, 'the slice must be bounded by the next route').toBeGreaterThan(start)
    return src.slice(start, next)
  }

  it('🛑 IT REUSES THE ESTABLISHED AUTHORITY — no sixth resolver', () => {
    expect(src).toContain("await import('../lib/current-outreach')")
    expect(src).toContain('currentOutreachLeads')
    expect(src).toContain('currentOutreachCampaigns')
  })

  it('🛑 SUPPRESSED ECONOMICS ARE NULL, NOT ZERO — absence, not a claim', () => {
    expect(src).toContain('credit_budget: money ? budget : null')
    expect(src).toContain('company_pool:     companyEconomics ? ((company as any)?.credit_pool ?? 0) : null')
  })

  it('🛑 public.meetings IS STILL THE SOURCE, with its exclusion rules intact', () => {
    expect(src).toContain('meetingCounts({ clientId: id, programmeId: programmeOf[id] })')
    const mt = readFileSync(join(__dirname, 'meeting-truth.ts'), 'utf8')
    expect(mt).toContain(".is('excluded_reason', null)")
    expect(mt).toContain(".is('superseded_by', null)")
  })

  it('🛑 NO REPLY RATE IS COMPUTED FOR WINNING PLAYS — the metric is not invented', () => {
    const gp = src.slice(src.indexOf("companyRouter.get('/winning-plays'"))
      .slice(0, src.indexOf("companyRouter.post('/winning-plays'") - src.indexOf("companyRouter.get('/winning-plays'"))
    expect(gp).toContain('reply_rate: claimAllowed ? p.reply_rate : null')
    expect(gp, 'no derivation of a reply rate appears here').not.toMatch(/figsy_sent_emails|\/ *sent|replies *\//)
  })

  it('🛑 THE ROUTE WRITES NOTHING ON THE READ PATH', () => {
    const ov = src.slice(src.indexOf("companyRouter.get('/overview'"), src.indexOf("companyRouter.get('/seats/:id/detail'"))
    for (const w of ['.update(', '.insert(', '.delete(', '.upsert(']) {
      expect(ov, `the overview read must not write: ${w}`).not.toContain(w)
    }
  })

  it('🛑 THE DRILL-DOWN USES THE SAME AUTHORITY AS THE ROW, and writes nothing either', () => {
    const dd = drillDownSource()
    expect(dd).toContain('currentOutreachLeads(repId)')
    expect(dd).toContain('currentOutreachCampaigns(repId, scope)')
    expect(dd, 'a list refuses on unreadable rather than returning []').toContain('res.status(503)')
    for (const w of ['.update(', '.insert(', '.delete(', '.upsert(']) {
      expect(dd, `the drill-down read must not write: ${w}`).not.toContain(w)
    }
  })

  it('🛑 THE DRILL-DOWN MEETING LINE COMES FROM public.meetings, NOT A REPLY TIMESTAMP', () => {
    const dd = drillDownSource()
    expect(dd).toContain('meetingsForClient({')
    // The retired shape, gone from the executable text (comments are stripped below).
    const code = dd.split('\n').filter(l => {
      const t = l.trim()
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
    }).join('\n')
    expect(code, 'no meeting event is minted from figsy_replies.meeting_booked_at')
      .not.toMatch(/meeting_booked_at.*type: 'meeting'/s)
    expect(code, 'the reply select no longer even asks for it').not.toContain("classification, meeting_booked_at")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑧ THE PAGE OBEYS THE SERVER, AND NOTHING IS REDESIGNED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑧ the Command Centre page hides rather than zeroes', () => {
  const raw = readFileSync(join(__dirname, '../../../portal/src/app/(dashboard)/dashboard/company/page.tsx'), 'utf8')
  const page = (() => {
    let inBlock = false
    return raw.split('\n').map(l => {
      const t = l.trim()
      if (inBlock) { if (t.endsWith('*/') || t.endsWith('*/}')) inBlock = false; return '' }
      if (t.startsWith('{/*')) { if (!t.endsWith('*/}')) inBlock = true; return '' }
      if (t.startsWith('/*')) { if (!t.endsWith('*/')) inBlock = true; return '' }
      if (t.startsWith('//') || t.startsWith('*')) return ''
      const i = l.search(/(?<!:)\/\//)
      return i >= 0 ? l.slice(0, i) : l
    }).join('\n')
  })()

  it('🛑 THE SERVER DECIDES — the page reads the flag rather than guessing the model', () => {
    expect(page).toContain('const econ = totals?.economics_visible !== false')
  })

  it('🛑 EVERY CREDIT SURFACE IS BEHIND IT', () => {
    for (const guarded of [
      '{econ && <div><p className="text-2xl font-bold">{(totals.company_pool ?? 0)',   // hero tile
      '{econ && <th className="text-right px-4 py-3">Credits left</th>}',              // table header
      "{tab === 'usage' && econ && (",                                                // usage tab
      '{econ && <>',                                                                  // seat card block
      '{econ && <div>',                                                               // budget editor
    ]) {
      expect(page, `an unguarded credit surface: ${guarded.slice(0, 40)}`).toContain(guarded)
    }
  })

  it('🛑 AND AN OLDER API IS TREATED AS VISIBLE — a deploy skew must not blank a paying company', () => {
    expect(page).toContain('economics_visible !== false')
  })

  it('the retired-economics tab states the truth rather than rendering a pool of zero', () => {
    expect(page).toContain("{tab === 'usage' && !econ && (")
    expect(raw).toContain('There is no credit pool or per-seat budget to manage.')
  })

  it('🛑 A MIXED COMPANY IS NOT TOLD IT IS ON A PROGRAMME', () => {
    expect(page).toContain("totals?.economics_hidden_reason === 'mixed'")
    expect(page).toContain('there is no single company credit pool to manage.')
  })

  it('🛑 NO CREDIT-REQUEST CARD, NO REQUESTS TILE, AND NO BUDGET FIELD ON THE INVITE FORM', () => {
    expect(page, 'the pending-requests card').toContain('{econ && <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">')
    expect(page, 'the hero Requests tile').toContain('{econ && <div><p className="text-2xl font-bold">{totals.pending_requests}')
    expect(page, 'the Add-a-rep budget input').toContain('{econ && (')
    expect(page, 'and no budget is posted when the field is hidden')
      .toContain("withBudget ? { email: inviteEmail, budget: inviteBudget } : { email: inviteEmail }")
  })

  it('🛑 THE DRILL-DOWN ERROR STATE IS THE ONE A 503 LANDS ON — no new UI, and no silent empty', () => {
    // `api.get` throws on a non-2xx, the catch nulls `drillDetail`, and the modal already has
    // an honest sentence with a retry. The refusal is rendered by UI that already existed.
    expect(page).toContain('catch { setDrillDetail(null) }')
    expect(raw).toContain("Couldn&apos;t load this rep&apos;s detail. Close and try again.")
  })
})
