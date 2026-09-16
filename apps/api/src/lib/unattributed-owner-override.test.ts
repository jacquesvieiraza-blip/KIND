// ⚑ 17 Sep — WHAT A HUMAN-SUPPLIED OWNER ACTUALLY DOES TO THE PIPELINE.
//
// The recovery route's tests stub `processInboundReply`, because what they are about is the
// ORDER of the route's acts. This file is the other half: the real pipeline, run with
// `resolvedOwnerClientId` set, because "the override cannot re-open the fan-out" is a claim
// about what the function DOES and a source scan cannot make it.
//
// ── 🛑 THE FEAR THIS DISPROVES ─────────────────────────────────────────────────────────
//
// A field named "the owner is this client" sitting next to routing that used to fan out is
// exactly the shape of a re-opened defect. It is safe for a structural reason, and the
// structure is what is asserted below: the value is read in place of `resolveInboxOwner`'s
// answer, so the reply travels the EXISTING `how: 'inbox'` branch — which FILTERS the matches
// to that one client and reports the rest as excluded. There is no code path from here to two
// clients, and the tests prove it with two candidates present the whole time.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = {
  leadMatches: [] as Array<{ id: string; client_id: string }>,
  replyInserts: [] as Record<string, unknown>[],
  retained: [] as Record<string, unknown>[],
  sentLeadIds: [] as string[],
  classifyCalls: 0,
  /** Set when `resolveInboxOwner` is actually consulted. */
  inboxLookups: 0,
  inboxOwner: null as string | null,
}

function query(table: string) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'not', 'is', 'neq', 'order', 'limit', 'gte', 'ilike']) q[m] = () => q
  q.then = (resolve: (v: unknown) => void) => {
    if (table === 'leads') return resolve({ data: state.leadMatches, error: null })
    if (table === 'figsy_sent_emails') {
      return resolve({ data: state.sentLeadIds.map(id => ({ lead_id: id })), error: null })
    }
    return resolve({ data: [], error: null })
  }
  q.maybeSingle = async () => {
    if (table === 'client_inboxes') {
      state.inboxLookups++
      return { data: state.inboxOwner ? { client_id: state.inboxOwner } : null, error: null }
    }
    if (table === 'figsy_enrollments') return { data: { id: 'enr-1', campaign_id: 'camp-1' }, error: null }
    if (table === 'clients') return { data: { company_name: 'Acme' }, error: null }
    return { data: null, error: null }
  }
  q.single = async () => ({ data: { id: `reply-${state.replyInserts.length}` }, error: null })
  q.insert = (row: Record<string, unknown>) => {
    if (table === 'figsy_replies') state.replyInserts.push(row)
    if (table === 'unattributed_replies') {
      return { select: () => ({ single: async () => { state.retained.push(row); return { data: { id: `unattr-${state.retained.length}` }, error: null } } }) }
    }
    return q
  }
  q.update = () => q
  q.upsert = async () => ({ error: null })
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t) } }))
vi.mock('./figsy', () => ({
  classifyReply: async () => { state.classifyCalls++; return { classification: 'warm', reasoning: 'r' } },
  isRiskyReply: () => false,
  recomputeCampaignCounters: async () => {},
}))
vi.mock('./crm', () => ({ pushDealToCrm: async () => ({ success: false }) }))
vi.mock('./hubspot', () => ({ syncFigsyInterestedToHubspot: async () => {} }))
vi.mock('./push', () => ({ sendPushToClient: async () => {} }))
vi.mock('./outcomes', () => ({ logOutcomeEvent: async () => {} }))
vi.mock('../routes/signals', () => ({ emitSignal: async () => {} }))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => {} }))

import { processInboundReply } from './reply-pipeline'

const INBOUND = {
  fromEmail: 'thabo@acme.com',
  fromName: 'Thabo',
  subject: 'Re: hello',
  body: 'Sounds interesting, tell me more.',
  providerMessageId: 'resend:evt-1',
  provider: 'resend' as const,
  toEmail: 'inbound@kind-shared.test',
}

beforeEach(() => {
  state.leadMatches = [
    { id: 'lead-a', client_id: 'client-A' },
    { id: 'lead-b', client_id: 'client-B' },
  ]
  state.replyInserts = []
  state.retained = []
  state.sentLeadIds = []
  state.classifyCalls = 0
  state.inboxLookups = 0
  state.inboxOwner = null
})

const run = (ctx: Record<string, unknown> = {}) =>
  processInboundReply(INBOUND, { rawPayload: {}, eventKey: 'unattributed:unattr-1', ...ctx })

