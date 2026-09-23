// ═══════════════════════════════════════════════════════════════════════════════════════
// FOUR MORE SURFACES OVER THE SAME DEFECT — and one of them was the table we had just fixed
//
// ── WHAT THE ENUMERATION FOUND ──────────────────────────────────────────────────────────
//
// #1633, #1636 and #1638 each corrected a Milla current-work read one at a time. A read-only
// audit of every customer-visible surface then found the class was still open in five places:
//
//   D1 `/figsy/replies/all`  the REPLIES PAGE — `figsy_replies`, client-scoped, newest 200.
//   D2 `/leads/pipeline`     every lead ever `revealed_at` — the RETIRED $4 approve.
//   D3 `/leads/meetings`     `calendar_bookings`, client-scoped — and the retired SOURCE.
//   D4 `/leads/stats`        lifetime counts, rendered on Teams Hub as **"Leads today"**.
//   D5 `/figsy/kpis`         lifetime activity counts, default `period='all'`.
//
// 🛑 D1 IS THE ONE THAT MATTERS MOST, BECAUSE IT PROVES A PER-SURFACE FIX IS NOT A FIX.
// `recentRepliesFor` bounded the Home rail over `figsy_replies` and the founder confirmed on
// his own screen that House's historical reply had gone. It had gone from the RAIL. The
// REPLIES PAGE — reached by the badge that now correctly read zero — still returned it in
// full. Two surfaces, one table, one bounded: worse than neither, because they contradict each
// other and the page wins.
//
// ── WHAT IS PROVED HERE ─────────────────────────────────────────────────────────────────
//
// Every case is a MIXED-HISTORY account: one client carrying a large legacy book AND, where
// relevant, current programme work. A clean synthetic fixture cannot fail the way these
// surfaces failed (R92).
//
// 🛑 NOTHING IS DELETED OR BACKFILLED. Every historical row stays exactly where it is and is
// still readable by every operator surface in Vida. These tests are about what is presented as
// CURRENT — a different question from what is kept — and ④ is what stops the two collapsing.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: {
  clients: Row[]; leads: Row[]; programmes: Row[]; replies: Row[]; meetings: Row[]
  bookings: Row[]; campaigns: Row[]; icps: Row[]; enrollments: Row[]; sent: Row[]
} = { clients: [], leads: [], programmes: [], replies: [], meetings: [], bookings: [], campaigns: [], icps: [], enrollments: [], sent: [] }

function table(name: string) {
  const rows = (): Row[] =>
    name === 'leads' ? state.leads : name === 'programmes' ? state.programmes
    : name === 'figsy_replies' ? state.replies : name === 'meetings' ? state.meetings
    : name === 'calendar_bookings' ? state.bookings
    : name === 'figsy_campaigns' ? state.campaigns : name === 'icps' ? state.icps
    : name === 'figsy_enrollments' ? state.enrollments
    : name === 'figsy_sent_emails' ? state.sent : state.clients
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _limit: 0,
    select() { return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    neq(c: string, v: unknown) { q._f.push((r: Row) => r[c] !== v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    gte(c: string, v: unknown) { q._f.push((r: Row) => String(r[c] ?? '') >= String(v)); return q },
    lte() { return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    not(c: string, op: string, v: unknown) {
      if (op === 'is' && v === null) { q._f.push((r: Row) => (r[c] ?? null) !== null); return q }
      const set = String(v).replace(/[()]/g, '').split(',')
      q._f.push((r: Row) => !set.includes(String(r[c]))); return q
    },
    order() { return q },
    limit(n: number) { q._limit = n; return q },
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
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: async () => ({ content: [] }) } } }))

const C = 'c-mixed'
const OTHER = 'c-other'
const USER = 'u-1'
const P_NEW = 'P_NEW'

