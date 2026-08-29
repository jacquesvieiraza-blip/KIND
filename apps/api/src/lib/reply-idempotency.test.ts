// ═══════════════════════════════════════════════════════════════════════════════════════
// REPLY IDEMPOTENCY — a redelivered webhook must not become a second reply.
//
// A duplicate reply is a duplicate classification, a duplicate meeting and a duplicate
// outcome — and outcomes are what the commercial model is judged on.
//
// TWO ACCEPTANCE CLAUSES, AND THEY POINT IN OPPOSITE DIRECTIONS ON PURPOSE:
//
//   reply replay WITH a provider id     → exactly ONE row
//   reply replay WITHOUT one            → deliberately FAIL-OPEN
//
// The second is not a gap. Keying a reply on something synthetic — (campaign, lead, body) —
// would silently DISCARD a real second reply from someone who wrote the same short line
// twice: "yes", "thanks", "ok". A lost reply is a lost meeting that nobody ever sees, and a
// stored duplicate is visible and fixable. The asymmetry is the design.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

// `replyEventKey` is a pure function, but it lives in a module that imports the database
// client, which throws at import time without SUPABASE env vars. Stubbed so the pure
// function under test can be imported without standing up a client it never touches.
vi.mock('@kind/db', () => ({ db: {} }))

import { replyEventKey } from './reply-ingest'

const SQL = stripCommentsForEnvScan(
  readFileSync(join(__dirname, '../../../../supabase/migrations/20260829_reply_idempotency.sql'), 'utf8'))
const read = (f: string) => stripCommentsForEnvScan(readFileSync(join(__dirname, '..', f), 'utf8'))

describe('THE DATABASE BACKSTOP — one row per provider event', () => {
  it('the column stores the EVENT KEY, not the bare message id', () => {
    // provider_message_id alone would drop the delivery-id fallback that a webhook retry
    // actually carries — precisely the case the backstop exists for.
    expect(SQL).toContain('provider_event_key')
    expect(SQL).not.toMatch(/ADD COLUMN IF NOT EXISTS provider_message_id/)
  })

  it('the unique index is PARTIAL — NULL is deliberately not deduplicated', () => {
    const idx = SQL.slice(SQL.indexOf('CREATE UNIQUE INDEX'))
    const stmt = idx.slice(0, idx.indexOf(';'))
    expect(stmt).toContain('figsy_replies (provider_event_key)')
    expect(stmt).toContain('WHERE provider_event_key IS NOT NULL')
  })

  it('nothing keys on the reply BODY — that would discard a real second "yes"', () => {
    // Asserted against the INDEX STATEMENT, not the whole file. The first cut checked the
    // file for the substring "body)" and tripped on prose that merely mentioned the body —
    // a guard failing on its own explanation, for the sixth time in this repo.
    const idx = SQL.slice(SQL.indexOf('CREATE UNIQUE INDEX'))
    const stmt = idx.slice(0, idx.indexOf(';'))
    expect(stmt).not.toMatch(/\bbody\b/i)
    expect(stmt).not.toMatch(/\blead_id\b/i)
    expect(stmt).not.toMatch(/\bcampaign_id\b/i)
  })
})

describe('THE KEY ITSELF — provider message id, else delivery id, else null', () => {
  it('a provider message id wins, namespaced by provider', () => {
    expect(replyEventKey({ provider: 'smartlead', providerMessageId: 'msg-1' })).toBe('smartlead:msg-1')
  })

  it('TWO PROVIDERS WITH THE SAME ID DO NOT COLLIDE', () => {
    // Without namespacing, one vendor's counter could suppress another vendor's real reply.
    expect(replyEventKey({ provider: 'smartlead', providerMessageId: '123' }))
      .not.toBe(replyEventKey({ provider: 'instantly', providerMessageId: '123' }))
  })

  it('THE DELIVERY-ID FALLBACK IS DISTINCT from a message id of the same value', () => {
    // A delivery id identifies one ATTEMPT to hand a message over; a message id identifies
    // the message. Collapsing them would let a retry masquerade as a different reply.
    expect(replyEventKey({ provider: 'resend', providerMessageId: null }, 'svix-9'))
      .toBe('resend:delivery:svix-9')
    expect(replyEventKey({ provider: 'resend', providerMessageId: 'svix-9' }))
      .toBe('resend:svix-9')
  })

  it('NEITHER ID PRESENT → null, which is the fail-open case', () => {
    expect(replyEventKey({ provider: 'resend', providerMessageId: null }, null)).toBeNull()
    expect(replyEventKey({ provider: 'resend', providerMessageId: '  ' }, '  ')).toBeNull()
  })
})

describe('THE PIPELINE STORES THE KEY THE ROUTE ALREADY DEDUPED ON', () => {
  const pipeline = read('lib/reply-pipeline.ts')
  const route = read('routes/figsy.ts')

  it('the insert writes provider_event_key from the context, not from a recomputation', () => {
    // One place decides what "the same reply" means. Recomputing it in the pipeline would
    // create a second opinion, and the database would then protect neither reliably.
    expect(pipeline).toMatch(/provider_event_key:\s*ctx\.eventKey/)
    expect(pipeline).not.toContain('replyEventKey(')
  })

  it('BOTH inbound webhooks pass their dedup key through', () => {
    // Resend and Smartlead each compute `dedupKey` for isDuplicateWebhookEvent; the same
    // value now reaches the row, so the index protects the identity the route compared.
    const occurrences = route.match(/eventKey:\s*dedupKey/g) ?? []
    expect(occurrences.length).toBe(2)
  })
})

describe('THE TWO INSERTS THAT HAVE NO KEY, AND WHY THAT IS CORRECT', () => {
  it('an operator\'s typed reply carries no provider event', () => {
    // manual-reply.ts records an OUTBOUND 'sent_reply'. No provider delivered anything, so
    // there is no message id and no delivery id. Keying it on something synthetic would be
    // inventing an identity to satisfy a column.
    const src = read('lib/manual-reply.ts')
    const insert = src.slice(src.indexOf("from('figsy_replies').insert("))
    expect(insert.slice(0, 400)).not.toContain('provider_event_key')
  })

  it('demo seeding carries no provider event either', () => {
    const src = read('routes/figsy.ts')
    const insert = src.slice(src.lastIndexOf("from('figsy_replies').insert("))
    expect(insert.slice(0, 500)).not.toContain('provider_event_key')
  })

  it('and the migration says so, so the next reader does not "fix" it', () => {
    const raw = readFileSync(join(__dirname, '../../../../supabase/migrations/20260829_reply_idempotency.sql'), 'utf8')
    expect(raw).toMatch(/FAIL-OPEN/i)
    expect(raw).toMatch(/deliberately/i)
  })
})
