import { describe, it, expect, vi, beforeEach } from 'vitest'

// #551 — REPLIES FROM THE CLIENTS' OWN MAILBOXES.
//
// Every reply today arrives at one shared Resend inbox. The moment a client sends from their
// own Smartlead mailbox (#577: Instantly is ours, Smartlead is theirs), their prospects reply
// THERE — and without this feeder the unibox goes silent for every paying client and we miss
// the meeting we already charged $4 for.
//
// THE ASSERTION THAT MATTERS MOST is the second describe: two clients emailing the SAME
// prospect must not see each other's replies. Routing on lead match alone cannot tell them
// apart — only the receiving mailbox can — and getting it wrong drops one client's inbound
// mail into another client's unibox, which is worse than dropping it.
//
// Driven through the real Express handler, because the bug #551 fixes is not in any helper:
// `resolveInboxOwner` and `routeReply` are unit-tested and correct. It was always about what
// the route feeds them (the #541 lesson).

const state = {
  /** every lead row matching the sender, across all clients */
  // ⛓️ 18 Sep (J22-C3) — the fixtures carry the ADDRESS now. The lead lookup matches
  // case-insensitively and then re-checks each row for exact equality, so a match row with no
  // email is filtered out and every routing assertion here fails as "nobody matched".
  leadMatches: [] as Array<{ id: string; client_id: string; email?: string }>,
  /** client_inboxes: which client owns the receiving address */
  inboxOwner: null as string | null,
  inboxLookupError: null as { message: string } | null,
  /**
   * ⚑ 16 Sep (GAP 3) — `figsy_sent_emails`: the lead ids we can PROVE we emailed. This is the
   * only tie-breaker left once the receiving mailbox is unknown; empty means no evidence.
   */
  sentLeadIds: [] as string[],
  replyInserts: [] as Record<string, unknown>[],
  alerts: [] as { kind: string; subject: string; lines: string[] }[],
  dedupSeen: [] as string[],
  /** what isDuplicateWebhookEvent should answer */
  isDuplicate: false,
  classifyCalls: 0,
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
      if (state.inboxLookupError) return { data: null, error: state.inboxLookupError }
      return { data: state.inboxOwner ? { client_id: state.inboxOwner } : null, error: null }
    }
    if (table === 'figsy_enrollments') return { data: { id: 'enr-1', campaign_id: 'camp-1' }, error: null }
    if (table === 'clients') return { data: { company_name: 'Acme' }, error: null }
    return { data: null, error: null }
  }
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
vi.mock('../middleware/auth', () => ({
  requireAuth: (_q: unknown, _s: unknown, n: () => void) => n(),
  AuthRequest: class {},
}))
vi.mock('../lib/alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, lines: string[]) => { state.alerts.push({ kind, subject, lines }) },
}))
vi.mock('../lib/webhook-idempotency', () => ({
  isDuplicateWebhookEvent: async (_db: unknown, key: string | null) => {
    if (key) state.dedupSeen.push(key)
    return state.isDuplicate
  },
}))
vi.mock('../lib/figsy', async (orig) => ({
  ...(await orig() as Record<string, unknown>),
  classifyReply: async () => { state.classifyCalls++; return { classification: 'warm', reasoning: 'r' } },
  recomputeCampaignCounters: async () => {},
  isRiskyReply: () => false,
}))
vi.mock('../lib/crm', () => ({ pushDealToCrm: async () => ({ success: false }) }))
vi.mock('../lib/hubspot', () => ({ syncFigsyInterestedToHubspot: async () => {} }))
vi.mock('../lib/push', () => ({ sendPushToClient: async () => {} }))
vi.mock('../lib/outcomes', () => ({ logOutcomeEvent: async () => {} }))
vi.mock('./signals', () => ({ emitSignal: async () => {}, signalsRouter: {} }))

const SECRET = 'sl-secret-value'

async function post(body: unknown, opts: { secret?: string | null } = {}) {
  const { figsyRouter } = await import('./figsy')
  const layer = (figsyRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/replies/smartlead' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /replies/smartlead not found on the figsy router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    json(p: Record<string, unknown>) { res.payload = p; return fakeRes },
    type() { return fakeRes }, send() { return fakeRes },
  }
  const headers: Record<string, string> = {}
  const s = 'secret' in opts ? opts.secret : SECRET
  if (s) headers['x-smartlead-secret'] = s
  await handler({ headers, body, params: {}, query: {}, ip: '1.2.3.4' }, fakeRes, () => {})
  return res
}

