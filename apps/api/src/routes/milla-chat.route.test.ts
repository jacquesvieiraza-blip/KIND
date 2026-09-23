// ═══════════════════════════════════════════════════════════════════════════════════════
// WHAT PRODUCTION ACTUALLY SENDS TO THE MODEL — through the REAL `/milla` chat handler.
//
// 🛑 WHY THIS FILE EXISTS. #1616 shipped an ordered programme lifecycle into the system
// prompt. Every guard was green, the code merged and deployed — and the founder asked the
// same two questions on House and MBF Holdings and got the SAME OLD ANSWERS.
//
// The existing guards read `milla-chat-system.ts` as a STRING and assert its contents. That
// proves the file says the right thing. It cannot prove the deployed request path assembles
// it, reaches it, or fails to have it overridden by something later in the payload — and
// "the tests inspect the source" is exactly the gap a runtime failure hides in.
//
// ⚠️ SO THIS DRIVES THE REAL EXPRESS ROUTE the `/milla` page posts to —
// `POST /milla/sessions/:sessionId/chat` (routes/milla.ts:367) — and captures the LITERAL
// `system` string and `messages` array handed to `anthropic.messages.create`. Nothing about
// the model's prose is asserted; what is asserted is the CONTEXT production supplies.
//
// ⚠️ THE PAGE CALLS `/sessions/:id/chat`, NOT `/chat`. Both doors are exercised below,
// because 4A-2A touched both and only one of them is what the founder was typing into.
//
// Mocks only. No provider, no database, no network.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Row = Record<string, unknown>

/** Everything the fake Anthropic client saw. This is the artefact under test. */
const sent: { system: string; messages: { role: string; content: string }[] }[] = []

/** The thread's stored history, oldest first — what the route feeds back to the model. */
let history: Row[] = []

function installMocks() {
  vi.doMock('@anthropic-ai/sdk', () => {
    class FakeAnthropic {
      messages = {
        create: async (args: { system: string; messages: { role: string; content: string }[] }) => {
          sent.push({ system: args.system, messages: args.messages })
          return { content: [{ type: 'text', text: 'ok' }] }
        },
      }
    }
    return { default: FakeAnthropic }
  })

  vi.doMock('@kind/db', () => {
    const build = (table: string) => {
      const q: any = {}
      q.select = () => q
      q.eq = () => q
      q.order = () => q
      q.limit = () => q
      q.single = async () => ({ data: { id: 'sess-1' }, error: null })
      q.maybeSingle = async () => ({ data: { id: 'c1', company_name: 'House' }, error: null })
      q.not = () => q
      q.insert = () => ({ then: (r: (v: unknown) => void) => r({ error: null }) })
      q.then = (r: (v: unknown) => void) => {
        if (table === 'milla_messages') { r({ data: history, error: null }); return }
        r({ data: [], error: null })
      }
      return q
    }
    return { db: { from: (t: string) => build(t), rpc: async () => ({ data: null, error: null }) } }
  })

  // ⚠️ THE PROGRAMME IS REAL TRUTH, MOCKED AT ITS READER — the same one the workspace uses.
  vi.doMock('../lib/customer-programme', () => ({
    readCustomerProgramme: async () => ({
      stage: 'Proof', quickAction: 'Show me stronger examples',
      paused: false, pausedCopy: null, reviewOpen: false,
      outcome: { kind: 'meetings', target: null },
      progress: { delivered: 0, sourcingAuthorised: false, outcomesAchieved: 0 },
      money: { totalCents: 0, firstPaidAt: null, secondPaidAt: null },
      approvedAt: null, wentLiveAt: null,
    }),
  }))
  vi.doMock('../lib/milla-summary', () => ({
    buildMillaSummaryData: async () => ({ meetings_booked: 0, meetings_total: 0, replies_total: 4 }),
  }))
  vi.doMock('../lib/alerts', () => ({ sendFounderAlert: async () => {} }))
  vi.doMock('../middleware/auth', () => ({
    requireAuth: (_q: Row, _s: Row, n: () => void) => n(),
  }))
}

/** Drive the REAL route the `/milla` page posts to, and return what the model was sent. */
async function ask(question: string) {
  sent.length = 0
  const { millaRouter } = await import('./milla')
  const layer = (millaRouter as unknown as { stack: any[] }).stack.find(
    l => l.route?.path === '/sessions/:sessionId/chat' && l.route?.methods?.post,
  )
  if (!layer) throw new Error('the /milla page\'s chat route is gone from millaRouter')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const req = {
    params: { sessionId: 'sess-1' }, userId: 'u1',
    body: { message: question }, headers: {},
  }
  let payload: Row = {}
  const res = { status: () => res, json: (b: Row) => { payload = b; return res } } as any
  await handler(req, res, () => {})
  return { payload, system: sent[0]?.system ?? '', messages: sent[0]?.messages ?? [] }
}

