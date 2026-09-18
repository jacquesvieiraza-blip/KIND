import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// F3 — LEAVING AND COMING BACK. THE CLIENT MUST NOT MEET A NEW MILLA.
//
// 🛑 WHAT THIS TESTS THAT NOTHING ELSE DID. The pieces were each covered: the draft store
// has unit tests, the welcome page has source pins, the route has route tests. What was
// never driven is the ACTUAL LOOP — speak to the real handler, read back through the real
// GET, and speak again — which is the only shape in which "she remembered" is a fact rather
// than three separate hopes.
//
// ⚠️ THE READ-BACK IS THE REAL `GET /milla/brief-draft`, not a peek at the store. That route
// is what the browser calls on arrival; if it dropped the transcript or the progress, every
// store-level test would still pass while the client met a stranger.
// ═══════════════════════════════════════════════════════════════════════════════════════

const model = vi.hoisted(() => ({ reply: null as unknown, fail: null as unknown, seenSystem: [] as string[] }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (opts: { system?: string }) => {
        model.seenSystem.push(String(opts?.system ?? ''))
        if (model.fail) throw model.fail
        return model.reply
      },
    }
  },
}))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, n: () => void) => n() }))
vi.mock('@kind/db', () => ({
  db: {
    from: () => { throw new Error('these routes must not touch the database directly') },
    rpc: () => { throw new Error('no direct database') },
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  },
}))

const store = vi.hoisted(() => ({
  facts: {} as Record<string, unknown>,
  conversation: [] as Array<{ role: string; content: string }>,
  confirmedAt: null as string | null,
}))
vi.mock('../lib/brief-draft', async () => {
  // ⚠️ THE REAL COUNTER AND THE REAL LABELS. `draftProgress` is shared product code; faking
  // it here would let the route agree with a double about completeness while disagreeing
  // with every other surface.
  const shared = await import('@kind/shared')
  const draft = () => ({
    facts: store.facts, conversation: store.conversation,
    confirmedAt: store.confirmedAt, promotedClientId: null,
  })
  return {
    briefDraftFor: async () => draft(),
    writableBriefDraft: async () => draft(),
    saveBriefDraft: async (_u: string, f: Record<string, unknown>) => {
      store.facts = { ...store.facts, ...f }
      store.confirmedAt = null      // changing the facts un-confirms, exactly as the real one does
      return { ok: true, draft: draft() }
    },
    saveBriefConversation: async (_u: string, t: Array<{ role: string; content: string }>) => {
      store.conversation = t; return { ok: true }
    },
    rememberCustomerTurn: async (_u: string, t: Array<{ role: string; content: string }>) => {
      store.conversation = t; return { ok: true }
    },
    markBriefDraftPromoted: async () => ({ ok: true }),
    mayConfirmBrief: () => ({ ok: true, missing: [] }),
    draftProgress: (d: { facts: Record<string, unknown> } | null) =>
      shared.briefFacts(shared.briefFactsFromDraft(d?.facts ?? {})),
    BRIEF_TRANSCRIPT_MAX_TURNS: 40,
  }
})

beforeEach(() => {
  store.facts = {}; store.conversation = []; store.confirmedAt = null
  model.reply = null; model.fail = null; model.seenSystem = []
})

type Said = { role: 'user' | 'assistant'; content: string }

async function speak(messages: Said[]) {
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/builder/chat' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /icps/builder/chat not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const res = { status(c: number) { out.code = c; return res }, json(p: Record<string, unknown>) { out.payload = p; return res } }
  await handler({ body: { messages, profile_required: true }, headers: {}, params: {}, query: {}, userId: 'u-1' }, res, () => {})
  return out
}

/** 🛑 THE BROWSER'S ARRIVAL CALL. This is what a refresh actually does. */
async function comeBack() {
  const { millaRouter } = await import('./milla')
  const layer = (millaRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/brief-draft' && l.route?.methods.get)
  if (!layer?.route) throw new Error('GET /milla/brief-draft not found — re-entry has no door')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: any } = { code: 200, payload: {} }
  const res = { status(c: number) { out.code = c; return res }, json(p: unknown) { out.payload = p; return res } }
  await handler({ headers: {}, params: {}, query: {}, userId: 'u-1' }, res, () => {})
  return out.payload?.data
}

const millaSaid = (input: unknown) => ({
  stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 't1', name: 'milla_reply', input }],
})
const q = (content: string, brief_so_far: Record<string, unknown> = {}) =>
  millaSaid({ type: 'question', content, brief_so_far })
const user = (content: string): Said => ({ role: 'user', content })

const HELD = {
  contact_name: 'Ellis', company_name: 'Redmayne & Co.', website: 'https://redmayne.co.uk',
  what_they_do: 'restore and sell vintage watches', target_category: 'independent jewellers',
  target_company_type: 'retail businesses',
  geographies: ['United Kingdom', 'Ireland'], company_sizes: ['1-10'],
  job_titles: ['Owner'], seniority_levels: ['Owner'],
  exclusions: 'no pawnbrokers', desired_outcome: 'calls with buyers',
}

