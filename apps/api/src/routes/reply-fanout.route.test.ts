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
  // ⚑ 16 Sep (GAP 3) — the ORIGINATING-SEND EVIDENCE, served from `figsy_sent_emails`. An
  // empty list is the honest default: no evidence, so a cross-client collision fails closed.
  sentLeadIds: [] as string[],
  classifyCalls: 0,
  replyInserts: [] as Record<string, unknown>[],
}

function query(table: string) {
  const q: Record<string, unknown> = {}
  // ⛓️ 18 Sep (J22-C3) — `ilike` JOINS THE CHAIN. The lead lookup matches case-insensitively
  // now (a From header's case is not the stored case), and a method missing from this list is
  // not a no-op — it throws, and every routing assertion below fails as "lookup_failed".
  for (const m of ['select', 'eq', 'in', 'not', 'is', 'neq', 'order', 'limit', 'gte', 'ilike']) q[m] = () => q
  q.then = (resolve: (v: unknown) => void) => {
    if (table === 'leads') return resolve({ data: state.leadMatches, error: null })
    if (table === 'figsy_sent_emails') {
      return resolve({ data: state.sentLeadIds.map(id => ({ lead_id: id })), error: null })
    }
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
  state.sentLeadIds = []
  state.classifyCalls = 0
  state.replyInserts.length = 0
})

const REPLY = { from: 'Thabo <thabo@acme.com>', subject: 'Re: hello', text: 'Sounds interesting, tell me more.' }

// ⛓️ 16 Sep (GAP 3) — RE-POINTED, AND THE FOUNDER OVERRODE R1 BY NAME FOR THIS CASE.
//
// 🛑 WHAT THIS BLOCK USED TO ASSERT: that a reply matching two clients *"still lands in BOTH
// clients threads — R1 is not undone by the fix"*, and that the response *"reports how many
// clients it fanned out to"*. Both were deliberate: with one shared Resend inbox the
// prospect's address was genuinely all we had, and two clients working the same person both
// deserved to see the reply.
//
// The founder's launch-safety ruling replaces that premise: *"A reply from a prospect must
// never be copied/fanned out to multiple clients merely because multiple client lead rows
// share the same prospect email… If the system cannot determine one safe owner: FAIL CLOSED."*
//
// ⚠️ WHAT SURVIVES UNCHANGED, AND IT IS THE HALF THIS FILE WAS REALLY WRITTEN FOR:
// CLASSIFICATION HAPPENS ONCE. Two LLM calls on identical input cost twice and can disagree —
// the same email coming back `hot` for one client and `warm` for the other. That assertion is
// below and untouched.
describe('a reply matching TWO clients', () => {
  beforeEach(() => {
    state.leadMatches = [
      { id: 'lead-a', client_id: 'client-1', email: 'thabo@acme.com' },
      { id: 'lead-b', client_id: 'client-2', email: 'thabo@acme.com' },
    ]
  })

  it('classifies AT MOST ONCE — never once per client', async () => {
    // Unchanged duty. With the reply now refused for ambiguity it classifies zero times, which
    // is still "not once per client" and is the honest number: nothing was written, so nothing
    // needed classifying.
    await postReply(REPLY)
    expect(state.classifyCalls).toBeLessThanOrEqual(1)
  })

  it('🛑 LANDS IN NEITHER CLIENT\'S THREAD — it fails closed', async () => {
    await postReply(REPLY)
    expect(state.replyInserts, 'one external reply reached more than one client').toHaveLength(0)
  })

  it('🛑 AND NO TWO CLIENTS CAN EVER SHARE ONE REPLY RECORD', async () => {
    // The invariant stated directly, so it holds however the routing is later changed.
    await postReply(REPLY)
    const clients = new Set(state.replyInserts.map(r => r.client_id))
    expect(clients.size).toBeLessThanOrEqual(1)
  })

  it('the response reports the refusal rather than a fan-out count', async () => {
    const r = await postReply(REPLY) as unknown as { payload: { clients?: number; dropped?: string } }
    expect(r.payload.clients).toBeUndefined()
    expect(r.payload.dropped).toBe('ambiguous_owner')
  })
})

describe('a reply matching two clients WITH originating-send evidence', () => {
  beforeEach(() => {
    state.leadMatches = [
      { id: 'lead-a', client_id: 'client-1', email: 'thabo@acme.com' },
      { id: 'lead-b', client_id: 'client-2', email: 'thabo@acme.com' },
    ]
  })

  it('🛑 GOES ONLY TO THE CLIENT WE ACTUALLY EMAILED', async () => {
    // `figsy_sent_emails` holds a row for lead-a and none for lead-b, so client-1 is the
    // client whose outbound message this is a reply to.
    state.sentLeadIds = ['lead-a']
    await postReply(REPLY)
    expect(state.replyInserts).toHaveLength(1)
    expect(state.replyInserts[0].client_id).toBe('client-1')
  })

  it('and evidence on BOTH sides still fails closed — both have a real claim', async () => {
    state.sentLeadIds = ['lead-a', 'lead-b']
    await postReply(REPLY)
    expect(state.replyInserts).toHaveLength(0)
  })
})

describe('the ordinary single-client reply is unchanged', () => {
  it('classifies once and inserts once', async () => {
    state.leadMatches = [{ id: 'lead-a', client_id: 'client-1', email: 'thabo@acme.com' }]
    await postReply(REPLY)
    expect(state.classifyCalls).toBe(1)
    expect(state.replyInserts).toHaveLength(1)
  })

  // ⛓️ 16 Sep (GAP 3) — RE-POINTED, NOT DROPPED. This duty was asserted as *"both clients get
  // the SAME classification — they cannot disagree any more"*, which cannot be reached now
  // that two clients never both receive one reply. The duty itself is untouched and still
  // matters, because the multi-INSERT case still exists whenever one client holds the same
  // prospect twice — so it is proved there instead.
  it('🛑 SEVERAL LEADS AT ONE CLIENT SHARE ONE CLASSIFICATION — they cannot disagree', async () => {
    state.leadMatches = [
      { id: 'lead-a', client_id: 'client-1', email: 'thabo@acme.com' },
      { id: 'lead-a2', client_id: 'client-1', email: 'thabo@acme.com' },
    ]
    await postReply(REPLY)
    expect(state.replyInserts).toHaveLength(2)
    expect(state.classifyCalls, 'the same email was classified twice').toBe(1)
    const classes = [...new Set(state.replyInserts.map(r => r.classification))]
    expect(classes, 'two rows for one reply carry different classifications').toHaveLength(1)
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
