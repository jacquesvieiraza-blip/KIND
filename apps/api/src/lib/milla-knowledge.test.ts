// ═══════════════════════════════════════════════════════════════════════════
// MILLA'S UNDERSTANDING REACHES FIGSY — AND ONLY THE PERMITTED PART OF IT.
//
// Two separate promises are under test here, and they pull in opposite directions:
//
//   1. What the client tells Milla must NOT be thrown away. Before this, the onboarding
//      conversation produced an ICP and nothing else, so FIGSY wrote every cold email with
//      no idea what the client sells — while we sold them "personal onboarding".
//
//   2. Knowing something is not permission to SAY it. Milla may learn a named customer or a
//      specific result from the client's own words or their website. None of it may reach an
//      outbound email unless the client explicitly approved that claim.
//
// The mechanism is deliberately not a filter at send time. Permitted claims are written into
// `differentiators` — the one field `getClientKnowledgeForOutreach` surfaces — and everything
// else is parked in `proof_all`, which the outreach digest never reads. An unapproved claim
// is not blocked on its way out; it is never in the room.
//
// Mocks only. No provider, no database, no network.
// ═══════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Upsert = { client_id: string; kind: string; data: Record<string, unknown> }

/** Drives the real POST /icps handler and captures what it wrote. */
async function createIcp(body: Record<string, unknown>) {
  const upserts: Upsert[] = []
  const campaignUpdates: Array<Record<string, unknown>> = []
  const clientUpdates: Array<Record<string, unknown>> = []
  const icpUpdates: Array<Record<string, unknown>> = []

  vi.resetModules()

  vi.doMock('@kind/db', () => {
    const makeQuery = (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'or', 'gte', 'lte']) q[m] = () => q
      q.limit = () => q
      q.single = async () => ({
        data: table === 'icps' ? { id: 'icp-1', name: 'Test ICP' }
            : table === 'clients' ? { id: 'c1', credit_balance: 0, user_id: 'u1' }
            : null,
        error: null,
      })
      q.maybeSingle = async () => ({
        data: table === 'clients' ? { id: 'c1' }
            : table === 'icps' ? { id: 'icp-1' }
            : null,
        error: null,
      })
      q.upsert = async (row: Upsert) => { if (table === 'figsy_knowledge') upserts.push(row); return { error: null } }
      q.update = (patch: Record<string, unknown>) => {
        if (table === 'figsy_campaigns') campaignUpdates.push(patch)
        if (table === 'clients') clientUpdates.push(patch)
        if (table === 'icps') icpUpdates.push(patch)
        const chain: Record<string, unknown> = {}
        for (const m of ['eq', 'in', 'is', 'neq']) chain[m] = () => chain
        // ⚠️ `.select()` on an UPDATE — POST /icps now UPDATES the client's one core ICP
        // instead of always inserting (integration fix), and reads the row back. Without
        // this the handler threw and the route answered 500.
        ;(chain as { select: unknown }).select = () => ({
          single: async () => ({ data: { id: 'icp-1', name: 'Test ICP', ...patch }, error: null }),
        })
        ;(chain as { then: unknown }).then = (r: (v: unknown) => void) => r({ error: null })
        return chain
      }
      q.insert = () => ({
        select: () => ({ single: async () => ({ data: { id: 'icp-1', name: 'Test ICP' }, error: null }) }),
        then: (r: (v: unknown) => void) => r({ error: null }),
      })
      q.then = (r: (v: unknown) => void) => r({ data: [], count: 0, error: null })
      return q
    }
    return {
      db: {
        from: (t: string) => makeQuery(t),
        rpc: async () => ({ data: null, error: null }),
        auth: { admin: {
          listUsers: async () => ({ data: { users: [] }, error: null }),
          getUserById: async () => ({ data: { user: { email: '' } }, error: null }),
        } },
      },
    }
  })
  vi.doMock('../lib/start-work', () => ({
    ensureCampaignForIcp: async () => ({ id: 'camp-1' }),
    startWorkForClient: async () => ({ started: false, sourced: 0, surfaced: 0, recommended: 0 }),
  }))

  const mod = await import('../routes/icps')
  const layer = (mod.icpRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/' && l.route?.methods?.post)
  const handler = layer!.route.stack[layer!.route.stack.length - 1].handle
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(c: number) { this.statusCode = c; return this },
    json(b: unknown) { this.body = b; return this },
  }
  await handler({ body, userId: 'u1', headers: {} }, res)
  return { upserts, campaignUpdates, clientUpdates, icpUpdates, res }
}

