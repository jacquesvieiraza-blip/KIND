import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: { from: () => ({}) } }))
vi.mock('./alerts', () => ({ sendFounderAlert: vi.fn(async () => {}) }))

import { routeReply, replyEventKey, unmatchedAtKnownInboxLines, type LeadMatch } from './reply-ingest'

// #551 — REPLIES LAND BACK AGAINST THE RIGHT INBOX.
//
// The defect does not bite until the first client sends from their own mailbox — which is
// exactly why it needs building before that happens rather than after. The moment a client
// has their own mailbox, the reply arrives THERE, and a fan-out becomes one client reading
// another client's inbound mail.
//
// ⛓️ 16 Sep (GAP 3) — AND THE FAN-OUT IS GONE, INCLUDING FOR THE SHARED-INBOX CASE. This file
// used to record that matching on the prospect's address and fanning out to every client
// holding that lead was *"CORRECT (R1)"* while one shared Resend inbox was the only inbound
// path. The founder's launch-safety ruling supersedes that: one external reply may never reach
// two clients, and an owner we cannot determine FAILS CLOSED to an operator exception.
//
// The order is now: receiving mailbox → one client anyway → persisted originating-send
// evidence → fail closed. The single-client path — virtually every real reply — is untouched.

const A: LeadMatch = { id: 'lead-a', client_id: 'client-A' }
const B: LeadMatch = { id: 'lead-b', client_id: 'client-B' }

describe('today — one shared inbox, nothing changes', () => {
  // ⛓️ 16 Sep (GAP 3) — RE-POINTED, AND THE FOUNDER OVERRODE THE PREMISE BY NAME.
  //
  // 🛑 WHAT THIS ASSERTED: that an unknown inbox FANS OUT to every client holding the lead —
  // *"exactly as R1 intended"* — with the note *"if it broke, every reply in production would
  // start being dropped the day it deployed."*
  //
  // The founder's launch-safety ruling is explicit and supersedes R1 for this one case: *"A
  // reply from a prospect must never be copied/fanned out to multiple clients merely because
  // multiple client lead rows share the same prospect email… If the system cannot determine
  // one safe owner: FAIL CLOSED."*
  //
  // ⚠️ AND THE FEAR IN THE OLD NOTE IS DIRECTLY DISPROVED BELOW, not waved away. The thing
  // that would have dropped "every reply in production" is the SINGLE-CLIENT path, and it is
  // untouched — a reply matching one client is still written to that client, with no extra
  // query and no new refusal. Only a genuine cross-client collision changes behaviour, and it
  // becomes an operator exception naming both candidates rather than a silent drop.
  it('🛑 AN UNKNOWN INBOX NO LONGER FANS OUT ACROSS CLIENTS — it fails closed', () => {
    const r = routeReply([A, B], null)
    expect(r.matches, 'one external reply is still written to two clients').toEqual([])
    expect(r.how).toBe('ambiguous')
    // Both are reported so the alert can name the collision.
    expect(r.excluded).toEqual([A, B])
  })

  it('🛑 AND THE SINGLE-CLIENT PATH — the one that carries production — IS UNTOUCHED', () => {
    // The old note's fear, disproved. This is the shape of virtually every real reply.
    const r = routeReply([A], null)
    expect(r.matches).toEqual([A])
    expect(r.how).toBe('single')
    expect(r.excluded).toEqual([])
  })

  it('two leads under ONE client are not a collision either', () => {
    const A2: LeadMatch = { id: 'lead-a2', client_id: 'client-A' }
    const r = routeReply([A, A2], null)
    expect(r.matches).toEqual([A, A2])
    expect(r.how).toBe('single')
  })

  it('and persisted originating-send evidence resolves a real collision', () => {
    const r = routeReply([A, B], null, new Set(['lead-a']))
    expect(r.matches).toEqual([A])
    expect(r.how).toBe('originating_send')
    expect(r.excluded).toEqual([B])
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
//
// #551 (29 Jul) — THESE SCANS MOVED FILE, NOT MEANING. The 256 provider-agnostic lines that
// used to sit inside the Resend Express handler now live in `lib/reply-pipeline.ts`, so the
// Smartlead feeder shares them instead of growing a second copy (#589). Two assertions below
// read the pipeline now; the ones about authentication and dedup still read the ROUTE, because
// those genuinely remain per-provider. Comment lines are stripped from both, the practice this
// file established after three tests bound to a string inside a comment quoting the old code.
const strip = (p: string) => readFileSync(join(__dirname, p), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

describe('the routing is actually used by the handler', () => {
  const route = strip('../routes/figsy.ts')
  const pipeline = strip('./reply-pipeline.ts')

  it('the pipeline resolves the inbox owner and routes on it', () => {
    expect(pipeline).toContain('resolveInboxOwner')
    expect(pipeline).toContain('routeReply')
  })

  it('the receiving address is read off the payload by the route', () => {
    expect(route).toContain('toEmail')
  })

  it('the dedup key comes from replyEventKey, not the raw svix header', () => {
    // Still per-provider: each feeder authenticates and dedups for itself before delegating.
    expect(route).toContain('replyEventKey')
    expect(route).not.toMatch(/isDuplicateWebhookEvent\(db, req\.headers\['svix-id'\]/)
  })

  it('an unmatched reply at a known inbox ALERTS rather than 200-ing quietly', () => {
    // Bound to the CALL SITE (`name({`), not the first mention — which in the pipeline is the
    // import at the top of the file, where `slice(i - 600, ...)` goes negative and silently
    // reads from the END of the string, giving an empty window that fails for the wrong reason.
    // The same class of trap as binding to a comment: the assertion has to measure the thing
    // it names.
    const i = pipeline.indexOf('unmatchedAtKnownInboxLines({')
    expect(i, 'the call site must exist').toBeGreaterThan(-1)
    expect(pipeline.slice(Math.max(0, i - 600), i + 400)).toContain('sendFounderAlert')
  })

  it('the route DELEGATES rather than keeping its own copy of the pipeline', () => {
    // The point of the move. If a provider handler ever re-inlines the loop, this fails.
    expect(route).toContain('processInboundReply')
    expect(route).not.toContain('await classifyReply(')
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
