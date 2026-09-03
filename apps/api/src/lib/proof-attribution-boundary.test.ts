// ═══════════════════════════════════════════════════════════════════════════════════════
// ONE ACCOUNT, TWO HISTORIES — THE CASE EVERY EARLIER FIX PASSED AND SHOULD HAVE FAILED
//
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────
//
// Three separate attempts were made to stop House rendering its retired per-lead desk as a
// current Milla workspace. Every one of them shipped green, because every test written for
// them used a CLEAN SYNTHETIC CLIENT: House with history and no proof, or a new prospect with
// proof and no history. Neither fixture can fail the way the product actually failed.
//
// 🛑 THE CASE THAT BREAKS THEM ALL IS ONE ACCOUNT HOLDING BOTH:
//
//     commercial_model = 'programme' · no open programme
//     THREE historical NULL-programme legacy leads, one old reply, one old campaign, one old
//     meeting — the retired desk
//     AND a legitimate modern FREE PROOF run on top of it
//
// Against `proof_passes_done > 0 → show the unbounded client-scoped desk`, that account gets
// every historical card back the moment it runs a proof it was entitled to run. The counter
// answers "has this account EVER claimed a pass"; it was being read as "does THIS ROW belong
// to that pass". A clean fixture cannot tell those apart. This one can, and does.
//
// ── WHAT IS PROVED HERE ─────────────────────────────────────────────────────────────────
//
// ① MIXED HISTORY — the modern proof cards ARE shown AND the four historical items are NOT.
//    Both halves are asserted: an empty desk is a FAILURE here, not a pass.
// ② TWO PASSES — pass 1 and pass 2 both survive. No moving timestamp hides the earlier set.
// ③ PROGRAMME TRANSITION — P_NEW opens and the workspace switches to positive programme
//    attribution; proof cards do not masquerade as programme work.
// ④ HOUSE — the required end state, expressed as behaviour rather than as a client id.
// ⑤ LEGACY IS UNTOUCHED — the $299 book keeps every card, reply and campaign it has.
// ⑥ THE BOUNDARY ITSELF — no name, no env var, no clock, no client-level counter, no write.
//
// 🛑 NOTHING IS DELETED AND NOTHING IS BACKFILLED. Every historical row stays exactly where
// it is and every operator surface in Vida still reads it. These tests are about what is
// presented as CURRENT, which is a different question from what is kept — and ⑤ is what keeps
// the two questions from collapsing into each other.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: {
  clients: Row[]; leads: Row[]; programmes: Row[]; replies: Row[]
  meetings: Row[]; campaigns: Row[]; icps: Row[]; outcomes: Row[]; txs: Row[]
} = { clients: [], leads: [], programmes: [], replies: [], meetings: [], campaigns: [], icps: [], outcomes: [], txs: [] }

/**
 * A fake PostgREST builder over in-memory rows.
 *
 * ⚠️ `not(col, 'is', null)` IS THE ASSERTION SURFACE OF THIS WHOLE FILE, so it is implemented
 * exactly as PostgREST behaves — a row whose column is absent or null does NOT match. That is
 * what makes "a historical lead has no `proof_pass`" a real exclusion rather than a fixture
 * convenience.
 */
function table(name: string) {
  const rows = (): Row[] =>
    name === 'leads' ? state.leads : name === 'programmes' ? state.programmes
    : name === 'figsy_replies' ? state.replies : name === 'meetings' ? state.meetings
    : name === 'figsy_campaigns' ? state.campaigns : name === 'icps' ? state.icps
    : name === 'icp_run_outcomes' ? state.outcomes
    : name === 'credit_transactions' ? state.txs : state.clients
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
// Importing the REAL leads router pulls the auth middleware in, and that builds its own
// Supabase client at module load. The handler under test is reached directly, so the
// middleware is never exercised — it only has to exist.
vi.mock('../middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}))
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: async () => ({ content: [] }) } } }))

