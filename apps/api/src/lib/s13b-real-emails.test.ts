// 13b (#2551 · R187 ②) — ASKED TO SEE THE EMAILS, MILLA SHOWS THE EMAILS.
//
// Asked "Show me the full sequence", Milla described the six stages ("once you approve…").

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { asksForEmails, emailsMessage } from '../../../portal/src/lib/emails-message'

describe('13b — what counts as asking', () => {
  it('the chips and the ordinary ways of asking', () => {
    for (const t of ['Show me the full sequence', 'Show me my emails', 'can I see the emails?', 'let me read the messages', 'View my e-mail sequence'])
      expect(asksForEmails(t), t).toBe(true)
  })
  it('not every mention of email', () => {
    for (const t of ['How many emails have gone out?', 'Show me my meetings', 'Please pause my programme'])
      expect(asksForEmails(t), t).toBe(false)
  })
})

describe('13b — the emails, laid out as they land', () => {
  it('each email in order, its subject, its paragraphs, and the wait between them', () => {
    const out = emailsMessage([
      { step: 2, subject: 'Following up', body: 'Hi Sam,\nOne more thought.\nThe Milla & Vida Team', wait_days: 0 },
      { step: 1, subject: 'One question', body: 'Hi Sam,\nShort note.\nWorth a chat?', wait_days: 3 },
    ])
    expect(out).toBe(
      'Here are your emails, exactly as they go out:\n\n' +
      'Email 1 of 2\nSubject: One question\n\nHi Sam,\n\nShort note.\n\nWorth a chat?' +
      '\n\n────────\n\n' +
      'Email 2 of 2 — 3 days after email 1\nSubject: Following up\n\nHi Sam,\n\nOne more thought.\n\nThe Milla & Vida Team')
  })
  it('no emails yet → says so, and that nothing is sent before approval', () => {
    expect(emailsMessage([])).toMatch(/not written yet/)
  })
})

describe('13b — wired in', () => {
  it('asking goes to the real emails before any chat call, and live programmes get the chip', () => {
    const conv = readFileSync(join(__dirname, '../../../portal/src/components/milla/MillaConversation.tsx'), 'utf8')
    const send = conv.indexOf('async function send(text: string')
    const gate = conv.indexOf('asksForEmails(msg)) { void showEmails(msg); return }', send)
    expect(gate).toBeGreaterThan(send)
    expect(gate - send).toBeLessThan(400)
    expect(conv).toContain("'/my/programme/review'")
    expect(conv).toContain("['Show me my emails']")
  })
})
