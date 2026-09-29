// R164 · Northwind — every row the demo writes, at every stage, accepted by the REAL schema.
//
// The writer (`lib/demo-northwind.ts`) talks to Supabase; the rows are a pure function in
// `demo-northwind-data.ts`. This file writes those exact rows through Postgres, so every NOT
// NULL, CHECK, foreign key and partial unique index the demo depends on is proven — the
// meetings state/qualification checks, the one-open-programme index, the payment split, the
// "paid or authorised, never both" xor (⛓️ 29 Sep, 8b: the demo is paid, no charge). A mock would accept any of them.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Client } from 'pg'
import { randomUUID } from 'node:crypto'
import { millaStage, mvp1MillaStageFromLegacy } from '@kind/shared'
import { realdbClient } from './harness'
import {
  NORTHWIND_CAST, NORTHWIND_REPLIES, NORTHWIND_STAGES, NORTHWIND_MEETINGS, NORTHWIND_RESULTS_MEETINGS,
  northwindRows, type NorthwindIds, type NorthwindRows,
} from '../lib/demo-northwind-data'

/** Insert one row as the writer would; objects and object arrays are jsonb. */
async function insert(c: Client, table: string, row: Record<string, unknown>): Promise<void> {
  const cols = Object.keys(row)
  const vals = cols.map(k => {
    const v = row[k]
    if (v !== null && typeof v === 'object' && !(Array.isArray(v) && v.every(x => typeof x === 'string'))) return JSON.stringify(v)
    return v
  })
  await c.query(
    `insert into public.${table}(${cols.map(k => `"${k}"`).join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')})`,
    vals,
  )
}

async function write(c: Client, rows: NorthwindRows): Promise<void> {
  if (rows.client) await insert(c, 'clients', rows.client)
  if (rows.session) await insert(c, 'milla_sessions', rows.session)
  for (const r of rows.messages) await insert(c, 'milla_messages', r)
  if (rows.draft) await insert(c, 'onboarding_brief_drafts', rows.draft)
  if (rows.programme) await insert(c, 'programmes', rows.programme)
  if (rows.icp) await insert(c, 'icps', rows.icp)
  if (rows.proofClaim) await insert(c, 'proof_pass_claims', rows.proofClaim)
  if (rows.campaign) await insert(c, 'figsy_campaigns', rows.campaign)
  if (rows.sequence) await insert(c, 'figsy_sequences', rows.sequence)
  for (const r of rows.leads) await insert(c, 'leads', r)
  for (const r of rows.enrollments) await insert(c, 'figsy_enrollments', r)
  if (rows.offer) await insert(c, 'figsy_knowledge', rows.offer)
  for (const r of rows.sentEmails) await insert(c, 'figsy_sent_emails', r)
  for (const r of rows.replies) await insert(c, 'figsy_replies', r)
  for (const r of rows.meetings) await insert(c, 'meetings', r)
}

