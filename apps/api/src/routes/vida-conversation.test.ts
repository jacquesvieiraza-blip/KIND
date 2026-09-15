import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// F6 — VIDA IS A COLLEAGUE, NOT A HELP WIDGET. Driven through the REAL /operator/command.
//
// 🛑 "SHE IS MODEL-BACKED NOW" IS NOT THE CLAIM. Connecting Sonnet to a route proves nothing
// about whether the route can carry a conversation: the five regexes could have been replaced
// by a model call that still dropped context, still answered with a canned sentence, still
// executed something nobody approved. What is asserted here is what the ROUTE does with a
// model turn — what it PROPOSES, what it PERSISTS, and what it refuses to do.
//
// ⚠️ NOT ONE ASSERTION IS ABOUT HER WORDING. The model is a double; its sentences are ours,
// so asserting them would be asserting the fixture. Whether she *sounds* like a colleague is
// the live eval's question and the founder's preview walk's answer.
// ═══════════════════════════════════════════════════════════════════════════════════════

const model = vi.hoisted(() => ({ reply: null as unknown, seenSystem: [] as string[], seenMessages: [] as any[] }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (opts: { system?: string; messages?: unknown[] }) => {
        model.seenSystem.push(String(opts?.system ?? ''))
        model.seenMessages.push(opts?.messages ?? [])
        return model.reply
      },
    }
  },
}))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, n: () => void) => n() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: async () => ({ delivered: true }) }))
vi.mock('../lib/operator-audit', () => ({ writeOperatorAudit: async () => {}, campaignAuditAction: () => 'noop' }))

const world = vi.hoisted(() => ({
  thread: [] as Array<{ role: string; text: string; at: string }>,
  appended: [] as Array<{ role: string; text: string }>,
  brief: {
    company_name: 'Redmayne & Co.', what_they_do: 'restore and sell vintage watches',
    exclusions: 'no pawnbrokers', geographies: ['United Kingdom'],
  } as Record<string, unknown>,
}))
vi.mock('../lib/vida-conversation', () => ({
  vidaConversationFor: async () => world.thread,
  appendVidaConversation: async (_o: string, _c: string, turns: Array<{ role: string; text: string }>) => {
    world.appended.push(...turns); world.thread.push(...(turns as any)); return { ok: true }
  },
  readVidaConversation: (v: unknown) => (Array.isArray(v) ? v : []),
  VIDA_MAX_TURNS: 40,
}))
vi.mock('../lib/brief-draft', () => ({
  briefDraftFor: async () => ({ facts: world.brief, conversation: [{ role: 'user', content: 'Pawnbrokers are the whole business gone.' }] }),
  draftProgress: () => ({ count: 4, total: 11, missing: ['desired_outcome'] }),
}))
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const f: Record<string, unknown> = {}
      const q: Record<string, unknown> = {
        select: () => q, neq: () => q, is: () => q, in: () => q, order: () => q, limit: () => q,
        insert: () => q, update: () => q, upsert: () => q,
        eq: (c: string, v: unknown) => { f[c] = v; return q },
        async maybeSingle() {
          if (t === 'clients') return { data: { id: 'c-1', company_name: 'Redmayne & Co.', user_id: 'u-1' }, error: null }
          return { data: null, error: null }
        },
        async single() { return { data: null, error: null } },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: [], error: null, count: 0 }).then(r) },
      }
      return q
    },
    rpc: async () => ({ data: null, error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'op@kind.test' } } }) } },
  },
}))

