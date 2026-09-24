// ═══════════════════════════════════════════════════════════════════════════════════════
// 24 Sep — "Failed to generate email sequence — Claude returned invalid JSON".
//
// The House walk's rewrite to version 3 failed on one unreadable reply, right after R157 made
// each email longer and its instructions carried a double-quoted example. This holds the fix:
// the reply is read tolerantly, one bad reply is retried once, two bad replies still refuse, and
// the instructions no longer invite a double quote into the JSON.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({ replies: [] as string[], calls: 0, prompts: [] as string[] }))

vi.mock('@kind/db', () => ({ db: { from: () => ({}) } }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (req: { messages: { content: string }[] }) => {
        state.prompts.push(req.messages[0].content)
        const text = state.replies[state.calls] ?? ''
        state.calls++
        return { content: [{ type: 'text', text }], stop_reason: 'end_turn' }
      },
    }
  },
}))

import { parseSequenceJson, generateSequence, SEQUENCE_DRAFT_ATTEMPTS } from './figsy'
import { VALUE_SPINE } from './sequence-templates'

const GOOD = JSON.stringify({
  step1: { subject: 'pipeline question', body: 'Hi Dana, body one.\n\nReply STOP to opt out.\nKind' },
  step2: { subject: 'second', body: 'Body two.' },
  step3: { subject: 'third', body: 'Body three.' },
  step4: { subject: 'fourth', body: 'Body four.' },
  step5: { subject: 'fifth', body: 'Body five.' },
})
const LEAD = { id: 'l1', first_name: 'Dana', last_name: 'Okafor', email: null, job_title: 'CEO', company: 'Harbour Point LLC', industry: null } as never

beforeEach(() => { state.replies = []; state.calls = 0; state.prompts = [] })

describe('reading the drafted sequence', () => {
  it('reads plain JSON, fenced JSON, and JSON with a sentence around it', () => {
    expect(parseSequenceJson(GOOD)?.step1.subject).toBe('pipeline question')
    expect(parseSequenceJson('```json\n' + GOOD + '\n```')?.step1.subject).toBe('pipeline question')
    expect(parseSequenceJson('Here is the sequence:\n' + GOOD + '\nLet me know!')?.step1.subject).toBe('pipeline question')
  })

  it('🛑 returns nothing — never a guess — when no object can be read', () => {
    expect(parseSequenceJson('')).toBeNull()
    expect(parseSequenceJson('{"step1": {"subject": "a "quoted" word"}}')).toBeNull()
    expect(parseSequenceJson('[1,2,3]')).toBeNull()
  })
})

describe('generateSequence', () => {
  it('🛑 one unreadable reply is retried, and the second good reply is used', async () => {
    state.replies = ['{"step1": {"subject": "broken "quote""}}', GOOD]
    const draft = await generateSequence(LEAD, 'Kind', null)
    expect(state.calls).toBe(2)
    expect(draft.step1.subject).toBe('pipeline question')
  })

  it('🛑 still refuses after every attempt fails — nothing unreadable is ever passed on', async () => {
    state.replies = Array(SEQUENCE_DRAFT_ATTEMPTS).fill('not json at all')
    await expect(generateSequence(LEAD, 'Kind', null)).rejects.toThrow(/invalid JSON/)
    expect(state.calls).toBe(SEQUENCE_DRAFT_ATTEMPTS)
    expect(SEQUENCE_DRAFT_ATTEMPTS).toBe(2)
  })

  it('a good first reply costs exactly one call', async () => {
    state.replies = [GOOD]
    await generateSequence(LEAD, 'Kind', null)
    expect(state.calls).toBe(1)
  })

  it('🛑 the instructions forbid a double quote inside an email, and the value spine carries none', async () => {
    state.replies = [GOOD]
    await generateSequence(LEAD, 'Kind', null)
    expect(state.prompts[0]).toContain('Never put a double quote character inside a subject or a body')
    expect(VALUE_SPINE).not.toContain('"')
  })
})
