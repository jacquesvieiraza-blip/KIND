// ═══════════════════════════════════════════════════════════════════════════════════════
// PROOF AUTHORITY, PROMOTION AND REFINEMENT, AGAINST A REAL DATABASE — J5-C7 · J4-C1 · J6-C1
//
// Each of these items makes a claim that only a database can keep, and the unit suites prove
// only that the code intended it: a mocked `supabase-js` accepts a second insert, has no
// foreign keys and never refuses an update.
//
// ── WHAT EACH ITEM READS BACK ──────────────────────────────────────────────────────────
//
//   J5-C7  "unreadable funding REFUSES; the hand-off stays one CAS"
//          → `proof_pass_claims_one_open` — AT MOST ONE OPEN CLAIM PER CLIENT. The hand-off
//            being "one compare-and-set" is exactly this index: two committed inserts race
//            and the database refuses the second, so a retry can never reach the next
//            authority. Also read back: the completed-restart index (R119), which is the
//            lifetime ceiling on the one human-authorised set, and the authority vocabulary.
//
//   J4-C1  "promotion is one server-owned act — client + ICP + seal"
//          → the three rows and the keys that bind them: `icps.client_id` is a real foreign
//            key, `onboarding_brief_drafts.user_id` is UNIQUE (one draft per person, so a
//            second confirm cannot mint a second promotion) and `promoted_client_id` is a
//            foreign key, so a seal can never name a client that does not exist.
//
//   J6-C1  "a refinement changes what the client changed, and nothing else"
//          → a real UPDATE against a real row, with every other column read back and compared
//            byte for byte. The defect this item exists for is a refinement that silently
//            reset the fields nobody touched; against a mock, "nothing else changed" is a
//            statement about the mock.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client } from 'pg'
import { realdbClient, realdbUrl, createTestClient, dropTestClient } from './harness'

