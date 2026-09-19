// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CONSOLIDATED BUILD'S MIGRATIONS, PROVEN AGAINST A REAL DATABASE
//
// One case per migration introduced or changed in this wave that does not already have a
// named proof elsewhere. The other three are proven in their own files and named in the
// evidence table rather than duplicated here:
//
//   20260918_clients_one_per_user        → mvp1-delivery-and-replies.realdb.test.ts (J1-C1)
//   20260525_fix_leads_status_…          → leads-status-passed.realdb.test.ts (R133)
//   20260829_programme_delivery_control  → programme-authority.realdb.test.ts ⑥
//
// ── WHY A REPLAY IS NOT A PROOF ────────────────────────────────────────────────────────
//
// `scripts/realdb.sh` applies every migration in filename order and reports `FAILED 0`. That
// says the SQL PARSED AND RAN. It does not say the column is nullable, that the CHECK admits
// the values the product writes, or that an existing row is undisturbed — and every defect
// this wave found in a migration was of exactly that kind: `20260622_subscription_pause`
// applied cleanly for months while `subscriptions.status = 'paused'` was refused by a CHECK
// on every new signup.
//
// So each case below WRITES WHAT THE PRODUCT WRITES and reads it back.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import { Client } from 'pg'
import { realdbClient, realdbUrl, createTestClient, dropTestClient } from './harness'

