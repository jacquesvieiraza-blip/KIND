// ═══════════════════════════════════════════════════════════════════════════════════════
// DELIVERY, REPLIES AND THE CUSTOMER'S OWN TURN — J20-C2 · J22-C1 · J22-C3 · J3-C2 · J1-C1
//
// Five items whose persisted truth is a key, a NOT NULL or an index. Against a mocked
// `supabase-js` every one of them passes by construction: the mock cannot refuse a second
// insert and has no constraints to violate.
//
// ── WHAT EACH ITEM READS BACK ──────────────────────────────────────────────────────────
//
//   J20-C2  "no claim, no automatic sending"
//           → `figsy_sent_emails_enrollment_step_uniq` — one (enrolment, step) may exist once.
//             The claim IS this index: two concurrent send runs both writing step 1 for one
//             enrolment produce one row and one refusal, so a prospect cannot be emailed the
//             same step twice by two replicas.
//
//   J22-C1  "the reply survives a classifier that does not"
//           → a reply row with `classification` NULL is a LEGAL, complete row: the retention
//             does not depend on the model having answered. And the columns that say WHO it
//             came from and WHAT they wrote are NOT NULL, so a retained reply is never a
//             husk nobody can act on.
//
//   J22-C3  "reply routing hardening"
//           → `figsy_replies_provider_event_key_key` — one provider event, one reply row, so a
//             redelivery cannot put the same sentence on a desk twice; and `client_id` is a
//             real foreign key, so a reply always has exactly one owner that exists.
//
//   J3-C2   "the customer's turn is durable before the model"
//           → the row is keyed by the ID THE CLIENT'S OWN SEND CARRIES, so replaying that send
//             (a retry, a double tap, a reconnect) collides with the primary key instead of
//             writing their sentence twice. Durability and exactly-once are the same fact here.
//
//   J1-C1   "one client row per auth user"
//           → `clients_one_per_user`, the partial unique index created by
//             `20260918_clients_one_per_user`. Two concurrent onboards race and the database
//             refuses the second, which is the only thing that can refuse it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import { Client } from 'pg'
import { realdbClient, realdbUrl, createTestClient, dropTestClient } from './harness'

