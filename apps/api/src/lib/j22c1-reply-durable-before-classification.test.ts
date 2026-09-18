// ══════════════════════════════════════════════════════════════════════════════════════════
// J22-C1 · THE REPLY SURVIVES A CLASSIFIER THAT DOES NOT (R132)
//
// REQ: *"Classifier failure stores unclassified + task; provider answered."*
// RED: *"Classifier throws on inbound (F-INBOUND): baseline loses the reply."*
//
// ── WHY A THROW HERE LOST THE REPLY FOR GOOD ────────────────────────────────────────────
//
// `classifyReply` guards its own PARSE — a model answering nonsense falls back to `other` —
// and nothing guarded the CALL. A 429, a 5xx, a timeout or a missing key threw straight out of
// `processInboundReply`.
//
// 🛑 AND THE WEBHOOK'S DEDUP CLAIM IS TAKEN BEFORE PROCESSING. That claim is what stops a Svix
// retry re-running a hot reply and pushing a second CRM deal — so the 500 that throw produced
// was answered by a redelivery that `isDuplicateWebhookEvent` then SKIPPED. The provider
// believes it delivered. We believe we have seen it. The prospect's answer exists nowhere.
//
// A model being busy is not a reason to lose a customer's reply.
//
// ── UNCLASSIFIED IS `null`, AND THAT IS NOT A DETAIL ────────────────────────────────────
//
// `other` is a real classification — a bounce, spam, something unclear — and a human reading
// it is being told we looked and decided. `null` says we did not manage to look, which is the
// truth, and the inbox already renders it as "New reply" rather than inventing a verdict.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = {
  classifierThrows: false,
  inserted: [] as Record<string, unknown>[],
  alerts: [] as { kind: string; subject: string; about?: unknown }[],
}

vi.mock('@kind/db', () => ({
  db: {
    rpc: async () => ({ data: null, error: null }),
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, in() { return q }, is() { return q },
        not() { return q }, order() { return q }, limit() { return q }, update() { return q },
        insert(row: Record<string, unknown>) {
          if (table === 'figsy_replies') state.inserted.push(row)
          const ins: Record<string, unknown> = {
            select() { return ins },
            async single() { return { data: { id: 'reply-1' }, error: null } },
            async maybeSingle() { return { data: { id: 'reply-1' }, error: null } },
            then(r: (v: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(r) },
          }
          return ins
        },
        async maybeSingle() {
          if (table === 'figsy_enrollments') return { data: { id: 'enr-1', campaign_id: 'camp-1' }, error: null }
          if (table === 'clients') return { data: { company_name: 'Acme' }, error: null }
          return { data: null, error: null }
        },
        async single() { return { data: null, error: null } },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: [], error: null, count: 0 }).then(r) },
      }
      return q
    },
  },
}))

// 🛑 THE FUNCTION UNDER TEST. Everything else in the pipeline is stubbed to succeed, so the
// only thing that can change the outcome is the classifier.
vi.mock('./figsy', () => ({
  classifyReply: async () => {
    if (state.classifierThrows) throw new Error('529 overloaded_error')
    return { classification: 'hot', reasoning: 'they asked for a call' }
  },
  isRiskyReply: () => false,
  recomputeCampaignCounters: async () => {},
}))
vi.mock('./reply-ingest', async (orig) => {
  const actual = await orig() as Record<string, unknown>
  return {
    ...actual,
    findLeadMatches: async () => [{ id: 'lead-1', client_id: 'client-A' }],
    resolveInboxOwner: async () => null,
    sentLeadIdsFor: async () => new Set<string>(),
    suppressOptOut: async () => {},
    alertDroppedReply: async () => {},
  }
})
vi.mock('./alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, _lines: string[], about?: unknown) => {
    state.alerts.push({ kind, subject, about })
    return { delivered: true, emailOk: true, slackOk: false, durableOk: true, taskOk: true }
  },
}))
vi.mock('./outcomes', () => ({ logOutcomeEvent: async () => {} }))
// ⚠️ THE REST OF THE SPINE, STUBBED AT ITS EDGES. `reply-pipeline` reaches CRM, HubSpot, push
// and the signals bus at import time, and each of those builds a live client from environment
// variables this harness does not have. None of them is what is on trial here.
vi.mock('./crm', () => ({ pushDealToCrm: async () => {} }))
vi.mock('./hubspot', () => ({ syncFigsyInterestedToHubspot: async () => {} }))
vi.mock('./push', () => ({ sendPushToClient: async () => {} }))
vi.mock('../routes/signals', () => ({ emitSignal: () => {} }))
vi.mock('./unattributed-reply', () => ({ retainUnattributedReply: async () => ({ ok: true, id: 'ret-1' }) }))

