// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CLEAN BASELINE STILL TOLD THREE LIES — and none of them was invented copy
//
// ── THE FOUNDER'S SCREENSHOT, AFTER #1636 WORKED ────────────────────────────────────────
//
// The historical isolation landed and was visually confirmed: House's three retired prospect
// cards gone, its historical reply gone, Stage `Proof`, Outcome not set, Progress 0. Then the
// same screen said:
//
//     "No matches this time"
//     "Sourcing capacity is temporarily out — the team has been alerted and your credits
//      are untouched. Try again shortly."
//
// 🛑 THREE FALSE CLAIMS IN ONE CARD, ON AN ACCOUNT WITH NO CURRENT SOURCING RUN AT ALL: a
// search that failed, a provider outage, and credits — from a wallet the programme model does
// not have. Every word of it is the server's own canonical, founder-approved sentence for a
// run that genuinely was refused. **An honest sentence about a past run becomes a lie the
// moment it is presented as the present.**
//
// ── THE CAUSE: THE ONE READ THE C2 SWEEP MISSED ─────────────────────────────────────────
//
// `proof_run` reads the newest `icp_run_outcomes` row CLIENT-SCOPED, with no workspace
// boundary — the same `if (!programmeId) return everything()` shape #1636 removed from the
// cards, the replies, the campaign and the meeting counts. It was the last one holding it.
//
// And the desk's own guard failed open on top of it: `finishedAt >= serverProofStartedAt`,
// where a missing stamp reads 0, so `finishedAt >= 0` is true of every row ever written.
//
// ── AND A FOURTH, WHICH IS A GAP RATHER THAN A BOUNDARY ─────────────────────────────────
//
// Milla wrote *"Right now (Proof): we're showing you a small masked set of real people"* to a
// client looking at an empty desk. That is a faithful reading of lifecycle step 1 — she was
// told the STAGE and nothing about the SCREEN, so she had no fact with which to say otherwise.
// The fix is the missing fact, not a longer prohibition: she cannot be banned into knowing
// something she was never given.
//
// ⚠️ WHAT IS **NOT** TOUCHED HERE: #1636's attribution logic, free-proof sourcing behaviour,
// the visual design, and every genuine failure message where it is factually true.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: {
  clients: Row[]; leads: Row[]; programmes: Row[]; replies: Row[]
  meetings: Row[]; campaigns: Row[]; icps: Row[]; outcomes: Row[]; txs: Row[]
} = { clients: [], leads: [], programmes: [], replies: [], meetings: [], campaigns: [], icps: [], outcomes: [], txs: [] }

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

import { buildMillaSummaryData } from './milla-summary'
import { describeOutcomes, LIFECYCLE_RULES } from './milla-chat-system'

const C = 'c-house-like'
const P_NEW = 'P_NEW'

/**
 * The exact outcome row on House's account: a run that genuinely WAS refused, long ago, and
 * whose sentence names a wallet the programme model does not have.
 */
function historicalQuotaOutcome(at = '2026-07-14T09:00:00.000Z') {
  state.outcomes.push({
    id: 'o-old', client_id: C, icp_id: 'icp-old', status: 'quota_exhausted',
    total_inserted: 0, records_requested: 200, pool_served: 0,
    message: 'Sourcing capacity is temporarily out — the team has been alerted and your credits are untouched. Try again shortly.',
    created_at: at,
  })
}
function historicalLegacyLead(id: string) {
  state.leads.push({
    id, client_id: C, programme_id: null, proof_pass: null,
    delivered_at: '2026-02-01T00:00:00.000Z', surfaced_for_approval_at: '2026-02-01T00:00:00.000Z',
    revealed_at: null, status: 'scored', score: 50, created_at: '2026-02-01T00:00:00.000Z',
  })
}
function proofLead(id: string, pass: 1 | 2, at: string) {
  state.leads.push({
    id, client_id: C, programme_id: null, proof_pass: pass,
    delivered_at: at, surfaced_for_approval_at: at,
    revealed_at: null, status: 'scored', score: 80, created_at: at,
  })
}
function declaredProgrammeClient(over: Row = {}) {
  state.clients.push({
    id: C, user_id: 'u-1', commercial_model: 'programme',
    proof_passes_done: 0, proof_started_at: null, wallet_balance_usd: 0, plan: 'lead_gen', ...over,
  })
}

