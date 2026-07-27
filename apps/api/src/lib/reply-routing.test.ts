import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: { from: () => ({}) } }))
vi.mock('./alerts', () => ({ sendFounderAlert: vi.fn(async () => {}) }))

import { routeReply, replyEventKey, unmatchedAtKnownInboxLines, type LeadMatch } from './reply-ingest'

// #551 — REPLIES LAND BACK AGAINST THE RIGHT INBOX.
//
// The defect does not bite until the first client sends from their own mailbox — which is
// exactly why it needs building before that happens rather than after. Today every reply
// arrives at one shared Resend inbox, so matching on the prospect's address and fanning out
// to every client holding that lead is CORRECT (R1). The moment a client has their own
// mailbox, the reply arrives THERE, and the fan-out becomes one client reading another
// client's inbound mail.

const A: LeadMatch = { id: 'lead-a', client_id: 'client-A' }
const B: LeadMatch = { id: 'lead-b', client_id: 'client-B' }

describe('today — one shared inbox, nothing changes', () => {
  it('an UNKNOWN inbox falls back to the fan-out, exactly as R1 intended', () => {
    // This is the assertion that lets this ship before any client has a mailbox. If it broke,
    // every reply in production would start being dropped the day it deployed.
    const r = routeReply([A, B], null)
    expect(r.matches).toEqual([A, B])
    expect(r.how).toBe('fanout')
    expect(r.excluded).toEqual([])
  })

  it('a single match with an unknown inbox is untouched', () => {
    expect(routeReply([A], null).matches).toEqual([A])
  })

  it('no matches stays no matches — routing invents nothing', () => {
    expect(routeReply([], null).matches).toEqual([])
  })
})

describe('once a client has their own mailbox', () => {
  it('THE REPLY GOES ONLY TO THE MAILBOX OWNER', () => {
    const r = routeReply([A, B], 'client-A')
    expect(r.matches).toEqual([A])
    expect(r.how).toBe('inbox')
  })

  it('the other client is EXCLUDED, and the exclusion is visible rather than silent', () => {
    // Silently dropping B would be indistinguishable from a bug. The caller logs this.
    expect(routeReply([A, B], 'client-A').excluded).toEqual([B])
  })

  it('client B\'s mailbox gets client B\'s reply — the mirror case', () => {
    expect(routeReply([A, B], 'client-B').matches).toEqual([B])
  })

  it('THE HARM THIS PREVENTS: one client never receives another\'s inbound mail', () => {
    for (const owner of ['client-A', 'client-B']) {
      const r = routeReply([A, B], owner)
      expect(r.matches.every(m => m.client_id === owner), owner).toBe(true)
    }
  })

  it('a known inbox with no matching lead returns EMPTY — it does not fall back', () => {
    // Falling back to the fan-out here is precisely the harm. Empty is a real outcome and the
    // caller alerts on it; it is never a reason to hand the reply to whoever holds the lead.
    const r = routeReply([B], 'client-A')
    expect(r.matches).toEqual([])
    expect(r.how).toBe('inbox')
    expect(r.excluded).toEqual([B])
  })

  it('several leads at the same client all receive it', () => {
    const A2: LeadMatch = { id: 'lead-a2', client_id: 'client-A' }
    expect(routeReply([A, A2, B], 'client-A').matches).toEqual([A, A2])
  })
})