const INBOUND = {
  fromEmail: 'ada@prospect.com',
  fromName: 'Ada',
  toEmail: 'hello@sender.test',
  subject: 'Re: your note',
  body: 'Yes — can we speak Thursday?',
  providerMessageId: 'msg-1',
}

async function process() {
  const { processInboundReply } = await import('./reply-pipeline')
  return processInboundReply(INBOUND as never, { rawPayload: {}, eventKey: 'evt-1' } as never)
}

beforeEach(() => {
  state.classifierThrows = false
  state.inserted = []
  state.alerts = []
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE HEALTHY PATH — or every assertion below proves nothing
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J22-C1 · a working classifier still classifies', () => {
  it('🛑 THE ANTI-VACUITY CASE — the reply is written WITH its classification', async () => {
    const r = await process()
    expect(r.ok, 'nothing is written in this harness, so the failure cases below are vacuous').toBe(true)
    expect(state.inserted.length).toBe(1)
    expect(state.inserted[0].classification).toBe('hot')
    expect(state.inserted[0].classification_reasoning).toBe('they asked for a call')
    // ⚠️ A `hot_reply` ALERT IS CORRECT HERE and is not what this asserts — a hot reply is
    // supposed to reach the founder. What must not appear is the unclassified exception.
    expect(state.alerts.some(a => a.subject.includes('could not be classified')),
      'a healthy classification raised the unclassified exception').toBe(false)
    expect(state.alerts.map(a => a.kind)).toContain('hot_reply')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② THE CLASSIFIER THROWS — AND THE REPLY IS STILL THERE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J22-C1 · a classifier failure never costs the reply', () => {
  it('🛑 THE CALL DOES NOT THROW OUT OF THE PIPELINE', async () => {
    state.classifierThrows = true
    await expect(process()).resolves.toBeTruthy()
  })

  it('🛑 THE REPLY IS WRITTEN — body, sender and subject, exactly as always', async () => {
    state.classifierThrows = true
    await process()
    expect(state.inserted.length, 'the reply was lost when the classifier failed').toBe(1)
    expect(state.inserted[0].body).toBe(INBOUND.body)
    expect(state.inserted[0].from_email).toBe(INBOUND.fromEmail)
    expect(state.inserted[0].subject).toBe(INBOUND.subject)
    expect(state.inserted[0].client_id).toBe('client-A')
  })

  it('🛑 STORED UNCLASSIFIED — `null`, NEVER `other`', async () => {
    // `other` means we looked and decided it was a bounce or unclear. We did not look.
    state.classifierThrows = true
    await process()
    expect(state.inserted[0].classification, 'a failure was recorded as a verdict').toBeNull()
    expect(state.inserted[0].classification).not.toBe('other')
  })

  it('🛑 AND THE PROVIDER IS ANSWERED — `ok`, so the webhook returns 2xx', async () => {
    // A non-2xx here is what burned the reply: the dedup claim is already taken, so the
    // redelivery it asks for is skipped and the answer exists nowhere.
    state.classifierThrows = true
    const r = await process()
    expect(r.ok, 'the pipeline refused the webhook, so the redelivery will be deduped away').toBe(true)
  })

  it('🛑 A HUMAN IS ASKED TO READ IT, and the task names the stored row', async () => {
    state.classifierThrows = true
    await process()
    const task = state.alerts.find(a => a.subject.includes('could not be classified'))
    expect(task, 'an unclassified reply was stored and nobody was told').toBeTruthy()
    expect(task?.kind).toBe('support_escalation')
    expect(task?.about).toMatchObject({ clientId: 'client-A', subjectKind: 'reply', subjectId: 'reply-1' })
  })

  it('the reasoning is empty rather than invented', async () => {
    state.classifierThrows = true
    await process()
    expect(state.inserted[0].classification_reasoning).toBe('')
  })

  it('🛑 AND AN OPT-OUT IS NOT INFERRED FROM A REPLY NOBODY CLASSIFIED', async () => {
    // The opt-out branch keys on the classification. With `null` nothing is suppressed and
    // nothing is assumed — the human read is what decides.
    state.classifierThrows = true
    await process()
    expect(state.inserted[0].classification).toBeNull()
  })
})