describe('MVP1 · every migration in this wave, applied and exercised', () => {
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

  const newIcp = async (clientId: string) => (await c.query<{ id: string }>(
    `insert into public.icps(client_id, name) values ($1, 'Migration probe') returning id`, [clientId])).rows[0].id

  // ── 20260918_icp_exclusions (J5-C12 · FD-1) ─────────────────────────────────────────

  it('20260918_icp_exclusions · the column exists, is nullable, and an existing ICP reads NULL', async () => {
    const { clientId } = await newClient()
    const icpId = await newIcp(clientId)

    // EXPAND ONLY: an ICP created without exclusions reads NULL — "they never told us",
    // which the gate treats as no exclusions rather than as an empty answer.
    const [before] = (await c.query(`select exclusions from public.icps where id = $1`, [icpId])).rows as Array<Record<string, unknown>>
    expect(before.exclusions).toBeNull()

    await c.query(`update public.icps set exclusions = $2 where id = $1`,
      [icpId, 'no recruitment agencies, no competitors of ours'])
    const [after] = (await c.query(`select exclusions from public.icps where id = $1`, [icpId])).rows as Array<Record<string, unknown>>
    expect(after.exclusions).toBe('no recruitment agencies, no competitors of ours')
  })

  // ── 20260918_icp_target_size (J5-C4 · LR 10/12) ─────────────────────────────────────

  it('20260918_icp_target_size · the client\'s own words about size are storable and survive a read', async () => {
    const { clientId } = await newClient()
    const icpId = await newIcp(clientId)
    const [before] = (await c.query(`select target_size from public.icps where id = $1`, [icpId])).rows as Array<Record<string, unknown>>
    expect(before.target_size, 'an existing ICP must read NULL, so the band rule still answers for it').toBeNull()

    // The phrase the closed six-band ladder cannot express, which is the whole point of it.
    await c.query(`update public.icps set target_size = $2 where id = $1`, [icpId, 'fifty to a hundred people'])
    const [after] = (await c.query(`select target_size from public.icps where id = $1`, [icpId])).rows as Array<Record<string, unknown>>
    expect(after.target_size).toBe('fifty to a hundred people')
  })

  // ── 20260918_lead_category_fit (J5-C13 · FD-2) ──────────────────────────────────────

  it('20260918_lead_category_fit · the verdict vocabulary is enforced, and NULL means "not judged"', async () => {
    const { clientId } = await newClient()
    const lead = await c.query<{ id: string }>(
      `insert into public.leads(client_id, first_name, last_name) values ($1, 'Cat', 'Fit') returning id`, [clientId])

    const [before] = (await c.query(
      `select category_fit, category_fit_reason from public.leads where id = $1`, [lead.rows[0].id])).rows as Array<Record<string, unknown>>
    expect(before.category_fit, 'a historic lead must read NULL — "not judged", never "refused"').toBeNull()

    for (const verdict of ['yes', 'no', 'unknown']) {
      await c.query(`update public.leads set category_fit = $2, category_fit_reason = $3 where id = $1`,
        [lead.rows[0].id, verdict, `the model said ${verdict}`])
      const [row] = (await c.query(`select category_fit from public.leads where id = $1`, [lead.rows[0].id])).rows as Array<Record<string, unknown>>
      expect(row.category_fit).toBe(verdict)
    }

    // 🛑 AND A FOURTH VERDICT COSTS A MIGRATION, NOT A TYPO.
    await expect(c.query(`update public.leads set category_fit = 'maybe' where id = $1`, [lead.rows[0].id]))
      .rejects.toThrow(/leads_category_fit_check|violates check constraint/i)
  })

  // ── 20260918_proof_set_verdict (J6-C3) ──────────────────────────────────────────────

  it('20260918_proof_set_verdict · the unlock is recorded as an EVENT, and absence is not refusal', async () => {
    const { clientId } = await newClient()
    const [before] = (await c.query(
      `select proof_stronger_set_unlocked_at, proof_stronger_set_unlocked_reason from public.clients where id = $1`,
      [clientId])).rows as Array<Record<string, unknown>>
    expect(before.proof_stronger_set_unlocked_at, 'a client unlocked before today must read NULL — "not recorded", never "refused"').toBeNull()
    expect(before.proof_stronger_set_unlocked_reason).toBeNull()

    await c.query(
      `update public.clients set proof_stronger_set_unlocked_at = now(), proof_stronger_set_unlocked_reason = $2 where id = $1`,
      [clientId, 'both attempts spent and the client asked for a stronger set'])
    const [after] = (await c.query(
      `select proof_stronger_set_unlocked_at, proof_stronger_set_unlocked_reason from public.clients where id = $1`,
      [clientId])).rows as Array<Record<string, unknown>>
    expect(after.proof_stronger_set_unlocked_at).toBeTruthy()
    expect(after.proof_stronger_set_unlocked_reason).toContain('stronger set')
  })

  // ── 20260919_one_canonical_sequence_per_campaign (J13) ──────────────────────────────

  it('20260919_one_canonical_sequence_per_campaign · a second canonical sequence is REFUSED', async () => {
    // 🛑 THE RACE THIS CLOSES, MEASURED IN A CERTIFICATION RUN. A settling sourcing run
    // prepares in the background while an operator presses `prepare-for-review`; both call
    // `applyProgrammeSequence`, both read zero sequences for the campaign, both insert. The
    // campaign then carries two, `resolveProgrammeChain` refuses it for ever, and a paid
    // programme can never be prepared, frozen, approved, made live or run.
    const { clientId } = await newClient()
    const campaign = await c.query<{ id: string }>(
      `insert into public.figsy_campaigns(client_id, name, status) values ($1, 'Sequence race', 'draft') returning id`,
      [clientId])
    const seq = (on: Client) => on.query(
      `insert into public.figsy_sequences(client_id, campaign_id, name, steps)
       values ($1, $2, 'Canonical', '[]'::jsonb)`, [clientId, campaign.rows[0].id])

    const other = new Client({ connectionString: realdbUrl() })
    await other.connect()
    try {
      const results = await Promise.allSettled([seq(c), seq(other)])
      expect(results.filter(r => r.status === 'fulfilled'), 'neither sequence was created').toHaveLength(1)
      const lost = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
      expect(lost, '🛑 THE CAMPAIGN NOW CARRIES TWO CANONICAL SEQUENCES — it can never be prepared again').toBeTruthy()
      expect(String(lost!.reason)).toMatch(/figsy_sequences_one_per_campaign|duplicate key/i)

      const { rows } = await c.query<{ n: string }>(
        `select count(*)::text as n from public.figsy_sequences where campaign_id = $1`, [campaign.rows[0].id])
      expect(Number(rows[0].n)).toBe(1)
    } finally { await other.end().catch(() => {}) }

    // ⚠️ AND HISTORICAL CLIENT-SCOPED WORK IS UNTOUCHED: the index is PARTIAL, so rows with a
    // NULL campaign_id — which are never candidates for programme resolution — still coexist.
    await c.query(
      `insert into public.figsy_sequences(client_id, name, steps) values ($1, 'Legacy A', '[]'::jsonb)`, [clientId])
    await c.query(
      `insert into public.figsy_sequences(client_id, name, steps) values ($1, 'Legacy B', '[]'::jsonb)`, [clientId])
    const { rows: legacy } = await c.query<{ n: string }>(
      `select count(*)::text as n from public.figsy_sequences where client_id = $1 and campaign_id is null`, [clientId])
    expect(Number(legacy[0].n)).toBe(2)
  })

  // ── 20260622_subscription_pause (the signup 500, and the shape-aware rewrite) ───────

  it('20260622_subscription_pause · a dormant signup subscription is ACCEPTED — the defect that 500\'d every signup', async () => {
    // 🛑 WHAT THIS PROVES, AND WHY THE REPLAY DID NOT. The migration applied cleanly for
    // months. It adds `'paused'` to an ENUM — and this repo's baseline `subscriptions.status`
    // is TEXT with a CHECK, so on the shape the product actually runs on, the value was never
    // permitted. Every new signup wrote `status = 'paused'` and the database refused it: an
    // HTTP 500 on the first screen of the product. The rewrite branches on the live shape.
    //
    // ⚠️ THE ROW IS THE ONE `signupSubscriptionRow()` WRITES — product `lead_gen_figsy`, tier
    // `starter`, status `paused` — so this is the exact insert that was failing, not a
    // convenient shape that happens to pass.
    const { clientId } = await newClient()
    const row = await c.query<{ id: string }>(
      `insert into public.subscriptions(client_id, product, tier, status, stripe_subscription_id, paused_at)
       values ($1, 'lead_gen_figsy', 'starter', 'paused', $2, now()) returning id`,
      [clientId, `sub_${randomUUID()}`])
    const [after] = (await c.query(
      `select status, paused_at, paused_until from public.subscriptions where id = $1`, [row.rows[0].id])).rows as Array<Record<string, unknown>>
    expect(after.status).toBe('paused')
    expect(after.paused_at, 'paused_at is what a resume reads — without it a pause cannot end').toBeTruthy()

    // The five statuses that were already allowed are still allowed — the widening preserved them.
    for (const s of ['active', 'inactive', 'trialing', 'past_due', 'cancelled']) {
      await c.query(`update public.subscriptions set status = $2 where id = $1`, [row.rows[0].id, s])
      const [r] = (await c.query(`select status from public.subscriptions where id = $1`, [row.rows[0].id])).rows as Array<Record<string, unknown>>
      expect(r.status, s).toBe(s)
    }
    // And an invented status is still refused, so the widening did not remove the fence.
    await expect(c.query(`update public.subscriptions set status = 'dormant' where id = $1`, [row.rows[0].id]))
      .rejects.toThrow(/subscriptions_status_check|violates check constraint|invalid input value/i)
  })
})