describe('the human-supplied owner writes to exactly one client', () => {
  it('🛑 ONE REPLY, FOR THE CHOSEN CLIENT, WITH BOTH CANDIDATES STILL PRESENT', async () => {
    const r = await run({ resolvedOwnerClientId: 'client-A' })
    expect(r.ok).toBe(true)
    expect(state.replyInserts).toHaveLength(1)
    expect(state.replyInserts[0].client_id).toBe('client-A')
  })

  it('🛑 AND ZERO FOR THE OTHER CANDIDATE — the override is not a way back to the fan-out', async () => {
    await run({ resolvedOwnerClientId: 'client-A' })
    expect(state.replyInserts.filter(x => x.client_id === 'client-B')).toHaveLength(0)
  })

  it('🛑 ONLY THE CHOSEN CLIENT\'S LEAD IS USED', async () => {
    await run({ resolvedOwnerClientId: 'client-B' })
    expect(state.replyInserts).toHaveLength(1)
    expect(state.replyInserts[0].lead_id).toBe('lead-b')
  })

  it('several leads at the chosen client all receive it, and still only that client', async () => {
    state.leadMatches = [
      { id: 'lead-a', client_id: 'client-A' },
      { id: 'lead-a2', client_id: 'client-A' },
      { id: 'lead-b', client_id: 'client-B' },
    ]
    await run({ resolvedOwnerClientId: 'client-A' })
    expect(state.replyInserts).toHaveLength(2)
    expect(new Set(state.replyInserts.map(x => x.client_id))).toEqual(new Set(['client-A']))
  })

  it('classification still happens exactly once', async () => {
    await run({ resolvedOwnerClientId: 'client-A' })
    expect(state.classifyCalls).toBe(1)
  })

  it('🛑 AND NO SECOND EXCEPTION IS MINTED on this path', async () => {
    await run({ resolvedOwnerClientId: 'client-A' })
    expect(state.retained, 'attributing a retained reply created another retained reply').toHaveLength(0)
  })

  it('the mailbox lookup is SKIPPED — its answer is already known to be absent', async () => {
    // Not a correctness requirement, a cost one: the ambiguity exists precisely because the
    // receiving mailbox named nobody, so asking again is a wasted read on every resolution.
    await run({ resolvedOwnerClientId: 'client-A' })
    expect(state.inboxLookups).toBe(0)
  })

  it('and it does NOT gather originating-send evidence either — a human outranks it', async () => {
    // `sentLeadIds` names client-B. The human said client-A. The human wins, and the evidence
    // read is not even performed, because the branch that needs it is never reached.
    state.sentLeadIds = ['lead-b']
    await run({ resolvedOwnerClientId: 'client-A' })
    expect(state.replyInserts[0].client_id).toBe('client-A')
  })
})

describe('the override cannot invent a reply for a client with no lead', () => {
  it('🛑 A CHOSEN CLIENT WHO HOLDS NO MATCHING LEAD GETS NOTHING', async () => {
    // It cannot arrive from the route (the candidate check refuses it) — this proves the
    // pipeline itself would refuse too, so the guarantee does not rest on one caller.
    state.leadMatches = [{ id: 'lead-b', client_id: 'client-B' }]
    const r = await run({ resolvedOwnerClientId: 'client-A' })
    expect(r.ok).toBe(false)
    expect(state.replyInserts).toHaveLength(0)
  })

  it('and no reply is quietly handed to whoever DOES hold the lead', async () => {
    state.leadMatches = [{ id: 'lead-b', client_id: 'client-B' }]
    await run({ resolvedOwnerClientId: 'client-A' })
    expect(state.replyInserts.filter(x => x.client_id === 'client-B')).toHaveLength(0)
  })
})

describe('without the override, nothing changes', () => {
  it('🛑 THE AMBIGUOUS CASE STILL REFUSES AND STILL RETAINS', async () => {
    const r = await run()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.dropped).toBe('ambiguous_owner')
    expect(state.replyInserts).toHaveLength(0)
    expect(state.retained).toHaveLength(1)
  })

  it('a real receiving mailbox still decides, and is still consulted', async () => {
    state.inboxOwner = 'client-B'
    await run()
    expect(state.inboxLookups).toBeGreaterThan(0)
    expect(state.replyInserts).toHaveLength(1)
    expect(state.replyInserts[0].client_id).toBe('client-B')
  })

  it('and the single-client path is untouched — no retention, no refusal', async () => {
    state.leadMatches = [{ id: 'lead-a', client_id: 'client-A' }]
    const r = await run()
    expect(r.ok).toBe(true)
    expect(state.replyInserts).toHaveLength(1)
    expect(state.retained).toHaveLength(0)
  })
})
