import { describe, it, expect, vi, beforeEach } from 'vitest'

// ROUTE-LEVEL, on purpose — the same reason `approve-batch.route.test.ts` is.
//
// The defect this pins could not be seen from any unit test: `classifyReply` is correct,
// `findLeadMatches` is correct, and the reply spine has 21 passing tests. The bug was in the
// SHAPE of the route — an LLM call sitting inside a loop that R1 had just introduced.
//
// So this drives the real Express handler with a real webhook body and asserts on what the
// route actually did. Any future edit that moves the classifier back inside the loop fails
// here.

const state = {
  leadMatches: [] as Array<{ id: string; client_id: string }>,
  classifyCalls: 0,
  replyInserts: [] as Record<string, unknown>[],
}

function query(table: string) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'not', 'is', 'neq', 'order', 'limit', 'gte']) q[m] = () => q
  q.then = (resolve: (v: unknown) => void) => {
    if (table === 'leads') return resolve({ data: state.leadMatches, error: null })
    return resolve({ data: [], error: null })
  }
  q.maybeSingle = async () => ({ data: table === 'figsy_enrollments' ? { id: 'enr-1', campaign_id: 'camp-1' } : null, error: null })
  q.single = async () => ({ data: { id: `reply-${state.replyInserts.length}` }, error: null })
  q.insert = (row: Record<string, unknown>) => {
    if (table === 'figsy_replies') state.replyInserts.push(row)
    return q
  }
  q.update = () => q
  q.upsert = async () => ({ error: null })
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t) } }))
// The route file imports the auth middleware, which builds a Supabase client at module load
// and needs env vars this suite deliberately does not have.
vi.mock('../middleware/auth', () => ({
  requireAuth: (_q: unknown, _s: unknown, n: () => void) => n(),
}))
vi.mock('../lib/rate-limit', () => ({ rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n() }))

// The LLM call. Counting it IS the test.
vi.mock('../lib/figsy', () => ({
  classifyReply: vi.fn(async () => { state.classifyCalls++; return { classification: 'warm', reasoning: 'r' } }),
  isRiskyReply: () => false,
  recomputeCampaignCounters: vi.fn(async () => {}),
  // The route imports many names from this module at load time; they must exist.
  generateSequence: vi.fn(), getClientKnowledgeForOutreach: vi.fn(), sendSequenceEmail: vi.fn(),
  enrollmentStep: vi.fn(), autoEnrollLead: vi.fn(), applyReplyBranching: vi.fn(),
  campaignReadyLeadIds: vi.fn(), personalizationSignals: vi.fn(),
  chargeFigsyEnroll: vi.fn(), refundFigsyEnroll: vi.fn(),
}))
vi.mock('../lib/outcomes', () => ({ logOutcomeEvent: vi.fn(async () => {}) }))
vi.mock('../lib/push', () => ({ sendPushToClient: vi.fn(async () => {}) }))
vi.mock('../lib/crm', () => ({ pushDealToCrm: vi.fn(async () => ({ success: false })) }))
vi.mock('../lib/hubspot', () => ({ syncFigsyInterestedToHubspot: vi.fn(async () => {}) }))
vi.mock('./signals', () => ({ emitSignal: vi.fn(async () => {}), default: {} }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: vi.fn(async () => {}) }))
vi.mock('../lib/webhook-idempotency', () => ({ isDuplicateWebhookEvent: vi.fn(async () => false) }))

import { figsyRouter } from './figsy'

async function postReply(body: Record<string, unknown>) {
  const layer = (figsyRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/replies/inbound' && l.route?.methods.post)
  if (!layer?.route) throw new Error('route not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: Record<string, unknown> = { statusCode: 0, payload: null }
  res.status = (c: number) => { res.statusCode = c; return res }
  res.json = (p: unknown) => { res.payload = p; return res }
  await handler(
    { body: Buffer.from(JSON.stringify(body)), headers: { 'x-webhook-secret': 'test-secret' }, params: {} },
    res, () => {},
  )
  return res as { statusCode: number; payload: { clients?: number } }
}

beforeEach(() => {
  process.env.RESEND_WEBHOOK_SECRET = 'test-secret'
  state.leadMatches = []
  state.classifyCalls = 0
  state.replyInserts.length = 0
})

const REPLY = { from: 'Thabo <thabo@acme.com>', subject: 'Re: hello', text: 'Sounds interesting, tell me more.' }

describe('a reply matching TWO clients', () => {
  beforeEach(() => {
    state.leadMatches = [
      { id: 'lead-a', client_id: 'client-1' },
      { id: 'lead-b', client_id: 'client-2' },
    ]
  })

  it('classifies ONCE, not once per client', async () => {
    // The defect. Two LLM calls on identical input cost twice AND can disagree — the same
    // email coming back `hot` for one client and `warm` for the other, so one gets the
    // founder alert and the CRM deal and the other does not.
    await postReply(REPLY)
    expect(state.classifyCalls).toBe(1)
  })

  it('still lands in BOTH clients threads — R1 is not undone by the fix', async () => {
    await postReply(REPLY)
    expect(state.replyInserts).toHaveLength(2)
    expect(state.replyInserts.map(r => r.client_id).sort()).toEqual(['client-1', 'client-2'])
  })

  it('both clients get the SAME classification — they cannot disagree any more', async () => {
    await postReply(REPLY)
    const classes = [...new Set(state.replyInserts.map(r => r.classification))]
    expect(classes).toHaveLength(1)
  })

  it('reports how many clients it fanned out to', async () => {
    const r = await postReply(REPLY)
    expect(r.payload.clients).toBe(2)
  })
})

describe('the ordinary single-client reply is unchanged', () => {
  it('classifies once and inserts once', async () => {
    state.leadMatches = [{ id: 'lead-a', client_id: 'client-1' }]
    await postReply(REPLY)
    expect(state.classifyCalls).toBe(1)
    expect(state.replyInserts).toHaveLength(1)
  })
})

describe('an unmatched reply never reaches the classifier', () => {
  it('does not spend an LLM call on a stranger', async () => {
    // The lookup runs before the classifier, so an address we do not know costs nothing.
    state.leadMatches = []
    await postReply(REPLY)
    expect(state.classifyCalls).toBe(0)
    expect(state.replyInserts).toHaveLength(0)
  })
})
