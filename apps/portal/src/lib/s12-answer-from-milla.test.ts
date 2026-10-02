// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R187 ④ · card #2550 · sending fix #12a) — REPLIES ARE ANSWERED FROM MILLA.
//
// R187 ④: *"Replies are answered from the portal: Milla drafts, a person edits and presses Send,
// from the same mailbox in the same thread; nothing is ever sent without the press. Nobody has to
// open Gmail."* It amends R150 / R165, which kept Milla's Inbox read-only.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildConversations, NEXT, type ReplyRow } from './inbox'

const strip = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*|\{\/\*)/.test(l)).join('\n')
const SCREEN = readFileSync(join(__dirname, '../components/milla/MillaInbox.tsx'), 'utf8')
const CODE = strip(SCREEN)
const fnBody = (name: string) => {
  const at = CODE.indexOf(`async function ${name}(`)
  if (at === -1) throw new Error(`${name} is missing`)
  const next = CODE.indexOf('\n  }\n', at)
  return CODE.slice(at, next === -1 ? at + 1500 : next)
}

const reply = (o: Partial<ReplyRow>): ReplyRow => ({
  id: 'r1', from_email: 'priya@fernhill.co.uk', from_name: 'Priya Shah', subject: 'Re: hello', body_text: 'Yes please',
  body: null, classification: 'interested', received_at: '2026-10-02T10:00:00Z', processed_at: null, lead_id: 'L1', ...o,
})

describe('R187 ④ — each conversation knows which reply to answer', () => {
  it('🛑 the reply answered is the latest one FROM THEM — never our own answer', () => {
    const [c] = buildConversations([
      reply({ id: 'first', received_at: '2026-10-01T10:00:00Z' }),
      reply({ id: 'latest', received_at: '2026-10-02T10:00:00Z' }),
      reply({ id: 'ours', classification: 'sent_reply', received_at: null, processed_at: '2026-10-02T11:00:00Z' }),
    ], [])
    expect(c.replyId).toBe('latest')
  })

  it('🛑 it knows whether they are still waiting on an answer', () => {
    const [waiting] = buildConversations([reply({})], [])
    expect(waiting.awaitingAnswer).toBe(true)
    const [answered] = buildConversations([
      reply({}),
      reply({ id: 'ours', classification: 'sent_reply', received_at: null, processed_at: '2026-10-02T11:00:00Z' }),
    ], [])
    expect(answered.awaitingAnswer).toBe(false)
  })
})

describe('R187 ④ — Milla drafts, a person presses Send', () => {
  it('🛑 the ONLY way an email leaves is the Send button: one send call, inside send(), pressed by the Send button', () => {
    expect(CODE.split('send-reply').length - 1).toBe(1)
    expect(fnBody('send')).toContain('send-reply')
    expect(CODE).toMatch(/onClick=\{\(\) => void send\(\)\}[\s\S]{0,400}'Send'/)
  })

  it('🛑 drafting never sends — the draft function writes into the box and nothing else', () => {
    expect(CODE.split('ai-draft').length - 1).toBe(1)
    const draft = fnBody('draft')
    expect(draft).toContain('ai-draft')
    expect(draft).not.toContain('send-reply')
    expect(draft).not.toContain('send(')
  })

  it('🛑 Milla drafts by herself only for someone interested and still waiting — otherwise a person asks', () => {
    expect(CODE).toContain("c.awaitingAnswer && c.status === 'interested'")
    expect(CODE).toContain('Draft with Milla')
  })

  it('🛑 someone who asked not to be contacted gets no reply box at all', () => {
    expect(CODE).toContain("c.status !== 'stop'")
  })

  it('the box is the person\'s to edit, and says where the email goes from', () => {
    expect(CODE).toContain('<textarea')
    expect(SCREEN).toContain('from your own mailbox')
    expect(SCREEN).toContain('Nothing is sent until you press Send')
  })

  it('🛑 still no "mark booked" from Milla — a client click never creates a billable meeting', () => {
    expect(CODE).not.toContain('mark-booked')
  })

  it('the "interested" note no longer says only we answer', () => {
    expect(NEXT.interested.text).not.toMatch(/^We answer them/)
  })
})