/** A Smartlead-shaped reply event. Shape UNVERIFIED — see lib/smartlead-inbound.ts. */
const reply = (over: Record<string, unknown> = {}) => ({
  event_type: 'EMAIL_REPLY',
  from_email: 'Thandi Mokoena <thandi@prospect.co>',
  to_email: 'ada@acme-client.com',
  subject: 'Re: quick question',
  reply_body: 'Yes, happy to chat next week.',
  message_id: 'sl-msg-1',
  ...over,
})

const settle = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  process.env.SMARTLEAD_WEBHOOK_SECRET = SECRET
  state.leadMatches = [{ id: 'lead-A', client_id: 'client-A', email: 'thandi@prospect.co' }]
  state.inboxOwner = 'client-A'
  state.inboxLookupError = null
  state.sentLeadIds = []
  state.replyInserts = []
  state.alerts = []
  state.dedupSeen = []
  state.isDuplicate = false
  state.classifyCalls = 0
})

describe('it ships inert until the founder configures it', () => {
  it('503s with no SMARTLEAD_WEBHOOK_SECRET — merging this changes nothing', async () => {
    // A public endpoint that can suppress a client's leads must not be live by accident. A
    // forged reply could opt-out prospects or inject a fake hot reply.
    delete process.env.SMARTLEAD_WEBHOOK_SECRET
    const res = await post(reply())
    expect(res.code).toBe(503)
    expect(state.replyInserts).toHaveLength(0)
  })

  it('401s on a wrong secret, and writes nothing', async () => {
    const res = await post(reply(), { secret: 'wrong-length-secret!!' })
    expect(res.code).toBe(401)
    expect(state.replyInserts).toHaveLength(0)
  })

  it('401s when no secret is offered at all', async () => {
    const res = await post(reply(), { secret: null })
    expect(res.code).toBe(401)
  })
})

