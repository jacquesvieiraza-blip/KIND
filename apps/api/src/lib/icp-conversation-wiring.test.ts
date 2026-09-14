// ═══════════════════════════════════════════════════════════════════════════════════════
// THE ICP SYSTEM WAS BUILT. IT WAS NOT REACHABLE.
//
// ── WHAT THE FOUNDER HIT ON THE LIVE SITE ───────────────────────────────────────────────
//
// House: 10 meetings, SOURCING_AUTHORISED, P1 internally authorised, no ICP attached. He
// pressed **Build the ICP**, typed the whole target into Vida's command bar, and got a
// sentence back telling him to go and define it somewhere else. **Open →** took him to the
// Inbox. The ICP tab offered *Refine it by talking* and *Fill the form* — no way to start a
// new definition, and three retired ICPs on screen.
//
// ── WHAT WAS ACTUALLY WRONG, AND IT WAS NOT THE ICP SYSTEM ──────────────────────────────
//
//   ① `/operator/command` matched `/icp|target|persona|who/`, returned CANNED PROSE and threw
//      the operator's sentence away. The link it produced was `/vida?client=<id>` — no tab, no
//      mode — and `tab` is initialised to 'Inbox'. So "Open" could never open the ICP builder.
//   ② `icps.length === 0 ? 'Build the ICP by talking' : 'Refine it by talking'` — ONE button
//      with a conditional label. Any history at all removed fresh creation from the screen.
//   ③ `/operator/icp/chat` seeded the ACTIVE ICP unconditionally and said "change only what
//      the operator asks about". There was no way to ask for a new one.
//   ④ Vida's prompt never received #1444's discipline. Its opener read "industry, titles,
//      seniority, size, region" — five targeting fields in one line, on screen, before the
//      model said a word. That is the filter form #1444 exists to forbid.
//
// 🛑 NO NEW ENGINE, NO NEW PARSER, NO NEW SCHEMA. Every capability already existed. What is
// proved here is that it is now REACHABLE, that fresh and refine are different conversations
// over the same engine, and that saving one still does nothing to a programme.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: { clients: Row[]; icps: Row[]; programmes: Row[]; campaigns: Row[]; leads: Row[] } =
  { clients: [], icps: [], programmes: [], campaigns: [], leads: [] }
/** Every write any route attempted. A refusal that still wrote would pass a status check. */
const writes: Array<{ op: string; table: string; row: Row }> = []
/** Every table any route READ. Proves a fresh build never even looks at the old ICPs. */
const reads: string[] = []

function table(name: string) {
  const rows = (): Row[] =>
    name === 'icps' ? state.icps : name === 'programmes' ? state.programmes
    : name === 'figsy_campaigns' ? state.campaigns : name === 'leads' ? state.leads
    : state.clients
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _limit: 0, _ins: null as Row | null,
    select() { reads.push(name); return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    neq(c: string, v: unknown) { q._f.push((r: Row) => r[c] !== v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    not() { return q }, gte() { return q }, lte() { return q },
    order() { return q }, limit(n: number) { q._limit = n; return q },
    insert(v: Row | Row[]) {
      const row = { id: `new-${name}-${rows().length + 1}`, ...(Array.isArray(v) ? v[0] : v) } as Row
      writes.push({ op: 'insert', table: name, row }); q._ins = row; rows().push(row); return q
    },
    update(v: Row) {
      writes.push({ op: 'update', table: name, row: v })
      for (const r of rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r)))) Object.assign(r, v)
      return q
    },
    _hit() {
      const all = rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r)))
      return q._limit > 0 ? all.slice(0, q._limit) : all
    },
    async maybeSingle() { return { data: q._ins ?? q._hit()[0] ?? null, error: null } },
    async single() { return { data: q._ins ?? q._hit()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) {
      return Promise.resolve({ data: q._hit(), error: null, count: q._hit().length }).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async () => ({ data: null, error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'op@kind.test' } } }) } },
  },
}))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
// `routes/operator` pulls in `routes/icps`, which constructs a Supabase client at import time.
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))

