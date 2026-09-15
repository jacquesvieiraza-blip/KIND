import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// F2 — MILLA → VIDA. TWO COLLEAGUES IN ONE COMPANY, OR TWO STRANGERS.
//
// 🛑 THE JOINT WAS NEVER TESTED. Milla's side is tested. Vida's side is tested. Nothing drove
// a client's words through Milla's real handler and then asked Vida's real handler what she
// knew — so "the client never explains their business twice" was an intention, not a fact.
//
// ⚠️ ONE STORE, BOTH SIDES. The same in-memory `onboarding_brief_drafts` double serves
// /icps/builder/chat (where the client speaks) and /operator/command (where the operator
// does). If the handoff were reading a second copy, this test would still pass with a
// hand-wired fixture — so it does not use one: what Vida sees must be what MILLA WROTE.
//
// ⚠️ AND THE THING THAT MATTERS IS THEIR WORDS, NOT OUR SHAPES. The provider-facing ICP
// columns are canonicalised against closed vocabularies; if Vida read those instead of the
// Brief, an operator would see "51–200" where the client said "small independent shops".
// ═══════════════════════════════════════════════════════════════════════════════════════

const model = vi.hoisted(() => ({ reply: null as unknown, seenSystem: [] as string[] }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (opts: { system?: string }) => {
        model.seenSystem.push(String(opts?.system ?? ''))
        return model.reply
      },
    }
  },
}))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, n: () => void) => n() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: async () => ({ delivered: true }) }))
vi.mock('../lib/operator-audit', () => ({ writeOperatorAudit: async () => {}, campaignAuditAction: () => 'noop' }))

/** ONE store. Milla writes here through her route; Vida reads here through hers. */
const world = vi.hoisted(() => ({
  drafts: {} as Record<string, { facts: Record<string, unknown>; conversation: Array<{ role: string; content: string }> }>,
  vidaThreads: {} as Record<string, Array<{ role: string; text: string; at: string }>>,
  /** clientId → userId, as the clients table relates them */
  clients: {
    'c-redmayne': { user_id: 'u-redmayne', company_name: 'Redmayne & Co.' },
    'c-northstar': { user_id: 'u-northstar', company_name: 'Northstar Revenue' },
  } as Record<string, { user_id: string; company_name: string }>,
  icps: {} as Record<string, Record<string, unknown>>,
}))

vi.mock('../lib/brief-draft', () => {
  const draft = (uid: string) => {
    const d = world.drafts[uid]
    return d ? { facts: d.facts, conversation: d.conversation, confirmedAt: null, promotedClientId: null } : null
  }
  return {
    briefDraftFor: async (uid: string) => draft(uid),
    writableBriefDraft: async (uid: string) => draft(uid),
    saveBriefDraft: async (uid: string, f: Record<string, unknown>) => {
      world.drafts[uid] ??= { facts: {}, conversation: [] }
      world.drafts[uid].facts = { ...world.drafts[uid].facts, ...f }
      return { ok: true, draft: draft(uid) }
    },
    saveBriefConversation: async (uid: string, t: Array<{ role: string; content: string }>) => {
      world.drafts[uid] ??= { facts: {}, conversation: [] }
      world.drafts[uid].conversation = t
      return { ok: true }
    },
    rememberCustomerTurn: async (uid: string, t: Array<{ role: string; content: string }>) => {
      world.drafts[uid] ??= { facts: {}, conversation: [] }
      world.drafts[uid].conversation = t
      return { ok: true }
    },
    markBriefDraftPromoted: async () => ({ ok: true }),
    mayConfirmBrief: () => ({ ok: true, missing: [] }),
    draftProgress: (d: { facts: Record<string, unknown> } | null) => ({
      count: Object.keys(d?.facts ?? {}).length, total: 11, missing: [],
    }),
    BRIEF_TRANSCRIPT_MAX_TURNS: 40,
  }
})

