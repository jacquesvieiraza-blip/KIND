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
  /** ⛓️ J4-C1 — the two artifacts server-owned promotion now also produces. */
  icps: [] as Row[],
  claims: [] as Row[],
  /** the drafts table does not exist — the migration has not been applied */
  unreadable: false,
}

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  const rows = () => (name === 'clients' ? state.clients : name === 'icps' ? state.icps : state.drafts)
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
    insert(row: Row) {
      const made = { id: `${name}-${rows().length + 1}`, ...row }
      const push = () => { rows().push(made) }
      return {
        select: () => ({
          async single() { push(); return { data: made, error: null } },
          async maybeSingle() { push(); return { data: made, error: null } },
        }),
        then(resolve: (v: unknown) => unknown) { push(); return resolve({ data: made, error: null }) },
      }
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

// ⛓️ 17 Sep (J4-C1) — `icps`, `rpc` and `auth` ADDED to the double. The confirm route is now
// server-owned promotion, so it writes an ICP and claims Proof authority through the ledger.
// The ledger emulation grants once and then refuses `in_flight`, which is `claim_proof_authority`'s
// contract and the reason a double click cannot spend a second free pass.
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn !== 'claim_proof_authority') return { data: null, error: { message: `unexpected rpc ${fn}` } }
      if (state.claims.some(c => c.client_id === args.p_client_id)) return { data: { ok: false, reason: 'in_flight' }, error: null }
      state.claims.push({ id: `claim-${state.claims.length + 1}`, client_id: args.p_client_id })
      return { data: { ok: true, claim_id: `claim-${state.claims.length}`, authority: 'free_proof', pass: 1, kind: 'automatic' }, error: null }
    },
    auth: { getUser: async () => ({ data: { user: { id: 'user-1', email: 'first@client.invalid' } }, error: null }) },
  },
}))
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
  // ⛓️ 16 Sep (S1-ONB-001) — `country` added. It is NOT a twelfth Brief fact: the eleven are
  // still eleven. It is the ACCOUNT requirement onboarding readiness now includes, and without
  // it every confirm below would be held back by the country rather than by the Brief fact
  // each case is actually named for.
  country: 'United Kingdom',
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
  // ⛓️ J4-C1 — RESET THESE TOO. Omitting them let one test's ICP leak into the next and made
  // a correct replay look like a duplicate write, which is a fixture fault dressed as a defect.
  state.icps = []
  state.claims = []
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

  // ⛓️ 17 Sep (J4-C1) — INVERTED, AND THIS IS THE POINT OF THE ITEM, NOT A BROKEN TEST.
  //
  // ~~`it('🛑 8 · eleven of eleven confirms — and creates nothing')` … `expect(state.clients,
  // 'confirming promoted somebody by itself').toEqual([])`~~
  //
  // That assertion was TRUE and RIGHT while promotion was four browser calls: confirming had
  // to create nothing, because `/auth/onboard`, `POST /icps` and `POST /icps/:id/proof` came
  // afterwards from the browser. J4-C1 is the founder-approved decision that the browser must
  // not sequence a decision at all — every gap between those four calls strands a real person.
  // So the old assertion now asserts the defect: "confirming created nothing" is exactly the
  // half-promotion this item exists to end.
  //
  // ⚠️ THE GUARANTEE IT PROTECTED IS KEPT, AND MOVED UP ONE LEVEL. What mattered was never
  // "create nothing" — it was "never create half of it". That is now asserted positively here
  // (all four artifacts) and exhaustively in `j4c1-server-owned-promotion.test.ts`, which also
  // holds the F-BROWSER, F-DUP and F-DBREAD cases. Nothing is weaker; the subject changed.
  it('🛑 8 · eleven of eleven confirms — and promotion is SERVER-OWNED from that one call', async () => {
    seedDraft(ELEVEN)
    const r = await callMillaConfirm()
    expect(r.code, JSON.stringify(r.payload)).toBe(200)
    expect(state.drafts[0].confirmed_at).toBeTruthy()
    // The client exists because the SERVER made it — no second request was sent.
    expect(state.clients, 'confirming left no client — the browser would have had to finish it').toHaveLength(1)
    expect(state.drafts[0].promoted_client_id, 'promotion was not recorded against the draft').toBe(state.clients[0].id)
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

  // ⛓️ 17 Sep (J4-C1) — 409 BECAME 200-WITH-THE-WINNER'S-IDS, and the manifest asks for it
  // in those words: *"a duplicate confirm returns the winner's ids"*.
  //
  // ~~`expect(r.code).toBe(409)`~~ was right while confirming and promoting were separate
  // acts — a second confirm genuinely had nothing to do. Now confirm IS promotion, so 409
  // would punish the normal case (a double click on a slow connection, a retry after a
  // response that never arrived) and, worse, would answer 409 FOR EVER to a client whose
  // promotion was interrupted between the client row and the ICP.
  //
  // ⚠️ THE GUARANTEE IS UNCHANGED AND ASSERTED HERE: the replay CREATES NOTHING. The draft is
  // still evidence — `promoted_at` cannot move, because `markBriefDraftPromoted` filters on
  // `.is('promoted_client_id', null)`.
  it('a replay after promotion returns the WINNER\u2019s ids and creates nothing', async () => {
    state.clients.push({ id: 'client-1', user_id: 'user-1' })
    state.icps.push({ id: 'icp-1', client_id: 'client-1', created_at: '2026-09-17T10:00:00Z' })
    seedDraft(ELEVEN, { confirmed_at: '2026-09-17T10:05:00Z', promoted_client_id: 'client-1', promoted_at: '2026-09-17T10:05:00Z' })
    const r = await callMillaConfirm()
    expect(r.code, JSON.stringify(r.payload)).toBe(200)
    const d = (r.payload.data ?? {}) as Record<string, unknown>
    expect(d.client_id).toBe('client-1')
    expect(d.icp_id).toBe('icp-1')
    expect(d.replayed).toBe(true)
    expect(state.clients, 'a second client row').toHaveLength(1)
    expect(state.icps, 'a second ICP').toHaveLength(1)
    expect(state.drafts[0].promoted_at, 'the recorded moment of promotion moved').toBe('2026-09-17T10:05:00Z')
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

  // ⛓️ 17 Sep (J4-C1) — THE SAME GUARANTEE, NOW HELD A STRONGER WAY.
  //
  // ~~`await saveBriefDraft(...); expect(confirmed_at).toBeNull()`~~ asserted that editing a
  // confirmed brief CLEARS the confirmation, so a signature could never outlive its document.
  // That mattered because there was a WINDOW: confirm stamped the seal, and promotion happened
  // minutes later from the browser, so a client could edit in between.
  //
  // J4-C1 closes the window itself. Confirming promotes in the same call, and a promoted
  // client makes the draft unwritable (`writableBriefDraft` refuses once a client row exists).
  // So the document cannot change after the signature at all — which is the guarantee, held
  // structurally rather than by a clearing rule. The clearing rule still exists for the
  // confirmed-but-unpromoted state; there is simply no longer a path into it.
  it('\u{1F6D1} the brief cannot change after it is confirmed — the window is gone, not the rule', async () => {
    seedDraft(ELEVEN)
    await callMillaConfirm()
    expect(state.drafts[0].confirmed_at).toBeTruthy()
    expect(state.clients, 'promotion did not happen, so this asserts nothing').toHaveLength(1)

    const { saveBriefDraft } = await import('../lib/brief-draft')
    const r = await saveBriefDraft('user-1', { desired_outcome: 'actually, product demos' })
    expect(r.ok, 'a promoted brief was still writable — the signature could outlive its document').toBe(false)
    expect((r as { reason?: string }).reason).toBe('promoted')
    expect(state.drafts[0].facts, 'the promoted brief was edited').toMatchObject({ desired_outcome: ELEVEN.desired_outcome })
  })
})
