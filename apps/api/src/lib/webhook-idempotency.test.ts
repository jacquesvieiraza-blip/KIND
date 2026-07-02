import { describe, it, expect } from 'vitest'
import { isDuplicateWebhookEvent, type IdempotencyDb } from './webhook-idempotency'

// Build a db stub whose insert resolves to the given result (or throws).
function stubDb(result: { error: { code?: string; message?: string } | null } | Error): IdempotencyDb {
  return {
    from: () => ({
      insert: async () => {
        if (result instanceof Error) throw result
        return result
      },
    }),
  }
}

describe('isDuplicateWebhookEvent — #264 replay guard', () => {
  it('treats a fresh insert (no error) as NOT a duplicate → process', async () => {
    expect(await isDuplicateWebhookEvent(stubDb({ error: null }), 'msg_1', 'resend')).toBe(false)
  })

  it('treats a unique-violation (23505) as a duplicate → skip', async () => {
    expect(await isDuplicateWebhookEvent(stubDb({ error: { code: '23505' } }), 'msg_1', 'resend')).toBe(true)
  })

  it('fails OPEN when the table is not migrated / other db error → process', async () => {
    expect(await isDuplicateWebhookEvent(stubDb({ error: { code: '42P01', message: 'relation does not exist' } }), 'msg_1', 'resend')).toBe(false)
  })

  it('fails OPEN when the insert throws → process', async () => {
    expect(await isDuplicateWebhookEvent(stubDb(new Error('network')), 'msg_1', 'resend')).toBe(false)
  })

  it('cannot dedup without a stable id → process', async () => {
    // If the stub were ever hit it would say duplicate; empty id must short-circuit to process.
    const db = stubDb({ error: { code: '23505' } })
    expect(await isDuplicateWebhookEvent(db, '', 'resend')).toBe(false)
    expect(await isDuplicateWebhookEvent(db, undefined, 'resend')).toBe(false)
    expect(await isDuplicateWebhookEvent(db, null, 'resend')).toBe(false)
    expect(await isDuplicateWebhookEvent(db, '   ', 'resend')).toBe(false)
  })

  it('takes the first value when the header arrives as an array', async () => {
    expect(await isDuplicateWebhookEvent(stubDb({ error: { code: '23505' } }), ['msg_1', 'msg_2'], 'resend')).toBe(true)
  })
})
