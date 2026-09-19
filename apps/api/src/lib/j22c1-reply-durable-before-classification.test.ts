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
import { readFileSync } from 'node:fs'

const state = {
  classifierThrows: false,
  inserted: [] as Record<string, unknown>[],
  alerts: [] as { kind: string; subject: string; about?: unknown }[],
  // ── ⚑ 19 Sep — the machinery for the race proof below. `taskGate` is what lets this file
  // ask the only question that matters: had the row been WRITTEN when the pipeline answered?
  taskCalls: [] as Record<string, unknown>[],
  taskGate: null as Promise<void> | null,
  taskFails: false,
  replyInsertLosesRace: false,
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
          // ⚑ 19 Sep — a REDELIVERED reply loses to `figsy_replies`'s idempotency index, so the
          // second attempt gets no row back. The pipeline must still raise the task under a key
          // that matches the first attempt's, or a retry files a second job for one prospect.
          const lost = table === 'figsy_replies' && state.replyInsertLosesRace
          const ins: Record<string, unknown> = {
            select() { return ins },
            async single() {
              return lost
                ? { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
                : { data: { id: 'reply-1' }, error: null }
            },
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
// ── ⚑ 19 Sep (J22-C1) — THE DURABLE TASK PRIMITIVE, GATED ─────────────────────────────────
//
// 🛑 THE GATE IS THE WHOLE PROOF. A mock that answers immediately cannot tell a pipeline that
// AWAITS this row apart from one that fires it into the background — both look identical by
// the time the assertion runs, which is exactly how the race reached certification. Holding the
// insert open and asking whether the pipeline has answered YET is the only question that
// distinguishes them, and it is the same question the provider asks by being sent a 200.
vi.mock('./operator-tasks', () => ({
  raiseOperatorTask: async (input: Record<string, unknown>) => {
    state.taskCalls.push(input)
    if (state.taskGate) await state.taskGate
    if (state.taskFails) return { ok: false, error: 'operator_tasks insert returned error: boom' }
    return { ok: true, taskId: `task-${state.taskCalls.length}` }
  },
  dedupeKeyFor: () => 'global',
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
  state.taskCalls = []
  state.taskGate = null
  state.taskFails = false
  state.replyInsertLosesRace = false
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

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ ⚑ 19 Sep — THE TASK IS DURABLE **BEFORE** THE PROVIDER IS ANSWERED
//
// 🛑 WHAT EARNED THIS BLOCK, AND IT WAS MEASURED TWICE ON ONE TREE. ② above proved a task is
// raised. It could not prove WHEN — the call was `void sendFounderAlert(…)`, fired into the
// background, and the route answered the provider 200 while the row was still in flight. The
// builder's full-stack run read `operator_tasks` after the insert had landed and passed;
// Fable's independent run of the SAME SHA read it before, and F-INBOUND failed:
// *"THE CLASSIFIER FAILED, THE REPLY WAS KEPT (1 row(s)) AND NOBODY WAS TOLD."*
//
// 🛑 AND THE HARNESS WAS RIGHT. The webhook's dedup claim is taken BEFORE processing, so a
// provider already told 200 never redelivers: a process that dies in that window leaves an
// unclassified reply nobody is ever told about — R132's exact prohibition. A wait or a retry
// in the check would have hidden the race; only the product can close it.
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J22-C1 · the task is durable before the provider is answered', () => {
  it('🛑 THE PIPELINE DOES NOT ANSWER UNTIL THE OPERATOR ROW IS WRITTEN', async () => {
    state.classifierThrows = true
    let release!: () => void
    state.taskGate = new Promise<void>((r) => { release = r })

    let answered = false
    const p = process().then((r) => { answered = true; return r })

    // Long enough for every microtask AND timer turn the pipeline could take on its own.
    await new Promise((r) => setTimeout(r, 25))

    expect(state.taskCalls.length,
      'the durable operator task was never even attempted before the answer').toBe(1)
    expect(answered,
      '🛑 THE PROVIDER WAS ANSWERED WHILE THE TASK WAS STILL IN FLIGHT — if the process dies here the reply is held and nobody is ever told')
      .toBe(false)

    release()
    const r = await p
    expect(r.ok, 'the provider must still get its 2xx once the task is durable').toBe(true)
  })

  it('🛑 NO TASK, NO 2xx — the delivery is refused so the provider sends it again', async () => {
    // The reply row STAYS: losing it is the worse failure. What must not happen is a 200 that
    // promises a human will read something no human will ever be shown.
    state.classifierThrows = true
    state.taskFails = true
    const r = await process()
    expect(state.inserted.length, 'the stored reply must not be sacrificed to the refusal').toBe(1)
    expect(r.ok, 'an untasked unclassified reply was acknowledged 200').toBe(false)
    expect((r as { dropped?: string }).dropped).toBe('unclassified_untasked')
  })

  it('🛑 AND BOTH WEBHOOK ROUTES TURN THAT REFUSAL INTO A RELEASE-AND-500', async () => {
    // A refusal the routes answer 200 to is not a refusal — the dedup claim stays taken and the
    // redelivery it asks for is skipped. Resend and Smartlead each serialise their own response,
    // so both are read here rather than one being assumed from the other.
    const { RETRYABLE_DROPS } = await import('./reply-pipeline')
    expect(RETRYABLE_DROPS.has('unclassified_untasked')).toBe(true)
    expect(RETRYABLE_DROPS.has('ambiguous_owner_unretained'),
      'the 17 Sep exception must not have been replaced by this one').toBe(true)

    const src = readFileSync(new URL('../routes/figsy.ts', import.meta.url), 'utf8')
    const guards = src.match(/RETRYABLE_DROPS\.has\(result\.dropped\)/g) ?? []
    expect(guards.length, 'one of the two inbound routes still decides this on its own').toBe(2)
    expect(src).toMatch(/releaseWebhookEvent\(db, dedupKey, 'resend'\)/)
    expect(src).toMatch(/releaseWebhookEvent\(db, dedupKey, 'smartlead'\)/)
  })

  it('🛑 THE TASK NAMES THE STORED ROW AND THE CLIENT THAT OWNS IT', async () => {
    state.classifierThrows = true
    await process()
    expect(state.taskCalls.length).toBe(1)
    expect(state.taskCalls[0]).toMatchObject({
      kind: 'support_escalation',
      clientId: 'client-A',        // tenant ownership — the client whose lead actually replied
      subjectKind: 'reply',
      subjectId: 'reply-1',
    })
    expect(String(state.taskCalls[0].detail)).toContain('figsy_replies reply-1')
  })

  it('🛑 A REDELIVERY RAISES THE SAME KEY, SO A RETRY IS ONE JOB AND NOT TWO', async () => {
    // First delivery: the row is written and the key names it.
    state.classifierThrows = true
    await process()
    const first = String(state.taskCalls[0].dedupeKey)

    // Redelivery: `figsy_replies`'s idempotency index refuses the second insert, so there is no
    // row id to name — and the key must still land on the same job.
    state.replyInsertLosesRace = true
    await process()
    const second = String(state.taskCalls[1].dedupeKey)

    expect(first).toBe('reply-unclassified:reply-1')
    expect(second).toBe('reply-unclassified:evt-1')
    expect(second.startsWith('reply-unclassified:'),
      'a redelivery with no row id lost its idempotent identity').toBe(true)
  })

  it('🛑 AND THE EMAIL MIRROR CANNOT FILE A SECOND ROW', async () => {
    // `support_escalation` is NEVER_DEDUPED, so the mirror would open its own task for the same
    // reply unless it carries the key of the row already raised here.
    state.classifierThrows = true
    await process()
    const mirror = state.alerts.find(a => a.subject.includes('could not be classified'))
    expect(mirror, 'the founder lost the email mirror for an unclassified reply').toBeTruthy()
    expect(mirror?.about).toMatchObject({ dedupeKey: state.taskCalls[0].dedupeKey })
  })

  it('a healthy classification raises no operator task at all', async () => {
    await process()
    expect(state.taskCalls.length, 'a working classifier put a job on somebody\'s desk').toBe(0)
  })
})