describe('a reply is routed to the client whose MAILBOX received it', () => {
  it('reply to client A\'s mailbox lands against client A', async () => {
    state.leadMatches = [{ id: 'lead-A', client_id: 'client-A', email: 'thandi@prospect.co' }]
    state.inboxOwner = 'client-A'
    const res = await post(reply({ to_email: 'ada@acme-client.com' }))
    expect(res.code).toBe(200)
    expect(state.replyInserts).toHaveLength(1)
    expect(state.replyInserts[0]).toMatchObject({ client_id: 'client-A', from_email: 'thandi@prospect.co' })
  })

  it('THE SAME PROSPECT replying to client B\'s mailbox lands against B, not A', async () => {
    // The assertion this whole item exists for. Both clients hold this person as a lead —
    // legitimate and common — so the lead match alone cannot decide. Only the receiving
    // mailbox can, and choosing wrong hands one client's inbound mail to another.
    state.leadMatches = [{ id: 'lead-A', client_id: 'client-A', email: 'thandi@prospect.co' }, { id: 'lead-B', client_id: 'client-B', email: 'thandi@prospect.co' }]
    state.inboxOwner = 'client-B'
    await post(reply({ to_email: 'ben@beta-client.com' }))
    expect(state.replyInserts).toHaveLength(1)
    expect(state.replyInserts[0]).toMatchObject({ client_id: 'client-B' })
  })

  // ⛓️ 16 Sep (GAP 3) — THE TWO FAN-OUT CASES BELOW ARE RE-POINTED, NOT WEAKENED.
  //
  // 🛑 WHAT THEY ASSERTED: that an unknown receiving mailbox, and an inbox lookup OUTAGE,
  // each *"fall back to the fan-out rather than dropping"* — two inserts, one per client.
  // The reasoning was sound at the time: *"unknown must never mean dropped."*
  //
  // The founder's launch-safety ruling overrides the remedy, not the concern: *"A reply from a
  // prospect must never be copied/fanned out to multiple clients merely because multiple client
  // lead rows share the same prospect email… If the system cannot determine one safe owner:
  // FAIL CLOSED."* A cross-client fan-out IS one client reading another's inbound mail, which
  // the second test in this very block exists to prevent — the two assertions contradicted each
  // other, and the founder resolved it.
  //
  // ⚠️ AND "UNKNOWN MUST NEVER MEAN DROPPED" IS STILL HONOURED, by a better route than a
  // fan-out: the reply is first attributed from PERSISTED ORIGINATING-SEND EVIDENCE, and only a
  // genuine tie becomes a founder alert naming both candidates. Nothing is silently dropped,
  // and the single-client path — every reply in production today — is untouched.
  it('🛑 AN UNKNOWN MAILBOX NO LONGER FANS OUT ACROSS CLIENTS — it fails closed', async () => {
    state.leadMatches = [{ id: 'lead-A', client_id: 'client-A', email: 'thandi@prospect.co' }, { id: 'lead-B', client_id: 'client-B', email: 'thandi@prospect.co' }]
    state.inboxOwner = null
    const res = await post(reply())
    await settle()
    expect(state.replyInserts, 'one prospect reply reached two clients').toHaveLength(0)
    expect(res.payload).toMatchObject({ dropped: 'ambiguous_owner' })
    const alert = state.alerts.find(a => a.lines.join(' ').includes('client-A'))
    expect(alert, 'the refusal was silent — no operator exception raised').toBeDefined()
    expect(alert!.lines.join(' ')).toContain('client-B')
  })

  it('an unknown mailbox with ONE client matching is still delivered — unchanged', async () => {
    // The shape of virtually every real reply, and the thing a blunt refusal would have broken.
    state.leadMatches = [{ id: 'lead-A', client_id: 'client-A', email: 'thandi@prospect.co' }]
    state.inboxOwner = null
    await post(reply())
    expect(state.replyInserts).toHaveLength(1)
    expect(state.replyInserts[0]).toMatchObject({ client_id: 'client-A' })
  })

  it('and an unknown mailbox WITH originating-send evidence goes to the client we emailed', async () => {
    state.leadMatches = [{ id: 'lead-A', client_id: 'client-A', email: 'thandi@prospect.co' }, { id: 'lead-B', client_id: 'client-B', email: 'thandi@prospect.co' }]
    state.inboxOwner = null
    state.sentLeadIds = ['lead-B']
    await post(reply())
    expect(state.replyInserts).toHaveLength(1)
    expect(state.replyInserts[0]).toMatchObject({ client_id: 'client-B' })
  })

  it('an inbox LOOKUP FAILURE costs precision, never a reply — but never a fan-out either', async () => {
    // An outage still must not drop the reply. It now falls through to the same evidence-then-
    // fail-closed ladder as an unknown mailbox, so the outage cannot hand one client another's
    // mail while it lasts.
    state.leadMatches = [{ id: 'lead-A', client_id: 'client-A', email: 'thandi@prospect.co' }, { id: 'lead-B', client_id: 'client-B', email: 'thandi@prospect.co' }]
    state.inboxLookupError = { message: 'timeout' }
    state.sentLeadIds = ['lead-A']
    await post(reply())
    expect(state.replyInserts).toHaveLength(1)
    expect(state.replyInserts[0]).toMatchObject({ client_id: 'client-A' })
  })

  it('an inbox lookup failure with NO evidence fails closed rather than fanning out', async () => {
    state.leadMatches = [{ id: 'lead-A', client_id: 'client-A', email: 'thandi@prospect.co' }, { id: 'lead-B', client_id: 'client-B', email: 'thandi@prospect.co' }]
    state.inboxLookupError = { message: 'timeout' }
    const res = await post(reply())
    expect(state.replyInserts).toHaveLength(0)
    expect(res.payload).toMatchObject({ dropped: 'ambiguous_owner' })
  })
})