const prev = { anthropic: process.env.ANTHROPIC_API_KEY, url: process.env.SUPABASE_URL, anon: process.env.SUPABASE_ANON_KEY }
const ICP = {
  name: 'SA SaaS CTOs', industries: ['SaaS'], job_titles: ['CTO'],
  seniority_levels: [], company_sizes: [], geographies: [], tech_stack: [], keywords: [],
}

describe('Milla onboarding → FIGSY grounding', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('../lib/start-work'); vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('what the client said about their business is STORED, not discarded', async () => {
    const { upserts } = await createIcp({
      ...ICP,
      business: {
        product: 'Fleet maintenance software', pitch: 'Fewer trucks off the road',
        pain_points: 'Unplanned breakdowns', differentiators: 'Installs in a day',
        tone: 'Direct and warm', bad_fit: 'Owner-operators with one vehicle',
      },
    })
    const pitch = upserts.find(u => u.kind === 'pitch')
    expect(pitch).toBeTruthy()
    expect(pitch!.data.product).toBe('Fleet maintenance software')
    expect(pitch!.data.pain_points).toBe('Unplanned breakdowns')
    const messaging = upserts.find(u => u.kind === 'messaging')
    expect(messaging!.data.style).toBe('Direct and warm')
  })

  it('AN UNPERMITTED CLAIM NEVER REACHES THE FIELD FIGSY READS', async () => {
    const { upserts } = await createIcp({
      ...ICP,
      business: { product: 'X', pitch: '', pain_points: '', differentiators: 'Installs in a day', tone: '', bad_fit: '' },
      proof: [
        { claim: 'Cut downtime 40% for Blue Arrow Logistics', permitted: false },
        { claim: 'ISO 9001 certified', permitted: true },
      ],
    })
    const pitch = upserts.find(u => u.kind === 'pitch')!
    const diff = String(pitch.data.differentiators)
    expect(diff).toContain('ISO 9001 certified')          // approved → usable
    expect(diff).not.toContain('Blue Arrow')              // not approved → never in the room
    expect(diff).not.toContain('40%')
    // …but it IS recorded, so an operator can see it and ask.
    expect(JSON.stringify(pitch.data.proof_all)).toContain('Blue Arrow')
  })

  it('permission must be explicitly true — anything else is not permission', async () => {
    const { upserts } = await createIcp({
      ...ICP,
      business: { product: 'X', pitch: '', pain_points: '', differentiators: '', tone: '', bad_fit: '' },
      proof: [
        { claim: 'Truthy string', permitted: 'yes' },
        { claim: 'Number one', permitted: 1 },
        { claim: 'Missing flag' },
      ],
    })
    const diff = String(upserts.find(u => u.kind === 'pitch')!.data.differentiators)
    expect(diff).toBe('')   // none of the three counted as permission
  })

  it('the campaign carries what this batch is for', async () => {
    const { campaignUpdates } = await createIcp({
      ...ICP,
      business: { product: 'X', pitch: '', pain_points: '', differentiators: '', tone: '', bad_fit: '' },
      campaign_intent: 'Get people to the 3 September launch webinar',
    })
    const intent = campaignUpdates.find(u => 'campaign_intent' in u)
    expect(intent!.campaign_intent).toBe('Get people to the 3 September launch webinar')
    expect(intent).toHaveProperty('intent_mapped_at')
  })

  it('an ICP with no business talk writes NOTHING rather than an empty shell', async () => {
    const { upserts, campaignUpdates } = await createIcp({ ...ICP })
    expect(upserts).toHaveLength(0)
    expect(campaignUpdates).toHaveLength(0)
  })

  it('THE ICP STILL SAVES EVEN IF THE GROUNDING CANNOT BE WRITTEN', async () => {
    // Grounding is best-effort on purpose: FIGSY's documented empty state is "generic, never
    // invented", which is a far better outcome than failing an ICP the client just approved.
    const { res } = await createIcp({
      ...ICP,
      business: { product: 'X', pitch: '', pain_points: '', differentiators: '', tone: '', bad_fit: '' },
    })
    expect(res.statusCode).toBe(201)
    expect((res.body as { success: boolean }).success).toBe(true)
  })
})

