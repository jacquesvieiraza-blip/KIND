import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ MVP1 — A CLOSED TAB NO LONGER COSTS THE CLIENT THEIR BRIEF.
//
// 🛑 THE HALF-FIX THIS COMPLETES. Persisting the eleven facts was necessary and not
// sufficient. `POST /icps/builder/chat` shows the model exactly one thing about the client:
// the `messages` array the browser sent, which lives in one tab. So a client who closed that
// tab came back to an empty transcript and was asked for all eleven facts AGAIN while their
// answers sat in `onboarding_brief_drafts`. Storing answers nobody reads back is bookkeeping,
// not persistence — and being re-interviewed is exactly what the founder's "one question at a
// time" rule exists to prevent.
//
// ⚠️ THE FACTS REACH THE MODEL FROM THE SERVER, NEVER FROM THE BROWSER. A client-supplied
// "here is what I already told you" would be a second mutable copy of the Brief that could
// contradict the stored one, with nothing to say which was right. These cases assert the
// route reads the DRAFT for the authenticated user and nothing else.
//
// ⚠️ AND THE RESUME BLOCK IS FIRST-RUN ONLY. A returning client with an account is refining
// their ICP, not finishing a draft; their brief is the ICP, and reading a stale draft at them
// would be a second answer about who they target.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  drafts: [] as Row[],
  clients: [] as Row[],
  /** the drafts table does not exist — the migration has not been applied */
  unreadable: false,
}

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  const rows = () => (name === 'clients' ? state.clients : state.drafts)
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    order() { return q },
    limit() { return q },
    async maybeSingle() {
      if (name !== 'clients' && state.unreadable) throw new Error(`${name} does not exist`)
      const hit = rows().filter(r => filters.every(f => f(r)))
      return { data: hit[0] ?? null, error: null }
    },
    upsert(row: Row) {
      return { select: () => ({ async maybeSingle() {
        const i = state.drafts.findIndex(r => r.user_id === row.user_id)
        const made = i >= 0 ? { ...state.drafts[i], ...row }
          : { id: 'draft-1', confirmed_at: null, promoted_client_id: null, promoted_at: null,
              created_at: '2026-09-11T14:00:00Z', updated_at: '2026-09-11T14:00:00Z', ...row }
        if (i >= 0) state.drafts[i] = made; else state.drafts.push(made)
        return { data: made, error: null }
      } }) }
    },
    update(patch: Row) {
      // ⚑ MVP1 — `confirmBriefDraft` writes CONDITIONALLY (`confirmed_at IS NULL`) and reads
      // the row back, so the update chain has to carry `.eq().is().select().maybeSingle()`.
      const uf: ((r: Row) => boolean)[] = []
      const u: Record<string, unknown> = {
        eq(c: string, v: unknown) { uf.push(r => r[c] === v); return u },
        is(c: string, v: unknown) { uf.push(r => (r[c] ?? null) === v); return u },
        select() { return u },
        async maybeSingle() {
          const hit = rows().filter(r => uf.every(f => f(r)))
          if (hit.length === 0) return { data: null, error: null }
          Object.assign(hit[0], patch)
          return { data: hit[0], error: null }
        },
        then(resolve: (v: unknown) => unknown) {
          for (const r of rows().filter(x => uf.every(f => f(x)))) Object.assign(r, patch)
          return resolve({ error: null })
        },
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) {
      return resolve({ data: rows().filter(r => filters.every(f => f(r))), error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

const anthropicBox = vi.hoisted(() => ({
  lastParams: null as null | Record<string, unknown>,
  reply: null as unknown,
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (params: Record<string, unknown>) => {
        anthropicBox.lastParams = params
        return anthropicBox.reply
      },
    }
  },
}))

const toolReply = (input: unknown) => ({
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', id: 'tu_1', name: 'milla_reply', input }],
})

/** One turn through the REAL handler, as a given user. */
async function callBuilderChat(body: Record<string, unknown>, userId: string | undefined = 'user-1') {
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/builder/chat' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /builder/chat not found on the icp router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { out.code = c; return fakeRes },
    json(p: Record<string, unknown>) { out.payload = p; return fakeRes },
  }
  await handler({ body, headers: {}, params: {}, query: {}, userId }, fakeRes, () => {})
  return out
}

const systemPrompt = (): string => String((anthropicBox.lastParams as { system?: unknown })?.system ?? '')

/** The state Preview 07 renders: ten facts held, the target's company type still missing. */
const TEN_OF_ELEVEN = {
  contact_name: 'Ellis Warner',
  company_name: 'Redmayne & Co.',
  website: 'https://redmayne.test',
  what_they_do: 'chartered surveyors for commercial landlords',
  target_category: 'Digital marketing agencies',
  geographies: ['United Kingdom'],
  company_sizes: ['11-50'],
  job_titles: ['Managing Director'],
  exclusions: 'no recruiters, no agencies under ten people',
  desired_outcome: 'booked meetings with decision makers',
}

function seedDraft(facts: Row, over: Row = {}) {
  state.drafts.push({
    id: 'draft-1', user_id: 'user-1', facts,
    confirmed_at: null, promoted_client_id: null, promoted_at: null,
    created_at: '2026-09-11T14:00:00Z', updated_at: '2026-09-11T14:00:00Z', ...over,
  })
}

beforeEach(() => {
  state.drafts = []
  state.clients = []
  state.unreadable = false
  anthropicBox.lastParams = null
  anthropicBox.reply = toolReply({ type: 'question', content: 'What kind of organisation are they?' })
  process.env.ANTHROPIC_API_KEY = 'test-key-not-a-real-one'
})

const ONE_TURN = { messages: [{ role: 'user', content: 'hello again' }], profile_required: true }

describe('the saved answers reach Milla, so she does not ask twice', () => {
  it('① a part-collected draft puts the client’s own answers in the system prompt', async () => {
    seedDraft(TEN_OF_ELEVEN)
    await callBuilderChat(ONE_TURN)
    const sys = systemPrompt()
    expect(sys).toContain('WHAT THIS CLIENT HAS ALREADY TOLD YOU')
    expect(sys).toContain('Ellis Warner')
    expect(sys).toContain('Redmayne & Co.')
    expect(sys).toContain('Digital marketing agencies')
    expect(sys).toContain('booked meetings with decision makers')
  })

  it('② and it tells her, in terms, not to ask for them again', async () => {
    seedDraft(TEN_OF_ELEVEN)
    await callBuilderChat(ONE_TURN)
    expect(systemPrompt()).toContain('DO NOT ASK FOR ANY OF THESE AGAIN')
  })

  it('③ a fact the client has NOT given is absent — it is not rendered as "unknown"', async () => {
    seedDraft(TEN_OF_ELEVEN)
    await callBuilderChat(ONE_TURN)
    const sys = systemPrompt()
    const block = sys.slice(sys.indexOf('WHAT THIS CLIENT HAS ALREADY TOLD YOU'))
    // `target_company_type` is the outstanding fact; its LABEL must not appear as a held line.
    expect(block).not.toContain('· Company type:')
  })

  it('④ lists are read back as the client would say them, not as JSON', async () => {
    seedDraft({ ...TEN_OF_ELEVEN, geographies: ['United Kingdom', 'Ireland'] })
    await callBuilderChat(ONE_TURN)
    const sys = systemPrompt()
    expect(sys).toContain('United Kingdom, Ireland')
    expect(sys).not.toContain('["United Kingdom"')
  })

  it('⑤ "we have no website" is an ANSWER and is read back as one', async () => {
    seedDraft({ ...TEN_OF_ELEVEN, website: null, website_none: true })
    await callBuilderChat(ONE_TURN)
    const sys = systemPrompt()
    const block = sys.slice(sys.indexOf('WHAT THIS CLIENT HAS ALREADY TOLD YOU'))
    expect(block).toContain('they have no website')
  })
})

describe('the block appears only when it is true and only when it is theirs', () => {
  it('⑥ no draft at all — the prompt is exactly what it was before this existed', async () => {
    await callBuilderChat(ONE_TURN)
    expect(systemPrompt()).not.toContain('WHAT THIS CLIENT HAS ALREADY TOLD YOU')
  })

  it('⑦ an EMPTY draft says nothing — a row with no answers is not a resume', async () => {
    seedDraft({})
    await callBuilderChat(ONE_TURN)
    expect(systemPrompt()).not.toContain('WHAT THIS CLIENT HAS ALREADY TOLD YOU')
  })

  it('⑧ a RETURNING client (profile_required false) is never read a draft at them', async () => {
    seedDraft(TEN_OF_ELEVEN)
    await callBuilderChat({ messages: ONE_TURN.messages, profile_required: false })
    expect(systemPrompt()).not.toContain('WHAT THIS CLIENT HAS ALREADY TOLD YOU')
  })

  it('⑨ ANOTHER user’s draft is never shown — the read is scoped to the caller', async () => {
    seedDraft(TEN_OF_ELEVEN, { user_id: 'somebody-else' })
    await callBuilderChat(ONE_TURN, 'user-1')
    const sys = systemPrompt()
    expect(sys).not.toContain('Redmayne & Co.')
    expect(sys).not.toContain('WHAT THIS CLIENT HAS ALREADY TOLD YOU')
  })

  it('⑩ an unreadable drafts table costs the client nothing — the turn still happens', async () => {
    state.unreadable = true
    const r = await callBuilderChat(ONE_TURN)
    expect(r.code).toBe(200)
    expect(systemPrompt()).not.toContain('WHAT THIS CLIENT HAS ALREADY TOLD YOU')
  })
})

describe('resume never becomes a second writable brief', () => {
  it('⑪ a PROMOTED draft is not read back at a client who already confirmed', async () => {
    // Promotion created the client and the ICP; the draft is evidence from that moment on.
    state.clients.push({ id: 'client-1', user_id: 'user-1' })
    seedDraft(TEN_OF_ELEVEN, { promoted_client_id: 'client-1', promoted_at: '2026-09-11T16:41:00Z' })
    await callBuilderChat(ONE_TURN)
    expect(systemPrompt()).not.toContain('WHAT THIS CLIENT HAS ALREADY TOLD YOU')
  })

  it('⑫ the facts are carried forward, not re-proposed — the prompt says so', async () => {
    seedDraft(TEN_OF_ELEVEN)
    await callBuilderChat(ONE_TURN)
    expect(systemPrompt()).toContain('Carry every one of them forward in "brief_so_far"')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE PORTAL'S RESUME LINE IS THE SERVER'S ANSWER, NOT A SECOND COUNT IN A SECOND APP.
//
// 🛑 `GET /milla/brief-draft` names the NEXT fact as well as the progress, because the
// alternative is the portal owning an ordered eleven-fact list of its own — which is exactly
// how Vida came to display "seven of the eight brief facts" while Milla collected eleven.
// ═══════════════════════════════════════════════════════════════════════════════════════

async function callMillaGetDraft(userId: string | undefined = 'user-1') {
  const { millaRouter } = await import('./milla')
  const layer = (millaRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/brief-draft' && l.route?.methods.get)
  if (!layer?.route) throw new Error('GET /brief-draft not found on the milla router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { out.code = c; return fakeRes },
    json(p: Record<string, unknown>) { out.payload = p; return fakeRes },
  }
  await handler({ body: {}, headers: {}, params: {}, query: {}, userId }, fakeRes, () => {})
  return out
}

type DraftPayload = {
  data: {
    draft: unknown
    progress: { count: number; total: number; missing: string[]; complete: boolean }
    next: { id: string; label: string } | null
  }
}

describe('GET /milla/brief-draft — what the portal resumes from', () => {
  it('⑬ names the next outstanding fact, with the founder’s label', async () => {
    seedDraft(TEN_OF_ELEVEN)
    const r = await callMillaGetDraft()
    const p = (r.payload as unknown as DraftPayload).data
    expect(p.progress.count).toBe(10)
    expect(p.progress.total).toBe(11)
    expect(p.next).toEqual({ id: 'company_type', label: 'Company type' })
  })

  it('⑭ a complete brief has NO next fact — and is still not confirmed', async () => {
    seedDraft({ ...TEN_OF_ELEVEN, target_company_type: 'agency' })
    const r = await callMillaGetDraft()
    const p = (r.payload as unknown as DraftPayload).data
    expect(p.progress.complete).toBe(true)
    expect(p.next).toBeNull()
    // ⚠️ COMPLETE IS NOT CONFIRMED. Nothing in this payload claims the client confirmed.
    expect((p.draft as { confirmed_at: string | null }).confirmed_at).toBeNull()
  })

  it('⑮ no draft at all answers cleanly — 0 of 11, and the FIRST fact is next', async () => {
    const r = await callMillaGetDraft()
    const p = (r.payload as unknown as DraftPayload).data
    expect(p.draft).toBeNull()
    expect(p.progress.count).toBe(0)
    expect(p.next).toEqual({ id: 'contact_name', label: 'Contact name' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ MVP1 — POST /milla/brief-draft/confirm : THE CLIENT'S OWN ACT, THROUGH THE REAL ROUTE.
//
// 🛑 THE SEQUENCE THE FOUNDER LOCKED. Eleven facts collected → the brief STAYS at Brief → the
// client reaches "Confirm my brief" → explicit confirmation → promotion → Proof. Eleven facts
// on their own start nothing, and no operator confirms on somebody's behalf.
// ═══════════════════════════════════════════════════════════════════════════════════════

async function callMillaConfirm(userId: string | undefined = 'user-1') {
  const { millaRouter } = await import('./milla')
  const layer = (millaRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/brief-draft/confirm' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /brief-draft/confirm not found on the milla router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { out.code = c; return fakeRes },
    json(p: Record<string, unknown>) { out.payload = p; return fakeRes },
  }
  await handler({ body: {}, headers: {}, params: {}, query: {}, userId }, fakeRes, () => {})
  return out
}

const ELEVEN = { ...TEN_OF_ELEVEN, target_company_type: 'agency' }

describe('⑤ 7 · 8 · the confirmation gate, server-side', () => {
  it('🛑 7 · ten of eleven is REFUSED, and the missing fact is named', async () => {
    seedDraft(TEN_OF_ELEVEN)
    const r = await callMillaConfirm()
    expect(r.code).toBe(400)
    expect(r.payload.missing).toEqual(['company_type'])
    expect(String(r.payload.error)).toContain('Company type')
    expect(state.drafts[0].confirmed_at, 'a refused confirmation stamped one anyway').toBeNull()
  })

  it('🛑 8 · eleven of eleven confirms — and creates nothing', async () => {
    seedDraft(ELEVEN)
    const r = await callMillaConfirm()
    expect(r.code).toBe(200)
    expect(state.drafts[0].confirmed_at).toBeTruthy()
    expect(state.clients, 'confirming promoted somebody by itself').toEqual([])
  })

  it('🛑 6 · and eleven facts UNCONFIRMED is a real, reachable state', async () => {
    seedDraft(ELEVEN)
    // Nothing has been called. The brief is complete and the client has not agreed.
    expect(state.drafts[0].confirmed_at).toBeNull()
  })

  it('is idempotent — a double click keeps the FIRST moment of agreement', async () => {
    seedDraft(ELEVEN)
    await callMillaConfirm()
    const first = state.drafts[0].confirmed_at
    const again = await callMillaConfirm()
    expect(again.code).toBe(200)
    expect(state.drafts[0].confirmed_at).toBe(first)
  })

  it('409 once promotion has happened — the draft is evidence now', async () => {
    state.clients.push({ id: 'client-1', user_id: 'user-1' })
    seedDraft(ELEVEN, { promoted_client_id: 'client-1' })
    const r = await callMillaConfirm()
    expect(r.code).toBe(409)
  })

  it('404 when there is nothing to confirm — a journey that predates drafts', async () => {
    const r = await callMillaConfirm()
    expect(r.code).toBe(404)
  })

  it('🛑 it is scoped to the caller — nobody confirms somebody else’s brief', async () => {
    seedDraft(ELEVEN, { user_id: 'somebody-else' })
    const r = await callMillaConfirm('user-1')
    expect(r.code).toBe(404)
    expect(state.drafts[0].confirmed_at, 'another user’s brief was confirmed').toBeNull()
  })

  it('🛑 5 · confirmation is NOT counted as a twelfth fact', async () => {
    seedDraft(ELEVEN)
    await callMillaConfirm()
    const r = await callMillaGetDraft()
    const p = (r.payload as unknown as DraftPayload).data
    expect(p.progress.count).toBe(11)
    expect(p.progress.total).toBe(11)
  })

  it('🛑 and changing the brief afterwards clears it — the signature cannot outlive its document', async () => {
    seedDraft(ELEVEN)
    await callMillaConfirm()
    expect(state.drafts[0].confirmed_at).toBeTruthy()
    const { saveBriefDraft } = await import('../lib/brief-draft')
    await saveBriefDraft('user-1', { desired_outcome: 'actually, product demos' })
    expect(state.drafts[0].confirmed_at, 'the brief moved and the confirmation stayed').toBeNull()
  })
})
