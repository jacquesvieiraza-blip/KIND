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

function table(name: string) {
  const rows = (): Row[] =>
    name === 'leads' ? state.leads : name === 'programmes' ? state.programmes
    : name === 'figsy_replies' ? state.replies : name === 'meetings' ? state.meetings
    : name === 'figsy_campaigns' ? state.campaigns : name === 'icps' ? state.icps
    : name === 'figsy_sent_emails' ? state.sent : name === 'companies' ? state.companies
    : name === 'seat_credit_requests' ? state.requests : name === 'winning_plays' ? state.plays
    : state.clients
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _limit: 0,
    select() { return q },
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
    async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
    async single() { return { data: q._hit()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) {
      return Promise.resolve({ data: q._hit(), error: null, count: q._hit().length }).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async () => ({ data: null, error: null }),
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

async function callGet(path: string, userId = OWNER_USER) {
  const m = await import('../routes/company')
  const layer = (m.companyRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === path && l.route?.methods.get)
  if (!layer) throw new Error(`GET ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null; let status = 200
  const res: any = { json: (b: unknown) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ userId, query: {}, body: {}, params: {} }, res, () => {})
  return { payload, status }
}
const overview = () => callGet('/overview')
const plays    = () => callGet('/winning-plays')

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
    state.leads.push({ id: `h${n}-${seat}`, client_id: seat, programme_id: null, proof_pass: null, crm_existing: n === 1, revealed_at: 'r', delivered_at: 'd', surfaced_for_approval_at: 's', status: 'exported' })
  }
  state.replies.push({ id: `r-old-${seat}`, client_id: seat, lead_id: `h1-${seat}`, classification: 'hot', received_at: '2026-02-02', processed_at: '2026-02-02', meeting_booked_at: '2026-02-03' })
  state.icps.push({ id: `icp-old-${seat}`, client_id: seat, programme_id: null, created_at: '2026-01-01' })
  state.campaigns.push({ id: `camp-old-${seat}`, client_id: seat, icp_id: `icp-old-${seat}`, status: 'active', created_at: '2026-02-01' })
  state.sent.push({ id: `s-old-${seat}`, campaign_id: `camp-old-${seat}`, sent_at: '2026-02-01', opened_at: null })
  state.meetings.push({ id: `m-old-${seat}`, client_id: seat, lead_id: `h1-${seat}`, programme_id: null, state: 'HELD', scheduled_at: '2026-02-03', excluded_reason: null, superseded_by: null, rescheduled_from: null })
}
/** The rep's CURRENT programme work. */
function repProgramme(seat = REP) {
  state.programmes.push({ id: P_NEW, client_id: seat, status: 'LIVE', meeting_target: 10, first_paid_at: 'p1', second_paid_at: 'p2', approved_at: 'a', went_live_at: 'w', paused_at: null, review_required_at: null, review_resolved_at: null, price_total_cents: 100000, sourcing_ceiling: 100, sourced_used: 2 })
  state.icps.push({ id: `icp-new-${seat}`, client_id: seat, programme_id: P_NEW, created_at: '2026-09-01' })
  state.campaigns.push({ id: `camp-new-${seat}`, client_id: seat, icp_id: `icp-new-${seat}`, status: 'active', created_at: '2026-09-01' })
  for (const n of [1, 2]) {
    state.leads.push({ id: `n${n}-${seat}`, client_id: seat, programme_id: P_NEW, proof_pass: null, crm_existing: false, revealed_at: null, delivered_at: 'd', surfaced_for_approval_at: 's', status: 'scored' })
  }
  state.replies.push({ id: `r-new-${seat}`, client_id: seat, lead_id: `n2-${seat}`, classification: 'hot', received_at: '2026-09-03', processed_at: '2026-09-03', meeting_booked_at: null })
  state.sent.push({ id: `s-new-${seat}`, campaign_id: `camp-new-${seat}`, sent_at: '2026-09-02', opened_at: null })
  state.meetings.push({ id: `m-new-${seat}`, client_id: seat, lead_id: `n1-${seat}`, programme_id: P_NEW, state: 'BOOKED', scheduled_at: '2026-09-10', excluded_reason: null, superseded_by: null, rescheduled_from: null })
}
const repSeat = (p: any) => p.payload.data.seats.find((s: Row) => s.id === REP)

beforeEach(() => {
  state.clients = []; state.leads = []; state.programmes = []; state.replies = []
  state.meetings = []; state.campaigns = []; state.icps = []; state.sent = []
  state.companies = []; state.requests = []; state.plays = []
})

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
// ④ LEGACY / COMPAT_LEGACY — UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ the retired book keeps its economics and its numbers', () => {
  for (const model of [null, 'legacy'] as const) {
    it(`🛑 commercial_model ${String(model)} → credits visible and history counted, exactly as before`, async () => {
      company(model, model); repHistory()
      const p = await overview()
      const seat = repSeat(p)
      expect(seat.economics_visible).toBe(true)
      expect(seat.credit_budget).toBe(500)
      expect(seat.credits_used).toBe(300)
      expect(p.payload.data.totals.economics_visible).toBe(true)
      expect(p.payload.data.totals.company_pool).toBe(5000)
      expect(seat.leads).toBe(3)
      expect(seat.deduped).toBe(1)
      expect(seat.replies).toBe(1)
      expect(seat.contacted).toBe(1)
      expect(seat.booked).toBe(1)
    })
  }

  it('a legacy company keeps its Winning Plays reply badge', async () => {
    company('legacy', 'legacy')
    state.plays.push({ id: 'p1', company_id: CO, name: 'Fintech opener', reply_rate: 14.5, pushed_to_all: true, created_at: '2026-02-01' })
    expect((await plays()).payload.data[0].reply_rate).toBe(14.5)
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
// ⑦ THE BOUNDARY IS THE SHARED ONE, AND NOTHING IS INVENTED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑦ one interpretation, no invented values', () => {
  const src = readFileSync(join(__dirname, '../routes/company.ts'), 'utf8')

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
})