describe('🛑 F3 · she is the same person when they come back', () => {
  it('F3 after one turn — the transcript and the facts are there', async () => {
    model.reply = q('And who should we avoid?', { company_name: 'Redmayne & Co.', contact_name: 'Ellis' })
    await speak([user('I am Ellis at Redmayne & Co.')])

    const back = await comeBack()
    expect(back.draft.facts.company_name).toBe('Redmayne & Co.')
    expect(back.conversation.map((t: Said) => t.content)).toContain('I am Ellis at Redmayne & Co.')
    // 🛑 AND THE SERVER, NOT THE BROWSER, KNOWS WHAT IS STILL MISSING.
    expect(back.progress.count).toBeGreaterThan(0)
    expect(back.next).toBeTruthy()
  })

  it('F3 after five turns — nothing from turn one is lost', async () => {
    const turns: Said[] = []
    const reads = [
      { contact_name: 'Ellis' },
      { company_name: 'Redmayne & Co.' },
      { what_they_do: 'restore and sell vintage watches' },
      { geographies: ['United Kingdom', 'Ireland'] },
      { exclusions: 'no pawnbrokers' },
    ]
    for (let i = 0; i < reads.length; i++) {
      turns.push(user(`turn ${i + 1}`))
      model.reply = q(`answer ${i + 1}`, reads[i])
      await speak([...turns])
      turns.push({ role: 'assistant', content: `answer ${i + 1}` })
    }
    const back = await comeBack()
    expect(back.draft.facts.contact_name, 'turn one was lost by turn five').toBe('Ellis')
    expect(back.draft.facts.exclusions).toBe('no pawnbrokers')
    expect(back.draft.facts.geographies).toEqual(['United Kingdom', 'Ireland'])
    expect(back.conversation.length).toBeGreaterThanOrEqual(5)
  })

  it('F3 after a provider failure — their message is waiting for them', async () => {
    model.reply = q('And where do you sell?', { company_name: 'Redmayne & Co.' })
    await speak([user('We are Redmayne & Co.')])

    model.fail = Object.assign(new Error('down'), { name: 'APIConnectionError' })
    const failed = await speak([
      user('We are Redmayne & Co.'),
      { role: 'assistant', content: 'And where do you sell?' },
      user('UK and Ireland, and never pawnbrokers.'),
    ])
    expect(failed.code).toBe(503)

    // 🛑 THEY REFRESH. Their sentence is on the server, not only in a tab they just closed.
    const back = await comeBack()
    expect(back.conversation.map((t: Said) => t.content))
      .toContain('UK and Ireland, and never pawnbrokers.')
    expect(back.draft.facts.company_name, 'a failed turn erased an earlier fact').toBe('Redmayne & Co.')
  })

  it('F3 at confirmation — coming back does not lose the confirmed state or the facts', async () => {
    store.facts = { ...HELD }
    store.confirmedAt = '2026-09-14T10:00:00Z'
    const back = await comeBack()
    expect(back.draft.confirmed_at).toBe('2026-09-14T10:00:00Z')
    expect(back.draft.facts.exclusions).toBe('no pawnbrokers')
    expect(back.progress.count).toBe(11)
    expect(back.next, 'a complete brief still reports something outstanding').toBeNull()
  })

  it('F3 correcting a fact after returning — the correction wins and the rest survives', async () => {
    store.facts = { ...HELD }
    store.conversation = [{ role: 'user', content: 'We are Redmayne & Co.' }]

    model.reply = q('Understood — Ireland is off.', { geographies: ['United Kingdom'] })
    await speak([user('Actually drop Ireland, UK only now.')])

    const back = await comeBack()
    expect(back.draft.facts.geographies).toEqual(['United Kingdom'])
    expect(back.draft.facts.exclusions, 'a geography correction damaged the exclusions').toBe('no pawnbrokers')
    expect(back.draft.facts.contact_name).toBe('Ellis')
    // 🛑 AND CHANGING THE FACTS UN-CONFIRMED THE BRIEF — a signature on a document that
    // moved underneath it is not a signature.
    expect(back.draft.confirmed_at).toBeNull()
  })

  it('F3 the resumed prompt carries the durable Brief, and the screen does not start again', () => {
    // ── The server half: the desk chat and the targeting door both read the stored Brief.
    const millaLib = readFileSync(join(process.cwd(), 'apps/api/src/lib/milla.ts'), 'utf8')
    expect(millaLib).toContain('briefDraftFor')
    const icps = readFileSync(join(process.cwd(), 'apps/api/src/routes/icps.ts'), 'utf8')
    // ⛓️ 18 Sep (MVP1 · J6-C2) — `currentBlock` joined the concatenation. The property this
    // asserts is unchanged and is asserted more directly: the durable Brief still reaches the
    // model on the targeting door. What is added beside it is the client's LIVE ICP, because
    // the prompt tells the model to "start from what they already have" and this door had
    // never read it.
    expect(icps).toMatch(/system: system \+ [^\n]*briefBlock/)
    expect(icps, 'the Brief block stopped being built at all').toContain('briefBlock = describeBriefMemory(')

    // ── The browser half: the welcome page REPLACES the untouched greeting, never appends.
    // ⚠️ A SOURCE PIN, AND IT IS THE HONEST KIND. There is no DOM here; what this protects is
    // the shape that stops a returning client seeing two welcomes and a conversation that
    // looks like it happened to somebody else.
    const page = readFileSync(
      join(process.cwd(), 'apps/portal/src/app/(milla)/milla/welcome/page.tsx'), 'utf8')
    const code = page.split('\n').filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*')).join('\n')
    expect(code, 'the stored transcript is no longer restored').toContain('conversation')
    expect(code, 'the resume line no longer counts at the client').not.toMatch(/\$\{count\}\s*of\s*\$\{total\}/)
    expect(code).toContain('resumeGreeting')
  })
})