beforeEach(() => {
  vi.resetModules()
  sent.length = 0
  history = []
  // ⚠️ `vitest.setup.ts` deletes every provider key (R66, zero spend). The side-panel door
  // checks for one and short-circuits with "I can't reach my brain" before ever building a
  // payload — which is why its first run captured nothing. The Anthropic client is MOCKED
  // above, so setting a placeholder here cannot reach a provider or spend anything; it only
  // gets us past the guard so the payload this file exists to inspect is actually built.
  process.env.ANTHROPIC_API_KEY = 'test-key-not-a-real-key'
  installMocks()
})
afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY
  vi.restoreAllMocks(); vi.resetModules()
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('THE REAL /milla CHAT ROUTE REACHES THE LIFECYCLE PROMPT', () => {
  it('the route the page posts to still exists, and it calls the model', async () => {
    // Vacuity first: if the route moved or the model call vanished, everything below is noise.
    const { system } = await ask('What happens after Proof?')
    expect(sent, 'the real route did not call the model at all').toHaveLength(1)
    expect(system.length, 'production sent an empty system prompt').toBeGreaterThan(500)
  })

  // 🛑 THE THREE QUESTIONS THAT FAILED LIVE. No prose is asserted — only that the context
  // production supplies carries the complete ordered gates.
  const QUESTIONS = [
    'When will you start outreach?',
    'What happens after Proof?',
    'When does sourcing start?',
  ]

  for (const q of QUESTIONS) {
    it(`"${q}" — the model is given the complete ordered lifecycle`, async () => {
      const { system } = await ask(q)
      const order = [
        '1. PROOF', '2. RECOMMENDATION', '3. PAYMENT 1', '4. SOURCING / PREPARATION',
        '5. THE CLIENT REVIEWS', '6. APPROVAL', '7. PAYMENT 2', '8. LIVE',
      ]
      for (const step of order) {
        expect(system.indexOf(step), `production did not send lifecycle step: ${step}`)
          .toBeGreaterThan(-1)
      }
      // ⚠️ ORDER, NOT PRESENCE. Every step could be present and out of sequence.
      for (let i = 1; i < order.length; i++) {
        expect(system.indexOf(order[i]), `${order[i]} is out of order in the LIVE payload`)
          .toBeGreaterThan(system.indexOf(order[i - 1]))
      }
      // And the two collapses the founder heard are forbidden in the payload itself.
      expect(system).toContain('SOURCING AND OUTREACH ARE NOT THE SAME TRANSITION')
      expect(system).toContain('APPROVAL DOES NOT FOLLOW PROOF')
    })
  }

  it('no competing retired instruction rides along in the live payload', async () => {
    const { system } = await ask('When will you start outreach?')
    // The prohibition paragraph is the ONE place these may appear.
    const forbidClause = system.split('\n\n').find(p => p.startsWith('RETIRED —')) ?? ''
    expect(forbidClause, 'the retired-concepts clause is gone from the live payload').not.toBe('')
    const rest = system.replace(forbidClause, '')
    for (const retired of ['wallet', '$299', '$4 ', 'approved lead', 'New leads page', 'cost per lead']) {
      expect(rest.toLowerCase(), `retired concept in the LIVE payload: ${retired}`)
        .not.toContain(retired.toLowerCase())
    }
  })

  it('🛑 THE STATELESS SIDE-PANEL DOOR IS UNMOUNTED — not merely unused (D-63)', async () => {
    // ⛓️ 18 Sep (D-63) — THIS TEST USED TO DRIVE THAT DOOR and assert it sent the same
    // lifecycle as the desk chat: ~~`expect(layer, 'the stateless side-panel chat route is
    // gone').toBeTruthy()`~~. The assertion was right for as long as the door existed, and
    // keeping it would now be a green tick over a surface that has been withdrawn.
    //
    // 🛑 WHY IT WENT, AND WHY "NOBODY CALLS IT" WAS NOT ENOUGH. It answered from the
    // `history` array in the request body and stored nothing, so it was a second Milla who
    // forgot the conversation the desk chat was busy remembering. O1 disconnected it on
    // 14 Sep by taking `liveChatEndpoint` off the Milla card — but an unmounted route and an
    // un-linked route are different facts, and only one of them is unreachable. The route
    // stayed open, authenticated and subscription-gated, for anyone who still knew the URL.
    //
    // ⚠️ THE ASSERTION IS THE ROUTER'S OWN STACK, not a source scan. A file can stop
    // mentioning a path while the handler is still mounted from somewhere else; what makes a
    // door reachable is that Express is holding it.
    const { millaRouter } = await import('./milla')
    const layer = (millaRouter as unknown as { stack: any[] }).stack.find(
      l => l.route?.path === '/chat' && l.route?.methods?.post,
    )
    expect(layer, 'the stateless, memoryless Milla door is mounted again').toBeFalsy()

    // 🛑 AND THE DOOR THAT REPLACED IT IS STILL THERE. An assertion that something is absent
    // passes just as loudly when the whole router failed to load, so the surviving persisted
    // door is named here — if this goes red together with the line above, the problem is the
    // import, not the product.
    const desk = (millaRouter as unknown as { stack: any[] }).stack.find(
      l => l.route?.path === '/sessions/:sessionId/chat' && l.route?.methods?.post,
    )
    expect(desk, 'the persisted desk chat is gone — this guard is proving nothing').toBeTruthy()
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE THING THE STATIC GUARDS COULD NEVER SEE.
//
// The route replays the last ten messages of the thread as `assistant` turns. On House and
// MBF those turns are Milla's OWN earlier answers — the pre-#1616 ones, stating the wrong
// sequence in her own voice. A system prompt is one block; ten in-context assistant turns
// agreeing with each other are a demonstrated pattern, and the model continues the pattern.
//
// That is why BOTH accounts returned the same old answers after a correct deploy, and why
// re-writing the prompt again would not have helped: the contradiction is IN THE PAYLOAD,
// after the prompt, and nothing was re-asserting the truth closer to the question.
describe('THE THREAD REPLAYS OLD ANSWERS BACK INTO THE PAYLOAD', () => {
  const STALE = 'Outreach starts after two things happen: 1. You approve the programme '
    + '2. Payment 2 lands — that\'s what authorises us to actually reach out'

  it('a pre-#1616 answer really is replayed to the model as an assistant turn', async () => {
    // This is the mechanism, asserted rather than assumed.
    history = [
      { role: 'user', content: 'When will you start outreach?' },
      { role: 'assistant', content: STALE },
    ]
    const { messages } = await ask('When does sourcing start?')
    const assistantTurns = messages.filter(m => m.role === 'assistant').map(m => m.content)
    expect(assistantTurns, 'the thread no longer replays prior answers')
      .toContain(STALE)
  })

  it('🛑 the corrected lifecycle is re-asserted AFTER the stale turns, next to the question', async () => {
    // The fix: the live sequence rides in the FINAL user turn, so the most recent instruction
    // in the payload is the correct one rather than the model's own outdated answer.
    history = [
      { role: 'user', content: 'When will you start outreach?' },
      { role: 'assistant', content: STALE },
    ]
    const { messages } = await ask('When does sourcing start?')
    const last = messages[messages.length - 1]
    expect(last.role).toBe('user')
    expect(last.content, 'the final turn does not re-assert the lifecycle')
      .toContain('THE PROGRAMME LIFECYCLE, IN ORDER')
    // …and it genuinely sits after the stale answer in the payload.
    const staleIdx = messages.findIndex(m => m.content.includes(STALE))
    expect(staleIdx, 'the stale turn is gone — this guard would pass vacuously').toBeGreaterThan(-1)
    expect(messages.length - 1).toBeGreaterThan(staleIdx)
  })

  it('the question itself is still the last thing the model reads', async () => {
    const { messages } = await ask('When does sourcing start?')
    const last = messages[messages.length - 1].content
    expect(last.trimEnd().endsWith('When does sourcing start?'),
      'the re-assertion was appended after the question, burying it').toBe(true)
  })

  it('and no stored message is rewritten to achieve any of this', async () => {
    // The correction is what she is told NEXT. History stays the record of what we said then.
    history = [{ role: 'assistant', content: STALE }]
    const before = JSON.parse(JSON.stringify(history))
    await ask('When does sourcing start?')
    expect(history).toEqual(before)
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
// THE DIAGNOSTIC — so the next "is it deployed?" takes one curl, not an hour.
describe('/health names the Milla prompt this build is running', () => {
  it('the fingerprint is deterministic and derived from the real constants', async () => {
    const { createHash } = await import('node:crypto')
    const { PROGRAMME_LIFECYCLE, LIFECYCLE_RULES } = await import('../lib/milla-chat-system')
    const joined = [...PROGRAMME_LIFECYCLE, ...LIFECYCLE_RULES].join('|')
    const fp = createHash('sha256').update(joined).digest('hex').slice(0, 12)
    expect(fp).toHaveLength(12)
    // Two calls agree — otherwise it cannot identify a deploy.
    expect(createHash('sha256').update(joined).digest('hex').slice(0, 12)).toBe(fp)
    // And it MOVES when the lifecycle does, or it proves nothing.
    const changed = createHash('sha256').update(joined + 'x').digest('hex').slice(0, 12)
    expect(changed).not.toBe(fp)
  })

  it('🛑 the fingerprint leaks no prompt text, customer data or secret', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const src = readFileSync(join(__dirname, '../index.ts'), 'utf8')
    const fn = src.slice(src.indexOf('function millaPromptFingerprint'))
      .slice(0, src.slice(src.indexOf('function millaPromptFingerprint')).indexOf('\napp.get'))
    expect(fn, 'the fingerprint function is gone').toContain('createHash')
    // It returns a count and a digest. Nothing else may cross the boundary.
    expect(fn).toMatch(/return \{ steps: PROGRAMME_LIFECYCLE\.length, rules: LIFECYCLE_RULES\.length, fp \}/)
    expect(fn, 'raw prompt text is returned from the health endpoint').not.toMatch(/join\('\\n'\)|PROGRAMME_LIFECYCLE\[/)
    expect(fn).not.toMatch(/message|content|email|apiKey|API_KEY|client_id/i)
    // A build that cannot name its prompt says so rather than inventing a value.
    expect(fn).toContain("fp: 'unknown'")
  })
})
