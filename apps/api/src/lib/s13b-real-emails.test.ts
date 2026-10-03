// 13b (#2551 · R187 ②) — ASKED TO SEE THE EMAILS, MILLA SHOWS THE EMAILS.
//
// Asked "Show me the full sequence", Milla described the six stages ("once you approve…").

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { asksForEmails, emailsMessage, WITH_OUR_TEAM_COPY, readable } from '../../../portal/src/lib/emails-message'

describe('13b — what counts as asking', () => {
  it('the chips and the ordinary ways of asking', () => {
    for (const t of ['Show me the full sequence', 'Show me my emails', 'can I see the emails?', 'let me read the messages', 'View my e-mail sequence'])
      expect(asksForEmails(t), t).toBe(true)
  })
  it('not every mention of email', () => {
    for (const t of ['How many emails have gone out?', 'Show me my meetings', 'Please pause my programme'])
      expect(asksForEmails(t), t).toBe(false)
  })
  // ⚑ 3 Oct (review S10) — an ordinary sentence that MENTIONS reading or seeing emails is a chat
  // turn, not a request for the list.
  it('a sentence that only mentions them is answered, not hijacked', () => {
    for (const t of ['I read your email about the target, can we change it?', 'can you see why my messages bounced?', 'We saw a reply in the sequence yesterday'])
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
      // ⛓️ 3 Oct: the heading was 'Here are your emails, exactly as they go out:' — over raw tags.
      'Here are your emails. Each person gets them with their own name and company where the brackets are:\n\n' +
      'Email 1 of 2\nSubject: One question\n\nHi Sam,\n\nShort note.\n\nWorth a chat?' +
      '\n\n────────\n\n' +
      'Email 2 of 2 — 3 days after email 1\nSubject: Following up\n\nHi Sam,\n\nOne more thought.\n\nThe Milla & Vida Team')
  })
  it('no emails yet → says so, and that nothing is sent before approval', () => {
    expect(emailsMessage([])).toMatch(/not written yet/)
  })
  it('held for the founder\'s check → R189 ⑧\'s words, never "not written yet"', () => {
    expect(emailsMessage([], { awaitingFounder: true })).toBe(WITH_OUR_TEAM_COPY)
    expect(WITH_OUR_TEAM_COPY).toContain('with our team for a final check, usually within 1 working day')
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
    expect(conv).toContain('{ awaitingFounder: r.data?.awaiting_founder === true }')
  })
})

// ⚑ 3 Oct — seen on the real screen: the client was shown raw {{first_name}} / {{company}} tags.
describe('13b — the client never sees a template tag', () => {
  it('tags become plain words; nothing is left in braces', () => {
    expect(readable('Hi {{first_name}} — firms {{company}}\'s size {{ Title }}')).toBe('Hi [their first name] — firms [their company]\'s size [their job title]')
    expect(readable('{{unknown_tag}}x')).toBe('x')
  })
  it('the message carries no braces', () => {
    const out = emailsMessage([{ step: 1, subject: '{{first_name}}, one question', body: 'Hi {{first_name}} at {{company}}', wait_days: 0 }])
    expect(out).not.toMatch(/\{\{|\}\}/)
    expect(out).toContain('Subject: [their first name], one question')
  })
})