/** Run a REAL route handler. Not a reimplementation of its query — that is the failure mode. */
async function callRoute(mod: 'leads' | 'figsy', routerName: string, path: string, userId = USER) {
  const m = await import(`../routes/${mod}`)
  const layer = (m[routerName] as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === path && l.route?.methods.get)
  if (!layer) throw new Error(`GET ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null; let status = 200
  const res: any = { json: (b: unknown) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ userId, query: {}, body: {}, params: {} }, res, () => {})
  return { payload, status }
}
const repliesPage  = (u = USER) => callRoute('figsy', 'figsyRouter', '/replies/all', u)
const kpis         = (u = USER) => callRoute('figsy', 'figsyRouter', '/kpis', u)
const pipeline     = (u = USER) => callRoute('leads', 'leadRouter', '/pipeline', u)
const meetingsPage = (u = USER) => callRoute('leads', 'leadRouter', '/meetings', u)
const stats        = (u = USER) => callRoute('leads', 'leadRouter', '/stats', u)

// ── FIXTURES ─────────────────────────────────────────────────────────────────────────────
/** THE LARGE LEGACY BOOK: revealed, contacted, replied, met. All NULL-programme. */
function legacyHistory(clientId = C) {
  for (const n of [1, 2, 3]) {
    state.leads.push({
      id: `h${n}`, client_id: clientId, programme_id: null, proof_pass: null,
      delivered_at: 'd', revealed_at: '2026-02-01T00:00:00.000Z', surfaced_for_approval_at: 's',
      status: 'exported', score: 90, first_name: 'Old', last_name: `Lead${n}`, company: 'Legacy Co',
    })
    state.enrollments.push({ id: `e${n}`, lead_id: `h${n}`, campaign_id: 'camp-old', current_step: 2, status: 'active' })
  }
  state.replies.push({
    id: 'r-old', lead_id: 'h1', client_id: clientId, classification: 'hot',
    received_at: '2026-02-02T00:00:00.000Z', processed_at: '2026-02-02T00:00:00.000Z',
    meeting_booked_at: '2026-02-03T00:00:00.000Z',
  })
  state.campaigns.push({ id: 'camp-old', client_id: clientId, icp_id: 'icp-old', name: 'Retired campaign', status: 'active', created_at: '2026-02-01' })
  state.icps.push({ id: 'icp-old', client_id: clientId, programme_id: null, name: 'Old ICP', created_at: '2026-01-01' })
  state.sent.push({ id: 's-old', campaign_id: 'camp-old', sent_at: '2026-02-01T00:00:00.000Z', opened_at: '2026-02-01T01:00:00.000Z' })
  // Historical meetings in BOTH tables — the retired source and the current one.
  state.bookings.push({ id: 'b-old', client_id: clientId, lead_id: 'h1', meeting_title: 'Old meeting', start_time: '2026-02-03T10:00:00.000Z', status: 'confirmed' })
  state.meetings.push({
    id: 'm-old', client_id: clientId, lead_id: 'h1', programme_id: null, state: 'HELD',
    scheduled_at: '2026-02-03T10:00:00.000Z', excluded_reason: null, superseded_by: null, rescheduled_from: null,
  })
}
/** The programme's own people and its own activity. */
function programmeWork() {
  state.programmes.push({
    id: P_NEW, client_id: C, status: 'LIVE', meeting_target: 10, first_paid_at: 'p1', second_paid_at: 'p2',
    approved_at: 'a', went_live_at: 'w', paused_at: null, review_required_at: null, review_resolved_at: null,
    price_total_cents: 100000, sourcing_ceiling: 2500, sourced_used: 3,
  })
  state.icps.push({ id: 'icp-new', client_id: C, programme_id: P_NEW, name: 'Programme ICP', created_at: '2026-09-01' })
  state.campaigns.push({ id: 'camp-new', client_id: C, icp_id: 'icp-new', name: 'Programme campaign', status: 'active', created_at: '2026-09-01' })
  for (const n of [1, 2]) {
    state.leads.push({
      id: `n${n}`, client_id: C, programme_id: P_NEW, proof_pass: null,
      delivered_at: 'd', revealed_at: null, surfaced_for_approval_at: 's',
      status: 'scored', score: 80, first_name: 'New', last_name: `Lead${n}`, company: 'Programme Co',
    })
  }
  state.enrollments.push({ id: 'e-n1', lead_id: 'n1', campaign_id: 'camp-new', current_step: 1, status: 'active' })
  state.replies.push({
    id: 'r-new', lead_id: 'n2', client_id: C, classification: 'hot',
    received_at: '2026-09-03T00:00:00.000Z', processed_at: '2026-09-03T00:00:00.000Z', meeting_booked_at: null,
  })
  state.sent.push({ id: 's-new', campaign_id: 'camp-new', sent_at: '2026-09-02T00:00:00.000Z', opened_at: null })
  state.meetings.push({
    id: 'm-new', client_id: C, lead_id: 'n1', programme_id: P_NEW, state: 'BOOKED',
    scheduled_at: '2026-09-10T10:00:00.000Z', excluded_reason: null, superseded_by: null, rescheduled_from: null,
  })
}
function client(model: string | null, over: Row = {}) {
  state.clients.push({ id: C, user_id: USER, commercial_model: model, proof_passes_done: 0, proof_started_at: null, wallet_balance_usd: 0, plan: 'lead_gen', ...over })
}

beforeEach(() => {
  state.clients = []; state.leads = []; state.programmes = []; state.replies = []
  state.meetings = []; state.bookings = []; state.campaigns = []; state.icps = []
  state.enrollments = []; state.sent = []
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① PROGRAMME MODEL · NO ACTIVE PROGRAMME · LARGE LEGACY HISTORY
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① a programme client between programmes, carrying a full legacy book', () => {
  beforeEach(() => { client('programme'); legacyHistory() })

  it('🛑 REPLIES IS EMPTY — the page, not just the rail', async () => {
    expect((await repliesPage()).payload.data).toEqual([])
  })

  it('🛑 PIPELINE IS EMPTY — `revealed_at` is a retired payment, not current work', async () => {
    const { payload } = await pipeline()
    expect(payload.data.counts).toEqual({ approved: 0, contacted: 0, replied: 0, booked: 0 })
    expect(payload.data.stages.contacted).toEqual([])
  })

  it('🛑 MEETINGS IS EMPTY', async () => {
    expect((await meetingsPage()).payload.data).toEqual([])
  })

  it('🛑 TEAMS METRICS ARE ZERO — no "166 leads" from a retired book', async () => {
    const s = (await stats()).payload.data
    expect(s.total).toBe(0); expect(s.scored).toBe(0); expect(s.exported).toBe(0)
    const k = (await kpis()).payload.data
    expect(k.totalSent).toBe(0); expect(k.totalReplied).toBe(0); expect(k.meetingsBooked).toBe(0)
    expect(k.totalLeads).toBe(0); expect(k.leadsContacted).toBe(0)
    expect(k.activeCampaigns, 'a retired campaign left active is not a live one').toBe(0)
  })

  it('🛑 AND EVERY HISTORICAL ROW IS STILL IN THE DATABASE', () => {
    expect(state.leads).toHaveLength(3)
    expect(state.replies).toHaveLength(1)
    expect(state.meetings).toHaveLength(1)
    expect(state.bookings).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② ACTIVE P_NEW + THE SAME LEGACY HISTORY — BOTH HALVES ASSERTED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② an active programme on an account with history', () => {
  beforeEach(() => { client('programme'); legacyHistory(); programmeWork() })

  it('🛑 REPLIES SHOWS THE PROGRAMME REPLY AND NOT THE HISTORICAL ONE', async () => {
    const ids = (await repliesPage()).payload.data.map((r: Row) => r.id)
    expect(ids).toEqual(['r-new'])
  })

  it('🛑 PIPELINE SHOWS PROGRAMME PEOPLE ONLY — an empty board would be a FAILURE here', async () => {
    const { payload } = await pipeline()
    const named = [...payload.data.stages.contacted, ...payload.data.stages.replied, ...payload.data.stages.booked]
      .map((c: Row) => c.id).sort()
    expect(named).toEqual(['n1', 'n2'])
    for (const h of ['h1', 'h2', 'h3']) expect(named).not.toContain(h)
  })

  it('🛑 THE PROGRAMME BOARD IS CONTACTED → REPLIED → BOOKED, with no per-person "approved"', async () => {
    const { payload } = await pipeline()
    expect(payload.data.model).toBe('programme')
    expect(payload.data.stages.approved, 'the programme model has no per-person approval').toEqual([])
    // n1 is enrolled AND has a booked meeting, so it settles at the furthest stage it has
    // reached — BOOKED — exactly as the legacy board has always resolved precedence.
    expect(payload.data.counts.booked).toBe(1)      // n1
    expect(payload.data.counts.replied).toBe(1)     // n2
    expect(payload.data.counts.contacted).toBe(0)
  })

  it('🛑 MEETINGS SHOWS THE PROGRAMME MEETING AND NOT THE HISTORICAL ONE', async () => {
    const rows = (await meetingsPage()).payload.data
    expect(rows.map((m: Row) => m.id)).toEqual(['m-new'])
    expect(rows[0].status).toBe('Booked')
  })

  it('🛑 TEAMS METRICS COUNT THE PROGRAMME ONLY', async () => {
    const s = (await stats()).payload.data
    expect(s.total, 'two programme leads, not five').toBe(2)
    const k = (await kpis()).payload.data
    expect(k.totalSent).toBe(1)                // s-new only
    expect(k.totalReplied).toBe(1)             // r-new only
    expect(k.activeCampaigns).toBe(1)          // camp-new only
    expect(k.totalLeads).toBe(2)
    expect(k.meetingsBooked, 'the historical booked reply is not programme work').toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ FREE PROOF — CARDS MAY EXIST, OUTREACH MAY NOT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ a calibration workspace', () => {
  beforeEach(() => {
    client('programme', { proof_passes_done: 1, proof_started_at: '2026-09-03T09:00:00.000Z' })
    legacyHistory()
    state.leads.push({
      id: 'p1', client_id: C, programme_id: null, proof_pass: 1, delivered_at: 'd',
      revealed_at: null, surfaced_for_approval_at: 's', status: 'scored', score: 80,
    })
  })

  it('the proof card exists on the account — this fixture is not vacuous', () => {
    expect(state.leads.filter(l => l.proof_pass !== null)).toHaveLength(1)
  })

  it('🛑 REPLIES · PIPELINE · MEETINGS ARE ALL EMPTY — calibration is not outreach', async () => {
    expect((await repliesPage()).payload.data).toEqual([])
    expect((await pipeline()).payload.data.counts).toEqual({ approved: 0, contacted: 0, replied: 0, booked: 0 })
    expect((await meetingsPage()).payload.data).toEqual([])
  })

  it('🛑 AND NO HISTORICAL OUTREACH KPI IS INHERITED', async () => {
    const k = (await kpis()).payload.data
    expect(k.totalSent).toBe(0); expect(k.totalReplied).toBe(0); expect(k.leadsContacted).toBe(0)
    expect((await stats()).payload.data.total).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ LEGACY AND UNCLASSIFIED — NOW PROGRAMME CLIENTS, SO NO RETIRED BOOK IS CURRENT WORK (R137)
//
// ⛓️ INVERTED 23 Sep (R137). WAS: `④ LEGACY AND UNCLASSIFIED — THE RETIRED BOOK KEEPS EVERYTHING`
// / `describe('④ legacy / compat_legacy is untouched')`, asserting their historical replies,
// pipeline, meetings and metrics all still rendered as current. Founder, verbatim: *"the 299/4
// is retired/ this must go. everything must be updated to new programme pricing model."* A
// NULL or stored-'legacy' client is a programme client now, so the historical book is treated
// exactly as it is for a declared programme client with no programme open: kept in the
// database, not presented as current work. ⚠️ NOTHING IS DELETED — the rows are untouched and
// Vida still reads them; this is what Milla presents as CURRENT.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ legacy / unclassified clients are programme clients now (R137)', () => {
  for (const model of [null, 'legacy'] as const) {
    it(`🛑 commercial_model ${String(model)} → no historical reply, meeting or metric presented as current`, async () => {
      client(model); legacyHistory()
      expect(state.replies.length, 'the history exists — this fixture is not vacuous').toBeGreaterThan(0)
      expect((await repliesPage()).payload.data).toEqual([])
      const p = (await pipeline()).payload.data
      expect(p.model, 'the pipeline answers as a programme client').not.toBe('legacy')
      expect(p.counts.contacted + p.counts.replied + p.counts.booked, 'no retired pipeline').toBe(0)
      expect((await meetingsPage()).payload.data).toEqual([])
      expect((await stats()).payload.data.total).toBe(0)
      const k = (await kpis()).payload.data
      expect(k.totalSent).toBe(0); expect(k.totalReplied).toBe(0); expect(k.activeCampaigns).toBe(0)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ TENANCY — NO CROSS-CLIENT BLEED, WHATEVER THE SCOPE RESOLVES TO
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ tenancy', () => {
  it("🛑 ANOTHER CLIENT'S REPLIES, LEADS, MEETINGS AND METRICS NEVER REACH THIS ONE", async () => {
    client('programme'); legacyHistory(); programmeWork()
    state.clients.push({ id: OTHER, user_id: 'u-2', commercial_model: 'legacy', proof_passes_done: 0, wallet_balance_usd: 0 })
    legacyHistory(OTHER)
    state.replies.push({ id: 'r-other', lead_id: 'x', client_id: OTHER, classification: 'hot', received_at: '2026-09-03', processed_at: '2026-09-03', meeting_booked_at: null })

    const ids = (await repliesPage()).payload.data.map((r: Row) => r.id)
    expect(ids).toEqual(['r-new'])
    expect((await meetingsPage()).payload.data.map((m: Row) => m.id)).toEqual(['m-new'])
    expect((await stats()).payload.data.total).toBe(2)
  })

  it('🛑 TENANCY IS UNCONDITIONAL IN THE SOURCE — the scope only ever ADDS a filter', () => {
    const leads = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
    const fn = leads.slice(leads.indexOf("leadRouter.get('/pipeline'"), leads.indexOf("leadRouter.get('/coaching'"))
    expect(fn).toContain(".eq('client_id', clientId)")
    expect(fn.indexOf(".eq('client_id', clientId)")).toBeLessThan(fn.indexOf("scope.mode === 'ids'"))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ NOTHING IS WRITTEN, DELETED OR BACKFILLED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑥ the corrected reads are read models', () => {
  const src = (p: string) => readFileSync(join(__dirname, p), 'utf8')

  it('🛑 THE SHARED BOUNDARY WRITES NOTHING', () => {
    const s = src('current-outreach.ts')
    for (const w of ['.update(', '.insert(', '.delete(', '.upsert(', '.rpc(']) {
      expect(s, `the boundary must not write: ${w}`).not.toContain(w)
    }
  })

  it('🛑 AND IT IS ONE INTERPRETATION, NOT FIVE — every surface asks the same function', () => {
    for (const [file, where] of [
      ['../routes/leads.ts', '/pipeline, /meetings, /stats'],
      ['../routes/figsy.ts', '/replies/all, /kpis'],
    ] as const) {
      expect(src(file), `${where} must use the shared boundary`).toContain('currentOutreachLeads')
    }
    // …and it is built on the EXISTING workspace resolver, not a new one.
    expect(src('current-outreach.ts')).toContain("await import('./current-workspace')")
  })

  it('🛑 NO SURFACE INFERS CURRENT WORK FROM A RETIRED SIGNAL', () => {
    const leads = src('../routes/leads.ts')
    const pipe = leads.slice(leads.indexOf("leadRouter.get('/pipeline'"), leads.indexOf("leadRouter.get('/coaching'"))
    // `revealed_at` survives ONLY on the legacy arm, and the programme arm names ids instead.
    expect(pipe).toContain("? approvedQ.in('id', safeIn(scope.ids))")
    expect(pipe).toContain(": approvedQ.not('revealed_at', 'is', null)")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑦ MEETINGS — public.meetings IS AUTHORITATIVE, AND DUPLICATES STAY GONE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑦ the Meetings page reads current meeting truth', () => {
  it('🛑 THE ROUTE NO LONGER READS THE RETIRED calendar_bookings', () => {
    const leads = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
    const fn = leads.slice(leads.indexOf("leadRouter.get('/meetings'"))
      .slice(0, leads.slice(leads.indexOf("leadRouter.get('/meetings'")).indexOf("leadRouter.post('/'"))
    expect(fn, 'the customer Meetings page must not read calendar_bookings').not.toContain("from('calendar_bookings')")
    expect(fn).toContain('meetingsForClient')
  })

  it('🛑 A SUPERSEDED (RESCHEDULED) ROW IS NOT LISTED TWICE', async () => {
    client('programme'); programmeWork()
    // The original booking, moved: it is stamped superseded_by and must not appear.
    state.meetings.push({
      id: 'm-old-slot', client_id: C, lead_id: 'n1', programme_id: P_NEW, state: 'BOOKED',
      scheduled_at: '2026-09-08T10:00:00.000Z', excluded_reason: null, superseded_by: 'm-moved', rescheduled_from: null,
    })
    state.meetings.push({
      id: 'm-moved', client_id: C, lead_id: 'n1', programme_id: P_NEW, state: 'BOOKED',
      scheduled_at: '2026-09-12T10:00:00.000Z', excluded_reason: null, superseded_by: null, rescheduled_from: 'm-old-slot',
    })
    const rows = (await meetingsPage()).payload.data
    expect(rows.map((m: Row) => m.id).sort()).toEqual(['m-moved', 'm-new'])
    expect(rows.find((m: Row) => m.id === 'm-moved').status).toBe('Rescheduled')
  })

  it('🛑 AN EXCLUDED (DUPLICATE / SPAM) MEETING IS NOT LISTED', async () => {
    client('programme'); programmeWork()
    state.meetings.push({
      id: 'm-dupe', client_id: C, lead_id: 'n1', programme_id: P_NEW, state: 'BOOKED',
      scheduled_at: '2026-09-11T10:00:00.000Z', excluded_reason: 'duplicate', superseded_by: null, rescheduled_from: null,
    })
    expect((await meetingsPage()).payload.data.map((m: Row) => m.id)).toEqual(['m-new'])
  })

  it('every supported status is spoken truthfully, and never inferred from the clock', async () => {
    client('programme'); programmeWork()
    const add = (id: string, st: string) => state.meetings.push({
      id, client_id: C, lead_id: 'n1', programme_id: P_NEW, state: st,
      scheduled_at: `2026-09-2${id.length}T10:00:00.000Z`, excluded_reason: null, superseded_by: null, rescheduled_from: null,
    })
    add('mh', 'HELD'); add('mns', 'NO_SHOW'); add('mu', 'BOOKED_UNVERIFIED')
    const byId = new Map((await meetingsPage()).payload.data.map((m: Row) => [m.id, m.status]))
    expect(byId.get('mh')).toBe('Held')
    expect(byId.get('mns')).toBe('No-show')
    expect(byId.get('mu')).toBe('Awaiting verification')
    expect(byId.get('m-new')).toBe('Booked')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑧ THE LABEL THAT SAID "TODAY" ABOUT A LIFETIME COUNT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑧ Teams Hub says what its numbers actually are', () => {
  const raw = readFileSync(join(__dirname, '../../../portal/src/app/(dashboard)/dashboard/team/page.tsx'), 'utf8')
  // ⚠️ EXECUTABLE JSX ONLY. The correction's own note QUOTES the retired label verbatim while
  // explaining why it went — prose about a defect is not the defect, and a raw match would
  // fail on the sentence promising the fix. The comment-stripper lesson, applied at source.
  // ⚠️ EXECUTABLE JSX ONLY, AND BLOCK-AWARE. The correction's own note QUOTES both retired
  // labels verbatim while explaining why they went — prose about a defect is not the defect.
  // A PREFIX filter is not enough here and my first attempt proved it: a wrapped sentence
  // continues on a line starting with an ordinary word, so `(all time)` survived the strip and
  // failed a guard about a label that had already been corrected. Block-aware, like
  // `milla-house-bleed.test.ts`'s `jsxCode`.
  const page = (() => {
    let inBlock = false
    return raw.split('\n').map(l => {
      const t = l.trim()
      if (inBlock) { if (t.endsWith('*/') || t.endsWith('*/}')) inBlock = false; return '' }
      if (t.startsWith('{/*')) { if (!t.endsWith('*/}')) inBlock = true; return '' }
      if (t.startsWith('/*')) { if (!t.endsWith('*/')) inBlock = true; return '' }
      if (t.startsWith('//') || t.startsWith('*')) return ''
      const k = l.search(/(?<!:)\/\//)
      return k >= 0 ? l.slice(0, k) : l
    }).join('\n')
  })()

  it('🛑 "LEADS TODAY" IS GONE — the value was never today', () => {
    expect(page).not.toContain('label="Leads today"')
    expect(page).toContain('label="Leads delivered"')
  })

  it('🛑 AND NO LABEL CLAIMS A SCOPE THE NUMBER CANNOT SUPPORT', () => {
    // ⛓️ CORRECTED SAME DAY — ~~`"Leads delivered (all time)"` / `"Emails sent (all time)"`~~.
    // Those were true BEFORE the server boundary and false immediately after it: for a
    // programme customer the value is now their CURRENT PROGRAMME's count, so "(all time)"
    // re-introduced the same falsehood pointing the other way. The bare noun is truthful
    // under BOTH models, which is why it is the smallest truthful wording.
    expect(page).toContain('label="Emails sent"')
    expect(page, 'no time claim the number cannot support').not.toContain('(all time)')
    // The VALUE is unchanged — the correction is the label plus the server boundary, never a
    // different number quietly substituted under the old word.
    expect(page).toContain('value={leadsToday}')
    expect(page).toContain('value={emailsSent}')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑨ UNREADABLE FAILS **CLOSED** — founder-rejected fail-open-to-history, 4 Sep
//
// ⛓️ THE FIRST CUT FELL THROUGH TO THE CLIENT-SCOPED READ on an unreadable scope, copying the
// Home rail's fail-soft. The founder refused it: an authority failure is not a licence to show
// a programme customer their retired book, and *"do not expose historical replies merely to
// avoid an empty screen."* An empty screen is recoverable; a false one is not.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑨ a transient authority failure shows nothing, not history', () => {
  beforeEach(() => {
    // ⚠️ THE CLIENT EXISTS — otherwise the route 404s before the boundary is ever consulted,
    // and the test would prove nothing about the boundary. What is missing is the
    // `commercial_model` FIELD, which the resolver treats as unreadable rather than as NULL
    // ("a missing field is not a NULL", R90's sibling ruling). Their full legacy book sits
    // right there in the tables while authority cannot be resolved.
    state.clients.push({ id: C, user_id: USER, proof_passes_done: 0, wallet_balance_usd: 0 })
    legacyHistory()
  })

  it('the fixture really is unreadable AND really does have history — not vacuous', async () => {
    const { currentOutreachLeads } = await import('./current-outreach')
    expect((await currentOutreachLeads(C)).mode).toBe('unreadable')
    expect(state.replies.length + state.leads.length).toBeGreaterThan(0)
  })

  it('🛑 REPLIES REFUSES — 503, and NOT the historical inbox', async () => {
    const { payload, status } = await repliesPage()
    expect(status).toBe(503)
    expect(payload.success).toBe(false)
    expect(JSON.stringify(payload)).not.toContain('r-old')
  })

  it('🛑 PIPELINE AND MEETINGS REFUSE TOO', async () => {
    expect((await pipeline()).status).toBe(503)
    expect((await meetingsPage()).status).toBe(503)
  })

  it('🛑 AND THE NUMERIC SURFACES FAIL CLOSED TO ZERO — a number is an assertion', async () => {
    expect((await stats()).payload.data.total).toBe(0)
    const k = (await kpis()).payload.data
    expect(k.totalSent).toBe(0); expect(k.totalReplied).toBe(0); expect(k.activeCampaigns).toBe(0)
  })

  it('🛑 THE HOME RAIL REFUSES ON THE SAME TERMS — one table, one degradation', async () => {
    // D1's lesson pointing the other way: the rail and the page must not disagree.
    const { buildMillaSummaryData } = await import('./milla-summary')
    const summary = await buildMillaSummaryData(C)
    expect(summary.recent_replies).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑩ TEAMS HUB — "EMAILS SENT" READ A FIELD THE API HAS NEVER SENT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑩ Emails sent is wired to the value the endpoint actually returns', () => {
  const page = readFileSync(join(__dirname, '../../../portal/src/app/(dashboard)/dashboard/team/page.tsx'), 'utf8')

  it('🛑 THE PORTAL READS `totalSent`, NOT THE NON-EXISTENT `emails_sent`', () => {
    expect(page).toContain('setEmailsSent(emailsRes.value?.data?.totalSent ?? 0)')
    expect(page).not.toContain('data?.emails_sent')
  })

  it('🛑 AND THE API GENUINELY RETURNS THAT KEY — otherwise this is the same bug renamed', async () => {
    client('programme'); legacyHistory(); programmeWork()
    const k = (await kpis()).payload.data
    expect(Object.keys(k)).toContain('totalSent')
    expect(Object.keys(k), 'the key the portal used never existed').not.toContain('emails_sent')
  })

  it('🛑 ACTIVE PROGRAMME WITH SENDS → THE PROGRAMME COUNT, not 0 and not the legacy book', async () => {
    client('programme'); legacyHistory(); programmeWork()
    expect((await kpis()).payload.data.totalSent).toBe(1)
  })

  it('mixed history, no programme → 0', async () => {
    client('programme'); legacyHistory()
    expect((await kpis()).payload.data.totalSent).toBe(0)
  })

  it('🛑 stored legacy → 0, like any programme client with no programme (R137)', async () => {
    // ⛓️ INVERTED 23 Sep (R137). WAS: `'legacy → the historical send count, unchanged'` (1).
    // Founder: *"the 299/4 is retired/ this must go."* The stored word no longer makes the
    // retired book current work.
    client('legacy'); legacyHistory()
    expect((await kpis()).payload.data.totalSent).toBe(0)
  })

  it("🛑 another client's sends are excluded", async () => {
    client('programme'); legacyHistory(); programmeWork()
    state.sent.push({ id: 's-other', campaign_id: 'camp-other', sent_at: '2026-09-02', opened_at: null })
    state.campaigns.push({ id: 'camp-other', client_id: OTHER, icp_id: 'icp-o', name: 'x', status: 'active', created_at: '2026-09-01' })
    expect((await kpis()).payload.data.totalSent).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑪ THE VISIBLE PROGRAMME PIPELINE IS THREE STAGES
//
// 🛑 THE SERVER FIX ALONE DID NOT CLOSE D2. `stages.approved` became empty for a programme
// customer, but the PAGE hard-coded four columns — so an "Approved" heading with the retired
// subtitle *"you said go"* still sat on their screen, permanently empty. An empty column with
// a heading IS a stage.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑪ no fourth customer-facing programme stage', () => {
  const page = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/pipeline/page.tsx'), 'utf8')

  it('🛑 THE PROGRAMME BOARD RENDERS EXACTLY CONTACTED → REPLIED → BOOKED', () => {
    expect(page).toContain('const STAGES: Stage[] = programme ? OUTREACH_STAGES : [APPROVED_STAGE, ...OUTREACH_STAGES]')
    const from = page.indexOf('const OUTREACH_STAGES')
    const outreach = page.slice(from, page.indexOf('\n]', from))
    for (const k of ['contacted', 'replied', 'booked']) expect(outreach).toContain(`key: '${k}'`)
    expect(outreach, 'approved must not be in the locked new-model board').not.toContain("key: 'approved'")
  })

  it('🛑 `sourced_not_contacted` IS A NUMBER, NEVER A COLUMN', () => {
    expect(page, 'the field is typed as a count').toMatch(/sourced_not_contacted\?: number/)
    expect(page, 'it must never become a stage key').not.toMatch(/key: 'sourced/)
    // And it is not rendered at all today — no stage, no tile, no heading.
    const rendered = page.slice(page.indexOf('return ('))
    expect(rendered).not.toContain('sourced_not_contacted')
  })

  it('🛑 THE SERVER STILL RETURNS AN EMPTY `approved` FOR A PROGRAMME, so both halves agree', async () => {
    client('programme'); legacyHistory(); programmeWork()
    const d = (await pipeline()).payload.data
    expect(d.model).toBe('programme')
    expect(d.stages.approved).toEqual([])
    expect(d.counts.approved).toBe(0)
  })

  it('legacy keeps all four columns and its own wording', () => {
    expect(page).toContain("label: 'Approved'")
    expect(page).toContain('Every lead you approved')
  })
})