vi.mock('../lib/vida-conversation', () => ({
  vidaConversationFor: async (operator: string, clientId: string) => world.vidaThreads[`${operator}|${clientId}`] ?? [],
  appendVidaConversation: async (operator: string, clientId: string, turns: Array<{ role: string; text: string; at: string }>) => {
    const k = `${operator}|${clientId}`
    world.vidaThreads[k] = [...(world.vidaThreads[k] ?? []), ...turns]
    return { ok: true }
  },
  readVidaConversation: (v: unknown) => (Array.isArray(v) ? v : []),
  VIDA_MAX_TURNS: 40,
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const filters: Record<string, unknown> = {}
      const q: Record<string, unknown> = {
        select: () => q, neq: () => q, is: () => q, in: () => q, order: () => q, limit: () => q,
        insert: () => q, update: () => q, upsert: () => q,
        eq: (col: string, val: unknown) => { filters[col] = val; return q },
        async maybeSingle() {
          if (table === 'clients') {
            const id = filters.id as string
            const row = world.clients[id]
            return { data: row ? { id, ...row } : null, error: null }
          }
          if (table === 'icps') {
            const cid = filters.client_id as string
            return { data: world.icps[cid] ?? null, error: null }
          }
          return { data: null, error: null }
        },
        async single() { return { data: null, error: null } },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: [], error: null, count: 0 }).then(r) },
      }
      return q
    },
    rpc: async () => ({ data: null, error: null }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      admin: { getUserById: async () => ({ data: { user: { email: 'op@kind.test' } } }) },
    },
  },
}))

beforeEach(() => {
  world.drafts = {}
  world.vidaThreads = {}
  world.icps = {}
  model.seenSystem = []
  model.reply = null
  process.env.ANTHROPIC_API_KEY = 'test-key-not-real'
})

type Said = { role: 'user' | 'assistant'; content: string }

/** The CLIENT speaks to Milla, through the real onboarding handler. */
async function clientSaysToMilla(userId: string, messages: Said[]) {
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/builder/chat' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /icps/builder/chat not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const res = { status(c: number) { out.code = c; return res }, json(p: Record<string, unknown>) { out.payload = p; return res } }
  await handler({ body: { messages, profile_required: true }, headers: {}, params: {}, query: {}, userId }, res, () => {})
  return out
}

/** The OPERATOR speaks to Vida about that client, through the real console handler. */
async function operatorSaysToVida(operator: string, clientId: string, text: string) {
  const m = await import('./operator')
  const layer = (m.operatorRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/command' && l.route?.methods.post)
  if (!layer) throw new Error('POST /operator/command not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const res: any = { status(c: number) { out.code = c; return res }, json(p: Record<string, unknown>) { out.payload = p; return res } }
  await handler({ body: { client_id: clientId, text }, params: {}, query: {}, headers: { 'x-operator-email': operator } }, res, () => {})
  return out
}

const millaSaid = (input: unknown) => ({
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', id: 'tu_1', name: 'milla_reply', input }],
})
const vidaSaid = (text: string) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] })

/** What Ellis actually typed, and what a capable Milla reads from it. */
const ELLIS_SAID = "I'm Ellis at Redmayne & Co. We restore and sell vintage mechanical watches. "
  + 'We want independent jewellers and watch dealers across the UK and Ireland, small shops, '
  + 'owners and buying directors. Absolutely no pawnbrokers, and nobody who sells replicas.'
const MILLA_READ = {
  type: 'question',
  content: 'Got it. What would a good month look like for you?',
  brief_so_far: {
    contact_name: 'Ellis',
    company_name: 'Redmayne & Co.',
    what_they_do: 'restore and sell vintage mechanical watches',
    target_category: 'independent jewellers and watch dealers',
    geographies: ['United Kingdom', 'Ireland'],
    company_sizes: ['small independent shops'],
    job_titles: ['Owner', 'Buying Director'],
    exclusions: 'absolutely no pawnbrokers, and nobody who sells replicas',
  },
}