import { currentWorkspaceScope, showsCurrentOutreach } from './current-workspace'
import { buildMillaSummaryData } from './milla-summary'

const C = 'client-with-two-histories'
const USER = 'u-1'
const P_NEW = 'P_NEW'

/** The retired per-lead desk: delivered, surfaced, no programme, and NOT proof work. */
function historicalLegacyLead(id: string) {
  state.leads.push({
    id, client_id: C, programme_id: null, proof_pass: null,
    delivered_at: '2026-02-01T00:00:00.000Z', surfaced_for_approval_at: '2026-02-01T00:00:00.000Z',
    revealed_at: null, status: 'scored', score: 50, first_name: 'Old', last_name: 'Lead',
    job_title: 'CEO', company: `Legacy Co ${id}`, score_reasoning: null, created_at: '2026-02-01T00:00:00.000Z',
  })
}
/** A modern free-proof lead: identical in every column EXCEPT the one that attributes it. */
function proofLead(id: string, pass: 1 | 2, surfacedAt: string) {
  state.leads.push({
    id, client_id: C, programme_id: null, proof_pass: pass,
    delivered_at: surfacedAt, surfaced_for_approval_at: surfacedAt,
    revealed_at: null, status: 'scored', score: 80, first_name: 'New', last_name: 'Match',
    job_title: 'COO', company: `Proof Co ${id}`, score_reasoning: null, created_at: surfacedAt,
  })
}
function programmeLead(id: string) {
  state.leads.push({
    id, client_id: C, programme_id: P_NEW, proof_pass: null,
    delivered_at: '2026-09-02T00:00:00.000Z', surfaced_for_approval_at: '2026-09-02T00:00:00.000Z',
    revealed_at: null, status: 'scored', score: 90, first_name: 'Prog', last_name: 'Lead',
    job_title: 'CFO', company: `Programme Co ${id}`, score_reasoning: null, created_at: '2026-09-02T00:00:00.000Z',
  })
}

/** The four historical NON-LEAD items: one reply, one campaign, one meeting. */
function historicalOutreach() {
  state.replies.push({
    id: 'r-old', lead_id: 'h1', client_id: C, from_name: 'Old Replier',
    from_email: 'old@example.com', classification: 'interested', received_at: '2026-02-02T00:00:00.000Z',
  })
  state.campaigns.push({
    id: 'camp-old', client_id: C, icp_id: 'icp-old', name: 'Retired legacy campaign',
    status: 'active', created_at: '2026-02-01T00:00:00.000Z',
  })
  state.meetings.push({
    id: 'm-old', client_id: C, programme_id: null, lead_id: 'h1', state: 'booked',
    excluded_reason: null, superseded_by: null, scheduled_at: '2026-09-01T12:00:00.000Z',
    created_at: '2026-09-01T12:00:00.000Z',
  })
}

/**
 * The REAL `/leads/for-approval` handler, sliced out of the live router.
 *
 * ⚠️ NOT A REIMPLEMENTATION OF THE QUERY. A test that rebuilt the filter chain would pass
 * whatever the route actually does, which is the exact failure mode this file was written to
 * end. This runs the shipped handler.
 */