/** The single Anthropic call, captured so the SYSTEM PROMPT itself can be asserted. */
const seenSystem: string[] = []
/** And the user turns, so "his whole sentence arrived" is an assertion, not a hope. */
const seenMessages: Array<Array<{ role: string; content: string }>> = []
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (opts: { system?: string; messages?: Array<{ role: string; content: string }> }) => {
        seenSystem.push(String(opts.system ?? ''))
        seenMessages.push((opts.messages ?? []).map(m => ({ role: String(m.role), content: String(m.content) })))
        // ⛓️ 14 Sep (R121, Build 3) — ~~a `text` block carrying JSON.stringify({message, icp})~~.
        // Vida answers through a TOOL now, like Milla, so the double returns what the route
        // actually reads: her sentence as text, her proposal as a `propose_icp_change` call.
        // The JSON-text engine — "Reply with ONLY valid JSON", the enum menu read out inline,
        // `JSON.parse` with a canned fallback sentence — is gone from the product.
        return { content: [
          { type: 'text', text: 'What does the client actually sell?' },
          { type: 'tool_use', id: 't1', name: 'propose_icp_change', input: {
            name: 'UK + US founder-led agencies', industries: ['Consulting'], job_titles: ['Founder'],
            seniority_levels: ['C-Suite'], company_sizes: [], geographies: ['United Kingdom', 'United States'],
            tech_stack: [], keywords: [],
          } },
        ] }
      },
    }
  },
}))

const CLIENT = 'c-house'
const PROG = 'p-house'
const ADMIN = 'test-admin-key'

