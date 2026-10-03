// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (card #2564 · sending fix #10) — A REPLY NOBODY CAN MATCH IS NEVER DROPPED SILENTLY.
//
// A prospect who answers from an alias, a personal address, their assistant or a colleague
// matches no lead. The pipeline returned `{ ok: true, clients: 0 }`: nothing kept, nobody told,
// and the webhook answered 200 — so the client and K.I.N.D both believed nobody had replied.
//
// Now the reply is KEPT IN FULL (the same retained-reply record Vida's "Needs you" row reads),
// the founder is told with the words of the reply, and if it cannot be kept the webhook is
// refused so the provider sends it again.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = {
  matches: [] as { id: string; client_id: string; email: string }[],
  inboxOwner: null as string | null,
  retentionFails: false,
  retained: [] as Record<string, unknown>[],
  inserted: [] as Record<string, unknown>[],
  alerts: [] as { kind: string; subject: string; lines: string[] }[],
}

vi.mock('@kind/db', () => ({
  db: {
    rpc: async () => ({ data: null, error: null }),
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, in() { return q }, is() { return q },
        not() { return q }, ilike() { return q }, order() { return q }, limit() { return q },
        update() { return q },
        insert(row: Record<string, unknown>) { state.inserted.push({ table, ...row }); return q },
        async maybeSingle() { return { data: table === 'clients' ? { company_name: 'Acme' } : null, error: null } },
        async single() { return { data: { id: 'reply-1' }, error: null } },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: [], error: null }).then(r) },
      }
      return q
    },
  },
}))
vi.mock('./figsy', () => ({
  classifyReply: async () => ({ classification: 'warm', reasoning: 'r' }),
  isRiskyReply: () => false,
  recomputeCampaignCounters: async () => {},
}))
vi.mock('./reply-ingest', async (orig) => {
  const actual = await orig() as Record<string, unknown>
  return {
    ...actual,
    findLeadMatches: async () => state.matches,
    resolveInboxOwner: async () => state.inboxOwner,
    sentLeadIdsFor: async () => new Set<string>(),
    suppressOptOut: async () => {},
    alertDroppedReply: async (why: string, _i: unknown, detail?: string) => {
      state.alerts.push({ kind: 'dropped', subject: why, lines: [detail ?? ''] })
    },
  }
})
vi.mock('./unattributed-reply', () => ({
  retainUnattributedReply: async (input: Record<string, unknown>) => {
    if (state.retentionFails) return { ok: false, detail: 'relation does not exist' }
    state.retained.push(input)
    return { ok: true, id: 'unattr-9', already: false }
  },
}))
vi.mock('./alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, lines: string[]) => {
    state.alerts.push({ kind, subject, lines })
    return { delivered: true, emailOk: true, slackOk: false, durableOk: true, taskOk: true }
  },
}))
vi.mock('./outcomes', () => ({ logOutcomeEvent: async () => {} }))
vi.mock('./crm', () => ({ pushDealToCrm: async () => {} }))
vi.mock('./hubspot', () => ({ syncFigsyInterestedToHubspot: async () => {} }))
vi.mock('./push', () => ({ sendPushToClient: async () => {} }))
vi.mock('../routes/signals', () => ({ emitSignal: () => {} }))

const INBOUND = {
  provider: 'resend' as const,
  fromEmail: 'assistant@prospect.com',
  fromName: 'Sam (assistant to Ada)',
  toEmail: 'hello@house-mailbox.test',
  subject: 'Re: quick question',
  body: 'Ada asked me to reply — she would like a call next Tuesday.',
  providerMessageId: 'msg-1',
}

async function run(ctx: Record<string, unknown> = {}) {
  const { processInboundReply, RETRYABLE_DROPS } = await import('./reply-pipeline')
  const result = await processInboundReply(INBOUND, { rawPayload: { id: 'msg-1' }, eventKey: 'resend:msg-1', ...ctx })
  await new Promise(r => setTimeout(r, 0))   // let fire-and-forget alerts land
  return { result, RETRYABLE_DROPS }
}

beforeEach(() => {
  state.matches = []; state.inboxOwner = null; state.retentionFails = false
  state.retained = []; state.inserted = []; state.alerts = []
})