describe('idempotency keys on the PROVIDER message id', () => {
  it('prefers the provider id, namespaced by provider', () => {
    expect(replyEventKey({ provider: 'smartlead', providerMessageId: 'msg-1' })).toBe('smartlead:msg-1')
  })

  it('TWO PROVIDERS MAY ISSUE THE SAME ID — neither suppresses the other', () => {
    // Without the namespace, Smartlead message "123" would silently swallow Instantly's
    // message "123", and one client would simply never hear about a reply.
    expect(replyEventKey({ provider: 'smartlead', providerMessageId: '123' }))
      .not.toBe(replyEventKey({ provider: 'instantly', providerMessageId: '123' }))
  })

  it('falls back to the transport delivery id when the provider gives none', () => {
    expect(replyEventKey({ provider: 'resend', providerMessageId: null }, 'svix-abc')).toBe('resend:delivery:svix-abc')
  })

  it('NULL when there is nothing to key on — so the guard FAILS OPEN and processes', () => {
    // Unable to dedup must mean process, never drop. An empty string would be a key that
    // every future event collides with, and the second real reply would vanish.
    expect(replyEventKey({ provider: 'resend', providerMessageId: null }, null)).toBeNull()
    expect(replyEventKey({ provider: 'resend', providerMessageId: '  ' }, '  ')).toBeNull()
  })

  it('the same reply twice produces the same key', () => {
    const r = { provider: 'instantly' as const, providerMessageId: 'x' }
    expect(replyEventKey(r)).toBe(replyEventKey(r))
  })
})

describe('the alert when a reply reaches a known mailbox with no lead', () => {
  const lines = (excludedCount: number) => unmatchedAtKnownInboxLines({
    toEmail: 'ada@acme-client.com', fromEmail: 'stranger@x.com', companyName: 'Acme', excludedCount,
  }).join(' ')

  it('names the client, the mailbox and the sender', () => {
    expect(lines(0)).toContain('Acme')
    expect(lines(0)).toContain('ada@acme-client.com')
    expect(lines(0)).toContain('stranger@x.com')
  })

  it('says explicitly that it was NOT routed to the other client, and why', () => {
    expect(lines(2)).toContain('deliberately NOT routed')
  })

  it('says it was not dropped — the alert IS the record', () => {
    expect(lines(0)).toContain('not been dropped')
  })

  it('offers the ordinary explanations rather than implying a fault', () => {
    expect(lines(0).toLowerCase()).toContain('forwarded')
  })

  it('survives a client with no company name', () => {
    expect(unmatchedAtKnownInboxLines({ toEmail: 'a@b.com', fromEmail: 'c@d.com', companyName: null, excludedCount: 0 }).join(' '))
      .toContain('a client')
  })
})

// ── THE WIRING ───────────────────────────────────────────────────────────────────────────
describe('the routing is actually used by the handler', () => {
  const code = readFileSync(join(__dirname, '../routes/figsy.ts'), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('the handler resolves the inbox owner and routes on it', () => {
    expect(code).toContain('resolveInboxOwner')
    expect(code).toContain('routeReply')
  })

  it('the receiving address is read off the payload', () => {
    expect(code).toContain('toEmail')
  })

  it('the dedup key comes from replyEventKey, not the raw svix header', () => {
    expect(code).toContain('replyEventKey')
    expect(code).not.toMatch(/isDuplicateWebhookEvent\(db, req\.headers\['svix-id'\]/)
  })

  it('an unmatched reply at a known inbox ALERTS rather than 200-ing quietly', () => {
    const i = code.indexOf('unmatchedAtKnownInboxLines')
    expect(i).toBeGreaterThan(-1)
    expect(code.slice(i - 600, i + 400)).toContain('sendFounderAlert')
  })

  it('the inbox lookup does NOT filter by status', () => {
    // A released or retired mailbox still receives mail for weeks, and the pooled→branded
    // handover deliberately overlaps. Filtering to active would orphan the tail of every
    // switched-over client.
    const src = readFileSync(join(__dirname, './reply-ingest.ts'), 'utf8')
    const i = src.indexOf('export async function resolveInboxOwner')
    const block = src.slice(i, i + 900)
    expect(block).toContain('client_inboxes')
    expect(block).not.toMatch(/\.in\('status'|\.eq\('status'/)
  })

  it('a lookup failure falls back to the fan-out rather than dropping', () => {
    const src = readFileSync(join(__dirname, './reply-ingest.ts'), 'utf8')
    const i = src.indexOf('export async function resolveInboxOwner')
    expect(src.slice(i, i + 1200)).toContain('return null')
  })
})
