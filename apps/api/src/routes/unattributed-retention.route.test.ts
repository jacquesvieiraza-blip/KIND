// ⚑ 17 Sep — AN AMBIGUOUS REPLY IS RETAINED IN FULL, OR THE WEBHOOK IS REFUSED.
//
// ROUTE-LEVEL, for the same reason `reply-fanout.route.test.ts` is: the defect this pins is
// not in any helper. `routeReply` is correct, retention is correct, and the bug was the SHAPE
// of the handler — a 200 answered for a reply that had been neither written nor stored. Only
// driving the real Express handler can prove what the provider is actually told.
//
// ── 🛑 WHAT THIS EXISTS TO PREVENT ─────────────────────────────────────────────────────
//
// 16 Sep stopped one reply reaching two clients. The ambiguous reply then had nowhere to go:
// Resend's webhook is metadata-only, so the body had been fetched into a local variable, the
// dedup claim was already taken, and the handler answered 200. The provider never redelivers
// after a 200. The reply was GONE — a privacy leak traded for silent data loss.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = {
  leadMatches: [] as Array<{ id: string; client_id: string }>,
  sentLeadIds: [] as string[],
  replyInserts: [] as Record<string, unknown>[],
  /** Rows written to `unattributed_replies`. */
  retained: [] as Record<string, unknown>[],
  /** Set to force the retention INSERT to fail, which is case B. */
  retentionError: null as { code?: string; message: string } | null,
  /** Dedup claims currently held, as `${source}:${event_id}`. */
  dedupClaims: [] as string[],
  dedupDeleteError: null as { message: string } | null,
  classifyCalls: 0,
  alerts: [] as { kind: string; subject: string; lines: string[] }[],
}