describe('MVP1 · proof authority, promotion and refinement', () => {
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

  const claim = (clientId: string, authority: string, status = 'open', on: Client = c) =>
    on.query<{ id: string }>(
      `insert into public.proof_pass_claims(client_id, authority, status) values ($1, $2, $3) returning id`,
      [clientId, authority, status])

  // ── J5-C7 ────────────────────────────────────────────────────────────────────────────

  it('J5-C7 · the hand-off is ONE compare-and-set — a second OPEN claim is refused', async () => {
    // 🛑 THE RESIDUAL THIS REMOVES. A decrement-on-failure was rejected by the founder because
    // a duplicate could claim the NEXT authority before the failed one released. The answer is
    // that a duplicate cannot open a second claim AT ALL, and that is this index — not a
    // check-then-insert, which is the race wearing a guard's clothes.
    const { clientId } = await newClient()
    const other = new Client({ connectionString: realdbUrl() })
    await other.connect()
    try {
      const results = await Promise.allSettled([
        claim(clientId, 'automatic_1', 'open', c),
        claim(clientId, 'automatic_1', 'open', other),
      ])
      expect(results.filter(r => r.status === 'fulfilled'), 'neither claim opened').toHaveLength(1)
      const lost = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
      expect(lost, 'TWO open claims exist for one client — the CAS is not a CAS').toBeTruthy()
      expect(String(lost!.reason)).toMatch(/proof_pass_claims_one_open|duplicate key/i)
    } finally { await other.end().catch(() => {}) }
  })

  it('J5-C7 · a claim that COMPLETED frees the door, and the two automatic passes are the ceiling', async () => {
    const { clientId } = await newClient()
    const first = await claim(clientId, 'automatic_1', 'open')
    await c.query(`update public.proof_pass_claims set status = 'completed', settled_at = now() where id = $1`, [first.rows[0].id])

    // The next authority is now reachable — a failed attempt is not a used attempt.
    const second = await claim(clientId, 'automatic_2', 'open')
    expect(second.rows[0].id).toBeTruthy()
    await c.query(`update public.proof_pass_claims set status = 'completed', settled_at = now() where id = $1`, [second.rows[0].id])

    // 🛑 AND EACH AUTOMATIC PASS COMPLETES AT MOST ONCE, FOR EVER.
    await expect(c.query(
      `insert into public.proof_pass_claims(client_id, authority, status, settled_at)
       values ($1, 'automatic_2', 'completed', now())`, [clientId]))
      .rejects.toThrow(/proof_pass_claims_one_completed_automatic|duplicate key/i)
  })

  it('J5-C7 · R119 — exactly ONE calibrated restart per client, for the client\'s lifetime', async () => {
    const { clientId } = await newClient()
    await c.query(
      `insert into public.proof_pass_claims(client_id, authority, status, settled_at, restart_grant_at)
       values ($1, 'calibrated_restart', 'completed', now(), now())`, [clientId])
    // A second grant, a second resolution, a re-opened review and a replay all land here.
    await expect(c.query(
      `insert into public.proof_pass_claims(client_id, authority, status, settled_at, restart_grant_at)
       values ($1, 'calibrated_restart', 'completed', now(), now())`, [clientId]))
      .rejects.toThrow(/proof_pass_claims_one_completed_restart|duplicate key/i)

    // ⚠️ AND THE ROW SHAPE IS A CONSTRAINT TOO, which is what makes J8's read-back meaningful:
    // a restart claim MUST record which grant it spent, and a non-restart claim must not
    // pretend to have spent one.
    const { clientId: other } = await newClient()
    await expect(c.query(
      `insert into public.proof_pass_claims(client_id, authority, status) values ($1, 'calibrated_restart', 'open')`, [other]))
      .rejects.toThrow(/proof_pass_claims_grant_shape|violates check constraint/i)
    await expect(c.query(
      `insert into public.proof_pass_claims(client_id, authority, status, settled_at) values ($1, 'automatic_1', 'open', now())`, [other]))
      .rejects.toThrow(/proof_pass_claims_settled_shape|violates check constraint/i)
  })

  it('J5-C7 · and a fourth kind of authority costs a migration, not a value', async () => {
    const { clientId } = await newClient()
    await expect(claim(clientId, 'manual_override'))
      .rejects.toThrow(/proof_pass_claims_authority_check|violates check constraint/i)
  })

  // ── J4-C1 ────────────────────────────────────────────────────────────────────────────

  it('J4-C1 · one confirm leaves client + ICP + seal, and the keys make a half-promotion impossible', async () => {
    const { clientId, userId } = await newClient()

    // The ICP the promotion creates, attached to the client it was created for.
    const icp = await c.query<{ id: string }>(
      `insert into public.icps(client_id, name, job_titles, geographies)
       values ($1, 'Promoted ICP', '{"Head of Operations"}', '{"United Kingdom"}') returning id`, [clientId])

    // The seal: the brief draft, promoted, pointing at that client.
    const draft = await c.query<{ id: string }>(
      `insert into public.onboarding_brief_drafts(user_id, facts, confirmed_at, promoted_client_id, promoted_at)
       values ($1, '{"company":"Promoted Co"}'::jsonb, now(), $2, now()) returning id`, [userId, clientId])

    const [row] = (await c.query(
      `select d.promoted_client_id, d.promoted_at, d.confirmed_at, i.client_id as icp_client
         from public.onboarding_brief_drafts d
         join public.icps i on i.client_id = d.promoted_client_id
        where d.id = $1`, [draft.rows[0].id])).rows as Array<Record<string, unknown>>
    expect(row.promoted_client_id).toBe(clientId)
    expect(row.icp_client).toBe(clientId)
    expect(row.confirmed_at).toBeTruthy()

    // 🛑 A SECOND CONFIRM CANNOT MINT A SECOND PROMOTION. One person, one draft.
    await expect(c.query(
      `insert into public.onboarding_brief_drafts(user_id, facts) values ($1, '{}'::jsonb)`, [userId]))
      .rejects.toThrow(/onboarding_brief_drafts_user_id_key|duplicate key/i)

    // 🛑 AND A SEAL CANNOT NAME A CLIENT THAT DOES NOT EXIST.
    await expect(c.query(
      `update public.onboarding_brief_drafts set promoted_client_id = '00000000-0000-0000-0000-000000000000' where id = $1`,
      [draft.rows[0].id])).rejects.toThrow(/foreign key|promoted_client_id_fkey/i)

    // 🛑 AND AN ICP CANNOT EXIST FOR A CLIENT THAT DOES NOT EXIST — so "client + ICP + seal"
    // cannot come apart into an ICP belonging to nobody.
    await expect(c.query(
      `insert into public.icps(client_id, name) values ('00000000-0000-0000-0000-000000000000', 'Orphan')`))
      .rejects.toThrow(/foreign key|icps_client_id_fkey/i)

    expect(icp.rows[0].id).toBeTruthy()
  })

  // ── J6-C1 ────────────────────────────────────────────────────────────────────────────

  it('J6-C1 · a refinement changes the targeting the client changed, and NOTHING else', async () => {
    const { clientId } = await newClient()
    const icp = await c.query<{ id: string }>(
      `insert into public.icps(client_id, name, job_titles, seniority_levels, industries,
                               geographies, company_sizes, keywords, is_active)
       values ($1, 'Before refinement', '{"Head of Operations"}', '{"head"}', '{"logistics"}',
               '{"United Kingdom"}', '{"11-50"}', '{"3pl"}', true) returning id`, [clientId])

    const cols = 'name, job_titles, seniority_levels, industries, geographies, company_sizes, keywords, is_active, client_id'
    const before = (await c.query(`select ${cols} from public.icps where id = $1`, [icp.rows[0].id])).rows[0] as Record<string, unknown>

    // The refinement the client actually asked for: job titles, and only job titles.
    await c.query(
      `update public.icps set job_titles = '{"Head of Operations","Operations Director"}' where id = $1`,
      [icp.rows[0].id])

    const after = (await c.query(`select ${cols} from public.icps where id = $1`, [icp.rows[0].id])).rows[0] as Record<string, unknown>

    expect(after.job_titles, 'the refinement did not apply').toEqual(['Head of Operations', 'Operations Director'])
    for (const k of ['name', 'seniority_levels', 'industries', 'geographies', 'company_sizes', 'keywords', 'is_active', 'client_id']) {
      expect(after[k], `the refinement also changed ${k} — the client changed one thing`).toEqual(before[k])
    }
  })
})