beforeEach(() => {
  state.clients = []; state.leads = []; state.programmes = []; state.replies = []
  state.meetings = []; state.campaigns = []; state.icps = []; state.outcomes = []; state.txs = []
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// A. PROGRAMME CLIENT · NO PROGRAMME · ZERO PROOF CARDS → NEUTRAL, NOT A FAILURE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('A. the clean baseline is neutral, not a failure report', () => {
  beforeEach(() => {
    declaredProgrammeClient()
    historicalLegacyLead('h1'); historicalLegacyLead('h2'); historicalLegacyLead('h3')
    historicalQuotaOutcome()
  })

  it('🛑 NO SOURCING FAILURE IS REPORTED — there is no current run to report on', async () => {
    const s = await buildMillaSummaryData(C)
    expect(s.proof_run, 'a months-old outcome is not the present').toBeNull()
  })

  it('🛑 NO PROVIDER-CAPACITY CLAIM, AND NO CREDIT WORDING, REACHES THE CLIENT', async () => {
    const s = await buildMillaSummaryData(C)
    const spoken = JSON.stringify({ run: s.proof_run, campaign: s.campaign_name, status: s.campaign_status })
    for (const word of ['Sourcing capacity', 'credits', 'wallet', 'top up', 'No matches']) {
      expect(spoken.toLowerCase(), `the empty baseline must not mention ${word}`).not.toContain(word.toLowerCase())
    }
  })

  it('🛑 AND THE DESK IS GENUINELY EMPTY — this is not a failure being hidden by a filter', async () => {
    const s = await buildMillaSummaryData(C)
    expect(s.leads_awaiting).toBe(0)
    expect(s.calibration_set_on_desk).toBe(false)
    // #1636's isolation, unchanged: the three historical rows are still in the table.
    expect(state.leads).toHaveLength(3)
  })

  it('🛑 MILLA IS TOLD THE DESK IS EMPTY — the fact she was missing', async () => {
    const s = await buildMillaSummaryData(C)
    const block = describeOutcomes(s)
    expect(block).toContain('THEIR DESK IS EMPTY RIGHT NOW')
    expect(block, 'and she is told not to describe a set').toMatch(/Do NOT[\s\S]*showing them people/)
  })

  it('🛑 AND THE RULE IS RE-ASSERTED WHERE SHE READS IT LAST', () => {
    const joined = LIFECYCLE_RULES.join('\n')
    expect(joined).toContain('NEVER SAY A CALIBRATION SET IS CURRENTLY VISIBLE')
    expect(joined, 'stage is not screen').toMatch(/NOT what is on their screen right now/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// B. A LEGITIMATE FREE-PROOF SET → EVERYTHING STILL WORKS
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('B. a real proof set is unaffected', () => {
  beforeEach(() => {
    declaredProgrammeClient({ proof_passes_done: 1, proof_started_at: '2026-09-03T09:00:00.000Z' })
    historicalLegacyLead('h1')
    proofLead('p1', 1, '2026-09-03T10:00:00.000Z')
    proofLead('p2', 1, '2026-09-03T10:00:00.000Z')
  })

  it('the cards are on the desk and the flag says so', async () => {
    const s = await buildMillaSummaryData(C)
    expect(s.leads_awaiting).toBe(2)
    expect(s.calibration_set_on_desk).toBe(true)
  })

  it('🛑 MILLA MAY DESCRIBE THE SET, because this time there is one', async () => {
    const s = await buildMillaSummaryData(C)
    expect(describeOutcomes(s)).toContain('Their desk currently HAS people on it')
    expect(describeOutcomes(s)).not.toContain('THEIR DESK IS EMPTY')
  })

  it('🛑 AND THE HISTORICAL CARD IS STILL EXCLUDED — #1636 is untouched', async () => {
    const s = await buildMillaSummaryData(C)
    expect(s.leads_awaiting, 'the legacy row must not come back').toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// C. A REAL RUN, ON A REAL SESSION → THE GENUINE MESSAGE STILL APPEARS
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('C. a genuine failure is still reported', () => {
  it('🛑 NON-VACUOUS: a prospect WITH a claimed session still gets the run outcome', async () => {
    declaredProgrammeClient({ proof_passes_done: 1, proof_started_at: '2026-09-03T09:00:00.000Z' })
    state.outcomes.push({
      id: 'o-now', client_id: C, icp_id: 'icp-1', status: 'quota_exhausted', total_inserted: 0,
      records_requested: 20, pool_served: 0,
      message: 'Sourcing capacity is temporarily out — the team has been alerted and your credits are untouched. Try again shortly.',
      created_at: '2026-09-03T09:05:00.000Z',
    })
    const s = await buildMillaSummaryData(C)
    expect(s.proof_run, 'a real failure must NOT be suppressed').not.toBeNull()
    expect(s.proof_run!.status).toBe('quota_exhausted')
    expect(s.proof_run!.message).toContain('Sourcing capacity is temporarily out')
  })

  it('🛑 A LEGACY CLIENT KEEPS ITS RUN OUTCOME EXACTLY AS BEFORE', async () => {
    state.clients.push({ id: C, user_id: 'u-1', commercial_model: 'legacy', proof_passes_done: 0, proof_started_at: null, wallet_balance_usd: 0 })
    historicalQuotaOutcome()
    const s = await buildMillaSummaryData(C)
    expect(s.proof_run, 'legacy is untouched by this correction').not.toBeNull()
  })

  it('🛑 A CRASHED RUN STILL REACHES A PROSPECT WITH A SESSION', async () => {
    declaredProgrammeClient({ proof_passes_done: 1, proof_started_at: '2026-09-03T09:00:00.000Z' })
    state.outcomes.push({
      id: 'o-fail', client_id: C, icp_id: 'icp-1', status: 'failed', total_inserted: 0,
      records_requested: 20, pool_served: 0, message: 'We hit a snag confirming your matches',
      created_at: '2026-09-03T09:05:00.000Z',
    })
    const s = await buildMillaSummaryData(C)
    expect(s.proof_run!.status).toBe('failed')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// D. AN ACTIVE PROGRAMME IS UNAFFECTED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('D. programme clients are untouched', () => {
  it('🛑 A PROGRAMME CLIENT STILL READS ITS RUN OUTCOME — nothing was narrowed for them', async () => {
    declaredProgrammeClient()
    state.programmes.push({
      id: P_NEW, client_id: C, status: 'SOURCING', meeting_target: 10,
      first_paid_at: 'p1', second_paid_at: null, approved_at: null, went_live_at: null,
      paused_at: null, review_required_at: null, review_resolved_at: null,
      price_total_cents: 100000, sourcing_ceiling: 2500, sourced_used: 0,
    })
    historicalQuotaOutcome()
    const s = await buildMillaSummaryData(C)
    expect(s.proof_run, 'the programme case is deliberately unchanged').not.toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// E. #1636's ISOLATION IS INTACT, AND F/G — THE THINGS THAT MUST NOT HAVE MOVED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('E. the attribution boundary is not touched by this correction', () => {
  const API = join(__dirname, '..')
  const src = (p: string) => readFileSync(join(API, p), 'utf8')

  it('🛑 THE BOUNDARY MODULE IS UNCONCERNED WITH THIS FIX', () => {
    // ⚠️ EXECUTABLE LINES ONLY. The resolver's header NAMES `icp_run_outcomes` — it is part of
    // the recorded trace of every store that could not attribute a lead — and prose about a
    // table is not a read of it. A raw match would fail on the explanation itself, which is
    // the comment-stripper lesson this repo has already paid for once.
    const code = src('lib/current-workspace.ts').split('\n')
      .filter(l => { const t = l.trim(); return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) }).join('\n')
    expect(code, 'the resolver must not learn about run outcomes').not.toContain('icp_run_outcomes')
    expect(code, 'and it still reads nothing but the model').not.toContain('db.from(')
  })

  it('🛑 THE READER AND THE WRITER ARE UNCHANGED', () => {
    expect(src('routes/leads.ts')).toContain("if (scope.kind === 'proof') q = q.not('proof_pass', 'is', null)")
    expect(src('routes/icps.ts')).toContain('proof_pass: opts!.proofPass')
  })

  it('🛑 FREE-PROOF SOURCING BEHAVIOUR IS UNCHANGED — no gate, cap or fence moved', () => {
    const icps = src('routes/icps.ts')
    expect(icps).toContain('const proofMode = (opts?.proofPass ?? 0) > 0')
    expect(icps).toContain('try_claim_proof_pass')
    expect(icps).toContain('This account is already live — proof batches are only for new prospects.')
  })

  it('🛑 THE CORRECTION WRITES NOTHING — no row is updated, deleted or backfilled', () => {
    const summary = src('lib/milla-summary.ts')
    for (const w of ['.update(', '.insert(', '.delete(', '.upsert(']) {
      expect(summary, `milla-summary is a read model: ${w}`).not.toContain(w)
    }
  })

  it('🛑 TENANCY — every read in the corrected file is still client-scoped', async () => {
    // A second client's rows must not reach the first, whatever the scope resolves to.
    declaredProgrammeClient()
    state.clients.push({ id: 'other', user_id: 'u-2', commercial_model: 'legacy', proof_passes_done: 0, wallet_balance_usd: 0 })
    state.outcomes.push({
      id: 'o-other', client_id: 'other', icp_id: 'icp-x', status: 'served', total_inserted: 9,
      records_requested: 9, pool_served: 9, message: 'Sourced 9 leads.', created_at: '2026-09-03T11:00:00.000Z',
    })
    state.leads.push({
      id: 'l-other', client_id: 'other', programme_id: null, proof_pass: 1,
      delivered_at: 'd', surfaced_for_approval_at: 's', revealed_at: null, status: 'scored',
    })
    const s = await buildMillaSummaryData(C)
    expect(s.proof_run, "another client's run is not this client's").toBeNull()
    expect(s.leads_awaiting, "another client's proof card is not on this desk").toBe(0)
  })
})