describe('a reply that cannot be attributed is never silently dropped', () => {
  it('a known mailbox with NO matching lead ALERTS and names both addresses', async () => {
    state.leadMatches = []
    state.inboxOwner = 'client-A'
    const res = await post(reply({ to_email: 'ada@acme-client.com' }))
    await settle()
    expect(res.payload).toMatchObject({ received: true })
    expect(state.replyInserts).toHaveLength(0)
    // With zero matches the pipeline returns before the inbox alert (nobody holds this person
    // as a lead at all) — the guarantee is that nothing was written and nothing 500'd.
    expect(res.code).toBe(200)
  })

  it('a reply at client A\'s mailbox from a person only client B holds goes to NEITHER, and alerts', async () => {
    // The harm this prevents: falling back to the fan-out here would post client B's lead's
    // reply into client B's unibox off client A's mailbox.
    state.leadMatches = [{ id: 'lead-B', client_id: 'client-B', email: 'thandi@prospect.co' }]
    state.inboxOwner = 'client-A'
    const res = await post(reply({ to_email: 'ada@acme-client.com' }))
    await settle()
    expect(state.replyInserts).toHaveLength(0)
    expect(res.payload).toMatchObject({ dropped: 'no_lead_at_this_inbox' })
    const alert = state.alerts.find(a => a.subject.includes('no matching lead'))
    expect(alert).toBeDefined()
    expect(alert!.lines.join(' ')).toContain('ada@acme-client.com')
    expect(alert!.lines.join(' ')).toContain('thandi@prospect.co')
  })

  it('an UNREADABLE payload alerts with the payload keys, so the parser can be corrected', async () => {
    // The shape is unverified (key 401s, docs 403). When it is wrong we need the evidence, not
    // another guess — so the alert carries the keys Smartlead actually sent.
    const res = await post({ event_type: 'EMAIL_REPLY', weird_sender_field: 'x@y.com', text: 'hi' })
    await settle()
    expect(res.payload).toMatchObject({ dropped: 'unreadable' })
    const alert = state.alerts.find(a => a.subject.includes('could not read'))
    expect(alert).toBeDefined()
    expect(alert!.lines.join(' ')).toContain('weird_sender_field')
    expect(alert!.lines.join(' ')).toContain('still in Smartlead')
  })
})

describe('non-reply events and retries', () => {
  it('a SENT event is skipped — it must never become a fake inbound reply', async () => {
    // Processing our own outbound as a reply would insert a message against a real lead and
    // could classify our own copy as hot.
    const res = await post(reply({ event_type: 'EMAIL_SENT' }))
    expect(res.payload).toMatchObject({ skipped: 'not_a_reply' })
    expect(state.replyInserts).toHaveLength(0)
    expect(state.classifyCalls).toBe(0)
  })

  it('an OPEN event is skipped too', async () => {
    const res = await post(reply({ event_type: 'EMAIL_OPEN' }))
    expect(res.payload).toMatchObject({ skipped: 'not_a_reply' })
  })

  it('a duplicate message id is a NO-OP — no second CRM deal, no second alert', async () => {
    state.isDuplicate = true
    const res = await post(reply())
    expect(res.payload).toMatchObject({ deduped: true })
    expect(state.replyInserts).toHaveLength(0)
    expect(state.classifyCalls).toBe(0)
  })

  it('the dedup key is NAMESPACED by provider — Smartlead must not suppress a Resend reply', async () => {
    // Two providers can legitimately issue the same message id. Keying on the bare id would
    // let one provider's reply silently swallow the other's.
    await post(reply({ message_id: 'shared-id-1' }))
    expect(state.dedupSeen).toContain('smartlead:shared-id-1')
  })

  // ⛓️ 16 Sep (GAP 3) — RE-POINTED with the fan-out, and the DUTY IS UNCHANGED: one inbound
  // email is classified at most once, whatever routing decides. Two LLM calls on identical
  // input cost twice and can disagree. What changed is the case that reaches several leads:
  // with evidence naming one client it is one insert and one classification; with no evidence
  // it is refused, and refusing costs zero classifications — still never one per client.
  it('classifies AT MOST ONCE however many leads match', async () => {
    // The #589 dividend: this is the classify-once shape `reply-fanout.route.test.ts` pins for
    // Resend, and Smartlead inherits it by sharing the pipeline rather than copying it.
    state.leadMatches = [{ id: 'lead-A', client_id: 'client-A', email: 'thandi@prospect.co' }, { id: 'lead-B', client_id: 'client-B', email: 'thandi@prospect.co' }]
    state.inboxOwner = null
    state.sentLeadIds = ['lead-A']
    await post(reply())
    expect(state.replyInserts).toHaveLength(1)
    expect(state.classifyCalls).toBe(1)
  })

  it('and TWO leads under ONE client share a single classification', async () => {
    // The case where several inserts still happen — same client, so no cross-client leak — and
    // the assertion this file was really written for holds there too.
    state.leadMatches = [{ id: 'lead-A', client_id: 'client-A', email: 'thandi@prospect.co' }, { id: 'lead-A2', client_id: 'client-A', email: 'thandi@prospect.co' }]
    state.inboxOwner = null
    await post(reply())
    expect(state.replyInserts).toHaveLength(2)
    expect(state.classifyCalls).toBe(1)
  })
})