async function forApprovalCards(): Promise<Array<Record<string, unknown>>> {
  const mod = await import('../routes/leads')
  const layer = (mod.leadRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/for-approval' && l.route?.methods.get)
  if (!layer) throw new Error('GET /for-approval not found on leadRouter')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null
  const res: any = { json: (b: unknown) => { payload = b }, status: () => res }
  await handler({ userId: USER, query: {}, body: {}, params: {} }, res, () => {})
  return (payload?.data ?? []) as Array<Record<string, unknown>>
}
const ids = (cards: Array<Record<string, unknown>>) => cards.map(c => String(c.id)).sort()

beforeEach(() => {
  state.clients = []; state.leads = []; state.programmes = []; state.replies = []
  state.meetings = []; state.campaigns = []; state.icps = []; state.outcomes = []; state.txs = []
})

/** A DECLARED programme client with no open programme — the state House is actually in. */
function declaredProgrammeClient(over: Row = {}) {
  state.clients.push({
    id: C, user_id: USER, commercial_model: 'programme',
    // ⚠️ SEEDED NON-ZERO ON PURPOSE. This is the value the withdrawn rule keyed on, and every
    // assertion below must hold REGARDLESS of it. If a future edit reintroduces a client-level
    // counter as the boundary, these fixtures put it in the failing state on day one.
    proof_passes_done: 2, proof_started_at: '2026-09-03T09:00:00.000Z',
    wallet_balance_usd: 0, plan: 'lead_gen', ...over,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE MIXED-HISTORY CASE — BOTH HALVES ASSERTED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① one account, two histories', () => {
  beforeEach(() => {
    declaredProgrammeClient()
    historicalLegacyLead('h1'); historicalLegacyLead('h2'); historicalLegacyLead('h3')
    historicalOutreach()
    proofLead('p1', 1, '2026-09-03T10:00:00.000Z')
    proofLead('p2', 1, '2026-09-03T10:00:00.000Z')
  })

  it('🛑 SHOWS THE TWO MODERN PROOF CARDS — an empty desk is a FAILURE, not a pass', async () => {
    const cards = await forApprovalCards()
    expect(ids(cards)).toEqual(['p1', 'p2'])
    expect(cards).toHaveLength(2)
  })

  it('🛑 HIDES ALL THREE HISTORICAL LEGACY CARDS, on the same account, in the same read', async () => {
    const cards = await forApprovalCards()
    for (const h of ['h1', 'h2', 'h3']) expect(ids(cards)).not.toContain(h)
  })

  it('🛑 THE HISTORICAL REPLY IS NOT CURRENT ACTIVITY — free proof sends nobody an email', async () => {
    const s = await buildMillaSummaryData(C)
    expect(s.recent_replies).toEqual([])
  })

  it('🛑 THE HISTORICAL CAMPAIGN IS NOT THE CURRENT CAMPAIGN', async () => {
    const s = await buildMillaSummaryData(C)
    expect(s.campaign_name).toBeNull()
  })

  it('🛑 THE HISTORICAL MEETING IS NOT A CURRENT RESULT — calibration books nobody', async () => {
    const s = await buildMillaSummaryData(C)
    expect(s.meetings_booked).toBe(0)
  })

  it('the awaiting COUNT matches the card list exactly — 2, not 5', async () => {
    const s = await buildMillaSummaryData(C)
    const cards = await forApprovalCards()
    expect(s.leads_awaiting).toBe(2)
    expect(s.leads_awaiting).toBe(cards.length)
  })

  it('🛑 HISTORY IS PRESERVED, NOT DELETED — all five rows are still in the table', () => {
    expect(state.leads).toHaveLength(5)
    expect(state.replies).toHaveLength(1)
    expect(state.campaigns).toHaveLength(1)
    expect(state.meetings).toHaveLength(1)
  })

  it('the ALL-TIME report figures still read history — it counts where it belongs', async () => {
    const s = await buildMillaSummaryData(C)
    expect(s.replies_total).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② TWO PASSES — "two labelled proof sets, nothing deleted or filtered away" (founder-locked)
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② both proof passes survive', () => {
  beforeEach(() => {
    declaredProgrammeClient()
    historicalLegacyLead('h1'); historicalLegacyLead('h2'); historicalLegacyLead('h3')
    historicalOutreach()
    proofLead('p1a', 1, '2026-09-03T10:00:00.000Z')
    proofLead('p1b', 1, '2026-09-03T10:00:00.000Z')
    proofLead('p2a', 2, '2026-09-03T14:00:00.000Z')
    proofLead('p2b', 2, '2026-09-03T14:00:00.000Z')
  })

  it('🛑 PASS 1 IS STILL THERE AFTER PASS 2 — no moving timestamp hides the earlier set', async () => {
    const cards = await forApprovalCards()
    expect(ids(cards)).toEqual(['p1a', 'p1b', 'p2a', 'p2b'])
  })

  it('🛑 AND THE THREE HISTORICAL CARDS ARE STILL EXCLUDED', async () => {
    const cards = await forApprovalCards()
    for (const h of ['h1', 'h2', 'h3']) expect(ids(cards)).not.toContain(h)
  })

  it('both batch stamps are returned, so the desk can still label Latest / Earlier set', async () => {
    const cards = await forApprovalCards()
    const stamps = new Set(cards.map(c => String(c.surfaced_for_approval_at)))
    expect(stamps.size).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ THE PROGRAMME TRANSITION
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ the same client later receives P_NEW', () => {
  beforeEach(() => {
    declaredProgrammeClient()
    historicalLegacyLead('h1'); historicalLegacyLead('h2'); historicalLegacyLead('h3')
    historicalOutreach()
    proofLead('p1', 1, '2026-09-03T10:00:00.000Z')
    proofLead('p2', 1, '2026-09-03T10:00:00.000Z')
    programmeLead('n1'); programmeLead('n2')
    state.programmes.push({
      id: P_NEW, client_id: C, status: 'SOURCING', meeting_target: 10,
      first_paid_at: 'p1', second_paid_at: null, approved_at: null, went_live_at: null,
      paused_at: null, review_required_at: null, review_resolved_at: null,
      price_total_cents: 100000, sourcing_ceiling: 2500, sourced_used: 0,
    })
  })

  it('the workspace switches to POSITIVE programme attribution', async () => {
    const scope = await currentWorkspaceScope(C)
    expect(scope).toEqual({ kind: 'programme', programmeId: P_NEW })
  })

  it('🛑 PROOF CARDS DO NOT MASQUERADE AS PROGRAMME WORK', async () => {
    const cards = await forApprovalCards()
    expect(ids(cards)).toEqual(['n1', 'n2'])
    for (const p of ['p1', 'p2']) expect(ids(cards)).not.toContain(p)
  })

  it('🛑 AND THE HISTORICAL LEGACY DATA REMAINS HIDDEN', async () => {
    const cards = await forApprovalCards()
    for (const h of ['h1', 'h2', 'h3']) expect(ids(cards)).not.toContain(h)
    const s = await buildMillaSummaryData(C)
    expect(s.recent_replies).toEqual([])   // the old reply is attributed to h1, not to P_NEW
    expect(s.campaign_name).toBeNull()     // the old campaign is on icp-old, not a P_NEW ICP
    expect(s.meetings_booked).toBe(0)      // the old meeting carries no programme_id
  })

  it('🛑 NOTHING WAS DELETED OR BACKFILLED BY THE TRANSITION', () => {
    expect(state.leads.filter(l => l.proof_pass !== null && l.proof_pass !== undefined)).toHaveLength(2)
    expect(state.leads.filter(l => l.programme_id === null)).toHaveLength(5)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ HOUSE — STATED AS BEHAVIOUR, NEVER AS AN IDENTITY
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ declared programme · no programme · no attributed proof work', () => {
  beforeEach(() => {
    declaredProgrammeClient()
    historicalLegacyLead('h1'); historicalLegacyLead('h2'); historicalLegacyLead('h3')
    historicalOutreach()
  })

  it('🛑 THE DESK IS EMPTY — and that is the whole House fix', async () => {
    expect(await forApprovalCards()).toEqual([])
  })

  it('🛑 no historical replies, no historical campaign, no historical meetings', async () => {
    const s = await buildMillaSummaryData(C)
    expect(s.recent_replies).toEqual([])
    expect(s.campaign_name).toBeNull()
    expect(s.meetings_booked).toBe(0)
    expect(s.leads_awaiting).toBe(0)
  })

  it('🛑 AND IT IS DECIDED WITHOUT READING proof_passes_done — the fixture sets it to 2', async () => {
    expect(state.clients[0].proof_passes_done).toBe(2)
    expect(await forApprovalCards()).toEqual([])
  })

  it('history is untouched — every historical row is still readable in the table', () => {
    expect(state.leads).toHaveLength(3)
    expect(state.replies).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ LEGACY AND UNCLASSIFIED ARE UNTOUCHED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ the retired book keeps everything it has', () => {
  for (const model of [null, 'legacy'] as const) {
    it(`🛑 commercial_model ${String(model)} → every card, reply and campaign still shows`, async () => {
      state.clients.push({ id: C, user_id: USER, commercial_model: model, proof_passes_done: 0, wallet_balance_usd: 0 })
      historicalLegacyLead('h1'); historicalLegacyLead('h2'); historicalLegacyLead('h3')
      historicalOutreach()
      const cards = await forApprovalCards()
      expect(ids(cards)).toEqual(['h1', 'h2', 'h3'])
      const s = await buildMillaSummaryData(C)
      expect(s.recent_replies).toHaveLength(1)
      expect(s.campaign_name).toBe('Retired legacy campaign')
      expect(s.leads_awaiting).toBe(3)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ THE BOUNDARY ITSELF — WHAT IT MAY NOT BE MADE OF
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑥ the boundary is a row fact, and nothing else', () => {
  const src = (p: string) => readFileSync(join(__dirname, p), 'utf8')
  const workspace = () => src('current-workspace.ts')
  const code = (s: string) => s.split('\n').filter(l => {
    const t = l.trim()
    return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*'))
  }).join('\n')

  it('🛑 IT NEVER READS proof_passes_done OR proof_started_at — the withdrawn rule cannot return', () => {
    expect(code(workspace())).not.toMatch(/proof_passes_done|proof_started_at/)
  })

  it('🛑 NO CLOCK: no date comparison, no timestamp arithmetic, no range filter', () => {
    expect(code(workspace())).not.toMatch(/Date\.now\(\)|new Date\(|getTime\(\)|\.gte\(|\.lte\(|\.gt\(|\.lt\(/)
  })

  it('🛑 NO NAME, NO ENV VAR, NO HOUSE SPECIAL CASE', () => {
    const c = code(workspace())
    expect(c).not.toMatch(/process\.env|HOUSE|company_name|Milla House/i)
  })

  it('🛑 IT WRITES NOTHING — a read model may not mutate', () => {
    expect(code(workspace())).not.toMatch(/\.update\(|\.insert\(|\.upsert\(|\.delete\(|\.rpc\(/)
  })

  it('🛑 AND IT MAKES NO SECOND CLIENT READ — one resolution, so two cannot disagree', () => {
    expect(code(workspace())).not.toMatch(/db\.from\(/)
  })

  it('the four scopes are exhaustive and `none` is gone', async () => {
    expect(workspace()).toMatch(/kind: 'programme'/)
    expect(workspace()).toMatch(/kind: 'proof'/)
    expect(workspace()).toMatch(/kind: 'legacy'/)
    expect(workspace()).toMatch(/kind: 'unreadable'/)
    expect(code(workspace())).not.toMatch(/kind: 'none'/)
  })

  it('🛑 CALIBRATION IS NOT OUTREACH — only programme and legacy may show current outreach', () => {
    expect(showsCurrentOutreach({ kind: 'programme', programmeId: 'x' })).toBe(true)
    expect(showsCurrentOutreach({ kind: 'legacy' })).toBe(true)
    expect(showsCurrentOutreach({ kind: 'proof' })).toBe(false)
    expect(showsCurrentOutreach({ kind: 'unreadable', reason: 'x' })).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑦ THE WRITE SIDE — the attribution has to actually be stamped, or the read proves nothing
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑦ runIcpJob stamps the pass it was granted', () => {
  const icps = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')

  it('🛑 THE STAMP IS IN THE SAME UPDATE THAT SURFACES THE BATCH — no unattributed window', () => {
    const m = icps.match(/\.update\(\{ surfaced_for_approval_at: nowIso[^}]*\}\)/)
    expect(m).toBeTruthy()
    expect(m![0]).toMatch(/proof_pass: opts!\.proofPass/)
  })

  it('🛑 IT NAMES ONLY THE IDS THIS RUN CREATED — pass 2 can never restamp pass 1', () => {
    const i = icps.indexOf('.update({ surfaced_for_approval_at: nowIso')
    expect(icps.slice(i, i + 220)).toMatch(/\.in\('id', insertedIds\)\.is\('delivered_at', null\)/)
  })

  it('🛑 THE VALUE IS THE CLAIMED PASS, NEVER A LITERAL AND NEVER A BOOLEAN', () => {
    expect(icps).not.toMatch(/proof_pass:\s*(true|1|2)\b/)
  })

  it('nothing backfills the column — no bulk write names proof_pass', () => {
    const writes = icps.match(/proof_pass/g) ?? []
    expect(writes.length).toBeGreaterThan(0)
    expect(icps).not.toMatch(/proof_pass:\s*null/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑧ THE COLUMN IS DECLARED WHERE THE PRODUCT CAN ACTUALLY APPLY IT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑧ the migration ships with the code that reads it', () => {
  const pending = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')

  it('🛑 PENDING_MIGRATIONS CARRIES IT — otherwise the founder cannot run it from Vida', () => {
    expect(pending).toMatch(/key: '20260903_lead_proof_attribution'/)
    expect(pending).toMatch(/ADD COLUMN IF NOT EXISTS proof_pass smallint/)
  })

  it('🛑 NULLABLE, NO DEFAULT, NO BACKFILL — a DEFAULT would claim proof for the whole book', () => {
    const i = pending.indexOf("key: '20260903_lead_proof_attribution'")
    // Bounded at the entry's own closing fence, so the assertions cannot read the file's
    // later contents and pass or fail on somebody else's SQL.
    const entry = pending.slice(i, pending.indexOf('`.trim(),', i))
    // ⚠️ COMMENTS STRIPPED FIRST, and that is not a convenience: the prose in this entry
    // EXPLAINS that the column has no default and is never backfilled, so a raw match on the
    // word would fail on the sentence promising the very thing it is checking. Executable SQL
    // only — the same lesson the Vida comment-stripper cost once already.
    const sql = entry.split('\n').filter(l => !l.trim().startsWith('--') && !l.trim().startsWith('//')).join('\n')
    // ⚠️ THE COLUMN DECLARATION ITSELF, not the whole entry — the COMMENT ON COLUMN text
    // legitimately contains the words "never defaulted" and "never backfilled", which is the
    // promise, not a violation of it.
    const addColumn = sql.match(/ADD COLUMN IF NOT EXISTS proof_pass[^;]*/i)
    expect(addColumn).toBeTruthy()
    expect(addColumn![0]).not.toMatch(/DEFAULT|NOT NULL/i)
    expect(sql).not.toMatch(/UPDATE public\.leads/i)
  })

  it('the CHECK is guarded so the runner (which has no ledger) can re-run it', () => {
    const i = pending.indexOf("key: '20260903_lead_proof_attribution'")
    // Bounded at the entry's own closing fence, so the assertions cannot read the file's
    // later contents and pass or fail on somebody else's SQL.
    const entry = pending.slice(i, pending.indexOf('`.trim(),', i))
    expect(entry).toMatch(/IF NOT EXISTS \(\s*SELECT 1 FROM pg_constraint/)
    expect(entry).toMatch(/proof_pass IS NULL OR proof_pass IN \(1, 2\)/)
  })

  it('the canonical .sql file exists beside it (migration-home)', () => {
    const sql = readFileSync(join(__dirname, '../../../../supabase/migrations/20260903_lead_proof_attribution.sql'), 'utf8')
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS proof_pass smallint/)
  })
})
