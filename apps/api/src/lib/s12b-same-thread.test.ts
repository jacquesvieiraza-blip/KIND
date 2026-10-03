// 12b (#2550 · R187 ④) — A REPLY SENT FROM MILLA STAYS IN THE PROSPECT'S THREAD.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { threadHeaders } from './reply-threading'

describe('12b — the thread headers', () => {
  it('Resend\'s message_id → In-Reply-To and References', () => {
    expect(threadHeaders({ email_id: 'e1', message_id: '<CAB123@mail.gmail.com>' }))
      .toEqual({ 'In-Reply-To': '<CAB123@mail.gmail.com>', References: '<CAB123@mail.gmail.com>' })
  })
  it('an id without brackets is bracketed; earlier References are kept, in order, before it', () => {
    expect(threadHeaders({ headers: { 'Message-ID': 'abc@x.com', References: '<one@k.com> <two@k.com>' } }))
      .toEqual({ 'In-Reply-To': '<abc@x.com>', References: '<one@k.com> <two@k.com> <abc@x.com>' })
    expect(threadHeaders({ headers: [{ name: 'message-id', value: '<z@y>' }] }))
      .toEqual({ 'In-Reply-To': '<z@y>', References: '<z@y>' })
  })
  it('no id on file → nothing, and the reply is sent as before', () => {
    expect(threadHeaders({ email_id: 'e1' })).toBeNull()
    expect(threadHeaders(null)).toBeNull()
  })
})

describe('12b — the send uses them', () => {
  it('the manual reply reads the stored payload and passes the headers to the mailbox send', () => {
    const src = readFileSync(join(__dirname, 'manual-reply.ts'), 'utf8')
    expect(src).toContain("select('id, from_email, subject, lead_id, client_id, raw_payload')")
    expect(src).toContain('...(thread ? { headers: thread } : {}),')
  })
})