// ── ROUND 4 — "YES, THIS REPRESENTS US" IS A RECORDED FACT ────────────────────
//
// The reflect-back panel existed and the client's confirmation of it did not: pressing the
// button persisted the understanding and left NO trace that the client had said "this
// represents us". If a client later disputed what FIGSY wrote from, nothing could show
// they confirmed the understanding it was written from. Found in review.
//
// The record is ONE nullable timestamp on the client row — an auditable fact, and
// deliberately NOT a gate: nothing reads it before activation, generation or sending.
describe('the reflect-back confirmation is recorded', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('../lib/start-work'); vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('CONFIRMING AN UNDERSTANDING STAMPS milla_understanding_confirmed_at', async () => {
    const { clientUpdates } = await createIcp({
      ...ICP,
      business: { product: 'Fleet software', pitch: '', pain_points: '', differentiators: '', tone: '', bad_fit: '' },
    })
    const stamp = clientUpdates.find(u => 'milla_understanding_confirmed_at' in u)
    expect(stamp, 'the confirmation left no record').toBeTruthy()
    expect(typeof stamp!.milla_understanding_confirmed_at).toBe('string')
  })

  it('an ICP saved with NO understanding stamps nothing — there was nothing to confirm', async () => {
    // The panel only renders when Milla learned something; without it the client never made
    // the "this represents us" statement, so recording one would be inventing evidence.
    const { clientUpdates } = await createIcp({ ...ICP })
    expect(clientUpdates.filter(u => 'milla_understanding_confirmed_at' in u)).toHaveLength(0)
  })

  it('THE SHIPPED MIGRATION CARRIES THE COLUMN, IN BOTH HOMES', () => {
    const { readFileSync } = require('fs') as typeof import('fs')
    const { join } = require('path') as typeof import('path')
    for (const p of [
      '../../../../supabase/migrations/20260822_free_proof_acquisition.sql',
      './pending-migrations.ts',
    ]) {
      expect(readFileSync(join(__dirname, p), 'utf8')).toContain('milla_understanding_confirmed_at')
    }
  })
})

// ── ONE CORE ICP — THE CLIENT'S SAVE REFINES, IT DOES NOT MULTIPLY ────────────
//
// Milla's save always INSERTED, so the refinement between proof pass 1 and pass 2 produced
// a SECOND ICP: a different experiment, with pass 1's leads and feedback orphaned on a row
// nothing looked at again. The client's first ICP is still created; every later save
// updates it. Identity is the point — `leads.icp_id`, the campaign's `icp_id` and the PDL
// cursor all hang off `icp.id`.
describe('one core ICP — the client refines, never multiplies', () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_ANON_KEY = 'test-anon-key'
  })
  afterEach(() => {
    vi.doUnmock('../lib/start-work'); vi.resetModules()
    process.env.ANTHROPIC_API_KEY = prev.anthropic
    process.env.SUPABASE_URL = prev.url
    process.env.SUPABASE_ANON_KEY = prev.anon
  })

  it('A CLIENT WHO ALREADY HAS AN ICP GETS AN UPDATE, NOT A SECOND ROW', async () => {
    // The harness's `icps` lookup answers with an existing row, i.e. this client has one.
    const { icpUpdates, res } = await createIcp({ ...ICP, name: 'Sharper targeting' })
    expect(res.statusCode).toBe(201)
    expect(icpUpdates, 'the refinement did not update the existing ICP').toHaveLength(1)
    expect(icpUpdates[0].name).toBe('Sharper targeting')
  })

  it('THE REFINEMENT NEVER WRITES is_active — going live stays K.I.N.D\'s', async () => {
    const { icpUpdates } = await createIcp({ ...ICP, name: 'Sharper targeting' })
    for (const patch of icpUpdates) expect('is_active' in patch).toBe(false)
  })
})
