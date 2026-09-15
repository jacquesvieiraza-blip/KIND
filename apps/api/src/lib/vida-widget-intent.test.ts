import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD 5 — THE LAST WORD LIST ON A HUMAN-FACING SURFACE: the website chat widget.
//
// 🛑 NINETEEN WORDS DECIDED WHETHER A PERSON BECAME A LEAD. `buyingIntentKeywords` was matched
// against a website visitor's latest message. A hit created a pipeline lead scored 85, drafted
// a follow-up in the client's name and EMAILED THE CLIENT that a hot lead was waiting.
//
//   "how much does a demo usually cost, just curious"     → HOT   ✗  (they said "curious")
//   "ok let's do it, where do I sign"                      → not   ✗  (none of the nineteen)
//
// It is the country parser and the meeting-word list again — deterministic code reading
// English — on the one surface where a wrong answer sends a real email about a real person.
//
// 🛑 THE MODEL THAT IS ALREADY READING THE CONVERSATION SAYS HOW READY THEY ARE, through a
// tool beside its reply. Only an explicit `hot` counts. Unknown is not hot.
//
// ⚠️ AND THE WIDGET WAS ON THE BACKGROUND MODEL. Build 0 missed it — its list of human-facing
// surfaces did not include a visitor talking to a client's bot. It is on the list now.
// ═══════════════════════════════════════════════════════════════════════════════════════

const box = vi.hoisted(() => ({
  reply: null as unknown,
  lastParams: null as Record<string, unknown> | null,
  lastOptions: null as unknown,
  calls: 0,
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class FakeAnthropic {
    messages = {
      create: async (params: Record<string, unknown>, options?: unknown) => {
        box.calls += 1
        box.lastParams = params
        box.lastOptions = options ?? null
        return box.reply
      },
    }
  },
}))

const SCORE_MESSAGES = [
  { role: 'user', content: 'do you do integrations with hubspot' },
  { role: 'assistant', content: 'We do — what are you hoping to connect?' },
]
vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, order: () => q, limit: () => q, in: () => q,
        update: () => q, insert: () => q,
        async single() {
          if (table === 'clients') return { data: { company_name: 'Redmayne & Co.' }, error: null }
          return { data: null, error: null }
        },
        async maybeSingle() { return { data: null, error: null } },
        then(r: (v: unknown) => unknown) {
          return Promise.resolve({
            data: table === 'vida_messages' ? SCORE_MESSAGES : [], error: null,
          }).then(r)
        },
      }
      return q
    },
  },
}))
vi.mock('./denise', () => ({ draftFollowUp: async () => null }))

beforeEach(() => { box.reply = null; box.lastParams = null; box.lastOptions = null; box.calls = 0 })

const REPO = process.cwd()
const live = (src: string) =>
  src.split('\n').filter(l => {
    const t = l.trimStart()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  }).join('\n')

/** A model response: her sentence, plus (optionally) what she recorded about the visitor. */
const said = (text: string, intent?: unknown, toolName = 'note_visitor_intent') => ({
  stop_reason: 'end_turn',
  content: [
    { type: 'text', text },
    ...(intent === undefined ? [] : [{ type: 'tool_use', id: 't1', name: toolName, input: { intent } }]),
  ],
})

async function visitorSays(userMessage: string, history: Array<{ role: string; content: string }> = []) {
  const { generateVidaReply } = await import('./vida')
  return generateVidaReply({
    clientId: 'client-1', sessionId: 'sess-1', userMessage,
    config: { bot_name: 'Vida', system_prompt: null, collect_email: true, collect_phone: false },
    messageHistory: history,
  })
}

