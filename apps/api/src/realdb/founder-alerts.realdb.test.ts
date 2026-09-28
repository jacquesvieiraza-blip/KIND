// ═══════════════════════════════════════════════════════════════════════════════════════
// 28 Sep — SECTION C OF THE END-TO-END CHECK (R172), C8, AGAINST A REAL POSTGRESQL.
//
// `manual-reply.ts` records a reply the founder sends from Vida with classification
// 'sent_reply'. The 3 Jun rule refused it and the insert's error was never read, so the email
// left and its record vanished. A mocked database has no CHECK, so only this proves the fix.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Client } from 'pg'
import { realdbClient, createTestClient, dropTestClient } from './harness'

describe('R172 · C8 · an operator\'s sent reply is kept', () => {
  let c: Client
  let userId: string
  let clientId: string
  let leadId: string
  beforeAll(async () => {
    c = await realdbClient()
    const t = await createTestClient(c, { companyName: 'C8 sent reply' })
    userId = t.userId; clientId = t.clientId
    // A reply always belongs to a lead (`figsy_replies.lead_id` is NOT NULL) — as manual-reply's does.
    const l = await c.query<{ id: string }>(
      `insert into public.leads(client_id, first_name, last_name, email, status)
       values ($1, 'A', 'B', 'c8-lead@example.invalid', 'pending') returning id`, [clientId])
    leadId = l.rows[0].id
  })
  afterAll(async () => {
    await dropTestClient(c, userId).catch(() => {})
    await c.end().catch(() => {})
  })
  const reply = async (classification: string | null) => {
    try {
      await c.query(
        `insert into public.figsy_replies(client_id, lead_id, from_email, subject, body, classification)
         values ($1, $3, 'ops@example.invalid', 'Re: hello', 'Thanks', $2)`, [clientId, classification, leadId])
      return { ok: true }
    } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) } }
  }

  it('🛑 the row manual-reply writes — classification sent_reply — is accepted', async () => {
    expect(await reply('sent_reply')).toEqual({ ok: true })
  })
  it('the existing classifications still are, and a made-up one is still refused', async () => {
    expect(await reply('hot')).toEqual({ ok: true })
    expect(await reply(null)).toEqual({ ok: true })
    expect((await reply('made_up')).ok).toBe(false)
  })
})
