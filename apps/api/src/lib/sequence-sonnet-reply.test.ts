// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep — HOUSE'S REWRITE ON SONNET WAS REFUSED TWICE AS "INVALID JSON", WITH AN EMPTY REPLY.
//
// Railway: `attempt 1/2: unreadable reply (stop_reason=end_turn), raw:` (empty) and `attempt
// 2/2 … (stop_reason=max_tokens), raw:` (empty). Sonnet 5 thinks by default and returns its
// thinking block FIRST, with empty text; the code read content[0]. This replays that shape.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({ content: [] as unknown[], maxTokens: [] as number[] }))

vi.mock('@kind/db', () => ({ db: { from: () => ({}) } }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (req: { max_tokens: number }) => {
        state.maxTokens.push(req.max_tokens)
        return { content: state.content, stop_reason: 'end_turn' }
      },
    }
  },
}))

import { generateSequence, replyText } from './figsy'

const GOOD = JSON.stringify({
  step1: { subject: 'pipeline question', body: 'Body one.' },
  step2: { subject: 'second', body: 'Body two.' },
  step3: { subject: 'third', body: 'Body three.' },
  step4: { subject: 'fourth', body: 'Body four.' },
  step5: { subject: 'fifth', body: 'Body five.' },
})
const LEAD = { id: 'l1', first_name: 'Dana', last_name: 'Okafor', email: null, job_title: 'CEO', company: 'Harbour Point LLC', industry: null } as never

beforeEach(() => { state.content = []; state.maxTokens = [] })

describe('reading a reply that starts with thinking', () => {
  it('🛑 the Sonnet shape — empty thinking block first, then the text — is read', async () => {
    state.content = [{ type: 'thinking', thinking: '', signature: 'x' }, { type: 'text', text: GOOD }]
    const draft = await generateSequence(LEAD, 'K.I.N.D', null)
    expect(draft.step1.subject).toBe('pipeline question')
  })

  it('the Haiku shape — one text block — reads exactly as before', async () => {
    state.content = [{ type: 'text', text: GOOD }]
    expect((await generateSequence(LEAD, 'K.I.N.D', null)).step1.subject).toBe('pipeline question')
  })

  it('🛑 a reply with only thinking and no text still refuses — nothing is invented', async () => {
    state.content = [{ type: 'thinking', thinking: '', signature: 'x' }]
    await expect(generateSequence(LEAD, 'K.I.N.D', null)).rejects.toThrow(/invalid JSON/)
  })

  it('🛑 the reply has room for thinking plus five emails', async () => {
    state.content = [{ type: 'text', text: GOOD }]
    await generateSequence(LEAD, 'K.I.N.D', null)
    expect(state.maxTokens[0]).toBeGreaterThanOrEqual(16000)
  })

  it('replyText joins text blocks and ignores everything else', () => {
    expect(replyText([{ type: 'thinking', thinking: 'x' }, { type: 'text', text: 'a' }, { type: 'text', text: 'b' }])).toBe('ab')
    expect(replyText(null)).toBe('')
  })
})
