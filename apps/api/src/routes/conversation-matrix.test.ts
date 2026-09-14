import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CONVERSATIONAL MATRIX — meaning survives the SERVER, whatever the style. (R121, Build 5.)
//
// 🛑 WHAT THIS FILE IS AND IS NOT. The model is a double, so nothing here proves the model
// understands slang (the live eval does that). What it proves is the half that was actually
// broken: given a capable reading of a turn, does the SERVER keep the customer's meaning —
// through corrections, changed minds, several updates at once, partial readings, empty
// readings, questions back, retries and re-entry — and does it ever reject a person for how
// they spoke?
//
// ⚠️ EVERY ASSERTION IS ABOUT CANONICAL STATE. Not one checks whether a phrase matched.
//
// ⚠️ THE STORE MERGES LIKE THE REAL ONE. A double that replaced would pass every test here
// while the product lost facts — which is precisely how the live defect stayed invisible.
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
    from: () => { throw new Error('builder/chat must not touch the database') },
    rpc:  () => { throw new Error('builder/chat must not touch the database') },
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  },
}))
const store = vi.hoisted(() => ({ facts: {} as Record<string, unknown>, conversation: [] as Array<{ role: string; content: string }>, throwOnRead: false }))
vi.mock('../lib/brief-draft', () => {
  const draft = () => ({ facts: store.facts, conversation: store.conversation, confirmedAt: null, promotedClientId: null })
  return {
    briefDraftFor: async () => { if (store.throwOnRead) throw new Error('unreadable'); return draft() },
    writableBriefDraft: async () => draft(),
    saveBriefDraft: async (_u: string, f: Record<string, unknown>) => {
      store.facts = { ...store.facts, ...f }
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
    BRIEF_TRANSCRIPT_MAX_TURNS: 40,
  }
})
beforeEach(() => { store.facts = {}; store.conversation = []; model.fail = null; model.seenSystem = []; store.throwOnRead = false })

type Said = { role: 'user' | 'assistant'; content: string }
async function turn(messages: Said[]) {
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/builder/chat' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /builder/chat not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: Record<string, unknown>) { out.payload = p; return res },
  }
  await handler({ body: { messages, profile_required: true }, headers: {}, params: {}, query: {}, userId: 'user-1' }, res, () => {})
  return out
}
const millaSaid = (input: unknown) => ({
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', id: 'tu_1', name: 'milla_reply', input }],
})
const said = (content: string): Said => ({ role: 'user', content })
const q = (brief_so_far: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  millaSaid({ type: 'question', content: 'And who should we leave alone?', brief_so_far, ...extra })

const HELD = {
  contact_name: 'Ellis', company_name: 'Redmayne & Co.', website: 'https://redmayne.co.uk',
  what_they_do: 'restore and sell vintage watches', target_category: 'independent jewellers',
  geographies: ['United Kingdom', 'Ireland'], company_sizes: ['1–10', '11–50'],
  job_titles: ['Owner', 'Buying Director'], exclusions: 'no pawnbrokers',
  desired_outcome: 'get on calls with buyers',
}

describe('① every message is accepted as conversation', () => {
  for (const [style, text] of [
    ['polished', 'We are Redmayne & Co. We restore and sell vintage watches to independent jewellers across the United Kingdom.'],
    ['misspelled', 'were redmayne & co, we restor and sell vintge watches to independant jewelers in the uk'],
    ['no punctuation, lower case', 'redmayne and co vintage watches we sell to jewellers uk mostly'],
    ['slang', 'redmayne here mate, we flog old watches to proper jewellers, uk innit'],
    ['one word', 'Redmayne'],
    ['an essay', 'So, where to start. Redmayne & Co has been going since 1987 when my father… '.padEnd(1500, 'and so on, ')],
    ['a question back', 'hang on, what do you actually do with all this?'],
    ['an interruption', 'sorry, phone — back in a sec'],
  ] as const) {
    it(`${style}: the turn is answered, never refused`, async () => {
      store.facts = { ...HELD }
      model.reply = q({})
      const r = await turn([said(text)])
      expect(r.code, `${style} produced ${r.code}: ${JSON.stringify(r.payload)}`).toBe(200)
      expect((r.payload.data as { type: string }).type).toBe('question')
      // And a turn that taught her nothing new erased nothing old.
      expect(store.facts).toEqual(HELD)
    })
  }

  it('🛑 WORDING INVARIANCE — the same reading stored from four styles is one state', async () => {
    const reading = { company_name: 'Redmayne & Co.', geographies: ['United Kingdom'], what_they_do: 'restore and sell vintage watches' }
    const states: string[] = []
    for (const text of [
      'We are Redmayne & Co. We restore and sell vintage watches, mostly across the UK.',
      'redmayne & co. vintage watches. uk.',
      'REDMAYNE AND CO — we do vintage watches, UK based selling',
      'so its redmayne and co yeah, old watches, we sell em round the uk',
    ]) {
      store.facts = {}
      model.reply = q(reading)
      await turn([said(text)])
      states.push(JSON.stringify(store.facts))
    }
    expect(new Set(states).size, 'the stored Brief depended on how they phrased it').toBe(1)
  })
})

describe('② several facts, in any order, before or after being asked', () => {
  it('ten facts in one message are ten facts held', async () => {
    model.reply = q(HELD)
    await turn([said('Ellis at Redmayne, redmayne.co.uk, we restore vintage watches, jewellers, UK and Ireland, small shops, owners and buyers, no pawnbrokers, want calls with buyers.')])
    expect(store.facts).toEqual(HELD)
  })

  it('facts volunteered before any question are held just the same', async () => {
    model.reply = q({ exclusions: 'no pawnbrokers', desired_outcome: 'calls with buyers' })
    await turn([said('Before you ask — no pawnbrokers, and I want calls with actual buyers.')])
    expect(store.facts.exclusions).toBe('no pawnbrokers')
    expect(store.facts.desired_outcome).toBe('calls with buyers')
  })

  it('🛑 COMPANY GEOGRAPHY AND TARGET GEOGRAPHY IN ONE BREATH STAY TWO FACTS', async () => {
    model.reply = q({ country: 'United Kingdom', geographies: ['United States'] })
    await turn([said("We're in Manchester but we only sell into the States.")])
    expect(store.facts.country).toBe('United Kingdom')
    expect(store.facts.geographies).toEqual(['United States'])
    // Neither leaks into the other — the server copies nothing between fields.
    expect(store.facts.geographies).not.toContain('United Kingdom')
  })
})

describe('③ corrections, changed minds and contradictions — the later clear instruction wins', () => {
  it('a restated list REPLACES the old one', async () => {
    store.facts = { ...HELD }
    model.reply = q({ geographies: ['United States'] })
    await turn([said('Scrap the UK and Ireland. It is the United States only.')])
    expect(store.facts.geographies).toEqual(['United States'])
    expect(store.facts.exclusions, 'a geography correction touched exclusions').toBe('no pawnbrokers')
  })

  it('a changed mind on exclusions is the new sentence, not the old one plus it', async () => {
    store.facts = { ...HELD }
    model.reply = q({ exclusions: 'no replica dealers' })
    await turn([said('Actually pawnbrokers are fine. It is replica dealers I want nothing to do with.')])
    expect(store.facts.exclusions).toBe('no replica dealers')
  })

  it('an exclusion ADDED later joins the earlier one', async () => {
    store.facts = { ...HELD }
    model.reply = q({ exclusions: 'no pawnbrokers, and no replica dealers' })
    await turn([said('Oh and no replica dealers either.')])
    expect(store.facts.exclusions).toBe('no pawnbrokers, and no replica dealers')
  })

  it('an exclusion REMOVED later is gone', async () => {
    store.facts = { ...HELD, exclusions: 'no pawnbrokers, and no replica dealers' }
    model.reply = q({ exclusions: 'no replica dealers' })
    await turn([said("Thinking about it, pawnbrokers are okay actually.")])
    expect(store.facts.exclusions).toBe('no replica dealers')
  })

  it('🛑 "AS WELL" ADDS WITHOUT DELETING — the correction the shallow merge could not express', async () => {
    store.facts = { ...HELD }
    model.reply = q({}, { brief_list_ops: { geographies: { add: ['United States'] } } })
    await turn([said('Actually include the US as well.')])
    expect(store.facts.geographies).toEqual(['United Kingdom', 'Ireland', 'United States'])
  })

  it('"drop X" removes one without touching the rest', async () => {
    store.facts = { ...HELD }
    model.reply = q({}, { brief_list_ops: { geographies: { remove: ['ireland'] } } })
    await turn([said('Drop Ireland.')])
    expect(store.facts.geographies).toEqual(['United Kingdom'])
  })

  it('🛑 SEVERAL UPDATES IN ONE TURN ALL LAND, and nothing else moves', async () => {
    store.facts = { ...HELD }
    model.reply = q(
      { exclusions: 'no pawnbrokers or auction houses' },
      { brief_list_ops: {
        geographies: { add: ['United States'] },
        job_titles:   { remove: ['Buying Director'], add: ['Head of Purchasing'] },
      } },
    )
    await turn([said('Three things: add the US, swap buying director for head of purchasing, and no auction houses either.')])
    expect(store.facts.geographies).toEqual(['United Kingdom', 'Ireland', 'United States'])
    expect(store.facts.job_titles).toEqual(['Owner', 'Head of Purchasing'])
    expect(store.facts.exclusions).toBe('no pawnbrokers or auction houses')
    expect(store.facts.company_sizes).toEqual(['1–10', '11–50'])
    expect(store.facts.desired_outcome).toBe('get on calls with buyers')
  })

  it('a retry of the same turn does not double anything', async () => {
    store.facts = { ...HELD }
    model.reply = q({}, { brief_list_ops: { geographies: { add: ['United States'] } } })
    await turn([said('Actually include the US as well.')])
    await turn([said('Actually include the US as well.')])
    expect(store.facts.geographies).toEqual(['United Kingdom', 'Ireland', 'United States'])
  })
})

describe('④ partial understanding is saved; ambiguity becomes a question; unknown stays unknown', () => {
  it('🛑 ONE UNREADABLE FIELD DOES NOT COST THE OTHER FOUR', async () => {
    model.reply = q({
      company_name: 'Redmayne & Co.', contact_name: 'Ellis',
      what_they_do: 'vintage watches', exclusions: 'no pawnbrokers',
      geographies: 'UK and Ireland',   // ← a string where a list belongs
    })
    const r = await turn([said('Ellis, Redmayne & Co, vintage watches, UK and Ireland, no pawnbrokers.')])
    expect(r.code).toBe(200)
    expect(store.facts.company_name).toBe('Redmayne & Co.')
    expect(store.facts.contact_name).toBe('Ellis')
    expect(store.facts.exclusions).toBe('no pawnbrokers')
    // The unreadable one is simply not saved — not guessed at, not coerced.
    expect(store.facts.geographies).toBeUndefined()
  })

  it('🛑 AN EMPTY READING ERASES NOTHING', async () => {
    store.facts = { ...HELD }
    model.reply = q({
      contact_name: '', company_name: '', geographies: [], job_titles: [], exclusions: '   ',
      desired_outcome: null, website: undefined,
    })
    await turn([said('hmm')])
    expect(store.facts).toEqual(HELD)
  })

  it('genuine ambiguity → a question, and no fact is invented to resolve it', async () => {
    store.facts = { ...HELD }
    model.reply = millaSaid({ type: 'question', content: 'When you say everywhere — which countries actually buy from you today?', brief_so_far: {} })
    const r = await turn([said("We're everywhere really.")])
    expect((r.payload.data as { type: string }).type).toBe('question')
    expect(store.facts.geographies).toEqual(['United Kingdom', 'Ireland'])
  })

  it('"I don’t know yet" stored as an answer is the model’s error, and the SERVER still keeps everything else', async () => {
    // The server cannot know a sentence is a non-answer — that is the model's job and the
    // live eval's to check. What the server guarantees is that a turn like this cannot
    // damage the rest of the Brief.
    store.facts = { ...HELD }
    model.reply = q({})
    await turn([said('no idea yet honestly')])
    expect(store.facts).toEqual(HELD)
  })

  it('🛑 A COMPLETION CLAIMED WITH FACTS STILL MISSING IS A CONVERSATION, not a refusal', async () => {
    store.facts = { company_name: 'Redmayne & Co.' }
    model.reply = millaSaid({
      type: 'complete', content: 'Shall I put a plan together?',
      profile: { company_name: 'Redmayne & Co.' },
      icp: { name: 'x', target_category: 'jewellers', job_titles: ['Owner'] },
      brief_so_far: { target_category: 'jewellers' },
    })
    const r = await turn([said('yeah just build it')])
    expect(r.code, 'the client was charged for the model’s misjudgement').toBe(200)
    expect((r.payload.data as { type: string }).type).toBe('question')
    expect(store.facts.target_category).toBe('jewellers')
  })

  it('a reply in plain words is her question, not a failed turn', async () => {
    store.facts = { ...HELD }
    model.reply = { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Lovely — and who should we steer clear of?' }] }
    const r = await turn([said('ok')])
    expect(r.code).toBe(200)
    expect((r.payload.data as { content: string }).content).toContain('steer clear')
    expect(store.facts).toEqual(HELD)
  })
})


describe('⑤ once they have sent it, we own it — the message survives OUR failure', () => {
  it('🛑 A PROVIDER OUTAGE LOSES OUR REPLY, NEVER THEIR MESSAGE', async () => {
    // 🛑 FOUNDER RULING: "Do not make the customer retype because our AI/provider failed."
    // The transcript used to be written only at the bottom of a SUCCESSFUL turn, so this
    // exact case stored nothing and their words lived in React state alone. One refresh and
    // twenty minutes of conversation was gone.
    model.fail = Object.assign(new Error('upstream unavailable'), { name: 'APIConnectionError', status: 529 })
    const r = await turn([said('We are Redmayne & Co and we restore vintage watches for independent jewellers.')])
    // The turn honestly failed…
    expect(r.code).toBe(503)
    // …and their message is on the server anyway.
    expect(store.conversation.map(t => t.content))
      .toContain('We are Redmayne & Co and we restore vintage watches for independent jewellers.')
  })

  it('🛑 AND A RETRY OF THE SAME TURN DOES NOT DUPLICATE IT', async () => {
    const text = 'We sell to independent jewellers across the UK.'
    model.fail = Object.assign(new Error('upstream unavailable'), { name: 'APIConnectionError' })
    await turn([said(text)])
    model.fail = null
    model.reply = q({ target_category: 'independent jewellers' })
    await turn([said(text)])
    const copies = store.conversation.filter(t => t.content === text).length
    expect(copies, `the message was stored ${copies} times`).toBe(1)
  })

  it('the whole transcript is held, not only the newest line', async () => {
    model.fail = Object.assign(new Error('down'), { name: 'APIConnectionError' })
    await turn([
      said('We are Redmayne & Co.'),
      { role: 'assistant', content: 'Lovely — what do you sell?' },
      said('Vintage watches, to independent jewellers.'),
    ])
    expect(store.conversation).toHaveLength(3)
    expect(store.conversation[0].content).toBe('We are Redmayne & Co.')
    expect(store.conversation[2].content).toBe('Vintage watches, to independent jewellers.')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ THE TARGETING DOOR IS THE SAME MILLA. (POST /icps/chat-build.)
//
// 🛑 IT WAS A SECOND MILLA WITH AMNESIA. This door received twenty turns of BROWSER history
// and nothing else — no Brief, no durable transcript. A client who had spent twenty minutes
// telling Milla what they do and who to avoid came here to change one market and met somebody
// who had never heard of them. The desk chat's promise ("she remembers everything you've told
// her") was untrue on the one door a paying client uses to change their targeting.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑥ the targeting door remembers the client', () => {
  const REMEMBERED = {
    contact_name: 'Ellis', company_name: 'Redmayne & Co.',
    what_they_do: 'restore and sell vintage watches',
    exclusions: 'no pawnbrokers, and nobody who sells replicas',
    geographies: ['United Kingdom', 'Ireland'],
    desired_outcome: 'get on calls with buyers who stock vintage pieces',
  }

  async function changeTargeting(said: string) {
    const { icpRouter } = await import('./icps')
    const layer = (icpRouter as unknown as {
      stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
    }).stack.find(l => l.route?.path === '/chat-build' && l.route?.methods.post)
    if (!layer?.route) throw new Error('POST /icps/chat-build not found')
    const handler = layer.route.stack[layer.route.stack.length - 1].handle
    const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
    const res = {
      status(c: number) { out.code = c; return res },
      json(p: Record<string, unknown>) { out.payload = p; return res },
    }
    await handler({ body: { message: said, history: [] }, headers: {}, params: {}, query: {}, userId: 'user-1' }, res, () => {})
    return out
  }

  it('🛑 THE BRIEF REACHES HER PROMPT — their words, not a blank slate', async () => {
    store.facts = { ...REMEMBERED }
    store.conversation = [{ role: 'user', content: "Pawnbrokers. That's the whole business gone if we get near it." }]
    model.reply = {
      stop_reason: 'tool_use',
      content: [
        { type: 'text', text: 'Adding the US alongside the UK and Ireland.' },
        { type: 'tool_use', id: 't1', name: 'propose_targeting', input: { name: 'x', geographies: ['United Kingdom', 'Ireland', 'United States'] } },
      ],
    }
    const r = await changeTargeting('add the US as well')
    expect(r.code, JSON.stringify(r.payload)).toBe(200)
    const sys = String((model.seenSystem ?? []).slice(-1)[0] ?? '')
    expect(sys, 'the targeting door still knows nothing about this client').toContain('Redmayne & Co.')
    expect(sys, 'their exclusions are invisible on the door where targeting changes')
      .toContain('no pawnbrokers, and nobody who sells replicas')
    expect(sys, 'she cannot see what they told her at setup').toContain('restore and sell vintage watches')
  })

  it('🛑 AND AN UNREADABLE BRIEF COSTS THE MEMORY, NEVER THE TURN', async () => {
    store.throwOnRead = true
    model.reply = {
      stop_reason: 'tool_use',
      content: [{ type: 'text', text: 'Which market did you want to add?' }],
    }
    const r = await changeTargeting('add another country')
    store.throwOnRead = false
    expect(r.code, 'an unreadable Brief refused the client their turn').toBe(200)
  })
})