describe('#2564 — a reply from an address that matches no lead', () => {
  it('🛑 is KEPT IN FULL — sender, mailbox, subject and every word — not a silent "0 clients"', async () => {
    const { result } = await run()
    expect(result).not.toEqual({ ok: true, clients: 0, replyId: undefined })
    expect(state.retained).toHaveLength(1)
    expect(state.retained[0]).toMatchObject({
      provider: 'resend', providerEventKey: 'resend:msg-1',
      fromEmail: INBOUND.fromEmail, toEmail: INBOUND.toEmail,
      subject: INBOUND.subject, body: INBOUND.body,
      // no lead matched, so there is no candidate to offer — nothing is guessed
      candidateClientIds: [], candidateLeadIds: [],
    })
  })

  it('🛑 the founder is told: which mailbox it came to, where it is kept, and that it is waiting in Vida', async () => {
    await run()
    const said = state.alerts.map(a => `${a.subject} ${a.lines.join(' ')}`).join(' | ')
    expect(said).toContain(INBOUND.toEmail)
    expect(said).toContain('unattr-9')
    expect(said).toContain('Vida')
  })

  it('🛑 and the alert carries none of the reply\'s words — it becomes a Vida task (R132: "Do not expose reply body in a generic list")', async () => {
    await run()
    const said = state.alerts.map(a => `${a.subject} ${a.lines.join(' ')}`).join(' | ')
    expect(said).not.toContain('she would like a call next Tuesday')
  })

  it('🛑 once kept, the answer to the provider is a safe refusal code, not a retry', async () => {
    const { result, RETRYABLE_DROPS } = await run()
    expect(result).toEqual({ ok: false, dropped: 'no_lead_matches' })
    expect(RETRYABLE_DROPS.has('no_lead_matches')).toBe(false)
  })

  it('🛑 if it cannot be kept, the webhook is REFUSED so the provider sends it again — and the founder hears that too', async () => {
    state.retentionFails = true
    const { result, RETRYABLE_DROPS } = await run()
    expect(result.ok).toBe(false)
    expect(RETRYABLE_DROPS.has((result as { dropped: string }).dropped)).toBe(true)
    expect(state.alerts.map(a => a.lines.join(' ')).join(' ')).toContain('redeliver')
  })

  it('nothing is written into any client\'s inbox — there is no lead to write it against', async () => {
    await run()
    expect(state.inserted.filter(r => r.table === 'figsy_replies')).toHaveLength(0)
  })
})

describe('#2564 — a reply at one client\'s mailbox from a person only another client holds', () => {
  it('🛑 is KEPT too (it used to exist only in the alert) — and is still not handed to the other client', async () => {
    state.matches = [{ id: 'lead-B', client_id: 'client-B', email: INBOUND.fromEmail }]
    state.inboxOwner = 'client-A'
    const { result } = await run()
    expect(result).toEqual({ ok: false, dropped: 'no_lead_at_this_inbox' })
    expect(state.retained).toHaveLength(1)
    expect(state.retained[0]).toMatchObject({ body: INBOUND.body, candidateClientIds: [], candidateLeadIds: [] })
    expect(state.inserted.filter(r => r.table === 'figsy_replies')).toHaveLength(0)
    const alert = state.alerts.find(a => a.subject.includes('no matching lead'))
    expect(alert?.lines.join(' ')).toContain('unattr-9')
  })

  it('🛑 and if it cannot be kept there, the webhook is refused rather than answered 200', async () => {
    state.matches = [{ id: 'lead-B', client_id: 'client-B', email: INBOUND.fromEmail }]
    state.inboxOwner = 'client-A'
    state.retentionFails = true
    const { result, RETRYABLE_DROPS } = await run()
    expect(RETRYABLE_DROPS.has((result as { dropped: string }).dropped)).toBe(true)
  })
})

describe('#2564 — a person attributing a kept reply in Vida', () => {
  it('🛑 is told the truth when the sender still matches no lead: nothing written, nothing recorded as attributed, nothing kept twice', async () => {
    const { result } = await run({ resolvedOwnerClientId: 'client-A' })
    expect(result.ok).toBe(false)
    expect(state.retained).toHaveLength(0)
    expect(state.inserted.filter(r => r.table === 'figsy_replies')).toHaveLength(0)
  })
})