describe('🛑 F2 · Milla → Vida — one client, one truth', () => {
  it('F2 the client’s own words reach Vida, through the store Milla wrote', async () => {
    // ── The client talks to Milla. Nothing is hand-wired: this is her real handler.
    model.reply = millaSaid(MILLA_READ)
    const r = await clientSaysToMilla('u-redmayne', [{ role: 'user', content: ELLIS_SAID }])
    expect(r.code, JSON.stringify(r.payload)).toBe(200)
    expect(world.drafts['u-redmayne'].facts.company_name).toBe('Redmayne & Co.')

    // ── The operator opens the console and asks Vida about them.
    model.reply = vidaSaid('They want independent jewellers across the UK and Ireland.')
    const v = await operatorSaysToVida('op@kind.test', 'c-redmayne', 'remind me who these people are')
    expect(v.code, JSON.stringify(v.payload)).toBe(200)

    // ── 🛑 WHAT VIDA WAS GIVEN. Not a fixture — what Milla stored, one turn earlier.
    const sys = model.seenSystem[model.seenSystem.length - 1]
    expect(sys, 'Vida does not know who the client is').toContain('Redmayne & Co.')
    expect(sys, 'their exclusions did not survive the handoff')
      .toContain('absolutely no pawnbrokers, and nobody who sells replicas')
    expect(sys, 'their target markets did not survive the handoff').toContain('United Kingdom')
    expect(sys, 'what the client actually does is invisible to the operator')
      .toContain('restore and sell vintage mechanical watches')
    // 🛑 AND HOW THEY SAID IT. An operator about to act should read the client's sentence,
    // not only our structured summary of it.
    expect(sys, "the client's own sentence never reached Vida").toContain(ELLIS_SAID.slice(0, 40))
  })

  it('F2 a second operator on a second client sees none of it', async () => {
    model.reply = millaSaid(MILLA_READ)
    await clientSaysToMilla('u-redmayne', [{ role: 'user', content: ELLIS_SAID }])

    model.reply = millaSaid({
      type: 'question', content: 'And who should we avoid?',
      brief_so_far: { company_name: 'Northstar Revenue', exclusions: 'no recruitment agencies' },
    })
    await clientSaysToMilla('u-northstar', [{ role: 'user', content: 'We are Northstar Revenue.' }])

    model.seenSystem = []
    model.reply = vidaSaid('Here is where Northstar are.')
    await operatorSaysToVida('other@kind.test', 'c-northstar', 'how are they doing')

    const sys = model.seenSystem[model.seenSystem.length - 1]
    expect(sys).toContain('Northstar Revenue')
    // 🛑 THE LEAK THAT WOULD MATTER MOST: one client's exclusions in another's console.
    expect(sys, "Redmayne's Brief leaked into Northstar's console").not.toContain('pawnbrokers')
    expect(sys, "Redmayne's company leaked").not.toContain('Redmayne')
    expect(sys, "Redmayne's markets leaked").not.toContain('vintage mechanical watches')
  })

  it('F2 provider-shaped values never replace the customer’s own words', async () => {
    // The client said "small independent shops". The provider vocabulary has no such value,
    // so the canonical ICP column legitimately holds something else — or nothing.
    world.icps['c-redmayne'] = {
      id: 'icp-1', name: 'UK jewellers',
      company_sizes: ['11-50'],            // ← our provider shape
      geographies: ['United Kingdom'],
      job_titles: ['Owner'],
    }
    model.reply = millaSaid(MILLA_READ)
    await clientSaysToMilla('u-redmayne', [{ role: 'user', content: ELLIS_SAID }])

    model.seenSystem = []
    model.reply = vidaSaid('Their targeting is UK jewellers.')
    await operatorSaysToVida('op@kind.test', 'c-redmayne', 'what size companies do they want')

    const sys = model.seenSystem[model.seenSystem.length - 1]
    // 🛑 BOTH ARE PRESENT AND THE CLIENT'S WORDS ARE NOT OVERWRITTEN. The ICP block may show
    // our canonical value; the Brief block must still carry what they actually said, or the
    // operator agrees a target against a phrase the client never used.
    expect(sys, "the client's own words were replaced by the provider shape")
      .toContain('small independent shops')
  })
})
