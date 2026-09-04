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
import { readFileSync } from 'fs'
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
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (opts: { system?: string }) => {
        seenSystem.push(String(opts.system ?? ''))
        return { content: [{ type: 'text', text: JSON.stringify({
          message: 'What does the client actually sell?',
          icp: { name: 'UK + US founder-led agencies', industries: ['Consulting'], job_titles: ['Founder'], seniority_levels: ['C-Suite'], company_sizes: [], geographies: ['United Kingdom', 'United States'], tech_stack: [], keywords: [] },
        }) }] }
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
  writes.length = 0; reads.length = 0; seenSystem.length = 0
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
    expect(seenSystem[0]).toContain('BUILD A BRAND-NEW ICP FROM THIS CONVERSATION')
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
    expect(seenSystem[0]).toContain('Their CURRENT active ICP is')
    expect(seenSystem[0]).toContain('Retired ICP 3')
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
// ② THE #1444 DISCIPLINE IS IMPORTED, NOT RE-WRITTEN
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② one authored source, two consoles', () => {
  const API = join(__dirname, '..')
  const icpsSrc = readFileSync(join(API, 'routes/icps.ts'), 'utf8')
  const opSrc   = readFileSync(join(API, 'routes/operator.ts'), 'utf8')
  const flat = (s: string) => s.replace(/\s+/g, ' ')

  /** The builder/chat slice #1444's own guards read. Scoped identically. */
  const builderChat = () => {
    const start = icpsSrc.indexOf("const MILLA_REPLY_TOOL = 'milla_reply'")
    const end = icpsSrc.indexOf("icpRouter.post('/'", start)
    expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start)
    return icpsSrc.slice(start, end)
  }

  it('🛑 THE SHARED RULES ARE VERBATIM MILLA’S — neither copy can drift unseen', async () => {
    const { ICP_ONE_THING_RULE, ICP_DECISION_METHOD } = await import('./icp-conversation-rules')
    const milla = flat(builderChat())
    for (const [label, block] of [['the ONE-thing rule', ICP_ONE_THING_RULE], ['the decision method', ICP_DECISION_METHOD]] as const) {
      expect(block.length, `${label} is not empty`).toBeGreaterThan(200)
      expect(milla, `${label} must still be word-for-word what Milla's builder says`).toContain(flat(block))
    }
  })

  it('🛑 ALL FOUR #1444 RULES REACH VIDA', async () => {
    const { ICP_CONVERSATION_DISCIPLINE } = await import('./icp-conversation-rules')
    const d = flat(ICP_CONVERSATION_DISCIPLINE)
    for (const rule of [
      'ASK FOR ONE GENUINELY MISSING THING PER REPLY',
      'KNOWN',
      'CONTRADICTORY',
      'NEEDS CONFIRMING',
      'NEVER A CHECKLIST — AND THAT INCLUDES TARGETING',
      'NEVER ask for industry, job titles, company size and geography together.',
      'LEARN WHAT THEY DO BEFORE YOU COLLECT TARGETING FIELDS',
    ]) expect(d, rule).toContain(rule)
  })

  it('🛑 VIDA COMPOSES ITS PROMPT FROM THE MODULE — not from a second copy of the text', () => {
    const fn = opSrc.slice(opSrc.indexOf("operatorRouter.post('/icp/chat'"))
    expect(fn).toContain("await import('../lib/icp-conversation-rules')")
    expect(fn).toContain('${ICP_CONVERSATION_DISCIPLINE}')
    // The rule text itself must NOT be re-typed here — that is the drift this prevents.
    expect(fn, 'the rules are imported, never restated').not.toContain('ASK FOR ONE GENUINELY MISSING THING PER REPLY. That is the governing rule')
  })

  it('🛑 AND THE LIVE PROMPT ACTUALLY CARRIES THEM', async () => {
    house()
    await callOperator('post', '/icp/chat', { client_id: CLIENT, fresh: true, message: 'UK agencies' })
    expect(seenSystem[0]).toContain('ASK FOR ONE GENUINELY MISSING THING PER REPLY')
    expect(seenSystem[0]).toContain('NEVER ask for industry, job titles, company size and geography together.')
    expect(seenSystem[0]).toContain('LEARN WHAT THEY DO BEFORE YOU COLLECT TARGETING FIELDS')
  })

  it('🛑 THE FILTER-FORM PHRASING IS GONE FROM EVERY SURFACE', () => {
    const vida = readFileSync(join(API, '../../admin/src/app/vida/page.tsx'), 'utf8')
    for (const [where, src] of [['the route', opSrc], ['the Vida screen', vida]] as const) {
      expect(src, `${where} must not read out a filter form`).not.toContain('industry, titles, seniority, size, region')
    }
    expect(opSrc, 'the enum lists survive as VOCABULARY, not as a menu to recite').toContain('never read them out as a menu')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ THE COMMAND BAR HANDS OVER WHAT WAS TYPED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ the handoff carries both a destination and the words', () => {
  beforeEach(house)
  const TYPED = 'Founder-led B2B agencies and consultancies in the UK and United States'

  it('🛑 THE LINK NAMES THE ICP CONVERSATION — not the default tab', async () => {
    const r = await callOperator('post', '/command', { client_id: CLIENT, text: TYPED })
    expect(r.payload.link, 'never the bare /vida?client= that landed on Inbox')
      .toBe(`/vida?client=${CLIENT}&tab=ICP&mode=chat`)
    expect(r.payload.kind).toBe('handoff')
  })

  it('🛑 THE OPERATOR’S OWN SENTENCE SURVIVES — verbatim, not summarised', async () => {
    const r = await callOperator('post', '/command', { client_id: CLIENT, text: TYPED })
    expect(r.payload.handoff_text).toBe(TYPED)
  })

  it('🛑 IT IS STILL NOT AN ICP ENGINE — no model call, no proposal, no write', async () => {
    await callOperator('post', '/command', { client_id: CLIENT, text: TYPED })
    expect(seenSystem, 'the command bar resolves no targeting').toHaveLength(0)
    expect(writes.filter(w => w.table === 'icps')).toHaveLength(0)
  })

  it('🛑 AND A SENTENCE CONTAINING NONE OF THE INTENT WORDS IS STILL NOT DISCARDED', async () => {
    // The founder's actual text has no "icp", no "target", no "persona", no "who" in it — so
    // the intent branch cannot fire, and the fallback used to reply with a menu and drop it.
    expect(/(icp|target|persona|who)/i.test(TYPED), 'the fixture really does miss every keyword').toBe(false)
    const r = await callOperator('post', '/command', { client_id: CLIENT, text: TYPED })
    expect(r.payload.handoff_text, 'his words are kept').toBe(TYPED)
    expect(r.payload.link).toBe(`/vida?client=${CLIENT}&tab=ICP&mode=chat`)
    expect(r.payload.reply, 'and it says plainly that it did not understand').toContain("I'm not sure what you're asking me to do")
    expect(seenSystem, 'nothing is classified and no model is called').toHaveLength(0)
  })

  it('🛑 THE EXPLICIT WORDS STILL ROUTE STRAIGHT THERE', async () => {
    const r = await callOperator('post', '/command', { client_id: CLIENT, text: 'redefine the ICP for this programme' })
    expect(r.payload.kind).toBe('handoff')
    expect(r.payload.link).toBe(`/vida?client=${CLIENT}&tab=ICP&mode=chat`)
    expect(r.payload.handoff_text).toBe('redefine the ICP for this programme')
    expect(r.payload.reply).toContain('Taking you to the ICP conversation')
  })

  it('the answering branches are untouched — they still answer, and carry nothing', async () => {
    for (const text of ['status', "what's blocking?"]) {
      const s = await callOperator('post', '/command', { client_id: CLIENT, text })
      expect(s.payload.kind, text).toBe('answer')
      expect(s.payload.handoff_text, text).toBeNull()
      expect(s.payload.link, text).toBeNull()
    }
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
    expect(vida).toContain('json.handoff_text')
    expect(vida).toContain('vida:icp-handoff:')
    expect(vida, 'cleared before the send, so it cannot replay').toContain('setIcpHandoff(null)')
    expect(vida).toContain('void sendIcpChat(text, true)')
  })

  it('🛑 AND THE PROPOSAL STILL NEEDS AN EXPLICIT PRESS TO BECOME AN ICP', () => {
    expect(vida).toContain('Review &amp; save')
    expect(vida).toContain('proposalToForm')
  })
})