async function callOperator(method: 'post', path: string, body: Row) {
  const m = await import('../routes/operator')
  const layer = (m.operatorRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer) throw new Error(`${method.toUpperCase()} ${path} not found`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: any = null; let status = 200
  const res: any = { json: (b: unknown) => { payload = b }, status: (s: number) => { status = s; return res } }
  await handler({ body, params: {}, query: {}, headers: { 'x-admin-key': ADMIN } }, res, () => {})
  return { payload, status }
}

/** House exactly as it stands: three retired ICPs, a live programme, nothing attached. */
function house() {
  state.clients.push({ id: CLIENT, company_name: 'House', industry: 'Consulting', country: 'United Kingdom', commercial_model: 'programme' })
  for (const n of [1, 2, 3]) {
    state.icps.push({
      id: `icp-old-${n}`, client_id: CLIENT, programme_id: null, name: `Retired ICP ${n}`,
      industries: ['Logistics'], job_titles: ['COO'], seniority_levels: ['C-Suite'],
      company_sizes: ['51–200'], geographies: ['South Africa'], tech_stack: [], keywords: [],
      is_active: n === 3, created_at: `2026-0${n}-01`,
    })
  }
  state.programmes.push({
    id: PROG, client_id: CLIENT, status: 'SOURCING_AUTHORISED', meeting_target: 10,
    recommended_volume: 2500, sourcing_ceiling: 2500, first_authorised_at: 'a',
    first_paid_at: null, first_payment_ref: null, second_authorised_at: null,
    second_paid_at: null, second_payment_ref: null, paused_at: null, went_live_at: null,
    approved_at: null, icp_id: null,
  })
}
const snapshot = () => JSON.parse(JSON.stringify(state.icps.filter(i => String(i.id).startsWith('icp-old'))))

beforeEach(() => {
  state.clients = []; state.icps = []; state.programmes = []; state.campaigns = []; state.leads = []
  writes.length = 0; reads.length = 0; seenSystem.length = 0; seenMessages.length = 0
  process.env.ADMIN_KEY = ADMIN
  process.env.ANTHROPIC_API_KEY = 'test-key'
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① FRESH IS A DIFFERENT CONVERSATION, NOT A DIFFERENT ENGINE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① build a NEW ICP by talking', () => {
  beforeEach(house)

  it('the fixture is House-shaped — 3 retired ICPs, an authorised programme, nothing attached', () => {
    expect(state.icps).toHaveLength(3)
    expect(state.icps.filter(i => i.is_active)).toHaveLength(1)
    expect(state.programmes[0].status).toBe('SOURCING_AUTHORISED')
    expect(state.programmes[0].icp_id).toBeNull()
  })

  it('🛑 A FRESH BUILD NEVER READS THE EXISTING ICPs — the seed is skipped, not filtered', async () => {
    const r = await callOperator('post', '/icp/chat', {
      client_id: CLIENT, fresh: true,
      message: 'Founder-led B2B agencies and consultancies in the UK and United States',
    })
    expect(r.status).toBe(200)
    expect(reads, 'the icps table is not read at all on a fresh build').not.toContain('icps')
    expect(seenSystem[0], 'and nothing from a retired ICP reaches the prompt').not.toContain('Retired ICP')
    expect(seenSystem[0]).not.toContain('South Africa')
    // ⛓️ 14 Sep (R121, Build 3) — the wording moved into `buildVidaSystem`'s fresh block.
    // The CLAIM is unchanged: no existing ICP is read, and none reaches the prompt.
    expect(seenSystem[0]).toContain('THIS IS A BRAND-NEW PROFILE')
  })

  it('🛑 IT MUTATES NOTHING — a conversation is not a write', async () => {
    const before = snapshot()
    await callOperator('post', '/icp/chat', { client_id: CLIENT, fresh: true, message: 'UK and US agencies' })
    expect(writes).toHaveLength(0)
    expect(snapshot()).toEqual(before)
  })

  it('🛑 IT RETURNS A PROPOSAL, AND THE PROPOSAL IS NOT SAVED', async () => {
    const r = await callOperator('post', '/icp/chat', { client_id: CLIENT, fresh: true, message: 'UK and US agencies' })
    expect(r.payload.data.icp.name).toBe('UK + US founder-led agencies')
    expect(r.payload.data.icp_id, 'a fresh build proposes against no existing row').toBeNull()
    expect(state.icps, 'still three').toHaveLength(3)
  })

  it('🛑 REFINE IS UNCHANGED — it still seeds the active ICP', async () => {
    await callOperator('post', '/icp/chat', { client_id: CLIENT, message: 'make it US only' })
    expect(reads).toContain('icps')
    // ⛓️ 14 Sep (R121, Build 3) — ~~'Their CURRENT active ICP is'~~ followed by a JSON blob.
    // The live targeting is rendered as readable lines now, beside the client's own words.
    // The claim — refine SEEDS from the active ICP — is unchanged and is asserted on more:
    // its name reaches her, and so does the market it targets.
    expect(seenSystem[0]).toContain('THEIR LIVE TARGETING')
    expect(seenSystem[0]).toContain('Retired ICP 3')
    expect(seenSystem[0]).toContain('South Africa')
    expect(writes, 'refining writes nothing either').toHaveLength(0)
  })

  it('🛑 TENANCY — another client’s ICP can never be seeded', async () => {
    state.clients.push({ id: 'c-other', company_name: 'Other' })
    state.icps.push({ id: 'icp-other', client_id: 'c-other', name: 'Other ICP', is_active: true, geographies: ['Mars'] })
    await callOperator('post', '/icp/chat', { client_id: CLIENT, message: 'change it' })
    expect(seenSystem[0]).not.toContain('Other ICP')
    expect(seenSystem[0]).not.toContain('Mars')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② ⛓️ RETIRED 14 Sep (R121, BUILD 3) — THERE IS NO SECOND ENGINE LEFT TO KEEP IN STEP.
//
// 🛑 WHAT ② AND ③ USED TO PROVE, AND WHY THEY NO LONGER CAN.
//
// ② asserted that #1444's conversation discipline was WELDED into Vida's ICP prompt:
// `lib/icp-conversation-rules.ts` held the authored copy, Milla's route held the original,
// and a test compared them verbatim so neither could drift. It was a good answer to the
// problem it had — TWO conversational engines with two prompts — and Build 3 removed the
// problem instead of maintaining the weld. Vida's ICP surface is now the SAME Vida: one
// `buildVidaSystem`, one set of tools, the client's own words in front of her. There is no
// second copy left to drift.
//
// ③ asserted that `/operator/command` classified "icp|target|persona|who" and HANDED OFF to
// the ICP conversation carrying the operator's sentence. That handoff existed because the
// router could not answer — it was five regexes. Vida answers now, so the sentence does not
// need carrying anywhere: she is already in the conversation it was typed into.
//
// ⚠️ WHAT REPLACES THEM IS NOT SMALLER. The properties both describes protected are asserted
// in `vida-brain.test.ts` — no keyword router in the server OR the browser, one prompt
// builder, the client's own words reaching her, no cross-client leak, every tool a proposal.
// What is gone is the pair of mechanisms, not the guarantees.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② one Vida, and the operator reaches her without saying a magic word', () => {
  const API = join(__dirname, '..')
  const opSrc = readFileSync(join(API, 'routes/operator.ts'), 'utf8')
  const liveOf = (s: string) => s.split('\n')
    .filter(l => { const t = l.trimStart(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
    .join('\n')
  const slice = (path: string) => {
    const from = opSrc.indexOf(`operatorRouter.post('${path}'`)
    const to = opSrc.indexOf('operatorRouter.', from + 10)
    return liveOf(opSrc.slice(from, to > from ? to : undefined))
  }

  it('🛑 BOTH OPERATOR CONVERSATIONS COMPOSE FROM THE SAME BUILDER', () => {
    for (const path of ['/command', '/icp/chat']) {
      expect(slice(path), `${path} builds its own prompt`).toContain('buildVidaSystem')
      expect(slice(path), `${path} carries its own tools`).toContain('VIDA_TOOLS')
    }
  })

  it('🛑 THE WELDED SECOND COPY IS RETIRED — the module and its import are gone', () => {
    expect(existsSync(join(API, 'lib/icp-conversation-rules.ts')),
      'a second authored prompt is back, and nothing welds it to Milla\'s').toBe(false)
    expect(opSrc).not.toContain('ICP_CONVERSATION_DISCIPLINE')
  })

  it('🛑 NEITHER ROUTE CLASSIFIES THE OPERATOR’S WORDS', () => {
    for (const path of ['/command', '/icp/chat']) {
      const s = slice(path)
      expect(s, `${path} lowercases the operator's text to match on it`).not.toMatch(/toLowerCase\(\)/)
      expect(s, `${path} still routes on keywords`).not.toMatch(/\.test\(\s*lc\s*\)/)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ THE OPERATOR IS ANSWERED WHERE THEY ARE — no handoff, because none is needed
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ she answers, rather than routing them somewhere else', () => {
  beforeEach(house)

  it('🛑 A SENTENCE WITH NONE OF THE OLD KEYWORDS IS STILL ANSWERED', async () => {
    // The founder's own sentence on the walk that produced this file contains none of
    // "icp", "target", "persona" or "who" — and the router replied with a menu and dropped a
    // complete ICP. It reaches Vida now, like any other sentence.
    const r = await callOperator('post', '/command', {
      client_id: CLIENT,
      text: 'Founder-led B2B agencies and consultancies in the UK and United States, 11-50 people',
    })
    expect(r.status).toBe(200)
    expect(r.payload.success).toBe(true)
    expect(r.payload.reply, 'she said nothing').toBeTruthy()
    expect(String(r.payload.reply), 'the dead end is back')
      .not.toContain("I'm not sure what you're asking me to do with that")
  })

  it('🛑 HIS WHOLE SENTENCE REACHES HER — verbatim, not summarised, not classified', async () => {
    const said = 'Founder-led B2B agencies and consultancies in the UK and United States, 11-50 people'
    await callOperator('post', '/command', { client_id: CLIENT, text: said })
    const turns = seenMessages[0]
    expect(turns[turns.length - 1]).toEqual({ role: 'user', content: said })
  })

  it('🛑 SHE SEES THIS CLIENT — their live targeting, not a bare client id', async () => {
    await callOperator('post', '/command', { client_id: CLIENT, text: 'where are we with these guys?' })
    expect(seenSystem[0]).toContain('House')
    expect(seenSystem[0]).toContain('Retired ICP 3')
  })

  it('🛑 AND A CONVERSATION IS STILL NOT A WRITE', async () => {
    const before = snapshot()
    await callOperator('post', '/command', { client_id: CLIENT, text: 'add the US as well' })
    expect(snapshot(), 'talking to Vida changed the targeting').toEqual(before)
  })
})


// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ SAVE MAKES A FOURTH ICP — AND STOPS THERE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ conversation → proposal → explicit save → 4th ICP, and nothing else', () => {
  beforeEach(house)

  it('🛑 THE SAVE CREATES A NEW ROW, NEVER EDITS ONE OF THE THREE', async () => {
    const before = snapshot()
    const r = await callOperator('post', '/icp', {
      client_id: CLIENT, name: 'UK + US founder-led agencies',
      industries: ['Consulting'], job_titles: ['Founder'], seniority_levels: ['C-Suite'],
      company_sizes: [], geographies: ['United Kingdom', 'United States'], tech_stack: [], keywords: [],
    })
    expect(r.status).toBe(200)
    expect(state.icps, 'three became four').toHaveLength(4)
    const fresh = state.icps.find(i => i.name === 'UK + US founder-led agencies')!
    expect(fresh.client_id).toBe(CLIENT)
    expect(fresh.geographies).toEqual(['United Kingdom', 'United States'])
    // Their CONTENT is untouched. `is_active` moves, because that is what "active" means and
    // has always meant — one live definition per client. Nothing else about them changes.
    for (const old of before) {
      const now = state.icps.find(i => i.id === old.id)!
      for (const k of Object.keys(old)) {
        if (k === 'is_active') continue
        expect(now[k], `${old.id}.${k}`).toEqual(old[k])
      }
    }
    expect(state.icps.filter(i => i.is_active)).toHaveLength(1)
  })

  it('🛑 SAVING ATTACHES NOTHING TO THE PROGRAMME', async () => {
    await callOperator('post', '/icp', { client_id: CLIENT, name: 'New', geographies: ['United Kingdom'] })
    expect(state.programmes[0].icp_id, 'attachment is a separate, explicit action').toBeNull()
    expect(writes.filter(w => w.table === 'programmes'), 'the programme row is never written').toHaveLength(0)
  })

  it('🛑 SAVING SOURCES NOTHING, SENDS NOTHING, AND MOVES NO MONEY', async () => {
    await callOperator('post', '/icp', { client_id: CLIENT, name: 'New', geographies: ['United Kingdom'] })
    await new Promise(r => setTimeout(r, 0))   // the campaign scaffold is fire-and-forget
    expect(state.leads, 'no leads sourced').toHaveLength(0)
    expect(writes.filter(w => w.table === 'sourcing_ledger')).toHaveLength(0)
    expect(writes.filter(w => w.table === 'figsy_sent_emails')).toHaveLength(0)
    // The programme is SOURCING_AUTHORISED, not LIVE, so the outreach fence refuses to
    // activate a campaign. That refusal is the existing programme authority doing its job.
    expect(state.campaigns.filter(c => c.status === 'active')).toHaveLength(0)
  })

  it('🛑 P2 IS UNTOUCHED — no authority is gained by defining a target', async () => {
    await callOperator('post', '/icp', { client_id: CLIENT, name: 'New', geographies: ['United Kingdom'] })
    const p = state.programmes[0]
    expect(p.second_authorised_at).toBeNull()
    expect(p.second_paid_at).toBeNull()
    expect(p.went_live_at).toBeNull()
    expect(p.status).toBe('SOURCING_AUTHORISED')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ THE FOUNDER'S EXACT SENTENCE, THROUGH THE EXACT JOURNEY
//
// He pressed "Build a NEW ICP by talking" and typed this. It contains NONE of the four words
// the generic router matches on — which is why it was previously answered with a menu and
// thrown away. Inside explicit ICP mode the click has already said what he is doing, so the
// text goes straight to the ICP conversation and the router is never consulted.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe("⑥ the founder's own words, end to end", () => {
  const SENTENCE = 'Founder-led B2B agencies and consultancies in the UK and United States. '
    + '5–50 employees. Target Founder, Co-Founder, CEO, Managing Director, Partner and Head of Growth. '
    + 'They sell high-value professional services and rely on outbound/new business. '
    + 'Exclude recruitment agencies, SaaS/software, ecommerce, local consumer businesses and companies under 5 employees.'

  beforeEach(house)

  it('the sentence really does miss every keyword the generic router looks for', () => {
    expect(/\b(icp|persona)\b/i.test(SENTENCE)).toBe(false)
    // "Target" appears as a VERB here, which is exactly how a keyword router misreads intent:
    // it would match, and it would still have been the wrong surface answering.
    expect(SENTENCE).toContain('Target Founder')
  })

  it('🛑 IT REACHES THE ICP CONVERSATION, FRESH, WITH NO OLD ICP IN THE PROMPT', async () => {
    const r = await callOperator('post', '/icp/chat', { client_id: CLIENT, fresh: true, message: SENTENCE })
    expect(r.status).toBe(200)
    expect(reads, 'the old ICPs are never read').not.toContain('icps')
    // ⛓️ 14 Sep (R121, Build 3) — the wording moved into `buildVidaSystem`'s fresh block.
    // The CLAIM is unchanged: no existing ICP is read, and none reaches the prompt.
    expect(seenSystem[0]).toContain('THIS IS A BRAND-NEW PROFILE')
    expect(seenSystem[0]).not.toContain('Retired ICP')
    expect(seenSystem[0]).not.toContain('South Africa')
  })

  it('🛑 SHE IS TOLD WHO SHE IS TALKING TO AND WHAT SHE MAY DO, AND THE WHOLE SENTENCE IS CARRIED', async () => {
    await callOperator('post', '/icp/chat', { client_id: CLIENT, fresh: true, message: SENTENCE })
    // ⛓️ 14 Sep (R121, Build 3) — ~~the three #1444 prompt lines, welded in from Milla's
    // route~~. Vida's prompt is her own now and the weld is retired (see ②); what this test
    // was protecting — that the operator meets a conversation rather than a filter form — is
    // asserted on Vida's own rules instead.
    expect(seenSystem[0]).toContain('You are Vida, the K.I.N.D operator')
    expect(seenSystem[0]).toContain('YOU PROPOSE. THE OPERATOR PRESSES THE BUTTON')
    expect(seenSystem[0], 'she must not read an enum menu out at the operator')
      .not.toContain('Fintech, Healthtech, E-commerce')
    // His words go in the USER turn, whole — the route caps at 2,000 chars and this is ~380.
    const lastUser = seenMessages[0].filter(m => m.role === 'user').pop()!
    expect(lastUser.content, 'the exclusions are not truncated away').toContain('Exclude recruitment agencies')
    expect(lastUser.content, 'nor the size band').toContain('5–50 employees')
    expect(lastUser.content).toBe(SENTENCE)
  })

  it('🛑 HE CAN KEEP TALKING — the conversation continues and still writes nothing', async () => {
    await callOperator('post', '/icp/chat', { client_id: CLIENT, fresh: true, message: SENTENCE })
    const r2 = await callOperator('post', '/icp/chat', {
      client_id: CLIENT, fresh: true, message: 'Also exclude anyone under 5 staff.',
      history: [{ role: 'user', content: SENTENCE }, { role: 'assistant', content: 'What does the client sell?' }],
    })
    expect(r2.status).toBe(200)
    expect(r2.payload.data.icp).toBeTruthy()
    expect(writes, 'two turns, still nothing written').toHaveLength(0)
    expect(state.icps).toHaveLength(3)
  })

  it('🛑 APPROVING THE PROPOSAL CREATES THE FOURTH ICP — no form in the path', async () => {
    const chat = await callOperator('post', '/icp/chat', { client_id: CLIENT, fresh: true, message: SENTENCE })
    const proposal = chat.payload.data.icp as Row
    const before = snapshot()
    // Exactly what the Approve button posts: the proposal object, to the existing save route.
    const save = await callOperator('post', '/icp', { client_id: CLIENT, ...proposal })
    expect(save.status).toBe(200)
    expect(state.icps).toHaveLength(4)
    const fresh = state.icps.find(i => i.id === (save.payload.data as Row).id)!
    expect(fresh.name).toBe('UK + US founder-led agencies')
    expect(fresh.geographies).toEqual(['United Kingdom', 'United States'])
    for (const old of before) {
      const now = state.icps.find(i => i.id === old.id)!
      for (const k of Object.keys(old)) {
        if (k === 'is_active') continue
        expect(now[k], `${old.id}.${k}`).toEqual(old[k])
      }
    }
  })

  it('🛑 AND THE PROGRAMME IS EXACTLY AS IT WAS', async () => {
    const chat = await callOperator('post', '/icp/chat', { client_id: CLIENT, fresh: true, message: SENTENCE })
    await callOperator('post', '/icp', { client_id: CLIENT, ...(chat.payload.data.icp as Row) })
    await new Promise(r => setTimeout(r, 0))
    const p = state.programmes[0]
    expect(p.icp_id, 'unattached').toBeNull()
    expect(p.status).toBe('SOURCING_AUTHORISED')
    expect(p.second_authorised_at).toBeNull()
    expect(p.second_paid_at).toBeNull()
    expect(p.went_live_at).toBeNull()
    expect(p.sourcing_ceiling, 'untouched').toBe(2500)
    expect(state.leads, 'no batch, no provider, no sourcing').toHaveLength(0)
    expect(state.campaigns.filter(c => c.status === 'active'), 'nothing sending').toHaveLength(0)
    expect(writes.filter(w => w.table === 'programmes'), 'the programme row is never written').toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ THE SCREENS — reachability is the whole fix, so it is asserted on the screens
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ both conversations are reachable, and the form stays the fallback', () => {
  const strip = (raw: string) => {
    let inBlock = false
    return raw.split('\n').map(l => {
      const t = l.trim()
      if (inBlock) { if (t.endsWith('*/') || t.endsWith('*/}')) inBlock = false; return '' }
      if (t.startsWith('{/*')) { if (!t.endsWith('*/}')) inBlock = true; return '' }
      if (t.startsWith('/*')) { if (!t.endsWith('*/')) inBlock = true; return '' }
      if (t.startsWith('//') || t.startsWith('*')) return ''
      const i = l.search(/(?<!:)\/\//)
      return i >= 0 ? l.slice(0, i) : l
    }).join('\n')
  }
  const vida  = strip(readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8'))
  // ⚑ 4 Sep — the ONE shell-owned Vida conversation. The command router and the handoff stash
  // moved here out of the console page; the console keeps the ICP surface they hand off TO.
  const vidaChat = strip(readFileSync(join(__dirname, '../../../admin/src/components/vida/VidaConversation.tsx'), 'utf8'))
  const milla = strip(readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/icp/page.tsx'), 'utf8'))

  it('🛑 A — BUILD A NEW ICP BY TALKING IS ON SCREEN', () => {
    expect(vida).toContain("'Build a NEW ICP by talking'")
    expect(vida, 'and it starts a fresh conversation, not a seeded one').toContain('setIcpFresh(true)')
  })

  it('🛑 B — REFINE IS STILL THERE, AS ITS OWN BUTTON', () => {
    expect(vida).toContain('Refine existing ICP by talking')
    expect(vida).toContain('setIcpFresh(false)')
  })

  it('🛑 C — THE URL CAN OPEN THE ICP CONVERSATION', () => {
    expect(vida).toContain("params.get('tab')")
    expect(vida).toContain("params.get('mode') === 'chat'")
    expect(vida, 'and the tab is validated, never trusted').toContain('(COCKPIT_TABS as readonly string[]).includes(urlTab)')
  })

  it('🛑 D — HISTORY NO LONGER HIDES FRESH CREATION', () => {
    // The defect in one line: a single button whose LABEL flipped on the count.
    expect(vida, 'the conditional that hid creation is gone')
      .not.toContain("cockpit.icps.length === 0 ? '💬 Build the ICP by talking' : '💬 Refine it by talking'")
    expect(vida).toContain("cockpit.icps.length === 0 ? 'Build the ICP by talking' : 'Build a NEW ICP by talking'")
  })

  it('🛑 E — MILLA STILL OFFERS FRESH CONVERSATIONAL SETUP WHEN ICPs EXIST', () => {
    expect(milla).toContain('icps.length > 0')
    expect(milla).toContain('Build fresh targeting with Milla')
    expect(milla).toContain("router.push('/milla/welcome')")
  })

  it('🛑 F — THE FORM IS STILL THE SECONDARY, MANUAL FALLBACK', () => {
    expect(vida).toContain('Fill the form')
    const chatAt = vida.indexOf("'Build a NEW ICP by talking'")
    const formAt = vida.indexOf('Fill the form', chatAt)
    expect(chatAt, 'talking comes first on the screen').toBeGreaterThan(-1)
    expect(formAt).toBeGreaterThan(chatAt)
  })

  it('🛑 H — THE TYPED TEXT IS CARRIED AND FIRED ONCE', () => {
    // ⚑ 4 Sep — RETARGETED, NOT RELAXED. The router that CARRIES the sentence is now the ONE
    // conversation; the console still holds the effect that FIRES it once. Both halves are
    // asserted, so the carry cannot be lost and the replay guard cannot be dropped.
    expect(vidaChat).toContain('json.handoff_text')
    expect(vidaChat).toContain('vida:icp-handoff:')
    expect(vidaChat, 'the carried sentence must reach the console').toContain('handlers.current.onHandoff?.(String(json.handoff_text))')
    expect(vida, 'cleared before the send, so it cannot replay').toContain('setIcpHandoff(null)')
    expect(vida).toContain('void sendIcpChat(text, true)')
  })

  it('🛑 AND THE PROPOSAL STILL NEEDS AN EXPLICIT PRESS TO BECOME AN ICP', () => {
    expect(vida).toContain("'Approve & save as the new ICP'")
    expect(vida).toContain('approveProposal')
  })

  // ── ⚑ 4 Sep, SECOND PASS — THE NORMAL JOURNEY MUST NOT END IN THE RAW FORM ─────────────
  it('🛑 I — APPROVING HAPPENS IN THE CONVERSATION, NOT IN THE EIGHT-FIELD EDITOR', () => {
    // The defect in one line: the primary button used to call `proposalToForm`, which sets
    // `icpEdit` AND `setIcpMode('list')` — the raw editor, and the conversation gone with it.
    // The old primary button, by its exact markup. `proposalToForm` still EXISTS — it is now
    // the quiet "Edit the fields instead" link, which is the point: available, not the path.
    expect(vida, 'the primary action no longer jumps to the form').not.toContain(
      '<button onClick={proposalToForm}\n                            className="bg-[#7C3AED] text-white')
    expect(vida, 'and the form link is styled as the quiet one').toContain(
      '<button onClick={proposalToForm} className="text-[12px] font-bold text-[#9b8ec4]')
    expect(vida).toContain('onClick={approveProposal}')
    expect(vida, 'and correcting it keeps the operator in the conversation')
      .toContain('Correct it by talking')
  })

  it('🛑 J — APPROVE REUSES THE EXISTING SAVE ROUTE AND THE EXISTING PROPOSAL', () => {
    const fn = vida.slice(vida.indexOf('async function approveProposal'), vida.indexOf('async function saveIcp'))
    expect(fn).toContain("'/api/proxy/operator/icp'")
    expect(fn, 'the conversation’s own proposal object, not a new model').toContain('icpProposal as Record<string, unknown>')
    expect(fn, 'no second ICP schema is invented here').not.toContain('setIcpEdit(')
    expect(fn, 'and it tells the operator what it did NOT do').toContain('not attached to a programme')
  })

  it('🛑 K — THE FORM SURVIVES AS THE QUIET SECONDARY ROUTE', () => {
    expect(vida, 'the escape hatch is untouched').toContain('Fill the form')
    expect(vida, 'and reachable from the review state too').toContain('Edit the fields instead')
    const approveAt = vida.indexOf("'Approve & save as the new ICP'")
    const fieldsAt  = vida.indexOf('Edit the fields instead')
    expect(approveAt, 'approving comes first').toBeGreaterThan(-1)
    expect(fieldsAt).toBeGreaterThan(approveAt)
  })

  it('🛑 L — INSIDE EXPLICIT ICP MODE, TYPING GOES STRAIGHT TO THE ICP CONVERSATION', () => {
    // ⚑ 4 Sep — RETARGETED, NOT RELAXED, AND SPLIT ACROSS BOTH HALVES OF THE ONE CONVERSATION.
    // The rule is unchanged: explicit ICP mode routes the typed text straight to the ICP chat
    // and NEVER through the generic intent detector. What changed is that the console answers
    // "am I in that mode" (`intercept`) and the shell's router obeys it — so this asserts the
    // console's condition AND that the router returns before `parseSourceIntent` runs.
    const surface = vida.slice(vida.indexOf('intercept: (t: string) =>'), vida.indexOf('onHandoff:'))
    expect(surface).toContain("tab !== 'ICP' || icpMode !== 'chat'")
    expect(surface).toContain('void sendIcpChat(t)')
    expect(surface, 'the surface must tell the router it consumed the text').toContain('return true')

    const fn = vidaChat.slice(vidaChat.indexOf('async function runCommand'), vidaChat.indexOf('const srcCount = parseSourceIntent'))
    expect(fn).toContain('handlers.current.intercept?.(t)')
    // It must RETURN — falling through would still hit the regex router afterwards.
    expect(fn).toMatch(/intercept\?\.\(t\)\)\s*\{[\s\S]{0,300}return/)
  })
})