const KEY = process.env.ANTHROPIC_API_KEY
beforeEach(() => {
  world.thread = []; world.appended = []
  model.reply = null; model.seenSystem = []; model.seenMessages = []
  process.env.ANTHROPIC_API_KEY = 'test-key-not-real'
})
afterEach(() => { if (KEY === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = KEY })

async function operatorSays(text: string) {
  const m = await import('./operator')
  const layer = (m.operatorRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/command' && l.route?.methods.post)
  if (!layer) throw new Error('POST /operator/command not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: any } = { code: 200, payload: {} }
  const res: any = { status(c: number) { out.code = c; return res }, json(p: unknown) { out.payload = p; return res } }
  await handler({ body: { client_id: 'c-1', text }, params: {}, query: {}, headers: { 'x-operator-email': 'op@kind.test' } }, res, () => {})
  return out
}

const says = (text: string, tool?: { name: string; input: unknown }) => ({
  stop_reason: tool ? 'tool_use' : 'end_turn',
  content: [
    ...(text ? [{ type: 'text', text }] : []),
    ...(tool ? [{ type: 'tool_use', id: 't1', name: tool.name, input: tool.input }] : []),
  ],
})

describe('🛑 F6 · Vida carries a conversation', () => {
  it('F6 an unexpected request is answered, not routed', async () => {
    // The old engine had five patterns and a dead end for everything else. This sentence
    // matches none of them.
    model.reply = says('They have not booked anything since the second batch went out.')
    const r = await operatorSays('why has nothing landed for these guys in a fortnight')
    expect(r.code).toBe(200)
    expect(r.payload.success).toBe(true)
    expect(String(r.payload.reply)).toBeTruthy()
    expect(r.payload.proposal, 'a question produced a button').toBeFalsy()
  })

  it('F6 a plain question is answered and persisted as a turn', async () => {
    model.reply = says('Four of the eleven Brief facts are in.')
    await operatorSays('how far through onboarding are they')
    expect(world.appended.map(t => t.role)).toEqual(['operator', 'vida'])
    expect(world.appended[0].text).toBe('how far through onboarding are they')
  })

  it('F6 a correction lands as a fresh proposal, not a merge of the old one', async () => {
    model.reply = says('Sixty it is.', { name: 'propose_sourcing', input: { count: 40 } })
    await operatorSays('source 40')
    model.reply = says('Make that sixty.', { name: 'propose_sourcing', input: { count: 60 } })
    const r = await operatorSays('actually make it 60')
    expect(r.payload.proposal.kind).toBe('propose_sourcing')
    expect(r.payload.proposal.input.count).toBe(60)
  })

  it('F6 two requests in one message produce ONE proposal and a sentence', async () => {
    // ⚠️ `disable_parallel_tool_use` is not set on this route, so the guard that matters is
    // that the ROUTE reads exactly one proposal and still returns her words.
    model.reply = says('Sourcing forty, and I will draft the note after.', { name: 'propose_sourcing', input: { count: 40 } })
    const r = await operatorSays('pull 40 more and write to them about the approval')
    expect(r.payload.proposal.kind).toBe('propose_sourcing')
    expect(String(r.payload.reply)).toContain('draft the note')
  })

  it('F6 ambiguity is a question — no button appears', async () => {
    model.reply = says('Do you mean the jewellers list or the dealers list?')
    const r = await operatorSays('top up the list')
    expect(r.payload.proposal, 'an ambiguous request produced an action').toBeFalsy()
    expect(String(r.payload.reply)).toBeTruthy()
  })

  it('F6 she is given the programme and pipeline context, and the prior thread', async () => {
    world.thread = [
      { role: 'operator', text: 'are we sending for them', at: '2026-09-14T09:00:00Z' },
      { role: 'vida', text: 'Yes, the second batch went out on Tuesday.', at: '2026-09-14T09:00:01Z' },
    ]
    model.reply = says('Still the same batch.')
    await operatorSays('and since then?')
    // The earlier exchange is replayed to the model — she is not starting again.
    const msgs = model.seenMessages[model.seenMessages.length - 1]
    expect(msgs.map((m: any) => m.content)).toContain('are we sending for them')
    expect(msgs[msgs.length - 1].content).toBe('and since then?')
  })

  it('F6 🛑 SHE PROPOSES AND NOTHING EXECUTES — no tool takes a client id', async () => {
    const { VIDA_TOOLS } = await import('../lib/vida-brain')
    for (const t of VIDA_TOOLS) {
      const props = Object.keys((t.input_schema as { properties: Record<string, unknown> }).properties)
      expect(props, `${t.name} accepts a client id — the model could name the wrong client`)
        .not.toContain('client_id')
      expect(props).not.toContain('clientId')
    }
    // And the route writes nothing anybody has to undo: a sourcing proposal reaches the
    // operator's preview, never a provider.
    model.reply = says('Here is forty.', { name: 'propose_sourcing', input: { count: 5000 } })
    const r = await operatorSays('source five thousand')
    // 🛑 BOUNDED TO SOMETHING A PERSON CAN CONFIRM. "5000" is real money.
    expect(r.payload.proposal.input.count).toBeLessThanOrEqual(200)
    const op = (await import('fs')).readFileSync(
      (await import('path')).join(process.cwd(), 'apps/api/src/routes/operator.ts'), 'utf8')
    const from = op.indexOf("operatorRouter.post('/command'")
    const route = op.slice(from, op.indexOf('operatorRouter.', from + 10))
    // ⚠️ THE ASSERTION IS ON WRITES, NOT ON WORDS. A first cut matched /enrol/ and failed on
    // `db.from('figsy_enrollments').select(count)` — a READ that tells her how many are
    // sending. Banning a table's NAME would forbid her knowing things, which is the opposite
    // of the build. What must never appear is a mutation or a send.
    const MUTATIONS = /\.from\('(?!vida_conversations|operator_audit)[a-z_]+'\)[\s\S]{0,160}\.(insert|update|upsert|delete)\(/g
    const writes = route.match(MUTATIONS) ?? []
    expect(writes, `the Vida route now mutates: ${writes.join(' | ')}`).toEqual([])
    for (const forbidden of ['sendOutreach', 'sendDay1OutreachBatch', 'autoEnrollLead', 'stripe', 'createCheckout']) {
      expect(route, `the Vida route can now ${forbidden}`).not.toContain(forbidden)
    }
  })
})
