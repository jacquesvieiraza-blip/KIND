// 10c (#2564) — THE CLIENT IS TOLD WHEN A PROSPECT SOUNDS INTERESTED, BY EMAIL AND ON THEIR PHONE.
//
// ⛓️ FOUNDER-RULED 2 Oct (R191, chains R87): *"Only interested replies"* — an email + a phone
// alert, linking to their Inbox, and nothing for a "no", an out-of-office or a bounce.
//
// The rule and the words are RUN; the send itself is run against a mocked database, email and
// push so the test proves who is told, not merely that the code mentions it.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const sent: { email: { to: string; subject: string; line: string; link: string }[]; push: { clientId: string; url?: string; body: string }[] } = { email: [], push: [] }
let pref: boolean | null = null
let prefColumnMissing = false

vi.mock('@kind/db', () => {
  const from = (table: string) => {
    let cols = ''
    const q = {
      select: (c: string) => { cols = c; return q },
      eq: () => q,
      maybeSingle: async () => {
        if (table === 'clients' && cols.includes('reply_received_emails_enabled')) {
          return prefColumnMissing
            ? { data: null, error: { message: 'column clients.reply_received_emails_enabled does not exist' } }
            : { data: { reply_received_emails_enabled: pref }, error: null }
        }
        if (table === 'clients') return { data: { company_name: 'Acme Ltd', user_id: 'u1' }, error: null }
        if (table === 'leads') return { data: { first_name: 'Sam', last_name: 'Lee', company: 'Globex' }, error: null }
        return { data: null, error: null }
      },
    }
    return q
  }
  return { db: { from, auth: { admin: { getUserById: async () => ({ data: { user: { email: 'owner@acme.test' } } }) } } } }
})
vi.mock('./email', () => ({
  sendInterestedReplyEmail: async (to: string, n: { subject: string; line: string; link: string }) => { sent.email.push({ to, ...n }) },
}))
vi.mock('./push', () => ({
  sendPushToClient: async (clientId: string, p: { url?: string; body: string }) => { sent.push.push({ clientId, ...p }) },
}))

import {
  isInterestedReply, interestedReplyNotice, inboxLink, notifyClientOfInterestedReply,
} from './interested-reply-notice'

const PIPELINE = readFileSync(join(__dirname, 'reply-pipeline.ts'), 'utf8')
const CLIENTS = readFileSync(join(__dirname, '../routes/clients.ts'), 'utf8')
const PENDING = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')

beforeEach(() => { sent.email = []; sent.push = []; pref = null; prefColumnMissing = false })

describe('10c — who counts as interested', () => {
  it('the same three the Inbox files under "Interested"', () => {
    for (const c of ['hot', 'warm', 'interested']) expect(isInterestedReply(c)).toBe(true)
    for (const c of ['cold', 'opt_out', 'unsubscribe', 'out_of_office', 'wrong_person', 'referral', 'other', null])
      expect(isInterestedReply(c)).toBe(false)
  })
})

describe('10c — the words', () => {
  it('names who replied, links to the Inbox, and never carries the reply itself (R132)', () => {
    const n = interestedReplyNotice({ clientCompany: 'Acme Ltd', prospectName: 'Sam Lee', prospectCompany: 'Globex', link: inboxLink('https://app.example.com/') })
    expect(n.subject).toBe('Sam Lee at Globex replied and sounds interested')
    expect(n.link).toBe('https://app.example.com/milla/replies')
    expect(n.line).toMatch(/Open your Inbox/)
    expect(Object.keys(n)).not.toContain('body')
  })
  it('a prospect with no name on file still reads as a sentence', () => {
    const n = interestedReplyNotice({ clientCompany: null, prospectName: null, prospectCompany: null, link: 'x' })
    expect(n.subject).toBe('A prospect replied and sounds interested')
    expect(n.greeting).toBe('Hi there,')
  })
})

describe('10c — the alert is sent, and only when it should be', () => {
  it('an interested reply → one email to the client and one phone alert to the Inbox', async () => {
    expect(await notifyClientOfInterestedReply({ clientId: 'c1', leadId: 'l1', classification: 'warm' })).toBe('sent')
    expect(sent.email).toHaveLength(1)
    expect(sent.email[0].to).toBe('owner@acme.test')
    expect(sent.email[0].subject).toBe('Sam Lee at Globex replied and sounds interested')
    expect(sent.push).toEqual([expect.objectContaining({ clientId: 'c1', url: '/milla/replies' })])
  })
  it('a "no thanks" sends nothing', async () => {
    expect(await notifyClientOfInterestedReply({ clientId: 'c1', leadId: 'l1', classification: 'cold' })).toBe('not_interested')
    expect(sent.email).toHaveLength(0)
    expect(sent.push).toHaveLength(0)
  })
  it('the client switched "Reply received" off → nothing', async () => {
    pref = false
    expect(await notifyClientOfInterestedReply({ clientId: 'c1', leadId: 'l1', classification: 'hot' })).toBe('switched_off')
    expect(sent.email).toHaveLength(0)
    expect(sent.push).toHaveLength(0)
  })
  it('before the migration runs, the missing column reads as "on" — alerts are not silenced', async () => {
    prefColumnMissing = true
    expect(await notifyClientOfInterestedReply({ clientId: 'c1', leadId: 'l1', classification: 'hot' })).toBe('sent')
    expect(sent.email).toHaveLength(1)
  })
})

describe('10c — wired in', () => {
  it('the reply pipeline calls it for a STORED reply only, and the old hot-only push is gone', () => {
    expect(PIPELINE).toMatch(/if \(storedReplyId && isInterestedReply\(classification\)\)/)
    expect(PIPELINE).toMatch(/notifyClientOfInterestedReply\(\{ clientId: lead\.client_id, leadId: lead\.id, classification \}\)/)
    expect(PIPELINE).not.toMatch(/title: '🔥 Hot reply'/)
  })
  it('the switch is saved by the API and its column is in the migration runner', () => {
    expect(CLIENTS).toMatch(/reply_received_emails_enabled:\s*z\.boolean\(\)\.optional\(\)/)
    expect(PENDING).toContain("key: '20261002_reply_received_pref'")
    expect(existsSync(join(__dirname, '../../../../supabase/migrations/20261002_reply_received_pref.sql'))).toBe(true)
  })
})