describe('🛑 BUILD 5 · the word list is gone from the widget', () => {
  it('🛑 NO KEYWORD LIST READS THE VISITOR', () => {
    const src = live(readFileSync(join(REPO, 'apps/api/src/lib/vida.ts'), 'utf8'))
    expect(src, 'buyingIntentKeywords is back').not.toContain('buyingIntentKeywords')
    expect(src, 'the visitor message is being lowercased for matching again').not.toMatch(/userMessage\.toLowerCase\(\)/)
    expect(src, 'a word list is being scanned').not.toMatch(/\.some\(\s*kw\s*=>/)
    for (const word of ["'pricing'", "'how much'", "'book a call'", "'ready to'"]) {
      expect(src, `the list is back (${word})`).not.toContain(word)
    }
  })

  it('🛑 A MESSAGE FULL OF BUYING WORDS IS NOT HOT WHEN THE MODEL SAYS IT IS NOT', async () => {
    box.reply = said('Happy to explain — most people start with a short call.', 'browsing')
    const r = await visitorSays('how much does a demo usually cost, just curious about pricing and next steps')
    expect(r.isHotLead, 'a curious visitor was turned into a lead by their vocabulary').toBe(false)
    expect(r.reply).toContain('Happy to explain')
  })

  it('🛑 AND A PLAIN "LET’S DO IT" IS HOT WHEN THE MODEL SAYS SO — no keyword required', async () => {
    box.reply = said("Brilliant — I'll get someone to reach out today.", 'hot')
    const r = await visitorSays("ok let's do it, where do I sign")
    expect(r.isHotLead).toBe(true)
  })
})

describe('🛑 BUILD 5 · unknown is not hot — the safe direction, structurally', () => {
  it('no judgement recorded → not hot, and the reply is untouched', async () => {
    box.reply = said('Sure, what would you like to know?')
    const r = await visitorSays('hi')
    expect(r.isHotLead).toBe(false)
    expect(r.reply).toBe('Sure, what would you like to know?')
  })

  it('anything that is not the exact token `hot` is not hot', async () => {
    for (const intent of ['Hot', 'HOT', 'very hot', 'interested', 'browsing', '', null, 1, true]) {
      box.reply = said('…', intent)
      const r = await visitorSays('I want to start today')
      expect(r.isHotLead, `intent=${JSON.stringify(intent)}`).toBe(false)
    }
  })

  it('a tool we did not define is ignored, whatever it claims', async () => {
    box.reply = said('…', 'hot', 'create_lead')
    const r = await visitorSays('I want to start today')
    expect(r.isHotLead).toBe(false)
  })

  it('readVisitorIntent is strict and pure', async () => {
    const { readVisitorIntent } = await import('./vida')
    expect(readVisitorIntent([])).toBeNull()
    expect(readVisitorIntent([null, 'x', 42])).toBeNull()
    expect(readVisitorIntent([{ type: 'tool_use', name: 'note_visitor_intent', input: { intent: 'hot' } }])).toBe('hot')
    expect(readVisitorIntent([{ type: 'tool_use', name: 'note_visitor_intent', input: { intent: 'interested' } }])).toBe('interested')
    expect(readVisitorIntent([{ type: 'tool_use', name: 'note_visitor_intent', input: null }])).toBeNull()
    expect(readVisitorIntent([{ type: 'text', text: 'hot' }])).toBeNull()
  })
})

describe('🛑 BUILD 5 · the model, and how it is asked', () => {
  it('🛑 THE MODEL IS UNCHANGED — that choice is the founder\'s and this build did not make it', async () => {
    // ⛓️ 14 Sep — THIS ASSERTION USED TO READ `toBe(CONVERSATION_MODEL)`, on the reasoning
    // that a visitor typing into a chat window is a human waiting. That reasoning is an
    // INFERENCE, not a ruling, and the founder's actual ruling points the other way:
    // "MILLA = SONNET. VIDA = SONNET. THE OTHER PARTS = HAIKU… Do not reinterpret
    // 'human-facing' broadly." The Vida that ruling names is the OPERATOR's colleague; his
    // words were "Vida. is a conversation for the operator. we dont have a client help
    // bubble." This surface is a stranger on a CLIENT's website and he has not ruled on it.
    //
    // 🛑 SO THE TEST PINS THE STATUS QUO, and the DEFECT is fixed independently of it. The
    // keyword list above is gone either way, because that is ruling 16 and it is not
    // ambiguous. Moving the model would have been this build deciding his cost question.
    const { BACKGROUND_MODEL, AI_TURN_BOUND } = await import('./models')
    box.reply = said('Hello!')
    await visitorSays('hello')
    expect(box.lastParams?.model).toBe(BACKGROUND_MODEL)
    // ⚠️ THE BOUND IS NOT A MODEL DECISION AND IS KEPT. An unbounded call is a visitor
    // staring at a spinner for the SDK's ten-minute default; that was true before and is
    // true now.
    expect(box.lastOptions).toEqual(AI_TURN_BOUND)
  })

  it('the judgement tool is OFFERED, never forced — a forced tool would cost the visitor their sentence', async () => {
    box.reply = said('Hello!')
    await visitorSays('hello')
    const tools = box.lastParams?.tools as Array<{ name: string }>
    expect(tools.map(t => t.name)).toEqual(['note_visitor_intent'])
    expect(box.lastParams?.tool_choice, 'tool_choice is forced').toBeUndefined()
  })

  it('the whole thread reaches the model — the judgement is about the conversation, not one line', async () => {
    box.reply = said('…', 'hot')
    const history = [
      { role: 'user', content: 'do you work with agencies' },
      { role: 'assistant', content: 'We do, mostly founder-led ones.' },
    ]
    await visitorSays('ok then', history)
    const messages = box.lastParams?.messages as Array<{ role: string; content: string }>
    expect(messages).toHaveLength(3)
    expect(messages[0].content).toBe('do you work with agencies')
    expect(messages[2].content).toBe('ok then')
  })

  it('the session score afterwards stays on the background model — nobody is waiting on it', async () => {
    const { BACKGROUND_MODEL } = await import('./models')
    const { scoreSession } = await import('./vida')
    box.reply = { content: [{ type: 'text', text: '{"score": 40, "outcome": "interested"}' }] }
    await scoreSession('sess-1')
    expect(box.calls).toBe(1)
    expect(box.lastParams?.model).toBe(BACKGROUND_MODEL)
  })
})