describe('R164 · Northwind demo — every stage is accepted by the real schema and lands on its own screen', () => {
  let c: Client
  const users: string[] = []

  beforeAll(async () => { c = await realdbClient() })
  afterAll(async () => {
    for (const u of users) {
      // meetings.client_id is ON DELETE RESTRICT — the same order the writer clears in.
      await c.query('delete from public.meetings where client_id in (select id from public.clients where user_id = $1)', [u])
      await c.query('delete from auth.users where id = $1', [u])
    }
    await c.end()
  })

  const newIds = async (): Promise<NorthwindIds> => {
    const userId = randomUUID()
    users.push(userId)
    await c.query('insert into auth.users(id, email) values ($1, $2)', [userId, `northwind-${userId}@kind-demo.internal`])
    return {
      userId, clientId: randomUUID(), icpId: randomUUID(), programmeId: randomUUID(),
      campaignId: randomUUID(), sequenceId: randomUUID(), sessionId: randomUUID(),
      leadIds: NORTHWIND_CAST.map(() => randomUUID()), replyIds: NORTHWIND_REPLIES.map(() => randomUUID()),
    }
  }

  for (const stage of NORTHWIND_STAGES) {
    it(`${stage}: every row is written and the client's ribbon reads "${stage}"`, async () => {
      const ids = await newIds()
      const rows = northwindRows(stage, ids, new Date())
      await write(c, rows)

      if (stage === 'Brief') {
        // Brief = signed in, no account yet — only the half-finished Brief conversation exists.
        const n = await c.query('select count(*)::int as n from public.clients where user_id = $1', [ids.userId])
        expect(n.rows[0].n).toBe(0)
        const d = await c.query('select jsonb_array_length(conversation) as turns, confirmed_at from public.onboarding_brief_drafts where user_id = $1', [ids.userId])
        expect(d.rows[0]).toEqual({ turns: 7, confirmed_at: null })
        return
      }
      // Milla's chat opens on a history, never empty.
      const chat = await c.query('select count(*)::int as n from public.milla_messages where client_id = $1', [ids.clientId])
      expect(chat.rows[0].n).toBeGreaterThan(0)
      const cl = await c.query('select is_demo, proof_completed_at, size_locked_at, size_band from public.clients where id = $1', [ids.clientId])
      expect(cl.rows[0].is_demo).toBe(true)
      expect(cl.rows[0].size_locked_at).not.toBeNull()
      const pr = await c.query('select status, first_paid_at, second_paid_at, first_payment_ref, first_payment_intent_id, first_authorised_at from public.programmes where client_id = $1', [ids.clientId])
      const status = pr.rows[0]?.status ?? null
      // ~~Never paid: no payment date or reference on any demo programme.~~
      // ⛓️ 29 Sep (R174 ⑧ · PR 8b): the demo reads PAID IN FULL, like a real client, with the
      // reference that says no charge — accepted by the real schema's authority xor (never
      // `first_authorised_at` as well), no payment intent, and never counted as money (8c).
      for (const r of pr.rows) {
        expect(r.first_paid_at).not.toBeNull(); expect(r.second_paid_at).not.toBeNull()
        expect(String(r.first_payment_ref)).toMatch(/^demo-no-charge:/); expect(r.first_payment_intent_id).toBeNull()
        expect(r.first_authorised_at).toBeNull()
      }
      const ribbon = mvp1MillaStageFromLegacy(millaStage({ status, proofComplete: cl.rows[0].proof_completed_at !== null }))
      expect(ribbon).toBe(stage)

      // The Proof desk's own filters (`/leads/for-approval`) find at least 20 people.
      const desk = await c.query(
        `select count(*)::int as n from public.leads where client_id = $1 and set_aside_reason is null
           and delivered_at is not null and surfaced_for_approval_at is not null and revealed_at is null
           and status <> 'passed' and proof_pass is not null`, [ids.clientId])
      expect(desk.rows[0].n).toBeGreaterThanOrEqual(20)

      // Meetings: counted the way `meetingCounts` counts them, all qualified (R141).
      const m = await c.query(
        `select count(*)::int as n, count(qualified_at)::int as q from public.meetings
          where client_id = $1 and programme_id = $2 and excluded_reason is null and superseded_by is null`,
        [ids.clientId, ids.programmeId])
      const expected = stage === 'Complete' ? NORTHWIND_MEETINGS : stage === 'Results' ? NORTHWIND_RESULTS_MEETINGS : 0
      expect(m.rows[0].n).toBe(expected)
      expect(m.rows[0].q).toBe(expected)
    })
  }

  it('the demo can be cleared in the writer\'s order (meetings first — RESTRICT), leaving the login', async () => {
    const ids = await newIds()
    await write(c, northwindRows('Complete', ids, new Date()))
    await expect(c.query('delete from public.clients where id = $1', [ids.clientId])).rejects.toThrow()
    await c.query('delete from public.meetings where client_id = $1', [ids.clientId])
    await c.query('delete from public.clients where id = $1', [ids.clientId])
    const left = await c.query('select (select count(*) from public.leads where client_id = $1)::int as leads, (select count(*) from auth.users where id = $2)::int as login', [ids.clientId, ids.userId])
    expect(left.rows[0]).toEqual({ leads: 0, login: 1 })
  })
})