function query(table: string) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'not', 'is', 'neq', 'order', 'limit', 'gte']) q[m] = () => q
  // ⛓️ 18 Sep (J22-C3) — THE LOOKUP IS CASE-INSENSITIVE NOW, AND IT RE-CHECKS EACH ROW FOR
  // EXACT EQUALITY. So the fake table has to answer with the address it was ASKED for —
  // this file posts a Resend payload and a Smartlead payload from two different senders
  // against one `leadMatches` fixture, and a row carrying neither address is filtered out.
  let asked = ''
  q.ilike = (_col: string, pattern: string) => { asked = String(pattern).replace(/\\([\\%_])/g, '$1'); return q }
  q.then = (resolve: (v: unknown) => void) => {
    if (table === 'leads') {
      return resolve({ data: state.leadMatches.map(r => ({ ...r, email: r.email ?? asked })), error: null })
    }
    if (table === 'figsy_sent_emails') {
      return resolve({ data: state.sentLeadIds.map(id => ({ lead_id: id })), error: null })
    }
    return resolve({ data: [], error: null })
  }
  q.maybeSingle = async () => ({
    data: table === 'figsy_enrollments' ? { id: 'enr-1', campaign_id: 'camp-1' } : null,
    error: null,
  })
  q.single = async () => ({ data: { id: `reply-${state.replyInserts.length}` }, error: null })
  q.insert = (row: Record<string, unknown>) => {
    if (table === 'figsy_replies') state.replyInserts.push(row)
    if (table === 'unattributed_replies') {
      // The retention insert reads `.select('id').single()`, so its own chain is returned.
      return {
        select: () => ({
          single: async () => {
            if (state.retentionError) return { data: null, error: state.retentionError }
            state.retained.push(row)
            return { data: { id: `unattr-${state.retained.length}` }, error: null }
          },
        }),
      }
    }
    if (table === 'processed_webhook_events') {
      const key = `${row.source}:${row.event_id}`
      if (state.dedupClaims.includes(key)) return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
      state.dedupClaims.push(key)
      return Promise.resolve({ error: null })
    }
    return q
  }
  q.delete = () => {
    // The release path: `.delete().eq('event_id', id).eq('source', src)`.
    let eventId: string | null = null
    let source: string | null = null
    const chain: Record<string, unknown> = {}
    chain.eq = (col: string, val: unknown) => {
      if (col === 'event_id') eventId = String(val)
      if (col === 'source') source = String(val)
      return chain
    }
    chain.then = (resolve: (v: unknown) => void) => {
      if (state.dedupDeleteError) return resolve({ error: state.dedupDeleteError })
      const key = `${source}:${eventId}`
      state.dedupClaims = state.dedupClaims.filter(k => k !== key)
      return resolve({ error: null })
    }
    return chain
  }
  q.update = () => q
  q.upsert = async () => ({ error: null })
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t) } }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_q: unknown, _s: unknown, n: () => void) => n(),
  AuthRequest: class {},
}))
vi.mock('../lib/rate-limit', () => ({ rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n() }))
vi.mock('../lib/figsy', () => ({
  classifyReply: vi.fn(async () => { state.classifyCalls++; return { classification: 'warm', reasoning: 'r' } }),
  isRiskyReply: () => false,
  recomputeCampaignCounters: vi.fn(async () => {}),
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
vi.mock('../lib/alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, lines: string[]) => { state.alerts.push({ kind, subject, lines }) },
}))

import { figsyRouter } from './figsy'

type Res = { statusCode: number; payload: Record<string, unknown> }

/** Drive the REAL Resend handler. The dedup guard runs for real against the double above. */
async function postResend(body: Record<string, unknown>) {
  const layer = (figsyRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/replies/inbound' && l.route?.methods.post)
  if (!layer?.route) throw new Error('route not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: Record<string, unknown> = { statusCode: 200, payload: {} }
  res.status = (c: number) => { res.statusCode = c; return res }
  res.json = (p: unknown) => { res.payload = p; return res }
  await handler(
    { body: Buffer.from(JSON.stringify(body)), headers: { 'x-webhook-secret': 'test-secret' }, params: {} },
    res, () => {},
  )
  return res as unknown as Res
}

/** Drive the REAL Smartlead handler. */
async function postSmartlead(body: Record<string, unknown>) {
  const layer = (figsyRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/replies/smartlead' && l.route?.methods.post)
  if (!layer?.route) throw new Error('smartlead route not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: Record<string, unknown> = { statusCode: 200, payload: {} }
  res.status = (c: number) => { res.statusCode = c; return res }
  res.json = (p: unknown) => { res.payload = p; return res }
  await handler(
    { body, headers: { 'x-smartlead-secret': 'sl-secret-value' }, params: {}, query: {}, ip: '1.2.3.4' },
    res, () => {},
  )
  return res as unknown as Res
}

beforeEach(() => {
  process.env.RESEND_WEBHOOK_SECRET = 'test-secret'
  process.env.SMARTLEAD_WEBHOOK_SECRET = 'sl-secret-value'
  state.leadMatches = [
    { id: 'lead-a', client_id: 'client-1' },
    { id: 'lead-b', client_id: 'client-2' },
  ]
  state.sentLeadIds = []
  state.replyInserts = []
  state.retained = []
  state.retentionError = null
  state.dedupClaims = []
  state.dedupDeleteError = null
  state.classifyCalls = 0
  state.alerts = []
})

/** A Resend `email.received` webhook carrying the body inline (so no fetch is attempted). */
const RESEND = {
  type: 'email.received',
  data: {
    id: 'resend-evt-1',
    email_id: 'resend-evt-1',
    from: 'Thabo <thabo@acme.com>',
    to: ['inbound@kind-shared.test'],
    subject: 'Re: hello',
    text: 'Sounds interesting, tell me more.',
  },
}

const SMARTLEAD = {
  event_type: 'EMAIL_REPLY',
  from_email: 'Thandi <thandi@prospect.co>',
  to_email: 'unknown-mailbox@nowhere.test',
  subject: 'Re: quick question',
  reply_body: 'Yes, happy to chat next week.',
  message_id: 'sl-msg-99',
}

// ═════════════════════════════════════════════════════════════════════════════
// A · RETENTION
// ═════════════════════════════════════════════════════════════════════════════
describe('A · an ambiguous Resend reply is retained in full', () => {
  it('🛑 EXACTLY ONE RETENTION ROW, AND ZERO CLIENT-VISIBLE REPLIES', async () => {
    const r = await postResend(RESEND)
    expect(state.retained, 'the ambiguous reply was not retained').toHaveLength(1)
    expect(state.replyInserts, 'an unattributable reply reached a client').toHaveLength(0)
    expect(r.statusCode).toBe(200)
    expect(r.payload.dropped).toBe('ambiguous_owner')
  })

  it('🛑 IT CARRIES THE COMPLETE INBOUND — a row a human cannot read is not evidence', async () => {
    await postResend(RESEND)
    const row = state.retained[0]
    expect(row.provider).toBe('resend')
    expect(row.provider_event_key).toBe('resend:resend-evt-1')
    expect(row.from_email).toBe('thabo@acme.com')
    expect(row.from_name).toBe('Thabo')
    expect(row.to_email).toBe('inbound@kind-shared.test')
    expect(row.subject).toBe('Re: hello')
    expect(row.body, 'the fetched body — the thing that used to be lost').toBe('Sounds interesting, tell me more.')
    expect(row.raw_payload, 'the provider payload was not kept for forensics').toBeTruthy()
  })

  it('🛑 AND BOTH CANDIDATE SETS, so a resolution can be checked against them later', async () => {
    await postResend(RESEND)
    const row = state.retained[0]
    expect(row.candidate_client_ids).toEqual(['client-1', 'client-2'])
    expect(row.candidate_lead_ids).toEqual(['lead-a', 'lead-b'])
  })

  it('the founder alert names the retained record rather than being the recovery itself', async () => {
    await postResend(RESEND)
    const joined = state.alerts.flatMap(a => a.lines).join(' ')
    expect(joined).toContain('unattr-1')
    expect(joined.toLowerCase()).toContain('nothing was lost')
  })

  it('and nothing is classified — refusing costs no LLM call', async () => {
    await postResend(RESEND)
    expect(state.classifyCalls).toBe(0)
  })
})

describe('A · the same for Smartlead — one pipeline, one behaviour', () => {
  it('🛑 RETAINED, NOT WRITTEN, AND THE PROVIDER IS NAMED', async () => {
    const r = await postSmartlead(SMARTLEAD)
    expect(state.retained).toHaveLength(1)
    expect(state.retained[0].provider).toBe('smartlead')
    expect(state.retained[0].provider_event_key).toBe('smartlead:sl-msg-99')
    expect(state.retained[0].body).toBe('Yes, happy to chat next week.')
    expect(state.replyInserts).toHaveLength(0)
    expect(r.statusCode).toBe(200)
    expect(r.payload.dropped).toBe('ambiguous_owner')
  })
})

describe('A · the paths that must NOT retain anything', () => {
  it('a single-client reply is written and never retained — the path production runs on', async () => {
    state.leadMatches = [{ id: 'lead-a', client_id: 'client-1' }]
    const r = await postResend(RESEND)
    expect(state.replyInserts).toHaveLength(1)
    expect(state.retained, 'an ordinary reply was parked as an exception').toHaveLength(0)
    expect(state.classifyCalls).toBe(1)
    expect(r.statusCode).toBe(200)
  })

  it('originating-send evidence resolves it, so there is no exception to retain', async () => {
    state.sentLeadIds = ['lead-a']
    await postResend(RESEND)
    expect(state.replyInserts).toHaveLength(1)
    expect(state.replyInserts[0].client_id).toBe('client-1')
    expect(state.retained).toHaveLength(0)
  })

  it('a reply matching nobody retains nothing — there is no collision to decide', async () => {
    state.leadMatches = []
    await postResend(RESEND)
    expect(state.retained).toHaveLength(0)
    expect(state.replyInserts).toHaveLength(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// B · RETENTION FAILURE — THE ONE CASE A WEBHOOK MUST NOT GET A 200
// ═════════════════════════════════════════════════════════════════════════════
describe('B · when the reply cannot be retained, the webhook is REFUSED', () => {
  beforeEach(() => { state.retentionError = { message: 'relation "unattributed_replies" does not exist' } })

  it('🛑 NOTHING IS WRITTEN TO ANY CLIENT', async () => {
    await postResend(RESEND)
    expect(state.replyInserts).toHaveLength(0)
    expect(state.retained).toHaveLength(0)
  })

  it('🛑 THE DEDUP CLAIM IS RELEASED, so the provider can send it again', async () => {
    await postResend(RESEND)
    expect(state.dedupClaims, 'the claim was kept, so a redelivery would be deduped and the reply lost for ever')
      .not.toContain('resend:resend:resend-evt-1')
    expect(state.dedupClaims).toHaveLength(0)
  })

  it('🛑 AND IT ANSWERS 500 — a 200 is a promise we kept something we had just lost', async () => {
    const r = await postResend(RESEND)
    expect(r.statusCode).toBe(500)
    expect(r.payload.dropped).toBe('ambiguous_owner_unretained')
    expect(r.payload.retry).toBe(true)
    expect(r.payload.dedup_released).toBe(true)
  })

  it('🛑 AND THE SAME EVENT IS GENUINELY ACCEPTED ON REDELIVERY', async () => {
    // The whole point of the release, proved end to end rather than asserted about a flag.
    await postResend(RESEND)
    state.retentionError = null
    const second = await postResend(RESEND)
    expect(second.statusCode).toBe(200)
    expect(second.payload.deduped, 'the redelivery was swallowed as a duplicate').toBeUndefined()
    expect(state.retained, 'the redelivered reply was not retained').toHaveLength(1)
  })

  it('a FAILED release is reported rather than implied — the reply really is lost then', async () => {
    state.dedupDeleteError = { message: 'permission denied' }
    const r = await postResend(RESEND)
    expect(r.statusCode).toBe(500)
    expect(r.payload.dedup_released).toBe(false)
  })

  it('and the Smartlead route refuses identically', async () => {
    const r = await postSmartlead(SMARTLEAD)
    expect(r.statusCode).toBe(500)
    expect(r.payload.dropped).toBe('ambiguous_owner_unretained')
    expect(state.dedupClaims).toHaveLength(0)
    expect(state.replyInserts).toHaveLength(0)
  })

  it('an ordinary single-client reply is UNAFFECTED by a broken retention table', async () => {
    // The retention store is only ever touched on the ambiguous path. If a missing table could
    // refuse ordinary replies, this fix would be worse than the defect.
    state.leadMatches = [{ id: 'lead-a', client_id: 'client-1' }]
    const r = await postResend(RESEND)
    expect(r.statusCode).toBe(200)
    expect(state.replyInserts).toHaveLength(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// THE DEDUP GUARD ITSELF IS NOT WEAKENED
// ═════════════════════════════════════════════════════════════════════════════
describe('the release is one case, not a hole in webhook idempotency', () => {
  it('🛑 A RETAINED AMBIGUOUS REPLY KEEPS ITS CLAIM — a retry must not re-retain it', async () => {
    await postResend(RESEND)
    expect(state.dedupClaims, 'the claim was released on the SUCCESS path').toHaveLength(1)
    const again = await postResend(RESEND)
    expect(again.payload.deduped).toBe(true)
    expect(state.retained, 'the redelivery created a second exception for one reply').toHaveLength(1)
  })

  it('and a written reply keeps its claim too', async () => {
    state.leadMatches = [{ id: 'lead-a', client_id: 'client-1' }]
    await postResend(RESEND)
    expect(state.dedupClaims).toHaveLength(1)
    const again = await postResend(RESEND)
    expect(again.payload.deduped).toBe(true)
    expect(state.replyInserts).toHaveLength(1)
  })
})