describe('MVP1 · delivery, replies and the customer\'s own turn', () => {
  let c: Client
  const userIds: string[] = []

  beforeAll(async () => { c = await realdbClient() })
  afterAll(async () => {
    for (const u of userIds) await dropTestClient(c, u).catch(() => {})
    await c.end().catch(() => {})
  })

  const newClient = async () => {
    const t = await createTestClient(c)
    userIds.push(t.userId)
    return t
  }

  /** A client with a campaign, a lead and an enrolment — the shape a send needs. */
  async function sendable() {
    const { clientId, userId } = await newClient()
    const lead = await c.query<{ id: string }>(
      `insert into public.leads(client_id, first_name, last_name, email, email_status, country)
       values ($1, 'Ada', 'Prospect', $2, 'verified', 'United Kingdom') returning id`,
      [clientId, `ada-${randomUUID()}@prospect.invalid`])
    const campaign = await c.query<{ id: string }>(
      `insert into public.figsy_campaigns(client_id, name, status) values ($1, 'Realdb campaign', 'active') returning id`,
      [clientId])
    const enrolment = await c.query<{ id: string }>(
      `insert into public.figsy_enrollments(campaign_id, lead_id, client_id, status, current_step)
       values ($1, $2, $3, 'in_progress', 0) returning id`,
      [campaign.rows[0].id, lead.rows[0].id, clientId])
    return { clientId, userId, leadId: lead.rows[0].id, campaignId: campaign.rows[0].id, enrolmentId: enrolment.rows[0].id }
  }

  // ── J20-C2 ───────────────────────────────────────────────────────────────────────────

  it('J20-C2 · two concurrent send runs cannot both write step 1 — the claim is an index', async () => {
    const fx = await sendable()
    const other = new Client({ connectionString: realdbUrl() })
    await other.connect()
    try {
      const send = (on: Client) => on.query(
        `insert into public.figsy_sent_emails(campaign_id, enrollment_id, lead_id, subject, body, step)
         values ($1, $2, $3, 'Hello', 'Body', 1)`,
        [fx.campaignId, fx.enrolmentId, fx.leadId])

      const results = await Promise.allSettled([send(c), send(other)])
      expect(results.filter(r => r.status === 'fulfilled'), 'neither send was recorded').toHaveLength(1)
      const lost = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
      expect(lost, '🛑 THE SAME PROSPECT WAS EMAILED STEP 1 TWICE').toBeTruthy()
      expect(String(lost!.reason)).toMatch(/figsy_sent_emails_enrollment_step_uniq|duplicate key/i)

      const { rows } = await c.query<{ n: string }>(
        `select count(*)::text as n from public.figsy_sent_emails where enrollment_id = $1 and step = 1`, [fx.enrolmentId])
      expect(Number(rows[0].n)).toBe(1)

      // Step 2 is a different claim and is free — the index bounds repetition, not progress.
      await c.query(
        `insert into public.figsy_sent_emails(campaign_id, enrollment_id, lead_id, subject, body, step)
         values ($1, $2, $3, 'Follow up', 'Body', 2)`,
        [fx.campaignId, fx.enrolmentId, fx.leadId])
    } finally { await other.end().catch(() => {}) }
  })

  // ── J22-C1 ───────────────────────────────────────────────────────────────────────────

  it('J22-C1 · a reply is a complete, legal row with NO classification — retention never waits for the model', async () => {
    const fx = await sendable()
    const reply = await c.query<{ id: string }>(
      `insert into public.figsy_replies(campaign_id, enrollment_id, lead_id, client_id, from_email, body, provider_event_key)
       values ($1, $2, $3, $4, 'prospect@prospect.invalid', 'Sounds good', $5) returning id`,
      [fx.campaignId, fx.enrolmentId, fx.leadId, fx.clientId, `evt-${randomUUID()}`])

    const [row] = (await c.query(
      `select classification, classification_reasoning, body, from_email, client_id, received_at
         from public.figsy_replies where id = $1`, [reply.rows[0].id])).rows as Array<Record<string, unknown>>
    expect(row.classification, 'an unclassified reply must be storable — otherwise a dead model loses it').toBeNull()
    expect(row.body).toBe('Sounds good')
    expect(row.from_email).toBe('prospect@prospect.invalid')
    expect(row.client_id).toBe(fx.clientId)
    expect(row.received_at).toBeTruthy()

    // 🛑 AND A HUSK IS NOT A REPLY. What they wrote and who wrote it are NOT NULL, so
    // "retained" can never degrade into a row nobody can act on.
    await expect(c.query(
      `insert into public.figsy_replies(campaign_id, lead_id, client_id, from_email, provider_event_key)
       values ($1, $2, $3, 'x@y.invalid', $4)`,
      [fx.campaignId, fx.leadId, fx.clientId, `evt-${randomUUID()}`]))
      .rejects.toThrow(/null value in column "body"|not-null/i)
  })

  // ── J22-C3 ───────────────────────────────────────────────────────────────────────────

  it('J22-C3 · one provider event is one reply, and every reply has exactly one owner that exists', async () => {
    const fx = await sendable()
    const key = `evt-${randomUUID()}`
    const insert = (on: Client, clientId = fx.clientId) => on.query(
      `insert into public.figsy_replies(campaign_id, enrollment_id, lead_id, client_id, from_email, body, provider_event_key)
       values ($1, $2, $3, $4, 'prospect@prospect.invalid', 'Same sentence', $5)`,
      [fx.campaignId, fx.enrolmentId, fx.leadId, clientId, key])

    await insert(c)
    // The redelivery: Resend retries, or two replicas both read the webhook.
    await expect(insert(c)).rejects.toThrow(/figsy_replies_provider_event_key_key|duplicate key/i)

    const { rows } = await c.query<{ n: string }>(
      `select count(*)::text as n from public.figsy_replies where provider_event_key = $1`, [key])
    expect(Number(rows[0].n), 'one prospect sentence became two rows on a desk').toBe(1)

    // 🛑 AND IT CANNOT BE ROUTED TO A CLIENT THAT DOES NOT EXIST.
    await expect(c.query(
      `insert into public.figsy_replies(campaign_id, lead_id, client_id, from_email, body, provider_event_key)
       values ($1, $2, '00000000-0000-0000-0000-000000000000', 'x@y.invalid', 'body', $3)`,
      [fx.campaignId, fx.leadId, `evt-${randomUUID()}`]))
      .rejects.toThrow(/foreign key|client_id_fkey/i)
  })

  // ── J3-C2 ────────────────────────────────────────────────────────────────────────────

  it('J3-C2 · the customer\'s turn is durable and EXACTLY ONCE — a replayed send collides with the key', async () => {
    const { clientId } = await newClient()
    const session = await c.query<{ id: string }>(
      `insert into public.milla_sessions(client_id, title) values ($1, 'Realdb durability') returning id`, [clientId])

    // The id the client's own send carries. The route writes the customer's row BEFORE the
    // model is called, keyed by this, so the sentence survives a model that never answers.
    const messageId = randomUUID()
    const write = () => c.query(
      `insert into public.milla_messages(id, session_id, client_id, role, content)
       values ($1, $2, $3, 'user', 'What happens next?')`,
      [messageId, session.rows[0].id, clientId])

    await write()
    await expect(write(), 'a replayed send wrote the client\'s sentence twice')
      .rejects.toThrow(/milla_messages_pkey|duplicate key/i)

    const [row] = (await c.query(
      `select role, content from public.milla_messages where id = $1`, [messageId])).rows as Array<Record<string, unknown>>
    expect(row.role).toBe('user')
    expect(row.content, 'the customer\'s own words are not what was stored').toBe('What happens next?')

    // And the reply row is separate, so a failed model leaves the question standing alone
    // rather than erasing it.
    const { rows } = await c.query<{ n: string }>(
      `select count(*)::text as n from public.milla_messages where session_id = $1 and role = 'assistant'`,
      [session.rows[0].id])
    expect(Number(rows[0].n)).toBe(0)
  })

  // ── J1-C1 ────────────────────────────────────────────────────────────────────────────

  it('J1-C1 · one client row per auth user — two concurrent onboards produce one client', async () => {
    // 🛑 THE RACE THIS CLOSES. Two requests (a double tap, a retried signup, two replicas) both
    // read "this person has no client row" and both insert. The read-then-write cannot be made
    // safe in application code; `clients_one_per_user` is what refuses the second.
    const userId = randomUUID()
    userIds.push(userId)
    await c.query('insert into auth.users(id, email) values ($1, $2)', [userId, `race-${userId}@example.invalid`])

    const other = new Client({ connectionString: realdbUrl() })
    await other.connect()
    try {
      const onboard = (on: Client) => on.query(
        `insert into public.clients(user_id, company_name, country) values ($1, 'Race Co', 'United Kingdom')`,
        [userId])
      const results = await Promise.allSettled([onboard(c), onboard(other)])
      expect(results.filter(r => r.status === 'fulfilled'), 'neither onboard created the client').toHaveLength(1)
      const lost = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
      expect(lost, '🛑 ONE PERSON NOW HAS TWO CLIENT ROWS — their data is split across both').toBeTruthy()
      expect(String(lost!.reason)).toMatch(/clients_one_per_user|duplicate key/i)

      const { rows } = await c.query<{ n: string }>(
        `select count(*)::text as n from public.clients where user_id = $1`, [userId])
      expect(Number(rows[0].n)).toBe(1)
    } finally { await other.end().catch(() => {}) }
  })
})
